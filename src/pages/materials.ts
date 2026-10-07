import { balanceValue } from '../data/balance';
import type { Material } from '../data/gameData';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { pixelArt } from '../render/art';
import { commaList, dataTable, definitionList, filterBox, iconLink, jumpLinks, loreText, pageHeading, panel, siteLink, subheading } from '../render/components';
import { formatMoney, formatPercent } from '../render/format';
import { html, type Html } from '../render/html';
import type { Page } from '../render/page';
import { itemLink, setBonusText } from './equipment';
import { dropAmountText } from './monsters';
import { t } from '../i18n/ui';

const commaListText = (names: string[]): string => names.join(t(', '));
const materialPath = (material: Material) => `materials/${material.id}.html`;
const materialLink = (material: Material): Html => iconLink(materialPath(material), material.name, pixelArt('materials', material.id, material.name, 2));

function materialTable(game: GameIndex, text: GameText, materials: Material[]): Html {
  const rows = [...materials]
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    .map((material) => [
      materialLink(material),
      text.categoryName(material.category),
      formatMoney(material.sellValueCopper),
      `${material.width}x${material.height}`,
    ]);
  return dataTable([t('Material'), t('Category'), t('Sells for'), t('Backpack size')], rows, { sortable: true });
}

// Each tier belongs to one town. Inside a tier, crafting materials come before the ones no recipe uses.
function indexPage(game: GameIndex, text: GameText): Page {
  const tierPanels = game.tiers().map((tier) => {
    const town = game.townOfTier(tier);
    const ofTier = game.data.materials.filter((material) => material.tier === tier);
    const crafting = ofTier.filter((material) => game.isCraftingMaterial(material));
    const other = ofTier.filter((material) => !game.isCraftingMaterial(material));
    const title = html`${t('Tier {tier}', { tier })}${town ? html` <span class="muted">${siteLink(`towns/${town.id}.html`, town.name)}</span>` : null}`;
    return panel(title, html`
      ${subheading(t('Crafting materials'))}${materialTable(game, text, crafting)}
      ${other.length ? html`${subheading(t('Other materials'))}<p class="muted">${t('No recipe uses these. They sell for coin.')}</p>${materialTable(game, text, other)}` : null}`,
    { anchor: `tier-${tier}`, isFilterGroup: true });
  });
  const body = html`
    ${pageHeading(t('Materials'), t('Monsters drop materials. Crafters turn them into gear. A recipe uses one tier only.'))}
    ${filterBox(t('Filter materials...'))}
    ${jumpLinks(game.tiers().map((tier) => ({ anchor: `tier-${tier}`, label: t('Tier {tier}', { tier }) })))}
    ${tierPanels}`;
  return { path: 'materials/index.html', title: t('Materials'), section: 'materials', body };
}

function materialPage(game: GameIndex, text: GameText, material: Material): Page {
  const setSlotNames = balanceValue<string[]>(game.data, 'items', 'setRecipeSlots').map((slot) => text.slotName(slot).toLowerCase());
  const droppedBy = game.monstersDroppingMaterial(material.id);
  const usingRecipes = game.allRecipes().filter((recipe) => recipe.ingredients.some((ingredient) => ingredient.material.id === material.id));
  const usedIn = [...new Map(usingRecipes.map((recipe) => [recipe.base.id, recipe])).values()];
  const dropRows = droppedBy.map((monster) => {
    const drop = monster.drops.find((candidate) => candidate.materialId === material.id)!;
    return [siteLink(`monsters/${monster.id}.html`, monster.name), t(monster.rank), formatPercent(drop.chance), dropAmountText(drop)];
  });
  const body = html`
    ${pageHeading(material.name, t('Tier {tier} {category}', { tier: material.tier, category: text.categoryName(material.category).toLowerCase() }))}
    <div class="portrait">${pixelArt('materials', material.id, material.name, 6)}</div>
    ${loreText(text.find(`material.${material.id}.lore`))}
    ${panel(t('Overview'), definitionList([
      [t('Tier'), material.tier],
      [t('Category'), text.categoryName(material.category)],
      [t('Sell value'), formatMoney(material.sellValueCopper)],
      [t('Backpack size'), `${material.width} x ${material.height}`],
      [t('Item name prefix'), material.craftedItemPrefix ?? html`<span class="muted">${t('none')}</span>`],
      ...(material.setBonus ? [[t('Set bonus'), t('{bonus} on every {slots} piece made with it', { bonus: setBonusText(text, material), slots: commaListText(setSlotNames) })] as [string, string]] : []),
    ]))}
    ${panel(t('Dropped by'), droppedBy.length ? dataTable([t('Monster'), t('Rank'), t('Chance'), t('Amount')], dropRows) : html`<p class="muted">${t('No monster drops this yet.')}</p>`)}
    ${panel(t('Used in recipes'), usedIn.length
      ? html`<ul class="item-list">${usedIn.map((recipe) => html`<li>${itemLink(game, recipe.base)}</li>`)}</ul>`
      : html`<p class="muted">${t('No recipe uses this material.')}</p>`)}`;
  return { path: materialPath(material), title: material.name, section: 'materials', body, searchKind: t('Material'), searchKeywords: material.category };
}

export function buildMaterialPages(game: GameIndex, text: GameText): Page[] {
  return [indexPage(game, text), ...game.data.materials.map((material) => materialPage(game, text, material))];
}
