import { balanceNumber, balanceValue } from '../data/balance';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { commaList, dataTable, definitionList, pageHeading, panel, siteLink } from '../render/components';
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
      [text.statName('defence'), tHtml('Cuts physical damage taken. The formula is on the {link} page.', { link: siteLink('abilities/index.html#damage', t('Abilities and spells')) })],
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
  const weights = (key: string) => balanceValue<Record<string, number>>(d, 'items', key);
  const hireCosts = balanceValue<number[]>(d, 'economy', 'heroHireCostByCompanySize');
  const qualityWeights = weights('qualityWeights');
  const qualityIds = Object.keys(qualityWeights);
  const qualityTotal = Object.values(qualityWeights).reduce((sum, weight) => sum + weight, 0);
  const mergeCosts = (costs: number[]) => costs.map((cost, index) => [index + 1, formatMoney(cost, economy('copperPerSilver'), economy('silverPerGold'))]);
  const backpackCosts = Array.from({ length: balanceNumber(d, 'backpack', 'maximumExpansions') }, (_, expansionsBought) =>
    // Same formula as the backpack expansion cost in the game.
    Math.round(balanceNumber(d, 'backpack', 'expansionBaseCostCopper') * balanceNumber(d, 'backpack', 'expansionCostGrowth') ** expansionsBought));
  const bankUnlockCosts = balanceValue<Record<string, number>>(d, 'economy', 'bankUnlockCostsCopper');
  const mill = (key: string) => balanceNumber(d, 'mill', key);
  const millMaterialIds = balanceValue<string[]>(d, 'mill', 'producedMaterialIds');
  const merchantSlotCosts = balanceValue<number[]>(d, 'economy', 'merchantExtraSlotCostsCopper');
  const crafting = (key: string) => balanceNumber(d, 'crafting', key);
  const sellFactors = weights('sellQualityFactor');
  const rankMultiplier = (key: string, fileName: string) => balanceValue<Record<string, number>>(d, fileName, key);
  const ranks = Object.keys(rankMultiplier('experienceRankMultiplier', 'progression'));

  const money = (copper: number) => formatMoney(copper, economy('copperPerSilver'), economy('silverPerGold'));
  const body = html`
    ${pageHeading(t('Mechanics'), t('The numbers behind the game. They are read from the game data, so they stay current.'))}
    ${attributesPanel(game, text)}
    ${panel(t('Experience'), html`
      <ul>
        <li>${t('Experience to the next level = {base} x level to the power {exponent}.', { base: progression('experienceToNextLevelBase'), exponent: progression('experienceToNextLevelExponent') })}</li>
        <li>${t('Level cap: {level}.', { level: progression('levelCap') })}</li>
        <li>${t('Kills per level = {base} + {growth} x hero level.', { base: progression('killsPerLevelBase'), growth: progression('killsPerLevelGrowth') })}</li>
        <li>${t('A kill gives (experience to the next level / kills per level) x the level gap factor x the rank multiplier below.')}</li>
        <li>${t('A monster far above the hero gives more experience, and one far below gives less. The factor changes by {percent} for each level of difference, between {minimum}x and {maximum}x.', { percent: formatPercent(progression('levelGapStep')), minimum: progression('levelGapFactorMinimum'), maximum: progression('levelGapFactorMaximum') })}</li>
      </ul>
      ${dataTable([t('Monster rank'), t('Experience')], ranks.map((rank) => [t(rank), `${rankMultiplier('experienceRankMultiplier', 'progression')[rank]}x`]))}`)}
    ${panel(t('Money'), html`
      ${definitionList([
        [t('Exchange'), t('{copper} copper = 1 silver, {silver} silver = 1 gold', { copper: economy('copperPerSilver'), silver: economy('silverPerGold') })],
        [t('Starting money'), formatMoney(economy('startingCopper'))],
        [t('Income'), t('Monsters drop materials, not coin. Sell materials and gear to the merchant.')],
        [t('Crafter fee'), t('{base} plus {perLevel} copper per required level, paid for every crafted item', { base: formatMoney(crafting('craftFeeBaseCopper')), perLevel: crafting('craftFeePerRequiredLevelCopper') })],
        [t('Merchant sale slots'), economy('merchantSaleSlots')],
        [t('Sale time'), t('{minimum}s plus {perCopper}s per copper, up to {maximum}s', { minimum: economy('saleSecondsMinimum'), perCopper: economy('saleSecondsPerCopper'), maximum: economy('saleSecondsMaximum') })],
      ])}
      <h3>${t('Hiring heroes')}</h3>
      ${dataTable([t('Heroes already in company'), t('Cost of the next hero')], hireCosts.map((cost, index) => [index, cost === 0 ? t('Free') : money(cost)]))}
      <p>${t('The company holds up to {count} heroes.', { count: economy('maximumCompanySize') })}</p>`)}
    ${panel(t('Bank'), html`
      <p>${t('The Bank sells storage upgrades and tools. Each storage upgrade costs more than the one before.')}</p>
      <h3>${t('Backpack space')}</h3>
      <p>${t('Each upgrade adds {rows} row of {columns} cells. Cost = {base} copper x {growth} to the power of the upgrades already bought.', { rows: balanceNumber(d, 'backpack', 'rowsPerExpansion'), columns: balanceNumber(d, 'backpack', 'columns'), base: balanceNumber(d, 'backpack', 'expansionBaseCostCopper'), growth: balanceNumber(d, 'backpack', 'expansionCostGrowth') })}</p>
      ${dataTable([t('Upgrade'), t('Cost')], mergeCosts(backpackCosts))}
      <h3>${t('Merchant sale slots')}</h3>
      <p>${t('Each upgrade lets the merchant sell one more good at once.')}</p>
      ${dataTable([t('Upgrade'), t('Cost')], mergeCosts(merchantSlotCosts))}
      <h3>${t('Tools')}</h3>
      <p>${t('One purchase each. The game text of each tool is shown below.')}</p>
      ${dataTable([t('Tool'), t('What it does'), t('Cost')], Object.entries(bankUnlockCosts).map(([unlockId, cost]) => [text.require(`bank.unlock.${unlockId}.title`), text.require(`bank.unlock.${unlockId}.description`), money(cost)]))}`)}
    ${panel(t('Mill'), html`<p>${text.require('mill.hint')}</p>${definitionList([
      [t('Production time'), formatDuration(mill('productionIntervalSeconds'))],
      [t('Storage'), t('{count} places', { count: mill('storageCapacity') })],
      [t('Materials it makes'), commaList(millMaterialIds.map((materialId) => siteLink(`materials/${materialId}.html`, game.material(materialId).name)))],
    ])}`)}
    ${panel(t('Crafting quality'), html`
      ${dataTable(['', ...qualityIds.map((id) => t(id))], [
        [t('Odds'), ...qualityIds.map((id) => formatPercent((qualityWeights[id] ?? 0) / qualityTotal))],
        [t('Sell value factor'), ...qualityIds.map((id) => `${sellFactors[id] ?? '-'}x`)],
      ])}
      <ul>
        <li>${t('A crafted item rolls its item level twice and keeps the higher one ({rolls} rolls).', { rolls: balanceNumber(d, 'items', 'itemLevelRollsKeepHighest') })}</li>
        <li>${t('Base stats grow by {percent} for each item level. Speed does not grow.', { percent: formatPercent(balanceNumber(d, 'items', 'baseStatGrowthPerItemLevel')) })}</li>
        <li>${t('Sell value grows by {percent} for each item level.', { percent: formatPercent(balanceNumber(d, 'items', 'sellGrowthPerItemLevel')) })}</li>
      </ul>`)}
    ${panel(t('Recovery'), definitionList([
      [t('Time to full health'), t('{start} at level 1, growing in a straight line to {end} at the level cap. Divided by the class recovery rate.', { start: formatDuration(recovery('regenSecondsToFullAtLevelOne')), end: formatDuration(recovery('regenSecondsToFullAtMaxLevel')) })],
      [t('Knocked-out hero returns after'), t('{base}s plus {perLevel}s per level, divided by the class recovery rate', { base: recovery('reviveBaseSeconds'), perLevel: recovery('reviveSecondsPerLevel') })],
      [t('Health on return'), formatPercent(recovery('reviveHealthFraction'))],
    ]))}
    ${panel(t('Backpack'), definitionList([
      [t('Grid at the start'), `${balanceNumber(d, 'backpack', 'columns')} x ${balanceNumber(d, 'backpack', 'rows')}`],
      [t('Rows added by each upgrade'), balanceNumber(d, 'backpack', 'rowsPerExpansion')],
      [t('Upgrades for sale'), backpackCosts.length],
    ]))}`;
  return [{ path: 'mechanics/index.html', title: t('Mechanics'), section: 'mechanics', body }];
}
