import {hearthFire} from './hearth-shader.mjs';
import * as T from './assets/engine/three.mjs';

// Keep the navigation, collision volumes and station actions common to both renderers.
async function launch(){
  const canvas=document.createElement('canvas');canvas.id='ship-game';
  const gl=canvas.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'});
  if(!gl)return;
  const render=new T.WebGLRenderer({canvas,context:gl,antialias:true,alpha:false});
  render.outputColorSpace=T.SRGBColorSpace;render.toneMapping=T.ACESFilmicToneMapping;render.toneMappingExposure=1.16;
  const scene=new T.Scene(),cam=new T.PerspectiveCamera(60,1,4,110000),loader=new T.TextureLoader();
  const textures=new Map(),owned=new Map(),models=new Map(),pilots=new Map(),forest=new Map();
  function tex(url){if(!textures.has(url)){const t=loader.load(url);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(12,render.capabilities.getMaxAnisotropy());textures.set(url,t)}return textures.get(url)}
  const panorama=await loader.loadAsync('assets/celestial-panorama.webp');
  panorama.colorSpace=T.SRGBColorSpace;panorama.mapping=T.EquirectangularReflectionMapping;
  scene.environment=panorama;scene.environmentIntensity=.89;
  const globeUniform={pano:{value:panorama},shift:{value:0},tint:{value:new T.Color(1,1,1)}};
  const skyMat=new T.ShaderMaterial({uniforms:globeUniform,side:T.DoubleSide,depthWrite:true,
    vertexShader:'varying vec3 dir;void main(){vec4 p=modelMatrix*vec4(position,1.);dir=p.xyz-cameraPosition;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader:'uniform sampler2D pano;uniform float shift;uniform vec3 tint;varying vec3 dir;void main(){vec3 d=normalize(dir);vec2 uv=vec2(fract(.5+atan(d.x,-d.z)/6.2831853+shift),.5+asin(d.y)/3.14159265);gl_FragColor=vec4(texture2D(pano,uv).rgb*tint,1.);\n#include <colorspace_fragment>\n}'});
  const firmament=new T.Mesh(new T.SphereGeometry(52000,60,32),skyMat);firmament.frustumCulled=false;scene.add(firmament);
  function physical(color,metalness,roughness,more={}){
    return new T.MeshPhysicalMaterial({color,metalness,roughness,side:T.DoubleSide,...more});
  }
  const materials={
    brass:physical(0xc79d52,.91,.24,{clearcoat:.25}),
    bronze:physical(0xb39772,.73,.29,{clearcoat:.42}),rail:physical(0x96836c,.80,.25),
    ivory:physical(0xe4d7c4,.32,.28,{clearcoat:.48}),gasket:physical(0x272b29,.48,.40),
    hull:physical(0xded5c7,.43,.39,{map:tex('assets/bronze-cladding.webp'),clearcoat:.27}),
    stone:physical(0xfffbf4,.055,.23,{map:tex('assets/ivory-marble.webp'),clearcoat:.63,clearcoatRoughness:.16}),
    fabric:physical(0x344c4e,.10,.43,{clearcoat:.21}),leather:physical(0x945b43,.11,.42,{clearcoat:.23}),
    glass:physical(0xbdd5d4,.32,.16,{transparent:true,opacity:.29,depthWrite:false}),
    gold:new T.MeshStandardMaterial({color:0xffdf9d,emissive:0xffbb60,emissiveIntensity:1.5}),
    blue:new T.MeshStandardMaterial({color:0xb8f6ed,emissive:0x8de9d9,emissiveIntensity:1.4})
  };
  scene.add(new T.HemisphereLight(0xfff0d8,0x776c61,1.68));
  const sun=new T.DirectionalLight(0xffe1ad,2.05);sun.position.set(-2300,3100,-1400);scene.add(sun,sun.target);
  const cool=new T.DirectionalLight(0xc1e0ee,.85);cool.position.set(1450,850,2250);scene.add(cool,cool.target);
  const fill=new T.PointLight(0xffdbab,90000,2600,1.6);scene.add(fill);
  function roundPath(w,h,r,shape=new T.Shape()){
    r=Math.min(r,w/2-.01,h/2-.01);const x=-w/2,y=-h/2;
    shape.moveTo(x+r,y);shape.lineTo(-x-r,y);shape.quadraticCurveTo(-x,y,-x,y+r);shape.lineTo(-x,-y-r);shape.quadraticCurveTo(-x,-y,-x-r,-y);shape.lineTo(x+r,-y);shape.quadraticCurveTo(x,-y,x,-y-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);shape.closePath();return shape;
  }
  function edged(w,h,r,trim,mat,depth=4){
    const shape=roundPath(w,h,r);shape.holes.push(roundPath(w-2*trim,h-2*trim,Math.max(1,r-trim),new T.Path()));
    return new T.Mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:1.4,bevelSize:1.3,bevelSegments:2,curveSegments:12}),mat);
  }
  function flat(w,h,mat,r=0){
    if(!r)return new T.Mesh(new T.PlaneGeometry(w,h),mat);
    const geo=new T.ShapeGeometry(roundPath(w,h,r),12),uv=geo.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/w+.5,uv.getY(i)/h+.5);
    return new T.Mesh(geo,mat);
  }
  function textMap(el,w,h){
    const c=document.createElement('canvas');c.width=Math.min(1536,Math.max(320,Math.round(w*2)));c.height=Math.max(36,Math.round(c.width*h/w));
    const g=c.getContext('2d'),strong=el.querySelector('strong'),words=(strong?.textContent||el.textContent||'').trim();
    g.fillStyle='#142b2e';g.fillRect(0,0,c.width,c.height);
    const inset=c.width*.055;let size=Math.min(c.height*.5,c.width*.112,108);
    g.font='600 '+size+'px Oxanium, sans-serif';while(g.measureText(words).width>c.width-inset*2&&size>12){size-=1;g.font='600 '+size+'px Oxanium, sans-serif'}
    g.fillStyle='#f2dfb9';g.textBaseline='middle';g.textAlign=strong?'left':'center';g.fillText(words,strong?inset:c.width/2,strong?c.height*.20:c.height*.50);
    if(strong){const body=el.querySelector('p')?.textContent||'';g.textAlign='left';g.font=Math.min(42,c.height*.115)+'px system-ui';g.fillStyle='#dee9e7';let line='',y=c.height*.43;for(const word of body.split(' ')){if(g.measureText(line+' '+word).width>c.width-2*inset){g.fillText(line,inset,y);y+=c.height*.145;line=''}line+=word+' '}g.fillText(line,inset,y)}
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
  }
  const chairBytes=await fetch('assets/engine/lounge.mesh').then(r=>{if(!r.ok)throw Error('Seat mesh');return r.arrayBuffer()});
  const chairGeometry=(()=>{const dv=new DataView(chairBytes),nv=dv.getUint32(0,true),ng=dv.getUint32(4,true),p=new Float32Array(nv*3);let o=8;
    for(let i=0;i<p.length;i++,o+=2)p[i]=dv.getInt16(o,true)/20;
    const geom=new T.BufferGeometry(),indices=[];geom.setAttribute('position',new T.Float32BufferAttribute(p,3));
    for(let g=0;g<ng;g++){const n=dv.getUint32(o,true);o+=4;geom.addGroup(indices.length,n,g);for(let j=0;j<n;j++,o+=2)indices.push(dv.getUint16(o,true))}
    geom.setIndex(indices);geom.computeVertexNormals();return geom})();
  const chairMaterials=[materials.gasket,materials.rail,materials.ivory,materials.fabric,materials.leather,materials.bronze,materials.gold,materials.blue];
  const mirrorY=new T.Matrix4().makeScale(1,-1,1);
  function pose(el,obj){
    const dom=new DOMMatrix(el.style.transform);
    const m=new T.Matrix4().fromArray(dom.toFloat64Array());m.premultiply(mirrorY).multiply(mirrorY);
    m.decompose(obj.position,obj.quaternion,obj.scale);obj.scale.set(1,1,1);obj.updateMatrix();
  }
  function mapRepeat(mat,url,w,h,unit){
    const m=mat.clone(),t=tex(url).clone();t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(Math.max(1,w/unit),Math.max(1,h/unit));t.needsUpdate=true;m.map=t;return m;
  }
  function rib(w,h){
    const group=new T.Group();const points=[[-.50,-.5],[-.468,-.40],[-.425,-.05],[-.34,.31],[-.22,.455],[0,.486],[.22,.455],[.34,.31],[.425,-.05],[.468,-.40],[.50,-.5]].map(([x,y])=>new T.Vector3(x*w,y*h,0));
    const path=new T.CatmullRomCurve3(points),r=Math.min(33,w*.009);
    group.add(new T.Mesh(new T.TubeGeometry(path,50,r,8,false),materials.ivory));
    const accent=new T.Mesh(new T.TubeGeometry(path,52,r*.15,6,false),materials.gold);accent.position.z=r*.97;group.add(accent);return group;
  }
  function lightStrip(w,h,color){
    const group=new T.Group();group.add(flat(w,h,materials.rail));
    const line=flat(Math.max(2,w-2),Math.max(2,h-2),color==='cool'?materials.blue:materials.gold);line.position.z=1;group.add(line);return group;
  }
  const videoObjects=[];
  function display(el,w,h){
    const group=new T.Group();const video=el.querySelector('video'),img=el.querySelector('img');
    const mat=new T.MeshBasicMaterial({map:img?.src?tex(img.src):null,color:0xffffff,side:T.DoubleSide,toneMapped:false});
    group.add(flat(w-13,h-13,mat,14),edged(w,h,19,7,materials.rail));
    if(video)videoObjects.push({el,video,mat});
    if(el.classList.contains('screen')){
      const name=el.querySelector('.caption')?.lastChild?.textContent||'';
      const dummy=document.createElement('span');dummy.textContent=name;
      const strip=flat(w*.67,Math.min(h*.16,56),new T.MeshBasicMaterial({map:textMap(dummy,w*.67,Math.min(h*.16,56)),toneMapped:false}),4);
      strip.position.set(-w*.135,-h*.39,3);group.add(strip);
    }return group;
  }
  const waterUniform={clock:{value:0},pano:{value:panorama},shift:globeUniform.shift};
  const water=new T.ShaderMaterial({uniforms:waterUniform,side:T.DoubleSide,vertexShader:'varying vec3 wp;varying vec2 vuv;void main(){vec4 p=modelMatrix*vec4(position,1.);wp=p.xyz;vuv=uv;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader:'varying vec3 wp;varying vec2 vuv;uniform sampler2D pano;uniform float clock,shift;void main(){vec2 p=wp.xz;float a=sin(p.x*.039+clock)*.018+cos(p.y*.047-clock*.8)*.016;float b=cos((p.x+p.y)*.028+clock*1.2)*.024;vec3 v=normalize(wp-cameraPosition);vec3 n=normalize(vec3(a,1.,b));vec3 r=reflect(v,n);vec2 uv=vec2(fract(.5+atan(r.x,-r.z)/6.283185+shift),.5+asin(r.y)/3.141593);vec3 sky=texture2D(pano,uv).rgb;float fres=pow(1.-abs(dot(v,n)),2.);gl_FragColor=vec4(mix(vec3(.018,.094,.092),sky,.23+.72*fres)+pow(max(0.,dot(r,normalize(vec3(-.4,.27,-.8)))),44.)*vec3(1.,.69,.32),1.);\n#include <colorspace_fragment>\n}'});
  function make(el){
    const g=el.geometry,k=el.classList,w=g.w,h=g.h;
    if(k.contains('exterior-pane')||k.contains('reflection'))return;
    let o;
    if(k.contains('flight-seat')){
      const seat=chairs.find(c=>c.node===el);if(!seat)return;
      o=new T.Mesh(chairGeometry,chairMaterials);o.position.set(seat.x,0,seat.z);o.rotation.y=-seat.facing;o.userData.seat=seat;
    }else{
      if(k.contains('rib'))o=rib(w,h);
      else if(k.contains('pool')||k.contains('planter-rim')||k.contains('lift-platform')||k.contains('emitter')||k.contains('hearth-base')){
        const group=new T.Group(),r=Math.min(w,h)*.44;
        group.add(flat(w,h,k.contains('pool')?water:k.contains('hearth-base')?materials.leather:materials.gasket,r),edged(w,h,r,Math.min(10,r*.18),materials.bronze));o=group;
      }else if(k.contains('screen')||k.contains('simulation'))o=display(el,w,h);
      else if(k.contains('galaxy-window')||k.contains('end-vista')||k.contains('side-window')){
        o=new T.Group();o.add(flat(w,h,skyMat,Math.min(65,h*.30)),edged(w,h,Math.min(65,h*.30),8,materials.rail));
      }else if(k.contains('skylight')){o=edged(w,h,1,1.3,materials.rail)}
      else if(k.contains('arch-reveal'))o=flat(w,h,materials.bronze);
      else if(k.contains('portal-frame')||k.contains('pass-rim')){
        o=edged(w,h,Math.min(94,w*.17),17,materials.ivory);const glow=edged(w-25,h-25,66,3,materials.gold);glow.position.z=5;o.add(glow);
      }else if(k.contains('door-leaf')){
        o=new T.Group();const rim=edged(w,h,18,10,materials.brass,20);rim.position.z=-10;o.add(rim);
        const pane=flat(w-18,h-19,physical(0x9cc8cd,.09,.14,{transparent:true,opacity:.18,depthWrite:false,clearcoat:.9}),11);
        o.add(pane);
        for(const [yy,hh] of [[-h*.38,h*.24],[h*.45,h*.1]]){
          const slab=new T.Mesh(new T.BoxGeometry(w-10,hh,18),materials.ivory);slab.position.y=yy;o.add(slab);
          const line=new T.Mesh(new T.BoxGeometry(w-9,3,21),materials.brass);line.position.y=yy+hh/2-2;o.add(line)
        }

      }else if(k.contains('floor')||k.contains('chamber-floor')||k.contains('city-floor')||k.contains('upper-deck')){
        o=flat(w,h,mapRepeat(materials.stone,'assets/ivory-marble.webp',w,h,920));
        for(const side of [-1,1]){
          for(const [offset,thickness] of [[0,5],[13,2]]){
            const inlay=flat(thickness,h,materials.brass);
            inlay.position.set(side*(w*.35+offset),0,1.1);
            o.add(inlay);
          }
        }
      }else if(k.contains('bay-shell')||k.contains('city-wall')||k.contains('chamber-lid')||k.contains('roof')||k.contains('wall')||k.contains('city-eave')){
        const finish=mapRepeat(materials.hull,'assets/bronze-cladding.webp',w,h,k.contains('roof')?760:650);
        if(k.contains('bay-shell')||k.contains('city-wall')||k.contains('wall')){
          o=new T.Mesh(new T.BoxGeometry(w,h,27),[materials.brass,materials.brass,materials.brass,materials.brass,finish,finish]);
          for(const sy of [-1,1]){const rail=new T.Mesh(new T.BoxGeometry(w,4,29),materials.brass);rail.position.y=sy*(h/2-4);o.add(rail)}
        }else o=flat(w,h,finish);
      }else if(k.contains('console')||k.contains('portal-name')||k.contains('city-direction')||k.contains('learning-panel')){
        o=new T.Group();const area=flat(w,h,new T.MeshBasicMaterial({map:textMap(el,w,h),toneMapped:false,side:k.contains('city-direction')?T.FrontSide:T.DoubleSide}),7);
        o.add(area,edged(w,h,8,3,materials.bronze));o.userData.words=el.textContent;
      }else if(k.contains('path-light')||k.contains('ceiling-bar')||k.contains('stripe'))o=lightStrip(w,h,'warm');
      else if(k.contains('balustrade')||k.contains('hearth-glass'))o=flat(w,h,materials.glass,4);
      else if(k.contains('holo-model')||k.contains('sim-wing')){
        const url=el.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];if(!url)return;
        o=flat(w,h,new T.MeshBasicMaterial({map:tex(url),transparent:true,alphaTest:.05,side:T.DoubleSide,depthWrite:false}),3);o.userData.img=url;
      }else if(k.contains('hearth-flame')){
        o=hearthFire(w,h,waterUniform.clock);
      }else o=flat(w,h,k.contains('gallery')?materials.ivory:materials.bronze);
      pose(el,o);
    }
    o.userData.el=el;models.set(el,o);scene.add(o);
  }
  let fireMap;
  function flameTex(){if(fireMap)return fireMap;const c=document.createElement('canvas');c.width=128;c.height=256;const g=c.getContext('2d');
    const grad=g.createRadialGradient(62,185,3,64,132,124);grad.addColorStop(0,'#fff7c5');grad.addColorStop(.22,'#ffd86f');grad.addColorStop(.49,'#e8853199');grad.addColorStop(1,'#d8741c00');
    g.fillStyle=grad;g.beginPath();g.moveTo(64,248);g.bezierCurveTo(2,219,16,133,68,9);g.bezierCurveTo(57,74,132,171,92,224);g.closePath();g.fill();fireMap=new T.CanvasTexture(c);fireMap.colorSpace=T.SRGBColorSpace;return fireMap}
  function dispose(o){scene.remove(o);o.traverse(n=>{
    if(!n.isMesh||n.geometry===chairGeometry)return;n.geometry.dispose();
    const mat=n.material;if(!Array.isArray(mat)&&!Object.values(materials).includes(mat)&&mat!==skyMat&&mat!==water){if(mat.map&&!Array.from(textures.values()).includes(mat.map)&&mat.map!==fireMap)mat.map.dispose();mat.dispose()}
  })}
  function syncFaces(){
    for(const [el,o] of models)if(!el.isConnected){dispose(o);models.delete(el)}
    for(const el of hall.children)if(el.geometry&&!models.has(el))make(el);
  }
  function videoFrame(){
    for(let i=videoObjects.length-1;i>=0;i--){
      const item=videoObjects[i];if(!item.el.isConnected){videoObjects.splice(i,1);continue}
      if(item.video.readyState>=2&&!item.texture){
        item.texture=new T.VideoTexture(item.video);item.texture.colorSpace=T.SRGBColorSpace;item.mat.map=item.texture;item.mat.needsUpdate=true;
      }
    }
  }
  // Preserve the original chair's machined frame, upholstery, armrests and embedded keys.
  // The grove uses one shared branch mesh and one cutout-leaf mesh for every tree.
  let grove=null;
  function updateForest(){
    if(!grove&&window.groveGeometry){
      grove=['wood','leaves'].map(key=>{const a=window.groveGeometry[key],pos=[],norm=[],uv=[],wind=[];
        for(let i=0;i<a.length;i+=9){pos.push(a[i],-a[i+1],a[i+2]);norm.push(a[i+3],-a[i+4],a[i+5]);uv.push(a[i+6],1-a[i+7]);wind.push(a[i+8])}
        const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('wind',new T.Float32BufferAttribute(wind,1));
        const m=physical(key==='wood'?0xdacbb8:0xffe8bf,0,.85,{map:tex(key==='wood'?'assets/maple-bark.webp':'assets/maple-foliage.webp'),alphaTest:key==='wood'?0:.46});
        m.onBeforeCompile=s=>{s.uniforms.breeze=waterUniform.clock;s.vertexShader='attribute float wind;uniform float breeze;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=wind*1.9*sin(breeze*.62+position.y*.013);transformed.z+=wind*1.1*cos(breeze*.81+position.x*.015);')};return {g,m}
      })
    }
    if(!grove)return;
    for(const [t,o] of forest)if(!trees.includes(t)){scene.remove(o);forest.delete(t)}
    for(const [i,t] of trees.entries())if(!forest.has(t)){
      const group=new T.Group();for(const {g,m} of grove)group.add(new T.Mesh(g,m));
      group.position.set(t.x,0,t.z);group.rotation.y=i*1.67;group.scale.setScalar(t.scale);scene.add(group);forest.set(t,group);
    }
  }
  function crew(){
    const peers=window.flightCrew?.peers;if(!peers)return;
    for(const [id,o] of pilots)if(!peers.has(id)){o.geometry.dispose();o.material.dispose();scene.remove(o);pilots.delete(id)}
    for(const [id,a] of peers){
      const uniform=uniformFor(a);loadUniform(uniform);const data=uniformModels.get(uniform);if(!data)continue;
      let o=pilots.get(id);
      if(o&&o.userData.uniform!==uniform){o.geometry.dispose();o.material.dispose();scene.remove(o);pilots.delete(id);o=null}
      if(!o){const g=new T.BufferGeometry();g.setIndex(new T.Uint16BufferAttribute(data.indices,1));g.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(data.count*3),3));g.setAttribute('uv',new T.Float32BufferAttribute(Float32Array.from(data.uv,(v,i)=>i%2?1-v/65535:v/65535),2));o=new T.Mesh(g,physical(0xffffff,.10,.54,{map:tex('assets/crew/'+uniform+'.webp'),alphaTest:.34}));o.userData.uniform=uniform;o.frustumCulled=false;scene.add(o);pilots.set(id,o)}
      const mode=a.p.state,phase=performance.now()*.007%8,k=mode==='walking'?Math.floor(phase):mode==='seated'?8:mode==='reading'||mode==='projecting'?9:10,next=mode==='walking'?(k+1)%8:k,t=mode==='walking'?phase%1:0;
      const p=o.geometry.attributes.position,arr=p.array,len=arr.length;
      const mouth=Math.round((window.crewRadio?.level(id)||0)*16)/16;
      if(o.userData.k!==k||o.userData.mouth!==mouth||mode==='walking'){
        o.userData.mouth=mouth;
        for(let j=0;j<len;j++)arr[j]=(data.mesh[k*len+j]*(1-t)+data.mesh[next*len+j]*t+mouth*(data.mesh[11*len+j]-data.mesh[10*len+j]))*.0119;
        p.needsUpdate=true;o.geometry.computeVertexNormals();o.userData.k=k;
      }
      o.position.set(a.x,(a.p.height||0)-(mode==='seated'?29:0),a.z);o.rotation.y=-a.p.yaw;
    }
  }
  syncFaces();scene.background=new T.Color(0x08121b);
  let lastSync=-9999,lastCrew=0,active=true,frame=0,lastSize='';
  function step(now){
    if(!active||document.hidden)return;
    if(now-lastSync>350){syncFaces();updateForest();videoFrame();lastSync=now}
    if(now-lastCrew>70){crew();lastCrew=now}
    const f=parseFloat(view.style.perspective),size=innerWidth+'x'+innerHeight;
    if(size!==lastSize){render.setPixelRatio(Math.min(1.65,devicePixelRatio||1));render.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.fov=2*Math.atan(innerHeight/(2*f))*180/Math.PI;cam.updateProjectionMatrix();lastSize=size}
    const {x,z,yaw,pitch}=visitor;cam.position.set(x,standingEye(),z);cam.rotation.order='YXZ';cam.rotation.set(pitch,-yaw,0,'YXZ');
    firmament.position.copy(cam.position);sun.position.set(x-1700,2700,z-1300);sun.target.position.set(x,0,z);cool.position.set(x+1100,800,z+850);cool.target.position.set(x,0,z);
    fill.position.set(x,330,z-220);
    waterUniform.clock.value=reduced.matches?0:now*.001;
    const mode=byId('outside').selectedIndex;globeUniform.shift.value=[0,.32,-.29][mode]||0;
    globeUniform.tint.value.set([0xffffff,0xffddba,0xc7e9ff][mode]||0xffffff);
    for(const [el,o] of models){
      const g=el.geometry;o.visible=!el.hidden&&Math.hypot(x-g.x,z-g.z)<Math.max(7000,Math.max(g.w,g.h)*.6+4000);
      if(!o.visible)continue;
      if(o.userData.seat){o.visible=seated!==o.userData.seat;continue}
      if(el.classList.contains('door-leaf')||el.classList.contains('lift-platform'))pose(el,o);

      if(o.userData.words!==undefined&&o.userData.words!==el.textContent){
        const m=o.children[0].material;m.map.dispose();m.map=textMap(el,g.w,g.h);o.userData.words=el.textContent;
      }
      if(el.classList.contains('holo-model'))o.rotation.y=Math.atan2(x-g.x,z-g.z);
      if(el.classList.contains('simulation')&&frame%12===0){
        const video=el.querySelector('video'),mat=o.children[0].material;
        if(video?.readyState>=2&&o.userData.film!==video){const vt=new T.VideoTexture(video);vt.colorSpace=T.SRGBColorSpace;mat.map=vt;mat.needsUpdate=true;o.userData.film=video}
      }
      if(el.classList.contains('path-light')&&o.children.length)o.children[1].material=el.classList.contains('approach')?materials.blue:materials.gold;
    }
    frame++;render.render(scene,cam);
  }
  await document.fonts.ready;
  step(performance.now());byId('viewport').append(canvas);window.hdStation=true;document.body.classList.add('hardware-station');
  byId('render-mode').textContent='Three.js · WebGL 2';
  canvas.addEventListener('webglcontextlost',()=>{active=false;render.setAnimationLoop(null);canvas.remove();window.hdStation=false;document.body.classList.remove('hardware-station');byId('render-mode').textContent='Compatibility renderer'});
  render.setAnimationLoop(step);
}
launch().catch(error=>console.warn('Flight Deck compatibility renderer active.',error.message));
