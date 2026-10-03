import { deflateSync, crc32 } from 'node:zlib';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// The game draws all its pixel art with canvas code. This tool runs that code against a tiny canvas
// that keeps raw pixels, then saves PNG files. The wiki build only copies the PNG files.
const gameRepository = resolve(process.env.EMBERFORGE_REPO ?? '../emberforge');
const artFolder = resolve('game-art');
const gameDataFolder = resolve('game-data');

const readGameData = <T>(fileName: string): T => JSON.parse(readFileSync(join(gameDataFolder, fileName), 'utf8')) as T;

function encodePng(width: number, height: number, rgba: Uint8ClampedArray): Buffer {
  const rowLength = width * 4;
  const filteredRows = Buffer.alloc((rowLength + 1) * height);
  for (let row = 0; row < height; row++) {
    filteredRows[row * (rowLength + 1)] = 0;
    filteredRows.set(rgba.subarray(row * rowLength, (row + 1) * rowLength), row * (rowLength + 1) + 1);
  }
  const chunk = (type: string, content: Buffer): Buffer => {
    const typeAndContent = Buffer.concat([Buffer.from(type, 'ascii'), content]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(content.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(typeAndContent));
    return Buffer.concat([length, typeAndContent, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(filteredRows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

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

console.log(`Rendered game art to ${artFolder}`);
