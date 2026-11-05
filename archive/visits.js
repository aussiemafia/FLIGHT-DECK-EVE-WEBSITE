/* Shared GoatCounter service; Expanse has its own fixed path, never TOTAL. */
(()=>{
 'use strict';
 const total=document.getElementById('expanseVisits'), note=document.getElementById('expanseVisitNote');
 if(!total||!note)return;
 const path='/C5-WORMHOLE-PASSING-RAY/';
 const live=location.hostname==='aussiemafia.github.io'&&location.pathname.startsWith(path);
 if(!live){note.textContent='Preview / offline · visits not counted';return;}
 const script=document.createElement('script');
 script.async=true;script.src='https://gc.zgo.at/count.js';
 script.dataset.goatcounter='https://aussiemafia.goatcounter.com/count';
 script.dataset.goatcounterSettings=JSON.stringify({path,title:'The Expanse — website visits'});
 let trackingBlocked=false;
 script.onerror=()=>{trackingBlocked=true;note.textContent='Tracking blocked or unavailable in this browser';};
 document.head.append(script);
 async function showCount(){
  try{
   const r=await fetch('https://aussiemafia.goatcounter.com/counter/'+encodeURIComponent(path)+'.json?start=2026-11-02',{signal:AbortSignal.timeout(12000)});
   if(r.status===404){
    const empty=await r.json();
    if(String(empty.count)!=='0')throw Error('Unknown counter response');
    total.textContent='0';
    if(!trackingBlocked)note.textContent='No visits reported yet · updates within 4 hours';
    return;
   }
   if(!r.ok)throw Error('Counter unavailable');
   const data=await r.json();const count=Number(String(data.count).replaceAll(',',''));
   if(!Number.isSafeInteger(count)||count<0)throw Error('Invalid count');
   total.textContent=count.toLocaleString('en-AU');
   if(!trackingBlocked)note.textContent='Since 3 Nov 2026 · updates within 4 hours';
  }catch{if(!trackingBlocked)note.textContent='Visit total temporarily unavailable';}
 }
 showCount();
 // Recheck when returning to this tab; never send extra tracking hits.
 let lastCheck=Date.now();
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastCheck>60000){lastCheck=Date.now();showCount();}});
})();
