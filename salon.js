'use strict';
(()=>{
  const films={story:'transit',wormholes:'transit',ships:'fortizar',systems:'transit',estimate:'ore',drifters:'crystal',fits:'fortizar',sites:'fortizar','blue-loot':'crystal'};
  const checks={
    wormholes:['After crossing, what should you bookmark?', ['The return side','Only the sun'],0],
    ships:['What confirms a hull’s role?', ['Its paintwork','Its bonuses and fittings'],1],
    systems:['Which identifier belongs in the atlas?', ['The J-number','A pilot name'],0],
    estimate:['What changes the hourly yield?', ['Hull colour','Harvesting time and cycle length'],1],
    drifters:['How can you identify an encounter?', ['Check names and silhouettes against the site record','Count the stars'],0],
    fits:['Where can you check a fit with your skills?', ['The ship simulator','The map legend'],0],
    sites:['What should you identify before firing?', ['The next stargate','The wave trigger'],1],
    'blue-loot':['What do you compare before selling?', ['The current buy order and after-tax total','Only the icon colour'],0],
    story:['What gives an event context?', ['Who took part and where it happened','The number of ships in your hangar'],0]
  };
  window.classroomChecks=checks;
})();
