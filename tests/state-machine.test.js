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

function totalDuration(machine) {
  return [
    STATES.THROW, STATES.FISH_SWIM, STATES.TRACK, STATES.STRIKE,
    STATES.PRE_SWALLOW, STATES.SWALLOW, STATES.ROUNDNESS,
    STATES.POOP_PREP, STATES.POOP, STATES.RIPPLE, STATES.RECOVER
  ].reduce((total, state) => total + machine.durationFor(state), 0);
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

test("uses deterministic boundary values for targets and variants", () => {
  const cases = [
    { random: [0, 0], target: "left", variant: "direct" },
    { random: [1 / 3, 0.499999], target: "center", variant: "direct" },
    { random: [2 / 3, 0.5], target: "right", variant: "flutter" },
    { random: [0.999999, 0.999999], target: "right", variant: "flutter" }
  ];
  for (const expected of cases) {
    let index = 0;
    const machine = new YeluStateMachine(config, () => expected.random[index++]);
    machine.feed(0);
    assert.equal(machine.snapshot(0).target.id, expected.target);
    assert.equal(machine.swallowVariant, expected.variant);
  }
});

test("large time steps traverse each state once and finish deterministically", () => {
  const machine = new YeluStateMachine(config, () => 0.8);
  const seen = [];
  machine.onStateChange((state) => seen.push(state));
  machine.feed(100);
  const duration = totalDuration(machine);
  machine.update(100 + duration + 500);
  assert.deepEqual(seen, ORDER.slice(1));
  assert.equal(machine.state, STATES.IDLE);
  assert.equal(machine.locked, false);
  assert.equal(machine.cycle, 1);
});

test("reports exact progress at deterministic timestamps", () => {
  const machine = new YeluStateMachine(config, () => 0.1);
  machine.feed(1000);
  assert.equal(machine.progress(1000), 0);
  assert.equal(machine.progress(1000 + config.durations.THROW / 2), 0.5);
  assert.equal(machine.progress(1000 + config.durations.THROW), 1);
});
