'use strict';
// Neon Comet 3.0 - overlays (UI agent): loading screen (ship warp), pause, level-up cards, revive, game over + share card,
// chest opening, daily reward, offline rewards, tutorial, and the engine hooks NC.ui.onRunStart/showCards/showRevive/
// showGameOver/showBossBar/hideBossBar/banner/onPause.
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  UI.screens = UI.screens || {};
  const t = (k, v) => NC.t(k, v);
  const $ = id => document.getElementById(id);
  const esc = s => UI.esc(s);

  // =================================================================== reward rendering
  // rew = {cr, chest?: rarity, cons?: {id:n}} (systems reward shape)
  UI.rewardHtml = (rew, big) => {
    if (!rew) return '';
    const out = [];
    if (rew.cr) out.push(`<span class="cr">${UI.icoCr(big ? 'ico16' : 'ico10')}<b>${UI.fmt(rew.cr)}</b></span>`);
    if (rew.chest != null) out.push(`<span class="row" style="gap:${2}px">${UI.img('chest_' + rew.chest, big ? 'ico24' : 'ico16')}</span>`);
    if (rew.cons) for (const k of Object.keys(rew.cons)) out.push(`<span class="row" style="gap:2px">${UI.img('cons_' + k, 'ico16')}<span class="body">x${rew.cons[k]}</span></span>`);
    return `<span class="row" style="gap:6px;flex-wrap:wrap">${out.join('')}</span>`;
  };

  // =================================================================== loading screen
  // Owner design (replaces SPEC §6.10 warp concept): ui_logo large + centered (integer scale ~50-60% width), below it a
  // pixel loading bar on which the selected ship (facing right, fx_thruster flame) travels left->right leaving a
  // comet-trail fill. Slowly drifting stars. At 100% the ship zooms off the right edge, then fade to menu. Tap/key skips once loaded.
  const L = UI.loader = {};
  L.run = () => new Promise(resolve => {
    const box = document.createElement('div'); box.id = 'loader';
    box.innerHTML = `<canvas class="pix"></canvas>`;
    $('stage').appendChild(box);
    const cv = box.querySelector('canvas'), g = cv.getContext('2d');
    let W = 320, H = 180;
    const size = () => {
      const dpr = window.devicePixelRatio || 1, k = Math.max(1, Math.floor(innerHeight * dpr / 180));
      W = Math.ceil(innerWidth * dpr / k); H = Math.ceil(innerHeight * dpr / k);
      cv.width = W; cv.height = H; g.imageSmoothingEnabled = false;
    };
    size(); addEventListener('resize', size);
    let shipId = 'vanator'; try { shipId = UI.S().ships.eq || 'vanator'; } catch (e) {}
    const base = (NC.assets && NC.assets.base) || 'assets/sprites/';
    const img = src => { const i = new Image(); i.ok = false; i.onload = () => { i.ok = true; }; i.src = base + src; return i; };
    const ship = img('ship_' + shipId + '.png'), logo = img('ui_logo.png'), thr = img('fx_thruster.png');
    const stars = []; let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 140; i++) stars.push({ x: rnd(), y: rnd(), l: i % 3 });
    const COL = ['#1d2547', '#46518a', '#cfd6f0'];
    let target = 0, shown = 0, done = false, outro = 0, t0 = performance.now(), last = t0, finished = false, skip = false;
    const draw = (now) => {
      if (finished) return;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      const time = Math.max(0, (now - t0) / 1000);
      shown += (target - shown) * Math.min(1, dt * 6); if (done && shown > 0.995) shown = 1;
      g.fillStyle = '#05070f'; g.fillRect(0, 0, W, H);
      for (const s of stars) { // slow drift to the left (parallax)
        s.x -= [0.004, 0.009, 0.018][s.l] * dt * (1 + outro * 4); if (s.x < 0) { s.x += 1; s.y = rnd(); }
        g.fillStyle = COL[s.l]; g.fillRect(Math.round(s.x * W), Math.round(s.y * H), 1, 1);
      }
      const cx = Math.round(W / 2);
      // logo: integer scale, ~50-60% of width
      const ls = Math.max(1, Math.floor(W * 0.58 / 200));
      const lw = 200 * ls, lh = 48 * ls, ly = Math.round(H * 0.42 - lh / 2 - 8);
      if (logo.ok) g.drawImage(logo, Math.round(cx - lw / 2), ly, lw, lh);
      else { g.textBaseline = 'top'; g.textAlign = 'center'; g.font = '700 16px NCPixel, monospace'; g.fillStyle = '#1d6a80'; g.fillText('NEON COMET', cx + 1, ly + 17); g.fillStyle = '#8fe0ec'; g.fillText('NEON COMET', cx, ly + 16); }
      // bar
      const bw = Math.min(Math.round(lw * 0.9), W - 48), bx = Math.round(cx - bw / 2), by = ly + lh + 26;
      g.fillStyle = '#06080f'; g.fillRect(bx - 1, by - 1, bw + 2, 6);
      g.fillStyle = '#121932'; g.fillRect(bx, by, bw, 4);
      const fw = Math.round(bw * Math.min(1, shown));
      for (let i = 0; i < fw; i++) { const f = (fw - i) / Math.max(1, bw); g.fillStyle = f > 0.6 ? '#1d6a80' : f > 0.25 ? '#2b8ea3' : '#4cbfd4'; g.fillRect(bx + i, by, 1, 4); }
      if (fw > 0) { g.fillStyle = '#8fe0ec'; g.fillRect(bx, by, fw, 1); }
      // ship on the bar, facing right; zooms off the right edge on outro
      const sx = Math.round(bx + fw + outro * outro * (W - bx - fw + 40)), sy = Math.round(by + 2 + Math.sin(time * 6) * 1);
      for (let i = 0; i < 5; i++) { // trail sparks
        const px = sx - 18 - ((time * 50 + i * 7) % 22) - outro * 20, py = sy + Math.round(Math.sin(time * 9 + i * 2) * 2);
        g.fillStyle = i % 2 ? '#8fe0ec' : '#4cbfd4'; g.fillRect(Math.round(px), py, 1, 1);
      }
      g.save(); g.translate(sx, sy); g.rotate(Math.PI / 2); // sprite faces up -> rotate 90deg to face right (pixel exact)
      const fr = Math.floor(time * 12) % 3;
      if (thr.ok) { const tw = thr.width / 3; g.drawImage(thr, fr * tw, 0, tw, thr.height, -Math.round(tw / 2), 12, tw, thr.height); if (outro) g.drawImage(thr, fr * tw, 0, tw, thr.height, -Math.round(tw / 2), 12 + thr.height - 2, tw, thr.height); }
      else { const fl = [5, 7, 6][fr] + Math.round(outro * 14); g.fillStyle = '#feae34'; g.fillRect(-2, 12, 4, fl); g.fillStyle = '#fee761'; g.fillRect(-1, 12, 2, Math.max(2, fl - 2)); }
      if (ship.ok) g.drawImage(ship, -16, -16); else { g.fillStyle = '#9ba4c6'; g.fillRect(-6, -12, 12, 24); }
      g.restore();
      g.textBaseline = 'top'; g.font = '8px NCPixel, monospace';
      g.textAlign = 'left'; g.fillStyle = '#9ba4c6'; g.fillText((done ? t('loading.ready') : t('loading.text') + '.'.repeat(Math.floor(time / 0.3) % 4)).toUpperCase(), bx, by + 10);
      g.textAlign = 'right'; g.fillStyle = '#d9def0'; g.fillText(Math.round(shown * 100) + '%', bx + bw, by + 10);
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    const finish = () => {
      const start = performance.now(); UI.sfx('dash');
      const step = (now) => {
        outro = Math.min(1, skip ? 1 : (now - start) / 700);
        if (outro < 1) { requestAnimationFrame(step); return; }
        box.classList.add('out'); resolve();
        setTimeout(() => { finished = true; removeEventListener('resize', size); box.remove(); }, 380);
      };
      requestAnimationFrame(step);
    };
    box.addEventListener('pointerdown', () => { if (done) skip = true; });
    addEventListener('keydown', function k() { if (done) { skip = true; removeEventListener('keydown', k); } });
    const load = (NC.assets && NC.assets.load) ? NC.assets.load((d, n) => { target = typeof n === 'number' && n > 0 ? d / n : (d > 1 ? d / 100 : d); }) : Promise.resolve();
    const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('8px NCPixel'), document.fonts.load('11px NCBody')]).catch(() => {}) : Promise.resolve();
    Promise.all([load, fonts, new Promise(r => setTimeout(r, 900))]).then(() => {
      target = 1; done = true;
      try { if (NC.game && NC.game.init) NC.game.init($('c')); } catch (e) { console.error('game.init', e); }
      UI.layout && UI.layout();
      setTimeout(finish, skip ? 0 : 350);
    });
  });

  // =================================================================== run flow
  UI.launch = (consumables) => {
    UI.closeAll(); UI.hud.show(true);
    try { NC.audio && NC.audio.unlock && NC.audio.unlock(); } catch (e) {}
    const loadout = { consumables: consumables || (NC.sys.runConsumables ? NC.sys.runConsumables() : []) };
    try { NC.game.start(loadout); } catch (e) { console.error('game.start', e); }
  };
  UI.toMenu = () => {
    UI.hud.show(false); UI.tutEnd(true); UI.closeAll(); UI.show('menu', {}, true);
    try { NC.audio && NC.audio.music && NC.audio.music('menu'); } catch (e) {}
  };
  UI.onRunStart = () => {
    UI.closeAll(); UI.hud.show(true);
    const s = UI.S(); if (s && !s.tut) UI.tutStart();
  };
  UI.onPause = () => { if (!UI.stack.find(x => x.name === 'pause')) UI.show('pause'); };
  UI.showBossBar = def => UI.hud.showBoss(def);
  UI.hideBossBar = () => UI.hud.hideBoss();

  // =================================================================== pause
  UI.screens.pause = {
    cls: 'veil',
    render(el) {
      el.innerHTML = `<div class="pnl center-pnl pop-in"><div class="ttl">${t('pause.title')}</div><div class="sep"></div>
        <button class="btn lg pri" data-f data-first data-a="resume">${t('pause.resume')}</button>
        <button class="btn" data-f data-a="settings">${t('pause.settings')}</button>
        <button class="btn bad" data-f data-a="quit">${t('pause.quit')}</button></div>`;
    },
    act(a) {
      UI.sfx('click');
      if (a === 'resume') UI.resume();
      if (a === 'settings') UI.show('settings', { fromPause: true });
      if (a === 'quit') UI.confirm(t('pause.quitConfirm'), () => { try { NC.game.quit(); } catch (e) {} if (!UI.stack.find(x => x.name === 'over')) UI.toMenu(); }, { danger: true });
    },
    back() { UI.resume(); },
  };

  // =================================================================== level-up cards
  // cards: [{id, lvl (level after picking, 1 = new), max?, rarity?}] ; rerollCost: 0 = free
  UI.showCards = (cards, rerollCost) => {
    UI.show('cards', { cards: cards || [], cost: rerollCost || 0 });
    if (UI.tutOpen && UI.tutOpen() && UI._tutStepId() !== 'card') UI.tutGoto('card');
  };
  UI.screens.cards = {
    cls: 'veil',
    render(el, st) {
      const tutHint = UI.tutOpen && UI.tutOpen() ? `<div class="body c-warm">${t('tut.card')}</div>` : '';
      el.innerHTML = `<div class="cards-h"><span class="big b">${t('cards.title')}</span> <span class="body dim">${t('cards.sub')}</span>${tutHint}</div>
        <div class="cards">${st.cards.map((c, i) => {
          const evo = /^evo_/.test(c.id); const lvl = Math.max(1, c.lvl || 1);
          const tag = evo ? t('cards.evo') : (lvl <= 1 ? t('cards.new') : '');
          return `<div class="card ${evo ? 'evo' : ''} pop-in" style="animation-delay:${i * 60}ms" data-f ${i === 1 ? 'data-first' : ''} data-a="pick" data-id="${esc(c.id)}">
            ${tag ? `<span class="tag">${esc(tag)}</span>` : ''}
            <div class="art">${UI.img('card_' + c.id, 'pix')}</div>
            <div class="nm">${esc(t('card.' + c.id + '.name'))}</div>
            <div class="ds">${esc(t('card.' + c.id + '.desc'))}</div>
            <div class="lv">${t('cards.lvl', { n: lvl })}</div></div>`;
        }).join('')}</div>
        <div class="cards-f"><button class="btn ${st.cost ? 'warm' : 'good'}" data-f data-a="reroll">${st.cost ? `${t('cards.reroll')} <span class="cost">${UI.icoCr()}${UI.fmt(st.cost)}</span>` : t('cards.rerollFree')}</button>
          <span class="cr">${UI.icoCr()}<b>${UI.fmt(UI.crystals())}</b></span></div>`;
    },
    act(a, el, s) {
      if (a === 'pick') {
        if (s.state.picked) return; s.state.picked = true;
        el.classList.add('picked'); UI.sfx('card');
        const id = el.dataset.id;
        setTimeout(() => { UI.close('cards'); try { NC.game.pickCard(id); } catch (e) { console.error(e); } if (UI.tutOpen && UI.tutOpen() && UI._tutStepId() === 'card') UI.tutNext(); }, 300);
      }
      if (a === 'reroll') { UI.sfx('reroll'); try { const r = NC.game.rerollCards(); if (r === false) UI.toast(t('toast.noCrystals'), 'bad'); } catch (e) { console.error(e); } }
    },
    back() { /* must pick */ },
  };

  // =================================================================== revive
  UI.showRevive = (cost, left) => UI.show('revive', { cost, left, t0: performance.now(), dur: 9000 });
  UI.screens.revive = {
    cls: 'veil',
    render(el, st, s) {
      const can = cost => cost != null && (left == null || left > 0);
      const { cost, left } = st;
      el.innerHTML = `<div class="pnl center-pnl pop-in"><div class="ttl c-bad">${t('revive.title')}</div>
        <div class="ring" id="rvRing"><b id="rvSec">9</b></div>
        ${can(cost) ? `<button class="btn lg warm" data-f data-first data-a="revive">${t('revive.btn')} <span class="cost">${cost ? UI.icoCr() + UI.fmt(cost) : t('revive.free')}</span></button>` : ''}
        <div class="body dim" style="text-align:center">${left != null ? t('revive.left', { n: left }) : ''} &nbsp; <span class="cr">${UI.icoCr()}<b>${UI.fmt(UI.crystals())}</b></span></div>
        <button class="btn" data-f data-a="giveup">${t('revive.giveUp')}</button></div>`;
      clearInterval(s.timer);
      s.timer = setInterval(() => {
        if (!document.body.contains(el)) return clearInterval(s.timer);
        const p = 1 - (performance.now() - st.t0) / st.dur, ring = el.querySelector('#rvRing'), sec = el.querySelector('#rvSec');
        if (ring) ring.style.setProperty('--p', Math.max(0, p).toFixed(3)); if (sec) sec.textContent = Math.max(0, Math.ceil(p * st.dur / 1000));
        if (p <= 0) { clearInterval(s.timer); UI.screens.revive.act('giveup', null, s); }
      }, 100);
    },
    act(a, el, s) {
      clearInterval(s.timer);
      if (a === 'revive') {
        if (s.state.cost && UI.crystals() < s.state.cost) { UI.toast(t('toast.noCrystals'), 'bad'); UI.sfx('error'); return; }
        UI.close('revive'); UI.sfx('revive'); try { NC.game.revive(); } catch (e) { console.error(e); }
      }
      if (a === 'giveup') { UI.close('revive'); try { NC.game.giveUp(); } catch (e) { console.error(e); } }
    },
    back(s) { /* explicit choice required */ void s; },
  };

  // =================================================================== game over
  UI.showGameOver = summary => { UI.hud.show(false); UI.tutEnd(true); UI.closeAll(); UI.show('over', { s: summary || {} }); UI.sfx('gameover'); };
  UI.screens.over = {
    cls: 'dim',
    render(el, st) {
      const s = st.s;
      const rows = [
        ['over.kills', UI.num(s.kills)], ['over.sector', (s.sector || 0) + 1], ['over.bosses', s.bosses || 0], ['over.combo', 'x' + (s.combo || 0)],
        ['over.time', UI.time(s.time)], ['over.xp', '+' + UI.fmt(s.xp || 0)], ['over.revives', s.revives || 0],
      ];
      el.innerHTML = `<div class="scr-h"><h2>${t('over.title')}</h2><span class="sp"></span><span class="chip cr">${UI.icoCr()}<b>${UI.fmt(UI.crystals())}</b></span></div>
        <div class="over pop-in">
          <div class="pnl" style="min-width:${UI.u * 130}px">
            <div class="row" style="justify-content:center">${UI.frame(UI.shipRarity(s.shipId), UI.img('ship_' + (s.shipId || 'vanator'), 'ico32'), { cls: 'big' })}</div>
            <div class="over-score"><div class="body dim">${t('over.score')}</div><div class="big b">${UI.num(s.score)}</div>
              ${s.isBest ? `<div class="over-best">${t('over.newBest')}</div>` : `<div class="body dim">${t('over.best')}: ${UI.num(s.best)}</div>`}</div>
            <div class="sep"></div>
            <div class="row" style="justify-content:center"><span class="cr big">${UI.icoCr('ico16')}<b>+${UI.fmt(s.crystals)}</b></span></div>
            ${s.lvlAfter > s.lvlBefore ? `<div class="body c-acc" style="text-align:center">${t('over.lvlUp', { a: s.lvlBefore, b: s.lvlAfter })}</div>` : ''}
          </div>
          <div class="pnl" style="min-width:${UI.u * 150}px">
            <div class="kv">${rows.map(([k, v]) => `<span class="k">${t(k)}</span><span class="v">${esc(v)}</span>`).join('')}</div>
            ${(s.chests && s.chests.length) ? `<div class="sep"></div><div class="row" style="justify-content:space-between;align-items:center"><span class="body dim">${t('tab.chests')}</span><span class="chest-row">${s.chests.slice(0, 6).map(r => UI.img('chest_' + r, 'ico16')).join('')}${s.chests.length > 6 ? `<span class="body">+${s.chests.length - 6}</span>` : ''}</span></div>` : ''}
          </div>
        </div>
        <div class="over-acts"><button class="btn" data-f data-a="menu">${t('over.menu')}</button><button class="btn" data-f data-a="hangar">${t('over.hangar')}</button>
          <button class="btn warm" data-f data-a="share">${t('over.share')}</button><button class="btn lg pri" data-f data-first data-a="again">${t('over.again')}</button></div>`;
    },
    act(a, el, s) {
      UI.sfx('click');
      if (a === 'again') UI.launch();
      if (a === 'hangar') { UI.toMenu(); UI.show('hangar'); }
      if (a === 'menu') UI.toMenu();
      if (a === 'share') UI.share(s.state.s);
    },
    back() { UI.toMenu(); },
  };
  UI.shipRarity = id => { try { const d = NC.sys.def('ship', id); return d ? d.r : 0; } catch (e) { return 0; } };

  // share card: 300x158 logical pixel image scaled x4 (1200x632), Web Share with file, else download
  UI.shareCanvas = (s) => {
    const W = 300, H = 158, K = 4;
    const lo = document.createElement('canvas'); lo.width = W; lo.height = H; const g = lo.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#0b0f1e'; g.fillRect(0, 0, W, H);
    let seed = 5; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 90; i++) { g.fillStyle = ['#1d2547', '#46518a', '#cfd6f0'][Math.floor(Math.pow(r(), 2) * 3)]; g.fillRect((r() * W) | 0, (r() * H) | 0, 1, 1); }
    g.fillStyle = '#06080f'; g.fillRect(0, 0, W, 2); g.fillRect(0, H - 2, W, 2);
    g.fillStyle = '#4cbfd4'; g.fillRect(0, 2, W, 1); g.fillRect(0, H - 3, W, 1);
    // ship 2x
    try { const sh = NC.assets.get('ship_' + (s.shipId || 'vanator')); g.drawImage(sh.img, 0, 0, sh.w, sh.h, 30, 46, sh.w * 2, sh.h * 2); } catch (e) {}
    try { const th = NC.assets.get('fx_thruster'); if (NC.assets.has('fx_thruster')) g.drawImage(th.img, th.w, 0, th.w, th.h, 62 - th.w, 106, th.w * 2, th.h * 2); } catch (e) {}
    g.textBaseline = 'top';
    g.font = '700 16px NCPixel'; g.fillStyle = '#1d6a80'; g.fillText('NEON COMET', 111, 17); g.fillStyle = '#8fe0ec'; g.fillText('NEON COMET', 110, 16);
    g.font = '8px NCPixel'; g.fillStyle = '#9ba4c6'; g.fillText(t('over.score').toUpperCase(), 110, 44);
    g.font = '700 16px NCPixel'; g.fillStyle = '#d9def0'; g.fillText(UI.num(s.score), 110, 54);
    g.font = '8px NCPixel'; g.fillStyle = '#9ba4c6';
    g.fillText(t('over.sector').toUpperCase() + ' ' + ((s.sector || 0) + 1) + '   ' + t('over.bosses').toUpperCase() + ' ' + (s.bosses || 0), 110, 78);
    if (s.isBest) { g.fillStyle = '#f6d68a'; g.fillText(t('over.newBest'), 110, 92); }
    g.fillStyle = '#4cbfd4'; g.fillText('neon-comet.pages.dev', 110, 130);
    const hi = document.createElement('canvas'); hi.width = W * K; hi.height = H * K; const h = hi.getContext('2d'); h.imageSmoothingEnabled = false;
    h.drawImage(lo, 0, 0, W * K, H * K);
    return hi;
  };
  UI.share = (s) => {
    const cv = UI.shareCanvas(s);
    const text = t('over.shareText', { s: UI.num(s.score) });
    cv.toBlob(async blob => {
      if (!blob) return;
      try {
        const file = new File([blob], 'neon-comet.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text, title: 'Neon Comet', url: 'https://neon-comet.pages.dev/' }); return; }
      } catch (e) { if (e && e.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'neon-comet-' + Math.floor(s.score || 0) + '.png';
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      UI.toast(t('over.saved'));
    }, 'image/png');
  };

  // =================================================================== chest opening
  // res = sys.openChest result {rarity, items:[{id,slot,r,lvl,nameKey}], crystals, cons:{id:n}, pity}
  UI.chestAnim = (r, res, onAgain) => {
    const S = UI.u;
    const m = UI.modal(`<div class="chest-stage pop-in" style="position:relative;--rc:var(--r${r})">
        <div class="rays"></div>
        <div class="ttl ${'r' + r + 'c'}" style="font-size:var(--fs2);font-weight:700;text-transform:uppercase">${t('chest.' + r + '.name')}</div>
        <div class="chest-big shake" data-f data-first data-a="open" id="chBig"></div>
        <div class="body dim" id="chTap">${t('chestopen.tap')}</div>
        <div class="rewards" id="chRew" hidden></div>
        <div class="acts" id="chActs" hidden style="display:flex;gap:${S * 3}px"></div></div>`,
    { dismiss: false, back: () => { if (opened) UI.closeModal(m); }, on: a => { if (a === 'open') open(); if (a === 'close') UI.closeModal(m); if (a === 'again') { UI.closeModal(m, true); onAgain && onAgain(); } } });
    const big = m.querySelector('#chBig');
    const has = NC.assets && NC.assets.has && NC.assets.has('chest_open_' + r);
    const frame = f => { const c = has ? NC.assets.icon('chest_open_' + r, 2, f) : NC.assets.icon('chest_' + r, 4); c.className = 'pix'; c.style.width = c.style.height = '100%'; big.replaceChildren(c); };
    frame(0);
    let opened = false;
    function open() {
      if (opened) return; opened = true; big.classList.remove('shake'); m.querySelector('#chTap').hidden = true;
      UI.sfx('chest_open'); UI.buzz(30);
      let f = 0; const iv = setInterval(() => {
        f++; if (has) frame(Math.min(5, f));
        if (f >= 6) {
          clearInterval(iv);
          const fl = document.createElement('div'); fl.className = 'flash'; $('stage').appendChild(fl); setTimeout(() => fl.remove(), 320);
          const best = Math.max(r, ...(res.items || []).map(i => i.r));
          if (best >= 3) UI.sfx('legendary');
          const rew = m.querySelector('#chRew'); rew.hidden = false; m.querySelector('.chest-stage').classList.add('opened');
          rew.innerHTML = (res.items || []).map((it, i) => `<div class="tile" style="animation-delay:${i * 90}ms">${UI.frame(it.r, UI.img('gear_' + it.slot + '_' + it.r))}<span class="cap ${'r' + it.r + 'c'}">${esc(t(it.nameKey))}</span></div>`).join('') +
            (res.crystals ? `<div class="tile" style="animation-delay:${(res.items || []).length * 90}ms"><div class="rf r0" style="--rc:var(--warm);--rcd:var(--warm-d)">${UI.img('ui_crystal', 'ico16')}</div><span class="cap c-warm">+${UI.fmt(res.crystals)}</span></div>` : '') +
            Object.keys(res.cons || {}).map(k => `<div class="tile">${UI.frame(1, UI.img('cons_' + k), { noPips: true, cls: '' })}<span class="cap">x${res.cons[k]} ${esc(t('cons.' + k + '.name'))}</span></div>`).join('');
          const acts = m.querySelector('#chActs'); acts.hidden = false;
          acts.innerHTML = (onAgain ? `<button class="btn warm" data-f data-a="again">${t('chestopen.again')}</button>` : '') + `<button class="btn pri" data-f data-first data-a="close">${t('common.ok')}</button>`;
          if (res.pity) UI.toast(t('rarity.3') + '!', 'warm');
          UI.refocus(true);
        }
      }, 90);
    }
  };

  // =================================================================== daily reward / offline
  UI.dailyPopup = (next) => {
    let st = null; try { st = NC.sys.dailyStatus(); } catch (e) {}
    if (!st || !st.available) { next && next(); return; }
    const m = UI.modal(`<div class="pnl pop-in" style="width:${UI.u * 250}px;max-width:100%"><div class="pnl-h"><span class="t">${t('daily.title')}</span><span class="body dim">${t('daily.streak', { n: st.streak })}</span></div>
      <div class="days">${st.rewards.map((rw, i) => `<div class="day ${i < st.day ? 'got' : ''} ${i === st.day ? 'now' : ''}"><span>${t('daily.day', { n: i + 1 })}</span>${rw.chest != null ? UI.img('chest_' + rw.chest, 'ico16') : rw.cons ? UI.img('cons_' + Object.keys(rw.cons)[0], 'ico16') : UI.img('ui_crystal', 'ico16')}<span class="c-warm">${UI.fmt(rw.cr || 0)}</span></div>`).join('')}</div>
      <div class="row" style="justify-content:space-between">${UI.rewardHtml(st.reward, true)}<button class="btn lg warm" data-f data-first data-a="claim">${t('daily.claim')}</button></div></div>`,
    { dismiss: false, back: () => {}, on: a => {
      if (a !== 'claim') return;
      const r = NC.sys.claimDaily();
      if (UI.err(r)) { UI.sfx('buy'); UI.toast(t('toast.claimed', { n: UI.fmt(r.reward.cr || 0) }), 'warm'); }
      UI.closeModal(m, true); UI.rerender(); next && next();
    } });
  };
  UI.offlinePopup = (next) => {
    let o = null; try { o = NC.sys.offlineRewards(); } catch (e) {}
    if (!o || !(o.crystals > 0)) { next && next(); return; }
    const m = UI.modal(`<div class="pnl pop-in" style="width:${UI.u * 210}px;max-width:100%"><div class="pnl-h"><span class="t">${t('offline.title')}</span></div>
      <div class="msg">${esc(t('offline.text', { t: UI.time(o.minutes * 60) }))}${o.capped ? ' (' + esc(t('offline.cap')) + ')' : ''}</div>
      <div class="row" style="justify-content:space-between"><span class="cr big">${UI.icoCr('ico16')}<b>+${UI.fmt(o.crystals)}</b></span><button class="btn lg warm" data-f data-first data-a="claim">${t('offline.claim')}</button></div></div>`,
    { dismiss: false, back: () => {}, on: a => {
      if (a !== 'claim') return;
      const r = NC.sys.claimOffline(1); if (UI.err(r)) { UI.sfx('buy'); UI.toast(t('toast.claimed', { n: UI.fmt(r.crystals) }), 'warm'); }
      UI.closeModal(m, true); UI.rerender(); next && next();
    } });
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
    const st = TUT[tutI], dev = UI.isTouch() ? 'touch' : (NC.Input && NC.Input.device === 'pad') ? 'pad' : 'kb';
    box.hidden = false;
    box.innerHTML = `<div class="pnl alt pop-in"><div class="row"><span class="c-acc">${t('tut.title')}</span><span class="body dim">${t('tut.step', { a: tutI + 1, b: TUT.length })}</span></div>
      <div class="tt">${esc(t(st.key(dev)))}</div>
      <div class="row"><button class="btn sm ghost" data-a="skip">${t('tut.skip')}</button>${st.wait ? '' : `<button class="btn sm pri" data-a="next">${t('tut.next')}</button>`}</div></div>`;
    box.onclick = e => { const a = e.target.closest('[data-a]'); if (!a) return; UI.sfx('click'); if (a.dataset.a === 'skip') UI.tutEnd(); else UI.tutNext(); };
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
