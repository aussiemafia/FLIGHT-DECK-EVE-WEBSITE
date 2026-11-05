'use strict';
const $ = id => document.getElementById(id);
const view = $('view'), world = $('world'), panel = $('panel');
const groups = [
  [['wormholes','Wormhole space'],['systems','System atlas'],['sites','PvE sites'],['rolling','Hole rolling'],['gas','Gas harvesting']],
  [['drifters','Drifters & Sleepers'],['story','The storyline'],['ships','Ship gallery'],['fits','Fits'],['audit','Site running guide']],
  [['estimate','Mining calculator'],['blue-loot','Sell blue loot'],['split','Loot split'],['dscan','D-scan'],['pi','PI reference']],
  [['reference','Mining & POS'],['guides','Field notes'],['profile','Pilot profile'],['coverage','Archive coverage']]
];
function plane(type,w,h,x,y,z,ry=0,rx=0) {
  const el=document.createElement('div');
  el.className='surface '+type;
  Object.assign(el.style,{width:w+'px',height:h+'px',left:-w/2+'px',top:-h/2+'px',transform:'translate3d('+x+'px,'+y+'px,'+z+'px) rotateY('+ry+'deg) rotateX('+rx+'deg)'});
  world.append(el);
  return el;
}
// The forward glass and each instrument housing occupy separate planes.

plane('crest-glass',620,295,-376,-372,-806);
plane('orbital',850,310,-830,-135,-2340);
plane('drifting',830,335,470,-105,-2100);
const glass=plane('canopy',1586,590,0,-281,-800);
panelWall(1586,402,0,215,-800,0);
plane('rail',1586,38,0,20,-790);
const housings=[
  {left:100,top:505,w:510,h:375,x:-485,y:165,z:-450,angle:20,shape:'8% 4%,86% 1%,100% 70%,92% 100%,13% 96%,0 16%'},
  {left:545,top:580,w:535,h:352,x:0,y:185,z:-560,angle:0,shape:'14% 1%,90% 4%,100% 94%,91% 100%,0 85%'},
  {left:1015,top:357,w:571,h:540,x:506,y:125,z:-440,angle:-23,shape:'9% 6%,99% 0,100% 98%,0 83%,3% 20%'}
];
const monitors=housings.map(h=>{
 const el=plane('housing',h.w,h.h,h.x,h.y,h.z,h.angle,-8);
 el.style.backgroundPosition=-h.left+'px '+(-h.top)+'px';
 el.style.clipPath='polygon('+h.shape+')';
 const a=h.angle*Math.PI/180;
 const depth=68;
 plane('metal',h.w*.86,h.h*.86,h.x-depth*Math.sin(a),h.y+8,h.z-depth*Math.cos(a),h.angle+180,8);
 for(const sign of [-1,1]){
   plane('rail',depth,h.h*.78,h.x+sign*h.w*.44*Math.cos(a)-depth*.5*Math.sin(a),h.y+10,h.z-sign*h.w*.44*Math.sin(a)-depth*.5*Math.cos(a),h.angle+sign*90);
 }
 plane('rail',h.w*.76,162,h.x,336,h.z-45,h.angle);
 return el;
});
const rows=[[182,580,225,35],[637,652,240,35],[1095,491,245,51]];
function openRecord(id,title) {
  if(panel.open) return;
  document.exitPointerLock?.(); keys.clear();
  $('label').textContent=title;
  panel.querySelector('iframe').src='archive/index.html#'+id;
  panel.showModal(); $('close').focus();
}
function wire(button,item) {
  button.dataset.station=item[1]; button.dataset.route=item[0]; button.setAttribute('aria-label',item[1]);
  button.onclick=event=>{event.stopPropagation(); if(!event.detail || !dragged)activateStation(button)};
}
groups.slice(0,3).forEach((list,g)=>list.forEach((item,i)=>{
  const [x,y,w,h]=rows[g],b=document.createElement('button');
  b.className='hot'; Object.assign(b.style,{left:(x-housings[g].left+(g===0?5:g===1?-6:-4)*i)+'px',top:(y-housings[g].top+h*i)+'px',width:w+'px',height:h+'px'});
  b.textContent=item[1]+'　›';wire(b,item);monitors[g].append(b);
}));
monitors.forEach((monitor,index)=>wire(monitor,groups[index][0]));
plane('deck',1586,2000,0,416,200,0,90);
plane('overhead',1586,2000,0,-576,200,0,-90);

for(const side of [-1,1]){
  const angle=side*-90;
  windowWall(2000,992,side*793,-80,200,angle,[-715,-235,235,715],340,260,-270);
  for(const z of [-570,20,610,1100]){
    plane('rail',42,985,side*755,-80,z,angle);
    plane('strip',7,280,side*752,-280,z,angle);
  }
  plane('strip',1850,6,side*760,370,190,angle);
  plane('strip',9,1950,side*585,415,200,0,90);
}
function terminal(title,list,x,z,angle){
 const s=plane('screen',460,300,x,32,z,angle);
 if(z>1200){
   // 1.28 m x 0.84 m: a shared wall display, with controls at standing reach.
   s.style.transform+=' scale(.68)';
   s.classList.add('room-console');
 }
 const heading=document.createElement('button');heading.className='screen-title';heading.textContent=title;wire(heading,list[0]);s.append(heading);
 list.forEach(item=>{const b=document.createElement('button');b.className='station-row';b.textContent=item[1]+'　›';wire(b,item);s.append(b)});
 wire(s,list[0]);
 const rad=angle*Math.PI/180;
 const switches=plane('switches',480,108,x+Math.sin(rad)*31,209,z+Math.cos(rad)*31,angle,52);
 for(const item of list){const key=document.createElement('button');key.textContent=item[1];wire(key,item);switches.append(key);}
 plane('rail',484,142,x,312,z,angle);
}
terminal('NAVIGATION',groups[0],-700,-65,90);
terminal('INTELLIGENCE',groups[1],700,-65,-90);
terminal('OPERATIONS',groups[2],-700,620,90);
terminal('ARCHIVE',groups[3],700,620,-90);
// Give equipment real depth, including the sides visible when walking past it.
function block(type,x,y,z,w,h,d) {
 plane(type,w,h,x,y,z+d/2);
 plane(type,w,h,x,y,z-d/2,180);
 plane(type,d,h,x-w/2,y,z,-90);
 plane(type,d,h,x+w/2,y,z,90);
 plane(type,w,d,x,y-h/2,z,0,90);
 plane(type,w,d,x,y+h/2,z,0,-90);
}
for(const z of [-700,-50,580,1080]){
 block('girder',0,-535,z,1565,75,44);
 for(const x of [-490,490]){
   plane('lamp',230,18,x,-495,z,0,-90);
 }
}
const seats=[];
function addChair(cx,pz){
  seats.push({cx,pz});
  const firstPart=world.children.length;
  block('chair-mount',cx,381,pz,130,68,133);
  block('chair-shell',cx,302,pz,150,82,150);
  block('cushion',cx,258,pz-12,132,20,118);
  block('chair-shell',cx,161,pz+58,156,206,42);
  plane('chair-upholstery',130,170,cx,160,pz+35,180);
  block('cushion',cx,44,pz+58,97,38,45);
  for(const sign of [-1,1]){
    block('chair-mount',cx+sign*79,244,pz+8,16,73,92);
    block('armrest',cx+sign*78,200,pz-2,26,17,116);
  }
  for(const side of [-1,1]){
    const wing=plane('shoulder-wing',36,124,cx+side*65,140,pz+28,180+side*26,-8);
    wing.style.borderRadius='12px 12px 6px 6px';
    block('piston',cx+side*45,340,pz+39,13,69,17);
  }
  block('armrest',cx+78,181,pz-36,11,29,14);
  plane('chair-keypad',22,56,cx-78,190,pz-23,0,90);
  const station=plane('seat-control',128,38,cx,153,pz+81);
  const button=document.createElement('button');button.textContent='Sit at station';
  button.dataset.seat=[cx,pz].join(',');button.dataset.station='Sit at station';
  button.onclick=()=>activateStation(button);station.append(button);
  for(const body of Array.from(world.children).slice(firstPart)){
    if(!body.matches('.cushion,.chair-shell,.chair-upholstery,.armrest,.shoulder-wing,.chair-keypad'))continue;
    body.dataset.seat=button.dataset.seat;body.dataset.station='Sit at station';
    body.onclick=()=>{if(!dragged)activateStation(body)};
  }
}
for(const side of [-1,1]){for(const pz of [140,820])addChair(side*460,pz); addChair(side*845,2910);}
for(const h of housings){
 const rad=h.angle*Math.PI/180;
 plane('strip',h.w*.6,4,h.x+Math.sin(rad)*10,325,h.z+Math.cos(rad)*10,h.angle);
}

function clad(el,cols,rows,zone){
 el.classList.add('clad');
 el.style.gridTemplateColumns='repeat('+cols+',1fr)';
 el.style.gridTemplateRows='repeat('+rows+',1fr)';
 for(let i=0;i<cols*rows;i++){
  const tile=document.createElement('i');tile.className='atlas '+zone;el.append(tile);
 }
}
// All dimensions use 245 scene units per metre. Deck level is y=416.
const floorY=416, roomHeight=640, passageStart=1200, passageEnd=3560;
const roomCentreZ = 2540, roomDepth = 1560, roomWidth = 1020;
function panelWall(w,h,x,y,z,angle) {
 // Keep the interior face at its design coordinate and extrude outward 20 cm.
 const depth=49, a=angle*Math.PI/180, nx=Math.sin(a), nz=Math.cos(a);
 plane('metal',w,h,x,y,z,angle);
 plane('hull-back',w,h,x-depth*nx,y,z-depth*nz,angle+180);
 const mx=x-depth*nx/2,mz=z-depth*nz/2;
 for(const sign of [-1,1]){
   plane('hull-edge',depth,h,mx+sign*w*Math.cos(a)/2,y,mz-sign*w*Math.sin(a)/2,angle+sign*90);
   plane('hull-edge',w,depth,mx,y+sign*h/2,mz,angle,-sign*90);
 }
}
function windowWall(w,h,x,y,z,angle,centres,opening,height,glassY){
 const a=angle*Math.PI/180;
 function section(width,high,u,v){
   if(width>.1&&high>.1)panelWall(width,high,x+u*Math.cos(a),v,z-u*Math.sin(a),angle);
 }
 const top=y-h/2,bottom=y+h/2,upper=glassY-height/2,lower=glassY+height/2;
 section(w,upper-top,0,(upper+top)/2);
 section(w,bottom-lower,0,(lower+bottom)/2);
 let cursor=-w/2;
 for(const u of centres){
   const edge=u-opening/2;
   section(edge-cursor,height,(edge+cursor)/2,glassY);
   plane('viewport',opening,height,x+u*Math.cos(a),glassY,z-u*Math.sin(a),angle);
   cursor=u+opening/2;
 }
 section(w/2-cursor,height,(w/2+cursor)/2,glassY);
}
function bulkhead(x,z,span,height,opening,angle) {
 const wing=(span-opening)/2;
 const a=angle*Math.PI/180;
 for(const side of [-1,1]){
  const offset=side*(opening+wing)/2;
  panelWall(wing,height,x+offset*Math.cos(a),floorY-height/2,z-offset*Math.sin(a),angle);
 }
 const lintel=height-545;
 panelWall(opening,lintel,x,floorY-height+lintel/2,z,angle);
}
function plaque(title,x,y,z,angle,width=330) {
 const sign=plane('plaque',width,50,x,y,z,angle);
 sign.textContent=title;
}
bulkhead(0,passageStart,1586,992,360,180);
plaque('AFT  /  STATION ACCESS',0,-165,1195,180,420);
plaque('FLIGHT DECK',0,-162,1252,0);
function floorAndCeiling(w,d,x,z){
 const floor=plane('extension-floor',w,d,x,floorY,z,0,90);
 const ceiling=plane('extension-ceiling',w,d,x,floorY-roomHeight,z,0,-90);
 clad(floor,Math.ceil(w/450),Math.ceil(d/450),'floor-tile');
 clad(ceiling,Math.ceil(w/600),Math.ceil(d/600),'ceiling-tile');
}
floorAndCeiling(490,passageEnd-passageStart,0,(passageStart+passageEnd)/2);
windowWall(490,roomHeight,0,floorY-roomHeight/2,passageEnd,180,[0],320,180,-94);
plaque('← NAVIGATION LAB   /   INTELLIGENCE →',0,5,passageEnd-4,180,470);
for(const side of [-1,1]){
 const inner=245*side,outer=(245+roomWidth)*side,mid=(inner+outer)/2;
 const facing=-side*90;
 // One continuous partition with a person-sized opening into each room.
 for(const [start,end] of [[passageStart,roomCentreZ-180],[roomCentreZ+180,passageEnd]]){
  panelWall(end-start,roomHeight,inner, floorY-roomHeight/2,(end+start)/2,facing);
 }
 panelWall(360,roomHeight-545,inner,floorY-roomHeight+(roomHeight-545)/2,roomCentreZ,facing);
 floorAndCeiling(roomWidth,roomDepth,mid,roomCentreZ);
 for(const [offset,angle] of [[-1,0],[1,180]]){
  windowWall(roomWidth,roomHeight,mid,floorY-roomHeight/2,roomCentreZ+offset*roomDepth/2,angle,[-243,243],360,230,-68);
 }
 windowWall(roomDepth,roomHeight,outer,floorY-roomHeight/2,roomCentreZ,facing,[-496,496],365,230,-68);
 const name=side===1?'NAVIGATION LAB':'INTELLIGENCE';
 plaque(name,inner-side*5,-165,roomCentreZ,facing);
 plaque(name,outer-side*5,-150,roomCentreZ,facing,450);
 terminal(name,groups[side===1?0:1],outer-side*32,roomCentreZ,facing);
 for(const z of [1900,2210,2850,3160]){
  plane('lamp passage-light',165,14,inner-side*3,-160,z,facing);
 }
}
function corridorStation(title,item,side,z){
 const face=plane('wall-pad',173,258,side*240,44,z,-side*90);
 const mark=document.createElement('strong');mark.textContent=title;
 const status=document.createElement('div');status.className='status-wave';
 const button=document.createElement('button');button.textContent=item[1]+'  ›';
 wire(face,item);wire(button,item);button.replaceChildren(mark,status,document.createTextNode(item[1]+'  ›'));face.append(button);
}
corridorStation('CARGO CONTROL',groups[2][1],1,1770);
corridorStation('SENSOR CONTROL',groups[2][3],-1,1850);
const navDisplay=plane('course-display',560,116,0,-34,-776);
navDisplay.innerHTML='<strong>VIEW BEARING</strong><span class="bearing">000°</span><div class="scale-ticks"></div>';
const navKey=document.createElement('button');navKey.className='bearing-key';wire(navKey,groups[0][1]);navKey.append(...navDisplay.childNodes);navDisplay.append(navKey);
const aftMarker=plane('plaque',350,43,0,198,-790);
aftMarker.textContent='STATION ACCESS  ·  AFT';

document.querySelectorAll('.metal').forEach(el=>clad(el,Math.max(1,Math.round(parseFloat(el.style.width)/600)),Math.max(1,Math.round(parseFloat(el.style.height)/600)),'wall-tile'));
clad(document.querySelector('.deck'),4,5,'floor-tile');
clad(document.querySelector('.overhead'),3,4,'ceiling-tile');
// The pedestal stays fixed while its floating display faces the observer.
const holoZ=20;
const pedestal=plane('holo-base',285,285,0,397,holoZ,0,90);
plane('holo-ring',195,195,0,270,holoZ,0,90);
plane('holo-ring inner-ring',235,235,0,235,holoZ,0,90);
const hologram=plane('holo-display',278,186,0,91,holoZ);
hologram.innerHTML='<div class="holo-caption">BRIDGE PROJECTOR</div><div class="feed"><img alt="Fortizar projection" src="archive/assets/fortizar-cutout.webp"></div><button class="holo-open"></button>';
const holoAction=hologram.querySelector('button');
const feed=hologram.querySelector('.feed');
let projected=['ships','Ship gallery'];
function labelProjection(){
 holoAction.dataset.station='Open '+projected[1];
 holoAction.textContent=holoAction.dataset.station+'  ›';
}
labelProjection();
holoAction.onclick=()=>openRecord(...projected);
hologram.dataset.station='Open projection';hologram.onclick=e=>{if(e.target!==holoAction)openRecord(...projected)};
let messageTimer;
function activateStation(control){
 if(control.dataset.seat){
   const [sx,sz]=control.dataset.seat.split(',').map(Number);
   if(seated)standUp();
   seated={x:sx,z:sz};x=sx;z=sz-8;yaw=0;pitch=0;keys.clear();$('stand').hidden=false;view.focus();return;
 }
 if(control===hologram||control===holoAction){openRecord(...projected);return;}
 projected=[control.dataset.route,control.dataset.station];
 labelProjection();
 const brief={
  ships:['naglfar-cutout','HULL IDENTIFICATION','Marauders · Capitals · Drifters'],
  drifters:['drifter-cutout','VIGILANT TYRANNOS','Recon / Response battleships'],
  fits:['naglfar-cutout','FITTING LIBRARY','19 saved fits · EFT export'],
  story:['drifter-cutout','ANOIKIS','Sleeper ruins · Drifter emergence'],
  sites:['expanse-deep-space','SITE RECORDS','48 sites · C1 through C6'],
  audit:['expanse-deep-space','ENCOUNTER REVIEW','Wave triggers · Escalations'],
  systems:['expanse-deep-space','SYSTEM ATLAS','2,603 wormhole system records'],
  wormholes:['expanse-deep-space','WORMHOLE SPACE','System effects · Connections'],
  rolling:['expanse-deep-space','TRANSIT MASS','Cold and hot transits · Mass budget'],
  gas:['expanse-deep-space','GAS HARVESTING','Reservoirs · Clouds · Defenders'],
  'blue-loot':['fortizar-cutout','HIGH-SEC BUYERS','99 stations · 4 Sleeper commodities'],
  dscan:['drifter-cutout','DIRECTIONAL SCAN','Ship types · Contact counts'],
  split:['fortizar-cutout','FLEET PAYOUT','Weighted shares · Total ISK'],
  estimate:['fortizar-cutout','MINING YIELD','Cycle time · Volume · Price'],
  pi:['fortizar-cutout','PLANETARY INDUSTRY','Product records · Production'],
  reference:['fortizar-cutout','INDUSTRIAL SYSTEMS','Mining modules · POS structures'],
  guides:['expanse-deep-space','FIELD NOTES','Fitting · Scanning · Site running'],
  profile:['fortizar-cutout','PILOT RECORD','Character portrait · Callsign'],
  coverage:['expanse-deep-space','ARCHIVE COVERAGE','Systems · Fits · Encounters']
 }[projected[0]];
 const image=document.createElement('img');image.src='archive/assets/'+brief[0]+'.webp';image.alt=projected[1];
 const legend=document.createElement('div');legend.className='holo-legend';
 const name=document.createElement('strong');name.textContent=brief[1];
 const detail=document.createElement('span');detail.textContent=brief[2];
 legend.append(name,detail);feed.replaceChildren(image,legend);
 const notice=$('projectionNotice');
 notice.textContent=projected[1]+' projected · Centre of flight deck';
 notice.hidden=false;clearTimeout(messageTimer);
 messageTimer=setTimeout(()=>notice.hidden=true,6000);
 openRecord(...projected);
}
const keys=new Set(), clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let x=0,z=520,yaw=0,pitch=0,drag=false,dragged=false,totalDrag=0,target=null,previous=performance.now();
let seated=null;
function standUp(){
 if(!seated)return;
 x=seated.x;z=seated.z-160;seated=null;$('stand').hidden=true;keys.clear();view.focus();
}
$('stand').onclick=standUp;
function helm(){standUp();x=0;z=520;yaw=0;pitch=0;keys.clear();view.focus()}
$('reset').onclick=helm;
const recordFrame=panel.querySelector('iframe');
recordFrame.addEventListener('load',()=>{
 try{recordFrame.contentWindow.addEventListener('keydown',e=>{
   if(e.key==='Escape' && panel.open){e.preventDefault();panel.close();}
 },true)}catch{}
});
$('close').onclick=()=>panel.close();panel.onclose=()=>{dragged=false;view.focus()};
$('walk').onclick=async()=>{view.focus();try{await view.requestPointerLock()}catch{$('walk').textContent='Drag to look'}};
document.onpointerlockchange=()=>{$('walk').textContent=document.pointerLockElement?'Mouse look active':'Enter mouse look';keys.clear()};
view.onpointerdown=e=>{drag=!e.target.closest('button,[data-station]');dragged=false;totalDrag=0};
window.addEventListener('pointerup',()=>{drag=false});
window.addEventListener('pointermove',e=>{
 if(panel.open||(!drag&&!document.pointerLockElement))return;
 totalDrag+=Math.abs(e.movementX)+Math.abs(e.movementY);
 if(totalDrag>4)dragged=true;
 yaw+=e.movementX*.0022;pitch=clamp(pitch+e.movementY*.0022,-1.22,1.22);
});
document.addEventListener('click',e=>{if(document.pointerLockElement && target && !panel.open){e.stopImmediatePropagation();activateStation(target)}},true);

$('use').onclick=()=>{if(target)activateStation(target)};
window.addEventListener('keydown',e=>{
 if(panel.open)return;
 if(['KeyW','KeyS','KeyA','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();if(!keys.size)previous=performance.now();keys.add(e.code)}
 if(e.code==='KeyE'&&!e.repeat){if(seated)standUp();else if(target)activateStation(target);}
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();drag=false});
function isClear(px,pz){
 const radius=42;

 if(pz < -650 || pz > passageEnd-radius)return false;
 if(pz < passageStart-radius && Math.abs(px)>610)return false;
 if(Math.abs(pz-passageStart)<=radius && Math.abs(px)>180-radius)return false;
 if(pz>passageStart+radius){
  const distance=Math.abs(px);
  if(distance>245+roomWidth-radius)return false;
  if(distance>245+roomWidth-135 && Math.abs(pz-roomCentreZ)<230)return false;
  if(distance>245-radius && Math.abs(pz-roomCentreZ)>180-radius && distance<245+radius)return false;
  if(distance>=245+radius && Math.abs(pz-roomCentreZ)>roomDepth/2-radius)return false;
 }

 if (seats.some(({cx,pz:sz})=>Math.abs(pz-sz)<92 && Math.abs(px-cx)<105))return false;
 return housings.every(h=>{
  const a=h.angle*Math.PI/180,dx=px-h.x,dz=pz-h.z;
  return Math.abs(dx*Math.cos(a)-dz*Math.sin(a))>h.w*.48+22 || Math.abs(dx*Math.sin(a)+dz*Math.cos(a)+22)>73;
 });
}
function resize(){const lens=Math.min(innerWidth*.59,innerHeight*.96);view.style.perspective=lens+'px';$('camera').style.transform='translateZ('+lens+'px)'}
window.addEventListener('resize',resize);resize();
function frame(now){
 const dt=Math.max(0,Math.min(1,(now-previous)/1000));previous=now;
 const f=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),r=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
 const step=dt*315/Math.max(1,Math.hypot(f,r));
 yaw+=(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*dt*1.6;
 pitch=clamp(pitch+(Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp')))*dt*1.3,-1.22,1.22);
 const steps=Math.max(1,Math.ceil(step/25));
 for(let i=0;i<steps && !seated && (f||r);i++){
  const nextX=x+(Math.sin(yaw)*f+Math.cos(yaw)*r)*step/steps;
  const nextZ=z+(-Math.cos(yaw)*f+Math.sin(yaw)*r)*step/steps;
  if(isClear(nextX,z))x=nextX;
  if(isClear(x,nextZ))z=nextZ;
 }
 hologram.style.transform='translate3d(0,91px,'+holoZ+'px) rotateY('+Math.atan2(x,z-holoZ)+'rad)';
 world.style.transform='rotateX('+(-pitch)+'rad) rotateY('+yaw+'rad) translate3d('+(-x)+'px,'+(seated?-105:((r||f)?Math.sin(now*.012)*2:0))+'px,'+(-z)+'px)';
 target=panel.open?null:document.elementFromPoint(innerWidth/2,innerHeight/2)?.closest('[data-station]');
 $('use').hidden=!target;if(target)$('use').textContent='E　'+target.dataset.station;
 const sector=z<1200?'Flight deck':Math.abs(x)<245?'Aft passage':x>0?'Navigation lab':'Intelligence';
 $('sector').textContent=sector;
 const degrees=((Math.round(yaw*180/Math.PI)%360)+360)%360;
 navDisplay.querySelector('.bearing').textContent=String(degrees).padStart(3,'0')+'°';
 if(window.drawExterior)window.drawExterior(now,yaw,pitch,parseFloat(view.style.perspective));
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
