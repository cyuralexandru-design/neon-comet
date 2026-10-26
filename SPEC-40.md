# NEON COMET 4.0 — PORTRAIT + HD ART + ITEMS REWORK (spec for parallel agents)

Project `/home/claude/nc3/game/` (live v3.3.0). Same team rules as `SPEC-31.md` §0 (ownership, patches in `dev/patches/`, lang files,
`node --check`, max one quick screenshot, NO long test runs, no git/deploy, write `NOTES/40-<agent>.md` ≤40 lines, reply 5-line summary).
Read also `dev/backlog/BACKLOG.md` (owner requests, all CONFIRMED now) and `dev/backlog/ref_item_detail.jpg` (item popup layout idea).
Survival + Story must keep working. Saves must migrate (never lose progress).

## 1. PORTRAIT ONLY
- Game is played with the phone UPRIGHT. Rotate overlay now asks to rotate to PORTRAIT (show it in landscape on phones; on desktop
  show the game as a centred 9:16 column, never the overlay). `screen.orientation.lock('portrait')` when possible.
- Gameplay: vertical shooter. Logical world width ≈ 200 (target), height = width × screen ratio (≈ 400-460). Player at the bottom third,
  enemies come from the top. Touch: floating joystick on the lower half (anywhere), dash + consumables + crew abilities as a row/arc at
  the bottom right, pause top right. HUD top: HP/shield/XP bar, Lv + sector, score centre, crystals + pause right, alert icons under.
- Every screen redesigned for 390×844 (also 360×780, 430×932; desktop = centred column max-width 480): stacked layouts, big touch targets,
  bottom tab bars, scroll lists.

## 2. HD PAINTED ART (replaces pixel art everywhere)
Source sheets: `dev/incoming_art/*.png` (owner made them with ChatGPT; see `dev/backlog/PROMPTS_*.md` / `PROMPT_*.txt` for the exact order of
items in each grid). Agent `art` slices them into individual transparent PNGs in `assets/hd/` (dark #0b0e14-ish background → alpha,
trimmed, padded square, max 256 px for items/ships/enemies, 512 for bosses, backgrounds 720×1280 webp/jpg q≈82, manga pages 720×1280,
character sheets → busts for dialog portraits) + `assets/hd/manifest.json` = `{ "<id>": {"file":"…","w":…,"h":…} }` using the SAME ids
the game uses today (ship_<id>, wpn_<id>, sec_<id>, icon_tur_<id>, icon_comp_<id>, gear ids (new, see §3), ore_<cat>, cons_<id>, chest_<r>,
chest_open_<r>, ci_<id>, en_<id>, boss_<id>, mboss_<id>, bg_<theme>, card_<id>, card_sp_<id>, frame_r<0-4>, cardframe_r<0-4>, ui icons,
world_<id>, mode_<id>, diff_<id>, logo, appicon, manga_1_<n>, crew_<id> (chibi), portrait_<crewId>_<neutral|angry|surprised>).
G sheets (menu/tab icons, control buttons, ability icons, projectiles, FX/pickups, top-down turrets/companions, UI kit) arrive later —
until then keep the existing pixel sprites for those ids (loader falls back: hd → old sprite).
- Engine draws HD sprites scaled to their logical size with smoothing ON (no more pixel scaling); canvas renders at device resolution.
  Ships ~28-32 logical px, enemies by size class, bosses ~110-130. Backgrounds: vertical scrolling of the bg image (loop by mirroring).
- UI uses the HD frames (`frame_r<n>`) for tiles and `cardframe_r<n>` for cards, HD icons, logo on loader/menu, appicon for PWA icons.
- Muted palette B stays for UI chrome; the new art itself is not re-tinted.

## 3. ITEMS REWORK (owner rules, confirmed)
- Gear categories: armor, gen (shield generator), core, boost — each has exactly 4 VARIANTS (from art):
  armor: titan, reactive, crystal, void · gen: bastion, prism, pulse, ward · core: fusion, quantum, star, voidr · boost: ion, after, warp, phase.
  Each variant has its own main stat focus + 5 bonus lines, one per rarity tier (line k active when the CATEGORY tier ≥ k), shown greyed
  with a lock in the tier colour until unlocked; detail popup like ref (rarity + name header, icon, "Nv x/150", main stat, 5 bonus lines,
  set block "Set <name> n/4 + bonus", buttons Unequip / Upgrade (ore cost) / Lock).
- LEVEL IS PER CATEGORY, not per item: upgrading with ore raises the level of ALL items of that category at once. Max level 150.
  Tier from level: 1-29 Common, 30-59 Rare, 60-89 Epic, 90-119 Legendary, 120-150 Ultra (the tier and frame colour of every item in the category follow it).
- Applies to ALL hangar categories: ships, weapons, secondary, turrets, companions, armor, gen, core, boost (+ crew items in story use crew ore).
- ORES: one ore per category: `ore_armor, ore_gen, ore_core, ore_boost, ore_weapon, ore_secondary, ore_turret, ore_companion, ore_ship, ore_crew`
  (art from 11_ores.png in that order). Ores drop in runs (enemies/elites/bosses, more on higher difficulty and sectors), from chests, daily,
  missions/achievements, story rewards. Upgrade cost = ore amount growing with level (+ small crystal cost); tune so level 30 ≈ a few days, 150
  = long-term (months). Crystals still buy items/chests.
- Owning items: you still unlock/buy/drop the variants (chests give variants + ores), equip one per slot; merge/sell of duplicates converts to
  ores (no more 3→1 merge for gear since level is per category — duplicates give ore of that category). Lock flag protects from sell.
- Migration: existing gear/ships/weapons… levels → category level = max owned level mapped proportionally (old 50 → new 150 scale), existing
  gear items → nearest variant of same slot, keep rarity look via category tier. Nothing lost; extra duplicates → ores.

## 4. NEW CARDS (20, art in 606/607)
Attack (E2b): homing missiles (exists: missile), orbit (exists), lifesteal (exists: vamp), `explosive`, `burn`, `freeze`, `poison`, `chain`, `split`,
`giant`. Survival/utility (E2c): `armor`, `shieldregen`, `dodge`, `dashcd`, `thorns`, `crystalbonus`, `xpboost`, `secondwind`, `dronehelper`, `overdrive`.
Each with rarity r, levels, effect implemented in engine. Base cards art: 608 (dmg, rate, speed, magnet, heal, shield, pierce, bounce, gun, crit,
missile, orbit, vamp). Special cards art 605 (chain, blackhole, shieldnova, phoenix, timewarp, overcharge, vampfield, frost) — implement them as
the special (Ultra/Legendary) cards now (they were art-only before).

## 5. STORY MANGA
`manga_1_1..9` (pages F1-F9) shown in the dialog player as full-screen pages before/along the dialogs: F1+F2 intro (before 1-1), F3 Nyra joins
(after 1-2), F4 before 1-5 boss, F5 Brakk joins (after 1-5), F6 Sable joins (after 1-8), F7 before 1-10, F8 boss fight start, F9 ending (after 1-10).
Speech balloons are empty in the art → overlay our dialog text on/near them is too fragile: show the page, then the dialog lines in the normal
dialog box with crew portraits (busts from character sheets). Tap to advance, skip.

## Ownership
| agent | files |
|---|---|
| art | `assets/hd/**`, `tools/art/hd_*.py`, `icons/*` (PWA icons from appicon), `dev/hd_preview/*` |
| engine | `js/engine/*.js` (render portrait + HD sprites + bg scroll, game, weapons, enemies, bosses, fx, input (touch layout, portrait), display), `js/story/engine.js`, `js/lang/engine.js` |
| data | `js/data.js`, `js/systems.js`, `js/save.js`, `js/story/data.js`, `js/story/sys.js`, `tools/balance/*`, `js/lang/data.js`, `js/lang/w33.js` |
| core | `index.html`, `css/style.css`, `js/ui/app.js`, `js/ui/hud.js`, `css/hud.css`, `manifest.webmanifest`, `js/lang/core.js`, `js/lang/hud.js` |
| hangar | `js/ui/hangar.js`, `css/hangar.css`, `js/ui/multishot.js`, `js/lang/hangar.js` |
| screens | `js/ui/menus.js`, `js/ui/settings.js`, `js/ui/overlays.js`, `js/ui/help.js`, `js/ui/modes.js`, `js/ui/automode.js`, `js/story/ui.js`, `css/menus.css`, `css/overlays.css`, `css/help.css`, `css/story.css`, `js/lang/{menus,overlays,help,storyui}.js` |
Shared helper contract (core provides in app.js): `UI.hd(id) → url|null`, `UI.img(id, cls)` prefers HD, `UI.frame(r, inner, opts)` uses
`frame_r<r>` HD frame; `NC.assets.get(id)` (engine) returns HD image when present. Data API (data provides): `NC.sys.catLevel(cat)`,
`NC.sys.catTier(cat)`, `NC.sys.upgradeCat(cat)` → {ok, lvl, cost}, `NC.sys.ores()` → {ore_armor: n,…}, `NC.sys.variant(cat,id)` defs with
`bonus:[{tier,stat,v,textKey}×5]`, `NC.sys.equipVariant(cat,id)`, `NC.sys.lockItem(uid)`, `NC.DATA.ORES`, `NC.DATA.GEAR_VARIANTS`.
