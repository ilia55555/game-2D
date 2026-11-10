'use strict';
/** JS/MAP/starting-geometry.js — modularized game mechanic; loaded in manifest order. */

const walls=[{x:80,y:70,w:260,h:30},{x:80,y:70,w:30,h:230},{x:80,y:290,w:95,h:25},{x:250,y:290,w:90,h:25},{x:320,y:70,w:20,h:115},{x:320,y:245,w:20,h:70},{x:770,y:70,w:245,h:28},{x:990,y:70,w:25,h:245},{x:770,y:290,w:95,h:25},{x:940,y:290,w:75,h:25},{x:770,y:70,w:22,h:115},{x:770,y:245,w:22,h:70},{x:80,y:390,w:260,h:24},{x:80,y:390,w:25,h:180},{x:80,y:550,w:100,h:22},{x:255,y:550,w:85,h:22},{x:320,y:390,w:20,h:180},{x:770,y:390,w:245,h:24},{x:990,y:390,w:25,h:180},{x:770,y:550,w:100,h:22},{x:945,y:550,w:70,h:22},{x:770,y:390,w:22,h:180},{x:442,y:355,w:62,h:36},{x:607,y:473,w:70,h:34}];
const zone={x:550,y:170,r:72};const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
