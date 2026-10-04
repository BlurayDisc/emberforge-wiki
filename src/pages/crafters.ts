import { balanceNumber, balanceValue } from '../data/balance';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { card, cardGrid, dataTable, definitionList, pageHeading, panel, siteLink } from '../render/components';
import { formatDuration, formatMoney, formatPercent } from '../render/format';
import { html, type Html } from '../render/html';
import type { Page } from '../render/page';
import { itemLink, recipeIngredientLinks, sortedForDisplay } from './equipment';
import { t } from '../i18n/ui';

const crafterPath = (professionId: string) => `crafters/${professionId}.html`;

function indexPage(game: GameIndex): Page {
  const body = html`
    ${pageHeading(t('Crafters'), t('Each profession is a crafter with a level from 1 to 100. Every craft earns experience.'))}
    ${cardGrid(Object.entries(game.data.professions).map(([professionId, professionName]) => {
      const makes = game.data.baseItems.filter((base) => base.profession === professionId);
      return card(crafterPath(professionId), professionName, [t('Makes {items}', { items: makes.map((base) => base.name).join(t(', ')) || t('nothing yet') })]);
    }))}
    ${panel(t('Crafting levels'), craftingNumbers(game))}
    ${panel(t('Item upgrades'), upgradeOdds(game))}`;
  return { path: 'crafters/index.html', title: t('Crafters'), section: 'crafters', body };
}

// Same rule as upgradeReachChance in the game: a straight line between the two odds lists.
function upgradeOdds(game: GameIndex) {
  const d = game.data;
  const atRecipeLevel = balanceValue<number[]>(d, 'crafting', 'upgradeChanceAtRecipeLevel');
  const farAbove = balanceValue<number[]>(d, 'crafting', 'upgradeChanceFarAboveRecipe');
  const farAboveLevels = balanceNumber(d, 'crafting', 'upgradeFarAboveLevels');
  const rows = Array.from({ length: balanceNumber(d, 'crafting', 'upgradeMaximumLevel') }, (_, index) => [
    t('+{level} or better', { level: index + 1 }),
    formatPercent(atRecipeLevel[index] ?? 0),
    formatPercent(farAbove[index] ?? 0),
  ]);
  return html`
    <p>${t('A crafted item can roll an upgrade level. The roll stops at the first failed step, so +N needs N steps in a row. The odds grow with each crafter level above the recipe level, until the crafter is {levels} levels above it.', { levels: farAboveLevels })}</p>
    ${dataTable([t('Upgrade'), t('Crafter at recipe level'), t('Crafter {levels}+ levels above', { levels: farAboveLevels })], rows)}`;
}

function craftingNumbers(game: GameIndex) {
  const d = game.data;
  return definitionList([
    [t('Level cap'), balanceNumber(d, 'crafting', 'maximumLevel')],
    [t('Craft time'), t('{base}s plus {perLevel}s per required level', { base: balanceNumber(d, 'crafting', 'craftSecondsBase'), perLevel: balanceNumber(d, 'crafting', 'craftSecondsPerRequiredLevel') })],
    [t('Recipe level'), t('(tier - 1) x {levels} plus the item offset', { levels: balanceNumber(d, 'items', 'levelsPerBracket') })],
    [t('Crafter fee'), t('{base} plus {perLevel} copper per required level, paid for every item', { base: formatMoney(balanceNumber(d, 'crafting', 'craftFeeBaseCopper')), perLevel: balanceNumber(d, 'crafting', 'craftFeePerRequiredLevelCopper') })],
    [t('Experience per craft'), t('{base} plus {perLevel} per required level', { base: balanceNumber(d, 'crafting', 'experienceBase'), perLevel: balanceNumber(d, 'crafting', 'experiencePerRequiredLevel') })],
  ]);
}

function crafterPage(game: GameIndex, text: GameText, professionId: string, professionName: string): Page {
  const recipes = game.allRecipes().filter((recipe) => recipe.base.profession === professionId).sort((a, b) => a.requiredCraftLevel - b.requiredCraftLevel);
  const rows = recipes.map((recipe) => [
    itemLink(game, recipe.base),
    text.slotName(recipe.base.slot),
    recipe.requiredCraftLevel,
    recipeIngredientLinks(recipe),
    formatMoney(recipe.craftFeeCopper),
    formatDuration(recipe.craftSeconds),
  ]);
  const makes = sortedForDisplay(game.data.baseItems.filter((base) => base.profession === professionId));
  const slotIds = [...new Set(makes.map((base) => base.slot))];
  const makesBySlot = slotIds.map((slotId): [string, Html] =>
    [text.slotName(slotId), html`<ul class="item-list">${makes.filter((base) => base.slot === slotId).map((base) => html`<li>${itemLink(game, base)}</li>`)}</ul>`]);
  const body = html`
    ${pageHeading(professionName)}
    ${panel(t('Makes'), makes.length ? definitionList(makesBySlot) : html`<p class="muted">${t('Nothing yet.')}</p>`)}
    ${panel(t('Recipes'), rows.length ? dataTable([t('Result'), t('Slot'), t('Crafter level'), t('Ingredients'), t('Crafter fee'), t('Craft time')], rows, { sortable: true }) : html`<p class="muted">${t('No recipes yet.')}</p>`)}
    ${panel(t('Crafting levels'), craftingNumbers(game))}`;
  return { path: crafterPath(professionId), title: professionName, section: 'crafters', body, searchKind: t('Crafter') };
}

export function buildCrafterPages(game: GameIndex, text: GameText): Page[] {
  const professionPages = Object.entries(game.data.professions).map(([id, name]) => crafterPage(game, text, id, name));
  return [indexPage(game), ...professionPages];
}
