'use strict';
/** Movement applies only to an explicitly ordered path, or the officer controlled by WASD.
 * No steering around idle soldiers, automatic jostling, or invented side-steps. */
function canFollowPath(u){
  return u.task && ['move','follow','search','clear','cover','regroup','retreat','fallback','attack','defend','extract'].includes(u.task);
}
function desiredVelocity(u,dt){
  if(!alive(u))return{x:0,y:0};
  const firingOffset=fireLaneVelocity(u,dt);
  if(firingOffset)return firingOffset;
  let dx=0,dy=0;
  const manual=u.i===controlledId&&!autoRetreat;
  if(manual){
    dx=Number(keys.has(bindings.right))-Number(keys.has(bindings.left));
    dy=Number(keys.has(bindings.down))-Number(keys.has(bindings.up));
    tryActorFacing(u,Math.atan2(mouse.y-u.y,mouse.x-u.x));
    const oldLean=u.lean;u.lean=Number(keys.has(bindings.leanRight))-Number(keys.has(bindings.leanLeft));if(!isActorSpaceFree(u,u.x,u.y))u.lean=oldLean;
  }else{
    if(!canFollowPath(u)||t<(u.waitUntil||0))return{x:0,y:0};
    while(u.path?.length&&distance(u,u.path[0])<7)u.path.shift();
    const goal=u.path?.[0];
    if(!goal)return{x:0,y:0};
    dx=goal.x-u.x;dy=goal.y-u.y;
  }
  const length=Math.hypot(dx,dy);
  if(length<1e-7)return{x:0,y:0};
  const speed=(u.stance==='prone'?34:u.stance==='crouch'?62:108)*weaponMoveMultiplier(u);
  const velocity=Math.min(speed,manual?speed:length/Math.max(dt,1e-6));
  return{x:dx/length*velocity,y:dy/length*velocity};
}
function simulateMovement(dt){
  const actors=units.filter(alive);
  // Process the controlled officer first; all other actors keep their current box.
  actors.sort((a,b)=>a.i===controlledId?-1:b.i===controlledId?1:a.i-b.i);
  for(const u of actors){
    const velocity=desiredVelocity(u,dt),dx=velocity.x*dt,dy=velocity.y*dt;
    const ox=u.x,oy=u.y;
    const moved=moveWithHitbox(u,dx,dy);
    u.moving=moved>.02;
    if(u.moving){
      u.phase+=moved*.14;
      u.legA=Math.atan2(u.y-oy,u.x-ox);
      u.blockedTime=0;
      if(u.i!==controlledId&&!u.engage)tryActorFacing(u,u.legA);
    }else if(Math.hypot(dx,dy)>.03){
      u.blockedTime=(u.blockedTime||0)+dt;
      // Recompute a route only for an existing user-issued destination.
      if(u.i!==controlledId&&u.blockedTime>1.2&&u.routeGoal&&canFollowPath(u)){
        u.blockedTime=0;
        const next=pathTo(u,u.routeGoal,true);
        if(next.length)u.path=next;
        else{u.orderBlocked=true;} // Keep the player's destination; retry when traffic clears.
        u.waitUntil=t+.2;
      }
    }else u.blockedTime=0;
  }
}
