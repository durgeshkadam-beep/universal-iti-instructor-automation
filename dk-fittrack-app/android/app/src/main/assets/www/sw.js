const CACHE="dk-fittrack-v1";
const ASSETS=["./","./index.html","./styles.css","./v3.css","./app.js","./v3.js","./sync.js","./firebase-config.js","./cloud.js","./manifest.json","./icons/icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
