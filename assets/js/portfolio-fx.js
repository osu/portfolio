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

   ----- */
  const SoundFX = (function () {
    let ctx, muted = false;

    function ensureCtx() {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      return ctx;
    }

    function play(name) {
      if (muted || reduceMotion) return;
      try {
        const ac = ensureCtx();
        if (ac.state === "suspended") ac.resume();
        const t = ac.currentTime;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain);
        gain.connect(ac.destination);
        if (name === "thump") {
          osc.frequency.setValueAtTime(190, t);
          osc.frequency.exponentialRampToValueAtTime(55, t + 0.09);
          gain.gain.setValueAtTime(0.14, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
          osc.start(t);
          osc.stop(t + 0.13);
        } else if (name === "whoosh") {
          osc.type = "sine";
          osc.frequency.setValueAtTime(420, t);
          osc.frequency.exponentialRampToValueAtTime(110, t + 0.16);
          gain.gain.setValueAtTime(0.07, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          osc.start(t);
          osc.stop(t + 0.2);
        } else if (name === "shutter") {
          osc.type = "triangle";
          osc.frequency.setValueAtTime(880, t);
          osc.frequency.exponentialRampToValueAtTime(180, t + 0.07);
          gain.gain.setValueAtTime(0.11, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
          osc.start(t);
          osc.stop(t + 0.11);
        }
      } catch (_) {}
    }

    function syncButton(btn) {
      if (!btn) return;
      btn.classList.toggle("is-muted", muted);
      btn.setAttribute("aria-pressed", muted ? "true" : "false");
      btn.title = muted ? "Unmute UI sounds" : "Mute UI sounds";
    }

    function toggle() {
      muted = !muted;
      try { window.localStorage.setItem("portfolio-sound-muted", muted ? "1" : "0"); } catch (_) {}
      syncButton($("[data-sound-toggle]"));
      if (!muted) play("thump");
    }

    function init() {
      try { muted = window.localStorage.getItem("portfolio-sound-muted") === "1"; } catch (_) {}
      const btn = $("[data-sound-toggle]");
      if (btn) {
        btn.addEventListener("click", toggle);
        syncButton(btn);
      }
      window.addEventListener("portfolio:win-open", () => play("whoosh"));
      window.addEventListener("portfolio:dock-click", () => play("thump"));
      window.addEventListener("portfolio:iris-bang", () => play("shutter"));
    }

    return { init, play };
  })();

  
  function boot() {
    AuroraTrail.init();
    DgxStatus.init();
    SoundFX.init();
  }

  window.addEventListener("portfolio:ready", boot);
  if (window.__portfolio) boot();
})();
