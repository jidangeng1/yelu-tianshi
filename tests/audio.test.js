"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { SoundFeedback } = require("../js/audio.js");

test("records the two frozen sound cues even without Web Audio", () => {
  const sound = new SoundFeedback(() => null);
  assert.doesNotThrow(() => sound.playSwallow());
  assert.doesNotThrow(() => sound.playPlop());
  assert.deepEqual(sound.events, ["swallow", "plop"]);
});

test("gracefully handles an unavailable audio context", () => {
  const sound = new SoundFeedback(() => { throw new Error("unsupported"); });
  assert.doesNotThrow(() => sound.unlock());
  assert.equal(sound.context, null);
});

test("synthesizes both cues through the injected Web Audio context", () => {
  const calls = [];
  const param = (name) => ({
    setValueAtTime: (value, time) => calls.push([name, "set", value, time]),
    exponentialRampToValueAtTime: (value, time) => calls.push([name, "ramp", value, time])
  });
  const context = {
    state: "running",
    currentTime: 2,
    destination: {},
    createOscillator() {
      return {
        frequency: param("frequency"),
        connect(node) { calls.push(["oscillator", "connect"]); return node; },
        start(time) { calls.push(["oscillator", "start", time]); },
        stop(time) { calls.push(["oscillator", "stop", time]); }
      };
    },
    createGain() {
      return {
        gain: param("gain"),
        connect() { calls.push(["gain", "connect"]); return this; }
      };
    }
  };
  const sound = new SoundFeedback(() => context);
  sound.playSwallow();
  sound.playPlop();
  assert.deepEqual(sound.events, ["swallow", "plop"]);
  assert.equal(calls.filter((call) => call[0] === "oscillator" && call[1] === "start").length, 2);
  assert.equal(calls.filter((call) => call[0] === "oscillator" && call[1] === "stop").length, 2);
});
