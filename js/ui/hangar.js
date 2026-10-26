'use strict';
// Neon Comet 3.1 - Hangar (agent "hangar"). Approved look: dev/design/hangar_ref.html/.png (palette B).
// LEFT: stat boxes, equipped slots (weapon/turret/companion/booster | armor/generator/core) around the ship on a
// holographic ring, buttons Upgrade ship / Chests / Merge. RIGHT: header + filter chips, info line, list grouped by
// category, bottom icon tabs (Ships, Weapons, Turrets, Companions, Gear, Consumables, Chests).
// Popups: item detail (before/after stats), merge-all summary, consumable info (UI.infoCard), loadout picker.
// Layout is written in design px of the 844x390 mockup (css/hangar.css, classes "ha-*") and scaled with --hk
// (transform), so it never depends on core's --u. Tiles are drawn by tile() = UI.frame contract (SPEC-31 §1) + hangar
// extras (price band, pick box, set icon colours). Talks only to NC.sys / NC.DATA.
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  UI.screens = UI.screens || {};
  const t = (k, v) => NC.t(k, v);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sys = () => NC.sys;
  const D = () => NC.DATA;
  const St = () => (UI.S ? UI.S() : sys().state());
  const fmt = n => (UI.fmt ? UI.fmt(n) : NC.fmt ? NC.fmt(n) : String(Math.floor(n || 0)));
  const sfx = n => { try { UI.sfx && UI.sfx(n); } catch (e) {} };
  const buzz = ms => { try { UI.buzz && UI.buzz(ms); } catch (e) {} };
  const toast = (m, k) => { try { UI.toast && UI.toast(m, k); } catch (e) {} };
  const ok = r => (UI.err ? !!UI.err(r) : !!(r && r.ok));
  const rname = r => t('hangar.r.' + r);
  const redraw = () => { if (UI.rerender) UI.rerender(); };
  const cry = () => sys().crystals();

  // ------------------------------------------------------------------ data helpers
  const TABS = [
    { id: 'ships', kind: 'ship', key: 'hangar.tab.ships', icon: 'ship_vanator' },
    { id: 'weapons', kind: 'weapon', key: 'hangar.tab.weapons', icon: 'wpn_laser' },
    { id: 'turrets', kind: 'turret', key: 'hangar.tab.turrets', icon: 'icon_tur_pulse' },
    { id: 'comps', kind: 'comp', key: 'hangar.tab.comps', icon: 'icon_comp_wing' },
    { id: 'secondary', kind: 'secondary', key: 'hangar.tab.secondary', icon: 'ui_tab_secondary', alt: 'sec_homing' },
    { id: 'gear', key: 'hangar.tab.gear', icon: 'gear_armor_3' },
    { id: 'cons', key: 'hangar.tab.cons', icon: 'cons_mine' },
    { id: 'chests', key: 'hangar.tab.chests', icon: 'chest_3' },
  ];
  const CHIP_ICON = { armor: 'gear_armor_3', gen: 'gear_gen_2', core: 'gear_core_3', boost: 'gear_boost_3' };
  const LISTS = { ship: 'SHIPS', weapon: 'WEAPONS', turret: 'TURRETS', comp: 'COMPANIONS', secondary: 'SECONDARY' };
  const BUCKET = { ship: 'ships', weapon: 'weapons', turret: 'turrets', comp: 'comps', secondary: 'secondary' };
  const spriteOf = (kind, id) => kind === 'ship' ? 'ship_' + id : kind === 'weapon' ? 'wpn_' + id : kind === 'turret' ? 'icon_tur_' + id : kind === 'comp' ? 'icon_comp_' + id : kind === 'secondary' ? 'sec_' + id : kind;
  UI.spriteOf = spriteOf;
  // 3.3 rarity by level: frames/bands/names use the CURRENT tier (NC.sys.tierOf); fallback = base rarity
  const tierOf = (kind, x, lvl) => { try { if (sys().tierOf) return sys().tierOf(kind, x, lvl); } catch (e) {} return (typeof x === 'object' && x ? x.r : (sys().def(kind, x) || {}).r) || 0; };
  const gtier = it => tierOf('gear', it);
  const gearSprite = it => 'gear_' + it.slot + '_' + gtier(it);
  const OPTIONAL = { turret: 1, comp: 1, secondary: 1 };
  const defs = kind => D()[LISTS[kind]] || [];
  const eqOf = kind => (St()[BUCKET[kind]] || {}).eq;
  // "Nv 23 · Epic → Legendary at Nv 30"
  function tierLine(kind, x, lvl) {
    const tr = tierOf(kind, x, lvl);
    if (!lvl) return t('hangar.tierShop', { r: rname(tr), m: (sys().maxLevel && sys().maxLevel(kind)) || 50 });
    return tr >= 4 ? t('hangar.tierMax', { n: lvl, r: rname(tr) }) : t('hangar.tierNext', { n: lvl, r: rname(tr), r2: rname(tr + 1), a: (tr + 1) * 10 });
  }
  const SLOTS = () => (D().GEAR_SLOTS || []).map(s => s.id);
  const slotIdx = it => SLOTS().indexOf(it.slot);
  const mainKey = slot => { const s = (D().GEAR_SLOTS || []).find(x => x.id === slot); return s ? s.main : 'hp'; };
  const isEq = id => sys().isEquipped(id);
  const sum = a => (a || []).reduce((s, x) => s + (x || 0), 0);

  function canUp(kind, id) { const l = sys().level(kind, id); if (!l) return false; const p = sys().price(kind, id, l); return p != null && cry() >= p; }
  function canUpGear(it) { const p = sys().price('gear', it); return p != null && cry() >= p; }
  // green triangle on an unequipped item = the best item of its slot and better than what is equipped (or slot empty)
  function bestFlags() {
    const S = St(), out = new Set();
    for (const slot of SLOTS()) {
      const k = mainKey(slot), cur = S.gear.eq[slot] && sys().item(S.gear.eq[slot]);
      let bv = cur ? (sys().itemStats(cur)[k] || 0) : -1, best = null;
      for (const it of S.gear.items) if (it.slot === slot && !isEq(it.id)) { const v = sys().itemStats(it)[k] || 0; if (v > bv + 1e-9) { bv = v; best = it; } }
      if (best) out.add(best.id);
    }
    return out;
  }

  // ------------------------------------------------------------------ merge-all (never equipped items, lowest levels first)
  function mergeGroups() {
    let g = []; try { g = sys().mergeable() || []; } catch (e) {}
    const so = SLOTS();
    return g.map(x => ({ slot: x.slot, r: x.r, ids: x.ids.filter(id => !isEq(id)).map(id => sys().item(id)).filter(Boolean)
      .sort((a, b) => a.lvl - b.lvl || a.q - b.q).map(i => i.id) }))
      .filter(x => x.r < 4 && x.ids.length >= 3).sort((a, b) => a.r - b.r || so.indexOf(a.slot) - so.indexOf(b.slot));
  }
  const mergeCount = () => mergeGroups().reduce((s, g) => s + Math.floor(g.ids.length / 3), 0);
  function mergeAll(s) {
    const made = []; let n = 0;
    for (let guard = 0; guard < 500; guard++) {
      const g = mergeGroups()[0]; if (!g) break;
      const r = sys().merge(g.ids.slice(0, 3)); if (!r || !r.ok) { if (!n) ok(r); break; }
      n++; made.push(r.item.id);
    }
    if (!n) { toast(t('hangar.mergeNone')); sfx('error'); return; }
    sfx('merge'); buzz(30);
    if (s) { s.state.mode = null; s.state.picked = []; }
    redraw();
    const items = made.map(id => sys().item(id)).filter(Boolean).sort((a, b) => gtier(b) - gtier(a) || slotIdx(a) - slotIdx(b) || b.lvl - a.lvl);
    mergeSummary(n, items);
  }
  function mergeSummary(n, items) {
    prepPop();
    const m = UI.modal(`<div class="ha-pop ha-sum ha-c">
      <div class="ha-ph"><b>${t('hangar.mergeSumT')}</b><span>${esc(t('hangar.mergeSumS', { n }))}</span></div>
      <div class="ha-sumg">${items.map(it => `<div class="ha-sumc">${tile(gtier(it), img(gearSprite(it)), { lvl: it.lvl, set: it.set })}<span class="ha-cap hac${gtier(it)}" data-fit2="8">${esc(t(it.nameKey))}</span></div>`).join('')}</div>
      <div class="ha-pa"><span class="ha-note">${t('hangar.mergeHint')}</span><button class="ha-b pri ha-c" data-f data-first data-a="close">${t('hangar.ok')}</button></div></div>`,
    { on: a => { if (a === 'close') UI.closeModal(m); } });
    m.classList.add('ha-modal'); fitAll(m);
  }

  // ------------------------------------------------------------------ chests (single, open all)
  function openChest(r, buy) {
    const res = sys().openChest(r, buy ? { buy: true } : undefined);
    if (!ok(res)) return;
    redraw();
    const again = () => { const n = St().chests[r] || 0; if (n > 0) openChest(r, false); else if (cry() >= D().CHESTS[r].price) openChest(r, true); else { toast(t('hangar.noCr'), 'bad'); sfx('error'); } };
    if (UI.chestAnim) UI.chestAnim(r, res, again); else if (UI.chestSummary) UI.chestSummary(r, [res]);
  }
  UI.openChest = openChest;
  function openAll(r) {
    const n = (St().chests || [])[r] || 0; if (!n) return;
    const list = [];
    for (let i = 0; i < n; i++) { const res = sys().openChest(r); if (!res || !res.ok) { if (!list.length) ok(res); break; } list.push(res); }
    if (!list.length) return;
    redraw();
    if (typeof UI.chestSummary === 'function') UI.chestSummary(r, list);
    else if (UI.chestAnim) UI.chestAnim(r, combine(r, list), null);
  }
  function combine(r, list) {
    const o = { ok: true, rarity: r, items: [], crystals: 0, cons: {}, pity: false };
    for (const x of list) { o.items.push(...(x.items || [])); o.crystals += x.crystals || 0; for (const k in (x.cons || {})) o.cons[k] = (o.cons[k] || 0) + x.cons[k]; o.pity = o.pity || !!x.pity; }
    return o;
  }

  // ------------------------------------------------------------------ markup helpers
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  const img = (id, cls) => { let u = ''; try { u = UI.spriteUrl ? UI.spriteUrl(id) : ''; } catch (e) {} return `<img class="ha-i${cls ? ' ' + cls : ''}" src="${esc(u || BLANK)}" alt="" draggable="false">`; };
  const gem = () => '<i class="ha-gem"></i>';
  const SET_SHAPE = {
    titan: ['M6 .8l4.6 2.6v5.2L6 11.2 1.4 8.6V3.4z', 'var(--hp)'],
    tezaur: ['M6 .6l5.4 5.4L6 11.4.6 6z', 'var(--cyan)'],
    fantoma: ['M6 .8a5 5 0 0 1 5 5v5.4L9.3 9.9l-1.6 1.3L6 9.9l-1.7 1.3-1.6-1.3L1 11.2V5.8a5 5 0 0 1 5-5z', 'var(--r2)'],
  };
  function setIco(id, cls) { const s = SET_SHAPE[id] || ['M6 1l5 5-5 5-5-5z', 'var(--dim)']; return `<svg class="${cls || 'ha-si'}" viewBox="0 0 12 12" aria-hidden="true"><path d="${s[0]}" style="fill:${s[1]};stroke:var(--bg);stroke-width:1"/></svg>`; }
  // tile(r, inner, o) - UI.frame contract: o.lvl (band "Nv X"), o.equipped (cyan check), o.up (green triangle), o.set,
  // o.badge, o.empty (dashed + cyan "+"), o.cls; hangar extras: o.price (price band), o.locked, o.pick (sell/merge box),
  // o.tag (reserved corner label, e.g. 3.2 multi-shot "x2"). r == null -> neutral frame.
  function tile(r, inner, o) {
    o = o || {};
    if (o.empty) return `<div class="ha-t empty ha-c${o.cls ? ' ' + o.cls : ''}">${inner}<span class="ha-plus">+</span></div>`;
    const rc = r == null ? 'rn' : 'r' + Math.max(0, Math.min(4, r | 0));
    const band = o.price != null ? `<span class="ha-lv price">${gem()}${fmt(o.price)}</span>` : o.lvl != null ? `<span class="ha-lv">${esc(t('hangar.lvl', { n: o.lvl }))}</span>` : '';
    const corner = o.pick != null ? `<i class="ha-pick${o.pick ? ' on' : ''}"></i>`
      : (o.up ? '<i class="ha-up"></i>' : '') + (o.set ? setIco(o.set, 'ha-set' + (o.up ? ' low' : '')) : '') + (o.badge != null ? `<span class="ha-badge">${esc(o.badge)}</span>` : '');
    return `<div class="ha-t ${rc} ha-c${band ? ' band' : ''}${o.locked ? ' locked' : ''}${o.cls ? ' ' + o.cls : ''}">${inner}${band}${o.equipped ? '<i class="ha-eq"></i>' : ''}${corner}${o.tag ? `<span class="ha-tag">${esc(o.tag)}</span>` : ''}</div>`;
  }
  UI.hangarTile = tile;
  const btn = (a, label, cls, first, extra) => `<button class="ha-b sm ${cls || 'mut'} ha-c" data-f ${first ? 'data-first' : ''} data-a="${a}" ${extra || ''}>${label}</button>`;

  // 3.2 hooks (multi-shot x2/x3 weapon upgrades): a natural place on weapon tiles (o.tag) and in the weapon detail card.
  const weaponTag = d => { try { return (UI.hangarWeaponTag && UI.hangarWeaponTag(d)) || ''; } catch (e) { return ''; } };
  const weaponExtra = d => { try { return (UI.hangarWeaponExtra && UI.hangarWeaponExtra(d)) || ''; } catch (e) { return ''; } };

  // ------------------------------------------------------------------ scale + fit-text
  const DW = 844, DH = 390;
  const scaleFor = (w, h) => Math.max(0.75, Math.min(4, Math.min(w / DW, h / DH)));
  function fit(root) {
    if (!root || !root.isConnected) return;
    const cs = getComputedStyle(root);
    const w = root.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    const h = root.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
    if (w < 50 || h < 50) return;
    const k = scaleFor(w, h).toFixed(4);
    root.style.setProperty('--hk', k); document.documentElement.style.setProperty('--hk', k);
  }
  function prepPop() { // popups are centred in #stage and scaled with the same --hk
    const root = Array.from(document.querySelectorAll('.ha')).find(r => r.clientWidth > 50);
    if (root) { fit(root); return; }
    const st = document.getElementById('stage');
    const w = (st && st.clientWidth) || innerWidth, h = (st && st.clientHeight) || innerHeight;
    document.documentElement.style.setProperty('--hk', scaleFor(w, h).toFixed(4));
  }
  // shrink long texts instead of cutting them: [data-fit="min"] single line, [data-fit2="min"] fixed-height 2-line box
  function fitAll(root) {
    if (!root) return;
    const els = root.querySelectorAll('[data-fit],[data-fit2]'); if (!els.length) return;
    els.forEach(e => { e.style.fontSize = ''; });
    let todo = Array.from(els).map(e => ({ e, two: e.hasAttribute('data-fit2'), fs: 0, min: parseFloat(e.getAttribute('data-fit') || e.getAttribute('data-fit2')) || 8 }));
    todo.forEach(x => { x.fs = parseFloat(getComputedStyle(x.e).fontSize) || 12; });
    for (let pass = 0; pass < 7 && todo.length; pass++) {
      const over = [];
      for (const x of todo) {
        const e = x.e; if (!e.clientWidth) continue;
        const w = e.scrollWidth > e.clientWidth + 0.5, h = x.two && e.scrollHeight > e.clientHeight + 0.5;
        if ((w || h) && x.fs > x.min) { x.k = w ? Math.min(0.95, e.clientWidth / e.scrollWidth) : 0.9; over.push(x); }
      }
      for (const x of over) { x.fs = Math.max(x.min, Math.floor(x.fs * x.k * 10) / 10); x.e.style.fontSize = x.fs + 'px'; }
      todo = over;
    }
  }
  UI.fitText = UI.fitText || fitAll;
  const refit = () => { document.querySelectorAll('.ha').forEach(r => { fit(r); fitAll(r); }); };
  addEventListener('resize', () => requestAnimationFrame(refit));
  try { if (window.visualViewport) visualViewport.addEventListener('resize', () => requestAnimationFrame(refit)); } catch (e) {}

  // ------------------------------------------------------------------ hangar screen
  UI.screens.hangar = {
    cls: 'ha-scr',
    render(el, st) {
      if (!TABS.some(x => x.id === st.tab)) st.tab = 'ships';
      const sk = st.tab + '|' + (st.filter || '');
      const prev = el.querySelector('.ha-list');
      const top = prev && st._sk === sk ? prev.scrollTop : 0;
      st._sk = sk;
      el.innerHTML = `<div class="ha"><div class="ha-z">${topBar()}<div class="ha-main">${leftHtml()}${rightHtml(st)}</div></div></div>`;
      const root = el.firstElementChild;
      fit(root);
      const nl = el.querySelector('.ha-list'); if (nl && top) nl.scrollTop = top;
      fitAll(root);
    },
    act(a, el, s, e) { act(a, el, s, e); },
    tab(dir, s) { const i = TABS.findIndex(x => x.id === s.state.tab); setTab(s, TABS[(i + dir + TABS.length) % TABS.length].id, true); },
    back(s) {
      if (s.state.mode) { s.state.mode = null; s.state.picked = []; UI.render(s); UI.refocus && UI.refocus(true); return; }
      sfx('click'); UI.close();
    },
  };
  function refocusTab(s) { if (!UI.padMode || !UI.padMode()) return; requestAnimationFrame(() => { const e = s.el.querySelector('.ha-itab.on'); if (e && UI.setFocus) UI.setFocus(e); }); }
  UI.refocusTab = refocusTab;
  function setTab(s, id, quiet) {
    if (!TABS.some(x => x.id === id)) return;
    if (!quiet) sfx('click');
    const st = s.state; st.tab = id; st.mode = null; st.picked = []; if (id !== 'gear') st.filter = null;
    UI.render(s); refocusTab(s);
  }

  function topBar() {
    const cs = sys().computeStats();
    return `<div class="ha-top">
      <button class="ha-b back ha-c" data-f data-a="back" data-k="ha-back"><i class="ha-arr"></i>${t('hangar.back')}</button>
      <div class="ha-title">${t('hangar.ttl')}</div>
      <div class="ha-pill ha-c"><i>${t('hangar.power')}</i>${fmt(cs.power)}</div>
      <div class="ha-pill ha-c">${gem()}<span>${fmt(cry())}</span></div></div>`;
  }

  function leftHtml() {
    const S = St(), cs = sys().computeStats();
    const stats = [['atk', cs.atk], ['hp', cs.hp], ['shd', cs.shd], ['dps', cs.dps]]
      .map(([k, v]) => `<div class="ha-st ${k} ha-c"><small data-fit="8">${t('hangar.st.' + k)}</small><b>${fmt(v)}</b></div>`).join('');
    const kindSlot = (kind, emptyIco) => { const id = eqOf(kind), d = id && sys().def(kind, id); return d ? { r: tierOf(kind, d), sprite: spriteOf(kind, id), lvl: sys().level(kind, id), up: canUp(kind, id), tag: kind === 'weapon' ? weaponTag(d) : '' } : { empty: emptyIco }; };
    const gearSlot = slot => { const id = S.gear.eq[slot], it = id && sys().item(id); return it ? { r: gtier(it), sprite: gearSprite(it), lvl: it.lvl, up: canUpGear(it), set: it.set } : { empty: 'gear_' + slot + '_1' }; };
    const slot = (key, x) => `<div class="ha-slot" data-f data-a="slot" data-id="${key}" data-k="slot-${key}" aria-label="${esc(t('hangar.slot.' + key))}">${x.empty ? tile(0, img(x.empty), { empty: true }) : tile(x.r, img(x.sprite), { lvl: x.lvl, up: x.up, set: x.set, tag: x.tag })}</div>`;
    const ship = S.ships.eq, sd = sys().def('ship', ship) || { r: 0, nameKey: ship };
    const sl = sys().level('ship', ship) || 1, sup = sys().price('ship', ship, sl), str = tierOf('ship', sd, sl);
    const nCh = sum(S.chests), nM = mergeCount();
    const up = sup == null ? `<button class="ha-b pri ha-c off" data-f data-a="shipUp" data-k="ha-shipup">${t('hangar.shipMax')}</button>`
      : `<button class="ha-b pri ha-c${cry() < sup ? ' poor' : ''}" data-f data-a="shipUp" data-k="ha-shipup">${t('hangar.upShip')} ${gem()}${fmt(sup)}</button>`;
    return `<div class="ha-left">
      <div class="ha-stats">${stats}</div>
      <div class="ha-stage">
        <div class="ha-col">${slot('weapon', kindSlot('weapon', 'wpn_laser'))}${slot('turret', kindSlot('turret', 'icon_tur_pulse'))}${slot('comp', kindSlot('comp', 'icon_comp_wing'))}${slot('secondary', kindSlot('secondary', 'sec_homing'))}</div>
        <div class="ha-center">
          <div class="ha-name"><b data-fit="11">${esc(t(sd.nameKey))}</b><small class="hac${str}" data-fit="9">${esc(t('hangar.shipLine', { n: sl, r: rname(str) }))}</small></div>
          <div class="ha-ship" data-f data-a="slot" data-id="ship" data-k="slot-ship" aria-label="${esc(t('hangar.slot.ship'))}"><i class="ha-ring2"></i><i class="ha-ring"></i>${img('ship_' + ship, 'ship')}</div>
        </div>
        <div class="ha-col">${slot('armor', gearSlot('armor'))}${slot('gen', gearSlot('gen'))}${slot('core', gearSlot('core'))}${slot('boost', gearSlot('boost'))}</div>
      </div>
      <div class="ha-acts">${up}
        
        <button class="ha-b mut ha-c${nM ? ' dotted' : ''}" data-f data-a="goMerge" data-k="ha-gomerge">${t('hangar.mergeBtn')}${nM ? `<span class="ha-dot">${nM}</span>` : ''}</button>
      </div></div>`;
  }

  function rightHtml(st) {
    const tb = TABS.find(x => x.id === st.tab);
    const p = tb.kind ? kindPanel(tb.kind) : st.tab === 'gear' ? gearPanel(st) : st.tab === 'cons' ? consPanel() : chestPanel();
    return `<div class="ha-right">
      <div class="ha-rh"><b data-fit="10">${t(tb.key)}</b><span class="cnt">${p.count}</span><div class="ha-chips">${p.chips || ''}</div></div>
      <div class="ha-sub">${p.sub || ''}</div>
      <div class="ha-list" data-tab="${st.tab}">${p.list}</div>
      <div class="ha-tabs" role="tablist">${TABS.map(x => `<button class="ha-itab${x.id === st.tab ? ' on' : ''}" data-f data-a="tab" data-id="${x.id}" data-k="tab-${x.id}" role="tab" aria-selected="${x.id === st.tab}" aria-label="${esc(t(x.key))}">${tabImg(x)}<em>${t(x.key)}</em>${tabDot(x.id)}</button>`).join('')}</div>
    </div>`;
  }
  function tabImg(x) { // ui_tab_secondary may not exist yet -> fallback sprite
    if (x.alt) { let u = ''; try { u = UI.spriteUrl ? UI.spriteUrl(x.icon) : ''; } catch (e) {} if (!u || /blank|data:image\/gif/.test(u)) return img(x.alt); }
    return img(x.icon);
  }
  function tabDot(id) {
    try {
      if (id === 'chests') return sum(St().chests) > 0 ? '<i class="tdot"></i>' : '';
      if (id === 'gear') return mergeCount() > 0 ? '<i class="tdot"></i>' : '';
    } catch (e) {}
    return '';
  }

  // ships / weapons / turrets / companions: OWNED + SHOP groups, 5 columns with names
  function kindPanel(kind) {
    const all = defs(kind), eq = eqOf(kind);
    const own = all.filter(d => sys().owned(kind, d.id)), shop = all.filter(d => !sys().owned(kind, d.id)).sort((a, b) => a.price - b.price);
    const cell = d => {
      const o = sys().owned(kind, d.id);
      const opts = o ? { lvl: sys().level(kind, d.id), equipped: d.id === eq, up: canUp(kind, d.id) } : { price: d.price, locked: true };
      if (kind === 'weapon') opts.tag = weaponTag(d);
      return `<div class="ha-cell" data-f data-a="item" data-kind="${kind}" data-id="${d.id}" data-k="${kind}-${d.id}">${tile(tierOf(kind, d), img(spriteOf(kind, d.id), kind === 'ship' ? 'sh' : ''), opts)}<span class="ha-cap${o ? '' : ' dim'}" data-fit2="8">${esc(t(d.nameKey))}</span></div>`;
    };
    const sec = (key, arr) => arr.length ? `<div class="ha-cat">${t(key)} <i>· ${arr.length}</i></div><div class="ha-grid g5">${arr.map(cell).join('')}</div>` : '';
    let sub;
    if (kind === 'ship') { const d = sys().def('ship', eq); sub = d ? `<span class="ha-info" data-fit="8"><b>${t('hangar.dt.perk')}:</b> ${esc(t(d.perkKey))}</span>` : ''; }
    else { const d = eq && sys().def(kind, eq); sub = `<span class="ha-info" data-fit="8">${d ? esc(t('hangar.eqLine', { n: t(d.nameKey), l: sys().level(kind, eq) })) : t('hangar.noneEq')}</span>`; }
    return { count: own.length + '/' + all.length, sub, list: sec('hangar.cat.owned', own) + sec('hangar.cat.shop', shop) };
  }

  // gear: chips per slot, set legend / sell bar / merge bar, items grouped by slot (also on "All")
  function gearPanel(st) {
    const S = St(), mode = st.mode, picked = st.picked || [], first = picked.length ? sys().item(picked[0]) : null;
    const so = SLOTS(), filt = so.includes(st.filter) ? st.filter : null;
    const best = mode ? new Set() : bestFlags();
    const chips = `<button class="ha-chip${filt ? '' : ' on'}" data-f data-a="chip" data-id="" data-k="chip-all">${t('hangar.all')}</button>` +
      so.map(sl => `<button class="ha-chip${filt === sl ? ' on' : ''}" data-f data-a="chip" data-id="${sl}" data-k="chip-${sl}" aria-label="${esc(t('hangar.slot.' + sl))}">${img(CHIP_ICON[sl] || 'gear_' + sl + '_1')}</button>`).join('');
    const x = `<i></i>`;
    let sub;
    if (mode === 'merge') {
      const nAll = mergeCount();
      sub = `<span class="ha-mlab" data-fit="8"><b>${t('hangar.mergeMode')}</b> · ${t('hangar.mergePick')}</span>
        ${btn('mergeAll', t('hangar.mergeAll') + (nAll ? ` (${nAll})` : ''), 'pri' + (nAll ? '' : ' off'), nAll > 0, 'data-k="ha-mergeall"')}
        ${btn('mergeDo', t('hangar.mergeDo', { n: picked.length }), 'sec' + (picked.length === 3 ? '' : ' off'), false, 'data-k="ha-mergedo"')}
        ${btn('mode', x, 'back ha-x', false, `data-id="" data-k="ha-mx" aria-label="${esc(t('hangar.cancel'))}"`)}`;
    } else if (mode === 'sell') {
      const val = picked.reduce((s, id) => s + (sys().price('sell', id) || 0), 0);
      sub = `<span class="ha-mlab" data-fit="8"><b>${t('hangar.sellMode')}</b> · ${t('hangar.sellBar', { n: picked.length })} · ${gem()}${fmt(val)}</span>
        ${btn('sellCommon', t('hangar.sellCommon'), 'mut', false, 'data-k="ha-sellc"')}
        ${btn('sellDo', t('hangar.sell'), 'pri' + (picked.length ? '' : ' off'), false, 'data-k="ha-selldo"')}
        ${btn('mode', x, 'back ha-x', false, `data-id="" data-k="ha-sx" aria-label="${esc(t('hangar.cancel'))}"`)}`;
    } else sub = setLegend() + btn('mode', t('hangar.sell'), 'mut', false, 'data-id="sell" data-k="ha-sell"');
    let list;
    if (!S.gear.items.length) list = `<div class="ha-empty">${t('hangar.noGear')}</div>`;
    else {
      list = so.filter(sl => !filt || sl === filt).map(sl => {
        const arr = S.gear.items.filter(it => it.slot === sl).sort((a, b) => gtier(b) - gtier(a) || isEq(b.id) - isEq(a.id) || b.lvl - a.lvl);
        if (!arr.length) return '';
        return `<div class="ha-cat">${t('hangar.slot.' + sl)} <i>· ${arr.length}</i></div><div class="ha-grid">${arr.map(it => gearCell(it, mode, picked, first, best)).join('')}</div>`;
      }).join('') || `<div class="ha-empty">${t('hangar.noGear')}</div>`;
    }
    return { count: S.gear.items.length, chips, sub, list };
  }
  function gearCell(it, mode, picked, first, best) {
    const eq = isEq(it.id), pk = picked.includes(it.id);
    let dim = false;
    if (mode === 'merge') dim = gtier(it) >= 4 || (!!first && !pk && (it.slot !== first.slot || gtier(it) !== gtier(first) || picked.length >= 3));
    if (mode === 'sell') dim = eq;
    return `<div class="ha-cell${pk ? ' picked' : ''}${dim ? ' dim' : ''}" data-f data-a="gear" data-id="${it.id}" data-k="g-${it.id}">${tile(gtier(it), img(gearSprite(it)), { lvl: it.lvl, equipped: eq, up: !mode && (eq ? canUpGear(it) : best.has(it.id)), set: mode ? null : it.set, pick: mode ? pk : null })}</div>`;
  }
  const bonusTxt = (id, b) => t('set.' + id + '.' + b).replace(/^\s*\d+\s*:\s*/, '');
  function setLegend() {
    let c = {}; try { c = sys().setCounts() || {}; } catch (e) {}
    const sets = (D().SETS || []).filter(s => c[s.id] > 0);
    if (!sets.length) return `<span class="ha-setl" data-fit="8"><span>${t('hangar.noSets')}</span></span>`;
    return `<span class="ha-setl" data-fit="8">${sets.map(s => { const n = c[s.id], b = n >= 4 ? 'b4' : n >= 2 ? 'b2' : null; return `<span>${setIco(s.id)}${esc(t('hangar.set', { s: t(s.nameKey) }))} <b>${n}/4</b>${b ? ' ' + esc(bonusTxt(s.id, b)) : ''}</span>`; }).join('')}</span>`;
  }

  // consumables: rows (image, name, what it does, owned badge, quick +1); tap -> UI.infoCard
  function consPanel() {
    const S = St(), lo = (S.loadout || []).map(l => l.id), max = D().CONS_STOCK_MAX;
    const rows = (D().CONSUMABLES || []).map(c => {
      const have = S.cons[c.id] || 0, inLo = lo.includes(c.id);
      return `<div class="ha-lrow">
        <div class="ha-lmain" data-f data-a="cons" data-id="${c.id}" data-k="cons-${c.id}">${tile(null, img('cons_' + c.id), { badge: have, equipped: inLo })}
          <div class="ha-ltx"><b data-fit="9">${esc(t(c.nameKey))}</b><small>${esc(t(c.descKey))}</small></div></div>
        <div class="ha-lact">${btn('consBuy', `+1 ${gem()}${fmt(c.price)}`, 'mut' + (have >= max ? ' off' : ''), false, `data-id="${c.id}" data-k="cb-${c.id}"`)}</div></div>`;
    }).join('');
    return { count: sum(Object.values(S.cons || {})), sub: `<span class="ha-info" data-fit="8"><b>${t('hangar.cons.loadout', { n: lo.length })}</b> · ${t('hangar.cons.hint')}</span>`, list: rows };
  }

  // chests: one row per type with "Open all (n)", "Open" and buy+open
  function chestPanel() {
    const S = St();
    const rows = (D().CHESTS || []).map(c => {
      const n = S.chests[c.r] || 0;
      const what = t('hangar.chest.items', { n: c.items }) + (c.cons ? ' + ' + t('hangar.chest.cons', { n: c.cons }) : '');
      const buy = (cls, lbl) => btn('chestBuy', `${lbl ? lbl + ' ' : ''}${gem()}${fmt(c.price)}`, cls, false, `data-id="${c.r}" data-k="chb-${c.r}"`);
      const acts = n ? btn('chestAll', t('hangar.chest.openAll', { n }), 'pri', false, `data-id="${c.r}" data-k="cha-${c.r}"`) +
        `<div class="ha-lrb">${btn('chestOpen', t('hangar.chest.open'), 'sec', false, `data-id="${c.r}" data-k="cho-${c.r}"`)}${buy('mut')}</div>` : buy('sec', t('hangar.chest.buy'));
      return `<div class="ha-lrow ch">${tile(c.r, img('chest_' + c.r), { badge: n || null })}<div class="ha-ltx"><b class="hac${c.r}" data-fit="9">${esc(t(c.nameKey))}</b><small>${esc(what)}</small></div><div class="ha-lact">${acts}</div></div>`;
    }).join('');
    const P = D().PITY || { after: 10 };
    const info = S.pity ? t('hangar.chest.pity', { n: Math.max(0, P.after - S.pity) }) : t('hangar.chest.pityInfo', { n: P.after });
    return { count: sum(S.chests), sub: `<span class="ha-info" data-fit="8">${esc(info)}</span>`, list: rows };
  }

  // ------------------------------------------------------------------ actions
  function act(a, el, s) {
    const st = s.state, id = el.dataset.id;
    if (a === 'back') { UI.back(); return; }
    if (a === 'tab') { setTab(s, id); return; }
    if (a === 'chip') { sfx('click'); st.filter = id || null; redraw(); return; }
    if (a === 'slot') {
      sfx('click');
      const map = { ship: 'ships', weapon: 'weapons', turret: 'turrets', comp: 'comps', secondary: 'secondary' };
      st.tab = map[id] || 'gear'; st.mode = null; st.picked = []; st.filter = map[id] ? null : id;
      UI.render(s);
      if (map[id]) { const e = eqOf(id); if (e) UI.detail(id, e); } else { const g = St().gear.eq[id]; if (g) UI.detail('gear', g); else refocusTab(s); }
      return;
    }
    if (a === 'item') { sfx('click'); UI.detail(el.dataset.kind, id); return; }
    if (a === 'shipUp') {
      const r = sys().upgrade('ship', St().ships.eq);
      if (ok(r)) { sfx('upgrade'); buzz(15); toast(t('hangar.upgraded'), 'warm'); redraw(); glow(s.el.querySelector('.ha-ship')); }
      return;
    }
    if (a === 'goChests') { setTab(s, 'chests'); return; }
    if (a === 'goMerge') { sfx('click'); st.tab = 'gear'; st.mode = 'merge'; st.picked = []; st.filter = null; UI.render(s); UI.refocus && UI.refocus(true); return; }
    if (a === 'mode') { sfx('click'); st.mode = id || null; st.picked = []; UI.render(s); UI.refocus && UI.refocus(true); return; }
    if (a === 'gear') {
      if (!st.mode) { sfx('click'); UI.detail('gear', id); return; }
      st.picked = st.picked || [];
      if (el.classList.contains('dim') && !st.picked.includes(id)) { sfx('error'); return; }
      if (st.picked.includes(id)) st.picked = st.picked.filter(x => x !== id);
      else if (st.mode !== 'merge' || st.picked.length < 3) st.picked.push(id);
      sfx('click'); redraw(); return;
    }
    if (a === 'sellCommon') {
      const com = St().gear.items.filter(i => gtier(i) === 0 && !isEq(i.id)).map(i => i.id);
      if (!com.length) { toast(t('hangar.sellNone')); sfx('error'); return; }
      const p = st.picked || [], allIn = com.every(x => p.includes(x));
      st.picked = allIn ? p.filter(x => !com.includes(x)) : Array.from(new Set(p.concat(com)));
      sfx('click'); redraw(); return;
    }
    if (a === 'sellDo') { const ids = (st.picked || []).filter(x => !isEq(x)); if (!ids.length) { toast(t('hangar.sellNone')); sfx('error'); return; } confirmSell(ids, () => { st.picked = []; st.mode = null; }); return; }
    if (a === 'mergeDo') {
      if ((st.picked || []).length !== 3) { toast(t('hangar.mergePick')); sfx('error'); return; }
      const r = sys().merge(st.picked);
      if (ok(r)) {
        sfx('merge'); buzz(25); st.picked = []; st.mode = mergeCount() ? 'merge' : null; redraw();
        toast(t('hangar.merged', { r: rname(gtier(r.item)) }), 'warm'); UI.detail('gear', r.item.id);
      }
      return;
    }
    if (a === 'mergeAll') { mergeAll(s); return; }
    if (a === 'cons') { sfx('click'); consInfo(id); return; }
    if (a === 'consBuy') { const r = sys().buyConsumable(id, 1); if (ok(r)) sfx('buy'); redraw(); return; }
    if (a === 'chestOpen' || a === 'chestBuy') { openChest(+id, a === 'chestBuy'); return; }
    if (a === 'chestAll') { openAll(+id); return; }
  }
  function confirmSell(ids, after) {
    const val = ids.reduce((x, i) => x + (sys().price('sell', i) || 0), 0);
    const go = () => { const r = sys().sell(ids); if (ok(r)) { sfx('buy'); toast(t('hangar.sold', { p: fmt(r.crystals) }), 'warm'); } if (after) after(); redraw(); };
    if (UI.confirm) UI.confirm(t('hangar.sellConfirm', { n: ids.length, p: fmt(val) }), go); else go();
  }
  function toggleLoadout(id) {
    const lo = St().loadout.map(l => ({ id: l.id, n: l.n })), i = lo.findIndex(l => l.id === id);
    if (i >= 0) lo.splice(i, 1);
    else { if (lo.length >= D().CONS_MAX_TYPES) { toast(t('hangar.cons.full'), 'bad'); sfx('error'); return false; } lo.push({ id, n: D().CONS_MAX_UNITS }); }
    if (ok(sys().setLoadout(lo))) { sfx('click'); return true; }
    return false;
  }
  function glow(e) { if (!e) return; e.classList.remove('ha-glow'); void e.offsetWidth; e.classList.add('ha-glow'); }

  // ------------------------------------------------------------------ consumable info card (UI.infoCard from core)
  function consInfo(id) {
    const c = sys().def('cons', id); if (!c) return;
    const S = St(), have = S.cons[id] || 0, inLo = S.loadout.some(l => l.id === id), max = D().CONS_STOCK_MAX;
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
    const on = (a) => {
      if (a === 'close') { close(); return; }
      let changed = false;
      if (a === 'buy1' || a === 'buy5') { if (ok(sys().buyConsumable(id, a === 'buy5' ? 5 : 1))) { sfx('buy'); changed = true; } }
      if (a === 'lo') changed = toggleLoadout(id);
      if (changed) { redraw(); close(); consInfo(id); }
    };
    const o = { img: 'cons_' + id, r: null, title: t(c.nameKey), sub: t('hangar.cons.sub', { n: have }), desc: t(c.descKey), stats, actions, on };
    if (typeof UI.infoCard === 'function') {
      const ret = UI.infoCard(o);
      m = ret && ret.nodeType === 1 ? (ret.classList.contains('modal') ? ret : ret.closest('.modal') || ret) : (UI.modals || [])[(UI.modals || []).length - 1] || null;
    } else m = fallbackCard(o);
  }
  function fallbackCard(o) {
    prepPop();
    const rows = (o.stats || []).map(([l, v]) => ({ l, a: v }));
    const acts = (o.actions || []).map((x, i) => btn(esc(x.a), esc(x.label), x.cls || 'mut', i === 0)).concat(btn('close', t('hangar.dt.close'), 'mut'));
    const m = UI.modal(`<div class="ha-pop ha-dt ha-c">${cardHtml({ r: o.r, sprite: o.img, name: o.title, sub: o.sub, desc: esc(o.desc) })}${sideHtml(rows, false, acts, t('hangar.dt.info'))}</div>`, { on: a => o.on && o.on(a) });
    m.classList.add('ha-modal'); fitAll(m);
    return m;
  }

  // ------------------------------------------------------------------ item detail popup (before / after)
  UI.detail = (kind, id) => {
    prepPop();
    const m = UI.modal('<div class="ha-pop ha-dt ha-c"></div>', { on: (a, el) => detailAct(a, el, kind, id, m) });
    m.classList.add('ha-modal');
    m._render = () => {
      const box = m.querySelector('.ha-dt'); if (!box) return;
      const html = kind === 'gear' ? gearDetail(id) : itemDetail(kind, id);
      if (!html) { UI.closeModal(m, true); return; }
      box.innerHTML = html; fitAll(m);
    };
    m._render();
    return m;
  };
  const ROWS = { ship: ['hp', 'atk', 'shd', 'rate', 'speed', 'crit', 'dps', 'power'], weapon: ['shot', 'sps', 'dps', 'power'], turret: ['shot', 'sps', 'dps', 'power'], comp: ['shot', 'guns', 'dps', 'power'], secondary: ['shot', 'sps', 'dps', 'power'] };
  function val(kind, k, cs) {
    if (k === 'shot') {
      if (kind === 'weapon') return cs.atk * cs.weapon.def.dmg * cs.weapon.dmgMult;
      if (kind === 'turret') return cs.turret ? cs.atk * cs.turret.def.dmg * cs.turret.dmgMult : null;
      if (kind === 'comp') return cs.comp ? cs.atk * cs.comp.dmgFrac : null;
      if (kind === 'secondary') return cs.secondary ? cs.atk * cs.secondary.def.dmg * cs.secondary.mult : null;
    }
    if (k === 'sps' && kind === 'secondary') return cs.secondary ? (cs.secondary.def.count || 1) / (cs.secondary.def.cd || 1) : null;
    if (k === 'sps') { if (kind === 'weapon') return cs.weapon.def.rate * cs.rate; return cs.turret ? cs.turret.def.rate * (cs.turret.def.count || 1) : null; }
    if (k === 'guns') return cs.comp ? cs.comp.def.guns : null;
    return cs[k];
  }
  function fmtV(k, v) {
    if (v == null) return '-';
    if (k === 'crit') return Math.round(v * 100) + '%';
    if (k === 'rate' || k === 'speed') return 'x' + v.toFixed(2);
    if (k === 'sps') return v.toFixed(2);
    if (k === 'shot') return v < 100 ? v.toFixed(1) : fmt(v);
    if (k === 'guns') return String(v);
    return fmt(v);
  }
  const fmtI = (k, v) => k === 'hp' || k === 'shd' ? '+' + Math.round(v) : k === 'ex_magnet' ? '+' + v.toFixed(0) : '+' + v.toFixed(1) + '%';
  const cmp = (a, b) => b == null ? 0 : a == null ? 1 : b > a + 1e-9 ? 1 : b < a - 1e-9 ? -1 : 0;
  function rowsHtml(rows, two) {
    return rows.map(r => r.sec ? `<div class="ha-rsec">${esc(r.sec)}</div>`
      : `<div class="ha-row"><span class="k">${esc(r.l)}</span><span class="v">${esc(r.a)}</span>${two ? `<i class="ha-ra"></i><span class="v${r.c > 0 ? ' up' : r.c < 0 ? ' dn' : ''}">${r.b == null ? '' : esc(r.b)}</span>` : ''}</div>`).join('');
  }
  function sideHtml(rows, two, acts, title) {
    return `<div class="ha-side"><div class="ha-sh${two ? ' two' : ''}"><b>${esc(title || t('hangar.dt.stats'))}</b>${title ? '' : `<span>${t('hangar.dt.now')}</span>`}${two ? `<i></i><span>${t('hangar.dt.after')}</span>` : ''}</div>
      <div class="ha-rows${two ? ' two' : ''}">${rowsHtml(rows, two)}</div><div class="ha-dacts">${acts.join('')}</div></div>`;
  }
  function cardHtml(o) {
    const rc = o.r == null ? 'n' : o.r;
    return `<div class="ha-card r${rc}">
      <div class="ha-art">${o.equipped ? `<span class="ha-eqtag">${t('hangar.dt.equipped')}</span>` : ''}${img(o.sprite, 'art' + (o.big ? ' ' + o.big : ''))}</div>
      <b class="ha-dn" data-fit="10">${esc(o.name)}</b>
      <span class="ha-dsub hac${rc}" data-fit="9">${esc(o.sub)}</span>${o.tline ? `<span class="ha-tline" data-fit="8">${esc(o.tline)}</span>` : ''}
      ${o.lvl ? `<div class="ha-dl"><span>${t('hangar.dt.lvl', { a: o.lvl[0], b: o.lvl[1] })}</span><i class="ha-bar"><i style="width:${Math.min(100, o.lvl[0] / o.lvl[1] * 100).toFixed(1)}%"></i></i></div>` : o.locked ? `<div class="ha-dl"><span>${t('hangar.dt.locked')}</span></div>` : ''}
      ${o.desc ? `<p class="ha-desc">${o.desc}</p>` : ''}${o.extra || ''}</div>`;
  }
  function itemDetail(kind, id) {
    const d = sys().def(kind, id); if (!d) return '';
    const owned = sys().owned(kind, id), lvl = sys().level(kind, id), max = sys().maxLevel(kind, id), eq = eqOf(kind) === id;
    const B = BUCKET[kind];
    const withEq = (s, l) => { s[B].lv[id] = l || 1; s[B].eq = id; };
    const actual = sys().computeStats(), cur = sys().preview(s => withEq(s, lvl || 1));
    let A, Bs = null;
    if (!owned) { A = actual; Bs = cur; } else if (lvl < max) { A = cur; Bs = sys().preview(s => withEq(s, lvl + 1)); } else A = cur;
    const rows = ROWS[kind].map(k => { const a = val(kind, k, A), b = Bs ? val(kind, k, Bs) : null; return { l: t('hangar.st.' + k), a: fmtV(k, a), b: Bs ? fmtV(k, b) : null, c: Bs ? cmp(a, b) : 0 }; });
    const up = owned ? sys().price(kind, id, lvl) : null;
    const desc = kind === 'ship' ? `<b>${t('hangar.dt.perk')}:</b> ${esc(t(d.perkKey))}` : esc(t(d.descKey));
    const tr = tierOf(kind, d, owned ? lvl : 0);
    const card = cardHtml({ r: tr, sprite: spriteOf(kind, id), big: kind === 'ship' ? 'sh' : '', name: t(d.nameKey), sub: rname(tr) + ' · ' + t('hangar.slot.' + kind),
      tline: tierLine(kind, d, owned ? lvl : 0), lvl: owned ? [lvl, max] : null, locked: !owned, equipped: eq, desc,
      extra: kind === 'weapon' ? skillHtml(d, owned ? lvl : 1) + weaponExtra(d) : '' });
    const acts = [];
    if (!owned) acts.push(btn('buy', `${t('hangar.dt.buy')} ${gem()}${fmt(d.price)}`, 'pri wide', true));
    else {
      acts.push(up != null ? btn('up', `${t('hangar.dt.up')} ${gem()}${fmt(up)}`, 'pri wide' + (cry() < up ? ' poor' : ''), eq) : `<span class="ha-maxed wide">${t('hangar.dt.max')}</span>`);
      if (!eq) acts.push(btn('equip', t('hangar.dt.equip'), 'sec', true));
      if (eq && OPTIONAL[kind]) acts.push(btn('unequip', t('hangar.dt.unequip'), 'back'));
    }
    acts.push(btn('close', t('hangar.dt.close'), 'mut'));
    return card + sideHtml(rows, !!Bs, acts);
  }
  // weapon skill line ("Abilitate: Overcharge - every 8 s ...") with numbers for the weapon level
  function skillHtml(d, lvl) {
    const sk = d.skill; if (!sk) return '';
    let v = {}; try { v = D().skillVars ? D().skillVars(d, lvl) : {}; } catch (e) {}
    return `<div class="ha-skill"><b>${t('hangar.dt.skill')}: ${esc(t(sk.nameKey || 'wpn.' + d.id + '.skill.name'))}</b><span>${esc(t(sk.descKey || 'wpn.' + d.id + '.skill.desc', v))}</span></div>`;
  }
  function gearDetail(id) {
    const it = sys().item(id); if (!it) return '';
    const eq = isEq(id), max = sys().maxLevel ? sys().maxLevel('gear') : D().GEAR.maxLvl(it.r), up = sys().price('gear', it);
    const a = sys().itemStats(it), b = up != null ? sys().itemStats(Object.assign({}, it, { lvl: it.lvl + 1 })) : null;
    const set = it.set && (D().SETS || []).find(x => x.id === it.set);
    const cnt = set ? (sys().setCounts()[set.id] || 0) : 0;
    const totA = sys().computeStats();
    const totB = eq ? (b ? sys().preview(s => { const x = s.gear.items.find(i => i.id === id); if (x) x.lvl++; }) : null) : sys().preview(s => { s.gear.eq[it.slot] = id; });
    const rows = [{ sec: b ? t('hangar.dt.itemUp') : t('hangar.dt.item') }].concat(Object.keys(a).map(k => ({ l: t('hangar.st.' + k.replace(/^ex_/, '')), a: fmtI(k, a[k]), b: b ? fmtI(k, b[k]) : null, c: b ? cmp(a[k], b[k]) : 0 })));
    const TK = ['hp', 'shd', 'dps', 'power'];
    const showTot = totB && TK.some(k => Math.abs((totB[k] || 0) - (totA[k] || 0)) > 0.5);
    if (showTot) rows.push({ sec: eq ? t('hangar.dt.shipUp') : t('hangar.dt.shipEq') }, ...TK.map(k => ({ l: t('hangar.st.' + k), a: fmtV(k, totA[k]), b: fmtV(k, totB[k]), c: cmp(totA[k], totB[k]) })));
    const setHtml = set ? `<div class="ha-dset"><b>${setIco(set.id)}${esc(t('hangar.set', { s: t(set.nameKey) }))} ${cnt}/4</b><span class="${cnt >= 2 && eq ? 'on' : ''}">${esc(t('set.' + set.id + '.b2'))}</span><span class="${cnt >= 4 && eq ? 'on' : ''}">${esc(t('set.' + set.id + '.b4'))}</span></div>` : '';
    const gt = gtier(it);
    const card = cardHtml({ r: gt, sprite: gearSprite(it), name: t(it.nameKey), sub: rname(gt) + ' · ' + t('hangar.slot.' + it.slot), tline: tierLine('gear', it, it.lvl), lvl: [it.lvl, max], equipped: eq, extra: setHtml });
    const acts = [];
    acts.push(up != null ? btn('up', `${t('hangar.dt.up')} ${gem()}${fmt(up)}`, 'pri wide' + (cry() < up ? ' poor' : ''), eq) : `<span class="ha-maxed wide">${t('hangar.dt.max')}</span>`);
    acts.push(eq ? btn('unequip', t('hangar.dt.unequip'), 'back') : btn('equip', t('hangar.dt.equip'), 'sec', true));
    if (!eq) acts.push(btn('sell', `${t('hangar.dt.sell')} ${gem()}${fmt(sys().price('sell', it))}`, 'mut'));
    acts.push(btn('close', t('hangar.dt.close'), 'mut'));
    return card + sideHtml(rows, !!b || !!showTot, acts);
  }
  function detailAct(a, el, kind, id, m) {
    let r = null;
    if (a === 'close') { UI.closeModal(m); return; }
    if (kind === 'gear') {
      if (a === 'equip') r = sys().equip('gear', id);
      if (a === 'unequip') { const it = sys().item(id); r = it ? sys().unequipGear(it.slot) : null; }
      if (a === 'up') r = sys().upgrade('gear', id);
      if (a === 'sell') { confirmSell([id], () => UI.closeModal(m, true)); return; }
    } else {
      if (a === 'equip') r = sys().equip(kind, id);
      if (a === 'unequip') r = sys().equip(kind, null);
      if (a === 'buy') r = sys().buy(kind, id);
      if (a === 'up') r = sys().upgrade(kind, id);
    }
    if (!r || !ok(r)) return;
    if (a === 'up') { sfx('upgrade'); buzz(15); }
    else if (a === 'buy') { sfx('buy'); toast(t('hangar.bought'), 'warm'); }
    else sfx('click');
    if (a === 'equip' || a === 'unequip') { UI.closeModal(m); redraw(); return; }
    m._render(); if (UI.rerender) UI.rerender(false);
    if (a === 'up' || a === 'buy') { glow(m.querySelector('.ha-art')); m.querySelectorAll('.ha-row .v').forEach(v => v.classList.add('ha-tick')); }
    UI.refocus && UI.refocus(true);
  }

  // ------------------------------------------------------------------ pre-run loadout picker (called by menus)
  UI.loadoutPicker = (onGo) => {
    const S = St();
    if (!(D().CONSUMABLES || []).some(c => (S.cons[c.id] || 0) > 0)) { onGo(); return; }
    prepPop();
    const m = UI.modal('<div class="ha-pop ha-lo ha-c"></div>', { on: (a, el) => {
      const id = el.dataset.id;
      if (a === 'tog') { if (toggleLoadout(id)) { m._render(); UI.refocus && UI.refocus(); } }
      if (a === 'go') { UI.closeModal(m, true); onGo(); }
      if (a === 'shop') { UI.closeModal(m, true); UI.show('hangar', { tab: 'cons' }); }
      if (a === 'close') UI.closeModal(m);
    } });
    m.classList.add('ha-modal');
    m._render = () => {
      const S2 = St(), lo = S2.loadout.map(l => l.id);
      m.querySelector('.ha-lo').innerHTML = `<div class="ha-ph"><b>${t('hangar.lo.title')}</b><span>${t('hangar.lo.slots', { n: lo.length })}</span></div>
        <p class="ha-lohint">${t('hangar.lo.hint')}</p>
        <div class="ha-grid g5 ha-log">${(D().CONSUMABLES || []).map(c => { const have = S2.cons[c.id] || 0, on = lo.includes(c.id);
          return `<div class="ha-cell${on ? ' picked' : ''}${have ? '' : ' dim'}" data-f data-a="${have ? 'tog' : 'shop'}" data-id="${c.id}" data-k="lt-${c.id}">${tile(null, img('cons_' + c.id), { badge: have, equipped: on })}<span class="ha-cap" data-fit2="8">${esc(t(c.nameKey))}</span></div>`; }).join('')}</div>
        <div class="ha-pa">${btn('shop', t('hangar.lo.shop'), 'mut')}<span class="sp"></span><button class="ha-b pri ha-c" data-f data-first data-a="go">${t('hangar.lo.go')}</button></div>`;
      fitAll(m);
    };
    m._render(); UI.refocus && UI.refocus(true);
  };

  // language switch: re-render the hangar and its open popups
  if (NC.onLang) NC.onLang(() => {
    try {
      (UI.modals || []).forEach(m => { if (m._render && m.classList.contains('ha-modal')) m._render(); });
      const s = (UI.stack || []).find(x => x.name === 'hangar'); if (s && UI.render) UI.render(s);
    } catch (e) {}
  });
})(window.NC = window.NC || {});
