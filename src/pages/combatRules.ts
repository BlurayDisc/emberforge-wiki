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

interface StatusUse {
  status: string;
  strength: number;
  charges: number;
}

// A status can come from a status spell, from a damage spell that inflicts it, or be a second status that the caster gets.
const statusesOfEffect = (effect: SpellEffect): StatusUse[] => {
  const uses: StatusUse[] = [];
  if (effect.kind === 'status') uses.push({ status: effect.status, strength: effect.strength, charges: effect.charges ?? 1 });
  if (effect.kind === 'damage' && effect.inflicts) uses.push({ status: effect.inflicts.status, strength: effect.inflicts.strength, charges: effect.inflicts.charges ?? 1 });
  if ((effect.kind === 'damage' || effect.kind === 'status') && effect.alsoOnSelf) uses.push({ status: effect.alsoOnSelf.status, strength: effect.alsoOnSelf.strength, charges: effect.alsoOnSelf.charges ?? 1 });
  return uses;
};

// One row for each status that a hero spell or a monster spell can cause. The strength is a range when spells differ.
function statusUsage(game: GameIndex, text: GameText) {
  const castable = [...game.loadedSpells(), ...game.data.monsterSpells];
  const statusIds = [...new Set(castable.flatMap((spell) => statusesOfEffect(spell.effect).map(({ status }) => status)))];
  return statusIds.map((statusId) => {
    const users = castable.filter((spell) => statusesOfEffect(spell.effect).some(({ status }) => status === statusId));
    const uses = users.flatMap((spell) => statusesOfEffect(spell.effect).filter(({ status }) => status === statusId));
    const percents = uses.map(({ strength }) => Math.round(strength * 100));
    const weakest = Math.min(...percents);
    const strongest = Math.max(...percents);
    const charges = Math.max(...uses.map((use) => use.charges));
    return [
      t(capitalised(statusId)),
      text.format(`spell.status.${statusId}`, { percent: weakest === strongest ? weakest : `${weakest}-${strongest}`, charges }),
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
        <li>${t('Damage reduction = {defence} / ({defence} + {base} + {perLevel} x attacker level). A magic hit uses {resistance} instead of {defence}.', { defence: text.statName('defence'), resistance: text.statName('resistance'), base: battle('mitigationBase'), perLevel: battle('mitigationPerAttackerLevel') })}</li>
        <li>${t('The reduction never goes above {percent}, even with Fortify.', { percent: formatPercent(battle('maximumDamageCut')) })}</li>
        <li>${t('Each hit is multiplied by a random number around 1. The size of the swing belongs to the class (see the table below). Monsters swing by up to {percent}.', { percent: formatPercent(battle('monsterDamageVarianceFraction')) })}</li>
        <li>${t('A monster can ignore a share of the {defence} of a hero (armour penetration). No monster does yet.', { defence: text.statName('defence') })}</li>
        <li>${t('Critical chance = {skill} x {perPoint}, up to {maximum}.', { skill: text.statName('skill'), perPoint: formatPercent(battle('criticalChancePerSkillPoint')), maximum: formatPercent(battle('maximumCriticalChance')) })}</li>
        <li>${t('A critical hit does {multiplier}x damage.', { multiplier: battle('criticalDamageMultiplier') })}</li>
        <li>${t('A battle ends after {seconds} seconds at most.', { seconds: battle('maximumBattleSeconds') })}</li>
      </ul>
      ${dataTable([t('Class'), t('Damage swing')], d.classes.map((heroClass) => [siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName), `${formatPercent(1 - heroClass.damageVarianceFraction)} - ${formatPercent(1 + heroClass.damageVarianceFraction)}`]))}`, { anchor: 'damage' })}
    ${panel(t('Dodging, shields and burning'), html`
      <ul>
        <li>${t('Evade: the unit dodges its next hit (or hits). A dodged hit does no damage, shows Dodge, and does not trigger Thorns or life steal.')}</li>
        <li>${t('Shield: a spell can turn a share of the maximum resource pool into a shield. The shield has its own counter, takes every hit before the health, and ends when its time is up. The health bar shows it as a blue part.')}</li>
        <li>${t('Burn: the unit takes magic damage every {seconds} second. The damage is a share of the attack of the caster, cut by the {resistance} of the target. It has no swing and no critical hit.', { seconds: battle('burnTickSeconds'), resistance: text.statName('resistance') })}</li>
        <li>${t('Hex raises the magic damage that a unit takes. Empower adds a share of the main attribute of the caster: more attack for every class, and more critical chance when the attribute is Skill.')}</li>
        <li>${t('A spell that spreads its hits sends them one after the other to each living enemy in turn.')}</li>
      </ul>`, { anchor: 'special-rules' })}
    ${panel(t('Statuses'), html`<p>${t('A status lasts a few seconds. A unit has one status of each kind at a time, and a new one replaces the old one.')}</p>${dataTable([t('Status'), t('Effect'), t('Cast by')], statusRows)}`, { anchor: 'statuses' })}
    ${panel(t('Class resources'), html`
      <p>${t('Each class spends one resource on spells. The pool is: base + per level x level + per point x the attribute.')}</p>
      ${dataTable([t('Resource'), t('Classes'), t('Pool'), t('Attribute'), t('At the start'), t('Regeneration per second'), t('Gain per hit dealt'), t('Gain per hit taken')], resourceRows)}`, { anchor: 'resources' })}`;
}
