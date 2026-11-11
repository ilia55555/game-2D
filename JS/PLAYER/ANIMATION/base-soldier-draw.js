'use strict';
/** JS/PLAYER/ANIMATION/base-soldier-draw.js — modularized game mechanic; loaded in manifest order. */

function soldier(u){
if(tacticalAtlas.complete&&tacticalAtlas.naturalWidth){
 c.save();c.translate(u.x,u.y);ellipse(1,7,23,18,'#07101366');c.rotate(u.a);c.translate(0,(u.lean||0)*8);
 if(u.stance==='crouch')c.scale(.88,.9);else if(u.stance==='prone')c.scale(1.15,.75);
 const cell=u.role==='commander'?0:u.role==='deputy'?1:u.group==='alpha'?2:3;
 drawTacticalActor(cell,78,76,u.phase,u.moving);
 if(u.flash>0){c.globalCompositeOperation='lighter';ellipse(48,5,18,5,'#ffb43588');line(44,5,65,5,'#fff3bf',3);line(48,-1,58,11,'#ffc65b',2)}
 c.restore();return;
}
const moving=u.moving;const k=moving?Math.sin(u.phase)*11:0;const tan=u.group==='alpha';const {cloth,light,dark}=getSoldierPalette(u);c.save();c.translate(u.x,u.y);if(false){c.strokeStyle='#db6b66';c.lineWidth=1.4;c.beginPath();c.ellipse(0,3,30,30,0,0,Math.PI*2);c.stroke();c.fillStyle='#db6b66';c.beginPath();c.moveTo(-4,36);c.lineTo(4,36);c.lineTo(0,31);c.fill()}ellipse(4,8,24,20,'#141a1555');
// Legs have their own heading and alternate independently beneath the torso.
c.save();c.rotate(u.stance==='prone'?u.a:u.legA);if(u.stance==='prone'){rr(-44,-13,34,10,4,cloth,'#263023');rr(-44,3,34,10,4,cloth,'#263023');rr(-48,-14,12,11,3,'#252c25');rr(-48,3,12,11,3,'#252c25')}if(u.stance==='crouch')c.scale(.7,1.15);for(const side of [-1,1]){const step=k*side;rr(-14+step,side*9-5,23,10,4,dark,'#242c22');rr(-3+step,side*9-5,10,10,3,cloth);rr(5+step,side*9-5,12,10,3,'#292e27','#171d18');rr(7+step,side*9-4,7,2,1,'#59604b')}c.restore();
c.rotate(u.a);if(u.stance==='crouch')c.scale(.9,.86);if(u.stance==='prone')c.scale(1.13,.8);const recoil=u.recoil;rr(-17,-12,16,24,5,dark,'#252d22');for(let j=0;j<3;j++)line(-14,-8+j*7,-5,-8+j*7,light,1);rr(-9,-17,25,34,9,cloth,'#282e25');for(let j=0;j<7;j++){const x=(j*13%21)-7,y=(j*19%27)-13;ellipse(x,y,3,2,dark)}rr(-6,-12,17,24,3,tan?'#635f49':'#394b35','#222c22');for(let j=0;j<3;j++)rr(2,-10+j*7,9,5,1,dark,'#93977b');rr(-3,-15,5,3,1,'#202820');
// Left hand grips the handguard; right hand holds the pistol grip.
c.lineCap='round';line(2,-17,15-recoil,-18,cloth,10);line(15-recoil,-18,30-recoil,1,cloth,8);ellipse(30-recoil,2,4,4,'#383e30');line(4,17,12-recoil,23,cloth,10);line(12-recoil,23,18-recoil,10,cloth,8);ellipse(18-recoil,9,4,4,'#343a2c');
rr(2-recoil,3,16,8,2,'#242a27','#080e0b');rr(13-recoil,2,18,8,1,'#414942','#141a17');rr(27-recoil,3,16,6,1,tan?'#786e50':'#4d5845','#171e18');for(let j=0;j<4;j++)line(29+j*3-recoil,4,29+j*3-recoil,8,'#242d24');rr(42-recoil,4,11,3,1,'#151c19');rr(51-recoil,3,5,5,1,'#242c28');rr(17-recoil,-1,8,4,1,'#111916','#70816b');rr(18-recoil,10,7,7,1,'#242c24');line(5-recoil,5,-3-recoil,3,'#252d27',5);
ellipse(1,-1,12,11,'#252c23');ellipse(3,-1,11,10,light);rr(3,-9,7,16,4,cloth);rr(-5,-7,9,13,3,dark);rr(6,-5,7,7,2,'#343c30');rr(0,-12,6,3,1,'#232d24');rr(0,10,6,3,1,'#232d24');line(-3,-7,-3,6,'#c7c5a155',1);rr(1,-6,5,3,1,'#b8b08a');
if(u.flash>0){c.save();c.translate(57,5);c.globalCompositeOperation='lighter';const glow=c.createRadialGradient(0,0,1,0,0,34);glow.addColorStop(0,'#ffe7a9aa');glow.addColorStop(1,'#ff9c1900');c.fillStyle=glow;c.fillRect(-35,-35,70,70);c.fillStyle='#ffb335';c.beginPath();c.moveTo(-2,-3);c.lineTo(13,-8);c.lineTo(8,-2);c.lineTo(28,0);c.lineTo(9,3);c.lineTo(15,8);c.lineTo(-2,3);c.closePath();c.fill();ellipse(5,0,10,2,'#fff7d7');c.restore()}c.restore();}
