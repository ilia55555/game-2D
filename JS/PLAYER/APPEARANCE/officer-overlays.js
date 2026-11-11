'use strict';
/** JS/PLAYER/APPEARANCE/officer-overlays.js — modularized game mechanic; loaded in manifest order. */

soldier=function(u){v4Soldier(u);if(u.role==='commander'&&!(tacticalAtlas.complete&&tacticalAtlas.naturalWidth)){c.save();c.translate(u.x,u.y);c.rotate(u.a);ellipse(3,-1,11,10,'#173f2b');ellipse(1,-4,10,6,'#285a3a');rr(7,-4,3,4,1,'#c1b18b');c.restore()}if(u.weapon==='lmg'){c.save();c.translate(u.x,u.y);c.rotate(u.a);line(36,6,42,-2,'#31383b',2);line(36,6,42,14,'#31383b',2);rr(16,10,8,10,1,'#554f3f');c.restore()}if(u.reload>0){c.save();c.translate(u.x,u.y);c.rotate(u.a);ellipse(16,12+Math.sin(t*12)*4,4,4,'#6f796b');c.restore()}};
