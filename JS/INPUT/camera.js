'use strict';
/** JS/INPUT/camera.js — modularized game mechanic; loaded in manifest order. */

function updateCamera(){const target=alive(units[controlledId])?units[controlledId]:units.find(alive);if(!target)return;const halfW=W/(2*scale()),halfH=(H-57)/(2*scale());cameraX=clamp(target.x,Math.min(halfW,world.width/2),Math.max(world.width/2,world.width-halfW));cameraY=clamp(target.y,Math.min(halfH,world.height/2),Math.max(world.height/2,world.height-halfH))}
scale=function(){return Math.max(.32,Math.min(W/1100,(H-57)/800))*zoom};
point=function(e){const rect=canvas.getBoundingClientRect(),s=scale();return{x:(e.clientX-rect.left-W/2)/s+cameraX,y:(e.clientY-rect.top-(H-57)/2)/s+cameraY}};
function aimFromPointer(){const s=scale();mouse={x:(virtualPointer.x-W/2)/s+cameraX,y:(virtualPointer.y-(H-57)/2)/s+cameraY};lastMouseWorld={...mouse}}
