// Neon Comet: menus, hangar/shop, chests, settings, records, account, HUD, gamepad menu navigation.
'use strict';
(function (NC) {
  const $ = id => document.getElementById(id);
  const G = NC.game;
  const U = NC.ui = {};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtN = n => Math.floor(n).toLocaleString('ro-RO');

  // ---------------- icons ----------------
  const IC = {
    atk: 'M20 4l-9.5 9.5M20 4h-5M20 4v5M11 13l-4 4 3 3 4-4M6 18l-2 2',
    hp: 'M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-3 4.5 4.5 0 0 1 9 3c-2 4.5-9 9-9 9z',
    shd: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
    cr: 'M6 4h12l4 5-10 12L2 9zM2 9h20M12 21L8 9l4-5 4 5z',
    rate: 'M13 2L4 14h7l-1 8 9-12h-7z',
    gun: 'M3 12h13M3 7h10M3 17h10M16 9l4 3-4 3',
    pierce: 'M2 12h18M15 7l5 5-5 5M8 8v8',
    bounce: 'M3 17l6-10 6 10 6-10',
    missile: 'M5 19l3-3M14 4l6 6-8 8-6-6zM9 9l6 6',
    orbit: 'M12 4a8 8 0 1 0 0 16 8 8 0 1 0 0-16M12 10a2 2 0 1 0 0 4 2 2 0 1 0 0-4',
    magnet: 'M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3z',
    speed: 'M3 12h10M5 7h8M5 17h8M15 6l6 6-6 6',
    crit: 'M12 2v4M12 18v4M2 12h4M18 12h4M12 7a5 5 0 1 0 0 10 5 5 0 1 0 0-10',
    vamp: 'M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z',
    play: 'M7 4l13 8-13 8z',
    ship: 'M12 2l4 10-4 3-4-3zM8 12l-4 6 5-1M16 12l4 6-5-1M10 19h4',
    chest: 'M3 10h18v10H3zM3 10a9 5 0 0 1 18 0M10 10v4h4v-4',
    gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
    trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8 21h8',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 1 0 0 8zM4 21a8 8 0 0 1 16 0',
    exit: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
    back: 'M15 5l-7 7 7 7',
    pause: 'M8 5v14M16 5v14',
    turret: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 9v6M9 12h6',
    comp: 'M4 13l6-3v6zM12 8l8-3v14l-8-3z',
    weapon: 'M20 4l-9.5 9.5M20 4h-5M20 4v5M11 13l-4 4 3 3 4-4M6 18l-2 2',
    armor: 'M5 4h14v6c0 6-3 9-7 10-4-1-7-4-7-10zM9 4v7h6V4',
    gen: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM13 8l-3 4h4l-3 4',
    core: 'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
    pad: 'M6 9h12a4 4 0 0 1 4 4v1a3 3 0 0 1-5 2l-2-2H9l-2 2a3 3 0 0 1-5-2v-1a4 4 0 0 1 4-4zM8 11v4M6 13h4M16 12h.01M18 14h.01',
    pc: 'M3 4h18v12H3zM8 20h8M12 16v4',
    phone: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
    star: 'M12 2l3 7 7 .6-5.3 4.7L18.4 22 12 18.3 5.6 22l1.7-7.7L2 9.6 9 9z',
    check: 'M5 12l5 5L20 7',
    lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
    restart: 'M4 12a8 8 0 1 0 3-6.3M4 4v5h5',
    home: 'M3 11l9-8 9 8M5 10v10h14V10',
    up: 'M12 19V5M5 12l7-7 7 7',
    gift: 'M3 9h18v4H3zM5 13h14v8H5zM12 9v12M12 9c-2-4-6-4-6-1s6 1 6 1c2-4 6-4 6-1s-6 1-6 1',
    copy: 'M9 9h11v11H9zM5 15V4h11',
    download: 'M12 3v12M7 10l5 5 5-5M4 20h16',
  };
  const FILLED = new Set(['play', 'star']);
  const ic = (n, cls = '') => `<svg class="ico ${FILLED.has(n) ? 'f' : ''} ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[n] || IC.star}"/></svg>`;
  NC.icon = ic;

  // ---------------- screens ----------------
  const SCREENS = ['scrMenu', 'scrHangar', 'scrSettings', 'scrRecords', 'scrAccount', 'scrPause', 'scrCards', 'scrRevive', 'scrOver', 'scrExit'];
  let cur = null, stack = [];
  const RENDER = { scrMenu: renderMenu, scrHangar: renderHangar, scrSettings: renderSettings, scrRecords: renderRecords, scrAccount: renderAccount, scrExit: renderExit };
  function go(id, push = true) {
    if (push && cur && cur !== id) stack.push(cur);
    if (!push) stack = [];
    SCREENS.forEach(s => $(s).hidden = s !== id);
    cur = id;
    if (RENDER[id]) RENDER[id]();
    $(id).scrollTop = 0;
    focusFirst();
  }
  function hideScreens() { SCREENS.forEach(s => $(s).hidden = true); cur = null; stack = []; }
  U.back = () => {
    if (!$('modal').hidden) { if (!(modalCtx && modalCtx.locked)) closeModal(); return; }
    if (cur === 'scrPause') { U.closePause(); return; }
    if (cur === 'scrCards' || cur === 'scrRevive' || cur === 'scrMenu' || !cur) return;
    if (cur === 'scrOver' || cur === 'scrExit') { act('menu', {}); return; }
    const prev = stack.pop();
    if (!prev) { go('scrMenu', false); return; }
    SCREENS.forEach(s => $(s).hidden = s !== prev); cur = prev;
    if (RENDER[prev]) RENDER[prev]();
    focusFirst();
  };
  U.menuOpen = () => cur !== null || !$('modal').hidden;
  U.refresh = () => { if (cur && RENDER[cur]) RENDER[cur](); };

  // ---------------- toasts / modal ----------------
  U.toast = (msg, ms = 2600) => {
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = msg; $('toasts').appendChild(t);
    setTimeout(() => t.remove(), ms);
  };
  let modalAnim = null, modalCtx = null;
  function openModal(html, ctx) {
    $('modal').innerHTML = `<div class="mbox" role="dialog" aria-modal="true">${html}</div>`;
    $('modal').hidden = false; modalCtx = ctx || null;
    focusFirst();
  }
  function closeModal() {
    $('modal').hidden = true; $('modal').innerHTML = '';
    if (modalAnim) { cancelAnimationFrame(modalAnim); modalAnim = null; }
    const after = modalCtx && modalCtx.after; modalCtx = null;
    if (after) after();
    U.refresh(); focusFirst();
  }
  $('modal').addEventListener('click', e => { if (e.target === $('modal') && !(modalCtx && modalCtx.locked)) closeModal(); });

  // ---------------- helpers ----------------
  const ctrlSeg = () => {
    const c = NC.save.settings.ctrl;
    return [['pc', 'PC', 'pc'], ['touch', 'Telefon', 'phone'], ['gamepad', 'Controller', 'pad']]
      .map(([v, l, i]) => `<button type="button" role="radio" aria-checked="${c === v}" data-a="ctrl" data-v="${v}">${ic(i)}${l}</button>`).join('');
  };
  const pips = (n, max) => `<div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
  const crTxt = n => `${ic('cr')} <span class="num">${fmtN(n)}</span>`;
  const claimable = () => NC.ACH.filter(a => !NC.save.ach[a.id] && a.goal(NC.save));
  const chestTotal = () => Object.values(NC.save.chests).reduce((a, b) => a + b, 0);
  const badge = n => n > 0 ? `<span class="badge">${n}</span>` : '';
  const today = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

  // =====================================================================
  // MAIN MENU
  // =====================================================================
  let deferredInstall = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; if (cur === 'scrMenu') renderMenu(); });
  function renderMenu() {
    const s = NC.save, st = NC.computeStats(), L = NC.levelFromXp(s.xp), cl = claimable().length, ch = chestTotal();
    const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone;
    $('scrMenu').innerHTML = `
    <div class="menu">
      <div>
        <h1 class="logo">Neon<br>Comet<small>arcade spațial · v${NC.VERSION}</small></h1>
        <p class="tag">Distruge valuri de inamici, învinge boși la 10k, 25k, 50k de puncte, deschide cufere și construiește-ți flota.</p>
        <div class="pcard">
          <div class="lvlbadge"><div><small>NIVEL</small>${L.lvl}</div></div>
          <div class="row"><span>${esc(st.ship.name)}</span><span class="s-cr">${crTxt(s.credits)}</span></div>
          <div class="xpbar" title="XP navă"><i style="width:${(L.into / L.need * 100).toFixed(1)}%"></i></div>
          <div class="statline"><span class="s-atk">${ic('atk')} ${fmtN(st.atk)}</span><span class="s-hp">${ic('hp')} ${fmtN(st.hp)}</span><span class="s-shd">${ic('shd')} ${fmtN(st.shd)}</span><span class="s-pow">${ic('star')} ${NC.fmt(st.power)}</span></div>
        </div>
      </div>
      <div class="mbtns">
        <button class="btn pri" type="button" data-a="play">${ic('play')} Start</button>
        <div class="mgrid">
          <button class="btn" type="button" data-a="hangar">${ic('ship')} Hangar</button>
          <button class="btn" type="button" data-a="chests">${ic('chest')} Cufere${badge(ch)}</button>
          <button class="btn" type="button" data-a="records">${ic('trophy')} Realizări${badge(cl)}</button>
          <button class="btn" type="button" data-a="settings">${ic('gear')} Setări</button>
          <button class="btn" type="button" data-a="account">${ic('user')} Cont</button>
          <button class="btn" type="button" data-a="exit">${ic('exit')} Ieșire</button>
        </div>
        <div class="lbl">Pe ce joci</div>
        <div class="seg" role="radiogroup" aria-label="Pe ce joci">${ctrlSeg()}</div>
        ${deferredInstall && !standalone ? `<button class="btn sm" type="button" data-a="install">${ic('download')} Instalează pe dispozitiv</button>` : ''}
        <div class="ver">Record <span class="num">${fmtN(s.best)}</span> · progresul se salvează automat</div>
      </div>
    </div>`;
  }

  // =====================================================================
  // HANGAR
  // =====================================================================
  let htab = 'base';
  const TABS = [['base', 'Bază', 'atk'], ['ships', 'Nave', 'ship'], ['turrets', 'Turele', 'turret'], ['comps', 'Companion', 'comp'], ['gear', 'Echipament', 'armor'], ['chests', 'Cufere', 'chest']];
  function renderHangar() {
    const s = NC.save, st = NC.computeStats();
    let body = '';
    if (htab === 'base') body = tabBase(s, st);
    else if (htab === 'ships') body = tabShips(s, st);
    else if (htab === 'turrets') body = tabTurrets(s, st);
    else if (htab === 'comps') body = tabComps(s, st);
    else if (htab === 'gear') body = tabGear(s, st);
    else body = tabChests(s);
    $('scrHangar').innerHTML = `
    <div class="wrap">
      <div class="head">
        <button class="back" type="button" data-a="back">${ic('back')} Înapoi</button>
        <h2>Hangar</h2>
        <span class="wallet">${crTxt(s.credits)}</span>
      </div>
      <div class="statstrip">
        <div class="st"><div class="k s-atk">${ic('atk')} Atac</div><div class="v s-atk">${fmtN(st.atk)}</div></div>
        <div class="st"><div class="k s-hp">${ic('hp')} Viață</div><div class="v s-hp">${fmtN(st.hp)}</div></div>
        <div class="st"><div class="k s-shd">${ic('shd')} Scut</div><div class="v s-shd">${fmtN(st.shd)}</div></div>
        <div class="st"><div class="k">${ic('rate')} Cadență</div><div class="v">${(4 * st.rate).toFixed(1)}/s</div></div>
        <div class="st"><div class="k">${ic('crit')} Critic</div><div class="v">${Math.round(st.crit * 100)}%</div></div>
        <div class="st"><div class="k s-pow">${ic('star')} Putere</div><div class="v s-pow">${NC.fmt(st.power)}</div></div>
      </div>
      <div class="tabs" role="tablist">${TABS.map(([id, l, i]) => `<button type="button" role="tab" aria-selected="${htab === id}" data-a="tab" data-v="${id}">${ic(i)} ${l}${id === 'chests' ? badge(chestTotal()) : ''}</button>`).join('')}</div>
      ${body}
    </div>`;
    if (htab === 'ships') document.querySelectorAll('canvas[data-ship]').forEach(c => G.drawShipPreview(c, NC.SHIPS.find(x => x.id === c.dataset.ship)));
    if (htab === 'chests') document.querySelectorAll('canvas[data-chest]').forEach(c => drawChestCanvas(c, NC.CHESTS.find(x => x.id === c.dataset.chest), 0));
  }
  function tabBase(s, st) {
    const L = NC.levelFromXp(s.xp);
    const rows = ['atk', 'hp', 'shd'].map(k => {
      const u = NC.BASE_UP[k], lv = s.base[k], cost = u.cost(lv), cls = { atk: 's-atk', hp: 's-hp', shd: 's-shd' }[k];
      return `<div class="baserow">
        <div class="bicon ${cls}">${ic(k)}</div>
        <div><div class="t">${u.name} <span class="pill">nivel ${lv}</span></div><div class="d">${u.desc} · total cu navă și echipament: <b class="${cls}">${fmtN(st[k])}</b></div></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
          <button class="btn sm gold" type="button" data-a="buyBase" data-k="${k}" data-n="1" ${s.credits < cost ? 'disabled' : ''}>+${u.per} · <span class="cost">${ic('cr')} ${fmtN(cost)}</span></button>
          <button class="btn sm" type="button" data-a="buyBase" data-k="${k}" data-n="10" ${s.credits < cost ? 'disabled' : ''}>×10</button>
        </div>
      </div>`;
    }).join('');
    return `<div class="secttl">Statistici de bază · cresc la fiecare cumpărare</div>${rows}
      <div class="baserow">
        <div class="bicon s-pow">${ic('star')}</div>
        <div><div class="t">Nivelul navei: ${L.lvl}</div><div class="d">Câștigi XP distrugând inamici. Fiecare nivel dă +${NC.LEVEL_BONUS * 100}% atac, viață și scut (acum +${Math.round((L.lvl - 1) * NC.LEVEL_BONUS * 100)}%).</div>
        <div class="xpbar" style="margin-top:8px"><i style="width:${(L.into / L.need * 100).toFixed(1)}%"></i></div></div>
        <div class="num" style="font-weight:700">${fmtN(L.into)} / ${fmtN(L.need)} XP</div>
      </div>`;
  }
  function tabShips(s, st) {
    return `<div class="grid">${NC.SHIPS.map(sh => {
      const own = s.ships.owned.includes(sh.id), eq = s.ships.eq === sh.id;
      const bars = [['Atac', sh.atk], ['Viață', sh.hp], ['Scut', sh.shd], ['Cadență', sh.rate], ['Viteză', sh.speed]]
        .map(([l, v]) => `<span>${l}</span><div class="mb"><i style="width:${Math.min(100, v / 1.7 * 100)}%;background:${sh.a}"></i></div><b>×${v.toFixed(2)}</b>`).join('');
      const act = eq ? `<button class="btn sm" type="button" disabled>${ic('check')} Echipată</button>`
        : own ? `<button class="btn sm pri" type="button" data-a="eqShip" data-id="${sh.id}">Echipează</button>`
          : `<button class="btn sm gold" type="button" data-a="buyShip" data-id="${sh.id}" ${s.credits < sh.cost ? 'disabled' : ''}>Cumpără · <span class="cost">${ic('cr')} ${fmtN(sh.cost)}</span></button>`;
      return `<div class="card ${eq ? 'eq' : ''}">
        <div class="preview"><canvas data-ship="${sh.id}" width="320" height="220"></canvas></div>
        <div class="nm">${esc(sh.name)} <span class="pill ${own ? 'on' : ''}">${eq ? 'ECHIPATĂ' : own ? 'DEȚINUTĂ' : sh.guns + (sh.guns > 1 ? ' LASERE' : ' LASER')}</span></div>
        <div class="mbars">${bars}</div>
        <ul>${sh.perks.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
        <div class="acts">${act}</div>
      </div>`;
    }).join('')}</div>`;
  }
  function tabTurrets(s, st) {
    return `<div class="note">Turelele sunt drone care se rotesc în jurul navei și țintesc singure cel mai apropiat inamic. Poți avea una echipată.</div>
    <div class="grid">${NC.TURRETS.map(t => {
      const own = s.turrets.owned.includes(t.id), eq = s.turrets.eq === t.id, lv = s.turrets.lv[t.id] || 0;
      const dmg = Math.round(st.atk * t.dmg * NC.turretLvlMult(lv)), upc = NC.turretUpCost(t, lv);
      let acts = '';
      if (!own) acts = `<button class="btn sm gold" type="button" data-a="buyTur" data-id="${t.id}" ${s.credits < t.cost ? 'disabled' : ''}>Cumpără · <span class="cost">${ic('cr')} ${fmtN(t.cost)}</span></button>`;
      else {
        acts = eq ? `<button class="btn sm" type="button" data-a="uneqTur">Scoate</button>` : `<button class="btn sm pri" type="button" data-a="eqTur" data-id="${t.id}">Echipează</button>`;
        acts += lv < NC.TURRET_MAX ? `<button class="btn sm gold" type="button" data-a="upTur" data-id="${t.id}" ${s.credits < upc ? 'disabled' : ''}>${ic('up')} <span class="cost">${ic('cr')} ${fmtN(upc)}</span></button>` : `<button class="btn sm" type="button" disabled>MAXIM</button>`;
      }
      return `<div class="card ${eq ? 'eq' : ''}">
        <div class="nm" style="color:${t.col}">${esc(t.name)} <span class="pill ${own ? 'on' : ''}">${eq ? 'ECHIPATĂ' : own ? 'NV ' + lv : t.count + ' DRONE'}</span></div>
        <div class="ds">${esc(t.desc)}</div>
        <ul><li>Daune / lovitură: <b>${fmtN(dmg)}</b> (${Math.round(t.dmg * NC.turretLvlMult(lv) * 100)}% din atac)</li><li>Cadență: ${t.rate}/s per dronă</li><li>Drone: ${t.count}</li><li>Upgrade: +12% daune pe nivel</li></ul>
        ${own ? pips(lv, NC.TURRET_MAX) : ''}
        <div class="acts">${acts}</div>
      </div>`;
    }).join('')}</div>`;
  }
  function tabComps(s, st) {
    return `<div class="note">Companionul zboară lângă navă și trage odată cu ea, la aceeași cadență, cu 2/3 din atacul tău. Fiecare upgrade adaugă +5% din atac.</div>
    <div class="grid">${NC.COMPANIONS.map(c => {
      const own = s.comps.owned.includes(c.id), eq = s.comps.eq === c.id, lv = s.comps.lv[c.id] || 0;
      const frac = NC.compDmg(lv), dmg = Math.round(st.atk * frac), upc = NC.compUpCost(c, lv);
      let acts = '';
      if (!own) acts = `<button class="btn sm gold" type="button" data-a="buyComp" data-id="${c.id}" ${s.credits < c.cost ? 'disabled' : ''}>Cumpără · <span class="cost">${ic('cr')} ${fmtN(c.cost)}</span></button>`;
      else {
        acts = eq ? `<button class="btn sm" type="button" data-a="uneqComp">Scoate</button>` : `<button class="btn sm pri" type="button" data-a="eqComp" data-id="${c.id}">Echipează</button>`;
        acts += lv < NC.COMP_MAX ? `<button class="btn sm gold" type="button" data-a="upComp" data-id="${c.id}" ${s.credits < upc ? 'disabled' : ''}>${ic('up')} <span class="cost">${ic('cr')} ${fmtN(upc)}</span></button>` : `<button class="btn sm" type="button" disabled>MAXIM</button>`;
      }
      return `<div class="card ${eq ? 'eq' : ''}">
        <div class="nm" style="color:${c.col}">${esc(c.name)} <span class="pill ${own ? 'on' : ''}">${eq ? 'ECHIPAT' : own ? 'NV ' + lv : 'COMPANION'}</span></div>
        <div class="ds">${esc(c.desc)}</div>
        <ul><li>Daune / laser: <b>${fmtN(dmg)}</b> (${Math.round(frac * 100)}% din atac)</li><li>Lasere: ${c.guns}</li><li>Cadență: identică cu nava (${(4 * st.rate).toFixed(1)}/s)</li></ul>
        ${own ? pips(lv, NC.COMP_MAX) : ''}
        <div class="acts">${acts}</div>
      </div>`;
    }).join('')}</div>`;
  }
  function mainLabel(it) { const sl = NC.SLOTS.find(x => x.id === it.slot), v = NC.gearMain(it); return sl.main === 'cr' ? `+${v.toFixed(0)}% cristale` : `+${fmtN(v)} ${sl.label.toLowerCase()}`; }
  function itemTile(it, eqd) {
    return `<button class="itm r${it.r}" type="button" data-a="item" data-id="${it.id}">
      ${eqd ? '<span class="eqd">ECHIPAT</span>' : ''}<span class="lv">N${it.lvl}</span>
      <span class="gi">${ic(it.slot)}</span><span class="in">${esc(it.name)}</span><span class="sv">${mainLabel(it)}</span></button>`;
  }
  function tabGear(s, st) {
    const eqIds = new Set(Object.values(s.gear.eq).filter(Boolean));
    const slots = NC.SLOTS.map(sl => {
      const it = s.gear.eq[sl.id] && NC.findItem(s.gear.eq[sl.id]);
      return `<button class="slot ${it ? 'r' + it.r : ''}" type="button" data-a="${it ? 'item' : 'slotEmpty'}" data-id="${it ? it.id : ''}" style="${it ? 'box-shadow: inset 0 0 0 1.5px var(--rc)' : ''}">
        <span class="lbl">${ic(sl.id)} ${sl.name}</span>
        ${it ? `<span class="in" style="color:var(--rc)">${esc(it.name)}</span><span class="sv">${mainLabel(it)} · N${it.lvl}</span>` : `<span class="sv">gol · găsești în cufere</span>`}
      </button>`;
    }).join('');
    const items = s.gear.items.slice().sort((a, b) => (eqIds.has(b.id) - eqIds.has(a.id)) || b.r - a.r || b.lvl - a.lvl);
    const commons = s.gear.items.filter(i => i.r === 0 && !eqIds.has(i.id));
    const cval = commons.reduce((a, i) => a + NC.gearSellValue(i), 0);
    return `<div class="slots">${slots}</div>
      <div class="head"><div class="secttl" style="flex:1;margin:0">Inventar · ${items.length} obiecte</div>
      ${commons.length ? `<button class="btn sm" type="button" data-a="sellCommon">Vinde comunele (${commons.length}) · <span class="cost">${ic('cr')} ${fmtN(cval)}</span></button>` : ''}</div>
      ${items.length ? `<div class="inv">${items.map(it => itemTile(it, eqIds.has(it.id))).join('')}</div>`
        : `<div class="note">Niciun obiect încă. Deschide cufere ca să obții tunuri, armuri, generatoare și module. Boșii lasă mereu un cufăr.</div><button class="btn gold" type="button" data-a="tab" data-v="chests">${ic('chest')} Mergi la cufere</button>`}`;
  }
  function tabChests(s) {
    return `<div class="note">Cuferele conțin echipament de raritate Comun, Rar, Epic sau Legendar, plus cristale bonus. Le găsești de la boși și inamici de elită, sau le cumperi aici.</div>
    <div class="grid">${NC.CHESTS.map(c => {
      const n = s.chests[c.id] || 0;
      const odds = c.w.map((w, i) => w ? `<span class="r${i}">${NC.RARITY[i].name} ${w}%</span>` : '').join('');
      return `<div class="card chest" style="box-shadow: inset 0 0 0 1px ${c.col}55">
        <canvas data-chest="${c.id}" width="220" height="180"></canvas>
        <div class="nm" style="color:${c.col};justify-content:center">${esc(c.name)}</div>
        <div class="ds">${c.items} ${c.items > 1 ? 'obiecte' : 'obiect'} + ${c.bonusCr[0]}–${c.bonusCr[1]} cristale</div>
        <div class="odds">${odds}</div>
        <div class="acts">
          ${n > 0 ? `<button class="btn sm pri" type="button" data-a="openChest" data-id="${c.id}">Deschide (${n})</button>` : ''}
          <button class="btn sm gold" type="button" data-a="buyChest" data-id="${c.id}" ${s.credits < c.cost ? 'disabled' : ''}>Cumpără · <span class="cost">${ic('cr')} ${fmtN(c.cost)}</span></button>
        </div>
      </div>`;
    }).join('')}</div>`;
  }
  function drawChestCanvas(cv, c, t, open = 0) {
    const g = cv.getContext('2d'), w = cv.width, h = cv.height;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.45); gr.addColorStop(0, c.col + (open ? 'aa' : '44')); gr.addColorStop(1, c.col + '00');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.translate(w / 2, h / 2 + 4); g.scale(w / 56, w / 56);
    G.drawChestIcon(g, c, 30, t);
  }

  // ---------------- item modal ----------------
  function itemModal(id, confirmSell = false) {
    const s = NC.save, it = NC.findItem(id); if (!it) return;
    const sl = NC.SLOTS.find(x => x.id === it.slot), R = NC.RARITY[it.r], eqId = s.gear.eq[it.slot], isEq = eqId === it.id;
    const other = !isEq && eqId ? NC.findItem(eqId) : null;
    const mv = NC.gearMain(it), ov = other ? NC.gearMain(other) : 0, d = mv - ov;
    const maxL = NC.gearMaxLvl(it.r), upc = NC.gearUpCost(it), sell = NC.gearSellValue(it);
    const exLines = NC.gearExtras(it).map(e => `<span>${NC.EXTRA_STATS.find(x => x.id === e.id).fmt(e.v)}</span><span></span>`).join('');
    const unit = sl.main === 'cr' ? '%' : '';
    openModal(`
      <div style="display:grid;place-items:center"><div class="itm r${it.r}" style="width:120px;cursor:default"><span class="gi" style="font-size:44px;width:56px;height:56px">${ic(it.slot)}</span></div></div>
      <h3 style="color:${R.col}">${esc(it.name)}</h3>
      <div class="rtag r${it.r}">${R.name} · ${sl.name} · nivel ${it.lvl}/${maxL}</div>
      <div class="cmp">
        <span>${sl.label}</span><b>+${sl.main === 'cr' ? mv.toFixed(0) : fmtN(mv)}${unit} ${other ? `<span class="${d >= 0 ? 'up' : 'dn'}">(${d >= 0 ? '+' : ''}${sl.main === 'cr' ? d.toFixed(0) : fmtN(d)} față de echipat)</span>` : ''}</b>
        ${exLines}
        ${it.lvl < maxL ? `<span>Upgrade</span><b class="up">+12% ${sl.label.toLowerCase()}, +8% bonusuri</b>` : ''}
      </div>
      <div class="row2">
        ${isEq ? `<button class="btn" type="button" data-a="itemUneq" data-id="${it.id}">Scoate</button>` : `<button class="btn pri" type="button" data-a="itemEq" data-id="${it.id}">Echipează</button>`}
        ${it.lvl < maxL ? `<button class="btn gold" type="button" data-a="itemUp" data-id="${it.id}" ${s.credits < upc ? 'disabled' : ''}>${ic('up')} <span class="cost">${ic('cr')} ${fmtN(upc)}</span></button>` : `<button class="btn" type="button" disabled>NIVEL MAXIM</button>`}
      </div>
      <div class="row2">
        <button class="btn ${confirmSell ? 'danger' : ''}" type="button" data-a="itemSell" data-id="${it.id}" data-c="${confirmSell ? 1 : 0}" ${isEq ? 'disabled' : ''}>${confirmSell ? 'Sigur? Vinde' : 'Vinde'} · <span class="cost">${ic('cr')} ${fmtN(sell)}</span></button>
        <button class="btn" type="button" data-a="closeModal">Închide</button>
      </div>`);
  }

  // ---------------- chests ----------------
  function openChest(id, buy) {
    const s = NC.save, c = NC.CHESTS.find(x => x.id === id);
    if (buy) { if (s.credits < c.cost) { NC.audio.sfx('error'); return; } s.credits -= c.cost; }
    else { if (!s.chests[id]) return; s.chests[id]--; }
    const items = [];
    for (let i = 0; i < c.items; i++) { const r = NC.weighted(c.w.map((w, k) => [k, w])); const it = NC.makeItem(r); s.gear.items.push(it); items.push(it); if (!s.gear.eq[it.slot]) s.gear.eq[it.slot] = it.id; }
    const bonus = NC.irnd(c.bonusCr[0], c.bonusCr[1]); s.credits += bonus;
    NC.persist();
    const best = Math.max(...items.map(i => i.r));
    openModal(`
      <h3 style="color:${c.col}">${esc(c.name)}</h3>
      <div class="chestStage shake" id="cStage"><canvas id="cCv" width="360" height="300"></canvas></div>
      <div class="reveal" id="cReveal" hidden>${items.map(it => `<div class="itm r${it.r}"><span class="lv">${NC.RARITY[it.r].name}</span><span class="gi">${ic(it.slot)}</span><span class="in">${esc(it.name)}</span><span class="sv">${mainLabel(it)}</span></div>`).join('')}</div>
      <div class="wallet" id="cBonus" hidden style="justify-content:center">+ ${crTxt(bonus)}</div>
      <button class="btn pri" type="button" data-a="closeModal" id="cDone" hidden>Gata</button>`, { locked: true });
    NC.audio.sfx('chest');
    const cv = $('cCv'), t0 = performance.now();
    const anim = (now) => {
      const t = (now - t0) / 1000;
      if (!$('cCv')) return;
      drawChestCanvas(cv, c, t * 2, t > 1 ? 1 : 0);
      if (t > 1 && $('cReveal').hidden) {
        $('cStage').classList.remove('shake'); $('cReveal').hidden = false; $('cBonus').hidden = false; $('cDone').hidden = false; modalCtx.locked = false;
        NC.audio.sfx(best >= 3 ? 'legend' : 'level'); focusFirst();
        if (best >= 3) U.toast(`${ic('star')} Obiect <b style="color:#ffb43d">LEGENDAR</b>!`);
      }
      modalAnim = requestAnimationFrame(anim);
    };
    modalAnim = requestAnimationFrame(anim);
  }

  // =====================================================================
  // SETTINGS
  // =====================================================================
  function seg(k, opts) { const v = NC.save.settings[k]; return `<div class="seg" role="radiogroup">${opts.map(([val, l]) => `<button type="button" role="radio" aria-checked="${String(v) === String(val)}" data-a="set" data-k="${k}" data-v="${val}">${l}</button>`).join('')}</div>`; }
  function tog(k) { return `<button class="tog" type="button" aria-pressed="${!!NC.save.settings[k]}" data-a="tog" data-k="${k}" aria-label="${k}"></button>`; }
  function renderSettings() {
    const s = NC.save.settings, gp = NC.Input.pad();
    const aimDef = ['touch', 'gamepad'].includes(s.ctrl) ? 'automată' : 'înainte';
    $('scrSettings').innerHTML = `
    <div class="wrap" style="max-width:760px">
      <div class="head"><button class="back" type="button" data-a="back">${ic('back')} Înapoi</button><h2>Setări</h2></div>
      <div class="panel">
        <div class="secttl">Control</div>
        <div class="set"><div><div class="t">Dispozitiv</div><div class="d">PC: mouse și tastatură. Telefon: joystick pe ecran. Controller: Xbox, PlayStation sau orice gamepad prin USB/Bluetooth.</div></div><div class="seg" role="radiogroup">${ctrlSeg()}</div></div>
        <div class="set"><div><div class="t">Țintire</div><div class="d">Automată: laserele țintesc cel mai apropiat inamic. Înainte: trag în direcția de mers. Implicit acum: ${aimDef}.</div></div>${seg('aim', [['null', 'Implicit'], ['auto', 'Automată'], ['forward', 'Înainte']])}</div>
        <div class="set"><div><div class="t">Mâna dominantă</div><div class="d">Stânga inversează în oglindă joystick-ul și butoanele pe ecranul de touch.</div></div>${seg('hand', [['right', 'Dreapta'], ['left', 'Stânga']])}</div>
        <div class="set"><div><div class="t">Mărime joystick</div><div class="d">Pentru ecrane mari sau degete mari.</div></div>${seg('joySize', [[0.85, 'Mic'], [1, 'Mediu'], [1.2, 'Mare']])}</div>
        <div class="set"><div><div class="t">Opacitate butoane</div><div class="d">Cât de vizibile sunt controalele de touch.</div></div><input type="range" id="rBa" min="0.3" max="1" step="0.05" value="${s.btnAlpha}" data-r="btnAlpha" aria-label="Opacitate butoane"></div>
        <div class="set"><div><div class="t">Controller</div><div class="d">${gp ? 'Conectat: ' + esc(gp.id.slice(0, 48)) : 'Niciun controller detectat. Conectează-l și apasă orice buton.'}</div></div><div class="d">Stick stânga: mișcare · Stick dreapta: țintire · A/RB: dash · X/Y/LB: super · Start: pauză · în meniuri: D-pad și A</div></div>
        <div class="set"><div><div class="t">Tastatură</div></div><div class="d">WASD/săgeți sau mouse: mișcare · Space/Shift/click dreapta: dash · E/Q: super · P/Esc: pauză</div></div>

        <div class="secttl" style="margin-top:18px">Audio</div>
        <div class="set"><div><div class="t">Muzică</div></div><input type="range" id="rMus" min="0" max="1" step="0.05" value="${s.music}" data-r="music" aria-label="Volum muzică"></div>
        <div class="set"><div><div class="t">Efecte sonore</div></div><input type="range" id="rSfx" min="0" max="1" step="0.05" value="${s.sfx}" data-r="sfx" aria-label="Volum efecte"></div>
        <div class="set"><div><div class="t">Vibrații</div><div class="d">Pe telefon și controller.</div></div>${tog('vibe')}</div>

        <div class="secttl" style="margin-top:18px">Grafică și joc</div>
        <div class="set"><div><div class="t">Calitate grafică</div><div class="d">Scăzută ajută pe telefoane mai vechi.</div></div>${seg('quality', [['high', 'Înaltă'], ['med', 'Medie'], ['low', 'Scăzută']])}</div>
        <div class="set"><div><div class="t">Tremurat ecran</div></div>${tog('shake')}</div>
        <div class="set"><div><div class="t">Numere de daune</div></div>${tog('dmgNum')}</div>
        <div class="set"><div><div class="t">Arată FPS</div></div>${tog('fps')}</div>

        <div class="secttl" style="margin-top:18px">Date</div>
        <div class="set"><div><div class="t">Salvare și cont</div><div class="d">Cod de salvare, mutare pe alt dispozitiv.</div></div><button class="btn sm" type="button" data-a="account">${ic('user')} Deschide</button></div>
        <div class="set"><div><div class="t">Resetează progresul</div><div class="d">Șterge cristalele, navele, echipamentul și recordurile. Nu se poate anula.</div></div><button class="btn sm danger" type="button" data-a="reset">Resetează</button></div>
      </div>
      <div class="ver" style="text-align:center">Neon Comet v${NC.VERSION}</div>
    </div>`;
  }
  function applySettings() {
    const s = NC.save.settings, t = $('touchUI');
    t.classList.toggle('left', s.hand === 'left');
    t.style.setProperty('--js', s.joySize); t.style.setProperty('--ba', s.btnAlpha);
    $('fps').hidden = !s.fps;
    NC.audio.applyVol();
    NC.Input.resetJoy && NC.Input.resetJoy();
    const keys = s.ctrl === 'gamepad' ? ['A', 'X'] : ['SPACE', 'E'];
    $('abDashK').textContent = 'DASH · ' + keys[0]; $('abSuperK').textContent = 'SUPER · ' + keys[1];
  }
  U.applySettings = applySettings;

  // =====================================================================
  // RECORDS / ACHIEVEMENTS
  // =====================================================================
  let rtab = 'ach';
  function renderRecords() {
    const s = NC.save, st = s.stats;
    let body = '';
    if (rtab === 'ach') {
      body = NC.ACH.map(a => {
        const done = !!s.ach[a.id], can = !done && a.goal(s);
        return `<div class="ach ${done ? 'done' : ''}"><div class="ai">${ic(done ? 'trophy' : can ? 'gift' : 'lock')}</div>
          <div><div class="t">${esc(a.name)}</div><div class="d">${esc(a.desc)} · ${crTxt(a.cr)}</div></div>
          ${done ? `<span class="pill on">${ic('check')} PRIMIT</span>` : can ? `<button class="btn sm gold" type="button" data-a="claimAch" data-id="${a.id}">Ia</button>` : `<span class="pill">BLOCAT</span>`}</div>`;
      }).join('');
    } else if (rtab === 'top') {
      body = s.top.length ? `<div class="panel" style="overflow-x:auto"><table class="tbl"><thead><tr><th>#</th><th>SCOR</th><th>SECTOR</th><th>NAVĂ</th><th>INAMICI</th><th>DATA</th></tr></thead><tbody>
        ${s.top.map((r, i) => `<tr class="${i === 0 ? 'me' : ''}"><td>${i + 1}</td><td><b>${fmtN(r.score)}</b></td><td>${r.tier}</td><td>${esc((NC.SHIPS.find(x => x.id === r.ship) || NC.SHIPS[0]).name)}</td><td>${fmtN(r.kills)}</td><td>${new Date(r.date).toLocaleDateString('ro-RO')}</td></tr>`).join('')}
        </tbody></table></div><div class="note">Clasamentul online vine odată cu contul Google. Până atunci vezi aici cele mai bune 10 runde de pe acest dispozitiv.</div>` : `<div class="note">Nicio rundă încă. Joacă una și scorul apare aici.</div>`;
    } else {
      const h = Math.floor(st.playtime / 3600), m = Math.floor(st.playtime % 3600 / 60);
      body = `<div class="panel"><div class="kv">
        <span>Runde jucate</span><b>${fmtN(st.runs)}</b><span>Inamici distruși</span><b>${fmtN(st.kills)}</b><span>Boși învinși</span><b>${fmtN(st.bosses)}</b>
        <span>Record</span><b>${fmtN(s.best)}</b><span>Combo maxim</span><b>×${st.maxCombo}</b><span>Cristale câștigate</span><b>${fmtN(st.crEarned)}</b>
        <span>Cufere găsite</span><b>${fmtN(st.chests)}</b><span>Reînvieri folosite</span><b>${fmtN(st.revives)}</b><span>Timp jucat</span><b>${h}h ${m}m</b>
        <span>Nivel navă</span><b>${NC.levelFromXp(s.xp).lvl}</b><span>Nave deținute</span><b>${s.ships.owned.length} / ${NC.SHIPS.length}</b><span>Obiecte</span><b>${s.gear.items.length}</b>
      </div></div>`;
    }
    $('scrRecords').innerHTML = `
    <div class="wrap" style="max-width:820px">
      <div class="head"><button class="back" type="button" data-a="back">${ic('back')} Înapoi</button><h2>Realizări</h2><span class="wallet">${crTxt(s.credits)}</span></div>
      <div class="tabs" role="tablist">${[['ach', 'Realizări', 'trophy'], ['top', 'Clasament', 'star'], ['stats', 'Statistici', 'crit']].map(([id, l, i]) => `<button type="button" role="tab" aria-selected="${rtab === id}" data-a="rtab" data-v="${id}">${ic(i)} ${l}${id === 'ach' ? badge(claimable().length) : ''}</button>`).join('')}</div>
      <div style="display:flex;flex-direction:column;gap:8px">${body}</div>
    </div>`;
  }

  // =====================================================================
  // ACCOUNT
  // =====================================================================
  function renderAccount() {
    const s = NC.save, ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    $('scrAccount').innerHTML = `
    <div class="wrap" style="max-width:640px">
      <div class="head"><button class="back" type="button" data-a="back">${ic('back')} Înapoi</button><h2>Cont și salvare</h2></div>
      <div class="panel acct">
        <div class="secttl">Conectare</div>
        <button class="oauth g" type="button" disabled><b style="font-size:18px">G</b> Conectare cu Google · în curând</button>
        <button class="oauth a" type="button" disabled>Conectare cu Apple · în curând</button>
        <div class="note">Conectarea va sincroniza nivelul, cristalele, navele și echipamentul între dispozitive și va activa clasamentul online. Până atunci, progresul se salvează automat pe acest dispozitiv, cu o copie de rezervă, și rămâne intact la fiecare actualizare a jocului.</div>
      </div>
      <div class="panel acct">
        <div class="secttl">Cod de salvare</div>
        <div class="d" style="font:12px/1.6 var(--mono);color:var(--dim)">Mută progresul pe alt telefon sau calculator: generează codul aici și lipește-l acolo, la „Încarcă”.</div>
        <button class="btn" type="button" data-a="export">${ic('download')} Generează codul</button>
        <textarea id="tExport" readonly hidden aria-label="Cod de salvare"></textarea>
        <button class="btn sm" type="button" data-a="copy" id="bCopy" hidden>${ic('copy')} Copiază</button>
        <textarea id="tImport" placeholder="Lipește aici un cod NC3-..." aria-label="Încarcă cod"></textarea>
        <button class="btn gold" type="button" data-a="import">Încarcă progresul</button>
        <div class="ver">Ultima salvare: ${s.saved ? new Date(s.saved).toLocaleString('ro-RO') : 'acum'}</div>
      </div>
      ${ios ? `<div class="note">Pe iPhone/iPad: apasă Share, apoi „Add to Home Screen”, ca să ai jocul ca aplicație.</div>` : ''}
    </div>`;
  }
  function renderExit() {
    NC.persist();
    $('scrExit').innerHTML = `<div class="center"><div class="dialog">
      <h1>Progres salvat</h1>
      <div class="sub">Tot ce ai câștigat e salvat pe acest dispozitiv. Poți închide fila sau aplicația oricând.</div>
      <button class="btn pri" type="button" data-a="menu">${ic('home')} Înapoi la meniu</button>
    </div></div>`;
    try { window.close(); } catch (e) {}
  }

  // =====================================================================
  // IN-GAME SCREENS
  // =====================================================================
  U.onRunStart = () => {
    hideScreens(); closeModalSilent();
    $('hud').hidden = false; $('tip').style.opacity = '1'; tipShown = true;
    hudCache = {};
  };
  function closeModalSilent() { $('modal').hidden = true; $('modal').innerHTML = ''; if (modalAnim) cancelAnimationFrame(modalAnim); modalAnim = null; modalCtx = null; }
  U.showPause = () => {
    const R = G.run;
    const cards = Object.entries(R.cards).map(([id, n]) => { const c = NC.CARDS.find(x => x.id === id); return `<span class="pill on">${ic(c.icon)} ${esc(c.name)} ×${n}</span>`; }).join(' ');
    $('scrPause').innerHTML = `<div class="center"><div class="dialog">
      <h1>Pauză</h1>
      <div class="kv"><span>Scor</span><b>${fmtN(R.score)}</b><span>Sector</span><b>${R.tier}</b><span>Nivel rundă</span><b>${R.runLvl}</b><span>Cristale în rundă</span><b>${fmtN(R.crRun)}</b></div>
      ${cards ? `<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">${cards}</div>` : ''}
      <button class="btn pri" type="button" data-a="resume">${ic('play')} Continuă</button>
      <div class="row2"><button class="btn" type="button" data-a="settings">${ic('gear')} Setări</button><button class="btn" type="button" data-a="restart">${ic('restart')} Restart</button></div>
      <button class="btn danger" type="button" data-a="quitRun">${ic('exit')} Termină runda</button>
    </div></div>`;
    go('scrPause', false);
  };
  U.closePause = () => { hideScreens(); G.resume(); };
  U.showCards = (cards) => {
    const R = G.run;
    $('scrCards').innerHTML = `<div class="center"><div style="display:flex;flex-direction:column;gap:16px;align-items:center;width:100%">
      <div class="dialog" style="padding:14px 20px;width:auto"><h1 style="font-size:24px">Nivel ${R.runLvl}</h1><div class="sub">alege un upgrade pentru runda asta</div></div>
      <div class="cards3">${cards.map((c, i) => `<button class="ucard" type="button" data-a="card" data-id="${c.id}">
        <span class="ui">${ic(c.icon)}</span><span style="display:flex;flex-direction:column;gap:6px;min-width:0"><span class="un">${esc(c.name)}</span><span class="ud">${esc(c.desc)}</span><span class="ul">${(R.cards[c.id] || 0) ? 'NIVEL ' + (R.cards[c.id] + 1) + (c.max < 99 ? ' / ' + c.max : '') : 'NOU'}</span>${NC.save.settings.ctrl === 'pc' ? `<kbd>tasta ${i + 1}</kbd>` : ''}</span>
      </button>`).join('')}</div></div></div>`;
    go('scrCards', false);
  };
  let reviveT = 0;
  U.showRevive = () => {
    reviveT = 10;
    renderRevive();
    go('scrRevive', false);
  };
  function renderRevive() {
    const R = G.run, cost = G.reviveCost(), have = NC.save.credits, ok = have >= cost;
    $('scrRevive').innerHTML = `<div class="center"><div class="dialog">
      <h1 style="color:var(--pink)">Nava distrusă</h1>
      <div class="timer" id="rvT" style="--t:1"><span id="rvN">10</span></div>
      <div class="sub">Reînvii cu 60% viață și scut plin. ${3 - R.revives} din 3 reînvieri rămase în runda asta.</div>
      <button class="btn gold" type="button" data-a="revive" ${ok ? '' : 'disabled'}>${ic('hp')} Reînvie · <span class="cost">${ic('cr')} ${fmtN(cost)}</span></button>
      ${ok ? `<div class="sub">Ai ${crTxt(have)}</div>` : `<div class="sub" style="color:var(--pink)">Îți lipsesc ${fmtN(cost - have)} cristale</div>`}
      <button class="btn" type="button" data-a="giveup">Renunță</button>
    </div></div>`;
  }
  U.showGameOver = (r) => {
    const lvUp = r.lvlAfter > r.lvlBefore;
    $('scrOver').innerHTML = `<div class="center"><div class="dialog">
      <div class="sub" style="letter-spacing:.3em">RUNDĂ TERMINATĂ</div>
      <div class="bignum">${fmtN(r.score)}</div>
      ${r.isBest ? '<div class="newbest">RECORD NOU</div>' : `<div class="sub">record: ${fmtN(r.best)}</div>`}
      <div class="kv">
        <span>Sector atins</span><b>${r.tier}</b><span>Inamici distruși</span><b>${fmtN(r.kills)}</b><span>Boși învinși</span><b>${r.bosses}</b>
        <span>Combo maxim</span><b>×${r.combo}</b><span>Cristale câștigate</span><b class="s-cr">+${fmtN(r.cr)}</b>
        <span>XP navă</span><b class="s-pow">+${fmtN(r.xp)}</b>${r.chests.length ? `<span>Cufere găsite</span><b>${r.chests.length}</b>` : ''}
        <span>Durată</span><b>${Math.floor(r.time / 60)}m ${Math.floor(r.time % 60)}s</b>
      </div>
      ${lvUp ? `<div class="note" style="color:var(--gold)">${ic('up')} Nava a urcat la nivelul ${r.lvlAfter}: +${Math.round((r.lvlAfter - r.lvlBefore) * NC.LEVEL_BONUS * 100)}% atac, viață și scut</div>` : ''}
      ${r.chests.length ? `<div class="note">${ic('chest')} Ai cufere noi. Le deschizi din Hangar, la Cufere.</div>` : ''}
      <button class="btn pri" type="button" data-a="play">${ic('restart')} Din nou</button>
      <div class="row2"><button class="btn" type="button" data-a="${r.chests.length ? 'chests' : 'hangar'}">${ic(r.chests.length ? 'chest' : 'ship')} ${r.chests.length ? 'Cufere' : 'Hangar'}</button><button class="btn" type="button" data-a="menu">${ic('home')} Meniu</button></div>
    </div></div>`;
    $('hud').hidden = true; $('touchUI').hidden = true;
    go('scrOver', false);
    if (lvUp) setTimeout(() => NC.audio.sfx('level'), 400);
  };
  U.showBossBar = (def) => { $('bossBar').hidden = false; $('bossName').textContent = def.name; $('bossName').style.color = def.col; };
  U.hideBossBar = () => { $('bossBar').hidden = true; };
  U.onPad = (on, id) => { U.toast(on ? `${ic('pad')} Controller conectat · apasă orice buton` : `${ic('pad')} Controller deconectat`); if (cur === 'scrSettings') renderSettings(); };
  U.onCtrlChanged = () => { applySettings(); if (cur === 'scrMenu' || cur === 'scrSettings') U.refresh(); U.toast(`${ic('pad')} Mod controller activat`); };
  let tipShown = true;
  U.hideTip = () => { if (tipShown) { tipShown = false; $('tip').style.opacity = '0'; } };

  // =====================================================================
  // DAILY REWARD
  // =====================================================================
  function checkDaily() {
    const s = NC.save, t = today();
    if (s.daily.last === t) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const streak = s.daily.last === today(y) ? s.daily.streak + 1 : 1, idx = (streak - 1) % 7;
    openModal(`
      <h3>Recompensă zilnică</h3>
      <div class="sub" style="color:var(--dim);font:12px var(--mono)">Ziua ${streak} la rând. Revino mâine pentru o recompensă mai mare.</div>
      <div class="daily">${NC.DAILY.map((v, i) => `<div class="${i < idx ? 'done' : i === idx ? 'today' : ''}"><span>Z${i + 1}</span>${ic(i === 6 ? 'chest' : 'cr')}<span>${v}</span></div>`).join('')}</div>
      ${idx === 6 ? `<div class="note">${ic('chest')} Ziua 7: primești și un cufăr rar!</div>` : ''}
      <button class="btn gold" type="button" data-a="claimDaily" data-v="${streak}">${ic('gift')} Ia ${NC.DAILY[idx]} cristale</button>`, { locked: true });
  }

  // =====================================================================
  // ACTIONS
  // =====================================================================
  const owned = (arr, id) => arr.includes(id);
  function pay(cost) { if (NC.save.credits < cost) { NC.audio.sfx('error'); U.toast('Nu ai destule cristale'); return false; } NC.save.credits -= cost; NC.audio.sfx('buy'); return true; }
  function act(a, d, el) {
    const s = NC.save;
    switch (a) {
      case 'play': NC.audio.unlock(); G.start(); break;
      case 'menu': G.toMenu(); go('scrMenu', false); break;
      case 'hangar': go('scrHangar'); break;
      case 'chests': htab = 'chests'; go('scrHangar'); break;
      case 'records': go('scrRecords'); break;
      case 'settings': go('scrSettings'); break;
      case 'account': go('scrAccount'); break;
      case 'exit': go('scrExit'); break;
      case 'back': U.back(); break;
      case 'install': if (deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.finally(() => { deferredInstall = null; renderMenu(); }); } break;
      case 'ctrl': s.settings.ctrl = d.v; NC.persist(); applySettings(); U.refresh(); break;
      case 'tab': htab = d.v; renderHangar(); focusSel('[data-a="tab"][aria-selected="true"]'); break;
      case 'rtab': rtab = d.v; renderRecords(); focusSel('[data-a="rtab"][aria-selected="true"]'); break;
      case 'buyBase': {
        const u = NC.BASE_UP[d.k]; let n = +d.n, bought = 0;
        while (n-- > 0 && s.credits >= u.cost(s.base[d.k])) { s.credits -= u.cost(s.base[d.k]); s.base[d.k]++; bought++; }
        if (bought) { NC.audio.sfx('buy'); NC.persist(); } else NC.audio.sfx('error');
        renderHangar(); focusSel(`[data-a="buyBase"][data-k="${d.k}"][data-n="${d.n}"]`); break;
      }
      case 'buyShip': { const sh = NC.SHIPS.find(x => x.id === d.id); if (!owned(s.ships.owned, sh.id) && pay(sh.cost)) { s.ships.owned.push(sh.id); s.ships.eq = sh.id; NC.persist(); U.toast(`${ic('ship')} ${esc(sh.name)} e a ta!`); } renderHangar(); break; }
      case 'eqShip': s.ships.eq = d.id; NC.persist(); NC.audio.sfx('card'); renderHangar(); break;
      case 'buyTur': { const t = NC.TURRETS.find(x => x.id === d.id); if (pay(t.cost)) { s.turrets.owned.push(t.id); s.turrets.lv[t.id] = 0; s.turrets.eq = t.id; NC.persist(); } renderHangar(); break; }
      case 'eqTur': s.turrets.eq = d.id; NC.persist(); renderHangar(); break;
      case 'uneqTur': s.turrets.eq = null; NC.persist(); renderHangar(); break;
      case 'upTur': { const t = NC.TURRETS.find(x => x.id === d.id), lv = s.turrets.lv[t.id] || 0; if (lv < NC.TURRET_MAX && pay(NC.turretUpCost(t, lv))) { s.turrets.lv[t.id] = lv + 1; NC.persist(); } renderHangar(); focusSel(`[data-a="upTur"][data-id="${d.id}"]`); break; }
      case 'buyComp': { const c = NC.COMPANIONS.find(x => x.id === d.id); if (pay(c.cost)) { s.comps.owned.push(c.id); s.comps.lv[c.id] = 0; s.comps.eq = c.id; NC.persist(); } renderHangar(); break; }
      case 'eqComp': s.comps.eq = d.id; NC.persist(); renderHangar(); break;
      case 'uneqComp': s.comps.eq = null; NC.persist(); renderHangar(); break;
      case 'upComp': { const c = NC.COMPANIONS.find(x => x.id === d.id), lv = s.comps.lv[c.id] || 0; if (lv < NC.COMP_MAX && pay(NC.compUpCost(c, lv))) { s.comps.lv[c.id] = lv + 1; NC.persist(); } renderHangar(); focusSel(`[data-a="upComp"][data-id="${d.id}"]`); break; }
      case 'item': itemModal(d.id); break;
      case 'slotEmpty': U.toast('Slot gol. Deschide cufere ca să găsești echipament.'); break;
      case 'itemEq': { const it = NC.findItem(d.id); s.gear.eq[it.slot] = it.id; NC.persist(); NC.audio.sfx('card'); itemModal(d.id); renderHangar(); break; }
      case 'itemUneq': { const it = NC.findItem(d.id); s.gear.eq[it.slot] = null; NC.persist(); itemModal(d.id); renderHangar(); break; }
      case 'itemUp': { const it = NC.findItem(d.id); if (it.lvl < NC.gearMaxLvl(it.r) && pay(NC.gearUpCost(it))) { it.lvl++; NC.persist(); } itemModal(d.id); renderHangar(); focusSel('[data-a="itemUp"]'); break; }
      case 'itemSell': {
        const it = NC.findItem(d.id); if (!it) break;
        if (it.r >= 2 && d.c !== '1') { itemModal(d.id, true); focusSel('[data-a="itemSell"]'); break; }
        s.gear.items = s.gear.items.filter(x => x.id !== it.id); s.credits += NC.gearSellValue(it); NC.persist(); NC.audio.sfx('crystal');
        closeModal(); break;
      }
      case 'sellCommon': {
        const eqIds = new Set(Object.values(s.gear.eq)); let v = 0;
        s.gear.items = s.gear.items.filter(i => { if (i.r === 0 && !eqIds.has(i.id)) { v += NC.gearSellValue(i); return false; } return true; });
        s.credits += v; NC.persist(); NC.audio.sfx('crystal'); U.toast(`+${fmtN(v)} cristale`); renderHangar(); break;
      }
      case 'buyChest': openChest(d.id, true); break;
      case 'openChest': openChest(d.id, false); break;
      case 'closeModal': closeModal(); break;
      case 'set': { let v = d.v; if (v === 'null') v = null; else if (!isNaN(+v) && d.k === 'joySize') v = +v; s.settings[d.k] = v; NC.persist(); applySettings(); if (d.k === 'quality') G.resize(); renderSettings(); focusSel(`[data-a="set"][data-k="${d.k}"][aria-checked="true"]`); break; }
      case 'tog': s.settings[d.k] = !s.settings[d.k]; NC.persist(); applySettings(); renderSettings(); focusSel(`[data-a="tog"][data-k="${d.k}"]`); break;
      case 'reset': openModal(`<h3 style="color:var(--pink)">Resetezi tot?</h3><div class="note">Pierzi cristalele, navele, turelele, companionii, echipamentul, nivelul și recordurile. Setările rămân. Nu se poate anula.</div>
        <div class="row2"><button class="btn" type="button" data-a="closeModal">Anulează</button><button class="btn danger" type="button" data-a="resetYes">Da, resetează</button></div>`); break;
      case 'resetYes': NC.resetSave(); closeModalSilent(); U.toast('Progres resetat'); go('scrMenu', false); break;
      case 'export': { const t = $('tExport'); t.value = NC.exportSave(); t.hidden = false; $('bCopy').hidden = false; t.focus(); t.select(); break; }
      case 'copy': { const t = $('tExport'); const done = () => U.toast(`${ic('check')} Cod copiat`); try { navigator.clipboard.writeText(t.value).then(done, () => { t.select(); U.toast('Selectat. Apasă Ctrl+C / Copiere.'); }); } catch (e) { t.select(); } break; }
      case 'import': { const err = NC.importSave($('tImport').value); if (err) { NC.audio.sfx('error'); U.toast(err, 3600); } else { NC.audio.sfx('level'); applySettings(); U.toast(`${ic('check')} Progres încărcat`); go('scrMenu', false); } break; }
      case 'claimAch': { const ach = NC.ACH.find(x => x.id === d.id); if (ach && !s.ach[ach.id] && ach.goal(s)) { s.ach[ach.id] = true; s.credits += ach.cr; NC.persist(); NC.audio.sfx('legend'); U.toast(`${ic('trophy')} ${esc(ach.name)} · +${fmtN(ach.cr)} cristale`); } renderRecords(); break; }
      case 'claimDaily': { const streak = +d.v, idx = (streak - 1) % 7; s.daily = { last: today(), streak }; s.credits += NC.DAILY[idx]; if (idx === 6) s.chests.rare++; NC.persist(); NC.audio.sfx('legend'); closeModal(); break; }
      case 'resume': U.closePause(); break;
      case 'restart': hideScreens(); G.quit(); hideScreens(); G.start(); break;
      case 'quitRun': hideScreens(); G.quit(); break;
      case 'card': hideScreens(); G.pickCard(d.id); break;
      case 'revive': if (G.revive()) hideScreens(); else renderRevive(); break;
      case 'giveup': hideScreens(); G.giveUp(); break;
    }
  }

  // =====================================================================
  // EVENTS
  // =====================================================================
  const stage = $('stage');
  stage.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    NC.audio.unlock(); if (b.dataset.a !== 'card') NC.audio.sfx('click');
    act(b.dataset.a, b.dataset, b);
  });
  stage.addEventListener('input', e => {
    const r = e.target.dataset && e.target.dataset.r; if (!r) return;
    NC.save.settings[r] = +e.target.value; applySettings();
  });
  stage.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.r) NC.persist(); });
  addEventListener('pointerdown', () => { NC.audio.unlock(); clearPadFocus(); }, { capture: true });
  addEventListener('keydown', e => {
    NC.audio.unlock();
    if (cur === 'scrCards' && /^[1-3]$/.test(e.key)) { const b = $('scrCards').querySelectorAll('.ucard')[+e.key - 1]; b && b.click(); }
  });
  $('hPause').innerHTML = ic('pause'); $('btnPauseT').innerHTML = ic('pause');
  $('hPause').addEventListener('click', () => G.pause());
  addEventListener('blur', () => { if (G.mode === 'play' && G.run && G.run.p.alive) G.pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { NC.persist(); if (G.mode === 'play' && G.run && G.run.p.alive) G.pause(); } });
  addEventListener('pagehide', () => NC.persist());

  // ---------------- gamepad / keyboard menu navigation ----------------
  function rootEl() { if (!$('modal').hidden) return $('modal'); return cur ? $(cur) : null; }
  function focusables() {
    const r = rootEl(); if (!r) return [];
    return [...r.querySelectorAll('button:not([disabled]), input, textarea:not([readonly])')].filter(el => el.offsetParent !== null && !el.closest('[hidden]'));
  }
  let padFocused = null;
  function setFocus(el) {
    clearPadFocus();
    if (!el) return;
    el.focus({ preventScroll: true }); el.classList.add('padfocus'); padFocused = el;
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function clearPadFocus() { if (padFocused) padFocused.classList.remove('padfocus'); padFocused = null; }
  function focusFirst() {
    if (NC.save.settings.ctrl !== 'gamepad') return;
    requestAnimationFrame(() => { const els = focusables(); const pri = els.find(e => e.classList.contains('pri') || e.classList.contains('gold')) || els[0]; setFocus(pri); });
  }
  function focusSel(sel) { if (!padFocused) return; requestAnimationFrame(() => { const r = rootEl(); const el = r && r.querySelector(sel); if (el && !el.disabled) setFocus(el); else focusFirst(); }); }
  NC.Input.onNav = (dir, src) => {
    const els = focusables(); if (!els.length) return;
    let curEl = document.activeElement;
    if (!els.includes(curEl)) { if (dir === 'back') { U.back(); return; } setFocus(els[0]); return; }
    if (dir === 'ok') { if (src === 'kb' && curEl.tagName !== 'BUTTON') return; if (src === 'kb') return; curEl.click(); return; }
    if (dir === 'back') { U.back(); return; }
    if (dir === 'tabPrev' || dir === 'tabNext') {
      const tabs = [...rootEl().querySelectorAll('[role=tab]')]; if (!tabs.length) return;
      let i = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true'); i = (i + (dir === 'tabNext' ? 1 : -1) + tabs.length) % tabs.length; tabs[i].click(); return;
    }
    if (curEl.type === 'range' && (dir === 'left' || dir === 'right')) { dir === 'left' ? curEl.stepDown() : curEl.stepUp(); curEl.dispatchEvent(new Event('input', { bubbles: true })); curEl.dispatchEvent(new Event('change', { bubbles: true })); return; }
    // edge-based spatial navigation: prefer elements that overlap on the cross axis, then the nearest edge
    const r = curEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const gap = (a1, a2, b1, b2) => Math.max(0, Math.max(a1, b1) - Math.min(a2, b2));
    let best = null, bs = Infinity;
    for (const el of els) {
      if (el === curEl) continue;
      const q = el.getBoundingClientRect(), x = q.left + q.width / 2, y = q.top + q.height / 2;
      let main, side, center;
      if (dir === 'up') { if (q.bottom > r.top + 2 && y >= cy) continue; main = Math.max(0, r.top - q.bottom); side = gap(r.left, r.right, q.left, q.right); center = Math.abs(x - cx); }
      else if (dir === 'down') { if (q.top < r.bottom - 2 && y <= cy) continue; main = Math.max(0, q.top - r.bottom); side = gap(r.left, r.right, q.left, q.right); center = Math.abs(x - cx); }
      else if (dir === 'left') { if (q.right > r.left + 2 && x >= cx) continue; main = Math.max(0, r.left - q.right); side = gap(r.top, r.bottom, q.top, q.bottom); center = Math.abs(y - cy); }
      else { if (q.left < r.right - 2 && x <= cx) continue; main = Math.max(0, q.left - r.right); side = gap(r.top, r.bottom, q.top, q.bottom); center = Math.abs(y - cy); }
      const sc = main + side * 3 + center * 0.05;
      if (sc < bs) { bs = sc; best = el; }
    }
    if (best) { setFocus(best); NC.audio.sfx('click'); }
  };

  // =====================================================================
  // HUD (per frame)
  // =====================================================================
  let hudCache = {}, lastNow = 0;
  const setT = (id, v, html) => { if (hudCache[id] !== v) { hudCache[id] = v; if (html) $(id).innerHTML = v; else $(id).textContent = v; } };
  const setW = (id, f) => { const v = (Math.max(0, Math.min(1, f)) * 100).toFixed(1) + '%'; if (hudCache['w' + id] !== v) { hudCache['w' + id] = v; $(id).style.width = v; } };
  U.frame = (now) => {
    const R = G.run, s = NC.save.settings;
    const fdt = Math.min(0.1, (now - (lastNow || now)) / 1000); lastNow = now;
    if (s.fps) setT('fps', G.fps + ' FPS');
    const live = R && ['play', 'paused', 'cards', 'revive'].includes(G.mode);
    if (!live) { if (!$('touchUI').hidden) $('touchUI').hidden = true; return; }
    const showT = s.ctrl === 'touch' && G.mode === 'play';
    if ($('touchUI').hidden === showT) { $('touchUI').hidden = !showT; NC.Input.resetJoy && NC.Input.resetJoy(); }
    $('hAbil').hidden = s.ctrl === 'touch';
    const p = R.p;
    setW('hHp', p.hp / R.maxHp); setT('hHpT', `${fmtN(Math.max(0, p.hp))} / ${fmtN(R.maxHp)}`);
    setW('hShd', p.shd / Math.max(1, R.maxShd)); setT('hShdT', `SCUT ${fmtN(p.shd)}`);
    const atk = Math.round(R.st.atk * R.m.dmg);
    setT('hAtk', `${ic('atk')} ${fmtN(atk)}`, true);
    const tm = NC.tierMult(R.tier);
    setT('hSec', `SECTOR ${R.tier}${R.tier > 1 ? ' · +' + Math.round((tm.cr - 1) * 100) + '% ' + '◆' : ''}`);
    setT('hScore', fmtN(R.score));
    setT('hCombo', R.combo > 1 ? 'COMBO ×' + R.combo : '');
    setW('hRxp', R.runXp / R.runNeed); setT('hRlv', 'NIVEL RUNDĂ ' + R.runLvl);
    setT('hCr', crTxt(NC.save.credits), true);
    const E = R.st.dashCd * R.m.dashCd, dcd = 1 - p.dashCd / E, sc = p.superC / 100;
    setW('abDashI', dcd); setW('abSuperI', sc);
    $('abSuper').classList.toggle('ready', sc >= 1);
    if (showT) {
      const bd = $('btnDash'), bs = $('btnSuper');
      bd.style.setProperty('--cd', dcd.toFixed(3)); bd.classList.toggle('ready', dcd >= 1);
      bs.style.setProperty('--sc', sc.toFixed(3)); bs.classList.toggle('ready', sc >= 1);
    }
    if (R.boss) setW('bossHp', R.boss.hp / R.boss.max);
    if (G.mode === 'revive' && cur === 'scrRevive') {
      reviveT -= fdt;
      const el = $('rvT'); if (el) { el.style.setProperty('--t', Math.max(0, reviveT / 10).toFixed(3)); $('rvN').textContent = Math.max(0, Math.ceil(reviveT)); }
      if (reviveT <= 0) { hideScreens(); G.giveUp(); }
    }
  };

  // =====================================================================
  // BOOT
  // =====================================================================
  function boot() {
    const s = NC.load();
    if (!s.settings.ctrl) s.settings.ctrl = matchMedia('(pointer: coarse)').matches ? 'touch' : 'pc';
    NC.Input.bindTouch();
    G.init($('c'));
    applySettings();
    go('scrMenu', false);
    NC.music.set('menu');
    if (s.migrated) { U.toast(`${ic('gift')} Actualizare 2.0: ai primit înapoi ${fmtN(s.migrated)} cristale din upgrade-urile vechi`, 6000); delete s.migrated; }
    NC.persist();
    setTimeout(checkDaily, 600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.NC);
