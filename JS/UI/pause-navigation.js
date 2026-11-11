'use strict';
/** Pause-menu navigation groups the existing controls, preserving their event handlers. */
const pausePanel=document.querySelector('#menu .panel');
const pauseTabs=document.createElement('nav');pauseTabs.className='pause-tabs';pauseTabs.setAttribute('aria-label','بخش‌های منوی توقف');
const sections=['تنظیمات','فرماندهی','عملیات','راهنما'].map((label,index)=>{
 const section=document.createElement('div');section.className='pause-page';section.id='pause-page-'+index;section.hidden=index!==0;
 const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-controls',section.id);button.setAttribute('aria-pressed',String(index===0));
 button.onclick=()=>{for(const [i,item] of sections.entries()){item.section.hidden=i!==index;item.button.setAttribute('aria-pressed',String(i===index))}};
 pauseTabs.append(button);return{section,button};
});
const details=[...pausePanel.querySelectorAll('details')],settingsGrid=pausePanel.querySelector('.menugrid');
const controls=[settingsGrid,...pausePanel.querySelectorAll(':scope > .settingsline')];
controls.forEach(e=>sections[0].section.append(e));
if(details[0]){details[0].open=true;sections[1].section.append(details[0])}
if(details[1]){details[1].open=true;sections[2].section.append(details[1])}
for(const id of ['stageInfo','newCampaign','newStage','restart'])sections[2].section.append(document.getElementById(id));
for(const node of [...pausePanel.children])if(node.tagName==='P'||node.id==='guide')sections[3].section.append(node);
pausePanel.querySelector('.line')?.remove();pausePanel.insertBefore(pauseTabs,document.getElementById('pause').nextSibling);
sections.forEach(item=>pausePanel.append(item.section));
