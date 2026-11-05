// CCP asteroid, ORE hull and wormhole studies, plus the corporation's Fortizar recording.
const exhibitPlates={
 veld:['Veldspar · Tritanium','estimate','field'],
 scord:['Scordite · Tritanium and Pyerite','estimate','field'],
 fort:['Fortizar · Corporation anchorage','ships','fortizar','fortizar.mp4'],
 hole:['Wormhole transit signature','wormholes','wormhole','transit.mp4'],
 lens:['Class 5 wormhole · Destination signature','systems','class5'],
 c6:['Class 6 wormhole · Destination signature','wormholes','class6'],
 flare:['Large wormhole · Transit flare','rolling','flare'],
 rock:['Asteroid surface · Close inspection','estimate','ore','ore.mp4'],
 crystals:['Crystalline ore · Size variants','reference','crystal','crystal.mp4'],
 ice:['Ice body · Silhouette study','reference','ice'],
 belt:['Asteroid belt · Field survey','estimate','field'],
 pros:['Prospect · Expedition frigate','gas','prospect'],
 venture:['Venture · Mining systems','estimate','venture'],
 salvage:['Noctis · Salvage operations','guides','noctis'],
 command:['Porpoise · Industrial command','ships','porpoise'],
 dread:['Naglfar · Dreadnought identification','ships','archive/assets/naglfar-cutout.webp'],
 drifter:['Drifter · Hostile identification','drifters','archive/assets/drifter-cutout.webp'],
 fit:['Golem · C5 fitting plate','fits','archive/Golem5n-DgAt1Hv_.png'],
 chart:['The Forge · Regional sky','systems','assets/forge/pz.webp']
};
const roomExhibits={
 'INTELLIGENCE':['drifter','dread','hole'],'NAVIGATION LAB':['hole','lens','c6','flare'],
 'CREW QUARTERS':['fort','chart'],'OBSERVATION LOUNGE':['fort','belt','hole'],
 'CARTOGRAPHY':['lens','c6','flare','chart'],'SURVEY OFFICE':['belt','pros','hole'],
 'ENGINEERING':['venture','command','salvage'],'ORE PROCESSING':['rock','crystals','veld','scord','ice','belt'],
 'FLEET BRIEFING':['dread','command','fit'],'SIGNAL ANALYSIS':['hole','drifter','lens'],
 'RECORDS VAULT':['fit','drifter','fort'],'LOGISTICS':['salvage','command','fort'],
 'SCIENCE LAB':['crystals','ice','hole'],'PILOT READY ROOM':['fit','dread','venture']
};
function exhibitFile(file,root=''){
 return root+(file.includes('/')?file:'assets/exhibits/'+file);
}
function mountExhibit(host,key,root=''){
 const [label,,still,movie]=exhibitPlates[key];
 if(host.dataset.mounted===key&&host.querySelector('.exhibit-media'))return host.querySelector('.exhibit-media');
 host.dataset.mounted=key;
 const src=exhibitFile(still.includes('.')?still:still+'.webp',root);
 let media=host.querySelector('.exhibit-media');
 if(media?.tagName!==(movie?'VIDEO':'IMG')){
   media?.remove();media=document.createElement(movie?'video':'img');media.className='exhibit-media';host.prepend(media);
 }
 if(movie){media.muted=true;media.loop=true;media.playsInline=true;media.preload='none';media.poster=src;media.src=exhibitFile(movie,root);media.setAttribute('aria-label',label)}
 else{media.src=src;media.alt=label;media.decoding='async'}
 host.querySelector('.specimen-icon')?.remove();
 if(key==='veld'||key==='scord'){
   const icon=document.createElement('img');icon.className='specimen-icon';icon.alt=key==='veld'?'Veldspar specimen':'Scordite specimen';
   icon.src=exhibitFile(key==='veld'?'ore-1230.png':'ore-1228.png',root);
   icon.style.cssText='position:absolute;top:8px;right:8px;width:64px;height:64px;background:#06131dcc;border-radius:8px;object-fit:contain;pointer-events:none';host.append(icon);
 }
 return media;
}
function routePlate(route){
 return ({wormholes:'hole',systems:'lens',sites:'hole',rolling:'lens',gas:'pros',drifters:'drifter',story:'drifter',ships:'fort',fits:'fit',audit:'dread',estimate:'rock','blue-loot':'salvage',split:'command',dscan:'hole',pi:'command',reference:'crystals',guides:'salvage',profile:'fort',coverage:'chart'})[route]||'chart';
}
