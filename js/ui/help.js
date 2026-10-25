'use strict';
// Neon Comet 3.1 - Help screen (agent help). UI.screens.help: left section tabs + right scrollable content.
// Live data: NC.enemies.def(id), NC.DATA.* (ENEMIES, CARDS, RARITY, runXpFor, BOSS_EVERY ...). All text via NC.t (keys help.*).
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  UI.screens = UI.screens || {};
  const t = (k, p) => (NC.t ? NC.t(k, p) : k);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => (UI.fmt ? UI.fmt(n) : String(Math.round(n)));
  const img = (id, cls) => (UI.img ? UI.img(id, cls || 'ico24') : '');
  const D = () => NC.DATA || {};
  const rcol = (r) => { const R = (D().RARITY || [])[r]; return R ? R.col : 'var(--r' + r + ')'; };
  const SECS = ['play', 'controls', 'pickups', 'cards', 'hangar', 'bosses', 'bestiary', 'levels'];
  const SEC_ICO = { play: 'ui_crystal', controls: 'pk_star', pickups: 'pk_crystal', cards: 'card_dmg', hangar: 'chest_1', bosses: 'boss_colos', bestiary: 'en_drone', levels: 'pk_xp' };
  const tx = (k, p, fb) => { const v = t(k, p); return v === k && fb != null ? fb : v; };
  const glyph = (a, i) => { try { return NC.Input && NC.Input.glyph ? NC.Input.glyph(a, i) : null; } catch (e) { return null; } };
  const key = (s) => `<kbd class="hk">${esc(s)}</kbd>`;
  const pad = (a, txt, i) => { const g = glyph(a, i); return g && g.spr ? img(g.spr, 'ico16') + ' ' + esc(txt) : g && g.txt ? `<kbd class="hk">${esc(g.txt)}</kbd> ${esc(txt)}` : esc(txt); };
  const card = (title, body, ico) => `<div class="hp-card">${ico ? `<div class="hp-ic">${ico}</div>` : ''}<div class="hp-tx"><b>${esc(title)}</b><p>${body}</p></div></div>`;
  const nm = (id) => tx('en.' + id + '.name', null, id);
  const pct = (v) => Math.round(v * 100) + '%';

  // ------------------------------------------------------------------ section builders
  const B = {};
  B.play = () => {
    const d = D(), cons = d.CONS_MAX_TYPES || 3, units = d.CONS_MAX_UNITS || 3;
    const evs = (d.EVENTS || []).map(e => t(e.nameKey)).join(', ');
    return `<p class="hp-lead">${esc(t('help.play.intro'))}</p>` +
      card(t('help.play.goal.t'), esc(t('help.play.goal.d', { n: fmt(d.BOSS_EVERY || 50000) })), img('ui_crystal')) +
      card(t('help.play.fire.t'), esc(t('help.play.fire.d')), img('pk_star')) +
      card(t('help.play.dash.t'), esc(t('help.play.dash.d')), img('pk_xp')) +
      card(t('help.play.cons.t'), esc(t('help.play.cons.d', { t: cons, u: units })), img('chest_0')) +
      card(t('help.play.cards.t'), esc(t('help.play.cards.d')), img('card_dmg')) +
      card(t('help.play.revive.t'), esc(t('help.play.revive.d', { n: (d.REVIVE && d.REVIVE.max) || 3 })), img('pk_repair')) +
      card(t('help.play.hangar.t'), esc(t('help.play.hangar.d')), img('chest_1')) +
      card(t('help.play.events.t'), esc(t('help.play.events.d', { list: evs })), img('pk_supernova'));
  };
  B.controls = () => {
    const row = (a, v) => `<div class="hp-row"><span class="a">${esc(a)}</span><span class="v">${v}</span></div>`;
    let h = `<h3 class="hp-h">${esc(t('help.ctl.touch'))}</h3>` +
      row(t('help.act.move'), esc(t('help.ctl.t.move'))) + row(t('help.act.aim'), esc(t('help.ctl.t.aim'))) +
      row(t('help.act.dash'), esc(t('help.ctl.t.dash'))) + row(t('help.act.consAll'), esc(t('help.ctl.t.cons'))) +
      row(t('help.act.pause'), esc(t('help.ctl.t.pause'))) + row(t('help.act.hand'), esc(t('help.ctl.t.hand')));
    h += `<h3 class="hp-h">${esc(t('help.ctl.kb'))}</h3>` +
      row(t('help.act.move'), key('W') + key('A') + key('S') + key('D') + ' ' + esc(t('help.ctl.k.or')) + ' ' + key(t('help.ctl.k.arrows')) + ' / ' + esc(t('help.ctl.k.mouse'))) +
      row(t('help.act.aim'), esc(t('help.ctl.k.aim'))) +
      row(t('help.act.dash'), key(t('help.ctl.k.space')) + ' ' + esc(t('help.ctl.k.or')) + ' ' + key(t('help.ctl.k.shift')) + ' / ' + esc(t('help.ctl.k.rclick'))) +
      row(t('help.act.consAll'), key('1') + key('2') + key('3')) +
      row(t('help.act.pause'), key('P') + ' / ' + key('Esc')) +
      row(t('help.act.ok'), key('Enter')) + row(t('help.act.back'), key('Esc')) + row(t('help.act.tabs'), key('Q') + key('E'));
    const on = glyph('ok') ? ` <span class="hp-on">${esc(t('help.ctl.padOn'))}</span>` : '';
    h += `<h3 class="hp-h">${esc(t('help.ctl.pad'))}${on}</h3>` +
      row(t('help.act.move'), esc(t('help.ctl.p.lstick'))) +
      row(t('help.act.dash'), pad('dash', 'R2')) +
      row(t('help.act.cons', { n: 1 }), pad('cons1', 'Cross', 0)) + row(t('help.act.cons', { n: 2 }), pad('cons2', 'Square', 1)) + row(t('help.act.cons', { n: 3 }), pad('cons3', 'Triangle', 2)) +
      row(t('help.act.pause'), pad('pause', 'Options')) +
      row(t('help.act.ok'), pad('ok', 'Cross')) + row(t('help.act.back'), pad('back', 'Circle')) +
      row(t('help.act.tabs'), key('L1') + key('R1')) + row(t('help.act.nav'), esc(t('help.ctl.p.lstick')) + ' / ' + esc(t('help.ctl.p.dpad')));
    return h + `<p class="hp-note">${esc(t('help.ctl.padNote'))}</p>`;
  };
  B.pickups = () => `<p class="hp-lead">${esc(t('help.pk.intro'))}</p>` +
    [['crystal', 'pk_crystal'], ['xp', 'pk_xp'], ['star', 'pk_star'], ['repair', 'pk_repair'], ['nova', 'pk_supernova'], ['chest', 'chest_2']]
      .map(([k, s]) => card(t('help.pk.' + k + '.t'), esc(t('help.pk.' + k + '.d')), img(s, 'ico32'))).join('');
  B.cards = () => {
    const d = D(), W = d.CARD_RARITY_W || [46, 28, 16, 8, 2], tot = W.reduce((a, b) => a + b, 0) || 1;
    let h = `<p class="hp-lead">${esc(t('help.cards.intro'))}</p><h3 class="hp-h">${esc(t('help.rar.h'))}</h3><div class="hp-rars">` +
      [0, 1, 2, 3, 4].map(r => `<div class="hp-rar" style="--rc:${rcol(r)}"><b>${esc(t('rarity.' + r))}</b><small>${esc(t('help.rar.chance', { p: Math.round(W[r] / tot * 100) }))}</small><span>${esc(t('help.rar.' + r))}</span></div>`).join('') + '</div>';
    h += card(t('help.cards.how.t'), esc(t('help.cards.how.d'))) +
      card(t('help.cards.reroll.t'), esc(t('help.cards.reroll.d', { a: d.rerollCost ? d.rerollCost(1) : 50, b: d.rerollCost ? d.rerollCost(2) : 100, c: d.rerollCost ? d.rerollCost(3) : 200 }))) +
      card(t('help.cards.evo.t'), esc(t('help.cards.evo.d', { n: 8 })));
    const cs = (d.CARDS || []).filter(c => c && c.id);
    if (cs.length) {
      h += `<h3 class="hp-h">${esc(t('help.cards.all'))}</h3><div class="hp-grid">` + cs.map(c => {
        const r = c.r || 0, ico = c.sprite || ('card_' + c.id);
        return `<div class="hp-chip" data-f data-a="card" data-id="${esc(c.id)}" style="--rc:${rcol(r)}">${img(ico, 'ico24')}<span>${esc(tx('card.' + c.id + '.name', null, c.id))}</span><small>${esc(t('help.cards.max', { n: c.max || 1 }))}</small></div>`;
      }).join('') + '</div>';
    }
    return h;
  };
  B.hangar = () => {
    const d = D(), list = (a, k) => (a || []).map(x => t(typeof k === 'function' ? k(x) : x[k])).join(', ');
    return `<p class="hp-lead">${esc(t('help.h.intro'))}</p>` +
      card(t('help.h.ships.t'), esc(t('help.h.ships.d')), img('ship_comet', 'ico24')) +
      card(t('help.h.wpn.t'), esc(t('help.h.wpn.d', { list: list(d.WEAPONS, w => 'wpn.' + w.id + '.name') })), img('pk_star')) +
      card(t('help.h.tur.t'), esc(t('help.h.tur.d'))) + card(t('help.h.comp.t'), esc(t('help.h.comp.d')), img('comp_orb')) +
      card(t('help.h.gear.t'), esc(t('help.h.gear.d', { list: list(d.GEAR_SLOTS, 'nameKey') }))) +
      card(t('help.h.sets.t'), esc(t('help.h.sets.d')) + '<br>' + esc(list(d.SETS, 'nameKey'))) +
      card(t('help.h.merge.t'), esc(t('help.h.merge.d'))) + card(t('help.h.sell.t'), esc(t('help.h.sell.d'))) +
      card(t('help.h.chest.t'), esc(t('help.h.chest.d')) + '<br><i>' + esc(t('help.h.pity', { n: 10 })) + '</i>', img('chest_3')) +
      card(t('help.h.cons.t'), esc(t('help.h.cons.d', { t: d.CONS_MAX_TYPES || 3, u: d.CONS_MAX_UNITS || 3 })));
  };
  B.bosses = () => {
    const d = D(), BS = (NC.bosses && NC.bosses.BOSSES) || [], MN = (NC.bosses && NC.bosses.MINIS) || [], ev = d.BOSS_EVERY || 50000;
    const el = d.ELITE || { from: 5, hp: 2.5, dmg: 1.4 };
    let h = `<p class="hp-lead">${esc(t('help.boss.intro', { n: fmt(ev) }))}</p>` +
      card(t('help.boss.bar.t'), `<span class="hp-seg"><i></i><i></i><i></i></span> ` + esc(t('help.boss.bar.d'))) +
      card(t('help.boss.reward.t'), esc(t('help.boss.reward.d', { n: BS.length || 5 }))) +
      `<h3 class="hp-h">${esc(t('help.boss.list'))}</h3>`;
    h += BS.map((b, i) => {
      const atk = [...new Set([].concat(...(b.phases || [])))].map(a => tx('help.atk.' + a, null, a)).join(' · ');
      return `<div class="hp-card boss"><div class="hp-ic big">${img('boss_' + b.id, 'ico48')}</div><div class="hp-tx"><b>${esc(tx('boss.' + b.id + '.name', null, b.id))}</b>
        <small>${esc(t('help.boss.at', { n: fmt(ev * (i + 1)) }))} · ${esc(t('help.boss.hp', { n: fmt(b.hp) }))}</small><p>${esc(tx('help.boss.' + b.id, null, t('help.boss.unknown')))}</p><small class="atk">${esc(atk)}</small></div></div>`;
    }).join('');
    h += card(t('help.mboss.t'), esc(t('help.mboss.d', { list: MN.map(m => tx('mboss.' + m.id + '.name', null, m.id)).join(', ') })), MN[0] ? img('mboss_' + MN[0].id, 'ico32') : '') +
      card(t('help.elite.t'), esc(t('help.elite.d', { s: el.from, h: el.hp, d: el.dmg })));
    return h;
  };
  // live enemy stats
  const enemyIds = () => (Array.isArray(D().ENEMIES) ? D().ENEMIES.map(e => e.id) : Object.keys((NC.enemies && NC.enemies.DEFS) || {}));
  const enDef = (id) => { try { return NC.enemies && NC.enemies.def ? NC.enemies.def(id) : { id }; } catch (e) { return { id }; } };
  const dEn = (id) => (Array.isArray(D().ENEMIES) ? D().ENEMIES.find(e => e.id === id) : null) || {};
  const armor = (d) => { const a = d.armor != null ? d.armor : dEn(d.id).armor; return typeof a === 'number' && a > 0 ? Math.round(a <= 1 ? a * 100 : a) + '%' : '—'; };
  const attack = (id) => tx('help.en.' + id + '.a', null, t('help.en.unknown.a'));
  const secOf = (id) => { const e = dEn(id); if (e.from == null) return t('help.sec.unknown'); if (e.from >= 99) { const par = enemyIds().map(dEn).find(p => p.splitInto === id || p.spawn === id); return par ? t('help.sec.child', { p: nm(par.id) }) : t('help.sec.unknown'); } return (e.to != null && e.to < 99) ? t('help.sec.range', { a: e.from + 1, b: e.to }) : t('help.sec.from', { a: e.from + 1 }); };
  const spawnOf = (id) => { const e = dEn(id); const c = e.splitInto || e.spawn; if (!c) return null; return t('help.best.spawns', { name: nm(c), n: e.splitN || e.spawnN || 1 }); };
  B.bestiary = () => `<p class="hp-lead">${esc(t('help.best.intro'))}</p><div class="hp-tblh"><span></span><span></span><span>${esc(t('help.col.hp'))}</span><span>${esc(t('help.col.dmg'))}</span><span>${esc(t('help.col.arm'))}</span><span>${esc(t('help.col.xp'))}</span></div>` +
    enemyIds().map(id => {
      const d = enDef(id), sp = spawnOf(id);
      return `<div class="hp-en" data-f data-a="enemy" data-id="${esc(id)}">${img('en_' + id, 'ico32')}<div class="n"><b>${esc(nm(id))}</b><small>${esc(tx('help.en.' + id + '.d', null, t('help.en.unknown.d')))}</small><small class="atk">${esc(attack(id))} · ${esc(secOf(id))}${sp ? ' · ' + esc(sp) : ''}</small></div>
        <span class="c">${fmt(d.hp || 0)}</span><span class="c">${fmt(d.dmg || 0)}</span><span class="c">${esc(armor(d))}</span><span class="c">${fmt(d.xp || 0)}</span></div>`;
    }).join('');
  B.levels = () => {
    const f = D().runXpFor || (l => 100 * l), xs = enemyIds().map(id => enDef(id).xp).filter(x => x > 0);
    let tot = 0, rows = '';
    for (let l = 1; l <= 30; l++) { const n = f(l); tot += n; rows += `<tr><td>${l}</td><td>${fmt(n)}</td><td>${fmt(tot)}</td></tr>`; }
    return `<p class="hp-lead">${esc(t('help.lvl.intro', { a: Math.min(...xs, 1), b: Math.max(...xs, 1) }))}</p><p class="hp-note">${esc(t('help.lvl.note'))}</p>` +
      `<table class="hp-tbl"><thead><tr><th>${esc(t('help.lvl.c.lvl'))}</th><th>${esc(t('help.lvl.c.need'))}</th><th>${esc(t('help.lvl.c.total'))}</th></tr></thead><tbody>${rows}</tbody></table>`;
  };

  // ------------------------------------------------------------------ info cards
  function enemyCard(id) {
    if (!UI.infoCard) return;
    const d = enDef(id), de = dEn(id), el = D().ELITE || {}, sc = D().sectorScale ? D().sectorScale(3) : { hp: 1 };
    const stats = [[t('help.st.hp'), fmt(d.hp || 0)], [t('help.st.hpAt', { n: 4 }), fmt(Math.round((d.hp || 0) * sc.hp))], [t('help.st.dmg'), fmt(d.dmg || 0)], [t('help.st.arm'), armor(d)],
      [t('help.st.xp'), fmt(d.xp || 0)], [t('help.st.pts'), fmt(d.score || de.points || 0)], [t('help.st.cr'), fmt(d.cr || 0)], [t('help.st.sec'), secOf(id)], [t('help.st.atk'), attack(id)]];
    if (el.hp) stats.push([t('help.st.elite'), t('help.st.eliteV', { h: el.hp, d: el.dmg })]);
    const sp = spawnOf(id); if (sp) stats.push([t('help.st.spawn'), sp]);
    UI.infoCard({ img: 'en_' + id, r: null, title: nm(id), sub: attack(id), desc: tx('help.en.' + id + '.d', null, t('help.en.unknown.d')), stats });
  }
  function cardCard(id) {
    if (!UI.infoCard) return;
    const c = (D().CARDS || []).find(x => x.id === id); if (!c) return;
    UI.infoCard({ img: c.sprite || 'card_' + id, r: c.r || 0, title: tx('card.' + id + '.name', null, id), sub: t('rarity.' + (c.r || 0)), desc: tx('card.' + id + '.desc', null, ''), stats: [[t('help.rar.h'), t('rarity.' + (c.r || 0))], ['Max', t('help.cards.max', { n: c.max || 1 })]] });
  }

  // ------------------------------------------------------------------ screen
  UI.screens.help = {
    cls: 'dim help',
    render(el, st) {
      st.sec = SECS.includes(st.sec) ? st.sec : 'play';
      let body = ''; try { body = B[st.sec](); } catch (e) { console.warn('help', e); body = ''; }
      el.innerHTML = `<div class="scr-h"><button class="btn back sq" data-f data-a="back">&lt;</button><h2>${esc(t('help.title'))}</h2><span class="sp"></span></div>
        <div class="hp-wrap"><nav class="hp-tabs">${SECS.map(s => `<button class="tab hp-tab ${s === st.sec ? 'on' : ''}" data-f data-a="sec" data-id="${s}">${img(SEC_ICO[s], 'ico16')}<span>${esc(t('help.sec.' + s))}</span></button>`).join('')}</nav>
        <div class="pnl hp-pane"><div class="scroll hp-scroll">${body}</div></div></div>`;
    },
    act(a, node, s) {
      if (a === 'back') return UI.back();
      if (a === 'sec') { if (s.state.sec === node.dataset.id) return; s.state.sec = node.dataset.id; UI.sfx && UI.sfx('click'); UI.render(s); const sc = s.el.querySelector('.hp-scroll'); if (sc) sc.scrollTop = 0; return; }
      if (a === 'enemy') return enemyCard(node.dataset.id);
      if (a === 'card') return cardCard(node.dataset.id);
    },
    back() { if (UI.stack && UI.stack.length > 1) UI.close(); else if (UI.show) UI.show('menu', {}, true); },
    tab(dir) { const s = UI.top(); if (!s || s.name !== 'help') return; const i = SECS.indexOf(s.state.sec || 'play'); s.state.sec = SECS[(i + dir + SECS.length) % SECS.length]; UI.render(s); },
  };
})(window.NC = window.NC || {});
