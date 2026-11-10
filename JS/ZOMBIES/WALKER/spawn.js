'use strict';
/** JS/ZOMBIES/WALKER/spawn.js — modularized game mechanic; loaded in manifest order. */

function makeZombie(i,p){return{x:p.x,y:p.y,hp:p.special?145:75,speed:22,a:Math.random()*Math.PI*2,phase:Math.random()*6,cool:0,dead:false,state:'wander',home:p.zone||'yellow',wanderGoal:null,wanderTime:0,targetId:null,lastKnown:null,memory:0,sensor:Math.random()*.15,repath:0,special:!!p.special}}
