'use strict';
const view=document.querySelector('main'),camera=document.querySelector('#camera'),world=document.querySelector('#world');
const subjects=[
 ['Flight school','Flight school','porpoise'],['Exploration lab','Exploration and cartography','wormhole'],
 ['Industry exchange','Industry and commerce','ore'],['Mission theatre','Combat and missions','fortizar'],
 ['Fleet operations','Fleet operations and PvP','class5']
];
const walls=[],rooms=[],keys=new Set(),eye=120;
const pos={x:74,z:355,yaw:-.19,pitch:0};
const menu=document.querySelector('dialog'),learn=document.querySelector('#learn');
let active=null,pending=0,last=0,projectionRoom=null;
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
 const inner=surface('wall',w,h,u,mid,0);
 // Sample the same full-height cladding across piers, sills and lintels.
 inner.style.backgroundPosition='center, '+(w/2-u-167)+'px '+(h/2-mid-270)+'px';
 inner.style.setProperty('--shade',(.12+.10*(1-Math.cos(turn-.7))).toFixed(2));
 surface('hull',w,h,u,mid,-thick,Math.PI);
 for(const side of [-1,1]){
   surface('reveal',thick,h,u+side*w/2,mid,-thick/2,side*Math.PI/2);
   surface('reveal',w,thick,u,mid+side*h/2,-thick/2,0,-side*Math.PI/2);
 }
}
// Cover the corners of a clear aperture and connect its two rims through the hull.
function portalRim(x,z,turn,gap,top,bottom,radius,door){
 const h=top-bottom,mid=-(top+bottom)/2;
 const r=radius,foot=door?0:r;
 const hole='M0 '+r+' Q0 0 '+r+' 0 H'+(gap-r)+' Q'+gap+' 0 '+gap+' '+r+' V'+(h-foot)+' Q'+gap+' '+h+' '+(gap-foot)+' '+h+' H'+foot+' Q0 '+h+' 0 '+(h-foot)+' Z';
 for(const depth of [1,-23]){
   const rim=localFace('corner-casting',gap,h,x,mid,z,turn,0,depth);
   rim.style.clipPath='path(evenodd, "M0 0H'+gap+'V'+h+'H0Z '+hole+'")';
   const lip=localFace('gasket',gap,h,x,mid,z,turn,0,depth+.2);
   lip.style.borderRadius=r+'px '+r+'px '+foot+'px '+foot+'px';
 }
 for(const up of (door?[-1]:[-1,1]))for(const side of [-1,1]){
   for(let j=0;j<5;j++){
     const a=(j+.5)*Math.PI/10,u=side*(gap/2-r+r*Math.cos(a));
     const y=mid+up*(h/2-r+r*Math.sin(a));
     const face=localFace('port-return',2*r*Math.sin(Math.PI/20)+.6,24,x,y,z,turn,u,-11);
     face.style.transform+=' rotateZ('+Math.atan2(up*Math.cos(a),-side*Math.sin(a))+'rad) rotateX(90deg)';
   }
 }
}
function segment(a,b,cx,cz,kind='wall',opening=''){
 const [ax,az]=a,[bx,bz]=b,x=(ax+bx)/2,z=(az+bz)/2,w=Math.hypot(bx-ax,bz-az);
 const turn=Math.atan2(-(bz-az),bx-ax);
 const inward=(cx-x)*Math.sin(turn)+(cz-z)*Math.cos(turn)>=0?turn:turn+Math.PI;
 const slab=(u,y,width,height)=>panelVolume(x,z,inward,u,y,width,height,22);
 const at=(u,d=0)=>[x+u*Math.cos(inward)+d*Math.sin(inward),z-u*Math.sin(inward)+d*Math.cos(inward)];
 if(opening){
   const door=opening==='door',gap=door?136:w*.78,top=door?216:196,bottom=door?0:63;
   const jamb=(w-gap)/2;
   for(const sign of [-1,1])slab(sign*(gap+jamb)/2,-135,jamb,270);
   slab(0,-(270+top)/2,gap,270-top);
   if(bottom)slab(0,-bottom/2,gap,bottom);
   portalRim(x,z,inward,gap,top,bottom,door?34:Math.min(49,gap*.22),door);
   if(door){
     const leafWidth=gap/2;
     const leaves=[];
     for(const sign of [-1,1]){
       const centre=sign*gap/4;
       function part(kind,width,height,u,y,depth){
         const node=localFace(kind,width,height,x,y,z,inward,centre+u,depth);
         leaves.push({node,base:node.style.transform,sign});
       }
       // Frame both faces of the moving glass. Keep the viewing area optically clear.
       part('door-glass',leafWidth-10,top-43,0,-top/2,-11);
       for(const depth of [-15,-7]){
         for(const side of [-1,1])part('door-stile',5,top,side*(leafWidth-5)/2,-top/2,depth);
         part('door-shoe',leafWidth,27,0,-13.5,depth);
         part('door-shoe',leafWidth,18,0,-top+9,depth);
       }
     }
     for(const depth of [4,-27]){
       localFace('track',gap+18,12,x,-top-3,z,inward,0,depth);
       localFace('threshold',gap+8,4,x,-2,z,inward,0,depth);
     }
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
const loungeSeats=[];
let renderSeats=null;
function seat(x,z,angle){
 loungeSeats.push({x,z,angle,level:18});
 plane('chair-shadow',100,92,x,-19,z,-angle,Math.PI/2);
}
function fallbackSeats(){
 for(const {x,z,angle,level} of loungeSeats){
   // Closed, tapered elliptical shells keep their volume without a GPU.
   for(const [kind,forward,lateral,rw,rd,lo,hi] of [
     ['flute',0,0,32,30,0,12],['hull',0,0,17,17,12,33],
     ['cushion',0,0,44,36,33,47],['cushion',25,0,44,12,43,93],
     ['leather',0,-40,8,31,40,62],['leather',0,40,8,31,40,62]]){
     const outline=[];
     for(let i=0;i<12;i++){const t=i*Math.PI/6,u=lateral+rw*Math.cos(t),v=forward+rd*Math.sin(t);
       outline.push([x+u*Math.cos(angle)+v*Math.sin(angle),z-u*Math.sin(angle)+v*Math.cos(angle)])}
     const cx=x+lateral*Math.cos(angle)+forward*Math.sin(angle),cz=z-lateral*Math.sin(angle)+forward*Math.cos(angle);
     plate(outline,cx,cz,Math.max(rw,rd),-level-hi,kind);
     for(let i=0;i<12;i++){const [ax,az]=outline[i],[bx,bz]=outline[(i+1)%12];
       plane(kind,Math.hypot(bx-ax,bz-az)+1,hi-lo,(ax+bx)/2,-level-(hi+lo)/2,(az+bz)/2,-Math.atan2(bz-az,bx-ax))}
   }
 }
}
function deckLevel(x,z){
 for(const room of rooms){const d=Math.hypot(x-room.cx,z-room.cz);if(d<260)return Math.min(18,Math.max(0,(260-d)*.21))}
 return 0;
}
function screenButton(parent,label,action){
 const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=action;parent.append(b);return b;
}
function makeConsole(el,title){
 el.classList.add('touch-panel');
 const ui=document.createElement('section');ui.className='screen-ui';ui.setAttribute('aria-label',title);
 for(const event of ['pointerdown','pointermove','pointerup','click'])ui.addEventListener(event,e=>e.stopPropagation());
 el.append(ui);return ui;
}
function openCoursePanel(room){
 const {ui,wx,wz,turn}=room.terminal;
 // Stand within reading distance, facing the same physical panel.
 const distance=150;Object.assign(pos,{x:wx+distance*Math.sin(turn),z:wz+distance*Math.cos(turn),yaw:-turn,pitch:.14});
 keys.clear();room.lesson=0;room.page=0;
 const topics=campusSubjects.find(s=>s[0]===room.topic[1])[2];
 function show(){
   ui.replaceChildren();const [name,copy,exercise]=topics[room.lesson];
   const heading=document.createElement('strong');heading.textContent=name;ui.append(heading);
   const body=document.createElement('p');body.textContent=room.page?exercise:copy;ui.append(body);
   const bar=document.createElement('div');ui.append(bar);
   screenButton(bar,room.page?'Briefing':'Exercise',()=>{room.page=1-room.page;show()});
   screenButton(bar,'Next subject',()=>{room.lesson=(room.lesson+1)%topics.length;room.page=0;show()});
   screenButton(bar,'Finish',()=>{ui.replaceChildren();screenButton(ui,'Study '+room.topic[0],()=>openCoursePanel(room));view.focus()});
 }
 show();draw();
}
function roundedSection(points,i,trim=65){
 const b=points[i],a=points[(i+points.length-1)%points.length],c=points[(i+1)%points.length];
 function towards(p){const dx=p[0]-b[0],dz=p[1]-b[1],f=trim/Math.hypot(dx,dz);return [b[0]+f*dx,b[1]+f*dz]}
 const start=towards(a),end=towards(c),curve=[];
 for(let j=0;j<=6;j++){
   const t=j/6,u=1-t;
   curve.push([u*u*start[0]+2*u*t*b[0]+t*t*end[0],u*u*start[1]+2*u*t*b[1]+t*t*end[1]]);
 }
 return curve;
}
function curvedWall(points,cx,cz){
 for(let i=1;i<points.length;i++){
   const [ax,az]=points[i-1],[bx,bz]=points[i],x=(ax+bx)/2,z=(az+bz)/2;
   let t=Math.atan2(az-bz,bx-ax);
   if((cx-x)*Math.sin(t)+(cz-z)*Math.cos(t)<0)t+=Math.PI;
   const w=Math.hypot(ax-bx,az-bz);
   localFace('flute',w+.7,270,x,-135,z,t,0,0);
   localFace('hull',w+5,270,x,-135,z,t,0,-20,Math.PI);
   walls.push([ax,az,bx,bz]);
 }
}
const skyCamera=document.createElement('div');skyCamera.className='sky-orientation';
const skyLayer=document.createElement('div');skyLayer.className='sky-layer';view.prepend(skyLayer);skyLayer.append(skyCamera);
for(const [name,yaw,pitch] of [['pz',0,0],['px',-90,0],['nz',180,0],['nx',90,0],['py',0,-90],['ny',0,90]]){
 const side=document.createElement('div');side.className='sky-side';
 side.style.backgroundImage="url('assets/forge/"+name+".webp')";
 side.style.transform='rotateY('+yaw+'deg) rotateX('+pitch+'deg) translateZ(-500px)';skyCamera.append(side);
}
const radius=540,hub=polygon(0,0,radius,10,0),edge=2*radius*Math.sin(Math.PI/10);
plate(hub,0,0,radius,0,'floor');plate(hub,0,0,radius,-270,'roof');
// A brass armillary encloses a faceted crystal above a stone instrument plinth.
const instrument={x:-140,z:-30};
function armillary(){
 const {x,z}=instrument,n=10,r=62;
 const top=polygon(x,z,r,n,0);
 plate(top,x,z,r,-29,'instrument-cap');
 for(let j=0;j<n;j++){
   const a=top[j],b=top[(j+1)%n],dx=b[0]-a[0],dz=b[1]-a[1];
   plane('instrument-base',Math.hypot(dx,dz)+1,29,(a[0]+b[0])/2,-14.5,(a[1]+b[1])/2,-Math.atan2(dz,dx));
 }
 plane('axis',8,140,x,-96,z);
 for(const [yaw,tilt,radius] of [[.3,.42,60],[1.8,-.38,56],[0,1.16,63]]){
   plane('astrolabe',radius*2,radius*2,x,-125,z,yaw,tilt);
 }
 const rad=22,rise=38;
 for(let j=0;j<8;j++){
   const a=(j+.5)*Math.PI/4,apothem=rad*Math.cos(Math.PI/8);
   for(const sign of [-1,1]){
     const facet=plane('crystal',2*rad*Math.sin(Math.PI/8),Math.hypot(rise,apothem),
       x+Math.sin(a)*apothem/2,-125+sign*rise/2,z+Math.cos(a)*apothem/2,a,-sign*Math.atan2(apothem,rise));
     facet.style.clipPath=sign<0?'polygon(50% 0,100% 100%,0 100%)':'polygon(0 0,100% 0,50% 100%)';
     facet.style.backgroundColor='hsl('+ (172+j*2)+' 57% '+(47+18*Math.cos(a-.4))+'%)';
   }
 }
}
armillary();
for(let i=0;i<10;i++){
 const a=hub[i],b=hub[(i+1)%10],heading=i*Math.PI/5;
 if(i%2){segment(a,b,0,0,'wall','window');continue}
 const topic=subjects[i/2],rr=edge/(2*Math.sin(Math.PI/8)),distance=radius*Math.cos(Math.PI/10)+rr*Math.cos(Math.PI/8);
 const cx=distance*Math.sin(heading),cz=-distance*Math.cos(heading),poly=polygon(cx,cz,rr,8,heading+Math.PI);
 const room={topic,cx,cz,heading,poly};rooms.push(room);
 const corners=poly.map((v,j)=>j<2?[v]:roundedSection(poly,j));
 const outline=corners.flat();plate(outline,cx,cz,rr,0,'floor');plate(outline,cx,cz,rr,-270,'roof');
 corners.slice(2).forEach(c=>curvedWall(c,cx,cz));
 for(const [r,h] of [[260,5],[238,10],[215,14],[190,18]]){
   const tread=plane('dais',r*2,r*2,cx,-h,cz,0,Math.PI/2);
   tread.style.borderRadius='50%';
 }
 const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
 for(const end of [a,b]){
  const jamb=[mx+(end[0]-mx)*.63,mz+(end[1]-mz)*.63];
  segment(end,jamb,0,0);segment(jamb,end,cx,cz);
 }
 portalRim(mx,mz,-heading,edge*.63,270,0,60,true);
 plane('sign',edge*.68,30,mx*.998,-240,mz*.998,-heading).textContent=topic[0];
 for(let j=1;j<8;j++){
  const lock=i===0&&j===4;
  const wall=segment(corners[j].at(-1),corners[(j+1)%8][0],cx,cz,'wall',lock?'door':[2,6].includes(j)?'window':'');
  if(j===(i===0?3:4)){
   const dx=Math.sin(wall.turn),dz=Math.cos(wall.turn);
   const surface=plane('art',edge*.57,133,wall.x+4*dx,-147,wall.z+4*dz,wall.turn);
   surface.style.backgroundImage='url(assets/exhibits/'+topic[2]+'.webp)';
   const ui=makeConsole(surface,topic[0]+' teaching screen');room.terminal={ui,wx:wall.x+4*dx,wz:wall.z+4*dz,turn:wall.turn};screenButton(ui,'Study '+topic[0],()=>openCoursePanel(room));
   plane('sign',edge*.57,26,wall.x+5*dx,-45,wall.z+5*dz,wall.turn).textContent=topic[0];
  }
 }
 if(i===2||i===8){
   const sn=Math.sin(heading),cs=Math.cos(heading),distance=-75;
   room.projection={x:cx+sn*distance,z:cz-cs*distance};
   const g=room.projection;
   for(const side of [-1,1]){
     localFace('holo-emitter',12,23,g.x,-30,g.z,-heading,side*72,0);
   }
   const membrane=plane('holo-field',145,125,g.x,-98,g.z,-heading);
   room.drill=makeConsole(membrane,'Interactive simulation');screenButton(room.drill,'Start simulation',()=>startDrill(room));
   plane('holo-marker',130,24,g.x,-169,g.z,-heading).textContent=i===2?'Scout simulation':'Fleet simulation';
 }
 if(i===0)observationDeck(room,rr);
 for(const offset of [-105,105])seat(cx+offset*Math.cos(heading),cz+offset*Math.sin(heading),-heading);
 const button=document.createElement('button');button.textContent=topic[0];
 button.onclick=()=>{Object.assign(pos,{x:cx-Math.sin(heading)*115,z:cz+Math.cos(heading)*115,yaw:heading,pitch:0});menu.close();draw();view.focus()};
 document.querySelector('#dest').append(button);
}
function draw(){
 const f=Math.max(240,Math.min(innerHeight*.82,innerWidth*.82));view.style.perspective=f+'px';skyLayer.style.perspective=f+'px';
 camera.style.transform='translateZ('+f+'px) rotateX('+pos.pitch+'rad) rotateY('+pos.yaw+'rad)';
 world.style.transform='translate3d('+(-pos.x)+'px,'+(eye+deckLevel(pos.x,pos.z))+'px,'+(-pos.z)+'px)';
 skyCamera.style.transform='translateZ('+f+'px) rotateX('+pos.pitch+'rad) rotateY('+pos.yaw+'rad)';
 renderSeats?.(f);checkProjection();
 active=rooms.find(r=>Math.hypot(pos.x-r.cx,pos.z-r.cz)<410);
 document.querySelector('#location').textContent=onDeck()?'Observation deck':active?active.topic[0]:'Academy rotunda';
 learn.hidden=!active||onDeck();
}
function checkProjection(){
 const r=rooms.find(room=>room.projection&&Math.hypot(pos.x-room.projection.x,pos.z-room.projection.z)<65);
 if(r===projectionRoom)return;
 projectionRoom=r;
 if(r)startDrill(r);
}
function startDrill(r){
 const prompt=r.drill;prompt.replaceChildren();
 const title=document.createElement('strong'),line=document.createElement('p'),options=document.createElement('div');prompt.append(title,line,options);
 const scout=r.topic[0]==='Exploration lab';
 title.textContent=scout?'Scout simulation':'Fleet simulation';
 line.textContent=scout?'You have crossed an unmapped wormhole. Which bookmark gives your fleet a way home?':'A fleetmate broadcasts for shield repairs. Which pilot should respond?';
 
 const labels=scout?['The return connection','The nearest planet']:['A tackle frigate','A logistics pilot'];
 labels.forEach((label,i)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{
   const correct=i===(scout?0:1);line.textContent=correct?(scout?'Route secured. Bookmark the far side before leaving grid.':'Repairs assigned. Check broadcast, target lock and range.'):'Try the other option.';if(correct){options.replaceChildren();screenButton(options,'Replay',()=>startDrill(r))}
 };options.append(b)});

}
function onDeck(){return terrace && (pos.x-terrace.x)*Math.sin(terrace.heading)-(pos.z-terrace.z)*Math.cos(terrace.heading)>-200}
function clear(x,z){
 if(loungeSeats.some(s=>Math.hypot(x-s.x,z-s.z)<52))return false;
 if(Math.hypot(x-instrument.x,z-instrument.z)<79)return false;
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
function advance(dt){
 const forward=Number(keys.has('w')||keys.has('ArrowUp'))-Number(keys.has('s')||keys.has('ArrowDown')),side=Number(keys.has('d'))-Number(keys.has('a'));
 pos.yaw+=(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*dt*1.7;
 const step=(keys.has('Shift')?410:225)*dt/Math.max(1,Math.hypot(forward,side));
 const x=pos.x+step*(Math.sin(pos.yaw)*forward+Math.cos(pos.yaw)*side),z=pos.z+step*(-Math.cos(pos.yaw)*forward+Math.sin(pos.yaw)*side);
 if(clear(x,pos.z))pos.x=x;if(clear(pos.x,z))pos.z=z;return moveHatch(dt);
}
function consume(now){
 let elapsed=Math.min(.65,Math.max(0,(now-last)/1000));last=now;let sliding=false;
 while(elapsed>.00001){const step=Math.min(elapsed,1/60);sliding=advance(step);elapsed-=step}
 draw();return sliding;
}
function tick(now){pending=0;const sliding=consume(now);if(keys.size||sliding)pending=requestAnimationFrame(tick)}
function hold(k){keys.add(k);if(!pending){last=performance.now();pending=requestAnimationFrame(tick)}}
function lesson(){if(active&&!onDeck())openCoursePanel(active)}
learn.onclick=lesson;document.querySelector('#directory').onclick=()=>{keys.clear();menu.showModal()};
document.querySelector('#close').onclick=()=>menu.close();
document.addEventListener('keydown',e=>{if(menu.open||e.ctrlKey||e.metaKey||e.altKey)return;
 const k=e.key.length===1?e.key.toLowerCase():e.key;
 if(k==='e'){lesson();return}
 if(['w','a','s','d','Shift','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(k)){e.preventDefault();hold(k)}
});
document.addEventListener('keyup',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(keys.has(key)){consume(performance.now());keys.delete(key)}});
window.addEventListener('blur',()=>keys.clear());
for(const b of document.querySelectorAll('[data-key]')){
 b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);hold(b.dataset.key)};
 b.onlostpointercapture=()=>keys.delete(b.dataset.key);
}
let drag=null;view.onpointerdown=e=>{drag=[e.clientX,e.clientY];view.setPointerCapture(e.pointerId);view.focus()};
view.onpointermove=e=>{if(!drag)return;pos.yaw+=(e.clientX-drag[0])*.004;pos.pitch=Math.max(-.65,Math.min(.65,pos.pitch-(e.clientY-drag[1])*.003));drag=[e.clientX,e.clientY];draw()};
view.onlostpointercapture=()=>drag=null;window.addEventListener('resize',draw);
const deckButton=document.createElement('button');deckButton.textContent='Observation deck';
deckButton.onclick=()=>{pos.x=terrace.x+54;pos.z=terrace.z-147;pos.yaw=Math.PI+.16;pos.pitch=.035;pos.pitch=0;menu.close();draw();view.focus()};
document.querySelector('#dest').append(deckButton);draw();
