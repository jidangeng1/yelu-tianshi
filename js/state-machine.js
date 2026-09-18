(function (root) {
  "use strict";

  const STATES = Object.freeze({
    IDLE: "IDLE",
    THROW: "THROW",
    FISH_SWIM: "FISH_SWIM",
    TRACK: "TRACK",
    STRIKE: "STRIKE",
    PRE_SWALLOW: "PRE_SWALLOW",
    SWALLOW: "SWALLOW",
    ROUNDNESS: "ROUNDNESS",
    POOP_PREP: "POOP_PREP",
    POOP: "POOP",
    RIPPLE: "RIPPLE",
    RECOVER: "RECOVER"
  });

  const ORDER = [
    STATES.IDLE, STATES.THROW, STATES.FISH_SWIM, STATES.TRACK,
    STATES.STRIKE, STATES.PRE_SWALLOW, STATES.SWALLOW,
    STATES.ROUNDNESS, STATES.POOP_PREP, STATES.POOP,
    STATES.RIPPLE, STATES.RECOVER, STATES.IDLE
  ];

  const NEXT = Object.freeze({
    THROW: STATES.FISH_SWIM,
    FISH_SWIM: STATES.TRACK,
    TRACK: STATES.STRIKE,
    STRIKE: STATES.PRE_SWALLOW,
    PRE_SWALLOW: STATES.SWALLOW,
    SWALLOW: STATES.ROUNDNESS,
    ROUNDNESS: STATES.POOP_PREP,
    POOP_PREP: STATES.POOP,
    POOP: STATES.RIPPLE,
    RIPPLE: STATES.RECOVER,
    RECOVER: STATES.IDLE
  });

  function clamp01(value) { return Math.max(0, Math.min(1, value)); }

  class YeluStateMachine {
    constructor(config, random) {
      this.config = config;
      this.random = random || Math.random;
      this.state = STATES.IDLE;
      this.stateStartedAt = 0;
      this.locked = false;
      this.cycle = 0;
      this.targetIndex = 1;
      this.swallowVariant = "direct";
      this.listeners = [];
    }

    onStateChange(listener) { this.listeners.push(listener); }

    feed(now) {
      if (this.locked || this.state !== STATES.IDLE) return false;
      this.locked = true;
      this.cycle += 1;
      this.targetIndex = Math.min(2, Math.floor(this.random() * 3));
      this.swallowVariant = this.random() < 0.5 ? "direct" : "flutter";
      this.enter(STATES.THROW, now);
      return true;
    }

    durationFor(state) {
      if (state === STATES.PRE_SWALLOW) {
        return this.swallowVariant === "flutter"
          ? this.config.durations.PRE_SWALLOW_FLUTTER
          : this.config.durations.PRE_SWALLOW_DIRECT;
      }
      return this.config.durations[state] || Infinity;
    }

    update(now) {
      if (this.state === STATES.IDLE) return;
      let duration = this.durationFor(this.state);
      while (now - this.stateStartedAt >= duration) {
        const overflow = now - this.stateStartedAt - duration;
        const next = NEXT[this.state];
        this.enter(next, now - overflow);
        if (next === STATES.IDLE) {
          this.locked = false;
          return;
        }
        duration = this.durationFor(this.state);
      }
    }

    enter(state, at) {
      const previous = this.state;
      this.state = state;
      this.stateStartedAt = at;
      this.listeners.forEach((listener) => listener(state, previous));
    }

    progress(now) {
      if (this.state === STATES.IDLE) return 0;
      return clamp01((now - this.stateStartedAt) / this.durationFor(this.state));
    }

    snapshot(now) {
      return {
        state: this.state,
        progress: this.progress(now),
        locked: this.locked,
        cycle: this.cycle,
        targetIndex: this.targetIndex,
        target: this.config.dropPoints[this.targetIndex],
        swallowVariant: this.swallowVariant
      };
    }
  }

  const api = { STATES, ORDER, YeluStateMachine };
  root.YeluState = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
