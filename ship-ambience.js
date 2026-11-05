(() => {
  const toggle = document.getElementById('ship-sound');
  const sector = document.getElementById('sector');
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) { toggle.hidden = true; return; }

  let muted = false;
  try { muted = localStorage.getItem('titan-sound-muted') === 'yes'; } catch {}
  let audio, master, engines, vents, filter;

  function mix() {
    if (!audio) return;
    const room = sector.textContent.toLowerCase();
    let engine = 0.075, air = 0.18, cutoff = 640;
    if (room.includes('exterior')) { engine = 0.018; air = 0.009; cutoff = 210; }
    else if (room.includes('passage') || room.includes('airlock')) { engine = 0.095; air = 0.25; cutoff = 920; }
    else if (!room.includes('flight deck')) { engine = 0.052; air = 0.13; cutoff = 490; }
    const now = audio.currentTime;
    engines.gain.setTargetAtTime(engine, now, 0.7);
    vents.gain.setTargetAtTime(air, now, 0.8);
    filter.frequency.setTargetAtTime(cutoff, now, 0.8);
    master.gain.setTargetAtTime(muted || document.hidden ? 0 : 0.54, now, 0.18);
  }

  function build() {
    audio = new AudioEngine();
    master = audio.createGain();
    master.gain.value = 0;
    master.connect(audio.destination);
    engines = audio.createGain(); engines.connect(master);
    vents = audio.createGain(); vents.connect(master);
    // Slightly offset motor frequencies create slow, natural beating.
    for (const [hz, level] of [[55, 0.64], [55.19, 0.25], [110, 0.30], [164.8, 0.12]]) {
      const motor = audio.createOscillator(), gain = audio.createGain();
      motor.frequency.value = hz; gain.gain.value = level;
      motor.connect(gain); gain.connect(engines); motor.start();
    }
    const noise = audio.createBuffer(1, audio.sampleRate * 5, audio.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const fan = audio.createBufferSource();
    fan.buffer = noise; fan.loop = true;
    filter = audio.createBiquadFilter(); filter.type = 'bandpass'; filter.Q.value = 0.65;
    fan.connect(filter); filter.connect(vents); fan.start();
    mix();
  }
  function label() {
    toggle.textContent = muted ? 'Ship sound · Off' : 'Ship sound · On';
    toggle.setAttribute('aria-pressed', String(!muted));
  }
  function start() {
    if (muted || document.hidden) return;
    if (!audio) build();
    if (audio.state !== 'running') audio.resume().catch(() => {});
  }
  function unlock(event) {
    if (event.target === toggle) return;
    start();
  }
  toggle.addEventListener('click', () => {
    muted = !muted;
    try { localStorage.setItem('titan-sound-muted', muted ? 'yes' : 'no'); } catch {}
    label(); start(); mix();
  });
  document.addEventListener('click', unlock, true);
  document.addEventListener('keydown', event => { if (!event.repeat) unlock(event); }, true);
  document.addEventListener('visibilitychange', mix);
  new MutationObserver(mix).observe(sector, { childList: true, characterData: true, subtree: true });
  label();
})();