'use strict';
/** JS/VISION/base-state.js — modularized game mechanic; loaded in manifest order. */

// Visibility uses the same wall geometry for illumination, detection and targeting.
const METRE=8,BASE_VIEW=20*METRE,LIGHT_VIEW=50*METRE,LIGHT_HALF=.42;
const fog=document.createElement('canvas');fog.width=1100;fog.height=850;const fc=fog.getContext('2d');
const zombieArt=new Image();if(ZOMBIE_ASSET)zombieArt.src=ZOMBIE_ASSET;
let visibility=[],lastOrder=null,rosterStamp='';
