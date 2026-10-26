'use strict';
// Neon Comet - Story Mode UI (agent ui). Screens: story (chapter map) -> storyCh (level path) -> storyTeam (team picker) -> dialog -> run
// -> storyRes (result, via NC.ui.storyEnd). Plus storyCrew (crew + items), storyClues (journal), UI.storyDialog(id, onDone),
// UI.storyAb (in-run ability buttons from NC.hud.crew). Data: NC.STORY, NC.story.sys (guarded, everything optional).
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  UI.screens = UI.screens || {};
  const t = (k, v) => (NC.t ? NC.t(k, v) : k);
  const esc = s => (UI.esc ? UI.esc(String(s == null ? '' : s)) : String(s == null ? '' : s));
  const fmt = n => (UI.fmt ? UI.fmt(n) : String(Math.round(n || 0)));
  const sfx = n => { try { UI.sfx && UI.sfx(n); } catch (e) {} };
  const has = id => { try { return !!(NC.assets && NC.assets.has && NC.assets.has(id)); } catch (e) { return false; } };
  const img = (id, cls) => (UI.img ? UI.img(id, cls || 'ico24') : '');
  const big = (id, cls) => (UI.bigImg ? UI.bigImg(id, cls || '') : '');
  const tk = (key, fb, v) => (key && (!NC.hasT || NC.hasT(key)) ? t(key, v) : fb);
  const ST = () => NC.STORY || {};
  const SY = () => (NC.story && NC.story.sys) || null;
  const call = (fn, ...a) => { const s = SY(); if (!s || typeof s[fn] !== 'function') return undefined; try { return s[fn](...a); } catch (e) { console.warn('story.sys.' + fn, e); return undefined; } };
  const save = () => (UI.S ? UI.S() : {}).story || {};
  const WORLDS = ['wreck', 'crystal', 'gas', 'jungle', 'hive', 'machine', 'edge'];
  const CREW = ['kael', 'nyra', 'brakk', 'sable', 'iko', 'vesh'];
  const SLOTS = ['cw', 'imp', 'art'];
  const MAXT = 3;

  // ------------------------------------------------------------------ data helpers
  const chapters = () => {
    const d = Array.isArray(ST().chapters) ? ST().chapters : [];
    return WORLDS.map((w, i) => Object.assign({ id: 'c' + (i + 1), world: w, levels: [] }, d[i] || {}, { idx: i }));
  };
  const lvState = id => call('levelState', id) || (save().prog || {})[id] || {};
  const findLv = id => { for (const c of chapters()) { const i = (c.levels || []).findIndex(l => l.id === id); if (i >= 0) return { ch: c, lv: c.levels[i], i }; } return null; };
  const chDone = c => (c.levels || []).length > 0 && c.levels.every(l => lvState(l.id).done);
  const chOpen = c => (c.levels || []).length > 0 && !c.locked && (c.idx === 0 || chDone(chapters()[c.idx - 1]));
  const lvOpen = (c, i) => { const l = c.levels[i]; const u = call('unlocked', l.id); if (u != null) return !!u; return chOpen(c) && (i === 0 || !!lvState(c.levels[i - 1].id).done); };
  const chStars = c => (c.levels || []).reduce((a, l) => a + (lvState(l.id).stars | 0), 0);
  const totStars = () => { const p = call('progress'); if (p && typeof p.stars === 'number') return p.stars; return chapters().reduce((a, c) => a + chStars(c), 0); };
  const chName = c => tk(c.nameKey, tk('story.world.' + c.world, c.world.toUpperCase()));
  const CH1 = () => chapters()[0];
  const CHESTS = () => { const k = Object.keys(CH1().chests || {}).map(Number).filter(n => n > 0).sort((a, b) => a - b); return k.length ? k : [10, 20, 30]; };
  const chestClaimed = n => { const r = call('chestClaimed', n, CH1().id); return r != null ? !!r : (save().chestsClaimed || []).includes(CH1().id + ':' + n); };

  const crewIds = () => { if (Array.isArray(ST().crewOrder) && ST().crewOrder.length) return ST().crewOrder; const c = ST().crew; const k = c && Object.keys(c); return k && k.length ? k : CREW; };
  const cDef = id => (ST().crew || {})[id] || {};
  const cName = id => tk(cDef(id).nameKey, id.charAt(0).toUpperCase() + id.slice(1));
  const cState = id => call('crew', id) || (save().crew || {})[id] || { lvl: 1, xp: 0, items: {} };
  const cOpen = id => {
    const r = call('crewUnlocked', id); if (r != null) return !!r; const s = cState(id); if (s && s.unlocked != null) return !!s.unlocked;
    const u = cDef(id).unlock; if (!u) return id === 'kael' || !ST().crew;
    return !!lvState(u).done;
  };
  const lockHint = id => {
    const u = cDef(id).unlock; if (!u) return t('sui.locked');
    const f = findLv(u); if (f && f.ch.idx > 0 && !chOpen(f.ch)) return t('sui.unlockCh', { n: f.ch.idx + 1 });
    if (!f && /^(\d+)-/.test(u) && +RegExp.$1 > 1) return t('sui.unlockCh', { n: RegExp.$1 });
    return t('sui.unlockAt', { id: u });
  };
  const xpNeed = (id, s) => s.need || s.xpNeed || (ST().crewXpFor ? ST().crewXpFor(s.lvl || 1) : (call('xpNeed', id) || 100 * (s.lvl || 1)));
  const abStats = id => call('abilityStats', id) || (cDef(id).ability || {});
  const fNum = v => (v == null || isNaN(v) ? '-' : Math.abs(v) < 1 && v !== 0 ? Math.round(v * 100) + '%' : (Math.round(v * 10) / 10).toString());
  const pasTxt = id => { const p = cDef(id).passive || {}; if (!p.stat) return ''; const v = p.v || 0; return '+' + (v < 1 ? Math.round(v * 100) + '%' : v) + ' ' + tk('sui.pas.' + p.stat, p.stat); };
  const itemDef = id => (ST().items || []).find(x => x.id === id) || {};
  const itemName = it => tk(itemDef(it.id).nameKey, it.id);
  const itemIco = it => itemDef(it.id).icon || ('ci_' + it.id);
  const itemSlot = it => itemDef(it.id).slot || it.slot || 'art';
  const items = () => (Array.isArray(save().items) ? save().items : []);
  const equippedMap = () => { const m = {}; crewIds().forEach(cid => { const it = cState(cid).items || {}; SLOTS.forEach(s => { if (it[s] != null) m[it[s]] = cid; }); }); return m; };
  const team = () => { const tm = call('team') || save().team || ['kael']; return tm.filter(cOpen).slice(0, MAXT); };

  const star = on => (has(on ? 'ui_star_on' : 'ui_star_off') ? img(on ? 'ui_star_on' : 'ui_star_off', 'st-si') : `<i class="st-sc ${on ? 'on' : ''}"></i>`);
  const stars = (n, cls) => `<span class="st-stars ${cls || ''}">${[1, 2, 3].map(i => star(i <= n)).join('')}</span>`;
  const port = (id, cls) => `<span class="st-port ${cls || ''}">${has('crew_' + id) ? big('crew_' + id) : `<b>${esc(cName(id).charAt(0))}</b>`}</span>`;
  const head = (title, right) => `<div class="scr-h"><button class="btn back sq" data-f data-a="back">&lt;</button><h2>${esc(title)}</h2><span class="sp" style="flex:1"></span>${right || ''}</div>`;
  const starChip = (a, b) => `<span class="chip st-chip">${star(true)}<b>${a}</b>${b != null ? `<small>/${b}</small>` : ''}</span>`;
  const bossIco = l => l.boss ? (has((l.boss.type === 'world' ? 'boss_' : 'mboss_') + l.boss.id) ? img((l.boss.type === 'world' ? 'boss_' : 'mboss_') + l.boss.id, 'st-bi') : `<i class="st-bt">${l.boss.type === 'world' ? 'B' : 'M'}</i>`) : '';
  const clueIco = () => (has('ui_clue') ? img('ui_clue', 'st-ci') : '<i class="st-cq">?</i>');
  const fTime = s => (UI.time ? UI.time(s) : Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'));
  const backTo = (name) => () => { if (UI.stack.length > 1) { sfx('click'); UI.close(); } else UI.show(name, {}, true); };

  // ------------------------------------------------------------------ chapter map
  UI.screens.story = {
    cls: 'dim story',
    render(el) {
      const cs = chapters(), tot = call('chapterStars', CH1().id) != null ? call('chapterStars', CH1().id) : chStars(CH1()), CH = CHESTS(), max = CH[CH.length - 1] || 30;
      const chest = n => {
        const done = chestClaimed(n), av = !done && (call('chestAvailable', n, CH1().id) != null ? !!call('chestAvailable', n, CH1().id) : tot >= n);
        return `<button class="st-chest ${done ? 'got' : av ? 'av' : ''}" data-f data-a="chest" data-id="${n}" style="left:${Math.min(100, n / max * 100)}%">
          ${img(has('chest_' + Math.min(3, CH.indexOf(n) + 1)) ? 'chest_' + Math.min(3, CH.indexOf(n) + 1) : 'chest_1', 'ico24')}<small>${done ? esc(t('sui.claimed')) : av ? esc(t('sui.claim')) : n}</small></button>`;
      };
      el.innerHTML = head(t('sui.title'), starChip(tot) +
        `<button class="btn sec sm" data-f data-a="crew">${esc(t('sui.crew'))}</button><button class="btn mut sm" data-f data-a="clues">${esc(t('sui.clues'))}</button>`) +
        `<div class="pnl st-prog"><span class="st-pl">${esc(t('sui.stars'))} <b>${tot}</b>/${max}</span><div class="st-bar"><i style="width:${Math.min(100, tot / max * 100)}%"></i>${CH.map(chest).join('')}</div></div>
        <div class="st-worlds">${cs.map(c => {
          const open = chOpen(c), soon = !(c.levels || []).length;
          const ico = has('world_' + c.world) ? big('world_' + c.world, 'st-wi') : `<span class="st-wph"></span>`;
          return `<button class="st-world ${open ? 'open' : 'lock'}${c.idx === 0 ? ' first' : ''}" data-f data-a="ch" data-id="${c.idx}"${c.idx === 0 ? ' data-first' : ''}>
            <span class="st-wimg">${ico}</span><small class="st-wn">${esc(t('sui.ch', { n: c.idx + 1 }))}</small><b>${esc(chName(c))}</b>
            ${open ? stars(0, 'hide') + `<span class="st-ws">${star(true)} ${chStars(c)}/${(c.levels || []).length * 3}</span>` : `<span class="st-wl">${img('ui_lock', 'ico12')}${esc(soon ? t('sui.soon') : t('sui.lockedCh'))}</span>`}</button>`;
        }).join('')}</div>`;
    },
    act(a, node) {
      if (a === 'back') return UI.back();
      if (a === 'crew') { sfx('click'); return UI.show('storyCrew', {}); }
      if (a === 'clues') { sfx('click'); return UI.show('storyClues', {}); }
      if (a === 'ch') {
        const c = chapters()[+node.dataset.id];
        if (!c || !chOpen(c)) { sfx('error'); UI.toast && UI.toast(t(!(c && c.levels.length) ? 'sui.soonToast' : 'sui.lockedCh')); return; }
        sfx('click'); return UI.show('storyCh', { ch: c.idx });
      }
      if (a === 'chest') {
        const n = +node.dataset.id; if (chestClaimed(n)) return;
        if (chStars(CH1()) < n) { sfx('error'); UI.toast && UI.toast(t('sui.chestNeed', { n })); return; }
        const r = call('claimChest', n, CH1().id); if (r === undefined || (r && r.ok === false)) { sfx('error'); return; }
        sfx('buy'); UI.toast && UI.toast(t('sui.chestGot') + rewardsTxt(r && (r.rewards || r)), 'good', 3500); UI.render();
      }
    },
    back() { if (UI.stack.length > 1) { sfx('click'); UI.close(); } else UI.show('menu', {}, true); },
  };
  const rewardsTxt = rw => {
    if (!rw || typeof rw !== 'object') return '';
    const p = []; if (rw.cr) p.push('+' + fmt(rw.cr) + ' cr'); if (rw.xp) p.push('+' + fmt(rw.xp) + ' XP');
    const its = [].concat(rw.items || [], rw.item ? [rw.item] : []); if (its.length) p.push(its.length + 'x ' + t('sui.item'));
    return p.length ? ': ' + p.join(', ') : '';
  };

  // ------------------------------------------------------------------ chapter level path
  const PATH = i => ({ x: 6 + i * 9.8, y: [72, 40, 64, 30, 50, 74, 42, 66, 32, 52][i % 10] });
  UI.screens.storyCh = {
    cls: 'dim story',
    render(el, st) {
      const c = chapters()[st.ch || 0], L = c.levels || [];
      let first = L.findIndex((l, i) => lvOpen(c, i) && !lvState(l.id).done); if (first < 0) first = 0;
      const pts = L.map((l, i) => PATH(i));
      el.innerHTML = head(t('sui.ch', { n: c.idx + 1 }) + ' · ' + chName(c), starChip(chStars(c), L.length * 3) +
        `<button class="btn sec sm" data-f data-a="crew">${esc(t('sui.crew'))}</button>`) +
        `<div class="pnl st-path st-w-${esc(c.world)}"><svg class="st-line" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${pts.map(p => p.x + ',' + p.y).join(' ')}"/></svg>
        ${L.map((l, i) => {
          const s = lvState(l.id), open = lvOpen(c, i), p = pts[i], bt = l.boss ? l.boss.type : '';
          return `<button class="st-node ${open ? 'open' : 'lock'}${s.done ? ' done' : ''}${bt ? ' b-' + bt : ''}" data-f data-a="lv" data-id="${esc(l.id)}"${i === first ? ' data-first' : ''} style="left:${p.x}%;top:${p.y}%">
            <span class="st-nc">${open ? esc(l.id.split('-').pop()) : img('ui_lock', 'ico12')}</span>${bossIco(l)}${l.clue ? `<span class="st-ncl${(save().clues || {})[l.clue] ? ' got' : ''}">${clueIco()}</span>` : ''}
            ${stars(s.stars | 0)}</button>`;
        }).join('')}</div>`;
    },
    act(a, node, s) {
      if (a === 'back') return UI.back();
      if (a === 'crew') { sfx('click'); return UI.show('storyCrew', {}); }
      if (a === 'lv') {
        const c = chapters()[s.state.ch || 0], i = c.levels.findIndex(l => l.id === node.dataset.id);
        if (i < 0 || !lvOpen(c, i)) { sfx('error'); UI.toast && UI.toast(t('sui.lockedLv')); return; }
        sfx('click'); UI.show('storyTeam', { id: node.dataset.id });
      }
    },
    back() { if (UI.stack.length > 1) { sfx('click'); UI.close(); } else UI.show('story', {}, true); },
  };

  // ------------------------------------------------------------------ pre-level: team picker
  const abLine = id => { const d = cDef(id), a = abStats(id), ab = d.ability || {}; return { name: tk(d.activeKey, ab.id || '-', { cd: a.cd, dur: a.dur, power: fNum(a.power) }), a }; };
  UI.screens.storyTeam = {
    cls: 'dim story',
    render(el, st) {
      const f = findLv(st.id); if (!f) { el.innerHTML = head(t('sui.noData')); return; }
      if (!st.team) st.team = team();
      const l = f.lv, s = lvState(l.id), rw = l.reward || {};
      const card = id => {
        const open = cOpen(id), sel = st.team.includes(id), cs = cState(id), ab = abLine(id);
        return `<button class="st-tc ${open ? '' : 'lock'}${sel ? ' sel' : ''}" data-f data-a="tog" data-id="${id}">
          ${port(id, 'md')}<span class="st-tci"><b>${esc(cName(id))}</b><small>${open ? esc(t('sui.crewLv', { n: cs.lvl || 1 })) : esc(lockHint(id))}</small>
          ${open ? `<span class="st-tab">${has('ab_' + id) ? img('ab_' + id, 'ico16') : ''}<em>${esc(ab.name)}</em></span><span class="st-tpa">${esc(pasTxt(id))}</span>` : ''}</span>
          ${sel ? `<i class="st-tn">${st.team.indexOf(id) + 1}</i>` : ''}</button>`;
      };
      el.innerHTML = head(t('sui.lvl', { id: l.id }) + (l.nameKey ? ' · ' + tk(l.nameKey, '') : ''), stars(s.stars | 0, 'hd')) +
        `<div class="st-tw"><div class="pnl st-li">
          <div class="sec-h">${esc(t('sui.lvl', { id: l.id }))}</div>
          <div class="st-kv"><span>${esc(t('sui.waves'))}</span><b>${(l.waves || []).length}${l.boss ? ' + ' + esc(t(l.boss.type === 'world' ? 'sui.boss' : 'sui.mini')) : ''}</b></div>
          <div class="st-kv"><span>${esc(t('sui.par'))}</span><b>${fTime(l.par || 0)}</b></div>
          ${s.best ? `<div class="st-kv"><span>${esc(t('sui.best'))}</span><b>${fTime(s.best)}</b></div>` : ''}
          <div class="st-sr">${[1, 2, 3].map(n => `<span>${stars(n)}<small>${esc(t('sui.star' + n))}</small></span>`).join('')}</div>
          <div class="sec-h">${esc(t('sui.rewards'))}</div>
          <div class="st-rw">${rw.cr ? (UI.cr ? UI.cr(rw.cr) : fmt(rw.cr)) : ''}${rw.xp ? `<span class="chip">+${fmt(rw.xp)} ${esc(t('sui.xp'))}</span>` : ''}${rw.item ? `<span class="chip">${esc(t('sui.item'))}</span>` : ''}${l.clue ? `<span class="chip">${clueIco()} ${esc(t('sui.clue'))}</span>` : ''}</div>
          ${!s.done ? `<small class="st-first">${esc(t('sui.first'))}</small>` : ''}
        </div><div class="pnl st-tp"><div class="sec-h">${esc(t('sui.teamN', { a: st.team.length, b: MAXT }))}<i>${esc(t('sui.pick'))}</i></div>
          <div class="st-tg">${crewIds().map(card).join('')}</div>
          <div class="st-ta"><button class="btn pri lg" data-f data-a="go" data-first>${esc(t('sui.start'))}</button></div></div></div>`;
    },
    act(a, node, s) {
      const st = s.state;
      if (a === 'back') return UI.back();
      if (a === 'tog') {
        const id = node.dataset.id; if (!cOpen(id)) { sfx('error'); UI.toast && UI.toast(lockHint(id)); return; }
        const i = st.team.indexOf(id);
        if (i >= 0) st.team.splice(i, 1); else if (st.team.length >= MAXT) { sfx('error'); UI.toast && UI.toast(t('sui.teamFull')); return; } else st.team.push(id);
        sfx('click'); const k = UI.focusKey && UI.focusKey(); UI.render(s); k && UI.restoreFocus(k); return;
      }
      if (a === 'go') {
        if (!st.team.length) { sfx('error'); UI.toast && UI.toast(t('sui.teamMin')); return; }
        call('setTeam', st.team.slice()); sfx('click'); UI.storyPlay(st.id);
      }
    },
  };

  // ------------------------------------------------------------------ run start / end
  UI.storyPlay = (id) => {
    const f = findLv(id); if (!f) { UI.toast && UI.toast(t('sui.noData'), 'bad'); return; }
    if (!NC.game || typeof NC.game.startStory !== 'function') { UI.toast && UI.toast(t('sui.noEngine'), 'bad'); return; }
    const go = () => {
      UI.closeAll(); UI.hud && UI.hud.show && UI.hud.show(true); UI._storyId = id;
      try { NC.audio && NC.audio.unlock && NC.audio.unlock(); } catch (e) {}
      try { NC.game.startStory(id); } catch (e) { console.error('startStory', e); }
    };
    if (f.lv.dialogBefore && !lvState(id).done) UI.storyDialog(f.lv.dialogBefore, go); else go();
  };
  UI.storyEnd = (r) => {
    r = r || {}; const id = r.id || UI._storyId, f = findLv(id);
    const was = !!lvState(id).done, tm = team(), before = {};
    tm.forEach(c => { const s = cState(c); before[c] = { lvl: s.lvl || 1 }; });
    const crewBefore = crewIds().filter(cOpen);
    let res = r.stars != null || r.rewards ? r : call('finishLevel', id, { hpFrac: r.hpFrac, time: r.time, won: !!r.won });
    res = res || {}; const rws = res.rewards || {}; const out = { id, won: !!r.won, hpFrac: r.hpFrac, time: r.time, stars: r.won ? (res.stars | 0) : 0, rewards: res.rewards || {}, first: !was && !!r.won, before,
      newCrew: rws.newCrew || crewIds().filter(c => cOpen(c) && !crewBefore.includes(c)) };
    try { UI.storyAb.hide(); } catch (e) {}
    if (r.quit) { toMap(f ? f.ch.idx : 0); return; }
    const show = () => { UI.hud && UI.hud.show && UI.hud.show(false); UI.closeAll(); UI.show('storyRes', out, true); sfx(out.won ? 'levelup' : 'gameover'); };
    const dA = f && f.lv.dialogAfter;
    if (out.won && out.first && dA) { UI.hud && UI.hud.show && UI.hud.show(false); UI.storyDialog(dA, show); } else show();
  };
  const toMap = (ch, extra) => {
    try { const g = NC.game; if (g && g.storyQuit) g.storyQuit(); else if (g && g.quit && g.mode !== 'menu') g.quit(); } catch (e) {}
    UI.hud && UI.hud.show && UI.hud.show(false);
    try { NC.audio && NC.audio.music && NC.audio.music('menu'); } catch (e) {}
    UI.show('menu', {}, true); UI.show('story'); if (ch != null) UI.show('storyCh', { ch }); if (extra) UI.show(extra.name, extra.state);
  };
  UI.screens.storyRes = {
    cls: 'dim story st-res',
    render(el, st) {
      const f = findLv(st.id), rw = st.rewards || {}, its = [].concat(rw.items || [], rw.item ? [rw.item] : []);
      const crewRow = Object.keys(st.before || {}).map(c => {
        const s = cState(c), need = xpNeed(c, s), up = (s.lvl || 1) > st.before[c].lvl;
        return `<div class="st-rc">${port(c, 'sm')}<span><b>${esc(cName(c))}</b><small>${esc(t('sui.crewLv', { n: s.lvl || 1 }))}${(st.rewards.crewXp || {})[c] ? ' · +' + fmt(st.rewards.crewXp[c]) + ' XP' : ''}${s.canLevel || up ? ' · <em>' + esc(t('sui.lvUp')) + '</em>' : ''}</small>
          <span class="st-xb"><i style="width:${Math.min(100, (s.xp || 0) / need * 100)}%"></i></span></span></div>`;
      }).join('');
      const nx = f && f.ch.levels[f.i + 1], nxOpen = nx && st.won && lvOpen(f.ch, f.i + 1);
      el.innerHTML = `<div class="st-rw2"><div class="pnl st-rp ${st.won ? 'win' : 'lose'}">
        <div class="st-rt pix-title">${esc(t(st.won ? 'sui.victory' : 'sui.defeat'))}</div><small class="st-rs">${esc(t('sui.lvl', { id: st.id }))}</small>
        <div class="st-big">${[1, 2, 3].map(i => `<span class="st-bs ${i <= st.stars ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.35}s">${star(i <= st.stars)}</span>`).join('')}</div>
        <div class="st-kvr"><span>${esc(t('sui.time'))} <b>${fTime(st.time || 0)}</b></span><span>${esc(t('sui.hp'))} <b>${Math.round((st.hpFrac || 0) * 100)}%</b></span></div>
        ${st.won ? `<div class="sec-h">${esc(t('sui.rewards'))}${st.first ? `<i>${esc(t('sui.first'))}</i>` : ''}</div>
        <div class="st-rw">${rw.cr ? (UI.cr ? UI.cr(rw.cr) : fmt(rw.cr)) : ''}${rw.xp ? `<span class="chip">+${fmt(rw.xp)} ${esc(t('sui.crewXp'))}</span>` : ''}
          ${its.map(it => UI.frame ? UI.frame(it.r | 0, img(itemIco(it), 'ico24'), { lvl: it.lvl || 1, cls: 'sm' }) : '').join('')}
          ${rw.clue ? `<span class="chip">${clueIco()} ${esc(t('sui.newClue', { n: tk((ST().clues || {})[rw.clue] && ST().clues[rw.clue].titleKey, rw.clue) }))}</span>` : ''}
          ${(st.newCrew || []).map(c => `<span class="chip on">${esc(t('sui.newCrew', { n: cName(c) }))}</span>`).join('')}</div>` : ''}
        </div><div class="pnl st-rx"><div class="sec-h">${esc(t('sui.crewXp'))}</div>${crewRow}
        <div class="st-ra">${nxOpen ? `<button class="btn pri" data-f data-a="next" data-first>${esc(t('sui.next'))}</button>` : ''}
          <button class="btn sec" data-f data-a="retry"${nxOpen ? '' : ' data-first'}>${esc(t('sui.retry'))}</button>
          <button class="btn mut" data-f data-a="map">${esc(t('sui.map'))}</button></div></div></div>`;
    },
    act(a, node, s) {
      const st = s.state, f = findLv(st.id), ch = f ? f.ch.idx : 0;
      if (a === 'map' || a === 'back') { sfx('click'); return toMap(ch); }
      if (a === 'retry') { sfx('click'); toMap(ch, { name: 'storyTeam', state: { id: st.id } }); return; }
      if (a === 'next' && f) { sfx('click'); toMap(ch, { name: 'storyTeam', state: { id: f.ch.levels[f.i + 1].id } }); }
    },
    back(s) { this.act('map', null, s); },
  };

  // ------------------------------------------------------------------ dialog player
  // UI.storyDialog(id, onDone): NC.STORY.dialogs[id] = [{who, textKey, panel?}]. Tap = next, Skip = end. Back/Circle = skip.
  UI.storyDialog = (id, onDone) => {
    const lines = ((ST().dialogs || {})[id] || []).filter(Boolean);
    let i = 0, done = false;
    const fin = () => { if (done) return; done = true; if (UI.modals.includes(m)) UI.closeModal(m, true); try { onDone && onDone(); } catch (e) { console.error(e); } };
    if (!lines.length) { done = true; try { onDone && onDone(); } catch (e) { console.error(e); } return null; }
    const who = w => (w && (ST().crew || {})[w] || CREW.includes(w) ? cName(w) : tk('sui.who.' + w, tk('story.who.' + w, w || t('sui.who.unknown'))));
    const build = () => {
      const L = lines[i], w = L.who || '', right = i % 2 === 1 && w !== 'kael';
      const panel = L.panel ? `<div class="sd-panel">${has(L.panel) ? big(L.panel) : ''}</div>` : '<div class="sd-panel empty"></div>';
      return `<div class="sd-wrap">${panel}<div class="sd-box ${right ? 'rt' : ''}">${port(w, 'sd-p')}
        <div class="sd-tx"><b class="sd-n">${esc(who(w))}</b><p>${esc(tk(L.textKey, L.text || L.textKey || ''))}</p><small class="sd-h">${esc(t('sui.tap'))} · ${i + 1}/${lines.length}</small></div></div>
        <div class="sd-acts"><button class="btn mut sm" data-f data-a="skip">${esc(t('sui.skip'))}</button><button class="btn pri sm" data-f data-first data-a="next">&gt;</button></div></div>`;
    };
    const next = () => { if (done) return; sfx('click'); i++; if (i >= lines.length) return fin(); m.innerHTML = build(); UI.refocus && UI.refocus(true); };
    const m = UI.modal(build(), { cls: 'sd-modal', dismiss: false, back: fin, on: (a) => { if (a === 'skip') fin(); else next(); } });
    m.addEventListener('click', e => { if (!e.target.closest('[data-a]')) next(); });
    return m;
  };

  // ------------------------------------------------------------------ crew screen
  UI.screens.storyCrew = {
    cls: 'dim story',
    render(el, st) {
      const ids = crewIds(); if (!st.sel || !ids.includes(st.sel)) st.sel = ids.find(cOpen) || ids[0];
      const id = st.sel, d = cDef(id), cs = cState(id), open = cOpen(id), need = xpNeed(id, cs), ab = abLine(id), a = ab.a || {};
      const eq = equippedMap(), mine = cs.items || {}, all = items();
      const slot = s => {
        const it = mine[s] != null && all.find(x => x.uid === mine[s]);
        return `<div class="st-sl">${UI.frame ? UI.frame(it ? it.r | 0 : null, it ? img(itemIco(it), 'ico32') : '', { lvl: it ? it.lvl || 1 : null, empty: !it, equipped: !!it, attrs: `data-f data-a="${it ? 'item' : 'slot'}" data-id="${it ? esc(it.uid) : s}"` }) : ''}<small>${esc(t('sui.slot.' + s))}</small></div>`;
      };
      const inv = all.slice().sort((x, y) => (eq[y.uid] ? 0 : 1) - (eq[x.uid] ? 0 : 1) || (y.r | 0) - (x.r | 0) || (y.lvl | 0) - (x.lvl | 0));
      el.innerHTML = head(t('sui.crew'), `<button class="btn sec sm" data-f data-a="merge">${esc(t('sui.mergeAll'))}</button>`) +
        `<div class="st-cw"><nav class="st-cl">${ids.map(c => `<button class="st-cli ${c === id ? 'on' : ''} ${cOpen(c) ? '' : 'lock'}" data-f data-a="sel" data-id="${c}"${c === id ? ' data-first' : ''}>${port(c, 'sm')}<span><b>${esc(cName(c))}</b><small>${cOpen(c) ? esc(t('sui.crewLv', { n: cState(c).lvl || 1 })) : esc(t('sui.locked'))}</small></span></button>`).join('')}</nav>
        <div class="pnl st-cd scroll"><div class="st-ch">${port(id, 'lg')}<div class="st-chi"><b class="st-cn">${esc(cName(id))}</b><small>${esc(tk(d.traitKey, ''))}</small>
          ${open ? `<div class="st-lv"><span>${esc(t('sui.crewLv', { n: cs.lvl || 1 }))}</span><span class="st-xb"><i style="width:${Math.min(100, (cs.xp || 0) / need * 100)}%"></i></span><small>${fmt(cs.xp || 0)}/${fmt(need)}</small>${cs.canLevel ? `<button class="btn pri sm" data-f data-a="lvup">${esc(t('sui.lvUpBtn'))}</button>` : ''}</div>` : `<div class="st-lk">${img('ui_lock', 'ico12')} ${esc(lockHint(id))}</div>`}</div>
          <div class="st-slots">${SLOTS.map(slot).join('')}</div></div>
          <div class="st-abx"><span class="st-abi">${has('ab_' + id) ? img('ab_' + id, 'ico32') : ''}</span><div><span class="st-tag">${esc(t('sui.active'))}</span> <b>${esc(ab.name)}</b>
            <div class="st-abs"><span>${esc(t('sui.cd'))} <b>${esc(t('sui.sec', { n: fNum(a.cd) }))}</b></span>${a.dur ? `<span>${esc(t('sui.dur'))} <b>${esc(t('sui.sec', { n: fNum(a.dur) }))}</b></span>` : ''}${a.power != null ? `<span>${esc(t('sui.power'))} <b>${esc(fNum(a.power))}</b></span>` : ''}</div></div></div>
          <div class="st-abx"><span class="st-abi pas">+</span><div><span class="st-tag cy">${esc(t('sui.passive'))}</span> <b>${esc(tk(d.passiveKey, '', { v: (cDef(id).passive || {}).v }))}</b><div class="st-abs"><span><b>${esc(pasTxt(id))}</b></span></div></div></div>
          <div class="sec-h">${esc(t('sui.inv'))}<i>${all.length}</i></div>
          ${inv.length ? `<div class="st-inv">${inv.map(it => UI.frame ? UI.frame(it.r | 0, img(itemIco(it), 'ico24'), { lvl: it.lvl || 1, equipped: !!eq[it.uid], attrs: `data-f data-a="item" data-id="${esc(it.uid)}"` }) : '').join('')}</div>` : `<p class="st-empty">${esc(t('sui.invEmpty'))}</p>`}
        </div></div>`;
    },
    act(a, node, s) {
      const st = s.state;
      if (a === 'back') return UI.back();
      if (a === 'sel') { st.sel = node.dataset.id; sfx('click'); UI.render(s); return; }
      if (a === 'slot') { sfx('click'); const sc = s.el.querySelector('.st-inv .rf'); sc && UI.setFocus && UI.setFocus(sc); return; }
      if (a === 'item') return itemCard(node.dataset.id, st.sel, s);
      if (a === 'merge') return mergeAll(s);
      if (a === 'lvup') { const r = call('levelUpCrew', st.sel); if (r && r.ok === false) { UI.err && UI.err(r); return; } sfx('levelup'); UI.render(s); return; }
    },
    tab(dir, s) { const ids = crewIds(), i = ids.indexOf(s.state.sel); s.state.sel = ids[(i + dir + ids.length) % ids.length]; UI.render(s); },
  };
  function itemCard(uid, cid, s) {
    const it = items().find(x => String(x.uid) === String(uid)); if (!it || !UI.infoCard) return;
    const d = itemDef(it.id), owner = equippedMap()[it.uid], sl = itemSlot(it), forW = d.crew || d.for;
    const stats = [[t('sui.slot.' + sl), t('common.lvl', { n: it.lvl || 1 })]];
    if (forW) stats.push([t('sui.forWho'), forW === 'any' ? t('sui.anyCrew') : cName(forW)]);
    const inf = call('itemInfo', it) || {}, pc = v => '+' + (Math.round(v * 1000) / 10) + '%';
    if (inf.pow) stats.push([t('sui.power'), pc(inf.pow)]); if (inf.cd) stats.push([t('sui.cd'), '-' + pc(inf.cd).slice(1)]); if (inf.dur) stats.push([t('sui.dur'), pc(inf.dur)]);
    Object.keys(inf.ship || d.ship || {}).forEach(k => { const v = (inf.ship || d.ship)[k]; if (v) stats.push([tk('sui.pas.' + k, k), pc(v)]); });
    if (owner) stats.push([t('sui.equippedOn', { n: cName(owner) }), '']);
    const canEq = cOpen(cid) && (!forW || forW === 'any' || forW === cid);
    UI.infoCard({ img: itemIco(it), r: it.r | 0, title: itemName(it), desc: tk(d.descKey, ''), stats,
      actions: [owner ? { a: 'un', label: t('sui.unequip'), cls: 'back' } : null, owner !== cid ? { a: 'eq', label: t('sui.equip') + ' · ' + cName(cid), cls: 'pri', off: !canEq } : null],
      on: (a) => {
        let r; if (a === 'eq') r = call('equipItem', cid, it.uid); else if (a === 'un') r = call('unequip', owner, sl, it.uid);
        if (r && r.ok === false) { UI.err && UI.err(r); return; } sfx('equip'); setTimeout(() => UI.render(s), 0);
      } });
  }
  function mergeAll(s) {
    const eq = equippedMap(); let made = 0, guard = 50;
    while (guard-- > 0) {
      const g = {}; items().filter(x => !eq[x.uid] && (x.r | 0) < 4).forEach(x => { const k = itemSlot(x) + '|' + (x.r | 0); (g[k] = g[k] || []).push(x); });
      const grp = Object.values(g).find(a => a.length >= 3); if (!grp) break;
      grp.sort((a, b) => (a.lvl | 0) - (b.lvl | 0));
      const r = call('mergeItems', grp.slice(0, 3).map(x => x.uid)); if (!r || r.ok === false) break; made++;
    }
    if (made) { sfx('buy'); UI.toast && UI.toast(t('sui.merged', { n: made }), 'good'); UI.render(s); } else { sfx('error'); UI.toast && UI.toast(t('sui.noMerge')); }
  }

  // ------------------------------------------------------------------ clues journal
  UI.screens.storyClues = {
    cls: 'dim story',
    render(el, st) {
      const C = ST().clues || {}, ids = Object.keys(C), got = save().clues || {}, n = ids.filter(c => got[c]).length;
      if (!st.sel || !got[st.sel]) st.sel = ids.find(c => got[c]) || null;
      const cur = st.sel && C[st.sel];
      el.innerHTML = head(t('sui.clues'), `<span class="chip">${esc(t('sui.cluesFound', { a: n, b: ids.length }))}</span>`) +
        `<div class="st-cw"><nav class="st-cl scroll">${ids.map((c, i) => `<button class="st-cli ${got[c] ? '' : 'lock'} ${c === st.sel ? 'on' : ''}" data-f data-a="clue" data-id="${esc(c)}"${i === 0 ? ' data-first' : ''}>
          <span class="st-cin">${got[c] ? clueIco() : img('ui_lock', 'ico12')}</span><span><b>${esc(got[c] ? tk(C[c].titleKey, c) : t('sui.clueLocked'))}</b><small>#${i + 1}</small></span></button>`).join('')}</nav>
        <div class="pnl st-cd scroll st-clue">${cur ? `<div class="sec-h">${esc(tk(cur.titleKey, st.sel))}</div><p>${esc(tk(cur.textKey, ''))}</p>` : `<p class="st-empty">${esc(t('sui.clueLockedD'))}</p>`}</div></div>`;
    },
    act(a, node, s) {
      if (a === 'back') return UI.back();
      if (a === 'clue') { if (!(save().clues || {})[node.dataset.id]) { sfx('error'); return; } s.state.sel = node.dataset.id; sfx('click'); UI.render(s); }
    },
  };

  // ------------------------------------------------------------------ in-run ability buttons
  // Reads NC.hud.crew = [{id, cd01, active}] (cd01 = remaining cooldown fraction, 0 = ready). Own root #stAb above #touchUI,
  // bottom row left of the consumable/dash cluster (mirrored for lefty). Hidden when no story run / HUD hidden.
  const AB = UI.storyAb = { el: null, sig: '' };
  const abGlyph = i => {
    const pad = NC.Input && NC.Input.device === 'pad';
    if (pad) { let g = null; try { g = NC.Input.glyph && NC.Input.glyph('ab' + (i + 1)); } catch (e) {} if (g && g.spr) return img(g.spr, 'st-gl'); return `<kbd>${esc((g && g.txt) || ['L1', 'R1', 'L2'][i])}</kbd>`; }
    if (document.body.classList.contains('touch')) return '';
    const k = (NC.game && NC.game.abilityKeys) || ['1', '2', '3']; return `<kbd>${esc(k[i])}</kbd>`;
  };
  AB.hide = () => { if (AB.el) AB.el.hidden = true; };
  function abEnsure() {
    if (AB.el) return AB.el; const st = document.getElementById('stage'); if (!st) return null;
    const el = AB.el = document.createElement('div'); el.id = 'stAb'; el.hidden = true; st.appendChild(el);
    el.addEventListener('pointerdown', e => { const b = e.target.closest('[data-i]'); if (!b) return; e.preventDefault(); e.stopPropagation();
      try { NC.game && NC.game.useAbility && NC.game.useAbility(+b.dataset.i); } catch (err) { console.error(err); } }, { passive: false });
    return el;
  }
  function abLoop() {
    requestAnimationFrame(abLoop);
    const g = NC.game, c = NC.hud && NC.hud.crew, hud = document.getElementById('hud');
    const on = !!(g && (g.mode === 'play' || g.mode === 'paused') && Array.isArray(c) && c.length && hud && !hud.hidden && (g.story || (g.run && g.run.story) || UI._storyId));
    const el = abEnsure(); if (!el) return;
    if (!on) { if (!el.hidden) el.hidden = true; return; }
    el.hidden = false;
    const sig = c.map(x => x.id).join(',') + '|' + (NC.Input && NC.Input.device) + '|' + document.body.className.includes('touch');
    if (sig !== AB.sig) {
      AB.sig = sig;
      el.innerHTML = c.slice(0, MAXT).map((x, i) => `<button class="st-ab s${i}" type="button" data-i="${i}">${has('ab_' + x.id) ? img('ab_' + x.id, 'st-abim') : `<b>${esc(cName(x.id).charAt(0))}</b>`}<i class="cd"></i><span class="gl">${abGlyph(i)}</span></button>`).join('');
    }
    const bs = el.children;
    for (let i = 0; i < bs.length && i < c.length; i++) {
      const p = Math.max(0, Math.min(1, +c[i].cd01 || 0)), b = bs[i];
      const ps = p.toFixed(3); if (b._p !== ps) { b._p = ps; b.style.setProperty('--p', ps); }
      b.classList.toggle('rdy', p <= 0); b.classList.toggle('act', !!c[i].active);
    }
  }
  requestAnimationFrame(abLoop);
})(window.NC = window.NC || {});
