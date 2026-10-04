import { balanceNumber, balanceValue } from '../data/balance';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { commaList, dataTable, definitionList, jumpLinks, pageHeading, panel, siteLink } from '../render/components';
import { formatDuration, formatMoney } from '../render/format';
import { html } from '../render/html';
import { t, tHtml } from '../i18n/ui';
import type { Page } from '../render/page';

// The services of the town and their prices. Each panel is one building of the game.
export function buildBuildingPages(game: GameIndex, text: GameText): Page[] {
  const d = game.data;
  const economy = (key: string) => balanceNumber(d, 'economy', key);
  const crafting = (key: string) => balanceNumber(d, 'crafting', key);
  const mill = (key: string) => balanceNumber(d, 'mill', key);
  const spells = (key: string) => balanceNumber(d, 'spells', key);
  const money = (copper: number) => formatMoney(copper, economy('copperPerSilver'), economy('silverPerGold'));
  const upgradeRows = (costs: number[]) => costs.map((cost, index) => [index + 1, money(cost)]);
  const hireCosts = balanceValue<number[]>(d, 'economy', 'heroHireCostByCompanySize');
  const merchantSlotCosts = balanceValue<number[]>(d, 'economy', 'merchantExtraSlotCostsCopper');
  const bankUnlockCosts = balanceValue<Record<string, number>>(d, 'economy', 'bankUnlockCostsCopper');
  const millMaterialIds = balanceValue<string[]>(d, 'mill', 'producedMaterialIds');
  const millSpeedIntervals = balanceValue<number[]>(d, 'mill', 'productionIntervalSecondsBySpeedUpgrade');
  const millSpeedCosts = balanceValue<number[]>(d, 'mill', 'speedUpgradeCostsCopper');
  const millStorageCosts = balanceValue<number[]>(d, 'mill', 'storageCapacityUpgradeCostsCopper');
  const backpackCosts = Array.from({ length: balanceNumber(d, 'backpack', 'maximumExpansions') }, (_, expansionsBought) =>
    // Same formula as the backpack expansion cost in the game.
    Math.round(balanceNumber(d, 'backpack', 'expansionBaseCostCopper') * balanceNumber(d, 'backpack', 'expansionCostGrowth') ** expansionsBought));

  const body = html`
    ${pageHeading(t('Buildings'), t('The services of the town and what each one costs. The numbers are read from the game data.'))}
    ${jumpLinks([
      { anchor: 'tavern', label: text.require('building.tavern') },
      { anchor: 'merchant', label: text.require('building.merchant') },
      { anchor: 'workshop', label: text.require('building.workshop') },
      { anchor: 'bank', label: text.require('building.bank') },
      { anchor: 'mill', label: text.require('building.mill') },
      { anchor: 'academy', label: text.require('building.academy') },
    ])}
    ${panel(text.require('building.tavern'), html`
      <p>${t('Heroes are hired here. The first hero is free, and each next hero costs more.')}</p>
      ${dataTable([t('Heroes already in company'), t('Cost of the next hero')], hireCosts.map((cost, index) => [index, cost === 0 ? t('Free') : money(cost)]))}
      <p>${t('The company holds up to {count} heroes.', { count: economy('maximumCompanySize') })}</p>`, { anchor: 'tavern' })}
    ${panel(text.require('building.merchant'), html`
      <p>${t('The merchant buys materials and gear. A sale takes time, and the merchant sells a limited number of goods at once.')}</p>
      ${definitionList([
        [t('Merchant sale slots'), economy('merchantSaleSlots')],
        [t('Sale time'), t('{minimum}s plus {perCopper}s per copper, up to {maximum}s', { minimum: economy('saleSecondsMinimum'), perCopper: economy('saleSecondsPerCopper'), maximum: economy('saleSecondsMaximum') })],
      ])}
      <p>${tHtml('More sale slots are sold at the {bank}.', { bank: siteLink('buildings/index.html#bank', text.require('building.bank')) })}</p>`, { anchor: 'merchant' })}
    ${panel(text.require('building.workshop'), html`
      <p>${tHtml('Crafters make gear here. Recipes, levels and quality are on the {link} pages.', { link: siteLink('crafters/index.html', t('Crafters')) })}</p>
      ${definitionList([
        [t('Crafter fee'), t('{base} plus {perLevel} copper per required level, paid for every crafted item', { base: formatMoney(crafting('craftFeeBaseCopper')), perLevel: crafting('craftFeePerRequiredLevelCopper') })],
        [t('Craft time'), t('{base}s plus {perLevel}s per required level', { base: crafting('craftSecondsBase'), perLevel: crafting('craftSecondsPerRequiredLevel') })],
      ])}`, { anchor: 'workshop' })}
    ${panel(text.require('building.bank'), html`
      <p>${t('The Bank sells storage upgrades and tools. Each storage upgrade costs more than the one before.')}</p>
      <h3>${t('Backpack space')}</h3>
      <p>${t('The backpack starts as a grid of {columns} x {rows} cells.', { columns: balanceNumber(d, 'backpack', 'columns'), rows: balanceNumber(d, 'backpack', 'rows') })}
        ${t('Each upgrade adds {rows} row of {columns} cells. Cost = {base} copper x {growth} to the power of the upgrades already bought.', { rows: balanceNumber(d, 'backpack', 'rowsPerExpansion'), columns: balanceNumber(d, 'backpack', 'columns'), base: balanceNumber(d, 'backpack', 'expansionBaseCostCopper'), growth: balanceNumber(d, 'backpack', 'expansionCostGrowth') })}</p>
      ${dataTable([t('Upgrade'), t('Cost')], upgradeRows(backpackCosts))}
      <h3>${t('Merchant sale slots')}</h3>
      <p>${t('Each upgrade lets the merchant sell one more good at once.')}</p>
      ${dataTable([t('Upgrade'), t('Cost')], upgradeRows(merchantSlotCosts))}
      <h3>${t('Tools')}</h3>
      <p>${t('One purchase each. The game text of each tool is shown below.')}</p>
      ${dataTable([t('Tool'), t('What it does'), t('Cost')], Object.entries(bankUnlockCosts).map(([unlockId, cost]) => [text.require(`bank.unlock.${unlockId}.title`), text.require(`bank.unlock.${unlockId}.description`), money(cost)]))}`, { anchor: 'bank' })}
    ${panel(text.require('building.mill'), html`<p>${text.require('mill.hint')}</p>${definitionList([
      [t('Production time'), t('{time} at the start', { time: formatDuration(millSpeedIntervals[0] ?? 0) })],
      [t('Storage'), t('{count} places at the start', { count: mill('baseStorageCapacity') })],
      [t('Materials it makes'), commaList(millMaterialIds.map((materialId) => siteLink(`materials/${materialId}.html`, game.material(materialId).name)))],
    ])}
      <h3>${text.require('bank.millCapacity.title')}</h3>
      <p>${tHtml('Bought at the {bank}. Each upgrade adds room for 1 more material.', { bank: siteLink('buildings/index.html#bank', t('Bank')) })}</p>
      ${dataTable([t('Upgrade'), t('Storage'), t('Cost')], millStorageCosts.map((cost, index) => [index + 1, t('{count} places', { count: mill('baseStorageCapacity') + index + 1 }), money(cost)]))}
      <h3>${text.require('bank.millSpeed.title')}</h3>
      <p>${tHtml('Bought at the {bank}. Each upgrade makes the mill faster.', { bank: siteLink('buildings/index.html#bank', t('Bank')) })}</p>
      ${dataTable([t('Upgrade'), t('Production time'), t('Cost')], millSpeedCosts.map((cost, index) => [index + 1, formatDuration(millSpeedIntervals[index + 1] ?? 0), money(cost)]))}`, { anchor: 'mill' })}
    ${panel(text.require('building.academy'), html`
      <p>${text.require('academy.intro')}</p>
      ${definitionList([
        [t('Spell price'), t('{base} copper x spell level to the power {exponent}', { base: spells('learnCostBaseCopper'), exponent: spells('learnCostLevelExponent') })],
        [t('Ultimate price'), t('{factor}x the price of a normal spell', { factor: spells('ultimateCostFactor') })],
      ])}
      <p>${tHtml('Every spell and its price is on the {link} page.', { link: siteLink('spells/index.html', t('Spells')) })}</p>`, { anchor: 'academy' })}`;
  return [{ path: 'buildings/index.html', title: t('Buildings'), section: 'buildings', body, searchKind: t('Buildings'), searchKeywords: 'tavern merchant workshop bank mill academy' }];
}
