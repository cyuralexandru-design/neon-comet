# NEON COMET 3.0 — SPEC (source of truth for all agents)

Owner: Hulius (Romanian). Game: 2D top-down space shooter, browser PWA on Cloudflare Pages (static files, no build step, no npm). Played landscape on phone (touch), PC (mouse/keyboard) and gamepad (PS5 DualSense via Bluetooth in Chrome must work).
Project root: `/home/claude/nc3/game/`. The v2 code in this folder is the starting point (js/data.js, js/core.js, js/game.js, js/ui.js, css/style.css, index.html). v3 restructures it as described below.

Read also: `/home/claude/nc3/research/pixel-art/README.md` (art bible) and its topic files.

---------------------------------------------------------------------
## 0. Rules for parallel work (IMPORTANT)

Five agents work at the same time. Each agent may ONLY create/edit the files it owns (section 9). If you need something from another area, code against the contracts in this spec (sections 3–8) and leave a note in `NOTES/<your-area>.md`. Do not edit other agents' files. The integration agent merges everything afterwards.

Plain browser scripts, no modules, no bundler, one global namespace `window.NC`. Every file starts with `'use strict';` and `(function (NC) { ... })(window.NC = window.NC || {});`.
No external network at runtime: everything (fonts, sprites, audio) is local so the game works offline.
All user-facing text goes through `NC.t('key')` (i18n, section 7). No Romanian diacritics anywhere in UI text (owner request): write "Setari", "Iesire", "Cufere".

---------------------------------------------------------------------
## 1. Look & feel

- Pixel art, chunky readable pixels, light from the upper-left, 1 px dark outline, limited palette (art bible §palette). Approved references: `/home/claude/nc3/art/ships32_v4.png` (ships), `/home/claude/nc3/art/items_sheet_v2.png` (items, rarity frames), `/home/claude/nc3/art/bosses/bosses_sheet.png` (bosses). Match them.
- Muted, non-eye-searing colors. Dark navy backgrounds.
- Font: futuristic PIXEL font, local woff2, OFL/CC0 license verified, readable at small sizes, no diacritics needed. UI agent picks it (candidates: m6x11/m5x7 by Daniel Linssen, Silkscreen, Tiny5, Micro 5, Jersey 10, Pixelify Sans) and documents the license in `fonts/LICENSES.md`.
- Menus and panels are OPAQUE (no see-through glass). Main menu vertically and horizontally centered.

## 2. Rendering (engine)

- Logical pixel canvas: height 180 px; width = ceil(screenWidthPx / k) where k = max(1, floor(screenHeightPx*DPR / 180)) . Render the game into a low-res offscreen canvas of that logical size, then draw it to the visible canvas scaled by k with `imageSmoothingEnabled = false`, CSS `image-rendering: pixelated`. The game must FILL the whole screen (no black bars).
- Round all sprite draw positions to integers. No runtime scaling of sprites except integer. Ship rotation: ships always face up (top-down vertical shooter style); player moves freely in 2D, enemies come mainly from the top. Bosses face down.
- Landscape only. In portrait show a full-screen overlay "Roteste telefonul" with a pixel rotate-phone illustration (UI owns overlay, art provides sprite `ui_rotate`). Also call `screen.orientation.lock('landscape')` when in fullscreen/standalone (ignore errors). Manifest `orientation: landscape`.
- HUD is DOM (UI agent) reading `NC.hud` (section 5) every frame.

## 3. Rarity tiers (used for EVERYTHING: ships, weapons, turrets, companions, gear, chests, cards)

| id | key | name RO / EN | color | dark |
|---|---|---|---|---|
| 0 | common | Comun / Common | #63c74d | #265c42 |
| 1 | rare | Rar / Rare | #2ce8f5 | #0099db |
| 2 | epic | Epic / Epic | #c65197 | #7a367b |
| 3 | legendary | Legendar / Legendary | #fee761 | #feae34 |
| 4 | ultra | Ultra / Ultra | #ff6b6b | #a22633 |

Frame rules (as in items_sheet_v2.png): 1..5 diamond pips; rare+ chamfered corners; epic+ double frame; legendary+ top/bottom diamonds; ultra gold corner spikes. Items themselves keep their own colors; rarity is shown by the frame.

## 4. Asset contract (art agent produces, engine/UI consume)

- All sprites are PNG files in `assets/sprites/`, 1x pixel size (never pre-scaled). Animated sprites are horizontal strips of equal frames.
- `assets/manifest.json`:
```json
{ "version": 1,
  "sprites": { "<id>": { "file": "ship_vanator.png", "w": 32, "h": 32, "frames": 1, "fps": 0, "anchor": [16,16] } } }
```
- Loader (engine): `NC.assets.load(onProgress) -> Promise`, `NC.assets.get(id) -> {img,w,h,frames,fps,anchor}`, `NC.assets.draw(ctx, id, x, y, frame=0, opts={flipX, alpha})`, `NC.assets.url(id)` (for DOM `<img>`), `NC.assets.icon(id, scale)` returns a canvas element for UI.
- If a sprite id is missing, loader returns a magenta placeholder of the declared size (never crash).

### Sprite ids (fixed names — art must produce all, engine/UI must use these)
- Ships 32x32, 4 per rarity (20): `ship_<id>` for ids in §6.1. Already approved: vanator, nova, fregata, umbra (reuse from `/home/claude/nc3/art/s32.py`).
- Ship engine flame strip: `fx_thruster` (3 frames, 8x8).
- Weapons icons 24x24: `wpn_<id>`; projectiles: `proj_<id>` (strip, small: laser 2x6, plasma 6x6, missile 4x8, rail 3x12, flame 8x8 3 frames), evolved: `proj_<id>_evo`.
- Turrets 16x16 in-game sprite `tur_<id>` + icon 24x24 `icon_tur_<id>`.
- Companions 16x16 in-game `comp_<id>` + icon 24x24 `icon_comp_<id>`.
- Gear icons 24x24 `gear_<slot>_<rarity 0..4>` (armor, gen, core, boost).
- Consumables 24x24 `cons_<id>` (mine, shield, magnet, x2, repair) — exist in assets/sprites as consumable_*.png, rename.
- Chests 24x24 `chest_<0..4>`, plus big opening animation 48x48 strip `chest_open_<0..4>` (6 frames).
- Pickups: `pk_star` (12x12, 4 frame spin), `pk_crystal` (10x10, 4 frames), `pk_supernova` (16x16, 4 frames), `pk_repair` (12x12).
- Enemies: `en_<id>` (see §6.5 sizes), 2–4 frame strips; `en_<id>_hit` optional white flash is done in code.
- Enemy bullets: `eb_small` 6x6, `eb_big` 10x10, `eb_beam` 6x6 tile.
- Bosses 112x112: `boss_<id>`, `boss_<id>_dmg`, `boss_<id>_anim` (3 frames) — exist in `/home/claude/nc3/art/bosses/` as boss_1..5, map: colos=1, nucleu=2, leviatan=3, stup=4, imparat=5.
- Mini-bosses 48x48: `mboss_<id>` (3).
- Cards: illustration 56x48 `card_<cardId>` for every card in §6.8 (opaque, illustrative, not line-drawings).
- Backgrounds per biome, 4 parallax layers, tileable horizontally and vertically, 320x180: `bg_<biome>_1..4` (layer 1 farthest, layers 3–4 mostly transparent with stars/dust/props).
- FX: `fx_explode_s` (16x16, 6f), `fx_explode_m` (32x32, 8f), `fx_explode_l` (64x64, 10f), `fx_hit` (8x8, 4f), `fx_shield` (40x40, 4f), `fx_warp` (strip for loading screen), `fx_spark` (4x4 4f).
- UI: `ui_rotate` (64x64 rotate-phone, 4 frames), `ui_logo` (title logo pixel art ~200x48), `ui_crystal` 10x10, `ui_star` 10x10, `ui_lock` 12x12, `ui_pip_<0..4>` 7x7.

## 5. Engine contracts

- `NC.game.start(loadout)`, `pause()`, `resume()`, `quit()`, `revive()`, `giveUp()`, `pickCard(id)`, `rerollCards()`, `useConsumable(slotIndex)`, `mode` in ('menu','play','paused','cards','revive','over').
- Engine reads player stats from `NC.sys.computeStats()` (systems) at run start.
- Engine fires UI hooks (UI implements, all optional-safe via `NC.ui && NC.ui.fn && ...`): `onRunStart()`, `showCards(cards, rerollCost)`, `showRevive(cost, left)`, `showGameOver(summary)`, `showBossBar(def)`, `hideBossBar()`, `banner(titleKey, subText)`, `onPause()`.
- `NC.hud` object updated every frame by engine: `{score, combo, sector, biome, hp, maxHp, shd, maxShd, atk, crystals, runLvl, runXp, runNeed, dashCd01, consumables:[{id,count,cd01}], boss:{nameKey,hp01}|null, fps}`.
- Run summary for game over: `{score, best, isBest, kills, sector, bosses, combo, crystals, xp, lvlBefore, lvlAfter, time, chests:[rarity], revives, shipId}`.
- Debug hooks for tests: `NC.debug = { state(), setScore(v), killBoss(), hurt(v), addXp(v), spawn(enemyId), godMode(bool), simulate(seconds) }`.

## 6. Game design

### 6.1 Ships (bought once, then UPGRADED separately)
4 per rarity, ids and roles (names have no diacritics):
- common: `vanator` (balanced), `scorpion` (fast), `falcon` (+crit), `dart` (light, high speed)
- rare: `nova` (energy, +fire rate), `vortex` (+shield), `lynx` (agile, dash cd), `comet` (+crystals)
- epic: `fregata` (heavy, +hp), `aegis` (shield tank), `specter` (crit/evasion), `raptor` (dps)
- legendary: `umbra` (stealth/crit), `solaris` (power), `valkyrie` (all-round), `tempest` (fire rate)
- ultra: `imperial`, `eclipse`, `phoenix` (auto-revive once per run), `oblivion` (max dps)
Each ship: base multipliers (hp, atk, shd, rate, speed) by rarity tier band, plus 1 perk, shown in Hangar. Ship upgrade levels 1..(10 + 10*rarity), each level +4% to its multipliers; cost = shipBase[rarity] * 1.12^(lvl-1) (economy agent tunes).

### 6.2 Weapons (attack types, swappable, upgraded separately)
`laser` (fast single beam), `plasma` (slow piercing orbs), `missile` (homing, small AoE), `rail` (charged piercing line), `flame` (short cone DoT). One equipped. Each has its own level (1..30) and rarity unlock price. Evolution: if the matching card is maxed in a run, the weapon evolves for the rest of the run: laser→prism (splits), plasma→nova_orb (explodes), missile→swarm (more missiles), rail→annihilator (chains), flame→inferno (bigger cone + burn).

### 6.3 Turrets & companions
Turrets (one equipped, levels 1..20): `pulse`, `rocket`, `arc`, `beam`. Companions (one equipped, levels 1..20): `wing`, `orb`, `guardian`, `phantom`. Companion fires at the ship's fire rate with 2/3 of ship attack (+3%/level).

### 6.4 Gear (Cup Heroes style), merge, sets
Slots: `armor` (hp), `gen` (shield), `core` (crystals %, xp %), `boost` (speed, dash cd, crit). Items have rarity 0..4, level 1..(5*(r+1)), optional set id. MERGE: 3 items with same slot AND same rarity → 1 item of next rarity (level = max of the three), ultra is max. Sets (bonus at 2 and 4 pieces): `titan` (2: +10% hp, 4: +20% hp & shield regen), `fantoma` (2: +8% crit, 4: +15% speed & dash cd -20%), `tezaur` (2: +15% crystals, 4: +30% crystals & +20% xp). Manual multi-select selling. Sell value = 5x the v2 value (economy tunes). Bulk "sell all common" stays.

### 6.5 Enemies: types replace each other (no infinite HP scaling)
Max 20 enemies on screen. Target count = min(20, 8 + 2*sector). When an enemy dies and count < target, a new one spawns after 0.5–1.0 s (owner chose "fill immediately").
Sector = number of bosses defeated (0-based). Each sector introduces new types and retires old weak ones; small extra scaling +8% hp per sector max.
Roster (size in px):
- s0: `drone` 16, `dart` 16, `mine` 16
- s1: `hunter` 24, `gunner` 24 (drone retired)
- s2: `splitter` 32 (→ `shard` 16), `charger` 24 (dart retired)
- s3: `sentinel` 32 (beam), `wraith` 24 (cloaks) (mine retired)
- s4: `carrier` 40 (launches `mini` 12), `bulwark` 40 (front shield) (hunter retired)
- s5+: `artillery` 32 (lobbed shells) + elites of all current types; cycle biomes.
Points per kill raised so the first boss (50k) arrives in ~4–5 minutes for an average player.

### 6.6 Bosses, mini-bosses, sector events, biomes
- Boss every 50k points: 50k colos, 100k nucleu, 150k leviatan, 200k stup, 250k imparat, then cycle with +60% hp each loop. When a boss appears, all other enemies warp out; no spawns during boss. Telegraphed, calculated attacks (keep v2 attack library: aimed with lead, gapRing, sweep beam, mines, ram, spiral, orbs, blink).
- Mini-boss at 25k, 75k, 125k... (`mboss_1..3` cycle), regular enemies keep spawning but at half target.
- Sector events (random, every ~60–90 s outside bosses, 20 s long, announced by banner): `asteroids` (asteroid field crosses screen), `ionstorm` (shield does not regen, screen flicker), `blackhole` (gravity well pulls ship and bullets).
- Biomes cycle per sector: `nebula`, `asteroid`, `ion`, `station` (background layers + music + enemy color accents).

### 6.7 Consumables (bought in Hangar, also from epic+ chests)
`mine` (galactic mine: clears screen of normal enemies, 30% boss damage cap), `shield` (10 s invulnerable bubble), `magnet` (pull all pickups for 15 s), `x2` (double crystals for 30 s), `repair` (heal 50%). Before a run the player picks a loadout of up to 3 consumable types; carry up to 3 units of each. In-run they appear as buttons with their icon AROUND the DASH button (touch), keys 1/2/3 (PC), X/Y/LB (gamepad). The SUPER ability is removed.

### 6.8 In-run level-up cards
3 random cards on level-up, opaque taller cards (portrait ~3:4) with pixel illustrations (`card_<id>`), name, short description and the accumulated level as a single number ("Nv 3"), NOT "x/y". Reroll: first reroll per level-up free, then 50, 100, 200... crystals. Cards (ids): `dmg, rate, gun, pierce, bounce, missile, orbit, shield, heal, magnet, speed, crit, vamp` + weapon-evolution cards `evo_laser, evo_plasma, evo_missile, evo_rail, evo_flame` (only for the equipped weapon; max level 5 triggers evolution).

### 6.9 Economy & meta
- Currency: crystals. A typical 5–8 min run earns 8k–15k crystals at mid game (owner reports >10k per match). Prices must be reasonable: a meaningful upgrade every run, nothing requiring >5 runs early on. Economy agent writes `tools/balance/economy.md` with the model and tables, and `tools/balance/sim.js` (node) simulating 100 runs to validate.
- Chests: common..ultra prices; chest pity: after 10 epic-or-better chests without legendary+, next is legendary.
- Offline rewards: crystals accrue while away, rate based on best sector, cap 8 h, claim popup on return.
- Daily login rewards (keep) + 3 daily missions (e.g. kill 300 enemies, defeat a boss, collect 200 stars) with crystal/chest rewards, refresh at local midnight.
- Achievements: 40+ with meaningful rewards (crystals and chests), tiers bronze/silver/gold.
- Ship level (account XP) stays: +3% stats per level.
- Revive: up to 3 per run, cost scales with sector (keep v2 idea).

### 6.10 Other features
- Language selector RO/EN (Settings and first launch).
- Settings: control device (pc/touch/gamepad) ONLY in Settings (not on home), aim mode, handedness (mirror touch layout), joystick size, button opacity, music/sfx volume, vibration, screen shake, damage numbers, graphics quality, FPS counter (live, updated every frame, smoothed), colorblind mode (enemy bullets get distinct shapes), language, data (export/import/reset save).
- Loading screen (owner-approved): big centered `ui_logo` NEON COMET; below it a horizontal pixel loading bar where the player's selected ship travels left→right as progress advances, leaving a comet-trail fill; drifting stars; at 100% the ship zooms off the right edge, then fade to the main menu.
- Home menu (centered, opaque): Start, Hangar, Misiuni, Realizari, Setari, Cont, Iesire. Pilot card (level, crystals, power). Daily reward popup.
- Hangar: LEFT = selected ship large (32px sprite at integer scale 4x–6x) with equipped items arranged around it in slots (weapon, turret, companion, armor, gen, core, boost) like Cup Heroes; RIGHT = category tabs: Nave, Arme, Turele, Companioni, Echipament, Consumabile, Cufere. Item detail popup with stats before/after upgrade (DPS shown). Upgrade/merge animations (glow + number tick).
- Share card at game over: generates a PNG (score, ship sprite, sector, link neon-comet.pages.dev) and uses Web Share API with file when available, otherwise downloads it.
- Interactive tutorial on first run (move, dash, use consumable, pick a card), skippable.
- Gamepad: must work with PS5 DualSense over Bluetooth in Chrome/Edge. Poll `navigator.getGamepads()` every frame and pick the first connected pad (do not rely only on `gamepadconnected`); handle `mapping !== 'standard'` gracefully (axes 0/1 move, 2/3 or 2/5 aim); show "Controller conectat" toast; full menu navigation with D-pad/stick + Cross(confirm)/Circle(back)/L1-R1 tabs/Options(pause). Rumble via `vibrationActuator.playEffect('dual-rumble')` when available.
- Vibration on Android: `navigator.vibrate` whenever input is touch (not tied to settings ctrl mode); iOS has no API (document in UI note).
- PWA: offline cache of all files incl. sprites/audio (sw.js lists them or caches on first fetch), `orientation: landscape`.

## 7. i18n
`js/i18n.js` (UI agent): `NC.lang` ('ro'|'en'), `NC.t(key, vars)`, dictionary `NC.I18N = {ro:{...}, en:{...}}`. Keys are dot-separated: `menu.start`, `ship.vanator.name`, `card.dmg.desc`, etc. Other agents use keys; if a key is missing `NC.t` returns the key. Each agent lists the keys it uses in `NOTES/<area>-i18n.md` with RO and EN text; the UI agent will merge what it can and the integrator finishes.

## 8. Save (systems)
`js/save.js`: v4 save in localStorage key `neonComet.v4` + backup key; migration from v3 (`neonComet.v3`): credits, best, xp, stats, achievements claimed, daily, settings kept; v3 ships map scout→vanator, solaris→solaris, umbra→umbra, vipera→raptor, titan→fregata, nova→nova; base stat levels converted to crystal refund; turrets pulse→pulse, twin→pulse(+lvl), missile→rocket, arc→arc; companions alfa→wing, soim→orb, spectru→phantom, gardian→guardian; gear items keep slot mapping weapon→(refund), armor→armor, gen→gen, core→core with same rarity. Never lose progress; show a "Actualizare 3.0" toast with what was converted.
Systems API `NC.sys`: `load(), save(), computeStats(), buy(kind,id), upgrade(kind,id), equip(kind,id), merge(itemIds[3]), sell(itemIds[]), openChest(rarity) -> rewards, buyConsumable(id,n), loadout get/set, claimDaily(), missions(), claimMission(id), achievements(), claimAch(id), offlineRewards(), price(kind,id,lvl)`. All numbers live in `js/data.js`.

## 9. File ownership

| Agent | Owns (create/edit only these) |
|---|---|
| ART | `assets/sprites/**`, `assets/manifest.json`, `assets/src/**`, `tools/art/**`, `NOTES/art*.md` |
| ENGINE | `js/engine/*.js` (assets.js, render.js, game.js, enemies.js, bosses.js, weapons.js, fx.js, input.js), `NOTES/engine*.md` |
| SYSTEMS | `js/data.js`, `js/save.js`, `js/systems.js`, `tools/balance/**`, `NOTES/systems*.md` |
| UI | `index.html`, `css/**`, `fonts/**`, `js/i18n.js`, `js/ui/*.js` (app.js, menus.js, hangar.js, hud.js, settings.js, overlays.js), `manifest.webmanifest`, `NOTES/ui*.md` |
| AUDIO | `js/audio.js`, `assets/audio/**` (if any), `NOTES/audio*.md` |
| ALL agents | may create test harnesses only under `dev/<area>/**` |
| INTEGRATOR (later) | everything; removes obsolete v2 files (js/core.js, js/game.js, js/ui.js) once replaced; updates sw.js; tests; README |

Script load order in index.html (UI agent writes it exactly): `js/i18n.js, js/data.js, js/save.js, js/systems.js, js/audio.js, js/engine/assets.js, js/engine/input.js, js/engine/fx.js, js/engine/weapons.js, js/engine/enemies.js, js/engine/bosses.js, js/engine/render.js, js/engine/game.js, js/ui/hud.js, js/ui/overlays.js, js/ui/hangar.js, js/ui/settings.js, js/ui/menus.js, js/ui/app.js`.
`js/ui/app.js` boots: `NC.sys.load()` → loading screen → `NC.assets.load()` → `NC.game.init(canvas)` → menu.

Audio API (AUDIO agent): `NC.audio.unlock()`, `NC.audio.sfx(name, param)`, `NC.audio.music(mode)` with mode in ('menu','nebula','asteroid','ion','station','boss','off'), `NC.audio.setVolumes(music, sfx)`. Chiptune style (square/triangle/noise, procedural WebAudio, no files required).
SFX names: shoot_laser, shoot_plasma, shoot_missile, shoot_rail, shoot_flame, hit, crit, explode_s, explode_m, explode_l, pickup_star, pickup_crystal, dash, hurt, shield_hit, levelup, card, reroll, warn, boss_intro, boss_phase, beam_charge, beam_fire, mine, shield_up, magnet, repair, chest_open, legendary, buy, upgrade, merge, error, click, revive, gameover, mission_done.

## 10. Definition of done (integrator checks every item)
All features in §2–§8 work on desktop Chrome, mobile landscape (touch) and simulated gamepad; no console errors in a 5-minute bot run; boss at 50k; max 20 enemies; offline reload works; v3 save migrates; RO/EN switch; deploy-ready static folder.
