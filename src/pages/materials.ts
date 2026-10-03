import type { Material } from '../data/gameData';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { commaList, dataTable, definitionList, filterBox, loreText, pageHeading, panel, siteLink } from '../render/components';
import { formatMoney, formatPercent, formatQuantityRange } from '../render/format';
import { html } from '../render/html';
import type { Page } from '../render/page';
import { balanceNumber } from '../data/balance';

const materialPath = (material: Material) => `materials/${material.id}.html`;

function indexPage(game: GameIndex, text: GameText): Page {
  const rows = [...game.data.materials]
    .sort((a, b) => a.tier - b.tier || a.category.localeCompare(b.category))
    .map((material) => [
      siteLink(materialPath(material), material.name),
      material.tier,
      text.categoryName(material.category),
      formatMoney(material.sellValueCopper),
    ]);
  const body = html`
    ${pageHeading('Materials', 'Monsters drop materials. Crafters turn them into gear. A recipe uses one tier only.')}
    ${filterBox('Filter materials...')}
    ${dataTable(['Material', 'Tier', 'Category', 'Sells for'], rows, { sortable: true })}`;
  return { path: 'materials/index.html', title: 'Materials', section: 'materials', body };
}

function materialPage(game: GameIndex, text: GameText, material: Material): Page {
  const droppedBy = game.monstersDroppingMaterial(material.id);
  const usedIn = game.allRecipes().filter((recipe) => recipe.ingredients.some((ingredient) => ingredient.material.id === material.id));
  const buyMultiplier = balanceNumber(game.data, 'economy', 'materialBuyPriceMultiplier');
  const dropRows = droppedBy.map((monster) => {
    const drop = monster.drops.find((candidate) => candidate.materialId === material.id)!;
    return [siteLink(`monsters/${monster.id}.html`, monster.name), monster.rank, formatPercent(drop.chance), formatQuantityRange(drop.minQuantity, drop.maxQuantity)];
  });
  const body = html`
    ${pageHeading(material.name, `Tier ${material.tier} ${text.categoryName(material.category).toLowerCase()}`)}
    ${loreText(text.find(`material.${material.id}.lore`))}
    ${panel('Overview', definitionList([
      ['Tier', material.tier],
      ['Category', text.categoryName(material.category)],
      ['Sell value', formatMoney(material.sellValueCopper)],
      ['Merchant buy price', formatMoney(material.sellValueCopper * buyMultiplier)],
      ['Item name prefix', material.craftedItemPrefix ?? html`<span class="muted">none</span>`],
    ]))}
    ${panel('Dropped by', droppedBy.length ? dataTable(['Monster', 'Rank', 'Chance', 'Amount'], dropRows) : html`<p class="muted">No monster drops this yet.</p>`)}
    ${panel('Used in recipes', usedIn.length
      ? html`<p>${commaList(usedIn.map((recipe) => siteLink(`equipment/${recipe.base.id}.html`, recipe.itemName)))}</p>`
      : html`<p class="muted">No recipe uses this material.</p>`)}`;
  return { path: materialPath(material), title: material.name, section: 'materials', body, searchKind: 'Material', searchKeywords: material.category };
}

export function buildMaterialPages(game: GameIndex, text: GameText): Page[] {
  return [indexPage(game, text), ...game.data.materials.map((material) => materialPage(game, text, material))];
}
