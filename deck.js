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
// Formed metalwork uses continuous cross-sections. Both renderers consume
// the same world-space faces, including the radius through each porthole.
const formedPanels=[];
function formedQuad(points,finish){formedPanels.push({points,finish});}
function curvedPorthole(cx,cy,cz,angle,w,h){
 const a=angle*Math.PI/180,cs=Math.cos(a),sn=Math.sin(a);
 const point=(u,v,d)=>[cx+cs*u+sn*d,cy+v,cz-sn*u+cs*d];
 function contour(inset,r,d){
   const ww=w/2-inset,hh=h/2-inset,points=[];
   for(const [sx,sy,base] of [[1,-1,-90],[1,1,0],[-1,1,90],[-1,-1,180]]){
     for(let j=0;j<=6;j++){
       const t=(base+j*15)*Math.PI/180;
       points.push(point(sx*(ww-r)+r*Math.cos(t),sy*(hh-r)+r*Math.sin(t),d));
     }
   }
   return points;
 }
 const rings=[[0,.1,12,'pearl'],[1,34,15,'pearl'],[6,32,18,'pearl'],
   [12,31,16,'pearl'],[17,29,10,'alloy'],[19,28,-3,'gasket'],
   [20,27,-31,'alloy'],[23,26,-39,'gasket'],[24,25,-40,'glasslight'],[26,23,-41,'gasket']];
 let prev;
 for(const [inset,r,d,finish] of rings){
   const next=contour(inset,Math.min(r,h*.18,w*.18),d);
   if(prev)for(let i=0;i<next.length;i++){const j=(i+1)%next.length;formedQuad([prev[i],prev[j],next[j],next[i]],finish);}
   prev=next;
 }
}
function ceilingCove(x,z,angle,length,top){
 const a=angle*Math.PI/180,cs=Math.cos(a),sn=Math.sin(a),r=79;
 function point(u,t){const d=r*(1-Math.cos(t)),v=r*(1-Math.sin(t));return [x+u*cs+d*sn,top+v,z-u*sn+d*cs];}
 for(let j=0;j<10;j++){
   const t=j*Math.PI/20,n=(j+1)*Math.PI/20;
   formedQuad([point(-length/2,t),point(length/2,t),point(length/2,n),point(-length/2,n)],j===7?'glasslight':'pearl');
 }
}
// The forward glass and each instrument housing occupy separate planes.

// Seven joined panes span 160 degrees around the bow. Their sills, headers
// and mullions are solid members; the glazing is seated behind their faces.
const bayScreens=[],cabinetFootprints=[];
function windowCabinet(wx,wz,angle,w,top,upper,lower,bottom,withControls=true){
 const rad=angle*Math.PI/180,ux=Math.cos(rad),uz=-Math.sin(rad),nx=-uz,nz=ux;
 const point=(u,y,d)=>[wx+ux*u+nx*d,y,wz+uz*u+nz*d];
 function casing(profile){
   for(let j=1;j<profile.length;j++){
     const [y0,d0]=profile[j-1],[y1,d1,finish]=profile[j];
     formedQuad([point(-w/2,y0,d0),point(w/2,y0,d0),point(w/2,y1,d1),point(-w/2,y1,d1)],finish);
     for(const side of [-1,1]){
       const u=side*w/2;
       formedQuad([point(u,y0,-2),point(u,y0,d0),point(u,y1,d1),point(u,y1,-2)],'alloy');
     }
   }
 }
 const deskY=lower+Math.min(102,(bottom-lower)*.48),roofY=Math.min(upper-17,top+4);
 casing([[bottom,47],[bottom-20,47,'gasket'],[bottom-26,88,'alloy'],[deskY+9,88,'pearl'],[deskY,84,'alloy'],[lower+9,22,'pearl'],[lower+2,16,'gasket']]);
 casing([[upper-1,12],[upper-11,24,'gasket'],[roofY,125,'pearl'],[roofY-4,147,'alloy'],[roofY-3,166,'pearl']]);
 function inset(label,y0,d0,y1,d1,offset,span){
   const length=Math.hypot(y1-y0,d1-d0),ry=(y0+y1)/2,rd=(d0+d1)/2;
   const [px,py,pz]=point(offset,ry,rd+2);
   const face=plane('bay-display',span,length*.71,px,py,pz,angle,Math.atan2(d1-d0,y1-y0)*180/Math.PI);
   bayScreens.push({face,wx,wz,label});
 }
 if(withControls){
   const aftRoom=Math.abs(wx)>300 && wz>5000;
   for(const offset of aftRoom?[-.22,.22]:[0])inset('upper',roofY,125,upper-11,24,offset*w,w*(aftRoom?.39:.70));
   for(const offset of aftRoom?[-.31,0,.31]:[0])inset('lower',lower+9,22,deskY,84,offset*w,w*(aftRoom?.28:.75));
 }
 for(const side of [-1,1]){
   const u=side*w*.38,y=(bottom+deskY)*.5;
   formedQuad([point(u-8,y-12,89),point(u+8,y-12,89),point(u+8,y+12,89),point(u-8,y+12,89)],'glasslight');
 }
 cabinetFootprints.push({wx,wz,ux,uz,nx,nz,half:w/2});
}
const bowPoints=Array.from({length:8},(_,i)=>{
 const a=(-80+i*160/7)*Math.PI/180;
 return [793*Math.sin(a)/Math.sin(80*Math.PI/180),-380-458*Math.cos(a)];
});
for(let i=0;i<7;i++){
 const [ax,az]=bowPoints[i],[bx,bz]=bowPoints[i+1];
 const w=Math.hypot(bx-ax,bz-az), angle=-Math.atan2(bz-az,bx-ax)*180/Math.PI;
 windowWall(w,992,(ax+bx)/2,-80,(az+bz)/2,angle,[0],w-14,544,-280);
}
const housings=[
 {title:'Navigation',x:-362,z:-426,angle:26,w:337},
 {title:'Intelligence',x:0,z:-525,angle:0,w:337},
 {title:'Operations',x:362,z:-426,angle:-26,w:337}
];
let recordProjector;
function openRecord(id,title,plate,projector=hologram) {
  recordProjector=projector;
  if(panel.open) return;
  document.exitPointerLock?.(); keys.clear();
  $('label').textContent=title;
  panel.querySelector('iframe').src='archive/index.html'+(plate?'?exhibit='+plate:'')+'#'+id;
  panel.showModal(); $('close').focus();
}
function wire(button,item) {
  button.dataset.station=item[1]; button.dataset.route=item[0]; button.setAttribute('aria-label',item[1]);
  button.onclick=event=>{event.stopPropagation(); if(!event.detail || !dragged)activateStation(button)};
}
const instrumentFeeds=[],roomScreens=[];
function addInstrument(display,items,px,pz){
 const media=mountExhibit(display,routePlate(items[0][0]));
 media.classList.add('station-feed');instrumentFeeds.push({display,px,pz});
}
let nextFeedUpdate=0;
function updateFeeds(now){
 if(now<nextFeedUpdate)return;
 nextFeedUpdate=now+350;
 for(const {el,hx,hz} of [...roomScreens,{el:hologram,hx:0,hz:holoZ}]){
   const clip=el.querySelector('video.exhibit-media');if(!clip)continue;
   const dx=hx-x,dz=hz-z;
   const active=!panel.open&&!document.hidden&&Math.hypot(dx,dz)<1450&&dx*Math.sin(yaw)-dz*Math.cos(yaw)>-120&&!el.classList.contains('away');
   if(active&&clip.paused)clip.play().catch(()=>{});else if(!active&&!clip.paused)clip.pause();
 }
 for(const {display,px,pz} of instrumentFeeds){
   const video=display.querySelector('video.station-feed');if(!video)continue;
   const dx=px-x,dz=pz-z,distance=Math.hypot(dx,dz);
   const facing=dx*Math.sin(yaw)-dz*Math.cos(yaw);
   const visible=!panel.open&&!document.hidden&&distance<1200&&facing>distance*.35&&!video.parentNode.classList.contains('away');
   if(visible&&video.paused)video.play().catch(()=>{});
   else if(!visible&&!video.paused)video.pause();
 }
}
function buildHelmConsole(h,items){
 const assembly=document.createElement('div');
 assembly.className='helm-assembly';
 assembly.style.transform='translate3d('+h.x+'px,95px,'+h.z+'px) rotateY('+h.angle+'deg)';
 world.append(assembly);
 function part(type,w,high,x,y,z,ry=0,rx=0){
   const el=plane(type,w,high,x,y,z,ry,rx);assembly.append(el);return el;
 }
 function casework(type,w,high,depth,y,z){
   part(type,w,high,0,y,z);
   part(type+' case-back',w,high,0,y,z-depth,180);
   for(const sign of [-1,1]){
     part('case-edge',depth,high,sign*w/2,y,z-depth/2,sign*90);
     part('case-edge',w,depth,0,y+sign*high/2,z-depth/2,0,-sign*90);
   }
 }
 casework('console-plinth',216,27,150,306,24);
 casework('console-support',114,180,88,208,-12);
 casework('console-case',h.w,218,64,0,0);
 const display=part('helm-display',h.w-22,194,0,0,2);
 const heading=document.createElement('button');heading.className='helm-title';heading.textContent=h.title;
 wire(heading,items[0]);display.append(heading);
 addInstrument(display,items,h.x,h.z);
 items.forEach(([id,label],i)=>{
   const row=document.createElement('button');row.className='helm-row';
   row.innerHTML='<span>'+label+'</span><span aria-hidden="true">›</span>';
   wire(row,[id,label]);display.append(row);
 });
 wire(display,items[0]);
 const ledge=part('console-keys',h.w-16,65,0,123,32,0,62);
 for(const item of items){
   const key=document.createElement('button');key.title=item[1];key.textContent=item[1];wire(key,item);ledge.append(key);
 }
 part('case-edge',h.w-14,16,0,140,60);
}
housings.forEach((h,i)=>buildHelmConsole(h,groups[i]));
plane('deck',1586,2000,0,416,200,0,90);
plane('overhead',1586,2000,0,-576,200,0,-90);

for(const side of [-1,1]){
  const angle=side*-90;
  const start=bowPoints[0][1],len=1200-start;
  windowWall(len,992,side*793,-80,(start+1200)/2,angle,[-.36,-.12,.12,.36].map(t=>t*len),302,300,-164);
  for(const z of [-570,20,610,1100]){
    plane('rail',42,985,side*755,-80,z,angle);
    plane('strip',7,280,side*752,-280,z,angle);
  }
  plane('strip',1850,6,side*760,370,190,angle);
  plane('strip',9,1950,side*585,415,200,0,90);
}
function terminal(title,list,x,z,angle){
 let roomProjector;
 const s=plane('screen',460,300,x,32,z,angle);
 if(z>1200){
   // 1.28 m x 0.84 m: a shared wall display, with controls at standing reach.
   s.style.transform+=' scale(.68)';
   s.classList.add('room-console');
 }
 const heading=document.createElement('button');heading.className='screen-title';heading.textContent=title;wire(heading,list[0]);s.append(heading);
 list.forEach(item=>{const b=document.createElement('button');b.className='station-row';b.textContent=item[1]+'　›';wire(b,item);s.append(b)});
 addInstrument(s,list,x,z);
 wire(s,list[0]);
 const rad=angle*Math.PI/180;
 const scale=z>1200?.68:1, width=460*scale, high=300*scale, depth=32;
 for(const sign of [-1,1]){
   plane('case-edge',depth,high,x+sign*width*.5*Math.cos(rad)-Math.sin(rad)*depth/2,32,z-sign*width*.5*Math.sin(rad)-Math.cos(rad)*depth/2,angle+sign*90);
   plane('case-edge',width,depth,x-Math.sin(rad)*depth/2,32+sign*high/2,z-Math.cos(rad)*depth/2,angle,-sign*90);
 }
 if(z>1200){
   const hx=Math.sign(x)*932,hz=z+(title.toUpperCase()==='OBSERVATION LOUNGE'?545:-402);
   const projection=plane('holo-display room-projection',345,218,hx,8,hz,angle);
   const parts=projectorParts(projection,title+' PROJECTOR');
   const slides=roomExhibits[title.toUpperCase()],next=document.createElement('button');
   next.className='exhibit-next';next.textContent='›';next.setAttribute('aria-label','Next exhibit');
   parts.actions.append(next);
   for(const [size,height] of [[180,298],[222,264]])plane('holo-ring',size,size,hx,height,hz,0,90);
   plane('holo-base',260,260,hx,403,hz,0,90);
   let current=0;
   function displaySlide(key,route=exhibitPlates[key][1],label=exhibitPlates[key][0]){
     renderProjection(parts,key,route);parts.caption.textContent=label+'　›';
     wire(projection,[route,label]);wire(parts.caption,[route,label]);
     projection.dataset.plate=parts.caption.dataset.plate=key;
   }
   roomProjector=(item)=>displaySlide(routePlate(item[0]),item[0],item[1]);
   s.projectTopic=roomProjector;
   next.dataset.station='Next exhibit';next.dataset.route='cycle';
   next.advance=()=>{current=(current+1)%slides.length;displaySlide(slides[current])};
   next.onclick=e=>{e.stopPropagation();next.advance()};
   projection.showRecord=displaySlide;
   displaySlide(slides[0]);roomScreens.push({el:projection,hx,hz,showPlate:displaySlide});
 }
 const switches=plane('switches',480,108,x+Math.sin(rad)*31,209,z+Math.cos(rad)*31,angle,52);
 switches.projectTopic=roomProjector;
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
// Loft rounded cross-sections into closed shells, cushions and plinths.
const upholsteredSilhouettes=[];
function upholstery(finish,x,y,z,w,h,d,tilt=0,shape=.55){
 const count=24,a=tilt*Math.PI/180,cs=Math.cos(a),sn=Math.sin(a);
 const profile=[[-.50,.70],[-.46,.87],[-.33,.98],[0,1],[.33,.98],[.46,.87],[.50,.70]];
 function point(i,level,scale){
   const t=i*2*Math.PI/count,c=Math.cos(t),s=Math.sin(t);
   const u=Math.sign(c)*Math.pow(Math.abs(c),shape)*w*.5*scale;
   const v=Math.sign(s)*Math.pow(Math.abs(s),shape)*d*.5*scale;
   return [x+u,y+h*level*cs-v*sn,z+h*level*sn+v*cs];
 }
 const outline=[];
 let previous=Array(count).fill([x,y-h*.50*cs,z-h*.50*sn]);
 for(const [level,scale] of profile){
   const ring=Array.from({length:count},(_,i)=>point(i,level,scale));
   for(let i=0;i<count;i++){const j=(i+1)%count;formedQuad([previous[j],previous[i],ring[i],ring[j]],finish)}
   outline.push(...ring);previous=ring;
 }
 upholsteredSilhouettes.push(outline);
 const tip=[x,y+h*.50*cs,z+h*.50*sn];
 for(let i=0;i<count;i++)formedQuad([previous[(i+1)%count],previous[i],tip,tip],finish);
}
function furnishing(type,x,y,z,w,h,d){
 const cloth=type.includes('pad')||type.includes('pillow');
 const finish=cloth?'upholstery':type==='tabletop'?'smoked':'bronze';
 upholstery(finish,x,y,z,w,h,d,type==='lounge-pad'&&h>d?-10:0,cloth?.55:.72);
 if(type.includes('base')){
   upholstery('gasket',x,y+h*.35,z,w*.75,h*.3,d*.74);
   upholstery('warmline',x,y+h*.23,z,w*.88,2,d*.88);
 }
 if(type==='lounge-pad'&&h>d)upholstery('sienna',x+55,y-12,z-20,63,60,26,-12);
 if(type==='lounge-pad'){
   const proxy=plane('seat-pick',w,h,x,y,z-d/2,180);proxy.style.visibility='hidden';
 }
}
const seats=[];
function addChair(cx,pz,style="pilot"){
  seats.push({cx,pz});
  const firstPart=world.children.length;
  // Sections follow the curved side profile (forward is negative Z).
  function cockpitPart(kind,offset,width,profile){
    const ys=profile.map(pt=>pt[1]),zs=profile.map(pt=>pt[0]);
    const low=Math.min(...ys),high=Math.max(...ys),front=Math.min(...zs),rear=Math.max(...zs);
    for(const sign of [-1,1]){
      const face=plane(kind+' seat-flank',rear-front,high-low,cx+offset+sign*width/2,(high+low)/2,pz+(rear+front)/2,sign*90);
      face.style.clipPath='polygon('+profile.map(([z,y])=>((sign===1?rear-z:z-front)/(rear-front)*100)+'% '+((y-low)/(high-low)*100)+'%').join(',')+')';
    }
    for(let i=0;i<profile.length;i++){
      const [za,ya]=profile[i],[zb,yb]=profile[(i+1)%profile.length];
      const dy=yb-ya,dz=zb-za;
      const strip=plane(kind+' seat-band',width,Math.hypot(dy,dz),cx+offset,(ya+yb)/2,pz+(za+zb)/2,0,Math.atan2(dz,dy)*180/Math.PI);
      strip.style.backfaceVisibility='visible';
    }
  }
  cockpitPart('chair-mount',0,136,[[-86,410],[-66,391],[45,388],[80,400],[78,414],[-85,414]]);
  cockpitPart('piston',0,42,[[-38,395],[-29,351],[25,298],[55,303],[27,366],[0,394]]);
  cockpitPart('chair-shell',0,143,[[-91,278],[-70,263],[10,268],[31,246],[57,135],[84,61],[105,52],[115,66],[94,167],[70,272],[39,304],[-60,307]]);
  upholstery('upholstery',cx,262,pz-27,132,39,124,-3);
  upholstery('upholstery',cx,176,pz+56,124,169,40,-20);
  upholstery('sienna',cx,177,pz+33,94,27,20,-20);
  upholstery('upholstery',cx,70,pz+88,111,59,42,-17);
  for(const sign of [-1,1])upholstery('bronze',cx+sign*65,187,pz+59,18,130,39,-20);
  for(const sign of [-1,1]){
    cockpitPart('shoulder-shell',sign*65,25,[[6,220],[17,174],[32,150],[47,94],[64,77],[85,78],[79,112],[66,147],[56,202],[40,231]]);
    cockpitPart('chair-shell',sign*75,19,[[-64,215],[-53,202],[40,193],[56,213],[25,273],[-1,274],[12,224],[-51,230]]);
    cockpitPart('arm-cap',sign*76,32,[[-80,204],[-70,193],[8,188],[29,192],[38,200],[21,209],[-64,217]]);
    cockpitPart('piston',sign*50,14,[[-38,388],[-40,370],[13,301],[30,301],[26,317]]);
    const display=plane('chair-keypad',26,48,cx+sign*76,187,pz-32,0,70);
    display.innerHTML='<i></i><i></i><i></i>';
  }
  if(style!=='pilot'){
    // Open swept canopy: two side spars, a crown and a swivel undercarriage.
    const outline=[[67,141],[91,112],[105,73],[96,37],[72,8],[38,-13],[-5,-22],[-29,-10],[-32,3],[-9,-6],[30,1],[57,16],[78,42],[84,70],[73,98],[56,118]];
    for(const sign of [-1,1]){
      cockpitPart('canopy-spar',sign*66,17,outline);
      cockpitPart('crown-light',sign*68,18,[[27,-14],[57,-1],[77,14],[80,20],[56,4],[25,-8]]);
    }
    cockpitPart('canopy-shell',0,139,[[-29,-10],[-13,-20],[21,-18],[39,-10],[36,0],[6,-7],[-22,0]]);
    cockpitPart('swivel',0,112,[[-52,383],[-64,372],[-55,353],[35,345],[65,362],[58,379]]);
  }
  cockpitPart('arm-cap',76,17,[[-55,195],[-60,178],[-55,161],[-44,159],[-39,171],[-45,192]]);
  const station=plane('seat-control',128,38,cx,150,pz+112);
  const button=document.createElement('button');button.textContent='Sit at station';
  button.dataset.seat=[cx,pz].join(',');button.dataset.station='Sit at station';
  button.onclick=()=>activateStation(button);station.append(button);
  for(const body of Array.from(world.children).slice(firstPart)){
    body.classList.add(style+'-chair');
    if(body===station)continue;
    body.dataset.seat=button.dataset.seat;body.dataset.station='Sit at station';
    body.onclick=()=>{if(!dragged)activateStation(body)};
  }
  for(const [idx,key] of Array.from(world.children).slice(firstPart).filter(el=>el.classList.contains('chair-keypad')).entries()){
    const topic=idx===0?groups[0][1]:groups[1][3];
    delete key.dataset.seat;key.textContent=idx===0?'ATLAS':'FITS';wire(key,topic);
  }
}
for(const side of [-1,1]){
 for(const pz of [140,820])addChair(side*460,pz,pz===140?'command':'pilot');
 addChair(side*845,2910,'lab');
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
const floorY=416, roomHeight=640, passageStart=1200, passageEnd=14300;
const roomCentreZ = 2540, roomDepth = 1560, roomWidth = 1020;
function panelWall(w,h,x,y,z,angle) {
 // Keep the interior face at its design coordinate and extrude outward 20 cm.
 const depth=49, a=angle*Math.PI/180, nx=Math.sin(a), nz=Math.cos(a);
 const face=plane('metal hull-panel',w,h,x,y,z,angle);
 face.style.setProperty('--module',Math.min(260,w)+'px');
 // Stand raised armour and service ribs off the finished pressure hull.
 if(w>125 && h>145){
   const count=Math.max(1,Math.round(w/240)),pw=w/count-2;
   for(let i=0;i<count;i++){
     const u=(i+.5)*w/count-w/2, px=x+u*Math.cos(a),pz=z-u*Math.sin(a);
     const rows=Math.max(1,Math.round(h/235)),step=h/rows;
     for(let j=0;j<rows;j++){
       plane('armour-face',pw,step-2,px+nx*11,y-h/2+(j+.5)*step,pz+nz*11,angle);
     }
     for(const sign of [-1,1]){
       plane('armour-edge',12,h-18,px+sign*pw*.5*Math.cos(a)+nx*5,y,pz-sign*pw*.5*Math.sin(a)+nz*5,angle+sign*90);
     }
   }
 }
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
 ceilingCove(x,z,angle,w,y-h/2);
 const top=y-h/2,bottom=y+h/2,upper=glassY-height/2,lower=glassY+height/2;
 section(w,upper-top,0,(upper+top)/2);
 section(w,bottom-lower,0,(lower+bottom)/2);
 let cursor=-w/2;
 for(const u of centres){
   const edge=u-opening/2;
   section(edge-cursor,height,(edge+cursor)/2,glassY);
   const wx=x+u*Math.cos(a), wz=z-u*Math.sin(a);
   windowCabinet(wx,wz,angle,opening-5,top,upper,lower,bottom);
   curvedPorthole(wx,glassY,wz,angle,opening,height);
   // Recess the glass at the far end of a stepped, machined window well.
   const toward=(offset,side,v,wide,high,turn=0,tilt=0,kind='reveal')=>
     plane(kind,wide,high,wx+side*Math.cos(a)+offset*Math.sin(a),v,wz-side*Math.sin(a)+offset*Math.cos(a),angle+turn,tilt);
   toward(-46,0,glassY,opening,height,0,0,'viewport');
   toward(23,0,glassY-height/2-21,opening+6,67,0,36,'window-soffit');
   toward(4,0,glassY-height/2+1,opening-10,4,0,0,'glass-light');
   for(const sign of [-1,1]){
     toward(-20,sign*(opening/2-8),glassY,58,height,sign*-76);
     toward(-20,0,glassY+sign*(height/2-8),opening,58,0,sign*76);
     toward(6,sign*(opening/2-2),glassY,9,height,0,0,'rim-metal');
     toward(6,0,glassY+sign*(height/2-2),opening,9,0,0,'rim-metal');
   }
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
 displayCase(width,50,x,y,z,angle);
 const sign=plane('plaque',width,50,x,y,z,angle);
 sign.textContent=title;
}
// Ribbed pressure-door collars run through the partition. Cross ties and
// chamfered corners expose its return faces from either adjoining room.
const hatches=[];
// Chamfered observation glass, centred in the upper portion of each leaf.
const portTop=-86,portBottom=327,portCentre=98,portHalfWidth=56,portBevel=16;
// The inclined load-bearing webs split the glazing into four viewing blocks.
const hatchWebs=[[43,-53,149,49,15],[149,49,48,151,16],[49,181,150,181,14],[49,179,148,290,16]];
function insideWeb(u,y){
 return hatchWebs.some(([a,b,c,d,width])=>{
   const x=c-a,z=d-b,t=Math.max(0,Math.min(1,((u-a)*x+(y-b)*z)/(x*x+z*z)));
   return Math.hypot(u-a-t*x,y-b-t*z)<=width/2;
 });
}
function portHalf(y){return portHalfWidth-Math.max(0,portTop+portBevel-y,y-portBottom+portBevel)}

function fitHatch(x,z,angle,panoramic){
 const a=angle*Math.PI/180,ux=Math.cos(a),uz=-Math.sin(a),nx=-uz,nz=ux;
 const id=hatches.length,door={x,z,ux,uz,openness:0,panoramic};
 hatches.push(door);
 // The offset joint makes a fitted tooth through the full depth of both leaves.
 const seam=[[-117,0],[portTop,0],[portTop+portBevel,0],[26,0],[61,28],[130,28],[165,0],[276,0],[303,-19],[portBottom-portBevel,-19],[portBottom,-19],[356,-19],[379,0],[416,0]];
 for(const side of [-1,1]){
   const vertex=(u,y,d)=>[x+u*ux+d*nx,y,z+u*uz+d*nz];
   const face=(points,finish)=>formedPanels.push({points:points.map(q=>vertex(...q)),finish,leaf:id*2+(side===1?1:0)});
   for(let j=1;j<seam.length;j++){
     const [top,start]=seam[j-1],[bottom,end]=seam[j];
     const left=side*168,lip=start+side*1.5,tip=end+side*1.5;
     for(const depth of [-10,10]){
       if(top>=portTop&&bottom<=portBottom){
         const lo=side*(portCentre-portHalf(top)),hi=side*(portCentre+portHalf(top));
         const nextLo=side*(portCentre-portHalf(bottom)),nextHi=side*(portCentre+portHalf(bottom));
         face([[lip,top,depth],[lo,top,depth],[nextLo,bottom,depth],[tip,bottom,depth]],'pearl');
         face([[hi,top,depth],[left,top,depth],[left,bottom,depth],[nextHi,bottom,depth]],'pearl');
       }else face([[left,top,depth],[lip,top,depth],[tip,bottom,depth],[left,bottom,depth]],'pearl');
       face([[lip,top,depth*1.03],[lip+side*3,top,depth*1.03],[tip+side*3,bottom,depth*1.03],[tip,bottom,depth*1.03]],'alloy');
     }
     face([[lip,top,-10],[tip,bottom,-10],[tip,bottom,10],[lip,top,10]],'gasket');
   }
   const loop=(inset,depth)=>{
     const lo=portCentre-portHalfWidth+inset,hi=portCentre+portHalfWidth-inset,t=portTop+inset,b=portBottom-inset,k=portBevel;
     return [[lo+k,t],[hi-k,t],[hi,t+k],[hi,b-k],[hi-k,b],[lo+k,b],[lo,b-k],[lo,t+k]].map(([u,y])=>[side*u,y,depth]);
   };
   for(const sign of [-1,1]){
     const rings=[loop(-4,11*sign),loop(1,13*sign),loop(5,9*sign),loop(7,2*sign)];
     for(let layer=0;layer<3;layer++)for(let i=0;i<8;i++){
       const j=(i+1)%8;face([rings[layer][i],rings[layer][j],rings[layer+1][j],rings[layer+1][i]],layer===0?'alloy':'gasket');
     }
   }
   if(panoramic)for(const sign of [-1,1]){
     const edge=loop(2,sign*14),inner=loop(3.3,sign*14);
     for(let i=0;i<8;i++){const j=(i+1)%8;face([edge[i],edge[j],inner[j],inner[i]],'glasslight')}
   }
   const rim=loop(7,0);for(let i=1;i<7;i++)face([rim[0],rim[i],rim[i+1],rim[i+1]],'glass');
   for(const [a,b,c,d,width] of panoramic?[]:hatchWebs){
     const len=Math.hypot(c-a,d-b),du=-(d-b)/len,dv=(c-a)/len;
     const strip=(thick,depth)=>[[a+du*thick,b+dv*thick],[c+du*thick,d+dv*thick],[c-du*thick,d-dv*thick],[a-du*thick,b-dv*thick]].map(([u,y])=>[side*u,y,depth]);
     const back=strip(width/2,-12),front=strip(width/2,12);
     for(let i=0;i<4;i++){const j=(i+1)%4;face([back[i],back[j],front[j],front[i]],'gasket')}
     for(const sign of [-1,1]){
       face(strip(width/2,sign*12),'pearl');
       face(strip(width*.23,sign*12.7),'sienna');
     }
   }
   for(const d of [-11,11])face([[side*157,141,d],[side*161,141,d],[side*161,202,d],[side*157,202,d]],'glasslight');
 }
}
function animateHatches(px,pz,dt){
 for(const door of hatches){
   const dx=px-door.x,dz=pz-door.z;
   const lateral=Math.abs(dx*door.ux+dz*door.uz),normal=Math.abs(dz*door.ux-dx*door.uz);
   const near=lateral<218&&normal<(door.openness>0?290:240)&&(!door.interlock||door.interlock.openness===0);
   const change=(near?2.7:-1.65)*dt;
   door.openness=Math.max(0,Math.min(1,door.openness+change));
 }
}
function hatchHit(ex,ey,ez,dx,dy,dz){
 let nearest=Infinity;
 for(const d of hatches){
   const v=dz*d.ux-dx*d.uz;
   if(Math.abs(v)<.0001)continue;
   const t=((d.z-ez)*d.ux-(d.x-ex)*d.uz)/v;
   if(t<=0||t>=nearest)continue;
   const y=ey+t*dy,u=(ex+t*dx-d.x)*d.ux+(ez+t*dz-d.z)*d.uz;
   const offset=202*d.openness*d.openness*(3-2*d.openness);
   const leafU=Math.abs(u)-offset;
   if(y>=portTop+7&&y<=portBottom-7&&Math.abs(leafU-portCentre)<portHalf(y)-8&&(d.panoramic||!insideWeb(leafU,y)))continue;
   if(y>=-117&&y<=416&&leafU<=168&&leafU>=0)nearest=t;
 }
 return nearest;
}
function leafShift(leaf){
 const d=hatches[leaf>>1],t=d.openness;
 const amount=(leaf%2?1:-1)*202*t*t*(3-2*t);
 return [d.ux*amount,d.uz*amount];
}
function hatchCollar(x,z,angle,panoramic=false){
 fitHatch(x,z,angle,panoramic);
 const a=angle*Math.PI/180;
 function member(type,u,y,d,w,h,thick){
   const cx=x+u*Math.cos(a)+d*Math.sin(a),cz=z-u*Math.sin(a)+d*Math.cos(a);
   if(Math.abs(Math.sin(a))>.5)block(type,cx,y,cz,thick,h,w);
   else block(type,cx,y,cz,w,h,thick);
 }
 for(const sign of [-1,1]){
   member('hatch-jaw',sign*179,147,-24,24,538,79);
   for(const lintel of [-49,0])member('hatch-flange',sign*188,147,lintel,47,538,17);
   member('guide-light',sign*169,118,13,5,160,4);
 }
 // Faceted gunmetal surround and recessed header lighting on both approaches.
 const outline=(w,top,bot,r,d)=>[[-w,top+r],[-w+r,top],[w-r,top],[w,top+r],[w,bot-r],[w-r,bot],[-w+r,bot],[-w,bot-r]].map(([u,v])=>[x+u*Math.cos(a)+d*Math.sin(a),v,z-u*Math.sin(a)+d*Math.cos(a)]);
 for(const [d,sign] of [[22,1],[-74,-1]]){
   const profiles=[outline(219,-166,416,38,d),outline(211,-158,416,34,d+sign*7),outline(179,-126,416,23,d+sign*8),outline(168,-117,416,17,d-sign*8)];
   for(let layer=0;layer<3;layer++)for(let i=0;i<8;i++){
     const j=(i+1)%8;formedQuad([profiles[layer][i],profiles[layer][j],profiles[layer+1][j],profiles[layer+1][i]],['alloy','smoked','gasket'][layer]);
   }
   member('case-back',0,-146,d+sign*8,123,15,7);
   member('lamp',0,-147,d+sign*13,95,5,3);
   for(const u of [-194,194]){
     member('case-back',u,75,d+sign*9,25,85,6);
     for(let j=0;j<3;j++)member('strip',u,57+j*10,d+sign*14,13,3,2);
   }
 }
 member('hatch-jaw',0,-130,-24,382,32,80);
 for(const d of [-52,5])member('hatch-flange',0,-133,d,417,42,15);
}
bulkhead(0,passageStart,1586,992,360,180);
hatchCollar(0,passageStart,180);
plaque('AFT  /  STATION ACCESS',0,-165,1195,180,420);
plaque('FLIGHT DECK',0,-162,1252,0);
function floorAndCeiling(w,d,x,z){
 const floor=plane('extension-floor',w,d,x,floorY,z,0,90);
 const ceiling=plane('extension-ceiling',w,d,x,floorY-roomHeight,z,0,-90);
 clad(floor,Math.ceil(w/450),Math.ceil(d/450),'floor-tile');
 clad(ceiling,Math.ceil(w/600),Math.ceil(d/600),'ceiling-tile');
}
floorAndCeiling(490,passageEnd-passageStart,0,(passageStart+passageEnd)/2);
 for(const side of [-1,1])ceilingCove(side*245,(passageStart+passageEnd)/2,-side*90,passageEnd-passageStart,floorY-roomHeight);
// Service runs sit below the in-wall controls. Their octagonal sections and
// raised collars show depth at walking distance without separate draw calls.
function servicePipe(cx,cy,start,end,radius,material){
 for(let j=0;j<8;j++){
   const a=(j+.5)*Math.PI/4;
   const surface=plane(material,2*radius*Math.tan(Math.PI/8),end-start,
      cx+radius*Math.sin(a),cy-radius*Math.cos(a),(start+end)/2,0,90);
   surface.style.transform+=' rotateY('+(-a)+'rad)';
 }
}
for(const side of [-1,1]){
 for(const [start,end] of [[1280,2310],[2770,3510]]){
   for(const height of [210,257])servicePipe(side*219,height,start,end,11,'service-pipe');
   for(let collar=start+65;collar<end-25;collar+=260)
     for(const height of [210,257])servicePipe(side*219,height,collar,collar+13,14,'pipe-collar');
 }
 for(const z of [1430,1800,2170,2920,3290]){
   block('case-edge',side*92,-207,z,61,29,51);
   plane('lamp',43,32,side*92,-191,z,0,-90);
 }
}
// Recessed guide rails and their diffuse spill run continuously down the residential corridor.
for(const side of [-1,1]){
 block('guide-channel',side*195,411,4440,16,10,2070);
 plane('promenade-light',5,2060,side*195,404,4440,0,90);
 plane('floor-spill',66,2060,side*172,414,4440,0,90);
 block('guide-channel',side*220,-213,4440,17,18,2040);
 plane('promenade-light',7,2025,side*220,-202,4440,0,-90);
}
const outerLockZ=passageEnd+815,deckRadius=990,hexApothem=deckRadius*Math.sqrt(3)/2;
const padStart=outerLockZ+225,padCenter=padStart+hexApothem;
floorAndCeiling(490,outerLockZ-passageEnd,0,(outerLockZ+passageEnd)/2);
for(const side of [-1,1]){
 panelWall(815,roomHeight,side*245,96,(outerLockZ+passageEnd)/2,-side*90);
 ceilingCove(side*245,(outerLockZ+passageEnd)/2,-side*90,815,-224);
 plane('guide-light',12,730,side*167,410,(outerLockZ+passageEnd)/2,0,90);
}
for(const zz of [passageEnd,outerLockZ]){
 bulkhead(0,zz,490,roomHeight,360,180);hatchCollar(0,zz,180,zz===outerLockZ);
 plaque(zz===passageEnd?'AFT OBSERVATION · AIRLOCK':'EXTERIOR DECK',0,-174,zz-55,180,370);
}
const innerDoor=hatches[hatches.length-2],outerDoor=hatches.at(-1);
innerDoor.interlock=outerDoor;outerDoor.interlock=innerDoor;
block('console-case',0,floorY+41,(outerLockZ+padStart)/2,330,82,padStart-outerLockZ+4);
for(const side of [-1,1])plane('guide-light',7,padStart-outerLockZ,side*156,414,(outerLockZ+padStart)/2,0,90);
const corner=(i,r,y)=>[Math.cos(i*Math.PI/3)*r,y,padCenter+Math.sin(i*Math.PI/3)*r];
for(let i=0;i<6;i++){
 const a=corner(i,deckRadius,floorY),b=corner(i+1,deckRadius,floorY);
 const mid=a.map((v,j)=>(v+b[j])/2);
 formedQuad([[0,floorY,padCenter],a,mid,b],i%2?'alloy':'smoked');
 formedQuad([a,b,corner(i+1,deckRadius,488),corner(i,deckRadius,488)],'gasket');
 formedQuad([corner(i,deckRadius-17,415),corner(i+1,deckRadius-17,415),corner(i+1,deckRadius-24,415),corner(i,deckRadius-24,415)],'glasslight');
 formedQuad([corner(i,deckRadius*.78,415),corner(i+1,deckRadius*.78,415),corner(i+1,deckRadius*.775,415),corner(i,deckRadius*.775,415)],'bronze');
}
for(const side of [-1,1]){
 const inner=245*side,outer=(245+roomWidth)*side,mid=(inner+outer)/2;
 const facing=-side*90;
 // One continuous partition with a person-sized opening into each room.
 for(const [start,end] of [[passageStart,roomCentreZ-180],[roomCentreZ+180,4260],[4620,5500]]){
  panelWall(end-start,roomHeight,inner, floorY-roomHeight/2,(end+start)/2,facing);
 }
 panelWall(360,roomHeight-545,inner,floorY-roomHeight+(roomHeight-545)/2,roomCentreZ,facing);
 floorAndCeiling(roomWidth,roomDepth,mid,roomCentreZ);
 for(const [offset,angle] of [[-1,0],[1,180]]){
  windowWall(roomWidth,roomHeight,mid,floorY-roomHeight/2,roomCentreZ+offset*roomDepth/2,angle,[-243,243],360,230,-68);
 }
 windowWall(roomDepth,roomHeight,outer,floorY-roomHeight/2,roomCentreZ,facing,[-496,496],365,230,-68);
 hatchCollar(inner,roomCentreZ,facing);
 const ring=plane('lab-ring',520,520,mid,floorY-roomHeight+7,roomCentreZ,0,-90);
 for(const off of [-270,270])plane('lab-wash',120,15,outer-side*16,-185,roomCentreZ+off,facing);
 const name=side===1?'NAVIGATION LAB':'INTELLIGENCE';
 plaque(name,inner-side*5,-165,roomCentreZ,facing);
 plaque(name,outer-side*5,-150,roomCentreZ,facing,450);
 terminal(name,groups[side===1?0:1],outer-side*32,roomCentreZ,facing);
 for(const z of [1900,2210,2850,3160]){
  plane('lamp passage-light',165,14,inner-side*16,-160,z,facing);
 }
}
// The aft residential deck has a shared corridor and two separate rooms.
const cabinZ=4440, cabinDepth=1450;
const furnishings=[];
for(const side of [-1,1]){
 const start=world.children.length, inner=side*245, outer=side*1265, mid=side*755;
 const facing=-side*90, lounge=side===1, title=lounge?'Observation lounge':'Crew quarters';
 panelWall(360,roomHeight-545,inner,floorY-roomHeight+(roomHeight-545)/2,cabinZ,facing);
 hatchCollar(inner,cabinZ,facing);
 floorAndCeiling(roomWidth,cabinDepth,mid,cabinZ);
 for(const [sign,angle] of [[-1,0],[1,180]])
   windowWall(roomWidth,roomHeight,mid,96,cabinZ+sign*cabinDepth/2,angle,[-245,245],360,240,-62);
 windowWall(cabinDepth,roomHeight,outer,96,cabinZ,facing,[-465,465],400,260,-72);
 plaque(title.toUpperCase(),inner-side*17,-169,cabinZ,facing);
 terminal(title.toUpperCase(),lounge?[groups[1][2],groups[1][1],groups[1][0],groups[3][1]]:groups[3],outer-side*38,cabinZ,facing);
 plane('residential-ring',710,710,mid,-209,cabinZ,0,-90);
 if(lounge){
   for(const seatX of [610,840]){
     const first=world.children.length,sz=cabinZ+350;
     furnishing('lounge-base',seatX,379,sz,229,70,149);
     furnishing('lounge-pad',seatX,323,sz-12,223,49,143);
     furnishing('lounge-pad',seatX,263,sz+60,222,112,33);
     for(const el of Array.from(world.children).slice(first)){
       el.dataset.seat=[seatX,sz].join(',');el.dataset.station='Sit in lounge';
       el.onclick=()=>{if(!dragged)activateStation(el)};
     }
     seats.push({cx:seatX,pz:sz});
   }
   addChair(660,cabinZ-460,'pod');
   addChair(941,cabinZ-460,'pod');
   furnishing('lounge-base',mid,387,cabinZ-126,225,53,116);
   furnishing('tabletop',mid,351,cabinZ-126,249,16,139);
   furnishings.push([mid,cabinZ-126,133,82]);
 }else{
   const bz=cabinZ+414;
   furnishing('berth-base',mid,363,bz,436,96,184);
   furnishing('berth-pad',mid,300,bz,428,44,180);
   furnishing('berth-pillow',mid-148,266,bz,98,29,155);
   furnishings.push([mid,bz,231,110]);
   addChair(-712,cabinZ-350,'lab');
 }
 for(const el of Array.from(world.children).slice(start))el.classList.add(lounge?'lounge-zone':'cabin-zone');
}
const aftBays=[
 [['Cartography',0],['Survey office',0]],
 [['Engineering',2],['Ore processing',2]],
 [['Fleet briefing',1],['Signal analysis',1]],
 [['Records vault',3],['Logistics',2]],
 [['Science lab',0],['Pilot ready room',3]]
];
const roomStations=[{z:roomCentreZ,depth:roomDepth,names:['Intelligence','Navigation lab']},{z:cabinZ,depth:cabinDepth,names:['Crew quarters','Observation lounge']}];
for(let bay=0;bay<aftBays.length;bay++){
 const start=5500+bay*1760,cz=start+880,depth=1250;
 roomStations.push({z:cz,depth,names:aftBays[bay].map(entry=>entry[0])});
 for(const side of [-1,1]){
   const [title,group]=aftBays[bay][side<0?0:1],angle=-side*90,inner=245*side,outer=1265*side,mid=755*side;
   for(const sign of [-1,1]){
     panelWall(700,roomHeight,inner,96,cz+sign*530,angle);
     panelWall(roomWidth,roomHeight,mid,96,cz+sign*depth/2,sign<0?0:180);
   }
   panelWall(360,roomHeight-545,inner,floorY-roomHeight+(roomHeight-545)/2,cz,angle);
   hatchCollar(inner,cz,angle);
   floorAndCeiling(roomWidth,depth,mid,cz);
   windowWall(depth,roomHeight,outer,96,cz,angle,[-365,365],350,245,-68);
   terminal(title.toUpperCase(),groups[group],outer-side*34,cz,angle);
   plaque(title.toUpperCase(),inner-side*17,-172,cz,angle,330);
   plane('lab-wash',440,15,mid,-192,cz-depth/2+7,0);
   if(group===1||group===3)addChair(mid,cz+305,group===1?'lab':'pod');
   else{
     furnishing('lounge-base',mid,365,cz+330,246,90,117);
     furnishing('tabletop',mid,312,cz+330,266,17,132);
     furnishings.push([mid,cz+330,133,66]);
   }
   plane('promenade-light',8,1754,side*194,410,cz,0,90);
   plane('lamp',12,1470,side*150,-211,cz,0,-90);
 }
}
// Carry the folded profile between hatches. Leave clear returns at doors and wall terminals.
for(const side of [-1,1]){
 const gaps=roomStations.map(r=>[r.z-235,r.z+235]);
 const pad=side===1?1770:1850;gaps.push([pad-112,pad+112]);gaps.sort((a,b)=>a[0]-b[0]);
 let start=passageStart+85;
 for(const [edge,end] of [...gaps,[passageEnd-80,passageEnd]]){
   const length=edge-start;
   if(length>75){
     const count=Math.ceil(length/610),width=length/count;
     for(let i=0;i<count;i++)windowCabinet(side*245,start+(i+.5)*width,-side*90,width-3,-224,-100,115,416,width>290&&i===Math.floor(count/2));
   }
   start=Math.max(start,end);
 }
}
for(const [index,bay] of bayScreens.entries()){
 const {face,wx,wz,label}=bay;
 let nearby=null,dist=Infinity;
 for(const projector of roomScreens){
   const dx=projector.hx-wx,dz=projector.hz-wz,d=dx*dx+dz*dz;
   if(d<dist){dist=d;nearby=projector}
 }
 const local=wz>1200&&nearby;
 const title=local?nearby.el.querySelector('.holo-caption').textContent.replace(/ PROJECTOR$/,''):'NAVIGATION LAB';
 const plates=roomExhibits[title],key=plates[(Math.floor(index/2)+(label==='upper'?0:1))%plates.length];
 const [caption,route,still]=exhibitPlates[key];
 const image=document.createElement('img');image.src=exhibitFile(still.includes('.')?still:still+'.webp');image.alt='';image.loading='lazy';
 const button=document.createElement('button');button.textContent=caption;
 face.append(image,button);wire(face,[route,caption]);wire(button,[route,caption]);
 if(local)face.projectTopic=()=>nearby.showPlate(key);
}
function nearestRoom(pz){
 return roomStations.reduce((best,r)=>Math.abs(r.z-pz)<Math.abs(best.z-pz)?r:best);
}
plaque('OBSERVATION  /  CREW QUARTERS   → AFT',-226,60,3410,90,440);
function displayCase(w,h,x,y,z,angle,depth=9){
 const a=angle*Math.PI/180, nx=Math.sin(a),nz=Math.cos(a);
 plane('case-back',w,h,x-depth*nx,y,z-depth*nz,angle+180);
 for(const sign of [-1,1]){
   plane('case-edge',depth,h,x+sign*w*.5*nz-nx*depth/2,y,z-sign*w*.5*nx-nz*depth/2,angle+sign*90);
   plane('case-edge',w,depth,x-nx*depth/2,y+sign*h*.5,z-nz*depth/2,angle,-sign*90);
 }
}
function corridorStation(title,item,side,z){
 displayCase(173,258,side*222,44,z,-side*90,16);
 const face=plane('wall-pad',173,258,side*222,44,z,-side*90);
 const mark=document.createElement('strong');mark.textContent=title;
 const status=document.createElement('div');status.className='status-wave';
 const button=document.createElement('button');button.textContent=item[1]+'  ›';
 const closest=roomScreens.reduce((best,r)=>Math.hypot(r.hx-side*222,r.hz-z)<Math.hypot(best.hx-side*222,best.hz-z)?r:best);
 face.projectTopic=()=>closest.showPlate(routePlate(item[0]),item[0],item[1]);
 const preview=document.createElement('img');const still=exhibitPlates[routePlate(item[0])][2];
 preview.src=exhibitFile(still.includes('.')?still:still+'.webp');preview.alt=item[1];preview.style.cssText='width:100%;height:95px;object-fit:contain';
 wire(face,item);wire(button,item);button.replaceChildren(mark,preview,document.createTextNode(item[1]+'  ›'));face.append(button);
}
corridorStation('CARGO CONTROL',groups[2][1],1,1770);
corridorStation('SENSOR CONTROL',groups[2][3],-1,1850);
const navDisplay=plane('course-display',440,62,0,-452,-783);
navDisplay.innerHTML='<strong>VIEW BEARING</strong><span class="bearing">000°</span><div class="scale-ticks"></div>';
const navKey=document.createElement('button');navKey.className='bearing-key';wire(navKey,groups[0][1]);navKey.append(...navDisplay.childNodes);navDisplay.append(navKey);
const aftMarker=plane('plaque',350,43,0,198,-790);
aftMarker.textContent='STATION ACCESS  ·  AFT';

document.querySelectorAll('.metal').forEach(el=>clad(el,Math.max(1,Math.round(parseFloat(el.style.width)/600)),Math.max(1,Math.round(parseFloat(el.style.height)/600)),'wall-tile'));
clad(document.querySelector('.deck'),4,5,'floor-tile');
clad(document.querySelector('.overhead'),3,4,'ceiling-tile');
// The pedestal stays fixed while its floating display faces the observer.
const holoZ=540;
const pedestal=plane('holo-base',285,285,0,397,holoZ,0,90);
plane('holo-ring',195,195,0,270,holoZ,0,90);
plane('holo-ring inner-ring',235,235,0,235,holoZ,0,90);
const hologram=plane('holo-display',278,186,0,91,holoZ);
function projectorParts(el,title){
 const header=document.createElement('div');header.className='holo-caption';header.textContent=title;
 const feed=document.createElement('div');feed.className='feed';
 const actions=document.createElement('div');actions.className='projector-actions';
 const caption=document.createElement('button');caption.className='holo-open';actions.append(caption);
 const copy=document.createElement('section');copy.className='projection-copy';
 const subject=document.createElement('strong'),body=document.createElement('p');copy.append(subject,body);feed.append(copy);
 const page=document.createElement('button');page.className='record-page';page.dataset.route='page';page.dataset.station='Next information page';actions.prepend(page);
 page.onclick=e=>{e.stopPropagation();page.advance?.()};
 el.append(header,feed,actions);return {feed,caption,actions,subject,body,page};
}
function renderProjection(parts,key,route){
 mountExhibit(parts.feed,key);parts.subject.textContent=exhibitPlates[key][0];
 const pages=recordPages(key,route);let index=0;
 function draw(){parts.body.textContent=pages[index];parts.page.hidden=pages.length<2;parts.page.textContent=(index+1)+' / '+pages.length+' ›';parts.page.setAttribute('aria-label','Next information page, '+(index+1)+' of '+pages.length)}
 parts.page.advance=()=>{index=(index+1)%pages.length;draw()};draw();
}
const bridgeParts=projectorParts(hologram,'BRIDGE PROJECTOR');
const holoAction=bridgeParts.caption,feed=bridgeParts.feed;
let projected=['ships','Fortizar observation feed'];
function showBridgeRecord(key,route=exhibitPlates[key][1],label=exhibitPlates[key][0]){
 projected=[route,label,key];renderProjection(bridgeParts,key,route);labelProjection();
}
hologram.showRecord=showBridgeRecord;showBridgeRecord('fort');
function labelProjection(){
 holoAction.dataset.station='Open '+projected[1];
 holoAction.textContent=holoAction.dataset.station+'  ›';
}
labelProjection();
holoAction.onclick=()=>openRecord(...projected);
hologram.dataset.station='Open projection';hologram.onclick=e=>{if(e.target!==holoAction)openRecord(...projected)};
let messageTimer;
function activateStation(control){
 if(control.advance){control.advance();return;}
 if(control.dataset.plate){openRecord(control.dataset.route,control.dataset.station,control.dataset.plate,control.closest('.holo-display'));return;}
 if(control.dataset.seat){
   const [sx,sz]=control.dataset.seat.split(',').map(Number);
   if(seated)standUp();
   seated={x:sx,z:sz};x=sx;z=sz-8;yaw=0;pitch=0;keys.clear();$('stand').hidden=false;view.focus();return;
 }
 if(control===hologram||control===holoAction){openRecord(...projected);return;}
 const local=control.closest('.room-console,.switches,.bay-display,.wall-pad');
 if(local?.projectTopic){
   const selected=[control.dataset.route,control.dataset.station];
   local.projectTopic(selected);
   if(local.classList.contains('room-console'))mountExhibit(local,routePlate(selected[0])).classList.add('station-feed');
   const notice=$('projectionNotice');notice.textContent=selected[1]+' · Open on the corner projector';
   notice.hidden=false;clearTimeout(messageTimer);messageTimer=setTimeout(()=>notice.hidden=true,3500);return;
 }
 projected=[control.dataset.route,control.dataset.station];
 const consoleFace=control.closest('.screen,.helm-display');
 if(consoleFace)mountExhibit(consoleFace,routePlate(projected[0])).classList.add('station-feed');
 labelProjection();
 showBridgeRecord(routePlate(projected[0]),projected[0],projected[1]);
 const notice=$('projectionNotice');
 notice.textContent=projected[1]+' projected · Centre of flight deck';
 notice.hidden=false;clearTimeout(messageTimer);
 messageTimer=setTimeout(()=>notice.hidden=true,6000);

}
const keys=new Set(), clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let x=0,z=365,yaw=0,pitch=0,drag=false,dragged=false,totalDrag=0,target=null,previous=performance.now();
let seated=null;
function standUp(){
 if(!seated)return;
 x=seated.x;z=seated.z-160;seated=null;$('stand').hidden=true;keys.clear();view.focus();
}
$('stand').onclick=standUp;
function helm(){standUp();x=0;z=365;yaw=0;pitch=0;keys.clear();view.focus()}
$('reset').onclick=helm;
const recordFrame=panel.querySelector('iframe');
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==recordFrame.contentWindow||!panel.open)return;
 const key=event.data?.stationExhibit;
 if(typeof key==='string'&&Object.hasOwn(exhibitPlates,key))recordProjector?.showRecord?.(key);
});
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
// CSS 3D hit testing varies across browsers, especially for a display mounted
// at ninety degrees. Intersect a camera ray with actual model-space surfaces.
let pickPlanes=[];
function rebuildPicking(){
 pickPlanes=[];
 for(const el of world.querySelectorAll('.surface')){
   const controls=[...el.querySelectorAll('button[data-route],button[data-seat],.holo-open')];
   const solid=el.matches('.hull-panel,.hull-back,.hatch-jaw,.hatch-flange,.console-case,.case-back');
   if(!solid && !el.dataset.station && !controls.length)continue;
   let model=new DOMMatrix(el.style.transform);
   if(el.parentElement.classList.contains('helm-assembly'))
      model=new DOMMatrix(el.parentElement.style.transform).multiply(model);
   const inv=model.inverse();
   pickPlanes.push({el,inv,controls,solid,cx:model.m41,cy:model.m42,cz:model.m43,radius:Math.hypot(parseFloat(el.style.width),parseFloat(el.style.height))/2,w:parseFloat(el.style.width),h:parseFloat(el.style.height)});
 }
}
function refreshHitBoxes(){
 for(const p of pickPlanes){
   if(!p.controls.length||!p.el.isConnected||!p.el.offsetWidth)continue;
   p.boxes=p.controls.map(c=>{
     const l=c.offsetLeft+p.el.clientLeft,t=c.offsetTop+p.el.clientTop;
     return {control:c,l,t,r:l+c.offsetWidth,b:t+c.offsetHeight};
   });
 }
}
function pickStation(clientX,clientY){
 const lens=parseFloat(view.style.perspective);
 const horizontal=(clientX-innerWidth/2)/lens,vertical=(clientY-innerHeight/2)/lens;
 const sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);
 const dz=vertical*sp-cp,dx=horizontal*cy-dz*sy,dy=vertical*cp+sp,wz=horizontal*sy+dz*cy;
 const eyeY=seated?105:0;
 let nearest=hatchHit(x,eyeY,z,dx,dy,wz),hit=null;
 for(const p of pickPlanes){
   const bx=p.cx-x,by=p.cy-eyeY,bz=p.cz-z;
   const along=(bx*dx+by*dy+bz*wz)/(dx*dx+dy*dy+wz*wz);
   if(along < -p.radius || along>nearest+p.radius || along>1900+p.radius)continue;
   if((bx-along*dx)**2+(by-along*dy)**2+(bz-along*wz)**2>p.radius*p.radius)continue;
   const m=(p.el===hologram||p.el.classList.contains('room-projection'))?new DOMMatrix(p.el.style.transform).inverse():p.inv;
   const oz=m.m13*x+m.m23*eyeY+m.m33*z+m.m43;
   const vz=m.m13*dx+m.m23*dy+m.m33*wz;
   if(Math.abs(vz)<1e-6 || (vz>=0&&!p.el.classList.contains('seat-band')))continue;
   const dist=-oz/vz;if(dist<=0 || dist>=nearest || dist>1900)continue;
   const xx=x+dx*dist,yy=eyeY+dy*dist,zz=z+wz*dist;
   const u=m.m11*xx+m.m21*yy+m.m31*zz+m.m41+p.w/2;
   const v=m.m12*xx+m.m22*yy+m.m32*zz+m.m42+p.h/2;
   if(u<0||u>p.w||v<0||v>p.h)continue;
   // Ignore the chamfered-away area on the sides of a sculpted seat.
   if(p.el.classList.contains('seat-flank')&&p.el.style.clipPath){
     const verts=[...p.el.style.clipPath.matchAll(/([\d.]+)% ([\d.]+)%/g)].map(q=>[+q[1]*p.w/100,+q[2]*p.h/100]);
     let inside=false;
     for(let i=0,j=verts.length-1;i<verts.length;j=i++){
       const [ax,ay]=verts[i],[bx,by]=verts[j];
       if((ay>v)!==(by>v)&&u<(bx-ax)*(v-ay)/(by-ay)+ax)inside=!inside;
     }
     if(verts.length&&!inside)continue;
   }
   if(window.displayPointHidden?.(p.el,u,v))continue;
   const control=p.boxes?.find(b=>u>=b.l&&u<=b.r&&v>=b.t&&v<=b.b)?.control;
   nearest=dist;hit=control||(p.el.dataset.station?p.el:null);
 }
 return hit;
}
rebuildPicking();refreshHitBoxes();
window.addEventListener('load',refreshHitBoxes);document.fonts.ready.then(refreshHitBoxes);
document.addEventListener('pointerdown',e=>{
 if(panel.open||e.target.closest('header,footer,#jita-player,#use'))return;
 dragged=false;totalDrag=0;
},true);
document.addEventListener('click',e=>{
 if(panel.open||e.target.closest('header,footer,#jita-player,#use,dialog'))return;
 if(!e.detail && e.target.closest('button'))return;
 const direct=e.target.closest('button[data-route],button[data-seat],.holo-open');
 // Preserve the exact native button when the browser resolves one. Use the
 // model ray for oblique displays that Chromium reports as bare scenery.
 const picked=document.pointerLockElement?target:(direct||pickStation(e.clientX,e.clientY));
 if(direct&&e.detail&&direct.closest('.surface')?.dataset.depthMask){
   const ray=pickStation(e.clientX,e.clientY);
   if(!ray||ray.closest('.surface')!==direct.closest('.surface')){e.preventDefault();e.stopImmediatePropagation();if(ray&&!dragged)activateStation(ray);return;}
 }
 if(!picked||(!document.pointerLockElement&&dragged))return;
 e.preventDefault();e.stopImmediatePropagation();activateStation(picked);
},true);
$('use').onclick=()=>{if(target)activateStation(target)};
window.addEventListener('keydown',e=>{
 if(panel.open)return;
 if(['KeyW','KeyS','KeyA','KeyD','ShiftLeft','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();keys.add(e.code)}
 if(e.code==='KeyE'&&!e.repeat){if(seated)standUp();else if(target)activateStation(target);}
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();drag=false});
function isClear(px,pz){
 const radius=42;

 for(const d of hatches){
   const dx=px-d.x,dz=pz-d.z;
   if(Math.abs(dz*d.ux-dx*d.uz)<radius+10&&Math.abs(dx*d.ux+dz*d.uz)<168&&
      Math.abs(dx*d.ux+dz*d.uz)+radius+28>202*d.openness*d.openness*(3-2*d.openness))return false;
 }
 if(pz < -650)return false;
 if(pz>=passageEnd-radius){
   const ax=Math.abs(px);
   if(Math.min(Math.abs(pz-passageEnd),Math.abs(pz-outerLockZ))<=radius+12&&ax>168-radius)return false;
   if(pz<=outerLockZ)return ax<=245-radius;
   const dz=Math.abs(pz-padCenter);
   const inPad=dz<=hexApothem-radius&&ax*Math.sqrt(3)/2+dz/2<=hexApothem-radius;
   return inPad||(pz<=padStart+radius&&ax<=165-radius);
 }
 if(pz < passageStart-radius){
   if(Math.abs(px)>793-radius)return false;
   const bx=Math.min(1,Math.abs(px)/(793/Math.sin(80*Math.PI/180)));
   if(pz < -380-458*Math.sqrt(1-bx*bx)+radius)return false;
   if(Math.abs(px)>642 && (Math.abs(pz+65)<252 || Math.abs(pz-620)<252))return false;
 }
 if(Math.abs(pz-passageStart)<=radius && Math.abs(px)>180-radius)return false;
 if(pz>passageStart+radius){
  const distance=Math.abs(px);
  const {z:near,depth}=nearestRoom(pz);
  if(distance>245+roomWidth-radius)return false;
  if(distance>245+roomWidth-135 && Math.abs(pz-near)<230)return false;
  if(distance>245-radius && Math.abs(pz-near)>180-radius && distance<245+radius)return false;
  if(distance>=245+radius && Math.abs(pz-near)>depth/2-radius)return false;
 }

 if(cabinetFootprints.some(b=>{
   const dx=px-b.wx,dz=pz-b.wz;if(Math.abs(dx)>450||Math.abs(dz)>450)return false;
   const normal=dx*b.nx+dz*b.nz;
   return normal>=0&&normal<107&&Math.abs(dx*b.ux+dz*b.uz)<b.half+16;
 }))return false;
 if(furnishings.some(([xx,zz,w,d])=>Math.abs(px-xx)<w+radius&&Math.abs(pz-zz)<d+radius))return false;
 if (seats.some(({cx,pz:sz})=>Math.abs(pz-sz)<92 && Math.abs(px-cx)<105))return false;
 return housings.every(h=>{
  const a=h.angle*Math.PI/180,dx=px-h.x,dz=pz-h.z;
  return Math.abs(dx*Math.cos(a)-dz*Math.sin(a))>h.w*.48+22 || Math.abs(dx*Math.sin(a)+dz*Math.cos(a)+22)>73;
 });
}
function resize(){const lens=Math.min(innerWidth*.59,innerHeight*.96);view.style.perspective=lens+'px';$('camera').style.transform='translateZ('+lens+'px)'}
window.addEventListener('resize',resize);resize();
let lastAim=-Infinity;
const fpsReadout=$('frame-rate');let fpsStart=performance.now(),fpsFrames=0,lastPresented=0;
function frame(now){
 updateFeeds(now);
 if(panel.open || document.hidden){previous=now;fpsStart=now;fpsFrames=0;lastPresented=window.presentedShipFrames||0;requestAnimationFrame(frame);return;}
 fpsFrames++;
 if(now-fpsStart>=1000){
   const presented=window.presentedShipFrames;
   const completed=presented===undefined?fpsFrames:presented-lastPresented;
   lastPresented=presented||0;
   fpsReadout.textContent='· '+Math.round(completed*1000/(now-fpsStart))+' FPS';
   fpsStart=now;fpsFrames=0;
 }
 const dt=Math.max(0,Math.min(.075,(now-previous)/1000));previous=now;
 animateHatches(x,z,dt);
 const f=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),r=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
 const speed=keys.has('ShiftLeft')?630:315;
 const step=dt*speed/Math.max(1,Math.hypot(f,r));
 yaw+=(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*dt*1.6;
 pitch=clamp(pitch+(Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp')))*dt*1.3,-1.22,1.22);
 const steps=Math.max(1,Math.ceil(step/25));
 for(let i=0;i<steps && !seated && (f||r);i++){
  const nextX=x+(Math.sin(yaw)*f+Math.cos(yaw)*r)*step/steps;
  const nextZ=z+(-Math.cos(yaw)*f+Math.sin(yaw)*r)*step/steps;
  if(isClear(nextX,z))x=nextX;
  if(isClear(x,nextZ))z=nextZ;
 }
 const cameraY=seated?105:0;
 world.style.transform='rotateX('+(-pitch)+'rad) rotateY('+yaw+'rad) translate3d('+(-x)+'px,'+(-cameraY)+'px,'+(-z)+'px)';
 if(now-lastAim>55){target=panel.open?null:pickStation(innerWidth/2,innerHeight/2);lastAim=now;}
 $('use').hidden=!target;if(target && $('use').textContent!=='E　'+target.dataset.station)$('use').textContent='E　'+target.dataset.station;
 const sector=z>outerLockZ?'Exterior observation deck':z>=passageEnd?'Observation airlock':z<1200?'Flight deck':Math.abs(x)<245?'Aft passage':nearestRoom(z).names[x>0?1:0];
 if($('sector').textContent!==sector)$('sector').textContent=sector;
 const degrees=((Math.round(yaw*180/Math.PI)%360)+360)%360;
 const bearing=navDisplay.querySelector('.bearing'),value=String(degrees).padStart(3,'0')+'°';
 if(bearing.textContent!==value)bearing.textContent=value;
 if(window.renderShip)window.renderShip(now,x,cameraY,z,yaw,pitch,parseFloat(view.style.perspective));
 else window.drawExterior?.(x,z);
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
