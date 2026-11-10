'use strict';
/** JS/TEAM/squad-state.js — modularized game mechanic; loaded in manifest order. */



// Commander, two squads, independent rules of engagement and a held command wheel.
let squadCount=7,leaderId=0,deputyId=null,commandGroup='all',damagePulse=0,damageBlood=[],wheel={open:false,x:0,y:0,hover:-1},lastAIPlan=0;
try{const saved=Number(localStorage.getItem('delta-team-size'));if(saved>=5&&saved<=12&&Number.isInteger(saved))squadCount=saved}catch{}
const squads={alpha:{order:'hold',fire:false,searchIndex:0},bravo:{order:'follow',fire:true,searchIndex:0}};
const originalReset=reset,originalUpdate=update,originalDraw=draw,originalSoldier=soldier,originalSync=syncControls,originalChoose=chooseTarget;
walls.push({x:375,y:588,w:82,h:23,cover:true},{x:650,y:588,w:82,h:23,cover:true});
