import { balanceNumber } from '../data/balance';
import type { HeroClass, MonsterSpell, Spell, SpellEffect } from '../data/gameData';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { pixelArt } from '../render/art';
import { badge, dataTable } from '../render/components';
import { formatDuration, formatMoney } from '../render/format';
import { html, type Html } from '../render/html';
import { t } from '../i18n/ui';

const percentOf = (fraction: number): number => Math.round(fraction * 100);

// Same wording rules as describeEffect in the game, so the wiki shows the text the player sees.
function describeInflictedStatus(text: GameText, inflicts: { status: string; strength: number; durationSeconds: number }): string {
  return text.format('spell.effect.inflicts', { effect: text.format(`spell.status.${inflicts.status}`, { percent: percentOf(inflicts.strength) }), seconds: inflicts.durationSeconds });
}

function describeEffect(text: GameText, effect: SpellEffect): string {
  switch (effect.kind) {
    case 'damage': {
      const damageText = effect.target === 'allEnemies'
        ? text.format('spell.effect.damageAllEnemies', { percent: percentOf(effect.power) })
        : effect.hits > 1
          ? text.format('spell.effect.damageEnemyMulti', { hits: effect.hits, percent: percentOf(effect.power) })
          : text.format('spell.effect.damageEnemy', { percent: percentOf(effect.power) });
      return effect.inflicts ? `${damageText} ${describeInflictedStatus(text, effect.inflicts)}` : damageText;
    }
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

// A monster casts at heroes, so the words "you" and "enemy" of a hero spell would be wrong here. Same rule as describeMonsterSpell in the game.
function describeMonsterEffect(text: GameText, effect: SpellEffect): string {
  if (effect.kind === 'damage') {
    const damageText = text.format('spell.monster.damage', { percent: percentOf(effect.power) });
    return effect.inflicts ? `${damageText} ${describeInflictedStatus(text, effect.inflicts)}` : damageText;
  }
  if (effect.kind === 'status') {
    return text.format('spell.effect.status', {
      effect: text.format(`spell.status.${effect.status}`, { percent: percentOf(effect.strength) }),
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
    html`${spellIcon(text, spell)} ${spellName(text, spell)}${spell.isUltimate ? html` ${badge(text.require('spell.ultimate'), 'boss')}` : null}`,
    describeEffect(text, spell.effect),
    spell.resourceCost,
    formatDuration(spell.cooldownSeconds),
    formatMoney(learnCostCopper(game, spell), copperPerSilver, silverPerGold),
  ]);
  return dataTable([t('Level'), t('Spell'), t('Effect'), t('{resource} cost', { resource: resourceName }), t('Cooldown'), t('Academy price')], rows, { sortable: true });
}
