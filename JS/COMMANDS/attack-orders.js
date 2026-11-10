'use strict';
/** JS/COMMANDS/attack-orders.js — modularized game mechanic; loaded in manifest order. */

function attackOrder(p){clearInput();mode='tactical';units.forEach(u=>u.selected=u.hp>0);const target=zombies.find(z=>!z.dead&&teamSees(z)&&distance(z,p)<28);let goal={x:clamp(p.x,80,1020),y:clamp(p.y,75,790)};if(isBlocked(goal.x,goal.y,20)){const options=[];for(let r=25;r<=140;r+=22)for(let a=0;a<Math.PI*2;a+=Math.PI/8){const q={x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r};if(!isBlocked(q.x,q.y,20))options.push(q)}goal=options.sort((a,b)=>distance(a,p)-distance(b,p))[0];if(!goal)return}order(goal);units.forEach(u=>{if(u.hp>0){u.attackGoal={x:goal.x,y:goal.y};u.attackTarget=target||null}});lastOrder={x:goal.x,y:goal.y,time:t};syncControls();updateRoster()}
