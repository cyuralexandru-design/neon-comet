'use strict';
// Neon Comet 3.1 engine: player weapons (5 types + evolutions), companion, turret, card abilities (missiles, orbit blades),
// player projectile simulation and collision. Shares internals through NC.eng (X).
(function (NC) {
  const U = NC.U, X = NC.eng = NC.eng || {};
  const F = () => NC.fx;
  const W = NC.weapons = {};

  // dmg = multiplier of ship attack per projectile, rate = shots per second at fire-rate 1.0
  W.DEFS = {
    laser: { dmg: 1.0, rate: 4.5, speed: 260, spr: 'proj_laser', pierce: 0, evo: 'prism', sfx: 'shoot_laser', col: '#2ce8f5' },
    plasma: { dmg: 2.4, rate: 1.6, speed: 140, spr: 'proj_plasma', pierce: 2, evo: 'nova_orb', sfx: 'shoot_plasma', col: '#b55088' },
    missile: { dmg: 2.1, rate: 1.5, speed: 80, spr: 'proj_missile', pierce: 0, aoe: 11, homing: 5, evo: 'swarm', sfx: 'shoot_missile', col: '#f77622' },
    rail: { dmg: 4.4, rate: 0.95, speed: 0, spr: 'proj_rail', pierce: 99, evo: 'annihilator', sfx: 'shoot_rail', col: '#fee761' },
    flame: { dmg: 0.42, rate: 13, speed: 115, spr: 'proj_flame', pierce: 99, life: 0.38, spread: 0.32, burn: 0.55, evo: 'inferno', sfx: 'shoot_flame', col: '#feae34' },
  };
  W.TURRETS = {
    pulse: { dmg: 0.38, rate: 3, range: 150, col: '#2ce8f5' },
    rocket: { dmg: 1.5, rate: 0.75, range: 200, col: '#f77622' },
    arc: { dmg: 0.6, rate: 1.1, range: 110, jumps: 3, col: '#8fd3ff' },
    beam: { dmg: 1.3, rate: 0, range: 95, col: '#fee761' }, // dmg per second, continuous
  };
  W.COMPANIONS = {
    wing: { col: '#63c74d' },
    orb: { col: '#2ce8f5', homing: 4 },
    guardian: { col: '#fee761', block: true, regen: 0.3 },
    phantom: { col: '#c65197', pierce: 2, crit: 0.15 },
  };
  W.def = (id) => { // engine behaviour + economy numbers (dmg, rate, pierce) from NC.DATA.WEAPONS when present
    const d = Object.assign({ id }, W.DEFS[id] || W.DEFS.laser), D = NC.DATA && NC.DATA.WEAPONS && NC.DATA.WEAPONS.find(w => w.id === id);
    if (D) { for (const k of ['dmg', 'rate']) if (typeof D[k] === 'number') d[k] = D[k]; if (typeof D.pierce === 'number' && id !== 'rail') d.pierce = D.pierce; if (D.evo && D.evo.id) d.evo = D.evo.id; }
    return d;
  };
  W.turDef = (id) => { const d = Object.assign({}, W.TURRETS[id] || W.TURRETS.pulse), D = NC.DATA && NC.DATA.TURRETS && NC.DATA.TURRETS.find(t => t.id === id); if (D) { if (D.kind === 'beam') d.dmg = (D.dmg || 0.13) * (D.rate || 10); else { d.dmg = D.dmg != null ? D.dmg : d.dmg; d.rate = D.rate || d.rate; } if (D.chain) d.jumps = D.chain; } return d; };

  // effective combat stats for this frame
  X.eff = () => {
    const R = X.R, st = R.st, m = R.m;
    const wd = R.wdef, evoMul = 1 + 0.08 * (R.cards['evo_' + st.weapon.id] || 0) + (R.evolved ? 0.25 : 0);
    const over = R.buffs.over > 0 ? 1.6 : 1;
    return {
      shot: st.atk * m.dmg * wd.dmg * st.weapon.mult * evoMul,
      atk: st.atk * m.dmg,
      rate: wd.rate * st.rate * m.rate * over,
      crit: Math.min(0.85, st.crit + m.crit), critMult: st.critMult || 2,
      guns: 1 + m.guns + (st.guns || 0),
      pierce: wd.pierce + m.pierce, bounce: m.bounce,
    };
  };
  const roll = (base, E, extraCrit = 0) => { const c = Math.random() < E.crit + extraCrit; return { v: base * U.rnd(0.92, 1.08) * (c ? E.critMult : 1), c }; };

  X.addBullet = (o) => { const b = Object.assign({ life: 1.6, hit: null, pierce: 0, bounce: 0, homing: 0, aoe: 0, crit: false, kind: 'laser', spr: 'proj_laser', frame: 0 }, o); if (b.pierce > 0 || b.bounce > 0) b.hit = new Set(); X.R.bullets.push(b); return b; };

  // ------------------------------------------------------------ main weapon
  function fireMain(E) {
    const R = X.R, p = R.p, wid = R.st.weapon.id, wd = R.wdef, evo = R.evolved, ang = p.aimAng;
    const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca; // nx,ny = perpendicular
    const muzzle = (off, fwd = 12) => ({ x: p.x + ca * fwd + nx * off, y: p.y + sa * fwd + ny * off });
    const spr = evo ? wd.spr + '_evo' : wd.spr;
    if (wid === 'laser') {
      const n = Math.min(7, E.guns + (evo ? 1 : 0));
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 4, da = n > 3 ? (i - (n - 1) / 2) * 0.06 : 0, m = muzzle(off), d = roll(E.shot, E), a = ang + da;
        X.addBullet({ kind: 'laser', spr, x: m.x, y: m.y, vx: Math.cos(a) * wd.speed, vy: Math.sin(a) * wd.speed, dmg: d.v, crit: d.c, pierce: E.pierce, bounce: E.bounce, prism: evo, life: 1.2 });
      }
    } else if (wid === 'plasma') {
      const n = Math.min(5, E.guns);
      for (let i = 0; i < n; i++) {
        const a = ang + (i - (n - 1) / 2) * 0.16, m = muzzle(0), d = roll(E.shot, E);
        X.addBullet({ kind: 'plasma', spr, x: m.x, y: m.y, vx: Math.cos(a) * wd.speed, vy: Math.sin(a) * wd.speed, dmg: d.v, crit: d.c, pierce: E.pierce, bounce: E.bounce, nova: evo, life: 2.2, r: 3 });
      }
    } else if (wid === 'missile') {
      const n = Math.min(8, E.guns + (evo ? 2 : 0));
      for (let i = 0; i < n; i++) {
        const a = ang + (i - (n - 1) / 2) * 0.35, m = muzzle((i - (n - 1) / 2) * 5, 6), d = roll(E.shot * (evo ? 0.8 : 1), E);
        X.addBullet({ kind: 'missile', spr, x: m.x, y: m.y, vx: Math.cos(a) * wd.speed, vy: Math.sin(a) * wd.speed, dmg: d.v, crit: d.c, homing: wd.homing, accel: 260, maxSp: 230, aoe: wd.aoe * (evo ? 0.85 : 1), life: 2.6, target: X.nearest(m.x, m.y, 260) });
      }
    } else if (wid === 'rail') {
      const n = Math.min(4, E.guns);
      for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * 6, m = muzzle(off, 10); railShot(m.x, m.y, ang, E, evo); }
    } else if (wid === 'flame') {
      const spread = wd.spread * (evo ? 1.6 : 1) + 0.06 * (E.guns - 1), life = wd.life * (evo ? 1.5 : 1);
      const n = 1 + Math.floor((E.guns - 1) / 2);
      for (let i = 0; i < n; i++) {
        const a = ang + U.rnd(-spread, spread), m = muzzle(U.rnd(-2, 2), 10), d = roll(E.shot, E), sp = wd.speed * U.rnd(0.85, 1.1);
        X.addBullet({ kind: 'flame', spr, x: m.x, y: m.y, vx: Math.cos(a) * sp + p.vx * 0.3, vy: Math.sin(a) * sp + p.vy * 0.3, dmg: d.v, crit: d.c, pierce: 99, life, ml: life, burn: E.atk * wd.burn * (evo ? 2 : 1), r: 4 });
      }
    }
    U.sfx(wd.sfx);
  }
  function railShot(x, y, ang, E, evo) {
    const R = X.R, len = 400, dx = Math.cos(ang), dy = Math.sin(ang);
    const hits = [];
    for (const t of X.targets()) {
      const px = t.x - x, py = t.y - y, along = px * dx + py * dy;
      if (along < 0 || along > len) continue;
      if (Math.abs(px * dy - py * dx) < t.r + 2) hits.push([along, t]);
    }
    hits.sort((a, b) => a[0] - b[0]);
    for (const [, t] of hits) {
      if (t.shieldBlocks && t.shieldBlocks(ang)) { X.blocked(t, t.x, t.y + t.r * 0.6); break; } // bulwark front shield stops the rail
      const d = roll(E.shot, E); X.damage(t, d.v, d.c, t.x, t.y);
      if (evo) chain(t.x, t.y, t, E.shot * 0.6, 2, '#fee761', new Set([t]));
    }
    R.rails.push({ x, y, ang, len, life: 0.12, ml: 0.12, evo });
  }
  function chain(x, y, first, dmg, jumps, col, hit) {
    hit = hit || new Set(); let cur = first, px = x, py = y;
    for (let i = 0; i < jumps; i++) {
      const nx = X.nearest(px, py, 70, hit); if (!nx) break;
      F().bolt(px, py, nx.x, nx.y, col); X.damage(nx, dmg, false, nx.x, nx.y); hit.add(nx); px = nx.x; py = nx.y; cur = nx;
    }
    return cur;
  }
  W.chain = chain;

  // ------------------------------------------------------------ per-frame weapon logic
  W.update = (dt) => {
    const R = X.R, p = R.p; if (!p.alive) return;
    const E = X.eff();
    p.fireT -= dt;
    if (p.fireT <= 0 && !R.noFire) {
      fireMain(E); p.fireT += 1 / E.rate; if (p.fireT < -0.1) p.fireT = 0;
      // companion fires in sync with the ship (same fire rate), 2/3 attack (+3%/level)
      if (R.comp) fireCompanion(E);
    }
    // companion follow
    if (R.comp) { const c = R.comp, tx = p.x + 20, ty = p.y + 10; c.x += (tx - c.x) * Math.min(1, dt * 7); c.y += (ty - c.y) * Math.min(1, dt * 7); c.t += dt; }
    if (R.tur) updateTurret(dt, E);
    // card: side missiles
    if (R.m.missile > 0) {
      R.missileT -= dt;
      if (R.missileT <= 0) {
        R.missileT = 2;
        for (let i = 0; i < R.m.missile; i++) {
          const side = i % 2 ? 1 : -1, t = X.nearest(p.x, p.y, 300); if (!t) break; const d = roll(E.atk * 1.4, E);
          X.addBullet({ kind: 'missile', spr: 'proj_missile', x: p.x + side * 8, y: p.y, vx: side * 60, vy: 20, dmg: d.v, crit: d.c, homing: 6, accel: 300, maxSp: 240, aoe: 10, life: 2.6, target: t });
        }
      }
    }
    // card: orbit blades
    if (R.m.orbit > 0) {
      R.orbitA += dt * 3.4;
      const n = R.m.orbit;
      for (let i = 0; i < n; i++) {
        const a = R.orbitA + i / n * U.TAU, bx = p.x + Math.cos(a) * 24, by = p.y + Math.sin(a) * 24;
        for (const t of X.targets()) {
          if (t.untargetable || U.d2(t.x, t.y, bx, by) > (t.r + 4) ** 2) continue;
          if ((t.ocd || 0) > R.time) continue;
          t.ocd = R.time + 0.35; X.damage(t, E.atk * 0.7, false, bx, by);
        }
        for (const eb of R.ebullets) if (!eb.dead && U.d2(eb.x, eb.y, bx, by) < 25) { eb.dead = true; F().spark(eb.x, eb.y, '#ffffff', 0, 0); }
      }
    }
  };
  function fireCompanion(E) {
    const R = X.R, c = R.comp, cd = c.def, p = R.p;
    const frac = c.frac || 2 / 3 * (1 + 0.03 * (c.lvl - 1));
    const d = roll(E.shot * frac, E, cd.crit || 0), a = p.aimAng;
    const t = cd.homing ? X.nearest(c.x, c.y, 220) : null;
    const n = cd.guns || 1;
    for (let i = 0; i < n; i++) X.addBullet({ kind: 'comp', spr: 'proj_laser', x: c.x + (i - (n - 1) / 2) * 4, y: c.y - 6, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, dmg: d.v, crit: d.c, homing: cd.homing || 0, target: t, pierce: cd.pierce || 0, life: 1.2, col: cd.col });
  }
  function updateTurret(dt, E) {
    const R = X.R, T = R.tur, d = T.def, p = R.p, lm = T.mult || 1 + 0.08 * (T.lvl - 1);
    T.t += dt; T.x = p.x - 18; T.y = p.y + 4 + Math.round(Math.sin(T.t * 3));
    if (T.id === 'beam') {
      const t = X.nearest(T.x, T.y, d.range); T.beam = t ? { x: t.x, y: t.y } : null;
      if (t) { T.tick -= dt; if (T.tick <= 0) { T.tick = 0.1; X.damage(t, E.atk * d.dmg * lm * 0.1, false, t.x, t.y, { quiet: true }); } }
      return;
    }
    T.fireT -= dt; if (T.fireT > 0) return;
    const t = X.nearest(T.x, T.y, d.range); if (!t) { T.fireT = 0.1; return; }
    T.fireT = 1 / d.rate;
    const dmg = E.atk * d.dmg * lm, a = Math.atan2(t.y - T.y, t.x - T.x);
    if (T.id === 'pulse') X.addBullet({ kind: 'tur', spr: 'proj_laser', x: T.x, y: T.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, dmg, life: 1, col: d.col });
    else if (T.id === 'rocket') X.addBullet({ kind: 'missile', spr: 'proj_missile', x: T.x, y: T.y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, dmg, homing: 6, accel: 260, maxSp: 220, aoe: 12, life: 2.6, target: t });
    else if (T.id === 'arc') { F().bolt(T.x, T.y, t.x, t.y, d.col); X.damage(t, dmg, false, t.x, t.y); chain(t.x, t.y, t, dmg * 0.8, d.jumps - 1, d.col, new Set([t])); U.sfx('hit'); }
  }

  // ------------------------------------------------------------ projectile simulation
  W.updateBullets = (dt) => {
    const R = X.R;
    for (const r of R.rails) r.life -= dt;
    R.rails = R.rails.filter(r => r.life > 0);
    const targets = X.targets();
    for (const b of R.bullets) {
      if (b.homing) {
        if (!b.target || b.target.dead || b.target.untargetable) b.target = X.nearest(b.x, b.y, 220);
        if (b.target) {
          const a = Math.atan2(b.target.y - b.y, b.target.x - b.x), cur = Math.atan2(b.vy, b.vx);
          let sp = Math.hypot(b.vx, b.vy); if (b.accel) sp = Math.min(b.maxSp || 240, sp + b.accel * dt);
          const na = cur + U.clamp(U.angDiff(cur, a), -b.homing * dt, b.homing * dt);
          b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        } else if (b.accel) { const sp = Math.hypot(b.vx, b.vy) || 1, ns = Math.min(b.maxSp || 240, sp + b.accel * dt); b.vx *= ns / sp; b.vy *= ns / sp; }
      }
      if (R.event && R.event.id === 'blackhole') X.gravity(b, dt, 0.5);
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.kind === 'flame') { b.vx *= Math.pow(0.25, dt); b.vy *= Math.pow(0.25, dt); }
      if (b.kind === 'missile' && Math.random() < 0.5) F().spark(b.x, b.y + 3, Math.random() < 0.5 ? '#feae34' : '#5a6988', U.rnd(-8, 8), U.rnd(10, 25), 0.25);
      if (b.life <= 0 || b.x < -20 || b.x > X.G.W + 20 || b.y < -30 || b.y > X.G.H + 20) {
        if (b.nova && b.life <= 0) novaBurst(b);
        b.dead = true; continue;
      }
      for (const t of targets) {
        if (t.dead || t.untargetable || (b.hit && b.hit.has(t))) continue;
        const rr = t.r + (b.r || 2);
        if (U.d2(b.x, b.y, t.x, t.y) > rr * rr) continue;
        onHit(b, t);
        if (b.dead) break;
      }
    }
    R.bullets = R.bullets.filter(b => !b.dead);
  };
  function novaBurst(b) {
    const r = 16; F().ring(b.x, b.y, '#c65197', r, 0.3); F().anim('fx_explode_s', b.x, b.y);
    for (const t of X.targets()) if (!t.untargetable && U.d2(t.x, t.y, b.x, b.y) < (r + t.r) ** 2) X.damage(t, b.dmg * 0.6, false, t.x, t.y);
  }
  function aoe(b) {
    F().ring(b.x, b.y, '#feae34', b.aoe, 0.25); F().anim('fx_explode_s', b.x, b.y); U.sfx('explode_s');
    for (const t of X.targets()) if (!t.untargetable && U.d2(t.x, t.y, b.x, b.y) < (b.aoe + t.r) ** 2) X.damage(t, b.dmg * (t.kind === 'boss' ? 0.8 : 1), b.crit, t.x, t.y);
  }
  function onHit(b, t) {
    const R = X.R;
    if (t.shieldBlocks && t.shieldBlocks(Math.atan2(b.vy, b.vx))) { X.blocked(t, b.x, b.y); b.dead = true; return; }
    if (b.aoe) { aoe(b); b.dead = true; return; }
    X.damage(t, b.dmg, b.crit, b.x, b.y);
    if (b.burn) t.burn = { dps: Math.max((t.burn && t.burn.dps) || 0, b.burn), t: 1.6 };
    if (b.kind !== 'flame') F().anim('fx_hit', b.x, b.y);
    if (b.prism && !b.child) { // laser evolution: splits in two
      for (const s of [-1, 1]) { const a = Math.atan2(b.vy, b.vx) + s * 0.6; const c = X.addBullet({ kind: 'laser', spr: 'proj_laser_evo', x: b.x, y: b.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, dmg: b.dmg * 0.5, crit: b.crit, life: 0.5, child: true }); c.hit = new Set([t]); }
    }
    if (b.hit) b.hit.add(t);
    if (b.bounce > 0) {
      const n = X.nearest(b.x, b.y, 90, b.hit);
      if (n) { b.bounce--; const a = Math.atan2(n.y - b.y, n.x - b.x), sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.life = Math.max(b.life, 0.6); return; }
    }
    if (b.pierce > 0) { b.pierce--; if (b.kind === 'plasma' && b.nova) novaBurst(b); return; }
    if (b.nova) novaBurst(b);
    b.dead = true;
    void R;
  }

  // ------------------------------------------------------------ setup per run
  W.setup = () => {
    const R = X.R, st = R.st;
    R.wdef = W.def(st.weapon.id);
    R.bullets = []; R.rails = []; R.missileT = 2; R.orbitA = 0; R.evolved = false;
    R.comp = st.companion ? { id: st.companion.id, lvl: st.companion.lvl || 1, frac: st.companion.dmgFrac, def: compDef(st.companion.id), x: R.p.x + 20, y: R.p.y + 10, t: 0 } : null;
    R.tur = st.turret ? { id: st.turret.id, lvl: st.turret.lvl || 1, mult: st.turret.dmgMult, def: W.turDef(st.turret.id), x: R.p.x, y: R.p.y, t: 0, fireT: 0.5, tick: 0, beam: null } : null;
  };
  function compDef(id) { const d = Object.assign({}, W.COMPANIONS[id] || W.COMPANIONS.wing), D = NC.DATA && NC.DATA.COMPANIONS && NC.DATA.COMPANIONS.find(c => c.id === id); if (D) { d.guns = D.guns || 1; if (D.homing) d.homing = 4; if (D.pierce) d.pierce = 2; if (D.crit) d.crit = D.crit; } return d; }
  W.evolve = () => {
    const R = X.R; if (R.evolved) return; R.evolved = true;
    U.ui('alert', 'evolved', { weapon: R.wdef.evo, base: R.st.weapon.id, nameKey: 'wpn.' + R.wdef.evo + '.name' });
    U.sfx('legendary'); F().ring(R.p.x, R.p.y, '#fee761', 60, 0.6); F().doFlash('#fee761', 0.3);
  };
})(window.NC = window.NC || {});
