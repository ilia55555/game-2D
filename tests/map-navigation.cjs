'use strict';
/** Node smoke test: stage generation must produce navigable routes for every objective. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sources=[
 'JS/MAP/GRID/grid-data.js','JS/MAP/stage-generator.js',
 'JS/MAP/GRID/grid-collision.js','JS/MAP/PATHFINDING/direct-line.js',
 'JS/MAP/PATHFINDING/astar.js','JS/MAP/PATHFINDING/smooth-route.js',
 'JS/MAP/GENERATOR/map-validator.js'
].map(read).join('\n');
const globalStub=`let world=null,nav=null,t=0;let isBlocked=()=>false,isInsideSolid=()=>false;
const walls=[],units=[],zombies=[];function alive(u){return u.hp>0&&!u.extracted}
function actorHitbox(){return {hx:13,hy:13}};function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function clamp(x,a,b){return Math.max(a,Math.min(x,b))}
function seeded(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let n=Math.imul(s^s>>>15,1|s);n^=n+Math.imul(n^n>>>7,61|n);return((n^n>>>14)>>>0)/4294967296}}`;
const create=new Function(globalStub+'\n'+sources+'\nreturn {generateStage,stageRoutesValid};');
const {generateStage,stageRoutesValid}=create();
for(let i=1;i<=70;i++){
 const stage=generateStage(Math.imul(i,1597334677)>>>0,i);
 assert(stage.gridValid&&stage.buildings.length>0,'No objective for seed '+i);
 assert(stageRoutesValid(stage),'Unreachable objective for seed '+i);
}
console.log('PASS: 70 seeded stages with traversable objective and extraction paths');
