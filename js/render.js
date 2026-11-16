'use strict';
/* لایهٔ دوبعدی روی صحنهٔ سه‌بعدی: نشانگرها، نوار سلامت، ردّ گلوله، چرخ فرمان، منو و نقشهٔ کوچک */
(function () {
  const T = G.T, TAU = Math.PI * 2, view = G.view;
  let c = null, cv = null;
  const ctx = () => { if (!c) { cv = G.cv2d; c = cv.getContext('2d'); } return c; };
  const ell = (x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); };
  const line = (x0, y0, x1, y1) => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
  function bar(x, y, w, frac, col) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x - w / 2 - 1, y - 1, w + 2, 5); c.fillStyle = col; c.fillRect(x - w / 2, y, w * G.clamp(frac, 0, 1), 3); }

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


  /* ---------- نشانگرهای نیروها (بدنه‌ها سه‌بعدی‌اند) ---------- */
  function unitMarks(x0, y0, x1, y1) {
    const P = G.P3, t = G.time;
    for (const u of G.soldiers) {
      if (u.dead || u.boarded) continue; const x = u.x, y = u.y;
      c.globalAlpha = .5; c.strokeStyle = u.color; c.lineWidth = u.isCmd ? 2 : 1.4; ell(x, y, u.isCmd ? 17 : 15, u.isCmd ? 17 : 15); c.stroke(); c.globalAlpha = 1;
      const h = P.pt(x, y, 34), hx = h[0], hy = h[1];
      if (u.downed) { if (!u.isCmd) { const p = .5 + .5 * Math.sin(t * 8); c.fillStyle = `rgba(255,60,60,${.5 + p * .5})`; c.fillRect(hx - 2, hy - 22, 4, 12); c.fillRect(hx - 6, hy - 18, 12, 4); bar(hx, hy - 28, 22, u.bleed / 45, '#ff5a5a'); } continue; }
      if (!u.isCmd) { bar(hx, hy - 14, 18, u.hp / u.maxHp, u.hp > u.maxHp * .5 ? '#67e08a' : u.hp > u.maxHp * .25 ? '#ffd23c' : '#ff5a5a'); if (u.medic) { c.fillStyle = '#7dffb0'; c.fillRect(hx - 1, hy - 22, 2, 6); c.fillRect(hx - 3, hy - 20, 6, 2); } }
      else { c.fillStyle = '#e8c15a'; c.beginPath(); c.moveTo(hx - 4, hy - 20); c.lineTo(hx, hy - 15); c.lineTo(hx + 4, hy - 20); c.closePath(); c.fill(); }
      const w = u.weapons[u.cur]; if (w.rel > 0 && !u.isCmd) { c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(hx + 14, hy - 13, 3.5, -1.57, -1.57 + TAU * (1 - w.rel / w.def.reload)); c.stroke(); }
      if (u.reviving) { c.strokeStyle = '#7dffb0'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 20, -1.57, -1.57 + TAU * (u.task ? u.task.t / 3 : 0)); c.stroke(); }
    }
    for (const z of G.zActive) {
      if (z.dead || z.x < x0 - 60 || z.x > x1 + 60 || z.y < y0 - 60 || z.y > y1 + 60) continue;
      const f = z.form, col = z.type === 'envy' ? '#19e68c' : G.ZT[f].color;
      if (z.lash > 0) { const L = f === 'lust' ? 58 : 52, a = P.pt(z.x, z.y, 16), b = P.pt(z.x + Math.cos(z.lashA) * L, z.y + Math.sin(z.lashA) * L, 12); c.strokeStyle = col; c.lineWidth = 3; c.lineCap = 'round'; line(a[0], a[1], b[0], b[1]); }
      if (f === 'sloth') { c.globalAlpha = .1 + .04 * Math.sin(t * 1.5 + z.x); c.strokeStyle = col; c.lineWidth = 2; ell(z.x, z.y, 46, 46); c.stroke(); c.globalAlpha = 1; }
      if (z.armor > 0 || z.hp < z.maxHp) { const h = P.pt(z.x, z.y, f === 'sloth' || f === 'lust' ? 46 : f === 'gluttony' ? 34 : 28); if (z.armor > 0) bar(h[0], h[1] - 15, 22, z.armor / z.maxArmor, '#ffd86b'); if (z.hp < z.maxHp) bar(h[0], h[1] - 10, 22, z.hp / z.maxHp, col); }
    }
    for (const p of G.props) { // هالهٔ راهنمای اشیای قابل‌استفاده
      if ((p.kind === 'crate' || (p.kind === 'drop' && p.z <= 0)) && p.uses > 0) { c.globalAlpha = .35 + .2 * Math.sin(t * 3); c.strokeStyle = '#ffe27a'; c.lineWidth = 1.5; ell(p.x, p.y, 26, 26); c.stroke(); c.globalAlpha = 1; }
      else if (p.kind === 'sample') { c.globalAlpha = .4 + .25 * Math.sin(t * 4); c.strokeStyle = '#be78ff'; c.lineWidth = 2; ell(p.x, p.y, 22, 22); c.stroke(); c.globalAlpha = 1; }
      else if (p.kind === 'core' && G.mission.fuse > 0) { const h = P.pt(p.x, p.y, 90); c.fillStyle = '#fff'; c.font = 'bold 18px Tahoma,sans-serif'; c.textAlign = 'center'; c.fillText(G.fa(Math.ceil(G.mission.fuse)), h[0], h[1]); }
    }
  }

  /* ---------- حلقهٔ اصلی رندر ---------- */
  G.render = function () {
    ctx(); G.W3.render();
    const cmd = G.cmd, z = view.zoom * view.dpr, P = G.P3;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    if (!G.W3.ok()) { c.fillStyle = '#10140e'; c.fillRect(0, 0, cv.width, cv.height); }
    c.setTransform(z, 0, 0, z, Math.round(cv.width / 2 - P.cx * z), Math.round(cv.height / 2 - P.cy * z));
    const x0 = view.x - view.w / 2, y0 = view.y - view.h / 2, x1 = view.x + view.w / 2, y1 = view.y + view.h / 2;
    groundMarks(); unitMarks(x0, y0, x1, y1);
    for (const p of G.projs) {
      if (p.type === 'rocket') { const q = P.pt(p.x, p.y, 20); c.save(); c.translate(q[0], q[1]); c.rotate(p.ang); c.fillStyle = '#5a6b3a'; c.fillRect(-8, -2, 14, 4); c.fillStyle = '#ffd98a'; c.fillRect(-14, -1.5, 7, 3); c.restore(); }
      else { const q = P.pt(p.x, p.y, 10 + (p.z || 0) * 2.2), r = (p.type === 'acid' ? 6 : 4) * P.scale(); c.fillStyle = 'rgba(0,0,0,.3)'; ell(p.x + 3, p.y + 4, 4, 4); c.fill(); c.fillStyle = p.type === 'acid' ? '#b6f03a' : p.type === 'lure' ? '#4db8ff' : '#2e3a25'; ell(q[0], q[1], r, r); c.fill(); if (p.type === 'frag' && p.t >= p.dur && ((G.time * 12 | 0) & 1)) { c.fillStyle = '#ff3b2f'; ell(p.x, p.y, 2, 2); c.fill(); } }
    }
    c.lineCap = 'round';
    for (const b of G.fx.tracers) { // ردّ نورانی گلوله
      const hd = Math.min(b.go, b.left), tl = Math.max(0, Math.min(b.go - 60, b.left)), ca = Math.cos(b.a), sa = Math.sin(b.a); if (hd - tl < 1) continue;
      const h = P.pt(b.x + ca * hd, b.y + sa * hd, 18), q = P.pt(b.x + ca * tl, b.y + sa * tl, 18), g = c.createLinearGradient(q[0], q[1], h[0], h[1]);
      g.addColorStop(0, 'rgba(255,210,122,0)'); g.addColorStop(1, 'rgba(255,243,196,.9)'); c.strokeStyle = g; c.lineWidth = 1.2; line(q[0], q[1], h[0], h[1]);
    }
    for (const r of G.fx.rings) { const k = 1 - r.t / r.max; c.globalAlpha = (1 - k) * .7; c.strokeStyle = r.color; c.lineWidth = 2.5; ell(r.x, r.y, r.r * k, r.r * k); c.stroke(); }
    c.globalAlpha = 1;
    const WH = G.ui.wheel; if (WH.k > 0) { const p = WH.tgt, col = WH.sel ? G.WHEELS[WH.wheel].color : '#fff'; c.globalAlpha = WH.k; c.strokeStyle = col; c.lineWidth = 2; c.setLineDash([6, 5]); ell(p.x, p.y, 20, 20); c.stroke(); c.setLineDash([]); line(p.x - 8, p.y, p.x + 8, p.y); line(p.x, p.y - 8, p.x, p.y + 8); c.globalAlpha = 1; }

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
    ctx(); const W = view.sw, H = view.sh, hz = H * .66;
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
