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
import { t, tHtml } from '../i18n/ui';

const SAMPLE_LEVELS = [1, 10, 20, 50, 100];

export function heroStatAtLevel(base: number, growthPerLevel: number, level: number): number {
  return Math.round(base + growthPerLevel * (level - 1));
}

const classPath = (heroClass: HeroClass) => `heroes/${heroClass.id}.html`;

function heroCard(game: GameIndex, text: GameText, heroClass: HeroClass): Html {
  return card(classPath(heroClass), heroClass.displayName, [heroClass.roleDescription, t('{weight} armour', { weight: armourWeightList(text, heroClass) }), text.require(`resource.${heroClass.resourceId}`)], undefined,
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
    <p class="group-note">${tHtml('Opens after you clear {dungeon}.', { dungeon: siteLink(`dungeons/${heroClass.unlockAfterDungeonId}.html`, unlockDungeonName(game, heroClass)!) })}</p>
    ${cardGrid([heroCard(game, text, heroClass)])}`);
  const body = html`
    ${pageHeading(t('Heroes'), t('Your company is made of heroes. Each class fights in its own way.'))}
    ${jumpLinks([
      { anchor: 'from-the-start', label: t('From the start') },
      ...(lockedClasses.length ? [{ anchor: 'unlocked-later', label: t('Unlocked later') }] : []),
      { anchor: 'promotions', label: t('Promotions') },
      { anchor: 'stats', label: t('Stats side by side') },
    ])}
    ${panel(t('Ready from the start'), cardGrid(openClasses.map((heroClass) => heroCard(game, text, heroClass))), { anchor: 'from-the-start' })}
    ${lockedClasses.length ? panel(t('Unlocked by clearing a dungeon'), html`<p>${t('These classes cannot be hired until you clear the dungeon shown.')}</p>${lockedPanels}`, { anchor: 'unlocked-later' }) : null}
    ${panel(t('Promotions'), promotionTable(game, text), { anchor: 'promotions' })}
    ${panel(t('Level 1 stats side by side'), dataTable(
      [t('Class'), ...statIds.map((statId) => text.statName(statId))],
      game.data.classes.map((heroClass) => [siteLink(classPath(heroClass), heroClass.displayName), ...statIds.map((statId) => heroClass.baseStats[statId] ?? 0)]),
      { sortable: true }), { anchor: 'stats' })}
    ${panel(t('Hero names'), html`<p>${t('New heroes get a name from this list.')}</p><p>${game.data.heroNames.join(t(', '))}</p>`)}`;
  return { path: 'heroes/index.html', title: t('Heroes'), section: 'heroes', body };
}

function promotionNote(): Html {
  return html`<p class="muted">${t('Promotions are in the game data, but the game has no promotion command yet.')}</p>`;
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
        t('{name} (level {level})', { name: branch.displayName, level: branch.requiredLevel }),
        master ? t('{name} (level {level})', { name: master.displayName, level: master.requiredLevel }) : '-',
        branch.roleDescription,
      ];
    });
  });
  return html`${promotionNote()}${dataTable([t('Class'), t('Branch'), t('Master class'), t('Branch role')], rows)}`;
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
    ${dataTable([t('Stat'), ...sampleLevels.map((level) => t('Lv {level}', { level })), t('Growth per level')], statRows)}
    <div class="level-calc" data-calc='${calculatorData}'>
      <label>${t('Pick a level:')} <input type="range" min="1" max="${levelCap}" value="1" data-calc-level> <strong data-calc-level-label>1</strong></label>
      <ul class="calc-output">${statIds.map((statId) => html`<li><span>${text.statName(statId)}</span><strong data-calc-stat="${statId}">${heroClass.baseStats[statId] ?? 0}</strong></li>`)}</ul>
      <p class="muted">${t('Stats are before gear. Formula: base + growth x (level - 1), rounded.')}</p>
    </div>`;
}

function gearPanel(game: GameIndex, text: GameText, heroClass: HeroClass) {
  const allowedItems = sortedForDisplay(game.itemsAllowedForClass(heroClass));
  const itemLinks = (items: typeof allowedItems) => html`<ul class="item-list">${items.map((base) => html`<li>${itemLink(game, base)}</li>`)}</ul>`;
  const inSlots = (...slots: string[]) => allowedItems.filter((base) => slots.includes(base.slot));
  return panel(t('Gear this class can use'), definitionList([
    [t('Weapons'), itemLinks(inSlots('mainHand'))],
    [t('Off hand'), itemLinks(inSlots('offHand'))],
    [t('{weight} armour', { weight: capitalised(armourWeightList(text, heroClass)) }), itemLinks(allowedItems.filter((base) => base.armourWeight !== null))],
    [t('Jewellery and belts'), itemLinks(allowedItems.filter((base) => base.armourWeight === null && !['mainHand', 'offHand'].includes(base.slot)))],
  ]));
}

function promotionPanel(game: GameIndex, heroClass: HeroClass): Html {
  const advancements = game.advancementsOfClass(heroClass.id);
  const branches = advancements.filter((advancement) => advancement.promotesFrom === heroClass.id);
  const rows = branches.flatMap((branch) => {
    const master = advancements.find((advancement) => advancement.promotesFrom === branch.id);
    return [
      [branch.displayName, t('Branch, level {level}', { level: branch.requiredLevel }), branch.roleDescription],
      ...(master ? [[master.displayName, t('Master, level {level}', { level: master.requiredLevel }), master.roleDescription]] : []),
    ];
  });
  return panel(t('Promotions'), html`${promotionNote()}${dataTable([t('Class'), t('Step'), t('Role')], rows)}`);
}

function classPage(game: GameIndex, text: GameText, heroClass: HeroClass): Page {
  const damageStat = text.statName(heroClass.attackKind === 'magic' ? 'magicalDamage' : 'physicalDamage');
  const body = html`
    ${pageHeading(heroClass.displayName, heroClass.roleDescription)}
    <div class="portrait">${pixelArt('heroes', heroClass.id, heroClass.displayName, 6)}</div>
    ${loreText(text.find(`class.${heroClass.id}.lore`))}
    ${panel(t('Overview'), definitionList([
      [t('Hired'), heroClass.unlockAfterDungeonId
        ? tHtml('After you clear {dungeon}', { dungeon: siteLink(`dungeons/${heroClass.unlockAfterDungeonId}.html`, unlockDungeonName(game, heroClass)!) })
        : t('From the start')],
      [t('Attack type'), tHtml('{kind} uses {damage}', { kind: badge(t(heroClass.attackKind), heroClass.attackKind), damage: damageStat })],
      [t('Combat role'), siteLink('abilities/index.html', t(heroClass.behavior))],
      [t('Armour'), capitalised(armourWeightList(text, heroClass))],
      [t('Resource'), text.require(`resource.${heroClass.resourceId}`)],
      [t('Recovery rate'), `${heroClass.recoveryRate}x`],
    ]))}
    ${panel(t('Stats by level'), levelCalculator(game, text, heroClass))}
    ${panel(t('Spells'), html`<p>${tHtml('Learned at the {academy}. A hero fights with {count} spells and 1 ultimate.', { academy: siteLink('abilities/index.html#spells', t('Academy')), count: balanceNumber(game.data, 'spells', 'normalSlotCount') })}</p>${spellTable(game, text, heroClass)}`)}
    ${gearPanel(game, text, heroClass)}
    ${game.advancementsOfClass(heroClass.id).length ? promotionPanel(game, heroClass) : null}`;
  return { path: classPath(heroClass), title: heroClass.displayName, section: 'heroes', body, searchKind: t('Hero'), searchKeywords: `${heroClass.roleDescription} ${game.advancementsOfClass(heroClass.id).map((advancement) => advancement.displayName).join(' ')}` };
}

export function buildHeroPages(game: GameIndex, text: GameText): Page[] {
  return [indexPage(game, text), ...game.data.classes.map((heroClass) => classPage(game, text, heroClass))];
}
