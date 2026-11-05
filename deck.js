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
const instrumentFeeds=[];
function addInstrument(display,items,px,pz){
 const primary=items[0][0];
 const name=stationMedia(primary);
 const video=document.createElement('video');
 video.className='station-feed';video.muted=true;video.loop=true;video.playsInline=true;
 video.preload='none';video.poster='assets/instruments/'+name+'.webp';
 video.src='assets/instruments/'+name+'.mp4';video.setAttribute('aria-hidden','true');
 display.append(video);instrumentFeeds.push({video,px,pz});
}
let nextFeedUpdate=0;
function updateFeeds(now){
 if(now<nextFeedUpdate)return;
 nextFeedUpdate=now+350;
 for(const {video,px,pz} of instrumentFeeds){
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
   const item=list[list.length>1?1:0];
   const offset=width*.62+82;
   const hx=x+Math.cos(rad)*offset+Math.sin(rad)*48,hz=z-Math.sin(rad)*offset+Math.cos(rad)*48;
   const projection=plane('screen room-projection',158,106,hx,-66,hz,angle);
   addInstrument(projection,[item],hx,hz);
   const link=document.createElement('button');link.textContent=item[1];
   wire(link,item);projection.append(link);wire(projection,item);
 }
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
  cockpitPart('flight-pad',0,119,[[-84,265],[-68,248],[-16,248],[11,253],[32,242],[32,258],[14,274],[-68,279]]);
  cockpitPart('flight-pad',0,110,[[24,246],[19,226],[33,183],[48,160],[61,120],[84,91],[94,95],[77,164],[55,229],[39,249]]);
  cockpitPart('head-pad',0,95,[[67,99],[70,62],[80,47],[100,44],[110,57],[99,91],[85,100]]);
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
function fitHatch(x,z,angle){
 const a=angle*Math.PI/180,ux=Math.cos(a),uz=-Math.sin(a),nx=-uz,nz=ux;
 const id=hatches.length,door={x,z,ux,uz,openness:0};
 hatches.push(door);
 // The offset joint makes a fitted tooth through the full depth of both leaves.
 const seam=[[-117,0],[26,0],[61,28],[130,28],[165,0],[276,0],[303,-19],[356,-19],[379,0],[416,0]];
 for(const side of [-1,1]){
   const vertex=(u,y,d)=>[x+u*ux+d*nx,y,z+u*uz+d*nz];
   const face=(points,finish)=>formedPanels.push({points:points.map(q=>vertex(...q)),finish,leaf:id*2+(side===1?1:0)});
   for(let j=1;j<seam.length;j++){
     const [top,start]=seam[j-1],[bottom,end]=seam[j];
     const left=side*168,lip=start+side*1.5,tip=end+side*1.5;
     for(const depth of [-10,10]){
       face([[left,top,depth],[lip,top,depth],[tip,bottom,depth],[left,bottom,depth]],'pearl');
       face([[lip,top,depth*1.03],[lip+side*3,top,depth*1.03],[tip+side*3,bottom,depth*1.03],[tip,bottom,depth*1.03]],'alloy');
     }
     face([[lip,top,-10],[tip,bottom,-10],[tip,bottom,10],[lip,top,10]],'gasket');
   }
   for(const d of [-11,11])face([[side*116,5,d],[side*122,5,d],[side*122,138,d],[side*116,138,d]],'glasslight');
 }
}
function animateHatches(px,pz,dt){
 for(const door of hatches){
   const dx=px-door.x,dz=pz-door.z;
   const lateral=Math.abs(dx*door.ux+dz*door.uz),normal=Math.abs(dz*door.ux-dx*door.uz);
   const near=lateral<218&&normal<(door.openness>0?290:240);
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
   if(y>=-117&&y<=416&&Math.abs(u)<=168&&Math.abs(u)>=offset)nearest=t;
 }
 return nearest;
}
function leafShift(leaf){
 const d=hatches[leaf>>1],t=d.openness;
 const amount=(leaf%2?1:-1)*202*t*t*(3-2*t);
 return [d.ux*amount,d.uz*amount];
}
function hatchCollar(x,z,angle){
 fitHatch(x,z,angle);
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
windowWall(490,roomHeight,0,floorY-roomHeight/2,passageEnd,180,[0],320,180,-94);
plaque('AFT OBSERVATION',0,50,passageEnd-14,180,470);
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
     block('lounge-base',seatX,379,sz,229,70,149);
     block('lounge-pad',seatX,323,sz-12,223,49,143);
     block('lounge-pad',seatX,263,sz+60,222,112,33);
     for(const el of Array.from(world.children).slice(first)){
       el.dataset.seat=[seatX,sz].join(',');el.dataset.station='Sit in lounge';
       el.onclick=()=>{if(!dragged)activateStation(el)};
     }
     seats.push({cx:seatX,pz:sz});
   }
   addChair(660,cabinZ-460,'pod');
   addChair(941,cabinZ-460,'pod');
   block('lounge-base',mid,387,cabinZ-126,225,53,116);
   block('tabletop',mid,351,cabinZ-126,249,16,139);
   furnishings.push([mid,cabinZ-126,133,82]);
 }else{
   const bz=cabinZ+414;
   block('berth-base',mid,363,bz,436,96,184);
   block('berth-pad',mid,300,bz,428,44,180);
   block('berth-pillow',mid-148,266,bz,98,29,155);
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
     block('lounge-base',mid,365,cz+330,246,90,117);
     block('tabletop',mid,312,cz+330,266,17,132);
     furnishings.push([mid,cz+330,133,66]);
   }
   plane('promenade-light',8,1754,side*194,410,cz,0,90);
   plane('lamp',12,1470,side*150,-211,cz,0,-90);
 }
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
 wire(face,item);wire(button,item);button.replaceChildren(mark,status,document.createTextNode(item[1]+'  ›'));face.append(button);
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
 const consoleFace=control.closest('.screen,.helm-display');
 const instrument=consoleFace?.querySelector('.station-feed');
 if(instrument){
   const media='assets/instruments/'+stationMedia(projected[0]);
   if(instrument.getAttribute('src')!==media+'.mp4'){
     instrument.poster=media+'.webp';instrument.src=media+'.mp4';
   }
 }
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
   const m=p.el===hologram?new DOMMatrix(hologram.style.transform).inverse():p.inv;
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
 if(pz < -650 || pz > passageEnd-radius)return false;
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

 if(furnishings.some(([xx,zz,w,d])=>Math.abs(px-xx)<w+radius&&Math.abs(pz-zz)<d+radius))return false;
 if (seats.some(({cx,pz:sz})=>Math.abs(pz-sz)<92 && Math.abs(px-cx)<105))return false;
 return housings.every(h=>{
  const a=h.angle*Math.PI/180,dx=px-h.x,dz=pz-h.z;
  return Math.abs(dx*Math.cos(a)-dz*Math.sin(a))>h.w*.48+22 || Math.abs(dx*Math.sin(a)+dz*Math.cos(a)+22)>73;
 });
}
function resize(){const lens=Math.min(innerWidth*.59,innerHeight*.96);view.style.perspective=lens+'px';$('camera').style.transform='translateZ('+lens+'px)'}
window.addEventListener('resize',resize);resize();
let lastAim=-Infinity,lastHoloX,lastHoloZ;
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
 if(lastHoloX!==x||lastHoloZ!==z){hologram.style.transform='translate3d(0,91px,'+holoZ+'px) rotateY('+Math.atan2(x,z-holoZ)+'rad)';lastHoloX=x;lastHoloZ=z;}
 world.style.transform='rotateX('+(-pitch)+'rad) rotateY('+yaw+'rad) translate3d('+(-x)+'px,'+(seated?-105:((r||f)?Math.sin(now*.012)*2:0))+'px,'+(-z)+'px)';
 if(now-lastAim>55){target=panel.open?null:pickStation(innerWidth/2,innerHeight/2);lastAim=now;}
 $('use').hidden=!target;if(target && $('use').textContent!=='E　'+target.dataset.station)$('use').textContent='E　'+target.dataset.station;
 const sector=z<1200?'Flight deck':Math.abs(x)<245?'Aft passage':nearestRoom(z).names[x>0?1:0];
 if($('sector').textContent!==sector)$('sector').textContent=sector;
 const degrees=((Math.round(yaw*180/Math.PI)%360)+360)%360;
 const bearing=navDisplay.querySelector('.bearing'),value=String(degrees).padStart(3,'0')+'°';
 if(bearing.textContent!==value)bearing.textContent=value;
 if(window.renderShip)window.renderShip(now,x,seated?105:0,z,yaw,pitch,parseFloat(view.style.perspective));
 else window.drawExterior?.(x,z);
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
