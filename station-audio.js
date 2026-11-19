'use strict';
(()=>{
  const slider=byId('master-gain'),music=byId('music');
  let context,bus,playing=false;
  const soundtrack=new Audio('assets/orbital-nocturne.ogg');soundtrack.loop=true;soundtrack.preload='none';
  function mix(){soundtrack.volume=Number(slider.value)/100*(window.classroomActive? .10:.46)}
  function musicState(){music.textContent=playing?'Pause station score':'Play station score';music.setAttribute('aria-pressed',String(playing))}
  function listen(){mix();soundtrack.play().then(()=>{playing=true;musicState()}).catch(()=>{playing=false;musicState()})}
  function pause(){playing=false;soundtrack.pause();musicState()}
  let preference;
  try{preference=localStorage.getItem('deck-score')}catch{}
  function commence(){if(preference!=='off'&&!document.hidden)listen()}
  document.addEventListener('stationvolume',mix);document.addEventListener('lessonchange',mix);
  
  const lights=byId('deck-light');let night=false;
  try{night=localStorage.getItem('station-night')==='on'}catch{}
  function lightMode(){document.body.classList.toggle('night-watch',night);lights.setAttribute('aria-pressed',String(night));lights.textContent=night?'Raise lights':'Dim lights'}
  lights.onclick=()=>{night=!night;lightMode();try{localStorage.setItem('station-night',night?'on':'off')}catch{}};lightMode();
  function init(){
    if(!context){context=new AudioContext();bus=context.createGain();bus.connect(context.destination);
      bus.gain.value=Number(slider.value)/100}
    context.resume().catch(()=>{});return context;
  }
  function change(){const gain=Number(slider.value)/100;if(bus)bus.gain.setTargetAtTime(gain,context.currentTime,.06);
    document.dispatchEvent(new Event('stationvolume'));try{localStorage.setItem('station-volume',slider.value)}catch{}}
  try{slider.value=localStorage.getItem('station-volume')||'70'}catch{}slider.oninput=change;
  function note(output,freq,start,duration,volume,type='sine',detune=0){
    const osc=context.createOscillator(),amp=context.createGain();osc.type=type;osc.frequency.value=freq;osc.detune.value=detune;
    amp.gain.setValueAtTime(.00001,start);amp.gain.exponentialRampToValueAtTime(volume,start+duration*.28);
    amp.gain.exponentialRampToValueAtTime(.00001,start+duration);osc.connect(amp);amp.connect(output);
    osc.start(start);osc.stop(start+duration+.02);osc.onended=()=>{osc.disconnect();amp.disconnect()};
  }
  music.onclick=()=>{if(playing){pause();preference='off'}else{listen();preference='on'}try{localStorage.setItem('deck-score',preference)}catch{}};
  musicState();
  function activate(e){if(e.target!==music)commence();window.removeEventListener('pointerdown',activate,true);window.removeEventListener('keydown',activate,true);init()}
  window.addEventListener('pointerdown',activate,true);window.addEventListener('keydown',activate,true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){soundtrack.pause();context?.suspend()}else{context?.resume().catch(()=>{});if(playing)listen()}});
  window.shipAudio={get volume(){return Number(slider.value)/100},door(open,d){
    if(!context||context.state!=='running')return;
    const distance=Math.hypot(visitor.x-d.x,visitor.z-d.z);if(distance>1200)return;
    const t=context.currentTime,g=context.createGain(),filter=context.createBiquadFilter();g.connect(filter);filter.connect(bus);
    filter.type='lowpass';filter.frequency.setValueAtTime(open?1400:860,t);filter.frequency.exponentialRampToValueAtTime(open?480:200,t+.6);
    const buf=context.createBuffer(1,context.sampleRate*.64,context.sampleRate),noise=buf.getChannelData(0);
    for(let i=0;i<noise.length;i++)noise[i]=Math.random()*2-1;
    const src=context.createBufferSource();src.buffer=buf;src.connect(g);
    const v=.12*(1-distance/1200);g.gain.setValueAtTime(.00001,t);g.gain.linearRampToValueAtTime(v,t+.09);g.gain.exponentialRampToValueAtTime(.0001,t+.64);src.start(t);
    src.onended=()=>{src.disconnect();g.disconnect();filter.disconnect()};note(bus,open?154:90,t+.39,.23,Math.max(.001,v*.25));
  }};
})();
