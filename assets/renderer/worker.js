// Offscreen fallback for machines that do not expose WebGL. The hull is always
// resident; depth testing, rather than room-entry events, determines visibility.
let wasm,sceneSize,scenePtr=65536,images,display,ctx,pixels,mem;
const verticesByLeaf=[];let previousShifts=[];
let phaseBudget=240000,avgDraw=16,drawCount=0,workStart;
let lastMotion=0,lastView='',lastDetail=false;
let width=0,height=0,lastMirror=-Infinity,paintedPose='';
const imageBytes=1024*1024*4;
function reserve(bytes){
  const diff=bytes-wasm.memory.buffer.byteLength;
  if(diff>0)wasm.memory.grow(Math.ceil(diff/65536));
  mem=wasm.memory.buffer;
}
async function initialize({canvas,scene,doorVertices,urls}){
  const binary=await (await fetch('software.wasm?v=frames16')).arrayBuffer();
  wasm=(await WebAssembly.instantiate(binary,{env:{abort:()=>{throw Error('Renderer allocation failed')}}})).instance.exports;
  for(const [leaf,index,x,z] of doorVertices){
    (verticesByLeaf[leaf]??=[]).push(index,x,z);
  }
  sceneSize=scene.byteLength/68;images=scenePtr+scene.byteLength;display=images+urls.length*imageBytes;
  reserve(display+32);
  new Uint8Array(mem,scenePtr,scene.byteLength).set(new Uint8Array(scene));
  ctx=canvas.getContext('2d',{alpha:false});self.output=canvas;
  const tile=new OffscreenCanvas(1024,1024),ink=tile.getContext('2d',{willReadFrequently:true});
  await Promise.all(urls.map(async(url,i)=>{
    let bitmap;
    if(url.endsWith('.svg')){
      // The main thread rasterizes authored vector materials at their native asset size.
      return;
    }
    const response=await fetch(url);bitmap=await createImageBitmap(await response.blob());
    ink.clearRect(0,0,1024,1024);ink.drawImage(bitmap,0,0,1024,1024);
    new Uint8Array(mem,images+i*imageBytes,imageBytes).set(ink.getImageData(0,0,1024,1024).data);bitmap.close();
  }));
  self.postMessage('ready');
}
self.onmessage=async({data})=>{
 if(data.type==='init'){try{await initialize(data)}catch(e){self.postMessage({error:String(e)})}return;}
 if(data.type==='material'){new Uint8Array(mem,images+6*imageBytes,imageBytes).set(new Uint8Array(data.bytes));return;}
 if(!wasm||!ctx)return;
 const {x,y,z,yaw,pitch,now}=data;
 const view=[x,y,z,yaw,pitch,data.w,data.h,...data.shifts.flat()].join('/');
 if(view!==lastView){lastMotion=now;lastView=view;}
 const detailed=now-lastMotion>450;
 // Resolve the stationary view at higher detail once, outside the walking budget.
 if(detailed&&lastDetail){self.postMessage('idle');return;}
 lastDetail=detailed;
 const budget=detailed?Math.max(phaseBudget,950000):phaseBudget;
 const scale=Math.min(1,Math.sqrt(budget/(data.w*data.h)));
 const w=Math.round(data.w*scale),h=Math.round(data.h*scale),lens=data.lens*scale;
 const mw=Math.max(1,Math.round(w*.28)),mh=Math.max(1,Math.round(h*.28));
 const depth=display+w*h*4,mirror=depth+w*h*4,mirrorDepth=mirror+mw*mh*4;
 if(width!==w||height!==h){
   width=w;height=h;self.output.width=w;self.output.height=h;reserve(mirrorDepth+mw*mh*4+65536);
   pixels=new ImageData(new Uint8ClampedArray(mem,display,w*h*4),w,h);lastMirror=-Infinity;
 }
 const shifts=data.shifts;
 const pose=[x,y,z,yaw,pitch,w,h,...shifts.flat()].join('/');
 const geometry=new Float32Array(mem,scenePtr,sceneSize*17);
 for(let leaf=0;leaf<shifts.length;leaf++){
   const [dx,dz]=shifts[leaf],previous=previousShifts[leaf];
   if(dx===(previous?.[0]??0)&&dz===(previous?.[1]??0))continue;
   const vertices=verticesByLeaf[leaf]||[];
   for(let i=0;i<vertices.length;i+=3){
     const index=vertices[i];geometry[index]=vertices[i+1]+dx;geometry[index+2]=vertices[i+2]+dz;
   }
 }
 previousShifts=shifts;
 const redraw=pose!==paintedPose||now-lastMirror>250;
 if(redraw){
   workStart=performance.now();
   const args=[x,y,z,Math.sin(yaw),Math.cos(yaw),Math.sin(pitch),Math.cos(pitch)];
   const batchPtr=mirrorDepth+mw*mh*4;
   new Int32Array(mem,batchPtr,data.batches.length).set(data.batches);
   if(now-lastMirror>250){
     wasm.render(scenePtr,batchPtr,data.batches.length/2,mirror,mirrorDepth,images,mw,mh,...args,lens*mw/w,1,0,0,0);lastMirror=now;
   }
   wasm.render(scenePtr,batchPtr,data.batches.length/2,display,depth,images,w,h,...args,lens,0,mirror,mw,mh);
   ctx.putImageData(pixels,0,0);paintedPose=pose;
   avgDraw=avgDraw*.85+(performance.now()-workStart)*.15;
   if(!detailed&&++drawCount>=12){drawCount=0;const next=avgDraw>8?.78:avgDraw<5?1.12:1;
     phaseBudget=Math.max(75000,Math.min(1050000,phaseBudget*next));
   }
 }
 self.postMessage(redraw?'frame':'idle');
};
