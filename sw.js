const CACHE='ipbooster-v16-self-refresh';
const CORE=['./','./index.html','./styles.css','./v3.css','./app.js','./pwa-update.js','./performance-engine.js','./native-mode-setup.js','./official-shortcut-template.js','./shortcut-template.json','./v3-observer-guard.js','./v3-engine.js','./router-fix.js','./smart-launch.js','./v3-readiness.js','./manifest.webmanifest','./assets/icon.svg','./assets/icon-180.png','./assets/icon-512.png'];

async function cacheCore(cacheName=CACHE){
  const cache=await caches.open(cacheName);
  await cache.addAll(CORE);
  return cache;
}

async function refreshCore(){
  const cache=await caches.open(CACHE);
  await Promise.allSettled(CORE.map(path=>cache.delete(path)));
  const results=await Promise.allSettled(CORE.map(async path=>{
    const request=new Request(path,{cache:'reload'});
    const response=await fetch(request,{cache:'no-store'});
    if(response.ok)await cache.put(path,response.clone());
  }));
  return results.filter(x=>x.status==='fulfilled').length;
}

self.addEventListener('install',event=>{
  event.waitUntil(cacheCore().then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('message',event=>{
  const type=event.data?.type;
  if(type==='SKIP_WAITING'){
    self.skipWaiting();
    return;
  }
  if(type==='REFRESH_APP_CACHE'){
    event.waitUntil(refreshCore());
  }
});

async function upgradeHtml(response){
  if(!response||!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  const updater='<script src="./pwa-update.js" defer></script>';
  const perf='<script src="./performance-engine.js" defer></script>';
  const native='<script src="./native-mode-setup.js" defer></script>';
  const template='<script src="./official-shortcut-template.js" defer></script>';
  const guard='<script src="./v3-observer-guard.js" defer></script>';
  const engine='<script src="./v3-engine.js" defer></script>';
  const readiness='<script src="./v3-readiness.js" defer></script>';

  if(!html.includes('pwa-update.js')){
    const app='<script src="./app.js" defer></script>';
    html=html.includes(app)?html.replace(app,`${app}\n  ${updater}`):html.replace('</body>',`  ${updater}\n</body>`);
  }
  if(!html.includes('performance-engine.js'))html=html.includes(guard)?html.replace(guard,`${perf}\n  ${guard}`):html.replace(engine,`${perf}\n  ${engine}`);
  if(!html.includes('native-mode-setup.js'))html=html.includes(perf)?html.replace(perf,`${perf}\n  ${native}`):html.includes(guard)?html.replace(guard,`${native}\n  ${guard}`):html.replace('</body>',`  ${native}\n</body>`);
  if(!html.includes('official-shortcut-template.js'))html=html.includes(native)?html.replace(native,`${native}\n  ${template}`):html.includes(guard)?html.replace(guard,`${template}\n  ${guard}`):html.replace('</body>',`  ${template}\n</body>`);
  if(!html.includes('v3-readiness.js')){
    const smart='<script src="./smart-launch.js" defer></script>';
    html=html.includes(smart)?html.replace(smart,`${smart}\n  ${readiness}`):html.replace('</body>',`  ${readiness}\n</body>`);
  }

  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control','no-cache');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;

  if(url.pathname.endsWith('/version.json')){
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>new Response('{"build":"offline"}',{headers:{'content-type':'application/json'}})));
    return;
  }

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
    const network=fetch(event.request).then(response=>{
      if(response.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));
      return response;
    }).catch(()=>cached);
    return cached||network;
  }));
});
