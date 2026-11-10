'use strict';
/** JS/CORE/keyboard-state.js — modularized game mechanic; loaded in manifest order. */

const names=['VIPER','GHOST','REAPER','FALCON','NOMAD','WOLF'],roles=['دلتا · فرمانده','دلتا · تیرانداز','دلتا · پشتیبان','ویژه · پیشرو','ویژه · تیرانداز','ویژه · پشتیبان'];
const defaults={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',stance:'KeyC',leanLeft:'KeyQ',leanRight:'KeyE',grenade:'KeyG',manual:'KeyF',all:'KeyT',pause:'Escape',light:'KeyL',unit1:'Digit1',unit2:'Digit2',unit3:'Digit3',unit4:'Digit4',unit5:'Digit5',unit6:'Digit6',fire:'Mouse0'};
const actionNames={up:'حرکت به بالا',down:'حرکت به پایین',left:'حرکت به چپ',right:'حرکت به راست',stance:'نشستن / نگه‌دار: درازکش',leanLeft:'لین چپ (نگه‌دار)',leanRight:'لین راست (نگه‌دار)',grenade:'پرتاب نارنجک',manual:'تغییر حالت کنترل',all:'انتخاب کل تیم',pause:'منوی توقف',light:'چراغ‌قوه',unit1:'نیروی ۱',unit2:'نیروی ۲',unit3:'نیروی ۳',unit4:'نیروی ۴',unit5:'نیروی ۵',unit6:'نیروی ۶',fire:'شلیک دستی'};
let bindings={...defaults};try{const v=JSON.parse(localStorage.getItem('delta-bindings-night-v3'));if(v&&Object.keys(defaults).every(k=>typeof v[k]==='string')&&new Set(Object.values(v)).size===Object.keys(defaults).length)bindings=v}catch{}
let listening=null,stanceStart=null,stanceBefore='stand',proneTriggered=false;
