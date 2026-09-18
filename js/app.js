(function () {
  "use strict";

  const canvas = document.getElementById("scene");
  const button = document.getElementById("feed-button");
  const hint = document.getElementById("feed-hint");
  const ctx = canvas.getContext("2d");
  const config = window.YeluConfig;
  const machine = new window.YeluState.YeluStateMachine(config);
  const renderer = new window.YeluRenderers.SceneRenderer();

  function resizeBackingStore() {
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = config.width * scale;
    canvas.height = config.height * scale;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function feed() {
    if (!machine.feed(performance.now())) return;
    button.disabled = true;
    hint.classList.add("hidden");
  }

  machine.onStateChange((state) => {
    if (state === window.YeluState.STATES.IDLE) button.disabled = false;
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
  window.__YELU_M0__ = { machine, renderer, feed };
})();
