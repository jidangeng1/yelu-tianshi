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
