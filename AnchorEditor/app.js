(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('canvas');
  const ctx = canvas.getContext('2d', {willReadFrequently:true});
  const source = document.createElement('canvas');
  const sourceCtx = source.getContext('2d', {willReadFrequently:true});

  let image = null, imageData = null, mask = null, polygon = [], anchors = [], pivot = null;
  let zoom = 1.6, mode = 'select', activeAnchor = -1, activeVertex = -1, dragging = null;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const round = v => Math.round(v * 100) / 100;
  const key = (x,y) => `${x},${y}`;

  function setStatus(title, detail='') { $('statusTitle').textContent=title; $('statusDetail').textContent=detail; }
  function setMode(next) { mode=next; document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===next)); }
  function updateLabels(){
    $('alphaValue').value=$('alphaThreshold').value;
    $('toleranceValue').value=$('colorTolerance').value;
    $('simplifyValue').value=`${$('simplify').value} px`;
    $('zoomValue').value=`${Math.round(zoom*100)}%`;
  }

  function loadFile(file){
    if(!file || !/^image\/(png|jpeg|webp)$/i.test(file.type)){ setStatus('فرمت پشتیبانی نمی‌شود','PNG، JPG یا WebP انتخاب کن.'); return; }
    const url=URL.createObjectURL(file), next=new Image();
    next.onload=()=>{
      image=next; source.width=next.naturalWidth; source.height=next.naturalHeight;
      sourceCtx.clearRect(0,0,source.width,source.height); sourceCtx.drawImage(next,0,0);
      imageData=sourceCtx.getImageData(0,0,source.width,source.height);
      polygon=[]; anchors=[]; pivot=null; activeAnchor=-1; activeVertex=-1;
      $('partName').value=file.name.replace(/\.[^.]+$/,'');
      $('stage').classList.add('ready'); URL.revokeObjectURL(url);
      buildMask(); setStatus(file.name,`${source.width} × ${source.height} پیکسل`);
    };
    next.onerror=()=>{ URL.revokeObjectURL(url); setStatus('خواندن تصویر ناموفق بود'); };
    next.src=url;
  }

  function hasUsefulAlpha(){
    const d=imageData.data; for(let i=3;i<d.length;i+=4) if(d[i]<250) return true; return false;
  }
  function cornerColors(){
    const d=imageData.data,w=source.width,h=source.height,size=Math.max(1,Math.min(8,Math.floor(Math.min(w,h)/20)));
    const corners=[[0,0],[w-size,0],[0,h-size],[w-size,h-size]], colors=[];
    for(const [sx,sy] of corners){ let r=0,g=0,b=0,n=0; for(let y=sy;y<sy+size;y++)for(let x=sx;x<sx+size;x++){const i=(y*w+x)*4;r+=d[i];g+=d[i+1];b+=d[i+2];n++;} colors.push([r/n,g/n,b/n]); }
    return colors;
  }
  function largestComponent(input){
    const w=source.width,h=source.height,seen=new Uint8Array(input.length),queue=new Int32Array(input.length); let best=[];
    for(let start=0;start<input.length;start++){
      if(!input[start]||seen[start])continue; let head=0,tail=0,component=[]; queue[tail++]=start;seen[start]=1;
      while(head<tail){const p=queue[head++];component.push(p);const x=p%w,y=(p/w)|0;
        if(x&&input[p-1]&&!seen[p-1]){seen[p-1]=1;queue[tail++]=p-1}
        if(x<w-1&&input[p+1]&&!seen[p+1]){seen[p+1]=1;queue[tail++]=p+1}
        if(y&&input[p-w]&&!seen[p-w]){seen[p-w]=1;queue[tail++]=p-w}
        if(y<h-1&&input[p+w]&&!seen[p+w]){seen[p+w]=1;queue[tail++]=p+w}
      }
      if(component.length>best.length)best=component;
    }
    const out=new Uint8Array(input.length);best.forEach(p=>out[p]=1);return out;
  }
  function buildMask(){
    if(!imageData)return;
    const w=source.width,h=source.height,d=imageData.data,alpha=+$('alphaThreshold').value,tol=+$('colorTolerance').value;
    let selected=$('maskMode').value;if(selected==='auto')selected=hasUsefulAlpha()?'alpha':'background';
    const raw=new Uint8Array(w*h), corners=cornerColors();
    for(let p=0;p<w*h;p++){
      const i=p*4;if(d[i+3]<=alpha)continue;
      if(selected==='alpha'){raw[p]=1;continue;}
      let min=Infinity;for(const c of corners){const dr=d[i]-c[0],dg=d[i+1]-c[1],db=d[i+2]-c[2];min=Math.min(min,Math.sqrt(dr*dr+dg*dg+db*db));}
      if(min>tol)raw[p]=1;
    }
    mask=largestComponent(raw); polygon=traceMask(mask); activeVertex=-1;
    const count=mask.reduce((a,b)=>a+b,0);
    if(!count)setStatus('آبجکتی پیدا نشد','روش جداسازی یا مقدار آستانه را تغییر بده.');
    else setStatus($('partName').value||'قطعه',`${polygon.length} رأس • ${count.toLocaleString('fa-IR')} پیکسل ماسک`);
    refreshAll();
  }

  function traceMask(m){
    const w=source.width,h=source.height, next=new Map();
    const add=(ax,ay,bx,by)=>{const k=key(ax,ay);if(!next.has(k))next.set(k,[]);next.get(k).push({x:bx,y:by});};
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x;if(!m[p])continue;
      if(y===0||!m[p-w])add(x,y,x+1,y);
      if(x===w-1||!m[p+1])add(x+1,y,x+1,y+1);
      if(y===h-1||!m[p+w])add(x+1,y+1,x,y+1);
      if(x===0||!m[p-1])add(x,y+1,x,y);
    }
    const loops=[];while(next.size){const firstKey=next.keys().next().value;const [sx,sy]=firstKey.split(',').map(Number);let cur={x:sx,y:sy},loop=[],guard=0;
      do{loop.push(cur);const k=key(cur.x,cur.y),choices=next.get(k);if(!choices||!choices.length)break;const n=choices.shift();if(!choices.length)next.delete(k);cur=n;guard++;}while((cur.x!==sx||cur.y!==sy)&&guard<w*h*5);
      if(loop.length>2)loops.push(loop);
    }
    if(!loops.length)return[];loops.sort((a,b)=>Math.abs(area(b))-Math.abs(area(a)));
    return simplifyClosed(loops[0],+$('simplify').value);
  }
  function area(points){let a=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];a+=p.x*q.y-q.x*p.y;}return a/2;}
  function pointLineDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y;if(!dx&&!dy)return Math.hypot(p.x-a.x,p.y-a.y);const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));}
  function rdp(points,eps){if(points.length<3)return points.slice();let max=0,index=0;for(let i=1;i<points.length-1;i++){const d=pointLineDistance(points[i],points[0],points.at(-1));if(d>max){max=d;index=i;}}if(max<=eps)return[points[0],points.at(-1)];const a=rdp(points.slice(0,index+1),eps),b=rdp(points.slice(index),eps);return a.slice(0,-1).concat(b);}
  function simplifyClosed(points,eps){if(eps<=0||points.length<5)return points;let far=1,max=0;for(let i=1;i<points.length;i++){const d=Math.hypot(points[i].x-points[0].x,points[i].y-points[0].y);if(d>max){max=d;far=i;}}const a=rdp(points.slice(0,far+1),eps),b=rdp(points.slice(far).concat(points[0]),eps);return a.slice(0,-1).concat(b.slice(0,-1));}

  function bounds(){
    if(!mask)return{x:0,y:0,width:source.width,height:source.height};let minX=source.width,minY=source.height,maxX=-1,maxY=-1;
    for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(mask[y*source.width+x]){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
    return maxX<0?{x:0,y:0,width:source.width,height:source.height}:{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1};
  }
  function exportFrame(){return $('cropOutput').checked?bounds():{x:0,y:0,width:source.width,height:source.height};}
  function anchorMeta(){return{name:$('anchorName').value.trim()||`anchor_${anchors.length+1}`,type:$('anchorType').value,what:$('anchorWhat').value.trim(),connectPart:$('connectPart').value.trim(),connectAnchor:$('connectAnchor').value.trim(),notes:$('anchorNotes').value.trim()};}
  function fillAnchor(a){if(!a)return;$('anchorName').value=a.name;$('anchorType').value=a.type;$('anchorWhat').value=a.what;$('connectPart').value=a.connectPart;$('connectAnchor').value=a.connectAnchor;$('anchorNotes').value=a.notes;}

  function outputData(){const f=exportFrame(),shift=p=>({x:round(p.x-f.x),y:round(p.y-f.y)});return{
    schema:'rabbit-rig-part@1',part_name:$('partName').value.trim()||'part',image_file:`${$('partName').value.trim()||'part'}.png`,
    source_size:{width:source.width,height:source.height},crop:{x:f.x,y:f.y,width:f.width,height:f.height},image_size:{width:f.width,height:f.height},coordinates:'cropped_image_pixels',
    pivot:pivot?shift(pivot):null,anchors:anchors.map(a=>({...anchorMetaExport(a),...shift(a)})),polygon:polygon.map(p=>{const q=shift(p);return[q.x,q.y]})};}
  function anchorMetaExport(a){return{name:a.name,type:a.type,what:a.what||'',connect_part:a.connectPart||'',connect_anchor:a.connectAnchor||'',notes:a.notes||''};}
  function buildJson(){return JSON.stringify(outputData(),null,2);}
  function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
  function buildSvg(){const d=outputData(),points=d.polygon.map(p=>p.join(',')).join(' '),extras=[];
    if(d.pivot)extras.push(`<circle id="pivot" cx="${d.pivot.x}" cy="${d.pivot.y}" r="4" fill="#ff5f6d"/>`);
    d.anchors.forEach(a=>extras.push(`<circle id="${esc(a.name)}" data-type="${esc(a.type)}" data-connect-part="${esc(a.connect_part)}" data-connect-anchor="${esc(a.connect_anchor)}" cx="${a.x}" cy="${a.y}" r="4" fill="#4da3ff"/>`));
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${d.image_size.width}" height="${d.image_size.height}" viewBox="0 0 ${d.image_size.width} ${d.image_size.height}">\n  <polygon id="mesh" points="${points}" fill="rgba(53,211,154,.18)" stroke="#35d39a" stroke-width="2"/>\n  ${extras.join('\n  ')}\n</svg>`;}
  function updateExports(){if(!image)return;$('jsonText').value=buildJson();$('svgText').value=buildSvg();}

  function refreshList(){const list=$('anchorsList');$('anchorCount').textContent=anchors.length.toLocaleString('fa-IR');list.innerHTML='';
    if(!anchors.length){list.innerHTML='<div class="empty">هنوز نقطه‌ای ثبت نشده است.</div>';return;}
    anchors.forEach((a,i)=>{const item=document.createElement('div');item.className='anchorItem'+(i===activeAnchor?' active':'');item.innerHTML=`<div class="anchorHead"><strong>${esc(a.name)}</strong><span class="pill">${esc(a.type)}</span></div><small>x: ${round(a.x)} · y: ${round(a.y)}</small><small>${esc(a.connectPart||'—')} ← ${esc(a.connectAnchor||'—')}</small>`;
      item.onclick=()=>{activeAnchor=i;activeVertex=-1;fillAnchor(a);refreshAll();};const actions=document.createElement('div');actions.className='anchorActions';const del=document.createElement('button');del.textContent='حذف';del.className='danger';del.onclick=e=>{e.stopPropagation();anchors.splice(i,1);activeAnchor=-1;refreshAll();};actions.append(del);item.append(actions);list.append(item);});}
  function refreshAll(){refreshList();updateExports();redraw();}

  function redraw(){if(!image)return;canvas.width=Math.max(1,Math.round(source.width*zoom));canvas.height=Math.max(1,Math.round(source.height*zoom));ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    if(mask&&$('showMask').checked){ctx.fillStyle='rgba(20,220,130,.25)';for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(mask[y*source.width+x])ctx.fillRect(x*zoom,y*zoom,Math.ceil(zoom),Math.ceil(zoom));}
    if(polygon.length){ctx.beginPath();polygon.forEach((p,i)=>i?ctx.lineTo(p.x*zoom,p.y*zoom):ctx.moveTo(p.x*zoom,p.y*zoom));ctx.closePath();ctx.strokeStyle='#35d39a';ctx.lineWidth=2;ctx.stroke();polygon.forEach((p,i)=>marker(p,i===activeVertex?'#ffd166':'#35d39a','',4));}
    if(pivot)marker(pivot,'#ff5f6d','P',7);anchors.forEach((a,i)=>marker(a,i===activeAnchor?'#ffd166':'#4da3ff',String(i+1),7));}
  function marker(p,color,label,r){ctx.beginPath();ctx.arc(p.x*zoom,p.y*zoom,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#071018';ctx.stroke();if(label){ctx.fillStyle='#fff';ctx.font='bold 11px Arial';ctx.fillText(label,p.x*zoom+9,p.y*zoom-8);}}
  function position(e){const rect=canvas.getBoundingClientRect();return{x:clamp((e.clientX-rect.left)*canvas.width/rect.width/zoom,0,source.width),y:clamp((e.clientY-rect.top)*canvas.height/rect.height/zoom,0,source.height)};}
  function nearest(points,p,max=11){let idx=-1,best=max/zoom;points.forEach((q,i)=>{const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<best){best=d;idx=i;}});return idx;}
  function nearestSegment(p){let best=-1,dist=Infinity;for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],d=pointLineDistance(p,a,b);if(d<dist){dist=d;best=i;}}return best;}

  canvas.addEventListener('pointerdown',e=>{if(!image)return;const p=position(e);
    if(mode==='pivot'){pivot=p;setMode('select');refreshAll();return;}
    if(mode==='anchor'){anchors.push({...anchorMeta(),...p});activeAnchor=anchors.length-1;activeVertex=-1;setMode('select');fillAnchor(anchors[activeAnchor]);refreshAll();return;}
    if(mode==='vertex'){const i=nearestSegment(p);polygon.splice(i<0?polygon.length:i+1,0,p);activeVertex=i<0?polygon.length-1:i+1;activeAnchor=-1;setMode('select');refreshAll();return;}
    if(pivot&&Math.hypot(pivot.x-p.x,pivot.y-p.y)<11/zoom){dragging={kind:'pivot'};activeAnchor=-1;activeVertex=-1;return;}
    const ai=nearest(anchors,p);if(ai>=0){activeAnchor=ai;activeVertex=-1;fillAnchor(anchors[ai]);dragging={kind:'anchor',index:ai};refreshAll();return;}
    const vi=nearest(polygon,p);if(vi>=0){activeVertex=vi;activeAnchor=-1;dragging={kind:'vertex',index:vi};refreshAll();return;}
    activeAnchor=-1;activeVertex=-1;refreshAll();});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;const p=position(e);if(dragging.kind==='pivot')pivot=p;else if(dragging.kind==='anchor')Object.assign(anchors[dragging.index],p);else Object.assign(polygon[dragging.index],p);refreshAll();});
  ['pointerup','pointercancel','pointerleave'].forEach(name=>canvas.addEventListener(name,()=>dragging=null));

  window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(!image||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete'].includes(e.key))return;let target=null;
    if(activeAnchor>=0)target=anchors[activeAnchor];else if(activeVertex>=0)target=polygon[activeVertex];
    if(e.key==='Delete'){if(activeAnchor>=0){anchors.splice(activeAnchor,1);activeAnchor=-1;}else if(activeVertex>=0&&polygon.length>3){polygon.splice(activeVertex,1);activeVertex=-1;}refreshAll();return;}
    if(!target)return;e.preventDefault();const step=e.shiftKey?10:1;if(e.key==='ArrowLeft')target.x-=step;if(e.key==='ArrowRight')target.x+=step;if(e.key==='ArrowUp')target.y-=step;if(e.key==='ArrowDown')target.y+=step;target.x=clamp(target.x,0,source.width);target.y=clamp(target.y,0,source.height);refreshAll();});

  function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);}
  $('saveJsonBtn').onclick=()=>image&&download(buildJson(),'application/json',`${$('partName').value||'part'}.json`);
  $('saveSvgBtn').onclick=()=>image&&download(buildSvg(),'image/svg+xml',`${$('partName').value||'part'}.svg`);
  $('savePngBtn').onclick=()=>{if(!image||!mask)return;const f=exportFrame(),out=document.createElement('canvas');out.width=f.width;out.height=f.height;const o=out.getContext('2d'),data=new ImageData(f.width,f.height),src=imageData.data;
    for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++){const sp=(y+f.y)*source.width+x+f.x,si=sp*4,di=(y*f.width+x)*4;data.data[di]=src[si];data.data[di+1]=src[si+1];data.data[di+2]=src[si+2];data.data[di+3]=mask[sp]?src[si+3]:0;}o.putImageData(data,0,0);out.toBlob(blob=>blob&&download(blob,'image/png',`${$('partName').value||'part'}.png`),'image/png');};
  $('applyAnchorBtn').onclick=()=>{if(activeAnchor<0){alert('ابتدا یک Anchor را انتخاب کن.');return;}Object.assign(anchors[activeAnchor],anchorMeta());refreshAll();};
  $('applySvgBtn').onclick=()=>{if(!image)return;const match=$('svgText').value.match(/<polygon\b[^>]*\bpoints\s*=\s*["']([^"']+)["']/i);if(!match){alert('Polygon معتبر پیدا نشد.');return;}const f=exportFrame(),pts=match[1].trim().split(/\s+/).map(pair=>pair.split(',').map(Number)).filter(p=>p.length===2&&p.every(Number.isFinite)).map(([x,y])=>({x:x+f.x,y:y+f.y}));if(pts.length<3){alert('Polygon باید حداقل سه نقطه داشته باشد.');return;}polygon=pts;activeVertex=-1;refreshAll();};
  $('resetBtn').onclick=()=>{if(!image)return;anchors=[];pivot=null;activeAnchor=-1;activeVertex=-1;buildMask();};
  $('buildMaskBtn').onclick=buildMask;$('fileInput').onchange=e=>loadFile(e.target.files[0]);
  document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
  ['alphaThreshold','colorTolerance','simplify'].forEach(id=>$(id).oninput=()=>{updateLabels();if(image)buildMask();});
  $('maskMode').onchange=()=>image&&buildMask();$('zoom').oninput=()=>{zoom=+$('zoom').value/100;updateLabels();redraw();};
  $('cropOutput').onchange=updateExports;$('showMask').onchange=redraw;$('partName').oninput=()=>{updateExports();if(image)setStatus($('partName').value||'قطعه',`${source.width} × ${source.height} پیکسل`);};
  const stage=$('stage');['dragenter','dragover'].forEach(n=>stage.addEventListener(n,e=>{e.preventDefault();$('welcome').classList.add('drag');}));['dragleave','drop'].forEach(n=>stage.addEventListener(n,e=>{e.preventDefault();$('welcome').classList.remove('drag');}));stage.addEventListener('drop',e=>loadFile(e.dataTransfer.files[0]));
  updateLabels();setMode('select');
})();
