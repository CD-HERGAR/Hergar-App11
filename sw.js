// Service worker antiguo de la raíz: se borra solo (la app está ahora en app/)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  const ks = await caches.keys();
  await Promise.all(ks.filter(k => k.startsWith('hergar-f11-')).map(k => caches.delete(k)));
  await self.registration.unregister();
})()));
