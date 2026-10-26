'use strict';
// Neon Comet - STORY MODE data (agent "data"): chapters, levels/waves, crew, crew items, dialogs, clues. Texts live in js/lang/story.js.
// Wave entry: {en: enemyId, n: count, pattern: 'line'|'arc'|'v'|'sides'|'ring'|'rain'|'cluster'|'random', delay: seconds after wave start}.
(function (NC) {
  const w = (en, n, pattern, delay) => ({ en, n, pattern: pattern || 'random', delay: delay || 0 });
  const L = (id, par, cr, xp, waves, o) => Object.assign({ id, par, waves, reward: { cr, xp }, first: { cr: Math.round(cr * 1.5), xp: Math.round(xp * 0.5) } }, o || {});

  // ---------------- chapter 1: Ship Graveyard (10 levels) ----------------
  const ch1 = [
    L('1-1', 70, 80, 40, [
      [w('drone', 5, 'line')],
      [w('drone', 6, 'arc'), w('dart', 2, 'sides', 4)],
      [w('drone', 6, 'v'), w('dart', 4, 'sides', 3)],
    ], { dialogBefore: 'd_1_1a', reward: { cr: 80, xp: 40, item: { r: 0, chance: 0.2 } } }),
    L('1-2', 80, 100, 45, [
      [w('drone', 8, 'line'), w('dart', 3, 'sides', 4)],
      [w('dart', 6, 'arc'), w('drone', 4, 'rain', 3)],
      [w('mine', 3, 'rain'), w('dart', 6, 'v', 3)],
    ], { dialogAfter: 'd_1_2a', clue: 'c1', reward: { cr: 100, xp: 45, item: { r: 0, chance: 0.25 } } }),
    L('1-3', 95, 130, 55, [
      [w('drone', 6, 'line'), w('scav', 2, 'sides', 3)],
      [w('dart', 8, 'arc'), w('scav', 3, 'sides', 4)],
      [w('hunter', 3, 'v'), w('drone', 6, 'rain', 2)],
      [w('mine', 4, 'rain'), w('scav', 3, 'sides', 3), w('dart', 4, 'arc', 6)],
    ], { reward: { cr: 130, xp: 55, item: { r: 0, chance: 0.3 } } }),
    L('1-4', 105, 160, 65, [
      [w('hulk', 2, 'line'), w('drone', 6, 'arc', 3)],
      [w('hunter', 4, 'v'), w('scav', 3, 'sides', 4)],
      [w('hulk', 3, 'rain'), w('dart', 8, 'sides', 3)],
      [w('gunner', 3, 'line'), w('hulk', 2, 'sides', 3), w('scav', 3, 'arc', 6)],
    ], { clue: 'c2', reward: { cr: 160, xp: 65, item: { r: 1, chance: 0.2 } } }),
    L('1-5', 130, 300, 110, [
      [w('hunter', 4, 'v'), w('scav', 4, 'sides', 3)],
      [w('hulk', 3, 'rain'), w('gunner', 3, 'line', 3)],
      [w('splitter', 2, 'line'), w('dart', 8, 'arc', 3)],
    ], { boss: { type: 'mini', id: 'salvager' }, dialogBefore: 'd_1_5a', dialogAfter: 'd_1_5b', clue: 'c3',
         reward: { cr: 300, xp: 110, item: { r: 1, chance: 0.6 } }, first: { cr: 400, xp: 80, item: { r: 1 } } }),
    L('1-6', 115, 190, 75, [
      [w('ghost', 3, 'arc'), w('drone', 8, 'line', 3)],
      [w('ghost', 4, 'sides'), w('dart', 6, 'v', 3)],
      [w('gunner', 4, 'line'), w('ghost', 3, 'arc', 4)],
      [w('hulk', 3, 'rain'), w('ghost', 3, 'sides', 3), w('hunter', 3, 'v', 6)],
      [w('charger', 3, 'line'), w('ghost', 4, 'ring', 4)],
    ], { reward: { cr: 190, xp: 75, item: { r: 1, chance: 0.3 } } }),
    L('1-7', 125, 220, 85, [
      [w('ghost', 3, 'arc'), w('scav', 4, 'sides', 2), w('hulk', 2, 'rain', 4)],
      [w('charger', 3, 'line'), w('gunner', 4, 'v', 3)],
      [w('wraith', 2, 'arc'), w('ghost', 4, 'ring', 3)],
      [w('splitter', 3, 'line'), w('hulk', 3, 'rain', 3), w('dart', 8, 'sides', 5)],
    ], { clue: 'c4', reward: { cr: 220, xp: 85, item: { r: 1, chance: 0.35 } } }),
    L('1-8', 140, 250, 95, [
      [w('tether', 2, 'line'), w('drone', 8, 'arc', 3)],
      [w('tether', 2, 'sides'), w('hunter', 4, 'v', 3), w('scav', 3, 'sides', 5)],
      [w('tether', 3, 'arc'), w('ghost', 3, 'ring', 4)],
      [w('sentinel', 2, 'line'), w('tether', 2, 'sides', 3), w('hulk', 3, 'rain', 5)],
      [w('charger', 4, 'v'), w('tether', 3, 'arc', 4)],
    ], { dialogAfter: 'd_1_8a', reward: { cr: 250, xp: 95, item: { r: 2, chance: 0.2 } } }),
    L('1-9', 150, 290, 110, [
      [w('tether', 3, 'arc'), w('ghost', 4, 'ring', 3), w('scav', 4, 'sides', 5)],
      [w('wraith', 3, 'v'), w('hulk', 4, 'rain', 3), w('gunner', 3, 'line', 5)],
      [w('sentinel', 3, 'line'), w('tether', 2, 'sides', 4)],
      [w('carrier', 1, 'line'), w('hunter', 5, 'v', 3), w('ghost', 3, 'arc', 6)],
      [w('bulwark', 2, 'line'), w('tether', 3, 'arc', 3), w('charger', 3, 'sides', 6)],
    ], { clue: 'c5', reward: { cr: 290, xp: 110, item: { r: 2, chance: 0.3 } } }),
    L('1-10', 180, 600, 220, [
      [w('tether', 3, 'arc'), w('ghost', 5, 'ring', 3), w('hulk', 4, 'rain', 5)],
      [w('wraith', 4, 'v'), w('gunner', 5, 'line', 3), w('scav', 5, 'sides', 5)],
      [w('carrier', 1, 'line'), w('sentinel', 2, 'sides', 3), w('tether', 3, 'arc', 6)],
      [w('artillery', 2, 'line'), w('bulwark', 2, 'sides', 3), w('ghost', 4, 'ring', 6)],
    ], { boss: { type: 'world', id: 'graveking' }, dialogBefore: 'd_1_10a', dialogAfter: 'd_1_10b', clue: 'c6',
         reward: { cr: 600, xp: 220, item: { r: 2, chance: 0.8 } }, first: { cr: 900, xp: 160, item: { r: 3 }, fragment: 1 } }),
  ];

  // 4.0 ores on every level: ore_crew = xp/8, oreAny (random hangar ores) = cr/25; first clear x2 (added on top)
  for (const l of ch1) {
    l.reward.ores = { ore_crew: Math.round(l.reward.xp / 8) }; l.reward.oreAny = Math.round(l.reward.cr / 25);
    l.first.ores = { ore_crew: Math.round(l.reward.xp / 8) * 2 }; l.first.oreAny = Math.round(l.reward.cr / 25) * 2;
  }
  const chapters = [
    { id: 1, world: 'wreck', nameKey: 'story.ch.1', descKey: 'story.ch.1.d', locked: false, levels: ch1,
      chests: { 10: { cr: 400, items: [{ r: 1 }], gearChest: 1, ores: { ore_crew: 30 }, oreAny: 30 }, 20: { cr: 800, items: [{ r: 2 }], gearChest: 2, ores: { ore_crew: 60 }, oreAny: 60 }, 30: { cr: 1500, items: [{ r: 3 }, { r: 2 }], gearChest: 3, ores: { ore_crew: 120 }, oreAny: 120 } } },
  ];
  [['crystal', 2], ['gas', 3], ['jungle', 4], ['hive', 5], ['machine', 6], ['edge', 7]].forEach(([wd, i]) =>
    chapters.push({ id: i, world: wd, nameKey: 'story.ch.' + i, descKey: 'story.ch.' + i + '.d', locked: true, levels: [], chests: {} }));

  // ---------------- crew ----------------
  // ability: cd s, dur s, power (meaning per ability: kael slow fraction, nyra heal fraction, brakk damage x ship shot, sable damage x of hijacked foe,
  // iko pickup pull strength x, vesh reflect damage x). passive: {stat, v} stat in dmg|crit|shdRegen|hp|magnet|dash (fractions).
  const crew = {
    kael:  { nameKey: 'story.crew.kael',  traitKey: 'story.crew.kael.t',  activeKey: 'story.crew.kael.a',  passiveKey: 'story.crew.kael.p',  ability: { id: 'echoSight', cd: 28, dur: 3, power: 0.5 },  passive: { stat: 'dash', v: 0.10 },     unlock: null,  sprite: 'crew_kael',  icon: 'ab_kael',  color: '#e0505a' },
    nyra:  { nameKey: 'story.crew.nyra',  traitKey: 'story.crew.nyra.t',  activeKey: 'story.crew.nyra.a',  passiveKey: 'story.crew.nyra.p',  ability: { id: 'repairDrones', cd: 24, dur: 4, power: 0.25 }, passive: { stat: 'shdRegen', v: 0.15 }, unlock: '1-2', sprite: 'crew_nyra',  icon: 'ab_nyra',  color: '#5fd0b0' },
    brakk: { nameKey: 'story.crew.brakk', traitKey: 'story.crew.brakk.t', activeKey: 'story.crew.brakk.a', passiveKey: 'story.crew.brakk.p', ability: { id: 'lavaBarrage', cd: 30, dur: 3, power: 2.5 },    passive: { stat: 'dmg', v: 0.10 },      unlock: '1-5', sprite: 'crew_brakk', icon: 'ab_brakk', color: '#f08040' },
    sable: { nameKey: 'story.crew.sable', traitKey: 'story.crew.sable.t', activeKey: 'story.crew.sable.a', passiveKey: 'story.crew.sable.p', ability: { id: 'hijack', cd: 40, dur: 6, power: 1.0 },         passive: { stat: 'crit', v: 0.10 },     unlock: '1-8', sprite: 'crew_sable', icon: 'ab_sable', color: '#a070d0' },
    iko:   { nameKey: 'story.crew.iko',   traitKey: 'story.crew.iko.t',   activeKey: 'story.crew.iko.a',   passiveKey: 'story.crew.iko.p',   ability: { id: 'starPulse', cd: 26, dur: 1.5, power: 1.0 },   passive: { stat: 'magnet', v: 0.30 },   unlock: '2-1', sprite: 'crew_iko',   icon: 'ab_iko',   color: '#f5d060' },
    vesh:  { nameKey: 'story.crew.vesh',  traitKey: 'story.crew.vesh.t',  activeKey: 'story.crew.vesh.a',  passiveKey: 'story.crew.vesh.p',  ability: { id: 'spectralWard', cd: 32, dur: 4, power: 1.0 },  passive: { stat: 'hp', v: 0.10 },        unlock: '2-5', sprite: 'crew_vesh',  icon: 'ab_vesh',  color: '#70b8e8' },
  };
  Object.keys(crew).forEach(id => { crew[id].id = id; });
  const CREW_ORDER = ['kael', 'nyra', 'brakk', 'sable', 'iko', 'vesh'];

  const CREW_SCALE = {          // per crew level above 1 (max level 30)
    maxLvl: 30, teamMax: 3,
    power: 0.03,                // ability power x (1 + 0.03 (lvl-1))
    cd: 0.004,                  // cooldown x (1 - 0.004 (lvl-1))  (-11.6% at 30)
    dur: 0.01,                  // duration x (1 + 0.01 (lvl-1))
    passive: 0.02,              // passive value x (1 + 0.02 (lvl-1))
    xpFor: l => Math.round(70 + 30 * l + 1.2 * l * l),   // XP to go from level l to l+1 (101, 250 @5, 490 @10, 1700 @25)
    benchShare: 0.25,           // unlocked crew NOT in the team get this share of level XP
    cdCap: 0.5,                 // items can cut cooldown by at most 50%
  };

  // ---------------- crew items ----------------
  // slot: cw (personal weapon) | imp (implant) | art (artifact). fx at rarity 0 (fractions), multiplied by RMULT[r] and (1 + 0.05 (lvl-1)):
  //   pow = ability power, cd = cooldown reduction, dur = duration. ship = small ship stat bonuses (dmg,crit,hp,shdRegen,magnet,dash,cr,xp).
  const RMULT = [1, 1.6, 2.4, 3.5, 5];
  const itemMaxLvl = r => 5 * (r + 1);
  const itemCost = (r, lvl) => Math.round(120 * RMULT[r] * Math.pow(1.25, lvl - 1));
  const itemSell = (r, lvl) => Math.round(60 * RMULT[r] * (1 + 0.3 * (lvl - 1)));
  const itemSellOre = r => 5 * (r + 1);                               // 4.0: selling a crew item also gives ore_crew
  const crewItemMult = L => 1 + 0.012 * (Math.max(1, L) - 1);        // 4.0: crew category level 1..150 (x2.79 at 150; old lvl 25 = x2.2)
  const I = (id, slot, fx, ship) => ({ id, slot, nameKey: 'story.item.' + id, descKey: 'story.item.' + id + '.d', icon: id, fx, ship: ship || {} });
  const items = [
    I('ci_scrapblade', 'cw', { pow: 0.06 }, { dmg: 0.010 }),
    I('ci_arcpistol', 'cw', { pow: 0.05, cd: 0.02 }, { crit: 0.010 }),
    I('ci_magnum', 'cw', { pow: 0.08 }, { dmg: 0.015 }),
    I('ci_shardcaster', 'cw', { pow: 0.04, dur: 0.03 }, { dmg: 0.010, crit: 0.005 }),
    I('ci_pulselance', 'cw', { pow: 0.05, dur: 0.02 }, { dash: 0.015 }),
    I('ci_nervelink', 'imp', { cd: 0.04 }, { dash: 0.015 }),
    I('ci_cooler', 'imp', { cd: 0.05 }, { shdRegen: 0.02 }),
    I('ci_dermplate', 'imp', { cd: 0.02, pow: 0.02 }, { hp: 0.02 }),
    I('ci_oculus', 'imp', { cd: 0.03, dur: 0.02 }, { crit: 0.010 }),
    I('ci_reactor', 'imp', { cd: 0.03 }, { hp: 0.015, shdRegen: 0.015 }),
    I('ci_beacon', 'art', { dur: 0.06 }, { magnet: 0.05 }),
    I('ci_hourglass', 'art', { dur: 0.08 }, { dash: 0.010 }),
    I('ci_halo', 'art', { dur: 0.04, pow: 0.03 }, { hp: 0.015 }),
    I('ci_relic', 'art', { dur: 0.05, cd: 0.02 }, { cr: 0.02 }),
    I('ci_compass', 'art', { dur: 0.05 }, { xp: 0.02, magnet: 0.03 }),
  ];
  const itemById = {}; items.forEach(i => { itemById[i.id] = i; });
  const SLOTS = ['cw', 'imp', 'art'];

  // ---------------- dialogs (text keys are story.d.<dialogId>.<n>, filled in js/lang/story.js) ----------------
  // who: kael | nyra | brakk | sable | echo | sys. panel: '' (manga panel image slot, empty for now).
  const dlg = (id, whos) => whos.map((who, i) => ({ who, textKey: 'story.d.' + id + '.' + (i + 1), panel: '' }));
  const dialogs = {
    d_1_1a: dlg('d_1_1a', ['sys', 'kael', 'kael', 'sys', 'kael']),
    d_1_2a: dlg('d_1_2a', ['nyra', 'kael', 'nyra', 'kael', 'nyra', 'kael']),
    d_1_5a: dlg('d_1_5a', ['sys', 'kael', 'nyra', 'kael']),
    d_1_5b: dlg('d_1_5b', ['brakk', 'nyra', 'brakk', 'kael', 'brakk']),
    d_1_8a: dlg('d_1_8a', ['sable', 'kael', 'sable', 'brakk', 'sable', 'nyra', 'kael']),
    d_1_10a: dlg('d_1_10a', ['sys', 'kael', 'brakk', 'sable', 'nyra', 'kael']),
    d_1_10b: dlg('d_1_10b', ['sys', 'nyra', 'sable', 'kael', 'brakk', 'kael', 'echo']),
  };

  const clues = {};
  for (let i = 1; i <= 6; i++) clues['c' + i] = { id: 'c' + i, titleKey: 'story.clue.c' + i + '.t', textKey: 'story.clue.c' + i, icon: 'ui_clue' };

  NC.STORY = { chapters, crew, crewOrder: CREW_ORDER, crewScale: CREW_SCALE, items, itemById, slots: SLOTS, rmult: RMULT, itemMaxLvl, itemCost, itemSell, itemSellOre, crewItemMult, dialogs, clues,
    starRules: { two: 0.5, three: 0.8 }, chestStars: [10, 20, 30],
    level(id) { for (const c of chapters) for (const l of c.levels) if (l.id === id) return l; return null; },
    chapterOf(id) { const n = +String(id).split('-')[0]; return chapters.find(c => c.id === n) || null; } };
})(window.NC = window.NC || {});
