'use strict';
/* نقشه: تولید مناطق، دیوارها، ساختمان‌ها + مسیر‌یابی و خط دید */
(function () {
  const T = G.T;
  // انواع بلوک: 0 خالی | 1 دیوار ساختمان | 2 مانع کوتاه | 3 درخت | 4 دیوار قرنطینه | 5 مرز | 6 بلور ماده سیاه | 7 هسته
  const SOLID = [0, 1, 0, 0, 1, 1, 1, 1];
  G.SOLID = SOLID;

  const CFG = {
    zones: { W: 190, H: 140, cx: 95, cy: 70, rx: 88, ry: 64, LZ: { x: 16, y: 122 }, EX: { x: 174, y: 16 }, lzR: 17, nb: 130, cars: 260 },
    crash: { W: 140, H: 104, cx: 80, cy: 46, rx: 62, ry: 42, LZ: { x: 14, y: 90 }, EX: null, lzR: 12, nb: 80, cars: 150, vx: [24, 50, 80, 108, 128], hy: [14, 46, 90], crash: 1 },
  };
  G.genMap = function (seed, kind) {
    const cfg = CFG[kind] || CFG.zones;
    for (let a = 0; a < 40; a++) { const m = build(seed + a * 7919, cfg); if (m) return m; }
    throw new Error('map generation failed');
  };

  function build(seed, cfg) {
    const R = G.rng(seed), W = cfg.W, H = cfg.H, N = W * H;
    const m = {
      seed, w: W, h: H, pw: W * T, ph: H * T,
      block: new Uint8Array(N), dyn: new Uint8Array(N), ground: new Uint8Array(N), zone: new Uint8Array(N),
      vr: new Uint8Array(N), sub: new Uint8Array(N), keep: new Uint8Array(N), reach: new Uint8Array(N),
      flow: new Uint16Array(N), danger: new Uint8Array(N), buildings: [], gates: [], cars: [], craters: [], sites: {},
    };
    const I = (x, y) => y * W + x;
    const cx = cfg.cx, cy = cfg.cy;
    const ell = (x, y) => Math.hypot((x - cx) / cfg.rx, (y - cy) / cfg.ry);
    const LZ = cfg.LZ, EX = cfg.EX || cfg.LZ;
    m.cx = cx; m.cy = cy; m.coreTiles = [[cx - 1, cy - 1], [cx, cy - 1], [cx - 1, cy], [cx, cy]];
    const RED = .70, BLK = .36;

    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = ell(x, y), i = I(x, y);
      let z = d < BLK ? 3 : d < RED ? 2 : 1;
      const wob = 1.5 * Math.sin(x * .55) + 1.5 * Math.cos(y * .45);
      if (Math.hypot(x - LZ.x, y - LZ.y) < cfg.lzR + wob) z = 0;
      if (cfg.EX && Math.hypot(x - EX.x, y - EX.y) < 16 + wob) z = 4;
      m.zone[i] = z; m.vr[i] = R.int(0, 255);
      if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) m.block[i] = 5;
    }

    // جاده‌ها
    const vx = cfg.vx || [26 + R.int(-2, 2), 58, cx, 132, 164 + R.int(-2, 2)], hy = cfg.hy || [18 + R.int(-2, 1), cy, 122 + R.int(-1, 2)];
    m.roadsV = vx; m.roadsH = hy;
    vx.forEach(x => { for (let y = 2; y < H - 2; y++) for (let o = -1; o <= 1; o++) { const i = I(x + o, y); m.ground[i] = 1; if (!o) { m.keep[i] = 1; m.sub[i] = 1; } } });
    hy.forEach(y => { for (let x = 2; x < W - 2; x++) for (let o = -1; o <= 1; o++) { const i = I(x, y + o); m.ground[i] = 1; if (!o) { m.keep[i] = 1; if (!m.sub[i]) m.sub[i] = 2; else m.sub[i] = 0; } } });

    // دیوارهای قرنطینه دور مناطق قرمز و مشکی؛ هر جا جاده رد شود دروازه است
    const gateTiles = [];
    for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
      const d = ell(x, y); let ring = 0;
      for (const th of [RED, BLK]) {
        if (d < th) { let out = false; for (let dy = -1; dy <= 1 && !out; dy++) for (let dx = -1; dx <= 1; dx++) if (ell(x + dx, y + dy) >= th) { out = true; break; } if (out) ring = th === RED ? 1 : 2; }
      }
      if (!ring) continue;
      const i = I(x, y);
      if (m.ground[i] === 1) gateTiles.push({ x, y, ring }); else m.block[i] = 4;
    }
    gateTiles.forEach(g => {
      let gt = m.gates.find(q => q.ring === g.ring && Math.hypot(q.cx - g.x, q.cy - g.y) < 6);
      if (!gt) { gt = { ring: g.ring, tiles: [], cx: g.x, cy: g.y, sloth: false }; m.gates.push(gt); }
      gt.tiles.push(g); gt.cx = gt.tiles.reduce((s, t) => s + t.x, 0) / gt.tiles.length; gt.cy = gt.tiles.reduce((s, t) => s + t.y, 0) / gt.tiles.length;
    });
    const keepR = (px, py, r) => { for (let y = Math.max(2, py - r); y <= Math.min(H - 3, py + r); y++) for (let x = Math.max(2, px - r); x <= Math.min(W - 3, px + r); x++) if (Math.hypot(x - px, y - py) <= r) m.keep[I(x, y)] = 1; };
    m.gates.forEach(g => keepR(Math.round(g.cx), Math.round(g.cy), 4));
    keepR(LZ.x, LZ.y, 7); keepR(EX.x, EX.y, 7); keepR(cx, cy, 6);
    for (const s of [LZ, EX]) for (let y = s.y - 3; y <= s.y + 3; y++) for (let x = s.x - 3; x <= s.x + 3; x++) if (Math.hypot(x - s.x, y - s.y) <= 3.2) m.ground[I(x, y)] = 5;

    // ساختمان‌ها
    const bmask = new Uint8Array(N);
    for (let a = 0; a < 6000 && m.buildings.length < cfg.nb; a++) {
      const w = R.int(6, 13), h = R.int(5, 10), x = R.int(4, W - w - 4), y = R.int(4, H - h - 4);
      let ok = true;
      for (let yy = y - 2; yy < y + h + 2 && ok; yy++) for (let xx = x - 2; xx < x + w + 2; xx++) { const i = I(xx, yy); if (m.block[i] || m.ground[i] === 1 || m.ground[i] === 5 || m.keep[i] || bmask[i]) { ok = false; break; } }
      if (!ok) continue;
      const zc = m.zone[I(x + (w >> 1), y + (h >> 1))];
      for (let yy = y - 1; yy < y + h + 1; yy++) for (let xx = x - 1; xx < x + w + 1; xx++) {
        const i = I(xx, yy); bmask[i] = 1;
        const inside = xx >= x && xx < x + w && yy >= y && yy < y + h;
        if (!inside) { m.ground[i] = 2; continue; }
        m.ground[i] = 3;
        if (xx === x || xx === x + w - 1 || yy === y || yy === y + h - 1) m.block[i] = 1;
      }
      const doors = [];
      const sides = R.shuffle([0, 1, 2, 3]); const nd = 1 + (R.chance(.7) ? 1 : 0) + (w + h > 18 ? 1 : 0);
      for (let k = 0; k < nd; k++) {
        const s = sides[k]; let dx0, dy0, hor;
        if (s === 0) { dx0 = R.int(x + 1, x + w - 3); dy0 = y; hor = true; }
        else if (s === 1) { dx0 = R.int(x + 1, x + w - 3); dy0 = y + h - 1; hor = true; }
        else if (s === 2) { dx0 = x; dy0 = R.int(y + 1, y + h - 3); hor = false; }
        else { dx0 = x + w - 1; dy0 = R.int(y + 1, y + h - 3); hor = false; }
        for (let q = 0; q < 2; q++) {
          const tx = dx0 + (hor ? q : 0), ty = dy0 + (hor ? 0 : q); m.block[I(tx, ty)] = 0; doors.push({ x: tx, y: ty });
          for (let ddy = -1; ddy <= 1; ddy++) for (let ddx = -1; ddx <= 1; ddx++) m.keep[I(tx + ddx, ty + ddy)] = 1;
        }
      }
      // تیغهٔ داخلی
      if (w >= 10) {
        const px = x + R.int(4, w - 5);
        if (!doors.some(d => Math.abs(d.x - px) <= 1 && (d.y === y || d.y === y + h - 1))) {
          const gy = R.int(y + 1, y + h - 3);
          for (let yy = y + 1; yy < y + h - 1; yy++) if (yy !== gy && yy !== gy + 1) m.block[I(px, yy)] = 1; else m.keep[I(px, yy)] = 1;
        }
      }
      // پنجره و خرابی
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
        const edge = xx === x || xx === x + w - 1 || yy === y || yy === y + h - 1; if (!edge) continue;
        const corner = (xx === x || xx === x + w - 1) && (yy === y || yy === y + h - 1); const i = I(xx, yy);
        if (corner || m.block[i] !== 1) continue;
        if (R.chance(.15)) { m.block[i] = 2; m.sub[i] = 3; }
        else if (zc >= 2 && R.chance(.09)) { m.block[i] = 0; }
      }
      m.buildings.push({ x, y, w, h, zone: zc });
    }

    // گودال‌های بمباران و ردّ سقوط
    if (cfg.crash) {
      for (let a = 0; a < 600 && m.craters.length < 18; a++) {
        const x = R.int(8, W - 9), y = R.int(8, H - 9), r = R.int(2, 4), z = m.zone[I(x, y)];
        if (z < 1 || z > 2 || m.craters.some(k => Math.hypot(k.x - x, k.y - y) < 10)) continue;
        m.craters.push({ x, y, r });
        for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) {
          const i = I(xx, yy); if (Math.hypot(xx - x, yy - y) > r + .5 || m.block[i] !== 1) continue;
          if (R.chance(.5)) m.block[i] = 0; else { m.block[i] = 2; m.sub[i] = 4; }
        }
      }
      for (let k = 2; k < 8; k++) m.craters.push({ x: cx + k * 2.6, y: cy - k * 1.7, r: 1.6 - k * .12 });
      for (let yy = cy + 1; yy <= cy + 2; yy++) for (let xx = cx + 2; xx <= cx + 4; xx++) { m.block[I(xx, yy)] = 2; m.sub[I(xx, yy)] = 1; }
    }

    // خودروها روی لبهٔ جاده
    for (let a = 0; a < cfg.cars; a++) {
      const vert = R.chance(.5); const lane = R.chance(.5) ? 1 : -1; let x, y, w, h;
      if (vert) { x = R.pick(vx) + lane; y = R.int(4, H - 7); w = 1; h = 2; } else { y = R.pick(hy) + lane; x = R.int(4, W - 7); w = 2; h = 1; }
      let ok = true;
      for (let yy = y; yy < y + h && ok; yy++) for (let xx = x; xx < x + w; xx++) { const i = I(xx, yy); if (m.block[i] || m.keep[i] || m.ground[i] !== 1) { ok = false; break; } }
      if (ok && m.cars.some(k => Math.abs(k.x - x) < 4 && Math.abs(k.y - y) < 4)) ok = false;
      if (!ok) continue;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { m.block[I(xx, yy)] = 2; m.sub[I(xx, yy)] = 1; }
      m.cars.push({ x, y, w, h, c: R.pick(['#7a2e2e', '#2e4f7a', '#6b6b6b', '#8a7a3a', '#2f5d43', '#3a3a44']), burnt: m.zone[I(x, y)] >= 2 });
    }
    // سنگر، جعبه، درخت، بلور
    for (let a = 0; a < 120; a++) {
      const x = R.int(4, W - 8), y = R.int(4, H - 8), hor = R.chance(.5), len = R.int(2, 4);
      for (let k = 0; k < len; k++) { const i = I(x + (hor ? k : 0), y + (hor ? 0 : k)); if (!m.block[i] && !m.keep[i] && m.ground[i] !== 3 && m.ground[i] !== 1) { m.block[i] = 2; m.sub[i] = 2; } }
    }
    for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
      const i = I(x, y); if (m.block[i] || m.keep[i]) continue; const z = m.zone[i], g = m.ground[i];
      if (g === 2 && R.chance(.05)) { m.block[i] = 2; m.sub[i] = 0; }
      else if (g === 3 && R.chance(.03)) { m.block[i] = 2; m.sub[i] = 0; }
      else if (g === 0) {
        const p = z === 0 ? .04 : z === 1 ? .035 : z === 2 ? .012 : z === 4 ? .012 : 0;
        if (R.chance(p)) m.block[i] = 3; else if (z === 3 && R.chance(.022)) m.block[i] = 6;
      }
    }
    // هسته
    for (const [x, y] of m.coreTiles) m.block[I(x, y)] = 7;

    // دسترسی از نقطهٔ پیاده‌سازی
    const q = new Int32Array(N); let qh = 0, qt = 0; const s0 = I(LZ.x, LZ.y);
    if (m.block[s0]) return null;
    m.reach[s0] = 1; q[qt++] = s0;
    while (qh < qt) {
      const c = q[qh++], x = c % W, y = (c / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const n = I(nx, ny); if (m.reach[n] || m.block[n]) continue; m.reach[n] = 1; q[qt++] = n; }
    }
    if (!m.reach[I(EX.x, EX.y)] || !m.reach[I(cx - 3, cy)] || m.gates.some(g => !g.tiles.some(t => m.reach[I(t.x, t.y)]))) return null;
    if (m.gates.filter(g => g.ring === 2).length < 3 || m.gates.filter(g => g.ring === 1).length < 5) return null;

    const px = t => t * T + T / 2;
    const interior = b => { for (let k = 0; k < 40; k++) { const x = R.int(b.x + 1, b.x + b.w - 2), y = R.int(b.y + 1, b.y + b.h - 2), i = I(x, y); if (!m.block[i] && m.reach[i] && !m.keep[i]) return { x: px(x), y: px(y) }; } return null; };
    const openSpot = (zone, minLZ) => { for (let k = 0; k < 4000; k++) { const x = R.int(4, W - 5), y = R.int(4, H - 5), i = I(x, y); if (m.zone[i] === zone && !m.block[i] && m.reach[i] && Math.hypot(x - LZ.x, y - LZ.y) >= (minLZ || 0)) return { x: px(x), y: px(y) }; } return null; };
    const inBuilding = (zone, minLZ, maxLZ) => { const bs = R.shuffle(m.buildings.filter(b => b.zone === zone && Math.hypot(b.x - LZ.x, b.y - LZ.y) >= (minLZ || 0) && Math.hypot(b.x - LZ.x, b.y - LZ.y) <= (maxLZ || 999) && !b.used)); for (const b of bs) { const p = interior(b); if (p) { b.used = true; return p; } } return openSpot(zone, minLZ); };
    const S = m.sites;
    S.lz = { x: px(LZ.x), y: px(LZ.y) }; S.ex = { x: px(EX.x), y: px(EX.y) }; S.core = { x: cx * T, y: cy * T };
    S.samples = (cfg.crash ? [inBuilding(2, 0, 999)] : [inBuilding(1, 38, 80), inBuilding(2, 0, 95)]).filter(Boolean).map((p, i) => ({ x: p.x, y: p.y, taken: false, zone: i + 1 }));
    S.crates = [{ x: px(LZ.x + 3), y: px(LZ.y - 2), uses: 99 }]; if (cfg.EX) S.crates.push({ x: px(EX.x - 3), y: px(EX.y + 2), uses: 99 });
    S.wreck = { x: (cx + 3.5) * T, y: (cy + 2.2) * T };
    [1, 1, 1, 2, 2, 3].forEach(z => { const p = inBuilding(z, 30); if (p) S.crates.push({ x: p.x, y: p.y, uses: 2 }); });
    if (S.samples.length < (cfg.crash ? 1 : 2)) return null;
    m.LZ = LZ; m.EX = EX;
    placeObjects(m, seed);
    return m;
  }

  /* ---------- اشیای محیط: هر خانهٔ مانع یک شیء واقعی (درخت، بشکه، جعبه، سنگر...) می‌شود ---------- */
  function placeObjects(m, seed) {
    const R = G.rng(seed ^ 0x2f6e2b1), W = m.w, H = m.h, N = W * H, I = (x, y) => y * W + x;
    m.objs = []; m.obj = new Array(N).fill(null); m.remains = []; m.marks = new Map();
    const cxy = i => ({ x: (i % W) * T + T / 2, y: ((i / W) | 0) * T + T / 2 });
    const add = (type, tiles, o) => {
      let x = 0, y = 0; for (const i of tiles) { const p = cxy(i); x += p.x; y += p.y; }
      const ob = Object.assign({ type, tiles, x: x / tiles.length, y: y / tiles.length, rot: 0, seed: R.int(1, 99999), zone: m.zone[tiles[0]] }, o || {});
      for (const i of tiles) m.obj[i] = ob; m.objs.push(ob); return ob;
    };
    // تخته‌سنگ‌ها و بشکه‌های پراکنده روی زمین باز (فقط جایی که هر هشت همسایه آزاد است تا مسیری بسته نشود)
    const free8 = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const i = I(x + dx, y + dy); if (m.block[i] || m.keep[i] || m.dyn[i]) return false; } return true; };
    // کنار دیوار: فقط دیوار در همسایگی باشد و دست‌کم پنج همسایه آزاد بماند (اشیا به هم نمی‌چسبند تا راهی بسته نشود)
    const byWall = (x, y) => { let fr = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const j = I(x + dx, y + dy), b = m.block[j]; if (!b && !m.dyn[j]) fr++; else if (b !== 1) return false; } return fr >= 5; };
    const core = m.sites.core, far = (x, y) => Math.hypot(x * T - core.x, y * T - core.y) > 9 * T && Math.hypot(x - m.LZ.x, y - m.LZ.y) > 6;
    for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) {
      const i = I(x, y), g = m.ground[i]; if (m.block[i] || !far(x, y)) continue;
      if (g === 0 && m.zone[i] <= 2 && R.chance(.006) && free8(x, y)) { m.block[i] = 2; m.sub[i] = 5; }
      else if (g === 2 && R.chance(.09) && !m.keep[i] && byWall(x, y) || g === 1 && m.zone[i] >= 1 && R.chance(.004) && free8(x, y)) { m.block[i] = 2; m.sub[i] = 6; }
    }
    const used = new Uint8Array(N);
    for (const c of m.cars) { const ts = []; for (let yy = c.y; yy < c.y + c.h; yy++) for (let xx = c.x; xx < c.x + c.w; xx++) { ts.push(I(xx, yy)); used[I(xx, yy)] = 1; } add('car', ts, { car: c, vert: c.h > c.w }); }
    const BC = ['red', 'red', 'rust', 'olive', 'blue', 'blue'];
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      const i = I(x, y), b = m.block[i]; if (used[i]) continue;
      const jit = () => R.range(-2.5, 2.5);
      if (b === 3) {
        const z = m.zone[i], o = add(z >= 2 && z !== 4 ? 'dead' : R.chance(.42) ? 'pine' : 'tree', [i], { rot: R.range(0, 6.28), size: R.range(.62, .86) });
        o.x += jit(); o.y += jit();
      } else if (b === 2) {
        const s = m.sub[i];
        if (s === 1) add('junk', [i]);
        else if (s === 3) add('window', [i], { horiz: m.block[I(x - 1, y)] === 1 || m.block[I(x + 1, y)] === 1 || m.block[I(x - 1, y)] === 2 || m.block[I(x + 1, y)] === 2 });
        else if (s === 4) add('rubble', [i], { rot: R.range(0, 6.28) });
        else if (s === 5) add('rock', [i], { rot: R.range(0, 6.28) });
        else if (s === 6) { const k = R(), o = k < .55 ? add('barrel', [i], { color: R.pick(BC), rot: R.range(0, 6.28) }) : k < .8 ? add('crate', [i], { rot: R.range(-.4, .4) }) : add('tires', [i]); if (o.type !== 'crate') { o.x += jit(); o.y += jit(); } }
        else if (s === 0) {
          const k = R(), g = m.ground[i];
          const o = k < .42 ? add('crate', [i], { rot: R.range(-.25, .25) }) : k < .8 ? add('barrel', [i], { color: R.pick(BC), rot: R.range(0, 6.28) }) : g === 3 ? add('crate', [i], { rot: R.range(-.25, .25) }) : add('tires', [i]);
          if (o.type !== 'crate') { o.x += jit(); o.y += jit(); }
        } else if (s === 2) {
          // ردیف سنگر: طول ردیف را پیدا کن
          const hor = m.block[I(x + 1, y)] === 2 && m.sub[I(x + 1, y)] === 2 && !used[I(x + 1, y)];
          const run = [i]; used[i] = 1;
          for (let k = 1; k < 4; k++) { const j = hor ? I(x + k, y) : I(x, y + k); if (m.block[j] === 2 && m.sub[j] === 2 && !used[j]) { run.push(j); used[j] = 1; } else break; }
          if (run.length === 3 && R.chance(.5)) add('barrier', run, { rot: hor ? 0 : Math.PI / 2, hor });
          else if (run.length === 1) add(m.ground[i] === 0 ? 'rock' : 'tires', [i], { rot: R.range(0, 6.28) });
          else { let prev = null; run.forEach(j => { const o = add('sandbag', [j], { rot: hor ? 0 : Math.PI / 2, hor }); if (prev) prev.next = o; prev = o; }); }
        }
      }
    }
    G.initObjs && G.initObjs(m);
  }

  /* ---------- پرس‌وجوهای شبکه ---------- */
  G.tileAt = (x, y) => { const m = G.map, tx = Math.floor(x / T), ty = Math.floor(y / T); return (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) ? -1 : ty * m.w + tx; };
  G.walkT = (tx, ty) => { const m = G.map; if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return false; const i = ty * m.w + tx; return m.block[i] === 0 && m.dyn[i] === 0; };
  G.zoneAt = (x, y) => { const i = G.tileAt(x, y); return i < 0 ? 1 : G.map.zone[i]; };
  G.boxBlocked = function (x, y, r) {
    const x0 = Math.floor((x - r) / T), x1 = Math.floor((x + r) / T), y0 = Math.floor((y - r) / T), y1 = Math.floor((y + r) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (!G.walkT(tx, ty)) return true;
    return false;
  };
  G.moveEnt = function (e, dx, dy) {
    const r = e.cr || e.r;
    if (G.boxBlocked(e.x, e.y, r)) { // گیر افتاده: به نزدیک‌ترین خانهٔ آزاد هل بده
      const f = G.nearestFree(Math.floor(e.x / T), Math.floor(e.y / T), 4);
      if (f) { const tx = f.x * T + T / 2, ty = f.y * T + T / 2, d = Math.hypot(tx - e.x, ty - e.y) || 1; e.x += (tx - e.x) / d * 3; e.y += (ty - e.y) / d * 3; }
      return;
    }
    if (dx) { if (!G.boxBlocked(e.x + dx, e.y, r)) e.x += dx; else e.hitWall = true; }
    if (dy) { if (!G.boxBlocked(e.x, e.y + dy, r)) e.y += dy; else e.hitWall = true; }
  };
  G.nearestFree = function (tx, ty, maxR) {
    if (G.walkT(tx, ty)) return { x: tx, y: ty };
    for (let r = 1; r <= (maxR || 6); r++) {
      let best = null, bd = 1e9;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (G.walkT(tx + dx, ty + dy)) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = { x: tx + dx, y: ty + dy }; } }
      }
      if (best) return best;
    }
    return null;
  };
  // پرتو روی شبکه؛ فاصله تا اولین مانع بلند
  G.rayCast = function (x0, y0, dx, dy, maxD, ignoreDyn) {
    const m = G.map, W = m.w; let tx = Math.floor(x0 / T), ty = Math.floor(y0 / T);
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    const tdx = adx > 1e-9 ? T / adx : 1e18, tdy = ady > 1e-9 ? T / ady : 1e18;
    let tmx = adx > 1e-9 ? (dx > 0 ? (tx + 1) * T - x0 : x0 - tx * T) / adx : 1e18;
    let tmy = ady > 1e-9 ? (dy > 0 ? (ty + 1) * T - y0 : y0 - ty * T) / ady : 1e18;
    let d = 0;
    for (;;) {
      if (tmx < tmy) { d = tmx; tmx += tdx; tx += sx; } else { d = tmy; tmy += tdy; ty += sy; }
      if (d >= maxD) return maxD;
      if (tx < 0 || ty < 0 || tx >= W || ty >= m.h) return d;
      const i = ty * W + tx;
      if (SOLID[m.block[i]] || (!ignoreDyn && m.dyn[i])) return d;
    }
  };
  G.losClear = function (x0, y0, x1, y1, ignoreDyn) {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy); if (d < 1) return true;
    return G.rayCast(x0, y0, dx / d, dy / d, d, ignoreDyn) >= d;
  };
  G.walkLine = function (x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy); if (d < 1) return true;
    const n = Math.ceil(d / 10);
    for (let i = 1; i <= n; i++) { const t = i / n; if (G.boxBlocked(x0 + dx * t, y0 + dy * t, 10)) return false; }
    return true;
  };

  /* ---------- موانع تخریب‌پذیر ---------- */
  // دیوار ساختمان، همهٔ اشیا، دیوار قرنطینه و بلورها (دو مورد آخر فقط با انفجار)
  G.destructible = i => { const b = G.map.block[i]; return b === 1 || b === 2 || b === 3 || b === 4 || b === 6; };
  G.tileMax = i => { const m = G.map, b = m.block[i], o = m.obj[i]; return o ? o.max : b === 1 ? 480 : b === 4 ? 1500 : b === 6 ? 260 : 150; };
  G.tileHp = i => { const m = G.map, o = m.obj[i]; return o ? o.max - o.hp : (m.thp ? m.thp[i] : 0); };
  G.damageTile = function (i, dmg, expl, ang) {
    const m = G.map; if (i == null || i < 0 || !G.destructible(i)) return false;
    const o = m.obj[i]; if (o) { G.damageObj(o, dmg, expl, ang); return true; }
    if (!m.thp) m.thp = new Float32Array(m.w * m.h);
    const b = m.block[i], k = expl ? 1 : b === 1 ? .2 : 0;
    m.thp[i] += dmg * k;
    if (m.thp[i] >= G.tileMax(i)) G.destroyTile(i);
    return true;
  };
  G.clearTile = function (j) { const m = G.map; m.block[j] = 0; m.sub[j] = 0; m.reach[j] = 1; m.obj[j] = null; if (m.thp) m.thp[j] = 0; m.marks.delete(j); G.minimapDirty = true; G.flowT = 0; };
  G.destroyTile = function (i) {
    const m = G.map, W = m.w, x = i % W, y = (i / W) | 0, b = m.block[i], o = m.obj[i];
    if (o) { G.killObj(o); return; }
    G.clearTile(i);
    const px = x * T + T / 2, py = y * T + T / 2;
    if (b === 6) { G.fx.debris(px, py, 'crystal', 8); G.fx.burst(px, py, '#a05cff', 10, 150, .5, 2.5); }
    else { G.fx.debris(px, py, 'concrete', 9); G.fx.puff(px, py, '#a39c8e', 6); G.fx.remain('rubble', px, py, (x * 7 + y * 13) % 6, 1); }
    G.audio.play('crumble', Math.hypot(px - G.cmd.x, py - G.cmd.y));
  };

  // خانه‌های خطرناک کنار تنبلی‌ها (برای دوری مسیرها از شلاق آن‌ها)
  G.markDanger = function () {
    const m = G.map, W = m.w, H = m.h; m.danger.fill(0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!m.dyn[y * W + x]) continue; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) m.danger[ny * W + nx] = 1; } }
  };

  /* ---------- A* ---------- */
  let gS = null, fS = null, came = null, stamp = null, cur = 0, heap = null;
  G.findPath = function (sx, sy, gx, gy) {
    const m = G.map, W = m.w, H = m.h, N = W * H;
    if (!gS || gS.length !== N) { gS = new Float32Array(N); fS = new Float32Array(N); came = new Int32Array(N); stamp = new Uint32Array(N); heap = []; }
    cur++; if (cur > 4e9) { stamp.fill(0); cur = 1; }
    let stx = Math.floor(sx / T), sty = Math.floor(sy / T), gtx = Math.floor(gx / T), gty = Math.floor(gy / T);
    if (!G.walkT(stx, sty)) { const f = G.nearestFree(stx, sty, 3); if (!f) return null; stx = f.x; sty = f.y; }
    if (!G.walkT(gtx, gty)) { const f = G.nearestFree(gtx, gty, 5); if (!f) return null; gtx = f.x; gty = f.y; }
    const start = sty * W + stx, goal = gty * W + gtx;
    const hf = (i) => { const dx = Math.abs(i % W - gtx), dy = Math.abs(((i / W) | 0) - gty); return (dx + dy) + (1.4142 - 2) * Math.min(dx, dy); };
    heap.length = 0;
    const push = (i) => { heap.push(i); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (fS[heap[p]] <= fS[heap[c]]) break; const t = heap[p]; heap[p] = heap[c]; heap[c] = t; c = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = c * 2 + 1, r = l + 1; let s = c; if (l < heap.length && fS[heap[l]] < fS[heap[s]]) s = l; if (r < heap.length && fS[heap[r]] < fS[heap[s]]) s = r; if (s === c) break; const t = heap[s]; heap[s] = heap[c]; heap[c] = t; c = s; } } return top; };
    gS[start] = 0; fS[start] = hf(start); came[start] = -1; stamp[start] = cur; push(start);
    let iter = 0;
    while (heap.length && iter++ < 45000) {
      const c = pop(); if (c === goal) break;
      const x = c % W, y = (c / W) | 0, g0 = gS[c];
      if (fS[c] - hf(c) > g0 + .001) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = x + dx, ny = y + dy;
        if (!G.walkT(nx, ny)) continue;
        if (dx && dy && (!G.walkT(x + dx, y) || !G.walkT(x, y + dy))) continue;
        const n = ny * W + nx, ng = g0 + (dx && dy ? 1.4142 : 1) + m.danger[n] * 6;
        if (stamp[n] === cur && gS[n] <= ng) continue;
        stamp[n] = cur; gS[n] = ng; fS[n] = ng + hf(n); came[n] = c; push(n);
      }
    }
    if (stamp[goal] !== cur) return null;
    const path = []; let c = goal;
    while (c !== -1 && c !== start) { path.push({ x: (c % W) * T + T / 2, y: ((c / W) | 0) * T + T / 2 }); c = came[c]; }
    path.reverse(); return path;
  };

  /* ---------- میدان جریان زامبی‌ها به‌سوی سربازان ---------- */
  let fq = null;
  G.computeFlow = function (sources) {
    const m = G.map, W = m.w, H = m.h, N = W * H, f = m.flow;
    if (!fq) fq = new Int32Array(N);
    f.fill(65535); let qh = 0, qt = 0;
    for (const s of sources) { const i = G.tileAt(s.x, s.y); if (i >= 0 && f[i] === 65535) { f[i] = 0; fq[qt++] = i; } }
    while (qh < qt) {
      const c = fq[qh++], d = f[c] + 1; if (d > 95) continue; const x = c % W;
      if (x > 0) { const n = c - 1; if (f[n] === 65535 && !m.block[n] && !m.dyn[n]) { f[n] = d; fq[qt++] = n; } }
      if (x < W - 1) { const n = c + 1; if (f[n] === 65535 && !m.block[n] && !m.dyn[n]) { f[n] = d; fq[qt++] = n; } }
      if (c >= W) { const n = c - W; if (f[n] === 65535 && !m.block[n] && !m.dyn[n]) { f[n] = d; fq[qt++] = n; } }
      if (c < N - W) { const n = c + W; if (f[n] === 65535 && !m.block[n] && !m.dyn[n]) { f[n] = d; fq[qt++] = n; } }
    }
  };
  const fo = { x: 0, y: 0 };
  G.flowDir = function (x, y) {
    const m = G.map, W = m.w, f = m.flow, tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (tx < 1 || ty < 1 || tx >= W - 1 || ty >= m.h - 1) return null;
    const c = ty * W + tx; let best = f[c], bx = 0, by = 0;
    if (best === 65535) { best = 65534; }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const v = f[c + dy * W + dx]; if (v >= best) continue;
      if (dx && dy && (f[c + dx] === 65535 || f[c + dy * W] === 65535)) continue;
      best = v; bx = dx; by = dy;
    }
    if (!bx && !by) return null;
    fo.x = (tx + bx) * T + T / 2; fo.y = (ty + by) * T + T / 2; return fo;
  };
  G.flowAt = (x, y) => { const i = G.tileAt(x, y); return i < 0 ? 65535 : G.map.flow[i]; };
})();
