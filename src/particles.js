// The game's own particles: thousands of cheap pixels for rubble, sparks, smoke and flame.
// (pixelfx effects carry the hero moments; these carry the bulk.)

export const PT = { DEBRIS: 0, SPARK: 1, SMOKE: 2, FLAME: 3, DROP: 4, EMBER: 5 };
const FLAME_RAMP = [0xffffffff, 0xffa6f3ff, 0xff3dc2ff, 0xff2a8aff, 0xff1d56f2, 0xff1f28c9, 0xff12174a, 0xff2a2430];

export class Parts {
  constructor(world, max = 6000) {
    this.world = world; this.max = max; this.n = 0; this.head = 0;
    this.x = new Float32Array(max); this.y = new Float32Array(max); this.vx = new Float32Array(max); this.vy = new Float32Array(max);
    this.life = new Float32Array(max); this.span = new Float32Array(max); this.type = new Uint8Array(max);
    this.col = new Uint32Array(max); this.size = new Float32Array(max); this.rest = new Uint8Array(max);
    this.attract = null; // { x, y, r, k } pulls debris in (black hole)
  }
  spawn(type, x, y, vx, vy, life, col = 0xffffffff, size = 1) {
    let i;
    if (this.n < this.max) i = this.n++;
    else { i = this.head; this.head = (this.head + 1) % this.max; }
    this.type[i] = type; this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy;
    this.life[i] = life; this.span[i] = life; this.col[i] = col; this.size[i] = size; this.rest[i] = 0;
  }
  update(dt) {
    const w = this.world, A = this.attract;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const t = this.type[i];
      if (t === PT.DEBRIS || t === PT.EMBER) {
        if (this.rest[i]) { if (!w.solidPx(this.x[i], this.y[i] + 2)) this.rest[i] = 0; else continue; }
        if (A) {
          const dx = A.x - this.x[i], dy = A.y - this.y[i], d = Math.hypot(dx, dy) + 1;
          if (d < A.r) {
            const k = (A.k * dt) / d;
            this.vx[i] = this.vx[i] * (1 - 2 * dt) + dx * k - dy * k * 0.5; this.vy[i] = this.vy[i] * (1 - 2 * dt) + dy * k + dx * k * 0.5 - 700 * dt;
            if (d < 9) { this.life[i] = 0; continue; }
          }
        }
        this.vy[i] += 700 * dt;
        let nx = this.x[i] + this.vx[i] * dt, ny = this.y[i] + this.vy[i] * dt;
        if (w.solidPx(nx, ny)) {
          if (!w.solidPx(nx, this.y[i])) { this.vy[i] *= -0.32; this.vx[i] *= 0.6; ny = this.y[i]; if (Math.abs(this.vy[i]) < 26 && this.vy[i] <= 0) { this.rest[i] = 1; this.vy[i] = 0; this.vx[i] = 0; } }
          else if (!w.solidPx(this.x[i], ny)) { this.vx[i] *= -0.4; nx = this.x[i]; }
          else { this.vx[i] *= -0.3; this.vy[i] *= -0.3; nx = this.x[i]; ny = this.y[i]; if (w.solidPx(nx, ny)) this.life[i] = Math.min(this.life[i], 0.15); }
        } else if (w.inWater(nx, ny)) { this.vx[i] *= 1 - 4 * dt; this.vy[i] = this.vy[i] * (1 - 5 * dt) - 520 * dt; }
        this.x[i] = nx; this.y[i] = ny;
      } else if (t === PT.SPARK) {
        this.vy[i] += 420 * dt; this.vx[i] *= 1 - 1.5 * dt;
        this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt;
        if (w.solidPx(this.x[i], this.y[i])) { this.vy[i] *= -0.4; this.y[i] += this.vy[i] * dt * 2; this.life[i] *= 0.6; }
      } else if (t === PT.SMOKE) {
        this.vx[i] *= 1 - 2.2 * dt; this.vy[i] = this.vy[i] * (1 - 2.2 * dt) - 22 * dt;
        this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt;
      } else if (t === PT.FLAME) {
        this.vx[i] *= 1 - 3 * dt; this.vy[i] -= 160 * dt;
        this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt;
      } else {
        this.vy[i] += 600 * dt;
        this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt;
        if (w.solidPx(this.x[i], this.y[i]) || (this.vy[i] > 0 && w.inWater(this.x[i], this.y[i]))) this.life[i] = 0;
      }
    }
    while (this.n > 0 && this.life[this.n - 1] <= 0) this.n--;
  }
  draw(frame, camX, camY, layer) {
    const C = frame.color, L = frame.light, W = frame.w, H = frame.h;
    const light = (px, py, c, k) => {
      if (px < 0 || py < 0 || px >= W || py >= H) return;
      const i = py * W + px, d = L[i];
      L[i] = 0xff000000 | (Math.min(255, ((d >> 16) & 255) + ((c >> 16) & 255) * k) << 16) | (Math.min(255, ((d >> 8) & 255) + ((c >> 8) & 255) * k) << 8) | Math.min(255, (d & 255) + (c & 255) * k);
    };
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      const t = this.type[i];
      if ((t === PT.SMOKE) !== (layer === "smoke")) continue;
      const px = Math.round(this.x[i]) - camX, py = Math.round(this.y[i]) - camY;
      if (px < -12 || py < -12 || px >= W + 12 || py >= H + 12) continue;
      const u = 1 - this.life[i] / this.span[i], c = this.col[i];
      if (t === PT.DEBRIS || t === PT.DROP) {
        if (this.life[i] < 0.5 && ((px + py + (this.life[i] * 20 | 0)) & 1)) continue;
        const s = this.size[i];
        for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) { const x = px + a, y = py + b; if (x >= 0 && y >= 0 && x < W && y < H) C[y * W + x] = c; }
      } else if (t === PT.SPARK || t === PT.EMBER) {
        if (px >= 0 && py >= 0 && px < W && py < H) C[py * W + px] = u < 0.4 ? 0xffffffff : c;
        if (t === PT.SPARK) { const qx = px - Math.sign(this.vx[i]), qy = py - Math.sign(this.vy[i]); if (qx >= 0 && qy >= 0 && qx < W && qy < H) C[qy * W + qx] = c; }
        light(px, py, c, 0.7 * (1 - u)); light(px + 1, py, c, 0.3 * (1 - u)); light(px - 1, py, c, 0.3 * (1 - u)); light(px, py + 1, c, 0.3 * (1 - u)); light(px, py - 1, c, 0.3 * (1 - u));
      } else if (t === PT.FLAME) {
        const fc = FLAME_RAMP[Math.min(7, (u * 8) | 0)], r = Math.max(0, Math.round(this.size[i] * (1 - u * 0.8)));
        for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
          if (a * a + b * b > r * r + 1) continue;
          const x = px + a, y = py + b;
          if (x >= 0 && y >= 0 && x < W && y < H) { C[y * W + x] = fc; if (u < 0.6) light(x, y, 0xff2060c0, 0.25); }
        }
      } else {
        // smoke: a soft translucent disc that swells and thins
        const r = Math.round(this.size[i] * (0.5 + u * 1.1)), al = (1 - u) * (1 - u) * 0.55;
        const cr = c & 255, cg = (c >> 8) & 255, cb = (c >> 16) & 255, r2 = r * r;
        for (let b = -r; b <= r; b++) {
          const y = py + b;
          if (y < 0 || y >= H) continue;
          for (let a = -r; a <= r; a++) {
            const dd = a * a + b * b;
            if (dd > r2) continue;
            const x = px + a;
            if (x < 0 || x >= W) continue;
            const k = al * (dd > r2 * 0.55 ? 0.55 : 1) * (b < -r * 0.3 ? 1.15 : 0.9), j = y * W + x, v = C[j];
            C[j] = 0xff000000 | (((((v >> 16) & 255) * (1 - k) + cb * k) & 255) << 16) | (((((v >> 8) & 255) * (1 - k) + cg * k) & 255) << 8) | (((v & 255) * (1 - k) + cr * k) & 255);
          }
        }
      }
    }
  }
}
