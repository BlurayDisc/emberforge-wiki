import type { GameIndex } from '../data/gameIndex';
import type { Dungeon } from '../data/gameData';
import type { GameText } from '../data/text';
import { pixelArt } from '../render/art';
import { badge, commaList, dataTable, definitionList, iconLink, jumpLinks, loreText, pageHeading, panel, siteLink } from '../render/components';
import { html, type Html } from '../render/html';
import type { Page } from '../render/page';

const dungeonPath = (dungeon: Dungeon) => `dungeons/${dungeon.id}.html`;
const monsterLink = (game: GameIndex, monsterId: string) => {
  const monster = game.monster(monsterId);
  return iconLink(`monsters/${monster.id}.html`, monster.name, pixelArt('monsters', monster.spriteKey, monster.name, 1));
};

const dungeonLink = (dungeon: Dungeon): Html => iconLink(dungeonPath(dungeon), dungeon.name, pixelArt('dungeons', dungeon.id, dungeon.name, 2));

function indexPage(game: GameIndex): Page {
  const townsWithDungeons = game.data.towns.filter((town) => game.dungeonsOfTown(town.id).length > 0);
  const townPanels = townsWithDungeons.map((town) => {
    const rows = game.dungeonsOfTown(town.id).map((dungeon) => [
      dungeonLink(dungeon),
      dungeon.level,
      `${dungeon.recommendedMinLevel}-${dungeon.recommendedMaxLevel}`,
      dungeon.bossMonsterId ? badge('boss', 'boss') : 'Normal',
      dungeon.maxPartySize,
    ]);
    return panel(html`${siteLink(`towns/${town.id}.html`, town.name)} <span class="muted">levels ${town.firstLevel}-${town.lastLevel}</span>`,
      dataTable(['Dungeon', 'Level', 'Recommended hero level', 'Type', 'Heroes allowed'], rows), { anchor: `town-${town.id}` });
  });
  const body = html`
    ${pageHeading('Dungeons', 'Each dungeon is one fight, run again and again. Clear one to open the next. Dungeons are grouped by town.')}
    ${jumpLinks(townsWithDungeons.map((town) => ({ anchor: `town-${town.id}`, label: town.name })))}
    ${townPanels}`;
  return { path: 'dungeons/index.html', title: 'Dungeons', section: 'dungeons', body };
}

function dungeonPage(game: GameIndex, text: GameText, dungeon: Dungeon): Page {
  const town = game.town(dungeon.townId);
  const unlockedBy = dungeon.unlockAfter ? siteLink(`dungeons/${dungeon.unlockAfter}.html`, game.dungeon(dungeon.unlockAfter).name) : 'Open from the start';
  const unlocks = game.data.dungeons.filter((other) => other.unlockAfter === dungeon.id);
  const body = html`
    ${pageHeading(dungeon.name, `${town.name}, level ${dungeon.level}`)}
    <div class="portrait">${pixelArt('dungeons', dungeon.id, dungeon.name, 6)}</div>
    ${loreText(text.find(`dungeon.${dungeon.id}.description`))}
    ${panel('Overview', definitionList([
      ['Town', siteLink(`towns/${town.id}.html`, town.name)],
      ['Dungeon level', dungeon.level],
      ['Recommended hero level', `${dungeon.recommendedMinLevel}-${dungeon.recommendedMaxLevel}`],
      ['Heroes allowed', dungeon.maxPartySize],
      ['Opens after', unlockedBy],
      ['Opens next', commaList(unlocks.map((next) => siteLink(dungeonPath(next), next.name)))],
      ['Hero classes it opens', commaList(game.data.classes.filter((heroClass) => heroClass.unlockAfterDungeonId === dungeon.id).map((heroClass) => siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName)))],
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
