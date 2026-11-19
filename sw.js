const cachePrefix='cnc-reference-'+new URL(self.registration.scope).pathname+'-';
const version=cachePrefix+'2026-11-18-1';
const assets=['./','./index.html','./app.css','./app.js','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png','./fanuc.json','./siemens.json','./gcodes.json'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(version).then(cache=>cache.addAll(assets.map(path=>new Request(path,{cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith(cachePrefix)&&name!==version).map(name=>caches.delete(name)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||!event.request.url.startsWith(self.registration.scope))return;
  event.respondWith(caches.open(version).then(async cache=>{
    const cached=await cache.match(event.request.mode==='navigate'?'./index.html':event.request,{ignoreSearch:true});
    return cached||fetch(event.request);
  }));
});
