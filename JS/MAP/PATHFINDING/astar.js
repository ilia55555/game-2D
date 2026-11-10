'use strict';
/** Heap-based A*. Grid cells are planner nodes only; returned vertices use floating-point world coordinates. */
function findGridRoute(from,to,avoidAgents=false){
 if(!nav||nav.cols!==world.grid.cols||nav.rows!==world.grid.rows)buildNav();
 const {cols,rows,cell,blocked:solid}=nav,total=cols*rows;
 const blocked=avoidAgents?solid.slice():solid;
 if(avoidAgents)for(const unit of units){
  if(!alive(unit)||unit===from||unit.i===from.i)continue;
  for(let y=Math.max(0,Math.floor((unit.y-39)/cell));y<Math.min(rows,Math.ceil((unit.y+39)/cell));y++)
  for(let x=Math.max(0,Math.floor((unit.x-39)/cell));x<Math.min(cols,Math.ceil((unit.x+39)/cell));x++)
   if(Math.abs((x+.5)*cell-unit.x)<40&&Math.abs((y+.5)*cell-unit.y)<40)blocked[y*cols+x]=1;
 }
 const idx=(x,y)=>y*cols+x;
 function closest(p){
  const cx=Math.max(0,Math.min(cols-1,Math.floor(p.x/cell))),cy=Math.max(0,Math.min(rows-1,Math.floor(p.y/cell)));
  for(let rad=0;rad<=7;rad++)for(let y=cy-rad;y<=cy+rad;y++)for(let x=cx-rad;x<=cx+rad;x++){
   if(x<0||y<0||x>=cols||y>=rows||Math.max(Math.abs(x-cx),Math.abs(y-cy))!==rad||blocked[idx(x,y)])continue;
   const worldPos={x:(x+.5)*cell,y:(y+.5)*cell};
   if(routeSegmentClear(p,worldPos,20,[]))return idx(x,y);
  }
  return -1;
 }
 const start=closest(from),end=closest(to);
 if(start<0||end<0)return[];
 const score=new Float32Array(total).fill(Infinity),previous=new Int32Array(total).fill(-1),closed=new Uint8Array(total);
 const heap=[],heuristic=k=>Math.hypot(k%cols-end%cols,Math.floor(k/cols)-Math.floor(end/cols));
 function push(k,f){let i=heap.length;heap.push({k,f});while(i){const p=(i-1)>>1;if(heap[p].f<=f)break;heap[i]=heap[p];i=p;}heap[i]={k,f}}
 function pop(){const out=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[i]=heap[c];i=c}heap[i]=last}return out.k}
 score[start]=0;push(start,heuristic(start));
 let reached=false;
 while(heap.length){
  const k=pop();if(closed[k])continue;
  if(k===end){reached=true;break;}closed[k]=1;
  const x=k%cols,y=Math.floor(k/cols);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=cols||ny>=rows)continue;
   const next=idx(nx,ny);
   if(blocked[next]||closed[next]||dx&&dy&&(blocked[idx(nx,y)]||blocked[idx(x,ny)]))continue;
   const cost=score[k]+(dx&&dy?1.41421356:1);
   if(cost<score[next]){score[next]=cost;previous[next]=k;push(next,cost+heuristic(next))}
  }
 }
 if(!reached)return[];
 const result=[];for(let k=end;k!==start;k=previous[k]){
  if(k<0)return[];
  result.push({x:(k%cols+.5)*cell,y:(Math.floor(k/cols)+.5)*cell});
 }
 result.reverse();
 return result;
}
