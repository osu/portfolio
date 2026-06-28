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
    { id: "about", icon: "i-identity", title: "About", desc: "Profile and background", names: { macos: "Finder", windows: "Portfolio Explorer", nvidia: "Identity Node" } },
    { id: "experience", icon: "i-briefcase", title: "Experience", desc: "Work history", names: { macos: "Work Timeline", windows: "Experience", nvidia: "Mission Log" } },
    { id: "skills", icon: "i-cpu", title: "Skills", desc: "Languages and tools", names: { macos: "System Profiler", windows: "Skills", nvidia: "Capability Matrix" } },
    { id: "projects", icon: "i-vault", title: "Asset Vault", desc: "Navigate portfolio artifacts in 3D", names: { macos: "Spatial Finder", windows: "Asset Explorer", nvidia: "Asset Vault" } },
    { id: "certificates", icon: "i-award", title: "Certificates", desc: "Credentials", names: { macos: "Certificates", windows: "Credentials", nvidia: "Trust Store" } },
    { id: "sideprojects", icon: "i-rocket", title: "Side Projects", desc: "Community and experiments", names: { macos: "Side Projects", windows: "Side Projects", nvidia: "Side Quests" } },
    { id: "terminal", icon: "i-terminal", title: "Terminal", desc: "Shell and commands", names: { macos: "Terminal", windows: "PowerShell", nvidia: "DGX Shell" } },
    { id: "gpu", icon: "i-gauge", title: "GPU Stats", desc: "Live graphics telemetry", names: { macos: "Graphics", windows: "Task Manager", nvidia: "GPU Telemetry" } },
    { id: "github", icon: "i-github", title: "GitHub", desc: "Repos and public activity", names: { macos: "GitHub", windows: "GitHub", nvidia: "Repo Feed" } },
    { id: "diagnostics", icon: "i-diagnostics", title: "Diagnostics", desc: "Fabric and recovery status", names: { macos: "Diagnostics", windows: "Diagnostics", nvidia: "Fabric Diagnostics" } },
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
     CINEMATIC LOGIN FLOW
     ============================================================= */
  function setFlowPhase(phase, detail = {}) {
    if (!phase) return;
    document.body.dataset.flowPhase = phase;
    window.dispatchEvent(new CustomEvent("portfolio:flow-phase", {
      detail: { ...detail, phase },
    }));
  }

  function setDesktopLocked(locked) {
    const os = $("#os");
    const skipLink = $(".skip-link");
    document.body.classList.toggle("login-active", locked);
    [os, skipLink].forEach((el) => {
      if (!el) return;
      if (locked) {
        el.setAttribute("aria-hidden", "true");
        el.inert = true;
      } else {
        el.removeAttribute("aria-hidden");
        el.inert = false;
      }
    });
  }

  const LOGIN_FLOW = (function () {
    const authenticatedModes = new Set();
    let active = null;

    function updateClock(overlay) {
      const now = new Date();
      const time = $("[data-login-time]", overlay);
      const date = $("[data-login-date]", overlay);
      if (time) time.textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      if (date) date.textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    }

    function accountMarkup(mode, titleId) {
      const windows = mode === "windows";
      const logo = windows ? "./assets/images/Microsoft_icon.svg.png" : "./assets/images/apple-logo.svg";
      const kicker = windows ? "Windows Hello" : (mode === "macos" ? "macOS Login" : "macOS Secure Login");
      return [
        "<div class='login-lock-clock' aria-hidden='true'>",
        "<time data-login-time>9:41</time><span data-login-date>Friday, June 26</span>",
        "</div>",
        "<div class='login-card'>",
        "<div class='login-avatar' aria-hidden='true'><img src='" + logo + "' alt='' width='58' height='70'></div>",
        "<p class='login-kicker'>" + kicker + "</p>",
        "<h1 class='login-title' id='" + titleId + "'>Hasan Khan</h1>",
        "<label class='login-password-shell'>",
        "<span class='sr-only'>Password is being filled automatically for this visual login sequence</span>",
        "<input class='login-password' type='password' value='' readonly tabindex='-1' autocomplete='off' aria-readonly='true'>",
        "<span class='login-password-icon' aria-hidden='true'>→</span>",
        "</label>",
        "<p class='login-status' data-login-status aria-live='polite'>Preparing automatic sign-in…</p>",
        "<div class='login-progress' aria-hidden='true'><span></span></div>",
        "</div>",
        "<button class='boot-hint login-skip' type='button'>Skip login animation</button>",
      ].join("");
    }

    function irisMarkup(titleId) {
      return [
        "<div class='iris-boot'>",
        "<div class='iris-boot-scanner' aria-hidden='true'>",
        "<div class='iris-boot-housing'></div><div class='iris-boot-blades'></div><div class='iris-boot-scanline'></div>",
        "<img class='iris-boot-pupil' src='./assets/images/nvda-eye-ui.webp' alt='' width='32' height='18'>",
        "</div>",
        "<p class='iris-boot-kicker'>DGX CLEARANCE PROTOCOL</p>",
        "<h1 class='iris-boot-title' id='" + titleId + "'>IRIS VERIFICATION</h1>",
        "<p class='iris-boot-status' data-login-status aria-live='polite'>Initializing optics…</p>",
        "<div class='boot-bar iris-boot-bar'><div class='boot-bar-fill'></div></div>",
        "</div>",
        "<button class='boot-hint login-skip' type='button'>Skip verification</button>",
      ].join("");
    }

    function addIrisBlades(overlay) {
      const bladesHost = $(".iris-boot-blades", overlay);
      if (!bladesHost || bladesHost.childElementCount) return;
      for (let i = 0; i < 12; i++) {
        const blade = document.createElement("div");
        blade.className = "iris-boot-blade";
        blade.style.setProperty("--blade-angle", (i * 30) + "deg");
        bladesHost.appendChild(blade);
      }
    }

    function hasAuthenticated(mode) {
      return authenticatedModes.has(mode);
    }

    function run(mode, options = {}) {
      if (active) return active.promise;

      const initial = Boolean(options.initial);
      const previousFocus = document.activeElement;
      const previousPhase = document.body.dataset.flowPhase || "brand-desktop";
      const overlay = initial ? $("#boot") : document.createElement("div");
      if (!overlay) return Promise.resolve({ mode, skipped: true });

      const titleId = "login-title-" + mode + "-" + Date.now();
      overlay.className = "boot os-login-screen login-screen--" + mode;
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-labelledby", titleId);
      overlay.tabIndex = -1;
      overlay.innerHTML = mode === "iris" ? irisMarkup(titleId) : accountMarkup(mode, titleId);
      if (!initial) document.body.appendChild(overlay);
      if (mode === "iris") addIrisBlades(overlay);
      else updateClock(overlay);

      setDesktopLocked(true);
      if (mode === "iris") setFlowPhase("nvidia-login", { mode: "nvidia" });
      else if (initial) setFlowPhase("apple-lock", { mode: "apple" });
      else setFlowPhase("os-login", { mode });

      let resolveRun;
      const timers = [];
      let progressRaf = 0;
      let finished = false;
      const promise = new Promise((resolve) => { resolveRun = resolve; });
      active = { mode, overlay, promise };

      const schedule = (fn, delay) => {
        const timer = window.setTimeout(fn, delay);
        timers.push(timer);
        return timer;
      };
      const status = $("[data-login-status]", overlay);
      const skipButton = $(".login-skip", overlay);

      function cleanup() {
        timers.forEach(window.clearTimeout);
        window.cancelAnimationFrame(progressRaf);
        document.removeEventListener("keydown", onKeydown);
      }

      function finish(skipped = false) {
        if (finished) return;
        finished = true;
        cleanup();
        if (mode === "iris") {
          const scanner = $(".iris-boot-scanner", overlay);
          const fill = $(".boot-bar-fill", overlay);
          if (scanner) scanner.classList.add("is-scanning", "is-verified");
          if (fill) fill.style.width = "100%";
          if (status) status.textContent = "Identity confirmed · Desktop unlocked";
        } else {
          const input = $(".login-password", overlay);
          if (input && !input.value) input.value = "platform";
          overlay.classList.add("is-filling", "is-authenticating", "is-verified");
          if (status) status.textContent = "Welcome, Hasan";
        }
        overlay.classList.add("is-done");

        schedule(() => {
          if (mode === "windows" || mode === "macos") authenticatedModes.add(mode);
          overlay.remove();
          active = null;
          setDesktopLocked(false);
          if (!initial && mode !== "iris") setFlowPhase(previousPhase, { mode });
          resolveRun({ mode, skipped });
          window.requestAnimationFrame(() => {
            const target = previousFocus && previousFocus.isConnected && !previousFocus.closest(".os-login-screen")
              ? previousFocus
              : ($(".win.is-focused.is-open:not(.is-min)") || $("#desktop"));
            if (target && typeof target.focus === "function") target.focus({ preventScroll: true });
          });
        }, reduceMotion ? 80 : 360);
      }

      function onKeydown(event) {
        if (event.key !== "Escape") return;
        event.preventDefault();
        finish(true);
      }
      document.addEventListener("keydown", onKeydown);
      if (skipButton) {
        skipButton.addEventListener("click", () => finish(true), { once: true });
      }
      overlay.focus({ preventScroll: true });

      if (mode === "iris") {
        const scanner = $(".iris-boot-scanner", overlay);
        const fill = $(".boot-bar-fill", overlay);
        const duration = reduceMotion ? 420 : 2050;
        const startedAt = performance.now();
        const statuses = reduceMotion
          ? [[80, "Verifying clearance…"], [260, "Identity confirmed"]]
          : [[220, "Initializing optics…"], [640, "Scanning biometrics…"], [1120, "Subject: HASAN KHAN"], [1660, "Clearance granted"]];
        statuses.forEach(([delay, message]) => schedule(() => { if (status) status.textContent = message; }, delay));
        if (scanner && !reduceMotion) {
          schedule(() => scanner.classList.add("is-scanning"), 120);
          schedule(() => scanner.classList.add("is-verified"), duration * 0.72);
        }
        const step = (now) => {
          const progress = clamp((now - startedAt) / duration, 0, 1);
          if (fill) fill.style.width = (progress * 100).toFixed(1) + "%";
          if (progress < 1 && !finished) progressRaf = requestAnimationFrame(step);
        };
        progressRaf = requestAnimationFrame(step);
        schedule(() => finish(false), duration + (reduceMotion ? 40 : 180));
      } else {
        const input = $(".login-password", overlay);
        const visualPassword = "platform";
        if (reduceMotion) {
          if (input) input.value = visualPassword;
          overlay.classList.add("is-filling", "is-authenticating", "is-verified");
          if (status) status.textContent = "Welcome, Hasan";
          schedule(() => finish(false), 460);
        } else {
          const typeStart = initial ? 180 : 620;
          const characterDelay = initial ? 45 : 105;
          schedule(() => overlay.classList.add("is-filling"), initial ? 100 : 260);
          visualPassword.split("").forEach((_, index) => {
            schedule(() => {
              if (input) input.value = visualPassword.slice(0, index + 1);
            }, typeStart + index * characterDelay);
          });
          const filledAt = typeStart + visualPassword.length * characterDelay;
          schedule(() => {
            overlay.classList.add("is-authenticating");
            if (status) status.textContent = mode === "windows" ? "Signing in with Windows Hello…" : "Unlocking with Secure Enclave…";
          }, filledAt + (initial ? 70 : 140));
          schedule(() => {
            overlay.classList.add("is-verified");
            if (status) status.textContent = "Welcome, Hasan";
          }, filledAt + (initial ? 230 : 920));
          schedule(() => finish(false), filledAt + (initial ? 430 : 1420));
        }
      }

      return promise;
    }

    return {
      run,
      hasAuthenticated,
      isActive() { return Boolean(active); },
      getAuthenticatedModes() { return Array.from(authenticatedModes); },
    };
  })();

  function boot() {
    return LOGIN_FLOW.run("apple", { initial: true }).then(() => {
      setFlowPhase("brand-desktop", { mode: "split" });
      window.dispatchEvent(new CustomEvent("portfolio:login-complete", { detail: { mode: "apple" } }));
    });
  }

  function syncWallpaperVideo(mode = currentOsMode) {
    const video = $(".desktop-video");
    const source = video && $("source[data-src]", video);
    if (!video) return;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const allowed = mode === "nvidia"
      && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      && !isMobile()
      && !(connection && connection.saveData);
    if (!allowed || document.hidden) {
      video.pause();
      document.body.classList.remove("wallpaper-video-playing");
      return;
    }

    const play = () => video.play().catch(() => {
      document.body.classList.remove("wallpaper-video-playing");
    });
    if (source && !source.src) {
      source.src = source.dataset.src;
      video.preload = "auto";
      video.load();
      video.addEventListener("canplay", play, { once: true });
    }
    play();
  }

  function initWallpaperVideo() {
    const video = $(".desktop-video");
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const start = () => syncWallpaperVideo(currentOsMode);
    if (video) {
      video.addEventListener("playing", () => document.body.classList.add("wallpaper-video-playing"));
      video.addEventListener("waiting", () => document.body.classList.remove("wallpaper-video-playing"));
      video.addEventListener("error", () => document.body.classList.remove("wallpaper-video-playing"));
    }
    window.addEventListener("pointerdown", start, { once: true, passive: true });
    window.addEventListener("keydown", start, { once: true });
    window.addEventListener("resize", start, { passive: true });
    mediaQuery.addEventListener?.("change", start);
    connection?.addEventListener?.("change", start);
    document.addEventListener("visibilitychange", () => syncWallpaperVideo(currentOsMode));
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
    const cycle = $("[data-theme-cycle-label]");
    const cycleButton = cycle && cycle.closest("button");
    const labels = { macos: "Mac", windows: "Win", nvidia: "DGX" };
    const fullLabels = { macos: "macOS", windows: "Windows 11", nvidia: "NVIDIA DGX OS" };
    const themeColors = { macos: "#eff4ff", windows: "#071839", nvidia: "#0c0e0c" };
    const osLabel = $(".menubar-os");
    const themeColor = $('meta[name="theme-color"]');
    if (cycle) cycle.textContent = labels[mode] || "OS";
    if (cycleButton) cycleButton.setAttribute("aria-label", "Current theme: " + (labels[mode] || "OS") + ". Switch operating system theme");
    if (osLabel && fullLabels[mode]) osLabel.textContent = fullLabels[mode];
    if (themeColor && themeColors[mode]) themeColor.setAttribute("content", themeColors[mode]);
  }

  function setOsMode(mode, options = {}) {
    const target = mode === "nvidia" ? "nvidia" : mode;
    const prev = currentOsMode;

    if (
      (mode === "macos" || mode === "windows")
      && !options.skipLogin
      && !LOGIN_FLOW.hasAuthenticated(mode)
    ) {
      if (LOGIN_FLOW.isActive()) return Promise.resolve(currentOsMode);
      return LOGIN_FLOW.run(mode).then(() => setOsMode(mode, { ...options, skipLogin: true, skipGlitch: true }));
    }

    const apply = () => {
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
      syncWallpaperVideo(activeMode);
      window.dispatchEvent(new CustomEvent("portfolio:os-mode", { detail: { mode: activeMode } }));

      if (typeof TERM !== "undefined") TERM.setMode(activeMode);
      if (typeof STOCK !== "undefined") STOCK.setMode(activeMode);
      if (options.layout === true) applyOsWindowLayout(activeMode);

      if (typeof GPU !== "undefined") GPU.refreshMenubar();
    };

    if (
      !options.skipGlitch
      && !reduceMotion
      && prev
      && prev !== "split"
      && prev !== target
      && typeof window.__osMergeGlitch === "function"
    ) {
      window.__osMergeGlitch(prev, target, apply);
      return;
    }
    apply();
  }

  function switchToDgxTheme() {
    setOsMode("nvidia", { layout: false, skipGlitch: true });
  }

  function osSwitcher() {
    $$("[data-os-mode]").forEach((button) => {
      button.addEventListener("click", () => setOsMode(button.dataset.osMode));
    });
    syncOsSwitcher(currentOsMode);
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

  function hydrateDeferredMedia(root) {
    if (!root) return;
    $$("img[data-src]", root).forEach((img) => {
      if (img.getAttribute("src")) return;
      img.addEventListener("load", () => img.classList.add("media-loaded"), { once: true });
      img.src = img.dataset.src;
    });
    $$("source[data-src]", root).forEach((source) => {
      if (!source.getAttribute("src")) source.src = source.dataset.src;
    });
  }

  /* =============================================================
     INTERFACE PHYSICS — compositor-friendly light response
     ============================================================= */
  const INTERFACE_PHYSICS = (function () {
    let sample = null;

    function suspended(win) {
      return reduceMotion
        || isMobile()
        || !win
        || win.classList.contains("is-max")
        || document.hidden
        || document.body.matches(".login-active, .pre-iris, .cosmic-armed, .cosmic-active");
    }

    function setLight(win, metrics) {
      if (suspended(win)) return;
      const localX = clamp(metrics.pointerX - metrics.left, 0, metrics.width);
      const localY = clamp(metrics.pointerY - metrics.top, 0, metrics.height);
      const centerX = metrics.left + metrics.width / 2;
      const centerY = metrics.top + metrics.height / 2;
      const nx = clamp((centerX / Math.max(metrics.desktopWidth, 1)) * 2 - 1, -1, 1);
      const ny = clamp((centerY / Math.max(metrics.desktopHeight, 1)) * 2 - 1, -1, 1);
      const now = performance.now();
      const dt = sample ? Math.max(16, now - sample.time) : 16;
      const vx = sample ? (metrics.pointerX - sample.x) / dt : 0;
      const vy = sample ? (metrics.pointerY - sample.y) / dt : 0;
      sample = { x: metrics.pointerX, y: metrics.pointerY, time: now };

      win.style.setProperty("--physics-light-x", localX.toFixed(1) + "px");
      win.style.setProperty("--physics-light-y", localY.toFixed(1) + "px");
      win.style.setProperty("--physics-shadow-x", (nx * 18).toFixed(1) + "px");
      win.style.setProperty("--physics-shadow-y", (14 + Math.abs(ny) * 13).toFixed(1) + "px");
      win.style.setProperty("--physics-tilt-x", clamp(-vy * 0.55, -1.8, 1.8).toFixed(2) + "deg");
      win.style.setProperty("--physics-tilt-y", clamp(vx * 0.55, -1.8, 1.8).toFixed(2) + "deg");
      window.dispatchEvent(new CustomEvent("portfolio:window-physics", {
        detail: {
          id: win.dataset.app,
          left: metrics.left,
          top: metrics.top,
          width: metrics.width,
          height: metrics.height,
          vx: Number(vx.toFixed(3)),
          vy: Number(vy.toFixed(3)),
        },
      }));
    }

    function begin(win, metrics) {
      sample = { x: metrics.pointerX, y: metrics.pointerY, time: performance.now() };
      if (suspended(win)) return;
      window.clearTimeout(win._physicsReleaseTimer);
      document.body.classList.add("interface-dragging");
      win.classList.add("is-physics-active", "is-dragging");
      setLight(win, metrics);
    }

    function move(win, metrics) {
      setLight(win, metrics);
    }

    function end(win) {
      sample = null;
      if (!win) return;
      document.body.classList.remove("interface-dragging");
      win.classList.remove("is-dragging");
      window.clearTimeout(win._physicsReleaseTimer);
      win._physicsReleaseTimer = window.setTimeout(() => win.classList.remove("is-physics-active"), 260);
    }

    function refresh(win) {
      if (suspended(win)) return;
      const desk = $(".desktop");
      if (!desk) return;
      const rect = win.getBoundingClientRect();
      const deskRect = desk.getBoundingClientRect();
      setLight(win, {
        left: rect.left - deskRect.left,
        top: rect.top - deskRect.top,
        width: rect.width,
        height: rect.height,
        desktopWidth: deskRect.width,
        desktopHeight: deskRect.height,
        pointerX: deskRect.width * 0.72,
        pointerY: deskRect.height * 0.14,
      });
    }

    return { begin, move, end, refresh };
  })();

  /* =============================================================
     WINDOW MANAGER
     ============================================================= */
  const WM = (function () {
    let z = 20;
    const cascade = { x: 60, y: 30, n: 0 };
    const wins = {};        // id -> element
    const placed = {};      // id -> bool (has been positioned once)
    const openers = {};     // id -> element that triggered the open (for focus restore)

    function setWindowVisibility(win, visible) {
      win.setAttribute("aria-hidden", visible ? "false" : "true");
      win.inert = !visible;
    }

    function init() {
      $$(".win").forEach((w) => {
        wins[w.dataset.app] = w;
        w.setAttribute("tabindex", "-1");
        setWindowVisibility(w, false);
      });

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
      hydrateDeferredMedia(win);
      const wasOpen = win.classList.contains("is-open") && !win.classList.contains("is-min");
      win._minimizeToken = (win._minimizeToken || 0) + 1;
      if (!wasOpen) {
        const trigger = document.activeElement;
        if (trigger && trigger !== document.body && win !== trigger && !win.contains(trigger)) openers[id] = trigger;
      }
      win.classList.remove("is-min", "is-minimizing");
      setWindowVisibility(win, true);
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
      if (id === "projects" && typeof ASSET_VAULT !== "undefined") ASSET_VAULT.refresh();
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
      setWindowVisibility(win, false);
      syncDock();
      if (!restoreOpener(id)) focusTopMost();
    }

    function closeAll() {
      Object.keys(wins).forEach((id) => {
        const win = wins[id];
        win.classList.remove("is-open", "is-focused", "is-min", "is-max", "is-minimizing");
        setWindowVisibility(win, false);
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
        setWindowVisibility(win, false);
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
        setWindowVisibility(win, false);
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
      INTERFACE_PHYSICS.refresh(win);
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

    function snapTargetFromPointer(x, y, cachedRect) {
      const desk = $(".desktop");
      if (!desk) return null;
      const rect = cachedRect || desk.getBoundingClientRect();
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
      let deskRect = null;
      let deskWidth = 0;
      let deskHeight = 0;
      let winWidth = 0;
      let winHeight = 0;
      let moveFrame = 0;
      let pendingMove = null;
      let currentLeft = 0;
      let currentTop = 0;
      const dockH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--dock-h")) || 76;
      function flushMove() {
        moveFrame = 0;
        if (!dragging || !pendingMove) return;
        const move = pendingMove;
        pendingMove = null;
        currentLeft = move.left;
        currentTop = move.top;
        win.style.translate = (move.left - ox).toFixed(1) + "px " + (move.top - oy).toFixed(1) + "px";
        INTERFACE_PHYSICS.move(win, {
          left: move.left,
          top: move.top,
          width: winWidth,
          height: winHeight,
          desktopWidth: deskWidth,
          desktopHeight: deskHeight,
          pointerX: move.clientX,
          pointerY: move.clientY,
        });
        snapTarget = snapTargetFromPointer(move.clientX, move.clientY, deskRect);
        if (snapTarget) showSnapPreview(snapTarget);
        else hideSnapPreview();
      }
      function move(e) {
        if (!dragging) return;
        pendingMove = {
          left: clamp(ox + (e.clientX - sx), -winWidth + 80, deskWidth - 80),
          top: clamp(oy + (e.clientY - sy), 0, deskHeight - dockH - 24),
          clientX: e.clientX,
          clientY: e.clientY,
        };
        if (!moveFrame) moveFrame = window.requestAnimationFrame(flushMove);
      }
      const end = (e) => {
        if (dragging) {
          if (moveFrame) {
            window.cancelAnimationFrame(moveFrame);
            moveFrame = 0;
            flushMove();
          }
          dragging = false;
          win.style.left = currentLeft + "px";
          win.style.top = currentTop + "px";
          win.style.translate = "none";
          hideSnapPreview();
          if (snapTarget) applySnap(win, snapTarget);
          snapTarget = null;
          pendingMove = null;
          INTERFACE_PHYSICS.end(win);
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
        currentLeft = ox;
        currentTop = oy;
        const desk = $(".desktop");
        deskRect = desk.getBoundingClientRect();
        deskWidth = desk.clientWidth;
        deskHeight = desk.clientHeight;
        winWidth = win.offsetWidth;
        winHeight = win.offsetHeight;
        try { bar.setPointerCapture(e.pointerId); } catch (_) {}
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", end);
        window.addEventListener("pointercancel", end);
        focus(win.dataset.app);
        INTERFACE_PHYSICS.begin(win, {
          left: ox,
          top: oy,
          width: winWidth,
          height: winHeight,
          desktopWidth: deskWidth,
          desktopHeight: deskHeight,
          pointerX: e.clientX,
          pointerY: e.clientY,
        });
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
      let maxW = 0, maxH = 0, resizeFrame = 0, pendingSize = null;
      function flushResize() {
        resizeFrame = 0;
        if (!resizing || !pendingSize) return;
        win.style.width = pendingSize.width.toFixed(0) + "px";
        win.style.height = pendingSize.height.toFixed(0) + "px";
        pendingSize = null;
      }
      function move(e) {
        if (!resizing) return;
        pendingSize = {
          width: clamp(sw + e.clientX - sx, 320, maxW),
          height: clamp(sh + e.clientY - sy, 280, maxH),
        };
        if (!resizeFrame) resizeFrame = window.requestAnimationFrame(flushResize);
      }
      function end(e) {
        if (!resizing) return;
        if (resizeFrame) {
          window.cancelAnimationFrame(resizeFrame);
          resizeFrame = 0;
          flushResize();
        }
        resizing = false;
        pendingSize = null;
        win.classList.remove("is-resizing");
        INTERFACE_PHYSICS.refresh(win);
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
        const deskRect = $(".desktop").getBoundingClientRect();
        const winRect = win.getBoundingClientRect();
        maxW = Math.max(320, deskRect.right - winRect.left - 12);
        maxH = Math.max(280, deskRect.bottom - winRect.top - 12);
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
        if (id) it.setAttribute("aria-pressed", live ? "true" : "false");
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
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 6500);
      try {
        const res = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      } finally {
        window.clearTimeout(timeout);
      }
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
      $$('[data-stock-trigger]').forEach((item) => item.setAttribute("aria-expanded", item === trigger ? "true" : "false"));
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
      $$('[data-stock-trigger]').forEach((item) => item.setAttribute("aria-expanded", "false"));
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

    function setMode(mode) {
      activeMode = mode === "windows" || mode === "nvidia" || mode === "macos" ? mode : "macos";
      closePopover();
      renderTarget("dock");
      renderTarget("windows");
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
        trigger.setAttribute("aria-controls", "stock-popover");
        trigger.setAttribute("aria-expanded", "false");
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
        if (!document.hidden && activePopoverSymbol) refreshSymbol(activePopoverSymbol);
      });
      refreshTimer = window.setInterval(() => {
        if (!document.hidden && activePopoverSymbol) refreshSymbol(activePopoverSymbol);
      }, 120000);
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
    document.addEventListener("click", (e) => {
      const openApp = e.target.closest("[data-open-app]");
      if (openApp) {
        e.preventDefault();
        WM.open(openApp.dataset.openApp);
        return;
      }
      const action = e.target.closest("[data-action]");
      if (action) {
        e.preventDefault();
        runSystemAction(action.dataset.action);
      }
    });
    document.addEventListener("keydown", (e) => {
      if (trapSystemOverlayFocus(e)) return;
      if ((e.metaKey || e.ctrlKey) && (e.code === "Space" || e.key.toLowerCase() === "k")) {
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
    else if (action === "iris-sequence") BRAND_COLLISION.armCollision();
    else if (action === "theme-cycle") {
      const modes = ["nvidia", "macos", "windows"];
      const next = modes[(modes.indexOf(currentOsMode) + 1) % modes.length];
      Promise.resolve(setOsMode(next, { layout: false })).then(() => {
        notify("Theme changed", next === "nvidia" ? "NVIDIA DGX OS" : (next === "macos" ? "macOS" : "Windows 11"));
      });
    }
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

  const SYSTEM_OVERLAY_SELECTOR = ".mission-control.is-open, .universal-search.is-open, .app-launcher.is-open, .command-palette.is-open";
  let systemOverlayOpener = null;

  function overlayFocusables(el) {
    return $$("button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])", el)
      .filter((item) => item.offsetParent !== null);
  }

  function showSystemOverlay(el, preferredFocus) {
    if (!el) return;
    if (!$$(SYSTEM_OVERLAY_SELECTOR).length) {
      const active = document.activeElement;
      systemOverlayOpener = active && active !== document.body ? active : null;
    }
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    document.body.classList.add("system-overlay-open");
    window.setTimeout(() => {
      const target = preferredFocus || overlayFocusables(el)[0];
      if (target) target.focus({ preventScroll: true });
    }, 30);
  }

  function hideSystemOverlay(el) {
    if (!el || !el.classList.contains("is-open")) return;
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
    if ($$(SYSTEM_OVERLAY_SELECTOR).length) return;
    document.body.classList.remove("system-overlay-open");
    const opener = systemOverlayOpener;
    systemOverlayOpener = null;
    if (opener && document.body.contains(opener) && opener.offsetParent !== null) opener.focus({ preventScroll: true });
  }

  function trapSystemOverlayFocus(e) {
    if (e.key !== "Tab") return false;
    const activeOverlay = $(SYSTEM_OVERLAY_SELECTOR);
    if (!activeOverlay) return false;
    const focusable = overlayFocusables(activeOverlay);
    if (!focusable.length) return false;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
    return true;
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
      showSystemOverlay(el, $("[data-overlay-close]", el) || $(".mission-card", el));
      notify("Mission Control", "Showing active panes.");
    }
    function close() {
      if (!el) return;
      hideSystemOverlay(el);
    }
    return { init, open, close };
  })();

  const UNIVERSAL_SEARCH = (function () {
    let el, input, results, variant = "spotlight";
    const actions = [
      { id: "mission", title: "Mission Control", desc: "Show all open panes", icon: "i-mission", action: "mission", keywords: "expose overview task view" },
      { id: "launcher", title: "Launchpad", desc: "Open the app launcher", icon: "i-launchpad", action: "launcher", keywords: "start apps" },
      { id: "demo", title: "Project Demo Mode", desc: "Walk through the portfolio", icon: "i-award", action: "demo", keywords: "presentation tour" },
    ];
    function init() {
      el = $("[data-universal-search]");
      input = $("[data-universal-search-input]", el || document);
      results = $("[data-universal-search-results]", el || document);
      if (!el || !input || !results) return;
      input.addEventListener("input", render);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
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
      showSystemOverlay(el, input);
    }
    function close() {
      if (!el) return;
      hideSystemOverlay(el);
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
      showSystemOverlay(el, $(".launcher-tile", el) || $("[data-overlay-close]", el));
      notify(currentOsMode === "windows" ? "Start" : "Launchpad", "Choose an app.");
    }
    function close() {
      if (!el) return;
      hideSystemOverlay(el);
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
      { id: "mission", title: "Mission Control", desc: "Show open panes", icon: "i-mission", action: "mission", keywords: "overview" },
      { id: "launcher", title: "Open App Launcher", desc: "Grid of portfolio apps", icon: "i-launchpad", action: "launcher", keywords: "apps launchpad" },
      { id: "demo", title: "Run Project Demo", desc: "Sequence the portfolio for presentation", icon: "i-award", action: "demo", keywords: "tour" },
    ];
    function init() {
      el = $("[data-command-palette]");
      input = $("[data-command-input]", el || document);
      results = $("[data-command-results]", el || document);
      if (!el || !input || !results) return;
      input.addEventListener("input", render);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
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
      showSystemOverlay(el, input);
    }
    function close() {
      if (!el) return;
      hideSystemOverlay(el);
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
     ASSET VAULT — spatial portfolio explorer
     ============================================================= */
  const ASSET_VAULT = (function () {
    const ROOT_LOCATIONS = [
      { id: "projects", kind: "folder", title: "Projects", subtitle: "6 build artifacts", description: "Production work, experiments, and accelerated-computing projects.", path: "/projects", icon: "i-vault", tone: "green" },
      { id: "credentials", kind: "folder", title: "Credentials", subtitle: "4 verified records", description: "Selected certifications and professional learning records.", path: "/credentials", icon: "i-award", tone: "cyan" },
      { id: "systems", kind: "folder", title: "Systems", subtitle: "4 live modules", description: "Open the telemetry, diagnostics, terminal, and repository subsystems.", path: "/systems", icon: "i-cpu", tone: "amber" },
      { id: "community", kind: "folder", title: "Community", subtitle: "1 world", description: "Communities and side projects built beyond the workstation.", path: "/community", icon: "i-rocket", tone: "violet" },
    ];
    const DATA = {
      "/": ROOT_LOCATIONS,
      "/projects": [
        { id: "xray-detection", kind: "asset", title: "AI Disease Detection", subtitle: "Neural inference package", description: "Deep-learning X-ray disease detection with an optimized OpenVINO inference path.", stack: "Python · TensorFlow · OpenVINO", image: "./assets/images/projects/AI.png", thumb: "./assets/images/vault/ai-disease.webp", href: "https://github.com/osu/AI-Powered-Disease-Detection-in-X-Ray-Images", format: "MODEL", size: "1.8 GB", tone: "green" },
        { id: "spotify-analysis", kind: "asset", title: "Spotify Analysis", subtitle: "Data scene", description: "Exploratory analysis of Spotify's top songs with a reproducible SQL and Python pipeline.", stack: "SQL · Python · matplotlib", image: "./assets/images/projects/sql.png", thumb: "./assets/images/vault/spotify-analysis.webp", href: "https://github.com/osu/Spotify-Top-Songs-2021-Data-Analysis", format: "DATA", size: "420 MB", tone: "cyan" },
        { id: "beartracks", kind: "asset", title: "Mini BearTracks", subtitle: "Application build", description: "A fast timetable-management experience built around Streamlit and Pandas.", stack: "Python · Streamlit · Pandas", image: "./assets/images/projects/beartrack.jpeg", thumb: "./assets/images/vault/beartracks.webp", href: "https://github.com/osu/Beartracks/", format: "APP", size: "680 MB", tone: "amber" },
        { id: "maze-pathfinder", kind: "asset", title: "Maze Pathfinder", subtitle: "Interactive simulation", description: "A browser-based pathfinding visualizer for exploring graph-search algorithms.", stack: "JavaScript · HTML · CSS", image: "./assets/images/projects/Maze.jpeg", thumb: "./assets/images/vault/maze-pathfinder.webp", href: "https://github.com/osu/Maze-Pathfinder", format: "SCENE", size: "96 MB", tone: "violet" },
        { id: "quantum-genomics", kind: "asset", title: "Quantum Genomics", subtitle: "Research notebook", description: "Quantum neural-network exploration for genomic pattern detection from an Intel hackathon.", stack: "Python · Jupyter · QNN", image: "./assets/images/projects/Normal%20vs%20AIPC%20enchanced%20matrixes.png", thumb: "./assets/images/vault/quantum-genomics.webp", href: "https://github.com/adnansami1992sami/QNNGPD", format: "NOTEBOOK", size: "310 MB", tone: "cyan" },
        { id: "focusboost", kind: "asset", title: "FocusBoost", subtitle: "Real-time EEG system", description: "An EEG productivity app that turns live neural signals into actionable focus feedback.", stack: "Electron · JavaScript · Python", image: "./assets/images/projects/focusboost.webp", thumb: "./assets/images/vault/focusboost.webp", href: "https://github.com/daksh3333/Neuro-Stress-Monitor", format: "APP", size: "1.2 GB", tone: "green" },
      ],
      "/credentials": [
        { id: "software-product", kind: "asset", title: "Software Product Management", subtitle: "University of Alberta", description: "Product strategy, requirements, process, and delivery specialization.", image: "./assets/images/certificates/softwarespec.jpeg", thumb: "./assets/images/vault/software-product.webp", href: "https://www.coursera.org/account/accomplishments/specialization/XJSN1YN4D0VK", format: "CERT", size: "Verified", tone: "green" },
        { id: "test-automation", kind: "asset", title: "Test Automation Professional", subtitle: "LambdaTest", description: "Automation design, scalable coverage, and reliable delivery workflows.", image: "./assets/images/certificates/lambdatest.jpeg", thumb: "./assets/images/vault/test-automation.webp", href: "https://www.linkedin.com/learning/certificates/62071e091fb90401a5378c6ebe1dc04880c8d74dd9dca21405d00d68dda56cac", format: "CERT", size: "Verified", tone: "cyan" },
        { id: "cybersecurity", kind: "asset", title: "Cybersecurity Essentials", subtitle: "Microsoft · LinkedIn", description: "Security fundamentals, risk, identity, and operational defense practices.", image: "./assets/images/certificates/Cybersec_microsoft.jpeg", thumb: "./assets/images/vault/cybersecurity.webp", href: "https://www.linkedin.com/learning/certificates/4aa644556bb204964e44d860ef3a21bc502fb6d133d023ce00ad200c31cf47f0", format: "CERT", size: "Verified", tone: "amber" },
        { id: "github-career", kind: "asset", title: "GitHub Career Essentials", subtitle: "GitHub · LinkedIn", description: "Collaborative development, repository workflows, and GitHub tooling.", image: "./assets/images/certificates/github.jpeg", thumb: "./assets/images/vault/github-career.webp", href: "https://www.linkedin.com/learning/certificates/feb078c04d2cd23003d5fd1c547ef27400c236179a0a3a29a11d213895a16a38", format: "CERT", size: "Verified", tone: "violet" },
      ],
      "/systems": [
        { id: "gpu-telemetry", kind: "app", title: "GPU Telemetry", subtitle: "Live Blackwell metrics", description: "Inspect utilization, memory, thermal, power, and clock telemetry.", target: "gpu", icon: "i-gauge", format: "MODULE", size: "LIVE", tone: "green" },
        { id: "fabric-diagnostics", kind: "app", title: "Fabric Diagnostics", subtitle: "Recovery console", description: "Inspect fabric health and autonomous recovery signals.", target: "diagnostics", icon: "i-diagnostics", format: "MODULE", size: "LIVE", tone: "cyan" },
        { id: "dgx-shell", kind: "app", title: "DGX Shell", subtitle: "Command interface", description: "Open the interactive terminal and explore portfolio commands.", target: "terminal", icon: "i-terminal", format: "MODULE", size: "READY", tone: "amber" },
        { id: "repo-feed", kind: "app", title: "Repository Feed", subtitle: "GitHub activity", description: "Browse repositories and public engineering activity.", target: "github", icon: "i-github", format: "MODULE", size: "SYNC", tone: "violet" },
      ],
      "/community": [
        { id: "kuudra-gang", kind: "asset", title: "Kuudra Gang", subtitle: "45,000+ member community", description: "A large Minecraft community built from scratch with partnerships, events, and 200+ paid Patreon members.", stack: "Community · Partnerships · Operations", image: "./assets/images/projects/kuudragang.webp", thumb: "./assets/images/vault/kuudra-gang.webp", href: "https://www.patreon.com/kuudragang", format: "WORLD", size: "45K MEMBERS", tone: "violet" },
      ],
    };
    const PATH_LABELS = { projects: "Projects", credentials: "Credentials", systems: "Systems", community: "Community" };
    const state = { path: "/", history: ["/"], historyIndex: 0, selectedId: null, query: "", view: "spatial", visibleIds: [] };
    let root = null;
    let stageFrame = 0;

    function currentItems() {
      const items = DATA[state.path] || [];
      const query = state.query.trim().toLowerCase();
      return query
        ? items.filter((item) => [item.title, item.subtitle, item.description, item.stack, item.format].join(" ").toLowerCase().includes(query))
        : items;
    }

    function itemById(id) {
      return (DATA[state.path] || []).find((item) => item.id === id) || null;
    }

    function emit(name, detail) {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    }

    function snapshot() {
      return {
        path: state.path,
        history: state.history.slice(),
        historyIndex: state.historyIndex,
        selectedId: state.selectedId,
        query: state.query,
        view: state.view,
        visibleIds: state.visibleIds.slice(),
      };
    }

    function emitChange(reason) {
      emit("portfolio:vault-change", { ...snapshot(), reason });
    }

    function renderBreadcrumb() {
      const target = $("[data-vault-breadcrumb]", root);
      if (!target) return;
      const parts = state.path.split("/").filter(Boolean);
      const crumbs = [{ label: "Vault", path: "/" }];
      let path = "";
      parts.forEach((part) => {
        path += "/" + part;
        crumbs.push({ label: PATH_LABELS[part] || part, path });
      });
      target.innerHTML = crumbs.map((crumb, index) => (
        "<button type='button' data-vault-path='" + escapePlain(crumb.path) + "'" + (index === crumbs.length - 1 ? " aria-current='page'" : "") + ">" +
        escapePlain(crumb.label) + "</button>" + (index < crumbs.length - 1 ? "<span>/</span>" : "")
      )).join("");
    }

    function renderSidebar() {
      const target = $("[data-vault-sidebar]", root);
      if (!target) return;
      target.innerHTML = [
        "<span class='vault-sidebar-label'>LOCATIONS</span>",
        "<button type='button' data-vault-path='/' class='" + (state.path === "/" ? "is-active" : "") + "'" + (state.path === "/" ? " aria-current='page'" : "") + ">" + iconUse("i-vault") + "<span>Vault root</span><em>04</em></button>",
      ].concat(ROOT_LOCATIONS.map((item) => (
        "<button type='button' data-vault-path='" + item.path + "' class='" + (state.path === item.path ? "is-active" : "") + "'" + (state.path === item.path ? " aria-current='page'" : "") + ">" +
        iconUse(item.icon) + "<span>" + escapePlain(item.title) + "</span><em>" + String((DATA[item.path] || []).length).padStart(2, "0") + "</em></button>"
      ))).join("");
      const active = $(".is-active", target);
      if (active && isMobile()) {
        window.requestAnimationFrame(() => target.scrollTo({
          left: Math.max(0, active.offsetLeft - (target.clientWidth - active.offsetWidth) / 2),
          behavior: reduceMotion ? "auto" : "smooth",
        }));
      }
    }

    function nodeVisual(item) {
      const thumbnail = item.thumb || item.image;
      if (thumbnail) {
        return "<span class='vault-node-visual vault-node-image'><img data-src='" + escapePlain(thumbnail) + "' alt='' decoding='async' loading='lazy'></span>";
      }
      if (item.kind === "folder") {
        return "<span class='vault-node-visual vault-folder-form' aria-hidden='true'><i></i><i></i><i></i>" + iconUse(item.icon) + "</span>";
      }
      return "<span class='vault-node-visual vault-app-form' aria-hidden='true'>" + iconUse(item.icon || "i-grid") + "<i></i></span>";
    }

    function renderItems(options = {}) {
      const target = $("[data-vault-items]", root);
      if (!target) return;
      const items = currentItems();
      state.visibleIds = items.map((item) => item.id);
      if (state.selectedId && !state.visibleIds.includes(state.selectedId)) state.selectedId = null;
      target.innerHTML = items.map((item, index) => {
        const selected = item.id === state.selectedId;
        const row = Math.floor(index / 2);
        const column = index % 2;
        const depth = 132 - row * 60 - column * 20;
        const lean = column ? -7.5 : 7.5;
        const tabbable = selected || (!state.selectedId && index === 0);
        return "<li data-vault-item='" + escapePlain(item.id) + "' class='" + (selected ? "is-selected" : "") + "' style='--vault-index:" + index + ";--vault-row:" + row + ";--vault-depth:" + depth + "px;--vault-lean:" + lean + "deg'>" +
          "<button class='vault-node vault-tone-" + escapePlain(item.tone || "green") + "' type='button' tabindex='" + (tabbable ? "0" : "-1") + "' data-vault-id='" + escapePlain(item.id) + "' data-vault-kind='" + escapePlain(item.kind) + "' aria-pressed='" + (selected ? "true" : "false") + "'>" +
          nodeVisual(item) +
          "<span class='vault-node-copy'><strong>" + escapePlain(item.title) + "</strong><small>" + escapePlain(item.subtitle || item.kind) + "</small></span>" +
          "<span class='vault-node-meta'>" + escapePlain(item.format || (item.kind === "folder" ? "DIR" : "ASSET")) + "</span>" +
          "</button></li>";
      }).join("") || "<li class='vault-empty-state'><strong>No artifacts found</strong><span>Try a different search term.</span></li>";
      hydrateDeferredMedia(root);
      renderPreview();
      renderStatus();
      if (options.focusFirst) {
        const first = $(".vault-node", target);
        if (first) first.focus({ preventScroll: true });
      }
    }

    function renderPreview() {
      const target = $("[data-vault-preview]", root);
      if (!target) return;
      const item = itemById(state.selectedId);
      if (!item) {
        target.innerHTML = "<div class='vault-preview-empty'><span>OPTICAL PREVIEW</span><strong>Select an artifact</strong><p>Inspect metadata and launch compatible portfolio modules from this panel.</p></div>";
        return;
      }
      const previewImage = item.thumb || item.image;
      const media = previewImage
        ? "<div class='vault-preview-media'><img data-src='" + escapePlain(previewImage) + "' alt='" + escapePlain(item.title) + " preview' decoding='async'><span>RTX PREVIEW</span></div>"
        : "<div class='vault-preview-media vault-preview-module'>" + iconUse(item.icon || "i-grid") + "<span>LIVE MODULE</span></div>";
      const action = item.kind === "folder"
        ? "<button class='btn btn-primary' type='button' data-vault-preview-action='open'>Open location</button>"
        : (item.kind === "app"
          ? "<button class='btn btn-primary' type='button' data-vault-preview-action='launch'>Launch module</button>"
          : (item.href ? "<a class='btn btn-primary' href='" + escapePlain(item.href) + "' target='_blank' rel='noopener'>Open source</a>" : ""));
      target.innerHTML = media +
        "<div class='vault-preview-copy'><span class='vault-preview-kicker'>" + escapePlain(item.format || item.kind) + " // " + escapePlain(item.size || "READY") + "</span>" +
        "<h3>" + escapePlain(item.title) + "</h3><p>" + escapePlain(item.description || "Portfolio artifact") + "</p>" +
        (item.stack ? "<div class='vault-preview-stack'>" + escapePlain(item.stack) + "</div>" : "") +
        "<div class='vault-preview-actions'>" + action + "</div></div>";
      hydrateDeferredMedia(target);
    }

    function renderStatus() {
      const target = $("[data-vault-status]", root);
      if (!target) return;
      const count = state.visibleIds.length;
      target.innerHTML = "<span>VAULT MOUNTED</span><strong>" + count + " " + (count === 1 ? "artifact" : "artifacts") + "</strong><em>RTX PREVIEW · LOCAL INDEX</em>";
    }

    function syncControls() {
      if (!root) return;
      root.dataset.vaultPath = state.path;
      root.dataset.vaultZone = state.path === "/" ? "root" : state.path.slice(1);
      root.dataset.vaultView = state.view;
      const back = $("[data-vault-action='back']", root);
      const forward = $("[data-vault-action='forward']", root);
      const upButton = $("[data-vault-action='up']", root);
      const view = $("[data-vault-action='view']", root);
      if (back) back.disabled = state.historyIndex <= 0;
      if (forward) forward.disabled = state.historyIndex >= state.history.length - 1;
      if (upButton) upButton.disabled = state.path === "/";
      if (view) {
        view.setAttribute("aria-pressed", state.view === "list" ? "true" : "false");
        view.textContent = state.view === "list" ? "Spatial view" : "List view";
      }
    }

    function render(reason = "render", options = {}) {
      if (!root) return;
      const search = $("[data-vault-search]", root);
      if (search && search.value !== state.query) search.value = state.query;
      renderBreadcrumb();
      renderSidebar();
      renderItems(options);
      syncControls();
      emitChange(reason);
    }

    function resetViewport() {
      if (!root) return;
      const previousBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      root.scrollTop = 0;
      root.scrollLeft = 0;
      const stage = $("[data-vault-stage]", root);
      const preview = $("[data-vault-preview]", root);
      if (stage) stage.scrollTop = 0;
      if (preview) preview.scrollTop = 0;
      window.requestAnimationFrame(() => {
        root.scrollTop = 0;
        root.style.scrollBehavior = previousBehavior;
      });
    }

    function finishPathTransition(from, reason) {
      window.requestAnimationFrame(() => {
        resetViewport();
        emit("portfolio:vault-transition", { phase: "end", from, to: state.path, reason });
      });
    }

    function navigate(path, options = {}) {
      if (!DATA[path]) return false;
      const from = state.path;
      const reason = options.reason || "navigate";
      emit("portfolio:vault-transition", { phase: "start", from, to: path, reason });
      if (path !== state.path) {
        if (options.fromHistory !== true) {
          state.history = state.history.slice(0, state.historyIndex + 1);
          state.history.push(path);
          state.historyIndex = state.history.length - 1;
        }
        state.path = path;
      }
      state.selectedId = null;
      state.query = "";
      const search = root && $("[data-vault-search]", root);
      if (search) search.value = "";
      render(reason, { focusFirst: options.focusFirst === true });
      finishPathTransition(from, reason);
      return true;
    }

    function back() {
      if (state.historyIndex <= 0) return;
      const from = state.path;
      const to = state.history[state.historyIndex - 1];
      emit("portfolio:vault-transition", { phase: "start", from, to, reason: "back" });
      state.historyIndex -= 1;
      state.path = state.history[state.historyIndex];
      state.selectedId = null;
      state.query = "";
      render("back", { focusFirst: true });
      finishPathTransition(from, "back");
    }

    function forward() {
      if (state.historyIndex >= state.history.length - 1) return;
      const from = state.path;
      const to = state.history[state.historyIndex + 1];
      emit("portfolio:vault-transition", { phase: "start", from, to, reason: "forward" });
      state.historyIndex += 1;
      state.path = state.history[state.historyIndex];
      state.selectedId = null;
      state.query = "";
      render("forward", { focusFirst: true });
      finishPathTransition(from, "forward");
    }

    function up() {
      if (state.path === "/") return;
      navigate("/", { reason: "up", focusFirst: true });
    }

    function select(id, options = {}) {
      const item = itemById(id);
      if (!item) return;
      state.selectedId = id;
      $$(".vault-node", root).forEach((node) => {
        const active = node.dataset.vaultId === id;
        node.setAttribute("aria-pressed", active ? "true" : "false");
        node.tabIndex = active ? 0 : -1;
        node.closest("[data-vault-item]")?.classList.toggle("is-selected", active);
      });
      renderPreview();
      if (options.focus) {
        const node = $(".vault-node[data-vault-id='" + id + "']", root);
        if (node) node.focus({ preventScroll: true });
      }
      if (options.reveal && isMobile()) {
        const preview = $("[data-vault-preview]", root);
        if (preview) window.requestAnimationFrame(() => preview.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }));
      }
      emit("portfolio:vault-select", { path: state.path, id: item.id, kind: item.kind });
      emitChange("select");
    }

    function activate(id, source = "node") {
      const item = itemById(id);
      if (!item) return;
      if (item.kind === "folder") navigate(item.path, { reason: "activate", focusFirst: true });
      else if (item.kind === "app" && item.target) WM.open(item.target);
      else select(id);
      emit("portfolio:vault-activate", { path: state.path, id: item.id, kind: item.kind, target: item.path || item.target || item.href || "", source });
    }

    function setQuery(value) {
      state.query = value || "";
      renderItems();
      emitChange("search");
    }

    function toggleView() {
      state.view = state.view === "spatial" ? "list" : "spatial";
      syncControls();
      emitChange("view");
    }

    function rove(event, node) {
      const nodes = $$(".vault-node", root);
      if (!nodes.length) return;
      const index = Math.max(0, nodes.indexOf(node));
      const columns = state.view === "list" || isMobile() ? 1 : 2;
      let nextIndex = index;
      if (event.key === "ArrowRight") nextIndex = Math.min(nodes.length - 1, index + 1);
      else if (event.key === "ArrowLeft") nextIndex = Math.max(0, index - 1);
      else if (event.key === "ArrowDown") nextIndex = Math.min(nodes.length - 1, index + columns);
      else if (event.key === "ArrowUp") nextIndex = Math.max(0, index - columns);
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = nodes.length - 1;
      else if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (event.key === "Enter") activate(node.dataset.vaultId, "keyboard");
        else select(node.dataset.vaultId);
        return;
      } else return;
      event.preventDefault();
      nodes.forEach((item, itemIndex) => { item.tabIndex = itemIndex === nextIndex ? 0 : -1; });
      nodes[nextIndex].focus({ preventScroll: true });
      select(nodes[nextIndex].dataset.vaultId);
    }

    function bindStageTilt() {
      const stage = $("[data-vault-stage]", root);
      if (!stage) return;
      let stageRect = null;
      let pendingTilt = null;
      const measure = () => { stageRect = stage.getBoundingClientRect(); };
      stage.addEventListener("pointerenter", measure, { passive: true });
      stage.addEventListener("pointermove", (event) => {
        if (reduceMotion || isMobile() || state.view === "list") return;
        if (!stageRect) measure();
        pendingTilt = {
          x: clamp((event.clientX - stageRect.left) / stageRect.width, 0, 1),
          y: clamp((event.clientY - stageRect.top) / stageRect.height, 0, 1),
        };
        if (stageFrame) return;
        stageFrame = window.requestAnimationFrame(() => {
          stageFrame = 0;
          if (!pendingTilt) return;
          const { x, y } = pendingTilt;
          pendingTilt = null;
          root.style.setProperty("--vault-tilt-x", ((0.5 - y) * 4.5).toFixed(2) + "deg");
          root.style.setProperty("--vault-tilt-y", ((x - 0.5) * 6).toFixed(2) + "deg");
          root.style.setProperty("--vault-light-x", (x * 100).toFixed(1) + "%");
          root.style.setProperty("--vault-light-y", (y * 100).toFixed(1) + "%");
        });
      });
      stage.addEventListener("pointerleave", () => {
        window.cancelAnimationFrame(stageFrame);
        stageFrame = 0;
        stageRect = null;
        pendingTilt = null;
        root.style.setProperty("--vault-tilt-x", "0deg");
        root.style.setProperty("--vault-tilt-y", "0deg");
      });
      window.addEventListener("resize", () => { stageRect = null; }, { passive: true });
    }

    function bindEvents() {
      root.addEventListener("click", (event) => {
        const node = event.target.closest("[data-vault-id]");
        const pathButton = event.target.closest("button[data-vault-path]");
        const action = event.target.closest("[data-vault-action]");
        const previewAction = event.target.closest("[data-vault-preview-action]");
        if (node) {
          const kind = node.dataset.vaultKind;
          if (kind === "folder" || kind === "app") activate(node.dataset.vaultId, isMobile() ? "touch" : "pointer");
          else select(node.dataset.vaultId, { reveal: isMobile() });
        }
        else if (pathButton) navigate(pathButton.dataset.vaultPath, { reason: "location" });
        else if (action) {
          if (action.dataset.vaultAction === "back") back();
          else if (action.dataset.vaultAction === "forward") forward();
          else if (action.dataset.vaultAction === "up") up();
          else if (action.dataset.vaultAction === "view") toggleView();
        } else if (previewAction && state.selectedId) activate(state.selectedId, "preview");
      });
      root.addEventListener("keydown", (event) => {
        const node = event.target.closest("[data-vault-id]");
        if (node) rove(event, node);
        else if (event.key === "Backspace" && event.target !== $("[data-vault-search]", root)) {
          event.preventDefault();
          up();
        }
      });
      const search = $("[data-vault-search]", root);
      if (search) search.addEventListener("input", () => setQuery(search.value));
      bindStageTilt();
    }

    function init() {
      root = $("[data-vault-root]");
      if (!root) return;
      bindEvents();
      render("init");
    }

    function refresh() {
      if (!root) return;
      renderPreview();
      syncControls();
    }

    return { init, refresh, navigate, back, forward, up, select, activate, setQuery, toggleView, snapshot };
  })();

  /* =============================================================
     CERTIFICATE LIGHTBOX
     ============================================================= */
  function lightbox() {
    let ov, opener;
    function close() {
      if (!ov) return;
      ov.remove();
      ov = null;
      if (opener && document.body.contains(opener)) opener.focus({ preventScroll: true });
      opener = null;
    }
    function open(img) {
      close();
      opener = img;
      ov = document.createElement("div");
      ov.className = "lb-overlay";
      ov.setAttribute("role", "dialog");
      ov.setAttribute("aria-modal", "true");
      ov.setAttribute("aria-label", (img.alt || "Certificate") + " preview");
      const big = document.createElement("img");
      big.src = img.currentSrc || img.src;
      big.alt = img.alt || "Certificate preview";
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "lb-close";
      closeButton.textContent = "Close";
      closeButton.addEventListener("click", close);
      ov.append(big, closeButton);
      ov.addEventListener("pointerdown", (e) => { if (e.target === ov) close(); });
      document.body.appendChild(ov);
      closeButton.focus();
    }
    $$("[data-zoom]").forEach((img) => {
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", "Open " + (img.alt || "certificate") + " preview");
      img.addEventListener("click", () => open(img));
      img.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        open(img);
      });
    });
    document.addEventListener("keydown", (e) => {
      if (!ov) return;
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        e.preventDefault();
        $(".lb-close", ov).focus();
      }
    });
  }

  /* =============================================================
     COPY-TO-CLIPBOARD
     ============================================================= */
  function notify(title, body, options = {}) {
    const stack = $("[data-notification-stack]");
    if (!stack) return toastFallback((body ? title + " — " + body : title));
    const note = document.createElement("div");
    note.className = "notification";
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
      if (reduceMotion) return;
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
     MICROSOFT × APPLE BRAND COLLISION
     ============================================================= */
  const BRAND_COLLISION = (function () {
    const SPEED = 80; // pixels per second
    const GROWTH_PER_SECOND = 0.007;
    const MAX_GROWTH = 0.4;
    const BIG_BANG_DURATION = 22000;
    const IRIS_BLADES = 12;
    const SCREEN_SHATTER_DURATION = 5600;
    const PANEL_SHATTER_DURATION = 4200;
    const PRE_EXPLOSION_PULL_DURATION = 1180;
    const BIG_BANG_PHASES = [
      { phase: "void", at: 0 },
      { phase: "singularity", at: 500 },
      { phase: "eruption", at: 1900 },
      { phase: "shatter-primary", at: 2050 },
      { phase: "shockwaves", at: 2450 },
      { phase: "green-pulses", at: 3600 },
      { phase: "nvidia-formation", at: 14500 },
    ];
    const BIG_BANG_TARGET_SELECTOR = [
      ".desktop-video",
      ".desktop-bg",
      ".menubar",
      ".dock",
      ".windows-taskbar",
      ".win.is-open:not(.is-min)",
      ".toast.show",
    ].join(", ");
    const COSMIC_SUPPRESS_SELECTOR = ".desktop-watermark, .windows-mobile-hint, .mobile-launcher, .desktop-widgets";
    const PANE_WARP_TARGET_SELECTOR = ".win.is-open:not(.is-min):not(.is-max)";
    const TEXT_WARP_TARGET_SELECTOR = [
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
    const BRAND_CONFIGS = [
      { id: "microsoft-orb", x: 0.68, y: 0.24, vx: SPEED * 0.24, vy: SPEED * 0.16, gravity: 1, spin: 1 },
      { id: "apple-orb", x: 0.32, y: 0.72, vx: -SPEED * 0.24, vy: -SPEED * 0.16, gravity: -1, spin: -1 },
    ];
    let desk, wells = [], collisionDone = false, collisionArmed = false, motionStarted = false;
    let raf = 0;
    let lightningMounts = [];

    function getBaseSize() {
      if (!desk) return 112 / 3;
      return (isMobile() ? 92 : clamp(desk.clientWidth * 0.108, 112, 180)) / 3;
    }

    function getSize(well, now) {
      const seconds = Math.max(0, (now - well.startTime) / 1000);
      const growth = Math.min(seconds * GROWTH_PER_SECOND, MAX_GROWTH);
      return well.baseSize * (1 + growth);
    }

    function keepInBounds(well) {
      const dw = desk.clientWidth;
      const dh = desk.clientHeight;
      const visualRadius = well.size * 1.05;
      const lowerChromeReserve = isMobile() ? 72 : 84;
      if (visualRadius * 2 >= dw) well.cx = dw / 2;
      else {
        const minX = visualRadius;
        const maxX = dw - visualRadius;
        if (well.cx < minX) { well.cx = minX; well.vx = Math.abs(well.vx); }
        if (well.cx > maxX) { well.cx = maxX; well.vx = -Math.abs(well.vx); }
      }

      const usableHeight = Math.max(visualRadius * 2, dh - lowerChromeReserve);
      if (visualRadius * 2 >= usableHeight) well.cy = usableHeight / 2;
      else {
        const minY = visualRadius;
        const maxY = usableHeight - visualRadius;
        if (well.cy < minY) { well.cy = minY; well.vy = Math.abs(well.vy); }
        if (well.cy > maxY) { well.cy = maxY; well.vy = -Math.abs(well.vy); }
      }
    }

    function paint(well) {
      well.el.style.width = well.size.toFixed(2) + "px";
      well.el.style.transform = "translate3d(" + (well.cx - well.size / 2).toFixed(2) + "px, " + (well.cy - well.size / 2).toFixed(2) + "px, 0)";
    }

    function aimBrandCoresAtEachOther() {
      const microsoft = wells.find((well) => well.id === "microsoft-orb");
      const apple = wells.find((well) => well.id === "apple-orb");
      if (!microsoft || !apple) return;

      const dx = apple.cx - microsoft.cx;
      const dy = apple.cy - microsoft.cy;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const vx = (dx / distance) * SPEED;
      const vy = (dy / distance) * SPEED;
      microsoft.vx = vx;
      microsoft.vy = vy;
      apple.vx = -vx;
      apple.vy = -vy;
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

    function createSeededRandom(seed) {
      let state = seed >>> 0;
      return function random() {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 4294967296;
      };
    }

    function useLowEffectsQuality() {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      return isMobile()
        || Boolean(connection && connection.saveData)
        || (Number(navigator.deviceMemory) > 0 && Number(navigator.deviceMemory) <= 4)
        || (Number(navigator.hardwareConcurrency) > 0 && Number(navigator.hardwareConcurrency) <= 4);
    }

    function createShatterOverlay(cx, cy) {
      const deskRect = desk.getBoundingClientRect();
      const impactX = deskRect.left + cx;
      const impactY = deskRect.top + cy;
      const lowQuality = useLowEffectsQuality();
      const random = createSeededRandom(Math.round(impactX * 31 + impactY * 17 + window.innerWidth * 13));
      const overlay = document.createElement("div");
      overlay.className = "cosmic-shatter";
      overlay.dataset.bigbangLayer = "shatter";
      overlay.setAttribute("aria-hidden", "true");
      overlay.style.setProperty("--impact-x", impactX.toFixed(2) + "px");
      overlay.style.setProperty("--impact-y", impactY.toFixed(2) + "px");

      const svgNS = "http://www.w3.org/2000/svg";
      const crackMap = document.createElementNS(svgNS, "svg");
      crackMap.classList.add("shatter-crack-map");
      crackMap.dataset.bigbangLayer = "fracture";
      crackMap.setAttribute("viewBox", "0 0 " + window.innerWidth + " " + window.innerHeight);
      crackMap.setAttribute("preserveAspectRatio", "none");
      crackMap.setAttribute("aria-hidden", "true");

      const farthestEdge = Math.hypot(
        Math.max(impactX, window.innerWidth - impactX),
        Math.max(impactY, window.innerHeight - impactY),
      ) * 1.12;
      const spokeCount = lowQuality ? 10 : 15;
      for (let i = 0; i < spokeCount; i++) {
        const baseAngle = (i / spokeCount) * Math.PI * 2 + (random() - 0.5) * 0.18;
        const points = [{ x: impactX, y: impactY }];
        for (let step = 1; step <= 5; step++) {
          const distance = farthestEdge * (step / 5) * (0.9 + random() * 0.14);
          const angle = baseAngle + (random() - 0.5) * (0.12 + step * 0.028);
          points.push({
            x: impactX + Math.cos(angle) * distance,
            y: impactY + Math.sin(angle) * distance,
          });
        }

        const crack = document.createElementNS(svgNS, "path");
        crack.classList.add("shatter-crack-ray");
        crack.setAttribute("pathLength", "1");
        crack.setAttribute("d", points.map((point, index) => (index ? "L" : "M") + point.x.toFixed(1) + " " + point.y.toFixed(1)).join(" "));
        crack.style.setProperty("--crack-delay", (i * 0.014).toFixed(3) + "s");
        crackMap.appendChild(crack);

        if (i % 2 === 0 || !lowQuality) {
          const forkFrom = points[2 + (i % 2)];
          const forkAngle = baseAngle + (i % 2 ? -1 : 1) * (0.34 + random() * 0.28);
          const forkLength = farthestEdge * (0.16 + random() * 0.18);
          const elbow = {
            x: forkFrom.x + Math.cos(forkAngle) * forkLength * 0.48,
            y: forkFrom.y + Math.sin(forkAngle) * forkLength * 0.48,
          };
          const fork = document.createElementNS(svgNS, "path");
          fork.classList.add("shatter-crack-branch");
          fork.setAttribute("pathLength", "1");
          fork.setAttribute("d", "M" + forkFrom.x.toFixed(1) + " " + forkFrom.y.toFixed(1)
            + " L" + elbow.x.toFixed(1) + " " + elbow.y.toFixed(1)
            + " L" + (forkFrom.x + Math.cos(forkAngle + (random() - 0.5) * 0.2) * forkLength).toFixed(1)
            + " " + (forkFrom.y + Math.sin(forkAngle + (random() - 0.5) * 0.2) * forkLength).toFixed(1));
          fork.style.setProperty("--crack-delay", (0.08 + i * 0.012).toFixed(3) + "s");
          crackMap.appendChild(fork);
        }
      }

      const impactRing = document.createElementNS(svgNS, "circle");
      impactRing.classList.add("shatter-impact-ring");
      impactRing.setAttribute("cx", impactX.toFixed(1));
      impactRing.setAttribute("cy", impactY.toFixed(1));
      impactRing.setAttribute("r", lowQuality ? "22" : "34");
      crackMap.appendChild(impactRing);
      overlay.appendChild(crackMap);

      const shardCount = lowQuality ? 28 : 48;
      const majorShardCount = lowQuality ? 20 : 36;
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < shardCount; i++) {
        const angle = i * goldenAngle + (random() - 0.5) * 0.42;
        const radius = farthestEdge * Math.sqrt((i + 0.7) / shardCount) * (0.55 + random() * 0.38);
        const centerX = impactX + Math.cos(angle) * radius;
        const centerY = impactY + Math.sin(angle) * radius;
        const isSplinter = i >= majorShardCount;
        const width = isSplinter ? 12 + random() * 26 : 52 + random() * 92;
        const height = isSplinter ? 36 + random() * 68 : 48 + random() * 92;
        const dist = Math.max(Math.hypot(centerX - impactX, centerY - impactY), 1);
        const nx = (centerX - impactX) / dist;
        const ny = (centerY - impactY) / dist;
        const blast = (isSplinter ? 360 : 250) + random() * (isSplinter ? 430 : 350);
        const burstX = nx * blast + (random() - 0.5) * 110;
        const burstY = ny * blast + (random() - 0.5) * 110;
        const rot = (random() - 0.5) * (isSplinter ? 260 : 150);
        const shard = document.createElement("div");
        shard.className = "shatter-shard" + (isSplinter ? " shatter-splinter" : "");
        shard.dataset.bigbangLayer = "glass-shard";
        shard.style.setProperty("--sx", (centerX - width / 2).toFixed(2) + "px");
        shard.style.setProperty("--sy", (centerY - height / 2).toFixed(2) + "px");
        shard.style.setProperty("--sw", width.toFixed(2) + "px");
        shard.style.setProperty("--sh", height.toFixed(2) + "px");
        shard.style.setProperty("--dx", burstX.toFixed(2) + "px");
        shard.style.setProperty("--dy", burstY.toFixed(2) + "px");
        shard.style.setProperty("--dx-end", (burstX * (1.5 + random() * 0.28)).toFixed(2) + "px");
        shard.style.setProperty("--dy-end", (burstY * (1.5 + random() * 0.28)).toFixed(2) + "px");
        shard.style.setProperty("--rot", rot.toFixed(2) + "deg");
        shard.style.setProperty("--rot-end", (rot * (1.8 + random() * 0.55)).toFixed(2) + "deg");
        shard.style.setProperty("--delay", (random() * 0.16).toFixed(3) + "s");
        const shardShapes = isSplinter
          ? [
              "polygon(44% 0%, 72% 8%, 100% 100%, 18% 78%)",
              "polygon(0% 18%, 82% 0%, 100% 26%, 24% 100%)",
              "polygon(38% 0%, 100% 86%, 54% 100%, 0% 20%)",
            ]
          : [
              "polygon(46% 0%, 100% 28%, 76% 100%, 0% 72%, 14% 18%)",
              "polygon(8% 0%, 100% 14%, 72% 62%, 92% 100%, 18% 82%, 0% 34%)",
              "polygon(34% 0%, 100% 8%, 84% 84%, 36% 100%, 0% 58%)",
              "polygon(0% 22%, 70% 0%, 100% 46%, 58% 100%, 12% 76%)",
              "polygon(20% 0%, 100% 38%, 62% 100%, 0% 64%)",
            ];
        shard.style.setProperty("--shard-clip", shardShapes[i % shardShapes.length]);
        overlay.appendChild(shard);
      }

      document.body.appendChild(overlay);
      window.setTimeout(() => overlay.remove(), SCREEN_SHATTER_DURATION);
    }

    function suppressCollisionChrome() {
      $$(COSMIC_SUPPRESS_SELECTOR).forEach((el) => el.classList.add("cosmic-suppressed"));
    }

    function mountUniverseBurst(overlay, impactX, impactY, lowQuality) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, lowQuality ? 1.25 : 1.5);
      const canvas = document.createElement("canvas");
      canvas.className = "bigbang-matter-canvas";
      canvas.dataset.bigbangLayer = "matter-canvas";
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.setAttribute("aria-hidden", "true");
      overlay.appendChild(canvas);

      const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
      if (!context) {
        canvas.remove();
        return false;
      }

      const random = createSeededRandom(Math.round(impactX * 43 + impactY * 29 + width * height));
      const count = lowQuality ? 170 : 560;
      const maxTravel = Math.hypot(width, height) * 0.82;
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const particles = Array.from({ length: count }, (_, index) => {
        const angle = index * goldenAngle + (random() - 0.5) * 0.28;
        return {
          angle,
          delay: random() * 620,
          life: 3900 + random() * 2600,
          travel: maxTravel * (0.18 + Math.pow(random(), 0.64) * 0.82),
          width: 0.35 + random() * 1.75,
          alpha: 0.26 + random() * 0.7,
          green: random() > 0.62,
          bend: (random() - 0.5) * 0.52,
        };
      });
      const eruptionAt = BIG_BANG_PHASES.find((item) => item.phase === "eruption").at;
      const start = performance.now();
      let raf = 0;

      function draw(now) {
        if (!overlay.isConnected) return;
        const elapsed = now - start;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, width, height);

        const burstElapsed = elapsed - eruptionAt;
        if (burstElapsed >= 0 && burstElapsed <= 8400) {
          context.globalCompositeOperation = "lighter";
          const coreProgress = Math.min(burstElapsed / 1200, 1);
          const coreRadius = 22 + coreProgress * Math.min(width, height) * 0.22;
          const coreAlpha = Math.max(0, 1 - burstElapsed / 2600);
          if (coreAlpha > 0) {
            const coreGlow = context.createRadialGradient(impactX, impactY, 0, impactX, impactY, coreRadius);
            coreGlow.addColorStop(0, "rgba(255,255,255," + (coreAlpha * 0.94).toFixed(3) + ")");
            coreGlow.addColorStop(0.12, "rgba(224,255,199," + (coreAlpha * 0.68).toFixed(3) + ")");
            coreGlow.addColorStop(0.42, "rgba(118,185,0," + (coreAlpha * 0.3).toFixed(3) + ")");
            coreGlow.addColorStop(1, "rgba(0,0,0,0)");
            context.fillStyle = coreGlow;
            context.beginPath();
            context.arc(impactX, impactY, coreRadius, 0, Math.PI * 2);
            context.fill();
          }

          particles.forEach((particle) => {
            const age = burstElapsed - particle.delay;
            if (age < 0 || age > particle.life) return;
            const progress = age / particle.life;
            const eased = 1 - Math.pow(1 - progress, 3.2);
            const distance = particle.travel * eased;
            const curve = Math.sin(progress * Math.PI) * particle.bend;
            const angle = particle.angle + curve;
            const x = impactX + Math.cos(angle) * distance;
            const y = impactY + Math.sin(angle) * distance;
            const tail = (10 + particle.width * 15) * (0.35 + progress * 1.5);
            const alpha = particle.alpha * Math.sin(Math.min(progress * 1.5, 1) * Math.PI) * Math.pow(1 - progress, 0.45);
            if (alpha <= 0.008) return;
            context.strokeStyle = particle.green
              ? "rgba(151,230,54," + alpha.toFixed(3) + ")"
              : "rgba(235,249,255," + alpha.toFixed(3) + ")";
            context.lineWidth = particle.width;
            context.beginPath();
            context.moveTo(x - Math.cos(angle) * tail, y - Math.sin(angle) * tail);
            context.lineTo(x, y);
            context.stroke();
          });
          context.globalCompositeOperation = "source-over";
        }

        if (elapsed < 10400) raf = window.requestAnimationFrame(draw);
        else canvas.remove();
      }

      raf = window.requestAnimationFrame(draw);
      canvas._cancelBurst = () => window.cancelAnimationFrame(raf);
      return true;
    }

    function setBigBangPhase(overlay, phase, cx, cy) {
      if (!overlay.isConnected) return;
      overlay.dataset.bigbangPhase = phase;
      document.body.dataset.bigbangPhase = phase;
      window.dispatchEvent(new CustomEvent("portfolio:bigbang-phase", { detail: { phase } }));

      if (phase === "eruption") {
        document.body.classList.add("cosmic-strike");
        window.dispatchEvent(new CustomEvent("portfolio:iris-bang"));
        blastEverythingFromImpact();
        window.setTimeout(() => document.body.classList.remove("cosmic-strike"), 820);
      } else if (phase === "shatter-primary") {
        createShatterOverlay(cx, cy);
      }
    }

    function scheduleBigBangPhases(overlay, cx, cy) {
      BIG_BANG_PHASES.forEach(({ phase, at }) => {
        if (at === 0) setBigBangPhase(overlay, phase, cx, cy);
        else window.setTimeout(() => setBigBangPhase(overlay, phase, cx, cy), at);
      });
    }

    function createDigitalIris(impactX, impactY, lowQuality = false) {
      const fragment = document.createDocumentFragment();
      const setImpact = (element) => {
        element.style.setProperty("--impact-x", impactX.toFixed(2) + "px");
        element.style.setProperty("--impact-y", impactY.toFixed(2) + "px");
      };

      const aperture = document.createElement("div");
      aperture.className = "bigbang-iris digital-iris-aperture";
      aperture.classList.toggle("is-low-quality", lowQuality);
      aperture.dataset.bigbangLayer = "digital-iris";
      setImpact(aperture);
      aperture.innerHTML = [
        "<div class='bigbang-iris-ring'></div>",
        "<div class='digital-iris-hud' aria-hidden='true'><i></i><i></i><i></i><i></i></div>",
        "<div class='digital-iris-reticle' aria-hidden='true'><span></span><span></span><span></span><span></span></div>",
        "<span class='digital-iris-readout digital-iris-readout--left'>OPTIC / 01<small>APERTURE SYNC</small></span>",
        "<span class='digital-iris-readout digital-iris-readout--right'>IRIS LINK<small>IDENTITY READY</small></span>",
      ].join("");
      for (let i = 0; i < IRIS_BLADES; i++) {
        const angle = (i * (360 / IRIS_BLADES)).toFixed(2) + "deg";
        const spoke = document.createElement("span");
        spoke.className = "bigbang-iris-spoke";
        spoke.style.setProperty("--blade-i", String(i));
        spoke.style.setProperty("--blade-angle", angle);
        const blade = document.createElement("span");
        blade.className = "bigbang-iris-blade";
        blade.style.setProperty("--blade-i", String(i));
        blade.style.setProperty("--blade-angle", angle);
        aperture.append(spoke, blade);
      }
      const pupil = document.createElement("span");
      pupil.className = "bigbang-iris-pupil";
      aperture.appendChild(pupil);
      fragment.appendChild(aperture);

      const scanner = document.createElement("div");
      scanner.className = "bigbang-nvidia-eye iris-boot-scanner digital-iris-scanner";
      scanner.dataset.bigbangLayer = "nvidia-formation";
      setImpact(scanner);
      scanner.innerHTML = [
        "<div class='iris-boot-housing'></div>",
        "<div class='iris-boot-blades'></div>",
        "<div class='iris-boot-scanline'></div>",
        "<span class='digital-iris-core' aria-hidden='true'></span>",
        "<img class='iris-boot-pupil' src='./assets/images/nvda-eye-ui.webp' alt='' width='75' height='42'>",
        "<span class='digital-iris-lock' aria-hidden='true'>IRIS // VERIFIED</span>",
      ].join("");
      const blades = $(".iris-boot-blades", scanner);
      for (let i = 0; i < IRIS_BLADES; i++) {
        const blade = document.createElement("span");
        blade.className = "iris-boot-blade";
        blade.style.setProperty("--blade-i", String(i));
        blade.style.setProperty("--blade-angle", (i * (360 / IRIS_BLADES)).toFixed(2) + "deg");
        blades.appendChild(blade);
      }
      fragment.appendChild(scanner);
      return fragment;
    }

    function createBigBangOverlay(cx, cy) {
      const deskRect = desk.getBoundingClientRect();
      const impactX = deskRect.left + cx;
      const impactY = deskRect.top + cy;
      const overlay = document.createElement("div");
      overlay.className = "cosmic-bigbang";
      overlay.dataset.bigbangLayer = "universe";
      overlay.setAttribute("aria-hidden", "true");
      overlay.style.setProperty("--impact-x", impactX.toFixed(2) + "px");
      overlay.style.setProperty("--impact-y", impactY.toFixed(2) + "px");
      const lowQuality = useLowEffectsQuality();

      [
        ["bigbang-void", "void"],
        ["bigbang-nebula-field", "nebula"],
        ["bigbang-lensing", "lensing"],
        ["bigbang-singularity", "singularity"],
        ["bigbang-detonation", "eruption"],
        ["bigbang-rayburst", "rayburst"],
        ["bigbang-green-wash", "green-wash"],
      ].forEach(([className, marker]) => {
        const layer = document.createElement("div");
        layer.className = className;
        layer.dataset.bigbangLayer = marker;
        overlay.appendChild(layer);
      });

      const rings = [
        { size: "7vmin", delay: "1.82s", color: "rgba(255,255,255,0.92)", mid: 11, end: 24 },
        { size: "11vmin", delay: "2.02s", color: "rgba(214,255,178,0.72)", mid: 10, end: 21 },
        { size: "16vmin", delay: "2.28s", color: "rgba(118,185,0,0.62)", mid: 8.8, end: 18 },
        { size: "21vmin", delay: "2.62s", color: "rgba(185,225,255,0.52)", mid: 7.8, end: 15 },
        { size: "28vmin", delay: "3.02s", color: "rgba(118,185,0,0.38)", mid: 6.8, end: 13 },
        { size: "36vmin", delay: "3.48s", color: "rgba(255,255,255,0.24)", mid: 5.7, end: 11 },
      ];
      rings.slice(0, lowQuality ? 4 : rings.length).forEach((ring) => {
        const el = document.createElement("div");
        el.className = "bigbang-ring bigbang-shockwave";
        el.dataset.bigbangLayer = "shockwave";
        el.style.setProperty("--impact-x", impactX.toFixed(2) + "px");
        el.style.setProperty("--impact-y", impactY.toFixed(2) + "px");
        el.style.setProperty("--ring-size", ring.size);
        el.style.setProperty("--ring-color", ring.color);
        el.style.setProperty("--ring-scale-mid", ring.mid);
        el.style.setProperty("--ring-scale-end", ring.end);
        el.style.setProperty("--delay", ring.delay);
        overlay.appendChild(el);
      });

      const pulseCount = lowQuality ? 4 : 7;
      for (let i = 0; i < pulseCount; i++) {
        const pulse = document.createElement("div");
        pulse.className = "bigbang-green-pulse";
        pulse.dataset.bigbangLayer = "green-pulse";
        pulse.style.setProperty("--impact-x", impactX.toFixed(2) + "px");
        pulse.style.setProperty("--impact-y", impactY.toFixed(2) + "px");
        pulse.style.setProperty("--pulse-size", (11 + i * 3.8).toFixed(1) + "vmin");
        pulse.style.setProperty("--pulse-delay", (2.7 + i * 0.38).toFixed(2) + "s");
        const pulseScaleX = 15.5 + i * 1.3;
        const pulseScaleY = 13 + (i % 3) * 1.9;
        pulse.style.setProperty("--pulse-scale-x", pulseScaleX.toFixed(2));
        pulse.style.setProperty("--pulse-scale-y", pulseScaleY.toFixed(2));
        pulse.style.setProperty("--pulse-scale-x-end", (pulseScaleX * 1.35).toFixed(2));
        pulse.style.setProperty("--pulse-scale-y-end", (pulseScaleY * 1.35).toFixed(2));
        pulse.style.setProperty("--pulse-rotation", ((i % 2 ? -1 : 1) * (4 + i * 2.7)).toFixed(1) + "deg");
        overlay.appendChild(pulse);
      }

      const rippleOrigins = [];
      const irisRadius = Math.min(window.innerWidth, window.innerHeight) * 0.46;
      const rippleBlades = lowQuality ? 5 : 8;
      for (let i = 0; i < rippleBlades; i++) {
        const angle = (i / rippleBlades) * Math.PI * 2 - Math.PI / 2;
        rippleOrigins.push({
          x: impactX + Math.cos(angle) * irisRadius,
          y: impactY + Math.sin(angle) * irisRadius,
          petal: i,
        });
      }
      rippleOrigins.forEach((origin, index) => {
        const ripple = document.createElement("div");
        const orbitScale = 0.13 + (index % rippleBlades) * 0.018;
        const orbitX = (impactX - origin.x) * orbitScale + (index % 2 ? 64 : -64);
        const orbitY = (impactY - origin.y) * orbitScale + (index % 3 ? -52 : 52);
        ripple.className = "bigbang-green-ripple";
        ripple.dataset.bigbangLayer = "green-ripple";
        ripple.style.setProperty("--start-x", origin.x.toFixed(2) + "px");
        ripple.style.setProperty("--start-y", origin.y.toFixed(2) + "px");
        ripple.style.setProperty("--to-x", (impactX - origin.x).toFixed(2) + "px");
        ripple.style.setProperty("--to-y", (impactY - origin.y).toFixed(2) + "px");
        ripple.style.setProperty("--orbit-x", orbitX.toFixed(2) + "px");
        ripple.style.setProperty("--orbit-y", orbitY.toFixed(2) + "px");
        ripple.style.setProperty("--ripple-size", (16 + (index % rippleBlades) * 2.2).toFixed(2) + "vmin");
        ripple.style.setProperty("--delay", (index * 0.08).toFixed(2) + "s");
        overlay.appendChild(ripple);
      });

      overlay.appendChild(createDigitalIris(impactX, impactY, lowQuality));

      const marketChart = document.createElement("div");
      marketChart.className = "bigbang-market-chart";
      marketChart.dataset.bigbangLayer = "nvidia-market";
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
      core.dataset.bigbangLayer = "green-core";
      core.style.setProperty("--impact-x", impactX.toFixed(2) + "px");
      core.style.setProperty("--impact-y", impactY.toFixed(2) + "px");
      overlay.appendChild(core);

      document.body.appendChild(overlay);
      mountUniverseBurst(overlay, impactX, impactY, lowQuality);

      scheduleBigBangPhases(overlay, cx, cy);
      window.setTimeout(() => overlay.remove(), BIG_BANG_DURATION + 500);
      return overlay;
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
      document.body.classList.remove("cosmic-active", "cosmic-armed", "cosmic-strike");
      document.body.removeAttribute("data-bigbang-phase");
      $$(".panel-shatter, .cosmic-shatter, .cosmic-bigbang").forEach((node) => node.remove());
      $$(".bigbang-target, .bigbang-pulled, .bigbang-blasted, .bigbang-hidden").forEach(clearBigBangMotion);
      $$(COSMIC_SUPPRESS_SELECTOR).forEach((el) => el.classList.remove("cosmic-suppressed"));
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
      let overlay = $(".panel-shatter");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "panel-shatter";
        overlay.dataset.bigbangLayer = "panel-shatter";
        overlay.setAttribute("aria-hidden", "true");
        document.body.appendChild(overlay);
        window.setTimeout(() => overlay.remove(), PANEL_SHATTER_DURATION);
      }

      const maxPieces = useLowEffectsQuality() ? 12 : 24;
      const availablePieces = Math.max(0, maxPieces - overlay.childElementCount);
      if (!availablePieces) return;
      const columns = 4;
      const rows = 3;
      const pieceW = rect.width / columns;
      const pieceH = rect.height / rows;
      const random = createSeededRandom(Math.round(rect.left * 23 + rect.top * 41 + rect.width * rect.height));
      let created = 0;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          if (created >= availablePieces) break;
          const shard = document.createElement("div");
          const dx = nx * (190 + random() * 260) + (random() - 0.5) * 170;
          const dy = ny * (190 + random() * 260) + (random() - 0.5) * 170;
          const rot = (random() - 0.5) * 180;
          shard.className = "panel-shard";
          shard.dataset.bigbangLayer = "panel-shard";
          shard.style.setProperty("--psx", (rect.left + col * pieceW).toFixed(2) + "px");
          shard.style.setProperty("--psy", (rect.top + row * pieceH).toFixed(2) + "px");
          shard.style.setProperty("--psw", (pieceW + 1).toFixed(2) + "px");
          shard.style.setProperty("--psh", (pieceH + 1).toFixed(2) + "px");
          shard.style.setProperty("--pdx", dx.toFixed(2) + "px");
          shard.style.setProperty("--pdy", dy.toFixed(2) + "px");
          shard.style.setProperty("--pdx-end", (dx * 1.55).toFixed(2) + "px");
          shard.style.setProperty("--pdy-end", (dy * 1.55).toFixed(2) + "px");
          shard.style.setProperty("--prot", rot.toFixed(2) + "deg");
          shard.style.setProperty("--prot-end", (rot * 2.1).toFixed(2) + "deg");
          shard.style.setProperty("--p1", Math.floor(random() * 14) + "% " + Math.floor(random() * 10) + "%");
          shard.style.setProperty("--p2", (86 + Math.floor(random() * 14)) + "% " + Math.floor(random() * 16) + "%");
          shard.style.setProperty("--p3", (82 + Math.floor(random() * 18)) + "% " + (82 + Math.floor(random() * 18)) + "%");
          shard.style.setProperty("--p4", Math.floor(random() * 18) + "% " + (82 + Math.floor(random() * 18)) + "%");
          overlay.appendChild(shard);
          created += 1;
        }
      }
    }

    function blastEverythingFromImpact() {
      getBigBangTargets().forEach((target) => {
        const vector = target._bbVector || { nx: Math.random() > 0.5 ? 1 : -1, ny: Math.random() > 0.5 ? 1 : -1 };
        const impactRect = target.getBoundingClientRect();
        const blast = Math.max(window.innerWidth, window.innerHeight) * 0.9 + Math.random() * 260;
        const blastX = vector.nx * blast;
        const blastY = vector.ny * blast;
        const finalLeft = impactRect.left + blastX;
        const finalRight = impactRect.right + blastX;
        const finalTop = impactRect.top + blastY;
        const finalBottom = impactRect.bottom + blastY;
        const hitWall = finalLeft < 0 || finalRight > window.innerWidth || finalTop < 0 || finalBottom > window.innerHeight;

        target.style.setProperty("--bb-blast-x", blastX.toFixed(2) + "px");
        target.style.setProperty("--bb-blast-y", blastY.toFixed(2) + "px");
        target.style.setProperty("--bb-rot", ((Math.random() - 0.5) * 28).toFixed(2) + "deg");
        target.classList.remove("bigbang-pulled");
        target.classList.add("bigbang-blasted");

        if (hitWall) {
          const shatterEligible = !target.matches(".desktop-video, .desktop-bg")
            && impactRect.width < window.innerWidth * 0.78
            && impactRect.height < window.innerHeight * 0.78;
          if (shatterEligible) {
            window.setTimeout(() => createPanelShatter(impactRect, vector.nx, vector.ny), 340);
          }
          window.setTimeout(() => target.classList.add("bigbang-hidden"), 760);
        }
      });
    }

    function closePanelsForReconstruct() {
      WM.closeAll();
      $$(".win").forEach((panel) => {
        clearReconstructState(panel);
        panel.style.removeProperty("transform");
        panel.style.removeProperty("filter");
      });
    }

    function dismissBrandCores() {
      const microsoft = $("#microsoft-orb");
      const apple = $("#apple-orb");
      const grey = $("#greyhole");
      if (microsoft) microsoft.classList.add("is-collapsed");
      if (apple) apple.classList.add("is-collapsed");
      if (grey) {
        grey.classList.remove("is-formed", "is-active");
        grey.style.removeProperty("--gh-x");
        grey.style.removeProperty("--gh-y");
      }
      lightningMounts.forEach((mount) => { if (mount) mount.destroy(); });
      lightningMounts = [];
      window.cancelAnimationFrame(raf);
      raf = 0;
      wells = [];
      motionStarted = false;
    }

    function consumeIrisLauncher() {
      const launcher = $("[data-iris-launch]");
      const trigger = launcher && $("[data-action='iris-sequence']", launcher);
      if (trigger) trigger.disabled = true;
      if (launcher) {
        launcher.classList.add("is-consumed");
        launcher.inert = true;
        window.setTimeout(() => launcher.remove(), 520);
      }
      const desktop = $("#desktop");
      if (desktop) desktop.focus({ preventScroll: true });
    }

    function restoreStartupWindowsStaged(startDelay) {
      const startup = isMobile()
        ? []
        : [{ id: "about", left: "max(42px, 6vw)", top: "58px", delay: startDelay }];

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
      document.body.classList.remove("pre-iris");

      if (reduceMotion) {
        if (!isMobile()) {
          const about = WM.wins.about;
          if (about) {
            about.style.left = "max(42px, 6vw)";
            about.style.top = "58px";
          }
          WM.open("about");
        }
        setFlowPhase("nvidia-desktop", { mode: "nvidia" });
        return;
      }

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
      const startupDelay = 3260 + dockContents.length * 85 + 520;
      restoreStartupWindowsStaged(startupDelay);
      window.setTimeout(() => setFlowPhase("nvidia-desktop", { mode: "nvidia" }), startupDelay + 980);
    }

    function beginNvidiaLogin() {
      switchToDgxTheme();
      cleanupBigBangState();
      closePanelsForReconstruct();
      setFlowPhase("nvidia-login", { mode: "nvidia" });
      LOGIN_FLOW.run("iris").then(() => {
        window.dispatchEvent(new CustomEvent("portfolio:iris-boot"));
        reconstructScene();
      });
    }

    function triggerCollision(microsoft, apple) {
      if (collisionDone) return;
      collisionDone = true;
      collisionArmed = false;
      document.body.classList.remove("cosmic-armed");
      document.body.classList.add("cosmic-active");
      setFlowPhase("bigbang", { mode: "split" });

      const cx = (microsoft.cx + apple.cx) / 2;
      const cy = (microsoft.cy + apple.cy) / 2;

      dismissBrandCores();
      suppressCollisionChrome();
      pullEverythingToImpact(cx, cy);
      window.setTimeout(() => createBigBangOverlay(cx, cy), PRE_EXPLOSION_PULL_DURATION);
      window.setTimeout(beginNvidiaLogin, PRE_EXPLOSION_PULL_DURATION + BIG_BANG_DURATION);
    }

    function checkCollision() {
      if (collisionDone || !collisionArmed) return false;
      const microsoft = wells.find((well) => well.id === "microsoft-orb");
      const apple = wells.find((well) => well.id === "apple-orb");
      if (!microsoft || !apple) return false;

      const distance = Math.hypot(microsoft.cx - apple.cx, microsoft.cy - apple.cy);
      const threshold = Math.max(12, microsoft.size * 0.1 + apple.size * 0.11);
      if (distance > threshold) return false;

      triggerCollision(microsoft, apple);
      return true;
    }

    function armCollision() {
      if (collisionArmed) return;
      if (collisionDone) {
        notify("IRIS sequence", "The cinematic has already completed for this session.");
        return;
      }
      const microsoft = wells.find((well) => well.id === "microsoft-orb");
      const apple = wells.find((well) => well.id === "apple-orb");
      if (!microsoft || !apple) return;
      consumeIrisLauncher();
      if (reduceMotion) {
        collisionDone = true;
        dismissBrandCores();
        switchToDgxTheme();
        setFlowPhase("nvidia-login", { mode: "nvidia" });
        notify("IRIS sequence", "Motion reduced. Continuing through a shortened verification.");
        LOGIN_FLOW.run("iris").then(() => {
          window.dispatchEvent(new CustomEvent("portfolio:iris-boot"));
          reconstructScene();
        });
        return;
      }
      collisionArmed = true;
      document.body.classList.add("cosmic-armed");
      setFlowPhase("collision-armed", { mode: "split" });
      aimBrandCoresAtEachOther();
      notify("IRIS sequence armed", "Microsoft and Apple energy cores are converging.", { ttl: 2800 });
    }

    function separateBrandCores(dt) {
      const microsoft = wells.find((well) => well.id === "microsoft-orb");
      const apple = wells.find((well) => well.id === "apple-orb");
      if (!microsoft || !apple) return;

      const dx = microsoft.cx - apple.cx;
      const dy = microsoft.cy - apple.cy;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const influence = (microsoft.size + apple.size) * 0.74;
      if (distance > influence) return;

      const strength = Math.pow(1 - distance / influence, 2);
      const nx = dx / distance;
      const ny = dy / distance;
      const acceleration = 54 * strength;
      microsoft.vx += nx * acceleration * dt;
      microsoft.vy += ny * acceleration * dt;
      apple.vx -= nx * acceleration * dt;
      apple.vy -= ny * acceleration * dt;

      const overlap = (microsoft.size + apple.size) * 0.56 - distance;
      if (overlap > 0) {
        microsoft.cx += nx * overlap * 0.5;
        microsoft.cy += ny * overlap * 0.5;
        apple.cx -= nx * overlap * 0.5;
        apple.cy -= ny * overlap * 0.5;
      }

      [microsoft, apple].forEach((well) => {
        const speed = Math.max(Math.hypot(well.vx, well.vy), 1);
        const clampedSpeed = clamp(speed, SPEED * 0.65, SPEED * 1.12);
        well.vx = (well.vx / speed) * clampedSpeed;
        well.vy = (well.vy / speed) * clampedSpeed;
      });
    }

    function steerBrandCoresTogether(dt) {
      const microsoft = wells.find((well) => well.id === "microsoft-orb");
      const apple = wells.find((well) => well.id === "apple-orb");
      if (!microsoft || !apple) return;

      const dx = apple.cx - microsoft.cx;
      const dy = apple.cy - microsoft.cy;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const nx = dx / distance;
      const ny = dy / distance;
      const steer = 0.55 * dt;
      microsoft.vx += nx * steer;
      microsoft.vy += ny * steer;
      apple.vx -= nx * steer;
      apple.vy -= ny * steer;

      [microsoft, apple].forEach((well) => {
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
      if (!wells.length || document.hidden) {
        raf = 0;
        return;
      }
      let frameDt = 0;
      wells.forEach((well) => {
        const dt = Math.min((now - well.lastTime) / 1000, 0.25);
        frameDt = Math.max(frameDt, dt);
        well.lastTime = now;
        well.size = getSize(well, now);
      });
      if (checkCollision()) {
        raf = 0;
        return;
      }
      if (collisionArmed) steerBrandCoresTogether(frameDt);
      else separateBrandCores(frameDt);
      wells.forEach((well) => {
        const dt = frameDt;
        well.cx += well.vx * dt;
        well.cy += well.vy * dt;
        keepInBounds(well);
        paint(well);
      });
      if (collisionArmed) warpNearby();
      else clearWarpClasses();
      raf = requestAnimationFrame(frame);
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

    function startMotion() {
      if (motionStarted || reduceMotion || !wells.length) return;
      motionStarted = true;
      const now = performance.now();
      wells.forEach((well) => {
        well.startTime = now;
        well.lastTime = now;
        well.baseSize = getBaseSize();
        well.size = well.baseSize;
        paint(well);
      });
      if (typeof BRAND_LIGHTNING !== "undefined" && !lightningMounts.length) {
        lightningMounts = BRAND_LIGHTNING.init().filter(Boolean);
      }
      if (!raf) raf = requestAnimationFrame(frame);
    }

    function init() {
      desk = $(".desktop");
      if (!desk) return;

      const now = performance.now();
      wells = BRAND_CONFIGS.map((config) => {
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
      wells.forEach((well) => paint(well));

      if (reduceMotion) {
        wells.forEach((well) => paint(well));
        return;
      }

      window.addEventListener("resize", resize);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          window.cancelAnimationFrame(raf);
          raf = 0;
          return;
        }
        if (!motionStarted) return;
        const resumedAt = performance.now();
        wells.forEach((well) => { well.lastTime = resumedAt; });
        if (!raf && wells.length) raf = requestAnimationFrame(frame);
      });
      if (document.body.dataset.flowPhase === "brand-desktop") startMotion();
      else window.addEventListener("portfolio:login-complete", startMotion, { once: true });
    }

    return {
      init,
      armCollision,
      getState() {
        return {
          armed: collisionArmed,
          complete: collisionDone,
          motionStarted,
          growthRate: GROWTH_PER_SECOND,
          maxGrowth: MAX_GROWTH,
          cores: wells.map((well) => ({ id: well.id, baseSize: well.baseSize, size: well.size, x: well.cx, y: well.cy })),
        };
      },
    };
  })();

  /* =============================================================
     INIT
     ============================================================= */
  function showKeyboardHints() {
    if (isMobile()) return;
    try {
      if (window.localStorage.getItem("portfolio-kbd-hint") === "1") return;
      window.localStorage.setItem("portfolio-kbd-hint", "1");
    } catch (_) {}
    const isApple = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
    const mod = isApple ? "⌘" : "Ctrl";
    window.setTimeout(() => {
      notify("Keyboard shortcuts", mod + "+K search · F3 task view · Esc minimize", { ttl: 4200 });
    }, 4200);
  }

  function init() {
    clock();
    WM.init();
    dock();
    currentOsMode = document.body.classList.contains("theme-dgx")
      ? "nvidia"
      : (document.body.classList.contains("theme-windows-only")
        ? "windows"
        : (document.body.classList.contains("theme-mac-only") ? "macos" : "split"));
    osSwitcher();
    syncOsSwitcher(currentOsMode);
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
    ASSET_VAULT.init();
    lightbox();
    copyHooks();
    GPU.start();
    GITHUB_APP.init();
    DIAGNOSTICS.init();
    TERM.init();
    BRAND_COLLISION.init();
    initWallpaperVideo();

    const params = new URLSearchParams(location.search);
    const deepApp = (params.get("app") || location.hash.replace(/^#\/?/, "")).trim().toLowerCase();
    const validApps = ["about", "experience", "skills", "projects", "certificates", "sideprojects", "terminal", "gpu", "github", "diagnostics", "contact"];
    const hasDeepLink = validApps.includes(deepApp);

    window.__portfolio = {
      openApp(id) { WM.open(id); },
      closeApp(id) { WM.close(id); },
      openAssetVault(path = "/") {
        WM.open("projects");
        ASSET_VAULT.navigate(path, { reason: "api" });
      },
      getAssetVaultState() { return ASSET_VAULT.snapshot(); },
      launchIris() { BRAND_COLLISION.armCollision(); },
      switchMode(mode) { return setOsMode(mode); },
      notify,
      getMode() { return currentOsMode; },
      getFlowState() {
        return {
          phase: document.body.dataset.flowPhase || "",
          mode: currentOsMode,
          authenticatedModes: LOGIN_FLOW.getAuthenticatedModes(),
          collision: BRAND_COLLISION.getState(),
          lightning: typeof BRAND_LIGHTNING !== "undefined" ? BRAND_LIGHTNING.snapshot() : [],
          loginActive: LOGIN_FLOW.isActive(),
        };
      },
    };

    boot().then(() => {
      if (hasDeepLink) WM.open(deepApp);
      showKeyboardHints();
      window.dispatchEvent(new CustomEvent("portfolio:ready"));
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
