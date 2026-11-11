'use strict';
/** Approved commander's eight overhead views. Portrait row is reserved for dialogue.
 * Hand-authored crop/pivot/muzzle coordinates use the 1448 x 1086 source image.
 * The hat pivot stays on the actor hitbox; muzzle placement matches weapon lighting.
 */
const commanderArt=new Image();
commanderArt.src=new URL('../ASSETS/CHARACTERS/COMMANDER/commander-us-field-sheet.png',document.baseURI).href;
const COMMANDER_VIEWS=[
 {rect:[35,80,309,215],pivot:[146,187],muzzle:[335,184]}, // east
 {rect:[40,335,275,274],pivot:[150,428],muzzle:[291,587]}, // south-east
 {rect:[430,15,216,310],pivot:[541,131],muzzle:[534,312]}, // south
 {rect:[447,337,258,269],pivot:[570,439],muzzle:[462,586]}, // south-west
 {rect:[738,75,317,220],pivot:[942,187],muzzle:[751,185]}, // west
 {rect:[775,334,262,278],pivot:[917,441],muzzle:[789,350]}, // north-west
 {rect:[1164,0,225,320],pivot:[1278,175],muzzle:[1287,7]}, // north
 {rect:[1175,333,230,277],pivot:[1275,446],muzzle:[1381,350]} // north-east
];
function commanderArtReady(){return commanderArt.complete&&commanderArt.naturalWidth>0}
function commanderViewIndex(angle){return ((Math.round(angle/(Math.PI/4))%8)+8)%8}
function drawCommander(u){
 const view=COMMANDER_VIEWS[commanderViewIndex(u.a)],r=view.rect,p=view.pivot,m=view.muzzle;
 const heading=Math.atan2(m[1]-p[1],m[0]-p[0]);
 const size=Math.hypot(47,7)/Math.hypot(m[0]-p[0],m[1]-p[1]);
 c.save();c.translate(u.x,u.y);ellipse(1,7,23,18,'#07101366');
 c.rotate(u.a);c.translate(0,(u.lean||0)*8);
 if(u.stance==='crouch')c.scale(.9,.9);else if(u.stance==='prone')c.scale(1.1,.8);
 // Tiny movement sway preserves the whole painted pose without cutting arms or boots.
 if(u.moving)c.translate(-Math.abs(Math.sin(u.phase))*.65,Math.sin(u.phase)*.65);
 c.rotate(Math.atan2(7,47)-heading);
 c.drawImage(commanderArt,...r,(r[0]-p[0])*size,(r[1]-p[1])*size,r[2]*size,r[3]*size);
 c.restore();
 if(u.flash>0){c.save();c.translate(u.x,u.y);c.rotate(u.a);c.translate(0,(u.lean||0)*8);c.globalCompositeOperation='lighter';ellipse(48,7,18,5,'#ffb43588');line(44,7,65,7,'#fff3bf',3);line(48,1,58,13,'#ffc65b',2);c.restore()}
}
