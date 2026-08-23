const CACHE='ipbooster-v8-v3-pipeline';
const CORE=['./','./index.html','./styles.css','./v3.css','./app.js','./v3-engine.js','./router-fix.js','./smart-launch.js','./manifest.webmanifest','./assets/icon.svg','./assets/icon-180.png','./assets/icon-512.png'];

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});

async function upgradeHtml(response){
  if(!response||!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  const css='<link rel="stylesheet" href="./v3.css" />';
  const script='<script src="./v3-engine.js" defer></script>';
  if(!html.includes('v3.css'))html=html.replace('</head>',`  ${css}\n</head>`);
  if(!html.includes('v3-engine.js')){
    const router='<script src="./router-fix.js" defer></script>';
    html=html.includes(router)?html.replace(router,`${script}\n  ${router}`):html.replace('</body>',`  ${script}\n</body>`);
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