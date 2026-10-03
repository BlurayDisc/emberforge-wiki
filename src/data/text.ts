import type { GameData } from './gameData';

const STAT_DISPLAY_ORDER = ['hp', 'physicalDamage', 'magicalDamage', 'strength', 'magic', 'skill', 'speed', 'defence', 'resistance'];

export function orderedStatIds(statIds: Iterable<string>): string[] {
  const known = new Set(statIds);
  const unknownStatIds = [...known].filter((statId) => !STAT_DISPLAY_ORDER.includes(statId)).sort();
  return [...STAT_DISPLAY_ORDER.filter((statId) => known.has(statId)), ...unknownStatIds];
}

export function capitalised(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export class GameText {
  constructor(private readonly text: Record<string, string>) {}

  static from(data: GameData): GameText {
    return new GameText(data.text);
  }

  find(key: string): string | undefined {
    return this.text[key];
  }

  // A key the wiki depends on must exist, so a renamed key fails the build.
  require(key: string): string {
    const value = this.text[key];
    if (value === undefined) throw new Error(`Game text key "${key}" is missing in data/i18n/en.json.`);
    return value;
  }

  // Fills {name} slots in a game text, like the game does.
  format(key: string, params: Record<string, string | number>): string {
    return this.require(key).replace(/\{(\w+)\}/g, (slot, name: string) => String(params[name] ?? slot));
  }

  statName(statId: string): string {
    return this.text[`statname.${statId}`] ?? capitalised(statId);
  }

  slotName(slotId: string): string {
    return this.text[`slot.${slotId}`] ?? capitalised(slotId);
  }

  categoryName(categoryId: string): string {
    return capitalised(this.text[`category.${categoryId}`] ?? categoryId);
  }

  armourWeightName(weightId: string): string {
    return capitalised(this.text[`armourweight.${weightId}`] ?? weightId);
  }

  gearTypeName(gearTypeId: string): string {
    return this.text[`base.${gearTypeId}`] ?? capitalised(gearTypeId);
  }
}
