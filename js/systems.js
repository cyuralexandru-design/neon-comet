'use strict';
// Neon Comet 4.0 - meta systems (DATA agent): economy, inventory, stats, missions, achievements, daily, offline.
// Every mutating call returns { ok:true, ... } or { ok:false, err:'<i18n key>' } and persists the save.
(function (NC) {
  const D = () => NC.DATA;
  let S = null;              // current save object (also exposed as NC.save)
  let dirty = false;
  const sys = {};
  sys.rng = Math.random;     // tests/sim can replace
  sys.now = () => Date.now();
  const rand = () => sys.rng();
  const rr = (a, b) => a + rand() * (b - a);
  const ok = o => Object.assign({ ok: true }, o || {});
  const fail = err => ({ ok: false, err });
  const persist = () => { dirty = false; if (!sys.noPersist) NC.store.write(S); };

  // ---------- date helpers (local time) ----------
  const dayKey = (t) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const prevDayKey = (t) => { const d = new Date(t); d.setDate(d.getDate() - 1); return dayKey(d.getTime()); };
  sys.dayKey = dayKey;
  sys.msToMidnight = (t = sys.now()) => { const d = new Date(t); d.setHours(24, 0, 0, 0); return d.getTime() - t; };

  // =====================================================================
  // LOAD / SAVE
  // =====================================================================
  sys.load = () => {
    const r = NC.store.load();
    S = r.save; NC.save = S; sys.source = r.source;
    sys.offlineRewards();            // accrue time away before the first write updates lastSeen
    ensureGearEq();
    ensureMissions();
    NC.store.write(S, true);          // fresh backup of a known-good state
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
    return S;
  };
  // 4.0 fix: after migration gear.eq may be empty / point at removed items -> equip the first owned variant per slot
  function ensureGearEq() {
    try {
      const g = S && S.gear; if (!g || !Array.isArray(g.items)) return;
      g.eq = g.eq || {};
      for (const sl of D().GEAR_SLOTS) {
        const slot = sl.id || sl, cur = g.eq[slot];
        if (cur && g.items.some(i => i.id === cur && i.slot === slot)) continue;
        if (!cur && g.uneq && g.uneq[slot]) continue;   // 4.0.2: only an explicit unequip keeps a slot empty (eqFix40 blocked later auto-equip)
        const it = g.items.find(i => i.slot === slot && i.v);
        g.eq[slot] = it ? it.id : null;
      }
      g.eqFix40 = 1;
    } catch (e) { console.warn('ensureGearEq', e); }
  }
  sys.ensureGearEq = ensureGearEq;
  sys.save = () => { if (S) NC.store.write(S); return !!S; };
  sys.state = () => S;
  sys.withSave = (s, fn) => { const prev = S, pp = sys.noPersist; S = s; sys.noPersist = true; try { return fn(); } finally { S = prev; sys.noPersist = pp; } };
  sys.migrationReport = () => { const m = S && S.migration; if (m) { S.migration = null; persist(); } return m || null; };
  sys.exportSave = () => NC.store.exportCode(S);
  sys.importSave = (code) => {
    const r = NC.store.importCode(code); if (!r.ok) return r;
    S = r.save; NC.save = S; ensureGearEq(); ensureMissions(); NC.store.write(S, true); return ok({ report: r.report });
  };
  sys.resetSave = () => { S = NC.store.reset(S); NC.save = S; ensureMissions(); NC.store.write(S, true); return ok(); };

  // =====================================================================
  // LOOKUPS
  // =====================================================================
  const LIST = { ship: 'SHIPS', weapon: 'WEAPONS', turret: 'TURRETS', comp: 'COMPANIONS', secondary: 'SECONDARY', cons: 'CONSUMABLES' };
  const BUCKET = { ship: 'ships', weapon: 'weapons', turret: 'turrets', comp: 'comps', secondary: 'secondary' };
  const OPTIONAL = { turret: 1, comp: 1, secondary: 1 };   // can be unequipped (eq = null), first buy auto-equips
  sys.def = (kind, id) => { const l = D()[LIST[kind]]; return l ? l.find(x => x.id === id) || null : null; };
  sys.owned = (kind, id) => !!(BUCKET[kind] && S[BUCKET[kind]].lv[id]);
  // 4.0: level is per CATEGORY. level(kind, id) = category level if owned, else 0.
  const KIND_CAT = { ship: 'ship', weapon: 'weapon', turret: 'turret', comp: 'comp', secondary: 'secondary', gear: null };
  const catId = c => { c = D().CAT_ALIAS[c] || c; return (c in D().CAT_ORE) ? c : null; };
  sys.catOf = (kind, x) => {
    if (kind === 'gear') { const it = typeof x === 'object' && x ? x : sys.item(x); return it ? it.slot : null; }
    return KIND_CAT[kind] || catId(kind);
  };
  sys.catLevel = cat => { cat = catId(cat); return cat && S && S.cat ? (S.cat[cat] || 1) : 1; };
  sys.catTier = cat => D().tierFromLevel(sys.catLevel(cat));
  sys.catCost = cat => D().catCost(sys.catLevel(cat));     // {ore, cr} | null at 150
  sys.level = (kind, id) => (BUCKET[kind] && S[BUCKET[kind]].lv[id]) ? sys.catLevel(KIND_CAT[kind]) : 0;
  sys.maxLevel = (kind, id) => { const d = D(); if (id != null && kind !== 'gear' && !sys.def(kind, id)) return 0; return d.MAX_LVL; };
  // tierOf(kind, id|item|def, lvl?) -> 0..4 = category tier (lvl given -> tier of that level)
  sys.tierOf = (kind, x, lvl) => {
    const d = D(); if (lvl != null) return d.tierFromLevel(lvl);
    const c = sys.catOf(kind, x); return c ? sys.catTier(c) : 0;
  };
  sys.tierInfo = (kind, x, lvl) => {
    const d = D(), tier = sys.tierOf(kind, x, lvl);
    return { tier, next: tier >= 4 ? null : tier + 1, at: tier >= 4 ? null : d.CAT_TIER_AT[tier + 1] };
  };
  // ---------- ores ----------
  sys.ores = () => Object.assign({}, S.ores);
  sys.ore = id => (S.ores && S.ores[id]) || 0;
  sys.addOre = (id, n) => { if (D().CAT_ORE[id]) id = D().CAT_ORE[id]; if (!(id in S.ores)) return 0; n = Math.max(0, Math.round(n || 0)); S.ores[id] += n; dirty = true; return S.ores[id]; };
  // split n ore over random hangar categories (weights D.ORE_RUN.w) in chunks -> {ore_x: n}
  sys.rollOres = (n, cats) => {
    const d = D(), out = {}; n = Math.max(0, Math.round(n || 0)); if (!n) return out;
    const ent = (cats || d.CATS).map(c => [c, d.ORE_RUN.w[c] || 1]), chunk = Math.max(1, Math.ceil(n / 12));
    while (n > 0) { const c = NC.weighted(ent, rand), k = Math.min(n, chunk), id = d.CAT_ORE[c]; out[id] = (out[id] || 0) + k; n -= k; }
    return out;
  };
  const addOres = o => { for (const k of Object.keys(o || {})) sys.addOre(k, o[k]); return o; };
  sys.addOres = addOres;
  // upgradeCat(cat) -> {ok, lvl, cost:{ore, cr}} | {ok:false, err}
  sys.upgradeCat = cat => {
    const c = catId(cat); if (!c) return fail('sys.err.invalid');
    const L = sys.catLevel(c), cost = D().catCost(L); if (!cost) return fail('sys.err.maxLevel');
    const oid = D().CAT_ORE[c];
    if (S.ores[oid] < cost.ore) return fail('sys.err.noOre');
    if (S.crystals < cost.cr) return fail('sys.err.noCrystals');
    S.ores[oid] -= cost.ore; S.crystals -= cost.cr; S.cat[c] = L + 1; syncGearLvl();
    S.stats.upgrades++; track('upgrades', 1); persist();
    return ok({ lvl: L + 1, cost, cat: c, tier: D().tierFromLevel(L + 1), tierUp: D().tierFromLevel(L + 1) > D().tierFromLevel(L) });
  };
  function syncGearLvl() { if (S && S.gear) for (const it of S.gear.items) { it.lvl = sys.catLevel(it.slot); it.r = 0; } }
  sys.syncGearLvl = syncGearLvl;
  sys.item = id => S.gear.items.find(i => i.id === id) || null;
  sys.crystals = () => S.crystals;

  // price(kind, id, lvl): lvl omitted/0 -> purchase price; lvl >= 1 -> CRYSTAL part of the category upgrade lvl -> lvl+1 (null at max).
  // 4.0: upgrades also cost ore -> use sys.catCost(cat) / sys.upgradeCat(cat). gear: id = item; sell: id = item -> ore it gives.
  sys.price = (kind, id, lvl) => {
    const d = D();
    if (kind === 'chest') { const c = d.CHESTS[id]; return c ? c.price : null; }
    if (kind === 'cons') { const c = sys.def('cons', id); return c ? c.price : null; }
    if (kind === 'gear' || kind === 'sell') {
      const it = typeof id === 'object' ? id : sys.item(id); if (!it) return null;
      if (kind === 'sell') return d.DUP_ORE;
      const c = d.catCost(lvl || sys.catLevel(it.slot)); return c ? c.cr : null;
    }
    const x = sys.def(kind, id); if (!x) return null;
    if (!lvl) return x.price;
    const c = d.catCost(lvl); return c ? c.cr : null;
  };
  function spend(n) { if (S.crystals < n) return false; S.crystals -= n; return true; }
  sys.spend = (n) => { n = Math.max(0, Math.round(n)); if (!spend(n)) return fail('sys.err.noCrystals'); persist(); return ok({ crystals: S.crystals }); };
  // crystals earned in-run or from rewards (counts for stats/missions/achievements)
  sys.addCrystals = (n, noTrack) => { n = Math.max(0, Math.round(n)); S.crystals += n; if (!noTrack) track('crystals', n); dirty = true; return S.crystals; };
  sys.flush = () => { if (dirty) persist(); };
  sys.addChest = (r, n = 1) => { r = NC.clamp(r | 0, 0, 4); S.chests[r] += n; S.stats.chests += n; dirty = true; };

  function grant(rew) { // {cr, chest, cons:{id:n}, ores:{ore_x:n}, oreAny:n} -> ores granted
    if (!rew) return {};
    const ores = Object.assign({}, rew.ores || {});
    if (rew.oreAny) { const o = sys.rollOres(rew.oreAny); for (const k of Object.keys(o)) ores[k] = (ores[k] || 0) + o[k]; }
    addOres(ores);
    if (rew.cr) { S.crystals += rew.cr; S.stats.crEarned += rew.cr; }
    if (rew.chest != null) S.chests[rew.chest] += 1;
    if (rew.cons) for (const k of Object.keys(rew.cons)) S.cons[k] = Math.min(D().CONS_STOCK_MAX, (S.cons[k] || 0) + rew.cons[k]);
    return ores;
  }
  sys.grant = (rew) => { const o = grant(rew); persist(); return o; };

  // =====================================================================
  // BUY / UPGRADE / EQUIP
  // =====================================================================
  sys.buy = (kind, id, n = 1) => {
    const d = D();
    if (kind === 'chest') { const c = d.CHESTS[id]; if (!c) return fail('sys.err.invalid'); if (!spend(c.price)) return fail('sys.err.noCrystals'); S.chests[id]++; persist(); return ok({ cost: c.price }); }
    if (kind === 'cons') return sys.buyConsumable(id, n);
    const x = sys.def(kind, id); if (!x || !BUCKET[kind]) return fail('sys.err.invalid');
    if (sys.owned(kind, id)) return fail('sys.err.owned');
    if (!spend(x.price)) return fail('sys.err.noCrystals');
    S[BUCKET[kind]].lv[id] = 1;
    if (OPTIONAL[kind] && !S[BUCKET[kind]].eq) S[BUCKET[kind]].eq = id;
    persist();
    return ok({ cost: x.price, lvl: 1 });
  };

  // 4.0: upgrading any item upgrades its whole category (ore + crystals)
  sys.upgrade = (kind, id) => {
    if (kind === 'gear') { const it = sys.item(id); if (!it) return fail('sys.err.notOwned'); return sys.upgradeCat(it.slot); }
    if (!BUCKET[kind]) return fail('sys.err.invalid');
    if (!sys.level(kind, id)) return fail('sys.err.notOwned');
    return sys.upgradeCat(KIND_CAT[kind]);
  };

  // equip(kind, id): ship/weapon require owned; turret/comp/secondary accept null to unequip; gear: id = item id (null + slot via unequipGear)
  sys.equip = (kind, id) => {
    if (kind === 'gear') {
      const it = sys.item(id); if (!it) return fail('sys.err.notOwned');
      S.gear.eq[it.slot] = it.id; if (S.gear.uneq) delete S.gear.uneq[it.slot]; persist(); return ok({ slot: it.slot });
    }
    if (!BUCKET[kind]) return fail('sys.err.invalid');
    if (id == null) { if (!OPTIONAL[kind]) return fail('sys.err.invalid'); S[BUCKET[kind]].eq = null; persist(); return ok(); }
    if (!sys.owned(kind, id)) return fail('sys.err.notOwned');
    S[BUCKET[kind]].eq = id; persist(); return ok();
  };
  sys.unequipGear = (slot) => { if (!(slot in S.gear.eq)) return fail('sys.err.invalid'); S.gear.eq[slot] = null; (S.gear.uneq = S.gear.uneq || {})[slot] = 1; persist(); return ok(); };
  sys.isEquipped = (itemId) => Object.values(S.gear.eq).includes(itemId);

  // =====================================================================
  // GEAR: create, merge, sell
  // =====================================================================
  // 4.0 gear item = {id (uid), slot, v (variant id), set, lock, nameKey, lvl (= category level mirror), r: 0}
  sys.variant = (cat, id) => D().gearVariant(cat, id);
  sys.ownsVariant = (slot, v) => S.gear.items.some(i => i.slot === slot && i.v === v);
  sys.makeItem = (slot, v) => {
    const d = D();
    if (typeof slot === 'number') slot = null;                         // old makeItem(r, slot) callers
    slot = slot || d.GEAR_SLOTS[Math.floor(rand() * d.GEAR_SLOTS.length)].id;
    const list = d.GEAR_VARIANTS[slot], vd = (v && d.gearVariant(slot, v)) || list[Math.floor(rand() * list.length)];
    S.gear.uid = (S.gear.uid || 0) + 1;
    return { id: 'g' + S.gear.uid.toString(36) + Math.floor(rand() * 1296).toString(36), slot, v: vd.id, set: vd.set, lock: false,
      nameKey: vd.nameKey, lvl: sys.catLevel(slot), r: 0 };
  };
  // addItem(slot?, variant?) / old addItem(r, slot): owned variant -> converted to ore ({dup:true, ore}) unless keepDup
  sys.addItem = (a, b, keepDup) => {
    let slot = a, v = b, mult = 1;
    if (typeof a === 'number') { slot = b; v = null; mult = 1 + a; }
    const it = sys.makeItem(slot, v);
    if (!keepDup && sys.ownsVariant(it.slot, it.v)) { const n = Math.round(D().DUP_ORE * mult); sys.addOre(it.slot, n); return Object.assign(it, { dup: true, ore: { [D().CAT_ORE[it.slot]]: n } }); }
    S.gear.items.push(it); dirty = true; return it;
  };
  // equipVariant(cat, id): equips the owned item of that variant
  sys.equipVariant = (cat, id) => {
    const it = S.gear.items.find(i => i.slot === cat && i.v === id); if (!it) return fail('sys.err.notOwned');
    S.gear.eq[cat] = it.id; if (S.gear.uneq) delete S.gear.uneq[cat]; persist(); return ok({ slot: cat, item: it.id });
  };
  sys.lockItem = (uid, on) => { const it = sys.item(uid); if (!it) return fail('sys.err.notOwned'); it.lock = on == null ? !it.lock : !!on; persist(); return ok({ lock: it.lock }); };

  // itemStats(item | {slot, v}, L?) -> {main:{stat, v, flat}, lines:[{tier, stat, v, on, textKey, txt}], mods:{stat: v}} + legacy flat keys
  sys.itemStats = (it, L) => {
    const d = D(), vd = d.gearVariant(it.slot, it.v) || d.GEAR_VARIANTS[it.slot][0];
    if (!L) L = (it.lvl && S && it.lvl !== sys.catLevel(it.slot)) ? it.lvl : sys.catLevel(it.slot);   // it.lvl != cat level = preview (hangar passes lvl+1)
    const tier = d.tierFromLevel(L), mv = d.variantMain(vd, L), flat = !!d.FLAT_STATS[vd.main.stat];
    const mods = {}; const add = (k, v) => { mods[k] = (mods[k] || 0) + v; };
    if (flat && vd.main.stat !== 'magnet') add(vd.main.stat + 'Flat', mv); else add(vd.main.stat, mv);
    const lines = vd.bonus.map(b => { const on = tier >= b.tier; if (on) add(b.stat === 'hp' ? 'hpPct' : b.stat, b.v); return Object.assign({}, b, { on, txt: d.statTxt(b.stat, b.v, b.stat === 'magnet') }); });
    const out = { main: { stat: vd.main.stat, v: mv, flat, txt: d.statTxt(vd.main.stat, mv, flat) }, lines, mods, lvl: L, tier, def: vd };
    out[vd.main.stat] = flat ? mv : mv * 100;   // legacy key (hp/shd flat, others percent)
    return out;
  };

  // 4.0 no 3->1 gear merge (level is per category). mergeable() lists duplicates that can be converted to ore.
  sys.merge = () => fail('sys.err.mergeRule');
  sys.mergeable = () => {
    const seen = {}, out = [];
    const eqd = new Set(Object.values(S.gear.eq));
    const its = S.gear.items.slice().sort((a, b) => (eqd.has(b.id) - eqd.has(a.id)) || (b.lock - a.lock));
    for (const it of its) { const k = it.slot + '.' + it.v; if (seen[k]) { if (!it.lock && !eqd.has(it.id)) out.push(it.id); } else seen[k] = 1; }
    return out.length ? [{ dup: true, ids: out }] : [];
  };
  // sell(ids) -> converts to ore of the item's category (DUP_ORE each). Equipped / locked items are skipped.
  sys.sell = (ids) => {
    if (!Array.isArray(ids)) ids = [ids];
    let n = 0, skipped = 0; const ores = {}, set = new Set(ids), d = D();
    S.gear.items = S.gear.items.filter(it => {
      if (!set.has(it.id)) return true;
      if (sys.isEquipped(it.id) || it.lock) { skipped++; return true; }
      const oid = d.CAT_ORE[it.slot]; ores[oid] = (ores[oid] || 0) + d.DUP_ORE; n++; return false;
    });
    addOres(ores); S.stats.sold += n; persist();
    return ok({ crystals: 0, ores, count: n, skipped });
  };
  sys.sellAll = () => { const m = sys.mergeable(); return sys.sell(m.length ? m[0].ids : []); };   // all unlocked, unequipped duplicates

  // =====================================================================
  // CHESTS (with pity)
  // =====================================================================
  sys.openChest = (r, opts) => {
    const d = D(), c = d.CHESTS[r]; if (!c) return fail('sys.err.invalid');
    if (opts && opts.buy) { if (!spend(c.price)) return fail('sys.err.noCrystals'); }
    else { if (S.chests[r] <= 0) return fail('sys.err.noChest'); S.chests[r]--; }
    const ent = c.w.map((w, i) => [i, w]).filter(e => e[1] > 0);
    const rars = []; for (let i = 0; i < c.items; i++) rars.push(NC.weighted(ent, rand));
    let pity = false;
    if (r >= d.PITY.minChest) {
      if (S.pity >= d.PITY.after && Math.max(...rars) < d.PITY.guarantee) { const bi = rars.indexOf(Math.max(...rars)); rars[bi] = d.PITY.guarantee; pity = true; }
      S.pity = Math.max(...rars) >= d.PITY.guarantee ? 0 : S.pity + 1;
    }
    const items = rars.map(x => { const it = sys.addItem(x); it.roll = x; return it; });   // 4.0: dup -> ore (it.dup, it.ore)
    const ores = sys.rollOres(Math.round(rr(c.ores[0], c.ores[1]))); addOres(ores);
    for (const it of items) if (it.ore) for (const k of Object.keys(it.ore)) ores[k] = (ores[k] || 0) + it.ore[k];
    const cr = Math.round(rr(c.bonusCr[0], c.bonusCr[1]));
    S.crystals += cr; S.stats.crEarned += cr;
    const cons = {};
    for (let i = 0; i < c.cons; i++) { const k = d.CONSUMABLES[Math.floor(rand() * d.CONSUMABLES.length)].id; cons[k] = (cons[k] || 0) + 1; }
    for (const k of Object.keys(cons)) S.cons[k] = Math.min(d.CONS_STOCK_MAX, S.cons[k] + cons[k]);
    S.stats.chestsOpened++; track('chestsOpened', 1); ensureGearEq(); persist();
    return ok({ rarity: r, items: items.filter(i => !i.dup), dups: items.filter(i => i.dup), all: items, ores, crystals: cr, cons, pity, pityCount: S.pity });
  };

  // =====================================================================
  // CONSUMABLES + LOADOUT
  // =====================================================================
  sys.buyConsumable = (id, n = 1) => {
    const d = D(), c = sys.def('cons', id); if (!c) return fail('sys.err.invalid');
    n = Math.max(1, Math.floor(n)); n = Math.min(n, d.CONS_STOCK_MAX - S.cons[id]); if (n <= 0) return fail('sys.err.maxLevel');
    if (!spend(c.price * n)) return fail('sys.err.noCrystals');
    S.cons[id] += n; persist(); return ok({ cost: c.price * n, count: S.cons[id] });
  };
  sys.loadout = () => S.loadout.map(l => ({ id: l.id, n: l.n, have: S.cons[l.id] || 0 }));
  sys.getLoadout = sys.loadout;
  // arr: [{id, n}] or [id,...] (n defaults to 3). Max 3 types, 1..3 units each, distinct.
  sys.setLoadout = (arr) => {
    const d = D(); if (!Array.isArray(arr)) return fail('sys.err.invalid');
    const out = [], seen = new Set();
    for (const e of arr) {
      const id = typeof e === 'string' ? e : e && e.id, n = typeof e === 'string' ? d.CONS_MAX_UNITS : (e.n == null ? d.CONS_MAX_UNITS : e.n);
      if (!sys.def('cons', id) || seen.has(id)) return fail('sys.err.invalid');
      if (out.length >= d.CONS_MAX_TYPES) return fail('sys.err.loadoutFull');
      seen.add(id); out.push({ id, n: NC.clamp(Math.floor(n), 1, d.CONS_MAX_UNITS) });
    }
    S.loadout = out; persist(); return ok({ loadout: sys.loadout() });
  };
  // what the run gets: [{id, count}] (count = min(chosen n, stock)); stock is only consumed on use
  sys.runConsumables = () => S.loadout.map(l => ({ id: l.id, count: Math.min(l.n, S.cons[l.id] || 0) })).filter(x => x.count > 0);
  sys.consumeOne = (id) => { if (!S.cons[id]) return fail('sys.err.noStock'); S.cons[id]--; track('consUsed', 1); dirty = true; return ok({ left: S.cons[id] }); };

  // =====================================================================
  // STATS
  // =====================================================================
  sys.setCounts = (s = S) => {
    const c = {};
    for (const id of Object.values(s.gear.eq)) { const it = id && s.gear.items.find(i => i.id === id); const vd = it && D().gearVariant(it.slot, it.v); if (vd && vd.set) c[vd.set] = (c[vd.set] || 0) + 1; }
    return c;
  };
  const catL = (s, c) => (s.cat && s.cat[c]) || 1;
  // 4.0: all multipliers use the CATEGORY level/tier; gear = variant main + active bonus lines + sets.
  // Engine extras in st.extra: armor (dmg taken -x), dodge (chance), thorns (x reflected), bossDmg (+x vs bosses), ore (+x run ore).
  sys.computeStats = (s = S) => {
    const d = D(), B = d.BASE;
    const ship = d.SHIPS.find(x => x.id === s.ships.eq) || d.SHIPS[0];
    const shipLvl = catL(s, 'ship'), shipM = (1 + d.SHIP_UP.per * (shipLvl - 1)) * d.tierMult(0, shipLvl);
    const acct = d.levelFromXp(s.xp), lm = 1 + d.LEVEL_BONUS * (acct.lvl - 1);
    const m = { atk: 0, hp: 0, shd: 0, rate: 0, speed: 0, crit: 0, critDmg: 0, dashCd: 0, regen: 0, cr: 0, xp: 0, hpPct: 0, magnet: 0, hpFlat: 0, shdFlat: 0,
      armor: 0, dodge: 0, thorns: 0, bossDmg: 0, ore: 0 };
    const addMods = o => { if (o) for (const k of Object.keys(o)) m[k] = (m[k] || 0) + o[k]; };
    addMods(ship.perk.mods);
    const gearEq = {}, gearInfo = {};
    for (const sl of d.GEAR_SLOTS) {
      const id = s.gear.eq[sl.id], it = id && s.gear.items.find(i => i.id === id); if (!it) continue;
      gearEq[sl.id] = it;
      const st = sys.itemStats(it, catL(s, sl.id)); gearInfo[sl.id] = st; addMods(st.mods);
    }
    const sets = sys.setCounts(s);
    for (const set of d.SETS) { const n = sets[set.id] || 0; if (n >= 2) addMods(set.b2); if (n >= 4) addMods(set.b4); }
    const wdef = d.WEAPONS.find(w => w.id === s.weapons.eq) || d.WEAPONS[0], wl = catL(s, 'weapon');
    const tdef = s.turrets.eq ? d.TURRETS.find(t => t.id === s.turrets.eq) : null, tl = tdef ? catL(s, 'turret') : 0;
    const cdef = s.comps.eq ? d.COMPANIONS.find(c => c.id === s.comps.eq) : null, cl = cdef ? catL(s, 'comp') : 0;
    const sec = s.secondary || { eq: null, lv: {} };
    const xdef = sec.eq ? (d.SECONDARY || []).find(x => x.id === sec.eq) : null, xl = xdef ? catL(s, 'secondary') : 0;

    const atk = B.atk * ship.mult.atk * shipM * lm * (1 + m.atk);
    const hp = (B.hp * ship.mult.hp * shipM + m.hpFlat) * lm * (1 + m.hp + m.hpPct);
    const shd = (B.shd * ship.mult.shd * shipM + m.shdFlat) * lm * (1 + m.shd);
    const rate = ship.mult.rate * (1 + m.rate);
    const crit = Math.min(0.75, m.crit);
    const critDmg = B.critDmg + m.critDmg;
    const speed = ship.mult.speed * (1 + m.speed);
    const dashCd = B.dashCd * Math.max(0.4, 1 + m.dashCd);
    const regenBonus = m.regen + (cdef && cdef.regenAura ? cdef.regenAura : 0);
    const regen = (B.regen != null ? B.regen : 1) * (1 + Math.min(d.REGEN_BONUS_CAP != null ? d.REGEN_BONUS_CAP : 99, regenBonus));
    const crMult = 1 + m.cr, xpMult = 1 + m.xp;
    const magnet = B.magnet + m.magnet;
    const wDmg = (1 + d.WEAPON_UP.per * (wl - 1)) * d.tierMult(0, wl);
    const critF = 1 + crit * (critDmg - 1);
    const dps = atk * wdef.power * wDmg * rate * critF;
    const tMult = tdef ? (1 + d.TURRET_UP.per * (tl - 1)) * d.tierMult(0, tl) : 0;
    const tdps = tdef ? atk * tdef.power * tMult * critF : 0;
    const cFrac = cdef ? d.COMP_UP.base * (1 + d.COMP_UP.per * (cl - 1)) * d.tierMult(0, cl) : 0;
    const cdps = cdef ? atk * cFrac * cdef.guns * rate * 4 * (1 + (cdef.crit || 0)) : 0;
    const xMult = xdef ? (1 + d.SEC_UP.per * (xl - 1)) * d.tierMult(0, xl) : 0;
    const xdps = xdef ? atk * xdef.power * xMult * critF : 0;
    const extra = { armor: Math.min(d.EXTRA_CAPS.armor, m.armor), dodge: Math.min(d.EXTRA_CAPS.dodge, m.dodge), thorns: m.thorns, bossDmg: m.bossDmg, ore: m.ore };
    const P = d.POWER, ehp = (hp + shd) / (1 - extra.armor) / (1 - extra.dodge);
    const tierOf = L => d.tierFromLevel(L);
    const st = {
      shipId: ship.id, ship, shipLvl, shipMaxLvl: d.MAX_LVL, shipTier: tierOf(shipLvl), lvl: acct.lvl,
      atk: Math.round(atk), hp: Math.round(hp), shd: Math.round(shd),
      rate, crit, critDmg, speed, dashCd, regen, regenBonus, crMult, xpMult, magnet, extra,
      flags: Object.assign({}, ship.perk.flags || {}), perk: ship.perk.id,
      weapon: { id: wdef.id, def: wdef, lvl: wl, dmgMult: wDmg, tier: tierOf(wl), skill: d.skillAt ? d.skillAt(wdef, Math.ceil(wl / 3)) : null },
      turret: tdef ? { id: tdef.id, def: tdef, lvl: tl, dmgMult: tMult, tier: tierOf(tl) } : null,
      comp: cdef ? { id: cdef.id, def: cdef, lvl: cl, dmgFrac: cFrac, tier: tierOf(cl) } : null,
      secondary: xdef ? { id: xdef.id, def: xdef, lvl: xl, mult: xMult, tier: tierOf(xl) } : null,
      gear: gearEq, gearInfo, sets, cat: Object.assign({}, s.cat || {}),
      dps: Math.round(dps + tdps + cdps + xdps),
      power: Math.round((dps + tdps + cdps + xdps) * P.dps + ehp * P.hp),
    };
    return st;
  };
  // preview stats after a hypothetical change, e.g. sys.preview(s => s.ships.lv.vanator++)
  sys.preview = (mutate) => { const c = JSON.parse(JSON.stringify(S)); mutate(c); return sys.computeStats(c); };

  // =====================================================================
  // RUN HOOKS (engine)
  // =====================================================================
  // track(ev, n): live run events. ev: kills, stars, dashes, cards, events, evos, mbosses, bosses, revives,
  //   consUsed, crystals, upgrades, chestsOpened (sum) | combo, sector (max)
  const STAT_OF = { crystals: 'crEarned', combo: 'maxCombo', sector: 'maxSector' };
  const MAX_EV = { combo: 1, sector: 1 };
  function track(ev, n = 1) {
    const k = STAT_OF[ev] || ev;
    // upgrades/chestsOpened stats are counted by their own calls; everything else counts here
    if (k in S.stats && ev !== 'upgrades' && ev !== 'chestsOpened') S.stats[k] = MAX_EV[ev] ? Math.max(S.stats[k], n) : S.stats[k] + n;
    ensureMissions();
    for (const mi of S.missions.list) {
      if (mi.ev !== ev || mi.claimed) continue;
      mi.prog = mi.mode === 'max' ? Math.max(mi.prog, n) : mi.prog + n;
    }
    dirty = true;
  }
  sys.track = track;
  sys.reviveCost = (sector, used) => used >= D().REVIVE.max ? null : D().REVIVE.cost(sector, used);
  sys.revive = (sector, used) => { const c = sys.reviveCost(sector, used); if (c == null) return fail('sys.err.maxLevel'); if (!spend(c)) return fail('sys.err.noCrystals'); S.stats.revives++; persist(); return ok({ cost: c }); };
  sys.rerollCost = n => D().rerollCost(n);
  sys.startRun = () => ({ stats: sys.computeStats(), consumables: sys.runConsumables(), reviveMax: D().REVIVE.max });
  // endRun({score, sector, combo, time, xp (raw run xp), kills, bosses}) -> {xpGain, lvlBefore, lvlAfter, best, isBest}
  sys.endRun = (r) => {
    const d = D(), st = sys.computeStats();
    const xpGain = Math.round((r.xp || 0) * st.xpMult);
    const lvlBefore = d.levelFromXp(S.xp).lvl; S.xp += xpGain; const lvlAfter = d.levelFromXp(S.xp).lvl;
    const isBest = (r.score || 0) > S.best; if (isBest) S.best = r.score;
    S.stats.playtime += r.time || 0; S.stats.bestTime = Math.max(S.stats.bestTime, r.time || 0);
    track('runs', 1);
    // 4.0 ores: engine-counted r.ores {ore_x:n} if given, else computed from the run summary (D.ORE_RUN)
    let ores = r.ores && typeof r.ores === 'object' ? r.ores : null;
    if (!ores) {
      const O = d.ORE_RUN, diff = r.diff || (NC.game && NC.game.diff) || 'normal', sct = r.sector || 0;
      const tot = ((r.kills || 0) * O.kill + (r.bosses || 0) * O.boss + (r.mbosses || 0) * O.mboss + (r.elites || 0) * O.elite + sct * O.sector)
        * (O.diff[diff] || 1) * (1 + O.sectorK * sct) * (1 + (st.extra.ore || 0));
      ores = sys.rollOres(Math.max((r.time || 0) > 30 ? O.min : 0, Math.round(tot)));
    }
    addOres(ores);
    track('combo', r.combo || 0); track('sector', r.sector || 0);
    S.top.push({ score: r.score || 0, sector: r.sector || 0, ship: S.ships.eq, date: sys.now(), kills: r.kills || 0, time: Math.round(r.time || 0) });
    S.top.sort((a, b) => b.score - a.score); S.top = S.top.slice(0, 10);
    persist();
    return { xpGain, lvlBefore, lvlAfter, best: S.best, isBest, ores };
  };

  // =====================================================================
  // MISSIONS (3 daily, refresh at local midnight)
  // =====================================================================
  function seeded(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function ensureMissions(t = sys.now()) {
    if (!S) return;
    const day = dayKey(t); if (S.missions.day === day) return;
    const d = D(), r = seeded('nc-' + day), pool = d.MISSIONS.slice(), list = [];
    for (let i = 0; i < 3; i++) {
      const m = pool.splice(Math.floor(r() * pool.length), 1)[0];
      list.push({ id: 'm' + i, type: m.id, ev: m.ev, mode: m.mode, diff: i, goal: m.goals[i], prog: 0, claimed: false, descKey: m.descKey, reward: d.MISSION_REWARD[i] });
    }
    S.missions = { day, list, bonus: false };
  }
  sys.missions = (t) => {
    ensureMissions(t);
    return { day: S.missions.day, msLeft: sys.msToMidnight(t), bonus: { reward: D().MISSION_BONUS, claimed: S.missions.bonus, ready: S.missions.list.every(m => m.claimed) },
      list: S.missions.list.map(m => Object.assign({}, m, { prog: Math.min(m.prog, m.goal), done: m.prog >= m.goal })) };
  };
  sys.claimMission = (id) => {
    ensureMissions();
    if (id === 'bonus') {
      if (S.missions.bonus) return fail('sys.err.claimed');
      if (!S.missions.list.every(m => m.claimed)) return fail('sys.err.notDone');
      S.missions.bonus = true; const ores = grant(D().MISSION_BONUS); persist(); return ok({ reward: D().MISSION_BONUS, ores });
    }
    const m = S.missions.list.find(x => x.id === id); if (!m) return fail('sys.err.invalid');
    if (m.claimed) return fail('sys.err.claimed');
    if (m.prog < m.goal) return fail('sys.err.notDone');
    m.claimed = true; const ores = grant(D().MISSION_REWARD[m.diff] || m.reward); S.stats.missions++; persist();
    return ok({ reward: D().MISSION_REWARD[m.diff] || m.reward, ores });
  };

  // =====================================================================
  // ACHIEVEMENTS
  // =====================================================================
  sys.statValue = (stat, s = S) => {
    if (stat === 'best') return s.best;
    if (stat === 'level') return D().levelFromXp(s.xp).lvl;
    if (stat === 'shipsOwned') return Object.keys(s.ships.lv).length;
    return s.stats[stat] || 0;
  };
  sys.achievements = () => D().ACHIEVEMENTS.map(a => { const p = sys.statValue(a.stat); return Object.assign({}, a, { prog: Math.min(p, a.goal), done: p >= a.goal, claimed: !!S.ach[a.id] }); });
  sys.claimableCount = () => sys.achievements().filter(a => a.done && !a.claimed).length + sys.missions().list.filter(m => m.done && !m.claimed).length;
  sys.claimAch = (id) => {
    const a = D().ACHIEVEMENTS.find(x => x.id === id); if (!a) return fail('sys.err.invalid');
    if (S.ach[id]) return fail('sys.err.claimed');
    if (sys.statValue(a.stat) < a.goal) return fail('sys.err.notDone');
    S.ach[id] = true; const ores = grant(a.reward); persist(); return ok({ reward: a.reward, ores });
  };

  // =====================================================================
  // DAILY LOGIN
  // =====================================================================
  sys.dailyStatus = (t = sys.now()) => {
    const today = dayKey(t), dl = S.daily;
    const available = dl.last !== today;
    const streak = available ? (dl.last === prevDayKey(t) ? dl.streak + 1 : 1) : dl.streak;
    const idx = (streak - 1) % 7;
    return { available, streak, day: idx, reward: D().DAILY[idx], rewards: D().DAILY };
  };
  sys.claimDaily = (t = sys.now()) => {
    const st = sys.dailyStatus(t); if (!st.available) return fail('sys.err.claimed');
    S.daily = { last: dayKey(t), streak: st.streak }; const ores = grant(st.reward); persist();
    return ok({ reward: st.reward, streak: st.streak, day: st.day, ores });
  };

  // =====================================================================
  // OFFLINE REWARDS: accrue from lastSeen into a pending pot (cap 8h total), claim to collect
  // =====================================================================
  sys.offlineRewards = (t = sys.now()) => {
    const d = D(), O = d.OFFLINE;
    const p = S.offline || (S.offline = { min: 0, cr: 0 });
    if (S.lastSeen > 0 && t > S.lastSeen) {
      const mins = (t - S.lastSeen) / 60000;
      if (mins >= O.minMin) {
        const add = Math.min(mins, O.capH * 60 - p.min);
        if (add > 0) { p.min += add; p.cr += d.offlineRate(S.stats.maxSector) * add / 60; }
        S.lastSeen = t;
      }
    }
    return { crystals: Math.floor(p.cr), minutes: Math.floor(p.min), capped: p.min >= O.capH * 60 - 1e-6, ratePerHour: d.offlineRate(S.stats.maxSector), capH: O.capH };
  };
  sys.claimOffline = (mult = 1) => {
    const r = sys.offlineRewards(); if (r.crystals <= 0) return fail('sys.err.notDone');
    const cr = Math.floor(r.crystals * mult); S.crystals += cr; S.stats.crEarned += cr; S.offline = { min: 0, cr: 0 }; persist();
    return ok({ crystals: cr, minutes: r.minutes });
  };

  NC.sys = sys;
})(window.NC = window.NC || {});
