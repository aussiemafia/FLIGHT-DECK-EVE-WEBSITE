'use strict';
const alcoveFaces=fetch('assets/interior/alcove-lod.json').then(r=>r.json()).catch(()=>[]);
const alcovePalette=[[159,160,152],[46,53,55],[181,151,102],[244,221,170],[125,131,129]];
function installAlcove(screen){
  const g=screen.geometry,xScale=g.w/8.85,yScale=g.h/2.97;
  const a=face('blender-alcove',g.w*1.46,g.h*1.78,g.x,g.y,g.z,g.ry*180/Math.PI);a.alcoveScale=[xScale,yScale,100];
  return a;
}
// Each compatibility polygon retains its own position and orientation in the room.
function paintAlcove(el,faces){
  const [sx,sy,sz]=el.alcoveScale;
  const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
  const norm=v=>{const n=Math.hypot(...v);return n?v.map(x=>x/n):v};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const fragment=document.createDocumentFragment();
  for(const [material,points] of faces){
    const p=points.map(([x,y,z])=>[x*sx,-z*sy,-y*sz]),u=norm(sub(p[1],p[0])),n=norm(cross(u,sub(p[3],p[0]))),v=cross(n,u);
    const coords=p.map(q=>{const r=sub(q,p[0]);return [dot(r,u),dot(r,v)]});
    const xx=coords.map(q=>q[0]),yy=coords.map(q=>q[1]),x=Math.min(...xx),y=Math.min(...yy),w=Math.max(...xx)-x,h=Math.max(...yy)-y;
    if(w<.01||h<.01)continue;
    const origin=p[0].map((z,i)=>z+u[i]*x+v[i]*y),light=material===3?1:.64+.32*Math.abs(dot(n,[-.36,-.78,.51]))+.13*Math.abs(n[2]);
    const color=alcovePalette[material].map(q=>Math.min(255,Math.round(q*light)));
    const f=document.createElement('b');f.style.cssText='width:'+(w+.22)+'px;height:'+(h+.22)+'px;background:rgb('+color+');clip-path:polygon('+coords.map(q=>(q[0]-x)/w*100+'% '+(q[1]-y)/h*100+'%').join(',')+');transform:matrix3d('+[...u,0,...v,0,...n,0,...origin,1].join(',')+')';
    fragment.append(f);
  }
  el.append(fragment);
}
let alcoveMesh=[];
alcoveFaces.then(f=>alcoveMesh=f);
setInterval(()=>{
  for(const el of hall.querySelectorAll('.blender-alcove')){
    const g=el.geometry,near=!window.hdStation&&alcoveMesh.length&&Math.hypot(g.x-visitor.x,g.z-visitor.z)<1900;
    if(near&&!el.childElementCount)paintAlcove(el,alcoveMesh);
    else if(!near&&el.childElementCount)el.replaceChildren();
  }
},450);
