'use strict';
(()=>{
  const guides=[
    {name:'Iris · Exploration tutor',x:-280,z:2230,room:rooms[0]},
    {name:'Orris · Fleet tutor',x:360,z:-2350,room:rooms[6]}
  ];
  for(const [i,g] of guides.entries()){
    g.time=i*7;g.phase=i*3;g.heading=0;g.speed=1;
    const node=face('academy-steward',116.2,208.45,g.x,-104.22,g.z);g.node=node;
    const title=document.createElement('small');title.textContent=g.name;node.append(title);
    interactive.set(node,{name:'Learn with '+g.name.split(' · ')[0],action:()=>window.takeClassroomLesson(g.room)});
  }
  let last=performance.now();
  function step(now){
    requestAnimationFrame(step);const dt=Math.min(.12,(now-last)/1000);last=now;if(document.hidden)return;
    for(const g of guides){
      const n=g.node,p=n.geometry,range=Math.hypot(p.x-visitor.x,p.z-visitor.z);
      const waiting=range<220;
      g.speed+=(Number(!waiting)-g.speed)*(1-Math.exp(-dt*4));
      g.time+=dt*g.speed;const a=g.time*.19;
      const x=g.x+Math.sin(a)*290,z=g.z+Math.sin(a*2)*84;
      const distance=Math.hypot(x-p.x,z-p.z);
      g.phase=(g.phase+distance*2*Math.PI/93)%(2*Math.PI);
      const toward=Math.atan2(visitor.x-x,visitor.z-z),angle=waiting?Math.atan2(visitor.x-x,z-visitor.z):Math.atan2(Math.cos(a)*290,-Math.cos(a*2)*168);
      g.heading+=Math.atan2(Math.sin(angle-g.heading),Math.cos(angle-g.heading))*(1-Math.exp(-dt*4));
      Object.assign(p,{x,z,ry:toward});n.motion={heading:g.heading,phase:g.phase,weight:reduced.matches?0:g.speed};
      n.style.transform='translate3d('+x+'px,-104.22px,'+z+'px) rotateY('+toward+'rad)';
      if(!window.hdStation){
        const viewAngle=Math.atan2(visitor.x-x,z-visitor.z)-g.heading;
        const col=(Math.round(viewAngle*8/Math.PI)%16+16)%16,row=reduced.matches||g.speed<.18?8:Math.round(g.phase*4/Math.PI)%8;
        n.style.backgroundPosition=(col*100/15)+'% '+(row*100/8)+'%';
      }
    }
  }
  function visit(){
    menu.close();rise();window.stationCity?.reset();const g=guides[0].node.geometry;
    Object.assign(visitor,{x:g.x+40,z:g.z-218,yaw:Math.atan2(-40,-218),pitch:-.15});draw();
  }
  const link=document.createElement('button');link.textContent='Meet the exploration tutor';byId('destinations').append(link);link.onclick=visit;
  if(location.hash==='#meet-iris')visit();requestAnimationFrame(step);
})();
