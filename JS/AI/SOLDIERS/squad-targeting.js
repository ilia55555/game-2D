'use strict';
/** JS/AI/SOLDIERS/squad-targeting.js — modularized game mechanic; loaded in manifest order. */

chooseTarget=function(u){const target=originalChoose(u);if(!target||u.i===leaderId)return target;if(u.group==='command')return target;const squad=squads[u.group];if(!squad.fire&&distance(u,target)>85)return null;if(squad.order==='cover'&&u.cover&&!u.coverPeeking&&distance(u,target)>80)return null;return target};
