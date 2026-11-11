'use strict';
/** Rotating footprints: soldiers include rifle; infected include torso, not reaching hands. */
const HITBOX_SOLDIER=Object.freeze({hx:39,hy:28});
const HITBOX_WALKER=Object.freeze({hx:23,hy:26});
const HITBOX_BRUTE=Object.freeze({hx:32,hy:34});
let showHitboxes=false;
function actorHitbox(actor){return actor.hitbox||(actor.i!==undefined?HITBOX_SOLDIER:actor.special?HITBOX_BRUTE:HITBOX_WALKER)}
function intersectsBoxes(ax,ay,ab,bx,by,bb){return Math.abs(ax-bx)<ab.hx+bb.hx-.001&&Math.abs(ay-by)<ab.hy+bb.hy-.001}
function actorFootprint(actor,x=actor.x,y=actor.y){const h=actorHitbox(actor),a=actor.a||0;return{x,y,hx:h.hx,hy:h.hy,a}}
function footprintBounds(box){const co=Math.abs(Math.cos(box.a)),si=Math.abs(Math.sin(box.a));return{hx:co*box.hx+si*box.hy,hy:si*box.hx+co*box.hy}}
function footprintsOverlap(a,b,padding=0){
 const dx=b.x-a.x,dy=b.y-a.y;
 for(const angle of [a.a,a.a+Math.PI/2,b.a,b.a+Math.PI/2]){
  const nx=Math.cos(angle),ny=Math.sin(angle);
  const ar=a.hx*Math.abs(Math.cos(a.a)*nx+Math.sin(a.a)*ny)+a.hy*Math.abs(-Math.sin(a.a)*nx+Math.cos(a.a)*ny);
  const br=b.hx*Math.abs(Math.cos(b.a)*nx+Math.sin(b.a)*ny)+b.hy*Math.abs(-Math.sin(b.a)*nx+Math.cos(b.a)*ny);
  if(Math.abs(dx*nx+dy*ny)>=ar+br+padding-.001)return false;
 }
 return true;
}
function pointInActor(actor,point,padding=0){const h=actorHitbox(actor),a=actor.a||0,dx=point.x-actor.x,dy=point.y-actor.y;return Math.abs(dx*Math.cos(a)+dy*Math.sin(a))<=h.hx+padding&&Math.abs(-dx*Math.sin(a)+dy*Math.cos(a))<=h.hy+padding}
function actorAlive(actor){return actor.i!==undefined?actor.hp>0&&!actor.extracted:!actor.dead&&actor.hp>0}
function isInsideSolid(x,y,b){
 if(x-b.hx<40||x+b.hx>world.width-40||y-b.hy<40||y+b.hy>world.height-40)return true;
 return walls.some(w=>x+b.hx>w.x&&x-b.hx<w.x+w.w&&y+b.hy>w.y&&y-b.hy<w.y+w.h);
}
function footprintHitsWorld(box){
 const bounds=footprintBounds(box);
 if(world?.grid){
  const g=world.grid,s=g.cell;
  for(let ty=Math.floor((box.y-bounds.hy)/s);ty<=Math.floor((box.y+bounds.hy)/s);ty++)for(let tx=Math.floor((box.x-bounds.hx)/s);tx<=Math.floor((box.x+bounds.hx)/s);tx++){
   const k=tileAt(g,tx,ty);
   if((k<0||!g.land[k]||g.solid[k])&&footprintsOverlap(box,{x:(tx+.5)*s,y:(ty+.5)*s,hx:s/2,hy:s/2,a:0}))return true;
  }
  return false;
 }
 if(box.x-bounds.hx<40||box.x+bounds.hx>world.width-40||box.y-bounds.hy<40||box.y+bounds.hy>world.height-40)return true;
 return walls.some(w=>footprintsOverlap(box,{x:w.x+w.w/2,y:w.y+w.h/2,hx:w.w/2,hy:w.h/2,a:0}));
}
function isActorSpaceFree(actor,x,y,others=true){
 const box=actorFootprint(actor,x,y);if(footprintHitsWorld(box))return false;
 if(others)for(const other of [...units,...zombies])if(other!==actor&&actorAlive(other)&&footprintsOverlap(box,actorFootprint(other)))return false;
 return true;
}
function tryActorFacing(actor,angle){const old=actor.a;actor.a=angle;if(!isActorSpaceFree(actor,actor.x,actor.y)){actor.a=old;return false}return true}
function zombieMeleeContact(z,u){return alive(u)&&footprintsOverlap(actorFootprint(z),actorFootprint(u),9)&&clearSight(z,u)}
function moveWithHitbox(actor,dx,dy){
 if(!Number.isFinite(dx+dy))return 0;const ox=actor.x,oy=actor.y,steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/3)),sx=dx/steps,sy=dy/steps;
 for(let i=0;i<steps;i++){let moved=false;if(Math.abs(sx)>1e-8&&isActorSpaceFree(actor,actor.x+sx,actor.y)){actor.x+=sx;moved=true}if(Math.abs(sy)>1e-8&&isActorSpaceFree(actor,actor.x,actor.y+sy)){actor.y+=sy;moved=true}if(!moved)break}
 return Math.hypot(actor.x-ox,actor.y-oy);
}
moveBody=function(actor,dx,dy){return moveWithHitbox(actor,dx,dy)};
function placeActorSafely(actor){
 if(isActorSpaceFree(actor,actor.x,actor.y))return;const ox=actor.x,oy=actor.y;
 for(let r=18;r<=480;r+=12)for(let i=0;i<32;i++){const a=i*Math.PI/16,x=ox+Math.cos(a)*r,y=oy+Math.sin(a)*r;if(isActorSpaceFree(actor,x,y)){actor.x=x;actor.y=y;return}}
 actor.hp=0;actor.dead=true;
}
window.addEventListener('keydown',e=>{if(e.code==='KeyB'&&!e.repeat&&state==='playing'&&!paused)showHitboxes=!showHitboxes});
const drawBeforeHitboxDebug=draw;
draw=function(){drawBeforeHitboxDebug();if(!showHitboxes||!world)return;c.save();c.setTransform(dpr,0,0,dpr,0,0);c.translate(W/2,(H-57)/2);c.scale(scale(),scale());c.translate(-cameraX,-cameraY);c.lineWidth=1.25;
 for(const actor of [...units,...zombies]){if(!actorAlive(actor)||actor.i===undefined&&!teamSees(actor))continue;const b=actorHitbox(actor);c.save();c.translate(actor.x,actor.y);c.rotate(actor.a||0);c.strokeStyle=actor.i!==undefined?'#54d43d':'#ff3636';c.strokeRect(-b.hx,-b.hy,b.hx*2,b.hy*2);c.restore()}c.restore()};
