// Exercises the actual authoritative simulation: one physical courier visits an entire army.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../strategic_battle.html'),'utf8');const code=html.match(/<script id="sim-worker"[^>]*>([\s\S]*?)<\/script>/)[1];
let frame;const app=new Function('performance','setInterval','postMessage','let onmessage;'+code+';return {send:d=>onmessage({data:d}),read:s=>eval(s),step:n=>{for(let i=0;i<n&&!paused&&(phase==="setup"||running);i++)sim(.04);emit(true)}}')(performance,()=>0,d=>frame=d);
const read=s=>app.read(s),send=d=>app.send(d),step=n=>app.step(n),g=(t,army,b,type=0,total=3)=>({key:`${t}-${army}-${b}`,team:t,army,battalion:b,type,total,x:t?2800:850+100*b,y:650+200*b,angle:0,width:50,formation:'line',stance:'guard',order:'hold',queue:[]});
function init(couriers=1,extra={}){send({kind:'init',serial:1,map:{zones:[]},groups:[g(0,0,0),g(0,0,1),g(0,0,2),g(0,1,0),g(1,0,0)],mode:'local',seed:237,difficulty:'normal',speed:1,viewTeam:0,headquarters:[{scouts:2,couriers,guards:2,medics:2},{scouts:2,couriers:2,guards:2,medics:2}],reserves:[5,0],...extra});}
function until(f,n=10000){for(let i=0;i<n&&!f();i++)step(1);assert(f(),'timed out');}
const order=(army=0)=>send({kind:'armyOrder',army,commandKind:'order',points:[{x:1400,y:1100}],order:'move'});
let passed=0;function test(name,f){f();passed++;console.log('PASS '+name);}
test('Three battalions receive one physical courier, only after successive visits, with relative deployment preserved',()=>{
 init();send({kind:'start'});order();assert.equal(read('dispatches.length'),1);assert.equal(frame.headquarters.couriers,0);assert.equal(read('dispatches[0].packets.length'),3);assert.equal(read('groups[0].queue.length'),0);assert.equal(read('groups[1].queue.length'),0);step(20);assert.equal(read('dispatches[0].deliveredTargets.length'),0);
 until(()=>read('dispatches[0].deliveredTargets.length===1'));assert(read('groups[0].queue.length')>0);assert.equal(read('groups[1].queue.length'),0);assert.equal(read('groups[0].queue[0].x'),1300);assert.equal(read('groups[0].queue[0].y'),900);
 until(()=>read('dispatches[0].stage==="delivered"'));assert.equal(read('dispatches[0].deliveredTargets.length'),3);assert.equal(read('groups[3].queue.length'),0);assert.equal(read('N'),read('initialManpower.reduce((a,b)=>a+b,0)'));until(()=>frame.headquarters.couriers===1);assert.equal(frame.dead,0);
});
test('Killing the courier before the first visit loses all orders and never restores the HQ loan',()=>{
 init();send({kind:'start'});order();read('hp[dispatches[0].courier]=0;groups[gid[dispatches[0].courier]].alive=0');step(100);assert.equal(frame.dispatches[0].stage,'failed');assert.equal(frame.dispatches[0].deliveredCount,0);assert.equal(frame.headquarters.couriers,0);assert.equal(read('groups.slice(0,3).every(g=>g.queue.length===0)'),true);assert.equal(frame.dead,1);
});
test('Death after the first visit retains that delivered order and loses the remaining army packet',()=>{
 init();send({kind:'start'});order();until(()=>read('dispatches[0].deliveredTargets.length===1'));read('hp[dispatches[0].courier]=0;groups[gid[dispatches[0].courier]].alive=0');step(50);assert.equal(read('groups[0].order'),'move');assert.equal(read('groups[1].order'),'hold');assert.equal(read('groups[2].order'),'hold');assert.equal(frame.dispatches[0].stage,'failed');assert.equal(frame.dispatches[0].deliveredCount,1);
});
test('A battalion destroyed in transit is skipped; the surviving battalion still receives the same courier',()=>{
 init();send({kind:'start'});order();read('for(let i=groups[1].start;i<groups[1].end;i++)hp[i]=0;groups[1].alive=0');until(()=>read('dispatches[0].stage==="delivered"'));assert.equal(read('dispatches[0].deliveredTargets.join(",")'),'0,2');assert.equal(read('groups[2].order'),'move');until(()=>frame.headquarters.couriers===1);
});
test('Army packets survive array repacking while the courier is in transit',()=>{
 init();send({kind:'start'});order();const before=frame.friendlyAlive;read('withdrawGroup(groups[3],1,true);prepareMembers();repack()');until(()=>read('dispatches[0].stage==="delivered"'));assert.equal(read('dispatches[0].deliveredTargets.length'),3);until(()=>frame.headquarters.couriers===1);assert.equal(frame.friendlyAlive,before);
});
test('No free HQ courier means no invented carrier and no delivered battalion orders',()=>{
 init(0);send({kind:'start'});order();assert.equal(read('dispatches.length'),0);assert(read('groups.slice(0,3).every(g=>g.order==="hold")'));assert(frame.events.some(e=>e.text.includes('نامه‌بر')));
});
test('Each side commands only its own same-numbered army and HQ guard/support pools are excluded',()=>{
 init();send({kind:'view',team:1});send({kind:'start'});order();assert.equal(read('dispatches[0].team'),1);assert.equal(read('dispatches[0].packets.map(p=>p.target).join(",")'),'4');assert(read('groups.slice(0,4).every(g=>g.order==="hold")'));until(()=>read('dispatches[0].stage==="delivered"'));assert.equal(read('groups[4].order'),'move');
});
test('Hospital, returning reserve, and reinforcement columns do not abandon their logistics tasks for army orders',()=>{
 init();read('groups[1].hospital=true;groups[2].joinTarget=0');send({kind:'start'});order();assert.equal(read('dispatches[0].packets.length'),1);assert.equal(read('dispatches[0].packets[0].target'),0);
});
test('During deployment, whole-army placement orders are immediate and borrow no courier',()=>{
 init(1,{wizard:true});order();assert(read('groups.slice(0,3).every(g=>g.order==="move"&&g.queue.length===1)'));assert.equal(read('dispatches.length'),0);assert.equal(frame.headquarters.couriers,1);step(100);assert.equal(frame.worldTime,0);
});
test('Whole-army formation, stance and stop use one dispatch each and execute only at delivery',()=>{
 for(const command of [{commandKind:'shape',formation:'column',stance:'guard'},{commandKind:'stop'}]){init();read('assignOrder([0,1,2],[{x:1000,y:900}],"move")');send({kind:'start'});send({kind:'armyOrder',army:0,...command});assert.equal(read('dispatches.length'),1);if(command.commandKind==='shape')assert.equal(read('groups[0].formation'),'line');until(()=>read('dispatches[0].stage==="delivered"'));if(command.commandKind==='shape'){assert(read('groups.slice(0,3).every(g=>g.formation==="column"&&g.stance==="guard")'));}else assert(read('groups.slice(0,3).every(g=>g.order==="hold"&&g.queue.length===0)'));}
});
test('Malformed messages, unknown army, friendly attack target and hidden enemy receive no courier',()=>{
 init();send({kind:'start'});for(const d of [{army:-1,commandKind:'stop'},{army:5,commandKind:'stop'},{army:0,commandKind:'refit',type:4},{army:0,commandKind:'order',points:[{x:NaN,y:2}]},{army:0,commandKind:'attackTarget',target:0,x:850,y:650},{army:0,commandKind:'attackTarget',target:4,x:2800,y:650}])send({kind:'armyOrder',...d});assert.equal(read('dispatches.length'),0);assert.equal(frame.headquarters.couriers,1);
});
test('A disclosed old contact can be attacked, without copying the hidden enemy current position',()=>{
 init();read('reports[0].set(groups[4].key,{key:groups[4].key,x:1800,y:1500,observedAt:0});groups[4].x=3100');send({kind:'start'});send({kind:'armyOrder',army:0,commandKind:'attackTarget',target:4,x:2800,y:650});assert.equal(read('dispatches.length'),1);until(()=>read('dispatches[0].deliveredTargets.length===1'));assert.equal(read('groups[0].queue[0].x'),1800);assert.equal(read('groups[0].queue[0].y'),1500);
});
test('A pincer army packet carries per-battalion routes while using exactly one courier',()=>{
 init();send({kind:'start'});send({kind:'armyOrder',army:0,commandKind:'order',points:[{x:1800,y:1100}],orders:[{id:0,points:[{x:1500,y:500},{x:1800,y:1100}]},{id:1,points:[{x:1500,y:1700},{x:1800,y:1100}]},{id:2,points:[{x:1800,y:1100}]}],order:'attack'});assert.equal(read('dispatches.length'),1);assert.equal(read('dispatches[0].packets[0].payload.points.length'),2);assert.equal(read('dispatches[0].packets[1].payload.points[0].y'),1700);assert.equal(read('dispatches[0].packets[2].payload.points.length'),1);
});
console.log(passed+' army command tests passed');
