(function (root) {
  "use strict";

  const config = {
    width: 390,
    height: 844,
    waterline: 500,
    preferences: {
      feedHintDismissedKey: "yelu:m0:feed-hint-dismissed:v1"
    },
    assets: {
      activePack: "official-v1-heron-eat",
      interfaceVersion: 1,
      heronEat: {
        frameWidth: 512,
        frameHeight: 512,
        displaySize: 280,
        x: 72,
        footBaselineY: 430,
        sourceFootBaseline: 480,
        frameDurations: [200, 250, 150, 80, 120, 300, 250, 350, 250],
        frames: [
          "assets/official-v1/heron/eat/heron-eat-000.png",
          "assets/official-v1/heron/eat/heron-eat-001.png",
          "assets/official-v1/heron/eat/heron-eat-002.png",
          "assets/official-v1/heron/eat/heron-eat-003.png",
          "assets/official-v1/heron/eat/heron-eat-004.png",
          "assets/official-v1/heron/eat/heron-eat-005.png",
          "assets/official-v1/heron/eat/heron-eat-006.png",
          "assets/official-v1/heron/eat/heron-eat-007.png",
          "assets/official-v1/heron/eat/heron-eat-008.png"
        ]
      }
    },
    basket: { x: 195, y: 778, width: 144, height: 94 },
    bird: { x: 246, y: 402 },
    dropPoints: [
      { id: "left", x: 92, y: 565, swimX: 111 },
      { id: "center", x: 184, y: 582, swimX: 204 },
      { id: "right", x: 286, y: 558, swimX: 270 }
    ],
    durations: {
      THROW: 420,
      FISH_SWIM: 340,
      TRACK: 220,
      STRIKE: 800,
      PRE_SWALLOW_DIRECT: 300,
      PRE_SWALLOW_FLUTTER: 300,
      SWALLOW: 600,
      ROUNDNESS: 250,
      POOP_PREP: 440,
      POOP: 580,
      RIPPLE: 620,
      RECOVER: 650
    },
    palette: {
      paper: "#f2f0e5",
      pond: "#cbded6",
      pondDeep: "#a8c9c1",
      ink: "#33434a",
      crown: "#253e51",
      back: "#415b69",
      belly: "#dce1d8",
      chest: "#eef0e8",
      eye: "#a83530",
      beak: "#273b42",
      leg: "#caa84f",
      branch: "#6e5d48",
      basket: "#b58a4c",
      basketDark: "#765936",
      fish: "#879f8e",
      white: "#fffdf2"
    }
  };

  root.YeluConfig = Object.freeze(config);
  if (typeof module !== "undefined" && module.exports) module.exports = config;
})(typeof globalThis !== "undefined" ? globalThis : window);

