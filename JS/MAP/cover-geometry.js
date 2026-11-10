'use strict';
/** JS/MAP/cover-geometry.js — modularized game mechanic; loaded in manifest order. */

const extraCrates=[{x:390,y:420,w:36,h:38,cover:true,capacity:1},{x:690,y:600,w:36,h:38,cover:true,capacity:1},{x:138,y:450,w:36,h:38,cover:true,capacity:1},{x:840,y:444,w:36,h:38,cover:true,capacity:1}];walls.push(...extraCrates);walls.forEach((w,i)=>{w.id='obstacle-'+i;if(w.cover||i===22||i===23){w.cover=true;w.capacity??=2}});
