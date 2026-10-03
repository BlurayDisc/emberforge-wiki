import { balanceNumber, balanceValue } from '../data/balance';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { badge, commaList, dataTable, pageHeading, panel, siteLink } from '../render/components';
import { formatPercent } from '../render/format';
import { html } from '../render/html';
import type { Page } from '../render/page';

interface ResourceBalance {
  maximumBase: number;
  maximumPerLevel: number;
  attribute: string;
  maximumPerAttributePoint: number;
  startFraction: number;
  regenFractionPerSecond: number;
  gainFractionPerHitDealt: number;
  gainFractionPerHitTaken: number;
}

export function buildAbilityPages(game: GameIndex, text: GameText): Page[] {
  const d = game.data;
  const battle = (key: string) => balanceNumber(d, 'battle', key);
  const secondsPerAction = battle('actionThreshold') * battle('secondsPerTick') / 100;
  const behaviorDescriptions: Record<string, string> = {
    fighter: 'Attacks an enemy on every turn.',
    healer: `Heals the ally with the lowest health when an ally is below ${formatPercent(battle('healBelowHealthFraction'))} health. Heals for ${battle('healPowerMultiplier')}x its ${text.statName('magicalDamage')}. Otherwise it attacks.`,
  };
  const attackStatByKind: Record<string, string> = {
    physical: `${text.statName('physicalDamage')} (${text.statName('strength')} plus weapon), reduced by the target ${text.statName('defence')}`,
    magic: `${text.statName('magicalDamage')} (${text.statName('magic')} plus weapon), reduced by the target ${text.statName('resistance')}`,
  };

  const spells = (key: string) => balanceNumber(d, 'spells', key);
  const resourceRows = Object.keys(d.balance['resources'] ?? {}).map((resourceId) => ({ resourceId, rules: balanceValue<ResourceBalance>(d, 'resources', resourceId) })).map(({ resourceId, rules }) => [
    text.require(`resource.${resourceId}`),
    commaList(d.classes.filter((heroClass) => heroClass.resourceId === resourceId).map((heroClass) => siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName))),
    `${rules.maximumBase} + ${rules.maximumPerLevel} x level + ${rules.maximumPerAttributePoint} x ${text.statName(rules.attribute)}`,
    text.statName(rules.attribute),
    formatPercent(rules.startFraction),
    formatPercent(rules.regenFractionPerSecond),
    formatPercent(rules.gainFractionPerHitDealt),
    formatPercent(rules.gainFractionPerHitTaken),
  ]);

  const behaviorIds = [...new Set(d.classes.map((heroClass) => heroClass.behavior))];
  const behaviorRows = behaviorIds.map((behaviorId) => [
    badge(behaviorId, behaviorId),
    behaviorDescriptions[behaviorId] ?? 'No description yet.',
    commaList(d.classes.filter((heroClass) => heroClass.behavior === behaviorId).map((heroClass) => siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName))),
  ]);
  const attackKinds = [...new Set(d.classes.map((heroClass) => heroClass.attackKind))];
  const attackKindRows = attackKinds.map((kind) => [badge(kind, kind), attackStatByKind[kind] ?? kind]);

  const body = html`
    ${pageHeading('Abilities', 'Heroes fight on their own. This page explains what they do on each turn.')}
    ${panel('Combat roles', dataTable(['Role', 'What it does', 'Classes'], behaviorRows))}
    ${panel('Attack types', dataTable(['Type', 'Damage'], attackKindRows))}
    ${panel('Turns and speed', html`<p>Every unit has a charge meter that fills at its ${text.statName('speed')}. At ${battle('actionThreshold')} the unit acts. A unit with ${text.statName('speed')} 100 acts once every ${secondsPerAction} second.</p>`)}
    ${panel('Damage and criticals', html`
      <ul>
        <li>Damage reduction = ${text.statName('defence')} / (${text.statName('defence')} + ${battle('mitigationBase')} + ${battle('mitigationPerAttackerLevel')} x attacker level).</li>
        <li>Each hit varies by up to ${formatPercent(battle('damageVarianceFraction'))}.</li>
        <li>Critical chance = ${text.statName('skill')} x ${formatPercent(battle('criticalChancePerSkillPoint'))}, up to ${formatPercent(battle('maximumCriticalChance'))}.</li>
        <li>A critical hit does ${battle('criticalDamageMultiplier')}x damage.</li>
        <li>A battle ends after ${battle('maximumBattleSeconds')} seconds at most.</li>
      </ul>`)}
    ${panel('Spells', html`
      <p>${text.require('spells.hint')}</p>
      <ul>
        <li>${text.require('academy.intro')}</li>
        <li>Price at the Academy = ${spells('learnCostBaseCopper')} copper x spell level to the power ${spells('learnCostLevelExponent')}. An ultimate costs ${spells('ultimateCostFactor')}x more.</li>
        <li>An ultimate is first ready ${spells('ultimateOpeningDelaySeconds')} seconds into a battle.</li>
        <li>A heal spell is cast only when an ally is below ${formatPercent(spells('healCastBelowHealthFraction'))} health.</li>
        <li>Every spell has its own cooldown and costs the resource of the class.</li>
      </ul>
      <p>The spells of each class are on its ${siteLink('heroes/index.html', 'hero page')}.</p>`, { anchor: 'spells' })}
    ${panel('Class resources', html`
      <p>Each class spends one resource on spells. The pool is: base + per level x level + per point x the attribute.</p>
      ${dataTable(['Resource', 'Classes', 'Pool', 'Attribute', 'At the start', 'Regeneration per second', 'Gain per hit dealt', 'Gain per hit taken'], resourceRows)}`, { anchor: 'resources' })}
    ${panel('Promotions', html`<p>Promotion classes are in the game data (see ${siteLink('heroes/index.html#promotions', 'Heroes')}), but the game has no promotion command yet.</p>`)}`;
  return [{ path: 'abilities/index.html', title: 'Abilities', section: 'abilities', body }];
}
