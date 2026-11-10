'use strict';
/** JS/PLAYER/ABILITIES/smoke-and-vision.js — modularized game mechanic; loaded in manifest order. */

function specialTool(){const u=units[controlledId];if(!alive(u)||u.smokes<=0)return;u.smokes--;const p=commandAimPoint(190);smokeClouds.push({x:p.x,y:p.y,radius:95,life:12})}
function toggleVision(){const u=units[controlledId];if(!alive(u))return;if(world.nvgAvailable){u.nvg=!u.nvg;if(u.nvg)u.light=false}else if(world.weather!=='day')u.light=!u.light}
