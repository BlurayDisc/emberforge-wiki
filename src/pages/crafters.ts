import { balanceNumber, balanceValue } from '../data/balance';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { card, cardGrid, dataTable, definitionList, pageHeading, panel, siteLink } from '../render/components';
import { formatDuration, formatMoney, formatPercent } from '../render/format';
import { html, type Html } from '../render/html';
import type { Page } from '../render/page';
import { describeBaseStats, itemLink, recipeIngredientLinks, sortedForDisplay } from './equipment';
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
    ${panel(t('Item upgrades'), upgradeOdds(game))}
    ${panel(t('Crafting quality'), craftingQuality(game))}`;
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

function craftingQuality(game: GameIndex) {
  const d = game.data;
  const items = (key: string) => balanceValue<Record<string, number>>(d, 'items', key);
  const qualityWeights = items('qualityWeights');
  const sellFactors = items('sellQualityFactor');
  const qualityIds = Object.keys(qualityWeights);
  const qualityTotal = Object.values(qualityWeights).reduce((sum, weight) => sum + weight, 0);
  return html`
    ${dataTable(['', ...qualityIds.map((id) => t(id))], [
      [t('Odds'), ...qualityIds.map((id) => formatPercent((qualityWeights[id] ?? 0) / qualityTotal))],
      [t('Sell value factor'), ...qualityIds.map((id) => `${sellFactors[id] ?? '-'}x`)],
    ])}
    <ul>
      <li>${t('Every recipe has one fixed item level: the recipe level, never above the end of its tier. A hero needs that level to equip the item.')}</li>
      <li>${t('Only weapon damage grows with item level: a base item lists the damage at item level 1 and a flat gain for each next level. Other base stats stay the same.')}</li>
      <li>${t('Each upgrade level adds the larger of 1 and {percent} of the main stat of the item (rounded).', { percent: formatPercent(balanceNumber(d, 'crafting', 'upgradeMainStatFractionPerLevel')) })}</li>
      <li>${t('Sell value = ((crafting cost + {perIngredient} copper for each main ingredient) x the quality factor + {perAffix} copper for each affix + {perItem} copper) x (1 + {upgrade} for each upgrade level). Crafting cost is the material value plus the crafter fee.', { perIngredient: balanceNumber(d, 'items', 'sellAddedValueCopperPerIngredient'), perAffix: balanceNumber(d, 'items', 'sellAddedValueCopperPerAffix'), perItem: balanceNumber(d, 'items', 'sellAddedValueCopperPerItem'), upgrade: formatPercent(balanceNumber(d, 'items', 'sellGrowthPerUpgradeLevel')) })}</li>
    </ul>`;
}

function craftingNumbers(game: GameIndex) {
  const d = game.data;
  const experienceByLevel = balanceValue<number[]>(d, 'crafting', 'experienceToNextByLevel');
  return definitionList([
    [t('Level cap'), balanceNumber(d, 'crafting', 'maximumLevel')],
    [t('Craft time'), t('({base}s plus {perLevel}s per required level) x (1 + {factor} for each main material above {reference}, minus {factor} for each below)', { base: balanceNumber(d, 'crafting', 'craftSecondsBase'), perLevel: balanceNumber(d, 'crafting', 'craftSecondsPerRequiredLevel'), factor: balanceNumber(d, 'crafting', 'craftSecondsFactorPerMaterial'), reference: balanceNumber(d, 'crafting', 'craftSecondsReferenceMaterialCount') })],
    [t('Recipe level'), t('(tier - 1) x {levels} plus the item offset', { levels: balanceNumber(d, 'items', 'levelsPerBracket') })],
    [t('Crafter fee'), t('{base} plus {perLevel} copper per required level, paid for every item', { base: formatMoney(balanceNumber(d, 'crafting', 'craftFeeBaseCopper')), perLevel: balanceNumber(d, 'crafting', 'craftFeePerRequiredLevelCopper') })],
    [t('Experience per craft'), t('({base} plus {perLevel} per required level) for each unit of the main material. It falls by {gapStep} for each level the crafter is above the recipe, down to {minimum}.', { base: balanceNumber(d, 'crafting', 'experiencePerMaterialBase'), perLevel: balanceNumber(d, 'crafting', 'experiencePerMaterialPerRequiredLevel'), gapStep: formatPercent(balanceNumber(d, 'crafting', 'levelGapStep')), minimum: formatPercent(balanceNumber(d, 'crafting', 'levelGapFactorMinimum')) })],
    [t('Experience to the next level'), t('Levels 1 to {count}: {list}. After that: {base} x level to the power {exponent}.', { count: experienceByLevel.length, list: experienceByLevel.join(t(', ')), base: balanceNumber(d, 'crafting', 'experienceToNextBase'), exponent: balanceNumber(d, 'crafting', 'experienceToNextExponent') })],
    [t('Levels from one craft'), t('A crafter below level {level} gains at most {count} levels from one craft. The extra experience stays for the next craft.', { level: balanceNumber(d, 'crafting', 'levelsPerCraftCapBelowLevel'), count: balanceNumber(d, 'crafting', 'maximumLevelsPerCraft') })],
  ]);
}

function crafterPage(game: GameIndex, text: GameText, professionId: string, professionName: string): Page {
  const recipes = game.allRecipes().filter((recipe) => recipe.base.profession === professionId).sort((a, b) => a.requiredCraftLevel - b.requiredCraftLevel);
  const rows = recipes.map((recipe) => [
    itemLink(game, recipe.base),
    text.slotName(recipe.base.slot),
    recipe.requiredCraftLevel,
    recipe.itemLevel,
    describeBaseStats(text, recipe.base, recipe.itemLevel),
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
    ${panel(t('Recipes'), rows.length ? dataTable([t('Result'), t('Slot'), t('Crafter level'), t('Item level'), t('Base stats at item level'), t('Ingredients'), t('Crafter fee'), t('Craft time')], rows, { sortable: true }) : html`<p class="muted">${t('No recipes yet.')}</p>`)}
    ${panel(t('Crafting levels'), craftingNumbers(game))}`;
  return { path: crafterPath(professionId), title: professionName, section: 'crafters', body, searchKind: t('Crafter') };
}

export function buildCrafterPages(game: GameIndex, text: GameText): Page[] {
  const professionPages = Object.entries(game.data.professions).map(([id, name]) => crafterPage(game, text, id, name));
  return [indexPage(game), ...professionPages];
}
