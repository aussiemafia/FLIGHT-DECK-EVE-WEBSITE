// Perspective-matched 3D vegetation. All trunks, branch rings and leaf clusters
// live in ship coordinates; the hall contributes its walls to the depth buffer.
(function(){
  const canvas=document.createElement('canvas');
  canvas.id='conservatory';canvas.setAttribute('aria-hidden','true');
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true});
function mountLayeredGrove(){
  const layer=document.createElement('canvas');layer.id='conservatory';byId('viewport').append(layer);
  const ctx=layer.getContext('2d');if(!ctx)return;
  const atlas=new Image();atlas.src='assets/maple-foliage.webp';
  let seed=7219;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  const parts=[];
  function limb(a,b,r){
    parts.push({a,b,r});
  }
  function fork(a,az,up,len,r,d){
    const b=[a[0]+Math.cos(az)*Math.cos(up)*len,a[1]-Math.sin(up)*len,a[2]+Math.sin(az)*Math.cos(up)*len];
    limb(a,b,r);
    if(d<2)for(let j=0;j<5;j++){
      const t=random()*6.283,p=[b[0]+(random()-.5)*19,b[1]+(random()-.5)*13,b[2]+(random()-.5)*19],w=23+random()*16;
      parts.push({p,t,w,tile:Math.floor(random()*8),tilt:random()*.8-.4});
    }
    if(!d)return;
    for(const sign of [-1,1])fork(b,az+sign*(.39+random()*.8),up*.56+.17+random()*.25,len*(.63+random()*.12),r*.61,d-1);
  }
  for(let i=0;i<4;i++){
    const az=i*1.58+.19,n=[Math.cos(az)*13,-68-i*4,Math.sin(az)*13],p=[Math.cos(az+.3)*27,-106-i*5,Math.sin(az+.3)*27];
    limb([Math.cos(az)*4,0,Math.sin(az)*4],n,8.6);limb(n,p,6);fork(p,az,.66+i*.13,86,5,3);
  }
  let old='',last=0;
  function render(now){
    requestAnimationFrame(render);if(window.hdStation||document.hidden||!atlas.complete||!atlas.naturalWidth)return;
    const {x,z,yaw,pitch}=visitor,eye=standingEye(),stamp=[x,z,yaw,pitch,eye,innerWidth,innerHeight].join('/');
    if(stamp===old&&(reduced.matches||now-last<145))return;
    old=stamp;last=now;const res=Math.min(devicePixelRatio||1,1.4),w=innerWidth,h=innerHeight;
    if(layer.width!==Math.round(w*res)||layer.height!==Math.round(h*res)){layer.width=Math.round(w*res);layer.height=Math.round(h*res)}
    ctx.setTransform(res,0,0,res,0,0);ctx.clearRect(0,0,w,h);
    const cs=Math.cos(yaw),sn=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),f=parseFloat(view.style.perspective);
    function project(X,Y,Z){
      const dx=X-x,dy=Y+eye,dz=Z-z,q=-sn*dx+cs*dz,depth=-(sp*dy+cp*q);
      if(depth<4)return null;
      return {x:w/2+f*(cs*dx+sn*dz)/depth,y:h/2+f*(cp*dy-sp*q)/depth,d:depth,k:f/depth};
    }
    const draws=[];
    for(const [i,tr] of trees.entries()){
      const dx=tr.x-x,dz=tr.z-z,dist=Math.hypot(dx,dz);
      if(dist>6100||dx*sn-dz*cs<-530||!sightLine(x,z,tr.x,tr.z))continue;
      const rot=i*1.671,c=Math.cos(rot),s=Math.sin(rot),sz=tr.scale;
      function point(p){return project(tr.x+sz*(p[0]*c-p[2]*s),sz*p[1],tr.z+sz*(p[0]*s+p[2]*c))}
      for(const part of parts){
        if(part.a){
          const a=point(part.a),b=point(part.b);
          if(a&&b)draws.push({a,b,r:Math.max(.45,part.r*sz*(a.k+b.k)),d:(a.d+b.d)/2});
        }else{
          const {p,w:radius,t,tile,tilt}=part;
          const sway=reduced.matches?0:Math.sin(now*.00064+i+p[1]*.009)*1.8;
          const v=[p[0]+sway,p[1],p[2]],centre=point(v);if(!centre)continue;
          const spread=radius*sz*centre.k*1.6;
          if(centre.x+spread<0||centre.x-spread>w||centre.y+spread<0||centre.y-spread>h)continue;
          const side=point([v[0]+radius*Math.cos(t),v[1]+tilt*radius*.24,v[2]+radius*Math.sin(t)]);
          const up=point([v[0]+tilt*radius*.28,v[1]-radius*.68,v[2]+tilt*radius*.32]);
          if(side&&up)draws.push({centre,side,up,tile,d:centre.d});
        }
      }
    }
    draws.sort((a,b)=>b.d-a.d);
    for(const item of draws){
      if(item.a){
        const {a,b,r}=item;ctx.setTransform(res,0,0,res,0,0);ctx.lineCap='round';ctx.lineWidth=r;ctx.strokeStyle='#534539';
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
        if(r>2){ctx.lineWidth=r*.43;ctx.strokeStyle='#8c7760';ctx.beginPath();ctx.moveTo(a.x-r*.13,a.y);ctx.lineTo(b.x-r*.07,b.y);ctx.stroke()}
      }else{
        const {centre:c,side:s,up:u,tile}=item;
        ctx.setTransform((s.x-c.x)*res,(s.y-c.y)*res,(c.x-u.x)*res,(c.y-u.y)*res,c.x*res,c.y*res);
        ctx.drawImage(atlas,(tile%4)*128,Math.floor(tile/4)*128,128,128,-1,-1,2,2);
      }
    }
  }
  requestAnimationFrame(render);
}
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
  window.groveGeometry={wood,leaves};
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
      if(document.hidden||window.hdStation||gl.isContextLost())return;
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
