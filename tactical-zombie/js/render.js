'use strict';
/* رندر ۲.۵ بعدی از بالا: زمین تکه‌ای، دیوارهای برجسته، مرتب‌سازی عمقی، افکت‌ها */
(function () {
  const T = G.T, CH = 16, CPX = CH * T, TAU = Math.PI * 2;
  let cv, c, chunks = new Map(), frame = 0;
  const view = G.view = { w: 1280, h: 720, zoom: 1, dpr: 1, x: 0, y: 0, shake: 0 };

  const PAL = {
    nat: ['#3c6b35', '#6b6a38', '#583a31', '#19141f', '#40566b'],
    road: ['#34363a', '#34363a', '#2c2a2b', '#17161b', '#353a40'],
    pave: ['#74726b', '#74726b', '#5e5450', '#2a2630', '#6b7682'],
    floor: ['#86775f', '#86775f', '#6d5a4d', '#3a3340', '#7b8088'],
    wallTop: ['#a59c8b', '#a59c8b', '#8a7568', '#4b4356', '#9aa3ad'],
    wallFront: ['#6b6457', '#6b6457', '#544438', '#2a2533', '#5f6770'],
    canopy: ['#2f6b2c', '#7b7a2e', '#4a3a2a', '#221a2a', '#3f6f5a'],
  };

  /* ---------- افکت‌ها ---------- */
  const parts = [], tracers = [], rings = [], booms = [], flashes = [];
  G.fx = {
    hurt: 0,
    reset() { parts.length = tracers.length = rings.length = booms.length = flashes.length = 0; chunks.clear(); this.hurt = 0; view.shake = 0; },
    tracer(x0, y0, x1, y1, color) { if (tracers.length < 260) tracers.push({ x0, y0, x1, y1, t: .07, color }); },
    muzzle(x, y, ang) { flashes.push({ x, y, ang, t: .05 }); },
    burst(x, y, color, n, sp, life, size) { if (parts.length > 900) return; for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = sp * (.3 + Math.random() * .7); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: life * (.6 + Math.random() * .6), max: life, color, size: size * (.6 + Math.random() * .8) }); } },
    smoke(x, y) { if (parts.length < 900) parts.push({ x, y, vx: G.rand(-12, 12), vy: G.rand(-28, -8), life: .7, max: .7, color: '#9a9a9a', size: 5, smoke: 1 }); },
    ring(x, y, r, color) { rings.push({ x, y, r, t: .5, max: .5, color }); },
    boom(x, y, r) { booms.push({ x, y, r, t: .45, max: .45 }); this.burst(x, y, '#ffb347', 16, 260, .5, 4); this.burst(x, y, '#3b3b3b', 12, 120, .9, 6); for (let i = 0; i < 6; i++) this.smoke(x + G.rand(-20, 20), y + G.rand(-20, 20)); this.decal(x, y, 'scorch', '#000', r * .55); },
    shake(a) { view.shake = Math.max(view.shake, a); },
    decal(x, y, type, color, size) {
      const cx = Math.floor(x / CPX), cy = Math.floor(y / CPX), ch = chunks.get(cy * 64 + cx); if (!ch) return;
      const g = ch.ctx, lx = x - cx * CPX, ly = y - cy * CPX;
      if (type === 'blood') { for (let i = 0; i < 6; i++) { g.globalAlpha = .5; g.fillStyle = i < 4 ? '#08070b' : color; g.beginPath(); g.ellipse(lx + G.rand(-size, size) * .6, ly + G.rand(-size, size) * .4, size * G.rand(.2, .55), size * G.rand(.12, .35), 0, 0, TAU); g.fill(); } }
      else if (type === 'scorch') { const gr = g.createRadialGradient(lx, ly, 2, lx, ly, size); gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = 1; g.fillStyle = gr; g.beginPath(); g.arc(lx, ly, size, 0, TAU); g.fill(); }
      else { g.globalAlpha = .35; g.fillStyle = color; g.beginPath(); g.ellipse(lx, ly, size, size * .7, 0, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
    },
    update(dt) {
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .92; p.vy = p.smoke ? p.vy : p.vy * .92 + 160 * dt; if (p.smoke) p.size += 14 * dt; }
      for (let i = tracers.length - 1; i >= 0; i--) { if ((tracers[i].t -= dt) <= 0) tracers.splice(i, 1); }
      for (let i = rings.length - 1; i >= 0; i--) { if ((rings[i].t -= dt) <= 0) rings.splice(i, 1); }
      for (let i = booms.length - 1; i >= 0; i--) { if ((booms[i].t -= dt) <= 0) booms.splice(i, 1); }
      for (let i = flashes.length - 1; i >= 0; i--) { if ((flashes[i].t -= dt) <= 0) flashes.splice(i, 1); }
      if (this.hurt > 0) this.hurt = Math.max(0, this.hurt - dt * .8);
      if (view.shake > 0) view.shake = Math.max(0, view.shake - dt * 30);
    },
  };

  /* ---------- بوم و نما ---------- */
  G.initRender = function (canvas) { cv = canvas; c = cv.getContext('2d', { alpha: false }); G.resize(); };
  G.resize = function () {
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5), w = window.innerWidth, h = window.innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
    view.dpr = dpr; view.sw = w; view.sh = h;
    const vh = (G.touch || Math.min(w, h) < 520) ? 500 : 720;
    view.zoom = Math.max(.45, h / vh); view.w = w / view.zoom; view.h = h / view.zoom;
  };
  G.screenToWorld = (sx, sy) => ({ x: view.x + (sx - view.sw / 2) / view.zoom, y: view.y + (sy - view.sh / 2) / view.zoom });

  /* ---------- زمین ---------- */
  function buildChunk(cx, cy) {
    const m = G.map, cn = document.createElement('canvas'); cn.width = cn.height = CPX; const g = cn.getContext('2d');
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const mx = cx * CH + tx, my = cy * CH + ty, px = tx * T, py = ty * T;
      if (mx >= m.w || my >= m.h) { g.fillStyle = '#0b0d0c'; g.fillRect(px, py, T, T); continue; }
      const i = my * m.w + mx, z = m.zone[i], gk = m.ground[i], v = m.vr[i];
      g.fillStyle = gk === 1 ? PAL.road[z] : gk === 2 ? PAL.pave[z] : gk === 3 ? PAL.floor[z] : gk === 5 ? '#4c5055' : PAL.nat[z];
      g.fillRect(px, py, T, T);
      g.fillStyle = `rgba(0,0,0,${(v & 15) / 15 * .1})`; g.fillRect(px, py, T, T);
      if (gk === 0) {
        if (z === 3) { g.strokeStyle = (v & 3) ? 'rgba(110,50,170,.35)' : 'rgba(170,90,255,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px + (v % 29), py + (v % 13)); g.lineTo(px + ((v * 7) % 31), py + ((v * 3) % 31)); g.stroke(); }
        else { g.fillStyle = z === 2 ? 'rgba(20,10,8,.35)' : 'rgba(255,255,200,.10)'; for (let k = 0; k < 3; k++) g.fillRect(px + ((v * (k + 3)) % 29), py + ((v * (k + 5) + 7) % 29), 2, 3); }
      } else if (gk === 1) {
        if (m.sub[i] === 1 && (my & 1)) { g.fillStyle = z === 3 ? '#4a4460' : '#b9a550'; g.fillRect(px + 15, py + 4, 2, 24); }
        else if (m.sub[i] === 2 && (mx & 1)) { g.fillStyle = z === 3 ? '#4a4460' : '#b9a550'; g.fillRect(px + 4, py + 15, 24, 2); }
        if ((v & 31) === 3) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.moveTo(px + 4, py + 6); g.lineTo(px + 16, py + 15); g.lineTo(px + 12, py + 27); g.stroke(); }
      } else if (gk === 3) { g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 1; g.strokeRect(px + .5, py + .5, T, T / 2); }
      else if (gk === 2) { g.strokeStyle = 'rgba(0,0,0,.12)'; g.strokeRect(px + .5, py + .5, T, T); }
    }
    return { cn, ctx: g, used: frame };
  }
  function drawGround(x0, y0, x1, y1) {
    const cx0 = Math.max(0, Math.floor(x0 / CPX)), cy0 = Math.max(0, Math.floor(y0 / CPX)), cx1 = Math.floor(x1 / CPX), cy1 = Math.floor(y1 / CPX);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const k = cy * 64 + cx; let ch = chunks.get(k);
      if (!ch) { ch = buildChunk(cx, cy); chunks.set(k, ch); if (chunks.size > 30) { let ok = null, ou = 1e18; chunks.forEach((v, kk) => { if (v.used < ou) { ou = v.used; ok = kk; } }); chunks.delete(ok); } }
      ch.used = frame; c.drawImage(ch.cn, cx * CPX, cy * CPX);
    }
  }

  /* ---------- کمک‌رسم ---------- */
  const ell = (x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); };
  const line = (x0, y0, x1, y1) => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
  function bar(x, y, w, frac, col) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x - w / 2 - 1, y - 1, w + 2, 5); c.fillStyle = col; c.fillRect(x - w / 2, y, w * G.clamp(frac, 0, 1), 3); }

  /* ---------- دیوارها ---------- */
  function drawTile(tx, ty, b, i) {
    const m = G.map, px = tx * T, py = ty * T, z = m.zone[i];
    if (b === 1 || b === 4 || b === 5) {
      const H = b === 4 ? 34 : b === 5 ? 26 : 24;
      const top = b === 4 ? (z === 3 ? '#565a66' : '#8d9196') : b === 5 ? '#3b3f3a' : PAL.wallTop[z], fr = b === 4 ? (z === 3 ? '#33363f' : '#5b5f64') : b === 5 ? '#262926' : PAL.wallFront[z];
      const below = ty + 1 < m.h ? m.block[i + m.w] : 0;
      if (below !== b) { c.fillStyle = fr; c.fillRect(px, py + T - H, T, H); if (b === 4) { c.fillStyle = '#c9a227'; c.fillRect(px, py + T - 9, T, 4); c.fillStyle = '#1b1b1b'; for (let k = 0; k < 4; k++) c.fillRect(px + k * 8 + ((tx & 1) ? 4 : 0), py + T - 9, 4, 4); } }
      c.fillStyle = top; c.fillRect(px, py - H, T, T);
      c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(px, py - H, T, 3);
      c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(px + T - 2, py - H, 2, T);
    } else if (b === 2) {
      const s = m.sub[i]; if (s === 1) return;
      const H = s === 0 ? 13 : 9, top = s === 0 ? '#9a7748' : s === 2 ? '#8f8a6a' : PAL.wallTop[z], fr = s === 0 ? '#6c5230' : s === 2 ? '#6b664c' : PAL.wallFront[z], in0 = s === 0 ? 3 : 0;
      c.fillStyle = fr; c.fillRect(px + in0, py + T - H - in0, T - in0 * 2, H);
      c.fillStyle = top; c.fillRect(px + in0, py - H + in0, T - in0 * 2, T - in0 * 2);
      if (s === 0) { c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 1; c.strokeRect(px + in0 + 2.5, py - H + in0 + 2.5, T - in0 * 2 - 5, T - in0 * 2 - 5); }
      else if (s === 2) { c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(px + 15, py - H, 2, T); }
      else { c.fillStyle = 'rgba(160,210,230,.25)'; c.fillRect(px + 3, py - H + 3, T - 6, T - 6); }
    } else if (b === 3) {
      c.fillStyle = 'rgba(0,0,0,.25)'; ell(px + 18, py + 22, 14, 7); c.fill();
      c.fillStyle = '#4a3623'; c.fillRect(px + 13, py - 6, 6, 28);
      if (z === 2 || z === 3) { c.strokeStyle = '#3a2a1c'; c.lineWidth = 2; line(px + 16, py - 4, px + 4, py - 20); line(px + 16, py - 2, px + 28, py - 18); line(px + 16, py + 4, px + 24, py - 6); }
      else { c.globalAlpha = .9; c.fillStyle = PAL.canopy[z]; ell(px + 16, py - 16, 19, 16); c.fill(); c.fillStyle = 'rgba(255,255,255,.08)'; ell(px + 11, py - 21, 9, 7); c.fill(); c.globalAlpha = 1; }
    } else if (b === 6) {
      const p = .5 + .5 * Math.sin(G.time * 2 + tx * 1.7 + ty);
      c.fillStyle = '#0a0810'; c.beginPath(); c.moveTo(px + 4, py + T - 2); c.lineTo(px + 11, py - 22); c.lineTo(px + 17, py + 2); c.lineTo(px + 23, py - 12); c.lineTo(px + 29, py + T - 2); c.closePath(); c.fill();
      c.strokeStyle = `rgba(160,90,255,${.35 + p * .45})`; c.lineWidth = 1.5; c.beginPath(); c.moveTo(px + 11, py - 22); c.lineTo(px + 13, py + 10); c.moveTo(px + 23, py - 12); c.lineTo(px + 22, py + 14); c.stroke();
    }
  }

  /* ---------- سرباز ---------- */
  function drawSoldier(u) {
    const x = u.x, y = u.y;
    c.globalAlpha = .7; c.strokeStyle = u.color; c.lineWidth = u.isCmd ? 2.5 : 1.8; ell(x, y, 12, 7); c.stroke(); c.globalAlpha = 1;
    if (u.downed) {
      c.save(); c.translate(x, y - 2); c.rotate(u.ang + 1.2); c.fillStyle = '#2b2f33'; c.fillRect(-10, -4, 20, 8); c.fillStyle = u.color; ell(11, 0, 4.5, 4.5); c.fill(); c.restore();
      if (!u.isCmd) { const p = .5 + .5 * Math.sin(G.time * 8); c.fillStyle = `rgba(255,60,60,${.5 + p * .5})`; c.fillRect(x - 2, y - 30, 4, 12); c.fillRect(x - 6, y - 26, 12, 4); bar(x, y - 36, 22, u.bleed / 45, '#ff5a5a'); }
      return;
    }
    c.fillStyle = 'rgba(0,0,0,.35)'; ell(x, y + 1, 9, 5); c.fill();
    const bob = u.moving ? Math.sin(u.walk * 2) * 1 : 0, d = G.wOf(u).def;
    c.save(); c.translate(x, y - 9 + bob); c.rotate(u.ang);
    const s = u.moving ? Math.sin(u.walk) * 4.5 : 0;
    c.fillStyle = '#17191d'; c.fillRect(-3 + s, -6, 7, 4); c.fillRect(-3 - s, 2, 7, 4);
    // سلاح
    if (d.melee) { const sw = u.swing > 0 ? (u.swing / .18) * 1.6 - .8 : 0; c.save(); c.rotate(sw); c.fillStyle = '#d5dde3'; c.fillRect(8, 2, 10, 1.8); c.fillStyle = '#222'; c.fillRect(5, 1.6, 4, 2.6); c.restore(); }
    else {
      c.fillStyle = '#101214';
      if (d.proj === 'rocket') { c.fillRect(-9, .5, d.len + 12, 4); c.fillStyle = '#5a6b3a'; if (u.weapons[u.cur].mag > 0) { c.beginPath(); c.moveTo(d.len + 3, -.5); c.lineTo(d.len + 11, 2.5); c.lineTo(d.len + 3, 5.5); c.fill(); } }
      else { c.fillRect(3, 1.2, d.len + 3, d.len > 18 ? 3.4 : 2.8); if (d.len > 14) c.fillRect(1, .6, 7, 4.2); if (d.name === 'M249') c.fillRect(8, 4, 5, 4); }
    }
    c.fillStyle = u.isCmd ? '#3f4b33' : u.squad === 'alpha' ? '#3b3a36' : '#2f3d4b';
    c.beginPath(); c.roundRect(-6, -8, 12, 16, 4); c.fill();
    c.fillStyle = u.color; c.fillRect(-6, -8, 3, 16);
    c.strokeStyle = u.isCmd ? '#56653f' : u.squad === 'alpha' ? '#4d4a43' : '#3e5063'; c.lineWidth = 3; c.lineCap = 'round'; line(0, -6, 9, 2); line(0, 6, 6, 3);
    c.fillStyle = u.hurtT > 0 ? '#ffb0b0' : u.isCmd ? '#586a45' : u.squad === 'alpha' ? '#2a2a2a' : '#44566a'; ell(0, 0, 5.6, 5.6); c.fill();
    c.fillStyle = u.color; c.fillRect(-5, -1.3, 5, 2.6);
    if (u.isCmd) { c.fillStyle = '#ffe27a'; ell(1.5, 0, 1.8, 1.8); c.fill(); }
    c.restore();
    if (!u.isCmd) { bar(x, y - 27, 18, u.hp / u.maxHp, u.hp > u.maxHp * .5 ? '#67e08a' : u.hp > u.maxHp * .25 ? '#ffd23c' : '#ff5a5a'); if (u.medic) { c.fillStyle = '#7dffb0'; c.fillRect(x - 1, y - 35, 2, 6); c.fillRect(x - 3, y - 33, 6, 2); } }
    else { c.fillStyle = '#ffe27a'; c.beginPath(); c.moveTo(x - 4, y - 30); c.lineTo(x, y - 25); c.lineTo(x + 4, y - 30); c.closePath(); c.fill(); }
    const w = u.weapons[u.cur]; if (w.rel > 0 && !u.isCmd) { c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(x + 14, y - 26, 3.5, -1.57, -1.57 + TAU * (1 - w.rel / w.def.reload)); c.stroke(); }
    if (u.reviving) { c.strokeStyle = '#7dffb0'; c.lineWidth = 2; c.beginPath(); c.arc(x, y - 9, 16, -1.57, -1.57 + TAU * (u.task ? u.task.t / 3 : 0)); c.stroke(); }
  }

  /* ---------- زامبی ---------- */
  const DARK = '#121016';
  function drawZombie(z) {
    const f = z.form, F = G.ZT[f], envy = z.type === 'envy', col = envy ? '#19e68c' : F.color, x = z.x, y = z.y, t = z.anim;
    const body = z.hurt > 0 ? '#5a5560' : DARK, glow = .55 + .45 * Math.sin(t * 5);
    if (f === 'sloth') {
      c.fillStyle = 'rgba(0,0,0,.4)'; ell(x, y + 6, 20, 10); c.fill();
      c.strokeStyle = '#23252e'; c.lineWidth = 4; for (let k = 0; k < 4; k++) { const a = k * 1.57 + .5; line(x, y - 4, x + Math.cos(a) * 22, y + Math.sin(a) * 13 + 2); }
      c.fillStyle = z.hurt > 0 ? '#4a4f5e' : '#1a1c24'; c.beginPath(); c.ellipse(x, y - 8 + Math.sin(t * .8) * 1, 19, 20, 0, 0, TAU); c.fill();
      c.fillStyle = '#2a2e3b'; ell(x - 4, y - 16, 9, 8); c.fill();
      c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath(); c.arc(x - 6, y - 10, 3, .2, Math.PI - .2); c.stroke(); c.beginPath(); c.arc(x + 6, y - 10, 3, .2, Math.PI - .2); c.stroke();
      c.beginPath(); c.arc(x, y - 1, 5, .3, Math.PI - .3); c.stroke();
      if (z.lash > 0) { c.strokeStyle = col; c.lineWidth = 3; line(x, y - 6, x + Math.cos(z.lashA) * 52, y + Math.sin(z.lashA) * 52 - 6); }
      c.globalAlpha = .12 + .05 * Math.sin(t * 1.5); c.fillStyle = col; ell(x, y, 46, 30); c.fill(); c.globalAlpha = 1;
    } else if (f === 'lust') {
      c.strokeStyle = '#8a2a5c'; c.lineWidth = 3; c.lineCap = 'round';
      for (let k = 0; k < 7; k++) { const a = k * .9 + .3, l = 26 + Math.sin(t * 1.5 + k) * 4; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a + .5) * l * .6, y + Math.sin(a + .5) * l * .4, x + Math.cos(a) * l, y + Math.sin(a) * l * .6); c.stroke(); }
      c.fillStyle = 'rgba(0,0,0,.35)'; ell(x, y + 2, 15, 8); c.fill();
      c.fillStyle = body; c.beginPath(); c.ellipse(x, y - 8, 12, 13, 0, 0, TAU); c.fill();
      c.fillStyle = body; ell(x, y - 24, 6, 6.5); c.fill();
      c.strokeStyle = col; c.lineWidth = 1.5; for (let k = -2; k <= 2; k++) line(x + k * 2, y - 28, x + k * 4 + Math.sin(t * 2 + k) * 2, y - 14);
      const hs = 4 + glow * 2.5; c.fillStyle = col; c.globalAlpha = .9; ell(x, y - 9, hs, hs); c.fill(); c.globalAlpha = .25; ell(x, y - 9, hs * 2.4, hs * 2.4); c.fill(); c.globalAlpha = 1;
      c.fillStyle = col; c.fillRect(x - 3.5, y - 25, 2, 2); c.fillRect(x + 1.5, y - 25, 2, 2);
      if (z.lash > 0) { c.strokeStyle = col; c.lineWidth = 3; line(x, y - 6, x + Math.cos(z.lashA) * 58, y + Math.sin(z.lashA) * 58 - 6); }
    } else {
      const big = f === 'gluttony';
      c.fillStyle = 'rgba(0,0,0,.35)'; ell(x, y + 1, big ? 20 : F.r, big ? 11 : F.r * .55); c.fill();
      const bob = Math.sin(z.walk * 2) * 1.2;
      c.save(); c.translate(x, y - (big ? 13 : 9) + bob); c.rotate(z.ang);
      if (f === 'wrath') {
        if (z.charge > 0) { c.strokeStyle = 'rgba(255,60,40,.5)'; c.lineWidth = 2; line(-10, -4, -24, -5); line(-10, 4, -24, 5); line(-11, 0, -28, 0); }
        c.fillStyle = col; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(-3, k * 4 - 2); c.lineTo(-11, k * 5); c.lineTo(-3, k * 4 + 2); c.fill(); }
        c.fillStyle = body; ell(0, 0, 7.5, 6.5); c.fill();
        const s = Math.sin(z.walk) * 3; c.strokeStyle = body; c.lineWidth = 3; c.lineCap = 'round'; line(2, -6, 11 + s, -7); line(2, 6, 11 - s, 7);
        c.strokeStyle = col; c.lineWidth = 2; line(11 + s, -7, 15 + s, -8); line(11 - s, 7, 15 - s, 8);
        c.fillStyle = body; ell(5, 0, 4.6, 4.6); c.fill(); c.fillStyle = col; c.fillRect(7, -3, 2.2, 2); c.fillRect(7, 1, 2.2, 2);
      } else if (f === 'greed') {
        c.strokeStyle = col; c.lineWidth = 1.6; c.lineCap = 'round';
        for (const a of [-1.15, -.5, .5, 1.15]) { const w = Math.sin(t * 7 + a * 3) * .25; line(0, 0, Math.cos(a + w) * 14, Math.sin(a + w) * 14); }
        c.fillStyle = body; ell(0, 0, 5.8, 5.2); c.fill(); ell(4, 0, 3.8, 3.8); c.fill();
        c.fillStyle = col; ell(5.5, 0, 2.1, 2.1); c.fill(); c.fillStyle = '#000'; ell(6.2, 0, .9, .9); c.fill();
      } else if (f === 'gluttony') {
        c.fillStyle = body; ell(0, 0, 19, 18); c.fill();
        c.fillStyle = '#1e1a22'; ell(-3, 0, 14, 15); c.fill();
        c.strokeStyle = body; c.lineWidth = 6; c.lineCap = 'round'; line(4, -15, 13, -17); line(4, 15, 13, 17);
        const o = z.lash > 0 ? 6 : 3 + Math.sin(t * 3) * 1; c.fillStyle = col; c.beginPath(); c.ellipse(11, 0, o, 9, 0, 0, TAU); c.fill(); c.fillStyle = '#0a0a0a'; c.beginPath(); c.ellipse(11.5, 0, o * .55, 6.5, 0, 0, TAU); c.fill();
        c.fillStyle = '#e9e6c8'; for (let k = -2; k <= 2; k++) c.fillRect(8.5, k * 3 - .7, 2.6, 1.4);
        c.fillStyle = body; ell(15, 0, 4, 4); c.fill(); c.fillStyle = col; c.fillRect(16.5, -2.4, 1.6, 1.6); c.fillRect(16.5, .8, 1.6, 1.6);
      } else if (f === 'pride') {
        c.fillStyle = '#3d2463'; c.beginPath(); c.moveTo(-3, -8); c.lineTo(-17, -5); c.lineTo(-17, 5); c.lineTo(-3, 8); c.fill();
        c.fillStyle = body; ell(0, 0, 9, 8.5); c.fill();
        c.strokeStyle = body; c.lineWidth = 4; c.lineCap = 'round'; line(2, -8, 10, -8); line(2, 8, 10, 8);
        if (z.armor > 0) {
          c.fillStyle = '#d9b64a'; c.beginPath(); c.roundRect(-5, -11, 9, 6, 2); c.fill(); c.beginPath(); c.roundRect(-5, 5, 9, 6, 2); c.fill();
          c.beginPath(); c.moveTo(-4, -5); c.lineTo(6, -4); c.lineTo(8, 0); c.lineTo(6, 4); c.lineTo(-4, 5); c.closePath(); c.fill();
          c.strokeStyle = '#7a6220'; c.lineWidth = 1; c.stroke();
        } else { c.strokeStyle = col; c.lineWidth = 1.3; line(-5, -4, 1, 0); line(1, 0, -3, 5); line(1, 0, 6, -3); }
        c.fillStyle = body; ell(5, 0, 5, 5); c.fill();
        c.fillStyle = z.armor > 0 ? '#ffe9a8' : '#6a5a2a'; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(1, k * 3.4 - 1.6); c.lineTo(-4, k * 3.4); c.lineTo(1, k * 3.4 + 1.6); c.fill(); }
        c.fillStyle = col; c.fillRect(7.5, -2.6, 2, 1.8); c.fillRect(7.5, .8, 2, 1.8);
      } else if (f === 'twin') {
        c.fillStyle = body; ell(0, 0, 5.5, 5); c.fill(); c.strokeStyle = body; c.lineWidth = 2.4; c.lineCap = 'round'; const s = Math.sin(z.walk) * 2; line(1, -4, 8 + s, -5); line(1, 4, 8 - s, 5);
        c.fillStyle = col; ell(3.5, 0, 3.4, 3.4); c.fill(); c.fillStyle = '#000'; c.fillRect(5, -1.8, 1.4, 1.2); c.fillRect(5, .6, 1.4, 1.2);
      } else { // envy
        c.globalAlpha = .75 + .25 * Math.sin(t * 9); c.fillStyle = body; ell(0, 0, 6.5, 6); c.fill(); c.globalAlpha = 1;
        c.strokeStyle = body; c.lineWidth = 2.6; c.lineCap = 'round'; const s = Math.sin(z.walk) * 3; line(1, -5, 10 + s, -6); line(1, 5, 10 - s, 6);
        c.fillStyle = '#d8ffe9'; c.beginPath(); c.ellipse(4.5, 0, 3.6, 4.6, 0, 0, TAU); c.fill();
        c.fillStyle = col; c.fillRect(5, -3.2, 1.8, 1.6); c.fillRect(5, -.8, 1.8, 1.6); c.fillRect(5, 1.6, 1.8, 1.6);
      }
      c.restore();
      if (envy && f !== 'envy') { c.globalAlpha = .3 + .25 * glow; c.strokeStyle = '#19e68c'; c.lineWidth = 2; ell(x, y - (big ? 13 : 9), (big ? 21 : F.r + 3), (big ? 20 : F.r + 3)); c.stroke(); c.globalAlpha = 1; }
    }
    const top = y - (f === 'gluttony' ? 40 : f === 'sloth' || f === 'lust' ? 38 : 26);
    if (z.armor > 0) bar(x, top - 5, 22, z.armor / z.maxArmor, '#ffd86b');
    if (z.hp < z.maxHp) bar(x, top, 22, z.hp / z.maxHp, col);
  }

  /* ---------- اشیای ماموریت ---------- */
  function drawCar(k) {
    const px = k.x * T, py = k.y * T, w = k.w * T, h = k.h * T, col = k.burnt ? '#2a2725' : k.c;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(px + 2, py + 6, w - 2, h - 2);
    c.fillStyle = '#151515'; c.beginPath(); c.roundRect(px + 3, py - 2, w - 6, h - 4, 5); c.fill();
    c.fillStyle = col; c.beginPath(); c.roundRect(px + 3, py - 8, w - 6, h - 5, 6); c.fill();
    c.fillStyle = k.burnt ? '#141414' : 'rgba(150,200,230,.55)';
    if (k.w > k.h) { c.fillRect(px + 16, py - 5, 10, h - 11); c.fillRect(px + w - 28, py - 5, 10, h - 11); } else { c.fillRect(px + 6, py + 6, w - 12, 9); c.fillRect(px + 6, py + h - 30, w - 12, 9); }
  }
  function drawProp(p) {
    const x = p.x, y = p.y, t = G.time;
    if (p.kind === 'crate') {
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x - 12, y - 2, 26, 12);
      c.fillStyle = p.uses > 0 ? '#3f5a34' : '#3c3c3c'; c.fillRect(x - 12, y - 14, 24, 20); c.fillStyle = p.uses > 0 ? '#5a7a48' : '#555'; c.fillRect(x - 12, y - 20, 24, 10);
      c.fillStyle = '#ffe27a'; c.fillRect(x - 1.5, y - 12, 3, 12); c.fillRect(x - 6, y - 7.5, 12, 3);
      if (p.uses > 0) { c.globalAlpha = .3 + .2 * Math.sin(t * 3); c.strokeStyle = '#ffe27a'; c.lineWidth = 1.5; ell(x, y + 2, 22, 12); c.stroke(); c.globalAlpha = 1; }
    } else if (p.kind === 'sample') {
      const g = .5 + .5 * Math.sin(t * 4);
      c.globalAlpha = .25 + g * .2; c.fillStyle = '#b57bff'; ell(x, y, 24, 14); c.fill(); c.globalAlpha = 1;
      c.fillStyle = '#2b2f36'; c.fillRect(x - 8, y - 16, 16, 18); c.fillStyle = '#0a0810'; c.fillRect(x - 5, y - 13, 10, 10); c.fillStyle = `rgba(190,120,255,${.5 + g * .5})`; c.fillRect(x - 3, y - 11, 6, 6);
    } else if (p.kind === 'core') {
      const g = .5 + .5 * Math.sin(t * 2.2);
      if (G.mission.coreDead) { c.fillStyle = 'rgba(0,0,0,.7)'; ell(x, y, 60, 36); c.fill(); c.fillStyle = '#1c1228'; ell(x, y, 34, 20); c.fill(); return; }
      c.strokeStyle = '#3a1d5c'; c.lineWidth = 5; c.lineCap = 'round'; for (let k = 0; k < 8; k++) { const a = k * .785 + Math.sin(t + k) * .1; c.beginPath(); c.moveTo(x, y - 6); c.quadraticCurveTo(x + Math.cos(a + .4) * 50, y + Math.sin(a + .4) * 30, x + Math.cos(a) * 92, y + Math.sin(a) * 56); c.stroke(); }
      c.fillStyle = 'rgba(0,0,0,.5)'; ell(x, y + 6, 44, 24); c.fill();
      c.fillStyle = '#07060b'; c.beginPath(); c.ellipse(x, y - 26, 34 + g * 2, 44 + g * 3, 0, 0, TAU); c.fill();
      c.globalAlpha = .25 + g * .3; c.fillStyle = '#9a5cff'; ell(x, y - 28, 20 + g * 6, 26 + g * 7); c.fill(); c.globalAlpha = 1;
      c.strokeStyle = `rgba(190,130,255,${.4 + g * .5})`; c.lineWidth = 2; for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(x + (k - 2) * 9, y - 62); c.lineTo(x + (k - 2) * 13 + Math.sin(t * 2 + k) * 5, y + 4); c.stroke(); }
      if (G.mission.fuse > 0) { c.fillStyle = (G.time * 4 | 0) & 1 ? '#ff3b2f' : '#ffe27a'; c.fillRect(x - 5, y + 2, 10, 8); c.fillStyle = '#fff'; c.font = 'bold 18px Tahoma,sans-serif'; c.textAlign = 'center'; c.fillText(G.fa(Math.ceil(G.mission.fuse)), x, y - 84); }
    } else if (p.kind === 'beacon') {
      c.fillStyle = '#30363c'; c.fillRect(x - 2, y - 34, 4, 36); c.fillStyle = '#20252a'; c.fillRect(x - 8, y - 2, 16, 6);
      const on = (t * 2 | 0) & 1; c.fillStyle = on ? '#7fd0ff' : '#28506b'; ell(x, y - 36, 5, 5); c.fill(); if (on) { c.globalAlpha = .25; ell(x, y - 36, 16, 16); c.fill(); c.globalAlpha = 1; }
    } else if (p.kind === 'heli') {
      const hx = p.x, hy = p.y - p.z;
      c.fillStyle = 'rgba(0,0,0,.35)'; ell(p.x, p.y + 8, 60, 22); c.fill();
      c.fillStyle = '#2d3a2e'; c.beginPath(); c.ellipse(hx, hy, 44, 20, 0, 0, TAU); c.fill(); c.fillRect(hx - 100, hy - 5, 62, 9); c.fillRect(hx - 108, hy - 16, 8, 26);
      c.fillStyle = 'rgba(140,200,230,.7)'; c.beginPath(); c.ellipse(hx + 24, hy - 2, 16, 12, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(20,20,20,.55)'; c.lineWidth = 5; const a = t * 30; line(hx - Math.cos(a) * 82, hy - 20 - Math.sin(a) * 24, hx + Math.cos(a) * 82, hy - 20 + Math.sin(a) * 24); line(hx - Math.cos(a + 1.57) * 82, hy - 20 - Math.sin(a + 1.57) * 24, hx + Math.cos(a + 1.57) * 82, hy - 20 + Math.sin(a + 1.57) * 24);
    }
  }

  /* ---------- نشانگرهای زمینی ---------- */
  function groundMarks() {
    const S = G.map.sites, t = G.time;
    for (const s of [S.lz, S.ex]) { c.strokeStyle = s === S.lz ? 'rgba(61,220,132,.7)' : 'rgba(77,184,255,.8)'; c.lineWidth = 3; c.beginPath(); c.arc(s.x, s.y, 86, 0, TAU); c.stroke(); c.lineWidth = 6; line(s.x - 22, s.y - 26, s.x - 22, s.y + 26); line(s.x + 22, s.y - 26, s.x + 22, s.y + 26); line(s.x - 22, s.y, s.x + 22, s.y); }
    for (const p of G.pools) { const a = Math.min(1, p.t / 1.5); c.globalAlpha = .5 * a; c.fillStyle = '#9bd41e'; ell(p.x, p.y, p.r, p.r * .72); c.fill(); c.globalAlpha = .8 * a; c.fillStyle = '#d6ff5a'; for (let k = 0; k < 4; k++) { const an = k * 1.7 + t; ell(p.x + Math.cos(an) * p.r * .5, p.y + Math.sin(an * 1.3) * p.r * .35, 2 + Math.sin(t * 5 + k), 2); c.fill(); } c.globalAlpha = 1; }
    for (const l of G.lures) { c.fillStyle = '#4db8ff'; ell(l.x, l.y, 4, 3); c.fill(); c.globalAlpha = .15; ell(l.x, l.y, 440, 440); c.strokeStyle = '#4db8ff'; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1; }
    for (const sq of [G.squads.alpha, G.squads.delta]) {
      const o = sq.order; if (!G.aliveOf(sq).length) continue;
      c.strokeStyle = sq.color; c.fillStyle = sq.color; c.lineWidth = 1.5;
      if (o.type === 'patrol') { c.setLineDash([8, 6]); c.globalAlpha = .6; line(o.a.x, o.a.y, o.b.x, o.b.y); c.setLineDash([]); ell(o.a.x, o.a.y, 9, 6); c.stroke(); ell(o.b.x, o.b.y, 9, 6); c.stroke(); c.globalAlpha = 1; }
      else if (o.x != null && o.type !== 'follow' && o.kind !== 'hold') {
        const r = o.type === 'clear' ? o.R : o.kind === 'defend' ? 78 : o.type === 'sd' ? 60 : 16;
        c.globalAlpha = .5; c.setLineDash(o.type === 'clear' || o.kind === 'defend' ? [10, 8] : []); ell(o.x, o.y, r, r * (r > 100 ? 1 : .62)); c.stroke(); c.setLineDash([]);
        if (o.type === 'destroy' || o.type === 'firesup') { c.globalAlpha = .9; line(o.x - 14, o.y, o.x + 14, o.y); line(o.x, o.y - 14, o.x, o.y + 14); c.strokeStyle = '#ff4a3c'; ell(o.x, o.y, 22 + Math.sin(t * 6) * 3, 22 + Math.sin(t * 6) * 3); c.stroke(); }
        c.globalAlpha = .85; c.fillRect(o.x - 1, o.y - 22, 2, 22); c.beginPath(); c.moveTo(o.x + 1, o.y - 22); c.lineTo(o.x + 13, o.y - 17); c.lineTo(o.x + 1, o.y - 12); c.fill(); c.globalAlpha = 1;
      }
    }
    for (const mk of G.markers) { const k = 1 - mk.t / 1.2; c.globalAlpha = 1 - k; c.strokeStyle = mk.c; c.lineWidth = 2.5; ell(mk.x, mk.y, 8 + k * 30, (8 + k * 30) * .62); c.stroke(); c.globalAlpha = 1; }
  }

  /* ---------- حلقهٔ اصلی رندر ---------- */
  const rows = [];
  G.render = function () {
    frame++;
    const m = G.map, cmd = G.cmd, z = view.zoom * view.dpr;
    const shx = view.shake ? G.rand(-1, 1) * view.shake : 0, shy = view.shake ? G.rand(-1, 1) * view.shake : 0;
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#07090a'; c.fillRect(0, 0, cv.width, cv.height);
    c.setTransform(z, 0, 0, z, Math.round(cv.width / 2 - (view.x + shx) * z), Math.round(cv.height / 2 - (view.y + shy) * z));
    const x0 = view.x - view.w / 2, y0 = view.y - view.h / 2, x1 = view.x + view.w / 2, y1 = view.y + view.h / 2;
    drawGround(x0, y0, x1, y1);
    groundMarks();
    const tx0 = Math.max(0, Math.floor(x0 / T) - 1), tx1 = Math.min(m.w - 1, Math.floor(x1 / T) + 1), ty0 = Math.max(0, Math.floor(y0 / T) - 1), ty1 = Math.min(m.h - 1, Math.floor(y1 / T) + 3);
    const nr = ty1 - ty0 + 1; for (let i = 0; i < nr; i++) { if (rows[i]) rows[i].length = 0; else rows[i] = []; }
    const put = (e, y) => { const r = Math.floor(y / T) - ty0; if (r >= 0 && r < nr) rows[r].push(e); };
    for (const s of G.soldiers) if (!s.dead) put(s, s.y);
    for (const zb of G.zActive) if (!zb.dead && zb.x > x0 - 60 && zb.x < x1 + 60) put(zb, zb.y);
    for (const k of m.cars) if (k.x * T < x1 && (k.x + k.w) * T > x0) put(k, (k.y + k.h) * T - 1);
    for (const p of G.props) put(p, p.y + (p.kind === 'core' ? 20 : 0));
    for (let ty = ty0; ty <= ty1; ty++) {
      const base = ty * m.w;
      for (let tx = tx0; tx <= tx1; tx++) { const b = m.block[base + tx]; if (b && b !== 7) drawTile(tx, ty, b, base + tx); }
      const r = rows[ty - ty0]; if (r.length > 1) r.sort((a, b) => a.y - b.y);
      for (const e of r) { if (e.kind === 's') drawSoldier(e); else if (e.kind === 'z') drawZombie(e); else if (e.c !== undefined && e.w) drawCar(e); else drawProp(e); }
    }
    // پرتابه‌ها و افکت‌ها
    for (const p of G.projs) {
      if (p.type === 'rocket') { c.save(); c.translate(p.x, p.y - 10); c.rotate(p.ang); c.fillStyle = '#5a6b3a'; c.fillRect(-8, -2, 14, 4); c.fillStyle = '#ffb347'; c.fillRect(-13, -1.5, 6, 3); c.restore(); }
      else { c.fillStyle = 'rgba(0,0,0,.3)'; ell(p.x, p.y, 4, 2.5); c.fill(); c.fillStyle = p.type === 'acid' ? '#b6f03a' : p.type === 'lure' ? '#4db8ff' : '#2e3a25'; ell(p.x, p.y - 8 - (p.z || 0), p.type === 'acid' ? 6 : 4, p.type === 'acid' ? 6 : 4); c.fill(); if (p.type === 'frag' && p.t >= p.dur && ((G.time * 12 | 0) & 1)) { c.fillStyle = '#ff3b2f'; ell(p.x, p.y - 8, 2, 2); c.fill(); } }
    }
    c.lineCap = 'round';
    for (const tr of tracers) { c.globalAlpha = tr.t / .07; c.strokeStyle = tr.color; c.lineWidth = 1.4; line(tr.x0, tr.y0 - 10, tr.x1, tr.y1 - 10); }
    c.globalAlpha = 1;
    for (const f of flashes) { c.save(); c.translate(f.x, f.y - 10); c.rotate(f.ang); c.fillStyle = '#fff3b0'; c.beginPath(); c.moveTo(0, -3); c.lineTo(13, 0); c.lineTo(0, 3); c.fill(); c.globalAlpha = .35; c.fillStyle = '#ffb347'; ell(3, 0, 10, 10); c.fill(); c.restore(); }
    for (const p of parts) { c.globalAlpha = Math.min(1, p.life / p.max * (p.smoke ? .5 : 1.4)); c.fillStyle = p.color; if (p.smoke) { ell(p.x, p.y - 10, p.size, p.size); c.fill(); } else c.fillRect(p.x - p.size / 2, p.y - 10 - p.size / 2, p.size, p.size); }
    c.globalAlpha = 1;
    for (const r of rings) { const k = 1 - r.t / r.max; c.globalAlpha = (1 - k) * .8; c.strokeStyle = r.color; c.lineWidth = 2.5; ell(r.x, r.y - 6, r.r * k, r.r * k * .8); c.stroke(); }
    for (const b of booms) { const k = 1 - b.t / b.max; c.globalAlpha = (1 - k); c.fillStyle = k < .3 ? '#fff7d0' : '#ff9d2e'; ell(b.x, b.y - 8, b.r * (.35 + k * .65), b.r * (.35 + k * .65) * .85); c.fill(); c.globalAlpha = (1 - k) * .6; c.strokeStyle = '#fff'; c.lineWidth = 3; ell(b.x, b.y - 8, b.r * k * 1.15, b.r * k); c.stroke(); }
    c.globalAlpha = 1;
    // حالت هدف‌گیری فرمان
    if (G.ui.targeting) { const p = G.input.world; c.strokeStyle = G.ui.targeting.color; c.lineWidth = 2; c.setLineDash([6, 5]); ell(p.x, p.y, 20, 13); c.stroke(); c.setLineDash([]); line(p.x - 8, p.y, p.x + 8, p.y); line(p.x, p.y - 6, p.x, p.y + 6); }

    /* ---- لایه‌های صفحه ---- */
    c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    const W = view.sw, Hh = view.sh, dk = G.dark;
    if (dk > .01) { const g = c.createRadialGradient(W / 2, Hh / 2, Math.min(W, Hh) * .22, W / 2, Hh / 2, Math.max(W, Hh) * .72); const tint = G.zoneNow === 3 ? '12,4,24' : G.zoneNow === 2 ? '26,4,2' : '0,0,0'; g.addColorStop(0, `rgba(${tint},${dk * .25})`); g.addColorStop(1, `rgba(${tint},${Math.min(.93, dk * 2.4)})`); c.fillStyle = g; c.fillRect(0, 0, W, Hh); }
    if (G.zoneNow === 3) { c.fillStyle = 'rgba(170,110,255,.5)'; for (let k = 0; k < 26; k++) { const px = (k * 137.5 + G.time * (12 + k % 5 * 4)) % W, py = (k * 71.3 + Hh - (G.time * (18 + k % 7 * 5)) % Hh) % Hh; c.fillRect(px, py, 2, 2); } }
    if (G.fx.hurt > 0 || cmd.hp < cmd.maxHp * .3) { const a = Math.max(G.fx.hurt * .55, cmd.hp < cmd.maxHp * .3 ? .25 + .1 * Math.sin(G.time * 6) : 0); const g = c.createRadialGradient(W / 2, Hh / 2, Math.min(W, Hh) * .3, W / 2, Hh / 2, Math.max(W, Hh) * .7); g.addColorStop(0, 'rgba(200,0,0,0)'); g.addColorStop(1, `rgba(200,0,0,${a})`); c.fillStyle = g; c.fillRect(0, 0, W, Hh); }
    // فلش هدف‌های خارج از صفحه
    for (const o of G.objPoints()) {
      const sx = (o.x - view.x) * view.zoom + W / 2, sy = (o.y - view.y) * view.zoom + Hh / 2;
      if (sx > 30 && sx < W - 30 && sy > 30 && sy < Hh - 30) { c.fillStyle = o.c; c.globalAlpha = .9; c.beginPath(); const yy = sy - 58 * view.zoom + Math.sin(G.time * 4) * 4; c.moveTo(sx - 7, yy - 10); c.lineTo(sx + 7, yy - 10); c.lineTo(sx, yy); c.fill(); c.globalAlpha = 1; continue; }
      const a = Math.atan2(sy - Hh / 2, sx - W / 2), ex = G.clamp(sx, 44, W - 44), ey = G.clamp(sy, 70, Hh - 150);
      c.save(); c.translate(ex, ey); c.rotate(a); c.fillStyle = o.c; c.beginPath(); c.moveTo(14, 0); c.lineTo(-8, -9); c.lineTo(-8, 9); c.fill(); c.restore();
      c.fillStyle = '#fff'; c.font = '11px Tahoma,sans-serif'; c.textAlign = 'center'; c.fillText(o.t + ' ' + G.fa(Math.round(Math.hypot(o.x - cmd.x, o.y - cmd.y) / T)) + 'م', ex, ey + 24);
    }
    // نشانه‌گر
    if (!G.touch && G.state === 'play') {
      const mx = G.input.mx, my = G.input.my, w = G.wOf(cmd), sp = 6 + (cmd.moving ? 5 : 0) + (cmd.fired > 0 ? 4 : 0);
      c.strokeStyle = G.ui.targeting ? G.ui.targeting.color : '#fff'; c.lineWidth = 1.6; line(mx - sp - 6, my, mx - sp, my); line(mx + sp, my, mx + sp + 6, my); line(mx, my - sp - 6, mx, my - sp); line(mx, my + sp, mx, my + sp + 6);
      c.fillStyle = '#ff5a4a'; c.fillRect(mx - 1, my - 1, 2, 2);
      if (w.rel > 0) { c.strokeStyle = '#ffe27a'; c.lineWidth = 3; c.beginPath(); c.arc(mx, my, 16, -1.57, -1.57 + TAU * (1 - w.rel / w.def.reload)); c.stroke(); }
    }
  };

  /* ---------- نقشهٔ کوچک ---------- */
  let mmBase = null;
  G.buildMinimap = function () {
    const m = G.map, S = 2; mmBase = document.createElement('canvas'); mmBase.width = m.w * S; mmBase.height = m.h * S; const g = mmBase.getContext('2d');
    const zc = ['#1f5a35', '#6a5c1c', '#6a221c', '#1a0f2a', '#1c4a6a'];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const i = y * m.w + x, b = m.block[i];
      g.fillStyle = b === 4 ? '#c9c9c9' : b === 5 ? '#0c0c0c' : b === 1 ? '#8f8776' : b === 7 ? '#b57bff' : m.ground[i] === 1 ? '#3b3d42' : zc[m.zone[i]];
      g.fillRect(x * S, y * S, S, S);
    }
    G.minimapDirty = false;
  };
  G.drawMinimap = function (cn, big) {
    if (!mmBase) return; const g = cn.getContext('2d'), m = G.map, sc = cn.width / (m.w * T);
    g.imageSmoothingEnabled = false; g.drawImage(mmBase, 0, 0, cn.width, cn.height);
    const dot = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x * sc, y * sc, r, 0, TAU); g.fill(); };
    for (const gt of m.gates) if (gt.sloth) { g.fillStyle = '#e8f0ff'; g.fillRect(gt.cx * T * sc - 3, gt.cy * T * sc - 3, 7, 7); g.fillStyle = '#39465e'; g.fillRect(gt.cx * T * sc - 1.5, gt.cy * T * sc - 1.5, 4, 4); }
    for (const z of G.zActive) { if (z.dead || z.form === 'sloth') continue; let near = false; for (const s of G.soldiers) if (!s.dead && Math.hypot(s.x - z.x, s.y - z.y) < 640) { near = true; break; } if (near) dot(z.x, z.y, big ? 2.2 : 1.4, G.ZT[z.type].color); }
    for (const p of G.props) { if (p.kind === 'crate' && p.uses > 0) dot(p.x, p.y, big ? 4 : 2.5, '#ffe27a'); }
    for (const o of G.objPoints()) { const r = (big ? 6 : 4) + Math.sin(G.time * 5) * 1.2; g.strokeStyle = o.c; g.lineWidth = 2; g.beginPath(); g.arc(o.x * sc, o.y * sc, r, 0, TAU); g.stroke(); }
    for (const s of G.soldiers) if (!s.dead && !s.isCmd) dot(s.x, s.y, big ? 3 : 2, s.downed ? '#ff5a5a' : s.color);
    const cm = G.cmd; g.fillStyle = '#fff'; g.beginPath(); g.arc(cm.x * sc, cm.y * sc, big ? 4.5 : 3.2, 0, TAU); g.fill(); g.strokeStyle = '#ffe27a'; g.lineWidth = 1.5; g.stroke();
    if (!big) { g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.strokeRect((view.x - view.w / 2) * sc, (view.y - view.h / 2) * sc, view.w * sc, view.h * sc); }
    else { g.font = 'bold 13px Tahoma,sans-serif'; g.textAlign = 'center'; const lab = (t, x, y, col) => { g.fillStyle = 'rgba(0,0,0,.6)'; const w = g.measureText(t).width + 10; g.fillRect(x * sc - w / 2, y * sc - 13, w, 18); g.fillStyle = col; g.fillText(t, x * sc, y * sc); }; const S = m.sites; lab('پیاده‌سازی', S.lz.x, S.lz.y - 110, '#3ddc84'); lab('خروج', S.ex.x, S.ex.y + 150, '#4db8ff'); lab('هستهٔ ماده سیاه', S.core.x, S.core.y - 90, '#c9a0ff'); }
  };
})();
