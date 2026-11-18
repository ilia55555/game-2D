// The army that shows up when the city starts falling down: soldiers, tanks, helicopters. And parked cars.
import { posed, hex, mix } from "../vendor/pixelfx/src/core/index.js";
import { moveBody, boxHits, dressWith } from "./hero.js";
import { CELL, WH, LAVA, SEA } from "./world.js";
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
const SEA_Y = SEA * CELL;
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
  constructor(g, x, y, para) { super(g, x, y); Object.assign(this, { hw: 4, h: 22, hp: 3, face: Math.random() < 0.5 ? -1 : 1, shootT: 1 + Math.random() * 2, ph: 0, para: !!para, score: 60, kind: "soldier", aim: 0, burst: 0 }); const r = Math.random(); this.gun = r < 0.35 ? "pistol" : r < 0.6 ? "smg" : r < 0.85 ? "shotgun" : "rpg"; if (this.gun === "rpg") this.score = 90; }
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
    // never stuck inside solid rock: climb out, or go if there's no way out
    if (boxHits(w, this.x, this.y - 1, this.hw, this.h - 2)) { let up = 0; while (up < 12 && boxHits(w, this.x, this.y - 1, this.hw, this.h - 2)) { this.y -= CELL; up++; } if (up >= 12) { this.score = 0; this.dead = true; return; } }
    const was = this.onGround;
    moveBody(w, this, dt, 4);
    if (this.onGround && !was) { if (vy0 > 620) return this.hurt(99); this.para = false; this.vy = 0; }
    if (this.onGround) this.vy = 0;
    // few of them about and they've seen him: call it in with a flare
    if (sees && this.onGround && Math.random() < dt * 0.5) {
      let n = 0; for (const e of g.enemies) if (e.kind === "soldier" && !e.dead && Math.abs(e.x - this.x) < 320) n++;
      if (n < 3) g.callFlare(this.x, this.y);
    }
    const gun = this.gun, inRange = gun === "shotgun" ? dist < 210 : true;
    if (sees && inRange && (this.shootT -= dt) <= 0) {
      const a0 = Math.atan2(dy, dx), mx = this.x + Math.cos(a0) * 10, my = this.y - 17 + Math.sin(a0) * 10;
      if (gun === "pistol") { this.shootT = 1.2 + Math.random() * 1.2; const a = a0 + (Math.random() - 0.5) * 0.14; g.enemyShot("bullet", mx, my, Math.cos(a) * 280, Math.sin(a) * 280); }
      else if (gun === "smg") { this.burst = (this.burst + 1) % 6; this.shootT = this.burst ? 0.08 : 1.6 + Math.random(); const a = a0 + (Math.random() - 0.5) * 0.3; g.enemyShot("bullet", mx, my, Math.cos(a) * 300, Math.sin(a) * 300); }
      else if (gun === "shotgun") { this.shootT = 1.8 + Math.random(); for (let i = 0; i < 5; i++) { const a = a0 + (i - 2) * 0.09 + (Math.random() - 0.5) * 0.05, v = 300 + Math.random() * 60; g.enemyShot("pellet", mx, my, Math.cos(a) * v, Math.sin(a) * v); } this.vx -= this.face * 40; }
      else { this.shootT = 4 + Math.random() * 2; g.enemyShot("rpg", mx, my, Math.cos(a0) * 230, Math.sin(a0) * 230); g.sfx("rocket"); }
      if (gun !== "rpg" && (gun !== "smg" || this.burst === 1)) g.muzzle(gun, mx, my, this.face);
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
    // tanks keep to the streets: they won't climb onto anything above the ground line
    const gl = g.world.groundPx(this.x + this.face * 50);
    if (this.vx * this.face > 0 && g.world.surfaceY(this.x + this.face * 50, 0) < gl - 8) this.vx = 0;
    moveBody(g.world, this, dt, this.y > g.world.groundPx(this.x) - 12 ? 8 : 0);
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
    const gl = Math.min(w.groundPx(this.x), w.wet(Math.floor(this.x / CELL)) ? SEA_Y : Infinity), tx = h.x + this.side * 190;
    let roof = Infinity; for (let ox = -60; ox <= 60 + Math.abs(this.vx) * 0.8; ox += 12) roof = Math.min(roof, w.surfaceY(this.x + ox * Math.sign(this.vx || 1), 0));
    const ty = Math.min(roof - 60, Math.max(gl - 300, Math.min(h.cy - 130, gl - 150)));
    this.vx += ((tx - this.x) * 1.2 - this.vx) * Math.min(1, 1.5 * dt); this.vy += ((ty - this.y) * 1.5 - this.vy) * Math.min(1, 2 * dt);
    this.vx = Math.max(-220, Math.min(220, this.vx)); this.vy = Math.max(-160, Math.min(160, this.vy));
    // too low to clear what's ahead: hold back horizontally until it has climbed (no snapping)
    if (this.y > roof - 50 && this.vx) { this.vx *= Math.max(0, 1 - 6 * dt); this.vy = Math.min(this.vy, -120); }
    const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt + Math.sin(this.t * 3) * 0.2;
    if (!boxHits(w, nx, ny, 30, 30)) { this.x = nx; this.y = ny; }
    else if (!boxHits(w, this.x, ny, 30, 30)) { this.y = ny; this.vx *= 0.5; }
    else { this.vy = Math.min(this.vy, -60); if (!boxHits(w, this.x, this.y - 2, 30, 30)) this.y -= 2; }
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

/** A fighter jet: screams across high up, looses missiles at the hero on each pass, turns and comes back. */
const JET = 2.2;
export class Jet extends Enemy {
  constructor(g, x, dir) { super(g, x, g.world.surfaceY(x, 0) - 200); Object.assign(this, { hw: 26, h: 14, hp: 26, mass: 8, dir, face: dir, passes: 0, rocketT: 0.6, score: 1200, kind: "jet", alt: 110 + Math.random() * 60 }); }
  update(dt) {
    const g = this.g, h = g.hero;
    this.t += dt; this.flash -= dt;
    const w = g.world; let top = Infinity; for (let ox = -30; ox <= 420; ox += 14) top = Math.min(top, w.surfaceY(this.x + ox * this.dir, 0));
    const gl = Math.min(w.groundPx(this.x), w.wet(Math.floor(this.x / CELL)) ? SEA_Y : Infinity), ty = Math.min(top - 70, Math.max(gl - 340, Math.min(h.cy - this.alt, gl - 180)));
    let spd = 380 * (this.boost || 1); this.vy += ((ty - this.y) * 3 - this.vy) * Math.min(1, 4 * dt);
    // plan the climb before moving: for every rooftop ahead, the climb rate needed to clear it in time
    let need = Infinity;
    for (let ox = 14; ox <= 420; ox += 14) { const sy = w.surfaceY(this.x + ox * this.dir, 0) - 50; if (sy < this.y) need = Math.min(need, (sy - this.y) / (ox / spd)); }
    const MAXC = 420;
    if (need < this.vy) this.vy += (Math.max(need, -MAXC) - this.vy) * Math.min(1, 10 * dt);
    if (need < -MAXC) spd *= Math.max(0.25, MAXC / -need); // too steep to climb at full speed: slow down
    this.vx = this.dir * spd;
    this.x += this.vx * dt; this.y += this.vy * dt; this.face = this.dir;
    if (Math.random() < 0.5) g.parts.spawn(PT.SMOKE, this.x - this.dir * 26, this.y - 6, -this.dir * 30, 0, 0.5, 0xffb0b0b8, 2);
    const ahead = (h.x - this.x) * this.dir;
    if (h.dead <= 0 && ahead > 40 && ahead < 380 && (this.rocketT -= dt) <= 0) {
      this.rocketT = 0.7;
      const a = Math.atan2(h.cy - this.y, h.x - this.x);
      g.enemyShot("rocket", this.x, this.y - 2, Math.cos(a) * 220 + this.vx * 0.3, Math.sin(a) * 220); g.sfx("rocket");
    }
    if (ahead < -650) { this.dir *= -1; this.rocketT = 0.6; if (++this.passes >= 3) { this.score = 0; this.dead = true; } }
  }
  die() { this.g.blast(this.x, this.y - 6, 56, 10, { kind: "big", owner: "enemy", metal: COL.heli }); }
  draw(f) {
    const s = this.face, fl = this.flash > 0, b = fl ? 0xffffffff : K("#6a7488"), d = fl ? 0xffffffff : K("#3a4254"), { R } = kit(f, this.x, this.y, JET);
    R(-12, -6, 24, 3, b); R(-12, -3, 24, 1, d);
    R(s > 0 ? 12 : -15, -5, 3, 2, b); R(s > 0 ? 15 : -16, -5, 1, 1, d);
    R(s > 0 ? 5 : -9, -7, 4, 1, COL.glass);
    R(-4, -4, 8, 1, d); R(s > 0 ? -6 : -2, -3, 8, 2, d);
    R(s > 0 ? -12 : 9, -10, 3, 4, b);
    R(s > 0 ? -14 : 12, -6, 2, 2, K("#ff8a2a"));
  }
}

// ================================================================================================= THE NAVY
// Boats ride the sea surface and only go where there is water. Each has its own way of fighting.
class Ship extends Enemy {
  constructor(g, x) { super(g, x, SEA_Y); this.face = 1; this.sink = 0; }
  float(dt, want, sp, acc) {
    const g = this.g, w = g.world;
    const tv = Math.max(-sp, Math.min(sp, want));
    this.vx += Math.max(-acc * dt, Math.min(acc * dt, tv - this.vx));
    const nx = this.x + this.vx * dt, ahead = Math.floor((nx + Math.sign(this.vx) * this.hw) / CELL);
    if (w.wet(ahead) && !w.solidPx(nx + Math.sign(this.vx) * this.hw, SEA_Y - 2)) this.x = nx; else this.vx = 0;
    this.y = SEA_Y + 2 + Math.sin(this.t * 2) * 1.5;
    if (Math.abs(this.vx) > 40 && Math.random() < 0.5) g.parts.spawn(PT.DROP, this.x - Math.sign(this.vx) * this.hw, SEA_Y, -this.vx * 0.3, -Math.random() * 120, 0.6, 0xfffff0d0, 1);
  }
  hurt(d, kx = 0, ky = 0) { super.hurt(d, kx * 0.2, 0); this.vy = 0; }
  /** He's deep under water: guns can't reach, so torpedoes. Returns true while it's handling him that way. */
  torpedo(dt) {
    const g = this.g, h = g.hero;
    if (h.dead > 0 || h.y < SEA_Y + 40 || !g.world.inWater(h.x, h.y - 10)) return false;
    if ((this.torpT = (this.torpT ?? 1) - dt) <= 0 && Math.abs(h.x - this.x) < 700) {
      this.torpT = this.torpGap || 2.2;
      const a = Math.atan2(h.cy - (SEA_Y + 10), h.x - this.x);
      g.enemyShot("torpedo", this.x, SEA_Y + 10, Math.cos(a) * 160, Math.max(40, Math.sin(a) * 160));
      g.sfx("dive");
    }
    return true;
  }
  die() { this.g.blast(this.x, this.y - this.h / 2, this.hw * 1.2, 12, { kind: "big", owner: "enemy", metal: K("#5a6270") }); }
  hull(f, S, len, hgt, col, dark) {
    const { R } = kit(f, this.x, this.y, S);
    for (let i = 0; i < hgt; i++) { const k = Math.round((hgt - i) * 0.8); R(-len / 2 + (this.face < 0 ? k : 0), -i - 1, len - k, 1, i < 2 ? dark : col); }
    return R;
  }
}

/** Fast and nimble: darts round you, strafing with a mounted machine gun. */
export class Speedboat extends Ship {
  constructor(g, x) { super(g, x); Object.assign(this, { hw: 20, h: 12, hp: 14, mass: 3, kind: "boat", score: 300, shootT: 1, burst: 0, side: Math.random() < 0.5 ? -1 : 1, sideT: 2 }); }
  update(dt) {
    const g = this.g, h = g.hero; this.t += dt; this.flash -= dt;
    if ((this.sideT -= dt) < 0) { this.sideT = 1.5 + Math.random() * 2; this.side *= -1; }
    this.float(dt, (h.x + this.side * 140 - this.x) * 3, 300, 500);
    this.face = this.vx >= 0 ? 1 : -1;
    if (this.torpedo(dt)) return;
    const dx = h.x - this.x, dy = h.cy - (this.y - 10);
    if (h.dead <= 0 && Math.hypot(dx, dy) < 380 && (this.shootT -= dt) <= 0) {
      this.burst = (this.burst + 1) % 6; this.shootT = this.burst ? 0.08 : 1.2;
      const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.15;
      g.enemyShot("bullet", this.x, this.y - 10, Math.cos(a) * 340, Math.sin(a) * 340);
    }
  }
  draw(f) {
    const fl = this.flash > 0, R = this.hull(f, 1, 40, 6, fl ? 0xffffffff : K("#e8e2d0"), fl ? 0xffffffff : K("#d03a2c"));
    const s = this.face; R(s * 2 - 5, -10, 10, 4, K("#3a4254")); R(s * 4 - 1, -9, 4, 2, COL.glass); R(-s * 6 - 1, -12, 2, 6, K("#2a2a30")); R(-s * 6 - 1 + s * 2, -12, 6 * s || 1, 1, K("#2a2a30"));
  }
}

/** Keeps its distance and fires volleys of homing missiles, with a flak gun for anything that comes close. */
export class Frigate extends Ship {
  constructor(g, x) { super(g, x); Object.assign(this, { hw: 54, h: 30, hp: 140, mass: 20, kind: "frigate", score: 1500, volleyT: 2.5, shots: 0, flakT: 0.5 }); }
  update(dt) {
    const g = this.g, h = g.hero; this.t += dt; this.flash -= dt;
    const side = this.x < h.x ? -1 : 1; this.face = -side;
    this.float(dt, (h.x + side * 330 - this.x) * 1.2, 110, 80);
    if (this.torpedo(dt)) return;
    const dx = h.x - this.x, dy = h.cy - (this.y - 30), d = Math.hypot(dx, dy);
    if (h.dead <= 0 && d < 650) {
      if ((this.volleyT -= dt) <= 0) {
        this.shots++; this.volleyT = this.shots % 4 ? 0.25 : 3.2;
        g.enemyShot("rocket", this.x - this.face * 10, this.y - 30, (Math.random() - 0.5) * 60, -260); g.sfx("rocket");
      }
      if (d < 260 && (this.flakT -= dt) <= 0) {
        this.flakT = 0.12; const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.3;
        g.enemyShot("pellet", this.x + this.face * 30, this.y - 24, Math.cos(a) * 420, Math.sin(a) * 420);
      }
    }
  }
  draw(f) {
    const fl = this.flash > 0, b = fl ? 0xffffffff : K("#7a8494"), d = fl ? 0xffffffff : K("#4a5260");
    const R = this.hull(f, 1, 108, 10, b, d), s = this.face;
    R(-24, -20, 36, 10, b); R(-16, -28, 18, 8, d); R(-12, -26, 10, 2, COL.glass); R(-6, -40, 2, 12, d); R(-12, -38, 14, 1, d);
    R(-s * 36 - 6, -16, 12, 6, d); for (let i = 0; i < 4; i++) R(-s * 36 - 5 + i * 3, -18, 2, 2, COL.red);
    R(s * 34 - 4, -14, 8, 4, d); R(s * 34, -15, s * 12 || 1, 2, d);
  }
}

/** Big and slow: lobs heavy shells from its twin turrets and sweeps the sky with its deck guns. */
export class Destroyer extends Ship {
  constructor(g, x) { super(g, x); Object.assign(this, { hw: 90, h: 44, hp: 360, mass: 60, kind: "destroyer", score: 3000, shellT: 2, gunT: 1, burst: 0 }); }
  update(dt) {
    const g = this.g, h = g.hero; this.t += dt; this.flash -= dt;
    const side = this.x < h.x ? -1 : 1; this.face = -side;
    this.float(dt, (h.x + side * 480 - this.x) * 0.8, 60, 30);
    if (this.torpedo(dt)) return;
    const dx = h.x - this.x, dy = h.cy - (this.y - 40);
    if (h.dead <= 0 && Math.abs(dx) < 900) {
      if ((this.shellT -= dt) <= 0) {
        // artillery: aim the arc so it lands on him (shells fall at 500 px/s²)
        this.shellT = 1.6; const T = Math.max(0.8, Math.abs(dx) / 420);
        for (const off of [-20, 20]) { const sx = this.x + off - this.face * 10; g.enemyShot("shell", sx, this.y - 34, (h.x - sx) / T, (h.cy - (this.y - 34)) / T - 250 * T); }
        g.sfx("boom", 0.6); g.shake(1.5);
      }
      if ((this.gunT -= dt) <= 0) {
        this.burst = (this.burst + 1) % 8; this.gunT = this.burst ? 0.07 : 1.4;
        const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.1;
        g.enemyShot("bullet", this.x + this.face * 40, this.y - 30, Math.cos(a) * 380, Math.sin(a) * 380);
      }
    }
  }
  draw(f) {
    const fl = this.flash > 0, b = fl ? 0xffffffff : K("#5e6878"), d = fl ? 0xffffffff : K("#383e4a");
    const R = this.hull(f, 1, 180, 14, b, d), s = this.face;
    R(-30, -28, 50, 14, b); R(-20, -40, 26, 12, d); R(-14, -38, 16, 2, COL.glass); R(-8, -60, 3, 20, d); R(-18, -56, 22, 1, d); R(4, -46, 8, 6, d);
    for (const tx of [44, 64]) { R(s * tx - 7, -20, 14, 6, d); R(s * tx + (s > 0 ? 6 : -18), -19, 12, 2, d); }
    R(-s * 60 - 7, -20, 14, 6, d); R(-s * 60 + (s > 0 ? -18 : 6), -19, 12, 2, d);
    R(-90, -8, 180, 1, COL.red);
  }
}

// ================================================================================================= THE RIVAL
// OMEGA: a dark mirror of the hero. He flies, chases, rams straight through buildings, sweeps a burning eye beam,
// hurls volleys of fireballs and dives down in ground-shaking slams.
// a war robot drawn the way NOVA is: same rig, same scale, same shading, re-dressed in armour plates
const RB = { helm: [hex("#2a2e3a"), hex("#c8d0dc")], suit: [hex("#3a0c10"), hex("#e0322a")], legs: [hex("#1a1e28"), hex("#8a94a6")], joint: [hex("#3a3020"), hex("#e8c050")], eye: hex("#ff3030") };
const omega = dressWith((c, row, col, t) => {
  if (c === INK) return hex("#08090e");
  if (c === hex("#f53cd1")) return RB.eye;
  if (row <= 6) return (row === 3 || row === 4) && col >= 12 ? RB.eye : mix(RB.helm[0], RB.helm[1], t);
  if (row >= 33 || (row >= 14 && row <= 17 && col <= 8)) return mix(RB.joint[0], RB.joint[1], t);
  if (row === 17 || (row === 16 && col > 9)) return mix(RB.legs[0], RB.legs[1], t * 0.9);
  if (row <= 16) return (row + col) % 7 === 0 ? mix(RB.helm[0], RB.helm[1], t * 0.7) : mix(RB.suit[0], RB.suit[1], t);
  return (row % 5 === 0) ? mix(RB.helm[0], RB.helm[1], t * 0.6) : mix(RB.legs[0], RB.legs[1], t);
});
const RIVAL = 1;
export class Rival extends Enemy {
  constructor(g, x, y) {
    super(g, x, y);
    Object.assign(this, { hw: 6, h: 38, hp: 3200, max: 3200, mass: 30, kind: "rival", score: 25000, face: 1, state: "chase", st: 1.5, ph: 0, hitCd: 0 });
  }
  hurt(d, kx = 0, ky = 0) { super.hurt(d * 0.8, kx * 0.3, ky * 0.3); }
  pick() {
    const r = Math.random(), h = this.g.hero, far = Math.hypot(h.x - this.x, h.cy - this.y) > 260;
    if (r < 0.3) { this.state = "dash"; this.st = 0.55; const a = Math.atan2(h.cy - (this.y - 19), h.x - this.x); this.dvx = Math.cos(a) * 760; this.dvy = Math.sin(a) * 760; this.g.sfx("dive"); }
    else if (r < 0.5) { this.state = "beam"; this.st = 1.4; this.g.sfx("laser"); }
    else if (r < 0.7 || far) { this.state = "volley"; this.st = 1.1; this.n = 0; }
    else { this.state = "slam"; this.st = 2; this.sp = 0; }
  }
  update(dt) {
    const g = this.g, h = g.hero, w = g.world;
    this.t += dt; this.flash -= dt; this.hitCd -= dt;
    const cy = this.y - 19, dx = h.x - this.x, dy = h.cy - cy;
    this.face = this.state === "dash" ? (this.dvx > 0 ? 1 : -1) : dx > 0 ? 1 : -1;
    const smash = (r) => { g.addScore(w.explode(this.x, cy, r, 10, { fire: 0.2, debris: 10, kick: 1.6 })); };
    if (h.dead > 0) { this.vy -= 40 * dt; this.y += this.vy * dt; return; }
    if (Math.abs(dx) > 700) { this.x = h.x - Math.sign(dx) * 600; this.y = h.cy - 120; this.vx = this.vy = 0; this.state = "chase"; this.st = 0.6; }
    if ((this.st -= dt) <= 0) { if (this.state === "chase") this.pick(); else { this.state = "chase"; this.st = 0.8 + Math.random() * 1.2; } }
    if (this.state === "chase") {
      const tx = h.x - Math.sign(dx || 1) * 110, ty = h.cy - 50, k = Math.min(1, 3 * dt);
      this.vx += ((tx - this.x) * 3 - this.vx) * k; this.vy += ((ty - cy) * 3 - this.vy) * k;
      const sp = Math.hypot(this.vx, this.vy); if (sp > 330) { this.vx *= 330 / sp; this.vy *= 330 / sp; }
    } else if (this.state === "dash") {
      this.vx = this.dvx; this.vy = this.dvy; smash(16);
      for (let i = 0; i < 2; i++) g.parts.spawn(PT.FLAME, this.x, cy, -this.vx * 0.2, -this.vy * 0.2, 0.4, 0, 3);
    } else if (this.state === "beam") {
      this.vx *= 1 - 4 * dt; this.vy *= 1 - 4 * dt;
      if ((this.bt = (this.bt || 0) - dt) <= 0) { this.bt = 0.035; const a = Math.atan2(dy, dx) + Math.sin(this.t * 6) * 0.12; g.enemyShot("bullet", this.x + this.face * 4, cy - 16, Math.cos(a) * 640, Math.sin(a) * 640); }
    } else if (this.state === "volley") {
      this.vx *= 1 - 3 * dt; this.vy *= 1 - 3 * dt;
      if ((this.bt = (this.bt || 0) - dt) <= 0 && this.n < 6) { this.bt = 0.16; this.n++; const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.5; g.enemyShot("rocket", this.x, cy - 10, Math.cos(a) * 260, Math.sin(a) * 260); g.sfx("rocket"); }
    } else if (this.state === "slam") {
      // up over him, then straight down
      if (this.st > 1.2) { this.vx += ((h.x - this.x) * 4 - this.vx) * Math.min(1, 4 * dt); this.vy += ((h.cy - 220 - cy) * 4 - this.vy) * Math.min(1, 4 * dt); }
      else {
        this.vx *= 0.9; this.vy = 900; smash(10);
        const gy = w.surfaceY(this.x, cy);
        if (this.y >= gy - 2) { this.y = gy; this.vy = 0; this.state = "chase"; this.st = 1.2; g.blast(this.x, this.y - 6, 90, 14, { kind: "big", owner: "enemy" }); g.shake(14); g.sfx("bigboom"); }
      }
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.y > (WH - LAVA) * CELL - 10) { this.y = (WH - LAVA) * CELL - 10; this.vy = -300; }
    // contact: he hits hard
    if (this.hitCd <= 0 && Math.abs(h.x - this.x) < 14 && Math.abs(h.cy - cy) < 26) { this.hitCd = 0.6; g.hurtHero(this.state === "dash" ? 22 : 8); h.vx += Math.sign(dx || 1) * 500; h.vy -= 250; g.shake(6); g.sfx("punch"); }
    g.flashLight(this.x, cy, 50, 0x40e8ffff, 0.5, 0.05); g.flashLight(this.x, this.y + 4, 26, 0x80d0ffff, 0.6, 0.05);
  }
  die() {
    const g = this.g;
    g.blast(this.x, this.y - 19, 140, 18, { kind: "big" });
    g.say("OMEGA FALLS", 0xff40e0ff); g.shake(18); g.flash = Math.max(g.flash, 0.6); g.addScore(this.score, this.x, this.y);
  }
  draw(f) {
    let pose;
    if (this.state === "dash" || this.state === "slam" && this.st < 1.2) pose = { lean: 8, fx: 16, fy: -30, bx: 14, by: -26, ffx: -6, fbx: -10 };
    else if (this.state === "beam" || this.state === "volley") { const a = Math.atan2(this.g.hero.cy - (this.y - 19), (this.g.hero.x - this.x) * this.face); pose = { fx: 15 * Math.cos(a), fy: -26 + 15 * Math.sin(a), bx: 6, by: -18, ffx: 2, fbx: -4 }; }
    else pose = { lean: 3, fx: 8, fy: -16, bx: -6, by: -16, ffx: -3 + Math.sin(this.t * 4) * 2, fbx: -7 };
    // repulsor jets under the boots (and from the palms when it dashes)
    const fl = this.t * 30, jet = (jx, jy, n) => { for (let i = 0; i < n; i++) rect(f, Math.round(jx - 2 + Math.sin(fl + i) ), Math.round(jy + i * 3), 4 - (i >> 1), 3, i < 1 ? K("#ffffff") : i < 3 ? K("#80f0ff") : K("#2a80ff")); };
    jet(this.x - 4, this.y - 9, 4 + (Math.sin(fl) > 0 ? 1 : 0)); jet(this.x + 2, this.y - 9, 4 + (Math.cos(fl) > 0 ? 1 : 0));
    if (this.state === "dash") jet(this.x - this.face * 10, this.y - 30, 3);
    drawPosed(f, this.x, this.y, this.face, pose, omega, this.flash > 0, RIVAL);
    if (this.flash > 0) return;
    // the reactor in its chest, pulsing
    const X = Math.round(this.x), Y = Math.round(this.y), pulse = Math.sin(this.t * 6) > 0;
    rect(f, X - 1 + this.face, Y - 28, 2, 2, pulse ? K("#ffffff") : K("#80f0ff"));
  }
}
