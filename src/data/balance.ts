import type { GameData } from './gameData';

// A renamed or removed balance key must fail the build loudly, not print "undefined" on a page.
export function balanceValue<T>(data: GameData, fileName: string, key: string): T {
  const value = data.balance[fileName]?.[key];
  if (value === undefined) {
    throw new Error(`Balance key "${key}" is missing in data/balance/${fileName}.json. Update the wiki code.`);
  }
  return value as T;
}

export const balanceNumber = (data: GameData, fileName: string, key: string): number =>
  balanceValue<number>(data, fileName, key);
