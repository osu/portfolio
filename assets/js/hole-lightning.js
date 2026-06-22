/* =================================================================
   Procedural lightning arcs for black / white holes
   ================================================================= */
const HOLE_LIGHTNING = (function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function branch(ctx, x1, y1, x2, y2, spread, depth, style) {
    if (depth <= 0 || spread < 1.2) {
      ctx.lineTo(x2, y2);
      return;
    }
    const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * spread;
    const my = (y1 + y2) / 2 + (Math.random() - 0.5) * spread;
    branch(ctx, x1, y1, mx, my, spread * 0.52, depth - 1, style);
    if (depth > 2 && Math.random() < 0.38) {
      const bx = mx + (Math.random() - 0.5) * spread * 0.9;
      const by = my + (Math.random() - 0.5) * spread * 0.9;
      ctx.moveTo(mx, my);
      branch(ctx, mx, my, bx, by, spread * 0.34, Math.max(1, depth - 3), style);
      ctx.moveTo(mx, my);
    }
    branch(ctx, mx, my, x2, y2, spread * 0.52, depth - 1, style);
  }

  function buildPath(cx, cy, angle, length, spread) {
    const ex = cx + Math.cos(angle) * length;
    const ey = cy + Math.sin(angle) * length;
    const points = [[cx, cy]];
    (function walk(x1, y1, x2, y2, s, depth) {
      if (depth <= 0 || s < 1) {
        points.push([x2, y2]);
        return;
      }
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * s;
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * s;
      walk(x1, y1, mx, my, s * 0.52, depth - 1);
      if (depth > 2 && Math.random() < 0.34) {
        const bx = mx + (Math.random() - 0.5) * s * 0.85;
        const by = my + (Math.random() - 0.5) * s * 0.85;
        points.push([mx, my]);
        walk(mx, my, bx, by, s * 0.32, Math.max(1, depth - 3));
      }
      walk(mx, my, x2, y2, s * 0.52, depth - 1);
    })(cx, cy, ex, ey, spread, 5);
    return points;
  }

  function drawBolt(ctx, points, style, alpha) {
    if (points.length < 2) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = style.blur;

    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.strokeStyle = style.outer;
    ctx.lineWidth = style.width + 2.4;
    ctx.stroke();

    ctx.shadowBlur = style.blur * 0.55;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.strokeStyle = style.core;
    ctx.lineWidth = style.width;
    ctx.stroke();
    ctx.restore();
  }

  const STYLES = {
    dark: {
      outer: "rgba(30,0,55,0.95)",
      core: "rgba(185,140,255,0.92)",
      glow: "rgba(90,20,140,0.95)",
      width: 1.4,
      blur: 14,
    },
    bright: {
      outer: "rgba(200,230,255,0.85)",
      core: "rgba(255,255,255,1)",
      glow: "rgba(180,220,255,0.95)",
      width: 1.6,
      blur: 16,
    },
  };

  function mount(el, kind) {
    if (!el || reduceMotion) return null;

    const style = STYLES[kind] || STYLES.dark;
    const canvas = document.createElement("canvas");
    canvas.className = "hole-lightning-canvas";
    canvas.setAttribute("aria-hidden", "true");
    el.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    let bolts = [];
    let raf = 0;
    let nextStrike = 0;
    let running = true;

    function size() {
      const box = el.getBoundingClientRect();
      const pad = 1.85;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(box.width * pad, 40);
      const h = Math.max(box.height * pad, 40);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w.toFixed(1) + "px";
      canvas.style.height = h.toFixed(1) + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h, cx: w / 2, cy: h / 2, radius: Math.min(w, h) * 0.42 };
    }

    let dims = size();

    function strike(now) {
      const angle = Math.random() * Math.PI * 2;
      const len = dims.radius * (0.55 + Math.random() * 0.55);
      const spread = len * 0.22;
      const points = buildPath(dims.cx, dims.cy, angle, len, spread);
      bolts.push({
        points,
        life: 1,
        decay: 0.06 + Math.random() * 0.05,
        flicker: 0.35 + Math.random() * 0.25,
      });
      if (bolts.length > 6) bolts.shift();
      nextStrike = now + 280 + Math.random() * 900;
    }

    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (!nextStrike) nextStrike = now + 200;
      if (now >= nextStrike) strike(now);

      ctx.clearRect(0, 0, dims.w, dims.h);
      bolts = bolts.filter((bolt) => {
        bolt.life -= bolt.decay;
        if (bolt.life <= 0) return false;
        const flick = bolt.life > bolt.flicker ? 1 : (Math.random() > 0.45 ? bolt.life / bolt.flicker : 0);
        drawBolt(ctx, bolt.points, style, flick * Math.min(1, bolt.life + 0.25));
        return true;
      });
    }

    const onResize = () => { dims = size(); };
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(frame);

    return {
      destroy() {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        canvas.remove();
      },
    };
  }

  function init() {
    const black = document.getElementById("blackhole");
    const white = document.getElementById("whitehole");
    const mounts = [];
    if (black) mounts.push(mount(black, "dark"));
    if (white) mounts.push(mount(white, "bright"));
    return mounts;
  }

  return { init, mount };
})();
