'use strict';
/** JS/UI/squad-settings.js — modularized game mechanic; loaded in manifest order. */

$('#squadSize').onchange=e=>{squadCount=clamp(Number(e.target.value),5,12);try{localStorage.setItem('delta-team-size',String(squadCount))}catch{}reset()};$('#manual').onclick=()=>{};$('#all').onclick=()=>select(leaderId);$('#restart').onclick=reset;$('#retry').onclick=reset;
const oldCaptureBinding=captureBinding;captureBinding=function(code){if(code==='Mouse1'||code==='Mouse2'){notify('کلیک وسط و راست برای فرمان‌های تیم رزرو شده‌اند.');return}oldCaptureBinding(code)};
