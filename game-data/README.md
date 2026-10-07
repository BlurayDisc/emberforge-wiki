# Game data

All game data lives in these JSON files. The game loads them through `src/content/`. A wiki tool can read them directly. Run `npm run validate` after any edit.

| File | Content |
|---|---|
| `towns.json` | `startingTownId` and the 10 towns (one per bracket of 10 levels) |
| `workshop-sections.json` | The workshop sections (Weapons, Armour) and the crafters in each. A crafter in no section is hidden (jewelcrafting, until a later unlock) |
| `buildings.json` | Town buildings: label, panel to open, art style, position on the 480x270 stage |
| `dungeons.json` | Dungeons: town, level, monster ids, rare monster id, boss id, `maxPartySize` (heroes allowed in one run: always 1) |
| `monsters.json` | Monsters: rank, sprite, drop table, and the stats. A normal or rare monster follows the level curve (`balance/monster-scaling.json`) times its `statFactor`, which lifts HP, damage, armour and resistance together. A boss has explicit `flatStats` (hp, damage, armour, resistance, attackSeconds) and no `statFactor`. |
| `materials.json` | Materials: tier, category, sell value, crafted item name prefix |
| `base-items.json` | Item bases: slot, gear type, size, profession, ingredient categories, base stats |
| `balance/hero-sheet.json` | The size of the attribute bars on the hero screen |
| `balance/resources.json` | The class resources (mana, stamina, hatred, rage): pool size, start share, regeneration and gain from hits |
| `professions.json` | Profession ids and display names |
| `affixes.json` | Item prefixes and suffixes: stat and value range |
| `classes.json` | Hero classes: stats, growth per level, primary attribute (`primaryAttribute`), resource (`resourceId`), allowed gear, and the dungeon to clear before the class can be hired (`unlockAfterDungeonId`, null = open at the start) |
| `spells.json` | Hero spells. A spell with `reservedFor: "specialisation"` stays in the file, but the game does not load it: a class specialisation reuses it later. Validation still checks it. |
| `advancements.json` | Promotion classes. Each base class has 2 branches (level 20) and each branch has 1 master class (level 50). Data only: the game has no promotion command yet. |
| `hero-names.json` | Names for new heroes |
| `hero-appearance.json` | Skin, hair and eye colors, and the colors of each class. A hero name picks its look, for the portrait and the battle sprite. |
| `audio/music.json` | Music tracks (town, battle, boss): tempo and note strings for each voice |
| `audio/sound-effects.json` | Sound recipes (layers of tones and noise) and which sound each class, monster and armour type uses |
| `i18n/en.json`, `i18n/zh.json` | All player text and content names, one flat key per text. `languages.json` lists the languages. |
| `balance/*.json` | Numbers: battle, progression (XP), economy (money, hiring, buying), crafting levels and times, hero recovery, sale times, the Mill, dungeon runs, monster scaling, backpack, item generation |

Rules:
- Ids are stable strings. Other files refer to them.
- A recipe uses materials of one tier only. Recipes are not stored. They come from `base-items.json` and `materials.json`: each base item needs one main and one second material category of the same tier.
- Every key in `i18n/en.json` must exist in every other language file. Content names in `en.json` must match the data files.
- Do not use em dashes in these files.
