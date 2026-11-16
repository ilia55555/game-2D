'use strict';
/* منطق اختصاصی هر عملیات */
(function () {
  const ML = G.ML = G.ML || {}, fa = G.fa;
  const squadAlive = () => G.soldiers.filter(s => !s.isCmd && !s.dead && !s.downed);
  const squadLeft = () => G.soldiers.filter(s => !s.isCmd && !s.dead);

  /* ================= عملیات ۰۱ — سقوط ================= */
  function erupt() {
    const M = G.mission, S = G.map.sites, D = G.diff.count;
    M.phase = 'collapse'; M.erupt = 1; M.doom = 0; M.waveT = 1.5; M.claimT = 3; M.say = [];
    for (let k = 0; k < 7; k++) G.explode(S.core.x + G.rand(-90, 90), S.core.y + G.rand(-70, 70), 240, 900, null);
    G.fx.shake(30); G.fx.black = 1.3; G.noRevive = true; G.cmdDmg = .55;
    for (const z of G.zombies) z.alert = 90;
    G.spawnRing(S.core.x, S.core.y, 200, 520, ['wrath', 'wrath', 'greed', 'envy'], Math.round(30 * D), true);
    for (const key of ['alpha', 'delta']) { const sq = G.squads[key]; sq.order = { type: 'follow' }; sq.holdFire = false; sq.label = 'عقب‌نشینی'; sq.members.forEach(u => { u.hunt = null; u.wps = null; u.task = null; }); }
    const live = squadAlive(), who = i => live.length ? live[i % live.length].name : null;
    const q = (t, n, txt) => { if (n) M.say.push({ t, txt: `${n}: ${txt}`, c: '#ff6b6b' }); };
    q(1.2, who(0), 'هنوز سر جاشه!'); q(2.8, who(1), 'داره بزرگ می‌شه... از همه طرف میان!'); q(4.4, 'فرمانده', 'همه عقب! عقب‌نشینی!');
    G.ui.banner('عقب‌نشینی', '#ff4a3c', '');
  }
  function collapse(dt) {
    const M = G.mission, S = G.map.sites, u = G.cmd, D = G.diff.count;
    M.doom += dt; G.squadDmg = 2.5 + M.doom / 3;
    const dLZ = G.dist(u, S.lz);
    while (M.say.length && M.say[0].t <= M.doom) { const s = M.say.shift(); G.msg(s.txt, s.c); G.audio.play('radio'); }
    M.waveT -= dt;
    if (M.waveT <= 0) {
      M.waveT = 3.2;
      if (G.zActive.length < 150) G.spawnRing(u.x, u.y, 620, 840, M.doom > 30 ? ['wrath', 'wrath', 'greed', 'greed', 'envy', 'pride'] : ['wrath', 'wrath', 'greed', 'greed', 'envy'], Math.round((5 + M.doom / 8) * D));
    }
    M.claimT -= dt;
    if (M.claimT <= 0) {
      M.claimT = dLZ < 700 ? .9 : Math.max(1.6, 3.2 - M.doom / 20);
      const live = squadAlive();
      if (live.length) {
        const s = live[(Math.random() * live.length) | 0];
        if (M.doom > 14 || dLZ < 700 || G.dist(s, u) > 760) G.killSoldier(s);
        else G.spawnRing(s.x, s.y, 70, 170, ['wrath'], 4, true).forEach(z => { z.tgt = s; });
      }
    }
    // نقطهٔ ورود: فقط فرمانده بیرون می‌رود
    if (G.dist(u, S.lz) < 120 && !u.downed) {
      M.exitT = (M.exitT || 0) + dt;
      const left = squadLeft();
      if (left.length) { M.cutT = (M.cutT || 0) - dt; if (M.cutT <= 0) { M.cutT = .35; G.killSoldier(left[0]); left[0].dead = true; G.stats.lost++; } }
      else if (M.exitT > 1.4) G.endMission(true, '');
    } else M.exitT = 0;
  }
  ML.crash = {
    init() { const S = G.map.sites; G.props.push({ kind: 'wreck', x: S.wreck.x, y: S.wreck.y }); },
    canArm() { const M = G.mission; return !M.coreArmed && M.samples >= M.need; },
    onArm() {
      const M = G.mission; M.coreArmed = true; M.fuse = 12; G.audio.play('alarm');
      G.msg('خرج کار گذاشته شد. فاصله بگیرید!', '#ff6bd6');
      for (const z of G.zombies) if (z.zone === 3) z.alert = Math.max(z.alert, 40);
    },
    objPoints() {
      const M = G.mission, S = G.map.sites, out = [];
      if (M.phase === 'collapse') return [{ x: S.lz.x, y: S.lz.y, c: '#3ddc84', t: 'خروج' }];
      for (const p of G.props) if (p.kind === 'sample') out.push({ x: p.x, y: p.y, c: '#c9a0ff', t: 'نمونه' });
      if (M.samples >= M.need && !M.coreArmed) out.push({ x: S.core.x, y: S.core.y, c: '#ff6bd6', t: 'منشأ' });
      return out;
    },
    objectives() {
      const M = G.mission;
      if (M.phase === 'collapse') return [{ t: 'عقب‌نشینی به نقطهٔ ورود', done: false }];
      return [
        { t: `یافتن نمونه (${fa(M.samples)}/${fa(M.need)})`, done: M.samples >= M.need },
        { t: M.coreArmed ? `فاصله بگیر — ${fa(Math.ceil(M.fuse))}` : 'بمب‌گذاری و نابودی منشأ', done: false },
      ];
    },
    update(dt) {
      const M = G.mission, S = G.map.sites;
      if (M.phase === 'go' && M.coreArmed) {
        M.fuse -= dt; if (((M.fuse * 2) | 0) !== (((M.fuse + dt) * 2) | 0) && M.fuse < 10) G.audio.play('beep', G.dist(G.cmd, S.core));
        if (M.fuse <= 0) { M.fuse = 0; erupt(); }
      } else if (M.phase === 'collapse') collapse(dt);
    },
    end() {
      const r = G.result, team = G.soldiers.filter(x => !x.isCmd);
      if (!r.win) return null;
      const p = G.loadProg(); p.crash = 1; G.saveProg(p);
      return { title: 'عملیات ناموفق', color: '#ff6b6b', roll: team.map(u => ({ name: u.name, role: u.role, team: G.squads[u.squad].short })), stats: [[fa(team.length) + '/' + fa(team.length), 'تلفات'], [fa(1), 'بازمانده']] };
    },
  };

  /* ================= میدان آزمایشی (مرحلهٔ کنار گذاشته‌شده) ================= */
  ML.zones = {
    init() { const S = G.map.sites; G.props.push({ kind: 'beacon', x: S.ex.x, y: S.ex.y - 100 }); },
    canArm() { return !G.mission.coreArmed; },
    onArm() { const M = G.mission; M.coreArmed = true; M.fuse = 25; G.msg('خرج کار گذاشته شد. فاصله بگیرید!', '#ff6bd6'); G.audio.play('alarm'); for (const z of G.zombies) if (z.zone === 3) z.alert = Math.max(z.alert, 40); },
    onBeacon() { const M = G.mission; M.extract = 1; M.exT = 75; M.waveT = 2; G.msg('بالگرد در راه است.', '#4db8ff'); G.audio.play('alarm'); },
    prompt(p) { const M = G.mission, S = G.map.sites, u = G.cmd; return M.extract === 2 && Math.hypot(u.x - S.ex.x, u.y - S.ex.y) < 120 ? '...' : p; },
    objPoints() {
      const M = G.mission, S = G.map.sites, out = [];
      for (const p of G.props) if (p.kind === 'sample') out.push({ x: p.x, y: p.y, c: '#c9a0ff', t: 'نمونه' });
      if (!M.coreArmed) out.push({ x: S.core.x, y: S.core.y, c: '#ff6bd6', t: 'هسته' });
      if (M.coreDead || M.extract) out.push({ x: S.ex.x, y: S.ex.y, c: '#4db8ff', t: 'خروج' });
      return out;
    },
    objectives() {
      const M = G.mission;
      return [
        { t: `نمونه‌ها (${fa(M.samples)}/${fa(2)})`, done: M.samples >= 2 },
        { t: M.coreArmed && !M.coreDead ? `فاصله بگیر — ${fa(Math.ceil(M.fuse))}` : 'نابودی هسته', done: M.coreDead },
        { t: M.extract === 1 ? `دفاع تا رسیدن بالگرد — ${fa(Math.ceil(M.exT))}` : M.extract === 2 ? 'سوار بالگرد شو' : 'خروج با بالگرد', done: false },
      ];
    },
    update(dt) {
      const M = G.mission, S = G.map.sites, u = G.cmd, m = G.map;
      if (M.coreArmed && !M.coreDead) {
        M.fuse -= dt; if (((M.fuse * 2) | 0) !== (((M.fuse + dt) * 2) | 0) && M.fuse < 10) G.audio.play('beep', G.dist(u, S.core));
        if (M.fuse <= 0) {
          M.fuse = 0; M.coreDead = true; for (const [x, y] of m.coreTiles) m.block[y * m.w + x] = 0;
          for (let k = 0; k < 7; k++) G.explode(S.core.x + G.rand(-90, 90), S.core.y + G.rand(-70, 70), 240, 900, null);
          G.fx.shake(26); G.stats.score += 1000;
          for (const z of G.zombies) if (z.zone >= 2) z.alert = 70;
          G.spawnRing(S.core.x, S.core.y, 380, 620, ['wrath', 'wrath', 'greed', 'envy'], Math.round(26 * G.diff.count));
          G.ui.banner('هسته نابود شد', '#ff6bd6', '');
        }
      }
      if (M.extract === 1) {
        M.exT -= dt; M.waveT -= dt;
        if (M.waveT <= 0) { M.waveT = 8; const pool = M.exT < 35 ? ['wrath', 'wrath', 'greed', 'greed', 'envy', 'pride', 'gluttony'] : ['wrath', 'wrath', 'greed', 'greed', 'envy']; G.spawnRing(S.ex.x, S.ex.y, 560, 820, pool, Math.round((7 + (75 - M.exT) / 9) * G.diff.count)); }
        if (M.exT <= 9 && !M.heli) { M.heli = { kind: 'heli', x: S.ex.x, y: S.ex.y, z: 520 }; G.props.push(M.heli); }
        if (M.exT <= 0) { M.extract = 2; G.ui.banner('بالگرد فرود آمد', '#4db8ff', ''); }
      }
      if (M.heli) M.heli.z = Math.max(8, M.heli.z - dt * 60);
      if (M.extract === 2 && Math.hypot(u.x - S.ex.x, u.y - S.ex.y) < 120) { M.boardT = (M.boardT || 0) + dt; if (M.boardT > 2) G.endMission(true, ''); } else M.boardT = 0;
    },
    end() {
      const r = G.result, team = G.soldiers.filter(x => !x.isCmd), surv = team.filter(x => !x.dead).length;
      if (!r.win) return null;
      return { title: 'خروج موفق', color: '#7dffb0', stats: [[fa(surv) + '/' + fa(team.length), 'نیروی زنده']] };
    },
  };
})();
