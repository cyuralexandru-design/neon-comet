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
    // 3.3 (tools/art/w33_art.py)
    card_evo_arc: [56, 48, 1, 0], card_evo_drill: [56, 48, 1, 0], card_evo_shotgun: [56, 48, 1, 0], card_evo_swarmer: [56, 48, 1, 0], card_evo_wave: [56, 48, 1, 0], fx_skill_beam: [16, 16, 3, 15], fx_skill_ring: [64, 64, 6, 14], fx_skill_singularity: [32, 32, 6, 10], fx_skill_strike: [16, 48, 5, 16], proj_arc: [6, 8, 3, 18], proj_arc_evo: [8, 8, 3, 18], proj_arc_hit: [10, 10, 4, 20], proj_drill: [6, 8, 3, 15], proj_drill_evo: [10, 8, 3, 15], proj_drill_hit: [12, 12, 4, 16], proj_shotgun: [3, 3, 2, 12], proj_shotgun_evo: [4, 5, 2, 12], proj_swarmer: [3, 3, 2, 10], proj_swarmer_evo: [4, 4, 2, 10], proj_wave: [16, 6, 2, 8], proj_wave_evo: [22, 8, 2, 8], sec_blade: [24, 24, 1, 0], sec_blade_obj: [16, 16, 4, 16], sec_drone: [24, 24, 1, 0], sec_drone_obj: [16, 16, 2, 8], sec_homing: [24, 24, 1, 0], sec_homing_proj: [16, 16, 2, 12], sec_mine: [16, 16, 4, 4], sec_mines: [24, 24, 1, 0], sec_nova: [24, 24, 1, 0], sec_tesla: [24, 24, 1, 0], ui_tab_secondary: [16, 16, 1, 0], wpn_arc: [24, 24, 1, 0], wpn_drill: [24, 24, 1, 0], wpn_shotgun: [24, 24, 1, 0], wpn_swarmer: [24, 24, 1, 0], wpn_wave: [24, 24, 1, 0],
  };
  const PREFIX = [ // [regex, w, h, frames, fps]
    [/^ship_/, 32, 32, 1, 0], [/^wpn_/, 24, 24, 1, 0], [/^tur_/, 16, 16, 1, 0], [/^icon_/, 24, 24, 1, 0], [/^comp_/, 16, 16, 1, 0],
    [/^gear_/, 24, 24, 1, 0], [/^cons_/, 24, 24, 1, 0], [/^chest_open_/, 48, 48, 6, 10], [/^chest_/, 24, 24, 1, 0],
    [/^boss_.*_anim$/, 112, 112, 3, 6], [/^boss_/, 112, 112, 1, 0], [/^mboss_/, 48, 48, 1, 0], [/^card_/, 56, 48, 1, 0],
    [/^bg_/, 320, 180, 1, 0], [/^ui_alert_/, 16, 16, 1, 0], [/^ui_tab_/, 16, 16, 1, 0], [/^sec_/, 24, 24, 1, 0], [/^btn_ps_/, 12, 12, 1, 0], [/^ui_pip_/, 7, 7, 1, 0], [/^world_/, 32, 32, 1, 0], [/^ci_/, 24, 24, 1, 0], [/^ab_/, 20, 20, 1, 0], [/^crew_/, 40, 34, 2, 3], [/^en_/, 16, 16, 2, 6],
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
    const hdP = loadHdManifest().catch(() => null);
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
    await hdP;
    A.loaded = true;
    return A;
  };
  // ---------------------------------------------------------------- 4.0 HD painted art (assets/hd/manifest.json)
  // manifest = { "<id>": {file, w, h, frames?, fps?} } (also accepts {sprites:{...}}). HD entries replace the pixel sprite of the
  // same id once loaded (lazy, first use; eager for small gameplay ids). HD sprite object: {img, w, h (= image px, for UI),
  // lw, lh (= logical draw size), hd:true}. Missing HD -> old pixel sprite (per id fallback).
  A.hdBase = 'assets/hd/'; A.hdUrl = 'assets/hd/manifest.json'; A.hdMan = {}; A.hdCache = {}; const hdLoading = {};
  A.hd = (id) => (A.hdMan[id] ? A.hdBase + A.hdMan[id].file : null);
  // logical size class (SPEC-40 §2): ships 30, bosses 120, mini 56, enemies by EN size, pickups/ores small
  const LOGI = [[/^ship_/, 30], [/^boss_/, 120], [/^mboss_/, 56], [/^ore_/, 10], [/^pk_crystal$/, 8], [/^pk_xp$/, 8], [/^pk_star$/, 6], [/^pk_/, 14],
    [/^chest_\d/, 18], [/^tur_/, 16], [/^comp_/, 18], [/^eb_big$/, 10], [/^eb_/, 6]];
  A.logical = (id) => {
    const d = declared[id]; if (d) return Math.max(d[0], d[1]);
    for (const [re, n] of LOGI) if (re.test(id)) return n;
    const s = A.cache[id]; if (s && !s.placeholder && !s.hd) return Math.max(s.w, s.h);
    const z = sizeOf(id); return Math.max(z[0], z[1]);
  };
  function loadHd(id) {
    if (hdLoading[id] || !A.hdMan[id] || typeof Image === 'undefined') return hdLoading[id];
    const d = A.hdMan[id];
    return hdLoading[id] = loadImg(A.hdBase + d.file).then((img) => {
      if (!img) { delete A.hdMan[id]; return null; }
      const frames = d.frames || 1, fw = Math.floor((d.w || img.width) / frames) || img.width / frames, fh = d.h || img.height;
      const L = A.logical(id), k = L / Math.max(fw, fh);
      return A.hdCache[id] = { img, w: fw, h: fh, frames, fps: d.fps || 0, lw: fw * k, lh: fh * k, anchor: [fw / 2, fh / 2], url: A.hdBase + d.file, id, hd: true };
    });
  }
  A.preload = (ids) => Promise.all((ids || []).filter(id => A.hdMan[id]).map(loadHd));
  const EAGER = /^(ship_|boss_|en_|mboss_|ore_|pk_|proj_|eb_|fx_|chest_\d|tur_|comp_|sec_\w+_(obj|proj)|sec_mine)/;
  async function loadHdManifest() {
    const m = await fetchJson(A.hdUrl); if (!m || typeof m !== 'object') return;
    const map = m.sprites && typeof m.sprites === 'object' ? m.sprites : m;
    for (const [id, d] of Object.entries(map)) if (d && d.file) A.hdMan[id] = d;
    await Promise.all(Object.keys(A.hdMan).filter(id => EAGER.test(id)).map(loadHd));
  }
  A.has = (id) => !!(A.hdCache[id] || (A.cache[id] && !A.cache[id].placeholder));
  // NC.assets.get(id) -> HD sprite when loaded, else {img,w,h,frames,fps,anchor}. Missing ids get a magenta placeholder (cached).
  A.get = (id) => {
    const h = A.hdCache[id]; if (h) return h;
    if (A.hdMan[id]) loadHd(id);
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
  // scaled HD cache: one offscreen canvas per (id, logical size, device scale, white) -> drawing is ~1:1 (fast on phones)
  const scCache = new Map();
  function scaled(s, lw, lh, wh) {
    const k = (NC.render && NC.render.k) || 1, key = s.id + '|' + Math.round(lw * 4) + '|' + Math.round(lh * 4) + '|' + k.toFixed(3) + (wh ? 'w' : '');
    let c = scCache.get(key); if (c) return c;
    if (scCache.size > 600) scCache.clear();
    c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(lw * k)); c.height = Math.max(1, Math.ceil(lh * k));
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(s.img, 0, 0, s.w, s.h, 0, 0, c.width, c.height);
    if (wh) { g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); }
    scCache.set(key, c); return c;
  }
  A.clearScaled = () => scCache.clear();
  // NC.assets.draw(ctx, id, x, y, frame=0, opts={flipX, flipY, alpha, white, topLeft, scale, rot})
  // (x,y) is the anchor point (sprite centre by default). HD sprites are drawn at their logical size (lw x lh) with smoothing.
  A.draw = (ctx, id, x, y, frame = 0, opts) => {
    const s = A.get(id); const o = opts || {};
    const a = o.alpha == null ? 1 : o.alpha;
    if (a <= 0) return;
    const oldA = ctx.globalAlpha; if (a !== 1) ctx.globalAlpha = oldA * a;
    if (s.hd) {
      const sc = o.scale || 1, lw = s.lw * sc, lh = s.lh * sc, c = s.frames > 1 ? null : scaled(s, lw, lh, o.white);
      ctx.imageSmoothingEnabled = true;
      const f = ((frame | 0) % s.frames + s.frames) % s.frames;
      if (o.rot || o.flipX || o.flipY) {
        ctx.save(); ctx.translate(o.topLeft ? x + lw / 2 : x, o.topLeft ? y + lh / 2 : y); if (o.rot) ctx.rotate(o.rot); ctx.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1);
        if (c) ctx.drawImage(c, -lw / 2, -lh / 2, lw, lh); else ctx.drawImage(s.img, f * s.w, 0, s.w, s.h, -lw / 2, -lh / 2, lw, lh);
        ctx.restore();
      } else {
        const dx = o.topLeft ? x : x - lw / 2, dy = o.topLeft ? y : y - lh / 2;
        if (c) ctx.drawImage(c, dx, dy, lw, lh); else ctx.drawImage(s.img, f * s.w, 0, s.w, s.h, dx, dy, lw, lh);
      }
      if (a !== 1) ctx.globalAlpha = oldA; return;
    }
    ctx.imageSmoothingEnabled = false;
    const f = ((frame | 0) % s.frames + s.frames) % s.frames, sc = o.scale || 1;
    const src = o.white ? white(s) : s.img;
    if (o.rot || o.flipX || o.flipY || sc !== 1) {
      ctx.save(); ctx.translate(x - (o.topLeft ? 0 : s.anchor[0] * sc) + s.w * sc / 2, y - (o.topLeft ? 0 : s.anchor[1] * sc) + s.h * sc / 2);
      if (o.rot) ctx.rotate(o.rot); ctx.scale((o.flipX ? -1 : 1) * sc, (o.flipY ? -1 : 1) * sc);
      ctx.drawImage(src, f * s.w, 0, s.w, s.h, -s.w / 2, -s.h / 2, s.w, s.h); ctx.restore();
    } else ctx.drawImage(src, f * s.w, 0, s.w, s.h, x - (o.topLeft ? 0 : s.anchor[0]), y - (o.topLeft ? 0 : s.anchor[1]), s.w, s.h);
    if (a !== 1) ctx.globalAlpha = oldA;
  };
  // logical draw size of a sprite (HD: lw/lh, pixel: w/h)
  A.size = (id) => { const s = A.get(id); return s.hd ? [s.lw, s.lh] : [s.w, s.h]; };
  // frame index for animated sprites given time in seconds
  A.frameAt = (id, t) => { const s = A.get(id); return s.frames > 1 && s.fps > 0 ? Math.floor(t * s.fps) % s.frames : 0; };
  // URL for DOM <img> (file url, or data URL of the placeholder)
  A.url = (id) => { const s = A.get(id); if (s.url) return s.url; try { return s.img.toDataURL(); } catch (e) { return ''; } };
  // canvas element with frame 0 scaled by an integer factor (for UI)
  A.icon = (id, scale = 1, frame = 0) => {
    const s = A.get(id), k = Math.max(1, Math.round(scale));
    const c = document.createElement('canvas'); c.width = s.w * k; c.height = s.h * k;
    if (!s.hd) c.style.imageRendering = 'pixelated';
    const g = c.getContext('2d'); g.imageSmoothingEnabled = !!s.hd;
    g.drawImage(s.img, (frame % s.frames) * s.w, 0, s.w, s.h, 0, 0, s.w * k, s.h * k);
    return c;
  };
})(window.NC = window.NC || {});
