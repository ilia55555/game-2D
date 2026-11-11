'use strict';
/** Shared atlas loader; coordinates are equal 4x2 cells. Sprites face east. */
const tacticalAtlas=new Image();
tacticalAtlas.src=new URL('../ASSETS/CHARACTERS/tactical-overhead-single.png',document.baseURI).href;
function drawTacticalActor(cell,width,height,phase,moving){
 const separate=typeof individualSprite==='function'&&individualSprite(['commander','deputy','sf','df','greed','rage','pride','envy'][cell]);
 if(separate){const rect=tightSpriteRect(separate,[0,0,separate.naturalWidth,separate.naturalHeight]),size=fittedSpriteSize(rect,width,height),px=cell<4?.5:.34,py=cell<4?.55:.54;c.drawImage(separate,...rect,-size.width*px,-size.height*py,size.width,size.height);return}
 const sw=tacticalAtlas.naturalWidth/4,sh=tacticalAtlas.naturalHeight/2;
 const sx=cell%4*sw,sy=Math.floor(cell/4)*sh;
 // A single intact pose per actor: no directional swapping or sliced-limb warping.
 const pivotX=cell<4?.5:.34,pivotY=cell<4?.55:.54;
 c.drawImage(tacticalAtlas,sx,sy,sw,sh,-width*pivotX,-height*pivotY,width,height);
}
