/**
 * Decision OS — Service Worker
 *
 * Cache strategies:
 *   • App shell (HTML pages)  → Network-first, cache fallback
 *   • Static assets (JS/CSS)  → Cache-first, network fallback
 *   • Images & fonts          → Cache-first, long TTL
 *   • API calls (Supabase)    → Network-only (auth-sensitive)
 *   • Sentry                  → Network-only
 *
 * Cache invalidation: bump CACHE_VERSION on every deploy.
 * The "activate" handler deletes stale caches automatically.
 */

const CACHE_VERSION = "v1";
const CACHE_NAME = `decision-os-${CACHE_VERSION}`;

/** Assets to pre-cache on install */
const PRECACHE_URLS = [
  "/",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
];

// ─── Install ───────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ──────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("decision-os-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ─────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin API calls (Supabase, Sentry)
  if (url.origin !== self.location.origin) return;

  // Skip Next.js HMR / webpack dev server in development
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  // Static assets: Cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML pages: Network-first
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Next.js build assets (_next/static): Cache-first (content-hashed)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default: Network-first
  event.respondWith(networkFirst(request));
});

// ─── Strategies ────────────────────────────────────────────────────

/**
 * Cache-first: return cached response if available, otherwise fetch + cache.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not cached — return minimal offline fallback
    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/plain" },
    });
  }
}

/**
 * Network-first: try network, fall back to cache.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Offline and not cached
    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// ─── Helpers ───────────────────────────────────────────────────────

const STATIC_EXTENSIONS = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/;

function isStaticAsset(pathname) {
  return STATIC_EXTENSIONS.test(pathname);
}
