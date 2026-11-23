self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await caches.delete('raiz-entregador-v1');
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) {
      await client.navigate(client.url);
    }
  })());
});
