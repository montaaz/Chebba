/* Chebba Auto Car service worker: lets the app install and opens fast on a weak network.
   Pages and the API always come from the network (prices and bookings must be live);
   only build files, photos and icons are cached. */
const CACHE = "chebba-static-v1";
const OFFLINE = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hors connexion</title><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#021a1c;color:#f2f8f7;font-family:system-ui;text-align:center;padding:24px">
<div><p style="font-weight:800;letter-spacing:.2em">CHEBBA</p><h1 style="font-size:22px">Pas de connexion internet</h1>
<p style="color:#a9c6c5">Vérifiez votre réseau puis réessayez.</p>
<button onclick="location.reload()" style="margin-top:12px;padding:14px 24px;border:0;border-radius:99px;background:#86cfcf;font-weight:700">Réessayer</button></div>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  ),
);

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/img/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
  }
});
