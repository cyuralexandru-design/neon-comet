'use strict';
// Neon Comet 3.1 - i18n keys of the overlays agent (loading, pause, level-up cards, revive, game over, chests).
(function (NC) {
  NC.I18N = NC.I18N || {}; NC.I18N.ro = NC.I18N.ro || {}; NC.I18N.en = NC.I18N.en || {};
  Object.assign(NC.I18N.ro, {
    'ov.load.text': 'Se incarca', 'ov.load.ready': 'Gata de zbor',
    'ov.on': 'ON', 'ov.off': 'OFF', 'ov.lv': 'Nv {n}', 'ov.max': 'MAX',
    'ov.hint.select': 'Alege', 'ov.hint.back': 'Inapoi', 'ov.hint.resume': 'Continua',
    'ov.pause.title': 'Pauza', 'ov.pause.quick': 'Setari rapide', 'ov.pause.music': 'Muzica', 'ov.pause.sounds': 'Sunete',
    'ov.pause.vibe': 'Vibratii', 'ov.pause.resume': 'Continua', 'ov.pause.settings': 'Setari', 'ov.pause.quit': 'Inapoi la meniu',
    'ov.pause.quitConfirm': 'Iesi din runda? Pastrezi cristalele adunate.', 'ov.pause.stats': 'Statistici', 'ov.pause.skills': 'Abilitati',
    'ov.pause.noSkills': 'Nicio abilitate inca. Alegi carti cand urci de nivel.',
    'ov.st.maxHp': 'Viata max', 'ov.st.atk': 'Daune / glont', 'ov.st.shd': 'Scut', 'ov.st.dps': 'Daune/sec', 'ov.st.crit': 'Sansa critica',
    'ov.st.critDmg': 'Daune critice', 'ov.st.vamp': 'Furt de viata', 'ov.st.speed': 'Viteza', 'ov.st.lvl': 'Nivel runda',
    'ov.st.time': 'Timp', 'ov.st.score': 'Scor', 'ov.st.kills': 'Inamici',
    'ov.cards.title': 'Nivel nou', 'ov.cards.sub': 'Alege o imbunatatire', 'ov.cards.runLvl': 'Nivel runda {n}',
    'ov.cards.new': 'Nou', 'ov.cards.evo': 'Evolutie', 'ov.cards.special': 'Special', 'ov.cards.lvl': 'Nivel',
    'ov.cards.reroll': 'Schimba cartile', 'ov.cards.free': 'Gratis',
    'ov.rev.title': 'Nava distrusa', 'ov.rev.sub': 'Reinvie si continua runda', 'ov.rev.btn': 'Reinvie', 'ov.rev.free': 'Gratis',
    'ov.rev.left': '{n} reinvieri ramase', 'ov.rev.giveUp': 'Renunta', 'ov.rev.none': 'Nu mai ai reinvieri in aceasta runda',
    'ov.over.title': 'Runda incheiata', 'ov.over.score': 'Scor', 'ov.over.best': 'Record', 'ov.over.newBest': 'Record nou',
    'ov.over.earned': 'Cristale castigate', 'ov.over.pilot': 'Nivel pilot', 'ov.over.details': 'Detalii runda',
    'ov.over.kills': 'Inamici distrusi', 'ov.over.sector': 'Sector atins', 'ov.over.bosses': 'Boss-i invinsi', 'ov.over.combo': 'Combo maxim',
    'ov.over.time': 'Timp', 'ov.over.xp': 'XP pilot', 'ov.over.revives': 'Reinvieri', 'ov.over.chests': 'Cufere gasite',
    'ov.over.again': 'Inca o data', 'ov.over.menu': 'Meniu', 'ov.over.hangar': 'Hangar', 'ov.over.share': 'Distribuie',
    'ov.over.shareText': 'Am facut {s} puncte in Neon Comet! Poti mai mult?', 'ov.over.saved': 'Imagine salvata',
    'ov.chest.tap': 'Atinge cufarul ca sa il deschizi', 'ov.chest.rewards': 'Recompense', 'ov.chest.again': 'Inca unul',
    'ov.chest.ok': 'OK', 'ov.chest.pity': 'Garantie legendara activata',
    'ov.sum.title': '{n} cufere deschise', 'ov.sum.items': '{n} obiecte', 'ov.sum.gear': 'Echipament', 'ov.sum.crystals': 'Cristale',
    'ov.sum.cons': 'Consumabile', 'ov.sum.close': 'Colecteaza',
    'ov.share.sector': 'Sector', 'ov.share.bosses': 'Boss-i',
  });
  Object.assign(NC.I18N.en, {
    'ov.load.text': 'Loading', 'ov.load.ready': 'Ready for launch',
    'ov.on': 'ON', 'ov.off': 'OFF', 'ov.lv': 'Lv {n}', 'ov.max': 'MAX',
    'ov.hint.select': 'Select', 'ov.hint.back': 'Back', 'ov.hint.resume': 'Resume',
    'ov.pause.title': 'Paused', 'ov.pause.quick': 'Quick settings', 'ov.pause.music': 'Music', 'ov.pause.sounds': 'Sounds',
    'ov.pause.vibe': 'Vibration', 'ov.pause.resume': 'Continue', 'ov.pause.settings': 'Settings', 'ov.pause.quit': 'Back to menu',
    'ov.pause.quitConfirm': 'Quit the run? You keep the crystals you collected.', 'ov.pause.stats': 'Stats', 'ov.pause.skills': 'Skills',
    'ov.pause.noSkills': 'No skills yet. You pick cards when you level up.',
    'ov.st.maxHp': 'Max HP', 'ov.st.atk': 'Damage / shot', 'ov.st.shd': 'Shield', 'ov.st.dps': 'Damage/sec', 'ov.st.crit': 'Crit chance',
    'ov.st.critDmg': 'Crit damage', 'ov.st.vamp': 'Lifesteal', 'ov.st.speed': 'Speed', 'ov.st.lvl': 'Run level',
    'ov.st.time': 'Time', 'ov.st.score': 'Score', 'ov.st.kills': 'Kills',
    'ov.cards.title': 'Level up', 'ov.cards.sub': 'Choose an upgrade', 'ov.cards.runLvl': 'Run level {n}',
    'ov.cards.new': 'New', 'ov.cards.evo': 'Evolution', 'ov.cards.special': 'Special', 'ov.cards.lvl': 'Level',
    'ov.cards.reroll': 'Reroll cards', 'ov.cards.free': 'Free',
    'ov.rev.title': 'Ship destroyed', 'ov.rev.sub': 'Revive and keep your run going', 'ov.rev.btn': 'Revive', 'ov.rev.free': 'Free',
    'ov.rev.left': '{n} revives left', 'ov.rev.giveUp': 'Give up', 'ov.rev.none': 'No revives left this run',
    'ov.over.title': 'Run over', 'ov.over.score': 'Score', 'ov.over.best': 'Best', 'ov.over.newBest': 'New best',
    'ov.over.earned': 'Crystals earned', 'ov.over.pilot': 'Pilot level', 'ov.over.details': 'Run details',
    'ov.over.kills': 'Enemies destroyed', 'ov.over.sector': 'Sector reached', 'ov.over.bosses': 'Bosses defeated', 'ov.over.combo': 'Max combo',
    'ov.over.time': 'Time', 'ov.over.xp': 'Pilot XP', 'ov.over.revives': 'Revives', 'ov.over.chests': 'Chests found',
    'ov.over.again': 'Play again', 'ov.over.menu': 'Menu', 'ov.over.hangar': 'Hangar', 'ov.over.share': 'Share',
    'ov.over.shareText': 'I scored {s} in Neon Comet! Can you beat it?', 'ov.over.saved': 'Image saved',
    'ov.chest.tap': 'Tap the chest to open it', 'ov.chest.rewards': 'Rewards', 'ov.chest.again': 'One more',
    'ov.chest.ok': 'OK', 'ov.chest.pity': 'Legendary guarantee triggered',
    'ov.sum.title': '{n} chests opened', 'ov.sum.items': '{n} items', 'ov.sum.gear': 'Gear', 'ov.sum.crystals': 'Crystals',
    'ov.sum.cons': 'Consumables', 'ov.sum.close': 'Collect',
    'ov.share.sector': 'Sector', 'ov.share.bosses': 'Bosses',
  });
})(window.NC = window.NC || {});
// 4.0 fix pass
(function (NC) {
  Object.assign(NC.I18N.ro, { 'ov.sum.dups': '{n} duplicate -> minereu' });
  Object.assign(NC.I18N.en, { 'ov.sum.dups': '{n} duplicates -> ore' });
})(window.NC = window.NC || {});
