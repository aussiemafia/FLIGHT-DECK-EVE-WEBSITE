function installFavorites(playPeer){
 const prefix='expanse.holodeck.favorite.';
 const list=document.getElementById('favorite-list'),status=document.getElementById('favorite-status');
 const panel=document.getElementById('my-favorites'),save=document.getElementById('favorite-current');
 const screenSave=document.getElementById('favorite-on-screen');
 let current=null;
 function clean(raw){
   if(!raw||typeof raw.title!=='string')throw Error();
   const title=raw.title.trim().slice(0,200);
   if(raw.kind==='youtube'&&typeof raw.id==='string'&&/^[\w-]{11}$/.test(raw.id))return {kind:'youtube',id:raw.id,title:title||'YouTube '+raw.id};
   if(raw.kind==='peer'&&typeof raw.uuid==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(raw.uuid)){
     const url=new URL(raw.url);
     if(url.protocol==='https:'&&!url.username&&!url.password)return {kind:'peer',uuid:raw.uuid,url:url.origin+'/videos/watch/'+raw.uuid,title:title||'PeerTube video'};
   }
   throw Error();
 }
 const key=f=>prefix+(f.kind==='youtube'?f.id:f.url);
 function entries(){
   return Object.keys(localStorage).filter(k=>k.startsWith(prefix)).flatMap(k=>{
     try{return [clean(JSON.parse(localStorage.getItem(k)))];}catch{return [];}
   }).sort((a,b)=>a.title.localeCompare(b.title));
 }
 function render(){
   try{
     const items=entries();list.replaceChildren();
     if(!items.length)list.textContent='Save a playing video to see it here.';
     for(const f of items){
       const row=document.createElement('div'),play=document.createElement('button'),remove=document.createElement('button');
       play.className=remove.className='key';play.textContent=f.title;remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+f.title);
       play.onclick=()=>{
         if(f.kind==='peer'){playPeer(f);return;}
         if(!holodeckAdmin.unlocked&&!holodeckFilms.some(v=>v.id===f.id)){status.textContent='Unlock Admin playback to watch this saved YouTube link.';return;}
         watchMedia(f.id);
       };
       remove.onclick=()=>{try{localStorage.removeItem(key(f));status.textContent='Favorite removed.';render();}catch{status.textContent='Could not update favorites.';}};
       const rename=document.createElement('button');rename.className='key';rename.textContent='Rename';
       rename.onclick=()=>{
         const input=document.createElement('input'),done=document.createElement('button');
         input.value=f.title;input.maxLength=200;input.setAttribute('aria-label','Favorite name');done.textContent='Save';done.className='key';
         done.onclick=()=>{try{localStorage.setItem(key(f),JSON.stringify(clean({...f,title:input.value.trim()||f.title})));render();}catch{status.textContent='Could not rename favorite.';}};
         input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();done.click();}};
         row.replaceChildren(input,done);input.focus();input.select();
       };
       row.append(play,rename,remove);list.append(row);
     }
     panel.querySelector('summary').textContent='My favorites ('+items.length+')';
     save.hidden=!current;save.disabled=!!current&&localStorage.getItem(key(current))!==null;
     save.textContent=save.disabled?'★ Saved':'☆ Add to favorites';
     screenSave.hidden=save.hidden;screenSave.disabled=save.disabled;screenSave.textContent=save.textContent;
   }catch{status.textContent='Browser storage is unavailable.';}
 }
 save.onclick=()=>{
   try{
     const favorite=clean(current);
     localStorage.setItem(key(favorite),JSON.stringify(favorite));render();
   }catch{openMedia();panel.open=true;status.textContent='Could not save this favorite in this browser.';}
 };
 screenSave.onclick=()=>save.click();
 document.getElementById('favorite-export').onclick=()=>{
   try{
     const url=URL.createObjectURL(new Blob([JSON.stringify({format:'expanse-favorites-v1',videos:entries()},null,2)],{type:'application/json'}));
     const a=document.createElement('a');a.href=url;a.download='holodeck-favorites.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   }catch{status.textContent='Could not export favorites.';}
 };
 document.getElementById('favorite-import').onchange=async e=>{
   const file=e.target.files[0];if(!file)return;
   try{
     if(file.size>2e6)throw Error();
     const data=JSON.parse(await file.text());
     if(data.format!=='expanse-favorites-v1'||!Array.isArray(data.videos)||data.videos.length>5000)throw Error();
     const items=data.videos.map(clean);
     for(const f of items){if(!localStorage.getItem(key(f)))localStorage.setItem(key(f),JSON.stringify(f));}
     status.textContent='Backup merged with your favorites.';
   }catch{status.textContent='Could not restore this file. Choose a holodeck favorites backup.';}
   e.target.value='';render();
 };
 window.addEventListener('storage',render);panel.addEventListener('toggle',render);render();
 return f=>{current=f;render();};
}
