import { deflateSync, crc32 } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MILLISECONDS_PER_SECOND = 1000;

export interface AnimationFrame {
  rgba: Uint8ClampedArray;
  durationMilliseconds: number;
}

function chunk(type: string, content: Buffer): Buffer {
  const typeAndContent = Buffer.concat([Buffer.from(type, 'ascii'), content]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(content.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(typeAndContent));
  return Buffer.concat([length, typeAndContent, checksum]);
}

function imageHeader(width: number, height: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return chunk('IHDR', header);
}

function compressedRows(width: number, height: number, rgba: Uint8ClampedArray): Buffer {
  const rowLength = width * 4;
  const filteredRows = Buffer.alloc((rowLength + 1) * height);
  for (let row = 0; row < height; row++) {
    filteredRows[row * (rowLength + 1)] = 0;
    filteredRows.set(rgba.subarray(row * rowLength, (row + 1) * rowLength), row * (rowLength + 1) + 1);
  }
  return deflateSync(filteredRows);
}

export function encodePng(width: number, height: number, rgba: Uint8ClampedArray): Buffer {
  return Buffer.concat([PNG_SIGNATURE, imageHeader(width, height), chunk('IDAT', compressedRows(width, height, rgba)), chunk('IEND', Buffer.alloc(0))]);
}

function frameControl(sequenceNumber: number, width: number, height: number, durationMilliseconds: number): Buffer {
  const content = Buffer.alloc(26);
  content.writeUInt32BE(sequenceNumber, 0);
  content.writeUInt32BE(width, 4);
  content.writeUInt32BE(height, 8);
  content.writeUInt16BE(durationMilliseconds, 20);
  content.writeUInt16BE(MILLISECONDS_PER_SECOND, 22);
  return chunk('fcTL', content);
}

// An animated PNG (APNG). A browser that does not know APNG shows the first frame. The animation loops forever.
export function encodeAnimatedPng(width: number, height: number, frames: AnimationFrame[]): Buffer {
  const animationControl = Buffer.alloc(8);
  animationControl.writeUInt32BE(frames.length, 0);
  animationControl.writeUInt32BE(0, 4);
  let sequenceNumber = 0;
  const frameChunks = frames.flatMap((frame, index) => {
    const control = frameControl(sequenceNumber++, width, height, frame.durationMilliseconds);
    const compressed = compressedRows(width, height, frame.rgba);
    if (index === 0) return [control, chunk('IDAT', compressed)];
    const sequence = Buffer.alloc(4);
    sequence.writeUInt32BE(sequenceNumber++, 0);
    return [control, chunk('fdAT', Buffer.concat([sequence, compressed]))];
  });
  return Buffer.concat([PNG_SIGNATURE, imageHeader(width, height), chunk('acTL', animationControl), ...frameChunks, chunk('IEND', Buffer.alloc(0))]);
}
