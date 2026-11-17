// Slot 0: pets the hero summons to fight beside him. Each has its own health, which runs down over time and
// when the army hits it; when it's gone the pet goes off in a lightning blast.
//   left click: a flying skull that spits fireballs from its mouth
//   hold left:  a jellyfish that throws sideways lightning from its tentacles and claps thunder at anyone close
//   right click: a slime that hops along eating everything, growing as it goes, and bursts into green bits
import { ScaledFx } from "./scaled.js";
import { PT } from "./particles.js";
import { CELL, isStruct } from "./world.js";
import { Arc } from "./thor.js";
import { painterFor } from "../vendor/pixelfx/src/core/index.js";
import * as skullFx from "../vendor/pixelfx/src/fx/critters/flying-skull.js";
import * as jellyFx from "../vendor/pixelfx/src/fx/critters/jellyfish.js";
import * as slimeFx from "../vendor/pixelfx/src/fx/critters/slime.js";
import * as fireballFx from "../vendor/pixelfx/src/fx/fire/fireball.js";
import * as thunderclap from "../vendor/pixelfx/src/fx/lightning/thunderclap.js";

const rnd = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const live = (e) => !e.dead && !e.wreck;
const mid = (e) => e.y - e.h / 2;
const HOVER = 40; // the skull's own hover height inside its effect

/** Pet health and how fast it runs down by itself (per second). Jellyfish least, slime most. */
export const PET_HP = { skull: 90, jelly: 55, slime: 220 };
const DRAIN = { skull: 1.5, jelly: 1.5, slime: 1 };
const MAX_EACH = 4;

function nearest(g, x, y, r) {
  let best = null, bd = r;
  for (const e of g.enemies) { if (!live(e)) continue; const d = Math.hypot(e.x - x, mid(e) - y); if (d < bd) { bd = d; best = e; } }
  return best;
}

/** A small thunderclap and a ring of bolts: every pet dies this way. */
function lightningDeath(g, x, y, k = 1) {
  g.fx.spawn(thunderclap, { x, y: y + 22, keep: true });
  const st = new Bolts(g);
  for (let i = 0; i < 6 + 4 * k; i++) { const a = rnd(0, TAU), L = rnd(30, 70) * k; st.add(new Arc(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, 0.5, 0.35)); }
  g.shots.push(st);
  g.blast(x, y, 30 * k, 7 + 3 * k, { kind: "none", fire: 0.3, quiet: true });
  g.eachEnemy(x, y, 70 * k, (e) => e.hurt(30 * k, (e.x - x) * 4, -250));
  g.flash = Math.max(g.flash, 0.2); g.shake(5 * k); g.sfx("thunder");
}

/** A set of short-lived lightning arcs. */
class Bolts {
  constructor(g) { this.g = g; this.arcs = []; }
  add(a) { this.arcs.push(a); }
  update(dt) { this.arcs = this.arcs.filter((a) => a.update(dt)); return this.arcs.length > 0; }
  draw(f) { const p = painterFor(f); p.place(0, 0); for (const a of this.arcs) a.draw(p); }
}

class Pet {
  constructor(g, kind, s) {
    Object.assign(this, { g, kind, s, hp: PET_HP[kind], max: PET_HP[kind], t: 0, dead: false, hitT: 0 });
    g.pets = g.pets || [];
    const mine = g.pets.filter((p) => p.kind === kind);
    if (mine.length >= MAX_EACH) mine[0].hp = 0;
    g.pets.push(this);
  }
  /** Damage from the army: their bullets and blasts. */
  hurt(d) { this.hp -= d; this.hitT = 0.1; }
  hits(x, y, r = 0) { return Math.abs(x - this.x) < this.r + r && Math.abs(y - this.cy) < this.r + r; }
  get cy() { return this.y; }
  update(dt) {
    this.t += dt; this.hitT -= dt;
    this.hp -= DRAIN[this.kind] * dt;
    this.s.update(dt);
    if (this.hp > 0) this.step(dt);
    if (this.hp <= 0 && !this.dead) { this.dead = true; this.die(); this.g.pets = this.g.pets.filter((p) => p !== this); return false; }
    return true;
  }
  die() { lightningDeath(this.g, this.x, this.cy, 1); }
  draw(f) {
    this.s.draw(f);
    // health bar over its head
    const w = 18, x = Math.round(this.x - w / 2) - f.ox, y = Math.round(this.top()) - 6 - f.oy, k = Math.max(0, this.hp / this.max);
    for (let i = 0; i < w; i++) for (let j = 0; j < 2; j++) {
      const px = x + i, py = y + j;
      if (px >= 0 && py >= 0 && px < f.w && py < f.h) f.color[py * f.w + px] = i < w * k ? (this.hitT > 0 ? 0xffffffff : 0xff50d070) : 0xff302830;
    }
  }
}

// ---------------------------------------------------------------- flying skull

class Fireball {
  constructor(g, x, y, a) {
    Object.assign(this, { g, x, y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 1.6 });
    // scaled down so the head is about as big as the skull's mouth
    this.s = new ScaledFx(fireballFx, { sx: 0.55, radius: 4 });
    this.s.aim(a);
  }
  update(dt) {
    const g = this.g, w = g.world;
    this.s.update(dt);
    const n = Math.max(1, Math.ceil((Math.hypot(this.vx, this.vy) * dt) / 3));
    for (let i = 0; i < n; i++) {
      this.x += (this.vx * dt) / n; this.y += (this.vy * dt) / n;
      if (w.solidPx(this.x, this.y) || g.enemyAt(this.x, this.y, 2) || (this.life -= dt / n) <= 0) {
        g.blast(this.x, this.y, 16, 6, { kind: "small", size: 0.55, fire: 0.9 });
        return false;
      }
    }
    this.s.x = this.x; this.s.y = this.y;
    g.flashLight(this.x, this.y, 16, 0xff2080ff, 0.5, 0.05);
    return true;
  }
  draw(f) { this.s.draw(f); }
}

class Skull extends Pet {
  constructor(g, x, y) {
    super(g, "skull", new ScaledFx(skullFx, { floor: false }));
    Object.assign(this, { x, y, vx: 0, vy: 0, r: 12, cool: 0.6 });
    g.sfx("fly");
  }
  top() { return this.y - 20; }
  /** The mouth, in the world. */
  mouth() { return [this.x, this.y + 7]; }
  step(dt) {
    const g = this.g, h = g.hero, e = nearest(g, this.x, this.y, 340);
    // hang a little above and to the side of its target, or keep close to the hero
    const tx = e ? e.x + (this.x < e.x ? -90 : 90) : h.x + Math.sin(this.t * 0.7 + this.r) * 50 - h.face * 30;
    const ty = e ? mid(e) - 60 : h.cy - 60;
    this.vx += ((tx - this.x) * 3 - this.vx * 2.2) * dt; this.vy += ((ty - this.y) * 3 - this.vy * 2.2) * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.s.pin(0, -HOVER, this.x, this.y);
    if ((this.cool -= dt) <= 0 && e) {
      this.cool = 1.1;
      const [mx, my] = this.mouth(), a = Math.atan2(mid(e) - my, e.x - mx);
      g.shots.push(new Fireball(g, mx, my, a));
      for (let i = 0; i < 6; i++) g.parts.spawn(PT.FLAME, mx, my, Math.cos(a) * rnd(40, 120), Math.sin(a) * rnd(40, 120), rnd(0.15, 0.3), 0, 2);
      g.sfx("rocket");
    }
  }
}

// ---------------------------------------------------------------- jellyfish

class Jelly extends Pet {
  constructor(g, x, y) {
    super(g, "jelly", new ScaledFx(jellyFx, {}));
    Object.assign(this, { x, y, vx: 0, vy: 0, r: 16, zap: 0.4, clap: 0 });
    g.sfx("void");
  }
  top() { return this.y - 22; }
  step(dt) {
    const g = this.g, h = g.hero, e = nearest(g, this.x, this.y, 300);
    const tx = e ? e.x + (this.x < e.x ? -70 : 70) : h.x - h.face * 40, ty = (e ? mid(e) : h.cy) - 20 + Math.sin(this.t * 2) * 8;
    this.vx += ((tx - this.x) * 1.6 - this.vx * 1.8) * dt; this.vy += ((ty - this.y) * 1.6 - this.vy * 1.8) * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.s.x = this.x; this.s.y = this.y;
    // sideways lightning from the tentacles: four or five bolts at once, fanned out left and right
    if ((this.zap -= dt) <= 0) {
      this.zap = 1.3;
      const bolts = new Bolts(g), n = 4 + (Math.random() < 0.5 ? 1 : 0), y0 = this.y + 26;
      const near = g.enemies.filter((q) => live(q) && Math.abs(q.x - this.x) < 170 && Math.abs(mid(q) - y0) < 70).sort((a, b) => Math.abs(a.x - this.x) - Math.abs(b.x - this.x));
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? -1 : 1, x0 = this.x + side * rnd(2, 10), q = near[i];
        let a = side > 0 ? rnd(-0.35, 0.35) : Math.PI + rnd(-0.35, 0.35), L = rnd(90, 160);
        if (q) {
          // aim at it, but keep the bolt within a flat cone: sideways, never up or down
          a = Math.atan2(mid(q) - y0, q.x - x0);
          if (Math.cos(a) >= 0) a = Math.max(-0.45, Math.min(0.45, a));
          else { let b = a < 0 ? a + TAU : a; a = Math.max(Math.PI - 0.45, Math.min(Math.PI + 0.45, b)); }
          L = Math.hypot(q.x - x0, mid(q) - y0) + 6;
        }
        const c = Math.cos(a), s = Math.sin(a), x1 = x0 + c * L, y1 = y0 + s * L;
        bolts.add(new Arc(x0, y0, x1, y1, 0.35, 0.25));
        g.eachEnemyOnRay(x0, y0, c, s, L, 6, (en) => en.hurt(14, c * 120, -60));
        if (g.world.solidPx(x1, y1)) g.addScore(g.world.explode(x1, y1, 6, 4, { fire: 0.2, debris: 3 }));
      }
      g.shots.push(bolts);
      g.flashLight(this.x, y0, 50, 0xffffd080, 0.6, 0.15);
      g.sfx("laser");
    }
    // a thunderclap for anyone who comes too close
    this.clap -= dt;
    if (this.clap <= 0 && nearest(g, this.x, this.y + 10, 55)) {
      this.clap = 2.2;
      g.fx.spawn(thunderclap, { x: this.x, y: this.y + 40, keep: true });
      g.eachEnemy(this.x, this.y + 10, 75, (q) => q.hurt(30, (q.x - this.x) * 6, -300));
      g.shake(4); g.sfx("thunder"); g.flash = Math.max(g.flash, 0.12);
    }
  }
}

// ---------------------------------------------------------------- slime

const SL_D = 1.8, SL_LIFT = 0.9, SL_LAND = 1.44, SL_MAX = 4;
const GREEN = [0xff12594a, 0xff1f8f4f, 0xff47c752, 0xff6af0a6].map((c) => ((c & 0xff) << 16) | (c & 0xff00) | ((c >> 16) & 0xff) | 0xff000000);
class Slime extends Pet {
  constructor(g, x, y) {
    super(g, "slime", new ScaledFx(slimeFx, { seed: 1, hop: 24 }));
    Object.assign(this, { x, y: g.world.surfaceY(x, y), size: 1, dir: 1, landed: false, eaten: 0 });
    g.sfx("thud");
  }
  get r() { return 13 * this.size; }
  get cy() { return this.y - 11 * this.size; }
  top() { return this.y - 26 * this.size; }
  // the bigger it gets the frailer it is, but the harder it bites and the faster it eats
  grow(k) { this.size = Math.min(SL_MAX, this.size + k); this.base = this.base || this.max; this.max = this.base / Math.pow(this.size, 0.75); this.hp = Math.min(this.max, this.hp + k * 30); }
  step(dt) {
    const g = this.g, w = g.world, sz = this.size, ph = this.s.t % SL_D;
    const e = nearest(g, this.x, this.cy, 400);
    if (e) this.dir = e.x >= this.x ? 1 : -1;
    else if (Math.abs(g.hero.x - this.x) > 160) this.dir = g.hero.x > this.x ? 1 : -1;
    const air = ph > SL_LIFT && ph < SL_LAND;
    if (air) this.x += this.dir * 110 * Math.sqrt(sz) * dt;
    // follow the ground (it can climb onto what it can't eat yet)
    const gy = w.surfaceY(this.x, this.y - 30 * sz);
    this.y += Math.max(-200 * dt, Math.min(400 * dt, gy - this.y));
    this.s.sx = this.s.sy = sz; this.s.x = this.x; this.s.y = this.y;
    // eat whatever it touches: cells of the world are sucked in and it grows
    const R = this.r, cyc = this.cy, cx0 = Math.floor((this.x - R) / CELL), cx1 = Math.floor((this.x + R) / CELL);
    let bites = 0;
    for (let k = 0; k < 6 * sz * sz; k++) {
      const cx = Math.floor(rnd(cx0, cx1 + 1)), cy = Math.floor((cyc + rnd(-R, R * 1.1)) / CELL);
      const dx = cx * CELL + 2 - this.x, dy = cy * CELL + 2 - cyc;
      if (dx * dx + dy * dy > R * R * 1.2) continue;
      const m = w.get(cx, cy);
      // buildings and things on the ground, yes; the ground under it only a little, so it doesn't sink away
      if (m && !isStruct(m) && cy * CELL >= this.y - 2 && Math.random() > 0.04) continue;
      if (m && w.destroyCell(cx, cy, 0, 0, true)) { bites++; g.parts.spawn(PT.DEBRIS, cx * CELL + 2, cy * CELL + 2, -dx * 3, -dy * 3, 0.15, GREEN[k & 3], 1); }
      else if (w.getBg(cx, cy)) { w.destroyBg(cx, cy); bites += 0.5; }
    }
    if (bites) { this.grow(bites * 0.0025); this.eaten += bites; g.addScore(Math.ceil(bites)); }
    // and the army: anyone it lands on is swallowed
    for (const q of g.enemies) {
      if (!live(q) || Math.abs(q.x - this.x) > R + q.hw || mid(q) < this.top() - 4 || q.y - q.h > this.y + 4) continue;
      q.hurt(60 * dt * sz * sz);
      if (q.dead || q.hp <= 0) { this.grow(0.12); g.sfx("pop"); }
      else { q.x += (this.x - q.x) * dt * 3; }
    }
    if (!air && !this.landed && ph >= SL_LAND) { this.landed = true; g.shake(Math.min(4, sz)); if (sz > 1.6) g.addScore(w.explode(this.x, this.y + 2, 6 * sz, 5, { fire: 0, clean: true, debris: 2 })); }
    if (ph < SL_LAND) this.landed = false;
  }
  die() {
    const g = this.g, sz = this.size;
    lightningDeath(g, this.x, this.cy, Math.min(2.5, 0.8 + sz * 0.4));
    // it bursts: green chunks all over
    for (let i = 0; i < 60 + 50 * sz; i++) { const a = rnd(Math.PI, TAU) + rnd(-0.3, 0.3); g.parts.spawn(i % 4 ? PT.DEBRIS : PT.DROP, this.x + rnd(-this.r, this.r), this.cy + rnd(-this.r * 0.6, this.r * 0.4), Math.cos(a) * rnd(100, 420) * Math.sqrt(sz), Math.sin(a) * rnd(150, 500), rnd(2, 5), GREEN[i & 3], 1 + (i % 3)); }
    g.sfx("crash", 1);
  }
}

export const PETS = {
  name: "PETS", col: 0xff52c747, cd: 0.6, altCd: 1.2,
  tap(g, h, ax, ay) { g.shots.push(new Skull(g, ax, ay)); },
  hold(g, h, ax, ay) { if (!g.jellyHeld) { g.jellyHeld = true; g.shots.push(new Jelly(g, ax, ay)); } },
  release(g) { g.jellyHeld = false; },
  alt(g, h, ax, ay) { g.shots.push(new Slime(g, ax, ay)); },
};
