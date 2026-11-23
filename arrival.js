'use strict';
const view=document.querySelector('main'),camera=document.querySelector('#camera'),world=document.querySelector('#world');
const subjects=[
 ['Flight school','Flight school','porpoise'],['Exploration lab','Exploration and cartography','wormhole'],
 ['Industry exchange','Industry and commerce','ore'],['Mission theatre','Combat and missions','fortizar'],
 ['Fleet operations','Fleet operations and PvP','class5']
];
const walls=[],rooms=[],keys=new Set(),eye=120;
const pos={x:0,z:185,yaw:0,pitch:0};
const menu=document.querySelector('dialog'),learn=document.querySelector('#learn');
let active=null,pending=0,last=0;
function plane(kind,w,h,x,y,z,ry=0,rx=0){
 const el=document.createElement('div');el.className='plane '+kind;
 Object.assign(el.style,{width:w+'px',height:h+'px',left:-w/2+'px',top:-h/2+'px',transform:'translate3d('+x+'px,'+y+'px,'+z+'px) rotateY('+ry+'rad) rotateX('+rx+'rad)'});
 world.append(el);return el;
}
function polygon(cx,cz,r,n,heading){return Array.from({length:n},(_,i)=>{const a=heading+(i-.5)*2*Math.PI/n;return [cx+r*Math.sin(a),cz-r*Math.cos(a)]})}
function plate(points,cx,cz,r,y,kind){
 const el=plane(kind,2*r,2*r,cx,y,cz,0,Math.PI/2);
 el.style.clipPath='polygon('+points.map(([x,z])=>((x-cx+r)/(2*r)*100)+'% '+((z-cz+r)/(2*r)*100)+'%').join(',')+')';
}
// The wall's local Z points into the room. Extrude the same opening towards space.
let airlock=null,terrace=null;
function localFace(kind,w,h,x,y,z,turn,u,depth,twist=0,tilt=0){
 const sn=Math.sin(turn),cs=Math.cos(turn);
 return plane(kind,w,h,x+u*cs+depth*sn,y,z-u*sn+depth*cs,turn+twist,tilt);
}
function panelVolume(x,z,turn,u,mid,w,h,thick){
 const surface=(kind,width,height,offset,y,d,twist=0,tilt=0)=>
   localFace(kind,width,height,x,y,z,turn,offset,d,twist,tilt);
 surface('wall',w,h,u,mid,0);
 surface('hull',w,h,u,mid,-thick,Math.PI);
 for(const side of [-1,1]){
   surface('reveal',thick,h,u+side*w/2,mid,-thick/2,side*Math.PI/2);
   surface('reveal',w,thick,u,mid+side*h/2,-thick/2,0,-side*Math.PI/2);
 }
}
function segment(a,b,cx,cz,kind='wall',opening=''){
 const [ax,az]=a,[bx,bz]=b,x=(ax+bx)/2,z=(az+bz)/2,w=Math.hypot(bx-ax,bz-az);
 const turn=Math.atan2(-(bz-az),bx-ax);
 const inward=(cx-x)*Math.sin(turn)+(cz-z)*Math.cos(turn)>=0?turn:turn+Math.PI;
 const slab=(u,y,width,height)=>panelVolume(x,z,inward,u,y,width,height,22);
 const at=(u,d=0)=>[x+u*Math.cos(inward)+d*Math.sin(inward),z-u*Math.sin(inward)+d*Math.cos(inward)];
 if(opening){
   const door=opening==='door',gap=door?136:w*.71,top=door?216:196,bottom=door?0:63;
   const jamb=(w-gap)/2;
   for(const sign of [-1,1])slab(sign*(gap+jamb)/2,-135,jamb,270);
   slab(0,-(270+top)/2,gap,270-top);
   if(bottom)slab(0,-bottom/2,gap,bottom);
   if(door){
     const leaves=[-1,1].map(sign=>{const node=localFace('hatch',gap/2,top,x,-top/2,z,inward,sign*gap/4,-11);return {node,base:node.style.transform,sign}});
     airlock={x,z,turn:inward,gap,leaves,open:0};
     for(const sign of [-1,1])walls.push([...at(sign*gap/2),...at(sign*w/2)]);
   }else{
     localFace('glazing',gap,top-bottom,x,-(top+bottom)/2,z,inward,0,-14);
     walls.push([ax,az,bx,bz]);
   }
 }else{
   slab(0,-135,w+1,270);walls.push([ax,az,bx,bz]);
 }
 return {x,z,turn:inward};
}
function observationDeck(room,r){
 const {cx,cz,heading}=room,sn=Math.sin(heading),cs=Math.cos(heading);
 const point=(u,v)=>[cx+u*cs+v*sn,cz+u*sn-v*cs];
 const base=r*Math.cos(Math.PI/8),end=base+400;
 const corners=[point(-155,base),point(155,base),point(155,end-65),point(90,end),point(-90,end),point(-155,end-65)];
 const [x,z]=point(0,(base+end)/2);terrace={x,z,heading};
 plate(corners,x,z,300,0,'floor');plate(corners,x,z,300,34,'hull');
 for(let i=1;i<corners.length;i++){
   const a=corners[i],b=corners[(i+1)%corners.length],mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
   const dx=b[0]-a[0],dz=b[1]-a[1],w=Math.hypot(dx,dz),t=Math.atan2(-dz,dx);
   plane('deck-edge',w,34,mx,17,mz,t);
   plane('rail-glass',w,68,mx,-34,mz,t);
   plane('rail-cap',w,7,mx,-70,mz,t);
   plane('post',8,73,a[0],-36,a[1],t);
   walls.push([...a,...b]);
 }
}
function moveHatch(dt){
 if(!airlock)return;const d=airlock,dx=pos.x-d.x,dz=pos.z-d.z;
 const across=dx*Math.cos(d.turn)-dz*Math.sin(d.turn),depth=dx*Math.sin(d.turn)+dz*Math.cos(d.turn);
 const goal=Math.abs(depth)<160&&Math.abs(across)<120?1:0;
 d.open+=Math.sign(goal-d.open)*Math.min(Math.abs(goal-d.open),dt*2.8);
 for(const leaf of d.leaves)leaf.node.style.transform=leaf.base+' translateX('+leaf.sign*d.open*d.gap/2+'px)';
 return d.open!==goal;
}
function seat(x,z,angle){
 // Upholstered bench with a back, a cushion and a pedestal, viewed from either side.
 for(const [kind,w,h,dx,y,dz,turn,tilt] of [
 ['seat',92,39,0,-54,18,0,0],['seat',92,39,0,-54,19,Math.PI,0],
 ['seat',92,40,0,-37,0,0,Math.PI/2],['plinth',63,36,0,-18,-12,0,0],
 ['plinth',63,36,0,-18,12,Math.PI,0]]){
  plane(kind,w,h,x+dx*Math.cos(angle)+dz*Math.sin(angle),y,z-dx*Math.sin(angle)+dz*Math.cos(angle),angle+turn,tilt);
 }
}
const radius=540,hub=polygon(0,0,radius,10,0),edge=2*radius*Math.sin(Math.PI/10);
plate(hub,0,0,radius,0,'floor');plate(hub,0,0,radius,-270,'roof');
for(let i=0;i<10;i++){
 const a=hub[i],b=hub[(i+1)%10],heading=i*Math.PI/5;
 if(i%2){segment(a,b,0,0,'wall','window');continue}
 const topic=subjects[i/2],rr=edge/(2*Math.sin(Math.PI/8)),distance=radius*Math.cos(Math.PI/10)+rr*Math.cos(Math.PI/8);
 const cx=distance*Math.sin(heading),cz=-distance*Math.cos(heading),poly=polygon(cx,cz,rr,8,heading+Math.PI);
 const room={topic,cx,cz,heading,poly};rooms.push(room);
 plate(poly,cx,cz,rr,0,'floor');plate(poly,cx,cz,rr,-270,'roof');
 const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
 for(const end of [a,b]){
  const jamb=[mx+(end[0]-mx)*.63,mz+(end[1]-mz)*.63];
  segment(end,jamb,0,0);segment(jamb,end,cx,cz);
 }
 plane('sign',edge*.93,36,mx*.998,-240,mz*.998,-heading).textContent=topic[0];
 for(let j=1;j<8;j++){
  const lock=i===0&&j===4;
  const wall=segment(poly[j],poly[(j+1)%8],cx,cz,'wall',lock?'door':[2,6].includes(j)?'window':'');
  if(j===(i===0?3:4)){
   const dx=Math.sin(wall.turn),dz=Math.cos(wall.turn);
   plane('art',edge*.87,153,wall.x+4*dx,-147,wall.z+4*dz,wall.turn).style.backgroundImage='url(assets/exhibits/'+topic[2]+'.webp)';
   plane('sign',edge*.87,30,wall.x+5*dx,-45,wall.z+5*dz,wall.turn).textContent=topic[0];
  }
 }
 if(i===0)observationDeck(room,rr);
 for(const offset of [-105,105])seat(cx+offset*Math.cos(heading),cz+offset*Math.sin(heading),-heading);
 const button=document.createElement('button');button.textContent=topic[0];
 button.onclick=()=>{Object.assign(pos,{x:cx-Math.sin(heading)*115,z:cz+Math.cos(heading)*115,yaw:heading,pitch:0});menu.close();draw();view.focus()};
 document.querySelector('#dest').append(button);
}
function draw(){
 const f=Math.max(240,Math.min(innerHeight*.82,innerWidth*.82));view.style.perspective=f+'px';
 camera.style.transform='translateZ('+f+'px) rotateX('+pos.pitch+'rad) rotateY('+pos.yaw+'rad)';
 world.style.transform='translate3d('+(-pos.x)+'px,'+eye+'px,'+(-pos.z)+'px)';
 view.style.backgroundPosition=((50+pos.yaw*100/(2*Math.PI))%100)+'% '+(50-pos.pitch*28)+'%';
 active=rooms.find(r=>Math.hypot(pos.x-r.cx,pos.z-r.cz)<410);
 document.querySelector('#location').textContent=onDeck()?'Observation deck':active?active.topic[0]:'Academy rotunda';
 learn.hidden=!active||onDeck();
}
function onDeck(){return terrace && (pos.x-terrace.x)*Math.sin(terrace.heading)-(pos.z-terrace.z)*Math.cos(terrace.heading)>-200}
function clear(x,z){
 if(airlock){
   const {turn,gap,open}=airlock,dx=x-airlock.x,dz=z-airlock.z;
   const across=Math.abs(dx*Math.cos(turn)-dz*Math.sin(turn)),depth=Math.abs(dx*Math.sin(turn)+dz*Math.cos(turn)+11);
   if(depth<20&&across<gap/2+12&&across+12>open*gap/2)return false;
 }
 return walls.every(([ax,az,bx,bz])=>{
  const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
  return Math.hypot(x-ax-t*dx,z-az-t*dz)>17;
 });
}
function tick(now){
 pending=0;const dt=Math.min(.06,(now-last)/1000);last=now;
 const forward=Number(keys.has('w')||keys.has('ArrowUp'))-Number(keys.has('s')||keys.has('ArrowDown')),side=Number(keys.has('d'))-Number(keys.has('a'));
 pos.yaw+=(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*dt*1.7;
 const step=(keys.has('Shift')?410:225)*dt/Math.max(1,Math.hypot(forward,side));
 const x=pos.x+step*(Math.sin(pos.yaw)*forward+Math.cos(pos.yaw)*side),z=pos.z+step*(-Math.cos(pos.yaw)*forward+Math.sin(pos.yaw)*side);
 if(clear(x,pos.z))pos.x=x;if(clear(pos.x,z))pos.z=z;const sliding=moveHatch(dt);draw();if(keys.size||sliding)pending=requestAnimationFrame(tick);
}
function hold(k){keys.add(k);if(!pending){last=performance.now();pending=requestAnimationFrame(tick)}}
function lesson(){if(active&&!onDeck())location.href='campus.html?subject='+encodeURIComponent(active.topic[1])}
learn.onclick=lesson;document.querySelector('#directory').onclick=()=>{keys.clear();menu.showModal()};
document.querySelector('#close').onclick=()=>menu.close();
document.addEventListener('keydown',e=>{if(menu.open||e.ctrlKey||e.metaKey||e.altKey)return;
 const k=e.key.length===1?e.key.toLowerCase():e.key;
 if(k==='e'){lesson();return}
 if(['w','a','s','d','Shift','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(k)){e.preventDefault();hold(k)}
});
document.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
window.addEventListener('blur',()=>keys.clear());
for(const b of document.querySelectorAll('[data-key]')){
 b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);hold(b.dataset.key)};
 b.onlostpointercapture=()=>keys.delete(b.dataset.key);
}
let drag=null;view.onpointerdown=e=>{drag=[e.clientX,e.clientY];view.setPointerCapture(e.pointerId);view.focus()};
view.onpointermove=e=>{if(!drag)return;pos.yaw+=(e.clientX-drag[0])*.004;pos.pitch=Math.max(-.65,Math.min(.65,pos.pitch-(e.clientY-drag[1])*.003));drag=[e.clientX,e.clientY];draw()};
view.onlostpointercapture=()=>drag=null;window.addEventListener('resize',draw);
const deckButton=document.createElement('button');deckButton.textContent='Observation deck';
deckButton.onclick=()=>{pos.x=terrace.x;pos.z=terrace.z;pos.yaw=Math.PI;pos.pitch=0;menu.close();draw();view.focus()};
document.querySelector('#dest').append(deckButton);draw();
