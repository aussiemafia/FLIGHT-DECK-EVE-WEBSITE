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
  let station=null,active=null,teachingScreen=null,caption=null,lastRoom=null;
  let generation=0,chapter=0,utterance=null;
  function cancelGuide(){generation++;window.speechSynthesis?.cancel();utterance=null}
  function say(text,onEnd,onError){
    if(!window.speechSynthesis||window.guideMuted?.()){onError?.();return}
    const u=new SpeechSynthesisUtterance(text),voices=speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang));
    u.voice=voices.find(v=>/Sonia|Karen|Samantha|Hazel|Jenny|Aria|female/i.test(v.name))||voices[0]||null;
    u.rate=.94;u.volume=window.shipAudio.volume;u.onend=onEnd;u.onerror=onError;utterance=u;speechSynthesis.speak(u);
  }
  function clearScreen(){if(caption)caption.remove();if(teachingScreen)delete teachingScreen.dataset.lecture;teachingScreen=null;caption=null}
  function stop(){cancelGuide();if(panel.open)panel.close();voice.pause();film.pause();clearScreen();active=null}
  function project(){
    if(!active)return;
    const sentence=roomCourses[active][chapter];
    byId('lesson-copy').textContent=sentence;
    if(teachingScreen&&teachingScreen.dataset.lecture!==sentence){teachingScreen.dataset.lecture=sentence;caption.textContent=sentence}
  }

  function setGain(){voice.volume=window.shipAudio.volume;voice.muted=!!window.guideMuted?.();if(voice.muted)cancelGuide()}
  document.addEventListener('guidemute',setGain);
  function welcome(s){
    if(!active)cancelGuide();
    if(!s||!roomCourses[s.route]||active||window.guideMuted?.())return;
    window.stopShipIntercom?.();const text=s.name+' · Take a seat for '+roomCourses[s.route][0].toLowerCase()+'.';
    const tip=byId('announcement');tip.textContent=text;tip.hidden=false;setGain();say('Welcome to '+s.name+'. Please take a seat. Today we will '+roomCourses[s.route][0].toLowerCase()+'.');
    setTimeout(()=>{if(tip.textContent===text)tip.hidden=true},6500);
  }
  function find(){return currentRoom||window.stationCity?.classroomAt(visitor.x,visitor.z)||(seated&&visitor.z>gardenEnd?{name:'Fireside archive',route:'story'}:null)}
  function narrate(){
    window.stopShipIntercom?.();cancelGuide();setGain();const turn=generation;
    function read(){if(turn!==generation||!active)return;project();
      say(roomCourses[active][chapter],()=>{if(turn===generation&&active&&chapter<roomCourses[active].length-1){chapter++;read()}},()=>{
        if(turn!==generation||!active)return;byId('lesson-copy').textContent=roomCourses[active].slice(1).join(' ');
        if(!window.guideMuted?.())voice.play().catch(()=>{});
      });
    }
    read();
  }
  function begin(s,inSeat=false){
    const lines=roomCourses[s.route],quiz=checks[s.route];if(!lines||!quiz)return;
    active=s.route;chapter=0;keys.clear();byId('lesson-title').textContent=lines[0];byId('lesson-copy').textContent=lines.slice(1).join(' ');
    film.src='assets/exhibits/'+films[s.route]+'.mp4';voice.src='assets/lessons/'+s.route+'.mp3?v=academy7';
    byId('lesson-question').textContent=quiz[0];answers.replaceChildren();byId('lesson-feedback').textContent='';
    quiz[1].forEach((answer,i)=>{const b=document.createElement('button');b.textContent=answer;b.onclick=()=>{byId('lesson-feedback').textContent=i===quiz[2]?'Correct. '+lines[1]:'Try again. '+lines[1]};answers.append(b)});
    panel.classList.toggle('seated-lecture',inSeat);clearScreen();
    if(inSeat){
      teachingScreen=s.projection||s.screen||null;window.lastTeachingScreen=teachingScreen;window.stationCinema?.yieldScreen(teachingScreen);
      if(teachingScreen){caption=document.createElement('span');caption.className='lecture-caption';teachingScreen.append(caption);
        const g=teachingScreen.geometry;visitor.yaw=Math.atan2(g.x-visitor.x,visitor.z-g.z);visitor.pitch=.045}
      panel.show();
    }else panel.showModal();
    project();film.play().catch(()=>{});narrate();
  }
  window.startStationLesson=s=>{if(!checks[s.route])return false;begin(s);return true};
  panel.addEventListener('close',()=>{if(!panel.open){cancelGuide();voice.pause();film.pause();clearScreen();active=null;keys.clear()}});
  panel.addEventListener('keydown',e=>{if(e.code==='Space'&&seated){e.preventDefault();rise()}else if(e.code!=='KeyV')e.stopPropagation()});
  byId('lesson-close').onclick=()=>seated?rise():panel.close();open.onclick=()=>{if(station)begin(station)};
  byId('lesson-archive').onclick=()=>{const s={name:flightLessons[active][0],route:active};panel.close();openStation({...s,archive:true})};
  document.addEventListener('stationvolume',()=>voice.volume=window.shipAudio.volume);
  voice.addEventListener('play',cancelGuide);
  byId('lesson-next').onclick=()=>{if(!active)return;voice.pause();chapter=(chapter+1)%roomCourses[active].length;narrate()};
  const sit=byId('lesson-seat');
  function availableChair(){
    const room=currentRoom||window.stationCity?.classroomAt(visitor.x,visitor.z);
    if(seated||!room)return null;
    let best=null,distance=520;
    for(const c of chairs){if(c.room!==room&&!(room.width&&Math.abs(c.x)>room.width&&Math.abs(c.z-room.z)<room.half))continue;
      const d=Math.hypot(visitor.x-c.x,visitor.z-c.z);if(d<distance&&!window.flightCrew?.occupied(c.id)){best=c;distance=d}}
    return best
  }
  function take(){const c=availableChair();if(c)openStation(interactive.get(c.node))}
  sit.onclick=take;
  window.seatLearning={chair:availableChair,take,start(seat){const s=seat.room||find();if(s&&roomCourses[s.route])begin(s,true)},stop};
  setInterval(()=>{
    sit.hidden=panel.open||menu.open||record.open||byId('media-browser').open||!availableChair();
    station=find();if(station!==lastRoom){if(station?.route!==lastRoom?.route)welcome(station);lastRoom=station}open.hidden=!station||panel.open||menu.open||record.open;
    if(station)open.textContent=(seated?'Seated lesson · ':'Listen & watch · ')+(flightLessons[station.route]?.[0]||station.name);
    if(!window.hdStation&&!reduced.matches&&!document.hidden){const f=Math.floor(performance.now()/50)%36;
      for(const el of hall.querySelectorAll('.hearth-flame'))el.style.backgroundPosition=(f%6*20)+'% '+(Math.floor(f/6)*20)+'%'}
  },110);
})();
