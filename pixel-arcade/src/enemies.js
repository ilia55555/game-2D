// The army that shows up when the city starts falling down: soldiers, tanks, helicopters. And parked cars.
import { posed, hex, mix } from "../vendor/pixelfx/src/core/index.js";
import { moveBody, boxHits, dressWith } from "./hero.js";
import { CELL, WH, LAVA } from "./world.js";
import { PT } from "./particles.js";

const INK = hex("#0e0c14");
const olive = dressWith((c, row, col, t) => c === INK ? hex("#0c120c") : c === hex("#f53cd1") ? hex("#ff4030") : row <= 2 ? mix(hex("#1c2a18"), hex("#5a7a48"), t) : row <= 6 ? mix(hex("#6a4a38"), hex("#e8b890"), t) : row >= 33 ? mix(hex("#100c0c"), hex("#3a3030"), t) : mix(hex("#2a3420"), hex("#8a9a5a"), t));
export function drawPosed(frame, x, y, face, pose, dress, flash, S = 1) {
  const C = frame.color, W = frame.w, H = frame.h, r = posed(pose), BX = Math.round(x) - frame.ox, BY = Math.round(y) - frame.oy;
  if (BX < -40 || BX > W + 40 || BY < -10 || BY > H + 60) return;
  for (let i = 0; i < r.n; i++) {
    const sx = Math.floor(r.xs[i] * S), sy = Math.floor(r.ys[i] * S);
    const px = face < 0 ? BX - sx - 1 : BX + sx, py = BY + sy;
    if (px >= 0 && py >= 0 && px < W && py < H) C[py * W + px] = flash ? 0xffffffff : dress(r.color[i], r.src[i]);
  }
}
const rect = (f, x, y, w, h, c) => {
  x = Math.round(x) - f.ox; y = Math.round(y) - f.oy;
  const x1 = Math.min(f.w, x + w), y1 = Math.min(f.h, y + h);
  for (let yy = Math.max(0, y); yy < y1; yy++) for (let xx = Math.max(0, x); xx < x1; xx++) f.color[yy * f.w + xx] = c;
};
const line = (f, x0, y0, x1, y1, c) => {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n) - f.ox, y = Math.round(y0 + (y1 - y0) * i / n) - f.oy; if (x >= 0 && y >= 0 && x < f.w && y < f.h) f.color[y * f.w + x] = c; }
};
export { rect as fillRect, line as drawLine };
/** Drawing helpers in a vehicle's own units, scaled up round its anchor (x, y) so it has a real size. */
const kit = (f, x, y, S, s = 1) => ({
  R: (dx, dy, w, h, c) => rect(f, x + Math.floor(dx * S), y + Math.floor(dy * S), Math.max(1, Math.round(w * S)), Math.max(1, Math.round(h * S)), c),
  L: (x0, y0, x1, y1, c, wd = 1) => { for (let k = 0; k < Math.max(1, Math.round(wd * S)); k++) line(f, x + x0 * S, y + y0 * S + k, x + x1 * S, y + y1 * S + k, c); },
});
// sizes: a soldier is 2/3 of the hero's height; vehicles at real scale against him
const SOLDIER = 0.68, CAR = 2.1, TANK = 2.4, HELI = 2.6;
const K = (h) => hex(h);
const COL = { tank: K("#4a5a34"), tankD: K("#2c381e"), tankL: K("#6e8048"), track: K("#1e1c20"), heli: K("#3a4254"), heliD: K("#222838"), glass: K("#8fd6e8"), red: K("#e03a2c"), tyre: K("#1a181c"), white: K("#f0ead8") };
const CAR_COLS = ["#d8483a", "#3f7cd0", "#e8b83c", "#e8e2d0", "#3fa06a", "#8a5ad0"].map(K);

class Enemy {
  constructor(g, x, y) { this.g = g; this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.t = Math.random() * 5; this.flash = 0; this.dead = false; this.onGround = false; }
  hurt(d, kx = 0, ky = 0) {
    if (this.dead) return;
    this.hp -= d; this.flash = 0.08; this.vx += kx / (this.mass || 1); this.vy += ky / (this.mass || 1);
    if (this.hp <= 0) { this.dead = true; this.die(); }
  }
  hits(x, y, r) { return x > this.x - this.hw - r && x < this.x + this.hw + r && y > this.y - this.h - r && y < this.y + r; }
}

export class Soldier extends Enemy {
  constructor(g, x, y, para) { super(g, x, y); Object.assign(this, { hw: 4, h: 22, hp: 3, face: Math.random() < 0.5 ? -1 : 1, shootT: 1 + Math.random() * 2, ph: 0, para: !!para, score: 60, kind: "soldier", aim: 0 }); }
  update(dt) {
    const g = this.g, h = g.hero, w = g.world;
    this.t += dt; this.flash -= dt;
    const dx = h.x - this.x, dy = h.cy - (this.y - 14), dist = Math.hypot(dx, dy), sees = dist < 340 && h.dead <= 0;
    const vy0 = this.vy;
    this.vy = Math.min(this.para ? 110 : 900, this.vy + 900 * dt);
    if (this.onGround) {
      if (sees) { this.face = dx > 0 ? 1 : -1; this.vx *= 1 - 10 * dt; this.aim = Math.atan2(dy, Math.abs(dx)); }
      else { this.vx = this.face * 22; if (boxHits(w, this.x + this.face * 6, this.y - CELL * 2, 2, 14) || !w.solidPx(this.x + this.face * 8, this.y + 10)) this.face *= -1; }
    }
    const was = this.onGround;
    moveBody(w, this, dt, 4);
    if (this.onGround && !was) { if (vy0 > 620) return this.hurt(99); this.para = false; this.vy = 0; }
    if (this.onGround) this.vy = 0;
    if (sees && (this.shootT -= dt) <= 0) {
      this.shootT = 1.3 + Math.random() * 1.4;
      const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.16;
      g.enemyShot("bullet", this.x + Math.cos(a) * 10, this.y - 17 + Math.sin(a) * 10, Math.cos(a) * 250, Math.sin(a) * 250);
    }
    if (this.y > (WH - LAVA) * CELL - 3) this.dead = true;
  }
  die() {
    const g = this.g;
    for (let i = 0; i < 16; i++) g.parts.spawn(PT.DEBRIS, this.x + (Math.random() - 0.5) * 6, this.y - Math.random() * 20, this.vx * 0.5 + (Math.random() - 0.5) * 220, this.vy * 0.5 - Math.random() * 260, 1 + Math.random() * 2, [K("#8a9a5a"), K("#2a3420"), K("#e8b890"), K("#5a7a48")][i & 3], 1 + (i & 1));
    g.fxKind("poof", this.x, this.y - 4);
    g.sfx("pop");
  }
  draw(f) {
    const moving = Math.abs(this.vx) > 8 && this.onGround;
    let pose;
    if (this.para) pose = { fx: -6, fy: -40, bx: 8, by: -40, ffx: -2, fbx: 3, turn: 0.6 };
    else if (moving) { this.ph += 0.14; const c = Math.cos(Math.round(this.ph / 0.6) * 0.6); pose = { lean: 2, crouch: 2, ffx: 7 * c, fbx: -7 * c, fx: 12, fy: -20, bx: 8, by: -20, weapon: "pistol", sa: 0.2 }; }
    else { const a = Math.round(this.aim * 6) / 6; pose = { crouch: 2, fx: 13 * Math.cos(a), fy: -26 + 13 * Math.sin(a), bx: 6, by: -22, ffx: 5, fbx: -6, weapon: "pistol", sa: a }; }
    if (this.para) { const x = this.x, y = this.y - 32; for (let i = -10; i <= 10; i++) rect(f, x + i, y - 10 + Math.abs(i) * 0.45, 1, 4, i % 6 === 0 ? COL.red : COL.white); line(f, x - 10, y - 4, x - 2, y + 6, COL.track); line(f, x + 10, y - 4, x + 2, y + 6, COL.track); }
    drawPosed(f, this.x, this.y, this.face, pose, olive, this.flash > 0, SOLDIER);
  }
}

export class Car extends Enemy {
  constructor(g, x, y) { super(g, x, y); Object.assign(this, { hw: 27, h: 23, hp: 8, mass: 4, col: CAR_COLS[(Math.random() * CAR_COLS.length) | 0], score: 150, kind: "car", face: Math.random() < 0.5 ? -1 : 1 }); }
  update(dt) {
    this.flash -= dt;
    this.vy = Math.min(900, this.vy + 900 * dt); this.vx *= 1 - 4 * dt;
    const vy0 = this.vy;
    moveBody(this.g.world, this, dt, 0);
    if (this.onGround) { if (vy0 > 500) return this.hurt(99); this.vy = 0; }
    if (this.y > (WH - LAVA) * CELL - 3) this.dead = true;
  }
  die() { this.g.blast(this.x, this.y - 12, 48, 9, { kind: "small", size: 1.4, owner: "enemy", metal: this.col }); }
  draw(f) {
    const c = this.flash > 0 ? 0xffffffff : this.col, s = this.face, { R } = kit(f, this.x, this.y, CAR);
    R(-13, -7, 26, 5, c); R(-8 - s, -11, 15, 4, c); R(-6 - s, -10, 5, 3, COL.glass); R(1 - s, -10, 5, 3, COL.glass);
    R(-13, -3, 26, 1, COL.tankD); R(s * 12 - (s > 0 ? 0 : 1), -6, 1, 2, COL.white); R(-s * 13 - (s > 0 ? 0 : 1), -6, 1, 1, COL.red);
    R(-10, -3, 4, 3, COL.tyre); R(6, -3, 4, 3, COL.tyre); R(-9, -2, 2, 1, COL.white); R(7, -2, 2, 1, COL.white);
  }
}

export class Tank extends Enemy {
  constructor(g, x, y) { super(g, x, y); Object.assign(this, { hw: 41, h: 36, hp: 60, mass: 12, shootT: 2, aim: -0.4, face: 1, score: 600, kind: "tank" }); }
  update(dt) {
    const g = this.g, h = g.hero;
    this.t += dt; this.flash -= dt;
    const dx = h.x - this.x, dy = h.cy - (this.y - 32), dist = Math.hypot(dx, dy), sees = dist < 520 && h.dead <= 0;
    this.face = dx > 0 ? 1 : -1;
    this.vy = Math.min(900, this.vy + 900 * dt);
    if (this.onGround) this.vx += ((sees && Math.abs(dx) > 170 ? this.face * 34 : 0) - this.vx) * Math.min(1, 4 * dt);
    moveBody(g.world, this, dt, 8);
    if (this.onGround) this.vy = 0;
    if (sees) {
      // lob it: pick the angle that carries the shell to him
      const v = 330, gr = 500, ax = Math.abs(dx), disc = v * v * v * v - gr * (gr * ax * ax + 2 * -dy * v * v);
      const a = disc > 0 ? Math.atan2(v * v - Math.sqrt(disc), gr * ax) : 0.7;
      this.aim += (-Math.max(-0.2, Math.min(1.2, a)) - this.aim) * Math.min(1, 3 * dt);
      if ((this.shootT -= dt) <= 0) {
        this.shootT = 2.4 + Math.random();
        const c = Math.cos(this.aim) * this.face, s = Math.sin(this.aim);
        g.enemyShot("shell", this.x + c * 48, this.y - 32 + s * 48, c * v, s * v);
        g.fxKind("muzzle", this.x + c * 48, this.y - 32 + s * 48, { angle: Math.atan2(s, c) });
        g.sfx("cannon"); this.vx -= this.face * 30;
      }
    }
    if (this.y > (WH - LAVA) * CELL - 3) this.dead = true;
  }
  die() { this.g.blast(this.x, this.y - 18, 70, 12, { kind: "big", owner: "enemy", metal: COL.tank }); }
  draw(f) {
    const fl = this.flash > 0, b = fl ? 0xffffffff : COL.tank, d = fl ? 0xffffffff : COL.tankD, { R, L } = kit(f, this.x, this.y, TANK);
    R(-17, -5, 34, 5, COL.track); for (let i = -15; i < 16; i += 5) R(i + (Math.floor(this.x / 5) % 5 + 5) % 5 - 2, -4, 2, 3, d);
    for (let i = -14; i <= 12; i += 6.5) R(i, -4, 3, 3, COL.tankD);
    R(-15, -10, 30, 5, b); R(-15, -10, 30, 1, COL.tankL); R(-8, -15, 15, 5, b); R(-8, -15, 15, 1, COL.tankL);
    const c = Math.cos(this.aim) * this.face, s = Math.sin(this.aim);
    L(0, -13, c * 20, -13 + s * 20, d); L(0, -14, c * 20, -14 + s * 20, b);
    R(-3, -13, 3, 2, COL.red); R(4, -17, 1, 2, d);
  }
}

export class Heli extends Enemy {
  constructor(g, x, y) { super(g, x, y); Object.assign(this, { hw: 40, h: 36, hp: 40, mass: 6, shootT: 1.5, burst: 0, rocketT: 4, face: 1, side: Math.random() < 0.5 ? -1 : 1, score: 900, kind: "heli", wreck: false, sideT: 5 }); }
  hurt(d, kx, ky) { if (this.wreck) return; this.hp -= d; this.flash = 0.08; if (this.hp <= 0) { this.wreck = true; this.vy = -60; this.g.blast(this.x, this.y - 8, 20, 4, { kind: "plasma", owner: "enemy" }); this.g.addScore(this.score, this.x, this.y); } }
  update(dt) {
    const g = this.g, h = g.hero, w = g.world;
    this.t += dt; this.flash -= dt;
    if (this.wreck) {
      this.vy += 500 * dt; this.vx *= 1 - dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (Math.random() < 0.6) g.parts.spawn(PT.SMOKE, this.x, this.y - 10, (Math.random() - 0.5) * 30, -20, 0.9, K("#2a2630"), 5);
      if (Math.random() < 0.5) g.parts.spawn(PT.FLAME, this.x, this.y - 8, (Math.random() - 0.5) * 40, -30, 0.5, 0, 3);
      if (boxHits(w, this.x, this.y, 26, 26) || this.y > (WH - LAVA) * CELL - 3) { this.dead = true; g.blast(this.x, this.y, 70, 12, { kind: "big", owner: "enemy", metal: COL.heli }); }
      return;
    }
    if ((this.sideT -= dt) < 0) { this.sideT = 4 + Math.random() * 4; this.side *= -1; }
    const tx = h.x + this.side * 190, ty = Math.min(h.cy - 130, w.surfaceY(this.x, 0) - 110);
    this.vx += ((tx - this.x) * 1.2 - this.vx) * Math.min(1, 1.5 * dt); this.vy += ((ty - this.y) * 1.5 - this.vy) * Math.min(1, 2 * dt);
    this.vx = Math.max(-220, Math.min(220, this.vx)); this.vy = Math.max(-160, Math.min(160, this.vy));
    this.x += this.vx * dt; this.y += this.vy * dt + Math.sin(this.t * 3) * 0.2;
    if (boxHits(w, this.x, this.y, 30, 30)) this.y -= 3;
    const dx = h.x - this.x, dy = h.cy - this.y, dist = Math.hypot(dx, dy);
    this.face = dx > 0 ? 1 : -1;
    if (dist < 420 && h.dead <= 0) {
      if ((this.shootT -= dt) <= 0) {
        this.burst = (this.burst + 1) % 4; this.shootT = this.burst ? 0.11 : 1.5;
        const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.14;
        g.enemyShot("bullet", this.x + this.face * 30, this.y - 6, Math.cos(a) * 300, Math.sin(a) * 300);
      }
      if ((this.rocketT -= dt) <= 0) { this.rocketT = 4 + Math.random() * 2; const a = Math.atan2(dy, dx); g.enemyShot("rocket", this.x, this.y, Math.cos(a) * 190, Math.sin(a) * 190); g.sfx("rocket"); }
    }
  }
  die() {}
  draw(f) {
    const s = this.face, fl = this.flash > 0, b = fl ? 0xffffffff : COL.heli, d = fl ? 0xffffffff : COL.heliD, { R } = kit(f, this.x, this.y, HELI);
    R(-9, -12, 18, 10, b); R(-7, -13, 14, 1, b); R(-9, -3, 18, 1, d); R(-9, -7, 18, 1, d);
    R(s > 0 ? 2 : -8, -11, 6, 5, COL.glass);
    R(s > 0 ? -24 : 9, -9, 15, 3, b); R(s > 0 ? -26 : 23, -13, 3, 7, d);
    R(-1, -15, 2, 2, d);
    const rw = Math.floor(this.t * 30) % 3; R(-(rw === 0 ? 22 : rw === 1 ? 12 : 5), -16, rw === 0 ? 44 : rw === 1 ? 24 : 10, 0.5, COL.track);
    R(-8, 0, 16, 0.5, d); R(-5, -2, 0.5, 2, d); R(4, -2, 0.5, 2, d);
    R(s > 0 ? -24 : 23, -9, 1, 1, COL.red);
  }
}
