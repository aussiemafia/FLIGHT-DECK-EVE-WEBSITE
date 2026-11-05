// Offscreen fallback for machines that do not expose WebGL. The hull is always
// resident; depth testing, rather than room-entry events, determines visibility.
let wasm,sceneSize,scenePtr=65536,images,display,ctx,pixels,mem;
let width=0,height=0,lastMirror=-Infinity,paintedPose='';
const imageBytes=1024*1024*4;
function reserve(bytes){
  const diff=bytes-wasm.memory.buffer.byteLength;
  if(diff>0)wasm.memory.grow(Math.ceil(diff/65536));
  mem=wasm.memory.buffer;
}
async function initialize({canvas,scene,urls}){
  const binary=await (await fetch('software.wasm?v=3')).arrayBuffer();
  wasm=(await WebAssembly.instantiate(binary,{env:{abort:()=>{throw Error('Renderer allocation failed')}}})).instance.exports;
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
 const {w,h,x,y,z,yaw,pitch,lens,now}=data;
 const mw=Math.max(1,Math.round(w*.55)),mh=Math.max(1,Math.round(h*.55));
 const depth=display+w*h*4,mirror=depth+w*h*4,mirrorDepth=mirror+mw*mh*4;
 if(width!==w||height!==h){
   width=w;height=h;self.output.width=w;self.output.height=h;reserve(mirrorDepth+mw*mh*4);
   pixels=new ImageData(new Uint8ClampedArray(mem,display,w*h*4),w,h);lastMirror=-Infinity;
 }
 const pose=[x,y,z,yaw,pitch,w,h].join('/');
 if(pose!==paintedPose||now-lastMirror>160){
   const args=[x,y,z,Math.sin(yaw),Math.cos(yaw),Math.sin(pitch),Math.cos(pitch)];
   if(pose!==paintedPose||now-lastMirror>160){
     wasm.render(scenePtr,sceneSize,mirror,mirrorDepth,images,mw,mh,...args,lens*mw/w,1,0,0,0);lastMirror=now;
   }
   wasm.render(scenePtr,sceneSize,display,depth,images,w,h,...args,lens,0,mirror,mw,mh);
   ctx.putImageData(pixels,0,0);paintedPose=pose;
 }
 self.postMessage('frame');
};
