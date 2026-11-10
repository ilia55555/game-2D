'use strict';
/** Last-stage wrapper: no bullet can be spawned through an allied body. */
const shootBeforeLineSafety=shoot;
shoot=function(u,target){
 if(!u||!target||!alive(u)||u.fire>0)return;
 const ally=allyInShotLine(u,target);
 if(ally){
  if(fireOrderAllowsSidestep(u))requestSafeFireLane(u,target);
  else if(u.i===controlledId&&t>=(u.nextFriendlyWarning||0)){
   u.nextFriendlyWarning=t+1.5;notify('خط آتش بسته است؛ سرباز خودی جلو قرار دارد');
  }
  return;
 }
 const previousCount=bullets.length;
 shootBeforeLineSafety(u,target);
 for(let k=previousCount;k<bullets.length;k++)bullets[k].ownerId=u.i;
};
