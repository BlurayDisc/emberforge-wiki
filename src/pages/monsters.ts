import { balanceNumber, balanceValue } from '../data/balance';
import type { GameIndex, MonsterAppearance } from '../data/gameIndex';
import type { Dungeon, Monster } from '../data/gameData';
import type { GameText } from '../data/text';
import { pixelArt } from '../render/art';
import { badge, cardGrid, card, dataTable, definitionList, filterBox, jumpLinks, loreText, pageHeading, panel, siteLink, subheading } from '../render/components';
import { formatPercent, formatQuantityRange } from '../render/format';
import { html, type Html } from '../render/html';
import type { Page } from '../render/page';

const RANK_ORDER = ['normal', 'rare', 'boss'];

const monsterPath = (monster: Monster) => `monsters/${monster.id}.html`;
const rankSortKey = (monster: Monster) => (RANK_ORDER.includes(monster.rank) ? RANK_ORDER.indexOf(monster.rank) : RANK_ORDER.length);

function scaledStat(game: GameIndex, key: string, level: number): number {
  const scaling = balanceValue<{ base: number; perLevel: number }>(game.data, 'monster-scaling', key);
  return scaling.base + scaling.perLevel * level;
}

// Same formulas as createMonsterUnit in the game.
function monsterStatsAtLevel(game: GameIndex, monster: Monster, level: number) {
  return {
    hp: Math.round(scaledStat(game, 'hp', level) * monster.hpFactor),
    attack: Math.round(scaledStat(game, 'attack', level) * monster.attackFactor),
    defence: Math.round(scaledStat(game, 'defence', level) * monster.defenceFactor),
    resistance: Math.round(scaledStat(game, 'resistance', level) * monster.defenceFactor),
  };
}

function monsterCard(game: GameIndex, monster: Monster): Html {
  return card(monsterPath(monster), monster.name, [`Speed ${monster.speed}`], badge(monster.rank, monster.rank), pixelArt('monsters', monster.spriteKey, monster.name, 2));
}

// Monsters are grouped by the town and the dungeon they fight in. Rare monsters and bosses follow the common ones.
function indexPage(game: GameIndex): Page {
  const monstersOfDungeon = (dungeon: Dungeon) =>
    game.dungeonMonsterIds(dungeon).map((id) => game.monster(id)).sort((a, b) => rankSortKey(a) - rankSortKey(b));
  const townPanels = game.data.towns.flatMap((town) => {
    const dungeons = game.dungeonsOfTown(town.id);
    if (dungeons.length === 0) return [];
    return [panel(town.name, html`${dungeons.map((dungeon) => html`
      ${subheading(html`${siteLink(`dungeons/${dungeon.id}.html`, dungeon.name)} <span class="muted">level ${dungeon.level}</span>`)}
      ${cardGrid(monstersOfDungeon(dungeon).map((monster) => monsterCard(game, monster)))}`)}`, { anchor: `town-${town.id}`, isFilterGroup: true })];
  });
  const monstersInNoDungeon = game.data.monsters.filter((monster) => game.appearancesOfMonster(monster.id).length === 0);
  const jumpEntries = game.data.towns.filter((town) => game.dungeonsOfTown(town.id).length > 0).map((town) => ({ anchor: `town-${town.id}`, label: town.name }));
  const body = html`
    ${pageHeading('Monsters', `${game.data.monsters.length} foes lurk in the dungeons, grouped here by town and dungeon. Rare monsters and bosses drop more.`)}
    ${filterBox('Filter monsters...')}
    ${jumpLinks(jumpEntries)}
    <div data-filter-list>
      ${townPanels}
      ${monstersInNoDungeon.length ? panel('Not in any dungeon yet', cardGrid(monstersInNoDungeon.map((monster) => monsterCard(game, monster))), { isFilterGroup: true }) : null}
    </div>`;
  return { path: 'monsters/index.html', title: 'Monsters', section: 'monsters', body };
}

function appearanceRows(game: GameIndex, monster: Monster, appearances: MonsterAppearance[]) {
  return appearances.map(({ dungeon, role }) => {
    const stats = monsterStatsAtLevel(game, monster, dungeon.level);
    return [siteLink(`dungeons/${dungeon.id}.html`, dungeon.name), role, dungeon.level, stats.hp, stats.attack, stats.defence, stats.resistance];
  });
}

function dropRows(game: GameIndex, monster: Monster) {
  return monster.drops.map((drop) => [
    siteLink(`materials/${drop.materialId}.html`, game.material(drop.materialId).name),
    formatPercent(drop.chance),
    formatQuantityRange(drop.minQuantity, drop.maxQuantity),
  ]);
}

function rewardNotes(game: GameIndex, monster: Monster) {
  const rankMultiplier = (fileName: string, key: string) => balanceValue<Record<string, number>>(game.data, fileName, key)[monster.rank];
  return definitionList([
    ['Copper drop multiplier', `${rankMultiplier('economy', 'copperDropRankMultiplier') ?? '?'}x`],
    ['Experience multiplier', `${rankMultiplier('progression', 'experienceRankMultiplier') ?? '?'}x`],
    ['Guaranteed material drops', balanceNumber(game.data, 'dungeon-run', 'guaranteedMaterialDrops')],
  ]);
}

function monsterPage(game: GameIndex, text: GameText, monster: Monster): Page {
  const appearances = game.appearancesOfMonster(monster.id);
  const body = html`
    ${pageHeading(monster.name)}
    <div class="portrait">${pixelArt('monsters', monster.spriteKey, monster.name, 5)}</div>
    <p>${badge(monster.rank, monster.rank)}</p>
    ${loreText(text.find(`monster.${monster.id}.lore`))}
    ${panel('Battle traits', definitionList([
      ['Speed', monster.speed],
      ['Health factor', `${monster.hpFactor}x`],
      ['Attack factor', `${monster.attackFactor}x`],
      ['Defence factor', `${monster.defenceFactor}x`],
    ]))}
    ${panel('Stats by dungeon', appearances.length
      ? dataTable(['Dungeon', 'Role', 'Level', 'Health', 'Attack', 'Defence', 'Resistance'], appearanceRows(game, monster, appearances))
      : html`<p class="muted">This monster is not placed in a dungeon yet.</p>`)}
    ${panel('Loot', dataTable(['Material', 'Chance', 'Amount'], dropRows(game, monster)))}
    ${panel('Rewards', rewardNotes(game, monster))}`;
  return { path: monsterPath(monster), title: monster.name, section: 'monsters', body, searchKind: `Monster (${monster.rank})` };
}

export function buildMonsterPages(game: GameIndex, text: GameText): Page[] {
  return [indexPage(game), ...game.data.monsters.map((monster) => monsterPage(game, text, monster))];
}
