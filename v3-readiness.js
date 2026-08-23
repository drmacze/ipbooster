(() => {
  'use strict';
  const load=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
  const esc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));

  function update(){
    const games=load('ipbooster.games.v1',[]),router=load('ipbooster.smartplay.v4',{}),verified=load('ipbooster.v3.verified-routes',{}),quick=load('ipbooster.quicknet.v3',null),full=load('ipbooster.network.v1',[]);
    const network=quick&&(!full?.[0]||Number(quick.at)>=Number(full[0].at))?quick:full?.[0];
    const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
    const routerReady=Boolean(router.universalReady&&router.universalShortcut?.trim());
    const official=Array.isArray(games)?games.filter(g=>g.artworkUrl).length:0;
    const verifiedCount=Array.isArray(games)?games.filter(g=>verified[g.id]?.verifiedAt).length:0;
    const fresh=Boolean(network?.at&&Date.now()-Number(network.at)<15*60*1000);
    let score=0;const reasons=[];
    if(routerReady)score+=30;reasons.push({label:routerReady?'Router ready':'Router setup',good:routerReady});
    if(games.length)score+=15;reasons.push({label:games.length?`${games.length} games`:'No games',good:Boolean(games.length)});
    if(fresh)score+=20;else if(network)score+=8;reasons.push({label:network?`${network.latency} ms network`:'No network test',good:fresh});
    if(standalone)score+=15;reasons.push({label:standalone?'Home Screen':'Safari',good:standalone});
    if(official)score+=10;reasons.push({label:official?'Official artwork':'Artwork pending',good:Boolean(official)});
    if(verifiedCount)score+=10;reasons.push({label:verifiedCount?`${verifiedCount} routes verified`:'Routes unverified',good:Boolean(verifiedCount)});
    score=Math.min(100,score);

    const value=document.getElementById('readinessScore'),ring=document.querySelector('.readiness-ring'),title=document.getElementById('readinessTitle'),text=document.getElementById('readinessText'),chips=document.getElementById('readinessReasons');
    if(value)value.textContent=score;if(ring)ring.style.setProperty('--score',`${score}%`);
    if(title)title.textContent=score>=85?'Ready to launch':score>=60?'Almost ready':'Finish your setup';
    if(text)text.textContent=score>=85?'Smart Play Router and current launcher checks are ready.':score>=60?'A few launcher checks can still improve the next session.':'Set up the Router, add games, and run a network check.';
    if(chips)chips.innerHTML=reasons.map(r=>`<span class="reason-chip ${r.good?'good':''}">${r.good?'✓ ':''}${esc(r.label)}</span>`).join('');

    const bridge=document.getElementById('metricBridge'),bridgeSub=document.getElementById('metricBridgeSub');
    const device=load('ipbooster.device.v1',null),bridgeCfg=load('ipbooster.bridge.v1',{});
    if(bridge&&!device&&!bridgeCfg.statusShortcut)bridge.textContent='Optional';
    if(bridgeSub&&!device&&!bridgeCfg.statusShortcut)bridgeSub.textContent='Browser snapshot active';
  }

  setTimeout(update,250);
  setInterval(update,5000);
  addEventListener('pageshow',()=>setTimeout(update,900));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(update,900)});
})();
