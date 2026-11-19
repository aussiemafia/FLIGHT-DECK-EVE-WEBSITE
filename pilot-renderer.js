const uniformModels=new Map();
function uniformFor(actor){return actor.p.uniform==='tribal'?'male-tribal':'female-imperial'}
async function loadUniform(key){
  if(uniformModels.has(key))return;
  uniformModels.set(key,null);
  try{
    const base='assets/crew/',image=new Image();image.src=base+key+'.webp';
    const [buf]=await Promise.all([fetch(base+key.split('-')[0]+'.mesh').then(r=>{if(!r.ok)throw Error();return r.arrayBuffer()}),image.decode()]);
    const [count,ic,frames]=new Uint32Array(buf,0,3),indices=new Uint16Array(buf,12,ic),off=12+ic*2;
    const uv=new Uint16Array(buf,off,count*2),mesh=new Int16Array(buf,off+count*4);
    const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
    uniformModels.set(key,{indices,uv,mesh,count,frames,tex:ctx.getImageData(0,0,c.width,c.height).data,tw:c.width,th:c.height});
  }catch{setTimeout(()=>uniformModels.delete(key),3000)}
}
window.renderPilot=(()=>{
  return function(actor,angle,dist,now){
    const key=uniformFor(actor);loadUniform(key);const data=uniformModels.get(key);if(!data)return;
    if(window.hdStation)return;
    if(now-(actor.lastRender||0)<(dist>1500?150:65))return;
    actor.lastRender=now;
    const c=actor.canvas,mode=actor.p.state;
    const h=Math.min(640,Math.max(96,Math.ceil(220*innerHeight/Math.max(180,dist)/32)*32)),w=Math.ceil(h*.76);
    if(c.width!==w||c.height!==h){c.width=w;c.height=h;actor.image=null}
    const cycle=(now*.0075)%8,pose=mode==='walking'?Math.floor(cycle):mode==='seated'?8:mode==='reading'||mode==='projecting'?9:10;
    const mouth=Math.round((window.crewRadio?.level(actor.p.id)||0)*12)/12;
    const stamp=key+'/'+mouth+'/'+w+'/'+pose+'/'+Math.round(angle*100);
    if(stamp===actor.painted&&mode!=='walking')return;
    actor.painted=stamp;
    const {count,mesh,indices,uv,tex,tw,th}=data,cs=Math.cos(angle),sn=Math.sin(angle);
    const next=mode==='walking'?(pose+1)%8:pose,t=mode==='walking'?cycle%1:0,scale=h*.57;
    const screen=actor.coords?.length===count*3?actor.coords:(actor.coords=new Float32Array(count*3));
    const a=pose*count*3,b=next*count*3;
    for(let k=0;k<count*3;k+=3){
      const delta=j=>mouth*(mesh[11*count*3+j]-mesh[10*count*3+j]);
      const x=(delta(k)+mesh[a+k]*(1-t)+mesh[b+k]*t)/10000,y=(delta(k+1)+mesh[a+k+1]*(1-t)+mesh[b+k+1]*t)/10000,z=(delta(k+2)+mesh[a+k+2]*(1-t)+mesh[b+k+2]*t)/10000;
      screen[k]=w*.5+(x*cs-z*sn)*scale;screen[k+1]=h*.98-(y-(mode==='seated'?.26:0))*scale;
      screen[k+2]=x*sn+z*cs;
    }
    const ctx=c.getContext('2d'),im=actor.image||(actor.image=ctx.createImageData(w,h)),out=im.data;
    const zb=actor.zbuffer?.length===w*h?actor.zbuffer:(actor.zbuffer=new Float32Array(w*h));zb.fill(-Infinity);out.fill(0);
    for(let j=0;j<indices.length;j+=3){
      const i=indices[j],k=indices[j+1],l=indices[j+2],p=i*3,q=k*3,r=l*3;
      const x=screen[p],y=screen[p+1],ax=screen[q]-x,ay=screen[q+1]-y,bx=screen[r]-x,by=screen[r+1]-y,det=ax*by-ay*bx;
      if(Math.abs(det)<.012)continue;
      const left=Math.max(0,Math.floor(Math.min(x,x+ax,x+bx))),right=Math.min(w-1,Math.ceil(Math.max(x,x+ax,x+bx)));
      const top=Math.max(0,Math.floor(Math.min(y,y+ay,y+by))),bottom=Math.min(h-1,Math.ceil(Math.max(y,y+ay,y+by)));
      const z=screen[p+2],az=screen[q+2]-z,bz=screen[r+2]-z;
      const u0=uv[i*2],v0=uv[i*2+1],du=uv[k*2]-u0,dv=uv[k*2+1]-v0,eu=uv[l*2]-u0,ev=uv[l*2+1]-v0;
      for(let py=top;py<=bottom;py++)for(let px=left;px<=right;px++){
        const dx=px+.5-x,dy=py+.5-y,h1=(dx*by-dy*bx)/det,h2=(ax*dy-ay*dx)/det;
        if(h1<0||h2<0||h1+h2>1)continue;
        const depth=z+az*h1+bz*h2,index=py*w+px;if(depth<=zb[index])continue;
        const tx=Math.min(tw-1,Math.max(0,Math.round((u0+du*h1+eu*h2)*(tw-1)/65535)));
        const ty=Math.min(th-1,Math.max(0,Math.round((v0+dv*h1+ev*h2)*(th-1)/65535)));
        const src=(ty*tw+tx)*4,dst=index*4,kLight=.92+.16*(1-py/h);
        if(tex[src+3]<90)continue;zb[index]=depth;out[dst]=tex[src]*kLight;out[dst+1]=tex[src+1]*kLight;out[dst+2]=tex[src+2]*kLight;out[dst+3]=255;
      }
    }
    ctx.putImageData(im,0,0);
  };
})();
