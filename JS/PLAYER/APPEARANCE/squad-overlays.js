'use strict';
/** JS/PLAYER/APPEARANCE/squad-overlays.js — modularized game mechanic; loaded in manifest order. */

soldier=function(u){originalSoldier(u);if(u.group==='command'&&!(u.role==='commander'&&commanderArtReady())){c.save();c.translate(u.x,u.y);c.rotate(u.a);for(const side of [-1,1])for(let j=0;j<(u.role==='commander'?3:2);j++)rr(-6+j*3,side*14-1,2,5,0,u.role==='commander'?'#e2bd68':'#aabac5');ellipse(6,0,2,2,'#dfc487');c.restore()}if(u.hit>0){c.save();c.translate(u.x,u.y);c.rotate(u.a);ellipse(0,0,19,18,'rgba(230,45,50,'+(u.hit/.42*.55)+')');c.restore()}};
