'use strict';
/** Fire discipline: a squad cannot shoot on sight until explicitly authorised.
 * A soldier in immediate danger can protect itself, but NEVER pursues its target. */
const SELF_DEFENCE_RADIUS=64;
function canAutofireAt(u,z){
  if(!alive(u)||z.dead)return false;
  const d=distance(u,z);
  const squad=squads[u.group];
  const orderedFire=Boolean(squad?.fire)||u.task==='attack'||u.task==='clear';
  const radius=orderedFire?(WEAPONS[u.weapon||'carbine']?.range||380):SELF_DEFENCE_RADIUS;
  return d<=radius&&clearSight(u,z)&&(orderedFire?seesFromUnit(u,z)||teamSees(z):true);
}
chooseTarget=function(u){
  if(!alive(u))return null;
  let chosen=null,best=Infinity;
  for(const z of zombies){
    if(!canAutofireAt(u,z))continue;
    const d=distance(u,z);
    if(d<best){best=d;chosen=z;}
  }
  return chosen;
};
