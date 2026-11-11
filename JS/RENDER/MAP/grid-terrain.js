'use strict';
/** Cached continuous terrain. The occupancy grid stays invisible and is only physics data. */
let gridTerrainCache=null,gridTerrainSeed=null,showMapGrid=false;
function terrainCanvas(w){
 const sig=w.fingerprint;if(gridTerrainCache&&gridTerrainSeed===sig)return gridTerrainCache;
 const out=document.createElement('canvas');out.width=w.width;out.height=w.height;
 const g=out.getContext('2d'),rng=seeded(w.seed^0x51f09),size=w.grid.cell;
 g.fillStyle='#18251f';g.fillRect(0,0,w.width,w.height);
 const layer=document.createElement('canvas');layer.width=w.width;layer.height=w.height;
 const h=layer.getContext('2d');h.fillStyle='#465044';h.fillRect(0,0,w.width,w.height);
 // Ground stains, grass tufts, stones and gritty gravel, generated once per seed.
 for(let i=0;i<w.width*w.height/95;i++){
  const x=rng()*w.width,y=rng()*w.height,r=.7+rng()*3.5;
  h.fillStyle=['#75806b25','#202e2730','#b4a98b19','#92917b20'][i%4];
  h.beginPath();h.ellipse(x,y,r,r*.45,rng()*6.28,0,Math.PI*2);h.fill();
 }
 const mask=document.createElement('canvas');mask.width=w.width;mask.height=w.height;
 const m=mask.getContext('2d');m.fillStyle='#fff';
 for(let y=0;y<w.grid.rows;y++)for(let x=0;x<w.grid.cols;x++)if(w.grid.land[y*w.grid.cols+x])m.fillRect(x*size,y*size,size,size);
 h.globalCompositeOperation='destination-in';h.filter='blur(22px)';h.drawImage(mask,0,0);h.filter='none';h.globalCompositeOperation='source-over';
 g.drawImage(layer,0,0);
 // Record continuous street centrelines independently of navigation tiles.
 const roadPath=road=>{const pts=road.points;g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y)};
 g.lineJoin=g.lineCap='round';
 // Draw each material across the whole network so junctions have no internal rims.
 for(const [extra,color] of [[22,'#262c2a'],[12,'#817f7055'],[0,'#3a3d3d']])for(const road of w.roads){
  if(!road.points?.length)continue;roadPath(road);g.strokeStyle=color;g.lineWidth=road.width+extra;g.stroke();
 }
 for(const road of w.roads){if(!road.points?.length)continue;roadPath(road);g.strokeStyle='#bdb49855';g.lineWidth=2;g.setLineDash([16,22]);g.stroke();g.setLineDash([])}
 // Fine asphalt wear, no tile lines.
 for(let i=0;i<w.width*w.height/130;i++){
  const x=rng()*w.width,y=rng()*w.height,k=tileAt(w.grid,Math.floor(x/size),Math.floor(y/size));
  if(k<0||!w.grid.road[k])continue;
  g.fillStyle=i%3?'#c5bca117':'#171e2444';g.fillRect(x,y,1+rng()*4,1+rng()*2);
 }
 for(let i=0;i<200;i++){
  const x=rng()*w.width,y=rng()*w.height;if(!gridWorldOpen(w.grid,x,y))continue;
  g.strokeStyle='#1c242330';g.lineWidth=.8;g.beginPath();g.moveTo(x,y);g.lineTo(x+12,y+8);g.lineTo(x+8,y+19);g.stroke();
 }
 gridTerrainCache=out;gridTerrainSeed=sig;return out;
}
function drawRock(w){
 c.save();c.translate(w.x+w.w/2,w.y+w.h/2);c.beginPath();
 const pts=[[-.48,-.23],[-.2,-.5],[.3,-.43],[.5,-.06],[.34,.43],[-.24,.5],[-.5,.16]];
 for(let i=0;i<pts.length;i++){const x=pts[i][0]*w.w,y=pts[i][1]*w.h;i?c.lineTo(x,y):c.moveTo(x,y)}
 c.closePath();c.fillStyle='#64685d';c.shadowColor='#080d0a88';c.shadowBlur=9;c.shadowOffsetY=5;c.fill();c.shadowBlur=0;c.shadowOffsetY=0;c.strokeStyle='#929282';c.stroke();
 line(-w.w*.25,-w.h*.12,w.w*.2,-w.h*.27,'#a7a48a55',2);line(w.w*.2,-w.h*.27,w.w*.32,w.h*.16,'#222e2755',2);c.restore();
}
field=function(){
 if(!world)return;c.fillStyle='#111a17';c.fillRect(-500,-500,world.width+1000,world.height+1000);c.drawImage(terrainCanvas(world),0,0);
 for(const b of world.buildings){
  rr(b.x,b.y,b.w,b.h,2,'#656459');
  c.save();c.beginPath();c.rect(b.x,b.y,b.w,b.h);c.clip();
  const rng=seeded(world.seed+Number(b.id.slice(1))*91);
  for(let j=0;j<90;j++){const x=b.x+rng()*b.w,y=b.y+rng()*b.h;line(x,y,x+rng()*12,y+2,'#a39b7b24',1)}
  for(let x=b.x+48;x<b.x+b.w;x+=64)line(x,b.y,x,b.y+b.h,'#363d351c',1);
  rr(b.x+18,b.y+18,34,18,2,'#454940','#8a8c72');rr(b.x+b.w-50,b.y+b.h-40,28,20,2,'#554c3d','#80735a');
  c.restore();
 }
 for(const w of walls){
  if(w.tree)continue;if(w.rock){drawRock(w);continue}
  rr(w.x+5,w.y+8,w.w,w.h,2,'#090d1299');
  const grad=c.createLinearGradient(w.x,w.y,w.x+w.w,w.y+w.h);grad.addColorStop(0,w.shelf?'#796b51':'#a39b86');grad.addColorStop(1,w.shelf?'#4b4339':'#656e67');
  rr(w.x,w.y,w.w,w.h,2,grad,'#b4ad9766');
  line(w.x+3,w.y+3,w.x+w.w-3,w.y+3,'#ded2b77a',2);
  // Concrete joints, chips and cap detail without exposing collision tiles.
  if(w.w>w.h)for(let x=w.x+57;x<w.x+w.w;x+=73)line(x,w.y+4,x+2,w.y+w.h-3,'#303b3655',1);
  else for(let y=w.y+59;y<w.y+w.h;y+=73)line(w.x+4,y,w.x+w.w-3,y+2,'#303b3655',1);
 }
 for(const b of world.bushes){for(let j=0;j<7;j++){const a=j*2.4;ellipse(b.x+Math.cos(a)*b.r*.5,b.y+Math.sin(a)*b.r*.4,b.r*.45,b.r*.35,j%2?'#45554188':'#63704d66')}}
 for(const tree of world.trees){
  ellipse(tree.x+12,tree.y+16,tree.r,tree.r*.85,'#0a151777');
  const rng=seeded(Math.floor(tree.x*19+tree.y));
  for(let j=0;j<38;j++){
   const a=j*2.4,r=Math.sqrt(rng())*tree.r*.72,x=tree.x+Math.cos(a)*r,y=tree.y+Math.sin(a)*r,leaf=tree.r*(.13+rng()*.2);
   c.beginPath();for(let k=0;k<10;k++){const angle=k*Math.PI/5,rad=leaf*(k%2?.67:1);const px=x+Math.cos(angle)*rad,py=y+Math.sin(angle)*rad;k?c.lineTo(px,py):c.moveTo(px,py)}c.closePath();c.fillStyle=['#283f31','#344e36','#496044','#566e47'][j%4];c.fill();
  }
 }
 for(const l of world.lamps){rr(l.x-3,l.y-15,6,18,2,'#272f30','#68716c');ellipse(l.x,l.y,4,3,'#ffe2a1')}
 for(const m of marks)ellipse(m.x,m.y,2,2,'#211b1a');
 if(showMapGrid){const s=world.grid.cell;for(let y=0;y<world.grid.rows;y++)for(let x=0;x<world.grid.cols;x++){c.strokeStyle='#b7c8e420';c.lineWidth=.7;c.strokeRect(x*s,y*s,s,s);if(world.grid.solid[y*world.grid.cols+x]){c.fillStyle='#ea474547';c.fillRect(x*s,y*s,s,s)}}}
};
window.addEventListener('keydown',e=>{if(e.code==='KeyN'&&!e.repeat&&state==='playing'&&!paused)showMapGrid=!showMapGrid});
