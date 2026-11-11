'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'HTML/index.html'),'utf8');
const nodes=new Map(),events=new Map(),stores=new Map();
const pixels=(w,h)=>({data:new Uint8ClampedArray(w*h*4)});
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),createImageData:pixels,getImageData:(x,y,w,h)=>pixels(w,h)},{get:(o,k)=>k in o?o[k]:()=>{}});
function node(id){if(!nodes.has(id))nodes.set(id,{id,width:540,height:260,textContent:'',innerHTML:'',hidden:true,dataset:{},style:{},checked:false,children:[],classList:{add(){},remove(){},toggle(){}},focus(){},blur(){},getBoundingClientRect:()=>({width:1280,height:720,left:0,top:0}),getContext:()=>ctx,addEventListener(k,fn){events.set(id+':'+k,fn)}});return nodes.get(id)}
const sandbox={URL,document:{baseURI:'http://localhost/HTML/index.html',body:{classList:{toggle(){}}},querySelector:s=>s.startsWith('[data-bind')?null:node(s),querySelectorAll:()=>[],createElement:()=>({getContext:()=>ctx}),addEventListener(){}},Image:class{complete=false;naturalWidth=0},window:{addEventListener(){}},ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame(){},localStorage:{getItem:k=>stores.get(k),setItem:(k,v)=>stores.set(k,v),removeItem:k=>stores.delete(k)},performance:{now:()=>0},console,Math,Uint8ClampedArray};
vm.createContext(sandbox);
for(const m of html.matchAll(/<script src="\.\.\/([^"]+)" defer><\/script>/g)){
 if(m[1].endsWith('pause-navigation.js'))continue;
 vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),sandbox,{filename:m[1]});
}
const run=s=>vm.runInContext(s,sandbox);
assert.equal(run('state'),'playing');assert(run('world.buildings.length>=3'));
for(let count=5;count<=12;count++){
 run(`squadCount=${count};stageSeed=1234;resetStage(true)`);
 assert(run('units.every(alive)'),'deployment keeps all soldiers alive');
 for(const [dx,dy] of [[120,0],[-120,0],[0,-120],[0,120]]){
  const before=run('({x:units[0].x,y:units[0].y})');
  const moved=run(`moveWithHitbox(units[0],${dx},${dy})`);
  assert(moved>119,'allies must not cage the commander at deployment');
  run(`units[0].x=${before.x};units[0].y=${before.y}`);
 }
}

run('squadCount=7;stageSeed=1234;resetStage(true)');
assert.equal(run('bindings.leanLeft'),'KeyQ');assert.equal(run('bindings.leanRight'),'KeyE');assert.equal(run('bindings.grenade'),'KeyZ');assert.equal(run('bindings.special'),'KeyX');
run("commandGroup='alpha';issueCommand(1)");assert(run("units.filter(u=>u.group==='alpha').every(u=>u.task==='follow')"));assert(run("units.filter(u=>u.group==='bravo').every(u=>u.task==='hold')"));
run('issueCommand(1)');assert(run("units.filter(u=>u.group==='alpha').every(u=>u.task==='hold'&&!u.path.length)"));
run("commandGroup='all';issueCommand(3)");assert(run('coverReservations.size>0'));
assert(run('new Set(coverReservations.keys()).size===coverReservations.size'));
assert(run("walls.every(w=>[...coverReservations.keys()].filter(k=>k.startsWith(w.id+':')).length<=(w.capacity||1))"));
run("units.forEach(u=>u.fireLane={points:[{x:0,y:0}]});issueCommand(4)");assert(run("selectedTroops().every(u=>u.task==='hold'&&!u.fireLane&&!u.path.length)"));assert.equal(run('coverReservations.size'),0);
run("commandGroup='selected';units.forEach(u=>u.selected=false);units[1].selected=true;issueCommand(0)");assert(run('units[1].firePermission'));assert(!run('units[2].firePermission'));
run("commandGroup='alpha';applyFormation('line')");assert(run("units.filter(u=>u.group==='alpha').every(u=>u.task==='move')"));
// Empty world isolates actual projectile travel and collision, rather than just configuration.
run("world={width:10000,height:10000,weather:'day',lamps:[],bushes:[],buildings:[],trees:[]};walls.length=0;rebuildGeometry();units=[{i:0,x:500,y:500,hp:100,weapon:'carbine',ammo:30,reload:0,fire:0,lean:0,a:0,stance:'stand'}];controlledId=0;zombies=[];bullets=[];shoot(units[0],{x:9000,y:500})");
assert.equal(run('bullets.length'),1);assert.equal(run('units[0].ammo'),29);
run('for(let i=0;i<30;i++)updateCombatEffects(.01)');assert(run('bullets.length===1&&bullets[0].x>1700'),'bullet survives beyond former range');
run('walls.push({x:1900,y:450,w:10,h:100});for(let i=0;i<10;i++)updateCombatEffects(.01)');assert.equal(run('bullets.length'),0,'swept impact cannot tunnel through wall');
// Officer loss continues the mission as automatic evacuation.
run("squadCount=6;stageSeed=1234;resetStage(true);zombies=[];units.filter(u=>u.isOfficer).forEach(u=>u.hp=0);ensureLeadership()");
assert(run('autoRetreat'));assert.equal(run('controlledId'),-1);assert(run("units.filter(alive).every(u=>u.task==='extract')"));
run('units.filter(alive).forEach(u=>{u.x=extraction.point.x;u.y=extraction.point.y});updateExtractionCampaign(5.1)');assert.equal(run('state'),'won');
run('stageSeed=1234;resetStage(true);for(let i=0;i<100;i++)update(.02);draw()');
console.log('PASS: complete module startup/update/render; scoped orders; follow toggle; cover capacity and cancellation; individual fire; formation; long-range swept bullets; officer-loss evacuation; Q/E and Z/X controls');
