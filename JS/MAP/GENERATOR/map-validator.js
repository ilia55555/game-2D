'use strict';
/** Check actual soldier-safe paths before accepting a procedurally generated stage.
 * Keep this independent from terrain generation; the old global world is restored.
 */
const generatorBeforeValidation=generateStage;
function stageRoutesValid(candidate){
 if(!candidate.gridValid||candidate.buildings.length<3)return false;
 const savedWorld=world,savedNav=nav;
 try{
  world=candidate;nav=null;
  const actor={...candidate.spawn,i:-999,hp:100,hitbox:{hx:39,hy:28}};
  const goals=[candidate.extractionPoint,...candidate.buildings.map(b=>b.entry)];
  for(const destination of goals){
   if(!destination) return false;
   const path=pathTo(actor,destination);
   if(!path.length&&Math.hypot(actor.x-destination.x,actor.y-destination.y)>12)return false;
   let p=actor;
   for(const q of path){
    if(!routeSegmentClear(p,q,20))return false;
    p=q;
   }
  }
  return true;
 }finally{world=savedWorld;nav=savedNav}
}
generateStage=function(seed,index){
 let candidate;
 for(let attempt=0;attempt<24;attempt++){
  candidate=generatorBeforeValidation((seed+Math.imul(attempt,0x9e3779b9))>>>0,index);
  if(stageRoutesValid(candidate)){candidate.gridValid=true;return candidate}
 }
 throw new Error('Could not generate a connected, traversable stage after 24 attempts');
};
