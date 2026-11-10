'use strict';
/** JS/UI/settings-behavior.js — modularized game mechanic; loaded in manifest order. */

const v4SettingsClose=closeSettings;closeSettings=function(){v4SettingsClose();setCursorMode();refreshOperators()};finish=function(won){v4Finish(won);setCursorMode();if(won)$('#endTitle').textContent=missionBuildings.filter(b=>missionTarget==='both'||b.id===missionTarget).every(b=>b.cleared)?'عملیات موفق':'تخلیه انجام شد — اهداف ناتمام';$('#endText').textContent=won?(units.some(u=>alive(u))?'تخلیه انجام شد؛ بخشی از نیروها در منطقه باقی ماندند.':'تمام نیروهای باقی‌مانده تخلیه شدند.'):'زنجیرهٔ فرماندهی از دست رفت. عملیات پایان یافت.'};
