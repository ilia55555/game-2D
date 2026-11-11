'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.join(__dirname,'..','JS');
const context={console, Math, Set, Map, world:{width:800,height:800},walls:[{x:300,y:180,w:40,h:230}],
  units:[],zombies:[], state:'playing',paused:false,window:{addEventListener(){}},
  draw(){}, c:{setTransform(){},translate(){},scale(){},strokeRect(){}},W:1000,H:750,dpr:1,
  cameraX:400,cameraY:400,scale:()=>1,alive:u=>u.hp>0&&!u.extracted,
  distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
  WEAPONS:{carbine:{range:380}},squads:{alpha:{fire:false},bravo:{fire:false}},
  clearSight:()=>true,seesFromUnit:()=>true,teamSees:()=>true,
  t:0,controlledId:0,autoRetreat:false,keys:new Set(),
  bindings:{up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD'},
  mouse:{x:300,y:200},weaponMoveMultiplier:()=>1,
  maintainReservations(){},followAnchor:()=>({x:100,y:100}),
  safeGoal:p=>p,clearCover(){},assignReservedCover(){},
  missionBuildings:[],setRoute(){},pathTo:()=>[],
  leaderId:0,formationRevision:0,coverSlots:[],coverReservations:new Map()
};
vm.createContext(context);
for(const file of ['COMBAT/FRIENDLY-FIRE/firing-lanes.js','AI/SOLDIERS/tactical-behavior.js','AI/SOLDIERS/campaign-behavior.js','AI/SOLDIERS/traffic-resolution.js']){
  vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),context,{filename:file});
}
vm.runInContext(fs.readFileSync(path.join(base,'PHYSICS/hitbox-collisions.js'),'utf8'),context);
const soldier={i:0,x:270,y:230,hp:100,hitbox:{hx:13,hy:13},task:'hold',weapon:'carbine',path:[],stance:'stand',phase:0};
const other={i:1,x:250,y:230,hp:100,hitbox:{hx:13,hy:13},task:'hold',weapon:'carbine',path:[],stance:'stand',phase:0};
const zombie={x:370,y:230,hp:100,hitbox:{hx:12,hy:12},dead:false};
context.units=[soldier,other];context.zombies=[zombie];
assert.equal(vm.runInContext('isActorSpaceFree(units[0],320,230)',context),false,'wall should block actor box');
vm.runInContext('moveWithHitbox(units[0],120,0)',context);
assert(soldier.x<=287.001,'cannot cross thick wall');
assert.equal(vm.runInContext('canAutofireAt(units[1],zombies[0])',context),false,'no firing at distant zombie without command');
zombie.x=other.x+50;assert.equal(vm.runInContext('canAutofireAt(units[1],zombies[0])',context),true,'close defense is permitted');
context.squads.alpha.fire=true;other.group='alpha';zombie.x=500;assert.equal(vm.runInContext('canAutofireAt(units[1],zombies[0])',context),true,'fire command enables distant response');
other.x=200;other.task='hold';other.path=[];const before=other.x;
vm.runInContext('simulateMovement(0.03)',context);assert.equal(other.x,before,'idle soldier never moves');
console.log('AI discipline, idle movement and solid hitboxes: PASS');
