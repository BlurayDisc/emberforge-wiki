import type { GameIndex } from '../data/gameIndex';
import { capitalised, type GameText } from '../data/text';
import { dataTable, jumpLinks, pageHeading, panel } from '../render/components';
import { formatSignedValueRange } from '../render/format';
import { html } from '../render/html';
import type { Page } from '../render/page';
import { balanceNumber, balanceValue } from '../data/balance';
import { t } from '../i18n/ui';

export function buildAffixPages(game: GameIndex, text: GameText): Page[] {
  const d = game.data;
  const kindIds = [...new Set(d.affixes.map((affix) => affix.kind))].sort();
  const kindPanels = kindIds.map((kind) => {
    const rows = d.affixes
      .filter((affix) => affix.kind === kind)
      .sort((a, b) => text.statName(a.stat).localeCompare(text.statName(b.stat)) || a.displayName.localeCompare(b.displayName))
      .map((affix) => [affix.displayName, text.statName(affix.stat), formatSignedValueRange(affix.minimumValue, affix.maximumValue)]);
    return panel(t(`${capitalised(kind)}es`), dataTable([t('Affix'), t('Stat'), t('Value at base level')], rows, { sortable: true }), { anchor: kind });
  });
  const [magicMinimum, magicMaximum] = balanceValue<number[]>(d, 'items', 'magicAffixCounts');
  const [rareMinimum, rareMaximum] = balanceValue<number[]>(d, 'items', 'rareAffixCounts');
  const body = html`
    ${pageHeading(t('Affixes'), t('A prefix or suffix adds a stat to an item. Values grow with item level.'))}
    ${jumpLinks(kindIds.map((kind) => ({ anchor: kind, label: t(`${capitalised(kind)}es`) })))}
    ${kindPanels}
    ${panel(t('How many affixes'), html`<ul>
      <li>${t('Common items have none.')}</li>
      <li>${t('Magic items have {range} (at most {maximum} of each kind).', { range: `${magicMinimum}-${magicMaximum}`, maximum: balanceNumber(d, 'items', 'maximumAffixesPerKindMagic') })}</li>
      <li>${t('Rare items have {range} (at most {maximum} of each kind).', { range: `${rareMinimum}-${rareMaximum}`, maximum: balanceNumber(d, 'items', 'maximumAffixesPerKindRare') })}</li>
      <li>${t('Affix values grow by {percent}% for each item level.', { percent: Math.round(balanceNumber(d, 'items', 'affixGrowthPerItemLevel') * 100) })}</li>
    </ul>`)}`;
  return [{ path: 'affixes/index.html', title: t('Affixes'), section: 'affixes', body }];
}
