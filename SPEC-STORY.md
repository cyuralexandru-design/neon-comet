# NEON COMET — STORY MODE v1 (spec for parallel agents)

Project: `/home/claude/nc3/game/` (live v3.1.3). Read `SPEC-31.md` (style, palette B, components, i18n rules, ownership rules §0) — same rules apply.
Plain scripts, global `NC`, `'use strict'` IIFE, all text via `NC.t` (RO no diacritics + EN), offline, no build. Do NOT run long tests;
`node --check` + at most one quick headless look. No git/deploy. Write `NOTES/story-<agent>.md` (≤40 lines) when done.

## Concept
"ECOUL LUI VEGA" (EN "THE VEGA ECHO"). 300 years ago humanity got one signal from outside the galaxy — the Echo — then silence.
Pilot/captain **Kael Arin** finds a second piece of it in an old wreck: a map broken into 7 fragments hidden on 7 worlds. He gathers a crew of
"almost-humans" (80-90% human, each with a supernatural trait). Clues found during levels slowly reveal the twist (the Echo is a warning sent
by our own future civilisation; each crew member is the "echo" of a species destroyed by what is coming) — reveal only hints in chapter 1.
The player still FLIES THE SHIP (same shooter engine). The crew gives abilities: you take a team of up to 3 members into a level; each has
an ACTIVE ability (button with cooldown) and a PASSIVE bonus.

Crew (ids): `kael` (captain, red cyber-eye that sees the Echo; active: Echo Sight = time slows 50% for 3 s; passive +10% dash range),
`nyra` (engineer, skin glows with emotion; active: repair drones heal 25% over 4 s; passive +15% shield regen),
`brakk` (gunner, bone horns, stone plates, lava; active: Lava Barrage = heavy piercing volley 3 s; passive +10% damage),
`sable` (hacker clone with stolen memories; active: Hijack = the strongest enemy on screen fights for you 6 s; passive +10% crit),
`iko` (android child with a star's soul, halo; active: Star Pulse = pulls all pickups + stuns 1.5 s; passive +30% magnet),
`vesh` (last priest of a dead world, antennae, spectral wings; active: Spectral Ward = shield that reflects bullets 4 s; passive +10% max HP).
Crew unlock along chapter 1: kael (start), nyra (after level 2), brakk (after level 5), sable (after level 8); iko + vesh = chapter 2 (shown locked).
Crew sprites are NOT final: use the placeholder sprites `crew_<id>` (copy from `/home/claude/nc3/story/crew3/<name>_idle.png` frame 0, 2-frame
strips 40x34) — art agent registers them.

## Structure
- 7 chapters = 7 worlds: 1 `wreck` Ship Graveyard, 2 `crystal` Crystal Planet, 3 `gas` Gas Ocean, 4 `jungle` Biomech Jungle, 5 `hive` Insectoid
  Swarm, 6 `machine` Machine Empire, 7 `edge` Edge of the Universe. v1 ships chapter 1 fully playable; chapters 2-7 visible on the map as locked
  "coming soon".
- Chapter = 10 levels. Level = 3-5 WAVES (scripted enemy groups from data, not endless), level 5 ends with a mini-boss, level 10 with the world
  boss. Between waves short pause + "VAL 2/4" text. Level won when all waves cleared (+ boss dead). Lose = HP 0 (revive rules same as survival).
- Stars 1-3 per level: 1 = cleared, 2 = cleared with ≥50% HP, 3 = cleared with ≥80% HP and under the par time. Stars unlock chapter rewards
  (chests at 10/20/30 stars).
- Rewards: crystals + crew XP + sometimes crew items; first clear bonus.
- Story: before/after certain levels a dialog sequence (text boxes with speaker name + portrait sprite; manga panels come later — keep a
  `panel` image slot in the dialog data, empty for now). Skippable. Clues: some levels contain a "clue" pickup / reward that unlocks a short
  lore entry in a Clues journal.
- In-level: same cards/level-up system as survival (per-level run XP), same ship + hangar stats. Crew abilities appear as up to 3 extra
  round buttons (touch) / keys 1-2-3 / gamepad L1, R1, L2.

## Crew progression (separate inventory)
Each crew member: level 1-30 (XP from levels), 3 item slots: `cw` personal weapon, `imp` implant, `art` artifact. Crew items have rarity 0-4
(same 5 tiers/colours), level, merge 3→next rarity like gear. Items boost that member's ability (power/cooldown/duration) and give small ship
stats. Crew items drop from story levels and chapter chests.

## Data / API contracts
- `js/story/data.js` (agent data): `NC.STORY = { chapters:[{id, world, nameKey, levels:[{id:'1-1', waves:[[{en:'drone',n:6,pattern:'line',delay:0},...],...],
  boss?:{type:'mini'|'world', id}, par:90, dialogBefore?:'d_1_1a', dialogAfter?:..., clue?:'c1', reward:{cr, xp, item?}}]}], crew:{<id>:{nameKey,
  traitKey, activeKey, passiveKey, ability:{id, cd, dur, power}, passive:{stat, v}, unlock:'1-2'}}, items:[...crew item defs], dialogs:{id:[{who,
  textKey, panel?}]}, clues:{id:{titleKey, textKey}} }` + RO/EN texts in `js/lang/story.js`. Enemies use existing enemy ids (drone, dart, mine,
  hunter, gunner, splitter, charger, sentinel, wraith, carrier, bulwark, artillery) plus NEW chapter-1 ids from art/engine: `scav` (scavenger
  drone that steals pickups), `hulk` (derelict hull that drifts and splits into scrap), `ghost` (flickering ghost ship, phases in/out),
  `tether` (mine-layer that links mines with lasers); mini-boss `salvager`; world boss `graveking` (giant fused wreck).
- `js/story/sys.js` (agent data): save in the normal save object under `S.story = {prog:{'1-1':{stars,best,done}}, crew:{<id>:{lvl,xp,items:{cw,imp,art}}},
  team:['kael'], items:[{uid,id,r,lvl}], clues:{}, chestsClaimed:[]}` (create on load if missing, persist via existing NC.sys/NC.store path);
  API `NC.story.sys` = { progress(), levelState(id), unlocked(id), team(), setTeam(ids), crew(id), equipItem(cid,uid), unequip, mergeItems(uids),
  levelUpCrew, finishLevel(id,{hpFrac,time,won}) → {stars, rewards}, addClue, chestAvailable(n), claimChest(n), abilityStats(cid) → {cd,dur,power},
  passiveStats() → {dmg,crit,shdRegen,hp,magnet,dash} }.
- `js/story/engine.js` (agent engine): `NC.game.startStory(levelId)` runs the level on the existing engine (G.start with a `story` flag): wave
  spawner from data instead of endless spawner, wave text, boss at end, win/lose → `U.ui('storyEnd', {won, id, hpFrac, time})`; crew abilities
  `NC.game.useAbility(slot)` with cooldown state in `NC.hud.crew = [{id, cd01, active}]`; applies passives via `NC.story.sys.passiveStats()`.
  New enemy AIs `scav, hulk, ghost, tether`, bosses `salvager`, `graveking` (use existing boss framework, 3 HP segments for world boss).
  Engine agent may edit `js/engine/game.js`, `enemies.js`, `bosses.js` minimally (hooks) + owns `js/story/engine.js`.
- `js/story/ui.js` + `css/story.css` (agent ui): Mode screen: replace the "Coming soon" card by **STORY** (`mode_soon` art stays until new art;
  label STORY) → chapter map screen (7 worlds as nodes/cards, chapter 1 open, others locked) → level list of chapter (10 nodes with stars, lock
  states, boss icons) → pre-level: team picker (choose up to 3 unlocked crew) + start → dialog player (`UI.storyDialog(id, onDone)`) → level →
  result screen (stars animation, rewards, next level) . Crew screen (from map): crew list with portraits, level, trait, abilities, 3 item slots
  + crew inventory grid (rarity tiles via `UI.frame`, merge all, equip/unequip), Clues journal. In-run: ability buttons via HUD hook (add DOM
  buttons with cooldown ring inside `#touchUI`/HUD area without breaking hud.js — own small module), keys 1/2/3, gamepad L1/R1/L2 handled by
  engine agent via `NC.game.useAbility`. Same palette B look as hangar.
- Art (agent art): chapter-1 enemy sprites `en_scav`, `en_hulk`, `en_ghost`, `en_tether` (+ needed projectiles), `mboss_salvager`,
  `boss_graveking` (big, 3-phase menace), background `bg_wreck` (layers like other bg_*), world node icons `world_<id>` (7), crew item icons
  `ci_<id>` (~15: weapons/implants/artifacts), ability icons `ab_<crewId>` (6), clue icon `ui_clue`, star icons for stars rating
  `ui_star_on/off`; register `crew_<id>` placeholders from crew3. Pixel style = existing game art (art bible).

## Ownership
| agent | files |
|---|---|
| data (sonnet) | `js/story/data.js`, `js/story/sys.js`, `js/lang/story.js` |
| engine | `js/story/engine.js`, hooks in `js/engine/game.js`, `enemies.js`, `bosses.js` (minimal) |
| ui | `js/story/ui.js`, `css/story.css`, `js/ui/modes.js` (replace soon card), `js/lang/storyui.js` |
| art | `assets/sprites/*` (new ids only), `assets/manifest.json`, `js/engine/assets.js`, `tools/art/story_*.py` |
| integrator (me) | `index.html`, `sw.js` |
Scripts to add to index (integrator): `js/lang/story.js`, `js/lang/storyui.js` after other lang files; `js/story/data.js`, `js/story/sys.js` after
systems.js; `js/story/engine.js` after game.js; `js/story/ui.js` after modes.js; `css/story.css`.
