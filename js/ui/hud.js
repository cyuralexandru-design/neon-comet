'use strict';
// Neon Comet 3.0 - DOM HUD (UI agent). Reads NC.hud every frame (SPEC §5):
// {score, combo, sector, biome, hp, maxHp, shd, maxShd, atk, crystals, runLvl, runXp, runNeed, dashCd01,
//  consumables:[{id,count,cd01}], boss:{nameKey,hp01}|null, fps}
// Touch controls: full-screen joystick zone bound to NC.Input (floating stick), DASH + up to 3 consumable buttons
// arranged around DASH (mirrored for left-handed). Desktop: ability strip with key hints.
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  const t = (k, v) => NC.t(k, v);
  const $ = id => document.getElementById(id);
  const H = UI.hud = {};
  const cache = {};
  const setT = (el, key, v) => { if (cache[key] !== v) { cache[key] = v; el.textContent = v; } };
  const setW = (el, key, f) => { const v = (Math.max(0, Math.min(1, f || 0)) * 100).toFixed(1) + '%'; if (cache[key] !== v) { cache[key] = v; el.style.width = v; } };
  const setS = (el, key, prop, v) => { if (cache[key] !== v) { cache[key] = v; el.style.setProperty(prop, v); } };
  let E = {};
  let consSig = '';
  let visible = false;

  let builtLoaded = false;
  H.init = () => { H.build(); requestAnimationFrame(loop); };
  H.build = () => {
    builtLoaded = !!(NC.assets && NC.assets.loaded);
    const hud = $('hud');
    hud.innerHTML = `
      <div class="hud-tl">
        <div class="ln">${UI.img('ui_heart', 'ico10 hide-miss')}<span id="hHpL"></span><span class="val" id="hHpT"></span></div>
        <div class="bar hp seg"><b id="hHpG"></b><i id="hHp"></i></div>
        <div class="bar shd seg"><b id="hShdG"></b><i id="hShd"></i></div>
        <div class="ln"><span class="c-warm" id="hAtk"></span><span class="val" id="hShdT"></span></div>
      </div>
      <div class="hud-lvl"><span id="hLvl"></span><div class="bar xp"><i id="hXp"></i></div></div>
      <div class="hud-tc"><div class="hud-score" id="hScore">0</div><div class="hud-combo" id="hCombo"></div><div class="hud-sec" id="hSec"></div></div>
      <div class="hud-tr"><div class="hud-cr cr">${UI.icoCr()}<b id="hCr">0</b></div><button class="btn hud-pause" id="hPause" type="button" aria-label="pause"><i></i></button></div>
      <div class="hud-abil" id="hAbil"></div>`;
    $('touchUI').innerHTML = `<div id="joyZone"><div id="joy"><i></i></div></div><div class="tcl" id="tcl"></div>`;
    $('bossBar').innerHTML = `<div class="bn" id="bossName"></div><div class="bar" style="position:relative"><b id="bossG"></b><i id="bossHp"></i><span class="ticks" id="bossTicks"></span></div>`;
    E = { hpL: $('hHpL'), hpT: $('hHpT'), hp: $('hHp'), hpG: $('hHpG'), shd: $('hShd'), shdG: $('hShdG'), shdT: $('hShdT'), atk: $('hAtk'),
      lvl: $('hLvl'), xp: $('hXp'), score: $('hScore'), combo: $('hCombo'), sec: $('hSec'), cr: $('hCr'), abil: $('hAbil'), tcl: $('tcl'),
      joy: $('joy'), joyZone: $('joyZone'), boss: $('bossBar'), bossName: $('bossName'), bossHp: $('bossHp'), bossG: $('bossG'), fps: $('fps') };
    // missing heart sprite: hide the img (text label still says HP)
    hud.querySelectorAll('img.hide-miss').forEach(im => { if (!(NC.assets && NC.assets.has && NC.assets.has('ui_heart'))) im.remove(); });
    $('hPause').addEventListener('click', () => { UI.sfx('click'); try { NC.game.pause(); } catch (e) {} });
    try { NC.Input && NC.Input.bindTouch && NC.Input.bindTouch(E.joyZone); } catch (e) {}
    H.relabel();
  };
  H.relabel = () => {
    if (!E.hpL) return;
    E.hpL.textContent = t('stat.hp'); consSig = ''; Object.keys(cache).forEach(k => delete cache[k]);
  };
  H.relayout = () => { consSig = ''; };
  H.show = (on) => {
    if (on && !builtLoaded) H.build();
    visible = on; $('hud').hidden = !on; $('touchUI').hidden = !on; $('fps').hidden = !on;
    if (!on) H.hideBoss();
    document.body.classList.toggle('touch', UI.isTouch());
  };

  // ------------------------------------------------ ability buttons (built when the consumable set changes)
  function padGlyph(i) { return ['□', '△', 'L1'][i]; }
  function buildAbilities(cons) {
    const touch = UI.isTouch();
    const pad = NC.Input && NC.Input.device === 'pad';
    // desktop strip
    E.abil.innerHTML = `<div class="ab" id="abDash"><span class="k">${pad ? 'X' : 'SPC'}</span><span class="dl">${UI.esc(t('hud.dash'))}</span><i class="cd" id="abDashCd"></i></div>` +
      cons.map((c, i) => `<div class="ab ${c.count ? '' : 'empty'}" id="ab${i}"><span class="k">${pad ? padGlyph(i) : i + 1}</span>${UI.img('cons_' + c.id, 'ico16')}<span class="n" id="abN${i}">${c.count}</span><i class="cd" id="abCd${i}"></i></div>`).join('');
    // touch cluster: DASH + consumables around it
    E.tcl.innerHTML = `<button class="tb dash" id="tbDash" type="button"><span>${UI.esc(t('hud.dash'))}</span><i class="cd" id="tbDashCd"></i></button>` +
      cons.map((c, i) => `<button class="tb cons c${i} ${c.count ? '' : 'empty'}" id="tb${i}" data-i="${i}" type="button">${UI.img('cons_' + c.id, 'ico16')}<span class="n" id="tbN${i}">${c.count}</span><i class="cd" id="tbCd${i}"></i></button>`).join('');
    const press = (el, fn) => el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('down'); fn(); UI.buzz(12); });
    const up = el => ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => el.addEventListener(ev, () => el.classList.remove('down')));
    const d = $('tbDash'); press(d, () => NC.Input && NC.Input.press && NC.Input.press('dash')); up(d);
    cons.forEach((c, i) => { const b = $('tb' + i); press(b, () => useCons(i)); up(b); });
    void touch;
  }
  function useCons(i) {
    if (NC.Input && NC.Input.press) NC.Input.press('cons', i);
    else if (NC.game && NC.game.useConsumable) NC.game.useConsumable(i);
  }

  // ------------------------------------------------ boss bar
  H.showBoss = (def) => {
    if (!E.boss) return;
    const key = def && (def.nameKey || ('boss.' + def.id + '.name'));
    E.bossName.textContent = key ? t(key) : '';
    const ticks = $('bossTicks'); const ph = (def && def.phases) || [0.66, 0.33];
    ticks.innerHTML = (Array.isArray(ph) ? ph : []).filter(p => typeof p === 'number' && p > 0 && p < 1).map(p => `<i style="left:${(p * 100).toFixed(1)}%"></i>`).join('');
    E.boss.hidden = false; cache.boss = null; document.body.classList.add('bossfight');
  };
  H.hideBoss = () => { if (E.boss) E.boss.hidden = true; document.body.classList.remove('bossfight'); };

  // ------------------------------------------------ per-frame update
  let fpsS = 0, lastT = performance.now(), comboPrev = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.25, (now - lastT) / 1000); lastT = now;
    if (!visible) return;
    const h = NC.hud; if (!h) return;
    const hpF = h.maxHp ? h.hp / h.maxHp : 0, shF = h.maxShd ? h.shd / h.maxShd : 0;
    setW(E.hp, 'hp', hpF); setW(E.hpG, 'hpg', hpF); setW(E.shd, 'shd', shF); setW(E.shdG, 'shdg', shF);
    setT(E.hpT, 'hpT', Math.ceil(Math.max(0, h.hp || 0)) + '/' + Math.ceil(h.maxHp || 0));
    setT(E.shdT, 'shdT', Math.ceil(Math.max(0, h.shd || 0)) + '/' + Math.ceil(h.maxShd || 0));
    setT(E.atk, 'atk', t('hud.atk', { n: UI.fmt(h.atk || 0) }));
    setT(E.lvl, 'lvl', t('hud.lvl', { n: h.runLvl || 1 }));
    setW(E.xp, 'xp', h.runNeed ? h.runXp / h.runNeed : 0);
    setT(E.score, 'score', UI.num(h.score || 0));
    if (E.score.parentNode) E.score.parentNode.classList.toggle('dimmed', !!h.boss);
    const cb = h.combo || 0;
    setT(E.combo, 'combo', cb > 1 ? t('hud.combo', { n: cb }) : '');
    if (cb > comboPrev && cb > 1 && cb % 5 === 0) { E.combo.classList.remove('pulse'); void E.combo.offsetWidth; E.combo.classList.add('pulse'); }
    comboPrev = cb;
    const biome = h.biome ? t('biome.' + h.biome + '.name') : '';
    setT(E.sec, 'sec', t('hud.sector', { n: Math.max(1, h.sector || 1) }) + (biome ? ' · ' + biome : ''));
    setT(E.cr, 'cr', UI.fmt(h.crystals || 0));
    // abilities
    const cons = (h.consumables || []).slice(0, 3);
    const sig = cons.map(c => c.id).join(',') + '|' + UI.isTouch() + '|' + (NC.Input && NC.Input.device === 'pad') + '|' + NC.lang;
    if (sig !== consSig) { consSig = sig; buildAbilities(cons); Object.keys(cache).filter(k => /^(ab|tb)/.test(k)).forEach(k => delete cache[k]); }
    const dcd = Math.max(0, Math.min(1, h.dashCd01 || 0));
    const dA = $('abDashCd'), dT = $('tbDashCd');
    if (dA) setS(dA, 'abD', 'height', (dcd * 100).toFixed(0) + '%');
    if (dT) setS(dT, 'tbD', '--p', dcd.toFixed(3));
    cons.forEach((c, i) => {
      const n = c.count | 0, cd = Math.max(0, Math.min(1, c.cd01 || 0));
      const an = $('abN' + i), tn = $('tbN' + i);
      if (an) setT(an, 'abN' + i, String(n)); if (tn) setT(tn, 'tbN' + i, String(n));
      const ac = $('abCd' + i), tc = $('tbCd' + i);
      if (ac) setS(ac, 'abC' + i, 'height', (cd * 100).toFixed(0) + '%'); if (tc) setS(tc, 'tbC' + i, '--p', cd.toFixed(3));
      const ea = $('ab' + i), et = $('tb' + i);
      if (cache['e' + i] !== !n) { cache['e' + i] = !n; if (ea) ea.classList.toggle('empty', !n); if (et) et.classList.toggle('empty', !n); }
    });
    // joystick visual follows NC.Input.joy (coords relative to the zone)
    const J = NC.Input && NC.Input.joy;
    if (J && E.joy) {
      if (J.active) {
        setS(E.joy, 'jl', 'left', J.cx + 'px'); setS(E.joy, 'jt', 'top', J.cy + 'px');
        setS(E.joy.firstElementChild, 'jk', 'transform', `translate(${Math.round(J.kx)}px,${Math.round(J.ky)}px)`);
        if (!cache.jon) { cache.jon = 1; E.joy.classList.add('on'); }
      } else if (cache.jon) {
        cache.jon = 0; E.joy.classList.remove('on'); E.joy.firstElementChild.style.transform = ''; cache.jk = ''; E.joy.style.left = ''; E.joy.style.top = ''; cache.jl = cache.jt = '';
      }
    }
    // boss
    if (h.boss && E.boss) {
      if (E.boss.hidden) H.showBoss({ nameKey: h.boss.nameKey });
      setW(E.bossHp, 'bhp', h.boss.hp01); setW(E.bossG, 'bhg', h.boss.hp01);
    } else if (E.boss && !E.boss.hidden && cache.bossAuto !== false && NC.hud && NC.hud.boss === null) { H.hideBoss(); }
    // fps (engine value, extra smoothing here so the number is readable; updated every frame)
    const f = h.fps || (dt > 0 ? 1 / dt : 0);
    fpsS = fpsS ? fpsS + (f - fpsS) * 0.1 : f;
    if (!document.body.classList.contains('nofps')) {
      const v = Math.round(fpsS); setT(E.fps, 'fps', v + ' FPS');
      const cls = v >= 50 ? '' : v >= 30 ? 'warn' : 'bad'; if (cache.fpsc !== cls) { cache.fpsc = cls; E.fps.className = cls; }
    }
  }
})(window.NC = window.NC || {});
