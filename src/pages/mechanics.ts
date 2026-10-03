import { balanceNumber, balanceValue } from '../data/balance';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { dataTable, definitionList, pageHeading, panel } from '../render/components';
import { formatMoney, formatNumber, formatPercent } from '../render/format';
import { html } from '../render/html';
import type { Page } from '../render/page';

export function buildMechanicsPages(game: GameIndex, _text: GameText): Page[] {
  const d = game.data;
  const economy = (key: string) => balanceNumber(d, 'economy', key);
  const progression = (key: string) => balanceNumber(d, 'progression', key);
  const recovery = (key: string) => balanceNumber(d, 'recovery', key);
  const weights = (key: string) => balanceValue<Record<string, number>>(d, 'items', key);
  const hireCosts = balanceValue<number[]>(d, 'economy', 'heroHireCostByCompanySize');
  const qualityIds = Object.keys(weights('qualityWeightsWithoutCatalyst'));
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
      ${dataTable(['Monster rank', 'Experience', 'Copper'], ranks.map((rank) => [rank, `${rankMultiplier('experienceRankMultiplier', 'progression')[rank]}x`, `${rankMultiplier('copperDropRankMultiplier', 'economy')[rank] ?? '-'}x`]))}`)}
    ${panel('Money', html`
      ${definitionList([
        ['Exchange', `${economy('copperPerSilver')} copper = 1 silver, ${economy('silverPerGold')} silver = 1 gold`],
        ['Copper per kill', `${economy('copperDropBase')} plus ${economy('copperDropPerLevel')} per monster level, times the rank multiplier`],
        ['Merchant buys materials at', `${economy('materialBuyPriceMultiplier')}x their sell value`],
        ['Merchant sale slots', economy('merchantSaleSlots')],
        ['Sale time', `${economy('saleSecondsMinimum')}s plus ${economy('saleSecondsPerCopper')}s per copper, up to ${economy('saleSecondsMaximum')}s`],
      ])}
      <h3>Hiring heroes</h3>
      ${dataTable(['Heroes already in company', 'Cost of the next hero'], hireCosts.map((cost, index) => [index, cost === 0 ? 'Free' : formatMoney(cost, economy('copperPerSilver'), economy('silverPerGold'))]))}
      <p>The company holds up to ${economy('maximumCompanySize')} heroes.</p>`)}
    ${panel('Crafting quality', html`
      ${dataTable(['', ...qualityIds], [
        ['Odds without a catalyst', ...qualityIds.map((id) => weights('qualityWeightsWithoutCatalyst')[id] ?? 0)],
        ['Odds with a catalyst', ...qualityIds.map((id) => weights('qualityWeightsWithCatalyst')[id] ?? 0)],
        ['Sell value factor', ...qualityIds.map((id) => `${sellFactors[id] ?? '-'}x`)],
      ])}
      <p>Numbers are weights. A bigger number means a better chance.</p>
      <ul>
        <li>A crafted item rolls its item level twice and keeps the higher one (${balanceNumber(d, 'items', 'itemLevelRollsKeepHighest')} rolls).</li>
        <li>Base stats grow by ${formatPercent(balanceNumber(d, 'items', 'baseStatGrowthPerItemLevel'))} for each item level.</li>
        <li>Sell value grows by ${formatPercent(balanceNumber(d, 'items', 'sellGrowthPerItemLevel'))} for each item level.</li>
      </ul>`)}
    ${panel('Recovery', definitionList([
      ['Health regained', `${formatPercent(recovery('baseRegenFractionPerMinute'))} of maximum health each minute, times the class recovery rate`],
      ['Knocked-out hero returns after', `${recovery('reviveBaseSeconds')}s plus ${recovery('reviveSecondsPerLevel')}s per level, divided by the class recovery rate`],
      ['Health on return', formatPercent(recovery('reviveHealthFraction'))],
    ]))}
    ${panel('Backpack', definitionList([
      ['Grid', `${balanceNumber(d, 'backpack', 'columns')} x ${balanceNumber(d, 'backpack', 'rows')}`],
      ['Material stack limit', formatNumber(balanceNumber(d, 'backpack', 'materialStackLimit'))],
    ]))}`;
  return [{ path: 'mechanics/index.html', title: 'Mechanics', section: 'mechanics', body }];
}
