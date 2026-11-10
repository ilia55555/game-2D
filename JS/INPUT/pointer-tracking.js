'use strict';
/** JS/INPUT/pointer-tracking.js — modularized game mechanic; loaded in manifest order. */

function pointerEvent(e){const rect=canvas.getBoundingClientRect();if(document.pointerLockElement===canvas){virtualPointer.x=clamp(virtualPointer.x+(e.movementX||0),0,W);virtualPointer.y=clamp(virtualPointer.y+(e.movementY||0),0,H)}else{virtualPointer.x=clamp(e.clientX-rect.left,0,W);virtualPointer.y=clamp(e.clientY-rect.top,0,H)}if(wheel.open)updateWheel(e);else{const s=scale();mouse={x:(virtualPointer.x-W/2)/s+550,y:(virtualPointer.y-(H-57)/2)/s+425};lastMouseWorld={...mouse}}}
