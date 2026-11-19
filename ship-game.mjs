import {loadStewardParts,stewardModel} from './robot-rig.mjs';
import {hearthFire} from './hearth-shader.mjs';
import * as T from './assets/engine/three.mjs';

// Keep the navigation, collision volumes and station actions common to both renderers.
async function launch(){
  const canvas=document.createElement('canvas');canvas.id='ship-game';
  const gl=canvas.getContext('webgl2',{antialias:true,alpha:true,powerPreference:'high-performance'});
  if(!gl)return;
  const render=new T.WebGLRenderer({canvas,context:gl,antialias:true,alpha:true});
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
  const canopyGlass=physical(0x9dcace,.035,.16,{transparent:true,opacity:.105,depthWrite:false,clearcoat:.7});
  const ambient=new T.HemisphereLight(0xfff0d8,0x776c61,1.68);scene.add(ambient);
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
  function portalCasting(w,h,trim,depth,finish){
    const shape=new T.Shape(),r=109,foot=-h/2,top=h/2;
    shape.moveTo(-w/2,foot);shape.lineTo(-w/2,top-r);shape.quadraticCurveTo(-w/2,top,-w/2+r,top);
    shape.lineTo(w/2-r,top);shape.quadraticCurveTo(w/2,top,w/2,top-r);shape.lineTo(w/2,foot);
    shape.lineTo(w/2-trim,foot);shape.lineTo(w/2-trim,top-r);
    shape.quadraticCurveTo(w/2-trim,top-trim,w/2-r,top-trim);shape.lineTo(-w/2+r,top-trim);
    shape.quadraticCurveTo(-w/2+trim,top-trim,-w/2+trim,top-r);shape.lineTo(-w/2+trim,foot);shape.closePath();
    return new T.Mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:1.6,bevelThickness:1.4,bevelSegments:3,curveSegments:20}),finish);
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
    g.fillStyle=el.classList.contains('course-holo')?'rgba(12,58,64,.25)':'#142b2e';g.fillRect(0,0,c.width,c.height);
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
  const chairFinishes=[0x255452,0x695442,0x3d5069,0x76593d,0x58485c,0x37555c,0x735342,0x4e5e4a].map(c=>chairMaterials.map((m,i)=>i===3?physical(c,.09,.44,{clearcoat:.24}):m));
  const mirrorY=new T.Matrix4().makeScale(1,-1,1);
  function pose(el,obj){
    const dom=new DOMMatrix(el.style.transform);
    const m=new T.Matrix4().fromArray(dom.toFloat64Array());m.premultiply(mirrorY).multiply(mirrorY);
    m.decompose(obj.position,obj.quaternion,obj.scale);obj.scale.set(1,1,1);obj.updateMatrix();
  }
  const finishes=new Map();
  function mapRepeat(mat,url,w,h,unit){
    const key=[mat.uuid,url,w,h,unit].join('|');if(finishes.has(key))return finishes.get(key);
    const m=mat.clone(),t=tex(url).clone();t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(Math.max(1,w/unit),Math.max(1,h/unit));t.needsUpdate=true;m.map=t;finishes.set(key,m);return m;
  }
  const enamel=physical(0x999387,.62,.255,{clearcoat:.68,clearcoatRoughness:.18});
  function sculptedHull(w,h){
    const profiles=[enamel,materials.bronze,materials.brass,materials.gasket,materials.gold,materials.rail];
    const finishes=['shell','bronze','brass','gasket','gold','rail'];
    const vertices=[],groups=profiles.map(()=>[]),scale=Math.min(1,h/350),bays=Math.max(1,Math.round(w/350));
    const seam=w<80?[0,1]:[0,.012,.026,.060,.18,.5,.82,.94,.974,.988,1];
    for(let bay=0;bay<bays;bay++){
      const offset=vertices.length/3;
      for(const [y,z] of hullSection){
        for(const u of seam){
          const lip=w<80?0:Math.min(1,Math.min(u,1-u)*30);
          vertices.push(((bay+u)/bays-.5)*w,(y-.5)*h,z*scale+lip*(w<80?0:5));
        }
      }
      for(let k=0;k<hullSection.length-1;k++)for(let j=0;j<seam.length-1;j++){
        const a=offset+k*seam.length+j,b=a+seam.length;
        const material=seam.length>2&&(j===0||j===seam.length-2)?3:finishes.indexOf(hullSection[k][2]);
        groups[material].push(a,a+1,b,a+1,b+1,b);
      }
    }
    const geom=new T.BufferGeometry(),indices=[];geom.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    groups.forEach((g,i)=>{if(g.length){geom.addGroup(indices.length,g.length,i);indices.push(...g)}});
    geom.setIndex(indices);geom.computeVertexNormals();
    const mesh=new T.Mesh(geom,profiles),back=new T.Mesh(new T.BoxGeometry(w,h,17),materials.gasket);
    back.position.z=-8.5;mesh.add(back);return mesh;
  }
  function curvedHull(el,h){
    const {side,end,radius}=el.arc,divisions=48,row=divisions+1,vertices=[],indices=[];
    const finishes={shell:enamel,bronze:materials.bronze,brass:materials.brass,gasket:materials.gasket,gold:materials.gold,rail:materials.rail};
    const layers=Object.keys(finishes),groups=layers.map(()=>[]),ds=Math.min(1,h/350);
    for(const [y,depth] of hullSection){
      const r=radius-depth*ds;
      for(let j=0;j<=divisions;j++){
        const a=j*Math.PI/(divisions*2);
        vertices.push(side*r*Math.cos(a),(y-.5)*h,end*r*Math.sin(a));
      }
    }
    for(let k=0;k<hullSection.length-1;k++){
      const g=groups[layers.indexOf(hullSection[k][2])];
      for(let j=0;j<divisions;j++){
        const a=k*row+j,b=a+row;
        if(side*end>0)g.push(a,a+1,b,a+1,b+1,b);else g.push(b,a+1,a,b,b+1,a+1);
      }
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    groups.forEach((g,i)=>{geometry.addGroup(indices.length,g.length,i);indices.push(...g)});
    geometry.setIndex(indices);geometry.computeVertexNormals();return new T.Mesh(geometry,Object.values(finishes));
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
  // Write a depth-tested transparent aperture for cross-origin iframe playback.
  // The real DOM player sits beneath the canvas in the matching world transform.
  const apertureMaterial=new T.ShaderMaterial({side:T.DoubleSide,
    vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'void main(){gl_FragColor=vec4(0.);}'});
  const videoObjects=[];
  function display(el,w,h){
    const group=new T.Group();const video=el.querySelector('video'),img=el.querySelector('img');
    const poster=img?.src||el.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
    const mat=new T.MeshBasicMaterial({map:poster?tex(poster):null,color:0xffffff,side:T.DoubleSide,toneMapped:false});
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
  const stewardRig=await loadStewardParts();
  const stewardFinishes=[physical(0xf6f2e6,.47,.21,{clearcoat:.9,clearcoatRoughness:.13}),physical(0xd5aa58,.88,.20,{clearcoat:.55}),physical(0x262d30,.42,.37),physical(0x192b32,.71,.115,{clearcoat:.95})];
  function make(el){
    const g=el.geometry,k=el.classList,w=g.w,h=g.h;
    if(k.contains('exterior-pane')||k.contains('reflection'))return;
    let o;
    if(k.contains('flight-seat')){
      const seat=chairs.find(c=>c.node===el);if(!seat)return;
      o=new T.Mesh(chairGeometry,chairFinishes[rooms.indexOf(seat.room)]||chairMaterials);o.position.set(seat.x,0,seat.z);o.rotation.y=-seat.facing;o.userData.seat=seat;
    }else{
      if(k.contains('academy-steward')){
        o=stewardModel(stewardRig,stewardFinishes);
      }else if(k.contains('continuous-return')){o=curvedHull(el,h);
      }else if(k.contains('helm-fascia')||k.contains('helm-cap')||k.contains('helm-line')){
        const mat=k.contains('helm-line')?materials.gold:k.contains('helm-cap')?materials.rail:materials.gasket;
        o=new T.Mesh(new T.BoxGeometry(w,h,k.contains('helm-fascia')?12:3),mat);
      }else if(k.contains('orbital-spire')){
        o=new T.Group();
        // Tapered elliptical towers with recessed horizontal window bands.
        const ring=(radius,level,mat,thick)=>{
          const mesh=new T.Mesh(new T.SphereGeometry(1,32,12),mat);
          mesh.scale.set(radius,thick,radius*.77);mesh.position.y=level;o.add(mesh);
        };
        const body=new T.Mesh(new T.SphereGeometry(1,36,36),materials.rail);
        body.scale.set(w*.51,h*.53,w*.39);o.add(body);
        for(let j=1;j<14;j++){
          const level=(j/14-.5)*h,r=w*.52*Math.sqrt(1-Math.pow(level/(h*.53),2));
          ring(r,level,j%3===0?materials.brass:materials.blue,3.6);
        }
      }else if(k.contains('vault-frame')){
        const spring=Number(el.dataset.spring),r=Math.max(17,Math.min(34,w*.009)),half=w/2-r,rise=h-spring-r;
        const pts=[new T.Vector3(-half,-h/2,0),new T.Vector3(-half,spring-h/2,0)];
        for(let j=1;j<=40;j++){
          const a=Math.PI*(1-j/40);pts.push(new T.Vector3(half*Math.cos(a),spring+rise*Math.sin(a)-h/2,0));
        }
        pts.push(new T.Vector3(half,-h/2,0));o=new T.Group();
        const curve=new T.CatmullRomCurve3(pts,false,'centripetal');
        o.add(new T.Mesh(new T.TubeGeometry(curve,100,r,14,false),materials.ivory));
        for(const side of [-1,1]){
          const trim=new T.Mesh(new T.TubeGeometry(curve,96,r*.17,8,false),materials.brass);
          trim.position.z=side*r*.94;o.add(trim);
        }
      }else if(k.contains('vault-glazing')||k.contains('vault-shoulder')){
        o=flat(w,h,k.contains('vault-shoulder')?materials.ivory:canopyGlass);
        if(k.contains('spine-glass')){
          const trim=flat(5,h,materials.brass);trim.position.z=1;o.add(trim);
        }
      }else if(k.contains('rib'))o=rib(w,h);
      else if(k.contains('pool')||k.contains('planter-rim')||k.contains('lift-platform')||k.contains('emitter')||k.contains('hearth-base')){
        const group=new T.Group(),r=Math.min(w,h)*.44;
        group.add(flat(w,h,k.contains('pool')?water:k.contains('hearth-base')?materials.leather:materials.gasket,r),edged(w,h,r,Math.min(10,r*.18),materials.bronze));o=group;
      }else if(k.contains('screen')||k.contains('simulation'))o=display(el,w,h);
      else if(k.contains('galaxy-window')||k.contains('end-vista')||k.contains('side-window')){
        o=new T.Group();o.add(flat(w,h,skyMat,Math.min(65,h*.30)),edged(w,h,Math.min(65,h*.30),8,materials.rail));
      }else if(k.contains('skylight')){o=edged(w,h,1,1.3,materials.rail)}
      else if(k.contains('training-tread'))o=flat(w,h,mapRepeat(materials.stone,'assets/ivory-marble.webp',w,h,920),5);
      else if(k.contains('training-riser'))o=flat(w,h,materials.bronze,2);
      else if(k.contains('arch-reveal'))return;
      else if(k.contains('portal-frame')){
        o=new T.Group();const back=el.dataset.side==='back';
        if(back)o.add(portalCasting(w,h,24,76,materials.ivory));
        const band=portalCasting(w-7,h-4,4,3,materials.brass);band.position.set(0,-2,back?-3:1);o.add(band);
        const seal=portalCasting(w-38,h-19,5,3,materials.gasket);seal.position.set(0,-9.5,back?-3:1);o.add(seal);
      }
      else if(k.contains('pass-rim')){
        o=edged(w,h,Math.min(94,w*.17),17,materials.ivory);const glow=edged(w-25,h-25,66,3,materials.gold);glow.position.z=5;o.add(glow);
      }else if(k.contains('door-leaf')){
        o=new T.Group();const rim=edged(w,h,18,10,materials.brass,20);rim.position.z=-10;o.add(rim);
        const pane=flat(w-18,h-19,physical(0x9cc8cd,.09,.14,{transparent:true,opacity:.18,depthWrite:false,clearcoat:.9}),11);
        o.add(pane);
        const emblem=flat(w*.56,h*.22,new T.MeshBasicMaterial({map:tex('assets/crew/deck-etch.svg'),side:T.DoubleSide,transparent:true,opacity:.82,depthWrite:false}));
        emblem.position.set(0,13,4);o.add(emblem);
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
        const finish=mapRepeat(materials.hull,'assets/bulkhead-2k.webp',w,h,860);
        if(k.contains('bay-shell')||k.contains('city-wall')||k.contains('wall')){
          o=sculptedHull(w,h);
        }else if(k.contains('chamber-lid')){
          const geo=new T.PlaneGeometry(w,h,36,1),vertices=geo.attributes.position;
          for(let j=0;j<vertices.count;j++)vertices.setZ(j,Math.min(w*.12,144)*Math.cos(Math.PI*vertices.getX(j)/w));
          geo.computeVertexNormals();
          geo.addGroup(0,66,0);geo.addGroup(66,84,1);geo.addGroup(150,66,0);
          o=new T.Mesh(geo,[finish,canopyGlass]);
          const shape=new T.Shape();shape.moveTo(-w/2,0);
          for(let j=1;j<=36;j++){const t=j/36;shape.lineTo((t-.5)*w,Math.min(w*.12,144)*Math.sin(t*Math.PI))}
          shape.closePath();
          for(const end of [-1,1]){
            const cap=new T.Mesh(new T.ShapeGeometry(shape),materials.ivory);
            cap.rotation.x=Math.PI/2;cap.position.y=end*h/2;o.add(cap);
          }
        }else o=flat(w,h,finish);
      }else if(k.contains('course-holo')){
        o=flat(w,h,new T.MeshBasicMaterial({map:textMap(el,w,h),transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false}),8);
      }else if(k.contains('console')||k.contains('portal-name')||k.contains('city-direction')||k.contains('learning-panel')){
        o=new T.Group();const area=flat(w,h,new T.MeshBasicMaterial({map:textMap(el,w,h),toneMapped:false,side:(k.contains('city-direction')||k.contains('portal-name'))?T.FrontSide:T.DoubleSide}),7);
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
      if(k.contains('galaxy-window')||k.contains('end-vista')||k.contains('side-window'))o.translateZ(12);
    }
    if(k.contains('screen')||k.contains('simulation')||k.contains('sim-wing')){
      const inset=k.contains('screen')?10:14;
      const aperture=flat(w-inset*2,h-inset*2,apertureMaterial,10);
      aperture.position.z=9;aperture.renderOrder=2;aperture.visible=false;o.add(aperture);o.userData.aperture=aperture;
    }
    o.userData.el=el;models.set(el,o);scene.add(o);
  }
  let fireMap;
  function flameTex(){if(fireMap)return fireMap;const c=document.createElement('canvas');c.width=128;c.height=256;const g=c.getContext('2d');
    const grad=g.createRadialGradient(62,185,3,64,132,124);grad.addColorStop(0,'#fff7c5');grad.addColorStop(.22,'#ffd86f');grad.addColorStop(.49,'#e8853199');grad.addColorStop(1,'#d8741c00');
    g.fillStyle=grad;g.beginPath();g.moveTo(64,248);g.bezierCurveTo(2,219,16,133,68,9);g.bezierCurveTo(57,74,132,171,92,224);g.closePath();g.fill();fireMap=new T.CanvasTexture(c);fireMap.colorSpace=T.SRGBColorSpace;return fireMap}
  function dispose(o){scene.remove(o);o.traverse(n=>{
    if(!n.isMesh||n.geometry===chairGeometry)return;n.geometry.dispose();
    const mat=n.material;if(!Array.isArray(mat)&&!Object.values(materials).includes(mat)&&mat!==skyMat&&mat!==canopyGlass&&mat!==apertureMaterial&&mat!==water&&![...finishes.values()].includes(mat)){if(mat.map&&!Array.from(textures.values()).includes(mat.map)&&mat.map!==fireMap)mat.map.dispose();mat.dispose()}
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
  let grove=null,palmModel=null;
  function makePalm(){
    if(palmModel)return palmModel.clone();
    palmModel=new T.Group();
    for(const [data,url,foliage] of [[palmParts.wood,'assets/maple-bark.webp',false],[palmParts.leaves,'assets/palm-frond.webp',true]]){
      const pos=[],uv=[],norm=[],flex=[];
      for(let i=0;i<data.length;i+=9){
        pos.push(data[i],-data[i+1],data[i+2]);norm.push(data[i+3],-data[i+4],data[i+5]);uv.push(data[i+6],1-data[i+7]);flex.push(data[i+8]);
      }
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(norm,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
      const mat=physical(0xffffff,0,foliage?.63:.89,{map:tex(url),alphaTest:foliage?.28:0});
      if(foliage){
        geo.setAttribute('wind',new T.Float32BufferAttribute(flex,1));
        mat.onBeforeCompile=s=>{s.uniforms.breeze=waterUniform.clock;s.vertexShader='attribute float wind;uniform float breeze;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=wind*2.1*sin(breeze*.65+position.z*.012);')};
      }
      palmModel.add(new T.Mesh(geo,mat));
    }
    return palmModel.clone();
  }
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
      const palm=isPalm(t),group=palm?makePalm():new T.Group();if(!palm)for(const {g,m} of grove)group.add(new T.Mesh(g,m));group.userData.palm=palm;
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
      if(!o){const g=new T.BufferGeometry();g.setIndex(new T.Uint16BufferAttribute(data.indices,1));g.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(data.count*3),3));g.setAttribute('uv',new T.Float32BufferAttribute(Float32Array.from(data.uv,(v,i)=>i%2?1-v/65535:v/65535),2));if(!data.gpuMap){data.gpuMap=new T.CanvasTexture(data.canvas);data.gpuMap.colorSpace=T.SRGBColorSpace;data.gpuMap.anisotropy=Math.min(8,render.capabilities.getMaxAnisotropy());data.gpuNormal=new T.CanvasTexture(data.surface);data.gpuNormal.needsUpdate=true}o=new T.Mesh(g,physical(0xffffff,.015,.79,{map:data.gpuMap,normalMap:data.gpuNormal,alphaTest:.34}));o.userData.uniform=uniform;o.frustumCulled=false;scene.add(o);pilots.set(id,o)}
      o.visible=Math.hypot(visitor.x-a.x,visitor.z-a.z)>60;
      if(!o.visible)continue;
      const p=o.geometry.attributes.position,points=animateOfficer(a,data,performance.now());
      for(let j=0;j<points.length;j++)p.array[j]=points[j]*data.worldScale;
      p.needsUpdate=true;o.geometry.computeVertexNormals();o.position.set(a.x,a.alt??a.p.height??0,a.z);o.rotation.y=-(a.yaw??a.p.yaw);
    }
  }
  syncFaces();scene.background=new T.Color(0x08121b);
  let lastSync=-9999,lastCrew=0,active=true,frame=0,lastSize='',lastFocal=0;
  function step(now){
    if(!active||document.hidden)return;
    if(now-lastSync>350){syncFaces();updateForest();videoFrame();lastSync=now}
    if(now-lastCrew>32){crew();lastCrew=now}
    const f=parseFloat(view.style.perspective),size=innerWidth+'x'+innerHeight;
    if(size!==lastSize){render.setPixelRatio(Math.min(1.65,devicePixelRatio||1));render.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;lastSize=size;lastFocal=0}
    if(f!==lastFocal){lastFocal=f;cam.fov=2*Math.atan(innerHeight/(2*f))*180/Math.PI;cam.updateProjectionMatrix();lastSize=size}
    const {x,z,yaw,pitch}=visitor;cam.position.set(x,standingEye(),z);cam.rotation.order='YXZ';cam.rotation.set(pitch,-yaw,0,'YXZ');
    firmament.position.copy(cam.position);sun.position.set(x-1700,2700,z-1300);sun.target.position.set(x,0,z);cool.position.set(x+1100,800,z+850);cool.target.position.set(x,0,z);
    const night=document.body.classList.contains('night-watch');ambient.intensity=night?.065:1.68;sun.intensity=night?.055:2.05;cool.intensity=night?.045:.85;scene.environmentIntensity=night?.075:.89;
    fill.intensity=night?3200:90000;fill.position.set(x,330,z-220);
    if(!reduced.matches)for(const [tree,o] of forest)if(o.userData.palm)o.rotation.z=.009*Math.sin(now*.00048+tree.z);
    waterUniform.clock.value=reduced.matches?0:now*.001;
    const mode=byId('outside').selectedIndex;globeUniform.shift.value=[0,.32,-.29][mode]||0;
    globeUniform.tint.value.set([0xffffff,0xffddba,0xc7e9ff][mode]||0xffffff);
    for(const [el,o] of models){
      const g=el.geometry;o.visible=!el.hidden&&Math.hypot(x-g.x,z-g.z)<Math.max(7000,Math.max(g.w,g.h)*.6+4000);
      if(!o.visible)continue;
      if(o.userData.aperture)o.userData.aperture.visible=el.classList.contains('playing-in-glass');
      if(el.classList.contains('academy-steward')){
        o.position.set(g.x,0,g.z);
        if(el.motion){o.rotation.y=-el.motion.heading;o.userData.animate(el.motion)}
      }
      if(o.userData.seat){o.visible=seated!==o.userData.seat;continue}
      if(el.classList.contains('door-leaf')||el.classList.contains('lift-platform'))pose(el,o);

      if(o.userData.lesson!==el.dataset.lecture){
        o.userData.lesson=el.dataset.lecture;let plate=o.userData.lessonPlate;
        if(plate){plate.material.map.dispose();plate.material.dispose();plate.geometry.dispose();o.remove(plate);o.userData.lessonPlate=null}
        if(el.dataset.lecture){
          const msg=document.createElement('div');msg.innerHTML='<strong>Flight Academy</strong><p></p>';msg.lastChild.textContent=el.dataset.lecture;
          const pw=g.w*.93,ph=g.h*.35;plate=flat(pw,ph,new T.MeshBasicMaterial({map:textMap(msg,pw,ph),toneMapped:false}),4);
          plate.position.set(0,-g.h*.27,9);o.add(plate);o.userData.lessonPlate=plate
        }
      }
      if(o.userData.words!==undefined&&o.userData.words!==el.textContent){
        const m=o.children[0].material;m.map.dispose();m.map=textMap(el,g.w,g.h);o.userData.words=el.textContent;
      }
      if(el.classList.contains('holo-model')||el.classList.contains('course-holo'))o.rotation.y=Math.atan2(x-g.x,z-g.z);
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
