'use strict';
/** JS/ZOMBIES/BRUTE/render.js — modularized game mechanic; loaded in manifest order. */

const nightZombieDraw=zombie;zombie=function(z){if(z.special){c.save();c.translate(z.x,z.y);c.scale(1.13,1.13);c.translate(-z.x,-z.y);nightZombieDraw(z);c.restore()}else nightZombieDraw(z)};
