// Neon Comet: game simulation + rendering.
'use strict';
(function (NC) {
  const { TAU, rnd, clamp, pick } = NC;
  const G = NC.game = { mode: 'menu', W: 1100, H: 640, scale: 1, run: null, time: 0, fps: 60 };
  let cv, ctx, DPR = 1, cssW = 1, cssH = 1;
  const PAT = {
    1: [[0, 0]], 2: [[0, -6], [0, 6]], 3: [[0, 0], [-0.13, -4], [0.13, 4]],
    4: [[0, -6], [0, 6], [-0.2, -7], [0.2, 7]], 5: [[0, 0], [-0.12, -5], [0.12, 5], [-0.26, -7], [0.26, 7]],
    6: [[0, -6], [0, 6], [-0.18, -7], [0.18, 7], [-0.34, -8], [0.34, 8]], 7: [[0, 0], [-0.1, -5], [0.1, 5], [-0.22, -7], [0.22, 7], [-0.36, -8], [0.36, 8]],
    8: [[0, -6], [0, 6], [-0.15, -7], [0.15, 7], [-0.3, -8], [0.3, 8], [-0.45, -9], [0.45, 9]],
  };
  const QUAL = { high: { parts: 1000, glow: true, dpr: 2 }, med: { parts: 500, glow: true, dpr: 1.5 }, low: { parts: 220, glow: false, dpr: 1 } };
  const Q = () => QUAL[NC.save.settings.quality] || QUAL.high;

  // =====================================================================
  // SETUP
  // =====================================================================
  G.init = (canvas) => {
    cv = canvas; ctx = cv.getContext('2d');
    NC.Input.bindCanvas(cv);
    resize(); addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(cv.parentElement);
    requestAnimationFrame(loop);
  };
  function resize() {
    const r = cv.parentElement.getBoundingClientRect();
    cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
    DPR = Math.min(window.devicePixelRatio || 1, Q().dpr);
    cv.width = Math.round(cssW * DPR); cv.height = Math.round(cssH * DPR);
    G.scale = Math.sqrt(cssW * cssH / NC.ARENA_AREA);
    G.W = cssW / G.scale; G.H = cssH / G.scale;
    let pr = document.getElementById('satProbe');
    if (!pr) { pr = document.createElement('div'); pr.id = 'satProbe'; pr.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px)'; document.body.appendChild(pr); }
    const sat = parseFloat(getComputedStyle(pr).paddingTop) || 0;
    G.top = (64 + sat) / G.scale; // HUD band (world units)
    G.bossTop = (150 + sat) / G.scale; // below HUD + boss bar
    makeBg();
    if (G.run && G.run.p) { G.run.p.x = clamp(G.run.p.x, 20, G.W - 20); G.run.p.y = clamp(G.run.p.y, 20, G.H - 20); }
    NC.Input.resetJoy && NC.Input.resetJoy();
  }
  G.resize = resize;
  G.toWorld = (x, y) => ({ x: x / G.scale, y: y / G.scale });

  // ---------- cached sprites ----------
  const gcache = {};
  function glowSpr(col, hot) {
    const k = col + (hot ? 'h' : 's');
    if (gcache[k]) return gcache[k];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (hot) { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.18, col); gr.addColorStop(0.45, col + '55'); }
    else { gr.addColorStop(0, col + 'aa'); gr.addColorStop(0.4, col + '40'); }
    gr.addColorStop(1, col + '00');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return gcache[k] = c;
  }
  function glow(x, y, col, rad, a = 1, hot = false) {
    if (a <= 0.01) return;
    ctx.globalAlpha = a; ctx.drawImage(glowSpr(col, hot), x - rad, y - rad, rad * 2, rad * 2);
  }
  const shipCache = {};
  const SHIP_SCALE = 1.45;
  function shipSprite(ship) {
    if (shipCache[ship.id]) return shipCache[ship.id];
    const R = 3, S = 72, c = document.createElement('canvas'); c.width = c.height = S * R;
    const g = c.getContext('2d'); g.scale(R, R); g.translate(S / 2, S / 2); g.scale(SHIP_SCALE, SHIP_SCALE);
    drawShipBody(g, ship);
    return shipCache[ship.id] = c;
  }
  function drawShipBody(g, ship) {
    const pts = ship.shape;
    g.lineJoin = 'round';
    // underglow
    g.save(); g.shadowColor = ship.a; g.shadowBlur = 8;
    const gr = g.createLinearGradient(-14, -12, 18, 12);
    gr.addColorStop(0, '#0b0820'); gr.addColorStop(0.55, ship.b); gr.addColorStop(1, ship.a);
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
    g.fillStyle = gr; g.fill(); g.restore();
    // bevel highlight on the upper half
    g.save(); g.clip();
    const hl = g.createLinearGradient(0, -16, 0, 4); hl.addColorStop(0, 'rgba(255,255,255,0.28)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hl; g.fillRect(-20, -20, 44, 20);
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(-10, 0); g.lineTo(12, 0); g.moveTo(-4, -8); g.lineTo(4, -2); g.moveTo(-4, 8); g.lineTo(4, 2); g.stroke();
    g.restore();
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
    g.strokeStyle = ship.a; g.lineWidth = 1.3; g.stroke();
    // cockpit
    const cg = g.createRadialGradient(7, -1, 0, 6, 0, 5); cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.5, '#c9f6ff'); cg.addColorStop(1, ship.b);
    g.fillStyle = cg; g.beginPath(); g.ellipse(6, 0, 4.8, 2.3, 0, 0, TAU); g.fill();
    // wingtip lights
    const tips = pts.filter(([x, y]) => Math.abs(y) >= 12);
    g.fillStyle = '#ffffff'; for (const [x, y] of tips.slice(0, 2)) { g.beginPath(); g.arc(x + 1, y * 0.95, 1, 0, TAU); g.fill(); }
  }
  G.shipSprite = shipSprite;
  G.drawShipPreview = (canvas, ship, t = 0) => {
    const g = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    g.clearRect(0, 0, w, h);
    g.save(); g.translate(w / 2, h / 2); const s = Math.min(w, h) / 72; g.scale(s, s);
    g.globalCompositeOperation = 'lighter';
    g.drawImage(glowSpr(ship.a, false), -40, -26, 40, 52);
    g.globalCompositeOperation = 'source-over';
    g.drawImage(shipSprite(ship), -36, -36, 72, 72);
    g.restore();
  };

  // ---------- background ----------
  let neb = null, planet = null, layers = [], dust = [];
  function makeBg() {
    const W = G.W, H = G.H, m = 160, k = 0.5;
    neb = document.createElement('canvas'); neb.width = Math.ceil((W + m * 2) * k); neb.height = Math.ceil((H + m * 2) * k);
    const g = neb.getContext('2d'); g.scale(k, k);
    const bg = g.createLinearGradient(0, 0, 0, H + m * 2); bg.addColorStop(0, '#05040d'); bg.addColorStop(1, '#0a0717');
    g.fillStyle = bg; g.fillRect(0, 0, W + m * 2, H + m * 2);
    const cols = ['#4a1d8a', '#0d5a7a', '#8a1d6a', '#1d2f8a', '#0e6b5a', '#5a1d4a'];
    for (let i = 0; i < 11; i++) {
      const x = rnd(0, W + m * 2), y = rnd(0, H + m * 2), rr = rnd(0.2, 0.55) * Math.max(W, H);
      const gr = g.createRadialGradient(x, y, 0, x, y, rr), c = cols[i % cols.length];
      gr.addColorStop(0, c + '50'); gr.addColorStop(0.5, c + '18'); gr.addColorStop(1, c + '00');
      g.fillStyle = gr; g.fillRect(0, 0, W + m * 2, H + m * 2);
    }
    for (let i = 0; i < (W * H) / 700; i++) { g.fillStyle = `rgba(210,200,255,${rnd(0.05, 0.3)})`; g.fillRect(rnd(0, W + m * 2), rnd(0, H + m * 2), 1.2, 1.2); }
    // planet
    const pr = Math.min(W, H) * rnd(0.16, 0.24), P = Math.ceil(pr * 3.2);
    planet = document.createElement('canvas'); planet.width = planet.height = P;
    const p = planet.getContext('2d'), cx = P / 2, cy = P / 2;
    const hue = pick([[64, 30, 120], [20, 70, 110], [110, 40, 70], [30, 80, 90]]);
    const pg = p.createRadialGradient(cx - pr * 0.4, cy - pr * 0.4, pr * 0.1, cx, cy, pr);
    pg.addColorStop(0, `rgb(${hue[0] * 2.2},${hue[1] * 2.2},${hue[2] * 2.2})`); pg.addColorStop(0.6, `rgb(${hue[0]},${hue[1]},${hue[2]})`); pg.addColorStop(1, '#05040d');
    p.save(); p.beginPath(); p.arc(cx, cy, pr, 0, TAU); p.fillStyle = pg; p.fill(); p.clip();
    for (let i = 0; i < 9; i++) { p.fillStyle = `rgba(255,255,255,${rnd(0.02, 0.07)})`; p.fillRect(cx - pr, cy - pr + rnd(0, pr * 2), pr * 2, rnd(2, pr * 0.12)); }
    const sh = p.createRadialGradient(cx + pr * 0.5, cy + pr * 0.5, pr * 0.2, cx + pr * 0.3, cy + pr * 0.3, pr * 1.3); sh.addColorStop(0, 'rgba(0,0,0,0.7)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    p.fillStyle = sh; p.fillRect(0, 0, P, P); p.restore();
    p.save(); p.translate(cx, cy); p.rotate(-0.35); p.scale(1, 0.22);
    p.strokeStyle = `rgba(${hue[0] * 3},${hue[1] * 3},${hue[2] * 3},0.45)`; p.lineWidth = pr * 0.09; p.beginPath(); p.arc(0, 0, pr * 1.45, 0, TAU); p.stroke();
    p.strokeStyle = 'rgba(255,255,255,0.12)'; p.lineWidth = pr * 0.03; p.beginPath(); p.arc(0, 0, pr * 1.3, 0, TAU); p.stroke(); p.restore();
    G.planetPos = { x: rnd(0.12, 0.88) * W, y: rnd(0.15, 0.5) * H };
    layers = [0.25, 0.5, 1].map(z => Array.from({ length: Math.round(W * H / (5200 / z)) }, () => ({ x: rnd(0, W), y: rnd(0, H), z, tw: rnd(0, 6) })));
    dust = Array.from({ length: 24 }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(20, 60), a: rnd(0.02, 0.05), s: rnd(8, 20) }));
  }

  // =====================================================================
  // RUN STATE
  // =====================================================================
  function newRun() {
    const st = NC.computeStats();
    const R = G.run = {
      st, m: { dmg: 1, rate: 1, guns: 0, pierce: false, bounce: 0, missile: 0, orbit: 0, shd: 1, shdRegen: 1, hp: 1, magnet: 0, speed: 1, dashCd: 1, crit: 0, vamp: 0 },
      cards: {}, score: 0, combo: 1, comboT: 0, maxCombo: 1, tier: 1, kills: 0, crRun: 0, xpRun: 0, time: 0,
      runLvl: 1, runXp: 0, runNeed: NC.runXpFor(1), pendingCards: 0,
      p: { x: G.W / 2, y: G.H * 0.62, vx: 0, vy: 0, ang: -Math.PI / 2, r: 11, hp: st.hp, shd: st.shd, shdT: 0, inv: 2, dashT: 0, dashCd: 0, fireT: 0, superC: 0, alive: true, hurtT: 0 },
      bullets: [], ebullets: [], beams: [], mines: [], orbs: [], enemies: [], stars: [], items: [], parts: [], rings: [], pops: [], bolts: [],
      boss: null, bossIdx: 0, nextBoss: NC.bossThreshold(0), bossIntro: 0, spawnT: 1.2, pickT: rnd(22, 30), capT: 50,
      announced: new Set(['drifter']), banner: null, revives: 0, chestsFound: [], over: 0, hyper: 0,
      comp: null, drones: [], missileT: 2, orbitA: 0, hitstop: 0, flash: 0, flashCol: '#fff', shake: 0, dying: 0, saveT: 10, deathT: 0,
      tut: !NC.save.tut ? 0 : -1,
    };
    applyMaxes();
    R.p.hp = R.maxHp; R.p.shd = R.maxShd;
    if (st.comp) R.comp = { x: R.p.x - 40, y: R.p.y + 30, ang: R.p.ang };
    if (st.turret) for (let i = 0; i < st.turret.count; i++) R.drones.push({ a: i / st.turret.count * TAU, fireT: rnd(0, 0.5), x: R.p.x, y: R.p.y });
    for (let i = 0; i < 4; i++) spawnStar();
    for (let i = 0; i < 3; i++) spawnEnemy('drifter');
  }
  function applyMaxes() {
    const R = G.run, st = R.st, m = R.m;
    const oldHp = R.maxHp || 1, oldShd = R.maxShd || 1;
    R.maxHp = Math.round(st.hp * m.hp); R.maxShd = Math.round(st.shd * m.shd);
    if (R.p) { R.p.hp *= R.maxHp / oldHp; R.p.shd *= R.maxShd / oldShd; }
  }
  const eff = () => {
    const R = G.run, st = R.st, m = R.m, ov = R.over > 0;
    return {
      atk: st.atk * m.dmg, rate: st.rate * m.rate * (ov ? 2 : 1), guns: Math.min(8, st.guns + m.guns + (ov ? 2 : 0)),
      pierce: st.pierce || m.pierce, crit: Math.min(0.8, st.crit + m.crit), speed: st.speed * m.speed, dashCd: st.dashCd * m.dashCd,
      magnet: st.magnet + m.magnet,
    };
  };

  G.start = () => {
    newRun(); G.mode = 'play'; G.time = 0;
    NC.music.set('game');
    NC.ui.onRunStart();
    if (G.run.tut === 0) tutorial();
  };
  function tutorial() {
    const touch = NC.save.settings.ctrl === 'touch', pad = NC.save.settings.ctrl === 'gamepad';
    const steps = [
      [0.5, 'BINE AI VENIT, PILOTE', touch ? 'joystick-ul mută nava, laserele trag singure' : pad ? 'stick stânga mută nava, stick dreapta țintește' : 'nava urmărește mouse-ul, laserele trag singure'],
      [4.5, 'STELE = COMBO', 'adună stele și distruge inamici fără pauză ca să crești combo-ul'],
      [8.5, touch ? 'DASH ȘI SUPER' : pad ? 'A = DASH · X = SUPER' : 'SPACE = DASH · E = SUPER', 'dash-ul te face invulnerabil, super-ul curăță ecranul când bara e plină'],
      [12.5, 'CRISTALE ◆', 'cumperi upgrade-uri, nave și cufere în Hangar'],
    ];
    for (const [t, a, b] of steps) setTimeout(() => { if (G.run && G.mode !== 'menu') banner(a, b, '#5ef0ff', 3.6); }, t * 1000);
  }

  // =====================================================================
  // SPAWNING
  // =====================================================================
  function safeSpot(minD = 220, margin = 40) {
    const p = G.run.p;
    for (let k = 0; k < 40; k++) {
      const pt = { x: rnd(margin, G.W - margin), y: rnd(Math.max(margin, G.top), G.H - margin) };
      if (!p || (pt.x - p.x) ** 2 + (pt.y - p.y) ** 2 > minD * minD) return pt;
    }
    return { x: rnd(margin, G.W - margin), y: rnd(G.top, G.H - margin) };
  }
  function spawnStar(gold = false, at = null) {
    const s = at || safeSpot(80);
    G.run.stars.push({ x: s.x, y: s.y, vx: at ? rnd(-170, 170) : 0, vy: at ? rnd(-170, 170) : 0, r: gold ? 9 : 8, t: Math.random() * 6, life: 0, gold });
  }
  function spawnEnemy(type, at = null, opts = {}) {
    const R = G.run, d = NC.ENEMIES[type], tm = NC.tierMult(R.tier);
    const s = at || safeSpot(240);
    const frac = (R.score % NC.TIER_SIZE) / NC.TIER_SIZE;
    const spm = Math.min(1.7, 1 + (R.tier - 1) * 0.07 + frac * 0.05);
    const a = rnd(0, TAU), sp = d.sp * spm * rnd(0.85, 1.15);
    const elite = opts.elite || (R.score >= NC.ELITE_FROM && type !== 'mini' && type !== 'shard' && Math.random() < 0.08 + Math.min(0.12, (R.tier - 4) * 0.01));
    const e = {
      type, d, x: s.x, y: s.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, sp, r: d.r * (elite ? 1.18 : 1),
      hp: d.hp * tm.hp * (elite ? 2.6 : 1), dmg: d.dmg * tm.dmg * (elite ? 1.3 : 1), rot: rnd(0, TAU), flash: 0, warm: at ? 0 : 0.85, t: rnd(0, 2), elite, lvl: R.tier,
    };
    e.max = e.hp;
    if (type === 'splitter' || type === 'shard') e.verts = Array.from({ length: 10 }, () => rnd(0.72, 1.08));
    if (type === 'gunner') e.fireT = rnd(1, 2);
    if (type === 'charger') { e.state = 'idle'; e.st = rnd(1.2, 2.2); }
    if (type === 'sentinel') { e.fireT = rnd(2, 3.5); }
    if (type === 'carrier') { e.fireT = rnd(2, 3); }
    R.enemies.push(e);
    return e;
  }
  function pickType() {
    const R = G.run;
    const pool = Object.entries(NC.ENEMIES).filter(([, d]) => d.w && d.unlock <= R.score).map(([k, d]) => [k, d.w]);
    return NC.weighted(pool);
  }

  // =====================================================================
  // EFFECTS
  // =====================================================================
  function burst(x, y, col, n, sp, size = 3, life = 0.8) {
    const R = G.run, cap = Q().parts;
    if (R.parts.length > cap) return;
    n = Math.ceil(n * (cap / 1000 + 0.3));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = rnd(sp * 0.2, sp);
      R.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(life * 0.4, life), max: life, col, r: rnd(1, size), kind: 0 });
    }
  }
  function debris(x, y, col, n, sp) {
    const R = G.run; if (R.parts.length > Q().parts) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = rnd(sp * 0.3, sp);
      R.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.6, 1.2), max: 1.2, col, r: rnd(2, 5), kind: 1, rot: rnd(0, TAU), vr: rnd(-8, 8) });
    }
  }
  function smoke(x, y, n, size) {
    const R = G.run; if (R.parts.length > Q().parts) return;
    for (let i = 0; i < n; i++) R.parts.push({ x: x + rnd(-size, size) * 0.4, y: y + rnd(-size, size) * 0.4, vx: rnd(-30, 30), vy: rnd(-30, 30), life: rnd(0.6, 1.1), max: 1.1, col: '#2a2440', r: rnd(size * 0.4, size), kind: 2 });
  }
  function ring(x, y, col, max, life = 0.5, w = 3) { G.run.rings.push({ x, y, col, r: 4, max, life, ml: life, w }); }
  function pop(x, y, txt, col, size = 15, life = 0.8) { G.run.pops.push({ x, y, txt, col, life, ml: life, size, vy: -50 }); }
  function dmgNum(x, y, v, crit) { if (NC.save.settings.dmgNum) pop(x + rnd(-8, 8), y - 10, NC.fmt(v), crit ? '#ffd65e' : '#ece8ff', crit ? 18 : 12, 0.6); }
  function shake(v) { if (NC.save.settings.shake) G.run.shake = Math.max(G.run.shake, v); }
  function flash(col, a) { G.run.flash = Math.max(G.run.flash, a); G.run.flashCol = col; }
  function explode(x, y, col, size) {
    burst(x, y, col, 10 + size, 120 + size * 7, 3.5);
    burst(x, y, '#ffffff', 5, 90 + size * 3, 2, 0.4);
    debris(x, y, col, Math.min(8, 2 + size / 6), 120 + size * 4);
    smoke(x, y, Math.min(6, 2 + size / 8), size * 0.9);
    ring(x, y, col, size * 3.2);
    shake(Math.min(9, size / 3.5));
    NC.audio.sfx('explode', Math.min(2, size / 22));
  }
  function banner(txt, sub, col = '#5ef0ff', t = 2.8) { G.run.banner = { txt, sub, col, t, ml: t }; }
  G.banner = banner;

  // =====================================================================
  // COMBAT
  // =====================================================================
  function nearestEnemy(x, y, maxD = 1e9, exclude) {
    const R = G.run; let best = null, bd = maxD * maxD;
    for (const e of R.enemies) { if (e.dead || e.warm > 0 || e.leaving || (exclude && exclude.has(e))) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
    for (const o of R.orbs) { if (o.dead) continue; const d = (o.x - x) ** 2 + (o.y - y) ** 2; if (d < bd) { bd = d; best = o; } }
    if (R.boss && R.boss.state !== 'enter' && !R.boss.hidden) { const b = R.boss, d = Math.max(0, Math.hypot(b.x - x, b.y - y) - b.r) ** 2; if (d < bd) best = b; }
    return best;
  }
  function addBullet(x, y, ang, speed, dmg, o) {
    G.run.bullets.push(Object.assign({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, dmg, life: 1.2, hit: null, bounce: 0, col: '#5ef0ff', w: 1, crit: false }, o));
  }
  function rollDmg(base, crit) { const c = Math.random() < crit; return { v: base * rnd(0.92, 1.08) * (c ? 2 : 1), c }; }

  function fireMain(E) {
    const R = G.run, p = R.p, ship = R.st.ship;
    const n = Math.min(8, E.guns), ca = Math.cos(p.ang), sa = Math.sin(p.ang);
    for (const [da, off] of PAT[n]) {
      const a = p.ang + da, d = rollDmg(E.atk, E.crit);
      addBullet(p.x + ca * 18 - sa * off, p.y + sa * 18 + ca * off, a, 820, d.v, { crit: d.c, col: ship.a, pierce: E.pierce, hit: E.pierce || R.m.bounce ? new Set() : null, bounce: R.m.bounce, owner: 'p' });
    }
    burst(p.x + ca * 20, p.y + sa * 20, ship.a, 1, 60, 1.5, 0.15);
    NC.audio.sfx('shoot');
    // companion fires in sync, 2/3 attack
    if (R.comp && R.st.comp) {
      const c = R.comp, cd = R.st.comp, frac = NC.compDmg(R.st.compLvl), cang = c.ang;
      const t = cd.homing ? nearestEnemy(c.x, c.y, 600) : null;
      for (let i = 0; i < cd.guns; i++) {
        const off = cd.guns > 1 ? (i ? 5 : -5) : 0, d = rollDmg(E.atk * frac, E.crit + (cd.crit || 0));
        addBullet(c.x + Math.cos(cang) * 12 - Math.sin(cang) * off, c.y + Math.sin(cang) * 12 + Math.cos(cang) * off, cang, 800, d.v,
          { crit: d.c, col: cd.col, w: 0.8, pierce: !!cd.pierce, hit: cd.pierce ? new Set() : null, homing: t ? 4 : 0, target: t, owner: 'c' });
      }
    }
  }
  function hitEnemy(e, dmg, crit, x, y) {
    if (e.dead || e.leaving) return;
    e.hp -= dmg; e.flash = 0.07;
    dmgNum(x != null ? x : e.x, y != null ? y : e.y - e.r, dmg, crit);
    if (crit) NC.audio.sfx('crit'); else NC.audio.sfx('hit');
    G.run.p.superC = Math.min(100, G.run.p.superC + dmg / Math.max(1, e.max) * 0.6);
    if (e.hp <= 0) killEnemy(e);
  }
  function killEnemy(e, silent) {
    const R = G.run, d = e.d, tm = NC.tierMult(R.tier);
    e.dead = true;
    if (!silent) {
      R.kills++; NC.save.stats.kills++;
      bumpCombo();
      const mult = e.elite ? 3 : 1;
      addScore(d.score * mult, e.x, e.y - e.r - 6);
      const cr = d.cr * mult * tm.cr * R.st.crMult;
      if (cr > 0) dropCrystals(e.x, e.y, cr);
      addXp(d.xp * mult * tm.xp);
      R.p.superC = Math.min(100, R.p.superC + 2.2 * mult);
      if (R.m.vamp) R.p.hp = Math.min(R.maxHp, R.p.hp + R.maxHp * 0.01 * R.m.vamp);
      if (Math.random() < 0.1) spawnStar(false, { x: e.x, y: e.y });
      if (e.elite && Math.random() < 0.07) dropChest(e.x, e.y, Math.random() < 0.8 ? 'common' : 'rare');
      if (R.st.novaKill) { ring(e.x, e.y, R.st.ship.a, 90, 0.35, 2); for (const o of R.enemies) if (!o.dead && o !== e && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < 90 * 90) hitEnemy(o, eff().atk * 0.8, false); }
    }
    explode(e.x, e.y, d.col, e.r * (e.elite ? 1.4 : 1));
    if (e.type === 'splitter' && !silent) for (let i = 0; i < 3; i++) spawnEnemy('shard', { x: e.x + rnd(-10, 10), y: e.y + rnd(-10, 10) }, { elite: false });
  }
  function dropCrystals(x, y, value) {
    const R = G.run, n = value > 30 ? 3 : value > 8 ? 2 : 1;
    for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(60, 180); R.items.push({ kind: 'cr', v: value / n, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, r: 7 }); }
  }
  function dropChest(x, y, id) { G.run.items.push({ kind: 'chest', id, x, y, vx: 0, vy: 40, t: 0, r: 16 }); }
  function bumpCombo() { const R = G.run; R.combo = Math.min(15, R.combo + 1); R.comboT = 2.6; R.maxCombo = Math.max(R.maxCombo, R.combo); }
  function addScore(base, x, y) { const R = G.run, g = Math.round(base * R.combo); R.score += g; if (x != null && !NC.save.settings.dmgNum) pop(x, y, '+' + g, '#ffd65e', 13); }
  function addXp(v) {
    const R = G.run; R.xpRun += v; R.runXp += v;
    while (R.runXp >= R.runNeed) { R.runXp -= R.runNeed; R.runLvl++; R.runNeed = NC.runXpFor(R.runLvl); R.pendingCards++; }
  }
  function damagePlayer(dmg, src) {
    const R = G.run, p = R.p;
    if (!p.alive || p.inv > 0 || p.dashT > 0 || R.hyper > 0) return false;
    p.shdT = 2.6;
    if (p.shd > 0) { const a = Math.min(p.shd, dmg); p.shd -= a; dmg -= a; NC.audio.sfx('shieldHit'); ring(p.x, p.y, '#7dd8ff', 34, 0.3, 2); }
    if (dmg > 0) {
      p.hp -= dmg; p.hurtT = 0.4; flash('#ff2a4a', 0.25); shake(8); NC.audio.sfx('hurt'); NC.buzz(60, 0.7);
      burst(p.x, p.y, '#ff4f8b', 16, 260);
      R.combo = Math.max(1, Math.floor(R.combo / 2));
    }
    p.inv = 0.55;
    if (dmg > 0) pop(p.x, p.y - 26, '-' + Math.round(dmg), '#ff4f8b', 14);
    if (p.hp <= 0) die();
    return true;
  }
  function die() {
    const R = G.run, p = R.p;
    p.alive = false; p.hp = 0; R.dying = 1.3;
    explode(p.x, p.y, R.st.ship.a, 40); explode(p.x, p.y, '#ff4f8b', 30); ring(p.x, p.y, '#ffffff', 300, 0.8, 5);
    flash('#ffffff', 0.5); R.hitstop = 0.15; NC.buzz(300, 1);
    NC.audio.sfx('over');
  }
  G.reviveCost = () => { const R = G.run; return Math.round(150 * (R.revives + 1) * (1 + 0.5 * (R.tier - 1))); };
  G.revive = () => {
    const R = G.run, cost = G.reviveCost();
    if (!R || R.revives >= 3 || NC.save.credits < cost) return false;
    NC.save.credits -= cost; R.revives++; NC.save.stats.revives++;
    const p = R.p; p.alive = true; p.hp = R.maxHp * 0.6; p.shd = R.maxShd; p.inv = 3; p.vx = p.vy = 0;
    R.ebullets.length = 0; R.beams.length = 0; R.mines.length = 0;
    for (const e of R.enemies) { const d = Math.hypot(e.x - p.x, e.y - p.y) || 1; if (d < 260) { e.vx = (e.x - p.x) / d * 400; e.vy = (e.y - p.y) / d * 400; } }
    ring(p.x, p.y, '#5ef0ff', 320, 0.8, 5); burst(p.x, p.y, '#5ef0ff', 40, 380); flash('#5ef0ff', 0.4);
    NC.audio.sfx('revive'); NC.persist();
    G.mode = 'play'; NC.music.set(R.boss ? 'boss' : 'game');
    return true;
  };
  G.giveUp = () => endRun();

  function useSuper() {
    const R = G.run, p = R.p;
    if (R.p.superC < 100 || !p.alive) return;
    p.superC = 0;
    const E = eff(), rad = 420;
    ring(p.x, p.y, '#ffd65e', rad, 0.7, 6); ring(p.x, p.y, '#ffffff', rad * 0.7, 0.5, 3);
    burst(p.x, p.y, '#ffd65e', 60, 500, 4); flash('#ffd65e', 0.45); shake(12); R.hitstop = 0.08;
    R.ebullets = R.ebullets.filter(b => (b.x - p.x) ** 2 + (b.y - p.y) ** 2 > rad * rad);
    for (const o of R.orbs) if ((o.x - p.x) ** 2 + (o.y - p.y) ** 2 < rad * rad) o.hp = 0;
    for (const e of R.enemies) if (!e.dead && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < rad * rad) hitEnemy(e, E.atk * 8, true);
    if (R.boss && Math.hypot(R.boss.x - p.x, R.boss.y - p.y) < rad + R.boss.r) hitBoss(E.atk * 14, true);
    p.inv = Math.max(p.inv, 0.6);
    NC.audio.sfx('super'); NC.buzz(150, 1);
  }

  // ---------- cards ----------
  G.cardChoices = () => {
    const R = G.run, avail = NC.CARDS.filter(c => (R.cards[c.id] || 0) < c.max), out = [];
    while (out.length < 3 && avail.length) { const c = NC.weighted(avail.map(c => [c, c.w])); out.push(c); avail.splice(avail.indexOf(c), 1); }
    return out;
  };
  G.pickCard = (id) => {
    const R = G.run, m = R.m; R.cards[id] = (R.cards[id] || 0) + 1;
    switch (id) {
      case 'dmg': m.dmg += 0.15; break;
      case 'rate': m.rate += 0.15; break;
      case 'gun': m.guns++; break;
      case 'pierce': m.pierce = true; break;
      case 'bounce': m.bounce++; break;
      case 'missile': m.missile++; break;
      case 'orbit': m.orbit++; break;
      case 'shield': m.shd += 0.3; m.shdRegen += 0.25; applyMaxes(); R.p.shd = R.maxShd; break;
      case 'heal': m.hp += 0.1; applyMaxes(); R.p.hp = Math.min(R.maxHp, R.p.hp + R.maxHp * 0.4); break;
      case 'magnet': m.magnet += 90; break;
      case 'speed': m.speed += 0.1; m.dashCd *= 0.85; break;
      case 'crit': m.crit += 0.1; break;
      case 'vamp': m.vamp++; break;
    }
    NC.audio.sfx('card');
    R.pendingCards = Math.max(0, R.pendingCards - 1);
    if (R.pendingCards > 0) { NC.ui.showCards(G.cardChoices()); return; }
    G.mode = 'play'; R.p.inv = Math.max(R.p.inv, 0.8);
  };

  // ---------- supernova capsule ----------
  const NOVA = [
    { id: 'nova', name: 'NOVA', sub: 'sectorul a fost curățat' },
    { id: 'over', name: 'OVERDRIVE', sub: '+2 tunuri și foc dublu, 10 secunde' },
    { id: 'gold', name: 'PLOAIE DE AUR', sub: 'stele de aur peste tot' },
    { id: 'hyper', name: 'HIPERSCUT', sub: 'invulnerabil 8 secunde, distrugi tot ce atingi' },
    { id: 'cash', name: 'COMOARĂ', sub: 'cristale bonus' },
    { id: 'card', name: 'TEHNOLOGIE ANTICĂ', sub: 'alege un upgrade gratuit' },
  ];
  function supernova(x, y) {
    const R = G.run, b = pick(NOVA);
    banner(b.name, b.sub, '#ffd65e');
    ring(x, y, '#ffd65e', Math.max(G.W, G.H), 1.1, 6); burst(x, y, '#ffd65e', 50, 420, 4); flash('#ffd65e', 0.3);
    NC.audio.sfx('legend');
    if (b.id === 'nova') { for (const e of R.enemies) if (!e.dead && !e.leaving) killEnemy(e); R.ebullets.length = 0; }
    if (b.id === 'over') R.over = 10;
    if (b.id === 'gold') for (let i = 0; i < 22; i++) spawnStar(true);
    if (b.id === 'hyper') R.hyper = 8;
    if (b.id === 'cash') dropCrystals(x, y, 150 * NC.tierMult(R.tier).cr * R.st.crMult);
    if (b.id === 'card') R.pendingCards++;
  }

  // =====================================================================
  // BOSS
  // =====================================================================
  function startBossIntro() {
    const R = G.run;
    R.bossIntro = 2.8;
    for (const e of R.enemies) e.leaving = 0.6;
    R.ebullets.length = 0; R.beams.length = 0;
    const def = NC.BOSSES[R.bossIdx % NC.BOSSES.length];
    banner('⚠ AVERTISMENT ⚠', def.name + ' · ' + def.sub, def.col, 2.8);
    NC.audio.sfx('warn'); NC.music.set('boss');
    R.items = R.items.filter(i => i.kind !== 'capsule');
  }
  function spawnBoss() {
    const R = G.run, idx = R.bossIdx, def = NC.BOSSES[idx % NC.BOSSES.length], hp = NC.bossHp(idx);
    R.boss = { def, idx, x: G.W / 2, y: -120, r: 54, hp, max: hp, state: 'enter', phase: 0, step: 0, t: 0, cool: 1.2, atk: null, flash: 0, tx: G.W / 2, ty: G.bossTop + 60, ang: Math.PI / 2, inv: 0, lvl: R.tier, alpha: 1 };
    NC.audio.sfx('boss'); shake(10);
    NC.ui.showBossBar(def, hp);
  }
  function lead(sx, sy, speed) {
    const p = G.run.p; let tx = p.x, ty = p.y;
    for (let i = 0; i < 2; i++) { const t = Math.min(1.1, Math.hypot(tx - sx, ty - sy) / speed); tx = p.x + p.vx * t; ty = p.y + p.vy * t; }
    return { x: clamp(tx, 10, G.W - 10), y: clamp(ty, 10, G.H - 10) };
  }
  function eshoot(x, y, ang, sp, dmg, col, r = 6, o = {}) { G.run.ebullets.push(Object.assign({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r, dmg, col, life: 8 }, o)); }
  function bossReposition(b) {
    const p = G.run.p, pref = Math.min(G.W, G.H) * 0.45;
    let best = null, bs = -1e9;
    for (let i = 0; i < 10; i++) {
      const x = rnd(110, G.W - 110), y = rnd(G.bossTop + 50, Math.max(G.bossTop + 60, G.H * 0.55));
      const d = Math.hypot(x - p.x, y - p.y), score = -Math.abs(d - pref) - Math.hypot(x - b.x, y - b.y) * 0.25;
      if (score > bs) { bs = score; best = { x, y }; }
    }
    b.tx = best.x; b.ty = best.y;
  }
  function bossStartAttack(b) {
    const list = b.def.phases[b.phase], name = list[b.step % list.length]; b.step++;
    const ph = b.phase, p = G.run.p;
    const A = b.atk = { name, t: 0, n: 0 };
    switch (name) {
      case 'aimed': A.volleys = 3 + ph; A.next = 0.45; break;
      case 'gapRing': A.rings = ph >= 1 ? 2 : 1; A.next = 0.7; NC.audio.sfx('beamCharge'); break;
      case 'sweep': {
        const pa = Math.atan2(p.y - b.y, p.x - b.x), side = Math.random() < 0.5 ? -1 : 1;
        A.side = side; A.a0 = pa - side * 1.0; A.span = 2.0; A.charge = 1.0 - ph * 0.1; A.dur = 1.9 - ph * 0.15;
        G.run.beams.push(A.beam = { x: b.x, y: b.y, ang: A.a0, len: 2400, w: 26 + ph * 6, charge: A.charge, fire: A.dur, t: 0, dmg: 55 * NC.tierMult(b.lvl).dmg, owner: 'boss', col: b.def.col, tick: 0 });
        NC.audio.sfx('beamCharge'); break;
      }
      case 'mines': {
        const c = lead(b.x, b.y, 300), n = 5 + ph * 2;
        for (let i = 0; i < n; i++) { const a = i / n * TAU + rnd(-0.2, 0.2), d = i === 0 ? 0 : rnd(90, 190); G.run.mines.push({ x: clamp(c.x + Math.cos(a) * d, 30, G.W - 30), y: clamp(c.y + Math.sin(a) * d, 30, G.H - 30), t: 0, arm: 1.3 + i * 0.07, r: 72, dmg: 40 * NC.tierMult(b.lvl).dmg, col: b.def.col }); }
        A.dur = 1.6; break;
      }
      case 'ram': { const c = lead(b.x, b.y, 900); A.tx = c.x; A.ty = c.y; A.tele = 0.85 - ph * 0.1; A.ang = Math.atan2(c.y - b.y, c.x - b.x); break; }
      case 'spiral': A.dur = 2.6 + ph * 0.4; A.arms = 3 + (ph >= 2 ? 1 : 0); A.rot = rnd(0, TAU); A.next = 0; A.dir = Math.random() < 0.5 ? -1 : 1; break;
      case 'orbs': A.count = 3 + ph; A.next = 0.3; break;
      case 'blink': {
        const ang = Math.atan2(b.y - p.y, b.x - p.x) + Math.PI + rnd(-0.6, 0.6), d = Math.min(G.W, G.H) * 0.42;
        A.nx = clamp(p.x + Math.cos(ang) * d, 100, G.W - 100); A.ny = clamp(p.y + Math.sin(ang) * d, G.bossTop + 40, G.H - 100); A.dur = 0.7; break;
      }
    }
  }
  function updateBoss(dt) {
    const R = G.run, b = R.boss, p = R.p, tm = NC.tierMult(b.lvl);
    b.t += dt; b.flash = Math.max(0, b.flash - dt); b.inv = Math.max(0, b.inv - dt);
    const ease = (k) => { b.x += (b.tx - b.x) * Math.min(1, dt * k); b.y += (b.ty - b.y) * Math.min(1, dt * k); };
    if (b.state === 'enter') { ease(1.6); if (Math.abs(b.y - b.ty) < 6) { b.state = 'idle'; b.cool = 0.8; } return; }
    // phase change
    const ph = b.hp / b.max > 0.66 ? 0 : b.hp / b.max > 0.33 ? 1 : 2;
    if (ph > b.phase) {
      b.phase = ph; b.step = 0; b.atk = null; b.state = 'idle'; b.cool = 1.4; b.inv = 1.2; b.hidden = false; b.alpha = 1;
      R.ebullets.length = 0; R.beams = R.beams.filter(x => x.owner !== 'boss');
      ring(b.x, b.y, b.def.col, 500, 0.8, 6); flash(b.def.col, 0.35); shake(12); R.hitstop = 0.1;
      banner('FAZA ' + (ph + 1), ph === 2 ? 'boss-ul e furios' : 'atacuri noi', b.def.col, 1.8);
      const d = Math.hypot(p.x - b.x, p.y - b.y) || 1; if (d < 260) { p.vx = (p.x - b.x) / d * 700; p.vy = (p.y - b.y) / d * 700; }
      NC.audio.sfx('boss');
    }
    if (b.state === 'idle') {
      ease(2.2);
      b.cool -= dt;
      if (b.cool <= 0) { b.state = 'attack'; bossStartAttack(b); }
    } else {
      const A = b.atk; A.t += dt;
      let done = false;
      switch (A.name) {
        case 'aimed': {
          ease(1);
          A.next -= dt;
          if (A.next <= 0) {
            const sp = 300 + b.phase * 40, guns = [[-b.r * 0.85, 10], [b.r * 0.85, 10]];
            for (const [ox, oy] of guns) {
              const sx = b.x + ox, sy = b.y + oy, t = lead(sx, sy, sp), a = Math.atan2(t.y - sy, t.x - sx);
              for (let i = -2; i <= 2; i++) eshoot(sx, sy, a + i * 0.09, sp, 14 * tm.dmg, b.def.col2, 6);
            }
            NC.audio.sfx('eshoot'); A.n++; A.next = 0.55 - b.phase * 0.07;
            if (A.n >= A.volleys) done = true;
          }
          break;
        }
        case 'gapRing': {
          A.next -= dt;
          if (A.next <= 0) {
            const n = 34 + b.phase * 6, pa = Math.atan2(p.y - b.y, p.x - b.x);
            const gap = pa + (A.n % 2 ? -1 : 1) * Math.PI / 2 * rnd(0.8, 1.1), gw = 0.42 - b.phase * 0.04;
            for (let i = 0; i < n; i++) { const a = i / n * TAU; if (Math.abs(NC.angDiff(a, gap)) < gw) continue; eshoot(b.x, b.y, a, 175 + b.phase * 20, 15 * tm.dmg, b.def.col, 6.5); }
            ring(b.x, b.y, b.def.col, 140, 0.4, 3); NC.audio.sfx('eshoot');
            A.n++; A.next = 0.75;
            if (A.n >= A.rings) done = true;
          }
          break;
        }
        case 'sweep': {
          const bm = A.beam; bm.x = b.x; bm.y = b.y;
          if (bm.t >= bm.charge) { const k = clamp((bm.t - bm.charge) / bm.fire, 0, 1); bm.ang = A.a0 + A.side * A.span * (k * k * (3 - 2 * k)); }
          if (bm.t >= bm.charge + bm.fire) done = true;
          break;
        }
        case 'mines': ease(1); if (A.t >= A.dur) done = true; break;
        case 'ram': {
          if (A.t < A.tele) { b.x += Math.sin(A.t * 60) * 1.2; }
          else {
            if (!A.go) { A.go = true; A.vx = Math.cos(A.ang) * 950; A.vy = Math.sin(A.ang) * 950; NC.audio.sfx('dash'); }
            b.x += A.vx * dt; b.y += A.vy * dt;
            if (Math.random() < 0.6) burst(b.x - A.vx * 0.03, b.y - A.vy * 0.03, b.def.col, 2, 80, 3, 0.4);
            if (b.phase >= 2 && (A.sp = (A.sp || 0) - dt) <= 0) { A.sp = 0.08; for (const s of [-1, 1]) eshoot(b.x, b.y, A.ang + s * Math.PI / 2, 150, 12 * tm.dmg, b.def.col2, 5); }
            if (b.x < b.r * 0.6 || b.x > G.W - b.r * 0.6 || b.y < b.r * 0.6 || b.y > G.H - b.r * 0.6 || A.t > A.tele + 1.4) {
              b.x = clamp(b.x, b.r, G.W - b.r); b.y = clamp(b.y, b.r, G.H - b.r);
              ring(b.x, b.y, b.def.col, 160, 0.5, 4); shake(10); done = true;
            }
          }
          break;
        }
        case 'spiral': {
          A.next -= dt; A.rot += dt * 2.1 * A.dir;
          if (A.next <= 0) { for (let i = 0; i < A.arms; i++) eshoot(b.x, b.y, A.rot + i / A.arms * TAU, 165, 12 * tm.dmg, b.def.col2, 5.5); A.next = 0.085; if (Math.random() < 0.3) NC.audio.sfx('eshoot'); }
          if (A.t >= A.dur) done = true;
          break;
        }
        case 'orbs': {
          A.next -= dt;
          if (A.next <= 0 && A.n < A.count) {
            const a = rnd(0, TAU);
            R.orbs.push({ x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, r: 12, hp: eff().atk * 3, max: eff().atk * 3, life: 6.5, dmg: 24 * tm.dmg, col: b.def.col2, t: 0, flash: 0 });
            A.n++; A.next = 0.32;
          }
          if (A.n >= A.count && A.t > 1.2) done = true;
          break;
        }
        case 'blink': {
          const k = A.t / A.dur;
          if (k < 0.5) { b.alpha = 1 - k * 2; b.hidden = k > 0.35; }
          else { if (!A.moved) { A.moved = true; b.x = A.nx; b.y = A.ny; b.tx = b.x; b.ty = b.y; ring(b.x, b.y, b.def.col, 120, 0.4, 3); } b.alpha = (k - 0.5) * 2; b.hidden = false; }
          if (A.t >= A.dur) {
            b.alpha = 1; b.hidden = false;
            const n = 22, pa = Math.atan2(p.y - b.y, p.x - b.x);
            for (let i = 0; i < n; i++) { const a = i / n * TAU; if (Math.abs(NC.angDiff(a, pa + Math.PI)) < 0.5) continue; eshoot(b.x, b.y, a, 190, 14 * tm.dmg, b.def.col, 6); }
            done = true;
          }
          break;
        }
      }
      if (done) { b.state = 'idle'; b.atk = null; b.cool = [1.25, 1.0, 0.8][b.phase] + rnd(0, 0.3); bossReposition(b); }
    }
    b.x = clamp(b.x, b.r * 0.5, G.W - b.r * 0.5); b.y = clamp(b.y, b.r * 0.5, G.H - b.r * 0.5);
    // contact damage
    if (!b.hidden && (p.x - b.x) ** 2 + (p.y - b.y) ** 2 < (b.r * 0.85 + p.r) ** 2) {
      damagePlayer(32 * tm.dmg);
      const d = Math.hypot(p.x - b.x, p.y - b.y) || 1; p.vx = (p.x - b.x) / d * 600; p.vy = (p.y - b.y) / d * 600;
    }
  }
  function hitBoss(dmg, crit, x, y) {
    const R = G.run, b = R.boss; if (!b || b.inv > 0 || b.hidden || b.state === 'enter') return;
    b.hp -= dmg; b.flash = 0.05;
    dmgNum(x != null ? x : b.x, y != null ? y : b.y - b.r, dmg, crit);
    R.p.superC = Math.min(100, R.p.superC + dmg / b.max * 25);
    if (b.hp <= 0) killBoss();
  }
  function killBoss() {
    const R = G.run, b = R.boss, tm = NC.tierMult(R.tier), idx = b.idx;
    for (let i = 0; i < 8; i++) setTimeout(() => { if (G.run === R) explode(b.x + rnd(-b.r, b.r), b.y + rnd(-b.r * 0.6, b.r * 0.6), i % 2 ? b.def.col : b.def.col2, 34); }, i * 110);
    ring(b.x, b.y, '#ffffff', 600, 1, 8); flash('#ffffff', 0.6); R.hitstop = 0.2; shake(16);
    R.ebullets.length = 0; R.beams.length = 0; R.mines.length = 0; R.orbs.length = 0;
    R.combo = Math.min(15, R.combo + 3);
    addScore(2000 * (idx + 1), b.x, b.y);
    dropCrystals(b.x, b.y, 280 * (idx + 1) * tm.cr * R.st.crMult);
    addXp(150 * (idx + 1) * tm.xp);
    dropChest(b.x, b.y, idx >= 6 ? 'legend' : idx % 3 === 2 ? 'epic' : 'rare');
    R.p.hp = Math.min(R.maxHp, R.p.hp + R.maxHp * 0.5); R.p.shd = R.maxShd;
    NC.save.stats.bosses++;
    banner(b.def.name + ' DISTRUS', 'cufăr eliberat · +50% viață', '#ffd65e', 3);
    R.boss = null; R.bossIdx++; R.nextBoss = NC.bossThreshold(R.bossIdx); R.spawnT = 2.5;
    NC.ui.hideBossBar(); NC.music.set('game'); NC.audio.sfx('legend');
    NC.persist();
  }

  // =====================================================================
  // UPDATE
  // =====================================================================
  function update(dt) {
    const R = G.run, p = R.p, I = NC.Input, E = eff();
    R.time += dt; NC.save.stats.playtime += dt;
    const tierNow = NC.tierOf(R.score);
    if (tierNow > R.tier) {
      R.tier = tierNow; const tm = NC.tierMult(R.tier);
      banner('SECTOR ' + R.tier, 'inamici nivel ' + R.tier + ' · cristale +' + Math.round((tm.cr - 1) * 100) + '%', '#5ef0ff', 2.6);
      NC.audio.sfx('level');
    }
    for (const [k, d] of Object.entries(NC.ENEMIES)) if (d.unlock <= R.score && !R.announced.has(k)) { R.announced.add(k); if (!R.boss && !R.bossIntro) banner('AMENINȚARE NOUĂ: ' + d.name.toUpperCase(), d.desc, d.col); }

    // ----- player movement -----
    if (p.alive) {
      const maxV = 430 * E.speed;
      if (p.dashT > 0) p.dashT -= dt;
      else {
        let tx = 0, ty = 0;
        if (I.move.x || I.move.y) { tx = I.move.x * maxV; ty = I.move.y * maxV; }
        else if (I.mouse && NC.save.settings.ctrl !== 'touch' && NC.save.settings.ctrl !== 'gamepad') {
          const m = G.toWorld(I.mouse.x, I.mouse.y); tx = (m.x - p.x) * 7; ty = (m.y - p.y) * 7;
          const mm = Math.hypot(tx, ty); if (mm > maxV) { tx *= maxV / mm; ty *= maxV / mm; }
        }
        const k = Math.min(1, dt * 9); p.vx += (tx - p.vx) * k; p.vy += (ty - p.vy) * k;
      }
      p.x = clamp(p.x + p.vx * dt, p.r, G.W - p.r); p.y = clamp(p.y + p.vy * dt, p.r, G.H - p.r);
      // aim
      const mode = NC.save.settings.aim || (['touch', 'gamepad'].includes(NC.save.settings.ctrl) ? 'auto' : 'forward');
      let ta = null;
      if (I.aim.on) ta = Math.atan2(I.aim.y, I.aim.x);
      else if (mode === 'auto') { const t = nearestEnemy(p.x, p.y, 640); if (t) ta = Math.atan2(t.y - p.y, t.x - p.x); }
      if (ta == null && Math.hypot(p.vx, p.vy) > 40) ta = Math.atan2(p.vy, p.vx);
      if (ta != null && p.dashT <= 0) p.ang += NC.angDiff(p.ang, ta) * Math.min(1, dt * 14);
      // dash / super
      if (I.take('dash') && p.dashCd <= 0) {
        let dx = I.move.x, dy = I.move.y; if (!dx && !dy) { dx = Math.cos(p.ang); dy = Math.sin(p.ang); }
        const m = Math.hypot(dx, dy) || 1; p.vx = dx / m * 980; p.vy = dy / m * 980; p.dashT = 0.22; p.dashCd = E.dashCd;
        burst(p.x, p.y, R.st.ship.a, 16, 240); NC.audio.sfx('dash'); NC.buzz(20, 0.3);
      }
      if (I.take('super')) useSuper();
      p.inv = Math.max(0, p.inv - dt); p.dashCd = Math.max(0, p.dashCd - dt); p.hurtT = Math.max(0, p.hurtT - dt);
      // shield regen
      p.shdT -= dt;
      if (p.shdT <= 0 && p.shd < R.maxShd) p.shd = Math.min(R.maxShd, p.shd + R.maxShd * 0.22 * R.st.regen * R.m.shdRegen * dt);
      // engine
      if (Math.random() < Q().parts / 1000) {
        const bx = p.x - Math.cos(p.ang) * 16, by = p.y - Math.sin(p.ang) * 16;
        R.parts.push({ x: bx, y: by, vx: -Math.cos(p.ang) * rnd(60, 150) + rnd(-20, 20), vy: -Math.sin(p.ang) * rnd(60, 150) + rnd(-20, 20), life: 0.32, max: 0.32, col: R.st.ship.a, r: rnd(1.5, 2.6), kind: 0 });
      }
      // fire
      p.fireT -= dt;
      if (p.fireT <= 0) { fireMain(E); p.fireT = 0.25 / E.rate; }
    }
    R.over = Math.max(0, R.over - dt); R.hyper = Math.max(0, R.hyper - dt);

    // ----- companion -----
    if (R.comp) {
      const c = R.comp, ox = p.x - Math.cos(p.ang) * 34 - Math.sin(p.ang) * 30, oy = p.y - Math.sin(p.ang) * 34 + Math.cos(p.ang) * 30;
      c.x += (ox - c.x) * Math.min(1, dt * 6); c.y += (oy - c.y) * Math.min(1, dt * 6);
      c.ang += NC.angDiff(c.ang, p.ang) * Math.min(1, dt * 10);
    }
    // ----- drones -----
    const T = R.st.turret;
    if (T) for (let i = 0; i < R.drones.length; i++) {
      const d = R.drones[i]; d.a += dt * 2.2;
      d.x = p.x + Math.cos(d.a) * 44; d.y = p.y + Math.sin(d.a) * 44;
      d.fireT -= dt;
      if (d.fireT > 0 || !p.alive) continue;
      const t = nearestEnemy(d.x, d.y, 560);
      if (!t) { d.fireT = 0.12; continue; }
      const dmg = E.atk * T.dmg * NC.turretLvlMult(R.st.turretLvl), a = Math.atan2(t.y - d.y, t.x - d.x);
      if (T.kind === 'laser') addBullet(d.x, d.y, a, 760, dmg, { col: T.col, w: 0.7, owner: 'd' });
      else if (T.kind === 'missile') addBullet(d.x, d.y, a + rnd(-0.5, 0.5), 380, dmg, { col: T.col, w: 1.2, missile: true, homing: 6, target: t, life: 2.5, aoe: 55, owner: 'd' });
      else if (T.kind === 'chain') chain(d.x, d.y, t, dmg, 3, T.col);
      d.fireT = 1 / T.rate;
    }
    // ----- card: missiles -----
    if (R.m.missile && p.alive) {
      R.missileT -= dt;
      if (R.missileT <= 0) {
        for (let i = 0; i < R.m.missile; i++) { const t = nearestEnemy(p.x, p.y, 700); if (!t) break; addBullet(p.x, p.y, p.ang + Math.PI + rnd(-1, 1), 300, E.atk * 1.6, { col: '#ff8a3d', w: 1.2, missile: true, homing: 7, target: t, life: 2.8, aoe: 60, owner: 'p' }); }
        R.missileT = 2;
      }
    }
    // ----- card: orbit blades -----
    if (R.m.orbit && p.alive) {
      R.orbitA += dt * 3.2;
      for (let i = 0; i < R.m.orbit; i++) {
        const a = R.orbitA + i / R.m.orbit * TAU, bx = p.x + Math.cos(a) * 70, by = p.y + Math.sin(a) * 70;
        for (const e of R.enemies) if (!e.dead && e.warm <= 0 && !e.leaving && (e.ocd || 0) <= R.time && (e.x - bx) ** 2 + (e.y - by) ** 2 < (e.r + 12) ** 2) { e.ocd = R.time + 0.35; hitEnemy(e, E.atk * 0.7, false); }
        for (const o of R.orbs) if ((o.x - bx) ** 2 + (o.y - by) ** 2 < (o.r + 12) ** 2) o.hp -= E.atk * 0.7 * dt * 3;
        for (const eb of R.ebullets) if ((eb.x - bx) ** 2 + (eb.y - by) ** 2 < 14 * 14) eb.dead = true;
      }
    }

    // ----- combo -----
    if (R.comboT > 0) { R.comboT -= dt; if (R.comboT <= 0) R.combo = 1; }

    // ----- boss / spawn director -----
    if (!R.boss && !R.bossIntro && R.score >= R.nextBoss) startBossIntro();
    if (R.bossIntro > 0) { R.bossIntro -= dt; if (R.bossIntro <= 0) { R.bossIntro = 0; spawnBoss(); } }
    if (R.boss) updateBoss(dt);
    if (!R.boss && !R.bossIntro) {
      const tm = NC.tierMult(R.tier), frac = (R.score % NC.TIER_SIZE) / NC.TIER_SIZE;
      R.spawnT -= dt;
      const live = R.enemies.filter(e => !e.dead && !e.leaving && e.type !== 'mini' && e.type !== 'shard').length;
      if (R.spawnT <= 0 && live < tm.maxE + Math.floor(frac * 3)) { spawnEnemy(pickType()); R.spawnT = tm.spawn * (1 - frac * 0.12) * rnd(0.8, 1.2); }
    }
    const starTarget = R.boss ? 2 : 3 + Math.min(3, R.tier - 1);
    if (R.stars.filter(s => !s.gold).length < starTarget) spawnStar();

    // ----- periodic pickups -----
    R.pickT -= dt;
    if (R.pickT <= 0) { if (p.hp < R.maxHp * 0.85) R.items.push({ kind: 'hp', ...safeSpot(120), vx: 0, vy: 0, t: 0, r: 13, life: 10 }); R.pickT = rnd(22, 32); }
    if (!R.boss && !R.bossIntro) {
      R.capT -= dt;
      if (R.capT <= 0) {
        const left = Math.random() < 0.5;
        R.items.push({ kind: 'capsule', x: left ? -30 : G.W + 30, y: rnd(G.H * 0.25, G.H * 0.75), vx: left ? 75 : -75, vy: 0, t: 0, r: 20 });
        banner('CAPSULĂ SUPERNOVA', 'prinde-o înainte să iasă din ecran', '#ffd65e', 2.4); NC.audio.sfx('pickup', 10); R.capT = 55;
      }
    }

    // ----- stars -----
    const mag = E.magnet;
    for (const s of R.stars) {
      s.t += dt; s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= Math.pow(0.05, dt); s.vy *= Math.pow(0.05, dt);
      const dd = (s.x - p.x) ** 2 + (s.y - p.y) ** 2;
      if (p.alive && dd < mag * mag) { const d = Math.sqrt(dd) || 1; s.x += (p.x - s.x) / d * 360 * dt; s.y += (p.y - s.y) / d * 360 * dt; }
      if (p.alive && dd < (s.r + p.r + 8) ** 2) {
        s.dead = true; bumpCombo(); addScore(s.gold ? 30 : 12, s.x, s.y - 10); addXp(s.gold ? 2 : 1);
        p.superC = Math.min(100, p.superC + 1.2);
        burst(s.x, s.y, '#ffd65e', 9, 170, 2.5, 0.5); NC.audio.sfx('pickup', R.combo);
      }
    }
    R.stars = R.stars.filter(s => !s.dead);

    // ----- items -----
    for (const it of R.items) {
      it.t += dt; it.x += it.vx * dt; it.y += it.vy * dt;
      if (it.kind === 'cr') {
        it.vx *= Math.pow(0.02, dt); it.vy *= Math.pow(0.02, dt);
        if (it.t > 0.35 && p.alive) { const d = Math.hypot(p.x - it.x, p.y - it.y) || 1, sp = 500 + it.t * 500; it.x += (p.x - it.x) / d * sp * dt; it.y += (p.y - it.y) / d * sp * dt; }
      } else if (it.kind === 'chest') { it.vy *= Math.pow(0.1, dt); if (it.t > 0.8 && p.alive) { const d = Math.hypot(p.x - it.x, p.y - it.y) || 1; it.x += (p.x - it.x) / d * 260 * dt; it.y += (p.y - it.y) / d * 260 * dt; } }
      else if (it.kind === 'capsule') { it.y += Math.sin(it.t * 2) * 30 * dt; if (it.x < -70 || it.x > G.W + 70) it.dead = true; }
      else { it.life -= dt; if (it.life <= 0) it.dead = true; }
      if (!it.dead && p.alive && (it.x - p.x) ** 2 + (it.y - p.y) ** 2 < (it.r + p.r + 6) ** 2) {
        it.dead = true;
        if (it.kind === 'cr') { const v = Math.max(1, Math.round(it.v)); NC.save.credits += v; R.crRun += v; NC.save.stats.crEarned += v; NC.audio.sfx('crystal'); }
        if (it.kind === 'hp') { p.hp = Math.min(R.maxHp, p.hp + R.maxHp * 0.3); pop(p.x, p.y - 24, '+VIAȚĂ', '#7dff9a', 14); NC.audio.sfx('card'); burst(it.x, it.y, '#7dff9a', 14, 200); }
        if (it.kind === 'chest') { NC.save.chests[it.id]++; NC.save.stats.chests++; R.chestsFound.push(it.id); const c = NC.CHESTS.find(c => c.id === it.id); banner(c.name.toUpperCase() + ' GĂSIT', 'îl deschizi din meniul Cufere', c.col, 2.4); NC.audio.sfx('chest'); burst(it.x, it.y, c.col, 30, 280); NC.persist(); }
        if (it.kind === 'capsule') supernova(it.x, it.y);
      }
    }
    R.items = R.items.filter(i => !i.dead);

    // ----- enemies -----
    for (const e of R.enemies) {
      if (e.dead) continue;
      if (e.leaving) { e.leaving -= dt; if (e.leaving <= 0) { e.dead = true; burst(e.x, e.y, e.d.col, 10, 200, 2, 0.5); ring(e.x, e.y, e.d.col, 40, 0.3, 2); } continue; }
      e.t += dt; e.flash = Math.max(0, e.flash - dt); e.warm = Math.max(0, e.warm - dt);
      updateEnemy(e, dt);
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.x < e.r || e.x > G.W - e.r) { e.vx *= -1; e.x = clamp(e.x, e.r, G.W - e.r); }
      if (e.y < e.r || e.y > G.H - e.r) { e.vy *= -1; e.y = clamp(e.y, e.r, G.H - e.r); }
      if (e.warm > 0 || !p.alive) continue;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (e.r + p.r - 3) ** 2) {
        if (R.hyper > 0 || p.dashT > 0) hitEnemy(e, Math.max(E.atk * 4, e.max * 0.5), true);
        else if (p.inv <= 0) { damagePlayer(e.dmg); hitEnemy(e, e.max * 0.3, false); const d = Math.hypot(e.x - p.x, e.y - p.y) || 1; e.vx = (e.x - p.x) / d * 260; e.vy = (e.y - p.y) / d * 260; }
      }
    }
    R.enemies = R.enemies.filter(e => !e.dead);

    // ----- boss orbs -----
    for (const o of R.orbs) {
      o.t += dt; o.life -= dt; o.flash = Math.max(0, o.flash - dt);
      const a = Math.atan2(p.y - o.y, p.x - o.x), sp = 125 + o.t * 8;
      const cur = Math.atan2(o.vy, o.vx), na = cur + clamp(NC.angDiff(cur, a), -1.6 * dt, 1.6 * dt);
      o.vx = Math.cos(na) * sp; o.vy = Math.sin(na) * sp; o.x += o.vx * dt; o.y += o.vy * dt;
      if (o.hp <= 0) { o.dead = true; explode(o.x, o.y, o.col, 14); dropCrystals(o.x, o.y, 4 * NC.tierMult(R.tier).cr); continue; }
      if (o.life <= 0) { o.dead = true; burst(o.x, o.y, o.col, 10, 150); continue; }
      if (p.alive && (o.x - p.x) ** 2 + (o.y - p.y) ** 2 < (o.r + p.r) ** 2) { o.dead = true; explode(o.x, o.y, o.col, 18); damagePlayer(o.dmg); }
    }
    R.orbs = R.orbs.filter(o => !o.dead);

    // ----- mines -----
    for (const m of R.mines) {
      m.t += dt;
      if (m.t >= m.arm) {
        m.dead = true; explode(m.x, m.y, m.col, 26); ring(m.x, m.y, m.col, m.r, 0.35, 4);
        if (p.alive && (m.x - p.x) ** 2 + (m.y - p.y) ** 2 < (m.r + p.r * 0.5) ** 2) damagePlayer(m.dmg);
      }
    }
    R.mines = R.mines.filter(m => !m.dead);

    // ----- beams (boss + sentinels) -----
    for (const bm of R.beams) {
      bm.t += dt;
      if (bm.owner !== 'boss' && bm.src) { bm.x = bm.src.x; bm.y = bm.src.y; if (bm.src.dead) { bm.dead = true; continue; } if (bm.t < bm.charge - 0.3) bm.ang = Math.atan2(p.y - bm.y, p.x - bm.x); }
      if (bm.t >= bm.charge && !bm.fired) { bm.fired = true; NC.audio.sfx('beam'); shake(4); }
      if (bm.t >= bm.charge && bm.t < bm.charge + bm.fire && p.alive) {
        bm.tick -= dt;
        const dx = Math.cos(bm.ang), dy = Math.sin(bm.ang), px = p.x - bm.x, py = p.y - bm.y, along = px * dx + py * dy;
        if (along > 0 && along < bm.len && Math.abs(px * dy - py * dx) < bm.w / 2 + p.r * 0.6 && bm.tick <= 0) { if (damagePlayer(bm.dmg * 0.25)) bm.tick = 0.12; }
      }
      if (bm.t >= bm.charge + bm.fire) bm.dead = true;
    }
    R.beams = R.beams.filter(b => !b.dead);

    // ----- player bullets -----
    for (const bl of R.bullets) {
      if (bl.homing && bl.target && !bl.target.dead && !(bl.target.hidden)) {
        const a = Math.atan2(bl.target.y - bl.y, bl.target.x - bl.x), cur = Math.atan2(bl.vy, bl.vx), sp = Math.hypot(bl.vx, bl.vy) + (bl.missile ? 500 * dt : 0);
        const na = cur + clamp(NC.angDiff(cur, a), -bl.homing * dt, bl.homing * dt);
        bl.vx = Math.cos(na) * Math.min(sp, 900); bl.vy = Math.sin(na) * Math.min(sp, 900);
      } else if (bl.missile && (!bl.target || bl.target.dead)) bl.target = nearestEnemy(bl.x, bl.y, 600);
      if (bl.missile && Math.random() < Q().parts / 1500) R.parts.push({ x: bl.x, y: bl.y, vx: rnd(-20, 20), vy: rnd(-20, 20), life: 0.35, max: 0.35, col: '#ffb070', r: 2, kind: 0 });
      bl.x += bl.vx * dt; bl.y += bl.vy * dt; bl.life -= dt;
      if (bl.life <= 0 || bl.x < -30 || bl.x > G.W + 30 || bl.y < -30 || bl.y > G.H + 30) { bl.dead = true; continue; }
      for (const e of R.enemies) {
        if (e.dead || e.warm > 0 || e.leaving || (bl.hit && bl.hit.has(e))) continue;
        if ((bl.x - e.x) ** 2 + (bl.y - e.y) ** 2 < (e.r + 4) ** 2) {
          bulletHit(bl, e);
          if (bl.dead) break;
        }
      }
      if (bl.dead) continue;
      for (const o of R.orbs) if (!o.dead && (bl.x - o.x) ** 2 + (bl.y - o.y) ** 2 < (o.r + 4) ** 2) { o.hp -= bl.dmg; o.flash = 0.06; dmgNum(o.x, o.y - o.r, bl.dmg, bl.crit); bl.dead = true; burst(bl.x, bl.y, bl.col, 3, 90, 2, 0.3); break; }
      if (bl.dead) continue;
      const b = R.boss;
      if (b && !b.hidden && b.state !== 'enter' && (bl.x - b.x) ** 2 + ((bl.y - b.y) * 1.4) ** 2 < (b.r * 1.05) ** 2) {
        if (bl.aoe) aoe(bl, true);
        hitBoss(bl.dmg, bl.crit, bl.x, bl.y); bl.dead = true; burst(bl.x, bl.y, bl.col, 3, 100, 2, 0.3);
        if (b.inv > 0) ring(bl.x, bl.y, '#ffffff', 10, 0.15, 1);
      }
    }
    R.bullets = R.bullets.filter(b => !b.dead);

    // ----- enemy bullets -----
    for (const eb of R.ebullets) {
      eb.x += eb.vx * dt; eb.y += eb.vy * dt; eb.life -= dt;
      if (eb.dead || eb.life <= 0 || eb.x < -30 || eb.x > G.W + 30 || eb.y < -30 || eb.y > G.H + 30) { eb.dead = true; continue; }
      if (p.alive && (eb.x - p.x) ** 2 + (eb.y - p.y) ** 2 < (eb.r + p.r - 3) ** 2) {
        if (R.hyper > 0 || p.dashT > 0) { eb.dead = true; burst(eb.x, eb.y, '#9d7bff', 5, 120); }
        else if (damagePlayer(eb.dmg)) eb.dead = true;
      }
    }
    R.ebullets = R.ebullets.filter(b => !b.dead);

    // ----- lightning bolts (visual) -----
    for (const b of R.bolts) b.life -= dt;
    R.bolts = R.bolts.filter(b => b.life > 0);

    stepFx(dt);

    // cards
    if (R.pendingCards > 0 && p.alive && G.mode === 'play') { G.mode = 'cards'; NC.ui.showCards(G.cardChoices()); NC.audio.sfx('level'); }

    // autosave
    R.saveT -= dt; if (R.saveT <= 0) { R.saveT = 10; NC.persist(); }
  }

  function bulletHit(bl, e) {
    const R = G.run;
    if (bl.aoe) { aoe(bl); bl.dead = true; return; }
    hitEnemy(e, bl.dmg, bl.crit, bl.x, bl.y);
    burst(bl.x, bl.y, bl.col, 3, 100, 2, 0.3);
    if (bl.hit) bl.hit.add(e);
    if (bl.bounce > 0) {
      const t = nearestEnemy(bl.x, bl.y, 320, bl.hit);
      if (t) { bl.bounce--; const a = Math.atan2(t.y - bl.y, t.x - bl.x), sp = Math.hypot(bl.vx, bl.vy); bl.vx = Math.cos(a) * sp; bl.vy = Math.sin(a) * sp; bl.life = 0.8; return; }
    }
    if (!bl.pierce) bl.dead = true;
  }
  function aoe(bl, skipBoss) {
    const R = G.run;
    ring(bl.x, bl.y, '#ffb070', bl.aoe, 0.3, 3); burst(bl.x, bl.y, '#ff8a3d', 10, 160, 3, 0.5); NC.audio.sfx('explode', 0.4);
    for (const e of R.enemies) if (!e.dead && e.warm <= 0 && (e.x - bl.x) ** 2 + (e.y - bl.y) ** 2 < (bl.aoe + e.r) ** 2) hitEnemy(e, bl.dmg, bl.crit);
    if (!skipBoss && R.boss && Math.hypot(R.boss.x - bl.x, R.boss.y - bl.y) < bl.aoe + R.boss.r) hitBoss(bl.dmg * 0.5, bl.crit);
  }
  function chain(x, y, first, dmg, jumps, col) {
    const R = G.run, hit = new Set(); let cur = first, px = x, py = y;
    for (let i = 0; i < jumps && cur; i++) {
      R.bolts.push({ x1: px, y1: py, x2: cur.x, y2: cur.y, life: 0.14, col });
      if (cur === R.boss) hitBoss(dmg, false); else if (cur.hp != null && cur.d) hitEnemy(cur, dmg, false); else if (cur.hp != null) cur.hp -= dmg;
      hit.add(cur); px = cur.x; py = cur.y;
      cur = nearestEnemy(px, py, 180, hit);
      if (cur === R.boss) cur = null;
    }
  }

  function updateEnemy(e, dt) {
    const R = G.run, p = R.p, tm = NC.tierMult(R.tier);
    if (e.type === 'hunter' || e.type === 'mini') {
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, hs = e.sp;
      const k = e.type === 'mini' ? 2.2 : 1.3;
      e.vx += (dx / d * hs - e.vx) * dt * k; e.vy += (dy / d * hs - e.vy) * dt * k;
    }
    if (e.type === 'gunner') {
      e.fireT -= dt;
      if (e.fireT <= 0 && e.warm <= 0) {
        const t = R.tier >= 3 ? lead(e.x, e.y, 200) : p, a = Math.atan2(t.y - e.y, t.x - e.x), n = R.tier >= 4 ? 3 : 1;
        for (let i = 0; i < n; i++) eshoot(e.x, e.y, a + (i - (n - 1) / 2) * 0.2, 200, e.dmg, e.d.col, 5);
        e.fireT = Math.max(1.3, 2.6 - R.tier * 0.1) * rnd(0.85, 1.15); NC.audio.sfx('eshoot');
      }
    }
    if (e.type === 'charger') {
      e.st -= dt;
      if (e.state === 'idle' && e.st <= 0) { e.state = 'aim'; e.st = 0.75; e.vx *= 0.15; e.vy *= 0.15; }
      else if (e.state === 'aim') { const t = lead(e.x, e.y, 560); e.tx = t.x; e.ty = t.y; if (e.st <= 0) { const a = Math.atan2(e.ty - e.y, e.tx - e.x); e.vx = Math.cos(a) * 580; e.vy = Math.sin(a) * 580; e.state = 'go'; e.st = 0.6; } }
      else if (e.state === 'go' && e.st <= 0) { e.state = 'idle'; e.st = rnd(1.3, 2.1); const a = rnd(0, TAU); e.vx = Math.cos(a) * 45; e.vy = Math.sin(a) * 45; }
    }
    if (e.type === 'sentinel') {
      e.vx *= Math.pow(0.6, dt); e.vy *= Math.pow(0.6, dt);
      e.fireT -= dt;
      if (e.fireT <= 0 && e.warm <= 0) { R.beams.push({ src: e, x: e.x, y: e.y, ang: Math.atan2(p.y - e.y, p.x - e.x), len: 900, w: 14, charge: 1.2, fire: 0.45, t: 0, dmg: e.dmg * 3, col: e.d.col, tick: 0, owner: 'e' }); e.fireT = rnd(4, 5.5); }
    }
    if (e.type === 'carrier') {
      e.fireT -= dt;
      if (e.fireT <= 0 && e.warm <= 0) { for (let i = 0; i < 3; i++) spawnEnemy('mini', { x: e.x + rnd(-10, 10), y: e.y + rnd(-10, 10) }); e.fireT = rnd(3.2, 4.2); ring(e.x, e.y, e.d.col, 50, 0.3, 2); }
    }
    e.rot += dt * (e.type === 'drifter' ? 1.5 : e.type === 'splitter' ? 0.5 : e.type === 'shard' ? 2 : 1);
  }

  function stepFx(dt) {
    const R = G.run;
    for (const q of R.parts) {
      q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt;
      const drag = q.kind === 2 ? 0.3 : 0.08; q.vx *= Math.pow(drag, dt); q.vy *= Math.pow(drag, dt);
      if (q.kind === 1) q.rot += q.vr * dt;
    }
    R.parts = R.parts.filter(q => q.life > 0);
    for (const q of R.pops) { q.life -= dt; q.y += q.vy * dt; q.vy *= Math.pow(0.1, dt); }
    R.pops = R.pops.filter(q => q.life > 0);
    for (const r of R.rings) { r.life -= dt; r.r += (r.max - r.r) * Math.min(1, dt * 7); }
    R.rings = R.rings.filter(r => r.life > 0);
    if (R.banner) { R.banner.t -= dt; if (R.banner.t <= 0) R.banner = null; }
    R.shake = Math.max(0, R.shake - dt * 32);
    R.flash = Math.max(0, R.flash - dt * 1.6);
  }

  function endRun() {
    const R = G.run; if (!R) return;
    G.mode = 'over';
    const s = NC.save, xpGain = Math.round(R.xpRun * R.st.xpMult);
    const before = NC.levelFromXp(s.xp).lvl; s.xp += xpGain; const after = NC.levelFromXp(s.xp).lvl;
    const isBest = R.score > s.best; if (isBest) s.best = R.score;
    s.stats.runs++; s.stats.maxCombo = Math.max(s.stats.maxCombo, R.maxCombo);
    s.top.push({ score: R.score, tier: R.tier, ship: R.st.ship.id, date: Date.now(), kills: R.kills, time: Math.round(R.time) });
    s.top.sort((a, b) => b.score - a.score); s.top = s.top.slice(0, 10);
    if (!s.tut) s.tut = true;
    NC.persist();
    NC.music.set('menu');
    NC.ui.showGameOver({ score: R.score, isBest, best: s.best, kills: R.kills, tier: R.tier, combo: R.maxCombo, cr: R.crRun, xp: xpGain, lvlBefore: before, lvlAfter: after, time: R.time, chests: R.chestsFound, revives: R.revives, bosses: R.bossIdx });
  }
  G.quit = () => { if (G.run && G.mode !== 'menu' && G.mode !== 'over') { G.run.p.alive = false; endRun(); } };
  G.toMenu = () => { G.mode = 'menu'; G.run = null; NC.music.set('menu'); NC.ui.hideBossBar(); };
  G.pause = () => { if (G.mode === 'play') { G.mode = 'paused'; NC.persist(); NC.ui.showPause(); } };
  G.resume = () => { if (G.mode === 'paused') { G.mode = 'play'; NC.Input.clear(); } };

  // =====================================================================
  // RENDER
  // =====================================================================
  function drawBg(tt) {
    const R = G.run, p = R && R.p;
    const ox = p ? (p.x - G.W / 2) * 0.03 : Math.sin(tt / 5000) * 30, oy = p ? (p.y - G.H / 2) * 0.03 : Math.cos(tt / 6000) * 20;
    ctx.drawImage(neb, -160 - ox, -160 - oy, G.W + 320, G.H + 320);
    if (planet) { const s = planet.width; ctx.globalAlpha = 0.9; ctx.drawImage(planet, G.planetPos.x - s / 2 - ox * 1.6, G.planetPos.y - s / 2 - oy * 1.6); ctx.globalAlpha = 1; }
    const scroll = tt / 1000, warp = R && R.bossIntro > 0 ? (2.8 - R.bossIntro) * 6 : 0;
    for (const L of layers) for (const s of L) {
      const y = ((s.y + scroll * (30 + warp * 40) * s.z - oy * s.z * 2) % G.H + G.H) % G.H, x = ((s.x - ox * s.z * 2) % G.W + G.W) % G.W;
      const a = (0.35 + 0.3 * Math.sin(tt / 700 + s.tw)) * s.z;
      ctx.fillStyle = `rgba(225,220,255,${a})`;
      if (warp > 0) ctx.fillRect(x, y, s.z * 1.6, s.z * 1.6 + warp * s.z * 6); else ctx.fillRect(x, y, s.z * 1.8, s.z * 1.8);
    }
    if (Q().glow) {
      ctx.globalCompositeOperation = 'lighter';
      for (const d of dust) { const y = ((d.y + scroll * d.s) % (G.H + 120) + G.H + 120) % (G.H + 120) - 60; glow(d.x - ox * 2, y, '#5a4aa0', d.r, d.a * 3); }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
  }
  function poly(n, r, rot = 0) { ctx.beginPath(); for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); }
  function starShape(Ro, ri, n) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU - Math.PI / 2, rr = i % 2 ? ri : Ro; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); }
  function bodyFill(col, r) { const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r * 1.2); g.addColorStop(0, '#2a2348'); g.addColorStop(1, '#0a0818'); return g; }

  function drawEnemy(e, tt) {
    const d = e.d, c = e.flash > 0 ? '#ffffff' : d.col, p = G.run.p;
    const fade = e.leaving ? Math.max(0, e.leaving / 0.6) : 1;
    if (Q().glow) { ctx.globalCompositeOperation = 'lighter'; glow(e.x, e.y, d.col, e.r * 2.6, (e.warm > 0 ? 0.25 : 0.5) * fade); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = fade;
    ctx.save(); ctx.translate(e.x, e.y);
    if (e.warm > 0) { ctx.globalAlpha = 0.35 + 0.35 * Math.sin(tt / 45); ctx.strokeStyle = d.col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, e.r + e.warm * 34, 0, TAU); ctx.stroke(); ctx.globalAlpha = 0.5 * fade; }
    if (e.elite) { ctx.save(); ctx.rotate(-tt / 600); ctx.strokeStyle = '#ffd65e'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(0, 0, e.r + 7, 0, TAU); ctx.stroke(); ctx.restore(); }
    ctx.strokeStyle = c; ctx.fillStyle = bodyFill(d.col, e.r); ctx.lineWidth = 2;
    switch (e.type) {
      case 'drifter':
        ctx.rotate(e.rot);
        ctx.beginPath(); ctx.arc(0, 0, e.r * 0.62, 0, TAU); ctx.fill(); ctx.stroke();
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * e.r * 0.62, Math.sin(a) * e.r * 0.62); ctx.lineTo(Math.cos(a) * e.r * 1.12, Math.sin(a) * e.r * 1.12); ctx.stroke(); ctx.beginPath(); ctx.arc(Math.cos(a) * e.r * 1.12, Math.sin(a) * e.r * 1.12, 2, 0, TAU); ctx.fillStyle = c; ctx.fill(); }
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, e.r * 0.22 + Math.sin(tt / 150) * 1.4, 0, TAU); ctx.fill();
        break;
      case 'hunter': case 'mini':
        ctx.rotate(Math.atan2(e.vy, e.vx));
        ctx.beginPath(); ctx.moveTo(e.r * 1.25, 0); ctx.lineTo(-e.r * 0.8, e.r * 0.85); ctx.lineTo(-e.r * 0.35, 0); ctx.lineTo(-e.r * 0.8, -e.r * 0.85); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(e.r * 0.25, 0, e.type === 'mini' ? 1.8 : 2.8, 0, TAU); ctx.fill();
        if (Q().glow) { ctx.globalCompositeOperation = 'lighter'; glow(-e.r * 0.5, 0, d.col, 8, 0.8, true); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fade; }
        break;
      case 'splitter': case 'shard': {
        ctx.rotate(e.rot);
        ctx.beginPath(); e.verts.forEach((v, i) => { const a = i / e.verts.length * TAU; ctx.lineTo(Math.cos(a) * e.r * v, Math.sin(a) * e.r * v); }); ctx.closePath();
        const g = ctx.createRadialGradient(-e.r * 0.3, -e.r * 0.3, 0, 0, 0, e.r); g.addColorStop(0, '#2c3a34'); g.addColorStop(1, '#0b120f'); ctx.fillStyle = g;
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = d.col + '55'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-e.r * 0.3, -e.r * 0.2); ctx.lineTo(e.r * 0.2, e.r * 0.1); ctx.lineTo(e.r * 0.1, e.r * 0.45); ctx.moveTo(e.r * 0.2, e.r * 0.1); ctx.lineTo(e.r * 0.45, -e.r * 0.25); ctx.stroke();
        break;
      }
      case 'gunner': {
        poly(6, e.r, e.rot * 0.3); ctx.fill(); ctx.stroke();
        poly(6, e.r * 0.55, e.rot * 0.3); ctx.strokeStyle = d.col + '88'; ctx.lineWidth = 1; ctx.stroke();
        ctx.rotate(Math.atan2(p.y - e.y, p.x - e.x));
        ctx.fillStyle = c; ctx.fillRect(0, -3, e.r * 1.15, 6);
        const ch = clamp(1 - e.fireT / 2, 0, 1); ctx.beginPath(); ctx.arc(0, 0, 3 + ch * 4, 0, TAU); ctx.fill();
        break;
      }
      case 'charger': {
        const a = e.state === 'aim' ? Math.atan2(e.ty - e.y, e.tx - e.x) : Math.atan2(e.vy, e.vx);
        if (e.state === 'aim') { ctx.save(); ctx.rotate(a); ctx.setLineDash([8, 7]); ctx.strokeStyle = d.col; ctx.globalAlpha = (0.5 + 0.5 * Math.sin(tt / 40)) * fade; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.r, 0); ctx.lineTo(Math.hypot(e.tx - e.x, e.ty - e.y), 0); ctx.stroke(); ctx.restore(); ctx.globalAlpha = fade; }
        ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(e.r * 1.45, 0); ctx.lineTo(0, e.r * 0.8); ctx.lineTo(-e.r, e.r * 0.3); ctx.lineTo(-e.r * 0.7, 0); ctx.lineTo(-e.r, -e.r * 0.3); ctx.lineTo(0, -e.r * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(e.r * 0.2, 0, 3.2, 0, TAU); ctx.fill();
        break;
      }
      case 'sentinel': {
        ctx.rotate(e.rot * 0.4);
        poly(4, e.r * 1.1, 0); ctx.fill(); ctx.stroke();
        poly(4, e.r * 0.6, Math.PI / 4); ctx.strokeStyle = d.col + '99'; ctx.stroke();
        const ch = clamp(1 - e.fireT / 1.5, 0, 1); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 3 + ch * 6, 0, TAU); ctx.fill();
        break;
      }
      case 'carrier': {
        ctx.rotate(Math.atan2(e.vy, e.vx));
        ctx.beginPath(); ctx.moveTo(e.r * 1.1, 0); ctx.lineTo(e.r * 0.5, e.r * 0.7); ctx.lineTo(-e.r * 0.9, e.r * 0.7); ctx.lineTo(-e.r * 1.1, 0); ctx.lineTo(-e.r * 0.9, -e.r * 0.7); ctx.lineTo(e.r * 0.5, -e.r * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = d.col + '55'; for (let i = -1; i <= 1; i++) ctx.fillRect(-e.r * 0.6 + i * 0, i * e.r * 0.35 - 2, e.r * 1.0, 4);
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(e.r * 0.6, 0, 3, 0, TAU); ctx.fill();
        break;
      }
    }
    ctx.restore(); ctx.globalAlpha = 1;
    if (e.hp < e.max && !e.leaving) {
      const w = Math.max(24, e.r * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(e.x - w / 2, e.y - e.r - 11, w, 3.5);
      ctx.fillStyle = e.elite ? '#ffd65e' : d.col; ctx.fillRect(e.x - w / 2, e.y - e.r - 11, w * Math.max(0, e.hp / e.max), 3.5);
    }
    if (e.lvl > 1 && (e.elite || e.r > 18) && !e.leaving) { ctx.font = '700 9px "JetBrains Mono", monospace'; ctx.fillStyle = e.elite ? '#ffd65e' : 'rgba(236,232,255,0.6)'; ctx.textAlign = 'center'; ctx.fillText('N' + e.lvl, e.x, e.y + e.r + 13); }
  }

  function drawBoss(b, tt) {
    const r = b.r, c = b.flash > 0 ? '#ffffff' : b.def.col, c2 = b.def.col2;
    ctx.save(); ctx.globalAlpha = b.alpha;
    if (Q().glow) { ctx.globalCompositeOperation = 'lighter'; glow(b.x, b.y, b.def.col, r * 3.2, 0.45 * b.alpha); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = b.alpha; }
    ctx.translate(b.x, b.y);
    const body = ctx.createLinearGradient(0, -r * 0.6, 0, r * 0.6); body.addColorStop(0, '#2c1036'); body.addColorStop(1, '#0b0616');
    ctx.fillStyle = body; ctx.strokeStyle = c; ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
    const id = b.def.id;
    if (id === 'dread') {
      ctx.beginPath(); ctx.moveTo(-r * 1.3, 0); ctx.lineTo(-r * 0.75, -r * 0.55); ctx.lineTo(r * 0.75, -r * 0.55); ctx.lineTo(r * 1.3, 0); ctx.lineTo(r * 0.85, r * 0.6); ctx.lineTo(-r * 0.85, r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = c + '55'; ctx.lineWidth = 1; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.26, -r * 0.5); ctx.lineTo(i * r * 0.32, r * 0.55); ctx.stroke(); }
    } else if (id === 'weaver') {
      ctx.rotate(b.t * 0.4);
      for (let k = 0; k < 2; k++) { ctx.save(); ctx.rotate(k * Math.PI / 6); poly(6, r * (1 - k * 0.35)); ctx.fill(); ctx.stroke(); ctx.restore(); }
      ctx.rotate(-b.t * 0.8); ctx.strokeStyle = c2; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r * 0.35, i * Math.PI / 3, 0, TAU); ctx.stroke(); }
      ctx.rotate(b.t * 0.4);
    } else {
      const a = b.atk && b.atk.name === 'ram' ? b.atk.ang : Math.atan2(G.run.p.y - b.y, G.run.p.x - b.x);
      ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(r * 1.4, 0); ctx.lineTo(r * 0.6, r * 0.5); ctx.lineTo(-r * 0.2, r * 0.75); ctx.lineTo(-r * 1.1, r * 0.45); ctx.lineTo(-r * 0.8, 0); ctx.lineTo(-r * 1.1, -r * 0.45); ctx.lineTo(-r * 0.2, -r * 0.75); ctx.lineTo(r * 0.6, -r * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = c + '55'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-r * 0.7, 0); ctx.lineTo(r * 1.1, 0); ctx.moveTo(0, -r * 0.6); ctx.lineTo(r * 0.5, 0); ctx.lineTo(0, r * 0.6); ctx.stroke();
      if (Q().glow) { ctx.globalCompositeOperation = 'lighter'; glow(-r * 1.1, 0, c2, r * 0.6, 0.9, true); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = b.alpha; }
      ctx.rotate(-a);
    }
    // core
    const charging = b.atk && ((b.atk.name === 'gapRing' && b.atk.next > 0) || (b.atk.name === 'aimed' && b.atk.next < 0.25) || (b.atk.name === 'ram' && b.atk.t < b.atk.tele));
    const pulse = 0.6 + 0.4 * Math.sin(tt / (charging ? 50 : 140));
    ctx.globalCompositeOperation = 'lighter'; glow(0, 0, c2, r * (charging ? 0.95 : 0.65) * pulse, 0.95 * b.alpha, true); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = b.alpha;
    if (id === 'dread') for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * r * 0.85, 10); ctx.rotate(Math.atan2(G.run.p.y - b.y - 10, G.run.p.x - b.x - s * r * 0.85));
      ctx.fillStyle = '#1a0d24'; ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c; ctx.fillRect(0, -3.5, r * 0.42, 7); ctx.restore();
    }
    if (b.inv > 0) { ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.4 + 0.3 * Math.sin(tt / 40); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r * 1.45, 0, TAU); ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1;
    // ram telegraph
    const A = b.atk;
    if (A && A.name === 'ram' && A.t < A.tele) {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(A.ang);
      const k = A.t / A.tele; ctx.fillStyle = b.def.col; ctx.globalAlpha = 0.12 + 0.18 * k; ctx.fillRect(0, -r * 0.7, 2400, r * 1.4);
      ctx.globalAlpha = 0.8; ctx.strokeStyle = b.def.col; ctx.setLineDash([12, 10]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -r * 0.7); ctx.lineTo(2400, -r * 0.7); ctx.moveTo(0, r * 0.7); ctx.lineTo(2400, r * 0.7); ctx.stroke(); ctx.restore();
    }
    if (A && A.name === 'blink' && !A.moved) { ctx.save(); ctx.strokeStyle = b.def.col; ctx.globalAlpha = 0.7; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(A.nx, A.ny, r * (1.6 - A.t / A.dur), 0, TAU); ctx.stroke(); ctx.restore(); }
  }

  function drawBeam(bm, tt) {
    const charging = bm.t < bm.charge;
    ctx.save(); ctx.translate(bm.x, bm.y); ctx.rotate(bm.ang);
    if (charging) {
      const k = bm.t / bm.charge;
      ctx.strokeStyle = bm.col; ctx.globalAlpha = 0.25 + 0.5 * k * (0.6 + 0.4 * Math.sin(tt / 30)); ctx.lineWidth = 1 + k * 2; ctx.setLineDash([14, 10]);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bm.len, 0); ctx.stroke();
      ctx.globalAlpha = 0.08 + 0.12 * k; ctx.fillStyle = bm.col; ctx.fillRect(0, -bm.w / 2, bm.len, bm.w);
    } else {
      const k = (bm.t - bm.charge) / bm.fire, w = bm.w * (k < 0.1 ? k / 0.1 : k > 0.85 ? (1 - k) / 0.15 : 1) * (0.9 + 0.1 * Math.sin(tt / 20));
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35; ctx.fillStyle = bm.col; ctx.fillRect(0, -w, bm.len, w * 2);
      ctx.globalAlpha = 0.9; ctx.fillRect(0, -w / 2, bm.len, w);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -w / 5, bm.len, w / 2.5);
      glow(0, 0, bm.col, w * 2.2, 1, true);
    }
    ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  function drawPlayer(tt) {
    const R = G.run, p = R.p, sk = R.st.ship;
    // orbit blades
    if (R.m.orbit) for (let i = 0; i < R.m.orbit; i++) {
      const a = R.orbitA + i / R.m.orbit * TAU, bx = p.x + Math.cos(a) * 70, by = p.y + Math.sin(a) * 70;
      ctx.globalCompositeOperation = 'lighter'; glow(bx, by, '#c49bff', 20, 0.9); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(a * 3); ctx.fillStyle = '#efe0ff'; starShape(9, 3, 3); ctx.fill(); ctx.restore();
    }
    // drones
    const T = R.st.turret;
    if (T) for (const d of R.drones) {
      if (Q().glow) { ctx.globalCompositeOperation = 'lighter'; glow(d.x, d.y, T.col, 14, 0.8); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a * 2); ctx.fillStyle = '#120e2a'; ctx.strokeStyle = T.col; ctx.lineWidth = 1.6; poly(T.kind === 'missile' ? 3 : T.kind === 'chain' ? 5 : 4, 6.5); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    // companion
    if (R.comp) {
      const c = R.comp, cd = R.st.comp;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.ang);
      ctx.globalCompositeOperation = 'lighter'; glow(-10, 0, cd.col, 12, 0.9, true); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.fillStyle = '#120e2a'; ctx.strokeStyle = cd.col; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-6, 8); ctx.lineTo(-3, 0); ctx.lineTo(-6, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    if (!p.alive) return;
    const blink = p.inv > 0 && p.inv < 2.8 && Math.floor(p.inv * 14) % 2 && R.hyper <= 0;
    if (!blink) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
      ctx.globalCompositeOperation = 'lighter';
      const fl = 13 + Math.sin(tt * 0.05) * 3 + Math.random() * 5 + (p.dashT > 0 ? 20 : 0);
      glow(-18, 0, sk.a, 22, 0.8);
      ctx.globalAlpha = 0.9; ctx.fillStyle = sk.a; ctx.beginPath(); ctx.moveTo(-15, -4.5); ctx.lineTo(-15 - fl, 0); ctx.lineTo(-15, 4.5); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-15, -2); ctx.lineTo(-15 - fl * 0.5, 0); ctx.lineTo(-15, 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      const spr = shipSprite(sk); ctx.drawImage(spr, -36, -36, 72, 72);
      if (p.hurtT > 0) { ctx.globalAlpha = p.hurtT; ctx.globalCompositeOperation = 'lighter'; glow(0, 0, '#ff4f8b', 30, p.hurtT * 2); ctx.globalCompositeOperation = 'source-over'; }
      ctx.restore(); ctx.globalAlpha = 1;
    }
    // shield bubble
    if (p.shd > 0 || R.hyper > 0) {
      const col = R.hyper > 0 ? '#ffd65e' : '#7dd8ff', k = R.hyper > 0 ? 1 : p.shd / R.maxShd;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.12 + 0.25 * k; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, 27, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.05 + 0.08 * k; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, 27, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.25 * k; poly(6, 27, tt / 900); ctx.stroke();
      ctx.restore();
    }
    if (R.combo > 1) { ctx.save(); ctx.strokeStyle = '#ffd65e'; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 34, -Math.PI / 2, -Math.PI / 2 + TAU * (R.comboT / 2.6)); ctx.stroke(); ctx.restore(); }
  }

  function draw(tt) {
    ctx.setTransform(DPR * G.scale, 0, 0, DPR * G.scale, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const R = G.run;
    ctx.save();
    if (R && R.shake) ctx.translate(rnd(-R.shake, R.shake), rnd(-R.shake, R.shake));
    drawBg(tt);
    if (!R) { drawDemo(tt); ctx.restore(); vignette(); return; }
    const glowOn = Q().glow;

    // mines
    for (const m of R.mines) {
      const k = m.t / m.arm;
      ctx.strokeStyle = m.col; ctx.fillStyle = m.col; ctx.globalAlpha = 0.15 + 0.25 * k; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * k, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.8; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(m.x, m.y, 5 + Math.sin(tt / (60 - k * 40)) * 2, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // items
    for (const it of R.items) {
      ctx.save(); ctx.translate(it.x, it.y);
      if (it.kind === 'cr') {
        if (glowOn) { ctx.globalCompositeOperation = 'lighter'; glow(0, 0, '#5ef0ff', 14, 0.7); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
        ctx.rotate(it.t * 4); ctx.fillStyle = '#5ef0ff'; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 0); ctx.lineTo(0, 7); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e6fdff'; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(2, 0); ctx.lineTo(0, 3); ctx.lineTo(-2, 0); ctx.closePath(); ctx.fill();
      } else if (it.kind === 'chest') {
        const c = NC.CHESTS.find(c => c.id === it.id);
        ctx.globalCompositeOperation = 'lighter'; glow(0, 0, c.col, 46 + Math.sin(it.t * 6) * 6, 0.8); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        drawChestIcon(ctx, c, 30, it.t);
      } else if (it.kind === 'capsule') {
        const blink = false;
        ctx.globalCompositeOperation = 'lighter'; glow(0, 0, '#ffd65e', 60 + Math.sin(it.t * 5) * 6, 0.75); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        ctx.rotate(it.t * 1.5); ctx.strokeStyle = '#ffd65e'; ctx.lineWidth = 2.6; poly(8, it.r); ctx.stroke();
        ctx.rotate(-it.t * 3); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; poly(4, it.r * 0.6); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
      } else if (it.kind === 'hp') {
        const blink = it.life < 2 && Math.floor(it.t * 8) % 2;
        if (!blink) {
          ctx.globalCompositeOperation = 'lighter'; glow(0, 0, '#7dff9a', 30, 0.6); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
          ctx.strokeStyle = '#7dff9a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, it.r + Math.sin(it.t * 6) * 1.5, 0, TAU); ctx.stroke();
          ctx.fillStyle = '#7dff9a'; ctx.fillRect(-2.5, -7, 5, 14); ctx.fillRect(-7, -2.5, 14, 5);
        }
      }
      ctx.restore();
    }
    // stars
    for (const s of R.stars) {
      const col = s.gold ? '#ffb43d' : '#ffd65e', pul = 1 + Math.sin(s.t * 5) * 0.15, sc = Math.min(1, s.life * 4);
      if (glowOn) { ctx.globalCompositeOperation = 'lighter'; glow(s.x, s.y, col, 24 * sc, 0.55); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.t); ctx.scale(sc * pul, sc * pul);
      ctx.fillStyle = col; starShape(s.r, s.r * 0.4, 4); ctx.fill(); ctx.fillStyle = '#fff'; starShape(s.r * 0.42, s.r * 0.2, 4); ctx.fill(); ctx.restore();
    }
    for (const bm of R.beams) if (bm.t < bm.charge) drawBeam(bm, tt);
    for (const e of R.enemies) drawEnemy(e, tt);
    for (const o of R.orbs) {
      ctx.globalCompositeOperation = 'lighter'; glow(o.x, o.y, o.col, o.r * 2.8, 0.8); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.fillStyle = o.flash > 0 ? '#fff' : '#120e2a'; ctx.strokeStyle = o.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = o.col; ctx.beginPath(); ctx.arc(o.x, o.y, 4 + Math.sin(o.t * 10) * 1.5, 0, TAU); ctx.fill();
    }
    if (R.boss) drawBoss(R.boss, tt);
    for (const bm of R.beams) if (bm.t >= bm.charge) drawBeam(bm, tt);

    // bullets
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const bl of R.bullets) {
      const sp = Math.hypot(bl.vx, bl.vy) || 1, len = bl.missile ? 9 : 16 * bl.w, tx = bl.x - bl.vx / sp * len, ty = bl.y - bl.vy / sp * len;
      ctx.globalAlpha = 0.5; ctx.strokeStyle = bl.crit ? '#ffd65e' : bl.col; ctx.lineWidth = (bl.missile ? 6 : 5.5) * bl.w; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(bl.x, bl.y); ctx.stroke();
      ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8 * bl.w; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(bl.x, bl.y); ctx.stroke();
    }
    for (const eb of R.ebullets) { glow(eb.x, eb.y, eb.col, eb.r * 3.2, 0.9, true); }
    for (const b of R.bolts) {
      ctx.globalAlpha = b.life / 0.14; ctx.strokeStyle = b.col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(b.x1, b.y1);
      const n = 6; for (let i = 1; i < n; i++) { const k = i / n; ctx.lineTo(NC.lerp(b.x1, b.x2, k) + rnd(-8, 8), NC.lerp(b.y1, b.y2, k) + rnd(-8, 8)); }
      ctx.lineTo(b.x2, b.y2); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
    // enemy bullets need a dark core so they read against glows
    for (const eb of R.ebullets) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(eb.x, eb.y, eb.r * 0.45, 0, TAU); ctx.fill(); }

    drawPlayer(tt);

    // particles
    ctx.save();
    for (const q of R.parts) {
      const a = q.life / q.max;
      if (q.kind === 2) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a * 0.45; ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (1.6 - a * 0.6), 0, TAU); ctx.fill(); continue; }
      ctx.globalCompositeOperation = 'lighter';
      if (q.kind === 1) { ctx.globalAlpha = a; ctx.fillStyle = q.col; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillRect(-q.r, -q.r * 0.4, q.r * 2, q.r * 0.8); ctx.restore(); continue; }
      if (glowOn) glow(q.x, q.y, q.col, q.r * 3.4, a, true); else { ctx.globalAlpha = a; ctx.fillStyle = q.col; ctx.fillRect(q.x - q.r / 2, q.y - q.r / 2, q.r, q.r); }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const r of R.rings) { ctx.globalAlpha = r.life / r.ml; ctx.strokeStyle = r.col; ctx.lineWidth = r.w * (r.life / r.ml) + 0.5; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1;

    // damage numbers
    ctx.save(); ctx.textAlign = 'center';
    for (const q of R.pops) {
      ctx.globalAlpha = Math.min(1, q.life / q.ml * 2.5); ctx.font = `700 ${q.size}px "Chakra Petch", sans-serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(5,4,13,0.75)'; ctx.strokeText(q.txt, q.x, q.y); ctx.fillStyle = q.col; ctx.fillText(q.txt, q.x, q.y);
    }
    ctx.restore();
    ctx.restore(); // shake

    if (R.over > 0) { ctx.globalAlpha = 0.05 + 0.03 * Math.sin(tt / 80); ctx.fillStyle = '#ffd65e'; ctx.fillRect(0, 0, G.W, G.H); ctx.globalAlpha = 1; }
    vignette();
    // low hp
    if (R.p.alive && R.p.hp < R.maxHp * 0.3) {
      const a = (0.25 + 0.15 * Math.sin(tt / 180)) * (1 - R.p.hp / (R.maxHp * 0.3));
      const g = ctx.createRadialGradient(G.W / 2, G.H / 2, Math.min(G.W, G.H) * 0.3, G.W / 2, G.H / 2, Math.max(G.W, G.H) * 0.7);
      g.addColorStop(0, 'rgba(255,30,60,0)'); g.addColorStop(1, `rgba(255,30,60,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, G.W, G.H);
    }
    if (R.flash > 0) { ctx.globalAlpha = R.flash; ctx.fillStyle = R.flashCol; ctx.fillRect(0, 0, G.W, G.H); ctx.globalAlpha = 1; }
    if (R.bossIntro > 0) { const a = 0.12 + 0.1 * Math.sin(tt / 90); ctx.fillStyle = `rgba(255,40,80,${a})`; ctx.fillRect(0, 0, G.W, 6); ctx.fillRect(0, G.H - 6, G.W, 6); }
    // banner
    if (R.banner) {
      const bn = R.banner, a = Math.min(1, bn.t * 2.5, (bn.ml - bn.t) * 6);
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
      const fs = clamp(G.W / 22, 22, 40), y = G.H * 0.3;
      ctx.fillStyle = 'rgba(5,4,13,0.55)'; ctx.fillRect(0, y - fs - 6, G.W, fs + 34);
      ctx.font = `700 ${fs}px "Chakra Petch", sans-serif`; ctx.fillStyle = bn.col;
      ctx.shadowColor = bn.col; ctx.shadowBlur = 20; ctx.fillText(bn.txt, G.W / 2, y); ctx.shadowBlur = 0;
      ctx.font = '400 13px "JetBrains Mono", monospace'; ctx.fillStyle = '#ece8ff'; ctx.fillText(bn.sub, G.W / 2, y + 22);
      ctx.restore();
    }
  }
  function vignette() {
    const g = ctx.createRadialGradient(G.W / 2, G.H / 2, Math.min(G.W, G.H) * 0.4, G.W / 2, G.H / 2, Math.max(G.W, G.H) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, G.W, G.H);
  }
  function drawChestIcon(g, c, s, t = 0) {
    g.save(); g.scale(s / 30, s / 30); g.rotate(Math.sin(t * 8) * 0.04);
    const rr = (x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); };
    // shadow
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(0, 15, 16, 3, 0, 0, TAU); g.fill();
    // body
    const body = g.createLinearGradient(0, -2, 0, 14); body.addColorStop(0, c.col); body.addColorStop(1, '#1a1030');
    rr(-15, -2, 30, 16, 2.5); g.fillStyle = body; g.fill(); g.lineWidth = 1.3; g.strokeStyle = '#0a0818'; g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-14, 4); g.lineTo(14, 4); g.moveTo(-14, 9); g.lineTo(14, 9); g.stroke();
    // lid
    const lid = g.createLinearGradient(0, -14, 0, -2); lid.addColorStop(0, '#ffffff'); lid.addColorStop(0.25, c.col); lid.addColorStop(1, '#2a1a48');
    g.beginPath(); g.moveTo(-15, -2); g.bezierCurveTo(-15, -15, 15, -15, 15, -2); g.closePath(); g.fillStyle = lid; g.fill(); g.strokeStyle = '#0a0818'; g.lineWidth = 1.3; g.stroke();
    // gold bands
    const band = g.createLinearGradient(0, -12, 0, 14); band.addColorStop(0, '#fff3c4'); band.addColorStop(0.5, '#ffd65e'); band.addColorStop(1, '#a86b12');
    g.fillStyle = band;
    for (const x of [-11.5, 8.5]) { g.beginPath(); g.moveTo(x, -9.5); g.quadraticCurveTo(x + 1.5, -11, x + 3, -10.5); g.lineTo(x + 3, 14); g.lineTo(x, 14); g.closePath(); g.fill(); }
    g.fillRect(-15, -3, 30, 2.4);
    // lock
    rr(-3.5, -5, 7, 8, 1.5); g.fillStyle = band; g.fill(); g.strokeStyle = '#5a3a08'; g.lineWidth = 0.8; g.stroke();
    g.fillStyle = '#3a2208'; g.beginPath(); g.arc(0, -1.8, 1.2, 0, TAU); g.fill(); g.fillRect(-0.5, -1.5, 1, 2.8);
    // sparkle
    const sp = 0.5 + 0.5 * Math.sin(t * 3);
    g.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * sp})`; g.beginPath(); g.moveTo(-8, -10); g.lineTo(-7.2, -8.2); g.lineTo(-5.4, -7.4); g.lineTo(-7.2, -6.6); g.lineTo(-8, -4.8); g.lineTo(-8.8, -6.6); g.lineTo(-10.6, -7.4); g.lineTo(-8.8, -8.2); g.closePath(); g.fill();
    g.restore();
  }
  G.drawChestIcon = drawChestIcon;

  const demo = { t: 0 };
  function drawDemo(tt) {
    const t = tt / 1000, x = G.W / 2 + Math.cos(t * 0.6) * G.W * 0.28, y = G.H * 0.55 + Math.sin(t * 1.0) * G.H * 0.22;
    const dx = -Math.sin(t * 0.6) * 0.6 * G.W * 0.28, dy = Math.cos(t * 1.0) * G.H * 0.22, a = Math.atan2(dy, dx);
    const sk = NC.SHIPS.find(s => s.id === NC.save.ships.eq) || NC.SHIPS[0];
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(1.4, 1.4);
    ctx.globalCompositeOperation = 'lighter'; glow(-18, 0, sk.a, 26, 0.8);
    ctx.globalAlpha = 0.9; ctx.fillStyle = sk.a; const fl = 16 + Math.random() * 6; ctx.beginPath(); ctx.moveTo(-15, -4.5); ctx.lineTo(-15 - fl, 0); ctx.lineTo(-15, 4.5); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.drawImage(shipSprite(sk), -36, -36, 72, 72); ctx.restore();
  }

  // =====================================================================
  // LOOP
  // =====================================================================
  let last = performance.now(), fpsAcc = 0, fpsN = 0;
  function loop(now) {
    let dt = Math.min(0.033, (now - last) / 1000); last = now;
    fpsAcc += dt; fpsN++; if (fpsAcc >= 0.5) { G.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
    NC.Input.poll(dt);
    const R = G.run;
    if (R && NC.Input.take('pause')) { if (G.mode === 'play') G.pause(); else if (G.mode === 'paused') NC.ui.closePause(); }
    if (R && (G.mode === 'play')) {
      if (R.hitstop > 0) { R.hitstop -= dt; dt = 0; }
      if (R.dying > 0) {
        R.dying -= dt; stepFx(dt);
        for (const eb of R.ebullets) { eb.x += eb.vx * dt * 0.3; eb.y += eb.vy * dt * 0.3; }
        if (R.dying <= 0) {
          if (R.revives < 3) { G.mode = 'revive'; NC.ui.showRevive(); } else endRun();
        }
      } else if (dt > 0) update(dt);
    } else if (R && G.mode === 'over') stepFx(dt);
    draw(now);
    NC.ui.frame(now);
    requestAnimationFrame(loop);
  }

  // =====================================================================
  // DEBUG HOOKS (used by automated tests)
  // =====================================================================
  G.debug = {
    score: v => { if (G.run) G.run.score = v; },
    killBoss: () => { if (G.run && G.run.boss) hitBoss(G.run.boss.hp + 1, false); },
    hurt: v => { if (G.run) { G.run.p.inv = 0; G.run.p.dashT = 0; damagePlayer(v); } },
    xp: v => addXp(v),
    state: () => { const R = G.run; return R && { mode: G.mode, score: R.score, tier: R.tier, enemies: R.enemies.length, boss: R.boss && { name: R.boss.def.name, hp: Math.round(R.boss.hp), phase: R.boss.phase, state: R.boss.state, atk: R.boss.atk && R.boss.atk.name }, hp: Math.round(R.p.hp), shd: Math.round(R.p.shd), revives: R.revives, alive: R.p.alive, bullets: R.bullets.length, ebullets: R.ebullets.length, cards: R.cards, W: Math.round(G.W), H: Math.round(G.H) }; },
  };
})(window.NC);
