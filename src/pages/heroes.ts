import { balanceNumber } from '../data/balance';
import { ATTRIBUTE_IDS, heroStatsAtLevel } from '../data/gameFormulas';
import type { GameIndex } from '../data/gameIndex';
import type { HeroClass } from '../data/gameData';
import { capitalised, type GameText } from '../data/text';
import { pixelArt } from '../render/art';
import { badge, card, cardGrid, commaList, dataTable, definitionList, jumpLinks, loreText, pageHeading, panel, siteLink } from '../render/components';
import { formatNumber, formatPercent } from '../render/format';
import { armourWeightList, itemLink, sortedForDisplay } from './equipment';
import { spellTable } from './spellTable';
import { html, type Html } from '../render/html';
import type { Page } from '../render/page';
import { t, tHtml } from '../i18n/ui';

const SAMPLE_LEVELS = [1, 5, 10, 20, 50, 100];
const STAT_IDS_OF_HERO = ['hp', 'damage', 'strength', 'agility', 'intelligence', 'defence', 'resistance', 'attackSeconds', 'criticalChance'] as const;
const statValueText = (statId: string, value: number): string => (statId === 'criticalChance' ? `${formatNumber(value)}%` : formatNumber(value));

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
      [t('Class'), ...STAT_IDS_OF_HERO.map((statId) => text.statName(statId))],
      game.data.classes.map((heroClass) => {
        const stats = heroStatsAtLevel(game.data, heroClass, 1);
        return [siteLink(classPath(heroClass), heroClass.displayName), ...STAT_IDS_OF_HERO.map((statId) => statValueText(statId, stats[statId]))];
      }),
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

// The start value and the gain per level of an attribute. The value at a level is round(start + gain x (level - 1)).
function attributePanel(game: GameIndex, text: GameText, heroClass: HeroClass): Html {
  const levelCap = balanceNumber(game.data, 'progression', 'levelCap');
  const atCap = heroStatsAtLevel(game.data, heroClass, levelCap);
  const attributeRows = ATTRIBUTE_IDS.map((attributeId) => {
    const isPrimary = attributeId === heroClass.primaryAttribute;
    const name = isPrimary ? html`${text.statName(attributeId)} <span class="muted">(${t('primary')})</span>` : html`${text.statName(attributeId)}`;
    const { start, gainPerLevel } = heroClass.attributes[attributeId];
    return [name, formatNumber(start), `+${formatNumber(gainPerLevel)}`, atCap[attributeId]];
  });
  const damageStat = text.statName(heroClass.attackKind === 'magic' ? 'magicalDamage' : 'physicalDamage');
  return html`
    <p>${t('The {attribute} of this class is its primary attribute. Each point adds 1 {damage}.', { attribute: text.statName(heroClass.primaryAttribute), damage: damageStat })}</p>
    ${dataTable([t('Attribute'), t('Start (level 1)'), t('Gain per level'), t('At level {level}', { level: levelCap })], attributeRows)}
    ${definitionList([
      [text.statName('hp'), t('{base} + {perStrength} x {strength}', { base: heroClass.baseHp, perStrength: balanceNumber(game.data, 'hero-stats', 'hpPerStrength'), strength: text.statName('strength') })],
      [text.statName('damage'), t('{base} + {attribute} + weapon', { base: heroClass.baseDamage, attribute: text.statName(heroClass.primaryAttribute) })],
      [text.statName('defence'), t('{base}. No attribute and no level adds to it.', { base: heroClass.baseDefence })],
      [text.statName('resistance'), t('{base} + {perIntelligence} x {intelligence}', { base: heroClass.baseResistance, perIntelligence: balanceNumber(game.data, 'hero-stats', 'resistancePerIntelligence'), intelligence: text.statName('intelligence') })],
      [text.statName('attackSeconds'), t('{base}s divided by (1 + {agility} x {perAgility} + gear)', { base: heroClass.baseAttackSeconds, agility: text.statName('agility'), perAgility: balanceNumber(game.data, 'hero-stats', 'attackSpeedBonusPerAgility') })],
      [text.statName('criticalChance'), t('{base} + {bonus} for this class + gear', { base: formatPercent(balanceNumber(game.data, 'battle', 'baseCriticalChance')), bonus: formatPercent(heroClass.criticalChanceBonus) })],
    ])}
    <p class="muted">${tHtml('See {link} for what each attribute does.', { link: siteLink('mechanics/index.html#attributes', t('Mechanics')) })}</p>`;
}

// The page holds the stats of every level, so the slider needs no formula in the browser.
function levelCalculator(game: GameIndex, text: GameText, heroClass: HeroClass): Html {
  const levelCap = balanceNumber(game.data, 'progression', 'levelCap');
  const sampleLevels = [...new Set([...SAMPLE_LEVELS.filter((level) => level <= levelCap), levelCap])];
  const statsOfLevel = Object.fromEntries(Array.from({ length: levelCap }, (_, index) => {
    const stats = heroStatsAtLevel(game.data, heroClass, index + 1);
    return [index + 1, Object.fromEntries(STAT_IDS_OF_HERO.map((statId) => [statId, statValueText(statId, stats[statId])]))];
  }));
  const statRows = STAT_IDS_OF_HERO.map((statId) => [text.statName(statId), ...sampleLevels.map((level) => statsOfLevel[level]![statId]!)]);
  return html`
    ${dataTable([t('Stat'), ...sampleLevels.map((level) => t('Lv {level}', { level }))], statRows)}
    <div class="level-calc" data-calc='${JSON.stringify(statsOfLevel)}'>
      <label>${t('Pick a level:')} <input type="range" min="1" max="${levelCap}" value="1" data-calc-level> <strong data-calc-level-label>1</strong></label>
      <ul class="calc-output">${STAT_IDS_OF_HERO.map((statId) => html`<li><span>${text.statName(statId)}</span><strong data-calc-stat="${statId}">${statsOfLevel[1]![statId]}</strong></li>`)}</ul>
      <p class="muted">${t('Stats are before gear. Weapon damage is not included.')}</p>
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
      [t('Balance status'), heroClass.balanceStatus === 'placeholder' ? t('Placeholder numbers, waiting for a balance pass') : t('Balanced')],
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
