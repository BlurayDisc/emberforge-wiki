import { balanceNumber } from '../data/balance';
import type { BaseItem } from '../data/gameData';
import type { GameIndex, Recipe } from '../data/gameIndex';
import { orderedStatIds, type GameText } from '../data/text';
import { commaList, dataTable, definitionList, filterBox, pageHeading, panel, siteLink } from '../render/components';
import { formatDuration } from '../render/format';
import { html } from '../render/html';
import type { Page } from '../render/page';

const itemPath = (base: BaseItem) => `equipment/${base.id}.html`;

export function describeBaseStats(game: GameIndex, text: GameText, base: BaseItem): string {
  const statIds = orderedStatIds(Object.keys(base.baseStats));
  return statIds.map((statId) => `+${base.baseStats[statId]} ${text.statAbbreviation(statId)}`).join(', ') || 'none';
}

export function recipeIngredientLinks(recipe: Recipe) {
  return commaList(recipe.ingredients.map(({ material, quantity }) => html`${quantity} x ${siteLink(`materials/${material.id}.html`, material.name)}`));
}

function indexPage(game: GameIndex, text: GameText): Page {
  const slotIds = [...new Set(game.data.baseItems.map((base) => base.slot))];
  const rows = game.data.baseItems.map((base) => [
    siteLink(itemPath(base), base.name),
    text.slotName(base.slot),
    base.armourWeight ? text.armourWeightName(base.armourWeight) : '-',
    `${base.width}x${base.height}`,
    describeBaseStats(game, text, base),
    game.data.professions[base.profession] ?? base.profession,
  ]);
  const body = html`
    ${pageHeading('Equipment', `${game.data.baseItems.length} item types in ${slotIds.length} slots. Crafted gear gets stronger with item level.`)}
    ${filterBox('Filter equipment...')}
    ${dataTable(['Item', 'Slot', 'Armour', 'Backpack size', 'Base stats', 'Crafted by'], rows, { sortable: true })}`;
  return { path: 'equipment/index.html', title: 'Equipment', section: 'equipment', body };
}

function recipeRows(game: GameIndex, base: BaseItem) {
  return game.allRecipes().filter((recipe) => recipe.base.id === base.id).map((recipe) => [
    recipe.itemName,
    `Tier ${recipe.tier}`,
    recipe.requiredCraftLevel,
    recipeIngredientLinks(recipe),
    formatDuration(recipe.craftSeconds),
  ]);
}

function itemPage(game: GameIndex, text: GameText, base: BaseItem): Page {
  const spreadFraction = balanceNumber(game.data, 'items', 'baseStatSpreadFraction');
  const wearers = game.classesAllowedForItem(base);
  const body = html`
    ${pageHeading(base.name, `${text.slotName(base.slot)}${base.armourWeight ? `, ${text.armourWeightName(base.armourWeight).toLowerCase()}` : ''}`)}
    ${panel('Overview', definitionList([
      ['Slot', text.slotName(base.slot)],
      ['Gear type', text.gearTypeName(base.gearType)],
      ['Backpack size', `${base.width} x ${base.height}`],
      ['Base stats', describeBaseStats(game, text, base)],
      ['Stat roll spread', `plus or minus ${Math.round(spreadFraction * 100)}%`],
      ['Worn by', commaList(wearers.map((heroClass) => siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName)))],
    ]))}
    ${panel('Crafting', definitionList([
      ['Crafter', siteLink(`crafters/${base.profession}.html`, game.data.professions[base.profession] ?? base.profession)],
      ['Main material', text.categoryName(base.mainCategory)],
      ['Second material', text.categoryName(base.secondaryCategory)],
      ['Crafter level offset', `+${base.craftLevelOffset}`],
    ]))}
    ${panel('Recipes', recipeRows(game, base).length
      ? dataTable(['Result', 'Tier', 'Crafter level', 'Ingredients', 'Craft time'], recipeRows(game, base))
      : html`<p class="muted">No recipe yet: the needed materials are not in the game data.</p>`)}`;
  return { path: itemPath(base), title: base.name, section: 'equipment', body, searchKind: 'Equipment', searchKeywords: `${base.slot} ${base.gearType}` };
}

export function buildEquipmentPages(game: GameIndex, text: GameText): Page[] {
  return [indexPage(game, text), ...game.data.baseItems.map((base) => itemPage(game, text, base))];
}
