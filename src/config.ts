import { resolve } from 'node:path';

export const GAME_DATA_FOLDER = resolve(process.env.EMBERFORGE_DATA ?? 'game-data');
export const OUTPUT_FOLDER = resolve('dist');
export const STATIC_FOLDER = resolve('src/static');
export const FONT_FILES = [
  ['@fontsource/jacquard-12', 'jacquard-12-latin-400-normal.woff2'],
  ['@fontsource/atkinson-hyperlegible', 'atkinson-hyperlegible-latin-400-normal.woff2'],
  ['@fontsource/atkinson-hyperlegible', 'atkinson-hyperlegible-latin-700-normal.woff2'],
] as const;
export const SITE_TITLE = 'Emberforge Wiki';
export const GAME_REPOSITORY_URL = 'https://github.com/BlurayDisc/emberforge';
