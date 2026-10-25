'use strict';
// Neon Comet 3.1 engine: input (keyboard/mouse, touch joystick state, gamepad incl. DualSense raw/non-standard layouts).
// See NOTES/engine.md "NC.Input" + NOTES/31-input.md for the API the UI uses.
// 3.1 pad layout during play: R2 = dash (only), Cross/Square/Triangle = consumables 1/2/3, Options = pause.
// Menus unchanged: Cross ok, Circle back, L1/R1 tabs, Options pause, d-pad/left stick navigation.
(function (NC) {
  const U = NC.U;
  const I = NC.Input = {
    move: { x: 0, y: 0 },            // normalized move vector (-1..1), merged from all devices
    aim: { x: 0, y: 0, on: false },  // right stick aim (gamepad), on=true when stick is pushed
    mouse: { x: 0, y: 0, on: false },// mouse position in CSS px relative to the canvas (on = moved recently, PC follow mode)
    device: 'kb',                    // last used device: 'kb' | 'mouse' | 'touch' | 'pad'
    keys: {},
    joy: { active: false, id: null, cx: 0, cy: 0, kx: 0, ky: 0, x: 0, y: 0, R: 40, zoneW: 0, zoneH: 0 }, // CSS px relative to the bound zone
    pad: { connected: false, index: null, id: '', mapping: '', sony: false, axes: 0, buttons: 0, layout: '' },
    q: { dash: false, pause: false, cons: [false, false, false] },
    held: { dash: false },
    kbNav: true,                     // emit nav events from keyboard (UI may set false if it handles keys itself)
    deadzone: 0.18,
    trigOn: 0.35, trigOff: 0.2,      // analog trigger hysteresis (R2/L2 -> digital)
    _prev: [], _navT: 0, _navHeld: false, _navHandlers: [], _lastPadId: '', _zone: null,
  };

  // Logical (W3C standard mapping) button indices.
  const BT = { CROSS: 0, CIRCLE: 1, SQUARE: 2, TRIANGLE: 3, L1: 4, R1: 5, L2: 6, R2: 7, CREATE: 8, OPTIONS: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, HOME: 16, PAD: 17 };
  I.BT = BT;
  // Bindings (logical indices). Exposed read-only-ish for HUD/help texts; change here only.
  I.PAD_PLAY = { dash: BT.R2, cons: [BT.CROSS, BT.SQUARE, BT.TRIANGLE], pause: BT.OPTIONS };
  I.PAD_MENU = { ok: BT.CROSS, back: BT.CIRCLE, tabPrev: BT.L1, tabNext: BT.R1, pause: BT.OPTIONS };

  const audioPoke = (src) => { try { NC.audio && NC.audio.unlock && NC.audio.unlock(src); } catch (e) { /* ignore */ } };

  // ------------------------------------------------------------ nav dispatch
  // NC.Input.onNav(fn) registers a handler (returns unsubscribe). NC.Input.onNav('up') dispatches.
  // UI may also simply assign NC.Input.onNav = function (dir, src) {...}; the engine always calls NC.Input.onNav(dir, src).
  // dirs: up down left right ok back tabPrev tabNext pause
  I.onNav = function (arg, src) {
    if (typeof arg === 'function') { I._navHandlers.push(arg); return () => { I._navHandlers = I._navHandlers.filter(f => f !== arg); }; }
    for (const f of I._navHandlers.slice()) { try { f(arg, src); } catch (e) { console.error(e); } }
    return undefined;
  };
  const nav = (dir, src) => { try { NC.Input.onNav(dir, src); } catch (e) { console.error(e); } };
  const inMenu = () => {
    const g = NC.game; const mode = g ? g.mode : 'menu';
    let open = false; try { open = !!(NC.ui && NC.ui.menuOpen && NC.ui.menuOpen()); } catch (e) { open = false; }
    return open || mode !== 'play';
  };

  // ------------------------------------------------------------ public actions (UI buttons call these)
  // NC.Input.press('dash'|'pause'|'cons', slotIndex)
  I.press = (name, i) => {
    if (name === 'cons') { if (i >= 0 && i < 3) I.q.cons[i] = true; }
    else if (name in I.q) I.q[name] = true;
  };
  I.take = (name) => { const v = I.q[name]; I.q[name] = false; return v; };
  I.takeCons = (i) => { const v = I.q.cons[i]; I.q.cons[i] = false; return v; };
  I.clear = () => { I.q.dash = I.q.pause = false; I.q.cons = [false, false, false]; };
  I.setDevice = (d) => { if (I.device !== d) { I.device = d; U.ui('onInputDevice', d); } };

  // ------------------------------------------------------------ keyboard
  const isField = (e) => e.target && /input|textarea|select/i.test(e.target.tagName || '');
  addEventListener('keydown', (e) => {
    if (isField(e)) return;
    const c = e.code || '', k = (e.key || '').toLowerCase();
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c)) e.preventDefault();
    const rep = I.keys[c]; I.keys[c] = true;
    I.setDevice('kb'); I.mouse.on = false;
    if (rep) return;
    const menu = inMenu();
    if (menu) {
      if (I.kbNav) {
        const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'ok', NumpadEnter: 'ok', Escape: 'back', Backspace: 'back', KeyQ: 'tabPrev', KeyE: 'tabNext' }[c];
        if (m) nav(m, 'kb');
        else if (c === 'KeyP') nav('pause', 'kb');
      }
      return;
    }
    if (c === 'Space' || c === 'ShiftLeft' || c === 'ShiftRight' || k === ' ') I.q.dash = true;
    if (c === 'Digit1' || c === 'Numpad1') I.q.cons[0] = true;
    if (c === 'Digit2' || c === 'Numpad2') I.q.cons[1] = true;
    if (c === 'Digit3' || c === 'Numpad3') I.q.cons[2] = true;
    if (c === 'KeyP' || c === 'Escape') I.q.pause = true;
  });
  addEventListener('keyup', (e) => { I.keys[e.code || ''] = false; });
  addEventListener('blur', () => { I.keys = {}; I.joyEnd(); });

  // ------------------------------------------------------------ mouse + touch on a surface
  // The engine binds the game canvas automatically. UI may call bindTouch(el) with its own touch zone element.
  function bindSurface(el) {
    const loc = (e) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height }; };
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') { const p = loc(e); I.mouse.x = p.x; I.mouse.y = p.y; I.mouse.on = true; I.setDevice('mouse'); }
      else if (e.pointerId === I.joy.id) joyMove(loc(e));
    });
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') {
        const p = loc(e); I.mouse.x = p.x; I.mouse.y = p.y; I.mouse.on = true; I.setDevice('mouse');
        if (e.button === 2 && !inMenu()) I.q.dash = true;
        return;
      }
      I.setDevice('touch');
      if (I.joy.active || inMenu()) return;
      const p = loc(e), left = U.settings().hand === 'left';
      const inside = left ? p.x > p.w * 0.4 : p.x < p.w * 0.6;
      if (!inside) return;
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      I.joyStart(e.pointerId, p.x, p.y, p.w, p.h);
    });
    const end = (e) => { if (e.pointerId === I.joy.id) I.joyEnd(); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.style.touchAction = 'none';
  }
  function joyMove(p) {
    const J = I.joy; let dx = p.x - J.cx, dy = p.y - J.cy; const m = Math.hypot(dx, dy);
    if (m > J.R) { // floating: base follows the finger
      J.cx += dx * (1 - J.R / m); J.cy += dy * (1 - J.R / m); dx = p.x - J.cx; dy = p.y - J.cy;
    }
    J.kx = dx; J.ky = dy;
    const nx = dx / J.R, ny = dy / J.R, mm = Math.hypot(nx, ny);
    if (mm < 0.12) { J.x = 0; J.y = 0; } else { const k = Math.min(1, (mm - 0.12) / 0.88) / mm; J.x = nx * k; J.y = ny * k; }
  }
  I.bindCanvas = (cv) => bindSurface(cv);
  I.bindTouch = (zone) => { if (zone && zone !== I._zone) { I._zone = zone; bindSurface(zone); } };
  // Manual joystick API (for a UI-owned implementation): positions in CSS px of any surface.
  I.joyStart = (id, x, y, w, h) => {
    const J = I.joy; J.active = true; J.id = id; J.cx = x; J.cy = y; J.kx = J.ky = 0; J.x = J.y = 0;
    J.R = 40 * (U.settings().joySize || 1); J.zoneW = w || 0; J.zoneH = h || 0; I.setDevice('touch');
  };
  I.joyMoveTo = (x, y) => { if (I.joy.active) joyMove({ x, y }); };
  I.joyEnd = () => { const J = I.joy; J.active = false; J.id = null; J.x = J.y = J.kx = J.ky = 0; };
  // Suggested touch layout in CSS px for a w x h screen: DASH bottom corner, consumables around it, pause top corner.
  I.layout = (w, h) => {
    const s = U.settings(), left = s.hand === 'left', size = Math.max(0.6, s.joySize || 1);
    const r = Math.round(30 * size), m = Math.round(26 + r);
    const dx = left ? m : w - m, dy = h - m;
    const ring = Math.round(r * 2.3);
    const cons = [200, 245, 290].map((deg) => { // angles measured for right hand: left, up-left, up
      const a = (left ? 180 - deg : deg) * Math.PI / 180;
      return { x: Math.round(dx + Math.cos(a) * ring), y: Math.round(dy + Math.sin(a) * ring), r: Math.round(r * 0.72) };
    });
    return { mirrored: left, dash: { x: dx, y: dy, r }, cons, pause: { x: left ? w - 30 : 30, y: 30, r: 18 }, joySide: left ? 'right' : 'left', joyR: Math.round(40 * size) };
  };

  // ------------------------------------------------------------ gamepad
  // Logical button indices (standard mapping): 0 cross/A, 1 circle/B, 2 square/X, 3 triangle/Y, 4 L1, 5 R1, 6 L2, 7 R2,
  // 8 create/back, 9 options/start, 10 L3, 11 R3, 12 up, 13 down, 14 left, 15 right, 16 PS/home, 17 touchpad
  //
  // Where each browser delivers a DualSense (054c:0ce6) / DualShock 4 (054c:05c4/09cc):
  //  - Chrome/Edge (Win/mac/Linux/ChromeOS/Android) and Safari (mac/iOS/iPadOS, GameController.framework): mapping 'standard'
  //    -> indices above; L2/R2 = buttons 6/7 with analog .value (Chrome sets .pressed already at ~0.12, so we use .value).
  //  - Firefox (Win/mac): NO remapper for the DualSense -> raw HID order (same as Firefox's own DS4 remapper input):
  //    buttons 0 Square, 1 Cross, 2 Circle, 3 Triangle, 4 L1, 5 R1, 6 L2, 7 R2, 8 Create, 9 Options, 10 L3, 11 R3, 12 PS, 13 Touchpad;
  //    axes 0/1 left stick, 2/5 right stick, 3/4 L2/R2 (-1 rest .. +1 full), 9 = D-pad hat.            -> SONY_HID
  //  - Firefox (Linux, kernel hid-playstation via joydev, ordered by evdev code): buttons 0 Cross(SOUTH), 1 Circle(EAST),
  //    2 Triangle(NORTH), 3 Square(WEST), 4 L1, 5 R1, 6 L2, 7 R2, 8 Create, 9 Options, 10 PS, 11 L3, 12 R3;
  //    axes 0/1 left, 2 L2, 3/4 right stick, 5 R2, 6/7 D-pad hat X/Y.                                        -> SONY_EVDEV
  const SONY_HID = { btn: { 0: 2, 1: 0, 2: 1, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 16, 13: 17 }, rx: 2, ry: 5, l2: 3, r2: 4, hat: 9 };
  const SONY_EVDEV = { btn: { 0: 0, 1: 1, 2: 3, 3: 2, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 16, 11: 10, 12: 11 }, rx: 3, ry: 4, l2: 2, r2: 5, hatX: 6, hatY: 7 };
  const SONY_RAW = SONY_HID.btn; // kept name (3.0 tests reference the HID order)
  void SONY_RAW;
  const isSony = (id) => /054c|dualsense|dualshock|wireless controller|playstation|ps5|ps4|sony/i.test(id || '');
  const UA = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const isLinuxDesktop = /linux/i.test(UA) && !/android/i.test(UA);
  function layoutOf(p) {
    if (p.mapping === 'standard') return 'standard';
    if (!isSony(p.id)) return 'generic';
    // Linux joydev exposes 8 axes (no axis 9 hat); Windows/mac HID raw exposes >= 10 axes (hat on axis 9)
    if (isLinuxDesktop && p.axes.length <= 8 && p.buttons.length <= 13) return 'sony-evdev';
    return 'sony-hid';
  }
  const okPad = (p) => p && p.connected !== false && p.buttons && p.axes;
  const anyBtn = (p) => { // a button clearly down (analog triggers need > 0.6)
    const bs = p.buttons;
    for (let i = 0; i < bs.length && i < 18; i++) { const b = bs[i]; if (!b) continue; const val = typeof b === 'object' ? (+b.value || 0) : (+b || 0); if (val > 0.6 || (typeof b === 'object' && b.pressed && !(val > 0))) return true; }
    return false;
  };
  function pickPad() {
    let list = [];
    try { list = navigator.getGamepads ? Array.from(navigator.getGamepads() || []) : []; } catch (e) { list = []; }
    let p = I.pad.index != null ? list[I.pad.index] : null;
    if (!okPad(p) || (p.id !== I._lastPadId && I._lastPadId)) p = null;
    // switch to another pad when the current one is idle and another one has a button down (e.g. a 2nd pad, or a
    // virtual Xbox pad from Steam/DS4Windows next to the raw DualSense: whichever the player actually uses wins)
    if (p && !anyBtn(p)) { const o = list.find(q => okPad(q) && q !== p && anyBtn(q)); if (o) p = o; }
    if (!p) p = list.find(q => okPad(q) && q.mapping === 'standard') || list.find(okPad) || null;
    return p;
  }
  function hatDir(v) { // POV hat axis (raw HID), returns [x,y]
    if (v == null || v < -1.05 || v > 1.05) return [0, 0];
    const i = Math.round((v + 1) / (2 / 7)) & 7;
    return [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]][i];
  }
  // analog trigger state per logical index (6 L2, 7 R2): hysteresis + "calibrated" flag for raw axes
  const trig = { 6: false, 7: false };
  const trigCal = { 6: false, 7: false };
  function trigAxis(li, a) { // raw axis -1..1 -> 0..1; only trusted after the rest value (-1) was seen once
    if (typeof a !== 'number' || !isFinite(a)) return 0;
    if (a < -0.8) trigCal[li] = true;
    return trigCal[li] ? U.clamp((a + 1) / 2, 0, 1) : 0;
  }
  function trigApply(b, li, val) {
    const on = trig[li] ? val >= I.trigOff : val >= I.trigOn;
    trig[li] = on; b[li] = on;
  }
  // Reads a pad into a logical {b:[18 bools], v:[18 values], lx, ly, rx, ry}
  function readPad(p) {
    const lay = layoutOf(p), std = lay === 'standard', sony = lay === 'sony-hid' || lay === 'sony-evdev';
    const T = lay === 'sony-evdev' ? SONY_EVDEV : SONY_HID;
    const b = new Array(18).fill(false), v = new Array(18).fill(0);
    const set = (li, btn) => {
      if (!btn) return;
      const obj = typeof btn === 'object';
      let val = obj ? (+btn.value || 0) : (+btn || 0);
      if (obj && btn.pressed && !(val > 0)) val = 1;      // digital-only report
      v[li] = Math.max(v[li], val);
      if (li !== 6 && li !== 7 && ((obj && btn.pressed) || val > 0.5)) b[li] = true; // triggers: hysteresis below
    };
    const bs = p.buttons;
    for (let i = 0; i < bs.length; i++) {
      if (std || lay === 'generic') { if (i < 18) set(i, bs[i]); }
      else if (T.btn[i] != null) set(T.btn[i], bs[i]);
    }
    const ax = p.axes; let lx = ax[0] || 0, ly = ax[1] || 0, rx = 0, ry = 0;
    if (std) { rx = ax[2] || 0; ry = ax[3] || 0; }
    else if (sony) {
      rx = ax[T.rx] || 0; ry = ax[T.ry] || 0;
      // the digital L2/R2 bits are in the report too, but some drivers only deliver the analog axis -> merge both
      if (ax.length > T.r2) v[7] = Math.max(v[7], trigAxis(7, ax[T.r2]));
      if (ax.length > T.l2) v[6] = Math.max(v[6], trigAxis(6, ax[T.l2]));
    } else if (ax.length >= 6) { rx = ax[2] || 0; ry = ax[5] || 0; } else { rx = ax[2] || 0; ry = ax[3] || 0; }
    trigApply(b, 6, v[6]); trigApply(b, 7, v[7]);
    if (!std) { // d-pad as hat axis (usually axis 9) or as two axes 6/7
      let hx = 0, hy = 0;
      if (lay === 'sony-evdev') { hx = Math.round(ax[6] || 0); hy = Math.round(ax[7] || 0); }
      else if (ax.length >= 10) [hx, hy] = hatDir(ax[9]);
      else if (ax.length >= 8 && !sony) { hx = Math.round(ax[6] || 0); hy = Math.round(ax[7] || 0); }
      if (hy < 0) b[12] = true; if (hy > 0) b[13] = true; if (hx < 0) b[14] = true; if (hx > 0) b[15] = true;
    }
    return { b, v, lx, ly, rx, ry, std, sony, layout: lay };
  }
  const dz = (x, d) => (Math.abs(x) < d ? 0 : (x - Math.sign(x) * d) / (1 - d));
  I.padState = null;
  I.getPad = () => pickPad();
  let lastPoke = 0;
  function pollPad(dt) {
    const p = pickPad();
    if (!p) {
      if (I.pad.connected) {
        I.pad.connected = false; I.pad.index = null; I._lastPadId = ''; I._prev = [];
        trig[6] = trig[7] = false; trigCal[6] = trigCal[7] = false;
        U.ui('onPad', false, '');
        if (I.device === 'pad') { let coarse = false; try { coarse = matchMedia('(pointer: coarse)').matches; } catch (e) { coarse = false; } I.setDevice(coarse ? 'touch' : 'kb'); }
      }
      I.padState = null; return null;
    }
    if (!I.pad.connected || I.pad.index !== p.index || I.pad.id !== p.id) {
      const sony = isSony(p.id), first = !I.pad.connected;
      Object.assign(I.pad, { connected: true, index: p.index, id: p.id, mapping: p.mapping, sony, axes: p.axes.length, buttons: p.buttons.length, layout: layoutOf(p) });
      I._lastPadId = p.id; I._prev = []; trig[6] = trig[7] = false; trigCal[6] = trigCal[7] = false;
      U.ui('onPad', true, p.id);
      if (first) U.ui('toast', U.t('input.padConnected') + ' - ' + U.t(sony ? 'in.padLayoutSony' : 'in.padLayout'), '', 5000);
    }
    const s = readPad(p); I.padState = s;
    const pressed = (i) => s.b[i] && !I._prev[i];
    const any = s.b.some((x, i) => x && !I._prev[i]) || Math.hypot(s.lx, s.ly) > 0.5 || Math.hypot(s.rx, s.ry) > 0.6;
    if (any) {
      I.setDevice('pad');
      // gamepad presses are not a "user activation" for autoplay, but resume() still works once the page had one
      // (or in an installed PWA) -> poke audio, throttled
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (now - lastPoke > 400) { lastPoke = now; audioPoke('pad'); }
    }
    const lx = dz(s.lx, I.deadzone), ly = dz(s.ly, I.deadzone);
    let dpx = 0, dpy = 0; if (s.b[14]) dpx--; if (s.b[15]) dpx++; if (s.b[12]) dpy--; if (s.b[13]) dpy++;
    const out = { mx: 0, my: 0, ax: 0, ay: 0, aimOn: false };
    if (lx || ly) { out.mx = lx; out.my = ly; } else if (dpx || dpy) { const m = Math.hypot(dpx, dpy); out.mx = dpx / m; out.my = dpy / m; }
    const rx = dz(s.rx, 0.3), ry = dz(s.ry, 0.3);
    if (Math.hypot(rx, ry) > 0.25) { out.ax = rx; out.ay = ry; out.aimOn = true; }
    if (inMenu()) {
      const M = I.PAD_MENU;
      if (pressed(M.ok)) nav('ok', 'pad');
      if (pressed(M.back)) nav('back', 'pad');
      if (pressed(M.pause)) nav('pause', 'pad');
      if (pressed(M.tabPrev)) nav('tabPrev', 'pad');
      if (pressed(M.tabNext)) nav('tabNext', 'pad');
      const sx = lx || dpx, sy = ly || dpy;
      if (Math.hypot(sx, sy) > 0.5) {
        I._navT -= dt;
        if (I._navT <= 0) { nav(Math.abs(sx) > Math.abs(sy) ? (sx > 0 ? 'right' : 'left') : (sy > 0 ? 'down' : 'up'), 'pad'); I._navT = I._navHeld ? 0.12 : 0.34; I._navHeld = true; }
      } else { I._navT = 0; I._navHeld = false; }
      out.mx = out.my = 0;
    } else {
      const P = I.PAD_PLAY;
      if (pressed(P.dash)) I.q.dash = true;
      for (let k = 0; k < 3; k++) if (pressed(P.cons[k])) I.q.cons[k] = true;
      if (pressed(P.pause)) I.q.pause = true;
    }
    I._prev = s.b.slice();
    return out;
  }
  addEventListener('gamepadconnected', () => { audioPoke('pad'); });
  addEventListener('gamepaddisconnected', () => { /* polled every frame anyway */ });

  // ------------------------------------------------------------ button glyphs (HUD / overlays / help hints)
  // NC.Input.glyph(action) -> {spr:'btn_ps_*'} for Sony pads, {txt:'A'} for other pads, null when no pad is the active device.
  // actions: cons1 cons2 cons3 dash pause ok back (+ tabPrev tabNext); glyph('cons', i) also works (i = 0..2).
  const GLYPH_SONY = { cons1: 'btn_ps_cross', cons2: 'btn_ps_square', cons3: 'btn_ps_triangle', dash: 'btn_ps_r2', pause: 'btn_ps_options', ok: 'btn_ps_cross', back: 'btn_ps_circle' };
  const TXT_SONY = { tabPrev: 'L1', tabNext: 'R1' };
  const TXT_PAD = { cons1: 'A', cons2: 'X', cons3: 'Y', dash: 'RT', pause: '≡', ok: 'A', back: 'B', tabPrev: 'LB', tabNext: 'RB' };
  I.glyph = (action, i) => {
    if (I.device !== 'pad' || !I.pad.connected) return null;
    if (action === 'cons') action = 'cons' + ((i | 0) + 1);
    if (I.pad.sony) {
      if (GLYPH_SONY[action]) return { spr: GLYPH_SONY[action] };
      return TXT_SONY[action] ? { txt: TXT_SONY[action] } : null;
    }
    return TXT_PAD[action] ? { txt: TXT_PAD[action] } : null;
  };

  // Rumble / vibration. strength 0..1
  I.buzz = (ms, strength = 0.6) => {
    const s = U.settings(); if (s.vibe === false) return;
    try {
      if (I.device === 'touch' && navigator.vibrate) navigator.vibrate(Math.round(ms));
      else if (I.device === 'pad') {
        const p = pickPad(), act = p && p.vibrationActuator;
        if (act && act.playEffect) { const r = act.playEffect('dual-rumble', { startDelay: 0, duration: Math.round(ms), strongMagnitude: U.clamp(strength, 0, 1), weakMagnitude: U.clamp(strength * 0.6, 0, 1) }); if (r && r.catch) r.catch(() => {}); }
        else if (p && p.hapticActuators && p.hapticActuators[0]) p.hapticActuators[0].pulse(strength, ms);
      }
    } catch (e) { /* ignore */ }
  };

  // Called once per frame by the engine loop (also while in menus, for nav).
  I.poll = (dt) => {
    let mx = 0, my = 0;
    const K = I.keys;
    if (K.KeyA || K.ArrowLeft) mx -= 1; if (K.KeyD || K.ArrowRight) mx += 1;
    if (K.KeyW || K.ArrowUp) my -= 1; if (K.KeyS || K.ArrowDown) my += 1;
    if (mx || my) { const m = Math.hypot(mx, my); mx /= m; my /= m; }
    let gp = null; try { gp = pollPad(dt); } catch (e) { gp = null; I.padState = null; }
    if (gp && (gp.mx || gp.my)) { mx = gp.mx; my = gp.my; }
    if (I.joy.active) { mx = I.joy.x; my = I.joy.y; }
    const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
    I.move.x = mx; I.move.y = my;
    I.aim.x = gp ? gp.ax : 0; I.aim.y = gp ? gp.ay : 0; I.aim.on = !!(gp && gp.aimOn);
    I.held.dash = !!(K.Space || K.ShiftLeft || K.ShiftRight || (I.padState && I.padState.b[I.PAD_PLAY.dash]));
  };
})(window.NC = window.NC || {});
