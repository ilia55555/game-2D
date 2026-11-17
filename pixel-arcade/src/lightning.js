// MJOLNIR's left button: a tap throws a big bolt from the hands onto the aim (the surface under it, or the roof of
// the building it's in); holding pours out a steady bolt like a beam, as far as the first thing it hits.
// The bolt is drawn with pixelfx's lightning-strike look (its zigzag + stroke), without the ground effects.
import { painterFor, hex, rng } from "../vendor/pixelfx/src/core/index.js";
import { VOLT, zigzag, stroke } from "../vendor/pixelfx/src/fx/lightning/_lib.js";
import { PT } from "./particles.js";
import { CELL } from "./world.js";

const C = VOLT.map(hex);
const rnd = (a, b) => a + Math.random() * (b - a);
const live = (e) => !e.dead && !e.wreck;
let seed = 1;

function drawBolt(f, x0, y0, x1, y1, k, s, jag = 0.17, forks = 0.5) {
  const L = Math.hypot(x1 - x0, y1 - y0);
  if (L < 2) return;
  const p = painterFor(f); p.place(x0, y0);
  // the inker works in a ±512 px box round its origin: very long bolts are drawn in pieces
  const n = Math.ceil(L / 480);
  for (let i = 0; i < n; i++) {
    const ax = ((x1 - x0) * i) / n, ay = ((y1 - y0) * i) / n, bx = ((x1 - x0) * (i + 1)) / n, by = ((y1 - y0) * (i + 1)) / n;
    p.place(x0 + ax, y0 + ay);
    stroke(p, zigzag(rng(seed++), 0, 0, bx - ax, by - ay, jag, forks), k, C, s, { core: k > 0.6 ? 1.2 : 0 });
  }
}

/** Tap: one big bolt from the hands. */
class Strike {
  constructor(g, h, ax, ay) {
    const w = g.world, [mx, my] = h.muzzle(ax, ay);
    // underground or inside a building: it lands on top of whatever is there
    const ty = w.solidPx(ax, ay) || w.getBg(Math.floor(ax / CELL), Math.floor(ay / CELL)) ? w.surfaceY(ax, Math.min(ay, g.cam.y) - 600) : w.surfaceY(ax, ay);
    Object.assign(this, { g, x0: mx, y0: my, x1: ax, y1: ty, t: 0, life: 0.32 });
    g.addScore(w.explode(ax, ty - 4, 30, 12, { fire: 0.4, debris: 30, kick: 1.5 }));
    g.eachEnemy(ax, ty - 10, 46, (e) => e.hurt(70, (e.x - ax) * 5, -320));
    const c = Math.cos(Math.atan2(ty - my, ax - mx)), s = Math.sin(Math.atan2(ty - my, ax - mx));
    g.eachEnemyOnRay(mx, my, c, s, Math.hypot(ax - mx, ty - my), 8, (e) => { if (live(e)) e.hurt(30, c * 200, s * 200); });
    for (let i = 0; i < 14; i++) g.parts.spawn(PT.SPARK, ax, ty - 2, rnd(-260, 260), -rnd(80, 360), rnd(0.2, 0.6), 0xffffe0a0);
    g.flashLight(ax, ty, 90, 0xffffb050, 1, 0.25);
    g.flash = Math.max(g.flash, 0.12); g.shake(5); g.sfx("thunder");
  }
  update(dt) { this.t += dt; const h = this.g.hero; [this.x0, this.y0] = h.muzzle(this.x1, this.y1); return this.t < this.life; }
  draw(f) { const k = 1 - this.t / this.life; drawBolt(f, this.x0, this.y0, this.x1, this.y1, Math.min(1, k * 1.6), 1.6); }
}

/** Hold: a steady bolt like a beam. */
class Stream {
  constructor(g, h) { Object.assign(this, { g, h, alive: 0.1, acc: 0, x0: 0, y0: 0, x1: 0, y1: 0 }); }
  aim(ax, ay, dt) {
    const g = this.g, w = g.world, [mx, my, a] = this.h.muzzle(ax, ay), c = Math.cos(a), s = Math.sin(a);
    const hit = w.raycast(mx + c * 2, my + s * 2, c, s, 560);
    let end = hit.d;
    let first = null;
    g.eachEnemyOnRay(mx, my, c, s, end, 6, (e, d) => { if (live(e) && d < end) { end = d; first = e; } });
    if (first) first.hurt(70 * dt, c * 60, s * 60);
    Object.assign(this, { x0: mx, y0: my, x1: mx + c * end, y1: my + s * end, alive: 0.1 });
    if (hit.hit && !first) {
      for (this.acc += dt; this.acc > 0.025; this.acc -= 0.025) g.addScore(w.explode(this.x1 + c * 3, this.y1 + s * 3, 9, 6, { fire: 0.3, debris: 5 }));
    }
    if (hit.hit || first) for (let i = 0; i < 2; i++) g.parts.spawn(PT.SPARK, this.x1, this.y1, -c * rnd(40, 200) + rnd(-90, 90), -s * rnd(40, 200) + rnd(-120, 60), rnd(0.15, 0.4), 0xffffe0a0);
    g.flashLight(this.x1, this.y1, 40, 0xffffb050, 0.7, 0.06);
    if (Math.random() < 0.3) g.sfx("laser");
  }
  update(dt) { return (this.alive -= dt) > 0; }
  draw(f) { drawBolt(f, this.x0, this.y0, this.x1, this.y1, 0.9, 1.1, 0.12, 0.35); }
}

/** Gives the power the tap / hold left button. */
export function lightningLeft(M) {
  const { charge, charging, release, ...rest } = M;
  return {
    ...rest, cd: 0.12,
    tap(g, h, ax, ay) { g.shots.push(new Strike(g, h, ax, ay)); },
    hold(g, h, ax, ay, t, dt) {
      if (!g.bolt || !g.shots.includes(g.bolt)) { g.bolt = new Stream(g, h); g.shots.push(g.bolt); }
      g.bolt.aim(ax, ay, dt);
    },
    release(g) { if (g.bolt) g.bolt.alive = 0; },
  };
}
