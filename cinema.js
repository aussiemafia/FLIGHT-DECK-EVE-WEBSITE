'use strict';
(()=>{
  const titles=[['Equinox','LJuh14jJxEU'],['Havoc','foz5YeLTe3M'],['This is EVE','e2X1MIR1KMs']];
  const bar=document.createElement('div');bar.id='cinema-controls';bar.hidden=true;
  const name=document.createElement('span'),previous=document.createElement('button'),play=document.createElement('button'),next=document.createElement('button'),link=document.createElement('a');
  previous.textContent='Previous';play.textContent='Play film';next.textContent='Next';link.textContent='YouTube';link.target='_blank';link.rel='noopener';bar.append(name,previous,play,next,link);document.body.append(bar);const browse=document.createElement('button');browse.textContent='Screen media';bar.append(browse);
  let anchor=window.theatreScreen,external=null,customTitle='',direct=false;
  browse.onclick=()=>window.stationMediaMenu?.(anchor,anchor===window.theatreScreen?null:currentRoom);
  const screen=document.createElement('div');screen.className='in-glass-player';screen.hidden=true;
  let mount=document.createElement('div');screen.append(mount);anchor.append(screen);
  const file=document.createElement('video');file.playsInline=true;file.hidden=true;screen.append(file);
  function attach(nextAnchor){
    if(nextAnchor===anchor)return;
    anchor.classList.remove('playing-in-glass');
    if(player){player.destroy();player=null;ready=false;loading=false;mount=document.createElement('div');screen.prepend(mount)}
    anchor=nextAnchor;anchor.append(screen);
  }
  let index=0,player=null,ready=false,unlocked=false,wanted=true,failed=false,loading=false,near=false;
  const refresh=()=>{name.textContent=(customTitle||titles[index][0])+(failed?' · player unavailable':'');link.href=direct?file.src:'https://www.youtube.com/watch?v='+(external||titles[index][1]);link.textContent=direct?'Open film':'YouTube';play.textContent=(direct?!file.paused:ready&&wanted)?'Pause film':'Play film'};
  file.onplay=file.onpause=refresh;
  function start(){
    if(!unlocked||loading||player)return;loading=true;
    const load=()=>{
      player=new YT.Player(mount,{width:'100%',height:'100%',videoId:external||titles[index][1],playerVars:{playsinline:1,origin:location.origin,rel:0,controls:1},events:{
        onReady:()=>{ready=true;failed=false;volume();if(wanted&&near&&!direct)player.playVideo();refresh()},
        onStateChange:e=>{if(e.data===0)change(1);else if(e.data===1){failed=false;refresh()}},
        onError:()=>{failed=true;refresh()},onAutoplayBlocked:()=>{wanted=false;refresh()}
      }});
    };
    if(window.YT?.Player)load();else{window.onYouTubeIframeAPIReady=load;const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.onerror=()=>{loading=false;failed=true;refresh()};document.head.append(s)}
  }
  function volume(){
    const isTheatre=anchor===window.theatreScreen,inside=window.liveHelm.inCinema(),g=anchor.geometry;
    const d=isTheatre&&!inside?1606+Math.hypot(visitor.x-1170,visitor.z+5040):Math.hypot(visitor.x-g.x,visitor.z-g.z);
    const fall=Math.max(0,1-d/3200),door=!isTheatre||inside?1:.27+.73*(window.theatreDoor?.aperture||0);
    const gain=window.shipAudio.volume*fall*fall*door*(document.hidden?0:1);
    file.volume=gain;if(ready)player.setVolume(Math.round(100*gain));
  }
  function change(n){file.pause();file.hidden=true;direct=false;customTitle='';external=null;index=(index+n+titles.length)%titles.length;failed=false;wanted=true;start();if(ready)player.loadVideoById(titles[index][1]);refresh()}
  function toggle(){unlocked=true;if(direct){if(file.paused)file.play().catch(()=>{});else file.pause();return}if(!ready){wanted=true;start()}else if(wanted&&!failed){wanted=false;player.pauseVideo()}else{wanted=true;failed=false;player.playVideo()}refresh()}
  previous.onclick=()=>change(-1);next.onclick=()=>change(1);play.onclick=toggle;refresh();
  window.stationCinema={next:()=>change(1),toggle,yieldScreen(el){if(el===anchor&&el!==window.theatreScreen){file.pause();if(ready)player.pauseVideo();attach(window.theatreScreen);direct=false;file.hidden=true;external=null;customTitle='';near=false;wanted=false;refresh()}},
    present(el,entry){attach(el||window.theatreScreen);customTitle=entry[0];direct=entry[2]==='file';external=direct?null:entry[3];failed=false;wanted=true;unlocked=true;
      if(direct){if(ready)player.pauseVideo();file.loop=entry[3].startsWith('assets/exhibits/');file.src=entry[3];file.hidden=false;file.play().catch(()=>{wanted=false;refresh()})}
      else{file.pause();file.hidden=true;start();if(ready)player.loadVideoById(external)}
      refresh()}
  };
  const unlock=()=>{unlocked=true};window.addEventListener('pointerdown',unlock,{once:true});window.addEventListener('keydown',unlock,{once:true});
  setInterval(()=>{
    const cinema=anchor===window.theatreScreen,inside=cinema?window.liveHelm.inCinema():!anchor.hidden&&Math.hypot(visitor.x-anchor.geometry.x,visitor.z-anchor.geometry.z)<1650;
    const close=inside||(cinema&&Math.hypot(visitor.x-1170,visitor.z+5040)<1450);
    if(!anchor.isConnected||(!cinema&&!close)){window.stationCinema.yieldScreen(anchor);return}
    bar.hidden=!inside||record.open||menu.open||byId('lesson-panel').open||byId('media-browser').open;
    volume();if(close&&unlocked&&!failed&&!direct)start();
    if(ready&&!direct&&close!==near){if(close&&wanted)player.playVideo();else player.pauseVideo()}near=close;
    screen.hidden=(!ready&&!direct)||failed||!inside;
    anchor.classList.toggle('playing-in-glass',!screen.hidden);
    if(player?.getIframe)player.getIframe().style.display=direct?'none':'block';
  },100);
})();
