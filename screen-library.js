'use strict';
(()=>{
  const popup=byId('media-browser'),query=byId('media-query'),results=byId('media-results'),web=byId('search-youtube');
  const collection=[
    ['Equinox · EVE Online','industry, nullsec, sovereignty','yt','LJuh14jJxEU'],
    ['Havoc · EVE Online','pirates, factions, combat','yt','foz5YeLTe3M'],
    ['This is EVE','fleets, pilots, New Eden','yt','e2X1MIR1KMs'],
    ['Wormhole transit','wormholes, navigation, exploration','file','assets/exhibits/transit.mp4'],
    ['Citadel approach','ships, structures, combat','file','assets/exhibits/fortizar.mp4'],
    ['Mining field','industry, ore, yield','file','assets/exhibits/ore.mp4'],
    ['Crystal field','blue loot, minerals, sleepers','file','assets/exhibits/crystal.mp4']
  ];
  let target=null,subject=null;
  function custom(text){
    let u;try{u=new URL(text)}catch{return null}
    if(u.protocol!=='https:'||u.username||u.password)return null;
    const host=u.hostname.replace(/^www\.|^m\./,'');
    if(host==='youtube.com'||host==='youtu.be'){
      const id=host==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1];
      return /^[\w-]{11}$/.test(id||'')?['YouTube video','','yt',id]:null;
    }
    return /\.(mp4|webm|ogv|mov)$/i.test(u.pathname)?['Play video link','','file',u.href]:null;
  }
  function update(){
    const text=query.value.trim(),filter=text.toLowerCase(),item=custom(text);results.replaceChildren();
    const found=item?[item]:collection.filter(row=>(row[0]+' '+row[1]).toLowerCase().includes(filter));
    for(const entry of found){const b=document.createElement('button');b.textContent=entry[0];b.onclick=()=>{popup.close();window.seatLearning?.stop();window.stationCinema.present(target,entry)};results.append(b)}
    if(!found.length){const message=document.createElement('p');message.textContent='No match aboard. Search YouTube, then paste a video link here.';results.append(message)}
    web.href='https://www.youtube.com/results?search_query='+encodeURIComponent(text||'EVE Online');web.textContent=text?'Search YouTube for “'+text+'”':'Search YouTube';
  }
  function show(screen,station){
    target=screen||window.theatreScreen;subject=station||currentRoom;keys.clear();query.value='';update();
    byId('media-title').textContent=(station?.name||'Screening theatre')+' · Media';
    byId('media-lesson').hidden=!subject?.route||!roomCourses[subject.route];
    if(!popup.open)popup.showModal();query.focus();
  }
  byId('media-lesson').onclick=()=>{popup.close();if(subject)window.startStationLesson(subject)};
  byId('media-close').onclick=()=>popup.close();query.oninput=update;
  popup.addEventListener('keydown',e=>e.stopPropagation());
  byId('lesson-media').onclick=()=>{const r=currentRoom||window.stationCity?.classroomAt(visitor.x,visitor.z);window.seatLearning?.stop();show(r?.projection||r?.screen||window.lastTeachingScreen,r)};
  window.stationMediaMenu=show;
})();
