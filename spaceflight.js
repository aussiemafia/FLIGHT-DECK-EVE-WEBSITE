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
    sky.append(side);
  }
  world.prepend(sky);
  window.drawExterior=(x,z)=>{sky.style.transform='translate3d('+x+'px,0,'+z+'px)';};
})();
