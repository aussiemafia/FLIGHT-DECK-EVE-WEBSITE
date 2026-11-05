// Nebula image: EVE Online community, https://forums.eveonline.com/t/unleash-the-beauty-of-eve/509079
// A single sky surrounds the station. Port windows expose the same world bearings.
(() => {
  const canvas=document.getElementById('exterior');
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false});
  const nebula=new Image();
  nebula.src='new-eden-nebula.webp';
  if(!gl){
    canvas.style.backgroundImage='url(new-eden-nebula.webp)';
    canvas.style.backgroundSize='auto 150%';
    window.drawExterior=(_,yaw,pitch)=>canvas.style.backgroundPosition=
      (50+45*Math.sin(yaw))+'% '+(50+35*Math.sin(pitch))+'%';
    return;
  }
  function compile(type,source){
    const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  const program=gl.createProgram();
  gl.attachShader(program,compile(gl.VERTEX_SHADER,'attribute vec2 pos; void main(){gl_Position=vec4(pos,0.,1.);}'));
  gl.attachShader(program,compile(gl.FRAGMENT_SHADER,`
    precision highp float;
    uniform vec2 size;uniform float lens,yaw,pitch,clock;uniform sampler2D sky;
    float noise(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
    void main(){
      vec2 d=(gl_FragCoord.xy-.5*size)/lens;
      vec3 r=normalize(vec3(d.x,d.y,1.));
      float cp=cos(pitch),sp=sin(pitch),cy=cos(yaw),sy=sin(yaw);
      r=vec3(r.x,cp*r.y-sp*r.z,sp*r.y+cp*r.z);
      r=vec3(cy*r.x+sy*r.z,r.y,-sy*r.x+cy*r.z);
      float lon=atan(r.x,r.z),lat=asin(clamp(r.y,-1.,1.));
      vec2 uv=vec2(.5+lon/3.7,.5-lat/2.);
      vec2 edge=smoothstep(vec2(0.),vec2(.15),uv)*smoothstep(vec2(0.),vec2(.15),1.-uv);
      vec3 color=mix(vec3(.014,.023,.038),texture2D(sky,clamp(uv,0.,1.)).rgb,edge.x*edge.y);
      vec3 grid=r*225.;float seed=noise(floor(grid));
      float star=1.-smoothstep(.05,.23,length(fract(grid)-.5));
      color+=vec3(.7,.84,1.)*star*step(.58,seed)*(.65+.25*sin(clock*.5+seed*29.));
      gl_FragColor=vec4(color,1.);
    }`));
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'pos');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
  for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
  for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array([4,9,14]));
  function uploadSky(){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,nebula);}
  if(nebula.complete&&nebula.naturalWidth)uploadSky();else nebula.onload=uploadSky;
  const u=Object.fromEntries(['size','lens','yaw','pitch','clock'].map(k=>[k,gl.getUniformLocation(program,k)]));
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  window.drawExterior=(now,yaw,pitch,lens)=>{
    if(canvas.width!==innerWidth||canvas.height!==innerHeight){
      canvas.width=innerWidth;canvas.height=innerHeight;gl.viewport(0,0,canvas.width,canvas.height);
    }
    gl.uniform2f(u.size,canvas.width,canvas.height);gl.uniform1f(u.lens,lens);
    gl.uniform1f(u.yaw,yaw);gl.uniform1f(u.pitch,pitch);gl.uniform1f(u.clock,motion.matches?0:now/1000);
    gl.drawArrays(gl.TRIANGLES,0,3);
  };
})();
