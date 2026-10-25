'use strict';
// Neon Comet 3.0 - UI core + boot (UI agent).
// NC.ui: helpers (DOM, sprites, rarity frames, toasts, modals), screen stack, gamepad/keyboard menu navigation
// (via NC.Input.onNav), UI scale (--u), settings application, engine hooks routing, boot sequence.
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  const t = (k, v) => NC.t(k, v);
  const $ = id => document.getElementById(id);
  UI.$ = $; UI.t = t;

  // ------------------------------------------------------------------ small helpers
  UI.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  UI.fmt = n => (NC.fmt ? NC.fmt(n) : String(Math.floor(n || 0)));
  UI.num = n => Math.floor(n || 0).toLocaleString('en-US').replace(/,/g, ' ');
  UI.time = sec => {
    sec = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
    return h ? t('time.h', { h, m }) : m ? t('time.m', { m, s }) : t('time.s', { s });
  };
  UI.D = () => NC.DATA || {};
  UI.S = () => (NC.sys && NC.sys.state && NC.sys.state()) || NC.save || {};
  UI.settings = () => { const s = UI.S(); if (!s.settings) s.settings = {}; return s.settings; };
  UI.setSetting = (k, v) => { UI.settings()[k] = v; try { NC.sys && NC.sys.save && NC.sys.save(); } catch (e) {} UI.applySettings(); };
  UI.sfx = (n, p) => { try { NC.audio && NC.audio.sfx && NC.audio.sfx(n, p); } catch (e) {} };
  UI.buzz = ms => { try { if (UI.settings().vibe === false) return; if (NC.Input && NC.Input.buzz) NC.Input.buzz(ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
  UI.crystals = () => { try { return NC.sys.crystals(); } catch (e) { return 0; } };
  UI.rname = r => t('rarity.' + r);

  // ------------------------------------------------------------------ sprites
  // Every sprite is shown at 1 art px = 1u (CSS sizes it); bigger = integer multiples via classes.
  UI.spriteUrl = id => { try { return NC.assets && NC.assets.url ? NC.assets.url(id) : ''; } catch (e) { return ''; } };
  UI.img = (id, cls = 'ico24', alt = '') => `<img class="ico pix ${cls}" src="${UI.esc(UI.spriteUrl(id))}" alt="${UI.esc(alt)}" draggable="false">`;
  UI.icoCr = (cls = 'ico10') => UI.img('ui_crystal', cls);
  UI.cr = (n, cls = '') => `<span class="cr ${cls}">${UI.icoCr()}<b>${UI.fmt(n)}</b></span>`;

  // rarity frame per SPEC §3: pips (r+1), chamfer r>=1, double r>=2, diamonds r>=3, spikes r>=4
  UI.frame = (r, inner, opts = {}) => {
    r = Math.max(0, Math.min(4, r | 0));
    const pips = opts.noPips ? '' : `<span class="pips">${'<i></i>'.repeat(r + 1)}</span>`;
    const dm = r >= 3 ? '<i class="dm t"></i><i class="dm b"></i>' : '';
    const sp = r >= 4 ? '<i class="spk a"></i><i class="spk b"></i><i class="spk c"></i><i class="spk d"></i>' : '';
    const extra = (opts.locked ? UI.img('ui_lock', 'lk') : '') + (opts.equipped ? '<i class="eq"></i>' : '') + (opts.badge != null ? `<span class="badge">${UI.esc(opts.badge)}</span>` : '');
    return `<div class="rf r${r} ${opts.cls || ''} ${opts.locked ? 'locked' : ''}">${inner}${pips}${dm}${sp}${extra}</div>`;
  };
  UI.tile = (r, sprite, cap, attrs = '', opts = {}) =>
    `<div class="tile ${opts.cls || ''}" data-f ${attrs}>${opts.check ? '<i class="chk"></i>' : ''}${UI.frame(r, UI.img(sprite, opts.icoCls || 'ico24'), opts)}${cap != null ? `<span class="cap">${UI.esc(cap)}</span>` : ''}</div>`;

  // ------------------------------------------------------------------ toasts / banner
  UI.toast = (msg, kind = '', ms = 2500) => {
    const box = $('toasts'); if (!box || !msg) return;
    const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = msg; el.style.animationDuration = (ms - 100) + 'ms';
    box.appendChild(el); while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => el.remove(), ms);
  };
  UI.err = r => { if (r && !r.ok) { UI.toast(t(r.err || 'toast.error'), 'bad'); UI.sfx('error'); } return r && r.ok; };
  UI.banner = (titleKey, sub, kind) => {
    const b = $('banner'); if (!b) return;
    const title = NC.hasT && NC.hasT(titleKey) ? t(titleKey) : titleKey;
    const subTxt = sub && NC.hasT && NC.hasT(sub) ? t(sub) : (sub || '');
    b.className = kind || (/boss|warn/.test(titleKey) ? 'warn' : '');
    b.innerHTML = `<div class="bn"><div class="bt">${UI.esc(title)}</div>${subTxt ? `<div class="bs">${UI.esc(subTxt)}</div>` : ''}</div>`;
    void b.offsetWidth; b.classList.add('show');
    clearTimeout(UI._bt); UI._bt = setTimeout(() => { b.classList.remove('show'); b.innerHTML = ''; }, 2700);
  };

  // ------------------------------------------------------------------ modal stack
  UI.modals = [];
  UI.modal = (html, opts = {}) => {
    const el = document.createElement('div'); el.className = 'modal'; el.innerHTML = html;
    el._opts = opts; $('stage').appendChild(el); UI.modals.push(el);
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (a && el.contains(a) && opts.on) { opts.on(a.dataset.a, a, e); return; }
      if (e.target === el && opts.dismiss !== false) UI.closeModal(el);
    });
    UI.refocus(); return el;
  };
  UI.closeModal = (el, silent) => {
    el = el || UI.modals[UI.modals.length - 1]; if (!el) return;
    UI.modals = UI.modals.filter(m => m !== el); el.remove();
    if (!silent && el._opts && el._opts.onClose) el._opts.onClose();
    UI.refocus();
  };
  UI.confirm = (msg, onYes, opts = {}) => {
    const m = UI.modal(`<div class="pnl pop-in"><div class="ttl">${UI.esc(opts.title || t('common.confirm'))}</div><div class="msg">${UI.esc(msg)}</div>
      <div class="acts"><button class="btn" data-f data-a="no">${t('common.no')}</button><button class="btn ${opts.danger ? 'bad' : 'pri'}" data-f data-a="yes">${t('common.yes')}</button></div></div>`,
    { on: a => { UI.closeModal(m, true); if (a === 'yes') onYes(); } });
  };

  // ------------------------------------------------------------------ screens
  // UI.screens[name] = { render(el, state), back?(), tab?(dir), cls?, keep? }. Stack of open screens.
  UI.screens = UI.screens || {};
  UI.stack = [];
  UI.top = () => UI.stack[UI.stack.length - 1] || null;
  UI.show = (name, state = {}, replace) => {
    const def = UI.screens[name]; if (!def) return console.warn('screen?', name);
    if (replace) UI.stack.forEach(s => s.el.remove()), UI.stack = [];
    const ex = UI.stack.find(s => s.name === name); if (ex) { ex.el.remove(); UI.stack = UI.stack.filter(s => s !== ex); }
    const el = document.createElement('section'); el.className = 'scr fade-in ' + (def.cls || ''); el.id = 'scr' + name[0].toUpperCase() + name.slice(1);
    $('screens').appendChild(el);
    const s = { name, el, def, state }; UI.stack.push(s);
    UI.stack.forEach(x => { x.el.hidden = x !== s && !(x.def.under); });
    el.addEventListener('click', e => { const a = e.target.closest('[data-a]'); if (a && el.contains(a) && def.act) def.act(a.dataset.a, a, s, e); });
    UI.render(s); UI.refocus(true);
    return s;
  };
  UI.render = (s) => { s = s || UI.top(); if (!s) return; const sc = s.el.querySelector('.scroll'); const st = sc ? sc.scrollTop : 0; s.def.render(s.el, s.state, s); const sc2 = s.el.querySelector('.scroll'); if (sc2) sc2.scrollTop = st; };
  UI.rerender = (keepFocus = true) => { const sel = keepFocus && UI.focusKey(); UI.stack.forEach(s => UI.render(s)); if (sel) UI.restoreFocus(sel); };
  UI.close = (name) => {
    const s = name ? UI.stack.find(x => x.name === name) : UI.top(); if (!s) return;
    s.el.remove(); UI.stack = UI.stack.filter(x => x !== s);
    const top = UI.top(); if (top) { top.el.hidden = false; if (top.def.onReturn) top.def.onReturn(top); UI.render(top); }
    UI.refocus(true);
  };
  UI.closeAll = () => { UI.stack.forEach(s => s.el.remove()); UI.stack = []; while (UI.modals.length) UI.closeModal(null, true); };
  UI.back = () => {
    if (UI.modals.length) { const m = UI.modals[UI.modals.length - 1]; if (m._opts.back) m._opts.back(); else if (m._opts.dismiss !== false) UI.closeModal(m); return; }
    const s = UI.top(); if (!s) return;
    if (s.def.back) { s.def.back(s); return; }
    if (UI.stack.length > 1) { UI.sfx('click'); UI.close(); }
  };
  UI.menuOpen = () => UI.stack.length > 0 || UI.modals.length > 0;

  // ------------------------------------------------------------------ focus + navigation (gamepad / keyboard)
  const FOC = '[data-f]:not([disabled]):not(.off-f), button.btn:not([disabled]), .tab, .tile, .card, .slot';
  UI.root = () => UI.modals.length ? UI.modals[UI.modals.length - 1] : UI.top() ? UI.top().el : (document.querySelector('#tut:not([hidden])') || null);
  UI.focusables = () => {
    const r = UI.root(); if (!r) return [];
    return Array.from(r.querySelectorAll(FOC)).filter((el, i, a) => a.indexOf(el) === i && el.offsetParent !== null && !el.closest('[hidden]'));
  };
  let focused = null;
  UI.focused = () => focused;
  UI.setFocus = (el, scroll = true) => {
    if (focused) focused.classList.remove('pad-focus');
    focused = el || null;
    if (focused) { focused.classList.add('pad-focus'); if (scroll) try { focused.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {} }
  };
  UI.focusKey = () => { if (!focused || !document.body.contains(focused)) return null; const r = UI.root(); const all = UI.focusables(); return { idx: all.indexOf(focused), key: focused.dataset.k || focused.dataset.id || focused.dataset.a || null, root: r }; };
  UI.restoreFocus = (k) => {
    if (!UI.padMode()) return;
    const all = UI.focusables(); if (!all.length) return;
    let el = k.key ? all.find(e => (e.dataset.k || e.dataset.id || e.dataset.a) === k.key) : null;
    if (!el) el = all[Math.min(Math.max(0, k.idx), all.length - 1)];
    UI.setFocus(el, false);
  };
  UI.padMode = () => document.body.classList.contains('pad') || document.body.classList.contains('kbnav');
  UI.refocus = (reset) => {
    requestAnimationFrame(() => {
      if (!UI.padMode()) { if (focused && !document.body.contains(focused)) focused = null; return; }
      const all = UI.focusables();
      if (!reset && focused && all.includes(focused)) return;
      const pref = all.find(e => e.hasAttribute('data-first')) || all.find(e => e.classList.contains('pri')) || all[0];
      UI.setFocus(pref || null);
    });
  };
  function move(dir) {
    const all = UI.focusables(); if (!all.length) return;
    if (!focused || !all.includes(focused)) { UI.refocus(true); return; }
    const a = focused.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bs = Infinity;
    for (const el of all) {
      if (el === focused) continue;
      const b = el.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
      const dx = bx - ax, dy = by - ay;
      let main, side;
      if (dir === 'left') { if (bx > a.left - 1) continue; main = -dx; side = Math.abs(dy); }
      else if (dir === 'right') { if (bx < a.right + 1) continue; main = dx; side = Math.abs(dy); }
      else if (dir === 'up') { if (by > a.top - 1) continue; main = -dy; side = Math.abs(dx); }
      else { if (by < a.bottom + 1) continue; main = dy; side = Math.abs(dx); }
      if (main <= 0) continue;
      const score = main + side * 2.2;
      if (score < bs) { bs = score; best = el; }
    }
    if (best) { UI.setFocus(best); UI.sfx('click'); }
  }
  UI.onNav = (dir, src) => {
    if (src === 'pad') document.body.classList.add('pad');
    if (src === 'kb') document.body.classList.add('kbnav');
    const g = NC.game, mode = g && g.mode;
    if (dir === 'pause') {
      if (mode === 'play') { g.pause && g.pause(); return; }
      if (mode === 'paused' && UI.top() && UI.top().name === 'pause' && !UI.modals.length) { UI.resume(); return; }
      dir = 'back';
    }
    if (!UI.menuOpen()) { if (UI.tutOpen && UI.tutOpen() && (dir === 'ok' || dir === 'back')) UI.tutNext(); return; }
    if (['up', 'down', 'left', 'right'].includes(dir)) {
      if (!focused || !document.body.contains(focused)) { UI.refocus(true); return; }
      const s = UI.top(); if (!UI.modals.length && s && s.def.navHook && s.def.navHook(dir, focused, s)) return;
      move(dir); return;
    }
    if (dir === 'ok') {
      if (!focused || !document.body.contains(focused)) { UI.refocus(true); return; }
      focused.click(); return;
    }
    if (dir === 'back') { UI.back(); return; }
    if (dir === 'tabPrev' || dir === 'tabNext') { const s = UI.top(); if (!UI.modals.length && s && s.def.tab) { s.def.tab(dir === 'tabNext' ? 1 : -1, s); UI.sfx('click'); } }
  };
  // pointer use hides the focus ring
  addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') document.body.classList.add('touchish');
    document.body.classList.remove('pad', 'kbnav'); if (focused) { focused.classList.remove('pad-focus'); focused = null; }
  }, true);

  // ------------------------------------------------------------------ scale + layout
  UI.layout = () => {
    const w = innerWidth, h = innerHeight;
    const u = Math.max(2, Math.min(6, Math.floor(Math.min(h / 195, w / 400))));
    document.documentElement.style.setProperty('--u', u + 'px');
    UI.u = u;
    document.body.classList.toggle('short', h / u < 215);
    // pixel starfield tile for screen backgrounds (palette-pure, crisp)
    if (UI._starU !== u) { UI._starU = u; UI.makeStars(); }
  };
  UI.makeStars = () => {
    const S = 160, c = document.createElement('canvas'); c.width = S; c.height = S; const g = c.getContext('2d');
    g.fillStyle = '#0b0f1e'; g.fillRect(0, 0, S, S);
    let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cols = ['#1d2547', '#2a3560', '#46518a', '#8a93c0', '#cfd6f0'];
    for (let i = 0; i < 70; i++) { const x = (r() * S) | 0, y = (r() * S) | 0, k = Math.floor(Math.pow(r(), 2.2) * 5); g.fillStyle = cols[k]; g.fillRect(x, y, 1, 1); if (k === 4) { g.fillStyle = cols[2]; g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 1, y, 1, 1); g.fillRect(x, y - 1, 1, 1); g.fillRect(x, y + 1, 1, 1); } }
    const st = document.documentElement.style; st.setProperty('--stars', `url(${c.toDataURL()})`); st.setProperty('--starsz', `${S * UI.u}px ${S * UI.u}px`);
  };

  // ------------------------------------------------------------------ settings application
  UI.applySettings = () => {
    const s = UI.settings(), b = document.body;
    if (s.lang && s.lang !== NC.lang && NC.setLang) NC.setLang(s.lang);
    b.classList.toggle('lefty', s.hand === 'left');
    b.classList.toggle('nofps', !s.fps);
    b.classList.toggle('touch', UI.isTouch());
    const st = document.documentElement.style;
    st.setProperty('--joy', String(s.joySize || 1));
    st.setProperty('--btnop', String(s.btnAlpha == null ? 0.85 : s.btnAlpha));
    try { NC.audio && NC.audio.setVolumes && NC.audio.setVolumes(s.music == null ? 0.55 : s.music, s.sfx == null ? 0.8 : s.sfx); } catch (e) {}
  };
  UI.isTouch = () => {
    const c = UI.settings().ctrl;
    if (c === 'touch') return true;
    if (c === 'pc' || c === 'gamepad') return false;
    if (UI._devSeen) return !!(NC.Input && NC.Input.device === 'touch');
    return !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  };

  // ------------------------------------------------------------------ engine/input hooks (NC.ui.*)
  UI.onInputDevice = (d) => {
    UI._devSeen = true;
    if (d === 'touch') UI._everTouch = true;
    if (d === 'pad') document.body.classList.add('pad');
    const was = document.body.classList.contains('touch'); const now = UI.isTouch();
    if (was !== now) { document.body.classList.toggle('touch', now); UI.hud && UI.hud.relayout && UI.hud.relayout(); }
  };
  UI.onPad = (on) => { if (!on) UI.toast(t('input.padDisconnected')); else document.body.classList.add('pad'); if (on) UI.refocus(); };
  UI.resume = () => { UI.close('pause'); try { NC.game.resume(); } catch (e) {} };

  // ------------------------------------------------------------------ orientation overlay + lock
  UI.orient = () => {
    const portrait = innerHeight > innerWidth;
    const r = $('rotate'); if (!r) return;
    if (portrait && !UI._rotAnim) {
      const ph = r.querySelector('.ph'); let f = 0;
      UI._rotAnim = setInterval(() => {
        if (!(innerHeight > innerWidth)) { clearInterval(UI._rotAnim); UI._rotAnim = null; return; }
        const has = NC.assets && NC.assets.has && NC.assets.has('ui_rotate');
        if (has) { const c = NC.assets.icon('ui_rotate', 1, f++ % 4); ph.replaceChildren(c); c.className = 'pix'; c.style.width = c.style.height = '100%'; }
        else drawRotateFallback(ph, f++);
      }, 260);
      drawRotateFallback(ph, 0);
      if (NC.game && NC.game.mode === 'play' && NC.game.pause) NC.game.pause();
    }
  };
  function drawRotateFallback(holder, f) {
    // tiny procedural pixel phone (used until art provides ui_rotate)
    let c = holder.querySelector('canvas'); if (!c) { c = document.createElement('canvas'); c.width = 64; c.height = 64; c.className = 'pix'; c.style.width = c.style.height = '100%'; holder.replaceChildren(c); }
    const g = c.getContext('2d'); g.clearRect(0, 0, 64, 64);
    const step = f % 4, land = step >= 2;
    const w = land ? 40 : 22, h = land ? 22 : 40, x = 32 - w / 2, y = 32 - h / 2;
    g.fillStyle = '#06080f'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = '#5f6a92'; g.fillRect(x, y, w, h);
    g.fillStyle = '#9ba4c6'; g.fillRect(x, y, w, 1); g.fillRect(x, y, 1, h);
    g.fillStyle = '#121932'; g.fillRect(x + 3, y + 3, w - 6, h - 6);
    g.fillStyle = land ? '#4cbfd4' : '#2e3c6c'; g.fillRect(x + 4, y + 4, w - 8, h - 8);
    g.fillStyle = '#e7a94c';
    const arr = [[50, 10], [51, 11], [52, 12], [53, 13], [54, 14], [53, 15], [52, 16], [49, 10], [48, 10], [47, 11]];
    if (!land) arr.forEach(([ax, ay]) => g.fillRect(ax, ay, 2, 1));
  }
  UI.lockLandscape = () => { try { const st = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || document.fullscreenElement; if (st && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} };

  // ------------------------------------------------------------------ language picker (first launch)
  UI.pickLanguage = (done) => {
    const m = UI.modal(`<div class="pnl pop-in" style="min-width:${150}px"><div class="pnl-h"><span class="t">${NC.lang==='en'?'Choose language / Alege limba':'Alege limba / Choose language'}</span></div>
      <div class="col"><button class="btn lg pri" data-f data-first data-a="ro">Romana</button><button class="btn lg" data-f data-a="en">English</button></div></div>`,
    { dismiss: false, back: () => {}, on: a => { UI.setSetting('lang', a); UI.closeModal(m, true); done && done(); } });
  };

  UI.i18nStatic = () => document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });

  // ------------------------------------------------------------------ boot
  UI.boot = async () => {
    UI.layout(); UI.orient();
    addEventListener('resize', () => { UI.layout(); UI.orient(); UI.hud && UI.hud.relayout && UI.hud.relayout(); });
    addEventListener('orientationchange', () => setTimeout(() => { UI.layout(); UI.orient(); }, 60));
    document.addEventListener('fullscreenchange', UI.lockLandscape);
    if (NC.Input && NC.Input.onNav) NC.Input.onNav(UI.onNav);
    try { NC.sys.load(); } catch (e) { console.error('sys.load', e); }
    const s = UI.settings();
    if (s.lang) NC.setLang(s.lang);
    UI.applySettings();
    UI.i18nStatic();
    if (NC.onLang) NC.onLang(() => { UI.i18nStatic(); UI.rerender(); UI.hud && UI.hud.relabel && UI.hud.relabel(); });
    UI.hud && UI.hud.init && UI.hud.init();
    try { NC.audio && NC.audio.music && NC.audio.music('menu'); } catch (e) {}
    await UI.loader.run(); // loads assets + game init, ends with the ship warp-out
    UI.afterLoad();
  };
  UI.afterLoad = () => {
    UI.show('menu', {}, true);
    const queue = [];
    if (!UI.settings().lang) queue.push(next => UI.pickLanguage(next));
    queue.push(next => { let m = null; try { m = NC.sys.migrationReport && NC.sys.migrationReport(); } catch (e) {} if (m) {
        const parts = [];
        if (m.ships && m.ships.length) parts.push(t('mig.ships', { n: m.ships.length }));
        if (m.gear) parts.push(t('mig.gear', { n: m.gear }));
        if ((m.turrets && m.turrets.length) || (m.comps && m.comps.length)) parts.push(t('mig.drones', { n: (m.turrets || []).length + (m.comps || []).length }));
        const refund = (m.refund || 0) + (m.gearRefund || 0);
        if (refund) parts.push(t('mig.refund', { n: UI.fmt(refund) }));
        UI.toast(t('toast.update3') + (parts.length ? ': ' + parts.join(', ') : ''), 'warm', 7000);
      } next(); });
    queue.push(next => UI.offlinePopup ? UI.offlinePopup(next) : next());
    queue.push(next => UI.dailyPopup ? UI.dailyPopup(next) : next());
    const run = () => { const f = queue.shift(); if (f) f(run); };
    run();
  };

  // first gesture unlocks audio
  const unlock = () => { try { NC.audio && NC.audio.unlock && NC.audio.unlock(); } catch (e) {} UI.lockLandscape(); };
  addEventListener('pointerdown', unlock, { once: true }); addEventListener('keydown', unlock, { once: true });

  if (!UI.noAutoBoot) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => UI.boot());
    else setTimeout(() => UI.boot(), 0);
  }
})(window.NC = window.NC || {});
