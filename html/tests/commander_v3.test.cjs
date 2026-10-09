'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');const html=fs.readFileSync(path.join(__dirname,'../strategic_battle.html'),'utf8');const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);for(const s of scripts)new Function(s);let frame;const host=new Function('performance','setInterval','postMessage','let onmessage;\n'+scripts[0]+'\nreturn {send(d){onmessage({data:d})},step(n){for(let i=0;i<n&&!paused&&(running||phase==="setup");i++)sim(.04);emit(true)},read(s){return eval(s)}}')(performance,()=>0,f=>frame=f);const read=s=>host.read(s),send=d=>host.send(d),step=n=>host.step(n);const g=(team,type,total,x,y,b=0)=>({key:`${team}-0-${b}`,team,type,total,x,y,army:0,battalion:b,angle:team?Math.PI:0,width:100,formation:'line',stance:'aggressive',order:'hold',queue:[]});function init(gs,extra={}){send({kind:'init',serial:1,map:{zones:[]},groups:gs,mode:'local',seed:237,bot:'balanced',difficulty:'normal',speed:1,viewTeam:0,reserves:[0,0],...extra});}function until(fn,n=5000){for(let i=0;i<n&&!fn();i++)step(1);assert(fn(),'timed out');}let passed=0;function test(n,f){f();console.log('PASS '+n);passed++;}
test('Wizard freezes time until deliberate start; 0.25x is accepted',()=>{init([g(0,0,20,500,1100),g(1,0,20,2600,1100)],{wizard:true});step(100);assert.equal(frame.worldTime,0);send({kind:'settings',speed:.25});assert.equal(read('speed'),.25);send({kind:'start'});step(25);assert(frame.elapsed>.9);});
test('50k estimate yields only 47k to 59k, varying by seed; frame capacity leaks no hidden total',()=>{const sizes=new Set();for(const seed of [123,54632,789443,9876342,53276532]){init([g(0,0,5,400,1100)],{mode:'bot',enemyEstimate:50000,seed});let n=read('groups.filter(g=>g.team===1&&!g.agent&&g.type!==39).reduce((s,g)=>s+g.total*UNIT_TYPES[g.type].cost,0)+map.botReserve');assert(n>=47000&&n<=59000,n);sizes.add(n);assert.equal(frame.buffer.byteLength,frame.count*24);assert.equal(frame.count,5);}assert(sizes.size>3);});
test('Remote combat troops and spy vision do not reveal enemy to commander',()=>{init([g(0,0,5,1300,1100),g(0,32,3,1280,1100,1),g(1,0,30,1470,1100)]);assert(read('seenGroup(0,groups[2])'));assert(!frame.groups.some(g=>g.team===1));assert.equal(frame.reports.length,0);step(30);assert.equal(frame.reports.length,0);assert(read('groups[1].scoutReturning'));until(()=>frame.reports.length>0);assert(frame.reports.every(r=>r.source==='spy'));assert(!frame.groups.some(g=>g.team===1));const old=frame.reports[0].x;read('groups[2].x+=400;for(let i=groups[2].start;i<groups[2].end;i++)x[i]+=400');step(50);assert.equal(frame.reports[0].x,old);});
test('Stationary observer gives live contacts; moving observer stops transmitting immediately',()=>{init([g(0,37,1,1300,1100),g(1,0,10,1540,1100)]);step(80);assert(frame.groups.some(g=>g.team===1));assert(frame.reports.some(r=>r.live));read('assignOrder([0],[{x:1200,y:1600}],"move")');step(1);assert(!frame.groups.some(g=>g.team===1));assert(frame.reports.every(r=>!r.live));assert.equal(read('SPEED[37]'),12);});
test('Move command is carried physically and not applied before courier arrives',()=>{init([g(0,0,20,900,1100),g(1,0,10,2800,1100)]);send({kind:'start'});send({kind:'order',ids:[0],points:[{x:1400,y:1100}],order:'move'});assert.equal(read('groups[0].queue.length'),0);assert.equal(frame.dispatches[0].stage,'outbound');assert.equal(read('x[dispatches[0].courier]'),340);step(50);assert.equal(read('groups[0].queue.length'),0);until(()=>frame.dispatches[0].stage==='delivered');assert(read('groups[0].queue.length')>0);});
test('Killed command courier loses order, does not execute after timeout',()=>{init([g(0,0,20,900,1100),g(1,0,10,2800,1100)]);send({kind:'start'});send({kind:'order',ids:[0],points:[{x:1400,y:1100}],order:'move'});read('hp[dispatches[0].courier]=0;groups[gid[dispatches[0].courier]].alive=0');step(250);assert.equal(frame.dispatches[0].stage,'failed');assert.equal(read('groups[0].queue.length'),0);});
test('Wounded remain alive, retreat after delivery, medics heal them; deaths remain distinct',()=>{init([g(0,0,20,850,1100),g(0,38,8,340,1100,1),g(1,0,20,2800,1100)]);read('for(let i=0;i<4;i++)hp[i]=30;hp[4]=0;groups[0].alive--');send({kind:'start'});step(1);assert.equal(frame.wounded,4);assert.equal(frame.dead,1);send({kind:'withdraw',ids:[0],count:1000,woundedOnly:true});until(()=>read('groups.some(g=>g.hospital)'));assert.equal(read('groups.find(g=>g.hospital).alive'),4);until(()=>frame.wounded===0,12000);assert.equal(frame.dead,1);});
test('Reinforcements consume existing reserve and march from HQ without restoring casualties',()=>{init([g(0,0,20,900,1100),g(1,0,20,2800,1100)],{reserves:[30,0]});send({kind:'start'});const n=read('N');send({kind:'reinforce',ids:[0],count:12});assert.equal(read('groups[0].alive'),20);until(()=>read('groups.some(g=>g.joinTarget===0)'));assert.equal(frame.reserve,18);assert.equal(read('N'),n);until(()=>read('groups[0].alive===32'));assert.equal(frame.friendlyAlive,50);assert.equal(frame.dead,0);assert.equal(read('N'),n);});
test('Decreasing count sends soldiers physically back to reserve',()=>{init([g(0,0,20,850,1100),g(1,0,20,2800,1100)]);send({kind:'start'});send({kind:'withdraw',ids:[0],count:8,woundedOnly:false});until(()=>read('groups.some(g=>g.returnReserve)'));assert.equal(frame.reserve,0);until(()=>frame.reserve===8);assert.equal(read('groups[0].alive'),12);assert.equal(frame.friendlyAlive,20);});
test('Cavalry dismount only after courier, return to HQ and refit delay; health ratio retained',()=>{init([g(0,1,10,700,1100),g(1,0,20,2800,1100)]);read('hp[0]=HEALTH[1]*.7');send({kind:'start'});send({kind:'refit',ids:[0],type:0});assert.equal(read('groups[0].type'),1);until(()=>read('groups[0].refitAt>0'));assert.equal(read('groups[0].type'),1);const at=read('worldTime');until(()=>read('groups[0].type===0'));assert(read('worldTime')-at>=7.9);assert(Math.abs(read('hp[0]/HEALTH[0]')-.7)<.001);});
test('Freehand shape packs actual soldiers; small and crossing shapes rejected',()=>{init([g(0,0,25,650,1100),g(1,0,20,2800,1100)]);send({kind:'polygon',ids:[0],points:[{x:500,y:800},{x:501,y:800},{x:501,y:801}]});assert(frame.events.some(e=>e.text.includes('کوچک')));assert.notEqual(read('groups[0].formation'),'custom');send({kind:'polygon',ids:[0],points:[{x:500,y:800},{x:700,y:800},{x:680,y:1020},{x:540,y:990}]});assert.equal(read('groups[0].formation'),'custom');assert.equal(read('groups[0].customSlots.length'),25);assert(read('Array.from(x.subarray(0,25)).every(v=>v>=500&&v<=700)'));});

test('All 43 costs belong only to infantry 1/2, mounted 1.5/2, or machines 15..90 in 15 steps',()=>{
 const data=read('UNIT_TYPES.map(u=>({cost:u.cost,costClass:u.costClass}))');
 assert.equal(data.length,43);
 for(const x of data){
  assert(Number.isFinite(x.cost) && x.cost>=1);
  if(x.costClass==='infantry')assert([1,2].includes(x.cost));
  else if(x.costClass==='mounted')assert([1.5,2].includes(x.cost));
  else if(x.costClass==='machine')assert([15,30,45,60,75,90].includes(x.cost));
  else assert.fail('Unit class missing: '+x.costClass);
 }
 assert.equal(data[0].cost,1); // regular swords
 assert.equal(data[1].cost,2); // mounted lancer
 assert.equal(data[12].cost,1.5); // mounted archer
 assert.equal(data[10].cost,2); // axeman
 assert.equal(data[34].cost,2); // shield guard
 assert.equal(data[35].cost,2); // armored cavalry
 assert.equal(data[27].cost,90); // strongest fire ship
 assert(data.some(x=>x.cost===15)&&data.some(x=>x.cost===90));
});
test('Higher DPS raises price tiers, but every amount remains in its legal discrete category',()=>{
 const k=read('UNIT_TYPES[4]');
 const original=read('deriveUnitCost(UNIT_TYPES[4])');
 const harder=read('deriveUnitCost({...UNIT_TYPES[4],damage:UNIT_TYPES[4].damage*2})');
 const quicker=read('deriveUnitCost({...UNIT_TYPES[4],period:UNIT_TYPES[4].period/2})');
 const slower=read('deriveUnitCost({...UNIT_TYPES[4],period:UNIT_TYPES[4].period*2})');
 assert(harder>original&&quicker>original&&slower<original);
 for(const n of [original,harder,quicker,slower])assert([15,30,45,60,75,90].includes(n));
 assert.equal(read('deriveUnitCost({...UNIT_TYPES[12],period:.5})'),2);
 assert.equal(read('deriveUnitCost({...UNIT_TYPES[0],damage:40})'),2);
 assert.equal(read('deriveUnitCost({...UNIT_TYPES[0],damage:0})'),1);
 assert.equal(read('deriveUnitCost({...UNIT_TYPES[27],damage:10000})'),90);
});
test('Reinforcing siege engines charges their calculated DPS-derived cost, not one',()=>{
 init([g(0,4,1,900,1100),g(1,0,2,2800,1100)],{reserves:[100,0]});
 send({kind:'start'});send({kind:'reinforce',ids:[0],count:100});
 until(()=>read('groups.some(g=>g.joinTarget===0)'));
 const perUnit=read('UNIT_TYPES[4].cost');
 assert.equal(read('groups.find(g=>g.joinTarget===0).alive'),Math.floor(100/perUnit));
 assert.equal(frame.reserve,100-Math.floor(100/perUnit)*perUnit);
});
test('Refitting a battalion cannot bypass the equipment budget',()=>{
 init([g(0,0,10,700,1100),g(1,0,2,2800,1100)],{reserves:[5,0]});
 send({kind:'start'});send({kind:'refit',ids:[0],type:4});
 until(()=>frame.events.some(e=>e.text.includes('کافی نیست')),6000);
 assert.equal(read('groups[0].type'),0);
 assert.equal(frame.reserve,5);
});

const linePoints=ps=>ps.map(([x,y])=>({x,y}));
const positions=()=>read('Array.from({length:groups[0].alive},(_,i)=>[x[i],y[i]])');
function nearStroke(p,ps){let min=Infinity;for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i],dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p[0]-a.x)*dx+(p[1]-a.y)*dy)/l)):0;min=Math.min(min,Math.hypot(p[0]-a.x-t*dx,p[1]-a.y-t*dy));}return min;}
test('Open U, Z and V put every soldier on the drawn line without closing or filling it',()=>{
 for(const points of [linePoints([[600,600],[600,1200],[1200,1200],[1200,600]]),linePoints([[600,600],[1200,600],[600,1200],[1200,1200]]),linePoints([[600,600],[900,1200],[1200,600]])]){
  init([g(0,0,100,900,900),g(1,0,20,2800,1100)]);send({kind:'stroke',ids:[0],points});
  assert.equal(read('groups[0].formation'),'custom');assert.equal(read('groups[0].strokeClosed'),false);
  assert.equal(read('groups[0].customSlots.length'),100);assert.equal(frame.count,100);
  assert(positions().every(p=>nearStroke(p,points)<.01));
  if(points[0].x===points[1].x)assert(!positions().some(p=>Math.hypot(p[0]-900,p[1]-600)<70));
 }
});
test('Dense freehand U has 10,000 independent, spaced slots and keeps its empty opening',()=>{
 init([g(0,0,10000,1600,1100),g(1,0,20,2900,1900)]);
 send({kind:'stroke',ids:[0],points:linePoints([[700,500],[700,1550],[2300,1550],[2300,500]])});
 assert.equal(read('groups[0].customSlots.length'),10000);assert.equal(frame.count,10000);
 const ps=positions();assert(!ps.some(p=>p[0]>1100&&p[0]<1900&&p[1]<1200));
 const buckets=new Map(),sp=read('UNIT_TYPES[0].spacing')*.9;
 for(const p of ps){const bx=Math.floor(p[0]/sp),by=Math.floor(p[1]/sp);for(let a=bx-1;a<=bx+1;a++)for(let b=by-1;b<=by+1;b++)for(const q of buckets.get(a+':'+b)||[])assert(Math.hypot(p[0]-q[0],p[1]-q[1])>sp-.002);const k=bx+':'+by;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(p);}
});
test('Small and invalid freehand strokes leave the old formation intact and request redraw',()=>{
 init([g(0,0,100,900,1100),g(1,0,20,2800,1100)]);
 for(const points of [linePoints([[900,900],[902,902]]),[{x:NaN,y:900},{x:1200,y:900}],linePoints([[900,900],[4000,900]])]){send({kind:'stroke',ids:[0],points});assert(frame.events.some(e=>e.text.includes('دوباره')));assert.equal(read('groups[0].formation'),'line');}
});
test('Crossing strokes are allowed and do not stack troops at the intersection',()=>{
 init([g(0,0,400,1000,1000),g(1,0,20,2800,1100)]);send({kind:'stroke',ids:[0],points:linePoints([[650,650],[1250,1250],[650,1250],[1250,650]])});
 assert.equal(read('groups[0].customSlots.length'),400);assert.equal(new Set(positions().map(p=>p.join(','))).size,400);
});
test('Ready ring, triangle, V and U are actual troop paths; width and direction preserve the preset',()=>{
 for(const formation of ['ring','triangle','v','u']){
  init([g(0,0,300,1500,1100),g(1,0,20,2800,1100)]);send({kind:'shape',ids:[0],formation});
  assert.equal(read('groups[0].formation'),formation);assert.equal(read('groups[0].customSlots.length'),300);assert(frame.groups[0].customStroke.length>=3);
  assert(!positions().some(p=>Math.hypot(p[0]-1500,p[1]-1100)<30));
  send({kind:'shape',ids:[0],width:400});assert.equal(read('groups[0].formation'),formation);
  send({kind:'shape',ids:[0],angle:Math.PI/2});assert.equal(read('groups[0].formation'),formation);assert.equal(read('groups[0].angle'),Math.PI/2);
  assert(positions().every(p=>Number.isFinite(p[0])&&Number.isFinite(p[1])));
 }
});
test('Line formation commands wait for a physical courier and soldiers then march without teleporting',()=>{
 init([g(0,0,30,900,1100),g(1,0,20,2800,1100)]);read('groups[0].stance="hold"');send({kind:'start'});
 const before=positions(),points=linePoints([[1050,700],[1050,1250],[1350,1250],[1350,700]]);
 send({kind:'stroke',ids:[0],points});assert.equal(read('groups[0].formation'),'line');assert.equal(frame.dispatches[0].kind,'stroke');step(20);assert.equal(read('groups[0].formation'),'line');
 until(()=>read('groups[0].formation==="custom"'));assert.equal(read('groups[0].x'),900);assert(Math.hypot(positions()[0][0]-before[0][0],positions()[0][1]-before[0][1])<3);
 until(()=>read('groups[0].queue.length===0'));step(500);assert(positions().every(p=>nearStroke(p,points)<15));
});
test('Killed formation courier cannot change a battalion; opposing battalion cannot be reshaped',()=>{
 init([g(0,0,30,900,1100),g(1,0,20,2800,1100)]);send({kind:'start'});send({kind:'stroke',ids:[0],points:linePoints([[700,700],[1100,1200],[1400,700]])});read('hp[dispatches[0].courier]=0');step(300);assert.equal(read('groups[0].formation'),'line');assert.equal(frame.dispatches[0].stage,'failed');
 send({kind:'shape',ids:[1],formation:'u'});assert.equal(read('groups[1].formation'),'line');
});
test('Saved relative freehand path restores exact geometry, including rotated direction',()=>{
 init([g(0,0,100,900,900),g(1,0,20,2800,1100)]);send({kind:'stroke',ids:[0],points:linePoints([[600,600],[600,1200],[1200,1200],[1200,600]])});send({kind:'shape',ids:[0],angle:.6});
 const before=positions(),own=frame.groups[0];init([{...g(0,0,100,own.x,own.y),angle:own.angle,formation:own.formation,customStroke:own.customStroke,strokeClosed:own.strokeClosed},g(1,0,20,2800,1100)]);
 assert.equal(read('groups[0].formation'),'custom');positions().forEach((p,i)=>assert(Math.hypot(p[0]-before[i][0],p[1]-before[i][1])<.001));assert(read('groups[0].faceLocked'));
});
test('Stroke rejects terrain barriers while sea strokes keep ships in water',()=>{
 const gs=[g(0,0,30,500,1000),g(1,0,20,2800,1100)];init(gs);read('solid[cell(1000,1000)]=1');send({kind:'stroke',ids:[0],points:linePoints([[600,1000],[1400,1000]])});assert.equal(read('groups[0].formation'),'line');assert(frame.events.some(e=>e.text.includes('مانع')));
 init([g(0,24,30,1000,1000),g(1,24,20,2800,1100)],{map:{zones:[{shape:'rect',kind:'water',x:0,y:0,w:3200,h:2200}],battleMode:'sea'}});send({kind:'stroke',ids:[0],points:linePoints([[600,600],[1000,1200],[1400,600]])});assert.equal(read('groups[0].customSlots.length'),30);assert(read('Array.from({length:30},(_,i)=>water[cell(x[i],y[i])]).every(Boolean)'));
});

test('A U around impassable ground keeps a passable anchor and the exact drawn positions',()=>{
 init([g(0,0,100,900,900),g(1,0,20,2800,1100)]);read('solid[cell(900,900)]=1');const points=linePoints([[600,600],[600,1200],[1200,1200],[1200,600]]);send({kind:'stroke',ids:[0],points});assert.equal(read('groups[0].formation'),'custom');assert(read('pass(cell(groups[0].x,groups[0].y),domain(0))'));assert(positions().every(p=>nearStroke(p,points)<.01));
});
const support=(over={})=>({scouts:20,couriers:20,guards:40,medics:20,...over});
const withHQ=(gs,extra={})=>init(gs,{headquarters:[support(),support()],...extra});
test('Each commander has exactly three HQ battalions, including four real support types',()=>{
 withHQ([g(0,0,900,850,1100),g(1,0,900,2800,1100)]);assert.equal(frame.friendlyAlive,1000);assert.equal(frame.total,1000);assert.equal(frame.count,940);
 for(const t of [0,1]){assert.equal(read(`groups.filter(g=>g.team===${t}&&g.hqRole&&!g.agent).length`),3);assert.equal(read(`groups.filter(g=>g.team===${t}&&g.hqRole).reduce((s,g)=>s+g.alive,0)`),100);}
 assert.deepEqual(frame.headquarters,{scouts:20,couriers:20,observers:0,guards:40,medics:20,deployed:0,alive:100});assert.equal(frame.groups.filter(g=>g.hqRole==='signals')[0].dead,0);
});
test('Command couriers use the HQ allocation, and return alive with no new people or casualties',()=>{
 withHQ([g(0,0,900,850,1100),g(1,0,20,2800,1100)]);send({kind:'start'});send({kind:'stop',ids:[0]});assert.equal(frame.headquarters.couriers,19);assert.equal(frame.headquarters.deployed,1);assert.equal(frame.friendlyAlive,1000);assert.equal(frame.dead,0);assert.equal(frame.count,941);assert.equal(frame.groups.find(g=>g.hqRole==='signals').dead,0);
 until(()=>read('dispatches[0].archived'));assert.equal(frame.headquarters.couriers,20);assert.equal(frame.headquarters.deployed,0);assert.equal(frame.friendlyAlive,1000);assert.equal(frame.dead,0);assert.equal(frame.count,940);
});
test('HQ courier exhaustion refuses an order instead of generating a new carrier',()=>{
 withHQ([g(0,0,900,850,1100),g(1,0,20,2800,1100)],{headquarters:[support({couriers:1}),support()]});send({kind:'start'});send({kind:'stop',ids:[0]});const n=read('L');send({kind:'order',ids:[0],order:'move',points:[{x:1400,y:1100}]});assert.equal(frame.dispatches.length,1);assert.equal(read('L'),n);assert(frame.events.some(e=>e.text.includes('نامه‌بر آماده')));assert.equal(read('groups[0].queue.length'),0);
});
test('Killed HQ couriers consume one person, lose the order and never return to the available pool',()=>{
 withHQ([g(0,0,900,850,1100),g(1,0,20,2800,1100)]);send({kind:'start'});send({kind:'order',ids:[0],order:'move',points:[{x:1400,y:1100}]});read('hp[dispatches[0].courier]=0;groups[gid[dispatches[0].courier]].alive=0');step(100);assert.equal(frame.friendlyAlive,999);assert.equal(frame.dead,1);assert.equal(frame.headquarters.couriers,19);assert.equal(frame.headquarters.deployed,0);assert.equal(frame.groups.find(g=>g.hqRole==='signals').dead,1);assert.equal(read('groups[0].queue.length'),0);
});
test('HQ scouts are finite and return to their real battalion after recall',()=>{
 withHQ([g(0,0,900,850,1100),g(1,0,20,2800,1100)],{headquarters:[support({scouts:1}),support()]});send({kind:'scout',x:1400,y:1100,count:2});assert.equal(frame.missions.length,1);assert.equal(frame.headquarters.scouts,0);assert.equal(frame.headquarters.deployed,1);assert(frame.events.some(e=>e.text.includes('جاسوس آماده')));assert.equal(frame.dead,0);send({kind:'recall'});until(()=>read('missions[0].archived'));assert.equal(frame.headquarters.scouts,1);assert.equal(frame.headquarters.deployed,0);assert.equal(frame.dead,0);
});
test('A failed scout plus courier allocation returns the borrowed scout without inventing one',()=>{
 withHQ([g(0,0,900,850,1100),g(1,0,20,2800,1100)],{headquarters:[support({couriers:0}),support()]});send({kind:'scout',x:1400,y:1100,count:1,withCourier:true});assert.equal(frame.missions.length,0);assert.equal(frame.headquarters.scouts,20);assert.equal(frame.headquarters.deployed,0);assert.equal(frame.dead,0);
});
test('Army repacking during a dispatch preserves the carrier home slot and manpower',()=>{
 withHQ([g(0,0,900,1500,1100),g(1,0,20,2800,1100)]);send({kind:'start'});send({kind:'stop',ids:[0]});read('withdrawGroup(groups[0],2,false)');assert.equal(read('groups[gid[dispatches[0].courier]].hqOrigin>=0'),true);step(1);assert.equal(frame.dead,0);assert.equal(frame.friendlyAlive,1000);until(()=>read('dispatches[0].archived'));assert.equal(frame.headquarters.couriers,20);assert.equal(frame.headquarters.alive,100);assert.equal(frame.friendlyAlive,1000);
});
test('Zero-sized HQ retains its three fixed battalions and refuses unavailable services',()=>{
 withHQ([g(0,0,900,850,1100),g(1,0,20,2800,1100)],{headquarters:[{scouts:0,couriers:0,guards:0,medics:0},support()]});assert.equal(frame.groups.filter(g=>g.hqRole).length,3);send({kind:'start'});send({kind:'stop',ids:[0]});assert.equal(frame.dispatches.length,0);assert.equal(frame.friendlyAlive,900);
});
test('HQ medic heals real wounded soldiers and the special guard fights attackers near HQ',()=>{
 withHQ([g(0,0,5,340,1100),g(1,0,20,700,1100)]);read('hp[0]=30');send({kind:'start'});until(()=>read('hp[0]>HEALTH[0]*.8'));step(1);assert.equal(frame.wounded,0);const guard=read('groups.find(g=>g.team===0&&g.hqRole==="guard").index');read(`const enemy=groups.find(g=>g.team===1&&!g.hqRole);enemy.x=groups[${guard}].x+12;enemy.y=groups[${guard}].y;enemy.stance='hold';for(let i=enemy.start;i<enemy.end;i++){x[i]=enemy.x;y[i]=enemy.y;}`);const before=read('groups.find(g=>g.team===1&&!g.hqRole).alive');step(500);assert(read('groups.find(g=>g.team===1&&!g.hqRole).alive')<before);
});
test('Bot HQ is deducted from its estimated budget and never joins a field attack order',()=>{
 withHQ([g(0,0,900,850,1100)],{mode:'bot',enemyEstimate:50000,seed:765432});const budget=read('groups.filter(g=>g.team===1&&!g.agent&&!g.hqRole&&g.type!==39).reduce((n,g)=>n+g.total*unitCost(g.type),0)+map.botReserve+hqCount(map.botHQ)');assert(budget>=47000&&budget<=59000,budget);assert.equal(read('groups.filter(g=>g.team===1&&g.hqRole).length'),3);send({kind:'start'});step(20);assert(read('groups.filter(g=>g.team===1&&g.hqRole).every(g=>g.queue.length===0)'));assert(!frame.groups.some(g=>g.team===1));
});
test('Sea-mode HQ uses real marine guards and all support personnel remain on passable terrain',()=>{
 withHQ([g(0,24,40,500,1100),g(1,24,40,2800,1100)],{map:{zones:[{shape:'rect',kind:'water',x:0,y:0,w:3200,h:2200}],battleMode:'sea'}});assert.equal(read('groups.find(g=>g.team===0&&g.hqRole==="guard").type'),36);assert(read('groups.filter(g=>g.hqRole).every(g=>Array.from({length:g.end-g.start},(_,j)=>g.start+j).every(i=>pass(cell(x[i],y[i]),domain(typ[i]))))'));
});


test('Five levels scale bot attack damage monotonically without changing local multiplayer',()=>{
 const damage=[];
 for(const difficulty of ['training','easy','normal','hard','nightmare']){init([g(0,0,1,500,1100),g(1,0,1,520,1100)]);read(`mode='bot';difficulty='${difficulty}';seed=237;hit(1,0,20,false)`);damage.push(read('HEALTH[0]-hp[0]'));}
 assert.equal(damage.length,5);assert(damage.every((d,i)=>i===0||d>damage[i-1]));assert(damage[0]<damage[4]*.25);
 init([g(0,0,1,500,1100),g(1,0,1,520,1100)]);read("difficulty='training';seed=237;hit(1,0,20,false)");assert(read('HEALTH[0]-hp[0]')>18);
});
test('Five levels delay the first attack and respect their different decision intervals',()=>{
 for(const difficulty of ['training','easy','normal','hard','nightmare']){
  init([g(0,0,20,500,1100),g(1,0,20,2700,1100)]);read(`mode='bot';difficulty='${difficulty}';elapsed=difficultyProfile().grace-.1;bots()`);assert.equal(read('dispatches.length'),0);
  read('elapsed=difficultyProfile().grace;bots()');assert.equal(read('dispatches.length'),1);assert.equal(read('nextBot-elapsed'),read('difficultyProfile().interval'));
 }
});
test('Very easy gives the player a winnable battle against otherwise identical troops',()=>{
 init([g(0,0,40,1570,1100),g(1,0,40,1590,1100)]);read("mode='bot';difficulty='training'");send({kind:'start'});until(()=>frame.phase==='ended',6000);assert.equal(frame.winner,0);assert(read('groups[0].alive')>15);
});
test('Every difficulty preserves the declared enemy-budget estimate while varying its roster',()=>{
 for(const difficulty of ['training','easy','normal','hard','nightmare']){withHQ([g(0,0,40,500,1100)],{mode:'bot',enemyEstimate:50000,difficulty,seed:731});const spent=read('groups.filter(g=>g.team===1&&!g.hqRole&&!g.agent&&g.type!==39).reduce((n,g)=>n+g.total*unitCost(g.type),0)+map.botReserve+hqCount(map.botHQ)');assert(spent>=47000&&spent<=59000);assert.equal(frame.reports.length,0);assert(!frame.groups.some(g=>g.team===1));}
});
test('Individual vision differs across infantry, cavalry, archers and long-range siege',()=>{
 const d=read('UNIT_TYPES.map(u=>u.vision)');assert(d[1]>d[0]);assert(d[12]>d[2]);assert(d[4]>d[1]);assert(d[15]>d[4]);
 for(const [type,visible] of [[0,false],[1,true],[15,true]]){init([g(0,type,1,1200,1100),g(1,0,1,1470,1100)]);assert.equal(read('seenGroup(0,groups[1])'),visible);assert(!frame.groups.some(g=>g.team===1),'local sight must not reveal live commander intelligence');}
});
test('Couriers are fastest, then spies, cavalry and slow siege; actual travel obeys that order',()=>{
 const speeds=read('SPEED');assert(speeds[33]>speeds[32]);assert(speeds[32]>Math.max(...speeds.filter((_,i)=>![32,33].includes(i)))*1.13);assert(speeds[1]>speeds[0]);assert(speeds[0]>speeds[15]);
 withHQ([g(0,0,10,1500,1100),g(1,0,10,2800,1100)]);send({kind:'scout',x:1300,y:1100,count:1,withCourier:true});step(50);assert(read('x[missions[0].courier]>x[missions[0].scout]'));
});
test('Standby HQ staff are not rendered, targeted or disclosed even when enemy observes HQ',()=>{
 withHQ([g(0,0,10,850,1100),g(1,37,1,430,1100)]);step(100);assert.equal(frame.count,51);assert.equal(frame.friendlyAlive,110);assert.equal(new Float32Array(frame.buffer).filter((_,i)=>i%6===2).some(t=>[32,33,38].includes(t)),false);
 send({kind:'view',team:1});assert(!frame.groups.some(g=>g.team===0&&[32,33,38].includes(g.type)));assert(!frame.reports.some(r=>[32,33,38].includes(r.type)));
});
test('Five battalion orders borrow exactly five of 500 couriers until each physically returns',()=>{
 withHQ(Array.from({length:5},(_,b)=>g(0,0,10,900+b*50,1100,b)).concat(g(1,0,20,2800,1100)),{headquarters:[support({couriers:500}),support()]});send({kind:'start'});send({kind:'stop',ids:[0,1,2,3,4]});assert.equal(frame.headquarters.couriers,495);assert.equal(frame.headquarters.deployed,5);assert.equal(read('new Set(dispatches.map(d=>d.courier)).size'),5);until(()=>read('dispatches.every(d=>d.archived)'));assert.equal(frame.headquarters.couriers,500);assert.equal(frame.headquarters.deployed,0);assert.equal(frame.dead,0);
});
test('Every allocated scout is independently available; the old 16-mission cap is gone',()=>{
 withHQ([g(0,0,10,850,1100),g(1,0,10,2800,1100)],{headquarters:[support({scouts:25}),support()]});for(let j=0;j<3;j++)send({kind:'scout',x:1300,y:1100,count:8});assert.equal(read('missions.length'),24);assert.equal(frame.headquarters.scouts,1);assert.equal(read('new Set(missions.map(m=>m.scout)).size'),24);send({kind:'recall'});until(()=>read('missions.every(m=>m.archived)'));assert.equal(frame.headquarters.scouts,25);
});
test('Individual medics leave the hidden HQ pool, heal in the field and return with no new people',()=>{
 withHQ([g(0,0,5,700,1100),g(1,0,20,2800,1100)],{headquarters:[support({medics:2}),support()]});read('hp[0]=30');send({kind:'start'});const before=frame.friendlyAlive;send({kind:'medic',x:700,y:1100,count:3});assert.equal(frame.headquarters.medics,0);assert.equal(frame.headquarters.deployed,2);assert.equal(frame.friendlyAlive,before);assert.equal(frame.medics.length,2);assert.equal(read('new Set(medicalMissions.map(m=>m.agent)).size'),2);until(()=>read('hp[0]>HEALTH[0]*.8'));send({kind:'recallMedics'});assert.equal(frame.headquarters.medics,0);until(()=>read('medicalMissions.every(m=>m.archived)'));assert.equal(frame.headquarters.medics,2);assert.equal(frame.dead,0);
});
test('An individual spy reroutes only after its courier arrives and does not reveal undelivered information',()=>{
 withHQ([g(0,0,10,850,1100),g(1,0,20,2800,1100)]);send({kind:'scout',x:1450,y:1100,count:1});step(130);send({kind:'start'});const id=read('gid[missions[0].scout]');send({kind:'supportOrder',ids:[id],points:[{x:1300,y:1550}]});assert.equal(read('missions[0].target[1]'),1065);assert.equal(frame.headquarters.couriers,19);until(()=>read('missions[0].target[1]===1550'));assert.equal(frame.reports.length,0);send({kind:'supportRecall',ids:[id]});until(()=>read('missions[0].archived'));assert.equal(frame.headquarters.scouts,20);
});
test('Medic loans survive repacking; killed medics never replenish HQ stock',()=>{
 withHQ([g(0,0,20,900,1100),g(1,0,20,2800,1100)]);send({kind:'medic',x:800,y:1100,count:1});read('withdrawGroup(groups[0],2,false)');assert(read('medicalMissions[0].agent>=N'));read('hp[medicalMissions[0].agent]=0');step(1);assert.equal(frame.headquarters.medics,19);assert.equal(frame.medics[0].stage,'failed');assert.equal(frame.dead,1);send({kind:'recallMedics'});step(100);assert.equal(frame.headquarters.medics,19);
});


test('Stationed individual spy sends stale reports by a physical courier and stays in the field',()=>{
 withHQ([g(0,0,10,850,1100),g(1,0,20,1200,1100)]);read('groups[1].stance="hold"');send({kind:'scout',x:940,y:1100,count:1});const id=read('gid[missions[0].scout]');send({kind:'supportPolicy',ids:[id],policy:'station'});until(()=>read('missions[0].stage==="stationed"'));assert.equal(frame.reports.length,0);assert(frame.dispatches.some(d=>d.category==='intel'));until(()=>frame.reports.length>0);assert(frame.reports.every(r=>r.source==='courier'&&!r.live));assert.equal(read('missions[0].stage'),'stationed');assert.equal(frame.headquarters.scouts,19);send({kind:'supportPolicy',ids:[id],policy:'return'});until(()=>read('missions[0].archived'));assert.equal(frame.headquarters.scouts,20);
});

console.log(passed+' commander tests passed');




