'use strict';
// Neon Comet - STORY MODE systems (agent "data"). Save lives in the normal save object as S.story (kept by NC.store.fill; never dropped).
// S.story = {prog:{'1-1':{stars,best,done}}, crew:{id:{lvl,xp,items:{cw,imp,art}}}, team:['kael'], items:[{uid,id,r,lvl}], uid:0, clues:{}, chestsClaimed:[], fragments:0}
// Mutating calls return {ok:true,...} | {ok:false, err:'story.err.*'} and persist through NC.sys.save().
(function (NC) {
  const ST = () => NC.STORY;
  const api = {};
  const ok = o => Object.assign({ ok: true }, o || {});
  const fail = err => ({ ok: false, err });
  const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d;
  const clampI = (v, a, b) => Math.max(a, Math.min(b, Math.floor(num(v, a))));
  const rnd = () => (NC.sys && NC.sys.rng ? NC.sys.rng() : Math.random());
  const pick = a => a[Math.floor(rnd() * a.length) % a.length];
  const checked = (typeof WeakSet !== 'undefined') ? new WeakSet() : null;

  const root = () => (NC.sys && NC.sys.state && NC.sys.state()) || NC.save || null;
  const persist = () => { try { if (NC.sys && NC.sys.save) NC.sys.save(); } catch (e) {} };

  function defaults() {
    return { prog: {}, crew: {}, team: ['kael'], items: [], uid: 0, clues: {}, chestsClaimed: [], fragments: 0 };
  }
  function sanitize(s) {
    const D = ST(), d = defaults();
    for (const k of Object.keys(d)) if (s[k] === undefined || s[k] === null || typeof s[k] !== typeof d[k] || Array.isArray(s[k]) !== Array.isArray(d[k])) s[k] = d[k];
    s.fragments = clampI(s.fragments, 0, 7); s.uid = clampI(s.uid, 0, 1e9);
    for (const k of Object.keys(s.prog)) {
      const p = s.prog[k];
      if (!p || typeof p !== 'object' || !D.level(k)) { delete s.prog[k]; continue; }
      p.stars = clampI(p.stars, 0, 3); p.best = num(p.best, 0) > 0 ? p.best : 0; p.done = !!p.done || p.stars > 0;
    }
    s.items = s.items.filter(it => it && D.itemById[it.id]);
    const seen = {};
    for (const it of s.items) {
      it.r = clampI(it.r, 0, 4); it.lvl = clampI(it.lvl || 1, 1, 150);
      if (typeof it.uid !== 'string' || seen[it.uid]) { s.uid++; it.uid = 'u' + s.uid.toString(36); }
      seen[it.uid] = 1;
    }
    for (const id of D.crewOrder) {
      const c = s.crew[id] = (s.crew[id] && typeof s.crew[id] === 'object') ? s.crew[id] : {};
      c.lvl = clampI(c.lvl || 1, 1, D.crewScale.maxLvl); c.xp = Math.max(0, Math.floor(num(c.xp, 0)));
      if (!c.items || typeof c.items !== 'object') c.items = {};
      for (const sl of D.slots) {
        const u = c.items[sl]; const it = u && s.items.find(i => i.uid === u);
        c.items[sl] = (it && D.itemById[it.id].slot === sl) ? u : null;
      }
    }
    // an item can be worn by one member only
    const worn = {};
    for (const id of D.crewOrder) for (const sl of D.slots) { const u = s.crew[id].items[sl]; if (!u) continue; if (worn[u]) s.crew[id].items[sl] = null; else worn[u] = 1; }
    for (const k of Object.keys(s.clues)) if (!D.clues[k]) delete s.clues[k]; else s.clues[k] = true;
    s.chestsClaimed = s.chestsClaimed.filter(x => typeof x === 'string');
    return s;
  }
  // S.story of the current save (created / repaired lazily, safe for old saves)
  function S() {
    const r = root(); if (!r) return null;
    if (!r.story || typeof r.story !== 'object' || Array.isArray(r.story)) r.story = defaults();
    if (!checked || !checked.has(r.story)) { sanitize(r.story); if (checked) checked.add(r.story); }
    return r.story;
  }
  api.state = S;
  api.def = id => ST().crew[id] || null;

  // ---------------- progress / levels ----------------
  const levelIds = () => { const o = []; for (const c of ST().chapters) for (const l of c.levels) o.push(l.id); return o; };
  const prevLevel = id => { const ids = levelIds(), i = ids.indexOf(id); return i > 0 ? ids[i - 1] : null; };
  api.levelState = id => {
    const s = S(), D = ST(), l = D.level(id); if (!l) return null;
    const p = (s && s.prog[id]) || { stars: 0, best: 0, done: false };
    return { id, stars: p.stars, best: p.best, done: !!p.done, unlocked: api.unlocked(id), boss: l.boss || null, par: l.par };
  };
  api.unlocked = id => {
    const s = S(), D = ST(), l = D.level(id); if (!l || !s) return false;
    const ch = D.chapterOf(id); if (!ch || ch.locked) return false;
    const pv = prevLevel(id); return !pv || !!(s.prog[pv] && s.prog[pv].done);
  };
  api.chapterStars = (chId = 1) => {
    const s = S(), ch = ST().chapters.find(c => c.id === chId); if (!s || !ch) return 0;
    return ch.levels.reduce((a, l) => a + ((s.prog[l.id] && s.prog[l.id].stars) || 0), 0);
  };
  api.progress = () => {
    const s = S(), D = ST(); let stars = 0, done = 0, next = null;
    for (const id of levelIds()) { const p = s.prog[id]; if (p && p.done) { done++; stars += p.stars; } else if (!next && api.unlocked(id)) next = id; }
    return { stars, done, next, total: levelIds().length, fragments: s.fragments, clues: Object.keys(s.clues).length, chapters: D.chapters.map(c => ({ id: c.id, locked: !!c.locked, stars: api.chapterStars(c.id), levels: c.levels.length })) };
  };

  // ---------------- crew ----------------
  api.crewUnlocked = id => {
    const s = S(), c = ST().crew[id]; if (!c || !s) return false;
    if (!c.unlock) return true;
    const p = s.prog[c.unlock]; return !!(p && p.done);
  };
  api.crewList = () => ST().crewOrder.map(id => Object.assign({ unlocked: api.crewUnlocked(id) }, api.crew(id)));
  api.crew = id => {
    const s = S(), def = ST().crew[id]; if (!s || !def) return null;
    const c = s.crew[id], D = ST().crewScale;
    return { id, def, lvl: c.lvl, xp: c.xp, need: c.lvl >= D.maxLvl ? 0 : D.xpFor(c.lvl), items: Object.assign({}, c.items), canLevel: c.lvl < D.maxLvl && c.xp >= D.xpFor(c.lvl) };
  };
  api.team = () => {
    const s = S(); const t = s.team.filter((id, i) => ST().crew[id] && api.crewUnlocked(id) && s.team.indexOf(id) === i).slice(0, ST().crewScale.teamMax);
    return t.length ? t : ['kael'];
  };
  api.setTeam = ids => {
    const s = S(); if (!Array.isArray(ids)) return fail('story.err.invalid');
    const t = []; for (const id of ids) { if (!ST().crew[id] || !api.crewUnlocked(id)) return fail('story.err.locked'); if (!t.includes(id)) t.push(id); }
    if (!t.length || t.length > ST().crewScale.teamMax) return fail('story.err.team');
    s.team = t; persist(); return ok({ team: t.slice() });
  };
  api.levelUpCrew = id => {
    const s = S(), D = ST().crewScale; if (!ST().crew[id] || !api.crewUnlocked(id)) return fail('story.err.locked');
    const c = s.crew[id]; if (c.lvl >= D.maxLvl) return fail('story.err.maxLevel');
    const need = D.xpFor(c.lvl); if (c.xp < need) return fail('story.err.noXp');
    c.xp -= need; c.lvl++; persist(); return ok({ lvl: c.lvl });
  };
  api.addCrewXp = (id, n) => { const s = S(); if (s && s.crew[id] && n > 0) { s.crew[id].xp += Math.floor(n); return true; } return false; };

  // ---------------- crew items ----------------
  // 4.0: crew items level by the CREW category (NC.sys.catLevel('crew'), 1..150, upgraded with ore_crew). it.lvl is a mirror.
  const crewL = () => (NC.sys && NC.sys.catLevel ? NC.sys.catLevel('crew') : 1);
  const effMul = it => ST().rmult[it.r] * ST().crewItemMult(crewL());
  api.items = () => S().items.map(it => Object.assign({}, it, { def: ST().itemById[it.id], holder: api.holder(it.uid) }));
  api.item = uid => S().items.find(i => i.uid === uid) || null;
  api.itemInfo = it => {  // derived numbers for UI: {pow,cd,dur (fractions), ship:{stat:frac}, maxLvl, upCost, sell}
    const d = ST().itemById[it.id], m = effMul(it), ship = {};
    for (const k of Object.keys(d.ship)) ship[k] = d.ship[k] * m;
    const L = crewL(), c = NC.DATA && NC.DATA.catCost ? NC.DATA.catCost(L) : null;
    return { pow: (d.fx.pow || 0) * m, cd: (d.fx.cd || 0) * m, dur: (d.fx.dur || 0) * m, ship, lvl: L, maxLvl: 150, tier: NC.DATA ? NC.DATA.tierFromLevel(L) : 0,
      upCost: c ? c.cr : null, upOre: c ? c.ore : null, sell: ST().itemSell(it.r, 1), sellOre: ST().itemSellOre(it.r) };
  };
  api.holder = uid => { const s = S(); for (const id of ST().crewOrder) for (const sl of ST().slots) if (s.crew[id].items[sl] === uid) return id; return null; };
  // addItem(r, slot?, defId?) -> new item
  api.addItem = (r, slot, defId) => {
    const s = S(), D = ST(); r = clampI(r, 0, 4);
    const pool = defId && D.itemById[defId] ? [D.itemById[defId]] : D.items.filter(i => !slot || i.slot === slot);
    const d = pick(pool.length ? pool : D.items);
    s.uid++; const it = { uid: 'u' + s.uid.toString(36), id: d.id, r, lvl: 1 };
    s.items.push(it); return it;
  };
  api.equipItem = (cid, uid) => {
    const s = S(), it = api.item(uid); if (!it || !ST().crew[cid] || !api.crewUnlocked(cid)) return fail('story.err.invalid');
    const sl = ST().itemById[it.id].slot, prev = api.holder(uid);
    if (prev) s.crew[prev].items[Object.keys(s.crew[prev].items).find(k => s.crew[prev].items[k] === uid)] = null;
    s.crew[cid].items[sl] = uid; persist(); return ok({ slot: sl, from: prev });
  };
  api.unequip = (cid, slot) => {
    const s = S(); if (!s.crew[cid] || !ST().slots.includes(slot)) return fail('story.err.invalid');
    s.crew[cid].items[slot] = null; persist(); return ok();
  };
  api.upgradeItem = uid => {
    const s = S(), it = api.item(uid); if (!it) return fail('story.err.invalid');
    const res = NC.sys.upgradeCat('crew'); if (!res.ok) return res.err === 'sys.err.maxLevel' ? fail('story.err.maxLevel') : res;
    for (const x of s.items) x.lvl = res.lvl; persist(); return ok({ lvl: res.lvl, cost: res.cost });   // 4.0: levels ALL crew items
  };
  api.sellItem = uid => {
    const s = S(), it = api.item(uid); if (!it) return fail('story.err.invalid');
    if (api.holder(uid)) return fail('story.err.equipped');
    const inf = api.itemInfo(it), v = inf.sell; s.items = s.items.filter(i => i !== it); root().crystals += v; if (NC.sys.addOre) NC.sys.addOre('ore_crew', inf.sellOre); persist(); return ok({ cr: v, ores: { ore_crew: inf.sellOre } });
  };
  // merge 3 items, same slot AND same rarity -> 1 random item of that slot, next rarity; level = max of three (capped)
  api.mergeItems = uids => {
    const s = S(), D = ST();
    if (!Array.isArray(uids) || uids.length !== 3 || new Set(uids).size !== 3) return fail('story.err.mergeRule');
    const its = uids.map(api.item); if (its.some(x => !x)) return fail('story.err.invalid');
    const slot = D.itemById[its[0].id].slot, r = its[0].r;
    if (its.some(x => D.itemById[x.id].slot !== slot || x.r !== r)) return fail('story.err.mergeRule');
    if (r >= 4) return fail('story.err.maxRarity');
    const holders = uids.map(api.holder).filter(Boolean);
    for (const h of holders) for (const sl of D.slots) if (uids.includes(s.crew[h].items[sl])) s.crew[h].items[sl] = null;
    s.items = s.items.filter(i => !uids.includes(i.uid));
    const ni = api.addItem(r + 1, slot); ni.lvl = Math.min(Math.max(...its.map(x => x.lvl)), D.itemMaxLvl(r + 1));
    if (holders.length) s.crew[holders[0]].items[slot] = ni.uid;
    persist(); return ok({ item: ni });
  };
  api.mergeable = () => {
    const g = {}; for (const it of S().items) if (it.r < 4) (g[ST().itemById[it.id].slot + ':' + it.r] = g[ST().itemById[it.id].slot + ':' + it.r] || []).push(it.uid);
    return Object.keys(g).filter(k => g[k].length >= 3).map(k => ({ slot: k.split(':')[0], r: +k.split(':')[1], uids: g[k] }));
  };

  // ---------------- derived stats ----------------
  function itemSum(cid) {
    const s = S(), tot = { pow: 0, cd: 0, dur: 0, ship: {} };
    for (const sl of ST().slots) {
      const it = api.item(s.crew[cid].items[sl]); if (!it) continue;
      const i = api.itemInfo(it); tot.pow += i.pow; tot.cd += i.cd; tot.dur += i.dur;
      for (const k of Object.keys(i.ship)) tot.ship[k] = (tot.ship[k] || 0) + i.ship[k];
    }
    return tot;
  }
  // -> {cd (s), dur (s), power}
  api.abilityStats = cid => {
    const s = S(), def = ST().crew[cid]; if (!def || !s) return null;
    const D = ST().crewScale, lv = s.crew[cid].lvl - 1, t = itemSum(cid), a = def.ability;
    return { id: a.id, cd: +(a.cd * (1 - D.cd * lv) * (1 - Math.min(D.cdCap, t.cd))).toFixed(2), dur: +(a.dur * (1 + D.dur * lv) * (1 + t.dur)).toFixed(2), power: +(a.power * (1 + D.power * lv) * (1 + t.pow)).toFixed(3) };
  };
  // team passives + ship stat bonuses from worn crew items (fractions, 0.10 = +10%)
  api.passiveStats = ids => {
    const s = S(), D = ST(), out = { dmg: 0, crit: 0, shdRegen: 0, hp: 0, magnet: 0, dash: 0, cr: 0, xp: 0 };
    if (!s) return out;
    for (const cid of (Array.isArray(ids) ? ids : api.team())) {
      const def = D.crew[cid]; if (!def || !s.crew[cid] || !api.crewUnlocked(cid)) continue;
      out[def.passive.stat] += def.passive.v * (1 + D.crewScale.passive * (s.crew[cid].lvl - 1));
      const t = itemSum(cid); for (const k of Object.keys(t.ship)) out[k] = (out[k] || 0) + t.ship[k];
    }
    return out;
  };

  // ---------------- clues, chests ----------------
  api.addClue = id => { const s = S(); if (!ST().clues[id] || s.clues[id]) return false; s.clues[id] = true; persist(); return true; };
  api.hasClue = id => !!S().clues[id];
  api.clues = () => Object.keys(ST().clues).map(id => ({ id, found: !!S().clues[id], def: ST().clues[id] }));
  const chestKey = (ch, n) => ch + ':' + n;
  api.chestAvailable = (n, chId = 1) => {
    const ch = ST().chapters.find(c => c.id === chId); if (!ch || !ch.chests[n]) return false;
    return api.chapterStars(chId) >= n && !S().chestsClaimed.includes(chestKey(chId, n));
  };
  api.chestClaimed = (n, chId = 1) => S().chestsClaimed.includes(chestKey(chId, n));
  function grant(rw, out) {
    const r = root(); out = out || { cr: 0, items: [] };
    if (rw.cr) { r.crystals += rw.cr; if (r.stats) r.stats.crEarned = (r.stats.crEarned || 0) + rw.cr; out.cr += rw.cr; }
    // 4.0 ores: rw.ores {ore_x:n} exact + rw.oreAny n split over random hangar categories
    out.ores = out.ores || {};
    const o = Object.assign({}, rw.ores || {}); if (rw.oreAny && NC.sys.rollOres) { const x = NC.sys.rollOres(rw.oreAny); for (const k of Object.keys(x)) o[k] = (o[k] || 0) + x[k]; }
    for (const k of Object.keys(o)) { if (NC.sys.addOre) NC.sys.addOre(k, o[k]); out.ores[k] = (out.ores[k] || 0) + o[k]; }
    for (const it of (rw.items || [])) out.items.push(api.addItem(it.r, it.slot, it.id));
    if (rw.gearChest != null && Array.isArray(r.chests)) { r.chests[rw.gearChest] = (r.chests[rw.gearChest] || 0) + 1; out.gearChest = rw.gearChest; }
    return out;
  }
  api.claimChest = (n, chId = 1) => {
    if (!api.chestAvailable(n, chId)) return fail('story.err.noChest');
    const rw = ST().chapters.find(c => c.id === chId).chests[n];
    S().chestsClaimed.push(chestKey(chId, n)); const out = grant(rw); persist(); return ok({ rewards: out });
  };

  // ---------------- finish a level ----------------
  api.starsFor = (id, hpFrac, time) => {
    const l = ST().level(id), R = ST().starRules; if (!l) return 0;
    hpFrac = num(hpFrac, 0); time = num(time, 1e9);
    return hpFrac >= R.three && time <= l.par ? 3 : hpFrac >= R.two ? 2 : 1;
  };
  // finishLevel(id, {hpFrac, time, won}) -> {stars, rewards:{cr,xp,items,first,clue,fragment,newCrew,crewXp}} (won false -> {stars:0, rewards:null})
  api.finishLevel = (id, res) => {
    const s = S(), D = ST(), l = D.level(id); res = res || {};
    if (!l || !s) return { stars: 0, rewards: null };
    if (!res.won) return { stars: 0, rewards: null };
    const p = s.prog[id] = s.prog[id] || { stars: 0, best: 0, done: false };
    const first = !p.done, before = D.crewOrder.filter(api.crewUnlocked);
    const stars = api.starsFor(id, res.hpFrac, res.time);
    p.stars = Math.max(p.stars, stars); p.done = true;
    if (num(res.time, 0) > 0 && (!p.best || res.time < p.best)) p.best = Math.round(res.time * 10) / 10;
    const rw = { cr: 0, items: [] }, ric = l.reward.item;
    let xp = l.reward.xp;
    const bundle = { cr: l.reward.cr, items: [], ores: Object.assign({}, l.reward.ores || {}), oreAny: l.reward.oreAny || 0 };
    if (ric && rnd() < (ric.chance == null ? 1 : ric.chance)) bundle.items.push({ r: ric.r, slot: ric.slot, id: ric.id });
    if (first && l.first) {
      bundle.cr += l.first.cr || 0; xp += l.first.xp || 0;
      for (const k of Object.keys(l.first.ores || {})) bundle.ores[k] = (bundle.ores[k] || 0) + l.first.ores[k];
      bundle.oreAny += l.first.oreAny || 0;
      if (l.first.item) bundle.items.push({ r: l.first.item.r, slot: l.first.item.slot, id: l.first.item.id });
      if (l.first.fragment) { s.fragments = Math.max(s.fragments, l.first.fragment); rw.fragment = l.first.fragment; }
    }
    grant(bundle, rw); rw.xp = xp; rw.first = first; rw.stars = stars;
    // crew XP: team gets full, unlocked bench a share (after this level's unlocks are not counted: they start fresh)
    const team = api.team(); rw.crewXp = {};
    for (const cid of before) { const n = Math.round(xp * (team.includes(cid) ? 1 : D.crewScale.benchShare)); if (api.addCrewXp(cid, n)) rw.crewXp[cid] = n; }
    if (l.clue && api.addClue(l.clue)) rw.clue = l.clue; else if (l.clue) rw.clue = null;
    rw.newCrew = D.crewOrder.filter(c => api.crewUnlocked(c) && !before.includes(c));
    if (r_stats()) { const st = root().stats; st.storyLevels = (st.storyLevels || 0) + (first ? 1 : 0); }
    persist(); return { stars, rewards: rw };
  };
  const r_stats = () => { const r = root(); return !!(r && r.stats); };

  NC.story = NC.story || {};
  NC.story.sys = api;
  api.sanitize = () => { const r = root(); if (r) { r.story = r.story || defaults(); sanitize(r.story); } return r && r.story; };
})(window.NC = window.NC || {});
