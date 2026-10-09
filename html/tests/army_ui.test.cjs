// Reuses the deterministic DOM host to exercise the actual HTML UI and Worker together.
'use strict';
const fs=require('node:fs'),path=require('node:path');
let host=fs.readFileSync(path.join(__dirname,'setup_ui.test.cjs'),'utf8');host=host.slice(0,host.indexOf('let passed=0;function test'));
host+=String.raw`
let passed=0;function test(name,f){f();passed++;console.log('PASS '+name);}
function change(id,value){el(id).value=String(value);el(id).onchange?.({target:el(id)});}
function fresh(mode='local') {mainApp.inspect('wizardOpen=false;deployment=true;config.intelMode="realistic";config.mode="'+mode+'";config.map=4;config.battleMode="land";config.role="attack";activeTeam=0;config.teams=[[{battalions:[{type:0,count:4},{type:1,count:4},{type:2,count:4}]},{battalions:[{type:0,count:4}]}],[{battalions:[{type:0,count:4}]}]];config.headquarters=[{scouts:2,couriers:5,guards:2,medics:2},{scouts:2,couriers:5,guards:2,medics:2}];config.reserves=[0,0];config.budgets=[1000,1000];rebuild(false);renderEditor()');}
function pickArmy(army) {const target=new Element('button');target.matches=['[data-army-select]'];target.dataset.armySelect=String(army);el('armyList').onclick({target});}
test('Five army badges have unique heraldry, team colors, and a separate HQ crown',()=>{
 const blue=new Set(),red=new Set();for(let a=0;a<5;a++){const b=windowStub.BattleField.getArmyBadgeSVG(a,0),r=windowStub.BattleField.getArmyBadgeSVG(a,1);assert(b.includes('data-army-emblem="'+a+'"'));assert(b.includes('#2e5e86'));assert(r.includes('#81394a'));blue.add(b.match(/<g[\s\S]*<\/g>/)[0]);red.add(r.match(/<g[\s\S]*<\/g>/)[0]);}assert.equal(blue.size,5);assert.equal(red.size,5);assert(windowStub.BattleField.getArmyBadgeSVG(-2).includes('تاج مقر'));assert.equal(windowStub.BattleField.getArmyBadgeSVG(-1),'');
});
test('The build screen and battalion list show the correct army badge',()=>{
 fresh();assert(el('armyEditor').innerHTML.includes('data-army-emblem="0"'));assert(el('armyEditor').innerHTML.includes('data-army-emblem="1"'));assert(el('hqArmyHeading').innerHTML.includes('data-army-emblem="-2"'));mainApp.inspect('updateGroupList()');assert(el('groupList').innerHTML.includes('data-army-emblem="0"'));assert(el('groupList').innerHTML.includes('data-army-emblem="1"'));assert(el('groupList').innerHTML.includes('data-army-emblem="-2"'));
});
test('Choosing an army from the orders panel selects all its field battalions and excludes HQ and the other army',()=>{
 fresh();pickArmy(0);assert.equal(stats().selectedArmy,0);assert.equal(stats().selected.length,3);assert(stats().selected.every(id=>stats().groups.find(g=>g.index===id).army===0));assert(el('selectionInfo').innerHTML.includes('یک نامه‌بر'));assert(el('armyCommandScope').textContent.includes('یک نامه‌بر'));assert.equal(mainApp.inspect('tool'),'select');
});
test('Clicking the friendly army badge on the map selects that whole army',()=>{
 fresh('bot');const m=mainApp.inspect('armyMarkers().find(m=>m.army===1)');el('overlay').emit('pointerdown',{clientX:m.x,clientY:m.y,pointerId:19,button:0,shiftKey:false});el('overlay').emit('pointerup',{clientX:m.x,clientY:m.y,pointerId:19,button:0,shiftKey:false});assert.equal(stats().selectedArmy,1);assert.equal(stats().selected.length,1);assert(mainApp.inspect('armyMarkers().every(m=>m.army>=0&&m.army<5)'));assert(stats().groups.every(g=>g.team===0));
});
test('An army move uses one courier, and choosing a battalion returns to ordinary battalion commands',()=>{
 fresh();mainApp.inspect('startBattle()');pickArmy(0);mainApp.inspect('command([{x:1500,y:1000}],"move",false)');assert.equal(workers[0].app.inspect('dispatches.length'),1);assert.equal(workers[0].app.inspect('dispatches[0].packets.length'),3);assert.equal(stats().headquarters.couriers,4);mainApp.inspect('updateLogistics()');assert(el('dispatchList').innerHTML.includes('فرمان لشکر'));
 const b=new Element('button');b.matches=['[data-group]'];b.dataset.group='0';el('groupList').onclick({target:b,shiftKey:false});assert.equal(stats().selectedArmy,null);assert.deepEqual(stats().selected,[0]);mainApp.inspect('command([{x:1400,y:1200}],"move",false)');assert.equal(workers[0].app.inspect('dispatches.length'),2);assert.equal(workers[0].app.inspect('dispatches[1].packets'),undefined);
});
test('Army stop, ready formations and pincer use one courier per deliberate command',()=>{
 for(const action of ['stopOrder','pincerOrder','chargeOrder']){fresh();mainApp.inspect('startBattle()');pickArmy(0);click(action);assert.equal(workers[0].app.inspect('dispatches.length'),1);assert.equal(workers[0].app.inspect('dispatches[0].packets.length'),3);assert.equal(workers[0].app.inspect('dispatches[0].army'),0);assert.equal(workers[0].app.inspect('groups[3].order'),'hold');}
 fresh();mainApp.inspect('startBattle()');pickArmy(0);change('formationSelect','column');assert.equal(workers[0].app.inspect('dispatches.length'),1);assert.equal(workers[0].app.inspect('dispatches[0].packets[0].payload.formation'),'column');
});
test('Badges survive layout export/import by army identity; rebuild and team switching clear army command scope',()=>{
 fresh();pickArmy(0);const data=mainApp.validateLayout(structuredClone(mainApp.layoutData()));mainApp.inspect('config='+JSON.stringify(data.config)+';rebuild(false,'+JSON.stringify(data.groups)+');renderEditor()');assert.equal(stats().selectedArmy,null);assert(el('armyEditor').innerHTML.includes('data-army-emblem="1"'));pickArmy(0);click('redTeam');assert.equal(stats().selectedArmy,null);assert.equal(stats().viewTeam,1);pickArmy(0);assert(stats().selected.every(id=>stats().groups.find(g=>g.index===id).team===1));click('allSelect');assert.equal(stats().selectedArmy,null);
});
console.log(passed+' army UI tests passed');
`;
new Function('require','__dirname',host)(require,__dirname);

