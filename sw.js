const CACHE='neetos-shell-v10';
const SHELL=['/','/manifest.json','/test-planner.js'];
const STATIC_EXT=/\.(?:css|js|png|svg|webp|ico|woff2?)$/i;
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin||new URL(e.request.url).pathname.startsWith('/api/'))return;const request=e.request,url=new URL(request.url);if(request.mode==='navigate'){e.respondWith(fetch(request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put('/',r.clone()));return r}).catch(()=>caches.match(request).then(r=>r||caches.match('/'))));return;}if(STATIC_EXT.test(url.pathname)||url.pathname==='/manifest.json'){e.respondWith(caches.match(request).then(cached=>{const network=fetch(request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(request,r.clone()));return r}).catch(()=>cached);return cached||network;}));}});
