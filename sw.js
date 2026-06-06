// AmraniAds Service Worker — PWA + Push Notifications
const CACHE_NAME = 'amraniads-v1';
const OFFLINE_URLS = ['/salon/dashboard/', '/rentalcars/dashboard/', '/dashboard/'];

// Install: cache shell pages
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(OFFLINE_URLS).catch(() => {})
    )
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for shell
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always network for API and Apps Script calls
  if (url.pathname.startsWith('/api/') || url.hostname.includes('script.google.com')) {
    event.respondWith(fetch(event.request).catch(() => new Response('Offline', { status: 503 })));
    return;
  }

  // Network-first for dashboard pages (stay up to date)
  if (url.pathname.includes('/dashboard')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Default: network
  event.respondWith(fetch(event.request));
});

// Push notifications
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || '🆕 Nouveau lead', {
      body:    data.body    || 'Un nouveau lead vient d\'arriver.',
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-192.png',
      tag:     data.tag     || 'lead-notification',
      data:    { url: data.url || '/dashboard/' },
      actions: [
        { action: 'view', title: '👀 Voir' },
        { action: 'wa',   title: '💬 WhatsApp' }
      ],
      vibrate:  [200, 100, 200],
      requireInteraction: true
    })
  );
});

// Notification click → open dashboard
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
