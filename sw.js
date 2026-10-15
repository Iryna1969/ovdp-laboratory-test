// Version 6: navigation is network-first, offline fallback from cache.
const CACHE='ovdp-lab-exp6-cache-v1';
const FILES=['./','./index.html','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('ovdp-lab-exp')&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim()})())});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
if(req.mode==='navigate'){event.respondWith((async()=>{try{const response=await fetch(req,{cache:'no-store'});if(response.ok){const cache=await caches.open(CACHE);await cache.put('./index.html',response.clone());await cache.put('./',response.clone())}return response}catch(e){return (await caches.match('./index.html'))||(await caches.match('./'))||Response.error()}})());return}
event.respondWith((async()=>{try{const response=await fetch(req,{cache:'no-store'});if(response.ok){const cache=await caches.open(CACHE);await cache.put(req,response.clone())}return response}catch(e){return (await caches.match(req,{ignoreSearch:true}))||Response.error()}})())});
