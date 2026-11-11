'use strict';
/** Direct route -> A* around obstacles -> shortcut -> collision-validated quadratic corners. */
function simplifyRoute(points,avoid=[]){
 const output=[points[0]];
 for(let i=1;i<points.length;){
  let far=i;
  for(let j=points.length-1;j>=i;j--){
   if(routeSegmentClear(output[output.length-1],points[j],50,avoid)){far=j;break}
  }
  if(far===i&&!routeSegmentClear(output[output.length-1],points[i],50,avoid))return[];
  output.push(points[far]);i=far+1;
 }return output;
}
function curveRoute(points,avoid=[]){
 if(points.length<3)return points;
 const output=[points[0]];
 for(let i=1;i<points.length-1;i++){
  const prev=points[i-1],p=points[i],next=points[i+1];
  const before=Math.hypot(p.x-prev.x,p.y-prev.y),after=Math.hypot(next.x-p.x,next.y-p.y);
  const cut=Math.min(22,before*.27,after*.27);
  if(cut<4){output.push(p);continue}
  const start={x:p.x-(p.x-prev.x)*cut/before,y:p.y-(p.y-prev.y)*cut/before};
  const end={x:p.x+(next.x-p.x)*cut/after,y:p.y+(next.y-p.y)*cut/after};
  const samples=[start];
  for(let t=.2;t<1;t+=.2)samples.push({x:(1-t)*(1-t)*start.x+2*(1-t)*t*p.x+t*t*end.x,y:(1-t)*(1-t)*start.y+2*(1-t)*t*p.y+t*t*end.y});
  samples.push(end);
  let valid=routeSegmentClear(output[output.length-1],start,50,avoid),from=start;
  for(const q of samples.slice(1)){if(!routeSegmentClear(from,q,50,avoid)){valid=false;break}from=q}
  if(valid&&routeSegmentClear(end,next,50,avoid))output.push(...samples);else output.push(p);
 }
 output.push(points[points.length-1]);return output;
}
pathTo=function(actor,goal,avoidAgents=false){
 if(!world?.grid)return[];
 const dest=routeSafeGoal(goal,50);if(!dest)return[];
 const avoid=avoidAgents?units.filter(u=>u!==actor&&alive(u)&&!u.moving):[];
 const from={x:actor.x,y:actor.y};
 if(Math.hypot(from.x-dest.x,from.y-dest.y)<6)return[];
 if(routeSegmentClear(from,dest,50,avoid))return[dest];
 const nodes=findGridRoute(actor,dest,avoidAgents);
 if(!nodes.length)return avoidAgents?pathTo(actor,dest,false):[];
 const polygon=simplifyRoute([from,...nodes,dest],avoid);
 if(!polygon.length)return avoidAgents?pathTo(actor,dest,false):[];
 return curveRoute(polygon,avoid).slice(1);
};
setRoute=function(actor,point,force=false){
 const goal=routeSafeGoal(point,22);if(!goal)return false;
 if(!force&&actor.routeGoal&&distance(actor.routeGoal,goal)<8&&(actor.path?.length||distance(actor,goal)<8))return true;
 const path=pathTo(actor,goal);
 if(!path.length)return false;
 actor.path=path;actor.tx=goal.x;actor.ty=goal.y;
 actor.routeGoal={...goal};actor.routeAt=t;actor.blockedTime=0;actor.attackGoal=null;
 return true;
};
