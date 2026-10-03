import { balanceNumber, balanceValue } from '../data/balance';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { commaList, dataTable, definitionList, pageHeading, panel, siteLink } from '../render/components';
import { formatDuration, formatMoney, formatPercent } from '../render/format';
import { html } from '../render/html';
import type { Page } from '../render/page';

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

  const body = html`
    ${pageHeading('Mechanics', 'The numbers behind the game. They are read from the game data, so they stay current.')}
    ${panel('Experience', html`
      <ul>
        <li>Experience to the next level = ${progression('experienceToNextLevelBase')} x level to the power ${progression('experienceToNextLevelExponent')}.</li>
        <li>Level cap: ${progression('levelCap')}.</li>
        <li>A monster far above the hero gives more experience, and one far below gives less. The factor changes by ${formatPercent(progression('levelGapStep'))} for each level of difference, between ${progression('levelGapFactorMinimum')}x and ${progression('levelGapFactorMaximum')}x.</li>
      </ul>
      <p>A hero below level ${progression('earlyExperienceFadeLevels') + 1} gets a bonus. It is +${formatPercent(progression('earlyExperienceBonus'))} at level 1 and fades in a straight line to nothing.</p>
      ${dataTable(['Monster rank', 'Experience'], ranks.map((rank) => [rank, `${rankMultiplier('experienceRankMultiplier', 'progression')[rank]}x`]))}`)}
    ${panel('Money', html`
      ${definitionList([
        ['Exchange', `${economy('copperPerSilver')} copper = 1 silver, ${economy('silverPerGold')} silver = 1 gold`],
        ['Starting money', formatMoney(economy('startingCopper'))],
        ['Income', 'Monsters drop materials, not coin. Sell materials and gear to the merchant.'],
        ['Crafter fee', `${formatMoney(crafting('craftFeeBaseCopper'))} plus ${crafting('craftFeePerRequiredLevelCopper')} copper per required level, paid for every crafted item`],
        ['Merchant sale slots', economy('merchantSaleSlots')],
        ['Sale time', `${economy('saleSecondsMinimum')}s plus ${economy('saleSecondsPerCopper')}s per copper, up to ${economy('saleSecondsMaximum')}s`],
      ])}
      <h3>Hiring heroes</h3>
      ${dataTable(['Heroes already in company', 'Cost of the next hero'], hireCosts.map((cost, index) => [index, cost === 0 ? 'Free' : formatMoney(cost, economy('copperPerSilver'), economy('silverPerGold'))]))}
      <p>The company holds up to ${economy('maximumCompanySize')} heroes.</p>`)}
    ${panel('Bank', html`
      <p>The Bank sells storage upgrades and tools. Each storage upgrade costs more than the one before.</p>
      <h3>Backpack space</h3>
      <p>Each upgrade adds ${balanceNumber(d, 'backpack', 'rowsPerExpansion')} row of ${balanceNumber(d, 'backpack', 'columns')} cells. Cost = ${balanceNumber(d, 'backpack', 'expansionBaseCostCopper')} copper x ${balanceNumber(d, 'backpack', 'expansionCostGrowth')} to the power of the upgrades already bought.</p>
      ${dataTable(['Upgrade', 'Cost'], mergeCosts(backpackCosts))}
      <h3>Merchant sale slots</h3>
      <p>Each upgrade lets the merchant sell one more good at once.</p>
      ${dataTable(['Upgrade', 'Cost'], mergeCosts(merchantSlotCosts))}
      <h3>Tools</h3>
      <p>One purchase each. The game text of each tool is shown below.</p>
      ${dataTable(['Tool', 'What it does', 'Cost'], Object.entries(bankUnlockCosts).map(([unlockId, cost]) => [text.require(`bank.unlock.${unlockId}.title`), text.require(`bank.unlock.${unlockId}.description`), formatMoney(cost, economy('copperPerSilver'), economy('silverPerGold'))]))}`)}
    ${panel('Mill', html`<p>${text.require('mill.hint')}</p>${definitionList([
      ['Production time', formatDuration(mill('productionIntervalSeconds'))],
      ['Storage', `${mill('storageCapacity')} places`],
      ['Materials it makes', commaList(millMaterialIds.map((materialId) => siteLink(`materials/${materialId}.html`, game.material(materialId).name)))],
    ])}`)}
    ${panel('Crafting quality', html`
      ${dataTable(['', ...qualityIds], [
        ['Odds', ...qualityIds.map((id) => formatPercent((qualityWeights[id] ?? 0) / qualityTotal))],
        ['Sell value factor', ...qualityIds.map((id) => `${sellFactors[id] ?? '-'}x`)],
      ])}
      <ul>
        <li>A crafted item rolls its item level twice and keeps the higher one (${balanceNumber(d, 'items', 'itemLevelRollsKeepHighest')} rolls).</li>
        <li>Base stats grow by ${formatPercent(balanceNumber(d, 'items', 'baseStatGrowthPerItemLevel'))} for each item level. Speed does not grow.</li>
        <li>Sell value grows by ${formatPercent(balanceNumber(d, 'items', 'sellGrowthPerItemLevel'))} for each item level.</li>
      </ul>`)}
    ${panel('Recovery', definitionList([
      ['Time to full health', `${formatDuration(recovery('regenSecondsToFullAtLevelOne'))} at level 1, growing in a straight line to ${formatDuration(recovery('regenSecondsToFullAtMaxLevel'))} at the level cap. Divided by the class recovery rate.`],
      ['Knocked-out hero returns after', `${recovery('reviveBaseSeconds')}s plus ${recovery('reviveSecondsPerLevel')}s per level, divided by the class recovery rate`],
      ['Health on return', formatPercent(recovery('reviveHealthFraction'))],
    ]))}
    ${panel('Hero sheet', html`
      <ul>
        <li>Class resources (mana, stamina, hatred, rage) are on the ${siteLink('abilities/index.html#resources', 'Abilities')} page.</li>
        <li>${text.statName('physicalDamage')} = ${text.statName('strength')} + the physical damage of worn gear.</li>
        <li>${text.statName('magicalDamage')} = ${text.statName('magic')} + the magical damage of worn gear.</li>
      </ul>`)}
    ${panel('Backpack', definitionList([
      ['Grid at the start', `${balanceNumber(d, 'backpack', 'columns')} x ${balanceNumber(d, 'backpack', 'rows')}`],
      ['Rows added by each upgrade', balanceNumber(d, 'backpack', 'rowsPerExpansion')],
      ['Upgrades for sale', backpackCosts.length],
    ]))}`;
  return [{ path: 'mechanics/index.html', title: 'Mechanics', section: 'mechanics', body }];
}
