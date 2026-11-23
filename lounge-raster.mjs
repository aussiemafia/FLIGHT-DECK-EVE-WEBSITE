// Project the actual indexed lounge mesh when the visitor's browser has no WebGL context.
export function renderSoftwareSeats(geometry){
 const xyz=geometry.attributes.position.array,norm=geometry.attributes.normal.array,idx=geometry.index.array;
 const finishes=[[39,47,51],[163,146,118],[231,220,195],[43,90,88],[143,83,54],[174,143,97],[231,198,131],[73,197,204]];
 const mats=new Uint8Array(idx.length/3);
 for(const g of geometry.groups)mats.fill(g.materialIndex,g.start/3,(g.start+g.count)/3);
 const seats=loungeSeats.map(s=>{
   const canvas=document.createElement('canvas');canvas.className='plane mesh-seat';canvas.width=250;canvas.height=314;
   canvas.style.cssText='width:184px;height:230px;left:-92px;top:-115px;backface-visibility:visible';
   world.append(canvas);const ctx=canvas.getContext('2d');
   return {s,canvas,ctx,pixels:ctx.createImageData(canvas.width,canvas.height),last:''};
 });
 const verts=xyz.length/3,px=new Float32Array(verts),py=new Float32Array(verts),pz=new Float32Array(verts),shade=new Float32Array(verts);
 const depth=new Float32Array(250*314);
 renderSeats=()=>{
   for(const obj of seats){
     const {s,canvas,ctx,pixels}=obj,dx=pos.x-s.x,dz=pos.z-s.z,d=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);
     const visible=d<980&&(d<160||(-dx*Math.sin(pos.yaw)+dz*Math.cos(pos.yaw))>0);
     canvas.hidden=!visible;if(!visible)continue;
     const eyeY=eye+deckLevel(pos.x,pos.z)-s.level,cy=65;
     canvas.style.transform='translate3d('+s.x+'px,'+(-s.level-cy)+'px,'+s.z+'px) rotateY('+yaw+'rad)';
     const key=[Math.round(yaw*60),Math.round(d/5),Math.round(eyeY/2)].join('/');
     if(obj.last===key)continue;obj.last=key;
     const ca=Math.cos(s.angle-yaw),sa=Math.sin(s.angle-yaw),cos=Math.cos(s.angle),sin=Math.sin(s.angle);
     for(let v=0;v<verts;v++){
       const i=3*v,x=xyz[i],y=xyz[i+1],z=xyz[i+2],dist=d-(-x*sa+z*ca),scale=d/Math.max(1,dist);
       px[v]=(92+(x*ca+z*sa)*scale)*250/184;py[v]=(115+cy-eyeY+(eyeY-y)*scale)*314/230;pz[v]=dist;
       const nx=norm[i]*cos+norm[i+2]*sin,nz=-norm[i]*sin+norm[i+2]*cos;
       shade[v]=.54+.53*Math.max(0,-.46*nx+.78*norm[i+1]+.42*nz)+.14*Math.max(0,.8*nx+.3*norm[i+1]-.4*nz);
     }
     depth.fill(Infinity);pixels.data.fill(0);
     for(let t=0;t<idx.length;t+=3){
       const a=idx[t],b=idx[t+1],c=idx[t+2],ax=px[a],ay=py[a],bx=px[b],by=py[b],cx=px[c],cyy=py[c];
       const den=(by-cyy)*(ax-cx)+(cx-bx)*(ay-cyy);
       if(Math.abs(den)<.001||Math.min(pz[a],pz[b],pz[c])<1)continue;
       const x0=Math.max(0,Math.floor(Math.min(ax,bx,cx))),x1=Math.min(249,Math.ceil(Math.max(ax,bx,cx)));
       const y0=Math.max(0,Math.floor(Math.min(ay,by,cyy))),y1=Math.min(313,Math.ceil(Math.max(ay,by,cyy)));
       const rgb=finishes[mats[t/3]],ia=1/den;
       for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
         const u=((by-cyy)*(x+.5-cx)+(cx-bx)*(y+.5-cyy))*ia,v=((cyy-ay)*(x+.5-cx)+(ax-cx)*(y+.5-cyy))*ia,w=1-u-v;
         if(u<0||v<0||w<0)continue;
         const z=u*pz[a]+v*pz[b]+w*pz[c],i=y*250+x;if(z>=depth[i])continue;depth[i]=z;
         const l=u*shade[a]+v*shade[b]+w*shade[c],j=i*4;
         pixels.data[j]=rgb[0]*l;pixels.data[j+1]=rgb[1]*l;pixels.data[j+2]=rgb[2]*l;pixels.data[j+3]=255;
       }
     }
     ctx.putImageData(pixels,0,0);
   }
 };
 draw();
}
