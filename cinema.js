'use strict';
(()=>{
  const titles=[['Equinox','LJuh14jJxEU'],['Havoc','foz5YeLTe3M'],['This is EVE','e2X1MIR1KMs']];
  const bar=document.createElement('div');bar.id='cinema-controls';bar.hidden=true;
  const name=document.createElement('span'),previous=document.createElement('button'),play=document.createElement('button'),next=document.createElement('button'),link=document.createElement('a');
  previous.textContent='Previous';play.textContent='Play film';next.textContent='Next';link.textContent='YouTube';link.target='_blank';link.rel='noopener';bar.append(name,previous,play,next,link);document.body.append(bar);
  const overlay=document.createElement('div'),camera=document.createElement('div'),world=document.createElement('div'),screen=document.createElement('div'),mount=document.createElement('div');
  overlay.className='cinema-view';overlay.hidden=true;camera.className='cinema-camera';world.className='cinema-world';screen.className='cinema-wall';mount.id='feature-player';
  overlay.append(camera);camera.append(world);world.append(screen);screen.append(mount);document.body.append(overlay);
  let index=0,player=null,ready=false,unlocked=false,wanted=true,failed=false,loading=false,near=false;
  const refresh=()=>{name.textContent=titles[index][0]+(failed?' · player unavailable':'');link.href='https://www.youtube.com/watch?v='+titles[index][1];play.textContent=ready&&wanted?'Pause film':'Play film'};
  function start(){
    if(!unlocked||loading||player)return;loading=true;
    const load=()=>{
      player=new YT.Player(mount,{width:'100%',height:'100%',videoId:titles[index][1],playerVars:{playsinline:1,origin:location.origin,rel:0,controls:1},events:{
        onReady:()=>{ready=true;failed=false;volume();if(wanted&&near)player.playVideo();refresh()},
        onStateChange:e=>{if(e.data===0)change(1);else if(e.data===1){failed=false;refresh()}},
        onError:()=>{failed=true;refresh()},onAutoplayBlocked:()=>{wanted=false;refresh()}
      }});
    };
    if(window.YT?.Player)load();else{window.onYouTubeIframeAPIReady=load;const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.onerror=()=>{loading=false;failed=true;refresh()};document.head.append(s)}
  }
  function volume(){
    if(!ready)return;
    const inside=window.liveHelm.inCinema(),d=inside?Math.hypot(visitor.x-2776,visitor.z+5040):1606+Math.hypot(visitor.x-1170,visitor.z+5040);
    const fall=Math.max(0,1-d/3200),door=inside?1:.27+.73*(window.theatreDoor?.aperture||0);
    player.setVolume(Math.round(100*window.shipAudio.volume*fall*fall*door*(document.hidden?0:1)));
  }
  function change(n){index=(index+n+titles.length)%titles.length;failed=false;wanted=true;start();if(ready)player.loadVideoById(titles[index][1]);refresh()}
  function toggle(){unlocked=true;if(!ready){wanted=true;start()}else if(wanted&&!failed){wanted=false;player.pauseVideo()}else{wanted=true;failed=false;player.playVideo()}refresh()}
  previous.onclick=()=>change(-1);next.onclick=()=>change(1);play.onclick=toggle;refresh();
  window.stationCinema={next:()=>change(1),toggle};
  const unlock=()=>{unlocked=true};window.addEventListener('pointerdown',unlock,{once:true});window.addEventListener('keydown',unlock,{once:true});
  setInterval(()=>{
    const inside=window.liveHelm.inCinema(),close=inside||Math.hypot(visitor.x-1170,visitor.z+5040)<1450;
    bar.hidden=!inside||record.open||menu.open;volume();if(close&&unlocked&&!failed)start();
    if(ready&&close!==near){if(close&&wanted)player.playVideo();else player.pauseVideo()}near=close;
    overlay.hidden=!ready||failed||!inside||menu.open||record.open;
    if(!overlay.hidden){overlay.style.perspective=view.style.perspective;camera.style.transform=byId('camera').style.transform;world.style.transform=hall.style.transform;
      screen.style.transform=window.theatreScreen.style.transform+' translateZ(7px)';}
  },75);
})();
