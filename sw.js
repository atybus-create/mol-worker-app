self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  try{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('mol-worker-app-')).map(k=>caches.delete(k)));
    await self.registration.unregister();
  }catch(_){/* retirement best effort */}
})()));
self.addEventListener('fetch',()=>{});
