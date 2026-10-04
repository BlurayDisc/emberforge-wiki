import { balanceNumber, balanceValue } from '../data/balance';
import type { GameIndex } from '../data/gameIndex';
import { capitalised, type GameText } from '../data/text';
import { badge, commaList, dataTable, jumpLinks, pageHeading, panel, siteLink } from '../render/components';
import { pixelArt } from '../render/art';
import type { SpellEffect } from '../data/gameData';
import { monsterSpellTable, spellTable } from './spellTable';
import { formatPercent } from '../render/format';
import { html } from '../render/html';
import type { Page } from '../render/page';
import { t, tHtml } from '../i18n/ui';

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

export function buildAbilityPages(game: GameIndex, text: GameText): Page[] {
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

  const spells = (key: string) => balanceNumber(d, 'spells', key);
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

  const classSpellPanels = d.classes.map((heroClass) => panel(
    html`${pixelArt('heroes', heroClass.id, heroClass.displayName, 2)} ${siteLink(`heroes/${heroClass.id}.html`, heroClass.displayName)}`,
    html`<p class="muted">${t('Resource: {resource}. A hero fights with {count} spells and 1 ultimate.', { resource: text.require(`resource.${heroClass.resourceId}`), count: spells('normalSlotCount') })}</p>${spellTable(game, text, heroClass)}`,
    { anchor: `spells-${heroClass.id}` }));
  const bossesWithSpells = d.monsters.filter((monster) => (monster.spellIds ?? []).length > 0);
  const statusRows = statusUsage(game, text);
  const body = html`
    ${pageHeading(t('Abilities and spells'), t('Heroes fight on their own. This page explains what they do on each turn, and lists the spells of every class.'))}
    ${jumpLinks([
      { anchor: 'roles', label: t('Combat roles') },
      { anchor: 'damage', label: t('Damage and criticals') },
      { anchor: 'statuses', label: t('Statuses') },
      { anchor: 'spells', label: t('How spells work') },
      { anchor: 'resources', label: t('Class resources') },
      ...d.classes.map((heroClass) => ({ anchor: `spells-${heroClass.id}`, label: heroClass.displayName })),
      ...(bossesWithSpells.length ? [{ anchor: 'monster-spells', label: t('Monster spells') }] : []),
    ])}
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
    ${panel(t('How spells work'), html`
      <p>${text.require('spells.hint')}</p>
      <ul>
        <li>${text.require('academy.intro')}</li>
        <li>${t('Price at the Academy = {base} copper x spell level to the power {exponent}. An ultimate costs {factor}x more.', { base: spells('learnCostBaseCopper'), exponent: spells('learnCostLevelExponent'), factor: spells('ultimateCostFactor') })}</li>
        <li>${t('An ultimate is first ready {seconds} seconds into a battle.', { seconds: spells('ultimateOpeningDelaySeconds') })}</li>
        <li>${t('A heal spell is cast only when an ally is below {percent} health.', { percent: formatPercent(spells('healCastBelowHealthFraction')) })}</li>
        <li>${t('Every spell has its own cooldown and costs the resource of the class.')}</li>
      </ul>
`, { anchor: 'spells' })}
    ${panel(t('Class resources'), html`
      <p>${t('Each class spends one resource on spells. The pool is: base + per level x level + per point x the attribute.')}</p>
      ${dataTable([t('Resource'), t('Classes'), t('Pool'), t('Attribute'), t('At the start'), t('Regeneration per second'), t('Gain per hit dealt'), t('Gain per hit taken')], resourceRows)}`, { anchor: 'resources' })}
    ${classSpellPanels}
    ${bossesWithSpells.length ? panel(t('Monster spells'), html`<p>${t('A monster spell costs no resource. It waits only for its cooldown.')}</p>${bossesWithSpells.map((monster) => html`<h3 class="group-heading">${siteLink(`monsters/${monster.id}.html`, monster.name)}</h3>${monsterSpellTable(text, d.monsterSpells.filter((spell) => (monster.spellIds ?? []).includes(spell.id)))}`)}`, { anchor: 'monster-spells' }) : null}`;
  const spellNames = d.spells.map((spell) => text.require(`spell.${spell.id}`)).join(' ');
  return [{ path: 'abilities/index.html', title: t('Abilities and spells'), section: 'abilities', body, searchKind: t('Abilities'), searchKeywords: spellNames }];
}
