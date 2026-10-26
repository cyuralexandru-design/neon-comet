'use strict';
// Neon Comet 4.0 - PORTRAIT DOM HUD (agent core). Top bar: HP + shield + XP (left), "Lv n · Sector n" under it, score centre,
// crystals + pause right, alerts under the right block; boss bar under the top bar; touch cluster bottom-right (dash big,
// 3 consumables + up to 3 crew abilities in an arc, mirrored with body.lefty). Sets NC.game.hudTop (logical y of the top HUD's
// bottom edge) and NC.game.hudBottom (logical y of the TOP edge of the bottom controls; = H when nothing is there) + hudBottomH.
// HD control art via UI.hd (ctl_dash, ctl_pause, ctl_cons_slot, ctl_ability_slot, ctl_joy_base, ctl_joy_knob) with CSS fallback.
// (3.1 notes:) Reads NC.hud every frame:
// {score, combo, sector, biome, hp, maxHp, shd, maxShd, crystals, runLvl, runXp, runNeed, dashCd01,
//  consumables:[{id,count,cd01}], boss:{nameKey,hp01,mini,segs}|null, fps}
// Engine hooks implemented here (SPEC-31 §2): UI.alert(type,data) (icon alerts, right column), UI.sector(n,biomeKey)
// (big centred intro + permanent label under Lv), boss bar in `segs` segments (UI.hud.showBoss/hideBoss, routed by
// overlays' UI.showBossBar/hideBossBar), NC.game.hudTop (logical canvas px of the top HUD's bottom edge).
// UI.banner (app.js) is wrapped at init: during a run gameplay banner keys become alerts / sector intro.
// Sizes: --hs (CSS px per HUD unit, 0.9..1.8, 1 at 844x390) and --hpx (integer px per art px) are set on <html> here.
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  const t = (k, v) => NC.t(k, v);
  const hasT = k => !!(NC.hasT && NC.hasT(k));
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => (UI.fmt ? UI.fmt(n) : String(Math.floor(n || 0)));
  const num = n => (UI.num ? UI.num(n) : String(Math.floor(n || 0)));
  const sfx = n => { try { UI.sfx && UI.sfx(n); } catch (e) {} };
  const isTouch = () => { try { return UI.isTouch ? UI.isTouch() : false; } catch (e) { return false; } };
  const isPad = () => !!(NC.Input && NC.Input.device === 'pad');
  const hasSpr = id => { try { return !!(NC.assets && NC.assets.has && NC.assets.has(id)); } catch (e) { return false; } };
  const sprUrl = id => { try { return UI.spriteUrl ? UI.spriteUrl(id) : (NC.assets && NC.assets.url ? NC.assets.url(id) : ''); } catch (e) { return ''; } };
  // <img> for a sprite (frame 0 for strips via a cached data URL); '' when the sprite is missing (no magenta placeholder)
  const stripCache = {};
  const spr = (id, cls) => {
    if (!hasSpr(id)) return '';
    let src = '';
    try {
      const s = NC.assets.get(id);
      if (s && s.frames > 1) src = stripCache[id] || (stripCache[id] = NC.assets.icon(id, 1, 0).toDataURL());
      else src = sprUrl(id);
    } catch (e) { src = sprUrl(id); }
    return `<img class="ico pix ${cls || ''}" src="${esc(src)}" alt="" draggable="false">`;
  };

  const hdU = id => { try { return UI.hd ? UI.hd(id) : null; } catch (e) { return null; } };
  const hdBg = id => { const u = hdU(id); return u ? ` style="background-image:url('${esc(u)}')"` : ''; };
  const H = UI.hud = {};
  const cache = {};
  const setT = (el, key, v) => { if (el && cache[key] !== v) { cache[key] = v; el.textContent = v; } };
  const setW = (el, key, f) => { const v = (Math.max(0, Math.min(1, f || 0)) * 100).toFixed(1) + '%'; if (el && cache[key] !== v) { cache[key] = v; el.style.width = v; } };
  const setS = (el, key, prop, v) => { if (el && cache[key] !== v) { cache[key] = v; el.style.setProperty(prop, v); } };
  const setC = (el, key, cls, on) => { on = !!on; if (el && cache[key] !== on) { cache[key] = on; el.classList.toggle(cls, on); } };
  let E = {};
  let consSig = '';
  let visible = false, builtLoaded = false, inited = false;
  let frame = 0;
  const sec = { n: 1, biome: 'nebula' };
  const boss = { key: '', segs: 0, mini: false, on: false };

  // ------------------------------------------------ init / build
  H.init = () => {
    if (inited) return; inited = true;
    H.build(); H.relayout(); wrapBanner();
    try { NC.onLang && NC.onLang(() => H.relabel()); } catch (e) {}
    try { document.fonts && document.fonts.ready && document.fonts.ready.then(() => measure()); } catch (e) {}
    requestAnimationFrame(loop);
  };
  H.build = () => {
    builtLoaded = !!(NC.assets && NC.assets.loaded);
    const hud = $('hud'); if (!hud) return;
    hud.classList.add('hx');
    const pz = hdU('ctl_pause');
    hud.innerHTML = `
      <div class="hx-top" id="hxTop">
        <div class="hx-l" id="hxL">
          <div class="hx-pnl hx-cut">
            <div class="hx-row"><i class="hx-gl hp"></i><div class="hx-bar hp" id="hxHpBar"><b id="hxHpG"></b><i id="hxHp"></i><span id="hxHpT"></span></div></div>
            <div class="hx-row"><i class="hx-gl shd"></i><div class="hx-bar shd" id="hxShdBar"><b id="hxShdG"></b><i id="hxShd"></i><span id="hxShdT"></span></div></div>
            <div class="hx-xp" id="hxXpBar"><i id="hxXp"></i></div>
          </div>
          <div class="hx-sub"><span class="hx-lv" id="hxLvB"><small id="hxLvL"></small> <b id="hxLvN">1</b></span><span class="hx-sec" id="hxSec"></span></div>
        </div>
        <div class="hx-c" id="hxC"><div class="hx-score" id="hxScore">0</div><div class="hx-combo" id="hxCombo"></div></div>
        <div class="hx-r" id="hxR">
          <div class="hx-rt" id="hxRt"><div class="hx-cr hx-cut" id="hxCrBox">${(UI.hd && UI.hd('ui_crystal') ? UI.img('ui_crystal', 'hx-cri') : spr('ui_crystal', 'hx-cri')) || '<i class="hx-crg"></i>'}<b id="hxCr">0</b></div><button class="hx-pause hx-cut${pz ? ' hdb' : ''}" id="hxPause" type="button">${pz ? `<img class="hd" src="${esc(pz)}" alt="">` : '<i></i>'}</button></div>
          <div class="hx-fps" id="hxFps" hidden></div>
          <div class="hx-al" id="hxAl"></div>
        </div>
      </div>
      <div class="hx-abil" id="hxAbil"></div>
      <div class="hx-intro" id="hxIntro"></div>
      <div class="hx-edge" id="hxEdge"></div>`;
    const tu = $('touchUI');
    if (tu) { tu.classList.add('hx'); const jb = hdU('ctl_joy_base'), jk = hdU('ctl_joy_knob');
      tu.innerHTML = `<div id="joyZone"><div id="joy" class="${jb ? 'hdj' : ''}"${hdBg('ctl_joy_base')}><i class="${jk ? 'hdk' : ''}"${hdBg('ctl_joy_knob')}></i></div></div><div class="hx-tcl" id="hxTcl"></div>`; }
    const bb = $('bossBar');
    if (bb) { bb.classList.add('hx'); bb.innerHTML = `<div class="hx-bn" id="hxBossN"></div><div class="hx-bsegs" id="hxBossSegs"></div>`; }
    const fp = $('fps'); if (fp) { fp.classList.add('hx'); fp.hidden = true; } // replaced by #hxFps in the right column
    E = { top: $('hxTop'), L: $('hxL'), C: $('hxC'), rt: $('hxRt'), lvL: $('hxLvL'), lvN: $('hxLvN'), hpBar: $('hxHpBar'), hp: $('hxHp'), hpG: $('hxHpG'), hpT: $('hxHpT'),
      shdBar: $('hxShdBar'), shd: $('hxShd'), shdG: $('hxShdG'), shdT: $('hxShdT'), xpBar: $('hxXpBar'), xp: $('hxXp'), sec: $('hxSec'), score: $('hxScore'), combo: $('hxCombo'),
      cr: $('hxCr'), crBox: $('hxCrBox'), pause: $('hxPause'), fps: $('hxFps'), al: $('hxAl'), abil: $('hxAbil'), intro: $('hxIntro'), edge: $('hxEdge'),
      tcl: $('hxTcl'), joy: $('joy'), joyZone: $('joyZone'), boss: bb, bossName: $('hxBossN'), bossSegs: $('hxBossSegs') };
    E.pause.addEventListener('click', () => { sfx('click'); try { NC.game.pause(); } catch (e) {} });
    try { NC.Input && NC.Input.bindTouch && E.joyZone && NC.Input.bindTouch(E.joyZone); } catch (e) {}
    boss.segs = 0; boss.on = false;
    H.relabel();
  };
  H.relabel = () => {
    if (!E.lvL) return;
    Object.keys(cache).forEach(k => delete cache[k]); consSig = '';
    E.lvL.textContent = t('hud.lv');
    E.pause.setAttribute('aria-label', t('hud.pauseL')); E.pause.title = t('hud.pauseL');
    E.hpBar.setAttribute('aria-label', t('hud.hpL')); E.shdBar.setAttribute('aria-label', t('hud.shdL'));
    E.xpBar.setAttribute('aria-label', t('hud.xpL')); E.crBox.setAttribute('aria-label', t('hud.crL'));
    if (E.bossName && boss.key) E.bossName.textContent = t(boss.key);
    alerts.forEach(a => { const lb = a.el.querySelector('.lb'); if (lb) lb.textContent = alLabel(a); });
    if (introOn && E.intro) renderIntro();
  };
  // scale vars + touch-zone top + hudTop
  H.relayout = () => {
    consSig = '';
    const w = UI.stageW || innerWidth || 390, h = UI.stageH || innerHeight || 844;
    const hs = Math.max(0.85, Math.min(1.6, Math.min(w / 390, h / 844)));
    const st = document.documentElement.style;
    st.setProperty('--hs', hs.toFixed(3) + 'px');
    st.setProperty('--hpx', Math.max(1, Math.round(hs * 2)) + 'px');
    H.hs = hs;
    requestAnimationFrame(() => measure());
  };
  H.show = (on) => {
    if (on && !builtLoaded && NC.assets && NC.assets.loaded) H.build();
    if (on) { wrapBanner(); }
    visible = !!on;
    const hud = $('hud'), tu = $('touchUI'), fp = $('fps');
    if (hud) hud.hidden = !on; if (tu) tu.hidden = !on; if (fp) fp.hidden = true;
    document.body.classList.toggle('hx-play', visible);
    if (!on) { H.hideBoss(); clearAlerts(); hideIntro(); }
    document.body.classList.toggle('touch', isTouch());
    if (on) requestAnimationFrame(() => measure());
  };

  // ------------------------------------------------ safe zone (SPEC §2.4): NC.game.hudTop in logical canvas px
  function measure() {
    let bot = 0, btop = 0;
    if (visible) {
      [E.top, boss.on ? E.boss : null].forEach(el => {
        if (!el || el.hidden || !el.getClientRects().length) return;
        const r = el.getBoundingClientRect(); if (r.height > 0) bot = Math.max(bot, r.bottom);
      });
      const bEl = isTouch() ? E.tcl : E.abil;
      if (bEl && bEl.getClientRects().length) {
        // top edge of the real buttons (the cluster box itself is larger than its arc)
        let tp = Infinity; Array.from(bEl.children).forEach(c => { const r = c.getBoundingClientRect(); if (r.height > 0) tp = Math.min(tp, r.top); });
        if (tp < Infinity) btop = tp;
      }
    }
    if (!bot) bot = Math.round(78 * (H.hs || 1)); // estimate before the HUD is first shown
    bot = Math.ceil(bot);
    if (cache.mBot !== bot) { cache.mBot = bot; document.documentElement.style.setProperty('--hx-top', bot + 'px'); }
    const G = NC.game; if (!G) return;
    const cv = (G.canvas) || $('c');
    const RH = (NC.render && NC.render.H) || G.H || 400;
    const r = cv && cv.getBoundingClientRect ? cv.getBoundingClientRect() : null;
    const toL = y => (r && r.height > 0 ? (y - r.top) * RH / r.height : y * ((NC.render && NC.render.dpr) || 1) / ((NC.render && NC.render.k) || 1));
    G.hudTop = Math.max(0, Math.ceil(toL(bot)));
    const bl = btop ? Math.max(0, Math.min(RH, Math.floor(toL(btop)))) : RH;
    G.hudBottom = bl; G.hudBottomH = Math.max(0, RH - bl);
  }
  H.measure = measure;

  // ------------------------------------------------ ability buttons (rebuilt when the consumable set / device / language changes)
  const PAD_ACT = ['cons1', 'cons2', 'cons3'];
  const PAD_FALL = { dash: ['btn_ps_r2', 'RT'], cons1: ['btn_ps_cross', 'A'], cons2: ['btn_ps_square', 'X'], cons3: ['btn_ps_triangle', 'Y'] };
  const SPR_TXT = { btn_ps_cross: '✕', btn_ps_square: '□', btn_ps_triangle: '△', btn_ps_circle: '○', btn_ps_r2: 'R2', btn_ps_options: '≡' };
  function glyph(action) {
    if (!isPad()) return null;
    let g;
    try { if (NC.Input.glyph) g = NC.Input.glyph(action); } catch (e) { g = undefined; }
    if (g === undefined) { const f = PAD_FALL[action]; const sony = NC.Input.pad && NC.Input.pad.sony; g = f ? (sony ? { spr: f[0] } : { txt: f[1] }) : null; }
    return g || null;
  }
  function glyphHtml(action) {
    const g = glyph(action); if (!g) return '';
    if (g.spr) { const im = spr(g.spr, 'hx-gi'); if (im) return `<span class="hx-gly">${im}</span>`; }
    const txt = g.txt || SPR_TXT[g.spr] || '';
    return txt ? `<span class="hx-gly t">${esc(txt)}</span>` : '';
  }
  function buildAbilities(cons, crew) {
    crew = crew || [];
    const pad = isPad();
    const keyChip = (action, kb) => (pad ? glyphHtml(action) : `<span class="hx-key">${esc(kb)}</span>`);
    E.abil.innerHTML = `<div class="hx-ab dash" id="hxAbD"><span class="dl">${esc(t('hud.dashL'))}</span>${keyChip('dash', t('hud.keySpace'))}<i class="cd" id="hxAbDCd"></i></div>` +
      cons.map((c, i) => `<div class="hx-ab ${c.count ? '' : 'empty'}" id="hxAb${i}">${keyChip(PAD_ACT[i], String(i + 1))}${spr('cons_' + c.id, 'hx-ci')}<span class="n" id="hxAbN${i}">${c.count}</span><i class="cd" id="hxAbCd${i}"></i></div>`).join('');
    if (!E.tcl) return;
    const dh = hdU('ctl_dash'), ch = hdU('ctl_cons_slot'), ah = hdU('ctl_ability_slot');
    const icon = id => (hdU(id) ? UI.img(id, 'hx-ci') : spr(id, 'hx-ci'));
    E.tcl.classList.toggle('crew', crew.length > 0);
    E.tcl.innerHTML = `<button class="hx-tb dash${dh ? ' hdb' : ''}" id="hxTbD" type="button"${hdBg('ctl_dash')}>${dh ? '' : `<span class="dl">${esc(t('hud.dashL'))}</span>`}<i class="cd" id="hxTbDCd"></i>${pad ? glyphHtml('dash') : ''}</button>` +
      cons.map((c, i) => `<button class="hx-tb cons c${i} ${c.count ? '' : 'empty'}${ch ? ' hdb' : ''}" id="hxTb${i}" type="button"${hdBg('ctl_cons_slot')}>${icon('cons_' + c.id)}<span class="n" id="hxTbN${i}">${c.count}</span><i class="cd" id="hxTbCd${i}"></i>${pad ? glyphHtml(PAD_ACT[i]) : ''}</button>`).join('') +
      crew.slice(0, 3).map((c, i) => `<button class="hx-tb ab a${i}${ah ? ' hdb' : ''}" id="hxTa${i}" type="button"${hdBg('ctl_ability_slot')}>${icon('ab_' + c.id) || `<b>${esc(String(c.id || '?').charAt(0).toUpperCase())}</b>`}<i class="cd" id="hxTaCd${i}"></i></button>`).join('');
    const press = (el, fn) => el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('down'); fn(); try { UI.buzz && UI.buzz(12); } catch (x) {} });
    const up = el => ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => el.addEventListener(ev, () => el.classList.remove('down')));
    const d = $('hxTbD'); press(d, () => NC.Input && NC.Input.press && NC.Input.press('dash')); up(d);
    cons.forEach((c, i) => { const b = $('hxTb' + i); press(b, () => useCons(i)); up(b); });
    crew.slice(0, 3).forEach((c, i) => { const b = $('hxTa' + i); press(b, () => useAb(i)); up(b); });
    requestAnimationFrame(() => measure());
  }
  function useAb(i) {
    try { if (NC.game && NC.game.useAbility) NC.game.useAbility(i); else if (NC.Input && NC.Input.press) NC.Input.press('ab', i); } catch (e) { console.error(e); }
  }
  function useCons(i) {
    if (NC.Input && NC.Input.press) NC.Input.press('cons', i);
    else if (NC.game && NC.game.useConsumable) NC.game.useConsumable(i);
  }

  // ------------------------------------------------ boss bar (SPEC §2.3): segs segments, name above, no phase text
  H.showBoss = (def) => {
    if (!E.boss) return;
    def = def || {};
    boss.key = def.nameKey || (def.id ? 'boss.' + def.id + '.name' : '');
    boss.mini = !!def.mini;
    const segs = Math.max(1, Math.min(6, (def.segs | 0) || (boss.mini ? 1 : 3)));
    buildSegs(segs);
    E.bossName.textContent = boss.key ? t(boss.key) : '';
    E.boss.classList.toggle('mini', boss.mini);
    E.boss.hidden = false; boss.on = true;
    Object.keys(cache).filter(k => /^bs/.test(k)).forEach(k => delete cache[k]);
    document.body.classList.add('bossfight');
    requestAnimationFrame(() => measure());
  };
  function buildSegs(n) {
    if (boss.segs === n && E.bossSegs.children.length === n) return;
    boss.segs = n;
    E.bossSegs.innerHTML = Array.from({ length: n }, () => '<div class="hx-bseg"><b></b><i></i></div>').join('');
    Object.keys(cache).filter(k => /^bs/.test(k)).forEach(k => delete cache[k]);
  }
  H.hideBoss = () => {
    if (E.boss) E.boss.hidden = true;
    const was = boss.on; boss.on = false; boss.key = '';
    document.body.classList.remove('bossfight');
    if (was) requestAnimationFrame(() => measure());
  };

  // ------------------------------------------------ alerts (SPEC §2.1): icons stacked on the right under crystals/pause
  const AL = {
    boss: { spr: 'ui_alert_boss', g: '!!', tone: 'red', life: 3400 },
    bossDown: { spr: 'ui_alert_boss', g: '✓', tone: 'good', life: 3000, cls: 'down' },
    elite: { spr: 'ui_alert_elite', g: '!', tone: 'amber', life: 3000 },
    event: { spr: 'ui_alert_event', g: '≈', tone: 'cyan', life: 3400 },
    threat: { spr: 'ui_alert_threat', g: '+', tone: 'red', life: 3000 },
    chest: { spr: 'ui_alert_chest', g: '▣', tone: 'amber', life: 3000 },
    evolved: { spr: 'ui_alert_evolved', g: '▲', tone: 'amber', life: 3000 },
    supernova: { spr: 'ui_alert_supernova', g: '✦', tone: 'amber', life: 2800 },
    rebirth: { spr: 'ui_alert_rebirth', g: '↺', tone: 'good', life: 3000 },
  };
  const MAX_AL = 4;
  let alerts = [];
  function alLabel(a) {
    const d = a.data || {};
    switch (a.type) {
      case 'elite': return d.nameKey && hasT(d.nameKey) ? t(d.nameKey) : t('hud.al.elite');
      case 'event': return d.id && hasT('event.' + d.id + '.name') ? t('event.' + d.id + '.name') : t('hud.al.event');
      case 'chest': return d.r != null && hasT('chest.' + d.r + '.name') ? t('chest.' + d.r + '.name') : t('hud.al.chest');
      default: return t('hud.al.' + a.type);
    }
  }
  function removeAlert(a, now) {
    clearTimeout(a.tm);
    alerts = alerts.filter(x => x !== a);
    if (now || !a.el.isConnected) { a.el.remove(); return; }
    a.el.classList.add('out'); a.tm = setTimeout(() => a.el.remove(), 420);
  }
  function clearAlerts() { alerts.slice().forEach(a => removeAlert(a, true)); }
  H.alert = (type, data) => {
    const def = AL[type]; if (!def || !E.al) return;
    // same type already visible -> replace it (one icon for every boss / every elite ...)
    alerts.filter(a => a.type === type).forEach(a => removeAlert(a, true));
    while (alerts.length >= MAX_AL) removeAlert(alerts[0], true);
    const a = { type, data: data || {} };
    const el = a.el = document.createElement('div');
    const r = type === 'chest' && a.data.r != null ? Math.max(0, Math.min(4, a.data.r | 0)) : null;
    const im = spr(def.spr, 'hx-ai');
    el.className = `hx-a tone-${def.tone} ${def.cls || ''}` + (r != null ? ' rr r' + r : '') + (im ? '' : ' nospr');
    el.style.setProperty('--life', def.life + 'ms');
    const icon = im || `<span class="fg">${esc(def.g)}</span>`;
    el.innerHTML = `<span class="lb"></span><span class="ic">${icon}</span>`;
    el.querySelector('.lb').textContent = alLabel(a);
    E.al.appendChild(el); alerts.push(a);
    a.tm = setTimeout(() => removeAlert(a), def.life + 450);
    if (type === 'boss') edge();
  };
  function edge() {
    if (!E.edge) return;
    E.edge.classList.remove('on'); void E.edge.offsetWidth; E.edge.classList.add('on');
    clearTimeout(H._edgeT); H._edgeT = setTimeout(() => E.edge && E.edge.classList.remove('on'), 1200);
  }
  UI.alert = (type, data) => { try { H.alert(type, data); } catch (e) { console.error('hud.alert', e); } };

  // ------------------------------------------------ sector (SPEC §2.2): big centred intro + label under Lv
  let introOn = false;
  const biomeKey = b => (!b ? '' : /\./.test(b) ? b : 'biome.' + b + '.name');
  function renderIntro() {
    const bk = biomeKey(sec.biome);
    E.intro.innerHTML = `<div class="t pix-title">${esc(t('hud.secBig', { n: sec.n }))}</div>${bk && hasT(bk) ? `<div class="s pix-title">${esc(t(bk))}</div>` : ''}`;
  }
  function hideIntro() { introOn = false; clearTimeout(H._introT); if (E.intro) { E.intro.classList.remove('on'); E.intro.innerHTML = ''; } }
  H.sector = (n, biome) => {
    n = Math.max(1, parseInt(n, 10) || 1);
    sec.n = n; if (biome) sec.biome = String(biome).replace(/^biome\.|\.name$/g, '');
    cache.sec = null;
    if (!E.intro) return;
    renderIntro(); introOn = true;
    E.intro.classList.remove('on'); void E.intro.offsetWidth; E.intro.classList.add('on');
    clearTimeout(H._introT); H._introT = setTimeout(hideIntro, 2300);
  };
  UI.sector = (n, biome) => { try { H.sector(n, biome); } catch (e) { console.error('hud.sector', e); } };

  // ------------------------------------------------ UI.banner safety net: gameplay keys -> alerts / sector intro
  const inRun = () => visible || !!(NC.game && NC.game.run && NC.game.mode !== 'menu' && NC.game.mode !== 'over');
  function chestRarity(sub) {
    for (let r = 0; r <= 4; r++) if (sub && sub === t('chest.' + r + '.name')) return r;
    return null;
  }
  function routeBanner(key, sub) {
    key = String(key || '');
    if (key === 'banner.phase') return true;
    if (key === 'banner.sector') { const g = NC.game, R = g && g.run; H.sector(parseInt(sub, 10) || (R ? R.sector + 1 : 1), (R && R.biome) || (NC.hud && NC.hud.biome)); return true; }
    if (key === 'banner.bossDown') { H.alert('bossDown'); return true; }
    if (/^banner\.boss/.test(key) || key === 'banner.warning') { H.alert('boss'); return true; }
    if (key === 'banner.miniboss') { H.alert('elite'); return true; }
    if (key === 'banner.newThreat') { H.alert('threat'); return true; }
    if (/^event\./.test(key)) { H.alert('event', { id: key.split('.')[1] }); return true; }
    if (key === 'banner.chest') { H.alert('chest', { r: chestRarity(sub) }); return true; }
    if (key === 'banner.evolved') { H.alert('evolved'); return true; }
    if (key === 'banner.supernova') { H.alert('supernova'); return true; }
    if (key === 'banner.rebirth') { H.alert('rebirth'); return true; }
    return true; // anything else during play: swallowed (no centre banner mid-game)
  }
  function wrapBanner() {
    const orig = UI.banner;
    if (typeof orig !== 'function' || orig._hx) return;
    const w = function (key, sub, kind) {
      if (inRun()) { try { if (routeBanner(key, sub)) return; } catch (e) { console.error('hud.banner', e); return; } }
      return orig.apply(this, arguments);
    };
    w._hx = true; w._orig = orig; UI.banner = w;
  }
  H.wrapBanner = wrapBanner;

  // ------------------------------------------------ per-frame update
  let fpsS = 0, lastT = performance.now(), comboPrev = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.25, (now - lastT) / 1000); lastT = now;
    if (!visible) return;
    const h = NC.hud; if (!h || !E.hp) return;
    if ((++frame % 30) === 0) { measure(); if (UI.banner && !UI.banner._hx) wrapBanner(); }
    // HP / shield
    const hpF = h.maxHp ? h.hp / h.maxHp : 0, shF = h.maxShd ? h.shd / h.maxShd : 0;
    setW(E.hp, 'hp', hpF); setW(E.hpG, 'hpg', hpF); setW(E.shd, 'shd', shF); setW(E.shdG, 'shdg', shF);
    setT(E.hpT, 'hpT', Math.ceil(Math.max(0, h.hp || 0)) + ' / ' + Math.ceil(h.maxHp || 0));
    setT(E.shdT, 'shdT', Math.ceil(Math.max(0, h.shd || 0)) + ' / ' + Math.ceil(h.maxShd || 0));
    setC(E.hpBar, 'hpLow', 'low', hpF > 0 && hpF < 0.3);
    setC(E.shdBar, 'shdZero', 'zero', shF <= 0);
    // run level + XP
    setT(E.lvN, 'lvN', String(h.runLvl || 1));
    setT(E.lvL, 'lvL', t('hud.lv'));
    setW(E.xp, 'xp', h.runNeed ? h.runXp / h.runNeed : 0);
    // sector label (under Lv)
    const sn = Math.max(1, h.sector || sec.n || 1), bk = biomeKey(h.biome || sec.biome);
    let ss = null; try { ss = NC.game && NC.game.storyState ? NC.game.storyState() : null; } catch (e) { ss = null; }
    if (ss) setT(E.sec, 'sec', t('hud.storyLv', { id: ss.id }) + ' · ' + (ss.phase === 'waves' || !ss.phase ? t('hud.wave', { w: Math.max(1, Math.min(ss.wave, ss.waves)), n: ss.waves }) : t('hud.al.boss')));
    else setT(E.sec, 'sec', t('hud.sec', { n: sn }) + (bk && hasT(bk) ? ' · ' + t(bk) : ''));
    // score + combo
    setT(E.score, 'score', num(h.score || 0));
    setC(E.C, 'cDim', 'dim', !!(h.boss || boss.on));
    const cb = h.combo || 0;
    setT(E.combo, 'combo', cb > 1 ? t('hud.comboN', { n: cb }) : '');
    if (cb > comboPrev && cb > 1 && cb % 5 === 0) { E.combo.classList.remove('pulse'); void E.combo.offsetWidth; E.combo.classList.add('pulse'); }
    comboPrev = cb;
    setT(E.cr, 'cr', fmt(h.crystals || 0));
    // abilities
    const cons = (h.consumables || []).slice(0, 3);
    const crew = isTouch() && Array.isArray(h.crew) ? h.crew.slice(0, 3) : [];
    const sig = cons.map(c => c.id).join(',') + '/' + crew.map(c => c.id).join(',') + '|' + isTouch() + '|' + isPad() + '|' + (NC.Input && NC.Input.pad && NC.Input.pad.sony) + '|' + NC.lang + '|' + !!(NC.assets && NC.assets.loaded);
    if (sig !== consSig) { consSig = sig; buildAbilities(cons, crew); Object.keys(cache).filter(k => /^(ab|tb|ta|e\d)/.test(k)).forEach(k => delete cache[k]); }
    const dcd = Math.max(0, Math.min(1, h.dashCd01 || 0));
    setS($('hxAbDCd'), 'abD', 'height', (dcd * 100).toFixed(0) + '%');
    setS($('hxTbDCd'), 'tbD', '--p', dcd.toFixed(3));
    cons.forEach((c, i) => {
      const n = c.count | 0, cd = Math.max(0, Math.min(1, c.cd01 || 0));
      setT($('hxAbN' + i), 'abN' + i, String(n)); setT($('hxTbN' + i), 'tbN' + i, String(n));
      setS($('hxAbCd' + i), 'abC' + i, 'height', (cd * 100).toFixed(0) + '%'); setS($('hxTbCd' + i), 'tbC' + i, '--p', cd.toFixed(3));
      if (cache['e' + i] !== !n) { cache['e' + i] = !n; const ea = $('hxAb' + i), et = $('hxTb' + i); if (ea) ea.classList.toggle('empty', !n); if (et) et.classList.toggle('empty', !n); }
    });
    crew.forEach((c, i) => {
      const cd = Math.max(0, Math.min(1, +c.cd01 || 0));
      setS($('hxTaCd' + i), 'taC' + i, '--p', cd.toFixed(3));
      const b = $('hxTa' + i); setC(b, 'taR' + i, 'rdy', cd <= 0); setC(b, 'taA' + i, 'act', !!c.active);
    });
    // joystick visual follows NC.Input.joy (coords relative to the zone)
    const J = NC.Input && NC.Input.joy;
    if (J && E.joy) {
      if (J.active) {
        setS(E.joy, 'jl', 'left', J.cx + 'px'); setS(E.joy, 'jt', 'top', J.cy + 'px');
        setS(E.joy.firstElementChild, 'jk', 'transform', `translate(${Math.round(J.kx)}px,${Math.round(J.ky)}px)`);
        if (!cache.jon) { cache.jon = 1; E.joy.classList.add('on'); }
      } else if (cache.jon) {
        cache.jon = 0; E.joy.classList.remove('on'); E.joy.firstElementChild.style.transform = ''; cache.jk = ''; E.joy.style.left = ''; E.joy.style.top = ''; cache.jl = cache.jt = '';
      }
    }
    // boss bar
    const hb = h.boss;
    if (hb && E.boss) {
      const segs = (hb.segs | 0) || (hb.mini ? 1 : 3);
      if (!boss.on || (hb.nameKey && hb.nameKey !== boss.key) || segs !== boss.segs) H.showBoss({ nameKey: hb.nameKey || boss.key, mini: hb.mini, segs });
      setT(E.bossName, 'bsName', boss.key ? t(boss.key) : '');
      const hp = Math.max(0, Math.min(1, hb.hp01 == null ? 1 : hb.hp01)), segEls = E.bossSegs.children;
      for (let i = 0; i < segEls.length; i++) {
        const f = Math.max(0, Math.min(1, (hp - i / segEls.length) * segEls.length));
        setW(segEls[i].lastElementChild, 'bsF' + i, f); setW(segEls[i].firstElementChild, 'bsG' + i, f);
      }
    } else if (boss.on && NC.hud && NC.hud.boss === null && NC.game && NC.game.run) H.hideBoss();
    // fps (only with the setting)
    let showF = false; try { showF = !!(UI.settings && UI.settings().fps); } catch (e) {}
    if (cache.fpsOn !== showF) { cache.fpsOn = showF; E.fps.hidden = !showF; }
    if (showF) {
      const f = h.fps || (dt > 0 ? 1 / dt : 0);
      fpsS = fpsS ? fpsS + (f - fpsS) * 0.1 : f;
      const v = Math.round(fpsS); setT(E.fps, 'fps', t('hud.fpsN', { n: v }));
      const cls = v >= 50 ? 'ok' : v >= 30 ? 'warn' : 'bad'; if (cache.fpsc !== cls) { cache.fpsc = cls; E.fps.className = 'hx-fps ' + cls; }
    }
  }
})(window.NC = window.NC || {});
