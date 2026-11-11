'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),calls=[];
const ctx=new Proxy({drawImage(...args){calls.push(args)}},{get:(o,k)=>o[k]||(()=>{})});
const box={Image:class{complete=true;naturalWidth=1774;naturalHeight=887},URL,document:{baseURI:'http://localhost/HTML/index.html'},c:ctx,ellipse(){},line(){},Math};vm.createContext(box);
for(const file of ['commander-renderer.js','tactical-atlas.js'])vm.runInContext(fs.readFileSync(path.join(root,'JS/PLAYER/APPEARANCE',file),'utf8'),box);
let source=null;
for(let i=0;i<64;i++){
 box.actor={x:100,y:100,a:i*Math.PI/32,phase:i,moving:i%2===0,stance:'stand',lean:0,flash:0};calls.length=0;
 vm.runInContext('drawCommander(actor)',box);assert.equal(calls.length,1,'one intact commander pose');
 const rect=calls[0].slice(1,5);if(source)assert.deepEqual(rect,source,'turning/walking must never change the commander source crop');source=rect;
}
for(let cell=0;cell<8;cell++){
 let pose=null;
 for(let phase=0;phase<5;phase++){
  calls.length=0;vm.runInContext(`drawTacticalActor(${cell},78,76,${phase},${Boolean(phase%2)})`,box);
  assert.equal(calls.length,1,'one intact draw per soldier/infected');
  const args=calls[0].slice(1);if(pose)assert.deepEqual(args,pose,'walking must not slice, warp or swap the pose');pose=args;
 }
}
console.log('PASS: continuous commander rotation; one stable, intact source pose per actor for all headings and walking phases');
