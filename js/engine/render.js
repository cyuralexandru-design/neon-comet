'use strict';
// Neon Comet 3.1 engine: pixel renderer (SPEC §2 + SPEC-31 §3). Low-res logical canvas (height ~192-207, target 200 = the world
// is ~10% larger than v3.0's 180, so every sprite looks ~10% smaller), filling the whole screen. All draw positions rounded.
(function (NC) {
  const U = NC.U, X = NC.eng = NC.eng || {}, P = NC.px;
  // k = effective device px per logical px (may be fractional), kb = integer factor used for the backing canvas
  const RD = NC.render = { k: 1, kb: 1, int: true, W: 320, H: 200, dpr: 1, cv: null, g: null, lo: null, lg: null, bgT: 0 };
  RD.TARGET_H = 200; RD.BAND = [192, 207];

  RD.init = (canvas) => {
    RD.cv = canvas; RD.g = canvas.getContext('2d');
    RD.lo = document.createElement('canvas'); RD.lg = RD.lo.getContext('2d');
    canvas.style.imageRendering = 'pixelated';
    RD.resize();
    addEventListener('resize', RD.resize);
    if (window.ResizeObserver && canvas.parentElement) new ResizeObserver(RD.resize).observe(canvas.parentElement);
  };
  // Scale rule (dh = screen height in device px):
  //  1) if an integer k gives a logical height dh/k inside BAND [192..207] -> pixel-perfect integer scale (closest to 200);
  //  2) otherwise logical height = 200 exactly with a fractional scale s = dh/200, rendered "sharp-bilinear": the low-res frame is
  //     blown up by an INTEGER factor kb (nearest neighbour, crisp) into the backing canvas and the browser does the last tiny
  //     (<= ~10-20%) smooth resample to the CSS size -> crisp pixels, no uneven pixel widths/shimmer, no big jumps between devices.
  //  390@3x (1170) -> k6 int, H195 | 412@2.625x (1082) -> s5.41, H200 | 430@3x (1290) -> s6.45, H200 | 1080@1x -> s5.4, H200
  //  1440@1x -> k7 int, H206 | 360@3x (1080) -> s5.4, H200 | 960@1x (windowed 1080p) -> k5 int, H192 | 2160@1x -> k11 int, H196
  RD.pickScale = (dh) => {
    // 3.1: target = what v3.0 showed on THIS device (k = floor(dh/180)) + 10%, so every screen sees ~10% more world
    const oldH = dh / Math.max(1, Math.floor(dh / 180)), T = Math.max(RD.TARGET_H, oldH * 1.1), ks = dh / T; let best = 0, bd = 1e9;
    for (const k of [Math.floor(ks), Math.ceil(ks)]) { if (k < 1) continue; const h = dh / k; if (h >= T * 0.97 && h <= T * 1.04 && Math.abs(h - T) < bd) { bd = Math.abs(h - T); best = k; } }
    if (best) return { s: best, kb: best, int: true };
    const s = Math.max(0.25, ks);
    return { s, kb: Math.max(1, s >= 3 ? Math.floor(s) : Math.ceil(s)), int: false };
  };
  RD.resize = () => {
    const cv = RD.cv; if (!cv) return;
    const host = cv.parentElement && cv.parentElement !== document.documentElement ? cv.parentElement.getBoundingClientRect() : { width: innerWidth, height: innerHeight };
    const cw = Math.max(1, host.width || innerWidth), ch = Math.max(1, host.height || innerHeight);
    const q = U.settings().quality; const dpr = Math.min(window.devicePixelRatio || 1, q === 'low' ? 1 : 4);
    const dw = Math.round(cw * dpr), dh = Math.round(ch * dpr);
    const sc = RD.pickScale(dh), s = sc.s, kb = sc.kb;
    const W = Math.ceil(dw / s - 0.001), H = sc.int ? Math.ceil(dh / s) : Math.round(dh / s);
    RD.k = s; RD.kb = kb; RD.int = sc.int; RD.W = W; RD.H = H; RD.dpr = dpr; RD.cssW = cw; RD.cssH = ch;
    RD.lo.width = W; RD.lo.height = H;
    cv.width = W * kb; cv.height = H * kb; // integer mode may exceed the screen by < k device px; CSS crops it
    cv.style.width = (W * s / dpr) + 'px'; cv.style.height = (H * s / dpr) + 'px';
    cv.style.imageRendering = sc.int || kb === s ? 'pixelated' : 'auto';
    RD.g.imageSmoothingEnabled = false; RD.lg.imageSmoothingEnabled = false;
    if (X.G) { X.G.W = W; X.G.H = H; }
    if (X.R && X.R.p) { X.R.p.x = U.clamp(X.R.p.x, 8, W - 8); X.R.p.y = U.clamp(X.R.p.y, 12, H - 16); }
  };
  // CSS px (relative to canvas) -> logical px
  RD.toLogical = (x, y) => ({ x: x * RD.dpr / RD.k, y: y * RD.dpr / RD.k }); // works for integer and fractional k
  RD.toCss = (x, y) => ({ x: x * RD.k / RD.dpr, y: y * RD.k / RD.dpr });

  // ------------------------------------------------------------ backgrounds (4 parallax layers, procedural fallback)
  const procBg = {};
  function procLayer(biome, n) {
    const key = biome + n; if (procBg[key]) return procBg[key];
    const c = document.createElement('canvas'); c.width = 320; c.height = 180; const g = c.getContext('2d');
    const pal = { nebula: ['#10141f', '#1e1d39', '#402751'], asteroid: ['#10141f', '#202e37', '#3e2731'], ion: ['#090a14', '#172038', '#124e89'], station: ['#10141f', '#151d28', '#253a5e'] }[biome] || ['#10141f', '#1e1d39', '#253a5e'];
    let seed = (n * 977 + biome.length * 131) | 0; const r = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    if (n === 1) {
      g.fillStyle = pal[0]; g.fillRect(0, 0, 320, 180);
      for (let i = 0; i < 9; i++) { const x = r() * 320, y = r() * 180, rr = 20 + r() * 40; g.fillStyle = i % 2 ? pal[1] : pal[2]; g.globalAlpha = 0.35; for (let yy = -rr; yy <= rr; yy += 2) { const w = Math.sqrt(rr * rr - yy * yy) | 0; g.fillRect(Math.round(x - w), Math.round(y + yy), w * 2, 2); g.fillRect(Math.round(x - w + 320) % 320, Math.round(y + yy), 0, 0); } }
      g.globalAlpha = 1;
      for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.7 ? '#253a5e' : '#3a4466'; g.fillRect(r() * 320 | 0, r() * 180 | 0, 1, 1); }
    } else {
      const cnt = [0, 0, 60, 30, 12][n], cols = n === 2 ? ['#3a4466', '#5a6988'] : n === 3 ? ['#8b9bb4', '#5a6988'] : ['#c0cbdc', '#ffffff'];
      for (let i = 0; i < cnt; i++) { g.fillStyle = cols[i % 2]; const x = r() * 320 | 0, y = r() * 180 | 0; g.fillRect(x, y, 1, 1); if (n === 4 && i % 3 === 0) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); } }
      if (biome === 'asteroid' && n === 3) for (let i = 0; i < 4; i++) { const x = r() * 300 + 10, y = r() * 170 + 5; P.disc(g, x, y, 3 + r() * 4, '#202e37'); P.circle(g, x, y, 3 + 1, '#3a4466'); }
      if (biome === 'station' && n === 3) for (let i = 0; i < 3; i++) { g.fillStyle = '#202e37'; g.fillRect(r() * 300 | 0, r() * 170 | 0, 18, 3); }
    }
    return procBg[key] = c;
  }
  const BG_SPEED = [3, 8, 18, 34];
  function drawBg(g, biome, dt) {
    RD.bgT += dt;
    for (let n = 1; n <= 4; n++) {
      const id = 'bg_' + biome + '_' + n; let img, w, h;
      if (NC.assets.has(id)) { const s = NC.assets.get(id); img = s.img; w = s.w; h = s.h; } else { img = procLayer(biome, n); w = 320; h = 180; }
      const oy = Math.round(RD.bgT * BG_SPEED[n - 1]) % h;
      for (let y = oy - h; y < RD.H; y += h) for (let x = 0; x < RD.W; x += w) g.drawImage(img, x, y);
    }
  }

  // ------------------------------------------------------------ pickups (art1 sprites when they have the 3.1 size, else procedural)
  const PK = {
    // 7x7 blue rhombus (palette B rare blue), 4-frame shimmer
    cr: { size: 7, max: 8, frames: 4, rows: ['...o...', '..oLo..', '.oLbbo.', 'oLbbbdo', '.obbdo.', '..odo..', '...o...'],
      pal: { o: '#1d3350', L: '#a9d2ec', b: '#5f93bd', d: '#3b6790' }, shine: [[3, 1], [2, 2], [3, 3], [4, 4]], shineCol: '#eef7ff' },
    // 7x7 green-cyan orb, 2-frame pulse
    xp: { size: 7, max: 8, frames: 2, rows: ['..ooo..', '.oLcbo.', 'oLcbbdo', 'ocbbbdo', 'obbbddo', '.obddo.', '..ooo..'],
      pal: { o: '#173f3b', L: '#d6fff0', c: '#a4ecd2', b: '#4fb39a', d: '#2f7d6c' }, pal2: { o: '#173f3b', L: '#ffffff', c: '#c8f7e6', b: '#6cc9ae', d: '#3a8f7c' } },
    // 4x4 golden light sphere
    star: { size: 4, max: 6, frames: 1, rows: ['.Lb.', 'Lcbb', 'bbbd', '.bd.'], pal: { L: '#fff2cc', c: '#ffe3a0', b: '#e0b064', d: '#b07f3c' } },
  };
  const pkCache = {};
  function pkCanvas(kind) {
    if (pkCache[kind]) return pkCache[kind];
    const d = PK[kind], n = d.size, c = document.createElement('canvas'); c.width = n * d.frames; c.height = n; const g = c.getContext('2d');
    for (let f = 0; f < d.frames; f++) {
      const pal = f % 2 && d.pal2 ? d.pal2 : d.pal;
      d.rows.forEach((row, y) => { for (let x = 0; x < n; x++) { const col = pal[row[x]]; if (col) { g.fillStyle = col; g.fillRect(f * n + x, y, 1, 1); } } });
      if (d.shine) { const [sx, sy] = d.shine[f % d.shine.length]; g.fillStyle = d.shineCol; g.fillRect(f * n + sx, sy, 1, 1); }
    }
    return pkCache[kind] = { img: c, n, frames: d.frames };
  }
  const PK_SPR = { cr: 'pk_crystal', xp: 'pk_xp', star: 'pk_star' };
  RD.pkSprite = (kind) => { const id = PK_SPR[kind], A = NC.assets; return A.has(id) && A.get(id).w <= PK[kind].max ? id : null; };
  function drawPickup(g, it, t) {
    const A = NC.assets, id = RD.pkSprite(it.kind);
    if (it.kind === 'star') { // soft pulsing additive glow under the sphere
      const k = 0.5 + 0.5 * Math.sin(t * 7 + (it.seed || 0));
      NC.fx.drawGlow(g, it.x, it.y, 5.5 + k * 2, '#f2c46a', 0.55 + 0.35 * k);
    }
    if (id) { A.draw(g, id, it.x, it.y, A.frameAt(id, it.t)); return; }
    const c = pkCanvas(it.kind), f = c.frames > 1 ? Math.floor(it.t * (it.kind === 'cr' ? 8 : 5)) % c.frames : 0, h = c.n >> 1;
    g.drawImage(c.img, f * c.n, 0, c.n, c.n, Math.round(it.x) - h, Math.round(it.y) - h, c.n, c.n);
  }

  // ------------------------------------------------------------ main draw
  RD.draw = (dt) => {
    const g = RD.lg, G = X.G, R = X.R;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    const biome = R ? R.biome : 'nebula';
    drawBg(g, biome, G.mode === 'paused' || G.mode === 'cards' ? 0 : dt);
    if (R && G.mode !== 'menu') {
      const F = NC.fx;
      const sh = F.shake > 0 ? [Math.round(U.rnd(-F.shake, F.shake)), Math.round(U.rnd(-F.shake, F.shake))] : [0, 0];
      g.setTransform(1, 0, 0, 1, sh[0], sh[1]);
      drawWorld(g, R, G);
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (R.event && R.event.id === 'ionstorm' && Math.random() < 0.06) { g.globalAlpha = 0.12; g.fillStyle = '#2ce8f5'; g.fillRect(0, 0, RD.W, RD.H); g.globalAlpha = 1; }
      if (F.flash > 0) { g.globalAlpha = Math.min(0.5, F.flash); g.fillStyle = F.flashCol; g.fillRect(0, 0, RD.W, RD.H); g.globalAlpha = 1; }
    }
    const v = RD.g; v.imageSmoothingEnabled = false;
    v.drawImage(RD.lo, 0, 0, RD.W, RD.H, 0, 0, RD.W * RD.kb, RD.H * RD.kb);
  };

  const cb = () => U.settings().colorblind;
  function drawWorld(g, R, G) {
    const A = NC.assets, t = R.time, F = NC.fx, p = R.p;
    // black hole
    if (R.event && R.event.id === 'blackhole' && R.event.bh) { const h = R.event.bh; P.disc(g, h.x, h.y, 7, '#090a14'); for (let i = 0; i < 3; i++) P.circle(g, h.x, h.y, 9 + ((t * 14 + i * 8) % 24), i ? '#402751' : '#68386c'); P.circle(g, h.x, h.y, 8, '#c65197'); }
    // telegraphs: boss mines, artillery shells
    for (const m of R.mines) { const k = m.t / m.arm; if (Math.floor(t * (6 + k * 14)) % 2 === 0) P.circle(g, m.x, m.y, m.r, m.col); P.disc(g, m.x, m.y, 2, '#ffffff'); }
    for (const s of R.shells) { const k = s.t / s.dur; if (Math.floor(t * (5 + k * 12)) % 2 === 0) P.circle(g, s.x, s.y, s.r, '#d77643'); const x = U.lerp(s.x0, s.x, k), y = U.lerp(s.y0, s.y, k) - Math.sin(k * Math.PI) * 40; P.disc(g, x, y, 2, '#feae34'); }
    F.draw(g, 'under');
    // pickups (SPEC-31 §2.7): crystal 7x7 rhombus, xp 7x7 orb, star 4x4 light sphere + additive glow
    for (const it of R.items) {
      const blink = it.life != null && it.life < 2 && !it.home && Math.floor(t * 8) % 2;
      if (blink) continue;
      if (it.kind === 'chest') A.draw(g, 'chest_' + it.r, it.x, it.y + Math.round(Math.sin(it.t * 4)));
      else if (it.kind === 'cr' || it.kind === 'xp' || it.kind === 'star') drawPickup(g, it, t);
      else A.draw(g, it.spr, it.x, it.y, A.frameAt(it.spr, it.t));
    }
    // asteroids (sector event): procedural pixel rocks
    for (const a of R.rocks) { P.disc(g, a.x, a.y, a.r, a.flash > 0 ? '#ffffff' : '#3a4466'); P.disc(g, a.x - 1, a.y - 1, Math.max(1, a.r - 2), a.flash > 0 ? '#ffffff' : '#5a6988'); P.circle(g, a.x, a.y, a.r, '#181425'); }
    // enemies
    for (const e of R.enemies) {
      const id = 'en_' + e.type, fr = A.frameAt(id, e.t);
      let alpha = e.cloaked ? 0.18 : 1; if (e.leaving != null) alpha = Math.max(0, e.leaving / 0.5);
      if (e.elite) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) A.draw(g, id, e.x + ox, e.y + oy, fr, { white: true, alpha: 0.55 * alpha });
      A.draw(g, id, e.x, e.y, fr, { alpha, white: e.flash > 0 });
      if (e.state === 'aim' && e.tx != null) P.dashed(g, e.x, e.y, e.tx, e.ty, '#e43b44', 2, 3);
      if (e.state === 'arm') P.circle(g, e.x, e.y, 22, Math.floor(t * 12) % 2 ? '#ff0044' : '#feae34');
      if (e.shieldBlocks && !e.cloaked) { g.fillStyle = '#2ce8f5'; g.fillRect(Math.round(e.x - 14), Math.round(e.y + e.size / 2 + 1), 28, 1); g.fillRect(Math.round(e.x - 16), Math.round(e.y + e.size / 2), 2, 1); g.fillRect(Math.round(e.x + 14), Math.round(e.y + e.size / 2), 2, 1); }
      if (e.burn && Math.random() < 0.3) F.spark(e.x + U.rnd(-4, 4), e.y, '#f77622', 0, -15, 0.3);
    }
    // bosses
    for (const b of [R.mboss, R.boss]) {
      if (!b) continue;
      let id = b.spr;
      if (b.big) { if (b.hp / b.max < 0.5 && A.has(b.spr + '_dmg')) id = b.spr + '_dmg'; else if (A.has(b.spr + '_anim')) id = b.spr + '_anim'; }
      if (b.atk && b.atk.name === 'ram' && b.atk.tel) P.dashed(g, b.x, b.y, b.atk.tx, b.atk.ty, b.def.col, 4, 3);
      A.draw(g, id, b.x, b.y, A.frameAt(id, b.t), { alpha: b.alpha, white: b.flash > 0 && Math.floor(b.t * 20) % 4 === 0 });
      if (b.inv > 0 && Math.floor(t * 10) % 2) P.circle(g, b.x, b.y, b.r + 4, '#ffffff');
    }
    for (const o of R.orbs) { P.disc(g, o.x, o.y, o.r, o.flash > 0 ? '#ffffff' : o.col); P.circle(g, o.x, o.y, o.r, '#181425'); P.rect(g, o.x - 1, o.y - 2, 2, 1, '#ffffff'); }
    // player projectiles
    for (const b of R.bullets) {
      if (b.kind === 'flame') { A.draw(g, b.spr, b.x, b.y, Math.floor((1 - b.life / b.ml) * 3)); continue; }
      if (b.col && !A.has(b.spr)) { P.rect(g, b.x - 1, b.y - 3, 2, 5, b.col); continue; }
      if (b.kind === 'missile') { // nose points along the flight direction (sprite faces up)
        const s = A.get(b.spr); if (s && s.img) { g.save(); g.translate(Math.round(b.x), Math.round(b.y)); g.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
          const fw = s.w, fh = s.h; g.drawImage(s.img, 0, 0, fw, fh, -Math.round(fw / 2), -Math.round(fh / 2), fw, fh); g.restore(); continue; }
      }
      A.draw(g, b.spr, b.x, b.y, 0, { flipY: b.vy > 30 });
    }
    for (const r of R.rails) { const x2 = r.x + Math.cos(r.ang) * r.len, y2 = r.y + Math.sin(r.ang) * r.len; g.globalAlpha = r.life / r.ml; P.line(g, r.x, r.y, x2, y2, r.evo ? '#fee761' : '#feae34', 3); P.line(g, r.x, r.y, x2, y2, '#ffffff', 1); g.globalAlpha = 1; }
    // turret, companion, orbit blades
    if (R.tur) { if (R.tur.beam) { P.line(g, R.tur.x, R.tur.y, R.tur.beam.x, R.tur.beam.y, '#feae34', 1); } A.draw(g, 'tur_' + R.tur.id, R.tur.x, R.tur.y); }
    if (R.comp) A.draw(g, 'comp_' + R.comp.id, R.comp.x, R.comp.y);
    if (R.m.orbit > 0 && p.alive) for (let i = 0; i < R.m.orbit; i++) { const a = R.orbitA + i / R.m.orbit * U.TAU, bx = Math.round(p.x + Math.cos(a) * 24), by = Math.round(p.y + Math.sin(a) * 24); P.rect(g, bx - 1, by, 3, 1, '#2ce8f5'); P.rect(g, bx, by - 1, 1, 3, '#2ce8f5'); P.rect(g, bx, by, 1, 1, '#ffffff'); }
    // player
    if (p.alive) {
      const blink = p.inv > 0 && R.buffs.shield <= 0 && Math.floor(t * 16) % 2;
      if (p.dashT > 0) for (let i = 1; i <= 2; i++) A.draw(g, 'ship_' + R.st.shipId, p.x - p.vx * 0.02 * i, p.y - p.vy * 0.02 * i, 0, { white: true, alpha: 0.25 });
      A.draw(g, 'fx_thruster', p.x, p.y + 18, A.frameAt('fx_thruster', t));
      if (!blink) A.draw(g, 'ship_' + R.st.shipId, p.x, p.y, 0, { white: p.hurtT > 0.2, alpha: R.st.flags && R.st.flags.stealth && p.inv > 0 ? 0.6 : 1 });
      if (R.buffs.shield > 0) A.draw(g, 'fx_shield', p.x, p.y, A.frameAt('fx_shield', t), { alpha: R.buffs.shield < 2 && Math.floor(t * 8) % 2 ? 0.4 : 0.9 });
      if (R.buffs.magnet > 0 && Math.floor(t * 4) % 2) P.circle(g, p.x, p.y, 20, '#2ce8f5');
    }
    // enemy bullets
    const colorblind = cb();
    for (const b of R.ebullets) {
      A.draw(g, b.spr, b.x, b.y);
      if (colorblind) { if (b.spr === 'eb_big') { P.circle(g, b.x, b.y, 6, '#ffffff'); } else { P.rect(g, b.x - 4, b.y, 9, 1, '#ffffff'); P.rect(g, b.x, b.y - 4, 1, 9, '#ffffff'); } }
    }
    // beams
    for (const bm of R.beams) {
      const x2 = bm.x + Math.cos(bm.ang) * bm.len, y2 = bm.y + Math.sin(bm.ang) * bm.len;
      if (bm.t < bm.charge) { if (Math.floor(t * 14) % 2) P.line(g, bm.x, bm.y, x2, y2, bm.col, 1); }
      else { P.line(g, bm.x, bm.y, x2, y2, bm.col, Math.max(2, Math.round(bm.w))); P.line(g, bm.x, bm.y, x2, y2, '#ffffff', Math.max(1, Math.round(bm.w / 3))); }
    }
    F.draw(g, 'over');
  }

  // Draws a ship preview into any canvas at integer scale (for UI / loading screen helpers)
  RD.drawShip = (canvas, shipId, scale) => {
    const s = NC.assets.get('ship_' + shipId), k = Math.max(1, Math.round(scale || Math.floor(Math.min(canvas.width, canvas.height) / s.w)));
    const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(s.img, 0, 0, s.w, s.h, Math.round((canvas.width - s.w * k) / 2), Math.round((canvas.height - s.h * k) / 2), s.w * k, s.h * k);
  };
})(window.NC = window.NC || {});
