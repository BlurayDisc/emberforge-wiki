import { balanceNumber, balanceValue } from '../data/balance';
import type { BaseItem, HeroClass } from '../data/gameData';
import type { GameIndex, Recipe } from '../data/gameIndex';
import { orderedStatIds, type GameText } from '../data/text';
import { pixelArt } from '../render/art';
import { commaList, dataTable, definitionList, filterBox, iconLink, jumpLinks, pageHeading, panel, siteLink } from '../render/components';
import { formatDuration, formatMoney } from '../render/format';
import { html, type Html } from '../render/html';
import type { Page } from '../render/page';

const itemPath = (base: BaseItem) => `equipment/${base.id}.html`;

// Slots in the order a hero is dressed. A slot the game adds later is listed after these.
const SLOT_ORDER = ['mainHand', 'offHand', 'helm', 'armour', 'gloves', 'boots', 'belt', 'ring', 'amulet'];
const slotRank = (slot: string) => (SLOT_ORDER.includes(slot) ? SLOT_ORDER.indexOf(slot) : SLOT_ORDER.length);

export function sortedForDisplay(items: BaseItem[]): BaseItem[] {
  return [...items].sort((a, b) => slotRank(a.slot) - slotRank(b.slot) || a.slot.localeCompare(b.slot) || a.craftLevelOffset - b.craftLevelOffset || a.name.localeCompare(b.name));
}

export function itemPicture(game: GameIndex, base: BaseItem, scale: number): Html | null {
  const material = game.iconMaterialOfItem(base);
  return material ? pixelArt('items', `${base.id}--${material.id}`, base.name, scale) : null;
}

export function itemLink(game: GameIndex, base: BaseItem): Html {
  return iconLink(itemPath(base), base.name, itemPicture(game, base, 2));
}

export function describeBaseStats(text: GameText, base: BaseItem): string {
  const statIds = orderedStatIds(Object.keys(base.baseStats));
  return statIds.map((statId) => `+${base.baseStats[statId]} ${text.statName(statId)}`).join(', ') || 'none';
}

export function recipeIngredientLinks(recipe: Recipe) {
  return commaList(recipe.ingredients.map(({ material, quantity }) => html`${quantity} x ${siteLink(`materials/${material.id}.html`, material.name)}`));
}

function itemRows(game: GameIndex, text: GameText, items: BaseItem[]) {
  return sortedForDisplay(items).map((base) => [
    itemLink(game, base),
    text.slotName(base.slot),
    `${base.width}x${base.height}`,
    describeBaseStats(text, base),
    game.data.professions[base.profession] ?? base.profession,
    base.craftLevelOffset,
  ]);
}

const ITEM_TABLE_HEADERS = ['Item', 'Slot', 'Backpack size', 'Base stats', 'Crafted by', 'Level offset'];

function classPanel(game: GameIndex, text: GameText, heroClass: HeroClass, items: BaseItem[]): Html {
  const heading = html`${pixelArt('heroes', heroClass.id, heroClass.displayName, 2)} ${siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName)}`;
  return panel(heading, html`
    <p class="muted">${heroClass.roleDescription} Wears ${text.armourWeightName(heroClass.armourWeight).toLowerCase()} armour.</p>
    ${dataTable(ITEM_TABLE_HEADERS, itemRows(game, text, items))}`, { anchor: `class-${heroClass.id}`, isFilterGroup: true });
}

function indexPage(game: GameIndex, text: GameText): Page {
  const classCount = game.data.classes.length;
  const wearerCount = (base: BaseItem) => game.classesAllowedForItem(base).length;
  const itemsForEveryClass = game.data.baseItems.filter((base) => wearerCount(base) === classCount);
  const itemsForNoClass = game.data.baseItems.filter((base) => wearerCount(base) === 0);
  const classPanels = game.data.classes.map((heroClass) =>
    classPanel(game, text, heroClass, game.itemsAllowedForClass(heroClass).filter((base) => !itemsForEveryClass.includes(base))));
  const jumpEntries = [
    ...game.data.classes.map((heroClass) => ({ anchor: `class-${heroClass.id}`, label: heroClass.displayName })),
    ...(itemsForEveryClass.length ? [{ anchor: 'all-classes', label: 'All classes' }] : []),
    ...(itemsForNoClass.length ? [{ anchor: 'no-class', label: 'No class yet' }] : []),
  ];
  const slotCount = new Set(game.data.baseItems.map((base) => base.slot)).size;
  const body = html`
    ${pageHeading('Equipment', `${game.data.baseItems.length} item types in ${slotCount} slots, grouped by the class that can use them. Crafted gear gets stronger with item level.`)}
    ${filterBox('Filter equipment...')}
    ${jumpLinks(jumpEntries)}
    ${classPanels}
    ${itemsForEveryClass.length ? panel('All classes', dataTable(ITEM_TABLE_HEADERS, itemRows(game, text, itemsForEveryClass)), { anchor: 'all-classes', isFilterGroup: true }) : null}
    ${itemsForNoClass.length ? panel('No class can use these yet', dataTable(ITEM_TABLE_HEADERS, itemRows(game, text, itemsForNoClass)), { anchor: 'no-class', isFilterGroup: true }) : null}`;
  return { path: 'equipment/index.html', title: 'Equipment', section: 'equipment', body };
}

function recipeRows(game: GameIndex, base: BaseItem) {
  return game.allRecipes().filter((recipe) => recipe.base.id === base.id).map((recipe) => [
    recipe.itemName,
    `Tier ${recipe.tier}`,
    recipe.requiredCraftLevel,
    recipeIngredientLinks(recipe),
    formatMoney(recipe.craftFeeCopper),
    formatDuration(recipe.craftSeconds),
  ]);
}

// Other item types of the same gear type and size are the steps of one weapon line, from weakest to strongest.
function sameLine(game: GameIndex, base: BaseItem): BaseItem[] {
  return sortedForDisplay(game.data.baseItems.filter((other) => other.gearType === base.gearType && other.slot === base.slot && other.width === base.width && other.height === base.height));
}

function itemPage(game: GameIndex, text: GameText, base: BaseItem): Page {
  const spreadFraction = balanceNumber(game.data, 'items', 'baseStatSpreadFraction');
  const unscaledStatIds = balanceValue<string[]>(game.data, 'items', 'unscaledBaseStats');
  const unscaledStatsOfItem = Object.keys(base.baseStats).filter((statId) => unscaledStatIds.includes(statId));
  const wearers = game.classesAllowedForItem(base);
  const line = sameLine(game, base);
  const picture = itemPicture(game, base, 6);
  const body = html`
    ${pageHeading(base.name, `${text.slotName(base.slot)}${base.armourWeight ? `, ${text.armourWeightName(base.armourWeight).toLowerCase()}` : ''}`)}
    ${panel('Overview', html`
      ${picture && html`<div class="portrait">${picture}</div>`}
      ${definitionList([
        ['Slot', text.slotName(base.slot)],
        ['Gear type', text.gearTypeName(base.gearType)],
        ['Backpack size', `${base.width} x ${base.height}`],
        ['Base stats', describeBaseStats(text, base)],
        ['Stat roll spread', `plus or minus ${Math.round(spreadFraction * 100)}%`],
        ...(unscaledStatsOfItem.length ? [['Does not grow with item level', commaList(unscaledStatsOfItem.map((statId) => html`${text.statName(statId)}`))] as [string, Html]] : []),
        ['Worn by', commaList(wearers.map((heroClass) => siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName)))],
      ])}`)}
    ${line.length > 1 ? panel('Weapon line', html`<p>Items of the same type and size, from the first step to the last. The step is the crafter level offset.</p>
      ${dataTable(['Item', 'Base stats', 'Level offset'], line.map((step) => [itemLink(game, step), describeBaseStats(text, step), step.craftLevelOffset]))}`) : null}
    ${panel('Crafting', definitionList([
      ['Crafter', siteLink(`crafters/${base.profession}.html`, game.data.professions[base.profession] ?? base.profession)],
      ['Main material', text.categoryName(base.mainCategory)],
      ['Second material', text.categoryName(base.secondaryCategory)],
      ['Crafter level offset', `+${base.craftLevelOffset}`],
    ]))}
    ${panel('Recipes', recipeRows(game, base).length
      ? dataTable(['Result', 'Tier', 'Crafter level', 'Ingredients', 'Crafter fee', 'Craft time'], recipeRows(game, base))
      : html`<p class="muted">No recipe yet: the needed materials are not in the game data.</p>`)}`;
  return { path: itemPath(base), title: base.name, section: 'equipment', body, searchKind: 'Equipment', searchKeywords: `${base.slot} ${base.gearType} ${wearers.map((heroClass) => heroClass.displayName).join(' ')}` };
}

export function buildEquipmentPages(game: GameIndex, text: GameText): Page[] {
  return [indexPage(game, text), ...game.data.baseItems.map((base) => itemPage(game, text, base))];
}
