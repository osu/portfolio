/* =================================================================
   GeForce OS — desktop engine (vanilla, no dependencies)
   ================================================================= */
(function () {
  "use strict";

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = () => window.matchMedia("(max-width: 768px)").matches;

  /* =============================================================
     BOOT SPLASH
     ============================================================= */
  function boot() {
    const el = $("#boot");
    if (!el) return;
    const fill = $(".boot-bar-fill", el);
    const duration = reduceMotion ? 250 : 1700;
    const start = performance.now();
    let raf;
    function step(now) {
      const p = clamp((now - start) / duration, 0, 1);
      if (fill) fill.style.width = (p * 100).toFixed(1) + "%";
      if (p < 1) raf = requestAnimationFrame(step);
      else finish();
    }
    function finish() {
      if (el.classList.contains("is-done")) return;
      el.classList.add("is-done");
      window.setTimeout(() => el.remove(), 650);
    }
    let skipped = false;
    function skip() {
      if (skipped) return;
      skipped = true;
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
      if (fill) fill.style.width = "100%";
      finish();
    }
    function onKey(e) {
      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") return;
      skip();
    }
    raf = requestAnimationFrame(step);
    el.addEventListener("click", skip);
    document.addEventListener("keydown", onKey);
  }

  /* =============================================================
     CLOCK + MENUBAR
     ============================================================= */
  function clock() {
    const t = $("#mb-clock");
    const d = $("#mb-date");
    function tick() {
      const now = new Date();
      if (t) t.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (d) d.textContent = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    }
    function schedule() {
      tick();
      // re-arm on the real minute boundary so the displayed time flips on time
      window.setTimeout(schedule, 60000 - (Date.now() % 60000));
    }
    schedule();
  }

  /* =============================================================
     WINDOW MANAGER
     ============================================================= */
  const WM = (function () {
    let z = 20;
    const cascade = { x: 60, y: 30, n: 0 };
    const wins = {};        // id -> element
    const placed = {};      // id -> bool (has been positioned once)
    const openers = {};     // id -> element that triggered the open (for focus restore)

    function init() {
      $$(".win").forEach((w) => { wins[w.dataset.app] = w; w.setAttribute("tabindex", "-1"); });

      // titlebar light controls (with per-window descriptive labels)
      $$(".win-light").forEach((b) => {
        const win = b.closest(".win");
        const name = win.getAttribute("aria-label") || win.dataset.app;
        const act = b.dataset.winAction;
        const verb = act.charAt(0).toUpperCase() + act.slice(1);
        b.setAttribute("aria-label", verb + " " + name);
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          const id = win.dataset.app;
          if (act === "close") close(id);
          else if (act === "minimize") minimize(id);
          else if (act === "maximize") toggleMax(id);
        });
      });

      // focus on click anywhere in window
      $$(".win").forEach((w) => {
        w.addEventListener("pointerdown", () => focus(w.dataset.app), true);
        makeDraggable(w);
      });
    }

    function place(win) {
      const id = win.dataset.app;
      if (placed[id] || isMobile()) return;
      const desk = $(".desktop");
      const dw = desk.clientWidth, dh = desk.clientHeight;
      const ww = win.offsetWidth, wh = win.offsetHeight;
      let x, y;
      if (win.dataset.x !== undefined && win.dataset.y !== undefined) {
        // percentage hint from markup
      }
      x = clamp(cascade.x + cascade.n * 34, 12, Math.max(12, dw - ww - 12));
      y = clamp(cascade.y + cascade.n * 30, 12, Math.max(12, dh - wh - 12));
      win.style.left = x + "px";
      win.style.top = y + "px";
      cascade.n = (cascade.n + 1) % 6;
      placed[id] = true;
    }

    function open(id) {
      const win = wins[id];
      if (!win) return;
      const wasOpen = win.classList.contains("is-open") && !win.classList.contains("is-min");
      if (!wasOpen) {
        const trigger = document.activeElement;
        if (trigger && trigger !== document.body && win !== trigger && !win.contains(trigger)) openers[id] = trigger;
      }
      win.classList.remove("is-min");
      if (!win.classList.contains("is-open")) {
        win.classList.add("is-open");
        place(win);
        if (isMobile()) win.classList.add("is-max");
      }
      focus(id);
      syncDock();
      // move DOM focus into the freshly shown window (terminal manages its own input)
      if (!wasOpen && id !== "terminal") win.focus({ preventScroll: true });
    }

    function restoreOpener(id) {
      const t = openers[id];
      delete openers[id];
      if (t && document.body.contains(t) && t.offsetParent !== null) { t.focus(); return true; }
      return false;
    }

    function close(id) {
      const win = wins[id];
      if (!win) return;
      win.classList.remove("is-open", "is-focused", "is-min");
      syncDock();
      if (!restoreOpener(id)) focusTopMost();
    }

    function minimize(id) {
      const win = wins[id];
      if (!win) return;
      win.classList.add("is-min");
      win.classList.remove("is-focused");
      syncDock();
      if (!restoreOpener(id)) focusTopMost();
    }

    function toggleMax(id) {
      const win = wins[id];
      if (!win || isMobile()) return;
      win.classList.toggle("is-max");
      focus(id);
    }

    function focus(id) {
      const win = wins[id];
      if (!win) return;
      $$(".win").forEach((w) => w.classList.remove("is-focused"));
      win.classList.add("is-focused");
      // renumber open windows so the z counter can never run away past menubar(500)/dock(600)
      const stack = $$(".win.is-open").filter((w) => w !== win)
        .sort((a, b) => (+a.style.zIndex || 0) - (+b.style.zIndex || 0));
      z = 20;
      stack.forEach((w) => { w.style.zIndex = ++z; });
      win.style.zIndex = ++z;
      const label = $("#mb-app");
      if (label) label.textContent = win.dataset.title || "";
      syncDock();
    }

    function focusTopMost() {
      const openWins = $$(".win.is-open").filter((w) => !w.classList.contains("is-min"));
      if (!openWins.length) { const l = $("#mb-app"); if (l) l.textContent = "Finder"; return; }
      openWins.sort((a, b) => (+a.style.zIndex || 0) - (+b.style.zIndex || 0));
      const top = openWins[openWins.length - 1];
      focus(top.dataset.app);
      if (top.dataset.app !== "terminal") top.focus({ preventScroll: true });
    }

    function toggleApp(id) {
      const win = wins[id];
      if (!win) return;
      const isOpen = win.classList.contains("is-open") && !win.classList.contains("is-min");
      const isFocused = win.classList.contains("is-focused");
      if (isOpen && isFocused) minimize(id);
      else open(id);
    }

    function makeDraggable(win) {
      const bar = $(".win-titlebar", win);
      if (!bar) return;
      let sx, sy, ox, oy, dragging = false;
      const dockH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--dock-h")) || 76;
      bar.addEventListener("pointerdown", (e) => {
        if (e.target.closest(".win-light")) return;
        if (isMobile() || win.classList.contains("is-max")) return;
        dragging = true;
        sx = e.clientX; sy = e.clientY;
        ox = win.offsetLeft; oy = win.offsetTop;
        bar.setPointerCapture(e.pointerId);
        focus(win.dataset.app);
      });
      bar.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const desk = $(".desktop");
        const nx = clamp(ox + (e.clientX - sx), -win.offsetWidth + 80, desk.clientWidth - 80);
        const ny = clamp(oy + (e.clientY - sy), 0, desk.clientHeight - dockH - 24);
        win.style.left = nx + "px";
        win.style.top = ny + "px";
      });
      const end = (e) => { if (dragging) { dragging = false; try { bar.releasePointerCapture(e.pointerId); } catch (_) {} } };
      bar.addEventListener("pointerup", end);
      bar.addEventListener("pointercancel", end);
      // double-click titlebar to maximize
      bar.addEventListener("dblclick", (e) => { if (!e.target.closest(".win-light")) toggleMax(win.dataset.app); });
    }

    function syncDock() {
      $$(".dock-item").forEach((it) => {
        const id = it.dataset.app;
        const w = wins[id];
        const live = w && w.classList.contains("is-open") && !w.classList.contains("is-min");
        it.classList.toggle("is-open", !!live);
      });
    }

    return { init, open, close, minimize, toggleMax, focus, toggle: toggleApp, syncDock, wins };
  })();

  /* =============================================================
     DOCK
     ============================================================= */
  function dock() {
    $$(".dock-item").forEach((it) => {
      it.addEventListener("click", () => WM.toggle(it.dataset.app));
    });
  }

  /* =============================================================
     GLOBAL "open app" hooks + keyboard
     ============================================================= */
  function globalHooks() {
    $$("[data-open-app]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        WM.open(el.dataset.openApp);
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if ($(".lb-overlay")) return; // overlay open: let lightbox() handle Escape
      const f = $(".win.is-focused.is-open");
      if (f) WM.minimize(f.dataset.app);
    });
  }

  /* =============================================================
     SKILL BARS (animate on first open)
     ============================================================= */
  function skillBars() {
    const win = WM.wins["skills"];
    if (!win) return;
    let done = false;
    function run() {
      if (done) return; done = true;
      $$(".skill-fill", win).forEach((f) => { f.style.width = (f.dataset.val || 0) + "%"; });
    }
    // observe open class
    const obs = new MutationObserver(() => { if (win.classList.contains("is-open")) run(); });
    obs.observe(win, { attributes: true, attributeFilter: ["class"] });
    if (win.classList.contains("is-open")) run();
  }

  /* =============================================================
     PROJECT FILTERS
     ============================================================= */
  function projectFilters() {
    const btns = $$(".filter-btn");
    btns.forEach((b) => {
      b.addEventListener("click", () => {
        btns.forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        const f = b.dataset.filter;
        $$(".proj").forEach((p) => {
          const cats = (p.dataset.category || "").toLowerCase();
          p.classList.toggle("is-hidden", !(f === "all" || cats.includes(f)));
        });
      });
    });
  }

  /* =============================================================
     CERTIFICATE LIGHTBOX
     ============================================================= */
  function lightbox() {
    let ov;
    $$("[data-zoom]").forEach((img) => {
      img.addEventListener("click", () => {
        ov = document.createElement("div");
        ov.className = "lb-overlay";
        ov.style.cssText = "position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:24px;cursor:zoom-out;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)";
        const big = document.createElement("img");
        big.src = img.src;
        big.style.cssText = "max-width:92vw;max-height:90vh;border:2px solid var(--green);border-radius:10px;box-shadow:var(--glow)";
        ov.appendChild(big);
        ov.addEventListener("click", () => ov.remove());
        document.body.appendChild(ov);
      });
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { const x = $(".lb-overlay"); if (x) x.remove(); } });
  }

  /* =============================================================
     COPY-TO-CLIPBOARD
     ============================================================= */
  function toast(msg) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    window.clearTimeout(t._t);
    t._t = window.setTimeout(() => t.classList.remove("show"), 1800);
  }
  function copyText(text, label) {
    const done = () => toast((label || "Copied") + " ✓");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallback(text, done));
    } else fallback(text, done);
  }
  function fallback(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (_) {}
    document.body.removeChild(ta);
  }
  function copyHooks() {
    $$("[data-copy]").forEach((b) => {
      b.addEventListener("click", (e) => { e.preventDefault(); copyText(b.dataset.copy, b.dataset.copyLabel); });
    });
  }

  /* =============================================================
     GPU STATS (animated, nvidia-smi vibe)
     ============================================================= */
  const GPU = (function () {
    let state = { util: 42, temp: 54, mem: 5.6, fan: 38, power: 118, clock: 1845 };
    const MEM_TOTAL = 24;
    function rnd(v, amp, lo, hi) { return clamp(v + (Math.random() - 0.5) * amp, lo, hi); }
    function step() {
      state.util  = rnd(state.util, 18, 8, 99);
      state.temp  = rnd(state.temp, 2.5, 41, 78);
      state.mem   = rnd(state.mem, 1.2, 2.1, 22);
      state.fan   = rnd(state.fan, 6, 26, 92);
      state.power = rnd(state.power, 22, 70, 340);
      state.clock = rnd(state.clock, 60, 1400, 2520);
    }
    function paintMenubar() {
      const el = $("#mb-gpu");
      if (el) el.textContent = "GPU " + Math.round(state.util) + "% · " + Math.round(state.temp) + "°C";
    }
    function paintPanel() {
      const win = WM.wins["gpu"];
      if (!win || !win.classList.contains("is-open") || win.classList.contains("is-min")) return;
      set("util", Math.round(state.util), "%", state.util);
      set("temp", Math.round(state.temp), "°C", (state.temp / 90) * 100);
      set("fan", Math.round(state.fan), "%", state.fan);
      set("power", Math.round(state.power), "W", (state.power / 350) * 100);
      const memEl = $('[data-g="mem"] .num', win);
      if (memEl) memEl.innerHTML = state.mem.toFixed(1) + ' <small>/ ' + MEM_TOTAL + ' GB</small>';
      const memFill = $('[data-g="mem"] .gauge-fill', win);
      if (memFill) memFill.style.width = ((state.mem / MEM_TOTAL) * 100).toFixed(1) + "%";
      const clk = $('[data-g="clock"] .num', win);
      if (clk) clk.innerHTML = Math.round(state.clock) + ' <small>MHz</small>';
      const clkFill = $('[data-g="clock"] .gauge-fill', win);
      if (clkFill) clkFill.style.width = ((state.clock / 2600) * 100).toFixed(1) + "%";
      function set(key, num, unit, pct) {
        const n = $('[data-g="' + key + '"] .num', win);
        const f = $('[data-g="' + key + '"] .gauge-fill', win);
        if (n) n.innerHTML = num + ' <small>' + unit + '</small>';
        if (f) f.style.width = clamp(pct, 0, 100).toFixed(1) + "%";
      }
    }
    function tick() { step(); paintMenubar(); paintPanel(); }
    function start() {
      paintMenubar();
      if (reduceMotion) {
        // hold a single static snapshot — no flickering numbers under reduced motion
        paintPanel();
        const win = WM.wins["gpu"];
        if (win) {
          const obs = new MutationObserver(() => {
            if (win.classList.contains("is-open") && !win.classList.contains("is-min")) paintPanel();
          });
          obs.observe(win, { attributes: true, attributeFilter: ["class"] });
        }
        return;
      }
      window.setInterval(tick, 1400);
    }
    return { start, snapshot: () => ({ ...state, memTotal: MEM_TOTAL }) };
  })();

  /* =============================================================
     TERMINAL
     ============================================================= */
  const TERM = (function () {
    let out, input, hist = [], hi = -1, booted = false;

    const NEOFETCH = [
      "        <span class='green'>.::////::.</span>          <span class='cmd'>hasan@dgx-os</span>",
      "     <span class='green'>:////////////:</span>        ----------------",
      "   <span class='green'>////'  DGX-OS  '////</span>     <span class='green'>OS</span>      NVIDIA DGX OS v2.0 (portfolio)",
      "  <span class='green'>///'   .::::::.  '//</span>     <span class='green'>Host</span>    Hasan Khan — SWE Intern",
      "  <span class='green'>//'   ://////::    '/</span>    <span class='green'>Employer</span> NVIDIA",
      "  <span class='green'>//    /'      ':    /</span>    <span class='green'>Shell</span>   hasansh 2.0",
      "  <span class='green'>//    :        :    /</span>    <span class='green'>GPU</span>     Blackwell RTX (24GB)",
      "  <span class='green'>'//   ':      :'   //</span>    <span class='green'>CPU</span>     RTX Spark N1X",
      "   <span class='green'>'//.  ':::::'  .//'</span>     <span class='green'>Langs</span>   Py · Go · C++ · TS · JS",
      "    <span class='green'>'////......////'</span>       <span class='green'>Theme</span>   #76B900",
      "       <span class='green'>':::::::::'</span>",
    ];

    const COMMANDS = {
      help() {
        return [
          "<span class='green'>Available commands</span>",
          "  about            who I am",
          "  whoami           short bio",
          "  experience       work history",
          "  skills           languages & tech",
          "  projects         featured projects",
          "  certs            certifications",
          "  contact          how to reach me",
          "  nvidia-smi       GPU status table",
          "  neofetch         system info",
          "  open &lt;app&gt;       launch an app window",
          "  ls               list apps",
          "  date             current date/time",
          "  clear            clear the screen",
          "  help             this menu",
        ];
      },
      whoami() {
        return ["<span class='green'>Hasan Khan</span> — Software Engineer Intern @ NVIDIA",
                "Santa Clara, CA · building things that ship 🚀"];
      },
      about() {
        return ["Passionate technologist focused on <span class='green'>software development, product, and UX</span>.",
                "Background spans software engineering, cybersecurity, and data science.",
                "Type <span class='green'>open about</span> for the full window."];
      },
      experience() {
        return [
          "<span class='green'>NVIDIA</span>          Software Engineer Intern        Apr 2026 — Present",
          "<span class='green'>SAP</span>             Software Engineer Intern        Dec 2025 — Apr 2026",
          "<span class='green'>Bank of Canada</span>  Fullstack SW Dev Intern         Aug 2025 — Nov 2025",
          "<span class='green'>Accenture</span>       Solutions Architect             May 2025 — Aug 2025",
          "<span class='green'>Scale AI</span>        Gen AI Technical Advisor        Jan 2025 — May 2025",
          "<span class='green'>GeoComply</span>       Fraud & Risk Mgmt Intern        Jan 2025 — Apr 2025",
          "<span class='green'>U of Alberta</span>    SW Developer · Optimization Res 2024",
          "Type <span class='green'>open experience</span> for details.",
        ];
      },
      skills() {
        return ["<span class='green'>Code</span>  Python · Go · C++ · TypeScript · JavaScript · SQL",
                "<span class='green'>Tools</span> React · Node · Docker · TensorFlow · Linux · Git · Figma",
                "<span class='green'>Human</span> English · Pashto · Urdu · Hindi · Farsi · French"];
      },
      projects() {
        return [
          "• AI-Powered Disease Detection (X-Ray)  — Python · TensorFlow",
          "• Spotify Top Songs 2021 Analysis       — SQL · Python",
          "• Mini BearTracks                        — Python · Streamlit",
          "• Maze Pathfinder                        — JavaScript",
          "• Quantum NN for Genomics (Intel Hack)   — Python",
          "• FocusBoost EEG App (natHACKS)          — Electron · Python",
          "Type <span class='green'>open projects</span> to browse.",
        ];
      },
      certs() { return ["7 certifications — Software Product Mgmt, Cybersecurity, Selenium, Agile…",
                        "Type <span class='green'>open certificates</span> to view them."]; },
      contact() {
        return ["<span class='green'>Email</span>    hkhan7@ualberta.ca",
                "<span class='green'>LinkedIn</span> linkedin.com/in/hasan-khan-412b5829a",
                "<span class='green'>GitHub</span>   github.com/osu",
                "Type <span class='green'>open contact</span> to copy details."];
      },
      "nvidia-smi"() {
        const s = GPU.snapshot();
        const pad = (v, n) => String(v).padStart(n);
        return [
          "<span class='term-art'>+-----------------------------------------------------------------------------+</span>",
          "<span class='term-art'>| NVIDIA-SMI 555.42   Driver: portfolio.v2        CUDA Version: shipping       |</span>",
          "<span class='term-art'>|-------------------------------+----------------------+----------------------+</span>",
          "<span class='term-art'>| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |</span>",
          "<span class='term-art'>| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |</span>",
          "<span class='term-art'>|===============================+======================+======================|</span>",
          "<span class='term-art'>|   0  Blackwell RTX    On      | 00000000:01:00.0  On |                  N/A |</span>",
          "<span class='term-art'>| " + pad(Math.round(s.fan), 3) + "%  " + pad(Math.round(s.temp), 3) + "C   P2  " + pad(Math.round(s.power), 3) + "W / 350W  |  " + pad(s.mem.toFixed(0), 6) + "MiB / " + s.memTotal + "GiB   |    " + pad(Math.round(s.util), 3) + "%      Default |</span>",
          "<span class='term-art'>+-------------------------------+----------------------+----------------------+</span>",
          "<span class='dim'>Tip: open the GPU app from the dock for live gauges.</span>",
        ];
      },
      neofetch() { return NEOFETCH; },
      ls() { return ["about  experience  skills  projects  certificates  sideprojects  contact  gpu  terminal"]; },
      date() { return [new Date().toString()]; },
      clear() { out.innerHTML = ""; return null; },
      sudo() { return ["<span class='err'>hasan is not in the sudoers file. This incident will be reported. 🚓</span>"]; },
      exit() { return ["<span class='dim'>Nice try — you can't escape the portfolio. Use the dock instead.</span>"]; },
    };

    const APP_ALIASES = {
      about: "about", experience: "experience", work: "experience", exp: "experience",
      skills: "skills", projects: "projects", proj: "projects",
      certs: "certificates", certificates: "certificates",
      contact: "contact", gpu: "gpu", "side": "sideprojects", sideprojects: "sideprojects",
      terminal: "terminal",
    };

    function print(lines, cls, decorative) {
      if (!lines) return;
      (Array.isArray(lines) ? lines : [lines]).forEach((l) => {
        const div = document.createElement("div");
        div.className = "ln" + (cls ? " " + cls : "");
        if (decorative) div.setAttribute("aria-hidden", "true");
        div.innerHTML = l;
        out.appendChild(div);
      });
      out.scrollTop = out.scrollHeight;
    }

    function run(raw) {
      const line = raw.trim();
      print("<span class='term-prompt'>hasan@dgx-os:~$</span> <span class='cmd'>" + escapeHtml(raw) + "</span>");
      if (!line) return;
      hist.unshift(raw); hi = -1;
      const [cmd, ...args] = line.split(/\s+/);
      const key = cmd.toLowerCase();
      if (key === "open") {
        const target = APP_ALIASES[(args[0] || "").toLowerCase()];
        if (target) { WM.open(target); print("<span class='green'>Opening " + escapeHtml(args[0]) + "…</span>"); }
        else print("<span class='err'>open: unknown app '" + escapeHtml(args[0] || "") + "'. Try: ls</span>");
        return;
      }
      if (key === "echo") { print(escapeHtml(args.join(" "))); return; }
      const fn = COMMANDS[key];
      if (fn) print(fn());
      else print("<span class='err'>command not found: " + escapeHtml(cmd) + "</span> — type <span class='green'>help</span>");
    }

    function escapeHtml(s) { return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

    function welcome() {
      if (booted) return; booted = true;
      print(NEOFETCH, null, true);
      print("", null, true);
      print("<span class='dim'>Type <span class='green'>help</span> to get started, or <span class='green'>open projects</span> to explore.</span>");
      print("", null, true);
    }

    function init() {
      const win = WM.wins["terminal"];
      if (!win) return;
      out = $(".term-output", win);
      input = $(".term-input", win);
      if (!out || !input) return;

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { run(input.value); input.value = ""; }
        else if (e.key === "ArrowUp") { if (hi < hist.length - 1) { hi++; input.value = hist[hi] || ""; } e.preventDefault(); }
        else if (e.key === "ArrowDown") { if (hi > 0) { hi--; input.value = hist[hi] || ""; } else { hi = -1; input.value = ""; } e.preventDefault(); }
        else if (e.key === "l" && e.ctrlKey) { out.innerHTML = ""; e.preventDefault(); }
      });
      // focus input when clicking terminal body
      win.addEventListener("click", (e) => { if (!window.getSelection().toString()) input.focus(); });

      const obs = new MutationObserver(() => {
        if (win.classList.contains("is-open") && !win.classList.contains("is-min")) { welcome(); setTimeout(() => input.focus(), 60); }
      });
      obs.observe(win, { attributes: true, attributeFilter: ["class"] });
      if (win.classList.contains("is-open")) welcome();
    }
    return { init };
  })();

  /* =============================================================
     SPACE WELLS
     ============================================================= */
  const SPACE_WELLS = (function () {
    const SPEED = 20; // pixels per second
    const GROWTH_PER_SECOND = 0.01;
    const BIG_BANG_DURATION = 20000;
    const PANE_WARP_TARGET_SELECTOR = ".desktop-watermark, .win.is-open:not(.is-min):not(.is-max)";
    const TEXT_WARP_TARGET_SELECTOR = [
      ".desktop-watermark p",
      ".win.is-open:not(.is-min):not(.is-max) .win-title",
      ".win.is-open:not(.is-min):not(.is-max) .h-title",
      ".win.is-open:not(.is-min):not(.is-max) .h-sub",
      ".win.is-open:not(.is-min):not(.is-max) .lead",
      ".win.is-open:not(.is-min):not(.is-max) .name",
      ".win.is-open:not(.is-min):not(.is-max) .role",
      ".win.is-open:not(.is-min):not(.is-max) .meta",
      ".win.is-open:not(.is-min):not(.is-max) .goals li",
      ".win.is-open:not(.is-min):not(.is-max) .xp-head",
      ".win.is-open:not(.is-min):not(.is-max) .xp-when",
      ".win.is-open:not(.is-min):not(.is-max) .xp-team",
      ".win.is-open:not(.is-min):not(.is-max) .xp-body li",
      ".win.is-open:not(.is-min):not(.is-max) .skill-top",
      ".win.is-open:not(.is-min):not(.is-max) .tech-grid span",
      ".win.is-open:not(.is-min):not(.is-max) .proj-info h4",
      ".win.is-open:not(.is-min):not(.is-max) .proj-info .cat",
      ".win.is-open:not(.is-min):not(.is-max) .proj-info .stack",
      ".win.is-open:not(.is-min):not(.is-max) .cert-cap h4",
      ".win.is-open:not(.is-min):not(.is-max) .cert-cap p",
      ".win.is-open:not(.is-min):not(.is-max) .copy-field .val",
      ".win.is-open:not(.is-min):not(.is-max) .gauge .lbl",
      ".win.is-open:not(.is-min):not(.is-max) .gauge .num",
      ".win.is-open:not(.is-min):not(.is-max) .gpu-procs .row",
      ".win.is-open:not(.is-min):not(.is-max) .term-output .ln",
      ".win.is-open:not(.is-min):not(.is-max) .term-inputline",
    ].join(", ");
    const WELL_CONFIGS = [
      { id: "blackhole", x: 0.72, y: 0.24, vx: -SPEED * 0.72, vy: SPEED * 0.7, gravity: 1, spin: 1 },
      { id: "whitehole", x: 0.28, y: 0.72, vx: SPEED * 0.72, vy: -SPEED * 0.7, gravity: -1, spin: -1 },
    ];
    let desk, wells = [], collisionDone = false;

    function getBaseSize() {
      if (!desk) return 105;
      return isMobile() ? 92 : clamp(desk.clientWidth * 0.098, 105, 168);
    }

    function getSize(well, now) {
      const seconds = Math.floor((now - well.startTime) / 1000);
      return well.baseSize * (1 + seconds * GROWTH_PER_SECOND);
    }

    function keepInBounds(well) {
      const dw = desk.clientWidth;
      const dh = desk.clientHeight;
      if (well.size >= dw) well.cx = dw / 2;
      else {
        const minX = well.size / 2;
        const maxX = dw - well.size / 2;
        if (well.cx < minX) { well.cx = minX; well.vx = Math.abs(well.vx); }
        if (well.cx > maxX) { well.cx = maxX; well.vx = -Math.abs(well.vx); }
      }

      if (well.size >= dh) well.cy = dh / 2;
      else {
        const minY = well.size / 2;
        const maxY = dh - well.size / 2;
        if (well.cy < minY) { well.cy = minY; well.vy = Math.abs(well.vy); }
        if (well.cy > maxY) { well.cy = maxY; well.vy = -Math.abs(well.vy); }
      }
    }

    function paint(well) {
      well.el.style.width = well.size.toFixed(2) + "px";
      well.el.style.transform = "translate3d(" + (well.cx - well.size / 2).toFixed(2) + "px, " + (well.cy - well.size / 2).toFixed(2) + "px, 0)";
    }

    function aimPrimaryWellsAtEachOther() {
      const black = wells.find((well) => well.id === "blackhole");
      const white = wells.find((well) => well.id === "whitehole");
      if (!black || !white) return;

      const dx = white.cx - black.cx;
      const dy = white.cy - black.cy;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const vx = (dx / distance) * SPEED;
      const vy = (dy / distance) * SPEED;
      black.vx = vx;
      black.vy = vy;
      white.vx = -vx;
      white.vy = -vy;
    }

    function resetTarget(target) {
      target.classList.remove("blackhole-warped");
      target.style.removeProperty("--bh-warp-x");
      target.style.removeProperty("--bh-warp-y");
      target.style.removeProperty("--bh-warp-r");
      target.style.removeProperty("--bh-warp-brightness");
    }

    function resetTextTarget(target) {
      target.classList.remove("blackhole-text-warped");
      target.style.removeProperty("--bh-text-warp-x");
      target.style.removeProperty("--bh-text-warp-y");
      target.style.removeProperty("--bh-text-skew");
      target.style.removeProperty("--bh-text-r");
      target.style.removeProperty("--bh-text-brightness");
      target.style.removeProperty("--bh-text-shadow-x");
      target.style.removeProperty("--bh-text-shadow-y");
    }

    function measureWarp(target, well, deskRect, influence) {
      const holeX = deskRect.left + well.cx;
      const holeY = deskRect.top + well.cy;
      const rect = target.getBoundingClientRect();
      const nearestX = clamp(holeX, rect.left, rect.right);
      const nearestY = clamp(holeY, rect.top, rect.bottom);
      const edgeDistance = Math.hypot(nearestX - holeX, nearestY - holeY);
      if (edgeDistance > influence) return null;

      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;
      const dx = targetX - holeX;
      const dy = targetY - holeY;
      const centerDistance = Math.max(Math.hypot(dx, dy), 1);
      const nx = dx / centerDistance;
      const ny = dy / centerDistance;
      const strength = Math.pow(1 - edgeDistance / influence, 2);
      return { nx, ny, strength, well };
    }

    function getWarpContributions(target, deskRect, influenceScale) {
      return wells.map((well) => {
        const influence = (well.size * 0.63 + 126) * influenceScale;
        return measureWarp(target, well, deskRect, influence);
      }).filter(Boolean);
    }

    function createGreyWell(cx, cy, size, now) {
      const el = $("#greyhole");
      if (!el) return null;
      return {
        id: "greyhole",
        el,
        startTime: now,
        lastTime: now,
        baseSize: size,
        size,
        cx,
        cy,
        vx: SPEED * 0.22,
        vy: -SPEED * 0.18,
        gravity: 0.18,
        spin: 0.45,
      };
    }

    function createShatterOverlay(cx, cy) {
      const deskRect = desk.getBoundingClientRect();
      const impactX = deskRect.left + cx;
      const impactY = deskRect.top + cy;
      const overlay = document.createElement("div");
      overlay.className = "cosmic-shatter";
      overlay.style.setProperty("--impact-x", impactX.toFixed(2) + "px");
      overlay.style.setProperty("--impact-y", impactY.toFixed(2) + "px");

      const columns = Math.max(6, Math.ceil(window.innerWidth / 170));
      const rows = Math.max(4, Math.ceil(window.innerHeight / 145));
      const shardW = 100 / columns;
      const shardH = 100 / rows;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const centerX = (col + 0.5) * window.innerWidth / columns;
          const centerY = (row + 0.5) * window.innerHeight / rows;
          const dx = centerX - impactX;
          const dy = centerY - impactY;
          const dist = Math.max(Math.hypot(dx, dy), 1);
          const blast = 190 + Math.random() * 280;
          const burstX = (dx / dist) * blast + (Math.random() - 0.5) * 150;
          const burstY = (dy / dist) * blast + (Math.random() - 0.5) * 150;
          const rot = (Math.random() - 0.5) * 110;
          const shard = document.createElement("div");
          shard.className = "shatter-shard";
          shard.style.setProperty("--sx", (col * shardW).toFixed(3) + "vw");
          shard.style.setProperty("--sy", (row * shardH).toFixed(3) + "vh");
          shard.style.setProperty("--sw", "calc(" + shardW.toFixed(3) + "vw + 1px)");
          shard.style.setProperty("--sh", "calc(" + shardH.toFixed(3) + "vh + 1px)");
          shard.style.setProperty("--dx", burstX.toFixed(2) + "px");
          shard.style.setProperty("--dy", burstY.toFixed(2) + "px");
          shard.style.setProperty("--dx-end", (burstX * 0.18).toFixed(2) + "px");
          shard.style.setProperty("--dy-end", (burstY * 0.18).toFixed(2) + "px");
          shard.style.setProperty("--rot", rot.toFixed(2) + "deg");
          shard.style.setProperty("--rot-end", (rot * 0.28).toFixed(2) + "deg");
          shard.style.setProperty("--delay", (Math.random() * 0.12).toFixed(3) + "s");
          shard.style.setProperty("--p1", Math.floor(Math.random() * 10) + "% " + Math.floor(Math.random() * 8) + "%");
          shard.style.setProperty("--p2", (90 + Math.floor(Math.random() * 10)) + "% " + Math.floor(Math.random() * 12) + "%");
          shard.style.setProperty("--p3", (88 + Math.floor(Math.random() * 12)) + "% " + (88 + Math.floor(Math.random() * 12)) + "%");
          shard.style.setProperty("--p4", Math.floor(Math.random() * 12) + "% " + (86 + Math.floor(Math.random() * 14)) + "%");
          overlay.appendChild(shard);
        }
      }

      document.body.appendChild(overlay);
      window.setTimeout(() => overlay.remove(), 2600);
    }

    function createBigBangOverlay(cx, cy) {
      const deskRect = desk.getBoundingClientRect();
      const impactX = deskRect.left + cx;
      const impactY = deskRect.top + cy;
      const overlay = document.createElement("div");
      overlay.className = "cosmic-bigbang";
      overlay.style.setProperty("--impact-x", impactX.toFixed(2) + "px");
      overlay.style.setProperty("--impact-y", impactY.toFixed(2) + "px");

      const rings = [
        { size: "10vmin", delay: "0s", color: "rgba(255,255,255,0.58)", mid: 6, end: 13 },
        { size: "18vmin", delay: "0.7s", color: "rgba(118,185,0,0.28)", mid: 5.4, end: 10 },
        { size: "26vmin", delay: "1.4s", color: "rgba(185,225,255,0.30)", mid: 4.8, end: 8.6 },
        { size: "34vmin", delay: "2.1s", color: "rgba(255,255,255,0.18)", mid: 4.2, end: 7.4 },
      ];
      rings.forEach((ring) => {
        const el = document.createElement("div");
        el.className = "bigbang-ring";
        el.style.setProperty("--impact-x", impactX.toFixed(2) + "px");
        el.style.setProperty("--impact-y", impactY.toFixed(2) + "px");
        el.style.setProperty("--ring-size", ring.size);
        el.style.setProperty("--ring-color", ring.color);
        el.style.setProperty("--ring-scale-mid", ring.mid);
        el.style.setProperty("--ring-scale-end", ring.end);
        el.style.setProperty("--delay", ring.delay);
        overlay.appendChild(el);
      });

      const colors = [
        "rgba(255,255,255,0.88)",
        "rgba(185,225,255,0.76)",
        "rgba(118,185,0,0.58)",
        "rgba(210,216,214,0.64)",
      ];
      const particleCount = Math.min(180, Math.max(96, Math.floor((window.innerWidth * window.innerHeight) / 11000)));
      const maxTravel = Math.hypot(window.innerWidth, window.innerHeight) * 0.86;
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const travel = maxTravel * (0.18 + Math.random() * 0.82);
        const drift = (Math.random() - 0.5) * 130;
        const dx = Math.cos(angle) * travel + Math.cos(angle + Math.PI / 2) * drift;
        const dy = Math.sin(angle) * travel + Math.sin(angle + Math.PI / 2) * drift;
        const particle = document.createElement("div");
        particle.className = "bigbang-particle";
        particle.style.setProperty("--impact-x", impactX.toFixed(2) + "px");
        particle.style.setProperty("--impact-y", impactY.toFixed(2) + "px");
        particle.style.setProperty("--dx", dx.toFixed(2) + "px");
        particle.style.setProperty("--dy", dy.toFixed(2) + "px");
        particle.style.setProperty("--dx-mid", (dx * (0.42 + Math.random() * 0.18)).toFixed(2) + "px");
        particle.style.setProperty("--dy-mid", (dy * (0.42 + Math.random() * 0.18)).toFixed(2) + "px");
        particle.style.setProperty("--particle-size", (1.5 + Math.random() * 4.5).toFixed(2) + "px");
        particle.style.setProperty("--particle-glow", (8 + Math.random() * 22).toFixed(2) + "px");
        particle.style.setProperty("--particle-color", colors[Math.floor(Math.random() * colors.length)]);
        particle.style.setProperty("--particle-opacity", (0.36 + Math.random() * 0.5).toFixed(2));
        particle.style.setProperty("--delay", (Math.random() * 2.8).toFixed(3) + "s");
        overlay.appendChild(particle);
      }

      document.body.appendChild(overlay);
      window.setTimeout(() => overlay.remove(), BIG_BANG_DURATION + 500);
    }

    function clearWarpClasses() {
      $$(".blackhole-warped").forEach(resetTarget);
      $$(".blackhole-text-warped").forEach(resetTextTarget);
    }

    function getOpenPanels() {
      return $$(".win.is-open").filter((panel) => !panel.classList.contains("is-min"));
    }

    function clearPanelMotion(panel) {
      panel.classList.remove("bigbang-pulled", "bigbang-blasted", "bigbang-hidden");
      panel.style.removeProperty("--bb-pull-x");
      panel.style.removeProperty("--bb-pull-y");
      panel.style.removeProperty("--bb-blast-x");
      panel.style.removeProperty("--bb-blast-y");
      panel.style.removeProperty("--bb-rot");
      delete panel._bbVector;
    }

    function pullPanelsToImpact(cx, cy) {
      const deskRect = desk.getBoundingClientRect();
      const impactX = deskRect.left + cx;
      const impactY = deskRect.top + cy;

      clearWarpClasses();
      getOpenPanels().forEach((panel) => {
        clearPanelMotion(panel);
        const rect = panel.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = centerX - impactX;
        const dy = centerY - impactY;
        const distance = Math.max(Math.hypot(dx, dy), 1);
        panel._bbVector = {
          nx: dx / distance,
          ny: dy / distance,
          hitWall: false,
        };
        panel.style.setProperty("--bb-pull-x", ((impactX - centerX) * 0.72).toFixed(2) + "px");
        panel.style.setProperty("--bb-pull-y", ((impactY - centerY) * 0.72).toFixed(2) + "px");
        panel.classList.add("bigbang-pulled");
      });
    }

    function createPanelShatter(rect, nx, ny) {
      const overlay = document.createElement("div");
      overlay.className = "panel-shatter";
      const columns = 4;
      const rows = 3;
      const pieceW = rect.width / columns;
      const pieceH = rect.height / rows;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const shard = document.createElement("div");
          const dx = nx * (130 + Math.random() * 180) + (Math.random() - 0.5) * 140;
          const dy = ny * (130 + Math.random() * 180) + (Math.random() - 0.5) * 140;
          const rot = (Math.random() - 0.5) * 120;
          shard.className = "panel-shard";
          shard.style.setProperty("--psx", (rect.left + col * pieceW).toFixed(2) + "px");
          shard.style.setProperty("--psy", (rect.top + row * pieceH).toFixed(2) + "px");
          shard.style.setProperty("--psw", (pieceW + 1).toFixed(2) + "px");
          shard.style.setProperty("--psh", (pieceH + 1).toFixed(2) + "px");
          shard.style.setProperty("--pdx", dx.toFixed(2) + "px");
          shard.style.setProperty("--pdy", dy.toFixed(2) + "px");
          shard.style.setProperty("--pdx-end", (dx * 0.35).toFixed(2) + "px");
          shard.style.setProperty("--pdy-end", (dy * 0.35).toFixed(2) + "px");
          shard.style.setProperty("--prot", rot.toFixed(2) + "deg");
          shard.style.setProperty("--prot-end", (rot * 0.45).toFixed(2) + "deg");
          shard.style.setProperty("--p1", Math.floor(Math.random() * 10) + "% " + Math.floor(Math.random() * 8) + "%");
          shard.style.setProperty("--p2", (90 + Math.floor(Math.random() * 10)) + "% " + Math.floor(Math.random() * 12) + "%");
          shard.style.setProperty("--p3", (88 + Math.floor(Math.random() * 12)) + "% " + (88 + Math.floor(Math.random() * 12)) + "%");
          shard.style.setProperty("--p4", Math.floor(Math.random() * 12) + "% " + (86 + Math.floor(Math.random() * 14)) + "%");
          overlay.appendChild(shard);
        }
      }

      document.body.appendChild(overlay);
      window.setTimeout(() => overlay.remove(), 1700);
    }

    function blastPanelsFromImpact() {
      getOpenPanels().forEach((panel) => {
        const vector = panel._bbVector || { nx: Math.random() > 0.5 ? 1 : -1, ny: Math.random() > 0.5 ? 1 : -1 };
        const rect = panel.getBoundingClientRect();
        const blast = Math.max(window.innerWidth, window.innerHeight) * 0.9 + Math.random() * 260;
        const blastX = vector.nx * blast;
        const blastY = vector.ny * blast;
        const finalLeft = rect.left + blastX;
        const finalRight = rect.right + blastX;
        const finalTop = rect.top + blastY;
        const finalBottom = rect.bottom + blastY;
        const hitWall = finalLeft < 0 || finalRight > window.innerWidth || finalTop < 0 || finalBottom > window.innerHeight;

        panel.style.setProperty("--bb-blast-x", blastX.toFixed(2) + "px");
        panel.style.setProperty("--bb-blast-y", blastY.toFixed(2) + "px");
        panel.style.setProperty("--bb-rot", ((Math.random() - 0.5) * 28).toFixed(2) + "deg");
        panel.classList.remove("bigbang-pulled");
        panel.classList.add("bigbang-blasted");

        if (hitWall) {
          window.setTimeout(() => {
            createPanelShatter(panel.getBoundingClientRect(), vector.nx, vector.ny);
            panel.classList.add("bigbang-hidden");
          }, 1250);
        }
      });
    }

    function resetPanelsToStartup() {
      $$(".panel-shatter, .cosmic-shatter, .cosmic-bigbang").forEach((node) => node.remove());
      $$(".win").forEach((panel) => {
        clearPanelMotion(panel);
        panel.classList.remove("is-open", "is-focused", "is-min", "is-max");
        panel.style.removeProperty("transform");
        panel.style.removeProperty("filter");
      });

      if (isMobile()) {
        WM.open("about");
        return;
      }

      const gpu = WM.wins["gpu"];
      const about = WM.wins["about"];
      if (gpu) {
        gpu.style.left = "60px";
        gpu.style.top = "30px";
      }
      if (about) {
        about.style.left = "94px";
        about.style.top = "60px";
      }
      WM.open("gpu");
      WM.open("about");
    }

    function resetSpaceWells() {
      const now = performance.now();
      const black = $("#blackhole");
      const white = $("#whitehole");
      const grey = $("#greyhole");
      if (black) black.classList.remove("is-collapsed");
      if (white) white.classList.remove("is-collapsed");
      if (grey) grey.classList.remove("is-formed", "is-active");

      collisionDone = false;
      wells = WELL_CONFIGS.map((config) => {
        const el = $("#" + config.id);
        if (!el) return null;
        const baseSize = getBaseSize();
        return {
          ...config,
          el,
          startTime: now,
          lastTime: now,
          baseSize,
          size: baseSize,
          cx: clamp(desk.clientWidth * config.x, baseSize / 2, desk.clientWidth - baseSize / 2),
          cy: clamp(desk.clientHeight * config.y, baseSize / 2, desk.clientHeight - baseSize / 2),
        };
      }).filter(Boolean);
      aimPrimaryWellsAtEachOther();
      wells.forEach(paint);
    }

    function triggerCollision(black, white, now) {
      if (collisionDone) return;
      collisionDone = true;

      const cx = (black.cx + white.cx) / 2;
      const cy = (black.cy + white.cy) / 2;
      const greySize = clamp((black.size + white.size) * 0.62, getBaseSize() * 0.95, getBaseSize() * 1.6);
      const grey = createGreyWell(cx, cy, greySize, now);

      black.el.classList.add("is-collapsed");
      white.el.classList.add("is-collapsed");
      wells = [];
      pullPanelsToImpact(cx, cy);
      createShatterOverlay(cx, cy);
      createBigBangOverlay(cx, cy);
      window.setTimeout(blastPanelsFromImpact, 1150);
      window.setTimeout(() => {
        resetPanelsToStartup();
        resetSpaceWells();
      }, BIG_BANG_DURATION);

      if (!grey) return;
      grey.el.style.width = grey.size.toFixed(2) + "px";
      grey.el.style.setProperty("--gh-x", (grey.cx - grey.size / 2).toFixed(2) + "px");
      grey.el.style.setProperty("--gh-y", (grey.cy - grey.size / 2).toFixed(2) + "px");
      grey.el.classList.add("is-formed");

      window.setTimeout(() => {
        grey.lastTime = performance.now();
        wells = [grey];
        grey.el.classList.remove("is-formed");
        grey.el.classList.add("is-active");
        paint(grey);
      }, 1500);
    }

    function checkCollision(now) {
      if (collisionDone) return false;
      const black = wells.find((well) => well.id === "blackhole");
      const white = wells.find((well) => well.id === "whitehole");
      if (!black || !white) return false;

      const distance = Math.hypot(black.cx - white.cx, black.cy - white.cy);
      const threshold = Math.max(6, Math.min(black.size, white.size) * 0.06);
      if (distance > threshold) return false;

      triggerCollision(black, white, now);
      return true;
    }

    function repelBlackHole(dt) {
      const black = wells.find((well) => well.id === "blackhole");
      const white = wells.find((well) => well.id === "whitehole");
      if (!black || !white) return;

      const dx = black.cx - white.cx;
      const dy = black.cy - white.cy;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const influence = (black.size + white.size) * 0.3;
      if (distance > influence) return;

      const strength = Math.pow(1 - distance / influence, 2);
      const nx = dx / distance;
      const ny = dy / distance;
      const acceleration = 4 * strength;
      black.vx += nx * acceleration * dt;
      black.vy += ny * acceleration * dt;

      const overlap = (black.size + white.size) * 0.08 - distance;
      if (overlap > 0) {
        black.cx += nx * overlap * 0.12;
        black.cy += ny * overlap * 0.12;
      }

      const speed = Math.max(Math.hypot(black.vx, black.vy), 1);
      const clampedSpeed = clamp(speed, SPEED * 0.75, SPEED * 1.55);
      black.vx = (black.vx / speed) * clampedSpeed;
      black.vy = (black.vy / speed) * clampedSpeed;
    }

    function warpNearby() {
      const deskRect = desk.getBoundingClientRect();
      const activeTargets = new Set($$(PANE_WARP_TARGET_SELECTOR));

      $$(".blackhole-warped").forEach((target) => {
        if (!activeTargets.has(target)) resetTarget(target);
      });

      activeTargets.forEach((target) => {
        const warps = getWarpContributions(target, deskRect, 1);
        if (!warps.length) {
          resetTarget(target);
          return;
        }

        let warpX = 0, warpY = 0, maxStrength = 0;
        warps.forEach((warp) => {
          const orbitPull = Math.min(24, warp.well.size * 0.112) * warp.strength;
          const inwardPull = Math.min(13, warp.well.size * 0.056) * warp.strength;
          warpX += (-warp.ny * orbitPull * warp.well.spin) - (warp.nx * inwardPull * warp.well.gravity);
          warpY += (warp.nx * orbitPull * warp.well.spin) - (warp.ny * inwardPull * warp.well.gravity);
          maxStrength = Math.max(maxStrength, warp.strength);
        });
        const rotate = clamp((warpX + warpY) * 0.045, -3.5, 3.5);

        target.classList.add("blackhole-warped");
        target.style.setProperty("--bh-warp-x", warpX.toFixed(2) + "px");
        target.style.setProperty("--bh-warp-y", warpY.toFixed(2) + "px");
        target.style.setProperty("--bh-warp-r", rotate.toFixed(2) + "deg");
        target.style.setProperty("--bh-warp-brightness", (1 + maxStrength * 0.16).toFixed(3));
      });

      warpText(deskRect);
    }

    function warpText(deskRect) {
      const activeTargets = new Set($$(TEXT_WARP_TARGET_SELECTOR));

      $$(".blackhole-text-warped").forEach((target) => {
        if (!activeTargets.has(target)) resetTextTarget(target);
      });

      activeTargets.forEach((target) => {
        const warps = getWarpContributions(target, deskRect, 0.82);
        if (!warps.length) {
          resetTextTarget(target);
          return;
        }

        let warpX = 0, warpY = 0, maxStrength = 0;
        warps.forEach((warp) => {
          const orbitPull = Math.min(13, warp.well.size * 0.085) * warp.strength;
          const inwardPull = Math.min(7, warp.well.size * 0.04) * warp.strength;
          warpX += (-warp.ny * orbitPull * warp.well.spin) - (warp.nx * inwardPull * warp.well.gravity);
          warpY += (warp.nx * orbitPull * warp.well.spin) - (warp.ny * inwardPull * warp.well.gravity);
          maxStrength = Math.max(maxStrength, warp.strength);
        });
        const rotate = clamp((warpX + warpY) * 0.08, -3.2, 3.2);
        const skew = clamp((warpX - warpY) * 0.1, -5, 5);

        target.classList.add("blackhole-text-warped");
        target.style.setProperty("--bh-text-warp-x", warpX.toFixed(2) + "px");
        target.style.setProperty("--bh-text-warp-y", warpY.toFixed(2) + "px");
        target.style.setProperty("--bh-text-skew", skew.toFixed(2) + "deg");
        target.style.setProperty("--bh-text-r", rotate.toFixed(2) + "deg");
        target.style.setProperty("--bh-text-brightness", (1 + maxStrength * 0.22).toFixed(3));
        target.style.setProperty("--bh-text-shadow-x", (warpX * 0.34).toFixed(2) + "px");
        target.style.setProperty("--bh-text-shadow-y", (warpY * 0.34).toFixed(2) + "px");
      });
    }

    function frame(now) {
      let frameDt = 0;
      wells.forEach((well) => {
        const dt = Math.min((now - well.lastTime) / 1000, 0.25);
        frameDt = Math.max(frameDt, dt);
        well.lastTime = now;
        well.size = getSize(well, now);
      });
      if (checkCollision(now)) {
        warpNearby();
        requestAnimationFrame(frame);
        return;
      }
      repelBlackHole(frameDt);
      wells.forEach((well) => {
        const dt = frameDt;
        well.cx += well.vx * dt;
        well.cy += well.vy * dt;
        keepInBounds(well);
        paint(well);
      });
      warpNearby();
      requestAnimationFrame(frame);
    }

    function resize() {
      if (!desk || !wells.length) return;
      const now = performance.now();
      wells.forEach((well) => {
        well.baseSize = getBaseSize();
        well.size = getSize(well, now);
        keepInBounds(well);
        paint(well);
      });
      warpNearby();
    }

    function init() {
      desk = $(".desktop");
      if (!desk) return;

      const now = performance.now();
      wells = WELL_CONFIGS.map((config) => {
        const el = $("#" + config.id);
        if (!el) return null;
        const baseSize = getBaseSize();
        return {
          ...config,
          el,
          startTime: now,
          lastTime: now,
          baseSize,
          size: baseSize,
          cx: clamp(desk.clientWidth * config.x, baseSize / 2, desk.clientWidth - baseSize / 2),
          cy: clamp(desk.clientHeight * config.y, baseSize / 2, desk.clientHeight - baseSize / 2),
        };
      }).filter(Boolean);
      if (!wells.length) return;
      aimPrimaryWellsAtEachOther();

      if (reduceMotion) {
        wells.forEach((well) => paint(well));
        return;
      }

      window.addEventListener("resize", resize);
      requestAnimationFrame(frame);
    }

    return { init };
  })();

  /* =============================================================
     INIT
     ============================================================= */
  function init() {
    // pause the wallpaper video for users who prefer reduced motion
    const bgVideo = $(".desktop-video");
    if (bgVideo && reduceMotion) { bgVideo.removeAttribute("autoplay"); bgVideo.pause(); }
    boot();
    clock();
    WM.init();
    dock();
    globalHooks();
    skillBars();
    projectFilters();
    lightbox();
    copyHooks();
    GPU.start();
    TERM.init();
    SPACE_WELLS.init();

    // default windows on first load (open About last so it takes focus)
    if (!isMobile()) {
      WM.open("gpu");
      WM.open("about");
    } else {
      WM.open("about");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
