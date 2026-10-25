'use strict';
// Neon Comet 3.0 - Home menu, Missions, Achievements, Exit (UI agent).
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  UI.screens = UI.screens || {};
  const t = (k, v) => NC.t(k, v);
  const esc = s => UI.esc(s);

  // ------------------------------------------------------------------ home (centered, opaque)
  UI.screens.menu = {
    cls: '',
    render(el) {
      const S = UI.S(), lv = NC.DATA.levelFromXp(S.xp), cs = NC.sys.computeStats();
      let misReady = 0, achReady = 0;
      try { misReady = NC.sys.missions().list.filter(m => m.done && !m.claimed).length; achReady = NC.sys.achievements().filter(a => a.done && !a.claimed).length; } catch (e) {}
      const logo = NC.assets && NC.assets.has && NC.assets.has('ui_logo')
        ? UI.img('ui_logo', 'logo-img')
        : `<div class="logo-txt">NEON <span>COMET</span></div>`;
      const sd = NC.sys.def('ship', S.ships.eq) || { r: 0 };
      el.innerHTML = `<div class="home pop-in">
          <div class="logo">${logo}<div class="logo-sub">${t('menu.tagline')}</div></div>
          <div class="pnl pilot">${UI.frame(sd.r, UI.img('ship_' + S.ships.eq, 'ico24'), { noPips: true })}
            <div class="info"><div class="ln"><span class="b">${t('menu.pilotLvl', { n: lv.lvl })}</span><span class="cr">${UI.icoCr()}<b>${UI.fmt(S.crystals)}</b></span></div>
              <div class="bar xp thin"><i style="width:${(lv.into / lv.need * 100).toFixed(1)}%"></i></div>
              <div class="ln body"><span class="dim">${t('common.power')} <b class="c-acc">${UI.fmt(cs.power)}</b></span><span class="dim">${t('menu.best')} <b style="color:var(--tx)">${UI.num(S.best)}</b></span></div></div></div>
          <button class="btn lg pri" data-f data-first data-a="start">${t('menu.start')}</button>
          <div class="grid2">
            <button class="btn" data-f data-a="hangar">${t('menu.hangar')}${S.chests.some(n => n > 0) ? '<i class="dot"></i>' : ''}</button>
            <button class="btn" data-f data-a="missions">${t('menu.missions')}${misReady ? '<i class="dot"></i>' : ''}</button>
            <button class="btn" data-f data-a="achievements">${t('menu.achievements')}${achReady ? '<i class="dot"></i>' : ''}</button>
            <button class="btn" data-f data-a="settings">${t('menu.settings')}</button>
            <button class="btn" data-f data-a="account">${t('menu.account')}</button>
            <button class="btn ghost" data-f data-a="exit">${t('menu.exit')}</button>
          </div></div>
        <div class="home-foot">${esc(NC.VERSION ? 'v' + NC.VERSION : t('menu.version'))}</div>`;
    },
    act(a) {
      UI.sfx('click');
      if (a === 'start') UI.loadoutPicker(() => UI.launch());
      else if (a === 'exit') UI.show('exit');
      else UI.show(a);
    },
    back() { UI.show('exit'); },
  };

  // ------------------------------------------------------------------ missions
  UI.screens.missions = {
    cls: 'dim',
    render(el, st, s) {
      const M = NC.sys.missions();
      el.innerHTML = `<div class="scr-h"><button class="btn sq" data-f data-a="back">&lt;</button><h2>${t('missions.title')}</h2><span class="sp"></span>
          <span class="chip body" id="misT">${t('missions.refresh', { t: UI.time(M.msLeft / 1000) })}</span><span class="chip cr">${UI.icoCr()}<b>${UI.fmt(UI.crystals())}</b></span></div>
        <div class="pnl" style="flex:1;min-height:0;display:flex;flex-direction:column"><div class="scroll" style="flex:1;min-height:0"><div class="list">
        ${M.list.map(m => `<div class="li mis-li ${m.claimed ? 'done' : ''}">${UI.frame(m.diff, UI.img(m.reward.chest != null ? 'chest_' + m.reward.chest : 'ui_crystal', m.reward.chest != null ? 'ico24' : 'ico16'), { noPips: false })}
            <div class="tx"><span class="b">${esc(t(m.descKey, { n: UI.fmt(m.goal) }))}</span><div class="bar ${m.done ? 'good' : 'warm'} thin"><i style="width:${(m.prog / m.goal * 100).toFixed(1)}%"></i></div><span class="body dim">${t('common.progress', { a: UI.fmt(m.prog), b: UI.fmt(m.goal) })}</span></div>
            <div class="rw">${UI.rewardHtml(m.reward)}</div>
            ${m.claimed ? `<span class="chip body dim">${t('common.claimed')}</span>` : `<button class="btn sm ${m.done ? 'warm' : 'off'}" data-f data-a="claim" data-id="${m.id}" data-k="mc-${m.id}">${t('common.claim')}</button>`}</div>`).join('')}
        <div class="li ${M.bonus.claimed ? 'done' : ''}">${UI.frame(3, UI.img('chest_' + (M.bonus.reward.chest || 1), 'ico24'), { noPips: true })}<div class="tx"><span class="b">${t('missions.bonus')}</span><span class="body dim">${M.list.filter(m => m.claimed).length} / ${M.list.length}</span></div>
          <div class="rw">${UI.rewardHtml(M.bonus.reward)}</div>
          ${M.bonus.claimed ? `<span class="chip body dim">${t('common.claimed')}</span>` : `<button class="btn sm ${M.bonus.ready ? 'warm' : 'off'}" data-f data-a="claim" data-id="bonus" data-k="mc-bonus">${t('common.claim')}</button>`}</div>
        </div></div></div>`;
      clearInterval(s.timer); s.timer = setInterval(() => { const e = el.querySelector('#misT'); if (!e || !document.body.contains(e)) return clearInterval(s.timer); e.textContent = t('missions.refresh', { t: UI.time(NC.sys.msToMidnight() / 1000) }); }, 1000);
    },
    act(a, el) {
      if (a === 'back') { UI.back(); return; }
      if (a === 'claim') { const r = NC.sys.claimMission(el.dataset.id); if (UI.err(r)) { UI.sfx('mission_done'); UI.toast(t('toast.claimed', { n: UI.fmt(r.reward.cr || 0) }), 'warm'); } UI.rerender(); }
    },
  };

  // ------------------------------------------------------------------ achievements
  UI.screens.achievements = {
    cls: 'dim',
    render(el) {
      const A = NC.sys.achievements();
      const fams = []; const by = {};
      for (const a of A) { if (!by[a.fam]) { by[a.fam] = []; fams.push(a.fam); } by[a.fam].push(a); }
      const unlocked = A.filter(a => a.done).length, ready = A.filter(a => a.done && !a.claimed).length;
      // one row per family: the first unclaimed tier (or the last one when all are claimed)
      const rows = fams.map(f => by[f].find(a => !a.claimed) || by[f][by[f].length - 1]);
      rows.sort((x, y) => ((y.done && !y.claimed) - (x.done && !x.claimed)) || (y.prog / y.goal - x.prog / x.goal));
      el.innerHTML = `<div class="scr-h"><button class="btn sq" data-f data-a="back">&lt;</button><h2>${t('ach.title')}</h2><span class="sp"></span>
          <span class="chip body">${t('ach.count', { a: unlocked, b: A.length })}</span>${ready ? `<span class="chip body c-warm">${t('ach.ready', { n: ready })}</span>` : ''}<span class="chip cr">${UI.icoCr()}<b>${UI.fmt(UI.crystals())}</b></span></div>
        <div class="pnl" style="flex:1;min-height:0;display:flex;flex-direction:column"><div class="scroll" style="flex:1;min-height:0"><div class="ach-grid">
        ${rows.map(a => {
          const all = by[a.fam].every(x => x.claimed);
          return `<div class="li ${all ? 'done' : ''}"><span class="tier t${a.tier}">${t(a.tierKey)}</span>
            <div class="tx"><span class="b">${esc(t(a.nameKey))}</span><span class="body">${esc(t(a.descKey, { n: a.stat === 'playtime' ? UI.time(a.goal) : UI.fmt(a.goal) }))}</span>
              <div class="bar ${a.done ? 'good' : 'warm'} thin"><i style="width:${(a.prog / a.goal * 100).toFixed(1)}%"></i></div></div>
            <div class="col" style="align-items:flex-end;gap:${UI.u * 2}px">${UI.rewardHtml(a.reward)}
            ${all ? `<span class="body dim">${t('common.claimed')}</span>` : `<button class="btn sm ${a.done ? 'warm' : 'off'}" data-f data-a="claim" data-id="${a.id}" data-k="ac-${a.fam}">${t('common.claim')}</button>`}</div></div>`;
        }).join('')}</div></div></div>`;
    },
    act(a, el) {
      if (a === 'back') { UI.back(); return; }
      if (a === 'claim') { const r = NC.sys.claimAch(el.dataset.id); if (UI.err(r)) { UI.sfx('mission_done'); UI.toast(t('toast.achDone') + ' +' + UI.fmt(r.reward.cr || 0), 'warm'); } UI.rerender(); }
    },
  };

  // ------------------------------------------------------------------ exit
  UI.screens.exit = {
    cls: 'dim',
    render(el) {
      el.innerHTML = `<div class="pnl center-pnl pop-in" style="max-width:${UI.u * 220}px"><div class="ttl">${t('exit.title')}</div><div class="body dim" style="text-align:center">${t('exit.text')}</div>
        <button class="btn pri" data-f data-first data-a="back">${t('exit.back')}</button><button class="btn ghost" data-f data-a="close">${t('common.close')}</button></div>`;
      try { NC.sys.save(); } catch (e) {}
    },
    act(a) { if (a === 'back') UI.close(); if (a === 'close') { try { window.close(); } catch (e) {} setTimeout(() => UI.close(), 300); } },
  };
})(window.NC = window.NC || {});
