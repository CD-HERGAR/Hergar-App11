// HERGAR F11 · service worker (v138)
// - La app (index.html) se pide primero a internet, para que al subir una versión nueva salga sola;
//   si no hay cobertura (o tarda más de 4 s), se abre la última guardada.
// - Las librerías y las fuentes se guardan la primera vez y después se usan desde el móvil.
// - Lo demás (IA, Firebase, GitHub, OneSignal, el tiempo…) va siempre directo a internet.
const CACHE = 'hergar-f11-v138';
const APP = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
const LIBS = [
  'https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
  'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js'
];
const ESTATICOS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(APP);
    await Promise.all(LIBS.map(u => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k.startsWith('hergar-f11-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function primeroInternet(req) {
  const c = await caches.open(CACHE);
  try {
    const res = await Promise.race([
      fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-store' }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('lento')), 4000))
    ]);
    if (res && res.ok) c.put(req.mode === 'navigate' ? './index.html' : req, res.clone());
    return res;
  } catch (err) {
    const g = await c.match(req.mode === 'navigate' ? './index.html' : req, { ignoreSearch: true });
    if (g) return g;
    throw err;
  }
}

async function primeroGuardado(req) {
  const c = await caches.open(CACHE);
  const g = await c.match(req);
  if (g) return g;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) { e.respondWith(primeroInternet(req)); return; }
    if (url.pathname.startsWith(new URL('./', self.location).pathname)) { e.respondWith(primeroGuardado(req)); return; }
    return;
  }
  if (ESTATICOS.includes(url.hostname) || (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'))) {
    e.respondWith(primeroGuardado(req));
  }
});
