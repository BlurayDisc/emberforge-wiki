import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { encodeAnimatedPng, encodePng, type AnimationFrame } from './png';

// The game draws all its pixel art with canvas code. This tool runs that code against a tiny canvas
// that keeps raw pixels, then saves PNG files. The wiki build only copies the PNG files.
const gameRepository = resolve(process.env.EMBERFORGE_REPO ?? '../emberforge');
const artFolder = resolve('game-art');
const gameDataFolder = resolve('game-data');

const readGameData = <T>(fileName: string): T => JSON.parse(readFileSync(join(gameDataFolder, fileName), 'utf8')) as T;

function parseHexColor(color: string): [number, number, number] {
  const digits = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color)?.[1];
  if (!digits) throw new Error(`The art tool only knows hex colours, got "${color}".`);
  const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join('') : digits;
  return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16)) as [number, number, number];
}

class PixelCanvas {
  width = 0;
  height = 0;
  private pixels: Uint8ClampedArray | null = null;

  private allocatedPixels(): Uint8ClampedArray {
    this.pixels ??= new Uint8ClampedArray(this.width * this.height * 4);
    return this.pixels;
  }

  getContext(kind: string) {
    if (kind !== '2d') return null;
    const canvas = this;
    return {
      fillStyle: '#000000',
      fillRect(x: number, y: number, width: number, height: number) {
        const [red, green, blue] = parseHexColor(this.fillStyle);
        const pixels = canvas.allocatedPixels();
        for (let row = Math.max(0, y); row < Math.min(canvas.height, y + height); row++) {
          for (let column = Math.max(0, x); column < Math.min(canvas.width, x + width); column++) {
            pixels.set([red, green, blue, 255], (row * canvas.width + column) * 4);
          }
        }
      },
      getImageData(_x: number, _y: number, _width: number, _height: number) {
        return { data: canvas.allocatedPixels().slice() };
      },
    };
  }

  toRgba(): Uint8ClampedArray {
    return this.allocatedPixels();
  }

  toPng(): Buffer {
    return encodePng(this.width, this.height, this.allocatedPixels());
  }

  toDataURL(): string {
    return `data:image/png;base64,${this.toPng().toString('base64')}`;
  }
}

class PixelImage {
  src = '';
  className = '';
  alt = '';
  width = 0;
  height = 0;
}

(globalThis as unknown as { document: unknown }).document = {
  createElement: (tag: string) => (tag === 'canvas' ? new PixelCanvas() : new PixelImage()),
};

function importGameModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(resolve(gameRepository, relativePath)).href) as Promise<T>;
}

function savePng(relativePath: string, png: Buffer): void {
  const outputPath = join(artFolder, relativePath);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, png);
}

const savePixelCanvas = (relativePath: string, canvas: unknown): void => savePng(relativePath, (canvas as PixelCanvas).toPng());

function saveDataUrlImage(relativePath: string, image: unknown): void {
  const { src } = image as PixelImage;
  savePng(relativePath, Buffer.from(src.replace('data:image/png;base64,', ''), 'base64'));
}

interface ClassEntry { id: string }
interface MonsterEntry { spriteKey: string }
interface DungeonEntry { id: string }
interface MaterialEntry { id: string; category: string }
interface BaseItemEntry { id: string; mainCategory: string }

const classes = readGameData<ClassEntry[]>('classes.json');
const monsters = readGameData<MonsterEntry[]>('monsters.json');
const dungeons = readGameData<DungeonEntry[]>('dungeons.json');
const materials = readGameData<MaterialEntry[]>('materials.json');
const baseItems = readGameData<BaseItemEntry[]>('base-items.json');
const heroNames = readGameData<string[]>('hero-names.json');

const { drawHeroSprite } = await importGameModule<{ drawHeroSprite: (classId: string, heroName: string) => unknown }>('src/render/heroSpriteArt.ts');
const { CREATURE_DRAWERS } = await importGameModule<{ CREATURE_DRAWERS: Record<string, () => unknown> }>('src/render/creatureArt.ts');
const { createItemIcon, createMaterialIcon, createDungeonIcon } = await importGameModule<{
  createItemIcon: (baseId: string, materialId: string, mainCategory: string, scale: number) => unknown;
  createMaterialIcon: (materialId: string, category: string, scale: number) => unknown;
  createDungeonIcon: (dungeonId: string, scale: number) => unknown;
}>('src/ui/iconArt.ts');

rmSync(artFolder, { recursive: true, force: true });

// A hero look depends on the hero name, so every class is drawn with the same first name from the name list.
const sampleHeroName = heroNames[0];
if (!sampleHeroName) throw new Error('hero-names.json has no names.');
for (const heroClass of classes) savePixelCanvas(`heroes/${heroClass.id}.png`, drawHeroSprite(heroClass.id, sampleHeroName));

for (const spriteKey of new Set(monsters.map((monster) => monster.spriteKey))) {
  const drawCreature = CREATURE_DRAWERS[spriteKey];
  if (!drawCreature) throw new Error(`The game has no drawing for sprite key "${spriteKey}".`);
  savePixelCanvas(`monsters/${spriteKey}.png`, drawCreature());
}

for (const material of materials) saveDataUrlImage(`materials/${material.id}.png`, createMaterialIcon(material.id, material.category, 1));

// An item icon is tinted by its main material, so each item is drawn once for every material it can be made of.
for (const base of baseItems) {
  for (const material of materials.filter((candidate) => candidate.category === base.mainCategory)) {
    saveDataUrlImage(`items/${base.id}--${material.id}.png`, createItemIcon(base.id, material.id, base.mainCategory, 1));
  }
}

for (const dungeon of dungeons) saveDataUrlImage(`dungeons/${dungeon.id}.png`, createDungeonIcon(dungeon.id, 1));

// Every spell has an icon. Spells with a look in spell-visuals.json also have animated effects.
interface SpellEntry { id: string; reservedFor?: string }
interface SpellLook { theme: string; cast?: string; projectile?: string; impact?: string; buff?: string; debuff?: string }
interface EffectArtFrames { frames: PixelCanvas[]; framesPerSecond: number; looping: boolean }
type EffectArtBuilder = (colors: unknown) => EffectArtFrames;

const { createSpellIcon } = await importGameModule<{ createSpellIcon: (spellId: string, scale: number) => unknown }>('src/ui/spellIconArt.ts');
const { SPELL_THEMES } = await importGameModule<{ SPELL_THEMES: Record<string, unknown> }>('src/render/spellEffects/spellThemes.ts');
const { CAST_ART } = await importGameModule<{ CAST_ART: Record<string, EffectArtBuilder> }>('src/render/spellEffects/castArt.ts');
const { PROJECTILE_ART } = await importGameModule<{ PROJECTILE_ART: Record<string, EffectArtBuilder> }>('src/render/spellEffects/projectileArt.ts');
const { IMPACT_ART } = await importGameModule<{ IMPACT_ART: Record<string, EffectArtBuilder> }>('src/render/spellEffects/impactArt.ts');
const { BUFF_ART, DEBUFF_ART } = await importGameModule<{ BUFF_ART: Record<string, EffectArtBuilder>; DEBUFF_ART: Record<string, EffectArtBuilder> }>('src/render/spellEffects/statusArt.ts');

const EFFECT_PHASES = [
  { phase: 'cast', builders: CAST_ART },
  { phase: 'projectile', builders: PROJECTILE_ART },
  { phase: 'impact', builders: IMPACT_ART },
  { phase: 'buff', builders: BUFF_ART },
  { phase: 'debuff', builders: DEBUFF_ART },
] as const;
const MILLISECONDS_PER_SECOND = 1000;
// A one-shot effect is over in under half a second. The last frame stays a little, so the loop is easy to watch.
const ONE_SHOT_PAUSE_MILLISECONDS = 700;

// A reserved spell is not loaded by the game, so the icon code does not know it.
for (const spell of readGameData<SpellEntry[]>('spells.json').filter((candidate) => candidate.reservedFor === undefined)) saveDataUrlImage(`spells/icons/${spell.id}.png`, createSpellIcon(spell.id, 1));

const spellLooks = readGameData<{ spells: Record<string, SpellLook> }>('spell-visuals.json').spells;
const drawnEffects = new Set<string>();
for (const [spellId, look] of Object.entries(spellLooks)) {
  for (const { phase, builders } of EFFECT_PHASES) {
    const artId = look[phase];
    if (artId === undefined) continue;
    const fileName = `${phase}-${artId}--${look.theme}`;
    if (drawnEffects.has(fileName)) continue;
    drawnEffects.add(fileName);
    const build = builders[artId];
    const colors = SPELL_THEMES[look.theme];
    if (!build || !colors) throw new Error(`Spell ${spellId} uses an unknown ${phase} effect "${artId}" or theme "${look.theme}".`);
    const art = build(colors);
    const [firstFrame] = art.frames;
    if (!firstFrame) throw new Error(`The ${phase} effect "${artId}" has no frames.`);
    const frameMilliseconds = Math.round(MILLISECONDS_PER_SECOND / art.framesPerSecond);
    const animation: AnimationFrame[] = art.frames.map((frame, index) => {
      if (frame.width !== firstFrame.width || frame.height !== firstFrame.height) throw new Error(`The frames of the ${phase} effect "${artId}" have different sizes.`);
      const isLastFrame = index === art.frames.length - 1;
      return { rgba: frame.toRgba(), durationMilliseconds: frameMilliseconds + (isLastFrame && !art.looping ? ONE_SHOT_PAUSE_MILLISECONDS : 0) };
    });
    savePng(`spells/effects/${fileName}.png`, encodeAnimatedPng(firstFrame.width, firstFrame.height, animation));
  }
}

console.log(`Rendered game art to ${artFolder}`);
