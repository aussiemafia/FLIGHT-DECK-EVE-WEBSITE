(() => {
  const toggle = document.getElementById('ship-sound');
  const sector = document.getElementById('sector');
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  const control = document.getElementById('volume-control');
  const slider = document.getElementById('ship-volume');
  const level = document.getElementById('volume-level');
  if (!AudioEngine) { control.hidden = true; return; }
  let volume = 18;
  try {
    const saved = localStorage.getItem('titan-volume');
    if (saved !== null && /^\d{1,3}$/.test(saved)) volume = Math.min(100, Number(saved));
  } catch {}

  let muted = false;
  try { muted = localStorage.getItem('titan-sound-muted') === 'yes'; } catch {}
  let audio, master, engines, filter, loop, loading = false;
  async function loadLoop() {
    if (loading || loop) return;
    loading = true;
    try {
      const response = await fetch('assets/audio/titan-cabin.ogg');
      if (!response.ok) throw new Error('Engine audio unavailable');
      const buffer = await audio.decodeAudioData(await response.arrayBuffer());
      loop = audio.createBufferSource(); loop.buffer = buffer; loop.loop = true;
      loop.connect(filter); loop.start();
    } catch {
      toggle.title = 'Engine audio unavailable. Click again to retry.';
    } finally { loading = false; }
  }

  function mix() {
    if (!audio) return;
    const room = sector.textContent.toLowerCase();
    const hall = room.includes('passage') || room.includes('airlock');
    const outside = room.includes('exterior');
    const gain = outside ? .10 : hall ? .90 : room.includes('flight deck') ? .70 : .48;
    const now = audio.currentTime;
    engines.gain.setTargetAtTime(gain, now, .9);
    filter.frequency.setTargetAtTime(outside ? 240 : hall ? 1500 : 1250, now, .8);
    master.gain.setTargetAtTime(muted || document.hidden ? 0 : volume / 100, now, 0.18);
  }

  function build() {
    audio = new AudioEngine();
    master = audio.createGain();
    master.gain.value = 0;
    master.connect(audio.destination);
    engines = audio.createGain(); engines.connect(master);
    filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = .6;
    filter.connect(engines);
    loadLoop();
    mix();
  }
  function label() {
    slider.value = volume;
    level.textContent = volume + '%';
    slider.setAttribute('aria-valuetext', volume + ' percent');
    control.querySelector('summary').title = 'Ship volume · ' + (muted ? 'Muted' : volume + '%');
    toggle.textContent = muted ? 'Unmute' : 'Mute';
    toggle.setAttribute('aria-pressed', String(muted));
  }
  function start() {
    if (muted || document.hidden) return;
    if (!audio) build(); else if (!loop) loadLoop();
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
  slider.addEventListener('input', () => {
    volume = Number(slider.value);
    muted = false;
    try {
      localStorage.setItem('titan-volume', String(volume));
      localStorage.setItem('titan-sound-muted', 'no');
    } catch {}
    label(); start(); mix();
  });
  control.addEventListener('keydown', event => {
    if (event.key === 'Escape') { control.open = false; control.querySelector('summary').focus(); }
    event.stopPropagation();
  });
  document.addEventListener('pointerdown', event => {
    if (!control.contains(event.target)) control.open = false;
  });
  document.addEventListener('click', unlock, true);
  document.addEventListener('keydown', event => { if (!event.repeat) unlock(event); }, true);
  window.addEventListener('shipwarp', () => {
    if (!audio || muted || document.hidden) return;
    const now = audio.currentTime;
    const drive = audio.createOscillator(), envelope = audio.createGain();
    drive.type = 'triangle';
    drive.frequency.setValueAtTime(42, now);
    drive.frequency.exponentialRampToValueAtTime(138, now + 0.95);
    drive.frequency.exponentialRampToValueAtTime(112, now + 1.7);
    drive.frequency.exponentialRampToValueAtTime(38, now + 2.9);
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.105, now + 0.95);
    envelope.gain.linearRampToValueAtTime(0.072, now + 1.7);
    envelope.gain.linearRampToValueAtTime(0, now + 2.9);
    drive.connect(envelope); envelope.connect(master);
    drive.onended = () => { drive.disconnect(); envelope.disconnect(); };
    drive.start(now); drive.stop(now + 2.92);
  });
  document.addEventListener('visibilitychange', mix);
  new MutationObserver(mix).observe(sector, { childList: true, characterData: true, subtree: true });
  label();
})();