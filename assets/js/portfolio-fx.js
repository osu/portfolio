/* =================================================================
   Portfolio FX — aurora, sound, deep links, easter eggs, CRT, day/night
   ================================================================= */
(function () {

  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = () => window.matchMedia("(max-width: 768px)").matches;
  const $ = (s, r = document) => r.querySelector(s);

  function api() { return window.__portfolio || {}; }

   cursor trail (NVIDIA theme) ----- */
  const AuroraTrail = (function () {
    let canvas, ctx, particles = [], active = false, raf = 0;

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function sync() {
      active = document.body.classList.contains("theme-dgx") && !reduceMotion && !isMobile();
      if (active && !raf) loop();
      if (!active) {
        cancelAnimationFrame(raf);
        raf = 0;
        particles = [];
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    function onMove(e) {
      if (!active) return;
      for (let i = 0; i < 2; i++) {
        particles.push({
          x: e.clientX + (Math.random() - 0.5) * 10,
          y: e.clientY + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 0.7,
          vy: (Math.random() - 0.5) * 0.7 - 0.35,
          life: 1,
          size: 1.8 + Math.random() * 3.2,
          hue: Math.random() > 0.45 ? 108 : 205,
        });
      }
      if (particles.length > 140) particles.splice(0, particles.length - 140);
    }

    function loop() {
      if (!active || !ctx) return;
      raf = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particles = particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.016;
        if (p.life <= 0) return false;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        g.addColorStop(0, `hsla(${p.hue}, 90%, 68%, ${p.life * 0.65})`);
        g.addColorStop(1, `hsla(${p.hue}, 80%, 50%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life * 2.2, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });
    }

    function init() {
      if (reduceMotion || isMobile()) return;
      canvas = document.createElement("canvas");
      canvas.className = "aurora-trail";
      canvas.setAttribute("aria-hidden", "true");
      document.body.appendChild(canvas);
      ctx = canvas.getContext("2d");
      resize();
      window.addEventListener("resize", resize);
      document.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("portfolio:os-mode", sync);
      sync();
    }

    return { init };
  })();

   menubar status ----- */
  const DgxStatus = (function () {
    const TERMS = [
      "syncing DGX node…",
      "NVLink fabric stable",
      "GB200 thermals nominal",
      "Mission Control heartbeat",
      "Vera Rubin NVL72 online",
      "infra-controller armed",
      "Blackwell cluster ready",
      "recovery daemon idle",
      "CUDA graphs compiled",
    ];
    let el, termIdx = 0, charIdx = 0, deleting = false, timer = 0;

    function type() {
      if (!el || !document.body.classList.contains("theme-dgx")) return;
      const term = TERMS[termIdx % TERMS.length];
      if (!deleting) {
        charIdx += 1;
        el.textContent = term.slice(0, charIdx);
        if (charIdx >= term.length) {
          deleting = true;
          timer = window.setTimeout(type, 2000);
          return;
        }
        timer = window.setTimeout(type, 38 + Math.random() * 36);
      } else {
        charIdx -= 1;
        el.textContent = term.slice(0, charIdx);
        if (charIdx <= 0) {
          deleting = false;
          termIdx += 1;
          timer = window.setTimeout(type, 420);
          return;
        }
        timer = window.setTimeout(type, 16);
      }
    }

    function sync() {
      if (!el) return;
      window.clearTimeout(timer);
      if (!document.body.classList.contains("theme-dgx")) {
        el.textContent = "";
        el.classList.remove("is-active");
        return;
      }
      el.classList.add("is-active");
      charIdx = 0;
      deleting = false;
      type();
    }

    function init() {
      el = $("#mb-dgx-status");
      if (!el) return;
      window.addEventListener("portfolio:os-mode", sync);
      sync();
    }

    return { init };
  })();

  
  function boot() {
    AuroraTrail.init();
    DgxStatus.init();
  }

  window.addEventListener("portfolio:ready", boot);
  if (window.__portfolio) boot();
})();
