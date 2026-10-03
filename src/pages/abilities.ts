import { balanceNumber } from '../data/balance';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { badge, commaList, dataTable, pageHeading, panel, siteLink } from '../render/components';
import { formatPercent } from '../render/format';
import { html } from '../render/html';
import type { Page } from '../render/page';

export function buildAbilityPages(game: GameIndex, _text: GameText): Page[] {
  const d = game.data;
  const battle = (key: string) => balanceNumber(d, 'battle', key);
  const secondsPerAction = battle('actionThreshold') * battle('secondsPerTick') / 100;
  const behaviorDescriptions: Record<string, string> = {
    fighter: 'Attacks an enemy on every turn.',
    healer: `Heals the ally with the lowest health when an ally is below ${formatPercent(battle('healBelowHealthFraction'))} health. Heals for ${battle('healPowerMultiplier')}x its Magic. Otherwise it attacks.`,
  };
  const attackStatByKind: Record<string, string> = {
    physical: 'Strength, reduced by the target Defence',
    magic: 'Magic, reduced by the target Resistance',
  };

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
    ${panel('Turns and speed', html`<p>Every unit has a charge meter that fills at its Speed. At ${battle('actionThreshold')} the unit acts. A unit with Speed 100 acts once every ${secondsPerAction} second.</p>`)}
    ${panel('Damage and criticals', html`
      <ul>
        <li>Damage reduction = defence stat / (defence stat + ${battle('mitigationBase')} + ${battle('mitigationPerAttackerLevel')} x attacker level).</li>
        <li>Each hit varies by up to ${formatPercent(battle('damageVarianceFraction'))}.</li>
        <li>Critical chance = Skill x ${formatPercent(battle('criticalChancePerSkillPoint'))}, up to ${formatPercent(battle('maximumCriticalChance'))}.</li>
        <li>A critical hit does ${battle('criticalDamageMultiplier')}x damage.</li>
        <li>A battle ends after ${battle('maximumBattleSeconds')} seconds at most.</li>
      </ul>`)}
    ${panel('Note', html`<p>Class skills and promotions are planned in the game design, but they are not in the game data yet. This page will grow when they are added.</p>`)}`;
  return [{ path: 'abilities/index.html', title: 'Abilities', section: 'abilities', body }];
}
