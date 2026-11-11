'use strict';
/** Shared atlas loader; coordinates are equal 4x2 cells. Sprites face east. */
const tacticalAtlas=new Image();
tacticalAtlas.src=new URL('../ASSETS/CHARACTERS/tactical-atlas.png',document.baseURI).href;
function drawTacticalActor(cell,width,height,phase,moving){
 const sw=tacticalAtlas.naturalWidth/4,sh=tacticalAtlas.naturalHeight/2;
 const sx=cell%4*sw,sy=Math.floor(cell/4)*sh;
 const stride=moving?Math.sin(phase)*2:0;
 // Upper body stays aligned to the weapon; two boot regions alternate while moving.
 c.drawImage(tacticalAtlas,sx,sy,sw,sh*.69,-width*.5,-height*.5,width,height*.69);
 for(let side=0;side<2;side++)c.drawImage(tacticalAtlas,sx+side*sw/2,sy+sh*.69,sw/2,sh*.31,
  -width*.5+side*width/2+stride*(side?1:-1),height*.19,width/2,height*.31);
}
