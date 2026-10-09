/* Run with Node >=18: node html/tests/strategic_battle.test.cjs. No dependencies. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const html=fs.readFileSync(path.join(__dirname,'../strategic_battle.html'),'utf8');
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
for(const s of scripts)new Function(s);
let frame;
const host=new Function('performance','setInterval','postMessage','let onmessage;\n'+scripts[0]+'\nreturn {send(d){onmessage({data:d})},step(n){for(let i=0;i<n&&!paused&&(running||phase==="setup");i++)sim(.04);emit(true)},read(s){return eval(s)}}')(performance,()=>0,f=>{frame=f;});
const read=s=>host.read(s),send=d=>host.send(d),step=n=>host.step(n);
const g=(team,type,total,x,y,b=0,a=0)=>({key:`${team}-${a}-${b}`,team,type,total,x,y,army:a,battalion:b,angle:team?Math.PI:0,width:200,formation:'line',stance:'aggressive',order:'hold',queue:[]});
const rect=(kind,x,y,w,h)=>({shape:'rect',kind,x,y,w,h});
function init(gs,map={zones:[]},mode='local',seed=731){send({kind:'init',serial:1,map,groups:gs,mode,seed,bot:'balanced',difficulty:'normal',speed:1,viewTeam:0});}
function until(test,max=3000){let i=0;while(!test()&&i++<max)step(1);assert(test(),'condition timed out');}
const cases=[];
function test(name,f){f();cases.push(name);console.log('PASS',name);}
const maps= new Function('const W=3200,H=2200;'+scripts[1].slice(scripts[1].indexOf('const ellipse='),scripts[1].indexOf('let layoutCache='))+'return MAPS;')();
test('Castle defender-only troops and siege attackers stay distinct',()=>{
 const availableSource=scripts[1].slice(scripts[1].indexOf('function availableTypes(t=activeTeam,'),scripts[1].indexOf('function convertRoster(){'));
 const chooser=new Function('activeTeam','config','UNIT_TYPES',availableSource+'return availableTypes;');
 for(const mode of ['siege','raid'])for(const role of ['attack','defend']){
  const f=chooser(0,{battleMode:mode,role},read('UNIT_TYPES')),def=role==='defend'?0:1,d=f(def),a=f(1-def);
  assert([40,41,42].every(t=>d.includes(t)&&!a.includes(t)));
  assert([1,4,12,13,15,16,17,24,25,36].every(t=>!d.includes(t)));
  assert(mode==='siege'?[15,16,17].every(t=>a.includes(t)):[24,29,36].every(t=>a.includes(t)));
 }
 assert(read('UNIT_TYPES.slice(40).every(u=>u.fortress&&u.cost>0)'));
});
test('Castle worker rejects wrong-role units and recognizes garrison attacks',()=>{
 const map={battleMode:'siege',defender:1,attacker:0,castle:{x:1350,y:600,w:1050,h:1000},zones:[]};
 init([g(0,40,1,1250,1100),g(1,16,1,1650,1100)],map);
 assert.equal(read('groups[0].type'),0);
 assert.equal(read('groups[1].type'),0);
 init([g(0,0,1,1570,1100),g(1,41,12,1690,1100)],map);
 assert.equal(read('groups[1].type'),41);
 send({kind:'start'});step(300);
 assert(read('hp[0]')<100,'New castle archer must actually deal damage');
});
test('Single offline file, valid JS, unique IDs, 43 unit definitions and five battle modes',()=>{const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);assert.equal(read('UNIT_TYPES.length'),43);assert.equal(maps.length,17);assert(!/<script[^>]+src=|<link[^>]+href=|<img[^>]+src="https?:/.test(html));});
test('Original five land maps stay unchanged; every other mode has three maps',()=>{
 const ids=maps.map(m=>m.id);
 assert.deepEqual(ids.slice(0,5),['ridge','gorge','river','forest','plains']);
 assert.equal(new Set(ids).size,ids.length);
 for(const [mode,count] of Object.entries({land:5,sea:3,coast:3,siege:3,raid:3}))
   assert.equal(maps.filter(m=>(m.battleMode||'land')===mode).length,count,mode);
});
test('New coasts have connected bridges; ships navigate; siege and raids have real gates and towers',()=>{
 for(const m of maps){
  const mode=m.battleMode||'land',bases=m.bases||[{x:340,y:1100},{x:2860,y:1100}];
  assert(m.zones.length>0,m.id);
  assert.equal(new Set(m.zones.map(z=>z.kind)).size>=1,true,m.id);
  const attackingShip=mode==='sea'||mode==='raid';
  const defendingShip=mode==='sea';
  init([g(0,attackingShip?24:0,1,bases[0].x,bases[0].y),g(1,defendingShip?24:0,1,bases[1].x,bases[1].y)],m);
  assert(read('groups.every(g=>pass(cell(g.x,g.y),domain(g.type)))'),m.id+' spawn');
  if(mode==='sea'){
    assert(read('water.some(v=>v===0)&&water.some(v=>v===1)'),m.id+' navigable islands');
    assert(read('findPath(cell(groups[0].x,groups[0].y),cell(groups[1].x,groups[1].y),"sea").reachable'),m.id+' sea route');
  }
  if(mode==='coast'){
    assert(read('bridge.some(v=>v===1)&&water.some(v=>v===1)'),m.id+' bridges and water');
    assert(read('findPath(cell(groups[0].x,groups[0].y),cell(groups[1].x,groups[1].y),"land").reachable'),m.id+' land passage');
  }
  if(mode==='siege'||mode==='raid'){
    assert(m.castle,m.id+' castle');
    assert(read('structures.some(s=>s.type==="gate")'),m.id+' destructible gate');
    assert.equal(read('structures.filter(s=>s.type==="tower").length'),4,m.id+' towers');
  }
 }
});
test('10,000 cavalry have 10,000 independent live states and geometric draw records',()=>{init([g(0,1,10000,800,1100),g(1,0,50,2900,1100)]);assert.equal(read('N'),10050);assert.equal(read('Array.from(typ.subarray(0,N)).filter(t=>t===1).length'),10000);assert.equal(frame.count,10000);const a=new Float32Array(frame.buffer);for(let i=0;i<frame.count;i++)assert.equal(a[i*6+2],1);assert(frame.groups.every(g=>g.team===0));assert.equal(frame.reports.length,0);});
test('Visible contact does not reveal enemy army size or battalion number',()=>{init([g(0,0,1,400,1100),g(1,0,200,480,1100)]);const enemy=frame.groups.find(g=>g.team===1);assert(enemy);assert.equal(enemy.alive,null);assert.equal(enemy.total,null);assert.equal(enemy.army,null);assert.equal(enemy.battalion,null);assert.equal(frame.reports.length,0);});
test('Fog reduces actual visibility; close contacts remain visible',()=>{const gs=[g(0,0,1,340,1100),g(1,0,1,490,1100)];init(gs);assert(frame.groups.some(g=>g.team===1));init(gs,{zones:[],weather:[{kind:'fog',shape:'ellipse',x:500,y:1100,rx:700,ry:500}]});assert(!frame.groups.some(g=>g.team===1));init([gs[0],g(1,0,1,380,1100)],{zones:[],weather:[{kind:'cloud',shape:'ellipse',x:500,y:1100,rx:700,ry:500}]});assert(frame.groups.some(g=>g.team===1));});
test('Spy starts at own HQ, observes, physically returns; no report while carrying',()=>{init([g(0,0,1,340,1100),g(1,0,100,1200,1100)]);send({kind:'scout',x:930,y:1100,count:1});assert.equal(frame.missions.length,1);assert.equal(read('x[missions[0].scout]'),340);assert.equal(read('y[missions[0].scout]'),1100);until(()=>frame.missions[0].stage==='returning');assert.equal(frame.reports.length,0);assert(read('missions[0].records.length')>0);until(()=>frame.missions[0].stage==='delivered');assert.equal(frame.reports.length,1);assert.equal(frame.reports[0].count,100);assert.equal(frame.reports[0].index,1);assert(read('dist(x[missions[0].scout],y[missions[0].scout],bases[0].x,bases[0].y)')<36);});
test('Killing returning spy loses the undelivered report',()=>{init([g(0,0,1,340,1100),g(1,0,40,1200,1100)]);send({kind:'scout',x:930,y:1100,count:1});until(()=>frame.missions[0].stage==='returning');read('hp[missions[0].scout]=0;groups[gid[missions[0].scout]].alive=0');step(50);assert.equal(frame.missions[0].stage,'failed');assert.equal(frame.reports.length,0);});
test('Courier departs HQ, receives news on site; killing carrier prevents delivery',()=>{init([g(0,0,1,340,1100),g(1,0,30,1200,1100)]);send({kind:'scout',x:930,y:1100,count:1,withCourier:true});assert.equal(read('x[missions[0].courier]'),340);until(()=>frame.missions[0].stage==='carrying');assert.equal(frame.reports.length,0);read('hp[missions[0].courier]=0;groups[gid[missions[0].courier]].alive=0');step(400);assert.equal(frame.missions[0].stage,'failed');assert.equal(frame.reports.length,0);});
test('Courier can deliver after spy is killed following the physical handoff',()=>{init([g(0,0,1,340,1100),g(1,0,30,1200,1100)]);send({kind:'scout',x:930,y:1100,count:1,withCourier:true});until(()=>frame.missions[0].stage==='carrying');read('hp[missions[0].scout]=0;groups[gid[missions[0].scout]].alive=0');until(()=>frame.missions[0].stage==='delivered');assert.equal(frame.reports[0].count,30);});
test('Recall cancels pending intelligence; completed agent slots can be reused',()=>{init([g(0,0,1,340,1100),g(1,0,30,1200,1100)]);for(let i=0;i<150;i++){send({kind:'scout',x:340,y:1100,count:1,withCourier:true});step(110);assert.equal(frame.missions.at(-1).stage,'delivered');step(2);}assert(read('L-N')<=4);send({kind:'scout',x:930,y:1100,count:1});step(80);send({kind:'recall'});step(300);assert.equal(frame.missions.at(-1).stage,'recalled');assert.equal(frame.reports.length,0);});
test('Each commander receives only own missions/reports and hidden enemy cannot be ordered',()=>{init([g(0,0,10,340,1100),g(1,0,10,2800,1100)]);send({kind:'scout',x:700,y:1100,count:1});send({kind:'order',ids:[1],points:[{x:500,y:500}],order:'attack'});assert.equal(read('groups[1].queue.length'),0);send({kind:'view',team:1});assert.equal(frame.viewTeam,1);assert.equal(frame.missions.length,0);assert(frame.groups.every(g=>g.team===1));send({kind:'scout',team:1,x:2400,y:1000,count:1});assert.equal(frame.missions.length,1);assert.equal(read('missions.at(-1).team'),1);});
test('Bot owns randomized roster and uses both recon and attack orders',()=>{const fingerprints=new Set();for(const seed of [11,101,212,909,12341]){init([g(0,0,1800,340,1100)],{zones:[],battleMode:'land'},'bot',seed);fingerprints.add(read('JSON.stringify(groups.filter(g=>g.team===1).map(g=>[g.army,g.battalion,g.type,g.total,g.formation]))'));assert.equal(frame.groups.filter(g=>g.team===1).length,0);assert.equal(frame.total,1800);const valid=read('groups.filter(g=>g.team===1).reduce((a,g)=>(a[g.army]=(a[g.army]||0)+g.total,a),{})');assert(Object.values(valid).every(n=>n<=10000));}assert.equal(fingerprints.size,5);step(60);assert(read('missions.some(m=>m.team===1)'));send({kind:'start'});step(2);assert(!read('dispatches.some(d=>d.team===1&&d.category==="order")'));step(500);assert(read('dispatches.some(d=>d.team===1&&d.category==="order")'));});
test('Melee and ranged attacks cause individual casualties, not aggregated removals',()=>{init([g(0,0,40,1570,1100),g(1,0,40,1620,1100)]);send({kind:'start'});read('assignOrder([0],[{x:1620,y:1100}],"attack");assignOrder([1],[{x:1570,y:1100}],"attack")');step(800);assert(read('groups[0].alive+groups[1].alive')<80);assert.equal(read('Array.from(hp).filter(h=>h>0).length'),read('groups.reduce((n,g)=>n+g.alive,0)'));init([g(0,2,25,1500,1100),g(1,0,25,1650,1100)]);send({kind:'start'});step(400);assert(read('groups[1].alive')<25);});
test('Land uses bridges while ships can sail beneath them; ships cannot sail on land',()=>{const map={battleMode:'coast',zones:[rect('water',1410,0,210,2200),rect('bridge',1370,1000,290,210)]};init([g(0,0,1,1200,500),g(1,0,1,2700,1800)],map);send({kind:'start'});send({kind:'order',ids:[0],points:[{x:1800,y:500}],order:'move'});step(2000);assert(read('x[0]')>1650);assert.equal(read('water[cell(x[0],y[0])]'),0);init([g(0,24,1,1500,500),g(1,0,1,2700,1800)],map);send({kind:'start'});send({kind:'order',ids:[0],points:[{x:1500,y:1700}],order:'move'});step(900);assert(read('y[0]')>1400);assert.equal(read('water[cell(x[0],y[0])]'),1);send({kind:'order',ids:[0],points:[{x:700,y:1000}],order:'move'});step(700);assert.equal(read('water[cell(x[0],y[0])]'),1);});
test('Sea-to-land marines change geometry and can land',()=>{init([g(0,36,1,2150,1100),g(1,0,1,3000,1800)],maps.find(m=>m.id==='sea-castle'));assert.equal(new Float32Array(frame.buffer)[2],45);send({kind:'start'});send({kind:'order',ids:[0],points:[{x:2400,y:1100}],order:'move'});step(1200);assert(read('x[0]')>2300);assert.equal(read('water[cell(x[0],y[0])]'),0);assert.equal(new Float32Array(frame.buffer)[2],36);});

test('A standard ram needs three full hits on a gate but six on a stone wall',()=>{
 const m=maps.find(m=>m.id==='castle');
 for(const kind of ['gate','wall']){
  // Avoid corner panels shared with another wall when verifying a direct corridor.
  const z=m.zones.find(z=>z.kind===kind&&z.h>80&&z.w<=64);
  assert(z,m.id+' missing '+kind);
  const px=z.x+z.w/2,py=z.y+z.h/2;
  init([g(0,16,1,z.x-30,py),g(1,0,1,2800,1600)],m);
  const id=read('structures.findIndex(s=>s.type==="'+kind+'"&&Math.abs(s.x-'+px+')<.01&&Math.abs(s.y-'+py+')<.01)');
  assert(id>=0);
  const hp=read('structures['+id+'].maxHp'),hit=read('UNIT_TYPES[16].damage*UNIT_TYPES[16].building');
  assert.equal(hp,kind==='gate'?1800:3900);
  const blows=Math.ceil(hp/hit);assert.equal(blows,kind==='gate'?3:6);
  const k='cell('+px+','+py+')',version=read('navVersion');
  assert.equal(read('solid['+k+']'),1);
  for(let j=1;j<blows;j++){
   read('launch(0,-1,'+id+')');
   assert(read('structures['+id+'].hp')>0,kind+' was destroyed prematurely');
   assert.equal(read('solid['+k+']'),1);
   assert.equal(read('navVersion'),version);
  }
  read('launch(0,-1,'+id+')');
  assert.equal(read('structures['+id+'].hp'),0);
  assert.equal(read('solid['+k+']'),0);
  assert.equal(read('navVersion'),version+1);
  assert(read('pass('+k+',"land")'),kind+' breach remains blocked');
  assert(read('los('+(z.x-50)+','+py+','+(z.x+z.w+50)+','+py+',"land")'),kind+' direct passage blocked');
 }
});
test('Destroying a wall panel leaves adjacent panels and gates intact on every fortress',()=>{
 for(const m of maps.filter(m=>m.castle)){
  const z=m.zones.find(z=>z.kind==='wall'&&z.h>80&&z.w<=64);
  assert(z,m.id+' lacks separate wall panels');
  init([g(0,m.battleMode==='raid'?36:16,1,1900,1100),g(1,0,1,2800,1100)],m);
  const x=z.x+z.w/2,y=z.y+z.h/2;
  const id=read('structures.findIndex(s=>s.type==="wall"&&Math.abs(s.x-'+x+')<.01&&Math.abs(s.y-'+y+')<.01)');
  assert(id>=0);
  const count=read('structures.filter(s=>s.type==="wall"&&s.hp>0).length');
  const gates=read('structures.filter(s=>s.type==="gate").map(s=>s.hp)');
  const nav=read('navVersion');
  read('damageStructure(0,'+id+',100000)');
  assert.equal(read('structures.filter(s=>s.type==="wall"&&s.hp>0).length'),count-1);
  assert.deepEqual(read('structures.filter(s=>s.type==="gate").map(s=>s.hp)'),gates);
  assert.equal(read('solid[cell('+x+','+y+')]'),0);
  assert.equal(read('navVersion'),nav+1);
 }
});
test('Rams in live battle smash an obstacle, then advance into castle through new breach',()=>{
 const m=maps.find(m=>m.id==='castle'),c=m.castle;
 for(const [y,kind] of [[1100,'gate'],[790,'wall']]){
  init([g(0,16,1,c.x-12,y),g(1,0,1,2800,1680)],m);
  send({kind:'start'});
  read('assignOrder([0],[{x:2750,y:'+y+'}],"attack")');
  const x0=read('x[0]'),initialNav=read('navVersion');
  let broken=false;
  for(let i=0;i<10&&!broken;i++){
   step(100);
   broken=read('structures.some(s=>s.type==="'+kind+'"&&s.hp===0)');
  }
  assert(broken,kind+' was never destroyed by attacks');
  assert(read('navVersion')>initialNav);
  for(let i=0;i<10&&read('x[0]')<c.x+140;i++)step(100);
  assert(read('x[0]')>x0+140,kind+' breaching did not permit actual advance');
 }
});
test('Siege gates are destructible and a ram can breach the perimeter',()=>{
 const m=maps.find(m=>m.id==='castle'),e=m.entrances.find(e=>e.kind==='gate');
 init([g(0,16,20,2000,1100),g(1,0,1,2800,1600)],m);
 assert.equal(read('solid[cell('+e.x+','+e.y+')]'),1);
 const version=read('navVersion');
 read('damageStructure(0,structures.findIndex(s=>s.type==="gate"),100000)');
 assert.equal(read('solid[cell('+e.x+','+e.y+')]'),0);
 assert(read('navVersion')>version);
 assert(read('findPath(cell(2000,1100),cell(2780,1100),"land").reachable'));
});
test('Castle towers shoot beyond their own walls and HQ destruction ends battle',()=>{const m=maps.find(m=>m.id==='castle');init([g(0,0,1,2310,440),g(1,0,1,2800,1500)],m);send({kind:'start'});step(125);assert(read('hp[0]')<100);init([g(0,0,1,340,1100),g(1,0,1,2800,1100)]);send({kind:'start'});read('bases[1].hp=0');step(26);assert.equal(frame.winner,0);assert.equal(frame.reason,'hq');assert.equal(frame.phase,'ended');assert(frame.groups.some(g=>g.team===1));});
test('Castle access is limited to 1–4 planned entrances and all other wall sections seal',()=>{
 for(const m of maps.filter(m=>m.castle)){
  assert(m.entrances.length>=1&&m.entrances.length<=4,m.id);
  assert(m.entrances.some(e=>e.kind==='passage'),m.id+' needs an open passage');
  const c=m.castle,T=64;
  for(const side of ['north','east','south','west']){
   const horizontal=side==='north'||side==='south',a=(horizontal?c.x:c.y)+T+16,b=(horizontal?c.x+c.w:c.y+c.h)-T-16;
   for(let p=a;p<b;p+=16){
    const x=horizontal?p:side==='west'?c.x+T/2:c.x+c.w-T/2;
    const y=horizontal?(side==='north'?c.y+T/2:c.y+c.h-T/2):p;
    const expectedOpen=m.entrances.some(e=>e.side===side&&e.kind==='passage'&&Math.abs(p-(horizontal?e.x:e.y))<e.width/2-16);
    const nearEntry=m.entrances.some(e=>e.side===side&&Math.abs(p-(horizontal?e.x:e.y))<=e.width/2+16);
    const obstacle=m.zones.some(z=>['gate','wall'].includes(z.kind)&&x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h);
    if(expectedOpen)assert(!obstacle,m.id+' has a blocked opening');
    if(!nearEntry)assert(obstacle,m.id+' has a perimeter leak');
   }
  }
 }
});
test('Entry passage remains navigable, gate destruction opens new route in normal and reversed castles',()=>{
 for(const src of maps.filter(m=>m.castle))for(const flipped of [false,true]){
  const m=JSON.parse(JSON.stringify(src));
  if(flipped){
   m.zones=m.zones.map(z=>({...z,x:z.shape==='ellipse'?3200-z.x:3200-z.x-z.w}));
   m.castle.x=3200-m.castle.x-m.castle.w;
   m.entrances=m.entrances.map(e=>({...e,x:3200-e.x,side:e.side==='west'?'east':e.side==='east'?'west':e.side}));
  }
  m.defender=flipped?0:1;
  const c=m.castle,x=c.x+c.w/2,y=c.y+c.h/2,external=flipped?c.x+c.w+130:c.x-130;
  init([g(0,flipped?0:16,1,external,y),g(1,flipped?16:0,1,x,y)],m);
  assert(read('findPath(cell('+external+','+y+'),cell('+x+','+y+'),"land").reachable'),src.id+' open route flipped='+flipped);
  for(const e of m.entrances){
   assert.equal(read('solid[cell('+e.x+','+e.y+')]'),e.kind==='gate'?1:0,src.id+' '+e.kind+' '+e.side+' flipped='+flipped);
  }
  for(const e of m.entrances.filter(e=>e.kind==='gate')){
   const index=read('structures.findIndex(s=>s.type==="gate"&&Math.abs(s.x-'+e.x+')<1&&Math.abs(s.y-'+e.y+')<1)');
   assert(index>=0,src.id+' missing gate structure');
   const previous=read('navVersion');
   const attacker=read('groups.find(g=>g.team!==map.defender).start');
   read('damageStructure('+attacker+','+index+',100000)');
   assert.equal(read('solid[cell('+e.x+','+e.y+')]'),0,src.id+' unbroken gate');
   assert(read('navVersion')>previous,src.id+' unchanged navigation');
  }
 }
});
test('Every map initializes appropriate domains; 200 battalions retain individual IDs',()=>{for(const m of maps){const sea=m.battleMode==='sea'||m.battleMode==='raid',type=sea?24:0;init([g(0,type,20,450,1100),g(1,m.battleMode==='sea'?24:0,20,2800,1100)],m);assert.equal(read('N'),40);assert.equal(read('groups[0].alive'),20);}const gs=[];for(let t=0;t<2;t++)for(let a=0;a<5;a++)for(let b=0;b<20;b++)gs.push(g(t,1,500,t?2700:500,200+b*95,b,a));init(gs);assert.equal(read('N'),100000);assert.equal(read('groups.length'),200);assert.equal(frame.count,50000);assert.equal(read('new Set(gid.subarray(0,N)).size'),200);send({kind:'shape',ids:[99],formation:'wedge',angle:1});assert.equal(read('groups[99].formation'),'wedge');console.log('100k / 200 battalion initialize & visibility passed.');});
console.log(`${cases.length} tests passed.`);

