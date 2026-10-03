import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { card, cardGrid, panel } from '../render/components';
import { html } from '../render/html';
import { SECTIONS, type Page } from '../render/page';

export function buildHomePage(game: GameIndex, _text: GameText): Page[] {
  const d = game.data;
  const countBySection: Record<string, string> = {
    heroes: `${d.classes.length} classes`,
    abilities: 'Combat rules',
    monsters: `${d.monsters.length} monsters`,
    dungeons: `${d.dungeons.length} dungeons`,
    towns: `${d.towns.length} towns`,
    equipment: `${d.baseItems.length} item types`,
    materials: `${d.materials.length} materials`,
    crafters: `${Object.keys(d.professions).length} crafters`,
    affixes: `${d.affixes.length} affixes`,
    mechanics: 'Game numbers',
  };
  const body = html`
    <header class="hero-banner">
      <h1>Emberforge</h1>
      <p>The guide to the crafting RPG. Lead a company of heroes, fight in dungeons, and forge better gear.</p>
    </header>
    ${panel('The core loop', html`<p class="loop">Fight, then loot, then craft, then equip, then travel to harder lands.</p>`)}
    ${cardGrid(SECTIONS.map((section) => card(section.indexPath, section.label, [section.tagline, countBySection[section.id] ?? ''])))}`;
  return [{ path: 'index.html', title: 'Emberforge Wiki', section: 'home', body }];
}
