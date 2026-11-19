'use strict';
// Feather palm with paired, folded leaflets borne on arching fronds.
const palmParts=(()=>{
  const limbs=[],leaflets=[];const trunk=t=>[12*Math.sin(t*1.55),-226*t,6*t*t];
  for(let i=0;i<17;i++)limbs.push({a:trunk(i/17),b:trunk((i+1)/17),r:7-i*.18});
  const crown=trunk(1);
  for(let f=0;f<17;f++){
    const ang=f*2.39996,c=Math.cos(ang),s=Math.sin(ang),len=74+(f%4)*12,up=48+(f%3)*12;
    const point=t=>[crown[0]+c*len*t,crown[1]-up*Math.sin(t*Math.PI*.93)+t*t*31,crown[2]+s*len*t];
    for(let i=0;i<12;i++){
      const t=i/12,a=point(t),b=point((i+1)/12);limbs.push({a,b,r:1.5*(1-t)+.4});
      for(const side of [-1,1]){
        const span=8+23*Math.sin((t+.1)*Math.PI*.87),tip=[a[0]-s*span*side+c*15,a[1]+span*.6,a[2]+c*span*side+s*15];
        const mid=[(tip[0]+a[0])/2,(tip[1]+a[1])/2-3,(tip[2]+a[2])/2];
        leaflets.push([a,[mid[0]+c*2.9,mid[1],mid[2]+s*2.9],tip,[mid[0]-c*2.3,mid[1]+1,mid[2]-s*2.3],(f+i)%4]);
      }
    }
  }
  return {limbs,leaflets};
})();
function isPalm(tree){return Math.abs(Math.round(tree.z*.01)+Math.sign(tree.x))%3===1}
