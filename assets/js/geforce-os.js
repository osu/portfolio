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
     BLACK HOLE
     ============================================================= */
  const BLACK_HOLE = (function () {
    const SPEED = 20; // pixels per second
    const GROWTH_PER_SECOND = 0.01;
    let el, desk, startTime, lastTime, baseSize, cx, cy, vx, vy;

    function getBaseSize() {
      if (!desk) return 120;
      return isMobile() ? 78 : clamp(desk.clientWidth * 0.09, 78, 150);
    }

    function getSize(now) {
      const seconds = Math.floor((now - startTime) / 1000);
      return baseSize * (1 + seconds * GROWTH_PER_SECOND);
    }

    function keepInBounds(size) {
      const dw = desk.clientWidth;
      const dh = desk.clientHeight;
      if (size >= dw) cx = dw / 2;
      else {
        const minX = size / 2;
        const maxX = dw - size / 2;
        if (cx < minX) { cx = minX; vx = Math.abs(vx); }
        if (cx > maxX) { cx = maxX; vx = -Math.abs(vx); }
      }

      if (size >= dh) cy = dh / 2;
      else {
        const minY = size / 2;
        const maxY = dh - size / 2;
        if (cy < minY) { cy = minY; vy = Math.abs(vy); }
        if (cy > maxY) { cy = maxY; vy = -Math.abs(vy); }
      }
    }

    function paint(size) {
      el.style.width = size.toFixed(2) + "px";
      el.style.transform = "translate3d(" + (cx - size / 2).toFixed(2) + "px, " + (cy - size / 2).toFixed(2) + "px, 0)";
    }

    function frame(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.25);
      lastTime = now;
      const size = getSize(now);
      cx += vx * dt;
      cy += vy * dt;
      keepInBounds(size);
      paint(size);
      requestAnimationFrame(frame);
    }

    function resize() {
      if (!el || !desk) return;
      baseSize = getBaseSize();
      const size = getSize(performance.now());
      keepInBounds(size);
      paint(size);
    }

    function init() {
      el = $("#blackhole");
      desk = $(".desktop");
      if (!el || !desk) return;

      startTime = performance.now();
      lastTime = startTime;
      baseSize = getBaseSize();
      cx = clamp(desk.clientWidth * 0.72, baseSize / 2, desk.clientWidth - baseSize / 2);
      cy = clamp(desk.clientHeight * 0.24, baseSize / 2, desk.clientHeight - baseSize / 2);
      vx = SPEED * 0.8;
      vy = SPEED * 0.6;

      if (reduceMotion) {
        const video = $("video", el);
        if (video) { video.removeAttribute("autoplay"); video.pause(); }
        paint(baseSize);
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
    BLACK_HOLE.init();

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
