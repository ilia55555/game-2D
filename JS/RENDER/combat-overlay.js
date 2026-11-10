'use strict';
/** JS/RENDER/combat-overlay.js — modularized game mechanic; loaded in manifest order. */

draw=function(){originalDraw();c.save();c.translate(0,0);for(const p of damageBlood){c.globalAlpha=p.life/.45;line(p.x,p.y,p.x-p.vx*.05,p.y-p.vy*.05,'#bc3d49',2)}c.restore();c.setTransform(dpr,0,0,dpr,0,0);const low=units[leaderId]?.hp<35?.12:0,intensity=Math.max(damagePulse,low);if(intensity>0){const g=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.22,W/2,H/2,Math.hypot(W,H)*.52);g.addColorStop(0,'#98001500');g.addColorStop(.55,'rgba(150,0,20,'+intensity*.12+')');g.addColorStop(1,'rgba(190,5,24,'+intensity+')');c.fillStyle=g;c.fillRect(0,0,W,H-54)}if(wheel.open)drawWheel()};
