(function (root) {
  "use strict";

  const { STATES } = root.YeluState;
  const cfg = root.YeluConfig;
  const P = cfg.palette;

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const pulse = (t) => Math.sin(clamp(t, 0, 1) * Math.PI);

  function ellipse(ctx, x, y, rx, ry, fill, stroke, width) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width || 1; ctx.stroke(); }
  }

  function line(ctx, points, color, width, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
    ctx.stroke();
    ctx.restore();
  }

  class BackgroundRenderer {
    draw(ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, cfg.height);
      gradient.addColorStop(0, "#f3f1e6");
      gradient.addColorStop(.52, "#e7eee6");
      gradient.addColorStop(1, "#bdd4ce");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, cfg.width, cfg.height);

      ctx.save();
      ctx.globalAlpha = .12;
      for (let i = 0; i < 22; i += 1) {
        const x = (i * 71) % 420 - 15;
        const y = 45 + (i * 89) % 640;
        ellipse(ctx, x, y, 34 + (i % 4) * 8, 18 + (i % 3) * 6,
          i % 2 ? "#7fa89c" : "#c9b98e");
      }
      ctx.restore();

      ctx.fillStyle = "rgba(140,184,174,.16)";
      ctx.fillRect(0, cfg.waterline, cfg.width, cfg.height - cfg.waterline);
      for (let y = 525; y < 720; y += 42) {
        line(ctx, [[25 + y % 37, y], [110, y - 3], [185, y + 2]], "#83aca4", 2, .16);
        line(ctx, [[230, y + 11], [300, y + 7], [372, y + 10]], "#719f98", 1.6, .12);
      }

      // Few leaves and a quiet branch keep the scene observational, not decorative.
      line(ctx, [[-18, 429], [92, 417], [196, 430], [310, 422], [415, 448]], P.branch, 16, .9);
      line(ctx, [[-8, 425], [96, 414], [197, 426], [315, 419], [405, 443]], "#8c7658", 5, .5);
      line(ctx, [[52, 420], [28, 374]], P.branch, 6, .7);
      line(ctx, [[337, 429], [367, 392]], P.branch, 5, .68);
      this.leaf(ctx, 24, 365, -1); this.leaf(ctx, 40, 382, 1);
      this.leaf(ctx, 363, 383, -1); this.leaf(ctx, 377, 400, 1);
    }

    leaf(ctx, x, y, flip) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(flip * .45);
      ellipse(ctx, 0, 0, 15, 6, "rgba(91,124,91,.52)", "rgba(65,98,72,.3)");
      line(ctx, [[-10, 0], [10, 0]], "#607d62", 1, .5);
      ctx.restore();
    }
  }

  class BasketRenderer {
    draw(ctx, model) {
      const pressed = model.state === STATES.THROW && model.progress < .25;
      ctx.save();
      ctx.translate(cfg.basket.x, cfg.basket.y + (pressed ? 4 : 0));
      ctx.fillStyle = "rgba(47,57,45,.12)";
      ellipse(ctx, 0, 39, 82, 15, ctx.fillStyle);
      ctx.beginPath();
      ctx.moveTo(-68, -18); ctx.quadraticCurveTo(-60, 45, 0, 51);
      ctx.quadraticCurveTo(60, 45, 68, -18); ctx.closePath();
      ctx.fillStyle = P.basket; ctx.fill();
      ctx.strokeStyle = P.basketDark; ctx.lineWidth = 2; ctx.stroke();
      ellipse(ctx, 0, -18, 68, 19, "#c8a465", P.basketDark, 3);
      ellipse(ctx, 0, -18, 57, 12, "#554735", P.basketDark, 1.5);
      ctx.save();
      ctx.beginPath(); ctx.rect(-70, -12, 140, 61); ctx.clip();
      for (let x = -58; x <= 58; x += 16) line(ctx, [[x, -12], [x + 8, 45]], "#765936", 2, .65);
      for (let y = 4; y <= 42; y += 12) line(ctx, [[-64, y], [64, y]], "#e1c17e", 3, .55);
      ctx.restore();
      ctx.restore();
    }
  }

  class FishRenderer {
    getPose(model) {
      const target = model.target;
      if (model.state === STATES.THROW) {
        const t = easeOut(model.progress);
        return {
          visible: true,
          x: lerp(cfg.basket.x, target.x, t),
          y: lerp(cfg.basket.y - 28, target.y, t) - Math.sin(t * Math.PI) * 145,
          rotation: lerp(-1.25, .25, t), tail: 0
        };
      }
      if (model.state === STATES.FISH_SWIM || model.state === STATES.TRACK) {
        const swimProgress = model.state === STATES.FISH_SWIM ? model.progress : 1;
        return {
          visible: true,
          x: lerp(target.x, target.swimX, easeInOut(swimProgress)),
          y: target.y + 5 + Math.sin(swimProgress * Math.PI * 3) * 2,
          rotation: target.swimX < target.x ? Math.PI : 0,
          tail: Math.sin(swimProgress * Math.PI * 6)
        };
      }
      if (model.state === STATES.STRIKE) {
        return { visible: true, x: target.swimX, y: target.y + 5, rotation: 0, tail: 0 };
      }
      if (model.state === STATES.PRE_SWALLOW) {
        return {
          visible: true, attached: true, x: 0, y: 0,
          rotation: .15, tail: model.swallowVariant === "flutter" ? Math.sin(model.progress * Math.PI * 8) : 0
        };
      }
      return { visible: false };
    }

    draw(ctx, model, beakTip) {
      const pose = this.getPose(model);
      if (!pose.visible) return;
      const x = pose.attached ? beakTip.x - 12 : pose.x;
      const y = pose.attached ? beakTip.y + 3 : pose.y;
      ctx.save(); ctx.translate(x, y); ctx.rotate(pose.rotation || 0);
      ellipse(ctx, 0, 0, 12, 5.5, P.fish, "#526d67", 1);
      ctx.beginPath();
      ctx.moveTo(-10, 0); ctx.lineTo(-20, -7 - pose.tail * 3); ctx.lineTo(-18, 7 + pose.tail * 3); ctx.closePath();
      ctx.fillStyle = "#78968b"; ctx.fill();
      ellipse(ctx, 6, -1.5, 1.2, 1.2, "#263e42");
      ctx.restore();
    }
  }

  class EffectsRenderer {
    drawSplash(ctx, model) {
      if (model.state !== STATES.FISH_SWIM || model.progress > .48) return;
      const t = model.progress / .48;
      const x = model.target.x, y = model.target.y + 8;
      ctx.save(); ctx.strokeStyle = "rgba(243,249,242," + (1 - t) * .7 + ")"; ctx.lineWidth = 2; ctx.lineCap = "round";
      for (const d of [-1, 0, 1]) {
        ctx.beginPath(); ctx.moveTo(x + d * 5, y);
        ctx.quadraticCurveTo(x + d * 10, y - 14 * pulse(t), x + d * 14, y - 5 + t * 8); ctx.stroke();
      }
      ctx.restore();
    }

    drawPoop(ctx, model) {
      if (model.state !== STATES.POOP) return;
      const t = easeOut(model.progress);
      const start = { x: 287, y: 405 };
      const endY = lerp(start.y + 3, 602, t);
      ctx.save();
      ctx.strokeStyle = "rgba(255,253,238,.94)";
      ctx.shadowColor = "rgba(70,91,83,.18)"; ctx.shadowBlur = 2;
      ctx.lineWidth = 3.1; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(start.x, start.y);
      ctx.bezierCurveTo(start.x - 2, lerp(start.y, endY, .35), start.x + 3, lerp(start.y, endY, .68), start.x + 1, endY);
      ctx.stroke(); ctx.restore();
    }

    drawRipple(ctx, model) {
      if (model.state !== STATES.RIPPLE) return;
      const t = model.progress;
      const x = 288, y = 605;
      ctx.save();
      if (t < .18) {
        const s = t / .18;
        for (const d of [-1, 1]) line(ctx, [[x, y], [x + d * 10 * s, y - 13 * pulse(s)]], "#f6f7e9", 2, 1 - s * .3);
      }
      for (let i = 0; i < 3; i += 1) {
        const rt = clamp((t - i * .12) / .72, 0, 1);
        if (!rt) continue;
        ctx.beginPath(); ctx.ellipse(x, y, 5 + rt * (35 + i * 9), 2 + rt * (10 + i * 2), 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(90,137,130," + (1 - rt) * .45 + ")"; ctx.lineWidth = 2 - rt; ctx.stroke();
      }
      ctx.restore();
    }
  }

  class BirdRenderer {
    pose(model) {
      const state = model.state, t = model.progress;
      const idleHead = { x: 214, y: 300 };
      const targetHead = { x: model.target.swimX + 16, y: model.target.y - 15 };
      let head = idleHead, bodyY = 0, round = 0, fluff = 0, wing = 0, neckWidth = 17, look = 0;

      if (state === STATES.FISH_SWIM || state === STATES.TRACK) look = state === STATES.TRACK ? easeInOut(t) : .35 * t;
      if (state === STATES.STRIKE) {
        const e = easeOut(t); head = { x: lerp(idleHead.x, targetHead.x, e), y: lerp(idleHead.y, targetHead.y, e) }; neckWidth = 13;
      } else if (state === STATES.PRE_SWALLOW) {
        head = targetHead; neckWidth = 13;
      } else if (state === STATES.SWALLOW) {
        const e = easeInOut(t);
        head = { x: lerp(targetHead.x, 230, e), y: lerp(targetHead.y, 244, e) };
        neckWidth = lerp(15, 26, pulse(t));
      } else if ([STATES.ROUNDNESS, STATES.POOP_PREP, STATES.POOP, STATES.RIPPLE, STATES.RECOVER].includes(state)) {
        round = state === STATES.ROUNDNESS ? easeOut(t) : state === STATES.RECOVER ? 1 - easeInOut(t) : 1;
      }
      if (state === STATES.ROUNDNESS) head = { x: 218, y: 290 };
      if (state === STATES.POOP_PREP) { bodyY = 10 * easeInOut(t); fluff = easeOut(t); head = { x: 221, y: 279 }; neckWidth = 20; }
      if (state === STATES.POOP) { bodyY = 10; fluff = 1; head = { x: 221, y: 279 }; neckWidth = 20; }
      if (state === STATES.RIPPLE) { bodyY = 10 * (1 - easeInOut(t)); fluff = 1 - .55 * easeInOut(t); head = { x: 218, y: 289 }; }
      if (state === STATES.RECOVER) { fluff = 0; wing = Math.sin(t * Math.PI * 4) * pulse(t); head = { x: lerp(218, idleHead.x, easeInOut(t)), y: lerp(289, idleHead.y, easeInOut(t)) }; }
      if (look) head = { x: lerp(idleHead.x, 216 + (model.target.x - 184) * .11, look), y: lerp(idleHead.y, 310, look) };
      return { head, bodyY, round, fluff, wing, neckWidth };
    }

    draw(ctx, model) {
      const pose = this.pose(model);
      const bx = cfg.bird.x, by = cfg.bird.y + pose.bodyY;
      const bodyRx = 55 + pose.round * 5 + pose.fluff * 4;
      const bodyRy = 65 + pose.round * 4 + pose.fluff * 5;

      // Legs remain planted: the whole gag happens in place.
      line(ctx, [[232, by - 5], [231, 425]], P.leg, 5, 1);
      line(ctx, [[263, by - 3], [265, 426]], P.leg, 5, 1);
      line(ctx, [[231, 425], [217, 430]], P.leg, 2.3, 1);
      line(ctx, [[265, 426], [280, 430]], P.leg, 2.3, 1);

      // Tail feathers only loosen during the preparation.
      ctx.save(); ctx.translate(288, by - 24); ctx.rotate(.15);
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath(); ctx.ellipse(i * (5 + pose.fluff * 3), 0, 9, 28 + pose.fluff * 8, i * .08, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? P.back : "#526b76"; ctx.fill(); ctx.strokeStyle = P.ink; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.restore();

      ellipse(ctx, bx, by - 49, bodyRx, bodyRy, P.belly, P.ink, 1.7);
      // Smooth dark back, intentionally not feather-spiked.
      ctx.beginPath(); ctx.ellipse(bx + 5, by - 60, bodyRx - 5, bodyRy - 17, -.12, Math.PI * 1.02, Math.PI * 2.06);
      ctx.fillStyle = P.back; ctx.fill(); ctx.strokeStyle = P.ink; ctx.lineWidth = 1.4; ctx.stroke();

      // Both wings move only a little; the silhouette never approaches a full spread.
      const wingOffset = Math.abs(pose.wing) * 12;
      ctx.save(); ctx.translate(bx - 18, by - 57); ctx.rotate(.08 + pose.wing * .11);
      ctx.beginPath(); ctx.ellipse(0, wingOffset * .12, 24 + wingOffset * .22, 40, .18, 0, Math.PI * 2);
      ctx.fillStyle = "#4a6471"; ctx.fill(); ctx.strokeStyle = P.ink; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.translate(bx + 5, by - 55); ctx.rotate(-.15 - pose.wing * .13);
      ctx.beginPath(); ctx.ellipse(0, wingOffset * .15, 31 + wingOffset * .3, 46, -.15, 0, Math.PI * 2);
      ctx.fillStyle = "#566f7b"; ctx.fill(); ctx.strokeStyle = P.ink; ctx.lineWidth = 1.2; ctx.stroke();
      line(ctx, [[-18, 5], [17, 19]], "#78909a", 1.2, .55);
      ctx.restore();

      // Belly scallops appear only for the localized fluff state.
      if (pose.fluff > .02) {
        ctx.save(); ctx.globalAlpha = pose.fluff * .75;
        for (let i = 0; i < 5; i += 1) ellipse(ctx, 215 + i * 13, by - 12 + (i % 2) * 3, 10, 7, P.chest, "#a7b3aa", .8);
        ctx.restore();
      }

      // Neck is a clean tapered stroke, so crown/back never look ruffled.
      const shoulder = { x: 215, y: by - 92 };
      line(ctx, [[shoulder.x, shoulder.y], [lerp(shoulder.x, pose.head.x, .55), lerp(shoulder.y, pose.head.y, .55)], [pose.head.x, pose.head.y]], P.chest, pose.neckWidth + 4, 1);
      line(ctx, [[shoulder.x, shoulder.y], [lerp(shoulder.x, pose.head.x, .55), lerp(shoulder.y, pose.head.y, .55)], [pose.head.x, pose.head.y]], P.ink, pose.neckWidth + 7, 1);
      line(ctx, [[shoulder.x, shoulder.y], [lerp(shoulder.x, pose.head.x, .55), lerp(shoulder.y, pose.head.y, .55)], [pose.head.x, pose.head.y]], P.chest, pose.neckWidth + 3, 1);

      const target = model.target;
      const angle = Math.atan2(target.y - pose.head.y, target.swimX - pose.head.x);
      const activeDown = [STATES.FISH_SWIM, STATES.TRACK, STATES.STRIKE, STATES.PRE_SWALLOW].includes(model.state);
      const headAngle = activeDown ? angle : model.state === STATES.SWALLOW ? -1.18 : -.08;
      ctx.save(); ctx.translate(pose.head.x, pose.head.y); ctx.rotate(headAngle);
      ellipse(ctx, 0, 0, 28, 25, P.crown, P.ink, 1.6);
      // White rear plumes are thin, smooth and trail behind the crown.
      line(ctx, [[-17, -16], [-44, -31], [-64, -29]], "#f3f3e9", 2, .95);
      line(ctx, [[-14, -19], [-40, -39], [-56, -42]], "#f3f3e9", 1.5, .9);
      ctx.beginPath(); ctx.moveTo(18, -5); ctx.lineTo(61, 1); ctx.lineTo(18, 8); ctx.closePath();
      ctx.fillStyle = P.beak; ctx.fill(); ctx.strokeStyle = P.ink; ctx.lineWidth = 1; ctx.stroke();
      ellipse(ctx, 10, -8, 5, 5, P.eye, "#f0b777", 1.2);
      ellipse(ctx, 11, -8, 1.8, 1.8, "#1e2527");
      ctx.restore();

      return { x: pose.head.x + Math.cos(headAngle) * 61, y: pose.head.y + Math.sin(headAngle) * 61 };
    }
  }

  function createM0CanvasPlaceholderAssetPack(config) {
    return Object.freeze({
      id: config.assets.activePack,
      interfaceVersion: config.assets.interfaceVersion,
      placeholder: true,
      background: new BackgroundRenderer(),
      basket: new BasketRenderer(),
      fish: new FishRenderer(),
      effects: new EffectsRenderer(),
      bird: new BirdRenderer()
    });
  }

  class SceneRenderer {
    constructor(config, assetPack) {
      this.config = config;
      this.assets = assetPack;
    }

    draw(ctx, model) {
      const assets = this.assets;
      assets.background.draw(ctx, model, this.config);
      assets.effects.drawSplash(ctx, model, this.config);
      const beakTip = assets.bird.draw(ctx, model, this.config);
      assets.fish.draw(ctx, model, beakTip, this.config);
      assets.effects.drawPoop(ctx, model, this.config);
      assets.effects.drawRipple(ctx, model, this.config);
      assets.basket.draw(ctx, model, this.config);
    }
  }

  root.YeluRenderers = {
    SceneRenderer,
    createM0CanvasPlaceholderAssetPack,
    BackgroundRenderer,
    BasketRenderer,
    FishRenderer,
    EffectsRenderer,
    BirdRenderer
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
