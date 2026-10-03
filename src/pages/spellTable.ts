import { balanceNumber } from '../data/balance';
import type { HeroClass, Spell, SpellEffect } from '../data/gameData';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { badge, dataTable } from '../render/components';
import { formatDuration, formatMoney } from '../render/format';
import { html, type Html } from '../render/html';

const percentOf = (fraction: number): number => Math.round(fraction * 100);

// Same wording rules as describeEffect in the game, so the wiki shows the text the player sees.
function describeEffect(text: GameText, effect: SpellEffect): string {
  switch (effect.kind) {
    case 'damage':
      if (effect.target === 'allEnemies') return text.format('spell.effect.damageAllEnemies', { percent: percentOf(effect.power) });
      return effect.hits > 1
        ? text.format('spell.effect.damageEnemyMulti', { hits: effect.hits, percent: percentOf(effect.power) })
        : text.format('spell.effect.damageEnemy', { percent: percentOf(effect.power) });
    case 'drain':
      return text.format('spell.effect.drain', { percent: percentOf(effect.power), heal: percentOf(effect.healFraction) });
    case 'heal':
      return text.format(`spell.effect.heal.${effect.target}`, { percent: percentOf(effect.power) });
    case 'status':
      return text.format('spell.effect.status', {
        effect: text.format(`spell.status.${effect.status}`, { percent: percentOf(effect.strength) }),
        target: text.require(`spell.target.${effect.target}`),
        seconds: effect.durationSeconds,
      });
  }
}

export const spellName = (text: GameText, spell: Spell): string => text.require(`spell.${spell.id}`);

// Same formula as learnCostCopper in the game.
function learnCostCopper(game: GameIndex, spell: Spell): number {
  const baseCost = balanceNumber(game.data, 'spells', 'learnCostBaseCopper');
  const levelExponent = balanceNumber(game.data, 'spells', 'learnCostLevelExponent');
  const ultimateFactor = spell.isUltimate ? balanceNumber(game.data, 'spells', 'ultimateCostFactor') : 1;
  return Math.max(1, Math.round(baseCost * spell.unlockLevel ** levelExponent * ultimateFactor));
}

export function spellTable(game: GameIndex, text: GameText, heroClass: HeroClass): Html {
  const resourceName = text.require(`resource.${heroClass.resourceId}`);
  const copperPerSilver = balanceNumber(game.data, 'economy', 'copperPerSilver');
  const silverPerGold = balanceNumber(game.data, 'economy', 'silverPerGold');
  const rows = game.spellsOfClass(heroClass.id).map((spell) => [
    spell.unlockLevel,
    spell.isUltimate ? html`${spellName(text, spell)} ${badge(text.require('spell.ultimate'), 'boss')}` : spellName(text, spell),
    describeEffect(text, spell.effect),
    spell.resourceCost,
    formatDuration(spell.cooldownSeconds),
    formatMoney(learnCostCopper(game, spell), copperPerSilver, silverPerGold),
  ]);
  return dataTable(['Level', 'Spell', 'Effect', `${resourceName} cost`, 'Cooldown', 'Academy price'], rows, { sortable: true });
}
