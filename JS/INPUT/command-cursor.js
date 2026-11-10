'use strict';
/** World-space command pointer is free and never clamped to the weapon barrel. */
function commandCursorWorld(){
 if(!world)return{x:cameraX,y:cameraY};
 const s=scale();
 return{x:(virtualPointer.x-W/2)/s+cameraX,y:(virtualPointer.y-(H-57)/2)/s+cameraY};
}
window.addEventListener('pointermove',()=>{
 if(movePreview?.held&&state==='playing'&&!paused&&!tacticalMapOpen)movePreview.point=commandCursorWorld();
});
