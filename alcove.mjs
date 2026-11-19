import * as T from './assets/engine/three.mjs';

// This authored GLB contains one static mesh with five uncompressed material primitives.
export async function loadAlcove(path='assets/interior/projector-alcove.glb'){
  const bytes=await fetch(path).then(r=>r.arrayBuffer());
  const view=new DataView(bytes),length=view.getUint32(12,true);
  const model=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,length))),start=28+length;
  function attribute(i){
    const a=model.accessors[i],v=model.bufferViews[a.bufferView],off=start+(v.byteOffset||0)+(a.byteOffset||0);
    const count=a.type==='VEC3'?3:1;
    const Format={5126:Float32Array,5123:Uint16Array,5125:Uint32Array}[a.componentType];
    const array=new Format(bytes,off,a.count*count);
    return a.componentType===5126?new T.Float32BufferAttribute(array,count):new T.Uint16BufferAttribute(array,count);
  }
  const group=new T.Group();
  for(const p of model.meshes[0].primitives){
    const desc=model.materials[p.material],base=desc.pbrMetallicRoughness;
    const glass=desc.name==='Overhead glass';
    const m=new T.MeshPhysicalMaterial({color:new T.Color(...base.baseColorFactor.slice(0,3)),metalness:base.metallicFactor,
      roughness:base.roughnessFactor,side:T.DoubleSide,clearcoat:.4,transparent:glass,opacity:glass?.12:1,depthWrite:!glass,emissive:desc.name==='Horizon light'?0x98dce9:desc.name==='Cove light'?0xffdd93:0,emissiveIntensity:.8});
    const geom=new T.BufferGeometry();geom.setAttribute('position',attribute(p.attributes.POSITION));geom.setAttribute('normal',attribute(p.attributes.NORMAL));geom.setIndex(attribute(p.indices));
    const mesh=new T.Mesh(geom,m);mesh.userData.sharedAlcove=true;group.add(mesh);
  }
  return group;
}
