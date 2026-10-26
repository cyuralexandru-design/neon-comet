'use strict';
// Neon Comet 3.0 engine: shared helpers (NC.U) + sprite asset loader (NC.assets). SPEC §4.
(function (NC) {
  // ---------------------------------------------------------------- helpers
  const U = NC.U = {
    TAU: Math.PI * 2,
    rnd: (a, b) => a + Math.random() * (b - a),
    irnd: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    lerp: (a, b, t) => a + (b - a) * t,
    angDiff: (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a)),
    d2: (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by),
    weighted(entries) { // [[value, weight]]
      let tot = 0; for (const e of entries) tot += e[1];
      let r = Math.random() * tot;
      for (const e of entries) { r -= e[1]; if (r <= 0) return e[0]; }
      return entries.length ? entries[entries.length - 1][0] : null;
    },
    fmt(n) {
      n = Math.floor(n || 0);
      if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
      if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k';
      return String(n);
    },
    t(key, vars) { try { if (NC.t) return NC.t(key, vars); } catch (e) { /* ignore */ } return key; },
    sfx(name, p) { if (NC.eng && NC.eng.headless) return; try { NC.audio && NC.audio.sfx && NC.audio.sfx(name, p); } catch (e) { /* ignore */ } },
    music(mode) { try { NC.audio && NC.audio.music && NC.audio.music(mode); } catch (e) { /* ignore */ } },
    ui(fn, ...args) { if (NC.eng && NC.eng.headless) return undefined; try { if (NC.ui && typeof NC.ui[fn] === 'function') return NC.ui[fn](...args); } catch (e) { console.error('NC.ui.' + fn, e); } return undefined; },
    // settings object (systems owns it). Never throws, always returns an object with defaults.
    settings() {
      let s = null;
      try { s = (NC.sys && typeof NC.sys.settings === 'function' && NC.sys.settings()) || (NC.sys && NC.sys.state && NC.sys.state.settings) || (NC.save && NC.save.settings) || null; } catch (e) { s = null; }
      return Object.assign({}, U.DEFAULT_SETTINGS, s || {});
    },
    DEFAULT_SETTINGS: { ctrl: 'pc', aim: null, hand: 'right', vibe: true, shake: true, dmgNum: true, quality: 'high', fps: false, colorblind: false, joySize: 1, btnAlpha: 0.85 },
    data(path, def) { // read NC.DATA.<path> with default
      let o = NC.DATA; if (!o) return def;
      for (const k of path.split('.')) { if (o == null || typeof o !== 'object') return def; o = o[k]; }
      return o === undefined ? def : o;
    },
  };

  // ---------------------------------------------------------------- assets
  // Known sizes for every sprite id the engine uses; used when the manifest lacks an id (placeholder).
  const KNOWN = {
    fx_thruster: [8, 8, 3, 12], fx_explode_s: [16, 16, 6, 18], fx_explode_m: [32, 32, 8, 18], fx_explode_l: [64, 64, 10, 16],
    fx_hit: [8, 8, 4, 20], fx_shield: [40, 40, 4, 10], fx_spark: [4, 4, 4, 16], fx_warp: [160, 90, 6, 12],
    proj_laser: [2, 6, 1, 0], proj_plasma: [6, 6, 1, 0], proj_missile: [4, 8, 1, 0], proj_rail: [3, 12, 1, 0], proj_flame: [8, 8, 3, 12],
    proj_laser_evo: [2, 6, 1, 0], proj_plasma_evo: [6, 6, 1, 0], proj_missile_evo: [4, 8, 1, 0], proj_rail_evo: [3, 12, 1, 0], proj_flame_evo: [8, 8, 3, 12],
    eb_small: [6, 6, 1, 0], eb_big: [10, 10, 1, 0], eb_beam: [6, 6, 1, 0],
    pk_star: [4, 4, 4, 6], pk_crystal: [7, 7, 4, 5], pk_xp: [7, 7, 4, 6], pk_supernova: [16, 16, 4, 8], pk_repair: [12, 12, 1, 0],
    ui_rotate: [64, 64, 1, 0],
    // story mode (tools/art/story_art.py)
    en_scav: [24, 24, 4, 8], en_hulk: [40, 40, 2, 4], en_hulk_scrap: [16, 16, 2, 6], en_ghost: [24, 24, 4, 8], en_tether: [32, 32, 2, 6], en_tether_mine: [12, 12, 2, 4],
    eb_tether: [6, 6, 1, 0], ui_clue: [16, 16, 1, 0], ui_star_on: [16, 16, 1, 0], ui_star_off: [16, 16, 1, 0],
    boss_graveking_p2: [112, 112, 3, 6], boss_graveking_p3: [112, 112, 3, 8], ui_logo: [200, 48, 1, 0], ui_crystal: [10, 10, 1, 0], ui_star: [10, 10, 1, 0], ui_lock: [12, 12, 1, 0],
  };
  const PREFIX = [ // [regex, w, h, frames, fps]
    [/^ship_/, 32, 32, 1, 0], [/^wpn_/, 24, 24, 1, 0], [/^tur_/, 16, 16, 1, 0], [/^icon_/, 24, 24, 1, 0], [/^comp_/, 16, 16, 1, 0],
    [/^gear_/, 24, 24, 1, 0], [/^cons_/, 24, 24, 1, 0], [/^chest_open_/, 48, 48, 6, 10], [/^chest_/, 24, 24, 1, 0],
    [/^boss_.*_anim$/, 112, 112, 3, 6], [/^boss_/, 112, 112, 1, 0], [/^mboss_/, 48, 48, 1, 0], [/^card_/, 56, 48, 1, 0],
    [/^bg_/, 320, 180, 1, 0], [/^ui_alert_/, 16, 16, 1, 0], [/^ui_tab_/, 16, 16, 1, 0], [/^btn_ps_/, 12, 12, 1, 0], [/^ui_pip_/, 7, 7, 1, 0], [/^world_/, 32, 32, 1, 0], [/^ci_/, 24, 24, 1, 0], [/^ab_/, 20, 20, 1, 0], [/^crew_/, 40, 34, 2, 3], [/^en_/, 16, 16, 2, 6],
  ];
  const declared = {}; // runtime declarations from engine modules (enemy sizes)
  const A = NC.assets = {
    base: 'assets/sprites/', manifestUrl: 'assets/manifest.json', extraManifests: [],
    manifest: { version: 1, sprites: {} }, cache: {}, loaded: false, missing: new Set(),
  };
  A.declare = (id, w, h, frames = 1, fps = 0) => { declared[id] = [w, h, frames, fps]; };
  function sizeOf(id) {
    if (declared[id]) return declared[id];
    if (KNOWN[id]) return KNOWN[id];
    for (const [re, w, h, f, fps] of PREFIX) if (re.test(id)) return [w, h, f, fps];
    return [16, 16, 1, 0];
  }
  function placeholder(id, def) {
    const [w0, h0, f0, fps0] = sizeOf(id);
    const w = (def && def.w) || w0, h = (def && def.h) || h0, frames = (def && def.frames) || f0;
    const c = document.createElement('canvas'); c.width = w * frames; c.height = h;
    const g = c.getContext('2d');
    for (let f = 0; f < frames; f++) {
      const ox = f * w;
      g.fillStyle = '#ff00ff'; g.fillRect(ox, 0, w, h);
      g.fillStyle = '#b000b0';
      for (let y = 0; y < h; y += 2) for (let x = (y / 2) % 2 ? 1 : 0; x < w; x += 4) g.fillRect(ox + x + (f % 2), y, 1, 1);
      g.fillStyle = '#400040'; g.fillRect(ox, 0, w, 1); g.fillRect(ox, h - 1, w, 1); g.fillRect(ox, 0, 1, h); g.fillRect(ox + w - 1, 0, 1, h);
    }
    return { img: c, w, h, frames, fps: (def && def.fps) || fps0, anchor: (def && def.anchor) || [Math.floor(w / 2), Math.floor(h / 2)], placeholder: true, id };
  }
  function loadImg(url) {
    return new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im); im.onerror = () => res(null);
      im.src = url;
    });
  }
  async function fetchJson(url) {
    try { const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) return null; return await r.json(); } catch (e) { return null; }
  }
  // NC.assets.load(onProgress) -> Promise. onProgress(done, total). Never rejects.
  A.load = async (onProgress) => {
    const main = await fetchJson(A.manifestUrl);
    const sprites = {};
    const add = (m, base) => { if (m && m.sprites) for (const [id, d] of Object.entries(m.sprites)) sprites[id] = Object.assign({}, d, { _base: d.base || base }); };
    add(main, A.base);
    for (const ex of A.extraManifests) { const m = await fetchJson(ex.url); if (m && m.sprites) for (const [id, d] of Object.entries(m.sprites)) if (!sprites[id]) sprites[id] = Object.assign({}, d, { _base: ex.base }); } // dev/test only: fill ids missing from the main manifest
    A.manifest = { version: (main && main.version) || 1, sprites };
    const ids = Object.keys(sprites); let done = 0;
    const tick = () => { done++; try { onProgress && onProgress(done, ids.length); } catch (e) { /* ignore */ } };
    if (!ids.length) { try { onProgress && onProgress(1, 1); } catch (e) { /* ignore */ } }
    await Promise.all(ids.map(async (id) => {
      const d = sprites[id], url = d._base + d.file;
      const img = await loadImg(url);
      if (img) {
        const frames = d.frames || 1;
        const w = d.w || Math.floor(img.width / frames), h = d.h || img.height;
        A.cache[id] = { img, w, h, frames, fps: d.fps || 0, anchor: d.anchor || [Math.floor(w / 2), Math.floor(h / 2)], url, id };
      } else { A.missing.add(id); A.cache[id] = placeholder(id, d); }
      tick();
    }));
    A.loaded = true;
    return A;
  };
  A.has = (id) => !!(A.cache[id] && !A.cache[id].placeholder);
  // NC.assets.get(id) -> {img,w,h,frames,fps,anchor}. Missing ids get a magenta placeholder (cached).
  A.get = (id) => {
    let s = A.cache[id];
    if (!s) { s = A.cache[id] = placeholder(id, A.manifest.sprites[id]); A.missing.add(id); }
    return s;
  };
  // white silhouette cache (hit flash)
  const whiteCache = {};
  function white(s) {
    if (whiteCache[s.id]) return whiteCache[s.id];
    const c = document.createElement('canvas'); c.width = s.w * s.frames; c.height = s.h;
    const g = c.getContext('2d'); g.drawImage(s.img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
    return whiteCache[s.id] = c;
  }
  // NC.assets.draw(ctx, id, x, y, frame=0, opts={flipX, flipY, alpha, white, topLeft})
  // (x,y) is the anchor point (sprite center by default). Positions are rounded to integers.
  A.draw = (ctx, id, x, y, frame = 0, opts) => {
    const s = A.get(id); const o = opts || {};
    const f = ((frame | 0) % s.frames + s.frames) % s.frames;
    let dx = Math.round(x - (o.topLeft ? 0 : s.anchor[0])), dy = Math.round(y - (o.topLeft ? 0 : s.anchor[1]));
    const src = o.white ? white(s) : s.img;
    const a = o.alpha == null ? 1 : o.alpha;
    if (a <= 0) return;
    const oldA = ctx.globalAlpha; if (a !== 1) ctx.globalAlpha = oldA * a;
    if (o.flipX || o.flipY) {
      ctx.save(); ctx.translate(dx + (o.flipX ? s.w : 0), dy + (o.flipY ? s.h : 0)); ctx.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1);
      ctx.drawImage(src, f * s.w, 0, s.w, s.h, 0, 0, s.w, s.h); ctx.restore();
    } else ctx.drawImage(src, f * s.w, 0, s.w, s.h, dx, dy, s.w, s.h);
    if (a !== 1) ctx.globalAlpha = oldA;
  };
  // frame index for animated sprites given time in seconds
  A.frameAt = (id, t) => { const s = A.get(id); return s.frames > 1 && s.fps > 0 ? Math.floor(t * s.fps) % s.frames : 0; };
  // URL for DOM <img> (file url, or data URL of the placeholder)
  A.url = (id) => { const s = A.get(id); if (s.url) return s.url; try { return s.img.toDataURL(); } catch (e) { return ''; } };
  // canvas element with frame 0 scaled by an integer factor (for UI)
  A.icon = (id, scale = 1, frame = 0) => {
    const s = A.get(id), k = Math.max(1, Math.round(scale));
    const c = document.createElement('canvas'); c.width = s.w * k; c.height = s.h * k;
    c.style.imageRendering = 'pixelated';
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(s.img, (frame % s.frames) * s.w, 0, s.w, s.h, 0, 0, s.w * k, s.h * k);
    return c;
  };
})(window.NC = window.NC || {});
