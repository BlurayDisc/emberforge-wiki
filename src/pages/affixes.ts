import type { GameIndex } from '../data/gameIndex';
import { capitalised, type GameText } from '../data/text';
import { dataTable, jumpLinks, pageHeading, panel } from '../render/components';
import { formatSignedValueRange } from '../render/format';
import { html } from '../render/html';
import type { Page } from '../render/page';
import { balanceNumber, balanceValue } from '../data/balance';

export function buildAffixPages(game: GameIndex, text: GameText): Page[] {
  const d = game.data;
  const kindIds = [...new Set(d.affixes.map((affix) => affix.kind))].sort();
  const kindPanels = kindIds.map((kind) => {
    const rows = d.affixes
      .filter((affix) => affix.kind === kind)
      .sort((a, b) => text.statName(a.stat).localeCompare(text.statName(b.stat)) || a.displayName.localeCompare(b.displayName))
      .map((affix) => [affix.displayName, text.statName(affix.stat), formatSignedValueRange(affix.minimumValue, affix.maximumValue)]);
    return panel(`${capitalised(kind)}es`, dataTable(['Affix', 'Stat', 'Value at base level'], rows, { sortable: true }), { anchor: kind });
  });
  const [magicMinimum, magicMaximum] = balanceValue<number[]>(d, 'items', 'magicAffixCounts');
  const [rareMinimum, rareMaximum] = balanceValue<number[]>(d, 'items', 'rareAffixCounts');
  const body = html`
    ${pageHeading('Affixes', 'A prefix or suffix adds a stat to an item. Values grow with item level.')}
    ${jumpLinks(kindIds.map((kind) => ({ anchor: kind, label: capitalised(kind) })))}
    ${kindPanels}
    ${panel('How many affixes', html`<ul>
      <li>Common items have none.</li>
      <li>Magic items have ${magicMinimum}-${magicMaximum} (at most ${balanceNumber(d, 'items', 'maximumAffixesPerKindMagic')} of each kind).</li>
      <li>Rare items have ${rareMinimum}-${rareMaximum} (at most ${balanceNumber(d, 'items', 'maximumAffixesPerKindRare')} of each kind).</li>
      <li>Affix values grow by ${Math.round(balanceNumber(d, 'items', 'affixGrowthPerItemLevel') * 100)}% for each item level.</li>
    </ul>`)}`;
  return [{ path: 'affixes/index.html', title: 'Affixes', section: 'affixes', body }];
}
