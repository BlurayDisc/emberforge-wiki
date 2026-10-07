import { balanceNumber, balanceValue } from './balance';
import type { BaseItem, GameData, HeroClass, Monster } from './gameData';

export const ATTRIBUTE_IDS = ['strength', 'agility', 'intelligence'] as const;
export type AttributeId = (typeof ATTRIBUTE_IDS)[number];

// Gear stats that are percent points, not flat numbers (3 means +3%).
export const PERCENT_STAT_IDS = ['attackSpeed', 'criticalChance', 'criticalDamage', 'lifeSteal', 'movementSpeed'];

export interface HeroLevelStats {
  hp: number;
  damage: number;
  strength: number;
  agility: number;
  intelligence: number;
  defence: number;
  resistance: number;
  attackSeconds: number;
  criticalChance: number;
}

// Copied from attributesAtLevel, statsFromAttributes, computeHeroSheet and attackSecondsOf in the game (a hero without gear).
export function heroStatsAtLevel(data: GameData, heroClass: HeroClass, level: number): HeroLevelStats {
  const attribute = (id: AttributeId) => Math.round(heroClass.attributes[id].start + heroClass.attributes[id].gainPerLevel * (level - 1));
  const strength = attribute('strength');
  const agility = attribute('agility');
  const intelligence = attribute('intelligence');
  const primaryAttribute = { strength, agility, intelligence }[heroClass.primaryAttribute as AttributeId];
  const attackSpeedBonus = agility * balanceNumber(data, 'hero-stats', 'attackSpeedBonusPerAgility');
  const attackSpeedFactor = Math.max(balanceNumber(data, 'battle', 'minimumAttackSpeedFactor'), 1 + attackSpeedBonus);
  return {
    hp: Math.round(heroClass.baseHp + strength * balanceNumber(data, 'hero-stats', 'hpPerStrength')),
    damage: Math.round(heroClass.baseDamage + primaryAttribute),
    strength,
    agility,
    intelligence,
    defence: heroClass.baseDefence,
    resistance: Math.round(heroClass.baseResistance + intelligence * balanceNumber(data, 'hero-stats', 'resistancePerIntelligence')),
    attackSeconds: Math.round((heroClass.baseAttackSeconds / attackSpeedFactor) * 100) / 100,
    criticalChance: Math.round((balanceNumber(data, 'battle', 'baseCriticalChance') + heroClass.criticalChanceBonus) * 1000) / 10,
  };
}

interface MonsterAnchor { level: number; hp: number; damage: number; armour: number; resistance: number }
export interface MonsterLevelStats { hp: number; damage: number; armour: number; resistance: number; attackSeconds: number }

// Copied from interpolateLinearCurve in the game: straight lines between the anchors, and the nearest line goes on outside them.
function curveAtLevel(anchors: MonsterAnchor[], stat: 'hp' | 'damage' | 'armour' | 'resistance', level: number): number {
  const lastSegmentStart = Math.max(0, anchors.length - 2);
  const foundSegmentStart = anchors.findIndex((_anchor, index) => index < anchors.length - 1 && level <= anchors[index + 1]!.level);
  const segmentStart = foundSegmentStart === -1 ? lastSegmentStart : foundSegmentStart;
  const from = anchors[segmentStart]!;
  const to = anchors[segmentStart + 1]!;
  return from[stat] + ((to[stat] - from[stat]) / (to.level - from.level)) * (level - from.level);
}

// Copied from createMonsterUnit in the game. A boss uses its flat stats. Other monsters use the curve times statFactor.
export function monsterStatsAtLevel(data: GameData, monster: Monster, level: number): MonsterLevelStats {
  if (monster.flatStats) {
    const { hp, damage, armour, resistance, attackSeconds } = monster.flatStats;
    return { hp: Math.round(hp), damage: Math.round(damage), armour: Math.round(armour), resistance: Math.round(resistance), attackSeconds };
  }
  const anchors = balanceValue<MonsterAnchor[]>(data, 'monster-scaling', 'anchors');
  const factor = monster.statFactor ?? 1;
  const lifted = (stat: 'hp' | 'damage' | 'armour' | 'resistance') => Math.round(Math.max(0, curveAtLevel(anchors, stat, level)) * factor);
  return {
    hp: lifted('hp'),
    damage: lifted('damage'),
    armour: lifted('armour'),
    resistance: lifted('resistance'),
    attackSeconds: monster.attackSeconds ?? balanceNumber(data, 'monster-scaling', 'defaultAttackSeconds'),
  };
}

// Copied from baseStatAtItemLevel in the game: only a stat with a flat growth (weapon damage) changes with the item level.
export function baseStatAtItemLevel(base: BaseItem, statId: string, itemLevel: number): number {
  const value = base.baseStats[statId] ?? 0;
  const growth = base.growthPerItemLevel?.[statId];
  return growth === undefined ? value : Math.round(value + growth * (itemLevel - 1));
}
