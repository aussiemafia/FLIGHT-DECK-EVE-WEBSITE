'use strict';
// Heights run from the floor to the ceiling. Depth is the offset from the pressure hull in centimetres.
const hullSection=[
  [0,16,'bronze'],[.018,27,'brass'],[.028,28,'bronze'],[.052,11,'gasket'],
  [.068,5,'gold'],[.074,5,'rail'],[.098,13,'bronze'],[.155,19,'bronze'],
  [.205,13,'rail'],[.234,5,'gasket'],[.247,3,'brass'],[.253,4,'shell'],
  [.29,9,'shell'],[.43,12,'shell'],[.61,9,'shell'],[.735,4,'rail'],
  [.75,3,'gasket'],[.78,3,'gold'],[.787,5,'bronze'],[.809,19,'brass'],
  [.827,22,'shell'],[.86,23,'shell'],[.906,29,'shell'],[.95,44,'shell'],[1,68,'shell']
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
    for(let j=0;j<8;j++){
      const a=(j+.5)*Math.PI/16,px=worldX+side*radius*Math.cos(a),pz=worldZ+end*radius*Math.sin(a);
      const heading=Math.atan2(-side*Math.cos(a),-end*Math.sin(a))*180/Math.PI;
      face('bay-shell',2*radius*Math.tan(Math.PI/32)+1,height,px,-height/2,pz,heading);
    }
  }
}
