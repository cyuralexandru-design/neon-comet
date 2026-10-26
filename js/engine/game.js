'use strict';
// Neon Comet 3.1 engine: run state, game loop (fps cap 60/120), director (spawns, bosses, mini-bosses, sector events, biomes),
// player, pickups (crystals, xp orbs, light-sphere stars), consumables, cards (rarity-weighted) + reroll, revive, HUD (NC.hud),
// icon alerts / sector intro (SPEC-31 §2.1-2.2), runStats() (§2.5) and debug hooks (NC.debug). SPEC §5–§6 + SPEC-31.
(function (NC) {
  const U = NC.U, X = NC.eng = NC.eng || {};
  const F = NC.fx, EN = NC.enemies, B = NC.bosses, W = NC.weapons;
  const G = NC.game = { mode: 'menu', W: 320, H: 200, run: null, fps: 60, version: '3.1.3', hudTop: 22 };
  X.G = G;
  // HUD safe line (logical px): HUD agent sets NC.game.hudTop = bottom of the top HUD; nothing rests above hudTop + 4
  X.safeTop = () => { const h = +G.hudTop; return U.clamp(isFinite(h) && h > 0 ? h : 22, 0, G.H * 0.3) + 4; };
  const D = () => NC.DATA || {};
  const sys = (fn, ...a) => { try { if (NC.sys && typeof NC.sys[fn] === 'function') return NC.sys[fn](...a); } catch (e) { console.error('NC.sys.' + fn, e); } return undefined; };
  const BIOMES = ['nebula', 'asteroid', 'ion', 'station'];
  const BOSS_EVERY = () => D().BOSS_EVERY || 50000, MINI_FIRST = () => D().MBOSS_FIRST || 25000;
  NC.hud = { score: 0, combo: 1, sector: 0, biome: 'nebula', hp: 0, maxHp: 1, shd: 0, maxShd: 1, atk: 0, crystals: 0, runLvl: 1, runXp: 0, runNeed: 1, dashCd01: 0, consumables: [], boss: null, fps: 0 };

  // ------------------------------------------------------------ init + loop
  // FPS cap (SPEC-31 §2.8): settings.fpsCap 60 | 120 (default 60). rAF fires at the display rate; frames are skipped on a fixed
  // schedule (accumulated time, tolerance = half a vsync) so the average rate is exactly min(cap, display Hz) on 50-240 Hz screens.
  // The simulation uses the real elapsed time between rendered frames (sub-stepped at <= 1/60 s), so it is rate independent.
  let last = 0, fpsEma = 60, nextT = 0, rafEma = 16.7, rafLast = 0;
  G.fpsCap = () => {
    let c = 60;
    try { const st = NC.ui && typeof NC.ui.settings === 'function' ? NC.ui.settings() : U.settings(); c = +(st && st.fpsCap) || 60; } catch (e) { c = 60; }
    return c >= 110 ? 120 : 60;
  };
  G.init = (canvas) => {
    G.canvas = canvas;
    NC.render.init(canvas);
    NC.Input.bindCanvas(canvas);
    if (!G._loop) { G._loop = true; requestAnimationFrame(loop); }
  };
  function loop(now) {
    requestAnimationFrame(loop);
    if (rafLast) { const d = now - rafLast; if (d > 0 && d < 100) rafEma += (d - rafEma) * 0.1; } rafLast = now;
    const iv = 1000 / G.fpsCap(), tol = Math.min(rafEma * 0.5, iv * 0.5);
    if (nextT && now < nextT - tol) return; // skip this vsync (cap)
    nextT = nextT && now - nextT < iv ? nextT + iv : now + iv;
    const rdt = last ? Math.min(0.25, (now - last) / 1000) : 1 / 60; last = now;
    if (rdt > 0) fpsEma += ((1 / rdt) - fpsEma) * 0.08; // real rendered-frame rate
    G.fps = Math.round(fpsEma);
    try {
      NC.Input.poll(rdt);
      const dt = Math.min(rdt, 1 / 20);
      if (G.mode === 'play' && G.run) {
        if (NC.Input.take('pause')) G.pause();
        else {
          let k = dt; if (F.hitstop > 0) { F.hitstop -= dt; k = dt * 0.15; }
          const n = Math.max(1, Math.ceil(k / (1 / 60)));
          for (let i = 0; i < n && G.mode === 'play'; i++) step(k / n);
        }
      } else NC.Input.take('pause');
      if (G.run && G.mode !== 'menu') F.update(G.mode === 'play' || G.mode === 'revive' || G.mode === 'over' ? dt : 0);
      NC.render.draw(G.mode === 'play' || G.mode === 'menu' ? dt : 0);
      updateHud();
    } catch (e) { console.error(e); }
  }

  // ------------------------------------------------------------ stats normalization
  function normStats(s) {
    s = s || {};
    const comp = s.comp || s.companion || null, tur = s.turret || null, w = s.weapon || { id: 'laser', lvl: 1 };
    return {
      shipId: s.shipId || (s.ship && s.ship.id) || 'vanator', lvl: s.lvl || 1,
      atk: s.atk || 10, hp: s.hp || 100, shd: s.shd || 50, rate: s.rate || 1, crit: s.crit || 0, critMult: s.critDmg || s.critMult || 2,
      speed: s.speed || 1, dashCd: s.dashCd || 1.35, regen: s.regen || 1, crMult: s.crMult || 1, xpMult: s.xpMult || 1, magnet: s.magnet || 28,
      guns: s.guns ? s.guns - 1 : 0, flags: Object.assign({}, s.flags || {}),
      weapon: { id: w.id || 'laser', lvl: w.lvl || 1, mult: w.dmgMult || w.mult || 1 },
      turret: tur ? { id: tur.id, lvl: tur.lvl || 1, dmgMult: tur.dmgMult } : null,
      companion: comp ? { id: comp.id, lvl: comp.lvl || 1, dmgFrac: comp.dmgFrac } : null,
    };
  }

  // ------------------------------------------------------------ run lifecycle
  // NC.game.start(loadout?) loadout = { consumables: [{id, count}] } (default: NC.sys.runConsumables())
  // 3.1.1 difficulty (chosen on the difficulty screen): enemy/boss HP + damage and crystal multipliers
  G.DIFFS = { easy: { hp: 0.7, dmg: 0.6, cr: 0.7 }, normal: { hp: 1, dmg: 1, cr: 1 }, hard: { hp: 1.5, dmg: 1.4, cr: 1.5 }, nightmare: { hp: 2.3, dmg: 2.0, cr: 2.5 } };
  G.diff = 'normal';
  G.diffMul = () => G.DIFFS[G.diff] || G.DIFFS.normal;
  G.start = (loadout) => {
    if (loadout && loadout.diff && G.DIFFS[loadout.diff]) G.diff = loadout.diff;
    const st = normStats(sys('computeStats'));
    st.crMult *= G.diffMul().cr;
    let cons = loadout && loadout.consumables ? loadout.consumables : sys('runConsumables') || [];
    cons = cons.slice(0, 3).map(c => (typeof c === 'string' ? { id: c, count: 3 } : { id: c.id, count: Math.min(3, c.count != null ? c.count : (c.n || 0)) }));
    const R = G.run = X.R = {
      st, m: { dmg: 1, rate: 1, guns: 0, pierce: 0, bounce: 0, missile: 0, orbit: 0, shd: 1, shdRegen: 1, hp: 1, magnet: 0, speed: 1, dashCd: 1, crit: 0, vamp: 0 },
      cards: {}, score: 0, combo: 1, comboT: 0, maxCombo: 1, kills: 0, crystals: 0, xp: 0, time: 0,
      runLvl: 1, runXp: 0, runNeed: xpFor(1), pendingCards: 0, rerollN: 0, offered: null,
      sector: 0, biome: BIOMES[0], bossIdx: 0, mbossIdx: 0, nextBoss: BOSS_EVERY(), nextMini: MINI_FIRST(), bossIntro: 0, bossesKilled: 0,
      enemies: [], ebullets: [], beams: [], mines: [], shells: [], orbs: [], items: [], rocks: [], bullets: [], rails: [],
      boss: null, mboss: null, spawnQ: [], event: null, eventT: U.rnd(...(D().EVENT_FIRST || D().EVENT_INTERVAL || [60, 90])), buffs: { shield: 0, magnet: 0, x2: 0, over: 0 },
      cons: cons.filter(c => c.id && c.count > 0).map(c => ({ id: c.id, count: c.count, cd: 0, max: consDef(c.id).cd || 3 })), consUsed: {},
      revives: 0, autoRevived: false, chests: [], dying: 0, stats: { maxOnScreen: 0, firstBossAt: null, bossDeaths: [] }, seenTypes: {}, rosterLog: {}, eliteAlertT: -99,
      p: { x: G.W / 2, y: G.H * 0.78, vx: 0, vy: 0, r: 5, hp: 1, shd: 1, shdT: 0, inv: 1.5, dashT: 0, dashCd: 0, fireT: 0.3, alive: true, hurtT: 0, aimAng: -Math.PI / 2 },
      lvlBefore: st.lvl,
    };
    applyMaxes(); R.p.hp = R.maxHp; R.p.shd = R.maxShd;
    W.setup(); F.reset();
    G.mode = 'play'; NC.Input.clear();
    U.music(R.biome);
    U.ui('onRunStart');
    sectorUi();
    logRoster();
    return R;
  };
  // run-level XP curve: NC.DATA.runXpFor (data agent); fallback = the 3.1 steeper curve
  const xpFor = (l) => (D().runXpFor ? D().runXpFor(l) : Math.round(50 + 20 * l + 6 * Math.pow(l, 1.9)));
  // sector intro + permanent label (SPEC-31 §2.2): n is 1-based, biome = id ('nebula'...), 4th arg = its i18n key
  function sectorUi() { const R = X.R; U.ui('sector', R.sector + 1, R.biome, 'biome.' + R.biome + '.name'); }
  // icon alerts (SPEC-31 §2.1). Data carries only ids / i18n keys (never translated text), the HUD translates at draw time.
  const alert = (type, data) => U.ui('alert', type, Object.assign({ textKey: 'eng.al.' + type }, data || {}));
  X.onElite = (e) => { const R = X.R; if (!R || R.time - R.eliteAlertT < 8) return; R.eliteAlertT = R.time; alert('elite', { nameKey: 'en.' + e.type + '.name', id: e.type }); };
  const consDef = (id) => (D().CONSUMABLES || []).find(c => c.id === id) || { id, cd: 3, dur: { shield: 10, magnet: 15, x2: 30 }[id], heal: 0.5, mult: 2, bossDmgCap: 0.3 };
  function applyMaxes() {
    const R = X.R, oh = R.maxHp || 1, os = R.maxShd || 1;
    R.maxHp = Math.round(R.st.hp * R.m.hp); R.maxShd = Math.round(R.st.shd * R.m.shd);
    if (R.p) { R.p.hp = R.p.hp * R.maxHp / oh; R.p.shd = R.p.shd * R.maxShd / os; }
  }
  function logRoster() { const R = X.R; R.rosterLog[R.sector] = EN.roster(R.sector).slice(); }

  G.pause = () => { if (G.mode === 'play') { G.mode = 'paused'; NC.Input.clear(); sys('flush'); U.ui('onPause'); } };
  G.resume = () => { if (G.mode === 'paused') { G.mode = 'play'; NC.Input.clear(); NC.Input.joyEnd(); } };
  G.quit = () => { if (!G.run) { G.mode = 'menu'; return null; } const s = G.mode === 'over' ? G.lastSummary : endRun(false); G.mode = 'menu'; G.run = X.R = null; U.ui('hideBossBar'); U.music('menu'); return s; };
  G.toMenu = G.quit;
  G.giveUp = () => { if (G.run && (G.mode === 'revive' || G.mode === 'paused' || G.mode === 'play')) endRun(true); };

  // ------------------------------------------------------------ targets & combat helpers
  let targetsCache = null;
  X.targets = () => {
    if (targetsCache) return targetsCache;
    const R = X.R, out = [];
    for (const e of R.enemies) if (!e.dead && e.leaving == null && !e.untargetable && e.y > -4) out.push(e);
    if (R.boss && !R.boss.untargetable) out.push(R.boss);
    if (R.mboss && !R.mboss.untargetable) out.push(R.mboss);
    for (const o of R.orbs) out.push(o);
    for (const a of R.rocks) out.push(a);
    return targetsCache = out;
  };
  X.nearest = (x, y, maxD = 1e9, exclude) => {
    let best = null, bd = maxD * maxD;
    for (const t of X.targets()) {
      if (t.dead || t.untargetable || (exclude && exclude.has(t))) continue;
      const d = t.big || t.kind === 'mboss' ? Math.max(0, Math.hypot(t.x - x, t.y - y) - t.r) ** 2 : U.d2(t.x, t.y, x, y);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  };
  X.damage = (t, dmg, crit, x, y, o) => {
    const R = X.R; if (!t || t.dead || dmg <= 0) return;
    if (t.kind === 'boss' || t.kind === 'mboss') {
      if (t.inv > 0 || t.untargetable || t.state === 'enter') return;
      t.hp -= dmg; t.flash = 0.05;
      if (!(o && o.quiet)) { F.dmg(x != null ? x : t.x, y != null ? y : t.y, dmg, crit); U.sfx(crit ? 'crit' : 'hit'); }
      if (t.hp <= 0) { t.dead = true; if (t.kind === 'boss') killBoss(t); else killMini(t); }
      return;
    }
    t.hp -= dmg; t.flash = 0.06;
    if (!(o && o.quiet)) { F.dmg(x != null ? x : t.x, y != null ? y : t.y - 4, dmg, crit); U.sfx(crit ? 'crit' : 'hit'); }
    if (t.hp > 0) return;
    t.dead = true;
    if (t.kind === 'enemy') killEnemy(t);
    else if (t.kind === 'rock') { F.explode(t.x, t.y, t.r * 2, '#8b9bb4'); addScore(60); X.dropCrystals(t.x, t.y, 4); }
    void R;
  };
  X.blocked = (t, x, y) => { F.spark(x, y, '#ffffff', U.rnd(-30, 30), 20); F.spark(x, y, '#2ce8f5', U.rnd(-30, 30), 30); U.sfx('shield_hit'); };
  X.eshoot = (x, y, ang, sp, dmg, spr = 'eb_small') => { X.R.ebullets.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: spr === 'eb_big' ? 4 : 2, dmg, spr, life: 9 }); };
  X.blast = (x, y, r, dmg, col) => { F.explode(x, y, r * 1.5, col); F.ring(x, y, col || '#feae34', r, 0.35); const p = X.R.p; if (p.alive && U.d2(x, y, p.x, p.y) < (r + p.r) ** 2) X.damagePlayer(dmg); };
  X.gravity = (o, dt, k) => {
    const ev = X.R.event, h = ev && ev.bh; if (!h) return;
    const dx = h.x - o.x, dy = h.y - o.y, d = Math.hypot(dx, dy) || 1; if (d > h.radius * 1.6) return;
    const a = h.pull * k * (1.4 - d / (h.radius * 1.6)) * 2;
    o.vx += dx / d * a * dt * 3; o.vy += dy / d * a * dt * 3;
  };
  X.contact = (e) => {
    const R = X.R, p = R.p;
    if (p.dashT > 0 || R.buffs.shield > 0) { X.damage(e, Math.max(X.eff().atk * 3, e.max * 0.35), true, e.x, e.y); }
    else if (X.damagePlayer(e.dmg)) { X.damage(e, e.max * 0.3, false, e.x, e.y, { quiet: true }); }
    const d = Math.hypot(e.x - p.x, e.y - p.y) || 1; e.vx = (e.x - p.x) / d * 90; e.vy = (e.y - p.y) / d * 90; e.wrap = e.wrap && e.vy > 0;
  };
  X.damagePlayer = (dmg) => {
    const R = X.R, p = R.p;
    if (!p.alive || p.inv > 0 || p.dashT > 0 || R.buffs.shield > 0 || G.god) return false;
    if (R.st.flags.evasion && Math.random() < R.st.flags.evasion) { F.pop(p.x, p.y - 12, '0', F.COL.dim); p.inv = 0.3; return false; }
    p.shdT = 2.6;
    if (p.shd > 0) { const a = Math.min(p.shd, dmg); p.shd -= a; dmg -= a; U.sfx('shield_hit'); F.ring(p.x, p.y, '#2ce8f5', 12, 0.25); }
    if (dmg > 0) {
      p.hp -= dmg; p.hurtT = 0.4; F.doFlash('#a22633', 0.25); F.doShake(3); U.sfx('hurt'); NC.Input.buzz(60, 0.7);
      F.burst(p.x, p.y, '#e43b44', 8, 60); R.combo = Math.max(1, Math.floor(R.combo / 2));
      F.pop(p.x, p.y - 14, '-' + Math.round(dmg), F.COL.bad);
    }
    p.inv = 0.6;
    if (p.hp <= 0) die();
    return true;
  };
  X.dropCrystals = (x, y, value, maxN, home) => {
    const R = X.R, n = Math.max(1, Math.min(maxN || (D().DROPS && D().DROPS.crystalSplit) || 3, Math.ceil(value / 15)));
    for (let i = 0; i < n; i++) { const a = U.rnd(0, U.TAU), v = U.rnd(20, 60); R.items.push({ kind: 'cr', spr: 'pk_crystal', v: value / n, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 12, home: !!home }); }
  };
  // XP orbs (SPEC-31 §2.7): kill XP split into 1-3 orbs (bosses more), granted on pickup, magnet pulls them, ~20 s life
  X.dropXp = (x, y, value, maxN, home) => {
    const R = X.R; if (!(value > 0)) return;
    const n = U.clamp(Math.ceil(value / 4), 1, maxN || 3);
    for (let i = 0; i < n; i++) { const a = U.rnd(0, U.TAU), v = U.rnd(15, 45); R.items.push({ kind: 'xp', spr: 'pk_xp', v: value / n, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: U.rnd(0, 0.4), life: 20, home: !!home }); }
  };
  // boss death: every xp orb / crystal on screen flies to the player
  function homeAll() { for (const it of X.R.items) if (it.kind === 'xp' || it.kind === 'cr') { it.home = true; it.life = Math.max(it.life || 0, 6); } }
  const comboMult = () => 1 + 0.03 * (X.R.combo - 1); // combo cap 20 -> x1.57
  function addScore(base) { const R = X.R; R.score += Math.round(base * comboMult()); }
  function bumpCombo() { const R = X.R; R.combo = Math.min(20, R.combo + 1); R.comboT = 3; R.maxCombo = Math.max(R.maxCombo, R.combo); }
  function addXp(v) {
    const R = X.R; R.xp += v; R.runXp += v;
    while (R.runXp >= R.runNeed) { R.runXp -= R.runNeed; R.runLvl++; R.runNeed = xpFor(R.runLvl); R.pendingCards++; }
  }
  function killEnemy(e) {
    const R = X.R, d = e.d, EL = D().ELITE || { points: 3, cr: 3, xp: 3 };
    R.kills++; sys('track', 'kills', 1);
    bumpCombo();
    addScore(d.score * (e.elite ? EL.points : 1));
    const cr = d.cr * (e.elite ? EL.cr : 1) * R.st.crMult;
    if (cr > 0) X.dropCrystals(e.x, e.y, cr);
    X.dropXp(e.x, e.y, d.xp * (e.elite ? EL.xp : 1));
    const DR = D().DROPS || { starChance: 0.55, repairChance: 0.012, supernovaChance: 0.004, eliteChestChance: 0.05 };
    if (Math.random() < DR.starChance) R.items.push({ kind: 'star', spr: 'pk_star', x: e.x, y: e.y, vx: U.rnd(-20, 20), vy: U.rnd(-30, 0), t: 0, life: 10, seed: U.rnd(0, 6) });
    if (Math.random() < DR.repairChance) R.items.push({ kind: 'repair', spr: 'pk_repair', x: e.x, y: e.y, vx: 0, vy: 10, t: 0, life: 10 });
    if (Math.random() < DR.supernovaChance) R.items.push({ kind: 'nova', spr: 'pk_supernova', x: e.x, y: e.y, vx: 0, vy: 10, t: 0, life: 12 });
    if (e.elite && Math.random() < DR.eliteChestChance) R.items.push({ kind: 'chest', r: 0, x: e.x, y: e.y, vx: 0, vy: 15, t: 0 });
    if (R.m.vamp) { // 3.1 lifesteal capped per second (NC.DATA.HEAL.vampPerSec), bucket holds max 2 s of healing
      const cap = (((D().HEAL || {}).vampPerSec) || 1) * R.maxHp; R.vampB = Math.min(cap * 2, (R.vampB || 0) + (R.time - (R.vampT || 0)) * cap); R.vampT = R.time;
      const h = Math.min(R.vampB, R.maxHp * R.m.vamp); R.vampB -= h; R.p.hp = Math.min(R.maxHp, R.p.hp + h);
    }
    F.explode(e.x, e.y, e.size, d.col);
    EN.onDeath(e);
  }

  // ------------------------------------------------------------ boss flow
  function startBossIntro() {
    const R = X.R;
    R.bossIntro = 2.6; R.spawnQ.length = 0;
    for (const e of R.enemies) if (e.leaving == null) e.leaving = 0.5; // all other enemies warp out
    if (R.mboss) { F.anim('fx_explode_l', R.mboss.x, R.mboss.y); F.anim('fx_explode_m', R.mboss.x + 10, R.mboss.y - 8, 14, { t: -0.15 }); R.mboss = null; }
    R.ebullets.length = 0; R.beams.length = 0; R.mines.length = 0; R.shells.length = 0; R.orbs.length = 0; R.rocks.length = 0;
    if (R.event) endEvent();
    const def = B.def(R.bossIdx);
    alert('boss', { id: def.id, nameKey: 'boss.' + def.id + '.name' });
    U.sfx('warn'); U.music('boss'); NC.Input && NC.Input.buzz && NC.Input.buzz(260, 0.9);
  }
  function killBoss(b) {
    const R = X.R, def = b.def;
    for (let i = 0; i < 6; i++) F.anim('fx_explode_l', b.x + U.rnd(-30, 30), b.y + U.rnd(-25, 25), 14, { t: -i * 0.12 });
    F.doFlash('#ffffff', 0.6); F.hitstop = 0.2; F.doShake(8); U.sfx('explode_l');
    R.ebullets.length = 0; R.beams.length = 0; R.mines.length = 0; R.orbs.length = 0; R.shells.length = 0;
    R.score += def.points || 5000;
    X.dropCrystals(b.x, b.y, (def.cr || 1500) * R.st.crMult, 6, true);
    X.dropXp(b.x, b.y, 60 * (b.idx + 1), 8, true);
    homeAll();
    R.items.push({ kind: 'chest', r: def.chest != null ? def.chest : 1, x: b.x, y: b.y, vx: 0, vy: 20, t: 0 });
    R.p.hp = Math.min(R.maxHp, R.p.hp + R.maxHp * (((D().HEAL || {}).bossKill) != null ? D().HEAL.bossKill : 0.5)); R.p.shd = R.maxShd;
    R.boss = null; R.bossIdx++; R.bossesKilled++; sys('track', 'bosses', 1);
    R.nextBoss = D().bossScore ? D().bossScore(R.bossIdx) : (R.bossIdx + 1) * BOSS_EVERY();
    U.ui('hideBossBar');
    alert('bossDown', { id: def.id, nameKey: 'boss.' + def.id + '.name' });
    setSector(R.sector + 1);
    sys('flush');
  }
  function killMini(b) {
    const R = X.R, def = b.def;
    F.explode(b.x, b.y, 48, def.col); F.anim('fx_explode_l', b.x, b.y);
    R.score += def.points || 2000; X.dropCrystals(b.x, b.y, (def.cr || 600) * R.st.crMult, 5, true); X.dropXp(b.x, b.y, 25, 5, true);
    R.items.push({ kind: 'chest', r: def.chest || 0, x: b.x, y: b.y, vx: 0, vy: 20, t: 0 });
    R.mboss = null; sys('track', 'mbosses', 1); U.ui('hideBossBar');
  }
  function setSector(s) {
    const R = X.R; R.sector = s; R.biome = BIOMES[s % BIOMES.length];
    U.music(R.biome); logRoster();
    sectorUi();
    const fresh = EN.NEW[Math.min(s, EN.NEW.length - 1)] || [];
    if (s > 0 && s < EN.NEW.length) setTimeout(() => { if (X.R === R && !R.boss && G.run === R) alert('threat', { ids: fresh.slice(), nameKeys: fresh.map(id => 'en.' + id + '.name') }); }, 2600);
    R.eventT = Math.max(R.eventT, 25);
  }

  // ------------------------------------------------------------ sector events
  function startEvent() {
    const R = X.R, list = D().EVENTS || [{ id: 'asteroids', dur: 20, rocks: 14, rockHp: 40, rockDmg: 20 }, { id: 'ionstorm', dur: 20 }, { id: 'blackhole', dur: 20, pull: 55, radius: 90 }];
    const ev = Object.assign({}, U.pick(list)); ev.t = ev.dur || 20; ev.rockT = 0.5;
    if (ev.id === 'blackhole') ev.bh = { x: U.rnd(G.W * 0.25, G.W * 0.75), y: U.rnd(Math.max(G.H * 0.3, X.safeTop() + 20), G.H * 0.6), pull: ev.pull || 55, radius: Math.min(ev.radius || 90, G.H * 0.5) };
    R.event = ev; sys('track', 'events', 1);
    alert('event', { id: ev.id, nameKey: 'event.' + ev.id + '.name', descKey: 'event.' + ev.id + '.desc' }); U.sfx('warn');
  }
  function endEvent() { const R = X.R; R.event = null; R.eventT = U.rnd(...(D().EVENT_INTERVAL || [60, 90])); }
  function updateEvent(dt) {
    const R = X.R, ev = R.event, p = R.p;
    ev.t -= dt;
    if (ev.id === 'asteroids') {
      ev.rockT -= dt;
      if (ev.rockT <= 0 && R.rocks.length < 10) {
        ev.rockT = (ev.dur || 20) / (ev.rocks || 14);
        const left = Math.random() < 0.5, r = U.irnd(4, 8), hp = (ev.rockHp || 40) * (r / 6) * (1 + 0.08 * R.sector);
        R.rocks.push({ kind: 'rock', x: left ? U.rnd(-10, G.W * 0.5) : U.rnd(G.W * 0.5, G.W + 10), y: -r - 4, vx: (left ? 1 : -1) * U.rnd(15, 35), vy: U.rnd(30, 50), r, hp, max: hp, dmg: ev.rockDmg || 20, flash: 0 });
      }
    }
    if (ev.id === 'blackhole' && p.alive) { X.gravity(p, dt, 1); if (U.d2(p.x, p.y, ev.bh.x, ev.bh.y) < 64) X.damagePlayer(15); }
    if (ev.t <= 0) endEvent();
  }
  function updateRocks(dt) {
    const R = X.R, p = R.p;
    for (const a of R.rocks) {
      a.x += a.vx * dt; a.y += a.vy * dt; a.flash = Math.max(0, a.flash - dt);
      if (a.y > G.H + 12 || a.x < -20 || a.x > G.W + 20) a.dead = true;
      if (!a.dead && p.alive && U.d2(a.x, a.y, p.x, p.y) < (a.r + p.r) ** 2) { if (X.damagePlayer(a.dmg) || p.dashT > 0) { a.dead = true; F.explode(a.x, a.y, a.r * 2, '#8b9bb4'); } }
    }
    R.rocks = R.rocks.filter(a => !a.dead);
  }

  // ------------------------------------------------------------ director
  function director(dt) {
    const R = X.R;
    if (!R.boss && !R.bossIntro && R.score >= R.nextBoss) startBossIntro();
    if (R.bossIntro > 0) {
      R.bossIntro -= dt;
      if (R.bossIntro <= 0) { R.bossIntro = 0; B.spawnBoss(R.bossIdx); if (R.stats.firstBossAt == null) R.stats.firstBossAt = R.time; }
      return;
    }
    if (R.boss) return;
    if (!R.mboss && R.score >= R.nextMini) {
      if (R.nextMini < R.nextBoss - 2000) { const b = B.spawnMini(R.mbossIdx); U.ui('showBossBar', { id: b.id, nameKey: b.nameKey, hp: b.max, mini: true, col: b.def.col }); }
      R.mbossIdx++; R.nextMini = D().mbossScore ? D().mbossScore(R.mbossIdx) : MINI_FIRST() + R.mbossIdx * BOSS_EVERY();
    }
    // spawns: keep count at target; refill 0.5-1.0 s after a kill
    const target = EN.target(R.sector, !!R.mboss);
    let live = 0; for (const e of R.enemies) if (!e.dead && e.leaving == null) live++;
    const deficit = target - live - R.spawnQ.length;
    const [d0, d1] = D().respawnDelay || [0.5, 1.0];
    for (let i = 0; i < deficit; i++) R.spawnQ.push(U.rnd(d0, d1) + i * 0.2);
    for (let i = R.spawnQ.length - 1; i >= 0; i--) {
      R.spawnQ[i] -= dt;
      if (R.spawnQ[i] <= 0) { R.spawnQ.splice(i, 1); if (live < target) { if (EN.spawn(EN.pickType(R.sector))) live++; } }
    }
    // sector events
    if (R.event) updateEvent(dt);
    else if (!R.mboss) { R.eventT -= dt; if (R.eventT <= 0) startEvent(); }
  }

  // ------------------------------------------------------------ player
  function updatePlayer(dt) {
    const R = X.R, p = R.p, I = NC.Input, st = R.st, s = U.settings();
    p.inv = Math.max(0, p.inv - dt); p.dashCd = Math.max(0, p.dashCd - dt); p.hurtT = Math.max(0, p.hurtT - dt);
    if (!p.alive) return;
    const maxV = 115 * st.speed * R.m.speed;
    if (p.dashT > 0) p.dashT -= dt;
    else {
      let tx = 0, ty = 0;
      if (X.botInput) { tx = X.botInput.x * maxV; ty = X.botInput.y * maxV; }
      else if (I.move.x || I.move.y) { tx = I.move.x * maxV; ty = I.move.y * maxV; }
      else if (I.device === 'mouse' && I.mouse.on && s.ctrl !== 'touch' && s.ctrl !== 'gamepad') {
        const m = NC.render.toLogical(I.mouse.x, I.mouse.y); tx = (m.x - p.x) * 8; ty = (m.y - p.y) * 8;
        const mm = Math.hypot(tx, ty); if (mm > maxV) { tx *= maxV / mm; ty *= maxV / mm; }
      }
      const k = Math.min(1, dt * 12); p.vx += (tx - p.vx) * k; p.vy += (ty - p.vy) * k;
    }
    p.x = U.clamp(p.x + p.vx * dt, 8, G.W - 8); p.y = U.clamp(p.y + p.vy * dt, 12, G.H - 16);
    // aim: ship always faces up; shots go up unless auto-aim / right stick
    const mode = s.aim || (s.ctrl === 'touch' || s.ctrl === 'gamepad' ? 'auto' : 'forward');
    let ta = -Math.PI / 2;
    if (I.aim.on && !X.botInput) ta = Math.atan2(I.aim.y, I.aim.x);
    else if (mode === 'auto' || X.botInput) { const t = X.nearest(p.x, p.y, 200); if (t && t.y < p.y + 10) ta = Math.atan2(t.y - p.y, t.x - p.x); }
    p.aimAng += U.angDiff(p.aimAng, ta) * Math.min(1, dt * 16);
    // dash
    const wantDash = X.botInput ? X.botInput.dash : I.take('dash');
    if (wantDash && p.dashCd <= 0) {
      let dx = X.botInput ? X.botInput.x : I.move.x, dy = X.botInput ? X.botInput.y : I.move.y; if (!dx && !dy) { dx = 0; dy = -1; }
      const m = Math.hypot(dx, dy) || 1; p.vx = dx / m * 330; p.vy = dy / m * 330; p.dashT = 0.18; p.dashCd = st.dashCd * R.m.dashCd;
      F.burst(p.x, p.y, '#2ce8f5', 8, 60); U.sfx('dash'); I.buzz(20, 0.3); sys('track', 'dashes', 1);
    } else if (!X.botInput) I.take('dash');
    // consumables
    for (let i = 0; i < 3; i++) if ((X.botInput ? X.botInput.cons === i : I.takeCons(i))) G.useConsumable(i);
    for (const c of R.cons) c.cd = Math.max(0, c.cd - dt);
    // shield regen (not during ion storm)
    p.shdT -= dt;
    if (p.shdT <= 0 && p.shd < R.maxShd && !(R.event && R.event.id === 'ionstorm')) p.shd = Math.min(R.maxShd, p.shd + R.maxShd * 0.2 * st.regen * R.m.shdRegen * dt);
    for (const k of Object.keys(R.buffs)) R.buffs[k] = Math.max(0, R.buffs[k] - dt);
  }
  function die() {
    const R = X.R, p = R.p;
    p.alive = false; p.hp = 0; R.dying = 1.2;
    F.explode(p.x, p.y, 64, '#2ce8f5'); F.doFlash('#ffffff', 0.5); F.hitstop = 0.15; NC.Input.buzz(300, 1); U.sfx('explode_l');
    R.stats.bossDeaths.push(R.boss ? 'boss' : 'field');
  }
  function afterDeath() {
    const R = X.R;
    if (R.st.flags.autoRevive && !R.autoRevived) { R.autoRevived = true; doRevive(); alert('rebirth', {}); return; }
    const max = (D().REVIVE && D().REVIVE.max) || 3;
    const cost = NC.sys && NC.sys.reviveCost ? sys('reviveCost', R.sector, R.revives) : (R.revives < max ? Math.round(400 * (R.revives + 1) * (1 + 0.6 * R.sector)) : null);
    if (cost == null || R.revives >= max) { endRun(true); return; }
    G.mode = 'revive'; R.reviveCost = cost;
    if (X.headless) return;
    U.ui('showRevive', cost, max - R.revives);
  }
  function doRevive() {
    const R = X.R, p = R.p;
    p.alive = true; p.hp = R.maxHp * 0.6; p.shd = R.maxShd; p.inv = 3; p.vx = p.vy = 0;
    R.ebullets.length = 0; R.beams = R.beams.filter(b => b.owner === 'boss' && b.t > b.charge + b.fire); R.mines.length = 0; R.shells.length = 0;
    for (const e of R.enemies) { const d = Math.hypot(e.x - p.x, e.y - p.y) || 1; if (d < 70) { e.vx = (e.x - p.x) / d * 120; e.vy = (e.y - p.y) / d * 120; } }
    F.ring(p.x, p.y, '#2ce8f5', 90, 0.7); F.burst(p.x, p.y, '#2ce8f5', 20, 120); F.doFlash('#2ce8f5', 0.35);
    U.sfx('revive'); G.mode = 'play'; NC.Input.clear();
  }
  // NC.game.revive() -> true if revived (pays crystals through NC.sys.revive)
  G.revive = () => {
    const R = G.run; if (!R || G.mode !== 'revive') return false;
    if (NC.sys && NC.sys.revive) { const r = sys('revive', R.sector, R.revives); if (!r || r.ok === false) { U.sfx('error'); return false; } }
    R.revives++; doRevive(); return true;
  };

  // ------------------------------------------------------------ pickups & bullets
  function updateItems(dt) {
    const R = X.R, p = R.p, mag = R.buffs.magnet > 0 ? 9999 : R.st.magnet * (1 + R.m.magnet);
    for (const it of R.items) {
      it.t += dt; it.x += it.vx * dt; it.y += it.vy * dt; it.vx *= Math.pow(0.05, dt); it.vy *= Math.pow(0.05, dt);
      if (it.kind === 'xp') it.y += 11 * dt; // xp orbs drift towards the player's zone and rest at the bottom edge
      else if (it.kind !== 'chest' && it.kind !== 'cr') it.y += 6 * dt;
      if (it.y > G.H - 5 && !it.home) it.y = G.H - 5;
      if (it.life != null && !it.home) { it.life -= dt; if (it.life <= 0) { it.dead = true; continue; } }
      if (!p.alive) continue;
      const d2 = U.d2(it.x, it.y, p.x, p.y), pull = it.home ? it.t > 0.25 : it.kind === 'chest' ? it.t > 0.8 : d2 < mag * mag || (it.kind === 'cr' && it.t > 1.2);
      if (pull) { const d = Math.sqrt(d2) || 1, sp = it.home ? 170 + it.t * 120 : 120 + it.t * 60, m = Math.min(d, sp * dt); it.x += (p.x - it.x) / d * m; it.y += (p.y - it.y) / d * m; }
      if (d2 < (p.r + 7) ** 2) { it.dead = true; collect(it); }
    }
    R.items = R.items.filter(i => !i.dead);
  }
  function collect(it) {
    const R = X.R, p = R.p;
    if (it.kind === 'cr') { const v = Math.max(1, Math.round(it.v * (R.buffs.x2 > 0 ? (consDef('x2').mult || 2) : 1))); R.crystals += v; sys('addCrystals', v); U.sfx('pickup_crystal'); }
    else if (it.kind === 'xp') { addXp(it.v || 1); U.sfx('pickup_star', 1); }
    else if (it.kind === 'star') { bumpCombo(); addScore(30); addXp(1); sys('track', 'stars', 1); U.sfx('pickup_star', R.combo); F.burst(it.x, it.y, '#f2c46a', 4, 30, 0.3); }
    else if (it.kind === 'repair') { p.hp = Math.min(R.maxHp, p.hp + R.maxHp * (((D().HEAL || {}).repair) || 0.25)); U.sfx('repair'); F.burst(it.x, it.y, '#63c74d', 8, 40); }
    else if (it.kind === 'nova') { supernova(); }
    else if (it.kind === 'chest') { R.chests.push(it.r); sys('addChest', it.r, 1); alert('chest', { r: it.r, nameKey: 'chest.' + it.r + '.name' }); U.sfx(it.r >= 3 ? 'legendary' : 'chest_open'); }
  }
  function supernova() {
    const R = X.R; alert('supernova', {}); F.doFlash('#fee761', 0.4); F.ring(R.p.x, R.p.y, '#fee761', Math.max(G.W, G.H), 0.9);
    for (const e of R.enemies) if (!e.dead && e.leaving == null) X.damage(e, e.hp + 1, false, e.x, e.y, { quiet: true });
    R.ebullets.length = 0; R.buffs.over = 8; U.sfx('legendary');
  }
  function updateEnemyFire(dt) {
    const R = X.R, p = R.p;
    for (const b of R.ebullets) {
      if (R.event && R.event.id === 'blackhole') X.gravity(b, dt, 0.4);
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.dead || b.life <= 0 || b.x < -10 || b.x > G.W + 10 || b.y < -14 || b.y > G.H + 10) { b.dead = true; continue; }
      if (R.comp && R.comp.def.block && U.d2(b.x, b.y, R.comp.x, R.comp.y) < 49) { b.dead = true; F.spark(b.x, b.y, '#fee761', 0, 0); continue; }
      if (p.alive && U.d2(b.x, b.y, p.x, p.y) < (b.r + p.r - 1) ** 2) {
        if (p.dashT > 0 || R.buffs.shield > 0) { b.dead = true; F.spark(b.x, b.y, '#2ce8f5', 0, 0); }
        else if (X.damagePlayer(b.dmg)) b.dead = true;
      }
    }
    R.ebullets = R.ebullets.filter(b => !b.dead);
    for (const m of R.mines) { m.t += dt; if (m.t >= m.arm) { m.dead = true; X.blast(m.x, m.y, m.r, m.dmg, m.col); } }
    R.mines = R.mines.filter(m => !m.dead);
    for (const s of R.shells) { s.t += dt; if (s.t >= s.dur) { s.dead = true; X.blast(s.x, s.y, s.r, s.dmg, '#d77643'); } }
    R.shells = R.shells.filter(s => !s.dead);
    for (const bm of R.beams) {
      bm.t += dt;
      if (bm.src) { if (bm.src.dead || bm.src.leaving != null) { bm.dead = true; continue; } if (bm.owner !== 'boss') { bm.x = bm.src.x; bm.y = bm.src.y + 6; if (bm.t < bm.charge - 0.35) bm.ang = Math.atan2(p.y - bm.y, p.x - bm.x); } }
      if (bm.t >= bm.charge && !bm.fired) { bm.fired = true; U.sfx('beam_fire'); F.doShake(2); }
      if (bm.t >= bm.charge && bm.t < bm.charge + bm.fire && p.alive) {
        bm.tick -= dt;
        const dx = Math.cos(bm.ang), dy = Math.sin(bm.ang), px = p.x - bm.x, py = p.y - bm.y, along = px * dx + py * dy;
        if (along > 0 && along < bm.len && Math.abs(px * dy - py * dx) < bm.w / 2 + p.r * 0.6 && bm.tick <= 0) { if (X.damagePlayer(bm.dmg * 0.35)) bm.tick = 0.15; }
      }
      if (bm.t >= bm.charge + bm.fire) bm.dead = true;
    }
    R.beams = R.beams.filter(b => !b.dead);
  }

  // ------------------------------------------------------------ main step
  function step(dt) {
    const R = X.R, p = R.p; targetsCache = null;
    R.time += dt;
    if (R.dying > 0) { R.dying -= dt; if (R.dying <= 0) { R.dying = 0; afterDeath(); return; } }
    updatePlayer(dt);
    director(dt);
    EN.update(dt); targetsCache = null;
    B.update(dt); targetsCache = null;
    updateRocks(dt); targetsCache = null;
    W.update(dt);
    W.updateBullets(dt);
    updateEnemyFire(dt);
    updateItems(dt);
    for (const e of R.enemies) if (e.dead && !e._done) { e._done = true; }
    R.enemies = R.enemies.filter(e => !e.dead);
    if (R.comboT > 0) { R.comboT -= dt; if (R.comboT <= 0) R.combo = 1; }
    if (F.headless) F.update(dt);
    // level-up cards
    if (R.pendingCards > 0 && p.alive && G.mode === 'play' && R.dying <= 0) openCards();
  }

  // ------------------------------------------------------------ cards
  function cardList() { return (D().CARDS && D().CARDS.length ? D().CARDS : DEFAULT_CARDS); }
  const DEFAULT_CARDS = [['dmg', 10, 10, 0.15], ['rate', 8, 10, 0.12], ['gun', 3, 6, 1], ['pierce', 2, 4, 1], ['bounce', 2, 5, 1], ['missile', 4, 6, 1], ['orbit', 4, 6, 1], ['shield', 5, 8, 0.3], ['heal', 99, 7, 0.4], ['magnet', 3, 5, 0.5], ['speed', 4, 6, 0.1], ['crit', 5, 7, 0.08], ['vamp', 3, 4, 0.01],
    ...['laser', 'plasma', 'missile', 'rail', 'flame'].map(w => ['evo_' + w, 5, 5, 0.08, w])].map(([id, max, w, val, weapon]) => ({ id, max, w, val, weapon, nameKey: 'card.' + id + '.name', descKey: 'card.' + id + '.desc', sprite: 'card_' + id }));
  // card rarity (SPEC-31 §2.6): def.r from NC.DATA (data agent); fallback table; evo cards Legendary
  const CARD_R = { dmg: 0, rate: 0, heal: 0, speed: 0, magnet: 0, shield: 1, bounce: 1, missile: 1, crit: 1, pierce: 2, orbit: 2, vamp: 2, gun: 3 };
  const cardR = (c) => (typeof c.r === 'number' ? U.clamp(c.r | 0, 0, 4) : c.weapon ? 3 : (CARD_R[c.id] != null ? CARD_R[c.id] : 0));
  const SPECIAL_OK = {}; // special cards (3.2) are offered only once their engine logic exists (none in 3.1)
  const rarityW = () => { const w = D().CARD_RARITY_W; return Array.isArray(w) && w.length >= 5 ? w : [46, 28, 16, 8, 2]; };
  // offers: pick a rarity by weight (only rarities that still have available cards), then a card of that rarity by its w
  G.cardChoices = () => {
    const R = X.R, wid = R.st.weapon.id, RW = rarityW();
    const avail = cardList().filter(c => (R.cards[c.id] || 0) < c.max && (!c.weapon || c.weapon === wid) && !(c.special && !SPECIAL_OK[c.id]));
    const out = [];
    while (out.length < 3 && avail.length) {
      const has = [0, 1, 2, 3, 4].filter(r => avail.some(c => cardR(c) === r));
      const r = U.weighted(has.map(r => [r, RW[r] || 0.0001]));
      const pool = avail.filter(c => cardR(c) === r);
      const c = U.weighted(pool.map(c => [c, Math.max(0.01, c.w || 1)]));
      out.push(c); avail.splice(avail.indexOf(c), 1);
    }
    return out.map(c => ({ id: c.id, lvl: (R.cards[c.id] || 0) + 1, max: c.max, r: cardR(c), special: !!c.special, nameKey: c.nameKey, descKey: c.descKey, sprite: c.sprite || 'card_' + c.id, evo: !!c.weapon }));
  };
  const rerollCost = (n) => (NC.sys && NC.sys.rerollCost ? sys('rerollCost', n) : (n <= 0 ? 0 : 50 * Math.pow(2, n - 1)));
  function openCards() {
    const R = X.R; G.mode = 'cards'; R.rerollN = 0; R.offered = G.cardChoices(); U.sfx('levelup');
    if (X.headless) return;
    U.ui('showCards', R.offered, rerollCost(0));
  }
  // NC.game.rerollCards() -> true if rerolled. First reroll per level-up is free, then 50, 100, 200... crystals
  G.rerollCards = () => {
    const R = G.run; if (!R || G.mode !== 'cards') return false;
    const cost = rerollCost(R.rerollN);
    if (cost > 0) {
      if (NC.sys && NC.sys.spend) { const r = sys('spend', cost); if (!r || r.ok === false) { U.sfx('error'); return false; } }
      else if (R.crystals >= cost) R.crystals -= cost; else { U.sfx('error'); return false; }
    }
    R.rerollN++; R.offered = G.cardChoices(); U.sfx('reroll');
    U.ui('showCards', R.offered, rerollCost(R.rerollN));
    return true;
  };
  G.pickCard = (id) => {
    const R = G.run; if (!R || G.mode !== 'cards') return false;
    const c = cardList().find(x => x.id === id); if (!c) return false;
    const m = R.m, v = c.val != null ? c.val : 0.1; R.cards[id] = (R.cards[id] || 0) + 1;
    switch (id) {
      case 'dmg': m.dmg += v; break;
      case 'rate': m.rate += v; break;
      case 'gun': m.guns += 1; break;
      case 'pierce': m.pierce += 1; break;
      case 'bounce': m.bounce += 1; break;
      case 'missile': m.missile += 1; break;
      case 'orbit': m.orbit += 1; break;
      case 'shield': m.shd += v; m.shdRegen += 0.25; applyMaxes(); R.p.shd = R.maxShd; break;
      case 'heal': m.hp += 0.1; applyMaxes(); R.p.hp = Math.min(R.maxHp, R.p.hp + R.maxHp * v); break;
      case 'magnet': m.magnet += v; break;
      case 'speed': m.speed += v; m.dashCd *= 0.88; break;
      case 'crit': m.crit += v; break;
      case 'vamp': m.vamp += v; break;
      default: if (c.weapon && R.cards[id] >= c.max) { W.evolve(); sys('track', 'evos', 1); }
    }
    sys('track', 'cards', 1); U.sfx('card');
    R.pendingCards = Math.max(0, R.pendingCards - 1);
    if (R.pendingCards > 0) { R.rerollN = 0; R.offered = G.cardChoices(); if (!X.headless) U.ui('showCards', R.offered, rerollCost(0)); return true; }
    G.mode = 'play'; R.p.inv = Math.max(R.p.inv, 0.6); NC.Input.clear();
    return true;
  };

  // ------------------------------------------------------------ consumables (SPEC §6.7)
  G.useConsumable = (i) => {
    const R = G.run; if (!R || G.mode !== 'play' || !R.p.alive) return false;
    const c = R.cons[i]; if (!c || c.count <= 0 || c.cd > 0) return false;
    const d = consDef(c.id), p = R.p;
    switch (c.id) {
      case 'mine': {
        F.ring(p.x, p.y, '#ff0044', Math.max(G.W, G.H), 0.8); F.doFlash('#feae34', 0.45); F.doShake(6); U.sfx('mine');
        for (const e of R.enemies) if (!e.dead && e.leaving == null) X.damage(e, e.hp + 1, false, e.x, e.y, { quiet: true });
        for (const a of R.rocks) X.damage(a, a.hp + 1, false);
        R.ebullets.length = 0; R.shells.length = 0;
        const cap = d.bossDmgCap != null ? d.bossDmgCap : 0.3;
        for (const b of [R.boss, R.mboss]) if (b && !b.untargetable) { b.inv = 0; X.damage(b, Math.min(X.eff().atk * 100, b.max * cap), true, b.x, b.y); }
        break;
      }
      case 'shield': R.buffs.shield = d.dur || 10; U.sfx('shield_up'); break;
      case 'magnet': R.buffs.magnet = d.dur || 15; U.sfx('magnet'); break;
      case 'x2': R.buffs.x2 = d.dur || 30; U.sfx('pickup_crystal'); break;
      case 'repair': p.hp = Math.min(R.maxHp, p.hp + R.maxHp * (d.heal || 0.5)); F.burst(p.x, p.y, '#63c74d', 14, 60); U.sfx('repair'); break;
      default: return false;
    }
    c.count--; c.cd = d.cd || 3; R.consUsed[c.id] = (R.consUsed[c.id] || 0) + 1;
    sys('consumeOne', c.id); NC.Input.buzz(40, 0.5);
    return true;
  };

  // ------------------------------------------------------------ end of run
  function endRun(show) {
    const R = G.run; if (!R) return null;
    G.mode = 'over';
    const res = sys('endRun', { score: R.score, sector: R.sector, combo: R.maxCombo, time: R.time, xp: R.xp, kills: R.kills, bosses: R.bossesKilled }) || {};
    sys('flush');
    const s = G.lastSummary = {
      score: R.score, best: res.best != null ? res.best : R.score, isBest: !!res.isBest, kills: R.kills, sector: R.sector, bosses: R.bossesKilled,
      combo: R.maxCombo, crystals: R.crystals, xp: res.xpGain != null ? res.xpGain : Math.round(R.xp * R.st.xpMult), lvlBefore: res.lvlBefore || R.lvlBefore, lvlAfter: res.lvlAfter || R.lvlBefore,
      time: Math.round(R.time), chests: R.chests.slice(), revives: R.revives, shipId: R.st.shipId, consumablesUsed: Object.assign({}, R.consUsed),
    };
    U.ui('hideBossBar'); U.music('menu');
    if (show) { U.sfx('gameover'); U.ui('showGameOver', s); }
    return s;
  }

  // ------------------------------------------------------------ HUD
  function updateHud() {
    const h = NC.hud, R = G.run; h.fps = G.fps; h.mode = G.mode;
    if (!R) return;
    const p = R.p, b = R.boss || R.mboss;
    h.score = R.score; h.combo = R.combo; h.comboT01 = R.comboT / 3; h.sector = R.sector + 1; h.biome = R.biome;
    h.hp = Math.max(0, Math.round(p.hp)); h.maxHp = R.maxHp; h.shd = Math.round(p.shd); h.maxShd = R.maxShd; h.atk = Math.round(X.eff().atk);
    const wal = NC.sys && NC.sys.crystals ? sys('crystals') : null; h.crystals = wal != null ? wal : R.crystals; h.runCrystals = R.crystals;
    h.runLvl = R.runLvl; h.runXp = Math.floor(R.runXp); h.runNeed = R.runNeed;
    const dcd = R.st.dashCd * R.m.dashCd; h.dashCd01 = dcd > 0 ? U.clamp(p.dashCd / dcd, 0, 1) : 0;
    h.consumables = R.cons.map(c => ({ id: c.id, count: c.count, cd01: c.max ? U.clamp(c.cd / c.max, 0, 1) : 0 }));
    h.boss = b ? { nameKey: b.nameKey, hp01: b.state !== 'enter' ? U.clamp(b.hp / b.max, 0, 1) : 1, mini: !b.big, segs: b.big ? B.PHASES : 1, phase: b.state !== 'enter' ? b.phase : 0, id: b.id } : null;
    h.buffs = Object.assign({}, R.buffs); h.event = R.event ? R.event.id : null; h.time = R.time; h.evolved = R.evolved; h.enemies = R.enemies.length;
  }

  // ------------------------------------------------------------ pause stats (SPEC-31 §2.5)
  // NC.game.runStats() -> numbers only (UI formats/translates). crit/vamp 0..1, critDmg multiplier, speed multiplier,
  // magnet px, dashCd s, regen = shield regen multiplier, dps = estimated sustained damage/s (weapon + companion + turret + cards)
  G.runStats = () => {
    const R = G.run; if (!R) return null;
    const p = R.p, st = R.st, m = R.m, E = X.eff(), wd = R.wdef || {}, evo = !!R.evolved, wid = st.weapon.id;
    const critF = 1 + E.crit * ((E.critMult || 2) - 1);
    let shots = 1;
    if (wid === 'laser') shots = Math.min(7, E.guns + (evo ? 1 : 0));
    else if (wid === 'plasma') shots = Math.min(5, E.guns) * (1 + Math.min(3, E.pierce) * 0.35);
    else if (wid === 'missile') shots = Math.min(8, E.guns + (evo ? 2 : 0)) * (evo ? 0.8 : 1) * 1.3;
    else if (wid === 'rail') shots = Math.min(4, E.guns) * 1.5;
    else if (wid === 'flame') shots = (1 + Math.floor((E.guns - 1) / 2)) * 1.5;
    let dps = E.shot * E.rate * shots;
    if (R.comp) dps += E.shot * (R.comp.frac || 2 / 3 * (1 + 0.03 * (R.comp.lvl - 1))) * E.rate * (R.comp.def.guns || 1);
    if (R.tur) { const T = R.tur, d = T.def, lm = T.mult || 1 + 0.08 * (T.lvl - 1); dps += E.atk * d.dmg * lm * (T.id === 'beam' ? 1 : d.rate || 1); }
    if (m.missile) dps += E.atk * 1.4 * m.missile / 2;
    if (m.orbit) dps += E.atk * 0.7 * m.orbit * 0.6;
    const cards = Object.keys(R.cards).filter(id => R.cards[id] > 0).map(id => { const c = cardList().find(x => x.id === id) || { id, max: 1 }; return { id, lvl: R.cards[id], max: c.max, r: cardR(c), special: !!c.special }; });
    return {
      hp: Math.max(0, Math.round(p.hp)), maxHp: R.maxHp, shd: Math.round(p.shd), maxShd: R.maxShd,
      atk: Math.round(E.shot), atkBase: Math.round(E.atk), rate: +(E.rate * shots).toFixed(1), dps: Math.round(dps * critF), crit: E.crit, critDmg: E.critMult || 2, vamp: m.vamp || 0,
      speed: +(st.speed * m.speed).toFixed(2), magnet: Math.round(st.magnet * (1 + m.magnet)), dashCd: +(st.dashCd * m.dashCd).toFixed(2),
      guns: E.guns, pierce: E.pierce, regen: +(st.regen * m.shdRegen).toFixed(2),
      runLvl: R.runLvl, runXp: Math.floor(R.runXp), runNeed: R.runNeed, time: Math.floor(R.time), kills: R.kills, score: R.score, cards,
    };
  };

  // ------------------------------------------------------------ debug + headless simulation (SPEC §5)
  function bot() {
    const R = X.R, p = R.p; let fx = 0, fy = 0, dash = false;
    for (const b of R.ebullets) { const dx = p.x - b.x, dy = p.y - b.y, d2 = dx * dx + dy * dy; if (d2 < 900) { const d = Math.sqrt(d2) || 1; fx += dx / d * (30 - d) / 10; fy += dy / d * (30 - d) / 10; if (d < 9) dash = true; } }
    for (const e of R.enemies) { const dx = p.x - e.x, dy = p.y - e.y, d2 = dx * dx + dy * dy, rr = e.r + 18; if (d2 < rr * rr) { const d = Math.sqrt(d2) || 1; fx += dx / d * 2; fy += dy / d * 2; } }
    for (const m of [...R.mines, ...R.shells]) { const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1; if (d < m.r + 8) { fx += dx / d * 2; fy += dy / d * 2; } }
    for (const bm of R.beams) { const dx = Math.cos(bm.ang), dy = Math.sin(bm.ang), px = p.x - bm.x, py = p.y - bm.y, cr = px * dy - py * dx; if (Math.abs(cr) < bm.w + 10 && px * dx + py * dy > 0) { fx += Math.sign(cr || 1) * dy * 2; fy -= Math.sign(cr || 1) * dx * 2; } }
    const t = X.nearest(p.x, p.y, 999), tx = t ? t.x : G.W / 2, ty = G.H * 0.78;
    const it = R.items.find(i => U.d2(i.x, i.y, p.x, p.y) < 60 * 60);
    fx += U.clamp(((it ? it.x : tx) - p.x) / 40, -1, 1) * 0.6; fy += U.clamp(((it ? it.y : ty) - p.y) / 40, -1, 1) * 0.6;
    const m = Math.hypot(fx, fy); if (m > 1) { fx /= m; fy /= m; }
    let cons = -1;
    R.cons.forEach((c, i) => { if (c.count > 0 && c.cd <= 0 && cons < 0) { if ((c.id === 'repair' && p.hp < R.maxHp * 0.35) || (c.id === 'mine' && (R.boss || R.enemies.length >= 14)) || (c.id === 'shield' && p.hp < R.maxHp * 0.5) || ((c.id === 'magnet' || c.id === 'x2') && R.time > 20)) cons = i; } });
    return { x: fx, y: fy, dash, cons };
  }
  NC.debug = {
    state: () => {
      const R = G.run; if (!R) return { mode: G.mode };
      const types = {}; for (const e of R.enemies) if (e.leaving == null && !e.dead) types[e.type] = (types[e.type] || 0) + 1;
      return { mode: G.mode, score: R.score, time: +R.time.toFixed(2), sector: R.sector, biome: R.biome, enemies: R.enemies.filter(e => e.leaving == null && !e.dead).length, enemiesTotal: R.enemies.length, types, roster: EN.roster(R.sector),
        boss: R.boss ? { id: R.boss.id, hp: Math.round(R.boss.hp), max: R.boss.max, state: R.boss.state, phase: R.boss.phase } : null, bossIntro: R.bossIntro, mboss: R.mboss ? { id: R.mboss.id, hp: Math.round(R.mboss.hp) } : null,
        event: R.event ? R.event.id : null, hp: Math.round(R.p.hp), maxHp: R.maxHp, shd: Math.round(R.p.shd), alive: R.p.alive, kills: R.kills, runLvl: R.runLvl, cards: Object.assign({}, R.cards), crystals: R.crystals,
        cons: R.cons.map(c => ({ id: c.id, count: c.count })), buffs: Object.assign({}, R.buffs), revives: R.revives, maxOnScreen: R.stats.maxOnScreen, firstBossAt: R.stats.firstBossAt, bossesKilled: R.bossesKilled,
        p: { x: +R.p.x.toFixed(1), y: +R.p.y.toFixed(1) }, W: G.W, H: G.H, k: NC.render.k, fps: G.fps, ebullets: R.ebullets.length, bullets: R.bullets.length, seenTypes: Object.assign({}, R.seenTypes), rosterLog: R.rosterLog };
    },
    setScore: (v) => { const R = G.run; if (!R) return; R.score = v; while (R.nextMini <= v - 1 && R.nextMini < R.nextBoss) { R.mbossIdx++; R.nextMini = D().mbossScore ? D().mbossScore(R.mbossIdx) : MINI_FIRST() + R.mbossIdx * BOSS_EVERY(); } },
    killBoss: () => { const R = G.run; if (!R) return; for (const b of [R.boss, R.mboss]) if (b) { b.state = 'idle'; b.untargetable = false; b.inv = 0; X.damage(b, b.hp + 1, false); } targetsCache = null; },
    hurt: (v) => { const R = G.run; if (!R) return; R.p.inv = 0; X.damagePlayer(v); },
    addXp: (v) => { if (G.run) addXp(v); },
    spawn: (id) => { if (!G.run) return null; targetsCache = null; const e = EN.spawn(id, {}); return e ? e.type : null; },
    godMode: (b) => { G.god = !!b; },
    setSector: (s) => { if (G.run) { setSector(s); G.run.bossIdx = s; G.run.nextBoss = (s + 1) * BOSS_EVERY(); G.run.score = Math.max(G.run.score, s * BOSS_EVERY()); NC.debug.setScore(G.run.score); } },
    useCons: (i) => G.useConsumable(i),
    // simulate(seconds, {bot=true, cards='random'|'first', revive=true, god=false}) runs headless at fixed 60 Hz, returns a report
    simulate: (seconds = 60, o = {}) => {
      o = Object.assign({ bot: true, cards: 'random', revive: true, god: false }, o);
      if (!G.run || G.mode === 'over' || G.mode === 'menu') G.start(o.loadout);
      const R = G.run, wasGod = G.god; G.god = o.god || wasGod;
      X.headless = true; F.headless = true;
      const rep = { start: R.time, deaths: 0, samples: [], maxEnemies: 0, bossDuringOthers: 0, bossFights: [] };
      const steps = Math.round(seconds * 60); let bossStart = null;
      try {
        for (let i = 0; i < steps; i++) {
          if (G.mode === 'cards') { const c = o.cards === 'first' ? R.offered[0] : U.pick(R.offered); G.pickCard(c.id); }
          if (G.mode === 'revive') { rep.deaths++; if (o.revive) { R.revives++; doRevive(); } else { endRun(false); break; } }
          if (G.mode === 'paused') G.resume();
          if (G.mode !== 'play') break;
          X.botInput = o.bot ? bot() : { x: 0, y: 0, dash: false, cons: -1 };
          step(1 / 60);
          const live = R.enemies.filter(e => e.leaving == null).length;
          rep.maxEnemies = Math.max(rep.maxEnemies, R.enemies.length);
          if (R.boss && R.boss.state !== 'enter' && live > 0) rep.bossDuringOthers++;
          if (R.boss && bossStart == null) bossStart = { t: R.time, id: R.boss.id, score: R.score };
          if (!R.boss && bossStart) { rep.bossFights.push({ id: bossStart.id, at: +bossStart.t.toFixed(1), dur: +(R.time - bossStart.t).toFixed(1), scoreAt: bossStart.score }); bossStart = null; }
          if (i % 600 === 0) rep.samples.push({ t: Math.round(R.time), score: R.score, sector: R.sector, enemies: live, lvl: R.runLvl, hp: Math.round(R.p.hp) });
        }
      } finally { X.headless = false; F.headless = false; X.botInput = null; G.god = wasGod; }
      return Object.assign(rep, { end: NC.debug.state(), bossActive: bossStart });
    },
  };
})(window.NC = window.NC || {});
