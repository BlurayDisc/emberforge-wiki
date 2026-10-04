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
  const unlockLine = heroClass.unlockAfterDungeonId
    ? t('Opens after you clear {dungeon}.', { dungeon: unlockDungeonName(game, heroClass)! })
    : t('Open from the start');
  return card(classPath(heroClass), heroClass.displayName, [
    heroClass.roleDescription,
    t('{weight} armour', { weight: armourWeightList(text, heroClass) }),
    t('{resource}, primary attribute {attribute}', { resource: text.require(`resource.${heroClass.resourceId}`), attribute: text.statName(heroClass.primaryAttribute) }),
    unlockLine,
  ], undefined, pixelArt('heroes', heroClass.id, heroClass.displayName, 2));
}

function unlockDungeonName(game: GameIndex, heroClass: HeroClass): string | null {
  return heroClass.unlockAfterDungeonId ? game.dungeon(heroClass.unlockAfterDungeonId).name : null;
}

function indexPage(game: GameIndex, text: GameText): Page {
  const statIds = orderedStatIds(game.data.classes.flatMap((heroClass) => Object.keys(heroClass.baseStats)));
  const body = html`
    ${pageHeading(t('Heroes'), t('Your company is made of heroes. Each class fights in its own way.'))}
    ${jumpLinks([
      { anchor: 'classes', label: t('Classes') },
      { anchor: 'promotions', label: t('Promotions') },
      { anchor: 'stats', label: t('Stats side by side') },
    ])}
    ${panel(t('Classes'), cardGrid(game.data.classes.map((heroClass) => heroCard(game, text, heroClass))), { anchor: 'classes' })}
    ${panel(t('Promotions'), promotionTrees(game), { anchor: 'promotions' })}
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

// The game has no picture for an advanced class yet, so every step shows the picture of the base class in a frame of its tier.
function advanceNode(heroClass: HeroClass, tier: 'base' | 'branch' | 'master', name: string | Html, detail: string, role: string): Html {
  return html`<span class="advance-node advance-${tier}">
    <span class="advance-icon">${pixelArt('heroes', heroClass.id, heroClass.displayName, 2)}</span>
    <span class="advance-text"><strong>${name}</strong><span class="advance-level">${detail}</span><span class="advance-role">${role}</span></span>
  </span>`;
}

// A path from the base class that splits into the branches, and a branch continues to its master class. The data chains them by "promotesFrom".
export function promotionTree(game: GameIndex, heroClass: HeroClass): Html {
  const advancements = game.advancementsOfClass(heroClass.id);
  const branches = advancements.filter((advancement) => advancement.promotesFrom === heroClass.id);
  const branchRows = branches.map((branch) => {
    const masters = advancements.filter((advancement) => advancement.promotesFrom === branch.id);
    const masterColumn = masters.length
      ? html`<span class="advance-link"></span><span class="advance-masters">${masters.map((master) => advanceNode(heroClass, 'master', master.displayName, t('Master, level {level}', { level: master.requiredLevel }), master.roleDescription))}</span>`
      : null;
    return html`<li class="advance-row">${advanceNode(heroClass, 'branch', branch.displayName, t('Branch, level {level}', { level: branch.requiredLevel }), branch.roleDescription)}${masterColumn}</li>`;
  });
  const baseNode = advanceNode(heroClass, 'base', siteLink(classPath(heroClass), heroClass.displayName), t('Base class'), heroClass.roleDescription);
  return html`<div class="tree-scroll"><div class="advance-path">${baseNode}${branches.length ? html`<span class="advance-trunk"></span><ul class="advance-fork">${branchRows}</ul>` : null}</div></div>`;
}

function promotionTrees(game: GameIndex): Html {
  const classesWithPromotions = game.data.classes.filter((heroClass) => game.advancementsOfClass(heroClass.id).length > 0);
  return html`${promotionNote()}${classesWithPromotions.map((heroClass) => html`<h3 class="group-heading">${heroClass.displayName}</h3>${promotionTree(game, heroClass)}`)}`;
}

const ATTRIBUTE_IDS = ['strength', 'skill', 'magic'];
const MAIN_STAT_IDS = ['hp', 'defence', 'resistance', 'speed'];

// The base is the value at level 1. A hero gains the per level number with each level (same formula as heroStatAtLevel).
function attributePanel(game: GameIndex, text: GameText, heroClass: HeroClass): Html {
  const levelCap = balanceNumber(game.data, 'progression', 'levelCap');
  const statRow = (statId: string) => {
    const isPrimary = statId === heroClass.primaryAttribute;
    const name = isPrimary ? html`${text.statName(statId)} <span class="muted">(${t('primary')})</span>` : html`${text.statName(statId)}`;
    return [
      name,
      formatNumber(heroClass.baseStats[statId] ?? 0),
      `+${formatNumber(heroClass.growthPerLevel[statId] ?? 0)}`,
      heroStatAtLevel(heroClass.baseStats[statId] ?? 0, heroClass.growthPerLevel[statId] ?? 0, levelCap),
    ];
  };
  const headers = (firstColumn: string) => [firstColumn, t('Base (level 1)'), t('Gain per level'), t('At level {level}', { level: levelCap })];
  return html`
    <p>${t('The {attribute} of this class is its primary attribute. Each point adds 1 {damage}.', { attribute: text.statName(heroClass.primaryAttribute), damage: text.statName(heroClass.attackKind === 'magic' ? 'magicalDamage' : 'physicalDamage') })}</p>
    ${dataTable(headers(t('Attribute')), ATTRIBUTE_IDS.map(statRow))}
    ${dataTable(headers(t('Main stat')), MAIN_STAT_IDS.map(statRow))}
    <p class="muted">${tHtml('Value at a level = base + gain x (level - 1). See {link} for what each attribute does.', { link: siteLink('mechanics/index.html#attributes', t('Mechanics')) })}</p>`;
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
      [t('Combat role'), siteLink('mechanics/index.html#roles', t(heroClass.behavior))],
      [t('Armour'), capitalised(armourWeightList(text, heroClass))],
      [t('Resource'), text.require(`resource.${heroClass.resourceId}`)],
      [t('Recovery rate'), `${heroClass.recoveryRate}x`],
    ]))}
    ${panel(t('Attributes'), attributePanel(game, text, heroClass), { anchor: 'attributes' })}
    ${panel(t('Stats by level'), levelCalculator(game, text, heroClass))}
    ${panel(t('Spells'), html`<p>${tHtml('Learned at the {academy}. A hero fights with {count} spells and 1 ultimate.', { academy: siteLink('buildings/index.html#academy', t('Academy')), count: balanceNumber(game.data, 'spells', 'normalSlotCount') })}</p>${spellTable(game, text, heroClass)}`)}
    ${gearPanel(game, text, heroClass)}
    ${game.advancementsOfClass(heroClass.id).length ? panel(t('Promotions'), html`${promotionNote()}${promotionTree(game, heroClass)}`) : null}`;
  return { path: classPath(heroClass), title: heroClass.displayName, section: 'heroes', body, searchKind: t('Hero'), searchKeywords: `${heroClass.roleDescription} ${game.advancementsOfClass(heroClass.id).map((advancement) => advancement.displayName).join(' ')}` };
}

export function buildHeroPages(game: GameIndex, text: GameText): Page[] {
  return [indexPage(game, text), ...game.data.classes.map((heroClass) => classPage(game, text, heroClass))];
}
