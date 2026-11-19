(function(){
  let lit=null;
  const nearbyDoors=new Map();
  function actionFor(d){
    if(nearbyDoors.has(d))return nearbyDoors.get(d);
    const choice={name:'Pass through · '+d.label,action:()=>{
      const normalX=-d.uz,normalZ=d.ux;
      const signed=(visitor.x-d.x)*normalX+(visitor.z-d.z)*normalZ;
      const direction=signed>=0?-1:1;
      for(let i=0;i<24;i++)updateDoors(.03);
      const x=d.x+normalX*direction*98,z=d.z+normalZ*direction*98;
      if(clear(x,z)){visitor.x=x;visitor.z=z;visitor.yaw=Math.atan2(normalX*direction,-normalZ*direction);visitor.pitch=.02;draw()}
    }};
    nearbyDoors.set(d,choice);return choice;
  }
  function nearest(){
    const fx=Math.sin(visitor.yaw),fz=-Math.cos(visitor.yaw);
    let best=null,score=Infinity;
    for(const d of doors){
      const dx=d.x-visitor.x,dz=d.z-visitor.z,range=Math.hypot(dx,dz);
      if(range<335&&dx*fx+dz*fz>-10&&range<score){best=actionFor(d);score=range}
    }
    for(const [node,choice] of interactive){
      if(node.hidden||node.style.visibility==='hidden'||!node.isConnected)continue;
      if(choice.room&&choice.room!==currentRoom||choice.side&&choice!==currentRoom)continue;
      const g=node.geometry,dx=g.x-visitor.x,dz=g.z-visitor.z,range=Math.hypot(dx,dz);
      if(range>410||range>score||dx*fx+dz*fz<range*.25)continue;
      if(choice.seatId&&(seated||window.flightCrew?.occupied(choice.seatId)))continue;
      best=choice;score=range;
    }
    return best;
  }
  window.stationPrompt=nearest;
  const lanes=[...hall.querySelectorAll('.path-light')];
  function illuminate(){
    if(document.hidden)return;
    const n=nearest();
    for(const [el,item] of interactive)el.classList.toggle('within-reach',item===n||item===target);
    for(const el of lanes){
      const g=el.geometry;el.classList.toggle('approach',Math.hypot(g.x-visitor.x,g.z-visitor.z)<540);
    }
    if(n!==lit&&!menu.open&&!record.open){lit=n;draw()}
  }
  setInterval(illuminate,160);illuminate();
})();
