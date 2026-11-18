// Two languages, Persian and English, for everything: the canvas HUD and banners, the menus and the help card.
import { Painter } from "../vendor/pixelfx/src/core/index.js";

let lang = "fa";
try { lang = localStorage.getItem("nova-lang") || "fa"; } catch (e) { /* blocked */ }
export const getLang = () => lang;

const FA = {
  "METEOR": "شهاب‌سنگ", "METEOR READY - R": "شهاب‌سنگ آماده - R", "METEOR READY  [R]": "شهاب‌سنگ آماده است [R]", "METEOR!": "شهاب‌سنگ!", "NUKE": "بمب اتمی", "NUKE READY - R": "بمب آماده - R", "NUKE READY  [R]": "بمب اتمی آماده است [R]", "NUKE!": "انفجار اتمی!",
  "NOVA": "نووا", "OMEGA": "اُمگا", "NOVA DOWN": "نووا از پا افتاد", "OMEGA FALLS": "اُمگا نابود شد", "OMEGA HAS COME FOR YOU": "اُمگا به سراغت آمده",
  "FLARE! REINFORCEMENTS": "منور! نیروی کمکی", "SPEEDBOATS": "قایق‌های تندرو", "FRIGATE INBOUND": "ناوچه در راه است", "DESTROYER INBOUND": "ناوشکن در راه است",
  "GUNSHIP INBOUND": "بالگرد جنگی در راه است", "JETS INBOUND": "جنگنده‌ها در راهند", "MOONFALL!": "سقوط ماه!",
  "DEMOLITION!": "تخریب!", "RAMPAGE!": "ویرانگری!", "DEVASTATION!": "نابودی!", "CATACLYSM!": "فاجعه!", "APOCALYPSE!": "آخرالزمان!", "EXTINCTION EVENT!": "انقراض!",
  "CITY": "شهر", "FOREST": "جنگل", "MOUNTAINS": "کوهستان", "SEA": "دریا", "DESERT": "بیابان", "SNOW PEAKS": "قله‌های برفی", "VOLCANOES": "آتشفشان‌ها", "OPEN OCEAN": "اقیانوس", "BEANSTALK": "لوبیای سحرآمیز",
  "AQUA": "آب", "ARCANE": "جادو", "BLACK HOLE": "سیاه‌چاله", "EMPTY": "خالی", "FROST": "یخ", "HEAT VISION": "نگاه لیزری", "INFERNO": "دوزخ", "MJOLNIR": "میولنیر", "PETS": "حیوانات", "RADIANCE": "پرتو آسمانی", "TORNADO": "گردباد",
};
export function tr(s) {
  if (lang !== "fa" || typeof s !== "string") return s;
  if (FA[s]) return FA[s];
  let m;
  if ((m = s.match(/^BEST (\d+)$/))) return "رکورد " + m[1];
  if ((m = s.match(/^(\d+) M$/))) return m[1] + " متر";
  return s;
}

// Persian on the pixel canvas: rasterise with the browser, threshold to hard pixels, cache, stamp like the bitmap font
const FA_RE = /[؀-ۿ]/, cache = new Map();
let cv = null;
function glyphs(str, k) {
  const key = k + "|" + str;
  let g = cache.get(key);
  if (g) return g;
  cv = cv || document.createElement("canvas");
  const size = 9 * k + 2, ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.font = `700 ${size}px Vazirmatn, Tahoma, sans-serif`;
  const w = Math.ceil(ctx.measureText(str).width) + 4, h = Math.ceil(size * 1.7);
  cv.width = w; cv.height = h;
  ctx.font = `700 ${size}px Vazirmatn, Tahoma, sans-serif`; ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff";
  ctx.fillText(str, w - 2, h / 2);
  const d = ctx.getImageData(0, 0, w, h).data, px = [];
  let y0 = h, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 110) { px.push(x, y); if (y < y0) y0 = y; if (y > y1) y1 = y; }
  g = { w, px, y0: Math.max(0, Math.min(y0, Math.round(h / 2 - size * 0.45))) };
  if (cache.size > 300) cache.clear();
  cache.set(key, g);
  return g;
}
const orig = Painter.prototype.text;
Painter.prototype.text = function (str, x, y, c, opts = {}) {
  str = tr(str);
  if (!FA_RE.test(str)) return orig.call(this, str, x, y, c, opts);
  const k = opts.scale ?? 1, a = opts.a ?? 1, g = glyphs(str, k);
  const left = Math.round(opts.align === "center" ? x - g.w / 2 : opts.align === "right" ? x - g.w : x), top = Math.round(y) - g.y0 - 1;
  const P = g.px, col = typeof c === "function" ? c(0, 0) : c;
  if (opts.outline !== undefined) for (let i = 0; i < P.length; i += 2) this.rect(left + P[i] - 1, top + P[i + 1] - 1, 3, 3, opts.outline, a);
  for (let i = 0; i < P.length; i += 2) this.rect(left + P[i], top + P[i + 1], 1, 1, col, a);
};

// Persian for the HTML menus, as crisp pixel text: rasterised small, thresholded, shown scaled up with hard pixels
const imgCache = new Map();
function pixImg(str, color, px) {
  const key = str + "|" + color + "|" + px;
  if (imgCache.has(key)) return imgCache.get(key);
  const c = document.createElement("canvas"), x = c.getContext("2d", { willReadFrequently: true });
  const F = `700 ${px}px Vazirmatn, Tahoma, sans-serif`;
  x.font = F; const w = Math.ceil(x.measureText(str).width) + 4, h = Math.ceil(px * 1.8);
  c.width = w; c.height = h; x.font = F; x.direction = "rtl"; x.textAlign = "right"; x.textBaseline = "middle"; x.fillStyle = "#fff"; x.fillText(str, w - 3, h / 2);
  const d = x.getImageData(0, 0, w, h), a = d.data, o = new ImageData(w, h), b = o.data;
  const r = parseInt(color.slice(1, 3), 16), g = parseInt(color.slice(3, 5), 16), bl = parseInt(color.slice(5, 7), 16);
  for (let i = 0; i < w * h; i++) {
    if (a[i * 4 + 3] > 110) { b[i * 4] = r; b[i * 4 + 1] = g; b[i * 4 + 2] = bl; b[i * 4 + 3] = 255; }
    else { const y = (i / w) | 0, xx = i % w; if (y > 0 && xx > 0 && a[(i - w - 1) * 4 + 3] > 110) { b[i * 4 + 3] = 255; } } // hard shadow
  }
  x.putImageData(o, 0, 0);
  const out = { src: c.toDataURL(), w, h };
  imgCache.set(key, out);
  return out;
}
/** Set an element's label: Persian as pixel art, English as text in the pixel font. */
export function label(el, en, fa, color, px = 11, k = 2) {
  if (lang !== "fa") { el.textContent = en; return; }
  const im = pixImg(fa, color || getComputedStyle(el).color.replace(/rgba?\((\d+), (\d+), (\d+).*/, (m, r, g, b) => "#" + [r, g, b].map((v) => (+v).toString(16).padStart(2, "0")).join("")), px);
  el.innerHTML = `<img class="pxt" src="${im.src}" width="${im.w * k}" height="${im.h * k}" alt="${fa}">`;
}

// the HTML: elements carry data-fa / data-en (those with data-px are drawn as pixel text in Persian)
export function applyHtml() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll("[data-fa]")) {
    if (el.dataset.px !== undefined) label(el, el.dataset.en, el.dataset.fa, el.dataset.col, +(el.dataset.px || 11), 2);
    else el.innerHTML = lang === "fa" ? el.dataset.fa : el.dataset.en;
  }
  document.body.classList.toggle("en", lang === "en");
}
export function setLang(l) { lang = l; try { localStorage.setItem("nova-lang", l); } catch (e) { /* blocked */ } cache.clear(); applyHtml(); }
