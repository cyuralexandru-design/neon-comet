'use strict';
// Neon Comet 3.1.2 - weapon multi-shot upgrade (hangar): every weapon can be upgraded separately to x2 and x3 shots
// (each shot full damage). Saved in S.weapons.ms[weaponId] = 0|1|2. Adds +1/+2 guns to the run stats.
(function (NC) {
  const UI = NC.ui = NC.ui || {};
  const t = (k, v) => NC.t(k, v);
  const sys = () => NC.sys;
  const S = () => (sys() && sys().state ? sys().state() : null);
  const lvl = wid => { const s = S(); return (s && s.weapons && s.weapons.ms && s.weapons.ms[wid]) || 0; };
  const price = (d, l) => { const base = Math.max(12000, (d && d.price) || 0); return Math.round((l === 0 ? base * 1.2 : base * 3.5) / 500) * 500; };
  const owned = wid => { const s = S(); return !!(s && s.weapons && s.weapons.lv && s.weapons.lv[wid]); };
  const fmt = n => (UI.fmt ? UI.fmt(n) : String(n));

  function install() {
    const X = sys(); if (!X || X._msInstalled) return; X._msInstalled = true;
    X.multiLvl = lvl;
    X.buyMulti = (wid) => {
      const s = S(), d = X.def ? X.def('weapon', wid) : null; if (!s || !d) return { ok: false, err: 'sys.err.unknown' };
      if (!owned(wid)) return { ok: false, err: 'ms.err.notOwned' };
      const l = lvl(wid); if (l >= 2) return { ok: false, err: 'ms.err.max' };
      const p = price(d, l); if ((s.crystals || 0) < p) return { ok: false, err: 'toast.noCrystals' };
      s.crystals -= p; s.weapons.ms = s.weapons.ms || {}; s.weapons.ms[wid] = l + 1;
      try { X.save(); } catch (e) {}
      return { ok: true, lvl: l + 1 };
    };
    const cs = X.computeStats;
    if (typeof cs === 'function') X.computeStats = function (s) {
      const st = cs.apply(this, arguments) || {};
      try { const st0 = s || S(), wid = st0 && st0.weapons && st0.weapons.eq; const m = wid ? ((st0.weapons.ms || {})[wid] || 0) : 0; if (m) st.guns = (st.guns || 1) + m; } catch (e) {}
      return st;
    };
  }

  UI.hangarWeaponTag = d => { const l = lvl(d.id); return l ? 'x' + (l + 1) : ''; };
  UI.hangarWeaponExtra = d => {
    install();
    const l = lvl(d.id), own = owned(d.id);
    const steps = [1, 2, 3].map(n => `<span class="ms-pip ${n <= l + 1 ? 'on' : ''}">x${n}</span>`).join('');
    const btn = !own ? `<span class="ms-note">${t('ms.needOwn')}</span>`
      : l >= 2 ? `<span class="ms-note ms-max">${t('ms.max')}</span>`
      : `<button class="ha-b sm pri ha-c" data-f data-a="ms" data-id="${d.id}">${t('ms.buy', { n: l + 2 })} ◆ ${fmt(price(d, l))}</button>`;
    return `<div class="ms-box"><div class="ms-h">${t('ms.title')}</div><div class="ms-row">${steps}</div><div class="ms-btn">${btn}</div></div>`;
  };

  document.addEventListener('click', (ev) => {
    const b = ev.target && ev.target.closest ? ev.target.closest('[data-a="ms"]') : null; if (!b) return;
    ev.stopPropagation(); install();
    const r = sys().buyMulti(b.dataset.id);
    if (!r.ok) { UI.toast && UI.toast(t(r.err), 'bad'); UI.sfx && UI.sfx('error'); return; }
    UI.sfx && UI.sfx('upgrade'); UI.toast && UI.toast(t('ms.done', { n: r.lvl + 1 }), 'warm');
    let m = b; while (m && !m._render) m = m.parentElement;
    if (m) m._render(); if (UI.rerender) UI.rerender(false);
  }, true);

  NC.I18N = NC.I18N || {}; NC.I18N.ro = NC.I18N.ro || {}; NC.I18N.en = NC.I18N.en || {};
  Object.assign(NC.I18N.ro, {
    'ms.title': 'Focuri multiple (daune intregi)', 'ms.desc': 'Arma trage mai multe proiectile odata, fiecare cu daune intregi. Upgrade separat pentru fiecare arma.',
    'ms.buy': 'Upgrade x{n}', 'ms.max': 'Maxim x3', 'ms.needOwn': 'Cumpara arma intai', 'ms.done': 'Focuri multiple x{n}!',
    'ms.err.notOwned': 'Cumpara arma intai', 'ms.err.max': 'Deja la x3'
  });
  Object.assign(NC.I18N.en, {
    'ms.title': 'Multi-shot (full damage)', 'ms.desc': 'The weapon fires more projectiles at once, each with full damage. Upgraded separately for each weapon.',
    'ms.buy': 'Upgrade x{n}', 'ms.max': 'Max x3', 'ms.needOwn': 'Buy the weapon first', 'ms.done': 'Multi-shot x{n}!',
    'ms.err.notOwned': 'Buy the weapon first', 'ms.err.max': 'Already x3'
  });
  const css = document.createElement('style');
  css.textContent = `.ms-box{margin-top:4px;padding:5px 8px;flex:none;border:1px solid var(--line);background:var(--panel2)}
  .ms-h{font-weight:800;color:var(--amber);font-size:12px;letter-spacing:1px;text-transform:uppercase}
  .ms-d{font-size:11px;color:var(--dim);margin:3px 0 6px}
  .ms-row{display:flex;align-items:center;gap:5px;margin-top:3px}.ms-btn{margin-top:4px}.ms-btn .ha-b{width:100%;white-space:nowrap}
  .ms-pip{font-weight:800;font-size:12px;padding:2px 7px;border:1px solid var(--line);color:var(--dim)}
  .ms-pip.on{border-color:var(--amber);color:#1b1306;background:var(--amber)}
  .ms-note{font-size:11px;color:var(--dim)}.ms-max{color:var(--amber)}`;
  document.head.appendChild(css);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else setTimeout(install, 0);
})(window.NC = window.NC || {});
