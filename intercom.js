'use strict';
(function(){
  const button=document.getElementById('intercom'),caption=document.getElementById('announcement'),mute=document.getElementById('quiet');
  const lines=[
    'Welcome aboard the Expanse. It’s good to have you here.',
    'Through the glass above you are the stars of New Eden. Follow the light along the floor to explore the galleries.',
    'Or take a seat beside the water. The ship is yours to discover.'
  ];
  let muted=false,welcomed=false,playing=false,serial=0,audio=null;
  try{muted=localStorage.getItem('expanse-intercom-muted')==='yes'}catch{}
  function controls(){
    button.textContent=playing?'Stop intercom':currentRoom?'Room guide':'Ship intercom';
    mute.textContent=muted?'Enable voice':'Mute voice';
    mute.setAttribute('aria-pressed',String(muted));
  }
  function stop(){
    serial++;playing=false;
    if(audio){audio.pause();audio=null}
    window.speechSynthesis?.cancel();caption.hidden=true;controls();
  }
  function speak(room=null){
    stop();welcomed=true;playing=true;const turn=serial;
    const chunks=room?[room.name+'.',teaching[rooms.indexOf(room)][1]]:lines;
    function play(i){
      if(turn!==serial)return;
      if(i>=chunks.length){stop();return}
      caption.textContent=chunks[i];caption.hidden=false;controls();
      function next(){if(turn===serial)play(i+1)}
      function fallback(){
        if(turn!==serial)return;
        if(!window.speechSynthesis||muted){setTimeout(next,Math.max(3100,chunks[i].length*67));return}
        const voice=new SpeechSynthesisUtterance(chunks[i]);
        const voices=speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang));
        voice.voice=voices.find(v=>/Aria|Jenny|Samantha|Karen|Hazel|Sonia/i.test(v.name))||voices[0]||null;
        voice.rate=.93;voice.pitch=1.02;voice.onend=next;voice.onerror=()=>setTimeout(next,3300);speechSynthesis.speak(voice);
      }
      if(!room&&!muted){
        audio=new Audio('assets/intercom/welcome-'+(i+1)+'.mp3');
        audio.onended=next;audio.play().catch(fallback);
      }else fallback();
    }
    play(0);
  }
  function arrive(){
    if(!welcomed&&!muted)speak();
    welcomed=true;
  }
  document.getElementById('viewport').addEventListener('pointerdown',arrive,{once:true});
  window.addEventListener('keydown',e=>{if(!welcomed&&['KeyW','KeyA','KeyS','KeyD','ArrowUp'].includes(e.code))arrive()});
  button.onclick=()=>playing?stop():speak(currentRoom);
  mute.onclick=()=>{muted=!muted;stop();try{localStorage.setItem('expanse-intercom-muted',muted?'yes':'no')}catch{}controls()};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
  window.addEventListener('pagehide',stop);window.updateIntercom=controls;controls();
})();
