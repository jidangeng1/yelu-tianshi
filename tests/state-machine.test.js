"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const config = require("../js/config.js");
const { STATES, ORDER, YeluStateMachine } = require("../js/state-machine.js");

function runCycle(randomValues) {
  let index = 0;
  const machine = new YeluStateMachine(config, () => randomValues[index++]);
  const seen = [machine.state];
  machine.onStateChange((state) => seen.push(state));
  assert.equal(machine.feed(0), true);
  let now = 0;
  while (machine.state !== STATES.IDLE || machine.locked) {
    now += 25;
    machine.update(now);
    assert.ok(now < 6000, "cycle should finish within six seconds");
  }
  return { machine, seen, now };
}

test("runs the complete M0 sequence and unlocks afterwards", () => {
  const { machine, seen, now } = runCycle([0.45, 0.2]);
  assert.deepEqual(seen, ORDER);
  assert.equal(machine.locked, false);
  assert.ok(now >= 3000 && now <= 5000);
  assert.equal(machine.feed(now), true);
});

test("locks immediately and ignores repeated input without queuing", () => {
  const machine = new YeluStateMachine(config, () => 0.1);
  assert.equal(machine.feed(10), true);
  assert.equal(machine.feed(11), false);
  assert.equal(machine.feed(200), false);
  assert.equal(machine.cycle, 1);
});

test("maps random values to all three drop points", () => {
  assert.equal(new YeluStateMachine(config, () => 0).feed(0), true);
  const targets = [0.01, 0.4, 0.99].map((value) => {
    const machine = new YeluStateMachine(config, () => value);
    machine.feed(0);
    return machine.snapshot(0).target.id;
  });
  assert.deepEqual(targets, ["left", "center", "right"]);
});

test("supports direct and flutter swallow variants", () => {
  const directValues = [0.3, 0.2];
  const flutterValues = [0.3, 0.8];
  let i = 0;
  const direct = new YeluStateMachine(config, () => directValues[i++]);
  i = 0;
  const flutter = new YeluStateMachine(config, () => flutterValues[i++]);
  direct.feed(0); flutter.feed(0);
  assert.equal(direct.swallowVariant, "direct");
  assert.equal(flutter.swallowVariant, "flutter");
  assert.ok(direct.durationFor(STATES.PRE_SWALLOW) < flutter.durationFor(STATES.PRE_SWALLOW));
});
