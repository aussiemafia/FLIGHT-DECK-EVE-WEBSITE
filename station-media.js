// Shared by in-world instruments and the archive opened from them.
function stationMedia(route){
 if(['wormholes','systems','sites','rolling','gas','dscan'].includes(route))return 'scanner';
 if(['drifters','story','ships','fits','audit','profile'].includes(route))return 'identity';
 return 'telemetry';
}
