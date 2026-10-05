import { balanceNumber } from '../data/balance';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { pixelArt } from '../render/art';
import { jumpLinks, pageHeading, panel, siteLink } from '../render/components';
import { formatPercent } from '../render/format';
import { html } from '../render/html';
import type { Page } from '../render/page';
import { t, tHtml } from '../i18n/ui';
import { spellLooks } from './spellLooks';
import { monsterSpellTable, spellTable } from './spellTable';

export function buildSpellPages(game: GameIndex, text: GameText): Page[] {
  const d = game.data;
  const spells = (key: string) => balanceNumber(d, 'spells', key);
  const classSpellPanels = d.classes.map((heroClass) => panel(
    html`${pixelArt('heroes', heroClass.id, heroClass.displayName, 2)} ${siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName)}`,
    html`<p class="muted">${t('Resource: {resource}. A hero fights with {count} spells and 1 ultimate.', { resource: text.require(`resource.${heroClass.resourceId}`), count: spells('normalSlotCount') })}</p>${spellTable(game, text, heroClass)}${spellLooks(game, text, heroClass)}`,
    { anchor: `spells-${heroClass.id}` }));
  const bossesWithSpells = d.monsters.filter((monster) => (monster.spellIds ?? []).length > 0);
  const body = html`
    ${pageHeading(t('Spells'), t('Every spell of every class, with its effect, cost, cooldown and price at the Academy.'))}
    ${panel(t('How spells work'), html`
      <p>${text.require('spells.hint')}</p>
      <ul>
        <li>${tHtml('Spells are learned at the {academy}. The price is on that page.', { academy: siteLink('buildings/index.html#academy', t('Academy')) })}</li>
        <li>${t('An ultimate is first ready {seconds} seconds into a battle.', { seconds: spells('ultimateOpeningDelaySeconds') })}</li>
        <li>${t('A heal spell is cast only when an ally is below {percent} health.', { percent: formatPercent(spells('healCastBelowHealthFraction')) })}</li>
        <li>${t('Every spell has its own cooldown and costs the resource of the class.')}</li>
        <li>${t('A spell can have ranks (II and III). A higher rank replaces the lower rank in the same slot, so a hero never holds two versions. The hero must know the rank below it first.')}</li>
        <li>${t('A new spell or rank arrives every 2 or 3 levels. New spells stop at the Ultimate on level 20, and ranks go on after that. The spells above that wait for the class specialisations.')}</li>
        <li>${tHtml('The rules of statuses and class resources are on the {mechanics} page.', { mechanics: siteLink('mechanics/index.html#statuses', t('Mechanics')) })}</li>
      </ul>`)}
    ${jumpLinks([
      ...d.classes.map((heroClass) => ({ anchor: `spells-${heroClass.id}`, label: heroClass.displayName })),
      ...(bossesWithSpells.length ? [{ anchor: 'monster-spells', label: t('Monster spells') }] : []),
    ])}
    ${classSpellPanels}
    ${bossesWithSpells.length ? panel(t('Monster spells'), html`<p>${t('A monster spell costs no resource. It waits only for its cooldown.')}</p>${bossesWithSpells.map((monster) => html`<h3 class="group-heading">${siteLink(`monsters/${monster.id}.html`, monster.name)}</h3>${monsterSpellTable(text, d.monsterSpells.filter((spell) => (monster.spellIds ?? []).includes(spell.id)))}`)}`, { anchor: 'monster-spells' }) : null}`;
  const spellNames = game.loadedSpells().map((spell) => text.require(`spell.${spell.id}`)).join(' ');
  return [{ path: 'spells/index.html', title: t('Spells'), section: 'spells', body, searchKind: t('Spells'), searchKeywords: spellNames }];
}
