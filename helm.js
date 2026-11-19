// The forward bridge is part of the same scene and crew session.
(function(){
  const top=-6120,back=-3900;
  face('city-floor',2340,back-top,0,0,(top+back)/2,0,90);
  for(const side of [-1,1]){
    if(side===1){
      for(const [lo,hi] of [[top,-5250],[-4830,back]])face('city-wall',hi-lo,480,1170,-240,(lo+hi)/2,-90);
      face('city-wall',420,160,1170,-400,-5040,-90);
    }else face('city-wall',back-top,480,side*1170,-240,(top+back)/2,-side*90);
    if(side===-1)starWindow(1330,305,side*1153,-268,-5170,-side*90);
    for(const z of [-4560,-5430])addSeat(side*718,z,side*.64);
    strip(7,back-top,side*500,(top+back)/2,'#d5ae70');
  }
  glazedAtrium(2340,back-top,(top+back)/2,480,690,3);
  face('bay-shell',2340,695,0,-347,top);
  starWindow(2040,420,0,-350,top+8,0);
  // One curved console sill carries the three instruments below the forward glazing.
  const helmCurve=x=>top+363+.00039*x*x;
  for(let j=0;j<24;j++){
    const a=-825+j*68.75,b=a+68.75,x=(a+b)/2,z=(helmCurve(a)+helmCurve(b))/2;
    const heading=-Math.atan2(helmCurve(b)-helmCurve(a),b-a)*180/Math.PI;
    const span=Math.hypot(b-a,helmCurve(b)-helmCurve(a))+1.3;
    face('helm-fascia',span,89,x,-45,z,heading);
    face('helm-cap',span,112,x,-90,z-53,heading,90);
    face('helm-line',span,3,x,-74,z+2,heading);
  }
  for(const [x,name,route,img] of [[-575,'Navigation','systems','wormhole'],[0,'Flight operations','ships','porpoise'],[575,'Fleet intelligence','dscan','fortizar']]){
    const station={name,route,image:img};
    const z=helmCurve(x),heading=-Math.atan(.00078*x)*180/Math.PI;
    exhibit(station,370,138,x,-155,z-28,heading);
    station.screen.geometry.rx=12*Math.PI/180;station.screen.style.transform+=' rotateX(12deg)';
    addSeat(x,z+305,heading*Math.PI/-180);

  }
  curvedRoomEnds(1,2800,-5040,710,510,265);
  const cinemaDoor=makeDoor(1170,-5040,-90,'Screening theatre','#edc991');
  face('chamber-floor',1630,1420,1985,0,-5040,0,90);face('chamber-lid',1630,1420,1985,-510,-5040,0,90);
  for(const s of [-1,1])face('city-wall',1630,510,1985,-255,-5040+s*710,s===1?180:0);
  face('city-wall',1420,510,2800,-255,-5040,-90);
  const display=face('simulation theatre-screen',1000,365,2717,-267,-5040,-90);
  const film=document.createElement('video');film.loop=true;film.muted=true;film.playsInline=true;film.preload='metadata';
  const films=['fortizar','transit','crystal','ore'];let movie=0,paused=false;film.src='assets/exhibits/fortizar.mp4';display.append(film);
  for(const x of [1550,1850,2150])for(const z of [-5370,-5150,-4930,-4710])addSeat(x,z,Math.PI/2);
  window.theatreScreen=display;window.theatreDoor=cinemaDoor;
  const toggle={name:'Play or pause screening',action:()=>{if(window.stationCinema){window.stationCinema.toggle();return}paused=!paused;if(paused)film.pause();else film.play().catch(()=>{})}};
  interactive.set(display,{name:'Screening theatre · Screen media',media:true,action:()=>window.stationMediaMenu?.(display,null)});
  const console=textFace('console',230,72,2440,-116,-5040,-90,'Next screening');
  interactive.set(console,{name:'Next screening',action:()=>{if(window.stationCinema){window.stationCinema.next();return}movie=(movie+1)%films.length;film.src='assets/exhibits/'+films[movie]+'.mp4';paused=false;film.play().catch(()=>{})}});
  function inCinema(){return visitor.x>1170&&Math.abs(visitor.z+5040)<710}
  setInterval(()=>{if(!inCinema()||document.hidden)film.pause();else if(!paused&&film.paused)film.play().catch(()=>{})},600);
  const theatre=document.createElement('button');theatre.textContent='Screening theatre';byId('destinations').prepend(theatre);
  theatre.onclick=()=>{menu.close();rise();window.stationCity?.reset();Object.assign(visitor,{x:1420,z:-5040,yaw:Math.PI/2,pitch:.06});draw()};
  function go(){
    rise();window.stationCity?.reset();keys.clear();
    Object.assign(visitor,{x:0,z:-4390,yaw:0,pitch:.07});draw();
  }
  byId('main-bridge').onclick=go;
  const link=document.createElement('button');link.textContent='Flight bridge';link.onclick=()=>{menu.close();go()};byId('destinations').prepend(link);
  window.liveHelm={go,inCinema,clear:(x,z)=>{
    if(x>1120){
      if(z<-5725||z>-4355||x>2760)return false;
      if(x<1210)return Math.abs(z+5040)<178&&passageOpen(cinemaDoor,x,z);
      return true;
    }
    if(Math.abs(x)<845&&Math.abs(z-helmCurve(x)+48)<83)return false;
    return z>top+50&&x>-1120&&(z<-3945||Math.abs(x)<175&&passageOpen(gates[0].door,x,z));
  }};
  if(location.hash==='#bridge')go();
})();
