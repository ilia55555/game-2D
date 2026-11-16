'use strict';
/* حلقهٔ بازی، کنترل فرمانده و بخش مشترک عملیات‌ها (منطق هر عملیات در missions.js) */
(function () {
  const DIFFS = [{ count: .7, hp: .85, dmg: .7, name: 'تازه‌کار' }, { count: 1, hp: 1, dmg: 1, name: 'کارکشته' }, { count: 1.35, hp: 1.2, dmg: 1.3, name: 'کهنه‌سرباز' }];
  G.DIFFS = DIFFS;
  G.state = 'menu'; G.time = 0; G.zombies = []; G.zActive = []; G.soldiers = []; G.projs = []; G.pools = []; G.lures = []; G.markers = []; G.props = [];
  G.input = { mx: 0, my: 0, world: { x: 0, y: 0 }, moveX: 0, moveY: 0, fire: false, firePressed: false, sprint: false, keys: {}, eHeld: false, ePressed: false, aimStick: null };
  G.ui = G.ui || {};
  G.ML = G.ML || {};

  G.startMission = function (id, seed) {
    const md = G.mdef = G.MISSIONS.find(m => m.id === id && !m.locked) || G.MISSIONS[0];
    const st = G.settings; G.diff = DIFFS[st.diff]; G.logic = G.ML[md.logic];
    seed = seed || ((Math.random() * 1e9) | 0); G.seed = seed;
    G.map = G.genMap(seed, md.map); const S = G.map.sites, R = G.rng(seed ^ 0x5bd1e995);
    G.fx.reset(); G.time = 0; G.over = false; G.zombies = []; G.zActive = []; G.projs = []; G.pools = []; G.lures = []; G.markers = []; G.props = [];
    G.squadDmg = 1; G.cmdDmg = 1; G.noRevive = false; G.cmdFloor = 0; G.dropT = 45;
    G.stats = { kills: 0, byType: {}, score: 0, lost: 0, revives: 0, shots: 0 };
    G.mission = { id: md.id, samples: 0, need: md.samples, coreArmed: false, fuse: 0, coreDead: false, extract: 0, exT: 0, waveT: 0, hold: 0, holdKind: null, prompt: '', heli: null, phase: 'go', doom: 0 };
    const cmd = G.cmd = G.makeSoldier({ id: 0, x: S.lz.x, y: S.lz.y, hp: 160, squad: 'cmd', name: 'فرمانده', role: 'فرمانده', isCmd: true, color: '#e8c15a', p: st.cmd.p, s: st.cmd.s });
    cmd.heading = -Math.PI / 4; cmd.ang = cmd.heading;
    G.soldiers = [cmd]; G.squads = {}; let sid = 1;
    for (const key of ['alpha', 'delta']) {
      const TM = G.TEAMS[key], n = st[key + 'N'], sq = G.squads[key] = { key, name: TM.name, short: TM.short, color: TM.color, members: [], order: { type: 'follow' }, form: 'wedge', label: 'دنبال فرمانده', holdFire: false };
      for (let i = 0; i < n; i++) {
        const r = TM.roles[i], a = (key === 'alpha' ? 2.4 : 3.9) + i * .32;
        const u = G.makeSoldier({ id: sid++, x: S.lz.x + Math.cos(a) * 46, y: S.lz.y + Math.sin(a) * 46, hp: TM.hp, squad: key, idx: i, name: r.name, role: r.role, medic: r.medic, demo: r.demo, color: TM.color, p: st[key][i].p, s: st[key][i].s });
        sq.members.push(u); G.soldiers.push(u);
      }
    }
    G.populate(R);
    S.crates.forEach(k => G.props.push({ kind: 'crate', x: k.x, y: k.y, uses: k.uses }));
    S.samples.forEach(k => G.props.push({ kind: 'sample', x: k.x, y: k.y, zone: k.zone }));
    G.props.push({ kind: 'core', x: S.core.x, y: S.core.y });
    if (G.logic.init) G.logic.init();
    G.buildMinimap(); G.view.x = cmd.x; G.view.y = cmd.y; G.dark = 0; G.zoneNow = -1; G.flowT = 0;
    G.state = 'play'; G.ui.onStart();
  };

  G.objPoints = () => G.logic.objPoints().concat(G.props.filter(p => p.kind === 'drop' && p.z <= 0 && p.uses > 0).map(p => ({ x: p.x, y: p.y, c: '#e8c15a', t: 'تدارکات' })));
  G.objectives = () => G.logic.objectives();
  G.zoneName = zn => (G.mdef.zones && G.mdef.zones[zn]) || G.ZONES[zn].name;

  G.spawnRing = function (cx, cy, r0, r1, types, n, burst) {
    const m = G.map, out = [];
    for (let k = 0; k < n * 30 && out.length < n; k++) {
      const a = Math.random() * 6.283, r = G.rand(r0, r1), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, i = G.tileAt(x, y);
      if (i < 0 || m.block[i] || m.dyn[i] || !m.reach[i] || G.boxBlocked(x, y, 12)) continue;
      const z = G.makeZombie(types[(Math.random() * types.length) | 0], x, y, m.zone[i]); z.alert = 60; z.active = true; G.zombies.push(z); G.zActive.push(z); out.push(z);
      if (burst) G.fx.burst(x, y - 6, '#0b0b10', 9, 90, .6, 3);
    }
    return out;
  };

  /* ---------- تعامل (E) ---------- */
  function interact(dt) {
    const M = G.mission, u = G.cmd, I = G.input, L = G.logic; let prompt = '', kind = null, tgt = null;
    if (!G.noRevive) for (const s of G.soldiers) if (s.downed && !s.dead && !s.isCmd && G.dist(s, u) < 36) { kind = 'revive'; tgt = s; prompt = `E  احیای ${s.name}`; break; }
    if (!kind) for (const p of G.props) {
      const d = G.dist(p, u);
      if (p.kind === 'sample' && d < 40) { kind = 'sample'; tgt = p; prompt = 'E  برداشتن نمونه'; break; }
      if (p.kind === 'drop' && p.z <= 0 && d < 46 && p.uses > 0) { kind = 'crate'; tgt = p; prompt = 'E  ایردراپ'; break; }
      if (p.kind === 'crate' && d < 46 && p.uses > 0) { kind = 'crate'; tgt = p; prompt = 'E  تدارکات'; break; }
      if (p.kind === 'core' && d < 120 && L.canArm()) { kind = 'core'; tgt = p; prompt = 'E  کار گذاشتن خرج'; break; }
      if (p.kind === 'beacon' && d < 56 && M.extract === 0) { kind = 'beacon'; tgt = p; prompt = 'E  فراخوانی بالگرد'; break; }
    }
    if (kind !== M.holdKind) { M.hold = 0; M.holdKind = kind; }
    const need = kind === 'revive' ? 2.5 : kind === 'core' ? 5 : 0;
    if (kind && need && I.eHeld) {
      M.hold += dt; prompt += `  ${G.fa(Math.round(M.hold / need * 100))}٪`;
      if (M.hold >= need) { M.hold = 0; if (kind === 'revive') G.revive(tgt, u); else L.onArm(); }
    } else if (need) M.hold = Math.max(0, M.hold - dt * 2);
    if (kind && !need && I.ePressed) {
      if (kind === 'sample') { M.samples++; G.props.splice(G.props.indexOf(tgt), 1); G.stats.score += 150; G.msg(`نمونه برداشته شد (${G.fa(M.samples)}/${G.fa(M.need)}).`, '#c9a0ff'); G.audio.play('ui'); G.noise(u.x, u.y, 500); if (L.onSample) L.onSample(); }
      else if (kind === 'crate') { tgt.uses--; G.resupply(tgt); G.ui.openArmory(); }
      else if (kind === 'beacon') L.onBeacon();
    }
    I.ePressed = false; M.prompt = L.prompt ? L.prompt(prompt) : prompt;
  }
  G.resupply = function (crate) {
    for (const s of G.soldiers) {
      if (s.dead || G.dist(s, crate) > 380) continue;
      for (const w of s.weapons) { w.mag = w.def.mag; w.res = w.maxRes; w.rel = 0; }
      s.grenades = s.isCmd || s.demo ? 4 : 2; s.lures = s.isCmd ? 2 : 3; if (s.isCmd) s.medkits = 3;
      if (!s.downed) s.hp = Math.min(s.maxHp, s.hp + s.maxHp * .35);
    }
    G.audio.play('reload');
  };
  G.setCmdWeapon = function (slot, id) { const u = G.cmd; u.weapons[slot] = G.mkW(id, true); if (slot === 0) G.settings.cmd.p = id; else G.settings.cmd.s = id; G.saveSettings(); };

  /* ---------- اقدام‌های فرمانده ---------- */
  G.cmdAct = function (a) {
    const u = G.cmd, I = G.input; if (G.state !== 'play' || u.downed) return;
    if (a === 'reload') G.startReload(u);
    else if (a === 'swap') { u.cur = (u.cur + 1) % 3; G.audio.play('reload'); }
    else if (a === 'swapBack') { u.cur = (u.cur + 2) % 3; G.audio.play('reload'); }
    else if (a === 'frag') G.throwItem(u, I.world.x, I.world.y, 'frag');
    else if (a === 'lure') G.throwItem(u, I.world.x, I.world.y, 'lure');
    else if (a === 'knife') G.melee(u, u.ang);
    else if (a === 'med') { if (u.medkits > 0 && u.hp < u.maxHp) { u.medkits--; u.hp = Math.min(u.maxHp, u.hp + 70); G.audio.play('ui'); } }
  };
  function updateCmd(dt) {
    const u = G.cmd, I = G.input; if (u.downed || u.boarded) return;
    const K = I.keys, wheel = G.ui.wheel && G.ui.wheel.open; let mx = I.moveX, my = I.moveY;
    if (K.KeyW || K.ArrowUp) my -= 1; if (K.KeyS || K.ArrowDown) my += 1; if (K.KeyA || K.ArrowLeft) mx -= 1; if (K.KeyD || K.ArrowRight) mx += 1;
    const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    let grab = 1; for (const z of G.zActive) { if (!z.dead && Math.hypot(z.x - u.x, z.y - u.y) < z.r + 8 && G.ZT[z.form].speed > 0) { grab = .6; break; } }
    const sprint = (K.ShiftLeft || K.ShiftRight || I.sprint) && ml > .1 && u.stamina > .03;
    u.moving = ml > .1;
    if (u.moving) { const sp = u.speed * (sprint ? 1.55 : 1) * u.slow * grab; G.moveEnt(u, mx * sp * dt, my * sp * dt); u.heading = G.turn(u.heading, Math.atan2(my, mx), 5 * dt); u.mvAng = Math.atan2(my, mx); }
    u.stamina = G.clamp(u.stamina + (sprint ? -dt / 6 : dt / 7), 0, 1); u.sprinting = sprint;
    if (wheel) { /* هنگام باز بودن چرخ فرمان نشانه‌گیری ثابت می‌ماند */ }
    else if (I.aimStick) { u.ang = Math.atan2(I.aimStick.y, I.aimStick.x); const mg = Math.hypot(I.aimStick.x, I.aimStick.y); I.world.x = u.x + Math.cos(u.ang) * (70 + mg * 230); I.world.y = u.y + Math.sin(u.ang) * (70 + mg * 230); }
    else if (!G.touch) { const w = G.screenToWorld(I.mx, I.my); I.world.x = w.x; I.world.y = w.y + 9; u.ang = Math.atan2(I.world.y - u.y, I.world.x - u.x); }
    else if (u.moving) { u.ang = G.turn(u.ang, u.mvAng, 8 * dt); I.world.x = u.x + Math.cos(u.ang) * 150; I.world.y = u.y + Math.sin(u.ang) * 150; }
    if (u.fired > 0) u.fired -= dt;
    const w = G.wOf(u);
    if (I.fire && !wheel && (w.def.auto || I.firePressed)) { if (G.fire(u, u.ang, I.world.x, I.world.y)) G.stats.shots++; }
    if (w.mag <= 0 && !w.def.melee && w.rel <= 0 && w.res !== 0) G.startReload(u, w);
    I.firePressed = false;
  }

  /* ---------- ایردراپ ---------- */
  function updateDrops(dt) {
    for (const p of G.props) if (p.kind === 'drop' && p.z > 0) { p.z = Math.max(0, p.z - 85 * dt); if (!p.z) { G.fx.burst(p.x, p.y, '#8a8070', 10, 80, .6, 4); G.audio.play('thump', G.dist(p, G.cmd)); } }
    if (G.logic.noDrops && G.logic.noDrops()) return;
    const u = G.cmd, w = u.weapons[0], low = !w.def.melee && w.res >= 0 && w.res + w.mag <= w.def.mag;
    G.dropT -= dt * (low ? 4 : 1);
    if (G.dropT > 0) return;
    G.dropT = 75;
    if (G.props.filter(p => p.kind === 'drop' && p.uses > 0).length >= 2) return;
    const m = G.map;
    for (let k = 0; k < 80; k++) {
      const a = Math.random() * 6.283, r = G.rand(300, 620), x = u.x + Math.cos(a) * r, y = u.y + Math.sin(a) * r, i = G.tileAt(x, y);
      if (i < 0 || m.block[i] || m.dyn[i] || !m.reach[i] || m.ground[i] === 3 || G.boxBlocked(x, y, 16)) continue;
      G.props.push({ kind: 'drop', x, y, z: 520, uses: 1 }); G.msg('ایردراپ تدارکات در راه است.', '#e8c15a'); G.audio.play('radio'); return;
    }
  }

  G.endMission = function (win, reason) {
    if (G.over) return; G.over = true; G.overT = win ? 2.4 : 1.6; G.result = { win, reason };
  };

  /* ---------- حلقه ---------- */
  function update(dt) {
    G.time += dt;
    if (G.over) { G.overT -= dt; if (G.overT <= 0) { G.state = 'end'; G.ui.showEnd(); return; } }
    G.flowT -= dt;
    if (G.flowT <= 0) { G.flowT = .35; G.computeFlow(G.soldiers.filter(s => !s.dead && !s.downed)); }
    updateCmd(dt); interact(dt);
    G.updateSoldiers(dt); G.updateZombies(dt); G.updateProjs(dt); updateDrops(dt);
    for (let i = G.props.length - 1; i >= 0; i--) { const p = G.props[i]; if (p.kind === 'heli2') { G.Heli.update(p, dt); if (p.gone) G.props.splice(i, 1); } }
    const zn = G.zoneAt(G.cmd.x, G.cmd.y);
    if (zn !== G.zoneNow) { const first = G.zoneNow < 0; G.zoneNow = zn; if (!first) G.ui.banner(G.zoneName(zn), G.ZONES[zn].color, ''); }
    G.dark = G.lerp(G.dark, G.ZONES[zn].dark, dt * 1.5);
    G.logic.update(dt);
    for (let i = G.markers.length - 1; i >= 0; i--) if ((G.markers[i].t -= dt) <= 0) G.markers.splice(i, 1);
    G.fx.update(dt);
    const u = G.cmd, v = G.view, I = G.input, k = G.touch ? .22 : .16;
    const tx = u.x + G.clamp(I.world.x - u.x, -400, 400) * k, ty = u.y + G.clamp(I.world.y - u.y, -300, 300) * k;
    v.x = G.lerp(v.x, tx, Math.min(1, dt * 7)); v.y = G.lerp(v.y, ty, Math.min(1, dt * 7));
    G.ui.tick(dt);
  }
  let last = 0;
  function frame(ts) {
    const real = Math.min(.034, (ts - last) / 1000 || 0); last = ts;
    try {
      const w = G.ui.wheel;
      if (w) w.k = G.clamp(w.k + (w.open ? 1 : -1) * real * 9, 0, 1);
      if (G.state === 'play') update(real * (w && w.open ? .12 : 1));
      if (G.state === 'menu') G.renderMenu(ts / 1000); else if (G.map) G.render();
    } catch (e) { console.error(e); if (!G.crashed) { G.crashed = true; G.msg && G.msg('خطا: ' + e.message, '#ff6b6b'); } }
    requestAnimationFrame(frame);
  }
  G.boot = function () {
    G.settings = G.loadSettings(); G.initRender(document.getElementById('cv')); G.ui.init();
    window.addEventListener('resize', G.resize); requestAnimationFrame(frame);
  };
  G._update = update; // برای آزمون خودکار
})();
