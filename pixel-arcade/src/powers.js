// The hero's elemental powers. He's a superhero: no guns, no launchers, everything comes out of him or out of the sky.
// Each power has up to three modes, read by main.js:
//   tap(g, h, ax, ay)          a quick left click
//   hold(g, h, ax, ay, t, dt)  every frame while the left button is held (t = seconds held)
//   release(g, h, ax, ay, t)   when a hold ends
//   alt(g, h, ax, ay)          right click
// Effects are pixelfx effects drawn through ScaledFx, so their size, length and angle follow the game, not the
// effect's own fixed frame.
import { ScaledFx } from "./scaled.js";
import { painterFor } from "../vendor/pixelfx/src/core/index.js";
import { PT } from "./particles.js";
import { CELL, SEA } from "./world.js";
import * as whirlpool from "../vendor/pixelfx/src/fx/water/whirlpool.js";
import * as waterOrb from "../vendor/pixelfx/src/fx/water/water-orb.js";
import * as waveCrash from "../vendor/pixelfx/src/fx/water/wave-crash.js";
import * as frostBreath from "../vendor/pixelfx/src/fx/ice/frost-breath.js";
import * as blizzardVortex from "../vendor/pixelfx/src/fx/ice/blizzard-vortex.js";
import * as icicleFall from "../vendor/pixelfx/src/fx/ice/icicle-fall.js";
import * as starFall from "../vendor/pixelfx/src/fx/arcane/star-fall.js";
import * as spellCharge from "../vendor/pixelfx/src/fx/arcane/spell-charge.js";
import * as arcaneBeam from "../vendor/pixelfx/src/fx/arcane/arcane-beam.js";
import * as arcaneMissiles from "../vendor/pixelfx/src/fx/arcane/arcane-missiles.js";
import * as fireBreath from "../vendor/pixelfx/src/fx/fire/fire-breath.js";
import * as fireball from "../vendor/pixelfx/src/fx/fire/fireball.js";
import * as fireTornado from "../vendor/pixelfx/src/fx/fire/fire-tornado.js";
import * as healFx from "../vendor/pixelfx/src/fx/holy/heal-aoe.js";
import * as sunburst from "../vendor/pixelfx/src/fx/holy/sunburst.js";
import * as holyPillar from "../vendor/pixelfx/src/fx/holy/holy-pillar.js";

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const TAU = Math.PI * 2;
/** The floor under (x, y), or y itself if it's already in something solid. */
const ground = (g, x, y) => (g.world.solidPx(x, y) ? y : g.world.surfaceY(x, y));
/** What the camera sees, in world pixels. */
const view = (g) => { const W = g.frame.w, H = g.frame.h; return { l: g.cam.x - W / 2, r: g.cam.x + W / 2, t: g.cam.y - H / 2, b: g.cam.y + H / 2, W, H }; };
const live = (e) => !e.dead && !e.wreck;
const mid = (e) => e.y - e.h / 2;

/** A power on screen: a scaled effect plus what it does to the world each frame. */
class Power {
  constructor(g, s) { this.g = g; this.s = s; this.t = 0; this.ending = false; }
  end() { if (!this.ending) { this.ending = true; this.s.stop(); this.onEnd?.(); } }
  update(dt) {
    this.t += dt;
    if (!this.ending) this.step(dt);
    this.s.update(dt);
    return !this.s.done();
  }
  step() {}
  draw(f) { this.s.draw(f); }
}

/** A power kept alive by holding the button: hold() refreshes it each frame, and it ends a moment after it stops. */
function held(g, key, make) {
  g.held = g.held || {};
  let p = g.held[key];
  if (!p || p.ending || !g.shots.includes(p)) { p = g.held[key] = make(); g.shots.push(p); }
  p.alive = 0.08;
  return p;
}
class HeldPower extends Power {
  update(dt) { if (!this.ending && (this.alive -= dt) <= 0) this.end(); return super.update(dt); }
}

/** Every 1/60 s step, run fn (for world damage that shouldn't depend on frame rate). */
function ticks(o, dt, fn) { for (o.tick = (o.tick || 0) + dt; o.tick > 1 / 60; o.tick -= 1 / 60) fn(); }

// ================================================================================================= WATER

/** Tap: a whirlpool where you aim. Whatever drifts into it is spun round fast, then flung off at random. */
class Whirl extends Power {
  constructor(g, x, y) {
    super(g, new ScaledFx(whirlpool, { x, y, sx: 1.6, sy: 1.3 }));
    Object.assign(this, { x, y, R: 85, caught: new Map() });
    g.sfx("wind");
  }
  fling(e) {
    const a = rnd(0, TAU), sp = rnd(650, 1000), g = this.g;
    e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp - 260;
    e.hurt(30); e.flungT = g.time + 1.2;
    this.caught.delete(e);
    g.sfx("thud");
  }
  step(dt) {
    const g = this.g, w = g.world, R = this.R;
    if (this.t > 4.5) { for (const e of [...this.caught.keys()]) this.fling(e); this.end(); return; }
    g.eachEnemy(this.x, this.y, R, (e) => {
      if (!live(e) || this.caught.has(e) || (e.flungT || 0) > g.time) return;
      this.caught.set(e, { a: Math.atan2(mid(e) - this.y, e.x - this.x), r: Math.max(12, Math.hypot(e.x - this.x, mid(e) - this.y)), t: 0 });
    });
    for (const [e, c] of this.caught) {
      if (!live(e)) { this.caught.delete(e); continue; }
      c.t += dt; c.a += dt * (8 + c.t * 10); c.r = Math.max(10, c.r - dt * 40);
      e.x = this.x + Math.cos(c.a) * c.r; e.y = this.y + Math.sin(c.a) * c.r * 0.45 + e.h / 2; e.vx = 0; e.vy = 0;
      e.hurt(0.8 * dt);
      if (c.t > rnd(0.7, 1.1)) this.fling(e);
    }
    // the world too: bits of whatever it touches are torn off and thrown out spinning
    ticks(this, dt, () => {
      for (let k = 0; k < 3; k++) {
        const a = rnd(0, TAU), d = rnd(8, R), px = this.x + Math.cos(a) * d, py = this.y + Math.sin(a) * d * 0.6;
        const cx = Math.floor(px / CELL), cy = Math.floor(py / CELL), sp = rnd(250, 600), b = a + Math.PI / 2;
        if (w.get(cx, cy)) g.addScore(w.destroyCell(cx, cy, Math.cos(b) * sp, Math.sin(b) * sp - 200));
        else if (w.getBg(cx, cy) && Math.random() < 0.4) w.destroyBg(cx, cy);
      }
      if (Math.random() < 0.5) { const a = rnd(0, TAU); g.parts.spawn(PT.DROP, this.x + Math.cos(a) * R * 0.8, this.y + Math.sin(a) * R * 0.4, -Math.sin(a) * 240, Math.cos(a) * 120 - 60, rnd(0.3, 0.7), 0xffffd890); }
    });
  }
}

/** Hold: a bubble of water that starts small and swells while held. Anyone inside floats helpless and takes damage
 *  that climbs the longer they're in. Let go and it bursts. */
const ORB_MIN = 8, ORB_MAX = 150, ORB_GROW = 62;
class Bubble extends HeldPower {
  constructor(g, x, y) {
    super(g, new ScaledFx(waterOrb, { radius: ORB_MIN, pad: ORB_MAX + 16 }));
    Object.assign(this, { x, y, r: ORB_MIN, inside: new Map() });
    this.s.pin(0, -52, x, y);
  }
  follow(ax, ay, t, dt) {
    this.r = Math.min(ORB_MAX, ORB_MIN + t * ORB_GROW);
    const k = Math.min(1, dt * 4); this.x += (ax - this.x) * k; this.y += (ay - this.y) * k;
  }
  step(dt) {
    const g = this.g, R = this.r;
    this.s.options.radius = R;
    this.s.pin(0, -52, this.x, this.y);
    for (const e of g.enemies) {
      if (!live(e)) continue;
      const d = Math.hypot(e.x - this.x, mid(e) - this.y);
      if (d > R + e.hw * 0.5) { this.inside.delete(e); continue; }
      const tin = (this.inside.get(e) || 0) + dt;
      this.inside.set(e, tin);
      // drift to the middle and float there
      e.x += (this.x - e.x) * dt * 1.6; e.y += (this.y + e.h / 2 - e.y) * dt * 1.6; e.vx *= 0.8; e.vy *= 0.8;
      e.hurt((1 + 6 * tin + 9 * tin * tin) * dt);
      if (Math.random() < 0.2) g.parts.spawn(PT.DROP, e.x + rnd(-4, 4), mid(e), rnd(-20, 20), rnd(-60, -20), 0.5, 0xffffe0b0);
    }
  }
  onEnd() {
    const g = this.g, R = this.r;
    for (const [e, tin] of this.inside) if (live(e)) e.hurt(4 + tin * 12, (e.x - this.x) * 4, -200);
    g.shots.push(new Burst(g, this.x, this.y, R));
    this.s.fx.stop = () => {}; this.s.done = () => true; // the skin is gone at once: the water is all in the burst
  }
}

/** The bubble's water thrown out all round as it pops: a ring of spray that hits whatever it reaches. */
class Burst {
  constructor(g, x, y, R) {
    Object.assign(this, { g, x, y, R0: R, r: R, t: 0, hit: new Set() });
    for (let i = 0; i < 160 + R * 2; i++) {
      const a = rnd(0, TAU), sp = rnd(160, 420) + R;
      g.parts.spawn(PT.DROP, x + Math.cos(a) * R, y + Math.sin(a) * R, Math.cos(a) * sp, Math.sin(a) * sp - 60, rnd(0.5, 1.2), i % 3 ? 0xffffe0b0 : i & 1 ? 0xffffffff : 0xffffa040, 1 + (i % 3 === 0));
    }
    g.sfx("crash", 0.6); g.sfx("glass"); g.shake(3 + R / 30);
  }
  update(dt) {
    const g = this.g, w = g.world;
    this.t += dt;
    this.r = this.R0 + (140 + this.R0) * Math.min(1, this.t / 0.45);
    for (const e of g.enemies) {
      if (!live(e) || this.hit.has(e)) continue;
      const d = Math.hypot(e.x - this.x, mid(e) - this.y);
      if (d < this.r + e.hw) { this.hit.add(e); e.hurt(18 + this.R0 * 0.2, ((e.x - this.x) / (d + 1)) * 500, -250); }
    }
    for (let k = 0; k < 6; k++) {
      const a = rnd(0, TAU), cx = Math.floor((this.x + Math.cos(a) * this.r) / CELL), cy = Math.floor((this.y + Math.sin(a) * this.r) / CELL);
      if (w.get(cx, cy) && Math.random() < 0.5) g.addScore(w.destroyCell(cx, cy, Math.cos(a) * 200, Math.sin(a) * 200 - 100));
    }
    return this.t < 0.45;
  }
  draw(f) {
    const p = painterFor(f); p.place(0, 0);
    const k = 1 - this.t / 0.45;
    p.ring(this.x, this.y, this.r, 2, 0xffffe0b0, k);
    p.ring(this.x, this.y, this.r - 3, 1, 0xffffffff, k * 0.8);
    p.glowRing(this.x, this.y, this.r, 6, 0xffffa040, 0.3 * k);
  }
}

/** Right click: a tsunami. It rises at the far edge of the screen, rolls the whole width at 80% of its height, and
 *  breaks exactly where you aimed, sweeping up everything in its path. */
const CRASH = 1.2, inOutSine = (x) => -(Math.cos(Math.PI * x) - 1) / 2, outCubic = (x) => 1 - (1 - x) ** 3;
const crestX = (t) => (t < CRASH ? -80 + 72 * inOutSine(t / CRASH) : -8 + 30 * outCubic(clamp01((t - CRASH) / 1.4)));
const crestH = (t) => (t < CRASH ? 5 + 33 * inOutSine(clamp01(t / (CRASH * 0.92))) : 38 * (1 - outCubic(clamp01((t - CRASH) / 0.45))) + 5 * (1 - clamp01((t - CRASH) / 1.6)));
class Tsunami extends Power {
  constructor(g, ax, ay) {
    const v = view(g), dir = ax >= g.cam.x ? 1 : -1, edge = dir > 0 ? v.l - 10 : v.r + 10, gy = ground(g, ax, ay);
    const sx = Math.max(1.5, Math.abs(ax - edge) / 132), sy = (v.H * 0.8) / 48;
    const w = g.world, floor = (wx) => { const cx = Math.floor(wx / CELL), y = w.surfaceY(wx, gy - 160); return w.wet(cx) ? Math.min(SEA * CELL, y) : y; };
    super(g, new ScaledFx(waveCrash, { x: ax - dir * 22 * sx, y: gy, sx, sy, flip: dir < 0, clipY: 0.5, ground: floor }));
    this.floor = floor;
    Object.assign(this, { dir, ax, gy, sx, sy, crashed: false });
    g.sfx("wind"); g.sfx("rumble");
  }
  step(dt) {
    const g = this.g, w = g.world, t = this.t, dir = this.dir, s = this.s;
    const front = crestX(t) + 14, hgt = crestH(t) * this.sy + 10;
    const fx = s.x + dir * front * this.sx, bx = s.x + dir * (front - 50) * this.sx, top = this.gy - hgt;
    const lo = Math.min(fx, bx), hi = Math.max(fx, bx), fy = this.floor(fx);
    // everything the water reaches is swept along with it
    for (const e of g.enemies) {
      if (!live(e) || e.x < lo || e.x > hi || e.y < this.floor(e.x) - hgt) continue;
      e.vx = dir * rnd(600, 900); e.vy = -rnd(150, 350); e.hurt(30 * dt);
    }
    ticks(this, dt, () => {
      for (let k = 0; k < 12; k++) {
        const px = fx - dir * rnd(0, 30 * this.sx), py = this.floor(px) - rnd(0, hgt), cx = Math.floor(px / CELL), cy = Math.floor(py / CELL);
        if (w.get(cx, cy)) g.addScore(w.destroyCell(cx, cy, dir * rnd(200, 600), -rnd(50, 300)));
        else if (w.getBg(cx, cy)) w.destroyBg(cx, cy);
      }
      for (let k = 0; k < 3; k++) g.parts.spawn(PT.DROP, fx + rnd(-10, 10), fy - hgt + rnd(0, 20), dir * rnd(100, 400), -rnd(100, 400), rnd(0.4, 1), k & 1 ? 0xffffffff : 0xffffd890);
    });
    if (t > 0.3) g.shake(t < CRASH ? 2 : 1);
    if (!this.crashed && t >= CRASH) {
      this.crashed = true;
      const x = this.ax, y = this.gy;
      g.addScore(w.explode(x, y - 12, 56, 13, { fire: 0, clean: true, kick: 1.7, debris: 60 }));
      g.eachEnemy(x, y - 20, 90, (e) => e.hurt(80, dir * 700, -500));
      for (let i = 0; i < 160; i++) g.parts.spawn(PT.DROP, x + rnd(-50, 50), y - rnd(0, 30), rnd(-300, 300) + dir * 200, -rnd(200, 700), rnd(0.6, 1.6), i & 1 ? 0xffffffff : 0xffffc070);
      g.shake(12); g.flash = Math.max(g.flash, 0.25); g.sfx("crash", 2); g.sfx("bigboom");
    }
  }
}

// ================================================================================================= ICE + FIRE BREATH

/** Hold: a breath from the mouth to wherever you aim, as long as it needs to be: it reaches out across the screen
 *  until it hits something and keeps eating into that. */
const BREATH_MAX = 620;
class Breath extends HeldPower {
  constructor(g, h, kind) {
    const mod = kind === "fire" ? fireBreath : frostBreath;
    super(g, new ScaledFx(mod, { sx: 0.1 }));
    Object.assign(this, { h, kind, len: 0, L0: kind === "fire" ? 148 : 172, snd: 0 });
  }
  aimAt(ax, ay) { this.ax = ax; this.ay = ay; }
  step(dt) {
    const g = this.g, w = g.world, h = this.h, fire = this.kind === "fire";
    if (h.dead > 0) return this.end();
    const [mx, my] = h.eyes(), a = Math.atan2(this.ay - my, this.ax - mx), c = Math.cos(a), s = Math.sin(a);
    const hit = w.raycast(mx + c * 3, my + s * 3, c, s, BREATH_MAX);
    const want = Math.max(30, hit.d + 6);
    this.len = Math.min(want, this.len + 1100 * dt);
    const sc = this.len / this.L0, wide = 0.9 + 0.9 * clamp01(this.len / 360);
    this.s.sx = sc; this.s.sy = wide; this.s.aim(a); this.s.x = mx; this.s.y = my;
    const spread = 0.22 * wide;
    for (const e of g.enemies) {
      if (!live(e)) continue;
      const dx = e.x - mx, dy = mid(e) - my, u = dx * c + dy * s;
      if (u < 0 || u > this.len + e.hw) continue;
      if (Math.abs(dx * s - dy * c) > 6 + u * spread + e.hw) continue;
      if (fire) { e.hurt(45 * dt, c * 30, s * 30 - 10); if (Math.random() < 0.3) g.parts.spawn(PT.FLAME, e.x + rnd(-4, 4), mid(e), rnd(-20, 20), -40, 0.4, 0, 2); }
      else { e.hurt(35 * dt, c * 20, s * 20); e.vx *= 0.9; if (Math.random() < 0.3) g.parts.spawn(PT.SPARK, e.x + rnd(-4, 4), mid(e), rnd(-30, 30), rnd(-30, 10), 0.5, 0xfffff0c8); }
    }
    ticks(this, dt, () => {
      if (hit.hit && this.len >= hit.d) {
        if (Math.random() < 0.5) g.addScore(w.explode(hit.x + c * 3, hit.y + s * 3, fire ? 9 : 8, 6, { fire: fire ? 0.8 : 0, clean: !fire, debris: 4 }));
      }
      // the spray widens near its end and catches what's round the edges too
      const u = this.len * rnd(0.4, 1), q = rnd(-1, 1) * u * spread * 0.7, px = mx + c * u - s * q, py = my + s * u + c * q;
      const cx = Math.floor(px / CELL), cy = Math.floor(py / CELL);
      if (w.get(cx, cy) && Math.random() < 0.5) g.addScore(w.destroyCell(cx, cy, c * 120, s * 120 - 60));
      else if (w.getBg(cx, cy) && Math.random() < 0.3) w.destroyBg(cx, cy);
    });
    if ((this.snd -= dt) <= 0) { this.snd = 0.3; g.sfx(fire ? "rocket" : "wind"); }
    g.flashLight(mx + c * this.len * 0.5, my + s * this.len * 0.5, 30 + this.len * 0.2, fire ? 0xff2080ff : 0xffffc080, 0.25, 0.08);
  }
}

/** Tap: an icicle forms at the very top of the screen above the aim, drops, and shatters on the spot aimed at. */
const ICE_SC = 1.4, ICE_IMPACT = 0.64 + Math.sqrt((2 * 44) / 950);
class Icicle {
  constructor(g, ax, ay) {
    const w = g.world, y = w.solidPx(ax, ay) ? ay : w.surfaceY(ax, ay);
    Object.assign(this, { g, x: ax, gy: y, y: view(g).t + 4, vy: 60, t: 0, s: null, form: 0.25 });
    g.sfx("ice");
  }
  update(dt) {
    const g = this.g;
    this.t += dt;
    if (this.s) { this.s.update(dt); return !this.s.done(); }
    if (this.t < this.form) return true; // it grows out of the sky first
    this.vy += 1500 * dt; this.y += this.vy * dt;
    const e = g.enemyAt(this.x, this.y, 4);
    if (this.y >= this.gy || e) {
      const y = e ? this.y : this.gy;
      // the shatter: the icicle effect, jumped to the moment it hits the floor
      this.s = new ScaledFx(icicleFall, { x: this.x, y, sx: ICE_SC });
      this.s.update(ICE_IMPACT);
      g.addScore(g.world.explode(this.x, y - 6, 16, 8, { fire: 0, clean: true, kick: 1.3, debris: 10 }));
      g.eachEnemy(this.x, y - 12, 26, (q) => q.hurt(35, (q.x - this.x) * 8, -220));
      g.shake(3); g.sfx("glass");
    }
    return true;
  }
  draw(f) {
    if (this.s) return this.s.draw(f);
    const p = painterFor(f); p.place(0, 0);
    const L = 34 * Math.min(1, this.t / this.form + 0.15), W = 6, top = this.y - L;
    for (let i = 0; i < L; i++) {
      const u = i / L, hw = W * (1 - u) + 0.6, y = top + i;
      p.line(this.x - hw, y, this.x + hw, y, u > 0.85 ? 0xffffffff : 0xfff4c862);
      p.px(this.x - hw * 0.5, y, 0xffffffff);
      p.px(this.x + hw, y, 0xffa86a2c);
    }
    p.glow(this.x, this.y - 6, 14, 0xffffd8a0, 0.5);
  }
}

/** Right click: a blizzard vortex at the aim that crawls forward, sucking in and freezing what it catches. */
class Blizzard extends Power {
  constructor(g, h, ax, ay) {
    const y = ground(g, ax, ay);
    super(g, new ScaledFx(blizzardVortex, { x: ax, y, sx: 1.7, clipY: 0.5 }));
    this.s.ground = (wx) => g.world.surfaceY(wx, this.y - 60);
    Object.assign(this, { x: ax, y, dir: ax >= h.x ? 1 : -1 });
    g.sfx("wind"); g.sfx("ice");
  }
  step(dt) {
    const g = this.g, w = g.world, s = this.s;
    if (this.t > 5.5) return this.end();
    this.x += this.dir * 45 * dt;
    const gy = w.surfaceY(this.x, this.y - 60);
    this.y += Math.max(-80 * dt, Math.min(160 * dt, gy - this.y));
    s.x = this.x; s.y = this.y;
    g.eachEnemy(this.x, this.y - 70, 90, (e) => { e.vx += (this.x - e.x) * 5 * dt; e.vy -= 1500 * dt; e.vx *= 0.97; e.hurt(14 * dt); });
    ticks(this, dt, () => {
      for (let k = 0; k < 4; k++) {
        const hgt = rnd(0, 1), px = this.x + rnd(-1, 1) * (14 + hgt * 40), py = this.y - hgt * 140, cx = Math.floor(px / CELL), cy = Math.floor(py / CELL);
        if (w.get(cx, cy)) g.addScore(w.destroyCell(cx, cy, (this.x - px) * 5 + rnd(-140, 140), rnd(-480, -150)));
        else if (w.getBg(cx, cy) && Math.random() < 0.5) w.destroyBg(cx, cy);
      }
    });
    if (Math.random() < 0.3) g.sfx("rumble");
  }
}

// ================================================================================================= ARCANE

/** Tap: a volley of arcane missiles from the hand onto the enemy nearest the aim (or the spot itself). */
const MIS_HITS = [0.77, 0.85, 0.95, 1.08, 1.2];
class Missiles extends Power {
  constructor(g, h, ax, ay) {
    let target = null, bd = 90;
    for (const e of g.enemies) { if (!live(e)) continue; const d = Math.hypot(e.x - ax, mid(e) - ay); if (d < bd) { bd = d; target = e; } }
    const tx = target ? target.x : ax, ty = target ? mid(target) : ay;
    const [mx, my] = h.muzzle(tx, ty), a = Math.atan2(ty - my, tx - mx), dist = Math.max(30, Math.hypot(tx - mx, ty - my));
    const sx = dist / 137, s = new ScaledFx(arcaneMissiles, { sx, sy: Math.max(0.8, Math.min(1.6, sx)) });
    s.aim(a); s.pin(15, -24, mx, my);
    super(g, s);
    Object.assign(this, { target, tx, ty, n: 0 });
    g.sfx("laser");
  }
  step() {
    const g = this.g;
    while (this.n < MIS_HITS.length && this.t >= MIS_HITS[this.n]) {
      const last = this.n === MIS_HITS.length - 1, e = this.target;
      const x = e && live(e) ? e.x : this.tx, y = e && live(e) ? mid(e) : this.ty;
      g.addScore(g.world.explode(x, y, last ? 12 : 6, last ? 7 : 4, { fire: 0, debris: 4 }));
      g.eachEnemy(x, y, last ? 22 : 10, (q) => q.hurt(last ? 22 : 9, 0, -60));
      g.flashLight(x, y, 26, 0xffff60c0, 0.8, 0.2);
      g.sfx("pop");
      this.n++;
    }
  }
}

/** Hold: arcane power gathers in the hand, bigger the longer you hold. */
const ARC_FULL = 1.5;
class ArcCharge extends HeldPower {
  constructor(g, h) { super(g, new ScaledFx(spellCharge, {})); this.h = h; this.p = 0; }
  follow(ax, ay, t) {
    const h = this.h, p = (this.p = clamp01(t / ARC_FULL)), [mx, my] = h.muzzle(ax, ay);
    this.s.sx = this.s.sy = 0.8 + p * 1.4;
    this.s.flip = ax < h.x; this.s.angle = 0;
    this.s.pin(15, -22, mx, my);
    if (p >= 1) this.g.shake(0.6);
    if (Math.random() < 0.1 + p * 0.2) this.g.sfx("laser");
  }
}

/** On release: an arcane beam from the hand, as long as the way ahead is open, as thick and as lasting as the charge.
 *  It follows the aim while it fires. */
class ArcBeam extends Power {
  constructor(g, h, p) {
    super(g, new ScaledFx(arcaneBeam, { sx: 0.1 }));
    Object.assign(this, { h, p, life: 0.5 + 2.4 * p });
    g.sfx("beam"); g.shake(2 + p * 6);
  }
  step(dt) {
    const g = this.g, h = this.h, w = g.world, p = this.p, I = g.I;
    if (this.t > this.life || h.dead > 0) return this.end();
    const [mx, my] = h.muzzle(I.aimX, I.aimY), a = Math.atan2(I.aimY - my, I.aimX - mx), c = Math.cos(a), s = Math.sin(a);
    const hit = w.raycast(mx + c * 3, my + s * 3, c, s, 640), len = Math.max(20, hit.d + 4);
    this.s.sx = len / 168; this.s.sy = 0.7 + 1.6 * p; this.s.aim(a); this.s.pin(15, -24, mx, my);
    const rad = 6 * this.s.sy;
    g.eachEnemyOnRay(mx, my, c, s, len, rad, (e) => e.hurt((25 + 90 * p) * dt, c * 30, s * 30));
    ticks(this, dt, () => { if (hit.hit && Math.random() < 0.6) g.addScore(w.explode(hit.x + c * 3, hit.y + s * 3, 6 + 10 * p, 6 + 6 * p, { fire: 0.1, debris: 4 })); });
    g.flashLight(hit.x, hit.y, 20 + 30 * p, 0xffff60c0, 0.6, 0.08);
    if (p > 0.5) g.shake(1 + p);
  }
}

/** Right click: a long rain of stars over a wide area round the aim: several showers one after another. */
class StarFall extends Power {
  constructor(g, x, y) {
    // tall enough that the stars start above the top of the screen; either way across
    const sy = Math.max(1.5, (y - view(g).t + 20) / 150);
    super(g, new ScaledFx(starFall, { x, y, sx: 1.7, sy, flip: Math.random() < 0.5, pad: 4 }));
    this.x = x; this.y = y; this.n = 0;
  }
  step() {
    const g = this.g;
    while (this.n < 11 && this.t >= 0.42 + this.n * 0.105) {
      const x = this.x + rnd(-46, 46) * 1.7, y = g.world.surfaceY(x, this.y - 80);
      g.addScore(g.world.explode(x, y - 4, 20, 10, { fire: 0.3, debris: 14, kick: 1.3 }));
      g.eachEnemy(x, y - 10, 32, (e) => e.hurt(30, (e.x - x) * 6, -260));
      g.flashLight(x, y, 40, 0xffff60c0, 0.9, 0.25);
      g.shake(2.5); g.sfx("boom", 0.5);
      this.n++;
    }
  }
}
class StarRain {
  constructor(g, ax, ay) { Object.assign(this, { g, ax, ay: ground(g, ax, ay), t: 0, n: 0 }); }
  update(dt) {
    const g = this.g;
    this.t += dt;
    while (this.n < 7 && this.t >= this.n * 0.38) {
      const x = this.ax + (this.n === 0 ? 0 : rnd(-140, 140));
      const sf = new StarFall(g, x, g.world.surfaceY(x, this.ay - 120)); (this.falls = this.falls || []).push(sf); g.shots.push(sf);
      this.n++;
    }
    return this.n < 7 || this.falls.some((f) => g.shots.includes(f));
  }
  draw() {}
}

// ================================================================================================= FIRE

/** Right click: a small meteor thrown slantwise out of the sky at the aim. If the aim is open air it carries on
 *  until it hits the ground, a wall or an enemy. */
class Meteorite {
  constructor(g, h, ax, ay) {
    const v = view(g), dir = Math.random() < 0.5 ? 1 : -1, sx = ax - dir * rnd(150, 260), sy = v.t - 30;
    const a = Math.atan2(ay - sy, ax - sx);
    Object.assign(this, { g, x: sx, y: sy, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, life: 3, t: 0, k: rnd(1.6, 4.2) });
    this.s = new ScaledFx(fireball, { radius: 5, sx: this.k * 0.6, speed: 160, pad: 10 }); this.s.aim(a);
    g.sfx("dive");
  }
  update(dt) {
    const g = this.g, w = g.world;
    this.t += dt;
    const d = Math.hypot(this.vx, this.vy) * dt, n = Math.max(1, Math.ceil(d / 3));
    let hit = false;
    for (let i = 0; i < n && !hit; i++) {
      this.x += (this.vx * dt) / n; this.y += (this.vy * dt) / n;
      if (this.t > 0.05 && (w.solidPx(this.x, this.y) || g.enemyAt(this.x, this.y, 3 + this.k * 2))) hit = true;
    }
    this.s.update(dt); this.s.x = this.x; this.s.y = this.y;
    for (let i = 0; i < 2; i++) g.parts.spawn(PT.FLAME, this.x + rnd(-2, 2) * this.k, this.y + rnd(-2, 2) * this.k, -this.vx * 0.15 + rnd(-20, 20), -this.vy * 0.15 + rnd(-20, 20), rnd(0.2, 0.4), 0, 3);
    if (Math.random() < 0.4) g.parts.spawn(PT.SMOKE, this.x, this.y, -this.vx * 0.05, -this.vy * 0.05 - 10, 0.6, 0xff504850, 3);
    g.flashLight(this.x, this.y, 12 + this.k * 8, 0xff2080ff, 0.6, 0.06);
    if (hit || (this.life -= dt) <= 0 || this.y > g.cam.y + 400) {
      if (hit) { const k = this.k; g.blast(this.x, this.y, 12 + k * 10, 6 + k * 2, { kind: k > 3 ? "big" : "small", size: 0.5 + k * 0.3, fire: 0.9 }); g.shake(2 + k * 2); }
      return false;
    }
    return true;
  }
  draw(f) { this.s.draw(f); }
}

/** Tap: a big fire tornado that walks off the way you aimed, burning and tearing up what it crosses. */
class FireTwister extends Power {
  constructor(g, h, ax, ay) {
    const y = ground(g, ax, ay);
    super(g, new ScaledFx(fireTornado, { x: ax, y, sx: 1.9, sy: 2 }));
    Object.assign(this, { x: ax, y, dir: ax >= h.x ? 1 : -1, burn: 0 });
    g.sfx("wind"); g.sfx("rocket");
  }
  step(dt) {
    const g = this.g, w = g.world, s = this.s;
    if (this.t > 6) return this.end();
    this.x += this.dir * 70 * dt;
    const gy = w.surfaceY(this.x, this.y - 60);
    this.y += Math.max(-80 * dt, Math.min(160 * dt, gy - this.y));
    s.x = this.x; s.y = this.y;
    g.eachEnemy(this.x, this.y - 120, 120, (e) => { if (Math.abs(e.x - this.x) < 50) { e.vx += (this.x - e.x) * 6 * dt + this.dir * 150 * dt; e.vy -= 1900 * dt; e.hurt(22 * dt); if (Math.random() < 0.2) g.parts.spawn(PT.FLAME, e.x, mid(e), 0, -40, 0.4, 0, 2); } });
    ticks(this, dt, () => {
      for (let k = 0; k < 6; k++) {
        const hgt = rnd(0, 1), px = this.x + rnd(-1, 1) * (14 + hgt * 44), py = this.y + 6 - hgt * 260, cx = Math.floor(px / CELL), cy = Math.floor(py / CELL);
        if (w.get(cx, cy)) g.addScore(w.destroyCell(cx, cy, (this.x - px) * 6 + this.dir * 120 + rnd(-160, 160), rnd(-520, -160)));
        else if (w.getBg(cx, cy) && Math.random() < 0.6) w.destroyBg(cx, cy);
      }
    });
    if ((this.burn += dt) > 0.12) { this.burn = 0; g.addScore(w.explode(this.x + rnd(-20, 20), this.y - rnd(0, 120), 7, 4, { fire: 0.9, debris: 2 })); }
    g.flashLight(this.x, this.y - 100, 120, 0xff2080ff, 0.35, 0.08);
    if (Math.random() < 0.3) g.sfx("rumble");
  }
}

// ================================================================================================= HOLY

/** Tap: a burst of healing light on the hero; the flash of it burns enemies close by. */
class Heal extends Power {
  constructor(g, h) {
    super(g, new ScaledFx(healFx, { x: h.x, y: h.y, sx: 1.1 }));
    this.h = h;
    h.hp = Math.min(100, h.hp + 25);
    g.eachEnemy(h.x, h.cy, 95, (e) => { e.hurt(28, (e.x - h.x) * 3, -150); for (let i = 0; i < 6; i++) g.parts.spawn(PT.EMBER, e.x + rnd(-4, 4), mid(e) + rnd(-8, 8), rnd(-40, 40), rnd(-80, -20), rnd(0.4, 0.9), 0xff60e0ff); });
    g.flashLight(h.x, h.cy, 95, 0xff80f0ff, 1, 0.35);
    g.sfx("ready");
  }
  step() { this.s.x = this.h.x; this.s.y = this.h.y; }
}

/** Hold: the hero shines like a sun. It heals him while held, and the light spreads wider and burns hotter. */
class Radiance extends HeldPower {
  constructor(g, h) { super(g, new ScaledFx(sunburst, { sx: 0.5 })); this.h = h; this.p = 0; this.burnT = new Map(); }
  follow(t) { this.p = clamp01(t / 2); }
  step(dt) {
    const g = this.g, h = this.h, p = this.p, sc = 0.5 + p * 1.9, R = 44 * sc;
    this.s.sx = this.s.sy = sc; this.s.x = h.x; this.s.y = h.cy;
    if (h.dead <= 0) h.hp = Math.min(100, h.hp + 14 * dt);
    g.eachEnemy(h.x, h.cy, R, (e) => {
      if (!live(e)) return;
      const tin = (this.burnT.get(e) || 0) + dt;
      this.burnT.set(e, tin);
      e.hurt((8 + 30 * p + 20 * tin) * dt);
      if (Math.random() < 0.3) g.parts.spawn(PT.EMBER, e.x + rnd(-4, 4), mid(e) + rnd(-8, 8), rnd(-30, 30), rnd(-80, -30), rnd(0.4, 0.8), 0xff60e0ff);
    });
    g.flashLight(h.x, h.cy, R * 1.4, 0xff80f0ff, 0.4 + p * 0.4, 0.08);
  }
}

/** Right click: a pillar of light from the top of the screen down to the aim. It fits whatever height that is,
 *  widens as it burns and digs deeper the longer it lasts. */
class SkyBeam extends Power {
  constructor(g, ax, ay) {
    const v = view(g), y = ground(g, ax, ay), top = v.t - 30;
    const s = new ScaledFx(holyPillar, { x: ax, y, sx: 1.3, sy: Math.max(0.5, (y - top) / 204) });
    super(g, s);
    Object.assign(this, { x: ax, y, top, k: -1, w: 0, depth: y });
    g.sfx("beam");
  }
  step(dt) {
    const g = this.g, w = g.world;
    if (this.t < 0.5) return;
    const k = Math.floor((this.t - 0.5) / 0.06);
    this.w = Math.min(30, 5 + (this.t - 0.5) * 22);
    while (this.k < k && this.k < 15) {
      this.k++;
      if (this.k === 0) g.sfx("bigboom");
      this.depth = this.y + 26 + this.k * 8;
      for (let yy = this.top + 20; yy < this.depth; yy += 13) g.addScore(w.explode(this.x + rnd(-2, 2), yy, this.w * 0.8 + 6, 12, { fire: 0.3, debris: 3 }));
      g.eachEnemy(this.x, (this.top + this.depth) / 2, (this.depth - this.top) / 2 + 20, (e) => { if (Math.abs(e.x - this.x) < this.w + e.hw) e.hurt(22); });
      g.shake(2.5);
    }
    if (this.k >= 15 && this.t > 2.6) this.end();
  }
  draw(f) {
    super.draw(f);
    if (this.t < 0.5 || this.ending) return;
    const g = this.g, x = Math.round(this.x - this.w / 2) - f.ox, x2 = x + Math.round(this.w), y0 = Math.max(0, Math.round(this.top) - f.oy), y1 = Math.min(f.h, Math.round(this.depth) - f.oy);
    for (let y = y0; y < y1; y++) for (let X = Math.max(0, x); X < Math.min(f.w, x2); X++) {
      const q = Math.abs(X - (x + x2) / 2) / (this.w / 2);
      f.color[y * f.w + X] = q < 0.5 ? 0xffffffff : 0xffa0f0ff;
    }
    for (let y = this.top; y < this.depth; y += 24) g.flashLight(this.x, y, this.w * 1.5 + 10, 0xffa0f0ff, 0.25, 0.05);
  }
}

// ================================================================================================= THE HOTBAR

export const AQUA = {
  name: "AQUA", col: 0xffffa040, cd: 1.0, altCd: 3,
  tap(g, h, ax, ay) { g.shots.push(new Whirl(g, ax, ay)); },
  hold(g, h, ax, ay, t, dt) { held(g, "bubble", () => new Bubble(g, ax, ay)).follow(ax, ay, t, dt); },
  release(g) { g.held?.bubble?.end(); },
  alt(g, h, ax, ay) { g.shots.push(new Tsunami(g, ax, ay)); },
};
export const FROST = {
  name: "FROST", col: 0xfffff0a0, cd: 0.15, altCd: 2,
  tap(g, h, ax, ay) { g.shots.push(new Icicle(g, ax, ay)); },
  hold(g, h, ax, ay) { held(g, "frost", () => new Breath(g, h, "frost")).aimAt(ax, ay); },
  release(g) { g.held?.frost?.end(); },
  alt(g, h, ax, ay) { g.shots.push(new Blizzard(g, h, ax, ay)); },
};
export const ARCANE = {
  name: "ARCANE", col: 0xffff60c0, cd: 0.45, altCd: 1.4,
  tap(g, h, ax, ay) { g.shots.push(new Missiles(g, h, ax, ay)); },
  hold(g, h, ax, ay, t) { held(g, "arc", () => new ArcCharge(g, h)).follow(ax, ay, t); },
  release(g, h) { const c = g.held?.arc; if (!c) return; const p = c.p; c.end(); g.held.arc = null; g.shots.push(new ArcBeam(g, h, p)); },
  alt(g, h, ax, ay) { g.shots.push(new StarRain(g, ax, ay)); },
};
export const INFERNO = {
  name: "INFERNO", col: 0xff2a6aff, cd: 1.4, altCd: 0.2,
  tap(g, h, ax, ay) { g.shots.push(new FireTwister(g, h, ax, ay)); },
  hold(g, h, ax, ay) { held(g, "fire", () => new Breath(g, h, "fire")).aimAt(ax, ay); },
  release(g) { g.held?.fire?.end(); },
  alt(g, h, ax, ay) { g.shots.push(new Meteorite(g, h, ax, ay)); },
};
export const RADIANCE = {
  name: "RADIANCE", col: 0xff80f0ff, cd: 0.7, altCd: 1.3,
  tap(g, h) { g.shots.push(new Heal(g, h)); },
  hold(g, h, ax, ay, t) { held(g, "sun", () => new Radiance(g, h)).follow(t); },
  release(g) { g.held?.sun?.end(); },
  alt(g, h, ax, ay) { g.shots.push(new SkyBeam(g, ax, ay)); },
};
export const EMPTY = { name: "EMPTY", col: 0xff505050, cd: 0, empty: true };
