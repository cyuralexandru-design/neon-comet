'use strict';
// Neon Comet 3.0 - game data tables (SYSTEMS agent). Pure data + tiny pure helpers, no DOM.
// All user-facing names are i18n keys (NC.t). All numbers used by systems/engine live here.
(function (NC) {
  NC.VERSION = '3.0.0';

  // ---- small shared helpers (kept from v2, pure) ----
  NC.TAU = Math.PI * 2;
  NC.rnd = (a, b) => a + Math.random() * (b - a);
  NC.irnd = (a, b) => Math.floor(NC.rnd(a, b + 1));
  NC.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  NC.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  NC.lerp = (a, b, t) => a + (b - a) * t;
  NC.angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  NC.fmt = n => {
    n = Math.floor(n);
    if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k';
    return String(n);
  };
  NC.weighted = (entries, rng) => { // [[value, weight], ...]
    const tot = entries.reduce((s, e) => s + e[1], 0);
    let r = (rng || Math.random)() * tot;
    for (const e of entries) { r -= e[1]; if (r < 0) return e[0]; }
    return entries[entries.length - 1][0];
  };

  const D = {};

  // =====================================================================
  // 3. RARITIES (shared by everything)
  // =====================================================================
  D.RARITY = [
    { id: 0, key: 'common', nameKey: 'rarity.common', col: '#63c74d', dark: '#265c42', mult: 1 },
    { id: 1, key: 'rare', nameKey: 'rarity.rare', col: '#2ce8f5', dark: '#0099db', mult: 2 },
    { id: 2, key: 'epic', nameKey: 'rarity.epic', col: '#c65197', dark: '#7a367b', mult: 3.6 },
    { id: 3, key: 'legendary', nameKey: 'rarity.legendary', col: '#fee761', dark: '#feae34', mult: 6.5 },
    { id: 4, key: 'ultra', nameKey: 'rarity.ultra', col: '#ff6b6b', dark: '#a22633', mult: 11 },
  ];

  // =====================================================================
  // PLAYER BASE + ACCOUNT LEVEL
  // =====================================================================
  D.BASE = { hp: 100, atk: 10, shd: 50, critDmg: 2, dashCd: 1.35, magnet: 28 /* logical px */ };
  D.LEVEL_BONUS = 0.03;                                    // +3% atk/hp/shd per account level
  D.xpForLevel = l => Math.round(120 * Math.pow(l, 1.55)); // XP from level l to l+1 (same as v3: xp carries over)
  D.levelFromXp = xp => { let l = 1; xp = Math.max(0, xp || 0); while (xp >= D.xpForLevel(l) && l < 999) { xp -= D.xpForLevel(l); l++; } return { lvl: l, into: xp, need: D.xpForLevel(l) }; };

  // =====================================================================
  // 6.1 SHIPS
  // mult: base multipliers; perk.mods are applied by computeStats, perk.flags are for the engine.
  // =====================================================================
  D.SHIP_UP = {
    per: 0.04,                                  // +4% to multipliers per level
    maxLvl: r => 10 + 10 * r,                   // 10/20/30/40/50
    base: [500, 1500, 4000, 10000, 25000],      // cost of level 1->2 by rarity
    growth: [1.15, 1.13, 1.11, 1.09, 1.08],
    cost: (r, lvl) => Math.round(D.SHIP_UP.base[r] * Math.pow(D.SHIP_UP.growth[r], lvl - 1)),
  };
  const ship = (id, r, price, hp, atk, shd, rate, speed, perk) => ({
    id, r, price, nameKey: 'ship.' + id + '.name', perkKey: 'ship.' + id + '.perk', sprite: 'ship_' + id,
    mult: { hp, atk, shd, rate, speed }, perk,
  });
  D.SHIPS = [
    ship('vanator', 0, 0, 1.00, 1.00, 1.00, 1.00, 1.00, { id: 'balanced', mods: { regen: 0.10 } }),
    ship('scorpion', 0, 2500, 0.95, 1.05, 0.95, 1.00, 1.15, { id: 'fast', mods: { speed: 0.10 } }),
    ship('falcon', 0, 4000, 0.95, 1.08, 1.00, 1.00, 1.00, { id: 'crit', mods: { crit: 0.10 } }),
    ship('dart', 0, 6000, 0.85, 1.10, 0.90, 1.05, 1.25, { id: 'light', mods: { dashCd: -0.15 } }),
    ship('nova', 1, 15000, 1.30, 1.35, 1.30, 1.10, 1.05, { id: 'energy', mods: { rate: 0.15 } }),
    ship('vortex', 1, 18000, 1.30, 1.30, 1.60, 1.00, 1.00, { id: 'shield', mods: { shd: 0.25, regen: 0.20 } }),
    ship('lynx', 1, 21000, 1.20, 1.40, 1.25, 1.05, 1.15, { id: 'agile', mods: { dashCd: -0.35 } }),
    ship('comet', 1, 25000, 1.30, 1.35, 1.30, 1.05, 1.05, { id: 'crystals', mods: { cr: 0.15 } }),
    ship('fregata', 2, 50000, 2.30, 1.75, 1.90, 0.95, 0.92, { id: 'heavy', mods: { hp: 0.30 } }),
    ship('aegis', 2, 58000, 1.90, 1.75, 2.40, 1.00, 0.95, { id: 'tank', mods: { shd: 0.40, regen: 0.30 } }),
    ship('specter', 2, 66000, 1.60, 1.95, 1.70, 1.05, 1.10, { id: 'evasion', mods: { crit: 0.15 }, flags: { evasion: 0.10 } }),
    ship('raptor', 2, 75000, 1.80, 2.10, 1.80, 1.10, 1.00, { id: 'dps', mods: { atk: 0.20 } }),
    ship('umbra', 3, 130000, 2.20, 2.60, 2.30, 1.10, 1.12, { id: 'stealth', mods: { crit: 0.20, critDmg: 0.5 }, flags: { stealth: true } }),
    ship('solaris', 3, 150000, 2.40, 2.80, 2.40, 1.05, 1.00, { id: 'power', mods: { atk: 0.30 } }),
    ship('valkyrie', 3, 170000, 2.60, 2.60, 2.60, 1.10, 1.05, { id: 'allround', mods: { atk: 0.12, hp: 0.12, shd: 0.12, rate: 0.12 } }),
    ship('tempest', 3, 190000, 2.30, 2.60, 2.30, 1.35, 1.05, { id: 'firerate', mods: { rate: 0.30 } }),
    ship('imperial', 4, 320000, 3.40, 3.30, 3.40, 1.15, 1.05, { id: 'imperial', mods: { atk: 0.18, hp: 0.18, shd: 0.18, cr: 0.10 } }),
    ship('eclipse', 4, 360000, 3.00, 3.60, 3.00, 1.15, 1.10, { id: 'eclipse', mods: { crit: 0.25, atk: 0.15 } }),
    ship('phoenix', 4, 400000, 3.30, 3.40, 3.30, 1.15, 1.05, { id: 'rebirth', mods: {}, flags: { autoRevive: 1 } }),
    ship('oblivion', 4, 450000, 3.00, 4.20, 3.00, 1.25, 1.05, { id: 'maxdps', mods: { atk: 0.40, rate: 0.20 } }),
  ];

  // =====================================================================
  // 6.2 WEAPONS (one equipped). dmg = multiplier of ship atk per projectile, rate = shots/s.
  // power = effective dps factor used for the power rating (accounts for pierce/aoe/cone).
  // =====================================================================
  D.WEAPON_UP = {
    per: 0.05, maxLvl: 30,
    base: [600, 1500, 3500, 8000, 18000], growth: 1.15,
    cost: (r, lvl) => Math.round(D.WEAPON_UP.base[r] * Math.pow(D.WEAPON_UP.growth, lvl - 1)),
  };
  D.WEAPONS = [
    { id: 'laser', r: 0, price: 0, dmg: 1.0, rate: 5.0, speed: 420, pierce: 0, power: 5.0, sfx: 'shoot_laser',
      evo: { id: 'prism', split: 3, splitDmg: 0.5 } },
    { id: 'plasma', r: 1, price: 8000, dmg: 2.2, rate: 1.8, speed: 200, pierce: 3, power: 6.5, sfx: 'shoot_plasma',
      evo: { id: 'nova_orb', explodeR: 28, explodeDmg: 1.2 } },
    { id: 'flame', r: 1, price: 10000, dmg: 0.35, rate: 12, speed: 160, range: 70, cone: 0.5, dot: { dps: 0.4, dur: 2 }, power: 7.0, sfx: 'shoot_flame',
      evo: { id: 'inferno', range: 100, cone: 0.8, dot: { dps: 0.8, dur: 3 } } },
    { id: 'missile', r: 2, price: 20000, dmg: 1.8, rate: 2.0, speed: 220, homing: 3.5, aoe: 24, power: 7.5, sfx: 'shoot_missile',
      evo: { id: 'swarm', count: 3 } },
    { id: 'rail', r: 3, price: 45000, dmg: 6.0, rate: 0.7, speed: 900, charge: 0.6, pierce: 99, power: 9.0, sfx: 'shoot_rail',
      evo: { id: 'annihilator', chain: 3, chainDmg: 0.6 } },
  ];
  for (const w of D.WEAPONS) { w.nameKey = 'wpn.' + w.id + '.name'; w.descKey = 'wpn.' + w.id + '.desc'; w.sprite = 'wpn_' + w.id; w.proj = 'proj_' + w.id; w.evo.nameKey = 'wpn.' + w.evo.id + '.name'; w.evo.proj = 'proj_' + w.id + '_evo'; w.evo.card = 'evo_' + w.id; }

  // =====================================================================
  // 6.3 TURRETS & COMPANIONS
  // =====================================================================
  D.TURRET_UP = { per: 0.08, maxLvl: 20, costFrac: 0.25, growth: 1.18 };
  D.TURRETS = [
    { id: 'pulse', r: 0, price: 3000, count: 1, dmg: 0.35, rate: 2.5, kind: 'laser', power: 0.9 },
    { id: 'rocket', r: 1, price: 9000, count: 1, dmg: 1.0, rate: 0.8, kind: 'missile', aoe: 20, power: 1.4 },
    { id: 'arc', r: 2, price: 20000, count: 1, dmg: 0.5, rate: 1.4, kind: 'chain', chain: 3, power: 2.1 },
    { id: 'beam', r: 3, price: 40000, count: 1, dmg: 0.25, rate: 10, kind: 'beam', power: 3.0 },
  ];
  for (const t of D.TURRETS) { t.nameKey = 'tur.' + t.id + '.name'; t.descKey = 'tur.' + t.id + '.desc'; t.sprite = 'tur_' + t.id; t.icon = 'icon_tur_' + t.id; }
  D.COMP_UP = { base: 2 / 3, per: 0.03, maxLvl: 20, costFrac: 0.25, growth: 1.18 }; // dmg frac = 2/3 * (1 + 3%*(lvl-1))
  D.COMPANIONS = [
    { id: 'wing', r: 0, price: 4000, guns: 1 },
    { id: 'orb', r: 1, price: 12000, guns: 1, homing: true },
    { id: 'guardian', r: 2, price: 26000, guns: 2, regenAura: 0.30 },
    { id: 'phantom', r: 3, price: 50000, guns: 1, pierce: true, crit: 0.15 },
  ];
  for (const c of D.COMPANIONS) { c.nameKey = 'comp.' + c.id + '.name'; c.descKey = 'comp.' + c.id + '.desc'; c.sprite = 'comp_' + c.id; c.icon = 'icon_comp_' + c.id; }

  // =====================================================================
  // 6.4 GEAR
  // main value = base * rarity.mult * q * (1 + 0.12*(lvl-1)); secondary = main * sec[k]
  // =====================================================================
  D.GEAR_SLOTS = [
    { id: 'armor', main: 'hp', base: 30, nameKey: 'gear.slot.armor' },          // +hp flat
    { id: 'gen', main: 'shd', base: 18, nameKey: 'gear.slot.gen' },             // +shield flat
    { id: 'core', main: 'cr', base: 5, sec: { xp: 0.6 }, nameKey: 'gear.slot.core' },          // % crystals, % xp
    { id: 'boost', main: 'speed', base: 3, sec: { dashCd: 0.8, crit: 0.5 }, nameKey: 'gear.slot.boost' }, // % speed, % dash cd reduction, % crit
  ];
  D.GEAR = {
    lvlPer: 0.12,
    maxLvl: r => 5 * (r + 1),
    upCost: (r, lvl) => Math.round(150 * D.RARITY[r].mult * Math.pow(1.3 - 0.025 * r, lvl - 1)), // flatter growth for long rarity ladders
    sellValue: (r, lvl) => Math.round(200 * D.RARITY[r].mult * (1 + 0.3 * (lvl - 1))), // 5x v2
    extrasByRarity: [0, 1, 1, 2, 3],
    setChance: [0, 0.15, 0.30, 0.50, 0.70],
    qRange: [0.9, 1.1],
  };
  D.EXTRA_STATS = [ // random extra stats (percent unless noted)
    { id: 'crit', base: 2, statKey: 'stat.crit' },
    { id: 'rate', base: 3, statKey: 'stat.rate' },
    { id: 'xp', base: 5, statKey: 'stat.xp' },
    { id: 'regen', base: 6, statKey: 'stat.regen' },
    { id: 'magnet', base: 3, statKey: 'stat.magnet' }, // logical px
  ];
  D.extraValue = (e, r, lvl) => e.q * D.EXTRA_STATS.find(x => x.id === e.id).base * (1 + 0.6 * r) * (1 + 0.08 * (lvl - 1));
  D.SETS = [
    { id: 'titan', nameKey: 'set.titan.name', b2: { hpPct: 0.10 }, b4: { hpPct: 0.20, regen: 0.25 } },
    { id: 'fantoma', nameKey: 'set.fantoma.name', b2: { crit: 0.08 }, b4: { speed: 0.15, dashCd: -0.20 } },
    { id: 'tezaur', nameKey: 'set.tezaur.name', b2: { cr: 0.15 }, b4: { cr: 0.30, xp: 0.20 } },
  ]; // bonuses are cumulative: 4 pieces get b2 + b4
  // name list: GEAR_NAMES[slot][rarity] = array of i18n keys; item.nameKey picks one
  D.GEAR_NAMES = {};
  for (const s of D.GEAR_SLOTS) D.GEAR_NAMES[s.id] = D.RARITY.map((_, r) => ['a', 'b'].map(x => 'gear.name.' + s.id + '.' + r + '.' + x));
  D.gearSprite = (slot, r) => 'gear_' + slot + '_' + r;

  // =====================================================================
  // 6.7 CONSUMABLES
  // =====================================================================
  D.CONS_MAX_TYPES = 3; D.CONS_MAX_UNITS = 3; D.CONS_STOCK_MAX = 99;
  D.CONSUMABLES = [
    { id: 'mine', price: 600, cd: 3, bossDmgCap: 0.30 },
    { id: 'shield', price: 450, cd: 3, dur: 10 },
    { id: 'magnet', price: 300, cd: 3, dur: 15 },
    { id: 'x2', price: 900, cd: 3, dur: 30, mult: 2 },
    { id: 'repair', price: 500, cd: 3, heal: 0.5 },
  ];
  for (const c of D.CONSUMABLES) { c.nameKey = 'cons.' + c.id + '.name'; c.descKey = 'cons.' + c.id + '.desc'; c.sprite = 'cons_' + c.id; }

  // =====================================================================
  // CHESTS (index = rarity). w = item rarity weights. cons = random consumable units (epic+).
  // =====================================================================
  D.CHESTS = [
    { r: 0, price: 1500, items: 1, w: [75, 22, 3, 0, 0], bonusCr: [200, 500], cons: 0 },
    { r: 1, price: 5000, items: 2, w: [25, 55, 17, 3, 0], bonusCr: [600, 1400], cons: 0 },
    { r: 2, price: 12000, items: 3, w: [0, 40, 50, 9.5, 0.5], bonusCr: [1500, 3000], cons: 1 },
    { r: 3, price: 30000, items: 4, w: [0, 0, 55, 42, 3], bonusCr: [4000, 8000], cons: 2 },
    { r: 4, price: 70000, items: 5, w: [0, 0, 0, 70, 30], bonusCr: [10000, 18000], cons: 3 },
  ];
  for (const c of D.CHESTS) { c.nameKey = 'chest.' + c.r + '.name'; c.sprite = 'chest_' + c.r; c.openSprite = 'chest_open_' + c.r; }
  D.PITY = { after: 10, minChest: 2, guarantee: 3 }; // after 10 epic+ chests w/o legendary+, next epic+ chest gives a legendary item

  // =====================================================================
  // 6.8 CARDS. val = effect per level (engine interprets by id).
  // =====================================================================
  const card = (id, max, w, val, extra) => Object.assign({ id, max, w, val, nameKey: 'card.' + id + '.name', descKey: 'card.' + id + '.desc', sprite: 'card_' + id }, extra || {});
  D.CARDS = [
    card('dmg', 10, 10, 0.15), card('rate', 8, 10, 0.12), card('gun', 3, 6, 1), card('pierce', 2, 4, 1),
    card('bounce', 2, 5, 1), card('missile', 4, 6, 1), card('orbit', 4, 6, 1), card('shield', 5, 8, 0.30),
    card('heal', 99, 7, 0.40), card('magnet', 3, 5, 0.5), card('speed', 4, 6, 0.10), card('crit', 5, 7, 0.08), card('vamp', 3, 4, 0.01),
  ];
  for (const w of D.WEAPONS) D.CARDS.push(card('evo_' + w.id, 5, 5, 0.08, { weapon: w.id, evo: w.evo.id }));
  D.runXpFor = lvl => Math.round(18 + lvl * 9 + Math.pow(lvl, 1.6) * 2);
  D.rerollCost = n => n <= 0 ? 0 : 50 * Math.pow(2, n - 1); // n = reroll index within this level-up (0 = free)

  // =====================================================================
  // 6.5 ENEMIES. from = first sector, to = retired at this sector (exclusive), w = spawn weight.
  // hp/dmg are base (sector 0) values; engine multiplies hp by D.sectorScale(s).hp.
  // =====================================================================
  // Pacing (owner, 3.0 integration): points x1.3 so an average player meets the mini-boss at ~1 min and the first boss at ~2 min.
  D.POINTS_MULT = 1.3;
  const en = (id, size, hp, dmg, speed, points, cr, xp, from, to, beh, w, extra) => Object.assign({ id, size, hp, dmg, speed, points: Math.round(points * D.POINTS_MULT), cr, xp, from, to, beh, w, nameKey: 'en.' + id + '.name', sprite: 'en_' + id }, extra || {});
  D.ENEMIES = [
    en('drone', 16, 18, 12, 70, 110, 12, 2, 0, 1, 'drift', 5),
    en('dart', 16, 14, 14, 130, 140, 14, 2, 0, 2, 'dive', 4),
    en('mine', 16, 30, 22, 40, 160, 16, 3, 0, 3, 'mine', 3, { explodeR: 22 }),
    en('hunter', 24, 45, 16, 100, 180, 24, 4, 1, 4, 'chase', 4),
    en('gunner', 24, 60, 12, 35, 200, 26, 4, 1, 99, 'gunner', 3, { bullet: 'eb_small', fireRate: 0.6, bulletSpeed: 90 }),
    en('splitter', 32, 110, 22, 40, 240, 34, 6, 2, 99, 'split', 3, { splitInto: 'shard', splitN: 3 }),
    en('shard', 16, 20, 12, 120, 60, 6, 1, 99, 99, 'chase', 0),
    en('charger', 24, 80, 32, 60, 250, 36, 6, 2, 99, 'charge', 3, { dashSpeed: 320, windup: 0.8 }),
    en('sentinel', 32, 160, 26, 25, 300, 44, 8, 3, 99, 'beam', 2, { bullet: 'eb_beam', charge: 1.2, beamDur: 0.8 }),
    en('wraith', 24, 90, 20, 110, 290, 42, 8, 3, 99, 'cloak', 3, { cloak: 1.5 }),
    en('carrier', 40, 260, 18, 25, 380, 60, 11, 4, 99, 'carrier', 2, { spawn: 'mini', spawnN: 3, spawnCd: 4 }),
    en('mini', 12, 10, 8, 160, 30, 1, 1, 99, 99, 'swarm', 0),
    en('bulwark', 40, 300, 24, 30, 400, 62, 12, 4, 99, 'shielded', 2, { frontShield: 0.8 }),
    en('artillery', 32, 220, 30, 30, 420, 70, 13, 5, 99, 'lob', 2, { bullet: 'eb_big', fireRate: 0.35, aoe: 20 }),
  ];
  D.ENEMY_MAX = 20;
  D.targetCount = s => Math.min(20, 8 + 2 * s);
  D.respawnDelay = [0.5, 1.0];
  D.sectorScale = s => ({ hp: 1 + 0.08 * s, dmg: 1 + 0.05 * s }); // small, linear (no infinite exp scaling)
  D.ELITE = { from: 5, chance: s => Math.min(0.35, 0.15 + 0.02 * (s - 5)), hp: 2.5, dmg: 1.4, points: 3, cr: 3, xp: 3 };
  D.rosterFor = s => D.ENEMIES.filter(e => e.w > 0 && s >= e.from && s < e.to);

  // =====================================================================
  // 6.6 BOSSES, MINI-BOSSES, EVENTS, BIOMES
  // =====================================================================
  D.BOSS_EVERY = 50000; D.MBOSS_FIRST = 25000;
  D.BOSSES = [
    { id: 'colos', sprite: 'boss_colos', hp: 3600, dmg: 18, contact: 30, points: 5000, cr: 2000, chest: 0,
      phases: [['aimed', 'gapRing', 'aimed', 'sweep'], ['aimed', 'gapRing', 'sweep', 'mines'], ['sweep', 'aimed', 'ram', 'gapRing', 'mines']] },
    { id: 'nucleu', sprite: 'boss_nucleu', hp: 11000, dmg: 20, contact: 32, points: 7500, cr: 3000, chest: 0,
      phases: [['spiral', 'orbs', 'aimed'], ['spiral', 'orbs', 'blink', 'gapRing'], ['blink', 'spiral', 'orbs', 'sweep', 'blink']] },
    { id: 'leviatan', sprite: 'boss_leviatan', hp: 40000, dmg: 22, contact: 40, points: 10000, cr: 4000, chest: 1,
      phases: [['ram', 'aimed', 'gapRing'], ['ram', 'sweep', 'mines', 'aimed'], ['ram', 'sweep', 'ram', 'spiral', 'mines']] },
    { id: 'stup', sprite: 'boss_stup', hp: 100000, dmg: 24, contact: 36, points: 12500, cr: 5000, chest: 1,
      phases: [['orbs', 'mines', 'aimed'], ['orbs', 'spiral', 'mines', 'gapRing'], ['spiral', 'orbs', 'mines', 'sweep', 'aimed']] },
    { id: 'imparat', sprite: 'boss_imparat', hp: 240000, dmg: 26, contact: 45, points: 15000, cr: 7000, chest: 2,
      phases: [['aimed', 'sweep', 'blink'], ['blink', 'spiral', 'gapRing', 'sweep'], ['blink', 'ram', 'spiral', 'orbs', 'sweep', 'mines']] },
  ];
  for (const b of D.BOSSES) { b.nameKey = 'boss.' + b.id + '.name'; b.subKey = 'boss.' + b.id + '.sub'; }
  D.BOSS_LOOP_HP = 1.6;  // each full loop of 5 bosses: hp x1.6
  D.bossFor = i => { // i = boss index (0-based, = sector at the time)
    const b = D.BOSSES[i % D.BOSSES.length], loop = Math.floor(i / D.BOSSES.length);
    return Object.assign({}, b, { index: i, loop, hp: Math.round(b.hp * Math.pow(D.BOSS_LOOP_HP, loop)), dmg: Math.round(b.dmg * (1 + 0.15 * loop)),
      cr: Math.round(b.cr * (1 + 0.5 * loop)), chest: Math.min(3, b.chest + loop) });
  };
  D.bossScore = i => (i + 1) * D.BOSS_EVERY;
  D.MBOSSES = [
    { id: 1, sprite: 'mboss_1', hp: 800, dmg: 16, points: 2000, cr: 600, chest: null, attacks: ['aimed', 'gapRing'] },
    { id: 2, sprite: 'mboss_2', hp: 1200, dmg: 18, points: 2500, cr: 800, chest: null, attacks: ['spiral', 'mines'] },
    { id: 3, sprite: 'mboss_3', hp: 1600, dmg: 20, points: 3000, cr: 1000, chest: 0, attacks: ['ram', 'aimed', 'orbs'] },
  ];
  for (const m of D.MBOSSES) m.nameKey = 'mboss.' + m.id + '.name';
  D.mbossFor = i => { const m = D.MBOSSES[i % 3]; const k = 1 + 0.45 * i; return Object.assign({}, m, { index: i, hp: Math.round(m.hp * k), cr: Math.round(m.cr * (1 + 0.3 * i)), chest: m.chest == null ? null : Math.min(2, m.chest + Math.floor(i / 6)) }); }; // chest null = no chest
  D.mbossScore = i => D.MBOSS_FIRST + i * D.BOSS_EVERY;   // 25k, 75k, 125k...
  D.MBOSS_SPAWN_FACTOR = 0.5;                             // regular target count halves during a mini-boss
  D.EVENTS = [
    { id: 'asteroids', dur: 20, rocks: 14, rockHp: 40, rockDmg: 20 },
    { id: 'ionstorm', dur: 20, noRegen: true, flicker: true },
    { id: 'blackhole', dur: 20, pull: 55, radius: 90 },
  ];
  for (const e of D.EVENTS) { e.nameKey = 'event.' + e.id + '.name'; e.descKey = 'event.' + e.id + '.desc'; }
  D.EVENT_INTERVAL = [40, 55];   // something happens about every minute: event ~0:30, mini-boss ~1:00, event ~1:30, boss ~2:00
  D.EVENT_FIRST = [26, 34];
  D.BIOMES = [
    { id: 'nebula', music: 'nebula', accent: '#c65197' },
    { id: 'asteroid', music: 'asteroid', accent: '#feae34' },
    { id: 'ion', music: 'ion', accent: '#2ce8f5' },
    { id: 'station', music: 'station', accent: '#63c74d' },
  ];
  for (const b of D.BIOMES) { b.nameKey = 'biome.' + b.id + '.name'; b.bg = [1, 2, 3, 4].map(n => 'bg_' + b.id + '_' + n); }
  D.biomeFor = s => D.BIOMES[s % D.BIOMES.length];

  // =====================================================================
  // RUN DROPS & REVIVE
  // =====================================================================
  D.DROPS = {
    starChance: 0.55,          // per kill: xp star
    crystalSplit: 3,           // crystals of an enemy split into up to N pickups
    repairChance: 0.012,       // per kill
    supernovaChance: 0.004,    // per kill (screen nuke pickup)
    eliteChestChance: 0.05,    // elite kill drops a common chest
  };
  D.REVIVE = { max: 3, cost: (sector, used) => Math.round(400 * (used + 1) * (1 + 0.6 * sector)) };

  // =====================================================================
  // ACHIEVEMENTS (15 families x bronze/silver/gold = 45)
  // stat: 'kills' etc = save.stats.<stat>; special: best, level, shipsOwned
  // reward: { cr, chest?: rarity }
  // =====================================================================
  D.ACH_TIERS = ['bronze', 'silver', 'gold'];
  const fam = (id, stat, goals, crs, chests) => goals.map((g, i) => ({
    id: id + '_' + 'bsg'[i], fam: id, tier: i, tierKey: 'tier.' + D.ACH_TIERS[i], stat, goal: g,
    nameKey: 'ach.' + id + '.name', descKey: 'ach.' + id + '.desc',
    reward: Object.assign({ cr: crs[i] }, chests[i] != null ? { chest: chests[i] } : {}),
  }));
  D.ACHIEVEMENTS = [].concat(
    fam('kills', 'kills', [500, 5000, 50000], [2000, 8000, 30000], [null, 1, 2]),
    fam('boss', 'bosses', [1, 10, 50], [3000, 12000, 40000], [null, 2, 3]),
    fam('score', 'best', [50000, 150000, 300000], [3000, 12000, 40000], [null, 1, 3]),
    fam('sector', 'maxSector', [2, 4, 6], [4000, 15000, 45000], [null, 2, 3]),
    fam('runs', 'runs', [10, 50, 200], [2000, 8000, 25000], [null, 1, 2]),
    fam('combo', 'maxCombo', [15, 40, 100], [1500, 6000, 20000], [null, 1, 2]),
    fam('time', 'playtime', [3600, 18000, 72000], [2000, 8000, 25000], [null, 1, 2]),
    fam('rich', 'crEarned', [50000, 500000, 5000000], [3000, 15000, 50000], [null, 1, 3]),
    fam('level', 'level', [10, 25, 50], [3000, 12000, 40000], [null, 2, 3]),
    fam('fleet', 'shipsOwned', [3, 8, 20], [2500, 15000, 60000], [null, 2, 4]),
    fam('chests', 'chestsOpened', [5, 50, 250], [2000, 8000, 25000], [null, 1, 2]),
    fam('merge', 'merges', [1, 20, 100], [1500, 8000, 25000], [null, 1, 3]),
    fam('evo', 'evos', [1, 10, 50], [2000, 8000, 25000], [null, 1, 2]),
    fam('missions', 'missions', [5, 30, 150], [2000, 10000, 30000], [null, 1, 3]),
    fam('stars', 'stars', [1000, 20000, 200000], [1500, 6000, 20000], [null, 1, 2]),
  );
  // v3 achievement ids -> v4 ids marked as claimed on migration (prevents double reward)
  D.ACH_V3_MAP = { k1000: 'kills_b', k10000: 'kills_s', b1: 'boss_b', b10: 'boss_s', s50k: 'score_b', s250k: 'score_s', lvl10: 'level_b', lvl25: 'level_s', ships3: 'fleet_b', combo15: 'combo_b' };

  // =====================================================================
  // DAILY MISSIONS (3 per day: one easy, one medium, one hard) + login rewards + offline
  // mode 'sum' = progress accumulates; 'max' = best value in a single run
  // =====================================================================
  D.MISSIONS = [
    { id: 'kills', ev: 'kills', mode: 'sum', goals: [300, 700, 1500] },
    { id: 'bosses', ev: 'bosses', mode: 'sum', goals: [1, 2, 4] },
    { id: 'stars', ev: 'stars', mode: 'sum', goals: [200, 500, 1200] },
    { id: 'crystals', ev: 'crystals', mode: 'sum', goals: [5000, 12000, 30000] },
    { id: 'runs', ev: 'runs', mode: 'sum', goals: [2, 4, 7] },
    { id: 'combo', ev: 'combo', mode: 'max', goals: [15, 30, 60] },
    { id: 'sector', ev: 'sector', mode: 'max', goals: [1, 2, 3] },
    { id: 'mboss', ev: 'mbosses', mode: 'sum', goals: [1, 2, 4] },
    { id: 'cards', ev: 'cards', mode: 'sum', goals: [10, 25, 50] },
    { id: 'cons', ev: 'consUsed', mode: 'sum', goals: [2, 5, 10] },
    { id: 'dash', ev: 'dashes', mode: 'sum', goals: [40, 100, 250] },
    { id: 'upgrade', ev: 'upgrades', mode: 'sum', goals: [2, 4, 8] },
    { id: 'chest', ev: 'chestsOpened', mode: 'sum', goals: [1, 2, 4] },
    { id: 'events', ev: 'events', mode: 'sum', goals: [1, 3, 6] },
  ];
  for (const m of D.MISSIONS) m.descKey = 'mission.' + m.id + '.desc';
  D.MISSION_REWARD = [{ cr: 800 }, { cr: 1500 }, { cr: 2500, chest: 1 }];
  D.MISSION_BONUS = { cr: 1500, chest: 0 }; // all 3 done
  D.DAILY = [ // 7-day login cycle, repeats; streak resets if a day is missed
    { cr: 1000 }, { cr: 1500 }, { cr: 2000, cons: { repair: 1 } }, { cr: 3000 },
    { cr: 4000, chest: 1 }, { cr: 5000, cons: { x2: 1 } }, { cr: 8000, chest: 2 },
  ];
  D.OFFLINE = { capH: 8, minMin: 10, perHour: [800, 1300, 1900, 2600, 3400, 4300, 5200], perHourExtra: 900 };
  D.offlineRate = s => s < D.OFFLINE.perHour.length ? D.OFFLINE.perHour[s] : D.OFFLINE.perHour[D.OFFLINE.perHour.length - 1] + D.OFFLINE.perHourExtra * (s - D.OFFLINE.perHour.length + 1);

  // =====================================================================
  // POWER rating (shown in UI, used by balance sim)
  // =====================================================================
  D.POWER = { dps: 4, hp: 0.5, shd: 0.5 };

  NC.DATA = D;
})(window.NC = window.NC || {});
