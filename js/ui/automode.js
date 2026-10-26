'use strict';
// Neon Comet 4.0 - hidden AUTO card pick. On the level-up cards screen there is an invisible button bottom-right;
// 5 quick taps toggle auto mode (toast "Auto activat"/"Auto dezactivat"). From run level 3 on, auto picks the best card.
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  const KEY = 'nc.autoCards';
  let on = false; try { on = localStorage.getItem(KEY) === '1'; } catch (e) {}
  let taps = 0, tapT = 0, timer = null;
  const lvl = () => { try { return (NC.game.run && NC.game.run.runLvl) || NC.hud.runLvl || 1; } catch (e) { return 1; } };
  const t = k => NC.t(k);

  function pickBest() {
    const cards = [...document.querySelectorAll('[data-a="pick"][data-id]')]; if (!cards.length) return;
    let best = cards[0], bs = -1;
    const offers = (NC.game.run && NC.game.run.offered) || [];
    for (const el of cards) {
      const o = offers.find(x => x.id === el.dataset.id) || {};
      const sc = (o.special ? 100 : 0) + (o.r || 0) * 10 - (o.lvl || 0) * 0.1 + (/^evo_/.test(o.id || '') ? 50 : 0);
      if (sc > bs) { bs = sc; best = el; }
    }
    best.click();
  }
  function schedule() {
    clearTimeout(timer);
    if (!on || lvl() < 3) return;
    timer = setTimeout(() => { if (on && document.querySelector('[data-a="pick"]')) pickBest(); }, 700);
  }
  function addButton() {
    const host = document.querySelector('[data-a="pick"]'); if (!host) return;
    const scr = host.closest('.ov-cardsx, .scr, .screen, [class*="cards"]') || document.getElementById('screens');
    if (!scr || scr.querySelector('.nc-autobtn')) return;
    const b = document.createElement('div'); b.className = 'nc-autobtn';
    // 4.0 portrait: invisible hot zone in the bottom-right corner of the cards screen (below/beside the reroll row)
    b.style.cssText = 'position:absolute;right:0;bottom:0;width:22%;height:9%;min-width:72px;min-height:56px;z-index:50;background:transparent;';
    b.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation(); ev.preventDefault();
      const now = Date.now(); if (now - tapT > 2500) taps = 0; tapT = now; taps++;
      if (taps >= 5) {
        taps = 0; on = !on; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
        UI.toast && UI.toast(t(on ? 'auto.on' : 'auto.off'), on ? 'warm' : '');
        if (on && lvl() < 3) UI.toast && UI.toast(t('auto.lvl3'));
        schedule();
      }
    });
    scr.appendChild(b);
  }
  const orig = UI.showCards;
  UI.showCards = function () {
    const r = orig ? orig.apply(this, arguments) : undefined;
    setTimeout(() => { addButton(); schedule(); }, 60);
    return r;
  };
  setInterval(() => { if (!document.querySelector('[data-a="pick"]')) document.querySelectorAll('.nc-autobtn').forEach(x => x.remove()); }, 400);
  NC.I18N = NC.I18N || {}; NC.I18N.ro = NC.I18N.ro || {}; NC.I18N.en = NC.I18N.en || {};
  Object.assign(NC.I18N.ro, { 'auto.on': 'Auto activat', 'auto.off': 'Auto dezactivat', 'auto.lvl3': 'Auto porneste de la nivelul 3' });
  Object.assign(NC.I18N.en, { 'auto.on': 'Auto enabled', 'auto.off': 'Auto disabled', 'auto.lvl3': 'Auto starts from level 3' });
})(window.NC = window.NC || {});
