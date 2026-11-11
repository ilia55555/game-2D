'use strict';
/** Tab strategy map; movement and engagement only happen on command confirmation. */
let tacticalMapOpen=false, tacticalMapSelection=null,tacticalMapTransform=null;
const commandMap=document.querySelector('#tacticalMap'),commandMapCanvas=document.querySelector('#tacticalMapCanvas');
const commandCtx=commandMapCanvas.getContext('2d');
function drawCommandMap(){
 if(!tacticalMapOpen||!world)return;
 const rect=commandMapCanvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);
 commandMapCanvas.width=Math.max(320,Math.round(rect.width*d));
 commandMapCanvas.height=Math.max(240,Math.round(rect.height*d));
 const w=commandMapCanvas.width,h=commandMapCanvas.height,scaleMap=Math.min((w-24*d)/world.width,(h-24*d)/world.height);
 const offsetX=(w-world.width*scaleMap)/2,offsetY=(h-world.height*scaleMap)/2;
 tacticalMapTransform={scaleMap,offsetX,offsetY,d};
 commandCtx.clearRect(0,0,w,h);commandCtx.fillStyle='#111820';commandCtx.fillRect(0,0,w,h);
 commandCtx.save();commandCtx.translate(offsetX,offsetY);commandCtx.scale(scaleMap,scaleMap);
 if(world.grid)commandCtx.drawImage(terrainCanvas(world),0,0);
 for(const wall of walls){commandCtx.fillStyle=wall.rock?'#ae9677':'#a29386';commandCtx.fillRect(wall.x,wall.y,wall.w,wall.h)}
 for(const b of missionBuildings){
  commandCtx.strokeStyle=b.cleared?'#86bc8c':'#e6ad79';commandCtx.lineWidth=5/scaleMap;
  commandCtx.strokeRect(b.outer.x,b.outer.y,b.outer.w,b.outer.h);
 }
 if(extraction?.point){commandCtx.beginPath();commandCtx.strokeStyle='#59b6e7';commandCtx.lineWidth=6/scaleMap;commandCtx.arc(extraction.point.x,extraction.point.y,38,0,Math.PI*2);commandCtx.stroke()}
 for(const z of zombies){if(z.dead||!teamSees(z))continue;commandCtx.fillStyle='#d76770';commandCtx.beginPath();commandCtx.arc(z.x,z.y,15,0,Math.PI*2);commandCtx.fill()}
 for(const u of units){if(!alive(u))continue;commandCtx.fillStyle=u.isOfficer?'#f0ce91':u.group==='alpha'?'#9dd69e':'#96bde1';commandCtx.beginPath();commandCtx.arc(u.x,u.y,u.isOfficer?20:14,0,Math.PI*2);commandCtx.fill()}
 if(tacticalMapSelection){
  const p=tacticalMapSelection;commandCtx.strokeStyle='#f6a56a';commandCtx.lineWidth=4/scaleMap;
  commandCtx.beginPath();commandCtx.arc(p.x,p.y,30,0,Math.PI*2);commandCtx.stroke();
  commandCtx.beginPath();commandCtx.moveTo(p.x-46,p.y);commandCtx.lineTo(p.x+46,p.y);
  commandCtx.moveTo(p.x,p.y-46);commandCtx.lineTo(p.x,p.y+46);commandCtx.stroke();
 }
 commandCtx.restore();
}
function toggleTacticalMap(force){
 const next=typeof force==='boolean'?force:!tacticalMapOpen;
 if(next===tacticalMapOpen||!world||state!=='playing')return;
 tacticalMapOpen=next;clearInput();held=false;wheel.open=false;
 if(next){
  document.exitPointerLock?.();tacticalMapSelection=null;
  document.querySelector('#tacticalMapScope').value=commandGroup;
  document.querySelector('#tacticalMapOrder').value='11';
  document.querySelector('#tacticalMapHint').textContent='روی نقشه مقصد را انتخاب کن. تا صدور فرمان هیچ حرکتی اتفاق نمی‌افتد.';
 }
 commandMap.hidden=!next;setCursorMode();
 if(next)drawCommandMap();else canvas.focus();
}
commandMapCanvas.addEventListener('pointerdown',e=>{
 e.preventDefault();if(!tacticalMapOpen)return;
 const rect=commandMapCanvas.getBoundingClientRect(),tr=tacticalMapTransform;if(!tr)return;
 const x=((e.clientX-rect.left)*tr.d-tr.offsetX)/tr.scaleMap,y=((e.clientY-rect.top)*tr.d-tr.offsetY)/tr.scaleMap;
 const point=routeSafeGoal({x,y},50);
 if(!point){document.querySelector('#tacticalMapHint').textContent='نقطه مسدود یا خارج از نقشه است.';return}
 tacticalMapSelection=point;lastMouseWorld={...point};
 document.querySelector('#tacticalMapHint').textContent='مقصد انتخاب شد: '+Math.round(point.x)+' / '+Math.round(point.y);
 drawCommandMap();
});
document.querySelector('#tacticalMapScope').addEventListener('change',e=>{
 commandGroup=e.target.value;
 if(commandGroup!=='selected')units.forEach(u=>u.selected=alive(u)&&!u.isOfficer&&(commandGroup==='all'||u.group===commandGroup));
 rosterStamp='';updateRoster();drawCommandMap();
});
document.querySelector('#tacticalMapIssue').addEventListener('click',()=>{
 const i=Number(document.querySelector('#tacticalMapOrder').value);
 if(![0,4,8,9,10].includes(i)&&!tacticalMapSelection){document.querySelector('#tacticalMapHint').textContent='ابتدا یک مقصد انتخاب کن.';return}
 if(tacticalMapSelection)lastMouseWorld={...tacticalMapSelection};
 if(i===11)moveSquads(tacticalMapSelection);else issueCommand(i,tacticalMapSelection||lastMouseWorld);
 toggleTacticalMap(false);
});
document.querySelector('#tacticalMapClose').onclick=()=>toggleTacticalMap(false);
window.addEventListener('resize',()=>{if(tacticalMapOpen)drawCommandMap()});
window.addEventListener('keydown',e=>{
 if(!tacticalMapOpen)return;
 if(e.code===bindings.map||e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)toggleTacticalMap(false)}
 else if(!['ArrowUp','ArrowDown','Enter'].includes(e.code))e.stopImmediatePropagation();
},true);
window.addEventListener('keyup',e=>{if(tacticalMapOpen){e.stopImmediatePropagation();keys.delete(e.code)}},true);
