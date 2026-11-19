'use strict';

const byId = id => document.getElementById(id);
const view = byId('viewport'), hall = byId('hall');
const menu = byId('menu'), record = byId('record'), frame = record.querySelector('iframe');
const width = 2720, length = 8000, height = 735, eye = 165;
const visitor = {x: -530+Math.random()*170, z: 1570+Math.random()*135, yaw: .31, pitch: .055};
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
  const node = document.createElement('div');
  node.className = 'face '+kind;
  // Render large architectural finishes at a lower texture density.
  const scale = /^(floor|roof|roof skylight|wall|glass|gallery|stripe|reflection|exterior-pane)$/.test(kind) ? 4 : 1;
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
  if(kind==='chamber-lid'){
    node.classList.add('vaulted');
    const rise=Math.min(w*.12,144);
    // Close the curved roof at both ends above the straight bulkheads.
    const outline=Array.from({length:33},(_,i)=>(i*100/32)+'% '+(100-100*Math.sin(i*Math.PI/32))+'%').join(',');
    for(const end of [-1,1]){
      const cap=document.createElement('b');
      cap.className='vault-end';
      Object.assign(cap.style,{position:'absolute',width:w+'px',height:rise+'px',left:'0',top:(h/2+end*h/2-rise/2)+'px',
        transform:'translateZ('+rise/2+'px) rotateX(-90deg)',clipPath:'polygon('+outline+',100% 100%,0 100%)',
        background:'linear-gradient(#c9bfae,#716552 95%,#ab8d58)'});
      node.append(cap);
    }
    for(let i=0;i<16;i++){
      const a=i/16,b=(i+1)/16,za=rise*Math.sin(Math.PI*a),zb=rise*Math.sin(Math.PI*b),dx=w/16;
      const panel=document.createElement('b');panel.className='vault-skin';
      const len=Math.hypot(dx,zb-za)+.65;
      Object.assign(panel.style,{width:len+'px',height:h+'px',left:((a+b)*w/2-len/2)+'px',top:'0',
        transform:'translateZ('+((za+zb)/2)+'px) rotateY('+(-Math.atan2(zb-za,dx))+'rad)'});
      node.append(panel)
    }
  }
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
  video.dataset.src='assets/exhibits/'+(films[station.route]||'transit')+'.mp4';screen.insertBefore(video,caption);
  interactive.set(screen,{name:station.name+' · Screen media',room:rooms.includes(station)?station:undefined,action:()=>window.stationMediaMenu?.(screen,station)});station.screen=screen;
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
rooms[4].name='Sleeper holodeck';
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
    video.src='assets/exhibits/'+program.film+'.mp4';
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
    const sign=local('portal-name',500,46,0,-387,offset);
    sign.textContent=label;sign.style.backfaceVisibility='hidden';
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
for(let i=0;i<18;i++){
  const a=i*Math.PI/18,b=(i+1)*Math.PI/18;
  const x1=boundary*Math.cos(a),x2=boundary*Math.cos(b);
  const y1=-490-245*Math.sin(a),y2=-490-245*Math.sin(b);
  const skylight=i>=6&&i<=11;
  const panel=face(skylight?'roof skylight':'roof',Math.hypot(x2-x1,y2-y1)+2,length,(x1+x2)/2,(y1+y2)/2,0,0,0,Math.atan2(y2-y1,x2-x1)*180/Math.PI);
  panel.style.transform+=' rotateX(90deg)';
  
}
for(let z=-3600;z<4000;z+=810)face('rib',width,height,0,-height/2,z);
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
exhibit(flagship,1450,396,0,-495,-2950,0,true);
for(const x of [-620,620])face('trim',24,85,x,-696,-2950);
const sky=document.createElement('div');sky.className='exterior-sky';hall.prepend(sky);
for(const [direction,x,y,z,ry,rx] of [['py',0,-6800,0,0,90],['ny',0,6800,0,0,-90],['pz',0,0,-6800,0,0],['nz',0,0,6800,180,0],['px',6800,0,0,-90,0],['nx',-6800,0,0,90,0]]){
  const tile=face('exterior-pane',13604,13604,x,y,z,ry,rx);
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
  const glass=face('galaxy-window',w,h,x,y,z,angle);
  const views=['assets/concourse-galaxy.webp','assets/forge/pz.webp','new-eden-nebula.webp','assets/forge/nx.webp','assets/forge/px.webp'];
  const file=views[vistaNumber++%views.length];
  glass.style.backgroundImage='linear-gradient(125deg,#b8eced22,transparent 30% 80%,#eabf9129),url('+file+')';
  glass.style.backgroundPosition=(35+variant*17)+'% '+(44+variant*6)+'%';
  return glass;
}
function tree(x,z){
  face('planter-rim',205,205,x,-6,z,0,90);
  const scale=z>3900?2.80:2.45;
  trees.push({x,z,scale});
}
const trees=[];
for(const side of [-1,1]){
  for(const z of [-3150,-120,1390,3160]){
    starWindow(625,250,side*(boundary-8),-264,z,-side*90,side+1);
    face('pool',265,595,side*975,-4,z,0,90);
    tree(side*975,z+150);
    addSeat(side*800,z+70,side*Math.PI/2);
    addSeat(side*800,z-75,side*Math.PI/2);
  }
  const sideRooms=rooms.filter(r=>r.side===side).sort((a,b)=>a.z-b.z);
  for(let i=1;i<sideRooms.length;i++){
    const z1=sideRooms[i-1].z+roomHalf,z2=sideRooms[i].z-roomHalf;
    const span=z2-z1,z=(z1+z2)/2;
    face('chamber-floor',corridorHalf*2,span,side*corridorX,0,z,0,90);
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
  face('bay-shell',gardenEnd-gardenStart,410,side*gardenWidth,-205,(gardenEnd+gardenStart)/2,-side*90);
  starWindow(1270,308,side*(gardenWidth-12),-226,4715,-side*90,side+1);
  face('pool',390,850,side*585,-3,4710,0,90);
  for(const z of [4335,5060])tree(side*650,z);
  for(const z of [4560,4710,4860])addSeat(side*286,z,side*Math.PI/2);
  strip(6,1540,side*208,4710,'#ffd292');
  face('bay-shell',gardenWidth-210,600,side*(gardenWidth+210)/2,-300,gardenEnd,180);
}
for(let z=3990;z<gardenEnd;z+=315)face('rib',gardenWidth*2,875,0,-437.5,z);
face('bay-shell',425,280,0,-460,gardenEnd,180);
const gardenExit=makeDoor(0,gardenEnd,180,'Stellar promenade','#90dfdb');
gates.push({sign:2,door:gardenExit,url:'bridge.html#holodeck'});
const gardenDestination={name:'Celestial garden',garden:true};
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
for(const [i,room] of rooms.entries()){
  const {side,z}=room,angle=-90*side,tone=tones[i];
  room.door=makeDoor(side*boundary,z,angle,room.name,tone);
  for(const lane of [-150,150])strip(670,8,side*(boundary-282),z+lane,tone);
  // Each chamber has its own continuous floor, hull and approach sightline.
  const nodesBefore=hall.lastElementChild;
  const centre=side*(boundary+roomEnd)/2,depth=roomEnd-boundary;
  face('chamber-floor',depth,roomHalf*2,centre,0,z,0,90).style.setProperty('--tone',tone);
  face('chamber-lid',depth,roomHalf*2,centre,-449,z,0,90);
  for(const end of [-1,1]){
    const hasPass=rooms.some(other=>other.side===side&&(other.z-room.z)*end>0);
    const wallZ=z+roomHalf*end;
    const spans=hasPass?[[boundary,corridorX-corridorHalf],[corridorX+corridorHalf,roomEnd]]:[[boundary,roomEnd]];
    for(const [a,b] of spans)face('bay-shell',b-a+2,450,side*(a+b)/2,-225,wallZ,end===1?180:0);
    if(hasPass){
      face('bay-shell',corridorHalf*2+3,100,side*corridorX,-400,wallZ,end===1?180:0);
      face('pass-rim',corridorHalf*2,350,side*corridorX,-175,wallZ,end===1?180:0);
    }
    starWindow(610,207,side*1770,-250,wallZ-end*10,end===1?180:0,i%3);
    for(const lane of [-1,1])strip(7,roomHalf*2,side*corridorX+lane*(corridorHalf-36),z,tone);
    addSeat(side*1840,z+end*365,end===1?Math.PI:0,room);
    addSeat(side*1980,z+end*365,end===1?Math.PI:0,room);
    if(end===-1){
      for(let n=0;n<3;n++)face('ceiling-bar',17,roomHalf*2-50,side*(boundary+310+n*605),-444,z,0,90).style.setProperty('--tone',tone);
      const board=face('learning-panel',450,215,side*2950,-228,wallZ+12);
      const name=document.createElement('strong'),copy=document.createElement('p');
      name.textContent=teaching[i][0];copy.textContent=teaching[i][1];board.append(name,copy);
      interactive.set(board,room);
    }
  }
  face('bay-shell',roomHalf*2,450,side*roomEnd,-225,z,angle);
  const isHolo=i===0||i===4;
  if(isHolo){
    room.program=i===0?0:1;
    room.projection=face('simulation',roomHalf*2-70,380,side*(roomEnd-20),-220,z,angle);
    room.wings=[-1,1].map(sign=>face('sim-wing',415,380,side*(roomEnd-157),-220,z+sign*489,angle+side*sign*44));
    const selector=room.selector=textFace('console',312,68,side*(roomEnd-455),-125,z,angle,'');
    interactive.set(selector,{name:'Cycle simulation',room,action:()=>{room.program=(room.program+1)%simulations.length;renderSimulation(room)}});
    renderSimulation(room);
    exhibit(room,278,145,side*(roomEnd-300),-184,z+420,angle);
  }else{
    exhibit(room,885,297,side*(roomEnd-25),-247,z,angle);
    const model=face('holo-model',330,230,side*(roomEnd-590),-190,z-182,angle);
    model.style.backgroundImage='url(archive/assets/'+models[i]+'-cutout.webp)';
    face('emitter',300,300,side*(roomEnd-590),-5,z-182,0,90).style.setProperty('--tone',tone);
    const console=textFace('console',255,72,side*(roomEnd-670),-126,z+182,angle,room.name);
    interactive.set(console,room);
  }
  let n=nodesBefore.nextElementSibling;const nodes=[];
  while(n){nodes.push(n);n=n.nextElementSibling}
  chamberNodes.set(room,nodes);
}
function roomAt(x,z){
  return Math.abs(x)>boundary&&rooms.find(r=>Math.sign(x)===r.side&&Math.abs(z-r.z)<roomHalf);
}
function refreshRoom(){
  const next=roomAt(visitor.x,visitor.z)||null;
  if(next!==currentRoom){
    const old=currentRoom;currentRoom=next;
    window.updateIntercom?.();
    if(old?.projection)renderSimulation(old);
    if(next?.projection)renderSimulation(next);
  }
  const area=visitor.z>gardenEnd?null:visitor.z<-3900?(window.liveHelm?.inCinema()?'Screening theatre':'Flight bridge'):next?.name||(visitor.z>gardenStart?'Celestial garden':Math.abs(visitor.x)>boundary?'Gallery passage':'Grand Concourse');
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
  rise();window.stationCity?.reset();
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
  sky.style.transform='translate3d('+visitor.x+'px,0,'+visitor.z+'px)';refreshRoom();turnChairs();

  const focal=Math.min(innerWidth*.87,innerHeight*.82);
  view.style.perspective=focal+'px';
  byId('camera').style.transform='translateZ('+focal+'px)';
  hall.style.transform=`rotateX(${visitor.pitch}rad) rotateY(${visitor.yaw}rad) translate3d(${-visitor.x}px,${standingEye()}px,${-visitor.z}px)`;
  target=pick(innerWidth/2,innerHeight/2)||window.stationPrompt?.()||null;
  const use=byId('interact');
  use.hidden=!target||record.open||menu.open;
  if(target)use.textContent=(target.action?'':'Open ')+target.name+' · E';
}
byId('interact').onclick=()=>{if(target)openStation(target)};
const movement=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'];
window.addEventListener('keydown',e=>{
  if(e.code==='Space'&&seated&&!e.repeat){e.preventDefault();rise();return}
  if(menu.open||record.open||document.querySelector('#lesson-panel')?.open||byId('media-browser')?.open)return;
  if(e.code==='Space'&&!e.repeat&&!(e.target.matches?.('input,select,textarea,button'))){e.preventDefault();window.deckTraversal?.jump();return}
  const code=movementCode(e);
  if(movement.includes(code)&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.target.closest?.('input,select,textarea,[contenteditable=true]')){
    e.preventDefault();
    if(!keys.has(code)){advanceMovement(performance.now());keys.add(code)}
  }
  if(e.code==='KeyE'&&!seated&&!e.repeat&&window.seatLearning?.chair()){e.preventDefault();window.seatLearning.take();return}
  if(e.code==='KeyE'&&target&&!e.repeat){e.preventDefault();openStation(target)}
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
    visitor.yaw+=(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*dt*1.45;
    const step=dt*(keys.has('ShiftLeft')||keys.has('ShiftRight')?1140:520)/Math.max(1,Math.hypot(forward,side));
    const {x,z,yaw}=visitor;
    if(!seated&&(forward||side))visitor.look*=Math.exp(-9*dt);
    const nx=x+step*(Math.sin(yaw)*forward+Math.cos(yaw)*side);
    const nz=z+step*(-Math.cos(yaw)*forward+Math.sin(yaw)*side);
    if(!seated&&!window.stationCity?.riding&&clear(nx,z))visitor.x=nx;
    if(!seated&&!window.stationCity?.riding&&clear(visitor.x,nz))visitor.z=nz;
}
// Consume held time at input boundaries as well as render frames. A short tap
// between two paints still moves, and each collision step remains small.
function advanceMovement(now){
  let elapsed=Math.min(.3,Math.max(0,(now-movementTime)/1000));
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
  for(const video of hall.querySelectorAll('.screen video')){
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
