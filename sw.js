const CACHE='ipbooster-v11-performance-engine';
const CORE=['./','./index.html','./styles.css','./v3.css','./app.js','./performance-engine.js','./v3-observer-guard.js','./v3-engine.js','./router-fix.js','./smart-launch.js','./v3-readiness.js','./manifest.webmanifest','./assets/icon.svg','./assets/icon-180.png','./assets/icon-512.png'];

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});

async function upgradeHtml(response){
  if(!response||!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  const perf='<script src="./performance-engine.js" defer></script>';
  const guard='<script src="./v3-observer-guard.js" defer></script>';
  const engine='<script src="./v3-engine.js" defer></script>';
  const readiness='<script src="./v3-readiness.js" defer></script>';
  if(!html.includes('performance-engine.js'))html=html.includes(guard)?html.replace(guard,`${perf}\n  ${guard}`):html.replace(engine,`${perf}\n  ${engine}`);
  if(!html.includes('v3-readiness.js')){
    const smart='<script src="./smart-launch.js" defer></script>';
    html=html.includes(smart)?html.replace(smart,`${smart}\n  ${readiness}`):html.replace('</body>',`  ${readiness}\n</body>`);
  }
  const headers=new Headers(response.headers);headers.delete('content-length');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const network=await fetch(event.request,{cache:'no-store'});
        const upgraded=await upgradeHtml(network);
        caches.open(CACHE).then(cache=>cache.put('./index.html',upgraded.clone()));
        return upgraded;
      }catch{
        return upgradeHtml(await caches.match('./index.html'));
      }
    })());
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>{
    const network=fetch(event.request).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));return response}).catch(()=>cached);
    return cached||network;
  }));
});