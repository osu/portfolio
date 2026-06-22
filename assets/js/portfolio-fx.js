/* =================================================================
   Portfolio FX — aurora, sound, deep links, easter eggs, CRT, day/night
   ================================================================= */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = () => window.matchMedia("(max-width: 768px)").matches;
  const $ = (s, r = document) => r.querySelector(s);

  function api() { return window.__portfolio || {}; }

  /* ----- 1. Aurora cursor trail (NVIDIA theme) ----- */
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

  /* ----- 3. Live DGX menubar status ----- */
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

  /* ----- 4. UI sounds ----- */
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

  /* ----- 5. Day / night wallpaper ----- */
  const DayNight = (function () {
    function apply() {
      const h = new Date().getHours();
      const night = h < 7 || h >= 19;
      document.body.classList.toggle("wallpaper-night", night);
      document.body.classList.toggle("wallpaper-day", !night);
    }

    function init() {
      apply();
      window.setInterval(apply, 60000);
    }

    return { init };
  })();

  /* ----- 6. Konami + confetti + shader party ----- */
  const EasterEggs = (function () {
    const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let seq = [];

    function confetti() {
      const layer = document.createElement("div");
      layer.className = "confetti-layer";
      layer.setAttribute("aria-hidden", "true");
      for (let i = 0; i < 90; i++) {
        const p = document.createElement("i");
        p.style.setProperty("--x", (Math.random() * 100).toFixed(2) + "%");
        p.style.setProperty("--delay", (Math.random() * 0.9).toFixed(2) + "s");
        p.style.setProperty("--hue", String(Math.floor(Math.random() * 360)));
        p.style.setProperty("--rot", (Math.random() * 720).toFixed(0) + "deg");
        layer.appendChild(p);
      }
      document.body.appendChild(layer);
      document.body.classList.add("confetti-active");
      window.setTimeout(() => {
        layer.remove();
        document.body.classList.remove("confetti-active");
      }, 4500);
      api().notify?.("Easter egg", "CUDA confetti deployed 🎉");
    }

    function shaderMode(force) {
      const on = typeof force === "boolean" ? force : !document.body.classList.contains("shader-party");
      document.body.classList.toggle("shader-party", on);
      api().notify?.("Shader mode", on ? "Party shaders enabled" : "Party shaders disabled");
      return on;
    }

    function init() {
      document.addEventListener("keydown", (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        seq.push(e.key);
        if (seq.length > KONAMI.length) seq.shift();
        if (seq.join("\0") === KONAMI.join("\0")) {
          seq = [];
          confetti();
          shaderMode(true);
        }
      });
      window.__portfolioFx = { confetti, shaderMode };
    }

    return { init, confetti, shaderMode };
  })();

  /* ----- 7. Shareable deep links ----- */
  const DeepLinks = (function () {
    const VALID = new Set([
      "about", "experience", "skills", "projects", "certificates", "sideprojects",
      "terminal", "gpu", "github", "diagnostics", "contact",
    ]);

    function targetFromUrl() {
      const params = new URLSearchParams(location.search);
      const app = (params.get("app") || location.hash.replace(/^#\/?/, "")).trim().toLowerCase();
      return VALID.has(app) ? app : "";
    }

    function parse() {
      const app = targetFromUrl();
      if (!app) return;
      window.setTimeout(() => api().openApp?.(app), 400);
    }

    function sync(id) {
      if (!VALID.has(id)) return;
      const url = new URL(location.href);
      url.searchParams.set("app", id);
      url.hash = "";
      history.replaceState({ app: id }, "", url.pathname + url.search);
    }

    function init() {
      window.addEventListener("portfolio:win-open", (e) => sync(e.detail.id));
      window.addEventListener("popstate", parse);
    }

    return { init, parse, targetFromUrl };
  })();

  /* ----- 8. CRT scanline mode ----- */
  const CrtMode = (function () {
    function init() {
      const btn = $("[data-crt-toggle]");
      if (!btn) return;
      try {
        if (window.localStorage.getItem("portfolio-crt") === "1") document.body.classList.add("crt-mode");
      } catch (_) {}
      const sync = () => {
        const on = document.body.classList.contains("crt-mode");
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      };
      btn.addEventListener("click", () => {
        document.body.classList.toggle("crt-mode");
        try {
          window.localStorage.setItem("portfolio-crt", document.body.classList.contains("crt-mode") ? "1" : "0");
        } catch (_) {}
        sync();
        api().notify?.("CRT mode", document.body.classList.contains("crt-mode") ? "Scanlines on" : "Scanlines off");
      });
      sync();
    }

    return { init };
  })();

  function boot() {
    AuroraTrail.init();
    DgxStatus.init();
    SoundFX.init();
    DayNight.init();
    EasterEggs.init();
    DeepLinks.init();
    CrtMode.init();
  }

  window.addEventListener("portfolio:ready", boot);
  if (window.__portfolio) boot();
})();
