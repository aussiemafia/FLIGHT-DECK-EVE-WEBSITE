// Perspective-matched 3D vegetation. All trunks, branch rings and leaf clusters
// live in ship coordinates; the hall contributes its walls to the depth buffer.
(function(){
  const canvas=document.createElement('canvas');
  canvas.id='conservatory';canvas.setAttribute('aria-hidden','true');
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true});
// A CSS 3D renderer keeps the grove volumetric on devices without WebGL.
function mountLayeredGrove(){
  let seed=9217;
  function rng(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  function div(cls){const n=document.createElement('div');n.className=cls;return n}
  function at(n,x,y,z){n.style.transform='translate3d('+x+'px,'+y+'px,'+z+'px)';return n}
  const prototype=div('maple-mesh');
  function limb(parent,a,b,r){
    const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],l=Math.hypot(dx,dy,dz);
    const group=at(div('branch-axis'),...a);
    const yaw=Math.atan2(dx,dz),pitch=Math.atan2(Math.hypot(dx,dz),-dy);
    group.style.transform+=' rotateY('+yaw+'rad) rotateX('+(-pitch)+'rad)';
    for(let i=0;i<4;i++){
      const panel=div('bark-facet'),w=2*r*Math.tan(Math.PI/4);
      Object.assign(panel.style,{width:(w+.5)+'px',height:(l+1)+'px',left:-w/2+'px',top:-l+'px',
        clipPath:'polygon(14% 0,86% 0,100% 100%,0 100%)',
        transform:'rotateY('+i*90+'deg) translateZ('+r*.81+'px)',
        filter:'brightness('+(.80+.28*Math.cos(i*1.26+.7))+')'});
      group.append(panel);
    }
    parent.append(group);
  }
  function crown(parent,p,s){
    const wave=at(div('leaf-joint'),...p),moving=div('leaf-spray');
    moving.style.animationDelay=(-rng()*9)+'s';
    for(let j=0;j<3;j++){
      const card=div('leaf-cluster'),w=(68+rng()*27)*s,h=w*.70,idx=Math.floor(rng()*8);
      Object.assign(card.style,{width:w+'px',height:h+'px',left:-w/2+'px',top:-h/2+'px',
        backgroundPosition:(idx%4)*100/3+'% '+Math.floor(idx/4)*100+'%',
        transform:'translate3d('+((rng()-.5)*18)+'px,'+((rng()-.5)*12)+'px,'+((rng()-.5)*18)+'px) rotateY('+j*60+'deg) rotateX('+((rng()-.5)*74)+'deg)'});
      moving.append(card);
    }
    wave.append(moving);parent.append(wave);
  }
  function fork(a,az,up,len,r,d){
    const b=[a[0]+Math.cos(az)*Math.cos(up)*len,a[1]-Math.sin(up)*len,a[2]+Math.sin(az)*Math.cos(up)*len];
    limb(prototype,a,b,r);
    if(d<2)crown(prototype,b,d?1.12:.96);
    if(!d)return;
    for(const sign of [-1,1])fork(b,az+sign*(.47+rng()*.7),up*.52+.20+rng()*.28,len*(.63+rng()*.12),r*.61,d-1);
  }
  for(let i=0;i<4;i++){
    const a=i*1.58+.19,neck=[Math.cos(a)*12,-61-i*4,Math.sin(a)*12],forkPt=[Math.cos(a+.36)*25,-102-i*5,Math.sin(a+.36)*25];
    limb(prototype,[Math.cos(a)*4,0,Math.sin(a)*4],neck,8.6);limb(prototype,neck,forkPt,6);
    fork(forkPt,a,.70+i*.14,94+i*2,5,2);
  }
  const loaded=new Map();
  function update(){
    if(!document.hidden){
      const ranked=trees.map((t,i)=>({t,i,d:Math.hypot(visitor.x-t.x,visitor.z-t.z)})).filter(c=>c.d<6200&&((c.t.x-visitor.x)*Math.sin(visitor.yaw)-(c.t.z-visitor.z)*Math.cos(visitor.yaw)>-450)).sort((a,b)=>a.d-b.d);
      const nearest=new Set(ranked.slice(0,4).map(c=>c.i));
      for(const [i,node] of loaded)if(!nearest.has(i)){node.remove();loaded.delete(i)}
      for(const {t,i} of ranked){
        if(!nearest.has(i)||loaded.has(i))continue;
        const n=prototype.cloneNode(true);
        n.style.transform='translate3d('+t.x+'px,0,'+t.z+'px) rotateY('+i*67+'deg) scale3d('+t.scale+','+t.scale+','+t.scale+')';
        hall.append(n);loaded.set(i,n);
      }
    }
    setTimeout(update,500);
  }
  update();
}

  if(!gl){mountLayeredGrove();return}
  const vertex=`
    attribute vec3 pos,norm;attribute vec2 uv;attribute float flex;
    uniform vec3 base,cam;uniform vec2 turn,look,lens,spin;
    uniform float time,phase,treeScale;varying vec2 tex;varying float light;
    void main(){
      vec3 p=pos;p.x+=flex*(2.0*sin(time*.74+phase+p.y*.009)+.9*sin(time*1.3+p.z*.032));
      p.z+=flex*sin(time*.53+phase+p.x*.012)*1.8;
      p.xz=mat2(spin.x,-spin.y,spin.y,spin.x)*p.xz;
      vec3 d=p*treeScale+base-cam;
      float x=turn.x*d.x+turn.y*d.z,z=-turn.y*d.x+turn.x*d.z;
      float y=look.x*d.y-look.y*z,w=-(look.y*d.y+look.x*z);
      gl_Position=vec4(x*lens.x,-y*lens.y,w*1.0001-2.0,w);
      tex=uv;vec3 n=norm;n.xz=mat2(spin.x,-spin.y,spin.y,spin.x)*n.xz;
      light=.70+.33*max(0.,dot(n,normalize(vec3(-.45,-.9,.33))))+.13*max(0.,dot(n,vec3(.7,-.3,-.55)));
    }`;
  const fragment=`precision mediump float;varying vec2 tex;varying float light;
    uniform sampler2D image;uniform float leaves;
    void main(){vec4 c=texture2D(image,tex);if(leaves>.5&&c.a<.44)discard;
    gl_FragColor=vec4(c.rgb*light,1.);}`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);return s}
  const program=gl.createProgram();
  gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS)){mountLayeredGrove();return;}gl.useProgram(program);
  const u=Object.fromEntries(['base','cam','turn','look','lens','spin','time','phase','leaves','treeScale'].map(k=>[k,gl.getUniformLocation(program,k)]));
  const attributes=['pos','norm','uv','flex'].map(k=>gl.getAttribLocation(program,k));
  function buffer(data){
    const id=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,id);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
    return {id,count:data.length/9};
  }
  function bind(b){gl.bindBuffer(gl.ARRAY_BUFFER,b.id);let offset=0;
    [3,3,2,1].forEach((size,i)=>{gl.enableVertexAttribArray(attributes[i]);gl.vertexAttribPointer(attributes[i],size,gl.FLOAT,false,36,offset*4);offset+=size})}
  const normalize=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l)};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const add=(a,b,s=1)=>a.map((v,i)=>v+b[i]*s);
  let seed=65139;
  function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  const wood=[],leaves=[];
  function limb(a,b,r1,r2){
    const axis=normalize(b.map((v,i)=>v-a[i])),right=normalize(cross(axis,[0,0,1])),forward=cross(axis,right);
    function point(t,top){const n=add(right.map(v=>v*Math.cos(t)),forward,Math.sin(t));const p=add(top?b:a,n,top?r2:r1);
      return [...p,...n,t/(2*Math.PI),top?0:1,Math.max(0,(-p[1]-90)/225)*.45]}
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,b=(i+1)*Math.PI/4;
      const p=point(a,false),q=point(b,false),r=point(b,true),s=point(a,true);
      wood.push(...p,...q,...r,...p,...r,...s);
    }
  }
  function foliage(p,spread){
    for(let i=0;i<8;i++){
      const az=rand()*Math.PI*2,sz=12+rand()*13,angle=rand()*6.283;
      const centre=add(p,[Math.cos(angle)*spread,rand()*10-5,Math.sin(angle)*spread],rand());
      const lateral=[Math.cos(az)*sz,0,Math.sin(az)*sz],vertical=[Math.sin(az)*sz*.28,-sz*.72,-Math.cos(az)*sz*.28];
      const norm=normalize(cross(lateral,vertical));const tile=Math.floor(rand()*8);
      const points=[[0,0],[1,0],[1,1],[0,1]].map(([a,b])=>{
        const v=add(add(centre,lateral,2*a-1),vertical,1-2*b);
        return [...v,...norm,((tile%4)+.01+a*.98)/4,(Math.floor(tile/4)+.01+b*.98)/2,Math.max(.25,-v[1]/270)];
      });
      for(const j of [0,1,2,0,2,3])leaves.push(...points[j]);
    }
  }
  function branch(origin,az,rise,len,radius,depth){
    const dir=[Math.cos(az)*Math.cos(rise),-Math.sin(rise),Math.sin(az)*Math.cos(rise)];
    const mid=add(origin,dir,len*.52);mid[1]-=radius*.8;
    const end=add(origin,dir,len);limb(origin,mid,radius,radius*.8);limb(mid,end,radius*.8,radius*.6);
    if(depth<=1)foliage(end,18);
    if(!depth)return;
    for(const sign of [-1,1])branch(end,az+sign*(.35+rand()*.8),Math.max(.05,rise*.61+rand()*.5-.08),len*(.59+rand()*.19),radius*.62,depth-1);
  }
  for(let i=0;i<4;i++){
    const az=i*1.68+.3;
    const base=[Math.cos(az)*4,0,Math.sin(az)*4];
    const neck=[Math.cos(az+.25)*14,-67-rand()*18,Math.sin(az+.25)*14];
    const fork=[Math.cos(az)*29,neck[1]-34,Math.sin(az)*29];
    limb(base,neck,8-i*.5,6);limb(neck,fork,6,5);
    branch(fork,az,.69+rand()*.52,67+rand()*19,5.7,5);
  }
  const trunkMesh=buffer(wood),leafMesh=buffer(leaves);
  const depth=[];
  for(const el of hall.querySelectorAll('.bay-shell,.door-leaf,.chamber-lid,.chamber-floor,.floor,.galaxy-window,.end-vista,.screen,.simulation,.learning-panel,.console')){
    if(el.classList.contains('door-leaf'))continue; // moving leaves handled below
    const {w,h,x,y,z,ry,rx}=el.geometry;
    for(const i of [0,1,2,0,2,3]){
      const a=[-1,1,1,-1][i]*w/2,b=[-1,-1,1,1][i]*h/2;
      const t=b*Math.sin(rx);depth.push(x+a*Math.cos(ry)+t*Math.sin(ry),y+b*Math.cos(rx),z-a*Math.sin(ry)+t*Math.cos(ry),0,-1,0,0,0,0);
    }
  }
  const depthMesh=buffer(depth);
  async function texture(url){
    const im=new Image();im.src=url;await im.decode();
    const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return tex;
  }
  Promise.all([texture('assets/maple-bark.webp'),texture('assets/maple-foliage.webp')]).then(([bark,canopy])=>{
    byId('viewport').append(canvas);document.body.classList.add('mesh-garden');
    canvas.addEventListener('webglcontextlost',()=>{canvas.hidden=true;mountLayeredGrove()},{once:true});
    gl.enable(gl.DEPTH_TEST);
    let previous=-1000,saved='';
    function render(now){
      requestAnimationFrame(render);
      if(document.hidden||gl.isContextLost())return;
      const {x,z,yaw,pitch}=visitor,eye=standingEye(),stamp=[x,z,yaw,pitch,eye,innerWidth,innerHeight].join('/');
      if(stamp===saved&&(reduced.matches||now-previous<90))return;
      saved=stamp;previous=now;
      const res=Math.min(1.25,devicePixelRatio||1);
      const w=Math.round(innerWidth*res),h=Math.round(innerHeight*res);
      if(w!==canvas.width||h!==canvas.height){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.uniform3f(u.cam,x,-eye,z);gl.uniform2f(u.turn,Math.cos(yaw),Math.sin(yaw));gl.uniform2f(u.look,Math.cos(pitch),Math.sin(pitch));
      const f=parseFloat(view.style.perspective);gl.uniform2f(u.lens,2*f/innerWidth,2*f/innerHeight);
      gl.uniform1f(u.time,reduced.matches?0:now/1000);gl.uniform1f(u.phase,0);gl.uniform1f(u.leaves,0);
      gl.uniform1f(u.treeScale,1);gl.uniform2f(u.spin,1,0);gl.uniform3f(u.base,0,0,0);gl.bindTexture(gl.TEXTURE_2D,bark);
      gl.colorMask(false,false,false,false);bind(depthMesh);gl.drawArrays(gl.TRIANGLES,0,depthMesh.count);gl.colorMask(true,true,true,true);
      for(const [mesh,tex,material] of [[trunkMesh,bark,0],[leafMesh,canopy,1]]){
        bind(mesh);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1f(u.leaves,material);
        for(const [i,t] of trees.entries()){
          const dx=t.x-x,dz=t.z-z;if(Math.hypot(dx,dz)>6600||dx*Math.sin(yaw)-dz*Math.cos(yaw)<-220)continue;
          if(Math.abs(x)>boundary+200&&!sightLine(x,z,t.x,t.z))continue;
          gl.uniform1f(u.treeScale,t.scale);gl.uniform2f(u.spin,Math.cos(i*1.61),Math.sin(i*1.61));gl.uniform1f(u.phase,i*1.77);
          gl.uniform3f(u.base,t.x,0,t.z);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
        }
      }
    }
    requestAnimationFrame(render);
  }).catch(mountLayeredGrove);
})();
