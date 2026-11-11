'use strict';
/** Capacity is per obstacle, shared across its sides. Reservations never move an idle actor. */
function maintainReservations(){
 for(const [id,owner] of coverReservations){const u=units[owner];if(!alive(u)||u.coverSlot!==id||u.task!=='cover'){coverReservations.delete(id);const slot=coverSlots.find(s=>s.id===id);if(slot)slot.owner=null}}
}
function coverCandidates(u,obstacle){
 const known=zombies.filter(z=>!z.dead&&teamSees(z)).sort((a,b)=>distance(a,u)-distance(b,u));
 const threat=known[0]||{x:u.x+Math.cos(u.a)*300,y:u.y+Math.sin(u.a)*300};
 const w=obstacle,cx=w.x+w.w/2,cy=w.y+w.h/2,capacity=w.capacity||1,out=[];
 for(let slot=0;slot<capacity;slot++){
  const ratio=(slot+.5)/capacity;
  const options=[
   {hide:{x:w.x+w.w*ratio,y:w.y-54},peek:{x:slot%2?w.x+w.w+55:w.x-55,y:w.y-54}},
   {hide:{x:w.x+w.w*ratio,y:w.y+w.h+54},peek:{x:slot%2?w.x+w.w+55:w.x-55,y:w.y+w.h+54}},
   {hide:{x:w.x-54,y:w.y+w.h*ratio},peek:{x:w.x-54,y:slot%2?w.y+w.h+55:w.y-55}},
   {hide:{x:w.x+w.w+54,y:w.y+w.h*ratio},peek:{x:w.x+w.w+54,y:slot%2?w.y+w.h+55:w.y-55}}
  ];
  for(const item of options){
   if(isBlocked(item.hide.x,item.hide.y,50)||isBlocked(item.peek.x,item.peek.y,50))continue;
   if(units.some(v=>v!==u&&alive(v)&&distance(v,item.hide)<105))continue;
   const hidden=distance(item.hide,threat)>distance({x:cx,y:cy},threat);
   const cost=distance(u,item.hide)+(hidden?0:180)+(known.length&&clearSight(item.hide,threat)?180:0);
   out.push({...item,box:{x:item.hide.x-16,y:item.hide.y-16,w:32,h:32},id:w.id+':'+slot,obstacle:w.id,owner:null,threat,cost});
  }
 }
 return out.sort((a,b)=>a.cost-b.cost);
}
function assignReservedCover(actors){
 maintainReservations();
 for(const u of actors.filter(alive)){
  clearCover(u);u.fireLane=null;u.path=[];u.routeGoal=null;u.task='cover';
  const candidates=walls.filter(w=>w.cover&&!w.tree).flatMap(w=>coverCandidates(u,w)).sort((a,b)=>a.cost-b.cost);
  let assigned=false;
  for(const slot of candidates){
   if(coverReservations.has(slot.id)||coverSlots.some(s=>s.owner!==null&&distance(s.hide,slot.hide)<105))continue;
   const route=pathTo(u,slot.hide,true);if(!route.length&&distance(u,slot.hide)>10)continue;
   slot.owner=u.i;coverSlots=coverSlots.filter(s=>s.id!==slot.id);coverSlots.push(slot);coverReservations.set(slot.id,u.i);
   u.coverSlot=slot.id;u.cover=slot;u.stance='crouch';u.coverPeeking=false;setRoute(u,slot.hide,true);assigned=true;break;
  }
  // Insufficient space: hold behind the formation, never share a reserved slot.
  if(!assigned){u.task='hold';u.orderBlocked=true;}
 }
}
