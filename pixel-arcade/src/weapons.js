// The hero's powers and an ultimate, each built round pixelfx effects and the world's own destruction.
import { createFx } from "../vendor/pixelfx/src/core/index.js";
import * as blackHole from "../vendor/pixelfx/src/fx/shadow/black-hole.js";
import * as voidOrb from "../vendor/pixelfx/src/fx/shadow/void-orb.js";
import * as implosion from "../vendor/pixelfx/src/fx/explosions/implosion.js";
import * as tornadoFx from "../vendor/pixelfx/src/fx/nature/tornado.js";
import * as nukeFx from "../vendor/pixelfx/src/fx/explosions/nuke.js";
import { ScaledFx } from "./scaled.js";
import { CELL, SEA } from "./world.js";
import { PT } from "./particles.js";
import { MJOLNIR } from "./thor.js";
import { lightningLeft } from "./lightning.js";
import { AQUA, FROST, ARCANE, INFERNO, RADIANCE } from "./powers.js";
import { PETS } from "./pets.js";
import { upgradeHeat, upgradeBlackHole, upgradeTornado, addThorAlt } from "./powers2.js";

const BLUE = ["#061a3c", "#0b3b8c", "#1f6ad0", "#3f9cff", "#7fd0ff", "#c8f0ff", "#ffffff"];
const rnd = (a, b) => a + Math.random() * (b - a);

/** Step a shot along its velocity; returns where it hit (world or enemy) or null. */
function travel(g, s, dt, r = 2) {
  const d = Math.hypot(s.vx, s.vy) * dt, n = Math.max(1, Math.ceil(d / 3));
  for (let i = 0; i < n; i++) {
    s.x += (s.vx * dt) / n; s.y += (s.vy * dt) / n;
    if (g.world.solidPx(s.x, s.y)) return { x: s.x, y: s.y };
    const e = g.enemyAt(s.x, s.y, r);
    if (e) return { x: s.x, y: s.y, e };
  }
  return null;
}

const PULL = 230;
class VoidShot {
  constructor(g, x, y, tx, ty) { const a = Math.atan2(ty - y, tx - x); Object.assign(this, { g, x, y, tx, ty, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, open: false, t: 0, tick: 0 }); this.fx = createFx(voidOrb, { x, y: y + 60 }); }
  update(dt) {
    const g = this.g, w = g.world;
    this.t += dt;
    if (!this.open) {
      const hit = travel(g, this, dt, 4), near = Math.hypot(this.tx - this.x, this.ty - this.y) < 8;
      this.fx.options.x = this.x; this.fx.options.y = this.y + 28; this.fx.update(dt);
      if (hit || near || this.t > 2.5) { this.open = true; this.t = 0; this.fx = new ScaledFx(blackHole, { sx: 1.5, pad: 10 }); this.fx.pin(0, -62, this.x, this.y); g.sfx("void"); g.parts.attract = { x: this.x, y: this.y, r: PULL, k: 16000 }; }
      return true;
    }
    this.fx.update(dt);
    const R = 60 + Math.min(1, this.t / 1.5) * (PULL - 60);
    for (this.tick += dt; this.tick > 0.016; this.tick -= 0.016) {
      // rip the nearest thing along a random ray
      for (let k = 0; k < 14; k++) {
        const a = rnd(0, Math.PI * 2), c = Math.cos(a), s = Math.sin(a);
        for (let d = 6; d < R; d += 3) {
          const cx = Math.floor((this.x + c * d) / CELL), cy = Math.floor((this.y + s * d) / CELL);
          if (w.get(cx, cy)) { g.addScore(w.destroyCell(cx, cy, -c * (120 + d), -s * (120 + d))); break; }
          if (w.getBg(cx, cy)) { w.destroyBg(cx, cy); break; }
        }
      }
    }
    // everything inside the pull is dragged in and held there, spinning, until it collapses
    for (const e of g.enemies) {
      if (e.dead || e.wreck) continue;
      const ey = e.y - (e.h || 10) / 2, d = Math.hypot(e.x - this.x, ey - this.y);
      if (d > PULL) continue;
      e.held = (e.held || 0) + dt; e.bh = this;
      const k = Math.min(1, dt * (3 + 6 * (1 - d / PULL))), r = Math.max(6, d * (1 - k)), a = Math.atan2(ey - this.y, e.x - this.x) + dt * 4;
      e.x = this.x + Math.cos(a) * r; e.y = this.y + Math.sin(a) * r + (e.h || 10) / 2; e.vx = 0; e.vy = 0;
      e.hurt(d < 30 ? 50 * dt : 12 * dt);
    }
    // pieces of buildings already falling are torn apart into the hole
    for (let n = w.islands.length - 1; n >= 0; n--) {
      const isl = w.islands[n], ix = (isl.cx0 + isl.w / 2) * CELL, iy = isl.y + isl.h * CELL / 2;
      if (Math.hypot(ix - this.x, iy - this.y) > PULL + Math.max(isl.w, isl.h) * 2) continue;
      w.islands.splice(n, 1);
      for (let y = 0; y < isl.h; y++) for (let x = 0; x < isl.w; x++) { const m = isl.fg[y * isl.w + x]; if (m && Math.random() < 0.5) { const px = (isl.cx0 + x) * CELL, py = isl.y + y * CELL; w.hooks.debris?.(m, px, py, (this.x - px) * 2, (this.y - py) * 2); } }
      g.addScore(isl.n);
    }
    // enemy fire bends in and is swallowed
    for (let i = g.eshots.length - 1; i >= 0; i--) { const q = g.eshots[i], d = Math.hypot(q.x - this.x, q.y - this.y); if (d > PULL) continue; if (d < 14) { g.eshots.splice(i, 1); continue; } q.vx += (this.x - q.x) * dt * 8; q.vy += (this.y - q.y) * dt * 8; }
    g.shake(1.2);
    if (this.t < 3.6) return true;
    g.parts.attract = null;
    g.fx.spawn(implosion, { x: this.x, y: this.y, keep: true });
    const x = this.x, y = this.y;
    g.later(1.0, () => g.blast(x, y, 96, 13, { kind: "dark" }));
    return false;
  }
  draw(f) { this.fx.draw(f); }
}

class Twister {
  constructor(g, x, y, dir) { Object.assign(this, { g, x, y, dir, t: 0, tick: 0 }); this.fx = createFx(tornadoFx, { x, y, height: 128 }); g.sfx("wind"); }
  update(dt) {
    const g = this.g, w = g.world;
    this.t += dt;
    this.x += this.dir * 95 * dt;
    const gy = w.wet(Math.floor(this.x / CELL)) ? Math.min(SEA * CELL, w.surfaceY(this.x, this.y - 60)) : w.surfaceY(this.x, this.y - 60);
    this.y += Math.max(-80 * dt, Math.min(160 * dt, gy - this.y));
    this.fx.options.x = this.x; this.fx.options.y = this.y; this.fx.update(dt);
    for (this.tick += dt; this.tick > 0.016; this.tick -= 0.016) {
      for (let k = 0; k < 7; k++) {
        const hgt = rnd(0, 1), px = this.x + rnd(-1, 1) * (12 + hgt * 26), py = this.y + 10 - hgt * 150;
        const cx = Math.floor(px / CELL), cy = Math.floor(py / CELL);
        if (w.get(cx, cy)) g.addScore(w.destroyCell(cx, cy, (this.x - px) * 6 + this.dir * 120 + rnd(-160, 160), rnd(-520, -160)));
        else if (w.getBg(cx, cy) && Math.random() < 0.6) w.destroyBg(cx, cy);
      }
    }
    g.eachEnemy(this.x, this.y - 50, 70, (e) => { e.vx += (this.x - e.x) * 6 * dt + this.dir * 200 * dt; e.vy -= 1900 * dt; e.hurt(14 * dt); });
    if (Math.random() < 0.3) g.sfx("rumble");
    if (this.t > 6.5) { this.fx.stop(); }
    return this.t < 6.8;
  }
  draw(f) { this.fx.draw(f); }
}

export const WEAPONS = [
  AQUA,
  FROST,
  ARCANE,
  upgradeHeat({ name: "HEAT VISION", cd: 0, beam: true, col: 0xff3030ff,
    fire(g, h, ax, ay, dt) {
      const [ex, ey] = h.eyes(), a = Math.atan2(ay - ey, ax - ex), c = Math.cos(a), s = Math.sin(a), w = g.world;
      const hit = w.raycast(ex + c * 4, ey + s * 4, c, s, 560);
      let end = hit.d;
      g.eachEnemyOnRay(ex, ey, c, s, end, 7, (e, d) => { e.hurt(60 * dt, c * 20, s * 20); });
      g.beam = { x0: ex, y0: ey, x1: ex + c * (end + 4), y1: ey + s * (end + 4), t: 0.05 };
      h.heatAcc = (h.heatAcc || 0) + dt;
      if (hit.hit) {
        while (h.heatAcc > 0.02) { h.heatAcc -= 0.02; g.addScore(w.explode(hit.x + c * 3, hit.y + s * 3, 8, 6, { fire: 0.7, debris: 5 })); }
        for (let i = 0; i < 2; i++) g.parts.spawn(PT.SPARK, hit.x, hit.y, -c * rnd(40, 200) + rnd(-90, 90), -s * rnd(40, 200) + rnd(-120, 60), rnd(0.2, 0.6), 0xff40b0ff);
        if (Math.random() < 0.25) g.parts.spawn(PT.SMOKE, hit.x, hit.y, rnd(-10, 10), -20, 0.8, 0xff605860, 4);
      } else h.heatAcc = 0;
      g.sfx("laser");
    } }),
  addThorAlt(lightningLeft(MJOLNIR)), // hold to charge; see thor.js
  INFERNO,
  upgradeBlackHole({ name: "BLACK HOLE", cd: 2.2, col: 0xffff60a0,
    fire(g, h, ax, ay) { const [x, y] = h.muzzle(ax, ay); g.shots.push(new VoidShot(g, x, y, ax, ay)); g.sfx("fly"); } }),
  upgradeTornado({ name: "TORNADO", cd: 0.8, col: 0xffc0c8d0,
    fire(g, h, ax, ay) { const dir = ax >= h.x ? 1 : -1, x = h.x + dir * 30; g.shots.push(new Twister(g, x, g.world.surfaceY(x, h.y - 40), dir)); } }),
  RADIANCE,
  PETS, // slot 0: summoned critters
];

/** The ultimate: a meteor out of space onto the aim (the old nuke's blast without the mushroom cloud). */
export function nuke(g, x, y) {
  const w = g.world;
  g.hero.inv = Math.max(g.hero.inv, 2);
  g.sfx("bigboom"); g.flash = 0.8; g.freeze = 0.08;
  for (let k = 0; k < 8; k++) g.later(0.04 + k * 0.07, () => {
    const r = 50 + k * 18;
    g.addScore(w.explode(x, y - 16, r, 22, { fire: 0.5, debris: 140, kick: 1.8 }));
    g.eachEnemy(x, y - 16, r + 20, (e) => e.hurt(140, (e.x - x) * 4, -300));
    g.shake(16 - k);
    for (let i = 0; i < 14; i++) { const a = rnd(Math.PI, Math.PI * 2); g.parts.spawn(i & 1 ? PT.FLAME : PT.SMOKE, x + Math.cos(a) * r, y - 16 + Math.sin(a) * r * 0.8, Math.cos(a) * 80, Math.sin(a) * 80 - 30, rnd(0.6, 1.6), 0xff383038, rnd(4, 8)); }
  });
}
