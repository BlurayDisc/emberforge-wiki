import type { HeroClass, Spell, SpellLook } from '../data/gameData';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { pixelArt } from '../render/art';
import { html, type Html } from '../render/html';
import { t } from '../i18n/ui';
import { spellIcon, spellName } from './spellTable';

const MAXIMUM_SOUNDED_HITS = 5;

type LookPart = 'cast' | 'projectile' | 'impact' | 'buff' | 'debuff';

const partLabels: Record<LookPart, () => string> = {
  cast: () => t('Cast'),
  projectile: () => t('Flight'),
  impact: () => t('Impact'),
  buff: () => t('Buff'),
  debuff: () => t('Debuff'),
};

const LOOK_PARTS = Object.keys(partLabels) as LookPart[];

// Same rule as the game: a status spell on enemies is a debuff, and on allies or self it is a buff.
function soundRole(spell: Spell): 'damage' | 'heal' | 'buff' | 'debuff' {
  const { effect } = spell;
  if (effect.kind === 'damage' || effect.kind === 'drain') return 'damage';
  if (effect.kind === 'heal') return 'heal';
  return effect.target === 'enemy' || effect.target === 'allEnemies' ? 'debuff' : 'buff';
}

function lookPart(look: SpellLook, part: LookPart): Html | null {
  const artId = look[part];
  if (artId === undefined) return null;
  return html`<figure class="look-part">
    <div class="effect-stage">${pixelArt('spells/effects', `${part}-${artId}--${look.theme}`, `${partLabels[part]()}: ${artId}`, 3)}</div>
    <figcaption>${partLabels[part]()}</figcaption>
  </figure>`;
}

function soundButton(spell: Spell, look: SpellLook): Html {
  const { effect } = spell;
  const hits = effect.kind === 'damage' || effect.kind === 'drain' ? Math.min(effect.hits, MAXIMUM_SOUNDED_HITS) : 1;
  const inflictsStatus = effect.kind === 'damage' && effect.inflicts !== undefined;
  return html`<button type="button" class="sound-button" data-spell-sound="${spell.id}" data-spell-role="${soundRole(spell)}" data-spell-hits="${hits}"${look.projectile ? html` data-spell-projectile` : null}${inflictsStatus ? html` data-spell-status` : null}>${t('Play sound')}</button>`;
}

// The animations and the sound of each spell that has a look. Spells without a look have an icon only.
export function spellLooks(game: GameIndex, text: GameText, heroClass: HeroClass): Html | null {
  const cards = game.spellsOfClass(heroClass.id).flatMap((spell) => {
    const look = game.data.spellLooks[spell.id];
    if (!look) return [];
    const hasSound = game.data.spellSounds[spell.id] !== undefined;
    return [html`<article class="spell-look">
      <h4>${spellIcon(text, spell)} ${spellName(text, spell)}</h4>
      <div class="look-parts">${LOOK_PARTS.map((part) => lookPart(look, part))}</div>
      ${hasSound ? soundButton(spell, look) : null}
    </article>`];
  });
  if (cards.length === 0) return null;
  return html`<h3 class="group-heading">${t('Animations and sounds')}</h3>
    <p class="muted">${t('Spells with a look show their effects here. A spell shows a cast on the caster, a flight to the target and an impact. A buff or a debuff stays on its unit while the status lasts. Press the button to hear the spell.')}</p>
    <div class="spell-looks">${cards}</div>`;
}
