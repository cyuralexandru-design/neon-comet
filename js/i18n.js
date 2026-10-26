'use strict';
// Neon Comet 3.1 - i18n (agent i18n). NC.lang, NC.t(key, vars), NC.setLang, NC.onLang, NC.tLive, NC.tEl, NC.I18N = {ro, en}.
// RO text has NO diacritics (owner request). Extension keys: js/lang/<agent>.js. Checker: dev/integration/i18n_check.js.
(function (NC) {
  const ro = {
    // ---------- common ----------
    'common.ok': 'OK', 'common.cancel': 'Anuleaza', 'common.back': 'Inapoi', 'common.close': 'Inchide',
    'common.yes': 'Da', 'common.no': 'Nu', 'common.claim': 'Revendica', 'common.claimed': 'Revendicat',
    'common.buy': 'Cumpara', 'common.upgrade': 'Upgrade', 'common.equip': 'Echipeaza', 'common.equipped': 'Echipat',
    'common.owned': 'Detinut', 'common.locked': 'Blocat', 'common.max': 'MAX', 'common.lvl': 'Nv {n}',
    'common.sell': 'Vinde', 'common.merge': 'Uneste', 'common.open': 'Deschide', 'common.free': 'Gratis',
    'common.select': 'Alege', 'common.confirm': 'Confirma', 'common.next': 'Urmatorul', 'common.skip': 'Sari peste',
    'common.done': 'Gata', 'common.crystals': 'Cristale', 'common.power': 'Putere', 'common.level': 'Nivel',
    'common.new': 'NOU', 'common.on': 'Pornit', 'common.off': 'Oprit', 'common.details': 'Detalii', 'common.unequip': 'Scoate', 'common.x': 'x{n}',
    'common.reward': 'Recompensa', 'common.progress': '{a} / {b}', 'common.loading': 'Se incarca',
    // ---------- home ----------
    'menu.start': 'Start', 'menu.hangar': 'Hangar', 'menu.missions': 'Misiuni', 'menu.achievements': 'Realizari',
    'menu.settings': 'Setari', 'menu.account': 'Cont', 'menu.exit': 'Iesire', 'menu.pilot': 'Pilot',
    'menu.tagline': 'Shooter spatial pixel', 'menu.best': 'Record', 'menu.version': 'v4.0',
    'menu.pilotLvl': 'Pilot Nv {n}',
    // ---------- hangar ----------
    'hangar.title': 'Hangar',
    'tab.ships': 'Nave', 'tab.weapons': 'Arme', 'tab.turrets': 'Turele', 'tab.companions': 'Insotitori',
    'tab.gear': 'Echipament', 'tab.consumables': 'Consumabile', 'tab.chests': 'Cufere',
    'slot.weapon': 'Arma', 'slot.turret': 'Turela', 'slot.companion': 'Insotitor', 'slot.armor': 'Armura',
    'slot.gen': 'Generator', 'slot.core': 'Nucleu', 'slot.boost': 'Propulsor', 'slot.empty': 'Gol',
    'hangar.buyFor': 'Cumpara {p}', 'hangar.upFor': 'Upgrade {p}', 'hangar.maxed': 'Nivel maxim',
    'hangar.perk': 'Abilitate', 'hangar.stats': 'Statistici', 'hangar.noGear': 'Nu ai echipament. Deschide cufere!',
    'hangar.filterAll': 'Toate', 'hangar.sortRarity': 'Raritate', 'hangar.set': 'Set: {s}',
    'detail.before': 'Acum', 'detail.after': 'Dupa', 'detail.lvl': 'Nivel {a} / {b}', 'detail.unlockAt': 'Raritate {r}',
    'merge.title': 'Unire', 'merge.pick': 'Alege 3 obiecte cu acelasi slot si aceeasi raritate',
    'merge.btn': 'Uneste ({n}/3)', 'merge.result': 'Rezultat: {r}', 'merge.ultraMax': 'Ultra este raritatea maxima',
    'merge.mode': 'Unire', 'merge.done': 'Obiect nou: {r}!',
    'sell.mode': 'Vanzare', 'sell.selected': '{n} selectate', 'sell.btn': 'Vinde ({p})',
    'sell.allCommon': 'Vinde tot ce e comun', 'sell.confirm': 'Vinzi {n} obiecte pentru {p} cristale?',
    'sell.none': 'Nimic de vandut',
    'shop.have': 'Ai {n}', 'shop.max': 'Maxim {n}', 'shop.buy1': '+1  {p}',
    'chest.owned': 'Ai {n}', 'chest.buyOpen': 'Cumpara {p}', 'chest.openOwned': 'Deschide ({n})',
    'chest.pity': 'Garantat legendar in {n} cufere',
    // ---------- rarities ----------
    'rarity.0': 'Comun', 'rarity.1': 'Rar', 'rarity.2': 'Epic', 'rarity.3': 'Legendar', 'rarity.4': 'Ultra',
    // ---------- stats ----------
    'stat.hp': 'Viata', 'stat.atk': 'Atac', 'stat.shd': 'Scut', 'stat.rate': 'Cadenta', 'stat.speed': 'Viteza',
    'stat.crit': 'Critic', 'stat.dps': 'DPS', 'stat.cr': 'Cristale', 'stat.xp': 'XP', 'stat.dash': 'Dash',
    'stat.regen': 'Regenerare', 'stat.pierce': 'Strapungere', 'stat.range': 'Raza', 'stat.dmg': 'Daune',
    'stat.evade': 'Evitare', 'stat.power': 'Putere',
    // ---------- ships ----------
    'ship.vanator.name': 'Vanator', 'ship.vanator.perk': 'Echilibrat: +5% la toate statisticile',
    'ship.scorpion.name': 'Scorpion', 'ship.scorpion.perk': 'Rapid: +15% viteza',
    'ship.falcon.name': 'Falcon', 'ship.falcon.perk': 'Ochi de soim: +8% critic',
    'ship.dart.name': 'Dart', 'ship.dart.perk': 'Usor: +20% viteza, -10% viata',
    'ship.nova.name': 'Nova', 'ship.nova.perk': 'Energie: +15% cadenta',
    'ship.vortex.name': 'Vortex', 'ship.vortex.perk': 'Scut intarit: +25% scut',
    'ship.lynx.name': 'Lynx', 'ship.lynx.perk': 'Agil: dash -25% timp',
    'ship.comet.name': 'Comet', 'ship.comet.perk': 'Colector: +20% cristale',
    'ship.fregata.name': 'Fregata', 'ship.fregata.perk': 'Blindata: +30% viata',
    'ship.aegis.name': 'Aegis', 'ship.aegis.perk': 'Tanc: scutul se regenereaza dublu',
    'ship.specter.name': 'Specter', 'ship.specter.perk': 'Fantoma: +10% critic, 10% evitare',
    'ship.raptor.name': 'Raptor', 'ship.raptor.perk': 'Pradator: +20% daune',
    'ship.umbra.name': 'Umbra', 'ship.umbra.perk': 'Invizibila: primul atac e mereu critic',
    'ship.solaris.name': 'Solaris', 'ship.solaris.perk': 'Putere solara: +25% atac',
    'ship.valkyrie.name': 'Valkyrie', 'ship.valkyrie.perk': 'Completa: +12% la toate',
    'ship.tempest.name': 'Tempest', 'ship.tempest.perk': 'Furtuna: +30% cadenta',
    'ship.imperial.name': 'Imperial', 'ship.imperial.perk': 'Imperiu: +20% la toate',
    'ship.eclipse.name': 'Eclipse', 'ship.eclipse.perk': 'Eclipsa: critic +25%, daune critice x2.5',
    'ship.phoenix.name': 'Phoenix', 'ship.phoenix.perk': 'Renastere: reinvie automat o data pe runda',
    'ship.oblivion.name': 'Oblivion', 'ship.oblivion.perk': 'Neant: DPS maxim, +40% daune',
    // ---------- weapons ----------
    'wpn.laser.name': 'Laser', 'wpn.laser.desc': 'Raza rapida, o singura tinta',
    'wpn.plasma.name': 'Plasma', 'wpn.plasma.desc': 'Sfere lente care strapung',
    'wpn.missile.name': 'Rachete', 'wpn.missile.desc': 'Rachete ghidate cu explozie mica',
    'wpn.rail.name': 'Railgun', 'wpn.rail.desc': 'Linie incarcata care strapunge tot',
    'wpn.flame.name': 'Aruncator flacari', 'wpn.flame.desc': 'Con scurt de foc, arde in timp',
    'wpn.laser.evo': 'Prisma', 'wpn.plasma.evo': 'Nova Orb', 'wpn.missile.evo': 'Roi',
    'wpn.rail.evo': 'Anihilator', 'wpn.flame.evo': 'Infern', 'wpn.evolved': 'Arma a evoluat: {w}!',
    // ---------- turrets / companions ----------
    'tur.pulse.name': 'Drona Puls', 'tur.pulse.desc': 'Trage impulsuri rapide',
    'tur.rocket.name': 'Drona Racheta', 'tur.rocket.desc': 'Lanseaza rachete mici',
    'tur.arc.name': 'Drona Fulger', 'tur.arc.desc': 'Fulgere care sar intre inamici',
    'tur.beam.name': 'Drona Raza', 'tur.beam.desc': 'Raza continua de energie',
    'comp.wing.name': 'Aripa', 'comp.wing.desc': 'Zboara langa tine si trage',
    'comp.orb.name': 'Orbita', 'comp.orb.desc': 'Se roteste in jurul navei',
    'comp.guardian.name': 'Gardian', 'comp.guardian.desc': 'Blocheaza gloante',
    'comp.phantom.name': 'Fantoma', 'comp.phantom.desc': 'Ataca din umbra, critic mare',
    // ---------- gear / sets ----------
    'gear.slot.armor': 'Armura', 'gear.slot.gen': 'Generator scut', 'gear.slot.core': 'Modul nucleu', 'gear.slot.boost': 'Propulsor',
    'set.titan.name': 'Titan', 'set.titan.b2': '2: +10% viata', 'set.titan.b4': '4: +20% viata si regenerare scut',
    'set.fantoma.name': 'Fantoma', 'set.fantoma.b2': '2: +8% critic', 'set.fantoma.b4': '4: +15% viteza, dash -20%',
    'set.tezaur.name': 'Tezaur', 'set.tezaur.b2': '2: +15% cristale', 'set.tezaur.b4': '4: +30% cristale, +20% XP',
    // ---------- consumables ----------
    'cons.mine.name': 'Mina galactica', 'cons.mine.desc': 'Curata ecranul de inamici normali',
    'cons.shield.name': 'Scut 10s', 'cons.shield.desc': 'Bula invulnerabila 10 secunde',
    'cons.magnet.name': 'Magnet', 'cons.magnet.desc': 'Atrage toate obiectele 15 secunde',
    'cons.x2.name': 'Cristale x2', 'cons.x2.desc': 'Cristale duble 30 secunde',
    'cons.repair.name': 'Reparatii', 'cons.repair.desc': 'Vindeca 50% din viata',
    // ---------- chests ----------
    'chest.0.name': 'Cufar comun', 'chest.1.name': 'Cufar rar', 'chest.2.name': 'Cufar epic',
    'chest.3.name': 'Cufar legendar', 'chest.4.name': 'Cufar ultra',
    'chestopen.tap': 'Atinge pentru a deschide', 'chestopen.rewards': 'Recompense', 'chestopen.again': 'Inca unul',
    // ---------- cards ----------
    'card.dmg.name': 'Daune', 'card.dmg.desc': '+15% daune',
    'card.rate.name': 'Cadenta', 'card.rate.desc': '+12% viteza de tragere',
    'card.gun.name': 'Tun extra', 'card.gun.desc': '+1 proiectil',
    'card.pierce.name': 'Strapungere', 'card.pierce.desc': 'Proiectilele trec prin +1 inamic',
    'card.bounce.name': 'Ricoseu', 'card.bounce.desc': 'Proiectilele ricoseaza o data',
    'card.missile.name': 'Rachete', 'card.missile.desc': 'Lanseaza rachete ghidate',
    'card.orbit.name': 'Orbitale', 'card.orbit.desc': 'Sfere care se rotesc in jurul navei',
    'card.shield.name': 'Scut', 'card.shield.desc': '+20% scut maxim',
    'card.heal.name': 'Vindecare', 'card.heal.desc': 'Vindeca 30% si +10% viata maxima',
    'card.magnet.name': 'Magnet', 'card.magnet.desc': '+40% raza de colectare',
    'card.speed.name': 'Viteza', 'card.speed.desc': '+10% viteza navei',
    'card.crit.name': 'Critic', 'card.crit.desc': '+6% sansa de critic',
    'card.vamp.name': 'Vampir', 'card.vamp.desc': 'Recuperezi viata din daune',
    'card.evo_laser.name': 'Evolutie: Prisma', 'card.evo_laser.desc': 'La Nv 5 laserul se desparte',
    'card.evo_plasma.name': 'Evolutie: Nova Orb', 'card.evo_plasma.desc': 'La Nv 5 sferele explodeaza',
    'card.evo_missile.name': 'Evolutie: Roi', 'card.evo_missile.desc': 'La Nv 5 tragi un roi de rachete',
    'card.evo_rail.name': 'Evolutie: Anihilator', 'card.evo_rail.desc': 'La Nv 5 raza sare in lant',
    'card.evo_flame.name': 'Evolutie: Infern', 'card.evo_flame.desc': 'La Nv 5 con mai mare si ardere',
    'cards.title': 'Nivel nou!', 'cards.sub': 'Alege o imbunatatire', 'cards.lvl': 'Nv {n}',
    'cards.reroll': 'Schimba', 'cards.rerollFree': 'Schimba (gratis)', 'cards.evo': 'EVOLUTIE', 'cards.new': 'NOU',
    // ---------- bosses / enemies / world ----------
    'boss.colos.name': 'Colosul', 'boss.nucleu.name': 'Nucleul', 'boss.leviatan.name': 'Leviatanul',
    'boss.stup.name': 'Stupul', 'boss.imparat.name': 'Imparatul',
    'mboss.1.name': 'Sentinela', 'mboss.2.name': 'Vanatorul rosu', 'mboss.3.name': 'Fortareata',
    'biome.nebula.name': 'Nebuloasa', 'biome.asteroid.name': 'Centura de asteroizi', 'biome.ion.name': 'Furtuna ionica', 'biome.station.name': 'Statia',
    'event.asteroids.name': 'Camp de asteroizi', 'event.asteroids.desc': 'Ocoleste stancile!',
    'event.ionstorm.name': 'Furtuna ionica', 'event.ionstorm.desc': 'Scutul nu se regenereaza',
    'event.blackhole.name': 'Gaura neagra', 'event.blackhole.desc': 'Gravitatia te trage',
    'banner.boss': 'Boss!', 'banner.bossDown': 'Boss invins!', 'banner.sector': 'Sector {n}', 'banner.miniboss': 'Mini-boss',
    'banner.warning': 'Atentie',
    // ---------- HUD ----------
    'hud.sector': 'Sector {n}', 'hud.lvl': 'Nv {n}', 'hud.combo': 'Combo x{n}', 'hud.dash': 'Dash',
    'hud.pause': 'Pauza', 'hud.fps': '{n} FPS', 'hud.score': 'Scor', 'hud.atk': 'ATK {n}',
    // ---------- pause / revive / over ----------
    'pause.title': 'Pauza', 'pause.resume': 'Continua', 'pause.quit': 'Iesi din runda',
    'pause.quitConfirm': 'Iesi din runda? Pastrezi cristalele adunate.', 'pause.settings': 'Setari',
    'revive.title': 'Nava distrusa!', 'revive.btn': 'Reinvie', 'revive.left': '{n} reinvieri ramase',
    'revive.giveUp': 'Renunta', 'revive.free': 'Gratis',
    'over.title': 'Runda incheiata', 'over.newBest': 'RECORD NOU!', 'over.score': 'Scor', 'over.best': 'Record',
    'over.kills': 'Inamici', 'over.sector': 'Sector', 'over.bosses': 'Boss-i', 'over.combo': 'Combo maxim',
    'over.crystals': 'Cristale', 'over.xp': 'XP', 'over.time': 'Timp', 'over.chests': 'Cufere', 'over.revives': 'Reinvieri',
    'over.again': 'Inca o data', 'over.share': 'Distribuie', 'over.menu': 'Meniu', 'over.hangar': 'Hangar',
    'over.lvlUp': 'Pilot Nv {a} -> {b}', 'over.shareText': 'Am facut {s} puncte in Neon Comet! Poti mai mult?',
    'over.saved': 'Imagine salvata',
    // ---------- settings ----------
    'settings.title': 'Setari', 'settings.sec.controls': 'Control', 'settings.sec.audio': 'Sunet',
    'settings.sec.video': 'Grafica', 'settings.sec.gameplay': 'Joc', 'settings.sec.data': 'Date',
    'settings.ctrl': 'Dispozitiv', 'settings.ctrl.auto': 'Auto', 'settings.ctrl.pc': 'PC', 'settings.ctrl.touch': 'Touch',
    'settings.ctrl.gamepad': 'Controller', 'settings.aim': 'Tintire', 'settings.aim.auto': 'Automata',
    'settings.aim.manual': 'Manuala', 'settings.hand': 'Mana', 'settings.hand.right': 'Dreapta',
    'settings.hand.left': 'Stanga', 'settings.joySize': 'Marime joystick', 'settings.btnOpacity': 'Opacitate butoane',
    'settings.music': 'Muzica', 'settings.sfx': 'Efecte', 'settings.vibration': 'Vibratii', 'settings.shake': 'Tremur ecran',
    'settings.dmgNumbers': 'Numere daune', 'settings.quality': 'Calitate', 'settings.quality.low': 'Scazuta',
    'settings.quality.med': 'Medie', 'settings.quality.high': 'Inalta', 'settings.fps': 'Contor FPS',
    'settings.colorblind': 'Daltonism', 'settings.colorblind.hint': 'Gloantele inamice au forme distincte',
    'settings.lang': 'Limba', 'settings.export': 'Exporta salvarea', 'settings.import': 'Importa salvarea',
    'settings.reset': 'Sterge progresul', 'settings.resetConfirm': 'Sigur? Tot progresul va fi sters definitiv.',
    'settings.resetConfirm2': 'Ultima confirmare: stergi tot?', 'settings.iosVibe': 'Pe iPhone browserul nu permite vibratii.',
    'settings.tutorial': 'Tutorial', 'settings.tutorialReplay': 'Reia tutorialul', 'settings.credits': 'Credite',
    'settings.creditsText': 'Fonturi: Oxanium (Severin Meyer), Silkscreen (Jason Kottke), licenta OFL.',
    // ---------- account ----------
    'account.title': 'Cont', 'account.code': 'Cod de salvare', 'account.codeHint': 'Copiaza codul ca sa-ti muti progresul pe alt dispozitiv.',
    'account.copy': 'Copiaza', 'account.copied': 'Cod copiat', 'account.paste': 'Lipeste codul aici',
    'account.load': 'Incarca codul', 'account.importOk': 'Progres incarcat!', 'account.importBad': 'Cod invalid',
    'account.records': 'Recorduri', 'account.download': 'Descarca fisier',
    'rec.best': 'Scor maxim', 'rec.runs': 'Runde jucate', 'rec.kills': 'Inamici distrusi', 'rec.bosses': 'Boss-i invinsi',
    'rec.time': 'Timp jucat', 'rec.maxSector': 'Sector maxim', 'rec.maxCombo': 'Combo maxim', 'rec.crystals': 'Cristale castigate',
    'rec.chests': 'Cufere deschise', 'rec.lvl': 'Nivel pilot',
    // ---------- missions / achievements ----------
    'missions.title': 'Misiuni zilnice', 'missions.refresh': 'Misiuni noi in {t}', 'missions.empty': 'Nicio misiune azi',
    'mis.kill': 'Distruge {n} inamici', 'mis.boss': 'Invinge {n} boss', 'mis.stars': 'Aduna {n} stele',
    'mis.score': 'Fa {n} puncte intr-o runda', 'mis.runs': 'Joaca {n} runde', 'mis.crystals': 'Aduna {n} cristale',
    'mis.chests': 'Deschide {n} cufere', 'mis.sector': 'Ajungi in sectorul {n}', 'mis.combo': 'Fa un combo de {n}',
    'mis.cons': 'Foloseste {n} consumabile', 'mis.upgrade': 'Fa {n} upgrade-uri', 'mis.dash': 'Foloseste dash de {n} ori',
    'ach.title': 'Realizari', 'ach.tier.0': 'Bronz', 'ach.tier.1': 'Argint', 'ach.tier.2': 'Aur',
    'ach.ready': '{n} de revendicat', 'ach.count': '{a} / {b} deblocate',
    'ach.kills': 'Distruge {n} inamici', 'ach.bosses': 'Invinge {n} boss-i', 'ach.score': 'Fa {n} puncte',
    'ach.runs': 'Joaca {n} runde', 'ach.crystals': 'Castiga {n} cristale', 'ach.chests': 'Deschide {n} cufere',
    'ach.ships': 'Detine {n} nave', 'ach.merge': 'Uneste {n} obiecte', 'ach.sector': 'Ajungi in sectorul {n}',
    'ach.combo': 'Combo de {n}', 'ach.lvl': 'Ajungi la nivelul {n}', 'ach.legendary': 'Gaseste {n} obiecte legendare',
    'ach.ultra': 'Gaseste un obiect ultra', 'ach.evolve': 'Evolueaza {n} arme', 'ach.daily': 'Revendica {n} recompense zilnice',
    'ach.missions': 'Termina {n} misiuni', 'ach.nohit': 'Invinge un boss fara sa fii lovit', 'ach.revive': 'Reinvie de {n} ori',
    'ach.upgrade': 'Fa {n} upgrade-uri', 'ach.set': 'Echipeaza un set complet', 'ach.time': 'Supravietuieste {n} minute',
    // ---------- daily / offline ----------
    'daily.title': 'Recompensa zilnica', 'daily.day': 'Ziua {n}', 'daily.claim': 'Revendica', 'daily.streak': 'Serie zilnica: {n}',
    'daily.comeBack': 'Revino maine pentru ziua {n}',
    'offline.title': 'Bine ai revenit!', 'offline.text': 'Flota ta a minat cat ai fost plecat ({t}).',
    'offline.claim': 'Revendica', 'offline.claim2': 'Revendica x2', 'offline.cap': 'Maxim 8 ore',
    // ---------- loadout ----------
    'loadout.title': 'Pregatire', 'loadout.hint': 'Alege pana la 3 consumabile pentru runda',
    'loadout.go': 'Lanseaza', 'loadout.none': 'Nu ai consumabile', 'loadout.shop': 'Magazin',
    'loadout.slots': '{n}/3 alese', 'loadout.carry': 'Iei {n}',
    // ---------- toasts ----------
    'toast.noCrystals': 'Nu ai destule cristale', 'toast.bought': 'Cumparat!', 'toast.upgraded': 'Upgrade reusit!',
    'toast.equipped': 'Echipat', 'toast.merged': 'Unire reusita!', 'toast.sold': 'Vandut pentru {p} cristale',
    'toast.padOn': 'Controller conectat', 'toast.padOff': 'Controller deconectat', 'toast.saved': 'Salvat',
    'toast.update3': 'Actualizare 3.0', 'mig.ships': '{n} nave', 'mig.gear': '{n} iteme', 'mig.drones': '{n} turele/companioni', 'mig.refund': '+{n} cristale din statistici', 'toast.error': 'Eroare', 'toast.maxLvl': 'Nivel maxim',
    'toast.missionDone': 'Misiune completa!', 'toast.achDone': 'Realizare deblocata!', 'toast.claimed': '+{n} cristale',
    'toast.full': 'Ai deja maximul', 'toast.loadoutFull': 'Maxim 3 tipuri', 'toast.locked': 'Blocat',
    // ---------- tutorial ----------
    'tut.title': 'Tutorial', 'tut.move': 'Misca nava cu WASD sau sagetile',
    'tut.moveTouch': 'Pune degetul in stanga si trage ca sa zbori', 'tut.movePad': 'Foloseste stick-ul stang ca sa zbori',
    'tut.dash': 'Apasa SPATIU pentru dash', 'tut.dashTouch': 'Apasa DASH ca sa te feresti', 'tut.dashPad': 'Apasa R2 pentru dash',
    'tut.cons': 'Apasa 1, 2, 3 pentru consumabile', 'tut.consTouch': 'Butoanele din jurul DASH sunt consumabilele',
    'tut.consPad': 'X (Cross), Patrat si Triunghi folosesc consumabilele',
    'tut.card': 'La fiecare nivel alegi o carte', 'tut.fire': 'Nava trage singura. Distruge inamicii si aduna stele!',
    'tut.skip': 'Sari peste', 'tut.next': 'Am inteles', 'tut.done': 'Gata! Mult noroc, pilot!', 'tut.step': 'Pas {a}/{b}',
    // ---------- misc ----------
    'rotate.title': 'Tine telefonul drept', 'rotate.sub': 'Neon Comet se joaca pe verticala',
    'loading.text': 'Se incarca', 'loading.ready': 'Gata', 'loading.warp': 'Salt in hiperspatiu',
    'lang.pick': 'Alege limba', 'lang.ro': 'Romana', 'lang.en': 'English',
    'exit.title': 'Iesire', 'exit.text': 'Poti inchide fila sau aplicatia. Progresul este salvat.', 'exit.back': 'Inapoi la joc',
    'time.h': '{h}h {m}m', 'time.m': '{m}m {s}s', 'time.s': '{s}s',
  };

  const en = {
    'common.ok': 'OK', 'common.cancel': 'Cancel', 'common.back': 'Back', 'common.close': 'Close',
    'common.yes': 'Yes', 'common.no': 'No', 'common.claim': 'Claim', 'common.claimed': 'Claimed',
    'common.buy': 'Buy', 'common.upgrade': 'Upgrade', 'common.equip': 'Equip', 'common.equipped': 'Equipped',
    'common.owned': 'Owned', 'common.locked': 'Locked', 'common.max': 'MAX', 'common.lvl': 'Lv {n}',
    'common.sell': 'Sell', 'common.merge': 'Merge', 'common.open': 'Open', 'common.free': 'Free',
    'common.select': 'Select', 'common.confirm': 'Confirm', 'common.next': 'Next', 'common.skip': 'Skip',
    'common.done': 'Done', 'common.crystals': 'Crystals', 'common.power': 'Power', 'common.level': 'Level',
    'common.new': 'NEW', 'common.on': 'On', 'common.off': 'Off', 'common.details': 'Details', 'common.unequip': 'Unequip', 'common.x': 'x{n}',
    'common.reward': 'Reward', 'common.progress': '{a} / {b}', 'common.loading': 'Loading',
    'menu.start': 'Start', 'menu.hangar': 'Hangar', 'menu.missions': 'Missions', 'menu.achievements': 'Achievements',
    'menu.settings': 'Settings', 'menu.account': 'Account', 'menu.exit': 'Exit', 'menu.pilot': 'Pilot',
    'menu.tagline': 'Pixel space shooter', 'menu.best': 'Best', 'menu.version': 'v4.0', 'menu.pilotLvl': 'Pilot Lv {n}',
    'hangar.title': 'Hangar',
    'tab.ships': 'Ships', 'tab.weapons': 'Weapons', 'tab.turrets': 'Turrets', 'tab.companions': 'Companions',
    'tab.gear': 'Gear', 'tab.consumables': 'Consumables', 'tab.chests': 'Chests',
    'slot.weapon': 'Weapon', 'slot.turret': 'Turret', 'slot.companion': 'Companion', 'slot.armor': 'Armor',
    'slot.gen': 'Generator', 'slot.core': 'Core', 'slot.boost': 'Booster', 'slot.empty': 'Empty',
    'hangar.buyFor': 'Buy {p}', 'hangar.upFor': 'Upgrade {p}', 'hangar.maxed': 'Max level',
    'hangar.perk': 'Perk', 'hangar.stats': 'Stats', 'hangar.noGear': 'No gear yet. Open chests!',
    'hangar.filterAll': 'All', 'hangar.sortRarity': 'Rarity', 'hangar.set': 'Set: {s}',
    'detail.before': 'Now', 'detail.after': 'After', 'detail.lvl': 'Level {a} / {b}', 'detail.unlockAt': 'Rarity {r}',
    'merge.title': 'Merge', 'merge.pick': 'Pick 3 items with the same slot and rarity',
    'merge.btn': 'Merge ({n}/3)', 'merge.result': 'Result: {r}', 'merge.ultraMax': 'Ultra is the top rarity',
    'merge.mode': 'Merge', 'merge.done': 'New item: {r}!',
    'sell.mode': 'Sell', 'sell.selected': '{n} selected', 'sell.btn': 'Sell ({p})',
    'sell.allCommon': 'Sell all common', 'sell.confirm': 'Sell {n} items for {p} crystals?', 'sell.none': 'Nothing to sell',
    'shop.have': 'Own {n}', 'shop.max': 'Max {n}', 'shop.buy1': '+1  {p}',
    'chest.owned': 'Own {n}', 'chest.buyOpen': 'Buy {p}', 'chest.openOwned': 'Open ({n})',
    'chest.pity': 'Legendary guaranteed in {n} chests',
    'rarity.0': 'Common', 'rarity.1': 'Rare', 'rarity.2': 'Epic', 'rarity.3': 'Legendary', 'rarity.4': 'Ultra',
    'stat.hp': 'Health', 'stat.atk': 'Attack', 'stat.shd': 'Shield', 'stat.rate': 'Fire rate', 'stat.speed': 'Speed',
    'stat.crit': 'Crit', 'stat.dps': 'DPS', 'stat.cr': 'Crystals', 'stat.xp': 'XP', 'stat.dash': 'Dash',
    'stat.regen': 'Regen', 'stat.pierce': 'Pierce', 'stat.range': 'Range', 'stat.dmg': 'Damage',
    'stat.evade': 'Evasion', 'stat.power': 'Power',
    'ship.vanator.name': 'Hunter', 'ship.vanator.perk': 'Balanced: +5% to all stats',
    'ship.scorpion.name': 'Scorpion', 'ship.scorpion.perk': 'Fast: +15% speed',
    'ship.falcon.name': 'Falcon', 'ship.falcon.perk': 'Hawk eye: +8% crit',
    'ship.dart.name': 'Dart', 'ship.dart.perk': 'Light: +20% speed, -10% health',
    'ship.nova.name': 'Nova', 'ship.nova.perk': 'Energy: +15% fire rate',
    'ship.vortex.name': 'Vortex', 'ship.vortex.perk': 'Hardened: +25% shield',
    'ship.lynx.name': 'Lynx', 'ship.lynx.perk': 'Agile: dash -25% cooldown',
    'ship.comet.name': 'Comet', 'ship.comet.perk': 'Collector: +20% crystals',
    'ship.fregata.name': 'Frigate', 'ship.fregata.perk': 'Armored: +30% health',
    'ship.aegis.name': 'Aegis', 'ship.aegis.perk': 'Tank: shield regenerates twice as fast',
    'ship.specter.name': 'Specter', 'ship.specter.perk': 'Ghost: +10% crit, 10% evasion',
    'ship.raptor.name': 'Raptor', 'ship.raptor.perk': 'Predator: +20% damage',
    'ship.umbra.name': 'Umbra', 'ship.umbra.perk': 'Stealth: first hit always crits',
    'ship.solaris.name': 'Solaris', 'ship.solaris.perk': 'Solar power: +25% attack',
    'ship.valkyrie.name': 'Valkyrie', 'ship.valkyrie.perk': 'All-round: +12% to all',
    'ship.tempest.name': 'Tempest', 'ship.tempest.perk': 'Storm: +30% fire rate',
    'ship.imperial.name': 'Imperial', 'ship.imperial.perk': 'Empire: +20% to all',
    'ship.eclipse.name': 'Eclipse', 'ship.eclipse.perk': 'Eclipse: +25% crit, crit damage x2.5',
    'ship.phoenix.name': 'Phoenix', 'ship.phoenix.perk': 'Rebirth: auto-revive once per run',
    'ship.oblivion.name': 'Oblivion', 'ship.oblivion.perk': 'Void: max DPS, +40% damage',
    'wpn.laser.name': 'Laser', 'wpn.laser.desc': 'Fast single beam',
    'wpn.plasma.name': 'Plasma', 'wpn.plasma.desc': 'Slow piercing orbs',
    'wpn.missile.name': 'Missiles', 'wpn.missile.desc': 'Homing missiles, small blast',
    'wpn.rail.name': 'Railgun', 'wpn.rail.desc': 'Charged line that pierces all',
    'wpn.flame.name': 'Flamethrower', 'wpn.flame.desc': 'Short fire cone, burns over time',
    'wpn.laser.evo': 'Prism', 'wpn.plasma.evo': 'Nova Orb', 'wpn.missile.evo': 'Swarm',
    'wpn.rail.evo': 'Annihilator', 'wpn.flame.evo': 'Inferno', 'wpn.evolved': 'Weapon evolved: {w}!',
    'tur.pulse.name': 'Pulse Drone', 'tur.pulse.desc': 'Fires rapid pulses',
    'tur.rocket.name': 'Rocket Drone', 'tur.rocket.desc': 'Launches small rockets',
    'tur.arc.name': 'Arc Drone', 'tur.arc.desc': 'Lightning that jumps between enemies',
    'tur.beam.name': 'Beam Drone', 'tur.beam.desc': 'Continuous energy beam',
    'comp.wing.name': 'Wing', 'comp.wing.desc': 'Flies beside you and shoots',
    'comp.orb.name': 'Orbit', 'comp.orb.desc': 'Circles around your ship',
    'comp.guardian.name': 'Guardian', 'comp.guardian.desc': 'Blocks bullets',
    'comp.phantom.name': 'Phantom', 'comp.phantom.desc': 'Strikes from the shadows, high crit',
    'gear.slot.armor': 'Armor', 'gear.slot.gen': 'Shield generator', 'gear.slot.core': 'Core module', 'gear.slot.boost': 'Booster',
    'set.titan.name': 'Titan', 'set.titan.b2': '2: +10% health', 'set.titan.b4': '4: +20% health and shield regen',
    'set.fantoma.name': 'Phantom', 'set.fantoma.b2': '2: +8% crit', 'set.fantoma.b4': '4: +15% speed, dash -20%',
    'set.tezaur.name': 'Treasure', 'set.tezaur.b2': '2: +15% crystals', 'set.tezaur.b4': '4: +30% crystals, +20% XP',
    'cons.mine.name': 'Galactic mine', 'cons.mine.desc': 'Clears the screen of normal enemies',
    'cons.shield.name': 'Shield 10s', 'cons.shield.desc': 'Invulnerable bubble for 10 seconds',
    'cons.magnet.name': 'Magnet', 'cons.magnet.desc': 'Pulls all pickups for 15 seconds',
    'cons.x2.name': 'Crystals x2', 'cons.x2.desc': 'Double crystals for 30 seconds',
    'cons.repair.name': 'Repair', 'cons.repair.desc': 'Heals 50% health',
    'chest.0.name': 'Common chest', 'chest.1.name': 'Rare chest', 'chest.2.name': 'Epic chest',
    'chest.3.name': 'Legendary chest', 'chest.4.name': 'Ultra chest',
    'chestopen.tap': 'Tap to open', 'chestopen.rewards': 'Rewards', 'chestopen.again': 'One more',
    'card.dmg.name': 'Damage', 'card.dmg.desc': '+15% damage',
    'card.rate.name': 'Fire rate', 'card.rate.desc': '+12% fire rate',
    'card.gun.name': 'Extra gun', 'card.gun.desc': '+1 projectile',
    'card.pierce.name': 'Pierce', 'card.pierce.desc': 'Shots pass through +1 enemy',
    'card.bounce.name': 'Bounce', 'card.bounce.desc': 'Shots bounce once',
    'card.missile.name': 'Missiles', 'card.missile.desc': 'Fires homing missiles',
    'card.orbit.name': 'Orbitals', 'card.orbit.desc': 'Orbs circle your ship',
    'card.shield.name': 'Shield', 'card.shield.desc': '+20% max shield',
    'card.heal.name': 'Heal', 'card.heal.desc': 'Heal 30% and +10% max health',
    'card.magnet.name': 'Magnet', 'card.magnet.desc': '+40% pickup radius',
    'card.speed.name': 'Speed', 'card.speed.desc': '+10% ship speed',
    'card.crit.name': 'Crit', 'card.crit.desc': '+6% crit chance',
    'card.vamp.name': 'Vampire', 'card.vamp.desc': 'Recover health from damage',
    'card.evo_laser.name': 'Evolve: Prism', 'card.evo_laser.desc': 'At Lv 5 the laser splits',
    'card.evo_plasma.name': 'Evolve: Nova Orb', 'card.evo_plasma.desc': 'At Lv 5 orbs explode',
    'card.evo_missile.name': 'Evolve: Swarm', 'card.evo_missile.desc': 'At Lv 5 fire a missile swarm',
    'card.evo_rail.name': 'Evolve: Annihilator', 'card.evo_rail.desc': 'At Lv 5 the beam chains',
    'card.evo_flame.name': 'Evolve: Inferno', 'card.evo_flame.desc': 'At Lv 5 bigger cone and burn',
    'cards.title': 'Level up!', 'cards.sub': 'Pick an upgrade', 'cards.lvl': 'Lv {n}',
    'cards.reroll': 'Reroll', 'cards.rerollFree': 'Reroll (free)', 'cards.evo': 'EVOLUTION', 'cards.new': 'NEW',
    'boss.colos.name': 'The Colossus', 'boss.nucleu.name': 'The Core', 'boss.leviatan.name': 'The Leviathan',
    'boss.stup.name': 'The Hive', 'boss.imparat.name': 'The Emperor',
    'mboss.1.name': 'Sentinel', 'mboss.2.name': 'Red Hunter', 'mboss.3.name': 'Fortress',
    'biome.nebula.name': 'Nebula', 'biome.asteroid.name': 'Asteroid belt', 'biome.ion.name': 'Ion storm', 'biome.station.name': 'Station',
    'event.asteroids.name': 'Asteroid field', 'event.asteroids.desc': 'Dodge the rocks!',
    'event.ionstorm.name': 'Ion storm', 'event.ionstorm.desc': 'Shield does not regenerate',
    'event.blackhole.name': 'Black hole', 'event.blackhole.desc': 'Gravity pulls you in',
    'banner.boss': 'Boss!', 'banner.bossDown': 'Boss defeated!', 'banner.sector': 'Sector {n}', 'banner.miniboss': 'Mini-boss',
    'banner.warning': 'Warning',
    'hud.sector': 'Sector {n}', 'hud.lvl': 'Lv {n}', 'hud.combo': 'Combo x{n}', 'hud.dash': 'Dash',
    'hud.pause': 'Pause', 'hud.fps': '{n} FPS', 'hud.score': 'Score', 'hud.atk': 'ATK {n}',
    'pause.title': 'Paused', 'pause.resume': 'Resume', 'pause.quit': 'Quit run',
    'pause.quitConfirm': 'Quit the run? You keep the crystals collected.', 'pause.settings': 'Settings',
    'revive.title': 'Ship destroyed!', 'revive.btn': 'Revive', 'revive.left': '{n} revives left',
    'revive.giveUp': 'Give up', 'revive.free': 'Free',
    'over.title': 'Run over', 'over.newBest': 'NEW BEST!', 'over.score': 'Score', 'over.best': 'Best',
    'over.kills': 'Kills', 'over.sector': 'Sector', 'over.bosses': 'Bosses', 'over.combo': 'Max combo',
    'over.crystals': 'Crystals', 'over.xp': 'XP', 'over.time': 'Time', 'over.chests': 'Chests', 'over.revives': 'Revives',
    'over.again': 'Play again', 'over.share': 'Share', 'over.menu': 'Menu', 'over.hangar': 'Hangar',
    'over.lvlUp': 'Pilot Lv {a} -> {b}', 'over.shareText': 'I scored {s} in Neon Comet! Can you beat it?',
    'over.saved': 'Image saved',
    'settings.title': 'Settings', 'settings.sec.controls': 'Controls', 'settings.sec.audio': 'Audio',
    'settings.sec.video': 'Graphics', 'settings.sec.gameplay': 'Gameplay', 'settings.sec.data': 'Data',
    'settings.ctrl': 'Device', 'settings.ctrl.auto': 'Auto', 'settings.ctrl.pc': 'PC', 'settings.ctrl.touch': 'Touch',
    'settings.ctrl.gamepad': 'Gamepad', 'settings.aim': 'Aiming', 'settings.aim.auto': 'Auto',
    'settings.aim.manual': 'Manual', 'settings.hand': 'Hand', 'settings.hand.right': 'Right',
    'settings.hand.left': 'Left', 'settings.joySize': 'Joystick size', 'settings.btnOpacity': 'Button opacity',
    'settings.music': 'Music', 'settings.sfx': 'Effects', 'settings.vibration': 'Vibration', 'settings.shake': 'Screen shake',
    'settings.dmgNumbers': 'Damage numbers', 'settings.quality': 'Quality', 'settings.quality.low': 'Low',
    'settings.quality.med': 'Medium', 'settings.quality.high': 'High', 'settings.fps': 'FPS counter',
    'settings.colorblind': 'Colorblind', 'settings.colorblind.hint': 'Enemy bullets get distinct shapes',
    'settings.lang': 'Language', 'settings.export': 'Export save', 'settings.import': 'Import save',
    'settings.reset': 'Reset progress', 'settings.resetConfirm': 'Sure? All progress will be deleted forever.',
    'settings.resetConfirm2': 'Last check: delete everything?', 'settings.iosVibe': 'iPhone browsers do not allow vibration.',
    'settings.tutorial': 'Tutorial', 'settings.tutorialReplay': 'Replay tutorial', 'settings.credits': 'Credits',
    'settings.creditsText': 'Fonts: Oxanium (Severin Meyer), Silkscreen (Jason Kottke), OFL license.',
    'account.title': 'Account', 'account.code': 'Save code', 'account.codeHint': 'Copy the code to move your progress to another device.',
    'account.copy': 'Copy', 'account.copied': 'Code copied', 'account.paste': 'Paste code here',
    'account.load': 'Load code', 'account.importOk': 'Progress loaded!', 'account.importBad': 'Invalid code',
    'account.records': 'Records', 'account.download': 'Download file',
    'rec.best': 'Best score', 'rec.runs': 'Runs played', 'rec.kills': 'Enemies destroyed', 'rec.bosses': 'Bosses defeated',
    'rec.time': 'Time played', 'rec.maxSector': 'Max sector', 'rec.maxCombo': 'Max combo', 'rec.crystals': 'Crystals earned',
    'rec.chests': 'Chests opened', 'rec.lvl': 'Pilot level',
    'missions.title': 'Daily missions', 'missions.refresh': 'New missions in {t}', 'missions.empty': 'No missions today',
    'mis.kill': 'Destroy {n} enemies', 'mis.boss': 'Defeat {n} boss', 'mis.stars': 'Collect {n} stars',
    'mis.score': 'Score {n} in one run', 'mis.runs': 'Play {n} runs', 'mis.crystals': 'Collect {n} crystals',
    'mis.chests': 'Open {n} chests', 'mis.sector': 'Reach sector {n}', 'mis.combo': 'Reach a {n} combo',
    'mis.cons': 'Use {n} consumables', 'mis.upgrade': 'Do {n} upgrades', 'mis.dash': 'Dash {n} times',
    'ach.title': 'Achievements', 'ach.tier.0': 'Bronze', 'ach.tier.1': 'Silver', 'ach.tier.2': 'Gold',
    'ach.ready': '{n} to claim', 'ach.count': '{a} / {b} unlocked',
    'ach.kills': 'Destroy {n} enemies', 'ach.bosses': 'Defeat {n} bosses', 'ach.score': 'Score {n}',
    'ach.runs': 'Play {n} runs', 'ach.crystals': 'Earn {n} crystals', 'ach.chests': 'Open {n} chests',
    'ach.ships': 'Own {n} ships', 'ach.merge': 'Merge {n} items', 'ach.sector': 'Reach sector {n}',
    'ach.combo': 'Reach a {n} combo', 'ach.lvl': 'Reach level {n}', 'ach.legendary': 'Find {n} legendary items',
    'ach.ultra': 'Find an ultra item', 'ach.evolve': 'Evolve {n} weapons', 'ach.daily': 'Claim {n} daily rewards',
    'ach.missions': 'Complete {n} missions', 'ach.nohit': 'Defeat a boss without getting hit', 'ach.revive': 'Revive {n} times',
    'ach.upgrade': 'Do {n} upgrades', 'ach.set': 'Equip a full set', 'ach.time': 'Survive {n} minutes',
    'daily.title': 'Daily reward', 'daily.day': 'Day {n}', 'daily.claim': 'Claim', 'daily.streak': 'Daily streak: {n}',
    'daily.comeBack': 'Come back tomorrow for day {n}',
    'offline.title': 'Welcome back!', 'offline.text': 'Your fleet mined while you were away ({t}).',
    'offline.claim': 'Claim', 'offline.claim2': 'Claim x2', 'offline.cap': 'Max 8 hours',
    'loadout.title': 'Prepare', 'loadout.hint': 'Pick up to 3 consumables for the run',
    'loadout.go': 'Launch', 'loadout.none': 'You have no consumables', 'loadout.shop': 'Shop',
    'loadout.slots': '{n}/3 picked', 'loadout.carry': 'Taking {n}',
    'toast.noCrystals': 'Not enough crystals', 'toast.bought': 'Bought!', 'toast.upgraded': 'Upgraded!',
    'toast.equipped': 'Equipped', 'toast.merged': 'Merged!', 'toast.sold': 'Sold for {p} crystals',
    'toast.padOn': 'Controller connected', 'toast.padOff': 'Controller disconnected', 'toast.saved': 'Saved',
    'toast.update3': 'Update 3.0', 'mig.ships': '{n} ships', 'mig.gear': '{n} items', 'mig.drones': '{n} turrets/companions', 'mig.refund': '+{n} crystals from stats', 'toast.error': 'Error', 'toast.maxLvl': 'Max level',
    'toast.missionDone': 'Mission complete!', 'toast.achDone': 'Achievement unlocked!', 'toast.claimed': '+{n} crystals',
    'toast.full': 'Already at max', 'toast.loadoutFull': 'Max 3 types', 'toast.locked': 'Locked',
    'tut.title': 'Tutorial', 'tut.move': 'Move the ship with WASD or the arrow keys',
    'tut.moveTouch': 'Put a finger on the left side and drag to fly', 'tut.movePad': 'Use the left stick to fly',
    'tut.dash': 'Press SPACE to dash', 'tut.dashTouch': 'Tap DASH to dodge', 'tut.dashPad': 'Press R2 to dash',
    'tut.cons': 'Press 1, 2, 3 for consumables', 'tut.consTouch': 'The buttons around DASH are your consumables',
    'tut.consPad': 'Cross, Square and Triangle use consumables',
    'tut.card': 'Every level you pick a card', 'tut.fire': 'Your ship fires by itself. Destroy enemies and grab stars!',
    'tut.skip': 'Skip', 'tut.next': 'Got it', 'tut.done': 'Done! Good luck, pilot!', 'tut.step': 'Step {a}/{b}',
    'rotate.title': 'Hold your phone upright', 'rotate.sub': 'Neon Comet is played in portrait',
    'loading.text': 'Loading', 'loading.ready': 'Ready', 'loading.warp': 'Warp jump',
    'lang.pick': 'Choose language', 'lang.ro': 'Romana', 'lang.en': 'English',
    'exit.title': 'Exit', 'exit.text': 'You can close the tab or app. Your progress is saved.', 'exit.back': 'Back to game',
    'time.h': '{h}h {m}m', 'time.m': '{m}m {s}s', 'time.s': '{s}s',
  };

  // keys used by data.js / systems.js nameKeys
  Object.assign(ro, {
    'rarity.common': 'Comun',
    'rarity.rare': 'Rar',
    'rarity.epic': 'Epic',
    'rarity.legendary': 'Legendar',
    'rarity.ultra': 'Ultra',
    'wpn.prism.name': 'Prisma',
    'wpn.nova_orb.name': 'Nova Orb',
    'wpn.swarm.name': 'Roi',
    'wpn.annihilator.name': 'Anihilator',
    'wpn.inferno.name': 'Infern',
    'stat.magnet': 'Magnet',
    'stat.critDmg': 'Daune critice',
    'stat.dashCd': 'Dash',
    'tier.bronze': 'Bronz',
    'tier.silver': 'Argint',
    'tier.gold': 'Aur',
    'input.padConnected': 'Controller conectat',
    'input.padDisconnected': 'Controller deconectat',
    'sys.err.noCrystals': 'Nu ai destule cristale',
    'sys.err.invalid': 'Actiune invalida',
    'sys.err.owned': 'Deja detinut',
    'sys.err.notOwned': 'Nu detii obiectul',
    'sys.err.maxLevel': 'Nivel maxim',
    'sys.err.mergeRule': 'Alege 3 obiecte cu acelasi slot si raritate',
    'sys.err.maxRarity': 'Ultra este raritatea maxima',
    'sys.err.noChest': 'Nu ai cufere de acest tip',
    'sys.err.noStock': 'Stoc epuizat',
    'sys.err.loadoutFull': 'Maxim 3 tipuri',
    'sys.err.claimed': 'Deja revendicat',
    'sys.err.notDone': 'Inca nu e gata',
    'missions.bonus': 'Bonus: toate 3 complete',
    'mission.kills.desc': 'Distruge {n} inamici',
    'mission.bosses.desc': 'Invinge {n} boss',
    'mission.stars.desc': 'Aduna {n} stele',
    'mission.crystals.desc': 'Aduna {n} cristale',
    'mission.runs.desc': 'Joaca {n} runde',
    'mission.combo.desc': 'Fa un combo de {n}',
    'mission.sector.desc': 'Ajungi in sectorul {n}',
    'mission.mboss.desc': 'Invinge {n} mini-boss',
    'mission.cards.desc': 'Alege {n} carti',
    'mission.cons.desc': 'Foloseste {n} consumabile',
    'mission.dash.desc': 'Foloseste dash de {n} ori',
    'mission.upgrade.desc': 'Fa {n} upgrade-uri',
    'mission.chest.desc': 'Deschide {n} cufere',
    'mission.events.desc': 'Supravietuieste {n} evenimente',
    'ach.kills.name': 'Exterminator',
    'ach.kills.desc': 'Distruge {n} inamici',
    'ach.boss.name': 'Ucigas de boss',
    'ach.boss.desc': 'Invinge {n} boss-i',
    'ach.score.name': 'Scor mare',
    'ach.score.desc': 'Fa {n} puncte',
    'ach.sector.name': 'Explorator',
    'ach.sector.desc': 'Ajungi in sectorul {n}',
    'ach.runs.name': 'Veteran',
    'ach.runs.desc': 'Joaca {n} runde',
    'ach.combo.name': 'Maestru combo',
    'ach.combo.desc': 'Fa un combo de {n}',
    'ach.time.name': 'Dedicat',
    'ach.time.desc': 'Joaca {n} in total',
    'ach.rich.name': 'Magnat',
    'ach.rich.desc': 'Castiga {n} cristale',
    'ach.level.name': 'Pilot de elita',
    'ach.level.desc': 'Ajungi la nivelul {n}',
    'ach.fleet.name': 'Amiral',
    'ach.fleet.desc': 'Detine {n} nave',
    'ach.chests.name': 'Vanator de comori',
    'ach.chests.desc': 'Deschide {n} cufere',
    'ach.merge.name': 'Fierar',
    'ach.merge.desc': 'Uneste {n} obiecte',
    'ach.evo.name': 'Evolutie',
    'ach.evo.desc': 'Evolueaza arma de {n} ori',
    'ach.missions.name': 'Mercenar',
    'ach.missions.desc': 'Termina {n} misiuni',
    'ach.stars.name': 'Colector de stele',
    'ach.stars.desc': 'Aduna {n} stele',
    'gear.name.armor.0.a': 'Placa usoara',
    'gear.name.armor.0.b': 'Vesta de zale',
    'gear.name.armor.1.a': 'Armura cobalt',
    'gear.name.armor.1.b': 'Carapace rapida',
    'gear.name.armor.2.a': 'Armura nova',
    'gear.name.armor.2.b': 'Platosa prisma',
    'gear.name.armor.3.a': 'Armura titan',
    'gear.name.armor.3.b': 'Egida solara',
    'gear.name.armor.4.a': 'Armura stelara',
    'gear.name.armor.4.b': 'Carapace imperiala',
    'gear.name.gen.0.a': 'Celula scut',
    'gear.name.gen.0.b': 'Bobina mica',
    'gear.name.gen.1.a': 'Generator ion',
    'gear.name.gen.1.b': 'Emitator cobalt',
    'gear.name.gen.2.a': 'Generator plasma',
    'gear.name.gen.2.b': 'Matrice prisma',
    'gear.name.gen.3.a': 'Reactor egida',
    'gear.name.gen.3.b': 'Nucleu aurora',
    'gear.name.gen.4.a': 'Generator stelar',
    'gear.name.gen.4.b': 'Inima imperiala',
    'gear.name.core.0.a': 'Cip minier',
    'gear.name.core.0.b': 'Modul simplu',
    'gear.name.core.1.a': 'Procesor cobalt',
    'gear.name.core.1.b': 'Modul colector',
    'gear.name.core.2.a': 'Nucleu cuantic',
    'gear.name.core.2.b': 'Modul prisma',
    'gear.name.core.3.a': 'Nucleu solar',
    'gear.name.core.3.b': 'Creier tezaur',
    'gear.name.core.4.a': 'Singularitate',
    'gear.name.core.4.b': 'Nucleu imperial',
    'gear.name.boost.0.a': 'Duza usoara',
    'gear.name.boost.0.b': 'Propulsor vechi',
    'gear.name.boost.1.a': 'Turbina ion',
    'gear.name.boost.1.b': 'Propulsor cobalt',
    'gear.name.boost.2.a': 'Motor plasma',
    'gear.name.boost.2.b': 'Propulsor prisma',
    'gear.name.boost.3.a': 'Motor solar',
    'gear.name.boost.3.b': 'Aripi de foc',
    'gear.name.boost.4.a': 'Motor warp',
    'gear.name.boost.4.b': 'Propulsor imperial',
  });
  Object.assign(en, {
    'rarity.common': 'Common',
    'rarity.rare': 'Rare',
    'rarity.epic': 'Epic',
    'rarity.legendary': 'Legendary',
    'rarity.ultra': 'Ultra',
    'wpn.prism.name': 'Prism',
    'wpn.nova_orb.name': 'Nova Orb',
    'wpn.swarm.name': 'Swarm',
    'wpn.annihilator.name': 'Annihilator',
    'wpn.inferno.name': 'Inferno',
    'stat.magnet': 'Magnet',
    'stat.critDmg': 'Crit damage',
    'stat.dashCd': 'Dash',
    'tier.bronze': 'Bronze',
    'tier.silver': 'Silver',
    'tier.gold': 'Gold',
    'input.padConnected': 'Controller connected',
    'input.padDisconnected': 'Controller disconnected',
    'sys.err.noCrystals': 'Not enough crystals',
    'sys.err.invalid': 'Invalid action',
    'sys.err.owned': 'Already owned',
    'sys.err.notOwned': 'You do not own this',
    'sys.err.maxLevel': 'Max level',
    'sys.err.mergeRule': 'Pick 3 items with the same slot and rarity',
    'sys.err.maxRarity': 'Ultra is the top rarity',
    'sys.err.noChest': 'No chests of this type',
    'sys.err.noStock': 'Out of stock',
    'sys.err.loadoutFull': 'Max 3 types',
    'sys.err.claimed': 'Already claimed',
    'sys.err.notDone': 'Not done yet',
    'missions.bonus': 'Bonus: all 3 complete',
    'mission.kills.desc': 'Destroy {n} enemies',
    'mission.bosses.desc': 'Defeat {n} boss',
    'mission.stars.desc': 'Collect {n} stars',
    'mission.crystals.desc': 'Collect {n} crystals',
    'mission.runs.desc': 'Play {n} runs',
    'mission.combo.desc': 'Reach a {n} combo',
    'mission.sector.desc': 'Reach sector {n}',
    'mission.mboss.desc': 'Defeat {n} mini-boss',
    'mission.cards.desc': 'Pick {n} cards',
    'mission.cons.desc': 'Use {n} consumables',
    'mission.dash.desc': 'Dash {n} times',
    'mission.upgrade.desc': 'Do {n} upgrades',
    'mission.chest.desc': 'Open {n} chests',
    'mission.events.desc': 'Survive {n} events',
    'ach.kills.name': 'Exterminator',
    'ach.kills.desc': 'Destroy {n} enemies',
    'ach.boss.name': 'Boss slayer',
    'ach.boss.desc': 'Defeat {n} bosses',
    'ach.score.name': 'High score',
    'ach.score.desc': 'Score {n}',
    'ach.sector.name': 'Explorer',
    'ach.sector.desc': 'Reach sector {n}',
    'ach.runs.name': 'Veteran',
    'ach.runs.desc': 'Play {n} runs',
    'ach.combo.name': 'Combo master',
    'ach.combo.desc': 'Reach a {n} combo',
    'ach.time.name': 'Dedicated',
    'ach.time.desc': 'Play for {n} in total',
    'ach.rich.name': 'Tycoon',
    'ach.rich.desc': 'Earn {n} crystals',
    'ach.level.name': 'Elite pilot',
    'ach.level.desc': 'Reach level {n}',
    'ach.fleet.name': 'Admiral',
    'ach.fleet.desc': 'Own {n} ships',
    'ach.chests.name': 'Treasure hunter',
    'ach.chests.desc': 'Open {n} chests',
    'ach.merge.name': 'Blacksmith',
    'ach.merge.desc': 'Merge {n} items',
    'ach.evo.name': 'Evolution',
    'ach.evo.desc': 'Evolve a weapon {n} times',
    'ach.missions.name': 'Mercenary',
    'ach.missions.desc': 'Complete {n} missions',
    'ach.stars.name': 'Star collector',
    'ach.stars.desc': 'Collect {n} stars',
    'gear.name.armor.0.a': 'Light plate',
    'gear.name.armor.0.b': 'Chain vest',
    'gear.name.armor.1.a': 'Cobalt armor',
    'gear.name.armor.1.b': 'Swift shell',
    'gear.name.armor.2.a': 'Nova armor',
    'gear.name.armor.2.b': 'Prism plate',
    'gear.name.armor.3.a': 'Titan armor',
    'gear.name.armor.3.b': 'Solar aegis',
    'gear.name.armor.4.a': 'Stellar armor',
    'gear.name.armor.4.b': 'Imperial shell',
    'gear.name.gen.0.a': 'Shield cell',
    'gear.name.gen.0.b': 'Small coil',
    'gear.name.gen.1.a': 'Ion generator',
    'gear.name.gen.1.b': 'Cobalt emitter',
    'gear.name.gen.2.a': 'Plasma generator',
    'gear.name.gen.2.b': 'Prism matrix',
    'gear.name.gen.3.a': 'Aegis reactor',
    'gear.name.gen.3.b': 'Aurora core',
    'gear.name.gen.4.a': 'Stellar generator',
    'gear.name.gen.4.b': 'Imperial heart',
    'gear.name.core.0.a': 'Mining chip',
    'gear.name.core.0.b': 'Basic module',
    'gear.name.core.1.a': 'Cobalt CPU',
    'gear.name.core.1.b': 'Collector module',
    'gear.name.core.2.a': 'Quantum core',
    'gear.name.core.2.b': 'Prism module',
    'gear.name.core.3.a': 'Solar core',
    'gear.name.core.3.b': 'Treasure brain',
    'gear.name.core.4.a': 'Singularity',
    'gear.name.core.4.b': 'Imperial core',
    'gear.name.boost.0.a': 'Light nozzle',
    'gear.name.boost.0.b': 'Old thruster',
    'gear.name.boost.1.a': 'Ion turbine',
    'gear.name.boost.1.b': 'Cobalt thruster',
    'gear.name.boost.2.a': 'Plasma engine',
    'gear.name.boost.2.b': 'Prism thruster',
    'gear.name.boost.3.a': 'Solar engine',
    'gear.name.boost.3.b': 'Wings of fire',
    'gear.name.boost.4.a': 'Warp engine',
    'gear.name.boost.4.b': 'Imperial thruster',
  });

  // merged from NOTES/engine-i18n.md + NOTES/systems-i18n.md
  Object.assign(ro, {
    "banner.bossWarn": "AVERTISMENT",
    "banner.newThreat": "AMENINTARE NOUA",
    "banner.phase": "FAZA",
    "banner.evolved": "ARMA A EVOLUAT",
    "banner.chest": "CUFAR GASIT",
    "banner.supernova": "SUPERNOVA",
    "banner.rebirth": "RENASTERE",
    "en.drone.name": "Drona",
    "en.dart.name": "Sageata",
    "en.mine.name": "Mina",
    "en.hunter.name": "Vanator",
    "en.gunner.name": "Tunar",
    "en.splitter.name": "Asteroid",
    "en.shard.name": "Fragment",
    "en.charger.name": "Berbec",
    "en.sentinel.name": "Santinela",
    "en.wraith.name": "Strigoi",
    "en.carrier.name": "Purtator",
    "en.mini.name": "Mini drona",
    "en.bulwark.name": "Bastion",
    "en.artillery.name": "Artilerie",
    "boss.colos.sub": "nava-mama de asalt",
    "boss.nucleu.sub": "inteligenta de lupta",
    "boss.leviatan.sub": "distrugator clasa titan",
    "boss.stup.sub": "regina roiului",
    "boss.imparat.sub": "stapanul galaxiei",
    "save.err.invalid": "Codul nu e valid. Copiaza-l complet, de la NC4- pana la final.",
    "save.err.corrupt": "Codul e deteriorat.",
    "save.err.version": "Codul e de la o versiune necunoscuta.",
    "mig.toast": "Actualizare 3.0: progresul a fost convertit",
    "mig.detail": "+{refund} cristale din imbunatatiri vechi, {ships} nave, {gear} echipamente, {chests} cufere pastrate",
    "banner.sector": "Sector",
  });
  Object.assign(en, {
    "banner.bossWarn": "WARNING",
    "banner.newThreat": "NEW THREAT",
    "banner.phase": "PHASE",
    "banner.evolved": "WEAPON EVOLVED",
    "banner.chest": "CHEST FOUND",
    "banner.supernova": "SUPERNOVA",
    "banner.rebirth": "REBIRTH",
    "en.drone.name": "Drone",
    "en.dart.name": "Dart",
    "en.mine.name": "Mine",
    "en.hunter.name": "Hunter",
    "en.gunner.name": "Gunner",
    "en.splitter.name": "Splitter",
    "en.shard.name": "Shard",
    "en.charger.name": "Charger",
    "en.sentinel.name": "Sentinel",
    "en.wraith.name": "Wraith",
    "en.carrier.name": "Carrier",
    "en.mini.name": "Mini Drone",
    "en.bulwark.name": "Bulwark",
    "en.artillery.name": "Artillery",
    "boss.colos.sub": "assault mothership",
    "boss.nucleu.sub": "combat intelligence",
    "boss.leviatan.sub": "titan-class destroyer",
    "boss.stup.sub": "swarm queen",
    "boss.imparat.sub": "lord of the galaxy",
    "save.err.invalid": "Invalid code. Copy all of it, from NC4- to the end.",
    "save.err.corrupt": "The code is damaged.",
    "save.err.version": "The code is from an unknown version.",
    "mig.toast": "Update 3.0: your progress was converted",
    "mig.detail": "+{refund} crystals from old upgrades, {ships} ships, {gear} gear items, {chests} chests kept",
    "banner.sector": "Sector",
  });

  // extension files js/lang/<agent>.js (loaded after this file) Object.assign into NC.I18N.ro/en; a file loaded
  // earlier still wins over the base strings here.
  NC.I18N = NC.I18N || {};
  NC.I18N.ro = Object.assign({}, ro, NC.I18N.ro || {});
  NC.I18N.en = Object.assign({}, en, NC.I18N.en || {});

  // =====================================================================================================
  // Language state (3.1). Single source of truth = the saved setting NC.save.settings.lang (once chosen).
  // - NC.lang is correct from the FIRST t() call: read synchronously from the save in localStorage
  //   (neonComet.v4 / .bak), then 'nc.lang', then the browser languages. (3.0 used only navigator.language
  //   until UI.boot ran setLang -> anything translated earlier was in the wrong language.)
  // - NC.t() re-checks the live setting; if something changed it without NC.setLang, t() adopts it at once and
  //   fires the onLang listeners on the next tick (UI re-renders) -> HUD/pause can never disagree with Settings.
  // - Missing key: lang=en -> humanized key (NEVER Romanian text); lang=ro -> EN text -> humanized key.
  // =====================================================================================================
  NC.LANGS = ['ro', 'en'];
  const norm = l => { const s = String(l == null ? '' : l).trim().toLowerCase().slice(0, 2); return s === 'ro' || s === 'en' ? s : null; };
  const LS_KEY = 'nc.lang';
  const lsGet = k => { try { return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null; } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v); } catch (e) {} };
  function storedLang() {
    for (const k of ['neonComet.v4', 'neonComet.v4.bak']) {
      try { const o = JSON.parse(lsGet(k) || 'null'); const l = o && o.settings && norm(o.settings.lang); if (l) return l; } catch (e) {}
    }
    return norm(lsGet(LS_KEY));
  }
  function guess() {
    try { const all = [].concat(navigator.languages || [], navigator.language || []); return all.some(x => norm(x) === 'ro') ? 'ro' : all.length ? 'en' : 'ro'; } catch (e) { return 'ro'; }
  }
  let cur = norm(NC.lang) || storedLang() || guess();
  try { document.documentElement.lang = cur; } catch (e) {}

  const listeners = [];
  let firing = false, again = false, pending = 0;
  function apply(l) {
    cur = l;
    try { document.documentElement.lang = l; } catch (e) {}
    lsSet(LS_KEY, l);
    // keep the saved setting in sync when it was already chosen (null = first-launch picker still pending)
    try { const S = NC.save; if (S && S.settings && S.settings.lang && S.settings.lang !== l) S.settings.lang = l; } catch (e) {}
  }
  function fire() {
    if (pending) { clearTimeout(pending); pending = 0; }
    if (firing) { again = true; return; }
    let n = 0;
    do {
      again = false; firing = true;
      try { listeners.slice().forEach(fn => { try { fn(cur); } catch (e) { console.error(e); } }); } finally { firing = false; }
    } while (again && ++n < 3);
  }
  const schedule = () => { if (!pending) pending = setTimeout(() => { pending = 0; fire(); }, 0); };
  // live check against the saved setting (cheap fast path: same string -> no work)
  function lang() {
    let v = null; try { const S = NC.save; v = S && S.settings ? S.settings.lang : null; } catch (e) {}
    if (v && v !== cur && !firing) { const n = norm(v); if (n && n !== cur) { apply(n); schedule(); } }
    return cur;
  }

  NC.onLang = fn => { if (typeof fn === 'function') listeners.push(fn); return fn; };
  NC.offLang = fn => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
  // NC.setLang('ro'|'en'|'ro-RO'...) - listeners fire only on a real change (or force)
  NC.setLang = function (l, force) {
    l = norm(l); if (!l) return cur;
    const changed = l !== cur; apply(l);
    if (changed || force) fire();
    return cur;
  };
  // NC.lang stays readable/writable for old code; writing it goes through setLang (listeners fire)
  Object.defineProperty(NC, 'lang', { configurable: true, enumerable: true, get: () => lang(), set: v => { NC.setLang(v); } });

  // ------------------------------------------------------------------ lookup
  const KEYLIKE = /^[A-Za-z][\w-]*(\.[\w-]+)+$/;
  const GENERIC = /^(name|desc|title|label|text|txt|sub|body|perk|hint|msg)$/;
  const humanize = key => {
    const parts = String(key).split('.');
    while (parts.length > 1 && GENERIC.test(parts[parts.length - 1])) parts.pop();
    const w = parts[parts.length - 1].replace(/^(evo|sp)_/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toLowerCase();
    return w ? w[0].toUpperCase() + w.slice(1) : String(key);
  };
  NC.i18nHumanize = humanize;
  const missing = NC.i18nMissing = { ro: {}, en: {} };
  const note = (l, key) => { if (!missing[l][key]) { missing[l][key] = 1; try { console.warn('[i18n] missing ' + l + ': ' + key); } catch (e) {} } };
  const fill = (s, vars) => (vars ? String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)) : s);

  NC.t = function (key, vars) {
    if (key == null) return '';
    key = String(key);
    const L = lang(), D = NC.I18N;
    let s = D[L] ? D[L][key] : null;
    if (s == null) {
      if (!KEYLIKE.test(key)) return fill(key, vars);     // already a text, not a key
      note(L, key);
      if (L !== 'en' && D.en) s = D.en[key];              // RO missing -> EN (better than a raw key)
      if (s == null) s = humanize(key);                    // EN missing -> humanized key, never Romanian
    }
    return fill(s, vars);
  };
  NC.hasT = (key, l) => (l ? !!(NC.I18N[l] && NC.I18N[l][key] != null) : (NC.I18N.ro[key] != null || NC.I18N.en[key] != null));

  // Live strings. NC.tLive(key, vars) -> object that translates whenever it is turned into a string
  // (template literal, + concat, textContent =, UI.esc). Use it when a name is stored at spawn/creation time.
  NC.tLive = (key, vars) => ({ key, vars, toString() { return NC.t(key, vars); }, valueOf() { return NC.t(key, vars); }, toJSON() { return NC.t(key, vars); } });
  // NC.tEl(el, key, vars) sets the text AND binds it: it is re-translated automatically on every language switch.
  NC.tEl = (el, key, vars) => {
    if (!el) return el;
    el.setAttribute('data-tk', key);
    if (vars) el.setAttribute('data-tv', JSON.stringify(vars)); else el.removeAttribute('data-tv');
    el.textContent = NC.t(key, vars);
    return el;
  };
  // Re-translate bound elements: [data-tk(+data-tv)], [data-i18n(+data-i18n-vars)], [data-i18n-ph|-title|-aria].
  NC.i18nApply = (root) => {
    try {
      root = root || document; if (!root || !root.querySelectorAll) return;
      const vars = s => { try { return s ? JSON.parse(s) : undefined; } catch (e) { return undefined; } };
      root.querySelectorAll('[data-tk]').forEach(el => { el.textContent = NC.t(el.getAttribute('data-tk'), vars(el.getAttribute('data-tv'))); });
      root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = NC.t(el.getAttribute('data-i18n'), vars(el.getAttribute('data-i18n-vars'))); });
      [['ph', 'placeholder'], ['title', 'title'], ['aria', 'aria-label']].forEach(([a, attr]) =>
        root.querySelectorAll('[data-i18n-' + a + ']').forEach(el => el.setAttribute(attr, NC.t(el.getAttribute('data-i18n-' + a)))));
    } catch (e) { console.error(e); }
  };
  NC.onLang(() => NC.i18nApply());
  NC.i18nReport = () => ({ lang: cur, missing: { ro: Object.keys(missing.ro), en: Object.keys(missing.en) } });
})(window.NC = window.NC || {});
