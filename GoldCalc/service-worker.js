/* ==========================================================
   Amin Gold Calculator — Service Worker (v2.5.0)
   اجرای آفلاین + نصب روی موبایل (PWA)
========================================================== */

const SW_VERSION = "v2.6.0";
const CORE_CACHE = "amin-gold-core-" + SW_VERSION;
const API_CACHE = "amin-gold-api-" + SW_VERSION;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon192.png",
  "./icon512.png",
  "./apple-touch-icon.png"
];

/* هاست‌های نرخ بازار: اول اینترنت، اگر نبود کش */
const API_HOSTS = new Set([
  "api.gold-api.com",
  "api.coinbase.com",
  "api.kraken.com",
  "www.okx.com",
  "r.jina.ai",
  "api.cors.lol",
  "apiv2.nobitex.ir",
  "call1.tgju.org",
  "call3.tgju.org"
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => { /* اگر فایلی نبود، نصب متوقف نشود */ })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.indexOf("amin-gold-") === 0 && k !== CORE_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (!req || req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  /* نرخ بازار: اول اینترنت، اگر نبود آخرین کش */
  if (API_HOSTS.has(url.hostname)) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(API_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req).then((hit) => {
        if (hit) return hit;
        throw new Error("offline");
      }))
    );
    return;
  }

  /* فایل‌های برنامه: اول کش، اگر نبود اینترنت */
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        const cacheableHost =
          url.origin === self.location.origin ||
          url.hostname.endsWith("googleapis.com") ||
          url.hostname.endsWith("gstatic.com");
        if (res && (res.ok || res.type === "opaque") && cacheableHost) {
          const copy = res.clone();
          caches.open(CORE_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      });
    }).catch(() => {
      if (req.mode === "navigate") return caches.match("./index.html");
      throw new Error("offline");
    })
  );
});
