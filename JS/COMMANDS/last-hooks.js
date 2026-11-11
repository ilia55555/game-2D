'use strict';
/** JS/COMMANDS/last-hooks.js — modularized game mechanic; loaded in manifest order. */


const runCampaignCommand=issueCommand;issueCommand=function(i,point){runCampaignCommand(i,point);rosterStamp='';updateRoster();refreshOperators()};
$('#newCampaign').onclick=()=>{stageNumber=1;stageSeed=0;resetStage(false)};
