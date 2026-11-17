// More three-way powers: heat vision's plasma and sonic cannon, the black hole's soul drain and shadow arms,
// the tornado's leaf storm and earth spike, mjolnir's charge-up, and the ultimate: a small moon pulled out of
// the sky and slammed down.
import { ScaledFx } from "./scaled.js";
import { PT } from "./particles.js";
import { CELL } from "./world.js";
import { Arc } from "./thor.js";
import { painterFor, fit } from "../vendor/pixelfx/src/core/index.js";
import { VOID } from "../vendor/pixelfx/src/fx/shadow/_lib.js";
import * as soulDrain from "../vendor/pixelfx/src/fx/shadow/soul-drain.js";
import * as leafStorm from "../vendor/pixelfx/src/fx/nature/leaf-storm.js";
import * as earthSpike from "../vendor/pixelfx/src/fx/nature/earth-spike.js";
import * as plasmaShot from "../vendor/pixelfx/src/fx/projectiles/plasma-shot.js";
import * as chargeUp from "../vendor/pixelfx/src/fx/lightning/charge-up.js";
import * as fireball from "../vendor/pixelfx/src/fx/fire/fireball.js";

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const TAU = Math.PI * 2;
const live = (e) => !e.dead && !e.wreck;
const mid = (e) => e.y - e.h / 2;
const ground = (g, x, y) => (g.world.solidPx(x, y) ? y : g.world.surfaceY(x, y));
const view = (g) => { const W = g.frame.w, H = g.frame.h; return { l: g.cam.x - W / 2, r: g.cam.x + W / 2, t: g.cam.y - H / 2, b: g.cam.y + H / 2, W, H }; };
function ticks(o, dt, fn) { for (o.tick = (o.tick || 0) + dt; o.tick > 1 / 60; o.tick -= 1 / 60) fn(); }

/** A scaled effect plus what it does each frame; `alive` keeps held ones going while the button is down. */
class Power {
  constructor(g, s) { this.g = g; this.s = s; this.t = 0; this.ending = false; }
  end() { if (!this.ending) { this.ending = true; this.s.stop(); this.onEnd?.(); } }
  update(dt) {
    this.t += dt;
    if (this.alive !== undefined && !this.ending && (this.alive -= dt) <= 0) this.end();
    if (!this.ending) this.step(dt);
    this.s.update(dt);
    return !this.s.done();
  }
  step() {}
  draw(f) { this.s.draw(f); }
}
function held(g, key, make) {
  g.held = g.held || {};
  let p = g.held[key];
  if (!p || p.ending || !g.shots.includes(p)) { p = g.held[key] = make(); g.shots.push(p); }
  p.alive = 0.08;
  return p;
}

// ================================================================================================= HEAT VISION

/** Tap: a ball of plasma that bursts on whatever it hits. */
class PlasmaBall {
  constructor(g, x, y, a) {
    Object.assign(this, { g, x, y, vx: Math.cos(a) * 400, vy: Math.sin(a) * 400, life: 1.5 });
    this.s = new ScaledFx(plasmaShot, { sx: 1.5, size: 7 }); this.s.aim(a);
    g.sfx("beam");
  }
  update(dt) {
    const g = this.g, w = g.world;
    this.s.update(dt);
    const n = Math.max(1, Math.ceil((Math.hypot(this.vx, this.vy) * dt) / 3));
    for (let i = 0; i < n; i++) {
      this.x += (this.vx * dt) / n; this.y += (this.vy * dt) / n;
      if (w.solidPx(this.x, this.y) || g.enemyAt(this.x, this.y, 4) || (this.life -= dt / n) <= 0) {
        g.blast(this.x, this.y, 30, 9, { kind: "plasma" });
        return false;
      }
    }
    this.s.x = this.x; this.s.y = this.y;
    g.flashLight(this.x, this.y, 26, 0xff60ff60, 0.6, 0.05);
    return true;
  }
  draw(f) { this.s.draw(f); }
}

/** Right click: a sonic cannon. Rings of sound roll out of the hero in a widening cone, shoving and shaking
 *  apart whatever they pass through. */
class Sonic {
  constructor(g, h, ax, ay) {
    const [mx, my] = h.eyes();
    Object.assign(this, { g, x: mx, y: my, a: Math.atan2(ay - my, ax - mx), t: 0, waves: [] });
    g.sfx("beam"); g.sfx("boom", 0.4); g.shake(4);
  }
  update(dt) {
    const g = this.g, w = g.world;
    this.t += dt;
    if (this.waves.length < 7 && this.t >= this.waves.length * 0.06) this.waves.push({ r: 6, hit: new Set() });
    for (const v of this.waves) {
      v.r += 480 * dt;
      const half = 0.22 + v.r / 1100;
      for (const e of g.enemies) {
        if (!live(e) || v.hit.has(e)) continue;
        const dx = e.x - this.x, dy = mid(e) - this.y, d = Math.hypot(dx, dy);
        let da = Math.atan2(dy, dx) - this.a; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
        if (Math.abs(d - v.r) < 10 + e.hw && Math.abs(da) < half) { v.hit.add(e); e.hurt(16, Math.cos(this.a) * 380, Math.sin(this.a) * 380 - 120); }
      }
      for (let k = 0; k < 5; k++) {
        const b = this.a + rnd(-half, half), cx = Math.floor((this.x + Math.cos(b) * v.r) / CELL), cy = Math.floor((this.y + Math.sin(b) * v.r) / CELL);
        if (w.get(cx, cy)) g.addScore(w.destroyCell(cx, cy, Math.cos(b) * 300, Math.sin(b) * 300 - 80));
        else if (w.getBg(cx, cy) && Math.random() < 0.5) w.destroyBg(cx, cy);
      }
    }
    this.waves = this.waves.filter((v) => v.r < 430);
    return this.t < 0.5 || this.waves.length > 0;
  }
  draw(f) {
    const p = painterFor(f); p.place(0, 0);
    for (const v of this.waves) {
      const half = 0.22 + v.r / 1100, k = 1 - v.r / 430;
      p.arc(this.x, this.y, v.r, 3, this.a - half, this.a + half, 0xfffff0d0, k);
      p.arc(this.x, this.y, v.r - 3, 1, this.a - half, this.a + half, 0xffffffff, k);
      p.glow(this.x + Math.cos(this.a) * v.r, this.y + Math.sin(this.a) * v.r, 14 + v.r * 0.1, 0xffffe0a0, 0.25 * k);
    }
  }
}

export function upgradeHeat(HEAT) {
  const beam = HEAT.fire;
  return {
    name: HEAT.name, col: HEAT.col, cd: 0.3, altCd: 0.9,
    tap(g, h, ax, ay) { const [x, y, a] = h.muzzle(ax, ay); g.shots.push(new PlasmaBall(g, x, y, a)); },
    hold(g, h, ax, ay, t, dt) { beam(g, h, ax, ay, dt); },
    alt(g, h, ax, ay) { g.shots.push(new Sonic(g, h, ax, ay)); },
  };
}

// ================================================================================================= BLACK HOLE

/** Tap: a black crystal where you aim; the souls of every enemy round it, from any direction, are dragged down
 *  streams into it, draining them and feeding the hero. */
class Drain extends Power {
  constructor(g, ax, ay) {
    super(g, new ScaledFx(soulDrain, { pad: 200 }));
    this.s.pin(0, -50, ax, ay);
    Object.assign(this, { x: ax, y: ay, R: 230 });
    g.sfx("void");
  }
  step(dt) {
    const g = this.g, h = g.hero, s = this.s, src = [];
    if (this.t > 4) return this.end();
    for (const e of g.enemies) {
      if (!live(e)) continue;
      const d = Math.hypot(e.x - this.x, mid(e) - this.y);
      if (d > this.R) continue;
      src.push([e.x - s.x, mid(e) - s.y]);
      e.hurt(9 * dt);
      e.vx += (this.x - e.x) * dt * 0.8;
      if (h.dead <= 0) h.hp = Math.min(100, h.hp + 1.5 * dt);
    }
    // nobody near: the streams still come in from all round
    if (!src.length) for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; src.push([Math.cos(a) * 90, -50 + Math.sin(a) * 70]); }
    s.options.sources = src.slice(0, 16);
  }
}

/** Hold: dark arms burst out of the hero's back and follow the aim, like a mad scientist's. Their claws grab
 *  enemies; sweep the mouse and let go to throw them. They smash what they swing through. */
const ARMS = 4, REACH = 250;
const VC = fit(VOID, 8);
class Tendrils {
  constructor(g, h) {
    Object.assign(this, { g, h, t: 0, alive: 0.08, ending: false, fade: 1 });
    this.arms = Array.from({ length: ARMS }, (_, i) => ({ x: h.x, y: h.y - 24, vx: 0, vy: 0, off: (i / (ARMS - 1) - 0.5) * 2, held: null, ph: rnd(0, TAU) }));
    g.sfx("void");
  }
  base(i) { const h = this.h, side = i % 2 ? -1 : 1; return [h.x - h.face * 3 + side * 3, h.y - 24 + (i >> 1) * 4]; }
  end() { if (this.ending) return; this.ending = true; for (const a of this.arms) this.throwOff(a); }
  throwOff(a) {
    const e = a.held; a.held = null;
    if (!e || !live(e)) return;
    const k = 1.5;
    e.vx = a.vx * k; e.vy = a.vy * k - 120; e.flungT = this.g.time + 1;
    e.hurt(12 + Math.hypot(a.vx, a.vy) * 0.02);
  }
  update(dt) {
    const g = this.g, h = this.h, w = g.world, I = g.I;
    this.t += dt;
    if (!this.ending && (this.alive -= dt) <= 0) this.end();
    if (this.ending) { this.fade -= dt * 3; return this.fade > 0; }
    this.arms.forEach((a, i) => {
      const [bx, by] = this.base(i);
      // each claw goes for a point round the aim, never further than the arms reach
      let tx = I.aimX + a.off * 26 + Math.cos(this.t * 3 + a.ph) * 6, ty = I.aimY + (a.off * a.off - 0.5) * 22 + Math.sin(this.t * 4 + a.ph) * 6;
      const dx = tx - bx, dy = ty - by, d = Math.hypot(dx, dy), grow = Math.min(1, this.t / 0.25) * REACH;
      if (d > grow) { tx = bx + (dx / d) * grow; ty = by + (dy / d) * grow; }
      const k = 60, damp = 11;
      a.vx += ((tx - a.x) * k - a.vx * damp) * dt; a.vy += ((ty - a.y) * k - a.vy * damp) * dt;
      a.x += a.vx * dt; a.y += a.vy * dt;
      // grab
      if (!a.held) {
        const e = g.enemyAt(a.x, a.y, 6);
        if (e && live(e) && (e.flungT || 0) < g.time && !this.arms.some((q) => q.held === e)) { a.held = e; g.sfx("punch"); }
      }
      if (a.held) {
        const e = a.held;
        if (!live(e)) a.held = null;
        else { e.x = a.x; e.y = a.y + e.h / 2; e.vx = 0; e.vy = 0; e.hurt(2 * dt); }
      }
      // smash: a fast claw tears through walls
      const sp = Math.hypot(a.vx, a.vy);
      if (sp > 260) {
        const cx = Math.floor(a.x / CELL), cy = Math.floor(a.y / CELL);
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (w.get(cx + ox, cy + oy)) g.addScore(w.destroyCell(cx + ox, cy + oy, a.vx * 0.4, a.vy * 0.4));
        if (a.held === null) g.eachEnemy(a.x, a.y, 8, (e) => e.hurt(sp * 0.01, a.vx * 0.3, a.vy * 0.3));
      }
    });
    return true;
  }
  draw(f) {
    const p = painterFor(f); p.place(0, 0);
    const k = Math.max(0, this.fade);
    this.arms.forEach((a, i) => {
      const [bx, by] = this.base(i), dx = a.x - bx, dy = a.y - by, L = Math.hypot(dx, dy) || 1;
      // a curve out of the back, up and over to the claw
      const nx = -dy / L, ny = dx / L, up = ny < 0 ? 1 : -1, bend = Math.min(L * 0.32, 8 + i * 16) * up * (i === 1 ? -0.6 : 1);
      const cx = bx + dx * 0.45 + nx * bend, cy = by + dy * 0.45 + ny * bend - Math.min(20, L * 0.1);
      const N = Math.max(8, Math.ceil(L / 4));
      let px = bx, py = by;
      for (let j = 1; j <= N; j++) {
        const u = j / N, v = 1 - u, wob = Math.sin(this.t * 9 + u * 8 + a.ph) * 2 * u * (1 - u);
        const x = v * v * bx + 2 * v * u * cx + u * u * a.x + nx * wob, y = v * v * by + 2 * v * u * cy + u * u * a.y + ny * wob;
        const wd = 7 - u * 4;
        p.beam(px, py, x, y, wd + 2, VC[1], k);
        p.beam(px, py, x, y, wd, VC[3], k);
        p.beam(px, py, x, y, wd * 0.45, VC[4], k);
        p.line(px, py - wd * 0.35, x, y - wd * 0.35, (j & 3) === 0 ? VC[7] : VC[6], k);
        if ((j & 3) === 0) p.glow(x, y, wd * 1.6, VC[5], 0.15 * k);
        px = x; py = y;
      }
      // the claw: three hooked fingers, closed on whatever it holds
      const ang = Math.atan2(a.y - cy, a.x - cx), open = a.held ? 0.25 : 0.7 + 0.2 * Math.sin(this.t * 10 + a.ph);
      for (const s of [-1, 0, 1]) {
        const b = ang + s * open, x1 = a.x + Math.cos(b) * 7, y1 = a.y + Math.sin(b) * 7, b2 = b - s * 1.2;
        p.line(a.x, a.y, x1, y1, VC[5], k);
        p.line(x1, y1, x1 + Math.cos(b2) * 3, y1 + Math.sin(b2) * 3, VC[7], k);
      }
      p.glow(a.x, a.y, 10, VC[5], 0.5 * k);
    });
  }
}

export function upgradeBlackHole(BH) {
  return {
    name: BH.name, col: BH.col, cd: 0.8, altCd: BH.cd,
    tap(g, h, ax, ay) { g.shots.push(new Drain(g, ax, ay)); },
    hold(g, h) { g.held = g.held || {}; let t = g.held.arms; if (!t || t.ending || !g.shots.includes(t)) { t = g.held.arms = new Tendrils(g, h); g.shots.push(t); } t.alive = 0.08; },
    release(g) { g.held?.arms?.end(); },
    alt: BH.fire,
  };
}

// ================================================================================================= TORNADO

/** Hold: a storm of leaves and wind winds up round the hero; held long it towers the full height of the screen. */
class LeafStorm extends Power {
  constructor(g, h) { super(g, new ScaledFx(leafStorm, {})); this.h = h; this.k = 1; this.snd = 0; }
  grow(t) { this.k = Math.min(view(this.g).H / 64, 1 + t * 1.1); }
  step(dt) {
    const g = this.g, h = this.h, w = g.world, k = this.k, s = this.s;
    s.sx = k * 0.9 + 0.1; s.sy = k; s.x = h.x; s.y = h.y;
    const R = 26 * s.sx + 10, top = h.y - 66 * k;
    for (const e of g.enemies) {
      if (!live(e) || Math.abs(e.x - h.x) > R + e.hw || e.y < top || mid(e) > h.y + 8) continue;
      const side = e.x >= h.x ? 1 : -1;
      e.vx += side * 500 * dt + (h.x - e.x) * 3 * dt; e.vy -= (900 + 300 * k) * dt;
      e.hurt((4 + 4 * k) * dt);
    }
    ticks(this, dt, () => {
      for (let i = 0; i < 2 + k * 2; i++) {
        const u = rnd(0, 1), px = h.x + rnd(-1, 1) * R * (0.4 + u * 0.6), py = h.y - u * 66 * k, cx = Math.floor(px / CELL), cy = Math.floor(py / CELL);
        if (Math.abs(px - h.x) < 8) continue;
        if (w.get(cx, cy)) g.addScore(w.destroyCell(cx, cy, (px - h.x) * 4 + rnd(-100, 100), rnd(-400, -120)));
        else if (w.getBg(cx, cy) && Math.random() < 0.5) w.destroyBg(cx, cy);
      }
    });
    if ((this.snd -= dt) <= 0) { this.snd = 0.5; g.sfx("wind"); }
  }
  onEnd() {
    const g = this.g, h = this.h, R = 26 * this.k + 30;
    g.eachEnemy(h.x, h.y - 30 * this.k, R + 40 * this.k, (e) => e.hurt(6 * this.k, (e.x >= h.x ? 1 : -1) * (300 + 120 * this.k), -300 - 80 * this.k));
  }
}

/** Right click: a stone spike rams up out of the ground under the aim, just tall enough for its point to hit
 *  the spot aimed at (up to a limit when aiming high into the air). */
const SPIKE_MIN = 22, SPIKE_MAX = 210;
class Spike extends Power {
  constructor(g, ax, ay) {
    const w = g.world, gy = w.solidPx(ax, ay) ? w.surfaceY(ax, ay - 400) : w.surfaceY(ax, ay);
    const H = Math.max(SPIKE_MIN, Math.min(SPIKE_MAX, gy - ay));
    super(g, new ScaledFx(earthSpike, { x: ax, y: gy, height: H, pad: Math.max(0, H - 50) }));
    Object.assign(this, { x: ax, y: gy, H, hit: false });
    g.sfx("rumble"); g.sfx("crash", 0.5);
  }
  step() {
    if (this.hit || this.t < 0.36) return;
    this.hit = true;
    const g = this.g, w = g.world, x = this.x, top = this.y - this.H;
    for (let y = this.y + 4; y > top; y -= 9) g.addScore(w.explode(x + rnd(-2, 2), y, 8 + (y - top) * 0.04, 8, { fire: 0, debris: 6, kick: 1.4 }));
    for (const e of g.enemies) if (live(e) && Math.abs(e.x - x) < 14 + e.hw + (e.y - top) * 0.08 && e.y > top - 6 && e.y - e.h < this.y + 4) e.hurt(55, (e.x - x) * 8, -700);
    g.shake(6); g.sfx("boom", 1);
  }
}

export function upgradeTornado(TW) {
  return {
    name: TW.name, col: TW.col, cd: TW.cd, altCd: 0.5,
    tap: TW.fire,
    hold(g, h, ax, ay, t) { held(g, "leaves", () => new LeafStorm(g, h)).grow(t); },
    release(g) { g.held?.leaves?.end(); },
    alt(g, h, ax, ay) { g.shots.push(new Spike(g, ax, ay)); },
  };
}

// ================================================================================================= MJOLNIR, RIGHT CLICK

// the charge-up effect, made long enough to hold as long as we like (we let it go ourselves)
const CHARGE_T = 3, longCharge = { meta: { ...chargeUp.meta, duration: 99 }, create: chargeUp.create };
class ThorCharge {
  constructor(g, h) { Object.assign(this, { g, h, t: 0, k: 1, done: false }); this.s = new ScaledFx(longCharge, { charge: CHARGE_T + 0.4, pad: 60 }); }
  follow(ax, ay, t) {
    const h = this.h, [mx, my] = h.muzzle(ax, ay);
    this.t = t; this.k = 0.8 + 2.4 * clamp01(t / CHARGE_T);
    this.s.sx = this.s.sy = this.k; this.s.flip = ax < h.x; this.s.angle = 0;
    this.s.pin(15, -21, mx, my);
    this.mx = mx; this.my = my;
    if (Math.random() < 0.2) this.g.sfx("laser");
    if (t > 1.5) this.g.shake(0.4 + t * 0.3);
  }
  update(dt) { this.s.update(dt); return !this.done; }
  draw(f) { this.s.draw(f); }
  /** Let go: it bursts, with bolts out to everyone in reach, the bigger the longer it was held. */
  release() {
    const g = this.g, k = this.k, p = clamp01(this.t / CHARGE_T), x = this.mx, y = this.my;
    this.done = true;
    const burst = new ScaledFx(chargeUp, { charge: 0.02, pad: 60, sx: k });
    burst.flip = this.s.flip; burst.pin(15, -21, x, y);
    g.shots.push({ update: (dt) => { burst.update(dt); return !burst.done(); }, draw: (f) => burst.draw(f) });
    const R = 50 + 160 * p, arcs = [];
    g.eachEnemy(x, y, R, (e) => { if (!live(e)) return; arcs.push(new Arc(x, y, e.x, mid(e), 0.4 + 0.5 * p, 0.3)); e.hurt(15 + 90 * p, (e.x - x) * 3, -200 - 300 * p); });
    for (let i = 0; i < 6 + 8 * p; i++) { const a = rnd(0, TAU), L = R * rnd(0.4, 0.9); arcs.push(new Arc(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, 0.3 + 0.4 * p, 0.25)); }
    g.shots.push({ update: (dt) => (arcs.splice(0, arcs.length, ...arcs.filter((a) => a.update(dt))), arcs.length > 0), draw: (f) => { const pt = painterFor(f); pt.place(0, 0); for (const a of arcs) a.draw(pt); } });
    if (p > 0.3) g.blast(x, y, 20 + 50 * p, 6 + 8 * p, { kind: "none", fire: 0.4, quiet: true });
    g.flash = Math.max(g.flash, 0.15 + 0.5 * p); g.shake(3 + 9 * p); g.sfx("thunder");
  }
}

export function addThorAlt(M) {
  M.altHold = (g, h, ax, ay, t) => {
    if (t < 0) return;
    if (!g.thorAlt || g.thorAlt.done) { g.thorAlt = new ThorCharge(g, h); g.shots.push(g.thorAlt); }
    g.thorAlt.follow(ax, ay, t);
    if (t >= CHARGE_T) { g.thorAlt.release(); g.altT = -999; } // full: it goes off by itself
  };
  M.altRelease = (g) => { if (g.thorAlt && !g.thorAlt.done) g.thorAlt.release(); };
  return M;
}

// ================================================================================================= THE MOON

/** The ultimate: the hero rises, pulls a burning moon down out of the sky, holds it over his head with both
 *  hands, and hurls it at the aim. The circle on the ground shows where it will land and how far it will reach. */
export const MOON_R = 280;
export class Moon {
  constructor(g, h, tx, ty) {
    const v = view(g);
    Object.assign(this, { g, h, tx, ty, t: 0, phase: 0, x: h.x + rnd(-40, 40), y: v.t - 120, vx: 0, vy: 0, k: 2.2 });
    this.s = new ScaledFx(fireball, { radius: 9, sx: this.k, speed: 160, pad: 20 });
    if (h.onGround) { h.vy = -420; h.onGround = false; }
    h.fly = true;
    g.sfx("void"); g.sfx("rumble"); g.say("MOONFALL!", 0xff3c8cff);
  }
  hands() { return [this.h.x, this.h.y - 62 - 7 * this.k]; }
  update(dt) {
    const g = this.g, h = this.h;
    this.t += dt; this.s.update(dt);
    if (this.phase < 2) { h.lift = 0.1; h.vx *= 0.9; if (this.t > 0.25) { h.vy *= 0.85; } }
    if (this.phase === 0) {
      // pulled down out of the sky into his hands
      const [hx, hy] = this.hands(), u = clamp01(this.t / 1.4), e = u * u * (3 - 2 * u);
      this.x += (hx - this.x) * Math.min(1, dt * (2 + e * 10)); this.y += (hy - this.y) * Math.min(1, dt * (2 + e * 10));
      this.k = 2.2 + u * 1.6;
      this.s.aim(Math.PI / 2);
      g.shake(1 + u * 2);
      if (u >= 1) { this.phase = 1; this.t = 0; g.sfx("thud"); }
    } else if (this.phase === 1) {
      const [hx, hy] = this.hands();
      this.x = hx; this.y = hy;
      this.s.aim(Math.atan2(this.ty - this.y, this.tx - this.x));
      if (this.t > 0.5) { this.phase = 2; this.t = 0; const a = Math.atan2(this.ty - this.y, this.tx - this.x); this.vx = Math.cos(a) * 200; this.vy = Math.sin(a) * 200; g.sfx("dive"); h.vy = -150; }
    } else {
      // thrown: it accelerates down onto the mark like a meteor
      const a = Math.atan2(this.ty - this.y, this.tx - this.x), sp = Math.hypot(this.vx, this.vy) + 1800 * dt;
      this.vx = Math.cos(a) * sp; this.vy = Math.sin(a) * sp;
      const step = sp * dt, d = Math.hypot(this.tx - this.x, this.ty - this.y);
      this.s.aim(a);
      if (d <= step + 6 || (this.t > 0.1 && g.world.solidPx(this.x, this.y))) { this.impact(); return false; }
      this.x += this.vx * dt; this.y += this.vy * dt;
      for (let i = 0; i < 3; i++) g.parts.spawn(i ? PT.FLAME : PT.SMOKE, this.x + rnd(-8, 8), this.y + rnd(-8, 8), -this.vx * 0.1, -this.vy * 0.1, rnd(0.4, 0.9), 0xff383038, i ? 4 : 7);
      g.shake(3);
    }
    this.s.sx = this.s.sy = this.k; this.s.x = this.x; this.s.y = this.y;
    g.flashLight(this.x, this.y, 60 + this.k * 20, 0xff2080ff, 0.8, 0.06);
    return true;
  }
  impact() { this.g.moonImpact(this.tx, this.ty); }
  draw(f) {
    this.s.draw(f);
    // the mark: a pulsing ring the size of the blast, on the ground under the aim
    const p = painterFor(f); p.place(0, 0);
    const pulse = 0.55 + 0.45 * Math.sin(this.g.time * 10), R = MOON_R;
    for (let i = 0; i < 64; i++) {
      if (i & 1) continue;
      const a0 = (i / 64) * TAU, a1 = ((i + 1) / 64) * TAU;
      p.line(this.tx + Math.cos(a0) * R, this.ty + Math.sin(a0) * R * 0.35, this.tx + Math.cos(a1) * R, this.ty + Math.sin(a1) * R * 0.35, 0xff3030ff, pulse);
    }
    p.ring(this.tx, this.ty, 6, 2, 0xff3030ff, pulse);
    p.line(this.tx - 10, this.ty, this.tx + 10, this.ty, 0xffffffff, pulse);
    p.line(this.tx, this.ty - 10, this.tx, this.ty + 10, 0xffffffff, pulse);
  }
}
