const holodeckAdmin=(()=>{
  let unlocked=false;
  document.addEventListener('DOMContentLoaded',()=>{
    const panel=document.getElementById('admin-unlock');
    const pad=panel.querySelector('.pin-pad');
    const display=panel.querySelector('output');
    const status=document.getElementById('admin-status');
    const lock=document.getElementById('lock-playback');
    let digits='',checking=false,attempt=0;
    function reset(){
      attempt++;checking=false;digits='';
      display.textContent='○ ○ ○ ○';status.textContent='';
    }
    async function press(key){
      if(checking||unlocked||!panel.open)return;
      if(key==='clear')digits='';
      else if(key==='back')digits=digits.slice(0,-1);
      else if(/^\d$/.test(key))digits+=key;
      else return;
      status.textContent='';
      display.textContent=[0,1,2,3].map(i=>i<digits.length?'●':'○').join(' ');
      if(digits.length!==4)return;
      checking=true;
      const current=attempt;
      try{
        const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('holodeck-pin-v1:'+digits));
        if(current!==attempt)return;
        const hash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
        reset();
        if(hash!=='f6491bcc1a32583fbfa7d1cbae290f1f0fdc40342b09af432e0b685b0786d5df'){
          status.textContent='Incorrect PIN. Try again.';return;
        }
        unlocked=true;pad.hidden=true;lock.hidden=false;
        panel.querySelector('summary').textContent='Admin playback unlocked';
        panel.open=false;document.getElementById('media-query').focus();
      }catch{reset();status.textContent='Could not unlock playback. Reload and retry.';}
    }
    pad.onclick=e=>{const button=e.target.closest('button[data-key]');if(button)press(button.dataset.key);};
    panel.addEventListener('keydown',e=>{
      if(!panel.open||unlocked||e.ctrlKey||e.metaKey||e.altKey)return;
      const key=e.key==='Backspace'?'back':e.key==='Delete'?'clear':e.key;
      if(key==='back'||key==='clear'||/^\d$/.test(key)){e.preventDefault();if(!e.repeat)press(key);}
    });
    panel.addEventListener('toggle',()=>{if(!panel.open)reset();});
    document.getElementById('media-library').addEventListener('close',()=>{panel.open=false;reset();});
    lock.onclick=()=>{
      if(cinemaPlayer?.id==='admin-cinema-host')clearMovie();
      unlocked=false;lock.hidden=true;pad.hidden=false;panel.open=false;reset();
      panel.querySelector('summary').textContent='Admin playback';
    };
  });
  return {get unlocked(){return unlocked;}};
})();
function holodeckAdminPlayer(frame){
  if(!holodeckAdmin.unlocked || frame!==cinemaPlayer || frame?.id!=='admin-cinema-host')return null;
  return {id:frame.dataset.video,gain:window.websiteGain()};
}
