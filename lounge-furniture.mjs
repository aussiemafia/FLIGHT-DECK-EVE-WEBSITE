import * as T from './assets/engine/three.mjs';

// Seat positions, the camera and the depth mask all use the walking scene's coordinates.
async function install(){
 const data=new DataView(await fetch('assets/engine/lounge.mesh').then(r=>{if(!r.ok)throw Error('Seat mesh unavailable');return r.arrayBuffer()}));
 const geometry=new T.BufferGeometry(),positions=new Float32Array(data.getUint32(0,true)*3),indices=[];
 const groups=data.getUint32(4,true);let cursor=8;
 for(let i=0;i<positions.length;i++,cursor+=2)positions[i]=data.getInt16(cursor,true)/20;
 for(let group=0;group<groups;group++){
   const count=data.getUint32(cursor,true);cursor+=4;geometry.addGroup(indices.length,count,group);
   for(let i=0;i<count;i++,cursor+=2)indices.push(data.getUint16(cursor,true));
 }
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const canvas=document.createElement('canvas');canvas.id='lounge-furniture';canvas.setAttribute('aria-hidden','true');
 let render;
 try{render=new T.WebGLRenderer({canvas,alpha:true,antialias:true})}
 catch{const {renderSoftwareSeats}=await import('./lounge-raster.mjs');renderSoftwareSeats(geometry);return}
 render.setClearColor(0,0);render.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(60,1,2,6000);
 const finishes=[0x272f32,0x88755a,0xe8d9b4,0x285658,0x854e36,0xb99765,0xeed28b,0x6bdacd].map((color,i)=>
   new T.MeshStandardMaterial({color,roughness:i===3?.84:.33,metalness:[1,5,6].includes(i)?.34:.07,side:T.DoubleSide}));
 scene.add(new T.HemisphereLight(0xfff0d5,0x7e9a9f,1.8));
 for(const [x,y,z,c,power] of [[-300,600,-550,0xffe7b8,2.2],[400,550,370,0xa9deed,1.1]]){
   const light=new T.DirectionalLight(c,power);light.position.set(x,y,z);scene.add(light);
 }
 for(const s of loungeSeats){
   const mesh=new T.Mesh(geometry,finishes);mesh.position.set(s.x,s.level,s.z);mesh.rotation.y=s.angle;scene.add(mesh);
 }
 const maskVertices=[],mirror=new T.Matrix4().makeScale(1,-1,1);
 for(const el of world.querySelectorAll('.wall,.hull,.flute,.art,.sign,.instrument-base')){
   const w=parseFloat(el.style.width)/2,h=parseFloat(el.style.height)/2;
   const transform=new T.Matrix4().fromArray(new DOMMatrix(el.style.transform).toFloat64Array());
   transform.premultiply(mirror).multiply(mirror);
   for(const [x,y] of [[-w,-h],[w,-h],[w,h],[-w,-h],[w,h],[-w,h]]){
     const v=new T.Vector3(x,y,0).applyMatrix4(transform);maskVertices.push(v.x,v.y,v.z);
   }
 }
 const mask=new T.BufferGeometry();mask.setAttribute('position',new T.Float32BufferAttribute(maskVertices,3));
 const occluder=new T.Mesh(mask,new T.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:T.DoubleSide}));occluder.renderOrder=-1;scene.add(occluder);
 let width=0,height=0;
 renderSeats=f=>{
   if(width!==innerWidth||height!==innerHeight){
     width=innerWidth;height=innerHeight;render.setPixelRatio(Math.min(devicePixelRatio||1,1.5));render.setSize(width,height,false);
   }
   cam.aspect=width/height;cam.fov=2*Math.atan(height/(2*f))*180/Math.PI;cam.updateProjectionMatrix();
   cam.position.set(pos.x,eye+deckLevel(pos.x,pos.z),pos.z);cam.rotation.set(pos.pitch,-pos.yaw,0,'YXZ');render.render(scene,cam);
 };
 view.append(canvas);draw();
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();renderSeats=null;canvas.remove();import('./lounge-raster.mjs').then(m=>m.renderSoftwareSeats(geometry))});
}
install().catch(error=>{console.warn('Using sculpted compatibility seats:',error.message);fallbackSeats()});
