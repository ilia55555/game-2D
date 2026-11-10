'use strict';
/** Render the playable shape from a cached terrain canvas, independent of AI. */
let gridTerrainCache=null,gridTerrainSeed=null,showMapGrid=false;
function terrainCanvas(w){
 const sig=w.seed+':'+w.index;
 if(gridTerrainCache&&gridTerrainSeed===sig)return gridTerrainCache;
 const out=document.createElement('canvas');out.width=w.width;out.height=w.height;
 const g=out.getContext('2d');g.fillStyle='#11181a';g.fillRect(0,0,w.width,w.height);
 const size=w.grid.cell;
 for(let y=0;y<w.grid.rows;y++)for(let x=0;x<w.grid.cols;x++){
  const k=y*w.grid.cols+x;
  if(!w.grid.land[k])continue;
  g.fillStyle=w.grid.road[k]?'#55565a':w.weather==='day'?'#626950':'#424b3f';
  g.fillRect(x*size,y*size,size+.5,size+.5);
 }
 gridTerrainCache=out;gridTerrainSeed=sig;return out;
}
field=function(){
 if(!world)return;
 c.fillStyle='#0c1115';c.fillRect(-500,-500,world.width+1000,world.height+1000);
 c.drawImage(terrainCanvas(world),0,0);
 for(const b of world.buildings){
  rr(b.x,b.y,b.w,b.h,0,'#6a6258');
  for(let x=b.x;x<b.x+b.w;x+=32)line(x,b.y,x,b.y+b.h,'#302b2c22');
 }
 for(const w of walls){
  if(w.tree||w.shelf)continue;
  rr(w.x+4,w.y+6,w.w,w.h,1,'#15171866');
  rr(w.x,w.y,w.w,w.h,w.rock?5:1,w.rock?'#7d7c69':'#8b8379','#b1a18a');
 }
 for(const w of walls)if(w.shelf)rr(w.x,w.y,w.w,w.h,2,'#7a6851','#9c9279');
 for(const b of world.bushes)ellipse(b.x,b.y,b.r,b.r*.8,'#43583d77');
 for(const tree of world.trees){
  ellipse(tree.x+7,tree.y+9,tree.r,tree.r*.9,'#13191877');
  ellipse(tree.x,tree.y,tree.r,tree.r*.87,world.weather==='day'?'#486d40':'#304d3b');
 }
 for(const l of world.lamps){rr(l.x-2,l.y-12,5,16,2,'#413e3e');ellipse(l.x,l.y,4,4,'#f0d995')}
 for(const m of marks)ellipse(m.x,m.y,2,2,'#2f2324');
 if(showMapGrid){
  const size=world.grid.cell;
  for(let y=0;y<world.grid.rows;y++)for(let x=0;x<world.grid.cols;x++){
   const k=y*world.grid.cols+x;
   if(!world.grid.land[k]&&!world.grid.solid[k])continue;
   c.strokeStyle='#b7c8e425';c.lineWidth=.7;c.strokeRect(x*size,y*size,size,size);
   if(world.grid.solid[k]){c.fillStyle='#ea474547';c.fillRect(x*size,y*size,size,size)}
  }
 }
};
window.addEventListener('keydown',e=>{
 if(e.code==='KeyN'&&!e.repeat&&state==='playing'){showMapGrid=!showMapGrid;}
});
