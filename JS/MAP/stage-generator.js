'use strict';
/** Seeded asymmetric topology, curved street skeleton, variable building scale.
 * Floor/road occupancy is separated from independent axis-aligned wall colliders.
 */
function generateStage(seed,index){
 const rng=seeded(seed),rand=(a,b)=>Math.floor(a+rng()*(b-a+1)),size=MAP_TILE;
 const cols=rand(50,94),rows=rand(45,86),width=cols*size,height=rows*size;
 const kind=['city','industrial','hypermarket'][Math.floor(rng()*3)];
 const weather=['day','dusk','night','dawn'][(index-1)%4],g=makeMapGrid(cols,rows);
 const w={seed,index,width,height,kind,grid:g,weather,ambient:weather==='day'?.81:weather==='dusk'?.34:weather==='dawn'?.46:.035,
 nvgAvailable:weather==='night'&&(index%8===3||rng()>.48),buildings:[],trees:[],rocks:[],lamps:[],bushes:[],walls:[],roads:[]};
 const hubs=[],count=kind==='hypermarket'?rand(3,5):rand(5,9);
 const firstSide=rand(0,3),spawnHub={x:firstSide===0?7:firstSide===1?cols-8:rand(10,cols-11),
 y:firstSide===2?7:firstSide===3?rows-8:rand(10,rows-11)};
 hubs.push(spawnHub);
 for(let i=1;i<count;i++){
  let p=null;for(let attempt=0;attempt<50;attempt++){
   const q={x:rand(12,cols-13),y:rand(11,rows-12)};
   if(hubs.every(n=>Math.hypot(n.x-q.x,n.y-q.y)>11)){p=q;break}
  }
  hubs.push(p||{x:rand(9,cols-10),y:rand(9,rows-10)});
 }
 for(const [i,p] of hubs.entries()){
  const large=kind==='hypermarket'&&i===1;
  paintEllipse(g,p.x,p.y,large?Math.min(22,cols/3):rand(10,16),large?Math.min(20,rows/3):rand(9,15));
 }
 function bendRoad(a,b,half=2){
  // Two elbows make street directions vary; a few become very indirect.
  const mx=Math.round((a.x+b.x)/2),my=b.y;
  const p={x:Math.max(3,Math.min(cols-4,mx)),y:a.y};
  const q={x:p.x,y:Math.max(3,Math.min(rows-4,my))};
  w.roads.push({points:[a,p,q,{x:b.x,y:q.y},b].map(v=>({x:(v.x+.5)*size,y:(v.y+.5)*size})),width:(half*2+1)*size-12});
  paintLane(g,a,p,half);paintLane(g,p,q,half);paintLane(g,q,{x:b.x,y:q.y},half);
  paintLane(g,{x:b.x,y:q.y},b,half);
 }
 // Link each district to its nearest connected neighbour. This prevents random
 // criss-cross spaghetti while retaining asymmetric connected streets.
 const connected=new Set([0]);
 while(connected.size<hubs.length){
  let edge=null;
  for(const a of connected)for(let b=0;b<hubs.length;b++)if(!connected.has(b)){
   const d=Math.hypot(hubs[a].x-hubs[b].x,hubs[a].y-hubs[b].y);
   if(!edge||d<edge.d)edge={a,b,d};
  }
  bendRoad(hubs[edge.a],hubs[edge.b],rand(2,3));connected.add(edge.b);
 }
 // A few short service-road dead ends, aligned with the local street network.
 for(let i=0;i<rand(1,3);i++){
  const a=hubs[rand(0,hubs.length-1)],horizontal=rng()>.5,length=rand(6,11)*(rng()>.5?1:-1);
  const b={x:Math.max(3,Math.min(cols-4,a.x+(horizontal?length:0))),y:Math.max(3,Math.min(rows-4,a.y+(horizontal?0:length)))};
  const half=1;w.roads.push({points:[a,b].map(v=>({x:(v.x+.5)*size,y:(v.y+.5)*size})),width:(half*2+1)*size-12});paintLane(g,a,b,half);
 }
 w.spawn=findOpenTile(g,(spawnHub.x+.5)*size,(spawnHub.y+.5)*size,12)||{x:width/2,y:height/2};
 const wall=(tx,ty,tw,th,extra={})=>{
  if(tw<=0||th<=0)return;
  gridBlockRect(g,tx,ty,tw,th);
  w.walls.push({x:tx*size,y:ty*size,w:tw*size,h:th*size,cover:true,capacity:Math.max(tw,th)>=4?2:1,...extra});
 };
 function building(tx,ty,bw,bh){
  const nearX=Math.max(tx*size,Math.min((tx+bw)*size,w.spawn.x)),nearY=Math.max(ty*size,Math.min((ty+bh)*size,w.spawn.y));
  if(Math.hypot(nearX-w.spawn.x,nearY-w.spawn.y)<220)return;
  const id='b'+w.buildings.length,doorSide=rand(0,3),gap=Math.min(5,(doorSide%2?bh:bw)-2);
  const b={id,x:(tx+1)*size,y:(ty+1)*size,w:(bw-2)*size,h:(bh-2)*size,
  outer:{x:tx*size,y:ty*size,w:bw*size,h:bh*size},doorSide,cleared:false,visited:false};
  const gx=Math.floor((bw-gap)/2),gy=Math.floor((bh-gap)/2);
  if(doorSide===0){wall(tx,ty,gx,1,{building:id});wall(tx+gx+gap,ty,bw-gx-gap,1,{building:id});b.entry={x:(tx+gx+gap/2)*size,y:(ty-1)*size}}
  else wall(tx,ty,bw,1,{building:id});
  if(doorSide===2){wall(tx,ty+bh-1,gx,1,{building:id});wall(tx+gx+gap,ty+bh-1,bw-gx-gap,1,{building:id});b.entry={x:(tx+gx+gap/2)*size,y:(ty+bh+1)*size}}
  else wall(tx,ty+bh-1,bw,1,{building:id});
  if(doorSide===1){wall(tx+bw-1,ty,1,gy,{building:id});wall(tx+bw-1,ty+gy+gap,1,bh-gy-gap,{building:id});b.entry={x:(tx+bw+1)*size,y:(ty+gy+gap/2)*size}}
  else wall(tx+bw-1,ty,1,bh,{building:id});
  if(doorSide===3){wall(tx,ty,1,gy,{building:id});wall(tx,ty+gy+gap,1,bh-gy-gap,{building:id});b.entry={x:(tx-1)*size,y:(ty+gy+gap/2)*size}}
  else wall(tx,ty,1,bh,{building:id});
  w.buildings.push(b);
  if(kind==='hypermarket'&&bw>=12){
   // Shelf islands leave traversable cross aisles and exits.
   for(let xx=tx+3;xx<tx+bw-3;xx+=4)for(let yy=ty+3;yy<ty+bh-3;yy+=6)
    if(yy+2<ty+bh-3)wall(xx,yy,1,2,{shelf:true,building:id});
  }
 }
 for(let i=1;i<hubs.length;i++){
  const p=hubs[i],giant=kind==='hypermarket'&&i===1;
  let placed=false;
  for(let j=0;j<60&&!placed;j++){
   const bw=giant?rand(15,Math.min(21,Math.max(15,cols-16))):kind==='industrial'?rand(8,15):rand(6,11);
   const bh=giant?rand(12,Math.min(17,Math.max(12,rows-16))):kind==='industrial'?rand(7,12):rand(6,10);
   const tx=Math.round(p.x-bw/2+rand(-8,8)),ty=Math.round(p.y-bh/2+rand(-7,7));
   if(!gridRectAvailable(g,tx,ty,bw,bh))continue;
   building(tx,ty,bw,bh);placed=true;
  }
 }
 // Supplemental diverse structures use the same collision tiles.
 for(let i=0;i<rand(3,10);i++){
  const p=hubs[rand(0,hubs.length-1)],bw=rand(6,10),bh=rand(6,10),tx=p.x+rand(-13,13),ty=p.y+rand(-10,10);
  if(gridRectAvailable(g,tx,ty,bw,bh))building(tx,ty,bw,bh);
 }
 // Fill spare district plots before accepting a sparse world.
 for(let i=0;i<500&&w.buildings.length<5;i++){
  const bw=rand(6,10),bh=rand(6,10),tx=rand(3,cols-bw-4),ty=rand(3,rows-bh-4);
  if(gridRectAvailable(g,tx,ty,bw,bh))building(tx,ty,bw,bh);
 }
 // Guaranteed mission target without falsifying navigable space.
 if(!w.buildings.length){
  const p=hubs[1]||hubs[0];for(let k=0;k<120&&!w.buildings.length;k++){
   const tx=p.x+rand(-11,11),ty=p.y+rand(-11,11);
   if(gridRectAvailable(g,tx,ty,7,7,true))building(tx,ty,7,7);
  }
 }
 for(let i=0;i<rand(20,60);i++){
  const p=hubs[rand(0,hubs.length-1)],tx=p.x+rand(-14,14),ty=p.y+rand(-13,13);
  if(!gridRectAvailable(g,tx,ty,1,1))continue;
  wall(tx,ty,1,1,{tree:true,cover:false});
  w.trees.push({x:(tx+.5)*size,y:(ty+.5)*size,r:rand(22,42),shade:rng()});
 }
 for(let i=0;i<rand(8,25);i++){
  const p=hubs[rand(0,hubs.length-1)],tx=p.x+rand(-12,12),ty=p.y+rand(-11,11),bw=rand(1,3),bh=rand(1,2);
  if(!gridRectAvailable(g,tx,ty,bw,bh))continue;
  const rock={x:tx*size,y:ty*size,w:bw*size,h:bh*size,cover:true,capacity:2,rock:true};
  wall(tx,ty,bw,bh,{rock:true});w.rocks.push(rock);
 }
 for(let i=0;i<40;i++){
  const x=rand(2,cols-3),y=rand(2,rows-3);
  if(gridTileOpen(g,x,y))w.bushes.push({x:(x+.5)*size,y:(y+.5)*size,r:rand(16,32)});
 }
 for(const p of hubs)w.lamps.push({x:p.x*size,y:p.y*size,range:rand(130,215),strength:weather==='day'?.3:.86});
 for(const b of w.buildings)if(rng()>.35)w.lamps.push({x:b.x+b.w*.7,y:b.y+b.h*.4,range:rand(100,170),strength:.7,indoor:true});
 w.walls.forEach((wall,i)=>{wall.id='w'+i;wall.idx=i});
 w.extractionPoint=findOpenTile(g,hubs[hubs.length-1].x*size,hubs[hubs.length-1].y*size,15)||{...w.spawn};
 w.fingerprint=[seed,index,cols,rows,kind,w.buildings.map(b=>[b.x,b.y,b.w,b.h]).join(';')].join('|');
 w.gridValid=validateStageGrid(w);
 return w;
}
