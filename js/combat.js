'use strict';
/* سربازان، سلاح‌ها، پرتابه‌ها، فرمان‌ها و هوش مصنوعی جوخه‌ها */
(function () {
  const T = G.T, dist = G.dist;

  /* ---------- ساخت سرباز ---------- */
  function mkW(id, cmd) {
    const d = G.WEAPONS[id];
    let res = -1;
    if (d.reserve != null) res = d.reserve; else if (cmd && !d.melee) res = d.mag * (d.slot === 's' ? 5 : 8);
    return { id, def: d, mag: d.mag, res, maxRes: res, cd: 0, rel: 0 };
  }
  G.mkW = mkW;
  G.makeSoldier = function (o) {
    return {
      kind: 's', id: o.id, x: o.x, y: o.y, r: 10, ang: -Math.PI / 2, hp: o.hp, maxHp: o.hp, squad: o.squad, idx: o.idx || 0,
      name: o.name, role: o.role, medic: !!o.medic, demo: !!o.demo, isCmd: !!o.isCmd, color: o.color,
      weapons: [mkW(o.p, o.isCmd), mkW(o.s, o.isCmd), mkW('knife')], cur: 0,
      grenades: o.isCmd ? 4 : (o.demo ? 4 : 2), lures: o.isCmd ? 2 : 3, medkits: o.isCmd ? 3 : 0,
      speed: o.isCmd ? 102 : 110, downed: false, bleed: 0, dead: false, walk: 0, moving: false, mvAng: 0,
      target: null, hunt: null, thinkT: Math.random() * .3, nav: { path: null, i: 0, gx: 0, gy: 0, t: 0, direct: undefined, stuck: 0, lx: o.x, ly: o.y },
      task: null, gcd: 2 + Math.random() * 3, slow: 1, hurtT: 0, kills: 0, sx: o.x, sy: o.y, face: null, wps: null, stamina: 1, flashT: 0, healT: 0, fired: 0,
    };
  };
  G.wOf = u => u.weapons[u.cur];
  G.setSoldierWeapon = (u, slot, id) => { u.weapons[slot] = mkW(id, u.isCmd); };

  /* ---------- شلیک ---------- */
  G.startReload = function (u, w) {
    w = w || G.wOf(u);
    if (w.def.melee || w.rel > 0 || w.mag >= w.def.mag || w.res === 0) return false;
    w.rel = w.def.reload; if (u.isCmd) G.audio.play('reload'); return true;
  };
  function tickWeapons(u, dt) {
    for (const w of u.weapons) {
      if (w.cd > 0) w.cd -= dt;
      if (w.rel > 0) {
        w.rel -= dt;
        if (w.rel <= 0) { const need = w.def.mag - w.mag; if (w.res < 0) w.mag = w.def.mag; else { const t = Math.min(need, w.res); w.mag += t; w.res -= t; } }
      }
    }
  }
  G.fire = function (u, ang, tx, ty) {
    const w = G.wOf(u), d = w.def;
    if (w.cd > 0 || w.rel > 0) return false;
    if (d.melee) return melee(u, ang);
    if (w.mag <= 0) { G.startReload(u, w); return false; }
    w.cd = 60 / d.rpm * (u.isCmd ? 1 : d.auto ? 2.4 : 1.4); w.mag--; u.fired = .08; u.flashT = .05;
    const cdist = dist(u, G.cmd);
    const mx = u.x + Math.cos(ang) * (d.len + 6), my = u.y + Math.sin(ang) * (d.len + 6);
    G.audio.play(d.snd, cdist);
    if (d.noise) G.noise(u.x, u.y, d.noise);
    G.fx.muzzle(mx, my, ang);
    if (!d.proj) G.fx.casing(u.x + Math.cos(ang) * 6, u.y + Math.sin(ang) * 6, ang);
    const sp = d.spread * (u.isCmd ? (u.moving ? 1.5 : 1) : (u.moving ? 3.2 : 2.1));
    if (d.proj === 'rocket') {
      G.projs.push({ type: 'rocket', x: mx, y: my, ang: ang + (Math.random() - .5) * sp, sp: 620, left: d.range, dmg: d.dmg, radius: d.radius, owner: u, life: 3 });
    } else if (d.proj === 'gren') {
      let dd = Math.min(Math.hypot(tx - u.x, ty - u.y), d.range); dd = Math.max(dd, 60);
      const a = ang + (Math.random() - .5) * sp;
      const wd = G.rayCast(u.x, u.y, Math.cos(a), Math.sin(a), dd, true); dd = Math.max(10, Math.min(dd, wd - 8));
      G.projs.push({ type: 'gl', x0: u.x, y0: u.y, x1: u.x + Math.cos(a) * dd, y1: u.y + Math.sin(a) * dd, x: u.x, y: u.y, t: 0, dur: .25 + dd / 700, dmg: d.dmg, radius: d.radius, owner: u, fuse: 0 });
    } else {
      for (let p = 0; p < (d.pellets || 1); p++) G.hitscan(u, u.x, u.y, ang + (Math.random() - .5) * 2 * sp, d);
    }
    if (w.mag <= 0 && !u.isCmd) G.startReload(u, w);
    return true;
  };
  G.hitscan = function (u, x, y, ang, d) {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const wall = G.rayCast(x, y, dx, dy, d.range, true);
    const hits = [];
    for (const z of G.zActive) {
      if (z.dead) continue;
      const rx = z.x - x, ry = z.y - y, t = rx * dx + ry * dy; if (t < 0 || t > wall + z.r) continue;
      const px = rx - dx * t, py = ry - dy * t, rr = z.r + 3; if (px * px + py * py > rr * rr) continue;
      hits.push({ z, t });
    }
    for (const h of G.objRay(x, y, dx, dy, Math.min(wall, d.range))) hits.push({ o: h.o, t: h.t, t2: h.t2 });
    hits.sort((a, b) => a.t - b.t);
    let end = wall, dmg = d.dmg, n = d.pierce || 1, stopped = false;
    for (const h of hits) {
      if (h.t > end) break;
      if (h.o) { // برخورد با اشیا: اثر و نفوذ بسته به جنس (از روی سنگرِ چسبیده به تیرانداز شلیک می‌شود)
        if (h.o.dead || (h.t < 38 && !h.o.tall)) continue;
        const ex = h.t2 < wall ? h.t2 : null, pass = G.hitObj(h.o, x + dx * h.t, y + dy * h.t, dx, dy, dmg, d, ex != null ? x + dx * ex : null, ex != null ? y + dy * ex : null);
        if (pass <= 0) { end = h.t; stopped = true; break; }
        dmg *= pass; continue;
      }
      const fall = h.t > d.range * .7 ? .75 : 1;
      G.damageZombie(h.z, dmg * fall, { ap: d.ap, ang, knock: d.knock || 0, src: u });
      n--; dmg *= .7;
      if (n <= 0 || h.z.form === 'sloth' || h.z.armor > 0) { end = h.t; stopped = true; break; }
    }
    if (!stopped && wall < d.range) G.hitWall(G.tileAt(x + dx * (wall + 2), y + dy * (wall + 2)), x + dx * wall, y + dy * wall, dx, dy, dmg);
    G.fx.bullet(x + dx * 18, y + dy * 18, ang, Math.max(0, end - 18));
  };
  function melee(u, ang) {
    const w = u.weapons[2]; if (w.cd > 0) return false;
    w.cd = .45; u.swing = .18; G.audio.play('knife', dist(u, G.cmd));
    for (const z of G.zActive) {
      if (z.dead) continue; const d = dist(u, z); if (d > 30 + z.r) continue;
      if (Math.abs(G.angDiff(ang, Math.atan2(z.y - u.y, z.x - u.x))) > 1.2) continue;
      G.damageZombie(z, w.def.dmg, { ap: w.def.ap, ang, knock: 30, src: u });
    }
    return true;
  }
  G.melee = melee;
  G.throwItem = function (u, tx, ty, type) {
    if (type === 'frag') { if (u.grenades <= 0) return false; u.grenades--; } else { if (u.lures <= 0) return false; u.lures--; }
    const a = Math.atan2(ty - u.y, tx - u.x); let dd = Math.min(Math.hypot(tx - u.x, ty - u.y), 390);
    const wd = G.rayCast(u.x, u.y, Math.cos(a), Math.sin(a), dd, true); dd = Math.max(10, Math.min(dd, wd - 8));
    G.projs.push({ type, x0: u.x, y0: u.y, x1: u.x + Math.cos(a) * dd, y1: u.y + Math.sin(a) * dd, x: u.x, y: u.y, t: 0, dur: .3 + dd / 520, dmg: 270, radius: 105, owner: u, fuse: type === 'frag' ? .7 : 0 });
    u.swing = .15; return true;
  };

  /* ---------- انفجار ---------- */
  G.explode = function (x, y, radius, dmg, owner, opts) {
    opts = opts || {};
    G._ex = { x, y, id: (G._exId = (G._exId || 0) + 1) }; G.shockObjs(x, y, radius * 2);
    G.fx.boom(x, y, radius); G.audio.play('boom', Math.hypot(x - G.cmd.x, y - G.cmd.y)); G.noise(x, y, 900);
    const sh = G.clamp(1 - Math.hypot(x - G.cmd.x, y - G.cmd.y) / 700, 0, 1); G.fx.shake(10 * sh);
    for (const z of G.zombies) {
      if (z.dead) continue; const d = Math.hypot(z.x - x, z.y - y); if (d > radius + z.r) continue;
      if (d > 40 && !G.losClear(x, y, z.x + (x - z.x) / d * 14, z.y + (y - z.y) / d * 14, true)) continue;
      G.damageZombie(z, dmg * (1 - .6 * Math.min(1, d / radius)), { expl: 1, ang: Math.atan2(z.y - y, z.x - x), knock: 120, src: owner && owner.kind === 's' ? owner : null });
    }
    if (!opts.noTiles) { const m = G.map, r = radius * .8, tx0 = Math.floor((x - r) / T), tx1 = Math.floor((x + r) / T), ty0 = Math.floor((y - r) / T), ty1 = Math.floor((y + r) / T); for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) continue; const dd = Math.hypot(tx * T + T / 2 - x, ty * T + T / 2 - y); if (dd < r) G.damageTile(ty * m.w + tx, dmg * (1 - .5 * dd / r), true); } }
    G._ex = null;
    if (!opts.noFF) for (const s of G.soldiers) {
      if (s.dead) continue; const d = Math.hypot(s.x - x, s.y - y); if (d > radius) continue;
      if (d > 30 && !G.losClear(x, y, s.x, s.y, true)) continue;
      G.damageSoldier(s, dmg * .22 * (1 - .7 * d / radius), null, true);
    }
  };

  /* ---------- آسیب به سرباز ---------- */
  G.damageSoldier = function (s, dmg, src, raw) {
    if (s.dead || s.downed || s.boarded || G.over) return;
    s.hp -= (raw ? dmg : dmg * G.diff.dmg) * (s.isCmd ? (G.cmdDmg || 1) : (G.squadDmg || 1)); s.hurtT = .25; if (s.isCmd && G.cmdFloor && s.hp < G.cmdFloor) s.hp = G.cmdFloor;
    if (s.isCmd) { G.fx.hurt = Math.min(1, (G.fx.hurt || 0) + .35); G.audio.play('hit'); }
    G.fx.burst(s.x, s.y - 8, '#c21d1d', 4, 60, .35, 2.2);
    if (s.hp <= 0) {
      s.hp = 0;
      if (s.isCmd) { s.downed = true; G.endMission(false, 'فرمانده از پا درآمد.'); return; }
      s.downed = true; s.bleed = G.noRevive ? 3 : 45; s.target = null; s.task = null;
      G.msg(`${s.name} زمین خورد!`, '#ff6b6b'); G.audio.play('alarm');
    }
  };

  /* ---------- پرتابه‌ها ---------- */
  G.updateProjs = function (dt) {
    const ps = G.projs;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]; let done = false;
      if (p.type === 'rocket') {
        const step = p.sp * dt, dx = Math.cos(p.ang), dy = Math.sin(p.ang);
        const wd = G.rayCast(p.x, p.y, dx, dy, step + 4, true); let hit = wd <= step + 2;
        const mv = Math.min(step, wd); p.trav = (p.trav || 0) + mv;
        if (!hit && p.trav > 60) for (const h of G.objRay(p.x, p.y, dx, dy, mv)) if (h.o.mat !== 'glass') { hit = true; break; }
        for (const z of G.zActive) { if (z.dead) continue; const rx = z.x - p.x, ry = z.y - p.y, t = rx * dx + ry * dy; if (t < -z.r || t > mv + z.r) continue; const qx = rx - dx * t, qy = ry - dy * t; if (qx * qx + qy * qy < (z.r + 4) * (z.r + 4)) { hit = true; break; } }
        p.x += dx * mv; p.y += dy * mv; p.left -= mv;
        if (Math.random() < .9) G.fx.smoke(p.x - dx * 8, p.y - dy * 8);
        if (hit || p.left <= 0) { G.explode(p.x - dx * 6, p.y - dy * 6, p.radius, p.dmg, p.owner); done = true; }
      } else if (p.type === 'acid') {
        p.t += dt; const k = Math.min(1, p.t / p.dur); p.x = G.lerp(p.x0, p.x1, k); p.y = G.lerp(p.y0, p.y1, k); p.z = Math.sin(k * Math.PI) * 46;
        if (k >= 1) { G.acidPool(p.x, p.y, 44, 6); G.audio.play('splat', Math.hypot(p.x - G.cmd.x, p.y - G.cmd.y)); done = true; }
      } else { // frag, lure, gl
        if (p.t < p.dur) {
          p.t += dt; const k = Math.min(1, p.t / p.dur); p.x = G.lerp(p.x0, p.x1, k); p.y = G.lerp(p.y0, p.y1, k); p.z = Math.sin(k * Math.PI) * (30 + p.dur * 40);
        } else {
          p.z = 0; p.fuse -= dt;
          if (p.fuse <= 0) {
            if (p.type === 'lure') { G.lures.push({ x: p.x, y: p.y, t: 13, pulse: 0 }); G.msg('طعمهٔ صوتی فعال شد.', '#4db8ff'); }
            else G.explode(p.x, p.y, p.radius, p.dmg, p.owner);
            done = true;
          }
        }
      }
      if (done) ps.splice(i, 1);
    }
  };

  /* ---------- آرایش‌ها ---------- */
  function slotAt(lx, ly, h, form, sqKey, i, n, extraBack) {
    const base = sqKey === 'delta' ? 1 : 0; let back = 0, side = 0;
    if (form === 'circle') {
      const a = (i / n) * Math.PI * 2 + (base ? Math.PI / n : 0) + h, rad = base ? 100 : 60;
      return { x: lx + Math.cos(a) * rad, y: ly + Math.sin(a) * rad, face: a };
    }
    if (form === 'wedge') { const row = (i >> 1) + 1; back = row * 30; side = (i % 2 ? 1 : -1) * row * 28; }
    else if (form === 'line') { back = 34; side = (i - (n - 1) / 2) * 32; }
    else { back = (i + 1) * 30; }
    back += extraBack;
    return { x: lx - Math.cos(h) * back - Math.sin(h) * side, y: ly - Math.sin(h) * back + Math.cos(h) * side, face: null };
  }
  function fixSlot(p, fx, fy) {
    const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
    if (G.walkT(tx, ty) && !G.boxBlocked(p.x, p.y, 9)) return p;
    const f = G.nearestFree(tx, ty, 3);
    if (f) { p.x = f.x * T + T / 2; p.y = f.y * T + T / 2; } else { p.x = fx; p.y = fy; }
    return p;
  }
  const alive = sq => sq.members.filter(m => !m.dead && !m.downed);
  G.aliveOf = alive;
  function extraBackFor(sq, form) {
    if (sq.key !== 'delta') return 0;
    const a = G.squads.alpha, ao = a.order.type; const n = (ao === 'follow' || ao === 'regroup') ? alive(a).length : 0;
    if (form === 'wedge') return n ? Math.ceil(n / 2) * 30 + 22 : 0;
    if (form === 'line') return n ? 40 : 0;
    if (form === 'column') return n * 30 + 8;
    return 0;
  }
  function assignPosts(sq, x, y, h, form, noExtra) {
    const ms = alive(sq), n = ms.length;
    ms.forEach((u, i) => { const p = fixSlot(slotAt(x + Math.cos(h) * 16, y + Math.sin(h) * 16, h, form, sq.key, i, n, noExtra ? 0 : 0), x, y); u.sx = p.x; u.sy = p.y; u.face = p.face; u.nav.t = 0; });
  }

  /* ---------- فرمان‌ها ---------- */
  const ACK = ['دریافت شد!', 'اطاعت فرمانده!', 'در حال اجرا.', 'حرکت می‌کنیم!', 'چشم قربان!'];
  G.command = function (scope, id, pt) {
    const sqs = scope === 'all' ? [G.squads.alpha, G.squads.delta] : [G.squads[scope]];
    const cmd = G.cmd; let label = '';
    pt = pt || { x: cmd.x, y: cmd.y };
    if (pt) { const f = G.nearestFree(Math.floor(pt.x / T), Math.floor(pt.y / T), 4); if (f && !G.walkT(Math.floor(pt.x / T), Math.floor(pt.y / T)) && id !== 'destroy' && id !== 'firesup' && id !== 'distract' && id !== 'fireat' && id !== 'blast') pt = { x: f.x * T + T / 2, y: f.y * T + T / 2 }; }
    if (id === 'form') {
      const cur = G.FORMS.findIndex(f => f[0] === G.squads.alpha.form), nx = G.FORMS[(cur + 1) % G.FORMS.length];
      sqs.forEach(sq => { sq.form = nx[0]; if (sq.order.type === 'post' && sq.order.kind !== 'defend') assignPosts(sq, sq.order.x, sq.order.y, sq.order.h || 0, sq.form); });
      G.msg(`آرایش: ${nx[1]}`, '#f2e2a0'); G.audio.play('radio'); return;
    }
    if (id === 'fire') { const hf = !G.squads.alpha.holdFire; sqs.forEach(sq => sq.holdFire = hf); G.msg(hf ? 'آتش‌بس! فقط در دفاع از خود شلیک کنید.' : 'آتش آزاد!', '#f2e2a0'); G.audio.play('radio'); return; }
    for (const sq of sqs) {
      const ms = alive(sq); if (!ms.length) continue;
      const cxm = ms.reduce((s, u) => s + u.x, 0) / ms.length, cym = ms.reduce((s, u) => s + u.y, 0) / ms.length;
      const h = Math.atan2(pt.y - cym, pt.x - cxm), prev = sq.order;
      ms.forEach(u => { u.hunt = null; u.wps = null; u.nav.t = 0; if (u.task && u.task.type !== 'revive') u.task = null; });
      switch (id) {
        case 'follow': sq.order = { type: 'follow' }; label = 'دنبال فرمانده'; break;
        case 'regroup': sq.order = { type: 'regroup' }; label = 'تجمع فوری'; break;
        case 'hold': sq.order = { type: 'post', kind: 'hold', x: cxm, y: cym }; ms.forEach(u => { u.sx = u.x; u.sy = u.y; u.face = null; }); label = 'ایست'; break;
        case 'move': sq.order = { type: 'post', kind: 'move', x: pt.x, y: pt.y, h }; assignPosts(sq, pt.x, pt.y, h, sq.form); label = 'حرکت به نقطه'; break;
        case 'defend': sq.order = { type: 'post', kind: 'defend', x: pt.x, y: pt.y, h: 0 };
          ms.forEach((u, i) => { const a = (i / ms.length) * Math.PI * 2 - Math.PI / 2; const p = fixSlot({ x: pt.x + Math.cos(a) * 72, y: pt.y + Math.sin(a) * 72 }, pt.x, pt.y); u.sx = p.x; u.sy = p.y; u.face = a; });
          label = 'دفاع از نقطه'; break;
        case 'assault': sq.order = { type: 'assault', x: pt.x, y: pt.y, h }; assignPosts(sq, pt.x, pt.y, h, 'line'); label = 'حمله'; break;
        case 'clear': {
          sq.order = { type: 'clear', x: pt.x, y: pt.y, h, R: 280, t: 0 }; assignPosts(sq, pt.x, pt.y, h, 'circle');
          const wps = []; const tx0 = Math.floor(pt.x / T), ty0 = Math.floor(pt.y / T);
          for (let dy = -8; dy <= 8; dy += 3) for (let dx = -8; dx <= 8; dx += 3) { const tx = tx0 + dx, ty = ty0 + dy; if (dx * dx + dy * dy <= 70 && G.walkT(tx, ty) && G.map.reach[ty * G.map.w + tx]) wps.push({ x: tx * T + T / 2, y: ty * T + T / 2, a: Math.atan2(dy, dx) }); }
          wps.sort((a, b) => a.a - b.a);
          ms.forEach((u, i) => { u.wps = wps.filter((w, k) => k % ms.length === i); });
          label = 'پاکسازی منطقه'; break;
        }
        case 'sd': sq.order = { type: 'sd', x: pt.x, y: pt.y, R: 720, idle: 0 }; label = 'جستجو و نابودی'; break;
        case 'destroy': case 'firesup': {
          let ent = null, bd = 90;
          for (const z of G.zombies) { if (z.dead) continue; const d = Math.hypot(z.x - pt.x, z.y - pt.y) - (z.form === 'sloth' || z.form === 'lust' ? 30 : 0); if (d < bd) { bd = d; ent = z; } }
          sq.order = { type: id, x: ent ? ent.x : pt.x, y: ent ? ent.y : pt.y, ent, t: 0, prev: (prev.type === 'destroy' || prev.type === 'firesup') ? prev.prev : prev, shots: 0 };
          ms.forEach(u => { u.supShots = 0; });
          label = id === 'destroy' ? 'نابودی هدف' : 'پشتیبانی آتش'; break;
        }
        case 'blast': {
          let ent = null, bd = 60;
          for (const z of G.zombies) { if (z.dead || z.form !== 'sloth') continue; const d = Math.hypot(z.x - pt.x, z.y - pt.y); if (d < bd) { bd = d; ent = z; } }
          const ti = G.tileAt(pt.x, pt.y);
          sq.order = { type: 'destroy', blast: 1, x: pt.x, y: pt.y, ent, tile: ti >= 0 && G.destructible(ti) ? ti : -1, t: 0, prev: (prev.type === 'destroy' || prev.type === 'firesup' || prev.type === 'fireat') ? prev.prev : prev, shots: 0 };
          ms.forEach(u => { u.supShots = 0; }); label = 'انفجار نقطه'; break;
        }
        case 'fireat': {
          const ti = G.tileAt(pt.x, pt.y);
          sq.order = { type: 'fireat', x: pt.x, y: pt.y, tile: ti >= 0 && G.destructible(ti) ? ti : -1, t: 0, shots: 0, prev: (prev.type === 'destroy' || prev.type === 'firesup' || prev.type === 'fireat') ? prev.prev : prev };
          label = 'شلیک به نقطه'; break;
        }
        case 'patrol': sq.order = { type: 'patrol', a: { x: cxm, y: cym }, b: { x: pt.x, y: pt.y }, leg: 1, wait: 0, x: pt.x, y: pt.y }; assignPosts(sq, pt.x, pt.y, h, 'column'); label = 'گشت‌زنی'; break;
        case 'cover': {
          const who = (prev.type === 'cover' && prev.who === 'cmd' && alive(G.squads.alpha).length) ? 'alpha' : 'cmd';
          sq.order = { type: 'cover', who, dir: cmd.heading + Math.PI, t: 0 }; label = who === 'cmd' ? 'کاور فرمانده' : 'کاور نیروهای ویژه'; break;
        }
        case 'distract': {
          let best = null, bd = 1e9; for (const u of ms) { if (u.lures <= 0) continue; const d = Math.hypot(u.x - pt.x, u.y - pt.y); if (d < bd) { bd = d; best = u; } }
          if (!best) { G.msg('دلتا: طعمه‌ای باقی نمانده!', '#ff6b6b'); return; }
          best.task = { type: 'lure', x: pt.x, y: pt.y, t: 0 }; G.msg(`${best.name}: طعمه می‌اندازم تا حواسشان پرت شود.`, sq.color); G.audio.play('radio'); G.markers.push({ x: pt.x, y: pt.y, t: 1.2, c: sq.color }); continue;
        }
      }
      sq.label = label;
      if (pt && G.PTCMD[id]) G.markers.push({ x: pt.x, y: pt.y, t: 1.2, c: sq.color });
      G.msg(`${sq.short}: ${label} — ${ACK[(Math.random() * ACK.length) | 0]}`, sq.color);
    }
    G.audio.play('radio');
  };

  /* ---------- ناوبری ---------- */
  function navTo(u, gx, gy, dt, spd) {
    const n = u.nav, d = Math.hypot(gx - u.x, gy - u.y);
    if (d < 4) return true;
    n.t -= dt; let tx = gx, ty = gy;
    if (n.direct === undefined || n.t <= 0 || Math.hypot(gx - n.gx, gy - n.gy) > 40) {
      n.t = .45 + Math.random() * .3; n.gx = gx; n.gy = gy;
      n.direct = G.walkLine(u.x, u.y, gx, gy);
      if (!n.direct) { n.path = G.findPath(u.x, u.y, gx, gy); n.i = 0; }
      // تشخیص گیر کردن
      if (Math.hypot(u.x - n.lx, u.y - n.ly) < 3) n.stuck++; else n.stuck = 0; n.lx = u.x; n.ly = u.y;
      if (n.stuck > 3) { G.moveEnt(u, G.rand(-6, 6), G.rand(-6, 6)); n.stuck = 0; }
    }
    if (!n.direct) {
      const p = n.path; if (!p || !p.length) return false;
      while (n.i < p.length - 1 && Math.hypot(p[n.i].x - u.x, p[n.i].y - u.y) < 14) n.i++;
      if (n.i < p.length - 1 && G.walkLine(u.x, u.y, p[n.i + 1].x, p[n.i + 1].y)) n.i++;
      tx = p[n.i].x; ty = p[n.i].y;
      if (n.i === p.length - 1 && Math.hypot(tx - u.x, ty - u.y) < 16 && G.walkLine(u.x, u.y, gx, gy)) { tx = gx; ty = gy; }
      else if (n.i === p.length - 1 && Math.hypot(tx - u.x, ty - u.y) < 5) return true;
    }
    const dx = tx - u.x, dy = ty - u.y, dd = Math.hypot(dx, dy) || 1, st = Math.min(spd * dt, dd);
    G.moveEnt(u, dx / dd * st, dy / dd * st); u.moving = true; u.mvAng = Math.atan2(dy, dx);
    return true;
  }
  G.navTo = navTo;

  function friendNear(x, y, r) { for (const s of G.soldiers) { if (!s.dead && Math.hypot(s.x - x, s.y - y) < r) return true; } return false; }
  function cluster(z, r) { let n = 0; for (const o of G.zActive) if (!o.dead && Math.hypot(o.x - z.x, o.y - z.y) < r) n++; return n; }
  const BIG = { gluttony: 1, pride: 1, lust: 1 };

  /* ---------- انتخاب هدف ---------- */
  function pickTarget(u, sq) {
    const o = sq.order, P = u.weapons[0].def;
    const stance = o.type === 'cover' || o.type === 'post' || o.type === 'firesup' || o.type === 'fireat';
    const maxR = Math.max(P.expl ? 520 : P.range, 420), quietR = sq.holdFire ? 95 : (stance ? 540 : 430);
    const cands = [];
    for (const z of G.zActive) {
      if (z.dead || z.form === 'sloth') continue;
      const d = dist(u, z); if (d > maxR) continue;
      const hot = z.alert > 0 || z.tgt;
      if (sq.holdFire) { if (d > (hot ? 170 : 95)) continue; } else if (!hot && d > quietR) continue;
      let sc = d;
      if (z === u.target) sc -= 50;
      if (z.tgt === u) sc -= 70;
      if (d < 90) sc -= 150;
      if ((P.cls.indexOf('تیرانداز') >= 0) && BIG[z.form]) sc -= 260;
      if (P.expl && BIG[z.form]) sc -= 200;
      if (z.form === 'lust' && (o.type === 'sd' || o.type === 'assault' || o.type === 'clear')) sc -= 120;
      if (o.type === 'cover') { const c = o.who === 'cmd' ? G.cmd : (alive(G.squads.alpha)[0] || G.cmd); sc = sc * .4 + Math.hypot(z.x - c.x, z.y - c.y) * .9; }
      if (u.face != null && o.kind === 'defend' && Math.abs(G.angDiff(u.face, Math.atan2(z.y - u.y, z.x - u.x))) < 1.1) sc -= 80;
      cands.push({ z, sc });
    }
    cands.sort((a, b) => a.sc - b.sc);
    u.target = null; let fb = null;
    for (let i = 0; i < cands.length && i < 5; i++) { const z = cands[i].z; if (!G.losClear(u.x, u.y, z.x, z.y)) continue; if (!G.objBlocks(u.x, u.y, z.x, z.y)) { u.target = z; fb = null; break; } if (!fb) fb = z; }
    if (fb) u.target = fb; // اگر همه پشت مانع‌اند، مانع را می‌کوبد
  }
  function findHunt(u, cx, cy, R, selfR) {
    let best = null, bs = 1e9;
    for (const z of G.zombies) {
      if (z.dead || z.form === 'sloth' || (z.noPathT || 0) > G.time) continue;
      if (Math.hypot(z.x - cx, z.y - cy) > R) continue;
      let d = dist(u, z); if (selfR && d > selfR) continue; if (z.form === 'lust') d *= .6;
      if (d < bs) { bs = d; best = z; }
    }
    return best;
  }

  /* ---------- نبرد ---------- */
  function usable(u, w, t, d, forced) {
    const D = w.def;
    if (w.mag <= 0 && w.res === 0) return false;
    if (D.expl) {
      if (d < D.radius + 55 || d > D.range) return false;
      if (friendNear(t.x, t.y, D.radius + 45)) return false;
      if (!forced && !BIG[t.form] && cluster(t, D.radius) < (D.proj === 'rocket' ? 4 : 3)) return false;
      return true;
    }
    if (d > D.range) return false;
    if (D.name === 'M24' && d < 100) return false;
    return true;
  }
  function combat(u, dt, sq) {
    const t = u.target, P = u.weapons[0], S = u.weapons[1];
    if (!t || t.dead) {
      if (u.moving) u.ang = G.turn(u.ang, u.mvAng, 9 * dt); else if (u.face != null) u.ang = G.turn(u.ang, u.face, 5 * dt);
      if (P.rel <= 0 && P.mag < P.def.mag * .5 && P.res !== 0) G.startReload(u, P);
      if (S.rel <= 0 && S.mag < S.def.mag && S.res !== 0 && P.rel <= 0) G.startReload(u, S);
      if (P.mag > 0 || P.rel > 0) u.cur = 0;
      return;
    }
    const d = dist(u, t), a = Math.atan2(t.y - u.y, t.x - u.x);
    u.ang = G.turn(u.ang, a, 11 * dt);
    let wi = -1;
    if (d < 36 + t.r) wi = 2;
    else if (usable(u, P, t, d) && !(P.rel > 0 && d < 230 && usable(u, S, t, d) && S.mag > 0)) wi = 0;
    else if (usable(u, S, t, d)) wi = 1;
    else if (d < 60 + t.r) wi = 2;
    if (u.grenades > 0 && u.gcd <= 0 && d > 150 && d < 350 && !sq.holdFire && (cluster(t, 95) >= 5 || (BIG[t.form] && t.hp > 200)) && !friendNear(t.x, t.y, 135)) {
      G.throwItem(u, t.x, t.y, 'frag'); u.gcd = 7; return;
    }
    if (wi < 0) { if (P.mag <= 0) G.startReload(u, P); if (S.mag <= 0) G.startReload(u, S); return; }
    u.cur = wi; const w = u.weapons[wi];
    if (w.mag <= 0 && !w.def.melee) { G.startReload(u, w); return; }
    if (Math.abs(G.angDiff(u.ang, a)) < .16) G.fire(u, u.ang, t.x, t.y);
  }

  /* ---------- وظایف فردی ---------- */
  function runTask(u, dt, spd) {
    const k = u.task;
    if (k.type === 'revive') {
      const w = k.who; if (w.dead || !w.downed) { u.task = null; return false; }
      if (dist(u, w) > 28) { if (!navTo(u, w.x, w.y, dt, spd * 1.25)) u.task = null; k.t = 0; }
      else { k.t += dt; u.reviving = true; if (k.t >= 3) { G.revive(w, u); u.task = null; } }
      return true;
    }
    if (k.type === 'lure') {
      k.t += dt; const d = Math.hypot(k.x - u.x, k.y - u.y);
      if ((d > 340 || !G.losClear(u.x, u.y, k.x, k.y, true)) && k.t < 14) { if (!navTo(u, k.x, k.y, dt, spd * 1.2)) k.t = 99; }
      else { G.throwItem(u, k.x, k.y, 'lure'); u.task = null; }
      return true;
    }
    u.task = null; return false;
  }
  G.killSoldier = function (s) {
    if (s.dead) return;
    G.fx.burst(s.x, s.y - 8, '#0b0b10', 26, 170, .7, 4); G.fx.ring(s.x, s.y, 54, '#1a0f2a');
    s.hp = 0; s.downed = true; s.bleed = 0; s.target = null; s.task = null;
  };
  G.revive = function (w, by) {
    w.downed = false; w.hp = Math.round(w.maxHp * .45); w.bleed = 0;
    G.msg(`${w.name} احیا شد${by && !by.isCmd ? ' (توسط ' + by.name + ')' : ''}.`, '#7dffb0'); G.stats.revives++;
  };
  function medicCheck(u) {
    if (G.noRevive) return;
    let best = null, bd = 520;
    for (const s of G.soldiers) { if (s === u || s.dead || !s.downed || s.isCmd) continue; const d = dist(u, s); if (d < bd && !G.soldiers.some(o => o !== u && o.task && o.task.type === 'revive' && o.task.who === s)) { bd = d; best = s; } }
    if (best) { u.task = { type: 'revive', who: best, t: 0 }; G.msg(`${u.name}: دارم میام سراغ ${best.name}!`, '#7dffb0'); }
  }

  /* ---------- حرکت شکاری (حمله/پاکسازی/جستجو) ---------- */
  function huntMove(u, dt, spd, z) {
    const d = dist(u, z), P = u.weapons[0].def, pref = G.clamp((P.expl ? 300 : P.range) * .45, 80, 250);
    const vis = u.target === z || (u.target && !u.target.dead);
    const tz = u.target && !u.target.dead ? u.target : z, td = dist(u, tz);
    if (vis) {
      if (td > pref) navTo(u, tz.x, tz.y, dt, spd);
      else if (td < 62 && tz.form !== 'lust') { const a = Math.atan2(u.y - tz.y, u.x - tz.x); G.moveEnt(u, Math.cos(a) * spd * .7 * dt, Math.sin(a) * spd * .7 * dt); u.moving = true; u.mvAng = a + Math.PI; }
    } else if (d > 40) { if (!navTo(u, z.x, z.y, dt, spd)) { z.noPathT = G.time + 8; u.hunt = null; } }
  }

  /* ---------- هوش سرباز ---------- */
  function aiSoldier(u, dt) {
    const sq = G.squads[u.squad], o = sq.order, cmd = G.cmd;
    u.thinkT -= dt; u.moving = false; u.reviving = false;
    if (u.thinkT <= 0) {
      u.thinkT = .16 + Math.random() * .12; pickTarget(u, sq);
      if (u.medic && !u.task) medicCheck(u);
      if (u.hunt && u.hunt.dead) u.hunt = null;
    }
    if (u.target && u.target.dead) u.target = null;
    if (u.gcd > 0) u.gcd -= dt;
    const spd = u.speed * u.slow;
    for (const p of G.pools) { const d = Math.hypot(u.x - p.x, u.y - p.y); if (d < p.r + 14) { const a = d > 1 ? Math.atan2(u.y - p.y, u.x - p.x) : u.ang + Math.PI; G.moveEnt(u, Math.cos(a) * spd * 1.3 * dt, Math.sin(a) * spd * 1.3 * dt); u.moving = true; u.mvAng = a; combat(u, dt, sq); return; } }
    if (u.task && runTask(u, dt, spd)) { if (!u.reviving) combat(u, dt, sq); return; }
    switch (o.type) {
      case 'follow': case 'regroup': case 'cover': {
        const ms = alive(sq), i = ms.indexOf(u), n = ms.length; let p;
        if (o.type === 'cover') {
          const c = o.who === 'cmd' ? cmd : (alive(G.squads.alpha)[0] || cmd);
          p = fixSlot(slotAt(c.x + Math.cos(o.dir) * 120, c.y + Math.sin(o.dir) * 120, o.dir + Math.PI, 'line', sq.key, i, n, -34), c.x, c.y);
          u.face = o.dir + Math.PI;
        } else { p = fixSlot(slotAt(cmd.x, cmd.y, cmd.heading, sq.form, sq.key, i, n, extraBackFor(sq, sq.form)), cmd.x, cmd.y); u.face = p.face; }
        const d = Math.hypot(p.x - u.x, p.y - u.y);
        if (d > (cmd.moving ? 10 : 20)) navTo(u, p.x, p.y, dt, spd * (o.type === 'regroup' || d > 150 ? 1.45 : d > 60 ? 1.12 : .95));
        break;
      }
      case 'post': case 'patrol': { const d = Math.hypot(u.sx - u.x, u.sy - u.y); if (d > 8) navTo(u, u.sx, u.sy, dt, spd * (o.type === 'patrol' ? .7 : 1.1)); break; }
      case 'assault': case 'clear': case 'sd': {
        if (!u.hunt || u.hunt.dead) {
          if (o.type === 'assault') u.hunt = findHunt(u, u.x, u.y, 400) || (Math.hypot(u.x - o.x, u.y - o.y) < 260 ? findHunt(u, o.x, o.y, 330) : null);
          else if (o.type === 'clear') u.hunt = findHunt(u, o.x, o.y, o.R);
          else u.hunt = findHunt(u, o.x, o.y, o.R) || findHunt(u, u.x, u.y, 450);
        }
        if (u.hunt) { huntMove(u, dt, spd * 1.1, u.hunt); break; }
        if (u.target) { huntMove(u, dt, spd, u.target); break; }
        if (o.type === 'clear' && u.wps && u.wps.length) {
          const w = u.wps[0]; if (Math.hypot(w.x - u.x, w.y - u.y) < 30 || !navTo(u, w.x, w.y, dt, spd)) u.wps.shift();
        } else if (o.type !== 'sd') { const d = Math.hypot(u.sx - u.x, u.sy - u.y); if (d > 10) navTo(u, u.sx, u.sy, dt, spd * 1.1); }
        break;
      }
      case 'fireat': {
        const zt = findHunt(u, o.x, o.y, 90);
        if (zt) { u.target = zt; if (dist(u, zt) > 380 || !G.losClear(u.x, u.y, zt.x, zt.y)) navTo(u, zt.x, zt.y, dt, spd); break; }
        const P = u.weapons[0].def.expl ? (u.weapons[1].def.expl ? -1 : 1) : 0;
        if (P < 0) break;
        const d = Math.hypot(o.x - u.x, o.y - u.y), ld = d || 1, w = u.weapons[P], rng = Math.min(w.def.range - 40, 480);
        const los = G.losClear(u.x, u.y, o.x - (o.x - u.x) / ld * 24, o.y - (o.y - u.y) / ld * 24, true);
        if (d > rng || !los) { navTo(u, o.x, o.y, dt, spd * 1.1); break; }
        const a = Math.atan2(o.y - u.y, o.x - u.x); u.ang = G.turn(u.ang, a, 10 * dt); u.target = null; u.cur = P;
        if (Math.abs(G.angDiff(u.ang, a)) < .1) {
          if (w.mag <= 0) G.startReload(u, w);
          else if (G.fire(u, u.ang, o.x, o.y)) { o.shots++; const b = G.map.block[o.tile]; if (o.tile >= 0 && b && !G.SOLID[b]) G.damageTile(o.tile, w.def.dmg * (w.def.pellets || 1) * .7, false); }
        }
        return;
      }
      case 'destroy': case 'firesup': {
        const d = Math.hypot(o.x - u.x, o.y - u.y);
        const ex = u.weapons[0].def.expl ? 0 : u.weapons[1].def.expl ? 1 : -1;
        const can = (ex >= 0 && (u.weapons[ex].mag > 0 || u.weapons[ex].res !== 0)) || (o.type === 'destroy' && u.grenades > 0);
        if (!can) { if (o.type === 'destroy' && d > 240) navTo(u, o.x, o.y, dt, spd); break; }
        const reach = ex >= 0 ? Math.min(u.weapons[ex].def.range - 40, 420) : 320;
        const ld = Math.hypot(o.x - u.x, o.y - u.y) || 1, los = G.losClear(u.x, u.y, o.x - (o.x - u.x) / ld * 24, o.y - (o.y - u.y) / ld * 24, true);
        if (d > reach || !los) { navTo(u, o.x, o.y, dt, spd * 1.1); break; }
        const minD = (ex >= 0 ? u.weapons[ex].def.radius : 105) + 60;
        if (d < minD) { const a = Math.atan2(u.y - o.y, u.x - o.x); G.moveEnt(u, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt); u.moving = true; u.mvAng = a; break; }
        const a = Math.atan2(o.y - u.y, o.x - u.x); u.ang = G.turn(u.ang, a, 10 * dt); u.target = null;
        if (Math.abs(G.angDiff(u.ang, a)) < .08 && !friendNear(o.x, o.y, minD - 20)) {
          if (ex >= 0) { u.cur = ex; const w = u.weapons[ex]; if (w.mag <= 0) G.startReload(u, w); else if (G.fire(u, u.ang, o.x, o.y)) { u.supShots = (u.supShots || 0) + 1; o.shots++; } }
          else if (u.gcd <= 0 && G.throwItem(u, o.x, o.y, 'frag')) { u.gcd = 2.2; o.shots++; }
        }
        return;
      }
    }
    combat(u, dt, sq);
  }

  function restorePrev(sq, o, ms) {
    const p = o.prev && o.prev.type !== 'destroy' && o.prev.type !== 'firesup' && o.prev.type !== 'fireat' ? o.prev : { type: 'follow' };
    if (p.type === 'post' || p.type === 'follow' || p.type === 'cover') { sq.order = p; sq.label = p.type === 'follow' ? 'دنبال فرمانده' : p.type === 'cover' ? 'کاور' : 'استقرار'; }
    else { sq.order = { type: 'post', kind: 'hold', x: ms[0].x, y: ms[0].y }; ms.forEach(u => { u.sx = u.x; u.sy = u.y; }); sq.label = 'ایست'; }
    G.audio.play('radio');
  }

  /* ---------- به‌روزرسانی جوخه ---------- */
  function squadUpdate(sq, dt) {
    const o = sq.order, ms = alive(sq), cmd = G.cmd; if (!ms.length) return;
    if (o.type === 'regroup') { if (ms.every(u => dist(u, cmd) < 150)) { sq.order = { type: 'follow' }; sq.label = 'دنبال فرمانده'; } }
    else if (o.type === 'patrol') {
      const tgt = o.leg ? o.b : o.a;
      if (ms.every(u => Math.hypot(u.sx - u.x, u.sy - u.y) < 46)) { o.wait += dt; if (o.wait > 2.5) { o.wait = 0; o.leg = 1 - o.leg; const n = o.leg ? o.b : o.a; assignPosts(sq, n.x, n.y, Math.atan2(n.y - tgt.y, n.x - tgt.x), 'column'); } }
    }
    else if (o.type === 'clear') {
      o.t += dt;
      if (o.t > 1.5 && ms.every(u => !u.wps || !u.wps.length) && !findHunt(ms[0], o.x, o.y, o.R)) {
        G.msg(`${sq.short}: منطقه پاک شد.`, sq.color); sq.order = { type: 'post', kind: 'move', x: o.x, y: o.y, h: o.h }; sq.label = 'استقرار پس از پاکسازی'; G.audio.play('radio');
      }
    }
    else if (o.type === 'sd') {
      if (ms.some(u => u.hunt || u.target)) o.idle = 0; else o.idle += dt;
      if (o.idle > 3) { G.msg(`${sq.short}: هدفی باقی نمانده؛ برمی‌گردیم.`, sq.color); sq.order = { type: 'follow' }; sq.label = 'دنبال فرمانده'; G.audio.play('radio'); }
    }
    else if (o.type === 'assault') {
      if (ms.every(u => Math.hypot(u.sx - u.x, u.sy - u.y) < 40) && !ms.some(u => u.hunt || u.target)) { sq.order = { type: 'post', kind: 'move', x: o.x, y: o.y, h: o.h }; sq.label = 'استقرار پس از حمله'; G.msg(`${sq.short}: موضع تصرف شد.`, sq.color); }
    }
    else if (o.type === 'fireat') {
      o.t += dt;
      const zNear = findHunt(ms[0], o.x, o.y, 90), broke = o.tile >= 0 && !G.map.block[o.tile];
      let end = o.t > 30 || broke || (o.tile < 0 && !zNear && o.shots >= 4 * ms.length);
      if (o.tile >= 0 && o.shots > 90) end = true;
      if (end) { if (broke) G.msg(`${sq.short}: مانع از بین رفت.`, sq.color); restorePrev(sq, o, ms); }
    }
    else if (o.type === 'destroy' || o.type === 'firesup') {
      o.t += dt; let end = false, ok = false;
      if (o.ent && !o.ent.dead) { o.x = o.ent.x; o.y = o.ent.y; }
      if (o.ent) {
        if (o.ent.dead) {
          let nx = null, bd = 80; for (const z of G.zombies) { if (z.dead || z.form !== o.ent.form) continue; const d = Math.hypot(z.x - o.x, z.y - o.y); if (d < bd && (z.form === 'sloth')) { bd = d; nx = z; } }
          if (nx) { o.ent = nx; o.x = nx.x; o.y = nx.y; } else { end = true; ok = true; }
        }
      } else if (o.tile >= 0) { if (!G.map.block[o.tile]) { end = true; ok = true; } else if (o.shots >= 14) end = true; } else if (o.shots >= (o.type === 'firesup' ? 3 : o.blast ? 2 : 4)) end = true;
      if (o.type === 'firesup' && !o.ent && o.t > 9) end = true;
      if (o.t > 40) end = true;
      const armed = ms.some(u => (u.weapons[0].def.expl && (u.weapons[0].mag > 0 || u.weapons[0].res !== 0)) || (u.weapons[1].def.expl && (u.weapons[1].mag > 0 || u.weapons[1].res !== 0)) || (o.type === 'destroy' && u.grenades > 0));
      if (!armed && !end) { end = true; G.msg(`${sq.short}: مهمات انفجاری تمام شد!`, '#ff6b6b'); }
      if (end) {
        if (ok) G.msg(`${sq.short}: هدف نابود شد.`, sq.color);
        const p = o.prev && o.prev.type !== 'destroy' && o.prev.type !== 'firesup' ? o.prev : { type: 'follow' };
        if (p.type === 'post' || p.type === 'follow' || p.type === 'cover') { sq.order = p; sq.label = p.type === 'follow' ? 'دنبال فرمانده' : p.type === 'cover' ? 'کاور' : 'استقرار'; }
        else { sq.order = { type: 'post', kind: 'hold', x: ms[0].x, y: ms[0].y }; ms.forEach(u => { u.sx = u.x; u.sy = u.y; }); sq.label = 'ایست'; }
        G.audio.play('radio');
      }
    }
    else if (o.type === 'cover') {
      o.t -= dt;
      if (o.t <= 0) {
        o.t = 1.2; const c = o.who === 'cmd' ? cmd : (alive(G.squads.alpha)[0] || cmd);
        let nz = null, bd = 520; for (const z of G.zActive) { if (z.dead || z.form === 'sloth') continue; const d = Math.hypot(z.x - c.x, z.y - c.y); if (d < bd) { bd = d; nz = z; } }
        o.dir = nz ? Math.atan2(c.y - nz.y, c.x - nz.x) : (o.who === 'cmd' ? cmd.heading + Math.PI : o.dir);
      }
    }
  }

  /* ---------- به‌روزرسانی همهٔ سربازان ---------- */
  G.updateSoldiers = function (dt) {
    const cmd = G.cmd;
    for (const sq of [G.squads.alpha, G.squads.delta]) squadUpdate(sq, dt);
    for (const u of G.soldiers) {
      if (u.dead) continue;
      if (u.hurtT > 0) u.hurtT -= dt; if (u.swing > 0) u.swing -= dt; if (u.flashT > 0) u.flashT -= dt;
      if (u.downed) { if (!u.isCmd) { u.bleed -= dt; if (u.bleed <= 0) { u.dead = true; G.stats.lost++; G.msg(`${u.name} کشته شد.`, '#ff4a3c'); G.fx.decal(u.x, u.y, 'blood', '#5a0d0d', 16); } } continue; }
      tickWeapons(u, dt);
      // هالهٔ کندکنندهٔ تنبلی
      u.slow = 1;
      for (const z of G.zActive) { if (!z.dead && z.form === 'sloth' && Math.hypot(z.x - u.x, z.y - u.y) < 95) { u.slow = .6; break; } }
      if (!u.isCmd) {
        aiSoldier(u, dt);
        if (u.medic && !u.moving) { u.healT -= dt; if (u.healT <= 0) { u.healT = .5; for (const s of G.soldiers) if (!s.dead && !s.downed && s.hp < s.maxHp * .8 && dist(u, s) < 70) { s.hp = Math.min(s.maxHp, s.hp + 4); if (Math.random() < .3) G.fx.burst(s.x, s.y - 14, '#7dffb0', 1, 20, .6, 2); } } }
      }
      if (u.moving) u.walk += dt * 11;
    }
    // جداسازی سربازان
    const S = G.soldiers;
    for (let i = 0; i < S.length; i++) {
      const a = S[i]; if (a.dead || a.downed) continue;
      for (let j = i + 1; j < S.length; j++) {
        const b = S[j]; if (b.dead || b.downed) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d >= 19 || d < .01) continue;
        const p = (19 - d) * .5, ux = dx / d, uy = dy / d;
        if (a.isCmd) G.moveEnt(b, ux * p * 2, uy * p * 2); else if (b.isCmd) G.moveEnt(a, -ux * p * 2, -uy * p * 2);
        else { G.moveEnt(a, -ux * p, -uy * p); G.moveEnt(b, ux * p, uy * p); }
      }
    }
  };
})();
