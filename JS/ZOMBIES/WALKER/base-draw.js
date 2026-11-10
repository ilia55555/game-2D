'use strict';
/** JS/ZOMBIES/WALKER/base-draw.js — modularized game mechanic; loaded in manifest order. */

function zombie(z){c.save();c.translate(z.x,z.y);c.rotate(z.a);ellipse(3,5,20,14,'#131c1644');const k=Math.sin(z.phase)*6;rr(-12+k,-12,18,7,3,'#383e34');rr(-12-k,5,18,7,3,'#30392e');rr(-8,-13,20,26,6,'#65705a','#303c30');line(4,-12,23,-12+Math.sin(z.phase)*2,'#a0a17a',6);line(4,12,24,12-Math.sin(z.phase)*2,'#939c72',6);ellipse(7,0,10,9,'#a0a77e');rr(13,-6,3,3,1,'#e2ad72');rr(13,3,3,3,1,'#e2ad72');c.restore()}
