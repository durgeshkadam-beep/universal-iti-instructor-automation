const CACHE = "iti-v15-principal-auth-20260824-2";
const ASSETS = ["./", "./start.html", "./index.html", "./style.css", "./app.js", "./ai.js", "./cloud.js", "./security-patch.js", "./admission-import.js", "./other-printable-records.js", "./official-plans.js", "./manifest.json", "./icon.svg", "./logo.png"];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener("fetch", e=>{
  const url = new URL(e.request.url);

  // Security prelude: never let the legacy app auto-trust a role-bearing session
  // persisted in localStorage. V15 restores only Firebase-authenticated sessions.
  if(e.request.method==="GET" && url.pathname.endsWith("/app.js")){
    e.respondWith(
      caches.open(CACHE).then(async cache=>{
        const base = await cache.match("./app.js") || await fetch("./app.js");
        const prelude = `try{localStorage.removeItem("dtpoAppSession_v1");}catch(e){}\n`;
        return new Response(prelude + (await base.text()),{status:200,headers:{"Content-Type":"application/javascript; charset=utf-8","Cache-Control":"no-cache"}});
      })
    );
    return;
  }

  if(e.request.method==="GET" && url.pathname.endsWith("/cloud.js")){
    e.respondWith(
      caches.open(CACHE).then(async cache=>{
        const base = await cache.match("./cloud.js") || await fetch("./cloud.js");
        const security = await cache.match("./security-patch.js") || await fetch("./security-patch.js");
        const admission = await cache.match("./admission-import.js") || await fetch("./admission-import.js");
        const printable = await cache.match("./other-printable-records.js") || await fetch("./other-printable-records.js");
        const combined = (await base.text()) + "\n\n" + (await security.text()) + "\n\n" + (await admission.text()) + "\n\n" + (await printable.text());
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
