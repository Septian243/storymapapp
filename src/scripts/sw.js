import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

precacheAndRoute(self.__WB_MANIFEST || []);

const STATIC_CACHE = 'story-app-static-v1';
const DYNAMIC_CACHE = 'story-app-dynamic-v1';
const API_CACHE = 'story-app-api-v1';
const IMAGE_CACHE = 'story-app-image-v1';

registerRoute(
    ({ url, request }) =>
        url.origin === 'https://story-api.dicoding.dev' &&
        url.pathname === '/v1/stories' &&
        request.method === 'GET',
    new NetworkOnly()
);

registerRoute(
    ({ url, request }) =>
        url.origin === 'https://story-api.dicoding.dev' &&
        url.pathname !== '/v1/stories',
    new NetworkFirst({
        cacheName: API_CACHE,
        networkTimeoutSeconds: 5,
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
        ],
    })
);

registerRoute(
    ({ request }) => request.destination === 'image',
    new CacheFirst({
        cacheName: IMAGE_CACHE,
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
            }),
        ],
    })
);

registerRoute(
    ({ request, url }) =>
        ['style', 'script', 'font'].includes(request.destination) &&
        (url.hostname.includes('unpkg.com') ||
            url.hostname.includes('cdn.jsdelivr.net') ||
            url.hostname.includes('cdnjs.cloudflare.com')),
    new StaleWhileRevalidate({
        cacheName: STATIC_CACHE,
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
        ],
    })
);

registerRoute(
    ({ request }) => request.mode === 'navigate',
    new NetworkFirst({
        cacheName: DYNAMIC_CACHE,
        networkTimeoutSeconds: 3,
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
        ],
    })
);

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
                            console.log('✅ Preloaded image:', url);
                        }
                    }
                } catch (err) {
                    console.warn('❌ Failed to preload image:', url, err);
                }
            });
        });
    }

    if (event.data && event.data.type === 'CLEAR_API_CACHE') {
        caches.delete(API_CACHE).then(() => {
            console.log('✅ API cache cleared');
        });
    }
});

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