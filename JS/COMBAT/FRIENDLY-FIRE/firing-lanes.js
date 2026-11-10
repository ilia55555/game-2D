'use strict';
/** A *fire order* can authorize a short sideways move to obtain a clear lane.
 * Self-defence and idle HOLD never authorize this movement.
 */
const FIRE_LANE_STEPS=[45,72,95];
function fireOrderAllowsSidestep(u){
 return u.i!==controlledId&&!autoRetreat&&(Boolean(squads[u.group]?.fire)||u.task==='attack'||u.task==='clear');
}
function requestSafeFireLane(u,target){
 if(!fireOrderAllowsSidestep(u)||!target||t<(u.fireLaneRetryAt||0))return false;
 if(u.fireLane?.points?.length)return false;
 const d=distance(u,target);
 if(d<1)return false;
 const nx=-(target.y-u.y)/d,ny=(target.x-u.x)/d;
 let best=null;
 for(const amount of FIRE_LANE_STEPS)for(const sign of [u.i%2?1:-1,u.i%2?-1:1]){
  const p={x:u.x+nx*amount*sign,y:u.y+ny*amount*sign};
  if(isBlocked(p.x,p.y,22)||allyInShotLine(u,target,p)||!routeSegmentClear(u,p,21,[]))continue;
  const blockedActor=units.some(other=>other!==u&&alive(other)&&
   segmentVsBox(u,p,other,6));
  if(blockedActor)continue;
  const path=pathTo(u,p,true);
  if(!path.length)continue;
  const cost=path.reduce((n,q,i)=>n+distance(i?path[i-1]:u,q),0);
  if(!best||cost<best.cost)best={points:path,cost};
 }
 u.fireLaneRetryAt=t+1;
 if(!best)return false;
 u.fireLane={points:best.points,goal:best.points[best.points.length-1],expires:t+3};
 return true;
}
function fireLaneVelocity(u,dt){
 const lane=u.fireLane;
 if(!lane)return null;
 if(t>lane.expires||!fireOrderAllowsSidestep(u)){u.fireLane=null;return null}
 while(lane.points.length>1&&distance(u,lane.points[0])<16)lane.points.shift();
 const goal=lane.points[0];
 if(!goal||distance(u,goal)<5){u.fireLane=null;return null}
 const dx=goal.x-u.x,dy=goal.y-u.y,len=Math.hypot(dx,dy);
 const speed=Math.min(90*weaponMoveMultiplier(u),lane.points.length===1?len/Math.max(dt,.001):90);
 return{x:dx/len*speed,y:dy/len*speed};
}
