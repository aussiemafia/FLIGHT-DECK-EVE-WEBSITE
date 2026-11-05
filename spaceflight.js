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
    if(face==='pz')side.dataset.forward='';
    sky.append(side);
  }
  world.prepend(sky);
  window.drawExterior=(x,z)=>{sky.style.transform='translate3d('+x+'px,0,'+z+'px)';};
})();

// Composite the optional nebula into the forward face. Feathering preserves all
// four seams with the surrounding Forge sky at every viewing angle.
const forwardSkies=new Map();
function forwardSky(view){
 if(forwardSkies.has(view))return forwardSkies.get(view);
 const load=async url=>{const img=new Image();img.src=url;await img.decode();return img};
 const sky=(async()=>{
   const original=await load('assets/forge/pz.webp');
   if(view==='forge')return original;
   const art=await load('new-eden-nebula.webp'),size=original.width;
   const face=document.createElement('canvas');face.width=face.height=size;
   const ctx=face.getContext('2d'),crop=Math.min(art.width,art.height);
   ctx.drawImage(art,(art.width-crop)/2,(art.height-crop)/2,crop,crop,0,0,size,size);
   const fade=ctx.createRadialGradient(size/2,size/2,size*.27,size/2,size/2,size*.50);
   fade.addColorStop(0,'white');fade.addColorStop(1,'transparent');
   ctx.globalCompositeOperation='destination-in';ctx.fillStyle=fade;ctx.fillRect(0,0,size,size);
   ctx.globalCompositeOperation='destination-over';ctx.drawImage(original,0,0);
   return face;
 })().catch(error=>{forwardSkies.delete(view);throw error});
 forwardSkies.set(view,sky);return sky;
}
async function applyForwardSky(draw){
 const choice=exteriorView,face=await forwardSky(choice);
 if(exteriorView===choice)draw(face);
}
window.addEventListener('exteriorchange',()=>applyForwardSky(face=>{
 const panel=document.querySelector('.forge-sky [data-forward]');
 if(panel)panel.style.backgroundImage='url('+ (face.src||face.toDataURL()) +')';
}));
window.dispatchEvent(new Event('exteriorchange'));
