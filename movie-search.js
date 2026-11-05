function installMovieSearch({dialog,form,query,list,filter}) {
 const note=document.getElementById('media-note');
 let request;
 const eligible=video=>video.nsfw===false && !video.nsfwFlags && !video.isLive;
 const https=value=>{try{const url=new URL(value);return url.protocol==='https:' && !url.username && !url.password ? url : null;}catch{return null;}};
 function cancel(){request?.abort();}
 query.addEventListener('input',()=>{cancel();filter();});
 dialog.addEventListener('close',cancel);
 async function json(url,signal){
   const res=await fetch(url,{signal,credentials:'omit',referrerPolicy:'no-referrer'});
   if(!res.ok)throw Error('unavailable');
   return res.json();
 }
 function begin(){cancel();request=new AbortController();return request.signal;}
 async function play(result){
   const signal=begin();
   note.textContent='Opening movie…';
   try{
     const origin=https(result.url)?.origin;
     if(!origin || !/^[a-f0-9-]{36}$/i.test(result.uuid))throw Error();
     const film=await json(origin+'/api/v1/videos/'+result.uuid,signal);
     if(!eligible(film)||film.uuid!==result.uuid)throw Error();
     const player=document.createElement('video');
     player.controls=true;player.playsInline=true;player.preload='metadata';
     const files=[...(film.files||[]),...(film.streamingPlaylists||[]).flatMap(p=>p.files||[])];
     const urls=files.sort((a,b)=>(b.resolution?.id||0)-(a.resolution?.id||0)).map(f=>https(f.fileUrl)).filter(Boolean);
     if(player.canPlayType('application/vnd.apple.mpegurl'))for(const p of film.streamingPlaylists||[]){const url=https(p.playlistUrl);if(url)urls.unshift(url);}
     if(!urls.length)throw Error();
     player.id='holodeck-movie';player.setAttribute('aria-label',film.name);
     for(const url of urls){const source=document.createElement('source');source.src=url.href;player.append(source);}
     player.lastChild.addEventListener('error',()=>{if(player===cinemaPlayer){openMedia();note.textContent='This host could not stream that movie. Choose another result.';}});
     clearMovie();document.getElementById('stop-video').hidden=false;cinemaPlayer=player;movieScreen().append(player);movieScreen().classList.add('showing');
     player.volume=window.websiteGain();dialog.close();player.play().catch(()=>{});player.focus();
   }catch{if(!signal.aborted)note.textContent='This movie is unavailable for filtered playback. Choose another result.';}
 }
 form.onsubmit=async event=>{
   event.preventDefault();
   const term=query.value.trim();const signal=begin();filter();
   if(!term)return;
   if(/^(?:https?:\/\/|(?:www\.|m\.)?youtube\.com\/|youtu\.be\/)/i.test(term)){
     let id;
     try {
       const url=new URL(/^https?:/i.test(term)?term:'https://'+term);
       const parts=url.pathname.split('/').filter(Boolean);
       if(url.hostname==='youtu.be')id=parts[0];
       else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','www.youtube-nocookie.com'].includes(url.hostname)){
         if(url.pathname==='/watch')id=url.searchParams.get('v');
         else if(['shorts','live','embed'].includes(parts[0]))id=parts[1];
       }
     }catch{}
     if(!/^[\w-]{11}$/.test(id||'')){note.textContent='Paste a YouTube video link, or enter a title to search.';return;}
     if(!holodeckAdmin.unlocked&&!holodeckFilms.some(film=>film.id===id)){note.textContent='Open Admin playback to use your own YouTube links, or search by title for filtered videos.';return;}
     watchMedia(id);return;
   }
   note.textContent='Searching filtered videos…';
   try{
     const url=new URL('https://sepiasearch.org/api/v1/search/videos');
     url.search=new URLSearchParams({search:term,nsfw:'false',count:'25',sort:'-match'});
     const result=await json(url,signal);
     for(const film of result.data.filter(eligible)){
       if(!https(film.url))continue;
       const btn=document.createElement('button');btn.type='button';btn.className='key';btn.textContent=film.name;
       const by=document.createElement('small');by.textContent=film.channel?.displayName||'PeerTube';btn.append(by);
       btn.onclick=()=>play(film);list.append(btn);
     }
     note.textContent=list.childElementCount?'':'No matching videos. Try a different title.';
   }catch{if(!signal.aborted)note.textContent='Online search is unavailable. Clear the search for the onboard films, or try again.';}
 };
}
