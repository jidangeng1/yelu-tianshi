(function () {
  "use strict";

  const canvas = document.getElementById("scene");
  const button = document.getElementById("feed-button");
  const hint = document.getElementById("feed-hint");
  const ctx = canvas.getContext("2d");
  const config = window.YeluConfig;
  const random = typeof window.__YELU_RANDOM__ === "function" ? window.__YELU_RANDOM__ : Math.random;
  const machine = new window.YeluState.YeluStateMachine(config, random);
  const assetPack = window.YeluRenderers.createM0CanvasPlaceholderAssetPack(config);
  const renderer = new window.YeluRenderers.SceneRenderer(config, assetPack);
  const sound = new window.YeluAudio.SoundFeedback();
  let storage = null;
  try { storage = window.localStorage; } catch (_error) { storage = null; }
  const hintPreference = new window.YeluPreferences.FeedHintPreference(
    storage,
    config.preferences.feedHintDismissedKey
  );

  if (hintPreference.isDismissed()) hint.classList.add("hidden");

  function resizeBackingStore() {
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = config.width * scale;
    canvas.height = config.height * scale;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function feed() {
    sound.unlock();
    if (!machine.feed(performance.now())) return;
    button.disabled = true;
    hint.classList.add("hidden");
    hintPreference.dismiss();
  }

  machine.onStateChange((state) => {
    if (state === window.YeluState.STATES.IDLE) button.disabled = false;
    if (state === window.YeluState.STATES.SWALLOW) sound.playSwallow();
    if (state === window.YeluState.STATES.RIPPLE) sound.playPlop();
  });

  button.addEventListener("click", feed);
  window.addEventListener("resize", resizeBackingStore);
  resizeBackingStore();

  function frame(now) {
    machine.update(now);
    renderer.draw(ctx, machine.snapshot(now));
    window.requestAnimationFrame(frame);
  }

  window.requestAnimationFrame(frame);
  window.__YELU_M0__ = { machine, renderer, assetPack, sound, hintPreference, feed };
})();
