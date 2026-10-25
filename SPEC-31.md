# NEON COMET 3.1 — SPEC for the parallel agents (read fully before coding)

Project root: `/home/claude/nc3/game/` (live v3.0 code = starting point; backup of v3.0 in `/home/claude/nc3/game_v30_backup/`).
Background/architecture: `SPEC.md` (v3.0 spec) + `NOTES/*.md`. This file OVERRIDES SPEC.md where they differ.
Owner: Hulius (Romanian). RO UI text has NO diacritics. Every user-visible string goes through `NC.t(key)` with BOTH `ro` and `en` text.
Plain browser scripts, no modules/bundler/npm at runtime, global `window.NC`, `'use strict'` + IIFE like existing files. Everything local/offline.

Goal of 3.1: new dark sci-fi UI style on ALL screens, readable font, bug fixes, controller remap, HUD rework, smaller sprites, slower XP/cards,
balance + economy fix, audio fix. (Game modes/difficulty, Blaster logic, multi-shot upgrades, special-card logic come in 3.2 — but some 3.2 assets
and the Help screen are produced now, see agents `art2` and `help`.)

-----------------------------------------------------------------------------------------------------------------
## 0. Parallel work rules (IMPORTANT)

~12 agents work AT THE SAME TIME in this same folder. You may ONLY create/edit the files you own (section 9).
- Need a change in a file you don't own? Write a small unified diff to `dev/patches/<agent>--<file-name>.patch` with 1-2 lines of explanation at
  the top. The integrator applies it. Keep these rare and small. Never edit another agent's file directly.
- New i18n keys: put them in YOUR lang file `js/lang/<agent>.js` (template in §7). Do not edit `js/i18n.js` (owned by agent `i18n`).
- New CSS: put it in YOUR css file (`css/<agent>.css`). `css/style.css` (base design system) is owned by `core`.
- Code against the contracts below even if the other side isn't written yet; guard calls (`UI.infoCard && UI.infoCard(...)`).
- Do NOT run long verification sessions / bots / big screenshot suites at the end (owner wants to save usage). A quick `node --check` on your
  JS files and, if you want, ONE quick headless look at your screen is enough. No git, no deploy (integrator does it).
- When done write `NOTES/31-<agent>.md` (max ~40 lines): what you changed, contracts you rely on, patches you left, known gaps.

-----------------------------------------------------------------------------------------------------------------
## 1. Look & feel (approved by owner)

Reference: `dev/design/hangar_ref.html` + `dev/design/hangar_ref.png` (APPROVED hangar mockup, colour variant "B"). Every screen must look like
that family: dark, Star-Wars-like, original (NOT a copy of Cup Heroes or any other game), muted colours — NOT vibrant/neon.

Palette B tokens (core defines them in `:root`; everybody uses the variables, never hard-coded hex):
```
--bg:#0b0e14  --panel:#121720  --panel2:#181f2a  --line:#2a3445
--amber:#d6a35a (primary accent, active, CTA)   --cyan:#73b9c6 (secondary accent, info, equipped)   --red:#b0605a (back/danger)
--ink:#e2e6ec (text)  --dim:#8a94a3 (secondary text)
--r0:#78a86c Common  --r1:#5f93bd Rare  --r2:#9a78b8 Epic  --r3:#d6a35a Legendary  --r4:#c0645c Ultra
--hp:#c0645c  --shd:#73b9c6  --xp:#e09a3e (run-level bar: yellow-orange, replaces old purple)  --good:#78a86c  --bad:#c0645c
```
Old token names in style.css (`--bg0..5 --acc --warm --r0..r4 --hp --shd --xp ...`) must keep working as aliases of the new palette.
Canvas/engine colours for rarities/UI-ish things must use the same palette B values (`NC.DATA.RARITY` or equivalent).

Typography: font **Oxanium** (OFL, self-hosted woff2 in `fonts/`, weights 400/600/700/800) = family `'NCUI'`, used for ALL UI text.
Min font size ≈ 11 CSS px at 844x390, normal letter-spacing (titles may use small tracking). The old pixel fonts are no longer used for text,
EXCEPT the logo-like pixel style (`'NCPixel'` = Silkscreen Bold, class `.pix-title`) for: the big "SECTOR N" intro text and big screen titles
where it looks good. The old serif fallback bug must be impossible (font stack: 'NCUI', system-ui, sans-serif).

Components (core implements in `css/style.css` + helpers in `js/ui/app.js`; others use them):
- `.cut` chamfered corners (clip-path, ~7px), panels `.pnl` (opaque `--panel`, 1px `--line` border), section header `.sec-h` (amber caps title + count + thin line).
- Buttons `.btn` with `.pri` (amber fill, dark text), `.sec` (dark teal, cyan text), `.mut` (dark, ink text), `.back` (dark red), sizes `.sm`/`.lg`, `.off` disabled.
  Keep existing class names used in the code working (e.g. `.warm`, `.good`) mapped onto these looks.
- Item tile: `UI.frame(r, innerHtml, opts)` → square tile, border in rarity colour, bottom band in rarity colour with dark text "Nv X"
  (`opts.lvl`), cyan check badge top-left (`opts.equipped`), green triangle top-right (`opts.up` = upgradable), set icon (`opts.set` = set id),
  red/amber count badge (`opts.badge`), `opts.empty` = dashed empty slot with greyed icon + cyan "+", `opts.cls`. Keep backwards compatible.
- Chips `.chip`/`.chip.on`, icon tabs `.itabs` (icons only, the active one shows its label under the icon, amber top line).
- Info card popup (Pokemon-card-like but NO stars/HP-style gimmicks): `UI.infoCard({img, r, title, sub, desc, stats:[[label,value],...], foot, actions:[{a,label,cls}], on(a)})`
  → modal; portrait card, frame/top glow in rarity colour (or neutral if r==null), big pixel image on top (image-rendering:pixelated),
  title + rarity/sub line, description text under it, optional stat lines, optional buttons. Closes on tap outside / back / Circle.
- `UI.toast`, `UI.modal` restyled. UI sprite images (`.ico`) get `filter:saturate(.82)` so item art matches the muted palette (not the in-game canvas).

-----------------------------------------------------------------------------------------------------------------
## 2. Engine ↔ UI contracts (new/changed)

2.1 In-game pop-ups become ICON ALERTS (no more big banners mid-screen during gameplay).
Engine calls `U.ui('alert', type, data)` → `NC.UI.alert(type, data)` (HUD agent implements). Types:
`boss` (boss incoming) · `bossDown` · `elite` (elite or mini-boss spawned, data {nameKey}) · `event` (data {id}) · `threat` (new enemy types,
data {ids}) · `chest` (data {r}) · `evolved` (data {weapon}) · `supernova` · `rebirth`.
HUD shows them as small icons stacked on the RIGHT, under the crystals counter and pause button; each pops in, pulses ~3 s, fades.
Same icon for ALL bosses (`ui_alert_boss`), same for all elites (`ui_alert_elite`), etc. `boss` additionally: red screen-edge glow ~1 s
(HUD) + engine plays warning sfx + `NC.Input.buzz`. `banner.phase` ("FAZA 2") is removed completely.
`UI.banner` may stay for non-gameplay use but engine must not use it during play anymore.

2.2 Sector: engine calls `U.ui('sector', n, biomeKey)` at run start and on every sector change.
HUD: big centred pixel text "SECTOR n" (+ biome name smaller) WITHOUT box/background, logo-like pixel style, fades in/out ~2 s.
Permanent small label under "Lv" in the top HUD: sector + biome name, no black box, readable colour (e.g. `--cyan` with dark outline/shadow).

2.3 Boss bar: `U.ui('showBossBar', {id, nameKey, hp, mini, col, segs})` — `segs` = 3 for bosses (phases at 2/3 and 1/3), 1 for mini-bosses.
HUD draws the bar split into `segs` visible segments; no phase text. `NC.hud.boss` keeps `{hp01, nameKey, mini, segs}`.

2.4 HUD safe zone: HUD agent sets `NC.game.hudTop` = bottom edge of the top HUD in LOGICAL canvas px (update on relayout).
Engine keeps enemy/boss resting/target positions and boss bar overlap below `hudTop + 4` (existing `G.bossTop` concept) — nothing important
renders under score/crystals/sector text.

2.5 Pause stats: engine provides `NC.game.runStats()` →
`{hp,maxHp,shd,maxShd,atk,dps,crit,critDmg,vamp,speed,magnet,dashCd,guns,pierce,regen,runLvl,runXp,runNeed,time,kills,score,
cards:[{id,lvl,max,r,special}]}` (crit/vamp as 0..1 fractions, critDmg as multiplier e.g. 2.0). Overlays draws the pause screen from it.

2.6 Cards: every card def in `NC.DATA.CARDS` gets a rarity `r` 0..4 by how strong it is (data agent). Offer objects passed to
`showCards` are `{id, lvl, max, r, special?, ...}`. Weighted offers by rarity (≈ Common 46%, Rare 28%, Epic 16%, Legendary 8%, Ultra 2%;
evo cards Legendary/Ultra). Card frequency: see §3.

2.7 Pickups (engine + art): `cr` crystal = small blue rhombus `pk_crystal` 7x7 (was 10x10); NEW `xp` = green-cyan orb `pk_xp` 7x7 dropped by
killed enemies (XP is granted on pickup, not on kill; magnet pulls them; life ~20 s; when a boss dies all xp/cr on screen fly to the player);
`star` = small golden LIGHT SPHERE `pk_star` 4x4 with soft glow (no more 5-point star sprite).

2.8 FPS: settings key `fpsCap` (60 | 120, default 60). Input agent provides `NC.display = {maxHz, detect(): Promise<number>}` (measures real
refresh rate via rAF). Engine loop caps rendering/simulation to `fpsCap` (simulation stays stable at any rate). Settings shows 120 only
selectable if `NC.display.maxHz >= 110`, otherwise disabled/greyed with a short note. Existing `fps` key = show FPS counter (keep).

2.9 Controller (gamepad, PS5 DualSense first; standard mapping indices): during play **dash = R2 only** (index 7) — not Cross, not R1.
Consumables: slot 1 = **Cross** (0), slot 2 = **Square** (2), slot 3 = **Triangle** (3). Pause = Options (9). Menus unchanged (Cross = OK,
Circle = back, L1/R1 = tabs). HUD shows the matching button glyph sprites on the consumable/dash buttons when `NC.Input.device === 'pad'`
(`btn_ps_cross`, `btn_ps_square`, `btn_ps_triangle`, `btn_ps_r2`; for non-Sony pads show A / X / Y / RT text glyphs).
Input agent provides `NC.Input.glyph(action)` for action ∈ `cons1|cons2|cons3|dash|pause|ok|back` → `{spr:'btn_ps_cross'}` (Sony pad)
or `{txt:'A'}` (other pads) or `null` (no pad). HUD/overlays use it for hints.

2.10 Settings shape: `save.js` defaultSettings gets `fpsCap: 60` (data agent). UI reads `UI.settings().fpsCap || 60`.

2.11 Chests: hangar may call `UI.chestAnim(r, res, onAgain)` (single, exists) and NEW `UI.chestSummary(r, list)` (overlays) where `list` is the
array of `sys.openChest` results opened in one go → ONE animation + one summary screen listing everything obtained (grouped, rarity-coloured).

2.12 Version: `NC.game.version = '3.1.0'`, menu shows "v3.1". "What's new" popup (core) shows once per version (localStorage key
`nc.seenVersion`, try/catch), text from keys `whatsnew.31.title`, `whatsnew.31.body` (core writes RO+EN summary of §3).

-----------------------------------------------------------------------------------------------------------------
## 3. Owner requirements for 3.1 (each line has an owner agent in brackets)

UI / screens
- [core] Whole UI restyled to §1 (palette B, Oxanium, chamfered panels, consistent buttons). No text "just thrown on screen": every text
  sits in a proper component with hierarchy (title/label/value). Professional look.
- [core] Black empty strip at the bottom when the game is opened directly in landscape (disappears after portrait→landscape): fix for good
  (recompute layout on `visualViewport` resize/scroll, after load + after the browser bar hides, `100dvh`/innerHeight fallback, no double insets).
- [core] Rotate-phone overlay animation must rotate to the LEFT (counter-clockwise), not right.
- [core] "What's new" popup (§2.12).
- [hangar] Hangar exactly in the style of `dev/design/hangar_ref.*` (all tabs: Nave, Arme, Turele, Companion, Echipament, Consumabile,
  Cufere as icon tabs; equipment grouped by category even on "Toate"; equipped slots without names above them; empty slot dashed with "+").
- [hangar] Button **"Merge tot"** (Merge all): automatically merges every possible group of 3 (same slot + same rarity), never touches equipped
  items, prefers lowest levels, repeats until nothing is mergeable, then shows one summary of what was created.
- [hangar] Consumables: tapping one opens `UI.infoCard` with big image + name + description (what it does) + how many you own.
- [hangar] Chests: per chest type a button **"Deschide toate (n)"** opening all owned chests of that type at once → `UI.chestSummary`.
  First list row must not be cut off.
- [hangar] No truncated texts anywhere (MINA GAL…, Curata…, 1x Co…): layout that fits + auto-shrink for long names.
- [menus] Achievements in ONE column, new style (icon, name, description, progress bar, reward, Claim button). Missions + home menu restyled.
- [menus] Settings restyled + FPS option 60/120 (§2.8) + version shown. Home menu gets a **"Ajutor / Help"** button → `UI.show('help')`
  (key `menu.help`, defined by menus).
- [overlays] Pause screen like the layout reference `dev/design/ref_pause_layout.png` (LAYOUT idea only — use our own style §1, no copying):
  left = quick settings (Music, Sounds, Vibration toggles) + buttons Continue / Settings / Back to menu (with gamepad glyph hints);
  right = STATS grid from `runStats()` (Max HP, Attack, Shield, Damage/sec, Crit chance, Crit damage, Lifesteal, Speed, Run level XP x/y)
  + "SKILLS"/cards taken this run as small rarity-coloured card icons with level.
- [overlays] Level-up cards = collectible-card style (portrait, illustrated image on top, name, effect text under it, level), frame + background
  tinted by the card's RARITY (palette B r0..r4). Prepare a look for `special` cards (3.2): extra ornate frame/foil effect. Dim the game 75%,
  hide HUD while cards are open, no overlap with HUD. Reroll button restyled.
- [overlays] Loading screen at app start (logo big + ship travelling on the bar + fly-off) lasts at least **5 seconds**.
- [overlays] Revive, game over/share card, chest open animation, `UI.chestSummary` restyled to §1.
- [hud] Top HUD restyle: HP/shield/run level, run-level XP bar colour `--xp` (yellow-orange, not purple), sector label under Lv without box
  (§2.2), alert icons (§2.1), boss bar in 3 segments (§2.3), boss red-edge warning, `NC.game.hudTop` (§2.4), consumable/dash buttons with pad
  glyphs (§2.9), FPS counter restyle. Touch controls restyled (keep translucent where they were).
- [help] New Help screen (see agent brief).

Engine / data
- [engine] Ship, enemies, bosses, projectiles look ~10% smaller on screen (owner: "reduce 5-10%"). Current: logical height 180 with integer
  scale k = floor(screenH*DPR/180) → integer jumps. Make the visible world ~10% larger (not more than ~15%) on common phones
  (390-430 CSS px landscape height, DPR 2-3) and PC 1080p, keep pixels crisp (integer scale where possible; choose target height per device).
- [engine] XP orbs / rhombus crystals / light-sphere stars (§2.7). Pickups are smaller as specified.
- [engine] Alerts/sector/boss-bar contracts (§2.1-2.4), `runStats()` (§2.5), FPS cap (§2.8), remove phase banners, version 3.1.0.
- [engine] Enemies/boss never sit under the top HUD (§2.4). Explosion fireballs readable.
- [data] Run XP curve much steeper: currently `18 + 9l + 2l^1.6` (L1 29, L10 188, L20 438) with enemies giving 3-15 XP → cards every few
  seconds. Target: first card after ~25-35 s, later ~60-90 s between cards at normal play. Starting point `round(50 + 20l + 6 l^1.9)`
  (L1 ~76, L10 ~730, L20 ~2200) — tune with quick math/sim (`tools/balance/sim.js`), not with long bot runs.
- [data] Card rarities + weighted offers (§2.6).
- [data] Game is too easy (owner had full HP 1661/1661 at 800k points): enemy damage/HP scaling per sector up, less passive regen, so
  Normal play is a real challenge around sector 3+. Bosses every 50k stay; first boss ~2 min.
- [data] Too many crystals (owner went 164k → 303k → 500k in a few runs): cut crystal drops ~÷3 (kills, bosses, achievements/missions in
  proportion). Prices stay. Don't break existing saves (old balances stay as they are).
- [data] `fpsCap` default (§2.10). Rarity colours in data → palette B.
- [input] Controller remap (§2.9). `NC.display` (§2.8).
- [input] AUDIO BUG: sometimes there is no sound at all, whatever you do. Find and fix the root causes (ideas: AudioContext only unlocked once
  `{once:true}` → stays `suspended`/`interrupted` after app switch, phone lock, call, bluetooth change; master/music gain stuck at 0 after a
  duck/fade; exceptions in sfx creation breaking the chain; too many nodes). Resume on every user gesture + `visibilitychange` + `statechange`,
  recreate the context if closed, make every sfx call failure-safe, watchdog that restores master gain.
- [i18n] Language bugs: after switching RO→EN some texts stay Romanian ("boss" and others); earlier the opposite happened mid-run (pause/HUD
  in English while RO selected). Fix the language state + make EN complete; automated checker.

-----------------------------------------------------------------------------------------------------------------
## 4. New sprite ids

art1 (3.1, needed now): `pk_crystal` 7x7 (blue rhombus, shimmer strip ok), `pk_xp` 7x7 (green-cyan orb, pulse strip ok), `pk_star` 4x4
(golden light sphere), alert icons 16x16: `ui_alert_boss`, `ui_alert_elite`, `ui_alert_event`, `ui_alert_threat`, `ui_alert_chest`,
`ui_alert_evolved`, `ui_alert_supernova`, `ui_alert_rebirth`; pad glyphs 12x12: `btn_ps_cross`, `btn_ps_square`, `btn_ps_triangle`,
`btn_ps_circle`, `btn_ps_r2`, `btn_ps_options`; `ui_rotate` (phone, for the rotate-left animation, CSS rotates it).
Tab icons for the hangar if missing (ships/weapons/turrets/companions/gear/consumables/chests) — reuse existing sprites where possible.

art2 (3.2 assets, produced now, NOT wired yet): portrait cards ~72x104: `mode_survival`, `mode_soon`; difficulty portraits ~72x104:
`diff_easy`, `diff_normal`, `diff_hard`, `diff_nightmare` (escalating menace); Blaster weapon: `wpn_blaster` 24x24, `proj_blaster` (short
laser bolt, Star-Wars-like), `proj_blaster_evo`, `card_evo_blaster`; special cards art (same size as existing `card_*`): `card_sp_chain`,
`card_sp_blackhole`, `card_sp_shieldnova`, `card_sp_phoenix`, `card_sp_timewarp`, `card_sp_overcharge`, `card_sp_vampfield`, `card_sp_frost`.

-----------------------------------------------------------------------------------------------------------------
## 7. i18n extension file template (`js/lang/<agent>.js`, loaded right after js/i18n.js)
```js
'use strict';
(function (NC) {
  NC.I18N = NC.I18N || {}; NC.I18N.ro = NC.I18N.ro || {}; NC.I18N.en = NC.I18N.en || {};
  Object.assign(NC.I18N.ro, { 'hangar.mergeAll': 'Merge tot' });
  Object.assign(NC.I18N.en, { 'hangar.mergeAll': 'Merge all' });
})(window.NC = window.NC || {});
```
Prefix your keys with your area (`hangar.`, `hud.`, `ov.`, `menu.`, `set.`, `help.`, `eng.`, `data.`, `in.`) to avoid collisions.

-----------------------------------------------------------------------------------------------------------------
## 9. File ownership (3.1)

| agent | owns (create/edit only these) |
|---|---|
| core | `css/style.css`, `fonts/*`, `index.html`, `js/ui/app.js`, `js/lang/core.js`, `manifest.webmanifest`, `icons/*` |
| hud | `js/ui/hud.js`, `css/hud.css`, `js/lang/hud.js` |
| overlays | `js/ui/overlays.js`, `css/overlays.css`, `js/lang/overlays.js` |
| hangar | `js/ui/hangar.js`, `css/hangar.css`, `js/lang/hangar.js` |
| menus | `js/ui/menus.js`, `js/ui/settings.js`, `css/menus.css`, `js/lang/menus.js` |
| help | `js/ui/help.js` (new), `css/help.css` (new), `js/lang/help.js` |
| i18n | `js/i18n.js`, `dev/integration/i18n_check.js`, `NOTES/31-i18n.md` |
| engine | `js/engine/game.js`, `render.js`, `fx.js`, `enemies.js`, `bosses.js`, `weapons.js`, `js/lang/engine.js` |
| data | `js/data.js`, `js/systems.js`, `js/save.js`, `tools/balance/*`, `js/lang/data.js` |
| input | `js/engine/input.js`, `js/audio.js`, `js/engine/display.js` (new), `js/lang/input.js` |
| art1 | `js/engine/assets.js`, `assets/manifest.json`, `assets/sprites/*` (existing ids + art1 ids), `tools/art/*` |
| art2 | only the NEW art2 sprite files in `assets/sprites/`, `dev/art2/*` (incl. `dev/art2/manifest_add.json` snippet) |
| integrator | `sw.js`, `SPEC*.md`, `README.md`, `CHANGELOG.md`, applies `dev/patches/*` |

index.html script order (core sets it up now, every agent creates its files even if small): `js/i18n.js`, `js/lang/{core,hud,overlays,hangar,
menus,help,engine,data,input}.js`, `js/data.js`, `js/save.js`, `js/systems.js`, `js/audio.js`, `js/engine/display.js`, `js/engine/assets.js`,
`input.js`, `fx.js`, `weapons.js`, `enemies.js`, `bosses.js`, `render.js`, `game.js`, `js/ui/hud.js`, `overlays.js`, `hangar.js`, `settings.js`,
`menus.js`, `help.js`, `app.js`. CSS: `fonts/fonts.css`, `css/style.css`, `css/{hud,overlays,hangar,menus,help}.css`.
