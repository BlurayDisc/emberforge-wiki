import { balanceNumber } from '../data/balance';
import type { GameIndex } from '../data/gameIndex';
import type { HeroClass } from '../data/gameData';
import { capitalised, orderedStatIds, type GameText } from '../data/text';
import { pixelArt } from '../render/art';
import { badge, card, cardGrid, commaList, dataTable, definitionList, jumpLinks, loreText, pageHeading, panel, siteLink } from '../render/components';
import { formatNumber } from '../render/format';
import { armourWeightList, itemLink, sortedForDisplay } from './equipment';
import { spellTable } from './spellTable';
import { html, type Html } from '../render/html';
import type { Page } from '../render/page';

const SAMPLE_LEVELS = [1, 10, 20, 50, 100];

export function heroStatAtLevel(base: number, growthPerLevel: number, level: number): number {
  return Math.round(base + growthPerLevel * (level - 1));
}

const classPath = (heroClass: HeroClass) => `heroes/${heroClass.id}.html`;

function heroCard(game: GameIndex, text: GameText, heroClass: HeroClass): Html {
  return card(classPath(heroClass), heroClass.displayName, [heroClass.roleDescription, `${armourWeightList(text, heroClass)} armour`, `${text.require(`resource.${heroClass.resourceId}`)}`], undefined,
    pixelArt('heroes', heroClass.id, heroClass.displayName, 2));
}

function unlockDungeonName(game: GameIndex, heroClass: HeroClass): string | null {
  return heroClass.unlockAfterDungeonId ? game.dungeon(heroClass.unlockAfterDungeonId).name : null;
}

function indexPage(game: GameIndex, text: GameText): Page {
  const statIds = orderedStatIds(game.data.classes.flatMap((heroClass) => Object.keys(heroClass.baseStats)));
  const openClasses = game.data.classes.filter((heroClass) => heroClass.unlockAfterDungeonId === null);
  const lockedClasses = game.data.classes
    .filter((heroClass) => heroClass.unlockAfterDungeonId !== null)
    .sort((a, b) => game.dungeon(a.unlockAfterDungeonId!).level - game.dungeon(b.unlockAfterDungeonId!).level);
  const lockedPanels = lockedClasses.map((heroClass) => html`
    <p class="group-note">Opens after you clear ${siteLink(`dungeons/${heroClass.unlockAfterDungeonId}.html`, unlockDungeonName(game, heroClass)!)}.</p>
    ${cardGrid([heroCard(game, text, heroClass)])}`);
  const body = html`
    ${pageHeading('Heroes', 'Your company is made of heroes. Each class fights in its own way.')}
    ${jumpLinks([
      { anchor: 'from-the-start', label: 'From the start' },
      ...(lockedClasses.length ? [{ anchor: 'unlocked-later', label: 'Unlocked later' }] : []),
      { anchor: 'promotions', label: 'Promotions' },
      { anchor: 'stats', label: 'Stats side by side' },
    ])}
    ${panel('Ready from the start', cardGrid(openClasses.map((heroClass) => heroCard(game, text, heroClass))), { anchor: 'from-the-start' })}
    ${lockedClasses.length ? panel('Unlocked by clearing a dungeon', html`<p>These classes cannot be hired until you clear the dungeon shown.</p>${lockedPanels}`, { anchor: 'unlocked-later' }) : null}
    ${panel('Promotions', promotionTable(game, text), { anchor: 'promotions' })}
    ${panel('Level 1 stats side by side', dataTable(
      ['Class', ...statIds.map((statId) => text.statName(statId))],
      game.data.classes.map((heroClass) => [siteLink(classPath(heroClass), heroClass.displayName), ...statIds.map((statId) => heroClass.baseStats[statId] ?? 0)]),
      { sortable: true }), { anchor: 'stats' })}
    ${panel('Hero names', html`<p>New heroes get a name from this list.</p><p>${game.data.heroNames.join(', ')}</p>`)}`;
  return { path: 'heroes/index.html', title: 'Heroes', section: 'heroes', body };
}

function promotionNote(): Html {
  return html`<p class="muted">Promotions are in the game data, but the game has no promotion command yet.</p>`;
}

// Each base class has branches at one level and a master class after each branch, chained by "promotesFrom".
function promotionTable(game: GameIndex, text: GameText): Html {
  const rows = game.data.classes.flatMap((heroClass) => {
    const advancements = game.advancementsOfClass(heroClass.id);
    const branches = advancements.filter((advancement) => advancement.promotesFrom === heroClass.id);
    return branches.map((branch, branchIndex) => {
      const master = advancements.find((advancement) => advancement.promotesFrom === branch.id);
      return [
        branchIndex === 0 ? siteLink(classPath(heroClass), heroClass.displayName) : '',
        `${branch.displayName} (level ${branch.requiredLevel})`,
        master ? `${master.displayName} (level ${master.requiredLevel})` : '-',
        branch.roleDescription,
      ];
    });
  });
  return html`${promotionNote()}${dataTable(['Class', 'Branch', 'Master class', 'Branch role'], rows)}`;
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
  const allowedItems = sortedForDisplay(game.itemsAllowedForClass(heroClass));
  const itemLinks = (items: typeof allowedItems) => html`<ul class="item-list">${items.map((base) => html`<li>${itemLink(game, base)}</li>`)}</ul>`;
  const inSlots = (...slots: string[]) => allowedItems.filter((base) => slots.includes(base.slot));
  return panel('Gear this class can use', definitionList([
    ['Weapons', itemLinks(inSlots('mainHand'))],
    ['Off hand', itemLinks(inSlots('offHand'))],
    [`${capitalised(armourWeightList(text, heroClass))} armour`, itemLinks(allowedItems.filter((base) => base.armourWeight !== null))],
    ['Jewellery and belts', itemLinks(allowedItems.filter((base) => base.armourWeight === null && !['mainHand', 'offHand'].includes(base.slot)))],
  ]));
}

function promotionPanel(game: GameIndex, heroClass: HeroClass): Html {
  const advancements = game.advancementsOfClass(heroClass.id);
  const branches = advancements.filter((advancement) => advancement.promotesFrom === heroClass.id);
  const rows = branches.flatMap((branch) => {
    const master = advancements.find((advancement) => advancement.promotesFrom === branch.id);
    return [
      [branch.displayName, `Branch, level ${branch.requiredLevel}`, branch.roleDescription],
      ...(master ? [[master.displayName, `Master, level ${master.requiredLevel}`, master.roleDescription]] : []),
    ];
  });
  return panel('Promotions', html`${promotionNote()}${dataTable(['Class', 'Step', 'Role'], rows)}`);
}

function classPage(game: GameIndex, text: GameText, heroClass: HeroClass): Page {
  const damageStat = text.statName(heroClass.attackKind === 'magic' ? 'magicalDamage' : 'physicalDamage');
  const body = html`
    ${pageHeading(heroClass.displayName, heroClass.roleDescription)}
    <div class="portrait">${pixelArt('heroes', heroClass.id, heroClass.displayName, 6)}</div>
    ${loreText(text.find(`class.${heroClass.id}.lore`))}
    ${panel('Overview', definitionList([
      ['Hired', heroClass.unlockAfterDungeonId
        ? html`After you clear ${siteLink(`dungeons/${heroClass.unlockAfterDungeonId}.html`, unlockDungeonName(game, heroClass)!)}`
        : 'From the start'],
      ['Attack type', html`${badge(heroClass.attackKind, heroClass.attackKind)} uses ${damageStat}`],
      ['Combat role', siteLink('abilities/index.html', heroClass.behavior)],
      ['Armour', capitalised(armourWeightList(text, heroClass))],
      ['Resource', text.require(`resource.${heroClass.resourceId}`)],
      ['Recovery rate', `${heroClass.recoveryRate}x`],
    ]))}
    ${panel('Stats by level', levelCalculator(game, text, heroClass))}
    ${panel('Spells', html`<p>Learned at the ${siteLink('abilities/index.html#spells', 'Academy')}. A hero fights with ${balanceNumber(game.data, 'spells', 'normalSlotCount')} spells and 1 ultimate.</p>${spellTable(game, text, heroClass)}`)}
    ${gearPanel(game, text, heroClass)}
    ${game.advancementsOfClass(heroClass.id).length ? promotionPanel(game, heroClass) : null}`;
  return { path: classPath(heroClass), title: heroClass.displayName, section: 'heroes', body, searchKind: 'Hero', searchKeywords: `${heroClass.roleDescription} ${game.advancementsOfClass(heroClass.id).map((advancement) => advancement.displayName).join(' ')}` };
}

export function buildHeroPages(game: GameIndex, text: GameText): Page[] {
  return [indexPage(game, text), ...game.data.classes.map((heroClass) => classPage(game, text, heroClass))];
}
