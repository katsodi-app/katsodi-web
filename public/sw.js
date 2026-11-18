/*
 * Katsodi service worker. Deliberately small:
 *
 * - It precaches one public offline page with its font and icon.
 * - It answers a failed page navigation with that offline page.
 * - It touches nothing else: no API, Server Action, RSC/flight request,
 *   chunk, image, private media, auth callback, invitation or room data is
 *   read from or written to a cache here. Those always go to the network
 *   through the browser's normal HTTP cache, so pages, payloads and chunks of
 *   different deployments are never mixed by this worker.
 *
 * Updates: there is no skipWaiting() and no clients.claim(). A new version
 * waits until every Katsodi tab and window is closed, so it never takes over
 * during a call, a screen share or an unsent form.
 *
 * Bump CACHE when the precached files change.
 */
const CACHE = "katsodi-offline-v1";
const OFFLINE_URL = "/offline/index.html";
const PRECACHE = [
  OFFLINE_URL,
  "/fonts/manrope/manrope-latin.woff2",
  "/fonts/manrope/manrope-cyrillic.woff2",
  "/icons/icon-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" }))),
      ),
  );
});

self.addEventListener("activate", (event) => {
  // Remove only this worker's own older caches; other site storage stays.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("katsodi-offline-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The offline page's own files, when the network cannot serve them.
  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(url.pathname).then((cached) => cached || Response.error()),
      ),
    );
    return;
  }

  // A page load: always the network; the offline page only when it fails.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match(OFFLINE_URL)
          .then((cached) => cached || Response.error()),
      ),
    );
  }
  // Everything else is left to the browser.
});
