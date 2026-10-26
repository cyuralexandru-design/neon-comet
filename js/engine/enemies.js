'use strict';
// Neon Comet 3.1 engine: enemy roster per sector (SPEC §6.5), spawning and AI. Enemies mostly come from the top.
// 3.1: resting/hover positions stay below the top HUD (NC.game.hudTop + 4, SPEC-31 §2.4); entering ones dive below it fast.
(function (NC) {
  const U = NC.U, X = NC.eng = NC.eng || {};
  const F = () => NC.fx;
  const EN = NC.enemies = {};

  // size = sprite px; hp/dmg base values; score/cr/xp per kill (economy may override via NC.DATA.enemies[id])
  EN.DEFS = {
    drone: { size: 16, hp: 30, dmg: 10, sp: 26, score: 110, cr: 4, xp: 3, ai: 'drone', col: '#e43b44' },
    dart: { size: 16, hp: 22, dmg: 12, sp: 95, score: 120, cr: 4, xp: 3, ai: 'dart', col: '#f6757a' },
    mine: { size: 16, hp: 40, dmg: 22, sp: 14, score: 130, cr: 5, xp: 3, ai: 'mine', col: '#ff0044' },
    hunter: { size: 24, hp: 70, dmg: 14, sp: 52, score: 220, cr: 7, xp: 5, ai: 'hunter', col: '#f77622' },
    gunner: { size: 24, hp: 90, dmg: 12, sp: 30, score: 260, cr: 8, xp: 6, ai: 'gunner', col: '#b55088' },
    splitter: { size: 32, hp: 160, dmg: 18, sp: 16, score: 380, cr: 10, xp: 8, ai: 'splitter', col: '#63c74d' },
    shard: { size: 16, hp: 25, dmg: 10, sp: 55, score: 50, cr: 2, xp: 1, ai: 'shard', col: '#63c74d', child: true },
    charger: { size: 24, hp: 120, dmg: 24, sp: 24, score: 320, cr: 9, xp: 7, ai: 'charger', col: '#e43b44' },
    sentinel: { size: 32, hp: 260, dmg: 16, sp: 14, score: 600, cr: 14, xp: 11, ai: 'sentinel', col: '#2ce8f5' },
    wraith: { size: 24, hp: 150, dmg: 14, sp: 40, score: 480, cr: 12, xp: 9, ai: 'wraith', col: '#c65197' },
    carrier: { size: 40, hp: 420, dmg: 20, sp: 12, score: 900, cr: 20, xp: 15, ai: 'carrier', col: '#feae34' },
    mini: { size: 12, hp: 20, dmg: 8, sp: 70, score: 40, cr: 1, xp: 1, ai: 'mini', col: '#feae34', child: true },
    bulwark: { size: 40, hp: 380, dmg: 22, sp: 18, score: 850, cr: 18, xp: 14, ai: 'bulwark', col: '#8b9bb4' },
    artillery: { size: 32, hp: 300, dmg: 26, sp: 16, score: 700, cr: 16, xp: 12, ai: 'artillery', col: '#d77643' },
  };
  // sector -> roster. Each sector introduces types and retires old weak ones.
  EN.ROSTER = [
    ['drone', 'dart', 'mine'],
    ['dart', 'mine', 'hunter', 'gunner'],
    ['mine', 'hunter', 'gunner', 'splitter', 'charger'],
    ['hunter', 'gunner', 'splitter', 'charger', 'sentinel', 'wraith'],
    ['gunner', 'splitter', 'charger', 'sentinel', 'wraith', 'carrier', 'bulwark'],
    ['gunner', 'splitter', 'charger', 'sentinel', 'wraith', 'carrier', 'bulwark', 'artillery'],
  ];
  EN.NEW = [['drone', 'dart', 'mine'], ['hunter', 'gunner'], ['splitter', 'charger'], ['sentinel', 'wraith'], ['carrier', 'bulwark'], ['artillery']];
  EN.roster = (sector) => { const D = NC.DATA; if (D && D.rosterFor) { const l = D.rosterFor(Math.min(sector, 5)).map(e => e.id).filter(id => EN.DEFS[id]); if (l.length) return l; } return EN.ROSTER[Math.min(sector, EN.ROSTER.length - 1)]; };
  const DE = (id) => NC.DATA && Array.isArray(NC.DATA.ENEMIES) ? NC.DATA.ENEMIES.find(e => e.id === id) : null;
  EN.def = (id) => { // engine AI/speeds + economy numbers (hp, dmg, points, cr, xp) from NC.DATA.ENEMIES
    const d = Object.assign({ id }, EN.DEFS[id]), D = DE(id);
    if (D) { for (const k of ['hp', 'dmg', 'cr', 'xp']) if (typeof D[k] === 'number') d[k] = D[k]; if (typeof D.points === 'number') d.score = D.points; }
    return d;
  };
  for (const [id, d] of Object.entries(EN.DEFS)) NC.assets.declare('en_' + id, d.size, d.size, 2, 6);

  EN.target = (sector, mini) => {
    const D = NC.DATA || {}, max = D.ENEMY_MAX || 20;
    const t = Math.min(max, D.targetCount ? D.targetCount(sector) : 8 + 2 * sector);
    return mini ? Math.max(3, Math.floor(t * (D.MBOSS_SPAWN_FACTOR || 0.5))) : t;
  };
  EN.pickType = (sector) => {
    const fresh = EN.NEW[Math.min(sector, EN.NEW.length - 1)];
    const D = NC.DATA;
    if (D && D.rosterFor) { const l = D.rosterFor(Math.min(sector, 5)).filter(e => EN.DEFS[e.id]); if (l.length) return U.weighted(l.map(e => [e.id, e.w * (fresh.includes(e.id) ? 1.5 : 1)])); }
    const list = EN.roster(sector);
    return U.weighted(list.map(id => [id, (fresh.includes(id) ? 1.6 : 1) * (id === 'mine' ? 0.6 : id === 'carrier' || id === 'bulwark' ? 0.6 : 1)]));
  };
  // top of the playable band for an enemy centre (whole sprite below the HUD) and a band of `span` px under it
  const top = (e) => (X.safeTop ? X.safeTop() : 26) + (e.size || 16) * 0.5;
  const band = (e, y, span) => U.clamp(y, top(e), Math.max(top(e), Math.min(top(e) + span, X.G.H * 0.62)));
  EN.top = top;
  const scale0 = (sector) => (NC.DATA && NC.DATA.sectorScale ? NC.DATA.sectorScale(sector) : { hp: 1 + 0.08 * Math.min(sector, 10), dmg: 1 + 0.05 * Math.min(sector, 10) });
  const scale = (sector) => { const s = scale0(sector), d = (NC.game && NC.game.diffMul && NC.game.diffMul()) || { hp: 1, dmg: 1 }; return Object.assign({}, s, { hp: s.hp * d.hp, dmg: s.dmg * d.dmg }); };

  // spawn(type, {x,y,elite,parent}) ; returns enemy or null when the 20 cap is reached
  EN.spawn = (type, o = {}) => {
    const R = X.R, G = X.G;
    if (R.enemies.length >= ((NC.DATA && NC.DATA.ENEMY_MAX) || 20)) return null;
    const d = EN.def(type), s = d.size, EL = (NC.DATA && NC.DATA.ELITE) || { from: 5, chance: () => 0.15, hp: 2.5, dmg: 1.3 }, sc = scale(R.sector);
    const elite = o.elite != null ? o.elite : (R.sector >= EL.from && !d.child && Math.random() < (typeof EL.chance === 'function' ? EL.chance(R.sector) : EL.chance));
    const hp = d.hp * sc.hp * (elite ? EL.hp : 1);
    const fromTop = o.x == null;
    const e = {
      kind: 'enemy', type, d, size: s, r: Math.max(4, Math.round(s * 0.38)), elite,
      x: fromTop ? U.rnd(s, G.W - s) : o.x, y: fromTop ? -s / 2 - U.rnd(0, 20) : o.y,
      vx: 0, vy: fromTop ? Math.max(d.sp + 20, 70) : 0, hp, max: hp, dmg: d.dmg * (elite ? EL.dmg : 1) * sc.dmg,
      t: U.rnd(0, 3), flash: 0, entering: fromTop, state: 'idle', st: U.rnd(1, 2.5), fireT: U.rnd(1.2, 2.6), seed: Math.random() * 10, burn: null,
    };
    e.homeY = U.rnd(top(e), Math.max(top(e) + 8, G.H * 0.45));
    if (type === 'hunter' && fromTop && Math.random() < 0.4) { const left = Math.random() < 0.5; e.x = left ? -s : G.W + s; e.y = U.rnd(top(e), Math.max(top(e) + 8, G.H * 0.5)); e.vx = left ? 40 : -40; e.vy = 0; e.entering = false; }
    if (type === 'bulwark') e.shieldBlocks = (ang) => !e.cloaked && Math.abs(U.angDiff(ang, -Math.PI / 2)) < 1.0;
    if (o.vx != null) { e.vx = o.vx; e.vy = o.vy; e.entering = false; }
    R.enemies.push(e);
    R.stats.maxOnScreen = Math.max(R.stats.maxOnScreen, R.enemies.length);
    R.seenTypes[type] = R.seenTypes[type] || R.sector;
    if (elite && X.onElite) X.onElite(e);
    return e;
  };

  const lead = (x, y, sp) => { const p = X.R.p; let tx = p.x, ty = p.y; for (let i = 0; i < 2; i++) { const t = Math.min(1.2, Math.hypot(tx - x, ty - y) / sp); tx = p.x + p.vx * t; ty = p.y + p.vy * t; } return { x: tx, y: ty }; };
  EN.lead = lead;
  const aimAt = (e, sp) => { const t = lead(e.x, e.y, sp); return Math.atan2(t.y - e.y, t.x - e.x); };
  const steer = (e, tx, ty, sp, k, dt) => { const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1, s = Math.min(sp, d * 2); e.vx += (dx / d * s - e.vx) * Math.min(1, dt * k); e.vy += (dy / d * s - e.vy) * Math.min(1, dt * k); };

  EN.update = (dt) => {
    const R = X.R, G = X.G, p = R.p;
    for (const e of R.enemies) {
      if (e.dead) continue;
      if (e.leaving != null) { e.leaving -= dt; e.y -= 60 * dt; if (e.leaving <= 0) { e.dead = true; e.silent = true; F().anim('fx_spark', e.x, e.y); } continue; }
      e.t += dt; e.flash = Math.max(0, e.flash - dt);
      if (e.burn) { e.burn.t -= dt; e.burnTick = (e.burnTick || 0) - dt; if (e.burnTick <= 0) { e.burnTick = 0.25; X.damage(e, e.burn.dps * 0.25, false, e.x, e.y, { quiet: true }); } if (e.burn && e.burn.t <= 0) e.burn = null; if (e.dead) continue; }
      if (X.tickDots) { X.tickDots(e, dt); if (e.dead) continue; }
      if (e.entering) { e.y += e.vy * dt; if (e.y >= top(e)) { e.entering = false; e.vy = e.d.sp * 0.5; } continue; }
      if (e.ally) { if (EN.allyAI) EN.allyAI(e, dt); } // story hooks: hijacked ally / stunned
      else if (e.stun > 0) { e.stun -= dt; e.vx *= Math.pow(0.02, dt); e.vy *= Math.pow(0.02, dt); }
      else ai(e, dt, R, G, p);
      if (R.event && R.event.id === 'blackhole') X.gravity(e, dt, 0.25);
      const sk = e.slowT > 0 ? (e.slowK || 0.5) : 1; // card freeze
      e.x += e.vx * dt * sk; e.y += e.vy * dt * sk;
      const h = e.size / 2;
      if (e.ai !== 'free') {
        if (e.x < h) { e.x = h; e.vx = Math.abs(e.vx); } else if (e.x > G.W - h) { e.x = G.W - h; e.vx = -Math.abs(e.vx); }
        if (e.wrap) { if (e.y > G.H + e.size) { e.y = -e.size; e.x = U.rnd(h, G.W - h); e.wrap = false; e.state = 'idle'; e.st = U.rnd(1, 2); e.vy = Math.max(e.d.sp + 20, 70); e.vx = 0; e.entering = true; e.homeY = U.rnd(top(e), Math.max(top(e) + 8, G.H * 0.4)); } }
        else if (e.y > G.H - h) { e.y = G.H - h; e.vy = -Math.abs(e.vy); }
        // HUD safe zone: never rest/hover under the top HUD -> eased back down (no snapping)
        const ty = top(e);
        if (!e.wrap && e.y < ty) { e.y += (ty - e.y) * Math.min(1, dt * 6) + 4 * dt; if (e.vy < 0) e.vy = -e.vy * 0.5; }
      }
      // contact with player
      if (p.alive && !e.cloaked && !e.ally && U.d2(e.x, e.y, p.x, p.y) < (e.r + p.r) ** 2) X.contact(e);
    }
  };

  function ai(e, dt, R, G, p) {
    const d = e.d, sp = d.sp;
    switch (d.ai) {
      case 'drone': {
        const tx = U.clamp(G.W / 2 + Math.sin(e.t * 0.6 + e.seed) * G.W * 0.42, 10, G.W - 10), ty = Math.max(top(e), e.homeY + Math.sin(e.t * 1.3 + e.seed) * 12);
        steer(e, tx, ty, sp, 1.5, dt);
        if (Math.random() < dt * 0.05) e.homeY = U.rnd(top(e), Math.max(top(e) + 8, G.H * 0.6));
        break;
      }
      case 'dart': {
        e.st -= dt;
        if (e.state === 'idle') { steer(e, U.clamp(p.x + Math.sin(e.seed) * 40, 10, G.W - 10), Math.max(top(e), e.homeY), 60, 2, dt); if (e.st <= 0) { e.state = 'dive'; e.wrap = true; } }
        else { e.vy = Math.min(sp * 1.6, e.vy + 160 * dt); e.vx += U.clamp(p.x - e.x, -1, 1) * 40 * dt; }
        break;
      }
      case 'mine': {
        e.vx = Math.sin(e.t * 0.5 + e.seed) * sp; e.vy = Math.cos(e.t * 0.4 + e.seed) * sp * 0.6 + (e.y < G.H * 0.5 ? 4 : -4) + (e.y < top(e) + 6 ? sp : 0);
        if (e.state === 'idle' && p.alive && U.d2(e.x, e.y, p.x, p.y) < 26 * 26) { e.state = 'arm'; e.st = 0.7; U.sfx('warn'); }
        if (e.state === 'arm') { e.vx = e.vy = 0; e.st -= dt; e.flash = Math.floor(e.st * 10) % 2 ? 0.05 : 0; if (e.st <= 0) { X.blast(e.x, e.y, 22, e.dmg, '#ff0044'); e.dead = true; e.silent = true; } }
        break;
      }
      case 'hunter': case 'mini': steer(e, p.x, Math.max(top(e), p.y - (d.ai === 'mini' ? 0 : 6)), sp, d.ai === 'mini' ? 2.5 : 1.2, dt); break;
      case 'shard': if (!e.vx && !e.vy) { const a = U.rnd(0, U.TAU); e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; } break;
      case 'gunner': {
        steer(e, U.clamp(G.W / 2 + Math.sin(e.t * 0.5 + e.seed) * G.W * 0.4, 12, G.W - 12), band(e, e.homeY, 44), sp, 1.2, dt);
        e.fireT -= dt;
        if (e.fireT <= 0) {
          const a = aimAt(e, 75), n = R.sector >= 3 ? 3 : 1;
          for (let i = 0; i < n; i++) X.eshoot(e.x, e.y + 6, a + (i - (n - 1) / 2) * 0.22, 75, e.dmg, 'eb_small');
          e.fireT = U.rnd(2, 2.8); U.sfx('hit');
        }
        break;
      }
      case 'splitter': if (Math.abs(e.vx) + Math.abs(e.vy) < 4) { const a = U.rnd(0.3, Math.PI - 0.3); e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; } break;
      case 'charger': {
        e.st -= dt;
        if (e.state === 'idle') { steer(e, U.clamp(p.x, 12, G.W - 12), band(e, e.homeY, 54), sp * 2, 1, dt); if (e.st <= 0) { e.state = 'aim'; e.st = 0.75; } }
        else if (e.state === 'aim') { e.vx *= 0.8; e.vy *= 0.8; const t = lead(e.x, e.y, 200); e.tx = t.x; e.ty = t.y; if (e.st <= 0) { const a = Math.atan2(e.ty - e.y, e.tx - e.x); e.vx = Math.cos(a) * 200; e.vy = Math.sin(a) * 200; e.state = 'go'; e.st = 0.9; e.wrap = true; } }
        else if (e.state === 'go' && e.st <= 0) { e.state = 'idle'; e.st = U.rnd(1.5, 2.5); e.wrap = false; e.vx *= 0.2; e.vy = -20; }
        break;
      }
      case 'sentinel': {
        steer(e, U.clamp(G.W * (0.2 + 0.6 * ((e.seed * 7) % 1)) + Math.sin(e.t * 0.3) * 30, 16, G.W - 16), band(e, e.homeY, 37), sp, 1, dt);
        e.fireT -= dt;
        if (e.fireT <= 0) { X.R.beams.push({ src: e, x: e.x, y: e.y, ang: Math.atan2(p.y - e.y, p.x - e.x), len: 640, w: 5, charge: 1.1, fire: 0.5, t: 0, dmg: e.dmg * 2, tick: 0, owner: 'enemy', col: '#2ce8f5' }); e.fireT = U.rnd(4.2, 5.4); U.sfx('beam_charge'); }
        break;
      }
      case 'wraith': {
        e.st -= dt;
        if (e.state === 'idle') { steer(e, e.tx || e.x, Math.max(top(e), e.ty || e.y), sp, 1.5, dt); if (e.st <= 0) { const a = aimAt(e, 80); for (let i = -1; i <= 1; i++) X.eshoot(e.x, e.y, a + i * 0.25, 80, e.dmg, 'eb_small'); e.state = 'cloak'; e.st = 2; e.cloaked = true; e.untargetable = true; e.tx = U.rnd(16, G.W - 16); e.ty = U.rnd(top(e), Math.max(top(e) + 8, G.H * 0.5)); } }
        else { steer(e, e.tx, e.ty, sp * 1.6, 2, dt); if (e.st <= 0) { e.state = 'idle'; e.st = 2.4; e.cloaked = false; e.untargetable = false; } }
        break;
      }
      case 'carrier': {
        steer(e, U.clamp(G.W / 2 + Math.sin(e.t * 0.25 + e.seed) * G.W * 0.35, 22, G.W - 22), top(e) + 4, sp, 0.8, dt);
        e.fireT -= dt;
        if (e.fireT <= 0) { for (let i = 0; i < 3; i++) EN.spawn('mini', { x: e.x + U.rnd(-8, 8), y: e.y + 10, vx: U.rnd(-30, 30), vy: 40, elite: false }); e.fireT = U.rnd(3.6, 4.6); F().ring(e.x, e.y, e.d.col, 22, 0.3); }
        break;
      }
      case 'bulwark': {
        steer(e, U.clamp(p.x, 22, G.W - 22), band(e, e.homeY, 36), sp, 0.8, dt);
        e.fireT -= dt;
        if (e.fireT <= 0) { X.eshoot(e.x, e.y + 12, aimAt(e, 60), 60, e.dmg * 1.2, 'eb_big'); e.fireT = U.rnd(2.8, 3.6); }
        break;
      }
      case 'artillery': {
        steer(e, U.clamp(G.W * ((e.seed * 3) % 1), 18, G.W - 18), band(e, e.homeY, 29), sp, 1, dt);
        e.fireT -= dt;
        if (e.fireT <= 0) { const t = lead(e.x, e.y, 90); X.R.shells.push({ x0: e.x, y0: e.y, x: U.clamp(t.x, 6, G.W - 6), y: U.clamp(t.y, 6, G.H - 6), t: 0, dur: 1.3, r: 18, dmg: e.dmg }); e.fireT = U.rnd(3.2, 4); }
        break;
      }
      default: if (EN.AI[d.ai]) EN.AI[d.ai](e, dt, R, G, p); // extra AIs registered by js/story/engine.js
    }
  }
  EN.AI = {}; EN.DEATH = {}; EN.steer = steer; EN.aimAt = aimAt; EN.band = band;

  // on death (after rewards): splitter splits
  EN.onDeath = (e) => {
    if (EN.DEATH[e.type]) EN.DEATH[e.type](e);
    if (e.type === 'splitter' && !e.silent) for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i - 1) * 1.2 + Math.PI; EN.spawn('shard', { x: e.x, y: e.y, vx: Math.cos(a) * 55, vy: Math.sin(a) * 55, elite: false }); }
  };
})(window.NC = window.NC || {});
