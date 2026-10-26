'use strict';
// Neon Comet 3.1 - overlays (agent "overlays"): loading screen (>= 5 s, ship on the bar), pause (quick settings + run stats +
// skills), level-up cards (collectible cards tinted by rarity, foil look for special cards), revive, game over + share card,
// chest opening (UI.chestAnim) + multi-chest summary (UI.chestSummary), daily / offline popups, tutorial, engine hooks
// NC.ui.onRunStart/showCards/showRevive/showGameOver/onPause. Styles: css/overlays.css (palette B), texts: js/lang/overlays.js.
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  UI.screens = UI.screens || {};
  const t = (k, v) => NC.t(k, v);
  const $ = id => document.getElementById(id);
  const esc = s => (UI.esc ? UI.esc(s) : String(s == null ? '' : s));
  const clampR = r => Math.max(0, Math.min(4, (r | 0)));
  const num = n => (UI.num ? UI.num(n) : String(Math.floor(n || 0)));
  const fmt = n => (UI.fmt ? UI.fmt(n) : String(Math.floor(n || 0)));
  const img = (id, cls) => (UI.img ? UI.img(id, cls || '') : '');
  const crIco = () => img('ui_crystal', 'ov-cri pix');
  const crystals = () => (UI.crystals ? UI.crystals() : 0);
  const sfx = (n, p) => { try { UI.sfx && UI.sfx(n, p); } catch (e) {} };

  // palette B read from the CSS tokens (canvas drawing); fallbacks = the same palette values
  const FB = { '--bg': '#0b0e14', '--panel': '#121720', '--panel2': '#181f2a', '--line': '#2a3445', '--amber': '#d6a35a', '--cyan': '#73b9c6',
    '--red': '#b0605a', '--ink': '#e2e6ec', '--dim': '#8a94a3', '--r2': '#9a78b8', '--xp': '#e09a3e' };
  const pal = n => { let v = ''; try { v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); } catch (e) {} return /^#[0-9a-f]{6}$/i.test(v) ? v : /^#[0-9a-f]{3}$/i.test(v) ? '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3] : FB[n]; };
  const rgb = c => { const n = parseInt(String(c).slice(1, 7), 16); return isNaN(n) ? [0, 0, 0] : [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, f) => { const x = rgb(a), y = rgb(b); return 'rgb(' + x.map((v, i) => Math.round(v + (y[i] - v) * f)).join(',') + ')'; };
  const rgba = (c, a) => 'rgba(' + rgb(c).join(',') + ',' + a + ')';

  // small inline icons (currentColor), 12x12 viewBox
  const SVG = {
    hp: '<path d="M6 10.6 1.7 6.3A2.6 2.6 0 0 1 6 2.7a2.6 2.6 0 0 1 4.3 3.6z" fill="currentColor"/>',
    atk: '<path d="M3 9 10 2M2.6 6.4l3 3M1.6 10.4l1.2-1.2" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    shd: '<path d="M6 1.3 10 2.8v3.1c0 2.5-1.8 4-4 4.9-2.2-.9-4-2.4-4-4.9V2.8z" fill="currentColor"/>',
    dps: '<path d="M7.2.8 2.4 7h3.4l-1 4.2L9.6 5H6.2z" fill="currentColor"/>',
    crit: '<circle cx="6" cy="6" r="3.4" stroke="currentColor" stroke-width="1.4" fill="none"/><path d="M6 .6v2.6M6 8.8v2.6M.6 6h2.6M8.8 6h2.6" stroke="currentColor" stroke-width="1.4"/>',
    critDmg: '<path d="m6 .8 1.4 3.3 3.5.3-2.7 2.3.9 3.5L6 8.3l-3.1 1.9.9-3.5-2.7-2.3 3.5-.3z" fill="currentColor"/>',
    vamp: '<path d="M6 1.2s3.4 3.9 3.4 6.1a3.4 3.4 0 0 1-6.8 0C2.6 5.1 6 1.2 6 1.2z" fill="currentColor"/>',
    speed: '<path d="M1.8 2.8 5 6 1.8 9.2M6.3 2.8 9.5 6 6.3 9.2" stroke="currentColor" stroke-width="1.6" fill="none"/>',
    lvl: '<path d="m6 1 1.5 3.2 3.5.4-2.6 2.4.7 3.5L6 8.8l-3.1 1.7.7-3.5L1 4.6l3.5-.4z" fill="currentColor"/>',
    time: '<circle cx="6" cy="6" r="4.6" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M6 3.4V6l1.8 1.3" stroke="currentColor" stroke-width="1.3" fill="none"/>',
    music: '<path d="M4.4 2.6 10 1.3v6.5a1.7 1.7 0 1 1-1.1-1.6V3.2L5.5 4v4.8a1.7 1.7 0 1 1-1.1-1.6z" fill="currentColor"/>',
    sfx: '<path d="M1.4 4.3h2.2l3-2.5v8.4l-3-2.5H1.4z" fill="currentColor"/><path d="M8.3 4.2a2.6 2.6 0 0 1 0 3.6M9.8 2.7a4.7 4.7 0 0 1 0 6.6" stroke="currentColor" stroke-width="1.2" fill="none"/>',
    vibe: '<rect x="3.7" y="1.4" width="4.6" height="9.2" rx=".7" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M1.4 4.2v3.6M10.6 4.2v3.6" stroke="currentColor" stroke-width="1.2"/>',
    arrow: '<path d="M4.2 2.4 7.8 6l-3.6 3.6" stroke="currentColor" stroke-width="1.6" fill="none"/>',
    reroll: '<path d="M9.8 4.6A4.2 4.2 0 0 0 2.3 4M2.2 7.4a4.2 4.2 0 0 0 7.5.6" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M10.4 1.6v3.3H7.1zM1.6 10.4V7.1h3.3z" fill="currentColor"/>',
  };
  const ico = (k, cls) => `<svg class="ov-i${cls ? ' ' + cls : ''}" viewBox="0 0 12 12" aria-hidden="true">${SVG[k] || ''}</svg>`;

  // text that follows language changes inside modals (screens are re-rendered by app.js on NC.onLang)
  const tx = (k, v) => `<span data-ovt="${esc(k)}"${v ? ` data-ovv="${esc(JSON.stringify(v))}"` : ''}>${esc(t(k, v))}</span>`;
  const relang = () => document.querySelectorAll('[data-ovt]').forEach(el => { let v; try { v = el.dataset.ovv ? JSON.parse(el.dataset.ovv) : undefined; } catch (e) {} el.textContent = t(el.dataset.ovt, v); });
  if (typeof NC.onLang === 'function') NC.onLang(relang); else UI._ovRelang = relang;

  // gamepad glyph hints (only while a pad is the active device)
  const padOn = () => !!(NC.Input && NC.Input.device === 'pad');
  const glyph = a => {
    try {
      if (!padOn() || typeof NC.Input.glyph !== 'function') return '';
      const g = NC.Input.glyph(a); if (!g) return '';
      if (g.spr) return `<img class="ov-gl pix" src="${esc(UI.spriteUrl ? UI.spriteUrl(g.spr) : '')}" alt="" draggable="false">`;
      if (g.txt) return `<span class="ov-glt">${esc(g.txt)}</span>`;
    } catch (e) {}
    return '';
  };
  const hints = list => { const h = list.map(([a, k]) => { const g = glyph(a); return g ? `<span>${g}${tx(k)}</span>` : ''; }).join(''); return h ? `<div class="ov-hints">${h}</div>` : ''; };

  // hide HUD / touch controls / boss bar / tutorial while pause, cards or revive are open
  const NOHUD = { pause: 1, cards: 1, revive: 1 };
  let hudIv = 0;
  const hudSync = () => {
    const st = $('stage'); if (!st) return;
    const on = (UI.stack || []).some(s => NOHUD[s.name] && document.body.contains(s.el));
    st.classList.toggle('ov-nohud', on);
    if (on && !hudIv) hudIv = setInterval(hudSync, 120);
    if (!on && hudIv) { clearInterval(hudIv); hudIv = 0; }
  };
  UI.ovHudSync = hudSync;

  // =================================================================== reward rendering (kept for other screens)
  // rew = {cr, chest?: rarity, cons?: {id:n}} (systems reward shape)
  UI.rewardHtml = (rew) => {
    if (!rew) return '';
    const out = [];
    if (rew.cr) out.push(`<span class="ov-rwi cr">${crIco()}<b>${fmt(rew.cr)}</b></span>`);
    if (rew.chest != null) out.push(`<span class="ov-rwi" style="--rc:var(--r${clampR(rew.chest)})">${img('chest_' + clampR(rew.chest), 'pix')}</span>`);
    if (rew.cons) for (const k of Object.keys(rew.cons)) out.push(`<span class="ov-rwi">${img('cons_' + k, 'pix')}<b>x${rew.cons[k]}</b></span>`);
    return `<span class="ov-rw">${out.join('')}</span>`;
  };

  // =================================================================== loading screen
  // Logo (ui_logo, unchanged) big and centred; under it a bar on which the equipped ship travels left->right leaving an
  // amber comet trail; drifting stars. Progress animates smoothly to 100% over at least L.minMs (5 s) even if the assets
  // are ready sooner; then the ship flies off the right edge and the loader fades. Tap/key only speeds up that outro.
  const L = UI.loader = UI.loader || {};
  L.minMs = 5000;
  L.run = () => new Promise(resolve => {
    const box = document.createElement('div'); box.id = 'loader'; box.className = 'ov-loader';
    box.innerHTML = '<canvas class="pix"></canvas><div class="ov-ld-txt" hidden><span class="l"></span><span class="p"></span></div>';
    ($('stage') || document.body).appendChild(box);
    const cv = box.querySelector('canvas'), g = cv.getContext('2d');
    const txt = box.querySelector('.ov-ld-txt'), tl = txt.querySelector('.l'), tp = txt.querySelector('.p');
    const C = {};
    const readPal = () => {
      C.bg = pal('--bg'); C.panel = pal('--panel2'); C.line = pal('--line'); C.amber = pal('--amber'); C.ink = pal('--ink'); C.dim = pal('--dim');
      C.star = [mix(C.bg, C.dim, 0.28), mix(C.bg, C.dim, 0.62), mix(C.bg, C.ink, 0.85)];
      C.trail = [mix(C.panel, C.amber, 0.28), mix(C.panel, C.amber, 0.62), C.amber]; C.hi = mix(C.amber, C.ink, 0.55);
    };
    readPal();
    let W = 320, H = 180, K = 1, DPR = 1, lastPos = '';
    const size = () => {
      DPR = window.devicePixelRatio || 1; K = Math.max(1, Math.floor(innerHeight * DPR / 180));
      W = Math.ceil(innerWidth * DPR / K); H = Math.ceil(innerHeight * DPR / K);
      cv.width = W; cv.height = H; cv.style.width = (W * K / DPR) + 'px'; cv.style.height = (H * K / DPR) + 'px';
      g.imageSmoothingEnabled = false; lastPos = '';
    };
    size(); addEventListener('resize', size);
    let shipId = 'vanator'; try { shipId = (UI.S && UI.S().ships.eq) || 'vanator'; } catch (e) {}
    const base = (NC.assets && NC.assets.base) || 'assets/sprites/';
    const ld = src => { const i = new Image(); i.ok = false; i.onload = () => { i.ok = true; }; i.src = base + src; return i; };
    const ship = ld('ship_' + shipId + '.png'), logo = ld('ui_logo.png'), thr = ld('fx_thruster.png');
    const stars = []; let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 140; i++) stars.push({ x: rnd(), y: rnd(), l: i % 3 });
    const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : (1 - Math.cos(Math.PI * x)) / 2);
    const t0 = performance.now();
    let last = t0, real = 0, loaded = false, shown = 0, outro = 0, finishing = false, finished = false, skip = false, lastL = '', lastP = '';
    const draw = now => {
      if (finished) return;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      const el = now - t0, time = el / 1000, x = Math.min(1, el / L.minMs);
      const cap = 0.45 * x + 0.55 * ease(x); // smooth, reaches 1 exactly at minMs
      const goal = Math.min(cap, loaded ? 1 : Math.min(0.96, Math.max(real, Math.min(0.12, time * 0.03))));
      shown += (goal - shown) * Math.min(1, dt * 7);
      if (loaded && x >= 1 && shown > 0.996) shown = 1;
      if (shown >= 1 && !finishing) { finishing = true; finish(); }
      g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      for (const s of stars) { // slow parallax drift to the left
        s.x -= [0.004, 0.009, 0.018][s.l] * dt * (1 + outro * 5); if (s.x < 0) { s.x += 1; s.y = rnd(); }
        g.fillStyle = C.star[s.l]; g.fillRect(Math.round(s.x * W), Math.round(s.y * H), 1, 1);
      }
      const cx = Math.round(W / 2);
      const ls = Math.max(1, Math.floor(W * 0.58 / 200)), lw = 200 * ls, lh = 48 * ls, ly = Math.round(H * 0.42 - lh / 2 - 8);
      if (logo.ok) g.drawImage(logo, Math.round(cx - lw / 2), ly, lw, lh);
      else { g.textBaseline = 'top'; g.textAlign = 'center'; g.font = '700 16px NCPixel, monospace'; g.fillStyle = C.line; g.fillText('NEON COMET', cx + 1, ly + 17); g.fillStyle = C.ink; g.fillText('NEON COMET', cx, ly + 16); }
      // bar: 1px line border, dark track, amber comet trail
      const bw = Math.min(Math.round(lw * 0.9), W - 48), bx = Math.round(cx - bw / 2), by = ly + lh + 24;
      g.fillStyle = C.line; g.fillRect(bx - 1, by - 1, bw + 2, 6);
      g.fillStyle = C.panel; g.fillRect(bx, by, bw, 4);
      const fw = Math.round(bw * Math.min(1, shown));
      for (let i = 0; i < fw; i++) { const f = (fw - i) / Math.max(1, bw); g.fillStyle = f > 0.55 ? C.trail[0] : f > 0.2 ? C.trail[1] : C.trail[2]; g.fillRect(bx + i, by, 1, 4); }
      if (fw > 0) { g.fillStyle = C.hi; g.fillRect(bx, by, fw, 1); }
      // ship on the bar (sprite faces up -> rotated to face right), flies off on the outro
      const sx = Math.round(bx + fw + outro * outro * (W - bx - fw + 48)), sy = Math.round(by + 2 + Math.sin(time * 6));
      for (let i = 0; i < 5; i++) {
        const px = sx - 18 - ((time * 50 + i * 7) % 22) - outro * 24, py = sy + Math.round(Math.sin(time * 9 + i * 2) * 2);
        g.fillStyle = i % 2 ? C.hi : C.amber; g.fillRect(Math.round(px), py, 1, 1);
      }
      g.save(); g.translate(sx, sy); g.rotate(Math.PI / 2);
      const fr = Math.floor(time * 12) % 3;
      if (thr.ok) { const tw = thr.width / 3; g.drawImage(thr, fr * tw, 0, tw, thr.height, -Math.round(tw / 2), 12, tw, thr.height); if (outro) g.drawImage(thr, fr * tw, 0, tw, thr.height, -Math.round(tw / 2), 12 + thr.height - 2, tw, thr.height); }
      else { const fl = [5, 7, 6][fr] + Math.round(outro * 14); g.fillStyle = C.amber; g.fillRect(-2, 12, 4, fl); g.fillStyle = C.hi; g.fillRect(-1, 12, 2, Math.max(2, fl - 2)); }
      if (ship.ok) g.drawImage(ship, -16, -16); else { g.fillStyle = C.dim; g.fillRect(-6, -12, 12, 24); }
      g.restore();
      // DOM text under the bar (readable UI font instead of canvas pixels)
      const pos = (bx * K / DPR).toFixed(1) + '|' + ((by + 10) * K / DPR).toFixed(1) + '|' + (bw * K / DPR).toFixed(1);
      if (pos !== lastPos) { lastPos = pos; const p = pos.split('|'); txt.style.left = p[0] + 'px'; txt.style.top = p[1] + 'px'; txt.style.width = p[2] + 'px'; txt.hidden = false; }
      const lab = shown >= 1 ? t('ov.load.ready') : t('ov.load.text') + '.'.repeat(Math.max(0, Math.floor(time / 0.35) % 4));
      if (lab !== lastL) { lastL = lab; tl.textContent = lab; }
      const pc = Math.floor(shown * 100) + '%'; if (pc !== lastP) { lastP = pc; tp.textContent = pc; }
      requestAnimationFrame(draw);
    };
    const onSkip = () => { if (finishing) skip = true; };
    const finish = () => {
      const start = performance.now(); sfx('dash');
      const step = now => {
        outro = Math.min(1, skip ? 1 : (now - start) / 750);
        if (outro < 1) { requestAnimationFrame(step); return; }
        box.classList.add('out'); resolve();
        setTimeout(() => { finished = true; removeEventListener('resize', size); removeEventListener('keydown', onSkip); box.remove(); }, 400);
      };
      requestAnimationFrame(step);
    };
    box.addEventListener('pointerdown', onSkip); addEventListener('keydown', onSkip);
    let load = Promise.resolve();
    try { if (NC.assets && NC.assets.load) load = Promise.resolve(NC.assets.load((d, n) => { real = typeof n === 'number' && n > 0 ? d / n : (d > 1 ? d / 100 : d); })); } catch (e) { console.error('assets.load', e); }
    const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('600 12px NCUI'), document.fonts.load('8px NCPixel')]).catch(() => {}) : Promise.resolve();
    Promise.all([load.catch(e => console.error('assets.load', e)), fonts]).then(() => {
      try { if (NC.game && NC.game.init) NC.game.init($('c')); } catch (e) { console.error('game.init', e); }
      try { UI.layout && UI.layout(); } catch (e) {}
      readPal(); loaded = true;
    });
    requestAnimationFrame(draw);
  });

  // =================================================================== run flow
  UI.launch = (consumables) => {
    UI.closeAll(); UI.hud && UI.hud.show && UI.hud.show(true);
    try { NC.audio && NC.audio.unlock && NC.audio.unlock(); } catch (e) {}
    const loadout = { consumables: consumables || (NC.sys.runConsumables ? NC.sys.runConsumables() : []) };
    try { NC.game.start(loadout); } catch (e) { console.error('game.start', e); }
  };
  UI.toMenu = () => {
    UI.hud && UI.hud.show && UI.hud.show(false); UI.tutEnd(true); UI.closeAll(); UI.show('menu', {}, true); hudSync();
    try { NC.audio && NC.audio.music && NC.audio.music('menu'); } catch (e) {}
  };
  UI.onRunStart = () => {
    UI.closeAll(); hudSync(); UI.hud && UI.hud.show && UI.hud.show(true);
    const s = UI.S && UI.S(); if (s && !s.tut) UI.tutStart();
  };
  UI.onPause = () => { if (!UI.stack.find(x => x.name === 'pause')) UI.show('pause'); };
  if (!UI.showBossBar) UI.showBossBar = def => { UI.hud && UI.hud.showBoss && UI.hud.showBoss(def); };
  if (!UI.hideBossBar) UI.hideBossBar = () => { UI.hud && UI.hud.hideBoss && UI.hud.hideBoss(); };

  // =================================================================== shared: run stats + card info
  UI.ovRunStats = () => {
    let s = null;
    try { if (NC.game && typeof NC.game.runStats === 'function') s = NC.game.runStats(); } catch (e) { console.error('runStats', e); }
    const h = NC.hud || {}; s = s || {};
    const g = (k, d) => (s[k] != null ? s[k] : h[k] != null ? h[k] : d);
    return { hp: g('hp'), maxHp: g('maxHp'), shd: g('shd'), maxShd: g('maxShd'), atk: g('atk'), dps: g('dps'), crit: g('crit'), critDmg: g('critDmg'),
      vamp: g('vamp'), speed: g('speed'), runLvl: g('runLvl', 1), runXp: g('runXp', 0), runNeed: g('runNeed', 0), time: g('time'), kills: g('kills'),
      score: g('score'), cards: Array.isArray(s.cards) ? s.cards : [] };
  };
  const bad = v => v == null || typeof v !== 'number' || isNaN(v);
  const fNum = v => (bad(v) ? '-' : (Math.abs(v) >= 1e5 ? fmt(v) : num(Math.round(v))));
  const fPct = v => { if (bad(v)) return '-'; const p = v * 100; return (Math.abs(p) >= 10 || Math.abs(p - Math.round(p)) < 0.05 ? Math.round(p) : p.toFixed(1)) + '%'; };
  const fSpeed = v => (bad(v) ? '-' : v <= 5 ? Math.round(v * 100) + '%' : fNum(v));

  // normalise an engine card ({id, lvl, max, r, special, ...}); owned=true -> lvl is the current level (runStats),
  // otherwise it is the level after picking (showCards offers)
  const cardInfo = (c, owned) => {
    const id = String(c.id || ''); const def = ((NC.DATA && NC.DATA.CARDS) || []).find(x => x.id === id) || {};
    const evo = !!(c.evo || def.weapon || def.evo || /^evo_/.test(id));
    const r = clampR(c.r != null ? c.r : def.r != null ? def.r : (evo ? 3 : 0));
    const lvl = Math.max(owned ? 0 : 1, c.lvl | 0);
    const cur = owned ? lvl : lvl - 1, next = owned ? lvl + 1 : lvl;
    const v = def.val != null ? def.val : c.val;
    const vars = v != null ? { v: Math.abs(v) < 1 ? Math.round(v * 100) : v, n: next } : { n: next };
    return { id, r, evo, special: !!(c.special || def.special), max: c.max || def.max || 0, cur, next,
      name: t(c.nameKey || def.nameKey || 'card.' + id + '.name'), desc: t(c.descKey || def.descKey || 'card.' + id + '.desc', vars),
      sprite: c.sprite || def.sprite || 'card_' + id };
  };
  const lvTxt = (n, max) => t('ov.lv', { n }) + (max && max < 90 ? '/' + max : '');
  const cardInfoPopup = c => {
    if (typeof UI.infoCard !== 'function') return;
    try { UI.infoCard({ img: c.sprite, r: c.r, title: c.name, sub: t('rarity.' + c.r) + ' · ' + lvTxt(c.cur, c.max), desc: c.desc }); } catch (e) { console.error('infoCard', e); }
  };

  // =================================================================== pause
  // quick toggles use the same settings keys + path as the settings screen (UI.setSetting -> save + UI.applySettings):
  // music / sfx are volumes (0 = off; the last volume is remembered locally), vibe is a boolean.
  const VOLDEF = { music: 0.55, sfx: 0.8 }, VOLMEM = 'nc.ovVol';
  const volMem = () => { try { return JSON.parse(localStorage.getItem(VOLMEM) || '{}') || {}; } catch (e) { return {}; } };
  const quickOn = k => { const s = UI.settings(); if (k === 'vibe') return s.vibe !== false; const v = s[k] == null ? VOLDEF[k] : +s[k]; return v > 0.001; };
  const quickToggle = k => {
    const s = UI.settings();
    if (k === 'vibe') { const on = !(s.vibe !== false); UI.setSetting('vibe', on); if (on && UI.buzz) UI.buzz(30); return; }
    const m = volMem();
    if (quickOn(k)) { m[k] = s[k] == null ? VOLDEF[k] : +s[k]; try { localStorage.setItem(VOLMEM, JSON.stringify(m)); } catch (e) {} UI.setSetting(k, 0); }
    else UI.setSetting(k, m[k] > 0.001 ? m[k] : VOLDEF[k]);
  };
  const skillIcon = c => `<button class="ov-sk${c.special ? ' sp' : ''}${c.evo ? ' evo' : ''}" style="--rc:var(--r${c.r})" data-f data-a="skill" data-id="${esc(c.id)}" data-k="sk-${esc(c.id)}" title="${esc(c.name)}">
      <span class="im">${img(c.sprite, 'pix')}</span><span class="lv">${c.max && c.cur >= c.max ? esc(t('ov.max')) : esc(t('ov.lv', { n: c.cur }))}</span></button>`;

  UI.screens.pause = {
    cls: 'ov ov-veil ov-pause',
    render(el, st) {
      const R = UI.ovRunStats();
      const cards = R.cards.map(c => cardInfo(c, true)); st.cards = cards;
      const cell = (i, k, v, col) => `<div class="ov-st" style="--sc:var(--${col})">${ico(i)}<span class="k">${esc(t(k))}</span><b class="v">${esc(v)}</b></div>`;
      const xp01 = R.runNeed > 0 ? Math.max(0, Math.min(1, R.runXp / R.runNeed)) : 0;
      const chips = [['time', R.time != null ? UI.time(R.time) : null, 'ov.st.time'], ['lvl', R.score != null ? num(R.score) : null, 'ov.st.score'], ['crit', R.kills != null ? num(R.kills) : null, 'ov.st.kills']]
        .filter(c => c[1] != null).map(([i, v, k]) => `<span class="ov-chip ov-cut">${ico(i)}<i>${esc(t(k))}</i><b>${esc(v)}</b></span>`).join('');
      const tg = (k, i, lab) => { const on = quickOn(k); return `<button class="ov-tg${on ? ' on' : ''}" data-f data-a="tog" data-key="${k}" data-k="tog-${k}" aria-pressed="${on}">${ico(i)}<span class="lb">${esc(t(lab))}</span><span class="ov-sw"><em>${esc(t(on ? 'ov.on' : 'ov.off'))}</em><i></i></span></button>`; };
      el.innerHTML = `<div class="ov-head"><h2 class="ov-title">${esc(t('ov.pause.title'))}</h2><span class="sp"></span>${chips}</div>
        <div class="ov-pz">
          <div class="ov-pz-l">
            <div class="ov-pnl ov-cut"><div class="ov-sh"><b>${esc(t('ov.pause.quick'))}</b></div>
              <div class="ov-tgs">${tg('music', 'music', 'ov.pause.music')}${tg('sfx', 'sfx', 'ov.pause.sounds')}${tg('vibe', 'vibe', 'ov.pause.vibe')}</div></div>
            <div class="ov-btns">
              <button class="btn pri lg ov-bt ov-cut" data-f data-first data-a="resume"><span>${esc(t('ov.pause.resume'))}</span>${glyph('pause')}</button>
              <button class="btn sec ov-bt ov-cut" data-f data-a="settings"><span>${esc(t('ov.pause.settings'))}</span></button>
              <button class="btn back ov-bt ov-cut" data-f data-a="quit"><span>${esc(t('ov.pause.quit'))}</span></button>
            </div>
            ${hints([['ok', 'ov.hint.select'], ['back', 'ov.hint.resume']])}
          </div>
          <div class="ov-pz-r">
            <div class="ov-pnl ov-cut ov-stats"><div class="ov-sh"><b>${esc(t('ov.pause.stats'))}</b></div>
              <div class="ov-sgrid">${cell('hp', 'ov.st.maxHp', fNum(R.maxHp), 'hp')}${cell('atk', 'ov.st.atk', fNum(R.atk), 'amber')}${cell('shd', 'ov.st.shd', fNum(R.maxShd), 'cyan')}${cell('dps', 'ov.st.dps', fNum(R.dps), 'r2')}
                ${cell('crit', 'ov.st.crit', fPct(R.crit), 'r4')}${cell('critDmg', 'ov.st.critDmg', fPct(R.critDmg), 'r4')}${cell('vamp', 'ov.st.vamp', fPct(R.vamp), 'hp')}${cell('speed', 'ov.st.speed', fSpeed(R.speed), 'r0')}</div>
              <div class="ov-lvl">${ico('lvl')}<span class="k">${esc(t('ov.st.lvl'))}</span><b class="v">${esc(t('ov.lv', { n: R.runLvl || 1 }))}</b>
                <span class="ov-xpbar"><i style="width:${(xp01 * 100).toFixed(1)}%"></i></span><span class="x">${num(R.runXp)} / ${num(R.runNeed)} XP</span></div></div>
            <div class="ov-pnl ov-cut ov-skills"><div class="ov-sh"><b>${esc(t('ov.pause.skills'))}</b><i>${cards.length ? '· ' + cards.length : ''}</i></div>
              <div class="ov-sklist">${cards.length ? cards.map(skillIcon).join('') : `<div class="ov-empty">${esc(t('ov.pause.noSkills'))}</div>`}</div></div>
          </div>
        </div>`;
      hudSync();
    },
    act(a, el, s) {
      if (a === 'tog') { quickToggle(el.dataset.key); sfx('click'); UI.rerender(); return; }
      if (a === 'skill') { const c = (s.state.cards || []).find(x => x.id === el.dataset.id); if (c) { sfx('click'); cardInfoPopup(c); } return; }
      sfx('click');
      if (a === 'resume') UI.resume();
      if (a === 'settings') UI.show('settings', { fromPause: true });
      if (a === 'quit') UI.confirm(t('ov.pause.quitConfirm'), () => { try { NC.game.quit(); } catch (e) {} if (!UI.stack.find(x => x.name === 'over')) UI.toMenu(); }, { danger: true });
    },
    back() { UI.resume(); },
  };

  // =================================================================== level-up cards
  // offers: [{id, lvl (level after picking, 1 = new), max, r, special?, nameKey?, descKey?, sprite?}] ; rerollCost: 0 = free
  UI.showCards = (cards, rerollCost) => {
    UI.show('cards', { cards: cards || [], cost: rerollCost || 0 });
    if (UI.tutOpen && UI.tutOpen() && UI._tutStepId() !== 'card') UI.tutGoto('card');
  };
  const cardHtml = (c, i, n) => {
    const tag = c.special ? 'ov.cards.special' : c.evo ? 'ov.cards.evo' : c.cur <= 0 ? 'ov.cards.new' : '';
    const pips = c.max > 1 && c.max <= 10 ? `<div class="ov-pips">${Array.from({ length: c.max }, (_, j) => `<i class="${j < c.cur ? 'f' : j < c.next ? 'n' : ''}"></i>`).join('')}</div>` : '';
    const orn = c.special ? '<i class="ov-orn a"></i><i class="ov-orn b"></i><i class="ov-orn c"></i><i class="ov-orn d"></i>' : '';
    return `<div class="ov-cw${c.special ? ' sp' : ''}${c.evo ? ' evo' : ''}" style="--rc:var(--r${c.r});animation-delay:${i * 70}ms" data-f ${i === Math.floor((n - 1) / 2) ? 'data-first' : ''} data-a="pick" data-id="${esc(c.id)}">
      <div class="ov-card"><div class="ov-cin">
        <div class="ov-ctop"><span class="rn">${esc(t('rarity.' + c.r))}</span>${tag ? `<span class="tg">${esc(t(tag))}</span>` : ''}</div>
        <div class="ov-art">${img(c.sprite, 'pix')}</div>
        <div class="ov-cnm${c.name.length > 13 ? ' long' : ''}">${esc(c.name)}</div>
        <div class="ov-cds">${esc(c.desc)}</div>
        <div class="ov-clv"><span class="k">${esc(t('ov.cards.lvl'))}</span><span class="v">${c.cur > 0 ? `<span class="cur">${c.cur}</span>${ico('arrow')}` : ''}<b>${c.next}</b>${c.max && c.max < 90 ? `<small>/${c.max}</small>` : ''}</span></div>
        ${pips}
      </div></div>${orn}</div>`;
  };
  UI.screens.cards = {
    cls: 'ov ov-veil ov-cardsx',
    render(el, st) {
      const lvl = NC.hud && NC.hud.runLvl;
      const tut = UI.tutOpen && UI.tutOpen() ? `<div class="ov-tuth">${esc(t('tut.card'))}</div>` : '';
      const cs = st.cards.map(c => cardInfo(c, false)), cost = st.cost;
      el.innerHTML = `<div class="ov-ch"><h2 class="ov-title">${esc(t('ov.cards.title'))}</h2><span class="ov-sub">${esc(t('ov.cards.sub'))}</span>${lvl ? `<span class="ov-chip ov-cut">${ico('lvl')}<b>${esc(t('ov.cards.runLvl', { n: lvl }))}</b></span>` : ''}</div>${tut}
        <div class="ov-cards">${cs.map((c, i) => cardHtml(c, i, cs.length)).join('')}</div>
        <div class="ov-cf"><button class="btn ${cost ? 'mut' : 'sec'} ov-rr ov-cut${cost && crystals() < cost ? ' ov-poor' : ''}" data-f data-a="reroll">${ico('reroll')}<span>${esc(t('ov.cards.reroll'))}</span><span class="ov-cost">${cost ? crIco() + '<b>' + fmt(cost) + '</b>' : esc(t('ov.cards.free'))}</span></button>
          <span class="ov-pill ov-cut">${crIco()}<b>${fmt(crystals())}</b></span>${hints([['ok', 'ov.hint.select']])}</div>`;
      hudSync();
    },
    act(a, el, s) {
      if (a === 'pick') {
        if (s.state.picked) return; s.state.picked = true;
        el.classList.add('picked'); const row = el.closest('.ov-cards'); if (row) row.classList.add('done'); sfx('card');
        const id = el.dataset.id;
        setTimeout(() => { UI.close('cards'); hudSync(); try { NC.game.pickCard(id); } catch (e) { console.error(e); } if (UI.tutOpen && UI.tutOpen() && UI._tutStepId() === 'card') UI.tutNext(); }, 320);
      }
      if (a === 'reroll') { sfx('reroll'); try { const r = NC.game.rerollCards(); if (r === false) { UI.toast(t('toast.noCrystals'), 'bad'); sfx('error'); } } catch (e) { console.error(e); } }
    },
    back() { /* a card must be picked */ },
  };

  // =================================================================== revive
  UI.showRevive = (cost, left) => UI.show('revive', { cost, left, t0: performance.now(), dur: 9000 });
  const RING = 2 * Math.PI * 26;
  UI.screens.revive = {
    cls: 'ov ov-veil ov-revive',
    render(el, st, s) {
      const { cost, left } = st, can = cost != null && (left == null || left > 0), poor = can && cost > 0 && crystals() < cost;
      el.innerHTML = `<div class="ov-pnl ov-cut ov-rv pop-in">
        <div class="ov-rv-h"><h2>${esc(t('ov.rev.title'))}</h2><span>${esc(t(can ? 'ov.rev.sub' : 'ov.rev.none'))}</span></div>
        <div class="ov-ring"><svg viewBox="0 0 60 60"><circle class="bg" cx="30" cy="30" r="26"/><circle class="fg" cx="30" cy="30" r="26" stroke-dasharray="${RING.toFixed(2)}" stroke-dashoffset="0"/></svg><b>9</b></div>
        ${can ? `<button class="btn pri lg ov-bt ov-cut${poor ? ' ov-poor' : ''}" data-f data-first data-a="revive"><span>${esc(t('ov.rev.btn'))}</span><span class="ov-cost">${cost ? crIco() + '<b>' + fmt(cost) + '</b>' : esc(t('ov.rev.free'))}</span></button>` : ''}
        <div class="ov-rv-i"><span>${left != null ? esc(t('ov.rev.left', { n: left })) : ''}</span><span class="ov-pill ov-cut">${crIco()}<b>${fmt(crystals())}</b></span></div>
        <button class="btn back ov-bt ov-cut" data-f ${can ? '' : 'data-first'} data-a="giveup"><span>${esc(t('ov.rev.giveUp'))}</span></button></div>`;
      hudSync();
      clearInterval(s.timer);
      const tick = () => {
        if (!document.body.contains(el)) return clearInterval(s.timer);
        const p = Math.max(0, 1 - (performance.now() - st.t0) / st.dur), fg = el.querySelector('.ov-ring .fg'), sec = el.querySelector('.ov-ring b'), ring = el.querySelector('.ov-ring');
        if (fg) fg.setAttribute('stroke-dashoffset', (RING * (1 - p)).toFixed(2));
        if (sec) sec.textContent = Math.ceil(p * st.dur / 1000);
        if (ring) ring.classList.toggle('low', p < 0.34);
        if (p <= 0) { clearInterval(s.timer); UI.screens.revive.act('giveup', null, s); }
      };
      s.timer = setInterval(tick, 100); tick();
    },
    act(a, el, s) {
      if (a === 'revive') {
        if (s.state.cost && crystals() < s.state.cost) { UI.toast(t('toast.noCrystals'), 'bad'); sfx('error'); return; }
        clearInterval(s.timer); UI.close('revive'); hudSync(); sfx('revive'); try { NC.game.revive(); } catch (e) { console.error(e); }
      }
      if (a === 'giveup') { clearInterval(s.timer); if (!UI.stack.find(x => x === s)) return; UI.close('revive'); hudSync(); try { NC.game.giveUp(); } catch (e) { console.error(e); } }
    },
    back() { /* explicit choice required */ },
  };

  // =================================================================== game over
  UI.showGameOver = summary => { UI.hud && UI.hud.show && UI.hud.show(false); UI.tutEnd(true); UI.closeAll(); UI.show('over', { s: summary || {} }); hudSync(); sfx('gameover'); };
  UI.shipRarity = id => { try { const d = NC.sys.def('ship', id); return d ? d.r : 0; } catch (e) { return 0; } };
  UI.screens.over = {
    cls: 'ov dim ov-solid ov-over',
    render(el, st) {
      const s = st.s, chests = s.chests || [];
      const rows = [['ov.over.kills', num(s.kills), 'r4'], ['ov.over.sector', (s.sector || 0) + 1, 'cyan'], ['ov.over.bosses', s.bosses || 0, 'red'], ['ov.over.combo', 'x' + (s.combo || 0), 'amber'],
        ['ov.over.time', UI.time(s.time), 'dim'], ['ov.over.xp', '+' + fmt(s.xp || 0), 'xp'], ['ov.over.revives', s.revives || 0, 'r0']];
      el.innerHTML = `<div class="ov-head"><h2 class="ov-title">${esc(t('ov.over.title'))}</h2><span class="sp"></span><span class="ov-pill ov-cut">${crIco()}<b>${fmt(crystals())}</b></span></div>
        <div class="ov-ov">
          <div class="ov-pnl ov-cut ov-ov-l" style="--rc:var(--r${clampR(UI.shipRarity(s.shipId))})">
            <div class="ov-shipbox"><span class="ring"></span>${img('ship_' + (s.shipId || 'vanator'), 'ov-ship pix')}</div>
            <div class="ov-score"><span class="k">${esc(t('ov.over.score'))}</span><b>${num(s.score)}</b>
              ${s.isBest ? `<span class="ov-best">${ico('lvl')}${esc(t('ov.over.newBest'))}</span>` : `<span class="ov-rec">${esc(t('ov.over.best'))} <b>${num(s.best)}</b></span>`}</div>
            <div class="ov-earn"><span class="k">${esc(t('ov.over.earned'))}</span><span class="v">${crIco()}<b>+${fmt(s.crystals || 0)}</b></span></div>
            ${s.lvlAfter > s.lvlBefore ? `<div class="ov-earn lv"><span class="k">${esc(t('ov.over.pilot'))}</span><span class="v"><span class="cur">${s.lvlBefore}</span>${ico('arrow')}<b>${s.lvlAfter}</b></span></div>` : ''}
          </div>
          <div class="ov-pnl ov-cut ov-ov-r"><div class="ov-sh"><b>${esc(t('ov.over.details'))}</b></div>
            <div class="ov-kv">${rows.map(([k, v, c]) => `<div style="--sc:var(--${c})"><span class="k">${esc(t(k))}</span><b class="v">${esc(v)}</b></div>`).join('')}</div>
            ${chests.length ? `<div class="ov-chrow"><span class="k">${esc(t('ov.over.chests'))}</span><span class="v">${chests.slice(0, 8).map(r => `<span class="ov-chi">${img('chest_' + clampR(r), 'pix')}</span>`).join('')}${chests.length > 8 ? `<b>+${chests.length - 8}</b>` : ''}</span></div>` : ''}
          </div>
        </div>
        <div class="ov-acts">${hints([['ok', 'ov.hint.select'], ['back', 'ov.over.menu']])}<span class="sp"></span>
          <button class="btn mut ov-cut" data-f data-a="menu">${esc(t('ov.over.menu'))}</button><button class="btn mut ov-cut" data-f data-a="hangar">${esc(t('ov.over.hangar'))}</button>
          <button class="btn sec ov-cut" data-f data-a="share">${esc(t('ov.over.share'))}</button><button class="btn pri lg ov-cut" data-f data-first data-a="again">${esc(t('ov.over.again'))}</button></div>`;
    },
    act(a, el, s) {
      sfx('click');
      if (a === 'again') UI.launch();
      if (a === 'hangar') { UI.toMenu(); UI.show('hangar'); }
      if (a === 'menu') UI.toMenu();
      if (a === 'share') UI.share(s.state.s);
    },
    back() { UI.toMenu(); },
  };

  // share card 1200x630: palette B, ship sprite x8 (pixelated), logo, score, sector / bosses / time tiles, link
  UI.shareCanvas = (s) => {
    const W = 1200, H = 630, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const P = {}; ['--bg', '--panel', '--panel2', '--line', '--amber', '--cyan', '--ink', '--dim', '--r2'].forEach(k => { P[k.slice(2)] = pal(k); });
    const F = (w, px) => `${w} ${px}px NCUI, system-ui, sans-serif`;
    const ls = v => { try { g.letterSpacing = v; } catch (e) {} };
    const ch = (x, y, w, h, c) => { g.beginPath(); g.moveTo(x + c, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h - c); g.lineTo(x + w - c, y + h); g.lineTo(x, y + h); g.lineTo(x, y + c); g.closePath(); };
    const glow = (x, y, r, c, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(c, a)); gr.addColorStop(1, rgba(c, 0)); g.fillStyle = gr; g.fillRect(0, 0, W, H); };
    g.fillStyle = P.bg; g.fillRect(0, 0, W, H);
    glow(300, 320, 430, P.cyan, 0.10); glow(1060, 60, 480, P.amber, 0.08);
    let seed = 5; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 150; i++) { g.fillStyle = rgba(P.ink, (0.12 + r() * 0.4).toFixed(2)); const z = r() < 0.85 ? 2 : 3; g.fillRect((r() * W) | 0, (r() * H) | 0, z, z); }
    ch(24, 24, W - 48, H - 48, 28); g.lineWidth = 3; g.strokeStyle = P.line; g.stroke();
    // ship + holo ring
    g.save(); g.lineWidth = 3; g.strokeStyle = rgba(P.cyan, 0.4); g.beginPath(); g.ellipse(300, 468, 190, 36, 0, 0, Math.PI * 2); g.stroke();
    g.setLineDash([10, 10]); g.strokeStyle = rgba(P.cyan, 0.22); g.beginPath(); g.ellipse(300, 470, 128, 22, 0, 0, Math.PI * 2); g.stroke(); g.restore();
    try { if (NC.assets.has && NC.assets.has('fx_thruster')) { const th = NC.assets.get('fx_thruster'); g.drawImage(th.img, th.w, 0, th.w, th.h, 300 - th.w * 4, 300 + 96, th.w * 8, th.h * 8); } } catch (e) {}
    try { const sh = NC.assets.get('ship_' + (s.shipId || 'vanator')); g.drawImage(sh.img, 0, 0, sh.w, sh.h, 300 - sh.w * 4, 300 - sh.h * 4, sh.w * 8, sh.h * 8); } catch (e) {}
    // logo + score
    let logoOk = false;
    try { if (NC.assets.has && NC.assets.has('ui_logo')) { const lg = NC.assets.get('ui_logo'); g.drawImage(lg.img, 0, 0, lg.w, lg.h, 600, 64, lg.w * 2, lg.h * 2); logoOk = true; } } catch (e) {}
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    if (!logoOk) { ls('8px'); g.font = F(800, 64); g.fillStyle = P.ink; g.fillText('NEON COMET', 600, 140); }
    ls('6px'); g.font = F(700, 26); g.fillStyle = P.dim; g.fillText(t('ov.over.score').toUpperCase(), 602, 236);
    ls('0px'); g.font = F(800, 104); g.fillStyle = P.ink; g.fillText(num(s.score), 596, 336);
    if (s.isBest) {
      ls('3px'); g.font = F(800, 24); const bt = t('ov.over.newBest').toUpperCase(), bw = g.measureText(bt).width + 44;
      ch(600, 358, bw, 44, 10); g.fillStyle = P.amber; g.fill(); g.fillStyle = P.bg; g.fillText(bt, 622, 389);
    }
    const tiles = [[t('ov.share.sector'), String((s.sector || 0) + 1), P.amber], [t('ov.share.bosses'), String(s.bosses || 0), P.cyan], [t('ov.st.time'), UI.time(s.time), P.r2]];
    tiles.forEach(([lab, val, col], i) => {
      const x = 600 + i * 192, y = 426; ch(x, y, 180, 88, 12); g.fillStyle = P.panel; g.fill(); g.fillStyle = col; g.fillRect(x, y + 12, 5, 76);
      ls('2px'); g.font = F(600, 20); g.fillStyle = P.dim; g.fillText(lab.toUpperCase(), x + 20, y + 32);
      ls('0px'); g.font = F(800, 36); g.fillStyle = P.ink; g.fillText(val, x + 20, y + 74);
    });
    ls('2px'); g.font = F(700, 24); g.fillStyle = P.cyan; g.fillText('neon-comet.pages.dev', 602, 572); ls('0px');
    g.fillStyle = P.amber; g.fillRect(48, H - 52, 120, 4);
    return cv;
  };
  UI.share = async (s) => {
    try { if (document.fonts && document.fonts.load) await Promise.race([Promise.all([document.fonts.load('800 40px NCUI'), document.fonts.load('600 20px NCUI')]), new Promise(r => setTimeout(r, 800))]); } catch (e) {}
    const cv = UI.shareCanvas(s || {});
    const text = t('ov.over.shareText', { s: num(s && s.score) });
    cv.toBlob(async blob => {
      if (!blob) return;
      try {
        const file = new File([blob], 'neon-comet.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text, title: 'Neon Comet', url: 'https://neon-comet.pages.dev/' }); return; }
      } catch (e) { if (e && e.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'neon-comet-' + Math.floor((s && s.score) || 0) + '.png';
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      UI.toast(t('ov.over.saved'));
    }, 'image/png');
  };

  // =================================================================== chests: single opening + multi summary
  // openChest result: {ok, rarity, items:[{id,slot,r,lvl,nameKey,set}], crystals, cons:{id:n}, pity}
  const chestStage = (r, title) => `<div class="ov-chs pop-in" style="--rc:var(--r${r})"><div class="ov-rays"></div>
      <div class="ov-chs-t">${title}</div><div class="ov-chest shake" data-f data-first data-a="open"></div><div class="ov-chs-tap">${tx('ov.chest.tap')}</div></div>`;
  function chestPlay(m, r, onOpened) {
    const big = m.querySelector('.ov-chest');
    const has = !!(NC.assets && NC.assets.has && NC.assets.has('chest_open_' + r));
    const frame = f => { try { const c = has ? NC.assets.icon('chest_open_' + r, 2, f) : NC.assets.icon('chest_' + r, 4); c.className = 'pix'; big.replaceChildren(c); } catch (e) { big.innerHTML = img('chest_' + r, 'pix'); } };
    frame(0);
    let opened = false;
    return () => {
      if (opened) return; opened = true; big.classList.remove('shake');
      const tap = m.querySelector('.ov-chs-tap'); if (tap) tap.style.visibility = 'hidden';
      sfx('chest_open'); UI.buzz && UI.buzz(30);
      let f = 0; const iv = setInterval(() => {
        f++; if (has) frame(Math.min(5, f));
        if (f >= 6) {
          clearInterval(iv);
          const fl = document.createElement('div'); fl.className = 'ov-flash'; fl.style.setProperty('--rc', 'var(--r' + r + ')'); ($('stage') || document.body).appendChild(fl); setTimeout(() => fl.remove(), 380);
          const st = m.querySelector('.ov-chs'); if (st) st.classList.add('opened');
          onOpened();
        }
      }, 90);
    };
  }
  const gearTile = (it, i, cap) => `<div class="ov-gt${cap ? ' cap' : ''}" style="animation-delay:${Math.min(i, 24) * 45}ms" data-f data-a="item" data-i="${i}" data-k="gt-${i}">
      <div class="ov-gf">${UI.frame(clampR(it.r), img('gear_' + it.slot + '_' + clampR(it.r), 'ico24'), Object.assign({ lvl: it.lvl || 1 }, it.set ? { set: it.set } : {}))}</div>
      ${cap ? `<span class="nm" style="color:var(--r${clampR(it.r)})">${tx(it.nameKey || 'slot.' + it.slot)}</span>` : ''}</div>`;
  const crTile = n => `<div class="ov-xt cr">${img('ui_crystal', 'pix')}<b>+${fmt(n)}</b><span>${tx('ov.sum.crystals')}</span></div>`;
  const consTile = (k, n) => `<div class="ov-xt">${img('cons_' + k, 'pix')}<b>x${n}</b><span>${tx('cons.' + k + '.name')}</span></div>`;
  const itemPopup = it => {
    if (!it || typeof UI.infoCard !== 'function') return;
    const r = clampR(it.r);
    try { UI.infoCard({ img: 'gear_' + it.slot + '_' + r, r, title: t(it.nameKey || 'slot.' + it.slot), sub: t('rarity.' + r) + ' · ' + t('slot.' + it.slot) + ' · ' + t('ov.lv', { n: it.lvl || 1 }) }); } catch (e) { console.error('infoCard', e); }
  };

  UI.chestAnim = (r, res, onAgain) => {
    r = clampR(r); res = res || {};
    const items = res.items || [];
    let done = false;
    const m = UI.modal(`<div class="ov-chbox">${chestStage(r, tx('chest.' + r + '.name'))}<div class="ov-rew" hidden></div><div class="ov-chacts" hidden></div></div>`, {
      dismiss: false, back: () => { if (done) UI.closeModal(m); },
      on: (a, el) => {
        if (a === 'open') open();
        if (a === 'close' && done) UI.closeModal(m);
        if (a === 'again' && done) { UI.closeModal(m, true); onAgain && onAgain(); }
        if (a === 'item') itemPopup(items[+el.dataset.i]);
      } });
    m.classList.add('ov-mod');
    const open = chestPlay(m, r, () => {
      done = true;
      if (Math.max(r, ...items.map(i => i.r | 0)) >= 3) sfx('legendary');
      const rew = m.querySelector('.ov-rew'); rew.hidden = false;
      rew.innerHTML = items.map((it, i) => gearTile(it, i, true)).join('') + (res.crystals ? crTile(res.crystals) : '') + Object.keys(res.cons || {}).map(k => consTile(k, res.cons[k])).join('');
      const acts = m.querySelector('.ov-chacts'); acts.hidden = false;
      acts.innerHTML = (onAgain ? `<button class="btn sec ov-cut" data-f data-a="again">${tx('ov.chest.again')}</button>` : '') + `<button class="btn pri ov-cut" data-f data-first data-a="close">${tx('ov.chest.ok')}</button>`;
      if (res.pity) UI.toast(t('ov.chest.pity'), 'warm');
      UI.refocus(true);
    });
    return m;
  };

  // many chests opened at once (hangar "open all"): one animation, then ONE grouped summary
  UI.chestSummary = (r, list) => {
    const res = (Array.isArray(list) ? list : [list]).filter(x => x && x.ok !== false);
    if (!res.length) return null;
    r = clampR(r != null ? r : res[0].rarity);
    const items = [], cons = {}; let cr = 0, pity = false;
    for (const x of res) {
      (x.items || []).forEach(it => items.push(it)); cr += x.crystals || 0; if (x.pity) pity = true;
      for (const k of Object.keys(x.cons || {})) cons[k] = (cons[k] || 0) + x.cons[k];
    }
    items.sort((a, b) => (b.r | 0) - (a.r | 0) || String(a.slot).localeCompare(String(b.slot)) || (b.lvl || 1) - (a.lvl || 1));
    const n = res.length;
    let done = false;
    const m = UI.modal(`<div class="ov-chbox">${chestStage(r, `<b class="ov-cnt">${n}x</b> ${tx('chest.' + r + '.name')}`)}</div>`, {
      dismiss: false, back: () => { if (done) UI.closeModal(m); },
      on: (a, el) => {
        if (a === 'open') open();
        if (a === 'close' && done) UI.closeModal(m);
        if (a === 'item') { sfx('click'); itemPopup(items[+el.dataset.i]); }
      } });
    m.classList.add('ov-mod');
    const summary = () => {
      const groups = [4, 3, 2, 1, 0].map(q => [q, items.filter(it => clampR(it.r) === q)]).filter(x => x[1].length);
      const ck = Object.keys(cons), cTot = ck.reduce((a, k) => a + cons[k], 0);
      return `<div class="ov-sum ov-pnl ov-cut pop-in" style="--rc:var(--r${r})">
        <div class="ov-sum-h"><span class="ov-sum-ic">${img('chest_' + r, 'pix')}</span>
          <div class="tt"><b>${tx('ov.sum.title', { n })}</b><small>${tx('chest.' + r + '.name')} · ${tx('ov.sum.items', { n: items.length })}</small></div><span class="sp"></span>
          <span class="ov-rcs">${groups.map(([q, a]) => `<span class="ov-rc" style="--rc:var(--r${q})"><i></i>${a.length}</span>`).join('')}</span></div>
        <div class="ov-sum-b">
          ${pity ? `<div class="ov-note">${ico('lvl')}${tx('ov.chest.pity')}</div>` : ''}
          ${groups.map(([q, a]) => `<div class="ov-grp" style="--rc:var(--r${q})"><div class="ov-sh"><b>${tx('rarity.' + q)}</b><i>· ${a.length}</i></div>
            <div class="ov-ggrid">${a.map(it => gearTile(it, items.indexOf(it), false)).join('')}</div></div>`).join('')}
          <div class="ov-extra">
            ${cr ? `<div class="ov-exg"><div class="ov-sh"><b>${tx('ov.sum.crystals')}</b></div><div class="ov-xrow">${crTile(cr)}</div></div>` : ''}
            ${ck.length ? `<div class="ov-exg"><div class="ov-sh"><b>${tx('ov.sum.cons')}</b><i>· ${cTot}</i></div><div class="ov-xrow">${ck.map(k => consTile(k, cons[k])).join('')}</div></div>` : ''}
          </div>
        </div>
        <div class="ov-sum-f">${hints([['ok', 'ov.hint.select'], ['back', 'ov.hint.back']])}<span class="sp"></span><button class="btn pri lg ov-cut" data-f data-first data-a="close">${tx('ov.sum.close')}</button></div></div>`;
    };
    const open = chestPlay(m, r, () => {
      if (items.some(i => (i.r | 0) >= 3)) sfx('legendary');
      setTimeout(() => {
        if (!document.body.contains(m)) return;
        m.innerHTML = summary(); done = true;
        if (pity) UI.toast(t('ov.chest.pity'), 'warm');
        UI.refocus(true);
      }, 420);
    });
    return m;
  };

  // =================================================================== daily reward / offline
  UI.dailyPopup = (next) => {
    let st = null; try { st = NC.sys.dailyStatus(); } catch (e) {}
    if (!st || !st.available) { next && next(); return; }
    const m = UI.modal(`<div class="ov-pnl ov-cut ov-pop pop-in"><div class="ov-pop-h"><b>${tx('daily.title')}</b><span>${tx('daily.streak', { n: st.streak })}</span></div>
      <div class="ov-days">${st.rewards.map((rw, i) => `<div class="ov-day${i < st.day ? ' got' : ''}${i === st.day ? ' now' : ''}"><span>${tx('daily.day', { n: i + 1 })}</span>${rw.chest != null ? img('chest_' + rw.chest, 'pix') : rw.cons ? img('cons_' + Object.keys(rw.cons)[0], 'pix') : img('ui_crystal', 'pix')}<b>${fmt(rw.cr || 0)}</b></div>`).join('')}</div>
      <div class="ov-pop-f">${UI.rewardHtml(st.reward)}<button class="btn pri lg ov-cut" data-f data-first data-a="claim">${tx('daily.claim')}</button></div></div>`,
    { dismiss: false, back: () => {}, on: a => {
      if (a !== 'claim') return;
      const r = NC.sys.claimDaily();
      if (UI.err(r)) { sfx('buy'); UI.toast(t('toast.claimed', { n: fmt(r.reward.cr || 0) }), 'warm'); }
      UI.closeModal(m, true); UI.rerender(); next && next();
    } });
    m.classList.add('ov-mod');
  };
  UI.offlinePopup = (next) => {
    let o = null; try { o = NC.sys.offlineRewards(); } catch (e) {}
    if (!o || !(o.crystals > 0)) { next && next(); return; }
    const m = UI.modal(`<div class="ov-pnl ov-cut ov-pop sm pop-in"><div class="ov-pop-h"><b>${tx('offline.title')}</b></div>
      <div class="ov-msg">${esc(t('offline.text', { t: UI.time(o.minutes * 60) }))}${o.capped ? ' (' + esc(t('offline.cap')) + ')' : ''}</div>
      <div class="ov-pop-f"><span class="ov-rwi cr big">${crIco()}<b>+${fmt(o.crystals)}</b></span><button class="btn pri lg ov-cut" data-f data-first data-a="claim">${tx('offline.claim')}</button></div></div>`,
    { dismiss: false, back: () => {}, on: a => {
      if (a !== 'claim') return;
      const r = NC.sys.claimOffline(1); if (UI.err(r)) { sfx('buy'); UI.toast(t('toast.claimed', { n: fmt(r.crystals) }), 'warm'); }
      UI.closeModal(m, true); UI.rerender(); next && next();
    } });
    m.classList.add('ov-mod');
  };

  // =================================================================== tutorial (first run, skippable)
  // Steps advance on the detected action or "Got it". Runs on top of gameplay (game is not paused).
  const TUT = [
    { id: 'move', key: d => d === 'touch' ? 'tut.moveTouch' : d === 'pad' ? 'tut.movePad' : 'tut.move', check: () => NC.Input && Math.hypot(NC.Input.move.x, NC.Input.move.y) > 0.3 },
    { id: 'fire', key: () => 'tut.fire', auto: 4500 },
    { id: 'dash', key: d => d === 'touch' ? 'tut.dashTouch' : d === 'pad' ? 'tut.dashPad' : 'tut.dash', check: () => NC.hud && NC.hud.dashCd01 > 0.05 },
    { id: 'cons', key: d => d === 'touch' ? 'tut.consTouch' : d === 'pad' ? 'tut.consPad' : 'tut.cons', skipIf: () => !(NC.hud && NC.hud.consumables && NC.hud.consumables.length), check: () => { const c = NC.hud && NC.hud.consumables; return c && c.some(x => x.cd01 > 0.05); } },
    { id: 'card', key: () => 'tut.card', wait: true },
  ];
  let tutI = -1, tutTimer = null, tutHeld = 0;
  UI.tutOpen = () => tutI >= 0;
  UI._tutStepId = () => (TUT[tutI] || {}).id;
  UI.tutStart = () => { tutI = -1; UI.tutNext(); };
  UI.tutGoto = id => { const i = TUT.findIndex(s => s.id === id); if (i >= 0) { tutI = i - 1; UI.tutNext(); } };
  UI.tutNext = () => {
    tutI++;
    while (TUT[tutI] && TUT[tutI].skipIf && TUT[tutI].skipIf()) tutI++;
    if (tutI >= TUT.length) { UI.tutEnd(); return; }
    renderTut();
  };
  function renderTut() {
    let box = $('tut'); if (!box) { box = document.createElement('div'); box.id = 'tut'; $('stage').appendChild(box); }
    box.className = 'ov-tut';
    const st = TUT[tutI], dev = UI.isTouch && UI.isTouch() ? 'touch' : padOn() ? 'pad' : 'kb';
    box.hidden = false;
    box.innerHTML = `<div class="ov-pnl ov-cut pop-in"><div class="ov-tut-h"><span>${tx('tut.title')}</span><span class="d">${tx('tut.step', { a: tutI + 1, b: TUT.length })}</span></div>
      <div class="ov-tut-t">${tx(st.key(dev))}</div>
      <div class="ov-tut-f"><button class="btn sm mut ov-cut" data-a="skip">${tx('tut.skip')}</button>${st.wait ? '' : `<button class="btn sm pri ov-cut" data-a="next">${tx('tut.next')}</button>`}</div></div>`;
    box.onclick = e => { const a = e.target.closest('[data-a]'); if (!a) return; sfx('click'); if (a.dataset.a === 'skip') UI.tutEnd(); else UI.tutNext(); };
    clearInterval(tutTimer); tutHeld = 0; const t0 = performance.now();
    tutTimer = setInterval(() => {
      if (NC.game && NC.game.mode && NC.game.mode !== 'play') return;
      if (st.auto && performance.now() - t0 > st.auto) { UI.tutNext(); return; }
      if (st.check && st.check()) { tutHeld += 100; if (tutHeld >= 500) setTimeout(() => { if (TUT[tutI] === st) UI.tutNext(); }, 400); }
    }, 100);
  }
  UI.tutEnd = (silent) => {
    clearInterval(tutTimer); const was = tutI >= 0; tutI = -1;
    const box = $('tut'); if (box) box.remove();
    if (!was || silent === true) return;
    try { const s = UI.S(); s.tut = true; NC.sys.save(); } catch (e) {}
    UI.toast(t('tut.done'));
  };
})(window.NC = window.NC || {});
