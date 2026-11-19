'use strict';
(()=>{
  const solids=[];let altitude=0,vertical=0,inAir=false,sequence=0,started=-1e6,launchHeight=0;
  const gravity=940,impulse=449;
  function dais(x,z,w,d,h){
    solids.push({x,z,w,d,h});
    face('training-tread',w,d,x,-h,z,0,90);
    for(const side of [-1,1]){
      face('training-riser',w,h,x,-h/2,z+side*d/2,side>0?0:180);
      face('training-riser',d,h,x+side*w/2,-h/2,z,side*90);
    }
  }
  // Three broad marble treads lead to a window overlook on the bridge.
  for(let i=0;i<3;i++)dais(-875+i*127,-5750,126,390,24+(2-i)*24);
  dais(-1005,-5750,140,390,96);
  function surface(x,z){
    if(window.stationCity?.height>0)return 0;
    let h=0;for(const s of solids)if(Math.abs(x-s.x)<s.w/2+7&&Math.abs(z-s.z)<s.d/2+7)h=Math.max(h,s.h);
    for(const c of chairs)if(Math.hypot(x-c.x,z-c.z)<39)h=Math.max(h,53);return h;
  }
  function jump(){
    if(inAir||seated||window.stationCity?.riding)return false;
    vertical=impulse;inAir=true;sequence++;started=performance.now();launchHeight=altitude;return true
  }
  function reset(){altitude=vertical=0;inAir=false;started=-1e6}
  function tick(dt){
    if(seated||window.stationCity?.riding){reset();return false}
    const ground=surface(visitor.x,visitor.z),old=altitude;
    if(inAir||altitude>ground+1){inAir=true;altitude+=vertical*dt-gravity*dt*dt/2;vertical-=gravity*dt;
      if(vertical<=0&&altitude<=ground){altitude=ground;vertical=0;inAir=false}
    }else altitude=ground;
    return Math.abs(altitude-old)>.01;
  }
  window.deckTraversal={jump,reset,tick,get height(){return altitude},allows:(x,z)=>surface(x,z)<=altitude+(inAir?5:26),
    pose:()=>({hop:performance.now()-started<1900?sequence:0,elapsed:Math.max(0,Math.min(2,(performance.now()-started)/1000)),base:launchHeight,ground:surface(visitor.x,visitor.z)})};
  const jumpButton=byId('jump-control');jumpButton.onclick=()=>seated?rise():jump();
})();
