import type { GameData } from './gameData';

// The game data files hold the English names. The game text file of each language holds the same
// names under keys made from the id. A name with no key in that language keeps the English name.
export function localiseGameData(data: GameData, text: Record<string, string>): GameData {
  const named = (key: string, fallback: string) => text[key] ?? fallback;
  return {
    ...data,
    text,
    classes: data.classes.map((heroClass) => ({
      ...heroClass,
      displayName: named(`class.${heroClass.id}.name`, heroClass.displayName),
      roleDescription: named(`class.${heroClass.id}.role`, heroClass.roleDescription),
    })),
    advancements: data.advancements.map((advancement) => ({
      ...advancement,
      displayName: named(`class.${advancement.id}.name`, advancement.displayName),
      roleDescription: named(`class.${advancement.id}.role`, advancement.roleDescription),
    })),
    monsters: data.monsters.map((monster) => ({ ...monster, name: named(`monster.${monster.id}`, monster.name) })),
    dungeons: data.dungeons.map((dungeon) => ({ ...dungeon, name: named(`dungeon.${dungeon.id}`, dungeon.name) })),
    towns: data.towns.map((town) => ({ ...town, name: named(`town.${town.id}`, town.name), region: named(`town.${town.id}.region`, town.region) })),
    materials: data.materials.map((material) => ({
      ...material,
      name: named(`material.${material.id}`, material.name),
      craftedItemPrefix: material.craftedItemPrefix === undefined ? undefined : named(`material.${material.id}.prefix`, material.craftedItemPrefix),
    })),
    baseItems: data.baseItems.map((base) => ({ ...base, name: named(`base.${base.id}`, base.name) })),
    affixes: data.affixes.map((affix) => ({ ...affix, displayName: named(`affix.${affix.id}`, affix.displayName) })),
    buildings: data.buildings.map((building) => ({ ...building, label: building.label === null ? null : named(`building.${building.id}`, building.label) })),
    professions: Object.fromEntries(Object.entries(data.professions).map(([id, name]) => [id, named(`profession.${id}`, name)])),
    heroNames: data.heroNames.map((name) => named(`heroname.${name}`, name)),
  };
}
