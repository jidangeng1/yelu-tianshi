"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

global.YeluConfig = require("../js/config.js");
global.YeluState = require("../js/state-machine.js");
require("../js/renderers.js");

test("exposes the current bird artwork as an explicit replaceable placeholder pack", () => {
  const pack = global.YeluRenderers.createM0CanvasPlaceholderAssetPack(global.YeluConfig);
  assert.equal(pack.id, "m0-canvas-placeholder");
  assert.equal(pack.placeholder, true);
  assert.equal(pack.interfaceVersion, global.YeluConfig.assets.interfaceVersion);
  for (const key of ["background", "basket", "fish", "effects", "bird"]) {
    assert.ok(pack[key], `missing ${key} asset renderer`);
  }
  const scene = new global.YeluRenderers.SceneRenderer(global.YeluConfig, pack);
  assert.equal(scene.assets, pack);
});

test("accepts a replacement asset pack without state-machine changes", () => {
  const calls = [];
  const pack = {
    background: { draw: () => calls.push("background") },
    effects: {
      drawSplash: () => calls.push("splash"),
      drawPoop: () => calls.push("poop"),
      drawRipple: () => calls.push("ripple")
    },
    bird: { draw: () => { calls.push("bird"); return { x: 0, y: 0 }; } },
    fish: { draw: () => calls.push("fish") },
    basket: { draw: () => calls.push("basket") }
  };
  const scene = new global.YeluRenderers.SceneRenderer(global.YeluConfig, pack);
  scene.draw({}, { state: "IDLE" });
  assert.deepEqual(calls, ["background", "splash", "bird", "fish", "poop", "ripple", "basket"]);
});

function loadedImageFactory(created) {
  return () => {
    const image = {
      set src(value) {
        this.source = value;
        this.onload();
      }
    };
    created.push(image);
    return image;
  };
}

test("loads and plays nine official eat frames once with independent timings", () => {
  const created = [];
  const fallback = { draw: () => ({ x: 0, y: 0 }) };
  const renderer = new global.YeluRenderers.HeronEatSequenceRenderer(
    global.YeluConfig,
    fallback,
    { imageFactory: loadedImageFactory(created) }
  );
  const flutter = "flutter";
  const cases = [
    [{ state: "IDLE", progress: 0, swallowVariant: flutter }, 0],
    [{ state: "THROW", progress: 0.5, swallowVariant: flutter }, 0],
    [{ state: "FISH_SWIM", progress: 0.5, swallowVariant: flutter }, 0],
    [{ state: "TRACK", progress: 0.5, swallowVariant: flutter }, 0],
    [{ state: "STRIKE", progress: 0, swallowVariant: flutter }, 0],
    [{ state: "STRIKE", progress: 199 / 800, swallowVariant: flutter }, 0],
    [{ state: "STRIKE", progress: 200 / 800, swallowVariant: flutter }, 1],
    [{ state: "STRIKE", progress: 450 / 800, swallowVariant: flutter }, 2],
    [{ state: "STRIKE", progress: 600 / 800, swallowVariant: flutter }, 3],
    [{ state: "STRIKE", progress: 680 / 800, swallowVariant: flutter }, 4],
    [{ state: "PRE_SWALLOW", progress: 0, swallowVariant: flutter }, 5],
    [{ state: "SWALLOW", progress: 0, swallowVariant: flutter }, 6],
    [{ state: "SWALLOW", progress: 250 / 600, swallowVariant: flutter }, 7],
    [{ state: "ROUNDNESS", progress: 0, swallowVariant: flutter }, 8],
    [{ state: "ROUNDNESS", progress: 1, swallowVariant: flutter }, 8]
  ];

  assert.equal(renderer.isReady(), true);
  assert.deepEqual(global.YeluConfig.assets.heronEat.frameDurations,
    [200, 250, 150, 80, 120, 300, 250, 350, 250]);
  assert.deepEqual(created.map((image) => image.source), global.YeluConfig.assets.heronEat.frames);
  for (const [model, expected] of cases) assert.equal(renderer.frameIndex(model), expected);
});

test("draws all nine official frames into one foot-anchored destination rectangle", () => {
  const created = [];
  const renderer = new global.YeluRenderers.HeronEatSequenceRenderer(
    global.YeluConfig,
    { draw: () => ({ x: 0, y: 0 }) },
    { imageFactory: loadedImageFactory(created) }
  );
  const calls = [];
  const ctx = { drawImage: (...args) => calls.push(args) };
  const models = [
    { state: "STRIKE", progress: 0 / 800, swallowVariant: "flutter" },
    { state: "STRIKE", progress: 200 / 800, swallowVariant: "flutter" },
    { state: "STRIKE", progress: 450 / 800, swallowVariant: "flutter" },
    { state: "STRIKE", progress: 600 / 800, swallowVariant: "flutter" },
    { state: "STRIKE", progress: 680 / 800, swallowVariant: "flutter" },
    { state: "PRE_SWALLOW", progress: 0, swallowVariant: "flutter" },
    { state: "SWALLOW", progress: 0, swallowVariant: "flutter" },
    { state: "SWALLOW", progress: 250 / 600, swallowVariant: "flutter" },
    { state: "ROUNDNESS", progress: 0, swallowVariant: "flutter" }
  ];
  models.forEach((model) => renderer.draw(ctx, model));

  assert.deepEqual(calls.map((args) => args.slice(1)), Array(9).fill(calls[0].slice(1)));
  assert.deepEqual(calls.map((args) => args[0]), created);
});

test("falls back to the Canvas bird when any official frame fails", () => {
  let fallbackCalls = 0;
  let count = 0;
  const renderer = new global.YeluRenderers.HeronEatSequenceRenderer(
    global.YeluConfig,
    { draw: () => { fallbackCalls += 1; return { x: 12, y: 34 }; } },
    {
      imageFactory: () => ({
        set src(_value) {
          count += 1;
          if (count === 3) this.onerror();
          else this.onload();
        }
      })
    }
  );
  const result = renderer.draw({}, { state: "STRIKE", progress: 0, swallowVariant: "direct" });
  assert.equal(renderer.status, "failed");
  assert.equal(fallbackCalls, 1);
  assert.deepEqual(result, { x: 12, y: 34 });
});

