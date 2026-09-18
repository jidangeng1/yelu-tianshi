(function (root) {
  "use strict";

  class SoundFeedback {
    constructor(contextFactory) {
      this.contextFactory = contextFactory || (() => {
        const AudioContext = root.AudioContext || root.webkitAudioContext;
        return AudioContext ? new AudioContext() : null;
      });
      this.context = null;
      this.events = [];
    }

    unlock() {
      try {
        if (!this.context) this.context = this.contextFactory();
        if (this.context && this.context.state === "suspended") {
          const resumed = this.context.resume();
          if (resumed && typeof resumed.catch === "function") resumed.catch(() => {});
        }
      } catch (_error) {
        this.context = null;
      }
    }

    playSwallow() {
      this.events.push("swallow");
      this.unlock();
      const ctx = this.context;
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(185, now);
        oscillator.frequency.exponentialRampToValueAtTime(92, now + .16);
        gain.gain.setValueAtTime(.0001, now);
        gain.gain.exponentialRampToValueAtTime(.13, now + .018);
        gain.gain.exponentialRampToValueAtTime(.0001, now + .2);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(now);
        oscillator.stop(now + .21);
      } catch (_error) {
        // Audio feedback is enhancement-only; animation must never fail with it.
      }
    }

    playPlop() {
      this.events.push("plop");
      this.unlock();
      const ctx = this.context;
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(240, now);
        oscillator.frequency.exponentialRampToValueAtTime(72, now + .09);
        gain.gain.setValueAtTime(.0001, now);
        gain.gain.exponentialRampToValueAtTime(.18, now + .008);
        gain.gain.exponentialRampToValueAtTime(.0001, now + .13);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(now);
        oscillator.stop(now + .14);
      } catch (_error) {
        // Keep the visual sequence deterministic if Web Audio is unavailable.
      }
    }
  }

  const api = { SoundFeedback };
  root.YeluAudio = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
