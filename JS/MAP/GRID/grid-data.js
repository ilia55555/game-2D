'use strict';
/** The 32-unit grid describes solids and terrain; actor coordinates remain continuous. */
const MAP_TILE=32;
function makeMapGrid(cols,rows){
 return {cell:MAP_TILE,cols,rows,land:new Uint8Array(cols*rows),solid:new Uint8Array(cols*rows),road:new Uint8Array(cols*rows)};
}
function tileAt(g,x,y){return x>=0&&y>=0&&x<g.cols&&y<g.rows?y*g.cols+x:-1}
function paintEllipse(g,cx,cy,rx,ry){
 for(let y=Math.max(1,Math.floor(cy-ry));y<Math.min(g.rows-1,Math.ceil(cy+ry));y++)
 for(let x=Math.max(1,Math.floor(cx-rx));x<Math.min(g.cols-1,Math.ceil(cx+rx));x++)
  if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1.07)g.land[tileAt(g,x,y)]=1;
}
function paintLane(g,a,b,halfWidth=2){
 const dx=b.x-a.x,dy=b.y-a.y,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)*2));
 for(let j=0;j<=steps;j++){
  const x=Math.round(a.x+dx*j/steps),y=Math.round(a.y+dy*j/steps);
  for(let iy=y-halfWidth;iy<=y+halfWidth;iy++)
  for(let ix=x-halfWidth;ix<=x+halfWidth;ix++){
   const k=tileAt(g,ix,iy);if(k<0||ix<2||iy<2||ix>=g.cols-2||iy>=g.rows-2)continue;
   g.land[k]=1;g.road[k]=1;
  }
 }
}
function gridRectAvailable(g,x,y,w,h,allowRoad=false){
 if(x<2||y<2||x+w>=g.cols-2||y+h>=g.rows-2)return false;
 for(let yy=y-1;yy<y+h+1;yy++)for(let xx=x-1;xx<x+w+1;xx++){
  const k=tileAt(g,xx,yy);
  if(k<0||!g.land[k]||g.solid[k]||!allowRoad&&g.road[k])return false;
 }
 return true;
}
function gridBlockRect(g,x,y,w,h){
 for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
  const k=tileAt(g,xx,yy);if(k>=0)g.solid[k]=1;
 }
}
function gridTileOpen(g,x,y){
 const k=tileAt(g,x,y);return k>=0&&g.land[k]&&!g.solid[k];
}
function gridWorldOpen(g,x,y){return gridTileOpen(g,Math.floor(x/g.cell),Math.floor(y/g.cell))}
function findOpenTile(g,x,y,maxRadius=22){
 const cx=Math.floor(x/g.cell),cy=Math.floor(y/g.cell);
 for(let r=0;r<=maxRadius;r++)for(let yy=cy-r;yy<=cy+r;yy++)for(let xx=cx-r;xx<=cx+r;xx++){
  if(Math.max(Math.abs(xx-cx),Math.abs(yy-cy))!==r||!gridTileOpen(g,xx,yy))continue;
  return{x:(xx+.5)*g.cell,y:(yy+.5)*g.cell};
 }return null;
}
function validateStageGrid(w){
 const g=w.grid,start=findOpenTile(g,w.spawn.x,w.spawn.y,12);
 if(!start||!w.buildings.length)return false;
 const sx=Math.floor(start.x/g.cell),sy=Math.floor(start.y/g.cell),queue=[tileAt(g,sx,sy)];
 const seen=new Uint8Array(g.cols*g.rows);seen[queue[0]]=1;
 for(let i=0;i<queue.length;i++){
  const k=queue[i],x=k%g.cols,y=Math.floor(k/g.cols);
  for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
   const nx=x+dx,ny=y+dy,n=tileAt(g,nx,ny);
   if(n>=0&&!seen[n]&&gridTileOpen(g,nx,ny)){seen[n]=1;queue.push(n)}
  }
 }
 return w.buildings.every(b=>{
  const p=findOpenTile(g,b.entry.x,b.entry.y,4);
  return p&&seen[tileAt(g,Math.floor(p.x/g.cell),Math.floor(p.y/g.cell))];
 });
}
