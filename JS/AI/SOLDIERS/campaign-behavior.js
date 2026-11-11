'use strict';
/** Strict order-driven soldier AI. Idle, HOLD, DEFEND without a travel path,
 * and all officers remain still until the player issues a command. */
function planSquads(){
  maintainReservations();
  const anchor=followAnchor();
  for(const u of units){
    if(!alive(u)||u.i===controlledId)continue;
    const task=u.task||'hold';
    if(task==='hold')continue;
    if(task==='follow'){
      const group=squads[u.group];
      if(!group)continue;
      if(!group.followAnchor||distance(anchor,group.followAnchor)>60||group.followRevision!==formationRevision){
        const followers=units.filter(v=>alive(v)&&v.group===u.group&&v.task==='follow'&&!v.isOfficer);
        assignFormation(followers,anchor,'follow',anchor.a);
        group.followAnchor={...anchor};group.followRevision=formationRevision;
      }
      continue;
    }
    if(task==='cover'){
      if(!u.cover){assignReservedCover([u]);continue;}
      const authorised=u.firePermission??squads[u.group]?.fire;
      const target=zombies.find(z=>!z.dead&&teamSees(z)&&distance(z,u)<visionRange(u)&&clearSight(u.cover.peek,z));
      const peek=Boolean(authorised&&target&&((t+u.i*.43)%3.6)<1.7);
      const goal=peek?u.cover.peek:u.cover.hide;
      u.coverPeeking=peek;u.stance=peek?'stand':'crouch';
      if(distance(u,goal)>8&&(!u.path?.length||!u.routeGoal||distance(u.routeGoal,goal)>8))setRoute(u,goal,true);
      continue;
    }
    if(task==='clear'||task==='search'){
      if(u.path?.length)continue;
      const building=task==='clear'
        ?missionBuildings.find(b=>b.id===u.assignedBuilding)
        :missionBuildings[(u.searchStep||0)%missionBuildings.length];
      if(!building){u.task='hold';continue;}
      if(task==='clear'&&building.cleared){u.task='hold';continue;}
      const spots=[
        {x:building.x+32,y:building.y+32},
        {x:building.x+building.w-32,y:building.y+32},
        {x:building.x+building.w-32,y:building.y+building.h-32},
        {x:building.x+32,y:building.y+building.h-32}
      ];
      const step=(u.searchStep||0)%spots.length;
      const goal=safeGoal(spots[step]);
      if(goal&&setRoute(u,goal,true))u.searchStep=(u.searchStep||0)+1;
      else u.task='hold';
      continue;
    }
    if(task==='extract'){
      if(!u.path?.length&&u.evacGoal&&distance(u,u.evacGoal)>12&&(!u.routeGoal||distance(u.routeGoal,u.evacGoal)>10))setRoute(u,u.evacGoal);
      continue;
    }
    // Move, attack, defend, retreat and regroup are one-shot orders.
    if(['move','attack','defend','regroup','retreat','fallback'].includes(task)&&!u.path?.length){
      if(!u.routeGoal||distance(u,u.routeGoal)<12){
        u.task=task==='defend'?'defend':'hold';
        u.routeGoal=null;
        u.orderAnchor={x:u.x,y:u.y};
      }
    }
  }
}
