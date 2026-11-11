'use strict';
/** JS/COMBAT/combat-effects.js — modularized game mechanic; loaded in manifest order. */





function updateCombatEffects(dt){for(let i=bullets.length-1;i>=0;i--){const b=bullets[i],a={x:b.launchX??b.x,y:b.launchY??b.y},next={x:b.x+b.vx*dt,y:b.y+b.vy*dt};delete b.launchX;delete b.launchY;let hit=null,block=false;const steps=Math.ceil(distance(a,next)/5);for(let j=1;j<=steps;j++){const p={x:a.x+(next.x-a.x)*j/steps,y:a.y+(next.y-a.y)*j/steps};if(isBlocked(p.x,p.y,1)){next.x=p.x;next.y=p.y;block=true;break}const friend=units.find(u=>alive(u)&&u.i!==b.ownerId&&
 pointInActor(u,p));
 if(friend){next.x=p.x;next.y=p.y;block=true;break}
 const z=zombies.find(z=>!z.dead&&pointInActor(z,p));if(z){hit=z;next.x=p.x;next.y=p.y;break}}b.px=b.x;b.py=b.y;b.x=next.x;b.y=next.y;b.life-=dt;if(Number.isFinite(b.remaining))b.remaining-=distance(a,next);if(hit)wound(hit,b.damage||38);if(hit||block||b.life<=0||b.remaining<=0){if(hit||block)sparks(b.x,b.y,hit?3:7);if(block){marks.push({x:b.x,y:b.y});if(marks.length>160)marks.shift()}bullets.splice(i,1)}}
for(let i=grenades.length-1;i>=0;i--){const g=grenades[i];g.age+=dt;const k=Math.min(1,g.age/.65),nx=g.sx+(g.tx-g.sx)*k,ny=g.sy+(g.ty-g.sy)*k;if(!g.blocked){if(isBlocked(nx,ny,4)){g.blocked=true;g.tx=g.x;g.ty=g.y;g.sx=g.x;g.sy=g.y}else{g.x=nx;g.y=ny}}if(g.age>=g.fuse){explosions.push({x:g.x,y:g.y,age:0});sound('blast');sparks(g.x,g.y,70);zombies.forEach(z=>{if(!z.dead&&distance(g,z)<120&&lineClear(g,z))wound(z,200*(1-distance(g,z)/155))});units.forEach(u=>{if(u.hp>0&&distance(g,u)<100&&lineClear(g,u))u.hp=Math.max(0,u.hp-65*(1-distance(g,u)/120))});grenades.splice(i,1);updateRoster()}}
for(let i=explosions.length-1;i>=0;i--)if((explosions[i].age+=dt)>.7)explosions.splice(i,1);for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<0)particles.splice(i,1)}for(let i=casings.length-1;i>=0;i--){const p=casings[i];p.life-=dt;if(p.life>1){p.x+=p.vx*dt;p.y+=p.vy*dt;p.a+=dt*15;p.vx*=Math.pow(.1,dt);p.vy*=Math.pow(.1,dt)}if(p.life<0)casings.splice(i,1)}}
