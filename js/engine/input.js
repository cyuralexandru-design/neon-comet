'use strict';
// Neon Comet 3.0 engine: input (keyboard/mouse, touch joystick state, gamepad incl. DualSense non-standard mapping).
// See NOTES/engine.md "NC.Input" for the API the UI uses.
(function (NC) {
  const U = NC.U;
  const I = NC.Input = {
    move: { x: 0, y: 0 },            // normalized move vector (-1..1), merged from all devices
    aim: { x: 0, y: 0, on: false },  // right stick aim (gamepad), on=true when stick is pushed
    mouse: { x: 0, y: 0, on: false },// mouse position in CSS px relative to the canvas (on = moved recently, PC follow mode)
    device: 'kb',                    // last used device: 'kb' | 'mouse' | 'touch' | 'pad'
    keys: {},
    joy: { active: false, id: null, cx: 0, cy: 0, kx: 0, ky: 0, x: 0, y: 0, R: 40, zoneW: 0, zoneH: 0 }, // CSS px relative to the bound zone
    pad: { connected: false, index: null, id: '', mapping: '', sony: false, axes: 0, buttons: 0 },
    q: { dash: false, pause: false, cons: [false, false, false] },
    held: { dash: false },
    kbNav: true,                     // emit nav events from keyboard (UI may set false if it handles keys itself)
    deadzone: 0.18,
    _prev: [], _navT: 0, _navHeld: false, _navHandlers: [], _lastPadId: '', _zone: null,
  };

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
    const ring = Math.round(r * 2.3), sgn = left ? 1 : -1;
    const cons = [200, 245, 290].map((deg) => { // angles measured for right hand: left, up-left, up
      const a = (left ? 180 - deg : deg) * Math.PI / 180;
      return { x: Math.round(dx + Math.cos(a) * ring), y: Math.round(dy + Math.sin(a) * ring), r: Math.round(r * 0.72) };
    });
    void sgn;
    return { mirrored: left, dash: { x: dx, y: dy, r }, cons, pause: { x: left ? w - 30 : 30, y: 30, r: 18 }, joySide: left ? 'right' : 'left', joyR: Math.round(40 * size) };
  };

  // ------------------------------------------------------------ gamepad
  // Logical button indices (standard mapping): 0 cross/A, 1 circle/B, 2 square/X, 3 triangle/Y, 4 L1, 5 R1, 6 L2, 7 R2,
  // 8 create/back, 9 options/start, 10 L3, 11 R3, 12 up, 13 down, 14 left, 15 right, 16 PS/home, 17 touchpad
  const SONY_RAW = { 0: 2, 1: 0, 2: 1, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 16, 13: 17 };
  const isSony = (id) => /054c|dualsense|dualshock|wireless controller|playstation|ps5|ps4/i.test(id || '');
  function pickPad() {
    let list = [];
    try { list = navigator.getGamepads ? Array.from(navigator.getGamepads() || []) : []; } catch (e) { list = []; }
    const ok = (p) => p && p.connected !== false && p.buttons && p.axes;
    let p = I.pad.index != null ? list[I.pad.index] : null;
    if (!ok(p) || (p.id !== I._lastPadId && I._lastPadId)) p = null;
    if (!p) p = list.find(ok) || null;
    return p;
  }
  function hatDir(v) { // POV hat axis (raw HID), returns [x,y]
    if (v == null || v < -1.05 || v > 1.05) return [0, 0];
    const i = Math.round((v + 1) / (2 / 7)) & 7;
    return [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]][i];
  }
  // Reads a pad into a logical {b:[18 bools], v:[18 values], lx, ly, rx, ry}
  function readPad(p) {
    const std = p.mapping === 'standard', sony = !std && isSony(p.id);
    const b = new Array(18).fill(false), v = new Array(18).fill(0);
    const set = (li, btn) => { if (!btn) return; const val = typeof btn === 'object' ? (btn.value || (btn.pressed ? 1 : 0)) : +btn; const pr = typeof btn === 'object' ? !!btn.pressed || val > 0.5 : val > 0.5; if (pr) b[li] = true; v[li] = Math.max(v[li], val); };
    p.buttons.forEach((btn, i) => {
      if (std) { if (i < 18) set(i, btn); }
      else if (sony) { if (SONY_RAW[i] != null) set(SONY_RAW[i], btn); }
      else if (i < 18) set(i, btn);
    });
    const ax = p.axes; let lx = ax[0] || 0, ly = ax[1] || 0, rx = 0, ry = 0;
    if (std) { rx = ax[2] || 0; ry = ax[3] || 0; }
    else if (ax.length >= 6) { rx = ax[2] || 0; ry = ax[5] || 0; } else { rx = ax[2] || 0; ry = ax[3] || 0; }
    if (!std) { // d-pad as hat axis (usually axis 9) or as two axes 6/7
      let hx = 0, hy = 0;
      if (ax.length >= 10) [hx, hy] = hatDir(ax[9]);
      else if (ax.length >= 8 && !sony) { hx = Math.round(ax[6] || 0); hy = Math.round(ax[7] || 0); }
      if (hy < 0) b[12] = true; if (hy > 0) b[13] = true; if (hx < 0) b[14] = true; if (hx > 0) b[15] = true;
    }
    return { b, v, lx, ly, rx, ry, std, sony };
  }
  const dz = (x, d) => (Math.abs(x) < d ? 0 : (x - Math.sign(x) * d) / (1 - d));
  I.padState = null;
  I.getPad = () => pickPad();
  function pollPad(dt) {
    const p = pickPad();
    if (!p) {
      if (I.pad.connected) { I.pad.connected = false; I.pad.index = null; I._lastPadId = ''; U.ui('onPad', false, ''); }
      I.padState = null; return null;
    }
    if (!I.pad.connected || I.pad.index !== p.index) {
      Object.assign(I.pad, { connected: true, index: p.index, id: p.id, mapping: p.mapping, sony: isSony(p.id), axes: p.axes.length, buttons: p.buttons.length });
      I._lastPadId = p.id; I._prev = [];
      U.ui('onPad', true, p.id);
      U.ui('toast', U.t('input.padConnected'));
    }
    const s = readPad(p); I.padState = s;
    const pressed = (i) => s.b[i] && !I._prev[i];
    const any = s.b.some((x, i) => x && !I._prev[i]) || Math.hypot(s.lx, s.ly) > 0.5;
    if (any) I.setDevice('pad');
    const lx = dz(s.lx, I.deadzone), ly = dz(s.ly, I.deadzone);
    let dpx = 0, dpy = 0; if (s.b[14]) dpx--; if (s.b[15]) dpx++; if (s.b[12]) dpy--; if (s.b[13]) dpy++;
    const out = { mx: 0, my: 0, ax: 0, ay: 0, aimOn: false };
    if (lx || ly) { out.mx = lx; out.my = ly; } else if (dpx || dpy) { const m = Math.hypot(dpx, dpy); out.mx = dpx / m; out.my = dpy / m; }
    const rx = dz(s.rx, 0.3), ry = dz(s.ry, 0.3);
    if (Math.hypot(rx, ry) > 0.25) { out.ax = rx; out.ay = ry; out.aimOn = true; }
    if (inMenu()) {
      if (pressed(0)) nav('ok', 'pad');
      if (pressed(1)) nav('back', 'pad');
      if (pressed(9)) nav('pause', 'pad');
      if (pressed(4)) nav('tabPrev', 'pad');
      if (pressed(5)) nav('tabNext', 'pad');
      const sx = lx || dpx, sy = ly || dpy;
      if (Math.hypot(sx, sy) > 0.5) {
        I._navT -= dt;
        if (I._navT <= 0) { nav(Math.abs(sx) > Math.abs(sy) ? (sx > 0 ? 'right' : 'left') : (sy > 0 ? 'down' : 'up'), 'pad'); I._navT = I._navHeld ? 0.12 : 0.34; I._navHeld = true; }
      } else { I._navT = 0; I._navHeld = false; }
      out.mx = out.my = 0;
    } else {
      if (pressed(0) || pressed(5) || pressed(7)) I.q.dash = true;
      if (pressed(2)) I.q.cons[0] = true;
      if (pressed(3)) I.q.cons[1] = true;
      if (pressed(4)) I.q.cons[2] = true;
      if (pressed(9)) I.q.pause = true;
    }
    I._prev = s.b.slice();
    return out;
  }
  addEventListener('gamepadconnected', () => { /* polled every frame anyway */ });
  addEventListener('gamepaddisconnected', () => { /* polled every frame anyway */ });

  // Rumble / vibration. strength 0..1
  I.buzz = (ms, strength = 0.6) => {
    const s = U.settings(); if (s.vibe === false) return;
    try {
      if (I.device === 'touch' && navigator.vibrate) navigator.vibrate(Math.round(ms));
      else if (I.device === 'pad') {
        const p = pickPad(), act = p && p.vibrationActuator;
        if (act && act.playEffect) act.playEffect('dual-rumble', { startDelay: 0, duration: Math.round(ms), strongMagnitude: U.clamp(strength, 0, 1), weakMagnitude: U.clamp(strength * 0.6, 0, 1) }).catch(() => {});
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
    const gp = pollPad(dt);
    if (gp && (gp.mx || gp.my)) { mx = gp.mx; my = gp.my; }
    if (I.joy.active) { mx = I.joy.x; my = I.joy.y; }
    const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
    I.move.x = mx; I.move.y = my;
    I.aim.x = gp ? gp.ax : 0; I.aim.y = gp ? gp.ay : 0; I.aim.on = !!(gp && gp.aimOn);
    I.held.dash = !!(K.Space || (I.padState && I.padState.b[0]));
  };
})(window.NC = window.NC || {});
