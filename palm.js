'use strict';
// Long outer fronds hang below the crown. Young fronds rise from its centre.
const palmParts=(()=>{
  const limbs=[],patches=[],wood=[],leaves=[];
  const trunk=t=>[14*t*t+2*Math.sin(t*3),-216*t,6*t*t];
  const radius=t=>6.5+5*Math.exp(-t*12)+2.2*Math.sin(Math.PI*t)-2.4*t;
  function triangle(store,a,b,c,uv,wind){
    const u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]);
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const len=Math.hypot(...n)||1;
    [a,b,c].forEach((p,i)=>store.push(...p,...n.map(x=>x/len),...uv[i],wind[i]));
  }
  function ring(t,i){
    const p=trunk(t),ang=i*Math.PI/10,r=radius(t)+.6*Math.cos(t*Math.PI*42);
    return [p[0]+r*Math.cos(ang),p[1],p[2]+r*Math.sin(ang)];
  }
  for(let i=0;i<42;i++){
    const a=i/42,b=(i+1)/42;limbs.push({a:trunk(a),b:trunk(b),r:radius(a)});
    for(let j=0;j<20;j++){
      const p=ring(a,j),q=ring(a,j+1),r=ring(b,j+1),s=ring(b,j);
      const uv=[[j/20,a],[(j+1)/20,a],[(j+1)/20,b],[j/20,b]];
      triangle(wood,p,q,r,uv.slice(0,3),[0,0,0]);triangle(wood,p,r,s,[uv[0],uv[2],uv[3]],[0,0,0]);
    }
  }
  for(let i=0;i<23;i++){
    const layer=i/22,angle=i*2.39996,reach=154-96*layer+9*Math.sin(i*2.7);
    const crown=trunk(1),rise=56+69*layer,drop=79-54*layer,span=reach*.156;
    function point(t,side){
      const a=angle+.13*Math.sin(i+2*t)*t,c=Math.cos(a),s=Math.sin(a);
      return [crown[0]+c*reach*t-side*s*span,crown[1]-rise*Math.sin(t*1.67)+drop*t*t+Math.abs(side)*14*Math.sin(Math.PI*t),
        crown[2]+s*reach*t+side*c*span];
    }
    for(let j=0;j<8;j++)for(const half of [-1,0]){
      const a=j/8,b=(j+1)/8,lo=half,hi=half+1;
      const coords=[point(a,lo),point(b,lo),point(b,hi),point(a,hi)];
      const uv=[[a,(lo+1)/2],[b,(lo+1)/2],[b,(hi+1)/2],[a,(hi+1)/2]];
      patches.push({coords,u:a,v:(lo+1)/2});
      triangle(leaves,...coords.slice(0,3),uv.slice(0,3),[a,b,b]);triangle(leaves,coords[0],coords[2],coords[3],[uv[0],uv[2],uv[3]],[a,b,a]);
    }
  }
  return {limbs,patches,wood,leaves};
})();
function isPalm(tree){return Math.abs(Math.round(tree.z*.01)+Math.sign(tree.x))%3===1}
