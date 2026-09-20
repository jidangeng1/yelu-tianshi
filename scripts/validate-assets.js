"use strict";

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");

function pngFormat(colorType) {
  return ({ 0: "GRAY", 2: "RGB", 3: "INDEXED", 4: "GRAYA", 6: "RGBA" })[colorType] || "UNKNOWN";
}

function filesIn(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(entryPath);
    return entry.name.toLowerCase().endsWith(".png") ? [entryPath] : [];
  });
}

function parsePng(buffer) {
  if (buffer.length < PNG_SIGNATURE.length || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("not a PNG file");
  }
  let offset = 8;
  let header;
  const idat = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) throw new Error("truncated PNG chunk");
    const data = buffer.subarray(dataStart, dataEnd);
    if (type === "IHDR") {
      if (length !== 13) throw new Error("invalid IHDR chunk");
      header = {
        width: data.readUInt32BE(0), height: data.readUInt32BE(4), bitDepth: data[8],
        colorType: data[9], interlace: data[12]
      };
    }
    if (type === "IDAT") idat.push(data);
    if (type === "IEND") break;
    offset = dataEnd + 4;
  }
  if (!header || !idat.length) throw new Error("missing PNG image data");
  return { header, compressed: Buffer.concat(idat) };
}

function unfilterRgba(data, width, height) {
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  let inputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = data[inputOffset++];
    const row = pixels.subarray(y * stride, (y + 1) * stride);
    const prior = y ? pixels.subarray((y - 1) * stride, y * stride) : null;
    if (inputOffset + stride > data.length) throw new Error("truncated PNG scanline");
    for (let x = 0; x < stride; x += 1) {
      const value = data[inputOffset++];
      const left = x >= 4 ? row[x - 4] : 0;
      const up = prior ? prior[x] : 0;
      const upLeft = prior && x >= 4 ? prior[x - 4] : 0;
      if (filter === 0) row[x] = value;
      else if (filter === 1) row[x] = (value + left) & 255;
      else if (filter === 2) row[x] = (value + up) & 255;
      else if (filter === 3) row[x] = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
        row[x] = (value + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 255;
      } else throw new Error("unsupported PNG filter");
    }
  }
  return pixels;
}

function sameColor(a, b) {
  return Math.abs(a[0] - b[0]) <= 3 && Math.abs(a[1] - b[1]) <= 3 && Math.abs(a[2] - b[2]) <= 3;
}

function looksLikeCheckerboard(pixels, width, height) {
  if (width < 2 || height < 2) return false;
  const colorAt = (x, y) => {
    const offset = (y * width + x) * 4;
    return [pixels[offset], pixels[offset + 1], pixels[offset + 2], pixels[offset + 3]];
  };
  for (const cell of [1, 2, 4, 8, 16, 32]) {
    const columns = Math.floor(width / cell), rows = Math.floor(height / cell);
    if (columns < 2 || rows < 2) continue;
    const first = colorAt(Math.floor(cell / 2), Math.floor(cell / 2));
    const second = colorAt(cell + Math.floor(cell / 2), Math.floor(cell / 2));
    const neutral = (color) => color[3] === 255 && Math.max(color[0], color[1], color[2]) - Math.min(color[0], color[1], color[2]) <= 4;
    if (!neutral(first) || !neutral(second) || sameColor(first, second)) continue;
    let matches = 0, samples = 0;
    for (let y = 0; y < rows; y += 1) for (let x = 0; x < columns; x += 1) {
      const color = colorAt(x * cell + Math.floor(cell / 2), y * cell + Math.floor(cell / 2));
      const expected = (x + y) % 2 ? second : first;
      samples += 1;
      if (neutral(color) && sameColor(color, expected)) matches += 1;
    }
    if (matches / samples >= .9) return true;
  }
  return false;
}

function inspect(file, root) {
  const report = { asset: path.relative(root, file).split(path.sep).join("/"), result: "FAIL" };
  try {
    const { header, compressed } = parsePng(fs.readFileSync(file));
    report.format = pngFormat(header.colorType);
    report.size = `${header.width}x${header.height}`;
    const supported = header.colorType === 6 && header.bitDepth === 8 && header.interlace === 0;
    if (!supported) {
      report.alpha = "FAIL";
      report.transparent_pixels = "n/a";
      report.opaque_only = "n/a";
      report.checkerboard = "n/a";
      report.reason = "requires non-interlaced 8-bit RGBA PNG";
      return report;
    }
    const pixels = unfilterRgba(zlib.inflateSync(compressed), header.width, header.height);
    const total = header.width * header.height;
    let transparent = 0;
    for (let offset = 3; offset < pixels.length; offset += 4) if (pixels[offset] < 255) transparent += 1;
    report.alpha = "PASS";
    report.transparent_pixels = `${transparent} (${((transparent / total) * 100).toFixed(2)}%)`;
    report.opaque_only = transparent === 0;
    report.checkerboard = looksLikeCheckerboard(pixels, header.width, header.height) ? "FAIL" : "PASS";
    report.result = transparent > 0 && report.checkerboard === "PASS" ? "PASS" : "FAIL";
    return report;
  } catch (error) {
    report.format = "INVALID";
    report.alpha = "FAIL";
    report.transparent_pixels = "n/a";
    report.opaque_only = "n/a";
    report.checkerboard = "n/a";
    report.size = "n/a";
    report.reason = error.message;
    return report;
  }
}

function print(report) {
  for (const [key, value] of Object.entries(report)) process.stdout.write(`${key}:\n${value}\n\n`);
}

function main() {
  const root = path.resolve(process.argv[2] || "assets/official-v1");
  const reports = filesIn(root).map((file) => inspect(file, root));
  if (!reports.length) process.stdout.write(`No PNG files found in ${root}\n`);
  reports.forEach(print);
  if (reports.some((report) => report.result === "FAIL")) process.exitCode = 1;
}

main();
