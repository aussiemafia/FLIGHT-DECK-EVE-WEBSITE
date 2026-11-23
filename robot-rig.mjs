import * as T from './assets/engine/three.mjs';

export async function loadStewardParts(){
  const [rig,bytes]=await Promise.all([
    fetch('assets/crew/steward-rig.json').then(r=>r.json()),
    fetch('assets/crew/steward.mesh').then(r=>r.arrayBuffer())
  ]);
  const view=new DataView(bytes);let offset=0;
  const parts=rig.parts.map(([bone,finish,count,tris])=>{
    const points=new Float32Array(count*3),normals=new Float32Array(count*3),indices=new Uint16Array(tris*3);
    for(let i=0;i<points.length;i++,offset+=2)points[i]=view.getInt16(offset,true)/100;
    for(let i=0;i<normals.length;i++,offset++)normals[i]=view.getInt8(offset)/127;
    for(let i=0;i<indices.length;i++,offset+=2)indices[i]=view.getUint16(offset,true);
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
    geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setIndex(new T.Uint16BufferAttribute(indices,1));
    return {bone,finish,geometry};
  });
  if(offset!==bytes.byteLength)throw Error('Unexpected steward mesh length');
  return {poses:rig.poses,parts};
}
export function stewardModel(rig,materials){
  const group=new T.Group(),bones=rig.poses[0].map(()=>new T.Group());
  group.add(...bones);for(const p of rig.parts)bones[p.bone].add(new T.Mesh(p.geometry,materials[p.finish]));
  const q=group.quaternion.clone(),v=new T.Vector3();
  // Interpolate the walk cycle with continuous tangents instead of a hard
  // velocity change at each authored keyframe. Blend smoothly to idle.
  group.userData.animate=motion=>{
    const frame=((motion.phase*8/Math.PI)%16+16)%16,base=Math.floor(frame),t=frame-base;
    const t2=t*t,t3=t2*t,blend=Math.max(0,Math.min(1,motion.weight));
    for(let i=0;i<bones.length;i++){
      const b=bones[i],a=rig.poses[base][i],next=rig.poses[(base+1)%16][i];
      const prev=rig.poses[(base+15)%16][i],after=rig.poses[(base+2)%16][i],rest=rig.poses[16][i];
      for(let axis=0;axis<3;axis++){
        const m0=(next[axis]-prev[axis])*.5,m1=(after[axis]-a[axis])*.5;
        const value=(2*t3-3*t2+1)*a[axis]+(t3-2*t2+t)*m0+
                    (-2*t3+3*t2)*next[axis]+(t3-t2)*m1;
        b.position.setComponent(axis,rest[axis]+(value-rest[axis])*blend);
      }
      b.quaternion.fromArray(a,3).slerp(q.fromArray(next,3),t).slerp(q.fromArray(rest,3),1-blend);
    }
    group.rotation.z=.008*Math.sin(motion.phase)*blend;
    group.rotation.x=.006*Math.sin(motion.phase*2)*blend;
  };
  return group;
}
