'use strict';
/** One central equipment state drives every living team member. */
let teamVision={lights:false,nvg:false};
function syncTeamVision(){if(!world?.nvgAvailable)teamVision.nvg=false;for(const u of units)if(alive(u)){u.light=teamVision.lights;u.nvg=teamVision.nvg}}
function resetTeamVision(){teamVision={lights:world.weather!=='day',nvg:false};syncTeamVision()}
function specialTool(){const u=units[controlledId];if(!alive(u)||u.smokes<=0)return;u.smokes--;const p=commandAimPoint(190);smokeClouds.push({x:p.x,y:p.y,radius:95,life:12})}
function toggleVision(){if(!world.nvgAvailable){toggleLights();return}teamVision.nvg=!teamVision.nvg;if(teamVision.nvg)teamVision.lights=false;syncTeamVision()}
