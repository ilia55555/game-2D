// THOR: a charged chain lightning. Tap for a thin spark that jumps to one target; hold to build a storm that
// comes down from the sky, forks through every enemy nearby and turns them to dust.
// The bolt is drawn here procedurally (no fixed-length sprite), so its length, width, branches and the number and
// spacing of its jumps all follow the charge and where the enemies really are.
import { painterFor } from "../vendor/pixelfx/src/core/index.js";
import { PT } from "./particles.js";

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// colors are 0xAABBGGRR
const CORE = 0xffffffff, INNER = 0xfffff0c8, OUTER = 0xffffb050, GLOW = 0xffffa040, DEEP = 0xffc06020;
const ASH = [0xff3a3438, 0xff5a5258, 0xff807880, 0xffa8a0a8];

/** Tunables: everything the lightning does follows these, so it's easy to change. */
export const THOR = {
  fullCharge: 1.4,   // seconds of holding for a full storm
  tapRange: 70,      // how far a tap can reach to its first target
  fullRange: 520,    // radius round the strike that a full storm searches
  tapHop: 55,        // longest jump between two targets, tap…
  fullHop: 260,      // …and full storm
  tapTargets: 1,     // how many it chains through, tap…
  fullTargets: 999,  // …and full: everyone in range
  tapDamage: 3,
  fullDamage: 260,
  dustAt: 0.45,      // above this charge, a kill turns the target to dust
  hopDelay: 0.035,   // seconds between jumps, so the chain visibly travels
};

/** A jagged path from a to b by midpoint displacement; rough is the sideways sway as a share of length. */
function zigzag(x0, y0, x1, y1, rough, depth) {
  let pts = [[x0, y0], [x1, y1]];
  let off = Math.hypot(x1 - x0, y1 - y0) * rough;
  for (let d = 0; d < depth; d++) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, k = rnd(-off, off);
      out.push([(ax + bx) / 2 - (dy / L) * k, (ay + by) / 2 + (dx / L) * k], pts[i]);
    }
    pts = out; off *= 0.55;
  }
  return pts;
}

/** One segment of lightning: re-forks itself every few frames so it flickers like the real thing. */
export class Arc {
  constructor(x0, y0, x1, y1, power, life) {
    Object.assign(this, { x0, y0, x1, y1, p: power, life, span: life, flick: 0 });
    this.reshape();
  }
  reshape() {
    const p = this.p, L = Math.hypot(this.x1 - this.x0, this.y1 - this.y0);
    this.pts = zigzag(this.x0, this.y0, this.x1, this.y1, 0.12 + p * 0.1, Math.min(7, 3 + Math.floor(L / 40)));
    // forks: thin side branches, more of them when charged
    this.forks = [];
    const n = Math.floor(rnd(0, 1.5) + p * 6);
    for (let i = 0; i < n; i++) {
      const at = this.pts[1 + Math.floor(Math.random() * (this.pts.length - 2))];
      if (!at) continue;
      const a = Math.atan2(this.y1 - this.y0, this.x1 - this.x0) + rnd(-1.2, 1.2), len = rnd(8, 18 + p * 50);
      this.forks.push(zigzag(at[0], at[1], at[0] + Math.cos(a) * len, at[1] + Math.sin(a) * len, 0.25, 3));
    }
  }
  update(dt) {
    if ((this.flick -= dt) <= 0) { this.flick = rnd(0.03, 0.07); this.reshape(); }
    return (this.life -= dt) > 0;
  }
  draw(pt) {
    const u = this.life / this.span, p = this.p, a = u > 0.5 ? 1 : u * 2;
    const w = 1 + p * 5 * u; // thickness grows with charge, thins as it dies
    for (let i = 1; i < this.pts.length; i++) {
      const [ax, ay] = this.pts[i - 1], [bx, by] = this.pts[i];
      if (w > 2.5) pt.beam(ax, ay, bx, by, w + 2, DEEP, a * 0.8);
      if (w > 1.5) pt.beam(ax, ay, bx, by, w, OUTER, a);
      if (w > 3) pt.beam(ax, ay, bx, by, w * 0.5, INNER, a);
      pt.line(ax, ay, bx, by, CORE, a);
      pt.glowLine(ax, ay, bx, by, 4 + p * 14, GLOW, (0.25 + p * 0.5) * u);
    }
    for (const f of this.forks) {
      for (let i = 1; i < f.length; i++) pt.line(f[i - 1][0], f[i - 1][1], f[i][0], f[i][1], i < 2 ? INNER : OUTER, a * 0.9);
    }
  }
}

/** Holds every live arc of one strike. */
class Storm {
  constructor(g) { this.g = g; this.arcs = []; this.t = 0; }
  add(arc) { this.arcs.push(arc); }
  update(dt) {
    this.t += dt;
    this.arcs = this.arcs.filter((a) => a.update(dt));
    return this.arcs.length > 0 || this.t < 0.05 || this.pending > 0;
  }
  draw(f) {
    const pt = painterFor(f);
    pt.place(0, 0);
    for (const a of this.arcs) a.draw(pt);
  }
}

/** Crackle round the hero's hand while the button is held. */
class Charge {
  constructor(g, h) { this.g = g; this.h = h; this.arcs = []; this.tick = 0; }
  update(dt) {
    const g = this.g, h = this.h, p = g.thorP || 0;
    if (!(g.chargeT > 0)) return false;
    const [x, y] = h.muzzle(g.I.aimX, g.I.aimY);
    this.x = x; this.y = y; this.p = p;
    this.arcs = this.arcs.filter((a) => a.update(dt));
    for (this.tick += dt; this.tick > 0.05; this.tick -= 0.05) {
      const n = 1 + Math.floor(p * 3);
      for (let i = 0; i < n; i++) {
        const a = rnd(0, Math.PI * 2), r = 6 + p * 22;
        this.arcs.push(new Arc(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, p * 0.3, 0.08));
      }
      // near full, stray bolts already fall from the sky round the hero
      if (p > 0.7 && Math.random() < p * 0.5) {
        const gx = h.x + rnd(-90, 90), gy = g.world.surfaceY(gx, h.y - 80);
        this.arcs.push(new Arc(gx + rnd(-20, 20), g.cam.y - 200, gx, gy, 0.25, 0.1));
        g.flashLight(gx, gy, 30, GLOW, 0.4, 0.15);
      }
      for (let i = 0; i < 1 + p * 4; i++) g.parts.spawn(PT.SPARK, x + rnd(-3, 3), y + rnd(-3, 3), rnd(-60, 60) * (1 + p), rnd(-90, 30) * (1 + p), rnd(0.1, 0.35), OUTER);
    }
    g.flashLight(x, y, 10 + p * 40, GLOW, 0.3 + p * 0.6, 0.08);
    if (p >= 1) g.shake(0.8);
    return true;
  }
  draw(f) {
    const pt = painterFor(f);
    pt.place(0, 0);
    pt.glow(this.x, this.y, 6 + this.p * 18, GLOW, 0.4 + this.p * 0.6);
    pt.disc(this.x, this.y, 1 + this.p * 2.5, CORE, 1);
    for (const a of this.arcs) a.draw(pt);
  }
}

/** Turn an enemy into a cloud of ash and drifting sparks, with no wreck left behind. */
export function dust(g, e) {
  if (e.dead) return;
  const hw = e.hw || 6, h = e.h || 20, n = Math.min(160, Math.floor(hw * h * 0.5) + 30);
  for (let i = 0; i < n; i++) {
    const x = e.x + rnd(-hw, hw), y = e.y - rnd(0, h);
    g.parts.spawn(i % 5 ? PT.SMOKE : PT.EMBER, x, y, rnd(-50, 50), rnd(-90, -10), rnd(0.6, 1.8), ASH[i & 3], i % 5 ? rnd(1, 3) : 1);
  }
  for (let i = 0; i < 18; i++) g.parts.spawn(PT.SPARK, e.x, e.y - h / 2, rnd(-160, 160), rnd(-200, 40), rnd(0.2, 0.5), i & 1 ? CORE : OUTER);
  g.flashLight(e.x, e.y - h / 2, 30 + hw * 2, GLOW, 0.9, 0.3);
  e.dead = true; e.wreck = true;
  if (e.score) g.addScore(e.score, e.x, e.y);
}

/** Build the chain: start at (x, y), always jump to the nearest enemy not hit yet within reach. */
function chainTargets(g, x, y, range, hop, max) {
  const pool = [];
  g.eachEnemy(x, y, range, (e) => { if (!e.wreck) pool.push(e); });
  const out = [];
  let cx = x, cy = y;
  while (out.length < max && pool.length) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const e = pool[i], d = Math.hypot(e.x - cx, e.y - e.h / 2 - cy);
      if (d < bd) { bd = d; best = i; }
    }
    if (bd > hop + pool[best].hw) break;
    const e = pool.splice(best, 1)[0];
    out.push(e); cx = e.x; cy = e.y - e.h / 2;
  }
  return out;
}

/** Let go of the button: strike with power p in [0, 1]. */
function strike(g, h, ax, ay, p) {
  const T = THOR, w = g.world, L = (a, b) => a + (b - a) * p;
  const storm = new Storm(g);
  g.shots.push(storm);
  const [mx, my] = h.muzzle(ax, ay);
  const life = L(0.12, 0.55);
  let sx, sy;

  if (p < 0.35) {
    // a thin spark from the hand, as far as the cursor or the first wall
    const a = Math.atan2(ay - my, ax - mx), c = Math.cos(a), s = Math.sin(a);
    const reach = Math.min(Math.hypot(ax - mx, ay - my), L(160, 320));
    const hit = w.raycast(mx + c * 3, my + s * 3, c, s, reach);
    sx = mx + c * hit.d; sy = my + s * hit.d;
    storm.add(new Arc(mx, my, sx, sy, p, life));
    if (hit.hit) g.addScore(w.explode(sx, sy, 3 + p * 12, 3, { fire: 0.2, debris: 3 }));
    g.sfx("laser");
  } else {
    // a bolt from the sky onto the cursor, and one from the hand up into the clouds: the hero calls it down
    sx = ax; sy = w.solidPx(ax, ay) ? ay : w.surfaceY(ax, ay);
    const top = g.cam.y - 200;
    storm.add(new Arc(sx + rnd(-30, 30), top, sx, sy, p, life));
    if (p > 0.7) { storm.add(new Arc(sx + rnd(-60, -20), top, sx, sy, p * 0.6, life * 0.8)); storm.add(new Arc(sx + rnd(20, 60), top, sx, sy, p * 0.6, life * 0.8)); }
    storm.add(new Arc(mx, my, mx + rnd(-20, 20), top, p * 0.4, life * 0.6));
    g.blast(sx, sy, L(10, 70), L(3, 14), { kind: "none", fire: 0.6, quiet: p < 0.6 });
    g.sfx("thunder");
    g.flash = Math.max(g.flash, L(0.1, 0.7));
    g.shake(L(2, 12));
    if (p > 0.85) g.freeze = 0.06;
  }
  g.flashLight(sx, sy, L(20, 120), GLOW, L(0.6, 1.2), L(0.2, 0.5));

  // the chain
  const range = L(T.tapRange, T.fullRange), hop = L(T.tapHop, T.fullHop);
  const max = Math.round(L(T.tapTargets, Math.min(T.fullTargets, 60)) * (p > 0.95 ? 100 : 1));
  const dmg = L(T.tapDamage, T.fullDamage);
  const targets = chainTargets(g, sx, sy, range, hop, max);
  let px = sx, py = sy;
  targets.forEach((e, i) => {
    const fx = px, fy = py, ex = e.x, ey = e.y - e.h / 2;
    px = ex; py = ey;
    g.later(i * T.hopDelay, () => {
      storm.add(new Arc(fx, fy, ex, ey, p * 0.85, life));
      g.flashLight(ex, ey, 20 + p * 30, GLOW, 0.8, 0.2);
      if (p >= T.dustAt && (e.hp <= dmg || p > 0.9)) dust(g, e);
      else e.hurt(dmg, (ex - fx) * 0.5, -40 - p * 200);
      if (i % 3 === 0) g.sfx("laser");
    });
  });
}

export const MJOLNIR = {
  name: "MJOLNIR", cd: 0.18, charge: true, col: 0xffffc060,
  /** called every frame while held; t = seconds held */
  charging(g, h, ax, ay, t) {
    g.thorP = clamp01(t / THOR.fullCharge);
    if (!g.thorCharge || !g.shots.includes(g.thorCharge)) { g.thorCharge = new Charge(g, h); g.shots.push(g.thorCharge); }
    if (Math.random() < 0.15 + g.thorP * 0.3) g.sfx("laser");
  },
  release(g, h, ax, ay, t) {
    const p = clamp01((t - 0.12) / (THOR.fullCharge - 0.12)); // a quick click is a pure tap
    g.thorP = 0;
    strike(g, h, ax, ay, p);
  },
};
