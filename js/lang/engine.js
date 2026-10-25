'use strict';
// Neon Comet 3.1 - engine strings (agent engine). RO without diacritics + EN.
// Alerts carry only keys (`textKey: 'eng.al.<type>'`, nameKey...) - the HUD translates at draw time, so a language switch mid-run is safe.
(function (NC) {
  NC.I18N = NC.I18N || {}; NC.I18N.ro = NC.I18N.ro || {}; NC.I18N.en = NC.I18N.en || {};
  Object.assign(NC.I18N.ro, {
    'eng.al.boss': 'Boss in apropiere', 'eng.al.bossDown': 'Boss distrus', 'eng.al.elite': 'Inamic de elita',
    'eng.al.event': 'Eveniment in sector', 'eng.al.threat': 'Amenintare noua', 'eng.al.chest': 'Cufar gasit',
    'eng.al.evolved': 'Arma a evoluat', 'eng.al.supernova': 'Supernova', 'eng.al.rebirth': 'Renastere',
    'eng.sector': 'Sector {n}',
  });
  Object.assign(NC.I18N.en, {
    'eng.al.boss': 'Boss incoming', 'eng.al.bossDown': 'Boss destroyed', 'eng.al.elite': 'Elite enemy',
    'eng.al.event': 'Sector event', 'eng.al.threat': 'New threat', 'eng.al.chest': 'Chest found',
    'eng.al.evolved': 'Weapon evolved', 'eng.al.supernova': 'Supernova', 'eng.al.rebirth': 'Rebirth',
    'eng.sector': 'Sector {n}',
  });
})(window.NC = window.NC || {});
