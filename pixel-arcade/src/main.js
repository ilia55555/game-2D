// NOVA: Endless Demolition. The loop, the camera, input, the HUD, and the glue between everything.
import { createFrame, painterFor, hex } from "../vendor/pixelfx/src/core/index.js";
import * as smallExplosion from "../vendor/pixelfx/src/fx/explosions/small-explosion.js";
import * as bigExplosion from "../vendor/pixelfx/src/fx/explosions/big-explosion.js";
import * as plasmaExplosion from "../vendor/pixelfx/src/fx/explosions/plasma-explosion.js";
import * as darkExplosion from "../vendor/pixelfx/src/fx/shadow/dark-explosion.js";
import * as hitSpark from "../vendor/pixelfx/src/fx/impacts/hit-spark.js";
import * as groundSlam from "../vendor/pixelfx/src/fx/impacts/ground-slam.js";
import * as heavyLanding from "../vendor/pixelfx/src/fx/impacts/heavy-landing.js";
import * as critHit from "../vendor/pixelfx/src/fx/impacts/crit-hit.js";
import * as poof from "../vendor/pixelfx/src/fx/spawn/poof.js";
import * as respawnBeam from "../vendor/pixelfx/src/fx/spawn/respawn-beam.js";
import * as splashFx from "../vendor/pixelfx/src/fx/water/splash.js";
import * as manaBurst from "../vendor/pixelfx/src/fx/arcane/mana-burst.js";
import * as thunderclap from "../vendor/pixelfx/src/fx/lightning/thunderclap.js";
import * as birdFx from "../vendor/pixelfx/src/fx/critters/bird.js";
import { World, CELL, WORLD_PX_H, MAT_COLOR, M, SEA, BIOME_NAMES } from "./world.js";
import { Parts, PT } from "./particles.js";
import { FxMan } from "./fxm.js";
import { Hero } from "./hero.js";
import { Soldier, Car, Tank, Heli } from "./enemies.js";
import { WEAPONS, nuke } from "./weapons.js";
import { drawSky } from "./sky.js";
import { initAudio, sfx } from "./audio.js";

const W = 640, H = 360;
const rnd = (a, b) => a + Math.random() * (b - a);
const scaleC = (c, k) => 0xff000000 | (Math.min(255, ((c >> 16) & 255) * k) << 16) | (Math.min(255, ((c >> 8) & 255) * k) << 8) | Math.min(255, (c & 255) * k);
const K = hex;
const UI = { white: K("#fff8e8"), ink: K("#17121f"), red: K("#ff4a3c"), gold: K("#ffc83c"), cyan: K("#7ff3ff"), dim: K("#8a8494"), green: K("#6cdc5a"), orange: K("#ff8a2a"), panel: K("#221c2c") };
const RANKS = [[250, "DEMOLITION!"], [700, "RAMPAGE!"], [1500, "DEVASTATION!"], [3000, "CATACLYSM!"], [6000, "APOCALYPSE!"], [12000, "EXTINCTION EVENT!"]];

class Game {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.img = this.ctx.createImageData(W, H); this.out = new Uint32Array(this.img.data.buffer);
    this.frame = createFrame(W, H);
    this.world = new World((Math.random() * 1e6) | 0);
    this.parts = new Parts(this.world); this.fx = new FxMan(); this.hero = new Hero(this);
    this.enemies = []; this.shots = []; this.eshots = []; this.lights = []; this.timers = []; this.critters = [];
    this.cam = { x: 0, y: 0 }; this.shakeAmp = 0; this.flash = 0; this.freeze = 0; this.hurtFlash = 0;
    this.score = 0; this.combo = 1; this.comboN = 0; this.comboT = 0; this.rank = 0; this.best = +(localStorage.getItem("nova-best") || 0);
    this.heat = 0; this.spawnT = 4; this.nuke = 1; this.weapon = 0; this.cd = 0; this.banner = null; this.zone = null; this.time = 0; this.fxBudget = 2;
    this.beam = null; this.beam2 = null; this.started = false; this.fps = 60; this.maxX = 0;
    this.I = { mx: 0, my: 0, jump: false, jumpP: false, dash: false, poundP: false, punchP: false, fire: false, aimX: 0, aimY: 0, nukeP: false };
    const w = this.world, h = this.hero;
    h.x = 576; h.y = w.surfaceY(576, 0);
    this.cam.x = h.x; this.cam.y = h.y - 60;
    w.hooks.debris = (m, x, y, vx, vy, isBg) => this.debris(m, x, y, vx, vy, isBg);
    w.hooks.islandStart = () => sfx("rumble");
    w.hooks.islandLand = (s, broke) => this.islandLand(s, broke);
    w.hooks.fuel = (x, y) => this.blast(x, y, 30, 8, { kind: "small", size: 0.9, fire: 0.8 });
    w.hooks.flame = (x, y) => { this.parts.spawn(PT.FLAME, x + rnd(-2, 2), y, rnd(-14, 14), rnd(-40, -10), rnd(0.35, 0.7), 0, rnd(2, 3.4)); if (Math.random() < 0.12) this.parts.spawn(PT.SMOKE, x, y - 6, rnd(-8, 8), -24, 1.2, 0xff383038, 5); };
  }
  sfx(n, k) { sfx(n, k); }
  shake(a) { this.shakeAmp = Math.min(16, Math.max(this.shakeAmp, a)); }
  later(t, fn) { this.timers.push({ t, fn }); }
  flashLight(x, y, r, c, k, life = 0.25) { if (this.lights.length < 24) this.lights.push({ x, y, r, c, k, life, t: 0 }); }
  say(text, c = UI.gold) { this.banner = { text, t: 0, c }; }

  // ---- score, combo, heat
  addScore(n, x, y) {
    if (!n) return;
    if (x !== undefined) { this.score += n * this.combo; return; }
    this.score += Math.round(n * 10 * this.combo);
    this.comboN += n; this.comboT = 2.6; this.combo = 1 + Math.min(24, Math.floor(this.comboN / 120));
    this.heat = Math.min(5, this.heat + n / 900);
    const was = this.nuke;
    this.nuke = Math.min(1, this.nuke + n / 5000);
    if (was < 1 && this.nuke >= 1) { this.say("NUKE READY  [R]", UI.cyan); sfx("ready"); }
    while (this.rank < RANKS.length && this.comboN >= RANKS[this.rank][0]) { this.say(RANKS[this.rank][1]); this.rank++; }
  }

  // ---- rubble
  debris(m, x, y, vx, vy, isBg) {
    const P = this.parts, k = this.world.debrisK;
    if (Math.random() > k * 1.4 + 0.04) return;
    const c = MAT_COLOR[m];
    if (m === M.GLASS) { sfx("glass"); P.spawn(PT.SPARK, x, y, vx * 0.4 + rnd(-90, 90), vy * 0.4 + rnd(-140, 20), rnd(0.3, 0.8), 0xfffff0d0); }
    const n = isBg ? 1 : 2;
    for (let i = 0; i < n; i++) P.spawn(PT.DEBRIS, x + rnd(-2, 2), y + rnd(-2, 2), vx * rnd(0.4, 1.1) + rnd(-50, 50), vy * rnd(0.4, 1.1) + rnd(-90, 30), rnd(1.4, 3.6), scaleC(c, rnd(0.6, 1.12) * (isBg ? 0.7 : 1)), m === M.LEAVES || m === M.PINE ? 1 : 1 + ((Math.random() * 2.4) | 0));
    if (Math.random() < 0.07) P.spawn(PT.SMOKE, x, y, vx * 0.1 + rnd(-14, 14), rnd(-22, 4), rnd(0.8, 1.6), scaleC(c, 1.25), rnd(4, 7));
  }
  islandLand(s, broke) {
    const cx = (s.cx0 + s.w / 2) * CELL, by = (s.row + s.h) * CELL, big = Math.min(1.5, s.n / 300);
    if (Math.abs(cx - this.hero.x) < 700) { this.shake(Math.min(11, 1.5 + s.n / 45)); sfx("crash", big); }
    for (let i = 0; i < s.w; i += 2) this.parts.spawn(PT.SMOKE, (s.cx0 + i) * CELL, by - rnd(0, 8), rnd(-70, 70), rnd(-50, -5), rnd(1, 2.2), 0xffa8c0d0, rnd(5, 9));
    this.addScore(broke);
    for (const e of this.enemies) if (!e.dead && e.x > s.cx0 * CELL - 4 && e.x < (s.cx0 + s.w) * CELL + 4 && e.y > s.row * CELL && e.y < by + 12) e.hurt(99);
  }

  // ---- explosions
  fxKind(kind, x, y, o = {}) {
    const heavy = kind !== "spark" && kind !== "poof" && kind !== "muzzle";
    if (heavy) { if (this.fxBudget <= 0 || this.fx.ms > 10) return; this.fxBudget--; }
    const w = this.world, snap = () => { const gy = w.surfaceY(x, y - 6); return gy - y < 40 ? gy : y; };
    switch (kind) {
      case "spark": case "muzzle": this.fx.spawn(hitSpark, { x, y: y + 20, angle: 0, flip: Math.cos(o.angle ?? 0) < 0 }); break;
      case "small": this.fx.spawn(smallExplosion, { x, y: snap(), size: o.size ?? 1 }); break;
      case "big": if (this.fx.ms < 5) this.fx.spawn(bigExplosion, { x, y: snap() }); else this.fx.spawn(smallExplosion, { x, y: snap(), size: 1.5 }); break;
      case "plasma": this.fx.spawn(plasmaExplosion, { x, y }); break;
      case "dark": this.fx.spawn(darkExplosion, { x, y: y + 30 }); break;
      case "slam": this.fx.spawn(groundSlam, { x, y }); this.fx.spawn(thunderclap, { x, y }); break;
      case "land": this.fx.spawn(heavyLanding, { x, y }); break;
      case "crit": this.fx.spawn(critHit, { x, y: y + 26, flip: !!o.flip }); break;
      case "poof": this.fx.spawn(poof, { x, y }); break;
    }
  }
  /** An explosion in full: the world gives way, things nearby take it, sparks, smoke, shake, noise. */
  blast(x, y, r, power, o = {}) {
    const P = this.parts, n = this.world.explode(x, y, r, power, { fire: o.fire, debris: o.debris, kick: o.kick });
    this.addScore(n);
    const R = r * 1.25;
    this.eachEnemy(x, y, R, (e, d) => e.hurt(power * 2.2 * (1 - d / (R + e.hw)) + 1, ((e.x - x) / (d + 6)) * power * 45, -power * 28));
    const h = this.hero, dh = Math.hypot(h.x - x, h.cy - y);
    if (o.owner === "enemy" && dh < r + 6) { this.hurtHero(power * 1.5 * (1 - dh / (r + 6)) + 2); h.vx += ((h.x - x) / (dh + 6)) * 200; h.vy -= 120; }
    if (o.quiet) { for (let i = 0; i < 3; i++) P.spawn(PT.SPARK, x, y, rnd(-160, 160), rnd(-200, 60), rnd(0.2, 0.5), 0xff60c0ff); }
    else {
      for (let i = 0; i < r / 3; i++) { const a = rnd(0, 6.283), s = rnd(60, 380); P.spawn(PT.SPARK, x, y, Math.cos(a) * s, Math.sin(a) * s - 80, rnd(0.3, 0.9), 0xff40a8ff); }
      for (let i = 0; i < r / 6; i++) { const a = rnd(0, 6.283), d = rnd(0, r * 0.6); P.spawn(PT.FLAME, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * 40, Math.sin(a) * 40 - 30, rnd(0.3, 0.8), 0, rnd(3, 3 + r / 9)); }
      for (let i = 0; i < r / 8; i++) { const a = rnd(0, 6.283), d = rnd(0, r * 0.7); P.spawn(PT.SMOKE, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * 30, -rnd(10, 50), rnd(1, 2.4), 0xff3a3238, rnd(5, 6 + r / 7)); }
      if (o.metal) for (let i = 0; i < 14; i++) P.spawn(PT.DEBRIS, x, y - 4, rnd(-260, 260), rnd(-380, -60), rnd(1.5, 3), scaleC(o.metal, rnd(0.5, 1.1)), 2 + (i & 1));
      if (Math.abs(x - h.x) < 800) { this.shake(Math.min(11, r * 0.085)); sfx(r > 58 ? "bigboom" : "boom", (o.boom ?? 1) * r / 50); }
      this.flashLight(x, y, r * 2.2, 0xff50a0ff, 0.8, 0.3);
      if (this.world.inWater(x, y + 8)) for (let i = 0; i < r / 2; i++) P.spawn(PT.DROP, x + rnd(-r, r) * 0.6, SEA * CELL, rnd(-90, 90), rnd(-420, -120), 2, i & 1 ? 0xfffff0d0 : 0xffd8a868, 1 + (i & 1));
    }
    this.fxKind(o.kind ?? "small", x, y, o);
    return n;
  }

  // ---- what the hero does to the world
  superJump(x, y) { this.blast(x, y + 2, 26, 6, { kind: "land" }); sfx("fly"); }
  smashThrough(x, y, nx, ny) {
    const n = this.world.explode(x + nx * 6, y + ny * 6, 22, 9, { kick: 1.6, debris: 26, fire: 0.1 });
    this.eachEnemy(x, y, 28, (e) => e.hurt(30, nx * 400, -220));
    if (!n) return;
    this.addScore(n); this.shake(2.5); sfx("thud");
    for (let i = 0; i < 5; i++) this.parts.spawn(PT.SPARK, x, y + rnd(-12, 12), nx * rnd(60, 300) + rnd(-60, 60), ny * rnd(60, 300) + rnd(-120, 40), rnd(0.2, 0.6), 0xff60c0ff);
  }
  poundImpact(x, y, v) {
    this.blast(x, y, 72, 13, { kind: "slam", boom: 1.5 });
    this.freeze = 0.07; this.shake(11); this.flash = Math.max(this.flash, 0.2);
    for (let i = 1; i <= 4; i++) for (const s of [-1, 1]) this.later(i * 0.07, () => { const px = x + s * (50 + i * 34), py = this.world.surfaceY(px, y - 50); if (Math.abs(py - y) < 70) this.blast(px, py, 20 - i * 2, 6, { kind: "none", quiet: i > 2 }); });
  }
  heavyLanding(x, y) { this.blast(x, y, 28, 6, { kind: "land" }); }
  spray(x, y, dir) { for (let i = 0; i < 3; i++) this.parts.spawn(PT.DROP, x, y, dir * rnd(40, 160), rnd(-170, -40), 1.2, i & 1 ? 0xfffff0d0 : 0xffe0b070, 1 + (i & 1)); }
  splash(x, y, v) { this.fx.spawn(splashFx, { x, y }); for (let i = 0; i < 14; i++) this.parts.spawn(PT.DROP, x + rnd(-8, 8), y, rnd(-120, 120), rnd(-60, -v * 0.6 - 80), 1.5, 0xffe0b070, 1 + (i & 1)); }
  punch() {
    const h = this.hero;
    if (h.punchT > 0 || h.dead > 0) return;
    h.punchT = 0.3; h.fireT = 9;
    this.later(0.1, () => {
      const f = h.face, x = h.x + f * 22, y = h.y - 20;
      this.blast(x, y, 32, 11, { kind: "crit", flip: f < 0, kick: 2.2 });
      this.eachEnemy(x, y, 34, (e) => e.hurt(40, f * 600, -240));
      h.vx += f * 180; this.freeze = 0.045; sfx("punch");
    });
  }
  hurtHero(d) {
    const h = this.hero;
    if (h.inv > 0 || h.dead > 0) return;
    h.hp -= d; h.hurtT = 0; this.hurtFlash = 0.35; sfx("hurt"); this.shake(3);
    if (h.hp > 0) return;
    h.dead = 2.4; h.fly = false; h.pounding = false;
    this.blast(h.x, h.cy, 40, 8, { kind: "plasma" });
    this.say("NOVA DOWN", UI.red); this.heat = 0; this.comboN = 0; this.combo = 1; this.rank = 0;
  }

  // ---- enemies
  enemyAt(x, y, r) { for (const e of this.enemies) if (!e.dead && !e.wreck && e.hits(x, y, r)) return e; return null; }
  eachEnemy(x, y, r, fn) { for (const e of this.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - x, e.y - e.h / 2 - y); if (d < r + e.hw) fn(e, d); } }
  eachEnemyOnRay(x, y, c, s, len, rad, fn) { for (const e of this.enemies) { if (e.dead) continue; const dx = e.x - x, dy = e.y - e.h / 2 - y, u = dx * c + dy * s; if (u < 0 || u > len) continue; if (Math.abs(dx * s - dy * c) < rad + e.hw) fn(e, u); } }
  enemyShot(type, x, y, vx, vy) { this.eshots.push({ type, x, y, vx, vy, life: 3.5 }); if (type === "bullet") sfx("shot"); }
  spawnWave(dt) {
    const w = this.world, h = this.hero;
    for (const s of w.spawns.splice(0)) {
      if (this.enemies.length > 44) break;
      this.enemies.push(s.type === "soldier" ? new Soldier(this, s.x, s.y) : s.type === "car" ? new Car(this, s.x, s.y) : new Tank(this, s.x, s.y));
    }
    this.heat = Math.max(0, this.heat - 0.018 * dt);
    if ((this.spawnT -= dt) > 0 || h.dead > 0) return;
    this.spawnT = 3.2;
    let nS = 0, nH = 0, nT = 0;
    for (const e of this.enemies) { if (Math.abs(e.x - h.x) > 700) continue; if (e.kind === "soldier") nS++; else if (e.kind === "heli") nH++; else if (e.kind === "tank") nT++; }
    const side = Math.random() < 0.5 ? -1 : 1, lv = Math.floor(this.heat);
    if (lv >= 1 && nS < 2 + lv * 2) for (let i = 0; i < 1 + (lv >> 1); i++) this.enemies.push(new Soldier(this, h.x + side * rnd(120, 330) * (i & 1 ? -1 : 1), Math.min(h.y - 260, this.cam.y - H / 2 - 20), true));
    if (lv >= 2 && nH < Math.ceil((lv - 1) / 1.5)) { this.enemies.push(new Heli(this, h.x + side * 460, h.y - 220)); this.say("GUNSHIP INBOUND", UI.red); }
    if (lv >= 3 && nT < lv - 2) { const x = h.x - side * 430, y = w.surfaceY(x, 0); if (!w.wet(Math.floor(x / CELL)) && y < WORLD_PX_H - 40) this.enemies.push(new Tank(this, x, y)); }
  }
  stepEnemyShots(dt) {
    const w = this.world, h = this.hero;
    for (let i = this.eshots.length - 1; i >= 0; i--) {
      const s = this.eshots[i];
      if (s.type === "shell") s.vy += 500 * dt;
      if (s.type === "rocket") { const a = Math.atan2(h.cy - s.y, h.x - s.x), sp = Math.min(330, Math.hypot(s.vx, s.vy) + 200 * dt); const ca = Math.atan2(s.vy, s.vx); let d = a - ca; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; const na = ca + Math.max(-1.6 * dt, Math.min(1.6 * dt, d)); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; this.parts.spawn(PT.SMOKE, s.x, s.y, 0, 0, 0.5, 0xffa09ca0, 3); }
      let hit = false;
      const n = Math.max(1, Math.ceil(Math.hypot(s.vx, s.vy) * dt / 3));
      for (let k = 0; k < n && !hit; k++) {
        s.x += s.vx * dt / n; s.y += s.vy * dt / n;
        if (w.solidPx(s.x, s.y)) hit = true;
        else if (h.dead <= 0 && Math.abs(s.x - h.x) < 7 && s.y > h.y - 34 && s.y < h.y) { hit = true; if (s.type === "bullet") this.hurtHero(3); }
      }
      if ((s.life -= dt) <= 0) hit = true;
      if (!hit) continue;
      this.eshots.splice(i, 1);
      if (s.type === "bullet") { this.addScore(w.explode(s.x, s.y, 6, 2, { debris: 3, fire: 0 })); this.parts.spawn(PT.SPARK, s.x, s.y, -s.vx * 0.3 + rnd(-60, 60), -s.vy * 0.3 - 40, 0.3, 0xff80e0ff); }
      else this.blast(s.x, s.y, s.type === "shell" ? 28 : 30, 7, { owner: "enemy", kind: "small", size: 0.8 });
    }
  }

  // ---- one step of the world
  update(dt) {
    const I = this.I, h = this.hero, w = this.world;
    this.time += dt; this.fxBudget = 2;
    for (let i = this.timers.length - 1; i >= 0; i--) if ((this.timers[i].t -= dt) <= 0) { const t = this.timers.splice(i, 1)[0]; t.fn(); }
    const wasFly = h.fly, wasDash = h.dashing;
    h.weaponPose = WEAPONS[this.weapon].pose ?? null;
    h.update(dt, I);
    if (h.dead > 0) {
      if ((h.dead -= dt) <= 0) { h.dead = 0; h.hp = 100; h.inv = 2.5; h.vx = h.vy = 0; h.y = w.surfaceY(h.x, 0) - 2; this.fx.spawn(respawnBeam, { x: h.x, y: h.y, keep: true }); sfx("ready"); }
    } else {
      if (h.hurtT > 3) h.hp = Math.min(100, h.hp + 16 * dt);
      if (I.punchP) this.punch();
      this.cd -= dt; this.altCd = (this.altCd || 0) - dt;
      const wp = WEAPONS[this.weapon];
      // right click: the power's second move, or a punch if it has none
      if (I.altP) { if (wp.alt) { if (this.altCd <= 0) { wp.alt(this, h, I.aimX, I.aimY); this.altCd = wp.altCd ?? 0.5; h.fireT = 0; } } else this.punch(); }
      if (wp.empty) { /* free slot */ }
      else if (wp.tap || wp.hold) {
        // left click: a quick click taps, holding past HOLD_T holds
        const HOLD_T = 0.2;
        if (I.fire && h.punchT <= 0) {
          this.holdT = (this.holdT || 0) + dt;
          if (wp.hold && this.holdT >= HOLD_T) { wp.hold(this, h, I.aimX, I.aimY, this.holdT - HOLD_T, dt); this.holding = true; h.fireT = 0; }
        } else if (this.holdT > 0) {
          if (this.holding) wp.release?.(this, h, I.aimX, I.aimY, this.holdT - HOLD_T);
          else if (this.cd <= 0 && wp.tap) { wp.tap(this, h, I.aimX, I.aimY); this.cd = wp.cd; h.fireT = 0; }
          this.holdT = 0; this.holding = false;
        }
      } else if (wp.charge) {
        if (I.fire && h.punchT <= 0 && this.cd <= 0) { this.chargeT = (this.chargeT || 0) + dt; wp.charging(this, h, I.aimX, I.aimY, this.chargeT); h.fireT = 0; }
        else if (this.chargeT > 0) { wp.release(this, h, I.aimX, I.aimY, this.chargeT); this.chargeT = 0; this.cd = wp.cd; h.fireT = 0; }
      } else if (I.fire && h.punchT <= 0 && (wp.beam || this.cd <= 0)) { wp.fire(this, h, I.aimX, I.aimY, dt); this.cd = wp.cd; h.fireT = 0; }
      if (I.nukeP && this.nuke >= 1) { this.nuke = 0; const y = w.solidPx(I.aimX, I.aimY) ? I.aimY : w.surfaceY(I.aimX, I.aimY); nuke(this, I.aimX, y); this.say("NUKE!", UI.red); }
      // trails
      if (h.fly && h.speed > 90) { const [fx, fy] = h.local(0, 2); for (let i = 0; i < (h.dashing ? 3 : 1); i++) this.parts.spawn(PT.FLAME, fx + rnd(-2, 2), fy + rnd(-2, 2), -h.vx * 0.2 + rnd(-20, 20), -h.vy * 0.2 + rnd(-20, 20), rnd(0.2, 0.45), 0, h.dashing ? 3 : 2); }
      if (h.dashing && h.onGround && Math.abs(h.vx) > 300 && Math.random() < 0.5) this.parts.spawn(PT.SMOKE, h.x - h.face * 8, h.y - 2, -h.vx * 0.1, -10, 0.5, 0xffb0c4d0, 4);
      if (h.fly && h.dashing && !wasDash && h.speed > 100) { this.fx.spawn(manaBurst, { x: h.x, y: h.cy + 30 }); sfx("fly"); }
    }
    w.update(dt);
    this.spawnWave(dt);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (Math.abs(e.x - h.x) < 900) e.update(dt);
      if (e.dead || Math.abs(e.x - h.x) > 2200) { if (e.dead && !e.wreck && e.kind !== "heli") this.addScore(e.score, e.x, e.y); this.enemies.splice(i, 1); }
    }
    for (let i = this.shots.length - 1; i >= 0; i--) if (!this.shots[i].update(dt)) this.shots.splice(i, 1);
    this.stepEnemyShots(dt);
    this.parts.update(dt);
    this.fx.update(dt);
    for (let i = this.lights.length - 1; i >= 0; i--) if ((this.lights[i].t += dt) >= this.lights[i].life) this.lights.splice(i, 1);
    if (this.beam && (this.beam.t -= dt) <= 0) this.beam = null;
    if (this.beam2 && (this.beam2.t -= dt) <= 0) this.beam2 = null;
    if (this.comboT > 0 && (this.comboT -= dt) <= 0) { this.comboN = 0; this.combo = 1; this.rank = 0; }
    if (this.banner && (this.banner.t += dt) > 2) this.banner = null;
    // birds drift across now and then
    if (this.critters.length < 3 && Math.random() < dt * 0.25) { const dir = Math.random() < 0.5 ? -1 : 1; this.critters.push({ fx: this.fx.spawn(birdFx, { x: h.x - dir * 420, y: h.y - rnd(120, 260), flip: dir < 0, keep: true }), dir, t: 0 }); }
    for (let i = this.critters.length - 1; i >= 0; i--) { const c = this.critters[i]; c.fx.fx.options.x += c.dir * 70 * dt; if ((c.t += dt) > 14) { c.fx.dead = true; this.critters.splice(i, 1); } }
    const z = w.biomeAt(Math.floor(h.x / CELL));
    if (z !== this.zone) { if (this.zone !== null) this.say(BIOME_NAMES[z], UI.white); this.zone = z; }
    this.maxX = Math.max(this.maxX, Math.abs(h.x));
    if (this.score > this.best) { this.best = this.score; }
    I.jumpP = I.poundP = I.punchP = I.nukeP = I.altP = false;
  }

  // ---- the picture
  render(dt) {
    const f = this.frame, h = this.hero, I = this.I;
    const lookX = h.vx * 0.22 + (I.aimX - h.x) * 0.12, lookY = h.vy * 0.12 + (I.aimY - h.cy) * 0.1 - 30;
    this.cam.x += (h.x + lookX - this.cam.x) * Math.min(1, 6 * dt);
    this.cam.y += (h.cy + lookY - this.cam.y) * Math.min(1, 6 * dt);
    this.cam.y = Math.min(this.cam.y, WORLD_PX_H - H / 2 - 8);
    this.shakeAmp *= Math.max(0, 1 - 7 * dt);
    const sx = this.shakeAmp > 0.3 ? Math.round(rnd(-1, 1) * this.shakeAmp) : 0, sy = this.shakeAmp > 0.3 ? Math.round(rnd(-1, 1) * this.shakeAmp) : 0;
    const camX = Math.round(this.cam.x - W / 2) + sx, camY = Math.round(this.cam.y - H / 2) + sy;
    f.ox = camX; f.oy = camY;
    f.light.fill(0);
    drawSky(f, camX, camY, this.time);
    this.world.render(f, camX, camY, this.time);
    this.world.renderIslands(f, camX, camY);
    this.fx.draw(f, true);
    for (const e of this.enemies) if (e.x > camX - 60 && e.x < camX + W + 60) e.draw(f);
    for (const s of this.eshots) this.drawShot(f, s);
    h.draw(f);
    for (const s of this.shots) s.draw(f);
    this.parts.draw(f, camX, camY, "main");
    this.fx.draw(f, false);
    this.parts.draw(f, camX, camY, "smoke");
    const p = painterFor(f);
    p.place(0, 0);
    for (const l of this.lights) { const u = 1 - l.t / l.life; if (l.x > camX - l.r && l.x < camX + W + l.r) p.glow(l.x, l.y, l.r, l.c, l.k * u * u); }
    if (this.beam) this.drawBeam(p, this.beam);
    if (this.beam2) { const b = this.beam2; p.rect(b.x - 7, b.y0, 14, b.y1 - b.y0, 0xfffff8e0); p.rect(b.x - 4, b.y0, 8, b.y1 - b.y0, 0xffffffff); for (let y = Math.max(b.y0, camY); y < Math.min(b.y1, camY + H); y += 18) p.glow(b.x, y, 34, 0xffffe0a0, 0.6); }
    this.hud(p, camX, camY);
    // color + light, then full-screen flashes
    const C = f.color, L = f.light, out = this.out, fl = Math.min(1, this.flash) * 255, hf = this.hurtFlash > 0 ? this.hurtFlash / 0.35 : 0;
    for (let i = 0; i < W * H; i++) {
      const c = C[i], l = L[i];
      if ((l & 0xffffff) === 0 && fl === 0) { out[i] = c | 0xff000000; continue; }
      const r = Math.min(255, (c & 255) + (l & 255) + fl), g = Math.min(255, ((c >> 8) & 255) + ((l >> 8) & 255) + fl), b = Math.min(255, ((c >> 16) & 255) + ((l >> 16) & 255) + fl);
      out[i] = 0xff000000 | (b << 16) | (g << 8) | r;
    }
    if (hf > 0 || h.hp < 35) {
      const k = Math.max(hf, h.hp < 35 && h.dead <= 0 ? 0.35 + Math.sin(this.time * 8) * 0.15 : 0);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x += (x === 27 && y > 27 && y < H - 28) ? W - 55 : 1) {
        const e = Math.min(x, W - 1 - x, y, H - 1 - y);
        if (e > 27) continue;
        const a = k * (1 - e / 28), i = y * W + x, c = out[i];
        out[i] = 0xff000000 | ((((c >> 16) & 255) * (1 - a)) << 16) | ((((c >> 8) & 255) * (1 - a)) << 8) | Math.min(255, (c & 255) + 200 * a);
      }
    }
    this.flash = Math.max(0, this.flash - dt * 1.6); this.hurtFlash -= dt;
    this.ctx.putImageData(this.img, 0, 0);
  }
  drawShot(f, s) {
    const x = Math.round(s.x) - f.ox, y = Math.round(s.y) - f.oy, C = f.color, L = f.light;
    if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) return;
    if (s.type === "bullet") { const sp = Math.hypot(s.vx, s.vy), ux = s.vx / sp, uy = s.vy / sp; for (let k = 0; k < 5; k++) { const i = Math.round(y - uy * k) * W + Math.round(x - ux * k); C[i] = k < 2 ? 0xffe0ffff : 0xff40a0ff; L[i] = 0xff205080; } }
    else { for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { C[(y + b) * W + x + a] = s.type === "shell" ? 0xff202428 : 0xff4050c0; L[(y + b) * W + x + a] = 0xff103060; } }
  }
  drawBeam(p, b) {
    const dx = b.x1 - b.x0, dy = b.y1 - b.y0, len = Math.hypot(dx, dy) || 1, j = Math.random() * 2;
    p.beam(b.x0, b.y0, b.x1, b.y1, 4 + j, 0xff2020e0); p.beam(b.x0, b.y0, b.x1, b.y1, 2, 0xff60b0ff); p.line(b.x0, b.y0, b.x1, b.y1, 0xffffffff);
    for (let d = 0; d < len; d += 9) p.glow(b.x0 + dx * d / len, b.y0 + dy * d / len, 9, 0xff3040ff, 0.55);
    p.glow(b.x1, b.y1, 22, 0xff60a0ff, 0.9); p.circle(b.x1, b.y1, 3 + j, 0xffffffff);
  }
  hud(p, camX, camY) {
    p.place(camX, camY);
    const h = this.hero, t = (s, x, y, c, o = {}) => p.text(s, x, y, c, { font: "big", outline: UI.ink, ...o });
    // health and nuke meters
    p.rect(8, 8, 124, 11, UI.ink); p.rect(10, 10, 120, 7, UI.panel); p.rect(10, 10, Math.max(0, h.hp) * 1.2, 7, h.hp < 35 ? UI.red : UI.green); p.rect(10, 10, Math.max(0, h.hp) * 1.2, 2, UI.white, 0.5);
    p.rect(8, 21, 124, 8, UI.ink); p.rect(10, 23, 120, 4, UI.panel); p.rect(10, 23, this.nuke * 120, 4, this.nuke >= 1 ? (Math.floor(this.time * 6) & 1 ? UI.cyan : UI.white) : UI.orange);
    p.text(this.nuke >= 1 ? "NUKE READY - R" : "NUKE", 136, 23, this.nuke >= 1 ? UI.cyan : UI.dim, { outline: UI.ink });
    p.text("NOVA", 136, 11, UI.white, { outline: UI.ink });
    // score, combo, heat
    t(String(this.score).padStart(8, "0"), W - 8, 8, UI.white, { align: "right" });
    p.text("BEST " + this.best, W - 8, 19, UI.dim, { align: "right", outline: UI.ink });
    if (this.combo > 1) { const pulse = this.comboT > 2.4 ? 2 : 1; t("x" + this.combo, W - 8, 30, this.combo > 12 ? UI.red : this.combo > 5 ? UI.orange : UI.gold, { align: "right", scale: pulse + 1 }); p.rect(W - 68, 30 + 8 * (pulse + 1) + 2, 60 * (this.comboT / 2.6), 2, UI.gold); }
    for (let i = 0; i < 5; i++) { const on = this.heat >= i + 1, x = W / 2 - 34 + i * 14; p.text("*", x, 8, on ? UI.red : UI.panel, { font: "big", scale: 2, outline: UI.ink }); }
    p.text(Math.round(this.maxX / 10) + " M", W / 2, 26, UI.dim, { align: "center", outline: UI.ink });
    // weapons
    const n = WEAPONS.length, bw = 30, x0 = (W - n * bw) / 2, y0 = H - 22;
    for (let i = 0; i < n; i++) {
      const sel = i === this.weapon, x = x0 + i * bw;
      p.rect(x, y0 - (sel ? 3 : 0), bw - 2, 14 + (sel ? 3 : 0), sel ? UI.ink : UI.panel);
      p.rect(x + 2, y0 + 9, bw - 6, 2, WEAPONS[i].col);
      p.text(String((i + 1) % 10), x + bw / 2 - 1, y0 + (sel ? -1 : 1), sel ? UI.white : UI.dim, { font: "big", align: "center" });
    }
    t(WEAPONS[this.weapon].name, W / 2, y0 - 16, UI.white, { align: "center" });
    if (this.cd > 0.15 && WEAPONS[this.weapon].cd > 0.5) p.rect(W / 2 - 20, y0 - 6, 40 * (1 - this.cd / WEAPONS[this.weapon].cd), 2, UI.cyan);
    if (this.banner) { const b = this.banner, k = b.t < 0.12 ? 3 : 2, a = b.t > 1.5 ? 1 - (b.t - 1.5) / 0.5 : 1; t(b.text, W / 2, 70 - (k - 2) * 4, b.c, { align: "center", scale: k, a }); }
    if (!this.touch) { const mx = this.I.aimX - camX, my = this.I.aimY - camY; p.rect(mx - 5, my, 4, 1, UI.white); p.rect(mx + 2, my, 4, 1, UI.white); p.rect(mx, my - 5, 1, 4, UI.white); p.rect(mx, my + 2, 1, 4, UI.white); p.px(mx, my, UI.red); }
    if (this.showFps) p.text(Math.round(this.fps) + " FPS  FX " + this.fx.list.length + " " + this.fx.ms.toFixed(1) + "MS  P " + this.parts.n, 8, 34, UI.dim, { outline: UI.ink });
  }
}

// ---- boot, input, loop
const canvas = document.getElementById("game");
canvas.width = W; canvas.height = H;
const game = new Game(canvas);
window.game = game;
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H), k = s >= 1 ? Math.floor(s * (devicePixelRatio || 1)) / (devicePixelRatio || 1) : s;
  canvas.style.width = W * k + "px"; canvas.style.height = H * k + "px";
}
addEventListener("resize", fit); fit();

const keys = new Set(), I = game.I;
let mouseX = W / 2 + 80, mouseY = H / 2, mouseFire = false;
const setWeapon = (i) => { const n = WEAPONS.length; game.weapon = ((i % n) + n) % n; game.chargeT = 0; game.holdT = 0; game.holding = false; game.cd = Math.min(game.cd, 0.2); sfx("swap"); };
addEventListener("keydown", (e) => {
  if (e.repeat) { if (["Space", "ArrowUp", "ArrowDown", "Tab"].includes(e.code)) e.preventDefault(); return; }
  const c = e.code;
  keys.add(c);
  if (c === "Space") { I.jumpP = true; e.preventDefault(); }
  if (c === "KeyC" || c === "ControlLeft") I.poundP = true;
  if (c === "KeyF") I.punchP = true;
  if (c === "KeyR") I.nukeP = true;
  if (c === "KeyQ") setWeapon(game.weapon - 1);
  if (c === "KeyE" || c === "Tab") { setWeapon(game.weapon + 1); e.preventDefault(); }
  if (c.startsWith("Digit")) { const d = +c.slice(5); setWeapon(d === 0 ? 9 : d - 1); }
  if (c === "KeyP") game.showFps = !game.showFps;
  start();
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => { keys.clear(); mouseFire = false; });
const toCanvas = (e) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
addEventListener("mousemove", (e) => { [mouseX, mouseY] = toCanvas(e); });
addEventListener("mousedown", (e) => { if (e.target.closest && e.target.closest("#help")) return; start(); [mouseX, mouseY] = toCanvas(e); if (e.button === 0) mouseFire = true; if (e.button === 2) I.altP = true; });
addEventListener("mouseup", (e) => { if (e.button === 0) mouseFire = false; });
addEventListener("contextmenu", (e) => e.preventDefault());
addEventListener("wheel", (e) => { setWeapon(game.weapon + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });

// touch: left stick moves, right stick aims and fires, buttons for the rest
const T = { move: null, aim: null, ax: 1, ay: 0, firing: false, dash: false };
const pads = document.getElementById("pads");
function touchSetup() {
  game.touch = true; pads.style.display = "block";
  const stick = (el, st) => {
    const knob = el.firstElementChild;
    const set = (e) => { const r = el.getBoundingClientRect(), t = [...e.touches].find((q) => q.identifier === st.id); if (!t) return; let dx = (t.clientX - r.left - r.width / 2) / (r.width / 2), dy = (t.clientY - r.top - r.height / 2) / (r.height / 2); const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } st.x = dx; st.y = dy; knob.style.transform = `translate(${dx * 34}px,${dy * 34}px)`; };
    el.addEventListener("touchstart", (e) => { e.preventDefault(); start(); st.id = e.changedTouches[0].identifier; st.on = true; set(e); }, { passive: false });
    el.addEventListener("touchmove", (e) => { e.preventDefault(); set(e); }, { passive: false });
    const end = (e) => { e.preventDefault(); st.on = false; st.x = st.y = 0; knob.style.transform = ""; };
    el.addEventListener("touchend", end, { passive: false }); el.addEventListener("touchcancel", end, { passive: false });
  };
  T.move = { x: 0, y: 0, on: false }; T.aim = { x: 0, y: 0, on: false };
  stick(document.getElementById("stickL"), T.move); stick(document.getElementById("stickR"), T.aim);
  const btn = (id, down, up) => { const el = document.getElementById(id); el.addEventListener("touchstart", (e) => { e.preventDefault(); start(); el.classList.add("on"); down(); }, { passive: false }); el.addEventListener("touchend", (e) => { e.preventDefault(); el.classList.remove("on"); up && up(); }, { passive: false }); };
  btn("bJump", () => { I.jumpP = true; T.jump = true; }, () => (T.jump = false));
  btn("bDash", () => (T.dash = true), () => (T.dash = false));
  btn("bPound", () => (I.poundP = true));
  btn("bPunch", () => (I.altP = true));
  btn("bNext", () => setWeapon(game.weapon + 1));
  btn("bNuke", () => (I.nukeP = true));
}
addEventListener("touchstart", () => { if (!game.touch) touchSetup(); }, { once: true, passive: true });

function start() {
  if (game.started) return;
  game.started = true; initAudio();
  document.getElementById("help").classList.add("hide");
}
document.getElementById("help").addEventListener("click", start);
document.getElementById("help").addEventListener("touchend", (e) => { e.preventDefault(); if (!game.touch) touchSetup(); start(); }, { passive: false });

function readInput() {
  const h = game.hero, f = game.frame;
  if (game.touch) {
    I.mx = Math.abs(T.move.x) > 0.25 ? Math.sign(T.move.x) * (h.fly ? Math.abs(T.move.x) : 1) : 0; I.my = Math.abs(T.move.y) > 0.3 ? T.move.y : 0;
    if (T.aim.on && Math.hypot(T.aim.x, T.aim.y) > 0.25) { const m = Math.hypot(T.aim.x, T.aim.y); T.ax = T.aim.x / m; T.ay = T.aim.y / m; I.fire = true; } else I.fire = false;
    I.aimX = h.x + T.ax * 170; I.aimY = h.cy + T.ay * 170;
    I.jump = !!T.jump; I.dash = T.dash;
  } else {
    I.mx = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    I.my = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
    I.jump = keys.has("Space"); I.dash = keys.has("ShiftLeft") || keys.has("ShiftRight");
    I.fire = mouseFire; I.aimX = f.ox + mouseX; I.aimY = f.oy + mouseY;
  }
}

let last = performance.now(), saveT = 0;
function tick(now) {
  const raw = Math.min(0.05, (now - last) / 1000); last = now;
  game.fps = game.fps * 0.95 + (1 / Math.max(raw, 0.001)) * 0.05;
  readInput();
  if (game.started) {
    if (game.freeze > 0) game.freeze -= raw; else game.update(Math.min(raw, 1 / 30));
  } else { game.time += raw; game.world.update(raw); game.parts.update(raw); game.fx.update(raw); }
  game.render(raw);
  if ((saveT += raw) > 5) { saveT = 0; try { localStorage.setItem("nova-best", String(game.best)); } catch (e) { /* private mode */ } }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
