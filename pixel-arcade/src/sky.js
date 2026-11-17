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
const L1 = col(222, 204, 160), L2 = col(206, 186, 142), L2W = col(190, 168, 124), L3 = col(180, 158, 118), L3W = col(150, 128, 96), L3L = col(240, 214, 150);

export function drawSky(frame, camX, camY, time) {
  camY -= UP * CELL; // the sky was laid out for the old ground line
  const C = frame.color, W = frame.w, H = frame.h;
  // gradient by altitude
  for (let y = 0; y < H; y++) {
    const v = Math.max(0, Math.min(1023, ((y + camY * 0.5 + 760) / 1500) * 1023)) | 0;
    const c = GR[(y & 1) && v < 1022 ? v + 1 : v];
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
    let h = vn(blk / 6, 41) > 0.42 ? (u > 22 ? 8 : 20 + hash(blk, 42) * 90 * vn(blk / 6, 41)) : 10 + vn(wx / 60, 43) * 26;
    let top = Math.max(0, (b2 - h) | 0);
    for (let y = top; y < H; y++) C[y * W + x] = h > 30 && u % 4 === 1 && (y - top) % 6 === 3 ? L2W : L2;
    wx = Math.floor(x + camX * 0.4); blk = Math.floor(wx / 38); u = wx - blk * 38;
    const dense = vn(blk / 5, 51);
    h = dense > 0.38 ? (u > 33 ? 6 : 24 + hash(blk, 52) * 150 * dense) : 8 + vn(wx / 50, 53) * 30;
    top = Math.max(0, (b3 - h) | 0);
    for (let y = top; y < H; y++) C[y * W + x] = h > 30 && u % 5 === 2 && (y - top) % 7 > 4 ? (hash(u + blk * 40, (y - top) / 7 | 0) < 0.12 ? L3L : L3W) : L3;
  }
}
