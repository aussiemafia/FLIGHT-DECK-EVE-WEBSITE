// The Forge (c02), six continuous EVE skybox faces. The nebula stays at
// infinity while the nearby ships and the physical window jambs show parallax.
(() => {
  const sky=document.createElement('div');
  sky.className='forge-sky';
  const r=7000;
  for(const [face,x,y,z,ry,rx] of [
    ['pz',0,0,-r,0,0],['px',r,0,0,-90,0],['nz',0,0,r,180,0],
    ['nx',-r,0,0,90,0],['py',0,-r,0,0,-90],['ny',0,r,0,0,90]
  ]){
    const side=plane('sky-face',r*2+2,r*2+2,x,y,z,ry,rx);
    side.style.backgroundImage='url(assets/forge/'+face+'.webp)';
    side.dataset.face=face;
    sky.append(side);
  }
  world.prepend(sky);
  window.drawExterior=(x,z)=>{sky.style.transform='translate3d('+x+'px,0,'+z+'px)';};
})();


const skyKeys=['px','nx','py','ny','pz','nz'];
const routes=vistas.map(([id,name])=>({id,name,hue:155,color:'#cb404c'}));
const skyImages=Promise.all(skyKeys.map(async key=>{
 const img=new Image();img.src='assets/forge/'+key+'.webp';await img.decode();return img;
}));
async function systemSky(route){
 const images=await skyImages;
 if(route.id==='forge')return images;
 if(route.id!=='pochven'){
  const art=new Image();
  const portrait=route.id==='nebula'||route.id==='transit';
  art.src=route.id==='nebula'?'new-eden-nebula.webp':'assets/vistas/'+route.id+'.webp';
  await art.decode();
  if(portrait){
   const faces=images.slice(),face=document.createElement('canvas'),n=images[4].width;
   face.width=face.height=n;
   const ctx=face.getContext('2d'),side=Math.min(art.width,art.height);
   ctx.drawImage(art,(art.width-side)/2,(art.height-side)/2,side,side,0,0,n,n);
   const fade=ctx.createRadialGradient(n/2,n/2,n*.27,n/2,n/2,n*.50);
   fade.addColorStop(0,'white');fade.addColorStop(1,'transparent');ctx.globalCompositeOperation='destination-in';
   ctx.fillStyle=fade;ctx.fillRect(0,0,n,n);ctx.globalCompositeOperation='destination-over';ctx.drawImage(images[4],0,0);
   faces[4]=face;return faces;
  }
  // Keep the authored Perimeter planet when upgrading its surrounding sky.
  const originalRoot='https://raw.githubusercontent.com/wannalink/eve-nebulas/cb0307c6743f2da0c0c05cb88e4359ebedab703d/nebulas/';
  try{
   const originals=await Promise.all(skyKeys.map(async key=>{
    const face=new Image();face.crossOrigin='anonymous';
    face.src=originalRoot+route.id+'/'+key+'.webp';await face.decode();return face;
   }));
   if(route.id==='c01'){
    const n=originals[4].width,source=art.width/3,face=document.createElement('canvas');
    face.width=face.height=n;
    const ctx=face.getContext('2d');ctx.drawImage(originals[4],0,0);
    const scale=n/1024;
    ctx.drawImage(art,source+486,source+270,434,434,486*scale,270*scale,434*scale,434*scale);
    originals[4]=face;
   }
   return originals;
  }catch{/* The bundled atlas also works when the original host is unavailable. */}
  const n=art.width/3;
  return skyKeys.map((key,i)=>{const face=document.createElement('canvas');face.width=face.height=n;
   face.getContext('2d').drawImage(art,i%3*n,Math.floor(i/3)*n,n,n,0,0,n,n);return face});
 }
 return images.map((img,i)=>{
  const face=document.createElement('canvas');face.width=face.height=img.width;
  const ctx=face.getContext('2d'),n=face.width;
  ctx.filter='hue-rotate('+route.hue+'deg) saturate(1.65)';ctx.drawImage(img,0,0,n,n);ctx.filter='none';
  ctx.globalCompositeOperation='color';ctx.globalAlpha=.48;ctx.fillStyle=route.color;ctx.fillRect(0,0,n,n);
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  if(i===4){
   const x=n*(route.id==='amarr'?.40:.65),y=n*.43,r=n*(route.id==='amarr'?.16:.22);
   const glow=ctx.createRadialGradient(x,y,r*.98,x,y,r*1.25);glow.addColorStop(0,route.color);glow.addColorStop(.17,route.color+'50');glow.addColorStop(1,route.color+'00');
   ctx.fillStyle=glow;ctx.fillRect(x-r*1.25,y-r*1.25,r*2.5,r*2.5);
   ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();
   ctx.drawImage(img,0,0,img.width,img.height,x-r,y-r,r*2,r*2);
   const limb=ctx.createRadialGradient(x-r*.65,y-r*.60,0,x+r*.12,y+r*.12,r*1.12);
   limb.addColorStop(0,route.color);limb.addColorStop(.49,route.color+'99');limb.addColorStop(.72,'#101322e8');limb.addColorStop(1,'#030813');
   ctx.fillStyle=limb;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
  }
  return face;
 });
}
let activeSky=skyImages;
async function applySystemSky(draw){const request=activeSky,faces=await request;if(request===activeSky)await draw(faces)}
window.addEventListener('exteriorchange',()=>applySystemSky(faces=>{
 document.querySelectorAll('.forge-sky [data-face]').forEach(el=>{
  const face=faces[skyKeys.indexOf(el.dataset.face)];el.style.backgroundImage='url('+(face.src||face.toDataURL('image/webp'))+')';
 });
}));
const jumpPanel=document.getElementById('jump-panel'),statusText=document.getElementById('system-status');
const trail=document.getElementById('warp-trails'),lightSlider=document.getElementById('cabin-light');
let jumping=false;
window.openJumpConsole=()=>{if(document.pointerLockElement)document.exitPointerLock();if(!jumpPanel.open)jumpPanel.showModal()};
document.getElementById('jump-console').onclick=openJumpConsole;
jumpPanel.addEventListener('keydown',event=>event.stopPropagation());
function updateButtons(){
 const current=routes.find(route=>route.id===exteriorView);
 statusText.textContent=warpReadout.textContent='Current system · '+current.name;
 for(const button of document.querySelectorAll('#routes button'))button.disabled=jumping||button.value===current.id;
}
// Project the bridge window openings into the current camera view so the
// warp stays beyond the frame even when the pilot turns during a jump.
function clipWarpWindows(ctx,w,h){
 if(z>outerLockZ)return;
 const lens=parseFloat(view.style.perspective),eye=seated?105:0;
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 ctx.beginPath();
 function pane(corners){
  const points=corners.map(([wx,wy,wz])=>{
   const dx=wx-x,dz=wz-z,dy=wy-eye,depth=dx*sy-dz*cy;
   return [dx*cy+dz*sy,dy*cp-depth*sp,depth*cp+dy*sp];
  });
  const clipped=[];
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length];
   if(a[2]>=1)clipped.push(a);
   if((a[2]>=1)!==(b[2]>=1)){
    const t=(1-a[2])/(b[2]-a[2]);clipped.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),1]);
   }
  }
  clipped.forEach(([u,v,d],i)=>ctx[i?'lineTo':'moveTo'](w/2+lens*u/d,h/2+lens*v/d));
  if(clipped.length)ctx.closePath();
 }
 const compartment=displayCompartment(x,z);
 for(const window of exteriorWindowBounds){
  if(compartment===displayCompartment(window.wx,window.wz))pane(window.corners);
 }
 if(compartment==='bridge'){
  for(let j=0;j<4;j++){
   const front=canopyFront+j*paneLength+14,aft=front+paneLength-28;
   for(const side of [-1,1]){
    const inner=side*(canopyHalf+38),outer=side*770;
    pane([[inner,roofY,front],[outer,roofY,front],[outer,roofY,aft],[inner,roofY,aft]]);
   }
   pane([[-canopyHalf,roofY,front],[0,vaultHeight(0),front],[canopyHalf,roofY,front],[canopyHalf,roofY,aft],[0,vaultHeight(0),aft],[-canopyHalf,roofY,aft]]);
  }
 }
 ctx.clip();
}
function transit(name,departure,destination,arrive){
 const duration=2900;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){arrive();return Promise.resolve();}
 window.dispatchEvent(new Event('shipwarp'));
 const w=innerWidth,h=innerHeight,scale=Math.min(devicePixelRatio||1,1.5);
 trail.width=Math.round(w*scale);trail.height=Math.round(h*scale);
 const ctx=trail.getContext('2d');ctx.setTransform(scale,0,0,scale,0,0);trail.hidden=false;
 const radius=Math.hypot(w,h)*.75;
 const start=performance.now();let arrived=false,phase='';
 return new Promise(resolve=>{function frame(now){
  const t=Math.min(1,(now-start)/duration);
  if(!arrived&&t>=.5){arrived=true;arrive();}
  const stage=t<.2?'Spooling drive':t<.76?'In warp':'Dropping from warp';
  if(phase!==stage){phase=stage;warpReadout.textContent=stage+' · '+name;}
  const speed=Math.sin(Math.PI*t)**2;
  ctx.clearRect(0,0,w,h);ctx.save();clipWarpWindows(ctx,w,h);
  ctx.translate(w*.5,h*.48);
  // Bend the actual sky in broad horizontal bands. The distortion peaks
  // during the system swap and eases to zero at both ends of the jump.
  const blend=Math.min(1,Math.max(0,(t-.32)/.36));
  const crossfade=blend*blend*(3-2*blend);
  const bands=42, bandHeight=h/bands;
  const zoom=1+.32*speed;
  function bendSky(image,opacity){
   ctx.globalAlpha=opacity;
   const crop=Math.min(image.width,image.height*w/h)/zoom;
   const cropHeight=crop*h/w;
   for(let row=0;row<bands;row++){
    const v=(row+.5)/bands-.5;
    const bend=Math.cos(v*Math.PI)*Math.sin(v*5.5+t*4)*w*.037*speed;
    const spread=1+speed*.15*(1-4*v*v);
    ctx.drawImage(image,(image.width-crop)/2,(image.height-cropHeight)/2+row*cropHeight/bands,
     crop,cropHeight/bands,-w*.5*spread+bend,(row/bands-.48)*h,w*spread,bandHeight+1);
   }
  }
  bendSky(departure,speed);
  bendSky(destination,speed*crossfade);
  const haze=ctx.createRadialGradient(0,0,0,0,0,radius);
  haze.addColorStop(0,'rgba(9,18,42,.28)');haze.addColorStop(.28,'rgba(56,93,166,.38)');haze.addColorStop(.72,'rgba(75,128,183,.20)');haze.addColorStop(1,'rgba(12,27,60,.06)');
  ctx.globalAlpha=speed;ctx.fillStyle=haze;ctx.fillRect(-w,-h,2*w,2*h);
  ctx.restore();
  if(t<1)requestAnimationFrame(frame);else{window.dispatchEvent(new Event('shipwarpend'));trail.hidden=true;ctx.clearRect(0,0,w,h);resolve();}
 }requestAnimationFrame(frame);});
}
for(const route of routes){
 const button=document.createElement('button');button.type='button';button.value=route.id;button.style.setProperty('--route',route.color);
 const picture=document.createElement('img');picture.alt='';picture.src=route.id==='pochven'?'assets/exhibits/poch-hd.webp':'assets/vistas/'+route.id+'-thumb.webp';const caption=document.createElement('span');caption.textContent=route.name;button.append(picture,caption);button.setAttribute('aria-label','Jump to '+route.name);
 button.onclick=async()=>{
  if(jumping||route.id===exteriorView)return;
  jumping=true;updateButtons();statusText.textContent=warpReadout.textContent='Aligning to '+route.name;
  try{const faces=await systemSky(route);if(jumpPanel.open)jumpPanel.close();await transit(route.name,(await activeSky)[4],faces[4],()=>{activeSky=Promise.resolve(faces);exteriorView=route.id;
   window.dispatchEvent(new Event('exteriorchange'));document.getElementById('jump-console').textContent=route.name+' · Jump navigation';});
  }catch{statusText.textContent='Exterior failed to load. Select a system to retry.';jumping=false;for(const b of document.querySelectorAll('#routes button'))b.disabled=b.value===exteriorView;return}
  jumping=false;updateButtons();
 };
 document.getElementById('routes').append(button);
}
function setCabinLight(){
 const hue=Number(lightSlider.value);document.documentElement.style.setProperty('--cabin','hsl('+hue+' 88% 64%)');
 window.cabinRGB=[0,4,2].map(n=>{const k=(n+hue/60)%6;return .78+.35*(1-Math.max(0,Math.min(k,4-k,1)))});
 window.dispatchEvent(new Event('cabinlight'));
}
lightSlider.oninput=setCabinLight;updateButtons();


window.plotWarp=id=>document.querySelector('#routes button[value="'+id+'"]')?.click();

(() => {
 const field=document.createElement('canvas');
 field.setAttribute('aria-hidden','true');
 field.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';
 trail.before(field);
 const ctx=field.getContext('2d');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 // A sparse cloud in ship coordinates. Translation along the ship's axis
 // creates parallax; turning the camera changes the direction of the drift.
 const extent=11000;
 const particles=Array.from({length:1350},(_,i)=>({
  x:((i*.754877666)%1-.5)*extent,
  y:((i*.569840296)%1-.5)*extent,
  z:((i*.438579021)%1)*extent,
  size:.8+(i%5)*.34
 }));
 let previous=0,travel=0,dirty=false;
 function cruise(now){
  requestAnimationFrame(cruise);
  if(document.hidden||reduced.matches||!trail.hidden||panel.open||jumpPanel.open){
   if(dirty){ctx.clearRect(0,0,innerWidth,innerHeight);dirty=false;}
   previous=now;return;
  }
  const dt=now-previous;
  if(dt<40)return;
  travel=(travel+Math.min(dt,100)*.095)%extent;previous=now;
  const w=innerWidth,h=innerHeight,ratio=Math.min(devicePixelRatio||1,1.5);
  if(field.width!==Math.round(w*ratio)||field.height!==Math.round(h*ratio)){
   field.width=Math.round(w*ratio);field.height=Math.round(h*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);
  }
  ctx.clearRect(0,0,w,h);ctx.save();clipWarpWindows(ctx,w,h);
  const lens=parseFloat(view.style.perspective),cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  ctx.fillStyle='#d9ecff';
  for(const p of particles){
   const wz=(p.z+travel)%extent-extent/2;
   const d=p.x*sy-wz*cy,depth=d*cp+p.y*sp;
   if(depth<100)continue;
   const u=w/2+lens*(p.x*cy+wz*sy)/depth,v=h/2+lens*(p.y*cp-d*sp)/depth;
   if(u<0||u>w||v<0||v>h)continue;
   const radius=Math.min(1.7,Math.max(.55,lens*p.size/depth));
   const edgeFade=Math.min(1,(extent/2-Math.abs(wz))/500);
   ctx.globalAlpha=Math.min(.78,.16+550/depth)*edgeFade;
   ctx.beginPath();ctx.arc(u,v,radius,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();dirty=true;
 }
 requestAnimationFrame(cruise);
})();
