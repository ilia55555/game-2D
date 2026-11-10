'use strict';
/** JS/AI/SOLDIERS/cover-allocation.js — modularized game mechanic; loaded in manifest order. */

function maintainReservations(){for(const [id,owner]of coverReservations){const u=units[owner];if(!alive(u)||u.coverSlot!==id||taskOf(u)!=='cover'){coverReservations.delete(id);const s=coverSlots.find(s=>s.id===id);if(s)s.owner=null}}}
moveBody=function(u,dx,dy,r=18){if(u.i===undefined||u.i===controlledId||!alive(u))return v4Move(u,dx,dy,r);const nx=u.x+dx,ny=u.y+dy,blocking=units.find(v=>v.i!==u.i&&alive(v)&&Math.hypot(nx-v.x,ny-v.y)<31);if(!blocking)return v4Move(u,dx,dy,r);const len=Math.hypot(dx,dy);if(!len)return 0;for(const sign of [u.i%2?1:-1,u.i%2?-1:1]){const sx=-dy*sign,sy=dx*sign;if(!units.some(v=>v.i!==u.i&&alive(v)&&Math.hypot(u.x+sx-v.x,u.y+sy-v.y)<30)){const moved=v4Move(u,sx,sy,r);if(moved)return moved}}u.stuck=(u.stuck||0)+len;return 0};
function formationOffset(u,count,heading=0){const i=u.slot||0;if(formation==='column')return{x:0,y:45+i*45};if(formation==='line')return{x:(i-(count-1)/2)*45,y:35};if(formation==='defensive'){const a=i/Math.max(1,count)*Math.PI*2;return{x:Math.cos(a)*80,y:Math.sin(a)*80}}return{x:(i%2-.5)*58,y:45+Math.floor(i/2)*57}}
