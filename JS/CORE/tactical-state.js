'use strict';
/** JS/CORE/tactical-state.js — modularized game mechanic; loaded in manifest order. */




// SF / DF: autonomous tasks, limited cover capacity, independent perception and extraction.
let controlledId=0,formation='spread',coverSlots=[],coverReservations=new Map(),noiseEvents=[],extraction=null,districts=[],missionTarget='both',missionBuildings=[],perceptionTick=0,zoneTick=0,infectionTick=45,virtualPointer={x:0,y:0},lastMouseWorld={x:550,y:350};
const WEAPONS={carbine:{name:'M4',damage:38,range:380,spread:.025,mag:30,reload:2,interval:.14,move:1},smg:{name:'MP5',damage:25,range:230,spread:.04,mag:32,reload:1.5,interval:.085,move:1.13},marksman:{name:'DMR',damage:88,range:570,spread:.009,mag:12,reload:2.7,interval:.48,move:.88},lmg:{name:'M249',damage:43,range:460,spread:.045,mag:70,reload:4.1,interval:.12,move:.74}};
defaults.reload='KeyR';actionNames.reload='تعویض خشاب';bindings.reload??='KeyR';
