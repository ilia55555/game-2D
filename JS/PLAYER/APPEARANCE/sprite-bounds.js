'use strict';
/** Tight opaque bounds, cached once per image region. No transparent atlas margin enters physics. */
const spriteBoundsCache=new WeakMap();
function tightSpriteRect(image,rect){
 if(!image.complete||!image.naturalWidth)return rect;
 let cache=spriteBoundsCache.get(image);if(!cache){cache=new Map();spriteBoundsCache.set(image,cache)}
 const key=rect.join(',');if(cache.has(key))return cache.get(key);
 let bounds=rect;
 try{
  const surface=document.createElement('canvas');surface.width=Math.ceil(rect[2]);surface.height=Math.ceil(rect[3]);
  const context=surface.getContext('2d',{willReadFrequently:true});context.drawImage(image,...rect,0,0,surface.width,surface.height);
  const {data}=context.getImageData(0,0,surface.width,surface.height);let x0=surface.width,y0=surface.height,x1=-1,y1=-1;
  for(let y=0;y<surface.height;y++)for(let x=0;x<surface.width;x++)if(data[(y*surface.width+x)*4+3]>24){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}
  if(x1>=x0)bounds=[rect[0]+x0,rect[1]+y0,x1-x0+1,y1-y0+1];
 }catch{}
 cache.set(key,bounds);return bounds;
}
function fittedSpriteSize(rect,maxWidth=78,maxHeight=56){const size=Math.min(maxWidth/rect[2],maxHeight/rect[3]);return{width:rect[2]*size,height:rect[3]*size}}
function troopSpriteCell(u){return u.role==='commander'?0:u.role==='deputy'?1:u.group==='alpha'?2:3}
function troopSpriteRegion(u){
 const separate=typeof individualSprite==='function'&&individualSprite(['commander','deputy','sf','df'][troopSpriteCell(u)]);
 if(separate)return{image:separate,rect:tightSpriteRect(separate,[0,0,separate.naturalWidth,separate.naturalHeight])};
 if(u.role==='commander'&&typeof commanderArtReady==='function'&&commanderArtReady())return{image:commanderArt,rect:tightSpriteRect(commanderArt,COMMANDER_FRAME.rect)};
 if(!tacticalAtlas.complete||!tacticalAtlas.naturalWidth)return null;
 const cell=troopSpriteCell(u),sw=tacticalAtlas.naturalWidth/4,sh=tacticalAtlas.naturalHeight/2;
 return{image:tacticalAtlas,rect:tightSpriteRect(tacticalAtlas,[cell%4*sw,Math.floor(cell/4)*sh,sw,sh])};
}
function troopSpriteSize(u){const source=troopSpriteRegion(u),size=source?fittedSpriteSize(source.rect):{width:78,height:56};if(u.stance==='crouch'){size.width*=.9;size.height*=.9}else if(u.stance==='prone'){size.width*=1.1;size.height*=.8}return size}
function drawTroopPose(u){
 const source=troopSpriteRegion(u);if(!source)return false;
 const size=troopSpriteSize(u);c.drawImage(source.image,...source.rect,-size.width/2,-size.height/2,size.width,size.height);return true;
}
