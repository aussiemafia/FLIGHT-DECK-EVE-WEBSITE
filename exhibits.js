// CCP asteroid, ORE hull and wormhole studies, plus the corporation's Fortizar recording.
const exhibitPlates={
 veld:['Veldspar · Tritanium','estimate','ore-1230.png'],
 scord:['Scordite · Tritanium and Pyerite','estimate','ore-1228.png'],
 fort:['Fortizar · Corporation anchorage','ships','fortizar','fortizar.mp4'],
 hole:['Pochven wormhole · Transit aperture','wormholes','poch-hd'],
 lens:['Triglavian wormhole · Navigation study','systems','trig-hd'],
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
 fit:['Golem · C5 fitting plate','fits','archive/original/assets/Golem5n-B14bAUfF.png'],
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
 return media;
}
function routePlate(route){
 return ({wormholes:'hole',systems:'lens',sites:'site-c5-core-garrison',rolling:'lens',gas:'pros',drifters:'drifter',story:'drifter',ships:'ship-28710',fits:'fit',audit:'site-c5-core-garrison',estimate:'rock','blue-loot':'loot',split:'command',dscan:'hole',pi:'command',reference:'crystals',guides:'site-c5-core-garrison',profile:'fort',coverage:'chart'})[route]||'chart';
}

const routeNotes={
 wormholes:'Identify the destination signature and check connection life and remaining mass before transit.',
 systems:'The system atlas indexes J-codes, classes, effects and static connections.',
 rolling:'Budget cold and hot transit mass against the connection’s remaining mass.',
 gas:'The reservoir records list gas clouds and their defenders.',
 drifters:'Hostile identification distinguishes recon and response battleships.',
 story:'The archive traces Anoikis, the Sleepers and the emergence of the Drifters.',
 estimate:'Enter module yield, cycle time, ore volume and price to estimate income.',
 reference:'Mining reference covers ore, crystals, modules and starbase structures.',
 split:'The payout calculator divides total ISK using weighted fleet shares.',
 dscan:'Review directional scan contacts by ship type and count.',
 pi:'Consult the planetary industry archive for products and production records.',
 guides:'Field notes cover fitting, scanning and site running.',
 profile:'The pilot record stores a portrait and callsign.',
 coverage:'The archive includes system, fitting and encounter records.',
 ships:'Identify the hull in the ship gallery and open its available records.'
};
function recordPages(key,route){
 const source=subjectNotes[key]||[exhibitPlates[key][0],routeNotes[route]||'Open the archive record for the complete entry.'];
 const pages=[];
 for(const paragraph of source){
  let line='';
  for(const word of paragraph.split(/\s+/)){
   if(line.length+word.length>108){pages.push(line);line=''}
   line+=(line?' ':'')+word;
  }
  if(line)pages.push(line);
 }
 return pages;
}
