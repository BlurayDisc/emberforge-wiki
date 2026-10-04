import { balanceNumber, balanceValue } from '../data/balance';
import type { BaseItem, HeroClass, Material } from '../data/gameData';
import type { GameIndex, Recipe } from '../data/gameIndex';
import { orderedStatIds, type GameText } from '../data/text';
import { pixelArt } from '../render/art';
import { commaList, dataTable, definitionList, filterBox, iconLink, jumpLinks, pageHeading, panel, siteLink } from '../render/components';
import { formatDuration, formatMoney } from '../render/format';
import { html, type Html } from '../render/html';
import type { Page } from '../render/page';
import { t } from '../i18n/ui';

const itemPath = (base: BaseItem) => `equipment/${base.id}.html`;

// Slots in the order a hero is dressed. A slot the game adds later is listed after these.
const SLOT_ORDER = ['mainHand', 'offHand', 'helm', 'armour', 'gloves', 'legs', 'boots', 'belt', 'ring', 'amulet'];
const slotRank = (slot: string) => (SLOT_ORDER.includes(slot) ? SLOT_ORDER.indexOf(slot) : SLOT_ORDER.length);

export function sortedForDisplay(items: BaseItem[]): BaseItem[] {
  return [...items].sort((a, b) => slotRank(a.slot) - slotRank(b.slot) || a.slot.localeCompare(b.slot) || a.craftLevelOffset - b.craftLevelOffset || a.name.localeCompare(b.name));
}

export function armourWeightList(text: GameText, heroClass: HeroClass): string {
  return heroClass.armourWeights.map((weight) => text.armourWeightName(weight).toLowerCase()).join(t(' or '));
}

export function setBonusText(text: GameText, material: Material): string {
  const bonus = material.setBonus!;
  return t('+{value} {stat}', { value: bonus.value, stat: text.statName(bonus.stat) });
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
  return statIds.map((statId) => t('+{value} {stat}', { value: base.baseStats[statId] ?? 0, stat: text.statName(statId) })).join(t(', ')) || t('none');
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

const itemTableHeaders = () => [t('Item'), t('Slot'), t('Backpack size'), t('Base stats'), t('Crafted by'), t('Level offset')];

function classPanel(game: GameIndex, text: GameText, heroClass: HeroClass, items: BaseItem[]): Html {
  const heading = html`${pixelArt('heroes', heroClass.id, heroClass.displayName, 2)} ${siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName)}`;
  return panel(heading, html`
    <p class="muted">${heroClass.roleDescription} ${t('Wears {weight} armour.', { weight: armourWeightList(text, heroClass) })}</p>
    ${dataTable(itemTableHeaders(), itemRows(game, text, items))}`, { anchor: `class-${heroClass.id}`, isFilterGroup: true });
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
    ...(itemsForEveryClass.length ? [{ anchor: 'all-classes', label: t('All classes') }] : []),
    ...(itemsForNoClass.length ? [{ anchor: 'no-class', label: t('No class yet') }] : []),
  ];
  const slotCount = new Set(game.data.baseItems.map((base) => base.slot)).size;
  const body = html`
    ${pageHeading(t('Equipment'), t('{items} item types in {slots} slots, grouped by the class that can use them. Crafted gear gets stronger with item level.', { items: game.data.baseItems.length, slots: slotCount }))}
    ${filterBox(t('Filter equipment...'))}
    ${jumpLinks(jumpEntries)}
    ${classPanels}
    ${itemsForEveryClass.length ? panel(t('All classes'), dataTable(itemTableHeaders(), itemRows(game, text, itemsForEveryClass)), { anchor: 'all-classes', isFilterGroup: true }) : null}
    ${itemsForNoClass.length ? panel(t('No class can use these yet'), dataTable(itemTableHeaders(), itemRows(game, text, itemsForNoClass)), { anchor: 'no-class', isFilterGroup: true }) : null}`;
  return { path: 'equipment/index.html', title: t('Equipment'), section: 'equipment', body };
}

function recipeRows(game: GameIndex, text: GameText, base: BaseItem) {
  return game.allRecipes().filter((recipe) => recipe.base.id === base.id).map((recipe) => [
    recipe.setMaterial ? html`${recipe.itemName} <span class="muted">(${setBonusText(text, recipe.setMaterial)})</span>` : recipe.itemName,
    t('Tier {tier}', { tier: recipe.tier }),
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
  const setRecipeSlots = balanceValue<string[]>(game.data, 'items', 'setRecipeSlots');
  const wearers = game.classesAllowedForItem(base);
  const line = sameLine(game, base);
  const picture = itemPicture(game, base, 6);
  const body = html`
    ${pageHeading(base.name, `${text.slotName(base.slot)}${base.armourWeight ? `${t(', ')}${text.armourWeightName(base.armourWeight).toLowerCase()}` : ''}`)}
    ${panel(t('Overview'), html`
      ${picture && html`<div class="portrait">${picture}</div>`}
      ${definitionList([
        [t('Slot'), text.slotName(base.slot)],
        [t('Gear type'), text.gearTypeName(base.gearType)],
        [t('Backpack size'), `${base.width} x ${base.height}`],
        [t('Base stats'), describeBaseStats(text, base)],
        [t('Stat roll spread'), t('plus or minus {percent}%', { percent: Math.round(spreadFraction * 100) })],
        ...(unscaledStatsOfItem.length ? [[t('Does not grow with item level'), commaList(unscaledStatsOfItem.map((statId) => html`${text.statName(statId)}`))] as [string, Html]] : []),
        [t('Worn by'), commaList(wearers.map((heroClass) => siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName)))],
      ])}`)}
    ${line.length > 1 ? panel(t('Weapon line'), html`<p>${t('Items of the same type and size, from the first step to the last. The step is the crafter level offset.')}</p>
      ${dataTable([t('Item'), t('Base stats'), t('Level offset')], line.map((step) => [itemLink(game, step), describeBaseStats(text, step), step.craftLevelOffset]))}`) : null}
    ${panel(t('Crafting'), definitionList([
      [t('Crafter'), siteLink(`crafters/${base.profession}.html`, game.data.professions[base.profession] ?? base.profession)],
      [t('Main material'), text.categoryName(base.mainCategory)],
      ...(setRecipeSlots.includes(base.slot) ? [[t('Set material'), t('Optional. A set material adds a fixed bonus to the piece. See the recipes below.')] as [string, string]] : []),
      [t('Crafter level offset'), `+${base.craftLevelOffset}`],
    ]))}
    ${panel(t('Recipes'), recipeRows(game, text, base).length
      ? dataTable([t('Result'), t('Tier'), t('Crafter level'), t('Ingredients'), t('Crafter fee'), t('Craft time')], recipeRows(game, text, base))
      : html`<p class="muted">${t('No recipe yet: the needed materials are not in the game data.')}</p>`)}`;
  return { path: itemPath(base), title: base.name, section: 'equipment', body, searchKind: t('Equipment'), searchKeywords: `${base.slot} ${base.gearType} ${wearers.map((heroClass) => heroClass.displayName).join(' ')}` };
}

export function buildEquipmentPages(game: GameIndex, text: GameText): Page[] {
  return [indexPage(game, text), ...game.data.baseItems.map((base) => itemPage(game, text, base))];
}
