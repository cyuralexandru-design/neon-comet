'use strict';
// Neon Comet 3.1 engine: bosses (every 50k) and mini-bosses (25k, 75k, ...). Telegraphed attack library from v2:
// aimed (with lead), gapRing, sweep (beam), mines, ram, spiral, orbs, blink. Bosses face down and live in the top band,
// always fully below the top HUD (NC.game.hudTop + 4). Boss phases switch at exactly 2/3 and 1/3 hp (= the 3 boss-bar segments).
(function (NC) {
  const U = NC.U, X = NC.eng = NC.eng || {};
  const F = () => NC.fx;
  const B = NC.bosses = {};

  B.BOSSES = [
    { id: 'colos', hp: 9000, col: '#e43b44', col2: '#feae34',
      phases: [['aimed', 'gapRing', 'aimed', 'sweep'], ['aimed', 'gapRing', 'sweep', 'mines'], ['sweep', 'aimed', 'ram', 'gapRing', 'mines']] },
    { id: 'nucleu', hp: 15000, col: '#c65197', col2: '#2ce8f5',
      phases: [['spiral', 'orbs', 'aimed'], ['spiral', 'orbs', 'blink', 'gapRing'], ['blink', 'spiral', 'orbs', 'sweep', 'blink']] },
    { id: 'leviatan', hp: 23000, col: '#feae34', col2: '#e43b44',
      phases: [['ram', 'aimed', 'gapRing'], ['ram', 'sweep', 'mines', 'aimed'], ['ram', 'sweep', 'ram', 'spiral', 'mines']] },
    { id: 'stup', hp: 32000, col: '#63c74d', col2: '#fee761',
      phases: [['orbs', 'aimed', 'mines'], ['orbs', 'spiral', 'mines', 'aimed'], ['orbs', 'gapRing', 'spiral', 'ram', 'mines']] },
    { id: 'imparat', hp: 44000, col: '#fee761', col2: '#c65197',
      phases: [['aimed', 'sweep', 'gapRing', 'blink'], ['spiral', 'sweep', 'blink', 'mines', 'aimed'], ['blink', 'sweep', 'spiral', 'ram', 'gapRing', 'orbs']] },
  ];
  B.MINIS = [
    { id: '1', hp: 2600, col: '#f77622', col2: '#fee761', phases: [['aimed', 'gapRing']] },
    { id: '2', hp: 3000, col: '#2ce8f5', col2: '#c65197', phases: [['spiral', 'ram', 'aimed']] },
    { id: '3', hp: 3400, col: '#b55088', col2: '#63c74d', phases: [['mines', 'sweep', 'aimed']] },
  ];
  // engine attack patterns/colors + NC.DATA.bossFor(i) (hp with loop scaling, points, cr, chest, phases)
  B.def = (idx) => {
    const d = Object.assign({}, B.BOSSES[idx % B.BOSSES.length]);
    if (NC.DATA && NC.DATA.bossFor) { const D = NC.DATA.bossFor(idx); Object.assign(d, { hp: D.hp, points: D.points, cr: D.cr, chest: D.chest, dmgK: D.dmg / 18 }); if (D.phases) d.phases = D.phases; }
    else { d.hp = Math.round(d.hp * Math.pow(1.6, Math.floor(idx / B.BOSSES.length))); d.points = 5000 * (1 + idx); d.cr = 1500 * (1 + idx); d.chest = Math.min(4, 1 + Math.floor(idx / 2)); }
    return d;
  };
  B.bossHp = (idx) => B.def(idx).hp;
  B.miniDef = (n) => {
    const d = Object.assign({}, B.MINIS[n % B.MINIS.length]);
    if (NC.DATA && NC.DATA.mbossFor) { const D = NC.DATA.mbossFor(n); Object.assign(d, { hp: D.hp, points: D.points, cr: D.cr, chest: D.chest }); if (D.attacks) d.phases = [D.attacks]; }
    else { d.hp = Math.round(d.hp * (1 + 0.45 * n)); d.points = 2000; d.cr = 600; d.chest = 0; }
    return d;
  };

  // resting band: whole sprite below the HUD safe line, never deeper than ~45% of the screen
  B.minY = (b) => Math.min((X.safeTop ? X.safeTop() : 26) + b.size / 2, X.G.H * 0.45);
  B.restY = (b, span) => B.minY(b) + U.rnd(0, span);
  B.PHASES = 3;
  B.phaseOf = (b) => { if (!b.big) return 0; const f = b.hp / b.max; return f > 2 / 3 ? 0 : f > 1 / 3 ? 1 : 2; };

  // ------------------------------------------------------------ creation
  B.ATK = {}; // extra attacks {start(b, A, phase), update(b, A, dt, mul) -> done} (story bosses)
  B.spawnBoss = (idx, over) => { // over = custom def (story world boss)
    const R = X.R, G = X.G, def = over || B.def(idx), hp = Math.round((over ? over.hp : B.bossHp(idx)) * ((NC.game.diffMul && NC.game.diffMul().hp) || 1));
    const b = R.boss = {
      kind: 'boss', big: true, def, idx, id: def.id, spr: 'boss_' + def.id, size: 112, r: 34, x: G.W / 2, y: -60, tx: G.W / 2, ty: 0,
      hp, max: hp, state: 'enter', phase: 0, step: 0, t: 0, cool: 1.2, atk: null, flash: 0, inv: 0, alpha: 1, untargetable: true,
      nameKey: 'boss.' + def.id + '.name',
    };
    b.ty = B.minY(b) + 2;
    U.ui('showBossBar', { id: def.id, nameKey: b.nameKey, hp, mini: false, col: def.col, segs: B.PHASES });
    U.sfx('boss_intro'); F().doShake(4);
    return b;
  };
  B.spawnMini = (n, over) => {
    const R = X.R, G = X.G, d = over || B.miniDef(n);
    const hp = Math.round(d.hp * ((NC.game.diffMul && NC.game.diffMul().hp) || 1));
    const b = R.mboss = {
      kind: 'mboss', big: false, def: d, idx: n, id: d.id, spr: 'mboss_' + d.id, size: 48, r: 17, x: U.rnd(60, G.W - 60), y: -30, tx: G.W / 2, ty: 0,
      hp, max: hp, state: 'enter', phase: 0, step: 0, t: 0, cool: 1, atk: null, flash: 0, inv: 0, alpha: 1, untargetable: true,
      nameKey: 'mboss.' + d.id + '.name',
    };
    b.ty = B.minY(b) + 6;
    U.ui('alert', 'elite', { nameKey: b.nameKey, mini: true, id: b.id });
    U.sfx('warn');
    return b;
  };

  // ------------------------------------------------------------ helpers
  const tm = (b) => (b.big ? 1 : 0.7) * ((NC.game.diffMul && NC.game.diffMul().dmg) || 1) * (NC.DATA && NC.DATA.bossDmgScale ? (b.def.dmgK || 1) * NC.DATA.bossDmgScale(X.R.sector) : 1 + 0.1 * Math.min(X.R.sector, 10));
  function reposition(b) {
    const G = X.G, p = X.R.p;
    let best = null, bs = -1e9;
    for (let i = 0; i < 8; i++) {
      const x = U.rnd(b.size * 0.45, G.W - b.size * 0.45), y = B.restY(b, b.big ? 14 : 30);
      const s = -Math.abs(x - p.x) * 0.3 - Math.abs(x - b.x) * 0.2 + U.rnd(0, 30);
      if (s > bs) { bs = s; best = { x, y }; }
    }
    b.tx = best.x; b.ty = best.y;
  }
  const muzzle = (b) => ({ x: b.x, y: b.y + (b.big ? 30 : 14) });

  function startAttack(b) {
    const list = b.def.phases[Math.min(b.phase, b.def.phases.length - 1)], name = list[b.step % list.length]; b.step++;
    const ph = b.phase, p = X.R.p, k = b.big ? 1 : 0.7;
    const A = b.atk = { name, t: 0, n: 0 };
    switch (name) {
      case 'aimed': A.volleys = (b.big ? 3 : 2) + ph; A.next = 0.5; break;
      case 'gapRing': A.rings = ph >= 1 ? 2 : 1; A.next = 0.7; U.sfx('beam_charge'); F().ring(b.x, b.y, b.def.col, b.big ? 50 : 24, 0.6); break;
      case 'sweep': {
        const m = muzzle(b), pa = Math.atan2(p.y - m.y, p.x - m.x), side = Math.random() < 0.5 ? -1 : 1;
        A.side = side; A.a0 = pa - side * 0.9; A.span = 1.8;
        const bm = { x: m.x, y: m.y, ang: A.a0, len: 500, w: (b.big ? 8 : 5) + ph * 2, charge: 1.1 - ph * 0.1, fire: 1.8 - ph * 0.15, t: 0, dmg: 40 * tm(b), tick: 0, owner: 'boss', col: b.def.col, src: b };
        A.beam = bm; X.R.beams.push(bm); U.sfx('beam_charge'); break;
      }
      case 'mines': {
        const c = NC.enemies.lead(b.x, b.y, 90), n = Math.round((5 + ph * 2) * k);
        for (let i = 0; i < n; i++) { const a = i / n * U.TAU + U.rnd(-0.2, 0.2), d = i === 0 ? 0 : U.rnd(26, 56); X.R.mines.push({ x: U.clamp(c.x + Math.cos(a) * d, 8, X.G.W - 8), y: U.clamp(c.y + Math.sin(a) * d, 8, X.G.H - 8), t: 0, arm: 1.3 + i * 0.07, r: 20, dmg: 30 * tm(b), col: b.def.col }); }
        A.dur = 1.6; break;
      }
      case 'ram': { const c = NC.enemies.lead(b.x, b.y, 260); A.tx = U.clamp(c.x, 20, X.G.W - 20); A.ty = U.clamp(c.y, 20, X.G.H - 10); A.tele = 0.9 - ph * 0.1; A.ang = Math.atan2(A.ty - b.y, A.tx - b.x); A.hx = b.x; A.hy = b.y; break; }
      case 'spiral': A.dur = (2.4 + ph * 0.4) * (b.big ? 1 : 0.7); A.arms = (b.big ? 3 : 2) + (ph >= 2 ? 1 : 0); A.rot = U.rnd(0, U.TAU); A.next = 0; A.dir = Math.random() < 0.5 ? -1 : 1; break;
      case 'orbs': A.count = 3 + ph; A.next = 0.3; break;
      case 'blink': A.nx = U.rnd(b.size * 0.45, X.G.W - b.size * 0.45); A.ny = B.restY(b, b.big ? 16 : 30); A.dur = 0.8; break;
      default: if (B.ATK[name]) B.ATK[name].start(b, A, ph); else A.skip = true;
    }
  }

  function updateOne(b, dt) {
    const R = X.R, G = X.G, p = R.p, mul = tm(b);
    b.t += dt; b.flash = Math.max(0, b.flash - dt); b.inv = Math.max(0, b.inv - dt);
    if (b.burn) { b.burn.t -= dt; b.burnTick = (b.burnTick || 0) - dt; if (b.burnTick <= 0) { b.burnTick = 0.25; X.damage(b, b.burn.dps * 0.25, false, b.x, b.y, { quiet: true }); } if (b.burn && b.burn.t <= 0) b.burn = null; }
    const ease = (k) => { b.x += (b.tx - b.x) * Math.min(1, dt * k); b.y += (b.ty - b.y) * Math.min(1, dt * k); };
    if (b.state === 'enter') { b.ty = Math.max(b.ty, B.minY(b)); ease(1.4); if (Math.abs(b.y - b.ty) < 2) { b.state = 'idle'; b.cool = 0.8; b.untargetable = false; } return; }
    // phase change (bosses only): exactly at 2/3 and 1/3 hp (matches the 3-segment boss bar), no banner (SPEC-31 §2.1)
    const nph = B.phaseOf(b);
    if (nph > b.phase) {
      b.phase = nph; b.step = 0; b.atk = null; b.state = 'idle'; b.cool = 1.4; b.inv = 1.2; b.hidden = false; b.alpha = 1; b.untargetable = false;
      R.ebullets.length = 0; R.beams = R.beams.filter(x => x.owner !== 'boss');
      F().ring(b.x, b.y, b.def.col, 140, 0.8); F().doFlash(b.def.col, 0.3); F().doShake(5); F().hitstop = 0.1;
      U.sfx('boss_phase'); NC.Input && NC.Input.buzz && NC.Input.buzz(80, 0.6);
      const d = Math.hypot(p.x - b.x, p.y - b.y) || 1; if (d < 70) { p.vx = (p.x - b.x) / d * 220; p.vy = (p.y - b.y) / d * 220; }
    }
    if (b.stun > 0) b.stun -= dt; // story: Star Pulse stun
    else if (b.state === 'idle') {
      ease(2); b.cool -= dt;
      if (b.cool <= 0) { b.state = 'attack'; startAttack(b); }
    } else {
      const A = b.atk; A.t += dt; let done = false;
      const m = muzzle(b);
      switch (A.name) {
        case 'aimed': {
          ease(1); A.next -= dt;
          if (A.next <= 0) {
            const sp = 85 + b.phase * 12, guns = b.big ? [-28, 28] : [0];
            for (const ox of guns) {
              const sx = b.x + ox, sy = m.y, t = NC.enemies.lead(sx, sy, sp), a = Math.atan2(t.y - sy, t.x - sx);
              const n = b.big ? 2 : 1;
              for (let i = -n; i <= n; i++) X.eshoot(sx, sy, a + i * 0.1, sp, 12 * mul, 'eb_small');
            }
            U.sfx('hit'); A.n++; A.next = 0.6 - b.phase * 0.08;
            if (A.n >= A.volleys) done = true;
          }
          break;
        }
        case 'gapRing': {
          A.next -= dt;
          if (A.next <= 0) {
            const n = (b.big ? 30 : 18) + b.phase * 4, pa = Math.atan2(p.y - b.y, p.x - b.x);
            const gap = pa + (A.n % 2 ? -1 : 1) * Math.PI / 2 * U.rnd(0.8, 1.1), gw = 0.45 - b.phase * 0.04;
            for (let i = 0; i < n; i++) { const a = i / n * U.TAU; if (Math.abs(U.angDiff(a, gap)) < gw) continue; X.eshoot(b.x, b.y + 4, a, 52 + b.phase * 6, 13 * mul, 'eb_small'); }
            F().ring(b.x, b.y, b.def.col, 40, 0.4); U.sfx('hit');
            A.n++; A.next = 0.8; if (A.n >= A.rings) done = true;
          }
          break;
        }
        case 'sweep': {
          const bm = A.beam; bm.x = m.x; bm.y = m.y;
          if (bm.t >= bm.charge) { const k = U.clamp((bm.t - bm.charge) / bm.fire, 0, 1); bm.ang = A.a0 + A.side * A.span * (k * k * (3 - 2 * k)); }
          if (bm.t >= bm.charge + bm.fire) done = true;
          break;
        }
        case 'mines': ease(1); if (A.t >= A.dur) done = true; break;
        case 'ram': {
          if (A.t < A.tele) { b.x += Math.sin(A.t * 60) * 0.4; A.tel = true; }
          else if (!A.back) {
            if (!A.go) { A.go = true; A.tel = false; A.vx = Math.cos(A.ang) * 260; A.vy = Math.sin(A.ang) * 260; U.sfx('dash'); }
            b.x += A.vx * dt; b.y += A.vy * dt;
            if (Math.random() < 0.5) F().burst(b.x, b.y - b.size * 0.3, b.def.col, 1, 20, 0.4);
            if (b.phase >= 2 && (A.sp = (A.sp || 0) - dt) <= 0) { A.sp = 0.1; for (const s of [-1, 1]) X.eshoot(b.x, b.y, A.ang + s * Math.PI / 2, 45, 10 * mul, 'eb_small'); }
            const h = b.size * 0.3;
            if (b.x < h || b.x > G.W - h || b.y > G.H - h * 0.5 || A.t > A.tele + 1.2) { F().ring(b.x, b.y, b.def.col, 50, 0.5); F().doShake(5); A.back = true; b.tx = A.hx; b.ty = A.hy; }
          } else { ease(3); if (Math.abs(b.y - b.ty) < 3) done = true; }
          break;
        }
        case 'spiral': {
          A.next -= dt; A.rot += dt * 2.1 * A.dir;
          if (A.next <= 0) { for (let i = 0; i < A.arms; i++) X.eshoot(b.x, b.y + 4, A.rot + i / A.arms * U.TAU, 50, 11 * mul, 'eb_small'); A.next = 0.1; }
          if (A.t >= A.dur) done = true;
          break;
        }
        case 'orbs': {
          A.next -= dt;
          if (A.next <= 0 && A.n < A.count) {
            const a = Math.PI / 2 + U.rnd(-1.2, 1.2), hp = X.eff().atk * 3;
            R.orbs.push({ kind: 'orb', x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, r: 5, hp, max: hp, life: 6.5, dmg: 20 * mul, t: 0, flash: 0, col: b.def.col2 });
            A.n++; A.next = 0.32;
          }
          if (A.n >= A.count && A.t > 1.2) done = true;
          break;
        }
        case 'blink': {
          const k = A.t / A.dur;
          if (k < 0.5) { b.alpha = 1 - k * 2; b.hidden = k > 0.35; b.untargetable = b.hidden; }
          else { if (!A.moved) { A.moved = true; b.x = b.tx = A.nx; b.y = b.ty = A.ny; F().ring(b.x, b.y, b.def.col, 40, 0.4); } b.alpha = (k - 0.5) * 2; b.hidden = false; b.untargetable = false; }
          if (A.t >= A.dur) {
            b.alpha = 1; const n = b.big ? 22 : 14, pa = Math.atan2(p.y - b.y, p.x - b.x);
            for (let i = 0; i < n; i++) { const a = i / n * U.TAU; if (Math.abs(U.angDiff(a, pa)) < 0.4) continue; X.eshoot(b.x, b.y, a, 55, 12 * mul, 'eb_small'); }
            done = true;
          }
          break;
        }
        default: done = A.skip || !B.ATK[A.name] || !!B.ATK[A.name].update(b, A, dt, mul);
      }
      if (done) { b.state = 'idle'; b.atk = null; b.cool = ([1.3, 1.05, 0.85][b.phase] || 0.85) * (b.big ? 1 : 1.3) + U.rnd(0, 0.3); reposition(b); }
    }
    const h = b.size * 0.3;
    if (b.ty < B.minY(b)) b.ty = B.minY(b);
    if (!(b.atk && b.atk.name === 'ram')) {
      b.x = U.clamp(b.x, h, G.W - h); b.y = Math.min(b.y, G.H - h);
      const my = B.minY(b); if (b.y < my - 2) b.y += (my - b.y) * Math.min(1, dt * 4); // eased back below the HUD, no snapping
    }
    // contact damage (hit circle)
    if (!b.hidden && p.alive && U.d2(p.x, p.y, b.x, b.y) < (b.r + p.r) ** 2) {
      X.damagePlayer(28 * mul);
      const d = Math.hypot(p.x - b.x, p.y - b.y) || 1; p.vx = (p.x - b.x) / d * 200; p.vy = (p.y - b.y) / d * 200;
    }
  }
  B.update = (dt) => {
    const R = X.R;
    if (R.boss) updateOne(R.boss, dt);
    if (R.mboss) updateOne(R.mboss, dt);
    // homing orbs
    const p = R.p;
    for (const o of R.orbs) {
      o.t += dt; o.life -= dt; o.flash = Math.max(0, o.flash - dt);
      const a = Math.atan2(p.y - o.y, p.x - o.x), sp = 36 + o.t * 3, cur = Math.atan2(o.vy, o.vx), na = cur + U.clamp(U.angDiff(cur, a), -1.6 * dt, 1.6 * dt);
      o.vx = Math.cos(na) * sp; o.vy = Math.sin(na) * sp; o.x += o.vx * dt; o.y += o.vy * dt;
      if (o.hp <= 0) { o.dead = true; F().explode(o.x, o.y, 10, o.col); X.dropCrystals(o.x, o.y, 2); continue; }
      if (o.life <= 0) { o.dead = true; F().burst(o.x, o.y, o.col, 6, 40); continue; }
      if (p.alive && U.d2(o.x, o.y, p.x, p.y) < (o.r + p.r) ** 2) { o.dead = true; F().explode(o.x, o.y, 12, o.col); X.damagePlayer(o.dmg); }
    }
    R.orbs = R.orbs.filter(o => !o.dead);
  };
})(window.NC = window.NC || {});
