// Static hulls and furniture share vertex buffers. HTML remains responsible for
// the readable, accessible instruments; their controls keep their original IDs.
(() => {
 function sceneCanvas(){const c=document.createElement('canvas');c.id='ship-scene';c.setAttribute('aria-hidden','true');return c}
 let canvas=sceneCanvas(),gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance',depth:true});
 // A CPU-backed WebGL driver competes with layout on the main thread. Use the
 // dedicated raster worker there while retaining native WebGL on real GPUs.
 const info=gl?.getExtension('WEBGL_debug_renderer_info');
 if(info&&/swiftshader|llvmpipe|software rasterizer/i.test(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))&&canvas.transferControlToOffscreen&&typeof Worker!=='undefined'){
   gl.getExtension('WEBGL_lose_context')?.loseContext();gl=null;canvas=sceneCanvas();
 }
 const nativeSelector='.bay-display,.screen,.switches,.helm-display,.console-keys,.wall-pad,.plaque,.course-display,.holo-display,.seat-control,.chair-keypad';
 const all=Array.from(world.querySelectorAll('.surface'));
 const matrixFor=el=>{
   const m=new DOMMatrix(el.style.transform);
   return el.parentElement.classList.contains('helm-assembly')?new DOMMatrix(el.parentElement.style.transform).multiply(m):m;
 };
 // Bake broad pools from the ship's actual luminaires into a single lighting map.
 const lightMap=document.createElement('canvas');
 lightMap.width=lightMap.height=1024;
 const lightInk=lightMap.getContext('2d');
 lightInk.fillStyle='black';lightInk.fillRect(0,0,1024,1024);
 lightInk.globalCompositeOperation='lighter';
 function lightPool(x,z,radius,strength,warm){
   lightInk.save();
   lightInk.translate((x+2400)*1024/4800,(z+3000)*1024/22000);
   lightInk.scale(radius*1024/4800,radius*1024/22000);
   const ramp=lightInk.createRadialGradient(0,0,0,0,0,1);
   const rgb=warm?'235,153,85':'84,184,240';
   ramp.addColorStop(0,'rgba('+rgb+','+strength+')');
   ramp.addColorStop(.4,'rgba('+rgb+','+(strength*.45)+')');
   ramp.addColorStop(1,'rgba('+rgb+',0)');
   lightInk.fillStyle=ramp;lightInk.fillRect(-1,-1,2,2);lightInk.restore();
 }
 for(const el of all.filter(el=>el.matches('.lamp,.glass-light,.lab-wash,.promenade-light'))){
   const m=matrixFor(el);
   lightPool(m.m41,m.m43,320,.48,el.matches('.lamp'));
 }
 for(const cabinet of cabinetFootprints){
   lightPool(cabinet.wx+cabinet.nx*135,cabinet.wz+cabinet.nz*135,360,.7,false);
 }
 function room(x,z){return z<1230?'bridge':Math.abs(x)<285?'passage':(x<0?'left':'right')+(z<3630?'lab':'aft');}
 const live=all.filter(e=>e.matches(nativeSelector)).map(el=>{const m=matrixFor(el);return {el,radius:Math.hypot(parseFloat(el.style.width),parseFloat(el.style.height))*.52,room:room(m.m41,m.m43)};});
 
 const partitions=all.filter(el=>el.matches('.hull-panel,.hull-back')).map(el=>({inv:matrixFor(el).inverse(),w:parseFloat(el.style.width)/2,h:parseFloat(el.style.height)/2}));
 const nativeCentres=live.map(({el})=>{const m=matrixFor(el);return [m.m41,m.m42,m.m43]});
 // Project nearby opaque geometry into each native display's own coordinate system.
 // A luminance mask removes exactly the covered pieces without rasterising its text.
 const blockers=[];
 function addBlocker(points,owner,convex=false,leaf){
   const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
   for(const p of points)for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],p[j]);hi[j]=Math.max(hi[j],p[j])}
   const c=lo.map((v,j)=>(v+hi[j])/2);
   blockers.push({points,owner,convex,c,leaf,r:Math.hypot(...hi.map((v,j)=>v-c[j]))});
 }
 for(const p of webOccluders)addBlocker(p.points,null,false,p.leaf);
 for(const p of formedPanels)if(p.leaf!==undefined&&p.finish==='pearl'&&p.mask!==false){
   // One face per leaf segment masks the UI while leaving each window open.
   const d=hatches[p.leaf>>1],pt=p.points[0];if((pt[2]-d.z)*d.ux-(pt[0]-d.x)*d.uz>0)addBlocker(p.points,null,false,p.leaf);
 }
 for(const points of upholsteredSilhouettes)addBlocker(points,null,true);
 for(const el of all.filter(e=>e.matches('.seat-flank,.seat-band,.bay-display,.screen,.helm-display,.switches,.wall-pad,.console-case,.case-back,.plaque'))){
   const m=matrixFor(el),w=parseFloat(el.style.width),h=parseFloat(el.style.height);
   const outline=el.matches('.seat-flank')?[...el.style.clipPath.matchAll(/([\d.]+)% ([\d.]+)%/g)].map(q=>[+q[1]/100,+q[2]/100]):[[0,0],[1,0],[1,1],[0,1]];
   addBlocker(outline.map(([u,v])=>{const p=m.transformPoint(new DOMPoint((u-.5)*w,(v-.5)*h));return [p.x,p.y,p.z]}),el);
 }
 // Bucket static occluders by station section. Only the small neighbourhood
 // around the pilot can cover a live display; never scan the whole ship.
 const blockerBins=new Map(),largeBlockers=[];
 for(const b of blockers){
   if(b.r>850){largeBlockers.push(b);continue}
   const section=Math.floor(b.c[2]/850);
   if(!blockerBins.has(section))blockerBins.set(section,[]);
   blockerBins.get(section).push(b);
 }
 function convexHull(points){
   const sorted=points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
   function half(list){const out=[];for(const p of list){while(out.length>1){const a=out.at(-2),b=out.at(-1);if((b[0]-a[0])*(p[1]-a[1])>(b[1]-a[1])*(p[0]-a[0]))break;out.pop()}out.push(p)}return out.slice(0,-1)}
   return half(sorted).concat(half(sorted.reverse()));
 }
 function clipSide(poly,axis,bound,sign){
   const out=[];let a=poly.at(-1);
   for(const b of poly){const da=(a[axis]-bound)*sign,db=(b[axis]-bound)*sign;
     if((da>=0)!==(db>=0)){const t=da/(da-db);out.push(a.map((v,j)=>v+t*(b[j]-v)))}
     if(db>=0)out.push(b);a=b;
   }return out;
 }
 const masks=new WeakMap(),displayGeometry=new WeakMap();
 for(const {el} of live){
   const m=matrixFor(el);
   displayGeometry.set(el,{m,inv:m.inverse(),w:parseFloat(el.style.width),h:parseFloat(el.style.height),transform:el.style.transform});
 }
 window.displayPointHidden=(el,u,v)=>(masks.get(el)||[]).some(poly=>{
   let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
     const a=poly[i],b=poly[j];if((a[1]>v)!==(b[1]>v)&&u<(b[0]-a[0])*(v-a[1])/(b[1]-a[1])+a[0])inside=!inside;
   }return inside;
 });
 function depthMask(el,eye,nearby){
   const geometry=displayGeometry.get(el);
   if(geometry.transform!==el.style.transform){
     geometry.m=matrixFor(el);geometry.inv=geometry.m.inverse();geometry.transform=el.style.transform;
   }
   const {m,inv,w,h}=geometry;
   const dx=m.m41-eye[0],dy=m.m42-eye[1],dz=m.m43-eye[2],length=Math.hypot(dx,dy,dz),radius=Math.hypot(w,h)/2;
   if(length<1)return;
   const localEye=inv.transformPoint(new DOMPoint(...eye)),ez=localEye.z;
   const polygons=[];
   if(Math.abs(ez)>1)for(const b of nearby){
     if(b.owner===el||Math.abs(b.c[2]-eye[2])>Math.abs(dz)+radius+b.r||Math.abs(b.c[0]-eye[0])>Math.abs(dx)+radius+b.r)continue;
     const vx=b.c[0]-eye[0],vy=b.c[1]-eye[1],vz=b.c[2]-eye[2],along=(vx*dx+vy*dy+vz*dz)/length;
     if(along < -b.r || along>length+radius+b.r || vx*vx+vy*vy+vz*vz-along*along>(b.r+radius*Math.min(1,(Math.max(0,along)+b.r)/length))**2)continue;
     let points=b.points.map(([x,y,z])=>[inv.m11*x+inv.m21*y+inv.m31*z+inv.m41,inv.m12*x+inv.m22*y+inv.m32*z+inv.m42,(inv.m13*x+inv.m23*y+inv.m33*z+inv.m43)/ez]);
     if(b.convex)points=points.filter(p=>p[2]>.0003&&p[2]<.999);
     else{points=clipSide(points,2,.0003,1);if(points.length)points=clipSide(points,2,.999,-1)}
     if(points.length<3)continue;
     let poly=points.map(([x,y,t])=>[(x-t*localEye.x)/(1-t)+w/2,(y-t*localEye.y)/(1-t)+h/2]);
     if(b.convex)poly=convexHull(poly);
     for(const [axis,bound,sign] of [[0,0,1],[0,w,-1],[1,0,1],[1,h,-1]]){if(poly.length<3)break;poly=clipSide(poly,axis,bound,sign)}
     if(poly.length>=3)polygons.push(poly);
   }
   masks.set(el,polygons);
   if(!polygons.length){if(el.dataset.depthMask){el.style.maskImage='';delete el.dataset.depthMask}return}
   const path=polygons.map(p=>'<polygon points="'+p.map(pt=>pt.map(v=>v.toFixed(1)).join(',')).join(' ')+'"/>').join('');
   const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><rect width="100%" height="100%" fill="white"/>'+path+'</svg>';
   el.style.maskMode='luminance';el.style.maskSize='100% 100%';el.style.maskImage='url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';el.dataset.depthMask='1';
 }

 let nextSight=0;
 let sightY=Infinity,sightYaw=Infinity,sightPitch=Infinity;
 let sightX=Infinity,sightZ=Infinity,sightDoors=-1;
 function showRoom(ex,ez,ey,yaw,pitch){
   const now=performance.now();
   if(now<nextSight)return;
   nextSight=now+32;
   const openness=hatches.reduce((v,d)=>v+Math.round(d.openness*8),0);
   if(openness===sightDoors&&Math.abs(ex-sightX)+Math.abs(ez-sightZ)<4&&ey===sightY&&Math.abs(yaw-sightYaw)+Math.abs(pitch-sightPitch)<.025)return;
   sightYaw=yaw;sightPitch=pitch;const sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);
   const lens=Math.min(innerWidth*.59,innerHeight*.96),wide=innerWidth/(2*lens),tall=innerHeight/(2*lens);
   const moved=ex!==sightX||ez!==sightZ||ey!==sightY||openness!==sightDoors;
   sightY=ey;
   const local=largeBlockers.slice();
   for(let section=Math.floor((ez-3350)/850);section<=Math.floor((ez+3350)/850);section++){
     const bin=blockerBins.get(section);if(bin)local.push(...bin);
   }
   const nearby=local.filter(b=>Math.abs(b.c[0]-ex)<2500+b.r&&Math.abs(b.c[2]-ez)<2500+b.r).map(b=>{
     if(b.leaf===undefined)return b;
     const [dx,dz]=leafShift(b.leaf);if(!dx&&!dz)return b;
     const shifted=([x,y,z])=>[x+dx,y,z+dz];return {...b,c:shifted(b.c),points:b.points.map(shifted)};
   });
   sightDoors=openness;
   sightX=ex;sightZ=ez;
   live.forEach(({el},i)=>{
     const [xx,yy,zz]=nativeCentres[i],dx=xx-ex,dy=yy,dz=zz-ez;
     const forward=sy*dx-cy*dz,depth=cp*forward+sp*(dy-ey),margin=live[i].radius;
     const offscreen=depth < -margin||Math.abs(cy*dx+sy*dz)>Math.max(depth,0)*wide+margin*(1+wide)||Math.abs(cp*(dy-ey)-sp*forward)>Math.max(depth,0)*tall+margin*(1+tall);
     const blocked=offscreen||Math.abs(dx)>2200||Math.abs(dz)>2200||partitions.some(({inv:m,w,h})=>{
       const oz=ex*m.m13+ez*m.m33+m.m43,vz=dx*m.m13+dy*m.m23+dz*m.m33;
       if(Math.abs(vz)<.001)return false;const t=-oz/vz;if(t<=0||t>=.992)return false;
       const px=ex+dx*t,py=dy*t,pz=ez+dz*t;
       return Math.abs(px*m.m11+py*m.m21+pz*m.m31+m.m41)<w&&Math.abs(px*m.m12+py*m.m22+pz*m.m32+m.m42)<h;
     });
     const revealed=el.classList.contains('away');
     el.classList.toggle('away',blocked);
     if(!blocked&&(moved||revealed))depthMask(el,[ex,ey,ez],nearby);
   });

 }
 function selectRanges(ranges,ex,ey,ez,yaw,pitch,lens){
   const sy=Math.sin(yaw),cy=Math.cos(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),tanX=innerWidth/(2*lens),tanY=innerHeight/(2*lens);
   return ranges.filter(r=>{
     if(r.zone==='exterior')return true;
     if(r.leaf!==undefined){
       const door=hatches[r.leaf>>1];
       const distant=(door.x-ex)**2+(door.z-ez)**2>1500**2;
       if(r.distant!==distant)return false;
     }
     if(r.zone.startsWith('avatar')&&ez<passageEnd)return false;
     const [x,y,z]=r.c,dx=x-ex,dz=z-ez;
     // A ray from inside the passage to side-room geometry must pass its doorway.
     if(Math.abs(ex)<240&&ez>1250&&ez<passageEnd&&r.lo[2]>1400&&(r.lo[0]>260||r.hi[0]<-260)){
       const near=nearestRoom(z);
       if(r.lo[2]>near.z-near.depth/2&&r.hi[2]<near.z+near.depth/2){
         const wall=Math.sign(x)*245;
         const f1=(wall-ex)/(r.lo[0]-ex),f2=(wall-ex)/(r.hi[0]-ex);
         const z1=(r.lo[2]-ez)*f1,z2=(r.hi[2]-ez)*f1,z3=(r.lo[2]-ez)*f2,z4=(r.hi[2]-ez)*f2;
         if(ez+Math.max(z1,z2,z3,z4)<near.z-210||ez+Math.min(z1,z2,z3,z4)>near.z+210)return false;
       }
     }
     const fw=sy*dx-cy*dz,side=cy*dx+sy*dz;
     for(const yy of [y,832-y]){
       const depth=fw*cp+(yy-ey)*sp;
       if(depth>=-r.r&&Math.abs(side)<depth*tanX+r.r*Math.hypot(1,tanX)&&Math.abs((yy-ey)*cp-fw*sp)<depth*tanY+r.r*Math.hypot(1,tanY))return true;
     }return false;
   }).map(r=>{r.distance=(r.c[0]-ex)**2+(r.c[2]-ez)**2;return r})
     .sort((a,b)=>(a.zone==='exterior')-(b.zone==='exterior')||a.distance-b.distance);
 }

 if(!gl){
   // One small raster surface replaces thousands of composited CSS planes on
   // browsers where WebGL is disabled. Keep the six real sky faces behind it.
   world.querySelector('.forge-sky')?.remove();
   view.prepend(canvas);
   const materials={
     white:'#adbdc1',metal:'#6a7d86',hull:'#536571',dark:'#32434e',gold:'#d4a467',
     floor:'#637a86',ceiling:'#768993',pad:'#7e939b',linen:'#bcc3b8',warm:'#957d68',
     cyan:'#bff5ff',lamp:'#ffddaa',glass:'#89cfe1',screen:'#1b3d49'
   };
   const items=[];
   const native=new Set(live.map(e=>e.el));
   function color(el){
     if(el.matches('.lamp,.passage-light'))return 'lamp';
     if(el.matches('.glass-light,.lab-wash,.promenade-light,.crown-light,.lab-ring,.residential-ring,.holo-ring,.holo-base'))return 'cyan';
     if(el.matches('.strip,.guide-light,.pod-chair.shoulder-shell'))return 'gold';
     if(el.matches('.extension-floor,.deck'))return 'floor';
     if(el.matches('.extension-ceiling,.overhead'))return 'ceiling';
     if(el.matches('.cabin-zone.armour-face,.command-chair.flight-pad,.lab-chair.flight-pad,.canopy-shell,.canopy-spar'))return 'white';
     if(el.matches('.lounge-zone.armour-face'))return 'warm';
     if(el.matches('.berth-pad,.berth-pillow,.lounge-pad'))return 'linen';
     if(el.matches('.viewport'))return 'glass';
     if(el.matches('.flight-pad,.head-pad'))return 'pad';
     if(el.matches('.chair-shell,.case-back,.hull-back,.service-pipe,.console-case'))return 'dark';
     return el.matches('.armour-face,.hull-panel')?'hull':'metal';
   }
   const rect=[[0,0],[1,0],[1,1],[0,1]];
   for(const el of all){
     if(el.matches('.sky-face,.seat-pick,.holo-display,.floor-spill'))continue;
     const m=matrixFor(el),w=parseFloat(el.style.width),h=parseFloat(el.style.height);
     const isUI=native.has(el),kind=isUI?'screen':color(el);
     const a=el.matches('.armour-face')?'armour':el.matches('.crest-glass')?'crest':el.matches('.orbital')?'orbital':el.matches('.drifting')?'drifting':null;
     let poly=rect;
     if(el.classList.contains('seat-flank'))poly=[...el.style.clipPath.matchAll(/([\d.]+)% ([\d.]+)%/g)].map(q=>[+q[1]/100,+q[2]/100]);
     const isRing=el.matches('.residential-ring,.lab-ring,.holo-base,.holo-ring');
     if(isRing)poly=Array.from({length:24},(_,i)=>[.5+.47*Math.cos(i*Math.PI/12),.5+.47*Math.sin(i*Math.PI/12)]);
     const pts=poly.map(([u,v])=>m.transformPoint(new DOMPoint((u-.5)*w,(v-.5)*h)));
     const hex=materials[kind],lit=['lamp','gold','cyan','glass'].includes(kind)?1:.75+.22*Math.abs(m.m31*.54-m.m32*.8+m.m33*.25);
     const rgb=[1,3,5].map(i=>Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*lit)));
     const obj={pts,kind,a,ring:isRing,ui:isUI,cx:m.m41,cy:m.m42,cz:m.m43,nx:m.m31,ny:m.m32,nz:m.m33,
       size:Math.hypot(w,h)/2,zone:a&&a!=='armour'?'exterior':room(m.m41,m.m43),two:el.matches('.seat-band,.reveal'),fill:'rgb('+rgb.join(',')+')'};
     obj.poly=poly;items.push(obj);

     if(!isUI)el.remove();
   }
   for(const panel of formedPanels){
     const pts=panel.points.map(([x,y,z])=>({x,y,z}));
     const cx=pts.reduce((v,p)=>v+p.x,0)/4,cy=pts.reduce((v,p)=>v+p.y,0)/4,cz=pts.reduce((v,p)=>v+p.z,0)/4;
     const fill=panel.darkLeaf&&panel.finish==='pearl'?'#34414a':{glass:'#73929e',hazardYellow:'#e4b333',hazardBlack:'#23272a',oxblood:'#923c36',pearl:'#a6b7bb',alloy:'#73858e',gasket:'#263642',glasslight:'#c8f4fb',upholstery:'#c4b9a5',sienna:'#b47148',bronze:'#79766c',smoked:'#40525a',warmline:'#edc78a',titanGold:'#be9d61',titanBronze:'#8b713e',titanIron:'#62594a',titanDark:'#302f30'}[panel.finish];
     const textured=panel.skin;
     items.push({pts,a:panel.plating?'plating':textured?'avatar':null,poly:panel.plating||(textured?panel.points.map(avatarUV):null),avatar:panel.avatar,distant:!!panel.distant,leaf:panel.leaf,kind:panel.finish,fill,cx,cy,cz,nx:0,ny:0,nz:0,size:Math.max(...pts.map(p=>Math.hypot(p.x-cx,p.y-cy,p.z-cz))),two:true,zone:room(cx,cz)});
   }
   const packed=[],doorVertices=[],bins=new Map(),chunks=[];
   for(const item of items){
     const key=(item.kind==='glass'?'glass/':'')+(item.leaf!==undefined?'door/'+item.leaf+'/'+item.distant+'/':item.avatar?'avatar/':'')+Math.floor(item.cx/(item.avatar?110000:500))+'/'+Math.floor(item.cz/(item.avatar?110000:700));
     if(!bins.has(key))bins.set(key,[]);bins.get(key).push(item);
   }
   const kindOf={armour:6,crest:7,orbital:8,drifting:9,avatar:11,plating:12};
   for(const group of bins.values()){
    const start=packed.length/17,lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
    for(const item of group){
     if(item.ring||(item.kind==='glass'&&item.leaf===undefined))continue;
     const pts=item.pts,uv=item.poly||rect;
     const pad=item.leaf===undefined?0:202;
     for(const p of pts)for(const [j,v] of [p.x,p.y,p.z].entries()){lo[j]=Math.min(lo[j],v-pad);hi[j]=Math.max(hi[j],v+pad)}
     const sides=pts.length===4&&pts[2].x===pts[3].x&&pts[2].y===pts[3].y&&pts[2].z===pts[3].z?[0,1,2]:indices(uv);
     const ns=item.fill.match(/\d+/g);
     const col=item.fill[0]==='#'?parseInt(item.fill.slice(1),16):null;
     const rgb=col===null?ns.map(Number):[col>>16,(col>>8)&255,col&255];
     const word=(255<<24)|(rgb[2]<<16)|(rgb[1]<<8)|rgb[0];
     for(let i=0;i<sides.length;i+=3){
       for(const n of sides.slice(i,i+3)){
         const p=pts[n];if(item.leaf!==undefined)doorVertices.push([item.leaf,packed.length,p.x,p.z]);packed.push(p.x,p.y,p.z,item.kind==='floor'?p.x/360:uv[n][0],item.kind==='floor'?p.z/360:uv[n][1]);
       }
       packed.push(word,item.kind==='glass'?2:item.kind==='floor'?1:(kindOf[item.a]||0));
     }
   }
    const count=packed.length/17-start;if(count){
      const c=lo.map((v,i)=>(v+hi[i])/2);chunks.push({lo,hi,c,r:Math.hypot(...hi.map((v,i)=>v-c[i])),start,count:group[0].kind==='glass'?-count:count,leaf:group[0].leaf,distant:group[0].distant,zone:group[0].avatar?'avatar':'scene'});
    }
   }
   const scene=new Float32Array(packed),words=new Int32Array(scene.buffer);
   for(let i=0;i<packed.length;i+=17){words[i+15]=packed[i+15];words[i+16]=packed[i+16];}
   const urls=['px','nx','py','ny','pz','nz'].map(k=>new URL('assets/forge/'+k+'.webp',document.baseURI).href);
   for(const path of ['assets/pearl-bulkhead.svg','archive/assets/expanse-ring-wordmark.webp','archive/assets/fortizar-cutout.webp','archive/assets/naglfar-cutout.webp','assets/satin-panel.webp','assets/avatar-armour.webp','assets/lower-armour.webp'])urls.push(new URL(path,document.baseURI).href);
   const worker=new Worker('assets/renderer/worker.js?v=satin-panel-3'),offscreen=canvas.transferControlToOffscreen();
   let ready=false,pending=false;
   worker.onmessage=({data})=>{
     if(data==='ready'){
       const img=new Image();img.onload=()=>{const bitmap=document.createElement('canvas');bitmap.width=bitmap.height=1024;
         const ink=bitmap.getContext('2d');ink.drawImage(img,0,0,1024,1024);const bytes=ink.getImageData(0,0,1024,1024).data.buffer;
         const lights=lightInk.getImageData(0,0,1024,1024).data.buffer;
         worker.postMessage({type:'material',bytes,lights},[bytes,lights]);ready=true;};img.src=urls[6];
     }
     if(data==='frame'||data==='idle'){pending=false;if(data==='frame')window.presentedShipFrames=(window.presentedShipFrames||0)+1;}
     if(data?.error)console.error(data.error);
   };
   worker.postMessage({type:'init',canvas:offscreen,scene:scene.buffer,doorVertices,urls},[offscreen,scene.buffer]);
   window.renderShip=(now,x,y,z,yaw,pitch,lens)=>{
     showRoom(x,z,y,yaw,pitch);if(!ready||pending)return;pending=true;
     const batches=selectRanges(chunks,x,y,z,yaw,pitch,lens).flatMap(c=>[c.start,c.count]);
     worker.postMessage({batches,w:innerWidth,h:innerHeight,x,y,z,yaw,pitch,lens,now,shifts:hatches.flatMap((_,i)=>[leafShift(i*2),leafShift(i*2+1)])});
   };
   return;
 }
 const materialDefs={
   hull:['#546372','hull'],armour:['#a0aeb6','hull'],wall:['#405360','metal'],back:['#354650','metal'],
   floor:['#84949d','floor'],ceiling:['#798791','floor'],edge:['#6b7983','strips'],window:['#99d9f2','glass'],
   lamp:['#ffe2b6','emissive'],cyan:['#bdeefe','emissive'],orange:['#e5a563','emissive'],
   shell:['#8b999e','metal'],white:['#d3dadd','metal'],dark:['#384954','metal'],pad:['#6a7c84','pad'],
   ivory:['#e4e8df','pad'],copper:['#d4995c','metal'],screen:['#367387','display'],
   warm:['#ae967b','metal'],linen:['#bcb7a9','pad'],crest:['#ffffff','image'],orbital:['#ffffff','image'],
   drifting:['#ffffff','image'],ring:['#75d5ec','ring'],sky:['#ffffff','sky'],titanGold:['#be9d61','metal'],titanBronze:['#8b713e','metal'],titanIron:['#62594a','metal'],titanDark:['#302f30','metal'],hazardYellow:['#e4b333','metal'],hazardBlack:['#23272a','metal'],oxblood:['#923c36','metal']
 };
 const names=Object.keys(materialDefs),tile=512,atlas=document.createElement('canvas');atlas.width=4096;atlas.height=2**Math.ceil(Math.log2(Math.ceil(names.length/8)*tile));
 const ctx=atlas.getContext('2d');
 function tileOrigin(name){const i=names.indexOf(name);return [(i%8)*tile,Math.floor(i/8)*tile];}
 for(const [name,[color,pattern]] of Object.entries(materialDefs)){
   const [x,y]=tileOrigin(name);ctx.save();ctx.translate(x,y);ctx.scale(tile/256,tile/256);ctx.beginPath();ctx.rect(0,0,256,256);ctx.clip();
   if(pattern!=='image' && pattern!=='ring'){
     ctx.fillStyle=color;ctx.fillRect(0,0,tile,tile);
     const shine=ctx.createLinearGradient(0,0,256,256);
     shine.addColorStop(0,'rgba(235,250,255,.13)');shine.addColorStop(.55,'rgba(0,0,0,.02)');shine.addColorStop(1,'rgba(0,12,25,.24)');
     ctx.fillStyle=shine;ctx.fillRect(0,0,tile,tile);
   }
   if(['metal','floor','hull'].includes(pattern)){
     ctx.strokeStyle='#283a47';ctx.lineWidth=4;ctx.strokeRect(2,2,252,252);ctx.strokeStyle='#9facb066';ctx.lineWidth=2;ctx.strokeRect(6,6,244,244);
     if(pattern==='floor'){ctx.beginPath();ctx.moveTo(0,218);ctx.lineTo(68,218);ctx.lineTo(85,235);ctx.lineTo(256,235);ctx.stroke();}
   }
   if(pattern==='strips'||pattern==='pad'){ctx.fillStyle='#1a27343d';for(let y=0;y<256;y+=pattern==='pad'?43:27)ctx.fillRect(0,y,256,3);}
   if(pattern==='display'){ctx.fillStyle='#93e6f7';for(let y=32;y<220;y+=27)ctx.fillRect(18,y,150-y%30,3);}
   if(pattern==='ring'){ctx.strokeStyle=color;ctx.lineWidth=6;for(const r of [69,111,118]){ctx.beginPath();ctx.arc(128,128,r,0,Math.PI*2);ctx.stroke();}}
   ctx.restore();
 }
 function material(el){
   const c=el.classList;
   if(c.contains('seat-pick'))return null;
   if(c.contains('armour-face'))return 'armour';
   if(c.contains('sky-face'))return 'sky';
   if(c.contains('viewport'))return 'window';
   if(c.contains('floor-spill'))return null;
   if(c.contains('deck')||c.contains('extension-floor'))return 'floor';
   if(c.contains('overhead')||c.contains('extension-ceiling'))return 'ceiling';
   if(c.contains('hull-panel'))return c.contains('cabin-zone')?'white':c.contains('lounge-zone')?'warm':'hull';
   for(const name of ['orbital','drifting','crest-glass'])if(c.contains(name))return name==='crest-glass'?'crest':name;
   if(el.matches('.holo-base,.holo-ring,.residential-ring,.lab-ring'))return 'ring';
   if(el.matches('.lamp,.passage-light'))return 'lamp';
   if(el.matches('.strip,.guide-light'))return 'orange';
   if(el.matches('.glass-light,.lab-wash,.promenade-light,.crown-light'))return 'cyan';
   if(el.matches(nativeSelector))return 'screen';
   if(el.matches('.seat-flank,.seat-band')){
     if(el.matches('.flight-pad,.head-pad'))return el.matches('.command-chair,.lab-chair')?'ivory':'pad';
     if(el.matches('.pod-chair.shoulder-shell,.pod-chair.canopy-shell'))return 'copper';
     if(el.matches('.canopy-shell,.canopy-spar,.shoulder-shell,.chair-shell'))return el.matches('.command-chair,.pod-chair,.lab-chair')?'white':'shell';
     return 'dark';
   }
   if(el.matches('.lounge-pad,.berth-pad,.berth-pillow'))return 'linen';
   if(el.matches('.hull-edge,.rim-metal,.hatch-flange,.case-edge,.reveal,.rail,.girder,.guide-channel'))return 'edge';
   if(c.contains('pipe-collar'))return 'shell';
   if(c.contains('service-pipe'))return 'dark';
   if(el.matches('.hull-back,.case-back'))return 'back';
   return 'wall';
 }
 function shader(type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}
 const pr=gl.createProgram();
 gl.attachShader(pr,shader(gl.VERTEX_SHADER,`
 attribute vec3 position,normal;attribute vec2 uv;attribute float kind;
 uniform vec2 leafOffset;uniform vec3 eye;uniform vec4 angles;uniform vec2 proj;uniform float mirror,clock;
 varying vec3 wp,norm;varying vec2 tex;varying float type;
 void main(){vec3 p=position+vec3(leafOffset.x,0.,leafOffset.y);type=kind;tex=uv;norm=normal;wp=p;
 if(kind>4.5&&kind<5.5)p+=vec3(eye.x,0.,eye.z);
 if(kind>5.5&&kind<6.5)p+=vec3(sin(clock*.045)*140.,cos(clock*.036)*28.,0.);
 if(mirror>.5)p.y=832.-p.y;
 vec3 d=p-eye;float vx=angles.y*d.x+angles.x*d.z;
 float forward=angles.x*d.x-angles.y*d.z;
 float vy=angles.w*d.y-angles.z*forward;
 float depth=angles.w*forward+angles.z*d.y;
 gl_Position=vec4(vx*proj.x,-vy*proj.y,depth-2.2,depth);
 if(kind>4.5&&kind<5.5)gl_Position.z=depth;}`));
 gl.attachShader(pr,shader(gl.FRAGMENT_SHADER,`
 precision highp float;varying vec2 tex;varying vec3 wp,norm;varying float type;
 uniform sampler2D galleryFinish,avatarFinish;uniform sampler2D wallFinish,deckFinish,sheet,reflected,displays;uniform float moving;uniform sampler2D lighting;uniform samplerCube space;uniform vec2 viewport;uniform float mirror;uniform vec3 eye;
 void main(){
 if(type>7.5){gl_FragColor=vec4(texture2D(galleryFinish,tex).rgb,1.);return;}
 if(type>6.5){gl_FragColor=vec4(texture2D(avatarFinish,tex).rgb,1.);return;}
 if(type>3.5&&type<4.5){
   if(mirror<.5&&type>4.15)discard;
   gl_FragColor=texture2D(displays,tex);return;
 }
 if(type>4.5&&type<5.5){gl_FragColor=vec4(textureCube(space,normalize(vec3(wp.x,-wp.y,-wp.z))).rgb,1.);return;}
 vec4 base=type<-.5?texture2D(wallFinish,tex):texture2D(sheet,tex);if(base.a<.12)discard;
 vec3 n=normalize(norm);vec3 direction=normalize(wp-eye);float facing=abs(dot(n,direction));
 if(type>.5&&type<1.5){
 vec3 light=texture2D(lighting,(wp.xz+vec2(2400.,3000.))/vec2(4800.,22000.)).rgb;
 gl_FragColor=vec4(texture2D(deckFinish,wp.xz/360.).rgb*.76+light*(.045+.015*(1.-facing)),1.);return;}
 if(type>1.5&&type<2.5){gl_FragColor=vec4(.27,.45,.53,.13+.21*pow(1.-facing,3.));return;}
 if(type>2.5){gl_FragColor=base;return;}
 float light=.71+.25*max(0.,dot(n,normalize(vec3(-.45,-.8,.32))));
 vec3 ray=reflect(direction,n);
 vec3 env=textureCube(space,vec3(ray.x,-ray.y,-ray.z)).rgb;
 gl_FragColor=vec4(mix(base.rgb*light,env,.025+.10*pow(1.-facing,3.)),base.a);}`));
 gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(pr));gl.useProgram(pr);
 const uniforms=Object.fromEntries(['lighting','galleryFinish','avatarFinish','wallFinish','deckFinish','leafOffset','eye','angles','proj','mirror','clock','sheet','reflected','space','viewport','displays','moving'].map(k=>[k,gl.getUniformLocation(pr,k)]));
 const atlasTex=gl.createTexture();
 function updateAtlas(){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,atlasTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);gl.generateMipmap(gl.TEXTURE_2D);}
 updateAtlas();gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 const cube=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_CUBE_MAP,cube);
 const cubeTargets=['POSITIVE_X','NEGATIVE_X','POSITIVE_Y','NEGATIVE_Y','POSITIVE_Z','NEGATIVE_Z'];
 cubeTargets.forEach(k=>gl.texImage2D(gl['TEXTURE_CUBE_MAP_'+k],0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array([12,24,36])));
 gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});
 const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic');
 function surfaceTexture(unit,uniform,src){
   const texture=gl.createTexture();
   function bind(){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture)}
   bind();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array([150,164,169]));
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   if(anisotropy)gl.texParameterf(gl.TEXTURE_2D,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(16,gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
   gl.generateMipmap(gl.TEXTURE_2D);gl.uniform1i(uniform,unit);
   loadImage(src).then(im=>{bind();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,im);gl.generateMipmap(gl.TEXTURE_2D)});
 }
 surfaceTexture(7,uniforms.galleryFinish,'assets/lower-armour.webp');
 surfaceTexture(6,uniforms.avatarFinish,'assets/avatar-armour.webp');
 surfaceTexture(4,uniforms.wallFinish,'assets/bulkhead-2k.webp');
 surfaceTexture(5,uniforms.deckFinish,'assets/satin-panel.webp');
 const lightingTex=gl.createTexture();gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,lightingTex);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,lightMap);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.uniform1i(uniforms.lighting,2);
 Promise.all(['px','nx','py','ny','pz','nz'].map(f=>loadImage('assets/forge/'+f+'.webp'))).then(imgs=>{
   gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_CUBE_MAP,cube);imgs.forEach((im,i)=>gl.texImage2D(gl['TEXTURE_CUBE_MAP_'+cubeTargets[i]],0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,im));
 });
 for(const [name,src] of Object.entries({armour:'assets/pearl-bulkhead.svg',crest:'archive/assets/expanse-ring-wordmark.webp',orbital:'archive/assets/fortizar-cutout.webp',drifting:'archive/assets/naglfar-cutout.webp'})){
   loadImage(src).then(im=>{const [x,y]=tileOrigin(name);ctx.clearRect(x,y,tile,tile);
     if(name==='armour')ctx.drawImage(im,x,y,tile,tile);
     else{const ratio=im.width/im.height;const target=name==='drifting'?830/335:name==='orbital'?850/310:275/115;const w=Math.min(1,ratio/target)*tile,h=Math.min(1,target/ratio)*tile;ctx.drawImage(im,x+(tile-w)/2,y+(tile-h)/2,w,h);}
     updateAtlas();
   });
 }
 // Rasterize control faces once, using the same measured buttons as hit testing.
 // They can move with the hull in one draw while the pilot is walking.
 const uiAtlas=document.createElement('canvas');const uiColumns=Math.ceil(Math.sqrt(live.length)),cellSize=live.length>256?128:256;uiAtlas.width=2**Math.ceil(Math.log2(uiColumns*cellSize));uiAtlas.height=2**Math.ceil(Math.log2(Math.ceil(live.length/uiColumns)*cellSize));
 const uc=uiAtlas.getContext('2d'),uiTex=gl.createTexture(),uiTiles=new Map();
 function paintInstruments(){
   live.forEach(({el},i)=>{
     const ox=i%uiColumns*cellSize,oy=Math.floor(i/uiColumns)*cellSize;
     uiTiles.set(el,[ox,oy]);
     const w=parseFloat(el.style.width),h=parseFloat(el.style.height);
     uc.save();uc.translate(ox,oy);uc.scale(cellSize/w,cellSize/h);uc.fillStyle='#0a1f29';uc.fillRect(0,0,w,h);
     uc.strokeStyle='#5c818b';uc.lineWidth=3;uc.strokeRect(1,1,w-2,h-2);
     const buttons=[...el.querySelectorAll('button')];
     if(!buttons.length){
       uc.font='600 '+Math.min(h*.43,18)+'px Oxanium,sans-serif';uc.fillStyle='#d6eeed';
       uc.textBaseline='middle';uc.fillText(el.textContent.trim(),7,h/2,w-13);
     }
     for(const b of buttons){
       const x=b.offsetLeft+el.clientLeft,y=b.offsetTop+el.clientTop,bw=b.offsetWidth,bh=b.offsetHeight;
       if(!bw||!bh)continue;
       uc.fillStyle=b.classList.contains('helm-title')?'#122e39':'#163540';uc.fillRect(x,y,bw,bh);
       uc.strokeStyle='#42616e';uc.lineWidth=1;uc.strokeRect(x+.5,y+.5,bw-1,bh-1);
       const label=b.textContent.trim();uc.font='600 '+Math.min(parseFloat(getComputedStyle(b).fontSize)||15,bh*.68)+'px Oxanium,sans-serif';uc.textBaseline='middle';
       uc.fillStyle='#c7edf4';uc.fillText(label,x+5,y+bh/2,Math.max(2,bw-11));
     }
     uc.restore();
   });
   gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,uiTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,uiAtlas);gl.generateMipmap(gl.TEXTURE_2D);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 }
 paintInstruments();
 // Triangulate concave side profiles, keeping open spaces in chair canopies.
 function indices(points){
   if(points.length<3)return [];
   if(points.length===4)return [0,1,2,0,2,3];
   const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
   const sign=Math.sign(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1]},0));
   const active=points.map((_,i)=>i),out=[];
   while(active.length>2){let found=false;
     for(let k=0;k<active.length;k++){const a=active[(k+active.length-1)%active.length],b=active[k],c=active[(k+1)%active.length];
       if(cross(points[a],points[b],points[c])*sign<=0)continue;
       if(active.some(i=>i!==a&&i!==b&&i!==c&&[[a,b],[b,c],[c,a]].every(([j,l])=>cross(points[j],points[l],points[i])*sign>=0)))continue;
       out.push(a,b,c);active.splice(k,1);found=true;break;
     }if(!found)break;
   }return out;
 }
 const groups=new Map();
 for(const el of all){
   const name=material(el);if(!name)continue;
   const m=matrixFor(el),w=parseFloat(el.style.width),h=parseFloat(el.style.height);
   const poly=el.classList.contains('seat-flank')?[...el.style.clipPath.matchAll(/([\d.]+)% ([\d.]+)%/g)].map(a=>[+a[1]/100,+a[2]/100]):[[0,0],[1,0],[1,1],[0,1]];
   const ui=uiTiles.get(el),cell=ui?cellSize:tile;const [ax,ay]=ui||tileOrigin(name);
   const k=ui?(el.matches('.course-display,.holo-display,.room-projection')?4.25:4):name==='armour'?-1:name==='floor'?1:name==='window'?2:name==='sky'?5:name==='drifting'?6:['cyan','lamp','orange','ring','screen','crest','orbital'].includes(name)?3:0;
   const zone=['orbital','drifting','sky'].includes(name)?'exterior':room(m.m41,m.m43);
   const cluster=zone==='exterior'?'exterior':Math.floor(m.m41/500)+'/'+Math.floor(m.m43/700);
   const key=cluster+(name==='window'?':glass':':solid');
   if(!groups.has(key))groups.set(key,[]);
   const dest=groups.get(key);
   for(const i of indices(poly)){
     const [u,v]=poly[i];const p=m.transformPoint(new DOMPoint((u-.5)*w,(v-.5)*h));
     dest.push(p.x,p.y,p.z,m.m31,m.m32,m.m33,name==='armour'?u:(ax+1+u*(cell-2))/(ui?uiAtlas.width:atlas.width),name==='armour'?v:(ay+1+v*(cell-2))/(ui?uiAtlas.height:atlas.height),k);
   }
 }
 for(const panel of formedPanels){
   const [a,b,,d]=panel.points,e=b.map((v,i)=>v-a[i]),f=d.map((v,i)=>v-a[i]);
   const n=[e[1]*f[2]-e[2]*f[1],e[2]*f[0]-e[0]*f[2],e[0]*f[1]-e[1]*f[0]];
   const len=Math.hypot(...n)||1;const name=panel.darkLeaf&&panel.finish==='pearl'?'dark':{hazardYellow:'hazardYellow',hazardBlack:'hazardBlack',oxblood:'oxblood',pearl:'white',alloy:'shell',gasket:'dark',glasslight:'cyan',upholstery:'linen',sienna:'copper',bronze:'warm',smoked:'dark',warmline:'lamp',glass:'window',titanGold:'titanGold',titanBronze:'titanBronze',titanIron:'titanIron',titanDark:'titanDark'}[panel.finish];
   const [tx,ty]=tileOrigin(name),key=panel.leaf===undefined?(panel.avatar?'avatar/':'')+Math.floor(a[0]/(panel.avatar?110000:500))+'/'+Math.floor(a[2]/(panel.avatar?110000:700))+':solid':(panel.distant?'farleaf':'leaf')+panel.leaf+(name==='window'?':glass':':solid');if(!groups.has(key))groups.set(key,[]);
   for(const i of panel.points[2].every((v,j)=>v===d[j])?[0,1,2]:[0,1,2,0,2,3]){
     const v=panel.points[i];
     if(panel.plating){groups.get(key).push(...v,n[0]/len,n[1]/len,n[2]/len,...panel.plating[i],8);continue;}
     if(panel.skin){
       groups.get(key).push(...v,n[0]/len,n[1]/len,n[2]/len,...avatarUV(v),7);continue;
     }
     groups.get(key).push(...v,n[0]/len,n[1]/len,n[2]/len,(tx+tile*.5)/atlas.width,(ty+tile*.5)/atlas.height,name==='window'?2:name==='cyan'?3:0);
   }
 }
 const ranges=[],data=[];
 for(const [key,verts] of groups){
   const [zone,mode]=key.split(':');
   const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
   for(let i=0;i<verts.length;i+=9)for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],verts[i+j]);hi[j]=Math.max(hi[j],verts[i+j])}
   const c=lo.map((v,i)=>(v+hi[i])/2);
   const doorRange=/^(far)?leaf(\d+)$/.exec(zone);
   ranges.push({zone,leaf:doorRange?Number(doorRange[2]):undefined,distant:!!doorRange?.[1],mode,c,r:Math.hypot(...hi.map((v,i)=>v-c[i]))+(doorRange?202:0),lo,hi,offset:data.length/9,count:verts.length/9});
   for(const v of verts)data.push(v);
 }
 const sceneBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,sceneBuffer);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
 
 let visibleRanges=ranges;

 function draw(mode){
   for(const r of visibleRanges){
     if(r.mode!==mode)continue;
     const shift=r.leaf!==undefined?leafShift(r.leaf):[0,0];
     gl.uniform2f(uniforms.leafOffset,shift[0],shift[1]);gl.drawArrays(gl.TRIANGLES,r.offset,r.count);
   }
 }
 for(const [key,n,offset] of [['position',3,0],['normal',3,3],['uv',2,6],['kind',1,8]]){
   const i=gl.getAttribLocation(pr,key);gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,n,gl.FLOAT,false,36,offset*4);
 }
 let rw=0,rh=0;
 gl.uniform1i(uniforms.displays,3);gl.uniform1i(uniforms.sheet,0);gl.uniform1i(uniforms.space,1);gl.uniform1i(uniforms.reflected,2);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(.025,.046,.065,1);
 view.prepend(canvas);document.documentElement.classList.add('accelerated-ship');
 for(const item of live)item.el.classList.add('live-display');
 const visibleElements=new Set(live.map(i=>i.el));
 for(const el of all)if(!visibleElements.has(el))el.remove();
 let previousPose=null,lastDraw=0,slowFrames=0,fastFrames=0,resolutionScale=1;

 window.renderShip=(now,ex,ey,ez,yaw,pitch,lens)=>{
   showRoom(ex,ez,ey,yaw,pitch);
   const elapsed=now-lastDraw;
   if(lastDraw&&elapsed<250&&(keys.size||drag)){
     slowFrames=elapsed>10.5?slowFrames+1:Math.max(0,slowFrames-1);
     fastFrames=elapsed<8.6?fastFrames+1:0;
     if(slowFrames>18){resolutionScale=Math.max(.65,resolutionScale-.1);slowFrames=0}
     if(fastFrames>180){resolutionScale=Math.min(1,resolutionScale+.05);fastFrames=0}
   }
   lastDraw=now;
   const pixelRatio=Math.min(devicePixelRatio||1,1.25)*resolutionScale;
   
   const pose=[ex,ey,ez,yaw,pitch,innerWidth,innerHeight,pixelRatio].join('/');
   const cycling=hatches.some(d=>d.openness>0&&d.openness<1);
   if(previousPose===pose && !cycling)return;
   visibleRanges=selectRanges(ranges,ex,ey,ez,yaw,pitch,lens);
   previousPose=pose;
   gl.uniform1f(uniforms.moving,0);
   const w=Math.round(innerWidth*pixelRatio),h=Math.round(innerHeight*pixelRatio);
   if(rw!==w||rh!==h){
     canvas.width=rw=w;canvas.height=rh=h;
   }
   gl.uniform3f(uniforms.eye,ex,ey,ez);gl.uniform4f(uniforms.angles,Math.sin(yaw),Math.cos(yaw),Math.sin(pitch),Math.cos(pitch));
   gl.uniform2f(uniforms.proj,2*lens/innerWidth,2*lens/innerHeight);gl.uniform1f(uniforms.clock,now*.001);
   gl.viewport(0,0,w,h);gl.uniform2f(uniforms.viewport,w,h);gl.uniform1f(uniforms.mirror,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   draw('solid');gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
   draw('glass');gl.depthMask(true);gl.disable(gl.BLEND);
   window.presentedShipFrames=(window.presentedShipFrames||0)+1;
 };
})();

