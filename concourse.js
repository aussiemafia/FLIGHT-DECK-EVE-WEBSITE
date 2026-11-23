'use strict';

const byId = id => document.getElementById(id);
const view = byId('viewport'), hall = byId('hall');
const menu = byId('menu'), record = byId('record'), frame = record.querySelector('iframe');
const width = 2720, length = 8000, height = 735, eye = 165;
const visitor = {x: -165, z: 3150, yaw: .10, pitch: .015};
const keys = new Set(), interactive = new Map();
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
  if(kind==='chamber-lid')return shellBay(w,h,x,z,-y);
  const node = document.createElement('div');
  node.className = 'face '+kind;
  // Render large architectural finishes at a lower texture density.
  const scale = /^(floor|roof|roof skylight|wall|glass|gallery|stripe|reflection)$/.test(kind) ? 4 : 1;
  w /= scale; h /= scale;
  Object.assign(node.style,{width:w+'px',height:h+'px',left:(-w/2)+'px',top:(-h/2)+'px',
    transform:`translate3d(${x}px,${y}px,${z}px) rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(${rz}deg) scale3d(${scale},${scale},${scale})`});
  node.geometry={w:w*scale,h:h*scale,x,y,z,ry:ry*Math.PI/180,rx:rx*Math.PI/180};
  if(['wall','bay-shell','city-wall','chamber-lid','roof'].includes(kind)){
    node.classList.add('solid-panel');
    node.style.setProperty('--panel-depth',(28/scale)+'px');
    for(const name of ['back','left','right','top','bottom']){
      const side=document.createElement('i');side.className='panel-'+name;node.append(side);
    }
  }
  if(['bay-shell','city-wall','wall'].includes(kind))cladBulkhead(node,node.geometry,scale);
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
  const films={story:'transit',wormholes:'transit',ships:'fortizar',systems:'transit',estimate:'ore',drifters:'crystal',fits:'fortizar',sites:'fortizar','blue-loot':'crystal',dscan:'fortizar'};
  const video=document.createElement('video');video.loop=true;video.muted=true;video.playsInline=true;video.preload='none';
  video.dataset.src='assets/exhibits/'+(films[station.route]||'transit')+'.mp4?v=hd22';screen.insertBefore(video,caption);
  interactive.set(screen,{name:station.name+' · Screen media',media:true,room:rooms.includes(station)?station:undefined,action:()=>window.stationMediaMenu?.(screen,station)});station.screen=screen;
}
const boundary=1360, roomEnd=3260, roomHalf=615;
const doors=[], chamberNodes=new Map();
const tones=['#79e4df','#ebb977','#92bafa','#ffc38d','#bd9cec','#95d5de','#ffae85','#b2dfb2'];
const models=['drifter','naglfar','fortizar','fortizar','drifter','naglfar','fortizar','drifter'];
const simulations=[
  {title:'Wormhole transit',image:'wormhole',film:'transit'},
  {title:'Citadel approach',image:'fortizar',film:'fortizar'},
  {title:'Crystal field',image:'crystal',film:'crystal'}
];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
rooms[0].name='Exploration holodeck';
rooms[4].name='Fleet operations holodeck';
function textFace(type,w,h,x,y,z,angle,text){
  const panel=face(type,w,h,x,y,z,angle);
  panel.textContent=text;
  return panel;
}
function strip(w,h,x,z,tone){
  face('path-light',w,h,x,-2,z,0,90).style.setProperty('--tone',tone);
}
function renderSimulation(room){
  const program=simulations[room.program];
  room.projection.style.backgroundImage='url(assets/exhibits/'+program.image+'.webp)';
  room.selector.textContent='Cycle simulation  /  '+program.title;
  if(room.video){
    room.video.pause();
    room.video.remove();
    room.video=null;
  }
  for(const wing of room.wings||[])wing.style.backgroundImage=room.projection.style.backgroundImage;
  if(currentRoom===room&&!reduced.matches){
    const video=document.createElement('video');
    video.muted=true;video.loop=true;video.playsInline=true;
    video.src='assets/exhibits/'+program.film+'.mp4?v=hd22';
    room.projection.append(video);room.video=video;
    video.play().catch(()=>{});
  }
}
visitor.look=0;
let currentRoom=null;
function makeDoor(x,z,angle,label,tone){
  const rad=angle*Math.PI/180,ux=Math.cos(rad),uz=-Math.sin(rad);
  function local(kind,w,h,u,y,offset=0){
    return face(kind,w,h,x+u*ux+offset*Math.sin(rad),y,z+u*uz+offset*Math.cos(rad),angle);
  }
  // The arch reveal spans both faces of the bulkhead.
  const points=[[-211,0],[-211,-219]];
  for(let i=0;i<=12;i++){
    const a=Math.PI+i*Math.PI/24;points.push([-116+95*Math.cos(a),-219+95*Math.sin(a)]);
  }
  for(let i=0;i<=12;i++){
    const a=-Math.PI/2+i*Math.PI/24;points.push([116+95*Math.cos(a),-219+95*Math.sin(a)]);
  }
  points.push([211,0]);
  for(let i=1;i<points.length;i++){
    const [a,b]=points[i-1],[c,d]=points[i],len=Math.hypot(c-a,d-b);if(len<.1)continue;
    const reveal=local('arch-reveal',len+1,76,(a+c)/2,(b+d)/2);
    reveal.style.transform+=' rotateZ('+Math.atan2(d-b,c-a)+'rad) rotateX(90deg)';
  }
  for(const offset of [-38,38]){
    const jamb=local('portal-frame',473,355,0,-177,offset);jamb.dataset.side=offset<0?'back':'front';jamb.style.setProperty('--tone',tone);
    const sign=local('portal-name',455,49,0,-379,Math.sign(offset)*85);
    sign.textContent=label;sign.style.setProperty('--tone',tone);sign.style.backfaceVisibility='hidden';
    if(offset<0)sign.style.transform+=' rotateY(180deg)';
  }
  const leaves=[-1,1].map(sign=>{
    const leaf=local('door-leaf',212,321,sign*106,-160,-3);
    if(sign===1)leaf.classList.add('mirror');
    for(const key of ['front','back','edge-left','edge-right','cap','etch']){const part=document.createElement('i');part.className='door-'+key;leaf.append(part)}
    return {leaf,origin:leaf.style.transform,sign};
  });
  const door={x,z,ux,uz,aperture:0,leaves,label};doors.push(door);
  return door;
}
function updateDoors(dt){
  for(const d of doors){
    const dx=visitor.x-d.x,dz=visitor.z-d.z;
    const across=Math.abs(dx*d.ux+dz*d.uz),depth=Math.abs(-dx*d.uz+dz*d.ux);
    const goal=(across<315&&depth<440)||window.flightCrew?.nearDoor(d)?1:0;
    if(goal!==(d.goal||0)){window.shipAudio?.door(!!goal,d);d.goal=goal}
    const next=d.aperture+Math.sign(goal-d.aperture)*Math.min(Math.abs(goal-d.aperture),dt*2);
    if(next===d.aperture)continue;
    d.aperture=next;
    for(const {leaf} of d.leaves)leaf.classList.toggle('unsealed',next>.04);
    for(const {leaf,origin,sign} of d.leaves)leaf.style.transform=origin+' translateX('+sign*next*next*(3-2*next)*216+'px)';
  }
}
function passageOpen(d,x,z){
  const dx=x-d.x,dz=z-d.z;
  return Math.abs(-dx*d.uz+dz*d.ux)>38||Math.abs(dx*d.ux+dz*d.uz)+24<(d.aperture*d.aperture*(3-2*d.aperture))*211;
}
face('floor',width,length,0,0,0,0,90);
// One authored module continues from the entry lounge to the garden and outer districts.
function glazedAtrium(width,depth,z,spring,crown,bays){
  const n=Math.max(1,Math.ceil(depth/1900)),span=depth/n;
  for(let i=0;i<n;i++)shellBay(width,span,0,z-depth/2+(i+.5)*span,crown);
}
glazedAtrium(width,length,0,490,555,10);
for(const side of [-1,1]){
  const angle=-90*side;
  let start=-4000;
  function wallRun(end){
    // End each run at the jamb so the door is a true opening.
    const distance=end-start;
    if(distance<=0)return;
    const span=distance/Math.ceil(distance/700);
    for(let edge=start;edge<end-1;edge+=span){
      face('bay-shell',span+2,490,side*boundary,-245,edge+span/2,angle);
    }
  }
  for(const room of rooms.filter(r=>r.side===side).sort((a,b)=>a.z-b.z)){
    wallRun(room.z-210);start=room.z+210;
    face('bay-shell',422,170,side*boundary,-405,room.z,angle);
  }
  wallRun(4000);
  face('gallery',length,46,side*(boundary-38),-468,0,angle);
  strip(7,length,side*860,0,'#ffdb9b');
}
const gates=[];
for(const sign of [-1,1]){
  const z=sign*3900,angle=sign===-1?0:180;
  for(const side of [-1,1])face('bay-shell',boundary-210,height,side*(boundary+210)/2,-height/2,z,angle);
  face('bay-shell',424,height-320,0,-(height+320)/2,z,angle);
  face('end-vista',width-160,310,0,-542,z-sign*8,angle);
  const label=sign===-1?'Flight bridge':'Celestial garden';
  gates.push({sign,door:makeDoor(0,z,angle,label,'#ffda92'),url:sign===-1?'bridge.html':'bridge.html#holodeck'});
}
exhibit(flagship,874,276,-570,-235,-3380,0,true);
installAlcove(flagship.screen);
// Draw the distant sky behind the ship so a cube face can never cover a rib or wall.
const skyBackdrop=document.createElement('div'),skyCamera=document.createElement('div'),sky=document.createElement('div');
skyBackdrop.className='sky-backdrop';skyCamera.className='sky-camera';sky.className='exterior-sky';
skyBackdrop.setAttribute('aria-hidden','true');skyCamera.append(sky);skyBackdrop.append(skyCamera);view.prepend(skyBackdrop);
for(const [direction,x,y,z,ry,rx] of [['py',0,-512,0,0,90],['ny',0,512,0,0,-90],['pz',0,0,-512,0,0],['nz',0,0,512,180,0],['px',512,0,0,-90,0],['nx',-512,0,0,90,0]]){
  const tile=face('exterior-pane',1025,1025,x,y,z,ry,rx);
  tile.style.backgroundImage='url('+(direction==='py'?'assets/concourse-galaxy.webp':'assets/forge/'+direction+'.webp')+')';
  sky.append(tile);
}
const glow=face('reflection',1300,900,0,-2,-2420,0,90);
glow.style.backgroundImage='url('+flagship.asset+')';
const chairs=[], corridorX=2430, corridorHalf=245;
let seated=null, activityUntil=0;
function standingEye(){return (seated?105:eye)+(window.stationCity?.height||0)+(window.deckTraversal?.height||0)}
function rise(){
  visitor.look=0;window.deckTraversal?.reset();
  if(!seated)return;
  visitor.x=seated.entry.x;visitor.z=seated.entry.z;seated=null;
  byId('rise').hidden=true;window.seatLearning?.stop();draw();
}
function addSeat(x,z,facing,room=null){
  const chair=face('flight-seat',123,161,x,-67,z);
  const hue=room?[-5,22,-28,16,40,-14,26,6][rooms.indexOf(room)]||0:0;chair.style.setProperty('--upholstery-hue',hue+'deg');
  const seat={node:chair,x,z,facing,room,id:'s'+Math.round(x)+'z'+Math.round(z)};
  chairs.push(seat);
  interactive.set(chair,{room,seatId:seat.id,name:'Sit in observation chair',action:()=>{
    if(seated||Math.hypot(visitor.x-x,visitor.z-z)>640||window.flightCrew?.occupied(seat.id))return;
    visitor.look=0;seat.entry={x:visitor.x,z:visitor.z};seated=seat;
    Object.assign(visitor,{x,z,yaw:facing,pitch:.02});keys.clear();byId('rise').hidden=false;window.seatLearning?.start(seat);
  }});
}
function turnChairs(){
  for(const c of chairs){
    if(c.room&&!c.room.visible)continue;
    const a=Math.atan2(visitor.x-c.x,visitor.z-c.z);
    const idx=(Math.round((a+c.facing)*8/Math.PI)%16+16)%16;
    c.node.style.transform='translate3d('+c.x+'px,-67px,'+c.z+'px) rotateY('+a+'rad)';
    c.node.style.backgroundPosition=(idx%8)*100/7+'% '+Math.floor(idx/8)*100+'%';
    c.node.geometry.ry=a;c.node.style.visibility=c===seated?'hidden':'';
  }
}
let vistaNumber=0;
function starWindow(w,h,x,y,z,angle,variant=0){
  const rad=angle*Math.PI/180;
  const glass=face('galaxy-window',w,h,x+48*Math.sin(rad),y,z+48*Math.cos(rad),angle);
  const views=['assets/concourse-galaxy.webp','assets/forge/pz.webp','new-eden-nebula.webp','assets/forge/nx.webp','assets/forge/px.webp'];
  const file=views[vistaNumber++%views.length];
  glass.style.backgroundImage='linear-gradient(125deg,#b8eced22,transparent 30% 80%,#eabf9129),url('+file+')';
  glass.style.backgroundPosition=(35+variant*17)+'% '+(44+variant*6)+'%';
  return glass;
}
function tree(x,z){
  face('planter-rim',205,205,x,-6,z,0,90);
  const scale=z>3900?2.13:2.02;
  trees.push({x,z,scale});
}
// Each suite carries its finish from the entrance through to the curved end wall.
const suiteFinishes=[
  ['#526974','#23343d'],['#b6ada0','#827c70'],['#8caaaf','#596977'],['#c09a70','#9e8874'],
  ['#605b70','#393444'],['#839ba1','#53636a'],['#847b70','#514b49'],['#a7a085','#757463']
];
function suiteFinish(node,index){
  node.dataset.suite=index;
  node.style.setProperty('--suite-shell',suiteFinishes[index][0]);
  node.style.setProperty('--suite-floor',suiteFinishes[index][1]);
}
const trees=[];
for(const side of [-1,1]){
  for(const z of [-3150,-120,1390,3160]){
    const reach=z<0?865:945;
    starWindow(reach,267,side*(boundary-8),-248,z,-side*90,side+1);
    const poolX=side*(boundary-300);
    face('pool',290,reach*.74,poolX,-4,z,0,90);
    tree(poolX,z+reach*.20);
    // Fan the lounge seats toward the same vista; keep the centreline open to traffic.
    for(const spread of [-1,0,1]){
      const seatX=side*(spread?805:738),seatZ=z+spread*205;
      addSeat(seatX,seatZ,Math.atan2(side*boundary-seatX,seatZ-z));
    }
  }
  const sideRooms=rooms.filter(r=>r.side===side).sort((a,b)=>a.z-b.z);
  for(let i=1;i<sideRooms.length;i++){
    const z1=sideRooms[i-1].z+roomHalf,z2=sideRooms[i].z-roomHalf;
    const span=z2-z1,z=(z1+z2)/2;
    const passage=face('chamber-floor',corridorHalf*2,span,side*corridorX,0,z,0,90);
    suiteFinish(passage,0);
    // Nested milled portals reveal the next room while leaving a continuous walkable deck.
    for(const end of [-1,1]){
      const section=face('blender-alcove passage-casting',corridorHalf*2,350,side*corridorX,-192,z+end*(span/2-40),end<0?180:0);
      section.alcoveScale=[corridorHalf/5.66,80,65];
    }
    face('chamber-lid',corridorHalf*2,span,side*corridorX,-350,z,0,90);
    for(const edge of [-1,1]){
      face('bay-shell',span,350,side*corridorX+edge*corridorHalf,-175,z,edge*-90);
      strip(6,span,side*corridorX+edge*(corridorHalf-36),z,'#e5bd77');
    }
  }
}
// A glass observation lounge joins the promenade to the private holodeck.
const gardenStart=3900,gardenEnd=5550,gardenWidth=900;
face('chamber-floor',gardenWidth*2,gardenEnd-gardenStart,0,0,(gardenEnd+gardenStart)/2,0,90);
for(const side of [-1,1]){
  if(side<0){
    face('bay-shell',gardenEnd-gardenStart,410,side*gardenWidth,-205,(gardenEnd+gardenStart)/2,-side*90);
    starWindow(1270,308,side*(gardenWidth-12),-226,4715,-side*90,side+1);
  }else{
    for(const [a,b] of [[gardenStart,4470],[4990,gardenEnd]]){
      face('bay-shell',b-a,410,gardenWidth,-205,(a+b)/2,-90);
      starWindow(b-a-52,260,gardenWidth-15,-216,(a+b)/2,-90,1);
    }
  }
  face('pool',390,850,side*585,-3,4710,0,90);
  for(const z of [4335,5060])tree(side*650,z);
  for(const z of [4560,4710,4860])addSeat(side*286,z,side*Math.PI/2);
  strip(6,1540,side*208,4710,'#ffd292');
  face('bay-shell',gardenWidth-210,600,side*(gardenWidth+210)/2,-300,gardenEnd,180);
}
glazedAtrium(gardenWidth*2,gardenEnd-gardenStart,(gardenEnd+gardenStart)/2,410,840,4);
face('bay-shell',425,280,0,-460,gardenEnd,180);
const gardenExit=makeDoor(0,gardenEnd,180,'Stellar promenade','#90dfdb');
gates.push({sign:2,door:gardenExit,url:'bridge.html#holodeck'});
const gardenDestination={name:'Celestial garden',garden:true};
const terraceDoor=makeDoor(gardenWidth,4730,-90,'Orbital garden terrace','#a3e8ce');
face('chamber-floor',1550,1240,1675,0,4730,0,90);
for(const side of [-1,1]){
  face('balustrade',1550,102,1675,-51,4730+side*620,side>0?180:0);
  face('pool',590,210,1720,-4,4730+side*365,0,90);
  tree(1430,4730+side*370);tree(2140,4730+side*415);
  addSeat(1870,4730+side*170,side>0?0:Math.PI);
}
face('balustrade',1240,102,2450,-51,4730,-90);
strip(6,1210,2310,4730,'#bce8df');
for(let i=0;i<11;i++){
  const tz=4730+(i-5)*590,tx=3610+490*Math.cos(i*1.7),h=370+760*(.5+.5*Math.sin(i*2.47));
  const tower=face('orbital-spire',210+(i%3)*45,h,tx,-h/2+180,tz,-90);
  tower.dataset.seed=i;
}
const teaching=[
 ['Wormhole signatures','Scan cosmic signatures with probes. Bookmark both sides of a connection before exploring beyond it.'],
 ['Reading a hull','A ship’s silhouette tells only part of its story. Compare its role, bonuses and fittings in the ship archive.'],
 ['Reading a system','Use the system atlas to compare regions and plan a route before undocking.'],
 ['Mining yield','Compare a mining cycle with the volume of your hold. Hauling time also affects what reaches the refinery.'],
 ['Sleeper encounters','Sleeper sites have distinct waves. Check the site guide before committing the fleet.'],
 ['Fitting a ship','Choose a role, then balance propulsion, tank and weapons against powergrid and CPU.'],
 ['Site intelligence','Identify the site before warping in. Use the archive to study the encounter and its triggers.'],
 ['Dividing a haul','Record the loot total and agree on shares before distributing the proceeds.']
];
// Each pair gives the distance from the centreline to the port and starboard walls.
const suiteOutline=[[boundary,218],[1580,218],[1670,321],[1790,425],[1950,517],
  [2080,575],[corridorX-corridorHalf,roomHalf],[corridorX+corridorHalf,roomHalf],
  [2800,592],[2940,552],[3080,498],[3190,429],[roomEnd,365]];
function suiteWidthAt(x){
  for(let i=1;i<suiteOutline.length;i++){
    const [right,wide]=suiteOutline[i],[left,narrow]=suiteOutline[i-1];
    if(x<=right)return narrow+(wide-narrow)*(x-left)/(right-left);
  }
  return 0;
}
for(const [i,room] of rooms.entries()){
  const {side,z}=room,angle=-90*side,tone=tones[i];
  room.door=makeDoor(side*boundary,z,angle,room.name,tone);
  for(const lane of [-150,150])strip(670,8,side*(boundary-282),z+lane,tone);
  // Each chamber has its own continuous floor, hull and approach sightline.
  const nodesBefore=hall.lastElementChild;
  const centre=side*(boundary+roomEnd)/2,depth=roomEnd-boundary;
  const chamberFloor=face('chamber-floor',depth,roomHalf*2,centre,0,z,0,90);
  chamberFloor.style.setProperty('--tone',tone);
  const rotundaX=side*corridorX,radius=535;
  for(const [kind,level] of [['rotunda-disc',2],['rotunda-ring',5],['rotunda-dome',450]]){
    const node=face(kind,2*radius,2*radius,rotundaX,-level,z,0,90);
    node.dataset.suite=i;
  }
  // A coffer around the dome seals the entry, screen bay and cross passages.
  const soffit=face('suite-soffit',depth,roomHalf*2,centre,-450,z,0,90);
  soffit.dataset.aperture=rotundaX-centre;
  soffit.dataset.radius=radius;
  soffit.style.setProperty('--oculus-x',(depth/2+rotundaX-centre)+'px');
  soffit.style.setProperty('--oculus-radius',radius+'px');
  for(const end of [-1,1]){
    const hasPass=rooms.some(other=>other.side===side&&(other.z-z)*end>0);
    for(let n=1;n<suiteOutline.length;n++){
      const [a,u]=suiteOutline[n-1],[b,v]=suiteOutline[n];
      const opening=a===corridorX-corridorHalf&&hasPass;
      const h=opening?100:450,dx=side*(b-a),dz=end*(v-u);
      const angle=Math.atan2(end*side*dz,-end*side*dx)*180/Math.PI;
      const x=side*(a+b)/2,wallZ=z+end*(u+v)/2;
      face('bay-shell',Math.hypot(dx,dz)+2,h,x,opening?-400:-225,wallZ,angle);
      if(a===boundary)starWindow(165,145,x,-225,wallZ,angle,i%3);
      if(a===2800&&end<0){
        const rad=angle*Math.PI/180;
        const board=face('learning-panel',235,154,x+58*Math.sin(rad),-225,wallZ+58*Math.cos(rad),angle);
        const name=document.createElement('strong'),copy=document.createElement('p');
        name.textContent=teaching[i][0];copy.textContent=teaching[i][1];board.append(name,copy);
        interactive.set(board,room);
      }
    }
  }
  face('bay-shell',730,450,side*roomEnd,-225,z,angle);
  const isHolo=i===0||i===4;
  if(isHolo){
    room.program=i===0?0:1;
    room.projection=face('simulation',660,345,side*(roomEnd-90),-220,z,angle);
    room.portalX=side*(boundary+555);
    const portal=face('training-gate',310,280,room.portalX,-140,z,angle);
    const label=textFace('portal-name',283,31,room.portalX,-297,z,angle,'Walk through · '+(i===0?'Scout training':'Fleet training'));
    const selector=room.selector=textFace('console',312,68,side*(roomEnd-455),-125,z,angle,'');
    interactive.set(selector,{name:'Cycle simulation',room,action:()=>{room.program=(room.program+1)%simulations.length;renderSimulation(room)}});
    for(const surface of [room.projection]){
      interactive.set(surface,{name:room.name+' · Screen media',media:true,room,action:()=>window.stationMediaMenu?.(surface,room)});
    }
    renderSimulation(room);

  }else{
    exhibit(room,660,284,side*(roomEnd-118),-247,z,angle);
    const console=textFace('console',255,72,side*(roomEnd-670),-126,z+182,angle,room.name);
    interactive.set(console,room);
  }
  installAlcove(room.projection||room.screen);
  // Keep the lesson accessible from the room screen, seating and deck directory;
  // do not float a large text hologram across the seating sightline.

  // Seats form a shallow radial auditorium around the central viewing screen.
  for(const row of [-185,105]){
    for(const offset of [-230,230]){
      const sx=rotundaX+side*row,sz=z+offset;
      addSeat(sx,sz,Math.atan2(side*(roomEnd-118)-sx,offset),room);
    }
  }
  let n=nodesBefore.nextElementSibling;const nodes=[];
  while(n){
    if(n.matches('.bay-shell,.continuous-return,.chamber-floor,.promenade-shell'))suiteFinish(n,i);
    nodes.push(n);n=n.nextElementSibling
  }
  chamberNodes.set(room,nodes);
}
function roomAt(x,z){
  return Math.abs(x)>boundary&&Math.abs(x)<roomEnd&&rooms.find(r=>Math.sign(x)===r.side&&Math.abs(z-r.z)<roomHalf);
}
function refreshRoom(){
  const next=roomAt(visitor.x,visitor.z)||null;
  if(next!==currentRoom){
    const old=currentRoom;currentRoom=next;
    window.updateIntercom?.();
    if(old?.projection)renderSimulation(old);
    if(next?.projection)renderSimulation(next);
  }
  const area=visitor.z>gardenEnd?null:visitor.z<-3900?(window.liveHelm?.inCinema()?'Screening theatre':'Flight bridge'):next?.name||(visitor.z>gardenStart?(visitor.x>gardenWidth?'Orbital garden terrace':'Celestial garden'):Math.abs(visitor.x)>boundary?'Gallery passage':'Grand Concourse');
  const readout=document.querySelector('.location strong');if(area&&readout.textContent!==area)readout.textContent=area;
  for(const [room,nodes] of chamberNodes){
    const onWing=visitor.x*room.side>boundary-100;
    const visible=room===next||(Math.abs(visitor.z-room.z)<(onWing?3600:3000)&&Math.abs(visitor.x-room.side*boundary)<(onWing?3900:3100));
    if(room.visible===visible)continue;
    room.visible=visible;
    for(const node of nodes)node.hidden=!visible;
  }
}
function resetAt(station){
  rise();visitor.look=0;window.stationCity?.reset();
  if(station.garden){Object.assign(visitor,{x:0,z:3550,yaw:Math.PI,pitch:.04})}
  else if(station.side){
    Object.assign(visitor,{x:station.side*(boundary+380),z:station.z,yaw:station.side*Math.PI/2,pitch:0});
  } else {
    Object.assign(visitor,{x:0,z:-1200,yaw:0,pitch:.25});
  }
  draw();
}
function openStation(station){
  if(station.action){activityUntil=Date.now()+5500;station.action();draw();return}
  if(!station.archive&&window.startStationLesson?.(station))return;
  keys.clear();
  byId('record-title').textContent=station.name;
  frame.src='archive/index.html#'+station.route;
  record.showModal();
}
for(const station of [flagship,gardenDestination,...rooms]){
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
    if(node.hidden||station.room&&station.room!==currentRoom)continue;
    if(!station.action&&station.side&&station!==currentRoom)continue;
    if(station.name==='Sit in observation chair'&&(window.flightCrew?.occupied(station.seatId)||seated||Math.hypot(visitor.x-node.geometry.x,visitor.z-node.geometry.z)>640))continue;
    if(currentRoom && station===flagship)continue;
    const g=node.geometry, c=Math.cos(g.ry),s=Math.sin(g.ry),a=Math.cos(g.rx),b=Math.sin(g.rx);
    const nx=s*a,ny=-b,nz=c*a,denom=dx*nx+dy*ny+dz*nz;
    if(denom>=-.0001)continue;
    const t=((g.x-visitor.x)*nx+(g.y+standingEye())*ny+(g.z-visitor.z)*nz)/denom;
    if(t<=0||t>=nearest)continue;
    const x=visitor.x+t*dx-g.x,y=-standingEye()+t*dy-g.y,z=visitor.z+t*dz-g.z;
    if(Math.abs(x*c-z*s)>g.w/2||Math.abs(x*s*b+y*a+z*c*b)>g.h/2)continue;
    nearest=t;selected=station;
  }
  return selected;
}
let deckZoom=1;
view.addEventListener('wheel',e=>{
  if(menu.open||record.open||byId('media-browser')?.open||e.ctrlKey)return;
  e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
  deckZoom=Math.max(.62,Math.min(2.8,deckZoom*Math.exp(-delta*.00165)));draw();
},{passive:false,capture:true});
let lastCull='';
function cullCompatibilityScene(){
  if(window.hdStation)return;
  const {x,z,yaw}=visitor;
  const stamp=[Math.round(x/90),Math.round(z/90),Math.round(yaw*10),hall.childElementCount].join('/');
  if(stamp===lastCull)return;
  lastCull=stamp;
  const sn=Math.sin(yaw),cs=Math.cos(yaw);
  for(const el of hall.children){
    const g=el.geometry;if(!g)continue;
    const dx=g.x-x,dz=g.z-z,r=Math.hypot(g.w,g.h)*.5+320;
    const off=Math.hypot(dx,dz)>6800+r||dx*sn-dz*cs < -r;
    if(el.deckCulled!==off){el.deckCulled=off;el.classList.toggle('outside-view',off)}
  }
}
function draw(){
  cullCompatibilityScene();
  refreshRoom();turnChairs();
  for(const el of hall.querySelectorAll('.course-holo,.holo-model')){
    const g=el.geometry;if(el.deckCulled)continue;
    g.ry=Math.atan2(visitor.x-g.x,visitor.z-g.z);el.style.transform='translate3d('+g.x+'px,'+g.y+'px,'+g.z+'px) rotateY('+g.ry+'rad)';
  }

  const focal=Math.min(innerWidth*.87,innerHeight*.82)*deckZoom;
  view.style.perspective=focal+'px';
  skyBackdrop.style.perspective=focal+'px';skyCamera.style.transform='translateZ('+focal+'px)';
  sky.style.transform='rotateX('+visitor.pitch+'rad) rotateY('+visitor.yaw+'rad)';
  byId('camera').style.transform='translateZ('+focal+'px)';
  hall.style.transform=`rotateX(${visitor.pitch}rad) rotateY(${visitor.yaw}rad) translate3d(${-visitor.x}px,${standingEye()}px,${-visitor.z}px)`;
  target=pick(innerWidth/2,innerHeight/2)||window.stationPrompt?.()||null;
  const use=byId('interact');
  use.hidden=!target||record.open||menu.open||!!window.classroomActive;
  if(target)use.textContent=(target.action?'':'Open ')+target.name+' · E';
}
byId('interact').onclick=()=>{if(target)openStation(target)};
const movement=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'];
window.addEventListener('keydown',e=>{
  if(e.code==='Space'&&seated&&!e.repeat){e.preventDefault();rise();return}
  if(document.querySelector('dialog[open]')||e.target.closest?.('input,select,textarea,[contenteditable=true]'))return;
  if(e.code==='Space'&&!e.repeat&&(!e.target.closest?.('button')||document.pointerLockElement===view)){e.preventDefault();window.deckTraversal?.jump();return}
  const code=movementCode(e);
  if(movement.includes(code)&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.target.closest?.('input,select,textarea,[contenteditable=true]')){
    e.preventDefault();
    if(!seated)view.focus({preventScroll:true});
    if(!keys.has(code)){advanceMovement(performance.now());keys.add(code)}
  }
  if(e.code==='KeyE'&&!seated&&!e.repeat&&window.seatLearning?.chair()){e.preventDefault();window.seatLearning.take();return}
  if(e.code==='KeyE'&&target&&!window.classroomActive&&!e.repeat){e.preventDefault();openStation(target)}
});
window.addEventListener('keyup',e=>{
  const code=movementCode(e);
  if(keys.has(code)){advanceMovement(performance.now());keys.delete(code)}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear()});
window.addEventListener('blur',()=>{keys.clear();drag=null});
let drag=null;
view.addEventListener('pointerdown',e=>{
  if(e.button!==0||drag)return;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,distance:0,station:document.pointerLockElement===view?target:pick(e.clientX,e.clientY)};
  view.setPointerCapture(e.pointerId);view.focus();
});
async function enterMouseLook(){
  view.focus({preventScroll:true});
  try{await view.requestPointerLock()}catch{/* Drag remains available in embedded browsers. */}
}
byId('mouse-look').onclick=()=>{menu.close();enterMouseLook()};
function aim(dx,dy){
  const old=visitor.look||0;
  visitor.look=Math.max(-Math.PI/2,Math.min(Math.PI/2,old+dx));
  visitor.yaw+=seated?visitor.look-old:dx;
  visitor.pitch=Math.max(-1.1,Math.min(1.1,visitor.pitch-dy));
  draw();
}
document.addEventListener('mousemove',e=>{
  if(document.pointerLockElement===view)aim(e.movementX*.0023,e.movementY*.0023);
});
document.addEventListener('pointerlockchange',()=>{
  drag=null;keys.clear();
  if(document.pointerLockElement===view)view.focus({preventScroll:true});
});
view.addEventListener('pointermove',e=>{
  if(document.pointerLockElement===view)return;
  if(drag?.id!==e.pointerId)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  drag.distance+=Math.abs(dx)+Math.abs(dy);
  drag.x=e.clientX;drag.y=e.clientY;
  aim(dx*.003,dy*.003);
});
view.addEventListener('pointerup',e=>{
  if(drag?.id!==e.pointerId)return;
  const {station,distance}=drag;drag=null;
  if(distance>=6)return;
  if(station)openStation(station);
  else if(e.pointerType==='mouse'&&document.pointerLockElement!==view)enterMouseLook();
});
view.addEventListener('pointercancel',()=>{drag=null});
for(const button of document.querySelectorAll('[data-key]')){
  button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);advanceMovement(performance.now());keys.add(button.dataset.key)};
  button.onlostpointercapture=()=>{advanceMovement(performance.now());keys.delete(button.dataset.key)};
}
function clear(x,z){
  if(window.deckTraversal&&!window.deckTraversal.allows(x,z))return false;
  if(z<-3900&&window.liveHelm)return window.liveHelm.clear(x,z);
  if(z>gardenEnd&&window.stationCity)return window.stationCity.clear(x,z);
  if((!window.deckTraversal&&chairs.some(c=>Math.hypot(x-c.x,z-c.z)<39))||trees.some(t=>Math.hypot(x-t.x,z-t.z)<49))return false;
  if(z>gardenStart&&z<gardenEnd&&x>=gardenWidth-40){
    if(x>2410||Math.abs(z-4730)>580)return false;
    if(x<gardenWidth+45)return Math.abs(z-4730)<178&&passageOpen(terraceDoor,x,z);
    return !trees.some(t=>Math.hypot(x-t.x,z-t.z)<49);
  }
  if(Math.abs(x)<boundary-28){
    if(z>3940){
      if(Math.abs(x)>gardenWidth-35||z>gardenEnd+80)return false;
      if(z>gardenEnd-42)return Math.abs(x)<180&&passageOpen(gardenExit,x,z);
      return true;
    }
    if(Math.abs(z)<3855)return true;
    const gate=gates.find(g=>Math.sign(z)===g.sign);
    return Math.abs(z)<3980&&Math.abs(x)<180&&passageOpen(gate.door,x,z);
  }
  const room=rooms.find(r=>r.side===Math.sign(x)&&Math.abs(z-r.z)<roomHalf-32);
  if(Math.abs(x)>roomEnd-45)return false;
  if(room && Math.abs(z-room.z)>suiteWidthAt(Math.abs(x))-32)return false;
  if(!room)return Math.abs(Math.abs(x)-corridorX)<corridorHalf-28&&z>-2500&&z<2200;
  if(Math.abs(z-room.z)>roomHalf-48 && Math.abs(Math.abs(x)-corridorX)>corridorHalf-28)return false;
  if(Math.abs(x)<boundary+40)return Math.abs(z-room.z)<180&&passageOpen(room.door,x,z);
  return true;
}
let movementTime=performance.now();
function movementCode(e){
  if(movement.includes(e.code))return e.code;
  return ({w:'KeyW',a:'KeyA',s:'KeyS',d:'KeyD',shift:'ShiftLeft'})[e.key?.toLowerCase()]||e.key;
}
function moveStep(dt){
    const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
    const side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
    if(!seated)visitor.yaw+=(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*dt*1.45;
    const step=dt*(keys.has('ShiftLeft')||keys.has('ShiftRight')?485:185)/Math.max(1,Math.hypot(forward,side));
    const {x,z}=visitor;
    const yaw=visitor.yaw;
    if(!seated&&(forward||side))visitor.look*=Math.exp(-9*dt);
    const nx=x+step*(Math.sin(yaw)*forward+Math.cos(yaw)*side);
    const nz=z+step*(-Math.cos(yaw)*forward+Math.sin(yaw)*side);
    if(!seated&&!window.stationCity?.riding&&clear(nx,z))visitor.x=nx;
    if(!seated&&!window.stationCity?.riding&&clear(visitor.x,nz))visitor.z=nz;
    if(currentRoom?.portalX && (x-currentRoom.portalX)*currentRoom.side<0 &&
       (visitor.x-currentRoom.portalX)*currentRoom.side>=0 && Math.abs(visitor.z-currentRoom.z)<145){
      window.startCampusDrill?.(currentRoom);
    }
}
// Consume held time at input boundaries as well as render frames. A short tap
// between two paints still moves, and each collision step remains small.
function advanceMovement(now){
  let elapsed=Math.min(.8,Math.max(0,(now-movementTime)/1000));
  movementTime=Math.max(movementTime,now);
  if(!keys.size||document.querySelector('dialog[open]'))return;
  while(elapsed>0){const dt=Math.min(elapsed,1/75);moveStep(dt);elapsed-=dt}
  draw();
}
let previous=performance.now();
function tick(now){
  const dt=Math.min(.04,(now-previous)/1000);previous=now;
  window.stationCity?.update(now);
  updateDoors(dt);
  if(window.deckTraversal?.tick(dt)&&!keys.size)draw();
  advanceMovement(now);
  requestAnimationFrame(tick);
}
new MutationObserver(changes=>{
  if(document.pointerLockElement===view&&changes.some(change=>change.target.open))document.exitPointerLock();
}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
window.addEventListener('resize',draw);
draw();requestAnimationFrame(tick);

byId('rise').onclick=rise;
// Sample public walkways so a visitor on the other side of a bulkhead stays out of view.
function sightLine(ax,az,bx,bz){
  if(Math.hypot(bx-ax,bz-az)>7200)return false;
  if(az>gardenEnd&&bz>gardenEnd&&window.stationCity){
    const a=window.stationCity.classroomAt(ax,az),b=window.stationCity.classroomAt(bx,bz);
    return a===b||Math.abs(az-bz)<180;
  }
  const steps=Math.ceil(Math.hypot(bx-ax,bz-az)/65);
  for(let i=1;i<steps;i++){
    const t=i/steps,x=ax+(bx-ax)*t,z=az+(bz-az)*t,abs=Math.abs(x);
    if(z>gardenStart&&z<gardenEnd){
      if(x>=gardenWidth-32&&x<gardenWidth+32&&!(Math.abs(z-4730)<184&&passageOpen(terraceDoor,x,z)))return false;
      if(x>gardenWidth+32&&(x>2450||Math.abs(z-4730)>620))return false;
      continue;
    }
    if(abs<boundary-35)continue;
    const room=roomAt(x,z);
    if(abs<boundary+35){
      const doorRoom=rooms.find(r=>r.side===Math.sign(x)&&Math.abs(z-r.z)<207);
      if(!doorRoom||!passageOpen(doorRoom.door,x,z))return false;
    }else if(!room&&Math.abs(abs-corridorX)>corridorHalf-12)return false;
  }
  return true;
}


function activeDisplays(){
  for(const video of hall.querySelectorAll('.screen > video')){
    const screen=video.parentElement,g=screen.geometry;
    const dx=g.x-visitor.x,dz=g.z-visitor.z;
    const showing=!document.hidden&&!screen.hidden&&Math.hypot(dx,dz)<(screen.classList.contains('flagship')?6500:2600)&&dx*Math.sin(visitor.yaw)-dz*Math.cos(visitor.yaw)>0;
    if(showing){
      if(!video.src)video.src=video.dataset.src;
      if(video.paused)video.play().catch(()=>{});
    }else if(!video.paused)video.pause();
  }
}
setInterval(activeDisplays,850);activeDisplays();

