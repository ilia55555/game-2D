'use strict';
/** JS/EXTRACTION/evacuation-orders.js — modularized game mechanic; loaded in manifest order. */

function assignEvacuation(actors){const points=formationPoints('defensive',Math.max(1,actors.length)),used=[];actors.forEach((u,i)=>{const p=safeGoal({x:extraction.point.x+points[i].x*.8,y:extraction.point.y+points[i].y*.8},used);if(p){used.push(p);u.evacGoal=p;setRoute(u,p,true)}})}
