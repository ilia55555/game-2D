'use strict';
/* اشیای محیط: نمای بالا با عمق سه‌بعدی (پرسپکتیو)، جنس‌ها، ردّ گلوله، لرزش و تخریب */
(function () {
  const T = G.T, TAU = Math.PI * 2;
  const CFG = G.PROPS_CFG = {
    camHeight: 620,       // ارتفاع دوربین: هرچه کمتر، عمق سه‌بعدی (کج شدن اشیای بلند) بیشتر
    light: [0.6, 0.8],    // جهت افتادن سایه (نور از بالا-چپ)
    wind: 1,              // تکان خوردن درخت‌ها (۰ = خاموش)
  };
  const HC = CFG.camHeight;
  let camX = 0, camY = 0, PS = 1;
  // تبدیل نقطهٔ ارتفاع‌دار به مختصات لایهٔ دوبعدی روی صحنه (همان پرسپکتیو دوربین سه‌بعدی)
  const P3 = G.P3 = {
    cx: 0, cy: 0,
    setCam(x, y) { camX = P3.cx = x; camY = P3.cy = y; },
    pt(x, y, h) { const s = PS = HC / (HC - h); return [camX + (x - camX) * s, camY + (y - camY) * s]; },
    scale: () => PS,
  };
  const LEAF = ['#3d6a2c', '#7d7630', '#3d6a2c', '#3d6a2c', '#35705a'], PINEC = ['#2a5236', '#566234', '#2a5236', '#2a5236', '#2a5a50'];

  // مشخصات هر نوع: جنس، جان، ضریب آسیب گلوله، ارتفاع، شعاع یا جعبهٔ برخورد
  const SPEC = {
    barrel: { h: 32, hr: 13 }, crate: { mat: 'wood', hp: 110, bk: 1, h: 27, hb: [15, 15] }, barrier: { mat: 'concrete', hp: 700, bk: .2, h: 30 },
    sandbag: { mat: 'sand', hp: 240, bk: .6, h: 22 }, tires: { mat: 'rubber', hp: 170, bk: .5, h: 24, hr: 15 }, rock: { mat: 'stone', hp: 900, bk: .08, h: 24, hr: 14 },
    tree: { mat: 'wood', hp: 240, bk: .5, tall: 1 }, pine: { mat: 'wood', hp: 200, bk: .5, tall: 1 }, dead: { mat: 'wood', hp: 150, bk: .5, tall: 1 },
    car: { mat: 'metal', hp: 360, bk: .25, h: 21 }, window: { mat: 'glass', hp: 150, bk: 0, h: 40, over: 1 }, rubble: { mat: 'concrete', hp: 150, bk: .3, h: 11, over: 1 },
    junk: { mat: 'metal', hp: 400, bk: .25, h: 20, hb: [16, 16] },
    door: { mat: 'wood', hp: 150, bk: 1, h: 42, tall: 1 },
    // مبلمان خانه
    counter: { mat: 'wood', hp: 120, bk: 1, h: 22 }, sink: { mat: 'metal', hp: 140, bk: .5, h: 22 }, stove: { mat: 'metal', hp: 160, bk: .5, h: 22 }, fridge: { mat: 'metal', hp: 180, bk: .5, h: 44, tall: 1 },
    table: { mat: 'wood', hp: 80, bk: 1, h: 18 }, sofa: { mat: 'soft', hp: 130, bk: 1, h: 20 }, bed: { mat: 'soft', hp: 130, bk: 1, h: 14 }, tv: { mat: 'glass2', hp: 50, bk: 1, h: 26 },
    wardrobe: { mat: 'wood', hp: 140, bk: 1, h: 46, tall: 1 }, nightstand: { mat: 'wood', hp: 60, bk: 1, h: 14 }, tub: { mat: 'concrete', hp: 200, bk: .4, h: 15 }, toilet: { mat: 'concrete', hp: 80, bk: .6, h: 16 }, shelf: { mat: 'metal', hp: 110, bk: .5, h: 44, tall: 1 },
  };
  G.OBJ_SPEC = SPEC;
  const build = o => { o.dirty = true; }; // مدل سه‌بعدی در world3d دوباره ساخته می‌شود

  G.initObjs = function (m) {
    const W = m.w;
    for (const o of m.objs) {
      const S = SPEC[o.type]; o.mat = S.mat; o.h = S.h; o.hr = S.hr; o.hb = S.hb; o.bk = S.bk; o.max = S.hp; o.tall = !!S.tall; o.over = !!S.over; o.wob = 0; o.wa = 0; o.alpha = 1;
      if (o.type === 'barrel') { o.fuel = o.color === 'red'; o.mat = o.color === 'blue' ? 'plastic' : 'metal'; o.max = o.fuel ? 70 : o.mat === 'plastic' ? 80 : 160; o.bk = o.mat === 'plastic' ? 1 : .5; }
      if (o.type === 'tree' || o.type === 'pine' || o.type === 'dead') {
        const k = o.size; o.hr = Math.max(5, (o.type === 'tree' ? 7 : 6) * k); o.h = (o.type === 'tree' ? 94 : o.type === 'pine' ? 104 : 72) * k; o.cr = o.type === 'tree' ? 44 * k : o.type === 'pine' ? 36 * k : 0;
        o.leafC = (o.type === 'tree' ? LEAF : PINEC)[o.zone] || LEAF[0]; o.bark = o.type === 'dead' ? (o.zone === 3 ? '#231a2b' : '#3a2a1c') : '#4a3422';
      }
      if (o.tiles.length > 1 || o.furn || o.type === 'door') { // جعبهٔ برخورد از روی خانه‌های اشغال‌شده
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const i of o.tiles) { const tx = i % W, ty = (i / W) | 0; x0 = Math.min(x0, tx); x1 = Math.max(x1, tx); y0 = Math.min(y0, ty); y1 = Math.max(y1, ty); }
        o.hor = x1 > x0 || (o.hor && x1 === x0 && y1 === y0); const mg = o.type === 'door' ? 0 : 2;
        o.hb = [(x1 - x0 + 1) * T / 2 - mg, (y1 - y0 + 1) * T / 2 - mg];
        if (o.type === 'barrier') o.hb = o.hor ? [47, 12.5] : [12.5, 47];
        if (o.type === 'car') o.hb = o.vert ? [12, 28] : [28, 12];
        if (o.type === 'door') { o.hb = o.hor ? [o.hb[0], 4] : [4, o.hb[1]]; if (o.weak) o.max = 60; }
      }
      if (o.type === 'sandbag') o.hb = o.hor ? [16, 9] : [9, 16];
      o.hp = o.max; o.dirty = true;
    }
    G.objAct = []; G.fallers = [];
  };

  /* ---------- پرتو گلوله روی اشیا ---------- */
  let stamp = 0; const out = [];
  G.objRay = function (x0, y0, dx, dy, maxD) {
    const m = G.map, W = m.w; out.length = 0; stamp++;
    let tx = Math.floor(x0 / T), ty = Math.floor(y0 / T);
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, adx = Math.abs(dx), ady = Math.abs(dy);
    const tdx = adx > 1e-9 ? T / adx : 1e18, tdy = ady > 1e-9 ? T / ady : 1e18;
    let tmx = adx > 1e-9 ? (dx > 0 ? (tx + 1) * T - x0 : x0 - tx * T) / adx : 1e18, tmy = ady > 1e-9 ? (dy > 0 ? (ty + 1) * T - y0 : y0 - ty * T) / ady : 1e18, d = 0;
    for (;;) {
      if (tx < 0 || ty < 0 || tx >= W || ty >= m.h) break;
      const o = m.obj[ty * W + tx];
      if (o && o.stamp !== stamp && !o.dead) {
        o.stamp = stamp; let t = -1, t2 = -1;
        if (o.over && !(o.type === 'window' && !o.broken)) { /* گلوله از بالای آن رد می‌شود */ }
        else if (o.hb) { // جعبهٔ هم‌راستا با محورها
          const ix = 1 / (dx || 1e-9), iy = 1 / (dy || 1e-9);
          let a = (o.x - o.hb[0] - x0) * ix, b = (o.x + o.hb[0] - x0) * ix, e = (o.y - o.hb[1] - y0) * iy, f = (o.y + o.hb[1] - y0) * iy;
          if (a > b) { const q = a; a = b; b = q; } if (e > f) { const q = e; e = f; f = q; }
          const n = Math.max(a, e), fr = Math.min(b, f); if (n <= fr && fr > 0) { t = Math.max(0, n); t2 = fr; }
        } else {
          const rx = o.x - x0, ry = o.y - y0, pj = rx * dx + ry * dy, q = rx * rx + ry * ry - pj * pj, rr = (o.hr || 12) * (o.hr || 12);
          if (q < rr && pj > 0) { const hs = Math.sqrt(rr - q); t = Math.max(0, pj - hs); t2 = pj + hs; }
        }
        if (t >= 0 && t <= maxD) out.push({ o, t, t2 });
      }
      if (tmx < tmy) { d = tmx; tmx += tdx; tx += sx; } else { d = tmy; tmy += tdy; ty += sy; }
      if (d >= maxD) break;
    }
    return out;
  };
  // آیا شیئی که گلوله را نگه می‌دارد سر راه است؟ (برای انتخاب هدف نیروها)
  G.objBlocks = function (x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy); if (d < 1) return false;
    for (const h of G.objRay(x0, y0, dx / d, dy / d, d)) { if (h.t < 38 && !h.o.tall) continue; if (h.o.mat !== 'plastic' && h.o.mat !== 'glass') return true; }
    return false;
  };

  // ردّ گلوله: فقط یک نقطهٔ ریز روی سطح (در world3d رسم می‌شود)
  function addMark(own, x, y, h, nx, ny, k) { if (G.W3) G.W3.mark(own, x - nx * .8, y - ny * .8, h, k); }
  function activate(o) { if (!o.act) { o.act = true; G.objAct.push(o); } }
  function wobble(o, a, amt) { activate(o); o.wob = Math.min(o.tall ? 5 : 2.6, (o.wob || 0) + amt); o.wa = a; }
  const BC = { red: '#8a2c22', blue: '#27506f', olive: '#4a5330', rust: '#6e4a2c' };
  const SND = { metal: 'ping', wood: 'thud', plastic: 'pop', concrete: 'chip', stone: 'chip', sand: 'thud', rubber: 'thud', glass: 'glass' };

  // برخورد گلوله با شیء. خروجی: ضریب ادامهٔ مسیر (۰ = گلوله ایستاد)
  G.hitObj = function (o, px, py, dx, dy, dmg, d, ex, ey) {
    const fx = G.fx, back = Math.atan2(-dy, -dx), ang = Math.atan2(dy, dx), mat = o.mat, cd = Math.hypot(px - G.cmd.x, py - G.cmd.y);
    if (mat === 'glass2') { fx.glass(px, py, ang); fx.sparks(px, py, back, 4); G.audio.play('glass', cd); G.damageObj(o, dmg, false, ang); return 0; }
    if (mat === 'soft') { fx.chips(px, py, back, '#e8e2d2', 4); addMark(o, px + dx * 4, py + dy * 4, o.h + .6, 0, 0, 'wood'); G.audio.play('thud', cd); G.damageObj(o, dmg, false, ang); return .6; }
    if (mat === 'glass') { // پنجره: شیشه می‌شکند و گلوله رد می‌شود
      if (!o.broken) { o.broken = true; build(o); fx.glass(o.x, o.y, ang); G.audio.play('glass', cd); }
      return 1;
    }
    const marks = o, top = o.type === 'door' || o.furn && !SPEC[o.type].tall || !o.tall, hh = o.h * (top ? .35 + Math.random() * .5 : .12 + Math.random() * .2);
    addMark(marks, px, py, hh, dx, dy, mat);
    if (top && o.type !== 'door') addMark(marks, px + dx * 4, py + dy * 4, o.h + .6, 0, 0, mat); // سوراخ روی رویهٔ بالا تا از بالا هم دیده شود
    wobble(o, ang, Math.min(1.2, dmg * .03));
    G.audio.play(SND[mat], cd);
    let pass = 0;
    if (mat === 'metal') { fx.sparks(px, py, back, 5 + (Math.random() * 4 | 0)); }
    else if (mat === 'wood') {
      fx.chips(px, py, back, '#8a6236', 3); if (Math.random() < .5) fx.smoke(px, py);
      if (!o.tall && d && (d.pierce || 1) >= 2) { pass = .55; if (ex != null) { addMark(marks, ex, ey, hh, -dx, -dy, mat); fx.chips(ex, ey, ang, '#8a6236', 4); } }
    } else if (mat === 'plastic') { // سوراخ می‌شود و گلوله رد می‌شود؛ مایع از سوراخ بیرون می‌زند
      pass = .8; fx.chips(px, py, back, '#5d8fb3', 2);
      if (ex != null) { addMark(marks, ex, ey, hh, -dx, -dy, mat); addMark(marks, ex - dx * 4, ey - dy * 4, o.h + .6, 0, 0, mat); fx.chips(ex, ey, ang, '#8fc4e8', 4); }
      o.leak = (o.leak || 0) + 1; if (o.leak <= 4) fx.remain('puddle', (ex != null ? ex : px) + dx * 6 + G.rand(-5, 5), (ey != null ? ey : py) + dy * 6 + G.rand(-5, 5), Math.random() * 6, .5 + o.leak * .15);
    } else if (mat === 'concrete') { fx.puff(px, py, '#b9b3a4', 2); fx.chips(px, py, back, '#9a958a', 3); }
    else if (mat === 'stone') { fx.sparks(px, py, back, 2); fx.chips(px, py, back, '#a8a69c', 3); }
    else if (mat === 'sand') { fx.puff(px, py, '#c2ad78', 2); fx.chips(px, py, back, '#b3a172', 2); }
    else { fx.chips(px, py, back, '#1c1c1c', 2); }
    G.damageObj(o, dmg * o.bk, false, ang);
    return pass;
  };

  // برخورد گلوله با دیوار: گلوله در بتن گیر می‌کند، گردوخاک و تراشه
  G.hitWall = function (ti, px, py, dx, dy, dmg) {
    const m = G.map, b = m.block[ti]; if (!b) return;
    const fx = G.fx, back = Math.atan2(-dy, -dx);
    if (b === 6 || b === 7) { fx.sparks(px, py, back, 3, '#c9a0ff'); G.audio.play('ping', Math.hypot(px - G.cmd.x, py - G.cmd.y)); return; }
    fx.puff(px, py, '#b9b3a4', 2); fx.chips(px, py, back, '#a39c8e', 3); G.audio.play('chip', Math.hypot(px - G.cmd.x, py - G.cmd.y));
    const H = G.WALL_H[b], tx = (ti % m.w) * T, ty = ((ti / m.w) | 0) * T;
    const dl = px - tx, dr = tx + T - px, du = py - ty, dd = ty + T - py, mn = Math.min(dl, dr, du, dd);
    const nx = mn === dl ? -1 : mn === dr ? 1 : 0, ny = nx ? 0 : mn === du ? -1 : 1;
    const own = m.marks.get(ti) || (m.marks.set(ti, {}), m.marks.get(ti));
    addMark(own, px, py, H * (.3 + Math.random() * .6), -nx, -ny, 'concrete');
    addMark(own, G.clamp(px + dx * 4, tx + 2, tx + T - 2), G.clamp(py + dy * 4, ty + 2, ty + T - 2), H + .6, 0, 0, 'concrete');
    G.damageTile(ti, dmg, false);
  };

  /* ---------- آسیب و تخریب ---------- */
  G.damageObj = function (o, dmg, expl, ang) {
    if (o.dead) return;
    const ex = G._ex;
    if (expl && ex) { if (o.exId === ex.id) return; o.exId = ex.id; ang = Math.atan2(o.y - ex.y, o.x - ex.x); wobble(o, ang, 2.5); }
    if (ang == null) ang = Math.random() * TAU;
    o.hp -= dmg; o.hitA = ang;
    if (o.type === 'window' && expl && !o.broken) { o.broken = true; build(o); G.fx.glass(o.x, o.y, ang); }
    if (o.fuel) { // بشکهٔ سوخت: آتش می‌گیرد و بعد منفجر می‌شود (واکنش زنجیره‌ای)
      const arm = t => { activate(o); o.fuse = o.fuse > 0 ? Math.min(o.fuse, t) : t; };
      if (o.hp <= 0) { o.hp = 1; arm(expl ? G.rand(.12, .38) : .3); } else if (o.hp < o.max * .55) arm(G.rand(1.1, 1.8));
      return;
    }
    if (o.hp <= 0) { G.killObj(o, ang); return; }
    if (o.type === 'sandbag' && !o.half && o.hp < o.max * .5) { // کیسهٔ بالایی می‌افتد
      o.half = true; G.fx.puff(o.x, o.y, '#c2ad78', 4); G.fx.debris(o.x, o.y, 'sack', 1, ang);
      for (const q of G.map.objs) if (q.type === 'sandbag' && (q === o || q.next === o)) build(q);
    }
    if ((o.mat === 'concrete' || o.mat === 'stone') && o.hp < o.max * .5) o.crack = true;
  };
  G.killObj = function (o, ang) {
    if (o.dead) return; o.dead = true;
    const m = G.map, fx = G.fx, x = o.x, y = o.y; if (ang == null) ang = o.hitA != null ? o.hitA : Math.random() * TAU;
    const k = m.objs.indexOf(o); if (k >= 0) m.objs.splice(k, 1);
    if (G.W3) G.W3.unmark(o);
    for (const i of o.tiles) G.clearTile(i);
    const cd = Math.hypot(x - G.cmd.x, y - G.cmd.y);
    switch (o.type) {
      case 'crate': fx.debris(x, y, 'plank', 9, ang); fx.puff(x, y, '#a58a62', 3); fx.remain('splinters', x, y, o.seed % 6, 1); G.audio.play('crack', cd); break;
      case 'barrel':
        if (o.fuel) { fx.debris(x, y, 'metal', 6, ang, '#8a2c22'); fx.remain('barrel', x + Math.cos(ang) * 18, y + Math.sin(ang) * 18, ang, 1, '#3a2019'); G.explode(x, y, 100, 240, null); fx.fire(x, y, 12, 6); }
        else if (o.mat === 'plastic') { fx.debris(x, y, 'plastic', 8, ang); fx.remain('puddle', x, y, o.seed % 6, 1.6); G.audio.play('pop', cd); }
        else { fx.debris(x, y, 'metal', 4, ang, BC[o.color]); fx.sparks(x, y, ang, 8); fx.remain('barrel', x + Math.cos(ang) * 12, y + Math.sin(ang) * 12, ang, 1, BC[o.color]); G.audio.play('clang', cd); }
        break;
      case 'tires': fx.debris(x, y, 'tire', 3, ang); fx.puff(x, y, '#3a3a3a', 3); G.audio.play('thud', cd); break;
      case 'sandbag': fx.puff(x, y, '#c2ad78', 7); fx.debris(x, y, 'sack', 3, ang); fx.remain('sand', x, y, o.seed % 6, 1); G.audio.play('thud', cd);
        for (const q of m.objs) if (q.type === 'sandbag' && q.next === o) build(q); break;
      case 'barrier': for (let i = -1; i <= 1; i++) { const qx = x + (o.hor ? i * T : 0), qy = y + (o.hor ? 0 : i * T); fx.debris(qx, qy, 'concrete', 6, ang); fx.puff(qx, qy, '#a39c8e', 4); fx.remain('rubble', qx, qy, (o.seed + i) % 6, 1); } G.audio.play('crumble', cd); break;
      case 'door': fx.debris(x, y, 'plank', 8, ang); fx.puff(x, y, '#a58a62', 3); fx.remain('splinters', x, y, o.seed % 6, 1); G.audio.play('crack', cd); if (!o.weak) G.msg && G.msg('درب شکسته شد.', '#f2e2a0'); break;
      case 'counter': case 'table': case 'wardrobe': case 'nightstand': fx.debris(x, y, 'plank', 7, ang); fx.puff(x, y, '#a58a62', 2); fx.remain('splinters', x, y, o.seed % 6, 1); G.audio.play('crack', cd); break;
      case 'sofa': case 'bed': fx.debris(x, y, 'sack', 4, ang); fx.debris(x, y, 'plank', 3, ang); fx.puff(x, y, '#e8e2d2', 5); fx.remain('splinters', x, y, o.seed % 6, 1); G.audio.play('thud', cd); break;
      case 'fridge': case 'stove': case 'sink': case 'shelf': fx.debris(x, y, 'metal', 6, ang, '#b9bcbf'); fx.sparks(x, y, ang, 8); G.audio.play('clang', cd); break;
      case 'tv': fx.glass(x, y, ang); fx.sparks(x, y, ang, 10); fx.debris(x, y, 'plastic', 4, ang); G.audio.play('glass', cd); break;
      case 'tub': case 'toilet': fx.debris(x, y, 'concrete', 6, ang, '#e6e6e0'); fx.puff(x, y, '#d8d8d2', 3); fx.remain('puddle', x, y, o.seed % 6, 1.2); G.audio.play('crumble', cd); break;
      case 'rubble': case 'window': fx.debris(x, y, 'concrete', 6, ang); fx.puff(x, y, '#a39c8e', 4); fx.remain('rubble', x, y, o.seed % 6, .8); G.audio.play('crumble', cd); break;
      case 'rock': fx.debris(x, y, 'stone', 9, ang); fx.puff(x, y, '#9c9a90', 5); fx.remain('gravel', x, y, o.seed % 6, 1); G.audio.play('crumble', cd); break;
      case 'car': { const q = m.cars.indexOf(o.car); if (q >= 0) m.cars.splice(q, 1); fx.boom(x, y, 50); fx.debris(x, y, 'metal', 9, ang, o.car.burnt ? '#2a2725' : o.car.c); fx.remain('carwreck', x, y, o.vert ? Math.PI / 2 : 0, 1); fx.fire(x, y, 16, 14); G.audio.play('boom', cd); break; }
      case 'tree': case 'pine': case 'dead': // تنه می‌شکند و درخت در جهت ضربه می‌افتد
        o.fall = { k: 0, e: 0, dx: Math.cos(ang), dy: Math.sin(ang) }; o.wob = 0; G.fallers.push(o);
        fx.chips(x, y, ang, '#8a6236', 8); fx.remain('stump', x, y, o.seed % 6, o.hr / 6); G.audio.play('crack', cd);
        if (o.cr) fx.leaves(x, y, o.cr * .6, o.leafC, 10);
        break;
    }
  };

  G.updateObjs = function (dt) {
    const A = G.objAct;
    for (let i = A.length - 1; i >= 0; i--) {
      const o = A[i]; let keep = false;
      if (o.wob > 0) { o.wob *= Math.exp(-5 * dt); if (o.wob < .05) o.wob = 0; else keep = true; }
      if (o.fuse > 0 && !o.dead) {
        o.fuse -= dt; keep = true;
        if (Math.random() < dt * 30) G.fx.flame(o.x + G.rand(-5, 5), o.y + G.rand(-5, 5));
        if (o.fuse <= 0) G.killObj(o, o.hitA);
      }
      if (!keep || o.dead) { o.act = false; A[i] = A[A.length - 1]; A.pop(); }
    }
    const F = G.fallers;
    for (let i = F.length - 1; i >= 0; i--) {
      const o = F[i], f = o.fall; f.k += dt / .85; f.e = Math.min(1, f.k * f.k * 1.6);
      if (f.e >= 1 && !f.hit) { // برخورد با زمین
        f.hit = true; const len = o.h * .8, ex = o.x + f.dx * len, ey = o.y + f.dy * len;
        G.fx.remain('log', o.x, o.y, Math.atan2(f.dy, f.dx), len / 60, o.bark);
        if (o.cr) { G.fx.leaves(ex, ey, o.cr, o.leafC, 16); G.fx.remain('leaves', o.x + f.dx * len * .75, o.y + f.dy * len * .75, o.seed % 6, o.cr / 40, o.leafC); }
        G.fx.puff(ex, ey, '#8a8070', 4); G.audio.play('thud', Math.hypot(ex - G.cmd.x, ey - G.cmd.y)); G.fx.shake(2);
      }
      if (f.k >= 1) F.splice(i, 1);
    }
  };
  // موج انفجار اشیای اطراف را می‌لرزاند
  G.shockObjs = function (x, y, r) {
    for (const o of G.map.objs) { const d = Math.hypot(o.x - x, o.y - y); if (d < r) wobble(o, Math.atan2(o.y - y, o.x - x), 2.4 * (1 - d / r) + .3); }
  };
})();
