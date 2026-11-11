'use strict';
/** JS/VISION/light-awareness.js — modularized game mechanic; loaded in manifest order. */

function zombieRoute(z,p,dt,speed){const d=distance(z,p);if(d<5)return;if(clearSight(z,p)){z.path=[];if(!tryActorFacing(z,Math.atan2(p.y-z.y,p.x-z.x)))return;moveBody(z,Math.cos(z.a)*speed*dt,Math.sin(z.a)*speed*dt,13)}else{z.repath=(z.repath||0)-dt;if(z.repath<=0){z.path=pathTo(z,p);z.repath=.7+Math.random()*.3}const q=z.path?.[0];if(q){const r=distance(z,q);if(r<7)z.path.shift();else{if(!tryActorFacing(z,Math.atan2(q.y-z.y,q.x-z.x)))return;moveBody(z,(q.x-z.x)/r*speed*dt,(q.y-z.y)/r*speed*dt,13)}}}z.phase+=speed*dt*.13}
