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
import * as fishFx from "../vendor/pixelfx/src/fx/critters/fish-school.js";
import * as tracerFx from "../vendor/pixelfx/src/fx/projectiles/bullet-tracer.js";
import * as rocketFx from "../vendor/pixelfx/src/fx/projectiles/rocket.js";
import * as flareFx from "../vendor/pixelfx/src/fx/projectiles/flare.js";
import * as muzzlePistol from "../vendor/pixelfx/src/fx/projectiles/muzzle-pistol.js";
import * as muzzleShotgun from "../vendor/pixelfx/src/fx/projectiles/muzzle-shotgun.js";
import * as muzzleSmg from "../vendor/pixelfx/src/fx/projectiles/muzzle-smg.js";
import { ScaledFx } from "./scaled.js";
const MUZZLE = { pistol: muzzlePistol, shotgun: muzzleShotgun, smg: muzzleSmg };
import { World, CELL, WORLD_PX_H, MAT_COLOR, M, SEA, BIOME_NAMES, WH, LAVA } from "./world.js";
import { Parts, PT } from "./particles.js";
import { FxMan } from "./fxm.js";
import { Hero } from "./hero.js";
import { Soldier, Car, Tank, Heli, Jet } from "./enemies.js";
import { WEAPONS, nuke } from "./weapons.js";
import { Moon } from "./powers2.js";
import { drawSky } from "./sky.js";
import { initAudio, sfx } from "./audio.js";

let W = 640, H = 360;
const rnd = (a, b) => a + Math.random() * (b - a);
const scaleC = (c, k) => 0xff000000 | (Math.min(255, ((c >> 16) & 255) * k) << 16) | (Math.min(255, ((c >> 8) & 255) * k) << 8) | Math.min(255, (c & 255) * k);
const K = hex;
const UI = { white: K("#fff8e8"), ink: K("#17121f"), red: K("#ff4a3c"), gold: K("#ffc83c"), cyan: K("#7ff3ff"), dim: K("#8a8494"), green: K("#6cdc5a"), orange: K("#ff8a2a"), panel: K("#221c2c") };
const RANKS = [[250, "DEMOLITION!"], [700, "RAMPAGE!"], [1500, "DEVASTATION!"], [3000, "CATACLYSM!"], [6000, "APOCALYPSE!"], [12000, "EXTINCTION EVENT!"]];

class Game {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.resize();
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
  moonImpact(x, y) { nuke(this, x, y); this.say("NUKE!", UI.red); }
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
    this.nuke = Math.min(1, this.nuke + n / 14000);
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
      case "plasma": this.fx.spawn(plasmaExplosion, o.palette ? { x, y, palette: o.palette } : { x, y }); break;
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
    if (o.owner === "enemy" && this.pets) for (const p of this.pets) { const d = Math.hypot(p.x - x, p.cy - y); if (d < r + p.r) p.hurt(power * 1.5 * (1 - d / (r + p.r)) + 2); }
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
  /** Bodies colliding: the hero at speed rams through soldiers, batters vehicles over a few hits, and can't pass
   *  through them; every knock costs him a little too, a tank most. */
  ram(dt) {
    const h = this.hero;
    if (h.dead > 0) return;
    const HITS = { soldier: 1, car: 2, jet: 2, heli: 3, tank: 4 }, HURT = { soldier: 1, car: 3, jet: 4, heli: 4, tank: 9 };
    for (const e of this.enemies) {
      if (e.dead || e.wreck || !HITS[e.kind]) continue;
      if ((e.bumpT = (e.bumpT || 0) - dt) > 0) continue;
      const ox = h.hw + e.hw - Math.abs(h.x - e.x), oy = Math.min(h.y, e.y) - Math.max(h.y - h.h, e.y - e.h);
      if (ox <= 0 || oy <= 0) continue;
      const rel = Math.hypot(h.vx - (e.vx || 0), h.vy - (e.vy || 0)), fast = rel > 150 || h.dashing || h.pounding;
      const side = h.x < e.x ? -1 : 1, cx = (h.x + e.x) / 2, cy = Math.max(h.y - h.h, e.y - e.h) + oy / 2;
      if (e.kind === "soldier" && !fast) continue;
      e.bumpT = 0.45;
      if (fast) {
        e.ramHp = e.ramHp || e.hp;
        const n = HITS[e.kind];
        e.hurt(e.kind === "soldier" ? 99 : Math.ceil(e.ramHp / n) + 0.01, -side * 260, -140);
        if (e.kind === "jet" && !e.dead) e.boost = 1.7;
        this.fxKind("spark", cx, cy, { angle: side > 0 ? Math.PI : 0 });
        sfx("punch"); this.shake(e.kind === "tank" ? 5 : 2);
        this.hurtHero(HURT[e.kind]);
      }
      // no passing through anything bigger than a man
      if (e.kind !== "soldier") {
        h.x += side * (ox + 1);
        h.vx = side * Math.max(120, Math.abs(h.vx) * 0.35);
        if (h.fly) h.vy *= 0.4;
      }
    }
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
  enemyShot(type, x, y, vx, vy) {
    const s = { type, x, y, vx, vy, life: type === "pellet" ? 0.55 : 3.5 };
    if ((type === "bullet" || type === "pellet") && this.eshots.length < 60) s.fx = new ScaledFx(tracerFx, { length: type === "pellet" ? 24 : 44, sx: 0.4, sy: 0.5 });
    else if (type === "rocket" || type === "rpg") s.fx = new ScaledFx(rocketFx, { sx: type === "rpg" ? 0.16 : 0.22 });
    if (s.fx) { s.fx.aim(Math.atan2(vy, vx)); s.fx.x = x; s.fx.y = y; }
    this.eshots.push(s);
    if (type === "bullet" || type === "pellet") sfx("shot");
  }
  /** A short-lived scaled effect in the world (muzzle flashes, flares), capped so a crowd can't flood the frame. */
  vfx(mod, o) {
    this.vfxN = this.vfxN || 0;
    if (this.vfxN > 24) return;
    const s = new ScaledFx(mod, o), g = this; this.vfxN++;
    this.shots.push({ update(dt) { s.update(dt); if (s.done()) { g.vfxN--; return false; } return true; }, draw(f) { s.draw(f); } });
  }
  muzzle(gun, x, y, face) { if (Math.abs(x - this.cam.x) < W && MUZZLE[gun]) this.vfx(MUZZLE[gun], { x, y: y + 9, sx: 0.35, flip: face < 0 }); }
  callFlare(x, y) {
    if ((this.flareCd || 0) > this.time) return false;
    this.flareCd = this.time + 16;
    this.vfx(flareFx, { x, y, sx: 0.6 });
    this.say("FLARE! REINFORCEMENTS", UI.red); sfx("rocket");
    this.later(2, () => { const h = this.hero; for (let i = 0; i < 2; i++) { const px = x + rnd(-120, 120); this.enemies.push(new Soldier(this, px, this.paraY(px), true)); } });
    return true;
  }
  /** Where a paratrooper starts: in the air above the open ground, never inside rock and never up in space. */
  paraY(x) { return this.world.surfaceY(x, 0) - rnd(180, 240); }
  spawnWave(dt) {
    const w = this.world, h = this.hero;
    let close = 0; for (const e of this.enemies) if (!e.dead && Math.abs(e.x - h.x) < 700) close++;
    for (const s of w.spawns.splice(0)) {
      if (this.enemies.length > 22 || close >= 12) break;
      if (s.type === "soldier" && Math.random() < 0.5) continue;
      close++;
      this.enemies.push(s.type === "soldier" ? new Soldier(this, s.x, s.y) : s.type === "car" ? new Car(this, s.x, s.y) : new Tank(this, s.x, s.y));
    }
    this.heat = Math.max(0, this.heat - 0.018 * dt);
    if ((this.spawnT -= dt) > 0 || h.dead > 0) return;
    this.spawnT = 4.5;
    let near = 0; for (const e of this.enemies) if (!e.dead && Math.abs(e.x - h.x) < 600) near++;
    if (near >= 12) return;
    let nS = 0, nH = 0, nT = 0, nJ = 0;
    for (const e of this.enemies) { if (Math.abs(e.x - h.x) > 700) continue; if (e.kind === "soldier") nS++; else if (e.kind === "heli") nH++; else if (e.kind === "tank") nT++; else if (e.kind === "jet") nJ++; }
    const side = Math.random() < 0.5 ? -1 : 1, lv = Math.floor(this.heat);
    if (lv >= 1 && nS < 2 + lv) for (let i = 0; i < 1 + (lv >> 2); i++) { const x = h.x + side * rnd(160, 330) * (i & 1 ? -1 : 1); this.enemies.push(new Soldier(this, x, this.paraY(x), true)); }
    if (lv >= 2 && nH < Math.ceil((lv - 1) / 2)) { const x = h.x + side * 460; this.enemies.push(new Heli(this, x, w.groundPx(x) - 200)); this.say("GUNSHIP INBOUND", UI.red); }
    if (lv >= 4 && nJ < lv - 3) { this.enemies.push(new Jet(this, h.x - side * 600, side)); if (!nJ) this.say("JETS INBOUND", UI.red); }
    if (lv >= 3 && nT < lv - 2) { const x = h.x - side * 430, y = w.surfaceY(x, 0); if (!w.wet(Math.floor(x / CELL)) && y < WORLD_PX_H - 40) this.enemies.push(new Tank(this, x, y)); }
  }
  stepEnemyShots(dt) {
    const w = this.world, h = this.hero;
    for (let i = this.eshots.length - 1; i >= 0; i--) {
      const s = this.eshots[i];
      if (s.type === "shell") s.vy += 500 * dt;
      if (s.fx) { s.fx.update(dt); s.fx.aim(Math.atan2(s.vy, s.vx)); }
      if (s.type === "rocket") { const a = Math.atan2(h.cy - s.y, h.x - s.x), sp = Math.min(330, Math.hypot(s.vx, s.vy) + 200 * dt); const ca = Math.atan2(s.vy, s.vx); let d = a - ca; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; const na = ca + Math.max(-1.6 * dt, Math.min(1.6 * dt, d)); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; this.parts.spawn(PT.SMOKE, s.x, s.y, 0, 0, 0.5, 0xffa09ca0, 3); }
      let hit = false;
      const n = Math.max(1, Math.ceil(Math.hypot(s.vx, s.vy) * dt / 3));
      for (let k = 0; k < n && !hit; k++) {
        s.x += s.vx * dt / n; s.y += s.vy * dt / n;
        if (w.solidPx(s.x, s.y)) hit = true;
        else if (h.dead <= 0 && Math.abs(s.x - h.x) < 7 && s.y > h.y - 34 && s.y < h.y) { hit = true; if (s.type === "bullet" || s.type === "pellet") this.hurtHero(s.type === "pellet" ? 2 : 3); }
        else if (this.pets) { const p = this.pets.find((q) => q.hits(s.x, s.y, 2)); if (p) { hit = true; if (s.type === "bullet" || s.type === "pellet") p.hurt(3); } }
      }
      if ((s.life -= dt) <= 0) hit = true;
      if (!hit) continue;
      this.eshots.splice(i, 1);
      if (s.fx) { s.fx.x = s.x; s.fx.y = s.y; }
      if (s.type === "pellet") continue;
      if (s.type === "bullet") { this.addScore(w.explode(s.x, s.y, 6, 2, { debris: 3, fire: 0 })); this.parts.spawn(PT.SPARK, s.x, s.y, -s.vx * 0.3 + rnd(-60, 60), -s.vy * 0.3 - 40, 0.3, 0xff80e0ff); }
      else this.blast(s.x, s.y, s.type === "shell" ? 28 : 30, 7, { owner: "enemy", kind: "small", size: 0.8 });
    }
  }

  /** Match the picture to the screen: 360 pixels tall, as wide as the screen's shape asks. */
  resize() {
    this.canvas.width = W; this.canvas.height = H;
    this.img = this.ctx.createImageData(W, H); this.out = new Uint32Array(this.img.data.buffer);
    const old = this.frame; this.frame = createFrame(W, H); if (old) { this.frame.ox = old.ox; this.frame.oy = old.oy; }
  }
  /** The aim mark, in the shape and size picked in the settings. */
  drawReticle(p, mx, my) {
    const o = this.reticle || { shape: "cross", size: 2 }, k = o.size, c = UI.white, ink = UI.ink;
    const dot = (x, y, w, h, col) => { p.rect(x - 1, y - 1, w + 2, h + 2, ink, 0.6); p.rect(x, y, w, h, col); };
    if (o.shape === "cross" || o.shape === "plus") {
      const g = o.shape === "cross" ? 1 + k : 0, L = 2 + k * 2;
      dot(mx - g - L, my, L, 1, c); dot(mx + g + 1, my, L, 1, c); dot(mx, my - g - L, 1, L, c); dot(mx, my + g + 1, 1, L, c);
      if (g) p.px(mx, my, UI.red); else p.px(mx, my, UI.red);
    } else if (o.shape === "circle") {
      const R = 3 + k * 2; p.ring(mx, my, R + 1, 3, ink, 0.6); p.ring(mx, my, R, 1, c); p.px(mx, my, UI.red);
    } else if (o.shape === "x") {
      const L = 2 + k * 2;
      for (let i = 2; i < L + 2; i++) for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { p.rect(mx + sx * i - 1, my + sy * i - 1, 3, 3, ink, 0.5); }
      for (let i = 2; i < L + 2; i++) for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) p.px(mx + sx * i, my + sy * i, c);
      p.px(mx, my, UI.red);
    } else { const r = k; p.rect(mx - r - 1, my - r - 1, r * 2 + 3, r * 2 + 3, ink, 0.6); p.rect(mx - r, my - r, r * 2 + 1, r * 2 + 1, UI.red); }
  }
  /** Which hotbar slot is under a point on the screen, or -1. */
  slotAt(x, y) {
    const n = WEAPONS.length, bw = 30, x0 = (W - n * bw) / 2, y0 = H - 22;
    if (y < y0 - 6 || y > y0 + 16 || x < x0 || x >= x0 + n * bw) return -1;
    return Math.floor((x - x0) / bw);
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
      // the molten floor of the world: it burns and throws you back up
      if (h.y > (WH - LAVA) * CELL - 3) { h.inv = 0; this.hurtHero(12); h.vy = -650; for (let i = 0; i < 12; i++) this.parts.spawn(PT.FLAME, h.x + rnd(-6, 6), h.y, rnd(-60, 60), -rnd(60, 200), rnd(0.3, 0.6), 0, 3); }
      if (I.punchP) this.punch();
      this.cd -= dt; this.altCd = (this.altCd || 0) - dt;
      const wp = WEAPONS[this.weapon];
      // right click: the power's second move, or a punch if it has none
      if (wp.altHold) {
        if (I.alt) { this.altT = (this.altT || 0) + dt; wp.altHold(this, h, I.aimX, I.aimY, this.altT, dt); h.fireT = 0; }
        else if (this.altT) { if (this.altT > 0) wp.altRelease(this, h, I.aimX, I.aimY, this.altT); this.altT = 0; }
      } else if (I.altP) { if (wp.alt) { if (this.altCd <= 0) { this.altQ = { wp, x: I.aimX, y: I.aimY }; this.altCd = wp.altCd ?? 0.5; } } else this.punch(); }
      // big moves go one after another: a queued one waits for the last to finish
      if (this.altQ && !(this.spell && this.spell.some((s) => this.shots.includes(s)))) { const q = this.altQ; this.altQ = null; const n0 = this.shots.length; q.wp.alt(this, h, q.x, q.y); this.spell = this.shots.slice(n0); h.fireT = 0; }
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
      if (I.nukeP && this.nuke >= 1) { this.nuke = 0; const y = w.solidPx(I.aimX, I.aimY) ? I.aimY : w.surfaceY(I.aimX, I.aimY); this.shots.push(new Moon(this, h, I.aimX, y)); }
      // trails
      if (h.fly && h.speed > 90) { const [fx, fy] = h.local(0, 2); for (let i = 0; i < (h.dashing ? 3 : 1); i++) this.parts.spawn(PT.FLAME, fx + rnd(-2, 2), fy + rnd(-2, 2), -h.vx * 0.2 + rnd(-20, 20), -h.vy * 0.2 + rnd(-20, 20), rnd(0.2, 0.45), 0, h.dashing ? 3 : 2); }
      if (h.dashing && h.onGround && Math.abs(h.vx) > 300 && Math.random() < 0.5) this.parts.spawn(PT.SMOKE, h.x - h.face * 8, h.y - 2, -h.vx * 0.1, -10, 0.5, 0xffb0c4d0, 4);
      if (h.fly && h.dashing && !wasDash && h.speed > 100) { this.fx.spawn(manaBurst, { x: h.x, y: h.cy + 30 }); sfx("fly"); }
    }
    this.ram(dt);
    w.update(dt);
    this.spawnWave(dt);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (Math.abs(e.x - h.x) < 900) e.update(dt);
      if (e.dead || Math.abs(e.x - h.x) > 1400) { if (e.dead && !e.wreck && e.kind !== "heli") this.addScore(e.score, e.x, e.y); this.enemies.splice(i, 1); }
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
    const nb = this.critters.filter((c) => !c.fish).length, nf = this.critters.length - nb;
    if (nb < 3 && Math.random() < dt * 0.25) { const dir = Math.random() < 0.5 ? -1 : 1; this.critters.push({ s: new ScaledFx(birdFx, { x: h.x - dir * 420, y: h.y - rnd(120, 260), sx: 0.32, flip: dir < 0 }), dir, sp: 70, t: 0 }); }
    if (nf < 4 && Math.random() < dt * 0.6) {
      // a little school of fish somewhere in the water near the hero
      const x = h.x + rnd(-320, 320), cx = Math.floor(x / CELL);
      if (w.wet(cx)) { const top = SEA * CELL + 16, bot = w.surfaceY(x, SEA * CELL) - 10; if (bot > top + 6) { const dir = Math.random() < 0.5 ? -1 : 1; this.critters.push({ fish: true, s: new ScaledFx(fishFx, { x, y: rnd(top, bot), sx: 0.35, flip: dir < 0 }), dir, sp: 14, t: 0 }); } }
    }
    for (let i = this.critters.length - 1; i >= 0; i--) {
      const c = this.critters[i]; c.s.update(dt);
      const nx = c.s.x + c.dir * c.sp * dt;
      if (c.fish && !w.wet(Math.floor((nx + c.dir * 20) / CELL))) { c.dir *= -1; c.s.flip = c.dir < 0; } else c.s.x = nx;
      if ((c.t += dt) > (c.fish ? 20 : 14) || Math.abs(c.s.x - h.x) > 900) this.critters.splice(i, 1);
    }
    const z = w.biomeAt(Math.floor(h.x / CELL));
    if (z !== this.zone) { if (this.zone !== null) this.say(BIOME_NAMES[z], UI.white); this.zone = z; }
    this.maxX = Math.max(this.maxX, Math.abs(h.x));
    if (this.score > this.best) { this.best = this.score; }
    I.jumpP = I.poundP = I.punchP = I.nukeP = I.altP = false;
  }

  // ---- the picture
  render(dt) {
    const f = this.frame, h = this.hero, I = this.I;
    const lookX = h.vx * 0.22 + (I.aimX - h.x) * 0.12, lookY = h.vy * 0.12 + (I.aimY - h.cy) * 0.1 - 30, F = this.camFocus;
    if (F && (F.t -= dt) > 0) { this.cam.x += (F.x - this.cam.x) * Math.min(1, 5 * dt); this.cam.y += (F.y - this.cam.y) * Math.min(1, 5 * dt); }
    else {
      this.camFocus = null;
      this.cam.x += (h.x + lookX - this.cam.x) * Math.min(1, 6 * dt);
      this.cam.y += (h.cy + lookY - this.cam.y) * Math.min(1, 6 * dt);
    }
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
    for (const c of this.critters) if (Math.abs(c.s.x - this.cam.x) < W) c.s.draw(f);
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
    if (s.fx) { s.fx.x = s.x; s.fx.y = s.y; s.fx.draw(f); return; }
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
    const R = this.hudR || W - 8;
    t(String(this.score).padStart(8, "0"), R, 8, UI.white, { align: "right" });
    p.text("BEST " + this.best, R, 19, UI.dim, { align: "right", outline: UI.ink });
    if (this.combo > 1) { const pulse = this.comboT > 2.4 ? 2 : 1; t("x" + this.combo, R, 30, this.combo > 12 ? UI.red : this.combo > 5 ? UI.orange : UI.gold, { align: "right", scale: pulse + 1 }); p.rect(R - 60, 30 + 8 * (pulse + 1) + 2, 60 * (this.comboT / 2.6), 2, UI.gold); }
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
    this.drawReticle(p, Math.round(this.I.aimX - camX), Math.round(this.I.aimY - camY));
    if (this.showFps) p.text(Math.round(this.fps) + " FPS  FX " + this.fx.list.length + " " + this.fx.ms.toFixed(1) + "MS  P " + this.parts.n, 8, 34, UI.dim, { outline: UI.ink });
  }
}

// ---- boot, input, loop
const canvas = document.getElementById("game");
const game = new Game(canvas);
window.game = game;
// fill the whole screen at any size: the picture is always 360 tall and as wide as the screen's shape
function fit() {
  const vw = innerWidth, vh = innerHeight, nw = Math.max(320, Math.min(1100, Math.round((H * vw) / vh / 2) * 2));
  if (nw !== W) { W = nw; game.resize(); }
  game.hudR = W - 10 - Math.ceil((58 * H) / vh);
  canvas.style.width = vw + "px"; canvas.style.height = vh + "px";
}
addEventListener("resize", fit); addEventListener("orientationchange", () => setTimeout(fit, 200)); fit();
const goFull = () => { const d = document.documentElement; if (document.fullscreenElement || !d.requestFullscreen) return; d.requestFullscreen({ navigationUI: "hide" }).then(() => { try { screen.orientation.lock("landscape").catch(() => {}); } catch (e) { /* not supported */ } }).catch(() => {}); };

const keys = new Set(), I = game.I;
let mouseX = W / 2 + 80, mouseY = H / 2, mouseFire = false, mouseAlt = false;
const setWeapon = (i) => { const n = WEAPONS.length; game.weapon = ((i % n) + n) % n; game.chargeT = 0; game.holdT = 0; game.holding = false; game.altT = 0; game.cd = Math.min(game.cd, 0.2); sfx("swap"); };
addEventListener("keydown", (e) => {
  if (e.code === "Escape") { togglePause(); return; }
  if (game.paused) return;
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
addEventListener("blur", () => { keys.clear(); mouseFire = false; mouseAlt = false; T.fire = false; });
const toCanvas = (e) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
const onUi = (e) => e.target.closest && e.target.closest("#help, #pause, #pmenu, #pads .btn, #pads .stick");
addEventListener("mousemove", (e) => { [mouseX, mouseY] = toCanvas(e); });
addEventListener("mousedown", (e) => {
  if (onUi(e) || game.paused || performance.now() - lastTouch < 800) return;
  start(); [mouseX, mouseY] = toCanvas(e);
  const slot = game.slotAt(mouseX, mouseY);
  if (slot >= 0) { setWeapon(slot); return; }
  if (e.button === 0) mouseFire = true; if (e.button === 2) { I.altP = true; mouseAlt = true; }
});
addEventListener("mouseup", (e) => { if (e.button === 0) mouseFire = false; if (e.button === 2) mouseAlt = false; });
addEventListener("contextmenu", (e) => e.preventDefault());
addEventListener("wheel", (e) => { if (!game.paused) setWeapon(game.weapon + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });

// touch: a stick to move; touching the screen aims there and fires (tap = click, hold = hold);
// buttons for jump/fly (hold to fly up, with the stick to dash), the power's second move, C (land / pound) and the nuke
let lastTouch = -1e9;
addEventListener("touchstart", () => (lastTouch = performance.now()), { capture: true, passive: true });
const T = { move: { x: 0, y: 0, on: false }, fire: false, fid: null, jump: false, alt: false, c: false };
const pads = document.getElementById("pads");
function touchSetup() {
  if (game.touch) return;
  game.touch = true; pads.style.display = "block"; mouseFire = false;
  const el = document.getElementById("stickL"), knob = el.firstElementChild, st = T.move;
  const set = (e) => { const r = el.getBoundingClientRect(), t = [...e.touches].find((q) => q.identifier === st.id); if (!t) return; let dx = (t.clientX - r.left - r.width / 2) / (r.width / 2), dy = (t.clientY - r.top - r.height / 2) / (r.height / 2); const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } st.x = dx; st.y = dy; knob.style.transform = `translate(${dx * 34}px,${dy * 34}px)`; };
  el.addEventListener("touchstart", (e) => { e.preventDefault(); start(); st.id = e.changedTouches[0].identifier; st.on = true; set(e); }, { passive: false });
  el.addEventListener("touchmove", (e) => { e.preventDefault(); set(e); }, { passive: false });
  const end = (e) => { e.preventDefault(); st.on = false; st.x = st.y = 0; knob.style.transform = ""; };
  el.addEventListener("touchend", end, { passive: false }); el.addEventListener("touchcancel", end, { passive: false });
  const btn = (id, down, up) => { const b = document.getElementById(id); const off = (e) => { e.preventDefault(); b.classList.remove("on"); up && up(); }; b.addEventListener("touchstart", (e) => { e.preventDefault(); if (game.paused) return; start(); b.classList.add("on"); down(); }, { passive: false }); b.addEventListener("touchend", off, { passive: false }); b.addEventListener("touchcancel", off, { passive: false }); };
  btn("bJump", () => { I.jumpP = true; T.jump = true; }, () => (T.jump = false));
  // ALT: a button that is also a quiet stick. Tap fires the second move at the aim; drag to point it from the hero.
  const alt = document.getElementById("bAlt");
  const altSet = (t) => { const r = alt.getBoundingClientRect(); let dx = (t.clientX - r.left - r.width / 2) / 50, dy = (t.clientY - r.top - r.height / 2) / 50; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } T.altDir = Math.hypot(dx, dy) > 0.3 ? [dx, dy] : null; alt.style.transform = T.altDir ? `translate(${dx * 14}px,${dy * 14}px)` : ""; };
  alt.addEventListener("touchstart", (e) => { e.preventDefault(); if (game.paused) return; start(); alt.classList.add("on"); T.altId = e.changedTouches[0].identifier; T.alt = true; T.altDir = null; if (WEAPONS[game.weapon].altHold) I.altP = true; }, { passive: false });
  alt.addEventListener("touchmove", (e) => { e.preventDefault(); const t = [...e.changedTouches].find((q) => q.identifier === T.altId); if (t) altSet(t); }, { passive: false });
  const altEnd = (e) => { e.preventDefault(); alt.classList.remove("on"); alt.style.transform = ""; if (T.alt && !WEAPONS[game.weapon].altHold) { T.altFire = 2; } T.alt = false; };
  alt.addEventListener("touchend", altEnd, { passive: false }); alt.addEventListener("touchcancel", altEnd, { passive: false });
  btn("bC", () => { I.poundP = true; T.c = true; }, () => (T.c = false));
  btn("bNuke", () => (I.nukeP = true));
  // the screen itself: aim and fire
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault(); if (game.paused) return; start();
    if (T.fid !== null) return;
    const t = e.changedTouches[0]; [mouseX, mouseY] = toCanvas(t);
    const slot = game.slotAt(mouseX, mouseY);
    if (slot >= 0) { setWeapon(slot); return; }
    T.fid = t.identifier; T.fire = true;
  }, { passive: false });
  canvas.addEventListener("touchmove", (e) => { e.preventDefault(); const t = [...e.changedTouches].find((q) => q.identifier === T.fid); if (t) [mouseX, mouseY] = toCanvas(t); }, { passive: false });
  const lift = (e) => { e.preventDefault(); if ([...e.changedTouches].some((q) => q.identifier === T.fid)) { T.fid = null; T.fire = false; } };
  canvas.addEventListener("touchend", lift, { passive: false }); canvas.addEventListener("touchcancel", lift, { passive: false });
}
addEventListener("touchstart", () => touchSetup(), { once: true, passive: true });

// pause menu
const pauseBtn = document.getElementById("pause"), pmenu = document.getElementById("pmenu");
function togglePause(on = !game.paused) {
  if (!game.started) return;
  game.paused = on;
  mouseFire = false; mouseAlt = false; keys.clear(); T.fire = false; T.fid = null; T.jump = T.alt = T.c = false;
  pmenu.classList.toggle("show", on);
  pauseBtn.innerHTML = on ? "&#9654;" : "&#10074;&#10074;";
}
const tapBtn = (el, fn) => { el.addEventListener("click", (e) => { e.stopPropagation(); fn(); }); el.addEventListener("touchend", (e) => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false }); el.addEventListener("mousedown", (e) => e.stopPropagation()); };
tapBtn(pauseBtn, () => togglePause());
tapBtn(document.getElementById("pResume"), () => togglePause(false));
tapBtn(document.getElementById("pFull"), () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else goFull(); });
// settings: the aim mark's shape and size, remembered
try { const r = JSON.parse(localStorage.getItem("nova-reticle")); if (r && r.shape) game.reticle = r; } catch (e) { /* none saved */ }
game.reticle = game.reticle || { shape: "cross", size: 2 };
const SHAPES = ["cross", "plus", "circle", "x", "dot"], rShape = document.getElementById("rShape"), rSize = document.getElementById("rSize");
const showR = () => { rShape.textContent = "AIM: " + game.reticle.shape.toUpperCase(); rSize.textContent = "AIM SIZE: " + game.reticle.size; try { localStorage.setItem("nova-reticle", JSON.stringify(game.reticle)); } catch (e) { /* private */ } };
tapBtn(rShape, () => { game.reticle.shape = SHAPES[(SHAPES.indexOf(game.reticle.shape) + 1) % SHAPES.length]; showR(); });
tapBtn(rSize, () => { game.reticle.size = game.reticle.size % 5 + 1; showR(); });
showR();
tapBtn(document.getElementById("pHelp"), () => { togglePause(false); game.started = false; document.getElementById("help").classList.remove("hide"); });
document.addEventListener("visibilitychange", () => { if (document.hidden && game.started && !game.paused) togglePause(true); });

function start() {
  if (game.started) return;
  game.started = true; initAudio();
  if (game.touch) goFull();
  document.getElementById("help").classList.add("hide");
}
document.getElementById("help").addEventListener("click", start);
document.getElementById("help").addEventListener("touchend", (e) => { e.preventDefault(); touchSetup(); start(); }, { passive: false });

function readInput() {
  const h = game.hero, f = game.frame;
  if (game.touch && performance.now() - lastTouch < 4000) {
    const m = T.move;
    I.mx = Math.abs(m.x) > 0.25 ? Math.sign(m.x) * (h.fly ? Math.abs(m.x) : 1) : 0; I.my = Math.abs(m.y) > 0.3 ? m.y : 0;
    I.fire = T.fire; I.alt = WEAPONS[game.weapon].altHold ? T.alt : false; I.jump = T.jump; I.c = T.c;
    if (T.altFire && --T.altFire === 0) { I.altP = true; }
    // the jump button doubles as the flash: held while steering
    I.dash = T.jump && (I.mx !== 0 || (h.fly && I.my !== 0));
  } else {
    I.mx = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    I.my = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
    I.jump = keys.has("Space"); I.dash = keys.has("ShiftLeft") || keys.has("ShiftRight"); I.c = keys.has("KeyC") || keys.has("ControlLeft");
    I.fire = mouseFire; I.alt = mouseAlt;
  }
  I.aimX = f.ox + mouseX; I.aimY = f.oy + mouseY;
  // dragging the ALT button points from the hero; the aim stays there for the shot on release
  if (game.touch && T.altDir) { const [dx, dy] = T.altDir, m = Math.hypot(dx, dy); T.altAim = [h.x + (dx / m) * (60 + 200 * m), h.cy + (dy / m) * (60 + 200 * m)]; }
  if (game.touch && T.altAim && (T.alt || T.altFire)) { I.aimX = T.altAim[0]; I.aimY = T.altAim[1]; }
  else if (game.touch && T.altAim && !T.alt) { [mouseX, mouseY] = [T.altAim[0] - f.ox, T.altAim[1] - f.oy]; T.altAim = null; }
}

let last = performance.now(), saveT = 0;
function tick(now) {
  const raw = Math.min(0.05, (now - last) / 1000); last = now;
  game.fps = game.fps * 0.95 + (1 / Math.max(raw, 0.001)) * 0.05;
  readInput();
  if (game.started) {
    if (game.paused) { /* stopped */ } else if (game.freeze > 0) game.freeze -= raw; else game.update(Math.min(raw, 1 / 30));
  } else { game.time += raw; game.world.update(raw); game.parts.update(raw); game.fx.update(raw); }
  game.render(raw);
  if ((saveT += raw) > 5) { saveT = 0; try { localStorage.setItem("nova-best", String(game.best)); } catch (e) { /* private mode */ } }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
