'use strict';
// Neon Comet 3.1 - display refresh-rate detection (agent input). SPEC-31 §2.8.
// NC.display = { maxHz, hz, detected, detect(): Promise<number>, onChange(fn) }
//  - maxHz: highest refresh rate seen on this device (cached in localStorage 'nc.displayHz'); Settings enables the
//    120 FPS option when maxHz >= 110. Erring high is harmless (the engine just runs at the display rate).
//  - hz: last measurement (median rAF frame delta over ~1 s, snapped to 60/75/90/100/120/144/165/240...).
//  - detect(): measures now (shared promise while running); never rejects, resolves with the snapped Hz
//    (or the current maxHz when the page is hidden / measurement unreliable).
//  - runs automatically after load (non-blocking), again when the page becomes visible after a while or when the
//    window moves to a screen with another size; notifies onChange(fn) listeners + NC.ui.onDisplayHz(maxHz, hz).
(function (NC) {
  const KEY = 'nc.displayHz';
  const SNAP = [48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 180, 240, 360];
  const D = NC.display = NC.display || {};
  D.maxHz = 60; D.hz = 60; D.detected = false; D.raw = 0;
  const subs = [];
  let running = null, lastT = 0, retries = 0, retryOnShow = false, hiddenAt = 0;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const hidden = () => typeof document !== 'undefined' && !!document.hidden;

  // ---- cache
  function readCache() {
    try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && v.max >= 30 && v.max <= 500) { D.maxHz = v.max; D.hz = v.hz || v.max; } } catch (e) { /* ignore */ }
  }
  function writeCache() { try { localStorage.setItem(KEY, JSON.stringify({ max: D.maxHz, hz: D.hz, t: Date.now() })); } catch (e) { /* ignore */ } }
  readCache();

  function snap(hz) {
    let best = Math.round(hz), bd = Infinity;
    for (const c of SNAP) { const d = Math.abs(c - hz) / c; if (d < bd) { bd = d; best = c; } }
    return bd <= 0.08 ? best : Math.round(hz);
  }
  function notify() {
    for (const f of subs.slice()) { try { f(D.maxHz, D.hz); } catch (e) { console.error(e); } }
    try { NC.ui && typeof NC.ui.onDisplayHz === 'function' && NC.ui.onDisplayHz(D.maxHz, D.hz); } catch (e) { console.error(e); }
  }
  D.onChange = (fn) => { if (typeof fn === 'function') subs.push(fn); return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); }; };

  // ---- measurement: ~1 s of rAF deltas, median (robust against GC/loading hitches)
  function measure() {
    return new Promise((resolve) => {
      const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null;
      if (!raf || hidden()) { retryOnShow = true; resolve(0); return; }
      const ds = []; let prev = 0, n = 0, done = false;
      const t0 = now();
      const finish = (v) => { if (done) return; done = true; clearTimeout(guard); resolve(v); };
      const guard = setTimeout(() => finish(0), 2500); // rAF not firing (background / throttled)
      const step = (t) => {
        if (done) return;
        if (hidden()) { retryOnShow = true; finish(0); return; }
        if (prev && ++n > 4) { const d = t - prev; if (d > 1.5 && d < 100) ds.push(d); } // skip warm-up frames
        prev = t;
        if (ds.length >= 240 || (now() - t0 > 1100 && ds.length >= 40)) {
          ds.sort((a, b) => a - b);
          finish(1000 / ds[ds.length >> 1]);
          return;
        }
        if (now() - t0 > 2200) { finish(0); return; }
        raf(step);
      };
      raf(step);
    });
  }
  D.detect = function () {
    if (running) return running;
    running = measure().then((raw) => {
      running = null; lastT = Date.now();
      if (!raw || raw < 50) { // unreliable (hidden, busy main thread, low-power 30 fps): keep cache, retry later
        if (raw) D.raw = raw;
        if (!hidden() && retries < 3) { retries++; setTimeout(() => D.detect(), 5000 * retries); }
        return D.maxHz;
      }
      retries = 0; retryOnShow = false;
      const hz = snap(raw), oldMax = D.maxHz, oldHz = D.hz;
      D.raw = raw; D.hz = hz; D.detected = true;
      D.maxHz = Math.max(D.maxHz, hz); // peak memory (cached default 60)
      writeCache();
      if (D.maxHz !== oldMax || D.hz !== oldHz) notify();
      return hz;
    }, () => { running = null; return D.maxHz; });
    return running;
  };

  // ---- auto runs
  if (typeof window !== 'undefined' && window.addEventListener) {
    const auto = () => setTimeout(() => D.detect(), 1200);
    if (typeof document !== 'undefined' && document.readyState === 'complete') auto();
    else window.addEventListener('load', auto, { once: true });
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      // re-detect when the last attempt was skipped, or after a longer break (monitor / power mode may have changed)
      if (retryOnShow || !D.detected || Date.now() - hiddenAt > 60000) setTimeout(() => { if (!hidden()) D.detect(); }, 800);
    });
    let scr = '';
    try { scr = screen.width + 'x' + screen.height; } catch (e) { scr = ''; }
    window.addEventListener('resize', () => {
      let s = ''; try { s = screen.width + 'x' + screen.height; } catch (e) { s = ''; }
      if (s && s !== scr) { scr = s; if (Date.now() - lastT > 3000) setTimeout(() => D.detect(), 1000); } // moved to another screen
    });
  }
})(window.NC = window.NC || {});
