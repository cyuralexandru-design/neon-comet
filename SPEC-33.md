# NEON COMET 3.3 — new weapons + weapon skills + secondary weapons + rarity-by-level (spec for parallel agents)

Project `/home/claude/nc3/game/` (live v3.2.0). Same rules as `SPEC-31.md` §0 (ownership, patches in dev/patches, i18n lang files, palette B,
no long tests, no git/deploy, NOTES file at the end). Survival + Story must keep working.

## A. 6 new primary weapons (total 11)
Existing: laser, plasma, flame, missile, rail. New ids (base rarity r in brackets = starting tier, see C):
1. `blaster` [0] — fast short red Star-Wars-like bolts in bursts of 3 (art exists: wpn_blaster, proj_blaster, proj_blaster_evo, card_evo_blaster).
2. `shotgun` "Scatter cannon" [1] — 5-7 pellet cone, short range, high burst.
3. `arc` "Arc emitter" [1] — lightning that chains to 3 nearby enemies.
4. `wave` "Pulse wave" [2] — expanding crescent wave that pierces everything, slow.
5. `drill` "Gravity lance" [3] — continuous beam that ramps damage the longer it stays on one target.
6. `swarmer` "Nanite swarm" [3] — tiny homing nanites that orbit then dive at enemies.
Each has price, dmg/rate/speed etc. balanced against existing weapons (similar DPS per price tier), an evolution (`evo`) like existing weapons,
multishot x2/x3 support (js/ui/multishot.js adds guns), cards evo_<id>.

## B. Weapon SKILL (special effect) — every primary weapon (all 11) gets one automatic skill that triggers every N seconds or every N shots,
shown in hangar detail ("Abilitate: ...") with numbers, scaling with weapon level:
laser: Overcharge — every 8 s a thick piercing beam 1 s · plasma: Singularity — every 10th shot leaves a mini black hole pulling enemies 2 s ·
flame: Firestorm — every 9 s a fire ring around the ship · missile: Barrage — every 7 s 6 missiles at once · rail: Execution — shots instantly
kill non-boss enemies under 15% HP · blaster: Rapid burst — every 6 s fire rate x3 for 2 s · shotgun: Knockback blast — every 8 s a point-blank
blast pushing enemies away · arc: Storm — every 9 s lightning strikes 6 random enemies · wave: Echo — every 3rd wave splits in 3 · drill:
Overheat — after 2 s on the same target explodes it · swarmer: Hive — every 10 s releases 10 extra nanites.
Data: `D.WEAPONS[i].skill = {id, every (s) | everyShots, power, dur, ...}` + i18n `wpn.<id>.skill.name/desc` with `{n}` placeholders.

## C. Rarity by level (owner rule): items in the hangar (ships, weapons, turrets, companions, secondary weapons, gear) are NOT capped by their
base rarity. Base rarity = starting tier. Leveling up raises the tier: tier = max(baseR, tierFromLevel(lvl)), with `tierFromLevel`:
lvl 1-9 → 0 Common, 10-19 → 1 Rare, 20-29 → 2 Epic, 30-39 → 3 Legendary, 40-50 → 4 Ultra. Max level 50 for everything (ships, weapons,
turrets, companions, secondaries, gear). An item that starts Epic starts at level 20 equivalent power? NO — it starts at level 1 but its tier
never drops below its base. Tier gives a stat multiplier step (+15% per tier above base) and the tile frame/band colour follows the CURRENT tier.
Upgrade costs scale with level (keep economy sane — see NOTES/31-data.md); show "Nv 23 · Epic → Legendary at Nv 30" in detail.
Gear merge (3 same slot + same rarity) keeps working using the current tier. Existing saves: levels kept, tiers recomputed.
API: `NC.sys.tierOf(kind, id|item) → 0..4` used by all UI (`UI.frame` rarity), `NC.sys.maxLevel(kind) = 50`.

## D. Secondary weapons (new hangar category + equip slot `secondary`)
Auto-fire on their own cooldown alongside the primary. 6 secondaries (base r): `homing` Seeker pods [0] (2 homing micro-missiles / 2 s),
`mines` Proximity mines [0] (drops mine behind ship / 3 s), `tesla` Tesla coil [1] (zaps nearest enemy / 1.2 s), `blade` Orbiting blades [2]
(2 blades orbit), `nova` Shock nova [3] (radial pulse / 6 s), `drone` Gunship drone [3] (a drone that fires lasers). Buy/equip/upgrade in
hangar like turrets, level 1-50 with tier rule C, counted in power/DPS. Save under `S.secondary = {eq, lv:{}}` (default none, created on load).
Engine: `R.sec` like `R.tur`. Hangar: new icon tab "Secundare/Secondary" + an equipped slot on the ship panel (left column, under companion;
move the empty propulsor box if space is needed — keep the approved layout clean).

## Ownership
| agent | files |
|---|---|
| data (data + systems + hangar UI) | `js/data.js`, `js/systems.js`, `js/save.js`, `js/ui/hangar.js`, `css/hangar.css`, `js/ui/multishot.js`, `js/lang/w33.js` (new, all texts of A-D) |
| engine (weapons, skills, secondaries in game) | `js/engine/weapons.js`, `js/engine/game.js`, `js/engine/render.js`, `js/engine/fx.js` |
| art | new sprites `assets/sprites/*`, `assets/manifest.json`, `js/engine/assets.js`, `tools/art/w33_*.py` |
Art ids: weapons `wpn_<id>` 24x24 for shotgun, arc, wave, drill, swarmer (blaster exists); projectiles `proj_<id>` + `proj_<id>_evo`
(arc/drill are beams: provide a beam segment tile + impact spark), `card_evo_<id>`; secondaries `sec_<id>` icon 24x24 + in-game sprites
(`sec_homing_proj`, `sec_mine`, `sec_blade`, `sec_drone` 16x16, tesla/nova drawn as FX); skill FX strips `fx_skill_<weapon>` where useful;
tab icon `ui_tab_secondary`.
