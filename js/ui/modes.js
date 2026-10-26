'use strict';
// Neon Comet 3.1.1 - start flow: Start -> mode cards (Survival | Coming soon) -> difficulty cards (Easy/Normal/Hard/Nightmare) -> loadout -> run.
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  const t = (k, v) => NC.t(k, v), esc = s => (UI.esc ? UI.esc(String(s)) : String(s));
  const url = id => (UI.spriteUrl ? UI.spriteUrl(id) : '');
  const card = (spr, label, a, id, cls, sub) => `<button class="md-card ${cls || ''}" data-f data-a="${a}" data-id="${id}">
      <span class="md-img" style="background-image:url('${url(spr)}')"></span>
      <span class="md-lbl">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>`;

  UI.screens.modes = {
    cls: 'dim modes',
    render(el) {
      el.innerHTML = `<div class="scr-h"><button class="btn back sq" data-f data-a="back">&lt;</button><h2>${esc(t('md.title'))}</h2><span class="sp"></span></div>
        <div class="md-row md-2">${card('mode_survival', 'SURVIVAL', 'mode', 'survival', 'md-r3 first')}${card('mode_soon', t('md.soon'), 'mode', 'soon', 'md-lock')}</div>`;
      const f = el.querySelector('.md-card'); f && f.setAttribute('data-first', '');
    },
    act(a, node) {
      if (a === 'back') return UI.back();
      if (a === 'mode') {
        if (node.dataset.id === 'soon') { UI.toast && UI.toast(t('md.soonToast')); UI.sfx && UI.sfx('error'); return; }
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
    'md.title': 'Alege modul', 'md.soon': 'In curand', 'md.soonToast': 'Modul nou vine intr-un update viitor',
    'md.diffTitle': 'Alege dificultatea',
    'md.d.easy': 'Easy', 'md.d.normal': 'Normal', 'md.d.hard': 'Hard', 'md.d.nightmare': 'Nightmare',
    'md.d.easy.sub': 'Inamici slabi · cristale x0.7', 'md.d.normal.sub': 'Echilibrat · cristale x1',
    'md.d.hard.sub': 'Inamici duri · cristale x1.5', 'md.d.nightmare.sub': 'Brutal · cristale x2.5'
  });
  Object.assign(NC.I18N.en, {
    'md.title': 'Choose mode', 'md.soon': 'Coming soon', 'md.soonToast': 'New mode arrives in a future update',
    'md.diffTitle': 'Choose difficulty',
    'md.d.easy': 'Easy', 'md.d.normal': 'Normal', 'md.d.hard': 'Hard', 'md.d.nightmare': 'Nightmare',
    'md.d.easy.sub': 'Weak enemies · crystals x0.7', 'md.d.normal.sub': 'Balanced · crystals x1',
    'md.d.hard.sub': 'Tough enemies · crystals x1.5', 'md.d.nightmare.sub': 'Brutal · crystals x2.5'
  });

  // home Start button now opens the mode screen (menus.js calls loadoutPicker -> launch directly)
  const css = document.createElement('style');
  css.textContent = `
  .modes .md-row{flex:1;display:flex;gap:18px;justify-content:center;align-items:center;padding:8px 16px 16px}
  .md-card{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;border:2px solid var(--line);background:var(--panel);cursor:pointer;
    clip-path:polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px);transition:transform .12s,border-color .12s}
  .md-2 .md-card{height:min(72vh,300px);aspect-ratio:72/104}
  .md-4 .md-card{height:min(68vh,270px);aspect-ratio:72/104}
  .md-img{position:absolute;inset:6px;background-size:cover;background-position:center;image-rendering:pixelated}
  .md-lbl{position:relative;z-index:1;font-family:'NCPixel','NCUI',sans-serif;font-weight:700;font-size:clamp(14px,3.2vh,22px);color:var(--ink);letter-spacing:1px;
    text-shadow:0 2px 0 #000,0 0 8px #000;text-align:center;display:flex;flex-direction:column;gap:4px}
  .md-lbl small{font-family:'NCUI',sans-serif;font-weight:600;font-size:11px;letter-spacing:0;color:var(--dim)}
  .md-card:hover,.md-card:focus,.md-card.foc{transform:translateY(-4px);border-color:var(--amber)}
  .md-r0{border-color:var(--r0)}.md-r1{border-color:var(--r1)}.md-r3{border-color:var(--r3)}.md-r4{border-color:var(--r4)}
  .md-lock .md-img{filter:grayscale(.6) brightness(.6)}`;
  document.head.appendChild(css);
})(window.NC = window.NC || {});
