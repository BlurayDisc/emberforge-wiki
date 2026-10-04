import { loadChangelog } from '../data/changelog';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { card, cardGrid, panel } from '../render/components';
import { html } from '../render/html';
import { SECTIONS, type Page } from '../render/page';
import { activeLanguage, t } from '../i18n/ui';

export function buildHomePage(game: GameIndex, _text: GameText): Page[] {
  const d = game.data;
  const countBySection: Record<string, string> = {
    heroes: t('{count} classes', { count: d.classes.length }),
    abilities: t('Combat rules'),
    monsters: t('{count} monsters', { count: d.monsters.length }),
    dungeons: t('{count} dungeons', { count: d.dungeons.length }),
    towns: t('{count} towns', { count: d.towns.length }),
    equipment: t('{count} item types', { count: d.baseItems.length }),
    materials: t('{count} materials', { count: d.materials.length }),
    crafters: t('{count} crafters', { count: Object.keys(d.professions).length }),
    affixes: t('{count} affixes', { count: d.affixes.length }),
    mechanics: t('Game numbers'),
    changelog: t('Latest {version}', { version: loadChangelog(activeLanguage())[0]?.version ?? t('none') }),
  };
  const body = html`
    <header class="hero-banner">
      <h1>Emberforge</h1>
      <p>${t('The guide to the crafting RPG. Lead a company of heroes, fight in dungeons, and forge better gear.')}</p>
    </header>
    ${panel(t('The core loop'), html`<p class="loop">${t('Fight, then loot, then craft, then equip, then travel to harder lands.')}</p>`)}
    ${cardGrid(SECTIONS.map((section) => card(section.indexPath, t(section.label), [t(section.tagline), countBySection[section.id] ?? ''])))}`;
  return [{ path: 'index.html', title: t('Emberforge Wiki'), section: 'home', body }];
}
