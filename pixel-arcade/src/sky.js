// The backdrop: a hazy warm sky that deepens to night-blue as you climb, a pale sun, clouds,
// and three parallax layers of far mountains and skyline that never end.
import { hash, UP, CELL } from "./world.js";

const lerp = (a, b, t) => a + (b - a) * t;
const STOPS = [[0, 14, 16, 40], [0.22, 42, 62, 120], [0.45, 126, 168, 200], [0.66, 232, 216, 166], [0.85, 246, 232, 196], [1, 243, 220, 174]];
const GR = new Uint32Array(1024);
for (let i = 0; i < 1024; i++) {
  const v = i / 1023;
  let k = 0;
  while (k < STOPS.length - 2 && v > STOPS[k + 1][0]) k++;
  const a = STOPS[k], b = STOPS[k + 1], t = Math.max(0, Math.min(1, (v - a[0]) / (b[0] - a[0])));
  GR[i] = 0xff000000 | (lerp(a[3], b[3], t) << 16) | (lerp(a[2], b[2], t) << 8) | lerp(a[1], b[1], t);
}
const vn = (x, s) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i, s) * (1 - u) + hash(i + 1, s) * u; };
const col = (r, g, b) => 0xff000000 | (b << 16) | (g << 8) | r;

// per biome: [far hills, mid layer, mid windows, near layer, near windows, near lights, sky tint (r,g,b,amount), skyline shown]
const THEMES = [
  [[222, 204, 160], [206, 186, 142], [190, 168, 124], [180, 158, 118], [150, 128, 96], [240, 214, 150], [0, 0, 0, 0], 1],       // city
  [[170, 196, 150], [120, 160, 104], [100, 140, 90], [74, 120, 70], [60, 100, 58], [96, 150, 84], [120, 190, 140, 0.25], 0],     // forest
  [[196, 192, 196], [160, 156, 168], [140, 136, 150], [124, 120, 134], [104, 100, 116], [150, 146, 160], [160, 180, 220, 0.2], 0],// mountains
  [[200, 214, 220], [170, 196, 210], [150, 180, 196], [130, 166, 186], [110, 146, 170], [150, 190, 210], [130, 190, 240, 0.3], 0],// sea
  [[236, 206, 150], [226, 186, 120], [210, 168, 104], [212, 160, 96], [190, 140, 80], [230, 180, 110], [255, 200, 120, 0.3], 0],   // desert
  [[220, 230, 240], [196, 210, 228], [240, 246, 252], [168, 186, 210], [250, 252, 255], [210, 222, 238], [180, 210, 255, 0.4], 0], // snow peaks
  [[110, 70, 66], [80, 50, 52], [255, 120, 40], [56, 36, 40], [255, 90, 30], [70, 44, 46], [200, 70, 40, 0.45], 0],              // volcanoes
];
const cur = THEMES[0].map((v) => (Array.isArray(v) ? v.slice() : v));
const pk = (a) => col(a[0] | 0, a[1] | 0, a[2] | 0);
const mixc = (c, r, g, b, k) => 0xff000000 | (lerp((c >> 16) & 255, b, k) << 16) | (lerp((c >> 8) & 255, g, k) << 8) | lerp(c & 255, r, k);

export function drawSky(frame, camX, camY, time, biome = 0, dt = 0.016) {
  // ease towards the biome's colours
  const T = THEMES[biome] || THEMES[0], ek = Math.min(1, dt * 1.5);
  for (let i = 0; i < 8; i++) { if (Array.isArray(T[i])) for (let j = 0; j < T[i].length; j++) cur[i][j] += (T[i][j] - cur[i][j]) * ek; else cur[i] += (T[i] - cur[i]) * ek; }
  const L1 = pk(cur[0]), L2 = pk(cur[1]), L2W = pk(cur[2]), L3 = pk(cur[3]), L3W = pk(cur[4]), L3L = pk(cur[5]), tint = cur[6], city = cur[7];
  camY -= UP * CELL; // the sky was laid out for the old ground line
  const C = frame.color, W = frame.w, H = frame.h;
  // gradient by altitude
  for (let y = 0; y < H; y++) {
    const v = Math.max(0, Math.min(1023, ((y + camY * 0.5 + 760) / 1500) * 1023)) | 0;
    let c = GR[(y & 1) && v < 1022 ? v + 1 : v];
    if (tint[3] > 0.01) c = mixc(c, tint[0], tint[1], tint[2], tint[3]);
    C.fill(c, y * W, y * W + W);
  }
  // stars, high up
  if (camY < -500) {
    const k = Math.min(1, (-500 - camY) / 500);
    for (let i = 0; i < 90; i++) { const x = (hash(i, 5) * W * 3 - camX * 0.02) % W, y = (hash(i, 6) * H * 2 - camY * 0.03) % H; if (x >= 0 && y >= 0 && hash(i, 7) < k) C[(y | 0) * W + (x | 0)] = 0xffffffff; }
  }
  // the sun
  const sx = (W * 0.72) | 0, sy = Math.round(150 - (camY - 290) * 0.08);
  for (let dy = -46; dy <= 46; dy++) {
    const y = sy + dy; if (y < 0 || y >= H) continue;
    const hw = Math.sqrt(46 * 46 - dy * dy) | 0;
    for (let x = Math.max(0, sx - hw); x <= Math.min(W - 1, sx + hw); x++) {
      const v = C[y * W + x], d = (x - sx) * (x - sx) + dy * dy, a = d < 36 * 36 ? 0.75 : 0.35;
      C[y * W + x] = 0xff000000 | (lerp((v >> 16) & 255, 214, a) << 16) | (lerp((v >> 8) & 255, 246, a) << 8) | lerp(v & 255, 255, a);
    }
  }
  // clouds
  for (let i = 0; i < 7; i++) {
    const span = W + 300, cx = ((hash(i, 21) * span * 3 - camX * 0.06 + time * (2 + i)) % span + span) % span - 150, cy = Math.round(40 + hash(i, 22) * 150 - (camY - 290) * 0.1);
    const rw = 40 + hash(i, 23) * 60, rh = 6 + hash(i, 24) * 8;
    for (let dy = -rh | 0; dy <= rh; dy++) {
      const y = cy + dy; if (y < 0 || y >= H) continue;
      const hw = rw * Math.sqrt(1 - (dy * dy) / (rh * rh)) * (dy > 0 ? 1 : 0.8);
      for (let x = Math.max(0, (cx - hw) | 0); x <= Math.min(W - 1, cx + hw); x++) { const v = C[y * W + x]; C[y * W + x] = 0xff000000 | (lerp((v >> 16) & 255, 235, 0.4) << 16) | (lerp((v >> 8) & 255, 248, 0.4) << 8) | lerp(v & 255, 255, 0.4); }
    }
  }
  // far mountains
  const b1 = Math.round(262 + (290 - camY) * 0.1), b2 = Math.round(286 + (290 - camY) * 0.22), b3 = Math.round(316 + (290 - camY) * 0.4);
  for (let x = 0; x < W; x++) {
    const wx = x + camX * 0.1, h = 30 + vn(wx / 90, 31) * 80 + vn(wx / 23, 32) * 18;
    for (let y = Math.max(0, (b1 - h) | 0); y < H; y++) C[y * W + x] = L1;
  }
  // a far skyline, then a nearer one
  for (let x = 0; x < W; x++) {
    let wx = Math.floor(x + camX * 0.22), blk = Math.floor(wx / 26), u = wx - blk * 26;
    const hill2 = biome === 5 || biome === 6 ? 20 + Math.max(0, 1 - Math.abs((wx % 300) - 150) / 110) * 110 + vn(wx / 9, 44) * 6 : 14 + vn(wx / 60, 43) * 40;
    let h = vn(blk / 6, 41) > 0.42 ? (u > 22 ? 8 : 20 + hash(blk, 42) * 90 * vn(blk / 6, 41)) : 10 + vn(wx / 60, 43) * 26;
    h = h * city + hill2 * (1 - city);
    let top = Math.max(0, (b2 - h) | 0);
    for (let y = top; y < H; y++) C[y * W + x] = city > 0.5 && h > 30 && u % 4 === 1 && (y - top) % 6 === 3 ? L2W : L2;
    wx = Math.floor(x + camX * 0.4); blk = Math.floor(wx / 38); u = wx - blk * 38;
    const dense = vn(blk / 5, 51);
    h = dense > 0.38 ? (u > 33 ? 6 : 24 + hash(blk, 52) * 150 * dense) : 8 + vn(wx / 50, 53) * 30;
    const hill3 = biome === 4 ? 16 + Math.abs(Math.sin(wx / 70)) * 34 : biome === 6 ? 20 + Math.max(0, 1 - Math.abs((wx % 420) - 210) / 150) * 150 : 12 + vn(wx / 40, 54) * 50 + vn(wx / 11, 55) * 8;
    h = h * city + hill3 * (1 - city);
    top = Math.max(0, (b3 - h) | 0);
    if (city < 0.5) {
      // nature: snow caps, lava glow at volcano tops
      for (let y = top; y < H; y++) C[y * W + x] = y - top < 3 && (biome === 5 || biome === 2) ? L2W : biome === 6 && h > 130 && y - top < 4 ? L3W : L3;
      // forests: a fringe of trees on the near hills
      if (biome === 1 && top > 0) for (let y = top - (3 + ((hash(wx >> 2, 56) * 8) | 0)); y < top; y++) if (y >= 0) C[y * W + x] = L3W;
      continue;
    }
    for (let y = top; y < H; y++) C[y * W + x] = h > 30 && u % 5 === 2 && (y - top) % 7 > 4 ? (hash(u + blk * 40, (y - top) / 7 | 0) < 0.12 ? L3L : L3W) : L3;
  }
}
