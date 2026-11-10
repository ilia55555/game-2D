'use strict';
/** JS/INPUT/final-bindings.js — modularized game mechanic; loaded in manifest order. */

// Lean removed. Q = tactical smoke, E = grenade (old X/Z are unbound).
delete defaults.manual;delete defaults.leanLeft;delete defaults.leanRight;delete defaults.officer;
bindings.manual='Backquote';delete bindings.leanLeft;delete bindings.leanRight;delete bindings.officer;
delete actionNames.leanLeft;delete actionNames.leanRight;delete actionNames.officer;
Object.assign(defaults,{grenade:'KeyE',special:'KeyQ',reload:'KeyR',vision:'KeyV',formation:'KeyF',map:'Tab'});
Object.assign(bindings,{grenade:'KeyE',special:'KeyQ',reload:'KeyR',vision:'KeyV',formation:'KeyF',map:'Tab'});
Object.assign(actionNames,{grenade:'نارنجک',special:'دود تاکتیکی',vision:'نایت‌ویژن / چراغ در شب',formation:'منوی آرایش',map:'نقشه فرماندهی'});
action=function(code){if(paused||state!=='playing'||autoRetreat)return;const u=units[controlledId];if(code===bindings.grenade)grenade();else if(code===bindings.special)specialTool();else if(code===bindings.reload)startReload(u);else if(code===bindings.vision)toggleVision();else if(code===bindings.light)u.light=!u.light;else if(code===bindings.formation)openWheel(null,'formation');else if(code===bindings.map)toggleTacticalMap();else if(code===bindings.all){commandGroup='all';units.forEach(u=>u.selected=alive(u)&&!u.isOfficer);updateRoster()}else if(code===bindings.unit1)select(leaderId);else if(code===bindings.unit2||code===bindings.unit3){commandGroup=code===bindings.unit2?'alpha':'bravo';units.forEach(u=>u.selected=alive(u)&&u.group===commandGroup);updateRoster()}else if(code===bindings.stance){stanceStart=performance.now();stanceBefore=u.stance;proneTriggered=false}};
pointerEvent=function(e){const rect=canvas.getBoundingClientRect();if(document.pointerLockElement===canvas){virtualPointer.x=clamp(virtualPointer.x+(e.movementX||0),0,W);virtualPointer.y=clamp(virtualPointer.y+(e.movementY||0),0,H)}else{virtualPointer.x=clamp(e.clientX-rect.left,0,W);virtualPointer.y=clamp(e.clientY-rect.top,0,H)}if(wheel.open)updateWheel();else aimFromPointer()};
