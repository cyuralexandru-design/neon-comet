// Neon Comet 3.1 - audio: chiptune SFX + procedural music sequencer (WebAudio, no files).
// API: NC.audio.unlock(), sfx(name, param), music(mode), setVolumes(music, sfx), ready.
// 3.1 (agent input): self-healing context (resume on EVERY gesture/visibility/statechange, recreate when closed or the
// clock is stalled), failure-safe sfx + music scheduling, voice limiting, gain watchdog. See NOTES/31-input.md.
// Extra (diagnostics): NC.audio.state(), NC.audio.musicOn(), NC.audio.sfxOn().
// Internal/test: NC.audio._renderOffline(mode, seconds), _renderSfxOffline(name, param), SFX_NAMES, MODES.
window.NC = window.NC || {};
(function (NC) {
  'use strict';
  const A = NC.audio = NC.audio || {};
  A.ready = false;
  A.MODES = ['menu', 'nebula', 'asteroid', 'ion', 'station', 'boss', 'off'];
  const OUT_GAIN = 0.9, DEF = { music: 0.55, sfx: 0.8 };       // defaults = save.js defaultSettings
  let vol = { music: DEF.music, sfx: DEF.sfx }, volSet = false;  // volSet: setVolumes() was called at least once
  const lastOn = { music: DEF.music, sfx: DEF.sfx };             // last non-zero volume (for boolean "on" toggles)
  // settings may hold numbers (0..1), percents, numeric strings or booleans (quick toggles) -> 0..1 or null (= keep)
  function normVol(x, k) {
    if (x === true) return lastOn[k] > 0 ? lastOn[k] : DEF[k];
    if (x === false) return 0;
    if (typeof x === 'string' && x.trim() !== '') x = +x;
    if (typeof x !== 'number' || !isFinite(x)) return null;
    if (x > 1) x = x / 100;
    return Math.max(0, Math.min(1, x));
  }
  function settingsObj() {
    try { return (NC.sys && NC.sys.state && NC.sys.state() && NC.sys.state().settings) || (NC.save && NC.save.settings) || null; } catch (e) { return null; }
  }
  function readSettingsVol() { // only used until the UI calls setVolumes (NC.save is not loaded yet when this file runs)
    const s = settingsObj(); if (!s) return;
    const m = normVol(s.music, 'music'), f = normVol(s.sfx, 'sfx');
    if (m != null) vol.music = m; if (f != null) vol.sfx = f;
  }
  readSettingsVol();

  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ------------------------------------------------------------------ engine (graph per context)
  function buildEngine(ctx) {
    const E = { ctx, vn: 0, vend: 0 };
    E.out = ctx.createGain(); E.out.gain.value = OUT_GAIN;
    // soft clipper as final safety: tanh curve, peak 0.97
    const sh = ctx.createWaveShaper(), curve = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) { const x = (i / 1023.5) - 1; curve[i] = 0.97 * Math.tanh(x * 1.15) / Math.tanh(1.15); }
    sh.curve = curve;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.12;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 8; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.2;
    comp.connect(lim); lim.connect(sh); sh.connect(E.out); E.out.connect(ctx.destination);
    E.sfxBus = ctx.createGain(); E.musBus = ctx.createGain();
    E.sfxBus.connect(comp); E.musBus.connect(comp);
    // shared buffers / waves (allocated once)
    const sr = ctx.sampleRate, n = Math.floor(sr * 1.0);
    E.noise = ctx.createBuffer(1, n, sr);
    const d = E.noise.getChannelData(0), r = rng(1234);
    for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
    // "NES short-mode" metallic noise: 93-sample periodic loop
    const m = 93 * 8; E.metal = ctx.createBuffer(1, m, sr);
    const md = E.metal.getChannelData(0); let lf = 0x7fff;
    for (let i = 0; i < m; i++) { if (i % 8 === 0) { const b = ((lf >> 0) ^ (lf >> 6)) & 1; lf = (lf >> 1) | (b << 14); } md[i] = (lf & 1) ? 0.8 : -0.8; }
    E.waves = {};
    const pulse = duty => { const N = 48, re = new Float32Array(N), im = new Float32Array(N); for (let k = 1; k < N; k++) { re[k] = (2 / (k * Math.PI)) * Math.sin(Math.PI * k * duty) * Math.cos(Math.PI * k * duty); im[k] = (2 / (k * Math.PI)) * Math.sin(Math.PI * k * duty) * Math.sin(Math.PI * k * duty); } return ctx.createPeriodicWave(re, im); };
    E.waves.p12 = pulse(0.125); E.waves.p25 = pulse(0.25); E.waves.p50 = pulse(0.5);
    return E;
  }

  // voice helpers. w: p12|p25|p50|tri|sine|saw
  function osc(E, w, f) {
    const o = E.ctx.createOscillator();
    if (E.waves[w]) o.setPeriodicWave(E.waves[w]); else o.type = w === 'tri' ? 'triangle' : w === 'saw' ? 'sawtooth' : 'sine';
    o.frequency.value = f; return o;
  }
  // tone: f start, d duration, opts {f2 end freq, at offset, a attack, v vol, w wave, vib, dest, exp}
  function T(E, t, f, d, w, v, o) {
    o = o || {};
    const c = E.ctx, s = t + (o.at || 0), x = osc(E, w, f), g = c.createGain(), a = o.a || 0.004;
    if (o.f2) { x.frequency.setValueAtTime(f, s); x.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), s + d); }
    g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v, s + a);
    if (o.sus) { g.gain.setValueAtTime(v, s + d - Math.min(0.05, d * 0.3)); g.gain.linearRampToValueAtTime(0, s + d); }
    else g.gain.exponentialRampToValueAtTime(0.0008, s + d);
    let vib = null;
    if (o.vib) { vib = c.createOscillator(); const vg = c.createGain(); vib.frequency.value = o.vibR || 6; vg.gain.value = f * o.vib; vib.connect(vg).connect(x.frequency); vib.start(s + (o.vibD || 0)); vib.stop(s + d + 0.02); }
    x.connect(g).connect(o.dest || E.sfxBus); x.start(s); x.stop(s + d + 0.02);
    E.vn += vib ? 2 : 1; if (s + d > E.vend) E.vend = s + d;
  }
  // noise: d duration, v vol, opts {f filter freq, f2 end, type, q, at, metal}
  function Nz(E, t, d, v, o) {
    o = o || {};
    const c = E.ctx, s = t + (o.at || 0), src = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    src.buffer = o.metal ? E.metal : E.noise; if (o.metal) src.loop = true;
    if (o.rate) src.playbackRate.value = o.rate;
    fl.type = o.type || 'lowpass'; fl.frequency.setValueAtTime(o.f || 2000, s); fl.Q.value = o.q || 0.8;
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, s + d);
    g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v, s + (o.a || 0.003)); g.gain.exponentialRampToValueAtTime(0.0008, s + d);
    src.connect(fl).connect(g).connect(o.dest || E.sfxBus);
    const off = o.metal ? 0 : (Math.random() * 0.5);
    src.start(s, off); src.stop(s + d + 0.02);
    E.vn++; if (s + d > E.vend) E.vend = s + d;
  }
  function arp(E, t, notes, step, d, w, v, o) { notes.forEach((n, i) => T(E, t, midi(n), d, w, v, Object.assign({}, o, { at: (o && o.at || 0) + i * step }))); }

  // ------------------------------------------------------------------ SFX
  const pr = () => 0.97 + Math.random() * 0.06;
  let starCombo = 0, starT = 0;
  const SFX = {
    shoot_laser: (E, t) => T(E, t, 1320 * pr(), 0.120, 'p25', 0.110, { f2: 520 }),
    shoot_plasma: (E, t) => { T(E, t, 520 * pr(), 0.11, 'p50', 0.110, { f2: 260 }); T(E, t, 780, 0.120, 'tri', 0.110, { f2: 390 }); },
    shoot_missile: (E, t) => { Nz(E, t, 0.22, 0.120, { f: 900, f2: 3000, type: 'bandpass', q: 1.5 }); T(E, t, 180, 0.18, 'p12', 0.077, { f2: 420 }); },
    shoot_rail: (E, t) => { T(E, t, 2200, 0.16, 'p12', 0.045, { f2: 140 }); Nz(E, t, 0.12, 0.06, { f: 6000, type: 'highpass' }); T(E, t, 110, 0.18, 'tri', 0.1, { f2: 55 }); },
    shoot_flame: (E, t) => Nz(E, t, 0.14, 0.120, { f: 700 + Math.random() * 300, f2: 300, type: 'bandpass', q: 0.7 }),
    hit: (E, t, p) => T(E, t, (300 + Math.random() * 60) * (p || 1), 0.110, 'p50', 0.088, { f2: 150 }),
    crit: (E, t) => { T(E, t, 1760, 0.120, 'p25', 0.110, { f2: 880 }); T(E, t, 2637, 0.120, 'p12', 0.066, { at: 0.03 }); },
    explode_s: (E, t) => { Nz(E, t, 0.22, 0.13, { f: 2400, f2: 300 }); T(E, t, 160, 0.14, 'tri', 0.12, { f2: 50 }); },
    explode_m: (E, t) => { Nz(E, t, 0.42, 0.17, { f: 1800, f2: 160 }); T(E, t, 120, 0.3, 'tri', 0.18, { f2: 38 }); Nz(E, t, 0.1, 0.05, { metal: 1, f: 3000, at: 0.02 }); },
    explode_l: (E, t) => { Nz(E, t, 0.9, 0.2, { f: 1600, f2: 90 }); T(E, t, 90, 0.7, 'tri', 0.22, { f2: 30 }); Nz(E, t, 0.6, 0.1, { f: 600, f2: 80, at: 0.12 }); T(E, t, 60, 0.6, 'sine', 0.16, { f2: 28, at: 0.05 }); },
    pickup_star: (E, t) => { const now = E.ctx.currentTime; starCombo = now - starT < 0.45 ? Math.min(starCombo + 1, 12) : 0; starT = now; const n = 76 + [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28][starCombo]; T(E, t, midi(n), 0.120, 'p50', 0.035); T(E, t, midi(n + 7), 0.120, 'p25', 0.044, { at: 0.03 }); },
    pickup_crystal: (E, t) => { arp(E, t, [88, 95, 100], 0.035, 0.12, 'tri', 0.07); T(E, t, midi(100), 0.25, 'p12', 0.015, { at: 0.07, vib: 0.01 }); },
    dash: (E, t) => { Nz(E, t, 0.22, 0.120, { f: 800, f2: 5000, type: 'bandpass', q: 1.2 }); T(E, t, 300, 0.16, 'p12', 0.066, { f2: 1200 }); },
    hurt: (E, t) => { T(E, t, 330, 0.25, 'p50', 0.07, { f2: 90 }); Nz(E, t, 0.2, 0.1, { f: 1400, f2: 300 }); T(E, t, 311, 0.25, 'p25', 0.04, { f2: 85, at: 0.02 }); },
    shield_hit: (E, t) => { T(E, t, 1200, 0.14, 'tri', 0.120, { f2: 600, vib: 0.05, vibR: 30 }); Nz(E, t, 0.120, 0.03, { metal: 1, f: 5000, type: 'highpass' }); },
    levelup: (E, t) => { arp(E, t, [72, 76, 79, 84, 88], 0.06, 0.16, 'p25', 0.06); T(E, t, midi(91), 0.45, 'p50', 0.045, { at: 0.3, vib: 0.012, sus: 1 }); arp(E, t, [48, 55, 60], 0.1, 0.3, 'tri', 0.12); },
    card: (E, t) => { T(E, t, 660, 0.120, 'p25', 0.099, { f2: 990 }); Nz(E, t, 0.120, 0.03, { f: 4000, type: 'highpass' }); },
    reroll: (E, t) => { for (let i = 0; i < 6; i++) T(E, t, midi(72 + (i % 2 ? 7 : 0) + i), 0.05, 'p12', 0.04, { at: i * 0.04 }); },
    warn: (E, t) => { for (let i = 0; i < 3; i++) { T(E, t, 880, 0.14, 'p50', 0.05, { at: i * 0.32, sus: 1 }); T(E, t, 660, 0.14, 'p50', 0.05, { at: i * 0.32 + 0.15, sus: 1 }); } },
    boss_intro: (E, t) => { T(E, t, 55, 1.6, 'tri', 0.2, { f2: 41, a: 0.05 }); T(E, t, 110, 1.4, 'p12', 0.05, { f2: 82, a: 0.2, vib: 0.02 }); Nz(E, t, 1.4, 0.08, { f: 200, f2: 1200, a: 0.6 }); arp(E, t, [45, 46, 45, 46], 0.35, 0.3, 'p50', 0.04, { at: 0.2 }); },
    boss_phase: (E, t) => { Nz(E, t, 0.5, 0.14, { f: 3000, f2: 200 }); arp(E, t, [62, 61, 60, 59, 58], 0.05, 0.12, 'p25', 0.05); T(E, t, 73, 0.6, 'tri', 0.18, { f2: 36 }); },
    beam_charge: (E, t, p) => { const d = Math.max(0.3, Math.min(2, p || 0.9)); T(E, t, 160, d, 'p12', 0.035, { f2: 1400, a: 0.1, vib: 0.03, vibR: 14 }); Nz(E, t, d, 0.03, { f: 300, f2: 4000, type: 'bandpass', q: 3, a: d * 0.5 }); },
    beam_fire: (E, t) => { Nz(E, t, 0.8, 0.12, { f: 2400, f2: 600, type: 'bandpass', q: 0.9 }); T(E, t, 98, 0.8, 'p25', 0.06, { vib: 0.04, vibR: 22 }); T(E, t, 49, 0.8, 'tri', 0.14); },
    mine: (E, t) => { T(E, t, 1046, 0.05, 'p50', 0.04); T(E, t, 1046, 0.05, 'p50', 0.04, { at: 0.09 }); },
    shield_up: (E, t) => { T(E, t, 300, 0.35, 'tri', 0.08, { f2: 1200, vib: 0.03, vibR: 18 }); arp(E, t, [79, 83, 86], 0.07, 0.15, 'p25', 0.03, { at: 0.12 }); },
    magnet: (E, t) => { T(E, t, 200, 0.4, 'p12', 0.04, { f2: 800, vib: 0.08, vibR: 9 }); T(E, t, 400, 0.4, 'tri', 0.05, { f2: 1600 }); },
    repair: (E, t) => { arp(E, t, [67, 71, 74, 79, 83], 0.07, 0.18, 'tri', 0.08); arp(E, t, [79, 83, 86], 0.1, 0.12, 'p12', 0.02, { at: 0.05 }); },
    chest_open: (E, t) => { Nz(E, t, 0.15, 0.06, { f: 500 }); arp(E, t, [67, 71, 74, 79, 83, 86], 0.06, 0.2, 'p25', 0.05, { at: 0.1 }); Nz(E, t, 0.6, 0.03, { f: 6000, type: 'highpass', at: 0.4 }); },
    legendary: (E, t) => { arp(E, t, [72, 76, 79, 84, 88, 91, 96], 0.07, 0.3, 'p25', 0.05); arp(E, t, [48, 55, 60, 64], 0.14, 0.5, 'tri', 0.12); T(E, t, midi(96), 0.9, 'p50', 0.035, { at: 0.5, vib: 0.015, sus: 1 }); Nz(E, t, 1.0, 0.03, { f: 7000, type: 'highpass', at: 0.4 }); },
    buy: (E, t) => { T(E, t, midi(83), 0.08, 'p50', 0.05); T(E, t, midi(88), 0.22, 'p50', 0.05, { at: 0.07 }); },
    upgrade: (E, t) => { arp(E, t, [67, 72, 76, 79], 0.05, 0.12, 'p25', 0.05); T(E, t, midi(84), 0.3, 'tri', 0.08, { at: 0.2 }); },
    merge: (E, t) => { T(E, t, 300, 0.25, 'p25', 0.05, { f2: 900 }); T(E, t, 450, 0.25, 'p25', 0.04, { f2: 1350, at: 0.02 }); arp(E, t, [84, 91], 0.06, 0.22, 'tri', 0.07, { at: 0.24 }); },
    error: (E, t) => { T(E, t, 196, 0.1, 'p50', 0.05, { sus: 1 }); T(E, t, 147, 0.16, 'p50', 0.05, { at: 0.11, sus: 1 }); },
    click: (E, t) => T(E, t, 1400, 0.066, 'p50', 0.03),
    revive: (E, t) => { arp(E, t, [60, 64, 67, 72, 76, 79, 84], 0.06, 0.25, 'tri', 0.09); arp(E, t, [72, 76, 79], 0.12, 0.3, 'p25', 0.035, { at: 0.3 }); },
    gameover: (E, t) => { arp(E, t, [67, 66, 65, 64], 0.22, 0.3, 'p50', 0.05); T(E, t, midi(48), 1.3, 'tri', 0.14, { at: 0.88, vib: 0.01 }); T(E, t, midi(60), 1.2, 'p25', 0.035, { at: 0.88, sus: 1 }); },
    mission_done: (E, t) => { arp(E, t, [72, 72, 72, 79], 0.1, 0.12, 'p50', 0.05); T(E, t, midi(84), 0.5, 'p50', 0.05, { at: 0.42, vib: 0.012, sus: 1 }); arp(E, t, [48, 55, 60], 0.14, 0.3, 'tri', 0.12, { at: 0.42 }); }
  };
  A.SFX_NAMES = Object.keys(SFX);
  const GAP = { shoot_laser: 65, shoot_plasma: 80, shoot_missile: 110, shoot_rail: 140, shoot_flame: 95, hit: 45, crit: 70, explode_s: 55, explode_m: 80, explode_l: 160,
    pickup_star: 35, pickup_crystal: 60, shield_hit: 90, click: 30, mine: 100, card: 40, magnet: 200, hurt: 150, beam_charge: 200, beam_fire: 200, warn: 600, boss_intro: 1000 };
  const last = {}; let budgetT = 0, budget = 0;

  // ------------------------------------------------------------------ music
  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], harm: [0, 2, 3, 5, 7, 8, 11] };
  // drums: k=kick s=snare h=hat o=open hat; strings of 16 steps
  const SONGS = {
    menu: { key: 62, scale: 'major', bpm: 84, seed: 11, A: [0, 5, 3, 4, 0, 5, 1, 4], B: [3, 4, 2, 5, 3, 4, 1, 4],
      drums: { k: 'x.......x.......', s: '................', h: '....x.......x...' }, drumsB: { k: 'x.......x.......', s: '............x...', h: '..x...x...x...x.' },
      bass: '1.......5.......', arp: 'slow', lead: 'p50', leadV: 0.05, density: 0.45, swing: 0 },
    nebula: { key: 64, scale: 'dorian', bpm: 104, seed: 23, A: [0, 6, 5, 6, 0, 6, 3, 4], B: [5, 6, 0, 0, 3, 4, 5, 4],
      drums: { k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' }, drumsB: { k: 'x.....x.x.x.....', s: '....x.......x..x', h: 'xxx.xxx.xxx.xxx.' },
      bass: '1..1..8.1..5..8.', arp: 'up', lead: 'p25', leadV: 0.05, density: 0.6, swing: 0 },
    asteroid: { key: 57, scale: 'minor', bpm: 124, seed: 37, A: [0, 5, 2, 6, 0, 5, 3, 4], B: [3, 0, 6, 5, 3, 4, 4, 4],
      drums: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.xo' }, drumsB: { k: 'x...x...x.x.x...', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' },
      bass: '1.18.1181.18.158', arp: 'updown', lead: 'p25', leadV: 0.05, density: 0.7, swing: 0 },
    ion: { key: 54, scale: 'phrygian', bpm: 116, seed: 41, A: [0, 1, 0, 6, 0, 1, 5, 4], B: [5, 4, 3, 1, 5, 6, 1, 0],
      drums: { k: 'x..x..x...x.....', s: '....x.......x...', h: '..x...x...x...x.' }, drumsB: { k: 'x..x..x...x..x..', s: '....x..x....x...', h: 'x.xxx.xxx.xxx.xx' },
      bass: '1..1..1.5..5..8.', arp: 'down', lead: 'p12', leadV: 0.05, density: 0.55, swing: 0 },
    station: { key: 60, scale: 'lydian', bpm: 112, seed: 53, A: [0, 1, 0, 1, 5, 4, 3, 4], B: [3, 2, 5, 1, 3, 2, 4, 4],
      drums: { k: 'x.....x...x...x.', s: '....x.......x...', h: 'x.xox.xox.xox.xo' }, drumsB: { k: 'x.....x.x.x...x.', s: '....x..x....x.x.', h: 'xxoxxxoxxxoxxxox' },
      bass: '1.8.1.85.1.8.58.', arp: 'stab', lead: 'p50', leadV: 0.045, density: 0.65, swing: 0.12 },
    boss: { key: 50, scale: 'harm', bpm: 152, seed: 67, A: [0, 0, 5, 4, 0, 0, 5, 4], B: [3, 4, 5, 4, 3, 1, 4, 4],
      drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' }, drumsB: { k: 'x.x.x...x.x.x.x.', s: '....x.......x.xx', h: 'xxxxxxxxxxxxxxxx' },
      bass: '1818181815158181', arp: 'up', lead: 'p25', leadV: 0.055, density: 0.8, swing: 0 }
  };
  // melody generation: 2-bar motifs as [step, len, relDegree]; strong steps use chord tones
  function makeMotif(r, density, cadence) {
    const ev = []; let s = 0, deg = [0, 2, 4][Math.floor(r() * 3)];
    const lens = density > 0.65 ? [2, 2, 2, 4, 1, 3] : density > 0.5 ? [2, 4, 2, 4, 6, 3] : [4, 4, 6, 8, 2];
    while (s < 32) {
      if (cadence && s >= 16) { ev.push([16, 14, 0]); break; }
      let len = lens[Math.floor(r() * lens.length)]; if (s + len > 32) len = 32 - s;
      const strong = s % 8 === 0;
      if (strong) { const ct = [0, 2, 4, 7, -3]; let best = ct[0], bd = 99; for (const c of ct) { const dd = Math.abs(c - deg) + r() * 2; if (dd < bd) { bd = dd; best = c; } } deg = best; }
      else { deg += [-2, -1, -1, 1, 1, 2, 0][Math.floor(r() * 7)]; deg = Math.max(-3, Math.min(9, deg)); }
      if (r() < 0.12 && !strong && ev.length) { s += len; continue; } // rest
      ev.push([s, len, deg]); s += len;
    }
    if (!cadence && ev.length) { const l = ev[ev.length - 1]; if (l[0] + l[1] >= 30) l[2] = [0, 2, 4][Math.floor(r() * 3)]; }
    return ev;
  }
  function prepSong(sg) {
    if (sg._m) return sg;
    const r = rng(sg.seed);
    sg._m = { a1: makeMotif(r, sg.density), a2: makeMotif(r, sg.density), cad: makeMotif(r, sg.density, true), b1: makeMotif(r, sg.density + 0.1), b2: makeMotif(r, sg.density), half: makeMotif(r, sg.density, true) };
    sg._sc = SCALES[sg.scale];
    return sg;
  }
  // scale degree -> midi
  function dm(sg, deg) { const sc = sg._sc, o = Math.floor(deg / 7), i = ((deg % 7) + 7) % 7; return sg.key + o * 12 + sc[i]; }

  // form: 64 bars = 2 passes x [A, A', B, A''] (8 bars each)
  function barInfo(sg, bar) {
    const b = bar % 64, pass = b >> 5, sec = (b % 32) >> 3, ib = b % 8;
    const prog = sec === 2 ? sg.B : sg.A;
    let chord = prog[ib];
    if (sec === 3 && ib === 7) chord = 0; // resolve home at end of A''
    if (pass === 1 && sec === 1 && ib === 6) chord = (prog[ib] + 2) % 7; // reharm variation
    let motif, half = ib & 1; // which half of 2-bar motif
    const pair = ib >> 1;
    if (sec === 2) motif = pair === 3 ? sg._m.half : (pair % 2 ? sg._m.b2 : sg._m.b1);
    else if (pair === 3) motif = sec === 0 ? sg._m.a2 : sg._m.cad;
    else motif = pair === 1 ? sg._m.a2 : sg._m.a1;
    return { pass, sec, ib, chord, motif, half };
  }

  function makeTrack(E, mode, startT, dest) {
    const sg = prepSong(SONGS[mode]);
    const g = E.ctx.createGain(); g.gain.value = 0; g.connect(dest || E.musBus);
    return { sg, g, mode, step: 0, next: startT, alive: true, sp: 60 / sg.bpm / 4 };
  }
  // a throwing step must never freeze the track (3.0: the exception skipped step++ -> same step threw forever = no music)
  function scheduleTrack(E, tr, until, maxSteps) {
    let n = maxSteps || Infinity;
    while (tr.next < until && n-- > 0) {
      try { playStep(E, tr, tr.step, tr.next); } catch (e) { noteErr(e); }
      tr.step++; tr.next += tr.sp;
    }
  }
  function drum(E, t, ch, v, dest, sp) {
    if (ch === 'k') { T(E, t, 150, 0.16, 'tri', 0.32 * v, { f2: 42, dest, a: 0.002 }); Nz(E, t, 0.02, 0.05 * v, { f: 1200, dest }); }
    else if (ch === 's') { Nz(E, t, 0.16, 0.13 * v, { f: 2200, type: 'bandpass', q: 0.7, dest }); T(E, t, 240, 0.07, 'tri', 0.1 * v, { f2: 160, dest }); }
    else if (ch === 'h') Nz(E, t, 0.035, 0.035 * v, { f: 7500, type: 'highpass', dest });
    else if (ch === 'o') Nz(E, t, Math.min(0.2, sp * 2), 0.03 * v, { f: 6500, type: 'highpass', dest, metal: 1 });
  }
  function playStep(E, tr, s, t) {
    const sg = tr.sg, sp = tr.sp, bar = Math.floor(s / 16), i = s % 16, dest = tr.g;
    const bi = barInfo(sg, bar), late = (sg.swing && (i & 1)) ? sp * sg.swing : 0, tt = t + late;
    const root = bi.chord, tri = [dm(sg, root), dm(sg, root + 2), dm(sg, root + 4)];
    const intro = bar % 64 < 2 && bar < 64; // first two bars: no drums on the very first loop
    // drums
    const dp = (bi.sec === 2 || bi.pass === 1) ? sg.drumsB : sg.drums;
    if (!intro || sg === SONGS.boss) {
      const fill = bi.ib === 7 && i >= 12 && sg !== SONGS.menu;
      for (const k of ['k', 's', 'h']) { const c = dp[k][i]; if (c === 'x' || c === 'o') drum(E, tt, c === 'o' ? 'o' : k, 1, dest, sp); }
      if (fill) drum(E, tt, 's', 0.6 + (i - 12) * 0.12, dest, sp);
    }
    // bass (triangle)
    const bc = sg.bass[i];
    if (bc !== '.') {
      let len = 1; while (i + len < 16 && sg.bass[i + len] === '.') len++;
      const off = bc === '5' ? 7 : bc === '8' ? 12 : 0;
      let note = tri[0] - 24 + off; while (note < 33) note += 12; while (note > 52) note -= 12;
      T(E, tt, midi(note), Math.max(sp * 0.9, sp * len * 0.92), 'tri', 0.19, { dest, sus: 1, a: 0.005 });
    }
    // harmony (pulse 12/25)
    const harmV = 0.024;
    if (sg.arp === 'slow') { if (i % 4 === 0) T(E, tt, midi(tri[(i >> 2) % 3] + 12), sp * 3.5, 'p25', harmV, { dest }); }
    else if (sg.arp === 'stab') { if (i === 2 || i === 6 || i === 10 || i === 14) for (const n of tri) T(E, tt, midi(n + 12), sp * 0.9, 'p12', harmV * 0.75, { dest, sus: 1 }); }
    else {
      const seq = sg.arp === 'down' ? [2, 1, 0, 1] : sg.arp === 'updown' ? [0, 1, 2, 1] : [0, 1, 2, 3];
      if (sg === SONGS.boss || (i & 1) === 0 || bi.sec === 2) {
        const k = seq[(i >> (sg === SONGS.boss ? 0 : 1)) % 4]; const n = k === 3 ? tri[0] + 12 : tri[k];
        T(E, tt, midi(n + 12), sp * 0.85, bi.pass ? 'p25' : 'p12', harmV, { dest });
      }
    }
    // lead melody
    if (!intro || bar >= 64) {
      const st = bi.half * 16 + i;
      for (const ev of bi.motif) {
        if (ev[0] !== st) continue;
        let deg = root + ev[2]; if (bi.motif === sg._m.cad || bi.motif === sg._m.half) deg = ev[2] + (bi.ib === 7 ? 0 : root);
        let note = dm(sg, deg) + 12;
        if (bi.pass === 1 && bi.sec === 2) note += 12;
        while (note > 88) note -= 12; while (note < 62) note += 12;
        const len = Math.min(ev[1], 32 - st) * sp, w = (bi.pass === 1 && bi.sec !== 0) ? (sg.lead === 'p50' ? 'p25' : 'p50') : sg.lead;
        T(E, tt, midi(note), len * 0.95, w, sg.leadV, { dest, sus: 1, a: 0.008, vib: len > sp * 3 ? 0.012 : 0, vibD: len * 0.4, vibR: 5.5 });
        if (bi.pass === 1) T(E, tt + sp * 3, midi(note), Math.min(len, sp * 3), 'p12', sg.leadV * 0.3, { dest, sus: 1 }); // echo
      }
    }
  }

  // ------------------------------------------------------------------ live runtime (3.1: self-healing)
  // Root causes of "sometimes absolutely no sound" in 3.0 (details in NOTES/31-input.md):
  //  1. gesture unlock listeners were removed after the first success (app.js {once:true} + gest() self-removal), so a
  //     context that later became 'suspended'/'interrupted' (app switch, screen lock, call, Siri, BT route change,
  //     iOS/Android audio focus loss) could never be resumed again -> silent until reload.
  //  2. unlock() only handled 'suspended': iOS 'interrupted' and 'closed' contexts were never resumed/recreated.
  //  3. visibilitychange resume() outside a gesture is rejected on iOS, and nothing retried it.
  //  4. an exception inside a music step froze the track forever (step++ skipped); no try/catch in the scheduler.
  //  5. volumes: setVolumes ignored non-numbers (booleans/strings from toggles), and the load-time read of NC.save happened
  //     before the save was loaded.
  //  6. no voice limit: explosion/shot storms could pile up hundreds of nodes -> audio thread overload / dropouts.
  let E = null, tracks = [], curMode = 'off', timer = null, wd = null, unlocked = false;
  const LOOK = 0.16, FADE = 1.2, MAX_STEPS = 48;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const hidden = () => typeof document !== 'undefined' && !!document.hidden;
  const D = { created: 0, recreated: 0, resumes: 0, resumeOk: 0, errors: 0, lastErr: '', stalls: 0, dropped: 0, healed: 0, lastTick: 0 };
  function noteErr(e) { D.errors++; D.lastErr = String((e && e.message) || e).slice(0, 120); }
  function musicLevel() { return 0.3 * vol.music; }
  let volT = 0;
  function setParam(p, v, tc) { // safe AudioParam set: direct when not running (automation can stall on a suspended ctx)
    const c = E.ctx, t = c.currentTime;
    try {
      p.cancelScheduledValues(t);
      if (c.state === 'running' && tc) { p.setValueAtTime(p.value, t); p.setTargetAtTime(v, t, tc); }
      else { p.value = v; p.setValueAtTime(v, t); }
    } catch (e) { try { p.value = v; } catch (e2) { noteErr(e2); } }
  }
  function applyVol(hard) {
    if (!E) return; volT = now();
    try {
      setParam(E.sfxBus.gain, vol.sfx * 0.9, hard ? 0 : 0.03);
      setParam(E.musBus.gain, musicLevel(), hard ? 0 : 0.05);
      if (hard) setParam(E.out.gain, OUT_GAIN, 0);
    } catch (e) { noteErr(e); }
  }
  // iOS/iPadOS 17+: 'playback' plays through the silent switch (the game is the main audio while music is on);
  // with music off use 'ambient' so the player's own music app can keep playing.
  function setSession() {
    try {
      const s = navigator.audioSession; if (!s) return;
      const want = vol.music > 0 ? 'playback' : 'ambient';
      if (s.type !== want) s.type = want;
    } catch (e) { /* ignore */ }
  }
  function catchUp() { // after a stall/suspend: skip missed steps instead of bursting them
    if (!E) return;
    const n = E.ctx.currentTime + 0.05;
    for (const tr of tracks) if (tr.next < n) { const k = Math.ceil((n - tr.next) / tr.sp); tr.step += k; tr.next += k * tr.sp; }
  }
  function tick() {
    D.lastTick = now();
    if (!E || E.ctx.state !== 'running') return;
    try {
      const t = E.ctx.currentTime;
      for (let k = tracks.length - 1; k >= 0; k--) {
        const tr = tracks[k];
        if (!tr.alive) { if (t > tr.dieAt) { try { tr.g.disconnect(); } catch (e) { /* ignore */ } tracks.splice(k, 1); } continue; }
        if (tr.next < t - 0.05) { const skip = Math.ceil((t - tr.next) / tr.sp); tr.step += skip; tr.next += skip * tr.sp; }
        if (vol.music > 0) scheduleTrack(E, tr, t + LOOK, MAX_STEPS);
        else tr.next = t + 0.05;
      }
    } catch (e) { noteErr(e); }
  }
  function startTimer() { if (!timer) timer = setInterval(tick, 30); if (!wd) wd = setInterval(watchdog, 2000); }
  function setMode(mode) {
    if (!A.MODES.includes(mode)) mode = 'off';
    curMode = mode;
    if (!E) return;
    try {
      const t = E.ctx.currentTime;
      for (const tr of tracks) if (tr.alive) {
        tr.alive = false; tr.dieAt = t + FADE + LOOK + 0.3;
        try { tr.g.gain.cancelScheduledValues(t); tr.g.gain.setValueAtTime(tr.g.gain.value, t); tr.g.gain.linearRampToValueAtTime(0, t + FADE); } catch (e) { tr.g.gain.value = 0; }
      }
      if (mode === 'off') return;
      const tr = makeTrack(E, mode, t + 0.08), fade = tracks.length ? FADE : 0.3;
      tr.g.gain.setValueAtTime(0, t); tr.g.gain.linearRampToValueAtTime(1, t + fade);
      tr.full = t + fade; // watchdog: after this the gain must be 1
      tracks.push(tr);
    } catch (e) { noteErr(e); }
  }

  // ---- context lifecycle
  function onState() {
    if (!E) return;
    const s = E.ctx.state;
    if (s === 'running') { unlocked = true; catchUp(); applyVol(true); return; }
    if (s === 'closed') { if (!hidden()) recreate('closed'); return; }
    // suspended/interrupted by the system while visible (call, Siri, audio focus, BT): retry soon; gestures retry too
    if (!hidden()) setTimeout(() => resume(false), 350);
  }
  function create() {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return false;
    if (!volSet) readSettingsVol();
    setSession();
    let ctx;
    try { ctx = new C({ latencyHint: 'interactive' }); } catch (e) { ctx = new C(); }
    try { E = buildEngine(ctx); } catch (e) { E = null; try { ctx.close(); } catch (e2) { /* ignore */ } throw e; }
    try { if (ctx.addEventListener) ctx.addEventListener('statechange', onState); else ctx.onstatechange = onState; } catch (e) { /* ignore */ }
    D.created++; E.born = now(); E.lastCT = -1; E.lastWall = now(); E.stall = 0; E.notRun = 0;
    A.ready = true; A.ctx = ctx;
    tracks = []; active.length = 0;
    applyVol(true); startTimer();
    if (curMode !== 'off') { const m = curMode; curMode = 'off'; setMode(m); }
    if (hidden()) { try { const p = ctx.suspend(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
    return true;
  }
  function recreate(why) {
    const old = E; E = null; tracks = [];
    if (old) { try { old.ctx.removeEventListener && old.ctx.removeEventListener('statechange', onState); old.ctx.onstatechange = null; const p = old.ctx.close(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
    D.recreated++; D.lastErr = D.lastErr || ('recreate:' + why);
    try { create(); } catch (e) { noteErr(e); E = null; A.ready = false; return; }
    resume(false);
  }
  function resume(gesture) {
    if (!E) return;
    const c = E.ctx, s = c.state;
    if (s === 'closed') { recreate('closed'); return; }
    if (s === 'running' || hidden()) return;
    D.resumes++;
    try {
      const p = c.resume();
      if (p && p.then) p.then(() => { if (E && E.ctx === c && c.state === 'running') { D.resumeOk++; unlocked = true; } }, () => {});
    } catch (e) { /* ignore */ }
    if (gesture) iosKick(c);
  }
  // old iOS needs a source started INSIDE the gesture to really unlock the context
  function iosKick(c) {
    try { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); s.onended = () => { try { s.disconnect(); } catch (e) { /* ignore */ } }; } catch (e) { /* ignore */ }
  }
  let failG = 0, lastG = 0, failT0 = 0;
  // NC.audio.unlock(src?) - safe to call on every gesture (and from anywhere); creates, resumes or recreates as needed.
  A.unlock = function (src) {
    try {
      const gesture = src !== 'pad' && src !== 'auto';
      if (!E) { if (!create()) return false; }
      const s = E.ctx.state;
      if (s === 'running') { unlocked = true; failG = 0; lastG = 0; return true; }
      if (s === 'closed') { recreate('closed'); return false; }
      if (gesture) {
        const t = now();
        // previous gesture's resume() did not get us running -> after 3 tries build a fresh context INSIDE this gesture
        // (Android can need ~1 s to open the output, so also require 1.5 s since the first failed try)
        if (t - lastG > 250) { if (lastG) { if (!failG) failT0 = t; failG++; } lastG = t; }
        if (failG >= 3 && t - failT0 > 1500 && !hidden()) { failG = 0; lastG = 0; recreate('stuck-' + s); return false; }
      }
      resume(gesture);
    } catch (e) { noteErr(e); }
    return !!(E && E.ctx.state === 'running');
  };

  // ---- watchdog (every 2 s): only acts while the page is visible
  let hintT = 0;
  function watchdog() {
    if (hidden()) { if (E) { E.lastCT = -1; E.notRun = 0; } return; }
    try {
      if (!E) { if (unlocked) { try { create(); } catch (e) { noteErr(e); } } return; }
      const c = E.ctx, s = c.state, t = now();
      if (s === 'closed') { recreate('closed'); return; }
      if (s !== 'running') {
        E.notRun += 2; resume(false);
        // pad-only players can't unlock by gesture (gamepad input is not a user activation) -> tell them once in a while
        const wantSound = vol.music > 0 || vol.sfx > 0;
        if (wantSound && E.notRun >= 4 && t - hintT > 60000 && NC.Input && NC.Input.device === 'pad') {
          hintT = t; try { NC.ui && NC.ui.toast && NC.ui.toast(NC.t ? NC.t('in.audioTap') : 'Tap the screen or press a key to enable sound', 'warm', 4500); } catch (e) { /* ignore */ }
        }
        return;
      }
      E.notRun = 0;
      // clock stalled while 'running' (Android/Firefox after BT or device route changes, iOS after interruptions)
      const ct = c.currentTime;
      if (E.lastCT >= 0 && t - E.lastWall > 1500 && ct - E.lastCT < 0.05) { E.stall++; D.stalls++; } else E.stall = 0;
      E.lastCT = ct; E.lastWall = t;
      if (E.stall >= 2) { recreate('stall'); return; }
      // gains that should be up but are not (stuck automation, external toggles)
      const fix = (p, want) => { if (Math.abs(p.value - want) > 0.05) { setParam(p, want, 0); D.healed++; } };
      fix(E.out.gain, OUT_GAIN);
      if (t - volT > 1000) { fix(E.sfxBus.gain, vol.sfx * 0.9); fix(E.musBus.gain, musicLevel()); }
      for (const tr of tracks) if (tr.alive && tr.full && ct > tr.full + 0.5 && tr.g.gain.value < 0.95) { setParam(tr.g.gain, 1, 0); D.healed++; }
      // music must be playing when a mode is set (after recreate / interruption)
      if (curMode !== 'off' && !tracks.some(x => x.alive)) { const m = curMode; curMode = 'off'; setMode(m); }
      if (t - D.lastTick > 1000) { clearInterval(timer); timer = null; startTimer(); }
      pruneVoices(ct);
    } catch (e) { noteErr(e); }
  }

  // ---- own listeners (never removed). Activation events: keydown, mousedown, pointerdown/up, touchend, click.
  const gest = () => { A.unlock('gesture'); };
  if (typeof window !== 'undefined' && window.addEventListener) {
    ['pointerdown', 'pointerup', 'mousedown', 'touchend', 'keydown', 'click'].forEach(ev => window.addEventListener(ev, gest, { capture: true, passive: true }));
    window.addEventListener('focus', () => { if (E) resume(false); });
    window.addEventListener('pageshow', () => { if (E) { resume(false); catchUp(); } });
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', () => {
      if (!E) return;
      if (document.hidden) { try { const p = E.ctx.suspend(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
      else { resume(false); catchUp(); }
    });
    document.addEventListener('resume', () => { if (E) resume(false); }); // Page Lifecycle (Chrome Android freeze/resume)
  }
  try {
    const md = navigator.mediaDevices;
    if (md && md.addEventListener) md.addEventListener('devicechange', () => { if (!E) return; resume(false); setTimeout(() => { if (E) { E.lastCT = -1; watchdog(); } }, 1500); });
  } catch (e) { /* ignore */ }

  // ---- public API (unchanged) + diagnostics
  A.music = function (mode) { if (mode === curMode && (mode === 'off' || tracks.some(t => t.alive))) return; setMode(mode); };
  A.currentMode = () => curMode;
  A.setVolumes = function (m, s) {
    const mm = normVol(m, 'music'), ss = normVol(s, 'sfx');
    if (mm != null) { vol.music = mm; if (mm > 0) lastOn.music = mm; }
    if (ss != null) { vol.sfx = ss; if (ss > 0) lastOn.sfx = ss; }
    if (mm != null || ss != null) volSet = true;
    applyVol(false);
    if (mm != null) setSession();
  };
  A._heal = () => watchdog();           // test hook: run one watchdog pass now
  A._recreate = () => recreate('manual'); // test hook
  A.musicOn = () => vol.music > 0;
  A.sfxOn = () => vol.sfx > 0;
  A.state = () => ({ ctx: E ? E.ctx.state : 'none', time: E ? +E.ctx.currentTime.toFixed(2) : 0, unlocked, mode: curMode,
    tracks: tracks.length, voices: voiceCount(), vol: Object.assign({}, vol), stats: Object.assign({}, D) });

  // ---- SFX with voice limiting
  // each sfx call records how many voices it started (T/Nz count them) and when the last one ends
  const active = [];  // [{end, n}]
  const MAX_V = 36, MAX_V_HI = 60; // low-priority (shots/hits/explosions/pickups) stop at MAX_V, UI/important sfx at MAX_V_HI
  const LOW = { shoot_laser: 1, shoot_plasma: 1, shoot_missile: 1, shoot_rail: 1, shoot_flame: 1, hit: 1, crit: 1, explode_s: 1, explode_m: 1, explode_l: 1,
    pickup_star: 1, pickup_crystal: 1, shield_hit: 1, beam_charge: 1, beam_fire: 1, mine: 1 };
  function pruneVoices(t) { for (let i = active.length - 1; i >= 0; i--) if (active[i].end <= t) active.splice(i, 1); }
  function voiceCount() { let n = 0; for (const a of active) n += a.n; return n; }
  let pokeT = 0;
  A.sfx = function (name, param) {
    const f = SFX[name]; if (!f || vol.sfx <= 0) return false;
    if (!E || E.ctx.state !== 'running') { // keep trying to get the context back (throttled; works with sticky activation)
      const t = now(); if (unlocked && t - pokeT > 1000) { pokeT = t; if (E) resume(false); else try { create(); } catch (e) { noteErr(e); } }
      return false;
    }
    const t = now(), gap = GAP[name] || 50, low = !!LOW[name];
    if (t - (last[name] || 0) < gap) return false;
    if (t - budgetT > 100) { budgetT = t; budget = 0; }
    if (low && ++budget > 10) return false; // global cap: max 10 gameplay sfx per 100ms (UI sfx always pass)
    const ct = E.ctx.currentTime; pruneVoices(ct);
    const vc = voiceCount();
    if (vc >= (low ? MAX_V : MAX_V_HI)) { D.dropped++; return false; }
    last[name] = t;
    E.vn = 0; E.vend = ct;
    try { f(E, ct + 0.005, typeof param === 'number' && !isFinite(param) ? undefined : param); }
    catch (e) { noteErr(e); return false; }
    finally { if (E && E.vn) active.push({ end: E.vend + 0.05, n: E.vn }); }
    return true;
  };

  // ------------------------------------------------------------------ offline test helpers
  function analyse(buf) {
    let peak = 0, sum = 0, n = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; n++; } }
    return { peak, rms: Math.sqrt(sum / Math.max(1, n)), seconds: buf.length / buf.sampleRate };
  }
  A._renderOffline = function (mode, seconds, startBar) {
    seconds = seconds || 8;
    const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, sr = 22050;
    const ctx = new OC(2, Math.ceil(sr * seconds), sr), OE = buildEngine(ctx);
    OE.musBus.gain.value = 0.3; // music at full volume setting
    if (mode === 'off') return ctx.startRendering().then(analyse);
    const tr = makeTrack(OE, mode, 0.02); tr.g.gain.value = 1;
    if (startBar) tr.step = startBar * 16;
    scheduleTrack(OE, tr, seconds);
    return ctx.startRendering().then(analyse);
  };
  A._renderSfxOffline = function (name, param) {
    const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, sr = 22050;
    const ctx = new OC(2, sr * 2, sr), OE = buildEngine(ctx); OE.sfxBus.gain.value = 0.9;
    SFX[name](OE, 0.01, param);
    return ctx.startRendering().then(analyse);
  };
  A._songBars = 64;
})(window.NC);
