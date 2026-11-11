// Programma qobig'ini saqlab qo'yadi (ma'lumotlar har doim internetdan olinadi)
// v4: push xabarlarni qabul qiladi
const CACHE = 'ishlar-v13';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'ovoz/ijro.mp3', 'ovoz/murojaat.mp3', 'ovoz/malumot.mp3'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES).catch(() => {}))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Google so'rovlariga tegmaymiz
  e.respondWith(
    fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});

/* ---- Push xabarlar (yangi EDO hujjati, ertalabki eslatma) ---- */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { matn: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.sarlavha || 'Alizamon ishlar', {
    body: d.matn || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tur || 'xabar',
    data: { url: './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return clients.openWindow('./');
  }));
});
