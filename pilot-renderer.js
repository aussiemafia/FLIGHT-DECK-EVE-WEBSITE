const uniformModels=new Map(),motionLibrary=new Map();
function motionFor(body){
  if(!motionLibrary.has(body)){
    const request=Promise.all([0,1,2].map(async i=>{
      const r=await fetch('assets/crew/'+body+'-motion-'+i+'.gz');if(!r.ok)throw Error('Motion clip unavailable');
      const blob=await r.blob(),bytes=new Uint8Array(await blob.slice(0,2).arrayBuffer());
      const buf=bytes[0]===31&&bytes[1]===139?await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():await blob.arrayBuffer();
      return new Int16Array(buf)
    })).then(([first,second,third])=>{
      const stride=second.length/10,rest=first.slice(0,stride),out=new Int16Array(stride*30),delta=new Int32Array(stride);let at=0;
      for(const chunk of [first.subarray(stride),second,third])for(const d of chunk){const i=at%stride;delta[i]+=d;out[at++]=rest[i]+12*delta[i]}
      return out
    }).catch(e=>{motionLibrary.delete(body);throw e});
    motionLibrary.set(body,request);
  }
  return motionLibrary.get(body)
}
function uniformFor(actor){return [actor.p.body==='male'?'male':'female',actor.p.uniform==='tribal'?'tribal':'imperial',Math.min(5,Math.max(0,Math.round(actor.p.tone)||0))].join('-')}
async function loadUniform(key){
  if(uniformModels.has(key))return;
  uniformModels.set(key,null);
  try{
    const base='assets/crew/',[body,suit,tone]=key.split('-'),image=new Image(),mask=new Image();
    image.src=base+body+'-'+suit+'.webp?v=academy7';mask.src=base+body+'-skin.webp';
    const [buf,,motions]=await Promise.all([fetch(base+key.split('-')[0]+'.mesh').then(r=>{if(!r.ok)throw Error();return r.arrayBuffer()}),image.decode(),motionFor(body),mask.decode()]);
    const [count,ic,frames]=new Uint32Array(buf,0,3),indices=new Uint16Array(buf,12,ic),off=12+ic*2;
    const uv=new Uint16Array(buf,off,count*2),mesh=new Int16Array(buf,off+count*4);
    const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
    const motion=motions,headPoints=[],neck=[],top=Math.max(...Array.from({length:count},(_,i)=>mesh[10*count*3+i*3+1]));
    for(let j=0;j<count*3;j+=3){const y=mesh[10*count*3+j+1]/top;if(y>.92)headPoints.push(j);if(y>.845)neck.push([j,Math.min(1,(y-.845)/.045)])}
    const pixels=ctx.getImageData(0,0,c.width,c.height);
    ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(mask,0,0,c.width,c.height);const coverage=ctx.getImageData(0,0,c.width,c.height).data;
    const palette=[[1.08,1.08,1.08],[1,1,1],[.88,.79,.71],[.77,.64,.53],[.58,.44,.36],[.42,.31,.26]][Number(tone)];
    for(let i=0;i<pixels.data.length;i+=4){const weight=coverage[i]/255;for(let k=0;k<3;k++)pixels.data[i+k]*=1+weight*(palette[k]-1)}
    ctx.putImageData(pixels,0,0);
    uniformModels.set(key,{canvas:c,motion,headPoints,neck,indices,uv,mesh,count,frames,tex:pixels.data,tw:c.width,th:c.height});
  }catch{setTimeout(()=>uniformModels.delete(key),3000)}
}
window.renderPilot=(()=>{
  return function(actor,angle,dist,now){
    const key=uniformFor(actor);loadUniform(key);const data=uniformModels.get(key);if(!data)return;
    if(window.hdStation&&!actor.preview)return;
    if(now-(actor.lastRender||0)<(dist>1500?150:65))return;
    actor.lastRender=now;
    const c=actor.canvas,mode=actor.p.state;
    const h=Math.min(640,Math.max(96,Math.ceil(220*innerHeight/Math.max(180,dist)/32)*32)),w=Math.ceil(h*.76);
    if(c.width!==w||c.height!==h){c.width=w;c.height=h;actor.image=null}
    const {count,indices,uv,tex,tw,th}=data,cs=Math.cos(angle),sn=Math.sin(angle);
    const points=animateOfficer(actor,data,now),scale=h*.53;
    const screen=actor.coords?.length===count*3?actor.coords:(actor.coords=new Float32Array(count*3));
    for(let k=0;k<count*3;k+=3){
      const x=points[k]/10000,y=points[k+1]/10000,z=points[k+2]/10000;
      screen[k]=w*.5+(x*cs-z*sn)*scale;screen[k+1]=h*.98-y*scale;screen[k+2]=x*sn+z*cs;
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
