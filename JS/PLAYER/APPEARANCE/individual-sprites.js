'use strict';
/** Optional individual uploads replace the sheet automatically when present. */
const individualSpriteNames=['commander','deputy','sf','df','greed','rage','pride','envy'];
const individualSprites=new Map();
for(const name of individualSpriteNames){const picture=new Image();picture.onerror=()=>{};picture.src=new URL('../ASSETS/CHARACTERS/INDIVIDUAL/'+name+'.png',document.baseURI).href;individualSprites.set(name,picture)}
function individualSprite(name){const picture=individualSprites.get(name);return picture?.complete&&picture.naturalWidth?picture:null}
