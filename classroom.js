'use strict';
(()=>{
  const seatButton=byId('lesson-seat'), startButton=byId('lesson-launch');
  const board=document.createElement('section');
  board.className='classroom-display';
  board.setAttribute('aria-label','Classroom screen');
  board.innerHTML='<div class="course-main"><div class="course-column"><h2></h2><div class="lesson-body"></div></div><div class="film-column"><video muted playsinline></video><div class="film-buttons"></div></div></div><div class="lesson-nav"></div>';
  const find=s=>board.querySelector(s), body=find('.lesson-body'), nav=find('.lesson-nav'), film=find('video'), filmButtons=find('.film-buttons');
  const clips={wormholes:'aldoiHE6O04',systems:'Ieo3WAvH4yU',estimate:'I_dD4I-zHlw',ships:'ArCI4bi9Eyg',fits:'ArCI4bi9Eyg',sites:'yiWy2ehcc1o',drifters:'yiWy2ehcc1o','blue-loot':'yiWy2ehcc1o',story:'e2X1MIR1KMs'};
  const local={story:'transit',wormholes:'transit',systems:'transit',ships:'fortizar',fits:'fortizar',sites:'fortizar',drifters:'crystal','blue-loot':'crystal'};
  const guides=fetch('assets/lessons/guide-cues.json').then(r=>r.json()).catch(()=>null);
  const specimens=fetch('assets/lessons/ore-specimens.json').then(r=>r.json()).catch(()=>[]);
  const voice=new Audio('assets/lessons/academy-guide.mp3');voice.preload='metadata';
  let room=null,anchor=null,index=0,page=0,oreIndex=0,ores=[],cueEnd=0,epoch=0,iframe=null, lastRoom=null,filmBegin=0;
  const answered=new Set();
  function button(parent,label,action){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=action;parent.append(b);return b}
  function para(parent,text){const p=document.createElement('p');p.textContent=text;parent.append(p);return p}
  function audioStop(){epoch++;voice.pause();cueEnd=0}
  async function speak(key,n){
    audioStop();const token=epoch,cues=await guides,range=cues?.[key]?.[n];
    if(token!==epoch||!range||window.guideMuted?.())return;
    voice.volume=window.shipAudio?.volume??.7;cueEnd=range[1];voice.currentTime=range[0];voice.play().catch(()=>{});
  }
  voice.ontimeupdate=()=>{if(cueEnd&&voice.currentTime>=cueEnd-.09)audioStop()};
  document.addEventListener('guidemute',()=>{if(window.guideMuted?.())audioStop()});
  document.addEventListener('stationvolume',()=>{voice.volume=window.shipAudio.volume});
  function closeFilm(){iframe?.remove();iframe=null;film.hidden=false}
  function stop(){audioStop();closeFilm();film.pause();film.removeAttribute('src');film.load();anchor?.classList.remove('lesson-glass','playing-in-glass');board.remove();anchor=null;room=null}
  function showFilm(){
    closeFilm();filmBegin=room.route==='estimate'?oreIndex*8:0;
    const src=room.route==='estimate'?'assets/lessons/ore-assays.mp4':'assets/exhibits/'+local[room.route]+'.mp4';
    if(film.getAttribute('src')!==src)film.src=src;
    film.currentTime=filmBegin;film.loop=room.route!=='estimate';film.play().catch(()=>{});
  }
  film.ontimeupdate=()=>{if(room?.route==='estimate'&&!iframe&&film.currentTime>=filmBegin+7.85)film.currentTime=filmBegin};
  function academy(){
    if(iframe){showFilm();return}
    audioStop();film.pause();film.hidden=true;iframe=document.createElement('iframe');
    iframe.title='EVE Online video lesson';iframe.allow='autoplay; encrypted-media; fullscreen';iframe.referrerPolicy='strict-origin-when-cross-origin';
    iframe.src='https://www.youtube-nocookie.com/embed/'+clips[room.route]+'?autoplay=1&rel=0';
    find('.film-column').prepend(iframe);
  }
  function drawOre(){
    const ore=ores[oreIndex];if(!ore)return;
    find('h2').textContent=ore.name;body.replaceChildren();nav.replaceChildren();
    para(body,'Reprocess for '+ore.minerals.join(', ')+'.');
    const volume=Number((1000*ore.volume).toFixed(3));
    para(body,'1,000 compressed units occupy '+volume+' m³. How much space for 2,000?');
    const quiz=document.createElement('div');body.append(quiz);
    const feedback=para(body,answered.has(ore.id)?'Assay complete. Choose another specimen.':'');
    const right=Number((volume*2).toFixed(3));
    for(const val of (oreIndex%2?[volume,right]:[right,volume])){
      button(quiz,val+' m³',()=>{if(val===right){answered.add(ore.id);feedback.textContent='Correct. Twice the units take twice the space.'}else feedback.textContent='That fits 1,000 units. Double the volume and try again.'});
    }
    button(nav,'‹',()=>{page=(page+Math.ceil(ores.length/4)-1)%Math.ceil(ores.length/4);drawOre()}).ariaLabel='Previous specimens';
    ores.slice(page*4,page*4+4).forEach((o,j)=>{
      const i=page*4+j,b=button(nav,o.name,()=>{oreIndex=i;drawOre();showFilm()});
      b.setAttribute('aria-pressed',String(i===oreIndex));const icon=document.createElement('i');
      icon.style.backgroundPosition=(i%7*100/6)+'% '+(Math.floor(i/7)*100/3)+'%';b.prepend(icon);
    });
    button(nav,'›',()=>{page=(page+1)%Math.ceil(ores.length/4);drawOre()}).ariaLabel='Next specimens';
  }
  function drawCourse(){
    const lines=roomCourses[room.route];find('h2').textContent=lines[0];body.replaceChildren();nav.replaceChildren();
    if(index<lines.length){para(body,lines[index]);button(nav,'Hear this step',()=>speak(room.route,index));button(nav,index===lines.length-1?'Check understanding':'Next step',()=>{index++;drawCourse();if(index<lines.length)speak(room.route,index)});}
    else{const [q,options,answer]=window.classroomChecks[room.route];para(body,q);const feedback=para(body,'');
      options.forEach((label,i)=>button(nav,label,()=>{feedback.textContent=i===answer?'Correct. '+lines[1]:'Try again. '+lines[1]}));button(nav,'Restart',()=>{index=1;drawCourse();speak(room.route,index)})}
  }
  function actualRoom(){return currentRoom||window.stationCity?.classroomAt(visitor.x,visitor.z)}
  function begin(s){
    const source=s;
    s=s?.projection||s?.screen?s:actualRoom()||(s?.route==='story'?flagship:null);
    if(!s&&source?.route)s=rooms.find(r=>r.route===source.route);
    if(!s||!roomCourses[s.route]||!(s.projection||s.screen))return false;
    stop();room=s;anchor=s.projection||s.screen;window.stationCinema?.yieldScreen(anchor);
    anchor.classList.add('lesson-glass','playing-in-glass');anchor.append(board);window.stopShipIntercom?.();
    keys.clear();if(document.pointerLockElement)document.exitPointerLock();index=1;page=oreIndex=0;
    const g=anchor.geometry,dist=Math.hypot(g.x-visitor.x,g.z-visitor.z);
    visitor.yaw=Math.atan2(g.x-visitor.x,visitor.z-g.z);visitor.pitch=Math.atan2(-g.y-standingEye(),dist);
    filmButtons.replaceChildren();button(filmButtons,'Room film',showFilm);button(filmButtons,'YouTube lesson',academy);
    button(filmButtons,'Guide',()=>speak(s.route,s.route==='estimate'?1:Math.min(index,roomCourses[s.route].length-1)));
    if(s.route==='estimate'){find('h2').textContent='Ore specimens';body.replaceChildren();nav.replaceChildren();
      specimens.then(data=>{if(room!==s)return;ores=data;if(!ores.length){para(body,'Specimens could not load. The Academy film is available.');return}drawOre()});}
    else drawCourse();
    showFilm();speak(s.route,s.route==='estimate'?0:1);draw();return true;
  }
  for(const event of ['pointerdown','pointerup','click','wheel'])board.addEventListener(event,e=>e.stopPropagation());
  function chair(){
    const r=actualRoom();if(!r||seated)return null;
    let best=null,distance=630;
    for(const c of chairs){if(c.room!==r&&!(r.width&&Math.sign(c.x)===r.side&&Math.abs(c.x)>r.width&&Math.abs(c.z-r.z)<r.half))continue;
      const d=Math.hypot(visitor.x-c.x,visitor.z-c.z);if(d<distance&&!window.flightCrew?.occupied(c.id)){best=c;distance=d}}
    return best;
  }
  function take(){const c=chair();if(c)openStation(interactive.get(c.node))}
  seatButton.onclick=take;startButton.onclick=()=>{if(seated)begin(actualRoom());else if(chair())take();else begin(actualRoom())};
  window.seatLearning={chair,take,start(c){begin(c.room||actualRoom()||(visitor.z>gardenEnd?flagship:null))},stop};
  window.startStationLesson=begin;
  setInterval(()=>{const r=actualRoom();
    if(room&&!seated&&r!==room&&room!==flagship)stop();
    if(r!==lastRoom){if(r&&!room&&!window.guideMuted?.()){window.stopShipIntercom?.();speak('entry',0)}lastRoom=r}
    const blocked=menu.open||record.open||byId('media-browser').open;
    seatButton.hidden=blocked||!!room||!chair();startButton.hidden=blocked||!!room||!r;
    if(r)startButton.textContent=chair()?'Start seated lesson':'Use classroom screen';
  },220);
})();
