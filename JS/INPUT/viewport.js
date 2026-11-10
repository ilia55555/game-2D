'use strict';
/** JS/INPUT/viewport.js — modularized game mechanic; loaded in manifest order. */

function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,k=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-dx*k,p.y-a.y-dy*k)}
function point(e){const r=canvas.getBoundingClientRect(),s=scale();return{x:(e.clientX-r.left-W/2)/s+550,y:(e.clientY-r.top-H/2)/s+425}}
function scale(){return Math.min(W/1100,H/850)*zoom}
function resize(){const r=canvas.getBoundingClientRect();W=r.width;H=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=W*dpr;canvas.height=H*dpr}new ResizeObserver(resize).observe(canvas);
