'use strict';
/** JS/INPUT/final-bindings.js — modularized game mechanic; loaded in manifest order. */

// Team equipment controls; leaning is removed, including saved obsolete bindings.
delete defaults.manual;delete defaults.officer;bindings.manual='Backquote';delete bindings.officer;
Object.assign(defaults,{grenade:'KeyZ',special:'KeyX',reload:'KeyR',vision:'KeyV',formation:'KeyF',map:'Tab'});
for(const key of ['unit4','unit5','unit6','leanLeft','leanRight']){delete defaults[key];delete bindings[key];delete actionNames[key]}
Object.assign(bindings,{grenade:'KeyZ',special:'KeyX',reload:'KeyR',vision:'KeyV',formation:'KeyF',map:'Tab'});
try{
 const saved=JSON.parse(localStorage.getItem('delta-bindings-tactical-v4')||'null');
 if(saved&&Object.keys(defaults).every(key=>typeof saved[key]==='string')&&new Set(Object.keys(defaults).map(key=>saved[key])).size===Object.keys(defaults).length){
  for(const key of Object.keys(defaults))bindings[key]=saved[key];
 }
}catch{}
Object.assign(actionNames,{grenade:'نارنجک',special:'دود تاکتیکی',vision:'دید شب / چراغ کل تیم',light:'چراغ‌قوهٔ کل تیم',formation:'منوی آرایش',map:'نقشه فرماندهی'});
action=function(code){if(paused||state!=='playing'||autoRetreat)return;const u=units[controlledId];if(code===bindings.grenade)grenade();else if(code===bindings.special)specialTool();else if(code===bindings.reload)startReload(u);else if(code===bindings.vision)toggleVision();else if(code===bindings.light)toggleLights();else if(code===bindings.formation)openWheel(null,'formation');else if(code===bindings.map)toggleTacticalMap();else if(code===bindings.all){commandGroup='all';units.forEach(u=>u.selected=alive(u)&&!u.isOfficer);updateRoster()}else if(code===bindings.unit1)select(leaderId);else if(code===bindings.unit2||code===bindings.unit3){commandGroup=code===bindings.unit2?'alpha':'bravo';units.forEach(u=>u.selected=alive(u)&&u.group===commandGroup);updateRoster()}else if(code===bindings.stance){stanceStart=performance.now();stanceBefore=u.stance;proneTriggered=false}};
let commandPointerClient={x:0,y:0};
pointerEvent=function(e){
 const rect=canvas.getBoundingClientRect(),locked=document.pointerLockElement===canvas;
 const hasClient=Number.isFinite(e.clientX)&&Number.isFinite(e.clientY);
 if(wheel.open){
  const previous=wheel.lastClient||commandPointerClient;
  let dx=Number.isFinite(e.movementX)?e.movementX:0,dy=Number.isFinite(e.movementY)?e.movementY:0;
  if(!locked&&dx===0&&dy===0&&hasClient){dx=e.clientX-previous.x;dy=e.clientY-previous.y}
  virtualPointer.x=clamp(virtualPointer.x+dx,0,W);virtualPointer.y=clamp(virtualPointer.y+dy,0,H);
  if(hasClient)wheel.lastClient={x:e.clientX,y:e.clientY};
  updateWheel();
 }else{
  if(locked){virtualPointer.x=clamp(virtualPointer.x+(e.movementX||0),0,W);virtualPointer.y=clamp(virtualPointer.y+(e.movementY||0),0,H)}
  else if(hasClient){virtualPointer.x=clamp(e.clientX-rect.left,0,W);virtualPointer.y=clamp(e.clientY-rect.top,0,H)}
  aimFromPointer();
 }
 if(hasClient)commandPointerClient={x:e.clientX,y:e.clientY};
};
