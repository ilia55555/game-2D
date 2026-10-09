// Executes the actual main script and Worker with a small deterministic DOM host.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const createCanvas=(width,height)=>({width,height,getContext(){const gradient={addColorStop(){}};return new Proxy({drawImage(){},createRadialGradient:()=>gradient,createLinearGradient:()=>gradient,measureText:()=>({width:20}),getImageData:(_,__,w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get(o,k){return k in o?o[k]:()=>{};}});}});
const html=fs.readFileSync(path.join(__dirname,'../strategic_battle.html'),'utf8');
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const elements=new Map(),tools=[],tabs=[],dialogs=[],closes=[];
let raf,appDocument,workers=[];
class Element{
 constructor(tag='div',id='',cls=''){this.tagName=tag.toUpperCase();this.id=id;this.style={};this.dataset={};this.listeners={};this.value='';this.disabled=false;this.checked=false;this.innerHTML='';this.textContent='';this.className=cls;this._width=300;this._height=150;}
 get classList(){const el=this;return{contains(c){return el.className.split(' ').includes(c)},add(c){if(!this.contains(c))el.className+=' '+c},remove(c){el.className=el.className.split(' ').filter(x=>x!==c).join(' ')},toggle(c,v){const yes=v===undefined?!this.contains(c):v;yes?this.add(c):this.remove(c);return yes;}};}
 addEventListener(n,f){(this.listeners[n]??=[]).push(f)}
 emit(n,e={}){e.target??=this;e.preventDefault??=()=>{};this.listeners[n]?.forEach(f=>f(e));}
 click(){this.onclick?.({target:this})}
 appendChild(e){e.parentElement=this;return e;} insertBefore(e,ref){assert.equal(ref.parentElement,this,"insertBefore reference must be a child of this parent");e.parentElement=this;return e;} setAttribute(k,v){this[k]=v;} focus(){} setPointerCapture(){} after(c){elements.set(c.id,c)}
 getBoundingClientRect(){return{left:0,top:0,width:1039,height:718};}
 get width(){return this._width} set width(v){this._width=v;if(this._canvas)this._canvas.width=v;}
 get height(){return this._height} set height(v){this._height=v;if(this._canvas)this._canvas.height=v;}
 getContext(kind){if(kind==='webgl')return null;if(!this._canvas){this._canvas=createCanvas(this.width,this.height);this._ctx=this._canvas.getContext('2d');const nativeDraw=this._ctx.drawImage.bind(this._ctx);this._ctx.drawImage=(c,...args)=>nativeDraw(c._canvas||c,...args);}return this._ctx;}
 closest(selector){return this.matches?.includes(selector)?this:null;}
}
for(const m of html.matchAll(/<([a-z]+)\b([^>]*)>/g)){const id=m[2].match(/\bid="([^"]+)"/)?.[1],cls=m[2].match(/\bclass="([^"]+)"/)?.[1]||'';
 if(id){const e=new Element(m[1],id,cls);const val=m[2].match(/\bvalue="([^"]+)"/)?.[1];if(val)e.value=val;e.checked=/\bchecked\b/.test(m[2]);if(m[2].includes('width="314"'))e.width=314;if(m[2].includes('height="216"'))e.height=216;elements.set(id,e);}
 const tool=m[2].match(/\bdata-tool="([^"]+)"/)?.[1];if(tool){const e=new Element(m[1],'',cls);e.dataset.tool=tool;tools.push(e)}
 const tab=m[2].match(/\bdata-tab="([^"]+)"/)?.[1];if(tab){const e=new Element(m[1],'',cls);e.dataset.tab=tab;tabs.push(e)}
 if(cls.split(' ').includes('dialog'))dialogs.push(elements.get(id));if(cls.includes('close-dialog'))closes.push(new Element('button','',cls));
}
elements.get('addArmy').parentElement=elements.get('armyPanel');elements.get('sim-worker').textContent=scripts[0];elements.get('speedSelect').value='1';elements.get('strategySelect').value='line';
appDocument={querySelector:s=>s.startsWith('#')?elements.get(s.slice(1)):s==='.unit-legend'?(elements.get('unit-legend')||(()=>{const e=new Element();elements.set('unit-legend',e);return e})()):null,querySelectorAll:s=>({'[data-tool]':tools,'#tools button':tools,'[data-tab]':tabs,'.dialog':dialogs,'.close-dialog':closes}[s]||[]),createElement:tag=>new Element(tag),addEventListener(){},fullscreenElement:null};
class FakeWorker{
 constructor(){workers.push(this);const c='let onmessage;\n'+scripts[0]+'\nreturn {send(d){onmessage({data:d})},advance(n){for(let i=0;i<n&&!paused&&(phase==="setup"||running);i++)sim(.04);emit(true)},stats(){return {N,running,phase}},inspect(code){return eval(code)}}';this.app=new Function('performance','setInterval','postMessage',c)(performance,()=>0,d=>{this.onmessage?.({data:d})});}
 postMessage(d){this.app.send(d)}advance(n){this.app.advance(n)}
}
const windowStub={devicePixelRatio:1,addEventListener(){}};
const saved=new Map(),local={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
const main=new Function('window','document','Worker','URL','Blob','setTimeout','clearTimeout','requestAnimationFrame','ResizeObserver','localStorage','console',scripts[1]+'\nreturn {inspect(s){return eval(s)},render,screen,world,layoutData,validateLayout};');
const mainApp=main(windowStub,appDocument,FakeWorker,{createObjectURL:()=>'',revokeObjectURL(){}},Blob,()=>0,()=>{},f=>raf=f,class{constructor(f){this.f=f}observe(){this.f()}},local,console);
const el=id=>elements.get(id),stats=()=>windowStub.BattleField.getStats(),click=id=>el(id).click(),tick=n=>workers[0].advance(n);

let passed=0;function test(name,f){f();passed++;console.log('PASS '+name);}
function change(id,value){el(id).value=String(value);el(id).onchange?.({target:el(id)});}
function batt(cls,army,batt,value){const target=new Element('input');target.className=cls;target.dataset={army:String(army),batt:String(batt)};target.value=String(value);el('armyEditor').emit('change',{target});}
test('Default opponent estimate matches chosen budget; five difficulties are available in wizard',()=>{
 assert.equal(mainApp.inspect('config.difficulty'),'easy');assert.equal(mainApp.inspect('config.enemyEstimate'),mainApp.inspect('budgetLimit(0)'));assert.equal((html.match(/<select id="setupDifficulty">([\s\S]*?)<\/select>/)[1].match(/<option/g)||[]).length,5);change('setupDifficulty','training');assert.equal(workers[0].app.inspect('difficulty'),'training');tick(100);assert.equal(mainApp.inspect('frame.worldTime'),0);
 click('setupNext');click('setupNext');assert.equal(mainApp.inspect('wizardStep'),2);
});
test('Type and actual count are entered directly; 20 catapults cost 900 without redistributing other troops',()=>{
 mainApp.inspect('config.teams[0]=[{battalions:[{type:0,count:20},{type:2,count:20}]}];config.headquarters[0]=defaultHQ();config.reserves[0]=0;config.budgets[0]=1020;rebuild(false);renderEditor();wizardSync()');
 batt('batt-type',0,0,4);batt('batt-count',0,0,20);assert.equal(mainApp.inspect('config.teams[0][0].battalions[0].count'),20);assert.equal(mainApp.inspect('config.teams[0][0].battalions[1].count'),20);assert.equal(mainApp.inspect('totalBudget(0)'),1020);assert(el('armyEditor').innerHTML.includes('هزینه: ۹۰۰'));assert(!el('armyEditor').innerHTML.includes('DPS'));assert(!el('armyEditor').innerHTML.includes('army-total'));assert(el('budgetError').classList.contains('hidden'));
});
test('Over-budget draft remains editable, shows an inline error and blocks progression/start',()=>{
 const prior=mainApp.inspect('serial');batt('batt-count',0,0,21);assert.equal(mainApp.inspect('serial'),prior);assert.equal(mainApp.inspect('config.teams[0][0].battalions[0].count'),21);assert.equal(mainApp.inspect('config.teams[0][0].battalions[1].count'),20);assert(!el('budgetError').classList.contains('hidden'));assert.equal(el('budgetError').parentElement.id,'wizardRoster');assert(el('setupNext').disabled);assert(el('startBtn').disabled);click('setupNext');assert.equal(mainApp.inspect('wizardStep'),2);mainApp.inspect('startBattle()');assert.equal(stats().phase,'setup');batt('batt-count',0,0,20);assert(!el('setupNext').disabled);assert(el('budgetError').classList.contains('hidden'));
});
test('Changing a budget cap or adding a battalion/army does not alter existing counts',()=>{
 change('setupTotal',1500);assert.equal(mainApp.inspect('budgetLimit(0)'),1500);assert.equal(mainApp.inspect('totalBudget(0)'),1020);batt('battalion-number',0,0,3);assert.equal(mainApp.inspect('config.teams[0][0].battalions[0].count'),20);assert.equal(mainApp.inspect('config.teams[0][0].battalions[2].count'),1);change('setupArmies',2);assert.equal(mainApp.inspect('config.teams[0].length'),2);assert.equal(mainApp.inspect('config.teams[0][0].battalions[1].count'),20);assert.equal(mainApp.inspect('config.teams[0][1].battalions[0].count'),1);
});
test('HQ and reserve consume spare budget and cannot silently take soldiers from battalions',()=>{
 change('hqTotal',200);assert.equal(mainApp.inspect('hqBudget(0)'),200);assert.equal(mainApp.inspect('config.teams[0][0].battalions[0].count'),20);change('hqTotal',10000);assert.equal(mainApp.inspect('hqBudget(0)'),200);change('setupReserve',50);assert.equal(mainApp.inspect('config.reserves[0]'),50);assert.equal(mainApp.inspect('config.teams[0][0].battalions[1].count'),20);assert(!el('setupNext').disabled);
});
test('Finishing wizard opens deployment and freezes the battle until explicit start',()=>{
 click('setupNext');assert.equal(mainApp.inspect('wizardStep'),3);click('setupNext');assert.equal(mainApp.inspect('wizardOpen'),false);assert.equal(mainApp.inspect('deployment'),true);assert.equal(stats().phase,'setup');assert.equal(el('budgetError').parentElement.id,'armyPanel');assert(!el('deploymentNotice').classList.contains('hidden'));tick(1000);assert.equal(mainApp.inspect('frame.worldTime'),0);assert.equal(workers[0].app.inspect('running'),false);
 mainApp.inspect('setTool("select")');const group=stats().groups.find(g=>g.team===0&&!g.hqRole&&!g.agent);const pointer=(name,x,y)=>{const p=mainApp.screen(x,y);el('overlay').emit(name,{clientX:p.x,clientY:p.y,pointerId:7,button:0,shiftKey:false});};pointer('pointerdown',group.x,group.y);pointer('pointermove',850,500);pointer('pointerup',850,500);assert.equal(stats().groups.find(g=>g.index===group.index).x,850);
 workers[0].postMessage({kind:'shape',ids:[group.index],formation:'u'});assert.equal(stats().groups.find(g=>g.index===group.index).formation,'u');assert.equal(stats().phase,'setup');assert.equal(workers[0].app.inspect('dispatches.length'),0);
 click('editSetup');assert.equal(mainApp.inspect('wizardStep'),2);click('setupNext');click('setupNext');assert.equal(stats().groups.find(g=>g.index===group.index).x,850);assert.equal(stats().groups.find(g=>g.index===group.index).formation,'u');assert.equal(stats().phase,'setup');click('beginDeploymentBattle');assert.equal(stats().phase,'battle');assert.equal(mainApp.inspect('deployment'),false);assert(el('deploymentNotice').classList.contains('hidden'));tick(25);assert(stats().elapsed>.9);
});
test('Stored HQ personnel have no map marker or field-battalion picker',()=>{
 mainApp.render(performance.now());mainApp.inspect('updateGroupList();liveRoster()');const hidden=stats().groups.filter(g=>['signals','medics'].includes(g.hqRole));assert.equal(hidden.length,2);for(const g of hidden){assert(!el('groupList').innerHTML.includes('data-group="'+g.index+'"'));assert(!el('armyEditor').innerHTML.includes('data-id="'+g.index+'"'));}assert(!mainApp.inspect('fieldTypes().some(t=>[32,38,39].includes(t))'));
});
test('Spy and medic controls dispatch real individuals and allow selecting and rerouting them',()=>{
 change('scoutCount',1);click('sendScout');mainApp.inspect('issueAt({x:1250,y:1100},{button:0})');assert.equal(stats().missions.length,1);assert.equal(stats().headquarters.scouts,39);el('medicCount').value='2';click('sendMedic');mainApp.inspect('issueAt({x:1000,y:1400},{button:0})');assert.equal(stats().medics.length,2);assert.equal(stats().headquarters.medics,38);mainApp.inspect('updateLogistics()');const spy=stats().groups.find(g=>g.agent&&g.type===32&&g.alive);assert(el('supportList').innerHTML.includes('data-support="'+spy.index+'"'));mainApp.inspect('selected=new Set(['+spy.index+']);updateSelection()');click('rerouteSupport');mainApp.inspect('issueAt({x:1150,y:1600},{button:0})');assert(workers[0].app.inspect('dispatches.some(d=>d.payload.kind==="supportOrder")'));assert.equal(workers[0].app.inspect('missions[0].target[1]'),1065);click('recallSupport');assert(workers[0].app.inspect('dispatches.some(d=>d.payload.kind==="supportRecall")'));
});
test('Saved layouts preserve difficulty, chosen budget, HQ composition and deployment geometry',()=>{
 const layout=mainApp.layoutData(),valid=mainApp.validateLayout(structuredClone(layout));assert.equal(valid.config.difficulty,'training');assert.equal(valid.config.budgets[0],1500);assert.equal(valid.config.headquarters[0].medics,40);assert(valid.groups.some(g=>g.formation==='u'));const invalid=structuredClone(layout);invalid.config.budgets[0]=1;assert.throws(()=>mainApp.validateLayout(invalid));
});
test('Local multiplayer supports deploying both armies before the same explicit start',()=>{
 click('newBattle');change('setupMode','local');click('setupNext');click('setupNext');change('setupTeam',1);change('setupTotal',3000);assert.equal(mainApp.inspect('activeTeam'),1);click('setupNext');click('setupNext');assert.equal(stats().phase,'setup');click('redTeam');assert.equal(mainApp.inspect('activeTeam'),1);const red=stats().groups.find(g=>g.team===1&&!g.agent&&!g.hqRole);workers[0].postMessage({kind:'teleport',positions:[{id:red.index,x:2450,y:600}]});assert.equal(stats().groups.find(g=>g.index===red.index).y,600);tick(100);assert.equal(mainApp.inspect('frame.elapsed'),0);click('startBtn');assert.equal(stats().phase,'battle');
});
console.log(passed+' setup UI tests passed');
