import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_DATA_FOLDER } from '../config';
import type { Language } from '../i18n/language';
import { localiseGameData } from './localiseGameData';

export type Stats = Record<string, number>;
export type MonsterRank = string;

export interface HeroClass {
  id: string;
  unlockAfterDungeonId: string | null;
  displayName: string;
  roleDescription: string;
  attackKind: string;
  behavior: string;
  resourceId: string;
  primaryAttribute: string;
  // How far one hit swings from its base damage: 0.1 means 90-110%.
  damageVarianceFraction: number;
  recoveryRate: number;
  weaponTypes: string[];
  offHandTypes: string[];
  armourWeights: string[];
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
  spriteKey: string;
  // A boss has fixedStats and no factors. Other monsters follow the level curve times the factors.
  hpFactor?: number;
  attackFactor?: number;
  defenceFactor?: number;
  fixedStats?: { hp: number; attack: number; defence: number; resistance: number };
  // The share of the Defence of a hero that the monster ignores. No monster uses it yet.
  armourPenetration?: number;
  spellIds?: string[];
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
  minimumPartySize: number;
  maxPartySize: number;
  minimumHeroLevel: number;
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
  label: string | null;
  panelId: string | null;
  opens?: string;
  style: string;
}

export interface Advancement {
  id: string;
  baseClassId: string;
  promotesFrom: string;
  requiredLevel: number;
  displayName: string;
  roleDescription: string;
}

export interface CastleSpot {
  id: string;
  screen: number;
  kind: 'person' | 'landmark';
  tales: number;
}

export interface Material {
  id: string;
  name: string;
  tier: number;
  category: string;
  sellValueCopper: number;
  craftedItemPrefix?: string;
  setBonus?: { stat: string; value: number };
  setCraftLevelOffset?: number;
  setBodyArmourCraftLevelOffset?: number;
  width: number;
  height: number;
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
  // How many units of the main material one craft needs.
  mainIngredientQuantity: number;
  baseStats: Stats;
  craftLevelOffset: number;
}

export interface SpellStatusEffect {
  status: string;
  strength: number;
  durationSeconds: number;
  // Evade only: how many hits the unit dodges.
  charges?: number;
}

export type SpellEffect =
  | { kind: 'damage'; damageKind: string; target: string; hits: number; power: number; defencePower?: number; magicPower?: number; inflicts?: SpellStatusEffect; alsoOnSelf?: SpellStatusEffect }
  | { kind: 'drain'; damageKind: string; target: string; hits: number; power: number; healFraction: number }
  | { kind: 'heal'; target: string; power: number }
  | { kind: 'shield'; target: string; resourceFraction: number; absorbPerResourcePoint: number; durationSeconds: number }
  | { kind: 'status'; status: string; target: string; strength: number; durationSeconds: number; charges?: number; alsoOnSelf?: SpellStatusEffect };

export interface Spell {
  id: string;
  classId: string;
  unlockLevel: number;
  isUltimate: boolean;
  cooldownSeconds: number;
  resourceCost: number;
  effect: SpellEffect;
  // Rank 2 and 3 spells name the rank 1 spell of their family. A higher rank replaces the lower rank in the same slot.
  familyId?: string;
  rank?: number;
  // A reserved spell is in the data, but the game does not load it. A class specialisation reuses it later.
  reservedFor?: string;
}

// What a spell looks like and sounds like (data/spell-visuals.json and data/audio/sound-effects.json).
export interface SpellLook {
  theme: string;
  icon?: string;
  cast?: string;
  projectile?: string;
  impact?: string;
  buff?: string;
  debuff?: string;
}

export type SpellSoundSet = Partial<Record<'cast' | 'projectile' | 'impact' | 'buff' | 'debuff', string>>;

export interface MonsterSpell {
  id: string;
  isUltimate: boolean;
  cooldownSeconds: number;
  resourceCost: number;
  effect: SpellEffect;
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
  advancements: Advancement[];
  castleSpots: CastleSpot[];
  materials: Material[];
  baseItems: BaseItem[];
  affixes: Affix[];
  spells: Spell[];
  monsterSpells: MonsterSpell[];
  spellLooks: Record<string, SpellLook>;
  spellSounds: Record<string, SpellSoundSet>;
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
  const balanceFileNames = ['backpack', 'battle', 'crafting', 'dungeon-run', 'economy', 'hero-sheet', 'items', 'mill', 'monster-scaling', 'progression', 'recovery', 'resources', 'spells'];
  return Object.fromEntries(balanceFileNames.map((name) => [name, readJson<BalanceFile>(`balance/${name}.json`)]));
}

export function loadGameData(language: Language): GameData {
  if (!existsSync(GAME_DATA_FOLDER)) {
    throw new Error(`No game data in ${GAME_DATA_FOLDER}. Run "npm run sync" first.`);
  }
  const townFile = readJson<{ startingTownId: string; towns: Town[] }>('towns.json');
  const hasSource = existsSync(join(GAME_DATA_FOLDER, 'source.json'));
  const englishData: GameData = {
    classes: readJson('classes.json'),
    monsters: readJson('monsters.json'),
    dungeons: readJson('dungeons.json'),
    towns: townFile.towns,
    startingTownId: townFile.startingTownId,
    buildings: readJson('buildings.json'),
    advancements: readJson('advancements.json'),
    castleSpots: readJson<{ spots: CastleSpot[] }>('castle.json').spots,
    materials: readJson('materials.json'),
    baseItems: readJson('base-items.json'),
    affixes: readJson('affixes.json'),
    spells: readJson('spells.json'),
    monsterSpells: readJson('monster-spells.json'),
    spellLooks: readJson<{ spells: Record<string, SpellLook> }>('spell-visuals.json').spells,
    spellSounds: readJson<{ spellSounds: Record<string, SpellSoundSet> }>('audio/sound-effects.json').spellSounds,
    professions: readJson('professions.json'),
    heroNames: readJson('hero-names.json'),
    balance: readBalanceFiles(),
    text: readJson('i18n/en.json'),
    source: hasSource ? readJson('source.json') : null,
  };
  return language === 'en' ? englishData : localiseGameData(englishData, readJson<Record<string, string>>(`i18n/${language}.json`));
}
