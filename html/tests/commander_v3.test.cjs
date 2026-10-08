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

test('All 40 unit costs are derived from attack damage / interval and have an equipment floor',()=>{
 const all=read('UNIT_TYPES.map(u=>({name:u.name,damage:u.damage,period:u.period,cost:u.cost,equipmentCost:u.equipmentCost}))');
 assert.equal(all.length,40);
 assert(all.every(u=>Number.isFinite(u.cost)&&u.cost>=u.equipmentCost&&u.cost*2%1===0));
 assert.equal(all[0].cost,1);
 assert.equal(all[12].cost,1.5);
 assert(all[4].cost>=15&&all[4].cost<=25);
 assert(all[15].cost>all[4].cost);
 assert(all[25].cost>all[24].cost);
 assert(all[27].cost>all[25].cost);
});
test('Damage and attack frequency really affect calculated cost, independent of other stats',()=>{
 const catapult=read('UNIT_TYPES[4]');
 const baseline=read('deriveUnitCost(UNIT_TYPES[4])');
 assert(read('deriveUnitCost({...UNIT_TYPES[4],damage:UNIT_TYPES[4].damage*2})')>baseline);
 assert(read('deriveUnitCost({...UNIT_TYPES[4],period:UNIT_TYPES[4].period/2})')>baseline);
 assert(read('deriveUnitCost({...UNIT_TYPES[4],period:UNIT_TYPES[4].period*2})')<baseline);
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

console.log(passed+' commander tests passed');
