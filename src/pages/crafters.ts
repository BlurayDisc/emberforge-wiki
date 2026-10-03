import { balanceNumber } from '../data/balance';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { card, cardGrid, commaList, dataTable, definitionList, pageHeading, panel, siteLink } from '../render/components';
import { formatDuration } from '../render/format';
import { html } from '../render/html';
import type { Page } from '../render/page';
import { recipeIngredientLinks } from './equipment';

const crafterPath = (professionId: string) => `crafters/${professionId}.html`;

function indexPage(game: GameIndex): Page {
  const body = html`
    ${pageHeading('Crafters', 'Each profession is a crafter with a level from 1 to 100. Every craft earns experience.')}
    ${cardGrid(Object.entries(game.data.professions).map(([professionId, professionName]) => {
      const makes = game.data.baseItems.filter((base) => base.profession === professionId);
      return card(crafterPath(professionId), professionName, [`Makes ${makes.map((base) => base.name).join(', ') || 'nothing yet'}`]);
    }))}
    ${panel('Crafting levels', craftingNumbers(game))}`;
  return { path: 'crafters/index.html', title: 'Crafters', section: 'crafters', body };
}

function craftingNumbers(game: GameIndex) {
  const d = game.data;
  return definitionList([
    ['Level cap', balanceNumber(d, 'crafting', 'maximumLevel')],
    ['Craft time', `${balanceNumber(d, 'crafting', 'craftSecondsBase')}s plus ${balanceNumber(d, 'crafting', 'craftSecondsPerRequiredLevel')}s per required level`],
    ['Recipe level', `(tier - 1) x ${balanceNumber(d, 'items', 'levelsPerBracket')} plus the item offset`],
    ['Experience per craft', `${balanceNumber(d, 'crafting', 'experienceBase')} plus ${balanceNumber(d, 'crafting', 'experiencePerRequiredLevel')} per required level`],
  ]);
}

function crafterPage(game: GameIndex, text: GameText, professionId: string, professionName: string): Page {
  const recipes = game.allRecipes().filter((recipe) => recipe.base.profession === professionId).sort((a, b) => a.requiredCraftLevel - b.requiredCraftLevel);
  const rows = recipes.map((recipe) => [
    siteLink(`equipment/${recipe.base.id}.html`, recipe.itemName),
    recipe.requiredCraftLevel,
    recipeIngredientLinks(recipe),
    formatDuration(recipe.craftSeconds),
  ]);
  const makes = game.data.baseItems.filter((base) => base.profession === professionId);
  const body = html`
    ${pageHeading(professionName)}
    ${panel('Makes', html`<p>${commaList(makes.map((base) => siteLink(`equipment/${base.id}.html`, base.name)))}</p>`)}
    ${panel('Recipes', rows.length ? dataTable(['Result', 'Crafter level', 'Ingredients', 'Craft time'], rows, { sortable: true }) : html`<p class="muted">No recipes yet.</p>`)}
    ${panel('Crafting levels', craftingNumbers(game))}`;
  return { path: crafterPath(professionId), title: professionName, section: 'crafters', body, searchKind: 'Crafter' };
}

export function buildCrafterPages(game: GameIndex, text: GameText): Page[] {
  const professionPages = Object.entries(game.data.professions).map(([id, name]) => crafterPage(game, text, id, name));
  return [indexPage(game), ...professionPages];
}
