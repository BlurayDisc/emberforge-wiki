import { balanceNumber, balanceValue } from '../data/balance';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { commaList, dataTable, definitionList, jumpLinks, pageHeading, panel, siteLink } from '../render/components';
import { combatRulePanels } from './combatRules';
import { formatDuration, formatMoney, formatPercent } from '../render/format';
import { html, type Html } from '../render/html';
import { t, tHtml } from '../i18n/ui';
import type { HeroClass } from '../data/gameData';
import type { Page } from '../render/page';

const ATTRIBUTE_IDS = ['strength', 'skill', 'magic'];

interface ResourceRules {
  attribute: string;
  maximumPerAttributePoint: number;
}

// The three attributes are the core of a hero. This panel explains what each one does and which classes lean on it.
function attributesPanel(game: GameIndex, text: GameText): Html {
  const d = game.data;
  const battle = (key: string) => balanceNumber(d, 'battle', key);
  const classLinks = (classes: HeroClass[]) => commaList(classes.map((heroClass) => siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName)));
  const resourceRules = Object.keys(d.balance['resources'] ?? {}).map((resourceId) => ({ resourceId, rules: balanceValue<ResourceRules>(d, 'resources', resourceId) }));
  const attributeRows = ATTRIBUTE_IDS.map((attributeId) => {
    const primaryClasses = d.classes.filter((heroClass) => heroClass.primaryAttribute === attributeId);
    const attackKinds = [...new Set(primaryClasses.map((heroClass) => heroClass.attackKind))];
    const damageStatNames = attackKinds.map((kind) => text.statName(kind === 'magic' ? 'magicalDamage' : 'physicalDamage'));
    const poolsGrownByAttribute = resourceRules.filter(({ rules }) => rules.attribute === attributeId);
    const effects = html`<ul>
      ${primaryClasses.length ? html`<li>${t('Primary attribute: every point adds 1 {damage} to the classes that use it as primary.', { damage: damageStatNames.join(t(' or ')) })}</li>` : null}
      ${attributeId === 'strength' ? html`<li>${t('The {damage} of a magic class is its {attribute}.', { damage: text.statName('physicalDamage'), attribute: text.statName('strength') })}</li>` : null}
      ${attributeId === 'skill' ? html`<li>${t('Critical chance = {attribute} x {perPoint}, up to {maximum}. This is true for every class.', { attribute: text.statName('skill'), perPoint: formatPercent(battle('criticalChancePerSkillPoint')), maximum: formatPercent(battle('maximumCriticalChance')) })}</li>` : null}
      ${poolsGrownByAttribute.map(({ resourceId, rules }) => html`<li>${t('Each point adds {amount} to the maximum {resource}.', { amount: rules.maximumPerAttributePoint, resource: text.require(`resource.${resourceId}`) })}</li>`)}
    </ul>`;
    return [text.statName(attributeId), effects, primaryClasses.length ? classLinks(primaryClasses) : html`<span class="muted">${t('none')}</span>`];
  });
  const classRows = d.classes.map((heroClass) => {
    const damageStatId = heroClass.attackKind === 'magic' ? 'magicalDamage' : 'physicalDamage';
    const resourceAttribute = resourceRules.find(({ resourceId }) => resourceId === heroClass.resourceId)?.rules.attribute;
    return [
      siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName),
      text.statName(heroClass.primaryAttribute),
      t('{damage} = {attribute} + weapon', { damage: text.statName(damageStatId), attribute: text.statName(heroClass.primaryAttribute) }),
      `${text.require(`resource.${heroClass.resourceId}`)}${resourceAttribute ? ` (${text.statName(resourceAttribute)})` : ''}`,
    ];
  });
  return panel(t('Attributes'), html`
    <p>${t('Every hero has three attributes: {strength}, {agility} and {intelligence}. Each class has one primary attribute. It sets the damage of the hero, so it is the stat to look for on gear.', { strength: text.statName('strength'), agility: text.statName('skill'), intelligence: text.statName('magic') })}</p>
    ${dataTable([t('Attribute'), t('What it does'), t('Primary for')], attributeRows)}
    <h3>${t('Attributes of each class')}</h3>
    ${dataTable([t('Class'), t('Primary attribute'), t('Attack damage'), t('Spell resource (grows with)')], classRows)}
    <h3>${t('Main stats')}</h3>
    ${definitionList([
      [text.statName('hp'), t('The life of the hero. A hero at zero is knocked out.')],
      [text.statName('defence'), tHtml('Cuts physical damage taken. The formula is under {link}.', { link: siteLink('mechanics/index.html#damage', t('Damage and criticals')) })],
      [text.statName('resistance'), t('Cuts magical damage taken in the same way.')],
      [text.statName('speed'), t('How fast the charge meter fills, so how often the hero acts.')],
    ])}
    <p class="muted">${t('Gear adds to every attribute and stat. Weapons also add damage of their own.')}</p>`, { anchor: 'attributes' });
}

export function buildMechanicsPages(game: GameIndex, text: GameText): Page[] {
  const d = game.data;
  const economy = (key: string) => balanceNumber(d, 'economy', key);
  const progression = (key: string) => balanceNumber(d, 'progression', key);
  const recovery = (key: string) => balanceNumber(d, 'recovery', key);
  const rankMultiplier = (key: string, fileName: string) => balanceValue<Record<string, number>>(d, fileName, key);
  const experienceToNextLevel = balanceValue<number[]>(d, 'progression', 'experienceToNextLevelByLevel');
  const killExperience = balanceValue<number[][]>(d, 'progression', 'normalKillExperienceByHeroLevelThenMonsterLevel');
  const ranks = Object.keys(rankMultiplier('experienceRankMultiplier', 'progression'));

  const body = html`
    ${pageHeading(t('Mechanics'), t('The rules and numbers behind the game. They are read from the game data, so they stay current.'))}
    ${jumpLinks([
      { anchor: 'attributes', label: t('Attributes') },
      { anchor: 'roles', label: t('Combat roles') },
      { anchor: 'damage', label: t('Damage and criticals') },
      { anchor: 'special-rules', label: t('Dodging, shields and burning') },
      { anchor: 'statuses', label: t('Statuses') },
      { anchor: 'resources', label: t('Class resources') },
      { anchor: 'experience', label: t('Experience') },
      { anchor: 'money', label: t('Money') },
      { anchor: 'recovery', label: t('Recovery') },
    ])}
    ${attributesPanel(game, text)}
    ${combatRulePanels(game, text)}
    ${panel(t('Experience'), html`
      <ul>
        <li>${t('Level cap: {level}.', { level: progression('levelCap') })}</li>
        <li>${t('The first {count} levels use the tables below. After that, experience to the next level = the last number in the first table x (level / {count}) to the power {exponent}.', { count: experienceToNextLevel.length, exponent: progression('experienceToNextLevelExponentAfterTable') })}</li>
        <li>${t('A normal monster gives the number in the second table. A monster above the hero level pays like a monster of the hero level. There is no level gap factor.')}</li>
        <li>${t('A rare monster or a boss gives the number of a normal monster x the rank multiplier below.')}</li>
      </ul>
      <h3>${t('Experience to the next level')}</h3>
      ${dataTable([t('Hero level'), t('Experience')], experienceToNextLevel.map((experience, index) => [index + 1, experience]))}
      <h3>${t('Experience of a normal kill')}</h3>
      ${dataTable([t('Hero level'), ...experienceToNextLevel.map((_, index) => t('Monster level {level}', { level: index + 1 }))], killExperience.map((row, index) => [index + 1, ...experienceToNextLevel.map((_, monsterIndex) => row[monsterIndex] ?? '')]))}
      <h3>${t('Rank multiplier')}</h3>
      ${dataTable([t('Monster rank'), t('Experience')], ranks.map((rank) => [t(rank), `${rankMultiplier('experienceRankMultiplier', 'progression')[rank]}x`]))}`, { anchor: 'experience' })}
    ${panel(t('Money'), html`
      ${definitionList([
        [t('Exchange'), t('{copper} copper = 1 silver, {silver} silver = 1 gold', { copper: economy('copperPerSilver'), silver: economy('silverPerGold') })],
        [t('Starting money'), formatMoney(economy('startingCopper'))],
        [t('Income'), t('Monsters drop materials, not coin. Sell materials and gear to the merchant.')],
      ])}
      <p>${tHtml('Prices of heroes, spells, storage and sales are on the {link} page.', { link: siteLink('buildings/index.html', t('Buildings')) })}</p>`, { anchor: 'money' })}
    ${panel(t('Recovery'), definitionList([
      [t('Time to full health'), t('{start} at level 1, growing in a straight line to {end} at the level cap. Divided by the class recovery rate.', { start: formatDuration(recovery('regenSecondsToFullAtLevelOne')), end: formatDuration(recovery('regenSecondsToFullAtMaxLevel')) })],
      [t('Knocked-out hero returns after'), t('{base}s plus {perLevel}s per level, divided by the class recovery rate', { base: recovery('reviveBaseSeconds'), perLevel: recovery('reviveSecondsPerLevel') })],
      [t('Health on return'), formatPercent(recovery('reviveHealthFraction'))],
    ]), { anchor: 'recovery' })}`;
  return [{ path: 'mechanics/index.html', title: t('Mechanics'), section: 'mechanics', body }];
}
