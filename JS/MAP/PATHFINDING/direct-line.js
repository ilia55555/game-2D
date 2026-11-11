'use strict';
/** Direct visibility test in continuous world coordinates, not grid-node traversal. */
function routeSegmentClear(a,b,clearance=50,avoid=[]){
 if(!a||!b)return false;
 const length=Math.hypot(b.x-a.x,b.y-a.y),count=Math.max(1,Math.ceil(length/7));
 for(let i=0;i<=count;i++){
  const p={x:a.x+(b.x-a.x)*i/count,y:a.y+(b.y-a.y)*i/count};
  if(isBlocked(p.x,p.y,clearance))return false;
  for(const u of avoid){
   if(!alive(u))continue;
   const box=actorHitbox(u);
   if(Math.abs(p.x-u.x)<box.hx+clearance+2&&Math.abs(p.y-u.y)<box.hy+clearance+2)return false;
  }
 }
 return true;
}
function routeSafeGoal(point,clearance=50){
 if(!point||!world?.grid)return null;
 const g=world.grid;
 const x=Math.max(40,Math.min(world.width-40,point.x)),y=Math.max(40,Math.min(world.height-40,point.y));
 if(!isBlocked(x,y,clearance))return{x,y};
 const c=g.cell,cx=Math.floor(x/c),cy=Math.floor(y/c);
 for(let radius=1;radius<=10;radius++)for(let iy=cy-radius;iy<=cy+radius;iy++)for(let ix=cx-radius;ix<=cx+radius;ix++){
  if(Math.max(Math.abs(ix-cx),Math.abs(iy-cy))!==radius)continue;
  const p={x:(ix+.5)*c,y:(iy+.5)*c};
  if(!isBlocked(p.x,p.y,clearance))return p;
 }
 return null;
}
