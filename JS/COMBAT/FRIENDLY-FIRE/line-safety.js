'use strict';
/** Prevent all shots that pass through an allied hitbox, including the muzzle-to-target segment.
 * Independent of projectile rendering and of the squad's AI targeting.
 */
const ALLY_FIRE_PADDING=8;
function segmentVsBox(from,to,entity,padding=ALLY_FIRE_PADDING){
 const frame=actorFootprint(entity),box=actorHitbox(entity),angle=entity.a||0,co=Math.cos(angle),si=Math.sin(angle);
 const local=p=>({x:(p.x-frame.x)*co+(p.y-frame.y)*si,y:-(p.x-frame.x)*si+(p.y-frame.y)*co});
 from=local(from);to=local(to);
 const mins={x:-box.hx-padding,y:-box.hy-padding},maxs={x:box.hx+padding,y:box.hy+padding};
 let near=0,far=1;
 for(const axis of ['x','y']){
  const delta=to[axis]-from[axis];
  if(Math.abs(delta)<1e-7){if(from[axis]<mins[axis]||from[axis]>maxs[axis])return false;continue}
  const a=(mins[axis]-from[axis])/delta,b=(maxs[axis]-from[axis])/delta;
  near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
  if(near>far)return false;
 }
 return near<=1&&far>=0;
}
function allyInShotLine(shooter,target,start={x:shooter.x,y:shooter.y}){
 if(!shooter||!target||!Number.isFinite(target.x+target.y))return null;
 const stop={x:target.x,y:target.y};
 return units.find(other=>other!==shooter&&alive(other)&&segmentVsBox(start,stop,other))||null;
}
function canFireWithoutFriendlyHit(shooter,target){
 return !allyInShotLine(shooter,target);
}
