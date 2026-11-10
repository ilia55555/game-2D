'use strict';
/** JS/AI/SOLDIERS/cover-ownership.js — modularized game mechanic; loaded in manifest order. */

function clearCover(u){if(u.coverSlot){coverReservations.delete(u.coverSlot);const s=coverSlots.find(s=>s.id===u.coverSlot);if(s?.owner===u.i)s.owner=null}u.coverSlot=null;u.cover=null;u.coverPeeking=false}
