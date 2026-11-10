'use strict';
/** JS/INPUT/squad-bindings.js — modularized game mechanic; loaded in manifest order. */

// Replace pointer semantics while keeping all keyboard controls on the commander.
action=function(code){if(state!=='playing'||paused)return;if(code===bindings.grenade)grenade();if(code===bindings.light)toggleLights();if(code===bindings.all||code===bindings.unit1)select(leaderId);if(code===bindings.unit2){commandGroup='alpha';select(units.findIndex(u=>u.group==='alpha'))}if(code===bindings.unit3){commandGroup='bravo';select(units.findIndex(u=>u.group==='bravo'))}if(code===bindings.stance){stanceStart=performance.now();stanceBefore=units[leaderId].stance;proneTriggered=false}};
