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
    // 3.3 new weapons (engine fallbacks; NC.DATA.WEAPONS numbers override dmg/rate/pierce + the listed extra fields)
    blaster: { dmg: 0.62, rate: 2.3, burst: 3, gap: 0.055, speed: 300, spr: 'proj_blaster', pierce: 0, evo: 'repeater', sfx: 'shoot_laser', col: '#e0574f' },
    shotgun: { dmg: 0.5, rate: 1.35, pellets: 6, cone: 0.42, speed: 250, life: 0.4, spr: 'proj_shotgun', pierce: 0, evo: 'hailstorm', sfx: 'shoot_plasma', col: '#e0a060' },
    arc: { dmg: 1.25, rate: 1.9, range: 125, jumps: 3, jumpR: 62, falloff: 0.8, spr: 'proj_arc', pierce: 0, evo: 'tempest', sfx: 'hit', col: '#8fd3ff' },
    wave: { dmg: 2.4, rate: 0.8, speed: 105, life: 1.9, width: 13, grow: 14, spr: 'proj_wave', pierce: 99, evo: 'tsunami', sfx: 'shoot_plasma', col: '#73b9c6' },
    drill: { dmg: 0.55, rate: 9, range: 150, ramp: 0.9, rampMax: 2.4, spr: 'proj_drill', pierce: 0, evo: 'singularity_lance', sfx: 'shoot_rail', col: '#9a78b8' },
    swarmer: { dmg: 0.7, rate: 2.6, speed: 190, orbit: 0.55, spr: 'proj_swarmer', pierce: 0, evo: 'hivemind', sfx: 'shoot_laser', col: '#78c8a0' },
  };
  // evolution modifiers for the new weapons (data evo object fields of the same name override)
  W.EVO = {
    blaster: { burst: 5, dmgMul: 1.1 }, shotgun: { pellets: 9, pierce: 1 }, arc: { jumps: 6, stun: 0.35 },
    wave: { widthMul: 1.6, slow: 0.5 }, drill: { rampMax: 4, beams: 1 }, swarmer: { split: 2 },
  };
  // weapon skills (SPEC-33 B) engine fallbacks; NC.DATA.WEAPONS[i].skill fields override. power = multiplier of the skill base
  // damage (ship attack x weapon level mult x card dmg), per second for continuous effects.
  W.SKILLS = {
    laser: { id: 'overcharge', every: 8, dur: 1, power: 3.2, width: 6 },
    plasma: { id: 'singularity', everyShots: 10, dur: 2, power: 1.4, radius: 34 },
    flame: { id: 'firestorm', every: 9, power: 2.6, radius: 44, dur: 0.6 },
    missile: { id: 'barrage', every: 7, count: 6, power: 1.5 },
    rail: { id: 'execution', threshold: 0.15 },
    blaster: { id: 'rapid', every: 6, dur: 2, power: 3 },
    shotgun: { id: 'knockback', every: 8, power: 2.2, radius: 46, push: 34 },
    arc: { id: 'storm', every: 9, count: 6, power: 2.6 },
    wave: { id: 'echo', everyShots: 3, count: 3 },
    drill: { id: 'overheat', dur: 2, power: 4.5, radius: 26 },
    swarmer: { id: 'hive', every: 10, count: 10 },
  };
  // secondary weapons (SPEC-33 D) engine fallbacks; NC.DATA.SECONDARY fields override. dmg = x ship attack x sec mult
  W.SECONDARY = {
    homing: { every: 2, count: 2, dmg: 0.9, col: '#d6a35a' },
    mines: { every: 3, dmg: 2.6, radius: 24, max: 6, life: 14, col: '#c0645c' },
    tesla: { every: 1.2, dmg: 1.3, range: 115, jumps: 1, col: '#8fd3ff' },
    blade: { count: 2, dmg: 0.7, radius: 30, spin: 4, hitCd: 0.4, col: '#c0cbdc' },
    nova: { every: 6, dmg: 2.4, radius: 72, col: '#73b9c6' },
    drone: { every: 0.45, dmg: 0.55, range: 210, col: '#78a86c' },
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
    if (D) {
      for (const k of ['dmg', 'rate']) if (typeof D[k] === 'number') d[k] = D[k]; if (typeof D.pierce === 'number' && id !== 'rail' && id !== 'wave') d.pierce = D.pierce; if (D.evo && D.evo.id) d.evo = D.evo.id;
      if (W.EVO[id]) for (const k of ['burst', 'gap', 'pellets', 'cone', 'jumps', 'chain', 'jumpR', 'range', 'ramp', 'rampMax', 'orbit', 'width', 'life']) if (typeof D[k] === 'number') d[k] = D[k];
      if (W.EVO[id] && typeof D.chain === 'number') d.jumps = D.chain;
    }
    d.evoD = Object.assign({}, W.EVO[id] || {}, D && D.evo && typeof D.evo === 'object' ? D.evo : {});
    if (typeof d.evoD.chain === 'number' && id === 'arc') d.evoD.jumps = d.evoD.chain;
    d.skill = Object.assign({}, W.SKILLS[id] || {}, D && D.skill && typeof D.skill === 'object' ? D.skill : {});
    return d;
  };
  W.turDef = (id) => { const d = Object.assign({}, W.TURRETS[id] || W.TURRETS.pulse), D = NC.DATA && NC.DATA.TURRETS && NC.DATA.TURRETS.find(t => t.id === id); if (D) { if (D.kind === 'beam') d.dmg = (D.dmg || 0.13) * (D.rate || 10); else { d.dmg = D.dmg != null ? D.dmg : d.dmg; d.rate = D.rate || d.rate; } if (D.chain) d.jumps = D.chain; } return d; };

  // effective combat stats for this frame
  X.eff = () => {
    const R = X.R, st = R.st, m = R.m;
    const wd = R.wdef, evoMul = 1 + 0.08 * (R.cards['evo_' + st.weapon.id] || 0) + (R.evolved ? 0.25 : 0);
    const over = (R.buffs.over > 0 ? 1.6 : 1) * (R.skRateT > 0 ? R.skRate || 1 : 1);
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
    } else if (wid === 'blaster') { // bursts of 3 (evo 5) bolts, the volley loop lives in W.update (p.burst)
      const n = Math.round(evo ? (wd.evoD.burst || 5) : (wd.burst || 3));
      p.burst = { left: Math.min(10, ((p.burst && p.burst.left) || 0) + n), t: 0 };
      return; // sfx per bolt volley
    } else if (wid === 'shotgun') {
      const ev = wd.evoD, n = Math.min(14, Math.round((evo ? ev.pellets || 9 : wd.pellets || 6) + 2 * (E.guns - 1))), cone = (wd.cone || 0.42) * (1 + 0.12 * (E.guns - 1));
      for (let i = 0; i < n; i++) {
        const a = ang + (n > 1 ? (i / (n - 1) - 0.5) * 2 * cone : 0) + U.rnd(-0.05, 0.05), m = muzzle(U.rnd(-2, 2), 10), d = roll(E.shot, E), sp = wd.speed * U.rnd(0.8, 1.15);
        X.addBullet({ kind: 'pellet', spr: A.has(spr) ? spr : null, col: evo ? '#f0c070' : wd.col, x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: d.v, crit: d.c, pierce: E.pierce + (evo ? ev.pierce || 1 : 0), bounce: E.bounce, life: (wd.life || 0.4) * U.rnd(0.85, 1.1), r: 2 });
      }
      F().glow(muzzle(0).x, muzzle(0).y, 7, '#e0a060', 0.12); F().doShake(0.6);
    } else if (wid === 'arc') {
      const ev = wd.evoD, n = Math.min(3, E.guns), used = new Set(), jumps = Math.round(evo ? ev.jumps || 6 : wd.jumps || 3), m = muzzle(0, 10);
      for (let i = 0; i < n; i++) {
        const t = X.nearest(m.x, m.y, wd.range || 125, used);
        if (!t) { if (i === 0) F().bolt(m.x, m.y, m.x + ca * 28 + U.rnd(-6, 6), m.y + sa * 28, wd.col, 0.07); break; }
        used.add(t); arcChain(m.x, m.y, t, E, jumps, evo ? ev.stun || 0.35 : 0, used);
      }
    } else if (wid === 'wave') {
      const sk = skillShot(), base = n => { const out = []; for (let i = 0; i < n; i++) out.push((i - (n - 1) / 2) * 0.24); return out; };
      let angs = base(Math.min(3, E.guns));
      if (sk) angs = angs.concat(angs.map(a => a - 0.38), angs.map(a => a + 0.38)).slice(0, 9); // Echo: splits in 3
      const wm = evo ? wd.evoD.widthMul || 1.6 : 1;
      for (const da of angs) {
        const a = ang + da, m = muzzle(0, 8), d = roll(E.shot * (evo ? 1.15 : 1), E);
        X.addBullet({ kind: 'wave', spr, x: m.x, y: m.y, vx: Math.cos(a) * wd.speed, vy: Math.sin(a) * wd.speed, dmg: d.v, crit: d.c, pierce: 999, life: wd.life || 1.9, ml: wd.life || 1.9, w: (wd.width || 13) * wm, grow: (wd.grow || 14) * wm, echo: !!sk, evo });
      }
    } else if (wid === 'swarmer') {
      const n = Math.min(6, E.guns) * (evo ? wd.evoD.split || 2 : 1);
      for (let i = 0; i < n; i++) nanite(E, E.shot, evo);
    }
    if (wid === 'plasma' && skillShot()) { const b = R.bullets[R.bullets.length - 1]; if (b && b.kind === 'plasma') { b.hole = true; b.r = 4; } } // Singularity
    U.sfx(wd.sfx);
  }
  const A = NC.assets;
  // nanite: orbits the ship for wd.orbit s, then dives (homing) at the nearest enemy
  function nanite(E, dmg, evo, orbitT) {
    const R = X.R, p = R.p, wd = R.wdef; if (R.bullets.length > 260) return;
    let cnt = 0; for (const b of R.bullets) if (b.kind === 'nanite') cnt++; if (cnt >= 48) return;
    const d = roll(dmg, E);
    X.addBullet({ kind: 'nanite', spr: A.has(evo ? 'proj_swarmer_evo' : 'proj_swarmer') ? (evo ? 'proj_swarmer_evo' : 'proj_swarmer') : null, col: evo ? '#a8f0c8' : (wd.col || '#78c8a0'), x: p.x, y: p.y, vx: 0, vy: 0, dmg: d.v, crit: d.c,
      orb: orbitT != null ? orbitT : (wd.orbit || 0.55) * U.rnd(0.8, 1.3), oa: Math.random() * U.TAU, orad: U.rnd(11, 19), life: 4, r: 2, sp: wd.speed || 190 });
  }
  // arc emitter chain: falloff per jump, optional evo stun on normal enemies
  function arcChain(x, y, first, E, jumps, stun, used) {
    const wd = X.R.wdef, col = X.R.evolved ? '#c8e8ff' : wd.col || '#8fd3ff', fall = wd.falloff || 0.8;
    let px = x, py = y, t = first, dmg = E.shot, hit = new Set([first]);
    for (let i = 0; i <= jumps && t; i++) {
      F().bolt(px, py, t.x, t.y, col, 0.1); if (i === 0) F().glow(px, py, 6, col, 0.1);
      const d = roll(dmg, E); X.damage(t, d.v, d.c, t.x, t.y); F().spark(t.x, t.y, '#ffffff', U.rnd(-30, 30), U.rnd(-30, 30));
      if (stun && t.kind === 'enemy') t.stun = Math.max(t.stun || 0, stun);
      px = t.x; py = t.y; dmg *= fall; hit.add(t); used && used.add(t);
      t = X.nearest(px, py, wd.jumpR || 62, hit);
    }
  }
  // shot-counted skills (plasma Singularity, wave Echo): true when this shot is the N-th
  function skillShot() {
    const sk = X.R.skill; if (!sk || !sk.def.everyShots) return false;
    sk.shots++; if (sk.shots >= sk.def.everyShots) { sk.shots = 0; sk.active = 0.3; return true; } return false;
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
      const sk = R.skill; if (sk && sk.id === 'execution' && t.kind === 'enemy' && !t.dead && t.max && t.hp < t.max * (sk.def.threshold || 0.15)) {
        F().pop(t.x, t.y - 8, 'x', F().COL.bad, 0.6); F().glow(t.x, t.y, 9, '#c0645c', 0.2); X.damage(t, t.hp + 1, true, t.x, t.y, { quiet: true }); sk.active = 0.25;
      }
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
    const wid = R.st.weapon.id;
    if (R.skRateT > 0) R.skRateT -= dt;
    if (wid === 'drill') updateDrill(dt, E); else if (R.drill) R.drill = null;
    if (p.burst && p.burst.left > 0 && !R.noFire) { p.burst.t -= dt; while (p.burst.left > 0 && p.burst.t <= 0) { blasterVolley(E); p.burst.left--; p.burst.t += R.wdef.gap || 0.055; } }
    updateSkill(dt, E); updateSkfx(dt, E); updateSec(dt, E);
    if (p.fireT <= 0 && !R.noFire) {
      if (wid !== 'drill') fireMain(E); p.fireT += 1 / E.rate; if (p.fireT < -0.1) p.fireT = 0;
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
  function blasterVolley(E) {
    const R = X.R, p = R.p, wd = R.wdef, evo = R.evolved, ang = p.aimAng, ca = Math.cos(ang), sa = Math.sin(ang);
    const n = Math.min(5, E.guns), spr = evo ? 'proj_blaster_evo' : 'proj_blaster', dm = evo ? wd.evoD.dmgMul || 1.1 : 1;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 5, a = ang + (n > 2 ? (i - (n - 1) / 2) * 0.05 : 0) + U.rnd(-0.025, 0.025), d = roll(E.shot * dm, E);
      X.addBullet({ kind: 'blaster', spr: A.has(spr) ? spr : null, col: evo ? '#ff8a70' : wd.col, x: p.x + ca * 11 - sa * off, y: p.y + sa * 11 + ca * off, vx: Math.cos(a) * wd.speed, vy: Math.sin(a) * wd.speed, dmg: d.v, crit: d.c, pierce: E.pierce, bounce: E.bounce, life: 1.1 });
    }
    U.sfx(wd.sfx);
  }
  // ------------------------------------------------------------ gravity lance (continuous ramping beam, one per gun up to 3)
  function updateDrill(dt, E) {
    const R = X.R, p = R.p, wd = R.wdef, evo = R.evolved, sk = R.skill;
    if (!R.drill) R.drill = { beams: [], snd: 0 };
    const D = R.drill, n = Math.min(3, E.guns) + (evo ? wd.evoD.beams || 1 : 0), maxR = (evo ? wd.evoD.rampMax || 4 : wd.rampMax || 2.6) - 1;
    while (D.beams.length < n) D.beams.push({ tgt: null, ramp: 0, on: 0, tick: 0 });
    D.beams.length = n;
    const used = new Set(); D.snd -= dt;
    for (const bm of D.beams) {
      if (R.noFire || !p.alive) { bm.tgt = null; continue; }
      let t = bm.tgt;
      if (!t || t.dead || t.untargetable || used.has(t) || U.d2(t.x, t.y, p.x, p.y) > (wd.range + (t.r || 0) + 10) ** 2) {
        t = X.nearest(p.x, p.y - 4, wd.range || 150, used);
        if (t !== bm.tgt) { bm.ramp *= 0.25; bm.on = 0; }
        bm.tgt = t;
      }
      if (!t) { bm.ramp = Math.max(0, bm.ramp - dt * 2); continue; }
      used.add(t);
      bm.ramp = Math.min(maxR, bm.ramp + (wd.ramp || 0.9) * dt); bm.on += dt;
      bm.tick -= dt;
      if (bm.tick <= 0) {
        bm.tick += 1 / E.rate; bm.n = (bm.n || 0) + 1;
        const d = roll(E.shot * (1 + bm.ramp), E); X.damage(t, d.v, d.c, t.x, t.y, { quiet: bm.n % 3 !== 0 });
        if (D.snd <= 0) { U.sfx('hit'); D.snd = 0.25; }
      }
      if (sk && sk.id === 'overheat' && bm.on >= (sk.def.dur || 2) && !t.dead) { // Overheat: explode the target
        bm.on = 0; sk.active = 0.4; const r = sk.def.radius || 26, dmg = skBase(E) * skPow(sk);
        F().explode(t.x, t.y, 18, '#9a78b8'); F().ring(t.x, t.y, '#c8a0ff', r, 0.35); F().glow(t.x, t.y, r * 0.7, '#9a78b8', 0.3);
        for (const o of X.targets()) if (!o.untargetable && U.d2(o.x, o.y, t.x, t.y) < (r + o.r) ** 2) X.damage(o, dmg * (o === t ? 1.4 : 1), false, o.x, o.y);
      }
    }
  }
  // ------------------------------------------------------------ weapon skills (SPEC-33 B)
  const skBase = (E) => E.shot / Math.max(0.05, X.R.wdef.dmg || 1); // ship atk x card dmg x weapon level/evo mult
  const skPow = (sk) => (sk.def.power || 1) * (sk.def.scaled ? 1 : 1 + (sk.def.perLvl != null ? sk.def.perLvl : 0.02) * ((X.R.st.weapon.lvl || 1) - 1));
  function skillDef(id) {
    const R = X.R, d = Object.assign({}, R.wdef.skill || W.SKILLS[id] || {});
    const ext = NC.sys && typeof NC.sys.skillStats === 'function' ? (() => { try { return NC.sys.skillStats(id, R.st.weapon.lvl || 1); } catch (e) { return null; } })() : null;
    if (ext && typeof ext === 'object') { Object.assign(d, ext); d.scaled = true; }
    if (!d.id) d.id = (W.SKILLS[id] || {}).id || id;
    if (d.every == null && d.cd != null) d.every = d.cd;
    return d;
  }
  function updateSkill(dt, E) {
    const R = X.R, sk = R.skill, p = R.p; if (!sk) return;
    if (sk.active > 0) sk.active -= dt;
    const d = sk.def;
    if (d.every && !d.everyShots) {
      if (!p.alive || R.noFire) return;
      sk.t -= dt;
      if (sk.t <= 0 && triggerSkill(sk, E)) sk.t = d.every; else if (sk.t <= 0) sk.t = 0.3; // retry soon when nothing to hit
    }
  }
  function triggerSkill(sk, E) {
    const R = X.R, p = R.p, d = sk.def, base = skBase(E) * skPow(sk), id = sk.id;
    if (id === 'overcharge') { R.skfx.push({ type: 'beam', t: d.dur || 1, ml: d.dur || 1, w: d.width || 6, dps: base, tick: 0 }); U.sfx('shoot_rail'); F().doShake(1.5); }
    else if (id === 'firestorm') { R.skfx.push({ type: 'fring', x: p.x, y: p.y, r: 6, max: d.radius || 44, t: d.dur || 0.6, ml: d.dur || 0.6, dmg: base, burn: base * 0.25, hit: new Set() }); U.sfx('explode_m'); }
    else if (id === 'barrage') {
      if (!X.nearest(p.x, p.y, 320)) return false;
      const n = Math.round(d.count || 6);
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.32, r = roll(base, E); X.addBullet({ kind: 'missile', spr: 'proj_missile', x: p.x + (i - (n - 1) / 2) * 3, y: p.y - 4, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, dmg: r.v, crit: r.c, homing: 6, accel: 280, maxSp: 240, aoe: 12, life: 2.6, target: null }); }
      U.sfx('shoot_missile'); F().ring(p.x, p.y, '#f77622', 16, 0.25);
    }
    else if (id === 'rapid') { R.skRate = d.power || 3; R.skRateT = d.dur || 2; F().ring(p.x, p.y, '#e0574f', 18, 0.3); U.sfx('powerup'); }
    else if (id === 'knockback') {
      const rad = d.radius || 46, push = d.push || 34;
      R.skfx.push({ type: 'kring', x: p.x, y: p.y, t: 0.3, ml: 0.3, r: rad });
      for (const t of X.targets()) {
        const dx = t.x - p.x, dy = t.y - p.y, dd = Math.hypot(dx, dy) || 1; if (t.untargetable || dd > rad + t.r) continue;
        X.damage(t, roll(base, E).v, false, t.x, t.y);
        if (t.kind === 'enemy' && !t.dead) { const k = push * (1.2 - dd / (rad + t.r)); t.x += dx / dd * k; t.y = Math.max(X.safeTop ? X.safeTop() - 10 : 0, t.y + dy / dd * k); }
      }
      for (const eb of R.ebullets) if (!eb.dead && U.d2(eb.x, eb.y, p.x, p.y) < rad * rad * 0.6) { eb.dead = true; F().spark(eb.x, eb.y, '#ffffff', 0, 0); }
      F().doShake(2.5); F().glow(p.x, p.y, rad * 0.8, '#e0a060', 0.25); U.sfx('explode_m');
    }
    else if (id === 'storm') {
      const ts = X.targets().filter(t => !t.untargetable && t.y > 0); if (!ts.length) return false;
      for (let i = ts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ts[i], ts[j]] = [ts[j], ts[i]]; }
      const n = Math.round(d.count || 6);
      for (let i = 0; i < n; i++) R.skfx.push({ type: 'strike', tgt: ts[i % ts.length], delay: i * 0.07, t: 0.22, ml: 0.22, dmg: base, done: false });
    }
    else if (id === 'hive') { const n = Math.round(d.count || 10); for (let i = 0; i < n; i++) nanite(E, X.R.wdef.dmg ? E.shot : base, R.evolved, 0.35 + i * 0.04); F().ring(p.x, p.y, '#78c8a0', 22, 0.35); U.sfx('powerup'); }
    else return true; // passive / shot-based skills
    sk.active = Math.max(sk.active, d.dur || 0.4);
    return true;
  }
  function updateSkfx(dt, E) {
    const R = X.R, p = R.p;
    for (const f of R.skfx) {
      if (f.type === 'strike' && f.delay > 0) { f.delay -= dt; continue; }
      f.t -= dt;
      if (f.type === 'beam') { // Overcharge: thick piercing beam along the aim, follows the ship
        f.x = p.x; f.y = p.y - 10; f.ang = p.aimAng; f.tick -= dt;
        if (f.tick <= 0 && p.alive) { f.tick += 0.1; const dx = Math.cos(f.ang), dy = Math.sin(f.ang);
          for (const t of X.targets()) { if (t.untargetable) continue; const px = t.x - f.x, py = t.y - f.y, al = px * dx + py * dy; if (al < 0 || al > 320) continue; if (Math.abs(px * dy - py * dx) < f.w / 2 + t.r) X.damage(t, f.dps * 0.1, false, t.x, t.y, { quiet: Math.random() < 0.6 }); } }
      } else if (f.type === 'fring') { // Firestorm: expanding ring of fire, hits each target once + burn
        f.x = p.x; f.y = p.y; f.r = U.lerp(f.max, 6, Math.max(0, f.t / f.ml));
        for (const t of X.targets()) { if (t.untargetable || f.hit.has(t)) continue; const dd = Math.hypot(t.x - f.x, t.y - f.y); if (dd < f.r + t.r) { f.hit.add(t); X.damage(t, f.dmg, false, t.x, t.y); if (t.kind === 'enemy') t.burn = { dps: Math.max((t.burn && t.burn.dps) || 0, f.burn), t: 2 }; } }
        if (!F().headless) for (let i = 0; i < 3; i++) { const a = Math.random() * U.TAU; F().spark(f.x + Math.cos(a) * f.r, f.y + Math.sin(a) * f.r, Math.random() < 0.5 ? '#feae34' : '#f77622', Math.cos(a) * 20, Math.sin(a) * 20 - 10, 0.3); }
      } else if (f.type === 'strike' && !f.done) { // Storm: sky lightning
        f.done = true; const t = f.tgt; f.x = t.x; f.y = t.y;
        if (!t.dead) { X.damage(t, roll(f.dmg, E).v, false, t.x, t.y); if (t.kind === 'enemy') t.stun = Math.max(t.stun || 0, 0.3); }
        F().bolt(t.x + U.rnd(-8, 8), Math.max(0, t.y - 120), t.x, t.y, '#c8e8ff', 0.18); F().bolt(t.x + U.rnd(-6, 6), Math.max(0, t.y - 90), t.x, t.y, '#8fd3ff', 0.14);
        F().glow(t.x, t.y, 10, '#8fd3ff', 0.25); F().burst(t.x, t.y, '#c8e8ff', 5, 40, 0.3); U.sfx('hit');
      } else if (f.type === 'hole') { // Singularity: pulls normal enemies, damage over time
        f.tick = (f.tick || 0) - dt; const pr = f.r * 1.7;
        for (const t of X.targets()) {
          if (t.untargetable) continue; const dx = f.x - t.x, dy = f.y - t.y, dd = Math.hypot(dx, dy) || 1; if (dd > pr + t.r) continue;
          if (t.kind === 'enemy' && !t.big && dd > 2) { const k = 46 * dt * (1.15 - dd / pr); t.x += dx / dd * k; t.y += dy / dd * k; }
          if (f.tick <= 0 && dd < f.r + t.r) X.damage(t, f.dps * 0.25, false, t.x, t.y, { quiet: true });
        }
        if (f.tick <= 0) f.tick = 0.25;
        if (!F().headless && Math.random() < 0.6) { const a = Math.random() * U.TAU; F().spark(f.x + Math.cos(a) * pr, f.y + Math.sin(a) * pr, '#c65197', -Math.cos(a) * 40, -Math.sin(a) * 40, 0.4); }
      }
    }
    if (R.skfx.length) R.skfx = R.skfx.filter(f => f.t > 0 || (f.type === 'strike' && f.delay > 0));
    // HUD cue (SPEC-33): cd01 = remaining cooldown fraction (0 = ready / passive), active = effect running
    const sk = R.skill;
    NC.hud.skill = sk ? { id: sk.id, weapon: R.st.weapon.id, nameKey: 'wpn.' + R.st.weapon.id + '.skill.name', passive: !sk.def.every && !sk.def.everyShots,
      cd01: sk.def.everyShots ? 1 - sk.shots / sk.def.everyShots : sk.def.every ? U.clamp(sk.t / sk.def.every, 0, 1) : 0, active: sk.active > 0 || R.skRateT > 0 } : null;
  }
  function spawnHole(x, y) {
    const R = X.R, sk = R.skill; if (!sk) return;
    let n = 0; for (const f of R.skfx) if (f.type === 'hole') n++; if (n >= 3) return;
    const E = X.eff(), d = sk.def;
    R.skfx.push({ type: 'hole', x, y, r: d.radius || 34, t: d.dur || 2, ml: d.dur || 2, dps: skBase(E) * skPow(sk) });
    U.sfx('shoot_plasma');
  }
  W.spawnHole = spawnHole;

  // ------------------------------------------------------------ secondary weapons (SPEC-33 D)
  function secDef(id) {
    const d = Object.assign({}, W.SECONDARY[id] || W.SECONDARY.homing), D = NC.DATA && NC.DATA.SECONDARY;
    const S = Array.isArray(D) ? D.find(x => x.id === id) : D && D[id];
    if (S) { for (const k of ['every', 'count', 'dmg', 'radius', 'range', 'jumps', 'max', 'life', 'spin', 'hitCd']) if (typeof S[k] === 'number') d[k] = S[k];
      if (typeof S.cd === 'number') d.every = S.cd; if (typeof S.rate === 'number' && S.rate > 0 && S.cd == null && S.every == null) d.every = 1 / S.rate; if (typeof S.chain === 'number') d.jumps = S.chain; }
    return d;
  }
  W.secDef = secDef;
  function updateSec(dt, E) {
    const R = X.R, S = R.sec, p = R.p; if (!S) return;
    const d = S.def, dmg = E.atk * d.dmg * S.mult;
    S.t -= dt; S.a += dt * (d.spin || 4);
    // mines: arm, proximity trigger, timeout
    for (const m of S.mines) {
      m.t += dt; if (m.t < 0.4) continue;
      let boom = m.t > d.life;
      if (!boom) for (const t of X.targets()) if (!t.untargetable && U.d2(t.x, t.y, m.x, m.y) < (t.r + 10) ** 2) { boom = true; break; }
      if (boom) { m.dead = true; F().explode(m.x, m.y, 14, '#c0645c'); F().ring(m.x, m.y, '#c0645c', d.radius, 0.3); for (const t of X.targets()) if (!t.untargetable && U.d2(t.x, t.y, m.x, m.y) < (d.radius + t.r) ** 2) X.damage(t, dmg, false, t.x, t.y); }
    }
    if (S.mines.length) S.mines = S.mines.filter(m => !m.dead);
    if (!p.alive) return;
    if (S.id === 'blade') { // orbiting blades: contact damage with per-target cooldown
      const n = Math.round(d.count || 2);
      S.pts = S.pts || []; S.pts.length = n;
      for (let i = 0; i < n; i++) {
        const a = S.a + i / n * U.TAU, bx = p.x + Math.cos(a) * d.radius, by = p.y + Math.sin(a) * d.radius; S.pts[i] = { x: bx, y: by, a };
        for (const t of X.targets()) { if (t.untargetable || U.d2(t.x, t.y, bx, by) > (t.r + 5) ** 2) continue; if ((t.bcd || 0) > R.time) continue; t.bcd = R.time + (d.hitCd || 0.4); X.damage(t, dmg, false, bx, by); F().spark(bx, by, '#ffffff', U.rnd(-30, 30), U.rnd(-30, 30)); }
      }
      return;
    }
    if (S.id === 'drone') { const tx = p.x - 22, ty = p.y - 6; S.x += (tx - S.x) * Math.min(1, dt * 6); S.y += (ty - S.y) * Math.min(1, dt * 6); }
    if (S.t > 0) return;
    if (S.id === 'homing') {
      const t = X.nearest(p.x, p.y, 280); if (!t) { S.t = 0.25; return; }
      const n = Math.round(d.count || 2);
      for (let i = 0; i < n; i++) { const side = i % 2 ? 1 : -1, r = roll(dmg, E); X.addBullet({ kind: 'secm', spr: A.has('sec_homing_proj') ? 'sec_homing_proj' : null, col: d.col, x: p.x + side * 7, y: p.y + 2, vx: side * 70, vy: -10, dmg: r.v, crit: r.c, homing: 7, accel: 300, maxSp: 230, aoe: 8, life: 2.4, target: t }); }
      U.sfx('shoot_missile');
    } else if (S.id === 'mines') {
      if (S.mines.length >= (d.max || 6)) S.mines.shift();
      S.mines.push({ x: p.x + U.rnd(-3, 3), y: p.y + 12, t: 0 });
    } else if (S.id === 'tesla') {
      const t = X.nearest(p.x, p.y, d.range || 115); if (!t) { S.t = 0.2; return; }
      let px = p.x, py = p.y - 4, cur = t; const hit = new Set();
      for (let i = 0; i <= (d.jumps || 1) && cur; i++) { F().bolt(px, py, cur.x, cur.y, d.col, 0.12); X.damage(cur, roll(dmg * Math.pow(0.7, i), E).v, false, cur.x, cur.y); hit.add(cur); px = cur.x; py = cur.y; cur = X.nearest(px, py, 55, hit); }
      F().glow(p.x, p.y - 4, 6, d.col, 0.15); U.sfx('hit');
    } else if (S.id === 'nova') {
      const r = d.radius || 72; S.pulse = { t: 0.45, r };
      for (const t of X.targets()) if (!t.untargetable && U.d2(t.x, t.y, p.x, p.y) < (r + t.r) ** 2) X.damage(t, roll(dmg, E).v, false, t.x, t.y);
      F().ring(p.x, p.y, d.col, r, 0.45); F().ring(p.x, p.y, '#e2e6ec', r * 0.6, 0.3); F().glow(p.x, p.y, 16, d.col, 0.3); U.sfx('explode_s');
    } else if (S.id === 'drone') {
      const t = X.nearest(S.x, S.y, d.range || 210); if (!t) { S.t = 0.15; return; }
      const a = Math.atan2(t.y - S.y, t.x - S.x), r = roll(dmg, E);
      X.addBullet({ kind: 'tur', spr: 'proj_laser', col: d.col, x: S.x, y: S.y, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, dmg: r.v, crit: r.c, life: 1 });
    }
    S.t = d.every || 1;
  }
  // rough sustained dps of skill + secondary (runStats)
  W.extraDps = (E) => {
    const R = X.R; let dps = 0; const sk = R.skill;
    if (sk) {
      const d = sk.def, b = skBase(E) * skPow(sk);
      const per = { overcharge: b * (d.dur || 1) * 0.8, firestorm: b * 2.5, barrage: b * (d.count || 6), knockback: b * 2.5, storm: b * (d.count || 6), hive: E.shot * (d.count || 10) * 0.8 }[sk.id];
      if (per && d.every) dps += per / d.every;
      if (sk.id === 'singularity') dps += b * (d.dur || 2) * 2 / ((d.everyShots || 10) / Math.max(0.1, E.rate));
      if (sk.id === 'rapid') dps *= 1; // folded into the weapon rate below
      if (sk.id === 'overheat') dps += b / ((d.dur || 2) + 0.5);
    }
    const S = R.sec;
    if (S) { const d = S.def, v = E.atk * d.dmg * S.mult; dps += S.id === 'blade' ? v * (d.count || 2) / (d.hitCd || 0.4) * 0.35 : S.id === 'nova' ? v * 3 / (d.every || 6) : S.id === 'mines' ? v * 1.5 / (d.every || 3) : v * (S.id === 'homing' ? d.count || 2 : S.id === 'tesla' ? 1 + (d.jumps || 1) * 0.7 : 1) / (d.every || 1); }
    return dps;
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
    const p = R.p;
    for (const b of R.bullets) {
      if (b.kind === 'nanite' && b.orb > 0) { // orbit phase
        b.orb -= dt; b.oa += dt * 7; b.x = p.x + Math.cos(b.oa) * b.orad; b.y = p.y + Math.sin(b.oa) * b.orad;
        if (b.orb <= 0) { b.target = X.nearest(b.x, b.y, 260); b.homing = 9; b.accel = 260; b.maxSp = b.sp + 60; const a = b.target ? Math.atan2(b.target.y - b.y, b.target.x - b.x) : b.oa + Math.PI / 2; b.vx = Math.cos(a) * b.sp * 0.6; b.vy = Math.sin(a) * b.sp * 0.6; b.life = 2.2; }
        else { b.vx = b.vy = 0; b.life = Math.max(b.life, 1); }
      }
      if (b.kind === 'wave') b.w += (b.grow || 0) * dt;
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
        if (b.hole && b.life <= 0) spawnHole(b.x, b.y);
        b.dead = true; continue;
      }
      for (const t of targets) {
        if (t.dead || t.untargetable || (b.hit && b.hit.has(t))) continue;
        if (b.kind === 'wave') { // crescent: lateral within width, along close to the curve along = -lat^2/(2.5w)
          const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp, dx = t.x - b.x, dy = t.y - b.y, al = dx * ux + dy * uy, lat = dx * -uy + dy * ux;
          if (Math.abs(lat) > b.w + t.r || Math.abs(al + lat * lat / (2.5 * b.w)) > 5 + t.r) continue;
        } else { const rr = t.r + (b.r || 2); if (U.d2(b.x, b.y, t.x, t.y) > rr * rr) continue; }
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
    if (b.kind !== 'wave' && t.shieldBlocks && t.shieldBlocks(Math.atan2(b.vy, b.vx))) { X.blocked(t, b.x, b.y); b.dead = true; return; }
    if (b.hole) { b.hole = false; spawnHole(b.x, b.y); }
    if (b.aoe) { aoe(b); b.dead = true; return; }
    X.damage(t, b.dmg, b.crit, b.x, b.y);
    if (b.burn) t.burn = { dps: Math.max((t.burn && t.burn.dps) || 0, b.burn), t: 1.6 };
    if (b.kind !== 'flame' && b.kind !== 'wave') F().anim('fx_hit', b.x, b.y);
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
    R.bullets = []; R.rails = []; R.missileT = 2; R.orbitA = 0; R.evolved = false; R.skfx = []; R.skRate = 1; R.skRateT = 0; R.drill = null; R.p.burst = null;
    const sd = skillDef(st.weapon.id);
    R.skill = sd && sd.id ? { id: sd.id, def: sd, t: sd.every || 0, shots: 0, active: 0 } : null;
    const sc = st.secondary;
    R.sec = sc && sc.id ? { id: sc.id, lvl: sc.lvl || 1, mult: sc.mult || 1 + 0.06 * ((sc.lvl || 1) - 1), def: secDef(sc.id), t: 1, a: 0, x: R.p.x - 22, y: R.p.y - 6, mines: [], pts: null, pulse: null } : null;
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
