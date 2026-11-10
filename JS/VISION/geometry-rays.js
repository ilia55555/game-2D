'use strict';
/** JS/VISION/geometry-rays.js — modularized game mechanic; loaded in manifest order. */


// Static geometry is shared by perception and lighting; no arrays are allocated per ray.
const rayBlocks=walls.concat([{x:0,y:0,w:55,h:850},{x:1045,y:0,w:55,h:850},{x:0,y:0,w:1100,h:48},{x:0,y:817,w:1100,h:33}]);
rayDistance=function(x,y,a,range){const dx=Math.cos(a),dy=Math.sin(a);let hit=range;for(let i=0;i<rayBlocks.length;i++){const b=rayBlocks[i];let near=-Infinity,far=Infinity;if(Math.abs(dx)<1e-9){if(x<b.x||x>b.x+b.w)continue}else{const t1=(b.x-x)/dx,t2=(b.x+b.w-x)/dx;near=Math.min(t1,t2);far=Math.max(t1,t2)}if(Math.abs(dy)<1e-9){if(y<b.y||y>b.y+b.h)continue}else{const t1=(b.y-y)/dy,t2=(b.y+b.h-y)/dy;near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2))}if(far>=Math.max(0,near)&&far>=0&&near<hit)hit=Math.max(0,near)}return hit};
let sightMemo=new WeakMap(),spotMemo=new WeakMap();const preciseSight=seesFromUnit;
seesFromUnit=function(u,p){if(!alive(u))return false;let memo=sightMemo.get(u);if(!memo){memo=new WeakMap();sightMemo.set(u,memo)}const v=memo.get(p);if(v&&v.x===u.x&&v.y===u.y&&v.a===u.a&&v.light===u.light&&v.px===p.x&&v.py===p.y)return v.seen;const seen=preciseSight(u,p);memo.set(p,{x:u.x,y:u.y,a:u.a,light:u.light,px:p.x,py:p.y,seen});return seen};
teamSees=function(p){if(spotMemo.has(p))return spotMemo.get(p);const seen=units.some(u=>seesFromUnit(u,p));spotMemo.set(p,seen);return seen};
