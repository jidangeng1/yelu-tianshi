"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const zlib = require("node:zlib");

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 0);
  header.write(type, 4, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 0);
  return Buffer.concat([header, data, crc]);
}

function png(width, height, colorType, pixels) {
  const channels = colorType === 6 ? 4 : 3;
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    rows.push(Buffer.from([0]));
    rows.push(Buffer.from(pixels.slice(y * width * channels, (y + 1) * width * channels)));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function run(files) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "yelu-assets-"));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(directory, name), content);
  }
  const result = spawnSync(process.execPath, ["scripts/validate-assets.js", directory], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8"
  });
  return { status: result.status, output: result.stdout };
}

test("reports a correct-CRC transparent RGBA PNG as accepted", () => {
  const result = run({
    "heron-idle-000.png": png(2, 1, 6, [1, 2, 3, 0, 4, 5, 6, 255])
  });

  assert.equal(result.status, 0);
  assert.match(result.output, /format:\nRGBA/);
  assert.match(result.output, /alpha:\nPASS/);
  assert.match(result.output, /transparent_pixels:\n1/);
  assert.match(result.output, /opaque_only:\nfalse/);
  assert.match(result.output, /size:\n2x1/);
});

test("fails a PNG with an incorrect chunk CRC", () => {
  const image = Buffer.from(png(1, 1, 6, [1, 2, 3, 0]));
  image[image.length - 1] ^= 1;
  const result = run({ "bad-crc.png": image });

  assert.equal(result.status, 1);
  assert.match(result.output, /reason:\nPNG chunk CRC mismatch/);
  assert.match(result.output, /result:\nFAIL/);
});

test("fails a truncated PNG", () => {
  const image = png(1, 1, 6, [1, 2, 3, 0]).subarray(0, -1);
  const result = run({ "truncated.png": image });

  assert.equal(result.status, 1);
  assert.match(result.output, /format:\nINVALID/);
  assert.match(result.output, /result:\nFAIL/);
});

test("fails an RGB PNG asset", () => {
  const result = run({
    "rgb.png": png(1, 1, 2, [1, 2, 3])
  });

  assert.equal(result.status, 1);
  assert.match(result.output, /asset:\nrgb\.png[\s\S]*?format:\nRGB[\s\S]*?alpha:\nFAIL/);
});

test("fails a truly opaque RGBA PNG", () => {
  const result = run({
    "opaque.png": png(1, 1, 6, [1, 2, 3, 255])
  });

  assert.equal(result.status, 1);
  assert.match(result.output, /asset:\nopaque\.png[\s\S]*?opaque_only:\ntrue/);
  assert.match(result.output, /result:\nFAIL/);
});

test("reports a checkerboard risk as warning without failing", () => {
  const pixels = [];
  for (let y = 0; y < 10; y += 1) for (let x = 0; x < 10; x += 1) {
    const gray = (x + y) % 2 ? 230 : 190;
    pixels.push(gray, gray, gray, x === 9 && y === 9 ? 0 : 255);
  }
  const result = run({
    "checkerboard.png": png(10, 10, 6, pixels)
  });

  assert.equal(result.status, 0);
  assert.match(result.output, /checkerboard:\nWARNING/);
  assert.match(result.output, /result:\nWARNING/);
});

test("does not misclassify a legal grayscale texture as checkerboard", () => {
  const pixels = [];
  for (let y = 0; y < 3; y += 1) for (let x = 0; x < 3; x += 1) {
    const gray = 80 + x * 17 + y * 11;
    pixels.push(gray, gray, gray, x === 2 && y === 2 ? 0 : 255);
  }
  const result = run({ "gray-texture.png": png(3, 3, 6, pixels) });

  assert.equal(result.status, 0);
  assert.match(result.output, /checkerboard:\nPASS/);
  assert.match(result.output, /result:\nPASS/);
});
