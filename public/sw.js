/* =========================================================================
   Sahayak service worker. T-CACHE (D4 §4.1), F3, O-01.

   Hand-written rather than generated, per DECISION-008: T-CACHE has
   specific invalidation behaviour that a generic PWA plugin would hide,
   and D4 requires it to be testable rather than assumed.

   WHAT THIS DOES NOT DO, deliberately:

   - No Background Sync, and no submission queue. D3 S8 is explicit:
     offline submission "completes LOCALLY - nothing is transmitted in the
     prototype, so connectivity is irrelevant... no queue, no 'reconcile'
     language anywhere." A retry queue here would invent a transmission
     the product promises never happens, and would contradict S11.

   - No caching of /api/*. T-SRV is last-write-wins on live state
     (D4 §4.5); a cached response could resurrect a stale journey.

   - No caching of document blobs. Those live in IndexedDB and never
     travel over the network at all (P3).
   ========================================================================= */

const VERSION = "v1";
const SHELL_CACHE = `sbn.shell.${VERSION}`;
const PACK_CACHE = `sbn.packs.${VERSION}`;

/* The minimum needed for the app to open with no network. Kept small:
   S1 budgets 1.5s to tappable on 3G, and a fat precache competes with
   the first render for the same bandwidth. */
const SHELL_ASSETS = ["/", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      // A precache miss must not block activation: the app still works
      // online, and failing to install would leave the user with no
      // service worker at all.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("sbn.") && !key.endsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never interfere with mutations or with T-SRV.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Journey packs: cache-first, revalidated in the background.
  // D4 T-CACHE: "cached on first S5 render (F3)... evictable by the
  // browser (recovered via refetch, E-13 if offline)". A cache miss while
  // offline resolves to a network error, which is exactly what S5 needs
  // in order to render E-13 rather than an empty journey.
  if (url.pathname.startsWith("/packs/")) {
    event.respondWith(cacheFirstRevalidate(request, PACK_CACHE));
    return;
  }

  // Immutable hashed build output: cache-first, no revalidation needed.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Navigations: network-first so content is fresh when online, with the
  // cached shell as the offline path. F3 requires S5, S6 and S7 to stay
  // readable offline.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function cacheFirstRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);

  // Serve the cached pack immediately when present. S5 surfaces the
  // staleness itself, via the `last_verified` note on the card; that is a
  // content decision and not the worker's to make.
  if (cached) return cached;

  const fresh = await network;
  if (fresh) return fresh;

  // No cache and no network: let it fail so S5 can render E-13.
  return Response.error();
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match("/offline");
    if (offline) return offline;
    return Response.error();
  }
}
