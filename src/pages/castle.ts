import type { CastleSpot } from '../data/gameData';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { jumpLinks, loreText, pageHeading, panel } from '../render/components';
import { html, type Html } from '../render/html';
import type { Page } from '../render/page';
import { t } from '../i18n/ui';

function spotPanel(text: GameText, spot: CastleSpot): Html {
  const tales = Array.from({ length: spot.tales }, (_, index) => loreText(text.require(`castle.${spot.id}.tale.${index + 1}`)));
  return html`<article class="castle-spot">
    <h3 class="group-heading">${text.require(`castle.${spot.id}.name`)}</h3>
    <p class="muted">${text.require(`castle.${spot.id}.title`)}</p>
    ${tales}
  </article>`;
}

// The game groups castle spots by screen. People come before landmarks inside a screen.
export function buildCastlePages(game: GameIndex, text: GameText): Page[] {
  const screenNumbers = [...new Set(game.data.castleSpots.map((spot) => spot.screen))].sort((a, b) => a - b);
  const screenPanels = screenNumbers.map((screen) => {
    const spots = game.data.castleSpots.filter((spot) => spot.screen === screen).sort((a, b) => Number(b.kind === 'person') - Number(a.kind === 'person'));
    return panel(text.require(`castle.screen.${screen}`), html`${spots.map((spot) => spotPanel(text, spot))}`, { anchor: `screen-${screen}` });
  });
  const body = html`
    ${pageHeading(t('The castle'), t('Talk to the court and read what each corner of the castle remembers.'))}
    ${jumpLinks(screenNumbers.map((screen) => ({ anchor: `screen-${screen}`, label: text.require(`castle.screen.${screen}`) })))}
    ${screenPanels}`;
  const searchEntries = game.data.castleSpots.map((spot) => text.require(`castle.${spot.id}.name`)).join(' ');
  return [{ path: 'castle/index.html', title: t('The castle'), section: 'towns', body, searchKind: t('Castle'), searchKeywords: searchEntries }];
}
