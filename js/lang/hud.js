'use strict';
// Neon Comet 3.1 - HUD strings (agent hud). RO without diacritics + EN.
(function (NC) {
  NC.I18N = NC.I18N || {}; NC.I18N.ro = NC.I18N.ro || {}; NC.I18N.en = NC.I18N.en || {};
  Object.assign(NC.I18N.ro, {
    'hud.lv': 'Nv', 'hud.storyLv': 'Nivel {id}', 'hud.wave': 'Val {w}/{n}', 'hud.sec': 'Sector {n}', 'hud.secBig': 'Sector {n}', 'hud.comboN': 'Combo x{n}',
    'hud.dashL': 'Dash', 'hud.pauseL': 'Pauza', 'hud.fpsN': '{n} FPS', 'hud.keySpace': 'Spatiu',
    'hud.hpL': 'Viata', 'hud.shdL': 'Scut', 'hud.xpL': 'Experienta', 'hud.crL': 'Cristale',
    'hud.al.boss': 'Boss', 'hud.al.bossDown': 'Boss invins', 'hud.al.elite': 'Elita', 'hud.al.event': 'Eveniment',
    'hud.al.threat': 'Inamici noi', 'hud.al.chest': 'Cufar', 'hud.al.evolved': 'Evolutie', 'hud.al.supernova': 'Supernova',
    'hud.al.rebirth': 'Renastere',
  });
  Object.assign(NC.I18N.en, {
    'hud.lv': 'Lv', 'hud.storyLv': 'Level {id}', 'hud.wave': 'Wave {w}/{n}', 'hud.sec': 'Sector {n}', 'hud.secBig': 'Sector {n}', 'hud.comboN': 'Combo x{n}',
    'hud.dashL': 'Dash', 'hud.pauseL': 'Pause', 'hud.fpsN': '{n} FPS', 'hud.keySpace': 'Space',
    'hud.hpL': 'Health', 'hud.shdL': 'Shield', 'hud.xpL': 'Experience', 'hud.crL': 'Crystals',
    'hud.al.boss': 'Boss', 'hud.al.bossDown': 'Boss defeated', 'hud.al.elite': 'Elite', 'hud.al.event': 'Event',
    'hud.al.threat': 'New enemies', 'hud.al.chest': 'Chest', 'hud.al.evolved': 'Evolved', 'hud.al.supernova': 'Supernova',
    'hud.al.rebirth': 'Rebirth',
  });
})(window.NC = window.NC || {});
