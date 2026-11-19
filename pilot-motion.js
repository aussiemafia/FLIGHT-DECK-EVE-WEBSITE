'use strict';
// Blend the authored Rocketbox cycles in model space. Both renderers use the same pose.
function animateOfficer(actor,data,now){
  const n=data.count*3,frames=data.motion;
  const a=actor.motionState||(actor.motionState={time:now,phase:0,w:0,r:0,s:0,head:0,pitch:0,result:new Float32Array(n)});
  if(a.result.length!==n)a.result=new Float32Array(n);
  if(a.last===now)return a.result;
  const dt=Math.min(.2,Math.max(.001,(now-a.time)/1000)),ease=1-Math.exp(-dt*7);
  a.last=now;a.time=now;
  const speed=(now-actor.updated<1650?actor.speed:0)||0,turn=(now-actor.updated<1100?actor.turnRate:0)||0;
  const moving=Math.min(1,Math.max(speed/160,Math.min(.42,turn*.19))),run=Math.max(0,Math.min(1,(speed-570)/370));
  a.w+=(moving-a.w)*ease;a.r+=(run-a.r)*ease;a.s+=((actor.p.state==='seated'?1:0)-a.s)*ease;
  a.head+=((actor.p.look||0)-a.head)*ease;a.pitch+=((actor.p.pitch||0)-a.pitch)*ease;
  a.phase=(a.phase+dt*(.81+Math.min(1.5,speed/650)*.73))%1;
  function clip(base,len,phase){const f=phase*len,k=Math.floor(f);return [(base+k%len)*n,(base+(k+1)%len)*n,f-k]}
  const idle=clip(20,5,(now*.00024)%1),sit=clip(25,5,(now*.00018)%1),walk=clip(0,10,a.phase),jog=clip(10,10,a.phase);
  const sample=(c,j)=>frames[c[0]+j]+(frames[c[1]+j]-frames[c[0]+j])*c[2];
  let hx=0,hy=0,hz=0;const mouth=window.crewRadio?.level(actor.p.id)||0,arr=a.result;
  for(let j=0;j<n;j++){
    const neutral=sample(idle,j),stride=sample(walk,j),travel=stride+(sample(jog,j)-stride)*a.r;
    const standing=neutral+(travel-neutral)*a.w;
    arr[j]=standing+(sample(sit,j)-standing)*a.s+mouth*(data.mesh[11*n+j]-data.mesh[10*n+j]);
  }
  for(const j of data.headPoints){hx+=arr[j];hy+=arr[j+1];hz+=arr[j+2]}
  const ct=data.headPoints.length||1;hx/=ct;hy=hy/ct-950;hz/=ct;
  const co=Math.cos(a.head),si=Math.sin(a.head),cp=Math.cos(a.pitch),sp=Math.sin(a.pitch);
  for(const [j,weight] of data.neck){
    const x=arr[j]-hx,y=arr[j+1]-hy,z=arr[j+2]-hz;
    const py=y*cp-z*sp,pz=y*sp+z*cp;
    arr[j]+=(x*co-pz*si-x)*weight;arr[j+1]+=(py-y)*weight;arr[j+2]+=(x*si+pz*co-z)*weight;
  }
  return arr;
}
