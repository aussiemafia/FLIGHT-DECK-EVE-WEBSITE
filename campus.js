'use strict';
(()=>{
  const library=byId('curriculum');
  function openLibrary(){
    keys.clear();
    if(document.pointerLockElement)document.exitPointerLock();
    byId('record-title').textContent='New Eden course library';
    frame.src='campus.html';record.showModal();
  }
  library.onclick=openLibrary;
  const drill=document.createElement('section');
  drill.id='campus-drill';drill.hidden=true;
  const heading=document.createElement('strong'),copy=document.createElement('p'),answers=document.createElement('div');
  const close=document.createElement('button');close.textContent='Close drill';
  drill.append(heading,copy,answers,close);document.body.append(drill);
  let active=null;
  close.onclick=()=>{active=null;drill.hidden=true;view.focus()};
  window.startCampusDrill=room=>{
    active=room;keys.clear();
    if(document.pointerLockElement)document.exitPointerLock();
    const scout=room.route==='wormholes';
    heading.textContent=scout?'Scout drill · Return route':'Fleet drill · Remote repairs';
    copy.textContent=scout?'You jump into an unmapped system. What do you save before warping away?':'A fleetmate broadcasts for shields. Which ship should lock the pilot and apply repairs?';
    const choices=scout?['The nearest planet','The return connection']:['The logistics ship','The tackle frigate'];
    answers.replaceChildren();drill.hidden=false;
    choices.forEach((label,i)=>{
      const b=document.createElement('button');b.textContent=label;answers.append(b);
      b.onclick=()=>{
        if(i!==(scout?1:0)){copy.textContent=scout?'A planet bookmark takes you to the planet. Which location gets you home?':'Tackle keeps hostiles on grid. Who carries remote shield boosters?';return}
        copy.textContent=scout?'Route secured. Save the far-side connection before leaving grid.':'Repairs applied. Watch range, capacitor and incoming fleet broadcasts.';
        answers.replaceChildren();close.focus();
      };
    });
  };
  setInterval(()=>{if(active&&active!==currentRoom)close.click()},250);
})();
