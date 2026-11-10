'use strict';
/** JS/CORE/campaign-state.js — modularized game mechanic; loaded in manifest order. */


// Procedural stages and stable squad navigation.
let stageNumber=1,stageSeed=0,world=null,cameraX=550,cameraY=425,autoRetreat=false,movePreview=null,smokeClouds=[],nav=null,geometryGrid=new Map(),geometryStamp=1,rayMarks=[],formationRevision=0;
const v5Reset=reset,v5Draw=draw,v5Shoot=shoot,v5ZombieUpdate=updateZombies,v5Soldier=soldier,v5Issue=issueCommand;
const worldLight=document.createElement('canvas'),worldLightCtx=worldLight.getContext('2d',{willReadFrequently:true});let worldFogPixels=null;
let campaignHistory=[];try{const saved=JSON.parse(localStorage.getItem('delta-campaign-v6')||'null');if(saved){stageNumber=saved.stage||1;stageSeed=saved.seed>>>0;campaignHistory=saved.history||[]}}catch{}
