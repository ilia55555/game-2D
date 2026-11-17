// A pixelfx effect drawn at any size, stretch and angle. The effect renders at its own size into a small buffer
// round its origin; that buffer is then mapped into the world frame, nearest-pixel, so it stays crisp pixel art.
import { createFx, createFrame } from "../vendor/pixelfx/src/core/index.js";

export class ScaledFx {
  /** o: { x, y (where the effect's origin lands), sx, sy, angle, flip, pad (extra buffer room), ...effect options } */
  constructor(mod, o = {}) {
    const m = mod.meta, { x = 0, y = 0, sx = 1, sy, angle = 0, flip = false, pad = 0, clipY = Infinity, ground = null, ...rest } = o;
    this.buf = createFrame(m.size[0] + pad * 2, m.size[1] + pad * 2);
    this.ox = m.origin[0] + pad; this.oy = m.origin[1] + pad;
    this.fx = createFx(mod, { seed: (Math.random() * 1e6) | 0, ...rest, x: this.ox, y: this.oy });
    Object.assign(this, { x, y, sx, sy: sy ?? sx, angle, flip, clipY, ground });
  }
  get options() { return this.fx.options; }
  get t() { return this.fx.t; }
  update(dt) { this.fx.update(dt); }
  stop() { this.fx.stop(); }
  done() { return this.fx.done(); }
  /** Aim the local +x axis along world angle a, mirroring instead of turning upside down. */
  aim(a) { this.flip = Math.cos(a) < 0; this.angle = this.flip ? a - Math.PI : a; }
  /** Where a point in the effect's own space lands in the world. */
  toWorld(lx, ly) {
    const u = (this.flip ? -lx : lx) * this.sx, v = ly * this.sy, c = Math.cos(this.angle), s = Math.sin(this.angle);
    return [this.x + u * c - v * s, this.y + u * s + v * c];
  }
  /** Put the effect so its local point (lx, ly) sits at world (wx, wy). */
  pin(lx, ly, wx, wy) { this.x = 0; this.y = 0; const [px, py] = this.toWorld(lx, ly); this.x = wx - px; this.y = wy - py; }
  draw(f) {
    const B = this.buf, BW = B.w, BH = B.h;
    B.color.fill(0); B.light.fill(0);
    this.fx.draw(B);
    const sx = this.sx, sy = this.sy;
    if (sx <= 0.01 || sy <= 0.01) return;
    // the buffer's corners in the world, clipped to the frame
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [lx, ly] of [[-this.ox, -this.oy], [BW - this.ox, -this.oy], [-this.ox, BH - this.oy], [BW - this.ox, BH - this.oy]]) {
      const [wx, wy] = this.toWorld(lx, ly);
      x0 = Math.min(x0, wx); y0 = Math.min(y0, wy); x1 = Math.max(x1, wx); y1 = Math.max(y1, wy);
    }
    const FX = f.ox, FY = f.oy, W = f.w, H = f.h;
    // ground: a function giving the floor's world y under each column; the effect's floor line (local y = 0)
    // then follows the terrain instead of one flat height (no rotation in that mode)
    const G = this.ground, clip = this.clipY;
    const X0 = Math.max(0, Math.floor(x0 - FX)), X1 = Math.min(W, Math.ceil(x1 - FX));
    const Y0 = G ? 0 : Math.max(0, Math.floor(y0 - FY)), Y1 = G ? H : Math.min(H, Math.ceil(y1 - FY));
    let base = null;
    if (G) { base = new Float32Array(X1 - X0); for (let X = X0; X < X1; X++) base[X - X0] = G(X + 0.5 + FX) - this.y; }
    if (X0 >= X1 || Y0 >= Y1) return;
    const c = Math.cos(this.angle), s = Math.sin(this.angle), fl = this.flip ? -1 : 1;
    const C = f.color, L = f.light, BC = B.color, BL = B.light, ox = this.ox, oy = this.oy;
    for (let Y = Y0; Y < Y1; Y++) {
      const dy0 = Y + 0.5 + FY - this.y;
      for (let X = X0; X < X1; X++) {
        const dx = X + 0.5 + FX - this.x, dy = base ? dy0 - base[X - X0] : dy0;
        const ly = (-dx * s + dy * c) / sy;
        if (ly > clip) continue;
        const bx = Math.floor(((dx * c + dy * s) / sx) * fl + ox), by = Math.floor(ly + oy);
        if (bx < 0 || by < 0 || bx >= BW || by >= BH) continue;
        const j = by * BW + bx, i = Y * W + X, col = BC[j], li = BL[j];
        if (col) {
          const a = col >>> 24;
          if (a === 255) C[i] = col;
          else if (a) {
            const d = C[i], k = a / 255, q = 1 - k;
            const r = (col & 255) * k + (d & 255) * q, g = ((col >>> 8) & 255) * k + ((d >>> 8) & 255) * q, b = ((col >>> 16) & 255) * k + ((d >>> 16) & 255) * q;
            C[i] = (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
          }
        }
        if (li & 0xffffff) {
          const d = L[i];
          const r = Math.min(255, (d & 255) + (li & 255)), g = Math.min(255, ((d >>> 8) & 255) + ((li >>> 8) & 255)), b = Math.min(255, ((d >>> 16) & 255) + ((li >>> 16) & 255));
          L[i] = (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
        }
      }
    }
  }
}
