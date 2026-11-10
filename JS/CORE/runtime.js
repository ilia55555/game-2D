'use strict';
/** JS/CORE/runtime.js — modularized game mechanic; loaded in manifest order. */
'use strict';
const $=s=>document.querySelector(s),canvas=$('#game'),c=canvas.getContext('2d');
let W=0,H=0,dpr=1,zoom=1.08,last=0,t=0,rounds=0,audio,mode='tactical',active=0,held=false,paused=false,state='playing',capture=0,kills=0,toastTime=0;
let mouse={x:550,y:200},keys=new Set(),units=[],zombies=[],bullets=[],particles=[],casings=[],marks=[],grenades=[],explosions=[],corpses=[],waypoints=[];
