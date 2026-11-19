// Every pane samples the same panorama in ship coordinates, including the six
// faces around the skylight. Translating the viewer changes each pane's view.
(function(){
  const systems=['Aurora Reach','Amarr dusk','Blue Meridian'];
  let mode=0,texture=null,sourceW=0,sourceH=0,last='',cursor=0;
  const image=new Image();image.src='assets/celestial-panorama.webp';
  const selector=byId('outside');selector.onchange=()=>{mode=selector.selectedIndex;last='';sky.style.filter='hue-rotate('+[0,37,-39][mode]+'deg)';for(const el of windows())el.dataset.skyStamp='';paintCube()};
  function windows(){return hall.querySelectorAll('.galaxy-window,.end-vista,.side-window')}
  function uv(x,y,z){
    const length=Math.hypot(x,y,z);
    return [(.5+Math.atan2(x,-z)/(2*Math.PI)+[0,.32,-.29][mode]+1)%1,.5+Math.asin(Math.max(-1,Math.min(1,y/length)))/Math.PI];
  }
  function sampleSurface(w,h,dir){
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const g=canvas.getContext('2d'),im=g.createImageData(w,h),out=new Uint32Array(im.data.buffer);
    const step=12;
    for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){
      const dx=Math.min(step,w-x),dy=Math.min(step,h-y);
      const corners=[[x,y],[x+dx,y],[x,y+dy],[x+dx,y+dy]].map(([a,b])=>uv(...dir(a/w-.5,b/h-.5)));
      for(const c of corners){if(c[0]-corners[0][0]>.5)c[0]--;if(c[0]-corners[0][0]<-.5)c[0]++}
      for(let j=0;j<dy;j++){
        const v=j/dy,a=corners[0][0]*(1-v)+corners[2][0]*v,b=corners[1][0]*(1-v)+corners[3][0]*v;
        const c=corners[0][1]*(1-v)+corners[2][1]*v,d=corners[1][1]*(1-v)+corners[3][1]*v;
        for(let k=0;k<dx;k++){
          const p=k/dx,tx=Math.floor((a+(b-a)*p+1)*sourceW)%sourceW;
          const ty=Math.max(0,Math.min(sourceH-1,Math.floor((c+(d-c)*p)*sourceH)));
          out[(y+j)*w+x+k]=texture[ty*sourceW+tx];
        }
      }
    }
    g.putImageData(im,0,0);return canvas;
  }
  function direction(g,u,v,cx,cy,cz){
    const a=u*g.w,b=v*g.h,depth=b*Math.sin(g.rx);
    return [g.x+a*Math.cos(g.ry)+depth*Math.sin(g.ry)-cx,g.y+b*Math.cos(g.rx)-cy,g.z-a*Math.sin(g.ry)+depth*Math.cos(g.ry)-cz];
  }
  function paintCube(){
    if(!texture)return;
    for(const tile of sky.children){
      const cv=sampleSurface(640,640,(u,v)=>direction(tile.geometry,u,v,0,0,0));
      tile.replaceChildren(cv);tile.style.backgroundImage='none';
    }
  }
  function refresh(){
    if(!window.hdStation&&!document.hidden&&texture){
      const panes=windows(),stamp=[Math.round(visitor.x/85),Math.round(visitor.z/85),Math.round(standingEye()/55),mode].join('.');
      let done=0;
      for(let j=0;j<panes.length&&done<2;j++){
        const index=(cursor+j)%panes.length,el=panes[index],g=el.geometry,dx=g.x-visitor.x,dz=g.z-visitor.z;
        if(el.hidden||el.dataset.skyStamp===stamp||Math.hypot(dx,dz)>6500||dx*Math.sin(visitor.yaw)-dz*Math.cos(visitor.yaw)<-200)continue;
        const w=Math.min(1024,Math.max(320,Math.round(g.w*.80))),h=Math.max(96,Math.round(w*g.h/g.w));
        const cv=sampleSurface(w,h,(u,v)=>direction(g,u,v,visitor.x,-standingEye(),visitor.z));
        el.replaceChildren(cv);el.dataset.skyStamp=stamp;el.style.backgroundImage='none';
        el.style.setProperty('--sky-hue',[0,37,-39][mode]+'deg');done++;cursor=(index+1)%panes.length;
      }
    }
    setTimeout(refresh,100);
  }
  image.onload=()=>{const c=document.createElement('canvas');sourceW=c.width=image.width;sourceH=c.height=image.height;
    const ctx=c.getContext('2d');ctx.drawImage(image,0,0);texture=new Uint32Array(ctx.getImageData(0,0,sourceW,sourceH).data.buffer);paintCube();refresh()};
})();
