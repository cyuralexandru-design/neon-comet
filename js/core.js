// Neon Comet: save system, stat calculation, audio + procedural music, input (keyboard/mouse, touch, gamepad).
'use strict';
(function (NC) {
  // =====================================================================
  // SAVE
  // =====================================================================
  const KEY = 'neonComet.v3', BAK = 'neonComet.v3.bak';
  NC.defaultSave = () => ({
    v: 3, credits: 0, best: 0, xp: 0,
    base: { atk: 0, hp: 0, shd: 0 },
    ships: { owned: ['scout'], eq: 'scout' },
    turrets: { owned: [], eq: null, lv: {} },
    comps: { owned: [], eq: null, lv: {} },
    gear: { items: [], eq: { weapon: null, armor: null, gen: null, core: null } },
    chests: { common: 0, rare: 0, epic: 0, legend: 0 },
    settings: { ctrl: null, aim: null, hand: 'right', music: 0.55, sfx: 0.8, vibe: true, shake: true, dmgNum: true, quality: 'high', fps: false, joySize: 1, btnAlpha: 0.85 },
    stats: { runs: 0, kills: 0, bosses: 0, maxCombo: 0, playtime: 0, crEarned: 0, chests: 0, revives: 0 },
    top: [], daily: { last: null, streak: 0 }, ach: {}, tut: false, created: Date.now(), saved: 0,
  });
  function merge(def, src) {
    if (!src || typeof src !== 'object' || Array.isArray(def)) return src === undefined ? def : src;
    const out = {};
    for (const k of Object.keys(def)) out[k] = (k in src) ? (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k]) ? merge(def[k], src[k]) : src[k]) : def[k];
    for (const k of Object.keys(src)) if (!(k in out)) out[k] = src[k];
    return out;
  }
  function migrateV2() {
    try {
      const raw = localStorage.getItem('neonComet.v2');
      if (!raw) { const b = +localStorage.getItem('neonComet.best') || 0; if (!b) return null; const s = NC.defaultSave(); s.best = b; return s; }
      const o = JSON.parse(raw), s = NC.defaultSave();
      s.best = o.best || 0;
      const old = { spread: [80, 220, 480, 900], rate: [40, 90, 170, 280, 420], power: [70, 180, 360, 620], armor: [120, 320, 650], magnet: [50, 140, 300], dash: [60, 160, 340], turret: [260, 750], pierce: [600] };
      let refund = 0;
      for (const [k, costs] of Object.entries(old)) for (let i = 0; i < (o.up && o.up[k] || 0); i++) refund += costs[i] || 0;
      s.credits = (o.credits || 0) + refund;
      const map = { cyan: 'scout', gold: 'solaris', violet: 'umbra', lime: 'vipera' };
      s.ships.owned = [...new Set((o.skins || ['cyan']).map(k => map[k]).filter(Boolean).concat('scout'))];
      s.ships.eq = map[o.skin] || 'scout';
      if (o.snd === false) s.settings.sfx = 0;
      s.migrated = refund;
      return s;
    } catch (e) { return null; }
  }
  NC.load = () => {
    let s = null;
    for (const k of [KEY, BAK]) {
      try { const raw = localStorage.getItem(k); if (raw) { s = JSON.parse(raw); if (s && s.v === 3) break; s = null; } } catch (e) { s = null; }
    }
    if (!s) s = migrateV2() || NC.defaultSave();
    s = merge(NC.defaultSave(), s);
    NC.save = s;
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
    return s;
  };
  let lastBak = 0;
  NC.persist = () => {
    const s = NC.save; if (!s) return;
    s.saved = Date.now();
    try {
      const json = JSON.stringify(s);
      localStorage.setItem(KEY, json);
      if (Date.now() - lastBak > 20000) { localStorage.setItem(BAK, json); lastBak = Date.now(); }
    } catch (e) {}
  };
  function sum(str) { let h = 7; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h.toString(36); }
  NC.exportSave = () => {
    const json = JSON.stringify(NC.save);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return 'NC3-' + sum(b64) + '-' + b64;
  };
  NC.importSave = (code) => {
    code = (code || '').trim();
    const m = code.match(/^NC3-([0-9a-z]+)-([A-Za-z0-9+/=]+)$/);
    if (!m || sum(m[2]) !== m[1]) return 'Codul nu e valid. Copiază-l complet, de la NC3- până la final.';
    try {
      const s = JSON.parse(decodeURIComponent(escape(atob(m[2]))));
      if (!s || s.v !== 3) return 'Codul e de la o versiune necunoscută.';
      NC.save = merge(NC.defaultSave(), s); NC.persist();
      try { localStorage.setItem(BAK, JSON.stringify(NC.save)); } catch (e) {}
      return null;
    } catch (e) { return 'Codul e deteriorat.'; }
  };
  NC.resetSave = () => { const st = NC.save.settings; NC.save = NC.defaultSave(); NC.save.settings = st; NC.save.tut = true; NC.persist(); try { localStorage.setItem(BAK, JSON.stringify(NC.save)); } catch (e) {} };

  // =====================================================================
  // STATS
  // =====================================================================
  NC.findItem = id => NC.save.gear.items.find(i => i.id === id);
  NC.computeStats = (s = NC.save) => {
    const ship = NC.SHIPS.find(x => x.id === s.ships.eq) || NC.SHIPS[0];
    const lv = NC.levelFromXp(s.xp).lvl, lm = 1 + NC.LEVEL_BONUS * (lv - 1);
    let atk = NC.BASE.atk + s.base.atk * NC.BASE_UP.atk.per;
    let hp = NC.BASE.hp + s.base.hp * NC.BASE_UP.hp.per;
    let shd = NC.BASE.shd + s.base.shd * NC.BASE_UP.shd.per;
    const ex = { crit: 0, rate: 0, xp: 0, regen: 0, magnet: 0, cr: 0 };
    for (const sl of NC.SLOTS) {
      const it = s.gear.eq[sl.id] && s.gear.items.find(i => i.id === s.gear.eq[sl.id]);
      if (!it) continue;
      const v = NC.gearMain(it);
      if (sl.main === 'atk') atk += v; else if (sl.main === 'hp') hp += v; else if (sl.main === 'shd') shd += v; else ex.cr += v;
      for (const e of NC.gearExtras(it)) ex[e.id] += e.v;
    }
    const turret = s.turrets.eq ? NC.TURRETS.find(t => t.id === s.turrets.eq) : null;
    const comp = s.comps.eq ? NC.COMPANIONS.find(c => c.id === s.comps.eq) : null;
    const st = {
      ship, lvl: lv,
      atk: Math.round(atk * ship.atk * lm), hp: Math.round(hp * ship.hp * lm), shd: Math.round(shd * ship.shd * lm),
      rate: ship.rate * (1 + ex.rate / 100), crit: Math.min(0.75, ship.crit + ex.crit / 100), speed: ship.speed, guns: ship.guns,
      pierce: !!ship.pierce, dashCd: 1.35 * ship.dashCd, novaKill: !!ship.novaKill,
      xpMult: 1 + ex.xp / 100, crMult: 1 + ex.cr / 100, regen: (1 + ex.regen / 100) * (comp && comp.shieldAura ? 1.3 : 1), magnet: 70 + ex.magnet,
      turret, turretLvl: turret ? (s.turrets.lv[turret.id] || 0) : 0,
      comp, compLvl: comp ? (s.comps.lv[comp.id] || 0) : 0,
    };
    st.power = Math.round(st.atk * st.rate * (st.guns * 0.6 + 0.4) * (1 + st.crit) * 4 + st.hp * 0.6 + st.shd * 0.6
      + (turret ? st.atk * turret.dmg * turret.rate * turret.count * NC.turretLvlMult(st.turretLvl) * 3 : 0)
      + (comp ? st.atk * NC.compDmg(st.compLvl) * st.rate * comp.guns * 4 : 0));
    return st;
  };

  // =====================================================================
  // AUDIO
  // =====================================================================
  const A = NC.audio = { ctx: null, master: null, sfxG: null, musG: null, noiseBuf: null, last: {} };
  A.unlock = () => {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      A.ctx = new C();
      A.master = A.ctx.createGain(); A.master.connect(A.ctx.destination);
      const comp = A.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(A.master);
      A.sfxG = A.ctx.createGain(); A.sfxG.connect(comp);
      A.musG = A.ctx.createGain(); A.musG.connect(comp);
      const n = A.ctx.sampleRate * 1.5; A.noiseBuf = A.ctx.createBuffer(1, n, A.ctx.sampleRate);
      const ch = A.noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
      A.applyVol();
      Music.start();
    } catch (e) { A.ctx = null; }
  };
  A.applyVol = () => {
    if (!A.ctx) return;
    const s = NC.save.settings;
    A.sfxG.gain.value = s.sfx * 0.9;
    A.musG.gain.value = s.music * 0.42;
  };
  function tone(f, d, type = 'sine', vol = 0.1, slide = 0, delay = 0, dest) {
    const c = A.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(25, f + slide), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(dest || A.sfxG); o.start(t); o.stop(t + d + 0.03);
  }
  function noise(d, vol, freq = 1200, type = 'lowpass', delay = 0, dest) {
    const c = A.ctx, t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = A.noiseBuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f).connect(g).connect(dest || A.sfxG); s.start(t, Math.random()); s.stop(t + d + 0.02);
  }
  A.sfx = (name, p = 1) => {
    if (!A.ctx || NC.save.settings.sfx <= 0) return;
    const now = performance.now(), gap = { shoot: 70, hit: 40, pickup: 30, explode: 35, eshoot: 90, click: 30 }[name] || 0;
    if (gap && now - (A.last[name] || 0) < gap) return;
    A.last[name] = now;
    try {
      switch (name) {
        case 'shoot': tone(1100 + Math.random() * 120, 0.05, 'square', 0.018, -600); break;
        case 'eshoot': tone(340, 0.12, 'sine', 0.035, -160); break;
        case 'hit': tone(260 + Math.random() * 60, 0.05, 'triangle', 0.03, -100); break;
        case 'crit': tone(1500, 0.08, 'square', 0.03, -900); break;
        case 'explode': noise(0.18 + p * 0.25, 0.1 + p * 0.12, 700 + p * 300); tone(90, 0.2 + p * 0.2, 'sine', 0.12 * Math.min(1.5, p), -50); break;
        case 'pickup': tone(520 + p * 40, 0.08, 'triangle', 0.05); break;
        case 'crystal': tone(1320, 0.06, 'sine', 0.04); tone(1760, 0.08, 'sine', 0.035, 0, 0.04); break;
        case 'dash': noise(0.25, 0.08, 2400, 'bandpass'); tone(220, 0.2, 'sawtooth', 0.04, 600); break;
        case 'hurt': tone(140, 0.35, 'sawtooth', 0.1, -90); noise(0.3, 0.12, 900); break;
        case 'shieldHit': tone(800, 0.12, 'sine', 0.05, -400); break;
        case 'level': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.07, 0, i * 0.07)); break;
        case 'card': tone(660, 0.12, 'triangle', 0.07, 330); break;
        case 'warn': tone(220, 0.5, 'square', 0.05, 0); tone(220, 0.5, 'square', 0.05, 0, 0.6); break;
        case 'boss': tone(60, 1.6, 'sawtooth', 0.12, 30); noise(1.4, 0.08, 400); break;
        case 'beamCharge': tone(200, 0.9, 'sawtooth', 0.04, 900); break;
        case 'beam': noise(0.7, 0.12, 1800, 'bandpass'); tone(110, 0.7, 'sawtooth', 0.06); break;
        case 'super': noise(0.8, 0.2, 600); tone(80, 0.9, 'sine', 0.2, -40); [392, 523, 784].forEach((f, i) => tone(f, 0.4, 'triangle', 0.06, f, i * 0.05)); break;
        case 'chest': [392, 494, 587, 784, 988].forEach((f, i) => tone(f, 0.25, 'triangle', 0.07, 0, i * 0.06)); noise(0.5, 0.06, 3000, 'highpass', 0.3); break;
        case 'legend': [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.35, 'triangle', 0.08, 0, i * 0.08)); break;
        case 'buy': tone(880, 0.1, 'triangle', 0.06); tone(1320, 0.14, 'triangle', 0.06, 0, 0.07); break;
        case 'error': tone(180, 0.18, 'square', 0.05, -40); break;
        case 'click': tone(700, 0.04, 'triangle', 0.035); break;
        case 'revive': [262, 330, 392, 523, 659].forEach((f, i) => tone(f, 0.3, 'sine', 0.08, 0, i * 0.06)); break;
        case 'over': [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, 'triangle', 0.06, 0, i * 0.15)); break;
      }
    } catch (e) {}
  };

  // ---------- procedural synthwave ----------
  const Music = NC.music = { mode: 'off', timer: null, step: 0, next: 0, bpm: 110 };
  const N = n => 440 * Math.pow(2, (n - 69) / 12); // midi -> Hz
  const SONGS = {
    menu: { bpm: 92, prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], drums: 0, arp: 0.5, bass: 0.6 },
    game: { bpm: 112, prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], drums: 1, arp: 1, bass: 1 },
    boss: { bpm: 132, prog: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]], drums: 2, arp: 1.2, bass: 1.2 },
  };
  Music.set = (mode) => { if (Music.mode === mode) return; Music.mode = mode; Music.step = 0; if (A.ctx) Music.next = A.ctx.currentTime + 0.08; };
  Music.start = () => {
    if (Music.timer) return;
    Music.next = A.ctx.currentTime + 0.1;
    Music.timer = setInterval(tick, 25);
  };
  function tick() {
    if (!A.ctx || A.ctx.state !== 'running') return;
    const song = SONGS[Music.mode];
    if (!song || NC.save.settings.music <= 0) { Music.next = A.ctx.currentTime + 0.05; return; }
    const sp16 = 60 / song.bpm / 4;
    while (Music.next < A.ctx.currentTime + 0.12) { playStep(song, Music.step, Music.next, sp16); Music.step++; Music.next += sp16; }
  }
  function mtone(f, t, d, type, vol, cutoff) {
    const c = A.ctx, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
    o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = cutoff || 2400;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(fl).connect(g).connect(A.musG); o.start(t); o.stop(t + d + 0.05);
  }
  function playStep(song, s, t, sp16) {
    const bar = Math.floor(s / 16) % song.prog.length, i = s % 16, ch = song.prog[bar];
    // pad on bar start
    if (i === 0) for (const n of ch) { mtone(N(n), t, sp16 * 16, 'sawtooth', 0.022, 900); mtone(N(n) * 1.003, t, sp16 * 16, 'sawtooth', 0.016, 900); }
    // bass
    if (song.bass && i % 2 === 0) mtone(N(ch[0] - 24 + (i % 8 === 6 ? 12 : 0)), t, sp16 * 1.8, 'sawtooth', 0.07 * song.bass, 500);
    // arp
    if (song.arp && (song.arp >= 1 || i % 2 === 0)) { const n = ch[i % 3] + (i % 6 >= 3 ? 12 : 0); mtone(N(n + 12), t, sp16 * 0.9, 'square', 0.018 * song.arp, 2800); }
    // drums
    const c = A.ctx;
    if (song.drums) {
      const kick = song.drums === 2 ? i % 4 === 0 : (i === 0 || i === 8 || i === 10);
      if (kick) { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(0.32, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(g).connect(A.musG); o.start(t); o.stop(t + 0.25); }
      if (i === 4 || i === 12) { noiseM(t, 0.16, 0.16, 1800, 'bandpass'); }
      if (i % 2 === 0 || song.drums === 2) noiseM(t, 0.035, 0.05, 7000, 'highpass');
    }
  }
  function noiseM(t, d, vol, freq, type) {
    const c = A.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = A.noiseBuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f).connect(g).connect(A.musG); s.start(t, Math.random()); s.stop(t + d + 0.02);
  }

  // =====================================================================
  // HAPTICS
  // =====================================================================
  NC.buzz = (ms, strength = 0.6) => {
    if (!NC.save.settings.vibe) return;
    const c = NC.save.settings.ctrl;
    try {
      if (c === 'touch' && navigator.vibrate) navigator.vibrate(ms);
      if (c === 'gamepad') {
        const gp = NC.Input.pad(); const act = gp && gp.vibrationActuator;
        if (act && act.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6 });
      }
    } catch (e) {}
  };

  // =====================================================================
  // INPUT
  // =====================================================================
  const I = NC.Input = {
    keys: {}, mouse: null, mouseDown: false,
    move: { x: 0, y: 0 }, aim: { x: 0, y: 0, on: false },
    joy: { x: 0, y: 0, id: null, cx: 0, cy: 0 }, aimJoy: { x: 0, y: 0 },
    q: { dash: false, super: false, pause: false },
    padIndex: null, prevBtn: [], navRepeat: 0, onNav: null, padSeen: false,
  };
  I.pad = () => { if (I.padIndex == null || !navigator.getGamepads) return null; return navigator.getGamepads()[I.padIndex]; };
  addEventListener('gamepadconnected', e => { I.padIndex = e.gamepad.index; I.padSeen = true; NC.ui && NC.ui.onPad && NC.ui.onPad(true, e.gamepad.id); });
  addEventListener('gamepaddisconnected', e => { if (I.padIndex === e.gamepad.index) I.padIndex = null; NC.ui && NC.ui.onPad && NC.ui.onPad(false); });

  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k) && !/input|textarea/i.test(e.target.tagName)) e.preventDefault();
    if (I.keys[k]) return;
    I.keys[k] = true;
    if (/input|textarea/i.test(e.target.tagName)) return;
    if (k === ' ' || k === 'shift') I.q.dash = true;
    if (k === 'e' || k === 'q') I.q.super = true;
    if ((k === 'p' || k === 'escape') && !(NC.ui && NC.ui.menuOpen && NC.ui.menuOpen())) I.q.pause = true;
    if (I.onNav) {
      const map = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right', enter: 'ok', escape: 'back' };
      if (map[k] && NC.ui && NC.ui.menuOpen && NC.ui.menuOpen()) I.onNav(map[k], 'kb');
    }
    if (/^(w|a|s|d|arrow)/.test(k)) I.mouse = null;
  });
  addEventListener('keyup', e => { I.keys[e.key.toLowerCase()] = false; });
  addEventListener('blur', () => { I.keys = {}; });

  I.bindCanvas = (cv) => {
    const loc = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && NC.save.settings.ctrl !== 'touch') I.mouse = loc(e); });
    cv.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || NC.save.settings.ctrl === 'touch') return;
      I.mouse = loc(e);
      if (e.button === 2) I.q.dash = true;
    });
    cv.addEventListener('contextmenu', e => e.preventDefault());
  };

  // touch: floating joystick + buttons. Layout is mirrored for left-handed players by CSS.
  I.bindTouch = () => {
    const zone = document.getElementById('joyZone'), stick = document.getElementById('joy'), knob = document.getElementById('knob');
    const J = I.joy;
    const place = (x, y) => { stick.style.left = x + 'px'; stick.style.top = y + 'px'; J.cx = x; J.cy = y; };
    I.resetJoy = () => {
      J.id = null; J.x = J.y = 0; knob.style.transform = ''; stick.classList.remove('on');
      const r = zone.getBoundingClientRect(); const left = NC.save.settings.hand !== 'left';
      const R = 60 * NC.save.settings.joySize;
      place(left ? Math.min(R + 50, r.width * 0.4) : r.width - Math.min(R + 50, r.width * 0.4), r.height - Math.min(R + 50, r.height * 0.42));
    };
    const moveKnob = e => {
      const r = zone.getBoundingClientRect(), R = 52 * NC.save.settings.joySize;
      let dx = e.clientX - r.left - J.cx, dy = e.clientY - r.top - J.cy;
      const m = Math.hypot(dx, dy); if (m > R) { dx *= R / m; dy *= R / m; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      const nx = dx / R, ny = dy / R;
      if (Math.hypot(nx, ny) < 0.12) { J.x = J.y = 0; } else { J.x = nx; J.y = ny; }
    };
    zone.addEventListener('pointerdown', e => {
      if (J.id !== null) return;
      e.preventDefault(); J.id = e.pointerId;
      try { zone.setPointerCapture(e.pointerId); } catch (_) {}
      const r = zone.getBoundingClientRect(); place(e.clientX - r.left, e.clientY - r.top);
      stick.classList.add('on'); moveKnob(e);
      NC.ui && NC.ui.hideTip && NC.ui.hideTip();
    });
    zone.addEventListener('pointermove', e => { if (e.pointerId === J.id) moveKnob(e); });
    const end = e => { if (e.pointerId === J.id) I.resetJoy(); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
    const btn = (id, fn) => { const b = document.getElementById(id); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); }); b.addEventListener('contextmenu', e => e.preventDefault()); };
    btn('btnDash', () => I.q.dash = true);
    btn('btnSuper', () => I.q.super = true);
    btn('btnPauseT', () => I.q.pause = true);
    I.resetJoy();
  };

  // called once per frame by the game loop
  I.poll = (dt) => {
    const s = NC.save.settings;
    let mx = 0, my = 0, ax = 0, ay = 0, aimOn = false;
    if (I.keys.a || I.keys.arrowleft) mx -= 1;
    if (I.keys.d || I.keys.arrowright) mx += 1;
    if (I.keys.w || I.keys.arrowup) my -= 1;
    if (I.keys.s || I.keys.arrowdown) my += 1;
    if (mx || my) { const m = Math.hypot(mx, my); mx /= m; my /= m; }
    if (s.ctrl === 'touch' && (I.joy.x || I.joy.y)) { mx = I.joy.x; my = I.joy.y; }

    const gp = I.pad();
    if (gp) {
      const dz = (v, d = 0.2) => Math.abs(v) < d ? 0 : (v - Math.sign(v) * d) / (1 - d);
      const lx = dz(gp.axes[0] || 0), ly = dz(gp.axes[1] || 0), rx = dz(gp.axes[2] || 0, 0.3), ry = dz(gp.axes[3] || 0, 0.3);
      let dpx = 0, dpy = 0;
      const B = i => gp.buttons[i] && gp.buttons[i].pressed;
      if (B(14)) dpx -= 1; if (B(15)) dpx += 1; if (B(12)) dpy -= 1; if (B(13)) dpy += 1;
      if (lx || ly) { mx = lx; my = ly; } else if (dpx || dpy) { mx = dpx; my = dpy; }
      const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
      if (Math.hypot(rx, ry) > 0.25) { ax = rx; ay = ry; aimOn = true; }
      const pressed = i => B(i) && !I.prevBtn[i];
      const anyPress = gp.buttons.some((b, i) => b.pressed && !I.prevBtn[i]);
      if (anyPress && s.ctrl !== 'gamepad') { s.ctrl = 'gamepad'; NC.ui && NC.ui.onCtrlChanged && NC.ui.onCtrlChanged(); }
      const menu = NC.ui && NC.ui.menuOpen && NC.ui.menuOpen();
      if (menu && I.onNav) {
        if (pressed(0)) I.onNav('ok', 'pad');
        if (pressed(1)) I.onNav('back', 'pad');
        if (pressed(9)) I.onNav('back', 'pad');
        if (pressed(4)) I.onNav('tabPrev', 'pad');
        if (pressed(5)) I.onNav('tabNext', 'pad');
        const sx = lx || dpx, sy = ly || dpy;
        if (Math.hypot(sx, sy) > 0.5) {
          I.navRepeat -= dt;
          if (I.navRepeat <= 0) { I.onNav(Math.abs(sx) > Math.abs(sy) ? (sx > 0 ? 'right' : 'left') : (sy > 0 ? 'down' : 'up'), 'pad'); I.navRepeat = I.navHeld ? 0.12 : 0.32; I.navHeld = true; }
        } else { I.navRepeat = 0; I.navHeld = false; }
      } else {
        if (pressed(0) || pressed(5) || pressed(7)) I.q.dash = true;
        if (pressed(2) || pressed(3) || pressed(4) || pressed(6)) I.q.super = true;
        if (pressed(9)) I.q.pause = true;
      }
      I.prevBtn = gp.buttons.map(b => b.pressed);
    }
    I.move.x = mx; I.move.y = my;
    I.aim.x = ax; I.aim.y = ay; I.aim.on = aimOn;
  };
  I.take = (k) => { const v = I.q[k]; I.q[k] = false; return v; };
  I.clear = () => { I.q.dash = I.q.super = I.q.pause = false; };
})(window.NC);
