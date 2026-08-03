const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 calculation helper
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([len, typeAndData, crcBuf]);
}

function generateIconPNG(size) {
  const width = size;
  const height = size;

  // Scanlines with filter byte 0
  const rawData = Buffer.alloc(height * (1 + width * 4));

  for (let y = 0; y < height; y++) {
    const lineOffset = y * (1 + width * 4);
    rawData[lineOffset] = 0; // Filter 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = lineOffset + 1 + x * 4;

      // Rounded rectangle mask
      const radius = size * 0.22;
      const dx = Math.max(0, Math.abs(x - width / 2) - (width / 2 - radius));
      const dy = Math.max(0, Math.abs(y - height / 2) - (height / 2 - radius));
      const dist = Math.sqrt(dx * dx + dy * dy);
      const isInside = dist <= radius;

      if (!isInside) {
        // Transparent
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // Gradient color (Cyan #0284c7 -> Indigo #6366f1)
      const factor = (x + y) / (width + height);
      const r = Math.round(2 + factor * (99 - 2));
      const g = Math.round(132 + factor * (102 - 132));
      const b = Math.round(199 + factor * (241 - 199));

      // Simple EN -> SI emblem overlay (light central accent)
      const cx = width / 2;
      const cy = height / 2;
      const isCenterBar = Math.abs(y - cy) < size * 0.12 && Math.abs(x - cx) < size * 0.35;
      const isArrowHead = (x > cx + size * 0.1) && Math.abs(y - cy) + (x - cx) < size * 0.35 && (x - cx) > Math.abs(y - cy);

      let finalR = r, finalG = g, finalB = b;
      if (isCenterBar || isArrowHead) {
        finalR = 255;
        finalG = 255;
        finalB = 255;
      }

      rawData[pixelOffset] = finalR;
      rawData[pixelOffset + 1] = finalG;
      rawData[pixelOffset + 2] = finalB;
      rawData[pixelOffset + 3] = 255; // Alpha
    }
  }

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT Chunk
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate icon set
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const pngBuffer = generateIconPNG(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, pngBuffer);
  console.log(`Generated ${filePath}`);
});
