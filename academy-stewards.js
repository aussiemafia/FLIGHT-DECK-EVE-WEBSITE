'use strict';
(()=>{
  const guides=[
    {name:'Iris · Exploration tutor',x:-205,z:2230,room:rooms[0],tone:'#94d7da'},
    {name:'Orris · Fleet tutor',x:270,z:-2350,room:rooms[6],tone:'#edc482'}
  ];
  for(const g of guides){
    const node=face('academy-steward',99,148,g.x,-74,g.z);g.node=node;node.style.setProperty('--optic',g.tone);
    for(const kind of ['head','visor','torso','collar','arm left','arm right','leg left','leg right']){
      const part=document.createElement('i');part.className='unit-'+kind;node.append(part)
    }
    const title=document.createElement('small');title.textContent=g.name;node.append(title);
    interactive.set(node,{name:'Ask '+g.name.split(' · ')[0]+' about '+g.room.name,action:()=>{window.startStationLesson(g.room)}});
  }
  function step(now){
    requestAnimationFrame(step);if(document.hidden)return;
    guides.forEach((g,i)=>{
      const a=now*.00026+i*Math.PI;const x=g.x+Math.sin(a)*107,z=g.z+Math.sin(a*2)*36;
      const yaw=Math.atan2(Math.cos(a)*107,-Math.cos(a*2)*72),toward=Math.atan2(visitor.x-x,visitor.z-z);
      Object.assign(g.node.geometry,{x,z,ry:toward});g.node.dataset.heading=String(yaw);g.node.dataset.stride=String(reduced.matches?0:Math.sin(now*.0039+i));
      g.node.style.transform='translate3d('+x+'px,-74px,'+z+'px) rotateY('+toward+'rad)';
    });
  }
  requestAnimationFrame(step);
})();
