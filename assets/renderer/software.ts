// Software depth-buffer renderer for browsers with WebGL disabled.
// Each input triangle has 15 float vertex attributes, an RGBA word and a material index.
let width:i32=0,height:i32=0,buffer:usize=0,depths:usize=0,texture:usize=0;
let eyesX:f64=0,eyesY:f64=0,eyesZ:f64=0,sy:f64=0,cy:f64=1,sp:f64=0,cp:f64=1,lens:f64=1;
let reflected:bool=false,reflection:usize=0,reflW:i32=0,reflH:i32=0;
const scratch:usize=1024,clip:usize=1280;
@inline function tex(index:i32,u:f64,v:f64):u32{
 const col=i32(Math.min(1023,Math.max(0,u*1023))),row=i32(Math.min(1023,Math.max(0,v*1023)));
 return load<u32>(texture+usize(((index<<20)+(row<<10)+col)<<2));
}
@inline function sky(dx:f64,dy:f64,dz:f64):u32{
 const ax=Math.abs(dx),ay=Math.abs(dy),az=Math.abs(dz);let k:i32,u:f64,v:f64,m:f64;
 if(ax>=ay&&ax>=az){k=dx>0?0:1;m=ax;u=dx>0?-dz:dz;v=-dy;}
 else if(ay>=az){k=dy>0?2:3;m=ay;u=dx;v=dy>0?dz:-dz;}
 else{k=dz>0?4:5;m=az;u=dz>0?dx:-dx;v=-dy;}
 return tex(k,.5+.5*u/m,.5+.5*v/m)|0xff000000;
}
@inline function blend(a:u32,b:u32,t:u32):u32{
 const s=256-t;
 return 0xff000000|((((a&255)*s+(b&255)*t)>>8)&255)|(((((a>>8)&255)*s+((b>>8)&255)*t)>>8)<<8)|(((((a>>16)&255)*s+((b>>16)&255)*t)>>8)<<16);
}
@inline function filtered(ptr:usize,w:i32,h:i32,u:f64,v:f64):u32{
 const x=Math.max(0,Math.min(f64(w-1),u)),y=Math.max(0,Math.min(f64(h-1),v));
 const ix=i32(x),iy=i32(y),jx=min(ix+1,w-1),jy=min(iy+1,h-1);
 const fx=u32((x-f64(ix))*256),fy=u32((y-f64(iy))*256);
 const top=blend(load<u32>(ptr+usize((iy*w+ix)<<2)),load<u32>(ptr+usize((iy*w+jx)<<2)),fx);
 const bottom=blend(load<u32>(ptr+usize((jy*w+ix)<<2)),load<u32>(ptr+usize((jy*w+jx)<<2)),fx);
 return blend(top,bottom,fy);
}
function triangle(a:usize,b:usize,c:usize,color:u32,kind:i32):void{
 const za=1.0/load<f32>(a+8),zb=1.0/load<f32>(b+8),zc=1.0/load<f32>(c+8);
 const ax=f64(width)*.5+load<f32>(a)*za*lens,ay=f64(height)*.5+load<f32>(a+4)*za*lens;
 const bx=f64(width)*.5+load<f32>(b)*zb*lens,by=f64(height)*.5+load<f32>(b+4)*zb*lens;
 const cx=f64(width)*.5+load<f32>(c)*zc*lens,vy=f64(height)*.5+load<f32>(c+4)*zc*lens;
 const lx=i32(Math.max(0,Math.floor(Math.min(ax,Math.min(bx,cx))))),rx=i32(Math.min(f32(width-1),Math.ceil(Math.max(ax,Math.max(bx,cx)))));
 const ly=i32(Math.max(0,Math.floor(Math.min(ay,Math.min(by,vy))))),ry=i32(Math.min(f32(height-1),Math.ceil(Math.max(ay,Math.max(by,vy)))));
 if(lx>rx||ly>ry)return;
 const determinant=(by-vy)*(ax-cx)+(cx-bx)*(ay-vy);if(Math.abs(determinant)<.001)return;
 const da=(by-vy)/determinant,db=(vy-ay)/determinant,ea=(cx-bx)/determinant,eb=(ax-cx)/determinant;
 const au=load<f32>(a+12)*za,av=load<f32>(a+16)*za,bu=load<f32>(b+12)*zb,bv=load<f32>(b+16)*zb,cu=load<f32>(c+12)*zc,cv=load<f32>(c+16)*zc;
 for(let y=ly;y<=ry;y++){
   let wa=da*(f32(lx)+.5-cx)+ea*(f32(y)+.5-vy),wb=db*(f32(lx)+.5-cx)+eb*(f32(y)+.5-vy);
   let addr=usize((y*width+lx)<<2);
   for(let x=lx;x<=rx;x++,addr+=4,wa+=da,wb+=db){
     const wc=1.0-wa-wb;if(wa<-.0001||wb<-.0001||wc<-.0001)continue;
     const z=za*wa+zb*wb+zc*wc;if(z<=load<f32>(depths+addr))continue;
     let pixel=color;
     if(kind>=6){pixel=tex(kind,(wa*au+wb*bu+wc*cu)/z,(wa*av+wb*bv+wc*cv)/z);if((pixel>>24)<64)continue;}
     if(kind==6){
       pixel=filtered(texture+usize(6<<22),1024,1024,((wa*au+wb*bu+wc*cu)/z)*1023.,((wa*av+wb*bv+wc*cv)/z)*1023.);
     }
     if(kind==1&&!reflected){
       const u=(wa*au+wb*bu+wc*cu)/z,v=(wa*av+wb*bv+wc*cv)/z;
       const tile=tex(10,u-Math.floor(u),v-Math.floor(v));
       const reflectionColor=filtered(reflection,reflW,reflH,(f64(x)+.5)*reflW/width-.5,(f64(y)+.5)*reflH/height-.5);
       pixel=blend(tile,reflectionColor,102);
     }
     store<f32>(depths+addr,f32(z));store<u32>(buffer+addr,pixel|0xff000000);
   }
 }
}
export function render(scene:usize,count:i32,target:usize,depth:usize,images:usize,w:i32,h:i32,ex:f64,ey:f64,ez:f64,sine:f64,cosine:f64,sinp:f64,cosp:f64,f:f64,mirror:bool,mirrorBuf:usize,mw:i32,mh:i32):void{
 width=w;height=h;buffer=target;depths=depth;texture=images;eyesX=ex;eyesY=ey;eyesZ=ez;sy=sine;cy=cosine;sp=sinp;cp=cosp;lens=f;reflected=mirror;reflection=mirrorBuf;reflW=mw;reflH=mh;
 memory.fill(depth,0,usize(w*h*4));
 for(let n=0;n<count;n++,scene+=68){
   const kind=load<i32>(scene+64);if(mirror&&kind==1)continue;
   let front=0,left=0,right=0,up=0,down=0;
   for(let i=0;i<3;i++){
     const src=scene+usize(i*20),dst=scratch+usize(i*20);
     const x=load<f32>(src)-ex,y=(mirror?832.0-load<f32>(src+4):load<f32>(src+4))-ey,z=load<f32>(src+8)-ez;
     const forward=sy*x-cy*z,hx=cy*x+sy*z,hy=cp*y-sp*forward,hz=cp*forward+sp*y;
     store<f32>(dst,f32(hx));store<f32>(dst+4,f32(hy));store<f32>(dst+8,f32(hz));memory.copy(dst+12,src+12,8);
     if(hz>=3)front++;if(hx*f < -hz*f32(w)*.5)left++;if(hx*f>hz*f32(w)*.5)right++;
     if(hy*f < -hz*f32(h)*.5)up++;if(hy*f>hz*f32(h)*.5)down++;
   }
   if(!front||left==3||right==3||up==3||down==3)continue;
   const col=load<u32>(scene+60);if(front==3){triangle(scratch,scratch+20,scratch+40,col,kind);continue;}
   let num=0;
   for(let i=0;i<3;i++){
     const a=scratch+usize((i+2)%3*20),b=scratch+usize(i*20),az=load<f32>(a+8),bz=load<f32>(b+8);
     if((az>=3)!=(bz>=3)){const t=(3.0-az)/(bz-az),dst=clip+usize(num++*20);for(let k:usize=0;k<20;k+=4){const av=load<f32>(a+k);store<f32>(dst+k,f32(av+t*(load<f32>(b+k)-av)));}}
     if(bz>=3)memory.copy(clip+usize(num++*20),b,20);
   }
   for(let i=1;i<num-1;i++)triangle(clip,clip+usize(i*20),clip+usize((i+1)*20),col,kind);
 }
 for(let y=0;y<h;y++){
   const v=(f32(y)+.5-f32(h)*.5)/f,vert=cp*v+sp,fr=sp*v-cp;
   for(let x=0;x<w;x++){const a=usize((y*w+x)<<2);if(load<f32>(depth+a)>0)continue;
     const u=(f32(x)+.5-f32(w)*.5)/f;store<u32>(target+a,sky(cy*u-sy*fr,mirror?vert:-vert,-(sy*u+cy*fr)));
   }
 }
}
