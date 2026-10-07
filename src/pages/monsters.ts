import { balanceNumber, balanceValue } from '../data/balance';
import { monsterStatsAtLevel } from '../data/gameFormulas';
import type { GameIndex, MonsterAppearance } from '../data/gameIndex';
import type { Dungeon, Monster, MonsterDrop } from '../data/gameData';
import type { GameText } from '../data/text';
import { pixelArt } from '../render/art';
import { badge, cardGrid, card, dataTable, definitionList, filterBox, jumpLinks, loreText, pageHeading, panel, siteLink, subheading } from '../render/components';
import { formatPercent, formatQuantityRange } from '../render/format';
import { monsterSpellTable } from './spellTable';
import { html, type Html } from '../render/html';
import type { Page } from '../render/page';
import { t } from '../i18n/ui';

const RANK_ORDER = ['normal', 'rare', 'boss'];

const monsterPath = (monster: Monster) => `monsters/${monster.id}.html`;
const rankSortKey = (monster: Monster) => (RANK_ORDER.includes(monster.rank) ? RANK_ORDER.indexOf(monster.rank) : RANK_ORDER.length);

function monsterCard(game: GameIndex, monster: Monster): Html {
  return card(monsterPath(monster), monster.name, [t('Attack time {seconds}s', { seconds: monster.flatStats?.attackSeconds ?? monster.attackSeconds ?? balanceNumber(game.data, 'monster-scaling', 'defaultAttackSeconds') })], badge(t(monster.rank), monster.rank), pixelArt('monsters', monster.spriteKey, monster.name, 2));
}

// Monsters are grouped by the town and the dungeon they fight in. Rare monsters and bosses follow the common ones.
function indexPage(game: GameIndex): Page {
  const monstersOfDungeon = (dungeon: Dungeon) =>
    game.dungeonMonsterIds(dungeon).map((id) => game.monster(id)).sort((a, b) => rankSortKey(a) - rankSortKey(b));
  const townPanels = game.data.towns.flatMap((town) => {
    const dungeons = game.dungeonsOfTown(town.id);
    if (dungeons.length === 0) return [];
    return [panel(town.name, html`${dungeons.map((dungeon) => html`
      ${subheading(html`${siteLink(`dungeons/${dungeon.id}.html`, dungeon.name)} <span class="muted">${t('level {level}', { level: dungeon.level })}</span>`)}
      ${cardGrid(monstersOfDungeon(dungeon).map((monster) => monsterCard(game, monster)))}`)}`, { anchor: `town-${town.id}`, isFilterGroup: true })];
  });
  const monstersInNoDungeon = game.data.monsters.filter((monster) => game.appearancesOfMonster(monster.id).length === 0);
  const jumpEntries = game.data.towns.filter((town) => game.dungeonsOfTown(town.id).length > 0).map((town) => ({ anchor: `town-${town.id}`, label: town.name }));
  const body = html`
    ${pageHeading(t('Monsters'), t('{count} foes lurk in the dungeons, grouped here by town and dungeon. Rare monsters and bosses drop more.', { count: game.data.monsters.length }))}
    ${filterBox(t('Filter monsters...'))}
    ${jumpLinks(jumpEntries)}
    <div data-filter-list>
      ${townPanels}
      ${monstersInNoDungeon.length ? panel(t('Not in any dungeon yet'), cardGrid(monstersInNoDungeon.map((monster) => monsterCard(game, monster))), { isFilterGroup: true }) : null}
    </div>`;
  return { path: 'monsters/index.html', title: t('Monsters'), section: 'monsters', body };
}

function appearanceRows(game: GameIndex, monster: Monster, appearances: MonsterAppearance[]) {
  return appearances.map(({ dungeon, role }) => {
    const stats = monsterStatsAtLevel(game.data, monster, dungeon.level);
    return [siteLink(`dungeons/${dungeon.id}.html`, dungeon.name), t(role), dungeon.level, stats.hp, stats.damage, stats.armour, stats.resistance, t('{seconds}s', { seconds: stats.attackSeconds })];
  });
}

export function dropAmountText(drop: MonsterDrop): string {
  if (drop.maxQuantityChance === undefined) return formatQuantityRange(drop.minQuantity, drop.maxQuantity);
  return t('{minimum}, or {maximum} with a {percent} chance', { minimum: drop.minQuantity, maximum: drop.maxQuantity, percent: formatPercent(drop.maxQuantityChance) });
}

function itemDropRows(game: GameIndex, monster: Monster) {
  return (monster.itemDrops ?? []).map((drop) => [
    siteLink(`equipment/${drop.baseId}.html`, game.baseItemsById.get(drop.baseId)?.name ?? drop.baseId),
    t(drop.quality),
    drop.itemLevel,
    formatPercent(drop.chance),
  ]);
}

function dropRows(game: GameIndex, monster: Monster) {
  return monster.drops.map((drop) => [
    siteLink(`materials/${drop.materialId}.html`, game.material(drop.materialId).name),
    formatPercent(drop.chance),
    dropAmountText(drop),
  ]);
}

function rewardNotes(game: GameIndex, monster: Monster) {
  const rankMultiplier = (fileName: string, key: string) => balanceValue<Record<string, number>>(game.data, fileName, key)[monster.rank];
  return definitionList([
    [t('Experience multiplier'), `${rankMultiplier('progression', 'experienceRankMultiplier') ?? '?'}x`],
    [t('Guaranteed material drops'), balanceNumber(game.data, 'dungeon-run', 'guaranteedMaterialDrops')],
  ]);
}

function monsterPage(game: GameIndex, text: GameText, monster: Monster): Page {
  const appearances = game.appearancesOfMonster(monster.id);
  const spells = game.data.monsterSpells.filter((spell) => (monster.spellIds ?? []).includes(spell.id));
  const body = html`
    ${pageHeading(monster.name)}
    <div class="portrait">${pixelArt('monsters', monster.spriteKey, monster.name, 5)}</div>
    <p>${badge(t(monster.rank), monster.rank)}</p>
    ${loreText(text.find(`monster.${monster.id}.lore`))}
    ${panel(t('Battle traits'), definitionList([
      [t('Attack time'), t('{seconds}s', { seconds: monster.flatStats?.attackSeconds ?? monster.attackSeconds ?? balanceNumber(game.data, 'monster-scaling', 'defaultAttackSeconds') })],
      ...(monster.flatStats
        ? [[t('Stats'), t('Fixed numbers. They do not follow the level curve.')] as [string, string]]
        : [[t('Stat factor'), t('{factor}x of the level curve. It lifts health, damage, armour and resistance together.', { factor: monster.statFactor ?? 1 })] as [string, string]]),
    ]))}
    ${spells.length ? panel(t('Spells'), html`<p>${t('A monster spell costs no resource. It waits only for its cooldown.')}</p>${monsterSpellTable(text, spells)}`) : null}
    ${panel(t('Stats by dungeon'), appearances.length
      ? dataTable([t('Dungeon'), t('Role'), t('Level'), t('Health'), t('Damage'), t('Armour'), t('Resistance'), t('Attack time')], appearanceRows(game, monster, appearances))
      : html`<p class="muted">${t('This monster is not placed in a dungeon yet.')}</p>`)}
    ${panel(t('Loot'), dataTable([t('Material'), t('Chance'), t('Amount')], dropRows(game, monster)))}
    ${(monster.itemDrops ?? []).length ? panel(t('Item drops'), dataTable([t('Item'), t('Quality'), t('Item level'), t('Chance')], itemDropRows(game, monster))) : null}
    ${panel(t('Rewards'), rewardNotes(game, monster))}`;
  return { path: monsterPath(monster), title: monster.name, section: 'monsters', body, searchKind: t('Monster ({rank})', { rank: t(monster.rank) }) };
}

export function buildMonsterPages(game: GameIndex, text: GameText): Page[] {
  return [indexPage(game), ...game.data.monsters.map((monster) => monsterPage(game, text, monster))];
}
