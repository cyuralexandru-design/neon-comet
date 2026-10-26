'use strict';
// Neon Comet 4.0 (portrait, HD) - start flow: Start -> mode cards (Survival | Story) -> difficulty cards (Easy/Normal/Hard/Nightmare) -> loadout -> run.
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  const t = (k, v) => NC.t(k, v), esc = s => (UI.esc ? UI.esc(String(s)) : String(s));
  // 4.0: HD art (UI.hd) first, old sprite as fallback
  const hdu = id => { try { return (UI.hd && UI.hd(id)) || null; } catch (e) { return null; } };
  const url = id => hdu(id) || (UI.spriteUrl ? UI.spriteUrl(id) : '');
  const card = (spr, label, a, id, cls, sub) => `<button class="md-card ${cls || ''}" data-f data-a="${a}" data-id="${id}">
      <span class="md-img${hdu(spr) ? ' hd' : ''}" style="background-image:url('${url(spr)}')"></span>
      <span class="md-lbl">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>`;

  UI.screens.modes = {
    cls: 'dim modes',
    render(el) {
      el.innerHTML = `<div class="scr-h"><button class="btn back sq" data-f data-a="back">&lt;</button><h2>${esc(t('md.title'))}</h2><span class="sp"></span></div>
        <div class="md-row md-2">${card('mode_survival', 'SURVIVAL', 'mode', 'survival', 'md-r3 first', t('md.survSub'))}${card(hdu('mode_story') || (NC.assets && NC.assets.has && NC.assets.has('mode_story')) ? 'mode_story' : 'mode_soon', t('sui.mode'), 'mode', 'story', 'md-r1', t('md.storySub'))}</div>`;
      const f = el.querySelector('.md-card'); f && f.setAttribute('data-first', '');
    },
    act(a, node) {
      if (a === 'back') return UI.back();
      if (a === 'mode') {
        if (node.dataset.id === 'story') { UI.sfx && UI.sfx('click'); if (UI.screens.story) UI.show('story'); else UI.toast && UI.toast(t('md.soonToast')); return; }
        UI.sfx && UI.sfx('click'); UI.show('diff');
      }
    }
  };

  const DIFFS = [['easy', 'md-r0'], ['normal', 'md-r1'], ['hard', 'md-r3'], ['nightmare', 'md-r4']];
  UI.screens.diff = {
    cls: 'dim modes',
    render(el) {
      el.innerHTML = `<div class="scr-h"><button class="btn back sq" data-f data-a="back">&lt;</button><h2>${esc(t('md.diffTitle'))}</h2><span class="sp"></span></div>
        <div class="md-row md-4">${DIFFS.map(([id, c]) => card('diff_' + id, t('md.d.' + id), 'diff', id, c, t('md.d.' + id + '.sub'))).join('')}</div>`;
      const f = el.querySelectorAll('.md-card')[1]; f && f.setAttribute('data-first', '');
    },
    act(a, node) {
      if (a === 'back') return UI.back();
      if (a === 'diff') {
        const id = node.dataset.id; UI.sfx && UI.sfx('click');
        try { NC.game.diff = id; } catch (e) {}
        const go = (cons) => { UI.launch(cons); };
        if (UI.loadoutPicker) UI.loadoutPicker(go); else go();
      }
    }
  };

  NC.I18N = NC.I18N || {}; NC.I18N.ro = NC.I18N.ro || {}; NC.I18N.en = NC.I18N.en || {};
  Object.assign(NC.I18N.ro, {
    'md.title': 'Alege modul', 'md.survSub': 'Valuri infinite · scor maxim', 'md.storySub': 'Capitole · echipaj · boss-i', 'md.soon': 'In curand', 'md.soonToast': 'Modul nou vine intr-un update viitor',
    'md.diffTitle': 'Alege dificultatea',
    'md.d.easy': 'Easy', 'md.d.normal': 'Normal', 'md.d.hard': 'Hard', 'md.d.nightmare': 'Nightmare',
    'md.d.easy.sub': 'Inamici slabi · cristale x0.7', 'md.d.normal.sub': 'Echilibrat · cristale x1',
    'md.d.hard.sub': 'Inamici duri · cristale x1.5', 'md.d.nightmare.sub': 'Brutal · cristale x2.5'
  });
  Object.assign(NC.I18N.en, {
    'md.title': 'Choose mode', 'md.survSub': 'Endless waves · high score', 'md.storySub': 'Chapters · crew · bosses', 'md.soon': 'Coming soon', 'md.soonToast': 'New mode arrives in a future update',
    'md.diffTitle': 'Choose difficulty',
    'md.d.easy': 'Easy', 'md.d.normal': 'Normal', 'md.d.hard': 'Hard', 'md.d.nightmare': 'Nightmare',
    'md.d.easy.sub': 'Weak enemies · crystals x0.7', 'md.d.normal.sub': 'Balanced · crystals x1',
    'md.d.hard.sub': 'Tough enemies · crystals x1.5', 'md.d.nightmare.sub': 'Brutal · crystals x2.5'
  });

  // home Start button now opens the mode screen (menus.js calls loadoutPicker -> launch directly)
  const css = document.createElement('style');
  css.textContent = `
  .modes{background:var(--bg)}
  .modes .md-row{flex:1;min-height:0;display:grid;gap:12px;padding:8px 14px max(14px,env(safe-area-inset-bottom));width:100%;max-width:480px;margin:0 auto;align-content:center}
  .md-2{grid-template-columns:1fr;grid-auto-rows:minmax(0,1fr);align-content:stretch!important}
  .md-4{grid-template-columns:1fr 1fr;grid-auto-rows:minmax(0,1fr);align-content:stretch!important}
  .md-card{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:10px;border:2px solid var(--line);background:var(--panel);cursor:pointer;min-height:120px;overflow:hidden;
    clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px);transition:transform .12s,border-color .12s}
  .md-2 .md-card{max-height:340px}
  .md-4 .md-card{max-height:300px}
  .md-img{position:absolute;inset:0;background-size:cover;background-position:center;image-rendering:pixelated}
  .md-img.hd{image-rendering:auto}
  .md-card::after{content:'';position:absolute;inset:0;background:linear-gradient(transparent 45%,rgba(5,7,11,.88));pointer-events:none}
  .md-lbl{position:relative;z-index:1;font-family:'NCUI',sans-serif;font-weight:800;font-size:clamp(18px,5.4vw,26px);color:var(--ink);letter-spacing:.06em;text-transform:uppercase;
    text-shadow:0 2px 0 #000,0 0 8px #000;text-align:center;display:flex;flex-direction:column;gap:4px}
  .md-4 .md-lbl{font-size:clamp(15px,4.4vw,20px)}
  .md-lbl small{font-weight:600;font-size:12px;letter-spacing:0;text-transform:none;color:var(--dim)}
  .md-card:hover,.md-card:focus,.md-card.foc,.md-card.pad-focus{transform:scale(1.02);border-color:var(--amber)}
  .md-r0{border-color:var(--r0)}.md-r1{border-color:var(--r1)}.md-r3{border-color:var(--r3)}.md-r4{border-color:var(--r4)}
  .md-lock .md-img{filter:grayscale(.6) brightness(.6)}`;
  document.head.appendChild(css);
})(window.NC = window.NC || {});
