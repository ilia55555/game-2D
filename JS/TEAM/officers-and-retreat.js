'use strict';
/** JS/TEAM/officers-and-retreat.js — modularized game mechanic; loaded in manifest order. */

function nearestOfficer(){return units.find(u=>u.isOfficer&&alive(u))}
function startAutomaticRetreat(){if(autoRetreat)return;autoRetreat=true;controlledId=-1;active=-1;held=false;keys.clear();wheel.open=false;extraction.requested=true;extraction.allowPartial=true;extraction.timer=0;extraction.wait=0;const survivors=units.filter(alive);for(const u of survivors){clearCover(u);u.task='extract';u.stance='stand';u.autoEvacuate=true}assignEvacuation(survivors);setCursorMode()}
ensureLeadership=function(){if(alive(units[leaderId]))return true;const replacement=nearestOfficer();if(replacement){const old=leaderId;units[old].role='fallenCommander';leaderId=replacement.i;deputyId=null;replacement.role='commander';replacement.name='COMMAND';if(controlledId===old||!alive(units[controlledId]))controlledId=replacement.i;active=controlledId;rosterStamp='';return true}return false};
select=function(i,add=false){const u=units[i];if(!alive(u)||autoRetreat)return;if(u.isOfficer&&!add){controlledId=i;active=i;mode='manual';held=false;keys.clear();cameraX=u.x;cameraY=u.y}else{if(add){commandGroup='selected';u.selected=!u.selected}else{commandGroup=u.group==='command'?'all':u.group;units.forEach(v=>v.selected=alive(v)&&!v.isOfficer&&(commandGroup==='all'||v.group===commandGroup))}}rosterStamp='';updateRoster();refreshOperators()};
function swapOfficer(){const other=units.find(u=>u.isOfficer&&alive(u)&&u.i!==controlledId);if(other)select(other.i)}
