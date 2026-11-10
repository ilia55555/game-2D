'use strict';
/** Explicit, axis-aligned collision boxes for ALL soldiers and zombies.
 * Physics dimensions, not the graphic sprite size. Nobody can phase through walls.
 */
const HITBOX_SOLDIER = Object.freeze({hx: 13, hy: 13});
const HITBOX_WALKER = Object.freeze({hx: 12, hy: 12});
const HITBOX_BRUTE = Object.freeze({hx: 15, hy: 15});
let showHitboxes = false;
function actorHitbox(actor) {
  return actor.hitbox || (actor.i !== undefined ? HITBOX_SOLDIER : actor.special ? HITBOX_BRUTE : HITBOX_WALKER);
}
function intersectsBoxes(ax, ay, ab, bx, by, bb) {
  return Math.abs(ax-bx) < ab.hx + bb.hx - 0.001 && Math.abs(ay-by) < ab.hy + bb.hy - 0.001;
}
function isInsideSolid(x,y,b) {
  const minX=world?40:55, maxX=world?world.width-40:1045;
  const minY=world?40:48, maxY=world?world.height-40:817;
  if(x-b.hx<minX||x+b.hx>maxX||y-b.hy<minY||y+b.hy>maxY)return true;
  for(const w of walls){
    if(x+b.hx>w.x&&x-b.hx<w.x+w.w&&y+b.hy>w.y&&y-b.hy<w.y+w.h)return true;
  }
  return false;
}
function actorAlive(actor) {
  return actor.i !== undefined ? actor.hp>0&&!actor.extracted : !actor.dead&&actor.hp>0;
}
function isActorSpaceFree(actor,x,y,others=true) {
  const b=actorHitbox(actor);
  if(isInsideSolid(x,y,b))return false;
  if(!others)return true;
  for(const other of units){
    if(other===actor||!actorAlive(other))continue;
    if(intersectsBoxes(x,y,b,other.x,other.y,actorHitbox(other)))return false;
  }
  for(const other of zombies){
    if(other===actor||!actorAlive(other))continue;
    if(intersectsBoxes(x,y,b,other.x,other.y,actorHitbox(other)))return false;
  }
  return true;
}
/** Swept movement with short substeps; each axis slides but never penetrates.
 * Stationary characters are never pushed. No automatic dodge motion. */
function moveWithHitbox(actor,dx,dy) {
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return 0;
  const beforeX=actor.x,beforeY=actor.y;
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/4));
  const sx=dx/steps,sy=dy/steps;
  for(let i=0;i<steps;i++){
    let moved=false;
    if(Math.abs(sx)>1e-8&&isActorSpaceFree(actor,actor.x+sx,actor.y)){
      actor.x+=sx;moved=true;
    }
    if(Math.abs(sy)>1e-8&&isActorSpaceFree(actor,actor.x,actor.y+sy)){
      actor.y+=sy;moved=true;
    }
    if(!moved)break;
  }
  return Math.hypot(actor.x-beforeX,actor.y-beforeY);
}
moveBody=function(actor,dx,dy){return moveWithHitbox(actor,dx,dy)};
/** Avoid spawning a zombie inside a wall or another actor. */
function placeActorSafely(actor){
  if(isActorSpaceFree(actor,actor.x,actor.y))return;
  const ox=actor.x,oy=actor.y;
  for(let r=18;r<=240;r+=12){
    for(let j=0;j<24;j++){
      const a=j*Math.PI/12;
      const x=ox+Math.cos(a)*r,y=oy+Math.sin(a)*r;
      if(isActorSpaceFree(actor,x,y)){actor.x=x;actor.y=y;return;}
    }
  }
  // A blocked spawn must not become a ghost actor.
  actor.hp=0;actor.dead=true;
}
window.addEventListener('keydown',e=>{
  if(e.code==='KeyB'&&!e.repeat&&state==='playing'&&!paused){showHitboxes=!showHitboxes;}
});
const drawBeforeHitboxDebug=draw;
draw=function(){
  drawBeforeHitboxDebug();
  if(!showHitboxes||!world)return;
  c.setTransform(dpr,0,0,dpr,0,0);
  c.translate(W/2,(H-57)/2);
  c.scale(scale(),scale());
  c.translate(-cameraX,-cameraY);
  c.lineWidth=1.25;
  for(const entity of [...units,...zombies]){
    if(!actorAlive(entity))continue;
    const b=actorHitbox(entity);
    c.strokeStyle=entity.i!==undefined?'#42d5f3':'#ff5858';
    c.strokeRect(entity.x-b.hx,entity.y-b.hy,b.hx*2,b.hy*2);
  }
};
