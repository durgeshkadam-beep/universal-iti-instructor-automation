const CACHE='iti-v15-standalone-20260824-prod13';
const CORE=[
  './index.html','./manifest.json','./v15-core.js','./v15-data.js','./v15-access.js','./v15-ui.js',
  './v15-auth-roles-v2.js','./v15-workspaces-v2.js','./v15-governance-v2.js','./v15-portals-v2.js','./v15-boot-final.js','./v15-role-enforcer.js',
  '../index.html','../style.css','../app.js','../ai.js','../cloud.js','../security-patch.js','../admission-import.js',
  '../other-printable-records.js','../official-plans.js','../logo.png','../icon.svg'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.all(CORE.map(u=>cache.add(new Request(u,{cache:'reload'})).catch(()=>null)))));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('iti-v15-standalone-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const req=event.request;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const fresh=await fetch(req,{cache:'no-store'});
      if(fresh&&fresh.ok)cache.put(req,fresh.clone()).catch(()=>{});
      return fresh;
    }catch(err){
      const exact=await cache.match(req);
      if(exact)return exact;
      if(req.destination==='document'){
        const shell=await cache.match('./index.html');
        if(shell)return shell;
        return new Response('<!doctype html><meta charset="utf-8"><title>V15 Offline</title><body style="font-family:Arial;padding:24px"><h2>V15 is offline</h2><p>Reconnect to the internet and reload. Your local records were not deleted.</p></body>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});
      }
      return new Response('',{status:503,statusText:'V15 resource unavailable'});
    }
  })());
});
