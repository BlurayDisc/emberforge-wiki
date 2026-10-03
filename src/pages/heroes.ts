import { balanceNumber } from '../data/balance';
import type { GameIndex } from '../data/gameIndex';
import type { HeroClass } from '../data/gameData';
import { orderedStatIds, type GameText } from '../data/text';
import { badge, card, cardGrid, commaList, dataTable, definitionList, loreText, pageHeading, panel, siteLink } from '../render/components';
import { formatNumber } from '../render/format';
import { html } from '../render/html';
import type { Page } from '../render/page';

const SAMPLE_LEVELS = [1, 10, 20, 50, 100];

export function heroStatAtLevel(base: number, growthPerLevel: number, level: number): number {
  return Math.round(base + growthPerLevel * (level - 1));
}

const classPath = (heroClass: HeroClass) => `heroes/${heroClass.id}.html`;

function indexPage(game: GameIndex, text: GameText): Page {
  const statIds = orderedStatIds(game.data.classes.flatMap((heroClass) => Object.keys(heroClass.baseStats)));
  const body = html`
    ${pageHeading('Heroes', 'Your company is made of heroes. Each class fights in its own way.')}
    ${cardGrid(game.data.classes.map((heroClass) =>
      card(classPath(heroClass), heroClass.displayName, [heroClass.roleDescription, `${text.armourWeightName(heroClass.armourWeight)} armour`])))}
    ${panel('Level 1 stats side by side', dataTable(
      ['Class', ...statIds.map((statId) => text.statName(statId))],
      game.data.classes.map((heroClass) => [siteLink(classPath(heroClass), heroClass.displayName), ...statIds.map((statId) => heroClass.baseStats[statId] ?? 0)]),
      { sortable: true }))}
    ${panel('Hero names', html`<p>New heroes get a name from this list.</p><p>${game.data.heroNames.join(', ')}</p>`)}`;
  return { path: 'heroes/index.html', title: 'Heroes', section: 'heroes', body };
}

function levelCalculator(game: GameIndex, text: GameText, heroClass: HeroClass): ReturnType<typeof html> {
  const levelCap = balanceNumber(game.data, 'progression', 'levelCap');
  const statIds = orderedStatIds(Object.keys(heroClass.baseStats));
  const sampleLevels = [...SAMPLE_LEVELS.filter((level) => level <= levelCap)];
  const statRows = statIds.map((statId) => [
    text.statName(statId),
    ...sampleLevels.map((level) => heroStatAtLevel(heroClass.baseStats[statId] ?? 0, heroClass.growthPerLevel[statId] ?? 0, level)),
    formatNumber(heroClass.growthPerLevel[statId] ?? 0),
  ]);
  const calculatorData = JSON.stringify({ base: heroClass.baseStats, growth: heroClass.growthPerLevel });
  return html`
    ${dataTable(['Stat', ...sampleLevels.map((level) => `Lv ${level}`), 'Growth per level'], statRows)}
    <div class="level-calc" data-calc='${calculatorData}'>
      <label>Pick a level: <input type="range" min="1" max="${levelCap}" value="1" data-calc-level> <strong data-calc-level-label>1</strong></label>
      <ul class="calc-output">${statIds.map((statId) => html`<li><span>${text.statName(statId)}</span><strong data-calc-stat="${statId}">${heroClass.baseStats[statId] ?? 0}</strong></li>`)}</ul>
      <p class="muted">Stats are before gear. Formula: base + growth x (level - 1), rounded.</p>
    </div>`;
}

function gearPanel(game: GameIndex, text: GameText, heroClass: HeroClass) {
  const allowedItems = game.itemsAllowedForClass(heroClass);
  const heldInHand = (base: (typeof allowedItems)[number]) => base.slot === 'mainHand' || base.slot === 'offHand';
  const itemLinks = (items: typeof allowedItems) => commaList(items.map((base) => siteLink(`equipment/${base.id}.html`, base.name)));
  return panel('Gear this class can use', definitionList([
    ['Weapons', itemLinks(allowedItems.filter((base) => base.slot === 'mainHand'))],
    ['Off hand', itemLinks(allowedItems.filter((base) => base.slot === 'offHand'))],
    [`${text.armourWeightName(heroClass.armourWeight)} armour`, itemLinks(allowedItems.filter((base) => !heldInHand(base) && base.armourWeight === heroClass.armourWeight))],
    ['Jewellery and belts', itemLinks(allowedItems.filter((base) => !heldInHand(base) && base.armourWeight === null))],
  ]));
}

function classPage(game: GameIndex, text: GameText, heroClass: HeroClass): Page {
  const damageStat = heroClass.attackKind === 'magic' ? 'Magic' : 'Strength';
  const body = html`
    ${pageHeading(heroClass.displayName, heroClass.roleDescription)}
    ${loreText(text.find(`class.${heroClass.id}.lore`))}
    ${panel('Overview', definitionList([
      ['Attack type', html`${badge(heroClass.attackKind, heroClass.attackKind)} uses ${damageStat}`],
      ['Combat role', siteLink('abilities/index.html', heroClass.behavior)],
      ['Armour', text.armourWeightName(heroClass.armourWeight)],
      ['Recovery rate', `${heroClass.recoveryRate}x`],
    ]))}
    ${panel('Stats by level', levelCalculator(game, text, heroClass))}
    ${gearPanel(game, text, heroClass)}`;
  return { path: classPath(heroClass), title: heroClass.displayName, section: 'heroes', body, searchKind: 'Hero', searchKeywords: heroClass.roleDescription };
}

export function buildHeroPages(game: GameIndex, text: GameText): Page[] {
  return [indexPage(game, text), ...game.data.classes.map((heroClass) => classPage(game, text, heroClass))];
}
