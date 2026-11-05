// Static hulls and furniture share vertex buffers. HTML remains responsible for
// the readable, accessible instruments; their controls keep their original IDs.
(() => {
 const canvas=document.createElement('canvas');canvas.id='ship-scene';canvas.setAttribute('aria-hidden','true');
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance',depth:true});
 const nativeSelector='.screen,.switches,.helm-display,.console-keys,.wall-pad,.plaque,.course-display,.holo-display,.seat-control,.chair-keypad';
 const all=Array.from(world.querySelectorAll('.surface'));
 const matrixFor=el=>{
   const m=new DOMMatrix(el.style.transform);
   return el.parentElement.classList.contains('helm-assembly')?new DOMMatrix(el.parentElement.style.transform).multiply(m):m;
 };
 function room(x,z){return z<1230?'bridge':Math.abs(x)<285?'passage':(x<0?'left':'right')+(z<3630?'lab':'aft');}
 const live=all.filter(e=>e.matches(nativeSelector)).map(el=>{const m=matrixFor(el);return {el,room:room(m.m41,m.m43)};});
 let lastRoom='';
 const partitions=all.filter(el=>el.matches('.hull-panel,.hull-back')).map(el=>({inv:matrixFor(el).inverse(),w:parseFloat(el.style.width)/2,h:parseFloat(el.style.height)/2}));
 const nativeCentres=live.map(({el})=>{const m=matrixFor(el);return [m.m41,m.m42,m.m43]});
 let sightX=Infinity,sightZ=Infinity;
 function showRoom(ex,ez){
   if(Math.hypot(ex-sightX,ez-sightZ)<14)return;
   sightX=ex;sightZ=ez;
   live.forEach(({el},i)=>{
     const [xx,yy,zz]=nativeCentres[i],dx=xx-ex,dy=yy,dz=zz-ez;
     const blocked=partitions.some(({inv:m,w,h})=>{
       const oz=ex*m.m13+ez*m.m33+m.m43,vz=dx*m.m13+dy*m.m23+dz*m.m33;
       if(Math.abs(vz)<.001)return false;const t=-oz/vz;if(t<=0||t>=.992)return false;
       const px=ex+dx*t,py=dy*t,pz=ez+dz*t;
       return Math.abs(px*m.m11+py*m.m21+pz*m.m31+m.m41)<w&&Math.abs(px*m.m12+py*m.m22+pz*m.m32+m.m42)<h;
     });
     el.classList.toggle('away',blocked);
   });
   refreshHitBoxes();
 }
 const surfaceRoom=el=>{const m=matrixFor(el);return room(m.m41,m.m43);};
 if(!gl){
   // One small raster surface replaces thousands of composited CSS planes on
   // browsers where WebGL is disabled. Keep the six real sky faces behind it.
   world.querySelector('.forge-sky')?.remove();
   view.prepend(canvas);
   const materials={
     white:'#adbdc1',metal:'#6a7d86',hull:'#536571',dark:'#32434e',gold:'#d4a467',
     floor:'#637a86',ceiling:'#768993',pad:'#7e939b',linen:'#bcc3b8',warm:'#957d68',
     cyan:'#bff5ff',lamp:'#ffddaa',glass:'#89cfe1',screen:'#1b3d49'
   };
   const items=[];
   const native=new Set(live.map(e=>e.el));
   function color(el){
     if(el.matches('.lamp,.passage-light'))return 'lamp';
     if(el.matches('.glass-light,.lab-wash,.promenade-light,.crown-light,.lab-ring,.residential-ring,.holo-ring,.holo-base'))return 'cyan';
     if(el.matches('.strip,.guide-light,.pod-chair.shoulder-shell'))return 'gold';
     if(el.matches('.extension-floor,.deck'))return 'floor';
     if(el.matches('.extension-ceiling,.overhead'))return 'ceiling';
     if(el.matches('.cabin-zone.armour-face,.command-chair.flight-pad,.lab-chair.flight-pad,.canopy-shell,.canopy-spar'))return 'white';
     if(el.matches('.lounge-zone.armour-face'))return 'warm';
     if(el.matches('.berth-pad,.berth-pillow,.lounge-pad'))return 'linen';
     if(el.matches('.viewport'))return 'glass';
     if(el.matches('.flight-pad,.head-pad'))return 'pad';
     if(el.matches('.chair-shell,.case-back,.hull-back,.service-pipe,.console-case'))return 'dark';
     return el.matches('.armour-face,.hull-panel')?'hull':'metal';
   }
   const rect=[[0,0],[1,0],[1,1],[0,1]];
   for(const el of all){
     if(el.classList.contains('sky-face'))continue;
     const m=matrixFor(el),w=parseFloat(el.style.width),h=parseFloat(el.style.height);
     const isUI=native.has(el),kind=isUI?'screen':color(el);
     const a=el.matches('.armour-face:not(.cabin-zone):not(.lounge-zone)')?'armour':el.matches('.crest-glass')?'crest':el.matches('.orbital')?'orbital':el.matches('.drifting')?'drifting':null;
     let poly=rect;
     if(el.classList.contains('seat-flank'))poly=[...el.style.clipPath.matchAll(/([\d.]+)% ([\d.]+)%/g)].map(q=>[+q[1]/100,+q[2]/100]);
     const isRing=el.matches('.residential-ring,.lab-ring,.holo-base,.holo-ring');
     if(isRing)poly=Array.from({length:24},(_,i)=>[.5+.47*Math.cos(i*Math.PI/12),.5+.47*Math.sin(i*Math.PI/12)]);
     const pts=poly.map(([u,v])=>m.transformPoint(new DOMPoint((u-.5)*w,(v-.5)*h)));
     const hex=materials[kind],lit=['lamp','gold','cyan','glass'].includes(kind)?1:.75+.22*Math.abs(m.m31*.54-m.m32*.8+m.m33*.25);
     const rgb=[1,3,5].map(i=>Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*lit)));
     const obj={pts,kind,a,ring:isRing,ui:isUI,cx:m.m41,cy:m.m42,cz:m.m43,nx:m.m31,ny:m.m32,nz:m.m33,
       size:Math.hypot(w,h)/2,zone:a&&a!=='armour'?'exterior':room(m.m41,m.m43),two:el.matches('.seat-band,.reveal'),fill:'rgb('+rgb.join(',')+')'};
     obj.poly=poly;items.push(obj);

     if(!isUI)el.remove();
   }
   for(const panel of formedPanels){
     const pts=panel.points.map(([x,y,z])=>({x,y,z}));
     const cx=pts.reduce((v,p)=>v+p.x,0)/4,cy=pts.reduce((v,p)=>v+p.y,0)/4,cz=pts.reduce((v,p)=>v+p.z,0)/4;
     const fill={pearl:'#a6b7bb',alloy:'#73858e',gasket:'#263642',glasslight:'#c8f4fb'}[panel.finish];
     items.push({pts,kind:panel.finish,fill,cx,cy,cz,nx:0,ny:0,nz:0,size:Math.max(...pts.map(p=>Math.hypot(p.x-cx,p.y-cy,p.z-cz))),two:true,zone:room(cx,cz)});
   }
   const packed=[];
   const kindOf={armour:6,crest:7,orbital:8,drifting:9};
   for(const item of items){
     if(item.kind==='glass'||item.ring)continue;
     const pts=item.pts,uv=item.poly||rect;
     const sides=indices(uv);
     const ns=item.fill.match(/\d+/g);
     const col=item.fill[0]==='#'?parseInt(item.fill.slice(1),16):null;
     const rgb=col===null?ns.map(Number):[col>>16,(col>>8)&255,col&255];
     const word=(255<<24)|(rgb[2]<<16)|(rgb[1]<<8)|rgb[0];
     for(let i=0;i<sides.length;i+=3){
       for(const n of sides.slice(i,i+3)){
         const p=pts[n];packed.push(p.x,p.y,p.z,uv[n][0],uv[n][1]);
       }
       packed.push(word,item.kind==='floor'?1:(kindOf[item.a]||0));
     }
   }
   const scene=new Float32Array(packed),words=new Int32Array(scene.buffer);
   for(let i=0;i<packed.length;i+=17){words[i+15]=packed[i+15];words[i+16]=packed[i+16];}
   const urls=['px','nx','py','ny','pz','nz'].map(k=>new URL('assets/forge/'+k+'.webp',document.baseURI).href);
   for(const path of ['assets/hull-plating.svg','archive/assets/expanse-ring-wordmark.webp','archive/assets/fortizar-cutout.webp','archive/assets/naglfar-cutout.webp'])urls.push(new URL(path,document.baseURI).href);
   const worker=new Worker('assets/renderer/worker.js?v=3'),offscreen=canvas.transferControlToOffscreen();
   let ready=false,pending=false;
   worker.onmessage=({data})=>{
     if(data==='ready'){
       const img=new Image();img.onload=()=>{const bitmap=document.createElement('canvas');bitmap.width=bitmap.height=1024;
         const ink=bitmap.getContext('2d');ink.drawImage(img,0,0,1024,1024);const bytes=ink.getImageData(0,0,1024,1024).data.buffer;
         worker.postMessage({type:'material',bytes},[bytes]);ready=true;};img.src=urls[6];
     }
     if(data==='frame'){pending=false;window.presentedShipFrames=(window.presentedShipFrames||0)+1;}
     if(data?.error)console.error(data.error);
   };
   worker.postMessage({type:'init',canvas:offscreen,scene:scene.buffer,urls},[offscreen,scene.buffer]);
   window.renderShip=(now,x,y,z,yaw,pitch,lens)=>{
     showRoom(x,z);if(!ready||pending)return;pending=true;
     worker.postMessage({w:innerWidth,h:innerHeight,x,y,z,yaw,pitch,lens,now});
   };
   return;
 }
 const materialDefs={
   hull:['#546372','hull'],armour:['#a0aeb6','hull'],wall:['#405360','metal'],back:['#354650','metal'],
   floor:['#84949d','floor'],ceiling:['#798791','floor'],edge:['#6b7983','strips'],window:['#99d9f2','glass'],
   lamp:['#ffe2b6','emissive'],cyan:['#bdeefe','emissive'],orange:['#e5a563','emissive'],
   shell:['#8b999e','metal'],white:['#d3dadd','metal'],dark:['#384954','metal'],pad:['#6a7c84','pad'],
   ivory:['#e4e8df','pad'],copper:['#d4995c','metal'],screen:['#367387','display'],
   warm:['#ae967b','metal'],linen:['#bcb7a9','pad'],crest:['#ffffff','image'],orbital:['#ffffff','image'],
   drifting:['#ffffff','image'],ring:['#75d5ec','ring'],sky:['#ffffff','sky']
 };
 const names=Object.keys(materialDefs),tile=512,atlas=document.createElement('canvas');atlas.width=4096;atlas.height=2048;
 const ctx=atlas.getContext('2d');
 function tileOrigin(name){const i=names.indexOf(name);return [(i%8)*tile,Math.floor(i/8)*tile];}
 for(const [name,[color,pattern]] of Object.entries(materialDefs)){
   const [x,y]=tileOrigin(name);ctx.save();ctx.translate(x,y);ctx.scale(tile/256,tile/256);ctx.beginPath();ctx.rect(0,0,256,256);ctx.clip();
   if(pattern!=='image' && pattern!=='ring'){
     ctx.fillStyle=color;ctx.fillRect(0,0,tile,tile);
     const shine=ctx.createLinearGradient(0,0,256,256);
     shine.addColorStop(0,'rgba(235,250,255,.13)');shine.addColorStop(.55,'rgba(0,0,0,.02)');shine.addColorStop(1,'rgba(0,12,25,.24)');
     ctx.fillStyle=shine;ctx.fillRect(0,0,tile,tile);
   }
   if(['metal','floor','hull'].includes(pattern)){
     ctx.strokeStyle='#283a47';ctx.lineWidth=4;ctx.strokeRect(2,2,252,252);ctx.strokeStyle='#9facb066';ctx.lineWidth=2;ctx.strokeRect(6,6,244,244);
     if(pattern==='floor'){ctx.beginPath();ctx.moveTo(0,218);ctx.lineTo(68,218);ctx.lineTo(85,235);ctx.lineTo(256,235);ctx.stroke();}
   }
   if(pattern==='strips'||pattern==='pad'){ctx.fillStyle='#1a27343d';for(let y=0;y<256;y+=pattern==='pad'?43:27)ctx.fillRect(0,y,256,3);}
   if(pattern==='display'){ctx.fillStyle='#93e6f7';for(let y=32;y<220;y+=27)ctx.fillRect(18,y,150-y%30,3);}
   if(pattern==='ring'){ctx.strokeStyle=color;ctx.lineWidth=6;for(const r of [69,111,118]){ctx.beginPath();ctx.arc(128,128,r,0,Math.PI*2);ctx.stroke();}}
   ctx.restore();
 }
 function material(el){
   const c=el.classList;
   if(c.contains('sky-face'))return 'sky';
   if(c.contains('viewport'))return 'window';
   if(c.contains('floor-spill'))return null;
   if(c.contains('deck')||c.contains('extension-floor'))return 'floor';
   if(c.contains('overhead')||c.contains('extension-ceiling'))return 'ceiling';
   if(c.contains('armour-face')||c.contains('hull-panel'))return c.contains('cabin-zone')?'white':c.contains('lounge-zone')?'warm':c.contains('armour-face')?'armour':'hull';
   for(const name of ['orbital','drifting','crest-glass'])if(c.contains(name))return name==='crest-glass'?'crest':name;
   if(el.matches('.holo-base,.holo-ring,.residential-ring,.lab-ring'))return 'ring';
   if(el.matches('.lamp,.passage-light'))return 'lamp';
   if(el.matches('.strip,.guide-light'))return 'orange';
   if(el.matches('.glass-light,.lab-wash,.promenade-light,.crown-light'))return 'cyan';
   if(el.matches(nativeSelector))return 'screen';
   if(el.matches('.seat-flank,.seat-band')){
     if(el.matches('.flight-pad,.head-pad'))return el.matches('.command-chair,.lab-chair')?'ivory':'pad';
     if(el.matches('.pod-chair.shoulder-shell,.pod-chair.canopy-shell'))return 'copper';
     if(el.matches('.canopy-shell,.canopy-spar,.shoulder-shell,.chair-shell'))return el.matches('.command-chair,.pod-chair,.lab-chair')?'white':'shell';
     return 'dark';
   }
   if(el.matches('.lounge-pad,.berth-pad,.berth-pillow'))return 'linen';
   if(el.matches('.hull-edge,.rim-metal,.hatch-flange,.case-edge,.reveal,.rail,.girder,.guide-channel'))return 'edge';
   if(c.contains('pipe-collar'))return 'shell';
   if(c.contains('service-pipe'))return 'dark';
   if(el.matches('.hull-back,.case-back'))return 'back';
   return 'wall';
 }
 function shader(type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}
 const pr=gl.createProgram();
 gl.attachShader(pr,shader(gl.VERTEX_SHADER,`
 attribute vec3 position,normal;attribute vec2 uv;attribute float kind;
 uniform vec3 eye;uniform vec4 angles;uniform vec2 proj;uniform float mirror,clock;
 varying vec3 wp,norm;varying vec2 tex;varying float type;
 void main(){vec3 p=position;type=kind;tex=uv;norm=normal;wp=p;
 if(kind>4.5&&kind<5.5)p+=vec3(eye.x,0.,eye.z);
 if(kind>5.5)p+=vec3(sin(clock*.045)*140.,cos(clock*.036)*28.,0.);
 if(mirror>.5)p.y=832.-p.y;
 vec3 d=p-eye;float vx=angles.y*d.x+angles.x*d.z;
 float forward=angles.x*d.x-angles.y*d.z;
 float vy=angles.w*d.y-angles.z*forward;
 float depth=angles.w*forward+angles.z*d.y;
 gl_Position=vec4(vx*proj.x,-vy*proj.y,depth*1.0002-2.2,depth);}`));
 gl.attachShader(pr,shader(gl.FRAGMENT_SHADER,`
 precision highp float;varying vec2 tex;varying vec3 wp,norm;varying float type;
 uniform sampler2D sheet,reflected,displays;uniform float moving;uniform samplerCube space;uniform vec2 viewport;uniform float mirror;uniform vec3 eye;
 void main(){
 if(type>3.5&&type<4.5){
   if(mirror<.5&&type>4.15)discard;
   gl_FragColor=texture2D(displays,tex);return;
 }
 if(type>4.5&&type<5.5){gl_FragColor=vec4(textureCube(space,normalize(vec3(wp.x,-wp.y,-wp.z))).rgb,1.);return;}
 vec4 base=texture2D(sheet,tex);if(base.a<.12)discard;
 vec3 n=normalize(norm);vec3 direction=normalize(wp-eye);float facing=abs(dot(n,direction));
 if(type>.5&&type<1.5){
 if(mirror>.5)discard;
 vec3 reflection=texture2D(reflected,gl_FragCoord.xy/viewport).rgb;
 gl_FragColor=vec4(mix(base.rgb*.81,reflection,.28+.36*pow(1.-facing,2.)),1.);return;}
 if(type>1.5&&type<2.5){gl_FragColor=vec4(.50,.75,.85,.035+.055*pow(1.-facing,3.));return;}
 if(type>2.5){gl_FragColor=base;return;}
 float light=.71+.25*max(0.,dot(n,normalize(vec3(-.45,-.8,.32))));
 vec3 ray=reflect(direction,n);
 vec3 env=textureCube(space,vec3(ray.x,-ray.y,-ray.z)).rgb;
 gl_FragColor=vec4(mix(base.rgb*light,env,.025+.10*pow(1.-facing,3.)),base.a);}`));
 gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(pr));gl.useProgram(pr);
 const uniforms=Object.fromEntries(['eye','angles','proj','mirror','clock','sheet','reflected','space','viewport','displays','moving'].map(k=>[k,gl.getUniformLocation(pr,k)]));
 const atlasTex=gl.createTexture();
 function updateAtlas(){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,atlasTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);gl.generateMipmap(gl.TEXTURE_2D);}
 updateAtlas();gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 const cube=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_CUBE_MAP,cube);
 const cubeTargets=['POSITIVE_X','NEGATIVE_X','POSITIVE_Y','NEGATIVE_Y','POSITIVE_Z','NEGATIVE_Z'];
 cubeTargets.forEach(k=>gl.texImage2D(gl['TEXTURE_CUBE_MAP_'+k],0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array([12,24,36])));
 gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});
 Promise.all(['px','nx','py','ny','pz','nz'].map(f=>loadImage('assets/forge/'+f+'.webp'))).then(imgs=>{
   gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_CUBE_MAP,cube);imgs.forEach((im,i)=>gl.texImage2D(gl['TEXTURE_CUBE_MAP_'+cubeTargets[i]],0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,im));
 });
 for(const [name,src] of Object.entries({armour:'assets/hull-plating.svg',crest:'archive/assets/expanse-ring-wordmark.webp',orbital:'archive/assets/fortizar-cutout.webp',drifting:'archive/assets/naglfar-cutout.webp'})){
   loadImage(src).then(im=>{const [x,y]=tileOrigin(name);ctx.clearRect(x,y,tile,tile);
     if(name==='armour')ctx.drawImage(im,x,y,tile,tile);
     else{const ratio=im.width/im.height;const target=name==='drifting'?830/335:name==='orbital'?850/310:275/115;const w=Math.min(1,ratio/target)*tile,h=Math.min(1,target/ratio)*tile;ctx.drawImage(im,x+(tile-w)/2,y+(tile-h)/2,w,h);}
     updateAtlas();
   });
 }
 // Rasterize control faces once, using the same measured buttons as hit testing.
 // They can move with the hull in one draw while the pilot is walking.
 const uiAtlas=document.createElement('canvas');uiAtlas.width=uiAtlas.height=2048;
 const uc=uiAtlas.getContext('2d'),uiTex=gl.createTexture(),uiTiles=new Map();
 function paintInstruments(){
   live.forEach(({el},i)=>{
     const ox=i%8*256,oy=Math.floor(i/8)*256;
     uiTiles.set(el,[ox,oy]);
     const w=parseFloat(el.style.width),h=parseFloat(el.style.height);
     uc.save();uc.translate(ox,oy);uc.scale(256/w,256/h);uc.fillStyle='#0a1f29';uc.fillRect(0,0,w,h);
     uc.strokeStyle='#5c818b';uc.lineWidth=3;uc.strokeRect(1,1,w-2,h-2);
     const buttons=[...el.querySelectorAll('button')];
     if(!buttons.length){
       uc.font='600 '+Math.min(h*.43,18)+'px Oxanium,sans-serif';uc.fillStyle='#d6eeed';
       uc.textBaseline='middle';uc.fillText(el.textContent.trim(),7,h/2,w-13);
     }
     for(const b of buttons){
       const x=b.offsetLeft+el.clientLeft,y=b.offsetTop+el.clientTop,bw=b.offsetWidth,bh=b.offsetHeight;
       if(!bw||!bh)continue;
       uc.fillStyle=b.classList.contains('helm-title')?'#122e39':'#163540';uc.fillRect(x,y,bw,bh);
       uc.strokeStyle='#42616e';uc.lineWidth=1;uc.strokeRect(x+.5,y+.5,bw-1,bh-1);
       const label=b.textContent.trim();uc.font='600 '+Math.min(parseFloat(getComputedStyle(b).fontSize)||15,bh*.68)+'px Oxanium,sans-serif';uc.textBaseline='middle';
       uc.fillStyle='#c7edf4';uc.fillText(label,x+5,y+bh/2,Math.max(2,bw-11));
     }
     uc.restore();
   });
   gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,uiTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,uiAtlas);gl.generateMipmap(gl.TEXTURE_2D);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 }
 paintInstruments();
 // Triangulate concave side profiles, keeping open spaces in chair canopies.
 function indices(points){
   if(points.length<3)return [];
   if(points.length===4)return [0,1,2,0,2,3];
   const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
   const sign=Math.sign(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1]},0));
   const active=points.map((_,i)=>i),out=[];
   while(active.length>2){let found=false;
     for(let k=0;k<active.length;k++){const a=active[(k+active.length-1)%active.length],b=active[k],c=active[(k+1)%active.length];
       if(cross(points[a],points[b],points[c])*sign<=0)continue;
       if(active.some(i=>i!==a&&i!==b&&i!==c&&[[a,b],[b,c],[c,a]].every(([j,l])=>cross(points[j],points[l],points[i])*sign>=0)))continue;
       out.push(a,b,c);active.splice(k,1);found=true;break;
     }if(!found)break;
   }return out;
 }
 const groups=new Map();
 for(const el of all){
   const name=material(el);if(!name)continue;
   const m=matrixFor(el),w=parseFloat(el.style.width),h=parseFloat(el.style.height);
   const poly=el.classList.contains('seat-flank')?[...el.style.clipPath.matchAll(/([\d.]+)% ([\d.]+)%/g)].map(a=>[+a[1]/100,+a[2]/100]):[[0,0],[1,0],[1,1],[0,1]];
   const ui=uiTiles.get(el),cell=ui?256:tile;const [ax,ay]=ui||tileOrigin(name);
   const k=ui?(el.matches('.course-display,.holo-display')?4.25:4):name==='floor'?1:name==='window'?2:name==='sky'?5:name==='drifting'?6:['cyan','lamp','orange','ring','screen','crest','orbital'].includes(name)?3:0;
   const zone=['orbital','drifting','sky'].includes(name)?'exterior':room(m.m41,m.m43);
   const key=zone+(name==='window'?':glass':':solid');
   if(!groups.has(key))groups.set(key,[]);
   const dest=groups.get(key);
   for(const i of indices(poly)){
     const [u,v]=poly[i];const p=m.transformPoint(new DOMPoint((u-.5)*w,(v-.5)*h));
     dest.push(p.x,p.y,p.z,m.m31,m.m32,m.m33,(ax+1+u*(cell-2))/(ui?uiAtlas.width:atlas.width),(ay+1+v*(cell-2))/(ui?uiAtlas.height:atlas.height),k);
   }
 }
 for(const panel of formedPanels){
   const [a,b,,d]=panel.points,e=b.map((v,i)=>v-a[i]),f=d.map((v,i)=>v-a[i]);
   const n=[e[1]*f[2]-e[2]*f[1],e[2]*f[0]-e[0]*f[2],e[0]*f[1]-e[1]*f[0]];
   const len=Math.hypot(...n)||1;const name={pearl:'white',alloy:'shell',gasket:'dark',glasslight:'cyan'}[panel.finish];
   const [tx,ty]=tileOrigin(name),key='formed:solid';if(!groups.has(key))groups.set(key,[]);
   for(const i of [0,1,2,0,2,3]){
     const v=panel.points[i];groups.get(key).push(...v,n[0]/len,n[1]/len,n[2]/len,(tx+tile*.5)/atlas.width,(ty+tile*.5)/atlas.height,name==='cyan'?3:0);
   }
 }
 const ranges=[],data=[];
 for(const [key,verts] of groups){
   const [zone,mode]=key.split(':');ranges.push({zone,mode,offset:data.length/9,count:verts.length/9});
   for(const v of verts)data.push(v);
 }
 const sceneBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,sceneBuffer);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
 
 function draw(mode){for(const r of ranges)if(r.mode===mode)gl.drawArrays(gl.TRIANGLES,r.offset,r.count);}
 for(const [key,n,offset] of [['position',3,0],['normal',3,3],['uv',2,6],['kind',1,8]]){
   const i=gl.getAttribLocation(pr,key);gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,n,gl.FLOAT,false,36,offset*4);
 }
 const mirrorTex=gl.createTexture();gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,mirrorTex);
 const rw=Math.min(1200,innerWidth),rh=Math.max(1,Math.round(rw*innerHeight/innerWidth));gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,rw,rh,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
 for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
 for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
 const fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,mirrorTex,0);
 const depth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,rw,rh);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 gl.uniform1i(uniforms.displays,3);gl.uniform1i(uniforms.sheet,0);gl.uniform1i(uniforms.space,1);gl.uniform1i(uniforms.reflected,2);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(.025,.046,.065,1);
 view.prepend(canvas);document.documentElement.classList.add('accelerated-ship');
 for(const item of live)item.el.classList.add('live-display');
 const visibleElements=new Set(live.map(i=>i.el));
 for(const el of all)if(!visibleElements.has(el))el.remove();
 const gpuInfo=gl.getExtension('WEBGL_debug_renderer_info');
 const software=gpuInfo&&/swiftshader|llvmpipe|software/i.test(gl.getParameter(gpuInfo.UNMASKED_RENDERER_WEBGL));

 let lastReflection=-Infinity;
 let previousPose=null;

 window.renderShip=(now,ex,ey,ez,yaw,pitch,lens)=>{
   showRoom(ex,ez);
   const pixelRatio=Math.min(devicePixelRatio||1,1.5);
   const pose=[ex,ey,ez,yaw,pitch,innerWidth,innerHeight,pixelRatio].join('/');
   if(previousPose===pose && now-lastReflection<110)return;
   const moving=previousPose!==pose;previousPose=pose;
   gl.uniform1f(uniforms.moving,0);
   const w=Math.round(innerWidth*pixelRatio),h=Math.round(innerHeight*pixelRatio);
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   gl.uniform3f(uniforms.eye,ex,ey,ez);gl.uniform4f(uniforms.angles,Math.sin(yaw),Math.cos(yaw),Math.sin(pitch),Math.cos(pitch));
   gl.uniform2f(uniforms.proj,2*lens/innerWidth,2*lens/innerHeight);gl.uniform1f(uniforms.clock,now*.001);
   if(moving || now-lastReflection>100){
     gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,null);gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.viewport(0,0,rw,rh);
     gl.uniform1f(uniforms.mirror,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);draw('solid');
     gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindTexture(gl.TEXTURE_2D,mirrorTex);lastReflection=now;
   }
   gl.viewport(0,0,w,h);gl.uniform2f(uniforms.viewport,w,h);gl.uniform1f(uniforms.mirror,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   draw('solid');gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
   draw('glass');gl.depthMask(true);gl.disable(gl.BLEND);
 };
})();
