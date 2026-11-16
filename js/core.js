'use strict';
/* ماده سیاه: هفت گناه — هسته: ابزارها، داده‌ها، صدا */
const G = window.G = {};
G.T = 32;

/* ---------- ابزارها ---------- */
G.rng = function (seed) {
  let s = (seed >>> 0) || 1;
  const f = function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.int = (a, b) => a + Math.floor(f() * (b - a + 1));
  f.range = (a, b) => a + f() * (b - a);
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.chance = p => f() < p;
  f.shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
  return f;
};
G.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
G.lerp = (a, b, t) => a + (b - a) * t;
G.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
G.angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
G.turn = (a, b, max) => { const d = G.angDiff(a, b); return Math.abs(d) <= max ? b : a + Math.sign(d) * max; };
G.rand = (a, b) => a + Math.random() * (b - a);
G.fa = n => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

/* ---------- سلاح‌ها ---------- */
// ap: ضریب آسیب به زره غرور | noise: شعاع صدا | pierce: تعداد نفوذ
G.WEAPONS = {
  m4:     { name: 'M4A1', cls: 'تفنگ تهاجمی', slot: 'p', dmg: 24, rpm: 720, mag: 30, reload: 2.1, spread: .035, range: 620, pellets: 1, pierce: 1, ap: .5, noise: 620, auto: 1, len: 17, snd: 'rifle' },
  g36:    { name: 'G36C', cls: 'کارابین', slot: 'p', dmg: 22, rpm: 690, mag: 30, reload: 2.0, spread: .04, range: 560, pellets: 1, pierce: 1, ap: .45, noise: 580, auto: 1, len: 15, snd: 'rifle' },
  scar:   { name: 'SCAR-H', cls: 'تفنگ رزمی', slot: 'p', dmg: 38, rpm: 520, mag: 20, reload: 2.4, spread: .03, range: 700, pellets: 1, pierce: 2, ap: .7, noise: 700, auto: 1, len: 18, snd: 'heavy' },
  mp5sd:  { name: 'MP5-SD', cls: 'مسلسل دستی صداخفه‌کن', slot: 'p', dmg: 17, rpm: 800, mag: 30, reload: 1.8, spread: .05, range: 420, pellets: 1, pierce: 1, ap: .25, noise: 190, auto: 1, len: 13, snd: 'sup' },
  vector: { name: 'Vector', cls: 'مسلسل دستی', slot: 'p', dmg: 15, rpm: 1100, mag: 25, reload: 1.7, spread: .065, range: 360, pellets: 1, pierce: 1, ap: .2, noise: 380, auto: 1, len: 12, snd: 'smg' },
  m870:   { name: 'M870', cls: 'شات‌گان پمپی', slot: 'p', dmg: 14, rpm: 75, mag: 6, reload: 2.8, spread: .11, range: 300, pellets: 8, pierce: 1, ap: .3, noise: 650, auto: 0, len: 17, knock: 60, snd: 'shotgun' },
  aa12:   { name: 'AA-12', cls: 'شات‌گان خودکار', slot: 'p', dmg: 10, rpm: 300, mag: 12, reload: 3.0, spread: .13, range: 280, pellets: 7, pierce: 1, ap: .25, noise: 700, auto: 1, len: 16, knock: 40, snd: 'shotgun' },
  m249:   { name: 'M249', cls: 'تیربار سبک (LMG)', slot: 'p', dmg: 22, rpm: 850, mag: 100, reload: 5.0, spread: .06, range: 680, pellets: 1, pierce: 1, ap: .55, noise: 800, auto: 1, len: 20, snd: 'heavy' },
  m14:    { name: 'M14 EBR', cls: 'تفنگ تیرانداز دقیق (DMR)', slot: 'p', dmg: 64, rpm: 240, mag: 15, reload: 2.5, spread: .012, range: 900, pellets: 1, pierce: 2, ap: .9, noise: 750, auto: 0, len: 21, snd: 'heavy' },
  m24:    { name: 'M24', cls: 'تک‌تیرانداز (Sniper)', slot: 'p', dmg: 190, rpm: 46, mag: 5, reload: 3.2, spread: .004, range: 1300, pellets: 1, pierce: 4, ap: 1.6, noise: 900, auto: 0, len: 24, snd: 'sniper' },
  rpg7:   { name: 'RPG-7', cls: 'آرپی‌جی', slot: 'p', dmg: 420, rpm: 20, mag: 1, reload: 3.5, spread: .01, range: 760, expl: 1, radius: 125, proj: 'rocket', reserve: 7, noise: 900, auto: 0, len: 24, snd: 'rocket' },
  m32:    { name: 'M32 MGL', cls: 'نارنجک‌انداز', slot: 'p', dmg: 230, rpm: 95, mag: 6, reload: 4.5, spread: .03, range: 520, expl: 1, radius: 92, proj: 'gren', reserve: 18, noise: 500, auto: 0, len: 15, snd: 'thump' },
  m9:     { name: 'M9', cls: 'کلت', slot: 's', dmg: 20, rpm: 380, mag: 15, reload: 1.4, spread: .03, range: 420, pellets: 1, pierce: 1, ap: .3, noise: 480, auto: 0, len: 8, snd: 'pistol' },
  deagle: { name: 'Desert Eagle', cls: 'کلت سنگین', slot: 's', dmg: 56, rpm: 180, mag: 7, reload: 1.7, spread: .025, range: 520, pellets: 1, pierce: 2, ap: .7, noise: 650, auto: 0, len: 9, snd: 'heavy' },
  sawed:  { name: 'Super Shorty', cls: 'شات‌گان دستی', slot: 's', dmg: 13, rpm: 150, mag: 2, reload: 2.0, spread: .17, range: 210, pellets: 8, pierce: 1, ap: .3, noise: 620, auto: 0, len: 9, knock: 70, snd: 'shotgun' },
  m79:    { name: 'M79', cls: 'نارنجک‌انداز دستی', slot: 's', dmg: 210, rpm: 40, mag: 1, reload: 2.6, spread: .02, range: 460, expl: 1, radius: 88, proj: 'gren', reserve: 6, noise: 500, auto: 0, len: 10, snd: 'thump' },
  knife:  { name: 'چاقو', cls: 'سلاح سرد', slot: 'k', dmg: 58, rpm: 133, mag: 1, reload: 0, spread: 0, range: 40, ap: .3, noise: 0, auto: 1, len: 6, melee: 1, snd: 'knife' },
};
Object.keys(G.WEAPONS).forEach(k => G.WEAPONS[k].id = k);
G.POOL = {
  cmd: ['m4', 'g36', 'scar', 'mp5sd', 'vector', 'm870', 'aa12', 'm249', 'm14', 'm24', 'rpg7', 'm32'],
  alpha: ['mp5sd', 'vector', 'm870', 'aa12', 'm4', 'g36', 'scar'],
  delta: ['m249', 'm14', 'm24', 'rpg7', 'm32', 'g36', 'scar'],
  sec: ['m9', 'deagle', 'sawed', 'm79'],
};

/* ---------- تیم‌ها ---------- */
G.TEAMS = {
  alpha: {
    key: 'alpha', name: 'نیروهای ویژه', short: 'ویژه', color: '#ff8a3c', hp: 125,
    roles: [
      { role: 'تهاجمی', p: 'm4', s: 'm9', name: 'میلر' },
      { role: 'رخنه‌گر', p: 'm870', s: 'deagle', name: 'ریس' },
      { role: 'پیشرو', p: 'mp5sd', s: 'sawed', name: 'واکر' },
      { role: 'تفنگدار', p: 'scar', s: 'm9', name: 'هیز' },
      { role: 'پاکساز', p: 'aa12', s: 'm9', name: 'کوپر' },
      { role: 'شناسایی', p: 'vector', s: 'deagle', name: 'بروکس' },
    ],
  },
  delta: {
    key: 'delta', name: 'دلتا فورس', short: 'دلتا', color: '#4db8ff', hp: 105,
    roles: [
      { role: 'تیربارچی', p: 'm249', s: 'm9', name: 'پرایس' },
      { role: 'تیرانداز دقیق', p: 'm14', s: 'deagle', name: 'میسون' },
      { role: 'تک‌تیرانداز', p: 'm24', s: 'm9', name: 'گریوز' },
      { role: 'تخریب‌چی', p: 'rpg7', s: 'm79', name: 'کوالسکی', demo: 1 },
      { role: 'امدادگر', p: 'g36', s: 'm9', name: 'سندرز', medic: 1 },
      { role: 'نارنجک‌انداز', p: 'm32', s: 'sawed', name: 'هارپر', demo: 1 },
    ],
  },
};

/* ---------- زامبی‌های هفت گناه ---------- */
G.ZT = {
  wrath:    { name: 'خشم', hp: 70, speed: 112, dmg: 20, atkCd: .7, r: 10, sight: 330, color: '#ff3b2f', score: 10, desc: 'سریع و قوی ولی آسیب‌پذیر؛ با دیدن هدف یورش می‌برد.' },
  greed:    { name: 'طمع', hp: 50, speed: 106, dmg: 8, atkCd: .6, r: 9, sight: 470, color: '#ffc93c', score: 10, desc: 'پرسه‌زن و جستجوگر؛ با جیغ خود دیگران را خبر می‌کند.' },
  gluttony: { name: 'شکم‌پرستی', hp: 700, speed: 34, dmg: 32, atkCd: 1.4, r: 15, sight: 340, color: '#9bd41e', score: 60, desc: 'بزرگ و چاق؛ اسید پرتاب می‌کند و هنگام مرگ می‌ترکد.' },
  sloth:    { name: 'تنبلی', hp: 320, speed: 0, dmg: 10, atkCd: 1.5, r: 15, sight: 0, color: '#8fa3c4', score: 30, desc: 'مثل دیوار مسیر را بسته؛ فقط با انفجار نابود می‌شود.' },
  lust:     { name: 'شهوت', hp: 520, speed: 0, dmg: 12, atkCd: 1.2, r: 14, sight: 540, color: '#ff4fa3', score: 80, desc: 'ریشه در زمین دارد و پیوسته همزاد تولید می‌کند.' },
  envy:     { name: 'حسادت', hp: 110, speed: 78, dmg: 14, atkCd: .8, r: 10, sight: 350, color: '#19e68c', score: 40, desc: 'شکل زامبی‌های دیگر را کپی می‌کند، قوی‌تر از نمونهٔ اصلی.' },
  pride:    { name: 'غرور', hp: 220, armor: 260, speed: 54, dmg: 30, atkCd: 1.1, r: 12, sight: 330, color: '#b57bff', score: 70, desc: 'زره‌پوش؛ زره‌اش فقط با گلولهٔ نافذ یا انفجار می‌شکند.' },
  twin:     { name: 'همزاد', hp: 38, speed: 92, dmg: 8, atkCd: .7, r: 8, sight: 420, color: '#ff8cc6', score: 4, desc: 'زادهٔ شهوت.' },
};
G.SINS = ['wrath', 'greed', 'gluttony', 'sloth', 'lust', 'envy', 'pride'];
G.ZONES = [
  { key: 'green', name: 'منطقهٔ سبز — پیاده‌سازی', short: 'سبز', color: '#3ddc84', dark: 0 },
  { key: 'yellow', name: 'منطقهٔ زرد', short: 'زرد', color: '#ffd23c', dark: .08 },
  { key: 'red', name: 'منطقهٔ قرمز', short: 'قرمز', color: '#ff4a3c', dark: .2 },
  { key: 'black', name: 'منطقهٔ مشکی', short: 'مشکی', color: '#9a5cff', dark: .36 },
  { key: 'blue', name: 'منطقهٔ آبی — خروج', short: 'آبی', color: '#4db8ff', dark: .04 },
];
G.FORMS = [['wedge', 'مثلثی'], ['line', 'خطی'], ['column', 'ستونی'], ['circle', 'دفاعی']];

/* ---------- چرخ فرمان ---------- */
// سه دایره: اصلی (هر دو تیم) + نیروهای ویژه + دلتا. زاویه به درجه، ۰ = راست، ۹۰ = پایین
(function () {
  const fireat = { id: 'fireat', t: 'شلیک به نقطه', pt: 1 }, blast = { id: 'blast', t: 'انفجار نقطه', pt: 1 }, back = { back: 1, t: 'بازگشت' };
  const ring = (title, color, items, backAt) => { const n = items.length, span = 360 / n, bi = items.findIndex(x => x.back); return { title, color, items, span, off: bi >= 0 ? backAt - bi * span : 0 }; };
  G.WHEELS = {
    main: ring('هر دو تیم', '#e8c15a', [{ sub: 'alpha', t: 'نیروهای ویژه', color: '#ff8a3c' }, fireat, blast, { id: 'move', t: 'برو به نقطه', pt: 1 }, { id: 'form', t: 'آرایش' }, { sub: 'delta', t: 'دلتا فورس', color: '#4db8ff' }, { id: 'follow', t: 'دنبال من' }, { id: 'regroup', t: 'تجمع' }, { id: 'hold', t: 'ایست' }, { id: 'fire', t: 'آتش‌بس' }]),
    alpha: ring('نیروهای ویژه', '#ff8a3c', [{ id: 'assault', t: 'حمله', pt: 1 }, { id: 'clear', t: 'پاکسازی', pt: 1 }, { id: 'sd', t: 'جستجو و نابودی', pt: 1 }, { id: 'destroy', t: 'نابودی هدف', pt: 1 }, fireat, blast, back], 180),
    delta: ring('دلتا فورس', '#4db8ff', [{ id: 'defend', t: 'دفاع', pt: 1 }, { id: 'patrol', t: 'گشت‌زنی', pt: 1 }, { id: 'cover', t: 'کاور' }, { id: 'distract', t: 'حواس‌پرتی', pt: 1 }, { id: 'firesup', t: 'پشتیبانی آتش', pt: 1 }, fireat, blast, back], 0),
  };
})();
G.PTCMD = { move: 1, assault: 1, clear: 1, sd: 1, destroy: 1, defend: 1, patrol: 1, distract: 1, firesup: 1, fireat: 1, blast: 1 };

/* ---------- عملیات‌ها ---------- */
G.MISSIONS = [
  { id: 'crash', n: 1, name: 'سقوط', loc: 'منطقهٔ قرنطینه', time: '۰۵:۴۰', map: 'crash', logic: 'crash', samples: 1, popK: .6,
    yellowX: 'gluttony', redX: ['gluttony', 'envy', 'pride'], zones: ['ایست بازرسی', 'حلقهٔ بیرونی', 'منطقهٔ بمباران‌شده', 'محل سقوط'], labels: { lz: 'ورود', core: 'محل سقوط' } },
  { id: 'l2', n: 2, locked: 1 }, { id: 'l3', n: 3, locked: 1 }, { id: 'l4', n: 4, locked: 1 }, { id: 'l5', n: 5, locked: 1 },
  // مرحلهٔ کنار گذاشته‌شده (فقط با ?dev در آدرس دیده می‌شود)
  { id: 'zones', n: 0, name: 'میدان آزمایشی', loc: 'مناطق پنج‌گانه', time: '—', map: 'zones', logic: 'zones', samples: 2, hidden: 1, labels: { lz: 'پیاده‌سازی', ex: 'خروج', core: 'هسته' } },
];
G.loadProg = function () { try { return JSON.parse(localStorage.getItem('blackveil_prog') || '{}') || {}; } catch (e) { return {}; } };
G.saveProg = function (p) { try { localStorage.setItem('blackveil_prog', JSON.stringify(p)); } catch (e) { /* ignore */ } };

/* ---------- تنظیمات ---------- */
G.defaultSettings = function () {
  return {
    diff: 1, alphaN: 5, deltaN: 5, sound: 1,
    cmd: { p: 'm4', s: 'm9' },
    alpha: G.TEAMS.alpha.roles.map(r => ({ p: r.p, s: r.s })),
    delta: G.TEAMS.delta.roles.map(r => ({ p: r.p, s: r.s })),
  };
};
G.loadSettings = function () {
  const d = G.defaultSettings();
  try {
    const s = JSON.parse(localStorage.getItem('blackmatter7') || 'null');
    if (s) {
      ['diff', 'alphaN', 'deltaN', 'sound'].forEach(k => { if (typeof s[k] === 'number') d[k] = s[k]; });
      const okW = (id, pool) => G.POOL[pool].indexOf(id) >= 0;
      if (s.cmd && okW(s.cmd.p, 'cmd') && okW(s.cmd.s, 'sec')) d.cmd = s.cmd;
      ['alpha', 'delta'].forEach(t => { if (Array.isArray(s[t])) s[t].forEach((m, i) => { if (d[t][i] && m && okW(m.p, t) && okW(m.s, 'sec')) d[t][i] = { p: m.p, s: m.s }; }); });
    }
  } catch (e) { /* ignore */ }
  d.alphaN = 5; d.deltaN = 5; d.diff = G.clamp(d.diff | 0, 0, 2);
  return d;
};
G.saveSettings = function () { try { localStorage.setItem('blackmatter7', JSON.stringify(G.settings)); } catch (e) { /* ignore */ } };

/* ---------- صدا (سنتز WebAudio) ---------- */
G.audio = (function () {
  let ac = null, noiseBuf = null, master = null; const last = {};
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ac = new AC(); master = ac.createGain(); master.gain.value = .5; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  }
  function noise(dur, freq, q, vol, type) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq; f.Q.value = q || 1;
    const g = ac.createGain(); const t = ac.currentTime;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }
  function tone(f0, f1, dur, vol, type) {
    const o = ac.createOscillator(); o.type = type || 'sine'; const g = ac.createGain(); const t = ac.currentTime;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02);
  }
  const S = {
    rifle: v => { noise(.09, 2600, 1, .5 * v); tone(190, 60, .07, .3 * v, 'square'); },
    heavy: v => { noise(.14, 1700, 1, .6 * v); tone(140, 45, .1, .4 * v, 'square'); },
    smg: v => { noise(.06, 3200, 1, .38 * v); tone(240, 90, .05, .2 * v, 'square'); },
    sup: v => { noise(.05, 900, 2, .2 * v); },
    pistol: v => { noise(.07, 2900, 1, .4 * v); tone(260, 90, .05, .22 * v, 'square'); },
    shotgun: v => { noise(.22, 1200, .7, .75 * v); tone(110, 35, .16, .45 * v, 'sawtooth'); },
    sniper: v => { noise(.3, 2100, .7, .8 * v); tone(120, 30, .25, .5 * v, 'sawtooth'); },
    rocket: v => { noise(.5, 700, 1, .5 * v, 'bandpass'); tone(300, 80, .4, .2 * v, 'sawtooth'); },
    thump: v => { tone(180, 50, .16, .6 * v, 'sine'); noise(.08, 600, 1, .3 * v); },
    knife: v => { noise(.08, 5000, 3, .18 * v, 'highpass'); },
    boom: v => { noise(.9, 420, .6, 1 * v); tone(90, 22, .7, .8 * v, 'sine'); },
    hit: v => { tone(160, 60, .1, .35 * v, 'triangle'); },
    growl: v => { tone(95 + Math.random() * 40, 50, .35, .22 * v, 'sawtooth'); },
    screech: v => { tone(900, 1700, .3, .16 * v, 'sawtooth'); },
    splat: v => { noise(.18, 500, 1, .3 * v); },
    reload: v => { noise(.03, 4000, 4, .15 * v, 'bandpass'); },
    ui: v => { tone(660, 880, .06, .15 * v, 'sine'); },
    radio: v => { tone(1200, 1000, .05, .08 * v, 'square'); noise(.07, 3000, 2, .07 * v, 'bandpass'); },
    alarm: v => { tone(700, 500, .25, .2 * v, 'square'); },
    beep: v => { tone(1500, 1500, .07, .12 * v, 'sine'); },
    armor: v => { tone(2200, 1400, .06, .14 * v, 'triangle'); },
  };
  // dist: فاصله تا فرمانده برای کم‌کردن صدا
  function play(name, dist) {
    if (!ac || !G.settings || !G.settings.sound) return;
    const now = ac.currentTime; if (last[name] && now - last[name] < .035) return; last[name] = now;
    const v = dist ? G.clamp(1 - dist / 1100, 0, 1) : 1; if (v <= .03) return;
    try { S[name](v * v); } catch (e) { /* ignore */ }
  }
  return { init, play };
})();
