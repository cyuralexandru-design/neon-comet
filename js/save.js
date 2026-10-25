'use strict';
// Neon Comet 3.0 - save storage, backup, migration v3 -> v4, export/import (SYSTEMS agent).
// API: NC.store (low level). Game code should use NC.sys.load()/save() instead.
(function (NC) {
  const KEY = 'neonComet.v4', BAK = 'neonComet.v4.bak', V3 = 'neonComet.v3', V3BAK = 'neonComet.v3.bak';
  const D = () => NC.DATA;
  const ls = () => { try { return (typeof localStorage !== 'undefined') ? localStorage : null; } catch (e) { return null; } };

  const defaultSettings = () => ({
    lang: null, ctrl: null, aim: null, hand: 'right', music: 0.55, sfx: 0.8, vibe: true, shake: true, dmgNum: true,
    quality: 'high', fps: false, joySize: 1, btnAlpha: 0.85, colorblind: false,
    fpsCap: 60,            // 3.1 (SPEC-31 §2.10): 60 | 120; older saves get 60 through fill() + sanitize()
  });
  const defaultStats = () => ({
    runs: 0, kills: 0, bosses: 0, mbosses: 0, maxCombo: 0, playtime: 0, crEarned: 0, chests: 0, chestsOpened: 0, revives: 0,
    stars: 0, maxSector: 0, merges: 0, sold: 0, upgrades: 0, consUsed: 0, cards: 0, evos: 0, missions: 0, dashes: 0, events: 0, bestTime: 0,
  });
  const defaultSave = () => ({
    v: 4, crystals: 0, best: 0, xp: 0,
    ships: { eq: 'vanator', lv: { vanator: 1 } },           // owned = keys of lv, value = upgrade level
    weapons: { eq: 'laser', lv: { laser: 1 } },
    turrets: { eq: null, lv: {} },
    comps: { eq: null, lv: {} },
    gear: { items: [], eq: { armor: null, gen: null, core: null, boost: null }, uid: 0 },
    chests: [0, 0, 0, 0, 0], pity: 0,
    cons: { mine: 0, shield: 0, magnet: 0, x2: 0, repair: 0 },
    loadout: [],                                            // [{id, n}] up to 3 types x up to 3 units
    stats: defaultStats(),
    top: [], daily: { last: null, streak: 0 },
    missions: { day: null, list: [], bonus: false },
    ach: {}, offline: { min: 0, cr: 0 }, tut: false, settings: defaultSettings(),
    created: Date.now(), saved: 0, lastSeen: 0, migration: null,
  });

  // deep-merge defaults into a loaded object (keeps unknown keys, never drops data)
  function fill(def, src) {
    if (src === undefined || src === null) return def;
    if (typeof def !== 'object' || def === null || Array.isArray(def)) return src;
    if (typeof src !== 'object' || Array.isArray(src)) return def;
    const out = {};
    for (const k of Object.keys(def)) out[k] = (k in src) ? fill(def[k], src[k]) : def[k];
    for (const k of Object.keys(src)) if (!(k in out)) out[k] = src[k];
    return out;
  }
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v)) ? v : d;

  // ---------- integrity: repair impossible states instead of failing ----------
  function sanitize(s) {
    const d = D();
    s.crystals = Math.max(0, Math.floor(num(s.crystals))); s.best = Math.max(0, num(s.best)); s.xp = Math.max(0, num(s.xp));
    const clampLv = (obj, list, maxFn) => { for (const k of Object.keys(obj)) { const def = list.find(x => x.id === k); if (!def) continue; obj[k] = NC.clamp(Math.floor(num(obj[k], 1)), 1, maxFn(def)); } };
    clampLv(s.ships.lv, d.SHIPS, x => d.SHIP_UP.maxLvl(x.r));
    clampLv(s.weapons.lv, d.WEAPONS, () => d.WEAPON_UP.maxLvl);
    clampLv(s.turrets.lv, d.TURRETS, () => d.TURRET_UP.maxLvl);
    clampLv(s.comps.lv, d.COMPANIONS, () => d.COMP_UP.maxLvl);
    if (!s.ships.lv.vanator) s.ships.lv.vanator = 1;
    if (!s.weapons.lv.laser) s.weapons.lv.laser = 1;
    if (!s.ships.lv[s.ships.eq]) s.ships.eq = 'vanator';
    if (!s.weapons.lv[s.weapons.eq]) s.weapons.eq = 'laser';
    if (s.turrets.eq && !s.turrets.lv[s.turrets.eq]) s.turrets.eq = null;
    if (s.comps.eq && !s.comps.lv[s.comps.eq]) s.comps.eq = null;
    if (!Array.isArray(s.gear.items)) s.gear.items = [];
    s.gear.items = s.gear.items.filter(it => it && it.id && d.GEAR_SLOTS.some(x => x.id === it.slot));
    for (const it of s.gear.items) { it.r = NC.clamp(Math.floor(num(it.r)), 0, 4); it.lvl = NC.clamp(Math.floor(num(it.lvl, 1)), 1, d.GEAR.maxLvl(it.r)); it.q = num(it.q, 1); if (!Array.isArray(it.ex)) it.ex = []; }
    for (const sl of Object.keys(s.gear.eq)) { const it = s.gear.items.find(i => i.id === s.gear.eq[sl]); if (!it || it.slot !== sl) s.gear.eq[sl] = null; }
    if (!Array.isArray(s.chests)) s.chests = [0, 0, 0, 0, 0];
    while (s.chests.length < 5) s.chests.push(0);
    s.chests = s.chests.slice(0, 5).map(n => Math.max(0, Math.floor(num(n))));
    for (const c of d.CONSUMABLES) s.cons[c.id] = NC.clamp(Math.floor(num(s.cons[c.id])), 0, d.CONS_STOCK_MAX);
    if (!Array.isArray(s.loadout)) s.loadout = [];
    s.loadout = s.loadout.filter(l => l && d.CONSUMABLES.some(c => c.id === l.id)).slice(0, d.CONS_MAX_TYPES);
    for (const k of Object.keys(s.stats)) s.stats[k] = num(s.stats[k]);
    if (!s.settings || typeof s.settings !== 'object' || Array.isArray(s.settings)) s.settings = defaultSettings();
    s.settings.fpsCap = +s.settings.fpsCap === 120 ? 120 : 60;
    return s;
  }

  // ---------- v3 -> v4 ----------
  const V2_BASE_COST = { atk: l => Math.round(50 * Math.pow(1.16, l)), hp: l => Math.round(40 * Math.pow(1.15, l)), shd: l => Math.round(40 * Math.pow(1.15, l)) };
  const V3_GEAR_SELL = (r, lvl) => Math.round(40 * [1, 2, 3.6, 6.5][NC.clamp(r, 0, 3)] * (1 + 0.3 * (lvl - 1)));
  const SHIP_MAP = { scout: 'vanator', solaris: 'solaris', umbra: 'umbra', vipera: 'raptor', titan: 'fregata', nova: 'nova' };
  const TUR_MAP = { pulse: 'pulse', twin: 'pulse', missile: 'rocket', arc: 'arc' };
  const COMP_MAP = { alfa: 'wing', soim: 'orb', spectru: 'phantom', gardian: 'guardian' };
  const REFUND_MULT = 2; // v4 prices are ~5x v3, refunds are doubled so converted crystals keep their value

  function migrateV3(o) {
    const d = D(), s = defaultSave(), rep = { from: 3, crystals: 0, refund: 0, ships: [], turrets: [], comps: [], gear: 0, gearRefund: 0, chests: 0 };
    s.crystals = Math.max(0, Math.floor(num(o.credits)));
    s.best = num(o.best); s.xp = num(o.xp);
    s.created = num(o.created, Date.now());
    // base stat levels -> refund
    let refund = 0;
    const base = o.base || {};
    for (const k of ['atk', 'hp', 'shd']) for (let l = 0; l < Math.min(500, num(base[k])); l++) refund += V2_BASE_COST[k](l);
    // ships
    const owned = (o.ships && Array.isArray(o.ships.owned)) ? o.ships.owned : ['scout'];
    for (const id of owned) { const n = SHIP_MAP[id]; if (n && !s.ships.lv[n]) { s.ships.lv[n] = 1; rep.ships.push(n); } }
    const eqShip = o.ships && SHIP_MAP[o.ships.eq]; s.ships.eq = eqShip && s.ships.lv[eqShip] ? eqShip : 'vanator';
    // turrets (v3 lv 0..10 -> v4 1..20). twin -> pulse with +3 levels
    const t3 = o.turrets || {}, tlv = t3.lv || {};
    for (const id of (t3.owned || [])) {
      const n = TUR_MAP[id]; if (!n) continue;
      const lvl = NC.clamp(1 + num(tlv[id]) + (id === 'twin' ? 3 : 0), 1, d.TURRET_UP.maxLvl);
      s.turrets.lv[n] = Math.max(s.turrets.lv[n] || 0, lvl); rep.turrets.push(n);
    }
    if (t3.eq && TUR_MAP[t3.eq] && s.turrets.lv[TUR_MAP[t3.eq]]) s.turrets.eq = TUR_MAP[t3.eq];
    const c3 = o.comps || {}, clv = c3.lv || {};
    for (const id of (c3.owned || [])) {
      const n = COMP_MAP[id]; if (!n) continue;
      s.comps.lv[n] = Math.max(s.comps.lv[n] || 0, NC.clamp(1 + num(clv[id]), 1, d.COMP_UP.maxLvl)); rep.comps.push(n);
    }
    if (c3.eq && COMP_MAP[c3.eq] && s.comps.lv[COMP_MAP[c3.eq]]) s.comps.eq = COMP_MAP[c3.eq];
    // gear: weapon slot -> refund (v4 sell value), others keep slot/rarity/level
    const g3 = o.gear || {}, items = Array.isArray(g3.items) ? g3.items : [], eq3 = g3.eq || {};
    let gearRefund = 0, uid = 0;
    for (const it of items) {
      if (!it || typeof it !== 'object') continue;
      const r = NC.clamp(Math.floor(num(it.r)), 0, 3), lvl = Math.max(1, Math.floor(num(it.lvl, 1)));
      if (!['armor', 'gen', 'core'].includes(it.slot)) { gearRefund += d.GEAR.sellValue(r, Math.min(lvl, d.GEAR.maxLvl(r))); continue; }
      const nid = 'm' + (uid++).toString(36) + '_' + String(it.id || '').slice(0, 12);
      const names = d.GEAR_NAMES[it.slot][r];
      const ex = (Array.isArray(it.ex) ? it.ex : []).filter(e => e && d.EXTRA_STATS.some(x => x.id === e.id)).map(e => ({ id: e.id, q: num(e.q, 1) }));
      s.gear.items.push({ id: nid, slot: it.slot, r, lvl: Math.min(lvl, d.GEAR.maxLvl(r)), q: num(it.q, 1), nameKey: names[uid % names.length], set: null, ex });
      if (eq3[it.slot] && eq3[it.slot] === it.id) s.gear.eq[it.slot] = nid;
      rep.gear++;
    }
    s.gear.uid = uid;
    // chests
    const ch = o.chests || {};
    s.chests = [num(ch.common), num(ch.rare), num(ch.epic), num(ch.legend), 0].map(n => Math.max(0, Math.floor(n)));
    rep.chests = s.chests.reduce((a, b) => a + b, 0);
    // stats, top, daily, achievements, settings, tutorial
    s.stats = fill(defaultStats(), o.stats || {});
    s.stats.chestsOpened = s.stats.chestsOpened || 0;
    if (Array.isArray(o.top)) s.top = o.top.slice(0, 10).map(r => Object.assign({}, r, { ship: SHIP_MAP[r.ship] || r.ship }));
    if (o.daily && typeof o.daily === 'object') s.daily = { last: o.daily.last || null, streak: num(o.daily.streak) };
    const ach = o.ach || {};
    for (const k of Object.keys(ach)) if (ach[k]) { s.ach['v3_' + k] = true; const m = d.ACH_V3_MAP[k]; if (m) s.ach[m] = true; }
    s.settings = fill(defaultSettings(), o.settings || {});
    s.tut = !!o.tut;
    s.lastSeen = num(o.saved, 0);
    refund = Math.round(refund * REFUND_MULT);
    s.crystals += refund + gearRefund;
    rep.refund = refund; rep.gearRefund = gearRefund; rep.crystals = s.crystals;
    s.migration = rep;
    return sanitize(s);
  }

  function parse(raw) { try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }

  // returns { save, source: 'v4'|'backup'|'v3'|'v2'|'new', report }
  function load() {
    const L = ls();
    if (L) {
      let s = parse(L.getItem(KEY)), src = 'v4';
      if (!s || s.v !== 4) { s = parse(L.getItem(BAK)); src = 'backup'; }
      if (s && s.v === 4) return { save: sanitize(fill(defaultSave(), s)), source: src, report: null };
      for (const k of [V3, V3BAK]) {
        const o = parse(L.getItem(k));
        if (o && o.v === 3) { const m = migrateV3(o); return { save: m, source: 'v3', report: m.migration }; }
      }
      const o2 = parse(L.getItem('neonComet.v2'));
      if (o2) { const s2 = defaultSave(); s2.best = num(o2.best); s2.crystals = Math.floor(num(o2.credits)); s2.migration = { from: 2, crystals: s2.crystals }; return { save: s2, source: 'v2', report: s2.migration }; }
    }
    return { save: defaultSave(), source: 'new', report: null };
  }

  let lastBak = 0;
  function write(s, forceBackup) {
    const L = ls(); if (!L || !s) return false;
    s.saved = Date.now(); s.lastSeen = s.saved;
    try {
      const json = JSON.stringify(s);
      L.setItem(KEY, json);
      if (forceBackup || Date.now() - lastBak > 20000) { L.setItem(BAK, json); lastBak = Date.now(); }
      return true;
    } catch (e) { return false; }
  }

  // ---------- export / import ----------
  function sum(str) { let h = 7; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h.toString(36); }
  const b64e = str => (typeof btoa === 'function') ? btoa(unescape(encodeURIComponent(str))) : Buffer.from(str, 'utf8').toString('base64');
  const b64d = b64 => (typeof atob === 'function') ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, 'base64').toString('utf8');
  function exportCode(s) { const b = b64e(JSON.stringify(s)); return 'NC4-' + sum(b) + '-' + b; }
  // returns {ok:true, save, report} | {ok:false, err:i18nKey}
  function importCode(code) {
    code = String(code || '').replace(/\s+/g, '');
    const m = code.match(/^NC([34])-([0-9a-z]+)-([A-Za-z0-9+/=]+)$/);
    if (!m || sum(m[3]) !== m[2]) return { ok: false, err: 'save.err.invalid' };
    let o; try { o = JSON.parse(b64d(m[3])); } catch (e) { return { ok: false, err: 'save.err.corrupt' }; }
    if (o && o.v === 4) return { ok: true, save: sanitize(fill(defaultSave(), o)), report: null };
    if (o && o.v === 3) { const s = migrateV3(o); return { ok: true, save: s, report: s.migration }; }
    return { ok: false, err: 'save.err.version' };
  }
  function reset(old) {
    const s = defaultSave();
    if (old && old.settings) s.settings = fill(defaultSettings(), old.settings);
    s.tut = true;
    return s;
  }

  NC.store = { KEY, BAK, V3, defaultSave, defaultSettings, load, write, exportCode, importCode, reset, migrateV3, sanitize, fill };
})(window.NC = window.NC || {});
