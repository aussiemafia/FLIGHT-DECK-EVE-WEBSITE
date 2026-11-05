// Draw each star layer once. CSS moves the cached layers while the pilot walks.
for (const surface of document.querySelectorAll('.horizon,.porthole')) {
  for (let layer = 0; layer < 2; layer++) {
    const canvas = document.createElement('canvas');
    const forward = surface.classList.contains('horizon');
    canvas.width = forward ? 1280 : 540;
    canvas.height = forward ? 540 : 240;
    canvas.className = 'flight-stars '+(forward ? 'outward' : 'passing');
    canvas.style.animationDuration = (layer ? 19 : 36)+'s';
    canvas.style.animationDelay = (layer ? -7 : -22)+'s';
    const ctx = canvas.getContext('2d');
    for(let i=1;i<125;i++){
      const fraction=n=>n-Math.floor(n);
      const x=fraction(Math.sin(i*128.3+layer)*921.7)*canvas.width;
      const y=fraction(Math.sin(i*47.1-layer)*751.9)*canvas.height;
      ctx.fillStyle='rgba(203,229,255,'+(.18+fraction(i*.712)*.64)+')';
      ctx.fillRect(x,y,layer?1.4:.9,layer?1.1:.9);
    }
    surface.append(canvas);
  }
}
