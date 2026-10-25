'use strict';
// Neon Comet 3.0 - Settings + Account (UI agent). Settings live in NC.save.settings (systems save.js defaults):
// lang, ctrl(null=auto|'pc'|'touch'|'gamepad'), aim(null=auto|'manual'), hand, music, sfx, vibe, shake, dmgNum,
// quality, fps, joySize, btnAlpha, colorblind. Changes apply instantly (UI.applySettings) and persist via NC.sys.save().
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  UI.screens = UI.screens || {};
  const t = (k, v) => NC.t(k, v);
  const esc = s => UI.esc(s);
  const SECTIONS = ['controls', 'audio', 'video', 'gameplay', 'data'];
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const seg = (k, opts, val) => `<div class="segc">${opts.map(([v, l]) => `<button class="btn ${String(val) === String(v) ? 'sel' : ''}" data-f data-a="set" data-key="${k}" data-v="${v}" data-k="s-${k}-${v}">${esc(l)}</button>`).join('')}</div>`;
  const tog = (k, on) => `<button class="btn tog ${on ? 'on' : ''}" data-f data-a="tog" data-key="${k}" data-k="t-${k}" aria-pressed="${!!on}"></button>`;
  const sld = (k, v, min, max) => `<div class="sld"><button class="btn" data-f data-a="sld" data-key="${k}" data-d="-1" data-k="sl-${k}">-</button><div class="bar"><i style="width:${((v - min) / (max - min) * 100).toFixed(0)}%"></i></div><button class="btn" data-f data-a="sld" data-key="${k}" data-d="1" data-k="sr-${k}">+</button><span class="v">${Math.round(v * 100)}%</span></div>`;
  const row = (label, ctl, hint) => `<div class="set-row"><div class="lb"><span>${esc(label)}</span>${hint ? `<span class="body">${esc(hint)}</span>` : ''}</div>${ctl}</div>`;
  const RANGES = { music: [0, 1], sfx: [0, 1], joySize: [0.6, 1.4], btnAlpha: [0.3, 1] };

  function body(sec, s) {
    if (sec === 'controls') return [
      row(t('settings.ctrl'), seg('ctrl', [['auto', t('settings.ctrl.auto')], ['pc', t('settings.ctrl.pc')], ['touch', t('settings.ctrl.touch')], ['gamepad', t('settings.ctrl.gamepad')]], s.ctrl || 'auto')),
      row(t('settings.aim'), seg('aim', [['auto', t('settings.aim.auto')], ['manual', t('settings.aim.manual')]], s.aim || 'auto')),
      row(t('settings.hand'), seg('hand', [['right', t('settings.hand.right')], ['left', t('settings.hand.left')]], s.hand || 'right')),
      row(t('settings.joySize'), sld('joySize', s.joySize || 1, 0.6, 1.4)),
      row(t('settings.btnOpacity'), sld('btnAlpha', s.btnAlpha == null ? 0.85 : s.btnAlpha, 0.3, 1)),
    ].join('');
    if (sec === 'audio') return [
      row(t('settings.music'), sld('music', s.music == null ? 0.55 : s.music, 0, 1)),
      row(t('settings.sfx'), sld('sfx', s.sfx == null ? 0.8 : s.sfx, 0, 1)),
      row(t('settings.vibration'), tog('vibe', s.vibe !== false), isIOS() ? t('settings.iosVibe') : ''),
    ].join('');
    if (sec === 'video') return [
      row(t('settings.quality'), seg('quality', [['low', t('settings.quality.low')], ['med', t('settings.quality.med')], ['high', t('settings.quality.high')]], s.quality || 'high')),
      row(t('settings.fps'), tog('fps', !!s.fps)),
      row(t('settings.shake'), tog('shake', s.shake !== false)),
      row(t('settings.dmgNumbers'), tog('dmgNum', s.dmgNum !== false)),
    ].join('');
    if (sec === 'gameplay') return [
      row(t('settings.lang'), seg('lang', [['ro', 'Romana'], ['en', 'English']], s.lang || NC.lang)),
      row(t('settings.colorblind'), tog('colorblind', !!s.colorblind), t('settings.colorblind.hint')),
      row(t('settings.tutorial'), `<button class="btn sm" data-f data-a="tut">${t('settings.tutorialReplay')}</button>`),
      row(t('settings.credits'), '', t('settings.creditsText')),
    ].join('');
    if (sec === 'data') return [
      row(t('settings.export'), `<button class="btn sm" data-f data-a="export">${t('account.copy')}</button>`, t('account.codeHint')),
      row(t('settings.import'), `<button class="btn sm" data-f data-a="import">${t('account.load')}</button>`),
      row(t('settings.reset'), `<button class="btn sm bad" data-f data-a="reset">${t('settings.reset')}</button>`),
    ].join('');
    return '';
  }

  UI.screens.settings = {
    cls: 'dim',
    render(el, st) {
      st.sec = st.sec || 'controls';
      const s = UI.settings();
      el.innerHTML = `<div class="scr-h"><button class="btn sq" data-f data-a="back">&lt;</button><h2>${t('settings.title')}</h2><span class="sp"></span><span class="pad-hint body dim">L1 / R1</span></div>
        <div class="set-wrap"><div class="set-nav">${SECTIONS.map(x => `<button class="btn ${st.sec === x ? 'sel' : ''}" data-f data-a="sec" data-id="${x}" data-k="sec-${x}">${t('settings.sec.' + x)}</button>`).join('')}</div>
        <div class="pnl set-body"><div class="scroll" style="flex:1;min-height:0"><div class="set-list">${body(st.sec, s)}</div></div></div></div>`;
    },
    tab(dir, s) { const i = SECTIONS.indexOf(s.state.sec); s.state.sec = SECTIONS[(i + dir + SECTIONS.length) % SECTIONS.length]; UI.render(s); UI.restoreFocus({ key: 'sec-' + s.state.sec, idx: 0 }); },
    act(a, el, s) {
      const k = el.dataset.key, set = UI.settings();
      if (a === 'back') { UI.back(); return; }
      if (a === 'sec') { s.state.sec = el.dataset.id; UI.sfx('click'); UI.render(s); UI.restoreFocus({ key: 'sec-' + s.state.sec, idx: 0 }); return; }
      if (a === 'set') {
        let v = el.dataset.v; if ((k === 'ctrl' || k === 'aim') && v === 'auto') v = null;
        UI.setSetting(k, v); UI.sfx('click');
        if (k === 'lang') return; // NC.onLang re-renders everything
        UI.rerender(); return;
      }
      if (a === 'tog') { UI.setSetting(k, !(k === 'vibe' || k === 'shake' || k === 'dmgNum' ? set[k] !== false : !!set[k])); UI.sfx('click'); if (k === 'vibe' && UI.settings().vibe) UI.buzz(30); UI.rerender(); return; }
      if (a === 'sld') {
        const [mn, mx] = RANGES[k]; const def = { music: 0.55, sfx: 0.8, joySize: 1, btnAlpha: 0.85 }[k];
        const cur = set[k] == null ? def : set[k];
        const v = Math.round(Math.max(mn, Math.min(mx, cur + 0.1 * (+el.dataset.d))) * 100) / 100;
        UI.setSetting(k, v); UI.sfx(k === 'sfx' ? 'pickup_star' : 'click'); UI.rerender(); return;
      }
      if (a === 'tut') { const S = UI.S(); S.tut = false; NC.sys.save(); UI.toast(t('toast.saved')); return; }
      if (a === 'export') { UI.saveCodeModal(); return; }
      if (a === 'import') { UI.importModal(); return; }
      if (a === 'reset') {
        UI.confirm(t('settings.resetConfirm'), () => UI.confirm(t('settings.resetConfirm2'), () => {
          const lang = UI.settings().lang; NC.sys.resetSave(); UI.settings().lang = lang; NC.sys.save(); UI.applySettings(); UI.toast(t('toast.saved')); UI.rerender();
        }, { danger: true }), { danger: true });
      }
    },
    back(s) { UI.sfx('click'); UI.close(); void s; },
  };

  // ------------------------------------------------------------------ save code helpers
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
    try { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
  }
  UI.saveCodeModal = () => {
    const code = NC.sys.exportSave();
    const m = UI.modal(`<div class="pnl pop-in" style="width:${UI.u * 260}px;max-width:100%"><div class="pnl-h"><span class="t">${t('account.code')}</span></div>
      <div class="msg">${t('account.codeHint')}</div><textarea class="code" readonly>${esc(code)}</textarea>
      <div class="acts"><button class="btn" data-f data-a="close">${t('common.close')}</button><button class="btn" data-f data-a="dl">${t('account.download')}</button><button class="btn pri" data-f data-first data-a="copy">${t('account.copy')}</button></div></div>`,
    { on: async a => {
      if (a === 'close') UI.closeModal(m);
      if (a === 'copy') { const ok = await copy(code); UI.toast(ok ? t('account.copied') : t('toast.error'), ok ? '' : 'bad'); if (!ok) { const ta = m.querySelector('textarea'); ta.focus(); ta.select(); } }
      if (a === 'dl') { const b = new Blob([code], { type: 'text/plain' }); const l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = 'neon-comet-save.txt'; document.body.appendChild(l); l.click(); setTimeout(() => { URL.revokeObjectURL(l.href); l.remove(); }, 500); }
    } });
  };
  UI.importModal = () => {
    const m = UI.modal(`<div class="pnl pop-in" style="width:${UI.u * 260}px;max-width:100%"><div class="pnl-h"><span class="t">${t('settings.import')}</span></div>
      <textarea class="code" placeholder="${esc(t('account.paste'))}"></textarea>
      <div class="acts"><button class="btn" data-f data-a="close">${t('common.cancel')}</button><button class="btn pri" data-f data-first data-a="load">${t('account.load')}</button></div></div>`,
    { on: a => {
      if (a === 'close') UI.closeModal(m);
      if (a === 'load') {
        const code = m.querySelector('textarea').value.trim();
        const r = NC.sys.importSave(code);
        if (r && r.ok) { UI.closeModal(m); UI.applySettings(); UI.toast(t('account.importOk'), 'warm'); UI.rerender(); } else { UI.toast(t('account.importBad'), 'bad'); UI.sfx('error'); }
      }
    } });
  };

  // ------------------------------------------------------------------ account / records
  UI.screens.account = {
    cls: 'dim',
    render(el) {
      const S = UI.S(), st = S.stats || {}, lv = NC.DATA.levelFromXp(S.xp);
      const rec = [['rec.lvl', lv.lvl], ['rec.best', UI.num(S.best)], ['rec.runs', UI.num(st.runs)], ['rec.kills', UI.num(st.kills)], ['rec.bosses', UI.num(st.bosses)],
        ['rec.maxSector', (st.maxSector || 0) + 1], ['rec.maxCombo', 'x' + (st.maxCombo || 0)], ['rec.time', UI.time(st.playtime)], ['rec.crystals', UI.fmt(st.crEarned)], ['rec.chests', UI.num(st.chestsOpened)]];
      el.innerHTML = `<div class="scr-h"><button class="btn sq" data-f data-a="back">&lt;</button><h2>${t('account.title')}</h2><span class="sp"></span><span class="chip cr">${UI.icoCr()}<b>${UI.fmt(S.crystals)}</b></span></div>
        <div class="scr-b">
          <div class="pnl" style="flex:1 1 0;min-width:0;display:flex;flex-direction:column"><div class="pnl-h"><span class="t">${t('account.records')}</span></div>
            <div class="scroll" style="flex:1;min-height:0"><div class="kv">${rec.map(([k, v]) => `<span class="k">${t(k)}</span><span class="v">${esc(v)}</span>`).join('')}</div>
            ${(S.top || []).length ? `<div class="sep"></div><div class="list">${S.top.slice(0, 5).map((r, i) => `<div class="li"><span class="dim">#${i + 1}</span>${UI.img('ship_' + r.ship, 'ico16')}<span class="grow b">${UI.num(r.score)}</span><span class="body dim">${t('hud.sector', { n: (r.sector || 0) + 1 })}</span></div>`).join('')}</div>` : ''}</div></div>
          <div class="pnl" style="flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:${UI.u * 4}px"><div class="pnl-h"><span class="t">${t('account.code')}</span></div>
            <div class="body dim">${t('account.codeHint')}</div>
            <button class="btn pri" data-f data-first data-a="export">${t('settings.export')}</button>
            <button class="btn" data-f data-a="import">${t('settings.import')}</button>
            <span class="sp"></span><div class="body dim2">Neon Comet ${esc(NC.VERSION || '3.0')}</div></div>
        </div>`;
    },
    act(a) { if (a === 'back') UI.back(); if (a === 'export') UI.saveCodeModal(); if (a === 'import') UI.importModal(); },
  };
})(window.NC = window.NC || {});
