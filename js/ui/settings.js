'use strict';
// Neon Comet 3.1 - Settings + Account (menus agent). Also defines UI.MN = shared helpers for the menus agent's screens
// (settings.js loads before menus.js). Settings live in NC.save.settings (save.js defaults): lang, ctrl(null=auto|'pc'|'touch'|
// 'gamepad'), aim(null=auto|'manual'), hand, music, sfx, vibe, shake, dmgNum, quality, fps (FPS counter), fpsCap (60|120, SPEC §2.8),
// joySize, btnAlpha, colorblind. Changes apply instantly (UI.setSetting -> UI.applySettings) and persist via NC.sys.save().
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  UI.screens = UI.screens || {};
  const t = (k, v) => NC.t(k, v);
  const esc = s => UI.esc(s);

  // ================================================================== shared helpers (UI.MN)
  const MN = UI.MN = UI.MN || {};
  // 16x16 line glyphs (stroke = currentColor) used for menu buttons, nav and achievement/mission badges
  const G = {
    back: '<path d="M10 3 5 8l5 5"/>',
    play: '<path d="M5 2.8v10.4L13.2 8z" fill="currentColor" stroke="none"/>',
    ship: '<path d="M8 1.6 12.6 12 8 9.6 3.4 12z"/><path d="M6.4 14.3h3.2"/>',
    list: '<path d="M2.4 4.2 3.9 5.7 6.4 3.2M8.6 4.5h5M2.4 9.2l1.5 1.5 2.5-2.5M8.6 9.5h5M3 13.6h2.2M8.6 13.6h5"/>',
    trophy: '<path d="M4.6 2.4h6.8v3.2a3.4 3.4 0 0 1-6.8 0z"/><path d="M4.6 3.8H2.4v1.1a2.2 2.2 0 0 0 2.4 2.2M11.4 3.8h2.2v1.1a2.2 2.2 0 0 1-2.4 2.2M8 9v3M5 13.6h6"/>',
    gear: '<circle cx="8" cy="8" r="4.2"/><circle cx="8" cy="8" r="1.5"/><path d="M8 1.4v2.4M8 12.2v2.4M1.4 8h2.4M12.2 8h2.4M3.3 3.3 5 5M11 11l1.7 1.7M3.3 12.7 5 11M11 5l1.7-1.7"/>',
    user: '<circle cx="8" cy="5.4" r="2.8"/><path d="M2.4 14.2c.6-3 2.8-4.6 5.6-4.6s5 1.6 5.6 4.6"/>',
    help: '<circle cx="8" cy="8" r="6.3"/><path d="M6 6.1a2.1 2.1 0 1 1 2.9 1.9c-.6.3-.9.7-.9 1.4v.4M8 11.5v1"/>',
    power: '<path d="M8 1.6v6.2"/><path d="M4.5 3.9a5.3 5.3 0 1 0 7 0"/>',
    check: '<path d="M3 8.4l3.1 3.1L13 4.6"/>',
    lock: '<path d="M3.5 7h9v7h-9z"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>',
    audio: '<path d="M2.4 6h2.8l3.6-3v10l-3.6-3H2.4z"/><path d="M11 5.6a3.4 3.4 0 0 1 0 4.8M12.8 3.6a6.2 6.2 0 0 1 0 8.8"/>',
    pad: '<path d="M4.6 4.6h6.8a3.3 3.3 0 0 1 3.2 3.9l-.6 3.4a1.6 1.6 0 0 1-2.8.7L9.6 10.6H6.4l-1.6 2a1.6 1.6 0 0 1-2.8-.7L1.4 8.5a3.3 3.3 0 0 1 3.2-3.9z"/><path d="M5 6.6v2.4M3.8 7.8h2.4M10.6 7.4h.1M12 8.6h.1"/>',
    display: '<path d="M1.8 2.8h12.4v8.4H1.8z"/><path d="M5.4 14h5.2M8 11.2V14"/>',
    globe: '<circle cx="8" cy="8" r="6.2"/><path d="M1.8 8h12.4M8 1.8c-2.2 2.4-2.2 10 0 12.4M8 1.8c2.2 2.4 2.2 10 0 12.4"/>',
    // badges
    crosshair: '<circle cx="8" cy="8" r="4.4"/><path d="M8 1.4v3.4M8 11.2v3.4M1.4 8h3.4M11.2 8h3.4"/>',
    skull: '<path d="M3 7.6a5 5 0 0 1 10 0v2.6l-1.4.9v2.5H4.4v-2.5L3 10.2z"/><path d="M6.1 8.4h.1M9.8 8.4h.1" stroke-width="2.4"/><path d="M7 13.6v-1.4M9 13.6v-1.4"/>',
    star: '<path d="M8 1.8l1.9 4 4.3.5-3.2 3 .9 4.3L8 11.4l-3.9 2.2.9-4.3-3.2-3 4.3-.5z"/>',
    planet: '<circle cx="8" cy="8" r="3.7"/><ellipse cx="8" cy="8" rx="7" ry="2.3" transform="rotate(-22 8 8)"/>',
    bolt: '<path d="M9.4 1.4 3.6 9h4.1l-1 5.6 5.8-7.6H8.4z"/>',
    clock: '<circle cx="8" cy="8" r="6.2"/><path d="M8 4.2V8l2.6 1.8"/>',
    gem: '<path d="M8 1.8 13.6 7 8 14.2 2.4 7z"/><path d="M2.4 7h11.2M8 1.8 6 7l2 7.2L10 7z"/>',
    rank: '<path d="M3.6 9 8 5l4.4 4M3.6 13 8 9l4.4 4M5 2.4h6"/>',
    fleet: '<path d="M2 10.6 4.6 4.8l2.6 5.8M5.4 13.6 8 7.4l2.6 6.2M8.8 10.6l2.6-5.8 2.6 5.8"/>',
    chest: '<path d="M2 6.2h12v7.4H2z"/><path d="M2.6 6.2 4 2.6h8l1.4 3.6M2 9.2h12M7 8.2h2v2.4H7z"/>',
    merge: '<path d="M3 2.4l5 5 5-5M8 2.4v11M5.6 11 8 13.4l2.4-2.4"/>',
    evo: '<path d="M8 14V5.2M4.4 8.6 8 5l3.6 3.6M3 2.4h10"/>',
    spark: '<path d="M8 1.4c.6 3.6 2.9 5.9 6.6 6.6-3.7.6-6 2.9-6.6 6.6-.6-3.7-2.9-6-6.6-6.6C5.1 7.3 7.4 5 8 1.4z"/>',
    card: '<path d="M4 1.8h8v12.4H4z"/><path d="M6 5h4M6 7.6h4M6 10.2h2"/>',
    flask: '<path d="M5.8 1.8h4.4M6.6 1.8v4L3 13.8h10L9.4 5.8v-4M4.8 10.2h6.4"/>',
    dash: '<path d="M3 3.4 7.6 8 3 12.6M8.4 3.4 13 8l-4.6 4.6"/>',
    up: '<path d="M8 13.6V3M3.6 7.4 8 3l4.4 4.4M3 14h10"/>',
    alert: '<path d="M8 1.8 14.6 13.6H1.4z"/><path d="M8 6.2v3.6M8 11.4v1"/>',
    shield: '<path d="M8 1.6 13.4 3.8v4c0 3.2-2.3 5.4-5.4 6.4C4.9 13.2 2.6 11 2.6 7.8v-4z"/><path d="M8 5v5.4"/>',
  };
  MN.ico = (name, cls = '') => `<svg class="mn-g ${cls}" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter">${G[name] || G.star}</svg>`;
  // version: highest of engine / data / '3.1.0' (menu shows "v3.1", settings the full number)
  MN.ver = (full) => {
    const cand = [NC.game && NC.game.version, NC.VERSION, '3.1.0'].filter(Boolean).map(String);
    const num = v => v.split('.').map(x => parseInt(x, 10) || 0);
    const cmp = (a, b) => { const x = num(a), y = num(b); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };
    const v = cand.sort(cmp).pop();
    return 'v' + (full ? v : v.split('.').slice(0, 2).join('.'));
  };
  MN.has = id => { try { return !!(NC.assets && NC.assets.has && NC.assets.has(id)); } catch (e) { return false; } };
  MN.img = (id, cls) => UI.img(id, 'mn-sp ' + cls);
  MN.cr = (n, cls = '') => `<span class="mn-cr ${cls}">${MN.img('ui_crystal', 'mn-i10')}<b>${UI.fmt(n)}</b></span>`;
  MN.pill = (label, val, cls = '') => `<span class="mn-pill mn-cut ${cls}">${label ? `<i>${esc(label)}</i>` : ''}${val}</span>`;
  MN.crPill = () => `<span class="mn-pill mn-cut">${MN.img('ui_crystal', 'mn-i10')}<b>${UI.fmt(UI.crystals())}</b></span>`;
  MN.top = (title, right = '') => `<div class="mn-top">
      <button class="btn back sm cut mn-backb" data-f data-a="back" data-k="back">${MN.ico('back')}<span>${t('common.back')}</span></button>
      <h2 class="mn-title">${esc(title)}</h2><div class="mn-pills">${right}</div></div>`;
  MN.grp = (label, extra = '') => `<div class="mn-grp"><span>${esc(label)}</span>${extra ? `<i>${extra}</i>` : ''}</div>`;
  // progress bar with numbers
  MN.prog = (a, b, txt) => { const p = b > 0 ? Math.max(0, Math.min(1, a / b)) : 1; return `<div class="mn-prog"><div class="mn-bar ${p >= 1 ? 'full' : ''}"><i style="width:${(p * 100).toFixed(1)}%"></i></div><span class="mn-num">${esc(txt != null ? txt : UI.num(a) + ' / ' + UI.num(b))}</span></div>`; };
  // reward block: crystals icon + amount, optional chest icon (rarity coloured)
  MN.reward = (rew) => {
    if (!rew) return '';
    const out = [];
    if (rew.cr) out.push(`<span class="mn-rv">${MN.img('ui_crystal', 'mn-i10')}<b>${UI.fmt(rew.cr)}</b></span>`);
    if (rew.chest != null) out.push(`<span class="mn-rv mn-rch r${rew.chest | 0}">${MN.img('chest_' + rew.chest, 'mn-i24')}<b>${esc(UI.rname(rew.chest))}</b></span>`);
    return `<div class="mn-rew"><span class="mn-rl">${t('menu.reward')}</span>${out.join('')}</div>`;
  };

  // ================================================================== settings
  const SECS = [['audio', 'audio'], ['control', 'pad'], ['display', 'display'], ['lang', 'globe'], ['data', 'user']];
  const IDS = SECS.map(x => x[0]);
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const RANGES = { music: [0, 1, 0.55], sfx: [0, 1, 0.8], joySize: [0.6, 1.4, 1], btnAlpha: [0.3, 1, 0.85] };
  const DEF_ON = { vibe: 1, shake: 1, dmgNum: 1 }; // default-true toggles (stored false when off)

  const seg = (k, opts, val) => `<div class="mn-seg">${opts.map(([v, l, dis]) => `<button class="mn-sg ${String(val) === String(v) ? 'on' : ''} ${dis ? 'dis' : ''}" ${dis ? 'disabled aria-disabled="true"' : 'data-f'} data-a="set" data-key="${k}" data-v="${v}" data-k="s-${k}-${v}">${dis ? MN.ico('lock', 'mn-gl') : ''}<span>${esc(l)}</span></button>`).join('')}</div>`;
  const tog = (k, on) => `<button class="mn-tog ${on ? 'on' : ''}" data-f data-a="tog" data-key="${k}" data-k="t-${k}" aria-pressed="${!!on}"><i class="sw"><b></b></i><span>${t(on ? 'common.on' : 'common.off')}</span></button>`;
  const sld = (k, v) => {
    const [mn, mx] = RANGES[k]; const p = Math.max(0, Math.min(1, (v - mn) / (mx - mn)));
    return `<div class="mn-sld"><button class="mn-sb" data-f data-a="sld" data-key="${k}" data-d="-1" data-k="sl-${k}" aria-label="-">${'<svg viewBox="0 0 16 16" class="mn-g"><path d="M3.5 8h9" stroke="currentColor" stroke-width="1.8"/></svg>'}</button>
      <div class="mn-sbar" data-a="sbar" data-key="${k}"><i style="width:${(p * 100).toFixed(0)}%"></i><b style="left:${(p * 100).toFixed(0)}%"></b></div>
      <button class="mn-sb" data-f data-a="sld" data-key="${k}" data-d="1" data-k="sr-${k}" aria-label="+">${'<svg viewBox="0 0 16 16" class="mn-g"><path d="M3.5 8h9M8 3.5v9" stroke="currentColor" stroke-width="1.8"/></svg>'}</button>
      <span class="mn-sv">${Math.round(v * 100)}%</span></div>`;
  };
  const row = (label, ctl, hint, cls = '') => `<div class="mn-srow ${cls}"><div class="mn-slb"><b>${esc(label)}</b>${hint ? `<small>${hint}</small>` : ''}</div><div class="mn-sctl">${ctl}</div></div>`;
  const btn = (a, label, cls = 'mut', ico = '') => `<button class="btn sm cut ${cls}" data-f data-a="${a}" data-k="b-${a}">${ico ? MN.ico(ico) : ''}<span>${esc(label)}</span></button>`;

  // 120 Hz support (SPEC §2.8): NC.display = {maxHz, detect(): Promise<number>} from the input agent
  function hzInfo(st) {
    const D = NC.display;
    if (!D) return { ok: false, st: 'no', hz: 0 };
    const hz = Math.round(+D.maxHz || 0);
    if (hz >= 110) return { ok: true, st: 'ok', hz };
    if (st.hz === 'pending') return { ok: false, st: 'checking', hz };
    return { ok: false, st: 'no', hz };
  }
  function startDetect(st) {
    const D = NC.display;
    if (st.hz || !D || typeof D.detect !== 'function' || +D.maxHz >= 110) return;
    st.hz = 'pending';
    let done = false;
    const fin = () => {
      if (done) return; done = true; st.hz = 'done';
      const top = UI.top(); if (top && top.name === 'settings' && top.state === st) UI.rerender();
    };
    try { Promise.resolve(D.detect()).then(fin, fin); } catch (e) { fin(); }
    setTimeout(fin, 4000);
  }

  function body(sec, s, st) {
    if (sec === 'audio') return [
      MN.grp(t('set.grp.volume')),
      row(t('settings.music'), sld('music', s.music == null ? 0.55 : s.music)),
      row(t('settings.sfx'), sld('sfx', s.sfx == null ? 0.8 : s.sfx)),
      MN.grp(t('set.grp.haptics')),
      row(t('settings.vibration'), tog('vibe', s.vibe !== false), isIOS() ? esc(t('settings.iosVibe')) : ''),
    ].join('');
    if (sec === 'control') return [
      MN.grp(t('set.grp.device')),
      row(t('settings.ctrl'), seg('ctrl', [['auto', t('settings.ctrl.auto')], ['pc', t('settings.ctrl.pc')], ['touch', t('settings.ctrl.touch')], ['gamepad', t('settings.ctrl.gamepad')]], s.ctrl || 'auto'), esc(t('set.ctrl.hint'))),
      row(t('settings.aim'), seg('aim', [['auto', t('settings.aim.auto')], ['manual', t('settings.aim.manual')]], s.aim || 'auto')),
      MN.grp(t('set.grp.touch')),
      row(t('settings.hand'), seg('hand', [['right', t('settings.hand.right')], ['left', t('settings.hand.left')]], s.hand || 'right'), esc(t('set.hand.hint'))),
      row(t('settings.joySize'), sld('joySize', s.joySize || 1)),
      row(t('settings.btnOpacity'), sld('btnAlpha', s.btnAlpha == null ? 0.85 : s.btnAlpha)),
      MN.grp(t('set.grp.tutorial')),
      row(t('settings.tutorial'), btn('tut', t('settings.tutorialReplay'), 'mut', 'help'), esc(t('set.tutorial.hint'))),
    ].join('');
    if (sec === 'display') {
      startDetect(st);
      const hz = hzInfo(st), cap = (+s.fpsCap === 120) ? 120 : 60;
      const note = hz.st === 'ok' ? `<span class="mn-ok">${esc(t('set.fpsHz', { n: hz.hz }))}</span> · ${esc(t('set.fpsCap.hint'))}`
        : hz.st === 'checking' ? `<span class="mn-wait">${esc(t('set.fpsCheck'))}</span>`
          : `<span class="mn-warn">${esc(t('set.fps120no'))}</span>`;
      return [
        MN.grp(t('set.grp.perf')),
        row(t('settings.quality'), seg('quality', [['low', t('settings.quality.low')], ['med', t('settings.quality.med')], ['high', t('settings.quality.high')]], s.quality || 'high'), esc(t('set.quality.hint'))),
        row(t('set.fpsCap'), seg('fpsCap', [['60', '60 FPS'], ['120', '120 FPS', false]], cap), note, 'mn-fpsrow'),
        row(t('set.fpsCounter'), tog('fps', !!s.fps), esc(t('set.fpsCounter.hint'))),
        MN.grp(t('set.grp.fx')),
        row(t('settings.shake'), tog('shake', s.shake !== false), esc(t('set.shake.hint'))),
        row(t('settings.dmgNumbers'), tog('dmgNum', s.dmgNum !== false), esc(t('set.dmg.hint'))),
        MN.grp(t('set.grp.access')),
        row(t('settings.colorblind'), tog('colorblind', !!s.colorblind), esc(t('settings.colorblind.hint'))),
      ].join('');
    }
    if (sec === 'lang') {
      const cur = s.lang || NC.lang;
      const card = (v, name, sub) => `<button class="mn-lang mn-cut ${cur === v ? 'on' : ''}" data-f data-a="set" data-key="lang" data-v="${v}" data-k="s-lang-${v}">
          <span class="mn-lcode">${sub}</span><b>${name}</b>${cur === v ? `<i class="mn-lchk">${MN.ico('check')}</i>` : ''}</button>`;
      return [
        MN.grp(t('set.grp.lang')),
        `<div class="mn-langs">${card('ro', 'Romana', 'RO')}${card('en', 'English', 'EN')}</div>`,
        `<p class="mn-note">${esc(t('set.langHint'))}</p>`,
      ].join('');
    }
    if (sec === 'data') return [
      MN.grp(t('set.grp.save')),
      row(t('set.records'), btn('account', t('set.open'), 'mut', 'user'), esc(t('set.records.hint'))),
      row(t('settings.export'), btn('export', t('account.copy'), 'sec'), esc(t('account.codeHint'))),
      row(t('settings.import'), btn('import', t('account.load'), 'mut'), esc(t('set.import.hint'))),
      MN.grp(t('set.grp.about')),
      row(t('set.version'), `<span class="mn-val">Neon Comet ${esc(MN.ver(true))}</span>`),
      row(t('settings.credits'), '', esc(t('set.credits')), 'mn-wide'),
      MN.grp(t('set.grp.danger')),
      row(t('settings.reset'), btn('reset', t('settings.reset'), 'back'), esc(t('set.reset.hint'))),
    ].join('');
    return '';
  }

  UI.screens.settings = {
    cls: 'mn mn-scr',
    render(el, st) {
      if (!IDS.includes(st.sec)) st.sec = 'audio';
      const s = UI.settings();
      el.innerHTML = `${MN.top(t('settings.title'), `<span class="mn-pill mn-cut mn-padhint">L1 / R1</span>${MN.pill('', `<b>${esc(MN.ver())}</b>`)}`)}
        <div class="mn-set">
          <nav class="mn-snav mn-cut">${SECS.map(([id, ic]) => `<button class="mn-nav ${st.sec === id ? 'on' : ''}" data-f data-a="sec" data-id="${id}" data-k="sec-${id}">${MN.ico(ic)}<span>${esc(t('set.sec.' + id))}</span></button>`).join('')}
            <div class="mn-sver"><b>NEON COMET</b><span>${esc(MN.ver(true))}</span></div></nav>
          <div class="mn-sbody mn-cut"><div class="scroll mn-sscroll"><div class="mn-slist">${body(st.sec, s, st)}</div></div></div>
        </div>`;
    },
    tab(dir, s) { const i = IDS.indexOf(s.state.sec); s.state.sec = IDS[(i + dir + IDS.length) % IDS.length]; UI.render(s); UI.restoreFocus({ key: 'sec-' + s.state.sec, idx: 0 }); },
    act(a, el, s, e) {
      const k = el.dataset.key, set = UI.settings();
      if (a === 'back') { UI.sfx('click'); UI.back(); return; }
      if (a === 'sec') {
        if (s.state.sec === el.dataset.id) return;
        s.state.sec = el.dataset.id; UI.sfx('click'); UI.render(s); UI.restoreFocus({ key: 'sec-' + s.state.sec, idx: 0 });
        const sc = s.el.querySelector('.mn-sscroll'); if (sc) sc.scrollTop = 0;
        return;
      }
      if (a === 'set') {
        let v = el.dataset.v;
        if (k === 'lang') {
          UI.sfx('click');
          UI.setSetting('lang', v);                                  // -> applySettings -> NC.setLang -> NC.onLang listeners re-render
          if (NC.lang !== v && NC.setLang) NC.setLang(v);           // safety if the listener path changes
          UI.i18nStatic && UI.i18nStatic(); UI.rerender(false);      // every open screen re-renders in the new language
          try { UI.hud && UI.hud.relabel && UI.hud.relabel(); } catch (err) {}
          UI.restoreFocus({ key: 's-lang-' + v, idx: 0 });
          return;
        }
        if (k === 'fpsCap') { v = +v === 120 ? 120 : 60;  }
        if ((k === 'ctrl' || k === 'aim') && v === 'auto') v = null;
        UI.setSetting(k, v); UI.sfx('click'); UI.rerender(); return;
      }
      if (a === 'tog') {
        const cur = DEF_ON[k] ? set[k] !== false : !!set[k];
        UI.setSetting(k, !cur); UI.sfx('click'); if (k === 'vibe' && !cur) UI.buzz(30); UI.rerender(); return;
      }
      if (a === 'sld' || a === 'sbar') {
        const [mn, mx, def] = RANGES[k]; const cur = set[k] == null ? def : +set[k];
        let v;
        if (a === 'sld') v = cur + 0.1 * (+el.dataset.d);
        else { if (!e) return; const r = el.getBoundingClientRect(); v = mn + Math.max(0, Math.min(1, (e.clientX - r.left) / Math.max(1, r.width))) * (mx - mn); v = Math.round(v * 10) / 10; }
        v = Math.round(Math.max(mn, Math.min(mx, v)) * 100) / 100;
        UI.setSetting(k, v); UI.sfx(k === 'sfx' ? 'pickup_star' : 'click'); UI.rerender(); return;
      }
      if (a === 'tut') { const S = UI.S(); S.tut = false; try { NC.sys.save(); } catch (err) {} UI.sfx('click'); UI.toast(t('toast.saved')); return; }
      if (a === 'account') { UI.sfx('click'); UI.show('account'); return; }
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

  // ================================================================== save code modals
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
    try { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
  }
  const modalBox = (title, inner, acts) => `<div class="pnl cut pop-in mn mn-mod"><div class="mn-mh">${MN.ico('user')}<span>${esc(title)}</span></div>${inner}<div class="mn-macts">${acts}</div></div>`;
  UI.saveCodeModal = () => {
    const code = NC.sys.exportSave();
    const m = UI.modal(modalBox(t('account.code'), `<p class="mn-mmsg">${esc(t('account.codeHint'))}</p><textarea class="code mn-code" readonly>${esc(code)}</textarea>`,
      `<button class="btn mut sm cut" data-f data-a="close">${t('common.close')}</button><button class="btn sec sm cut" data-f data-a="dl">${t('account.download')}</button><button class="btn pri sm cut" data-f data-first data-a="copy">${t('account.copy')}</button>`),
    { on: async a => {
      if (a === 'close') UI.closeModal(m);
      if (a === 'copy') { const ok = await copy(code); UI.toast(ok ? t('account.copied') : t('toast.error'), ok ? '' : 'bad'); if (!ok) { const ta = m.querySelector('textarea'); ta.focus(); ta.select(); } }
      if (a === 'dl') { const b = new Blob([code], { type: 'text/plain' }); const l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = 'neon-comet-save.txt'; document.body.appendChild(l); l.click(); setTimeout(() => { URL.revokeObjectURL(l.href); l.remove(); }, 500); }
    } });
  };
  UI.importModal = () => {
    const m = UI.modal(modalBox(t('settings.import'), `<p class="mn-mmsg">${esc(t('set.import.hint'))}</p><textarea class="code mn-code" placeholder="${esc(t('account.paste'))}"></textarea>`,
      `<button class="btn mut sm cut" data-f data-a="close">${t('common.cancel')}</button><button class="btn pri sm cut" data-f data-first data-a="load">${t('account.load')}</button>`),
    { on: a => {
      if (a === 'close') UI.closeModal(m);
      if (a === 'load') {
        const code = m.querySelector('textarea').value.trim();
        const r = NC.sys.importSave(code);
        if (r && r.ok) { UI.closeModal(m); UI.applySettings(); UI.toast(t('account.importOk'), 'warm'); UI.rerender(); } else { UI.toast(t('account.importBad'), 'bad'); UI.sfx('error'); }
      }
    } });
  };

  // ================================================================== account / records
  UI.screens.account = {
    cls: 'mn mn-scr',
    render(el) {
      const S = UI.S(), st = S.stats || {}, lv = NC.DATA.levelFromXp(S.xp);
      const rec = [['rec.lvl', lv.lvl, 'amb'], ['rec.best', UI.num(S.best), 'amb'], ['rec.runs', UI.num(st.runs), 'cy'], ['rec.kills', UI.num(st.kills), 'rd'],
        ['rec.bosses', UI.num(st.bosses), 'rd'], ['rec.maxSector', (st.maxSector || 0) + 1, 'cy'], ['rec.maxCombo', 'x' + (st.maxCombo || 0), 'pu'], ['rec.time', UI.time(st.playtime), 'cy'],
        ['rec.crystals', UI.fmt(st.crEarned), 'cy'], ['rec.chests', UI.num(st.chestsOpened), 'pu']];
      const top = (S.top || []).slice(0, 5);
      el.innerHTML = `${MN.top(t('account.title'), MN.crPill())}
        <div class="mn-acc">
          <div class="mn-apnl mn-cut"><div class="scroll mn-ascroll">
            ${MN.grp(t('account.records'))}
            <div class="mn-stats">${rec.map(([k, v, c]) => `<div class="mn-st mn-cut ${c}"><small>${esc(t(k))}</small><b>${esc(v)}</b></div>`).join('')}</div>
            ${MN.grp(t('menu.acc.top'))}
            ${top.length ? `<div class="mn-runs">${top.map((r, i) => `<div class="mn-run"><span class="mn-rk">#${i + 1}</span>${MN.img('ship_' + r.ship, 'mn-i16')}<b>${UI.num(r.score)}</b><span class="mn-rs">${esc(t('hud.sector', { n: (r.sector || 0) + 1 }))}</span></div>`).join('')}</div>`
              : `<p class="mn-note">${esc(t('menu.acc.noRuns'))}</p>`}
          </div></div>
          <div class="mn-apnl mn-asave mn-cut">
            ${MN.grp(t('account.code'))}
            <p class="mn-note">${esc(t('account.codeHint'))}</p>
            <button class="btn pri cut" data-f data-first data-a="export">${t('settings.export')}</button>
            <button class="btn mut cut" data-f data-a="import">${t('settings.import')}</button>
            <span class="mn-sp"></span><div class="mn-aver">Neon Comet ${esc(MN.ver(true))}</div>
          </div>
        </div>`;
    },
    act(a) { if (a === 'back') { UI.sfx('click'); UI.back(); } if (a === 'export') UI.saveCodeModal(); if (a === 'import') UI.importModal(); },
  };
})(window.NC = window.NC || {});
