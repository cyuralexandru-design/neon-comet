'use strict';
// Neon Comet 4.0 - Hangar, PORTRAIT (agent "hangar", SPEC-40 §1-§3). Design width 390 (360..480), stacked:
// top bar (back, title, power, crystals, ores) -> ship stage (HD ship on holographic ring + 8 equipped slots:
// weapon/secondary/turret/companion | armor/gen/core/boost) -> scroll list of the active tab (category level bar with
// "Upgrade" per CATEGORY + item grid with HD rarity frames, tier = category tier) -> bottom icon tab bar.
// Item popup per dev/backlog/ref_item_detail.jpg (header rarity + name, icon, Nv x/150 + tier bar, main stat,
// 5 tiered bonus lines with locks, set block, Equip/Unequip, Upgrade category, Lock).
// Data API (SPEC-40): NC.sys.catLevel/catTier/upgradeCat/ores/variant/equipVariant/lockItem, NC.DATA.ORES/GEAR_VARIANTS.
// Every call is guarded (data agent works in parallel): fallbacks keep the screen usable on the 3.3 systems.
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  UI.screens = UI.screens || {};
  const t = (k, v) => NC.t(k, v);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sys = () => NC.sys || {};
  const D = () => NC.DATA || {};
  const St = () => { try { return UI.S ? UI.S() : sys().state(); } catch (e) { return {}; } };
  const fmt = n => (UI.fmt ? UI.fmt(n) : NC.fmt ? NC.fmt(n) : String(Math.floor(n || 0)));
  const sfx = n => { try { UI.sfx && UI.sfx(n); } catch (e) {} };
  const buzz = ms => { try { UI.buzz && UI.buzz(ms); } catch (e) {} };
  const toast = (m, k) => { try { UI.toast && UI.toast(m, k); } catch (e) {} };
  const ok = r => (UI.err ? !!UI.err(r) : !!(r && r.ok));
  const rname = r => t('hangar.r.' + r);
  const redraw = () => { if (UI.rerender) UI.rerender(); };
  const cry = () => { try { return sys().crystals(); } catch (e) { return 0; } };
  const call = (fn, ...a) => { try { const f = sys()[fn]; return typeof f === 'function' ? f.apply(sys(), a) : undefined; } catch (e) { console.warn('hangar', fn, e); return undefined; } };
  const has = fn => typeof sys()[fn] === 'function';
  const sum = a => (a || []).reduce((s, x) => s + (x || 0), 0);

  // ------------------------------------------------------------------ categories
  // cat = ore / level id (SPEC-40 §3); kind = old sys kind for buy/equip/def
  const MAXL = 150, TIER_AT = [1, 30, 60, 90, 120];
  const CATS = {
    ship: { kind: 'ship', list: 'SHIPS', bucket: 'ships', sprite: id => 'ship_' + id },
    weapon: { kind: 'weapon', list: 'WEAPONS', bucket: 'weapons', sprite: id => 'wpn_' + id },
    secondary: { kind: 'secondary', list: 'SECONDARY', bucket: 'secondary', sprite: id => 'sec_' + id, opt: 1 },
    turret: { kind: 'turret', list: 'TURRETS', bucket: 'turrets', sprite: id => 'icon_tur_' + id, opt: 1 },
    companion: { kind: 'comp', list: 'COMPANIONS', bucket: 'comps', sprite: id => 'icon_comp_' + id, opt: 1 },
    armor: { gear: 1 }, gen: { gear: 1 }, core: { gear: 1 }, boost: { gear: 1 },
  };
  const GEAR_CATS = ['armor', 'gen', 'core', 'boost'];
  const VAR_FALLBACK = { armor: ['titan', 'reactive', 'crystal', 'void'], gen: ['bastion', 'prism', 'pulse', 'ward'], core: ['fusion', 'quantum', 'star', 'voidr'], boost: ['ion', 'after', 'warp', 'phase'] };
  const ORE_CATS = ['armor', 'gen', 'core', 'boost', 'weapon', 'secondary', 'turret', 'companion', 'ship', 'crew'];
  const KIND2CAT = { ship: 'ship', weapon: 'weapon', secondary: 'secondary', turret: 'turret', comp: 'companion', companion: 'companion' };
  const TABS = [
    { id: 'ships', cats: ['ship'], key: 'hangar.tab.ships', icon: ['ui_tab_ships', 'ship_vanator'] },
    { id: 'weapons', cats: ['weapon'], key: 'hangar.tab.weapons', icon: ['ui_tab_weapons', 'wpn_laser'] },
    { id: 'secondary', cats: ['secondary'], key: 'hangar.tab.secondary', icon: ['ui_tab_secondary', 'sec_homing'] },
    { id: 'turrets', cats: ['turret'], key: 'hangar.tab.turrets', icon: ['ui_tab_turrets', 'icon_tur_pulse'] },
    { id: 'comps', cats: ['companion'], key: 'hangar.tab.comps', icon: ['ui_tab_companions', 'icon_comp_wing'] },
    { id: 'gear', cats: GEAR_CATS, key: 'hangar.tab.gear', icon: ['ui_tab_gear', 'gear_armor_titan', 'gear_armor_3'] },
    { id: 'cons', key: 'hangar.tab.cons', icon: ['ui_tab_consumables', 'cons_mine'] },
    { id: 'chests', key: 'hangar.tab.chests', icon: ['ui_tab_chests', 'chest_3'] },
  ];

  // level / tier per CATEGORY
  function oldMaxLevel(cat) {
    const S = St(), c = CATS[cat];
    try {
      if (c && c.bucket) return Math.max(1, ...Object.values((S[c.bucket] || {}).lv || {}).map(x => x | 0), 1);
      return Math.max(1, ...((S.gear || {}).items || []).filter(i => i.slot === cat).map(i => i.lvl | 0), 1);
    } catch (e) { return 1; }
  }
  function catLevel(cat) {
    const v = call('catLevel', cat);
    if (typeof v === 'number' && v > 0) return Math.min(MAXL, v);
    return Math.min(MAXL, Math.max(1, Math.round(oldMaxLevel(cat) * MAXL / 50)));
  }
  const tierFromLvl = l => l >= 120 ? 4 : l >= 90 ? 3 : l >= 60 ? 2 : l >= 30 ? 1 : 0;
  function catTier(cat) { const v = call('catTier', cat); return typeof v === 'number' ? Math.max(0, Math.min(4, v | 0)) : tierFromLvl(catLevel(cat)); }
  function ores() { const o = call('ores'); return o && typeof o === 'object' ? o : ((St().ores) || {}); }
  const oreN = cat => ores()['ore_' + cat] || 0;
  // upgrade cost preview: sys.catCost(cat) / sys.upgradeCatCost(cat) -> {ore, cr} (null at max)
  function catCost(cat) {
    if (catLevel(cat) >= MAXL) return null;
    const c = has('catCost') ? call('catCost', cat) : has('upgradeCatCost') ? call('upgradeCatCost', cat) : undefined;
    if (c === null) return null;
    if (c && typeof c === 'object') return { ore: c.ore | 0, cr: c.cr || c.crystals || 0 };
    return { ore: null, cr: null };
  }
  const canUpCat = cat => { const c = catCost(cat); return !!c && c.ore != null && oreN(cat) >= c.ore && cry() >= (c.cr || 0); };

  // items of a category: [{cat, id, def, var, owned, eq, sprite}]
  const defsOf = cat => (CATS[cat] && CATS[cat].list && D()[CATS[cat].list]) || [];
  function variantDef(cat, id) {
    let v = call('variant', cat, id);
    if (!v && CATS[cat].gear) { const G = D().GEAR_VARIANTS; const l = G && (Array.isArray(G[cat]) ? G[cat] : G[cat] && Object.values(G[cat])); v = l && l.find(x => x.id === id); }
    return v || null;
  }
  function gearIds(cat) {
    const G = D().GEAR_VARIANTS; let l = G && G[cat];
    if (l && !Array.isArray(l)) l = Object.values(l);
    return l && l.length ? l.map(x => x.id) : VAR_FALLBACK[cat];
  }
  function gearOwned(cat, id) {
    if (has('ownedVariant')) return !!call('ownedVariant', cat, id);
    if (has('variantOwned')) return !!call('variantOwned', cat, id);
    const S = St(), g = S.gear || {};
    const v = (g.variants || g.own || g.owned || {})[cat];
    if (Array.isArray(v)) return v.includes(id);
    if (v && typeof v === 'object') return !!v[id];
    return false;
  }
  function gearEq(cat) {
    if (has('equippedVariant')) return call('equippedVariant', cat) || null;
    const g = St().gear || {};
    if (g.eqv && g.eqv[cat]) return g.eqv[cat];
    const e = g.eq && g.eq[cat];
    return e && gearIds(cat).includes(e) ? e : null;
  }
  const eqOf = cat => CATS[cat].gear ? gearEq(cat) : ((St()[CATS[cat].bucket] || {}).eq || null);
  function spriteIds(cat, id, vd) {
    const c = CATS[cat], tr = catTier(cat);
    if (c.gear) return [vd && (vd.icon || vd.sprite), 'gear_' + cat + '_' + id, 'gear_' + cat + '_' + tr].filter(Boolean);
    return [c.sprite(id)];
  }
  function items(cat) {
    const c = CATS[cat], eq = eqOf(cat);
    if (c.gear) return gearIds(cat).map(id => { const vd = variantDef(cat, id); return { cat, id, def: vd, owned: gearOwned(cat, id), eq: id === eq, sprite: spriteIds(cat, id, vd) }; });
    return defsOf(cat).map(d => ({ cat, id: d.id, def: d, owned: !!call('owned', c.kind, d.id), eq: d.id === eq, sprite: spriteIds(cat, d.id) }));
  }
  const nameOf = (cat, id, d) => d && d.nameKey ? t(d.nameKey) : CATS[cat].gear ? t('hangar.var.' + cat + '.' + id) : id;
  const uidOf = (cat, id) => cat + ':' + id;
  function isLocked(cat, id) {
    const u = uidOf(cat, id);
    if (has('isLocked')) return !!call('isLocked', u);
    const L = St().locks; return !!(L && (Array.isArray(L) ? L.includes(u) : L[u]));
  }

  // ------------------------------------------------------------------ images (HD first, old sprite fallback)
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  function src(ids) {
    ids = Array.isArray(ids) ? ids : [ids];
    for (const id of ids) { let u = null; try { u = UI.hd ? UI.hd(id) : null; } catch (e) {} if (u) return { u, hd: true }; }
    for (const id of ids) { let u = ''; try { u = UI.spriteUrl ? UI.spriteUrl(id) : ''; } catch (e) {} if (u && !/data:image\/gif/.test(u)) return { u, hd: false }; }
    return { u: BLANK, hd: false };
  }
  const img = (ids, cls) => { const s = src(ids); return `<img class="ha-i${s.hd ? ' hd' : ' px'}${cls ? ' ' + cls : ''}" src="${esc(s.u)}" alt="" draggable="false">`; };
  const gem = () => `<i class="ha-gem"></i>`;
  const oreIco = cat => img(['ore_' + cat], 'ore');
  const frameBg = r => { if (r == null) return ''; const s = src(['frame_r' + r]); return s.hd ? ` style="--fr:url('${esc(s.u)}')"` : ''; };
  // tile(r, inner, o): o.lvl band, o.equipped, o.up, o.price, o.locked (not owned), o.lock (protect flag), o.badge, o.empty, o.tag
  function tile(r, inner, o) {
    o = o || {};
    if (o.empty) return `<div class="ha-t empty">${inner}<span class="ha-plus">+</span></div>`;
    const rc = r == null ? 'rn' : 'r' + Math.max(0, Math.min(4, r | 0)), fb = frameBg(r);
    const band = o.price != null ? `<span class="ha-lv price">${gem()}${fmt(o.price)}</span>` : o.lvl != null ? `<span class="ha-lv">${esc(t('hangar.lvl', { n: o.lvl }))}</span>` : '';
    return `<div class="ha-t ${rc}${fb ? ' hdf' : ''}${o.locked ? ' locked' : ''}"${fb}>${inner}${band}${o.equipped ? '<i class="ha-eq"></i>' : ''}${o.up ? '<i class="ha-up"></i>' : ''}${o.lock ? '<i class="ha-pad"></i>' : ''}${o.badge != null ? `<span class="ha-badge">${esc(o.badge)}</span>` : ''}${o.tag ? `<span class="ha-tag">${esc(o.tag)}</span>` : ''}</div>`;
  }
  UI.hangarTile = tile;
  const btn = (a, label, cls, extra) => `<button class="ha-b ${cls || 'mut'}" data-f data-a="${a}" ${extra || ''}>${label}</button>`;
  UI.spriteOf = (kind, id) => { const c = CATS[KIND2CAT[kind] || kind]; return c && c.sprite ? c.sprite(id) : kind; };

  const weaponTag = d => { try { return (UI.hangarWeaponTag && UI.hangarWeaponTag(d)) || ''; } catch (e) { return ''; } };
  const weaponExtra = d => { try { return (UI.hangarWeaponExtra && UI.hangarWeaponExtra(d)) || ''; } catch (e) { return ''; } };

  // shrink long texts instead of cutting them ([data-fit="minPx"])
  function fitAll(root) {
    if (!root) return;
    root.querySelectorAll('[data-fit]').forEach(e => {
      e.style.fontSize = ''; let fs = parseFloat(getComputedStyle(e).fontSize) || 12; const min = parseFloat(e.getAttribute('data-fit')) || 8;
      for (let i = 0; i < 8 && e.clientWidth && e.scrollWidth > e.clientWidth + 0.5 && fs > min; i++) { fs = Math.max(min, fs * Math.max(0.7, e.clientWidth / e.scrollWidth)); e.style.fontSize = fs.toFixed(1) + 'px'; }
    });
  }
  UI.fitText = UI.fitText || fitAll;
  addEventListener('resize', () => requestAnimationFrame(() => document.querySelectorAll('.ha').forEach(fitAll)));

  // ------------------------------------------------------------------ screen
  UI.screens.hangar = {
    cls: 'ha-scr',
    render(el, st) {
      if (st.tab === 'comp') st.tab = 'comps';
      if (!TABS.some(x => x.id === st.tab)) st.tab = 'ships';
      const prev = el.querySelector('.ha-list'), keep = prev && st._sk === st.tab ? prev.scrollTop : 0;
      st._sk = st.tab;
      el.innerHTML = `<div class="ha">${topBar()}<div class="ha-list" data-tab="${st.tab}">${shipStage()}${panel(st)}</div>${tabBar(st)}</div>`;
      const nl = el.querySelector('.ha-list'); if (nl && keep) nl.scrollTop = keep;
      fitAll(el.firstElementChild);
    },
    act(a, el, s, e) { act(a, el, s, e); },
    tab(dir, s) { const i = TABS.findIndex(x => x.id === s.state.tab); setTab(s, TABS[(i + dir + TABS.length) % TABS.length].id, true); },
    back() { sfx('click'); UI.close(); },
  };
  function refocusTab(s) { if (!UI.padMode || !UI.padMode()) return; requestAnimationFrame(() => { const e = s.el && s.el.querySelector('.ha-itab.on'); if (e && UI.setFocus) UI.setFocus(e); }); }
  UI.refocusTab = refocusTab;
  function setTab(s, id, quiet) {
    if (!TABS.some(x => x.id === id)) return;
    if (!quiet) sfx('click');
    s.state.tab = id; s.state._sk = null; UI.render(s); refocusTab(s);
  }

  function topBar() {
    let p = 0; try { p = sys().computeStats().power; } catch (e) {}
    const nOre = sum(Object.values(ores()));
    return `<div class="ha-top">
      <button class="ha-ib back" data-f data-a="back" data-k="ha-back" aria-label="${esc(t('hangar.back'))}"><i class="ha-arr"></i></button>
      <b class="ha-title" data-fit="12">${t('hangar.ttl')}</b>
      <span class="ha-pill pw"><i>${t('hangar.power')}</i>${fmt(p)}</span>
      <span class="ha-pill">${gem()}${fmt(cry())}</span>
      <button class="ha-ib ore" data-f data-a="ores" data-k="ha-ores" aria-label="${esc(t('hangar.ores'))}">${oreIco('weapon')}<em>${fmt(nOre)}</em></button></div>`;
  }

  const SLOT_L = ['weapon', 'secondary', 'turret', 'companion'], SLOT_R = ['armor', 'gen', 'core', 'boost'];
  function slotHtml(cat) {
    const id = eqOf(cat), tr = catTier(cat), lvl = catLevel(cat);
    let inner;
    if (id) { const c = CATS[cat], d = c.gear ? variantDef(cat, id) : call('def', c.kind, id); inner = tile(tr, img(spriteIds(cat, id, d)), { lvl, up: canUpCat(cat), tag: cat === 'weapon' && d ? weaponTag(d) : '' }); }
    else inner = tile(0, img(CATS[cat].gear ? spriteIds(cat, gearIds(cat)[0]) : spriteIds(cat, (defsOf(cat)[0] || {}).id || '')), { empty: true });
    return `<div class="ha-slot" data-f data-a="slot" data-id="${cat}" data-k="slot-${cat}" aria-label="${esc(t('hangar.slot.' + cat))}">${inner}<small data-fit="7">${t('hangar.slot.' + cat)}</small></div>`;
  }
  function shipStage() {
    const S = St(), ship = (S.ships || {}).eq, sd = call('def', 'ship', ship) || { nameKey: ship };
    const tr = catTier('ship'), lvl = catLevel('ship');
    let cs = {}; try { cs = sys().computeStats(); } catch (e) {}
    const st = ['atk', 'hp', 'shd', 'dps'].map(k => `<span class="ha-st ${k}"><small>${t('hangar.st.' + k)}</small><b>${fmt(cs[k])}</b></span>`).join('');
    return `<div class="ha-stage">
      <div class="ha-col">${SLOT_L.map(slotHtml).join('')}</div>
      <div class="ha-center">
        <div class="ha-ship" data-f data-a="slot" data-id="ship" data-k="slot-ship" aria-label="${esc(t('hangar.slot.ship'))}"><i class="ha-ring2"></i><i class="ha-ring"></i><i class="ha-beam"></i>${img(['ship_' + ship], 'ship')}</div>
        <div class="ha-name"><b data-fit="10">${esc(nameOf('ship', ship, sd))}</b><small class="hac${tr}">${esc(t('hangar.shipLine', { n: lvl, r: rname(tr) }))}</small></div>
      </div>
      <div class="ha-col">${SLOT_R.map(slotHtml).join('')}</div>
      <div class="ha-stats">${st}</div></div>`;
  }

  // category bar: icon, name, Nv x/150 + tier progress, Upgrade (ore + crystals)
  function tierSpan(l) { const tr = tierFromLvl(l); if (tr >= 4) return { tr, p: Math.min(1, (l - 120) / 30), next: null }; const a = TIER_AT[tr], b = TIER_AT[tr + 1]; return { tr, p: (l - a) / (b - a), next: b }; }
  function catBar(cat) {
    const lvl = catLevel(cat), tr = catTier(cat), ts = tierSpan(lvl), c = catCost(cat), have = oreN(cat);
    const nx = ts.next ? t('hangar.tierNextAt', { r: rname(tr + 1), n: ts.next }) : t('hangar.tierTop');
    const up = !c ? `<span class="ha-maxed">${t('hangar.dt.max')}</span>`
      : `<button class="ha-b up${canUpCat(cat) ? '' : ' poor'}" data-f data-a="catUp" data-id="${cat}" data-k="cu-${cat}"><span>${t('hangar.upCat')}</span><em>${oreIco(cat)}${fmt(have)}/${c.ore == null ? '?' : fmt(c.ore)}${c.cr ? ` ${gem()}${fmt(c.cr)}` : ''}</em></button>`;
    return `<div class="ha-cbar r${tr}">
      <div class="ha-cbi"><b data-fit="9">${t('hangar.slot.' + cat)}</b><span class="hac${tr}">${t('hangar.lvlOf', { n: lvl, m: MAXL })} · ${rname(tr)}</span>
        <i class="ha-bar t${tr}"><i style="width:${(ts.p * 100).toFixed(1)}%"></i></i><small data-fit="7">${esc(nx)}</small></div>${up}</div>`;
  }
  function cell(x) {
    const tr = catTier(x.cat), price = !x.owned && x.def && x.def.price != null && !CATS[x.cat].gear ? x.def.price : null;
    const o = x.owned ? { lvl: catLevel(x.cat), equipped: x.eq, lock: isLocked(x.cat, x.id) } : { price, locked: true };
    if (x.cat === 'weapon' && x.def) o.tag = weaponTag(x.def);
    return `<div class="ha-cell${x.owned ? '' : ' dim'}" data-f data-a="item" data-cat="${x.cat}" data-id="${esc(x.id)}" data-k="i-${x.cat}-${esc(x.id)}">${tile(tr, img(x.sprite), o)}<span class="ha-cap" data-fit="7">${esc(nameOf(x.cat, x.id, x.def))}</span></div>`;
  }
  function panel(st) {
    const tb = TABS.find(x => x.id === st.tab);
    if (tb.id === 'cons') return consPanel();
    if (tb.id === 'chests') return chestPanel();
    return tb.cats.map(cat => {
      const all = items(cat);
      const own = all.filter(x => x.owned).sort((a, b) => b.eq - a.eq), shop = all.filter(x => !x.owned).sort((a, b) => ((a.def || {}).price || 0) - ((b.def || {}).price || 0));
      const grid = arr => `<div class="ha-grid">${arr.map(cell).join('')}</div>`;
      let body = CATS[cat].gear ? grid(own.concat(shop))
        : (own.length ? grid(own) : '') + (shop.length ? `<div class="ha-cat sub">${t('hangar.cat.shop')} <i>· ${shop.length}</i></div>` + grid(shop) : '');
      return `<section class="ha-sec"><div class="ha-cat">${img(spriteIds(cat, (all[0] || {}).id || ''), 'ci')}${t('hangar.slot.' + cat)} <i>· ${own.length}/${all.length}</i></div>${catBar(cat)}${body}</section>`;
    }).join('') + (tb.id === 'gear' ? `<p class="ha-hint">${t('hangar.gearHint')}</p>` : '');
  }
  function tabBar(st) {
    const dot = id => { try { if (id === 'chests') return sum(St().chests) > 0; const tb = TABS.find(x => x.id === id); return !!(tb.cats && tb.cats.some(canUpCat)); } catch (e) { return false; } };
    return `<nav class="ha-tabs" role="tablist">${TABS.map(x => `<button class="ha-itab${x.id === st.tab ? ' on' : ''}" data-f data-a="tab" data-id="${x.id}" data-k="tab-${x.id}" role="tab" aria-selected="${x.id === st.tab}" aria-label="${esc(t(x.key))}">${img(x.icon)}<em data-fit="6">${t(x.key)}</em>${dot(x.id) ? '<i class="tdot"></i>' : ''}</button>`).join('')}</nav>`;
  }

  // consumables: rows, tap -> info card
  function consPanel() {
    const S = St(), lo = (S.loadout || []).map(l => l.id), max = D().CONS_STOCK_MAX || 99;
    const rows = (D().CONSUMABLES || []).map(c => {
      const have = (S.cons || {})[c.id] || 0;
      return `<div class="ha-lrow"><div class="ha-lmain" data-f data-a="cons" data-id="${c.id}" data-k="cons-${c.id}">${tile(null, img(['cons_' + c.id]), { badge: have, equipped: lo.includes(c.id) })}
        <div class="ha-ltx"><b data-fit="9">${esc(t(c.nameKey))}</b><small>${esc(t(c.descKey))}</small></div></div>
        ${btn('consBuy', `+1 ${gem()}${fmt(c.price)}`, 'mut sm' + (have >= max ? ' off' : ''), `data-id="${c.id}" data-k="cb-${c.id}"`)}</div>`;
    }).join('');
    return `<section class="ha-sec"><div class="ha-cat">${t('hangar.tab.cons')} <i>· ${t('hangar.cons.loadout', { n: lo.length })}</i></div><p class="ha-hint">${t('hangar.cons.hint')}</p>${rows}</section>`;
  }
  function chestPanel() {
    const S = St(), chests = S.chests || [];
    const rows = (D().CHESTS || []).map(c => {
      const n = chests[c.r] || 0;
      const what = t('hangar.chest.items', { n: c.items }) + ' + ' + t('hangar.chest.ores') + (c.cons ? ' + ' + t('hangar.chest.cons', { n: c.cons }) : '');
      const acts = n ? btn('chestAll', t('hangar.chest.openAll', { n }), 'pri sm', `data-id="${c.r}" data-k="cha-${c.r}"`) + btn('chestOpen', t('hangar.chest.open'), 'sec sm', `data-id="${c.r}" data-k="cho-${c.r}"`)
        : btn('chestBuy', `${t('hangar.chest.buy')} ${gem()}${fmt(c.price)}`, 'sec sm', `data-id="${c.r}" data-k="chb-${c.r}"`);
      return `<div class="ha-lrow ch">${tile(c.r, img(['chest_' + c.r]), { badge: n || null })}<div class="ha-ltx"><b class="hac${c.r}" data-fit="9">${esc(t(c.nameKey))}</b><small>${esc(what)}</small></div><div class="ha-lact">${acts}</div></div>`;
    }).join('');
    const P = D().PITY || { after: 10 };
    const info = S.pity ? t('hangar.chest.pity', { n: Math.max(0, P.after - S.pity) }) : t('hangar.chest.pityInfo', { n: P.after });
    return `<section class="ha-sec"><div class="ha-cat">${t('hangar.tab.chests')} <i>· ${sum(chests)}</i></div><p class="ha-hint">${esc(info)}</p>${rows}</section>`;
  }

  // ------------------------------------------------------------------ actions
  const SLOT_TAB = { ship: 'ships', weapon: 'weapons', secondary: 'secondary', turret: 'turrets', companion: 'comps', armor: 'gear', gen: 'gear', core: 'gear', boost: 'gear' };
  function act(a, el, s) {
    const id = el.dataset.id;
    if (a === 'back') { UI.back(); return; }
    if (a === 'tab') { setTab(s, id); return; }
    if (a === 'ores') { sfx('click'); oresView(); return; }
    if (a === 'slot') {
      sfx('click'); s.state.tab = SLOT_TAB[id] || 'ships'; UI.render(s);
      const e = eqOf(id); if (e) detail(id, e); else refocusTab(s);
      return;
    }
    if (a === 'item') { sfx('click'); detail(el.dataset.cat, id); return; }
    if (a === 'catUp') { upCat(id, s.el && s.el.querySelector('.ha-ship')); return; }
    if (a === 'cons') { sfx('click'); consInfo(id); return; }
    if (a === 'consBuy') { if (ok(call('buyConsumable', id, 1))) sfx('buy'); redraw(); return; }
    if (a === 'chestOpen' || a === 'chestBuy') { openChest(+id, a === 'chestBuy'); return; }
    if (a === 'chestAll') { openAll(+id); return; }
  }
  function upCat(cat, glowEl) {
    if (!has('upgradeCat')) { toast(t('hangar.soon'), 'bad'); sfx('error'); return false; }
    const r = call('upgradeCat', cat);
    if (!ok(r)) return false;
    sfx('upgrade'); buzz(15);
    const tr = catTier(cat), was = r && r.lvl ? tierFromLvl(r.lvl - 1) : tr;
    toast(tr > was ? t('hangar.tierUp', { c: t('hangar.slot.' + cat), r: rname(tr) }) : t('hangar.catUpped', { c: t('hangar.slot.' + cat), n: catLevel(cat) }), 'warm');
    redraw(); glow(glowEl);
    return true;
  }
  function glow(e) { if (!e) return; e.classList.remove('ha-glow'); void e.offsetWidth; e.classList.add('ha-glow'); }

  // chests
  function openChest(r, buy) {
    const res = call('openChest', r, buy ? { buy: true } : undefined);
    if (!ok(res)) return;
    redraw();
    const again = () => { const n = (St().chests || [])[r] || 0; if (n > 0) openChest(r, false); else if (cry() >= D().CHESTS[r].price) openChest(r, true); else { toast(t('hangar.noCr'), 'bad'); sfx('error'); } };
    if (UI.chestAnim) UI.chestAnim(r, res, again); else if (UI.chestSummary) UI.chestSummary(r, [res]);
  }
  UI.openChest = openChest;
  function openAll(r) {
    const n = (St().chests || [])[r] || 0; if (!n) return;
    const list = [];
    for (let i = 0; i < n; i++) { const res = call('openChest', r); if (!res || !res.ok) { if (!list.length) ok(res); break; } list.push(res); }
    if (!list.length) return;
    redraw();
    if (typeof UI.chestSummary === 'function') UI.chestSummary(r, list); else summary(r, list);
  }
  function summary(r, list) { // own fallback summary (items, ores, crystals, consumables)
    const o = { items: [], ores: {}, cr: 0, cons: {} };
    for (const x of list) { (x.items || []).forEach(i => o.items.push(i)); o.cr += x.crystals || 0; for (const k in (x.ores || {})) o.ores[k] = (o.ores[k] || 0) + x.ores[k]; for (const k in (x.cons || {})) o.cons[k] = (o.cons[k] || 0) + x.cons[k]; }
    const oreRows = Object.keys(o.ores).map(k => `<span class="ha-orec">${img([k])}<b>+${fmt(o.ores[k])}</b></span>`).join('');
    const consRows = Object.keys(o.cons).map(k => `<span class="ha-orec">${img(['cons_' + k])}<b>+${o.cons[k]}</b></span>`).join('');
    const itRows = o.items.map(i => `<span class="ha-orec">${tile(i.r != null ? i.r : null, img([i.icon || i.sprite, 'gear_' + (i.slot || i.cat) + '_' + (i.variant || i.id), 'gear_' + i.slot + '_' + (i.r | 0)].filter(Boolean)), {})}</span>`).join('');
    const m = UI.modal(`<div class="ha-pop ha-sum"><div class="ha-ph r${r}"><small>${t('hangar.chest.sumS', { n: list.length })}</small><b>${esc(t('chest.' + r + '.name'))}</b></div>
      <div class="ha-pb">${itRows ? `<div class="ha-sumg">${itRows}</div>` : ''}${oreRows ? `<div class="ha-cat">${t('hangar.ores')}</div><div class="ha-sumg">${oreRows}</div>` : ''}${consRows ? `<div class="ha-sumg">${consRows}</div>` : ''}
      ${o.cr ? `<p class="ha-hint">${gem()} +${fmt(o.cr)} ${t('hangar.crystals')}</p>` : ''}${btn('close', t('hangar.ok'), 'pri wide', 'data-first')}</div></div>`, { on: a => { if (a === 'close') UI.closeModal(m); } });
    m.classList.add('ha-modal');
  }

  // ores inventory
  function oresView() {
    const O = ores(), list = (D().ORES && D().ORES.length ? D().ORES.map(o => (typeof o === 'string' ? o : o.id).replace(/^ore_/, '')) : ORE_CATS);
    const rows = list.map(cat => `<div class="ha-orer">${tile(null, oreIco(cat), {})}<div class="ha-ltx"><b data-fit="9">${t('hangar.ore.' + cat)}</b><small>${cat === 'crew' ? t('hangar.ore.crewD') : esc(t('hangar.ore.for', { c: t('hangar.slot.' + cat) }))}${cat !== 'crew' ? ' · ' + t('hangar.lvlOf', { n: catLevel(cat), m: MAXL }) : ''}</small></div><b class="ha-oren">${fmt(O['ore_' + cat] || 0)}</b></div>`).join('');
    const m = UI.modal(`<div class="ha-pop ha-ores"><div class="ha-ph rn"><small>${t('hangar.oresSub')}</small><b>${t('hangar.ores')}</b></div><div class="ha-pb">${rows}<p class="ha-hint">${t('hangar.oresHint')}</p>${btn('close', t('hangar.dt.close'), 'mut wide', 'data-first')}</div></div>`,
      { on: a => { if (a === 'close') UI.closeModal(m); } });
    m.classList.add('ha-modal'); fitAll(m);
  }

  // consumable info (core UI.infoCard)
  function consInfo(id) {
    const c = call('def', 'cons', id) || (D().CONSUMABLES || []).find(x => x.id === id); if (!c) return;
    const S = St(), have = (S.cons || {})[id] || 0, inLo = (S.loadout || []).some(l => l.id === id), max = D().CONS_STOCK_MAX || 99;
    const stats = [[t('hangar.cons.owned'), String(have)], [t('hangar.cons.price'), fmt(c.price) + ' ' + t('hangar.crystals')]];
    if (c.dur) stats.push([t('hangar.cons.dur'), t('hangar.cons.sec', { n: c.dur })]);
    if (c.heal) stats.push([t('hangar.st.heal'), Math.round(c.heal * 100) + '%']);
    if (c.mult) stats.push([t('hangar.st.mult'), 'x' + c.mult]);
    if (c.cd) stats.push([t('hangar.cons.cd'), t('hangar.cons.sec', { n: c.cd })]);
    stats.push([t('hangar.cons.inRun'), inLo ? t('hangar.cons.yes') : t('hangar.cons.no')]);
    const actions = [];
    if (have < max) actions.push({ a: 'buy1', label: t('hangar.cons.buy', { n: 1 }) + ' · ' + fmt(c.price), cls: 'pri' });
    if (max - have >= 5) actions.push({ a: 'buy5', label: t('hangar.cons.buy', { n: 5 }) + ' · ' + fmt(c.price * 5), cls: 'sec' });
    actions.push({ a: 'lo', label: inLo ? t('hangar.cons.remove') : t('hangar.cons.add'), cls: 'mut' });
    let m = null;
    const close = () => { if (m && m.isConnected && UI.closeModal) UI.closeModal(m, true); };
    const on = a => {
      if (a === 'close') { close(); return; }
      let ch = false;
      if (a === 'buy1' || a === 'buy5') { if (ok(call('buyConsumable', id, a === 'buy5' ? 5 : 1))) { sfx('buy'); ch = true; } }
      if (a === 'lo') ch = toggleLoadout(id);
      if (ch) { redraw(); close(); consInfo(id); }
    };
    if (typeof UI.infoCard === 'function') {
      const ret = UI.infoCard({ img: src(['cons_' + id]).hd ? `<img class="ha-i hd art" src="${esc(src(['cons_' + id]).u)}" alt="">` : 'cons_' + id, r: null, title: t(c.nameKey), sub: t('hangar.cons.sub', { n: have }), desc: t(c.descKey), stats, actions, on });
      m = ret && ret.nodeType === 1 ? (ret.closest('.modal') || ret) : null;
    } else {
      m = UI.modal(`<div class="ha-pop"><div class="ha-ph rn"><small>${esc(t('hangar.cons.sub', { n: have }))}</small><b>${esc(t(c.nameKey))}</b></div><div class="ha-pb"><p>${esc(t(c.descKey))}</p>${stats.map(s => `<div class="ha-row"><span>${esc(s[0])}</span><b>${esc(s[1])}</b></div>`).join('')}<div class="ha-dacts">${actions.map(x => btn(x.a, esc(x.label), x.cls)).join('')}${btn('close', t('hangar.dt.close'), 'mut')}</div></div></div>`, { on });
      m.classList.add('ha-modal');
    }
  }
  function toggleLoadout(id) {
    const lo = (St().loadout || []).map(l => ({ id: l.id, n: l.n })), i = lo.findIndex(l => l.id === id);
    if (i >= 0) lo.splice(i, 1);
    else { if (lo.length >= (D().CONS_MAX_TYPES || 3)) { toast(t('hangar.cons.full'), 'bad'); sfx('error'); return false; } lo.push({ id, n: D().CONS_MAX_UNITS || 3 }); }
    if (ok(call('setLoadout', lo))) { sfx('click'); return true; }
    return false;
  }

  // ------------------------------------------------------------------ item detail popup (ref_item_detail.jpg)
  function cs0() { try { return sys().computeStats(); } catch (e) { return {}; } }
  function mainStat(cat, id, d, owned) {
    const c = CATS[cat];
    if (c.gear) {
      let ms = call('variantStats', cat, id);
      if (ms && typeof ms === 'object') { const k = Object.keys(ms)[0]; if (k) return { k, l: t('hangar.st.' + k), v: fmtStat(k, ms[k]) }; }
      const m = d && (d.main || d.stat);
      if (m && typeof m === 'object') return { k: m.stat, l: t('hangar.st.' + m.stat), v: fmtStat(m.stat, m.v != null ? m.v : m.value) };
      return null;
    }
    const kind = c.kind, B = c.bucket;
    let s = null; try { s = sys().preview(x => { x[B].lv[id] = x[B].lv[id] || 1; x[B].eq = id; }); } catch (e) { s = cs0(); }
    if (!s) return null;
    if (kind === 'ship') return { k: 'hp', l: t('hangar.st.hp'), v: fmt(s.hp) };
    let v = null;
    try {
      if (kind === 'weapon') v = s.atk * s.weapon.def.dmg * s.weapon.dmgMult;
      if (kind === 'turret' && s.turret) v = s.atk * s.turret.def.dmg * s.turret.dmgMult;
      if (kind === 'comp' && s.comp) v = s.atk * s.comp.dmgFrac;
      if (kind === 'secondary' && s.secondary) v = s.atk * s.secondary.def.dmg * s.secondary.mult;
    } catch (e) {}
    return v == null ? { k: 'power', l: t('hangar.st.power'), v: fmt(s.power) } : { k: 'shot', l: t('hangar.st.shot'), v: v < 100 ? v.toFixed(1) : fmt(v) };
  }
  function fmtStat(k, v) {
    if (v == null || isNaN(v)) return '-';
    if (/pct|Pct|crit|rate|speed|cr|xp|regen|dashCd|dmg|dodge|armor/.test(k) && Math.abs(v) < 5) return (v >= 0 ? '+' : '') + (Math.abs(v) < 1 ? (v * 100).toFixed(1).replace(/\.0$/, '') : v.toFixed(1)) + '%';
    return '+' + fmt(v);
  }
  function bonusText(b) {
    const v = b.v != null ? b.v : b.value;
    const vs = typeof v === 'number' ? (Math.abs(v) < 1 ? Math.round(v * 1000) / 10 : Math.round(v * 10) / 10) : v;
    if (b.textKey && NC.hasT && NC.hasT(b.textKey)) return t(b.textKey, { v: vs, n: vs });
    if (b.textKey && !NC.hasT) return t(b.textKey, { v: vs, n: vs });
    return '+' + vs + (Math.abs(v) < 1 ? '%' : '') + ' ' + t('hangar.st.' + b.stat);
  }
  function bonusHtml(vd, tr, lvl) {
    const bl = (vd && Array.isArray(vd.bonus) ? vd.bonus : []).slice(0, 5);
    if (!bl.length) return '';
    let hintDone = false;
    return `<div class="ha-bl">${bl.map((b, i) => {
      const k = b.tier != null ? b.tier : i, on = tr >= k;
      let hint = '';
      if (!on && !hintDone) { hintDone = true; hint = `<div class="ha-bh">${t('hangar.unlockAt', { n: TIER_AT[k], r: rname(k) })}</div>`; }
      return `<div class="ha-bli${on ? ' on' : ''}"><i class="ha-bd t${k}${on ? '' : ' lk'}"></i><span>${esc(bonusText(b))}</span></div>${hint}`;
    }).join('')}</div>`;
  }
  function setHtml(vd) {
    const sid = vd && vd.set; if (!sid) return '';
    const set = (D().SETS || []).find(x => x.id === sid);
    let n = 0; try { n = (sys().setCounts() || {})[sid] || 0; } catch (e) {}
    const nm = set && set.nameKey ? t(set.nameKey) : t('set.' + sid + '.name');
    const lines = ['b2', 'b4'].filter(b => !set || set[b]).map((b, i) => `<span class="${n >= (i ? 4 : 2) ? 'on' : ''}">${esc(t('set.' + sid + '.' + b))}</span>`).join('');
    return `<div class="ha-set"><b>${esc(t('hangar.set', { s: nm }))} (${n}/4)</b>${lines}</div>`;
  }
  function skillHtml(d) {
    const sk = d && d.skill; if (!sk) return '';
    let v = {}; try { v = D().skillVars ? D().skillVars(d, Math.ceil(catLevel('weapon') / 3)) : {}; } catch (e) {}
    return `<div class="ha-skill"><b>${t('hangar.dt.skill')}: ${esc(t(sk.nameKey || 'wpn.' + d.id + '.skill.name'))}</b><span>${esc(t(sk.descKey || 'wpn.' + d.id + '.skill.desc', v))}</span></div>`;
  }
  function detailHtml(cat, id) {
    const c = CATS[cat]; if (!c) return '';
    const d = c.gear ? variantDef(cat, id) : call('def', c.kind, id);
    if (!c.gear && !d) return '';
    const vd = c.gear ? d : (call('variant', cat, id) || d);
    const owned = c.gear ? gearOwned(cat, id) : !!call('owned', c.kind, id);
    const eq = eqOf(cat) === id, lvl = catLevel(cat), tr = catTier(cat), ts = tierSpan(lvl), cost = catCost(cat), locked = isLocked(cat, id);
    const ms = mainStat(cat, id, d, owned);
    const desc = cat === 'ship' && d && d.perkKey ? `<p class="ha-desc"><b>${t('hangar.dt.perk')}:</b> ${esc(t(d.perkKey))}</p>` : d && d.descKey ? `<p class="ha-desc">${esc(t(d.descKey))}</p>` : '';
    const acts = [];
    if (!owned) acts.push(c.gear ? `<span class="ha-b off eqb">${t('hangar.dt.locked')}</span>` : btn('buy', `${t('hangar.dt.buy')}<em>${gem()}${fmt(d.price)}</em>`, 'eqb' + (cry() < d.price ? ' poor' : ''), 'data-first'));
    else if (eq) acts.push(c.opt || c.gear ? btn('unequip', t('hangar.dt.unequip'), 'eqb') : `<span class="ha-b off eqb">${t('hangar.dt.equipped')}</span>`);
    else acts.push(btn('equip', t('hangar.dt.equip'), 'eqb', 'data-first'));
    acts.push(!cost ? `<span class="ha-b off upb">${t('hangar.dt.max')}</span>`
      : btn('up', `<span>${t('hangar.upCat')}</span><em>${oreIco(cat)}${fmt(oreN(cat))}/${cost.ore == null ? '?' : fmt(cost.ore)}${cost.cr ? ` ${gem()}${fmt(cost.cr)}` : ''}</em>${canUpCat(cat) ? '<i class="ha-up"></i>' : ''}`, 'upb' + (canUpCat(cat) ? '' : ' poor')));
    acts.push(btn('lock', `<i class="ha-padl${locked ? ' on' : ''}"></i>`, 'lkb' + (locked ? ' on' : ''), `aria-label="${esc(t(locked ? 'hangar.unlock' : 'hangar.lock'))}"`));
    return `<div class="ha-ph r${tr}"><small>${rname(tr)} · ${t('hangar.slot.' + cat)}</small><b data-fit="12">${esc(nameOf(cat, id, d))}</b></div>
      <div class="ha-pb">
        <div class="ha-dtop">${tile(tr, img(spriteIds(cat, id, d), cat === 'ship' ? 'art sh' : 'art'), { equipped: eq, locked: !owned, tag: cat === 'weapon' ? weaponTag(d) : '' })}
          <div class="ha-dr"><b class="ha-dl">${t('hangar.lvlOf', { n: lvl, m: MAXL })}</b>
            <i class="ha-bar t${tr}"><i style="width:${(ts.p * 100).toFixed(1)}%"></i></i>
            <small class="ha-dn" data-fit="7">${esc(ts.next ? t('hangar.tierNextAt', { r: rname(tr + 1), n: ts.next }) : t('hangar.tierTop'))}</small>
            ${ms ? `<div class="ha-ms"><span>${esc(ms.l)}</span><b>${esc(ms.v)}</b></div>` : ''}</div></div>
        ${bonusHtml(vd, tr, lvl)}${setHtml(vd)}${desc}${cat === 'weapon' ? skillHtml(d) + weaponExtra(d) : ''}
        <p class="ha-catnote">${t('hangar.catNote', { c: t('hangar.slot.' + cat) })}</p>
        <div class="ha-dacts">${acts.join('')}</div>
        <p class="ha-tapx">${t('hangar.tapClose')}</p></div>`;
  }
  function detail(cat, id) {
    cat = KIND2CAT[cat] || cat;
    if (cat === 'gear') { // old callers: UI.detail('gear', itemUid)
      let it = null; try { it = sys().item(id); } catch (e) {}
      if (it) { cat = it.slot; id = it.variant || gearEq(it.slot) || gearIds(it.slot)[0]; } else return null;
    }
    if (!CATS[cat]) return null;
    const m = UI.modal('<div class="ha-pop ha-dt"></div>', { on: (a, el) => detailAct(a, el, cat, id, m) });
    m.classList.add('ha-modal');
    m._render = () => { const box = m.querySelector('.ha-dt'); if (!box) return; const h = detailHtml(cat, id); if (!h) { UI.closeModal(m, true); return; } box.className = 'ha-pop ha-dt r' + catTier(cat); box.innerHTML = h; fitAll(m); };
    m._render();
    return m;
  }
  UI.detail = detail;
  UI.hangarDetail = detail;
  function detailAct(a, el, cat, id, m) {
    const c = CATS[cat];
    let r = null;
    if (a === 'close') { UI.closeModal(m); return; }
    if (a === 'up') { if (upCat(cat, m.querySelector('.ha-dtop .ha-t'))) { m._render(); glow(m.querySelector('.ha-dtop .ha-t')); UI.refocus && UI.refocus(true); } return; }
    if (a === 'lock') {
      if (!has('lockItem')) { toast(t('hangar.soon'), 'bad'); sfx('error'); return; }
      r = call('lockItem', uidOf(cat, id)); if (r && r.ok === false) { ok(r); return; }
      sfx('click'); toast(t(isLocked(cat, id) ? 'hangar.locked' : 'hangar.unlocked')); m._render(); redraw(); return;
    }
    if (c.gear) {
      if (a === 'equip') r = has('equipVariant') ? call('equipVariant', cat, id) : { ok: false, err: 'hangar.soon' };
      if (a === 'unequip') r = has('equipVariant') ? call('equipVariant', cat, null) : call('unequipGear', cat);
    } else {
      if (a === 'equip') r = call('equip', c.kind, id);
      if (a === 'unequip') r = call('equip', c.kind, null);
      if (a === 'buy') r = call('buy', c.kind, id);
    }
    if (!ok(r)) return;
    if (a === 'buy') { sfx('buy'); toast(t('hangar.bought'), 'warm'); m._render(); redraw(); return; }
    sfx('click'); UI.closeModal(m); redraw();
  }

  // ------------------------------------------------------------------ pre-run loadout picker (called by menus/modes)
  UI.loadoutPicker = (onGo) => {
    const S = St();
    if (!(D().CONSUMABLES || []).some(c => ((S.cons || {})[c.id] || 0) > 0)) { onGo(); return; }
    const m = UI.modal('<div class="ha-pop ha-lo"></div>', { on: (a, el) => {
      const id = el.dataset.id;
      if (a === 'tog') { if (toggleLoadout(id)) { m._render(); UI.refocus && UI.refocus(); } }
      if (a === 'go') { UI.closeModal(m, true); onGo(); }
      if (a === 'shop') { UI.closeModal(m, true); UI.show('hangar', { tab: 'cons' }); }
      if (a === 'close') UI.closeModal(m);
    } });
    m.classList.add('ha-modal');
    m._render = () => {
      const S2 = St(), lo = (S2.loadout || []).map(l => l.id);
      m.querySelector('.ha-lo').innerHTML = `<div class="ha-ph rn"><small>${t('hangar.lo.slots', { n: lo.length })}</small><b>${t('hangar.lo.title')}</b></div><div class="ha-pb">
        <p class="ha-hint">${t('hangar.lo.hint')}</p>
        <div class="ha-grid">${(D().CONSUMABLES || []).map(c => { const have = (S2.cons || {})[c.id] || 0, on = lo.includes(c.id);
          return `<div class="ha-cell${on ? ' picked' : ''}${have ? '' : ' dim'}" data-f data-a="${have ? 'tog' : 'shop'}" data-id="${c.id}" data-k="lt-${c.id}">${tile(null, img(['cons_' + c.id]), { badge: have, equipped: on })}<span class="ha-cap" data-fit="7">${esc(t(c.nameKey))}</span></div>`; }).join('')}</div>
        <div class="ha-dacts">${btn('shop', t('hangar.lo.shop'), 'mut')}<button class="ha-b pri" data-f data-first data-a="go">${t('hangar.lo.go')}</button></div></div>`;
      fitAll(m);
    };
    m._render(); UI.refocus && UI.refocus(true);
  };

  if (NC.onLang) NC.onLang(() => {
    try {
      (UI.modals || []).forEach(m => { if (m._render && m.classList.contains('ha-modal')) m._render(); });
      const s = (UI.stack || []).find(x => x.name === 'hangar'); if (s && UI.render) UI.render(s);
    } catch (e) {}
  });
})(window.NC = window.NC || {});
