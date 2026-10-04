import { GAME_REPOSITORY_URL, SITE_TITLE } from '../config';
import type { GameSnapshotSource } from '../data/gameData';
import { HTML_LANGUAGE_CODE, LANGUAGES, LANGUAGE_LABEL, languageFolder, type Language } from '../i18n/language';
import { t, tHtml } from '../i18n/ui';
import { html, raw } from './html';
import { SECTIONS, type Page } from './page';

export const LANGUAGE_STORAGE_KEY = 'emberforgeWikiLanguage';

const upFolders = (count: number): string => (count === 0 ? './' : '../'.repeat(count));

function describeSource(source: GameSnapshotSource | null) {
  if (!source) return html`${t('Built from the game data files.')}`;
  const commitLink = html`<a href="${GAME_REPOSITORY_URL}/commit/${source.commit}">${source.commit}</a>`;
  const unsavedNote = source.hasUncommittedDataChanges ? t(' plus local edits') : '';
  return tHtml('Built from game data at commit {commit}{unsavedNote} ({date}).', { commit: commitLink, unsavedNote, date: source.commitDate });
}

// Pages of a language that is not the default sit in a folder. Site pages stay inside that folder,
// and the shared files (style, script, pictures, fonts) stay at the site root.
export function renderPage(page: Page, source: GameSnapshotSource | null, language: Language): string {
  const depthInLanguageFolder = page.path.split('/').length - 1;
  const pageRoot = upFolders(depthInLanguageFolder);
  const assetRoot = upFolders(depthInLanguageFolder + (languageFolder(language) === '' ? 0 : 1));
  const searchIndexFile = language === 'en' ? 'search-index.json' : `search-index.${language}.json`;
  const navigation = SECTIONS.map(
    (section) => html`<a href="@/${section.indexPath}"${section.id === page.section ? raw(' aria-current="page"') : raw('')}>${t(section.label)}</a>`,
  );
  const languageLink = (target: Language) => {
    const targetHref = `${assetRoot}${languageFolder(target)}${page.path}`;
    const attributes = target === language ? raw(' aria-current="true"') : raw('');
    return html`<a href="${targetHref}" lang="${HTML_LANGUAGE_CODE[target]}" hreflang="${HTML_LANGUAGE_CODE[target]}" data-language-choice="${target}"${attributes}>${LANGUAGE_LABEL[target]}</a>`;
  };
  const rememberedLanguageRedirect = language === 'en'
    ? raw(`<script>try{if(localStorage.getItem('${LANGUAGE_STORAGE_KEY}')==='zh')location.replace('${assetRoot}zh/${page.path}')}catch(error){}</script>`)
    : raw('');
  const document = html`<!doctype html>
<html lang="${HTML_LANGUAGE_CODE[language]}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${page.path === 'index.html' ? t(SITE_TITLE) : `${page.title} - ${t(SITE_TITLE)}`}</title>
  <link rel="stylesheet" href="@/assets/style.css">
  ${rememberedLanguageRedirect}
</head>
<body data-root="${pageRoot}" data-search-index="${assetRoot}assets/${searchIndexFile}" data-language="${language}">
  <header class="site-header">
    <a class="site-title" href="@/index.html">Emberforge</a>
    <div class="search">
      <input id="search-box" type="search" placeholder="${t('Search the wiki...')}" autocomplete="off" aria-label="${t('Search the wiki')}" data-empty-text="${t('Nothing found')}">
      <ul id="search-results" hidden></ul>
    </div>
    <nav class="language-switch" aria-label="${t('Language')}">${LANGUAGES.map(languageLink)}</nav>
  </header>
  <nav class="site-nav" aria-label="${t('Sections')}">${navigation}</nav>
  <main>${page.body}</main>
  <footer class="site-footer">
    <p>${describeSource(source)} ${t('A fan wiki, regenerated from the game files.')}</p>
  </footer>
  <script src="@/assets/wiki.js" defer></script>
</body>
</html>
`;
  return document.value.replaceAll('@/assets/', `${assetRoot}assets/`).replaceAll('@/', pageRoot);
}
