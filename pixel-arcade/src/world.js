// The world: an endless strip of destructible cells (4 px each), generated chunk by chunk.
// City, forest, mountains and sea zones; structures that collapse when cut loose; fire that spreads.

import { rgb } from "../vendor/pixelfx/src/core/index.js";

// WH: the world goes deep; the bottom LAVA rows are molten rock nothing can dig through
// UP: rows of open air added over the old ground line, so towers have room to rise
export const CELL = 4, CW = 64, UP = 200, WH = 640 + UP, SEA = 146 + UP, ZONE = 10, LAVA = 28;
export const WORLD_PX_H = WH * CELL;
export const M = {
  AIR: 0, DIRT: 1, GRASS: 2, STONE: 3, SAND: 4, SNOW: 5, ROAD: 6, BEDROCK: 7,
  CONCRETE: 8, BRICK: 9, GLASS: 10, STEEL: 11, WOOD: 12, LEAVES: 13, ROOF: 14, FUEL: 15, SIGN: 16, LAMP: 17, PINE: 18, BASALT: 19, MAGMA: 20, CACTUS: 21, STALK: 22, CRYSTAL: 23,
};
const NM = 24;
//                 air dirt grass stone sand snow road bedrock conc brick glass steel wood leaves roof fuel sign lamp pine
export const HP = [0, 2, 2, 5, 1, 1, 3, 255, 4, 3, 1, 7, 2, 1, 2, 1, 1, 1, 1, 5, 1, 1, 3, 2];
export const SOLID = [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1];
export const FLAM = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0];
export const isStruct = (m) => (m >= 8 && m <= 18) || m === 21;
const BASE = [
  0, 0x6b4a32, 0x5a9a3a, 0x7c7a84, 0xd9c07a, 0xf2f6fa, 0x4b4a55, 0xe8501a,
  0xb9b0a0, 0xa65a3c, 0x86cfe0, 0x5c6676, 0x8a5a34, 0x3f8a3a, 0x8a3434, 0xd03a2c, 0xe8dcc0, 0xffe27a, 0x2c6a4a, 0x3a3238, 0xff7a1a, 0x4a8a3a, 0x3fa83a, 0xc080ff,
];
export const MAT_COLOR = BASE.map((c) => rgb(c >> 16, (c >> 8) & 255, c & 255));

// ---- hashing and noise
export function hash(x, y = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 2246822519);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}
function vnoise(x, seed) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u;
}
const fbm = (x, seed) => vnoise(x, seed) * 0.55 + vnoise(x * 2.1, seed + 1) * 0.3 + vnoise(x * 4.3, seed + 2) * 0.15;

// ---- textures: 16 x 16 px per material (4 x 4 cells), normal / scorched / background
const sh = (c, k) => {
  const r = Math.min(255, ((c >> 16) & 255) * k), g = Math.min(255, ((c >> 8) & 255) * k), b = Math.min(255, (c & 255) * k);
  return rgb(r, g, b);
};
function texel(m, x, y) {
  const n = hash(x + m * 31, y + m * 17), b = BASE[m];
  switch (m) {
    case M.DIRT: return sh(b, n < 0.12 ? 0.75 : n > 0.9 ? 1.15 : 1);
    case M.GRASS: return y % 4 < 2 ? sh(0x5a9a3a, y % 4 === 0 ? (n > 0.5 ? 1.25 : 1.1) : 0.9) : sh(0x6b4a32, n < 0.15 ? 0.8 : 1);
    case M.STONE: return sh(b, (x + y * 3) % 16 === 0 || n < 0.08 ? 0.7 : n > 0.85 ? 1.12 : 1);
    case M.SAND: return sh(b, n < 0.1 ? 0.86 : n > 0.9 ? 1.08 : 1);
    case M.SNOW: return sh(b, n < 0.12 ? 0.9 : 1);
    case M.ROAD: return y % 4 === 0 ? sh(0x8a8894, 1) : sh(b, n < 0.1 ? 0.85 : 1);
    case M.BEDROCK: return n < 0.12 ? sh(0xfff07a, 1) : n < 0.35 ? sh(0xffa030, 1) : n > 0.9 ? sh(0x8a1a10, 1) : sh(b, 1);
    case M.CONCRETE: return sh(b, x % 8 === 0 || y % 8 === 0 ? 0.82 : n > 0.92 ? 0.93 : 1);
    case M.BRICK: return y % 4 === 3 || (x + (y >> 2 & 1) * 4) % 8 === 7 ? sh(0xd8c8b0, 0.8) : sh(b, 0.9 + hash((x + (y >> 2 & 1) * 4) >> 3, y >> 2) * 0.25);
    case M.GLASS: return (x + y) % 8 < 2 ? sh(0xd8f6ff, 1) : x % 4 === 0 || y % 4 === 0 ? sh(b, 0.72) : sh(b, 1);
    case M.STEEL: return x % 4 === 0 || y % 4 === 0 ? sh(b, 0.65) : (x % 4 === 2 && y % 4 === 2) ? sh(b, 1.45) : sh(b, 1);
    case M.WOOD: return sh(b, x % 4 === 0 ? 0.7 : hash(x, y >> 2) > 0.7 ? 0.88 : 1);
    case M.LEAVES: return sh(b, n < 0.25 ? 0.7 : n > 0.8 ? 1.3 : 1);
    case M.PINE: return sh(b, n < 0.3 ? 0.72 : n > 0.85 ? 1.3 : 1);
    case M.ROOF: return sh(b, y % 4 === 3 ? 0.65 : (x + (y >> 2 & 1) * 2) % 4 === 0 ? 0.8 : 1);
    case M.FUEL: return y % 8 < 2 ? ((x + y) % 4 < 2 ? sh(0xffd23c, 1) : sh(0x221c1c, 1)) : sh(b, x % 4 === 0 ? 0.75 : x % 4 === 1 ? 1.2 : 1);
    case M.SIGN: return y % 8 < 4 ? sh(0xd8402c, x % 4 === 3 ? 0.85 : 1) : sh(b, x % 4 === 3 ? 0.9 : 1);
    case M.BASALT: return sh(b, (x * 3 + y) % 11 === 0 || n < 0.1 ? 0.65 : n > 0.88 ? 1.25 : 1);
    case M.MAGMA: return n < 0.2 ? sh(0xfff07a, 1) : n < 0.55 ? sh(0xffa030, 1) : n > 0.9 ? sh(0x8a1a10, 1) : sh(b, 1);
    case M.STALK: return sh(b, (x + (y >> 1)) % 8 < 2 ? 0.72 : x % 8 === 5 ? 1.25 : n > 0.9 ? 1.15 : 1);
    case M.CRYSTAL: return sh(b, (x + y) % 6 === 0 ? 1.6 : (x - y + 16) % 5 === 0 ? 0.7 : 1);
    case M.CACTUS: return sh(b, x % 4 === 0 ? 0.75 : x % 4 === 2 ? 1.18 : 1);
    case M.LAMP: return sh(b, (x % 4 === 0 || y % 4 === 0) ? 0.85 : 1.1);
  }
  return 0;
}
const TEX = [], TEXS = [], TEXB = [];
for (let m = 0; m < NM; m++) {
  const a = new Uint32Array(256), s = new Uint32Array(256), bgt = new Uint32Array(256);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const c = texel(m, x, y), r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
    a[y * 16 + x] = c;
    s[y * 16 + x] = rgb(r * 0.3 + 8, g * 0.28 + 6, b * 0.3 + 10);
    bgt[y * 16 + x] = m === M.GLASS ? rgb(r * 0.5 + 60, g * 0.5 + 50, b * 0.45 + 20) : rgb(r * 0.5 + 12, g * 0.48 + 10, b * 0.52 + 18);
  }
  TEX.push(a); TEXS.push(s); TEXB.push(bgt);
}
const CAVE = new Uint32Array(256);
for (let i = 0; i < 256; i++) { const n = hash(i % 16, (i >> 4) + 99); CAVE[i] = n < 0.15 ? rgb(34, 26, 30) : rgb(42, 33, 36); }

// ---- zones and terrain height
const CITY = 0, FOREST = 1, MOUNT = 2, SEAB = 3, DESERT = 4, SNOWY = 5, VOLCANO = 6, OCEAN = 7, BEAN = 8;
export const BIOMES = { CITY, FOREST, MOUNT, SEAB, DESERT, SNOWY, VOLCANO, OCEAN, BEAN };
const RING = [CITY, CITY, FOREST, BEAN, MOUNT, MOUNT, CITY, DESERT, DESERT, DESERT, DESERT, CITY, FOREST, SNOWY, SNOWY, MOUNT, VOLCANO, VOLCANO, FOREST, CITY, SEAB, CITY, FOREST, OCEAN, OCEAN, OCEAN];
export const BIOME_NAMES = ["CITY", "FOREST", "MOUNTAINS", "SEA", "DESERT", "SNOW PEAKS", "VOLCANOES", "OPEN OCEAN", "BEANSTALK"];
export class World {
  constructor(seed = 1337) {
    this.seed = seed;
    this.chunks = new Map();
    this.queue = [];
    this.islands = [];
    this.burning = new Map();
    this.fuel = [];
    this.hooks = {};
    this.spawns = [];
    this.debrisK = 1;
    this.destroyed = 0;
    this._lastCi = null; this._last = null;
    this.fireAcc = 0;
    this.regrow = []; this.clock = 0; this.regrowI = 0;
  }
  zoneBiome(z) {
    // the world is round: this ring of zones repeats, so going on in one direction brings you back round
    const n = RING.length;
    return RING[((z % n) + n) % n];
  }
  biomeAt(cx) { return this.zoneBiome(Math.floor(cx / (ZONE * CW))); }
  hBiome(b, cx) {
    const s = this.seed;
    if (b === CITY) return 140 + UP;
    if (b === FOREST || b === BEAN) return UP + Math.round(138 - (fbm(cx / 26, s + 5) - 0.5) * 16);
    if (b === MOUNT) { const r = 1 - Math.abs(fbm(cx / 70, s + 9) * 2 - 1); return UP + Math.round(134 - Math.pow(r, 1.6) * 70 - fbm(cx / 9, s + 12) * 7); }
    if (b === OCEAN) return UP + Math.round(300 - (fbm(cx / 30, s + 41) - 0.5) * 30);
    if (b === DESERT) return UP + Math.round(140 - Math.abs(Math.sin(cx / 23 + fbm(cx / 40, s + 21) * 4)) * 12 - fbm(cx / 60, s + 22) * 6);
    if (b === SNOWY) { const r = 1 - Math.abs(fbm(cx / 55, s + 25) * 2 - 1); return UP + Math.round(130 - Math.pow(r, 1.4) * 95 - fbm(cx / 8, s + 26) * 6); }
    if (b === VOLCANO) {
      // cone peaks every ~110 cells, each with a crater at its top
      const P = 110, k = Math.floor(cx / P), u = cx - k * P - P / 2, hk = 70 + hash(k, s + 31) * 40, d = Math.abs(u);
      let h = 138 - Math.max(0, hk - d * 1.5) - fbm(cx / 7, s + 32) * 4;
      if (d < 7) h += 10 - d;
      return UP + Math.round(h);
    }
    return UP + Math.round(168 - (fbm(cx / 20, s + 15) - 0.5) * 8);
  }
  height(cx) {
    const zw = ZONE * CW, zf = cx / zw, z = Math.floor(zf), u = zf - z, b = this.zoneBiome(z);
    let h = this.hBiome(b, cx);
    const E = 0.1;
    if (u < E || u > 1 - E) {
      const z2 = u < E ? z - 1 : z + 1, b2 = this.zoneBiome(z2);
      if (b2 !== b) {
        let t = u < E ? 0.5 + u / (2 * E) : 0.5 + (1 - u) / (2 * E);
        t = t * t * (3 - 2 * t);
        h = Math.round(this.hBiome(b2, cx) * (1 - t) + h * t);
      }
    }
    return h;
  }

  // ---- chunks
  chunk(ci) {
    if (ci === this._lastCi) return this._last;
    let c = this.chunks.get(ci);
    if (!c) { c = this.generate(ci); }
    this._lastCi = ci; this._last = c;
    return c;
  }
  get(cx, cy) {
    if (cy < 0) return 0;
    if (cy >= WH) return M.BEDROCK;
    return this.chunk(cx >> 6).fg[(cx & 63) * WH + cy];
  }
  getBg(cx, cy) {
    if (cy < 0 || cy >= WH) return 0;
    return this.chunk(cx >> 6).bg[(cx & 63) * WH + cy];
  }
  set(cx, cy, m) { if (cy >= 0 && cy < WH) this.chunk(cx >> 6).fg[(cx & 63) * WH + cy] = m; }
  setBg(cx, cy, m) { if (cy >= 0 && cy < WH) this.chunk(cx >> 6).bg[(cx & 63) * WH + cy] = m; }
  solid(cx, cy) { return SOLID[this.get(cx, cy)] === 1; }
  solidPx(x, y) { return SOLID[this.get(Math.floor(x / CELL), Math.floor(y / CELL))] === 1; }
  wet(cx) { return this.chunk(cx >> 6).hgt[cx & 63] > SEA; }
  inWater(x, y) {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    return cy >= SEA && this.wet(cx) && !SOLID[this.get(cx, cy)];
  }
  /** The natural ground line (ignoring buildings) under pixel x, as a pixel y. */
  groundPx(x) { const cx = Math.floor(x / CELL); return this.chunk(cx >> 6).hgt[cx & 63] * CELL; }
  /** The first solid row at or below row `from` in the column of pixel x, as a pixel y. */
  surfaceY(x, from = 0) {
    const cx = Math.floor(x / CELL);
    // out on the sea the water is the surface: strikes, waves, spawns and fliers all treat it as the floor
    const sea = from < SEA * CELL && this.wet(cx) ? SEA * CELL : Infinity;
    for (let cy = Math.max(0, Math.floor(from / CELL)); cy < WH; cy++) if (SOLID[this.get(cx, cy)]) return Math.min(cy * CELL, sea);
    return Math.min(WH * CELL, sea);
  }
  /** The real floor under pixel x (the sea bed out on the water). */
  floorY(x, from = 0) {
    const cx = Math.floor(x / CELL);
    for (let cy = Math.max(0, Math.floor(from / CELL)); cy < WH; cy++) if (SOLID[this.get(cx, cy)]) return cy * CELL;
    return WH * CELL;
  }
  /** March a ray; returns { x, y, hit, d }. */
  raycast(x, y, dx, dy, max) {
    for (let d = 0; d < max; d += 2) {
      const px = x + dx * d, py = y + dy * d;
      if (this.solidPx(px, py)) return { x: px, y: py, hit: true, d };
    }
    return { x: x + dx * max, y: y + dy * max, hit: false, d: max };
  }

  generate(ci) {
    const c = { fg: new Uint8Array(CW * WH), bg: new Uint8Array(CW * WH), dmg: new Uint8Array(CW * WH), hgt: new Int16Array(CW), ci };
    this.chunks.set(ci, c);
    const x0 = ci * CW;
    for (let lx = 0; lx < CW; lx++) {
      const cx = x0 + lx, h = this.height(cx), b = this.biomeAt(cx);
      c.hgt[lx] = h;
      const o = lx * WH;
      for (let cy = h; cy < WH; cy++) {
        const d = cy - h;
        let m;
        if (cy >= WH - LAVA) m = M.BEDROCK;
        else if (d > 40 && hash(cx >> 2, cy >> 2) < 0.06) m = M.DIRT;
        else if (h > SEA - 2) m = d < 6 ? M.SAND : M.STONE;
        else if (b === DESERT) m = d < 80 ? M.SAND : M.STONE;
        else if (b === SNOWY) m = d < 3 ? M.SNOW : M.STONE;
        else if (b === VOLCANO) m = d > 90 ? M.STONE : M.BASALT;
        else if (b === MOUNT || h < 126 + UP) m = h < 96 + UP && d < 2 ? M.SNOW : d > 3 || h < 118 + UP ? M.STONE : d === 0 ? M.GRASS : M.DIRT;
        else if (b === CITY) m = d === 0 ? M.ROAD : d < 10 ? M.DIRT : M.STONE;
        else m = d === 0 ? M.GRASS : d < 12 ? M.DIRT : M.STONE;
        if (m === M.STONE && hash(cx >> 1, cy >> 1) < 0.03) m = b === DESERT ? M.SAND : M.DIRT;
        c.fg[o + cy] = m;
      }
    }
    this._lastCi = ci; this._last = c;
    this.decorate(c, ci);
    return c;
  }

  // ---- structures. Everything a chunk builds stays inside its own columns.
  decorate(c, ci) {
    const x0 = ci * CW, self = this;
    let seedN = ci * 9176 + this.seed;
    const R = () => hash(seedN++, 77), RI = (a, b) => a + Math.floor(R() * (b - a + 1));
    const F = (lx, cy, m) => { if (lx >= 0 && lx < CW && cy >= 0 && cy < WH - 5) c.fg[lx * WH + cy] = m; };
    const B = (lx, cy, m) => { if (lx >= 0 && lx < CW && cy >= 0 && cy < WH - 5) c.bg[lx * WH + cy] = m; };
    const G = (lx, cy) => (lx >= 0 && lx < CW && cy >= 0 && cy < WH ? c.fg[lx * WH + cy] : 0);
    const H = (lx) => c.hgt[Math.max(0, Math.min(CW - 1, lx))];
    const spawn = (type, lx, cy, extra) => self.spawns.push({ type, x: (x0 + lx) * CELL + 2, y: cy * CELL, ...extra });
    const biome = this.biomeAt(x0 + 16);
    let hmin = 999, hmax = 0;
    for (let lx = 0; lx < CW; lx++) { hmin = Math.min(hmin, c.hgt[lx]); hmax = Math.max(hmax, c.hgt[lx]); }
    const flat = hmax - hmin <= 2;

    const tree = (lx, pine) => {
      const g = H(lx);
      if (g > SEA - 2 || G(lx, g) === M.STONE && !pine) return;
      const th = pine ? RI(18, 30) : RI(12, 22);
      for (let i = 1; i <= th; i++) B(lx, g - i, M.WOOD);
      if (pine) {
        for (let i = 3; i <= th + 3; i++) {
          const w = Math.max(0, Math.floor(((th + 3 - i) / th) * 8) - ((i & 1) ? 1 : 0));
          for (let dx = -w; dx <= w; dx++) { if (dx !== 0 || i > th) { F(lx + dx, g - i, M.PINE); B(lx + dx, g - i, M.PINE); } }
        }
      } else {
        const rx = RI(7, 11), ry = RI(6, 9), cy = g - th - ry + 3;
        for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) {
          const d = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
          if (d > 1 + (hash(lx + dx, cy + dy) - 0.5) * 0.5) continue;
          if (!G(lx + dx, cy + dy)) F(lx + dx, cy + dy, M.LEAVES);
          B(lx + dx, cy + dy, M.LEAVES);
        }
      }
    };
    const lampPost = (lx) => { const g = H(lx); for (let i = 1; i <= 15; i++) B(lx, g - i, M.STEEL); B(lx + 1, g - 15, M.STEEL); B(lx + 2, g - 15, M.STEEL); B(lx + 2, g - 14, M.LAMP); };

    const tower = (lx0, w, floors, style) => {
      let g = 999;
      for (let i = 0; i < w; i++) g = Math.min(g, H(lx0 + i));
      const FH = 11, wall = style === 0 ? M.CONCRETE : style === 1 ? M.BRICK : M.STEEL, top = g - floors * FH;
      for (let i = 0; i < w; i++) for (let cy = g; cy < H(lx0 + i); cy++) F(lx0 + i, cy, M.CONCRETE);
      for (let i = 0; i < w; i++) {
        const lx = lx0 + i, edge = i === 0 || i === w - 1;
        for (let cy = top; cy < g; cy++) {
          const k = (g - 1 - cy) % FH, fl = Math.floor((g - 1 - cy) / FH), slab = k === FH - 1;
          const win = k >= 3 && k <= 6;
          if (slab) F(lx, cy, style === 2 ? M.STEEL : M.CONCRETE);
          else if (edge) {
            if (fl === 0 && k < 9) { /* doorway */ }
            else F(lx, cy, win || (style === 2 && k !== 0) ? M.GLASS : wall);
          }
          B(lx, cy, !edge && win && (style === 2 ? i % 4 !== 0 : i % 4 === 1 || i % 4 === 2) ? M.GLASS : wall);
        }
      }
      // inside: lamps, a generator now and then, an inner wall in wide towers
      for (let f = 0; f < floors; f++) {
        const base = g - f * FH - 1, ceil = base - FH + 2;
        F(lx0 + (w >> 1), ceil, M.LAMP);
        if (R() < 0.16 && w > 10) { const fx = lx0 + RI(2, w - 5); for (let a = 0; a < 2; a++) for (let b = 0; b < 3; b++) F(fx + a, base - b, M.FUEL); }
        if (w > 18 && f > 0 && R() < 0.5) { const wx = lx0 + RI(5, w - 6); for (let b = 0; b < FH - 1; b++) if (b < 0 || b > 8) F(wx, base - b, wall); }
        if (f > 0 && R() < 0.45) spawn("soldier", lx0 + RI(2, w - 3), base + 1);
      }
      // the roof: parapet and clutter
      F(lx0, top - 1, wall); F(lx0 + w - 1, top - 1, wall);
      const r = R();
      if (r < 0.3) { // water tank
        const tx = lx0 + RI(2, w - 7);
        for (let a = 0; a < 5; a++) for (let b = 0; b < 4; b++) F(tx + a, top - 4 - b, M.WOOD);
        F(tx, top - 1, M.STEEL); F(tx, top - 2, M.STEEL); F(tx, top - 3, M.STEEL); F(tx + 4, top - 1, M.STEEL); F(tx + 4, top - 2, M.STEEL); F(tx + 4, top - 3, M.STEEL);
        for (let a = 0; a < 5; a++) F(tx + a, top - 8, M.ROOF);
      } else if (r < 0.6) { // billboard
        const bw = Math.min(w - 4, RI(8, 12)), bx = lx0 + 2;
        for (let b = 1; b <= 3; b++) { F(bx + 1, top - b, M.STEEL); F(bx + bw - 2, top - b, M.STEEL); }
        for (let a = 0; a < bw; a++) for (let b = 4; b < 9; b++) F(bx + a, top - b, M.SIGN);
      } else if (r < 0.85) { // antenna
        const ax = lx0 + RI(2, w - 3), ah = RI(8, 16);
        for (let b = 1; b <= ah; b++) F(ax, top - b, M.STEEL);
        F(ax, top - ah - 1, M.LAMP);
        for (let a = -2; a <= 2; a++) B(ax + a, top - Math.floor(ah * 0.6), M.STEEL);
      }
      if (R() < 0.3) { const fx = lx0 + w - 4; F(fx, top - 1, M.FUEL); F(fx, top - 2, M.FUEL); F(fx + 1, top - 1, M.FUEL); F(fx + 1, top - 2, M.FUEL); }
      if (R() < 0.75) spawn("soldier", lx0 + RI(2, w - 3), top);
      if (R() < 0.4) spawn("soldier", lx0 + RI(2, w - 3), top);
    };

    const shop = (lx0, w) => {
      let g = 999; for (let i = 0; i < w; i++) g = Math.min(g, H(lx0 + i));
      const fl = RI(1, 2), FH = 11, top = g - fl * FH;
      for (let i = 0; i < w; i++) {
        const lx = lx0 + i, edge = i === 0 || i === w - 1;
        for (let cy = g; cy < H(lx); cy++) F(lx, cy, M.CONCRETE);
        for (let cy = top; cy < g; cy++) {
          const k = (g - 1 - cy) % FH, f = Math.floor((g - 1 - cy) / FH);
          if (k === FH - 1) F(lx, cy, M.WOOD);
          else if (edge && !(f === 0 && k < 9)) F(lx, cy, k >= 3 && k <= 6 ? M.GLASS : M.BRICK);
          B(lx, cy, !edge && k >= 3 && k <= 6 && i % 5 < 2 ? M.GLASS : M.BRICK);
        }
        const rh = Math.min(i, w - 1 - i) >> 1;
        for (let b = 1; b <= rh + 1; b++) { F(lx, top - b, M.ROOF); }
        if (i % 2 === 0) F(lx, top, M.ROOF);
      }
      for (let a = 1; a < w - 1; a++) B(lx0 + a, g - FH - 0, M.SIGN);
      if (R() < 0.5) spawn("soldier", lx0 + RI(2, w - 3), g);
    };

    const gasStation = () => {
      const g = hmin, a = 4, b = 26;
      for (let i = a; i <= b; i++) { F(i, g - 12, M.CONCRETE); F(i, g - 13, M.SIGN); B(i, g - 11, M.LAMP); }
      for (const px of [a + 1, b - 1]) for (let k = 1; k < 12; k++) F(px, g - k, M.STEEL);
      for (const px of [10, 15, 20]) for (let k = 1; k <= 3; k++) { F(px, g - k, M.FUEL); if (k < 3) F(px + 1, g - k, M.STEEL); }
      for (let i = 27; i <= 30; i++) for (let k = 1; k <= 5; k++) F(i, g - k, k === 5 || i === 27 || i === 30 ? M.STEEL : M.FUEL);
      spawn("car", 7, g); spawn("car", 22, g);
    };

    const crane = () => {
      const g = hmin, mx = 9, mh = RI(90, 130);
      for (let k = 1; k <= mh; k++) { F(mx, g - k, M.STEEL); B(mx + 1, g - k, M.STEEL); F(mx + 2, g - k, M.STEEL); if (k % 3 === 0) F(mx + 1, g - k, M.STEEL); }
      const jy = g - mh;
      for (let i = 2; i <= 30; i++) { F(i, jy, M.STEEL); if (i % 2 === 0) B(i, jy - 1, M.STEEL); B(i, jy - 2, M.STEEL); }
      for (let a = 2; a <= 5; a++) for (let b2 = 1; b2 <= 3; b2++) F(a, jy + b2, M.CONCRETE);
      for (let a = 8; a <= 11; a++) for (let b2 = 1; b2 <= 4; b2++) F(a, jy - b2, a === 8 || a === 11 || b2 === 4 ? M.STEEL : M.GLASS);
      const hx = RI(20, 28), hl = RI(10, 22);
      for (let k = 1; k <= hl; k++) B(hx, jy + k, M.STEEL);
      for (let a = -2; a <= 2; a++) for (let b2 = 1; b2 <= 3; b2++) F(hx + a, jy + hl + b2, M.CONCRETE);
      // a half-built frame beside it
      const fx = 15, fw = 14, ff = RI(2, 4);
      for (let f = 1; f <= ff; f++) for (let i = 0; i < fw; i++) { F(fx + i, g - f * 11, M.STEEL); }
      for (let k = 1; k < ff * 11; k++) { F(fx, g - k, M.STEEL); F(fx + fw - 1, g - k, M.STEEL); B(fx + (fw >> 1), g - k, M.STEEL); }
      spawn("soldier", 20, g - 11);
    };

    const cabin = (lx0) => {
      const w = RI(18, 26); let g = 999; for (let i = 0; i < w; i++) g = Math.min(g, H(lx0 + i));
      for (let i = 0; i < w; i++) {
        const lx = lx0 + i, edge = i === 0 || i === w - 1;
        for (let cy = g; cy < H(lx); cy++) F(lx, cy, M.STONE);
        for (let k = 1; k <= 10; k++) { if (edge && k > 9) F(lx, g - k, M.WOOD); else if (edge && !(k < 10)) F(lx, g - k, M.WOOD); B(lx, g - k, k >= 4 && k <= 6 && i % 4 === 2 ? M.GLASS : M.WOOD); }
        F(lx, g - 11, M.WOOD);
        const rh = Math.min(i, w - 1 - i);
        for (let b2 = 0; b2 <= Math.min(rh, 4); b2++) F(lx, g - 12 - b2, M.ROOF);
      }
      F(lx0 + w - 3, g - 17, M.BRICK); F(lx0 + w - 3, g - 16, M.BRICK);
      F(lx0 + 2, g - 1, M.FUEL);
    };

    const watchTower = (lx0) => {
      const g = H(lx0 + 3), th = RI(18, 28);
      for (let k = 1; k <= th; k++) { F(lx0, g - k, M.WOOD); F(lx0 + 6, g - k, M.WOOD); if (k % 4 === 0) for (let a = 1; a < 6; a++) B(lx0 + a, g - k, M.WOOD); }
      for (let a = -1; a <= 7; a++) { F(lx0 + a, g - th - 1, M.WOOD); F(lx0 + a, g - th - 12, M.ROOF); B(lx0 + a, g - th - 2, M.WOOD); }
      for (let k = 2; k < 12; k++) { B(lx0 - 1, g - th - k, M.WOOD); B(lx0 + 7, g - th - k, M.WOOD); }
      spawn("soldier", lx0 + 3, g - th - 1);
    };

    if (biome === CITY && flat && hmax <= SEA - 3) {
      if (ci === 2) { tree(6); lampPost(16); tree(30); lampPost(44); tree(56); }
      else {
        const r = R();
        if (r < 0.7) {
          // a street of buildings: low ones wide, towers narrower and much taller
          let lx = RI(2, 6);
          while (lx < CW - 20) {
            const k = R(), room = CW - 2 - lx;
            let w, fl, st;
            if (k < 0.35) { w = RI(30, 50); fl = RI(1, 2); st = RI(0, 1); }
            else if (k < 0.7) { w = RI(26, 42); fl = RI(3, 7); st = RI(0, 2); }
            else { w = RI(20, 30); fl = RI(10, 24); st = RI(0, 2); }
            w = Math.min(w, room);
            if (w < 18) break;
            if (fl <= 2 && R() < 0.5) shop(lx, w); else tower(lx, w, fl, st);
            lx += w + RI(3, 8);
          }
          if (R() < 0.5) spawn("car", CW - 6, hmin);
        }
        else if (r < 0.78) { gasStation(); tower(36, RI(22, 26), RI(4, 12), RI(0, 2)); }
        else if (r < 0.88) crane();
        else { tree(5); lampPost(14); tree(24); lampPost(34); tree(44); lampPost(54); spawn("car", 20, hmin); if (R() < 0.6) spawn("tank", 40, hmin); }
      }
    } else if (biome === FOREST) {
      const r = R();
      if (r < 0.14 && flat) { cabin(3); tree(36, R() < 0.4); tree(52); }
      else if (r < 0.24) { watchTower(24); tree(6, true); tree(48); }
      else for (let lx = RI(4, 8); lx < CW - 6; lx += RI(10, 18)) tree(lx, R() < 0.3);
    } else if (biome === BEAN) {
      // the beanstalk: a vine as wide as a city, from the ground up into space, with leaves like whole districts.
      // It's soft: everything passes through it, and what gets torn off grows back (see regrow).
      const z = Math.floor(ci / ZONE), C = z * ZONE * CW + (ZONE * CW) / 2, TOPR = 34, GR = 150 + UP;
      const ctr = (cy) => C + Math.round(Math.sin(cy / 90) * 70 + Math.sin(cy / 31) * 12), half = (cy) => 46 + Math.round(Math.sin(cy / 23) * 8) + Math.max(0, (cy - (GR - 60)) * 0.8);
      const leaves = [];
      for (let ly = GR - 70, k = 0; ly > TOPR + 40; ly -= 52, k++) leaves.push({ ly, s: k & 1 ? 1 : -1, L: 170 + (hash(k, z + 7) * 90 | 0), lift: 30 + (hash(k, z + 9) * 30 | 0) });
      for (let lx = 0; lx < CW; lx++) {
        const cx = x0 + lx;
        for (let cy = TOPR; cy < H(lx); cy++) {
          let on = Math.abs(cx - ctr(cy)) <= half(cy);
          if (!on) for (const q of leaves) {
            const edge = ctr(q.ly) + q.s * (half(q.ly) - 4), u = ((cx - edge) * q.s) / q.L;
            if (u <= 0 || u >= 1) continue;
            const yc = q.ly - q.lift * u * u - 6 * Math.sin(u * Math.PI), th = 16 * Math.sin(Math.PI * Math.pow(u, 0.7)) + 1;
            if (Math.abs(cy - yc) < th) { on = true; break; }
          }
          if (on && !G(lx, cy)) F(lx, cy, M.STALK);
        }
      }
      const tl = ctr(TOPR) - x0;
      if (tl >= 14 && tl < CW - 14) {
        // a castle on the very top
        const tx = tl, base = TOPR;
        for (let a = -14; a <= 14; a++) for (let b2 = 0; b2 < 3; b2++) F(tx + a, base + b2, M.STONE);
        for (let a = -12; a <= 12; a++) for (let h = 1; h <= 14; h++) { const wall = Math.abs(a) > 10 || h > 12; F(tx + a, base - h, wall ? M.BRICK : (h % 5 === 2 && a % 4 === 0 ? M.GLASS : 0)); B(tx + a, base - h, M.BRICK); }
        for (const a of [-12, 12, 0]) for (let h = 15; h <= (a ? 24 : 30); h++) for (let d = -2; d <= 2; d++) F(tx + a + d, base - h, h > (a ? 22 : 28) ? M.ROOF : M.BRICK);
        for (let a = -10; a <= 10; a += 4) F(tx + a, base - 3, M.CRYSTAL);
        for (let i = 0; i < 4; i++) spawn("soldier", tx - 8 + i * 5, base - 1);
      }
      // floating islands up in space, with trees, crystals and drifting rocks round them
      if (R() < 0.7) {
        const ix = RI(14, CW - 14), iy = RI(8, 30), rw = RI(7, 12), rh = RI(4, 7);
        for (let dy = -1; dy <= rh; dy++) for (let dx = -rw; dx <= rw; dx++) {
          if ((dx * dx) / (rw * rw) + (Math.max(0, dy) * Math.max(0, dy)) / (rh * rh) > 1) continue;
          F(ix + dx, iy + dy, dy === -1 ? M.GRASS : dy < 2 ? M.DIRT : hash(ix + dx, iy + dy) < 0.12 ? M.CRYSTAL : M.STONE);
        }
        if (R() < 0.6) { const th = RI(6, 11); for (let h = 2; h <= th; h++) B(ix, iy - h, M.WOOD); for (let dy = -4; dy <= 4; dy++) for (let dx = -5; dx <= 5; dx++) if (dx * dx / 25 + dy * dy / 16 <= 1) F(ix + dx, iy - th + dy, M.LEAVES); }
        else for (let h = 2; h < 12; h++) for (let d = -Math.floor((12 - h) / 4); d <= Math.floor((12 - h) / 4); d++) F(ix + d + 4, iy - h, M.CRYSTAL);
      }
      for (let i = 0; i < 3; i++) { const ax = RI(3, CW - 4), ay = RI(6, 70), r = RI(1, 3); for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r && !G(ax + dx, ay + dy)) F(ax + dx, ay + dy, R() < 0.5 ? M.BASALT : M.STONE); }
    } else if (biome === DESERT) {
      // cacti, and now and then a ruined sandstone shrine
      for (let lx = RI(2, 6); lx < CW - 4; lx += RI(6, 12)) {
        const g = H(lx); if (g > SEA - 2) continue;
        const th = RI(6, 14);
        for (let i = 1; i <= th; i++) F(lx, g - i, M.CACTUS);
        if (R() < 0.7) { const a = RI(2, th - 2), sd = R() < 0.5 ? -1 : 1; F(lx + sd, g - a, M.CACTUS); F(lx + sd * 2, g - a, M.CACTUS); F(lx + sd * 2, g - a - 1, M.CACTUS); F(lx + sd * 2, g - a - 2, M.CACTUS); }
      }
      if (R() < 0.25) { const lx = RI(10, CW - 20), g = H(lx); for (let a = 0; a < 12; a++) for (let b2 = 1; b2 <= RI(3, 10); b2++) if (a % 4 !== 2) F(lx + a, g - b2, M.SAND); }
      if (R() < 0.4) spawn("soldier", RI(8, CW - 8), hmin);
    } else if (biome === SNOWY) {
      for (let lx = RI(3, 8); lx < CW - 3; lx += RI(6, 12)) if (Math.abs(H(lx - 1) - H(lx + 1)) < 4) {
        tree(lx, true);
        // snow on the branches
        for (let dy = 1; dy < 40; dy++) for (let dx = -8; dx <= 8; dx++) { const cy = H(lx) - dy; if (G(lx + dx, cy) === M.PINE && !G(lx + dx, cy - 1) && R() < 0.8) F(lx + dx, cy - 1, M.SNOW); }
      }
    } else if (biome === VOLCANO) {
      // lava in the craters, and a few glowing seams down the slopes
      for (let lx = 0; lx < CW; lx++) {
        const cx = x0 + lx, d = Math.abs(cx - Math.floor(cx / 110) * 110 - 55), h = H(lx);
        if (d < 6) for (let k = 0; k < 4; k++) F(lx, h + k, M.MAGMA);
        else if (hash(cx, 3) < 0.05) for (let k = 0; k < 2 + (hash(cx, 4) * 4 | 0); k++) F(lx, h + k, M.MAGMA);
      }
      for (let i = 0; i < 2; i++) spawn("soldier", RI(8, CW - 8), hmin);
    } else if (biome === MOUNT) {
      for (let lx = RI(3, 8); lx < CW - 3; lx += RI(8, 16)) if (H(lx) > 92 + UP && Math.abs(H(lx - 1) - H(lx + 1)) < 4) tree(lx, true);
      if (R() < 0.18) { // a radio mast on the ridge
        let best = 4; for (let lx = 4; lx < CW - 4; lx++) if (H(lx) < H(best)) best = lx;
        const g = H(best), mh = RI(20, 34);
        for (let k = 1; k <= mh; k++) { F(best, g - k, M.STEEL); if (k % 4 === 0) { B(best - 1, g - k, M.STEEL); B(best + 1, g - k, M.STEEL); } }
        F(best, g - mh - 1, M.LAMP);
        for (let a = -2; a <= 3; a++) for (let b2 = 1; b2 <= 4; b2++) if (a !== 0) F(best + a, g - b2, b2 === 4 ? M.STEEL : M.CONCRETE);
        spawn("soldier", best + 2, g - 4);
      }
    }
    // the bridge over the sea: a thick deck on a steel truss, wide piers down into the water, tall towers with
    // cables hanging between them, all of it a backdrop that falls with it
    const DECK = 132 + UP, TH = 8, SPAN = 96, TOW = 70;
    for (let lx = 0; lx < CW; lx++) {
      const cx = x0 + lx, h = c.hgt[lx];
      if (h <= DECK + TH || this.biomeAt(cx) === OCEAN) continue;
      F(lx, DECK - 1, M.STEEL);
      for (let k = 0; k < 3; k++) F(lx, DECK + k, M.CONCRETE);
      F(lx, DECK + TH, M.STEEL);
      const q = ((cx % 12) + 12) % 12;
      for (let k = 3; k < TH; k++) { const d = k - 3; if (q === 0 || q === d * 2 || q === 12 - d * 2) F(lx, DECK + k, M.STEEL); else B(lx, DECK + k, M.STEEL); }
      const m = ((cx % 48) + 48) % 48;
      if (m < 5) for (let cy = DECK + TH + 1; cy < h; cy++) F(lx, cy, M.CONCRETE);
      if (h > SEA) {
        const t = ((cx % SPAN) + SPAN) % SPAN, d = Math.min(t, SPAN - t), half = SPAN / 2;
        if (d < 2) { for (let k = 2; k <= TOW; k++) F(lx, DECK - k, M.STEEL); for (let k = 2; k <= TOW; k += 6) B(lx + (t < half ? 1 : -1), DECK - k, M.STEEL); F(lx, DECK - TOW - 1, M.LAMP); }
        else {
          const ch = Math.round(4 + (TOW - 6) * Math.pow((half - d) / half, 2));
          B(lx, DECK - ch, M.STEEL); B(lx, DECK - ch - 1, M.STEEL);
          if (((cx % 6) + 6) % 6 === 0) for (let k = 2; k < ch; k++) B(lx, DECK - k, M.STEEL);
          for (let k = 2; k <= 4; k++) if (((cx % 8) + 8) % 8 === 0) F(lx, DECK - k, M.STEEL);
        }
        if (lx === 20 && R() < 0.6) spawn("car", lx, DECK - 1);
        if (lx === 44 && R() < 0.5) spawn("car", lx, DECK - 1);
        if (lx === 32 && R() < 0.3) spawn("tank", lx, DECK - 1);
      }
    }
  }

  // ---- destruction
  key(cx, cy) { return (cx + 1048576) * 1024 + cy; }
  destroyCell(cx, cy, vx = 0, vy = 0, quiet = false) {
    if (cy < 0 || cy >= WH) return 0;
    const c = this.chunk(cx >> 6), i = (cx & 63) * WH + cy, m = c.fg[i];
    if (!m || m === M.BEDROCK) return 0;
    c.fg[i] = 0; c.dmg[i] = 0;
    this.destroyed++;
    this.queue.push(cx - 1, cy, cx + 1, cy, cx, cy - 1, cx, cy + 1);
    if (m === M.FUEL) this.fuel.push({ x: cx * CELL + 2, y: cy * CELL + 2, t: 0.05 + Math.random() * 0.18 });
    if (m === M.STALK && this.regrow.length < 40000) this.regrow.push(cx, cy, this.clock + 1 + Math.random() * 1.5);
    if (!quiet && this.hooks.debris) this.hooks.debris(m, cx * CELL + 2, cy * CELL + 2, vx, vy);
    return 1;
  }
  destroyBg(cx, cy) {
    if (cy < 0 || cy >= WH) return;
    const c = this.chunk(cx >> 6), i = (cx & 63) * WH + cy;
    if (!c.bg[i]) return;
    const m = c.bg[i];
    c.bg[i] = 0;
    this.queue.push(cx - 1, cy, cx + 1, cy, cx, cy - 1, cx, cy + 1);
    if (this.hooks.debris && Math.random() < 0.35) this.hooks.debris(m, cx * CELL + 2, cy * CELL + 2, 0, 0, true);
  }
  /** Blast a disc: returns how many cells went. power is damage at the centre (see HP). */
  explode(x, y, r, power, o = {}) {
    const x0 = Math.floor((x - r * 1.3) / CELL), x1 = Math.floor((x + r * 1.3) / CELL);
    const y0 = Math.max(0, Math.floor((y - r * 1.3) / CELL)), y1 = Math.min(WH - 1, Math.floor((y + r * 1.3) / CELL));
    const area = Math.PI * (r / CELL) * (r / CELL);
    this.debrisK = Math.min(1, (o.debris ?? 70) / Math.max(1, area));
    let n = 0;
    const kick = o.kick ?? 1;
    for (let cx = x0; cx <= x1; cx++) {
      const c = this.chunk(cx >> 6), base = (cx & 63) * WH;
      for (let cy = y0; cy <= y1; cy++) {
        const i = base + cy, f = c.fg[i], b = c.bg[i];
        if (!f && !b) continue;
        const dx = cx * CELL + 2 - x, dy = cy * CELL + 2 - y, d = Math.hypot(dx, dy);
        if (d > r * 1.3) continue;
        const fall = 1 - d / r;
        if (d <= r) {
          if (f && f !== M.BEDROCK) {
            const dm = power * fall * (0.75 + Math.random() * 0.5) + 0.6, left = HP[f] - (c.dmg[i] & 127);
            if (dm >= left) {
              const k = (120 + power * 22) * kick / (d + 6);
              n += this.destroyCell(cx, cy, dx * k, dy * k - 60);
            } else c.dmg[i] = (c.dmg[i] & 128) | Math.min(127, (c.dmg[i] & 127) + (dm | 0));
          }
          if (b && d < r * 0.88 && power * fall + 1 > HP[b] * 0.6) { this.destroyBg(cx, cy); n += 0.25; }
        }
        if (c.fg[i] && !o.clean) c.dmg[i] |= 128;
        if (o.fire !== false && (FLAM[c.fg[i]] || FLAM[c.bg[i]]) && Math.random() < (o.fire ?? 0.35)) this.ignite(cx, cy);
      }
    }
    this.debrisK = 1;
    return n;
  }
  ignite(cx, cy) {
    if (this.burning.size > 500) return;
    const k = this.key(cx, cy);
    if (this.burning.has(k)) return;
    if (!FLAM[this.get(cx, cy)] && !FLAM[this.getBg(cx, cy)]) return;
    this.burning.set(k, { cx, cy, t: 0.6 + Math.random() * 1.6 });
  }

  // ---- what's cut loose falls
  collapse() {
    const q = this.queue;
    if (!q.length) return;
    const visited = new Map(), anchoredIds = new Set();
    let id = 0, budget = 30000;
    const take = Math.min(q.length, 1600);
    for (let s = 0; s < take; s += 2) {
      const sx = q[s], sy = q[s + 1];
      if (sy < 0 || sy >= WH) continue;
      if (!(isStruct(this.get(sx, sy)) || this.getBg(sx, sy))) continue;
      const k0 = this.key(sx, sy);
      if (visited.has(k0)) continue;
      id++;
      const comp = [], stack = [sx, sy];
      visited.set(k0, id);
      let anchored = false;
      while (stack.length) {
        const cy = stack.pop(), cx = stack.pop();
        comp.push(cx, cy);
        if (cy >= WH - 1 || comp.length > 30000) { anchored = true; break; }
        // down is pushed last so the search heads for the ground first
        for (let d = 0; d < 4; d++) {
          const nx = cx + (d === 0 ? -1 : d === 1 ? 1 : 0), ny = cy + (d === 2 ? -1 : d === 3 ? 1 : 0);
          if (ny < 0) continue;
          const m = this.get(nx, ny);
          if (m > 0 && m < 8) { anchored = true; break; }
          if (m >= 8 || this.getBg(nx, ny)) {
            const k = this.key(nx, ny), v = visited.get(k);
            if (v === undefined) { visited.set(k, id); stack.push(nx, ny); }
            else if (v !== id && anchoredIds.has(v)) { anchored = true; break; }
          }
        }
        if (anchored) break;
      }
      budget -= comp.length;
      if (anchored) anchoredIds.add(id);
      else this.makeIsland(comp);
      if (budget < 0) { q.splice(0, s + 2); return; }
    }
    q.splice(0, take);
  }
  makeIsland(comp) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let i = 0; i < comp.length; i += 2) { const x = comp[i], y = comp[i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const n = comp.length / 2;
    if (n < 4) {
      for (let i = 0; i < comp.length; i += 2) { this.destroyCell(comp[i], comp[i + 1], 0, 0); this.destroyBg(comp[i], comp[i + 1]); }
      return;
    }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const isl = { cx0: x0, row: y0, y: y0 * CELL, w, h, fg: new Uint8Array(w * h), bg: new Uint8Array(w * h), dmg: new Uint8Array(w * h), vy: 0, n, fell: 0, probes: [], wob: Math.random() * 6 };
    for (let i = 0; i < comp.length; i += 2) {
      const cx = comp[i], cy = comp[i + 1], c = this.chunk(cx >> 6), j = (cx & 63) * WH + cy, k = (cy - y0) * w + (cx - x0);
      isl.fg[k] = c.fg[j]; isl.bg[k] = c.bg[j]; isl.dmg[k] = c.dmg[j];
      c.fg[j] = 0; c.bg[j] = 0; c.dmg[j] = 0;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = y * w + x;
      if ((SOLID[isl.fg[k]] || isl.bg[k]) && (y === h - 1 || !(isl.fg[k + w] || isl.bg[k + w]))) isl.probes.push(x, y);
    }
    this.islands.push(isl);
    this.hooks.islandStart?.(isl);
  }
  stepIslands(dt) {
    for (let n = this.islands.length - 1; n >= 0; n--) {
      const s = this.islands[n];
      const midX = (s.cx0 + s.w / 2) * CELL, inSea = this.inWater(midX, s.y + s.h * CELL);
      s.vy = Math.min(inSea ? 70 : 560, s.vy + (inSea ? 200 : 700) * dt);
      if (inSea && s.vy > 70) s.vy = Math.max(70, s.vy - 2400 * dt);
      s.y += s.vy * dt;
      const target = Math.floor(s.y / CELL);
      let landed = false;
      while (s.row <= target) {
        const P = s.probes;
        for (let i = 0; i < P.length; i += 2) if (SOLID[this.get(s.cx0 + P[i], s.row + P[i + 1] + 1)]) { landed = true; break; }
        if (landed) break;
        if (s.row === target) break;
        s.row++; s.fell++;
      }
      if (!landed) continue;
      this.islands.splice(n, 1);
      const frac = Math.min(0.62, 0.1 + s.fell * 0.02), w = s.w;
      let broke = 0;
      for (let y = 0; y < s.h; y++) for (let x = 0; x < w; x++) {
        const k = y * w + x, f = s.fg[k], b = s.bg[k];
        if (!f && !b) continue;
        const cx = s.cx0 + x, cy = s.row + y;
        if (cy >= WH - 5) continue;
        const c = this.chunk(cx >> 6), j = (cx & 63) * WH + cy;
        const p = frac + (y >= s.h - 3 ? 0.3 : 0) + (f === M.GLASS ? 0.5 : 0) + (f === M.LEAVES ? 0.3 : 0);
        const smash = s.fell > 1 && Math.random() < p;
        if (f) {
          if (smash || c.fg[j]) { broke++; this.hooks.debris?.(f, cx * CELL + 2, cy * CELL + 2, (Math.random() - 0.5) * 160, -Math.random() * 120 - s.vy * 0.2); if (f === M.FUEL) this.fuel.push({ x: cx * CELL + 2, y: cy * CELL + 2, t: 0.05 + Math.random() * 0.2 }); }
          else { c.fg[j] = f; c.dmg[j] = s.dmg[k]; }
        }
        if (b && !c.bg[j] && !(smash && Math.random() < 0.7)) c.bg[j] = b;
        this.queue.push(cx, cy);
      }
      this.destroyed += broke;
      this.hooks.islandLand?.(s, broke);
    }
  }
  update(dt) {
    // the beanstalk heals: torn-off cells grow back a second or two later (oldest first)
    this.clock += dt;
    const RG = this.regrow;
    while (this.regrowI < RG.length && RG[this.regrowI + 2] <= this.clock) { const cx = RG[this.regrowI], cy = RG[this.regrowI + 1]; if (!this.get(cx, cy)) this.set(cx, cy, M.STALK); this.regrowI += 3; }
    if (this.regrowI > 3000) { RG.splice(0, this.regrowI); this.regrowI = 0; }
    this.collapse();
    this.stepIslands(dt);
    // fuel goes off a beat after it's breached
    for (let i = this.fuel.length - 1; i >= 0; i--) {
      const f = this.fuel[i];
      if ((f.t -= dt) <= 0) { this.fuel.splice(i, 1); this.hooks.fuel?.(f.x, f.y); }
    }
    if (this.fuel.length > 60) this.fuel.length = 60;
    this.fireAcc += dt;
    if (this.fireAcc >= 0.1) {
      this.fireAcc = 0;
      for (const [k, f] of this.burning) {
        if (Math.random() < 0.6) this.hooks.flame?.(f.cx * CELL + 2, f.cy * CELL + 2);
        f.t -= 0.1;
        if (f.t > 0) continue;
        this.burning.delete(k);
        if (FLAM[this.get(f.cx, f.cy)]) { this.debrisK = 0.3; this.destroyCell(f.cx, f.cy, 0, -20); this.debrisK = 1; }
        if (FLAM[this.getBg(f.cx, f.cy)]) this.destroyBg(f.cx, f.cy);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && Math.random() < 0.34) this.ignite(f.cx + dx, f.cy + dy);
      }
    }
  }

  // ---- drawing
  render(frame, camX, camY, time) {
    const C = frame.color, W = frame.w, Hh = frame.h;
    const cx0 = Math.floor(camX / CELL), cy0 = Math.max(0, Math.floor(camY / CELL));
    const cx1 = Math.floor((camX + W - 1) / CELL), cy1 = Math.min(WH - 1, Math.floor((camY + Hh - 1) / CELL));
    const wave = Math.floor(time * 3);
    for (let cx = cx0; cx <= cx1; cx++) {
      const c = this.chunk(cx >> 6), lx = cx & 63, base = lx * WH, h = c.hgt[lx], wet = h > SEA;
      const px = cx * CELL - camX, tx = (cx & 3) * 4;
      const xa = Math.max(0, px), xb = Math.min(W, px + CELL);
      for (let cy = cy0; cy <= cy1; cy++) {
        const i = base + cy, f = c.fg[i];
        let tex;
        if (f) tex = c.dmg[i] & 128 ? TEXS[f] : TEX[f];
        else if (c.bg[i]) tex = TEXB[c.bg[i]];
        else if (cy > h && !wet) tex = CAVE;
        const py = cy * CELL - camY, ty = (cy & 3) * 4;
        const ya = Math.max(0, py), yb = Math.min(Hh, py + CELL);
        if (tex) {
          for (let y = ya; y < yb; y++) {
            const row = y * W, trow = (ty + y - py) * 16 + tx - px;
            for (let x = xa; x < xb; x++) C[row + x] = tex[trow + x];
          }
          if (f) {
            if (py >= 0 && py < Hh && cy > 0 && !c.fg[i - 1]) {
              const row = py * W;
              for (let x = xa; x < xb; x++) { const v = C[row + x]; C[row + x] = 0xff000000 | (Math.min(255, ((v >> 16) & 255) + 38) << 16) | (Math.min(255, ((v >> 8) & 255) + 38) << 8) | Math.min(255, (v & 255) + 38); }
            }
            if (py + 3 >= 0 && py + 3 < Hh && cy < WH - 1 && !c.fg[i + 1]) {
              const row = (py + 3) * W;
              for (let x = xa; x < xb; x++) { const v = C[row + x]; C[row + x] = 0xff000000 | ((((v >> 16) & 255) * 0.6) << 16) | ((((v >> 8) & 255) * 0.6) << 8) | ((v & 255) * 0.6); }
            }
            const dm = c.dmg[i] & 127;
            if (dm) {
              const hh = (hash(cx, cy) * 16) | 0, ax = px + (hh & 3), ay = py + (hh >> 2);
              if (ax >= 0 && ax < W && ay >= 0 && ay < Hh) C[ay * W + ax] = 0xff181418;
              const bx = px + ((hh + 1) & 3), by = py + (((hh >> 2) + 1) & 3);
              if (bx >= 0 && bx < W && by >= 0 && by < Hh) C[by * W + bx] = 0xff181418;
              if (dm > 1) { const ex = px + ((hh + 2) & 3), ey = py + (((hh >> 2) + 2) & 3); if (ex >= 0 && ex < W && ey >= 0 && ey < Hh) C[ey * W + ex] = 0xff181418; }
            }
          }
        }
        if (wet && cy >= SEA && !SOLID[f]) {
          const depth = Math.min(1, (cy - SEA) / 26), a = 0.5 + depth * 0.36;
          const wr = 30 - depth * 14, wg = 104 - depth * 50, wb = 150 - depth * 50, ia = 1 - a;
          for (let y = ya; y < yb; y++) {
            const row = y * W;
            for (let x = xa; x < xb; x++) {
              const v = C[row + x];
              C[row + x] = 0xff000000 | (((((v >> 16) & 255) * ia + wb * a) & 255) << 16) | (((((v >> 8) & 255) * ia + wg * a) & 255) << 8) | (((v & 255) * ia + wr * a) & 255);
            }
          }
          if (cy === SEA && py >= 0 && py < Hh) {
            const row = py * W;
            for (let x = xa; x < xb; x++) if (((x + camX + wave * 3) >> 1) % 7 < 4) C[row + x] = 0xfffff4d8; else C[row + x] = 0xffe8c890;
          }
        }
      }
    }
  }
  renderIslands(frame, camX, camY) {
    const C = frame.color, W = frame.w, Hh = frame.h;
    for (const s of this.islands) {
      const oy = Math.round(s.y) - camY;
      for (let y = 0; y < s.h; y++) {
        const py = oy + y * CELL;
        if (py <= -CELL || py >= Hh) continue;
        for (let x = 0; x < s.w; x++) {
          const k = y * s.w + x, f = s.fg[k], b = s.bg[k];
          if (!f && !b) continue;
          const px = (s.cx0 + x) * CELL - camX;
          if (px <= -CELL || px >= W) continue;
          const tex = f ? (s.dmg[k] & 128 ? TEXS[f] : TEX[f]) : TEXB[b], tx = ((s.cx0 + x) & 3) * 4, ty = ((s.row + y) & 3) * 4;
          for (let j = 0; j < CELL; j++) {
            const yy = py + j;
            if (yy < 0 || yy >= Hh) continue;
            for (let i = 0; i < CELL; i++) { const xx = px + i; if (xx >= 0 && xx < W) C[yy * W + xx] = tex[(ty + j) * 16 + tx + i]; }
          }
        }
      }
    }
  }
}
