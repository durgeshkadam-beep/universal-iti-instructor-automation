const CACHE = "iti-v14-cloud-drive";
const ASSETS = ["./", "./index.html", "./style.css", "./app.js", "./ai.js", "./cloud.js", "./official-plans.js", "./manifest.json", "./icon.svg", "./logo.png"];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch", e=>{
  e.respondWith(
    caches.open(CACHE).then(cache=>cache.match(e.request).then(cached=>cached || fetch(e.request).then(resp=>{
      if(e.request.method==="GET" && resp && resp.status===200) cache.put(e.request, resp.clone());
      return resp;
    }).catch(()=>cache.match("./index.html"))))
  );
});
