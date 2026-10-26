'use strict';
// Neon Comet - STORY MODE texts (agent "data"): chapters, levels, crew, crew items, dialogs, clues. RO without diacritics + EN.
(function (NC) {
  NC.I18N = NC.I18N || {}; NC.I18N.ro = NC.I18N.ro || {}; NC.I18N.en = NC.I18N.en || {};
  const ro = {}, en = {};
  const add = (k, r, e) => { ro[k] = r; en[k] = e; };

  add('story.title', 'ECOUL LUI VEGA', 'THE VEGA ECHO');
  add('story.err.invalid', 'Actiune invalida.', 'Invalid action.');
  add('story.err.locked', 'Membru blocat.', 'Crew member locked.');
  add('story.err.team', 'Echipa: 1 pana la 3 membri.', 'Team: 1 to 3 members.');
  add('story.err.maxLevel', 'Nivel maxim.', 'Max level.');
  add('story.err.noXp', 'XP insuficient.', 'Not enough XP.');
  add('story.err.equipped', 'Obiectul este echipat.', 'Item is equipped.');
  add('story.err.mergeRule', 'Cate 3 obiecte, acelasi slot si aceeasi raritate.', 'Pick 3 items with the same slot and rarity.');
  add('story.err.maxRarity', 'Raritate maxima.', 'Max rarity.');
  add('story.err.noChest', 'Cufar indisponibil.', 'Chest unavailable.');
  add('story.slot.cw', 'Arma personala', 'Personal weapon');
  add('story.slot.imp', 'Implant', 'Implant');
  add('story.slot.art', 'Artefact', 'Artifact');
  add('story.fx.pow', 'Putere abilitate', 'Ability power');
  add('story.fx.cd', 'Reincarcare', 'Cooldown');
  add('story.fx.dur', 'Durata', 'Duration');

  // chapters
  const CH = [
    ['Cimitirul de Nave', 'Ship Graveyard', 'Sute de nave moarte plutesc in jurul unui semnal care nu a tacut niciodata.', 'Hundreds of dead ships drift around a signal that never went silent.'],
    ['Planeta de Cristal', 'Crystal Planet', 'In curand.', 'Coming soon.'], ['Oceanul de Gaz', 'Gas Ocean', 'In curand.', 'Coming soon.'],
    ['Jungla Biomecanica', 'Biomech Jungle', 'In curand.', 'Coming soon.'], ['Roiul Insectoid', 'Insectoid Swarm', 'In curand.', 'Coming soon.'],
    ['Imperiul Masinilor', 'Machine Empire', 'In curand.', 'Coming soon.'], ['Marginea Universului', 'Edge of the Universe', 'In curand.', 'Coming soon.'],
  ];
  CH.forEach((c, i) => { add('story.ch.' + (i + 1), c[0], c[1]); add('story.ch.' + (i + 1) + '.d', c[2], c[3]); });
  add('story.soon', 'In curand', 'Coming soon');
  add('story.fragment', 'Fragment de harta {n}/7', 'Map fragment {n}/7');

  // levels of chapter 1
  const LV = [
    ['Primul Ecou', 'First Echo'], ['Rugina Vie', 'Living Rust'], ['Hoti de Fier', 'Scrap Thieves'], ['Carcase Plutitoare', 'Floating Hulls'],
    ['Salvagerul', 'The Salvager'], ['Lumini Fantoma', 'Ghost Lights'], ['Marea Moarta', 'The Dead Sea'], ['Plasa de Lasere', 'Laser Web'],
    ['Inima Cimitirului', 'Heart of the Graveyard'], ['Regele Epavelor', 'The Grave King'],
  ];
  LV.forEach((l, i) => add('story.lv.1-' + (i + 1), l[0], l[1]));

  // crew
  const CR = {
    kael: ['Kael Arin', 'Kael Arin', 'Capitan. Ochiul sau rosu cibernetic vede Ecoul.', 'Captain. His red cyber-eye sees the Echo.',
      'Privirea Ecoului', 'Echo Sight', 'Timpul incetineste cu {p} timp de {d}s.', 'Time slows by {p} for {d}s.', '+{v} distanta dash', '+{v} dash range'],
    nyra: ['Nyra', 'Nyra', 'Inginera. Pielea ei straluceste odata cu emotiile.', 'Engineer. Her skin glows with her emotions.',
      'Drone de Reparat', 'Repair Drones', 'Vindeca {p} din viata in {d}s.', 'Heals {p} of your HP over {d}s.', '+{v} regenerare scut', '+{v} shield regen'],
    brakk: ['Brakk', 'Brakk', 'Tragator. Coarne de os, placi de piatra, lava in vene.', 'Gunner. Bone horns, stone plates, lava in his veins.',
      'Salva de Lava', 'Lava Barrage', 'Salva grea penetranta, daune x{p}, {d}s.', 'Heavy piercing volley, x{p} damage, {d}s.', '+{v} daune', '+{v} damage'],
    sable: ['Sable', 'Sable', 'Hacker, clona cu amintiri furate.', 'Hacker, a clone with stolen memories.',
      'Deturnare', 'Hijack', 'Cel mai puternic inamic lupta pentru tine {d}s (daune x{p}).', 'The strongest enemy fights for you for {d}s (x{p} damage).', '+{v} sansa critic', '+{v} crit chance'],
    iko: ['Iko', 'Iko', 'Copil android cu sufletul unei stele.', 'Android child with the soul of a star.',
      'Puls Stelar', 'Star Pulse', 'Trage toate bonusurile si ameteste inamicii {d}s (forta x{p}).', 'Pulls all pickups and stuns enemies for {d}s (power x{p}).', '+{v} magnet', '+{v} magnet'],
    vesh: ['Vesh', 'Vesh', 'Ultimul preot al unei lumi moarte. Antene si aripi spectrale.', 'Last priest of a dead world. Antennae and spectral wings.',
      'Scut Spectral', 'Spectral Ward', 'Scut care reflecta gloantele {d}s (reflectie x{p}).', 'A shield that reflects bullets for {d}s (x{p} reflect).', '+{v} viata maxima', '+{v} max HP'],
  };
  for (const id of Object.keys(CR)) {
    const c = CR[id], k = 'story.crew.' + id;
    add(k, c[0], c[1]); add(k + '.t', c[2], c[3]); add(k + '.a', c[4], c[5]); add(k + '.ad', c[6], c[7]); add(k + '.p', c[8], c[9]);
  }
  add('story.crew.unlockAt', 'Se deblocheaza dupa nivelul {l}', 'Unlocks after level {l}');
  add('story.crew.ch2', 'Capitolul 2', 'Chapter 2');

  // crew items
  const IT = {
    ci_scrapblade: ['Lama de Fier Vechi', 'Scrap Blade', 'Taiere improvizata din tabla de epava.', 'A rough edge cut from wreck plating.'],
    ci_arcpistol: ['Pistol cu Arc', 'Arc Pistol', 'Descarcari rapide, mana sigura.', 'Quick discharges, steady hand.'],
    ci_magnum: ['Magnum Greu', 'Heavy Magnum', 'Un singur foc, mult respect.', 'One shot, plenty of respect.'],
    ci_shardcaster: ['Lansator de Aschii', 'Shardcaster', 'Aschii de cristal care tin mai mult.', 'Crystal shards that last longer.'],
    ci_pulselance: ['Lance Pulsatorie', 'Pulse Lance', 'Un bat de energie, usor si rapid.', 'A light, fast staff of energy.'],
    ci_nervelink: ['Legatura Nervoasa', 'Nerve Link', 'Reflexe mai rapide intre gand si buton.', 'Faster reflexes between thought and button.'],
    ci_cooler: ['Racitor Cuantic', 'Quantum Cooler', 'Abilitatile se racesc mai repede.', 'Abilities cool down faster.'],
    ci_dermplate: ['Placa Dermica', 'Dermplate', 'Piele de ranforsare sub piele.', 'Armor woven under the skin.'],
    ci_oculus: ['Oculus', 'Oculus', 'Un al treilea ochi pentru momentul potrivit.', 'A third eye for the right moment.'],
    ci_reactor: ['Mini Reactor', 'Mini Reactor', 'Un mic soare in piept.', 'A tiny sun in the chest.'],
    ci_beacon: ['Far Vechi', 'Old Beacon', 'Lumina care nu s-a stins in 300 de ani.', 'A light that has not gone out in 300 years.'],
    ci_hourglass: ['Clepsidra Stricata', 'Broken Hourglass', 'Nisipul curge mai lent pentru tine.', 'The sand falls slower for you.'],
    ci_halo: ['Aureola', 'Halo', 'Un cerc de lumina pe care nu-l intelegi.', 'A circle of light you do not understand.'],
    ci_relic: ['Relicva', 'Relic', 'Ceva sfant, de undeva care nu mai exista.', 'Something holy from a place that no longer exists.'],
    ci_compass: ['Busola Stelara', 'Star Compass', 'Arata catre ce vrei sa gasesti.', 'Points to whatever you want to find.'],
  };
  for (const id of Object.keys(IT)) { add('story.item.' + id, IT[id][0], IT[id][1]); add('story.item.' + id + '.d', IT[id][2], IT[id][3]); }

  // dialogs: [id, [[ro, en], ...]]  (speakers are in data.js, same order)
  const DL = {
    d_1_1a: [
      ['Semnal detectat. Sursa: Cimitirul de Nave. Vechime: 300 de ani.', 'Signal detected. Source: the Ship Graveyard. Age: 300 years.'],
      ['Trei sute de ani de tacere. Si acum, iar acelasi ecou.', 'Three hundred years of silence. And now the same echo again.'],
      ['O bucata din harta e aici. O gasesc eu, sau ma gaseste ea pe mine.', 'A piece of the map is here. Either I find it, or it finds me.'],
      ['Atentie: dronele de recuperare sunt active. Nu sunt prietenoase.', 'Warning: salvage drones are active. They are not friendly.'],
      ['Nimic nu e prietenos in ultima vreme. Hai sa zburam.', 'Nothing has been friendly lately. Let us fly.'],
    ],
    d_1_2a: [
      ['Hei! Nu trage! Sunt inginer, nu fier vechi!', 'Hey! Do not shoot! I am an engineer, not scrap!'],
      ['Ai o nava?', 'Do you have a ship?'],
      ['Am doua maini bune, o cheie si o piele care straluceste cand ma enervez. Ai nevoie de mine.', 'I have two good hands, a wrench, and skin that glows when I get angry. You need me.'],
      ['Si de ce stralucesti acum?', 'And why are you glowing now?'],
      ['Ochiul tau e rosu. Eu nu intreb de ochi, tu nu intrebi de piele. Gata?', 'Your eye is red. I do not ask about eyes, you do not ask about skin. Deal?'],
      ['Gata. Bine ai venit la bord, Nyra.', 'Deal. Welcome aboard, Nyra.'],
    ],
    d_1_5a: [
      ['Contact masiv. Nume: SALVAGER. A mancat jumatate din cimitir.', 'Massive contact. Name: SALVAGER. It has eaten half the graveyard.'],
      ['Ce vrea?', 'What does it want?'],
      ['Tot ce straluceste. Inclusiv nava noastra.', 'Everything that shines. Including our ship.'],
      ['Atunci sa stralucim tare.', 'Then let us shine bright.'],
    ],
    d_1_5b: [
      ['Hei! Sus! Cusca asta e a lui, nu a mea!', 'Hey! Up here! This cage is his, not mine!'],
      ['Un om... cu coarne?', 'A man... with horns?'],
      ['Aproape om. Brakk. Scoate-ma de aici si iti dau focul meu.', 'Almost a man. Brakk. Get me out and I will give you my fire.'],
      ['Treci la tunuri.', 'Take the guns.'],
      ['In sfarsit cineva care vorbeste pe limba mea.', 'Finally, someone who speaks my language.'],
    ],
    d_1_8a: [
      ['Opreste-te, Kael Arin. Nu, nu intreba de unde stiu numele.', 'Stop, Kael Arin. No, do not ask how I know your name.'],
      ['Cine esti?', 'Who are you?'],
      ['Cineva cu amintirile altcuiva. Un om a vazut Ecoul, iar eu port ce a vazut.', 'Someone with another person\'s memories. A man saw the Echo, and I carry what he saw.'],
      ['Nu am incredere in el.', 'I do not trust this one.'],
      ['Nici eu, uneori, in mine. Dar stiu unde duce harta. Cred.', 'Neither do I, sometimes. But I know where the map leads. I think.'],
      ['Hackerii mint. Dar el are ochi tristi.', 'Hackers lie. But he has sad eyes.'],
      ['Bine, Sable. Un loc la bord. Dar ne spui tot.', 'Fine, Sable. A seat on board. But you tell us everything.'],
    ],
    d_1_10a: [
      ['Structura gigantica detectata. Nume: GRAVEKING. Nucleul emite semnalul.', 'Gigantic structure detected. Name: GRAVEKING. The core is transmitting the signal.'],
      ['Ecoul nu vine de la el. Vine prin el.', 'The Echo does not come from it. It comes through it.'],
      ['E doar o epava mare. Hai sa o facem o epava mica.', 'It is just a big wreck. Let us make it a small wreck.'],
      ['Atentie. Nu e doar metal. Se uita la noi.', 'Careful. It is not just metal. It is watching us.'],
      ['Scuturile sunt gata. Zboara, Kael.', 'Shields ready. Fly, Kael.'],
      ['Echipa. Impreuna.', 'Crew. Together.'],
    ],
    d_1_10b: [
      ['Fragment 1 din 7 recuperat. Urmatoarea coordonata: o lume de cristal.', 'Fragment 1 of 7 recovered. Next coordinate: a crystal world.'],
      ['Kael, uita-te la marcajul de timp al fragmentului.', 'Kael, look at the fragment\'s timestamp.'],
      ['Nu e gresit. Semnalul a fost trimis... peste patruzeci de ani.', 'It is not an error. The signal was sent... forty years from now.'],
      ['Imposibil. Ecoul are trei sute de ani.', 'Impossible. The Echo is three hundred years old.'],
      ['Poate nu a venit de departe. Poate a venit de acasa.', 'Maybe it did not come from far away. Maybe it came from home.'],
      ['Si de ce am vazut-o numai eu?', 'And why was I the only one who saw it?'],
      ['Ai gasit prima piesa, Kael. Acum ei stiu ca esti treaz. Nu o da nimanui.', 'You found the first piece, Kael. Now they know you are awake. Give it to no one.'],
    ],
  };
  for (const id of Object.keys(DL)) DL[id].forEach((t, i) => add('story.d.' + id + '.' + (i + 1), t[0], t[1]));
  add('story.who.kael', 'Kael', 'Kael'); add('story.who.nyra', 'Nyra', 'Nyra'); add('story.who.brakk', 'Brakk', 'Brakk');
  add('story.who.sable', 'Sable', 'Sable'); add('story.who.sys', 'NAVA', 'SHIP'); add('story.who.echo', '???', '???');
  add('story.skip', 'Sari', 'Skip'); add('story.next', 'Urmatorul', 'Next');

  // clues (hint at the twist: the Echo is a warning from our own future; every crew member is the echo of a dead species)
  const CL = [
    ['Jurnal de bord: Aurora', 'Ship log: Aurora', 'Ultima inregistrare a capitanului: "Semnalul nu vine din spatele stelelor. Vine din spatele nostru." Restul paginii e ars.', 'The captain\'s last entry: "The signal does not come from beyond the stars. It comes from behind us." The rest of the page is burned.'],
    ['Margine de harta', 'Map margin', 'Pe marginea fragmentului e gravat: "Sapte lumi, sapte ecouri." Nu scrie nimic despre cine le-a numarat.', 'Along the fragment\'s edge it is engraved: "Seven worlds, seven echoes." It does not say who counted them.'],
    ['Cusca Salvagerului', 'The Salvager\'s cage', 'In cusca sunt zgarieturi: nume de specii. Toate au acelasi simbol, ca un semn pe piele. Brakk are si el unul.', 'Scratched into the cage are the names of species. All carry the same symbol, like a mark on skin. Brakk has one too.'],
    ['Inregistrare fantoma', 'Ghost recording', 'Navele fantoma repeta aceleasi 12 secunde: un copil canta un cantec de leagan. Kael il stie. Nu-si aminteste de unde.', 'The ghost ships loop the same 12 seconds: a child singing a lullaby. Kael knows it. He cannot remember from where.'],
    ['Cronometru defect', 'Faulty chronometer', 'Cronometrul Ecoului arata o data din viitor. Cand il resetezi, se intoarce singur, ca si cum ar fi prea tarziu.', 'The Echo\'s chronometer shows a date in the future. When you reset it, it sets itself back, as if it were already too late.'],
    ['Nucleul Graveking', 'Graveking core', 'In nucleu e o oglinda mare. Reflexia nu arata nava ta, ci o flota de nave umane, toate in flacari, de partea cealalta.', 'Inside the core is a large mirror. It does not show your ship, but a fleet of human ships, all burning, on the other side.'],
  ];
  CL.forEach((c, i) => { add('story.clue.c' + (i + 1) + '.t', c[0], c[1]); add('story.clue.c' + (i + 1), c[2], c[3]); });
  add('story.clues', 'Indicii', 'Clues'); add('story.clue.new', 'Indiciu nou', 'New clue'); add('story.clue.locked', 'Necunoscut', 'Unknown');

  Object.assign(NC.I18N.ro, ro); Object.assign(NC.I18N.en, en);
})(window.NC = window.NC || {});
(function (NC) {
  Object.assign(NC.I18N.ro, { 'en.scav.name': 'Scavenger', 'en.hulk.name': 'Epava', 'en.scrap.name': 'Fier vechi', 'en.ghost.name': 'Nava fantoma', 'en.tether.name': 'Tesator de mine', 'en.tmine.name': 'Mina legata',
    'mboss.salvager.name': 'RECUPERATORUL', 'boss.graveking.name': 'REGELE EPAVELOR', 'sui.star': 'Stea' });
  Object.assign(NC.I18N.en, { 'en.scav.name': 'Scavenger', 'en.hulk.name': 'Derelict Hull', 'en.scrap.name': 'Scrap', 'en.ghost.name': 'Ghost Ship', 'en.tether.name': 'Mine Weaver', 'en.tmine.name': 'Tethered Mine',
    'mboss.salvager.name': 'THE SALVAGER', 'boss.graveking.name': 'THE GRAVE KING', 'sui.star': 'Star' });
})(window.NC = window.NC || {});
