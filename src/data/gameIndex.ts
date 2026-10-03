import type { BaseItem, Dungeon, GameData, HeroClass, Material, Monster, Town } from './gameData';
import { balanceNumber } from './balance';

export interface RecipeIngredient {
  material: Material;
  quantity: number;
}

export interface Recipe {
  base: BaseItem;
  tier: number;
  itemName: string;
  requiredCraftLevel: number;
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

  itemsAllowedForClass(heroClass: HeroClass): BaseItem[] {
    return this.data.baseItems.filter((base) => {
      if (base.gearType === 'armour') return base.armourWeight === heroClass.armourWeight;
      return heroClass.weaponTypes.includes(base.gearType) || heroClass.offHandTypes.includes(base.gearType);
    });
  }

  classesAllowedForItem(base: BaseItem): HeroClass[] {
    return this.data.classes.filter((heroClass) => this.itemsAllowedForClass(heroClass).includes(base));
  }

  tiers(): number[] {
    return [...new Set(this.data.materials.map((material) => material.tier))].sort((a, b) => a - b);
  }

  townOfTier(tier: number): Town | undefined {
    return this.data.towns[tier - 1];
  }

  // Mirrors createRecipe in the game: a recipe exists only when the tier has both materials.
  recipesOfTier(tier: number): Recipe[] {
    const d = this.data;
    const levelsPerBracket = balanceNumber(d, 'items', 'levelsPerBracket');
    const cellsPerMainUnit = balanceNumber(d, 'items', 'mainIngredientCellsPerUnit');
    const largeItemCellThreshold = balanceNumber(d, 'items', 'largeItemCellThreshold');
    const smallItemSecondary = balanceNumber(d, 'items', 'secondaryIngredientSmallItem');
    const largeItemSecondary = balanceNumber(d, 'items', 'secondaryIngredientLargeItem');
    const craftSecondsBase = balanceNumber(d, 'crafting', 'craftSecondsBase');
    const craftSecondsPerLevel = balanceNumber(d, 'crafting', 'craftSecondsPerRequiredLevel');
    const materialOf = (category: string) => d.materials.find((m) => m.tier === tier && m.category === category);

    return d.baseItems.flatMap((base): Recipe[] => {
      const main = materialOf(base.mainCategory);
      const secondary = materialOf(base.secondaryCategory);
      if (!main || !secondary) return [];
      const cells = base.width * base.height;
      const requiredCraftLevel = (tier - 1) * levelsPerBracket + base.craftLevelOffset;
      return [{
        base,
        tier,
        itemName: `${main.craftedItemPrefix ?? main.name} ${base.name}`,
        requiredCraftLevel,
        craftSeconds: Math.round(craftSecondsBase + craftSecondsPerLevel * requiredCraftLevel),
        ingredients: [
          { material: main, quantity: Math.max(1, Math.ceil(cells / cellsPerMainUnit)) },
          { material: secondary, quantity: cells >= largeItemCellThreshold ? largeItemSecondary : smallItemSecondary },
        ],
      }];
    });
  }

  allRecipes(): Recipe[] {
    return this.tiers().flatMap((tier) => this.recipesOfTier(tier));
  }
}
