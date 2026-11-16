'use strict';
/* زامبی‌های هفت گناه: چینش در مناطق، حس‌ها، رفتار و آسیب */
(function () {
  const T = G.T; let zid = 1;

  G.makeZombie = function (type, x, y, zone) {
    const F = G.ZT[type], hm = G.diff.hp;
    const z = {
      kind: 'z', id: zid++, type, form: type, x, y, hx: x, hy: y, r: F.r, cr: Math.min(F.r, 13), ang: Math.random() * 6.28, zone,
      hp: F.hp * hm, maxHp: F.hp * hm, armor: (F.armor || 0) * hm, maxArmor: (F.armor || 0) * hm, mul: 1,
      tgt: null, los: false, alert: 0, atkT: Math.random(), senseT: Math.random() * .5, stag: 0, kx: 0, ky: 0, dead: false, active: false,
      walk: Math.random() * 6, wx: x, wy: y, wT: Math.random() * 4, sT: 2 + Math.random() * 3, charge: 0, chargeCd: 0, morphT: 3 + Math.random() * 6, kids: 0, screechCd: 0, hurt: 0, lure: null, anim: Math.random() * 6,
    };
    return z;
  };

  /* ---------- چینش زامبی‌ها بر اساس منطقه ---------- */
  G.populate = function (R) {
    const m = G.map, W = m.w, md = G.mdef || {}, D = G.diff.count * (md.popK || 1), zs = G.zombies;
    const others = ['gluttony', 'sloth', 'lust', 'envy', 'pride'];
    const yellowX = md.yellowX || R.pick(others);
    const redX = md.redX || R.shuffle(others.slice()).slice(0, 3);
    G.zoneTypes = [['wrath', 'greed'], ['wrath', 'greed', yellowX], ['wrath', 'greed'].concat(redX), G.SINS.slice(), ['greed']];
    const spot = (zone, minLZ, pred) => {
      for (let k = 0; k < 600; k++) {
        const x = R.int(3, W - 4), y = R.int(3, m.h - 4), i = y * W + x;
        if (m.zone[i] !== zone || m.block[i] || m.dyn[i] || !m.reach[i]) continue;
        if (Math.hypot(x - m.LZ.x, y - m.LZ.y) < minLZ) continue;
        if (Math.hypot(x - m.cx, y - m.cy) < 4) continue;
        if (pred && !pred(i, x, y)) continue;
        return { x: x * T + T / 2, y: y * T + T / 2 };
      }
      return null;
    };
    const near = (p, rad) => { for (let k = 0; k < 30; k++) { const x = p.x + R.range(-rad, rad), y = p.y + R.range(-rad, rad), i = G.tileAt(x, y); if (i >= 0 && !m.block[i] && !m.dyn[i] && m.reach[i] && !G.boxBlocked(x, y, 12)) return { x, y }; } return p; };
    const add = (type, p, zone) => { if (p) zs.push(G.makeZombie(type, p.x, p.y, zone)); };
    const packs = (type, zone, total, minLZ, lo, hi) => { let left = Math.round(total * D); while (left > 0) { const c = spot(zone, minLZ); if (!c) break; const n = Math.min(left, R.int(lo, hi)); for (let k = 0; k < n; k++) add(type, near(c, 60), zone); left -= n; } };
    const singles = (type, zone, total, minLZ, pred) => { const n = Math.max(1, Math.round(total * D)); for (let k = 0; k < n; k++) add(type, spot(zone, minLZ, pred), zone); };
    const slothGate = g => { g.sloth = true; g.tiles.forEach(t => { const z = G.makeZombie('sloth', t.x * T + T / 2, t.y * T + T / 2, m.zone[t.y * W + t.x]); z.gate = g; zs.push(z); m.dyn[t.y * W + t.x] = 1; }); };
    const slothDoors = (zone, n) => { // تنبلی‌هایی که درِ ساختمان‌ها را بسته‌اند
      const bs = R.shuffle(m.buildings.filter(b => b.zone === zone && !b.used)); let c = 0;
      for (const b of bs) {
        if (c >= n) break;
        for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
          const edge = x === b.x || x === b.x + b.w - 1 || y === b.y || y === b.y + b.h - 1, i = y * W + x;
          if (edge && !m.block[i] && !m.dyn[i]) { zs.push(G.makeZombie('sloth', x * T + T / 2, y * T + T / 2, zone)); m.dyn[i] = 1; }
        }
        c++;
      }
    };
    const isFloor = i => m.ground[i] === 3, isRoad = i => m.ground[i] === 1;
    const cnt = { gluttony: [0, 7, 11, 13], lust: [0, 4, 6, 7], envy: [0, 9, 13, 16], pride: [0, 7, 11, 15] };
    const placeSpecial = (type, zone, minLZ) => {
      if (type === 'sloth') { slothDoors(zone, zone === 1 ? 4 : 3); return; }
      singles(type, zone, cnt[type][zone], minLZ, type === 'lust' ? ((i) => isFloor(i) || R.chance(.25)) : type === 'gluttony' ? ((i) => isRoad(i) || R.chance(.3)) : null);
    };
    // سبز: بسیار کم
    for (let k = 0; k < 4; k++) add(k % 2 ? 'greed' : 'wrath', spot(0, 11), 0);
    // زرد: خشم + طمع + یکی از پنج گناه دیگر
    packs('wrath', 1, 62, 26, 2, 5); packs('greed', 1, 50, 26, 1, 3); placeSpecial(yellowX, 1, 30);
    // قرمز: پنج نوع
    packs('wrath', 2, 92, 0, 3, 7); packs('greed', 2, 68, 0, 2, 4); redX.forEach(t => placeSpecial(t, 2, 0));
    // مشکی: هر هفت نوع
    packs('wrath', 3, 96, 0, 4, 8); packs('greed', 3, 70, 0, 2, 5); ['gluttony', 'sloth', 'lust', 'envy', 'pride'].forEach(t => placeSpecial(t, 3, 0));
    for (let k = 0; k < 3; k++) add('pride', near({ x: m.sites.core.x, y: m.sites.core.y }, 150), 3);
    // آبی
    for (let k = 0; k < 3; k++) add('greed', spot(4, 0, (i, x, y) => Math.hypot(x - m.EX.x, y - m.EX.y) > 6), 4);
    // تنبلی روی دروازه‌ها: حلقهٔ مشکی همیشه؛ حلقهٔ قرمز اگر تنبلی جزو انواع قرمز باشد
    const byFar = gs => gs.slice().sort((a, b) => Math.hypot(a.cx - m.LZ.x, a.cy - m.LZ.y) - Math.hypot(b.cx - m.LZ.x, b.cy - m.LZ.y));
    const blackG = byFar(m.gates.filter(g => g.ring === 2));
    blackG.slice(0, Math.max(1, blackG.length - 2)).forEach(slothGate);
    if (redX.indexOf('sloth') >= 0) { const redG = byFar(m.gates.filter(g => g.ring === 1)); redG.filter((g, i) => i % 2 === 0).slice(0, 4).forEach(slothGate); }
    G.markDanger();
    zs.forEach(z => { if (z.type === 'envy') z.morphT = 1 + Math.random() * 4; });
  };

  /* ---------- صدا و هشدار ---------- */
  G.noise = function (x, y, rad) {
    for (const z of G.zActive) { if (z.dead || z.alert > 6) continue; const dx = z.x - x, dy = z.y - y; if (dx * dx + dy * dy < rad * rad * .75) z.alert = Math.max(z.alert, 8); }
  };
  G.acidPool = function (x, y, r, t) { G.pools.push({ x, y, r, t, max: t }); G.fx.decal(x, y, 'acid', '#5c7a12', r * .8); };

  /* ---------- آسیب ---------- */
  G.damageZombie = function (z, dmg, o) {
    if (z.dead) return; o = o || {};
    let d = dmg;
    if (z.form === 'sloth' && !o.expl) { d *= .03; if (Math.random() < .3) G.fx.burst(z.x, z.y - 10, '#8fa3c4', 1, 40, .3, 2); }
    if (z.armor > 0) {
      const ap = o.expl ? 1.5 : (o.ap || .4), ad = d * ap; z.armor -= ad;
      G.fx.burst(z.x, z.y - 14, '#ffe9a8', 2, 110, .2, 1.6); G.audio.play('armor', Math.hypot(z.x - G.cmd.x, z.y - G.cmd.y));
      if (z.armor <= 0) { d = (-z.armor) / ap; z.armor = 0; G.fx.burst(z.x, z.y - 12, '#d9b64a', 14, 150, .5, 3); G.fx.ring(z.x, z.y, 40, '#ffe9a8'); }
      else d *= .04;
    }
    z.hp -= d; z.hurt = .12; z.alert = Math.max(z.alert, 10);
    if (o.src && !z.tgt && !o.src.downed && !o.src.dead) z.tgt = o.src;
    if (z.form !== 'pride' && G.ZT[z.form].speed > 0) { z.stag = Math.max(z.stag, .1); if (o.knock) { const k = o.knock / (z.form === 'gluttony' ? 4 : 1); z.kx += Math.cos(o.ang) * k; z.ky += Math.sin(o.ang) * k; } }
    if (d > 1) G.fx.burst(z.x, z.y - 10, Math.random() < .5 ? '#0b0b10' : G.ZT[z.type].color, d > 40 ? 5 : 2, 90, .35, 2.4);
    if (z.hp <= 0) kill(z, o);
  };
  function kill(z, o) {
    z.dead = true; G.anyDead = true;
    const F = G.ZT[z.form], st = G.stats; st.kills++; st.byType[z.type] = (st.byType[z.type] || 0) + 1; st.score += G.ZT[z.type].score;
    if (o.src) o.src.kills++;
    G.fx.burst(z.x, z.y - 8, '#0b0b10', 10, 130, .5, 3); G.fx.burst(z.x, z.y - 8, G.ZT[z.type].color, 5, 100, .5, 2);
    G.fx.decal(z.x, z.y, 'blood', G.ZT[z.type].color, F.r * 1.5);
    const cd = Math.hypot(z.x - G.cmd.x, z.y - G.cmd.y);
    if (z.form === 'gluttony') {
      G.acidPool(z.x, z.y, 74, 7); G.audio.play('splat', cd); G.fx.ring(z.x, z.y, 80, '#9bd41e');
      for (const s of G.soldiers) if (!s.dead && Math.hypot(s.x - z.x, s.y - z.y) < 80) G.damageSoldier(s, 22, z);
    }
    if (z.type === 'sloth' || z.form === 'sloth') {
      const i = G.tileAt(z.x, z.y); if (i >= 0) G.map.dyn[i] = 0; G.flowT = 0; G.markDanger();
      if (z.gate && !G.zombies.some(q => !q.dead && q.gate === z.gate)) { z.gate.sloth = false; G.msg('مسیر باز شد.', '#8fa3c4'); G.minimapDirty = true; }
    }
    if (z.parent) z.parent.kids--;
  }

  /* ---------- حس‌ها ---------- */
  function sense(z, F) {
    let best = null, bd = F.sight * (z.alert > 0 ? 1.5 : 1);
    for (const s of G.soldiers) {
      if (s.dead || s.downed) continue; const d = Math.hypot(s.x - z.x, s.y - z.y);
      if (d < bd && (d < 46 || G.losClear(z.x, z.y, s.x, s.y))) { bd = d; best = s; }
    }
    if (best) {
      if (!z.tgt && z.form === 'greed' && z.screechCd <= 0) { // جیغ طمع
        z.screechCd = 9; G.fx.ring(z.x, z.y, 220, '#ffc93c'); G.audio.play('screech', Math.hypot(z.x - G.cmd.x, z.y - G.cmd.y));
        for (const q of G.zActive) if (!q.dead && Math.hypot(q.x - z.x, q.y - z.y) < 330) q.alert = Math.max(q.alert, 12);
      } else if (!z.tgt && Math.random() < .25) G.audio.play('growl', Math.hypot(z.x - G.cmd.x, z.y - G.cmd.y));
      z.tgt = best; z.los = true; z.alert = Math.max(z.alert, 9);
    } else {
      z.los = false;
      if (z.tgt && (z.tgt.dead || z.tgt.downed || Math.hypot(z.tgt.x - z.x, z.tgt.y - z.y) > F.sight * 2.4 || z.alert <= 0)) z.tgt = null;
    }
    z.lure = null;
    if (F.speed > 0) for (const l of G.lures) { const d = Math.hypot(l.x - z.x, l.y - z.y); if (d < 440 && (!z.tgt || Math.hypot(z.tgt.x - z.x, z.tgt.y - z.y) > 120)) { z.lure = l; break; } }
  }

  function morph(z) {
    const zt = G.zoneTypes[z.zone] || G.SINS, opts = ['wrath', 'greed', 'gluttony', 'pride'].filter(t => zt.indexOf(t) >= 0 && t !== z.form);
    const to = opts[(Math.random() * opts.length) | 0] || 'wrath', F = G.ZT[to], frac = Math.max(.35, z.hp / z.maxHp), hm = G.diff.hp;
    z.form = to; z.maxHp = F.hp * 1.4 * hm; z.hp = z.maxHp * frac; z.mul = 1.3; z.r = F.r; z.cr = Math.min(F.r, 13);
    if (F.armor && !z.hadArmor) { z.armor = z.maxArmor = F.armor * 1.3 * hm; z.hadArmor = true; } else if (!F.armor) { z.armor = 0; }
    G.fx.ring(z.x, z.y, 46, '#19e68c'); G.fx.burst(z.x, z.y - 10, '#19e68c', 10, 90, .5, 2.5);
  }

  /* ---------- رفتار ---------- */
  function step(z, tx, ty, spd, dt) {
    const dx = tx - z.x, dy = ty - z.y, d = Math.hypot(dx, dy); if (d < 1) return;
    const st = Math.min(spd * dt, d); z.hitWall = false;
    G.moveEnt(z, dx / d * st, dy / d * st); z.ang = G.turn(z.ang, Math.atan2(dy, dx), 9 * dt); z.walk += dt * spd * .09;
  }
  function updateZ(z, dt) {
    const F = G.ZT[z.form];
    z.anim += dt; if (z.hurt > 0) z.hurt -= dt; if (z.stag > 0) z.stag -= dt; if (z.alert > 0) z.alert -= dt;
    if (z.screechCd > 0) z.screechCd -= dt; if (z.chargeCd > 0) z.chargeCd -= dt; if (z.charge > 0) z.charge -= dt;
    z.atkT -= dt; z.senseT -= dt;
    if (z.senseT <= 0) { z.senseT = .28 + Math.random() * .2; sense(z, F); }
    if (z.kx || z.ky) { G.moveEnt(z, z.kx * dt * 6, z.ky * dt * 6); z.kx *= .8; z.ky *= .8; if (Math.abs(z.kx) + Math.abs(z.ky) < 2) z.kx = z.ky = 0; }
    const t = z.tgt, dmgMul = z.mul;
    // حسادت: تغییر شکل
    if (z.type === 'envy') { z.morphT -= dt; if (z.morphT <= 0 && (z.alert > 0 || z.form === 'envy')) { z.morphT = 15 + Math.random() * 5; morph(z); } }
    if (F.speed === 0) { // تنبلی و شهوت
      if (z.atkT <= 0) for (const s of G.soldiers) if (!s.dead && !s.downed && Math.hypot(s.x - z.x, s.y - z.y) < (z.form === 'sloth' ? 54 : 62)) { z.atkT = F.atkCd; z.lash = .25; z.lashA = Math.atan2(s.y - z.y, s.x - z.x); G.damageSoldier(s, F.dmg, z); break; }
      if (z.lash > 0) z.lash -= dt;
      if (z.form === 'lust' && z.alert > 0) {
        z.sT -= dt;
        if (z.sT <= 0 && z.kids < 7) {
          z.sT = 4.2; const a = Math.random() * 6.28, x = z.x + Math.cos(a) * 30, y = z.y + Math.sin(a) * 30;
          if (!G.boxBlocked(x, y, 9)) { const k = G.makeZombie('twin', x, y, z.zone); k.parent = z; k.alert = 20; k.active = true; z.kids++; G.zombies.push(k); G.zActive.push(k); G.fx.burst(x, y - 6, '#ff8cc6', 8, 70, .5, 2.5); G.fx.ring(z.x, z.y, 36, '#ff4fa3'); }
        }
      }
      return;
    }
    let spd = F.speed * (z.type === 'envy' && z.form !== 'envy' ? 1.15 : 1) * (z.stag > 0 ? .35 : 1);
    if (z.lure && z.lure.t > 0) { if (Math.hypot(z.lure.x - z.x, z.lure.y - z.y) > 26) step(z, z.lure.x, z.lure.y, spd, dt); return; }
    if (t) {
      const d = Math.hypot(t.x - z.x, t.y - z.y);
      if (z.form === 'wrath' && z.los && d < 320 && z.chargeCd <= 0) { z.charge = 2.4; z.chargeCd = 6; G.audio.play('growl', Math.hypot(z.x - G.cmd.x, z.y - G.cmd.y)); }
      if (z.charge > 0) spd *= 1.6;
      if (z.form === 'gluttony' && z.los && d > 110 && d < 400) {
        z.sT -= dt;
        if (z.sT <= 0) { z.sT = 4; G.projs.push({ type: 'acid', x0: z.x, y0: z.y, x1: t.x + G.rand(-20, 20), y1: t.y + G.rand(-20, 20), x: z.x, y: z.y, t: 0, dur: .9, z: 0 }); z.lash = .3; }
      }
      if (z.lash > 0) z.lash -= dt;
      if (d < z.r + t.r + 7) {
        z.ang = G.turn(z.ang, Math.atan2(t.y - z.y, t.x - z.x), 10 * dt);
        if (z.atkT <= 0) { z.atkT = F.atkCd; z.lash = .2; G.damageSoldier(t, F.dmg * dmgMul, z); }
      } else if (z.los && d < 300) step(z, t.x, t.y, spd, dt);
      else { const f = G.flowDir(z.x, z.y); if (f) step(z, f.x, f.y, spd, dt); else if (z.los) step(z, t.x, t.y, spd, dt); }
      return;
    }
    if (z.alert > 0) { const f = G.flowDir(z.x, z.y); if (f && G.flowAt(z.x, z.y) < 80) { step(z, f.x, f.y, spd * .9, dt); return; } }
    // پرسه
    z.wT -= dt;
    const roam = z.form === 'greed';
    if (z.wT <= 0 || z.hitWall) {
      z.wT = roam ? 2 + Math.random() * 3 : 3 + Math.random() * 5; z.hitWall = false;
      const rad = roam ? 320 : 70, bx = roam ? z.x : z.hx, by = roam ? z.y : z.hy;
      for (let k = 0; k < 5; k++) { const x = bx + G.rand(-rad, rad), y = by + G.rand(-rad, rad); if (!G.boxBlocked(x, y, 12) && G.zoneAt(x, y) === z.zone && G.losClear(z.x, z.y, x, y)) { z.wx = x; z.wy = y; break; } }
    }
    if (Math.hypot(z.wx - z.x, z.wy - z.y) > 8) step(z, z.wx, z.wy, spd * (roam ? .62 : .25), dt);
  }

  let actT = 0;
  G.updateZombies = function (dt) {
    const zs = G.zombies;
    actT -= dt;
    if (actT <= 0) {
      actT = .4; const act = G.zActive = []; const ss = G.soldiers.filter(s => !s.dead);
      for (const z of zs) { if (z.dead) continue; let a = z.alert > 0 && z.tgt; if (!a) for (const s of ss) { const dx = s.x - z.x, dy = s.y - z.y; if (dx * dx + dy * dy < 1150 * 1150) { a = true; break; } } z.active = !!a; if (a) act.push(z); }
    }
    for (const z of G.zActive) if (!z.dead) updateZ(z, dt);
    // جداسازی زامبی‌ها
    const act = G.zActive, grid = sepGrid; for (const k in grid) grid[k].length = 0;
    for (const z of act) { if (z.dead || G.ZT[z.form].speed === 0) continue; const k = ((z.x / 40) | 0) + ((z.y / 40) | 0) * 512; (grid[k] || (grid[k] = [])).push(z); }
    for (const z of act) {
      if (z.dead || G.ZT[z.form].speed === 0) continue; const cx = (z.x / 40) | 0, cy = (z.y / 40) | 0; let px = 0, py = 0;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const c = grid[cx + ox + (cy + oy) * 512]; if (!c) continue; for (const o of c) { if (o === z) continue; const dx = z.x - o.x, dy = z.y - o.y, d = Math.hypot(dx, dy), m = z.r + o.r; if (d < m && d > .01) { const p = (m - d) / m; px += dx / d * p; py += dy / d * p; } } }
      if (px || py) G.moveEnt(z, px * 60 * dt, py * 60 * dt);
    }
    // استخرهای اسید و طعمه‌ها
    for (let i = G.pools.length - 1; i >= 0; i--) { const p = G.pools[i]; p.t -= dt; if (p.t <= 0) { G.pools.splice(i, 1); continue; } for (const s of G.soldiers) if (!s.dead && !s.downed && Math.hypot(s.x - p.x, s.y - p.y) < p.r) G.damageSoldier(s, 13 * dt, null); }
    for (let i = G.lures.length - 1; i >= 0; i--) { const l = G.lures[i]; l.t -= dt; l.pulse -= dt; if (l.pulse <= 0) { l.pulse = .8; G.fx.ring(l.x, l.y, 120, '#4db8ff'); G.audio.play('beep', Math.hypot(l.x - G.cmd.x, l.y - G.cmd.y)); for (const z of G.zActive) if (!z.dead && Math.hypot(z.x - l.x, z.y - l.y) < 440) z.alert = Math.max(z.alert, 3); } if (l.t <= 0) G.lures.splice(i, 1); }
    if (G.anyDead) { G.anyDead = false; G.zombies = zs.filter(z => !z.dead); G.zActive = G.zActive.filter(z => !z.dead); }
  };
  const sepGrid = {};
})();
