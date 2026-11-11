'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..','JS');
const ctx={console,Math,world:{width:1500,height:1500},walls:[],units:[],zombies:[],window:{addEventListener(){}},draw(){},c:{},
 bullets:[],grenades:[],explosions:[],particles:[],casings:[],marks:[],corpses:[],rounds:0,kills:0,
 distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),alive:u=>u&&u.hp>0&&!u.extracted,clearSight:()=>true,lineClear:()=>true,
 isBlocked:()=>false,updateRoster(){},$:()=>({checked:false})};
vm.createContext(ctx);
for(const file of ['PHYSICS/hitbox-collisions.js','COMBAT/FRIENDLY-FIRE/line-safety.js','COMBAT/initial-weapons.js','COMBAT/combat-effects.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
const run=s=>vm.runInContext(s,ctx);
const soldier={i:0,x:300,y:300,hp:100,a:0,lean:0,fire:0},zombie={x:380,y:300,hp:100,a:Math.PI,dead:false,special:false};
ctx.units=[soldier];ctx.zombies=[zombie];
assert.equal(run('isActorSpaceFree(units[0],345,300)'),false,'rifle footprint cannot enter infected torso');
run('moveWithHitbox(zombies[0],-200,0)');assert(zombie.x>=362-.01,'torso stops at soldier full footprint');
assert(run('zombieMeleeContact(zombies[0],units[0])'),'melee reaches contact without overlapping torsos');
assert(!run('footprintsOverlap(actorFootprint(units[0]),actorFootprint(zombies[0]))'));
run('shoot(units[0],zombies[0]);bullets[0].ownerId=0;bullets[0].damage=38;updateCombatEffects(.02)');assert(zombie.hp<100,'contact-range shot damages enemy');
// Regression: enemy core inside the old muzzle offset must still be hit by the first sweep.
run('units[0].fire=0;zombies[0].x=330;zombies[0].hp=100;shoot(units[0],zombies[0]);bullets[0].ownerId=0;bullets[0].damage=38;updateCombatEffects(.02)');assert(zombie.hp<100,'body-to-muzzle sweep prevents near-range immunity');
ctx.zombies=[];ctx.units.push({i:1,x:350,y:350,hp:100,a:0});
assert(run('tryActorFacing(units[0],Math.PI/2)')===false,'turning cannot rotate the weapon box into a teammate');
ctx.units.pop();
assert(run('tryActorFacing(units[0],Math.PI/2)'));
assert.equal(run('pointInActor(units[0],{x:300,y:337})'),true,'rotated long axis');
assert.equal(run('pointInActor(units[0],{x:337,y:300})'),false,'rotated narrow axis');
console.log('PASS: full rotating soldier footprint, infected torso-only contact, melee reach, close-range projectile sweep, blocked rotation, rotated projectile/friendly-fire boxes');
