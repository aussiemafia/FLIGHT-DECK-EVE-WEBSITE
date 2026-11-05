const holodeckAdmin=(()=>{
 const store=localStorage;
 const prefix='expanse.holodeck.';
 let unlocked=false;
 async function deviceCode(){
   let secret=store.getItem(prefix+'device');
   if(!secret){secret=crypto.randomUUID();store.setItem(prefix+'device',secret);}
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret));
   return 'holodeck-'+Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
 }
 async function verify(id){
   if(!/^[a-f0-9]{32}$/i.test(id))return false;
   const res=await fetch('https://api.github.com/gists/'+id,{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
   if(!res.ok)return false;
   const gist=await res.json();
   return gist.owner?.id===89118277 && gist.files?.['holodeck.txt']?.content?.trim()===await deviceCode();
 }
 document.addEventListener('DOMContentLoaded',async()=>{
   const panel=document.getElementById('admin-unlock'),status=document.getElementById('admin-status');
   const apply=ok=>{
     unlocked=ok;
     panel.querySelector('summary').textContent=ok?'Admin playback unlocked':'Admin playback';
     panel.querySelector('form').hidden=ok;
     if(ok){status.textContent='Paste a YouTube link in the media search above.';panel.open=false;}
   };
   try{
     const code=await deviceCode();document.getElementById('admin-code').value=code;
     const previous=store.getItem(prefix+'gist');
     if(previous && await verify(previous))apply(true);
   }catch{status.textContent='Could not verify this browser. Check the connection and browser storage.';}
   panel.querySelector('form').onsubmit=async e=>{
     e.preventDefault();
     const match=/^https:\/\/gist\.github\.com\/(?:[a-z0-9-]+\/)?([a-f0-9]{32})\/?$/i.exec(document.getElementById('admin-gist').value.trim());
     if(!match){status.textContent='Paste the GitHub Gist link.';return;}
     status.textContent='Checking the owner and browser code…';
     try{
       if(!await verify(match[1]))throw Error();
       store.setItem(prefix+'gist',match[1]);apply(true);
     }catch{status.textContent='Could not verify the aussiemafia account and browser code. Check holodeck.txt and retry.';}
   };
 });
 return {get unlocked(){return unlocked;}};
})();
function holodeckAdminPlayer(frame){
 if(!holodeckAdmin.unlocked || frame!==cinemaPlayer || frame?.id!=='admin-cinema-host')return null;
 return {id:frame.dataset.video,gain:window.websiteGain()};
}
