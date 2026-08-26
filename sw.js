const CACHE='focus-guardian-v19';
const SHELL=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./assets/zinhologo.jpg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET'||new URL(req.url).pathname.includes('/api/'))return;e.respondWith(req.mode==='navigate'||['script','style'].includes(req.destination)?fetch(req,{cache:'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy));return r}).catch(()=>caches.match(req)):caches.match(req).then(r=>r||fetch(req)))});
