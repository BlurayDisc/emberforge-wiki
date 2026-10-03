import type { GameIndex } from '../data/gameIndex';
import type { Dungeon } from '../data/gameData';
import type { GameText } from '../data/text';
import { badge, commaList, dataTable, definitionList, loreText, pageHeading, panel, siteLink } from '../render/components';
import { html } from '../render/html';
import type { Page } from '../render/page';

const dungeonPath = (dungeon: Dungeon) => `dungeons/${dungeon.id}.html`;
const monsterLink = (game: GameIndex, monsterId: string) => siteLink(`monsters/${monsterId}.html`, game.monster(monsterId).name);

function indexPage(game: GameIndex): Page {
  const rows = [...game.data.dungeons]
    .sort((a, b) => a.level - b.level)
    .map((dungeon) => [
      siteLink(dungeonPath(dungeon), dungeon.name),
      siteLink(`towns/${dungeon.townId}.html`, game.town(dungeon.townId).name),
      dungeon.level,
      `${dungeon.recommendedMinLevel}-${dungeon.recommendedMaxLevel}`,
      dungeon.bossMonsterId ? badge('boss', 'boss') : 'Normal',
      dungeon.maxPartySize,
    ]);
  const body = html`
    ${pageHeading('Dungeons', 'Each dungeon is one fight, run again and again. Clear one to open the next.')}
    ${dataTable(['Dungeon', 'Town', 'Level', 'Recommended hero level', 'Type', 'Heroes allowed'], rows, { sortable: true })}`;
  return { path: 'dungeons/index.html', title: 'Dungeons', section: 'dungeons', body };
}

function dungeonPage(game: GameIndex, text: GameText, dungeon: Dungeon): Page {
  const town = game.town(dungeon.townId);
  const unlockedBy = dungeon.unlockAfter ? siteLink(`dungeons/${dungeon.unlockAfter}.html`, game.dungeon(dungeon.unlockAfter).name) : 'Open from the start';
  const unlocks = game.data.dungeons.filter((other) => other.unlockAfter === dungeon.id);
  const body = html`
    ${pageHeading(dungeon.name, `${town.name}, level ${dungeon.level}`)}
    ${loreText(text.find(`dungeon.${dungeon.id}.description`))}
    ${panel('Overview', definitionList([
      ['Town', siteLink(`towns/${town.id}.html`, town.name)],
      ['Dungeon level', dungeon.level],
      ['Recommended hero level', `${dungeon.recommendedMinLevel}-${dungeon.recommendedMaxLevel}`],
      ['Heroes allowed', dungeon.maxPartySize],
      ['Opens after', unlockedBy],
      ['Opens next', commaList(unlocks.map((next) => siteLink(dungeonPath(next), next.name)))],
    ]))}
    ${panel('Monsters', definitionList([
      ['Common', commaList(dungeon.monsterIds.map((id) => monsterLink(game, id)))],
      ['Rare', dungeon.rareMonsterId ? monsterLink(game, dungeon.rareMonsterId) : html`<span class="muted">none</span>`],
      ['Boss', dungeon.bossMonsterId ? monsterLink(game, dungeon.bossMonsterId) : html`<span class="muted">none</span>`],
    ]))}`;
  return { path: dungeonPath(dungeon), title: dungeon.name, section: 'dungeons', body, searchKind: 'Dungeon' };
}

export function buildDungeonPages(game: GameIndex, text: GameText): Page[] {
  return [indexPage(game), ...game.data.dungeons.map((dungeon) => dungeonPage(game, text, dungeon))];
}
