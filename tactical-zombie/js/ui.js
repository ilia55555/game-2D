'use strict';
/* رابط کاربری: منو و تنظیمات، HUD، نوار فرمان، ورودی صفحه‌کلید/ماوس/لمسی */
(function () {
  const $ = id => document.getElementById(id), fa = G.fa;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  let scope = 'all', hudT = 0, bannerT = 0, mapOpen = false;
  const ui = G.ui = Object.assign(G.ui || {}, { targeting: null });

  /* ---------- پیام‌های بی‌سیم ---------- */
  G.msg = function (text, color) {
    const log = $('log'); if (!log) return;
    const d = el('div', 'msg'); d.textContent = text; d.style.borderColor = color || '#888'; log.appendChild(d);
    while (log.children.length > 5) log.removeChild(log.firstChild);
    setTimeout(() => { d.classList.add('fade'); setTimeout(() => d.remove(), 900); }, 6500);
  };
  ui.banner = function (title, color, sub) { const b = $('banner'); b.innerHTML = `<b style="color:${color}">${title}</b><span>${sub || ''}</span>`; b.classList.add('show'); bannerT = 3.2; };

  /* ---------- منوی اصلی ---------- */
  function wOpts(pool, sel) { return G.POOL[pool].map(id => { const w = G.WEAPONS[id]; return `<option value="${id}"${id === sel ? ' selected' : ''}>${w.name} — ${w.cls}</option>`; }).join(''); }
  function buildMenu() {
    const st = G.settings, box = $('setup');
    let h = `<div class="row"><label>سختی</label><div class="seg" id="diff">${G.DIFFS.map((d, i) => `<button data-v="${i}" class="${st.diff === i ? 'on' : ''}">${d.name}</button>`).join('')}</div>
      <label class="chk"><input type="checkbox" id="snd" ${st.sound ? 'checked' : ''}> صدا</label></div>`;
    h += `<div class="team" style="--tc:#ffe27a"><h3>فرمانده <small>(خودت کنترلش می‌کنی)</small></h3><div class="mem"><span class="role">سلاح اصلی</span><select data-t="cmd" data-k="p">${wOpts('cmd', st.cmd.p)}</select><span class="role">سلاح دوم</span><select data-t="cmd" data-k="s">${wOpts('sec', st.cmd.s)}</select><span class="knife">+ چاقو</span></div></div>`;
    for (const key of ['alpha', 'delta']) {
      const TM = G.TEAMS[key], n = st[key + 'N'];
      h += `<div class="team" style="--tc:${TM.color}"><h3>${TM.name} <small>${key === 'alpha' ? 'حمله، پاکسازی، جستجو و نابودی' : 'پشتیبانی: دفاع، گشت، کاور، حواس‌پرتی'}</small>
        <span class="cnt">تعداد: <button data-n="${key}" data-d="-1">−</button><b>${fa(n)}</b><button data-n="${key}" data-d="1">+</button></span></h3>`;
      for (let i = 0; i < n; i++) { const r = TM.roles[i]; h += `<div class="mem"><span class="role">${r.name} · ${r.role}</span><select data-t="${key}" data-i="${i}" data-k="p">${wOpts(key, st[key][i].p)}</select><select data-t="${key}" data-i="${i}" data-k="s">${wOpts('sec', st[key][i].s)}</select><span class="knife">+ چاقو</span></div>`; }
      h += '</div>';
    }
    box.innerHTML = h;
    box.querySelectorAll('#diff button').forEach(b => b.onclick = () => { st.diff = +b.dataset.v; G.saveSettings(); buildMenu(); });
    $('snd').onchange = e => { st.sound = e.target.checked ? 1 : 0; G.saveSettings(); };
    box.querySelectorAll('button[data-n]').forEach(b => b.onclick = () => { const k = b.dataset.n + 'N'; st[k] = G.clamp(st[k] + (+b.dataset.d), 1, 6); G.saveSettings(); buildMenu(); });
    box.querySelectorAll('select').forEach(s => s.onchange = () => { const t = s.dataset.t; if (t === 'cmd') st.cmd[s.dataset.k] = s.value; else st[t][+s.dataset.i][s.dataset.k] = s.value; G.saveSettings(); });
  }
  function buildBestiary() {
    $('sins').innerHTML = G.SINS.map(k => { const z = G.ZT[k]; return `<div class="sin"><i style="background:${z.color}"></i><b>${z.name}</b><span>${z.desc}</span></div>`; }).join('');
  }
  function show(id, on) { $(id).hidden = !on; }
  ui.toMenu = function () { G.state = 'menu'; show('menu', true); show('hud', false); show('modal', false); buildMenu(); };
  function start() { G.audio.init(); show('menu', false); show('modal', false); show('hud', true); try { G.startMission(); } catch (e) { console.error(e); alert('خطا در ساخت نقشه: ' + e.message); ui.toMenu(); } }
  ui.onStart = function () { scope = 'all'; ui.targeting = null; mapOpen = false; $('log').innerHTML = ''; buildCmdBar(); buildSquads(); hud(); G.resize(); };

  /* ---------- نوار فرمان ---------- */
  function buildCmdBar() {
    const sc = $('scopes'), cm = $('cmds'); sc.innerHTML = ''; cm.innerHTML = '';
    G.SCOPES.forEach(s => { const b = el('button', 'scope' + (s[0] === scope ? ' on' : ''), `<kbd>${s[2]}</kbd>${s[1]}`); b.style.setProperty('--tc', s[3]); b.onclick = () => setScope(s[0]); sc.appendChild(b); });
    const color = G.SCOPES.find(s => s[0] === scope)[3];
    G.CMDS[scope].forEach((c, i) => {
      let t = c.t; if (c.id === 'form') t = 'آرایش: ' + G.FORMS.find(f => f[0] === G.squads.alpha.form)[1]; if (c.id === 'fire') t = G.squads.alpha.holdFire ? 'آتش آزاد' : 'آتش‌بس';
      const b = el('button', 'cmd' + (ui.targeting && ui.targeting.id === c.id ? ' on' : ''), `<kbd>${fa(i + 1)}</kbd>${t}${c.pt ? '<em>⌖</em>' : ''}`); b.style.setProperty('--tc', color);
      b.onclick = e => { e.stopPropagation(); issue(c, true); }; cm.appendChild(b);
    });
  }
  function setScope(s) { scope = s; ui.targeting = null; buildCmdBar(); G.audio.play('ui'); }
  function issue(c, viaClick) {
    if (G.state !== 'play') return;
    if (c.pt && (viaClick || G.touch)) { ui.targeting = (ui.targeting && ui.targeting.id === c.id) ? null : { scope, id: c.id, color: G.SCOPES.find(s => s[0] === scope)[3] }; buildCmdBar(); if (ui.targeting) G.msg('نقطهٔ هدف را روی زمین انتخاب کن.', '#ccc'); return; }
    G.command(scope, c.id, c.pt ? { x: G.input.world.x, y: G.input.world.y - 9 } : null); ui.targeting = null; buildCmdBar();
  }
  function confirmTarget(w) { const t = ui.targeting; ui.targeting = null; G.command(t.scope, t.id, w); buildCmdBar(); }

  /* ---------- پنل جوخه‌ها و HUD ---------- */
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
    const ws = $('weapon'); let h = '';
    u.weapons.forEach((w, i) => { const d = w.def; h += `<div class="ws${i === u.cur ? ' on' : ''}"><b>${d.name}</b><small>${d.cls}</small><span>${d.melee ? '∞' : (w.rel > 0 ? 'خشاب‌گذاری…' : fa(w.mag) + ' / ' + (w.res < 0 ? '∞' : fa(w.res)))}</span></div>`; });
    h += `<div class="inv"><span>نارنجک <b>${fa(u.grenades)}</b></span><span>طعمه <b>${fa(u.lures)}</b></span><span>درمان <b>${fa(u.medkits)}</b></span></div>`;
    ws.innerHTML = h;
    for (const key of ['alpha', 'delta']) {
      const sq = G.squads[key]; $('ord_' + key).textContent = sq.label + (sq.holdFire ? ' · آتش‌بس' : '');
      for (const m of sq.members) {
        const r = $('m_' + m.id); if (!r) continue;
        r.className = 'm' + (m.dead ? ' dead' : m.downed ? ' down' : '');
        const w = m.weapons[m.cur]; r.children[1].textContent = m.dead ? 'کشته شد' : m.downed ? `زمین‌خورده ${fa(Math.ceil(m.bleed))}ث` : w.def.name + (w.rel > 0 ? ' ⟳' : '');
        const f = r.children[2].firstChild; f.style.width = (m.dead ? 0 : m.hp / m.maxHp * 100) + '%'; f.style.background = m.hp > m.maxHp * .5 ? '#67e08a' : m.hp > m.maxHp * .25 ? '#ffd23c' : '#ff5a5a';
      }
    }
    const z = G.ZONES[G.zoneNow]; $('zone').innerHTML = `<i style="background:${z.color}"></i>${z.name}`;
    $('obj').innerHTML = G.objectives().map(o => `<div class="${o.done ? 'done' : ''}">${o.done ? '✔' : '◻'} ${o.t}</div>`).join('') + `<div class="k">کشته‌ها: ${fa(G.stats.kills)} · امتیاز: ${fa(G.stats.score)}</div>`;
    const p = $('prompt'); p.textContent = M.prompt; p.hidden = !M.prompt;
    G.drawMinimap($('mini'), false);
    if (mapOpen) G.drawMinimap($('bigmap'), true);
  }
  ui.tick = function (dt) {
    hudT -= dt; if (hudT <= 0) { hudT = .12; hud(); }
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
  };

  /* ---------- پنجره‌ها ---------- */
  function modal(html) { const m = $('modal'); m.innerHTML = `<div class="card">${html}</div>`; show('modal', true); return m; }
  function closeModal() { show('modal', false); mapOpen = false; if (G.state === 'pause') G.state = 'play'; }
  const HELP = `<div class="help"><b>کنترل فرمانده:</b> حرکت WASD · نشانه‌گیری ماوس · شلیک کلیک چپ · دویدن Shift · خشاب R · تعویض سلاح Q یا چرخ ماوس · نارنجک G · طعمهٔ صوتی T · چاقو F · درمان H · اقدام/احیا E · نقشه M · توقف Esc<br>
  <b>فرمان‌دهی:</b> انتخاب مخاطب با Z (کل تیم)، X (نیروهای ویژه)، C (دلتا فورس) · سپس کلیدهای ۱ تا ۸ برای فرمان. فرمان‌های نقطه‌ای (⌖) روی محل نشانه‌گر اجرا می‌شوند · کلیک راست: حرکت سریع گروه انتخاب‌شده به نقطه.<br>
  <b>لمسی:</b> چپ صفحه حرکت، راست صفحه نشانه‌گیری و شلیک؛ فرمان را لمس کن و سپس نقطه را روی زمین بزن.</div>`;
  ui.pause = function () { if (G.state !== 'play') return; G.state = 'pause'; const m = modal(`<h2>توقف</h2>${HELP}<div class="btns"><button id="bRes" class="primary">ادامه</button><button id="bRst">شروع دوباره</button><button id="bMenu">منوی اصلی</button></div>`); m.querySelector('#bRes').onclick = closeModal; m.querySelector('#bRst').onclick = start; m.querySelector('#bMenu').onclick = ui.toMenu; };
  ui.toggleMap = function () {
    if (mapOpen) { closeModal(); return; } if (G.state !== 'play') return; G.state = 'pause'; mapOpen = true;
    const m = modal(`<h2>نقشهٔ عملیات</h2><canvas id="bigmap" width="900" height="660"></canvas><div class="legend">${G.ZONES.map((z, i) => `<span><i style="background:${z.color}"></i>${z.short}${i >= 1 && i <= 3 ? ': ' + G.zoneTypes[i].map(t => G.ZT[t].name).join('، ') : ''}</span>`).join('')}<span><i style="background:#e8f0ff"></i>دروازهٔ بسته با تنبلی</span><span><i style="background:#ffe27a"></i>تدارکات</span></div><div class="btns"><button id="bRes" class="primary">بستن (M)</button></div>`);
    m.querySelector('#bRes').onclick = closeModal; G.drawMinimap($('bigmap'), true);
  };
  ui.openArmory = function () {
    G.state = 'pause'; const u = G.cmd;
    const m = modal(`<h2>جعبهٔ تدارکات</h2><p>مهمات، نارنجک و تجهیزات نیروهای نزدیک تکمیل شد. می‌توانی سلاح فرمانده را عوض کنی:</p><div class="mem"><span class="role">سلاح اصلی</span><select id="aP">${wOpts('cmd', u.weapons[0].id)}</select></div><div class="mem"><span class="role">سلاح دوم</span><select id="aS">${wOpts('sec', u.weapons[1].id)}</select></div><div class="btns"><button id="bRes" class="primary">ادامه</button></div>`);
    m.querySelector('#aP').onchange = e => G.setCmdWeapon(0, e.target.value); m.querySelector('#aS').onchange = e => G.setCmdWeapon(1, e.target.value); m.querySelector('#bRes').onclick = closeModal;
  };
  ui.showEnd = function () {
    const r = G.result, s = G.stats, M = G.mission, team = G.soldiers.filter(x => !x.isCmd), surv = team.filter(x => !x.dead).length;
    const score = s.score + (r.win ? 1500 : 0) + surv * 200 + M.samples * 150;
    const rank = !r.win ? '—' : (M.coreDead && M.samples >= 2 && surv === team.length) ? 'S' : (M.coreDead && surv >= team.length * .6) ? 'A' : M.coreDead ? 'B' : 'C';
    const mm = Math.floor(G.time / 60), ss = Math.floor(G.time % 60);
    const m = modal(`<h2 style="color:${r.win ? '#7dffb0' : '#ff6b6b'}">${r.win ? 'خروج موفق' : 'ماموریت شکست خورد'}</h2><p>${r.reason}</p>
      <div class="stats"><div><b>${rank}</b><span>رتبه</span></div><div><b>${fa(score)}</b><span>امتیاز</span></div><div><b>${fa(s.kills)}</b><span>زامبی کشته‌شده</span></div><div><b>${fa(surv)}/${fa(team.length)}</b><span>نیروی زنده</span></div><div><b>${fa(mm)}:${fa(String(ss).padStart(2, '0'))}</b><span>زمان</span></div><div><b>${fa(M.samples)}/۲</b><span>نمونه</span></div></div>
      <div class="kills">${G.SINS.concat(['twin']).map(k => `<span><i style="background:${G.ZT[k].color}"></i>${G.ZT[k].name}: ${fa(s.byType[k] || 0)}</span>`).join('')}</div>
      <div class="btns"><button id="bRst" class="primary">ماموریت دوباره</button><button id="bMenu">منوی اصلی</button></div>`);
    m.querySelector('#bRst').onclick = start; m.querySelector('#bMenu').onclick = ui.toMenu;
  };

  /* ---------- ورودی ---------- */
  function bindInput() {
    const I = G.input, cv = $('cv');
    window.addEventListener('keydown', e => {
      if (e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT')) return;
      const k = e.code; if (G.state === 'menu') return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].indexOf(k) >= 0) e.preventDefault();
      if (k === 'Escape') { if (ui.targeting) { ui.targeting = null; buildCmdBar(); } else if (G.state === 'pause') closeModal(); else ui.pause(); return; }
      if (k === 'KeyM' || k === 'Tab') { if (!e.repeat) ui.toggleMap(); return; }
      if (k === 'KeyP') { if (G.state === 'pause') closeModal(); else ui.pause(); return; }
      if (G.state !== 'play') return;
      I.keys[k] = true; if (e.repeat) return;
      if (k === 'KeyE') { I.eHeld = true; I.ePressed = true; }
      else if (k === 'KeyR') G.cmdAct('reload'); else if (k === 'KeyQ') G.cmdAct('swap'); else if (k === 'KeyG') G.cmdAct('frag'); else if (k === 'KeyT') G.cmdAct('lure');
      else if (k === 'KeyF' || k === 'KeyV') G.cmdAct('knife'); else if (k === 'KeyH') G.cmdAct('med');
      else if (k === 'KeyZ') setScope('all'); else if (k === 'KeyX') setScope('alpha'); else if (k === 'KeyC') setScope('delta');
      else if (/^(Digit|Numpad)[1-8]$/.test(k)) { const c = G.CMDS[scope][+k.slice(-1) - 1]; if (c) issue(c, false); }
    });
    window.addEventListener('keyup', e => { I.keys[e.code] = false; if (e.code === 'KeyE') I.eHeld = false; });
    window.addEventListener('blur', () => { I.keys = {}; I.fire = false; I.eHeld = false; });
    cv.addEventListener('mousemove', e => { I.mx = e.clientX; I.my = e.clientY; });
    cv.addEventListener('mousedown', e => {
      G.audio.init(); I.mx = e.clientX; I.my = e.clientY; if (G.state !== 'play') return;
      const w = G.screenToWorld(e.clientX, e.clientY);
      if (e.button === 0) { if (ui.targeting) confirmTarget(w); else { I.fire = true; I.firePressed = true; } }
      else if (e.button === 2) { if (ui.targeting) { ui.targeting = null; buildCmdBar(); } else G.command(scope, 'move', w); }
    });
    window.addEventListener('mouseup', e => { if (e.button === 0) I.fire = false; });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', e => { if (G.state === 'play') G.cmdAct(e.deltaY > 0 ? 'swap' : 'swapBack'); e.preventDefault(); }, { passive: false });

    // لمسی
    let L = null, Rr = null; const SR = 52;
    const stick = (id, s) => { const e = $(id); if (!s) { e.hidden = true; return; } e.hidden = false; e.style.left = (s.ox - 60) + 'px'; e.style.top = (s.oy - 60) + 'px'; e.firstChild.style.transform = `translate(${s.dx}px,${s.dy}px)`; };
    const upd = (s, t) => { let dx = t.clientX - s.ox, dy = t.clientY - s.oy; const d = Math.hypot(dx, dy); if (d > SR) { dx = dx / d * SR; dy = dy / d * SR; } s.dx = dx; s.dy = dy; };
    cv.addEventListener('touchstart', e => {
      e.preventDefault(); G.audio.init();
      if (!G.touch) { G.touch = true; document.body.classList.add('touch'); G.resize(); }
      if (G.state !== 'play') return;
      for (const t of e.changedTouches) {
        if (ui.targeting) { confirmTarget(G.screenToWorld(t.clientX, t.clientY)); continue; }
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
      b.addEventListener('touchstart', e => { e.preventDefault(); if (a === 'use') { I.eHeld = true; I.ePressed = true; } else if (a === 'map') ui.toggleMap(); else if (a === 'pause') ui.pause(); else G.cmdAct(a); }, { passive: false });
      b.addEventListener('touchend', e => { e.preventDefault(); if (a === 'use') I.eHeld = false; });
      b.addEventListener('click', () => { if (G.touch) return; if (a === 'map') ui.toggleMap(); else if (a === 'pause') ui.pause(); else if (a !== 'use') G.cmdAct(a); });
    });
  }

  ui.init = function () {
    buildMenu(); buildBestiary(); bindInput();
    $('bStart').onclick = start; $('helpBox').innerHTML = HELP;
    $('bReset').onclick = () => { G.settings = G.defaultSettings(); G.saveSettings(); buildMenu(); };
    if ('ontouchstart' in window && navigator.maxTouchPoints > 0 && !matchMedia('(pointer:fine)').matches) { G.touch = true; document.body.classList.add('touch'); }
  };
  window.addEventListener('DOMContentLoaded', () => G.boot());
})();
