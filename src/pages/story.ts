import type { StoryBeat } from '../data/gameData';
import type { GameIndex } from '../data/gameIndex';
import type { GameText } from '../data/text';
import { jumpLinks, loreText, pageHeading, panel, siteLink } from '../render/components';
import { html, type Html } from '../render/html';
import type { Page } from '../render/page';
import { t, tHtml } from '../i18n/ui';

function triggerText(game: GameIndex, beat: StoryBeat): Html {
  switch (beat.trigger.kind) {
    case 'firstHeroHired':
      return html`${t('Plays when you hire your first hero.')}`;
    case 'secondHeroHired':
      return html`${t('Plays when you hire your second hero.')}`;
    case 'firstClear': {
      const dungeon = game.dungeon(beat.trigger.dungeonId!);
      return tHtml('Plays when you clear {dungeon} for the first time.', { dungeon: siteLink(`dungeons/${dungeon.id}.html`, dungeon.name) });
    }
  }
}

// A beat has one text key for each picture page: story.<beat id>.<page number>.
function beatPanel(game: GameIndex, text: GameText, beat: StoryBeat): Html {
  const paragraphs = beat.pages.flatMap((_page, index) => text.find(`story.${beat.id}.${index + 1}`) ?? []);
  const pageCount = Math.max(paragraphs.length, 1);
  return panel(text.require(`story.${beat.id}.title`), html`
    <p class="muted">${triggerText(game, beat)} ${t('{count} pictures.', { count: beat.pages.length })}</p>
    ${paragraphs.map((paragraph) => loreText(paragraph))}
    ${pageCount < beat.pages.length ? html`<p class="muted">${t('Some pictures have no words.')}</p>` : null}`, { anchor: beat.id });
}

export function buildStoryPages(game: GameIndex, text: GameText): Page[] {
  const chapters = [...new Set(game.data.storyBeats.map((beat) => beat.chapter))].sort((a, b) => a - b);
  const chapterPanels = chapters.map((chapter) => html`
    <h2 class="group-heading">${text.format('story.chapterTitle', { number: chapter, name: text.require(`story.chapter.${chapter}.name`) })}</h2>
    ${game.data.storyBeats.filter((beat) => beat.chapter === chapter).map((beat) => beatPanel(game, text, beat))}`);
  const body = html`
    ${pageHeading(t('The story'), t('The scenes that play while you progress. Spoilers ahead.'))}
    ${jumpLinks(game.data.storyBeats.map((beat) => ({ anchor: beat.id, label: text.require(`story.${beat.id}.title`) })))}
    <h2 class="group-heading">${t('Prologue')}</h2>
    ${[1, 2, 3, 4, 5].map((number) => loreText(text.require(`lore.prologue.${number}`)))}
    ${chapterPanels}`;
  return [{ path: 'story/index.html', title: t('The story'), section: 'towns', body, searchKind: t('Story'), searchKeywords: game.data.storyBeats.map((beat) => text.require(`story.${beat.id}.title`)).join(' ') }];
}
