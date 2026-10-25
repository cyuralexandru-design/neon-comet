'use strict';
// Neon Comet 3.1 - meta systems (DATA agent): economy, inventory, stats, missions, achievements, daily, offline.
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
    ensureMissions();
    NC.store.write(S, true);          // fresh backup of a known-good state
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
    return S;
  };
  sys.save = () => { if (S) NC.store.write(S); return !!S; };
  sys.state = () => S;
  sys.withSave = (s, fn) => { const prev = S, pp = sys.noPersist; S = s; sys.noPersist = true; try { return fn(); } finally { S = prev; sys.noPersist = pp; } };
  sys.migrationReport = () => { const m = S && S.migration; if (m) { S.migration = null; persist(); } return m || null; };
  sys.exportSave = () => NC.store.exportCode(S);
  sys.importSave = (code) => {
    const r = NC.store.importCode(code); if (!r.ok) return r;
    S = r.save; NC.save = S; ensureMissions(); NC.store.write(S, true); return ok({ report: r.report });
  };
  sys.resetSave = () => { S = NC.store.reset(S); NC.save = S; ensureMissions(); NC.store.write(S, true); return ok(); };

  // =====================================================================
  // LOOKUPS
  // =====================================================================
  const LIST = { ship: 'SHIPS', weapon: 'WEAPONS', turret: 'TURRETS', comp: 'COMPANIONS', cons: 'CONSUMABLES' };
  const BUCKET = { ship: 'ships', weapon: 'weapons', turret: 'turrets', comp: 'comps' };
  sys.def = (kind, id) => { const l = D()[LIST[kind]]; return l ? l.find(x => x.id === id) || null : null; };
  sys.owned = (kind, id) => !!(BUCKET[kind] && S[BUCKET[kind]].lv[id]);
  sys.level = (kind, id) => (BUCKET[kind] && S[BUCKET[kind]].lv[id]) || 0;
  sys.maxLevel = (kind, id) => {
    const d = D(), x = sys.def(kind, id); if (!x) return 0;
    return kind === 'ship' ? d.SHIP_UP.maxLvl(x.r) : kind === 'weapon' ? d.WEAPON_UP.maxLvl : kind === 'turret' ? d.TURRET_UP.maxLvl : d.COMP_UP.maxLvl;
  };
  sys.item = id => S.gear.items.find(i => i.id === id) || null;
  sys.crystals = () => S.crystals;

  // price(kind, id, lvl): lvl omitted/0 -> purchase price; lvl >= 1 -> cost to go from lvl to lvl+1 (null at max).
  // kinds: ship, weapon, turret, comp, cons, chest (id = rarity), gear (id = item id; upgrade cost), sell (id = item id)
  sys.price = (kind, id, lvl) => {
    const d = D();
    if (kind === 'chest') { const c = d.CHESTS[id]; return c ? c.price : null; }
    if (kind === 'cons') { const c = sys.def('cons', id); return c ? c.price : null; }
    if (kind === 'gear' || kind === 'sell') {
      const it = typeof id === 'object' ? id : sys.item(id); if (!it) return null;
      if (kind === 'sell') return d.GEAR.sellValue(it.r, it.lvl);
      const l = lvl || it.lvl; return l >= d.GEAR.maxLvl(it.r) ? null : d.GEAR.upCost(it.r, l);
    }
    const x = sys.def(kind, id); if (!x) return null;
    if (!lvl) return x.price;
    if (lvl >= sys.maxLevel(kind, id)) return null;
    if (kind === 'ship') return d.SHIP_UP.cost(x.r, lvl);
    if (kind === 'weapon') return d.WEAPON_UP.cost(x.r, lvl);
    const U = kind === 'turret' ? d.TURRET_UP : d.COMP_UP;
    return Math.round(x.price * U.costFrac * Math.pow(U.growth, lvl - 1));
  };

  function spend(n) { if (S.crystals < n) return false; S.crystals -= n; return true; }
  sys.spend = (n) => { n = Math.max(0, Math.round(n)); if (!spend(n)) return fail('sys.err.noCrystals'); persist(); return ok({ crystals: S.crystals }); };
  // crystals earned in-run or from rewards (counts for stats/missions/achievements)
  sys.addCrystals = (n, noTrack) => { n = Math.max(0, Math.round(n)); S.crystals += n; if (!noTrack) track('crystals', n); dirty = true; return S.crystals; };
  sys.flush = () => { if (dirty) persist(); };
  sys.addChest = (r, n = 1) => { r = NC.clamp(r | 0, 0, 4); S.chests[r] += n; S.stats.chests += n; dirty = true; };

  function grant(rew) { // {cr, chest, cons:{id:n}}
    if (!rew) return;
    if (rew.cr) { S.crystals += rew.cr; S.stats.crEarned += rew.cr; }
    if (rew.chest != null) S.chests[rew.chest] += 1;
    if (rew.cons) for (const k of Object.keys(rew.cons)) S.cons[k] = Math.min(D().CONS_STOCK_MAX, (S.cons[k] || 0) + rew.cons[k]);
  }

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
    if ((kind === 'turret' || kind === 'comp') && !S[BUCKET[kind]].eq) S[BUCKET[kind]].eq = id;
    persist();
    return ok({ cost: x.price, lvl: 1 });
  };

  sys.upgrade = (kind, id) => {
    const d = D();
    if (kind === 'gear') {
      const it = sys.item(id); if (!it) return fail('sys.err.notOwned');
      const c = sys.price('gear', it); if (c == null) return fail('sys.err.maxLevel');
      if (!spend(c)) return fail('sys.err.noCrystals');
      it.lvl++; S.stats.upgrades++; track('upgrades', 1); persist();
      return ok({ cost: c, lvl: it.lvl });
    }
    if (!BUCKET[kind]) return fail('sys.err.invalid');
    const lvl = sys.level(kind, id); if (!lvl) return fail('sys.err.notOwned');
    const c = sys.price(kind, id, lvl); if (c == null) return fail('sys.err.maxLevel');
    if (!spend(c)) return fail('sys.err.noCrystals');
    S[BUCKET[kind]].lv[id] = lvl + 1; S.stats.upgrades++; track('upgrades', 1); persist();
    return ok({ cost: c, lvl: lvl + 1 });
  };

  // equip(kind, id): ship/weapon require owned; turret/comp accept null to unequip; gear: id = item id (null + slot via unequipGear)
  sys.equip = (kind, id) => {
    if (kind === 'gear') {
      const it = sys.item(id); if (!it) return fail('sys.err.notOwned');
      S.gear.eq[it.slot] = it.id; persist(); return ok({ slot: it.slot });
    }
    if (!BUCKET[kind]) return fail('sys.err.invalid');
    if (id == null) { if (kind === 'ship' || kind === 'weapon') return fail('sys.err.invalid'); S[BUCKET[kind]].eq = null; persist(); return ok(); }
    if (!sys.owned(kind, id)) return fail('sys.err.notOwned');
    S[BUCKET[kind]].eq = id; persist(); return ok();
  };
  sys.unequipGear = (slot) => { if (!(slot in S.gear.eq)) return fail('sys.err.invalid'); S.gear.eq[slot] = null; persist(); return ok(); };
  sys.isEquipped = (itemId) => Object.values(S.gear.eq).includes(itemId);

  // =====================================================================
  // GEAR: create, merge, sell
  // =====================================================================
  sys.makeItem = (r, slot) => {
    const d = D();
    slot = slot || d.GEAR_SLOTS[Math.floor(rand() * d.GEAR_SLOTS.length)].id;
    const names = d.GEAR_NAMES[slot][r];
    const set = rand() < d.GEAR.setChance[r] ? d.SETS[Math.floor(rand() * d.SETS.length)].id : null;
    S.gear.uid = (S.gear.uid || 0) + 1;
    return { id: 'g' + S.gear.uid.toString(36) + Math.floor(rand() * 1296).toString(36), slot, r, lvl: 1, q: +rr(d.GEAR.qRange[0], d.GEAR.qRange[1]).toFixed(3),
      nameKey: names[Math.floor(rand() * names.length)], set, ex: rollExtras(r) };
  };
  function rollExtras(r) {
    const d = D(), pool = d.EXTRA_STATS.map(e => e.id), out = [];
    for (let i = 0; i < d.GEAR.extrasByRarity[r]; i++) out.push({ id: pool.splice(Math.floor(rand() * pool.length), 1)[0], q: +rr(0.85, 1.15).toFixed(3) });
    return out;
  }
  sys.addItem = (r, slot) => { const it = sys.makeItem(r, slot); S.gear.items.push(it); dirty = true; return it; };

  // item derived values (for UI and computeStats)
  sys.itemStats = (it) => {
    const d = D(), sl = d.GEAR_SLOTS.find(s => s.id === it.slot);
    const main = sl.base * d.RARITY[it.r].mult * it.q * (1 + d.GEAR.lvlPer * (it.lvl - 1));
    const out = { [sl.main]: main };
    if (sl.sec) for (const k of Object.keys(sl.sec)) out[k] = (out[k] || 0) + main * sl.sec[k];
    for (const e of it.ex) out['ex_' + e.id] = (out['ex_' + e.id] || 0) + d.extraValue(e, it.r, it.lvl);
    return out; // hp/shd flat, cr/xp/speed/dashCd/crit percent, ex_<id> percent (ex_magnet px)
  };

  // merge 3 items with same slot AND same rarity -> 1 item of next rarity (level = max of the three)
  sys.merge = (ids) => {
    const d = D();
    if (!Array.isArray(ids) || ids.length !== 3 || new Set(ids).size !== 3) return fail('sys.err.mergeRule');
    const its = ids.map(sys.item); if (its.some(x => !x)) return fail('sys.err.notOwned');
    const { slot, r } = its[0];
    if (its.some(x => x.slot !== slot || x.r !== r)) return fail('sys.err.mergeRule');
    if (r >= 4) return fail('sys.err.maxRarity');
    const nr = r + 1, names = d.GEAR_NAMES[slot][nr];
    const cnt = {}; for (const x of its) if (x.set) cnt[x.set] = (cnt[x.set] || 0) + 1;
    let set = null, best = 0; for (const x of its) if (x.set && cnt[x.set] > best) { best = cnt[x.set]; set = x.set; }
    S.gear.uid = (S.gear.uid || 0) + 1;
    const ni = { id: 'g' + S.gear.uid.toString(36) + Math.floor(rand() * 1296).toString(36), slot, r: nr,
      lvl: Math.min(Math.max(...its.map(x => x.lvl)), d.GEAR.maxLvl(nr)), q: Math.max(...its.map(x => x.q)),
      nameKey: names[Math.floor(rand() * names.length)], set, ex: rollExtras(nr) };
    const wasEq = its.some(x => S.gear.eq[slot] === x.id);
    S.gear.items = S.gear.items.filter(x => !ids.includes(x.id));
    S.gear.items.push(ni);
    if (wasEq) S.gear.eq[slot] = ni.id;
    S.stats.merges++; persist();
    return ok({ item: ni, equipped: wasEq });
  };
  // groups of 3 that can be merged right now: [{slot, r, ids:[...all candidates]}]
  sys.mergeable = () => {
    const g = {};
    for (const it of S.gear.items) if (it.r < 4) (g[it.slot + ':' + it.r] = g[it.slot + ':' + it.r] || []).push(it);
    return Object.values(g).filter(a => a.length >= 3).map(a => ({ slot: a[0].slot, r: a[0].r, ids: a.sort((x, y) => y.lvl - x.lvl).map(x => x.id) }));
  };

  // manual multi-select sell. Equipped items are skipped (unequip first).
  sys.sell = (ids) => {
    if (!Array.isArray(ids)) ids = [ids];
    let cr = 0, n = 0, skipped = 0;
    const set = new Set(ids);
    S.gear.items = S.gear.items.filter(it => {
      if (!set.has(it.id)) return true;
      if (sys.isEquipped(it.id)) { skipped++; return true; }
      cr += D().GEAR.sellValue(it.r, it.lvl); n++; return false;
    });
    S.crystals += cr; S.stats.sold += n; persist();
    return ok({ crystals: cr, count: n, skipped });
  };
  sys.sellAll = (maxRarity = 0) => sys.sell(S.gear.items.filter(it => it.r <= maxRarity && !sys.isEquipped(it.id)).map(it => it.id));

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
    const items = rars.map(x => sys.addItem(x));
    const cr = Math.round(rr(c.bonusCr[0], c.bonusCr[1]));
    S.crystals += cr; S.stats.crEarned += cr;
    const cons = {};
    for (let i = 0; i < c.cons; i++) { const k = d.CONSUMABLES[Math.floor(rand() * d.CONSUMABLES.length)].id; cons[k] = (cons[k] || 0) + 1; }
    for (const k of Object.keys(cons)) S.cons[k] = Math.min(d.CONS_STOCK_MAX, S.cons[k] + cons[k]);
    S.stats.chestsOpened++; track('chestsOpened', 1); persist();
    return ok({ rarity: r, items, crystals: cr, cons, pity, pityCount: S.pity });
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
    for (const id of Object.values(s.gear.eq)) { const it = id && s.gear.items.find(i => i.id === id); if (it && it.set) c[it.set] = (c[it.set] || 0) + 1; }
    return c;
  };
  sys.computeStats = (s = S) => {
    const d = D(), B = d.BASE;
    const ship = d.SHIPS.find(x => x.id === s.ships.eq) || d.SHIPS[0];
    const shipLvl = s.ships.lv[ship.id] || 1, shipM = 1 + d.SHIP_UP.per * (shipLvl - 1);
    const acct = d.levelFromXp(s.xp), lm = 1 + d.LEVEL_BONUS * (acct.lvl - 1);
    const m = { atk: 0, hp: 0, shd: 0, rate: 0, speed: 0, crit: 0, critDmg: 0, dashCd: 0, regen: 0, cr: 0, xp: 0, hpPct: 0 };
    const addMods = o => { if (o) for (const k of Object.keys(o)) m[k] = (m[k] || 0) + o[k]; };
    addMods(ship.perk.mods);
    // gear
    const g = { hp: 0, shd: 0, cr: 0, xp: 0, speed: 0, dashCd: 0, crit: 0, ex_crit: 0, ex_rate: 0, ex_xp: 0, ex_regen: 0, ex_magnet: 0 };
    const gearEq = {};
    for (const sl of d.GEAR_SLOTS) {
      const id = s.gear.eq[sl.id], it = id && s.gear.items.find(i => i.id === id); if (!it) continue;
      gearEq[sl.id] = it;
      const st = sys.itemStats(it);
      for (const k of Object.keys(st)) g[k] = (g[k] || 0) + st[k];
    }
    const sets = sys.setCounts(s);
    for (const set of d.SETS) { const n = sets[set.id] || 0; if (n >= 2) addMods(set.b2); if (n >= 4) addMods(set.b4); }
    // weapon / turret / comp
    const wdef = d.WEAPONS.find(w => w.id === s.weapons.eq) || d.WEAPONS[0], wl = s.weapons.lv[wdef.id] || 1;
    const tdef = s.turrets.eq ? d.TURRETS.find(t => t.id === s.turrets.eq) : null, tl = tdef ? (s.turrets.lv[tdef.id] || 1) : 0;
    const cdef = s.comps.eq ? d.COMPANIONS.find(c => c.id === s.comps.eq) : null, cl = cdef ? (s.comps.lv[cdef.id] || 1) : 0;

    const atk = B.atk * ship.mult.atk * shipM * lm * (1 + m.atk);
    const hp = (B.hp * ship.mult.hp * shipM + g.hp) * lm * (1 + m.hp + m.hpPct);
    const shd = (B.shd * ship.mult.shd * shipM + g.shd) * lm * (1 + m.shd);
    const rate = ship.mult.rate * (1 + m.rate + g.ex_rate / 100);
    const crit = Math.min(0.75, m.crit + g.crit / 100 + g.ex_crit / 100);
    const critDmg = B.critDmg + m.critDmg;
    const speed = ship.mult.speed * (1 + m.speed + g.speed / 100);
    const dashCd = B.dashCd * Math.max(0.4, 1 + m.dashCd - g.dashCd / 100);
    // 3.1: regen = BASE.regen (0.5) x (1 + bonus), bonus (perk + sets + gear extras + guardian) capped at REGEN_BONUS_CAP
    const regenBonus = m.regen + g.ex_regen / 100 + (cdef && cdef.regenAura ? cdef.regenAura : 0);
    const regen = (B.regen != null ? B.regen : 1) * (1 + Math.min(d.REGEN_BONUS_CAP != null ? d.REGEN_BONUS_CAP : 99, regenBonus));
    const crMult = 1 + m.cr + g.cr / 100, xpMult = 1 + m.xp + g.xp / 100 + g.ex_xp / 100;
    const magnet = B.magnet + g.ex_magnet;
    const wDmg = 1 + d.WEAPON_UP.per * (wl - 1);
    const critF = 1 + crit * (critDmg - 1);
    const dps = atk * wdef.power * wDmg * rate * critF;
    const tMult = tdef ? 1 + d.TURRET_UP.per * (tl - 1) : 0;
    const tdps = tdef ? atk * tdef.power * tMult * critF : 0;
    const cFrac = cdef ? d.COMP_UP.base * (1 + d.COMP_UP.per * (cl - 1)) : 0;
    const cdps = cdef ? atk * cFrac * cdef.guns * rate * 4 * (1 + (cdef.crit || 0)) : 0;
    const P = d.POWER;
    const st = {
      shipId: ship.id, ship, shipLvl, shipMaxLvl: d.SHIP_UP.maxLvl(ship.r), lvl: acct.lvl,
      atk: Math.round(atk), hp: Math.round(hp), shd: Math.round(shd),
      rate, crit, critDmg, speed, dashCd, regen, regenBonus, crMult, xpMult, magnet,
      flags: Object.assign({}, ship.perk.flags || {}), perk: ship.perk.id,
      weapon: { id: wdef.id, def: wdef, lvl: wl, dmgMult: wDmg },
      turret: tdef ? { id: tdef.id, def: tdef, lvl: tl, dmgMult: tMult } : null,
      comp: cdef ? { id: cdef.id, def: cdef, lvl: cl, dmgFrac: cFrac } : null,
      gear: gearEq, sets,
      dps: Math.round(dps + tdps + cdps),
      power: Math.round((dps + tdps + cdps) * P.dps + hp * P.hp + shd * P.shd),
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
    track('combo', r.combo || 0); track('sector', r.sector || 0);
    S.top.push({ score: r.score || 0, sector: r.sector || 0, ship: S.ships.eq, date: sys.now(), kills: r.kills || 0, time: Math.round(r.time || 0) });
    S.top.sort((a, b) => b.score - a.score); S.top = S.top.slice(0, 10);
    persist();
    return { xpGain, lvlBefore, lvlAfter, best: S.best, isBest };
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
      S.missions.bonus = true; grant(D().MISSION_BONUS); persist(); return ok({ reward: D().MISSION_BONUS });
    }
    const m = S.missions.list.find(x => x.id === id); if (!m) return fail('sys.err.invalid');
    if (m.claimed) return fail('sys.err.claimed');
    if (m.prog < m.goal) return fail('sys.err.notDone');
    m.claimed = true; grant(m.reward); S.stats.missions++; persist();
    return ok({ reward: m.reward });
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
    S.ach[id] = true; grant(a.reward); persist(); return ok({ reward: a.reward });
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
    S.daily = { last: dayKey(t), streak: st.streak }; grant(st.reward); persist();
    return ok({ reward: st.reward, streak: st.streak, day: st.day });
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
