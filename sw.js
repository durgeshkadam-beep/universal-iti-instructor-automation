const CACHE = "iti-v15-1-realtime-multiuser";
const ASSETS = ["./", "./start.html", "./index.html", "./style.css", "./app.js", "./ai.js", "./cloud.js", "./security-patch.js", "./admission-import.js", "./other-printable-records.js", "./v15-core.js", "./v15-data.js", "./v15-access.js", "./v15-ui.js", "./official-plans.js", "./manifest.json", "./icon.svg", "./logo.png"];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener("fetch", e=>{
  const url = new URL(e.request.url);

  // Never auto-trust a role-bearing legacy session from localStorage.
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

  // index.html already loads cloud.js. Append hardening, import/print modules and
  // the V15 Firebase-first realtime layer without rewriting the large HTML file.
  if(e.request.method==="GET" && url.pathname.endsWith("/cloud.js")){
    e.respondWith(
      caches.open(CACHE).then(async cache=>{
        const base = await cache.match("./cloud.js") || await fetch("./cloud.js");
        const security = await cache.match("./security-patch.js") || await fetch("./security-patch.js");
        const admission = await cache.match("./admission-import.js") || await fetch("./admission-import.js");
        const printable = await cache.match("./other-printable-records.js") || await fetch("./other-printable-records.js");
        const v15core = await cache.match("./v15-core.js") || await fetch("./v15-core.js");
        const v15data = await cache.match("./v15-data.js") || await fetch("./v15-data.js");
        const v15access = await cache.match("./v15-access.js") || await fetch("./v15-access.js");
        const v15ui = await cache.match("./v15-ui.js") || await fetch("./v15-ui.js");
        const combined = (await base.text()) + "\n\n" + (await security.text()) + "\n\n" + (await admission.text()) + "\n\n" + (await printable.text()) + "\n\n" + (await v15core.text()) + "\n\n" + (await v15data.text()) + "\n\n" + (await v15access.text()) + "\n\n" + (await v15ui.text());
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
