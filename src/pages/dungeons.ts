import type { GameIndex } from '../data/gameIndex';
import type { Dungeon } from '../data/gameData';
import type { GameText } from '../data/text';
import { pixelArt } from '../render/art';
import { badge, commaList, dataTable, definitionList, iconLink, jumpLinks, loreText, pageHeading, panel, siteLink } from '../render/components';
import { html, type Html } from '../render/html';
import type { Page } from '../render/page';
import { t } from '../i18n/ui';

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
      dungeon.minimumHeroLevel,
      dungeon.recommendedMaxLevel,
      dungeon.bossMonsterId ? badge(t('boss'), 'boss') : t('Normal'),
      dungeon.maxPartySize,
    ]);
    return panel(html`${siteLink(`towns/${town.id}.html`, town.name)} <span class="muted">${t('levels {first}-{last}', { first: town.firstLevel, last: town.lastLevel })}</span>`,
      dataTable([t('Dungeon'), t('Level'), t('Hero level needed'), t('Recommended up to'), t('Type'), t('Heroes allowed')], rows), { anchor: `town-${town.id}` });
  });
  const body = html`
    ${pageHeading(t('Dungeons'), t('Each dungeon is one fight, run again and again. Clear one to open the next. Dungeons are grouped by town.'))}
    ${jumpLinks(townsWithDungeons.map((town) => ({ anchor: `town-${town.id}`, label: town.name })))}
    ${townPanels}`;
  return { path: 'dungeons/index.html', title: t('Dungeons'), section: 'dungeons', body };
}

function dungeonPage(game: GameIndex, text: GameText, dungeon: Dungeon): Page {
  const town = game.town(dungeon.townId);
  const unlockedBy = dungeon.unlockAfter ? siteLink(`dungeons/${dungeon.unlockAfter}.html`, game.dungeon(dungeon.unlockAfter).name) : t('Open from the start');
  const unlocks = game.data.dungeons.filter((other) => other.unlockAfter === dungeon.id);
  const body = html`
    ${pageHeading(dungeon.name, t('{town}, level {level}', { town: town.name, level: dungeon.level }))}
    <div class="portrait">${pixelArt('dungeons', dungeon.id, dungeon.name, 6)}</div>
    ${loreText(text.find(`dungeon.${dungeon.id}.description`))}
    ${panel(t('Overview'), definitionList([
      [t('Town'), siteLink(`towns/${town.id}.html`, town.name)],
      [t('Dungeon level'), dungeon.level],
      [t('Hero level needed'), dungeon.minimumHeroLevel],
      [t('Recommended up to hero level'), dungeon.recommendedMaxLevel],
      [t('Heroes allowed'), dungeon.maxPartySize],
      [t('Opens after'), unlockedBy],
      [t('Opens next'), commaList(unlocks.map((next) => siteLink(dungeonPath(next), next.name)))],
      [t('Hero classes it opens'), commaList(game.data.classes.filter((heroClass) => heroClass.unlockAfterDungeonId === dungeon.id).map((heroClass) => siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName)))],
    ]))}
    ${panel(t('Monsters'), definitionList([
      [t('Common'), commaList(dungeon.monsterIds.map((id) => monsterLink(game, id)))],
      [t('Rare'), dungeon.rareMonsterId ? monsterLink(game, dungeon.rareMonsterId) : html`<span class="muted">${t('none')}</span>`],
      [t('Boss'), dungeon.bossMonsterId ? monsterLink(game, dungeon.bossMonsterId) : html`<span class="muted">${t('none')}</span>`],
    ]))}`;
  return { path: dungeonPath(dungeon), title: dungeon.name, section: 'dungeons', body, searchKind: t('Dungeon') };
}

export function buildDungeonPages(game: GameIndex, text: GameText): Page[] {
  return [indexPage(game), ...game.data.dungeons.map((dungeon) => dungeonPage(game, text, dungeon))];
}
