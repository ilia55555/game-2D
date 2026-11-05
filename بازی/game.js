import {createFrame, clearFrame, createFx, composite} from './vendor/pixelfx/src/core/index.js';
import * as flamethrower from './vendor/pixelfx/src/fx/fire/flamethrower.js';
import * as fireTornado from './vendor/pixelfx/src/fx/fire/fire-tornado.js';
import * as clouds from './vendor/pixelfx/src/fx/weather/clouds.js';
import * as heartPickup from './vendor/pixelfx/src/fx/pickups/heart-pickup.js';
'use strict';
// Character-focused 2D prototype. No external libraries, random spell shows,
// asynchronous effects or artificial sprites. All movement is one coherent rig.
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  const W = 960, H = 540, GROUND = 433, WORLD_W = 2170, GRAVITY = 1580;
  const PI = Math.PI, TAU = PI * 2;
  const keys = new Set(), sparks = [];
  // Actual PixelFX animation buffers, rasterized at 320 x 180 then enlarged 3x.
  // This avoids both hand-painted substitutes and random effect spawning.
  const FX_W = 320, FX_H = 180;
  const skyFrame=createFrame(FX_W, FX_H), fxFrame=createFrame(FX_W, FX_H);
  const layer=document.createElement('canvas');layer.width=FX_W;layer.height=FX_H;
  const layerCtx=layer.getContext('2d'), rgba=layerCtx.createImageData(FX_W,FX_H);
  const cloudFx=createFx(clouds,{x:160,y:180,seed:7});
  const FIRE_COLORS=['#4a1712','#8a1f17','#c9281f','#f2561d','#ff8a2a','#ffc23d','#ffe26b','#fff3a6','#ffffff'];
  let flameFx=null, flameStopping=false, tornados=[], heart=null, flameHitT=0, cloudClock=0;
  function drawPixelFx(frame){
    composite(frame,rgba.data,null);
    layerCtx.putImageData(rgba,0,0);
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(layer,0,0,W,H);ctx.restore();
  }
  function fxPlace(instance,wx,wy,flip=false){
    instance.options.x=(wx-cam.x)/3;
    instance.options.y=wy/3;
    instance.options.flip=flip;
  }
  function heroPalm(){
    const m=getMotion(hero,hero.state,hero.stateT);
    // Same shoulder, wrist, facing and pose math as drawActor().
    return {x:hero.x+hero.facing*(m.handF+7),y:hero.y+m.handFY};
  }
  function resetMagic(){
    flameFx=null;flameStopping=false;tornados=[];flameHitT=0;
    heart={x:520,y:GROUND-3,collected:false,respawn:0,
      fx:createFx(heartPickup,{x:0,y:0,seed:4})};
  }
  function castTornado(){
    if(preview||paused||hero.dead||hero.attack||hero.hurt>0||hero.castT>0||hero.tornadoCd>0)return;
    const x=clamp(hero.x+hero.facing*145,70,WORLD_W-70);
    const surface=platforms.find(p=>x>p.x&&x<p.x+p.w&&hero.y<=p.y+45);
    const y=surface?.y??GROUND;
    tornados.push({x,y,vx:hero.facing*38,time:0,life:3.1,hitT:0,stopping:false,
      fx:createFx(fireTornado,{x:0,y:0,flip:hero.facing<0,palette:FIRE_COLORS,height:80})});
    hero.castT=.58;hero.tornadoCd=5.2;
  }
  function updateMagic(dt){
    cloudFx.update(dt);cloudClock+=dt;
    if(hero.tornadoCd>0)hero.tornadoCd=Math.max(0,hero.tornadoCd-dt);
    if(hero.castT>0)hero.castT=Math.max(0,hero.castT-dt);
    const casting=!preview&&!paused&&!hero.dead&&hero.hurt<=0&&!hero.attack&&hero.castT<=0&&keys.has('KeyF');
    if(casting&&!flameFx){
      flameFx=createFx(flamethrower,{x:0,y:0,flip:hero.facing<0,palette:FIRE_COLORS,reach:112,speed:280});
      flameStopping=false;flameHitT=0;
    }
    if(!casting&&flameFx&&!flameStopping){flameFx.stop();flameStopping=true}
    if(flameFx){
      const hand=heroPalm();fxPlace(flameFx,hand.x,hand.y,hero.facing<0);
      flameFx.update(dt);
      if(flameStopping&&flameFx.done())flameFx=null;
      if(casting){
        flameHitT-=dt;
        if(flameHitT<=0){
          flameHitT=.34;
          const along=(enemy.x-hand.x)*hero.facing;
          const height=Math.abs((enemy.y-enemy.h*.53)-hand.y);
          if(!enemy.dead && along>0 && along<335 && height<68){
            actorDamage(enemy,13,hero,enemy.x,enemy.y-enemy.h*.54);
          }
        }
      }
    }
    for(let i=tornados.length-1;i>=0;i--){
      const t=tornados[i];t.time+=dt;t.x+=t.vx*dt;
      if(t.time>=t.life&&!t.stopping){t.fx.stop();t.stopping=true}
      fxPlace(t.fx,t.x,t.y,t.vx<0);t.fx.update(dt);
      if(!t.stopping){
        t.hitT-=dt;
        if(t.hitT<=0){t.hitT=.43;
          if(!enemy.dead&&Math.abs(enemy.x-t.x)<72&&Math.abs(enemy.y-t.y)<95){
            actorDamage(enemy,18,hero,enemy.x,enemy.y-enemy.h*.52);
          }
        }
      }
      if(t.stopping&&t.fx.done())tornados.splice(i,1);
    }
    if(heart){
      if(heart.collected){
        heart.respawn-=dt;
        if(heart.respawn<=0){heart.collected=false;heart.fx=createFx(heartPickup,{x:0,y:0,seed:4})}
      }else{
        if(!hero.dead&&hero.hp<hero.maxHp&&Math.abs(hero.x-heart.x)<35&&Math.abs(hero.y-heart.y)<50){
          hero.hp=Math.min(hero.maxHp,hero.hp+35);
          heart.collected=true;heart.respawn=18;
          impact(heart.x,heart.y-30,'heal');updateHud();
        }else{fxPlace(heart.fx,heart.x,heart.y);heart.fx.update(dt)}
      }
    }
  }
  function drawClouds(){
    clearFrame(skyFrame);
    cloudFx.draw(skyFrame);
    drawPixelFx(skyFrame);
  }
  function drawSpells(){
    clearFrame(fxFrame);
    // Two real attacks and one real healing pickup, with no unrelated VFX.
    for(const t of tornados)t.fx.draw(fxFrame);
    if(heart&&!heart.collected)heart.fx.draw(fxFrame);
    if(flameFx)flameFx.draw(fxFrame);
    drawPixelFx(fxFrame);
  }

  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b-a)*t;
  const ease = x => { x=clamp(x,0,1); return x*x*(3-2*x); };
  const dist = (a,b) => Math.abs(a-b);
  let hero, enemy, cam = {x:0}, clock=0, previewClock=0, paused=false, preview=false;
  let fixedAccumulator=0, lastFrame=performance.now(), frameN=0, notifyT=0;
  const platforms = [
    {x:560,y:340,w:210,h:20},
    {x:1125,y:315,w:210,h:20},
    {x:1600,y:351,w:230,h:20}
  ];
  const ANIMATIONS = [
    ['auto','خودکار (گیم‌پلی)'], ['idle','ایستادن / تنفس'],
    ['walk','راه رفتن'], ['run','دویدن'], ['crouch','نشستن'],
    ['jump','پرش'], ['doubleJump','پرش دوبل'], ['fall','سقوط'],
    ['land','فرود'], ['dash','دش'], ['light','حملهٔ سبک'],
    ['combo','ضربهٔ دوم / کمبو'], ['heavy','حملهٔ سنگین'],
    ['block','دفاع'], ['hurt','ضربه خوردن'],
    ['defeat','مرگ'], ['respawn','بازگشت به میدان'],
    ['flame','شعله‌افکن از کف دست'], ['tornado','احضار گردباد آتش']
  ];
  const statesFa = Object.fromEntries(ANIMATIONS);
  for (const id of ['heroAnim', 'enemyAnim']) {
    $(id).innerHTML = ANIMATIONS.map(([k,v]) => `<option value="${k}">${v}</option>`).join('');
  }
  const TIMING = {light:.46, combo:.57, heavy:.78};
  function makeActor(kind, x) {
    return {
      kind, x, y:GROUND, vx:0, vy:0, facing:kind==='hero'?1:-1,
      w:kind==='hero'?27:34, h:kind==='hero'?108:116,
      hp:kind==='hero'?100:160, maxHp:kind==='hero'?100:160,
      state:'idle', stateT:0, onGround:true, jumps:0, jumpVisual:0,
      coyote:0, jumpBuffer:0, landed:0, dashTime:0, dashCd:0,
      attack:null, attackCd:0, queuedCombo:false,
      guard:0, guardCd:0, hurt:0, invuln:0,
      dead:false, deathT:0, respawnT:0, cycle:0, targetX:x,
      prevX:x, prevY:GROUND, contactNote:0,castT:0,tornadoCd:0
    };
  }
  function reset() {
    hero=makeActor('hero',300); enemy=makeActor('enemy',745);
    enemy.targetX=870;
    sparks.length=0; keys.clear(); paused=false; preview=false;resetMagic();
    clock=0;previewClock=0;cam.x=0;fixedAccumulator=0;
    $('pauseOverlay').classList.add('hidden');
    $('inspector').classList.add('hidden');
    $('inspectorBtn').textContent='تست انیمیشن  I';
    $('pauseBtn').textContent='توقف  P';
    $('heroAnim').value='auto';$('enemyAnim').value='auto';
    updateHud();canvas.focus({preventScroll:true});
  }
  function stateFor(a) {
    if (a.dead) return 'defeat';
    if (a.respawnT>0) return 'respawn';
    if (a.hurt>0) return 'hurt';
    if (a.attack) return a.attack.type;
    if(a.kind==='hero'&&a.castT>0)return 'tornado';
    if(a.kind==='hero'&&keys.has('KeyF')&&!preview)return 'flame';
    if (a.guard>0 || (a.kind==='hero' && keys.has('KeyL') && a.onGround)) return 'block';
    if (a.dashTime>0) return 'dash';
    if (a.landed>0) return 'land';
    if (!a.onGround) return a.jumpVisual>0?'doubleJump':a.vy<15?'jump':'fall';
    if (a.kind==='hero' && keys.has('KeyS')) return 'crouch';
    if (Math.abs(a.vx)>175) return 'run';
    if (Math.abs(a.vx)>18) return 'walk';
    return 'idle';
  }
  function updateState(a,dt) {
    const next=stateFor(a);
    if (a.state!==next) {a.state=next;a.stateT=0;}
    else a.stateT+=dt;
  }
  function jump(a) {
    if (preview || paused || a.dead || a.hurt>0.08 || a.attack || a.dashTime>0) return;
    if (a.onGround || a.coyote>0) {
      a.vy=-505;a.onGround=false;a.coyote=0;a.jumps=1;a.jumpVisual=0;a.landed=0;
    } else if (a.jumps<2 && a.kind==='hero') {
      a.vy=-455;a.jumps=2;a.jumpVisual=.25;a.landed=0;
    }
  }
  function dash(a) {
    if(preview || paused || a.dead || a.dashCd>0 || a.attack) return;
    a.dashTime=.20;a.dashCd=.75;a.vx=a.facing*465;a.vy=Math.min(a.vy,60);
    a.invuln=Math.max(a.invuln,.22);
  }
  function beginAttack(a,type) {
    if(preview || paused || a.dead || a.hurt>0 || a.guard>0 || a.dashTime>0 || (a.kind==='hero'&&(keys.has('KeyF')||a.castT>0))) return;
    if(a.attack) {
      if(a.kind==='hero' && a.attack.type==='light' && a.attack.t>.21) a.queuedCombo=true;
      return;
    }
    if(a.attackCd>0) return;
    a.attack={type,t:0,hit:false};
    a.landed=0;
    if(a.onGround) a.vx*=.48;
  }
  function actorDamage(target, amount, aggressor, x=target.x, y=target.y-69) {
    if (target.dead || target.invuln>0) return;
    const block = (target.kind==='hero' && keys.has('KeyL') && target.onGround && !target.attack) || target.guard>0;
    const taken=block ? Math.ceil(amount*.14) : amount;
    target.hp=Math.max(0,target.hp-taken);
    target.invuln=block?.13:.29;
    target.contactNote=block?.14:.23;
    if(!block) {
      target.hurt=.33;
      target.attack=null;target.queuedCombo=false;
      target.vx=aggressor.facing*(target.kind==='enemy'?140:115);
      if(target.onGround)target.vy=-75;
    }
    impact(x,y,block?'block':'hit');
    if(target.hp<=0) {
      target.dead=true;target.deathT=0;target.vx=0;target.vy=0;
      target.attack=null;target.guard=0;target.hurt=0;
    }
  }
  function impact(x,y,type) {
    // Contact-only feedback: drawn solely when an actual weapon reaches its target.
    sparks.push({x,y,life:.27,full:.27,type});
  }
  function applyMelee(a) {
    const opponent=a.kind==='hero'?enemy:hero;
    if(opponent.dead)return;
    const kind=a.attack.type;
    const reach=kind==='heavy'?112:kind==='combo'?99:86;
    const dx=(opponent.x-a.x)*a.facing;
    if(dx< -6 || dx>reach || Math.abs(opponent.y-a.y)>78) return;
    const damage= a.kind==='hero'?(kind==='heavy'?43:kind==='combo'?27:21):(kind==='heavy'?21:12);
    actorDamage(opponent,damage,a,lerp(a.x,opponent.x,.7),opponent.y-66);
  }
  function updateAttack(a,dt) {
    if(!a.attack) return;
    a.attack.t+=dt;
    const type=a.attack.type;
    const strike=type==='heavy'?.43:type==='combo'?.27:.195;
    if(!a.attack.hit&&a.attack.t>=strike){a.attack.hit=true;applyMelee(a)}
    if(a.attack.t>=TIMING[type]){
      a.attack=null;
      a.attackCd=a.kind==='enemy'?.36:.07;
      if(a.queuedCombo && !a.dead){a.queuedCombo=false;a.attackCd=0;beginAttack(a,'combo')}
    }
  }
  function horizontalInput() {
    return (keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
  }
  function updateHero(dt) {
    if(hero.dead)return;
    if(hero.attack || hero.hurt>0 || hero.dashTime>0) return;
    let axis=horizontalInput();
    if(keys.has('KeyS')&&hero.onGround)axis=0;
    const top=keys.has('AltLeft')||keys.has('AltRight')?112:keys.has('KeyF')?145:255;
    if(axis!==0){hero.vx+=axis*1760*dt;hero.vx=clamp(hero.vx,-top,top);hero.facing=axis;}
    else {const decel=1950*dt;hero.vx=hero.vx>0?Math.max(0,hero.vx-decel):Math.min(0,hero.vx+decel)}
  }
  function updateEnemy(dt) {
    const e=enemy;
    if(e.dead)return;
    if(e.attack||e.hurt>0||e.guard>0||e.dashTime>0){e.vx*=Math.max(0,1-8*dt);return;}
    const dx=hero.x-e.x, d=Math.abs(dx);
    if(!hero.dead && d<340 && Math.abs(hero.y-e.y)<140){
      e.facing=dx>=0?1:-1;
      if(d<108 && e.onGround) {
        e.vx*=Math.max(0,1-11*dt);
        if(e.attackCd<=0){ e.cycle++;beginAttack(e,e.cycle%4===0?'heavy':'light'); }
      } else {
        e.vx+=e.facing*740*dt;e.vx=clamp(e.vx,-176,176);
      }
      // Physically follows hero onto reachable low platforms; no teleporting.
      if(e.onGround&&hero.y<e.y-38 && d<175 && e.jumpBuffer<=0){e.vy=-475;e.onGround=false;e.jumps=1;e.jumpVisual=0;e.jumpBuffer=.85}
    } else {
      if(e.x>1120)e.facing=-1;
      if(e.x<650)e.facing=1;
      e.vx+=e.facing*540*dt;e.vx=clamp(e.vx,-94,94);
    }
    // Decision-based defense rather than visually random blocking.
    if(hero.attack&&d<128&&e.guardCd<=0&&e.onGround&&e.hp<90&&hero.attack.t<.15){e.guard=.44;e.guardCd=2.2;e.vx=0}
  }
  function integrate(a,dt) {
    if(a.dead) return;
    a.prevX=a.x;a.prevY=a.y;
    if(a.dashTime>0){ a.vx=a.facing*465;a.vy=Math.min(50,a.vy); }
    a.x=clamp(a.x+a.vx*dt,25,WORLD_W-25);
    const prevY=a.y;
    a.vy=clamp(a.vy+GRAVITY*dt,-650,740);
    if(a.dashTime>0) a.vy=Math.min(a.vy,90);
    a.y+=a.vy*dt;
    let landed=false,landingY=Infinity;
    if(a.vy>=0){
      if(prevY<=GROUND+9&&a.y>=GROUND)landingY=GROUND;
      for(const b of platforms){
        if(a.x+a.w*.4>b.x && a.x-a.w*.4<b.x+b.w &&prevY<=b.y+8&&a.y>=b.y) landingY=Math.min(landingY,b.y);
      }
    }
    const was=a.onGround;
    if(landingY!==Infinity){
      a.y=landingY;a.vy=0;a.onGround=true;a.jumps=0;a.coyote=.12;
      if(!was && prevY<landingY-3){a.landed=.23;a.jumpVisual=0}
    }else{
      a.onGround=false;if(was)a.coyote=.10;
    }
    if(a.y>GROUND+50){a.y=GROUND;a.vy=0;a.onGround=true;a.jumps=0}
  }
  function tick(dt){
    clock+=dt;
    for(const a of [hero,enemy]){
      a.dashTime=Math.max(0,a.dashTime-dt);a.dashCd=Math.max(0,a.dashCd-dt);
      a.attackCd=Math.max(0,a.attackCd-dt);a.guard=Math.max(0,a.guard-dt);
      a.guardCd=Math.max(0,a.guardCd-dt);a.hurt=Math.max(0,a.hurt-dt);
      a.invuln=Math.max(0,a.invuln-dt);a.coyote=Math.max(0,a.coyote-dt);
      a.jumpVisual=Math.max(0,a.jumpVisual-dt);a.jumpBuffer=Math.max(0,a.jumpBuffer-dt);
      a.landed=Math.max(0,a.landed-dt);a.contactNote=Math.max(0,a.contactNote-dt);
    }
    if(!hero.dead)updateHero(dt);
    if(!enemy.dead)updateEnemy(dt);
    for(const a of [hero,enemy]){
      if(a.dead){
        a.deathT+=dt;
        if(a.deathT>3.05){
          const pos=a.kind==='hero'?300:745;
          const newer=makeActor(a.kind,pos);
          newer.respawnT=.75;
          if(a.kind==='hero')hero=newer;else enemy=newer;
        }
      }else{
        updateAttack(a,dt);
        integrate(a,dt);
      }
    }
    for(const a of [hero,enemy]){
      a.respawnT=Math.max(0,a.respawnT-dt);
      updateState(a,dt);
    }
    updateMagic(dt);
    for(let i=sparks.length-1;i>=0;i--){sparks[i].life-=dt;if(sparks[i].life<=0)sparks.splice(i,1)}
    cam.x=lerp(cam.x,clamp(hero.x-W*.36,0,WORLD_W-W),Math.min(1,dt*5));
    updateHud();
  }
  function updateHud(){
    $('heroHp').textContent=`${hero.hp} / ${hero.maxHp}`;
    $('enemyHp').textContent=`${enemy.hp} / ${enemy.maxHp}`;
    $('heroBar').style.width=(100*hero.hp/hero.maxHp)+'%';
    $('enemyBar').style.width=(100*enemy.hp/enemy.maxHp)+'%';
    $('heroState').textContent=statesFa[preview?$('heroAnim').value:hero.state]||'خودکار';
    $('enemyState').textContent=statesFa[preview?$('enemyAnim').value:enemy.state]||'خودکار';
    $('modeTag').textContent=preview?'پیش‌نمایش انیمیشن‌ها · مبارزه متوقف':`شعله‌افکن F · گردباد E ${Math.ceil(hero.tornadoCd||0)}s`;
  }
  // -------------------- Skeletal posing --------------------
  function frames(progress, points){
    const u=clamp(progress,0,1);
    for(let i=0;i<points.length-1;i++){
      const a=points[i],b=points[i+1];
      if(u>b[0])continue;
      const k=ease((u-a[0])/(b[0]-a[0]||1));
      const out={};for(const name of Object.keys(a[1]))out[name]=lerp(a[1][name],b[1][name]??a[1][name],k);
      return out;
    }
    return {...points[points.length-1][1]};
  }
  function previewDuration(state){
    return ({idle:2.2,walk:.95,run:.71,crouch:1.8,jump:1.3,doubleJump:1.1,fall:1.2,land:.7,dash:.65,light:.72,combo:.84,heavy:1.18,block:1.5,hurt:.75,defeat:2.0,respawn:1.45})[state]||1;
  }
  function getMotion(a, state, animTime, isPreview=false){
    const duration=isPreview?previewDuration(state):TIMING[state]||1;
    const t=isPreview?(animTime%duration):animTime;
    const q=clamp(t/duration,0,1);
    const wave=Math.sin(animTime*2.65);
    const m={lean:0,hipRise:0,hipShift:0,footF:13,footB:-13,upF:0,upB:0,
      handF:23,handFY:-57,handB:-19,handBY:-65,blade:-1.15,
      pitch:0,bodyRotate:0,scarf:0,opacity:1,swipe:0,eye:1,wing:0};
    if(state==='idle'){
      m.hipRise=-1.5-wave*1.5;
      m.handFY-=wave*1.5;m.handBY+=wave;
      m.scarf=Math.sin(animTime*2.1)*.18;
    }
    if(state==='walk'||state==='run'){
      const run=state==='run',s=Math.sin(animTime*(run?12.2:7.2));
      const reach=run?26:19, lift=run?20:11;
      m.footF=13+s*reach;m.footB=-13-s*reach;
      m.upF=Math.max(0,-s)*lift;m.upB=Math.max(0,s)*lift;
      m.hipRise=-Math.abs(s)*(run?4:2);m.lean=run?8:2;
      m.handF=18-s*18;m.handFY=-64+s*7;
      m.handB=-16+s*20;m.handBY=-64-s*8;
      m.blade=-1.05+s*.18;m.scarf=run?.75:.35;
      m.pitch=s*(run?.04:.02);
    }
    if(state==='flame'){
      m.lean=5;m.hipRise=0;m.footF=22;m.footB=-23;
      m.handF=53;m.handFY=-75;m.handB=3;m.handBY=-88;
      m.blade=0;m.scarf=.22;
    }
    if(state==='tornado'){
      const k=Math.sin(Math.min(1,q)*PI);
      m.lean=3-12*k;m.hipRise=6*k;m.footF=25;m.footB=-25;
      m.handF=39+8*k;m.handFY=-118-10*k;
      m.handB=-22;m.handBY=-120;m.blade=0;m.scarf=1;
    }
    if(state==='crouch'){
      m.hipRise=17;m.footF=18;m.footB=-20;
      m.handF=28;m.handFY=-40;m.handB=-13;m.handBY=-42;m.lean=4;
    }
    if(state==='jump'||state==='doubleJump'){
      const double=state==='doubleJump',k=isPreview?Math.sin(q*PI):clamp(Math.abs(a.vy)/500,0,1);
      m.lean=7;m.hipRise=-4;
      m.upF=double?27:20;m.upB=double?18:15;
      m.footF=29;m.footB=-21;
      m.handF=21;m.handFY=-110;m.handB=-24;m.handBY=-81;
      m.blade=-1.45;m.scarf=1.0;
      if(double){m.bodyRotate=Math.sin(q*TAU)*.15;m.footF=8+Math.cos(q*TAU)*20;m.footB=-6-Math.cos(q*TAU)*16;}
      m.pitch=k*.03;
    }
    if(state==='fall'){
      m.lean=-4;m.hipRise=2;
      m.upF=0;m.upB=0;
      m.footF=21;m.footB=-19;
      m.handF=32;m.handFY=-84;m.handB=-32;m.handBY=-78;
      m.blade=-.9;m.scarf=1.1;
    }
    if(state==='land'){
      const k=isPreview?1-q:clamp(1-animTime/.23,0,1);
      m.hipRise=15*k;m.lean=5*k;
      m.footF=24;m.footB=-23;
      m.handF=36;m.handFY=-48;m.handB=-25;m.handBY=-50;
      m.blade=-.45;
    }
    if(state==='dash'){
      m.lean=19;m.hipRise=8;
      m.footF=-4;m.footB=-35;m.upF=10;m.upB=19;
      m.handF=50;m.handFY=-61;m.handB=-28;m.handBY=-50;
      m.blade=-.12;m.scarf=1.3;
    }
    if(state==='block'){
      m.lean=-6;m.hipRise=7;
      m.footF=25;m.footB=-21;
      m.handF=37;m.handFY=-93;m.handB=-3;m.handBY=-66;
      m.blade=-1.55;m.scarf=.25;
    }
    if(state==='light'){
      const anim=frames(q,[[0,{lean:-6,hx:-17,hy:-66,blade:-2.3,foot:3}],
        [.30,{lean:-12,hx:-21,hy:-95,blade:-2.65,foot:2}],
        [.53,{lean:16,hx:68,hy:-67,blade:.55,foot:23}],
        [.72,{lean:15,hx:51,hy:-53,blade:.35,foot:18}],
        [1,{lean:1,hx:25,hy:-61,blade:-1.03,foot:12}]]);
      m.lean=anim.lean;m.handF=anim.hx;m.handFY=anim.hy;m.blade=anim.blade;m.footF=anim.foot+9;
      m.footB=-23;m.hipRise=3;m.swipe=q>.30&&q<.68?Math.sin((q-.30)/.38*PI):0;
      m.scarf=.6;
    }
    if(state==='combo'){
      const anim=frames(q,[[0,{lean:20,hx:48,hy:-39,blade:.83,foot:24}],
        [.24,{lean:24,hx:56,hy:-14,blade:1.25,foot:27}],
        [.52,{lean:-3,hx:64,hy:-113,blade:-1.16,foot:30}],
        [.77,{lean:6,hx:39,hy:-105,blade:-1.27,foot:22}],
        [1,{lean:1,hx:24,hy:-61,blade:-1.05,foot:13}]]);
      m.lean=anim.lean;m.handF=anim.hx;m.handFY=anim.hy;m.blade=anim.blade;
      m.footF=anim.foot;m.footB=-23;m.hipRise=5;
      m.swipe=q>.24&&q<.70?Math.sin((q-.24)/.46*PI):0;
      m.scarf=.65;
    }
    if(state==='heavy'){
      const anim=frames(q,[[0,{lean:-9,hx:1,hy:-98,blade:-2.1,hip:0}],
        [.27,{lean:-14,hx:-14,hy:-119,blade:-1.68,hip:3}],
        [.52,{lean:24,hx:73,hy:-49,blade:.74,hip:14}],
        [.73,{lean:18,hx:67,hy:-38,blade:1.08,hip:11}],
        [1,{lean:0,hx:25,hy:-62,blade:-1.0,hip:0}]]);
      m.lean=anim.lean;m.handF=anim.hx;m.handFY=anim.hy;m.blade=anim.blade;
      m.footF=29;m.footB=-30;m.hipRise=anim.hip;
      m.swipe=q>.28&&q<.70?Math.sin((q-.28)/.42*PI)*1.4:0;
      m.scarf=.8;
    }
    if(state==='hurt'){
      const k=1-ease(q);
      m.lean=-17*k;m.hipRise=9*k;m.footF=-2;m.footB=-24;
      m.handF=10;m.handFY=-88;m.handB=-24;m.handBY=-77;
      m.blade=-1.8;m.pitch=-.1*k;
      m.eye=.6;
    }
    if(state==='defeat'){
      const k=ease(q/.55);
      m.hipRise=21*k;m.lean=-12;
      m.bodyRotate=-1.28*k;
      m.handF=42;m.handFY=-84+36*k;m.handB=-18;m.handBY=-58+19*k;
      m.footF=18;m.footB=-20;
      m.blade=-1.1+1.3*k;m.eye=1-k;
      m.scarf=1.1;
    }
    if(state==='respawn'){
      const k=ease(q/.55);
      m.hipRise=-26*(1-k);
      m.opacity=.20+.8*k;
      m.handF=10;m.handFY=-90+32*k;m.handB=-30;m.handBY=-87+23*k;
      m.blade=-1.5;m.eye=k;
    }
    return m;
  }
  function kneeJoint(hip,foot,upper=31,lower=32,bend=1){
    const dx=foot.x-hip.x,dy=foot.y-hip.y;
    const D=Math.max(.001,Math.hypot(dx,dy)),d=clamp(D,1,upper+lower-.001);
    const a=(upper*upper-lower*lower+d*d)/(2*d);
    const h=Math.sqrt(Math.max(0,upper*upper-a*a));
    const ux=dx/D,uy=dy/D;
    return {x:hip.x+ux*a-uy*h*bend,y:hip.y+uy*a+ux*h*bend};
  }
  function elbowJoint(shoulder,hand,bend=1){return kneeJoint(shoulder,hand,25,26,bend)}
  function poly(points,fill,stroke=null,width=2){
    ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
    ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineJoin='round';ctx.stroke()}
  }
  function rounded(x,y,w,h,r,fill,stroke=null,lw=1){
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}
  }
  function oval(x,y,rx,ry,fill,stroke=null,lw=1){
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);
    if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}
  }
  function strokeSegment(a,b,width,fill,edge='#0e1f30',highlight=null){
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
    ctx.strokeStyle=edge;ctx.lineWidth=width+4;ctx.stroke();
    ctx.strokeStyle=fill;ctx.lineWidth=width;ctx.stroke();
    if(highlight){ctx.beginPath();ctx.moveTo(a.x-1,a.y-1);ctx.lineTo(b.x-1,b.y-1);ctx.strokeStyle=highlight;ctx.lineWidth=Math.max(1,width*.18);ctx.stroke()}
  }
  function gradient(y0,y1,c1,c2){const g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,c1);g.addColorStop(1,c2);return g}
  function drawBoot(foot,front,enemyRole){
    const steel=enemyRole;
    const dark=steel?'#182534':'#142e3e',light=steel?'#7b8b96':'#7aebd7';
    poly([[foot.x-9,foot.y-11],[foot.x+6,foot.y-12],[foot.x+14,foot.y-5],[foot.x+15,foot.y-1],[foot.x-12,foot.y-1]],dark,'#061825',2.5);
    poly([[foot.x-4,foot.y-10],[foot.x+4,foot.y-11],[foot.x+8,foot.y-8],[foot.x-5,foot.y-7]],steel?'#8a9da6':'#2e7c83');
    ctx.strokeStyle=light;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(foot.x-8,foot.y-4);ctx.lineTo(foot.x+12,foot.y-4);ctx.stroke();
    if(front){oval(foot.x+4,foot.y-12,3,2,steel?'#e2ac88':'#9cf7df')}
  }
  function drawLeg(hip,foot,knee,front,steel){
    strokeSegment(hip,knee,steel?15:13,steel?(front?'#556676':'#3b4f5f'):(front?'#336b80':'#24465c'),'#0a1a2b',steel?'#a0b4ba':'#69b6bd');
    oval(knee.x,knee.y,steel?9:7.5,steel?9:7.5,steel?'#83949d':'#386f82','#0b2334',2);
    strokeSegment(knee,{x:foot.x,y:foot.y-9},steel?13:11,steel?(front?'#6a7c87':'#435564'):(front?'#2f8294':'#24475e'),'#091a29',steel?'#b0b6b1':'#77c4c2');
    drawBoot(foot,front,steel);
  }
  function drawArm(shoulder,hand,bend,front,steel){
    const elbow=elbowJoint(shoulder,hand,bend);
    strokeSegment(shoulder,elbow,steel?14:12,steel?(front?'#75808c':'#485765'):(front?'#267a85':'#245066'),'#0c1f2f',steel?'#d8ae8c':'#73b9be');
    oval(elbow.x,elbow.y,steel?7.7:6.9,steel?7.7:6.9,steel?'#7c8a91':'#447b91','#142738',1.7);
    strokeSegment(elbow,hand,steel?12.5:10.5,steel?'#667582':front?'#338e9b':'#265c74','#092236',steel?'#c0a99b':'#8bd7ce');
    oval(hand.x,hand.y,steel?6:5.2,steel?5.3:4.7,steel?'#b08d77':'#9cf4d9','#132b39',1.8);
  }
  function drawScarf(shoulder,m,t,steel){
    const x=shoulder.x-6,y=shoulder.y+6;
    const flutter=Math.sin(t*7)*5;
    const length=steel?54:72;
    ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x-25,y-4,x-38,y-26-m.scarf*10,x-length,y-12+flutter);
    ctx.bezierCurveTo(x-length+13,y+4+flutter,x-24,y+22,x-2,y+15);ctx.closePath();
    ctx.fillStyle=steel?'#80374a':'#36abb3';ctx.strokeStyle='#152b3c';ctx.lineWidth=3;ctx.stroke();ctx.fill();
    ctx.beginPath();ctx.moveTo(x-11,y+4);ctx.bezierCurveTo(x-26,y+1,x-35,y-3,x-length+11,y-8+flutter);ctx.strokeStyle=steel?'#ce6474':'#92ffee';ctx.lineWidth=2;ctx.stroke();
    rounded(x-12,y-6,29,11,5,steel?'#8d4d56':'#6ae0cf','#0a2535',2);
  }
  function drawBody(hip,shoulder,m,steel){
    const L=steel?18:15;
    const dark=steel?'#1c293b':'#10314a';
    const bright=steel?'#6b7c89':'#1b6885';
    poly([[shoulder.x-L,shoulder.y+1],[shoulder.x+L,shoulder.y+2],
      [hip.x+L-2,hip.y+5],[hip.x-L+2,hip.y+5]],gradient(shoulder.y,hip.y,steel?'#5a6570':'#2c7793',dark),'#0b2331',3);
    poly([[shoulder.x-9,shoulder.y+8],[shoulder.x+11,shoulder.y+7],
      [hip.x+6,hip.y-4],[hip.x-7,hip.y-4]],bright);
    if(steel){
      poly([[shoulder.x-12,shoulder.y+8],[shoulder.x+13,shoulder.y+6],[shoulder.x+10,shoulder.y+21],[shoulder.x-12,shoulder.y+24]],'#82909c','#263a49',2);
      poly([[shoulder.x-2,shoulder.y+10],[shoulder.x+11,shoulder.y+14],[shoulder.x-1,shoulder.y+29],[shoulder.x-11,shoulder.y+17]],'#b4736c');
      rounded(hip.x-14,hip.y-5,29,8,3,'#303741','#101c31',1.4);
      rounded(hip.x+3,hip.y-5,7,7,1,'#e2bb82');
    }else{
      poly([[shoulder.x-8,shoulder.y+8],[shoulder.x+1,shoulder.y+4],[hip.x+2,hip.y-6],[hip.x-5,hip.y-3]],'#55bdb8');
      poly([[shoulder.x+7,shoulder.y+7],[shoulder.x+12,shoulder.y+6],[hip.x+8,hip.y-3],[hip.x+3,hip.y-3]],'#183d57');
      rounded(hip.x-13,hip.y-7,26,7,2,'#1c3448','#86d7bd',1.2);
      oval(hip.x+1,hip.y-4,3.4,3.4,'#b9ffe3');
    }
    poly([[hip.x-14,hip.y+1],[hip.x+13,hip.y+1],[hip.x+6,hip.y+14],[hip.x-10,hip.y+12]],steel?'#343a4b':'#20465d','#102536',2);
  }
  function drawHead(pos,t,steel,m){
    const x=pos.x,y=pos.y;
    if(steel){
      // Blunt armored guard: asymmetric steel helmet, orange eye slit and horns.
      poly([[x-19,y-18],[x-13,y-39],[x+1,y-44],[x+17,y-30],[x+19,y-1],[x+7,y+13],[x-13,y+8]],
        '#2a3443','#101b2e',3.5);
      poly([[x-17,y-22],[x-25,y-44],[x-15,y-35],[x-7,y-25]],'#a96b63','#172537',2);
      poly([[x+6,y-35],[x+15,y-48],[x+19,y-30],[x+14,y-19]],'#bd8172','#182637',2);
      poly([[x-12,y-29],[x+7,y-34],[x+15,y-23],[x+14,y-11],[x-13,y-9]],'#748692','#102334',2.5);
      poly([[x-10,y-15],[x+13,y-17],[x+15,y-8],[x-13,y-7]],'#243746','#101e2a',2.4);
      ctx.save();ctx.shadowColor='#ffa575';ctx.shadowBlur=7;
      rounded(x+4,y-14,12*m.eye,3.2,1.5,'#ffb07c');ctx.restore();
      poly([[x-15,y-10],[x+15,y-12],[x+8,y+4],[x-12,y+3]],'#4a5e6d','#182838',2);
      oval(x+5,y-30,3,2,'#c7d2d7');
    } else {
      // Light guardian: wind-swept ears, hood, white mask and expressive cyan eye.
      poly([[x-18,y-24],[x-24,y-57],[x-6,y-44],[x+2,y-39]],'#58b9af','#0b2d3e',2.5);
      poly([[x-14,y-34],[x-17,y-50],[x-9,y-41]],'#b9f1c9');
      poly([[x+4,y-39],[x+17,y-53],[x+20,y-23],[x+13,y-18]],'#4ea6bb','#143246',2.5);
      poly([[x+13,y-39],[x+17,y-46],[x+18,y-29]],'#a1f5dd');
      ctx.beginPath();ctx.moveTo(x-20,y-21);ctx.bezierCurveTo(x-21,y-38,x-6,y-44,x+12,y-37);
      ctx.bezierCurveTo(x+24,y-29,x+23,y-11,x+13,y+9);ctx.bezierCurveTo(x+1,y+17,x-17,y+6,x-20,y-21);ctx.closePath();
      ctx.fillStyle=gradient(y-40,y+14,'#1c5b71','#102f4a');ctx.fill();ctx.lineWidth=3.3;ctx.strokeStyle='#081f30';ctx.stroke();
      poly([[x-12,y-20],[x+4,y-29],[x+19,y-18],[x+17,y+4],[x+7,y+12],[x-15,y+1]],'#d2f2e8','#113c51',2);
      poly([[x-11,y-17],[x+9,y-24],[x+16,y-19],[x+12,y-7],[x-12,y-8]],'#72b3bd');
      ctx.save();ctx.shadowColor='#a7ffeb';ctx.shadowBlur=9;
      poly([[x+4,y-12],[x+17,y-14],[x+15,y-8],[x+6,y-7]],m.eye>0?'#aaffea':'#1b4c58');ctx.restore();
      poly([[x+17,y-5],[x+22,y+2],[x+10,y+9]],'#9fd3ce','#21576d',1.4);
      oval(x-6,y-28,2.5,2,'#c8fff2');
    }
  }
  function drawWeapon(hand,angle,steel){
    const len=steel?76:62, ux=Math.cos(angle),uy=Math.sin(angle),nx=-uy,ny=ux;
    const grip={x:hand.x-ux*11,y:hand.y-uy*11};
    const base={x:hand.x+ux*3,y:hand.y+uy*3},tip={x:hand.x+ux*len,y:hand.y+uy*len};
    strokeSegment(grip,{x:hand.x+ux*17,y:hand.y+uy*17},steel?5.4:5,steel?'#715d52':'#356e75','#091727',steel?'#d2a37f':'#a4eddf');
    if(steel){
      // Dull bronze cleaver blade on a staff.
      poly([[base.x+nx*8,base.y+ny*8],[tip.x+nx*10,tip.y+ny*10],
        [tip.x+ux*11,tip.y+uy*11],[tip.x-nx*9,tip.y-ny*9],[base.x-nx*6,base.y-ny*6]],
        '#87949b','#192837',3);
      poly([[base.x+nx*3,base.y+ny*3],[tip.x+nx*6,tip.y+ny*6],
        [tip.x+ux*9,tip.y+uy*9],[base.x+ux*3,base.y+uy*3]],'#c7a991');
      oval(hand.x,hand.y,5.5,5.5,'#8b6554','#0c2131',1.5);
    }else{
      poly([[base.x+nx*6,base.y+ny*6],[tip.x+nx*5,tip.y+ny*5],
        [tip.x+ux*13,tip.y+uy*13],[tip.x-nx*6,tip.y-ny*6],[base.x-nx*5,base.y-ny*5]],
        '#8fe2e4','#103a52',2.7);
      poly([[base.x+nx*1.5,base.y+ny*1.5],[tip.x+nx*2,tip.y+ny*2],
        [tip.x+ux*10,tip.y+uy*10],[base.x+ux*8,base.y+uy*8]],'#ecffef');
      strokeSegment({x:hand.x+nx*13,y:hand.y+ny*13},{x:hand.x-nx*13,y:hand.y-ny*13},4,'#bfefc6','#214d63');
      oval(hand.x,hand.y,5.2,5.2,'#b6ffdd','#0d4052',2);
    }
  }
  function drawSlash(hand, angle, strength, steel){
    if(strength<=.02)return;
    ctx.save();ctx.globalAlpha=.38*strength;
    ctx.beginPath();ctx.arc(hand.x,hand.y,80,angle-.7,angle+.65,false);
    ctx.strokeStyle=steel?'#f5a78c':'#adffef';ctx.lineWidth=steel?7:6;ctx.lineCap='round';ctx.stroke();
    ctx.globalAlpha=.4*strength;
    ctx.beginPath();ctx.arc(hand.x,hand.y,94,angle-.55,angle+.55,false);
    ctx.strokeStyle=steel?'#efb28b':'#c5ffff';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  }
  function drawActor(a,forced=null,time=0,xOverride=null,yOverride=null){
    let state=forced||a.state,sec=forced?time:a.stateT;
    if(state==='auto'){state=a.state;sec=a.stateT}
    const m=getMotion(a,state,sec,!!forced&&forced!=='auto');
    const steel=a.kind==='enemy';
    const posX=xOverride??a.x,posY=yOverride??a.y;
    ctx.save();ctx.translate(Math.round(posX-cam.x),Math.round(posY));
    ctx.scale(a.facing,1);
    if(steel)ctx.scale(1.075,1.075);
    ctx.globalAlpha=m.opacity * (a.invuln>0 && Math.floor(a.invuln*25)%2===0 && !forced?.length ? .75:1);
    // Body-part rotation pivoted at the pelvis, not the character's feet.
    if(Math.abs(m.bodyRotate)>.01){ctx.translate(0,-24);ctx.rotate(m.bodyRotate);ctx.translate(0,24)}
    const hip={x:m.hipShift,y:-48+m.hipRise};
    const shoulder={x:hip.x+m.lean*.58,y:hip.y-33};
    const head={x:shoulder.x+2+m.lean*.18,y:shoulder.y-13};
    const farFoot={x:m.footB,y:-m.upB};
    const nearFoot={x:m.footF,y:-m.upF};
    const farKnee=kneeJoint({x:hip.x-9,y:hip.y+1},farFoot,26,27,1);
    const nearKnee=kneeJoint({x:hip.x+6,y:hip.y+1},nearFoot,26,27,-1);
    const farShoulder={x:shoulder.x-9,y:shoulder.y+7};
    const nearShoulder={x:shoulder.x+12,y:shoulder.y+7};
    const farHand={x:m.handB,y:m.handBY};
    const nearHand={x:m.handF,y:m.handFY};
    // Contact shadow follows legs, except during airborne preview poses.
    ctx.save();ctx.scale(1/a.facing,1);ctx.globalAlpha=.14;
    oval(0,3,steel?27:24,4,'#000');ctx.restore();
    // Cloth, legs, arms, armor and mask in a fixed depth order.
    drawScarf(shoulder,m,sec,steel);
    drawLeg({x:hip.x-9,y:hip.y+1},farFoot,farKnee,false,steel);
    drawArm(farShoulder,farHand,-1,false,steel);
    drawBody(hip,shoulder,m,steel);
    drawLeg({x:hip.x+6,y:hip.y+1},nearFoot,nearKnee,true,steel);
    drawHead(head,sec,steel,m);
    drawArm(nearShoulder,nearHand,1,true,steel);
    if(steel||(state!=='flame'&&state!=='tornado'))drawWeapon(nearHand,m.blade,steel);
    else {oval(nearHand.x,nearHand.y,8.2,7.3,'#ffb367','#3a3745',2);
      oval(nearHand.x+5,nearHand.y,3.2,3.2,'#ffe3a0')} 
    drawSlash(nearHand,m.blade,m.swipe,steel);
    ctx.restore();
  }
  // -------------------- Quiet, fixed environment --------------------
  function ridge(y, amp, step, factor, c) {
    ctx.beginPath();ctx.moveTo(0,H);
    for(let sx=-20;sx<=W+20;sx+=10){
      const x=(sx+cam.x*factor)/step;
      const shape=Math.sin(x*.71)*.49+Math.sin(x*1.47+2.2)*.26+Math.sin(x*.31+3.8)*.25;
      ctx.lineTo(sx,y+shape*amp);
    }
    ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=c;ctx.fill();
  }
  function tree(x,base,h,dim=false){
    const X=x-cam.x*(dim?.36:1);
    if(X< -140 ||X>W+140)return;
    ctx.save();ctx.translate(X,base);
    if(dim)ctx.globalAlpha=.54;
    poly([[-12,3],[-10,-h+23],[-18,-h+1],[-4,-h+46],[3,-h],[12,-h+45],[9,5]],dim?'#183b4e':'#173742');
    for(let n=0;n<3;n++){
      ctx.beginPath();ctx.moveTo(0,-h+21+n*18);
      ctx.bezierCurveTo(-17,-h-15+n*23,-41,-h+15+n*21,-50,-h+34+n*16);
      ctx.bezierCurveTo(-19,-h+28+n*16,-14,-h+35+n*15,0,-h+54+n*15);
      ctx.bezierCurveTo(20,-h+15+n*17,36,-h+24+n*16,49,-h+35+n*15);
      ctx.bezierCurveTo(25,-h-15+n*21,10,-h-11+n*20,0,-h+21+n*18);
      ctx.fillStyle=dim?'#214b56':n%2?'#1a5052':'#1c555a';ctx.fill();
    }
    if(!dim){for(let n=-2;n<=2;n++){oval(n*12, -h+19+(n%2)*9,9,5,'#2f786a')}}
    ctx.restore();
  }
  function pillar(x,y,h,near){
    const sx=x-cam.x*(near?1:.52);
    if(sx< -90 ||sx>W+90)return;
    ctx.save();ctx.translate(sx,y);
    ctx.globalAlpha=near?1:.55;
    rounded(-18,-h,36,h,3,near?'#28424c':'#203e4b','#132a39',2);
    poly([[-23,-h],[-14,-h-14],[15,-h-14],[23,-h]],'#365967','#1b3542',2);
    rounded(-23,-h+20,46,8,2,'#416571');
    for(let i=0;i<3;i++)rounded(-13,-h+43+i*24,26,3,1,'#476775');
    rounded(-20,-1,40,8,2,'#43666b');ctx.restore();
  }
  function drawBackground() {
    const sky=ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#091527');sky.addColorStop(.48,'#163246');sky.addColorStop(1,'#4c746b');
    ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    // PixelFX clouds are composited at sky depth behind scenery and characters.
    drawClouds();
    /*const moonX=718-cam.x*.046,moonY=111;
    const moonGlow=ctx.createRadialGradient(moonX,moonY,5,moonX,moonY,167);
    moonGlow.addColorStop(0,'#a1ffe344');moonGlow.addColorStop(.35,'#a1ffe310');moonGlow.addColorStop(1,'#a1ffe300');
    ctx.fillStyle=moonGlow;ctx.fillRect(moonX-167,moonY-167,334,334);
    oval(moonX,moonY,43,43,'#b0dfd5');
    oval(moonX+17,moonY-12,44,44,'#112637');
    for(let i=0;i<80;i++){
      const x=(i*139.7+47)%960,y=19+((i*88.9)%210);
      const alpha=.3+.2*Math.sin(i*16);ctx.globalAlpha=alpha;
      rounded(x-cam.x*.028,y,i%7===0?2:1,i%7===0?2:1,0,'#d1fff1');
    }
    ctx.globalAlpha=1;*/
    ridge(267,32,150,.11,'#244355');
    ridge(315,42,116,.18,'#1a3848');
    for(let i=0;i<20;i++)tree(i*168+43,356,101+(i*17)%45,true);
    ridge(381,20,92,.32,'#183645');
    for(let i=0;i<11;i++)pillar(i*286+83,406,72+(i%3)*19,false);
    for(let i=0;i<18;i++)tree(i*155+31,435,83+(i*11)%35,true);
  }
  function drawStage() {
    ctx.save();ctx.translate(-Math.round(cam.x),0);
    const soil=ctx.createLinearGradient(0,GROUND,0,H);
    soil.addColorStop(0,'#233e49');soil.addColorStop(.13,'#152e3d');soil.addColorStop(1,'#0a1a2a');
    ctx.fillStyle=soil;ctx.fillRect(0,GROUND,WORLD_W,H-GROUND);
    ctx.fillStyle='#3b7672';ctx.fillRect(0,GROUND-4,WORLD_W,4);
    ctx.fillStyle='#87c6a5';ctx.fillRect(0,GROUND-4,WORLD_W,1);
    for(let i=0;i<150;i++){
      const x=i*17+9,y=GROUND+9+(i*53%93);
      rounded(x,y,10+(i*13%19),3+(i*7%5),1,i%3===0?'#294655':'#1e3745');
      if(i%3===0){ctx.strokeStyle='#5a9b81';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(x,GROUND-4);ctx.lineTo(x-5,GROUND-10-(i%4)*3);ctx.stroke()}
    }
    // One-way stone platforms — the collider and painted geometry share coordinates.
    for(const [i,p] of platforms.entries()){
      ctx.fillStyle='#0e2332';ctx.fillRect(p.x+3,p.y+7,p.w-6,19);
      rounded(p.x,p.y-1,p.w,p.h,4,'#344b57','#0b1d2b',3);
      rounded(p.x,p.y-2,p.w,6,3,'#5b8d87');
      ctx.fillStyle='#9cc9a6';ctx.fillRect(p.x+7,p.y-3,p.w-14,1.5);
      for(let j=0;j<5;j++){
        const px=p.x+24+j*36;
        ctx.strokeStyle='#203440';ctx.lineWidth=1.2;
        ctx.beginPath();ctx.moveTo(px,p.y+10);ctx.lineTo(px+2,p.y+18);ctx.stroke();
      }
      ctx.strokeStyle='#2e615f';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(p.x+10,p.y+15);ctx.lineTo(p.x+10,p.y+34+i*6);ctx.stroke();
    }
    // Foreground architecture is placed purposefully; never generated per frame.
    pillar(161,GROUND,125,true);
    pillar(1470,GROUND,144,true);
    pillar(2048,GROUND,114,true);
    tree(68,GROUND,143);
    tree(1350,GROUND,143);
    tree(1940,GROUND,134);
    // A pair of simple start-area markers behind the fighters.
    for(const x of [303,754]){
      ctx.strokeStyle='#46796955';ctx.lineWidth=1.1;
      ctx.beginPath();ctx.ellipse(x,GROUND+2,40,7,0,0,TAU);ctx.stroke();
    }
    ctx.restore();
  }
  function drawImpact(){
    ctx.save();ctx.translate(-cam.x,0);
    for(const e of sparks){
      const k=e.life/e.full;
      ctx.globalAlpha=k;
      const c=e.type==='block'?'#b7eaff':'#fff0ca';
      ctx.strokeStyle=c;ctx.lineWidth=2;ctx.lineCap='round';
      for(let j=0;j<7;j++){
        const a=(j/7)*TAU+.12,r=5+(1-k)*22;
        ctx.beginPath();ctx.moveTo(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r);
        ctx.lineTo(e.x+Math.cos(a)*(r+9*k),e.y+Math.sin(a)*(r+9*k));ctx.stroke();
      }
      oval(e.x,e.y,4*k,4*k,c);
    }
    ctx.restore();
  }
  function drawForeground(){
    ctx.save();ctx.translate(-Math.round(cam.x),0);
    for(let i=0;i<58;i++){
      const x=i*41+4+(i%3)*4;
      ctx.strokeStyle=i%4===0?'#5ca68d':'#31645b';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(x,GROUND-4);
      ctx.quadraticCurveTo(x-7,GROUND-14-(i%4)*5,x-6,GROUND-16-(i%5)*4);
      ctx.moveTo(x+4,GROUND-4);ctx.quadraticCurveTo(x+10,GROUND-17,x+13,GROUND-14-(i%3)*4);
      ctx.stroke();
    }
    ctx.restore();
  }
  function render() {
    ctx.clearRect(0,0,W,H);
    drawBackground();drawStage();
    if(preview){
      // Freeze gameplay, place both rigs side by side at equal baseline.
      ctx.fillStyle='#07192966';ctx.fillRect(0,0,W,H);
      const h={...hero,x:cam.x+327,y:GROUND,facing:1,invuln:0};
      const e={...enemy,x:cam.x+679,y:GROUND,facing:-1,invuln:0};
      drawActor(h,$('heroAnim').value,previewClock,h.x,h.y);
      drawActor(e,$('enemyAnim').value,previewClock,e.x,e.y);
      ctx.fillStyle='#d5fff0';ctx.font='bold 14px Tahoma';ctx.textAlign='center';
      ctx.fillText('قهرمان',327,GROUND+41);ctx.fillText('دشمن',679,GROUND+41);
    }else{
      // Silhouettes never jump forward in draw order when facing direction changes.
      if(hero.x<=enemy.x){drawActor(hero);drawActor(enemy)}
      else{drawActor(enemy);drawActor(hero)}
      drawImpact();
    }
    if(!preview)drawSpells();
    drawForeground();
  }
  function togglePreview(force){
    preview=typeof force==='boolean'?force:!preview;
    $('inspector').classList.toggle('hidden',!preview);
    $('inspectorBtn').textContent=preview?'بستن تست  I':'تست انیمیشن  I';
    previewClock=0;keys.clear();updateHud();
  }
  function togglePause(){
    if(preview)return;
    paused=!paused;$('pauseOverlay').classList.toggle('hidden',!paused);
    $('pauseBtn').textContent=paused?'ادامه  P':'توقف  P';
    if(paused)keys.clear();
  }
  function press(code,repeat=false){
    if(code==='KeyR'){if(!repeat)reset();return}
    if(code==='KeyI'){if(!repeat)togglePreview();return}
    if(code==='KeyP' || code==='Escape'){if(!repeat)togglePause();return}
    if(paused||preview)return;
    keys.add(code);
    if(repeat)return;
    if(code==='Space'||code==='ArrowUp'||code==='KeyW')jump(hero);
    if(code==='ShiftLeft'||code==='ShiftRight')dash(hero);
    if(code==='KeyJ')beginAttack(hero,'light');
    if(code==='KeyK')beginAttack(hero,'heavy');
    if(code==='KeyE')castTornado();
  }
  const blockedCodes = new Set(['Space','ArrowUp','ArrowDown','ArrowRight','ArrowLeft','KeyA','KeyD','KeyW','KeyS','KeyJ','KeyK','KeyL','KeyF','KeyE','KeyR','KeyI','KeyP','ShiftLeft','ShiftRight']);
  window.addEventListener('keydown', e=>{
    if(e.target?.tagName==='SELECT')return;
    if(blockedCodes.has(e.code))e.preventDefault();
    press(e.code,e.repeat);
  },{passive:false});
  window.addEventListener('keyup', e=>keys.delete(e.code));
  window.addEventListener('blur',()=>keys.clear());
  for(const btn of document.querySelectorAll('[data-hold]')){
    const code=btn.dataset.hold;
    btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);keys.add(code)});
    for(const ev of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(ev,()=>keys.delete(code));
  }
  for(const btn of document.querySelectorAll('[data-tap]'))btn.addEventListener('pointerdown',e=>{e.preventDefault();press(btn.dataset.tap)});
  $('resetBtn').addEventListener('click',reset);
  $('pauseBtn').addEventListener('click',togglePause);
  $('inspectorBtn').addEventListener('click',()=>togglePreview());
  $('inspectorClose').addEventListener('click',()=>togglePreview(false));
  $('heroAnim').addEventListener('change',()=>{previewClock=0;updateHud()});
  $('enemyAnim').addEventListener('change',()=>{previewClock=0;updateHud()});
  function loop(ms){
    const dt=Math.min(.04,Math.max(0,(ms-lastFrame)/1000));lastFrame=ms;
    if(preview){previewClock+=dt;updateHud()}
    else if(!paused){
      fixedAccumulator=Math.min(.12,fixedAccumulator+dt);
      let substeps=0;
      while(fixedAccumulator>=1/120 && substeps<8){tick(1/120);fixedAccumulator-=1/120;substeps++}
    }
    render();requestAnimationFrame(loop);
  }
  // Scriptable read-only test hooks; no exposed mutation of internal render data.
  window.GAME_TEST={
    snapshot:()=>({hero:{x:hero.x,y:hero.y,vx:hero.vx,vy:hero.vy,hp:hero.hp,state:hero.state,dead:hero.dead,fireHolding:keys.has('KeyF'),tornadoCooldown:hero.tornadoCd},
      enemy:{x:enemy.x,y:enemy.y,hp:enemy.hp,state:enemy.state,dead:enemy.dead},
      effectCount:sparks.length,fx:{clouds:true,flamethrower:!!flameFx,tornadoCount:tornados.length,heart:!!heart&&!heart.collected},preview,paused,animationCount:ANIMATIONS.length-1}),
    input:code=>press(code),
    release:code=>keys.delete(code),
    showAnimation:(kind,name)=>{if(!ANIMATIONS.some(x=>x[0]===name))throw Error('Unknown animation');
      if(!preview)togglePreview(true);$(kind==='enemy'?'enemyAnim':'heroAnim').value=name;previewClock=0;}
  };
  reset();requestAnimationFrame(loop);
})();