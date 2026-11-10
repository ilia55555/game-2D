'use strict';
/** JS/PLAYER/roles-and-weapons.js — modularized game mechanic; loaded in manifest order. */

function weaponMoveMultiplier(u){return WEAPONS[u.weapon||'carbine'].move}
function alive(u){return u&&u.hp>0&&!u.extracted}
function roleLabel(u){return u.role==='commander'?'فرمانده':u.role==='deputy'?'معاون':u.group==='alpha'?'SF':'DF'}
function taskLabel(task){return ({follow:'دنبال‌کردن',hold:'حفظ موقعیت',move:'حرکت',defend:'دفاع',cover:'پناهگیری',clear:'پاک‌سازی',search:'جست‌وجو',attack:'حمله',extract:'استخراج',retreat:'عقب‌نشینی',regroup:'تجمع',fallback:'عقب‌نشینی به پوشش'})[task]||task}
function taskOf(u){return u.task||squads[u.group]?.order||'follow'}
function selectedActors(includeControlled=false){return units.filter(u=>alive(u)&&(includeControlled||u.i!==controlledId)&&(commandGroup==='all'?(u.group!=='command'||includeControlled&&u.selected):commandGroup==='selected'?u.selected:u.group===commandGroup))}
