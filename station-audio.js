'use strict';
(()=>{
  const slider=byId('master-gain'),music=byId('music');
  let context,bus,playing=false,clock,timer,chord=0,musicBus;
  const lights=byId('deck-light');let night=false;
  try{night=localStorage.getItem('station-night')==='on'}catch{}
  function lightMode(){document.body.classList.toggle('night-watch',night);lights.setAttribute('aria-pressed',String(night));lights.textContent=night?'Raise lights':'Dim lights'}
  lights.onclick=()=>{night=!night;lightMode();try{localStorage.setItem('station-night',night?'on':'off')}catch{}};lightMode();
  function init(){
    if(!context){context=new AudioContext();bus=context.createGain();bus.connect(context.destination);
      musicBus=context.createGain();musicBus.connect(bus);bus.gain.value=Number(slider.value)/100}
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
  const chords=[[38,45,53,57,64],[34,41,50,53,60],[41,48,55,57,64],[36,43,52,55,62],[31,43,50,58,65],[33,45,52,57,61]];
  function score(){if(!playing)return;const notes=chords[chord++%chords.length],t=context.currentTime+.05;
    notes.forEach((m,i)=>{const f=440*2**((m-69)/12);note(musicBus,f,t+i*.19,8,.025,i===0?'sine':'triangle',i%2?4:-3);
      if(i>1)note(musicBus,f*2,t+1.6+i*.38,3.5,.009)});
    timer=setTimeout(score,6100);
  }
  music.onclick=()=>{init();playing=!playing;music.textContent=playing?'Pause lounge music':'Play lounge music';
    musicBus.gain.setTargetAtTime(playing?1:0,context.currentTime,.15);clearTimeout(timer);if(playing)score()};
  window.addEventListener('pointerdown',()=>{init()},{once:true});window.addEventListener('keydown',()=>{init()},{once:true});
  document.addEventListener('visibilitychange',()=>{if(context){if(document.hidden)context.suspend();else context.resume().catch(()=>{})}});
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
