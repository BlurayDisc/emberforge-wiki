import type { Advancement, BaseItem, Dungeon, GameData, HeroClass, Material, Monster, Spell, Town } from './gameData';
import { balanceNumber, balanceValue } from './balance';

export interface RecipeIngredient {
  material: Material;
  quantity: number;
}

export interface Recipe {
  base: BaseItem;
  tier: number;
  setMaterial: Material | null;
  itemName: string;
  requiredCraftLevel: number;
  // The hero level that equips the item.
  itemLevel: number;
  craftFeeCopper: number;
  craftSeconds: number;
  ingredients: RecipeIngredient[];
}

export type MonsterRole = 'normal' | 'rare' | 'boss';

export interface MonsterAppearance {
  dungeon: Dungeon;
  role: MonsterRole;
}

function mapById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

export class GameIndex {
  readonly classesById: Map<string, HeroClass>;
  readonly monstersById: Map<string, Monster>;
  readonly dungeonsById: Map<string, Dungeon>;
  readonly townsById: Map<string, Town>;
  readonly materialsById: Map<string, Material>;
  readonly baseItemsById: Map<string, BaseItem>;

  constructor(readonly data: GameData) {
    this.classesById = mapById(data.classes);
    this.monstersById = mapById(data.monsters);
    this.dungeonsById = mapById(data.dungeons);
    this.townsById = mapById(data.towns);
    this.materialsById = mapById(data.materials);
    this.baseItemsById = mapById(data.baseItems);
  }

  monster(id: string): Monster {
    return this.require(this.monstersById, id, 'monster');
  }

  material(id: string): Material {
    return this.require(this.materialsById, id, 'material');
  }

  town(id: string): Town {
    return this.require(this.townsById, id, 'town');
  }

  dungeon(id: string): Dungeon {
    return this.require(this.dungeonsById, id, 'dungeon');
  }

  private require<T>(items: Map<string, T>, id: string, kind: string): T {
    const item = items.get(id);
    if (!item) throw new Error(`Unknown ${kind} id "${id}" in game data.`);
    return item;
  }

  dungeonMonsterIds(dungeon: Dungeon): string[] {
    const extraMonsterIds = [dungeon.rareMonsterId, dungeon.bossMonsterId].filter((id): id is string => id !== null);
    return [...dungeon.monsterIds, ...extraMonsterIds];
  }

  appearancesOfMonster(monsterId: string): MonsterAppearance[] {
    return this.data.dungeons.flatMap((dungeon): MonsterAppearance[] => {
      if (dungeon.monsterIds.includes(monsterId)) return [{ dungeon, role: 'normal' }];
      if (dungeon.rareMonsterId === monsterId) return [{ dungeon, role: 'rare' }];
      if (dungeon.bossMonsterId === monsterId) return [{ dungeon, role: 'boss' }];
      return [];
    });
  }

  dungeonsOfTown(townId: string): Dungeon[] {
    return this.data.dungeons.filter((dungeon) => dungeon.townId === townId).sort((a, b) => a.level - b.level);
  }

  monstersDroppingMaterial(materialId: string): Monster[] {
    return this.data.monsters.filter((monster) => monster.drops.some((drop) => drop.materialId === materialId));
  }

  // Same rule as classIdsThatCanUse in the game: hands check the gear type, armour checks the weight, the rest is for everyone.
  canClassUse(heroClass: HeroClass, base: BaseItem): boolean {
    if (base.slot === 'mainHand' && !heroClass.weaponTypes.includes(base.gearType)) return false;
    if (base.slot === 'offHand' && !heroClass.offHandTypes.includes(base.gearType)) return false;
    return base.armourWeight === null || heroClass.armourWeights.includes(base.armourWeight);
  }

  itemsAllowedForClass(heroClass: HeroClass): BaseItem[] {
    return this.data.baseItems.filter((base) => this.canClassUse(heroClass, base));
  }

  classesAllowedForItem(base: BaseItem): HeroClass[] {
    return this.data.classes.filter((heroClass) => this.canClassUse(heroClass, base));
  }

  // The material that tints the item picture: the lowest tier material of the main category.
  iconMaterialOfItem(base: BaseItem): Material | undefined {
    return this.data.materials.filter((material) => material.category === base.mainCategory).sort((a, b) => a.tier - b.tier)[0];
  }

  advancementsOfClass(classId: string): Advancement[] {
    return this.data.advancements.filter((advancement) => advancement.baseClassId === classId);
  }

  // A material is a crafting material when it is the main material of an item type, or it gives a set bonus.
  isCraftingMaterial(material: Material): boolean {
    return material.setBonus !== undefined || this.data.baseItems.some((base) => base.mainCategory === material.category);
  }

  // The spells that the game loads. A reserved spell waits for a class specialisation.
  loadedSpells(): Spell[] {
    return this.data.spells.filter((spell) => spell.reservedFor === undefined);
  }

  spellsOfClass(classId: string): Spell[] {
    return this.loadedSpells().filter((spell) => spell.classId === classId).sort((a, b) => a.unlockLevel - b.unlockLevel);
  }

  setMaterialsOfTier(tier: number): Material[] {
    return this.data.materials.filter((material) => material.tier === tier && material.setBonus !== undefined);
  }

  tiers(): number[] {
    return [...new Set(this.data.materials.map((material) => material.tier))].sort((a, b) => a - b);
  }

  townOfTier(tier: number): Town | undefined {
    return this.data.towns[tier - 1];
  }

  // Mirrors listRecipes and createRecipe in the game: a basic recipe needs the main material of the tier.
  // Armour pieces also get one set recipe for each set material of the tier.
  recipesOfTier(tier: number): Recipe[] {
    const d = this.data;
    const levelsPerBracket = balanceNumber(d, 'items', 'levelsPerBracket');
    const largeItemCellThreshold = balanceNumber(d, 'items', 'largeItemCellThreshold');
    const setMaterialSmallItem = balanceNumber(d, 'items', 'setMaterialSmallItem');
    const setMaterialLargeItem = balanceNumber(d, 'items', 'setMaterialLargeItem');
    const setRecipeSlots = balanceValue<string[]>(d, 'items', 'setRecipeSlots');
    const craftSecondsBase = balanceNumber(d, 'crafting', 'craftSecondsBase');
    const craftSecondsPerLevel = balanceNumber(d, 'crafting', 'craftSecondsPerRequiredLevel');
    const craftFeeBase = balanceNumber(d, 'crafting', 'craftFeeBaseCopper');
    const craftFeePerLevel = balanceNumber(d, 'crafting', 'craftFeePerRequiredLevelCopper');
    const setMaterials = this.setMaterialsOfTier(tier);
    const craftSecondsReferenceMaterialCount = balanceNumber(d, 'crafting', 'craftSecondsReferenceMaterialCount');
    const craftSecondsFactorPerMaterial = balanceNumber(d, 'crafting', 'craftSecondsFactorPerMaterial');
    const firstSetBaseCraftLevelOffset = balanceNumber(d, 'items', 'setRecipeFirstBaseCraftLevelOffset');

    return d.baseItems.flatMap((base): Recipe[] => {
      const main = d.materials.find((material) => material.tier === tier && material.category === base.mainCategory);
      if (!main) return [];
      const cells = base.width * base.height;
      // Same rule as listRecipes in the game: armour of every weight has set recipes. A weapon or off-hand item has them only when it does not open at the first crafter level.
      const canMakeSetPieces = setRecipeSlots.includes(base.slot) && (base.armourWeight !== null || base.craftLevelOffset >= firstSetBaseCraftLevelOffset);
      const variants = [null, ...(canMakeSetPieces ? setMaterials : [])];
      return variants.map((setMaterial): Recipe => {
        // Every set recipe of a base item opens with its basic recipe.
        const requiredCraftLevel = (tier - 1) * levelsPerBracket + base.craftLevelOffset;
        const namingMaterial = setMaterial ?? main;
        return {
          base,
          tier,
          setMaterial,
          itemName: `${namingMaterial.craftedItemPrefix ?? namingMaterial.name}${d.text['format.nameJoiner'] ?? ' '}${base.name}`,
          requiredCraftLevel,
          itemLevel: Math.min(requiredCraftLevel, tier * levelsPerBracket),
          // Same formula as craftFeeCopper in the game.
          craftFeeCopper: Math.round(craftFeeBase + craftFeePerLevel * requiredCraftLevel),
          // Same formula as craftSeconds in the game: each main material above or below the reference count changes the time by a fixed step.
          craftSeconds: Math.max(1, Math.round((craftSecondsBase + craftSecondsPerLevel * requiredCraftLevel) * (1 + craftSecondsFactorPerMaterial * (base.mainIngredientQuantity - craftSecondsReferenceMaterialCount)))),
          ingredients: [
            { material: main, quantity: base.mainIngredientQuantity },
            ...(setMaterial ? [{ material: setMaterial, quantity: cells >= largeItemCellThreshold ? setMaterialLargeItem : setMaterialSmallItem }] : []),
          ],
        };
      });
    });
  }

  allRecipes(): Recipe[] {
    return this.tiers().flatMap((tier) => this.recipesOfTier(tier));
  }
}
