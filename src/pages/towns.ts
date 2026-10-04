import type { GameIndex } from '../data/gameIndex';
import type { Building, Town } from '../data/gameData';
import type { GameText } from '../data/text';
import { card, cardGrid, commaList, definitionList, loreText, pageHeading, panel, siteLink, subheading } from '../render/components';
import { html } from '../render/html';
import type { Page } from '../render/page';
import { t, tHtml } from '../i18n/ui';

const townPath = (town: Town) => `towns/${town.id}.html`;

function indexPage(game: GameIndex): Page {
  const body = html`
    ${pageHeading(t('Towns'), t('Each town serves one bracket of 10 levels. Tier N materials belong to town N.'))}
    ${cardGrid(game.data.towns.map((town) =>
      card(townPath(town), town.name, [town.region, t('Levels {first}-{last}', { first: town.firstLevel, last: town.lastLevel }), t('{count} dungeons', { count: game.dungeonsOfTown(town.id).length })])))}
    ${panel(t('The castle'), html`<p>${tHtml('The king and queen of the Vales hold court in the castle. {link}.', { link: siteLink('castle/index.html', t('Meet the court')) })}</p>`)}`;
  return { path: 'towns/index.html', title: t('Towns'), section: 'towns', body };
}

// Only named buildings are listed. The houses, stalls and cottages have no label and are scenery.
function buildingGroups(game: GameIndex): { services: Building[]; landmarks: Building[]; sceneryCount: number } {
  const named = game.data.buildings.filter((building) => building.label !== null);
  return {
    services: named.filter((building) => building.panelId !== null),
    landmarks: named.filter((building) => building.panelId === null),
    sceneryCount: game.data.buildings.length - named.length,
  };
}

function townPage(game: GameIndex, text: GameText, town: Town, townNumber: number): Page {
  const dungeons = game.dungeonsOfTown(town.id);
  const isStartingTown = town.id === game.data.startingTownId;
  const materials = game.data.materials.filter((material) => material.tier === townNumber);
  const { services, landmarks, sceneryCount } = buildingGroups(game);
  const buildingNames = (buildings: Building[]) => commaList(buildings.map((building) => html`${building.label}`));
  const body = html`
    ${pageHeading(town.name, town.region)}
    ${loreText(text.find(`town.${town.id}.lore`))}
    ${panel(t('Overview'), definitionList([
      [t('Region'), town.region],
      [t('Levels'), `${town.firstLevel}-${town.lastLevel}`],
      [t('Material tier'), townNumber],
      [t('Start of the game'), isStartingTown ? t('Yes') : t('No')],
    ]))}
    ${panel(t('Buildings'), html`
      ${subheading(t('Places to visit'))}<p>${buildingNames(services)}</p>
      ${subheading(t('Landmarks'))}<p>${buildingNames(landmarks)}</p>
      <p class="muted">${t('Plus {count} houses and stalls.', { count: sceneryCount })}</p>`)}
    ${panel(t('Dungeons'), dungeons.length
      ? html`<ul>${dungeons.map((dungeon) => html`<li>${siteLink(`dungeons/${dungeon.id}.html`, dungeon.name)} (${t('level {level}', { level: dungeon.level })})</li>`)}</ul>`
      : html`<p class="muted">${t('No dungeons in the game data yet.')}</p>`)}
    ${panel(t('Materials of this tier'), materials.length
      ? html`<p>${commaList(materials.map((material) => siteLink(`materials/${material.id}.html`, material.name)))}</p>`
      : html`<p class="muted">${t('No materials of this tier in the game data yet.')}</p>`)}`;
  return { path: townPath(town), title: town.name, section: 'towns', body, searchKind: t('Town'), searchKeywords: town.region };
}

export function buildTownPages(game: GameIndex, text: GameText): Page[] {
  return [indexPage(game), ...game.data.towns.map((town, index) => townPage(game, text, town, index + 1))];
}
