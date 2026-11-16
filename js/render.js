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
  const parts = [], tracers = [], rings = [], booms = [], flashes = [], bullets = [], casings = [], debris = [];
  const srand = seed => { let s = (seed * 9301 + 49297) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
  const chunkAt = (x, y) => chunks.get(Math.floor(y / CPX) * 64 + Math.floor(x / CPX));
  G.fx = {
    hurt: 0,
    black: 0,
    reset() { this.black = 0; debris.length = bullets.length = casings.length = parts.length = tracers.length = rings.length = booms.length = flashes.length = 0; chunks.clear(); this.hurt = 0; view.shake = 0; },
    tracer() { },
    bullet(x, y, a, len) { if (bullets.length < 400) bullets.push({ x, y, a, left: len, go: 0 }); },
    casing(x, y, a) { if (casings.length > 260) casings.shift(); const ea = a + Math.PI / 2 + .25 + G.rand(-.25, .25), sp = G.rand(55, 95); casings.push({ x, y, vx: Math.cos(ea) * sp, vy: Math.sin(ea) * sp, z: 9, vz: G.rand(110, 160), rot: Math.random() * TAU, vr: G.rand(-24, 24) }); },
    dust(x, y, vx, vy) { if (parts.length < 900) parts.push({ x, y, vx, vy, life: .9, max: .9, color: '#8a8070', size: 5, smoke: 1 }); },
    muzzle(x, y, ang) { flashes.push({ x, y, ang, t: .05 }); },
    burst(x, y, color, n, sp, life, size) { if (parts.length > 900) return; for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = sp * (.3 + Math.random() * .7); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: life * (.6 + Math.random() * .6), max: life, color, size: size * (.6 + Math.random() * .8) }); } },
    smoke(x, y) { if (parts.length < 900) parts.push({ x, y, vx: G.rand(-12, 12), vy: G.rand(-28, -8), life: .7, max: .7, color: '#9a9a9a', size: 5, smoke: 1 }); },
    ring(x, y, r, color) { rings.push({ x, y, r, t: .5, max: .5, color }); },
    // --- افکت برخورد بر اساس جنس ---
    sparks(x, y, a, n, col) { if (parts.length > 900) return; for (let i = 0; i < n; i++) { const d = a + G.rand(-.9, .9), s = G.rand(120, 380); parts.push({ x, y, vx: Math.cos(d) * s, vy: Math.sin(d) * s, life: G.rand(.12, .32), max: .3, color: col || (Math.random() < .5 ? '#fff3b0' : '#ffb347'), size: 1.4, spark: 1 }); } flashes.push({ x, y, ang: a, t: .04, hit: 1 }); },
    chips(x, y, a, color, n) { if (parts.length > 900) return; for (let i = 0; i < n; i++) { const d = a + G.rand(-.8, .8), s = G.rand(40, 150); parts.push({ x, y, vx: Math.cos(d) * s, vy: Math.sin(d) * s, life: G.rand(.25, .5), max: .5, color, size: G.rand(1.4, 2.8) }); } },
    puff(x, y, color, n) { if (parts.length > 900) return; for (let i = 0; i < n; i++) parts.push({ x: x + G.rand(-6, 6), y: y + G.rand(-6, 6), vx: G.rand(-22, 22), vy: G.rand(-22, 22), life: G.rand(.5, .9), max: .9, color, size: G.rand(3, 6), smoke: 1 }); },
    flame(x, y) { if (parts.length < 900) parts.push({ x, y, vx: G.rand(-14, 14), vy: G.rand(-34, -10), life: .45, max: .45, color: Math.random() < .5 ? '#ff7a1e' : '#ffd24a', size: G.rand(3, 5), smoke: 1, hot: 1 }); },
    glass(x, y, a) { for (let i = 0; i < 12; i++) { const d = a + G.rand(-1.1, 1.1), s = G.rand(60, 240); parts.push({ x: x + G.rand(-10, 10), y: y + G.rand(-10, 10), vx: Math.cos(d) * s, vy: Math.sin(d) * s, life: G.rand(.3, .6), max: .6, color: Math.random() < .5 ? '#dff4ff' : '#9fd3ea', size: G.rand(1.5, 3) }); } this.remain('glass', x + Math.cos(a) * 14, y + Math.sin(a) * 14, a, 1); },
    leaves(x, y, r, color, n) { if (parts.length > 900) return; for (let i = 0; i < n; i++) { const d = Math.random() * TAU, q = Math.random() * r; parts.push({ x: x + Math.cos(d) * q, y: y + Math.sin(d) * q, vx: Math.cos(d) * G.rand(20, 80), vy: Math.sin(d) * G.rand(20, 80), life: G.rand(.6, 1.3), max: 1.3, color, size: G.rand(2.5, 4.5), leaf: 1 }); } },
    // تکه‌های پرتاب‌شونده: می‌پرند، می‌غلتند و روی زمین می‌مانند
    debris(x, y, kind, n, ang, color) {
      const D = { plank: ['#b5834a', 12, 3.5], metal: [color || '#666', 7, 5], plastic: ['#33678e', 6, 4], concrete: ['#8b857b', 6, 5], stone: ['#9c9a90', 6, 5], sack: ['#b3a172', 11, 6], tire: ['#1e1e1e', 13, 13], crystal: ['#3a1d5c', 6, 3] }[kind];
      for (let i = 0; i < n; i++) {
        if (debris.length > 220) debris.shift();
        const d = ang != null ? ang + G.rand(-1.3, 1.3) : Math.random() * TAU, sp = G.rand(50, 210), k = G.rand(.6, 1.2);
        debris.push({ x: x + G.rand(-8, 8), y: y + G.rand(-8, 8), vx: Math.cos(d) * sp, vy: Math.sin(d) * sp, z: G.rand(4, 18), vz: G.rand(90, 260), rot: Math.random() * TAU, vr: G.rand(-14, 14), kind, col: D[0], w: D[1] * k, h: D[2] * (kind === 'tire' ? k : G.rand(.7, 1.2)) });
      }
    },
    // آثار ماندگار روی زمین (کنده، خاک‌ریز، آوار...) که با بازسازی زمین هم می‌مانند
    remain(type, x, y, r, s, col) {
      const m = G.map, rm = { t: type, x, y, r: r || 0, s: s || 1, c: col }; if (m.remains.length > 1400) m.remains.shift(); m.remains.push(rm);
      const R = 70 * rm.s;
      for (let cy = Math.floor((y - R) / CPX); cy <= Math.floor((y + R) / CPX); cy++) for (let cx = Math.floor((x - R) / CPX); cx <= Math.floor((x + R) / CPX); cx++) { const ch = chunks.get(cy * 64 + cx); if (ch) drawRemain(ch.ctx, rm, x - cx * CPX, y - cy * CPX); }
    },
    boom(x, y, r) { booms.push({ x, y, r, t: .45, max: .45 }); this.burst(x, y, '#ffb347', 16, 260, .5, 4); this.burst(x, y, '#3b3b3b', 12, 120, .9, 6); for (let i = 0; i < 6; i++) this.smoke(x + G.rand(-20, 20), y + G.rand(-20, 20)); this.decal(x, y, 'scorch', '#000', r * .55); },
    shake(a) { view.shake = Math.max(view.shake, a); },
    decal(x, y, type, color, size) {
      const cx = Math.floor(x / CPX), cy = Math.floor(y / CPX), ch = chunks.get(cy * 64 + cx); if (!ch) return;
      const g = ch.ctx, lx = x - cx * CPX, ly = y - cy * CPX;
      if (type === 'blood') { for (let i = 0; i < 6; i++) { g.globalAlpha = .5; g.fillStyle = i < 4 ? '#08070b' : color; g.beginPath(); g.ellipse(lx + G.rand(-size, size) * .6, ly + G.rand(-size, size) * .4, size * G.rand(.2, .55), size * G.rand(.12, .35), 0, 0, TAU); g.fill(); } }
      else if (type === 'scorch') { // ردّ سوختگی: لکه‌های ریز و نامنظم (بدون هالهٔ سیاه)
        for (let i = 0; i < 16; i++) { const a = Math.random() * TAU, d = Math.random() * size * .75, w = G.rand(.08, .22) * size; g.globalAlpha = .13; g.fillStyle = i % 3 ? '#2a211a' : '#4a3d30'; g.beginPath(); g.ellipse(lx + Math.cos(a) * d, ly + Math.sin(a) * d, w, w * G.rand(.5, .9), a, 0, TAU); g.fill(); }
        g.globalAlpha = .5; g.fillStyle = '#1f1914'; for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, d = Math.random() * size; g.fillRect(lx + Math.cos(a) * d, ly + Math.sin(a) * d, 1.6, 1.6); }
      }
      else { g.globalAlpha = .35; g.fillStyle = color; g.beginPath(); g.ellipse(lx, ly, size, size * .7, 0, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
    },
    update(dt) {
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; } p.x += p.vx * dt; p.y += p.vy * dt; const f = p.spark ? .97 : .92; p.vx *= f; p.vy = p.smoke ? p.vy : p.vy * f; if (p.smoke) p.size += (p.hot ? -4 : 14) * dt; }
      for (let i = debris.length - 1; i >= 0; i--) {
        const k = debris[i]; k.x += k.vx * dt; k.y += k.vy * dt; k.rot += k.vr * dt;
        if (G.SOLID[G.map.block[G.tileAt(k.x, k.y)] || 0]) { k.x -= k.vx * dt; k.y -= k.vy * dt; k.vx *= -.4; k.vy *= -.4; }
        if (k.z > 0 || k.vz > 0) { k.vz -= 700 * dt; k.z += k.vz * dt; if (k.z <= 0) { k.z = 0; if (Math.abs(k.vz) > 70) { k.vz = -k.vz * .35; k.vx *= .5; k.vy *= .5; k.vr *= .5; } else k.vz = 0; } }
        else { const f = Math.exp(-(k.kind === 'tire' ? 1.6 : 6) * dt); k.vx *= f; k.vy *= f; k.vr *= f; if (Math.hypot(k.vx, k.vy) < 4) { const ch = chunkAt(k.x, k.y); if (ch) drawPiece(ch.ctx, k, k.x - Math.floor(k.x / CPX) * CPX, k.y - Math.floor(k.y / CPX) * CPX, 1); debris.splice(i, 1); } }
      }
      for (let i = bullets.length - 1; i >= 0; i--) { const b = bullets[i]; b.go += 1700 * dt; if (b.go >= b.left + 40) { bullets[i] = bullets[bullets.length - 1]; bullets.pop(); } }
      for (let i = casings.length - 1; i >= 0; i--) {
        const k = casings[i]; k.x += k.vx * dt; k.y += k.vy * dt; k.rot += k.vr * dt;
        if (k.z > 0 || k.vz > 0) { k.vz -= 900 * dt; k.z += k.vz * dt; if (k.z <= 0) { k.z = 0; if (Math.abs(k.vz) > 60) { k.vz = -k.vz * .42; k.vx *= .55; k.vy *= .55; k.vr = k.vr * .5 + G.rand(-5, 5); } else k.vz = 0; } }
        else { const f = Math.exp(-7 * dt); k.vx *= f; k.vy *= f; k.vr *= f; if (Math.hypot(k.vx, k.vy) < 3) { bakeCasing(k); casings.splice(i, 1); } }
      }
      for (let i = rings.length - 1; i >= 0; i--) { if ((rings[i].t -= dt) <= 0) rings.splice(i, 1); }
      for (let i = booms.length - 1; i >= 0; i--) { if ((booms[i].t -= dt) <= 0) booms.splice(i, 1); }
      for (let i = flashes.length - 1; i >= 0; i--) { if ((flashes[i].t -= dt) <= 0) flashes.splice(i, 1); }
      if (this.hurt > 0) this.hurt = Math.max(0, this.hurt - dt * .8);
      if (this.black > 0) this.black = Math.max(0, this.black - dt * .45);
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
    for (const k of (m.craters || [])) { // زمینِ شخم‌خوردهٔ بمباران: لکهٔ خاکی نامنظم به‌جای هالهٔ سیاه
      const lx = (k.x + .5) * T - cx * CPX, ly = (k.y + .5) * T - cy * CPX, r = k.r * T; if (lx < -r || ly < -r || lx > CPX + r || ly > CPX + r) continue;
      const R = srand(k.x * 131 + k.y * 17 + 5), blob = (rr, col, al) => { g.globalAlpha = al; g.fillStyle = col; g.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, d = rr * (.72 + .28 * R()); i ? g.lineTo(lx + Math.cos(a) * d, ly + Math.sin(a) * d * .85) : g.moveTo(lx + Math.cos(a) * d, ly + Math.sin(a) * d * .85); } g.closePath(); g.fill(); };
      blob(r * .95, '#5b4a38', .3); blob(r * .62, '#4a3b2d', .3);
      g.globalAlpha = .55; for (let i = 0; i < r * .5; i++) { const a = R() * TAU, d = R() * r * .9, w = 1.5 + R() * 3; g.fillStyle = i & 1 ? '#6f6659' : '#3f352b'; g.fillRect(lx + Math.cos(a) * d, ly + Math.sin(a) * d * .85, w, w * .8); }
      g.globalAlpha = 1;
    }
    for (const rm of (m.remains || [])) { const lx = rm.x - cx * CPX, ly = rm.y - cy * CPX, R = 70 * rm.s; if (lx > -R && ly > -R && lx < CPX + R && ly < CPX + R) drawRemain(g, rm, lx, ly); }
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

  /* ---------- آثار ماندگار و تکه‌ها ---------- */
  function drawPiece(g, k, x, y, baked) {
    g.save(); g.translate(x, y); g.rotate(k.rot); if (baked) g.globalAlpha = .9;
    if (k.kind === 'tire') { g.strokeStyle = k.col; g.lineWidth = k.w * .32; g.beginPath(); g.arc(0, 0, k.w * .42, 0, TAU); g.stroke(); g.strokeStyle = '#3b3b3b'; g.lineWidth = 1; g.stroke(); }
    else { g.fillStyle = k.col; g.fillRect(-k.w / 2, -k.h / 2, k.w, k.h); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = .8; g.strokeRect(-k.w / 2, -k.h / 2, k.w, k.h); if (k.kind === 'plank') { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(-k.w / 2, -k.h / 2, k.w, 1); } }
    g.restore();
  }
  function drawRemain(g, rm, x, y) {
    const R = srand(Math.floor(rm.x) * 31 + Math.floor(rm.y) * 7), s = rm.s, t = rm.t, scat = (n, rad, fn) => { for (let i = 0; i < n; i++) { const a = R() * TAU, d = Math.sqrt(R()) * rad; fn(x + Math.cos(a) * d, y + Math.sin(a) * d, R(), i); } };
    g.save();
    if (t === 'rubble' || t === 'gravel') {
      const cs = t === 'rubble' ? ['#8b857b', '#6f6a62', '#a39c8e'] : ['#8a887f', '#9c9a90', '#6c6a63'];
      g.globalAlpha = .28; g.fillStyle = cs[2]; scat(5, 9 * s, (px, py, q) => { g.beginPath(); g.ellipse(px, py, 9 * s * (.6 + q), 7 * s * (.6 + q), q * 3, 0, TAU); g.fill(); });
      g.globalAlpha = 1; scat(11, 15 * s, (px, py, q, i) => { const w = (3 + q * 6) * s; g.fillStyle = cs[i % 3]; g.fillRect(px - w / 2, py - w / 2, w, w * .8); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px - w / 2, py + w * .3, w, 1.2); });
    } else if (t === 'splinters') {
      scat(8, 15, (px, py, q, i) => { g.save(); g.translate(px, py); g.rotate(q * 6.3); g.fillStyle = i & 1 ? '#9a6b38' : '#7d5529'; g.fillRect(-5 - q * 4, -1.2, 10 + q * 8, 2.4); g.restore(); });
    } else if (t === 'sand') {
      g.fillStyle = '#b9a673'; g.globalAlpha = .55; scat(6, 9, (px, py, q) => { g.beginPath(); g.ellipse(px, py, 8 + q * 7, 6 + q * 5, q * 3, 0, TAU); g.fill(); });
      g.globalAlpha = .9; scat(4, 12, (px, py, q) => { g.save(); g.translate(px, py); g.rotate(q * 6.3); g.fillStyle = '#9a8a5c'; g.fillRect(-5, -3, 10, 6); g.restore(); });
    } else if (t === 'stump') {
      const r = 6.5 * s; g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + 1.5, y + 2, r, 0, TAU); g.fill();
      g.fillStyle = '#4a3422'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = '#b08a58'; g.beginPath(); g.arc(x, y, r * .72, 0, TAU); g.fill();
      g.strokeStyle = '#8a6236'; g.lineWidth = .8; g.beginPath(); g.arc(x, y, r * .42, 0, TAU); g.stroke(); g.fillStyle = '#6b4a2a'; scat(4, r * .7, (px, py) => g.fillRect(px, py, 2.5, 1.2));
    } else if (t === 'log') {
      const len = 60 * s, cx = Math.cos(rm.r), cy = Math.sin(rm.r); g.lineCap = 'round';
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 8; g.beginPath(); g.moveTo(x + 2 + cx * 6, y + 3 + cy * 6); g.lineTo(x + 2 + cx * len, y + 3 + cy * len); g.stroke();
      g.strokeStyle = rm.c || '#4a3422'; g.lineWidth = 7; g.beginPath(); g.moveTo(x + cx * 6, y + cy * 6); g.lineTo(x + cx * len, y + cy * len); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + cx * 8 + cy * 2, y + cy * 8 - cx * 2); g.lineTo(x + cx * len + cy * 2, y + cy * len - cx * 2); g.stroke();
    } else if (t === 'leaves') {
      g.fillStyle = rm.c || '#3a5c29'; g.globalAlpha = .8; scat(10, 26 * s, (px, py, q) => { g.beginPath(); g.arc(px, py, (7 + q * 8) * s, 0, TAU); g.fill(); });
      g.fillStyle = 'rgba(0,0,0,.18)'; scat(8, 26 * s, (px, py, q) => { g.beginPath(); g.arc(px, py, (2 + q * 3) * s, 0, TAU); g.fill(); });
    } else if (t === 'puddle') {
      g.fillStyle = '#3f6f95'; g.globalAlpha = .3; scat(4, 6 * s, (px, py, q) => { g.beginPath(); g.ellipse(px, py, (8 + q * 6) * s, (6 + q * 4) * s, q * 3, 0, TAU); g.fill(); });
      g.globalAlpha = .35; g.fillStyle = '#cfe9f7'; g.fillRect(x - 3 * s, y - 2 * s, 5 * s, 1.2);
    } else if (t === 'barrel') {
      g.translate(x, y); g.rotate(rm.r); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-14, -9, 32, 24);
      g.fillStyle = rm.c; g.beginPath(); g.roundRect(-16, -12, 32, 24, 3); g.fill(); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-6, -12, 2, 24); g.fillRect(5, -12, 2, 24); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(-16, -8, 32, 3);
      g.fillStyle = '#17120f'; g.beginPath(); g.moveTo(-2, -4); g.lineTo(4, -1); g.lineTo(1, 5); g.lineTo(-5, 2); g.fill();
    } else if (t === 'carwreck') {
      g.translate(x, y); g.rotate(rm.r); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-26, -9, 56, 24);
      g.fillStyle = '#211e1c'; g.beginPath(); g.roundRect(-28, -12, 56, 24, 5); g.fill(); g.fillStyle = '#0d0c0b'; g.fillRect(-13, -9, 26, 18); g.fillStyle = '#3a342f'; g.fillRect(-28, -3, 9, 2); g.fillRect(17, 1, 11, 2);
      g.strokeStyle = '#4a433c'; g.lineWidth = 1; g.strokeRect(-13, -9, 26, 18);
    } else if (t === 'glass') {
      scat(12, 13, (px, py, q, i) => { g.fillStyle = i & 1 ? 'rgba(223,244,255,.85)' : 'rgba(159,211,234,.7)'; g.fillRect(px, py, 1.5 + q * 2.5, 1.2 + q); });
    }
    g.restore();
  }
  function drawDebris() {
    const P = G.P3;
    for (const k of debris) {
      c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(k.x + k.z * .35 - k.w / 2, k.y + k.z * .45 - k.h / 2, k.w, k.h);
      const p = P.pt(k.x, k.y, k.z * 2); c.save(); c.translate(p[0], p[1]); c.scale(P.scale(), P.scale()); drawPiece(c, k, 0, 0); c.restore();
    }
  }

  /* ---------- دیوارها (منشورهای پرسپکتیو مثل بقیهٔ اشیا) ---------- */
  const WH = [0, 24, 0, 0, 34, 26], FSH = [.84, .46, .9, .4], wcache = {}, wtops = [[], [], []], crys = []; // وجه‌ها: چپ، راست، بالا، پایین
  function wallCol(b, z, f) {
    const k = b * 100 + z * 10 + f; if (wcache[k]) return wcache[k];
    const base = b === 4 ? (z === 3 ? '#565a66' : '#8d9196') : b === 5 ? '#3b3f3a' : PAL.wallTop[z], n = parseInt(base.slice(1), 16), q = f === 9 ? 1 : FSH[f];
    return wcache[k] = `rgb(${((n >> 16) * q) | 0},${((n >> 8 & 255) * q) | 0},${((n & 255) * q) | 0})`;
  }
  function drawWallShadows(tx0, tx1, ty0, ty1) {
    const m = G.map, W = m.w, L = G.P3.L, SL = G.PROPS_CFG.shadowLength;
    c.beginPath();
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const b = m.block[ty * W + tx]; if (b !== 1 && b !== 4 && b !== 5) continue;
      const x0 = tx * T, y0 = ty * T, x1 = x0 + T, y1 = y0 + T, sx = L[0] * WH[b] * SL, sy = L[1] * WH[b] * SL;
      c.moveTo(x0, y0); c.lineTo(x1, y0); c.lineTo(x1 + sx, y0 + sy); c.lineTo(x1 + sx, y1 + sy); c.lineTo(x0 + sx, y1 + sy); c.lineTo(x0, y1); c.closePath();
    }
    c.fillStyle = `rgba(0,0,0,${G.PROPS_CFG.shadowOpacity})`; c.fill();
  }
  function drawWalls(tx0, tx1, ty0, ty1) {
    const m = G.map, W = m.w, P = G.P3, vx = P.cx, vy = P.cy, kp = P.persp, blk = m.block;
    wtops[0].length = wtops[1].length = wtops[2].length = crys.length = 0;
    const quad = (ax, ay, bx, by, s0, s1) => { c.beginPath(); c.moveTo(vx + (ax - vx) * s0, vy + (ay - vy) * s0); c.lineTo(vx + (bx - vx) * s0, vy + (by - vy) * s0); c.lineTo(vx + (bx - vx) * s1, vy + (by - vy) * s1); c.lineTo(vx + (ax - vx) * s1, vy + (ay - vy) * s1); c.closePath(); c.fill(); };
    c.lineWidth = .6;
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const i = ty * W + tx, b = blk[i]; if (b !== 1 && b !== 4 && b !== 5) { if (b === 6) crys.push(i); continue; }
      const px = tx * T, py = ty * T, z = m.zone[i], s = 1 + WH[b] * kp;
      const face = (ax, ay, bx, by, f) => { c.fillStyle = c.strokeStyle = wallCol(b, z, f); quad(ax, ay, bx, by, 1, s); c.stroke(); if (b === 4) { c.fillStyle = f === 1 || f === 3 ? '#8a6f1a' : '#c9a227'; quad(ax, ay, bx, by, 1 + 4 * kp, 1 + 10 * kp); } };
      if (vx < px && (tx === 0 || blk[i - 1] !== b)) face(px, py + T, px, py, 0);
      if (vx > px + T && (tx === W - 1 || blk[i + 1] !== b)) face(px + T, py, px + T, py + T, 1);
      if (vy < py && (ty === 0 || blk[i - W] !== b)) face(px, py, px + T, py, 2);
      if (vy > py + T && (ty === m.h - 1 || blk[i + W] !== b)) face(px + T, py + T, px, py + T, 3);
      wtops[b === 1 ? 0 : b === 5 ? 1 : 2].push(i);
    }
    for (const i of crys) { // بلور ماده سیاه
      const tx = i % W, ty = (i / W) | 0, px = tx * T, py = ty * T, p = .5 + .5 * Math.sin(G.time * 2 + tx * 1.7 + ty);
      for (const q of [[5, 20, 15, 11, 15, 38], [15, 24, 28, 18, 22, 24]]) {
        const a = P.pt(px + q[3], py + q[4], q[5]);
        c.fillStyle = '#0a0810'; c.beginPath(); c.moveTo(px + q[0], py + q[1] + 6); c.lineTo(px + q[2], py + q[1] - 6); c.lineTo(a[0], a[1]); c.closePath(); c.fill();
        c.strokeStyle = `rgba(160,90,255,${.35 + p * .45})`; c.lineWidth = 1.5; c.beginPath(); c.moveTo(px + (q[0] + q[2]) / 2, py + q[1]); c.lineTo(a[0], a[1]); c.stroke();
      }
    }
    for (let g = 0; g < 3; g++) for (const i of wtops[g]) {
      const b = blk[i], s = 1 + WH[b] * kp, X = vx + ((i % W) * T - vx) * s, Y = vy + (((i / W) | 0) * T - vy) * s, w = T * s + .5;
      c.fillStyle = wallCol(b, m.zone[i], 9); c.fillRect(X, Y, w, w);
      c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(X, Y, w, 2.5); c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(X + w - 2, Y, 2, w);
      if (m.thp && m.thp[i] > G.tileMax(i) * .4) { // ترک‌خوردگی دیوارِ آسیب‌دیده
        const R = srand(i), k = m.thp[i] / G.tileMax(i); c.strokeStyle = 'rgba(25,22,20,.75)'; c.lineWidth = 1 + k; c.beginPath();
        for (let n = 0; n < 2 + (k > .7 ? 2 : 0); n++) { let x = X + R() * w, y = Y + R() * w; c.moveTo(x, y); for (let q = 0; q < 3; q++) { x = G.clamp(x + (R() - .5) * 20, X, X + w); y = G.clamp(y + (R() - .5) * 20, Y, Y + w); c.lineTo(x, y); } }
        c.stroke();
      }
      const mk = m.marks.get(i); if (mk) for (const q of mk) P.mark(q);
    }
  }

  /* ---------- سرباز ---------- */
  const PCMD = { body: '#16171a', dark: '#0b0c0e', helm: '#1d1e22', trim: '#e0a93f', ear: '#b79a62' };
  const PALPHA = { body: '#3a3a36', dark: '#1d1d1b', helm: '#2b2b28', trim: '#ff8a3c', ear: '#55524a' };
  const PDELTA = { body: '#27323e', dark: '#161c23', helm: '#34424f', trim: '#4db8ff', ear: '#4a5560' };
  // اسپرایت اختیاری: assets/commander.png (نمای بالا، رو به بالا، پس‌زمینهٔ شفاف)
  const SPR = G.sprites = {};
  if (location.protocol !== 'file:' || true) { const im = new Image(); im.onload = () => { SPR.cmd = im; }; im.onerror = () => { }; im.src = 'assets/commander.png'; }
  function drawSoldier(u) {
    const x = u.x, y = u.y;
    c.globalAlpha = .7; c.strokeStyle = u.color; c.lineWidth = u.isCmd ? 2 : 1.4; c.globalAlpha = .55; ell(x, y, u.isCmd ? 16 : 14, u.isCmd ? 16 : 14); c.stroke(); c.globalAlpha = 1;
    if (u.downed) {
      c.save(); c.translate(x, y); c.rotate(u.ang + 1.2); c.fillStyle = '#2b2f33'; c.fillRect(-10, -4, 20, 8); c.fillStyle = u.color; ell(11, 0, 4.5, 4.5); c.fill(); c.restore();
      if (!u.isCmd) { const p = .5 + .5 * Math.sin(G.time * 8); c.fillStyle = `rgba(255,60,60,${.5 + p * .5})`; c.fillRect(x - 2, y - 28, 4, 12); c.fillRect(x - 6, y - 24, 12, 4); bar(x, y - 34, 22, u.bleed / 45, '#ff5a5a'); }
      return;
    }
    c.fillStyle = 'rgba(0,0,0,.3)'; ell(x + 3, y + 4, 9, 9); c.fill();
    const d = G.wOf(u).def, K = u.isCmd ? 1.22 : 1.05;
    const P = u.isCmd ? PCMD : u.squad === 'alpha' ? PALPHA : PDELTA, trim = u.hurtT > 0 ? '#ffb0b0' : P.trim;
    c.save(); c.translate(x, y); c.rotate(u.ang);
    if (u.isCmd && SPR.cmd) { const im = SPR.cmd, h = 46, w = h * im.width / im.height; c.rotate(Math.PI / 2); c.drawImage(im, -w / 2, -h * .56, w, h); c.restore(); }
    else {
      c.scale(K, K); c.lineCap = 'round';
      const st = u.moving ? Math.sin(u.walk) * 4.5 : 0;
      c.fillStyle = P.dark; c.fillRect(-3 + st, -6, 7, 4); c.fillRect(-3 - st, 2, 7, 4);
      // سلاح
      if (d.melee) { const sw = u.swing > 0 ? (u.swing / .18) * 1.6 - .8 : 0; c.save(); c.rotate(sw); c.fillStyle = '#d5dde3'; c.fillRect(8, 2, 10, 1.8); c.fillStyle = '#222'; c.fillRect(5, 1.6, 4, 2.6); c.restore(); }
      else {
        c.fillStyle = '#0c0d0f';
        if (d.proj === 'rocket') { c.fillRect(-9, .5, d.len + 12, 4); c.fillStyle = '#5a6b3a'; if (u.weapons[u.cur].mag > 0) { c.beginPath(); c.moveTo(d.len + 3, -.5); c.lineTo(d.len + 11, 2.5); c.lineTo(d.len + 3, 5.5); c.fill(); } }
        else { c.fillRect(3, 1.2, d.len + 3, d.len > 18 ? 3.4 : 2.8); if (d.len > 14) c.fillRect(1, .6, 7, 4.2); if (d.name === 'M249') c.fillRect(8, 4, 5, 4); c.fillStyle = P.trim; c.fillRect(d.len - 1, 1.2, 1.4, d.len > 18 ? 3.4 : 2.8); c.fillRect(7, 1.2, 1, 2.8); }
      }
      // کوله و جلیقه
      c.fillStyle = P.dark; c.beginPath(); c.roundRect(-11, -6, 6, 12, 2); c.fill();
      c.fillStyle = P.body; c.beginPath(); c.roundRect(-7, -9.5, 13, 19, 5); c.fill();
      c.strokeStyle = trim; c.lineWidth = .9; c.stroke();
      c.beginPath(); c.moveTo(-10, -3); c.lineTo(-6, -3); c.moveTo(-10, 0); c.lineTo(-6, 0); c.moveTo(-10, 3); c.lineTo(-6, 3); c.moveTo(-3, -9); c.lineTo(-3, 9); c.stroke();
      c.fillStyle = trim; ell(-.5, 7, 1.7, 1.7); c.fill();
      // دست‌ها
      c.strokeStyle = P.body; c.lineWidth = 3.4; line(0, -7, 9, 1.5); line(0, 7, 6, 3);
      c.strokeStyle = trim; c.lineWidth = 1; line(5.5, -2.6, 7, -.6); line(3.6, 5.2, 4.8, 3.8);
      c.fillStyle = '#b98a62'; ell(9.4, 2, 1.7, 1.7); c.fill(); ell(6.2, 3.2, 1.6, 1.6); c.fill();
      // کلاهخود، گوشی و دوربین دید در شب
      c.fillStyle = P.ear; ell(.2, -6, 2.4, 1.7); c.fill(); ell(.2, 6, 2.4, 1.7); c.fill();
      c.fillStyle = u.hurtT > 0 ? '#ffb0b0' : P.helm; ell(0, 0, 5.9, 5.7); c.fill();
      c.strokeStyle = trim; c.lineWidth = .8; c.beginPath(); c.arc(0, 0, 5.9, 0, TAU); c.moveTo(-5.5, 0); c.lineTo(3, 0); c.moveTo(-1, -5.6); c.quadraticCurveTo(1.6, 0, -1, 5.6); c.stroke();
      c.fillStyle = '#08090b'; c.fillRect(3.6, -3.4, 4.4, 2.6); c.fillRect(3.6, .8, 4.4, 2.6); c.fillStyle = trim; c.fillRect(7.2, -3.4, .9, 2.6); c.fillRect(7.2, .8, .9, 2.6);
      c.restore();
    }
    if (!u.isCmd) { bar(x, y - 21, 18, u.hp / u.maxHp, u.hp > u.maxHp * .5 ? '#67e08a' : u.hp > u.maxHp * .25 ? '#ffd23c' : '#ff5a5a'); if (u.medic) { c.fillStyle = '#7dffb0'; c.fillRect(x - 1, y - 29, 2, 6); c.fillRect(x - 3, y - 27, 6, 2); } }
    else { c.fillStyle = '#e8c15a'; c.beginPath(); c.moveTo(x - 4, y - 27); c.lineTo(x, y - 22); c.lineTo(x + 4, y - 27); c.closePath(); c.fill(); }
    const w = u.weapons[u.cur]; if (w.rel > 0 && !u.isCmd) { c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(x + 14, y - 20, 3.5, -1.57, -1.57 + TAU * (1 - w.rel / w.def.reload)); c.stroke(); }
    if (u.reviving) { c.strokeStyle = '#7dffb0'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 18, -1.57, -1.57 + TAU * (u.task ? u.task.t / 3 : 0)); c.stroke(); }
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
      c.fillStyle = 'rgba(0,0,0,.3)'; ell(x + 3, y + 4, big ? 19 : F.r, big ? 18 : F.r); c.fill();
      c.save(); c.translate(x, y); c.rotate(z.ang);
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
      if (envy && f !== 'envy') { c.globalAlpha = .3 + .25 * glow; c.strokeStyle = '#19e68c'; c.lineWidth = 2; ell(x, y, (big ? 21 : F.r + 3), (big ? 21 : F.r + 3)); c.stroke(); c.globalAlpha = 1; }
    }
    const top = y - (f === 'gluttony' ? 30 : f === 'sloth' || f === 'lust' ? 38 : 19);
    if (z.armor > 0) bar(x, top - 5, 22, z.armor / z.maxArmor, '#ffd86b');
    if (z.hp < z.maxHp) bar(x, top, 22, z.hp / z.maxHp, col);
  }

  /* ---------- اشیای ماموریت ---------- */
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
      if (G.mission.erupt) { c.save(); c.translate(x, y); c.scale(1.7, 1.7); c.translate(-x, -y); }
      c.strokeStyle = G.mission.erupt ? '#12091d' : '#3a1d5c'; c.lineWidth = 5; c.lineCap = 'round'; for (let k = 0; k < 8; k++) { const a = k * .785 + Math.sin(t + k) * .1; c.beginPath(); c.moveTo(x, y - 6); c.quadraticCurveTo(x + Math.cos(a + .4) * 50, y + Math.sin(a + .4) * 30, x + Math.cos(a) * 92, y + Math.sin(a) * 56); c.stroke(); }
      c.fillStyle = 'rgba(0,0,0,.5)'; ell(x, y + 6, 44, 24); c.fill();
      c.fillStyle = '#07060b'; c.beginPath(); c.ellipse(x, y - 26, 34 + g * 2, 44 + g * 3, 0, 0, TAU); c.fill();
      c.globalAlpha = .25 + g * .3; c.fillStyle = '#9a5cff'; ell(x, y - 28, 20 + g * 6, 26 + g * 7); c.fill(); c.globalAlpha = 1;
      c.strokeStyle = `rgba(190,130,255,${.4 + g * .5})`; c.lineWidth = 2; for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(x + (k - 2) * 9, y - 62); c.lineTo(x + (k - 2) * 13 + Math.sin(t * 2 + k) * 5, y + 4); c.stroke(); }
      if (G.mission.erupt) c.restore();
      if (G.mission.fuse > 0) { c.fillStyle = (G.time * 4 | 0) & 1 ? '#ff3b2f' : '#ffe27a'; c.fillRect(x - 5, y + 2, 10, 8); c.fillStyle = '#fff'; c.font = 'bold 18px Tahoma,sans-serif'; c.textAlign = 'center'; c.fillText(G.fa(Math.ceil(G.mission.fuse)), x, y - 84); }
    } else if (p.kind === 'drop') {
      if (p.z > 0) {
        c.fillStyle = 'rgba(0,0,0,.3)'; ell(x, y + 2, 12 - Math.min(8, p.z / 80), 6); c.fill();
        const yy = y - p.z, sw = Math.sin(t * 2.2) * 4;
        c.strokeStyle = 'rgba(30,30,30,.8)'; c.lineWidth = 1; line(x - 22 + sw, yy - 42, x - 7, yy - 13); line(x + 22 + sw, yy - 42, x + 7, yy - 13); line(x + sw, yy - 50, x, yy - 13);
        c.fillStyle = '#2a2c2f'; c.beginPath(); c.ellipse(x + sw, yy - 44, 26, 13, 0, Math.PI, TAU); c.fill(); c.fillStyle = '#c9a227'; c.fillRect(x + sw - 3, yy - 57, 6, 13);
        c.fillStyle = '#1b1d20'; c.fillRect(x - 9, yy - 14, 18, 14); c.fillStyle = '#c9a227'; c.fillRect(x - 9, yy - 9, 18, 2);
        return;
      }
      c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(x - 13, y - 2, 28, 12);
      c.fillStyle = p.uses > 0 ? '#1b1d20' : '#3a3a3a'; c.fillRect(x - 13, y - 15, 26, 20); c.fillStyle = p.uses > 0 ? '#2b2e33' : '#4a4a4a'; c.fillRect(x - 13, y - 21, 26, 9);
      c.fillStyle = '#c9a227'; c.fillRect(x - 13, y - 9, 26, 2.5); c.fillRect(x - 1.5, y - 21, 3, 26);
      if (p.uses > 0) {
        const on = (t * 3 | 0) & 1; c.fillStyle = on ? '#ff3b2f' : '#5a1410'; ell(x + 16, y - 2, 2.5, 2.5); c.fill();
        c.globalAlpha = .3 + .2 * Math.sin(t * 3); c.strokeStyle = '#e8c15a'; c.lineWidth = 1.5; ell(x, y + 2, 24, 13); c.stroke(); c.globalAlpha = 1;
        if (G.state === 'play' && Math.random() < .08) parts.push({ x: x + 16, y: y + 8, vx: G.rand(-8, 8), vy: G.rand(-30, -14), life: 1.4, max: 1.4, color: '#c0392b', size: 4, smoke: 1 });
      }
    } else if (p.kind === 'wreck') {
      c.fillStyle = 'rgba(0,0,0,.5)'; ell(x, y + 8, 78, 26); c.fill();
      c.save(); c.translate(x, y - 6); c.rotate(-.32);
      c.fillStyle = '#15171a'; c.fillRect(-112, -4, 60, 8); c.fillRect(-120, -15, 9, 24);
      c.fillStyle = '#1c2023'; c.beginPath(); c.ellipse(0, 0, 50, 21, 0, 0, TAU); c.fill();
      c.fillStyle = '#0b0c0e'; c.beginPath(); c.ellipse(26, -2, 18, 12, 0, 0, TAU); c.fill();
      c.fillStyle = '#2a2f33'; c.fillRect(-30, -22, 44, 6); c.fillStyle = '#0a0810'; c.beginPath(); c.moveTo(-18, -6); c.lineTo(-2, -16); c.lineTo(12, -4); c.lineTo(6, 14); c.lineTo(-14, 12); c.closePath(); c.fill();
      c.strokeStyle = '#101214'; c.lineWidth = 5; line(0, -20, 74, -50); line(0, -20, -60, -44); line(0, -20, 22, 30);
      c.restore();
      for (let k = 0; k < 3; k++) { const fx = x - 30 + k * 34, fy = y - 18 - k * 5, fl = 6 + Math.sin(t * 9 + k * 2) * 3; c.globalAlpha = .75; c.fillStyle = '#ff7a1e'; ell(fx, fy - fl * .5, 5, fl); c.fill(); c.fillStyle = '#ffd98a'; ell(fx, fy - fl * .2, 2.4, fl * .5); c.fill(); c.globalAlpha = 1; }
      if (G.state === 'play' && Math.random() < .12) G.fx.smoke(x + G.rand(-40, 40), y - 20);
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
    for (const s of (S.ex.x === S.lz.x && S.ex.y === S.lz.y ? [S.lz] : [S.lz, S.ex])) { c.strokeStyle = s === S.lz ? 'rgba(61,220,132,.7)' : 'rgba(77,184,255,.8)'; c.lineWidth = 3; c.beginPath(); c.arc(s.x, s.y, 86, 0, TAU); c.stroke(); c.lineWidth = 6; line(s.x - 22, s.y - 26, s.x - 22, s.y + 26); line(s.x + 22, s.y - 26, s.x + 22, s.y + 26); line(s.x - 22, s.y, s.x + 22, s.y); }
    for (const p of G.pools) { const a = Math.min(1, p.t / 1.5); c.globalAlpha = .5 * a; c.fillStyle = '#9bd41e'; ell(p.x, p.y, p.r, p.r * .72); c.fill(); c.globalAlpha = .8 * a; c.fillStyle = '#d6ff5a'; for (let k = 0; k < 4; k++) { const an = k * 1.7 + t; ell(p.x + Math.cos(an) * p.r * .5, p.y + Math.sin(an * 1.3) * p.r * .35, 2 + Math.sin(t * 5 + k), 2); c.fill(); } c.globalAlpha = 1; }
    for (const l of G.lures) { c.fillStyle = '#4db8ff'; ell(l.x, l.y, 4, 3); c.fill(); c.globalAlpha = .15; ell(l.x, l.y, 440, 440); c.strokeStyle = '#4db8ff'; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1; }
    for (const sq of [G.squads.alpha, G.squads.delta]) {
      const o = sq.order; if (!G.aliveOf(sq).length) continue;
      c.strokeStyle = sq.color; c.fillStyle = sq.color; c.lineWidth = 1.5;
      if (o.type === 'patrol') { c.setLineDash([8, 6]); c.globalAlpha = .6; line(o.a.x, o.a.y, o.b.x, o.b.y); c.setLineDash([]); ell(o.a.x, o.a.y, 9, 6); c.stroke(); ell(o.b.x, o.b.y, 9, 6); c.stroke(); c.globalAlpha = 1; }
      else if (o.x != null && o.type !== 'follow' && o.kind !== 'hold') {
        const r = o.type === 'clear' ? o.R : o.kind === 'defend' ? 78 : o.type === 'sd' ? 60 : 16;
        c.globalAlpha = .5; c.setLineDash(o.type === 'clear' || o.kind === 'defend' ? [10, 8] : []); ell(o.x, o.y, r, r * (r > 100 ? 1 : .62)); c.stroke(); c.setLineDash([]);
        if (o.type === 'destroy' || o.type === 'firesup' || o.type === 'fireat') { c.globalAlpha = .9; line(o.x - 14, o.y, o.x + 14, o.y); line(o.x, o.y - 14, o.x, o.y + 14); c.strokeStyle = '#ff4a3c'; ell(o.x, o.y, 22 + Math.sin(t * 6) * 3, 22 + Math.sin(t * 6) * 3); c.stroke(); }
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
    G.P3.setCam(view.x + shx, view.y + shy);
    drawGround(x0, y0, x1, y1);
    groundMarks();
    const tx0 = Math.max(0, Math.floor(x0 / T) - 3), tx1 = Math.min(m.w - 1, Math.floor(x1 / T) + 3), ty0 = Math.max(0, Math.floor(y0 / T) - 3), ty1 = Math.min(m.h - 1, Math.floor(y1 / T) + 3);
    drawWallShadows(tx0, tx1, ty0, ty1);
    G.drawObjShadows(c, x0, y0, x1, y1);
    for (const p of G.props) if (p.kind === 'heli2') G.Heli.draw(c, p, true);
    drawCasings();
    // نیروها و اشیای ماموریت (روی زمین)، سپس هر چیز ارتفاع‌دار به ترتیب ارتفاع
    rows.length = 0;
    for (const s of G.soldiers) if (!s.dead && !s.boarded) rows.push(s);
    for (const zb of G.zActive) if (!zb.dead && zb.x > x0 - 60 && zb.x < x1 + 60 && zb.y > y0 - 60 && zb.y < y1 + 80) rows.push(zb);
    for (const p of G.props) rows.push(p);
    rows.sort((a, b) => (a.y + (a.kind === 'core' ? 20 : 0)) - (b.y + (b.kind === 'core' ? 20 : 0)));
    for (const e of rows) { if (e.kind === 's') drawSoldier(e); else if (e.kind === 'z') drawZombie(e); else drawProp(e); }
    drawDebris();
    G.drawObjs(c, false);
    drawWalls(tx0, tx1, ty0, ty1);
    G.drawObjs(c, true);
    for (const p of G.props) if (p.kind === 'heli2') G.Heli.draw(c, p, false);
    // پرتابه‌ها و افکت‌ها
    for (const p of G.projs) {
      if (p.type === 'rocket') { c.save(); c.translate(p.x, p.y); c.rotate(p.ang); c.fillStyle = '#5a6b3a'; c.fillRect(-8, -2, 14, 4); c.fillStyle = '#ffb347'; c.fillRect(-13, -1.5, 6, 3); c.restore(); }
      else { c.fillStyle = 'rgba(0,0,0,.3)'; ell(p.x, p.y, 4, 2.5); c.fill(); c.fillStyle = p.type === 'acid' ? '#b6f03a' : p.type === 'lure' ? '#4db8ff' : '#2e3a25'; const q = G.P3.pt(p.x, p.y, (p.z || 0) * 2.2), r = (p.type === 'acid' ? 6 : 4) * G.P3.scale(); ell(q[0], q[1], r, r); c.fill(); if (p.type === 'frag' && p.t >= p.dur && ((G.time * 12 | 0) & 1)) { c.fillStyle = '#ff3b2f'; ell(p.x, p.y, 2, 2); c.fill(); } }
    }
    c.lineCap = 'round';
    for (const b of bullets) {
      const hd = Math.min(b.go, b.left), tl = Math.max(0, Math.min(b.go - 40, b.left)), ca = Math.cos(b.a), sa = Math.sin(b.a);
      const hx = b.x + ca * hd, hy = b.y + sa * hd, tx = b.x + ca * tl, ty = b.y + sa * tl;
      if (hd - tl > 1) { const g = c.createLinearGradient(tx, ty, hx, hy); g.addColorStop(0, 'rgba(255,210,122,0)'); g.addColorStop(1, 'rgba(255,243,196,.85)'); c.strokeStyle = g; c.lineWidth = 1.2; line(tx, ty, hx, hy); }
      if (b.go < b.left) { c.save(); c.translate(hx, hy); c.rotate(b.a); c.fillStyle = '#c87a45'; c.beginPath(); c.moveTo(-2.4, -.9); c.lineTo(1.2, -.9); c.quadraticCurveTo(3, -.5, 3.4, 0); c.quadraticCurveTo(3, .5, 1.2, .9); c.lineTo(-2.4, .9); c.fill(); c.restore(); }
    }
    c.globalAlpha = 1;
    for (const f of flashes) { if (f.hit) { c.globalAlpha = .8; c.fillStyle = '#fff6c8'; ell(f.x, f.y, 3.5, 3.5); c.fill(); c.globalAlpha = .3; c.fillStyle = '#ffb347'; ell(f.x, f.y, 8, 8); c.fill(); c.globalAlpha = 1; continue; } c.save(); c.translate(f.x, f.y); c.rotate(f.ang); c.fillStyle = '#fff3b0'; c.beginPath(); c.moveTo(0, -3); c.lineTo(13, 0); c.lineTo(0, 3); c.fill(); c.globalAlpha = .35; c.fillStyle = '#ffb347'; ell(3, 0, 10, 10); c.fill(); c.restore(); }
    for (const p of parts) { c.globalAlpha = Math.min(1, p.life / p.max * (p.smoke ? .5 : 1.4)); c.fillStyle = p.color; if (p.smoke) { ell(p.x, p.y, Math.max(.5, p.size), Math.max(.5, p.size)); c.fill(); } else if (p.spark) { c.strokeStyle = p.color; c.lineWidth = p.size; line(p.x, p.y, p.x - p.vx * .035, p.y - p.vy * .035); } else if (p.leaf) { c.beginPath(); c.ellipse(p.x, p.y, p.size, p.size * .55, p.life * 5 + p.x, 0, TAU); c.fill(); } else c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
    c.globalAlpha = 1;
    for (const r of rings) { const k = 1 - r.t / r.max; c.globalAlpha = (1 - k) * .8; c.strokeStyle = r.color; c.lineWidth = 2.5; ell(r.x, r.y, r.r * k, r.r * k); c.stroke(); }
    for (const b of booms) { const k = 1 - b.t / b.max; c.globalAlpha = (1 - k); c.fillStyle = k < .3 ? '#fff7d0' : '#ff9d2e'; ell(b.x, b.y, b.r * (.35 + k * .65), b.r * (.35 + k * .65)); c.fill(); c.globalAlpha = (1 - k) * .6; c.strokeStyle = '#fff'; c.lineWidth = 3; ell(b.x, b.y, b.r * k * 1.1, b.r * k * 1.1); c.stroke(); }
    c.globalAlpha = 1;
    // حالت هدف‌گیری فرمان
    const WH = G.ui.wheel; if (WH.k > 0) { const p = WH.tgt, col = WH.sel ? G.WHEELS[WH.wheel].color : '#fff'; c.globalAlpha = WH.k; c.strokeStyle = col; c.lineWidth = 2; c.setLineDash([6, 5]); ell(p.x, p.y, 22, 14); c.stroke(); c.setLineDash([]); line(p.x - 8, p.y, p.x + 8, p.y); line(p.x, p.y - 6, p.x, p.y + 6); c.globalAlpha = 1; }

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
    if (G.fx.black > 0) { c.fillStyle = `rgba(4,2,8,${Math.min(1, G.fx.black)})`; c.fillRect(0, 0, W, Hh); }
    if (G.over && G.result && G.result.win) { c.fillStyle = `rgba(0,0,0,${G.clamp(1 - G.overT / 2.2, 0, 1)})`; c.fillRect(0, 0, W, Hh); }
    if (G.ui.wheel.k > 0) drawWheel(W, Hh);
    else if (!G.touch && G.state === 'play') {
      const mx = G.input.mx, my = G.input.my, w = G.wOf(cmd), sp = 6 + (cmd.moving ? 5 : 0) + (cmd.fired > 0 ? 4 : 0);
      c.strokeStyle = '#fff'; c.lineWidth = 1.6; line(mx - sp - 6, my, mx - sp, my); line(mx + sp, my, mx + sp + 6, my); line(mx, my - sp - 6, mx, my - sp); line(mx, my + sp, mx, my + sp + 6);
      c.fillStyle = '#ff5a4a'; c.fillRect(mx - 1, my - 1, 2, 2);
      if (w.rel > 0) { c.strokeStyle = '#ffe27a'; c.lineWidth = 3; c.beginPath(); c.arc(mx, my, 16, -1.57, -1.57 + TAU * (1 - w.rel / w.def.reload)); c.stroke(); }
    }
  };

  /* ---------- پوکه‌ها ---------- */
  function drawCasings() {
    for (const k of casings) {
      const s = 1 + k.z / 40; c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(k.x + .6 + k.z * .3, k.y + .6 + k.z * .3, 2.2, 1.2);
      c.save(); c.translate(k.x, k.y - k.z); c.rotate(k.rot); c.scale(s, s);
      c.fillStyle = '#d9a93a'; c.fillRect(-1.6, -.6, 3.2, 1.2); c.fillStyle = '#fff0a8'; c.fillRect(-1.2, -.6, 2.2, .4); c.fillStyle = '#5a3c0c'; c.fillRect(1.4, -.5, .4, 1);
      c.restore();
    }
  }
  function bakeCasing(k) {
    const cx = Math.floor(k.x / CPX), cy = Math.floor(k.y / CPX), ch = chunks.get(cy * 64 + cx); if (!ch) return;
    const g = ch.ctx; g.save(); g.translate(k.x - cx * CPX, k.y - cy * CPX); g.rotate(k.rot); g.fillStyle = '#b98a28'; g.fillRect(-1.6, -.6, 3.2, 1.2); g.fillStyle = '#e8cf7a'; g.fillRect(-1.2, -.6, 2.2, .4); g.restore();
  }

  /* ---------- چرخ فرمان ---------- */
  function drawWheel(W, Hh) {
    const wh = G.ui.wheel, k = wh.k, R = G.WHEELS[wh.wheel || 'main'], cx = W / 2, cy = Hh / 2, sc = Math.min(1, Math.min(W, Hh) / 620), R0 = 70 * sc, R1 = (148 + 52 * k) * sc, rad = Math.PI / 180;
    c.fillStyle = `rgba(0,0,0,${.5 * k})`; c.fillRect(0, 0, W, Hh);
    c.save(); c.globalAlpha = k; c.textAlign = 'center'; c.textBaseline = 'middle';
    R.items.forEach((it, i) => {
      const mid = R.off + i * R.span, a0 = (mid - R.span / 2 + 1) * rad, a1 = (mid + R.span / 2 - 1) * rad, on = wh.sel && wh.sel.it === it, col = it.color || (it.back ? '#9aa6a8' : R.color), r1 = R1 + (on ? 12 * sc : 0) + (it.sub ? 10 * sc : 0);
      c.beginPath(); c.arc(cx, cy, r1, a0, a1); c.arc(cx, cy, R0, a1, a0, true); c.closePath();
      c.fillStyle = on ? col : it.sub ? 'rgba(24,20,16,.94)' : 'rgba(10,12,14,.88)'; c.fill();
      c.globalAlpha = k * (on ? 1 : .5); c.strokeStyle = col; c.lineWidth = 1; c.stroke(); c.globalAlpha = k;
      c.beginPath(); c.arc(cx, cy, r1, a0, a1); c.strokeStyle = col; c.lineWidth = (it.sub ? 5 : 3) * sc; c.stroke();
      const am = mid * rad, rm = (R0 + r1) / 2, tx = cx + Math.cos(am) * rm, ty = cy + Math.sin(am) * rm, txt = it.sub ? it.t + ' ›' : it.back ? '‹ ' + it.t : G.ui.wheelText(it);
      c.fillStyle = on ? '#0c0d0f' : it.sub ? col : '#e9eee9'; c.font = `bold ${Math.round((it.sub ? 14 : 12.5) * sc)}px Tahoma,sans-serif`;
      const ws = txt.split(' ');
      if (ws.length > 1 && txt.length > 7) { const h = Math.ceil(ws.length / 2); c.fillText(ws.slice(0, h).join(' '), tx, ty - 8 * sc); c.fillText(ws.slice(h).join(' '), tx, ty + 8 * sc); } else c.fillText(txt, tx, ty);
    });
    c.beginPath(); c.arc(cx, cy, R0 - 6 * sc, 0, TAU); c.fillStyle = 'rgba(6,7,8,.92)'; c.fill(); c.strokeStyle = R.color; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = R.color; c.font = `bold ${Math.round(13 * sc)}px Tahoma,sans-serif`;
    c.fillText(wh.sel ? (wh.sel.it.sub ? wh.sel.it.t : G.ui.wheelText(wh.sel.it)) : R.title, cx, cy - (wh.sel ? 8 : 0) * sc);
    if (wh.sel) { c.fillStyle = '#aab6b8'; c.font = `${Math.round(10.5 * sc)}px Tahoma,sans-serif`; c.fillText(R.title, cx, cy + 12 * sc); }
    const vs = (R0 - 12 * sc) / 120; c.fillStyle = '#fff'; c.beginPath(); c.arc(cx + wh.vx * vs, cy + wh.vy * vs, 3.5, 0, TAU); c.fill();
    c.restore(); c.textBaseline = 'alphabetic';
  }

  /* ---------- پس‌زمینهٔ منو ---------- */
  const hsh = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  G.renderMenu = function (t) {
    const W = view.sw, H = view.sh, hz = H * .66;
    c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0); c.globalAlpha = 1;
    let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05060a'); g.addColorStop(.5, '#141018'); g.addColorStop(.66, '#3a1a12'); g.addColorStop(.67, '#060607'); g.addColorStop(1, '#020203');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const fx = W * .3, fl = .8 + .2 * Math.sin(t * 3.1) * Math.sin(t * 1.7);
    g = c.createRadialGradient(fx, hz, 10, fx, hz, W * .5); g.addColorStop(0, `rgba(255,120,40,${.55 * fl})`); g.addColorStop(.35, 'rgba(150,40,14,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // ستون دود سیاه
    for (let k = 0; k < 16; k++) { const p = ((t * .035 + k / 16) % 1), y = hz - p * H * .75, x = fx + Math.sin(p * 5 + k) * 30 * p + p * W * .12, r = 26 + p * 150; c.globalAlpha = .5 * (1 - p); c.fillStyle = '#060508'; c.beginPath(); c.ellipse(x, y, r, r * .8, 0, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
    // نورافکن‌ها
    for (let k = 0; k < 2; k++) { const bx = W * (k ? .78 : .58), a = -1.57 + Math.sin(t * .23 + k * 2.4) * .55; c.save(); c.translate(bx, hz); c.rotate(a); const lg = c.createLinearGradient(0, 0, H * .9, 0); lg.addColorStop(0, 'rgba(210,225,255,.16)'); lg.addColorStop(1, 'rgba(210,225,255,0)'); c.fillStyle = lg; c.beginPath(); c.moveTo(0, -3); c.lineTo(H * .9, -60); c.lineTo(H * .9, 60); c.lineTo(0, 3); c.fill(); c.restore(); }
    // خط آسمان شهر
    const n = Math.ceil(W / 34);
    for (let layer = 0; layer < 2; layer++) {
      c.fillStyle = layer ? '#050506' : '#0d0b10';
      for (let i = 0; i < n; i++) { const bw = 34, h = (layer ? 30 : 60) + hsh(i * 3.7 + layer * 91) * H * (layer ? .12 : .2), x = i * bw + (layer ? 12 : 0); c.fillRect(x, hz - h + (layer ? 22 : 0), bw - (hsh(i + layer * 7) > .7 ? 8 : 1), h + 40); if (!layer && hsh(i * 9.1) > .86) { c.fillStyle = (Math.sin(t * 2 + i) > 0) ? '#ff3b2f' : '#3a0d0a'; c.fillRect(x + 14, hz - h - 4, 3, 3); c.fillStyle = '#0d0b10'; } }
    }
    c.fillStyle = '#020203'; c.fillRect(0, hz + 30, W, H);
    // دیوار قرنطینه
    c.fillStyle = '#0a0b0d'; c.fillRect(0, hz + 14, W, 26); c.fillStyle = '#6b5a1c'; for (let x = 0; x < W; x += 46) c.fillRect(x, hz + 30, 23, 4);
    // بالگرد
    const hp = ((t * .028) % 1.3), hx = W * (1.1 - hp), hy = H * .2 + Math.sin(t * .7) * 8;
    c.fillStyle = '#030304'; c.beginPath(); c.ellipse(hx, hy, 17, 6, 0, 0, TAU); c.fill(); c.fillRect(hx, hy - 1.5, 34, 3); c.fillRect(hx - 22 * Math.abs(Math.sin(t * 40)), hy - 9, 44 * Math.abs(Math.sin(t * 40)), 1.5);
    if ((t * 2 | 0) & 1) { c.fillStyle = '#ff3b2f'; c.fillRect(hx + 32, hy - 3, 2.5, 2.5); }
    // خاکستر
    c.fillStyle = 'rgba(255,170,110,.7)';
    for (let k = 0; k < 70; k++) { const sp = 14 + hsh(k) * 40, x = (hsh(k * 2.3) * W + t * sp * .6 + Math.sin(t + k) * 18) % W, y = H - ((hsh(k * 5.1) * H + t * sp) % H); c.globalAlpha = .25 + hsh(k * 7) * .6; c.fillRect(x, y, 1.6, 1.6); }
    c.globalAlpha = 1;
    g = c.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, Math.max(W, H) * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.85)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    g = c.createLinearGradient(W, 0, W * .35, 0); g.addColorStop(0, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
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
    if (!mmBase) return; if (G.minimapDirty) G.buildMinimap(); const g = cn.getContext('2d'), m = G.map, sc = cn.width / (m.w * T);
    g.imageSmoothingEnabled = false; g.drawImage(mmBase, 0, 0, cn.width, cn.height);
    const dot = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x * sc, y * sc, r, 0, TAU); g.fill(); };
    for (const gt of m.gates) if (gt.sloth) { g.fillStyle = '#e8f0ff'; g.fillRect(gt.cx * T * sc - 3, gt.cy * T * sc - 3, 7, 7); g.fillStyle = '#39465e'; g.fillRect(gt.cx * T * sc - 1.5, gt.cy * T * sc - 1.5, 4, 4); }
    for (const z of G.zActive) { if (z.dead || z.form === 'sloth') continue; let near = false; for (const s of G.soldiers) if (!s.dead && Math.hypot(s.x - z.x, s.y - z.y) < 640) { near = true; break; } if (near) dot(z.x, z.y, big ? 2.2 : 1.4, G.ZT[z.type].color); }
    for (const p of G.props) { if ((p.kind === 'crate' || (p.kind === 'drop' && p.z <= 0)) && p.uses > 0) dot(p.x, p.y, big ? 4 : 2.5, '#ffe27a'); }
    for (const o of G.objPoints()) { const r = (big ? 6 : 4) + Math.sin(G.time * 5) * 1.2; g.strokeStyle = o.c; g.lineWidth = 2; g.beginPath(); g.arc(o.x * sc, o.y * sc, r, 0, TAU); g.stroke(); }
    for (const s of G.soldiers) if (!s.dead && !s.isCmd) dot(s.x, s.y, big ? 3 : 2, s.downed ? '#ff5a5a' : s.color);
    const cm = G.cmd; g.fillStyle = '#fff'; g.beginPath(); g.arc(cm.x * sc, cm.y * sc, big ? 4.5 : 3.2, 0, TAU); g.fill(); g.strokeStyle = '#ffe27a'; g.lineWidth = 1.5; g.stroke();
    if (!big) { g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.strokeRect((view.x - view.w / 2) * sc, (view.y - view.h / 2) * sc, view.w * sc, view.h * sc); }
    else { g.font = 'bold 13px Tahoma,sans-serif'; g.textAlign = 'center'; const lab = (t, x, y, col) => { g.fillStyle = 'rgba(0,0,0,.6)'; const w = g.measureText(t).width + 10; g.fillRect(x * sc - w / 2, y * sc - 13, w, 18); g.fillStyle = col; g.fillText(t, x * sc, y * sc); }; const S = m.sites, Lb = G.mdef.labels || {}; if (Lb.lz) lab(Lb.lz, S.lz.x, S.lz.y - 110, '#3ddc84'); if (Lb.ex) lab(Lb.ex, S.ex.x, S.ex.y + 150, '#4db8ff'); if (Lb.core) lab(Lb.core, S.core.x, S.core.y - 90, '#c9a0ff'); }
  };
})();
