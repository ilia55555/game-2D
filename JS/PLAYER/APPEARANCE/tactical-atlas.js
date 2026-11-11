'use strict';
/** Shared atlas loader; coordinates are equal 4x2 cells. Sprites face east. */
const tacticalAtlas=new Image();
tacticalAtlas.src=new URL('../ASSETS/CHARACTERS/tactical-overhead-single.png',document.baseURI).href;
function drawTacticalActor(cell,width,height,phase,moving){
 const sw=tacticalAtlas.naturalWidth/4,sh=tacticalAtlas.naturalHeight/2;
 const sx=cell%4*sw,sy=Math.floor(cell/4)*sh;
 // A single intact pose per actor: no directional swapping or sliced-limb warping.
 const pivotX=cell<4?.5:.34,pivotY=cell<4?.55:.54;
 c.drawImage(tacticalAtlas,sx,sy,sw,sh,-width*pivotX,-height*pivotY,width,height);
}
