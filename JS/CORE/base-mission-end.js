'use strict';
/** JS/CORE/base-mission-end.js — modularized game mechanic; loaded in manifest order. */

function finish(won){state=won?'won':'lost';clearInput();$('#menu').hidden=true;$('#settings').hidden=true;$('#end').hidden=false;$('#endTitle').textContent=won?'منطقه آزاد شد':'عملیات ناموفق';$('#endText').textContent=won?'ارتباط برقرار شد. عملیات پایان یافت.':'تیم از دست رفت. دوباره تلاش کن.'}
