'use strict';
/** JS/VISION/world-light.js — modularized game mechanic; loaded in manifest order. */


function resizeWorldLight(){const ww=Math.ceil(world.width/6),hh=Math.ceil(world.height/6);worldLight.width=ww;worldLight.height=hh;fog.width=ww;fog.height=hh;worldFogPixels=fc.createImageData(ww,hh)}
