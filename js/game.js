'use strict';
/* حلقهٔ بازی، کنترل فرمانده و منطق ماموریت */
(function () {
  const T = G.T;
  const DIFFS = [{ count: .7, hp: .85, dmg: .7, name: 'آسان' }, { count: 1, hp: 1, dmg: 1, name: 'عادی' }, { count: 1.35, hp: 1.2, dmg: 1.3, name: 'سخت' }];
  G.DIFFS = DIFFS;
  G.state = 'menu'; G.time = 0; G.zombies = []; G.zActive = []; G.soldiers = []; G.projs = []; G.pools = []; G.lures = []; G.markers = []; G.props = [];
  G.input = { mx: 0, my: 0, world: { x: 0, y: 0 }, moveX: 0, moveY: 0, fire: false, firePressed: false, sprint: false, keys: {}, eHeld: false, ePressed: false, aimStick: null };
  G.ui = G.ui || {};

  G.startMission = function (seed) {
    const st = G.settings; G.diff = DIFFS[st.diff];
    seed = seed || ((Math.random() * 1e9) | 0); G.seed = seed;
    G.map = G.genMap(seed); const m = G.map, S = m.sites, R = G.rng(seed ^ 0x5bd1e995);
    G.fx.reset(); G.time = 0; G.over = false; G.zombies = []; G.zActive = []; G.projs = []; G.pools = []; G.lures = []; G.markers = []; G.props = [];
    G.stats = { kills: 0, byType: {}, score: 0, lost: 0, revives: 0, shots: 0 };
    G.mission = { samples: 0, coreArmed: false, fuse: 0, coreDead: false, extract: 0, exT: 0, waveT: 0, hold: 0, holdKind: null, prompt: '', heli: null, zone: 0 };
    const cmd = G.cmd = G.makeSoldier({ id: 0, x: S.lz.x, y: S.lz.y, hp: 160, squad: 'cmd', name: 'فرمانده', role: 'فرمانده', isCmd: true, color: '#ffe27a', p: st.cmd.p, s: st.cmd.s });
    cmd.heading = -Math.PI / 4; cmd.ang = cmd.heading;
    G.soldiers = [cmd]; G.squads = {}; let id = 1;
    for (const key of ['alpha', 'delta']) {
      const TM = G.TEAMS[key], n = st[key + 'N'], sq = G.squads[key] = { key, name: TM.name, short: TM.short, color: TM.color, members: [], order: { type: 'follow' }, form: 'wedge', label: 'دنبال فرمانده', holdFire: false };
      for (let i = 0; i < n; i++) {
        const r = TM.roles[i], a = (key === 'alpha' ? 2.4 : 3.9) + i * .32;
        const u = G.makeSoldier({ id: id++, x: S.lz.x + Math.cos(a) * 46, y: S.lz.y + Math.sin(a) * 46, hp: TM.hp, squad: key, idx: i, name: r.name, role: r.role, medic: r.medic, demo: r.demo, color: TM.color, p: st[key][i].p, s: st[key][i].s });
        sq.members.push(u); G.soldiers.push(u);
      }
    }
    G.populate(R);
    S.crates.forEach(k => G.props.push({ kind: 'crate', x: k.x, y: k.y, uses: k.uses }));
    S.samples.forEach(k => G.props.push({ kind: 'sample', x: k.x, y: k.y, zone: k.zone }));
    G.props.push({ kind: 'core', x: S.core.x, y: S.core.y }); G.props.push({ kind: 'beacon', x: S.ex.x, y: S.ex.y - 100 });
    G.buildMinimap(); G.view.x = cmd.x; G.view.y = cmd.y; G.dark = 0; G.zoneNow = 0; G.flowT = 0;
    G.state = 'play'; G.ui.onStart();
    G.msg('نیروها در منطقهٔ سبز پیاده شدند. نمونه‌ها را پیدا کن و هستهٔ ماده سیاه را نابود کن.', '#3ddc84');
    const zt = G.zoneTypes; G.msg(`گزارش شناسایی — زرد: ${zt[1].map(t => G.ZT[t].name).join('، ')}`, '#ffd23c'); G.msg(`قرمز: ${zt[2].map(t => G.ZT[t].name).join('، ')} | مشکی: هر هفت گناه`, '#ff4a3c');
  };

  G.objPoints = function () {
    const M = G.mission, S = G.map.sites, out = [];
    for (const p of G.props) if (p.kind === 'sample') out.push({ x: p.x, y: p.y, c: '#c9a0ff', t: 'نمونه' });
    if (!M.coreArmed) out.push({ x: S.core.x, y: S.core.y, c: '#ff6bd6', t: 'هسته' });
    if (M.coreDead || M.extract) out.push({ x: S.ex.x, y: S.ex.y, c: '#4db8ff', t: 'خروج' });
    return out;
  };
  G.objectives = function () {
    const M = G.mission;
    return [
      { t: `نمونه‌های ماده سیاه (${G.fa(M.samples)}/${G.fa(2)})`, done: M.samples >= 2 },
      { t: M.coreArmed && !M.coreDead ? `از هسته دور شو! انفجار تا ${G.fa(Math.ceil(M.fuse))} ثانیه` : 'خرج‌گذاری و نابودی هسته در منطقهٔ مشکی', done: M.coreDead },
      { t: M.extract === 1 ? `دفاع تا رسیدن بالگرد: ${G.fa(Math.ceil(M.exT))} ثانیه` : M.extract === 2 ? 'سوار بالگرد شو!' : 'فراخوانی بالگرد در منطقهٔ آبی و خروج', done: false },
    ];
  };

  function spawnRing(cx, cy, r0, r1, types, n) {
    const m = G.map; let made = 0;
    for (let k = 0; k < n * 30 && made < n; k++) {
      const a = Math.random() * 6.283, r = G.rand(r0, r1), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, i = G.tileAt(x, y);
      if (i < 0 || m.block[i] || m.dyn[i] || !m.reach[i] || G.boxBlocked(x, y, 12)) continue;
      const z = G.makeZombie(types[(Math.random() * types.length) | 0], x, y, m.zone[i]); z.alert = 60; z.active = true; G.zombies.push(z); G.zActive.push(z); made++;
    }
  }

  /* ---------- تعامل (E) ---------- */
  function interact(dt) {
    const M = G.mission, u = G.cmd, I = G.input, S = G.map.sites; let prompt = '', kind = null, tgt = null;
    for (const s of G.soldiers) if (s.downed && !s.dead && !s.isCmd && G.dist(s, u) < 36) { kind = 'revive'; tgt = s; prompt = `E را نگه دار: احیای ${s.name}`; break; }
    if (!kind) for (const p of G.props) {
      const d = G.dist(p, u);
      if (p.kind === 'sample' && d < 40) { kind = 'sample'; tgt = p; prompt = 'E: برداشتن نمونهٔ ماده سیاه'; break; }
      if (p.kind === 'crate' && d < 46 && p.uses > 0) { kind = 'crate'; tgt = p; prompt = 'E: جعبهٔ تدارکات (مهمات و تعویض سلاح)'; break; }
      if (p.kind === 'core' && d < 120 && !M.coreArmed) { kind = 'core'; tgt = p; prompt = 'E را نگه دار: کار گذاشتن خرج انفجاری روی هسته'; break; }
      if (p.kind === 'beacon' && d < 56 && M.extract === 0) { kind = 'beacon'; tgt = p; prompt = M.coreDead ? 'E: فراخوانی بالگرد خروج' : 'E: فراخوانی بالگرد (ماموریت ناتمام می‌ماند!)'; break; }
    }
    if (M.extract === 2 && Math.hypot(u.x - S.ex.x, u.y - S.ex.y) < 120) prompt = 'در حال سوار شدن...';
    if (kind !== M.holdKind) { M.hold = 0; M.holdKind = kind; }
    const need = kind === 'revive' ? 2.5 : kind === 'core' ? 5 : 0;
    if (kind && need && I.eHeld) {
      M.hold += dt; prompt += ` ${G.fa(Math.round(M.hold / need * 100))}٪`;
      if (M.hold >= need) {
        M.hold = 0;
        if (kind === 'revive') G.revive(tgt, u);
        else { M.coreArmed = true; M.fuse = 25; G.msg('خرج کار گذاشته شد! ۲۵ ثانیه تا انفجار — فوراً دور شوید!', '#ff6bd6'); G.audio.play('alarm'); for (const z of G.zombies) if (z.zone === 3) z.alert = Math.max(z.alert, 40); }
      }
    } else if (need) M.hold = Math.max(0, M.hold - dt * 2);
    if (kind && !need && I.ePressed) {
      if (kind === 'sample') { M.samples++; G.props.splice(G.props.indexOf(tgt), 1); G.stats.score += 150; G.msg(`نمونه برداشته شد (${G.fa(M.samples)}/۲).`, '#c9a0ff'); G.audio.play('ui'); G.noise(u.x, u.y, 500); }
      else if (kind === 'crate') { tgt.uses--; G.resupply(tgt); G.ui.openArmory(); }
      else if (kind === 'beacon') { M.extract = 1; M.exT = 75; M.waveT = 2; G.msg('بالگرد در راه است! ۷۵ ثانیه از منطقهٔ فرود دفاع کنید.', '#4db8ff'); G.audio.play('alarm'); }
    }
    I.ePressed = false; M.prompt = prompt;
  }
  G.resupply = function (crate) {
    let n = 0;
    for (const s of G.soldiers) {
      if (s.dead || G.dist(s, crate) > 380) continue; n++;
      for (const w of s.weapons) { w.mag = w.def.mag; w.res = w.maxRes; w.rel = 0; }
      s.grenades = s.isCmd || s.demo ? 4 : 2; s.lures = s.isCmd ? 2 : 3; if (s.isCmd) s.medkits = 3;
      if (!s.downed) s.hp = Math.min(s.maxHp, s.hp + s.maxHp * .35);
    }
    G.msg(`تدارکات: مهمات و تجهیزات ${G.fa(n)} نفر تکمیل شد.`, '#ffe27a'); G.audio.play('reload');
  };
  G.setCmdWeapon = function (slot, id) { const u = G.cmd; u.weapons[slot] = G.mkW(id, true); if (slot === 0) G.settings.cmd.p = id; else G.settings.cmd.s = id; G.saveSettings(); };

  /* ---------- اقدام‌های فرمانده ---------- */
  G.cmdAct = function (a) {
    const u = G.cmd, I = G.input; if (G.state !== 'play' || u.downed) return;
    if (a === 'reload') G.startReload(u);
    else if (a === 'swap') { u.cur = (u.cur + 1) % 3; G.audio.play('reload'); }
    else if (a === 'swapBack') { u.cur = (u.cur + 2) % 3; G.audio.play('reload'); }
    else if (a === 'frag') { if (!G.throwItem(u, I.world.x, I.world.y, 'frag')) G.msg('نارنجک نداری!', '#ff6b6b'); }
    else if (a === 'lure') { if (!G.throwItem(u, I.world.x, I.world.y, 'lure')) G.msg('طعمه نداری!', '#ff6b6b'); }
    else if (a === 'knife') G.melee(u, u.ang);
    else if (a === 'med') { if (u.medkits > 0 && u.hp < u.maxHp) { u.medkits--; u.hp = Math.min(u.maxHp, u.hp + 70); G.msg('کیت درمان استفاده شد.', '#7dffb0'); G.audio.play('ui'); } }
  };
  function updateCmd(dt) {
    const u = G.cmd, I = G.input; if (u.downed) return;
    const K = I.keys; let mx = I.moveX, my = I.moveY;
    if (K.KeyW || K.ArrowUp) my -= 1; if (K.KeyS || K.ArrowDown) my += 1; if (K.KeyA || K.ArrowLeft) mx -= 1; if (K.KeyD || K.ArrowRight) mx += 1;
    const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    let grab = 1; for (const z of G.zActive) { if (!z.dead && Math.hypot(z.x - u.x, z.y - u.y) < z.r + 8 && G.ZT[z.form].speed > 0) { grab = .6; break; } }
    const sprint = (K.ShiftLeft || K.ShiftRight || I.sprint) && ml > .1 && u.stamina > .03;
    u.moving = ml > .1;
    if (u.moving) { const sp = u.speed * (sprint ? 1.55 : 1) * u.slow * grab; G.moveEnt(u, mx * sp * dt, my * sp * dt); u.heading = G.turn(u.heading, Math.atan2(my, mx), 5 * dt); u.mvAng = Math.atan2(my, mx); }
    u.stamina = G.clamp(u.stamina + (sprint ? -dt / 6 : dt / 7), 0, 1); u.sprinting = sprint;
    if (I.aimStick) { u.ang = Math.atan2(I.aimStick.y, I.aimStick.x); const mg = Math.hypot(I.aimStick.x, I.aimStick.y); I.world.x = u.x + Math.cos(u.ang) * (70 + mg * 230); I.world.y = u.y + Math.sin(u.ang) * (70 + mg * 230); }
    else if (!G.touch) { const w = G.screenToWorld(I.mx, I.my); I.world.x = w.x; I.world.y = w.y + 9; u.ang = Math.atan2(I.world.y - u.y, I.world.x - u.x); }
    else if (u.moving) { u.ang = G.turn(u.ang, u.mvAng, 8 * dt); I.world.x = u.x + Math.cos(u.ang) * 150; I.world.y = u.y + Math.sin(u.ang) * 150; }
    if (u.fired > 0) u.fired -= dt;
    const w = G.wOf(u);
    if (I.fire && !G.ui.targeting && (w.def.auto || I.firePressed)) { if (G.fire(u, u.ang, I.world.x, I.world.y)) G.stats.shots++; }
    if (w.mag <= 0 && !w.def.melee && w.rel <= 0 && w.res !== 0) G.startReload(u, w);
    I.firePressed = false;
  }

  /* ---------- ماموریت ---------- */
  function updateMission(dt) {
    const M = G.mission, S = G.map.sites, u = G.cmd, m = G.map;
    const zn = G.zoneAt(u.x, u.y);
    if (zn !== G.zoneNow) { G.zoneNow = zn; G.ui.banner(G.ZONES[zn].name, G.ZONES[zn].color, zn >= 1 && zn <= 3 ? 'گناهان این منطقه: ' + G.zoneTypes[zn].map(t => G.ZT[t].name).join('، ') : zn === 4 ? 'محل خروج نیروها' : 'محل پیاده‌سازی — تقریباً امن'); }
    G.dark = G.lerp(G.dark, G.ZONES[zn].dark, dt * 1.5);
    if (M.coreArmed && !M.coreDead) {
      M.fuse -= dt; if (((M.fuse * 2) | 0) !== (((M.fuse + dt) * 2) | 0) && M.fuse < 10) G.audio.play('beep', G.dist(u, S.core));
      if (M.fuse <= 0) {
        M.coreDead = true; for (const [x, y] of m.coreTiles) m.block[y * m.w + x] = 0;
        for (let k = 0; k < 7; k++) G.explode(S.core.x + G.rand(-90, 90), S.core.y + G.rand(-70, 70), 240, 900, null);
        G.fx.shake(26); G.stats.score += 1000;
        for (const z of G.zombies) if (z.zone >= 2) z.alert = 70;
        spawnRing(S.core.x, S.core.y, 380, 620, ['wrath', 'wrath', 'greed', 'envy'], Math.round(26 * G.diff.count));
        G.msg('هسته نابود شد! ماده سیاه به خروش آمده — به منطقهٔ آبی برو و بالگرد را فرا بخوان!', '#ff6bd6'); G.ui.banner('هسته نابود شد', '#ff6bd6', 'خودت را به منطقهٔ آبی برسان');
      }
    }
    if (M.extract === 1) {
      M.exT -= dt; M.waveT -= dt;
      if (M.waveT <= 0) { M.waveT = 8; const pool = M.exT < 35 ? ['wrath', 'wrath', 'greed', 'greed', 'envy', 'pride', 'gluttony'] : ['wrath', 'wrath', 'greed', 'greed', 'envy']; spawnRing(S.ex.x, S.ex.y, 560, 820, pool, Math.round((7 + (75 - M.exT) / 9) * G.diff.count)); }
      if (M.exT <= 9 && !M.heli) { M.heli = { kind: 'heli', x: S.ex.x, y: S.ex.y, z: 520 }; G.props.push(M.heli); G.msg('بالگرد رسید! همه به محل فرود!', '#4db8ff'); }
      if (M.exT <= 0) { M.extract = 2; G.ui.banner('بالگرد فرود آمد', '#4db8ff', 'فرمانده را به محل فرود برسان'); }
    }
    if (M.heli) M.heli.z = Math.max(8, M.heli.z - dt * 60);
    if (M.extract === 2 && Math.hypot(u.x - S.ex.x, u.y - S.ex.y) < 120) { M.boardT = (M.boardT || 0) + dt; if (M.boardT > 2) G.endMission(true, M.coreDead ? 'ماموریت با موفقیت انجام شد.' : 'خروج انجام شد ولی هسته نابود نشد.'); } else M.boardT = 0;
  }
  G.endMission = function (win, reason) {
    if (G.over) return; G.over = true; G.overT = 1.6; G.result = { win, reason };
  };

  /* ---------- حلقه ---------- */
  function update(dt) {
    G.time += dt;
    if (G.over) { G.overT -= dt; if (G.overT <= 0) { G.state = 'end'; G.ui.showEnd(); return; } }
    G.flowT -= dt;
    if (G.flowT <= 0) { G.flowT = .35; G.computeFlow(G.soldiers.filter(s => !s.dead && !s.downed)); }
    updateCmd(dt); interact(dt);
    G.updateSoldiers(dt); G.updateZombies(dt); G.updateProjs(dt); updateMission(dt);
    for (let i = G.markers.length - 1; i >= 0; i--) if ((G.markers[i].t -= dt) <= 0) G.markers.splice(i, 1);
    G.fx.update(dt);
    const u = G.cmd, v = G.view, I = G.input, k = G.touch ? .22 : .16;
    const tx = u.x + G.clamp(I.world.x - u.x, -400, 400) * k, ty = u.y + G.clamp(I.world.y - u.y, -300, 300) * k;
    v.x = G.lerp(v.x, tx, Math.min(1, dt * 7)); v.y = G.lerp(v.y, ty, Math.min(1, dt * 7));
    G.ui.tick(dt);
  }
  let last = 0;
  function frame(ts) {
    const dt = Math.min(.034, (ts - last) / 1000 || 0); last = ts;
    try {
      if (G.state === 'play') update(dt);
      if (G.map && G.state !== 'menu') G.render();
    } catch (e) { console.error(e); if (!G.crashed) { G.crashed = true; G.msg && G.msg('خطا: ' + e.message, '#ff6b6b'); } }
    requestAnimationFrame(frame);
  }
  G.boot = function () {
    G.settings = G.loadSettings(); G.initRender(document.getElementById('cv')); G.ui.init();
    window.addEventListener('resize', G.resize); requestAnimationFrame(frame);
  };
  G._update = update; // برای آزمون خودکار
})();
