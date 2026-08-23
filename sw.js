const CACHE = "iti-v14-2-admission-import";
const ASSETS = ["./", "./start.html", "./index.html", "./style.css", "./app.js", "./ai.js", "./cloud.js", "./admission-import.js", "./official-plans.js", "./manifest.json", "./icon.svg", "./logo.png"];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener("fetch", e=>{
  const url = new URL(e.request.url);

  // index.html already loads cloud.js. Append the optional admission importer to that
  // script response so existing HTML does not need a risky full-file rewrite.
  if(e.request.method==="GET" && url.pathname.endsWith("/cloud.js")){
    e.respondWith(
      caches.open(CACHE).then(async cache=>{
        const base = await cache.match("./cloud.js") || await fetch("./cloud.js");
        const addon = await cache.match("./admission-import.js") || await fetch("./admission-import.js");
        const combined = (await base.text()) + "\n\n" + (await addon.text());
        return new Response(combined,{status:200,headers:{"Content-Type":"application/javascript; charset=utf-8","Cache-Control":"no-cache"}});
      })
    );
    return;
  }

  e.respondWith(
    caches.open(CACHE).then(cache=>cache.match(e.request).then(cached=>cached || fetch(e.request).then(resp=>{
      if(e.request.method==="GET" && resp && resp.status===200) cache.put(e.request, resp.clone());
      return resp;
    }).catch(()=>cache.match("./index.html"))))
  );
});
