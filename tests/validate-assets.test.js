"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const zlib = require("node:zlib");

function chunk(type, data) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 0);
  header.write(type, 4, 4, "ascii");
  const crc = Buffer.alloc(4);
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

test("reports a transparent RGBA PNG as accepted", () => {
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

test("fails RGB and fully opaque PNG assets", () => {
  const result = run({
    "rgb.png": png(1, 1, 2, [1, 2, 3]),
    "opaque.png": png(1, 1, 6, [1, 2, 3, 255])
  });

  assert.equal(result.status, 1);
  assert.match(result.output, /asset:\nrgb\.png[\s\S]*?format:\nRGB[\s\S]*?alpha:\nFAIL/);
  assert.match(result.output, /asset:\nopaque\.png[\s\S]*?opaque_only:\ntrue[\s\S]*?result:\nFAIL/);
});

test("fails an opaque gray checkerboard used as fake transparency", () => {
  const result = run({
    "checkerboard.png": png(2, 2, 6, [
      190, 190, 190, 255, 230, 230, 230, 255,
      230, 230, 230, 255, 190, 190, 190, 255
    ])
  });

  assert.equal(result.status, 1);
  assert.match(result.output, /checkerboard:\nFAIL/);
  assert.match(result.output, /result:\nFAIL/);
});
