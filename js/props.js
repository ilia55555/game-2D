'use strict';
/* اشیای محیط: نمای بالا با عمق سه‌بعدی (پرسپکتیو)، جنس‌ها، ردّ گلوله، لرزش و تخریب */
(function () {
  const T = G.T, TAU = Math.PI * 2;
  const CFG = G.PROPS_CFG = {
    persp: 0.0024,        // شدت سه‌بعدی: هرچه بیشتر، اشیای بلند بیشتر به بیرون کج می‌شوند
    light: [0.6, 0.8],    // جهت افتادن سایه (نور از بالا-چپ)
    shadowLength: 0.55,   // طول سایه به ازای هر واحد ارتفاع
    shadowOpacity: 0.3,
    wind: 1,              // تکان خوردن درخت‌ها (۰ = خاموش)
  };
  const ll = Math.hypot(CFG.light[0], CFG.light[1]), L = [CFG.light[0] / ll, CFG.light[1] / ll];
  let camX = 0, camY = 0, PS = 1, c = null;
  const P3 = G.P3 = {
    L, cx: 0, cy: 0, persp: CFG.persp,
    setCam(x, y) { camX = P3.cx = x; camY = P3.cy = y; },
    zoom: h => 1 + h * CFG.persp,
  };

  const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const rgb = (col, f) => `rgb(${col.map(v => Math.round(Math.min(255, v * f))).join(',')})`;
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

  // نقطهٔ جهان در ارتفاع h -> نقطهٔ بوم. لرزش ضربه و افتادن درخت هم همین‌جا اعمال می‌شود.
  function pt(o, x, y, h) {
    if (o) {
      if (o.fall) { const th = o.fall.e * Math.PI / 2, sn = Math.sin(th); x += o.fall.dx * h * sn; y += o.fall.dy * h * sn; h *= Math.cos(th); }
      else if (o.wob > .02) { const k = o.wob * Math.sin(G.time * 42) * h / o.h; x += Math.cos(o.wa) * k; y += Math.sin(o.wa) * k; }
    }
    const s = PS = 1 + h * CFG.persp;
    return [camX + (x - camX) * s, camY + (y - camY) * s];
  }
  P3.pt = (x, y, h) => pt(null, x, y, h);
  P3.scale = () => PS;

  /* ---------- رویهٔ بالای اشیا (برگردان طرح‌های SVG) ---------- */
  const circ = (x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
  const BARREL = {
    red:   { side: '#8a2c22', hi: '#c9584a', top: '#a5382b', dark: '#531710', mark: true },
    blue:  { side: '#27506f', hi: '#5d8fb3', top: '#33678e', dark: '#152c3e' },
    olive: { side: '#4a5330', hi: '#7d8756', top: '#5d683c', dark: '#262b16' },
    rust:  { side: '#6e4a2c', hi: '#a37a4c', top: '#84593a', dark: '#3a2513' },
  };
  function barrelTop(b) {
    c.fillStyle = b.top; c.strokeStyle = b.dark; c.lineWidth = 2; circ(0, 0, 15); c.fill(); c.stroke();
    c.globalAlpha *= .7; c.lineWidth = 1; circ(0, 0, 10.5); c.stroke(); c.globalAlpha /= .7;
    c.fillStyle = b.dark; circ(6.5, -5, 2.2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.8; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, 11.5, 3.6, 4.45); c.stroke();
    if (b.mark) { c.fillStyle = '#e8c23a'; c.strokeStyle = '#1d1d1d'; c.lineWidth = .8; c.lineJoin = 'round'; c.beginPath(); c.moveTo(-5.5, 7); c.lineTo(3.5, 7); c.lineTo(-1, -1); c.closePath(); c.fill(); c.stroke(); }
  }
  function crateTop() {
    c.fillStyle = '#b5834a'; c.fillRect(-23, -23, 46, 46);
    c.strokeStyle = '#8a5f30'; c.lineWidth = 1; c.beginPath(); for (const x of [-11.5, 0, 11.5]) { c.moveTo(x, -23); c.lineTo(x, 23); } c.stroke();
    c.strokeStyle = '#9a6b38'; c.lineWidth = 6; c.lineCap = 'butt'; c.beginPath(); c.moveTo(-19, -19); c.lineTo(19, 19); c.stroke(); c.strokeRect(-20, -20, 40, 40);
    c.strokeStyle = '#5e3f1c'; c.lineWidth = 1.5; c.strokeRect(-23, -23, 46, 46);
  }
  function tiresTop() {
    c.fillStyle = '#262626'; c.strokeStyle = '#0a0a0a'; c.lineWidth = 1.5; circ(0, 0, 18); c.fill(); c.stroke();
    c.strokeStyle = '#3b3b3b'; c.lineWidth = 1.2; circ(0, 0, 13.5); c.stroke();
    c.fillStyle = '#080808'; c.strokeStyle = '#111'; c.lineWidth = 1; circ(0, 0, 9.5); c.fill(); c.stroke();
  }
  const bagTop = tint => () => {
    c.fillStyle = tint; c.strokeStyle = '#6f6140'; c.lineWidth = 1; c.beginPath(); c.roundRect(-16, -9, 32, 18, 6.5); c.fill(); c.stroke();
    c.strokeStyle = '#8d7d53'; c.setLineDash([3, 2]); c.beginPath(); c.moveTo(-10, 0); c.lineTo(10, 0); c.stroke(); c.setLineDash([]);
  };
  const polyTop = (pts, fill, stroke) => () => { c.fillStyle = fill; c.strokeStyle = stroke; c.lineWidth = 1; c.lineJoin = 'round'; c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath(); c.fill(); c.stroke(); };
  const rectTop = (w, h, fill, stroke, extra) => () => { c.fillStyle = fill; c.fillRect(-w / 2, -h / 2, w, h); if (extra) extra(); c.strokeStyle = stroke; c.lineWidth = 1; c.strokeRect(-w / 2, -h / 2, w, h); };

  /* ---------- سازندهٔ قطعه‌ها: استوانه، منشور، لایهٔ شاخ‌وبرگ، شاخه ---------- */
  const rect = (w, h) => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
  function cyl(o, r, h0, h1, col, ribs, top, k) { return { t: 0, x: o.x, y: o.y, r, h0, h1, side: col.side, hi: col.hi, ribs: ribs || [], rib: col.dark || '#000', top, k: k || 1 }; }
  function box(o, lp, ox, oy, h0, h1, side, top, k) {
    const a = o.rot || 0, off = rot(ox, oy, a), cx = o.x + off[0], cy = o.y + off[1];
    const pts = lp.map(q => { const r = rot(q[0], q[1], a); return [cx + r[0], cy + r[1]]; }), n = pts.length;
    const faces = pts.map((A, i) => {
      const B = pts[(i + 1) % n], ex = B[0] - A[0], ey = B[1] - A[1], el = Math.hypot(ex, ey) || 1, nx = ey / el, ny = -ex / el;
      const f = 0.62 - 0.33 * (nx * L[0] + ny * L[1]);            // دیوارهٔ رو به نور روشن‌تر
      return { A, B, nx, ny, fill: rgb(side, f), stroke: rgb(side, f * .7) };
    });
    return { t: 1, pts, faces, h0, h1, top, cx, cy, k: k || 1 };
  }
  function leafBlob(o, R, h, fill, hi, r) {
    const path = new Path2D(); path.arc(0, 0, R * .62, 0, TAU);
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + r(), d = R * .5, rr = R * (.36 + .14 * r()); path.moveTo(Math.cos(a) * d + rr, Math.sin(a) * d); path.arc(Math.cos(a) * d, Math.sin(a) * d, rr, 0, TAU); }
    return { t: 2, x: o.x, y: o.y, h, r: R * .9, path, fill, hi: [-R * .25, -R * .3, R * .36, hi] };
  }
  function pineBlob(o, R, h, fill, tw) {
    const path = new Path2D();
    for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283 + tw, d = i % 2 ? R * .6 : R; i ? path.lineTo(Math.cos(a) * d, Math.sin(a) * d) : path.moveTo(Math.cos(a) * d, Math.sin(a) * d); }
    path.closePath();
    return { t: 2, x: o.x, y: o.y, h, r: R * .8, path, fill, stroke: '#14261b' };
  }

  const LEAF = [ // رنگ شاخ‌وبرگ بر اساس منطقه: سبز، زرد (پاییزی)، -، -، آبی
    [['#2f4a22', '#3d5e2b'], ['#3a5c29', '#4b7234'], ['#48702f', '#5d8a3d'], ['#5a843a', '#79a650']],
    [['#5a5320', '#6f6727'], ['#6e6525', '#857a2e'], ['#857a2b', '#9e9238'], ['#9c8f33', '#b8ab48']],
    null, null,
    [['#254a3c', '#2f5e4b'], ['#2e5c4a', '#3b7260'], ['#3a705a', '#4b8a70'], ['#4a846b', '#62a688']],
  ];
  const PINE = [['#1f3a2a', '#27472f', '#305637', '#3b6842', '#4a7d50'], ['#3a4424', '#46512a', '#546130', '#637238', '#748542'], null, null, ['#1c3a38', '#234742', '#2c564e', '#36685d', '#447d6e']];

  // مشخصات هر نوع: جنس، جان، ضریب آسیب گلوله، شعاع برخورد
  const SPEC = {
    barrel: { h: 32, hr: 13 }, crate: { mat: 'wood', hp: 110, bk: 1, h: 27, hb: [15, 15] }, barrier: { mat: 'concrete', hp: 700, bk: .2, h: 30 },
    sandbag: { mat: 'sand', hp: 240, bk: .6, h: 22 }, tires: { mat: 'rubber', hp: 170, bk: .5, h: 24, hr: 15 }, rock: { mat: 'stone', hp: 900, bk: .08, h: 24, hr: 14 },
    tree: { mat: 'wood', hp: 240, bk: .5, tall: 1 }, pine: { mat: 'wood', hp: 200, bk: .5, tall: 1 }, dead: { mat: 'wood', hp: 150, bk: .5, tall: 1 },
    car: { mat: 'metal', hp: 360, bk: .25, h: 21 }, window: { mat: 'glass', hp: 150, bk: 0, h: 24, over: 1 }, rubble: { mat: 'concrete', hp: 150, bk: .3, h: 11, over: 1 },
    junk: { mat: 'metal', hp: 400, bk: .25, h: 20, hb: [16, 16] },
  };

  function build(o) {
    const ps = o.parts = [], r = rng(o.seed || 7); o.shadow = null;
    switch (o.type) {
      case 'barrel': { const b = BARREL[o.color] || BARREL.red; ps.push(cyl(o, 13, 0, 32, b, [10.5, 21], () => barrelTop(b), .87)); break; }
      case 'crate': ps.push(box(o, rect(30, 30), 0, 0, 0, 27, [150, 104, 56], crateTop, .655)); break;
      case 'tires': ps.push(cyl(o, 15, 0, 24, { side: '#191919', hi: '#444', dark: '#000' }, [8, 16], tiresTop, .84)); break;
      case 'barrier': {
        const stripes = () => { c.strokeStyle = 'rgba(217,165,32,.85)'; c.lineWidth = 4.5; c.beginPath(); for (const x of [-36, -26, 20, 30]) { c.moveTo(x, -5.5); c.lineTo(x + 7, 5.5); } c.stroke(); };
        ps.push(box(o, rect(94, 25), 0, 0, 0, 10, [150, 149, 141], rectTop(94, 25, '#a09f97', '#6e6d66')));
        ps.push(box(o, rect(90, 11), 0, 0, 10, 30, [172, 171, 162], rectTop(90, 11, '#c2c1b8', '#77766f', stripes)));
        break;
      }
      case 'sandbag': {
        const pts = [[-16, -5.5], [-12.5, -9], [12.5, -9], [16, -5.5], [16, 5.5], [12.5, 9], [-12.5, 9], [-16, 5.5]], tints = ['#ac9a6c', '#b3a172', '#a99769'];
        ps.push(box(o, pts, 0, 0, 0, 11, [168, 150, 104], bagTop(tints[o.seed % 3])));
        if (o.half) break;
        const nx = o.next; // کیسهٔ ردیف بالا روی درز دو کیسهٔ پایینی می‌نشیند
        if (nx && !nx.dead && !nx.half) ps.push(box(o, pts, 16, 0, 11, 22, [168, 150, 104], bagTop(o.seed % 2 ? '#bdab7b' : '#b8a676')));
        break;
      }
      case 'rock': {
        const n = 9, base = [];
        for (let i = 0; i < n; i++) { const a = i / n * TAU, d = 15.5 * (.72 + .28 * r()); base.push([Math.cos(a) * d, Math.sin(a) * d]); }
        const lay = (k, h0, h1, fill, d) => { const pts = base.map(q => [q[0] * k + d, q[1] * k + d]); ps.push(box(o, pts, 0, 0, h0, h1, [118, 116, 108], polyTop(pts, fill, '#5f5d56'))); };
        lay(1, 0, 9, '#8a887f', 0); lay(.76, 9, 17, '#9c9a90', -1); lay(.48, 17, 24, '#b1afa4', -2);
        break;
      }
      case 'tree': {
        const k = o.size, pal = LEAF[o.zone] || LEAF[0];
        ps.push(cyl(o, 7 * k, 0, 46 * k, { side: '#4a3422', hi: '#7a5a3c' }));
        [[48, 42], [41, 60], [31, 78], [19, 94]].forEach((q, i) => ps.push(leafBlob(o, q[0] * k, q[1] * k, pal[i][0], pal[i][1], r)));
        o.hr = Math.max(5, 7 * k); o.h = 94 * k; o.cr = 44 * k; break;
      }
      case 'pine': {
        const k = o.size, pal = PINE[o.zone] || PINE[0];
        ps.push(cyl(o, 5 * k, 0, 28 * k, { side: '#3f2c1d', hi: '#6b4d33' }));
        [[42, 24, 0], [34, 46, .3], [25, 68, .6], [16, 88, .9], [7, 104, 1.2]].forEach((q, i) => ps.push(pineBlob(o, q[0] * k, q[1] * k, pal[i], q[2])));
        o.hr = Math.max(5, 5 * k + 1); o.h = 104 * k; o.cr = 36 * k; break;
      }
      case 'dead': { // درخت خشکیدهٔ مناطق بمباران‌شده
        const k = o.size, H = 58 * k, col = o.zone === 3 ? '#231a2b' : '#3a2a1c';
        ps.push(cyl(o, 6 * k, 0, H, { side: col, hi: o.zone === 3 ? '#3d2f4a' : '#5a4530' }));
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + r() * 1.2, len = (16 + r() * 16) * k, h0 = H * (.5 + r() * .45); ps.push({ t: 3, x0: o.x, y0: o.y, h0, x1: o.x + Math.cos(a) * len, y1: o.y + Math.sin(a) * len, h1: h0 + 14 * k, w: 2.4 * k, col }); }
        o.hr = Math.max(5, 6 * k); o.h = H + 14 * k; o.cr = 0; break;
      }
      case 'car': {
        const k = o.car, v = o.vert, col = k.burnt ? [42, 39, 37] : hex(k.c), W = 56, D = 24;
        o.rot = v ? Math.PI / 2 : 0; o.hb = v ? [D / 2, W / 2] : [W / 2, D / 2];
        const body = () => {
          c.fillStyle = rgb(col, 1); c.strokeStyle = rgb(col, .55); c.lineWidth = 1; c.beginPath(); c.roundRect(-W / 2, -D / 2, W, D, 5); c.fill(); c.stroke();
          c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(-W / 2 + 3, -D / 2 + 2, 2, D - 4); c.fillRect(W / 2 - 5, -D / 2 + 2, 2, D - 4);
          c.fillStyle = k.burnt ? '#141414' : 'rgba(150,200,230,.6)'; c.fillRect(-17, -D / 2 + 3, 5, D - 6); c.fillRect(12, -D / 2 + 3, 5, D - 6);
        };
        const roof = () => { c.fillStyle = rgb(col, 1.12); c.strokeStyle = rgb(col, .6); c.lineWidth = 1; c.beginPath(); c.roundRect(-12, -D / 2 + 2.5, 24, D - 5, 3); c.fill(); c.stroke(); };
        ps.push(box(o, rect(W, D), 0, 0, 2, 13, col, body)); ps.push(box(o, rect(24, D - 5), 0, 0, 13, 21, col.map(x => x * .8), roof));
        break;
      }
      case 'window': {
        const z = o.zone, wt = hex(['#a59c8b', '#a59c8b', '#8a7568', '#4b4356', '#9aa3ad'][z]);
        o.rot = o.horiz ? 0 : Math.PI / 2;
        ps.push(box(o, rect(32, 32), 0, 0, 0, 9, wt, rectTop(32, 32, rgb(wt, 1), rgb(wt, .7))));
        if (!o.broken) ps.push({ t: 4, o, a: rot(-16, 0, o.rot), b: rot(16, 0, o.rot), h0: 9, h1: 24 });
        break;
      }
      case 'rubble': {
        for (let i = 0; i < 4; i++) { const w = 8 + r() * 7, pts = rect(w, 6 + r() * 6); ps.push(box(o, pts, (r() - .5) * 16, (r() - .5) * 16, 0, 5 + r() * 6, i & 1 ? [120, 114, 104] : [100, 95, 87], polyTop(pts, i & 1 ? '#8b857b' : '#77726a', '#4d4943'))); }
        break;
      }
    }
  }

  G.initObjs = function (m) {
    for (const o of m.objs) {
      const S = SPEC[o.type]; o.mat = S.mat; o.h = S.h; o.hr = S.hr; o.hb = S.hb; o.bk = S.bk; o.max = S.hp; o.tall = !!S.tall; o.over = !!S.over; o.wob = 0; o.wa = 0; o.alpha = 1;
      if (o.type === 'barrel') { o.fuel = o.color === 'red'; o.mat = o.color === 'blue' ? 'plastic' : 'metal'; o.max = o.fuel ? 70 : o.mat === 'plastic' ? 80 : 160; o.bk = o.mat === 'plastic' ? 1 : .5; }
      if (o.type === 'barrier') o.hb = o.hor ? [47, 12.5] : [12.5, 47];
      if (o.type === 'sandbag') o.hb = o.hor ? [16, 9] : [9, 16];
      o.hp = o.max; build(o);
    }
    for (const o of m.objs) if (o.type === 'sandbag') build(o); // پیوندهای ردیف بالا پس از ساخت همه
    m.objs.sort((a, b) => a.h - b.h);
    G.objAct = []; G.fallers = [];
  };

  /* ---------- سایه‌ها (یک مسیر یکپارچه برای هر شیء تا روی هم تیره‌تر نشوند) ---------- */
  function hull(P) {
    P.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
    for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    lo.pop(); up.pop(); return lo.concat(up);
  }
  function ring(x, y, r, out) { for (let i = 0; i < 10; i++) out.push([x + Math.cos(i * .6283) * r, y + Math.sin(i * .6283) * r]); }
  function shadowOf(o) {
    const sh = new Path2D(), SL = CFG.shadowLength;
    const poly = P => { const hl = hull(P); hl.forEach((q, i) => i ? sh.lineTo(q[0], q[1]) : sh.moveTo(q[0], q[1])); sh.closePath(); };
    for (const p of o.parts) {
      const P = [];
      if (p.t === 0) { ring(p.x, p.y, p.r, P); ring(p.x + L[0] * p.h1 * SL, p.y + L[1] * p.h1 * SL, p.r, P); }
      else if (p.t === 1) { const d = p.h1 * SL; for (const q of p.pts) { P.push([q[0], q[1]]); P.push([q[0] + L[0] * d, q[1] + L[1] * d]); } }
      else if (p.t === 2) ring(p.x + L[0] * p.h * SL, p.y + L[1] * p.h * SL, p.r, P);
      else continue;
      poly(P);
    }
    return sh;
  }

  /* ---------- رسم ---------- */
  function drawPart(o, p) {
    if (p.t === 0) {
      const b = pt(o, p.x, p.y, p.h0), s0 = PS, t = pt(o, p.x, p.y, p.h1), s1 = PS, w = p.r * (s0 + s1);
      const dx = t[0] - b[0], dy = t[1] - b[1], len = Math.hypot(dx, dy);
      c.lineCap = 'round';
      if (len > .3) { c.strokeStyle = p.side; c.lineWidth = w; c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(t[0], t[1]); c.stroke(); }
      if (len > 1.5) {
        const px = -dy / len, py = dx / len, sg = (px * -L[0] + py * -L[1]) > 0 ? 1 : -1, q = w * .2 * sg;   // عمود بر جهت کج شدن
        c.globalAlpha = .75 * o.alpha; c.strokeStyle = p.hi; c.lineWidth = w * .22; c.beginPath(); c.moveTo(b[0] + px * q, b[1] + py * q); c.lineTo(t[0] + px * q, t[1] + py * q); c.stroke();
        if (p.ribs.length) { // حلقه‌های دور بدنه: فقط نیمهٔ رو به دوربین
          c.globalAlpha = .65 * o.alpha; c.strokeStyle = p.rib; c.lineWidth = 2.2; c.lineCap = 'butt'; const a0 = Math.atan2(py, px);
          for (const hh of p.ribs) { const cc = pt(o, p.x, p.y, hh); c.beginPath(); c.arc(cc[0], cc[1], p.r * PS, a0, a0 + Math.PI); c.stroke(); }
        }
        c.globalAlpha = o.alpha;
      }
      if (p.top) { c.save(); c.translate(t[0], t[1]); c.rotate(o.rot || 0); c.scale(s1 * p.k, s1 * p.k); p.top(); c.restore(); }
    } else if (p.t === 1) {
      c.lineWidth = .6; c.lineJoin = 'round';
      for (const f of p.faces) {
        if (f.nx * ((f.A[0] + f.B[0]) / 2 - camX) + f.ny * ((f.A[1] + f.B[1]) / 2 - camY) >= 0) continue;   // پشت به دوربین
        const a0 = pt(o, f.A[0], f.A[1], p.h0), b0 = pt(o, f.B[0], f.B[1], p.h0), b1 = pt(o, f.B[0], f.B[1], p.h1), a1 = pt(o, f.A[0], f.A[1], p.h1);
        c.fillStyle = f.fill; c.strokeStyle = f.stroke; c.beginPath(); c.moveTo(a0[0], a0[1]); c.lineTo(b0[0], b0[1]); c.lineTo(b1[0], b1[1]); c.lineTo(a1[0], a1[1]); c.closePath(); c.fill(); c.stroke();
      }
      const t = pt(o, p.cx, p.cy, p.h1);
      c.save(); c.translate(t[0], t[1]); c.rotate(o.rot || 0); c.scale(PS * p.k, PS * p.k); p.top(); c.restore();
    } else if (p.t === 2) {
      const k = CFG.wind * p.h, ph = (p.x * .013 + p.y * .007) % 6.28, tm = G.time;                          // بالاتر = تکان بیشتر
      const t = pt(o, p.x + Math.sin(tm * 1.1 + ph) * k * .035, p.y + Math.cos(tm * .8 + ph) * k * .022, p.h);
      c.save(); c.translate(t[0], t[1]); c.rotate(o.rot || 0); c.scale(PS, PS);
      c.globalAlpha = .2 * o.alpha; c.fillStyle = '#000'; c.translate(3, 4); c.fill(p.path); c.translate(-3, -4);
      c.globalAlpha = o.alpha; c.fillStyle = p.fill; c.fill(p.path);
      if (p.stroke) { c.strokeStyle = p.stroke; c.lineWidth = .8; c.lineJoin = 'round'; c.stroke(p.path); }
      if (p.hi) { c.globalAlpha = .45 * o.alpha; c.fillStyle = p.hi[3]; circ(p.hi[0], p.hi[1], p.hi[2]); c.fill(); }
      c.restore(); c.globalAlpha = o.alpha;
    } else if (p.t === 3) {
      const a = pt(o, p.x0, p.y0, p.h0), b = pt(o, p.x1, p.y1, p.h1);
      c.strokeStyle = p.col; c.lineWidth = p.w * PS; c.lineCap = 'round'; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    } else if (p.t === 4) { // شیشهٔ پنجره
      const A = [o.x + p.a[0], o.y + p.a[1]], B = [o.x + p.b[0], o.y + p.b[1]];
      const a0 = pt(o, A[0], A[1], p.h0), b0 = pt(o, B[0], B[1], p.h0), b1 = pt(o, B[0], B[1], p.h1), a1 = pt(o, A[0], A[1], p.h1);
      c.fillStyle = 'rgba(160,210,230,.38)'; c.strokeStyle = 'rgba(215,240,250,.8)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(a0[0], a0[1]); c.lineTo(b0[0], b0[1]); c.lineTo(b1[0], b1[1]); c.lineTo(a1[0], a1[1]); c.closePath(); c.fill(); c.stroke();
    }
  }
  // ردّ گلوله بسته به جنس
  function drawMark(mk) {
    if ((mk.nx || mk.ny) && mk.nx * (camX - mk.x) + mk.ny * (camY - mk.y) <= 0) return; // روی وجهِ پشت به دوربین
    const p = pt(null, mk.x, mk.y, mk.h), s = PS, x = p[0], y = p[1], k = mk.k;
    if (k === 'wood') { c.fillStyle = 'rgba(24,13,5,.5)'; circ(x, y, 3.3 * s); c.fill(); c.fillStyle = '#0e0703'; circ(x, y, 1.4 * s); c.fill(); }
    else if (k === 'metal') { c.fillStyle = 'rgba(236,230,214,.9)'; circ(x, y, 1.9 * s); c.fill(); c.fillStyle = '#26221e'; circ(x, y, .9 * s); c.fill(); }
    else if (k === 'plastic') { c.fillStyle = 'rgba(255,255,255,.4)'; circ(x, y, 2.5 * s); c.fill(); c.fillStyle = '#080c11'; circ(x, y, 1.6 * s); c.fill(); }
    else if (k === 'concrete') { c.fillStyle = 'rgba(228,223,208,.75)'; circ(x, y, 3 * s); c.fill(); c.fillStyle = '#2b2824'; circ(x, y, 1.7 * s); c.fill(); c.fillStyle = '#c9963a'; circ(x, y, .85 * s); c.fill(); } // گلولهٔ گیرکرده
    else if (k === 'stone') { c.fillStyle = 'rgba(215,212,200,.8)'; circ(x, y, 2.4 * s); c.fill(); c.fillStyle = '#4a4842'; circ(x, y, .9 * s); c.fill(); }
    else if (k === 'sand') { c.fillStyle = '#5d5133'; circ(x, y, 1.7 * s); c.fill(); }
    else { c.fillStyle = '#000'; circ(x, y, 1.4 * s); c.fill(); }
  }
  P3.mark = drawMark;

  let vis = [], visT = -1;
  function visible(x0, y0, x1, y1) {
    vis.length = 0; const M = 110;
    for (const o of G.map.objs) if (o.x > x0 - M && o.x < x1 + M && o.y > y0 - M && o.y < y1 + M) vis.push(o);
    for (const o of G.fallers) vis.push(o);
  }
  G.drawObjShadows = function (ctx, x0, y0, x1, y1) {
    c = ctx; visible(x0, y0, x1, y1);
    c.fillStyle = `rgba(0,0,0,${CFG.shadowOpacity})`;
    for (const o of vis) { if (o.fall || o.type === 'junk') continue; if (!o.shadow) o.shadow = shadowOf(o); c.fill(o.shadow); }
  };
  // tall=false: اشیای کوتاه (پیش از دیوارها) | tall=true: درخت‌ها (روی همه‌چیز)
  G.drawObjs = function (ctx, tall) {
    c = ctx;
    for (const o of vis) {
      if (o.tall !== tall) continue;
      if (tall && o.cr) { // شاخ‌وبرگ بالای سر نیروها نیمه‌شفاف می‌شود تا دیده شوند
        let under = false; const R = o.cr * .85;
        for (const s of G.soldiers) if (!s.dead && Math.abs(s.x - o.x) < R && Math.abs(s.y - o.y) < R) { under = true; break; }
        if (!under) for (const z of G.zActive) if (!z.dead && Math.abs(z.x - o.x) < R && Math.abs(z.y - o.y) < R) { under = true; break; }
        o.alpha += ((under ? .4 : 1) - o.alpha) * .15;
      }
      if (o.fall) o.alpha = Math.min(1, 2.2 * (1 - o.fall.k));
      c.globalAlpha = o.alpha;
      const al = o.alpha;
      for (const p of o.parts) { o.alpha = p.t === 2 || o.fall ? al : 1; c.globalAlpha = o.alpha; drawPart(o, p); }
      o.alpha = al; c.globalAlpha = 1;
      if (o.marks) for (const mk of o.marks) drawMark(mk);
      if (o.crack) drawCracks(o);
      if (o.fuse > 0) { const t = pt(o, o.x, o.y, o.h), f = 5 + Math.sin(G.time * 30 + o.x) * 2; c.globalAlpha = .85; c.fillStyle = '#ff7a1e'; circ(t[0], t[1], f); c.fill(); c.fillStyle = '#ffe08a'; circ(t[0], t[1], f * .5); c.fill(); c.globalAlpha = 1; }
    }
  };
  function drawCracks(o) {
    const r = rng(o.seed), t = pt(o, o.x, o.y, o.h), s = PS, R = o.hb ? Math.min(o.hb[0], o.hb[1]) : o.hr;
    c.strokeStyle = 'rgba(25,22,20,.7)'; c.lineWidth = 1.1 * s; c.lineCap = 'round'; c.beginPath();
    for (let i = 0; i < 3; i++) { let x = t[0] + (r() - .5) * (o.hb ? o.hb[0] * 1.4 : R), y = t[1] + (r() - .5) * (o.hb ? o.hb[1] * 1.4 : R), a = r() * TAU; c.moveTo(x, y); for (let k = 0; k < 3; k++) { a += (r() - .5) * 1.6; x += Math.cos(a) * R * .45 * s; y += Math.sin(a) * R * .45 * s; c.lineTo(x, y); } }
    c.stroke();
  }

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

  function addMark(list, x, y, h, nx, ny, k, cap) { if (list.length >= cap) list.shift(); list.push({ x, y, h, nx, ny, k }); }
  function activate(o) { if (!o.act) { o.act = true; G.objAct.push(o); } }
  function wobble(o, a, amt) { activate(o); o.wob = Math.min(o.tall ? 5 : 2.6, (o.wob || 0) + amt); o.wa = a; }
  const SND = { metal: 'ping', wood: 'thud', plastic: 'pop', concrete: 'chip', stone: 'chip', sand: 'thud', rubber: 'thud', glass: 'glass' };

  // برخورد گلوله با شیء. خروجی: ضریب ادامهٔ مسیر (۰ = گلوله ایستاد)
  G.hitObj = function (o, px, py, dx, dy, dmg, d, ex, ey) {
    const fx = G.fx, back = Math.atan2(-dy, -dx), ang = Math.atan2(dy, dx), mat = o.mat, cd = Math.hypot(px - G.cmd.x, py - G.cmd.y);
    if (mat === 'glass') { // پنجره: شیشه می‌شکند و گلوله رد می‌شود
      if (!o.broken) { o.broken = true; build(o); fx.glass(o.x, o.y, ang); G.audio.play('glass', cd); }
      return 1;
    }
    const marks = o.marks || (o.marks = []), hh = o.h * (o.tall ? .12 + Math.random() * .2 : .3 + Math.random() * .55);
    addMark(marks, px, py, hh, -dx, -dy, mat, 16);
    if (!o.tall) addMark(marks, px + dx * 4, py + dy * 4, o.h, 0, 0, mat, 16); // سوراخ روی رویهٔ بالا تا از بالا هم دیده شود
    wobble(o, ang, Math.min(1.2, dmg * .03));
    G.audio.play(SND[mat], cd);
    let pass = 0;
    if (mat === 'metal') { fx.sparks(px, py, back, 5 + (Math.random() * 4 | 0)); }
    else if (mat === 'wood') {
      fx.chips(px, py, back, '#8a6236', 3); if (Math.random() < .5) fx.smoke(px, py);
      if (!o.tall && d && (d.pierce || 1) >= 2) { pass = .55; if (ex != null) { addMark(marks, ex, ey, hh, dx, dy, mat, 16); fx.chips(ex, ey, ang, '#8a6236', 4); } }
    } else if (mat === 'plastic') { // سوراخ می‌شود و گلوله رد می‌شود؛ مایع از سوراخ بیرون می‌زند
      pass = .8; fx.chips(px, py, back, '#5d8fb3', 2);
      if (ex != null) { addMark(marks, ex, ey, hh, dx, dy, mat, 16); addMark(marks, ex - dx * 4, ey - dy * 4, o.h, 0, 0, mat, 16); fx.chips(ex, ey, ang, '#8fc4e8', 4); }
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
    const H = b === 4 ? 34 : b === 5 ? 26 : 24, tx = (ti % m.w) * T, ty = ((ti / m.w) | 0) * T;
    const dl = px - tx, dr = tx + T - px, du = py - ty, dd = ty + T - py, mn = Math.min(dl, dr, du, dd);
    const nx = mn === dl ? -1 : mn === dr ? 1 : 0, ny = nx ? 0 : mn === du ? -1 : 1;
    let list = m.marks.get(ti); if (!list) { if (m.marks.size > 420) m.marks.delete(m.marks.keys().next().value); m.marks.set(ti, list = []); }
    addMark(list, px, py, H * (.3 + Math.random() * .6), nx, ny, 'concrete', 6);
    addMark(list, G.clamp(px + dx * 4, tx + 2, tx + T - 2), G.clamp(py + dy * 4, ty + 2, ty + T - 2), H, 0, 0, 'concrete', 6);
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
    for (const i of o.tiles) G.clearTile(i);
    const cd = Math.hypot(x - G.cmd.x, y - G.cmd.y);
    switch (o.type) {
      case 'crate': fx.debris(x, y, 'plank', 9, ang); fx.puff(x, y, '#a58a62', 3); fx.remain('splinters', x, y, o.seed % 6, 1); G.audio.play('crack', cd); break;
      case 'barrel':
        if (o.fuel) { fx.debris(x, y, 'metal', 6, ang, '#8a2c22'); fx.remain('barrel', x + Math.cos(ang) * 18, y + Math.sin(ang) * 18, ang, 1, '#3a2019'); G.explode(x, y, 92, 190, null); }
        else if (o.mat === 'plastic') { fx.debris(x, y, 'plastic', 8, ang); fx.remain('puddle', x, y, o.seed % 6, 1.6); G.audio.play('pop', cd); }
        else { fx.debris(x, y, 'metal', 4, ang, BARREL[o.color].side); fx.sparks(x, y, ang, 8); fx.remain('barrel', x + Math.cos(ang) * 12, y + Math.sin(ang) * 12, ang, 1, BARREL[o.color].side); G.audio.play('clang', cd); }
        break;
      case 'tires': fx.debris(x, y, 'tire', 3, ang); fx.puff(x, y, '#3a3a3a', 3); G.audio.play('thud', cd); break;
      case 'sandbag': fx.puff(x, y, '#c2ad78', 7); fx.debris(x, y, 'sack', 3, ang); fx.remain('sand', x, y, o.seed % 6, 1); G.audio.play('thud', cd);
        for (const q of m.objs) if (q.type === 'sandbag' && q.next === o) build(q); break;
      case 'barrier': for (let i = -1; i <= 1; i++) { const qx = x + (o.hor ? i * T : 0), qy = y + (o.hor ? 0 : i * T); fx.debris(qx, qy, 'concrete', 6, ang); fx.puff(qx, qy, '#a39c8e', 4); fx.remain('rubble', qx, qy, (o.seed + i) % 6, 1); } G.audio.play('crumble', cd); break;
      case 'rubble': case 'window': fx.debris(x, y, 'concrete', 6, ang); fx.puff(x, y, '#a39c8e', 4); fx.remain('rubble', x, y, o.seed % 6, .8); G.audio.play('crumble', cd); break;
      case 'rock': fx.debris(x, y, 'stone', 9, ang); fx.puff(x, y, '#9c9a90', 5); fx.remain('gravel', x, y, o.seed % 6, 1); G.audio.play('crumble', cd); break;
      case 'car': { const q = m.cars.indexOf(o.car); if (q >= 0) m.cars.splice(q, 1); fx.boom(x, y, 50); fx.debris(x, y, 'metal', 9, ang, o.car.burnt ? '#2a2725' : o.car.c); fx.remain('carwreck', x, y, o.rot, 1); G.audio.play('boom', cd); break; }
      case 'tree': case 'pine': case 'dead': // تنه می‌شکند و درخت در جهت ضربه می‌افتد
        o.fall = { k: 0, e: 0, dx: Math.cos(ang), dy: Math.sin(ang) }; o.wob = 0; G.fallers.push(o);
        fx.chips(x, y, ang, '#8a6236', 8); fx.remain('stump', x, y, o.seed % 6, o.hr / 6); G.audio.play('crack', cd);
        if (o.cr) fx.leaves(x, y, o.cr * .6, o.parts[2].fill, 10);
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
        G.fx.remain('log', o.x, o.y, Math.atan2(f.dy, f.dx), len / 60, o.parts[0].side);
        if (o.cr) { G.fx.leaves(ex, ey, o.cr, o.parts[2].fill, 16); G.fx.remain('leaves', o.x + f.dx * len * .75, o.y + f.dy * len * .75, o.seed % 6, o.cr / 40, o.parts[2].fill); }
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
