'use strict';
// Neon Comet 3.1 engine: effects (particles, rings, sprite explosions, additive glows, pixel damage numbers, shake/flash)
// and pixel-exact drawing primitives (NC.px). Everything is in logical pixels. UI-ish colours use palette B (NC.fx.COL).
(function (NC) {
  const U = NC.U;
  // ------------------------------------------------------------ pixel primitives (no anti-aliasing)
  const P = NC.px = {};
  P.rect = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  P.circle = (g, cx, cy, r, col) => { // 1px outline circle (midpoint)
    cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r); if (r <= 0) { g.fillStyle = col; g.fillRect(cx, cy, 1, 1); return; }
    g.fillStyle = col; let x = r, y = 0, err = 1 - r;
    while (x >= y) {
      g.fillRect(cx + x, cy + y, 1, 1); g.fillRect(cx + y, cy + x, 1, 1); g.fillRect(cx - y, cy + x, 1, 1); g.fillRect(cx - x, cy + y, 1, 1);
      g.fillRect(cx - x, cy - y, 1, 1); g.fillRect(cx - y, cy - x, 1, 1); g.fillRect(cx + y, cy - x, 1, 1); g.fillRect(cx + x, cy - y, 1, 1);
      y++; if (err < 0) err += 2 * y + 1; else { x--; err += 2 * (y - x) + 1; }
    }
  };
  P.disc = (g, cx, cy, r, col) => { // filled circle using horizontal spans
    cx = Math.round(cx); cy = Math.round(cy); r = Math.max(0, Math.round(r)); g.fillStyle = col;
    for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.8)); g.fillRect(cx - w, cy + y, w * 2 + 1, 1); }
  };
  P.line = (g, x0, y0, x1, y1, col, w = 1) => { // Bresenham, w = square brush size
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    g.fillStyle = col; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0; const o = Math.floor(w / 2);
    for (;;) {
      g.fillRect(x0 - o, y0 - o, w, w);
      if ((x0 === x1 && y0 === y1) || ++n > 4000) break;
      const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };
  P.dashed = (g, x0, y0, x1, y1, col, on = 3, off = 3) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / (on + off)); const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
    for (let i = 0; i <= n; i++) { const a = i * (on + off), b = Math.min(len, a + on); P.line(g, x0 + ux * a, y0 + uy * a, x0 + ux * b, y0 + uy * b, col); }
  };
  // 3x5 pixel font for numbers and a few symbols
  const GL = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
    '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111',
    '+': '000010111010000', '-': '000000111000000', 'x': '000101010101000', 'k': '100101110101101', 'M': '101111111101101',
    '.': '000000000000010', '!': '010010010000010', 'B': '110101110101110', '%': '101001010100101',
  };
  P.text = (g, str, x, y, col, scale = 1, shadow = '#090a14') => { // x = center
    str = String(str); const w = str.length * 4 * scale - scale; let cx = Math.round(x - w / 2); y = Math.round(y);
    for (const ch of str) {
      const gl = GL[ch];
      if (gl) for (let i = 0; i < 15; i++) if (gl[i] === '1') {
        const px = cx + (i % 3) * scale, py = y + Math.floor(i / 3) * scale;
        if (shadow) { g.fillStyle = shadow; g.fillRect(px + scale, py + scale, scale, scale); }
        g.fillStyle = col; g.fillRect(px, py, scale, scale);
      }
      cx += 4 * scale;
    }
  };

  // ------------------------------------------------------------ effect state
  const QCAP = { high: 700, med: 380, low: 160 };
  const F = NC.fx = { parts: [], rings: [], anims: [], pops: [], bolts: [], glows: [], shake: 0, flash: 0, flashCol: '#fff', hitstop: 0 };
  // palette B (SPEC-31 §1) for canvas UI-ish colours: damage numbers, rarity tints
  F.COL = { ink: '#e2e6ec', dim: '#8a94a3', amber: '#d6a35a', cyan: '#73b9c6', red: '#b0605a', bad: '#c0645c', good: '#78a86c', xp: '#e09a3e',
    r: ['#78a86c', '#5f93bd', '#9a78b8', '#d6a35a', '#c0645c'] };
  F.rarityCol = (r) => { const R = NC.DATA && NC.DATA.RARITY && NC.DATA.RARITY[r]; return (R && R.col) || F.COL.r[r] || F.COL.ink; };
  // soft radial glow sprites (cached per colour), drawn additively
  const glowCache = {};
  F.glowImg = (col) => {
    if (glowCache[col]) return glowCache[col];
    const c = document.createElement('canvas'), n = 32; c.width = c.height = n; const g = c.getContext('2d');
    const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    gr.addColorStop(0, col); gr.addColorStop(0.35, col + '99'); gr.addColorStop(1, col + '00');
    g.fillStyle = gr; g.fillRect(0, 0, n, n);
    return glowCache[col] = c;
  };
  // draws an additive glow of radius r (logical px) centred on x,y
  F.drawGlow = (g, x, y, r, col, a) => {
    if (a <= 0 || r <= 0) return;
    const img = F.glowImg(col), op = g.globalCompositeOperation, oa = g.globalAlpha;
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = oa * Math.min(1, a);
    g.drawImage(img, Math.round(x - r), Math.round(y - r), Math.round(r * 2), Math.round(r * 2));
    g.globalCompositeOperation = op; g.globalAlpha = oa;
  };
  const cap = () => QCAP[U.settings().quality] || QCAP.high;
  F.reset = () => { F.parts.length = 0; F.rings.length = 0; F.anims.length = 0; F.pops.length = 0; F.bolts.length = 0; F.glows.length = 0; F.shake = F.flash = F.hitstop = 0; };
  F.headless = false; // simulate() turns visual spawning off
  F.burst = (x, y, col, n, sp, life = 0.5, size = 1) => {
    if (F.headless) return;
    const c = cap(); if (F.parts.length > c) return; n = Math.ceil(n * (c / 700 * 0.7 + 0.3));
    for (let i = 0; i < n; i++) { const a = Math.random() * U.TAU, v = U.rnd(sp * 0.2, sp); F.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: U.rnd(life * 0.4, life), ml: life, col, s: Math.random() < 0.3 ? size + 1 : size, drag: 0.08 }); }
  };
  F.spark = (x, y, col, vx, vy, life = 0.3) => { if (F.headless || F.parts.length > cap()) return; F.parts.push({ x, y, vx, vy, life, ml: life, col, s: 1, drag: 0.2 }); };
  F.ring = (x, y, col, max, life = 0.4) => { if (F.headless) return; F.rings.push({ x, y, col, r: 2, max, life, ml: life }); };
  F.anim = (id, x, y, fps, opts) => { if (F.headless) return; const s = NC.assets.get(id); F.anims.push(Object.assign({ id, x, y, t: 0, fps: fps || s.fps || 16, frames: s.frames }, s.hd && s.frames === 1 ? { loop: 0.32, hd1: true } : null, opts)); }; // HD single image: 0.32 s grow + fade
  F.pop = (x, y, txt, col, life = 0.7) => { if (F.headless) return; if (F.pops.length > 40) F.pops.shift(); F.pops.push({ x, y, txt, col, life, ml: life, vy: -22 }); };
  F.dmg = (x, y, v, crit) => { if (F.headless || !U.settings().dmgNum) return; F.pop(x + U.rnd(-4, 4), y - 4, U.fmt(v), crit ? F.COL.amber : F.COL.ink, crit ? 0.7 : 0.5); };
  F.glow = (x, y, r, col, life = 0.3) => { if (F.headless || F.glows.length > 40) return; F.glows.push({ x, y, r, col, life, ml: life }); };
  F.bolt = (x1, y1, x2, y2, col, life = 0.12) => { if (F.headless) return; F.bolts.push({ x1, y1, x2, y2, col, life, seed: Math.random() * 1000 }); };
  F.doShake = (v) => { if (U.settings().shake !== false) F.shake = Math.max(F.shake, v); };
  F.doFlash = (col, a) => { F.flash = Math.max(F.flash, a); F.flashCol = col; };
  // size in px (sprite size of the thing that exploded). The fireball scales with it (s: <=12, m: 13-28, l: >=29; big ones get
  // extra offset blasts) and plays a bit slower than the sheet (12-13 fps) with an additive glow so it stays readable.
  F.explode = (x, y, size, col) => {
    const id = size >= 29 ? 'fx_explode_l' : size >= 13 ? 'fx_explode_m' : 'fx_explode_s';
    F.anim(id, x, y, size >= 13 ? 12 : 14);
    if (size >= 38) for (let i = 0; i < 2; i++) F.anim('fx_explode_m', x + U.rnd(-size * 0.35, size * 0.35), y + U.rnd(-size * 0.3, size * 0.3), 13, { t: -0.08 - i * 0.1 });
    F.glow(x, y, Math.max(7, size * 0.85), '#f0a850', size >= 29 ? 0.4 : 0.28);
    F.burst(x, y, col || '#feae34', 4 + size / 3, 30 + size * 1.5, 0.5); F.burst(x, y, '#ffffff', 3, 25, 0.25);
    if (size >= 22) F.doShake(Math.min(4, size / 12));
    U.sfx(size >= 40 ? 'explode_l' : size >= 22 ? 'explode_m' : 'explode_s');
  };
  F.update = (dt) => {
    for (const q of F.parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; const d = Math.pow(q.drag, dt); q.vx *= d; q.vy *= d; }
    F.parts = F.parts.filter(q => q.life > 0);
    for (const r of F.rings) { r.life -= dt; r.r += (r.max - r.r) * Math.min(1, dt * 9); }
    F.rings = F.rings.filter(r => r.life > 0);
    for (const a of F.anims) { a.t += dt; if (a.vy) a.y += a.vy * dt; }
    F.anims = F.anims.filter(a => a.loop ? a.t < a.loop : a.t * a.fps < a.frames);
    for (const p of F.pops) { p.life -= dt; p.y += p.vy * dt; p.vy *= Math.pow(0.08, dt); }
    F.pops = F.pops.filter(p => p.life > 0);
    for (const b of F.bolts) b.life -= dt;
    for (const q of F.glows) q.life -= dt;
    F.glows = F.glows.filter(q => q.life > 0);
    F.bolts = F.bolts.filter(b => b.life > 0);
    F.shake = Math.max(0, F.shake - dt * 18); F.flash = Math.max(0, F.flash - dt * 2.2);
  };
  F.draw = (g, layer) => {
    if (layer === 'under') { // rings & bolts under sprites
      for (const r of F.rings) { g.globalAlpha = Math.max(0, r.life / r.ml); P.circle(g, r.x, r.y, r.r, r.col); }
      g.globalAlpha = 1; return;
    }
    for (const q of F.glows) { const k = q.life / q.ml; F.drawGlow(g, q.x, q.y, q.r * (1.25 - 0.25 * k), q.col, k * 0.9); }
    for (const a of F.anims) if (a.t >= 0) { if (a.hd1) { const k = a.t / a.loop; NC.assets.draw(g, a.id, a.x, a.y, 0, { alpha: (a.alpha == null ? 1 : a.alpha) * (1 - k * k), scale: 0.7 + 0.5 * k }); } else NC.assets.draw(g, a.id, a.x, a.y, Math.floor(a.t * a.fps), { alpha: a.alpha }); }
    for (const q of F.parts) { g.globalAlpha = q.life / q.ml > 0.5 ? 1 : 0.6; g.fillStyle = q.col; g.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s); }
    g.globalAlpha = 1;
    for (const b of F.bolts) { // jagged lightning
      let px = b.x1, py = b.y1; const n = Math.max(2, Math.floor(Math.hypot(b.x2 - b.x1, b.y2 - b.y1) / 8));
      for (let i = 1; i <= n; i++) {
        const t = i / n, j = i === n ? 0 : (Math.sin(b.seed + i * 12.9) * 4);
        const nx = U.lerp(b.x1, b.x2, t) + j, ny = U.lerp(b.y1, b.y2, t) - j * 0.5;
        P.line(g, px, py, nx, ny, b.col); px = nx; py = ny;
      }
    }
    for (const p of F.pops) { g.globalAlpha = Math.min(1, p.life / p.ml * 2); P.text(g, p.txt, p.x, p.y, p.col); }
    g.globalAlpha = 1;
  };
})(window.NC = window.NC || {});
