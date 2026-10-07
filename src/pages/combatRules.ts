import { balanceNumber, balanceValue } from '../data/balance';
import type { GameIndex } from '../data/gameIndex';
import { capitalised, type GameText } from '../data/text';
import { badge, commaList, dataTable, panel, siteLink } from '../render/components';
import type { SpellEffect } from '../data/gameData';
import { formatPercent } from '../render/format';
import { html, type Html } from '../render/html';
import { t } from '../i18n/ui';

interface MovementProfile {
  rangeFieldFraction: number;
  movementSpeedFactor: number;
}

interface ResourceBalance {
  maximum: number;
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
  const battlefield = (key: string) => balanceNumber(d, 'battlefield', key);
  const classProfiles = balanceValue<Record<string, MovementProfile>>(d, 'battlefield', 'classProfiles');
  const behaviorDescriptions: Record<string, string> = {
    fighter: t('Attacks the nearest enemy.'),
    healer: t('Heals the ally with the lowest health when an ally is below {percent} health. Heals for {multiplier}x its {stat}. Otherwise it attacks.', { percent: formatPercent(battle('healBelowHealthFraction')), multiplier: battle('healPowerMultiplier'), stat: text.statName('magicalDamage') }),
  };
  const attackStatByKind: Record<string, string> = {
    physical: t('{damage} (base plus primary attribute plus weapon), cut by the target {reduction}', { damage: text.statName('physicalDamage'), reduction: text.statName('defence') }),
    magic: t('{damage} (base plus primary attribute plus weapon), cut by the target {reduction}', { damage: text.statName('magicalDamage'), reduction: text.statName('resistance') }),
  };

  const resourceRows = Object.keys(d.balance['resources'] ?? {}).map((resourceId) => ({ resourceId, rules: balanceValue<ResourceBalance>(d, 'resources', resourceId) })).map(({ resourceId, rules }) => [
    text.require(`resource.${resourceId}`),
    commaList(d.classes.filter((heroClass) => heroClass.resourceId === resourceId).map((heroClass) => siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName))),
    rules.maximum,
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
    ${panel(t('Real-time battle'), html`
      <ul>
        <li>${t('There are no turns. Heroes and monsters move on a battlefield {length} long and {depth} deep, and fight in real time.', { length: battlefield('fieldLength'), depth: battlefield('fieldDepth') })}</li>
        <li>${t('The two sides start apart. Melee units meet after about {seconds} seconds of running. The run-up counts in the fight length.', { seconds: battlefield('meleeMeetSeconds') })}</li>
        <li>${t('A melee unit must touch its target. A ranged unit hits across a share of the field (see the table below).')}</li>
        <li>${t('A unit attacks the nearest enemy. It switches only when another enemy is clearly closer, or when it cannot reach its target.')}</li>
        <li>${t('Attack time = base attack time / (1 + attack speed bonus). The bonus is Agility x {perAgility} + gear + Haste, and Slow takes from the same pool. The factor never goes below {minimum}.', { perAgility: formatPercent(balanceNumber(d, 'hero-stats', 'attackSpeedBonusPerAgility')), minimum: battle('minimumAttackSpeedFactor') })}</li>
        <li>${t('A unit stands still while it attacks and while it casts. The damage of a basic attack lands at {percent} of the attack time. A spell takes {seconds} seconds to cast unless it says otherwise.', { percent: formatPercent(battlefield('attackHitFraction')), seconds: balanceNumber(d, 'spells', 'defaultCastSeconds') })}</li>
        <li>${t('A spell has a cooldown. Attack speed does not change it.')}</li>
        <li>${t('Units are circles and cannot stand inside each other. A blocked unit slides around the blocker.')}</li>
      </ul>
      ${dataTable([t('Class'), t('Hits across'), t('Movement speed')], d.classes.map((heroClass) => {
        const profile = classProfiles[heroClass.id];
        return [
          siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName),
          profile && profile.rangeFieldFraction > 0 ? t('{percent} of the field', { percent: formatPercent(profile.rangeFieldFraction) }) : t('Melee'),
          profile ? battlefield('baseMovementSpeed') * profile.movementSpeedFactor : battlefield('baseMovementSpeed'),
        ];
      }))}`, { anchor: 'realtime' })}
    ${panel(t('Damage and criticals'), html`
      <ul>
        <li>${t('Hit = attack x swing x spell power x critical multiplier, minus the flat armour of the target. Armour is {defence} for a physical hit and {resistance} for a magic hit.', { defence: text.statName('defence'), resistance: text.statName('resistance') })}</li>
        <li>${t('A hit never does less than 1 damage. There is no percent cut and no cap. The number is rounded once, at the end.')}</li>
        <li>${t('Many small hits lose more to armour than one big hit. This is by design.')}</li>
        <li>${t('Weaken and Hex change the damage before the armour is taken off. Fortify, Guard and Sunder change the armour value.')}</li>
        <li>${t('Each hit is multiplied by a random number around 1. The size of the swing belongs to the class (see the table below). Monsters swing by up to {percent}.', { percent: formatPercent(battle('monsterDamageVarianceFraction')) })}</li>
        <li>${t('A monster can ignore a share of the {defence} of a hero (armour penetration). No monster does yet.', { defence: text.statName('defence') })}</li>
        <li>${t('Critical chance = {base} for every unit, plus the class trait, plus gear, up to {maximum}.', { base: formatPercent(battle('baseCriticalChance')), maximum: formatPercent(battle('maximumCriticalChance')) })}</li>
        <li>${t('A critical hit does {multiplier}x damage. Gear can add more.', { multiplier: battle('criticalDamageMultiplier') })}</li>
        <li>${t('There are no misses.')}</li>
        <li>${t('A battle ends after {seconds} seconds at most.', { seconds: battle('maximumBattleSeconds') })}</li>
      </ul>
      ${dataTable([t('Class'), t('Damage swing')], d.classes.map((heroClass) => [siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName), `${formatPercent(1 - heroClass.damageVarianceFraction)} - ${formatPercent(1 + heroClass.damageVarianceFraction)}`]))}`, { anchor: 'damage' })}
    ${panel(t('Dodging, shields and burning'), html`
      <ul>
        <li>${t('Evade: the unit dodges its next hit (or hits). A dodged hit does no damage, shows Dodge, and does not trigger Thorns or life steal.')}</li>
        <li>${t('Shield: a spell can turn a share of the maximum resource pool into a shield. The shield has its own counter, takes every hit before the health, and ends when its time is up. The health bar shows it as a blue part.')}</li>
        <li>${t('Burn: the unit takes magic damage every {seconds} second. The damage is a share of the attack of the caster, cut by the {resistance} of the target. It has no swing and no critical hit.', { seconds: battle('burnTickSeconds'), resistance: text.statName('resistance') })}</li>
        <li>${t('Hex raises the magic damage that a unit takes. Empower adds a share of the main attribute of the caster to its attack.')}</li>
        <li>${t('A spell that spreads its hits sends them one after the other to each living enemy in turn.')}</li>
      </ul>`, { anchor: 'special-rules' })}
    ${panel(t('Statuses'), html`<p>${t('A status lasts a few seconds. A unit has one status of each kind at a time, and a new one replaces the old one.')}</p>${dataTable([t('Status'), t('Effect'), t('Cast by')], statusRows)}`, { anchor: 'statuses' })}
    ${panel(t('Class resources'), html`
      <p>${t('Each class spends one resource on spells. The pool is a fixed number: no level and no attribute changes it. Intelligence speeds up mana regeneration only.')}</p>
      ${dataTable([t('Resource'), t('Classes'), t('Pool'), t('At the start'), t('Regeneration per second'), t('Gain per hit dealt'), t('Gain per hit taken')], resourceRows)}`, { anchor: 'resources' })}`;
}
