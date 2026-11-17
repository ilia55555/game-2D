// Ten weapons and an ultimate, each built round pixelfx effects and the world's own destruction.
import { createFx } from "../vendor/pixelfx/src/core/index.js";
import * as laserBolt from "../vendor/pixelfx/src/fx/projectiles/laser-bolt.js";
import * as rocketFx from "../vendor/pixelfx/src/fx/projectiles/rocket.js";
import * as plasmaShot from "../vendor/pixelfx/src/fx/projectiles/plasma-shot.js";
import * as blackHole from "../vendor/pixelfx/src/fx/shadow/black-hole.js";
import * as voidOrb from "../vendor/pixelfx/src/fx/shadow/void-orb.js";
import * as implosion from "../vendor/pixelfx/src/fx/explosions/implosion.js";
import * as tornadoFx from "../vendor/pixelfx/src/fx/nature/tornado.js";
import * as meteorFx from "../vendor/pixelfx/src/fx/fire/meteor.js";
import * as strike from "../vendor/pixelfx/src/fx/lightning/lightning-strike.js";
import * as iceSpikes from "../vendor/pixelfx/src/fx/ice/ice-spikes.js";
import * as holyPillar from "../vendor/pixelfx/src/fx/holy/holy-pillar.js";
import * as nukeFx from "../vendor/pixelfx/src/fx/explosions/nuke.js";
import * as zapHit from "../vendor/pixelfx/src/fx/lightning/zap-hit.js";
import { CELL, SEA } from "./world.js";
import { PT } from "./particles.js";

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

class Bolt {
  constructor(g, x, y, a) { Object.assign(this, { g, x, y, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, a, life: 0.8 }); this.fx = createFx(laserBolt, { x, y, angle: a, palette: BLUE, length: 22 }); }
  update(dt) {
    const g = this.g, hit = travel(g, this, dt);
    this.fx.options.x = this.x; this.fx.options.y = this.y; this.fx.update(dt);
    if (hit) { if (hit.e) hit.e.hurt(2, this.vx * 0.1, -20); g.blast(hit.x, hit.y, 11, 4, { kind: "spark", angle: this.a + Math.PI, quiet: true, fire: 0.05 }); return false; }
    return (this.life -= dt) > 0;
  }
  draw(f) { this.fx.draw(f); }
}

class Rocket {
  constructor(g, x, y, a) { Object.assign(this, { g, x, y, a, sp: 160, life: 2.2, vx: 0, vy: 0 }); this.fx = createFx(rocketFx, { x, y, angle: a }); }
  update(dt) {
    const g = this.g;
    this.sp = Math.min(760, this.sp + 1500 * dt);
    this.vx = Math.cos(this.a) * this.sp; this.vy = Math.sin(this.a) * this.sp;
    const hit = travel(g, this, dt, 4);
    this.fx.options.x = this.x; this.fx.options.y = this.y; this.fx.update(dt);
    g.parts.spawn(PT.SMOKE, this.x - Math.cos(this.a) * 14, this.y - Math.sin(this.a) * 14, rnd(-12, 12), rnd(-12, 12), 0.7, 0xffb8b0b4, 4);
    if (hit || (this.life -= dt) <= 0) { g.blast(this.x, this.y, 46, 10, { kind: "small", size: 1.25 }); return false; }
    return true;
  }
  draw(f) { this.fx.draw(f); }
}

class Grenade {
  constructor(g, x, y, vx, vy, mini) { Object.assign(this, { g, x, y, vx, vy, mini, fuse: mini ? rnd(0.5, 1) : 1.15, t: 0 }); }
  update(dt) {
    const g = this.g, w = g.world;
    this.t += dt; this.vy += 720 * dt;
    const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    if (w.solidPx(nx, ny)) {
      if (!w.solidPx(nx, this.y)) { this.vy *= -0.45; this.vx *= 0.7; } else if (!w.solidPx(this.x, ny)) this.vx *= -0.5; else { this.vx *= -0.4; this.vy *= -0.4; }
      if (Math.hypot(this.vx, this.vy) > 90) g.sfx("thud");
    } else { this.x = nx; this.y = ny; }
    if (g.enemyAt(this.x, this.y, 3)) this.fuse = 0;
    if ((this.fuse -= dt) > 0) return true;
    if (this.mini) g.blast(this.x, this.y, 24, 7, { kind: "small", size: 0.7 });
    else {
      g.blast(this.x, this.y, 32, 8, { kind: "small", size: 1 });
      for (let i = 0; i < 7; i++) g.shots.push(new Grenade(g, this.x, this.y - 4, rnd(-240, 240), rnd(-420, -180), true));
    }
    return false;
  }
  draw(f) {
    const x = Math.round(this.x) - f.ox, y = Math.round(this.y) - f.oy, s = this.mini ? 1 : 2, W = f.w, H = f.h;
    for (let b = -s; b <= s; b++) for (let a = -s; a <= s; a++) { if (Math.abs(a) + Math.abs(b) > s + 1) continue; const px = x + a, py = y + b; if (px >= 0 && py >= 0 && px < W && py < H) f.color[py * W + px] = a === 0 && b === 0 && Math.floor(this.t * 12) & 1 ? 0xff4040ff : 0xff283a2c; }
    if (x >= 0 && y >= 0 && x < W && y < H && Math.floor(this.t * 12) & 1) f.light[y * W + x] = 0xff2020c0;
  }
}

class VoidShot {
  constructor(g, x, y, tx, ty) { const a = Math.atan2(ty - y, tx - x); Object.assign(this, { g, x, y, tx, ty, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, open: false, t: 0, tick: 0 }); this.fx = createFx(voidOrb, { x, y: y + 60 }); }
  update(dt) {
    const g = this.g, w = g.world;
    this.t += dt;
    if (!this.open) {
      const hit = travel(g, this, dt, 4), near = Math.hypot(this.tx - this.x, this.ty - this.y) < 8;
      this.fx.options.x = this.x; this.fx.options.y = this.y + 28; this.fx.update(dt);
      if (hit || near || this.t > 2.5) { this.open = true; this.t = 0; this.fx = createFx(blackHole, { x: this.x, y: this.y + 62 }); g.sfx("void"); g.parts.attract = { x: this.x, y: this.y, r: 150, k: 9000 }; }
      return true;
    }
    this.fx.update(dt);
    const R = 40 + Math.min(1, this.t / 2) * 52;
    for (this.tick += dt; this.tick > 0.016; this.tick -= 0.016) {
      // rip the nearest thing along a random ray
      for (let k = 0; k < 5; k++) {
        const a = rnd(0, Math.PI * 2), c = Math.cos(a), s = Math.sin(a);
        for (let d = 6; d < R; d += 3) {
          const cx = Math.floor((this.x + c * d) / CELL), cy = Math.floor((this.y + s * d) / CELL);
          if (w.get(cx, cy)) { g.addScore(w.destroyCell(cx, cy, -c * 40, -s * 40)); break; }
          if (w.getBg(cx, cy)) { w.destroyBg(cx, cy); break; }
        }
      }
    }
    g.eachEnemy(this.x, this.y, 150, (e, d) => { const k = 900 * dt / (d + 10); e.vx += (this.x - e.x) * k; e.vy += (this.y - (e.y - 10)) * k - 600 * dt; if (e.kind === "heli") { e.x += (this.x - e.x) * dt * 2; e.y += (this.y - e.y) * dt * 2; } if (d < 22) e.hurt(40 * dt); });
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
  { name: "BLASTER", cd: 0.08, pose: "pistol", col: 0xffffd07f,
    fire(g, h, ax, ay) { const [x, y, a] = h.muzzle(ax, ay); g.shots.push(new Bolt(g, x, y, a + rnd(-0.03, 0.03))); g.sfx("shot"); g.flashLight(x, y, 14, 0xffffc060, 0.5); } },
  { name: "ROCKETS", cd: 0.4, pose: "launcher", col: 0xff3c8cff,
    fire(g, h, ax, ay) { const [x, y, a] = h.muzzle(ax, ay); g.shots.push(new Rocket(g, x, y, a)); g.sfx("rocket"); h.vx -= Math.cos(a) * 40; } },
  { name: "CLUSTER", cd: 0.6, pose: "launcher", col: 0xff48c060,
    fire(g, h, ax, ay) { const [x, y, a] = h.muzzle(ax, ay); const p = Math.min(1, Math.hypot(ax - x, ay - y) / 220); g.shots.push(new Grenade(g, x, y, Math.cos(a) * (260 + 300 * p) + h.vx * 0.5, Math.sin(a) * (260 + 300 * p) - 90)); g.sfx("thud"); } },
  { name: "HEAT VISION", cd: 0, beam: true, col: 0xff3030ff,
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
    } },
  { name: "THUNDER", cd: 0.42, col: 0xffffe080,
    fire(g, h, ax, ay) {
      const w = g.world, y = w.solidPx(ax, ay) ? ay : w.surfaceY(ax, ay);
      g.fx.spawn(strike, { x: ax, y });
      g.later(0.5, () => {
        g.blast(ax, y, 34, 10, { kind: "none", fire: 0.7 }); g.sfx("thunder"); g.shake(5); g.flash = Math.max(g.flash, 0.25);
        let n = 0;
        g.eachEnemy(ax, y, 130, (e) => { if (n++ < 5) { e.hurt(12); g.fx.spawn(zapHit, { x: e.x, y: e.y - 12 }); } });
      });
    } },
  { name: "METEOR", cd: 0.9, col: 0xff2a6aff,
    fire(g, h, ax, ay) {
      const w = g.world, y = w.solidPx(ax, ay) ? ay : w.surfaceY(ax, ay), flip = ax < h.x;
      g.fx.spawn(meteorFx, { x: ax, y, flip, keep: true });
      g.later(0.62, () => g.blast(ax, y, 66, 13, { kind: "none", fire: 0.9, boom: 1.6 }));
    } },
  { name: "BLACK HOLE", cd: 2.2, col: 0xffff60a0,
    fire(g, h, ax, ay) { const [x, y] = h.muzzle(ax, ay); g.shots.push(new VoidShot(g, x, y, ax, ay)); g.sfx("fly"); } },
  { name: "TORNADO", cd: 1.8, col: 0xffc0c8d0,
    fire(g, h, ax, ay) { const dir = ax >= h.x ? 1 : -1, x = h.x + dir * 30; g.shots.push(new Twister(g, x, g.world.surfaceY(x, h.y - 40), dir)); } },
  { name: "ICE SPIKES", cd: 0.7, col: 0xffffe0a0,
    fire(g, h, ax, ay) {
      const w = g.world, dir = ax >= h.x ? 1 : -1, y0 = w.surfaceY(h.x + dir * 20, h.y - 30), sx = h.x;
      g.fx.spawn(iceSpikes, { x: h.x + dir * 4, y: y0, flip: dir < 0, keep: true });
      g.sfx("ice");
      for (let i = 0; i < 9; i++) g.later(0.12 + i * 0.05, () => {
        const x = sx + dir * (24 + i * 18), y = w.surfaceY(x, y0 - 60);
        if (Math.abs(y - y0) > 90) return;
        g.addScore(w.explode(x, y - 14 - i * 1.5, 14 + i * 1.6, 7, { fire: 0, clean: true, kick: 1.4 }));
        g.eachEnemy(x, y - 16, 26, (e) => e.hurt(14, dir * 60, -260));
        for (let k = 0; k < 6; k++) g.parts.spawn(PT.DEBRIS, x + rnd(-8, 8), y - rnd(0, 40), rnd(-80, 80), rnd(-260, -80), rnd(0.6, 1.4), k & 1 ? 0xfffff4d8 : 0xffffd09b, 1 + (k & 1));
        g.shake(1.5);
      });
    } },
  { name: "SKY BEAM", cd: 1.3, col: 0xffa0f0ff,
    fire(g, h, ax, ay) {
      const w = g.world, y = w.solidPx(ax, ay) ? ay : w.surfaceY(ax, ay);
      g.fx.spawn(holyPillar, { x: ax, y, keep: true });
      g.sfx("beam");
      for (let k = 0; k < 14; k++) g.later(0.5 + k * 0.06, () => {
        for (let yy = y - 230; yy < y + 26 + k * 7; yy += 13) g.addScore(w.explode(ax + rnd(-2, 2), yy, 13 + Math.min(k, 5), 12, { fire: 0.3, debris: 4 }));
        g.eachEnemy(ax, y - 100, 140, (e) => { if (Math.abs(e.x - ax) < 22) e.hurt(20); });
        g.beam2 = { x: ax, y0: y - 260, y1: y + 26 + k * 7, t: 0.09 };
        g.shake(2.5);
        if (k === 0) g.sfx("bigboom");
      });
    } },
];

/** The ultimate. */
export function nuke(g, x, y) {
  const w = g.world;
  g.fx.spawn(nukeFx, { x, y, keep: true, cost: 4 });
  g.sfx("nuke");
  g.flash = 1.2; g.freeze = 0.12;
  for (let k = 0; k < 12; k++) g.later(0.06 + k * 0.085, () => {
    const r = 40 + k * 12;
    g.addScore(w.explode(x, y - 24, r, 18, { fire: 0.5, debris: 110, kick: 1.6 }));
    g.eachEnemy(x, y - 24, r + 20, (e, d) => e.hurt(200, (e.x - x) * 4, -300));
    g.shake(14 - k * 0.6);
    for (let i = 0; i < 16; i++) { const a = rnd(Math.PI, Math.PI * 2); g.parts.spawn(i & 1 ? PT.FLAME : PT.SMOKE, x + Math.cos(a) * r, y - 24 + Math.sin(a) * r * 0.8, Math.cos(a) * 80, Math.sin(a) * 80 - 30, rnd(0.6, 1.6), 0xff383038, rnd(4, 8)); }
    if (g.hero.dead <= 0 && Math.hypot(g.hero.x - x, g.hero.cy - y) < r) g.hero.vy -= 60;
  });
}
