'use strict';
// Neon Comet 3.0 - Hangar (UI agent). LEFT: selected ship (32px sprite at 2u/px) with the 7 equipped slots around it
// (weapon, turret, companion, armor, gen, core, boost). RIGHT: tabs Nave/Arme/Turele/Companioni/Echipament/Consumabile/Cufere.
// Item detail popup with before/after stats (DPS), multi-select sell, merge (3 same slot+rarity), chest opening,
// consumable shop and the pre-run loadout picker. Talks only to NC.sys (systems.js) and NC.DATA.
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  UI.screens = UI.screens || {};
  const t = (k, v) => NC.t(k, v);
  const esc = s => UI.esc(s);
  const sys = () => NC.sys;
  const D = () => NC.DATA;

  const TABS = [
    { id: 'ships', kind: 'ship', label: 'tab.ships', icon: () => 'ship_' + (UI.S().ships.eq || 'vanator') },
    { id: 'weapons', kind: 'weapon', label: 'tab.weapons', icon: () => 'wpn_laser' },
    { id: 'turrets', kind: 'turret', label: 'tab.turrets', icon: () => 'icon_tur_pulse' },
    { id: 'comps', kind: 'comp', label: 'tab.companions', icon: () => 'icon_comp_wing' },
    { id: 'gear', label: 'tab.gear', icon: () => 'gear_armor_2' },
    { id: 'cons', label: 'tab.consumables', icon: () => 'cons_shield' },
    { id: 'chests', label: 'tab.chests', icon: () => 'chest_2' },
  ];
  const LISTS = { ship: 'SHIPS', weapon: 'WEAPONS', turret: 'TURRETS', comp: 'COMPANIONS' };
  const BUCKET = { ship: 'ships', weapon: 'weapons', turret: 'turrets', comp: 'comps' };
  UI.spriteOf = (kind, id) => kind === 'ship' ? 'ship_' + id : kind === 'weapon' ? 'wpn_' + id : kind === 'turret' ? 'icon_tur_' + id : kind === 'comp' ? 'icon_comp_' + id : kind;
  const defs = kind => (D()[LISTS[kind]] || []);
  const nameOf = (kind, id) => { const d = sys().def(kind, id); return d ? t(d.nameKey) : id; };
  const eqOf = kind => (UI.S()[BUCKET[kind]] || {}).eq;
  const gearSlots = () => (D().GEAR_SLOTS || []).map(s => s.id);

  // ------------------------------------------------------------------ stat formatting
  const PCT = new Set(['cr', 'xp', 'speed', 'dashCd', 'crit', 'ex_crit', 'ex_rate', 'ex_xp', 'ex_regen']);
  const statLabel = k => t('stat.' + k.replace(/^ex_/, ''));
  const fmtItemStat = (k, v) => k === 'hp' || k === 'shd' ? '+' + Math.round(v) : k === 'ex_magnet' ? '+' + v.toFixed(0) : '+' + v.toFixed(1) + '%';
  const fmtStat = (k, v) => {
    if (v == null) return '-';
    if (k === 'crit') return Math.round(v * 100) + '%';
    if (k === 'rate' || k === 'speed') return 'x' + v.toFixed(2);
    return UI.fmt(v);
  };
  function statsTable(rows, A, B) {
    const head = `<div class="stats-h"><span></span><span style="text-align:right">${t('detail.before')}</span><span></span><span style="text-align:right">${B ? t('detail.after') : ''}</span></div>`;
    return head + `<div class="stats">${rows.map(k => {
      const a = A[k], b = B ? B[k] : null, up = B && b != null && a != null && b > a + 1e-9, down = B && b != null && a != null && b < a - 1e-9;
      return `<span class="k">${statLabel(k)}</span><span class="v">${fmtStat(k, a)}</span><span class="arrow">${B ? '>' : ''}</span><span class="v ${up ? 'n' : down ? 'c-bad' : ''}">${B ? fmtStat(k, b) : ''}</span>`;
    }).join('')}</div>`;
  }

  // ------------------------------------------------------------------ hangar screen
  UI.screens.hangar = {
    cls: 'dim',
    render(el, st) {
      st.tab = st.tab || 'ships';
      const S = UI.S(), cs = sys().computeStats();
      el.innerHTML = `
        <div class="scr-h"><button class="btn sq" data-f data-a="back" aria-label="back">&lt;</button><h2>${t('hangar.title')}</h2>
          <span class="sp"></span><span class="chip">${t('common.power')} <b class="c-acc">${UI.fmt(cs.power)}</b></span><span class="chip cr">${UI.icoCr()}<b id="hgCr">${UI.fmt(S.crystals)}</b></span></div>
        <div class="scr-b">
          <div class="hg-left"><div class="pnl">${ringHtml(S, cs)}</div></div>
          <div class="hg-right">
            <div class="tabs" role="tablist"><span class="lr pad-hint">L1</span>${TABS.map(tb => `<button class="tab ${st.tab === tb.id ? 'on' : ''}" data-f data-a="tab" data-k="tab-${tb.id}" data-id="${tb.id}" role="tab">${UI.img(tb.icon(), 'ico16')}<span class="tl">${t(tb.label)}</span>${tabDot(tb.id)}</button>`).join('')}<span class="lr pad-hint">R1</span></div>
            <div class="pnl hg-panel">${panelHtml(st, S)}</div>
          </div>
        </div>`;
    },
    act(a, el, s, e) { act(a, el, s, e); },
    tab(dir, s) { const i = TABS.findIndex(x => x.id === s.state.tab); s.state.tab = TABS[(i + dir + TABS.length) % TABS.length].id; s.state.mode = null; s.state.picked = []; UI.render(s); UI.refocusTab(s); },
    back(s) {
      if (s.state.mode) { s.state.mode = null; s.state.picked = []; UI.render(s); UI.refocus(true); return; }
      UI.sfx('click'); UI.close();
    },
  };
  UI.refocusTab = (s) => { if (!UI.padMode()) return; requestAnimationFrame(() => { const el = s.el.querySelector('.tab.on'); if (el) UI.setFocus(el); }); };
  function tabDot(id) {
    try {
      if (id === 'chests') return UI.S().chests.some(n => n > 0) ? '<i class="dot"></i>' : '';
      if (id === 'gear') return sys().mergeable().length ? '<i class="dot"></i>' : '';
    } catch (e) {}
    return '';
  }

  function ringHtml(S, cs) {
    const ship = S.ships.eq, sd = sys().def('ship', ship) || { r: 0 };
    const slot = (key, kind, id, r, sprite, lvl, label) => `<div class="slot" data-f data-a="slot" data-k="slot-${key}" data-id="${key}">
      ${id ? UI.frame(r, UI.img(sprite, 'ico24'), { noPips: false }) : UI.frame(0, '', { cls: 'empty', noPips: true })}
      ${id && lvl ? `<span class="lvl">${lvl}</span>` : ''}<span class="lbl">${esc(label)}</span></div>`;
    const d = (kind) => { const id = eqOf(kind), df = id && sys().def(kind, id); return [id, df ? df.r : 0, UI.spriteOf(kind, id), id ? sys().level(kind, id) : 0]; };
    const [wi, wr, ws, wl] = d('weapon'), [ti, tr, ts, tl] = d('turret'), [ci, cr, csp, cl] = d('comp');
    const g = k => { const id = S.gear.eq[k], it = id && sys().item(id); return it ? [it.id, it.r, 'gear_' + k + '_' + it.r, it.lvl] : [null, 0, '', 0]; };
    const [ai, ar, as, al] = g('armor'), [gi, gr, gs, gl] = g('gen'), [oi, or, os, ol] = g('core'), [bi, br, bs, bl] = g('boost');
    return `<div class="hg-ring">
        <div class="hg-col">${slot('weapon', 'weapon', wi, wr, ws, wl, t('slot.weapon'))}${slot('turret', 'turret', ti, tr, ts, tl, t('slot.turret'))}${slot('comp', 'comp', ci, cr, csp, cl, t('slot.companion'))}</div>
        <div class="hg-mid"><div class="hg-ship" data-f data-a="slot" data-id="ship" data-k="slot-ship"><span class="glow"></span>${UI.img('ship_' + ship, 'ico64')}<span class="pad"></span></div>${slot('boost', 'gear', bi, br, bs, bl, t('slot.boost'))}</div>
        <div class="hg-col">${slot('armor', 'gear', ai, ar, as, al, t('slot.armor'))}${slot('gen', 'gear', gi, gr, gs, gl, t('slot.gen'))}${slot('core', 'gear', oi, or, os, ol, t('slot.core'))}</div>
      </div>
      <div class="hg-name"><div class="b up r${sd.r}c">${esc(nameOf('ship', ship))} <span class="body dim">${t('common.lvl', { n: cs.shipLvl })}</span></div>
        <div class="hg-pow body"><span>${t('stat.hp')} <b>${UI.fmt(cs.hp)}</b></span><span>${t('stat.atk')} <b>${UI.fmt(cs.atk)}</b></span><span>${t('stat.dps')} <b class="c-acc">${UI.fmt(cs.dps)}</b></span></div></div>`;
  }

  function panelHtml(st, S) {
    const tab = TABS.find(x => x.id === st.tab);
    const head = `<div class="pnl-h"><span class="t">${t(tab.label)}</span>${headExtra(st, S)}</div>`;
    if (tab.kind) return head + listHtml(tab.kind, S);
    if (st.tab === 'gear') return head + gearHtml(st, S);
    if (st.tab === 'cons') return head + consHtml(S);
    if (st.tab === 'chests') return head + chestsHtml(S);
    return head;
  }
  function headExtra(st, S) {
    if (st.tab === 'gear') return `<span class="body dim">${S.gear.items.length}</span>`;
    if (st.tab === 'cons') return `<span class="body dim">${t('loadout.slots', { n: S.loadout.length })}</span>`;
    if (st.tab === 'chests' && S.pity) return `<span class="body dim">${t('chest.pity', { n: Math.max(0, D().PITY.after - S.pity) })}</span>`;
    return '';
  }

  function listHtml(kind, S) {
    const eq = eqOf(kind);
    return `<div class="scroll hg-scroll"><div class="grid">${defs(kind).map(d => {
      const owned = sys().owned(kind, d.id), lvl = sys().level(kind, d.id), max = sys().maxLevel(kind, d.id);
      const cap = owned ? (lvl >= max ? t('common.max') : t('common.lvl', { n: lvl })) : null;
      const capHtml = owned ? `<span class="cap">${esc(cap)}</span>` : `<span class="cap c-warm">${UI.icoCr()}</span>`;
      return `<div class="tile ${d.id === eq ? 'cur' : ''}" data-f data-a="item" data-kind="${kind}" data-id="${d.id}" data-k="${kind}-${d.id}">
        ${UI.frame(d.r, UI.img(UI.spriteOf(kind, d.id), kind === 'ship' ? 'ico32' : 'ico24'), { locked: !owned, equipped: d.id === eq, cls: kind === 'ship' ? 'big' : '' })}
        ${owned ? capHtml : `<span class="cap c-warm">${UI.fmt(d.price)}</span>`}</div>`;
    }).join('')}</div></div>`;
  }

  // ------------------------------------------------------------------ gear tab (sell + merge modes)
  function sortedGear(S) {
    const eqIds = new Set(Object.values(S.gear.eq).filter(Boolean)), so = gearSlots();
    return S.gear.items.slice().sort((a, b) => (eqIds.has(b.id) - eqIds.has(a.id)) || (b.r - a.r) || (so.indexOf(a.slot) - so.indexOf(b.slot)) || (b.lvl - a.lvl));
  }
  function gearHtml(st, S) {
    const items = sortedGear(S), mode = st.mode, picked = st.picked || [];
    const first = picked.length ? sys().item(picked[0]) : null;
    let tools;
    if (mode === 'sell') {
      const val = picked.reduce((s, id) => s + (sys().price('sell', id) || 0), 0);
      tools = `<span class="body c-warm">${t('sell.mode')}</span><span class="body dim">${t('sell.selected', { n: picked.length })}</span><span class="sp"></span>
        <button class="btn sm" data-f data-a="mode" data-id="">${t('common.cancel')}</button><button class="btn sm warm ${picked.length ? '' : 'off'}" data-f data-a="sellDo">${t('sell.btn', { p: UI.fmt(val) })}</button>`;
    } else if (mode === 'merge') {
      tools = `<span class="body c-acc">${t('merge.pick')}</span><span class="sp"></span>
        <button class="btn sm" data-f data-a="mode" data-id="">${t('common.cancel')}</button><button class="btn sm pri ${picked.length === 3 ? '' : 'off'}" data-f data-a="mergeDo">${t('merge.btn', { n: picked.length })}</button>`;
    } else {
      const canMerge = sys().mergeable().length > 0;
      tools = `<button class="btn sm" data-f data-a="mode" data-id="sell">${t('sell.mode')}</button>
        <button class="btn sm ${canMerge ? 'pri' : ''}" data-f data-a="mode" data-id="merge">${t('merge.mode')}${canMerge ? ' !' : ''}</button><span class="sp"></span>
        <button class="btn sm ghost" data-f data-a="sellCommon">${t('sell.allCommon')}</button>`;
    }
    if (!items.length) return `<div class="hg-tools">${tools}</div><div class="center body dim" style="flex:1">${t('hangar.noGear')}</div>`;
    return `<div class="hg-tools">${tools}</div><div class="scroll hg-scroll"><div class="grid">${items.map(it => {
      const eq = sys().isEquipped(it.id), pk = picked.includes(it.id);
      let dim = false;
      if (mode === 'merge' && first) dim = !pk && (it.slot !== first.slot || it.r !== first.r || picked.length >= 3);
      if (mode === 'merge' && it.r >= 4) dim = true;
      if (mode === 'sell' && eq) dim = true;
      return `<div class="tile ${pk ? 'picked' : ''} ${dim ? 'dimmed' : ''}" data-f data-a="gear" data-id="${it.id}" data-k="g-${it.id}">${mode ? '<i class="chk"></i>' : ''}
        ${UI.frame(it.r, UI.img('gear_' + it.slot + '_' + it.r), { equipped: eq, badge: it.lvl })}<span class="cap">${esc(t('slot.' + it.slot))}</span></div>`;
    }).join('')}</div></div>`;
  }

  // ------------------------------------------------------------------ consumables tab
  function consHtml(S) {
    const lo = S.loadout.map(l => l.id), max = D().CONS_STOCK_MAX;
    return `<div class="scroll hg-scroll"><div class="list">${(D().CONSUMABLES || []).map(c => {
      const have = S.cons[c.id] || 0, inLo = lo.includes(c.id);
      return `<div class="li"><div class="rf r1">${UI.img('cons_' + c.id)}</div>
        <div class="tx"><span class="b up">${esc(t(c.nameKey))}</span><span class="body">${esc(t(c.descKey))}</span></div>
        <span class="body dim nowrap">${t('shop.have', { n: have })}</span>
        <span class="col" style="align-items:center;gap:1px"><button class="btn tog ${inLo ? 'on' : ''}" data-f data-a="loTog" data-id="${c.id}" data-k="lo-${c.id}" aria-pressed="${inLo}"></button><span class="body dim2">${t('loadout.title')}</span></span>
        <button class="btn sm warm ${have >= max ? 'off' : ''}" data-f data-a="consBuy" data-id="${c.id}" data-k="cb-${c.id}">+1 <span class="cost">${UI.icoCr()}${UI.fmt(c.price)}</span></button></div>`;
    }).join('')}</div></div>`;
  }

  // ------------------------------------------------------------------ chests tab
  function chestsHtml(S) {
    return `<div class="scroll hg-scroll"><div class="list">${(D().CHESTS || []).map(c => {
      const n = S.chests[c.r] || 0;
      return `<div class="li">${UI.frame(c.r, UI.img('chest_' + c.r), { cls: '' })}
        <div class="tx"><span class="b up r${c.r}c">${esc(t(c.nameKey))}</span><span class="body">${c.items}x ${t('tab.gear')} ${c.cons ? ' + ' + c.cons + 'x ' + t('tab.consumables') : ''}</span></div>
        ${n ? `<button class="btn sm pri" data-f data-a="chestOpen" data-id="${c.r}" data-k="co-${c.r}">${t('chest.openOwned', { n })}</button>` : ''}
        <button class="btn sm warm" data-f data-a="chestBuy" data-id="${c.r}" data-k="cbuy-${c.r}"><span class="cost">${UI.icoCr()}${UI.fmt(c.price)}</span></button></div>`;
    }).join('')}</div></div>`;
  }

  // ------------------------------------------------------------------ actions
  const refresh = (s) => UI.rerender();
  function act(a, el, s) {
    const st = s.state, id = el.dataset.id;
    if (a === 'back') { UI.back(); return; }
    if (a === 'tab') { UI.sfx('click'); st.tab = id; st.mode = null; st.picked = []; UI.render(s); UI.refocusTab(s); return; }
    if (a === 'slot') {
      UI.sfx('click');
      const map = { ship: 'ships', weapon: 'weapons', turret: 'turrets', comp: 'comps' };
      st.tab = map[id] || 'gear'; st.mode = null; st.picked = []; UI.render(s);
      if (id === 'ship' || id === 'weapon' || id === 'turret' || id === 'comp') { const kind = id === 'ship' ? 'ship' : id; const eq = eqOf(kind); if (eq) UI.detail(kind, eq); }
      else { const gid = UI.S().gear.eq[id]; if (gid) UI.detail('gear', gid); }
      return;
    }
    if (a === 'item') { UI.sfx('click'); UI.detail(el.dataset.kind, id); return; }
    if (a === 'gear') {
      if (!st.mode) { UI.sfx('click'); UI.detail('gear', id); return; }
      if (el.classList.contains('dimmed') && !(st.picked || []).includes(id)) { UI.sfx('error'); return; }
      st.picked = st.picked || [];
      if (st.picked.includes(id)) st.picked = st.picked.filter(x => x !== id);
      else if (st.mode !== 'merge' || st.picked.length < 3) st.picked.push(id);
      UI.sfx('click'); refresh(s); return;
    }
    if (a === 'mode') { UI.sfx('click'); st.mode = id || null; st.picked = []; UI.render(s); UI.refocus(true); return; }
    if (a === 'sellDo') {
      const ids = st.picked || []; if (!ids.length) return;
      const val = ids.reduce((x, i) => x + (sys().price('sell', i) || 0), 0);
      UI.confirm(t('sell.confirm', { n: ids.length, p: UI.fmt(val) }), () => {
        const r = sys().sell(ids); if (UI.err(r)) { UI.sfx('buy'); UI.toast(t('toast.sold', { p: UI.fmt(r.crystals) }), 'warm'); }
        st.picked = []; st.mode = null; refresh(s);
      });
      return;
    }
    if (a === 'sellCommon') {
      const S = UI.S(), ids = S.gear.items.filter(i => i.r === 0 && !sys().isEquipped(i.id)).map(i => i.id);
      if (!ids.length) { UI.toast(t('sell.none')); return; }
      const val = ids.reduce((x, i) => x + (sys().price('sell', i) || 0), 0);
      UI.confirm(t('sell.confirm', { n: ids.length, p: UI.fmt(val) }), () => { const r = sys().sellAll(0); if (UI.err(r)) { UI.sfx('buy'); UI.toast(t('toast.sold', { p: UI.fmt(r.crystals) }), 'warm'); } refresh(s); });
      return;
    }
    if (a === 'mergeDo') {
      if ((st.picked || []).length !== 3) { UI.toast(t('merge.pick')); UI.sfx('error'); return; }
      const r = sys().merge(st.picked);
      if (UI.err(r)) {
        UI.sfx('merge'); UI.buzz(25);
        st.picked = []; st.mode = sys().mergeable().length ? 'merge' : null; refresh(s);
        const tile = s.el.querySelector(`[data-id="${r.item.id}"] .rf`); if (tile) tile.classList.add('glow-up');
        UI.toast(t('merge.done', { r: UI.rname(r.item.r) }), 'warm');
        UI.detail('gear', r.item.id);
      }
      return;
    }
    if (a === 'consBuy') { const r = sys().buyConsumable(id, 1); if (UI.err(r)) { UI.sfx('buy'); } refresh(s); return; }
    if (a === 'loTog') {
      const lo = UI.S().loadout.map(l => ({ id: l.id, n: l.n }));
      const i = lo.findIndex(l => l.id === id);
      if (i >= 0) lo.splice(i, 1); else { if (lo.length >= D().CONS_MAX_TYPES) { UI.toast(t('toast.loadoutFull'), 'bad'); UI.sfx('error'); return; } lo.push({ id, n: D().CONS_MAX_UNITS }); }
      if (UI.err(sys().setLoadout(lo))) UI.sfx('click');
      refresh(s); return;
    }
    if (a === 'chestOpen' || a === 'chestBuy') { openChest(+id, a === 'chestBuy', s); return; }
  }
  function openChest(r, buy, s) {
    const res = sys().openChest(r, buy ? { buy: true } : undefined);
    if (!UI.err(res)) return;
    UI.rerender();
    const again = () => { const n = UI.S().chests[r] || 0; if (n > 0) openChest(r, false, s); else if (UI.crystals() >= D().CHESTS[r].price) openChest(r, true, s); else UI.toast(t('toast.noCrystals'), 'bad'); };
    UI.chestAnim(r, res, again);
  }
  UI.openChest = openChest;

  // ------------------------------------------------------------------ item detail popup
  UI.detail = (kind, id) => {
    const m = UI.modal('<div class="pnl detail pop-in"></div>', { on: (a, el) => detailAct(a, el, kind, id, m) });
    m._render = () => { m.firstElementChild.innerHTML = kind === 'gear' ? gearDetail(id) : itemDetail(kind, id); };
    m._render();
    return m;
  };
  const SHIP_ROWS = ['hp', 'atk', 'shd', 'rate', 'speed', 'crit', 'dps', 'power'];
  const OTHER_ROWS = ['atk', 'dps', 'power'];
  function itemDetail(kind, id) {
    const d = sys().def(kind, id); if (!d) return '';
    const owned = sys().owned(kind, id), lvl = sys().level(kind, id), max = sys().maxLevel(kind, id), eq = eqOf(kind) === id;
    const B = BUCKET[kind];
    const withEq = (s, l) => { s[B].lv[id] = l || 1; s[B].eq = id; };
    const actual = sys().computeStats();
    const cur = sys().preview(s => withEq(s, lvl || 1));
    let A, Bs = null;
    if (!owned) { A = actual; Bs = cur; } else if (lvl < max) { A = cur; Bs = sys().preview(s => withEq(s, lvl + 1)); } else A = cur;
    const desc = kind === 'ship' ? t(d.perkKey) : t(d.descKey);
    const up = owned ? sys().price(kind, id, lvl) : null;
    const rows = kind === 'ship' ? SHIP_ROWS : OTHER_ROWS;
    return `<div class="dt-l">${UI.frame(d.r, UI.img(UI.spriteOf(kind, id), kind === 'ship' ? 'ico32' : 'ico24'), { equipped: eq })}
        <span class="dt-name r${d.r}c">${esc(t(d.nameKey))}</span><span class="body dim">${UI.rname(d.r)} \u00b7 ${owned ? t('detail.lvl', { a: lvl, b: max }) : t('common.locked')}</span>
        ${owned && lvl < max ? `<div class="bar xp thin" style="width:100%"><i style="width:${(lvl / max * 100).toFixed(1)}%"></i></div>` : ''}
        <span class="body">${kind === 'ship' ? `<span class="c-acc">${t('hangar.perk')}:</span> ` : ''}${esc(desc)}</span>
        <span class="sp"></span>
        ${!owned ? `<button class="btn warm wide" data-f data-first data-a="buy">${t('common.buy')} <span class="cost">${UI.icoCr()}${UI.fmt(d.price)}</span></button>` : ''}
        ${owned && up != null ? `<button class="btn warm wide" data-f ${eq ? 'data-first' : ''} data-a="up">${t('common.upgrade')} <span class="cost">${UI.icoCr()}${UI.fmt(up)}</span></button>` : ''}
        ${owned && up == null ? `<span class="chip c-warm">${t('hangar.maxed')}</span>` : ''}
        ${owned && !eq ? `<button class="btn pri wide" data-f data-first data-a="equip">${t('common.equip')}</button>` : ''}
        ${owned && eq && (kind === 'turret' || kind === 'comp') ? `<button class="btn ghost wide" data-f data-a="unequip">${t('common.unequip')}</button>` : ''}
        <button class="btn wide" data-f data-a="close">${t('common.close')}</button></div>
      <div class="dt-r">${statsTable(rows, A, Bs)}</div>`;
  }
  function gearDetail(id) {
    const it = sys().item(id); if (!it) return '';
    const eq = sys().isEquipped(id), max = D().GEAR.maxLvl(it.r), up = sys().price('gear', it);
    const a = sys().itemStats(it), b = up != null ? sys().itemStats(Object.assign({}, it, { lvl: it.lvl + 1 })) : null;
    const keys = Object.keys(a);
    const set = it.set && (D().SETS || []).find(x => x.id === it.set);
    const cnt = set ? (sys().setCounts()[set.id] || 0) : 0;
    const totalA = eq ? sys().computeStats() : sys().computeStats();
    const totalB = eq ? (b ? sys().preview(s => { const x = s.gear.items.find(i => i.id === id); x.lvl++; }) : null) : sys().preview(s => { s.gear.eq[it.slot] = id; });
    const showTot = totalB && ['hp', 'shd', 'dps', 'power'].some(k => Math.abs((totalB[k] || 0) - (totalA[k] || 0)) > 0.5);
    return `<div class="dt-l">${UI.frame(it.r, UI.img('gear_' + it.slot + '_' + it.r), { equipped: eq })}
        <span class="dt-name r${it.r}c">${esc(t(it.nameKey))}</span>
        <span class="body dim">${UI.rname(it.r)} \u00b7 ${t('slot.' + it.slot)} \u00b7 ${t('detail.lvl', { a: it.lvl, b: max })}</span>
        ${set ? `<span class="body c-acc">${t('hangar.set', { s: t(set.nameKey) })} (${cnt}/4)</span><span class="body dim">${t('set.' + set.id + '.b2')}<br>${t('set.' + set.id + '.b4')}</span>` : ''}
        <span class="sp"></span>
        ${up != null ? `<button class="btn warm wide" data-f ${eq ? 'data-first' : ''} data-a="up">${t('common.upgrade')} <span class="cost">${UI.icoCr()}${UI.fmt(up)}</span></button>` : `<span class="chip c-warm">${t('hangar.maxed')}</span>`}
        ${!eq ? `<button class="btn pri wide" data-f data-first data-a="equip">${t('common.equip')}</button>` : `<button class="btn ghost wide" data-f data-a="unequip">${t('common.unequip')}</button>`}
        ${!eq ? `<button class="btn ghost wide" data-f data-a="sell">${t('common.sell')} <span class="cost">${UI.icoCr()}${UI.fmt(sys().price('sell', it))}</span></button>` : ''}
        <button class="btn wide" data-f data-a="close">${t('common.close')}</button></div>
      <div class="dt-r"><div class="stats-h"><span></span><span style="text-align:right">${t('detail.before')}</span><span></span><span style="text-align:right">${b ? t('detail.after') : ''}</span></div>
      <div class="stats">${keys.map(k => `<span class="k">${statLabel(k)}</span><span class="v">${fmtItemStat(k, a[k])}</span><span class="arrow">${b ? '>' : ''}</span><span class="v n">${b ? fmtItemStat(k, b[k]) : ''}</span>`).join('')}</div>
      ${showTot ? `<div class="sep"></div>${statsTable(['hp', 'shd', 'dps', 'power'], totalA, totalB)}` : ''}</div>`;
  }
  function detailAct(a, el, kind, id, m) {
    let r = null;
    if (a === 'close') { UI.closeModal(m); return; }
    if (kind === 'gear') {
      if (a === 'equip') r = sys().equip('gear', id);
      if (a === 'unequip') { const it = sys().item(id); r = sys().unequipGear(it.slot); }
      if (a === 'up') r = sys().upgrade('gear', id);
      if (a === 'sell') { const v = sys().price('sell', id); UI.confirm(t('sell.confirm', { n: 1, p: UI.fmt(v) }), () => { const x = sys().sell([id]); if (UI.err(x)) { UI.sfx('buy'); UI.toast(t('toast.sold', { p: UI.fmt(x.crystals) }), 'warm'); } UI.closeModal(m); UI.rerender(); }); return; }
    } else {
      if (a === 'equip') r = sys().equip(kind, id);
      if (a === 'unequip') r = sys().equip(kind, null);
      if (a === 'buy') r = sys().buy(kind, id);
      if (a === 'up') r = sys().upgrade(kind, id);
    }
    if (!r) return;
    if (!UI.err(r)) return;
    if (a === 'up') { UI.sfx('upgrade'); UI.buzz(15); }
    else if (a === 'buy') { UI.sfx('buy'); UI.toast(t('toast.bought'), 'warm'); }
    else UI.sfx('click');
    if (a === 'equip' || a === 'unequip') { UI.closeModal(m); UI.rerender(); return; }
    m._render(); UI.rerender(false);
    if (a === 'up' || a === 'buy') { const f = m.querySelector('.rf'); if (f) f.classList.add('glow-up'); m.querySelectorAll('.stats .v').forEach(v => v.classList.add('tick')); }
    UI.refocus(true);
  }

  // ------------------------------------------------------------------ pre-run loadout picker
  UI.loadoutPicker = (onGo) => {
    const S = UI.S();
    const anyStock = (D().CONSUMABLES || []).some(c => (S.cons[c.id] || 0) > 0);
    if (!anyStock) { onGo(); return; }
    const m = UI.modal('<div class="pnl pop-in" style="width:var(--lw);max-width:100%"></div>', { on: (a, el) => {
      const id = el.dataset.id;
      if (a === 'tog') {
        const lo = UI.S().loadout.map(l => ({ id: l.id, n: l.n })); const i = lo.findIndex(l => l.id === id);
        if (i >= 0) lo.splice(i, 1); else { if (lo.length >= D().CONS_MAX_TYPES) { UI.toast(t('toast.loadoutFull'), 'bad'); UI.sfx('error'); return; } lo.push({ id, n: D().CONS_MAX_UNITS }); }
        sys().setLoadout(lo); UI.sfx('click'); render(); UI.refocus();
      }
      if (a === 'go') { UI.closeModal(m, true); onGo(); }
      if (a === 'shop') { UI.closeModal(m, true); UI.show('hangar', { tab: 'cons' }); }
      if (a === 'close') UI.closeModal(m);
    } });
    m.style.setProperty('--lw', (UI.u * 250) + 'px');
    const render = () => {
      const S2 = UI.S(), lo = S2.loadout.map(l => l.id);
      m.firstElementChild.innerHTML = `<div class="pnl-h"><span class="t">${t('loadout.title')}</span><span class="body dim">${t('loadout.slots', { n: lo.length })}</span></div>
        <div class="body dim" style="margin-bottom:${UI.u * 4}px">${t('loadout.hint')}</div>
        <div class="grid" style="grid-template-columns:repeat(5,1fr)">${(D().CONSUMABLES || []).map(c => {
          const have = S2.cons[c.id] || 0, on = lo.includes(c.id);
          return `<div class="tile ${on ? 'picked' : ''} ${have ? '' : 'dimmed'}" data-f data-a="${have ? 'tog' : 'shop'}" data-id="${c.id}" data-k="lt-${c.id}"><i class="chk"></i>${UI.frame(1, UI.img('cons_' + c.id), { noPips: true, badge: have })}<span class="cap">${esc(t(c.nameKey))}</span></div>`;
        }).join('')}</div>
        <div class="acts"><button class="btn ghost" data-f data-a="shop">${t('loadout.shop')}</button><span class="sp"></span><button class="btn lg pri" data-f data-first data-a="go">${t('loadout.go')}</button></div>`;
    };
    render(); UI.refocus(true);
  };
})(window.NC = window.NC || {});
