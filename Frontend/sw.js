const CACHE_NAME = 'ration-v3';
const ASSETS = [
    './',
    './index.html',
    './customer-login.html',
    './dashboard.html',
    './booking.html',
    './css/style.css',
    './main.js',
    './translations.js',
    './charts.js',
    './admin.html',
    './admin-stock.html',
    './gov.html',
    './rebook.html'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});
