// Offscreen fallback for machines that do not expose WebGL. The hull is always
// resident; depth testing, rather than room-entry events, determines visibility.
let wasm,sceneSize,scenePtr=65536,images,display,ctx,pixels,mem;
const verticesByLeaf=[];let previousShifts=[];
let phaseBudget=720000,avgDraw=16,drawCount=0,workStart;
let lastMotion=0,lastView='',lastDetail=false;
let width=0,height=0,paintedPose='';
const imageBytes=1024*1024*4;
function reserve(bytes){
  const diff=bytes-wasm.memory.buffer.byteLength;
  if(diff>0)wasm.memory.grow(Math.ceil(diff/65536));
  mem=wasm.memory.buffer;
}
async function initialize({canvas,scene,doorVertices,urls}){
  const binary=await (await fetch('software.wasm?v=holodeck-hd-5')).arrayBuffer();
  wasm=(await WebAssembly.instantiate(binary,{env:{abort:()=>{throw Error('Renderer allocation failed')}}})).instance.exports;
  for(const [leaf,index,x,z] of doorVertices){
    (verticesByLeaf[leaf]??=[]).push(index,x,z);
  }
  sceneSize=scene.byteLength/68;images=scenePtr+scene.byteLength;display=images+(urls.length+1)*imageBytes;
  reserve(display+32);
  new Uint8Array(mem,scenePtr,scene.byteLength).set(new Uint8Array(scene));
  ctx=canvas.getContext('2d',{alpha:false});self.output=canvas;
  const tile=new OffscreenCanvas(1024,1024),ink=tile.getContext('2d',{willReadFrequently:true});
  await Promise.all(urls.map(async(url,i)=>{
    let bitmap;
    if(!url||url.endsWith('.svg')){
      // The main thread rasterizes authored vector materials at their native asset size.
      return;
    }
    const response=await fetch(url);bitmap=await createImageBitmap(await response.blob());
    ink.clearRect(0,0,1024,1024);ink.drawImage(bitmap,0,0,1024,1024);
    new Uint8Array(mem,images+i*imageBytes,imageBytes).set(ink.getImageData(0,0,1024,1024).data);bitmap.close();
  }));
  self.postMessage('ready');
}
const neutralMaterials=new Map();
let originalColors;
self.onmessage=async({data})=>{
 if(data.type==='init'){try{await initialize(data)}catch(e){self.postMessage({error:String(e)})}return;}
 if(data.type==='system-sky'){
   const face=new OffscreenCanvas(1024,1024),ink=face.getContext('2d',{willReadFrequently:true});
   data.bitmaps.forEach((bitmap,i)=>{ink.drawImage(bitmap,0,0,1024,1024);bitmap.close();
    new Uint8Array(mem,images+i*imageBytes,imageBytes).set(ink.getImageData(0,0,1024,1024).data);});
   paintedPose='';lastDetail=false;return;
 }
 if(data.type==='light'){
   const words=new Uint32Array(mem,scenePtr,sceneSize*17);
   if(!originalColors)originalColors=Uint32Array.from({length:sceneSize},(_,i)=>words[i*17+15]);
   for(let i=0;i<sceneSize;i++){
     const j=i*17+15, color=originalColors[i];
     if(color===0xff010203) words[j]=data.night?0xffd1bf30:0xff25201d;
     else if(data.night && words[j+1]===0){
       const channel=shift=>Math.round(((color>>>shift)&255)*.13);
       words[j]=(255<<24)|(channel(16)<<16)|(channel(8)<<8)|channel(0);
     } else words[j]=color;
   }
   for(const slot of [6,10,11,12,13]){
    const bytes=new Uint8ClampedArray(mem,images+slot*imageBytes,imageBytes);
    if(!neutralMaterials.has(slot))neutralMaterials.set(slot,bytes.slice());
    const src=neutralMaterials.get(slot),[r,g,b]=(slot===10||slot===12?[1,1,1]:data.rgb).map(v=>v*(data.night && slot!==11?.13:1));
    for(let j=0;j<src.length;j+=4){bytes[j]=src[j]*r;bytes[j+1]=src[j+1]*g;bytes[j+2]=src[j+2]*b}
   }
   paintedPose='';lastDetail=false;return;
 }
 if(data.type==='material'){new Uint8Array(mem,images+13*imageBytes,imageBytes).set(new Uint8Array(data.lights));new Uint8Array(mem,images+6*imageBytes,imageBytes).set(new Uint8Array(data.bytes));return;}
 if(!wasm||!ctx)return;
 const {x,y,z,yaw,pitch,now}=data;
 const view=[x,y,z,yaw,pitch,data.w,data.h,...data.shifts.flat()].join('/');
 if(view!==lastView){lastMotion=now;lastView=view;}
 const detailed=now-lastMotion>450;
 // Resolve the stationary view at higher detail once, outside the walking budget.
 if(detailed&&lastDetail){self.postMessage("idle");return;}
 lastDetail=detailed;
 const budget=detailed?Math.min(8294400,data.w*data.h*Math.min(2,Math.max(1.25,data.dpr))**2):phaseBudget;
 const scale=Math.sqrt(Math.min(budget/(data.w*data.h),detailed?4:1));
 const w=Math.round(data.w*scale),h=Math.round(data.h*scale),lens=data.lens*scale;

 const depth=display+w*h*4,batchPtr=depth+w*h*4;
 if(width!==w||height!==h){
   width=w;height=h;self.output.width=w;self.output.height=h;reserve(batchPtr+Math.max(65536,data.batches.length*4));
   pixels=new ImageData(new Uint8ClampedArray(mem,display,w*h*4),w,h);
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
 const redraw=pose!==paintedPose;
 if(redraw){
   workStart=performance.now();
   const args=[x,y,z,Math.sin(yaw),Math.cos(yaw),Math.sin(pitch),Math.cos(pitch)];

   new Int32Array(mem,batchPtr,data.batches.length).set(data.batches);
   wasm.render(scenePtr,batchPtr,data.batches.length/2,display,depth,images,w,h,...args,lens,0,0,0,0);
   ctx.putImageData(pixels,0,0);paintedPose=pose;
   avgDraw=avgDraw*.85+(performance.now()-workStart)*.15;
   if(!detailed&&++drawCount>=12){drawCount=0;const next=avgDraw>28?.78:avgDraw<17?1.12:1;
     phaseBudget=Math.max(360000,Math.min(2073600,phaseBudget*next));
   }
 }
 self.postMessage(redraw?'frame':'idle');
};
