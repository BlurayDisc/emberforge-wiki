import { balanceNumber, balanceValue } from '../data/balance';
import type { GameIndex } from '../data/gameIndex';
import { capitalised, type GameText } from '../data/text';
import { badge, commaList, dataTable, panel, siteLink } from '../render/components';
import type { SpellEffect } from '../data/gameData';
import { formatPercent } from '../render/format';
import { html, type Html } from '../render/html';
import { t } from '../i18n/ui';

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

const statusesOfEffect = (effect: SpellEffect): Array<{ status: string; strength: number }> => {
  if (effect.kind === 'status') return [{ status: effect.status, strength: effect.strength }];
  if (effect.kind === 'damage' && effect.inflicts) return [{ status: effect.inflicts.status, strength: effect.inflicts.strength }];
  return [];
};

// One row for each status that a hero spell or a monster spell can cause. The strength is a range when spells differ.
function statusUsage(game: GameIndex, text: GameText) {
  const castable = [...game.data.spells, ...game.data.monsterSpells];
  const statusIds = [...new Set(castable.flatMap((spell) => statusesOfEffect(spell.effect).map(({ status }) => status)))];
  return statusIds.map((statusId) => {
    const users = castable.filter((spell) => statusesOfEffect(spell.effect).some(({ status }) => status === statusId));
    const percents = users.flatMap((spell) => statusesOfEffect(spell.effect).filter(({ status }) => status === statusId).map(({ strength }) => Math.round(strength * 100)));
    const weakest = Math.min(...percents);
    const strongest = Math.max(...percents);
    return [
      t(capitalised(statusId)),
      text.format(`spell.status.${statusId}`, { percent: weakest === strongest ? weakest : `${weakest}-${strongest}` }),
      users.map((spell) => text.require(`spell.${spell.id}`)).join(t(', ')),
    ];
  });
}

// The battle rules of the Mechanics page: roles, damage, statuses and class resources.
export function combatRulePanels(game: GameIndex, text: GameText): Html {
  const d = game.data;
  const battle = (key: string) => balanceNumber(d, 'battle', key);
  const secondsPerAction = battle('actionThreshold') * battle('secondsPerTick') / 100;
  const behaviorDescriptions: Record<string, string> = {
    fighter: t('Attacks an enemy on every turn.'),
    healer: t('Heals the ally with the lowest health when an ally is below {percent} health. Heals for {multiplier}x its {stat}. Otherwise it attacks.', { percent: formatPercent(battle('healBelowHealthFraction')), multiplier: battle('healPowerMultiplier'), stat: text.statName('magicalDamage') }),
  };
  const attackStatByKind: Record<string, string> = {
    physical: t('{damage} ({attribute} plus weapon), reduced by the target {reduction}', { damage: text.statName('physicalDamage'), attribute: text.statName('strength'), reduction: text.statName('defence') }),
    magic: t('{damage} ({attribute} plus weapon), reduced by the target {reduction}', { damage: text.statName('magicalDamage'), attribute: text.statName('magic'), reduction: text.statName('resistance') }),
  };

  const resourceRows = Object.keys(d.balance['resources'] ?? {}).map((resourceId) => ({ resourceId, rules: balanceValue<ResourceBalance>(d, 'resources', resourceId) })).map(({ resourceId, rules }) => [
    text.require(`resource.${resourceId}`),
    commaList(d.classes.filter((heroClass) => heroClass.resourceId === resourceId).map((heroClass) => siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName))),
    t('{base} + {perLevel} x level + {perPoint} x {attribute}', { base: rules.maximumBase, perLevel: rules.maximumPerLevel, perPoint: rules.maximumPerAttributePoint, attribute: text.statName(rules.attribute) }),
    text.statName(rules.attribute),
    formatPercent(rules.startFraction),
    formatPercent(rules.regenFractionPerSecond),
    formatPercent(rules.gainFractionPerHitDealt),
    formatPercent(rules.gainFractionPerHitTaken),
  ]);

  const behaviorIds = [...new Set(d.classes.map((heroClass) => heroClass.behavior))];
  const behaviorRows = behaviorIds.map((behaviorId) => [
    badge(t(behaviorId), behaviorId),
    behaviorDescriptions[behaviorId] ?? t('No description yet.'),
    commaList(d.classes.filter((heroClass) => heroClass.behavior === behaviorId).map((heroClass) => siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName))),
  ]);
  const attackKinds = [...new Set(d.classes.map((heroClass) => heroClass.attackKind))];
  const attackKindRows = attackKinds.map((kind) => [badge(t(kind), kind), attackStatByKind[kind] ?? kind]);

  const statusRows = statusUsage(game, text);
  return html`
    ${panel(t('Combat roles'), dataTable([t('Role'), t('What it does'), t('Classes')], behaviorRows), { anchor: 'roles' })}
    ${panel(t('Attack types'), dataTable([t('Type'), t('Damage')], attackKindRows))}
    ${panel(t('Turns and speed'), html`<p>${t('Every unit has a charge meter that fills at its {speed}. At {threshold} the unit acts. A unit with {speed} 100 acts once every {seconds} second.', { speed: text.statName('speed'), threshold: battle('actionThreshold'), seconds: secondsPerAction })}</p>`)}
    ${panel(t('Damage and criticals'), html`
      <ul>
        <li>${t('Damage reduction = {defence} / ({defence} + {base} + {perLevel} x attacker level).', { defence: text.statName('defence'), base: battle('mitigationBase'), perLevel: battle('mitigationPerAttackerLevel') })}</li>
        <li>${t('Each hit varies by up to {percent}.', { percent: formatPercent(battle('damageVarianceFraction')) })}</li>
        <li>${t('Critical chance = {skill} x {perPoint}, up to {maximum}.', { skill: text.statName('skill'), perPoint: formatPercent(battle('criticalChancePerSkillPoint')), maximum: formatPercent(battle('maximumCriticalChance')) })}</li>
        <li>${t('A critical hit does {multiplier}x damage.', { multiplier: battle('criticalDamageMultiplier') })}</li>
        <li>${t('A battle ends after {seconds} seconds at most.', { seconds: battle('maximumBattleSeconds') })}</li>
      </ul>`, { anchor: 'damage' })}
    ${panel(t('Statuses'), html`<p>${t('A status lasts a few seconds. A unit has one status of each kind at a time, and a new one replaces the old one.')}</p>${dataTable([t('Status'), t('Effect'), t('Cast by')], statusRows)}`, { anchor: 'statuses' })}
    ${panel(t('Class resources'), html`
      <p>${t('Each class spends one resource on spells. The pool is: base + per level x level + per point x the attribute.')}</p>
      ${dataTable([t('Resource'), t('Classes'), t('Pool'), t('Attribute'), t('At the start'), t('Regeneration per second'), t('Gain per hit dealt'), t('Gain per hit taken')], resourceRows)}`, { anchor: 'resources' })}`;
}
