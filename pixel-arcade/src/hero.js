// NOVA: the hero. Runs, super-jumps, flies, dashes through walls, pounds the ground.
// The body is pixelfx's skeleton rig, re-dressed: every pose is solved and drawn down to pixels.

import { posed, luma, rgb, hex, mix } from "../vendor/pixelfx/src/core/index.js";
import { CELL, SEA, WH, LAVA } from "./world.js";

const INK = hex("#0e0c14"), MARK = hex("#f53cd1");
const SUIT = [hex("#141a3c"), hex("#3f7cff")], LEGS = [hex("#10142e"), hex("#2f5fd0")], HELM = [hex("#5a6890"), hex("#ffffff")], GOLD = [hex("#7a3a08"), hex("#ffc83c")];
const VISOR = hex("#7ff3ff"), SCARF = [hex("#ff4a3c"), hex("#d02a30"), hex("#8a1626")];
const cache = new Map();
function dress(c, src) {
  if (src < 0) return c;
  const key = c * 1024 + src;
  let v = cache.get(key);
  if (v !== undefined) return v;
  const row = (src / 24) | 0, col = src % 24, t = Math.pow(luma(c), 0.85);
  if (c === INK) v = hex("#0a0a1a");
  else if (c === MARK) v = VISOR;
  else if (row <= 6) v = (row === 3 || row === 4) && col >= 12 ? VISOR : mix(HELM[0], HELM[1], t);
  else if (row >= 33 || (row >= 14 && row <= 17 && col <= 8)) v = mix(GOLD[0], GOLD[1], t);
  else if (row === 17 || row === 16 && col > 9) v = mix(GOLD[0], GOLD[1], t * 0.8);
  else if (row <= 16) v = mix(SUIT[0], SUIT[1], t);
  else v = mix(LEGS[0], LEGS[1], t);
  cache.set(key, v);
  return v;
}
export function dressWith(table) {
  const c2 = new Map();
  return (c, src) => {
    if (src < 0) return c;
    const key = c * 1024 + src;
    let v = c2.get(key);
    if (v === undefined) { v = table(c, (src / 24) | 0, src % 24, Math.pow(luma(c), 0.85)); c2.set(key, v); }
    return v;
  };
}

// ---- bodies in the cell world
export function boxHits(w, x, y, hw, h) {
  const x0 = Math.floor((x - hw) / CELL), x1 = Math.floor((x + hw - 0.01) / CELL), y0 = Math.floor((y - h) / CELL), y1 = Math.floor((y - 0.01) / CELL);
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) if (w.solid(cx, cy)) return true;
  return false;
}
/** Move a body { x, y, vx, vy, hw, h } through the cells; sets onGround, hitX, hitY. */
export function moveBody(w, b, dt, stepUp = 8) {
  b.hitX = b.hitY = false;
  const wasGround = b.onGround;
  b.onGround = false;
  let dx = b.vx * dt, dy = b.vy * dt;
  while (Math.abs(dx) > 1e-4) {
    const s = Math.max(-3, Math.min(3, dx));
    dx -= s;
    if (!boxHits(w, b.x + s, b.y, b.hw, b.h)) { b.x += s; continue; }
    let ok = false;
    if (stepUp && (wasGround || b.vy >= 0)) for (let up = CELL; up <= stepUp; up += CELL) if (!boxHits(w, b.x + s, b.y - up, b.hw, b.h)) { b.x += s; b.y -= up; ok = true; break; }
    if (!ok && b.slide) for (let o = 1; o <= b.slide && !ok; o++) for (const q of b.fly ? [-o, o] : [-o]) if (!boxHits(w, b.x + s, b.y + q, b.hw, b.h)) { b.x += s; b.y += q; ok = true; break; }
    if (!ok) { b.hitX = true; break; }
  }
  while (Math.abs(dy) > 1e-4) {
    const s = Math.max(-3, Math.min(3, dy));
    dy -= s;
    if (!boxHits(w, b.x, b.y + s, b.hw, b.h)) { b.y += s; continue; }
    if (b.slide && !(s > 0 && !b.fly)) { let ok = false; for (let o = 1; o <= b.slide && !ok; o++) for (const q of [-o, o]) if (!boxHits(w, b.x + q, b.y + s, b.hw, b.h)) { b.x += q; b.y += s; ok = true; break; } if (ok) continue; }
    if (s > 0) { b.y = Math.floor((b.y + s) / CELL) * CELL; b.onGround = true; }
    b.hitY = true;
    break;
  }
  if (!b.onGround && b.vy >= 0 && boxHits(w, b.x, b.y + 1, b.hw, b.h)) b.onGround = true;
}

// ---- poses
const run = (ph, lean, reach = 9) => {
  const c = Math.cos(ph), s = Math.sin(ph);
  return { lean, crouch: 2 + Math.abs(c) * 1.5, ffx: reach * c, ffy: -4 - Math.max(0, s) * 6, fbx: -reach * c, fby: -4 - Math.max(0, -s) * 6, fx: -2 - 9 * c, fy: -19 - Math.abs(c) * 2, bx: 4 + 9 * c, by: -19 - Math.abs(c) * 2 };
};
const P = {
  idle: (t) => { const u = Math.floor(t * 2.5) & 1; return { crouch: u, fy: -15 + u, by: -15 + u }; },
  crouch: { crouch: 9, lean: 3, fx: 6, fy: -10, bx: 9, by: -9, ffx: -6, fbx: 7 },
  jump: { lean: 1, fx: -6, fy: -34, bx: 9, by: -32, ffx: -3, ffy: -9, fbx: 5, fby: -5, turn: 0.6 },
  fall: { lean: -1, fx: -11, fy: -27, bx: 13, by: -27, ffx: -5, ffy: -5, fbx: 6, fby: -7, turn: 0.8 },
  fly: { fx: 3, fy: -43, bx: 5, by: -17, ffx: -1, ffy: -3, fbx: 3, fby: -4, toeF: 1, toeB: 1 },
  flyBoost: { fx: 2, fy: -43, bx: 6, by: -42, ffx: -1, ffy: -3, fbx: 3, fby: -4, toeF: 1, toeB: 1 },
  hover: (t) => { const u = Math.sin(t * 3); return { fx: -7, fy: -19 + u, bx: 10, by: -19 + u, ffx: -3, ffy: -6 - u, fbx: 4, fby: -4, turn: 0.5 }; },
  punch: { lean: 5, crouch: 3, fx: 17, fy: -25, bx: -4, by: -22, ffx: 9, fbx: -9, ghost: 1 },
  wind: { lean: -4, crouch: 3, fx: -10, fy: -24, bx: 8, by: -24, ffx: 6, fbx: -8 },
  lift: { lean: -2, crouch: 1, fx: -3, fy: -47, bx: 4, by: -47, ffx: -3, ffy: -5, fbx: 4, fby: -5, turn: 1 },
  swim: (t) => { const c = Math.cos(t * 6); return { lean: 6, fx: 8 + 6 * c, fy: -26, bx: 8 - 6 * c, by: -24, ffx: -3 + 4 * c, ffy: -5, fbx: 2 - 4 * c, fby: -5 }; },
};

export class Hero {
  constructor(game) {
    this.g = game;
    Object.assign(this, { x: 0, y: 0, vx: 0, vy: 0, hw: 5, h: 32, face: 1, onGround: false, fly: false, pounding: false, superJ: 0, hp: 100, hurtT: 0, dead: 0, t: 0, runPh: 0, rot: 0, punchT: 0, fireT: 9, aim: 0, coyote: 0, dashing: false, inv: 0, weaponPose: null });
    this.scarf = Array.from({ length: 8 }, () => [0, 0]);
    this.ghosts = []; this.ghostAcc = 0;
    this.grid = new Int32Array(96 * 96); this.gsrc = new Int16Array(96 * 96);
    this.pose = P.idle(0);
  }
  get cx() { return this.x; }
  get cy() { return this.y - 18; }
  get speed() { return Math.hypot(this.vx, this.vy); }
  /** Where shots leave from, given the aim point. */
  muzzle(ax, ay) {
    if (this.fly || !this.onGround) { const a = Math.atan2(ay - this.cy, ax - this.x); return [this.x + Math.cos(a) * 14, this.cy + Math.sin(a) * 14, a]; }
    const a = Math.atan2(ay - (this.y - 26), ax - this.x);
    return [this.x + Math.cos(a) * 16, this.y - 26 + Math.sin(a) * 16, a];
  }
  eyes() {
    const c = Math.cos(this.rot * this.face), s = Math.sin(this.rot * this.face), ox = 3 * this.face, oy = -15;
    return [this.x + ox * c - oy * s, this.y - 19 + ox * s + oy * c];
  }

  update(dt, I) {
    const g = this.g, w = g.world;
    this.t += dt; this.fireT += dt; this.inv -= dt; this.hurtT += dt;
    if (this.punchT > 0) this.punchT -= dt;
    if (this.dead > 0) return;
    const water = w.inWater(this.x, this.y - 14);
    const wasGround = this.onGround, vy0 = this.vy;
    this.dashing = I.dash && (I.mx !== 0 || (this.fly && I.my !== 0));
    this.slide = this.dashing && !this.fly && !(I.my < -0.3) ? 0 : 5;
    // jump held: after a moment it becomes flight, straight up unless steered
    this.jumpT = I.jump ? (this.jumpT || 0) + dt : 0;
    if (!this.fly && !this.pounding && I.jump && this.jumpT > 0.22 && !this.onGround && this.superJ <= 0 && !water) { this.fly = true; this.vy *= 0.5; g.sfx("fly"); }
    // C: a tap drops out of flight, held in the air it pounds the ground
    this.cT = I.c ? (this.cT || 0) + dt : 0;
    if (I.poundP && this.fly) { this.fly = false; this.cDropped = true; }
    if (!I.c) { this.cDropped = false; this.cUsed = false; }
    if (I.fire || this.fireT < 0.35) this.face = I.aimX >= this.x ? 1 : -1;
    else if (I.mx) this.face = I.mx > 0 ? 1 : -1;

    if (I.c && this.cT > 0.2 && !this.cUsed && !this.onGround && !this.pounding) { this.cUsed = true; this.pounding = true; this.fly = false; this.vx = 0; this.vy = Math.max(this.vy, 300); g.sfx("dive"); }

    if (this.pounding) {
      this.vy = Math.min(1000, this.vy + 3200 * dt);
    } else if (this.fly) {
      let mx = I.mx, my = I.my; if (I.jump && !mx && !my) my = -1; const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
      const sp = this.dashing ? 600 : 240, k = Math.min(1, (this.dashing ? 5 : 7) * dt);
      this.vx += (mx * sp - this.vx) * k; this.vy += (my * sp - this.vy) * k;
    } else {
      const sp = this.dashing ? 540 : 165, acc = this.onGround ? (this.dashing ? 2600 : 1800) : 900;
      const tv = I.mx * sp * (water ? 0.6 : 1);
      if (I.mx) this.vx += Math.max(-acc * dt, Math.min(acc * dt, tv - this.vx));
      else this.vx *= Math.max(0, 1 - (this.onGround ? 12 : 1.5) * dt);
      if (water) {
        this.vy += 260 * dt; this.vy *= 1 - 3 * dt; this.vx *= 1 - 2 * dt;
        if (I.jump || I.my < 0) this.vy -= 900 * dt;
        if (I.jumpP && !w.inWater(this.x, this.y - 30)) this.vy = -330;
      } else {
        this.vy = Math.min(900, this.vy + 950 * dt);
        if (!I.jump && this.vy < -120 && this.superJ <= 0) this.vy += 1400 * dt;
      }
      this.coyote = this.onGround ? 0.1 : this.coyote - dt;
      if (I.jumpP && !water) {
        if (this.coyote > 0) {
          if (I.my > 0.5) { this.vy = -900; this.superJ = 0.9; g.superJump(this.x, this.y); }
          else { this.vy = -350; g.sfx("jump"); }
          this.coyote = 0; this.onGround = false;
        }
      }
    }
    if (this.superJ > 0) { this.superJ -= dt; if (this.vy > -200) this.superJ = 0; }

    // fast enough and nothing stops him: walls give way
    const smash = this.pounding ? false : this.dashing || this.superJ > 0;
    if (smash) {
      let sp = this.speed || 1, nx = this.vx / sp, ny = this.vy / sp;
      if (this.onGround && !this.fly && this.superJ <= 0) { nx = Math.sign(this.vx || I.mx || this.face); ny = this.dashing ? I.my * 0.7 : 0; const m = Math.hypot(nx, ny); nx /= m; ny /= m; }
      if (sp < 200 && this.dashing) { const im = Math.hypot(I.mx, this.fly ? I.my : 0) || 1; nx = I.mx / im; ny = (this.fly ? I.my : 0) / im; sp = 200; }
      const look = Math.max(6, sp * dt * 1.6);
      if (boxHits(w, this.x + nx * look, this.y + ny * look - (this.onGround && ny === 0 ? CELL * 2 : 0), this.hw + 1, this.h + 1)) {
        // level run: blast centred on the whole body (feet included) so nothing is left to snag on
        const oy = this.y - (this.onGround && ny === 0 ? 17 : 16) + ny * 14;
        g.smashThrough(this.x + nx * 12, oy, nx, ny);
        // running through the ground: A/D alone digs fastest, adding S/W digs slower
        if (this.dashing && !this.fly) {
          const diag = Math.abs(ny) > 0.2;
          if (!diag) g.smashThrough(this.x + nx * 28, oy, nx, ny);
          const minV = diag ? 100 : 205;
          if (Math.abs(this.vx) < minV && nx) this.vx = Math.sign(nx) * minV;
          if (diag) this.vx = Math.max(-155, Math.min(155, this.vx));
          // underground (rock over the head): 40% slower
          if (w.solidPx(this.x, this.y - this.h - 6)) this.vx = Math.max(-325, Math.min(325, this.vx));
        }
      }
    }
    // the flash runs on water
    if (!this.fly && this.dashing && Math.abs(this.vx) > 300 && this.vy >= 0 && this.y >= SEA * CELL - 2 && this.y < SEA * CELL + 8 && w.wet(Math.floor(this.x / CELL)) && !w.solidPx(this.x, SEA * CELL + 1)) {
      this.y = SEA * CELL; this.vy = 0;
      moveBody(w, this, dt, 8); this.vy = 0; this.onGround = true;
      if (Math.random() < 0.7) g.spray(this.x - this.face * 6, this.y, -this.face);
    } else {
      // flash on the ground: dead level unless steered; S digs down, W climbs
      const run = this.dashing && !this.fly && this.onGround;
      if (run && I.my > 0.3) this.vy = Math.max(this.vy, 260);
      if (run && I.my < -0.3) this.vy = Math.min(this.vy, -220);
      moveBody(w, this, dt, this.fly ? 0 : this.dashing && !(I.my < -0.3) ? 0 : 8);
    }
    if (this.hitX && !smash) this.vx = 0;
    // blocked mid-flash by something the blast didn't break: knock out just the cells in the way, so he slows but never jams
    if (this.hitX && this.dashing) {
      const dir = Math.sign(this.vx || I.mx || this.face), cx = Math.floor((this.x + dir * (this.hw + 2)) / CELL);
      for (let cy = Math.floor((this.y - this.h) / CELL); cy <= Math.floor((this.y - 1) / CELL); cy++) if (w.get(cx, cy)) g.addScore(w.destroyCell(cx, cy, dir * 160, -60));
      this.vx *= this.onGround && !(Math.abs(I.my) > 0.3) ? 0.9 : 0.6;
    }
    if (this.hitY) {
      if (this.pounding && this.onGround) { this.pounding = false; g.poundImpact(this.x, this.y, vy0); this.vy = 0; }
      else if (this.onGround && !wasGround && vy0 > 560) { g.heavyLanding(this.x, this.y, vy0); this.vy = 0; }
      else if (!(smash && this.superJ > 0)) this.vy = this.onGround ? 0 : Math.max(0, this.vy);
    }
    if (this.fly && this.onGround && I.my > 0.3) this.fly = false;
    if (water && !this._wet && Math.abs(vy0) > 120) g.splash(this.x, SEA * CELL, Math.abs(vy0));
    this._wet = water;
    if (this.y > (WH - LAVA) * CELL) { this.y = (WH - LAVA) * CELL; this.vy = Math.min(0, this.vy); }

    // ---- the pose
    const moving = Math.abs(this.vx) > 20;
    let pose, rot = 0;
    if (this.pounding) { pose = P.flyBoost; rot = Math.PI; }
    else if (this.fly) {
      if (this.speed > 70) { pose = this.dashing ? P.flyBoost : P.fly; rot = Math.atan2(this.vy, Math.abs(this.vx)) + Math.PI / 2; if (!this.dashing) rot = rot * 0.8 + 0.1; }
      else { pose = P.hover(this.t); rot = 0; }
    } else if (water) { pose = P.swim(this.t); rot = moving ? 0.9 : 0.2; }
    else if (!this.onGround) pose = this.vy < 0 ? P.jump : P.fall;
    else if (moving) { this.runPh += Math.abs(this.vx) * dt * (this.dashing ? 0.05 : 0.1); const ph = Math.round(this.runPh / (Math.PI / 5)) * (Math.PI / 5); pose = run(ph, this.dashing ? 9 : 3, this.dashing ? 12 : 9); if (this.dashing) pose.ghost = 1; }
    else if (I.my > 0.5) pose = P.crouch;
    else pose = P.idle(this.t);
    if (this.punchT > 0) pose = { ...pose, ...(this.punchT > 0.2 ? P.wind : P.punch), ffx: pose.ffx, fbx: pose.fbx };
    else if (this.fireT < 0.4 && !this.fly && !this.pounding && !water) {
      const a = Math.atan2(I.aimY - (this.y - 26), Math.abs(I.aimX - this.x)), qa = Math.round(a * 8) / 8;
      pose = { ...pose, fx: 13 * Math.cos(qa), fy: -26 + 13 * Math.sin(qa), bx: 6, by: -22, ...(this.weaponPose ? { weapon: this.weaponPose, sa: qa } : {}) };
      if (!this.onGround) pose.lean = 0;
    }
    if (this.lift > 0) { this.lift -= dt; pose = P.lift; rot = 0; }
    this.pose = pose;
    let d = rot - this.rot; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    this.rot += d * Math.min(1, 14 * dt);
    if (Math.abs(rot) < 0.01 && Math.abs(this.rot) < 0.06) this.rot = 0;

    // the scarf trails behind
    const [nx, ny] = this.local(-2, -30);
    const S = this.scarf; S[0][0] = nx; S[0][1] = ny;
    for (let i = 1; i < S.length; i++) {
      S[i][0] += (-this.vx * 0.012 - this.face * 0.5 + Math.sin(this.t * 9 + i) * 0.35); S[i][1] += 0.55 - this.vy * 0.012 + Math.cos(this.t * 7 + i * 1.3) * 0.3;
      const dx = S[i][0] - S[i - 1][0], dy = S[i][1] - S[i - 1][1], l = Math.hypot(dx, dy) || 1;
      S[i][0] = S[i - 1][0] + (dx / l) * 2.6; S[i][1] = S[i - 1][1] + (dy / l) * 2.6;
    }
    // after-images at speed
    this.ghostAcc += dt;
    for (const gh of this.ghosts) gh.age += dt;
    while (this.ghosts.length && this.ghosts[0].age > 0.22) this.ghosts.shift();
    if ((this.dashing && this.speed > 250 || this.pounding || this.superJ > 0) && this.ghostAcc > 0.028) { this.ghostAcc = 0; this.ghosts.push({ x: this.x, y: this.y, face: this.face, rot: this.rot, pose: this.pose, age: 0 }); }
  }
  /** A point given in the upright body's space (x forward, y up negative from the feet), where it is now. */
  local(lx, ly) {
    const a = this.rot * this.face, c = Math.cos(a), s = Math.sin(a), ox = lx * this.face, oy = ly + 19;
    return [this.x + ox * c - oy * s, this.y - 19 + ox * s + oy * c];
  }

  drawBody(frame, x, y, face, rot, pose, ghost) {
    const C = frame.color, L = frame.light, W = frame.w, H = frame.h, r = posed(pose);
    const BX = Math.round(x) - frame.ox, BY = Math.round(y) - frame.oy;
    const put = (px, py, c) => {
      if (px < 0 || py < 0 || px >= W || py >= H) return;
      const i = py * W + px;
      if (ghost) { if (((px + py) & 1) === 0 && (ghost > 0.4 || (py & 1))) { C[i] = ghost > 0.6 ? 0xffffe9a0 : 0xffff9a3c; L[i] = 0xff402010; } }
      else { C[i] = c; if (c === VISOR) L[i] = 0xff707020; }
    };
    if (Math.abs(rot) < 0.02) {
      for (let i = 0; i < r.n; i++) put(face < 0 ? BX - r.xs[i] - 1 : BX + r.xs[i], BY + r.ys[i], ghost ? 1 : dress(r.color[i], r.src[i]));
      return;
    }
    // rotated: paint the pose on a scratch grid, then sample it turned about the middle of the body
    const G = this.grid, S = this.gsrc, N = 96, O = 48;
    G.fill(0);
    for (let i = 0; i < r.n; i++) { const gx = r.xs[i] + O, gy = r.ys[i] + 19 + O; if (gx >= 0 && gy >= 0 && gx < N && gy < N) { G[gy * N + gx] = r.color[i]; S[gy * N + gx] = r.src[i]; } }
    const a = rot, c = Math.cos(a), s = Math.sin(a);
    for (let dy = -34; dy <= 34; dy++) for (let dx = -34; dx <= 34; dx++) {
      const sx = Math.round(dx * c + dy * s) + O, sy = Math.round(-dx * s + dy * c) + O;
      if (sx < 0 || sy < 0 || sx >= N || sy >= N) continue;
      const col = G[sy * N + sx];
      if (!col) continue;
      put(face < 0 ? BX - dx - 1 : BX + dx, BY - 19 + dy, ghost ? 1 : dress(col, S[sy * N + sx]));
    }
  }
  draw(frame) {
    if (this.dead > 0) return;
    for (const gh of this.ghosts) this.drawBody(frame, gh.x, gh.y, gh.face, gh.rot, gh.pose, 1 - gh.age / 0.22);
    if (this.inv > 0 && Math.floor(this.t * 20) & 1) return;
    const C = frame.color, W = frame.w, H = frame.h, S = this.scarf;
    for (let i = 1; i < S.length; i++) {
      const x0 = S[i - 1][0], y0 = S[i - 1][1], x1 = S[i][0], y1 = S[i][1], col = SCARF[i < 3 ? 0 : i < 6 ? 1 : 2];
      for (let k = 0; k <= 3; k++) {
        const px = Math.round(x0 + (x1 - x0) * k / 3) - frame.ox, py = Math.round(y0 + (y1 - y0) * k / 3) - frame.oy;
        for (let b = 0; b < (i < 6 ? 2 : 1); b++) { const yy = py + b; if (px >= 0 && yy >= 0 && px < W && yy < H) C[yy * W + px] = b ? SCARF[2] : col; }
      }
    }
    this.drawBody(frame, this.x, this.y, this.face, this.rot, this.pose, 0);
  }
}
