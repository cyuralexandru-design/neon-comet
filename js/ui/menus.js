'use strict';
// Neon Comet 3.1 - Home menu, Missions, Achievements, Exit (menus agent). Uses UI.MN helpers from settings.js (loads first).
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  UI.screens = UI.screens || {};
  const t = (k, v) => NC.t(k, v);
  const esc = s => UI.esc(s);
  const MN = () => UI.MN;
  // achievement family / stat -> badge glyph
  const BADGE = { kills: 'crosshair', bosses: 'skull', boss: 'skull', score: 'star', runs: 'planet', sector: 'planet', combo: 'bolt', playtime: 'clock', time: 'clock',
    crystals: 'gem', rich: 'gem', level: 'rank', lvl: 'rank', ships: 'fleet', chests: 'chest', chestsOpened: 'chest', merge: 'merge', evolve: 'evo', upgrade: 'up',
    legendary: 'spark', ultra: 'spark', daily: 'clock', missions: 'list', nohit: 'shield', revive: 'shield', set: 'card' };
  const badge = a => BADGE[a.fam] || BADGE[a.stat] || 'trophy';
  const tierCls = a => 'tr' + ((a.tier | 0) % 3);

  // ------------------------------------------------------------------ home (centered, opaque, dark)
  UI.screens.menu = {
    cls: 'mn mn-scr mn-homescr',
    render(el) {
      const S = UI.S(), lv = NC.DATA.levelFromXp(S.xp), cs = NC.sys.computeStats(), M = MN();
      let misReady = 0, achReady = 0;
      try { misReady = NC.sys.missions().list.filter(m => m.done && !m.claimed).length; achReady = NC.sys.achievements().filter(a => a.done && !a.claimed).length; } catch (e) {}
      const logo = NC.assets && NC.assets.has && NC.assets.has('ui_logo') ? UI.img('ui_logo', 'logo-img mn-logoimg') : `<div class="logo-txt mn-logotxt">NEON <span>COMET</span></div>`;
      const sd = NC.sys.def('ship', S.ships.eq) || { r: 0 };
      const dot = n => n ? '<i class="mn-dot"></i>' : '';
      const nb = (a, ico, label, d) => `<button class="mn-hb mn-cut" data-f data-a="${a}" data-k="h-${a}">${M.ico(ico)}<span>${esc(label)}</span>${d || ''}</button>`;
      const pct = lv.need > 0 ? Math.max(0, Math.min(1, lv.into / lv.need)) : 1;
      el.innerHTML = `<div class="mn-home pop-in">
          <div class="mn-logo">${logo}<div class="mn-tag">${esc(t('menu.tagline'))}</div></div>
          <div class="mn-pilot mn-cut">${UI.frame(sd.r, UI.img('ship_' + S.ships.eq, 'ico24'), { noPips: true })}
            <div class="mn-pinfo"><div class="mn-pl1"><b>${esc(t('menu.pilotLvl', { n: lv.lvl }))}</b>${M.cr(S.crystals)}</div>
              <div class="mn-bar"><i style="width:${(pct * 100).toFixed(1)}%"></i></div>
              <div class="mn-pl2"><span>${esc(t('common.power'))} <b class="amb">${UI.fmt(cs.power)}</b></span><span>${esc(t('menu.best'))} <b>${UI.num(S.best)}</b></span></div></div></div>
          <button class="btn pri lg cut mn-start" data-f data-first data-a="start" data-k="h-start">${M.ico('play')}<span>${esc(t('menu.start'))}</span></button>
          <div class="mn-hgrid">
            ${nb('hangar', 'ship', t('menu.hangar'), dot(S.chests.some(n => n > 0)))}${nb('missions', 'list', t('menu.missions'), dot(misReady))}
            ${nb('achievements', 'trophy', t('menu.achievements'), dot(achReady))}${nb('settings', 'gear', t('menu.settings'))}
            ${nb('account', 'user', t('menu.account'))}${nb('help', 'help', t('menu.help'))}
          </div>
          <button class="mn-exitb" data-f data-a="exit" data-k="h-exit">${M.ico('power')}<span>${esc(t('menu.exit'))}</span></button>
        </div>
        <div class="mn-foot">${esc(M.ver())}</div>`;
    },
    act(a) {
      UI.sfx('click');
      if (a === 'start') { if (UI.screens.modes) UI.show('modes'); else UI.loadoutPicker(() => UI.launch()); }
      else if (a === 'exit') UI.show('exit');
      else if (a === 'help') { if (UI.screens.help) UI.show('help'); else UI.toast(t('menu.helpSoon')); }
      else UI.show(a);
    },
    back() { UI.show('exit'); },
  };

  // ------------------------------------------------------------------ shared row pieces
  const claimBtn = (id, ready, key) => `<button class="btn sm cut ${ready ? 'pri' : 'off'}" ${ready ? 'data-f' : 'disabled aria-disabled="true"'} data-a="claim" data-id="${id}" data-k="${key}">${esc(t('common.claim'))}</button>`;
  const doneTag = () => `<span class="mn-cl">${MN().ico('check')}<span>${esc(t('common.claimed'))}</span></span>`;

  // ------------------------------------------------------------------ missions
  UI.screens.missions = {
    cls: 'mn mn-scr',
    render(el, st, s) {
      const M = NC.sys.missions(), m$ = MN();
      const fin = M.list.filter(m => m.claimed).length;
      const row = (ico, tierC, name, sub, prog, rew, state, done) => `<div class="mn-row mn-cut ${done ? 'done' : ''}">
          <div class="mn-rb ${tierC}">${ico}</div>
          <div class="mn-rt"><b class="mn-rn">${esc(name)}</b>${sub ? `<span class="mn-rd">${esc(sub)}</span>` : ''}${prog}</div>
          <div class="mn-rr">${rew}${state}</div></div>`;
      const list = M.list.map(m => {
        const icon = m.reward.chest != null ? m$.img('chest_' + m.reward.chest, 'mn-i24') : m$.img('ui_crystal', 'mn-i16');
        return row(icon, 'tr' + ((m.diff | 0) % 3), t(m.descKey, { n: UI.fmt(m.goal) }), t('menu.mis.diff.' + ((m.diff | 0) % 3)),
          m$.prog(m.prog, m.goal, t('common.progress', { a: UI.fmt(m.prog), b: UI.fmt(m.goal) })), m$.reward(m.reward),
          m.claimed ? doneTag() : claimBtn(m.id, m.done, 'mc-' + m.id), m.claimed);
      }).join('');
      const bonus = row(m$.img('chest_' + (M.bonus.reward.chest || 1), 'mn-i24'), 'tr3', t('menu.mis.bonusName'), t('menu.mis.bonusDesc'),
        m$.prog(fin, M.list.length, fin + ' / ' + M.list.length), m$.reward(M.bonus.reward), M.bonus.claimed ? doneTag() : claimBtn('bonus', M.bonus.ready, 'mc-bonus'), M.bonus.claimed);
      el.innerHTML = `${m$.top(t('missions.title'), `${m$.pill('', `<b id="misT">${esc(t('missions.refresh', { t: UI.time(M.msLeft / 1000) }))}</b>`)}${m$.crPill()}`)}
        <div class="mn-listpnl mn-cut"><div class="scroll mn-lscroll"><div class="mn-col">${m$.grp(t('menu.mis.daily'), fin + ' / ' + M.list.length)}${list}${bonus}</div></div></div>`;
      clearInterval(s.timer);
      s.timer = setInterval(() => { const e = el.querySelector('#misT'); if (!e || !document.body.contains(e)) return clearInterval(s.timer); e.textContent = t('missions.refresh', { t: UI.time(NC.sys.msToMidnight() / 1000) }); }, 1000);
    },
    act(a, el) {
      if (a === 'back') { UI.sfx('click'); UI.back(); return; }
      if (a === 'claim') { const r = NC.sys.claimMission(el.dataset.id); if (UI.err(r)) { UI.sfx('mission_done'); UI.toast(t('toast.claimed', { n: UI.fmt(r.reward.cr || 0) }), 'warm'); } UI.rerender(); }
    },
  };

  // ------------------------------------------------------------------ achievements (ONE column)
  UI.screens.achievements = {
    cls: 'mn mn-scr',
    render(el) {
      const A = NC.sys.achievements(), m$ = MN();
      const fams = [], by = {};
      for (const a of A) { if (!by[a.fam]) { by[a.fam] = []; fams.push(a.fam); } by[a.fam].push(a); }
      const unlocked = A.filter(a => a.done).length, ready = A.filter(a => a.done && !a.claimed).length;
      const rows = fams.map(f => by[f].find(a => !a.claimed) || by[f][by[f].length - 1]);
      rows.sort((x, y) => ((y.done && !y.claimed) - (x.done && !x.claimed)) || (y.prog / y.goal - x.prog / x.goal));
      const html = rows.map(a => {
        const all = by[a.fam].every(x => x.claimed), n = by[a.fam].length, idx = by[a.fam].indexOf(a) + 1;
        const goal = a.stat === 'playtime' ? UI.time(a.goal) : UI.fmt(a.goal);
        const progTxt = a.stat === 'playtime' ? UI.time(a.prog) + ' / ' + UI.time(a.goal) : UI.fmt(a.prog) + ' / ' + UI.fmt(a.goal);
        return `<div class="mn-row mn-cut ${all ? 'done' : ''} ${a.done && !all ? 'rdy' : ''}">
          <div class="mn-rb ${tierCls(a)}">${m$.ico(badge(a))}</div>
          <div class="mn-rt"><div class="mn-rn2"><b class="mn-rn">${esc(t(a.nameKey))}</b><span class="mn-tier ${tierCls(a)}">${esc(t(a.tierKey))} · ${esc(t('menu.ach.tier', { a: idx, b: n }))}</span></div>
            <span class="mn-rd">${esc(t(a.descKey, { n: goal }))}</span>${m$.prog(a.prog, a.goal, progTxt)}</div>
          <div class="mn-rr">${all ? '' : m$.reward(a.reward)}${all ? doneTag() : claimBtn(a.id, a.done, 'ac-' + a.fam)}</div></div>`;
      }).join('');
      el.innerHTML = `${m$.top(t('ach.title'), `${m$.pill('', `<b>${esc(t('ach.count', { a: unlocked, b: A.length }))}</b>`, ready ? 'hot' : '')}${ready ? m$.pill('', `<b>${esc(t('ach.ready', { n: ready }))}</b>`, 'hot') : ''}${m$.crPill()}`)}
        <div class="mn-listpnl mn-cut"><div class="scroll mn-lscroll"><div class="mn-col">${html}</div></div></div>`;
    },
    act(a, el) {
      if (a === 'back') { UI.sfx('click'); UI.back(); return; }
      if (a === 'claim') { const r = NC.sys.claimAch(el.dataset.id); if (UI.err(r)) { UI.sfx('mission_done'); UI.toast(t('toast.achDone') + ' +' + UI.fmt(r.reward.cr || 0), 'warm'); } UI.rerender(); }
    },
  };

  // ------------------------------------------------------------------ exit
  UI.screens.exit = {
    cls: 'mn mn-scr mn-exitscr',
    render(el) {
      const M = MN();
      el.innerHTML = `<div class="mn-xbox pnl cut pop-in"><div class="mn-mh">${M.ico('power')}<span>${esc(t('exit.title'))}</span></div>
        <p class="mn-mmsg">${esc(t('exit.text'))}</p><p class="mn-note mn-saved">${M.ico('check')} ${esc(t('menu.exit.saved'))}</p>
        <div class="mn-macts"><button class="btn mut sm cut" data-f data-a="close" data-k="x-close">${esc(t('menu.exit.close'))}</button><button class="btn pri cut" data-f data-first data-a="back" data-k="x-back">${esc(t('exit.back'))}</button></div></div>`;
      try { NC.sys.save(); } catch (e) {}
    },
    act(a) { if (a === 'back') UI.close(); if (a === 'close') { try { window.close(); } catch (e) {} setTimeout(() => UI.close(), 300); } },
    back() { UI.close(); },
  };
})(window.NC = window.NC || {});
