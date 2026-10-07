import type { GameIndex } from '../data/gameIndex';
import { capitalised, type GameText } from '../data/text';
import { dataTable, jumpLinks, pageHeading, panel } from '../render/components';
import { formatSignedValueRange } from '../render/format';
import { html } from '../render/html';
import type { Page } from '../render/page';
import { PERCENT_STAT_IDS } from '../data/gameFormulas';
import { balanceNumber, balanceValue } from '../data/balance';
import { t } from '../i18n/ui';

export function buildAffixPages(game: GameIndex, text: GameText): Page[] {
  const d = game.data;
  const kindIds = [...new Set(d.affixes.map((affix) => affix.kind))].sort();
  const kindPanels = kindIds.map((kind) => {
    const rows = d.affixes
      .filter((affix) => affix.kind === kind)
      .sort((a, b) => text.statName(a.stat).localeCompare(text.statName(b.stat)) || a.displayName.localeCompare(b.displayName))
      .map((affix) => [affix.displayName, text.statName(affix.stat), `${formatSignedValueRange(affix.minimumValue, affix.maximumValue)}${PERCENT_STAT_IDS.includes(affix.stat) ? '%' : ''}`, affix.scalesWithItemLevel === false ? t('No') : t('Yes')]);
    return panel(t(`${capitalised(kind)}es`), dataTable([t('Affix'), t('Stat'), t('Value at base level'), t('Grows with item level')], rows, { sortable: true }), { anchor: kind });
  });
  const affixRules = balanceValue<Record<string, { counts: number[]; maximumPerKind: number }>>(d, 'items', 'affixRulesByQuality');
  const countRange = (counts: number[]): string => (Math.min(...counts) === Math.max(...counts) ? String(counts[0]) : `${Math.min(...counts)}-${Math.max(...counts)}`);
  const body = html`
    ${pageHeading(t('Affixes'), t('A prefix or suffix adds a stat to an item. Most values grow with item level. Percent stats do not.'))}
    ${jumpLinks(kindIds.map((kind) => ({ anchor: kind, label: t(`${capitalised(kind)}es`) })))}
    ${kindPanels}
    ${panel(t('How many affixes'), html`<ul>
      <li>${t('Common items have none.')}</li>
      ${Object.entries(affixRules).map(([quality, rule]) => html`<li>${t('{quality} items have {range} (at most {maximum} of each kind).', { quality: capitalised(t(quality)), range: countRange(rule.counts), maximum: rule.maximumPerKind })}</li>`)}
      <li>${t('Affix values grow by {percent}% for each item level, unless the table says No.', { percent: Math.round(balanceNumber(d, 'items', 'affixGrowthPerItemLevel') * 100) })}</li>
    </ul>`)}`;
  return [{ path: 'affixes/index.html', title: t('Affixes'), section: 'affixes', body }];
}
