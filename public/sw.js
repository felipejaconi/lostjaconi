self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', async () => {
  // Unregister this service worker
  const registration = await self.registration;
  if (registration) {
    await registration.unregister();
  }
  
  // Clear all caches to fix stale app problems
  const keys = await caches.keys();
  await Promise.all(keys.map(key => caches.delete(key)));
  
  // Force clients to reload
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) {
    client.navigate(client.url);
  }
});
