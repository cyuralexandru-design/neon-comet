'use strict';
// Neon Comet 3.1 - UI core + boot (agent core).
// NC.ui: helpers (DOM, sprites, item tiles UI.frame, info card UI.infoCard, toasts, modals), screen stack, gamepad/keyboard
// menu navigation (via NC.Input.onNav), UI scale (--k / --p / --u), stage layout (viewport fix), settings application,
// engine hooks routing, rotate overlay, "what's new" popup, boot sequence.
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  const t = (k, v) => NC.t(k, v);
  const $ = id => document.getElementById(id);
  UI.$ = $; UI.t = t;
  UI.VERSION = '3.1.0';
  if (!NC.VERSION || /^3\.0(\.|$)/.test(String(NC.VERSION))) NC.VERSION = UI.VERSION; // menu/settings show v3.1 even if data.js is older

  // ------------------------------------------------------------------ small helpers
  UI.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const esc = UI.esc;
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
  UI.spriteUrl = id => { try { return NC.assets && NC.assets.url ? NC.assets.url(id) : ''; } catch (e) { return ''; } };
  // URL of ONE frame of a sprite (strips like chest_open_* / ui_rotate would otherwise show every frame side by side)
  const frameCache = {};
  UI.frameUrl = (id, f = 0) => {
    try {
      const A = NC.assets; if (!A || !A.get || !A.icon || !A.loaded) return UI.spriteUrl(id);
      const s = A.get(id); if (!s || (s.frames || 1) <= 1) return UI.spriteUrl(id);
      const key = id + '#' + f; if (frameCache[key]) return frameCache[key];
      return (frameCache[key] = A.icon(id, 1, f).toDataURL());
    } catch (e) { return UI.spriteUrl(id); }
  };
  UI.img = (id, cls = 'ico24', alt = '') => `<img class="ico pix ${cls}" src="${esc(UI.spriteUrl(id))}" alt="${esc(alt)}" draggable="false">`;
  UI.bigImg = (id, cls = '') => `<img class="pix ${cls}" src="${esc(UI.frameUrl(id))}" alt="" draggable="false">`;
  UI.icoCr = (cls = 'ico10') => UI.img('ui_crystal', cls);
  UI.cr = (n, cls = '') => `<span class="cr ${cls}">${UI.icoCr()}<b>${UI.fmt(n)}</b></span>`;

  // gear set badge (no sprites for sets: small vector shapes in the set colour, see .set-ico in style.css)
  const SET_SHAPES = {
    titan: '<path d="M6 .8l4.6 2.6v5.2L6 11.2 1.4 8.6V3.4z"/>',
    fantoma: '<path d="M6 .9l5.2 9.9H.8z"/>',
    tezaur: '<path d="M6 .6l5.4 5.4L6 11.4.6 6z"/>',
    x: '<circle cx="6" cy="6" r="4.6"/>',
  };
  UI.setIcon = (id, cls = '') => `<svg class="set-ico ${SET_SHAPES[id] ? id : 'x'} ${cls}" viewBox="0 0 12 12" aria-hidden="true"><g fill="currentColor" stroke="rgba(5,8,13,.9)" stroke-width="1">${SET_SHAPES[id] || SET_SHAPES.x}</g></svg>`;
  const CHECK = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 5.2l2.2 2.2 3.9-4.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="square"/></svg>';

  // ------------------------------------------------------------------ item tile (SPEC-31 §1)
  // UI.frame(r, innerHtml, opts) -> square tile, rarity border (r 0..4; null = neutral), bottom band "Nv X".
  // opts: lvl (number -> t('common.lvl') | string as is), equipped (cyan check TL), up (green triangle TR), set (set id badge),
  //       badge (count, amber; badgeKind:'red'), empty (dashed slot, greyed inner + cyan "+"), locked (lock + grey),
  //       cls (extra classes: sm | big | huge | fill | sel | dimmed ...), attrs (raw attribute string, e.g. 'data-f data-a="x"').
  // Old 3.0 opts (noPips, cls:'empty'/'big') still work. Size: CSS var --ts (default 52 ref px) or the size classes.
  UI.frame = (r, inner, opts) => {
    opts = opts || {};
    const neutral = r == null || r === '' || Number.isNaN(Number(r));
    const rc = neutral ? 'rn' : 'r' + Math.max(0, Math.min(4, r | 0));
    const cls = String(opts.cls || '');
    const empty = !!opts.empty || /(^|\s)empty(\s|$)/.test(cls);
    const hasLv = !empty && opts.lvl != null && opts.lvl !== '' && opts.lvl !== false;
    const lv = hasLv ? (typeof opts.lvl === 'number' ? t('common.lvl', { n: opts.lvl }) : String(opts.lvl)) : '';
    let h = `<div class="rf ${rc}${empty ? ' empty' : ''}${hasLv ? ' has-lv' : ''}${opts.locked ? ' locked' : ''}${opts.equipped ? ' is-eq' : ''} ${cls}"${opts.attrs ? ' ' + opts.attrs : ''}>`;
    h += `<span class="rf-art">${inner || ''}</span>`;
    if (hasLv) h += `<span class="rf-lv">${esc(lv)}</span>`;
    if (opts.equipped && !empty) h += `<span class="rf-eq">${CHECK}</span>`;
    if (opts.badge != null && opts.badge !== '' && opts.badge !== false) h += `<span class="rf-bd${opts.badgeKind === 'red' ? ' red' : ''}">${esc(opts.badge)}</span>`;
    if (opts.up && !empty && !opts.locked) h += '<span class="rf-up"></span>';
    if (opts.set) h += `<span class="rf-set">${UI.setIcon(opts.set)}</span>`;
    if (opts.locked) h += UI.img('ui_lock', 'rf-lk');
    if (empty) h += '<span class="rf-plus">+</span>';
    return h + '</div>';
  };
  // 3.0 helper kept: frame + caption, focusable
  UI.tile = (r, sprite, cap, attrs = '', opts = {}) =>
    `<div class="tile ${opts.cls || ''}" data-f ${attrs}>${opts.check ? '<i class="chk"></i>' : ''}${UI.frame(r, UI.img(sprite, opts.icoCls || 'ico24'), Object.assign({}, opts, { cls: opts.frameCls || '' }))}${cap != null ? `<span class="cap">${esc(cap)}</span>` : ''}</div>`;

  // ------------------------------------------------------------------ toasts / banner
  UI.toast = (msg, kind = '', ms = 2500, icon) => {
    const box = $('toasts'); if (!box || !msg) return;
    const el = document.createElement('div'); el.className = 'toast ' + (kind || '');
    if (icon) el.innerHTML = UI.img(icon, '') + `<span>${esc(msg)}</span>`; else el.textContent = msg;
    el.style.animationDuration = Math.max(600, ms - 100) + 'ms';
    box.appendChild(el); while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => el.remove(), ms);
  };
  UI.err = r => { if (r && !r.ok) { UI.toast(t(r.err || 'toast.error'), 'bad'); UI.sfx('error'); } return r && r.ok; };
  // non-gameplay banner (engine no longer uses it during play, SPEC-31 §2.1)
  UI.banner = (titleKey, sub, kind) => {
    const b = $('banner'); if (!b) return;
    const title = NC.hasT && NC.hasT(titleKey) ? t(titleKey) : titleKey;
    const subTxt = sub && NC.hasT && NC.hasT(sub) ? t(sub) : (sub || '');
    b.className = kind || (/boss|warn/.test(String(titleKey)) ? 'warn' : '');
    b.innerHTML = `<div class="bn"><div class="bt">${esc(title)}</div>${subTxt ? `<div class="bs">${esc(subTxt)}</div>` : ''}</div>`;
    void b.offsetWidth; b.classList.add('show');
    clearTimeout(UI._bt); UI._bt = setTimeout(() => { b.classList.remove('show'); b.innerHTML = ''; }, 2700);
  };

  // ------------------------------------------------------------------ modal stack
  // UI.modal(html, {on(a, el, ev), dismiss:false, back(), onClose(), cls}) -> modal element
  UI.modals = [];
  UI.modal = (html, opts = {}) => {
    const el = document.createElement('div'); el.className = 'modal' + (opts.cls ? ' ' + opts.cls : ''); el.innerHTML = html;
    el._opts = opts; $('stage').appendChild(el); UI.modals.push(el);
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (a && el.contains(a) && opts.on) { opts.on(a.dataset.a, a, e); return; }
      if (e.target === el && opts.dismiss !== false) UI.closeModal(el);
    });
    UI.scrollFx(el); UI.refocus(); return el;
  };
  UI.closeModal = (el, silent) => {
    el = el || UI.modals[UI.modals.length - 1]; if (!el) return;
    if (!UI.modals.includes(el)) { el.remove(); return; }
    UI.modals = UI.modals.filter(m => m !== el); el.remove();
    if (!silent && el._opts && el._opts.onClose) { try { el._opts.onClose(); } catch (e) { console.error(e); } }
    UI.refocus();
  };
  UI.confirm = (msg, onYes, opts = {}) => {
    const m = UI.modal(`<div class="pnl pop-in" style="max-width:${Math.round(UI.k * 420)}px"><div class="ttl">${esc(opts.title || t('common.confirm'))}</div><div class="msg">${esc(msg)}</div>
      <div class="acts"><button class="btn mut" data-f data-a="no">${esc(t('common.no'))}</button><button class="btn ${opts.danger ? 'back' : 'pri'}" data-f data-a="yes">${esc(t('common.yes'))}</button></div></div>`,
    { on: a => { UI.closeModal(m, true); if (a === 'yes') onYes(); } });
  };

  // ------------------------------------------------------------------ info card (SPEC-31 §1)
  // UI.infoCard({img, r, title, sub, desc, stats:[[label, value, cls?]], foot, actions:[{a, label, cls, off, keep, html}], on(a, card, action),
  //              tag, special, cls, descHtml, onClose}) -> modal element (+ .update(patch), .close()).
  // img = sprite id (frame 0, pixelated, big) or raw html starting with '<'. r = rarity 0..4 (null = neutral frame).
  // sub defaults to the rarity name. After an action the card closes, unless action.keep / action.off or on() returns false.
  // Closes on tap outside, the x button, Back / Esc / Circle (UI.back).
  UI.infoCard = (o = {}) => {
    let cur = Object.assign({}, o);
    const build = c => {
      const neutral = c.r == null || c.r === '' || Number.isNaN(Number(c.r));
      const rc = neutral ? 'rn' : 'r' + Math.max(0, Math.min(4, c.r | 0));
      let art = '';
      if (typeof c.img === 'string' && c.img) art = c.img.trim().charAt(0) === '<' ? c.img : UI.bigImg(c.img);
      const sub = c.sub != null ? c.sub : (neutral ? '' : UI.rname(c.r | 0));
      const stats = (c.stats || []).filter(Boolean).map(s => `<span class="k">${esc(s[0])}</span><span class="v ${s[2] || ''}">${esc(s[1])}</span>`).join('');
      const acts = (c.actions || []).filter(Boolean).map((b, i) =>
        `<button class="btn ${b.cls || 'mut'}${b.off ? ' off' : ''}" data-f${i === 0 && !b.off ? ' data-first' : ''} data-a="${esc(b.a)}">${b.html != null ? b.html : esc(b.label)}</button>`).join('');
      return `<div class="icard ${rc}${c.special ? ' special' : ''} ${c.cls || ''} pop-in" role="dialog" aria-label="${esc(c.title || '')}">
        <button class="ic-x" data-f data-a="__close" aria-label="${esc(t('common.close'))}">&times;</button>
        ${art ? `<div class="ic-art">${art}${c.tag != null && c.tag !== '' ? `<span class="ic-tag chip">${esc(c.tag)}</span>` : ''}</div>` : ''}
        <div class="ic-title">${esc(c.title || '')}</div>${sub ? `<div class="ic-sub">${esc(sub)}</div>` : ''}
        <div class="ic-body">${c.desc ? `<div class="ic-desc">${esc(c.desc)}</div>` : ''}${c.descHtml || ''}${stats ? `<div class="ic-stats">${stats}</div>` : ''}${c.foot ? `<div class="ic-foot">${esc(c.foot)}</div>` : ''}</div>
        ${acts ? `<div class="ic-acts">${acts}</div>` : ''}</div>`;
    };
    const m = UI.modal(build(cur), {
      cls: 'ic-modal',
      onClose: () => { if (cur.onClose) cur.onClose(); },
      on: (a) => {
        if (a === '__close') { UI.sfx('click'); UI.closeModal(m); return; }
        const act = (cur.actions || []).find(x => x && String(x.a) === a) || null;
        let res; try { res = cur.on ? cur.on(a, m, act) : undefined; } catch (e) { console.error('infoCard.on', e); }
        if (res !== false && !(act && (act.keep || act.off)) && UI.modals.includes(m)) UI.closeModal(m);
      },
    });
    m.update = patch => { cur = Object.assign({}, cur, patch || {}); m.innerHTML = build(cur); UI.scrollFx(m); UI.refocus(true); return m; };
    m.close = () => UI.closeModal(m);
    return m;
  };

  // ------------------------------------------------------------------ screens
  // UI.screens[name] = { render(el, state), back?(), tab?(dir), act?(a, el, s, ev), navHook?(), onReturn?(), cls?, under? }.
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
  UI.render = (s) => {
    s = s || UI.top(); if (!s) return;
    const sc = s.el.querySelector('.scroll'); const st = sc ? sc.scrollTop : 0;
    s.def.render(s.el, s.state, s);
    const sc2 = s.el.querySelector('.scroll'); if (sc2) sc2.scrollTop = st;
    UI.scrollFx(s.el);
  };
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

  // ------------------------------------------------------------------ scroll areas: fade mask state (.fx-more / .fx-less)
  const fxOne = el => {
    const max = el.scrollHeight - el.clientHeight;
    el.classList.toggle('fx-more', max > 2 && el.scrollTop < max - 2);
    el.classList.toggle('fx-less', el.scrollTop > 2);
  };
  UI.scrollFx = (root) => { try { (root || document).querySelectorAll('.scroll').forEach(fxOne); if (root && root.classList && root.classList.contains('scroll')) fxOne(root); } catch (e) {} };
  document.addEventListener('scroll', e => { const el = e.target; if (el && el.classList && el.classList.contains('scroll')) fxOne(el); }, true);
  let fxRaf = 0;
  const fxSoon = () => { if (fxRaf) return; fxRaf = requestAnimationFrame(() => { fxRaf = 0; UI.scrollFx($('screens')); UI.modals.forEach(m => UI.scrollFx(m)); }); };

  // ------------------------------------------------------------------ focus + navigation (gamepad / keyboard)
  const FOC = '[data-f]:not([disabled]):not(.off-f), button.btn:not([disabled]), .tab, .tile, .card, .slot';
  UI.root = () => UI.modals.length ? UI.modals[UI.modals.length - 1] : UI.top() ? UI.top().el : (document.querySelector('#tut:not([hidden])') || null);
  UI.focusables = () => {
    const r = UI.root(); if (!r) return [];
    return Array.from(r.querySelectorAll(FOC)).filter((el, i, a) => a.indexOf(el) === i && el.offsetParent !== null && !el.closest('[hidden]'));
  };
  // scroll only real scroll containers (never #stage / the document: that shifted the whole UI and left an empty strip)
  UI.reveal = (el) => {
    let p = el && el.parentElement;
    const pad = 6 * (UI.k || 1);
    while (p && p !== document.body && p.id !== 'stage' && p.id !== 'screens') {
      const cs = getComputedStyle(p);
      if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1) {
        const r = el.getBoundingClientRect(), pr = p.getBoundingClientRect();
        if (r.top < pr.top + pad) p.scrollTop -= (pr.top + pad - r.top);
        else if (r.bottom > pr.bottom - pad) p.scrollTop += Math.min(r.bottom - (pr.bottom - pad), r.top - (pr.top + pad));
      }
      if (/(auto|scroll)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth + 1) {
        const r = el.getBoundingClientRect(), pr = p.getBoundingClientRect();
        if (r.left < pr.left + pad) p.scrollLeft -= (pr.left + pad - r.left);
        else if (r.right > pr.right - pad) p.scrollLeft += (r.right - (pr.right - pad));
      }
      p = p.parentElement;
    }
  };
  let focused = null;
  UI.focused = () => focused;
  UI.setFocus = (el, scroll = true) => {
    if (focused) focused.classList.remove('pad-focus');
    focused = el || null;
    if (focused) { focused.classList.add('pad-focus'); if (scroll) try { UI.reveal(focused); } catch (e) {} }
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
      const pref = all.find(e => e.hasAttribute('data-first')) || all.find(e => e.classList.contains('pri')) || all.find(e => !e.classList.contains('ic-x')) || all[0];
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

  // ------------------------------------------------------------------ scale + stage layout
  // --k = min(h/390, w/844) clamped 0.8..3 (1 = the 844x390 mockup). --p = k px, --u = 2k px (legacy).
  // The stage gets an explicit px size from innerHeight / visualViewport: fixes the empty strip at the bottom when the game
  // starts directly in landscape (CSS 100%/fixed sizes can stay stale until a rotation). Re-run on every viewport change
  // and a few times after load / fullscreen / rotation, because browser bars hide late.
  const isLand = () => innerWidth >= innerHeight;
  UI.viewport = () => {
    const vv = window.visualViewport;
    let w = innerWidth || document.documentElement.clientWidth || 0, h = innerHeight || document.documentElement.clientHeight || 0;
    if (vv && vv.height > h && vv.height - h < 160) h = vv.height;
    if (vv && vv.width > w && vv.width - w < 160) w = vv.width;
    try { // installed app, landscape: the window is the whole screen; some browsers report a stale smaller height at launch
      const fs = !!document.fullscreenElement || matchMedia('(display-mode: fullscreen)').matches;
      const iosApp = navigator.standalone === true && /iPhone|iPod/.test(navigator.userAgent);
      if ((fs || iosApp) && isLand() && screen && screen.width && screen.height) {
        const sh = Math.min(screen.width, screen.height), sw = Math.max(screen.width, screen.height);
        if (sh > h && sh - h <= Math.max(48, h * 0.16)) h = sh;
        if (iosApp && sw > w && sw - w <= 120) w = sw;
      }
    } catch (e) {}
    return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) };
  };
  UI.k = 1; UI.u = 2;
  UI.layout = () => {
    const { w, h } = UI.viewport();
    const k = Math.round(Math.max(0.8, Math.min(3, Math.min(h / 390, w / 844))) * 1000) / 1000;
    const changed = w !== UI._lw || h !== UI._lh || k !== UI.k;
    UI._lw = w; UI._lh = h;
    if (k !== UI.k || !UI._laid) document.documentElement.style.setProperty('--k', String(k));
    UI.k = k; UI.u = k * 2; UI._laid = true;
    document.body.classList.toggle('short', h / UI.u < 215);
    const st = $('stage');
    if (st) {
      if (changed || st.style.height !== h + 'px') { st.style.width = w + 'px'; st.style.height = h + 'px'; }
      if (st.scrollTop || st.scrollLeft) { st.scrollTop = 0; st.scrollLeft = 0; }
    }
    if (window.scrollX || window.scrollY) { try { window.scrollTo(0, 0); } catch (e) {} }
    if (changed) {
      try { NC.render && NC.render.resize && NC.render.cv && NC.render.resize(); } catch (e) {}
      try { UI.hud && UI.hud.relayout && UI.hud.relayout(); } catch (e) {}
      fxSoon();
    }
    UI.orient();
  };
  let layRaf = 0;
  UI.relayout = () => { if (layRaf) return; layRaf = requestAnimationFrame(() => { layRaf = 0; UI.layout(); }); };
  UI.relayoutBurst = () => { UI.relayout(); [100, 400, 1000, 2500].forEach(ms => setTimeout(UI.layout, ms)); };
  UI.makeStars = () => {}; // 3.0 pixel starfield replaced by the CSS space background (--stars / .bg-space)

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

  // ------------------------------------------------------------------ orientation overlay (phone turns to the LEFT) + lock
  const ARROW_CCW = '<svg class="arr" viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M33 9A24 24 0 0 0 10 31"/><path d="M3.5 24.5 10 32.5 17 25.5"/></g></svg>';
  UI.rotPhone = () => {
    const ph = $('rotate') && $('rotate').querySelector('.ph'); if (!ph) return;
    let spr = false;
    try { spr = !!(NC.assets && NC.assets.loaded && NC.assets.has && NC.assets.has('ui_rotate') && (NC.assets.get('ui_rotate').frames || 1) === 1); } catch (e) {}
    const kind = spr ? 'spr' : 'css';
    if (ph.dataset.kind === kind) return;
    ph.dataset.kind = kind;
    ph.innerHTML = ARROW_CCW + (spr ? `<img class="phone-spr pix" src="${esc(UI.spriteUrl('ui_rotate'))}" alt="" draggable="false">` : '<div class="phone"></div>');
  };
  UI.orient = () => {
    const r = $('rotate'); if (!r) return;
    const portrait = innerHeight > innerWidth;
    if (portrait) {
      UI.rotPhone();
      if (NC.game && NC.game.mode === 'play' && NC.game.pause) { try { NC.game.pause(); } catch (e) {} }
    }
  };
  UI.lockLandscape = () => {
    if (UI._locked) return;
    try {
      const st = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || document.fullscreenElement;
      if (st && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').then(() => { UI._locked = true; }).catch(() => {});
    } catch (e) {}
  };

  // ------------------------------------------------------------------ language picker (first launch)
  UI.pickLanguage = (done) => {
    const m = UI.modal(`<div class="pnl pop-in" style="min-width:${Math.round(UI.k * 240)}px"><div class="pnl-h"><span class="t">${NC.lang === 'en' ? 'Choose language / Alege limba' : 'Alege limba / Choose language'}</span></div>
      <div class="col"><button class="btn lg pri" data-f data-first data-a="ro">Romana</button><button class="btn lg mut" data-f data-a="en">English</button></div></div>`,
    { dismiss: false, back: () => {}, on: a => { UI.setSetting('lang', a); UI.closeModal(m, true); done && done(); } });
  };

  // ------------------------------------------------------------------ "what's new" (once per version, SPEC-31 §2.12)
  UI.WHATSNEW = '3.1';
  UI.whatsNew = (next, force) => {
    const done = () => { next && next(); };
    let seen = null; try { seen = localStorage.getItem('nc.seenVersion'); } catch (e) {}
    const mark = () => { try { localStorage.setItem('nc.seenVersion', UI.WHATSNEW); } catch (e) {} };
    if (!force && seen === UI.WHATSNEW) return done();
    if (!force && UI._freshInstall) { mark(); return done(); } // brand-new player: nothing "new" to explain
    const lines = String(t('whatsnew.31.body')).split('\n').map(s => s.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean);
    const m = UI.modal(`<div class="pnl wn pop-in"><div class="pnl-h"><span class="t">${esc(t('whatsnew.31.title'))}</span><span class="cnt">v${esc(UI.WHATSNEW)}</span></div>
      <ul>${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
      <div class="acts"><button class="btn pri lg" data-f data-first data-a="ok">${esc(t('core.whatsnew.ok'))}</button></div></div>`,
    { on: () => UI.closeModal(m), onClose: () => { mark(); done(); } });
    return m;
  };

  UI.i18nStatic = () => document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });

  // ------------------------------------------------------------------ boot
  UI.boot = async () => {
    UI.layout();
    addEventListener('resize', UI.relayout);
    const vv = window.visualViewport;
    if (vv) { vv.addEventListener('resize', UI.relayout); vv.addEventListener('scroll', UI.relayout); }
    addEventListener('orientationchange', UI.relayoutBurst);
    addEventListener('pageshow', UI.relayoutBurst);
    addEventListener('load', UI.relayoutBurst);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) UI.relayoutBurst(); });
    const onFs = () => { UI.lockLandscape(); UI.relayoutBurst(); };
    document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);
    try { screen.orientation && screen.orientation.addEventListener && screen.orientation.addEventListener('change', UI.relayoutBurst); } catch (e) {}
    try { matchMedia('(orientation: portrait)').addEventListener('change', UI.relayoutBurst); } catch (e) {}
    UI.relayoutBurst();
    try { new MutationObserver(fxSoon).observe($('screens'), { childList: true, subtree: true }); } catch (e) {}

    if (NC.Input && NC.Input.onNav) NC.Input.onNav(UI.onNav);
    try { NC.sys.load(); } catch (e) { console.error('sys.load', e); }
    const s = UI.settings();
    UI._freshInstall = !s.lang;
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
    UI.layout(); UI.rotPhone();
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
    queue.push(next => UI.whatsNew(next));
    queue.push(next => UI.offlinePopup ? UI.offlinePopup(next) : next());
    queue.push(next => UI.dailyPopup ? UI.dailyPopup(next) : next());
    const run = () => { const f = queue.shift(); if (f) f(run); };
    run();
  };

  // audio unlock on EVERY gesture (the context can get suspended again after app switch / lock / call / bluetooth change)
  const unlock = () => { try { NC.audio && NC.audio.unlock && NC.audio.unlock(); } catch (e) {} };
  ['pointerdown', 'keydown', 'touchend'].forEach(ev => addEventListener(ev, unlock, { capture: true, passive: true }));
  addEventListener('pointerdown', () => UI.lockLandscape(), { capture: true, passive: true });

  if (!UI.noAutoBoot) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => UI.boot());
    else setTimeout(() => UI.boot(), 0);
  }
})(window.NC = window.NC || {});
