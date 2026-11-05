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
function transit(){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return Promise.resolve();
 trail.width=innerWidth;trail.height=innerHeight;trail.hidden=false;
 const ctx=trail.getContext('2d'),w=trail.width,h=trail.height,start=performance.now();
 return new Promise(resolve=>{function frame(now){
  const t=Math.min(1,(now-start)/1650);ctx.clearRect(0,0,w,h);ctx.lineWidth=1.6;
  ctx.strokeStyle='rgba(173,218,255,'+Math.sin(t*Math.PI)*.88+')';ctx.beginPath();
  for(let i=0;i<170;i++){const a=i*2.39996,r=((i*.618+t*(.7+(i%8)*.06))%1)**2,l=(.012+.16*t)*r;
   ctx.moveTo(w*(.5+r*Math.cos(a)),h*(.44+r*Math.sin(a)));ctx.lineTo(w*(.5+(r+l)*Math.cos(a)),h*(.44+(r+l)*Math.sin(a)));}
  ctx.stroke();if(t<1)requestAnimationFrame(frame);else{trail.hidden=true;resolve()}
 }requestAnimationFrame(frame)});
}
for(const route of routes){
 const button=document.createElement('button');button.type='button';button.value=route.id;button.style.setProperty('--route',route.color);
 const picture=document.createElement('img');picture.alt='';picture.src=route.id==='pochven'?'assets/exhibits/poch-hd.webp':'assets/vistas/'+route.id+'-thumb.webp';const caption=document.createElement('span');caption.textContent=route.name;button.append(picture,caption);button.setAttribute('aria-label','Jump to '+route.name);
 button.onclick=async()=>{
  if(jumping||route.id===exteriorView)return;
  jumping=true;updateButtons();statusText.textContent='Aligning to '+route.name;
  try{const faces=await systemSky(route);if(jumpPanel.open)jumpPanel.close();await transit();activeSky=Promise.resolve(faces);exteriorView=route.id;
   window.dispatchEvent(new Event('exteriorchange'));document.getElementById('jump-console').textContent=route.name+' · Jump navigation';
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
