// Offline shell, versioned independently from user data in IndexedDB.
const CACHE='ovdp-lab-shell-v125';
const ASSETS=['./','./index.html','./src/app.js','./src/db.js','./src/nbu.js','./src/yield.js','./src/forecast.js','./src/compare.js','./src/style.css','./manifest.webmanifest','./assets/icon.svg','./assets/themes/rose.webp','./assets/themes/peach.webp','./assets/themes/lavender.webp','./assets/themes/berry.webp','./assets/themes/autumn.webp','./assets/themes/sky.webp','./assets/themes/lime.webp','./assets/themes/emerald.webp','./data/nbu-snapshot.json'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(ASSETS);
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('ovdp-lab-shell-')&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return; // NBU is online-only and never faked by the cache.
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(request);
    if(cached)return cached;
    try{return await fetch(request)}catch(error){
      if(request.mode==='navigate'){
        const fallback=await cache.match('./index.html');
        if(fallback)return fallback;
      }
      throw error;
    }
  })());
});
