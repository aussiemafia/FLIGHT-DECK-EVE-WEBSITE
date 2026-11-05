(() => {
  const night = document.getElementById('night-switch');
  const slider = document.getElementById('website-volume');
  const output = document.getElementById('website-level');
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  function setNight(enabled) {
    document.documentElement.classList.toggle('ship-night', enabled);
    night.setAttribute('aria-pressed', String(enabled));
    window.dispatchEvent(new Event('cabinlight'));
  }
  setNight(read('titan-dark') === 'on');
  night.onclick = () => {
    const enabled = night.getAttribute('aria-pressed') !== 'true';
    setNight(enabled);
    save('titan-dark', enabled ? 'on' : 'off');
  };
  const saved = read('website-volume');
  if (saved !== null && /^\d{1,3}$/.test(saved)) slider.value = saved;
  window.websiteGain = () => Number(slider.value) / 100;
  const playerOrigin = 'https://www.youtube-nocookie.com';
  function syncPlayer() {
    const player = document.getElementById('cinema-player');
    if (!player) return;
    const send = (func, args) => player.contentWindow?.postMessage(JSON.stringify({event:'command', func, args}), playerOrigin);
    send('setVolume', [Number(slider.value)]);
    send(Number(slider.value) ? 'unMute' : 'mute', []);
  }
  function apply(doc) {
    doc.querySelectorAll('audio,video').forEach(media => { media.volume = window.websiteGain(); });
    doc.querySelectorAll('iframe').forEach(frame => {
      try { if (frame.contentDocument) apply(frame.contentDocument); } catch {}
    });
  }
  function update() {
    output.textContent = slider.value + '%';
    slider.setAttribute('aria-valuetext', slider.value + ' percent');
    apply(document);
    syncPlayer();
    window.dispatchEvent(new Event('websitevolume'));
  }
  const observed = new WeakSet();
  function observe(doc) {
    if (observed.has(doc)) return;
    observed.add(doc);
    doc.addEventListener('play', event => { if ('volume' in event.target) event.target.volume = window.websiteGain(); }, true);
    doc.addEventListener('load', event => {
      const frame = event.target;
      if (frame.tagName !== 'IFRAME') return;
      if (frame.id === 'cinema-player') {
        const listen = () => frame.contentWindow?.postMessage(JSON.stringify({event:'listening',id:frame.id,channel:'widget'}), playerOrigin);
        listen();
        let tries = 0;
        const timer = setInterval(() => {
          if (!frame.isConnected || frame.dataset.audioReady || ++tries > 30) clearInterval(timer);
          else listen();
        }, 250);
      } else {
        try { if (frame.contentDocument) { observe(frame.contentDocument); apply(frame.contentDocument); } } catch {}
      }
    }, true);
  }
  window.addEventListener('message', event => {
    const player = document.getElementById('cinema-player');
    if (event.origin !== playerOrigin || !player || event.source !== player.contentWindow) return;
    try {
      const msg = JSON.parse(event.data);
      if (msg.event === 'onReady' || msg.event === 'initialDelivery') {
        player.dataset.audioReady = '1';
        syncPlayer();
      }
    } catch {}
  });
  slider.oninput = () => { save('website-volume', slider.value); update(); };
  observe(document);
  update();
})();