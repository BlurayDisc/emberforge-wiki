import { cpSync, mkdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { FONT_FILES, OUTPUT_FOLDER, STATIC_FOLDER } from './config';
import { loadGameData } from './data/gameData';
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

const data = loadGameData();
const game = new GameIndex(data);
const text = GameText.from(data);
const pages = PAGE_BUILDERS.flatMap((buildPages) => buildPages(game, text));
assertNoDuplicatePaths(pages);

rmSync(OUTPUT_FOLDER, { recursive: true, force: true });
mkdirSync(OUTPUT_FOLDER, { recursive: true });
cpSync(STATIC_FOLDER, join(OUTPUT_FOLDER, 'assets'), { recursive: true });
copyFonts();
for (const page of pages) writeSiteFile(page.path, renderPage(page, data.source));
writeSiteFile('assets/search-index.json', buildSearchIndex(pages));
writeSiteFile('.nojekyll', '');
console.log(`Wrote ${pages.length} pages to ${OUTPUT_FOLDER}`);
