// Live pixelfx effects in the world: spawn, step, cull, and keep the frame time honest.
import { createFx } from "../vendor/pixelfx/src/core/index.js";

export class FxMan {
  constructor() { this.list = []; this.ms = 0; }
  /** Play an effect at world (o.x, o.y). o.keep protects it from the budget; o.back draws it behind the hero. */
  spawn(mod, o = {}) {
    const fx = createFx(mod, { seed: (Math.random() * 1e6) | 0, ...o });
    const m = mod.meta, e = { fx, back: !!o.back, keep: !!o.keep, w: m.size[0], h: m.size[1], ox: m.origin[0], oy: m.origin[1], cost: o.cost ?? 1 };
    this.list.push(e);
    if (this.list.length > 34) this.trim();
    return e;
  }
  trim() {
    const i = this.list.findIndex((e) => !e.keep && e.fx.t > 0.5);
    this.list.splice(i < 0 ? 0 : i, 1);
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      e.fx.update(dt);
      if (e.fx.done() || e.dead) this.list.splice(i, 1);
    }
    if (this.ms > 11 && this.list.length > 4) this.trim();
  }
  draw(frame, back) {
    const t0 = performance.now(), x0 = frame.ox, y0 = frame.oy;
    for (const e of this.list) {
      if (e.back !== back) continue;
      const o = e.fx.options, r = Math.max(e.w, e.h);
      if (o.x + r < x0 || o.x - r > x0 + frame.w || o.y + r < y0 || o.y - r > y0 + frame.h) continue;
      e.fx.draw(frame);
    }
    const ms = performance.now() - t0;
    if (back) this._b = ms;
    else this.ms = this.ms * 0.8 + (ms + (this._b || 0)) * 0.2;
  }
}
