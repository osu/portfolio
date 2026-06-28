const SHELL_CACHE = "portfolio-shell-v21";
const RUNTIME_CACHE = "portfolio-runtime-v2";
const MAX_RUNTIME_ENTRIES = 32;
const MAX_CACHEABLE_BYTES = 2 * 1024 * 1024;

const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/css/geforce-os.min.css",
  "./assets/js/hole-lightning.min.js",
  "./assets/js/geforce-os.min.js",
  "./assets/js/portfolio-fx.min.js",
  "./assets/images/nvda-eye.png",
  "./assets/images/nvda-eye-ui.webp",
  "./assets/images/Microsoft_icon.svg.png",
  "./assets/images/apple-logo.svg",
  "./assets/images/macos-bg-optimized.webp",
  "./assets/images/windows-bg-optimized.webp",
  "./assets/images/hasan-avatar.webp",
  "./assets/images/vault/ai-disease.webp",
  "./assets/images/vault/spotify-analysis.webp",
  "./assets/images/vault/beartracks.webp",
  "./assets/images/vault/maze-pathfinder.webp",
  "./assets/images/vault/quantum-genomics.webp",
  "./assets/images/vault/focusboost.webp",
  "./assets/images/vault/software-product.webp",
  "./assets/images/vault/test-automation.webp",
  "./assets/images/vault/cybersecurity.webp",
  "./assets/images/vault/github-career.webp",
  "./assets/images/vault/kuudra-gang.webp",
  "./assets/images/pwa-icon-192.png",
  "./assets/images/pwa-icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const current = new Set([SHELL_CACHE, RUNTIME_CACHE]);
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !current.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function trimRuntimeCache(cache) {
  const keys = await cache.keys();
  const overflow = keys.length - MAX_RUNTIME_ENTRIES;
  if (overflow <= 0) return;
  await Promise.all(keys.slice(0, overflow).map((request) => cache.delete(request)));
}

function isSmallCacheableResponse(response) {
  if (!response || response.status !== 200 || response.type !== "basic") return false;
  const size = Number(response.headers.get("content-length"));
  return Number.isFinite(size) && size > 0 && size <= MAX_CACHEABLE_BYTES;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("range")) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.destination === "video" || request.destination === "audio") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith((async () => {
    const shell = await caches.open(SHELL_CACHE);
    const shellHit = await shell.match(request);
    if (shellHit) return shellHit;

    const runtime = await caches.open(RUNTIME_CACHE);
    const runtimeHit = await runtime.match(request);
    if (runtimeHit) return runtimeHit;

    const response = await fetch(request);
    if (isSmallCacheableResponse(response)) {
      await runtime.put(request, response.clone());
      await trimRuntimeCache(runtime);
    }
    return response;
  })());
});
