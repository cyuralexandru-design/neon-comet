'use strict';
// Neon Comet 3.1 - input/audio strings (agent input). RO without diacritics + EN.
(function (NC) {
  NC.I18N = NC.I18N || {}; NC.I18N.ro = NC.I18N.ro || {}; NC.I18N.en = NC.I18N.en || {};
  Object.assign(NC.I18N.ro, {
    'in.padLayoutSony': 'R2 dash, X/Patrat/Triunghi consumabile, Options pauza',
    'in.padLayout': 'RT dash, A/X/Y consumabile, Start pauza',
    'in.audioTap': 'Sunet blocat de browser: atinge ecranul sau apasa o tasta',
    'tut.dashPad': 'Apasa R2 pentru dash',
    'tut.consPad': 'X, Patrat si Triunghi folosesc consumabilele',
  });
  Object.assign(NC.I18N.en, {
    'in.padLayoutSony': 'R2 dash, Cross/Square/Triangle consumables, Options pause',
    'in.padLayout': 'RT dash, A/X/Y consumables, Start pause',
    'in.audioTap': 'Sound blocked by the browser: tap the screen or press a key',
    'tut.dashPad': 'Press R2 to dash',
    'tut.consPad': 'Cross, Square and Triangle use consumables',
  });
})(window.NC = window.NC || {});
