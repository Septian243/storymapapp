/* ===== Workbox Integration ===== */
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';

// 🧩 Ini baris wajib untuk InjectManifest — Workbox akan inject file build di sini
precacheAndRoute(self.__WB_MANIFEST || []);

/* ===== Custom Cache Names ===== */
const STATIC_CACHE = 'story-app-static-v1';
const DYNAMIC_CACHE = 'story-app-dynamic-v1';
const API_CACHE = 'story-app-api-v1';
const IMAGE_CACHE = 'story-app-image-v1';

/* ===== Manual Routing Tambahan ===== */

// API Story Dicoding
registerRoute(
    ({ url }) => url.origin === 'https://story-api.dicoding.dev',
    new NetworkFirst({
        cacheName: API_CACHE,
        networkTimeoutSeconds: 3,
    })
);

// Gambar
registerRoute(
    ({ request }) => request.destination === 'image',
    new StaleWhileRevalidate({
        cacheName: IMAGE_CACHE,
    })
);

// Font, script, style dari CDN
registerRoute(
    ({ request, url }) =>
        ['style', 'script', 'font'].includes(request.destination) &&
        (url.hostname.includes('unpkg.com') ||
            url.hostname.includes('cdn.jsdelivr.net') ||
            url.hostname.includes('cdnjs.cloudflare.com')),
    new StaleWhileRevalidate({
        cacheName: STATIC_CACHE,
    })
);

// Offline fallback untuk navigasi
registerRoute(
    ({ request }) => request.mode === 'navigate',
    new NetworkFirst({
        cacheName: DYNAMIC_CACHE,
        networkTimeoutSeconds: 3,
    })
);

/* ===== Manual Custom Logic Tambahan (Push, Message, dll) ===== */

// Preload gambar lewat pesan dari halaman
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_IMAGES') {
        const imageUrls = event.data.urls || [];
        caches.open(IMAGE_CACHE).then((cache) => {
            imageUrls.forEach(async (url) => {
                try {
                    const cached = await cache.match(url);
                    if (!cached) {
                        const response = await fetch(url);
                        if (response && response.status === 200) {
                            await cache.put(url, response);
                            console.log('✅ Preloaded:', url);
                        }
                    }
                } catch (err) {
                    console.warn('❌ Failed to preload:', url, err);
                }
            });
        });
    }
});

/* ===== Push Notification ===== */
self.addEventListener('push', (event) => {
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (err) {
            data = {
                title: 'Story App',
                options: { body: event.data.text() },
            };
        }
    }

    const title = data.title || 'Story App';
    const options = {
        body: data.options?.body || 'Notifikasi baru dari Story App!',
        icon: '/images/icons/logo-192.png',
        badge: '/images/icons/logo-96.png',
        vibrate: [100, 50, 100],
        data: { url: data.url || '/' },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

/* ===== Notification Click ===== */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) return client.focus();
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url || '/');
            }
        })
    );
});
