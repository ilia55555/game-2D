'use strict';
/** JS/ZONES/danger-districts.js — modularized game mechanic; loaded in manifest order. */

function makeStageDistricts(){const w=world.width,h=world.height;return[{id:'green',name:'ورود',x:40,y:h*.77,w:w-80,h:h*.23-40,risk:0},{id:'yellow',name:'محوطه',x:40,y:h*.47,w:w-80,h:h*.30,risk:1},{id:'red',name:'ناحیهٔ غرب',x:40,y:40,w:w/2-40,h:h*.47-40,risk:2},{id:'black',name:'ناحیهٔ شرق',x:w/2,y:40,w:w/2-40,h:h*.47-40,risk:3}]}
