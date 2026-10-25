// Neon Comet 3.0 - audio: chiptune SFX + procedural music sequencer (WebAudio, no files).
// API: NC.audio.unlock(), sfx(name, param), music(mode), setVolumes(music, sfx), ready.
// Internal/test: NC.audio._renderOffline(mode, seconds), _renderSfxOffline(name, param), SFX_NAMES, MODES.
window.NC = window.NC || {};
(function (NC) {
  'use strict';
  const A = NC.audio = NC.audio || {};
  A.ready = false;
  A.MODES = ['menu', 'nebula', 'asteroid', 'ion', 'station', 'boss', 'off'];
  let vol = { music: 0.7, sfx: 0.8 };
  try { const s = NC.save && NC.save.settings; if (s) { if (typeof s.music === 'number') vol.music = s.music; if (typeof s.sfx === 'number') vol.sfx = s.sfx; } } catch (e) {}

  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ------------------------------------------------------------------ engine (graph per context)
  function buildEngine(ctx) {
    const E = { ctx };
    E.out = ctx.createGain(); E.out.gain.value = 0.9;
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
  function scheduleTrack(E, tr, until) {
    while (tr.next < until) { playStep(E, tr, tr.step, tr.next); tr.step++; tr.next += tr.sp; }
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

  // ------------------------------------------------------------------ live runtime
  let E = null, tracks = [], curMode = 'off', timer = null, unlocked = false;
  const LOOK = 0.16, FADE = 1.2;
  function musicLevel() { return 0.3 * vol.music; }
  function applyVol() { if (!E) return; const t = E.ctx.currentTime; E.sfxBus.gain.setTargetAtTime(vol.sfx * 0.9, t, 0.03); E.musBus.gain.setTargetAtTime(musicLevel(), t, 0.05); }
  function tick() {
    if (!E || E.ctx.state !== 'running') return;
    const now = E.ctx.currentTime;
    for (let k = tracks.length - 1; k >= 0; k--) {
      const tr = tracks[k];
      if (!tr.alive) { if (now > tr.dieAt) { try { tr.g.disconnect(); } catch (e) {} tracks.splice(k, 1); } continue; }
      if (tr.next < now - 0.05) { const skip = Math.ceil((now - tr.next) / tr.sp); tr.step += skip; tr.next += skip * tr.sp; } // after stall, skip instead of bursting
      if (vol.music > 0) scheduleTrack(E, tr, now + LOOK);
      else { tr.next = now + 0.05; }
    }
  }
  function startTimer() { if (!timer) timer = setInterval(tick, 30); }
  function setMode(mode) {
    if (!A.MODES.includes(mode)) mode = 'off';
    curMode = mode;
    if (!E) return;
    const now = E.ctx.currentTime;
    for (const tr of tracks) if (tr.alive) { tr.alive = false; tr.dieAt = now + FADE + LOOK + 0.3; tr.g.gain.cancelScheduledValues(now); tr.g.gain.setValueAtTime(tr.g.gain.value, now); tr.g.gain.linearRampToValueAtTime(0, now + FADE); }
    if (mode === 'off') return;
    const tr = makeTrack(E, mode, now + 0.08);
    tr.g.gain.setValueAtTime(0, now); tr.g.gain.linearRampToValueAtTime(1, now + (tracks.length ? FADE : 0.3));
    tracks.push(tr);
  }

  A.unlock = function () {
    try {
      if (E) { if (E.ctx.state === 'suspended' && !document.hidden) E.ctx.resume(); return; }
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      E = buildEngine(new C({ latencyHint: 'interactive' }));
      unlocked = true; applyVol(); startTimer();
      if (E.ctx.state === 'suspended') E.ctx.resume();
      A.ready = true; A.ctx = E.ctx;
      if (curMode !== 'off') { const m = curMode; curMode = 'off'; setMode(m); }
    } catch (e) { E = null; A.ready = false; }
  };
  A.music = function (mode) { if (mode === curMode && (mode === 'off' || tracks.some(t => t.alive))) return; setMode(mode); };
  A.currentMode = () => curMode;
  A.setVolumes = function (m, s) {
    if (typeof m === 'number' && isFinite(m)) vol.music = Math.max(0, Math.min(1, m));
    if (typeof s === 'number' && isFinite(s)) vol.sfx = Math.max(0, Math.min(1, s));
    applyVol();
  };
  A.sfx = function (name, param) {
    const f = SFX[name]; if (!f || !E || vol.sfx <= 0 || E.ctx.state !== 'running') return false;
    const now = performance.now(), gap = GAP[name] || 50;
    if (now - (last[name] || 0) < gap) return false;
    if (now - budgetT > 100) { budgetT = now; budget = 0; }
    if (++budget > 10) return false; // global cap: max 10 sfx per 100ms
    last[name] = now;
    try { f(E, E.ctx.currentTime + 0.005, param); } catch (e) { return false; }
    return true;
  };
  document.addEventListener('visibilitychange', () => {
    if (!E) return;
    if (document.hidden) E.ctx.suspend().catch(() => {});
    else if (unlocked) E.ctx.resume().then(() => { const n = E.ctx.currentTime + 0.05; for (const tr of tracks) if (tr.next < n) { const k = Math.ceil((n - tr.next) / tr.sp); tr.step += k; tr.next += k * tr.sp; } }).catch(() => {});
  });
  // auto-unlock on first gesture (harmless if app also calls unlock)
  const gest = () => { A.unlock(); if (E && E.ctx.state === 'running') ['pointerdown', 'keydown', 'touchend'].forEach(ev => window.removeEventListener(ev, gest, true)); };
  ['pointerdown', 'keydown', 'touchend'].forEach(ev => window.addEventListener(ev, gest, true));

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
