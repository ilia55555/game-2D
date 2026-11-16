'use strict';
/* رابط کاربری: منوها، HUD، چرخ فرمان، ورودی صفحه‌کلید/ماوس/لمسی */
(function () {
  const $ = id => document.getElementById(id), fa = G.fa;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  let hudT = 0, bannerT = 0, mapOpen = false, screen = 'title', selM = 'crash', curM = 'crash';
  const ui = G.ui = Object.assign(G.ui || {}, { wheel: { open: false, k: 0, vx: 0, vy: 0, sel: null, wheel: 'main', tgt: { x: 0, y: 0 } } });
  const W = ui.wheel;
  G.dev = /[?&]dev\b/.test(location.search);

  /* ---------- پیام‌های بی‌سیم ---------- */
  G.msg = function (text, color) {
    const log = $('log'); if (!log) return;
    const d = el('div', 'msg'); d.textContent = text; d.style.borderColor = color || '#888'; log.appendChild(d);
    while (log.children.length > 5) log.removeChild(log.firstChild);
    setTimeout(() => { d.classList.add('fade'); setTimeout(() => d.remove(), 900); }, 6500);
  };
  ui.banner = function (title, color, sub) { const b = $('banner'); b.innerHTML = `<b style="color:${color}">${title}</b><span>${sub || ''}</span>`; b.classList.add('show'); bannerT = 3.2; };
  const tick = () => G.audio.play('ui');
  function show(id, on) { $(id).hidden = !on; }

  /* ================= منوها ================= */
  function wOpts(pool, sel) { return G.POOL[pool].map(id => { const w = G.WEAPONS[id]; return `<option value="${id}"${id === sel ? ' selected' : ''}>${w.name} — ${w.cls}</option>`; }).join(''); }
  const KEYS = [['W A S D', 'حرکت'], ['Shift', 'دویدن'], ['ماوس', 'نشانه‌گیری'], ['کلیک چپ', 'شلیک'], ['R', 'خشاب'], ['Q / چرخ ماوس', 'تعویض سلاح'], ['G', 'نارنجک'], ['T', 'طعمه'], ['F', 'چاقو'], ['H', 'درمان'], ['E', 'اقدام'], ['کلیک راست (نگه‌دار)', 'چرخ فرمان'], ['Tab (نگه‌دار)', 'چرخ فرمان'], ['M', 'نقشه'], ['Esc', 'توقف']];
  const keysHtml = () => `<div class="keys">${KEYS.map(k => `<div><kbd>${k[0]}</kbd><span>${k[1]}</span></div>`).join('')}</div>`;
  const SCREENS = {
    title() { return { crumb: '', body: `<div class="title"><h1>BLACK VEIL</h1><div class="sub">TACTICAL COMMAND</div><div class="press">برای شروع کلیک کن یا کلیدی را فشار بده</div></div>`, foot: '' }; },
    main() {
      const items = [['campaign', 'کارزار', 'CAMPAIGN'], ['loadout', 'جوخه و سلاح', 'LOADOUT'], ['options', 'تنظیمات', 'OPTIONS']];
      return { crumb: 'منوی اصلی', body: `<nav class="mlist">${items.map((it, i) => `<button data-go="${it[0]}" class="${i === 0 ? 'on' : ''}"><b>${it[1]}</b><small>${it[2]}</small></button>`).join('')}</nav>`, foot: '<span><kbd>↑↓</kbd>انتخاب</span><span><kbd>Enter</kbd>تأیید</span>' };
    },
    campaign() {
      const st = G.settings, prog = G.loadProg(), ms = G.MISSIONS.filter(m => !m.hidden || G.dev);
      const cur = ms.find(m => m.id === selM && !m.locked) || ms[0]; selM = cur.id;
      const cards = ms.map(m => m.locked
        ? `<div class="mcard locked"><div class="art"><i class="lock"></i></div><div class="mi"><small>عملیات ${fa(String(m.n).padStart(2, '0'))}</small><b>قفل</b></div></div>`
        : `<button class="mcard${m.id === selM ? ' on' : ''}" data-m="${m.id}"><div class="art a-${m.id}">${prog[m.id] ? '<em>✔</em>' : ''}</div><div class="mi"><small>عملیات ${fa(String(m.n).padStart(2, '0'))}</small><b>${m.name}</b><span>${m.loc} · ${m.time}</span></div></button>`).join('');
      return {
        crumb: 'کارزار', body: `<div class="camp"><div class="mrow">${cards}</div>
          <div class="cbar"><div class="diff"><label>سختی</label><div class="seg" id="diff">${G.DIFFS.map((d, i) => `<button data-v="${i}" class="${st.diff === i ? 'on' : ''}">${d.name}</button>`).join('')}</div></div>
          <button id="bStart" class="primary big">شروع عملیات</button></div></div>`, foot: '<span><kbd>Esc</kbd>بازگشت</span><span><kbd>Enter</kbd>شروع</span>',
      };
    },
    loadout() {
      const st = G.settings;
      let h = `<div class="team" style="--tc:#e8c15a"><h3>فرمانده</h3><div class="mem"><span class="role">سلاح اصلی</span><select data-t="cmd" data-k="p">${wOpts('cmd', st.cmd.p)}</select><span class="role">سلاح دوم</span><select data-t="cmd" data-k="s">${wOpts('sec', st.cmd.s)}</select></div></div>`;
      for (const key of ['alpha', 'delta']) {
        const TM = G.TEAMS[key], n = st[key + 'N'];
        h += `<div class="team" style="--tc:${TM.color}"><h3>${TM.name}<small class="cntf">${fa(n)} نفر</small></h3>`;
        for (let i = 0; i < n; i++) { const r = TM.roles[i]; h += `<div class="mem"><span class="role">${r.name} · ${r.role}</span><select data-t="${key}" data-i="${i}" data-k="p">${wOpts(key, st[key][i].p)}</select><select data-t="${key}" data-i="${i}" data-k="s">${wOpts('sec', st[key][i].s)}</select></div>`; }
        h += '</div>';
      }
      return { crumb: 'جوخه و سلاح', body: `<div class="panel">${h}<div class="btns"><button id="bReset">پیش‌فرض</button></div></div>`, foot: '<span><kbd>Esc</kbd>بازگشت</span>' };
    },
    options() {
      const st = G.settings;
      return { crumb: 'تنظیمات', body: `<div class="panel"><div class="row"><label>صدا</label><div class="seg" id="snd"><button data-v="1" class="${st.sound ? 'on' : ''}">روشن</button><button data-v="0" class="${st.sound ? '' : 'on'}">خاموش</button></div></div><h3 class="ph">کنترل‌ها</h3>${keysHtml()}</div>`, foot: '<span><kbd>Esc</kbd>بازگشت</span>' };
    },
  };
  function go(name, silent) {
    screen = name; const s = SCREENS[name](), body = $('mBody'), st = G.settings;
    $('menu').className = 'screen s-' + name; $('mCrumb').innerHTML = s.crumb ? `<span>${s.crumb}</span>` : '';
    body.innerHTML = s.body; $('mFoot').innerHTML = (name !== 'title' && name !== 'main' ? '<button id="bBack" class="back">بازگشت</button>' : '') + s.foot;
    if (!silent) tick();
    const bb = $('bBack'); if (bb) bb.onclick = back;
    body.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => go(b.dataset.go); b.onmouseenter = () => { body.querySelectorAll('[data-go]').forEach(x => x.classList.toggle('on', x === b)); }; });
    body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { selM = b.dataset.m; go('campaign'); });
    body.querySelectorAll('#diff button').forEach(b => b.onclick = () => { st.diff = +b.dataset.v; G.saveSettings(); go(name); });
    body.querySelectorAll('#snd button').forEach(b => b.onclick = () => { st.sound = +b.dataset.v; G.saveSettings(); go(name); });
    body.querySelectorAll('button[data-n]').forEach(b => b.onclick = () => { const k = b.dataset.n + 'N'; st[k] = G.clamp(st[k] + (+b.dataset.d), 1, 6); G.saveSettings(); go(name); });
    body.querySelectorAll('select').forEach(x => x.onchange = () => { const t = x.dataset.t; if (t === 'cmd') st.cmd[x.dataset.k] = x.value; else st[t][+x.dataset.i][x.dataset.k] = x.value; G.saveSettings(); });
    const bs = $('bStart'); if (bs) bs.onclick = () => start(selM);
    const br = $('bReset'); if (br) br.onclick = () => { const snd = st.sound, df = st.diff; G.settings = G.defaultSettings(); G.settings.sound = snd; G.settings.diff = df; G.saveSettings(); go(name); };
    if (name === 'title') body.querySelector('.title').onclick = () => { G.audio.init(); go('main'); };
  }
  function back() { if (screen === 'title') return; go(screen === 'main' ? 'title' : 'main'); }
  function menuKey(e) {
    const k = e.code;
    if (screen === 'title') { G.audio.init(); go('main'); return; }
    if (k === 'Escape' || k === 'Backspace') { back(); return; }
    if (screen === 'main') {
      const bs = Array.from($('mBody').querySelectorAll('[data-go]')), i = bs.findIndex(b => b.classList.contains('on'));
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'KeyS' || k === 'KeyW') { const n = (i + (k === 'ArrowDown' || k === 'KeyS' ? 1 : bs.length - 1)) % bs.length; bs.forEach((b, j) => b.classList.toggle('on', j === n)); tick(); }
      else if (k === 'Enter' || k === 'Space') bs[Math.max(0, i)].click();
    } else if (screen === 'campaign' && k === 'Enter') start(selM);
  }
  ui.toMenu = function (scr) { G.state = 'menu'; W.open = false; show('menu', true); show('hud', false); show('modal', false); go(scr || 'main', true); };
  function start(id) {
    G.audio.init(); curM = id || curM; const f = $('fade'); f.classList.add('on');
    setTimeout(() => {
      show('menu', false); show('modal', false); show('hud', true);
      try { G.startMission(curM); } catch (e) { console.error(e); ui.toMenu('campaign'); }
      setTimeout(() => f.classList.remove('on'), 350);
    }, 420);
  }
  ui.onStart = function () {
    W.open = false; W.k = 0; mapOpen = false; $('log').innerHTML = ''; buildSquads(); hud(); G.resize();
    const m = G.mdef, it = $('intro');
    it.innerHTML = `<b>«${m.name}»</b><span>عملیات ${fa(String(m.n).padStart(2, '0'))}</span><span>${m.loc} — ${m.time}</span>`;
    it.classList.remove('run'); void it.offsetWidth; it.classList.add('run');
  };

  /* ================= چرخ فرمان ================= */
  const itemText = c => c.id === 'form' ? 'آرایش: ' + G.FORMS.find(f => f[0] === G.squads.alpha.form)[1] : c.id === 'fire' ? (G.squads.alpha.holdFire ? 'آتش آزاد' : 'آتش‌بس') : c.t;
  ui.wheelText = itemText;
  function wheelPick() {
    const R = G.WHEELS[W.wheel], d = Math.hypot(W.vx, W.vy); if (d < 30) { W.sel = null; return; }
    const a = Math.atan2(W.vy, W.vx) * 180 / Math.PI, n = R.items.length, i = ((Math.round((a - R.off) / R.span) % n) + n) % n, it = R.items[i];
    if ((it.sub || it.back) && d > 75) { W.wheel = it.sub || 'main'; W.vx = W.vy = 0; W.sel = null; W.reorigin = true; G.audio.play('radio'); return; }
    if (!W.sel || W.sel.it !== it) G.audio.play('beep'); W.sel = { it, i };
  }
  function wheelOpen(ox, oy) {
    if (G.state !== 'play' || W.open || G.cmd.downed || G.cmd.boarded) return;
    W.open = true; W.wheel = 'main'; W.vx = W.vy = 0; W.sel = null; W.ox = ox; W.oy = oy; W.tgt = { x: G.input.world.x, y: G.input.world.y - 9 }; G.input.fire = false; G.audio.play('radio');
  }
  function wheelMove(dx, dy) { W.vx += dx; W.vy += dy; const d = Math.hypot(W.vx, W.vy); if (d > 120) { W.vx *= 120 / d; W.vy *= 120 / d; } wheelPick(); }
  function wheelClose() {
    if (!W.open) return; W.open = false; const s = W.sel; W.sel = null; if (!s || s.it.sub || s.it.back) return;
    G.command(W.wheel === 'main' ? 'all' : W.wheel, s.it.id, s.it.pt ? W.tgt : null);
  }

  /* ================= پنل جوخه‌ها و HUD ================= */
  function buildSquads() {
    const box = $('squads'); box.innerHTML = '';
    for (const key of ['alpha', 'delta']) {
      const sq = G.squads[key], d = el('div', 'sq'); d.style.setProperty('--tc', sq.color);
      d.innerHTML = `<div class="sqh"><b>${sq.name}</b><span id="ord_${key}"></span></div>` + sq.members.map(u => `<div class="m" id="m_${u.id}"><span class="n">${u.name}<small>${u.role}</small></span><span class="w"></span><span class="hp"><i></i></span></div>`).join('');
      box.appendChild(d);
    }
  }
  function hud() {
    const u = G.cmd, M = G.mission; if (!u) return;
    $('hpF').style.width = (u.hp / u.maxHp * 100) + '%'; $('hpT').textContent = fa(Math.ceil(u.hp)); $('stF').style.width = (u.stamina * 100) + '%';
    let h = '';
    u.weapons.forEach((w, i) => { const d = w.def; h += `<div class="ws${i === u.cur ? ' on' : ''}"><b>${d.name}</b><small>${d.cls}</small><span>${d.melee ? '∞' : (w.rel > 0 ? '⟳' : fa(w.mag) + ' / ' + (w.res < 0 ? '∞' : fa(w.res)))}</span></div>`; });
    h += `<div class="inv"><span>نارنجک <b>${fa(u.grenades)}</b></span><span>طعمه <b>${fa(u.lures)}</b></span><span>درمان <b>${fa(u.medkits)}</b></span></div>`;
    $('weapon').innerHTML = h;
    for (const key of ['alpha', 'delta']) {
      const sq = G.squads[key]; $('ord_' + key).textContent = sq.label + (sq.holdFire ? ' · آتش‌بس' : '');
      for (const m of sq.members) {
        const r = $('m_' + m.id); if (!r) continue;
        r.className = 'm' + (m.dead ? ' dead' : m.downed ? ' down' : '');
        const w = m.weapons[m.cur]; r.children[1].textContent = m.dead ? 'کشته شد' : m.downed ? `زمین‌خورده ${fa(Math.ceil(m.bleed))}` : w.def.name + (w.rel > 0 ? ' ⟳' : '');
        const f = r.children[2].firstChild; f.style.width = (m.dead ? 0 : m.hp / m.maxHp * 100) + '%'; f.style.background = m.hp > m.maxHp * .5 ? '#67e08a' : m.hp > m.maxHp * .25 ? '#ffd23c' : '#ff5a5a';
      }
    }
    const zn = Math.max(0, G.zoneNow), z = G.ZONES[zn]; $('zone').innerHTML = `<i style="background:${z.color}"></i>${G.zoneName(zn)}`;
    $('obj').innerHTML = G.objectives().map(o => `<div class="${o.fail ? 'fail' : o.done ? 'done' : ''}">${o.fail ? '✖' : o.done ? '✔' : '◻'} ${o.t}</div>`).join('');
    const p = $('prompt'); p.textContent = M.prompt; p.hidden = !M.prompt;
    G.drawMinimap($('mini'), false);
    if (mapOpen) G.drawMinimap($('bigmap'), true);
  }
  ui.tick = function (dt) {
    hudT -= dt; if (hudT <= 0) { hudT = .12; hud(); }
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
  };

  /* ================= پنجره‌ها ================= */
  function modal(html, cls) { const m = $('modal'); m.innerHTML = `<div class="card ${cls || ''}">${html}</div>`; show('modal', true); return m; }
  function closeModal() { show('modal', false); mapOpen = false; if (G.state === 'pause') G.state = 'play'; }
  ui.pause = function () {
    if (G.state !== 'play') return; G.state = 'pause'; W.open = false;
    const m = modal(`<h2>توقف</h2><nav class="mlist small"><button id="bRes" class="on"><b>ادامه</b></button><button id="bRst"><b>شروع دوباره</b></button><button id="bMenu"><b>خروج به منو</b></button></nav>${keysHtml()}`, 'pause');
    m.querySelector('#bRes').onclick = closeModal; m.querySelector('#bRst').onclick = () => start(curM); m.querySelector('#bMenu').onclick = () => ui.toMenu('main');
  };
  ui.toggleMap = function () {
    if (mapOpen) { closeModal(); return; } if (G.state !== 'play') return; G.state = 'pause'; mapOpen = true; W.open = false;
    const m = modal(`<h2>نقشه</h2><canvas id="bigmap" width="900" height="660"></canvas><div class="btns"><button id="bRes" class="primary">بستن</button></div>`);
    const bm = $('bigmap'); bm.height = Math.round(900 * G.map.h / G.map.w);
    m.querySelector('#bRes').onclick = closeModal; G.drawMinimap(bm, true);
  };
  ui.openArmory = function () {
    G.state = 'pause'; W.open = false; const u = G.cmd;
    let h = `<h2>تدارکات</h2><div class="team" style="--tc:#e8c15a"><h3>فرمانده</h3><div class="mem"><span class="role">اصلی</span><select data-u="0" data-k="0">${wOpts('cmd', u.weapons[0].id)}</select><span class="role">دوم</span><select data-u="0" data-k="1">${wOpts('sec', u.weapons[1].id)}</select></div></div>`;
    for (const key of ['alpha', 'delta']) {
      const sq = G.squads[key], ms = sq.members.filter(x => !x.dead); if (!ms.length) continue;
      h += `<div class="team" style="--tc:${sq.color}"><h3>${sq.name}</h3>` + ms.map(x => `<div class="mem"><span class="role">${x.name} · ${x.role}</span><select data-u="${x.id}" data-k="0">${wOpts(key, x.weapons[0].id)}</select><select data-u="${x.id}" data-k="1">${wOpts('sec', x.weapons[1].id)}</select></div>`).join('') + '</div>';
    }
    h += '<div class="btns"><button id="bRes" class="primary">ادامه</button></div>';
    const m = modal(h, 'armory');
    m.querySelectorAll('select').forEach(x => x.onchange = () => { const id = +x.dataset.u, k = +x.dataset.k; if (!id) G.setCmdWeapon(k, x.value); else { const q = G.soldiers.find(o => o.id === id); if (q) G.setSoldierWeapon(q, k, x.value); } });
    m.querySelector('#bRes').onclick = closeModal;
  };
  ui.showEnd = function () {
    const r = G.result, s = G.stats, e = G.logic.end && G.logic.end();
    const mm = Math.floor(G.time / 60), ss = Math.floor(G.time % 60), time = `${fa(mm)}:${fa(String(ss).padStart(2, '0'))}`;
    let h;
    if (!e) h = `<h2 class="big" style="color:#ff6b6b">فرمانده از پا درآمد</h2><div class="btns"><button id="bRst" class="primary">تلاش دوباره</button><button id="bMenu">خروج به منو</button></div>`;
    else h = `<small class="eh">عملیات ${fa(String(G.mdef.n).padStart(2, '0'))} — «${G.mdef.name}»</small><h2 class="big" style="color:${e.color}">${e.title}</h2>
      <div class="stats">${e.stats.concat([[fa(s.kills), 'کشته'], [time, 'زمان']]).map(x => `<div><b>${x[0]}</b><span>${x[1]}</span></div>`).join('')}</div>
      ${e.roll ? `<div class="roll">${e.roll.map(x => `<div><i>✝</i><b>${x.name}</b><span>${x.team} · ${x.role}</span></div>`).join('')}</div>` : ''}
      <div class="btns"><button id="bMenu" class="primary">ادامه</button><button id="bRst">دوباره</button></div>`;
    const m = modal(h, 'end');
    m.querySelector('#bRst').onclick = () => start(curM); m.querySelector('#bMenu').onclick = () => ui.toMenu(e ? 'campaign' : 'main');
  };

  /* ================= ورودی ================= */
  function bindInput() {
    const I = G.input, cv = $('cv');
    window.addEventListener('keydown', e => {
      if (e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT')) return;
      const k = e.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].indexOf(k) >= 0) e.preventDefault();
      if (G.state === 'menu') { if (!e.repeat) menuKey(e); return; }
      if (G.state === 'end') return;
      if (k === 'Escape' || k === 'KeyP') { if (W.open) { W.open = false; W.sel = null; } else if (G.state === 'pause') closeModal(); else ui.pause(); return; }
      if (k === 'KeyM') { if (!e.repeat) ui.toggleMap(); return; }
      if (G.state !== 'play') return;
      I.keys[k] = true; if (e.repeat) return;
      if (k === 'Tab') wheelOpen(I.mx, I.my);
      else if (k === 'KeyE') { I.eHeld = true; I.ePressed = true; }
      else if (k === 'KeyR') G.cmdAct('reload'); else if (k === 'KeyQ') G.cmdAct('swap'); else if (k === 'KeyG') G.cmdAct('frag'); else if (k === 'KeyT') G.cmdAct('lure');
      else if (k === 'KeyF' || k === 'KeyV') G.cmdAct('knife'); else if (k === 'KeyH') G.cmdAct('med');
    });
    window.addEventListener('keyup', e => { I.keys[e.code] = false; if (e.code === 'KeyE') I.eHeld = false; if (e.code === 'Tab') wheelClose(); });
    window.addEventListener('blur', () => { I.keys = {}; I.fire = false; I.eHeld = false; W.open = false; });
    window.addEventListener('mousemove', e => {
      if (W.open) { const dx = e.movementX != null ? e.movementX : e.clientX - I.mx, dy = e.movementY != null ? e.movementY : e.clientY - I.my; wheelMove(dx, dy); }
      I.mx = e.clientX; I.my = e.clientY;
    });
    cv.addEventListener('mousedown', e => {
      G.audio.init(); I.mx = e.clientX; I.my = e.clientY; if (G.state !== 'play') return;
      if (e.button === 2) { wheelOpen(e.clientX, e.clientY); return; }
      if (W.open) return;
      if (e.button === 0) { I.fire = true; I.firePressed = true; }
    });
    window.addEventListener('mouseup', e => { if (e.button === 0) I.fire = false; if (e.button === 2) wheelClose(); });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', e => { if (G.state === 'play' && !W.open) G.cmdAct(e.deltaY > 0 ? 'swap' : 'swapBack'); e.preventDefault(); }, { passive: false });

    // لمسی
    let L = null, Rr = null; const SR = 52;
    const stick = (id, s) => { const e = $(id); if (!s) { e.hidden = true; return; } e.hidden = false; e.style.left = (s.ox - 60) + 'px'; e.style.top = (s.oy - 60) + 'px'; e.firstChild.style.transform = `translate(${s.dx}px,${s.dy}px)`; };
    const upd = (s, t) => { let dx = t.clientX - s.ox, dy = t.clientY - s.oy; const d = Math.hypot(dx, dy); if (d > SR) { dx = dx / d * SR; dy = dy / d * SR; } s.dx = dx; s.dy = dy; };
    cv.addEventListener('touchstart', e => {
      e.preventDefault(); G.audio.init();
      if (!G.touch) { G.touch = true; document.body.classList.add('touch'); G.resize(); }
      if (G.state !== 'play') return;
      for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth / 2) { if (!L) { L = { id: t.identifier, ox: t.clientX, oy: t.clientY, dx: 0, dy: 0 }; stick('stickL', L); } }
        else if (!Rr) { Rr = { id: t.identifier, ox: t.clientX, oy: t.clientY, dx: 0, dy: 0 }; stick('stickR', Rr); }
      }
    }, { passive: false });
    cv.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (L && t.identifier === L.id) { upd(L, t); I.moveX = L.dx / SR; I.moveY = L.dy / SR; I.sprint = Math.hypot(L.dx, L.dy) > SR * .92; stick('stickL', L); }
        if (Rr && t.identifier === Rr.id) { upd(Rr, t); const mg = Math.hypot(Rr.dx, Rr.dy) / SR; if (mg > .15) I.aimStick = { x: Rr.dx / SR, y: Rr.dy / SR }; const f = mg > .55; if (f && !I.fire) I.firePressed = true; I.fire = f; stick('stickR', Rr); }
      }
    }, { passive: false });
    const end = e => { for (const t of e.changedTouches) { if (L && t.identifier === L.id) { L = null; I.moveX = I.moveY = 0; I.sprint = false; stick('stickL', null); } if (Rr && t.identifier === Rr.id) { Rr = null; I.fire = false; stick('stickR', null); } } };
    cv.addEventListener('touchend', end); cv.addEventListener('touchcancel', end);
    document.querySelectorAll('#tbtns button').forEach(b => {
      const a = b.dataset.a;
      if (a === 'wheel') { // نگه‌دار و بکش، رها کن
        b.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; wheelOpen(t.clientX, t.clientY); }, { passive: false });
        b.addEventListener('touchmove', e => { e.preventDefault(); const t = e.changedTouches[0]; if (!W.open) return; if (W.reorigin) { W.reorigin = false; W.ox = t.clientX; W.oy = t.clientY; } W.vx = (t.clientX - W.ox) * 1.4; W.vy = (t.clientY - W.oy) * 1.4; wheelMove(0, 0); }, { passive: false });
        b.addEventListener('touchend', e => { e.preventDefault(); wheelClose(); });
        return;
      }
      b.addEventListener('touchstart', e => { e.preventDefault(); if (a === 'use') { I.eHeld = true; I.ePressed = true; } else if (a === 'map') ui.toggleMap(); else if (a === 'pause') ui.pause(); else G.cmdAct(a); }, { passive: false });
      b.addEventListener('touchend', e => { e.preventDefault(); if (a === 'use') I.eHeld = false; });
      b.addEventListener('click', () => { if (G.touch) return; if (a === 'map') ui.toggleMap(); else if (a === 'pause') ui.pause(); else if (a !== 'use') G.cmdAct(a); });
    });
  }

  ui.init = function () {
    bindInput(); go('title', true);
    if ('ontouchstart' in window && navigator.maxTouchPoints > 0 && !matchMedia('(pointer:fine)').matches) { G.touch = true; document.body.classList.add('touch'); }
  };
  window.addEventListener('DOMContentLoaded', () => G.boot());
})();
