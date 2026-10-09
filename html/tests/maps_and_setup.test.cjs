/* Offline regression tests: node html/tests/maps_and_setup.test.cjs */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const html=fs.readFileSync(path.join(__dirname,'../strategic_battle.html'),'utf8');
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
assert.equal(scripts.length,2);
scripts.forEach(js=>new Function(js));
const workerCode=scripts[0],ui=scripts[1];
const exposed=new Function('const W=3200,H=2200;'+ui.slice(ui.indexOf('const ellipse='),ui.indexOf('let wizardOpen='))+'return {MAPS,mapDimensions,ellipse};')();
const mappers=ui.slice(ui.indexOf('function currentMap(){'),ui.indexOf('\nfunction availableTypes(',ui.indexOf('function currentMap(){')));
const current=new Function('config','mapDimensions','ellipse','MAPS',mappers+'return currentMap();');
let frame;
const worker=new Function('performance','setInterval','postMessage','let onmessage;\n'+workerCode+'\nreturn {send(d){onmessage({data:d})},read(s){return eval(s)}};')(performance,()=>0,d=>{frame=d;});
const g=(team,type,x,y)=>({key:team+'-0-0',team,type,total:1,x,y,army:0,battalion:0,angle:0,width:60,formation:'line',stance:'aggressive',order:'hold',queue:[]});
let passed=0;
function test(name,callback){callback();passed++;console.log('PASS '+name);}
test('All 17 battlefields have genuine different world and collision-grid sizes',()=>{
 const sizes=new Set();
 for(let i=0;i<exposed.MAPS.length;i++){
  const original=exposed.MAPS[i],battleMode=original.battleMode||'land';
  const map=current({map:i,battleMode,role:'attack'},exposed.mapDimensions,exposed.ellipse,exposed.MAPS);
  sizes.add(map.width+'x'+map.height);
  assert(map.width>=2400&&map.width<=6300,map.id);
  assert(map.height>=1650&&map.height<=4300,map.id);
  assert(map.zones.every(z=>z.x>=0&&z.x<=map.width&&z.y>=0&&z.y<=map.height),map.id+' zone bounds');
  assert(map.bases.every(b=>b.x>=0&&b.x<=map.width&&b.y>=0&&b.y<=map.height),map.id+' bases');
  const naval=battleMode==='sea',attackerType=naval?24:battleMode==='raid'?36:0,defenderType=naval?24:0;
  worker.send({kind:'init',serial:i+1,map,groups:[g(0,attackerType,map.bases[0].x,map.bases[0].y),g(1,defenderType,map.bases[1].x,map.bases[1].y)],mode:'local',intelMode:'open',seed:731,bot:'balanced',difficulty:'normal',speed:1,viewTeam:0});
  assert.equal(worker.read('W'),map.width);
  assert.equal(worker.read('H'),map.height);
  assert.equal(worker.read('GC'),Math.ceil(map.width/32)*Math.ceil(map.height/32));
  assert(worker.read('groups.every(v=>pass(cell(v.x,v.y),domain(v.type)))'),map.id+' invalid deployment');
  if(map.castle)assert(worker.read('structures.some(s=>s.type==="gate")'),map.id+' missing destructible door');
 }
 assert.equal(exposed.MAPS.length,17);assert(sizes.size>=12);
});
test('Fortifications remain valid after castle map mirroring',()=>{
 for(let i=0;i<exposed.MAPS.length;i++){
  const original=exposed.MAPS[i];if(!original.castle)continue;
  const mode=original.battleMode;
  const a=current({map:i,battleMode:mode,role:'attack'},exposed.mapDimensions,exposed.ellipse,exposed.MAPS);
  const b=current({map:i,battleMode:mode,role:'defend'},exposed.mapDimensions,exposed.ellipse,exposed.MAPS);
  assert.equal(b.castle.x,b.width-a.castle.x-a.castle.w,original.id);
  assert.equal(a.entrances.length,b.entrances.length,original.id);
  assert(a.entrances.length>=1&&a.entrances.length<=4,original.id);
 }
});
test('Team names use saved config, escape markup and support legacy default names',()=>{
 const code=ui.slice(ui.indexOf('function normalizeTeamNames('),ui.indexOf('function syncTeamNames('));
 const names=new Function('config',code+'return [teamName(0),teamName(1),teamNameHTML(0)];');
 assert.deepEqual(names({teamNames:['سپاه پارس','لشکر غرب']}).slice(0,2),['سپاه پارس','لشکر غرب']);
 assert.deepEqual(names({teamNames:[]}).slice(0,2),['ارتش آبی','ارتش قرمز']);
 assert.equal(names({teamNames:['<a&','رقیب']})[2],'&lt;a&amp;');
 assert(html.includes('id="setupOwnName"')&&html.includes('id="setupEnemyName"'));
 assert(html.includes('ctx.fillText(teamName(b.team),p.x,p.y+r+16)'));
 assert(!html.includes('>تیم آبی <span class="small">۱</span>'));
});
test('Deployment tab hides budget, blocks other tabs and cannot be reopened during battle',()=>{
 const tab=ui.slice(ui.indexOf('function setTab(name){'),ui.indexOf('function updateSelection(',ui.indexOf('function setTab(name){')));
 const nodes=new Map(),el=selector=>{
  if(!nodes.has(selector))nodes.set(selector,{classList:{values:{},remove(){},toggle(key,value){this.values[key]=value;}}});
  return nodes.get(selector);
 };
 const buttons=['army','layout','map','intel'].map(tab=>({dataset:{tab},classList:{toggle(){}}}));
 const run=new Function('$','$$',"let phase='setup',deployment=true,activeSidebarTab='army';const placementOnly=()=>phase==='setup'&&(deployment||activeSidebarTab==='layout');let tool='';function closeCommandPanel(){}function setTool(x){tool=x;}\n"+tab+"\nsetTab('layout');const first=[activeSidebarTab,$('#sidebarBudget').classList.values.hidden,tool];setTab('orders');const refused=activeSidebarTab;deployment=false;phase='battle';setTab('layout');return {first,refused,last:activeSidebarTab};");
 const result=run(el,()=>buttons);
 assert.deepEqual(result,{first:['layout',true,'select'],refused:'layout',last:'layout'});
 assert(html.includes('if(placementOnly())return;const supports='));
 assert(html.includes('if(phase===\'ended\'||placementOnly())return;'));
});
console.log(passed+' setup/map tests passed.');

