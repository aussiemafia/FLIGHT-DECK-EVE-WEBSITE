'use strict';
(()=>{
  const films={story:'transit',wormholes:'transit',ships:'fortizar',systems:'transit',estimate:'ore',drifters:'crystal',fits:'fortizar',sites:'fortizar','blue-loot':'crystal'};
  const checks={
    wormholes:['After crossing, what should you bookmark?', ['The return side','Only the sun'],0],
    ships:['What confirms a hull’s role?', ['Its paintwork','Its bonuses and fittings'],1],
    systems:['Which identifier belongs in the atlas?', ['The J-number','A pilot name'],0],
    estimate:['What changes the hourly yield?', ['Hull colour','Harvesting time and cycle length'],1],
    drifters:['How can you identify an encounter?', ['Check names and silhouettes against the site record','Count the stars'],0],
    fits:['Where can you check a fit with your skills?', ['The ship simulator','The map legend'],0],
    sites:['What should you identify before firing?', ['The next stargate','The wave trigger'],1],
    'blue-loot':['What do you compare before selling?', ['The current buy order and after-tax total','Only the icon colour'],0],
    story:['What gives an event context?', ['Who took part and where it happened','The number of ships in your hangar'],0]
  };
  const panel=byId('lesson-panel'),open=byId('lesson-launch'),voice=byId('lesson-audio'),film=byId('lesson-film'),answers=byId('lesson-answers');
  let station=null,active=null;
  function find(){return currentRoom||window.stationCity?.classroomAt(visitor.x,visitor.z)||(seated&&visitor.z>gardenEnd?{name:'Fireside archive',route:'story'}:null)}
  function narrate(){window.stopShipIntercom?.();voice.volume=window.shipAudio.volume;voice.play().catch(()=>{});}
  function begin(s){
    const lines=flightLessons[s.route],quiz=checks[s.route];if(!lines||!quiz)return;
    active=s.route;keys.clear();byId('lesson-title').textContent=lines[0];byId('lesson-copy').textContent=lines.slice(1).join(' ');
    film.src='assets/exhibits/'+films[s.route]+'.mp4';voice.src='assets/lessons/'+s.route+'.mp3';
    byId('lesson-question').textContent=quiz[0];answers.replaceChildren();byId('lesson-feedback').textContent='';
    quiz[1].forEach((answer,i)=>{const b=document.createElement('button');b.textContent=answer;b.onclick=()=>{byId('lesson-feedback').textContent=i===quiz[2]?'Correct. '+lines[1]:'Try again. '+lines[1]};answers.append(b)});
    panel.showModal();film.play().catch(()=>{});narrate();
  }
  window.startStationLesson=s=>{if(!checks[s.route])return false;begin(s);return true};
  panel.addEventListener('close',()=>{voice.pause();film.pause();active=null;keys.clear()});
  panel.addEventListener('keydown',e=>{if(e.code!=='KeyV')e.stopPropagation()});
  byId('lesson-close').onclick=()=>panel.close();open.onclick=()=>{if(station)begin(station)};
  byId('lesson-archive').onclick=()=>{const s={name:flightLessons[active][0],route:active};panel.close();openStation({...s,archive:true})};
  document.addEventListener('stationvolume',()=>voice.volume=window.shipAudio.volume);
  setInterval(()=>{
    station=find();open.hidden=!station||panel.open||menu.open||record.open;
    if(station)open.textContent=(seated?'Seated lesson · ':'Listen & watch · ')+(flightLessons[station.route]?.[0]||station.name);
    if(!window.hdStation&&!reduced.matches&&!document.hidden){const f=Math.floor(performance.now()/50)%36;
      for(const el of hall.querySelectorAll('.hearth-flame'))el.style.backgroundPosition=(f%6*20)+'% '+(Math.floor(f/6)*20)+'%'}
  },110);
})();
