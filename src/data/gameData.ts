import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_DATA_FOLDER } from '../config';

export type Stats = Record<string, number>;
export type MonsterRank = string;

export interface HeroClass {
  id: string;
  displayName: string;
  roleDescription: string;
  attackKind: string;
  behavior: string;
  recoveryRate: number;
  weaponTypes: string[];
  offHandTypes: string[];
  armourWeight: string;
  baseStats: Stats;
  growthPerLevel: Stats;
}

export interface MonsterDrop {
  materialId: string;
  chance: number;
  minQuantity: number;
  maxQuantity: number;
}

export interface Monster {
  id: string;
  name: string;
  rank: MonsterRank;
  hpFactor: number;
  attackFactor: number;
  defenceFactor: number;
  speed: number;
  drops: MonsterDrop[];
}

export interface Dungeon {
  id: string;
  name: string;
  townId: string;
  level: number;
  monsterIds: string[];
  rareMonsterId: string | null;
  bossMonsterId: string | null;
  maxPartySize: number;
  recommendedMinLevel: number;
  recommendedMaxLevel: number;
  unlockAfter: string | null;
}

export interface Town {
  id: string;
  name: string;
  region: string;
  biome: string;
  firstLevel: number;
  lastLevel: number;
}

export interface Building {
  id: string;
  label: string;
}

export interface Material {
  id: string;
  name: string;
  tier: number;
  category: string;
  sellValueCopper: number;
  craftedItemPrefix?: string;
}

export interface BaseItem {
  id: string;
  name: string;
  slot: string;
  gearType: string;
  armourWeight: string | null;
  width: number;
  height: number;
  profession: string;
  mainCategory: string;
  secondaryCategory: string;
  baseStats: Stats;
  craftLevelOffset: number;
}

export interface Affix {
  id: string;
  kind: string;
  displayName: string;
  stat: string;
  minimumValue: number;
  maximumValue: number;
}

export interface GameSnapshotSource {
  commit: string;
  commitDate: string;
  hasUncommittedDataChanges: boolean;
}

// Balance files are open-ended number bags, so new numbers show up without a code change.
export type BalanceFile = Record<string, unknown>;

export interface GameData {
  classes: HeroClass[];
  monsters: Monster[];
  dungeons: Dungeon[];
  towns: Town[];
  startingTownId: string;
  buildings: Building[];
  materials: Material[];
  baseItems: BaseItem[];
  affixes: Affix[];
  professions: Record<string, string>;
  heroNames: string[];
  balance: Record<string, BalanceFile>;
  text: Record<string, string>;
  source: GameSnapshotSource | null;
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(GAME_DATA_FOLDER, relativePath), 'utf8')) as T;
}

function readBalanceFiles(): Record<string, BalanceFile> {
  const balanceFileNames = ['backpack', 'battle', 'crafting', 'dungeon-run', 'economy', 'items', 'monster-scaling', 'progression', 'recovery'];
  return Object.fromEntries(balanceFileNames.map((name) => [name, readJson<BalanceFile>(`balance/${name}.json`)]));
}

export function loadGameData(): GameData {
  if (!existsSync(GAME_DATA_FOLDER)) {
    throw new Error(`No game data in ${GAME_DATA_FOLDER}. Run "npm run sync" first.`);
  }
  const townFile = readJson<{ startingTownId: string; towns: Town[] }>('towns.json');
  const hasSource = existsSync(join(GAME_DATA_FOLDER, 'source.json'));
  return {
    classes: readJson('classes.json'),
    monsters: readJson('monsters.json'),
    dungeons: readJson('dungeons.json'),
    towns: townFile.towns,
    startingTownId: townFile.startingTownId,
    buildings: readJson('buildings.json'),
    materials: readJson('materials.json'),
    baseItems: readJson('base-items.json'),
    affixes: readJson('affixes.json'),
    professions: readJson('professions.json'),
    heroNames: readJson('hero-names.json'),
    balance: readBalanceFiles(),
    text: readJson('i18n/en.json'),
    source: hasSource ? readJson('source.json') : null,
  };
}
