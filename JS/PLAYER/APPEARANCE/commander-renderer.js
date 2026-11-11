'use strict';
/** Approved commander uses a SINGLE east-facing overhead pose, rotated continuously. Portrait row is reserved for dialogue.
 * Hand-authored crop/pivot/muzzle coordinates use the 1448 x 1086 source image.
 * Opaque bounds are centered and fitted to the exact physical rectangle.
 */
const commanderArt=new Image();
commanderArt.src=new URL('../ASSETS/CHARACTERS/COMMANDER/commander-us-field-sheet.png',document.baseURI).href;
const COMMANDER_FRAME={rect:[35,80,309,215],pivot:[186,187],muzzle:[335,184]};
function commanderArtReady(){return Boolean(typeof individualSprite==='function'&&individualSprite('commander'))||commanderArt.complete&&commanderArt.naturalWidth>0}
function drawCommander(u){
 c.save();c.translate(u.x,u.y);ellipse(1,7,23,18,'#07101366');
 c.rotate(u.a);
 drawTroopPose(u);
 c.restore();
 if(u.flash>0){c.save();c.translate(u.x,u.y);c.rotate(u.a);c.globalCompositeOperation='lighter';ellipse(38,7,18,5,'#ffb43588');line(35,7,55,7,'#fff3bf',3);line(38,1,48,13,'#ffc65b',2);c.restore()}
}
