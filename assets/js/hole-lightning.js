/* =================================================================
   Fluid procedural brand energy for Microsoft / Apple collision cores
   ================================================================= */
const BRAND_LIGHTNING = (function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;
  const mounts = [];

  const STYLES = {
    microsoft: [
      {
        id: "red", angle: -2.72, jitter: 0.07, inner: 0.35, length: 0.94,
        outer: "rgba(255,218,208,0.66)", core: "rgba(255,76,34,1)", glow: "rgba(242,80,34,0.96)",
        width: 2.15, blur: 16, duration: 1720, cadence: 1480, wave: 0.082, drift: 0.9,
      },
      {
        id: "green", angle: -0.94, jitter: 0.055, inner: 0.39, length: 0.78,
        outer: "rgba(224,255,194,0.62)", core: "rgba(142,214,10,1)", glow: "rgba(127,186,0,0.94)",
        width: 1.55, blur: 12, duration: 1460, cadence: 1690, wave: 0.064, drift: 1.12,
      },
      {
        id: "blue", angle: 0.38, jitter: 0.075, inner: 0.33, length: 1.02,
        outer: "rgba(202,238,255,0.68)", core: "rgba(22,180,255,1)", glow: "rgba(0,164,239,0.98)",
        width: 1.95, blur: 22, duration: 1880, cadence: 1570, wave: 0.095, drift: 0.78,
      },
      {
        id: "yellow", angle: 2.03, jitter: 0.045, inner: 0.41, length: 0.72,
        outer: "rgba(255,246,192,0.64)", core: "rgba(255,196,8,1)", glow: "rgba(255,185,0,0.96)",
        width: 1.35, blur: 10, duration: 1380, cadence: 1810, wave: 0.052, drift: 1.24,
      },
    ],
    apple: [
      {
        id: "black", angle: -2.35, jitter: 0.34, inner: 0.07, length: 0.98,
        outer: "rgba(255,255,255,0.96)", core: "rgba(2,2,4,1)", glow: "rgba(255,255,255,0.84)",
        width: 2.75, blur: 18, duration: 1660, cadence: 1380, wave: 0.16, drift: 1.12,
      },
      {
        id: "white", angle: 0.74, jitter: 0.4, inner: 0.11, length: 0.9,
        outer: "rgba(1,2,4,0.98)", core: "rgba(255,255,255,1)", glow: "rgba(255,255,255,0.98)",
        width: 2.05, blur: 21, duration: 1920, cadence: 1540, wave: 0.19, drift: 0.86,
      },
    ],
  };

  function traceFluidPath(ctx, points) {
    if (points.length < 2) return;
    ctx.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length - 1; index++) {
      const point = points[index];
      const next = points[index + 1];
      const midX = (point[0] + next[0]) / 2;
      const midY = (point[1] + next[1]) / 2;
      ctx.quadraticCurveTo(point[0], point[1], midX, midY);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last[0], last[1]);
  }

  function drawBolt(ctx, points, style, alpha) {
    if (points.length < 2 || alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.shadowColor = style.glow;
    ctx.shadowBlur = style.blur;
    ctx.beginPath();
    traceFluidPath(ctx, points);
    ctx.strokeStyle = style.outer;
    ctx.lineWidth = style.width + 2.25;
    ctx.stroke();

    ctx.shadowBlur = style.blur * 0.48;
    ctx.beginPath();
    traceFluidPath(ctx, points);
    ctx.strokeStyle = style.core;
    ctx.lineWidth = style.width;
    ctx.stroke();
    ctx.restore();
  }

  function fluidPoints(dims, bolt, now) {
    const style = bolt.style;
    const elapsed = (now - bolt.bornAt) / 1000;
    const count = style.id === "yellow" ? 10 : 13;
    const points = [];
    const innerRadius = dims.radius * style.inner;
    const outerRadius = dims.radius * bolt.length;

    for (let index = 0; index <= count; index++) {
      const t = index / count;
      const envelope = Math.sin(Math.PI * t);
      const radialEase = t * t * (3 - 2 * t);
      const radius = innerRadius + (outerRadius - innerRadius) * radialEase;
      const slowWave = Math.sin(t * Math.PI * 2.15 + elapsed * style.drift + bolt.seed);
      const fineWave = Math.sin(t * Math.PI * 5.2 - elapsed * style.drift * 0.68 + bolt.seed * 1.7);
      const angleOffset = (slowWave * style.wave + fineWave * style.wave * 0.34) * envelope;
      const angle = bolt.angle + angleOffset;
      const perpendicular = Math.sin(t * Math.PI * 3.1 + elapsed * 1.35 + bolt.seed) * dims.radius * 0.018 * envelope;
      const x = dims.cx + Math.cos(angle) * radius + Math.cos(angle + Math.PI / 2) * perpendicular;
      const y = dims.cy + Math.sin(angle) * radius + Math.sin(angle + Math.PI / 2) * perpendicular;
      points.push([x, y]);
    }
    return points;
  }

  function mount(el, kind) {
    if (!el || reduceMotion) return null;

    const styles = STYLES[kind] || STYLES.microsoft;
    const canvas = document.createElement("canvas");
    canvas.className = "brand-lightning-canvas";
    canvas.setAttribute("aria-hidden", "true");
    el.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      canvas.remove();
      return null;
    }

    let bolts = [];
    let dims = null;
    let raf = 0;
    let running = true;
    let lastParentWidth = 0;
    const nextStrike = new Map();

    function size(force = false) {
      const box = el.getBoundingClientRect();
      if (!force && lastParentWidth && Math.abs(box.width - lastParentWidth) / lastParentWidth < 0.035) return dims;
      lastParentWidth = box.width;
      const pad = 2.35;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(box.width * pad, 64);
      const height = Math.max(box.height * pad, 64);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width.toFixed(1) + "px";
      canvas.style.height = height.toFixed(1) + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dims = { width, height, cx: width / 2, cy: height / 2, radius: Math.min(width, height) * 0.42 };
      return dims;
    }

    function spawn(style, now) {
      const laneBolts = bolts.filter((bolt) => bolt.style.id === style.id);
      if (laneBolts.length >= 2) return;
      const seed = Math.random() * TAU;
      const kindDrift = kind === "apple" ? Math.sin(now * 0.00041 + seed) * 0.14 : 0;
      bolts.push({
        id: kind + "-" + style.id + "-" + Math.round(now) + "-" + Math.round(seed * 1000),
        style,
        bornAt: now,
        duration: style.duration * (0.9 + Math.random() * 0.2),
        angle: style.angle + kindDrift + (Math.random() - 0.5) * style.jitter,
        length: style.length * (0.9 + Math.random() * 0.16),
        seed,
      });
      nextStrike.set(style.id, now + style.cadence * (0.86 + Math.random() * 0.26));
    }

    function frame(now) {
      if (!running || document.hidden || !dims) return;
      raf = requestAnimationFrame(frame);

      styles.forEach((style, index) => {
        if (!nextStrike.has(style.id)) nextStrike.set(style.id, now + index * 210);
        if (now >= nextStrike.get(style.id)) spawn(style, now);
      });

      ctx.clearRect(0, 0, dims.width, dims.height);
      bolts = bolts.filter((bolt) => {
        const progress = (now - bolt.bornAt) / bolt.duration;
        if (progress >= 1) return false;
        const fade = Math.pow(Math.max(0, Math.sin(Math.PI * progress)), 0.72);
        const breathe = 0.9 + Math.sin(now * 0.0065 + bolt.seed) * 0.1;
        const points = fluidPoints(dims, bolt, now);
        drawBolt(ctx, points, bolt.style, fade * breathe);
        bolt.lastPoints = points;
        bolt.alpha = fade * breathe;
        return true;
      });
    }

    const onResize = () => size(true);
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => size(false));
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (!document.hidden && running) raf = requestAnimationFrame(frame);
    };

    size(true);
    styles.forEach((style, index) => nextStrike.set(style.id, performance.now() + index * 210));
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    if (resizeObserver) resizeObserver.observe(el);
    raf = requestAnimationFrame(frame);

    const api = {
      kind,
      destroy() {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVisibility);
        if (resizeObserver) resizeObserver.disconnect();
        canvas.remove();
      },
      snapshot() {
        return bolts.map((bolt) => ({
          id: bolt.id,
          channel: bolt.style.id,
          alpha: Number((bolt.alpha || 0).toFixed(3)),
          origin: bolt.lastPoints ? bolt.lastPoints[0].map((value) => Number(value.toFixed(2))) : null,
          end: bolt.lastPoints ? bolt.lastPoints[bolt.lastPoints.length - 1].map((value) => Number(value.toFixed(2))) : null,
        }));
      },
    };
    mounts.push(api);
    return api;
  }

  function init() {
    const microsoft = document.getElementById("microsoft-orb");
    const apple = document.getElementById("apple-orb");
    const active = [];
    if (microsoft) active.push(mount(microsoft, "microsoft"));
    if (apple) active.push(mount(apple, "apple"));
    return active;
  }

  function snapshot() {
    return mounts.flatMap((mountApi) => mountApi.snapshot());
  }

  return { init, mount, snapshot };
})();
