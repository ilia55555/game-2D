'use strict';
/** Fast occupancy tile collision. AABBs remain continuous; actors NEVER snap to tiles. */
function tileBoxBlocked(g,x,y,hx=0,hy=hx){
 if(!Number.isFinite(x+y+hx+hy))return true;
 const s=g.cell,epsilon=.0001,
  x0=Math.floor((x-hx+epsilon)/s),x1=Math.floor((x+hx-epsilon)/s),
  y0=Math.floor((y-hy+epsilon)/s),y1=Math.floor((y+hy-epsilon)/s);
 for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
  const k=tileAt(g,tx,ty);
  if(k<0||!g.land[k]||g.solid[k])return true;
 }return false;
}
const legacyBlocked=isBlocked,legacyInsideSolid=isInsideSolid;
isBlocked=function(x,y,r=15){
 if(world?.grid)return tileBoxBlocked(world.grid,x,y,r,r);
 return legacyBlocked(x,y,r);
};
isInsideSolid=function(x,y,box){
 if(world?.grid)return tileBoxBlocked(world.grid,x,y,box.hx,box.hy);
 return legacyInsideSolid(x,y,box);
};
function gridClearanceGrid(){
 const g=world.grid,blocked=new Uint8Array(g.cols*g.rows),clearance=22;
 for(let y=0;y<g.rows;y++)for(let x=0;x<g.cols;x++){
  blocked[y*g.cols+x]=tileBoxBlocked(g,(x+.5)*g.cell,(y+.5)*g.cell,clearance,clearance)?1:0;
 }
 nav={cell:g.cell,cols:g.cols,rows:g.rows,blocked};
 return nav;
}
buildNav=function(){return world?.grid?gridClearanceGrid():null};
