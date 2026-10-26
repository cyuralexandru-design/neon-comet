'use strict';
// Neon Comet 3.1 - game data tables (DATA agent; 3.1 balance/economy changes are marked '3.1'). Pure data + tiny pure helpers, no DOM.
// All user-facing names are i18n keys (NC.t). All numbers used by systems/engine live here.
(function (NC) {
  NC.VERSION = '4.0.0';

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
  // 3.1: colours = palette B (SPEC-31 §1 --r0..--r4); dark = 50% shade (frames, bands), deep = ~32% (card backgrounds)
  D.RARITY = [
    { id: 0, key: 'common', nameKey: 'rarity.common', col: '#78a86c', dark: '#3c5436', deep: '#263623', mult: 1 },
    { id: 1, key: 'rare', nameKey: 'rarity.rare', col: '#5f93bd', dark: '#304a5f', deep: '#1e2f3c', mult: 2 },
    { id: 2, key: 'epic', nameKey: 'rarity.epic', col: '#9a78b8', dark: '#4d3c5c', deep: '#31263b', mult: 3.6 },
    { id: 3, key: 'legendary', nameKey: 'rarity.legendary', col: '#d6a35a', dark: '#6b522d', deep: '#44341d', mult: 6.5 },
    { id: 4, key: 'ultra', nameKey: 'rarity.ultra', col: '#c0645c', dark: '#60322e', deep: '#3d201d', mult: 11 },
  ];
  D.rarityCol = r => (D.RARITY[r] || D.RARITY[0]).col;

  // =====================================================================
  // 3.3 RARITY BY LEVEL (SPEC-33 C): every hangar item (ship, weapon, turret, companion, secondary, gear) goes to level 50.
  // base rarity r = starting tier; tier = max(r, tierFromLevel(lvl)); lvl 1-9 Common, 10-19 Rare, 20-29 Epic, 30-39 Legendary,
  // 40-50 Ultra. Each tier above the base gives +15% (tierMult) on top of the normal per-level bonus.
  // Upgrade cost of lvl -> lvl+1 = base[r] * upCurve(lvl) (one curve for all kinds, ~x150 at lvl 49, sum to 50 ~ x1950).
  // =====================================================================
  // 4.0 (SPEC-40 §3): LEVEL IS PER CATEGORY (ship, weapon, secondary, turret, comp, armor, gen, core, boost; + crew in story).
  // Level 1..150, tier from level: 1-29 Common, 30-59 Rare, 60-89 Epic, 90-119 Legendary, 120-150 Ultra. Every item of the
  // category shows the category tier. Each tier gives +15% (tierMult) on top of the per-level bonus. baseR args are ignored now
  // (kept so old callers keep working).
  D.MAX_LVL = 150;
  D.OLD_MAX_LVL = 50;                       // v4 save scale (migration maps old 50 -> 150)
  D.CAT_TIER_AT = [1, 30, 60, 90, 120];
  D.TIER_STEP = 0.15;
  D.tierFromLevel = l => Math.max(0, Math.min(4, Math.floor((l || 0) / 30)));
  D.tierFor = (baseR, lvl) => D.tierFromLevel(lvl);
  D.tierMult = (baseR, lvl) => 1 + D.TIER_STEP * D.tierFromLevel(lvl);
  D.nextTierLvl = (baseR, lvl) => { const t = D.tierFromLevel(lvl); return t >= 4 ? null : D.CAT_TIER_AT[t + 1]; };
  D.upCurve = l => (1 + 0.22 * (l - 1)) * Math.pow(1.055, l - 1);   // 3.3 curve, unused by 4.0 costs (kept for tools)

  // ---- 4.0 ORES: one per category (art 11_ores.png order). col = UI accent.
  D.ORES = [
    { id: 'ore_armor', cat: 'armor', col: '#a89a86' }, { id: 'ore_gen', cat: 'gen', col: '#5fb8b0' },
    { id: 'ore_core', cat: 'core', col: '#e08a4a' }, { id: 'ore_boost', cat: 'boost', col: '#8fc4e8' },
    { id: 'ore_weapon', cat: 'weapon', col: '#c0504a' }, { id: 'ore_secondary', cat: 'secondary', col: '#78a86c' },
    { id: 'ore_turret', cat: 'turret', col: '#c8a55a' }, { id: 'ore_companion', cat: 'comp', col: '#9a78b8' },
    { id: 'ore_ship', cat: 'ship', col: '#c8ccd4' }, { id: 'ore_crew', cat: 'crew', col: '#e0b0e0' },
  ];
  for (const o of D.ORES) { o.nameKey = 'ore.' + o.id + '.name'; o.descKey = 'ore.' + o.id + '.desc'; o.icon = o.id; o.sprite = o.id; }
  D.CATS = ['ship', 'weapon', 'secondary', 'turret', 'comp', 'armor', 'gen', 'core', 'boost'];   // hangar categories (crew = story)
  D.CAT_ORE = {}; for (const o of D.ORES) D.CAT_ORE[o.cat] = o.id;
  D.CAT_ALIAS = { companion: 'comp', comps: 'comp', ships: 'ship', weapons: 'weapon', turrets: 'turret', booster: 'boost' };
  // upgrade cost of category level L -> L+1: ore of that category + a small crystal cost. null at 150.
  // Totals per category: to 30 = 169 ore / 3.3k cr (~3-4 days), to 60 ~ 900 ore, to 90 ~ 2.8k, to 120 ~ 6.8k, to 150 ~ 13.6k ore (months).
  D.oreCost = L => Math.round(2 + 0.15 * L + 0.0016 * Math.pow(L, 2.4));
  D.crCost = L => Math.round(30 + 3 * L + 0.03 * Math.pow(L, 2.2));
  D.catCost = L => (L >= D.MAX_LVL ? null : { ore: D.oreCost(L), cr: D.crCost(L) });
  // ore income. Run: total = (kills*k + bosses*b + mbosses*m + elites*e + sector*s) * diff * (1 + sectorK*sector), then split over the 9
  // hangar ores by weight (gear ores a bit more). Engine may instead add ores live (NC.sys.addOre) and pass r.ores to endRun.
  D.ORE_RUN = { kill: 0.04, boss: 8, mboss: 3, elite: 0.5, sector: 2, sectorK: 0.1, min: 3,
    diff: { easy: 0.7, normal: 1, hard: 1.4, nightmare: 2 },
    w: { ship: 0.8, weapon: 1, secondary: 0.9, turret: 0.9, comp: 0.9, armor: 1.1, gen: 1.1, core: 1.1, boost: 1.1 } };
  D.DUP_ORE = 12;                           // a duplicate gear variant (chest/sell) -> this much ore of its category (x (1+chest r))

  // =====================================================================
  // PLAYER BASE + ACCOUNT LEVEL
  // =====================================================================
  // regen (3.1): base shield-regen multiplier returned by computeStats().regen (engine: maxShd * 0.2/s * regen after 2.6 s
  // without damage). 0.5 = half of 3.0. Bonus regen (ship perk, sets, gear extras, guardian) is capped at +REGEN_BONUS_CAP.
  D.BASE = { hp: 100, atk: 10, shd: 50, critDmg: 2, dashCd: 1.35, magnet: 28 /* logical px */, regen: 0.5 };
  D.REGEN_BONUS_CAP = 1.0;
  D.LEVEL_BONUS = 0.03;                                    // +3% atk/hp/shd per account level
  D.xpForLevel = l => Math.round(120 * Math.pow(l, 1.55)); // XP from level l to l+1 (same as v3: xp carries over)
  D.levelFromXp = xp => { let l = 1; xp = Math.max(0, xp || 0); while (xp >= D.xpForLevel(l) && l < 999) { xp -= D.xpForLevel(l); l++; } return { lvl: l, into: xp, need: D.xpForLevel(l) }; };

  // =====================================================================
  // 6.1 SHIPS
  // mult: base multipliers; perk.mods are applied by computeStats, perk.flags are for the engine.
  // =====================================================================
  // 3.3: max 50 for every rarity; totals ~ 3.1 (r1 to 20 ~96k, r3 to 40 ~2.4M, r4 to 50 ~8.8M; r0 to 50 ~1M)
  // 4.0: per = old per x 49/149 (old lvl 50 power == new lvl 150); cost = crystal part of D.catCost (real upgrade = NC.sys.upgradeCat)
  D.SHIP_UP = {
    per: 0.0132,
    maxLvl: () => D.MAX_LVL,
    base: [500, 900, 1600, 2800, 4500],
    cost: (r, lvl) => (D.catCost(lvl) || { cr: null }).cr,
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
    per: 0.0164, maxLvl: 150,                    // 4.0 category level
    base: [600, 1000, 1600, 2600, 4000],
    cost: (r, lvl) => (D.catCost(lvl) || { cr: null }).cr,
  };
  // 3.3: 11 weapons. Fields read by the engine: dmg (x ship atk per projectile), rate (shots or bursts /s), speed, pierce,
  // plus per-weapon behaviour fields (burst, pellets, cone, chain, beam, ramp, orbit...). power = dps factor for the rating
  // (~5 at r0, ~6.5-7 at r1, ~7.5-8 at r2, ~9-9.5 at r3).
  // skill (SPEC-33 B): automatic special. every = seconds between triggers, everyShots = every Nth shot/burst, power =
  // damage as a multiple of one normal shot of the weapon (unless noted), dur = seconds. Values at weapon level 1:
  // use D.skillAt(weapon, lvl) for the scaled values (power +2%/lvl, every -0.4%/lvl, threshold +0.1%/lvl, count +1 per 10 lvl).
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
    // ---- 3.3 new weapons
    // blaster: rate = bursts/s, burst bolts each (gap s between bolts) -> 6.6 bolts/s x 0.75
    { id: 'blaster', r: 0, price: 3500, dmg: 0.75, rate: 2.2, burst: 3, burstGap: 0.07, speed: 520, pierce: 0, power: 5.4, sfx: 'shoot_laser',
      evo: { id: 'repeater', burst: 5, dmgMult: 1.1 } },
    // shotgun: pellets per shot (random pelletsMin..pellets), cone = total spread rad, range = px before pellets fade
    { id: 'shotgun', r: 1, price: 12000, dmg: 0.6, rate: 1.7, pellets: 7, pelletsMin: 5, cone: 0.6, range: 140, speed: 380, pierce: 0, power: 6.8, sfx: 'shoot_plasma',
      evo: { id: 'hailstorm', pellets: 10, pelletsMin: 8, cone: 0.85, pierce: 1 } },
    // arc: instant lightning to the nearest enemy in range, then jumps chain times (each jump chainDmg x) within chainR px
    { id: 'arc', r: 1, price: 14000, dmg: 1.1, rate: 2.4, range: 170, chain: 3, chainDmg: 0.7, chainR: 90, speed: 0, pierce: 0, power: 7.0, sfx: 'shoot_rail',
      evo: { id: 'thunder', chain: 6, chainDmg: 0.85 } },
    // wave: crescent that grows from width w0 to w1 px over its life and pierces everything (hits each enemy once)
    { id: 'wave', r: 2, price: 24000, dmg: 2.4, rate: 0.9, speed: 150, w0: 24, w1: 90, life: 1.6, pierce: 99, power: 7.8, sfx: 'shoot_plasma',
      evo: { id: 'tsunami', w1: 140, dmgMult: 1.3, life: 2.0 } },
    // drill: continuous beam (rate = damage ticks/s, dmg per tick), range px; damage ramps up to rampMax x after ramp s on the same target
    { id: 'drill', r: 3, price: 50000, dmg: 0.32, rate: 10, beam: true, range: 180, ramp: 1.5, rampMax: 3, speed: 0, pierce: 0, power: 9.2, sfx: 'shoot_rail',
      evo: { id: 'void_lance', rampMax: 5, width: 2 } },
    // swarmer: nanites orbit the ship for orbit s, then home in (homing turn rate) - rate = nanites/s
    { id: 'swarmer', r: 3, price: 55000, dmg: 0.9, rate: 6, speed: 240, orbit: 0.6, homing: 6, pierce: 0, power: 9.4, sfx: 'shoot_missile',
      evo: { id: 'hivemind', count: 2 } },
  ];
  const SKILLS = {
    laser: { id: 'overcharge', every: 8, dur: 1, power: 6, width: 14 },            // thick piercing beam, power = x shot per second
    plasma: { id: 'singularity', everyShots: 10, dur: 2, radius: 60, pull: 120, power: 0.5 }, // mini black hole, power = x shot per second inside
    flame: { id: 'firestorm', every: 9, radius: 80, power: 3, dot: { dps: 0.8, dur: 2 } },    // fire ring around the ship (one hit + burn)
    missile: { id: 'barrage', every: 7, count: 6, power: 1 },                     // count missiles at once, each power x shot
    rail: { id: 'execution', threshold: 0.15, boss: false },                       // passive: hit kills a non-boss under threshold hp
    blaster: { id: 'rapid', every: 6, dur: 2, power: 3 },                          // power = fire-rate multiplier for dur
    shotgun: { id: 'knockback', every: 8, radius: 90, push: 220, power: 4 },       // point-blank blast, push px/s impulse
    arc: { id: 'storm', every: 9, count: 6, power: 3 },                            // lightning on count random enemies on screen
    wave: { id: 'echo', everyShots: 3, count: 3, spread: 0.5, power: 0.7 },        // that wave splits in count (spread rad), each power x
    drill: { id: 'overheat', after: 2, radius: 50, power: 8 },                     // after s on the same target: explosion (aoe radius)
    swarmer: { id: 'hive', every: 10, count: 10, power: 1 },                       // count extra nanites
  };
  for (const w of D.WEAPONS) { w.skill = Object.assign({ nameKey: 'wpn.' + w.id + '.skill.name', descKey: 'wpn.' + w.id + '.skill.desc' }, SKILLS[w.id]); }
  // scaled skill for a weapon level (pure). Returns a copy; engine may use it or the raw def.skill.
  D.skillAt = (w, lvl) => {
    if (typeof w === 'string') w = D.WEAPONS.find(x => x.id === w);
    if (!w || !w.skill) return null;
    const k = Math.max(1, lvl || 1) - 1, s = JSON.parse(JSON.stringify(w.skill));
    if (s.power != null) s.power = +(s.power * (1 + 0.02 * k)).toFixed(3);
    if (s.every != null) s.every = +(s.every * (1 - 0.004 * k)).toFixed(2);
    if (s.threshold != null) s.threshold = +(s.threshold + 0.001 * k).toFixed(3);
    if (s.count != null) s.count += Math.floor(k / 10);
    return s;
  };
  // i18n vars for wpn.<id>.skill.desc: {t} seconds, {n} shots/count, {p} power % or x, {d} duration, {h} hp threshold %
  D.skillVars = (w, lvl) => {
    const s = D.skillAt(w, lvl); if (!s) return {};
    return { t: s.every != null ? s.every.toFixed(1) : s.after != null ? s.after : '', n: s.everyShots || s.count || '', p: s.power != null ? Math.round(s.power * 100) : '',
      x: s.power != null ? s.power.toFixed(1) : '', d: s.dur != null ? s.dur : '', h: s.threshold != null ? (s.threshold * 100).toFixed(1) : '' };
  };
  for (const w of D.WEAPONS) { w.nameKey = 'wpn.' + w.id + '.name'; w.descKey = 'wpn.' + w.id + '.desc'; w.sprite = 'wpn_' + w.id; w.proj = 'proj_' + w.id; w.evo.nameKey = 'wpn.' + w.evo.id + '.name'; w.evo.proj = 'proj_' + w.id + '_evo'; w.evo.card = 'evo_' + w.id; }

  // =====================================================================
  // 6.3 TURRETS & COMPANIONS
  // =====================================================================
  // 3.3: max 50; cost = base[r] * upCurve(lvl) (r3 to 20 ~374k like 3.1, to 50 ~6.8M)
  D.TURRET_UP = { per: 0.0263, maxLvl: 150, base: [700, 1300, 2200, 3500, 5000], cost: (r, lvl) => (D.catCost(lvl) || { cr: null }).cr };
  D.TURRETS = [
    { id: 'pulse', r: 0, price: 3000, count: 1, dmg: 0.35, rate: 2.5, kind: 'laser', power: 0.9 },
    { id: 'rocket', r: 1, price: 9000, count: 1, dmg: 1.0, rate: 0.8, kind: 'missile', aoe: 20, power: 1.4 },
    { id: 'arc', r: 2, price: 20000, count: 1, dmg: 0.5, rate: 1.4, kind: 'chain', chain: 3, power: 2.1 },
    { id: 'beam', r: 3, price: 40000, count: 1, dmg: 0.25, rate: 10, kind: 'beam', power: 3.0 },
  ];
  for (const t of D.TURRETS) { t.nameKey = 'tur.' + t.id + '.name'; t.descKey = 'tur.' + t.id + '.desc'; t.sprite = 'tur_' + t.id; t.icon = 'icon_tur_' + t.id; }
  D.COMP_UP = { base: 2 / 3, per: 0.0099, maxLvl: 150, costBase: [700, 1300, 2200, 3500, 5000], cost: (r, lvl) => (D.catCost(lvl) || { cr: null }).cr }; // dmg frac = 2/3 * (1 + 3%*(lvl-1)) * tierMult
  D.COMPANIONS = [
    { id: 'wing', r: 0, price: 4000, guns: 1 },
    { id: 'orb', r: 1, price: 12000, guns: 1, homing: true },
    { id: 'guardian', r: 2, price: 26000, guns: 2, regenAura: 0.30 },
    { id: 'phantom', r: 3, price: 50000, guns: 1, pierce: true, crit: 0.15 },
  ];
  for (const c of D.COMPANIONS) { c.nameKey = 'comp.' + c.id + '.name'; c.descKey = 'comp.' + c.id + '.desc'; c.sprite = 'comp_' + c.id; c.icon = 'icon_comp_' + c.id; }

  // =====================================================================
  // 3.3 SECONDARY WEAPONS (SPEC-33 D): auto-fire on their own cooldown next to the primary. One equipped (S.secondary.eq).
  // dmg = x ship atk per hit, cd = seconds between activations, power = dps factor (x atk) for the rating.
  // computeStats().secondary = { id, lvl, mult, def } (mult = level bonus x tier bonus, multiply dmg by it).
  // =====================================================================
  D.SEC_UP = { per: 0.0263, maxLvl: 150, base: [700, 1300, 2200, 3500, 5000], cost: (r, lvl) => (D.catCost(lvl) || { cr: null }).cr };
  D.SECONDARY = [
    { id: 'homing', r: 0, price: 5000, dmg: 1.2, cd: 2, count: 2, speed: 180, homing: 4, aoe: 14, power: 1.3 },        // 2 homing micro-missiles
    { id: 'mines', r: 0, price: 6000, dmg: 3.0, cd: 3, count: 1, aoe: 34, life: 8, trigger: 26, power: 1.2 },          // mine dropped behind the ship
    { id: 'tesla', r: 1, price: 14000, dmg: 1.6, cd: 1.2, count: 1, range: 150, power: 1.7 },                          // zaps the nearest enemy
    { id: 'blade', r: 2, price: 28000, dmg: 0.55, cd: 0.4, count: 2, radius: 46, spin: 3.2, power: 2.4 },              // 2 orbiting blades, cd = re-hit time per enemy
    { id: 'nova', r: 3, price: 50000, dmg: 4.0, cd: 6, count: 1, radius: 120, push: 120, power: 3.0 },                 // radial shock pulse
    { id: 'drone', r: 3, price: 60000, dmg: 0.6, cd: 0.33, count: 1, range: 200, speed: 420, power: 3.2 },             // gunship drone firing lasers
  ];
  for (const x of D.SECONDARY) { x.nameKey = 'sec.' + x.id + '.name'; x.descKey = 'sec.' + x.id + '.desc'; x.icon = 'sec_' + x.id; x.sprite = 'sec_' + x.id; }

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
    maxLvl: () => D.MAX_LVL,                     // 3.3: 5*(r+1) -> 50 for every rarity (tier follows the level)
    upCost: (r, lvl) => Math.round(150 * D.RARITY[r].mult * D.upCurve(lvl)), // r = base rarity; lvl 1-5 ~ 3.1 costs
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
  // ---- 4.0 GEAR VARIANTS (SPEC-40 §3): 4 per slot. main = {stat, base, g}: value = base * (1 + g*(L-1)) * tierMult(L), L = category
  // level (flat hp/shd/magnet px; everything else a fraction, dashCd negative = shorter). bonus[k] (k = 0..4) is active when the
  // category tier >= k. Stats: computeStats mods (atk hp shd rate speed crit critDmg dashCd regen cr xp hpPct magnet) + engine extras
  // (armor = damage taken -x, dodge = chance to ignore a hit, thorns = x of contact damage reflected, bossDmg = +x vs bosses/mini-bosses,
  // ore = +x ore from runs). hp/shd as BONUS lines are percentages (hpPct / shd), main hp/shd are flat.
  const GV = (slot, id, set, main, lines) => ({ id, slot, cat: slot, set, main, nameKey: 'gv.' + slot + '.' + id + '.name', descKey: 'gv.' + slot + '.' + id + '.desc',
    sprite: 'gear_' + slot + '_' + id, icon: 'gear_' + slot + '_' + id,
    bonus: lines.map((l, k) => ({ tier: k, stat: l[0], v: l[1], textKey: 'gstat.' + l[0] })) });
  D.GEAR_VARIANTS = {
    armor: [
      GV('armor', 'titan', 'titan', { stat: 'hp', base: 36, g: 0.08 }, [['hpPct', 0.05], ['regen', 0.10], ['hpPct', 0.08], ['armor', 0.05], ['hpPct', 0.15]]),
      GV('armor', 'reactive', 'tezaur', { stat: 'hp', base: 28, g: 0.08 }, [['thorns', 0.20], ['atk', 0.04], ['thorns', 0.40], ['critDmg', 0.20], ['atk', 0.10]]),
      GV('armor', 'crystal', 'prisma', { stat: 'hp', base: 26, g: 0.08 }, [['shd', 0.06], ['regen', 0.12], ['shd', 0.10], ['cr', 0.08], ['shd', 0.20]]),
      GV('armor', 'void', 'fantoma', { stat: 'hp', base: 24, g: 0.08 }, [['atk', 0.04], ['crit', 0.03], ['dodge', 0.03], ['bossDmg', 0.10], ['atk', 0.12]]),
    ],
    gen: [
      GV('gen', 'bastion', 'titan', { stat: 'shd', base: 22, g: 0.08 }, [['shd', 0.05], ['regen', 0.10], ['armor', 0.04], ['hpPct', 0.08], ['shd', 0.18]]),
      GV('gen', 'prism', 'prisma', { stat: 'shd', base: 18, g: 0.08 }, [['crit', 0.02], ['critDmg', 0.15], ['crit', 0.04], ['atk', 0.06], ['critDmg', 0.40]]),
      GV('gen', 'pulse', 'tezaur', { stat: 'shd', base: 16, g: 0.08 }, [['rate', 0.03], ['regen', 0.15], ['rate', 0.05], ['thorns', 0.30], ['rate', 0.10]]),
      GV('gen', 'ward', 'fantoma', { stat: 'shd', base: 20, g: 0.08 }, [['regen', 0.10], ['dodge', 0.02], ['regen', 0.15], ['armor', 0.06], ['dodge', 0.05]]),
    ],
    core: [
      GV('core', 'fusion', 'titan', { stat: 'atk', base: 0.03, g: 0.02 }, [['atk', 0.03], ['hpPct', 0.05], ['atk', 0.05], ['bossDmg', 0.08], ['atk', 0.10]]),
      GV('core', 'quantum', 'prisma', { stat: 'crit', base: 0.02, g: 0.02 }, [['critDmg', 0.10], ['rate', 0.03], ['crit', 0.03], ['critDmg', 0.25], ['crit', 0.06]]),
      GV('core', 'star', 'tezaur', { stat: 'cr', base: 0.05, g: 0.02 }, [['xp', 0.05], ['cr', 0.05], ['ore', 0.05], ['xp', 0.10], ['ore', 0.12]]),
      GV('core', 'voidr', 'fantoma', { stat: 'rate', base: 0.03, g: 0.02 }, [['atk', 0.03], ['rate', 0.03], ['bossDmg', 0.10], ['crit', 0.03], ['rate', 0.08]]),
    ],
    boost: [
      GV('boost', 'ion', 'titan', { stat: 'speed', base: 0.03, g: 0.02 }, [['dashCd', -0.05], ['speed', 0.03], ['dashCd', -0.08], ['rate', 0.04], ['speed', 0.08]]),
      GV('boost', 'after', 'fantoma', { stat: 'dashCd', base: -0.04, g: 0.02 }, [['speed', 0.03], ['dodge', 0.02], ['dashCd', -0.06], ['atk', 0.05], ['dodge', 0.04]]),
      GV('boost', 'warp', 'tezaur', { stat: 'magnet', base: 4, g: 0.02 }, [['xp', 0.05], ['magnet', 6], ['cr', 0.06], ['ore', 0.05], ['magnet', 14]]),
      GV('boost', 'phase', 'prisma', { stat: 'dodge', base: 0.02, g: 0.02 }, [['crit', 0.02], ['dashCd', -0.05], ['dodge', 0.03], ['critDmg', 0.20], ['dodge', 0.05]]),
    ],
  };
  D.GEAR_VARIANT_LIST = [].concat(D.GEAR_VARIANTS.armor, D.GEAR_VARIANTS.gen, D.GEAR_VARIANTS.core, D.GEAR_VARIANTS.boost);
  D.gearVariant = (slot, id) => (D.GEAR_VARIANTS[slot] || []).find(v => v.id === id) || null;
  D.FLAT_STATS = { hp: 1, shd: 1, magnet: 1 };   // main values that are flat (bonus lines with hp/shd are % -> hpPct / shd%)
  D.EXTRA_CAPS = { armor: 0.5, dodge: 0.35 };
  D.variantMain = (v, L) => v.main.base * (1 + v.main.g * (Math.max(1, L) - 1)) * D.tierMult(0, L);
  // UI helper: '+12%' / '+40' / '-8%' for a stat value (flat = main of hp/shd/magnet)
  D.statTxt = (stat, v, flat) => { const s = v < 0 ? '-' : '+', a = Math.abs(v); return flat ? s + Math.round(a) : s + (a * 100 >= 10 ? Math.round(a * 100) : (a * 100).toFixed(1)) + '%'; };
  // sets: 4 variants (one per slot) each; bonuses cumulative (4 pieces = b2 + b4)
  D.SETS = [
    { id: 'titan', nameKey: 'set.titan.name', b2: { hpPct: 0.10 }, b4: { hpPct: 0.15, regen: 0.25 } },
    { id: 'prisma', nameKey: 'set.prisma.name', b2: { crit: 0.05 }, b4: { critDmg: 0.30, crit: 0.05 } },
    { id: 'fantoma', nameKey: 'set.fantoma.name', b2: { dodge: 0.03 }, b4: { speed: 0.10, dashCd: -0.15, dodge: 0.03 } },
    { id: 'tezaur', nameKey: 'set.tezaur.name', b2: { cr: 0.10 }, b4: { cr: 0.20, xp: 0.15, ore: 0.10 } },
  ];
  for (const s of D.SETS) s.pieces = D.GEAR_VARIANT_LIST.filter(v => v.set === s.id).map(v => v.slot + '.' + v.id);
  // v4 -> v5: old gear (slot, extras) -> nearest variant. Picks by the item's strongest old extra stat, else the first variant.
  D.GEAR_MIGRATE = { armor: { crit: 'void', rate: 'void', xp: 'crystal', regen: 'titan', magnet: 'crystal', _: 'titan' },
    gen: { crit: 'prism', rate: 'pulse', xp: 'ward', regen: 'bastion', magnet: 'ward', _: 'bastion' },
    core: { crit: 'quantum', rate: 'voidr', xp: 'star', regen: 'fusion', magnet: 'star', _: 'star' },
    boost: { crit: 'phase', rate: 'ion', xp: 'warp', regen: 'after', magnet: 'warp', _: 'ion' } };
  // name list: GEAR_NAMES[slot][rarity] = array of i18n keys; item.nameKey picks one
  D.GEAR_NAMES = {};
  for (const s of D.GEAR_SLOTS) D.GEAR_NAMES[s.id] = D.RARITY.map((_, r) => ['a', 'b'].map(x => 'gear.name.' + s.id + '.' + r + '.' + x));
  D.gearSprite = (slot, x) => 'gear_' + slot + '_' + (typeof x === 'string' ? x : (D.GEAR_VARIANTS[slot] || [{ id: x }])[0].id); // 4.0: variant id

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
    // 3.1 economy: bonusCr / 3 (prices unchanged)
    { r: 0, price: 1500, items: 1, w: [75, 22, 3, 0, 0], bonusCr: [70, 170], cons: 0 },
    { r: 1, price: 5000, items: 2, w: [25, 55, 17, 3, 0], bonusCr: [200, 470], cons: 0 },
    { r: 2, price: 12000, items: 3, w: [0, 40, 50, 9.5, 0.5], bonusCr: [500, 1000], cons: 1 },
    { r: 3, price: 30000, items: 4, w: [0, 0, 55, 42, 3], bonusCr: [1300, 2700], cons: 2 },
    { r: 4, price: 70000, items: 5, w: [0, 0, 0, 70, 30], bonusCr: [3300, 6000], cons: 3 },
  ];
  // 4.0: items = gear variants (rarity roll only colours the reveal; a variant you own -> DUP_ORE x (1+roll) ore). ores = [min,max] total
  // extra ore split over random hangar categories.
  const CHEST_ORES = [[6, 10], [14, 22], [30, 45], [60, 90], [120, 170]];
  for (const c of D.CHESTS) c.ores = CHEST_ORES[c.r];
  for (const c of D.CHESTS) { c.nameKey = 'chest.' + c.r + '.name'; c.sprite = 'chest_' + c.r; c.openSprite = 'chest_open_' + c.r; }
  D.PITY = { after: 10, minChest: 2, guarantee: 3 }; // after 10 epic+ chests w/o legendary+, next epic+ chest gives a legendary item

  // =====================================================================
  // 6.8 CARDS. val = effect per level (engine interprets by id). r = card rarity 0..4 (SPEC-31 §2.6), w = weight inside
  // its rarity. Offers: pick by CARD_RARITY_W among the rarities that still have cards, then by w (see D.cardOfferWeights).
  // =====================================================================
  const card = (id, r, max, w, val, extra) => Object.assign({ id, r, max, w, val, nameKey: 'card.' + id + '.name', descKey: 'card.' + id + '.desc', sprite: 'card_' + id }, extra || {});
  D.CARDS = [
    // common: plain stat cards
    card('dmg', 0, 10, 10, 0.15), card('rate', 0, 8, 10, 0.12), card('speed', 0, 4, 6, 0.10), card('magnet', 0, 3, 5, 0.5),
    card('heal', 0, 99, 6, 0.25),          // 3.1: heal 40% -> 25% (+10% max hp per pick stays, engine)
    // rare: defensive stat + light utility
    card('shield', 1, 4, 8, 0.20),         // 3.1: +30% -> +20% shield, max 5 -> 4 (engine adds +25% shield regen per pick)
    card('pierce', 1, 2, 5, 1), card('bounce', 1, 2, 5, 1),
    // epic: strong utility
    card('gun', 2, 3, 6, 1), card('crit', 2, 5, 6, 0.08),
    // legendary: extra weapons + lifesteal
    card('missile', 3, 4, 6, 1), card('orbit', 3, 4, 6, 1),
    card('vamp', 3, 3, 4, 0.002),          // 3.1: 1% -> 0.2% max hp per kill (engine may also cap it per second, D.HEAL.vampPerSec)
  ];
  // evo cards: legendary, the final (evolving) level is shown as ultra (rMax). max 5 -> 3 so evolution stays reachable with
  // the slower 3.1 card rate; high w = most of the legendary share goes to the evo card of the equipped weapon.
  for (const w of D.WEAPONS) D.CARDS.push(card('evo_' + w.id, 3, 3, 14, 0.08, { weapon: w.id, evo: w.evo.id, rMax: 4 }));
  // existing cards: engine keeps its own switch(id); fx documents it
  for (const c of D.CARDS) c.fx = c.evo ? { type: 'evo' } : { type: 'legacy', id: c.id };
  // ---- 4.0 new cards (SPEC-40 §4). val = per level; fx = exact effect at card level n (engine reads fx; see NOTES/40-data.md).
  // atk = player atk (R.st.atk with run mods), hit = damage of the hit that triggered it. All chances per hit unless noted.
  D.CARDS.push(
    // attack
    card('explosive', 2, 3, 5, 0.35, { fx: { type: 'explode', radius: 18, radiusPer: 6, dmgPer: 0.35 } }),            // hit -> aoe r=18+6n px, dmg 0.35n x hit
    card('burn', 1, 4, 5, 0.15, { fx: { type: 'dot', kind: 'burn', dpsPer: 0.15, dur: 2, stacks: 1 } }),               // hit ignites 2 s, 0.15n x atk /s (refresh, no stack)
    card('freeze', 2, 3, 5, 0.08, { fx: { type: 'freeze', chancePer: 0.08, dur: 1.2, bossSlow: 0.4, bossDur: 1.2 } }), // 8n% hit freezes 1.2 s; bosses -40% speed
    card('poison', 1, 4, 5, 0.04, { fx: { type: 'dot', kind: 'poison', dpsPer: 0.04, dur: 4, stacks: 5, stacksPer: 1 } }), // +1 stack/hit (max 5+n), 0.04n x atk /s per stack
    card('chain', 2, 3, 5, 0.12, { fx: { type: 'chain', chancePer: 0.12, jumps: 2, dmg: 0.5, range: 80 } }),           // 12n% hit jumps to 2 foes (80 px) at 50%
    card('split', 2, 3, 4, 1, { fx: { type: 'split', shards: 2, shardsPer: 1, dmg: 0.4 } }),                            // kill -> (1+n) shards 40% hit dmg, random dirs
    card('giant', 1, 3, 4, 0.25, { fx: { type: 'giant', sizePer: 0.25, dmgPer: 0.08, speedPer: -0.05 } }),            // projectile size +25n%, dmg +8n%, speed -5n%
    // survival / utility
    card('armor', 0, 5, 6, 0.06, { fx: { type: 'stat', stat: 'armor', per: 0.06, cap: 0.5 } }),                        // damage taken -6n% (cap 50% with gear)
    card('shieldregen', 1, 4, 6, 0.25, { fx: { type: 'stat', stat: 'shdRegen', per: 0.25, delayPer: -0.3 } }),         // shield regen +25n%, regen delay -0.3n s (min 1 s)
    card('dodge', 2, 3, 5, 0.05, { fx: { type: 'stat', stat: 'dodge', per: 0.05, cap: 0.35 } }),                       // 5n% ignore a hit (cap 35%)
    card('dashcd', 0, 4, 5, 0.10, { fx: { type: 'stat', stat: 'dashCd', per: -0.10 } }),                               // dash cooldown x(1-0.10n) (min 0.4 total)
    card('thorns', 1, 4, 4, 0.5, { fx: { type: 'thorns', reflectPer: 0.5, minAtk: 1 } }),                              // attacker takes 0.5n x damage you took (>= 1 x atk), bullets: nearest foe
    card('crystalbonus', 0, 3, 4, 0.10, { fx: { type: 'stat', stat: 'cr', per: 0.10 } }),                             // run crystals +10n%
    card('xpboost', 0, 3, 4, 0.10, { fx: { type: 'stat', stat: 'xp', per: 0.10 } }),                                   // run xp +10n%
    card('secondwind', 3, 1, 4, 0.3, { fx: { type: 'secondwind', hp: 0.3, invuln: 2, uses: 1 } }),                      // once/run: lethal hit -> 30% hp, 2 s invulnerable
    card('dronehelper', 3, 3, 5, 1, { fx: { type: 'drone', count: 1, countPer: 1, dmg: 0.35, rate: 2, range: 160 } }),   // n drones orbiting, each 0.35 x atk, 2 shots/s
    card('overdrive', 2, 3, 5, 0.15, { fx: { type: 'overdrive', hpBelow: 0.4, dmgPer: 0.15, ratePer: 0.10 } }),        // hp < 40%: dmg +15n%, rate +10n%
  );
  // ---- 4.0 special cards (art 605): real offerable specials, max 1, low weight, only from run level minLvl. sprite card_sp_<id>.
  const sp = (id, r, w, fx) => card('sp_' + id, r, 1, w, 1, { special: true, minLvl: 6, sprite: 'card_sp_' + id, fx });
  D.CARDS.push(
    sp('chain', 3, 2, { type: 'sp_chain', every: 4, targets: 6, dmg: 2.0, range: 140 }),                               // every 4 s lightning chains through 6 foes, 2 x atk each
    sp('blackhole', 4, 2, { type: 'sp_blackhole', every: 12, dur: 3, radius: 70, pull: 140, dps: 1.0, burst: 5.0 }),     // every 12 s at densest spot: pull 3 s, 1 x atk/s, ends 5 x atk
    sp('shieldnova', 3, 2, { type: 'sp_shieldnova', cd: 8, radius: 110, dmg: 4.0, push: 200, refill: 0.3 }),            // shield breaks -> nova 4 x atk, push; refills 30% shield; cd 8 s
    sp('phoenix', 4, 2, { type: 'sp_phoenix', uses: 1, hp: 0.5, radius: 150, dmg: 10, invuln: 3 }),                     // once/run on death: revive 50% hp, blast 10 x atk, 3 s invuln
    sp('timewarp', 4, 2, { type: 'sp_timewarp', every: 20, dur: 4, slow: 0.5 }),                                       // every 20 s enemies + enemy bullets x0.5 speed for 4 s
    sp('overcharge', 3, 2, { type: 'sp_overcharge', every: 15, dur: 5, rate: 2.0, dmg: 0.30 }),                         // every 15 s for 5 s: fire rate x2, dmg +30%
    sp('vampfield', 3, 2, { type: 'sp_vampfield', radius: 80, dps: 0.6, heal: 0.01 }),                                  // aura 80 px 0.6 x atk/s; heals 1% of aura dmg (cap D.HEAL.vampPerSec)
    sp('frost', 3, 2, { type: 'sp_frost', every: 10, radius: 120, freeze: 2, dmg: 2.0, bossSlow: 0.5 }),                 // every 10 s ring: 2 x atk, freeze 2 s (bosses -50% 2 s)
  );
  D.cardById = id => D.CARDS.find(c => c.id === id) || null;
  D.CARD_RARITY_W = [46, 28, 16, 8, 2];   // Common, Rare, Epic, Legendary, Ultra (ultra: 3.2 special cards)
  D.cardRarity = (c, lvl) => (c.rMax != null && lvl >= c.max ? c.rMax : c.r); // rarity to show for the offered level
  // avail = card defs that can still be offered -> [[card, weight]]; each rarity gets CARD_RARITY_W[r] split by w,
  // rarities without available cards drop out (weights renormalise automatically in NC.weighted).
  D.cardOfferWeights = (avail) => {
    const sum = [0, 0, 0, 0, 0];
    for (const c of avail) sum[c.r || 0] += c.w || 1;
    return avail.map(c => [c, D.CARD_RARITY_W[c.r || 0] * (c.w || 1) / sum[c.r || 0]]);
  };
  // run level XP (3.1): XP comes from xp orbs (= enemy xp). Was 18+9l+2l^1.6 (L1 29, L10 188, L20 438).
  // Normal play (first boss ~2 min): first card ~30 s, then 30-60 s, 60-100 s from sector 1 on (tools/balance/pacing.js).
  D.runXpFor = lvl => Math.round(90 + 20 * lvl + 0.45 * Math.pow(lvl, 1.95));
  D.rerollCost = n => n <= 0 ? 0 : 50 * Math.pow(2, n - 1); // n = reroll index within this level-up (0 = free)

  // =====================================================================
  // 6.5 ENEMIES. from = first sector, to = retired at this sector (exclusive), w = spawn weight.
  // hp/dmg are base (sector 0) values; engine multiplies hp by D.sectorScale(s).hp.
  // =====================================================================
  // Pacing (owner, 3.0 integration): points x1.3 so an average player meets the mini-boss at ~1 min and the first boss at ~2 min.
  D.POINTS_MULT = 1.3;
  const en = (id, size, hp, dmg, speed, points, cr, xp, from, to, beh, w, extra) => Object.assign({ id, size, hp, dmg, speed, points: Math.round(points * D.POINTS_MULT), cr, xp, from, to, beh, w, nameKey: 'en.' + id + '.name', sprite: 'en_' + id }, extra || {});
  // 3.1 economy: cr = 3.0 value / 3 (mini 1 -> 0: carrier spawns give no crystals). hp/dmg/xp/points unchanged.
  D.ENEMIES = [
    en('drone', 16, 18, 12, 70, 110, 4, 2, 0, 1, 'drift', 5),
    en('dart', 16, 14, 14, 130, 140, 5, 2, 0, 2, 'dive', 4),
    en('mine', 16, 30, 22, 40, 160, 5, 3, 0, 3, 'mine', 3, { explodeR: 22 }),
    en('hunter', 24, 45, 16, 100, 180, 8, 4, 1, 4, 'chase', 4),
    en('gunner', 24, 60, 12, 35, 200, 9, 4, 1, 99, 'gunner', 3, { bullet: 'eb_small', fireRate: 0.6, bulletSpeed: 90 }),
    en('splitter', 32, 110, 22, 40, 240, 11, 6, 2, 99, 'split', 3, { splitInto: 'shard', splitN: 3 }),
    en('shard', 16, 20, 12, 120, 60, 2, 1, 99, 99, 'chase', 0),
    en('charger', 24, 80, 32, 60, 250, 12, 6, 2, 99, 'charge', 3, { dashSpeed: 320, windup: 0.8 }),
    en('sentinel', 32, 160, 26, 25, 300, 15, 8, 3, 99, 'beam', 2, { bullet: 'eb_beam', charge: 1.2, beamDur: 0.8 }),
    en('wraith', 24, 90, 20, 110, 290, 14, 8, 3, 99, 'cloak', 3, { cloak: 1.5 }),
    en('carrier', 40, 260, 18, 25, 380, 20, 11, 4, 99, 'carrier', 2, { spawn: 'mini', spawnN: 3, spawnCd: 4 }),
    en('mini', 12, 10, 8, 160, 30, 0, 1, 99, 99, 'swarm', 0),
    en('bulwark', 40, 300, 24, 30, 400, 21, 12, 4, 99, 'shielded', 2, { frontShield: 0.8 }),
    en('artillery', 32, 220, 30, 30, 420, 23, 13, 5, 99, 'lob', 2, { bullet: 'eb_big', fireRate: 0.35, aoe: 20 }),
  ];
  D.ENEMY_MAX = 20;
  D.targetCount = s => Math.min(20, 8 + 2 * s);
  D.respawnDelay = [0.5, 1.0];
  // 3.1 difficulty: quadratic, uncapped (3.0 was hp 1+0.08s, dmg 1+0.05s and the engine capped s at 10).
  //   s:    0    1     3     5     8     10    12    16    20
  //   hp:   1   1.11  1.41  1.80  2.57  3.20  3.93  5.67  7.80
  //   dmg:  1   1.16  1.58  2.15  3.27  4.20  5.27  7.85  10.2
  // Early sectors ~unchanged; from s3 hits hurt, s10+ (500k) needs real meta power, s16-20 (800k-1M) is the wall.
  D.sectorScale = s => { s = Math.max(0, s || 0); return { hp: 1 + 0.10 * s + 0.012 * s * s, dmg: 1 + 0.14 * s + 0.018 * s * s }; };
  // boss/mini-boss attack damage multiplier by sector (engine x boss dmgK = bossFor(i).dmg/18). 3.0: 1+0.1*min(s,10)
  D.bossDmgScale = s => { s = Math.max(0, s || 0); return 1 + 0.12 * s + 0.014 * s * s; };
  D.ELITE = { from: 5, chance: s => Math.min(0.35, 0.15 + 0.02 * (s - 5)), hp: 2.5, dmg: 1.4, points: 3, cr: 3, xp: 3 };
  D.rosterFor = s => D.ENEMIES.filter(e => e.w > 0 && s >= e.from && s < e.to);

  // =====================================================================
  // 6.6 BOSSES, MINI-BOSSES, EVENTS, BIOMES
  // =====================================================================
  // 3.1 economy: boss/mini-boss cr = 3.0 / 3. Boss dmg (18..26, +15%/loop) is used by the engine as dmgK = dmg/18.
  D.BOSS_EVERY = 50000; D.MBOSS_FIRST = 25000;
  D.BOSSES = [
    { id: 'colos', sprite: 'boss_colos', hp: 3600, dmg: 18, contact: 30, points: 5000, cr: 650, chest: 0,
      phases: [['aimed', 'gapRing', 'aimed', 'sweep'], ['aimed', 'gapRing', 'sweep', 'mines'], ['sweep', 'aimed', 'ram', 'gapRing', 'mines']] },
    { id: 'nucleu', sprite: 'boss_nucleu', hp: 11000, dmg: 20, contact: 32, points: 7500, cr: 1000, chest: 0,
      phases: [['spiral', 'orbs', 'aimed'], ['spiral', 'orbs', 'blink', 'gapRing'], ['blink', 'spiral', 'orbs', 'sweep', 'blink']] },
    { id: 'leviatan', sprite: 'boss_leviatan', hp: 40000, dmg: 22, contact: 40, points: 10000, cr: 1350, chest: 1,
      phases: [['ram', 'aimed', 'gapRing'], ['ram', 'sweep', 'mines', 'aimed'], ['ram', 'sweep', 'ram', 'spiral', 'mines']] },
    { id: 'stup', sprite: 'boss_stup', hp: 100000, dmg: 24, contact: 36, points: 12500, cr: 1650, chest: 1,
      phases: [['orbs', 'mines', 'aimed'], ['orbs', 'spiral', 'mines', 'gapRing'], ['spiral', 'orbs', 'mines', 'sweep', 'aimed']] },
    { id: 'imparat', sprite: 'boss_imparat', hp: 240000, dmg: 26, contact: 45, points: 15000, cr: 2350, chest: 2,
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
    { id: 1, sprite: 'mboss_1', hp: 800, dmg: 16, points: 2000, cr: 200, chest: null, attacks: ['aimed', 'gapRing'] },
    { id: 2, sprite: 'mboss_2', hp: 1200, dmg: 18, points: 2500, cr: 270, chest: null, attacks: ['spiral', 'mines'] },
    { id: 3, sprite: 'mboss_3', hp: 1600, dmg: 20, points: 3000, cr: 330, chest: 0, attacks: ['ram', 'aimed', 'orbs'] },
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
    { id: 'nebula', music: 'nebula', accent: '#9a78b8' },     // 3.1: muted palette B accents
    { id: 'asteroid', music: 'asteroid', accent: '#d6a35a' },
    { id: 'ion', music: 'ion', accent: '#73b9c6' },
    { id: 'station', music: 'station', accent: '#78a86c' },
  ];
  for (const b of D.BIOMES) { b.nameKey = 'biome.' + b.id + '.name'; b.bg = [1, 2, 3, 4].map(n => 'bg_' + b.id + '_' + n); }
  D.biomeFor = s => D.BIOMES[s % D.BIOMES.length];

  // =====================================================================
  // RUN DROPS & REVIVE
  // =====================================================================
  D.DROPS = {
    starChance: 0.55,          // per kill: xp star
    crystalSplit: 3,           // crystals of an enemy split into up to N pickups
    repairChance: 0.005,       // per kill (3.1: 0.012 -> 0.005)
    supernovaChance: 0.004,    // per kill (screen nuke pickup)
    eliteChestChance: 0.05,    // elite kill drops a common chest
  };
  // 3.1 sustain knobs read by the engine (fallbacks there = 3.0 values 0.5 / 0.25 / no cap):
  // bossKill = hp healed on boss kill (shield is refilled anyway), repair = repair pickup heal, vampPerSec = lifesteal cap
  // (max hp fraction per second, card 'vamp' heals val*maxHp per kill up to this rate).
  D.HEAL = { bossKill: 0.3, repair: 0.2, vampPerSec: 0.012 };
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
    reward: Object.assign({ cr: crs[i], oreAny: [20, 60, 150][i] }, chests[i] != null ? { chest: chests[i] } : {}),   // 4.0 oreAny = ore split over random categories
  }));
  // 3.1 economy: crystal rewards / 3 (chests unchanged); 'rich' goals / 3 because income is / 3
  D.ACHIEVEMENTS = [].concat(
    fam('kills', 'kills', [500, 5000, 50000], [700, 2700, 10000], [null, 1, 2]),
    fam('boss', 'bosses', [1, 10, 50], [1000, 4000, 13000], [null, 2, 3]),
    fam('score', 'best', [50000, 150000, 300000], [1000, 4000, 13000], [null, 1, 3]),
    fam('sector', 'maxSector', [2, 4, 6], [1300, 5000, 15000], [null, 2, 3]),
    fam('runs', 'runs', [10, 50, 200], [700, 2700, 8000], [null, 1, 2]),
    fam('combo', 'maxCombo', [15, 40, 100], [500, 2000, 7000], [null, 1, 2]),
    fam('time', 'playtime', [3600, 18000, 72000], [700, 2700, 8000], [null, 1, 2]),
    fam('rich', 'crEarned', [20000, 150000, 1500000], [1000, 5000, 17000], [null, 1, 3]),
    fam('level', 'level', [10, 25, 50], [1000, 4000, 13000], [null, 2, 3]),
    fam('fleet', 'shipsOwned', [3, 8, 20], [800, 5000, 20000], [null, 2, 4]),
    fam('chests', 'chestsOpened', [5, 50, 250], [700, 2700, 8000], [null, 1, 2]),
    fam('merge', 'merges', [1, 20, 100], [500, 2700, 8000], [null, 1, 3]),
    fam('evo', 'evos', [1, 10, 50], [700, 2700, 8000], [null, 1, 2]),
    fam('missions', 'missions', [5, 30, 150], [700, 3300, 10000], [null, 1, 3]),
    fam('stars', 'stars', [1000, 20000, 200000], [500, 2000, 7000], [null, 1, 2]),
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
    { id: 'crystals', ev: 'crystals', mode: 'sum', goals: [1500, 4000, 10000] },   // 3.1: / 3 like income
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
  // 3.1 economy: mission / daily / offline crystals / 3 (chests and consumables unchanged)
  D.MISSION_REWARD = [{ cr: 300, oreAny: 10 }, { cr: 500, oreAny: 20 }, { cr: 800, chest: 1, oreAny: 35 }];   // 4.0 + ores
  D.MISSION_BONUS = { cr: 500, chest: 0, oreAny: 30 }; // all 3 done
  D.DAILY = [ // 7-day login cycle, repeats; streak resets if a day is missed
    { cr: 300, oreAny: 10 }, { cr: 500, oreAny: 15 }, { cr: 700, cons: { repair: 1 }, oreAny: 20 }, { cr: 1000, oreAny: 25 },
    { cr: 1300, chest: 1, oreAny: 30 }, { cr: 1700, cons: { x2: 1 }, oreAny: 40 }, { cr: 2700, chest: 2, oreAny: 60 },
  ];
  D.OFFLINE = { capH: 8, minMin: 10, perHour: [270, 430, 630, 870, 1130, 1430, 1730], perHourExtra: 300 };
  D.offlineRate = s => s < D.OFFLINE.perHour.length ? D.OFFLINE.perHour[s] : D.OFFLINE.perHour[D.OFFLINE.perHour.length - 1] + D.OFFLINE.perHourExtra * (s - D.OFFLINE.perHour.length + 1);

  // =====================================================================
  // POWER rating (shown in UI, used by balance sim)
  // =====================================================================
  D.POWER = { dps: 4, hp: 0.5, shd: 0.5 };

  NC.DATA = D;
})(window.NC = window.NC || {});
