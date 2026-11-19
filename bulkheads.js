'use strict';
// Heights run from the floor to the ceiling. Depth is the offset from the pressure hull in centimetres.
const hullSection=[
  [0,18,'gasket'],[.035,25,'rail'],[.055,26,'brass'],[.061,22,'gasket'],
  [.10,12,'rail'],[.14,8,'shell'],[.23,5,'shell'],[.46,3,'shell'],
  [.61,5,'shell'],[.69,12,'shell'],[.73,20,'shell'],[.755,26,'rail'],
  [.77,27,'brass'],[.778,24,'gasket'],[.796,8,'gasket'],[.816,6,'gold'],
  [.824,8,'rail'],[.85,21,'shell'],[.89,36,'shell'],[.94,55,'shell'],[1,68,'shell']
];
function cladBulkhead(node,g,scale){
  node.classList.add('sculpted-hull');
  if(g.w<100){
    node.classList.add('hull-return');
    const light=Math.round(127+11*Math.sin(g.ry-.55));node.style.setProperty('--enamel-tone','rgb('+(light+9)+','+(light+6)+','+(light-2)+')');
  }
  const depth=Math.min(1,g.h/350);
  for(let i=0;i<hullSection.length-1;i++){
    const [a,za,finish]=hullSection[i],[b,zb]=hullSection[i+1];
    const dy=(b-a)*g.h/scale,dz=(zb-za)*depth/scale,len=Math.hypot(dy,dz);
    const strip=document.createElement('b');strip.className='hull-band finish-'+finish;
    strip.style.cssText='height:'+(len+.36)+'px;top:'+((1-(a+b)/2)*g.h/scale-len/2)+'px;transform:translateZ('+((za+zb)*depth/(2*scale))+'px) rotateX('+(-Math.atan2(dz,dy))+'rad)';
    node.append(strip);
  }
}
function curvedRoomEnds(side,far,z,half,height,radius){
  for(const end of [-1,1]){
    const worldX=side*(far-radius),worldZ=z+end*(half-radius);
    const turn=face('continuous-return',radius*2,height,worldX,-height/2,worldZ);
    turn.arc={side,end,radius};const pieces=document.createDocumentFragment();
    const divisions=12,step=Math.PI/(2*divisions),ds=Math.min(1,height/350);
    for(let j=0;j<divisions;j++){
      const a=(j+.5)*step,c=Math.cos(a),s=Math.sin(a),heading=Math.atan2(-side*c,-end*s);
      for(let k=0;k<hullSection.length-1;k++){
        const [lo,d0,finish]=hullSection[k],[hi,d1]=hullSection[k+1];
        const r0=radius-ds*d0,r1=radius-ds*d1,mid=(r0+r1)*.5;
        const dy=(hi-lo)*height,dz=ds*(d1-d0),h=Math.hypot(dy,dz);
        const w=2*Math.max(r0,r1)*Math.tan(step*.5)+.6;
        const band=document.createElement('b');band.className='hull-band finish-'+finish;
        const taper=(r)=>Math.max(0,(1-r/Math.max(r0,r1))*50);
        band.style.cssText='width:'+w+'px;height:'+(h+.45)+'px;left:calc(50% - '+w/2+'px);top:calc(50% - '+h/2+'px);'+
          'clip-path:polygon('+taper(r1)+'% 0,'+(100-taper(r1))+'% 0,'+(100-taper(r0))+'% 100%,'+taper(r0)+'% 100%);'+
          'transform:translate3d('+side*c*mid+'px,'+(0.5-(hi+lo)*.5)*height+'px,'+end*s*mid+'px) rotateY('+heading+'rad) rotateX('+(-Math.atan2(dz,dy))+'rad)';
        if(finish==='shell'){const light=Math.round(130+14*Math.sin(heading-.55));band.style.background='rgb('+(light+7)+','+(light+4)+','+(light-3)+')'}
        pieces.append(band);
      }
    }
    turn.append(pieces);
  }
}
