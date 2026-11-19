'use strict';
(function(){
  const start=gardenEnd, bay=2600, count=29, end=start+bay*count, deckHeight=430;
  const districts=[
    ['Navigation rotunda',2400,'#a7dbdf','systems','Navigation begins with a destination. Use the atlas to compare systems and plan the next leg of your route.'],
    ['Mineral exchange',1280,'#efbc70','estimate','A hold fills by volume. Compare a mining cycle with your cargo capacity before choosing a ship.'],
    ['Gallery of hulls',3350,'#9bcbef','ships','Hull shape is a clue to a ship’s role. Inspect bonuses, fitting slots and weapon systems in the gallery.'],
    ['Wormhole gardens',2050,'#9dd0aa','wormholes','Every wormhole is temporary. Bookmark both ends and check its condition before moving the fleet.'],
    ['Sleeper research hall',2900,'#c6abe2','drifters','Study an encounter before committing a fleet. Sleeper waves can change the demands on a ship’s tank.'],
    ['Starlight observatory',3200,'#ffce92','story','Look through the observation glass, then explore the archive to discover the stories of New Eden.']
  ];
  const idx=z=>Math.max(0,Math.min(count-1,Math.floor((z-start)/bay)));
  const district=i=>districts[Math.min(5,Math.floor(i/5))];
  const widthAt=i=>i===0?1100:district(i)[1];
  const mids=i=>start+(i+.5)*bay;
  const chunks=new Map();let elevation=0,ride=null,inCity=false,here='',lastIndex=-9;
  const lifts=new Set([3,8,13,18,23,27]), classrooms=new Set([2,7,12,17,22,26]);
  function label(style,w,h,x,y,z,angle,words){
    if(style==='city-direction')textFace(style,w,h,x,y,z-(angle===0?2:-2),angle+180,words);
    return textFace(style,w,h,x,y,z,angle,words);
  }
  function drawHearth(cx,z){
    face('hearth-base',330,170,cx,-6,z,0,90);
    face('hearth-flame',271,112,cx,-65,z);
    for(const side of [-1,1])face('hearth-rail',332,12,cx,-17,z+side*65);
    for(const s of [-1,1])face('hearth-glass',340,90,cx,-57,z+s*57);
    for(const off of [-225,225])addSeat(cx+off,z+72,off<0?Math.PI/2:-Math.PI/2);
  }
  function makeLift(i,side,width){
    const z=mids(i),x=side*(width-460);
    const pad=face('lift-platform',330,330,x,-4,z,0,90);
    const info=label('console lift-control',156,51,x,-99,z+145,180,'Gallery lift');
    const upper=label('console lift-control',156,51,x,-deckHeight-99,z+145,180,'Promenade');
    const lift={x,z,pad,side,i};
    for(const button of [info,upper])interactive.set(button,{name:'Ride gallery lift',action:()=>board(lift)});
    for(const dx of [-180,180]){
      face('lift-post',17,deckHeight+210,x+dx,-(deckHeight+210)/2,z+175);
      face('lift-post',17,deckHeight+210,x+dx,-(deckHeight+210)/2,z-175);
    }
    return lift;
  }
  function board(lift){
    if(ride||seated||Math.hypot(visitor.x-lift.x,visitor.z-lift.z)>250)return;
    ride={lift,from:elevation,to:elevation>200?0:deckHeight,time:performance.now()};
    visitor.x=lift.x;visitor.z=lift.z;keys.clear();
  }
  function roomSpecs(i){
    const width=widthAt(i),side=i%2?1:-1,depth=760+(i%4)*290,half=415+(i%3)*160;
    return {side,depth,half,width,z:mids(i)};
  }
  function build(i){
    const preceding=hall.lastElementChild,chairStart=chairs.length,treeStart=trees.length,doorStart=doors.length;
    const z=mids(i),width=widthAt(i),[name,,tone,route,lesson]=district(i);
    const tall=width>2200?1190:710, slab=z-bay/2;
    const room=classrooms.has(i)?{...roomSpecs(i),name,route}:null;
    face('city-floor',width*2,bay+2,0,0,z,0,90);
    for(const side of [-1,1]){
      const angle=-side*90;
      const wall=(span,centre)=>face('city-wall',span,595,side*width,-297,centre,angle);
      if(room?.side===side){
        wall(bay/2-210,z-bay/4-105);wall(bay/2-210,z+bay/4+105);
        face('city-wall',420,275,side*width,-457,z,angle);
        room.door=makeDoor(side*width,z,angle,name+' classroom',tone);
        const cx=side*(width+room.depth/2),far=side*(width+room.depth);
        face('chamber-floor',room.depth,room.half*2,cx,0,z,0,90);
        face('chamber-lid',room.depth,room.half*2,cx,-430,z,0,90);
        for(const end of [-1,1])face('bay-shell',room.depth,430,cx,-215,z+end*room.half,end===1?180:0);
        face('bay-shell',room.half*2,430,far,-215,z,angle);
        curvedRoomEnds(side,width+room.depth,z,room.half,430,Math.min(225,room.half*.4));
        exhibit({name,route},room.half*1.45,250,far-side*74,-235,z,angle);
        const screen=hall.lastElementChild;room.screen=screen;screen.querySelector('img').src='assets/exhibits/'+['wormhole','ore','porpoise','ice','class5','flare'][Math.min(5,Math.floor(i/5))]+'.webp';
        const desk=label('learning-panel',395,211,cx,-180,z-room.half+69,0,lesson);
        interactive.set(desk,{name,route});
        for(const offset of [-160,160])addSeat(cx,z+offset,side*Math.PI/2);
      }else wall(bay,z);
      starWindow(1020,320,side*(width-12),-310,z+(room?.side===side?765:0),angle,i%3);
      strip(8,bay,side*width*.63,z,tone);
      const balcony=face('city-eave',width*.44,bay,side*width*.83,-tall+70,z,0,90);balcony.style.setProperty('--tone',tone);
      if(i%3===1){
        face('pool',330,1100,side*width*.57,-4,z,0,90);tree(side*width*.57,z-155);
        trees.at(-1).scale=width>2200?3.05:2.03;
        addSeat(side*(width*.57-220),z-125,side*Math.PI/2);addSeat(side*(width*.57-220),z+20,side*Math.PI/2);
      }
    }
    glazedAtrium(width*2,bay,z,595,tall,3);
    if(i%5===0||i===count-1){
      const sign=label('city-direction',1100,120,0,-tall*.52,z,180,name);
      sign.style.setProperty('--tone',tone);
    }
    if(i>0&&widthAt(i-1)!==width){
      const other=widthAt(i-1),diff=Math.abs(other-width);
      for(const side of [-1,1])face('city-wall',diff,660,side*(Math.min(other,width)+diff/2),-330,slab);
    }
    let pair=[];
    if(lifts.has(i)){
      pair=[makeLift(i,-1,width),makeLift(i,1,width)];
      const span=(width-460)*2;
      face('upper-deck',span,475,0,-deckHeight,z,0,90);
      for(const edge of [-1,1]){
        face('balustrade',span,96,0,-deckHeight-48,z+edge*235);
        face('balcony-edge',span,40,0,-deckHeight+20,z+edge*235);
      }
      label('city-direction',560,76,0,-deckHeight-189,z-207,0,'Observation walk');
    }
    if(i%5===4)drawHearth(-width*.47,z);
    if(i===count-1){
      face('city-wall',width*2,800,0,-400,end);
      starWindow(1900,495,0,-430,end-9,180,2);
      const hatch=label('console',375,120,0,-125,end-110,180,'Private holodeck');
      interactive.set(hatch,{name:'Enter private holodeck',action:()=>resetAt(rooms[0])});
    }
    const nodes=[];let n=preceding.nextElementSibling;while(n){nodes.push(n);n=n.nextElementSibling}
    return {nodes,chairs:chairs.slice(chairStart),trees:trees.slice(treeStart),doors:doors.slice(doorStart),room,pair};
  }
  function removeItems(arr,items){for(const item of items){const j=arr.indexOf(item);if(j>=0)arr.splice(j,1)}}
  function unload(i,c){
    for(const node of c.nodes){interactive.delete(node);node.remove()}
    removeItems(chairs,c.chairs);removeItems(trees,c.trees);removeItems(doors,c.doors);chunks.delete(i);
  }
  function stream(){
    const i=idx(visitor.z);
    if(i===lastIndex&&inCity===(visitor.z>start-1500))return;
    lastIndex=i;inCity=visitor.z>start-1500;
    for(const [j,c] of chunks)if(!inCity||Math.abs(j-i)>2)unload(j,c);
    if(inCity)for(let j=Math.max(0,i-2);j<=Math.min(i+2,count-1);j++)if(!chunks.has(j))chunks.set(j,build(j));
  }
  function clear(x,z){
    if(z>end-50)return false;
    if(z<start+55)return Math.abs(x)<178&&passageOpen(gardenExit,x,z);
    const i=idx(z),width=widthAt(i),off=Math.abs(z-mids(i));
    if(ride)return false;
    if(elevation>50)return lifts.has(i)&&off<187&&Math.abs(x)<width-310;
    if(Math.abs(x)<width-32)return true;
    const room=chunks.get(i)?.room;
    return !!room&&Math.sign(x)===room.side&&off<room.half-30&&Math.abs(x)<width+room.depth-30&&
      (Math.abs(Math.abs(x)-width)>48||off<175&&passageOpen(room.door,x,z));
  }
  function liftHere(){return chunks.get(idx(visitor.z))?.pair.find(l=>Math.hypot(l.x-visitor.x,l.z-visitor.z)<190)}
  function update(now){
    stream();
    if(ride){
      const f=Math.min(1,(now-ride.time)/2500);
      elevation=ride.from+(ride.to-ride.from)*(f*f*(3-2*f));
      const {x,z,pad}=ride.lift;pad.style.transform='translate3d('+x+'px,'+(-elevation-4)+'px,'+z+'px) rotateX(90deg)';
      if(f===1)ride=null;
      draw();
    }
    const lift=visitor.z>start&&liftHere();
    const button=byId('elevator');
    button.hidden=!lift||!!ride||record.open||menu.open;
    if(lift)button.textContent=elevation>200?'Lift to promenade':'Lift to observation walk';
    if(visitor.z>start){
      const i=idx(visitor.z),d=district(i),r=chunks.get(i)?.room;
      here=d[0]+(elevation>50?' · Upper walk':r&&Math.abs(visitor.x)>r.width?' · Classroom':'');
      document.querySelector('.location strong').textContent=here;
    }
  }
  const destinations=byId('destinations');
  districts.forEach((d,n)=>{
    const button=document.createElement('button');button.textContent=d[0];destinations.append(button);
    button.onclick=()=>{menu.close();rise();ride=null;elevation=0;
      Object.assign(visitor,{x:170,z:mids(5*n+(n===5?1:2))-470,yaw:Math.PI+.23,pitch:.055});
      stream();draw();update(performance.now())};
  });
  const liftLink=document.createElement('button');
  liftLink.textContent='Observation lift';destinations.append(liftLink);
  liftLink.onclick=()=>{
    menu.close();rise();ride=null;elevation=0;
    Object.assign(visitor,{x:widthAt(3)-460,z:mids(3),yaw:-Math.PI/2,pitch:0});
    stream();draw();update(performance.now());
  };
  byId('elevator').onclick=()=>{const lift=liftHere();if(lift)board(lift)};
  window.stationCity={start,end,clear,update,stream,get height(){return elevation},get riding(){return !!ride},
    reset(){ride=null;elevation=0},classroomAt(x,z){const r=chunks.get(idx(z))?.room;return r&&Math.abs(x)>r.width?r:null}};
})();
