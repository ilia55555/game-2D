'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'HTML/index.html'),'utf8');
assert(!/<style\b/i.test(html),'CSS must be external');
assert(!/<script\s*>/i.test(html),'JS must be external');
assert(!/data:image\//i.test(html),'Do not inline sprites');
for(const match of html.matchAll(/(?:src|href)="(\.\.\/[^\"]+)"/g)){
 const target=path.resolve(root,'HTML',match[1]);
 assert(fs.existsSync(target),'Missing referenced file: '+target);
}
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,ent.name);if(ent.isDirectory())walk(file);else if(file.endsWith('.js'))execFileSync(process.execPath,['--check',file]);}}
walk(path.join(root,'JS'));
assert(fs.existsSync(path.join(root,'ASSETS/ZOMBIES/WALKER/zombie-walk.png')));
for(const folder of ['WEAPONS','ZOMBIES','UI','AMBIENCE']) assert(fs.existsSync(path.join(root,'SOUNDS',folder,'README.md')));
console.log('PASS: module paths, image assets, JS syntax and sound directory structure');

const css=[...html.matchAll(/<link rel="stylesheet" href="\.\.\/([^"]+)"/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
for(const selector of ['.modal{','button.action{','.ops-grid{','#roster{','@media('])assert(css.includes(selector),'Broken migrated CSS selector: '+selector);
assert(fs.existsSync(path.join(root,'ASSETS/CHARACTERS/tactical-atlas.png')));
console.log('PASS: repaired overlay/menu selectors and tactical atlas');
