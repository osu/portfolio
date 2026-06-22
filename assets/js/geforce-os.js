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
  let currentOsMode = "split";
  const APP_CATALOG = [
    { id: "about", icon: "i-user", title: "About", desc: "Profile and background", names: { macos: "Finder", windows: "Portfolio Explorer", nvidia: "Identity Node" } },
    { id: "experience", icon: "i-briefcase", title: "Experience", desc: "Work history", names: { macos: "Work Timeline", windows: "Experience", nvidia: "Mission Log" } },
    { id: "skills", icon: "i-cpu", title: "Skills", desc: "Languages and tools", names: { macos: "System Profiler", windows: "Skills", nvidia: "Capability Matrix" } },
    { id: "projects", icon: "i-grid", title: "Projects", desc: "Featured builds", names: { macos: "Projects", windows: "Pinned Projects", nvidia: "Build Grid" } },
    { id: "certificates", icon: "i-award", title: "Certificates", desc: "Credentials", names: { macos: "Certificates", windows: "Credentials", nvidia: "Trust Store" } },
    { id: "sideprojects", icon: "i-rocket", title: "Side Projects", desc: "Community and experiments", names: { macos: "Side Projects", windows: "Side Projects", nvidia: "Side Quests" } },
    { id: "terminal", icon: "i-terminal", title: "Terminal", desc: "Shell and commands", names: { macos: "Terminal", windows: "PowerShell", nvidia: "DGX Shell" } },
    { id: "gpu", icon: "i-activity", title: "GPU Stats", desc: "Live graphics telemetry", names: { macos: "Graphics", windows: "Task Manager", nvidia: "GPU Telemetry" } },
    { id: "github", icon: "i-github", title: "GitHub", desc: "Repos and public activity", names: { macos: "GitHub", windows: "GitHub", nvidia: "Repo Feed" } },
    { id: "diagnostics", icon: "i-activity", title: "Diagnostics", desc: "Fabric and recovery status", names: { macos: "Diagnostics", windows: "Diagnostics", nvidia: "Fabric Diagnostics" } },
    { id: "contact", icon: "i-mail", title: "Contact", desc: "Email and socials", names: { macos: "Contacts", windows: "People", nvidia: "Comms" } },
  ];

  function appMeta(id) {
    return APP_CATALOG.find((app) => app.id === id);
  }

  function appTitle(id, mode = currentOsMode) {
    const meta = appMeta(id);
    if (!meta) return id || "";
    return (meta.names && meta.names[mode]) || meta.title;
  }

  function appDescription(id) {
    const meta = appMeta(id);
    return meta ? meta.desc : "";
  }

  function desktopAppName(mode = currentOsMode) {
    if (mode === "windows") return "Desktop";
    if (mode === "nvidia") return "Control Plane";
    return "Finder";
  }

  function iconUse(icon) {
    return "<svg><use href='#" + icon + "' xlink:href='#" + icon + "'/></svg>";
  }

  function escapePlain(value) {
    return String(value || "").replace(/[&<>"]/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    }[c]));
  }

  /* =============================================================
     BOOT SPLASH
     ============================================================= */
  function boot() {
    const el = $("#boot");
    if (!el) return;
    try {
      if (window.localStorage.getItem("portfolio-boot-seen") === "1") {
        el.remove();
        return;
      }
    } catch (_) {}
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
      try { window.localStorage.setItem("portfolio-boot-seen", "1"); } catch (_) {}
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
    const dock = $(".dock");
    const winTime = $("#win-taskbar-time");
    const winDate = $("#win-taskbar-date");
    function tick() {
      const now = new Date();
      if (t) t.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (d) d.textContent = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
      if (winTime) winTime.textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      if (winDate) winDate.textContent = now.toLocaleDateString([], { month: "numeric", day: "numeric", year: "numeric" });
      if (dock) {
        dock.dataset.winTime = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        dock.dataset.winDate = now.toLocaleDateString([], { month: "numeric", day: "numeric", year: "numeric" });
      }
    }
    function schedule() {
      tick();
      // re-arm on the real minute boundary so the displayed time flips on time
      window.setTimeout(schedule, 60000 - (Date.now() % 60000));
    }
    schedule();
  }

  function syncOsSwitcher(mode) {
    $$("[data-os-mode]").forEach((button) => {
      const active = button.dataset.osMode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function setOsMode(mode, options = {}) {
    document.body.classList.remove("theme-macos", "theme-dgx", "theme-mac-only", "theme-windows-only");

    const osLabel = $(".menubar-os");
    const themeColor = $('meta[name="theme-color"]');
    let activeMode = mode;

    if (mode === "macos") {
      document.body.classList.add("theme-macos", "theme-mac-only");
      if (osLabel) osLabel.textContent = "macOS";
      if (themeColor) themeColor.setAttribute("content", "#eff4ff");
    } else if (mode === "windows") {
      document.body.classList.add("theme-macos", "theme-windows-only");
      if (osLabel) osLabel.textContent = "Windows 11";
      if (themeColor) themeColor.setAttribute("content", "#071839");
    } else {
      document.body.classList.add("theme-dgx");
      if (osLabel) osLabel.textContent = "NVIDIA DGX OS";
      if (themeColor) themeColor.setAttribute("content", "#0c0e0c");
      activeMode = "nvidia";
    }

    currentOsMode = activeMode;
    syncOsSwitcher(activeMode);
    syncAppLabels(activeMode);
    window.dispatchEvent(new CustomEvent("portfolio:os-mode", { detail: { mode: activeMode } }));

    if (typeof TERM !== "undefined") TERM.setMode(activeMode);
    if (typeof STOCK !== "undefined") STOCK.setMode(activeMode);
    if (options.layout !== false) applyOsWindowLayout(activeMode);
    playTaskbarIntro(activeMode);

    if (typeof GPU !== "undefined") GPU.refreshMenubar();
  }

  function switchToDgxTheme() {
    setOsMode("nvidia", { layout: false });
  }

  function osSwitcher() {
    $$("[data-os-mode]").forEach((button) => {
      button.addEventListener("click", () => setOsMode(button.dataset.osMode));
    });
    syncOsSwitcher(document.body.classList.contains("theme-dgx") ? "nvidia" : "");
  }

  function syncAppLabels(mode = currentOsMode) {
    APP_CATALOG.forEach((app) => {
      const label = appTitle(app.id, mode);
      $$("[data-app='" + app.id + "']").forEach((el) => {
        const tooltip = $(".dock-tooltip", el);
        if (tooltip) tooltip.textContent = label;
        if (el.matches("button, a")) el.setAttribute("aria-label", label);
        if (el.closest(".mobile-launcher")) {
          const mobileLabel = $("span", el);
          if (mobileLabel) mobileLabel.textContent = label;
        }
      });

      const win = $(".win[data-app='" + app.id + "']");
      if (win) {
        const title = $(".win-title", win);
        win.dataset.title = label;
        win.setAttribute("aria-label", label + " window");
        if (title && app.id !== "terminal" && app.id !== "gpu") title.textContent = label;
      }
    });

    const focused = $(".win.is-focused.is-open:not(.is-min)");
    const menubarApp = $("#mb-app");
    if (focused && menubarApp) menubarApp.textContent = focused.dataset.title || appTitle(focused.dataset.app, mode);
    else if (menubarApp) menubarApp.textContent = desktopAppName(mode);

    $$("[data-action='command-palette']").forEach((el) => {
      const label = mode === "nvidia" ? "Command Palette" : (mode === "windows" ? "Search" : "Spotlight");
      const tooltip = $(".dock-tooltip", el);
      if (tooltip) tooltip.textContent = label;
      el.setAttribute("aria-label", label);
    });
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
        makeResizable(w);
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
      win._minimizeToken = (win._minimizeToken || 0) + 1;
      if (!wasOpen) {
        const trigger = document.activeElement;
        if (trigger && trigger !== document.body && win !== trigger && !win.contains(trigger)) openers[id] = trigger;
      }
      win.classList.remove("is-min", "is-minimizing");
      if (!win.classList.contains("is-open")) {
        win.classList.add("is-open");
        place(win);
        if (isMobile()) win.classList.add("is-max");
      }
      focus(id);
      if (id === "terminal" && typeof TERM !== "undefined") TERM.ensureWelcome();
      if (id === "gpu" && typeof GPU !== "undefined") GPU.refreshMenubar();
      if (id === "github" && typeof GITHUB_APP !== "undefined") GITHUB_APP.refresh();
      if (id === "diagnostics" && typeof DIAGNOSTICS !== "undefined") DIAGNOSTICS.refresh();
      syncDock();
      window.dispatchEvent(new CustomEvent("portfolio:win-open", { detail: { id } }));
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
      win.classList.remove("is-open", "is-focused", "is-min", "is-minimizing");
      syncDock();
      if (!restoreOpener(id)) focusTopMost();
    }

    function closeAll() {
      Object.keys(wins).forEach((id) => {
        const win = wins[id];
        win.classList.remove("is-open", "is-focused", "is-min", "is-max", "is-minimizing");
        delete openers[id];
      });
      z = 20;
      const label = $("#mb-app");
      if (label) label.textContent = desktopAppName();
      syncDock();
    }

    function minimize(id) {
      const win = wins[id];
      if (!win) return;
      if (reduceMotion) {
        win.classList.add("is-min");
        win.classList.remove("is-focused", "is-minimizing");
        syncDock();
        if (!restoreOpener(id)) focusTopMost();
        return;
      }
      if (win.classList.contains("is-minimizing")) return;
      const token = (win._minimizeToken || 0) + 1;
      win._minimizeToken = token;
      win.classList.add("is-minimizing");
      window.setTimeout(() => {
        if (win._minimizeToken !== token) return;
        win.classList.add("is-min");
        win.classList.remove("is-focused", "is-minimizing");
        syncDock();
        if (!restoreOpener(id)) focusTopMost();
      }, 245);
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
      if (!openWins.length) { const l = $("#mb-app"); if (l) l.textContent = desktopAppName(); return; }
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

    function openAt(item) {
      const win = wins[item.id];
      if (!win) return;
      win.classList.remove("is-min", "is-max");
      if (item.left) win.style.left = item.left;
      if (item.top) win.style.top = item.top;
      if (item.width) win.style.width = item.width;
      if (item.height) win.style.height = item.height;
      placed[item.id] = true;
      open(item.id);
      if (item.maximized && !isMobile()) win.classList.add("is-max");
    }

    function arrange(items) {
      closeAll();
      cascade.n = 0;
      items.forEach((item) => {
        const delay = reduceMotion ? 0 : item.delay || 0;
        window.setTimeout(() => openAt(item), delay);
      });
    }

    function snapTargetFromPointer(x, y) {
      const desk = $(".desktop");
      if (!desk) return null;
      const rect = desk.getBoundingClientRect();
      const edge = 34;
      if (y <= rect.top + edge) return "top";
      if (x <= rect.left + edge) return "left";
      if (x >= rect.right - edge) return "right";
      return null;
    }

    function snapRect(target) {
      const desk = $(".desktop");
      if (!desk) return null;
      const rect = desk.getBoundingClientRect();
      const gap = 12;
      const top = gap + 34;
      const bottomReserve = document.body.classList.contains("taskbar-bottom") || document.body.classList.contains("dock-bottom") ? 92 : 16;
      const height = Math.max(280, rect.height - top - bottomReserve);
      if (target === "left") return { left: gap, top, width: Math.floor((rect.width - gap * 3) / 2), height };
      if (target === "right") return { left: Math.floor(rect.width / 2) + gap / 2, top, width: Math.floor((rect.width - gap * 3) / 2), height };
      if (target === "top") return { left: gap, top: gap + 28, width: rect.width - gap * 2, height: Math.max(320, rect.height - bottomReserve - gap * 2 - 28) };
      return null;
    }

    function showSnapPreview(target) {
      const preview = $("[data-snap-preview]");
      const rect = snapRect(target);
      if (!preview || !rect) return;
      preview.style.left = rect.left + "px";
      preview.style.top = rect.top + "px";
      preview.style.width = rect.width + "px";
      preview.style.height = rect.height + "px";
      preview.classList.add("is-visible");
    }

    function hideSnapPreview() {
      const preview = $("[data-snap-preview]");
      if (preview) preview.classList.remove("is-visible");
    }

    function applySnap(win, target) {
      const rect = snapRect(target);
      if (!rect) return;
      win.classList.remove("is-max");
      win.style.left = rect.left + "px";
      win.style.top = rect.top + "px";
      win.style.width = rect.width + "px";
      win.style.height = rect.height + "px";
      if (target === "top") win.classList.add("is-max");
      focus(win.dataset.app);
      notify("Window snapped", appTitle(win.dataset.app) + " moved " + target + ".");
    }

    function makeDraggable(win) {
      const bar = $(".win-titlebar", win);
      if (!bar) return;
      let sx, sy, ox, oy, dragging = false;
      let snapTarget = null;
      const dockH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--dock-h")) || 76;
      function move(e) {
        if (!dragging) return;
        const desk = $(".desktop");
        const nx = clamp(ox + (e.clientX - sx), -win.offsetWidth + 80, desk.clientWidth - 80);
        const ny = clamp(oy + (e.clientY - sy), 0, desk.clientHeight - dockH - 24);
        win.style.left = nx + "px";
        win.style.top = ny + "px";
        snapTarget = snapTargetFromPointer(e.clientX, e.clientY);
        if (snapTarget) showSnapPreview(snapTarget);
        else hideSnapPreview();
      }
      const end = (e) => {
        if (dragging) {
          dragging = false;
          hideSnapPreview();
          if (snapTarget) applySnap(win, snapTarget);
          snapTarget = null;
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", end);
          window.removeEventListener("pointercancel", end);
          try { bar.releasePointerCapture(e.pointerId); } catch (_) {}
        }
      };
      bar.addEventListener("pointerdown", (e) => {
        if (e.target.closest(".win-light")) return;
        if (isMobile() || win.classList.contains("is-max")) return;
        dragging = true;
        sx = e.clientX; sy = e.clientY;
        ox = win.offsetLeft; oy = win.offsetTop;
        try { bar.setPointerCapture(e.pointerId); } catch (_) {}
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", end);
        window.addEventListener("pointercancel", end);
        focus(win.dataset.app);
      });
      bar.addEventListener("pointermove", move);
      bar.addEventListener("pointerup", end);
      bar.addEventListener("pointercancel", end);
      // double-click titlebar to maximize
      bar.addEventListener("dblclick", (e) => { if (!e.target.closest(".win-light")) toggleMax(win.dataset.app); });
    }

    function makeResizable(win) {
      let handle = $(".win-resize-handle", win);
      if (!handle) {
        handle = document.createElement("div");
        handle.className = "win-resize-handle";
        handle.setAttribute("aria-hidden", "true");
        win.appendChild(handle);
      }

      let sx = 0, sy = 0, sw = 0, sh = 0, resizing = false;
      function move(e) {
        if (!resizing) return;
        const desk = $(".desktop");
        const rect = win.getBoundingClientRect();
        const deskRect = desk.getBoundingClientRect();
        const maxW = Math.max(320, deskRect.right - rect.left - 12);
        const maxH = Math.max(280, deskRect.bottom - rect.top - 12);
        const nextW = clamp(sw + e.clientX - sx, 320, maxW);
        const nextH = clamp(sh + e.clientY - sy, 280, maxH);
        win.style.width = nextW.toFixed(0) + "px";
        win.style.height = nextH.toFixed(0) + "px";
      }
      function end(e) {
        if (!resizing) return;
        resizing = false;
        win.classList.remove("is-resizing");
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
      }
      handle.addEventListener("pointerdown", (e) => {
        if (isMobile() || win.classList.contains("is-max")) return;
        e.preventDefault();
        e.stopPropagation();
        resizing = true;
        sx = e.clientX;
        sy = e.clientY;
        sw = win.offsetWidth;
        sh = win.offsetHeight;
        handle.setPointerCapture(e.pointerId);
        focus(win.dataset.app);
        win.classList.add("is-resizing");
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", end);
        window.addEventListener("pointercancel", end);
      });
    }

    function syncDock() {
      $$(".dock-item, .win-taskbar-app").forEach((it) => {
        const id = it.dataset.app;
        const w = wins[id];
        const live = w && w.classList.contains("is-open") && !w.classList.contains("is-min");
        it.classList.toggle("is-open", !!live);
      });
    }

    return { init, open, close, closeAll, arrange, minimize, toggleMax, focus, toggle: toggleApp, syncDock, wins };
  })();

  function applyOsWindowLayout(mode) {
    if (!WM || isMobile()) return;
    const layouts = {
      macos: [
        { id: "about", left: "6vw", top: "72px", delay: 20 },
        { id: "contact", left: "54vw", top: "124px", delay: 180 },
        { id: "certificates", left: "13vw", top: "34vh", delay: 340 },
      ],
      windows: [
        { id: "projects", left: "7vw", top: "92px", width: "min(680px, 48vw)", delay: 20 },
        { id: "terminal", left: "52vw", top: "122px", width: "min(620px, 42vw)", delay: 180 },
        { id: "skills", left: "18vw", top: "44vh", delay: 340 },
      ],
      nvidia: [
        { id: "gpu", left: "60px", top: "42px", delay: 20 },
        { id: "terminal", left: "calc(100vw - min(620px, 44vw) - 56px)", top: "72px", width: "min(620px, 44vw)", delay: 180 },
        { id: "about", left: "104px", top: "96px", delay: 340 },
      ],
    };
    WM.arrange(layouts[mode] || layouts.nvidia);
  }

  /* =============================================================
     DOCK
     ============================================================= */
  function dock() {
    $$(".dock-item, .win-taskbar-app, .win-taskbar-button[data-app], .mobile-launcher [data-app]").forEach((it) => {
      if (!it.dataset.app) return;
      it.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("portfolio:dock-click"));
        WM.toggle(it.dataset.app);
      });
    });
  }

  let taskbarIntroTimers = [];
  function playTaskbarIntro(mode) {
    taskbarIntroTimers.forEach((timer) => window.clearTimeout(timer));
    taskbarIntroTimers = [];
    if (reduceMotion || isMobile()) return;
    const selector = mode === "windows"
      ? ".win-taskbar-button, .win-search, .win-taskbar-app, .win-stock-widget"
      : ".dock-item";
    const items = $$(selector).filter((item) => {
      const rect = item.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    items.forEach((item, index) => {
      taskbarIntroTimers.push(window.setTimeout(() => item.classList.add("tooltip-demo"), 520 + index * 190));
      taskbarIntroTimers.push(window.setTimeout(() => item.classList.remove("tooltip-demo"), 1080 + index * 190));
    });
  }

  function windowsSearch() {
    const button = $(".win-search");
    const panel = $(".windows-search-panel");
    const input = $(".windows-search-box input");
    const results = $(".windows-search-results");
    if (!button || !panel || !input || !results) return;

    const apps = APP_CATALOG;

    function openPanel() {
      if (!document.body.classList.contains("theme-windows-only")) return;
      panel.classList.add("is-open");
      panel.setAttribute("aria-hidden", "false");
      input.focus();
      render();
    }

    function closePanel() {
      panel.classList.remove("is-open");
      panel.setAttribute("aria-hidden", "true");
    }

    function render() {
      const query = input.value.trim().toLowerCase();
      const filtered = apps.filter((app) => {
        const haystack = (appTitle(app.id, "windows") + " " + app.title + " " + app.desc + " " + app.id).toLowerCase();
        return !query || haystack.includes(query);
      });
      results.innerHTML = filtered.map((app) => (
        "<button class='windows-search-result' type='button' data-app='" + app.id + "'>" +
        "<svg><use href='#" + app.icon + "' xlink:href='#" + app.icon + "'/></svg>" +
        "<div><b>" + appTitle(app.id, "windows") + "</b><span>" + app.desc + "</span></div>" +
        "</button>"
      )).join("");
    }

    button.addEventListener("click", (e) => {
      e.stopPropagation();
      if (panel.classList.contains("is-open")) closePanel();
      else openPanel();
    });
    input.addEventListener("input", render);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closePanel();
        button.focus();
      } else if (e.key === "Enter") {
        const first = $(".windows-search-result", results);
        if (first) {
          WM.open(first.dataset.app);
          closePanel();
        }
      }
    });
    results.addEventListener("click", (e) => {
      const result = e.target.closest("[data-app]");
      if (!result) return;
      WM.open(result.dataset.app);
      closePanel();
    });
    document.addEventListener("pointerdown", (e) => {
      if (!panel.classList.contains("is-open")) return;
      if (panel.contains(e.target) || button.contains(e.target)) return;
      closePanel();
    });
  }

  const STOCK = (function () {
    const CONFIG = {
      macos: { symbol: "AAPL", company: "Apple Inc." },
      windows: { symbol: "MSFT", company: "Microsoft Corp." },
      nvidia: { symbol: "NVDA", company: "NVIDIA Corp." },
    };
    const FALLBACK_SERIES = {
      AAPL: [289.2, 289.6, 289.3, 290.1, 290.0, 290.8, 291.1, 290.9, 291.7, 292.4, 292.1, 293.0, 294.1, 294.0, 295.2, 296.8, 298.0],
      MSFT: [477.3, 478.0, 477.6, 479.2, 480.1, 479.4, 481.2, 482.0, 481.5, 483.1, 484.4, 485.0, 486.8, 487.1, 488.9, 490.4, 492.2],
      NVDA: [142.8, 143.4, 142.9, 144.0, 145.6, 145.1, 146.8, 147.3, 146.9, 148.6, 149.8, 150.4, 151.0, 152.9, 154.6, 156.8, 160.3],
    };
    const cache = {};
    let activeMode = "macos";
    let activePopoverSymbol = null;
    let refreshTimer = 0;

    function getModeConfig(mode) {
      return CONFIG[mode] || CONFIG.macos;
    }

    function symbolForTarget(target) {
      if (target === "windows") return CONFIG.windows.symbol;
      return getModeConfig(activeMode).symbol;
    }

    function companyForSymbol(symbol) {
      const match = Object.values(CONFIG).find((item) => item.symbol === symbol);
      return match ? match.company : symbol;
    }

    function fallbackQuote(symbol) {
      const series = FALLBACK_SERIES[symbol] || FALLBACK_SERIES.NVDA;
      const price = series[series.length - 1];
      const previous = series[0];
      const change = price - previous;
      return {
        symbol,
        company: companyForSymbol(symbol),
        price,
        change,
        percent: previous ? (change / previous) * 100 : 0,
        points: series,
        source: "Preview",
        updated: null,
      };
    }

    function storeCache(symbol, quote) {
      cache[symbol] = { ...quote, fetchedAt: Date.now() };
      try { window.localStorage.setItem("portfolio-stock-" + symbol, JSON.stringify(cache[symbol])); } catch (_) {}
    }

    function readStoredCache(symbol) {
      if (cache[symbol]) return cache[symbol];
      try {
        const raw = window.localStorage.getItem("portfolio-stock-" + symbol);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Number.isFinite(parsed.price) || !Array.isArray(parsed.points)) return null;
        cache[symbol] = parsed;
        return parsed;
      } catch (_) {
        return null;
      }
    }

    async function fetchText(url) {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    }

    function yahooReaderUrl(symbol) {
      return "https://r.jina.ai/http://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(symbol) + "?range=1d&interval=5m";
    }

    function parseReaderJson(text) {
      const start = text.indexOf("{\"chart\"");
      const end = text.lastIndexOf("}");
      if (start < 0 || end <= start) throw new Error("missing reader json");
      return JSON.parse(text.slice(start, end + 1));
    }

    async function fetchYahoo(symbol) {
      return parseYahoo(symbol, parseReaderJson(await fetchText(yahooReaderUrl(symbol))), "Yahoo via Jina");
    }

    function parseYahoo(symbol, json, source) {
      const result = json && json.chart && json.chart.result && json.chart.result[0];
      if (!result) throw new Error("missing quote");
      const meta = result.meta || {};
      const quote = result.indicators && result.indicators.quote && result.indicators.quote[0];
      const closes = (quote && quote.close ? quote.close : []).filter((value) => Number.isFinite(value));
      const points = closes.length >= 4 ? closes.slice(-48) : fallbackQuote(symbol).points;
      const price = Number.isFinite(meta.regularMarketPrice) ? meta.regularMarketPrice : points[points.length - 1];
      const previous = Number.isFinite(meta.chartPreviousClose)
        ? meta.chartPreviousClose
        : (Number.isFinite(meta.previousClose) ? meta.previousClose : points[0]);
      const change = price - previous;
      return {
        symbol,
        company: meta.shortName || meta.longName || companyForSymbol(symbol),
        price,
        change,
        percent: previous ? (change / previous) * 100 : 0,
        points,
        source,
        updated: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
      };
    }

    function quoteFor(symbol) {
      return readStoredCache(symbol) || fallbackQuote(symbol);
    }

    function formatPrice(value) {
      return "$" + value.toFixed(value >= 100 ? 2 : 3);
    }

    function formatChange(quote) {
      const sign = quote.change >= 0 ? "+" : "";
      return sign + quote.percent.toFixed(2) + "%";
    }

    function formatUpdated(quote) {
      if (!quote.updated) return "Live API unavailable";
      const date = new Date(quote.updated);
      return "Updated " + date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    function toPolyline(values, width, height, pad) {
      const safe = values.filter((value) => Number.isFinite(value));
      if (!safe.length) return "";
      const min = Math.min(...safe);
      const max = Math.max(...safe);
      const range = max - min || 1;
      const span = Math.max(safe.length - 1, 1);
      return safe.map((value, index) => {
        const x = pad + ((width - pad * 2) * index) / span;
        const y = height - pad - ((value - min) / range) * (height - pad * 2);
        return x.toFixed(1) + "," + y.toFixed(1);
      }).join(" ");
    }

    function updateWidget(target, quote) {
      $$("[data-stock-trigger][data-stock-target='" + target + "']").forEach((trigger) => {
        const down = quote.change < 0;
        trigger.classList.toggle("stock-is-down", down);
        trigger.setAttribute("aria-label", quote.symbol + " Stock " + formatPrice(quote.price) + " " + formatChange(quote));

        const symbol = $("[data-stock-symbol]", trigger);
        const change = $("[data-stock-change]", trigger);
        const tooltip = $("[data-stock-tooltip]", trigger);
        if (symbol) symbol.textContent = quote.symbol;
        if (change) {
          change.textContent = formatChange(quote);
          change.classList.toggle("is-down", down);
        }
        if (tooltip) tooltip.textContent = quote.symbol + " " + formatPrice(quote.price) + " " + formatChange(quote);
        $$("[data-stock-sparkline]", trigger).forEach((line) => {
          line.setAttribute("points", toPolyline(quote.points, 64, 32, 4));
        });
      });
    }

    function renderTarget(target) {
      updateWidget(target, quoteFor(symbolForTarget(target)));
    }

    function renderPopover(symbol) {
      const popover = $("[data-stock-popover]");
      if (!popover || !symbol) return;
      const quote = quoteFor(symbol);
      const down = quote.change < 0;
      popover.classList.toggle("stock-is-down", down);
      const title = $("[data-stock-popover-title]", popover);
      const price = $("[data-stock-price]", popover);
      const change = $("[data-stock-detail-change]", popover);
      const company = $("[data-stock-company]", popover);
      const updated = $("[data-stock-updated]", popover);
      const source = $("[data-stock-source]", popover);
      const line = $("[data-stock-detail-line]", popover);
      if (title) title.textContent = quote.symbol;
      if (price) price.textContent = formatPrice(quote.price);
      if (change) {
        change.textContent = (quote.change >= 0 ? "+" : "") + quote.change.toFixed(2) + " (" + formatChange(quote) + ")";
        change.classList.toggle("is-down", down);
      }
      if (company) company.textContent = quote.company;
      if (updated) updated.textContent = formatUpdated(quote);
      if (source) source.textContent = quote.source;
      if (line) line.setAttribute("points", toPolyline(quote.points, 320, 128, 10));
    }

    function positionPopover(trigger) {
      const popover = $("[data-stock-popover]");
      if (!popover) return;
      const rect = trigger.getBoundingClientRect();
      const width = popover.offsetWidth || 340;
      const height = popover.offsetHeight || 245;
      const left = clamp(rect.left + rect.width / 2, width / 2 + 12, window.innerWidth - width / 2 - 12);
      let top = rect.top - height - 14;
      if (top < 58) top = rect.bottom + 14;
      top = clamp(top, 58, window.innerHeight - height - 12);
      popover.style.left = left.toFixed(1) + "px";
      popover.style.top = top.toFixed(1) + "px";
      popover.style.bottom = "auto";
    }

    function openPopover(trigger) {
      const popover = $("[data-stock-popover]");
      if (!popover) return;
      const symbol = symbolForTarget(trigger.dataset.stockTarget || "dock");
      activePopoverSymbol = symbol;
      renderPopover(symbol);
      positionPopover(trigger);
      popover.classList.add("is-open");
      popover.setAttribute("aria-hidden", "false");
      refreshSymbol(symbol);
    }

    function closePopover() {
      const popover = $("[data-stock-popover]");
      if (!popover) return;
      popover.classList.remove("is-open");
      popover.setAttribute("aria-hidden", "true");
      activePopoverSymbol = null;
    }

    async function refreshSymbol(symbol) {
      renderTarget("dock");
      renderTarget("windows");
      try {
        const quote = await fetchYahoo(symbol);
        storeCache(symbol, quote);
      } catch (_) {
        if (!readStoredCache(symbol)) storeCache(symbol, fallbackQuote(symbol));
      }
      renderTarget("dock");
      renderTarget("windows");
      if (activePopoverSymbol === symbol) renderPopover(symbol);
    }

    function refreshVisible() {
      const symbols = new Set([symbolForTarget("dock"), CONFIG.windows.symbol]);
      symbols.forEach((symbol) => refreshSymbol(symbol));
    }

    function setMode(mode) {
      activeMode = mode === "windows" || mode === "nvidia" || mode === "macos" ? mode : "macos";
      closePopover();
      renderTarget("dock");
      renderTarget("windows");
      refreshVisible();
    }

    function summary() {
      return Object.values(CONFIG).map((item) => {
        const quote = quoteFor(item.symbol);
        return item.symbol + "  " + formatPrice(quote.price) + "  " + formatChange(quote) + "  " + quote.source;
      });
    }

    function init() {
      const inferred = document.body.classList.contains("theme-dgx")
        ? "nvidia"
        : (document.body.classList.contains("theme-windows-only") ? "windows" : "macos");
      setMode(inferred);
      $$("[data-stock-trigger]").forEach((trigger) => {
        trigger.addEventListener("click", (e) => {
          e.stopPropagation();
          const popover = $("[data-stock-popover]");
          if (popover && popover.classList.contains("is-open") && activePopoverSymbol === symbolForTarget(trigger.dataset.stockTarget || "dock")) {
            closePopover();
          } else {
            openPopover(trigger);
          }
        });
      });
      document.addEventListener("pointerdown", (e) => {
        const popover = $("[data-stock-popover]");
        if (!popover || !popover.classList.contains("is-open")) return;
        if (popover.contains(e.target) || e.target.closest("[data-stock-trigger]")) return;
        closePopover();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closePopover();
      });
      window.addEventListener("resize", closePopover);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) refreshVisible();
      });
      refreshTimer = window.setInterval(refreshVisible, 120000);
    }

    return { init, setMode, summary };
  })();

  function taskbarPlacement() {
    const taskbar = $(".windows-taskbar");
    const dockEl = $(".dock");
    const edges = ["bottom", "left", "right"];
    const contextMenu = document.createElement("div");
    contextMenu.className = "taskbar-context-menu";
    contextMenu.setAttribute("role", "menu");
    contextMenu.innerHTML = edges.map((edge) => (
      "<button type='button' role='menuitem' data-edge='" + edge + "'>" +
      edge.charAt(0).toUpperCase() + edge.slice(1) +
      "</button>"
    )).join("");
    document.body.appendChild(contextMenu);

    function setEdge(kind, edge) {
      const next = edges.includes(edge) ? edge : "bottom";
      const prefix = kind === "windows" ? "taskbar-" : "dock-";
      edges.forEach((item) => document.body.classList.remove(prefix + item));
      document.body.classList.add(prefix + next);
      try { window.localStorage.setItem("portfolio-" + kind + "-edge", next); } catch (_) {}
    }

    function getEdge(kind) {
      try { return window.localStorage.getItem("portfolio-" + kind + "-edge") || "bottom"; }
      catch (_) { return "bottom"; }
    }

    function closeMenu() {
      contextMenu.classList.remove("is-open");
      contextMenu.removeAttribute("data-kind");
    }

    function openMenu(e, kind) {
      if (isMobile()) return;
      e.preventDefault();
      const activeEdge = getEdge(kind);
      contextMenu.dataset.kind = kind;
      $$("button", contextMenu).forEach((button) => {
        button.classList.toggle("is-active", button.dataset.edge === activeEdge);
      });
      const menuW = 156;
      const menuH = 132;
      const left = clamp(e.clientX, 10, window.innerWidth - menuW - 10);
      const top = clamp(e.clientY, 10, window.innerHeight - menuH - 10);
      contextMenu.style.left = left + "px";
      contextMenu.style.top = top + "px";
      contextMenu.classList.add("is-open");
    }

    function activeDockKind(mode = currentOsMode) {
      return mode === "macos" ? "macos" : "nvidia";
    }

    function applyPlacementForMode(mode = currentOsMode) {
      setEdge("windows", getEdge("windows"));
      setEdge(activeDockKind(mode), getEdge(activeDockKind(mode)));
    }

    applyPlacementForMode();
    window.addEventListener("portfolio:os-mode", (e) => applyPlacementForMode(e.detail && e.detail.mode));

    if (taskbar) {
      taskbar.addEventListener("contextmenu", (e) => {
        if (!document.body.classList.contains("theme-windows-only")) return;
        openMenu(e, "windows");
      });
    }
    if (dockEl) {
      dockEl.addEventListener("contextmenu", (e) => {
        if (document.body.classList.contains("theme-dgx")) {
          openMenu(e, "nvidia");
          return;
        }
        if (document.body.classList.contains("theme-mac-only")) {
          openMenu(e, "macos");
        }
      });
    }

    contextMenu.addEventListener("click", (e) => {
      const button = e.target.closest("[data-edge]");
      if (!button) return;
      setEdge(contextMenu.dataset.kind || "windows", button.dataset.edge);
      closeMenu();
    });

    document.addEventListener("pointerdown", (e) => {
      if (!contextMenu.classList.contains("is-open") || contextMenu.contains(e.target)) return;
      closeMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
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
    $$("[data-action]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        runSystemAction(el.dataset.action);
      });
    });
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.code === "Space") {
        e.preventDefault();
        if (currentOsMode === "nvidia") COMMAND_PALETTE.open();
        else UNIVERSAL_SEARCH.open(currentOsMode === "macos" ? "spotlight" : "windows");
        return;
      }
      if (e.key === "F3") {
        e.preventDefault();
        MISSION.open();
        return;
      }
      if (e.key !== "Escape") return;
      if (closeSystemOverlays()) return;
      if ($(".lb-overlay")) return; // overlay open: let lightbox() handle Escape
      const f = $(".win.is-focused.is-open");
      if (f) WM.minimize(f.dataset.app);
    });
  }

  function runSystemAction(action) {
    if (action === "mission") MISSION.open();
    else if (action === "launcher") APP_LAUNCHER.open();
    else if (action === "command-palette") {
      if (currentOsMode === "nvidia") COMMAND_PALETTE.open();
      else UNIVERSAL_SEARCH.open(currentOsMode === "windows" ? "windows" : "spotlight");
    }
    else if (action === "diagnostics") {
      WM.open("diagnostics");
      notify("Diagnostics", "Fabric telemetry is live.");
    } else if (action === "demo") startProjectDemo();
  }

  function closeSystemOverlays() {
    const before = $$(".mission-control.is-open, .universal-search.is-open, .app-launcher.is-open, .command-palette.is-open").length;
    MISSION.close();
    UNIVERSAL_SEARCH.close();
    APP_LAUNCHER.close();
    COMMAND_PALETTE.close();
    return before > 0;
  }

  function searchRows(items, query, mode = currentOsMode) {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const label = item.title || appTitle(item.id, mode);
      const haystack = (label + " " + (item.desc || "") + " " + (item.id || "") + " " + (item.keywords || "")).toLowerCase();
      return !needle || haystack.includes(needle);
    });
  }

  function rowMarkup(item, mode = currentOsMode) {
    const label = item.title || appTitle(item.id, mode);
    return "<button class='search-result-row' type='button' data-id='" + (item.id || "") + "' data-action-name='" + (item.action || "app") + "'>" +
      iconUse(item.icon || "i-grid") +
      "<div><b>" + escapePlain(label) + "</b><span>" + escapePlain(item.desc || appDescription(item.id)) + "</span></div>" +
      "</button>";
  }

  const MISSION = (function () {
    let el, grid;
    function init() {
      el = $("[data-mission-control]");
      grid = $("[data-mission-grid]", el || document);
      if (!el || !grid) return;
      $$("[data-overlay-close]", el).forEach((button) => button.addEventListener("click", close));
      el.addEventListener("pointerdown", (e) => { if (e.target === el) close(); });
      grid.addEventListener("click", (e) => {
        const card = e.target.closest("[data-app]");
        if (!card) return;
        WM.open(card.dataset.app);
        close();
      });
    }
    function render() {
      if (!grid) return;
      const wins = $$(".win.is-open:not(.is-min)").map((win) => ({
        id: win.dataset.app,
        title: appTitle(win.dataset.app),
        desc: appDescription(win.dataset.app) || "Open pane",
      }));
      if (!wins.length) {
        grid.innerHTML = "<button class='mission-card' type='button' data-app='about'><div class='mini-window'></div><b>No open panes</b><span>Open About to begin.</span></button>";
        const count = $("[data-mission-count]");
        if (count) count.textContent = "No open windows";
        return;
      }
      const count = $("[data-mission-count]");
      if (count) count.textContent = wins.length + " open window" + (wins.length === 1 ? "" : "s");
      grid.innerHTML = wins.map((win) => (
        "<button class='mission-card' type='button' data-app='" + win.id + "'>" +
        "<div class='mini-window'></div><b>" + escapePlain(win.title) + "</b><span>" + escapePlain(win.desc) + "</span></button>"
      )).join("");
    }
    function open() {
      if (!el) return;
      closeSystemOverlays();
      render();
      el.classList.add("is-open");
      el.setAttribute("aria-hidden", "false");
      notify("Mission Control", "Showing active panes.");
    }
    function close() {
      if (!el) return;
      el.classList.remove("is-open");
      el.setAttribute("aria-hidden", "true");
    }
    return { init, open, close };
  })();

  const UNIVERSAL_SEARCH = (function () {
    let el, input, results, variant = "spotlight";
    const actions = [
      { id: "mission", title: "Mission Control", desc: "Show all open panes", icon: "i-grid", action: "mission", keywords: "expose overview task view" },
      { id: "launcher", title: "Launchpad", desc: "Open the app launcher", icon: "i-rocket", action: "launcher", keywords: "start apps" },
      { id: "demo", title: "Project Demo Mode", desc: "Walk through the portfolio", icon: "i-award", action: "demo", keywords: "presentation tour" },
    ];
    function init() {
      el = $("[data-universal-search]");
      input = $("[data-universal-search-input]", el || document);
      results = $("[data-universal-search-results]", el || document);
      if (!el || !input || !results) return;
      input.addEventListener("input", render);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
        if (e.key === "Enter") activate($(".search-result-row", results));
      });
      results.addEventListener("click", (e) => activate(e.target.closest(".search-result-row")));
      el.addEventListener("pointerdown", (e) => { if (e.target === el) close(); });
    }
    function allItems() {
      return APP_CATALOG.map((app) => ({ ...app, title: appTitle(app.id, currentOsMode), action: "app" })).concat(actions);
    }
    function render() {
      if (!results) return;
      const rows = searchRows(allItems(), input.value, currentOsMode).slice(0, 8);
      results.innerHTML = rows.map((item) => rowMarkup(item, currentOsMode)).join("");
    }
    function activate(row) {
      if (!row) return;
      const action = row.dataset.actionName;
      const id = row.dataset.id;
      close();
      if (action === "app") WM.open(id);
      else runSystemAction(id);
    }
    function open(nextVariant = "spotlight") {
      if (!el) return;
      closeSystemOverlays();
      variant = nextVariant;
      el.dataset.variant = variant;
      input.placeholder = variant === "windows" ? "Search apps, repos, and settings" : "Spotlight Search";
      input.value = "";
      render();
      el.classList.add("is-open");
      el.setAttribute("aria-hidden", "false");
      window.setTimeout(() => input.focus(), 30);
    }
    function close() {
      if (!el) return;
      el.classList.remove("is-open");
      el.setAttribute("aria-hidden", "true");
    }
    return { init, open, close };
  })();

  const APP_LAUNCHER = (function () {
    let el, grid;
    function init() {
      el = $("[data-app-launcher]");
      grid = $("[data-launcher-grid]", el || document);
      if (!el || !grid) return;
      $$("[data-overlay-close]", el).forEach((button) => button.addEventListener("click", close));
      el.addEventListener("pointerdown", (e) => { if (e.target === el) close(); });
      grid.addEventListener("click", (e) => {
        const tile = e.target.closest("[data-app]");
        if (!tile) return;
        WM.open(tile.dataset.app);
        notify("App opened", appTitle(tile.dataset.app));
        close();
      });
      render();
      window.addEventListener("portfolio:os-mode", render);
    }
    function render() {
      if (!grid) return;
      const kicker = $("[data-launcher-kicker]");
      const title = $("[data-launcher-title]");
      if (kicker) kicker.textContent = currentOsMode === "windows" ? "Start" : (currentOsMode === "nvidia" ? "App Grid" : "Launchpad");
      if (title) title.textContent = currentOsMode === "nvidia" ? "NVIDIA OS apps" : "Apps";
      grid.innerHTML = APP_CATALOG.map((app) => (
        "<button class='launcher-tile' type='button' data-app='" + app.id + "'>" +
        iconUse(app.icon) +
        "<b>" + escapePlain(appTitle(app.id)) + "</b><span>" + escapePlain(app.desc) + "</span></button>"
      )).join("");
    }
    function open() {
      if (!el) return;
      closeSystemOverlays();
      render();
      el.classList.add("is-open");
      el.setAttribute("aria-hidden", "false");
      notify(currentOsMode === "windows" ? "Start" : "Launchpad", "Choose an app.");
    }
    function close() {
      if (!el) return;
      el.classList.remove("is-open");
      el.setAttribute("aria-hidden", "true");
    }
    return { init, open, close };
  })();

  const COMMAND_PALETTE = (function () {
    let el, input, results;
    const commands = [
      { id: "diagnostics", title: "Open Fabric Diagnostics", desc: "NVLink, thermals, recovery, and rack status", icon: "i-activity", action: "app", keywords: "nvidia health" },
      { id: "gpu", title: "Open GPU Telemetry", desc: "Live GPU gauges", icon: "i-activity", action: "app", keywords: "nvidia smi stats" },
      { id: "github", title: "Open Repo Feed", desc: "Fetch public GitHub activity", icon: "i-github", action: "app", keywords: "repos code" },
      { id: "terminal", title: "Open DGX Shell", desc: "Run terminal commands", icon: "i-terminal", action: "app", keywords: "console shell" },
      { id: "mission", title: "Mission Control", desc: "Show open panes", icon: "i-grid", action: "mission", keywords: "overview" },
      { id: "launcher", title: "Open App Launcher", desc: "Grid of portfolio apps", icon: "i-rocket", action: "launcher", keywords: "apps launchpad" },
      { id: "demo", title: "Run Project Demo", desc: "Sequence the portfolio for presentation", icon: "i-award", action: "demo", keywords: "tour" },
    ];
    function init() {
      el = $("[data-command-palette]");
      input = $("[data-command-input]", el || document);
      results = $("[data-command-results]", el || document);
      if (!el || !input || !results) return;
      input.addEventListener("input", render);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
        if (e.key === "Enter") activate($(".search-result-row", results));
      });
      results.addEventListener("click", (e) => activate(e.target.closest(".search-result-row")));
      el.addEventListener("pointerdown", (e) => { if (e.target === el) close(); });
    }
    function render() {
      if (!results) return;
      const rows = searchRows(commands, input.value, "nvidia").slice(0, 8);
      results.innerHTML = rows.map((item) => rowMarkup(item, "nvidia")).join("");
    }
    function activate(row) {
      if (!row) return;
      const id = row.dataset.id;
      const command = commands.find((item) => item.id === id);
      close();
      if (!command) return;
      if (command.action === "app") WM.open(command.id);
      else runSystemAction(command.id);
    }
    function open() {
      if (!el) return;
      closeSystemOverlays();
      input.value = "";
      render();
      el.classList.add("is-open");
      el.setAttribute("aria-hidden", "false");
      window.setTimeout(() => input.focus(), 30);
    }
    function close() {
      if (!el) return;
      el.classList.remove("is-open");
      el.setAttribute("aria-hidden", "true");
    }
    return { init, open, close };
  })();

  function startProjectDemo() {
    closeSystemOverlays();
    notify("Demo mode", "Sequencing the strongest panes.");
    WM.closeAll();
    const sequence = [
      { id: "about", delay: 160 },
      { id: "projects", delay: 760 },
      { id: "github", delay: 1360 },
      { id: "diagnostics", delay: 1960 },
      { id: "contact", delay: 2560 },
    ];
    sequence.forEach((item) => {
      window.setTimeout(() => {
        WM.open(item.id);
        notify("Demo mode", appTitle(item.id) + " is now in focus.", { ttl: 1800 });
      }, item.delay);
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
  function notify(title, body, options = {}) {
    const stack = $("[data-notification-stack]");
    if (!stack) return toastFallback((body ? title + " — " + body : title));
    const note = document.createElement("div");
    note.className = "notification";
    note.setAttribute("role", "status");
    note.innerHTML = [
      "<strong>" + escapePlain(title) + "</strong>",
      body ? "<span>" + escapePlain(body) + "</span>" : "",
    ].join("");
    stack.appendChild(note);
    requestAnimationFrame(() => note.classList.add("show"));
    const ttl = options.ttl || 3600;
    window.setTimeout(() => note.classList.remove("show"), ttl);
    window.setTimeout(() => note.remove(), ttl + 420);
  }

  function toastFallback(msg) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    window.clearTimeout(t._t);
    t._t = window.setTimeout(() => t.classList.remove("show"), 1800);
  }

  function toast(msg) {
    notify("Portfolio OS", msg, { ttl: 2200 });
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
    const PROFILES = {
      nvidia: {
        menu: () => "GPU " + Math.round(state.util) + "% · " + Math.round(state.temp) + "°C",
        name: "Blackwell <span>RTX</span> GPU",
        sub: "CPU · RTX Spark N1X",
        title: "GPU — nvidia-smi",
        memTotal: 24,
        powerCap: 350,
        clockCap: 2600,
        memLabel: "VRAM",
        tip: "Tip: run <a data-open-app=\"terminal\" href=\"#\">nvidia-smi</a> in the terminal for the classic table view.",
      },
      macos: {
        menu: () => "Wi-Fi · Control Center",
        name: "Apple <span>M4 Pro</span>",
        sub: "Unified GPU · 18-core graphics",
        title: "Graphics — Apple Silicon",
        memTotal: 36,
        powerCap: 95,
        clockCap: 1800,
        memLabel: "Unified Mem",
        tip: "Tip: run <a data-open-app=\"terminal\" href=\"#\">neofetch</a> to view the Apple Silicon profile.",
      },
      windows: {
        menu: () => "ENG · Network",
        name: "DirectX <span>Graphics</span>",
        sub: "Windows 11 · WDDM display adapter",
        title: "Graphics — Task Manager",
        memTotal: 16,
        powerCap: 185,
        clockCap: 2200,
        memLabel: "GPU Memory",
        tip: "Tip: use Windows Search to open Terminal or Projects.",
      },
    };
    function profile() {
      if (document.body.classList.contains("theme-mac-only")) return PROFILES.macos;
      if (document.body.classList.contains("theme-windows-only")) return PROFILES.windows;
      return PROFILES.nvidia;
    }
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
      if (!el) return;
      el.textContent = profile().menu();
    }
    function paintPanel() {
      const win = WM.wins["gpu"];
      if (!win) return;
      const p = profile();
      const title = $(".win-title", win);
      const name = $(".gpu-head .name", win);
      const sub = $(".gpu-sub", win);
      const memLabel = $('[data-g="mem"] .lbl', win);
      const tip = $(".gpu > .lead", win);
      if (title) title.textContent = p.title;
      if (name) name.innerHTML = p.name;
      if (sub) sub.textContent = p.sub;
      if (memLabel) memLabel.textContent = p.memLabel;
      if (tip) tip.innerHTML = p.tip;
      set("util", Math.round(state.util), "%", state.util);
      set("temp", Math.round(state.temp), "°C", (state.temp / 90) * 100);
      set("fan", Math.round(state.fan), "%", state.fan);
      set("power", Math.round(Math.min(state.power, p.powerCap)), "W", (state.power / p.powerCap) * 100);
      const memUsed = Math.min(state.mem, p.memTotal * 0.92);
      const memEl = $('[data-g="mem"] .num', win);
      if (memEl) memEl.innerHTML = memUsed.toFixed(1) + ' <small>/ ' + p.memTotal + ' GB</small>';
      const memFill = $('[data-g="mem"] .gauge-fill', win);
      if (memFill) memFill.style.width = ((memUsed / p.memTotal) * 100).toFixed(1) + "%";
      const clk = $('[data-g="clock"] .num', win);
      if (clk) clk.innerHTML = Math.round(Math.min(state.clock, p.clockCap)) + ' <small>MHz</small>';
      const clkFill = $('[data-g="clock"] .gauge-fill', win);
      if (clkFill) clkFill.style.width = ((state.clock / p.clockCap) * 100).toFixed(1) + "%";
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
    return { start, refreshMenubar: () => { paintMenubar(); paintPanel(); }, snapshot: () => ({ ...state, memTotal: profile().memTotal }) };
  })();

  const GITHUB_APP = (function () {
    const fallbackRepos = [
      { name: "AI-Powered-Disease-Detection-in-X-Ray-Images", html_url: "https://github.com/osu/AI-Powered-Disease-Detection-in-X-Ray-Images", stargazers_count: 0, language: "Python", description: "Deep-learning model for X-ray disease detection." },
      { name: "Spotify-Top-Songs-2021-Data-Analysis", html_url: "https://github.com/osu/Spotify-Top-Songs-2021-Data-Analysis", stargazers_count: 0, language: "SQL", description: "Analysis notebook and SQL pipeline for music data." },
      { name: "Beartracks", html_url: "https://github.com/osu/Beartracks", stargazers_count: 0, language: "Python", description: "Mini timetable management app." },
      { name: "Maze-Pathfinder", html_url: "https://github.com/osu/Maze-Pathfinder", stargazers_count: 0, language: "JavaScript", description: "Visual pathfinding project." },
    ];
    let loading = false;
    let loadedAt = 0;

    function topLanguage(repos) {
      const counts = repos.reduce((acc, repo) => {
        if (!repo.language) return acc;
        acc[repo.language] = (acc[repo.language] || 0) + 1;
        return acc;
      }, {});
      return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || "Mixed";
    }

    function render(repos, source) {
      const list = $("[data-github-repos-list]");
      const reposEl = $("[data-github-repos]");
      const starsEl = $("[data-github-stars]");
      const langEl = $("[data-github-lang]");
      if (!list) return;
      const stars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
      if (reposEl) reposEl.textContent = String(repos.length);
      if (starsEl) starsEl.textContent = String(stars);
      if (langEl) langEl.textContent = topLanguage(repos);
      list.innerHTML = repos.slice(0, 6).map((repo) => (
        "<a class='github-repo' href='" + escapePlain(repo.html_url) + "' target='_blank' rel='noopener'>" +
        "<b>" + escapePlain(repo.name) + "</b>" +
        "<span>" + escapePlain(repo.description || "Public repository") + "</span>" +
        "<em>" + escapePlain(repo.language || "Code") + " · ★ " + (repo.stargazers_count || 0) + "</em>" +
        "</a>"
      )).join("") + "<p class='lead' style='font-size:.74rem;margin-top:8px'>Source: " + escapePlain(source) + "</p>";
    }

    async function refresh(force = false) {
      if (loading) return;
      if (!force && loadedAt && Date.now() - loadedAt < 180000) return;
      loading = true;
      try {
        const res = await fetch("https://api.github.com/users/osu/repos?sort=updated&per_page=24", { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const repos = (await res.json())
          .filter((repo) => !repo.fork)
          .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0) || new Date(b.updated_at) - new Date(a.updated_at));
        render(repos.length ? repos : fallbackRepos, "GitHub API");
        loadedAt = Date.now();
      } catch (_) {
        render(fallbackRepos, "offline fallback");
        loadedAt = Date.now();
      } finally {
        loading = false;
      }
    }

    function init() {
      const win = WM.wins["github"];
      if (!win) return;
      const obs = new MutationObserver(() => {
        if (win.classList.contains("is-open") && !win.classList.contains("is-min")) refresh();
      });
      obs.observe(win, { attributes: true, attributeFilter: ["class"] });
    }

    return { init, refresh };
  })();

  const DIAGNOSTICS = (function () {
    let tick = 0;
    const logLines = [
      "nvlink lane check completed",
      "fan curve adjusted inside target range",
      "recovery watchdog heartbeat received",
      "thermal headroom stable",
      "rack fabric packet loss below threshold",
      "display compositor latency nominal",
    ];

    function setDiag(key, value) {
      const el = $("[data-diag='" + key + "']");
      if (el) el.textContent = value;
    }

    function refresh() {
      tick += 1;
      const util = GPU.snapshot();
      setDiag("nvlink", tick % 7 === 0 ? "Retiming" : "OK");
      setDiag("thermals", Math.round(util.temp) + "°C");
      setDiag("recovery", tick % 5 === 0 ? "Checkpoint" : "Idle");
      setDiag("rack", (99.91 + Math.random() * 0.08).toFixed(2) + "%");

      const log = $(".diag-log");
      if (log && tick % 2 === 0) {
        const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const line = document.createElement("div");
        line.innerHTML = "<b>" + now + "</b><span>" + escapePlain(logLines[tick % logLines.length]) + "</span><em>pass</em>";
        log.prepend(line);
        while (log.children.length > 8) log.lastElementChild.remove();
      }
    }

    function init() {
      window.setInterval(() => {
        const win = WM.wins["diagnostics"];
        if (win && win.classList.contains("is-open") && !win.classList.contains("is-min")) refresh();
      }, 2200);
    }

    return { init, refresh };
  })();

  /* =============================================================
     TERMINAL
     ============================================================= */
  const TERM = (function () {
    let out, input, promptEl, win, hist = [], hi = -1, bootedMode = "", pythonMode = false;
    let mode = "nvidia";

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

    const MAC_FETCH = [
      "        <span class='green'>.:'</span>          <span class='cmd'>hasan@MacBook-Pro</span>",
      "    <span class='green'>__ :'__</span>        --------------------",
      " <span class='green'>.'`__`-'__``.</span>     <span class='green'>OS</span>      macOS 15 Sequoia",
      "<span class='green'>:__________.-'</span>    <span class='green'>Host</span>    MacBook Pro",
      "<span class='green'>:_________:</span>       <span class='green'>Chip</span>    Apple M4 Pro",
      " <span class='green'>:_________`-;</span>     <span class='green'>Shell</span>   zsh",
      "  <span class='green'>`.__.-.__.'</span>       <span class='green'>GPU</span>     Apple integrated graphics",
    ];

    const WINDOWS_FETCH = [
      "<span class='green'>Windows 11 Pro</span>",
      "----------------",
      "<span class='green'>Host</span>    Hasan-PC",
      "<span class='green'>Shell</span>   PowerShell 7.6.3",
      "<span class='green'>CPU</span>     modern x64 workstation",
      "<span class='green'>GPU</span>     DirectX 12 graphics",
    ];

    const PROFILES = {
      nvidia: {
        title: "hasan@dgx-os: ~",
        prompt: "hasan@dgx-os:~$",
        commandPrompt: "hasan@dgx-os:~$",
        welcome: () => [...NEOFETCH, "", "<span class='dim'>Type <span class='green'>help</span> to get started, or <span class='green'>open projects</span> to explore.</span>", ""],
      },
      macos: {
        title: "Terminal — zsh",
        prompt: "➜  ~",
        commandPrompt: "➜  ~",
        welcome: () => ["Last login: Sun Jun 21 16:53:33 on ttys010", ""],
      },
      windows: {
        title: "PowerShell 7.6.3",
        prompt: "PS C:\\Users\\hasan>",
        commandPrompt: "PS C:\\Users\\hasan>",
        welcome: () => ["PowerShell 7.6.3", "Copyright (c) Microsoft Corporation. All rights reserved.", ""],
      },
    };

    const COMMANDS = {
      help() {
        const lines = [
          "<span class='green'>Available commands</span>",
          "  about            who I am",
          "  whoami           short bio",
          "  experience       work history",
          "  skills           languages & tech",
          "  projects         featured projects",
          "  certs            certifications",
          "  contact          how to reach me",
          "  neofetch         system info",
          "  python3          open a tiny Python-style REPL",
          "  python3 -c ...   run print() or basic math",
          "  open &lt;app&gt;       launch an app window",
          "  stocks           AAPL · MSFT · NVDA quotes",
          "  mission          show Mission Control",
          "  launcher         open app launcher",
          "  demo             run project demo mode",
          "  matrix           terminal easter egg",
          "  konami           unlock confetti",
          "  confetti         party mode",
          "  shader           toggle party shaders",
          "  ls               list apps",
          "  date             current date/time",
          "  clear            clear the screen",
          "  help             this menu",
        ];
        if (mode === "nvidia") lines.splice(8, 0, "  nvidia-smi       GPU status table");
        return lines;
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
      stocks() {
        return ["<span class='green'>Market widgets</span>"].concat(STOCK.summary().map((line) => "  " + escapeHtml(line)));
      },
      github() {
        WM.open("github");
        return ["<span class='green'>Opening GitHub Activity.</span>"];
      },
      diagnostics() {
        WM.open("diagnostics");
        return ["<span class='green'>Opening NVIDIA Diagnostics.</span>"];
      },
      mission() {
        MISSION.open();
        return ["<span class='green'>Mission Control online.</span>"];
      },
      launcher() {
        APP_LAUNCHER.open();
        return ["<span class='green'>Launcher opened.</span>"];
      },
      launchpad() {
        APP_LAUNCHER.open();
        return ["<span class='green'>Launchpad opened.</span>"];
      },
      demo() {
        startProjectDemo();
        return ["<span class='green'>Demo mode started.</span>"];
      },
      matrix() {
        const glyphs = "010101 CUDA NVDA AAPL MSFT PY GO TS";
        return ["<span class='green'>CUDA MATRIX ONLINE</span>"].concat(Array.from({ length: 12 }, (_, row) => {
          const chars = Array.from({ length: 38 }, (_, col) => glyphs[(row * 7 + col * 5) % glyphs.length]).join("");
          return "<span class='green'>" + escapeHtml(chars) + "</span>";
        }));
      },
      "nvidia-smi"() {
        if (mode === "macos") return ["zsh: command not found: nvidia-smi"];
        if (mode === "windows") {
          return [
            "<span class='err'>nvidia-smi : The term 'nvidia-smi' is not recognized as a name of a cmdlet, function, script file, or executable program.</span>",
            "<span class='err'>Check the spelling of the name, or if a path was included, verify that the path is correct and try again.</span>",
          ];
        }
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
      neofetch() {
        if (mode === "macos") return MAC_FETCH;
        if (mode === "windows") return WINDOWS_FETCH;
        return NEOFETCH;
      },
      ls() { return ["about  experience  skills  projects  certificates  sideprojects  contact  gpu  github  diagnostics  terminal"]; },
      date() { return [new Date().toString()]; },
      clear() { out.innerHTML = ""; return null; },
      sudo(args, raw) {
        const line = (raw || "").toLowerCase();
        if (line.includes("party") || line.includes("confetti")) {
          window.__portfolioFx?.confetti?.();
          return ["<span class='green'>root access granted.</span>"];
        }
        return ["<span class='err'>hasan is not in the sudoers file. This incident will be reported. 🚓</span>"]; },
      konami() { window.__portfolioFx?.confetti?.(); window.__portfolioFx?.shaderMode?.(true); return ["<span class='green'>KONAMI CODE ACCEPTED</span>"]; },
      confetti() { window.__portfolioFx?.confetti?.(); return ["<span class='green'>Confetti armed.</span>"]; },
      shader() { const on = window.__portfolioFx?.shaderMode?.(); return ["<span class='green'>Shader " + (on ? "on" : "off") + "</span>"]; },
      exit() { return ["<span class='dim'>Nice try — you can't escape the portfolio. Use the dock instead.</span>"]; },
    };

    const APP_ALIASES = {
      about: "about", experience: "experience", work: "experience", exp: "experience",
      skills: "skills", projects: "projects", proj: "projects",
      certs: "certificates", certificates: "certificates",
      contact: "contact", gpu: "gpu", "side": "sideprojects", sideprojects: "sideprojects",
      terminal: "terminal", github: "github", repo: "github", repos: "github",
      diagnostics: "diagnostics", diag: "diagnostics",
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

    function activeProfile() {
      return PROFILES[mode] || PROFILES.nvidia;
    }

    function setPrompt() {
      if (promptEl) promptEl.textContent = pythonMode ? ">>>" : activeProfile().prompt;
    }

    function updateChrome() {
      if (!win) return;
      const profile = activeProfile();
      const title = $(".win-title", win);
      if (title) title.textContent = profile.title;
      win.dataset.title = profile.title;
    }

    function stripPythonString(value) {
      const trimmed = value.trim();
      const quoted = trimmed.match(/^(['"])([\s\S]*)\1$/);
      if (!quoted) return null;
      return quoted[2].replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\(["'\\])/g, "$1");
    }

    function evalPythonExpr(expr) {
      const stringValue = stripPythonString(expr);
      if (stringValue !== null) return stringValue;
      const normalized = expr.replace(/\*\*/g, "^");
      if (/^[\d\s+\-*/%().,^]+$/.test(normalized)) {
        const jsExpr = normalized.replace(/\^/g, "**");
        const result = Function('"use strict"; return (' + jsExpr + ');')();
        if (Number.isFinite(result)) return String(result);
      }
      throw new Error("NameError: name '" + escapeHtml(expr.split(/\W+/)[0] || expr) + "' is not defined");
    }

    function runPythonSnippet(code) {
      const trimmed = code.trim();
      if (!trimmed) return [];
      const printMatch = trimmed.match(/^print\(([\s\S]*)\)$/);
      if (printMatch) {
        try { return [escapeHtml(evalPythonExpr(printMatch[1]))]; }
        catch (err) { return ["<span class='err'>" + err.message + "</span>"]; }
      }
      try { return [escapeHtml(evalPythonExpr(trimmed))]; }
      catch (err) { return ["<span class='err'>" + err.message + "</span>"]; }
    }

    function runPythonCommand(args, raw) {
      const first = (args[0] || "").toLowerCase();
      if (first === "--version" || first === "-v") {
        return ["Python 3.13.0 (portfolio sandbox)"];
      }
      if (first === "-c") {
        const code = raw.replace(/^python3\s+-c\s+/, "").trim();
        return runPythonSnippet(stripPythonString(code) || code);
      }
      if (args.length) return ["<span class='err'>python3: unsupported option in portfolio terminal</span>"];
      pythonMode = true;
      setPrompt();
      return [
        "Python 3.13.0 (portfolio sandbox)",
        "Type <span class='green'>exit()</span> to return to hasansh.",
      ];
    }

    function runPythonRepl(line) {
      if (/^(exit|quit)\(\)$/.test(line)) {
        pythonMode = false;
        setPrompt();
        print("<span class='dim'>Returned to hasansh.</span>");
        return;
      }
      print(runPythonSnippet(line));
    }

    function run(raw) {
      const line = raw.trim();
      const promptText = pythonMode ? ">>>" : activeProfile().commandPrompt;
      print("<span class='term-prompt'>" + promptText + "</span> <span class='cmd'>" + escapeHtml(raw) + "</span>");
      if (!line) return;
      hist.unshift(raw); hi = -1;
      if (pythonMode) {
        runPythonRepl(line);
        return;
      }
      const [cmd, ...args] = line.split(/\s+/);
      const key = cmd.toLowerCase();
      if (key === "python3") { print(runPythonCommand(args, line)); return; }
      if (key === "open") {
        const target = APP_ALIASES[(args[0] || "").toLowerCase()];
        if (target) { WM.open(target); print("<span class='green'>Opening " + escapeHtml(args[0]) + "…</span>"); }
        else print("<span class='err'>open: unknown app '" + escapeHtml(args[0] || "") + "'. Try: ls</span>");
        return;
      }
      if (key === "echo") { print(escapeHtml(args.join(" "))); return; }
      const fn = COMMANDS[key];
      if (fn) print(fn(args, line));
      else print("<span class='err'>command not found: " + escapeHtml(cmd) + "</span> — type <span class='green'>help</span>");
    }

    function escapeHtml(s) { return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

    function welcome() {
      if (bootedMode === mode) return;
      bootedMode = mode;
      print(activeProfile().welcome(), null, true);
    }

    function ensureWelcome() {
      if (!out) return;
      welcome();
      setPrompt();
      if (input) window.setTimeout(() => input.focus(), 60);
    }

    function normalizeMode(next) {
      return next === "macos" || next === "windows" || next === "nvidia" ? next : "nvidia";
    }

    function setMode(next) {
      const normalized = normalizeMode(next);
      const changed = normalized !== mode;
      mode = normalized;
      pythonMode = false;
      updateChrome();
      setPrompt();
      if (changed && out) {
        out.innerHTML = "";
        bootedMode = "";
        welcome();
      }
      if (win && win.classList.contains("is-open") && !win.classList.contains("is-min")) welcome();
    }

    function init() {
      win = WM.wins["terminal"];
      if (!win) return;
      out = $(".term-output", win);
      input = $(".term-input", win);
      promptEl = $(".term-inputline .term-prompt", win);
      if (!out || !input) return;
      setMode(currentOsMode);
      setPrompt();

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
    return { init, setMode, ensureWelcome };
  })();

  /* =============================================================
     SPACE WELLS
     ============================================================= */
  const SPACE_WELLS = (function () {
    const SPEED = 80; // pixels per second
    const GROWTH_PER_SECOND = 0.01;
    const BIG_BANG_DURATION = 22000;
    const IRIS_BLADES = 12;
    const SCREEN_SHATTER_DURATION = 7600;
    const PANEL_SHATTER_DURATION = 6700;
    const PRE_EXPLOSION_PULL_DURATION = 1180;
    const BLAST_DELAY = PRE_EXPLOSION_PULL_DURATION + 420;
    const BIG_BANG_TARGET_SELECTOR = [
      ".desktop-video",
      ".desktop-bg",
      ".desktop-watermark",
      ".menubar",
      ".dock",
      ".windows-taskbar",
      ".win.is-open:not(.is-min)",
      ".toast.show",
    ].join(", ");
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
      window.setTimeout(() => overlay.remove(), SCREEN_SHATTER_DURATION);
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

      const rippleOrigins = [];
      const irisRadius = Math.min(window.innerWidth, window.innerHeight) * 0.46;
      for (let i = 0; i < IRIS_BLADES; i++) {
        const angle = (i / IRIS_BLADES) * Math.PI * 2 - Math.PI / 2;
        rippleOrigins.push({
          x: impactX + Math.cos(angle) * irisRadius,
          y: impactY + Math.sin(angle) * irisRadius,
          petal: i,
        });
      }
      [
        { x: impactX, y: -90 },
        { x: impactX, y: window.innerHeight + 90 },
        { x: -90, y: impactY },
        { x: window.innerWidth + 90, y: impactY },
      ].forEach((origin, offset) => rippleOrigins.push({ ...origin, petal: IRIS_BLADES + offset }));

      rippleOrigins.forEach((origin, index) => {
        const ripple = document.createElement("div");
        const orbitScale = 0.14 + (index % IRIS_BLADES) * 0.018;
        const orbitX = (impactX - origin.x) * orbitScale + (index % 2 ? 64 : -64);
        const orbitY = (impactY - origin.y) * orbitScale + (index % 3 ? -52 : 52);
        ripple.className = "bigbang-green-ripple";
        ripple.style.setProperty("--start-x", origin.x.toFixed(2) + "px");
        ripple.style.setProperty("--start-y", origin.y.toFixed(2) + "px");
        ripple.style.setProperty("--to-x", (impactX - origin.x).toFixed(2) + "px");
        ripple.style.setProperty("--to-y", (impactY - origin.y).toFixed(2) + "px");
        ripple.style.setProperty("--orbit-x", orbitX.toFixed(2) + "px");
        ripple.style.setProperty("--orbit-y", orbitY.toFixed(2) + "px");
        ripple.style.setProperty("--ripple-size", (16 + (index % IRIS_BLADES) * 2.2).toFixed(2) + "vmin");
        ripple.style.setProperty("--delay", (0.12 + index * 0.11).toFixed(2) + "s");
        overlay.appendChild(ripple);
      });

      const iris = document.createElement("div");
      iris.className = "bigbang-iris";
      iris.style.setProperty("--impact-x", impactX.toFixed(2) + "px");
      iris.style.setProperty("--impact-y", impactY.toFixed(2) + "px");

      const irisRing = document.createElement("div");
      irisRing.className = "bigbang-iris-ring";
      iris.appendChild(irisRing);

      for (let i = 0; i < IRIS_BLADES; i++) {
        const angle = (i / IRIS_BLADES) * 360;
        const spoke = document.createElement("div");
        spoke.className = "bigbang-iris-spoke";
        spoke.style.setProperty("--blade-i", String(i));
        spoke.style.setProperty("--blade-angle", angle + "deg");
        iris.appendChild(spoke);

        const blade = document.createElement("div");
        blade.className = "bigbang-iris-blade";
        blade.style.setProperty("--blade-i", String(i));
        blade.style.setProperty("--blade-angle", angle + "deg");
        iris.appendChild(blade);
      }

      const pupil = document.createElement("div");
      pupil.className = "bigbang-iris-pupil";
      iris.appendChild(pupil);
      overlay.appendChild(iris);

      if (typeof IRIS_WEBGL !== "undefined" && IRIS_WEBGL.mount(overlay, impactX, impactY)) {
        iris.classList.add("bigbang-iris--webgl");
        iris.querySelectorAll(".bigbang-iris-blade, .bigbang-iris-spoke").forEach((el) => { el.style.display = "none"; });
      }

      const marketChart = document.createElement("div");
      marketChart.className = "bigbang-market-chart";
      marketChart.style.setProperty("--impact-x", impactX.toFixed(2) + "px");
      marketChart.style.setProperty("--impact-y", impactY.toFixed(2) + "px");
      marketChart.innerHTML = [
        "<svg viewBox='0 0 1000 520' preserveAspectRatio='none' aria-hidden='true'>",
        "<path class='market-grid' d='M40 430H960M40 330H960M40 230H960M40 130H960M120 70V455M320 70V455M520 70V455M720 70V455M920 70V455'/>",
        "<path class='market-ghost-line' pathLength='1000' d='M48 410 C145 398 214 402 282 390 S424 394 508 374 S632 365 706 350 S808 334 860 306 S918 246 958 82'/>",
        "<path class='market-god-line' pathLength='1000' d='M48 410 C145 398 214 402 282 390 S424 394 508 374 S632 365 706 350 S808 334 860 306 S918 246 958 82'/>",
        "<line class='market-god-wick' x1='895' y1='302' x2='895' y2='68'/>",
        "<rect class='market-god-body' x='858' y='126' width='74' height='176' rx='8'/>",
        "<text class='market-god-label' x='724' y='118'>NVDA</text>",
        "</svg>",
      ].join("");
      overlay.appendChild(marketChart);

      const core = document.createElement("div");
      core.className = "bigbang-green-core";
      core.style.setProperty("--impact-x", impactX.toFixed(2) + "px");
      core.style.setProperty("--impact-y", impactY.toFixed(2) + "px");
      overlay.appendChild(core);

      const eye = document.createElement("div");
      eye.className = "bigbang-nvidia-eye";
      eye.style.setProperty("--impact-x", impactX.toFixed(2) + "px");
      eye.style.setProperty("--impact-y", impactY.toFixed(2) + "px");
      eye.innerHTML = "<img src='./assets/images/nvda-eye.png' alt=''>";
      overlay.appendChild(eye);

      const colors = [
        "rgba(255,255,255,0.88)",
        "rgba(185,225,255,0.76)",
        "rgba(118,185,0,0.58)",
        "rgba(210,216,214,0.64)",
      ];
      const particleCount = Math.min(180, Math.max(96, Math.floor((window.innerWidth * window.innerHeight) / 11000)));
      const maxTravel = Math.hypot(window.innerWidth, window.innerHeight) * 0.86;
      for (let i = 0; i < particleCount; i++) {
        const sector = i % IRIS_BLADES;
        const sectorAngle = (sector / IRIS_BLADES) * Math.PI * 2 - Math.PI / 2;
        const jitter = (Math.random() - 0.5) * (Math.PI / IRIS_BLADES) * 0.9;
        const angle = sectorAngle + jitter;
        const travel = maxTravel * (0.22 + Math.random() * 0.78);
        const drift = (Math.random() - 0.5) * 90;
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

    function getBigBangTargets() {
      const targets = $$(BIG_BANG_TARGET_SELECTOR).filter((target) => {
        const rect = target.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      return Array.from(new Set(targets));
    }

    function clearBigBangMotion(target) {
      target.classList.remove("bigbang-target", "bigbang-pulled", "bigbang-blasted", "bigbang-hidden");
      target.style.removeProperty("--bb-base-transform");
      target.style.removeProperty("--bb-pull-x");
      target.style.removeProperty("--bb-pull-y");
      target.style.removeProperty("--bb-blast-x");
      target.style.removeProperty("--bb-blast-y");
      target.style.removeProperty("--bb-rot");
      delete target._bbVector;
    }

    function clearReconstructState(target) {
      target.classList.remove("reconstruct-hidden", "reconstructing");
      target.style.removeProperty("--reconstruct-y");
      target.style.removeProperty("--reconstruct-scale");
    }

    function cleanupBigBangState() {
      $$(".panel-shatter, .cosmic-shatter, .cosmic-bigbang").forEach((node) => node.remove());
      $$(".bigbang-target, .bigbang-pulled, .bigbang-blasted, .bigbang-hidden").forEach(clearBigBangMotion);
      clearWarpClasses();
    }

    function hideForReconstruct(target, y = 14, scale = 0.94) {
      if (!target) return;
      clearReconstructState(target);
      target.style.setProperty("--reconstruct-y", y + "px");
      target.style.setProperty("--reconstruct-scale", scale.toString());
      target.classList.add("reconstruct-hidden");
    }

    function revealForReconstruct(target, delay = 0) {
      if (!target) return;
      window.setTimeout(() => {
        target.classList.remove("reconstruct-hidden");
        target.classList.add("reconstructing");
        window.setTimeout(() => target.classList.remove("reconstructing"), 900);
      }, delay);
    }

    function getBaseTransform(target) {
      const transform = getComputedStyle(target).transform;
      return transform && transform !== "none" ? transform : "translate3d(0, 0, 0)";
    }

    function outwardVector(centerX, centerY, impactX, impactY) {
      const dx = centerX - impactX;
      const dy = centerY - impactY;
      const distance = Math.hypot(dx, dy);
      if (distance >= 1) return { nx: dx / distance, ny: dy / distance };
      const angle = Math.random() * Math.PI * 2;
      return { nx: Math.cos(angle), ny: Math.sin(angle) };
    }

    function pullEverythingToImpact(cx, cy) {
      const deskRect = desk.getBoundingClientRect();
      const impactX = deskRect.left + cx;
      const impactY = deskRect.top + cy;

      clearWarpClasses();
      getBigBangTargets().forEach((target) => {
        clearBigBangMotion(target);
        const rect = target.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        target._bbVector = outwardVector(centerX, centerY, impactX, impactY);
        target.style.setProperty("--bb-base-transform", getBaseTransform(target));
        target.style.setProperty("--bb-pull-x", ((impactX - centerX) * 0.9).toFixed(2) + "px");
        target.style.setProperty("--bb-pull-y", ((impactY - centerY) * 0.9).toFixed(2) + "px");
        target.classList.add("bigbang-target", "bigbang-pulled");
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
      window.setTimeout(() => overlay.remove(), PANEL_SHATTER_DURATION);
    }

    function blastEverythingFromImpact() {
      getBigBangTargets().forEach((target) => {
        const vector = target._bbVector || { nx: Math.random() > 0.5 ? 1 : -1, ny: Math.random() > 0.5 ? 1 : -1 };
        const rect = target.getBoundingClientRect();
        const blast = Math.max(window.innerWidth, window.innerHeight) * 0.9 + Math.random() * 260;
        const blastX = vector.nx * blast;
        const blastY = vector.ny * blast;
        const finalLeft = rect.left + blastX;
        const finalRight = rect.right + blastX;
        const finalTop = rect.top + blastY;
        const finalBottom = rect.bottom + blastY;
        const hitWall = finalLeft < 0 || finalRight > window.innerWidth || finalTop < 0 || finalBottom > window.innerHeight;

        target.style.setProperty("--bb-blast-x", blastX.toFixed(2) + "px");
        target.style.setProperty("--bb-blast-y", blastY.toFixed(2) + "px");
        target.style.setProperty("--bb-rot", ((Math.random() - 0.5) * 28).toFixed(2) + "deg");
        target.classList.remove("bigbang-pulled");
        target.classList.add("bigbang-blasted");

        if (hitWall) {
          window.setTimeout(() => {
            createPanelShatter(target.getBoundingClientRect(), vector.nx, vector.ny);
            target.classList.add("bigbang-hidden");
          }, 1250);
        }
      });
    }

    function closePanelsForReconstruct() {
      $$(".win").forEach((panel) => {
        clearReconstructState(panel);
        panel.classList.remove("is-open", "is-focused", "is-min", "is-max");
        panel.style.removeProperty("transform");
        panel.style.removeProperty("filter");
      });
      const label = $("#mb-app");
      if (label) label.textContent = desktopAppName();
      WM.syncDock();
    }

    function dismissSpaceWells() {
      const black = $("#blackhole");
      const white = $("#whitehole");
      const grey = $("#greyhole");
      if (black) black.classList.add("is-collapsed");
      if (white) white.classList.add("is-collapsed");
      if (grey) {
        grey.classList.remove("is-formed", "is-active");
        grey.style.removeProperty("--gh-x");
        grey.style.removeProperty("--gh-y");
      }
      wells = [];
    }

    function restoreStartupWindowsStaged(startDelay) {
      const startup = isMobile()
        ? [{ id: "about", delay: startDelay }]
        : [
          { id: "gpu", left: "60px", top: "30px", delay: startDelay },
          { id: "about", left: "94px", top: "60px", delay: startDelay + 360 },
        ];

      startup.forEach((item) => {
        const win = WM.wins[item.id];
        if (!win) return;
        if (item.left) win.style.left = item.left;
        if (item.top) win.style.top = item.top;
        hideForReconstruct(win, 18, 0.96);
        window.setTimeout(() => {
          WM.open(item.id);
          revealForReconstruct(win, 0);
        }, item.delay);
      });
    }

    function reconstructScene() {
      switchToDgxTheme();
      cleanupBigBangState();
      closePanelsForReconstruct();

      const backgrounds = $$(".desktop-video, .desktop-bg, .desktop-watermark");
      const menubar = $(".menubar");
      const brand = $$(".menubar-logo, .menubar-os");
      const topContents = $$(".menubar-app, .menubar-stat, .mb-sep, .menubar-date, .menubar-clock");
      const dock = $(".dock");
      const dockInner = $(".dock-inner");
      const dockContents = $$(".dock-item, .dock-sep");

      backgrounds.forEach((target) => hideForReconstruct(target, 20, 0.985));
      brand.forEach((target) => hideForReconstruct(target, 11, 0.9));
      topContents.forEach((target) => hideForReconstruct(target, 10, 0.92));
      dockContents.forEach((target) => hideForReconstruct(target, 14, 0.86));

      if (menubar) menubar.classList.add("reconstruct-shell-muted");
      if (dock) dock.classList.add("reconstruct-shell-muted");

      backgrounds.forEach((target, index) => revealForReconstruct(target, 140 + index * 150));
      brand.forEach((target, index) => revealForReconstruct(target, 900 + index * 130));

      window.setTimeout(() => {
        if (!menubar) return;
        menubar.classList.remove("reconstruct-shell-muted");
        menubar.classList.add("reconstructing");
        window.setTimeout(() => menubar.classList.remove("reconstructing"), 900);
      }, 1420);

      topContents.forEach((target, index) => revealForReconstruct(target, 1900 + index * 110));

      window.setTimeout(() => {
        if (dock) dock.classList.remove("reconstruct-shell-muted");
        if (!dockInner) return;
        dockInner.classList.add("reconstructing");
        window.setTimeout(() => dockInner.classList.remove("reconstructing"), 900);
      }, 2760);

      dockContents.forEach((target, index) => revealForReconstruct(target, 3260 + index * 85));
      restoreStartupWindowsStaged(3260 + dockContents.length * 85 + 520);
    }

    function triggerCollision(black, white) {
      if (collisionDone) return;
      collisionDone = true;

      const cx = (black.cx + white.cx) / 2;
      const cy = (black.cy + white.cy) / 2;

      dismissSpaceWells();
      pullEverythingToImpact(cx, cy);
      window.dispatchEvent(new CustomEvent("portfolio:iris-bang"));
      window.setTimeout(() => {
        createShatterOverlay(cx, cy);
        createBigBangOverlay(cx, cy);
      }, PRE_EXPLOSION_PULL_DURATION);
      window.setTimeout(blastEverythingFromImpact, BLAST_DELAY);
      window.setTimeout(reconstructScene, PRE_EXPLOSION_PULL_DURATION + BIG_BANG_DURATION);
    }

    function checkCollision() {
      if (collisionDone) return false;
      const black = wells.find((well) => well.id === "blackhole");
      const white = wells.find((well) => well.id === "whitehole");
      if (!black || !white) return false;

      const distance = Math.hypot(black.cx - white.cx, black.cy - white.cy);
      const threshold = Math.max(12, black.size * 0.1 + white.size * 0.11);
      if (distance > threshold) return false;

      triggerCollision(black, white);
      return true;
    }

    function repelBlackHole(dt) {
      const black = wells.find((well) => well.id === "blackhole");
      const white = wells.find((well) => well.id === "whitehole");
      if (!black || !white) return;

      const dx = black.cx - white.cx;
      const dy = black.cy - white.cy;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const influence = (black.size + white.size) * 0.16;
      if (distance > influence) return;

      const strength = Math.pow(1 - distance / influence, 2);
      const nx = dx / distance;
      const ny = dy / distance;
      const acceleration = 0.8 * strength;
      black.vx += nx * acceleration * dt;
      black.vy += ny * acceleration * dt;

      const overlap = (black.size + white.size) * 0.035 - distance;
      if (overlap > 0) {
        black.cx += nx * overlap * 0.035;
        black.cy += ny * overlap * 0.035;
      }

      const speed = Math.max(Math.hypot(black.vx, black.vy), 1);
      const clampedSpeed = clamp(speed, SPEED * 0.88, SPEED * 1.22);
      black.vx = (black.vx / speed) * clampedSpeed;
      black.vy = (black.vy / speed) * clampedSpeed;
    }

    function steerPrimaryWellsTogether(dt) {
      const black = wells.find((well) => well.id === "blackhole");
      const white = wells.find((well) => well.id === "whitehole");
      if (!black || !white) return;

      const dx = white.cx - black.cx;
      const dy = white.cy - black.cy;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const nx = dx / distance;
      const ny = dy / distance;
      const steer = 0.55 * dt;
      black.vx += nx * steer;
      black.vy += ny * steer;
      white.vx -= nx * steer;
      white.vy -= ny * steer;

      [black, white].forEach((well) => {
        const speed = Math.max(Math.hypot(well.vx, well.vy), 1);
        const clampedSpeed = clamp(speed, SPEED * 0.92, SPEED * 1.18);
        well.vx = (well.vx / speed) * clampedSpeed;
        well.vy = (well.vy / speed) * clampedSpeed;
      });
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
      if (checkCollision()) {
        warpNearby();
        requestAnimationFrame(frame);
        return;
      }
      repelBlackHole(frameDt);
      steerPrimaryWellsTogether(frameDt);
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
  function showKeyboardHints() {
    try {
      if (window.localStorage.getItem("portfolio-kbd-hint") === "1") return;
      window.localStorage.setItem("portfolio-kbd-hint", "1");
    } catch (_) {}
    const isApple = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
    const mod = isApple ? "⌘" : "Ctrl";
    window.setTimeout(() => {
      notify("Shortcuts", mod + "+Space search · F3 task view · Esc minimize", { ttl: 5200 });
    }, isMobile() ? 2400 : 3600);
  }

  function init() {
    // pause the wallpaper video for users who prefer reduced motion
    const bgVideo = $(".desktop-video");
    if (bgVideo && reduceMotion) { bgVideo.removeAttribute("autoplay"); bgVideo.pause(); }
    boot();
    clock();
    WM.init();
    dock();
    osSwitcher();
    currentOsMode = document.body.classList.contains("theme-dgx")
      ? "nvidia"
      : (document.body.classList.contains("theme-windows-only") ? "windows" : "macos");
    syncAppLabels(currentOsMode);
    windowsSearch();
    MISSION.init();
    UNIVERSAL_SEARCH.init();
    APP_LAUNCHER.init();
    COMMAND_PALETTE.init();
    STOCK.init();
    taskbarPlacement();
    globalHooks();
    skillBars();
    projectFilters();
    lightbox();
    copyHooks();
    GPU.start();
    GITHUB_APP.init();
    DIAGNOSTICS.init();
    TERM.init();
    SPACE_WELLS.init();

    const params = new URLSearchParams(location.search);
    const deepApp = (params.get("app") || location.hash.replace(/^#\/?/, "")).trim().toLowerCase();
    const validApps = ["about", "experience", "skills", "projects", "certificates", "sideprojects", "terminal", "gpu", "github", "diagnostics", "contact"];
    const hasDeepLink = validApps.includes(deepApp);

    // default windows on first load (open About last so it takes focus)
    if (!isMobile()) {
      if (!hasDeepLink) {
        WM.open("gpu");
        WM.open("about");
        window.setTimeout(() => playTaskbarIntro("macos"), 2100);
        window.setTimeout(() => playTaskbarIntro("windows"), 5000);
      } else {
        WM.open(deepApp);
      }
    } else if (!hasDeepLink) {
      WM.open("about");
    } else {
      WM.open(deepApp);
    }
    showKeyboardHints();

    window.__portfolio = {
      openApp(id) { WM.open(id); },
      closeApp(id) { WM.close(id); },
      notify,
      getMode() { return currentOsMode; },
    };
    window.dispatchEvent(new CustomEvent("portfolio:ready"));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
