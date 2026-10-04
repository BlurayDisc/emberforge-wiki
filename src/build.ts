import { cpSync, mkdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { FONT_FILES, GAME_ART_FOLDER, GAME_DATA_FOLDER, OUTPUT_FOLDER, STATIC_FOLDER } from './config';
import { loadGameData } from './data/gameData';
import { LANGUAGES, languageFolder, type Language } from './i18n/language';
import { buildInLanguage } from './i18n/ui';
import { GameIndex } from './data/gameIndex';
import { GameText } from './data/text';
import { renderPage } from './render/layout';
import type { Page } from './render/page';
import { PAGE_BUILDERS } from './pages/pageBuilders';

function writeSiteFile(relativePath: string, content: string): void {
  const outputPath = join(OUTPUT_FOLDER, relativePath);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, content);
}

function copyFonts(): void {
  const require = createRequire(import.meta.url);
  mkdirSync(join(OUTPUT_FOLDER, 'assets/fonts'), { recursive: true });
  for (const [packageName, fileName] of FONT_FILES) {
    const packageFolder = dirname(require.resolve(`${packageName}/package.json`));
    copyFileSync(join(packageFolder, 'files', fileName), join(OUTPUT_FOLDER, 'assets/fonts', fileName));
  }
}

function buildSearchIndex(pages: Page[]): string {
  const entries = pages
    .filter((page) => page.searchKind)
    .map((page) => ({ title: page.title, kind: page.searchKind, path: page.path, keywords: page.searchKeywords ?? '' }));
  return JSON.stringify(entries);
}

function assertNoDuplicatePaths(pages: Page[]): void {
  const seen = new Set<string>();
  for (const page of pages) {
    if (seen.has(page.path)) throw new Error(`Two pages write to ${page.path}.`);
    seen.add(page.path);
  }
}

function buildLanguage(language: Language): number {
  const data = loadGameData(language);
  const game = new GameIndex(data);
  const text = GameText.from(data);
  const pages = buildInLanguage(language, () => PAGE_BUILDERS.flatMap((buildPages) => buildPages(game, text)));
  assertNoDuplicatePaths(pages);
  const folder = languageFolder(language);
  for (const page of pages) writeSiteFile(`${folder}${page.path}`, buildInLanguage(language, () => renderPage(page, data.source, language)));
  writeSiteFile(`assets/${language === 'en' ? 'search-index.json' : `search-index.${language}.json`}`, buildSearchIndex(pages));
  return pages.length;
}

rmSync(OUTPUT_FOLDER, { recursive: true, force: true });
mkdirSync(OUTPUT_FOLDER, { recursive: true });
cpSync(STATIC_FOLDER, join(OUTPUT_FOLDER, 'assets'), { recursive: true });
cpSync(GAME_ART_FOLDER, join(OUTPUT_FOLDER, 'assets/art'), { recursive: true });
// The spell sound buttons synthesise the sounds in the browser from these recipes.
copyFileSync(join(GAME_DATA_FOLDER, 'audio/sound-effects.json'), join(OUTPUT_FOLDER, 'assets/sound-effects.json'));
copyFonts();
const pageCounts = LANGUAGES.map((language) => `${buildLanguage(language)} ${language} pages`);
writeSiteFile('.nojekyll', '');
console.log(`Wrote ${pageCounts.join(', ')} to ${OUTPUT_FOLDER}`);
