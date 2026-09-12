import { deflateSync } from "node:zlib";

// Small, distinct PNGs generated solely for isolated photo persistence tests.
function chunk(type: string, data: Buffer) {
  const body = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([size, body, checksum]);
}

function png(name: string, width: number, rgb: [number, number, number]) {
  const height = 12;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const rows = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const offset = y * (width * 3 + 1) + 1 + x * 3;
      rgb.forEach((color, channel) => {
        rows[offset + channel] = color;
      });
    }
  return {
    name,
    mimeType: "image/png",
    buffer: Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(rows)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  };
}

export const ganapatiPhoto = png("ganapati-orange.png", 20, [242, 116, 24]);
export const secondGanapatiPhoto = png("ganapati-red.png", 22, [175, 45, 36]);
export const decorationPhoto = png("decoration-green.png", 24, [60, 135, 90]);
export const secondDecorationPhoto = png(
  "decoration-blue.png",
  26,
  [40, 90, 190],
);
