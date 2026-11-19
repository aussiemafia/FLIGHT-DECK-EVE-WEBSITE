'use strict';
// Every page visit gets a fresh anonymous session. No account or personal profile is sent.
(function(){
  const endpoint='https://expanse-flight-deck-crew.markdavidwray1972.chatgpt.site/presence';
  const token=crypto.randomUUID(),peers=new Map(),bridge=document.getElementById('world')!==null;
  const root=document.getElementById(bridge?'world':'hall'),status=document.getElementById('crew-status');
  let active=true,timer=0,ownId='',lastSnapshot=0,failures=0;
  const uniform=document.getElementById('uniform');if(uniform){try{uniform.value=localStorage.getItem('deck-uniform')||'imperial'}catch{}uniform.onchange=()=>{try{localStorage.setItem('deck-uniform',uniform.value)}catch{}}}
  function pose(){
    if(bridge)return {x,z,yaw,deck:'bridge',seat:seated?'helm-'+Math.abs(seated.x)+'-'+Math.abs(seated.z):'',state:seated?'seated':panel.open?'reading':keys.size?'walking':'standing'};
    return {...visitor,height:window.stationCity?.height||0,deck:'concourse',seat:seated?.id||'',state:seated?'seated':record.open?'reading':activityUntil>Date.now()?'projecting':keys.size?'walking':'standing'};
  }
  function makeAvatar(p){
    const node=document.createElement('div');
    node.className='crew-avatar';
    node.style.setProperty('--suit','hsl('+parseInt(p.id.slice(0,3),16)%360+' 32% 47%)');
    node.innerHTML='<div class="crew-shadow"></div><canvas class="pilot-mesh" aria-hidden="true"></canvas><span class="crew-tag"></span>';
    root.append(node);const tag=node.querySelector('.crew-tag');
    return {node,tag,canvas:node.querySelector('canvas'),x:p.x,z:p.z,fromX:p.x,fromZ:p.z,updated:performance.now(),p};
  }
  function update(list){
    const seen=new Set();
    for(const p of list){
      if(!/^[a-f0-9]{24}$/.test(p.id)||![p.x,p.z,p.yaw].every(Number.isFinite))continue;
      seen.add(p.id);
      let actor=peers.get(p.id);
      if(!actor){actor=makeAvatar(p);peers.set(p.id,actor)}
      actor.fromX=actor.x;actor.fromZ=actor.z;actor.updated=performance.now();actor.p=p;
      actor.node.dataset.pose=p.state;
      actor.tag.textContent='Pilot '+p.id.slice(-4).toUpperCase()+(p.state==='standing'?'':' · '+p.state);
    }
    for(const [id,actor] of peers)if(!seen.has(id)){actor.node.remove();peers.delete(id)}
  }
  async function sync(){
    if(!active)return;
    const cancel=new AbortController();const timeout=setTimeout(()=>cancel.abort(),8000);
    try{
      const response=await fetch(endpoint,{method:'POST',body:JSON.stringify({token,...pose(),uniform:uniform?.value,voice:window.crewRadio?.epoch,talking:window.crewRadio?.talking}),signal:cancel.signal,credentials:'omit',cache:'no-store'});
      if(!response.ok)throw Error('Crew service');
      const data=await response.json();if(!Array.isArray(data.crew))throw Error('Crew unavailable');
      ownId=data.id;lastSnapshot=performance.now();failures=0;update(data.crew);window.crewRadio?.nearby(ownId,data.crew);
      status.textContent=(1+peers.size)+' aboard';
      status.title='Live visitors on this deck, including you';
      if(!bridge&&seated&&[...peers.values()].some(a=>a.p.seat===seated.id&&a.p.id<ownId))rise();
    }catch{
      window.crewRadio?.disconnect();failures++;status.textContent='Crew offline';status.title='Reconnecting to live visitors';
      if(performance.now()-lastSnapshot>12000)update([]);
    }finally{
      clearTimeout(timeout);
      if(active)timer=setTimeout(sync,failures?Math.min(15000,1200*failures):document.hidden?8500:peers.size?400:1400);
    }
  }
  function drawCrew(now){
    if(!document.hidden&&peers.size){
      const me=pose();
      for(const actor of peers.values()){
        const p=actor.p,t=Math.min(1,(now-actor.updated)/850);
        actor.x=actor.fromX+(p.x-actor.fromX)*t;actor.z=actor.fromZ+(p.z-actor.fromZ)*t;
        const dx=me.x-actor.x,dz=me.z-actor.z,facing=Math.atan2(dx,dz);
        const obscured=bridge?displayCompartment(me.x,me.z)!==displayCompartment(actor.x,actor.z):!sightLine(me.x,me.z,actor.x,actor.z);
        actor.node.hidden=obscured||Math.hypot(dx,dz)<38;if(actor.node.hidden)continue;
        const scale=bridge?2.36:1;
        actor.node.style.transform='translate3d('+actor.x+'px,'+(bridge?414:-(p.height||0))+'px,'+actor.z+'px) rotateY('+facing+'rad) scale('+scale+')';
        window.renderPilot?.(actor,facing+p.yaw,Math.hypot(dx,dz)/scale,now);
      }
    }
    if(active)requestAnimationFrame(drawCrew);
  }
  window.flightCrew={peers,signal:payload=>fetch(endpoint.replace('/presence','/signal'),{method:'POST',body:JSON.stringify({token,...payload}),credentials:'omit',cache:'no-store'}),
    occupied:id=>[...peers.values()].some(a=>a.p.seat===id),
    nearDoor:d=>[...peers.values()].some(({x,z})=>Math.abs((x-d.x)*d.ux+(z-d.z)*d.uz)<315&&Math.abs(-(x-d.x)*d.uz+(z-d.z)*d.ux)<440)
  };
  window.addEventListener('pagehide',()=>{active=false;clearTimeout(timer);navigator.sendBeacon(endpoint,JSON.stringify({token,leave:true}))});
  window.addEventListener('pageshow',e=>{if(e.persisted&&!active){active=true;sync();requestAnimationFrame(drawCrew)}});
  sync();requestAnimationFrame(drawCrew);
})();
