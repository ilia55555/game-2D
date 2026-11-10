'use strict';
/** JS/TEAM/tactical-leadership.js — modularized game mechanic; loaded in manifest order. */

ensureLeadership=function(){if(alive(units[leaderId]))return true;if(deputyId!==null&&alive(units[deputyId])){const old=leaderId;units[old].role='fallenCommander';leaderId=deputyId;deputyId=null;const successor=units[leaderId];successor.role='commander';successor.name='COMMAND';successor.path=[];if(controlledId===old)controlledId=leaderId;active=controlledId;clearInput();rosterStamp='';updateRoster();return true}return units[leaderId]?.extracted||false};
select=function(i,add=false){if(!alive(units[i]))return;ensureLeadership();if(add){units[i].selected=!units[i].selected;commandGroup='selected'}else{clearInput();controlledId=i;active=i;mode='manual';clearCover(units[i]);commandGroup=units[i].group==='command'?'all':units[i].group;units.forEach(u=>u.selected=alive(u)&&(u.i===i||commandGroup==='all'&&u.group!=='command'||u.group===commandGroup))}rosterStamp='';updateRoster();refreshOperators()};
toggleMode=function(){clearInput();mode=mode==='manual'?'tactical':'manual';active=controlledId;syncControls()};
function setCursorMode(){const stopped=paused||state!=='playing';document.body.classList.toggle('playing',!stopped);document.body.classList.toggle('paused',stopped);if(stopped&&document.pointerLockElement)document.exitPointerLock?.()}
function lockPointer(){if(paused||state!=='playing'||document.pointerLockElement===canvas)return;try{const promise=canvas.requestPointerLock?.();if(promise?.catch)promise.catch(()=>{})}catch{}}
