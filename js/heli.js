'use strict';
/* بالگرد سیاه (نمای بالا): بدنه و ملخ به‌صورت SVG ساخته و روی بوم کشیده می‌شوند */
(function () {
  const C = { scale: 1.25, spoolUpTime: 4, spoolDownTime: 6, rotorSpeed: 1500, cruiseAlt: 120, climbRate: 55, descentRate: 45, maxSpeed: 260, accel: 140, turnRate: 1.5, altZoom: 380, shadowOffset: [.55, .75], hoverSway: 2, dustAlt: 55 };
  const BODY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-104 -24 152 48" width="456" height="144">
<defs>
<linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#08090a"/><stop offset=".25" stop-color="#1b1d20"/><stop offset=".45" stop-color="#34373c"/><stop offset=".65" stop-color="#1c1e21"/><stop offset="1" stop-color="#070708"/></linearGradient>
<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070708"/><stop offset=".45" stop-color="#25272b"/><stop offset="1" stop-color="#050506"/></linearGradient>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3d5560"/><stop offset=".5" stop-color="#1c2a31"/><stop offset="1" stop-color="#0f171b"/></linearGradient>
</defs>
<g stroke="#000" stroke-linecap="round" fill="none"><path d="M-6,-20 V20 M22,-20 V20" stroke-width="2.6"/><path d="M-20,-20.5 H32 M-20,20.5 H32" stroke-width="3.4"/><path d="M32,-20.5 q5,0 6,3 M32,20.5 q5,0 6,-3" stroke-width="2.6"/></g>
<g fill="url(#a)" stroke="#000" stroke-width=".8" stroke-linejoin="round"><path d="M-18,-5.5 L-93,-2.2 L-93,2.2 L-18,5.5 Z"/><rect x="-86" y="-17" width="11" height="34" rx="3"/><path d="M-101,-1.6 L-88,-2.4 L-88,2.4 L-101,1.6 Z"/><path d="M45,0 C45,-9 35,-15 18,-16.5 L-12,-15.5 C-24,-13.5 -31,-7 -31,0 C-31,7 -24,13.5 -12,15.5 L18,16.5 C35,15 45,9 45,0 Z"/></g>
<path d="M-70,-3.3 L-64,-3.6 L-64,3.6 L-70,3.3 Z" fill="#c9a227"/>
<path d="M-45,-4.3 V4.3 M-58,-3.8 V3.8" stroke="#000" stroke-width=".6" opacity=".6"/>
<path d="M2,-16 V-9 M2,16 V9 M-14,-15.3 V-9 M-14,15.3 V9" stroke="#000" stroke-width=".7" opacity=".7"/>
<path d="M43,0 C43,-8 34,-13.5 21,-14.5 L19,-2 L19,2 L21,14.5 C34,13.5 43,8 43,0 Z" fill="url(#g)" stroke="#000" stroke-width=".8"/>
<path d="M19,0 H44 M31,-13.6 L29,-1 M31,13.6 L29,1" stroke="#111214" stroke-width="1.6"/>
<path d="M36,-9 C39,-7 41,-4 41.5,-1.5" fill="none" stroke="#bcd3da" stroke-width="1.3" stroke-linecap="round" opacity=".55"/>
<path d="M10,-13.5 L16,-13.8 L15,-5 L10,-5 Z M10,13.5 L16,13.8 L15,5 L10,5 Z" fill="url(#g)" stroke="#000" stroke-width=".6"/>
<rect x="-24" y="-8.5" width="36" height="17" rx="6" fill="url(#b)" stroke="#000" stroke-width=".7"/>
<rect x="-29" y="-11" width="8" height="4.4" rx="1.5" fill="#050505"/><rect x="-29" y="6.6" width="8" height="4.4" rx="1.5" fill="#050505"/>
<path d="M-16,-4 H4 M-16,0 H4 M-16,4 H4" stroke="#000" stroke-width=".8" opacity=".7"/>
<circle cx="6" cy="-16.6" r="1.7" fill="#e23b2e"/><circle cx="6" cy="16.6" r="1.7" fill="#3ed06a"/>
<rect x="-96.5" y="2.2" width="3" height="3.4" fill="#000"/>
</svg>`;
  const R4 = [0, 90, 180, 270];
  const BLADES = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-74 -74 148 148" width="444" height="444"><g fill="#1a1b1d" stroke="#000" stroke-width=".4">${R4.map(r => `<rect x="4" y="-2.4" width="68" height="4.8" rx="1.2" transform="rotate(${r})"/>`).join('')}</g><g fill="#c9a227">${R4.map(r => `<rect x="66" y="-2.4" width="6" height="4.8" rx="1.2" transform="rotate(${r})"/>`).join('')}</g><circle r="6" fill="#2a2c2e" stroke="#000" stroke-width=".8"/><circle r="2.4" fill="#8a8d86"/></svg>`;
  const img = s => { const i = new Image(); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); return i; };
  const IB = img(BODY), IR = img(BLADES), clamp = G.clamp, rnd = G.rand;

  G.makeHeli = function (x, y, heading, o) {
    o = o || {};
    return { kind: 'heli2', x, y, z: o.z || 0, heading, vx: 0, vy: 0, tx: x, ty: y, rotor: o.rotor || 0, blade: 20, phase: o.phase || 'ground', autoLand: true, hold: true, leave: false, gone: false, settle: 9, t: 0 };
  };
  function move(s, dt) {
    const dx = s.tx - s.x, dy = s.ty - s.y, dist = Math.hypot(dx, dy), want = Math.min(C.maxSpeed, dist * 1.1);
    let ax = (dist > .01 ? dx / dist * want : 0) - s.vx, ay = (dist > .01 ? dy / dist * want : 0) - s.vy;
    const am = Math.hypot(ax, ay), lim = C.accel * dt; if (am > lim) { ax *= lim / am; ay *= lim / am; }
    s.vx += ax; s.vy += ay; s.x += s.vx * dt; s.y += s.vy * dt;
    if (dist > 25) { let d = Math.atan2(dy, dx) - s.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); s.heading += clamp(d, -C.turnRate * dt, C.turnRate * dt); }
    return dist < 3 && Math.hypot(s.vx, s.vy) < 8;
  }
  G.Heli = {
    IB, IR, C,
    flyTo(s, x, y, land) {
      s.tx = x; s.ty = y; s.autoLand = land !== false;
      if (s.phase === 'ground' || s.phase === 'spooldown') s.phase = 'spoolup'; else if (s.phase === 'descend' || s.phase === 'idle') s.phase = 'liftoff';
    },
    leave(s, x, y) { this.flyTo(s, x, y, false); s.leave = true; },
    update(s, dt) {
      s.t += dt; s.settle += dt;
      switch (s.phase) {
        case 'spoolup': s.rotor = Math.min(1, s.rotor + dt / C.spoolUpTime); if (s.rotor >= 1) s.phase = 'liftoff'; break;
        case 'liftoff': { const e = clamp((s.z + 3) / 25, 0, 1) * clamp((C.cruiseAlt - s.z) / 30, .15, 1); s.z += C.climbRate * e * dt; if (s.z > C.cruiseAlt * .45) move(s, dt); if (s.z >= C.cruiseAlt - .5) s.phase = 'cruise'; break; }
        case 'cruise': { const ar = move(s, dt) || (s.leave && Math.hypot(s.tx - s.x, s.ty - s.y) < 60); if (ar && s.autoLand) s.phase = 'descend'; else if (ar && s.leave) s.gone = true; break; }
        case 'descend': move(s, dt); s.z -= C.descentRate * clamp(s.z / 40, .18, 1) * dt; if (s.z <= 0) { s.z = 0; s.vx = s.vy = 0; s.settle = 0; s.phase = s.hold ? 'idle' : 'spooldown'; } break;
        case 'spooldown': s.rotor = Math.max(0, s.rotor - dt / C.spoolDownTime); if (s.rotor <= 0) s.phase = 'ground'; break;
      }
      s.blade = (s.blade - s.rotor * C.rotorSpeed * dt) % 360;
      if (s.rotor > .5 && s.z < C.dustAlt && Math.random() < s.rotor * (1 - s.z / C.dustAlt) * dt * 40) {
        const a = rnd(0, 6.283), r = rnd(30, 70), v = rnd(70, 160); G.fx.dust(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, Math.cos(a) * v, Math.sin(a) * v);
      }
    },
    draw(c, s, shadow) {
      if (!IB.complete || !IB.naturalWidth) return;
      const air = clamp(s.z / 40, 0, 1), sh = s.rotor * (1 - air) * .5;
      const ox = Math.sin(s.t * 1.3) * C.hoverSway * air + rnd(-sh, sh), oy = Math.cos(s.t * 1.7) * C.hoverSway * .8 * air + rnd(-sh, sh);
      const sq = 1 - .02 * Math.sin(s.settle * 18) * Math.exp(-s.settle * 5), ang = s.heading + Math.sin(s.t * .9) * .014 * air;
      const sc = C.scale * (1 + s.z / C.altZoom) * sq, blur = clamp((s.rotor - .25) / .5, 0, 1);
      c.save();
      if (shadow) {
        c.translate(s.x + 3 + s.z * C.shadowOffset[0], s.y + 4 + s.z * C.shadowOffset[1]); c.rotate(ang); c.scale(C.scale, C.scale);
        const al = clamp(.42 - s.z / 450, .16, .42); c.globalAlpha = al; c.filter = 'brightness(0) blur(2px)'; c.drawImage(IB, -104, -24, 152, 48); c.filter = 'none';
        if (blur > 0) { c.globalAlpha = al * blur * .45; c.fillStyle = '#000'; c.beginPath(); c.arc(0, 0, 72, 0, 6.283); c.fill(); }
        c.restore(); return;
      }
      c.translate(s.x + ox, s.y + oy); c.rotate(ang); c.scale(sc, sc);
      c.drawImage(IB, -104, -24, 152, 48);
      if (s.rotor > 0 && s.t % 1.1 < .12) { c.fillStyle = '#ff4a3a'; c.beginPath(); c.arc(-90, 0, 2.4, 0, 6.283); c.fill(); }
      const tw = Math.abs(Math.cos(s.t * 45 * s.rotor)), tl = 22 * (tw + (1 - tw) * blur); c.fillStyle = '#0d0e10'; c.fillRect(-95 - tl / 2, 4.3, tl, 1.8);
      if (blur > 0) {
        const g = c.createRadialGradient(0, 0, 0, 0, 0, 73); g.addColorStop(0, 'rgba(10,10,12,0)'); g.addColorStop(.25, 'rgba(10,10,12,.1)'); g.addColorStop(.93, 'rgba(10,10,12,.3)'); g.addColorStop(.97, 'rgba(201,162,39,.3)'); g.addColorStop(1, 'rgba(10,10,12,0)');
        c.globalAlpha = blur; c.fillStyle = g; c.beginPath(); c.arc(0, 0, 73, 0, 6.283); c.fill();
      }
      c.globalAlpha = 1 - .82 * blur; c.rotate(s.blade * Math.PI / 180); if (IR.complete && IR.naturalWidth) c.drawImage(IR, -74, -74, 148, 148);
      c.restore();
    },
  };
})();
