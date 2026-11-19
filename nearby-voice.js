'use strict';
(()=>{
  const join=document.querySelector('#voice-join'),ptt=document.querySelector('#ptt'),mute=document.querySelector('#mute-pilots'),status=document.querySelector('#radio-status');
  const links=new Map();let epoch='',mic=null,held=false,press=0,context=null,muted=false,offline=false;
  const range=940;
  function level(id){
    const link=links.get(id);if(!link?.meter)return 0;
    link.meter.getByteTimeDomainData(link.samples);let sum=0;
    for(const byte of link.samples)sum+=((byte-128)/128)**2;
    return Math.min(1,Math.max(0,(Math.sqrt(sum/link.samples.length)-.009)*8));
  }
  function label(s){status.textContent=s}
  function unkey(){
    ++press;held=false;
    if(mic){mic.enabled=false;mic.stop();mic=null}
    for(const l of links.values())l.sender?.replaceTrack(null).catch(()=>{});
    ptt.setAttribute('aria-pressed','false');
    label(epoch?'Listening nearby':'Radio off');
  }
  function remove(id){
    const l=links.get(id);if(!l)return;
    links.delete(id);l.pc.close();l.audio.pause();l.audio.srcObject=null;l.source?.disconnect();l.meter?.disconnect();
  }
  function leave(){
    unkey();epoch='';for(const id of links.keys())remove(id);
    join.textContent='Join nearby voice';label('Radio off');
  }
  function enable(){
    if(!window.RTCPeerConnection||!navigator.mediaDevices?.getUserMedia){label('Voice unavailable in this browser');return false}
    if(!epoch){epoch=crypto.randomUUID().replaceAll('-','').slice(0,12);join.textContent='Leave nearby voice';label('Listening nearby')}
    if(!context)context=new AudioContext();
    context.resume().catch(()=>{});return true;
  }
  async function down(){
    if(held||!enable())return;
    held=true;const generation=++press;label('Opening microphone…');
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
      if(!held||generation!==press){stream.getTracks().forEach(t=>t.stop());return}
      mic=stream.getAudioTracks()[0];
      for(const l of links.values())l.sender?.replaceTrack(mic).catch(()=>{});
      ptt.setAttribute('aria-pressed','true');label([...links.values()].some(l=>l.pc.connectionState==='connected')?'Transmitting nearby':'Mic on · waiting for a nearby radio');
    }catch{if(generation===press){unkey();label('Microphone unavailable · check site permission')}}
  }
  join.onclick=()=>epoch?leave():enable();
  mute.onclick=()=>{muted=!muted;mute.textContent=muted?'Unmute pilots':'Mute pilots';mute.setAttribute('aria-pressed',String(muted));for(const l of links.values())l.audio.muted=muted};
  ptt.onpointerdown=e=>{e.preventDefault();ptt.setPointerCapture(e.pointerId);down()};
  ptt.onpointerup=ptt.onpointercancel=ptt.onlostpointercapture=()=>{if(held)unkey()};
  window.addEventListener('keydown',e=>{
    if(e.code!=='KeyV'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.matches?.('input,select,textarea,[contenteditable=true]'))return;
    e.preventDefault();down();
  });
  window.addEventListener('keyup',e=>{if(e.code==='KeyV'&&held)unkey()});
  window.addEventListener('blur',()=>{if(held)unkey()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)leave()});
  window.addEventListener('pagehide',leave);
  async function signal(l,sdp){
    const res=await window.flightCrew.signal({peer:l.id,local:epoch,remote:l.remote,...(sdp?{sdp}:{})});
    if(!res.ok)throw Error('Radio negotiation');return (await res.json()).sdp;
  }
  async function publish(l){
    if(l.pc.iceGatheringState!=='complete')await new Promise(resolve=>{
      const done=()=>{clearTimeout(timer);l.pc.removeEventListener('icegatheringstatechange',check);resolve()};
      const check=()=>{if(l.pc.iceGatheringState==='complete')done()};
      const timer=setTimeout(done,4500);l.pc.addEventListener('icegatheringstatechange',check);
    });
    if(links.get(l.id)===l)await signal(l,l.pc.localDescription.sdp);
  }
  async function exchange(l,caller){
    if(l.busy||l.ready)return;l.busy=true;
    try{
      if(caller&&!l.pc.localDescription){
        l.sender=l.pc.addTransceiver('audio',{direction:'sendrecv'}).sender;
        await l.sender.replaceTrack(mic);await l.pc.setLocalDescription(await l.pc.createOffer());
      }
      if(caller&&!l.sent){await publish(l);l.sent=true}
      if(!l.pc.remoteDescription){
        const sdp=await signal(l);if(!sdp||links.get(l.id)!==l)return;
        await l.pc.setRemoteDescription({type:caller?'answer':'offer',sdp});
      }
      if(!caller&&!l.sent){
        l.sender=l.pc.getTransceivers()[0].sender;await l.sender.replaceTrack(mic);
        if(!l.pc.localDescription)await l.pc.setLocalDescription(await l.pc.createAnswer());
        await publish(l);l.sent=true;
      }
      l.ready=true;
    }catch{if(links.get(l.id)===l&&!held)label('Connecting nearby radio…')}finally{l.busy=false}
  }
  function nearby(own,crew){
    offline=false;if(!epoch)return;
    const keep=new Set();
    for(const p of crew){
      const distance=Math.hypot(p.x-visitor.x,p.z-visitor.z,(p.height||0)-(window.stationCity?.height||0));
      if(!p.voice||distance>range)continue;
      keep.add(p.id);let l=links.get(p.id);
      if(l&&l.remote!==p.voice){remove(p.id);l=null}
      if(!l){
        const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});const audio=new Audio();audio.autoplay=true;audio.muted=muted;
        l={id:p.id,remote:p.voice,pc,audio};links.set(p.id,l);
        pc.ontrack=e=>{const s=new MediaStream([e.track]);audio.srcObject=s;audio.play().catch(()=>label('Click Join nearby voice to reconnect'));
          l.meter=context.createAnalyser();l.meter.fftSize=256;l.samples=new Uint8Array(256);
          l.source=context.createMediaStreamSource(s);l.source.connect(l.meter)};
        pc.onconnectionstatechange=()=>{if(pc.connectionState==='connected')label(held?'Transmitting nearby':'Listening nearby');
          if(pc.connectionState==='failed')label('Radio link failed · leave and rejoin')};
      }
      l.audio.volume=(window.shipAudio?.volume??.75)*Math.min(1,(range-distance)/530);
      exchange(l,own<p.id);
    }
    for(const id of links.keys())if(!keep.has(id))remove(id);
  }
  window.crewRadio={get epoch(){return epoch},get talking(){return !!mic},level,nearby,disconnect(){if(!offline){offline=true;for(const id of links.keys())remove(id);if(held)unkey()}}};
})();
