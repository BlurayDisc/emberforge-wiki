import { GAME_REPOSITORY_URL, SITE_TITLE } from '../config';
import type { GameSnapshotSource } from '../data/gameData';
import { html, raw } from './html';
import { SECTIONS, type Page } from './page';

function rootPrefixOf(pagePath: string): string {
  const depth = pagePath.split('/').length - 1;
  return depth === 0 ? './' : '../'.repeat(depth);
}

function describeSource(source: GameSnapshotSource | null) {
  if (!source) return html`Built from the game data files.`;
  const unsavedNote = source.hasUncommittedDataChanges ? ' plus local edits' : '';
  return html`Built from game data at commit <a href="${GAME_REPOSITORY_URL}/commit/${source.commit}">${source.commit}</a>${unsavedNote} (${source.commitDate}).`;
}

export function renderPage(page: Page, source: GameSnapshotSource | null): string {
  const root = rootPrefixOf(page.path);
  const navigation = SECTIONS.map(
    (section) => html`<a href="@/${section.indexPath}"${section.id === page.section ? raw(' aria-current="page"') : raw('')}>${section.label}</a>`,
  );
  const document = html`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${page.path === 'index.html' ? SITE_TITLE : `${page.title} - ${SITE_TITLE}`}</title>
  <link rel="stylesheet" href="@/assets/style.css">
</head>
<body data-root="${root}">
  <header class="site-header">
    <a class="site-title" href="@/index.html">Emberforge</a>
    <div class="search">
      <input id="search-box" type="search" placeholder="Search the wiki..." autocomplete="off" aria-label="Search the wiki">
      <ul id="search-results" hidden></ul>
    </div>
  </header>
  <nav class="site-nav" aria-label="Sections">${navigation}</nav>
  <main>${page.body}</main>
  <footer class="site-footer">
    <p>${describeSource(source)} A fan wiki, regenerated from the game files.</p>
  </footer>
  <script src="@/assets/wiki.js" defer></script>
</body>
</html>
`;
  return document.value.replaceAll('@/', root);
}
