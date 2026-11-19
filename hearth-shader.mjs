import * as T from './assets/engine/three.mjs';
export function hearthFire(w,h,clock){
  const uniforms={time:clock};
  const shader=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.BackSide,
    vertexShader:`varying vec3 localPos;varying vec3 eye;void main(){localPos=position;eye=(inverse(modelMatrix)*vec4(cameraPosition,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 localPos;varying vec3 eye;uniform float time;
    float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
    float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+1.),f.x),f.y),f.z);}
    void main(){vec3 dir=normalize(localPos-eye);vec3 a=(-vec3(.5)-eye)/dir,b=(vec3(.5)-eye)/dir;
    vec3 mn=min(a,b),mx=max(a,b);float lo=max(0.,max(mn.x,max(mn.y,mn.z))),hi=min(mx.x,min(mx.y,mx.z));
    float stepL=(hi-lo)/24.;vec4 accum=vec4(0.);
    for(int i=0;i<24;i++){vec3 p=eye+(lo+(float(i)+.5)*stepL)*dir;
    float y=p.y+.5;vec3 q=vec3(p.x*10.,y*4.-time*1.6,p.z*3.);float n=.67*noise(q)+.22*noise(q*2.1)+.11*noise(q*4.2);
    float shape=clamp(1.-pow(abs(p.x)*2.,6.)-pow(abs(p.z)*2.,2.),0.,1.);
    float heat=max(0.,(n*.98+.07)*shape-y)*2.5;
    float alpha=1.-exp(-stepL*heat*13.);vec3 c=mix(vec3(1.,.105,.009),vec3(1.,.91,.48),smoothstep(.12,1.,heat));
    accum.rgb+=(1.-accum.a)*alpha*c;accum.a+=(1.-accum.a)*alpha;}
    if(accum.a<.01)discard;gl_FragColor=vec4(accum.rgb/max(.001,accum.a),accum.a);
    #include <colorspace_fragment>
    }`});
  const flame=new T.Mesh(new T.BoxGeometry(1,1,1),shader);
  flame.scale.set(w,h,66);const group=new T.Group();group.add(flame);return group;
}
