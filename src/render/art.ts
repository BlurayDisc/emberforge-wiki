import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_ART_FOLDER } from '../config';
import { html, type Html } from './html';

export type ArtFolder = 'heroes' | 'monsters' | 'items' | 'materials' | 'dungeons' | 'spells/icons' | 'spells/effects';

// The PNG header stores the width at byte 16 and the height at byte 20.
function readPngSize(filePath: string): { width: number; height: number } {
  const header = readFileSync(filePath).subarray(0, 24);
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

// A missing picture fails the build. Run "npm run sync" to draw the art again.
export function pixelArt(folder: ArtFolder, fileName: string, label: string, scale: number): Html {
  const filePath = join(GAME_ART_FOLDER, folder, `${fileName}.png`);
  if (!existsSync(filePath)) throw new Error(`No game art at ${filePath}. Run "npm run sync".`);
  const { width, height } = readPngSize(filePath);
  return html`<img class="pixel-art" src="@/assets/art/${folder}/${fileName}.png" alt="${label}" width="${width * scale}" height="${height * scale}">`;
}
