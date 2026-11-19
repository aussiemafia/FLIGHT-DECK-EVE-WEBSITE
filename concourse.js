'use strict';

const byId = id => document.getElementById(id);
const view = byId('viewport'), hall = byId('hall');
const menu = byId('menu'), record = byId('record'), frame = record.querySelector('iframe');
const width = 4400, length = 8000, height = 1500, eye = 165;
const visitor = {x: 150, z: 1250, yaw: .045, pitch: .095};
const keys = new Set(), interactive = new Map(), obstacles = [];
const rooms = [
  {name:'Wormhole observatory', image:'wormhole', route:'wormholes', side:-1, z:2200},
  {name:'Ship gallery', image:'porpoise', route:'ships', side:1, z:2200},
  {name:'New Eden atlas', image:'poch-hd', route:'systems', side:-1, z:700},
  {name:'Industry exchange', image:'field', route:'estimate', side:1, z:700},
  {name:'Sleeper archives', image:'class5', route:'drifters', side:-1, z:-850},
  {name:'Fleet fitting', image:'venture', route:'fits', side:1, z:-850},
  {name:'Combat sites', image:'fortizar', route:'sites', side:-1, z:-2500},
  {name:'Loot exchange', image:'crystal', route:'blue-loot', side:1, z:-2500}
];
const flagship = {name:'Windows to New Eden',route:'story',asset:'archive/assets/expanse-deep-space.webp',x:0,z:-3120};
function face(kind,w,h,x,y,z,ry=0,rx=0,rz=0) {
  const node = document.createElement('div');
  node.className = 'face '+kind;
  // Render large architectural finishes at a lower texture density.
  const scale = /^(floor|roof|wall|rib|glass|gallery|stripe|reflection)$/.test(kind) ? 4 : 1;
  w /= scale; h /= scale;
  Object.assign(node.style,{width:w+'px',height:h+'px',left:(-w/2)+'px',top:(-h/2)+'px',
    transform:`translate3d(${x}px,${y}px,${z}px) rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(${rz}deg) scale3d(${scale},${scale},${scale})`});
  node.geometry={w:w*scale,h:h*scale,x,y,z,ry:ry*Math.PI/180,rx:rx*Math.PI/180};
  hall.append(node);
  return node;
}
function exhibit(station,w,h,x,y,z,angle,hero=false) {
  const screen = face('screen'+(hero?' flagship':''),w,h,x,y,z,angle);
  const img = new Image();
  img.src = station.asset || 'assets/exhibits/'+station.image+'.webp';
  img.alt = '';
  const caption = document.createElement('div');
  caption.className = 'caption';
  const label = document.createElement('small');
  label.textContent = hero?'THE EXPANSE  /  PUBLIC GALLERY':'EVE ARCHIVE';
  caption.append(label,station.name);
  screen.append(img,caption);
  interactive.set(screen,station);
}
face('floor',width,length,0,0,0,0,90);
// A continuous, faceted barrel vault meets the ribs over the upper galleries.
for(let i=0;i<24;i++){
  const a=i*Math.PI/24, b=(i+1)*Math.PI/24;
  const x1=2200*Math.cos(a),x2=2200*Math.cos(b);
  const y1=-720-830*Math.sin(a),y2=-720-830*Math.sin(b);
  face('roof',Math.hypot(x2-x1,y2-y1)+3,length,(x1+x2)/2,(y1+y2)/2,0,
    0,0,Math.atan2(y2-y1,x2-x1)*180/Math.PI).style.transform += ' rotateX(90deg)';
}
for(const side of [-1,1]){
  const angle=-90*side;
  face('wall',length,1200,side*2200,-600,0,angle);
  for(const level of [400,790]){
    face('gallery',length,94,side*1920,-level,0,angle);
    face('wall',282,length,side*2060,-level+44,0,0,90);
  }
  for(let z=-3400;z<=3500;z+=1000){
    face('glass',810,300,side*2160,-605,z,angle);
    face('glass',810,260,side*2160,-1000,z,angle);
  }
  face('stripe',9,length,side*1500,-1,0,0,90);
}
for(let z=-3900;z<=3900;z+=975) face('rib',width,height,0,-height/2,z);
for(const end of [-1,1]){
  face('wall',width,height,0,-height/2,end*4000);
  face('glass',3020,900,0,-630,end*3990);
}
exhibit(flagship,2450,810,0,-835,flagship.z,0,true);
for(const x of [-1130,1130]) face('trim',48,310,x,-1380,flagship.z);
const reflection=face('reflection',2200,1280,0,-2,-2490,0,90);
reflection.style.backgroundImage='url('+flagship.asset+')';
for(const station of rooms){
  const {side,z}=station;
  exhibit(station,980,333,side*2120,-222,z,-side*90);
  const deskX=side*1570, angle=-side*90;
  face('base',168,101,deskX,-50,z,angle);
  const desk=face('desk',200,74,deskX-side*12,-114,z,angle,-32);
  const text=document.createElement('span');
  text.textContent=station.name;
  desk.append(text);interactive.set(desk,station);
  obstacles.push({x:deskX,z});
}
function resetAt(station){
  if(station.side){
    Object.assign(visitor,{x:station.side*1070,z:station.z,yaw:station.side*Math.PI/2,pitch:0});
  } else {
    Object.assign(visitor,{x:0,z:-1200,yaw:0,pitch:.25});
  }
  draw();
}
function openStation(station){
  keys.clear();
  byId('record-title').textContent=station.name;
  frame.src='archive/index.html#'+station.route;
  record.showModal();
}
for(const station of [flagship,...rooms]){
  const button=document.createElement('button');
  button.textContent=station.name;
  button.onclick=()=>{menu.close();resetAt(station)};
  byId('destinations').append(button);
}
byId('directory').onclick=()=>{keys.clear();menu.showModal()};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
for(const dialog of [menu,record]) dialog.addEventListener('close',()=>{
  if(dialog===record)frame.removeAttribute('src');
  view.focus({preventScroll:true});draw();
});
frame.onload=()=>{
  if(!record.open)return;
  try{frame.contentWindow.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();record.close()}},true)}catch{}
};
let target=null;
function pick(clientX,clientY){
  const focal=parseFloat(view.style.perspective);
  const u=(clientX-innerWidth/2)/focal,v=(clientY-innerHeight/2)/focal;
  const cy=Math.cos(visitor.yaw),sy=Math.sin(visitor.yaw),cp=Math.cos(visitor.pitch),sp=Math.sin(visitor.pitch);
  const dx=sy*(cp+v*sp)+u*cy,dy=-sp+v*cp,dz=-cy*(cp+v*sp)+u*sy;
  let nearest=Infinity, selected=null;
  for(const [node,station] of interactive){
    const g=node.geometry, c=Math.cos(g.ry),s=Math.sin(g.ry),a=Math.cos(g.rx),b=Math.sin(g.rx);
    const nx=s*a,ny=-b,nz=c*a,denom=dx*nx+dy*ny+dz*nz;
    if(denom>=-.0001)continue;
    const t=((g.x-visitor.x)*nx+(g.y+eye)*ny+(g.z-visitor.z)*nz)/denom;
    if(t<=0||t>=nearest)continue;
    const x=visitor.x+t*dx-g.x,y=-eye+t*dy-g.y,z=visitor.z+t*dz-g.z;
    if(Math.abs(x*c-z*s)>g.w/2||Math.abs(x*s*b+y*a+z*c*b)>g.h/2)continue;
    nearest=t;selected=station;
  }
  return selected;
}
function draw(){
  const focal=Math.min(innerWidth*.87,innerHeight*.82);
  view.style.perspective=focal+'px';
  byId('camera').style.transform='translateZ('+focal+'px)';
  hall.style.transform=`rotateX(${visitor.pitch}rad) rotateY(${visitor.yaw}rad) translate3d(${-visitor.x}px,${eye}px,${-visitor.z}px)`;
  target=pick(innerWidth/2,innerHeight/2);
  const use=byId('interact');
  use.hidden=!target||record.open||menu.open;
  if(target)use.textContent='Open '+target.name+' · E';
}
byId('interact').onclick=()=>{if(target)openStation(target)};
const movement=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'];
window.addEventListener('keydown',e=>{
  if(menu.open||record.open)return;
  if(movement.includes(e.code)){e.preventDefault();keys.add(e.code)}
  if(e.code==='KeyE'&&target&&!e.repeat){e.preventDefault();openStation(target)}
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();drag=null});
let drag=null;
view.addEventListener('pointerdown',e=>{
  if(e.button!==0||drag)return;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,distance:0,station:pick(e.clientX,e.clientY)};
  view.setPointerCapture(e.pointerId);view.focus();
});
view.addEventListener('pointermove',e=>{
  if(drag?.id!==e.pointerId)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  drag.distance+=Math.abs(dx)+Math.abs(dy);
  drag.x=e.clientX;drag.y=e.clientY;
  visitor.yaw+=dx*.003;
  visitor.pitch=Math.max(-1.1,Math.min(1.1,visitor.pitch-dy*.003));draw();
});
view.addEventListener('pointerup',e=>{
  if(drag?.id!==e.pointerId)return;
  const {station,distance}=drag;drag=null;
  if(station&&distance<6)openStation(station);
});
view.addEventListener('pointercancel',()=>{drag=null});
for(const button of document.querySelectorAll('[data-key]')){
  button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.key)};
  button.onlostpointercapture=()=>keys.delete(button.dataset.key);
}
function clear(x,z){
  return Math.abs(x)<2050&&Math.abs(z)<3850&&!obstacles.some(o=>Math.abs(x-o.x)<57&&Math.abs(z-o.z)<125);
}
let previous=performance.now();
function tick(now){
  const dt=Math.min(.04,(now-previous)/1000);previous=now;
  if(keys.size&&!record.open&&!menu.open){
    const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
    const side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
    visitor.yaw+=(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*dt*1.45;
    const step=dt*(keys.has('ShiftLeft')||keys.has('ShiftRight')?1140:520)/Math.max(1,Math.hypot(forward,side));
    const {x,z,yaw}=visitor;
    const nx=x+step*(Math.sin(yaw)*forward+Math.cos(yaw)*side);
    const nz=z+step*(-Math.cos(yaw)*forward+Math.sin(yaw)*side);
    if(clear(nx,z))visitor.x=nx;
    if(clear(visitor.x,nz))visitor.z=nz;
    draw();
  }
  requestAnimationFrame(tick);
}
window.addEventListener('resize',draw);
draw();requestAnimationFrame(tick);
