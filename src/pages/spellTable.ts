import { balanceNumber, balanceValue } from '../data/balance';
import type { HeroClass, MonsterSpell, Spell, SpellEffect, SpellStatusEffect } from '../data/gameData';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { pixelArt } from '../render/art';
import { badge, dataTable } from '../render/components';
import { formatDuration, formatMoney, formatPercent } from '../render/format';
import { html, type Html } from '../render/html';
import { t } from '../i18n/ui';

const percentOf = (fraction: number): number => Math.round(fraction * 100);

// Same wording rules as describeEffect in the game, so the wiki shows the text the player sees.
function describeStatus(text: GameText, status: SpellStatusEffect): string {
  return text.format(`spell.status.${status.status}`, { percent: percentOf(status.strength), charges: status.charges ?? 1 });
}

function describeInflictedStatus(text: GameText, inflicts: SpellStatusEffect): string {
  return text.format('spell.effect.inflicts', { effect: describeStatus(text, inflicts), seconds: inflicts.durationSeconds });
}

function describeSelfStatus(text: GameText, own: SpellStatusEffect): string {
  return text.format('spell.effect.alsoOnSelf', { effect: describeStatus(text, own), seconds: own.durationSeconds });
}

function describeEffect(text: GameText, effect: SpellEffect): string {
  switch (effect.kind) {
    case 'damage': {
      const damageText = effect.target === 'allEnemies'
        ? text.format('spell.effect.damageAllEnemies', { percent: percentOf(effect.power) })
        : effect.target === 'spreadEnemies'
          ? text.format('spell.effect.damageSpread', { hits: effect.hits, percent: percentOf(effect.power) })
          : effect.hits > 1
            ? text.format('spell.effect.damageEnemyMulti', { hits: effect.hits, percent: percentOf(effect.power) })
            : text.format('spell.effect.damageEnemy', { percent: percentOf(effect.power) });
      const parts = [damageText];
      if (effect.defencePower) parts.push(text.format('spell.effect.defenceBonus', { percent: percentOf(effect.defencePower) }));
      if (effect.magicPower) parts.push(text.format('spell.effect.magicBonus', { percent: percentOf(effect.magicPower) }));
      if (effect.inflicts) parts.push(describeInflictedStatus(text, effect.inflicts));
      if (effect.alsoOnSelf) parts.push(describeSelfStatus(text, effect.alsoOnSelf));
      return parts.join(' ');
    }
    case 'drain':
      return text.format('spell.effect.drain', { percent: percentOf(effect.power), heal: percentOf(effect.healFraction) });
    case 'heal':
      return text.format(`spell.effect.heal.${effect.target}`, { percent: percentOf(effect.power) });
    case 'shield':
      return text.format('spell.effect.shield', { percent: percentOf(effect.resourceFraction), flat: effect.absorbFlat, health: percentOf(effect.absorbMaxHpFraction), seconds: effect.durationSeconds });
    case 'status': {
      const statusText = text.format('spell.effect.status', {
        effect: describeStatus(text, effect),
        target: text.require(`spell.target.${effect.target}`),
        seconds: effect.durationSeconds,
      });
      return effect.alsoOnSelf ? `${statusText} ${describeSelfStatus(text, effect.alsoOnSelf)}` : statusText;
    }
  }
}

// A monster casts at heroes, so the words "you" and "enemy" of a hero spell would be wrong here. Same rule as describeMonsterSpell in the game.
function describeMonsterEffect(text: GameText, effect: SpellEffect): string {
  if (effect.kind === 'damage') {
    const damageText = text.format('spell.monster.damage', { percent: percentOf(effect.power) });
    return effect.inflicts ? `${damageText} ${describeInflictedStatus(text, effect.inflicts)}` : damageText;
  }
  if (effect.kind === 'status') {
    return text.format('spell.effect.status', {
      effect: describeStatus(text, effect),
      target: text.require(`spell.monster.target.${effect.target}`),
      seconds: effect.durationSeconds,
    });
  }
  return describeEffect(text, effect);
}

export function monsterSpellTable(text: GameText, spells: MonsterSpell[]): Html {
  const rows = spells.map((spell) => [text.require(`spell.${spell.id}`), describeMonsterEffect(text, spell.effect), formatDuration(spell.cooldownSeconds)]);
  return dataTable([t('Spell'), t('Effect'), t('Cooldown')], rows);
}

export const spellName = (text: GameText, spell: Spell): string => text.require(`spell.${spell.id}`);

export const spellIcon = (text: GameText, spell: Spell, scale = 2): Html => pixelArt('spells/icons', spell.id, spellName(text, spell), scale);

interface CostAnchor { level: number; copper: number }

// Same formula as learnCostCopper and interpolatePowerCurve in the game: a curve through the anchor points, straight lines on a log-log scale.
function learnCostCopper(game: GameIndex, spell: Spell): number {
  const anchors = balanceValue<CostAnchor[]>(game.data, 'spells', 'learnCostAnchors');
  const lastSegmentStart = Math.max(0, anchors.length - 2);
  const segmentStart = anchors.findIndex((_anchor, index) => index < anchors.length - 1 && spell.unlockLevel <= (anchors[index + 1] as CostAnchor).level);
  const from = anchors[segmentStart === -1 ? lastSegmentStart : segmentStart] as CostAnchor;
  const to = anchors[(segmentStart === -1 ? lastSegmentStart : segmentStart) + 1] as CostAnchor;
  const exponent = Math.log(to.copper / from.copper) / Math.log(to.level / from.level);
  const ultimateFactor = spell.isUltimate ? balanceNumber(game.data, 'spells', 'ultimateCostFactor') : 1;
  return Math.max(1, Math.round(from.copper * (spell.unlockLevel / from.level) ** exponent * ultimateFactor));
}

// A shield costs a share of the pool. Every other spell has a fixed cost.
function describeCost(text: GameText, spell: Spell): string | number {
  return spell.effect.kind === 'shield' ? t('{percent} of maximum', { percent: formatPercent(spell.effect.resourceFraction) }) : spell.resourceCost;
}

export function spellTable(game: GameIndex, text: GameText, heroClass: HeroClass): Html {
  const resourceName = text.require(`resource.${heroClass.resourceId}`);
  const copperPerSilver = balanceNumber(game.data, 'economy', 'copperPerSilver');
  const silverPerGold = balanceNumber(game.data, 'economy', 'silverPerGold');
  const rows = game.spellsOfClass(heroClass.id).map((spell) => [
    spell.unlockLevel,
    html`${spellIcon(text, spell)} ${spellName(text, spell)}${spell.isUltimate ? html` ${badge(text.require('spell.ultimate'), 'boss')}` : null}`,
    describeEffect(text, spell.effect),
    describeCost(text, spell),
    formatDuration(spell.cooldownSeconds),
    formatMoney(learnCostCopper(game, spell), copperPerSilver, silverPerGold),
  ]);
  return dataTable([t('Level'), t('Spell'), t('Effect'), t('{resource} cost', { resource: resourceName }), t('Cooldown'), t('Academy price')], rows, { sortable: true });
}
