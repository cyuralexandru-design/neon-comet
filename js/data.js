// Neon Comet: game data tables. Pure data + small helpers, no DOM.
'use strict';
window.NC = window.NC || {};
(function (NC) {
  NC.VERSION = '2.0.0';
  NC.TAU = Math.PI * 2;
  NC.rnd = (a, b) => a + Math.random() * (b - a);
  NC.irnd = (a, b) => Math.floor(NC.rnd(a, b + 1));
  NC.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  NC.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  NC.lerp = (a, b, t) => a + (b - a) * t;
  NC.angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  NC.fmt = n => {
    n = Math.floor(n);
    if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k';
    return String(n);
  };
  NC.weighted = (entries) => { // [[value, weight], ...]
    const tot = entries.reduce((s, e) => s + e[1], 0);
    let r = Math.random() * tot;
    for (const e of entries) { r -= e[1]; if (r <= 0) return e[0]; }
    return entries[entries.length - 1][0];
  };

  // Arena: constant play area on every screen, so difficulty doesn't depend on screen size.
  NC.ARENA_AREA = 1100 * 640;

  // ---------- difficulty ----------
  NC.TIER_SIZE = 10000; // difficulty rises every 10k points
  NC.tierOf = score => 1 + Math.floor(score / NC.TIER_SIZE);
  NC.tierMult = t => ({
    hp: Math.pow(1.32, t - 1),
    dmg: Math.pow(1.17, t - 1),
    cr: 1 + 0.5 * (t - 1),          // crystal bonus per tier
    xp: 1 + 0.35 * (t - 1),
    spawn: Math.max(0.36, 1.55 * Math.pow(0.87, t - 1)),
    maxE: Math.min(30, 7 + 3 * (t - 1)),
  });
  // Boss thresholds: 10k, 25k, 50k, 100k, 250k, 500k, 1M, 2.5M ...
  NC.bossThreshold = i => [1, 2.5, 5][i % 3] * Math.pow(10, 4 + Math.floor(i / 3));

  // ---------- rarities ----------
  NC.RARITY = [
    { name: 'Comun', col: '#b8b4d6', mult: 1 },
    { name: 'Rar', col: '#4fb4ff', mult: 2 },
    { name: 'Epic', col: '#c46bff', mult: 3.6 },
    { name: 'Legendar', col: '#ffb43d', mult: 6.5 },
  ];

  // ---------- base stats (permanent, unlimited levels) ----------
  NC.BASE = { hp: 100, atk: 10, shd: 50 };
  NC.BASE_UP = {
    atk: { name: 'Atac', icon: 'atk', per: 2, desc: '+2 atac permanent', cost: l => Math.round(50 * Math.pow(1.16, l)) },
    hp: { name: 'Viață', icon: 'hp', per: 15, desc: '+15 viață permanentă', cost: l => Math.round(40 * Math.pow(1.15, l)) },
    shd: { name: 'Scut', icon: 'shd', per: 10, desc: '+10 scut permanent', cost: l => Math.round(40 * Math.pow(1.15, l)) },
  };

  // ---------- ship level (XP) ----------
  NC.xpForLevel = l => Math.round(120 * Math.pow(l, 1.55)); // XP to go from l to l+1
  NC.levelFromXp = xp => { let l = 1; while (xp >= NC.xpForLevel(l)) { xp -= NC.xpForLevel(l); l++; } return { lvl: l, into: xp, need: NC.xpForLevel(l) }; };
  NC.LEVEL_BONUS = 0.03; // +3% atk/hp/shd per ship level

  // ---------- ships ----------
  // shape: polygon points (nose to +x), drawn at ~1.35x
  NC.SHIPS = [
    { id: 'scout', name: 'Cometa', cost: 0, a: '#5ef0ff', b: '#1f5cff', hp: 1, atk: 1, shd: 1, rate: 1, speed: 1, guns: 1, crit: 0, dashCd: 1,
      perks: ['Navă echilibrată', '1 laser'],
      shape: [[18, 0], [6, 4], [0, 4], [-5, 13], [-11, 14], [-8, 5], [-12, 4], [-12, -4], [-8, -5], [-11, -14], [-5, -13], [0, -4], [6, -4]] },
    { id: 'solaris', name: 'Solaris', cost: 900, a: '#ffd65e', b: '#ff6a2b', hp: 1, atk: 1.2, shd: 1, rate: 1, speed: 1, guns: 2, crit: 0, dashCd: 1,
      perks: ['2 lasere paralele', '+20% atac'],
      shape: [[19, 0], [8, 3], [2, 9], [-6, 15], [-12, 12], [-9, 4], [-13, 0], [-9, -4], [-12, -12], [-6, -15], [2, -9], [8, -3]] },
    { id: 'umbra', name: 'Umbra', cost: 3000, a: '#d29bff', b: '#7a2bff', hp: 0.95, atk: 1.15, shd: 1.15, rate: 1.1, speed: 1.12, guns: 2, crit: 0.15, dashCd: 0.6,
      perks: ['+15% șansă de critic (×2 daune)', 'Dash cu 40% mai des', '+12% viteză, +10% cadență'],
      shape: [[20, 0], [4, 5], [-2, 16], [-8, 16], [-6, 5], [-14, 6], [-11, 0], [-14, -6], [-6, -5], [-8, -16], [-2, -16], [4, -5]] },
    { id: 'vipera', name: 'Viperă', cost: 7000, a: '#a6ff5e', b: '#0e9a6b', hp: 1.05, atk: 1.25, shd: 1.05, rate: 1.2, speed: 1.05, guns: 2, crit: 0.05, dashCd: 1, pierce: true,
      perks: ['Lasere perforante', '+25% atac, +20% cadență'],
      shape: [[22, 0], [10, 3], [4, 3], [0, 11], [-10, 13], [-6, 4], [-14, 3], [-14, -3], [-6, -4], [-10, -13], [0, -11], [4, -3], [10, -3]] },
    { id: 'titan', name: 'Titan', cost: 15000, a: '#ff9a5e', b: '#a81e3a', hp: 1.7, atk: 1.3, shd: 1.7, rate: 0.95, speed: 0.92, guns: 3, crit: 0.05, dashCd: 1,
      perks: ['3 lasere în evantai', '+70% viață și scut', '+30% atac, -8% viteză'],
      shape: [[17, 0], [10, 7], [2, 8], [-4, 17], [-13, 16], [-11, 6], [-15, 5], [-15, -5], [-11, -6], [-13, -16], [-4, -17], [2, -8], [10, -7]] },
    { id: 'nova', name: 'Nova', cost: 32000, a: '#f2fbff', b: '#3dd6ff', hp: 1.3, atk: 1.6, shd: 1.3, rate: 1.3, speed: 1.08, guns: 3, crit: 0.12, dashCd: 0.8, novaKill: true,
      perks: ['Inamicii explodează la distrugere', '+60% atac, +30% cadență', '+12% critic, +30% viață și scut'],
      shape: [[22, 0], [8, 4], [4, 12], [-4, 18], [-8, 10], [-14, 8], [-11, 0], [-14, -8], [-8, -10], [-4, -18], [4, -12], [8, -4]] },
  ];

  // ---------- turrets (orbiting drones, auto-aim) ----------
  NC.TURRETS = [
    { id: 'pulse', name: 'Drone Puls', cost: 450, count: 1, dmg: 0.4, rate: 2.2, kind: 'laser', col: '#5ef0ff', desc: '1 dronă cu țintire automată' },
    { id: 'twin', name: 'Drone Gemene', cost: 1800, count: 2, dmg: 0.4, rate: 2.2, kind: 'laser', col: '#7dff9a', desc: '2 drone cu țintire automată' },
    { id: 'missile', name: 'Drone Rachetă', cost: 6000, count: 2, dmg: 1.0, rate: 0.85, kind: 'missile', col: '#ff8a3d', desc: '2 drone cu rachete urmăritoare și explozie' },
    { id: 'arc', name: 'Drone Fulger', cost: 14000, count: 3, dmg: 0.55, rate: 1.4, kind: 'chain', col: '#c49bff', desc: '3 drone cu fulger care sare între 3 inamici' },
  ];
  NC.TURRET_MAX = 10;
  NC.turretUpCost = (t, l) => Math.round(t.cost * 0.4 * Math.pow(1.32, l));
  NC.turretLvlMult = l => 1 + 0.12 * l;

  // ---------- companions (follow the ship, 2/3 attack, same fire rate) ----------
  NC.COMPANIONS = [
    { id: 'alfa', name: 'Aripa Alfa', cost: 700, col: '#5ef0ff', guns: 1, desc: 'Trage cu 2/3 din atacul navei, la aceeași cadență' },
    { id: 'soim', name: 'Șoim', cost: 3200, col: '#ffd65e', guns: 1, homing: true, desc: '2/3 din atac, laserele urmăresc ușor ținta' },
    { id: 'spectru', name: 'Spectru', cost: 9000, col: '#c46bff', guns: 1, pierce: true, crit: 0.15, desc: '2/3 din atac, lasere perforante, +15% critic' },
    { id: 'gardian', name: 'Gardian', cost: 20000, col: '#7dff9a', guns: 2, shieldAura: true, desc: '2 lasere de 2/3 atac + scutul se reface cu 30% mai repede' },
  ];
  NC.COMP_MAX = 10;
  NC.compUpCost = (c, l) => Math.round(c.cost * 0.35 * Math.pow(1.3, l));
  NC.compDmg = l => 2 / 3 + 0.05 * l; // fraction of ship attack

  // ---------- gear (Cup Heroes style) ----------
  NC.SLOTS = [
    { id: 'weapon', name: 'Tun', main: 'atk', base: 3, label: 'Atac' },
    { id: 'armor', name: 'Armură', main: 'hp', base: 25, label: 'Viață' },
    { id: 'gen', name: 'Generator', main: 'shd', base: 15, label: 'Scut' },
    { id: 'core', name: 'Modul', main: 'cr', base: 6, label: '% cristale' },
  ];
  NC.GEAR_NAMES = {
    weapon: [['Tun cu plasmă', 'Emițător ionic'], ['Tun fazic', 'Lansator prismă'], ['Tun de antimaterie', 'Distrugător cuantic'], ['Furia Supernovei', 'Lancea Stelară']],
    armor: [['Placă de titan', 'Blindaj compozit'], ['Carcasă de grafen', 'Blindaj reactiv'], ['Cuirasă neutronică', 'Plăci de cristal'], ['Egida Galactică', 'Pielea Pulsarului']],
    gen: [['Generator de câmp', 'Emițător de barieră'], ['Matrice de scut', 'Bobină dublă'], ['Generator gravitonic', 'Nucleu de barieră'], ['Inima Nebuloasei', 'Orizontul Evenimentelor']],
    core: [['Cip de navigație', 'Procesor tactic'], ['Modul de recoltare', 'Senzor cuantic'], ['Nucleu de date AI', 'Rețea neurală'], ['Ochiul Cosmosului', 'Cristalul Primordial']],
  };
  NC.EXTRA_STATS = [
    { id: 'crit', label: '% critic', base: 2, fmt: v => '+' + v.toFixed(0) + '% critic' },
    { id: 'rate', label: '% cadență', base: 3, fmt: v => '+' + v.toFixed(0) + '% cadență' },
    { id: 'xp', label: '% XP', base: 5, fmt: v => '+' + v.toFixed(0) + '% XP' },
    { id: 'regen', label: '% refacere scut', base: 6, fmt: v => '+' + v.toFixed(0) + '% refacere scut' },
    { id: 'magnet', label: 'magnet', base: 12, fmt: v => '+' + v.toFixed(0) + ' rază magnet' },
  ];
  NC.gearMaxLvl = r => 5 * (r + 1);
  NC.gearUpCost = (it) => Math.round(60 * NC.RARITY[it.r].mult * Math.pow(1.28, it.lvl - 1));
  NC.gearSellValue = (it) => Math.round(40 * NC.RARITY[it.r].mult * (1 + 0.3 * (it.lvl - 1)));
  NC.gearMain = (it) => {
    const s = NC.SLOTS.find(s => s.id === it.slot);
    return it.q * s.base * NC.RARITY[it.r].mult * (1 + 0.12 * (it.lvl - 1));
  };
  NC.gearExtras = (it) => (it.ex || []).map(e => ({ id: e.id, v: e.q * NC.EXTRA_STATS.find(x => x.id === e.id).base * (1 + 0.6 * it.r) * (1 + 0.08 * (it.lvl - 1)) }));
  let uid = 0;
  NC.makeItem = (r, slot) => {
    slot = slot || NC.pick(NC.SLOTS).id;
    const names = NC.GEAR_NAMES[slot][r];
    const ex = [];
    const nEx = r >= 3 ? 2 : r >= 1 ? 1 : 0;
    const pool = NC.EXTRA_STATS.slice();
    for (let i = 0; i < nEx; i++) ex.push({ id: pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id, q: NC.rnd(0.85, 1.15) });
    return { id: Date.now().toString(36) + (uid++).toString(36) + Math.floor(Math.random() * 1e4).toString(36), slot, r, lvl: 1, q: NC.rnd(0.9, 1.1), name: NC.pick(names), ex };
  };

  NC.CHESTS = [
    { id: 'common', name: 'Cufăr comun', cost: 250, w: [72, 24, 4, 0], items: 1, col: '#b8b4d6', bonusCr: [20, 60] },
    { id: 'rare', name: 'Cufăr rar', cost: 900, w: [20, 55, 21, 4], items: 2, col: '#4fb4ff', bonusCr: [80, 200] },
    { id: 'epic', name: 'Cufăr epic', cost: 2600, w: [0, 35, 47, 18], items: 3, col: '#c46bff', bonusCr: [250, 600] },
    { id: 'legend', name: 'Cufăr legendar', cost: 7500, w: [0, 0, 55, 45], items: 3, col: '#ffb43d', bonusCr: [700, 1500] },
  ];

  // ---------- in-run upgrade cards ----------
  NC.CARDS = [
    { id: 'dmg', name: 'Supraîncărcare', desc: '+15% daune', max: 10, w: 10, icon: 'atk' },
    { id: 'rate', name: 'Cadență', desc: '+15% viteză de tragere', max: 8, w: 10, icon: 'rate' },
    { id: 'gun', name: 'Tun suplimentar', desc: '+1 laser în evantai', max: 3, w: 6, icon: 'gun' },
    { id: 'pierce', name: 'Perforare', desc: 'Laserele trec prin inamici', max: 1, w: 4, icon: 'pierce' },
    { id: 'bounce', name: 'Ricoșeu', desc: 'Laserele sar în încă un inamic', max: 2, w: 5, icon: 'bounce' },
    { id: 'missile', name: 'Rachete', desc: 'Rachete urmăritoare la fiecare 2s', max: 4, w: 6, icon: 'missile' },
    { id: 'orbit', name: 'Lame orbitale', desc: '+1 lamă de energie în jurul navei', max: 4, w: 6, icon: 'orbit' },
    { id: 'shield', name: 'Scut întărit', desc: '+30% scut, refacere mai rapidă', max: 5, w: 8, icon: 'shd' },
    { id: 'heal', name: 'Reparații', desc: 'Reface 40% viață, +10% viață maximă', max: 99, w: 7, icon: 'hp' },
    { id: 'magnet', name: 'Magnet', desc: 'Atrage stelele de mult mai departe', max: 3, w: 5, icon: 'magnet' },
    { id: 'speed', name: 'Propulsoare', desc: '+10% viteză, dash mai des', max: 4, w: 6, icon: 'speed' },
    { id: 'crit', name: 'Țintă critică', desc: '+10% șansă de critic', max: 5, w: 7, icon: 'crit' },
    { id: 'vamp', name: 'Absorbție', desc: 'Recuperezi 1% viață la fiecare distrugere', max: 3, w: 4, icon: 'vamp' },
  ];
  NC.runXpFor = lvl => Math.round(18 + lvl * 9 + Math.pow(lvl, 1.6) * 2);

  // ---------- enemies ----------
  NC.ENEMIES = {
    drifter: { name: 'Mină', r: 15, hp: 20, dmg: 16, sp: 60, col: '#ff4f8b', score: 20, cr: 2, xp: 2, unlock: 0, w: 5 },
    hunter: { name: 'Vânător', r: 14, hp: 28, dmg: 14, sp: 95, col: '#ff8a3d', score: 35, cr: 3, xp: 3, unlock: 3000, w: 3, desc: 'te urmărește prin sector' },
    splitter: { name: 'Asteroid', r: 30, hp: 75, dmg: 22, sp: 40, col: '#6dffa8', score: 60, cr: 5, xp: 5, unlock: 6000, w: 2, desc: 'se sparge în fragmente' },
    shard: { name: 'Fragment', r: 12, hp: 14, dmg: 12, sp: 120, col: '#6dffa8', score: 12, cr: 1, xp: 1, unlock: Infinity, w: 0 },
    gunner: { name: 'Turelă', r: 19, hp: 60, dmg: 12, sp: 30, col: '#b18cff', score: 70, cr: 6, xp: 6, unlock: 12000, w: 2, desc: 'trage cu plasmă țintită' },
    charger: { name: 'Berbec', r: 17, hp: 45, dmg: 30, sp: 45, col: '#ff3b5c', score: 80, cr: 6, xp: 6, unlock: 20000, w: 2, desc: 'țintește, apoi plonjează' },
    sentinel: { name: 'Santinelă', r: 20, hp: 110, dmg: 22, sp: 20, col: '#3df0c8', score: 120, cr: 9, xp: 9, unlock: 35000, w: 1.5, desc: 'încarcă și trage cu rază laser' },
    carrier: { name: 'Purtător', r: 28, hp: 170, dmg: 24, sp: 28, col: '#ffcf3d', score: 150, cr: 12, xp: 12, unlock: 60000, w: 1, desc: 'lansează roiuri de drone' },
    mini: { name: 'Dronă', r: 9, hp: 8, dmg: 8, sp: 150, col: '#ffcf3d', score: 6, cr: 0, xp: 1, unlock: Infinity, w: 0 },
  };
  NC.ELITE_FROM = 30000;

  // ---------- bosses ----------
  NC.BOSSES = [
    { id: 'dread', name: 'DREADNOUGHT', sub: 'navă-mamă de asalt', col: '#ff4f8b', col2: '#ffd65e',
      phases: [['aimed', 'gapRing', 'aimed', 'sweep'], ['aimed', 'gapRing', 'sweep', 'mines'], ['sweep', 'aimed', 'ram', 'gapRing', 'mines']] },
    { id: 'weaver', name: 'ȚESĂTORUL', sub: 'inteligență de luptă', col: '#c46bff', col2: '#5ef0ff',
      phases: [['spiral', 'orbs', 'aimed'], ['spiral', 'orbs', 'blink', 'gapRing'], ['blink', 'spiral', 'orbs', 'sweep', 'blink']] },
    { id: 'levi', name: 'LEVIATAN', sub: 'distrugător de clasă titan', col: '#ffb43d', col2: '#ff4f8b',
      phases: [['ram', 'aimed', 'gapRing'], ['ram', 'sweep', 'mines', 'aimed'], ['ram', 'sweep', 'ram', 'spiral', 'mines']] },
  ];
  NC.bossHp = i => Math.round(1700 * Math.pow(1.85, i));

  // ---------- achievements ----------
  NC.ACH = [
    { id: 'first', name: 'Prima misiune', desc: 'Termină o rundă', goal: s => s.stats.runs >= 1, cr: 50 },
    { id: 'k100', name: 'Vânător', desc: 'Distruge 100 de inamici', goal: s => s.stats.kills >= 100, cr: 100 },
    { id: 'k1000', name: 'Exterminator', desc: 'Distruge 1.000 de inamici', goal: s => s.stats.kills >= 1000, cr: 500 },
    { id: 'k10000', name: 'Flagelul galaxiei', desc: 'Distruge 10.000 de inamici', goal: s => s.stats.kills >= 10000, cr: 3000 },
    { id: 's10k', name: 'Sector 2', desc: 'Atinge 10.000 de puncte', goal: s => s.best >= 10000, cr: 150 },
    { id: 's50k', name: 'Pilot de elită', desc: 'Atinge 50.000 de puncte', goal: s => s.best >= 50000, cr: 600 },
    { id: 's250k', name: 'Legendă', desc: 'Atinge 250.000 de puncte', goal: s => s.best >= 250000, cr: 3000 },
    { id: 'b1', name: 'Ucigaș de titani', desc: 'Învinge un boss', goal: s => s.stats.bosses >= 1, cr: 300 },
    { id: 'b10', name: 'Spaima amiralilor', desc: 'Învinge 10 boși', goal: s => s.stats.bosses >= 10, cr: 2500 },
    { id: 'lvl10', name: 'Veteran', desc: 'Nava ajunge la nivelul 10', goal: s => NC.levelFromXp(s.xp).lvl >= 10, cr: 400 },
    { id: 'lvl25', name: 'As al spațiului', desc: 'Nava ajunge la nivelul 25', goal: s => NC.levelFromXp(s.xp).lvl >= 25, cr: 2000 },
    { id: 'ships3', name: 'Colecționar', desc: 'Deține 3 nave', goal: s => s.ships.owned.length >= 3, cr: 500 },
    { id: 'legend', name: 'Atins de stele', desc: 'Obține un obiect legendar', goal: s => s.gear.items.some(i => i.r === 3), cr: 800 },
    { id: 'combo15', name: 'Neoprit', desc: 'Atinge combo ×15', goal: s => s.stats.maxCombo >= 15, cr: 250 },
  ];

  NC.DAILY = [100, 150, 200, 300, 400, 600, 1000]; // streak rewards, day 7 also gives a rare chest
})(window.NC);
