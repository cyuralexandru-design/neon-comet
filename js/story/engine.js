'use strict';
// Neon Comet STORY MODE engine (agent "engine", SPEC-STORY.md). Runs a story level on the normal engine:
// NC.game.startStory(levelId) -> G.start({story}) with crew passives; scripted waves (NC.STORY level.waves) instead of the endless
// spawner; wave text; optional mini/world boss; win/lose -> U.ui('storyEnd', {won, id, hpFrac, time}). Crew abilities
// NC.game.useAbility(slot) (keys 1/2/3, pad L1/R1/L2 via NC.Input.takeAb), HUD state NC.hud.crew = [{id, cd01, active}].
// New chapter-1 enemies scav/hulk(+scrap)/ghost/tether(+tmine), mini-boss salvager, world boss graveking.
// Hooks used (game.js/enemies.js/bosses.js): X.storyInit/storyDirector/storyStep/storyBossDown/storyEnd/storyHud,
// R.slow (enemy time 50%), e.ally/e.stun, EN.AI/EN.DEATH, B.ATK, B.spawnBoss(idx, def)/B.spawnMini(n, def), st.dashRange.
(function (NC) {
  const U = NC.U, X = NC.eng = NC.eng || {}, G = NC.game, EN = NC.enemies, B = NC.bosses;
  const F = () => NC.fx;
  const SS = () => (NC.story && NC.story.sys) || null;
  const call = (fn, ...a) => { try { const s = SS(); if (s && typeof s[fn] === 'function') return s[fn](...a); } catch (e) { console.error('NC.story.sys.' + fn, e); } return undefined; };

  // ------------------------------------------------------------ new enemies
  const NEW = {
    scav: { size: 16, hp: 40, dmg: 8, sp: 75, score: 160, cr: 3, xp: 3, ai: 'scav', col: '#feae34' },
    hulk: { size: 40, hp: 340, dmg: 24, sp: 10, score: 520, cr: 12, xp: 9, ai: 'hulk', col: '#8b9bb4' },
    scrap: { size: 12, hp: 30, dmg: 10, sp: 45, score: 40, cr: 1, xp: 1, ai: 'shard', col: '#8b9bb4', child: true },
    ghost: { size: 24, hp: 95, dmg: 14, sp: 45, score: 300, cr: 8, xp: 6, ai: 'ghost', col: '#8fd3ff' },
    tether: { size: 24, hp: 120, dmg: 12, sp: 26, score: 340, cr: 9, xp: 7, ai: 'tether', col: '#2ce8f5' },
    tmine: { size: 10, hp: 22, dmg: 16, sp: 0, score: 30, cr: 0, xp: 0, ai: 'tmine', col: '#2ce8f5', child: true },
  };
  for (const [id, d] of Object.entries(NEW)) { EN.DEFS[id] = d; NC.assets.declare('en_' + id, d.size, d.size, 2, 6); }
  NC.assets.declare('mboss_salvager', 48, 48, 1, 0); NC.assets.declare('boss_graveking', 112, 112, 1, 0);
  const top = (e) => EN.top(e);
  const isItem = (it) => it.kind === 'cr' || it.kind === 'xp' || it.kind === 'star';

  EN.AI.scav = (e, dt, R, Gm, p) => { // steals nearby pickups, then flees off the top
    if (e.flee) { e.vy = -110; e.vx *= 0.95; if (e.y < -e.size) { e.dead = true; e.silent = true; } return; }
    e.st -= dt;
    let it = e.prey && !e.prey.dead ? e.prey : null;
    if (!it) { let bd = 140 * 140; for (const i of R.items) if (isItem(i) && !i.home && !i.stolen) { const d = U.d2(i.x, i.y, e.x, e.y); if (d < bd) { bd = d; it = i; } } e.prey = it; }
    if (it) {
      EN.steer(e, it.x, it.y, e.d.sp, 3, dt);
      if (U.d2(it.x, it.y, e.x, e.y) < 100) { it.dead = true; it.stolen = true; e.loot = (e.loot || 0) + (it.kind === 'cr' ? it.v || 1 : 2); e.prey = null; F().spark(e.x, e.y, '#feae34', 0, -20); }
    } else EN.steer(e, U.clamp(Gm.W / 2 + Math.sin(e.t * 0.8 + e.seed) * Gm.W * 0.4, 10, Gm.W - 10), EN.band(e, e.homeY, 40), e.d.sp * 0.6, 1.5, dt);
    if ((e.loot || 0) >= 12 || e.t > 9) { e.flee = true; e.ai = 'free'; }
  };
  EN.DEATH.scav = (e) => { if (!e.silent && e.loot) X.dropCrystals(e.x, e.y, e.loot * 1.5 + 4, 4); };
  EN.AI.hulk = (e, dt, R, Gm) => { // slow drifting hull: drifts down to ~60%, sways, drifts back up
    if (e.dir == null) e.dir = 1;
    e.vx = Math.sin(e.t * 0.35 + e.seed) * e.d.sp * 1.4;
    e.vy = e.dir * e.d.sp;
    if (e.y > Gm.H * 0.6) e.dir = -1; else if (e.y < top(e) + 4) e.dir = 1;
    if (Math.random() < dt * 0.6) F().spark(e.x + U.rnd(-14, 14), e.y + U.rnd(-10, 10), '#feae34', 0, 8, 0.4);
  };
  EN.DEATH.hulk = (e) => { if (e.silent) return; for (let i = 0; i < 3; i++) { const a = U.rnd(0, U.TAU); EN.spawn('scrap', { x: e.x + Math.cos(a) * 8, y: e.y + Math.sin(a) * 8, vx: Math.cos(a) * 50, vy: Math.sin(a) * 50, elite: false }); } F().doShake(3); };
  EN.AI.ghost = (e, dt, R, Gm, p) => { // phases: visible 2.4 s (shoots on appear) / phased 1.6 s (invisible + intangible, repositions)
    e.st -= dt;
    if (e.state !== 'phase') {
      EN.steer(e, e.tx != null ? e.tx : e.x, EN.band(e, e.ty != null ? e.ty : e.homeY, 50), e.d.sp, 1.5, dt);
      if (e.st <= 0) { e.state = 'phase'; e.st = 1.6; e.cloaked = true; e.untargetable = true; e.tx = U.clamp(p.x + U.rnd(-60, 60), 14, Gm.W - 14); e.ty = U.rnd(top(e), Math.max(top(e) + 8, Gm.H * 0.5)); F().ring(e.x, e.y, '#8fd3ff', 12, 0.3); }
    } else {
      EN.steer(e, e.tx, e.ty, e.d.sp * 1.8, 2, dt);
      if (e.st <= 0) { e.state = 'idle'; e.st = 2.4; e.cloaked = false; e.untargetable = false; F().ring(e.x, e.y, '#8fd3ff', 14, 0.3); const a = EN.aimAt(e, 80); for (const o of [-0.15, 0.15]) X.eshoot(e.x, e.y, a + o, 80, e.dmg, 'eb_small'); }
    }
  };
  EN.AI.tether = (e, dt, R, Gm) => { // hovers and lays mines linked by laser beams (max 4 alive)
    EN.steer(e, U.clamp(Gm.W / 2 + Math.sin(e.t * 0.4 + e.seed) * Gm.W * 0.4, 14, Gm.W - 14), EN.band(e, e.homeY, 50), e.d.sp, 1, dt);
    e.mines = (e.mines || []).filter(m => !m.dead);
    e.fireT -= dt;
    if (e.fireT <= 0 && e.mines.length < 4) {
      const m = EN.spawn('tmine', { x: e.x, y: e.y + 10, vx: U.rnd(-20, 20), vy: U.rnd(25, 45), elite: false });
      if (m) { m.owner = e; e.mines.push(m); U.sfx('warn'); }
      e.fireT = U.rnd(2.2, 3);
    }
  };
  EN.DEATH.tether = (e) => { for (const m of e.mines || []) if (!m.dead) { m.dead = true; m.silent = true; F().explode(m.x, m.y, 10, '#2ce8f5'); } };
  EN.AI.tmine = (e, dt) => { e.vx *= Math.pow(0.1, dt); e.vy *= Math.pow(0.1, dt); };
  function tetherBeams(R) { // a beam between consecutive mines of the same tether (engine beam code draws + damages)
    const want = new Set();
    for (const e of R.enemies) {
      if (e.type !== 'tether' || e.dead || !e.mines) continue;
      const ms = e.mines.filter(m => !m.dead);
      for (let i = 0; i + 1 < ms.length; i++) {
        const a = ms[i], b = ms[i + 1], key = a.seed + ':' + b.seed;
        let bm = R._tb[key];
        if (!bm || bm.dead || !R.beams.includes(bm)) { bm = R._tb[key] = { x: a.x, y: a.y, ang: 0, len: 1, w: 2, charge: 0.8, fire: 1e9, t: 0, dmg: e.dmg, tick: 0, owner: 'tether', col: '#2ce8f5' }; R.beams.push(bm); }
        bm.x = a.x; bm.y = a.y; bm.ang = Math.atan2(b.y - a.y, b.x - a.x); bm.len = Math.hypot(b.x - a.x, b.y - a.y); bm.fired = true;
        want.add(key);
      }
    }
    for (const k of Object.keys(R._tb)) if (!want.has(k)) { R._tb[k].dead = true; delete R._tb[k]; }
  }

  // hijacked enemy (Sable): fights for the player, then self-destructs
  EN.allyAI = (e, dt) => {
    const R = X.R; e.ally -= dt; e.cloaked = false;
    let t = null, bd = 1e9;
    for (const o of R.enemies) if (!o.dead && !o.ally && o.leaving == null && !o.untargetable) { const d = U.d2(o.x, o.y, e.x, e.y); if (d < bd) { bd = d; t = o; } }
    if (!t) t = R.boss || R.mboss;
    if (t) {
      EN.steer(e, t.x, Math.max(top(e), t.y + 30), Math.max(40, e.d.sp), 1.5, dt);
      e.allyT = (e.allyT || 0) - dt;
      if (e.allyT <= 0) { e.allyT = 0.35; const a = Math.atan2(t.y - e.y, t.x - e.x); X.addBullet({ kind: 'ally', spr: 'proj_ally', col: '#c65197', x: e.x, y: e.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, dmg: X.eff().atk * 1.6 * (e.allyPow || 1), life: 1.4 }); }
      if (t.kind === 'enemy' && U.d2(t.x, t.y, e.x, e.y) < (t.r + e.r) ** 2) X.damage(t, X.eff().atk * 4 * dt, false, t.x, t.y, { quiet: true });
    } else { e.vx *= 0.9; e.vy *= 0.9; }
    if (Math.random() < dt * 8) F().spark(e.x + U.rnd(-5, 5), e.y + U.rnd(-5, 5), '#c65197', 0, -10, 0.3);
    if (e.ally <= 0) { e.ally = 0; e.untargetable = false; F().ring(e.x, e.y, '#c65197', 26, 0.4); X.damage(e, e.hp + 1, false, e.x, e.y, { quiet: true }); }
  };

  // ------------------------------------------------------------ story bosses
  const BOSS = {
    salvager: { id: 'salvager', hp: 3200, col: '#feae34', col2: '#8b9bb4', mini: true, phases: [['aimed', 'summon', 'gapRing', 'ram', 'aimed', 'magnet']] },
    graveking: { id: 'graveking', hp: 12000, col: '#8fd3ff', col2: '#feae34',
      phases: [['aimed', 'gapRing', 'summon', 'aimed'], ['sweep', 'tetherNet', 'aimed', 'mines', 'summon'], ['ram', 'spiral', 'tetherNet', 'sweep', 'summon', 'gapRing']] },
  };
  B.ATK.summon = { // calls salvage drones / hulls
    start: (b, A, ph) => { A.n = 0; A.next = 0.3; A.cnt = b.big ? 2 + ph : 2; A.type = b.big && ph >= 1 ? ['scav', 'ghost', 'hulk'] : ['scav']; F().ring(b.x, b.y, b.def.col, b.big ? 60 : 28, 0.5); U.sfx('beam_charge'); },
    update: (b, A, dt) => { A.next -= dt; if (A.next <= 0 && A.n < A.cnt) { A.n++; A.next = 0.35; const e = EN.spawn(U.pick(A.type), { x: U.clamp(b.x + U.rnd(-40, 40), 12, X.G.W - 12), y: b.y + 10, vx: U.rnd(-40, 40), vy: 50, elite: false }); if (e) F().anim('fx_spark', e.x, e.y); } return A.n >= A.cnt && A.t > 1; },
  };
  B.ATK.magnet = { // salvager: drags the player towards it for 1.6 s while firing slow bullets
    start: (b, A) => { A.dur = 1.6; A.next = 0; U.sfx('magnet'); },
    update: (b, A, dt, mul) => {
      const p = X.R.p, dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (p.alive && p.dashT <= 0) { p.x += dx / d * 32 * dt; p.y += dy / d * 32 * dt; }
      if (Math.random() < dt * 30) F().spark(p.x + dx * Math.random(), p.y + dy * Math.random(), b.def.col, dx / d * 40, dy / d * 40, 0.25);
      A.next -= dt; if (A.next <= 0) { A.next = 0.4; X.eshoot(b.x, b.y + 10, Math.atan2(-dy, -dx), 60, 10 * mul, 'eb_small'); }
      return A.t >= A.dur;
    },
  };
  B.ATK.tetherNet = { // graveking: drops a ring of linked mines around the player that detonate
    start: (b, A, ph) => {
      const R = X.R, p = R.p, n = 5 + ph, rr = 42;
      for (let i = 0; i < n; i++) { const a = i / n * U.TAU; R.mines.push({ x: U.clamp(p.x + Math.cos(a) * rr, 8, X.G.W - 8), y: U.clamp(p.y + Math.sin(a) * rr, 8, X.G.H - 8), t: 0, arm: 1.6, r: 16, dmg: 26, col: b.def.col }); }
      A.dur = 1.7; U.sfx('warn');
    },
    update: (b, A) => A.t >= A.dur,
  };

  // ------------------------------------------------------------ fallback sprites (only when the art agent's file is missing)
  function fallbackSprites() {
    const A = NC.assets; if (!A || typeof document === 'undefined') return;
    const mk = (id, w, h, frames, fps, draw) => {
      if (A.has(id)) return; const c = document.createElement('canvas'); c.width = w * frames; c.height = h; const g = c.getContext('2d');
      for (let f = 0; f < frames; f++) { g.save(); g.translate(f * w, 0); draw(g, f, w, h); g.restore(); }
      A.cache[id] = { img: c, w, h, frames, fps, anchor: [w >> 1, h >> 1], id, fallback: true };
    };
    const box = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    mk('en_scav', 16, 16, 2, 6, (g, f) => { box(g, 5, 4, 6, 7, '#5a6988'); box(g, 6, 5, 4, 4, '#feae34'); box(g, 2, 9 + f, 3, 4, '#8b9bb4'); box(g, 11, 9 + f, 3, 4, '#8b9bb4'); box(g, 7, 6, 2, 2, '#ffffff'); });
    mk('en_hulk', 40, 40, 2, 3, (g, f) => { box(g, 4, 10, 32, 20, '#3a4466'); box(g, 8, 6, 20, 6, '#5a6988'); box(g, 6, 28, 26, 4, '#262b44'); box(g, 12, 14, 4, 4, f ? '#feae34' : '#f77622'); box(g, 26, 18, 6, 2, '#8b9bb4'); box(g, 2, 16, 3, 8, '#181425'); });
    mk('en_scrap', 12, 12, 2, 6, (g, f) => { box(g, 2, 3, 7, 5, '#5a6988'); box(g, 4 + f, 4, 3, 2, '#8b9bb4'); box(g, 8, 7, 2, 3, '#3a4466'); });
    mk('en_ghost', 24, 24, 2, 4, (g, f) => { g.globalAlpha = 0.85; box(g, 7, 4, 10, 14, '#8fd3ff'); box(g, 4, 10, 16, 5, '#5a6988'); box(g, 9, 18, 2, 3 + f, '#8fd3ff'); box(g, 13, 18, 2, 4 - f, '#8fd3ff'); box(g, 10, 8, 4, 2, '#ffffff'); });
    mk('en_tether', 24, 24, 2, 6, (g, f) => { box(g, 6, 6, 12, 12, '#262b44'); box(g, 8, 8, 8, 8, '#2ce8f5'); box(g, 10, 10, 4, 4, f ? '#ffffff' : '#124e89'); box(g, 2, 11, 4, 2, '#5a6988'); box(g, 18, 11, 4, 2, '#5a6988'); });
    mk('en_tmine', 10, 10, 2, 6, (g, f) => { box(g, 2, 2, 6, 6, '#124e89'); box(g, 3, 3, 4, 4, f ? '#2ce8f5' : '#ffffff'); });
    mk('mboss_salvager', 48, 48, 1, 0, (g) => { box(g, 8, 14, 32, 18, '#5a6988'); box(g, 14, 8, 20, 8, '#8b9bb4'); box(g, 2, 20, 8, 14, '#3a4466'); box(g, 38, 20, 8, 14, '#3a4466'); box(g, 20, 32, 8, 10, '#feae34'); box(g, 22, 18, 4, 4, '#ffffff'); });
    mk('boss_graveking', 112, 112, 1, 0, (g) => {
      box(g, 16, 30, 80, 50, '#262b44'); box(g, 24, 20, 64, 14, '#3a4466'); box(g, 4, 40, 20, 40, '#3a4466'); box(g, 88, 40, 20, 40, '#3a4466');
      box(g, 30, 78, 52, 16, '#5a6988'); for (let i = 0; i < 5; i++) box(g, 26 + i * 13, 12 - (i % 2) * 6, 6, 12, '#8b9bb4');
      box(g, 40, 44, 10, 8, '#8fd3ff'); box(g, 62, 44, 10, 8, '#8fd3ff'); box(g, 44, 46, 3, 3, '#ffffff'); box(g, 66, 46, 3, 3, '#ffffff'); box(g, 48, 92, 16, 8, '#feae34');
    });
  }

  // ------------------------------------------------------------ level data
  const DEF_ABIL = { kael: { cd: 28, dur: 3, power: 0.5 }, nyra: { cd: 24, dur: 4, power: 0.25 }, brakk: { cd: 30, dur: 3, power: 2.5 }, sable: { cd: 40, dur: 6, power: 1 }, iko: { cd: 26, dur: 1.5, power: 1 }, vesh: { cd: 32, dur: 4, power: 1 } };
  const ABIL_OF = { echoSight: 'kael', repairDrones: 'nyra', lavaBarrage: 'brakk', hijack: 'sable', starPulse: 'iko', spectralWard: 'vesh' };
  function findLevel(id) {
    const S = NC.STORY; if (!S || !S.chapters) return null;
    for (const ch of S.chapters) for (const l of ch.levels || []) if (l.id === id) return { lvl: l, ch };
    return null;
  }
  const FALLBACK = { id: 'test', par: 90, waves: [[{ en: 'drone', n: 5, pattern: 'line' }], [{ en: 'scav', n: 2, pattern: 'sides' }, { en: 'hulk', n: 1, pattern: 'line', delay: 2 }], [{ en: 'ghost', n: 2, pattern: 'arc' }, { en: 'tether', n: 1, pattern: 'line', delay: 2 }]] };
  function passives() {
    let ps = call('passiveStats');
    if (!ps) { ps = {}; const S = NC.STORY || {}; for (const id of team()) { const c = S.crew && S.crew[id]; if (c && c.passive) ps[c.passive.stat] = (ps[c.passive.stat] || 0) + c.passive.v; } }
    const n = (v) => { v = +v || 0; return v > 1.5 ? v / 100 : v; }; // accept 0.1 or 10 (%)
    return { dmg: n(ps.dmg), crit: n(ps.crit), shdRegen: n(ps.shdRegen), hp: n(ps.hp), magnet: n(ps.magnet), dash: n(ps.dash) };
  }
  function team() { const t = call('team'); return (Array.isArray(t) && t.length ? t : ['kael']).slice(0, 3); }
  function abil(cid) {
    const s = call('abilityStats', cid) || (NC.STORY && NC.STORY.crew && NC.STORY.crew[cid] && NC.STORY.crew[cid].ability) || DEF_ABIL[cid] || DEF_ABIL.kael;
    const d = DEF_ABIL[cid] || DEF_ABIL.kael;
    return { cd: +s.cd || d.cd, dur: +s.dur || d.dur, power: s.power != null ? +s.power : d.power };
  }
  const kindOf = (cid) => { const c = NC.STORY && NC.STORY.crew && NC.STORY.crew[cid]; const a = c && c.ability && ABIL_OF[c.ability.id]; return a || cid; };

  // ------------------------------------------------------------ start
  G.startStory = (levelId, o) => {
    fallbackSprites();
    const f = findLevel(levelId), lvl = f ? f.lvl : Object.assign({}, FALLBACK, { id: levelId || 'test' }), world = (f && f.ch.world) || 'wreck';
    G.diff = 'normal';
    const loadout = Object.assign({}, o || {}, { story: { id: lvl.id, lvl, world } });
    return G.start(loadout);
  };
  X.storyInit = (R, sto) => {
    const st = R.st, ps = passives();
    st.atk *= 1 + ps.dmg; st.crit += ps.crit; st.regen *= 1 + ps.shdRegen; st.hp *= 1 + ps.hp; st.magnet *= 1 + ps.magnet; st.dashRange = 1 + ps.dash;
    R.story = { id: sto.id, lvl: sto.lvl, world: sto.world, wi: -1, waves: (sto.lvl.waves || []).map(w => (Array.isArray(w) ? w : (w && w.groups) || [])), queue: [], pause: 1.2, phase: 'waves', endT: 0, done: false };
    R.biome = sto.world || 'wreck'; R.musicId = 'asteroid'; R._tb = {};
    R.ab = team().map(id => { const s = abil(id); return { id, kind: kindOf(id), cd: 0, max: s.cd, dur: s.dur, power: s.power, act: 0 }; });
    R.slow = 0; R.heal = null; R.lava = 0; R.ward = 0;
  };

  // ------------------------------------------------------------ waves
  function queueWave(S, wi) {
    const R = X.R, groups = S.waves[wi] || [];
    for (const g of groups) {
      const n = Math.max(1, g.n | 0), pat = g.pattern || 'random', d0 = +g.delay || 0;
      const stream = pat === 'stream' || pat === 'rain';
      for (let i = 0; i < n; i++) S.queue.push({ t: d0 + (stream ? i * (pat === 'rain' ? 0.45 : 0.35) : pat === 'sides' ? i * 0.25 : i * 0.06), en: g.en, i, n, pat, elite: !!g.elite, sx: g.x });
    }
    S.queue.sort((a, b) => a.t - b.t);
    if (NC.ui && typeof NC.ui.storyWave === 'function') U.ui('storyWave', wi + 1, S.waves.length);
    else if (!X.headless) F().pop(G.W / 2, G.H * 0.4, (NC.lang === 'en' ? 'WAVE ' : 'VAL ') + (wi + 1) + '/' + S.waves.length, '#fee761', 1.6);
    void R;
  }
  function spawnOne(q) {
    const id = EN.DEFS[q.en] ? q.en : 'drone', s = EN.DEFS[id].size, W = G.W, H = G.H, i = q.i, n = q.n, mid = (n - 1) / 2;
    const span = Math.min(W - 2 * s, Math.max(40, n * 26)), fx = (k) => W / 2 + (n > 1 ? (k / (n - 1) - 0.5) * span : 0);
    let o = null, enter = true, ey = -s / 2;
    switch (q.pat) {
      case 'line': o = { x: fx(i) }; break;
      case 'v': o = { x: fx(i) }; ey = -s / 2 - Math.abs(i - mid) * 14; break;
      case 'arc': o = { x: fx(i) }; ey = -s / 2 - (1 - Math.pow((i - mid) / (mid || 1), 2)) * 18; break;
      case 'circle': case 'ring': { const a = i / n * U.TAU - Math.PI / 2, r = Math.min(60, W * 0.3); o = { x: W / 2 + Math.cos(a) * r, y: Math.max(EN.top({ size: s }) + 4, H * 0.32 + Math.sin(a) * r * 0.6) }; enter = false; break; }
      case 'sides': { const left = i % 2 === 0; o = { x: left ? s / 2 : W - s / 2, y: U.rnd(H * 0.18, H * 0.45), vx: left ? 60 : -60, vy: 0 }; enter = false; break; }
      case 'cluster': o = { x: U.clamp((q.sx || W / 2) + U.rnd(-30, 30), s, W - s) }; ey = -s / 2 - U.rnd(0, 24); break;
      case 'stream': o = { x: q.sx != null ? q.sx : W * (0.25 + 0.5 * ((i * 0.37) % 1)) }; break;
      default: o = { x: U.rnd(s, W - s) }; ey = -s / 2 - U.rnd(0, 20);
    }
    if (enter) o.y = ey;
    o.x = U.clamp(o.x, s / 2, W - s / 2); o.elite = q.elite;
    const e = EN.spawn(id, o);
    if (!e) return false;
    if (enter) { e.entering = true; e.vy = Math.max(e.d.sp + 20, 70); e.vx = 0; }
    else F().ring(e.x, e.y, e.d.col || '#2ce8f5', e.size, 0.35);
    return true;
  }
  const liveFoes = (R) => { let n = 0; for (const e of R.enemies) if (!e.dead && e.leaving == null && !e.ally) n++; return n; };
  X.storyDirector = (dt) => {
    const R = X.R, S = R.story; if (!S || S.done) return;
    if (S.phase === 'waves') {
      if (S.wi < 0 || (!S.queue.length && liveFoes(R) === 0)) {
        if (S.wi >= 0 && S.wi + 1 >= S.waves.length) { S.phase = S.lvl.boss ? 'bossIntro' : 'win'; S.pause = S.lvl.boss ? 2.4 : 1.6; if (S.lvl.boss) bossIntro(S); return; }
        S.pause -= dt; if (S.pause > 0) return;
        S.wi++; S.wt = 0; queueWave(S, S.wi); S.pause = 2;
      }
      S.wt += dt;
      if (S.wt > 75 && !S.queue.length && liveFoes(R) <= 2) for (const e of R.enemies) if (!e.ally && e.leaving == null) e.leaving = 0.5; // anti soft-lock (stragglers out of reach)
      while (S.queue.length && S.queue[0].t <= S.wt) { if (!spawnOne(S.queue[0])) break; S.queue.shift(); }
    } else if (S.phase === 'bossIntro') {
      S.pause -= dt; if (S.pause <= 0) { spawnStoryBoss(S); S.phase = 'boss'; }
    } else if (S.phase === 'boss') {
      // boss alive; adds may still be on screen. storyBossDown() switches to 'win'
    } else if (S.phase === 'win') {
      S.pause -= dt; if (S.pause <= 0) finish(true);
    }
  };
  function bossDef(S) {
    const bd = S.lvl.boss, base = BOSS[bd.id] || (bd.type === 'world' ? BOSS.graveking : BOSS.salvager);
    const d = Object.assign({}, base, { phases: base.phases.map(p => p.slice()) });
    if (bd.hp) d.hp = bd.hp;
    d.points = bd.type === 'world' ? 8000 : 3000; d.cr = bd.type === 'world' ? 900 : 350; d.chest = bd.type === 'world' ? 2 : 0;
    return d;
  }
  function bossIntro(S) {
    const d = bossDef(S), world = S.lvl.boss.type === 'world';
    X.alert(world ? 'boss' : 'elite', { id: d.id, nameKey: (world ? 'boss.' : 'mboss.') + d.id + '.name', mini: !world });
    U.sfx('warn'); if (world) U.music('boss'); NC.Input && NC.Input.buzz && NC.Input.buzz(200, 0.8);
  }
  function spawnStoryBoss(S) {
    const R = X.R, d = bossDef(S);
    if (S.lvl.boss.type === 'world') { const b = B.spawnBoss(R.bossIdx, d); b.nameKey = 'boss.' + d.id + '.name'; }
    else { const b = B.spawnMini(R.mbossIdx, d); U.ui('showBossBar', { id: b.id, nameKey: b.nameKey, hp: b.max, mini: true, col: d.col }); }
  }
  X.storyBossDown = () => { const S = X.R.story; if (!S || S.done) return; for (const e of X.R.enemies) if (!e.dead && e.leaving == null && !e.ally) e.leaving = 0.5; S.phase = 'win'; S.pause = 2.6; X.homeAll(); };

  // ------------------------------------------------------------ end
  function finish(won, quit) {
    const R = X.R, S = R.story; if (!S || S.done) return G.lastSummary;
    S.done = true; G.mode = 'over';
    const res = { won: !!won, id: S.id, hpFrac: won ? U.clamp(R.p.hp / R.maxHp, 0, 1) : 0, time: Math.round(R.time * 10) / 10, kills: R.kills, crystals: R.crystals, runLvl: R.runLvl, revives: R.revives, quit: !!quit };
    G.lastSummary = Object.assign({ story: true, score: R.score, time: Math.round(R.time), chests: R.chests.slice(), sector: 0, bosses: R.bossesKilled }, res);
    try { NC.sys && NC.sys.flush && NC.sys.flush(); } catch (e) { /* ignore */ }
    U.ui('hideBossBar'); U.music('menu');
    U.sfx(won ? 'legendary' : 'gameover');
    U.ui('storyEnd', res);
    return G.lastSummary;
  }
  X.storyEnd = (won, show) => finish(won, show === false); // show=false = quit from pause

  // ------------------------------------------------------------ crew abilities
  G.useAbility = (slot) => {
    const R = G.run; if (!R || !R.story || G.mode !== 'play' || !R.p.alive) return false;
    const a = R.ab && R.ab[slot]; if (!a || a.cd > 0) return false;
    const p = R.p, fx = F();
    switch (a.kind) {
      case 'kael': R.slow = a.dur; fx.doFlash('#8fd3ff', 0.25); fx.ring(p.x, p.y, '#e43b44', Math.max(G.W, G.H), 0.8); U.sfx('beam_charge'); break;
      case 'nyra': R.heal = { t: a.dur, rate: R.maxHp * a.power / a.dur }; fx.ring(p.x, p.y, '#63c74d', 30, 0.4); U.sfx('repair'); break;
      case 'brakk': R.lava = a.dur; R.lavaPow = a.power; R.lavaT = 0; fx.doShake(3); fx.ring(p.x, p.y, '#f77622', 26, 0.3); U.sfx('shoot_flame'); break;
      case 'sable': {
        let best = null; for (const e of R.enemies) if (!e.dead && !e.ally && e.leaving == null && !e.d.child && (!best || e.max > best.max)) best = e;
        if (best) { best.ally = a.dur; best.allyPow = a.power; best.untargetable = true; best.cloaked = false; best.state = 'idle'; best.wrap = false; best.entering = false; fx.ring(best.x, best.y, '#c65197', 30, 0.5); for (let i = 0; i < 10; i++) fx.spark(U.lerp(p.x, best.x, i / 10), U.lerp(p.y, best.y, i / 10), '#c65197', 0, 0, 0.4); }
        else { const b = R.boss || R.mboss; if (!b) return false; b.stun = 2; fx.ring(b.x, b.y, '#c65197', b.r + 20, 0.5); }
        U.sfx('crit'); break;
      }
      case 'iko': {
        for (const it of R.items) if (it.kind !== 'chest') { it.home = true; it.t = Math.max(it.t, 0.3); it.life = Math.max(it.life || 0, 4); }
        for (const e of R.enemies) if (!e.dead && !e.ally) e.stun = Math.max(e.stun || 0, a.dur);
        for (const b of [R.boss, R.mboss]) if (b) b.stun = Math.max(b.stun || 0, a.dur * 0.6);
        fx.ring(p.x, p.y, '#fee761', Math.max(G.W, G.H), 0.7); fx.doFlash('#fee761', 0.25); U.sfx('magnet'); break;
      }
      case 'vesh': R.ward = a.dur; R.wardPow = a.power; R.buffs.shield = Math.max(R.buffs.shield, a.dur); fx.ring(p.x, p.y, '#c65197', 24, 0.4); U.sfx('shield_up'); break;
      default: return false;
    }
    a.cd = a.max; a.act = a.dur; R.abUsed = (R.abUsed || 0) + 1;
    NC.Input && NC.Input.buzz && NC.Input.buzz(40, 0.5);
    return true;
  };
  X.storyStep = (dt) => {
    const R = X.R, p = R.p, fx = F(), I = NC.Input;
    if (I && I.takeAb) for (let i = 0; i < 3; i++) if (I.takeAb(i)) G.useAbility(i);
    for (const a of R.ab) { a.cd = Math.max(0, a.cd - dt); a.act = Math.max(0, a.act - dt); }
    if (R.slow > 0) { R.slow -= dt; if (Math.random() < dt * 20) fx.spark(U.rnd(0, G.W), U.rnd(0, G.H), '#8fd3ff', 0, 30, 0.5); }
    if (R.heal) {
      R.heal.t -= dt; if (p.alive) p.hp = Math.min(R.maxHp, p.hp + R.heal.rate * dt);
      for (let i = 0; i < 3; i++) { const a = R.time * 3 + i / 3 * U.TAU; if (Math.random() < 0.6) fx.spark(p.x + Math.cos(a) * 14, p.y + Math.sin(a) * 10, i ? '#63c74d' : '#ffffff', 0, 0, 0.12); }
      if (R.heal.t <= 0) R.heal = null;
    }
    if (R.lava > 0 && p.alive) {
      R.lava -= dt; R.lavaT -= dt;
      if (R.lavaT <= 0) {
        R.lavaT = 0.12; const E = X.eff(), base = E.atk * (R.lavaPow || 2.5);
        for (const o of [-8, 0, 8]) { const a = -Math.PI / 2 + o * 0.012 + U.rnd(-0.04, 0.04), c = Math.random() < E.crit; X.addBullet({ kind: 'lava', spr: 'proj_lava', col: '#f77622', x: p.x + o, y: p.y - 8, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, dmg: base * (c ? E.critMult : 1), crit: c, pierce: 99, burn: base * 0.3, life: 1.2 }); }
        fx.spark(p.x, p.y - 10, '#feae34', U.rnd(-20, 20), -40, 0.3); fx.doShake(1);
      }
    }
    for (const b of R.bullets) if (b.kind === 'lava' && Math.random() < 0.3) fx.spark(b.x, b.y + 3, '#e43b44', 0, 20, 0.2);
    if (R.ward > 0) { // Spectral Ward: reflect enemy bullets back
      R.ward -= dt; R.buffs.shield = Math.max(R.buffs.shield, Math.min(R.ward, 0.2));
      if (Math.floor(R.time * 6) !== Math.floor((R.time - dt) * 6)) fx.ring(p.x, p.y, '#c65197', 22, 0.25);
      for (const b of R.ebullets) {
        if (b.dead || U.d2(b.x, b.y, p.x, p.y) > 26 * 26) continue;
        b.dead = true; const sp = Math.max(120, Math.hypot(b.vx, b.vy) * 1.5), t = X.nearest(b.x, b.y, 300), a = t ? Math.atan2(t.y - b.y, t.x - b.x) : Math.atan2(-b.vy, -b.vx);
        X.addBullet({ kind: 'reflect', spr: 'proj_reflect', col: '#c65197', x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: Math.max(b.dmg * 2, X.eff().atk) * (R.wardPow || 1), life: 1.5 });
        fx.spark(b.x, b.y, '#ffffff', 0, 0, 0.2);
      }
    }
    for (const e of R.enemies) if (e.stun > 0 && Math.random() < dt * 6) fx.spark(e.x + U.rnd(-4, 4), e.y - e.size / 2, '#fee761', 0, -10, 0.3);
    tetherBeams(R);
  };
  X.storyHud = () => { const R = X.R; return (R.ab || []).map(a => ({ id: a.id, cd01: a.max ? U.clamp(a.cd / a.max, 0, 1) : 0, active: a.act > 0, ready: a.cd <= 0 })); };
  G.storyState = () => { const R = G.run; if (!R || !R.story) return null; const S = R.story; return { id: S.id, wave: S.wi + 1, waves: S.waves.length, phase: S.phase, queued: S.queue.length, foes: liveFoes(R), done: S.done }; };
})(window.NC = window.NC || {});
