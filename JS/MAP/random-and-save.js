'use strict';
/** JS/MAP/random-and-save.js — modularized game mechanic; loaded in manifest order. */

function randomSeed(){return Math.floor(Math.random()*4294967296)>>>0}
function seeded(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let n=Math.imul(s^s>>>15,1|s);n^=n+Math.imul(n^n>>>7,61|n);return((n^n>>>14)>>>0)/4294967296}}
function persistCampaign(){try{localStorage.setItem('delta-campaign-v6',JSON.stringify({stage:stageNumber,seed:stageSeed,history:campaignHistory.slice(-80)}))}catch{}}
