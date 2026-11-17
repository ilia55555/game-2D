'use strict';
/* صحنهٔ سه‌بعدی (three.js): زمین طبیعی با گودال واقعی، دیوارها، اشیا، نیروها، دود و آتش */
(function () {
  const T = G.T, TAU = Math.PI * 2, HC = G.PROPS_CFG.camHeight, CH = 16, CPX = CH * T;
  const view = G.view = { w: 1280, h: 720, zoom: 1, dpr: 1, x: 0, y: 0, shake: 0, sw: 1280, sh: 720 };
  let R = null, scene, cam, sun, world = null, M = null, frame = 0, ok3d = false;
  const tc = new THREE.Color(), m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3a = new THREE.Vector3(), v3b = new THREE.Vector3(), v3s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), eul = new THREE.Euler();
  const lin = hex => tc.set(hex).convertSRGBToLinear();
  const srand = seed => { let s = (seed * 9301 + 49297) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

  /* ---------- سازندهٔ هندسه: چند شکل ساده را با رنگ رأس در یک مش ادغام می‌کند ---------- */
  function GB() { this.p = []; this.n = []; this.c = []; }
  const GP = GB.prototype;
  GP.add = function (geo, col, mat, jit) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone(); if (mat) g.applyMatrix4(mat);
    const P = g.attributes.position.array, N = g.attributes.normal.array, c = lin(col), r = c.r, gg = c.g, b = c.b;
    for (let i = 0; i < P.length; i += 9) { // رنگ هر مثلث کمی فرق می‌کند تا سطح یکدست و مصنوعی نباشد
      const k = jit ? 1 + (Math.random() - .5) * jit : 1;
      for (let q = 0; q < 9; q += 3) { this.p.push(P[i + q], P[i + q + 1], P[i + q + 2]); this.n.push(N[i + q], N[i + q + 1], N[i + q + 2]); this.c.push(r * k, gg * k, b * k); }
    }
    g.dispose(); return this;
  };
  const UB = new THREE.BoxGeometry(1, 1, 1), ICO = [new THREE.IcosahedronGeometry(1, 0), new THREE.IcosahedronGeometry(1, 1), new THREE.IcosahedronGeometry(1, 2)];
  const TRS = (x, y, z, sx, sy, sz, ry, rx, rz) => m4.compose(v3a.set(x, y, z), q4.setFromEuler(eul.set(rx || 0, ry || 0, rz || 0)), v3s.set(sx, sy, sz));
  GP.box = function (w, h, d, x, y, z, col, ry, jit) { return this.add(UB, col, TRS(x, y, z, w, h, d, ry), jit); };
  GP.cyl = function (rt, rb, h, seg, x, y, z, col, jit) { const g = new THREE.CylinderGeometry(rt, rb, h, seg); this.add(g, col, TRS(x, y, z, 1, 1, 1), jit); g.dispose(); return this; };
  GP.sph = function (rx, ry, rz, x, y, z, col, det, jit) { return this.add(ICO[det == null ? 1 : det], col, TRS(x, y, z, rx, ry, rz), jit); };
  GP.limb = function (x0, y0, z0, x1, y1, z1, r0, r1, col, seg) { // استوانه بین دو نقطه
    const d = v3b.set(x1 - x0, y1 - y0, z1 - z0), len = d.length() || 1, g = new THREE.CylinderGeometry(r1, r0, len, seg || 6);
    m4.compose(v3a.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), q4.setFromUnitVectors(UP, d.normalize()), v3s.set(1, 1, 1)); this.add(g, col, m4); g.dispose(); return this;
  };
  GP.geo = function (flat) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (flat) g.computeVertexNormals(); else g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    return g;
  };
  GP.mesh = function (mat, flat, noCast) { const m = new THREE.Mesh(this.geo(flat), mat || M.std); m.castShadow = !noCast; m.receiveShadow = true; return m; };

  /* ---------- نویز کاشی‌شونده (برای بافت زمین و شکل نامنظم دود) ---------- */
  function vnoise(S, cells, oct, seed) {
    const out = new Float32Array(S * S), R = srand(seed); let amp = 1, tot = 0;
    for (let o = 0; o < oct; o++) {
      const n = cells << o, L = new Float32Array(n * n); for (let i = 0; i < L.length; i++) L[i] = R();
      for (let y = 0; y < S; y++) { const fy = y / S * n, y0 = fy | 0, ty = fy - y0, sy = ty * ty * (3 - 2 * ty), ya = (y0 % n) * n, yb = ((y0 + 1) % n) * n;
        for (let x = 0; x < S; x++) { const fx = x / S * n, x0 = fx | 0, tx = fx - x0, sx = tx * tx * (3 - 2 * tx), xa = x0 % n, xb = (x0 + 1) % n; out[y * S + x] += amp * ((L[ya + xa] * (1 - sx) + L[ya + xb] * sx) * (1 - sy) + (L[yb + xa] * (1 - sx) + L[yb + xb] * sx) * sy); } }
      tot += amp; amp *= .5;
    }
    for (let i = 0; i < out.length; i++) out[i] /= tot; return out;
  }
  let noiseTex = null, NF = null;
  function mkNoise() {
    const S = 256, d = new Uint8Array(S * S * 4), ch = [vnoise(S, 4, 5, 11), vnoise(S, 8, 4, 23), vnoise(S, 16, 4, 37), vnoise(S, 64, 2, 51)]; NF = ch[1];
    for (let i = 0; i < S * S; i++) for (let k = 0; k < 4; k++) d[i * 4 + k] = Math.max(0, Math.min(255, (ch[k][i] - .5) * 1.9 * 255 + 128));
    noiseTex = new THREE.DataTexture(d, S, S, THREE.RGBAFormat); noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping; noiseTex.magFilter = THREE.LinearFilter; noiseTex.minFilter = THREE.LinearMipmapLinearFilter; noiseTex.generateMipmaps = true; noiseTex.needsUpdate = true;
  }

  /* ---------- اطلس ذره‌ها: تکه‌های دود و شعله با لبهٔ نامنظم ---------- */
  let atlas = null;
  function mkAtlas() {
    const C = 128, cn = document.createElement('canvas'); cn.width = cn.height = C * 4; const g = cn.getContext('2d'), R = srand(77);
    const cell = (i, fn) => { g.save(); g.translate((i % 4) * C, ((i / 4) | 0) * C); g.beginPath(); g.rect(0, 0, C, C); g.clip(); fn(); g.restore(); };
    const blobs = (n, spread, rad, al, stretch) => { let x = C / 2, y = C / 2; for (let k = 0; k < n; k++) { x = G.clamp(x + (R() - .5) * spread, C * .3, C * .7); y = G.clamp(y + (R() - .5) * spread * (stretch || 1), C * .28, C * .72); const r = rad * (.5 + R() * .7), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,255,${al})`); gr.addColorStop(.5, `rgba(255,255,255,${al * .55})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } };
    for (let i = 0; i < 4; i++) cell(i, () => blobs(16, 34, 30, .34));
    for (let i = 4; i < 8; i++) cell(i, () => blobs(11, 22, 24, .5, 1.6));
    cell(8, () => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 60); gr.addColorStop(0, '#fff'); gr.addColorStop(.25, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, C, C); });
    cell(9, () => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(30, 44); g.lineTo(78, 26); g.lineTo(100, 62); g.lineTo(84, 98); g.lineTo(40, 92); g.closePath(); g.fill(); });
    cell(10, () => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(14, 64); g.quadraticCurveTo(60, 20, 114, 64); g.quadraticCurveTo(60, 100, 14, 64); g.fill(); });
    cell(11, () => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(20, 96); g.lineTo(66, 14); g.lineTo(104, 84); g.closePath(); g.fill(); });
    cell(12, () => { g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 40, 0, TAU); g.fill(); });
    // فرسایش لبه‌ها با نویز تا هیچ تکه‌ای دایرهٔ منظم نباشد
    const im = g.getImageData(0, 0, C * 4, C * 4), d = im.data, N1 = vnoise(256, 6, 4, 5), N2 = vnoise(256, 20, 3, 9);
    for (let i = 0; i < 8; i++) { const ox = (i % 4) * C, oy = ((i / 4) | 0) * C, hard = i >= 4 ? 1.5 : 1.15;
      for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) { const k = ((oy + y) * C * 4 + ox + x) * 4, n = N1[((y * 2 + i * 37) & 255) * 256 + ((x * 2 + i * 91) & 255)] * .65 + N2[((y * 2 + i * 13) & 255) * 256 + ((x * 2 + i * 57) & 255)] * .35;
        const e = Math.min(x, y, C - 1 - x, C - 1 - y) / 14, a = d[k + 3] / 255 * Math.min(1, e); d[k + 3] = 255 * G.clamp((a - (1 - n) * .55 * hard) * 2.6, 0, 1); } }
    g.putImageData(im, 0, 0);
    atlas = new THREE.CanvasTexture(cn); atlas.minFilter = THREE.LinearFilter; atlas.generateMipmaps = false;
  }

  /* ---------- راه‌اندازی ---------- */
  G.initRender = function (canvas) {
    G.cv2d = canvas; const gl = document.getElementById('gl');
    try { R = new THREE.WebGLRenderer({ canvas: gl, antialias: true, powerPreference: 'high-performance' }); ok3d = true; } catch (e) { console.error(e); ok3d = false; }
    if (ok3d) {
      R.outputEncoding = THREE.sRGBEncoding; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
      scene = new THREE.Scene(); scene.background = lin('#1d2618').clone();
      cam = new THREE.PerspectiveCamera(60, 1, 20, 4000); cam.up.set(0, 0, -1);
      scene.add(new THREE.HemisphereLight(0xcfe0f0, 0x57493a, .62));
      sun = new THREE.DirectionalLight(0xffe6c4, 1.05); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0012; sun.shadow.normalBias = .6;
      const sc = sun.shadow.camera; sc.left = -1100; sc.right = 1100; sc.top = 800; sc.bottom = -800; sc.near = 50; sc.far = 2400; scene.add(sun); scene.add(sun.target);
      M = {
        std: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, metalness: 0 }),
        metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .42, metalness: .6 }),
        glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
        fade: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, transparent: true, opacity: .32, depthWrite: false }),
        glass: new THREE.MeshStandardMaterial({ color: lin('#a8d4e6').clone(), roughness: .1, metalness: .2, transparent: true, opacity: .42 }),
      };
      mkNoise(); mkAtlas(); FX.init();
      for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(0xff9a3c, 0, 520, 1.4); scene.add(l); lights.push({ l, t: 0, max: 1, pow: 0 }); }
    }
    G.resize();
  };
  G.resize = function () {
    const cv = G.cv2d; if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5), w = window.innerWidth, h = window.innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
    view.dpr = dpr; view.sw = w; view.sh = h;
    const vh = (G.touch || Math.min(w, h) < 520) ? 500 : 720;
    view.zoom = Math.max(.45, h / vh); view.w = w / view.zoom; view.h = h / view.zoom;
    if (ok3d) { R.setPixelRatio(dpr); R.setSize(w, h, true); cam.aspect = w / h; cam.fov = 2 * Math.atan(view.h / 2 / HC) * 180 / Math.PI; cam.updateProjectionMatrix(); }
  };
  G.screenToWorld = (sx, sy) => ({ x: view.x + (sx - view.sw / 2) / view.zoom, y: view.y + (sy - view.sh / 2) / view.zoom });

  /* ================= زمین ================= */
  const GC = 16; let hgt = null, gnx = 0, gnz = 0, ground = null, burnCv = null, burnTex = null, groundMat = null;
  const ZCOL = [[64, 92, 43], [107, 102, 56], [84, 56, 43], [28, 23, 33], [61, 84, 76]];
  function buildGround(m) {
    const W = m.w, H = m.h, N = W * H, a = new Uint8Array(N * 4), z = new Uint8Array(N * 4);
    for (let i = 0; i < N; i++) { const g = m.ground[i], c = ZCOL[m.zone[i]]; a[i * 4] = g === 1 ? 255 : 0; a[i * 4 + 1] = g === 2 || g === 5 ? 255 : 0; a[i * 4 + 2] = g === 3 ? 255 : 0; a[i * 4 + 3] = 255; z[i * 4] = c[0]; z[i * 4 + 1] = c[1]; z[i * 4 + 2] = c[2]; z[i * 4 + 3] = 255; }
    const dt = d => { const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat); t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t; };
    const tMat = dt(a), tZone = dt(z);
    burnCv = document.createElement('canvas'); burnCv.width = W * 2; burnCv.height = H * 2; const bg = burnCv.getContext('2d'); bg.fillStyle = '#000'; bg.fillRect(0, 0, W * 2, H * 2);
    burnTex = new THREE.CanvasTexture(burnCv); burnTex.flipY = false; burnTex.minFilter = THREE.LinearFilter; burnTex.generateMipmaps = false;
    groundMat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
    groundMat.onBeforeCompile = sh => {
      sh.uniforms.tMat = { value: tMat }; sh.uniforms.tZone = { value: tZone }; sh.uniforms.tBurn = { value: burnTex }; sh.uniforms.tNoise = { value: noiseTex }; sh.uniforms.uMap = { value: new THREE.Vector2(m.pw, m.ph) };
      sh.vertexShader = 'varying vec2 vGW; varying float vGH;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xz; vGH = transformed.y;');
      sh.fragmentShader = 'varying vec2 vGW; varying float vGH;\nuniform sampler2D tMat, tZone, tBurn, tNoise; uniform vec2 uMap;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
        vec4 nA = texture2D(tNoise, vGW / 610.0), nB = texture2D(tNoise, vGW / 137.0), nC = texture2D(tNoise, vGW / 29.0);
        vec2 warp = (vec2(nB.g, nB.b) - 0.5) * 16.0 + (vec2(nC.b, nC.g) - 0.5) * 4.0;
        vec4 mt = texture2D(tMat, (vGW + warp) / uMap);
        vec3 zc = texture2D(tZone, (vGW + (vec2(nA.g, nA.r) - 0.5) * 260.0 + warp * 3.0) / uMap).rgb;
        float ptc = smoothstep(0.45, 0.62, nA.b * 0.55 + nB.r * 0.45);
        vec3 nat = zc * (0.84 + 0.28 * nB.g);
        nat = mix(nat, zc * vec3(0.95, 0.8, 0.62) + vec3(0.05, 0.035, 0.02), ptc * 0.5);
        nat *= 0.88 + 0.24 * nC.a; nat *= 0.92 + 0.16 * nA.r;
        vec3 road = vec3(0.2, 0.205, 0.215) * (0.78 + 0.34 * nC.a) * (0.86 + 0.28 * nA.g);
        road = mix(road, vec3(0.08), smoothstep(0.03, 0.0, abs(nB.r - 0.5)) * 0.6);
        road = mix(road, vec3(0.3, 0.28, 0.25), smoothstep(0.6, 0.8, nB.a) * 0.35);
        vec3 pave = vec3(0.46, 0.45, 0.42) * (0.8 + 0.32 * nC.a);
        vec2 sl = abs(fract(vGW / 32.0) - 0.5); pave *= 1.0 - 0.28 * smoothstep(0.455, 0.5, max(sl.x, sl.y));
        pave = mix(pave, pave * 0.72, smoothstep(0.52, 0.7, nB.b));
        float pl = floor(vGW.y / 8.0), ph = fract(sin(pl * 12.9898) * 43758.5453);
        vec3 flo = vec3(0.5, 0.38, 0.26) * (0.78 + 0.34 * ph) * (0.86 + 0.24 * nC.a);
        flo *= 1.0 - 0.4 * smoothstep(0.43, 0.5, abs(fract(vGW.y / 8.0) - 0.5));
        flo *= 1.0 - 0.3 * smoothstep(0.985, 1.0, fract((vGW.x + ph * 64.0) / 64.0));
        vec3 colr = nat;
        colr = mix(colr, pave, smoothstep(0.4, 0.6, mt.g));
        colr = mix(colr, flo, smoothstep(0.42, 0.58, mt.b));
        colr = mix(colr, road, smoothstep(0.4, 0.6, mt.r));
        colr *= mix(vec3(1.0), zc * 2.2 + 0.25, 0.35 * max(mt.r, max(mt.g, mt.b)));
        float bn = texture2D(tBurn, vGW / uMap).r; bn = smoothstep(0.12, 0.7, bn + (nB.g - 0.5) * 0.6 * step(0.03, bn));
        colr = mix(colr, vec3(0.125, 0.105, 0.09) * (0.6 + 0.8 * nC.a), bn * 0.92);
        float dp = clamp(-vGH / 34.0, 0.0, 1.0);
        colr *= 1.0 - 0.72 * dp;                                   // ته گودال تاریک‌تر
        colr = mix(colr, vec3(0.3, 0.25, 0.2) * (0.7 + 0.6 * nC.a), clamp(vGH / 7.0, 0.0, 1.0) * 0.8); // خاکِ بالاآمدهٔ لبه
        diffuseColor.rgb = pow(colr, vec3(2.2));`);
    };
    gnx = W * 2; gnz = H * 2; hgt = new Float32Array((gnx + 1) * (gnz + 1));
    const pos = new Float32Array((gnx + 1) * (gnz + 1) * 3), idx = new Uint32Array(gnx * gnz * 6); let k = 0;
    for (let j = 0; j <= gnz; j++) for (let i = 0; i <= gnx; i++) { pos[k++] = i * GC; pos[k++] = 0; pos[k++] = j * GC; }
    k = 0; for (let j = 0; j < gnz; j++) for (let i = 0; i < gnx; i++) { const p = j * (gnx + 1) + i, q = p + gnx + 1; idx[k++] = p; idx[k++] = q; idx[k++] = p + 1; idx[k++] = p + 1; idx[k++] = q; idx[k++] = q + 1; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeVertexNormals();
    ground = new THREE.Mesh(geo, groundMat); ground.receiveShadow = true; world.add(ground);
    // زمین بیرون نقشه (به‌جای سیاهی): همان بافت تا دوردست ادامه دارد
    const E = 2600, fr = (x, z, w, d) => { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.translate(x + w / 2, 0, z + d / 2); const ms = new THREE.Mesh(g, groundMat); ms.receiveShadow = true; world.add(ms); };
    fr(-E, -E, m.pw + 2 * E, E); fr(-E, m.ph, m.pw + 2 * E, E); fr(-E, 0, E, m.ph); fr(m.pw, 0, E, m.ph);
    // خط‌کشی جاده
    const gb = new GB();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (m.ground[i] !== 1) continue; const c = m.zone[i] === 3 ? '#4a4460' : '#b9a550'; if (m.sub[i] === 1 && (y & 1)) gb.box(2.4, .5, 22, x * T + 16, .25, y * T + 16, c); else if (m.sub[i] === 2 && (x & 1)) gb.box(22, .5, 2.4, x * T + 16, .25, y * T + 16, c); }
    if (gb.p.length) { const ms = gb.mesh(M.std, false, true); world.add(ms); }
  }
  const groundH = W3h;
  function W3h(x, y) {
    if (!hgt) return 0; const fx = x / GC, fy = y / GC; if (fx < 0 || fy < 0 || fx >= gnx || fy >= gnz) return 0;
    const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j, p = j * (gnx + 1) + i, q = p + gnx + 1;
    return (hgt[p] * (1 - tx) + hgt[p + 1] * tx) * (1 - ty) + (hgt[q] * (1 - tx) + hgt[q + 1] * tx) * ty;
  }
  // گودال واقعی: زمین فرو می‌رود، لبه بالا می‌آید و خاک سیاه و سوخته می‌شود
  function crater(x, y, r, depth, batch) {
    if (!ground) return; const pos = ground.geometry.attributes.position.array, R2 = r * 1.5, sd = srand(Math.floor(x) * 7 + Math.floor(y) * 13);
    const i0 = Math.max(0, Math.floor((x - R2) / GC)), i1 = Math.min(gnx, Math.ceil((x + R2) / GC)), j0 = Math.max(0, Math.floor((y - R2) / GC)), j1 = Math.min(gnz, Math.ceil((y + R2) / GC));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = i * GC - x, dy = j * GC - y, ang = Math.atan2(dy, dx), d = Math.hypot(dx, dy) / (r * (1 + .16 * Math.sin(ang * 3 + x) + .1 * Math.sin(ang * 5 + y))); if (d > 1.5) continue;
      const p = j * (gnx + 1) + i, bowl = d < 1 ? -depth * Math.pow(1 - d * d, 1.4) : 0, rim = depth * .26 * Math.exp(-Math.pow((d - 1.02) / .2, 2));
      hgt[p] = Math.max(-64, Math.min(hgt[p] + bowl * (.85 + .3 * sd()), bowl + 2)) + rim * (.6 + .8 * sd()); pos[p * 3 + 1] = hgt[p];
    }
    const g = burnCv.getContext('2d'), s = 2 / T, blob = (bx, by, br, al) => { const gr = g.createRadialGradient(bx * s, by * s, 0, bx * s, by * s, br * s); gr.addColorStop(0, `rgba(255,255,255,${al})`); gr.addColorStop(.6, `rgba(255,255,255,${al * .7})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect((bx - br) * s, (by - br) * s, br * 2 * s, br * 2 * s); };
    blob(x, y, r * 1.35, 1); for (let k = 0; k < 7; k++) { const a = sd() * TAU, d = r * (.8 + sd() * .7); blob(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (.3 + sd() * .35), .6); }
    for (const [key, ch] of decals) { if (Math.abs(ch.x + CPX / 2 - x) < CPX / 2 + r && Math.abs(ch.y + CPX / 2 - y) < CPX / 2 + r) { ch.ctx.save(); ch.ctx.globalCompositeOperation = 'destination-out'; ch.ctx.beginPath(); ch.ctx.arc(x - ch.x, y - ch.y, r * 1.1, 0, TAU); ch.ctx.fill(); ch.ctx.restore(); ch.tex.needsUpdate = true; } }
    if (!batch) { craterDone(); for (const [o, g3] of objMesh) if (Math.abs(o.x - x) < R2 && Math.abs(o.y - y) < R2) g3.position.y = W3h(o.x, o.y); }
  }
  function craterDone() { ground.geometry.attributes.position.needsUpdate = true; ground.geometry.computeVertexNormals(); burnTex.needsUpdate = true; }
  function scorch(x, y, r, al) { // سوختگی سطحی (بدون گود شدن)
    if (!burnCv) return; const g = burnCv.getContext('2d'), s = 2 / T;
    for (let k = 0; k < 5; k++) { const a = Math.random() * TAU, d = k ? Math.random() * r * .6 : 0, br = r * (k ? .3 + Math.random() * .4 : .8), bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d, gr = g.createRadialGradient(bx * s, by * s, 0, bx * s, by * s, br * s); gr.addColorStop(0, `rgba(255,255,255,${al})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect((bx - br) * s, (by - br) * s, br * 2 * s, br * 2 * s); }
    burnTex.needsUpdate = true;
  }

  /* ================= دیوارها ================= */
  const wallCh = new Map(), wallDirty = new Set(), WT = ['#a59c8b', '#a59c8b', '#8a7568', '#4b4356', '#9aa3ad'];
  function buildWalls(cx, cy) {
    const m = G.map, W = m.w, key = cy * 64 + cx, old = wallCh.get(key); if (old) { world.remove(old); old.geometry.dispose(); wallCh.delete(key); }
    const P = [], C = [], WH = G.WALL_H, blk = m.block;
    const quad = (ax, ay, az, bx, by, bz, cx2, cy2, cz, dx, dy, dz, c) => { P.push(ax, ay, az, bx, by, bz, cx2, cy2, cz, ax, ay, az, cx2, cy2, cz, dx, dy, dz); for (let k = 0; k < 6; k++) C.push(c.r, c.g, c.b); };
    for (let ty = cy * CH; ty < Math.min(m.h, (cy + 1) * CH); ty++) for (let tx = cx * CH; tx < Math.min(W, (cx + 1) * CH); tx++) {
      const i = ty * W + tx, b = blk[i]; if (b !== 1 && b !== 4 && b !== 5) continue;
      const v = m.vr[i], dmg = m.thp && m.thp[i] > G.tileMax(i) * .4, x0 = tx * T, x1 = x0 + T, z0 = ty * T, z1 = z0 + T, B = -40;
      const H = (b === 5 ? WH[5] + (v % 23) : WH[b]) * (dmg ? .72 + (v % 9) * .02 : 1);
      const c = lin(b === 4 ? (m.zone[i] === 3 ? '#565a66' : '#8d9196') : b === 5 ? '#59564b' : WT[m.zone[i]]).clone().multiplyScalar((.93 + (v & 15) / 110) * (dmg ? .7 : 1)), cs = c.clone().multiplyScalar(.9);
      quad(x0, H, z0, x0, H, z1, x1, H, z1, x1, H, z0, c);
      const nb = (j, ok) => !ok || blk[j] !== b || b === 5 || (m.thp && (m.thp[j] > G.tileMax(j) * .4) !== dmg);
      if (nb(i - 1, tx > 0)) quad(x0, H, z0, x0, B, z0, x0, B, z1, x0, H, z1, cs);
      if (nb(i + 1, tx < W - 1)) quad(x1, H, z1, x1, B, z1, x1, B, z0, x1, H, z0, cs);
      if (nb(i - W, ty > 0)) quad(x1, H, z0, x1, B, z0, x0, B, z0, x0, H, z0, cs);
      if (nb(i + W, ty < m.h - 1)) quad(x0, H, z1, x0, B, z1, x1, B, z1, x1, H, z1, cs);
      if (b === 4) { const yc = lin('#c9a227').clone(), e = .5; // نوار هشدار دیوار قرنطینه
        if (blk[i - 1] !== 4) quad(x0 - e, 16, z0, x0 - e, 7, z0, x0 - e, 7, z1, x0 - e, 16, z1, yc);
        if (blk[i + 1] !== 4) quad(x1 + e, 16, z1, x1 + e, 7, z1, x1 + e, 7, z0, x1 + e, 16, z0, yc);
        if (blk[i - W] !== 4) quad(x1, 16, z0 - e, x1, 7, z0 - e, x0, 7, z0 - e, x0, 16, z0 - e, yc);
        if (blk[i + W] !== 4) quad(x0, 16, z1 + e, x0, 7, z1 + e, x1, 7, z1 + e, x1, 16, z1 + e, yc); }
    }
    if (!P.length) return;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeVertexNormals();
    const ms = new THREE.Mesh(g, M.std); ms.castShadow = ms.receiveShadow = true; world.add(ms); wallCh.set(key, ms);
  }
  const dirtyTile = i => { const m = G.map, tx = i % m.w, ty = (i / m.w) | 0; for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = tx + dx, y = ty + dy; if (x >= 0 && y >= 0 && x < m.w && y < m.h) wallDirty.add(((y / CH) | 0) * 64 + ((x / CH) | 0)); } };

  /* ================= اشیای محیط ================= */
  const objMesh = new Map(), falling = [], canopyGeo = {};
  const BAR = { red: ['#8a2c22', '#531710', '#a5382b'], blue: ['#27506f', '#152c3e', '#33678e'], olive: ['#4a5330', '#262b16', '#5d683c'], rust: ['#6e4a2c', '#3a2513', '#84593a'] };
  const LEAFS = [['#2f4a22', '#3a5c29', '#48702f', '#5a843a'], ['#5a5320', '#6e6525', '#857a2b', '#9c8f33'], null, null, ['#254a3c', '#2e5c4a', '#3a705a', '#4a846b']];
  const PINES = [['#1f3a2a', '#27472f', '#305637', '#3b6842', '#4a7d50'], ['#3a4424', '#46512a', '#546130', '#637238', '#748542'], null, null, ['#1c3a38', '#234742', '#2c564e', '#36685d', '#447d6e']];
  function starCone(g, R, h0, hh, col, tw) { // لایهٔ کاج: مخروط با لبهٔ ستاره‌ای
    const P = [], n = 18; for (let i = 0; i < n; i++) { const a0 = i / n * TAU + tw, a1 = (i + 1) / n * TAU + tw, d0 = i % 2 ? R * .58 : R, d1 = (i + 1) % 2 ? R * .58 : R; P.push(0, h0 + hh, 0, Math.cos(a1) * d1, h0, Math.sin(a1) * d1, Math.cos(a0) * d0, h0, Math.sin(a0) * d0); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); bg.computeVertexNormals(); g.add(bg, col, null, .2); bg.dispose();
  }
  function canopy(type, zone, v) { // هندسهٔ شاخ‌وبرگ (مشترک بین درخت‌های هم‌شکل)
    const key = type + zone + v; if (canopyGeo[key]) return canopyGeo[key];
    const g = new GB(), r = srand(v * 17 + zone * 5 + (type === 'tree' ? 1 : 2));
    if (type === 'tree') { const pal = LEAFS[zone] || LEAFS[0]; [[48, 42], [41, 60], [31, 78], [19, 94]].forEach((q, li) => { const Rr = q[0], h = q[1]; g.sph(Rr * .62, Rr * .42, Rr * .62, 0, h, 0, pal[li], 1, .22); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + r() * .8, d = Rr * (.42 + r() * .16), rr = Rr * (.34 + .16 * r()); g.sph(rr, rr * .7, rr, Math.cos(a) * d, h - 4 + r() * 8, Math.sin(a) * d, pal[li], 1, .22); } }); }
    else { const pal = PINES[zone] || PINES[0]; [[42, 24, 0], [34, 46, .3], [25, 68, .6], [16, 88, .9], [7, 104, 1.2]].forEach((q, li) => { starCone(g, q[0], q[1] - 6, 26, pal[li], q[2] + v); }); }
    const geo = g.geo(true); geo.userData.cached = true; return canopyGeo[key] = geo;
  }
  const FURN = {
    counter(g) { g.box(32, 20, 28, 0, 10, -1, '#8a6a45'); g.box(32, 2, 30, 0, 21, 0, '#c9c4b8'); },
    sink(g) { g.box(32, 20, 28, 0, 10, -1, '#8a6a45'); g.box(32, 2, 30, 0, 21, 0, '#c9c4b8'); g.box(18, .8, 14, 0, 22.1, 1, '#7d878c'); g.box(2, 6, 2, 0, 25, -9, '#aab2b6'); },
    stove(g) { g.box(30, 21, 28, 0, 10.5, 0, '#d8d8d4'); for (const [x, z] of [[-7, -6], [7, -6], [-7, 6], [7, 6]]) g.cyl(4.2, 4.2, .8, 10, x, 21.6, z, '#1c1c1c'); g.box(30, 6, 3, 0, 24, -13, '#8a8a88'); },
    fridge(g) { g.box(28, 44, 27, 0, 22, 0, '#e4e6e6'); g.box(28.4, .8, 27.4, 0, 28, 0, '#b5b9ba'); g.box(1.6, 14, 1.6, 9, 34, 14, '#777'); },
    table(g) { g.box(28, 2, 28, 0, 17, 0, '#9a7446'); for (const [x, z] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) g.box(3, 16, 3, x, 8, z, '#7a5a34'); },
    sofa(g) { g.box(60, 10, 26, 0, 5, 2, '#5d6f7d'); g.box(60, 20, 8, 0, 10, -11, '#51626f'); g.box(7, 15, 26, -28, 7.5, 2, '#51626f'); g.box(7, 15, 26, 28, 7.5, 2, '#51626f'); g.box(25, 3, 18, -13.5, 11.5, 3, '#6c8090'); g.box(25, 3, 18, 13.5, 11.5, 3, '#6c8090'); },
    bed(g, o) { g.box(62, 7, 30, 0, 3.5, 0, '#6b4a2c'); g.box(60, 6, 28, 0, 10, 0, '#e8e4da'); g.box(12, 3, 20, -22, 14.5, 0, '#ffffff'); g.box(36, 1.6, 28.6, 10, 13.6, 0, ['#8a3b3b', '#3b5a8a', '#4a7a52', '#7a6a3b'][o.seed % 4]); g.box(3, 16, 30, -31, 8, 0, '#5a3d24'); },
    tv(g) { g.box(30, 10, 12, 0, 5, -8, '#4a3826'); g.box(26, 15, 2, 0, 18, -9, '#0c0e10'); g.box(24, 13, .6, 0, 18, -7.8, '#1d2a38'); },
    wardrobe(g) { g.box(30, 46, 24, 0, 23, -3, '#6e4f2f'); g.box(.8, 44, .8, 0, 23, 9.3, '#3a2a18'); g.box(31, 1.5, 25, 0, 46.5, -3, '#5a3f24'); },
    nightstand(g) { g.box(20, 14, 20, 0, 7, -4, '#7a5632'); g.cyl(3, 5, 6, 8, 0, 17, -4, '#e8dcae'); },
    tub(g) { g.box(60, 15, 28, 0, 7.5, 0, '#ecece6'); g.box(52, .8, 20, 0, 15.2, 0, '#9fc3d0'); g.box(2, 5, 2, -27, 18, 0, '#aab2b6'); },
    toilet(g) { g.box(14, 14, 9, 0, 7, -9, '#ecece6'); g.cyl(7, 5.5, 9, 10, 0, 4.5, 2, '#ecece6'); g.cyl(5, 5, .7, 10, 0, 9.4, 2, '#9fb6bd'); },
    shelf(g, o) { g.box(30, 44, 14, 0, 22, -7, '#5c6166'); const r = srand(o.seed); for (let k = 0; k < 5; k++) g.box(6 + r() * 5, 5 + r() * 4, 8, -11 + k * 5.5, 46.5, -7, ['#8a5a2c', '#3f6f95', '#7a2e2e', '#c9b458', '#4a6a3a'][k]); },
  };
  function buildObj(o) {
    const old = objMesh.get(o); if (old) dispose(old);
    if (o.dead || o.type === 'junk') { objMesh.delete(o); return; }
    const grp = new THREE.Group(), g = new GB(), r = srand(o.seed || 7); let mat = M.std, flat = false;
    grp.position.set(o.x, W3h(o.x, o.y), o.y); grp.rotation.y = -(o.rot || 0);
    switch (o.type) {
      case 'barrel': { const b = BAR[o.color] || BAR.red; g.cyl(13, 13, 32, 16, 0, 16, 0, b[0]); for (const h of [.8, 10.5, 21, 31.2]) g.cyl(13.7, 13.7, 1.7, 16, 0, h, 0, b[1]); g.cyl(11, 11, .6, 16, 0, 32.2, 0, b[2]); g.cyl(2.2, 2.2, 1.2, 8, 6.5, 32.6, -5, b[1]); if (o.color === 'red') g.box(7, .5, 6, -2, 32.6, 3, '#e8c23a'); mat = o.color === 'blue' ? M.std : M.metal; break; }
      case 'crate': g.box(29, 26.5, 29, 0, 13.25, 0, '#b5834a', 0, .12); for (const [x, z] of [[-13.6, -13.6], [13.6, -13.6], [-13.6, 13.6], [13.6, 13.6]]) g.box(4, 27, 4, x, 13.5, z, '#8a5f30'); for (const z of [-13, 13]) g.box(30, 1.4, 4, 0, 27.2, z, '#9a6b38'); for (const x of [-13, 13]) g.box(4, 1.4, 30, x, 27.2, 0, '#9a6b38'); g.box(37, 1.3, 4, 0, 27.1, 0, '#9a6b38', Math.PI / 4); break;
      case 'tires': { const tg = new THREE.TorusGeometry(10.4, 4.7, 7, 16); tg.rotateX(Math.PI / 2); for (let k = 0; k < 3; k++) g.add(tg, k & 1 ? '#232323' : '#191919', TRS((r() - .5) * 3, 4.7 + k * 8, (r() - .5) * 3, 1, 1, 1, r() * 3)); tg.dispose(); break; }
      case 'barrier': g.box(94, 10, 25, 0, 5, 0, '#a09f97', 0, .08); g.box(90, 20, 11, 0, 20, 0, '#c2c1b8', 0, .08); for (const x of [-36, -26, 20, 30]) g.box(5, 20.4, 11.5, x, 20, 0, '#d9a520'); if (o.crack) { for (let k = 0; k < 5; k++) g.box(2 + r() * 10, 1, 1.4, (r() - .5) * 70, 30.3, (r() - .5) * 6, '#2b2824', r() * 3); } break;
      case 'sandbag': { const tn = ['#ac9a6c', '#b3a172', '#a99769'][o.seed % 3]; g.sph(16.5, 6.2, 9.5, 0, 5.5, 0, tn, 1, .12); if (!o.half) { const nx = o.next; if (nx && !nx.dead && !nx.half) g.sph(16.5, 6.2, 9.5, 16, 16, 0, o.seed % 2 ? '#bdab7b' : '#b8a676', 1, .12); } flat = false; break; }
      case 'rock': { const ig = ICO[1].clone(), P = ig.attributes.position.array; for (let i = 0; i < P.length; i += 3) { const h = Math.sin(P[i] * 12.9 + P[i + 1] * 78.2 + P[i + 2] * 37.7 + o.seed) * 43758.5; const k = .78 + .34 * (h - Math.floor(h)); P[i] *= k; P[i + 1] *= k; P[i + 2] *= k; } g.add(ig, o.crack ? '#77756d' : '#8f8d84', TRS(0, 6, 0, 15.5, 15, 15.5), .16); ig.dispose(); flat = true; break; }
      case 'tree': case 'pine': {
        const k = o.size, tr = new GB(); if (o.type === 'tree') tr.cyl(5 * k, 7.5 * k, 46 * k, 8, 0, 23 * k, 0, o.bark, .2); else tr.cyl(3.5 * k, 5.5 * k, 34 * k, 7, 0, 17 * k, 0, '#3f2c1d', .2);
        grp.add(tr.mesh(M.std, true)); const cm = new THREE.Mesh(canopy(o.type, o.zone, o.seed % 3), M.std); cm.scale.setScalar(k); cm.castShadow = cm.receiveShadow = true; grp.add(cm); grp.userData.canopy = cm; break;
      }
      case 'dead': { const k = o.size, H = 58 * k; g.cyl(3.5 * k, 6.5 * k, H, 7, 0, H / 2, 0, o.bark, .2); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + r() * 1.2, len = (16 + r() * 16) * k, h0 = H * (.5 + r() * .45); g.limb(0, h0, 0, Math.cos(a) * len, h0 + 14 * k, Math.sin(a) * len, 2 * k, .8 * k, o.bark, 5); } flat = true; break; }
      case 'car': {
        const c = o.car, col = c.burnt ? '#2a2725' : c.c, dk = '#' + lin(col).clone().multiplyScalar(.7).convertLinearToSRGB().getHexString(); grp.rotation.y = o.vert ? -Math.PI / 2 : 0;
        g.box(56, 10, 24, 0, 8, 0, col); g.box(14, 2, 22, 21, 13.5, 0, col); g.box(10, 2, 22, -23, 13.5, 0, col); g.box(29, 7, 21.5, -3, 16.5, 0, c.burnt ? '#121212' : '#27363f'); g.box(23, 1.6, 19, -3, 20.6, 0, dk);
        for (const [x, z] of [[18, 11.2], [18, -11.2], [-18, 11.2], [-18, -11.2]]) g.limb(x, 5, z - 1.6, x, 5, z + 1.6, 5, 5, '#101010', 10);
        if (!c.burnt) { g.box(1, 3, 5, 28.2, 9, 8, '#f3ecc0'); g.box(1, 3, 5, 28.2, 9, -8, '#f3ecc0'); g.box(1, 3, 5, -28.2, 9, 8, '#a02a22'); g.box(1, 3, 5, -28.2, 9, -8, '#a02a22'); } mat = c.burnt ? M.std : M.metal; break;
      }
      case 'window': { const wc = WT[o.zone]; grp.rotation.y = o.horiz ? 0 : -Math.PI / 2; g.box(32, 14, 32, 0, 7, 0, wc); g.box(3, 32, 30, -14.5, 30, 0, wc); g.box(3, 32, 30, 14.5, 30, 0, wc); g.box(32, 4, 6, 0, 44, 0, '#6b6457');
        if (!o.broken) { const gl = new THREE.Mesh(new THREE.BoxGeometry(26, 28, 2), M.glass); gl.position.set(0, 28, 0); grp.add(gl); } break; }
      case 'rubble': for (let i = 0; i < 6; i++) g.box(7 + r() * 9, 4 + r() * 7, 6 + r() * 8, (r() - .5) * 18, 3 + r() * 3, (r() - .5) * 18, i & 1 ? '#8b857b' : '#77726a', r() * 3, .15); flat = true; break;
      case 'door': { const len = o.tiles.length * T, wd = o.weak ? '#a07a4a' : '#7a5632'; grp.rotation.y = o.hor ? 0 : -Math.PI / 2; g.box(len - 1, 42, 5, 0, 21, 0, wd, 0, .1); for (let k = 0; k < o.tiles.length * 2; k++) { g.box(len / (o.tiles.length * 2) - 5, 30, 5.8, -len / 2 + (k + .5) * len / (o.tiles.length * 2), 22, 0, o.weak ? '#8f6a3c' : '#69492a'); } g.sph(1.8, 1.8, 3.6, len / 2 - 6, 20, 0, '#c9b458'); g.box(len, 3, 7, 0, 43.5, 0, '#4a3826'); break; }
      default: if (FURN[o.type]) { FURN[o.type](g, o); if (o.mat === 'metal') mat = M.metal; }
    }
    if (g.p.length) grp.add(g.mesh(mat, flat));
    world.add(grp); objMesh.set(o, grp); o.dirty = false;
  }
  function dispose(grp) { grp.traverse(c => { if (c.geometry && !c.geometry.userData.cached) c.geometry.dispose(); }); if (grp.parent) grp.parent.remove(grp); }

  /* ================= نیروها و زامبی‌ها ================= */
  const unitMesh = new Map();
  const PALS = { cmd: { body: '#23252a', dark: '#111214', helm: '#2b2d33', trim: '#e0a93f' }, alpha: { body: '#4a4a44', dark: '#262623', helm: '#3a3a36', trim: '#ff8a3c' }, delta: { body: '#33414f', dark: '#1d252e', helm: '#42525f', trim: '#4db8ff' } };
  function mkSoldier(u) {
    const P = PALS[u.isCmd ? 'cmd' : u.squad], grp = new THREE.Group(), g = new GB(), gl = new GB();
    g.box(10, 11, 18, 0, 16, 0, P.body); g.box(11, 8, 14, .6, 16.5, 0, P.dark); g.box(6, 10, 12, -8, 16, 0, P.dark);
    g.limb(0, 19.5, -8.5, 10, 17.5, -1.5, 2.3, 2, P.body); g.limb(0, 19.5, 8.5, 7, 17.5, 3.5, 2.3, 2, P.body);
    g.sph(1.9, 1.9, 1.9, 10, 17.5, -1.2, '#b98a62', 0); g.sph(1.9, 1.9, 1.9, 7, 17.5, 3.6, '#b98a62', 0);
    g.sph(5.7, 5.2, 5.6, 0, 26, 0, P.helm); g.box(4, 2.6, 7.5, 5.4, 26, 0, '#0a0b0d');
    gl.box(8, 1, 2.4, -1, 31.2, 0, P.trim); gl.box(1.2, 1, 9, -3.2, 31, 0, P.trim);
    grp.add(g.mesh()); grp.add(gl.mesh(M.glow, false, true));
    const legs = []; for (const z of [-4, 4]) { const lg = new GB(); lg.box(6, 10, 5, 0, 5, 0, P.dark); const ms = lg.mesh(); ms.position.z = z; grp.add(ms); legs.push(ms); }
    grp.userData = { legs, wid: null, gun: null }; if (u.isCmd) grp.scale.setScalar(1.15); return grp;
  }
  function gunFor(grp, d) {
    const ud = grp.userData; if (ud.gun) { grp.remove(ud.gun); ud.gun.geometry.dispose(); } const g = new GB();
    if (d.melee) { g.box(9, .8, 1.6, 13, 17.5, 3, '#d5dde3'); g.box(4, 1.6, 2, 7.5, 17.5, 3, '#222'); }
    else if (d.proj === 'rocket') { g.limb(-9, 19, 4, d.len + 4, 19, 4, 2.2, 2.2, '#3c4a2a', 8); g.limb(d.len + 3, 19, 4, d.len + 11, 19, 4, 3.2, .6, '#5a6b3a', 8); }
    else { const L = d.len + 3; g.box(L, 2.6, 2.6, 3 + L / 2, 18, 2.6, '#0c0d0f'); if (d.len > 14) g.box(7, 4, 3, 5, 17.6, 2.6, '#17181b'); if (d.name === 'M249') g.box(5, 5, 4, 10, 15.5, 2.6, '#2a3024'); if (d.len > 20) g.box(6, 2, 2, 10, 20.3, 2.6, '#101113'); }
    ud.gun = g.mesh(M.metal); ud.wid = d.id; grp.add(ud.gun);
  }
  const ZB = '#1d1a22';
  function mkZombie(z) {
    const f = z.form, F = G.ZT[f], col = z.type === 'envy' ? '#19e68c' : F.color, grp = new THREE.Group(), g = new GB(), gl = new GB(); let arm = null;
    const eyes = (x, y, s) => { gl.box(1.6, 1.6, 1.8, x, y, -s, col); gl.box(1.6, 1.6, 1.8, x, y, s, col); };
    const arms = (r, reach, y) => { g.limb(1, y, -r * .8, reach, y - 2, -r * .7, 2, 1.5, ZB); g.limb(1, y, r * .8, reach, y - 2, r * .7, 2, 1.5, ZB); };
    if (f === 'sloth') { g.sph(19, 23, 20, 0, 19, 0, '#22252f', 2, .18); g.sph(10, 9, 9, -3, 36, 0, '#2c3140', 1, .15); for (let k = 0; k < 4; k++) { const a = k * 1.57 + .5; g.limb(0, 10, 0, Math.cos(a) * 24, 2, Math.sin(a) * 24, 5, 2.5, '#23252e'); } gl.box(1.2, 1.4, 6, 7, 38, -5, col); gl.box(1.2, 1.4, 6, 7, 38, 5, col); gl.box(1.2, 1.4, 9, 10, 30, 0, col); }
    else if (f === 'lust') { for (let k = 0; k < 7; k++) { const a = k * .9 + .3, l = 26 + (k % 3) * 4; g.limb(0, 4, 0, Math.cos(a) * l, 1.5, Math.sin(a) * l, 3.2, 1.2, '#8a2a5c'); } g.sph(12, 17, 12, 0, 17, 0, ZB, 1, .15); g.sph(6, 6.5, 6, 0, 37, 0, ZB); gl.sph(5, 5, 5, 6, 22, 0, col, 1); eyes(5, 38, 2.4); }
    else if (f === 'gluttony') { g.sph(19, 15, 18, 0, 15, 0, ZB, 2, .15); g.sph(14, 12, 15, -3, 19, 0, '#2a2533', 1, .15); g.limb(4, 16, -15, 14, 12, -17, 3.4, 2.6, ZB); g.limb(4, 16, 15, 14, 12, 17, 3.4, 2.6, ZB); gl.box(5, 7, 15, 15.5, 15, 0, col); g.box(4.4, 4, 11, 16.8, 15, 0, '#0a0a0a'); for (let k = -2; k <= 2; k++) g.box(2.4, 2.4, 1.5, 17.5, 18, k * 3, '#e9e6c8'); g.sph(4.5, 4.5, 4.5, 13, 26, 0, ZB); eyes(16.5, 27, 2); }
    else if (f === 'pride') { g.box(14, 14, 3, -11, 12, 0, '#3d2463', 0); g.sph(9, 11, 8.5, 0, 13, 0, ZB, 1); arms(10, 11, 16); g.sph(5, 5, 5, 4, 26, 0, ZB); eyes(8, 27, 2.2); const ar = new GB(); ar.box(9, 4, 7, 0, 22, -8.5, '#d9b64a'); ar.box(9, 4, 7, 0, 22, 8.5, '#d9b64a'); ar.box(11, 10, 13, 2, 16, 0, '#d9b64a'); ar.sph(5.6, 3, 5.6, 4, 30, 0, '#ffe9a8', 0); arm = ar.mesh(M.metal); grp.add(arm); }
    else if (f === 'wrath') { g.sph(7.5, 10, 6.8, 0, 12, 0, ZB, 1); arms(7, 13, 16); g.sph(4.6, 4.6, 4.6, 5, 23, 0, ZB); eyes(8.4, 24, 2); for (let k = -1; k <= 1; k++) gl.limb(-3, 18, k * 4, -12, 23, k * 5.5, 2, .3, col, 5); }
    else if (f === 'greed') { for (const a of [-1.15, -.5, .5, 1.15]) gl.limb(0, 9, 0, Math.cos(a) * 14, 3, Math.sin(a) * 14, 1, .7, col, 4); g.sph(5.8, 7, 5.2, 0, 9, 0, ZB, 1); g.sph(3.9, 3.9, 3.9, 4, 17, 0, ZB); gl.sph(2.3, 2.3, 2.3, 6.4, 17.6, 0, col, 0); }
    else if (f === 'twin') { g.sph(5.5, 7, 5, 0, 8, 0, ZB, 1); arms(5, 8, 11); gl.sph(3.4, 3.4, 3.4, 3.5, 15, 0, col, 0); }
    else { g.sph(6.5, 9, 6, 0, 11, 0, ZB, 1); arms(6, 10, 15); g.sph(4.4, 4.4, 4.4, 4, 21, 0, ZB); g.sph(3.4, 4.4, 4.2, 6, 21, 0, '#d8ffe9', 0); gl.box(1.4, 1.4, 1.4, 9, 23, -2, col); gl.box(1.4, 1.4, 1.4, 9, 21, 0, col); gl.box(1.4, 1.4, 1.4, 9, 23, 2, col); }
    if (z.type === 'envy' && f !== 'envy') gl.box(2.2, 2.2, 2.2, 0, f === 'gluttony' ? 34 : 30, 0, '#19e68c');
    grp.add(g.mesh()); if (gl.p.length) grp.add(gl.mesh(M.glow, false, true));
    grp.userData = { form: f, arm }; return grp;
  }
  function syncUnits() {
    for (const u of G.soldiers) {
      if (u.dead || u.boarded) continue; let grp = unitMesh.get(u); if (!grp) { grp = mkSoldier(u); world.add(grp); unitMesh.set(u, grp); }
      grp.userData.seen = frame; const d = G.wOf(u).def; if (grp.userData.wid !== d.id) gunFor(grp, d);
      grp.position.set(u.x, W3h(u.x, u.y) + (u.downed ? 6 : 0), u.y); grp.rotation.set(0, -u.ang, u.downed ? Math.PI / 2 : 0, 'YXZ');
      const st = u.moving && !u.downed ? Math.sin(u.walk) * 4.5 : 0; grp.userData.legs[0].position.x = st; grp.userData.legs[1].position.x = -st;
      if (grp.userData.gun) grp.userData.gun.position.x = u.fired > 0 ? -1.5 : 0;
    }
    for (const z of G.zActive) {
      if (z.dead) continue; let grp = unitMesh.get(z); if (grp && grp.userData.form !== z.form) { dispose(grp); grp = null; }
      if (!grp) { grp = mkZombie(z); world.add(grp); unitMesh.set(z, grp); }
      grp.userData.seen = frame; const mob = G.ZT[z.form].speed > 0, k = z.hurt > 0 ? 1.1 : 1;
      grp.position.set(z.x, W3h(z.x, z.y) + (mob ? Math.abs(Math.sin(z.walk * 2)) * 1.2 : 0), z.y); grp.rotation.y = mob ? -z.ang : 0; grp.rotation.z = mob ? Math.sin(z.walk) * .06 : 0;
      grp.scale.set(k, (mob ? 1 : 1 + Math.sin(z.anim * .8) * .03) * k, k); if (grp.userData.arm) grp.userData.arm.visible = z.armor > 0;
    }
    for (const [e, grp] of unitMesh) if (grp.userData.seen !== frame) { dispose(grp); unitMesh.delete(e); }
  }

  /* ================= اشیای ماموریت و بالگرد ================= */
  const propMesh = new Map();
  function heliTex(img) { const t = new THREE.Texture(img); t.encoding = THREE.sRGBEncoding; t.needsUpdate = true; return t; }
  function mkProp(p) {
    const grp = new THREE.Group(), g = new GB(), gl = new GB(), k = p.kind; grp.userData = { kind: k, st: p.uses > 0 };
    if (k === 'crate') { const on = p.uses > 0; g.box(26, 16, 20, 0, 8, 0, on ? '#3f5a34' : '#3c3c3c'); g.box(27, 3, 21, 0, 17, 0, on ? '#5a7a48' : '#555'); gl.box(3, .6, 12, 0, 18.8, 0, '#ffe27a'); gl.box(12, .6, 3, 0, 18.9, 0, '#ffe27a'); }
    else if (k === 'sample') { g.box(16, 12, 16, 0, 6, 0, '#2b2f36'); g.box(11, 2, 11, 0, 12.5, 0, '#0a0810'); gl.box(6, 5, 6, 0, 15, 0, '#be78ff'); }
    else if (k === 'drop') { const on = p.uses > 0; g.box(26, 18, 22, 0, 9, 0, on ? '#1b1d20' : '#3a3a3a'); gl.box(27, 2.5, 22.6, 0, 11, 0, '#c9a227'); gl.box(3, 18.6, 22.6, 0, 9.3, 0, '#c9a227');
      const ch = new GB(); ch.add(new THREE.SphereGeometry(34, 14, 7, 0, TAU, 0, Math.PI / 2), '#2a2c2f', TRS(0, 70, 0, 1, .55, 1), .1); for (let q = 0; q < 6; q++) { const a = q / 6 * TAU; ch.limb(0, 18, 0, Math.cos(a) * 32, 70, Math.sin(a) * 32, .5, .5, '#151515', 3); } const cm = ch.mesh(M.std, true); cm.material = M.std; grp.add(cm); grp.userData.chute = cm; }
    else if (k === 'beacon') { g.cyl(2, 2, 36, 8, 0, 18, 0, '#30363c'); g.box(16, 4, 16, 0, 2, 0, '#20252a'); const lamp = new GB(); lamp.sph(5, 5, 5, 0, 38, 0, '#7fd0ff', 1); grp.userData.lamp = lamp.mesh(M.glow, false, true); grp.add(grp.userData.lamp); }
    else if (k === 'core') {
      for (let q = 0; q < 8; q++) { const a = q * .785 + .2; g.limb(0, 6, 0, Math.cos(a + .4) * 50, 4, Math.sin(a + .4) * 50, 6, 4.5, '#2c1647', 6); g.limb(Math.cos(a + .4) * 50, 4, Math.sin(a + .4) * 50, Math.cos(a) * 92, 1.5, Math.sin(a) * 92, 4.5, 1.5, '#2c1647', 6); }
      g.sph(36, 46, 36, 0, 30, 0, '#0b0911', 2, .2); const core = new GB(); core.sph(22, 28, 22, 0, 40, 0, '#9a5cff', 2); for (let q = 0; q < 5; q++) core.limb((q - 2) * 9, 70, 0, (q - 2) * 14, 6, 30, 1.2, 1.2, '#be82ff', 4); grp.userData.glowM = core.mesh(M.glow, false, true); grp.add(grp.userData.glowM);
    } else if (k === 'wreck') { // لاشهٔ بالگرد سقوط‌کرده
      grp.rotation.y = .32; g.sph(50, 17, 21, 0, 14, 0, '#1a1d20', 2, .25); g.sph(19, 12, 14, 30, 15, -2, '#0b0c0e', 1); g.limb(-40, 16, 0, -100, 9, 14, 6, 3.5, '#15171a', 7); g.box(9, 24, 3, -104, 16, 15, '#15171a', .4); g.box(44, 4, 6, -8, 31, 0, '#2a2f33');
      g.limb(0, 33, 0, 78, 6, -34, 2.4, 2, '#101214', 4); g.limb(0, 33, 0, -52, 22, -40, 2.4, 2, '#101214', 4); g.limb(0, 33, 0, 24, 3, 46, 2.4, 2, '#101214', 4); for (let q = 0; q < 7; q++) g.box(6 + Math.random() * 12, 2 + Math.random() * 4, 5 + Math.random() * 9, G.rand(-80, 80), 2, G.rand(-50, 50), '#1c1f22', Math.random() * 3, .3);
    } else if (k === 'heli2') {
      const H = G.Heli, sc = H.C.scale, body = new THREE.Mesh(new THREE.PlaneGeometry(152 * sc, 48 * sc), new THREE.MeshStandardMaterial({ map: heliTex(H.IB), alphaTest: .5, roughness: .6, metalness: .3 })); body.rotation.x = -Math.PI / 2; body.position.x = -28 * sc; body.castShadow = true; grp.add(body);
      const rot = new THREE.Mesh(new THREE.PlaneGeometry(148 * sc, 148 * sc), new THREE.MeshBasicMaterial({ map: heliTex(H.IR), transparent: true, depthWrite: false })); rot.rotation.x = -Math.PI / 2; rot.position.y = 6; grp.add(rot);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(73 * sc, 40), new THREE.MeshBasicMaterial({ color: 0x0a0a0c, transparent: true, opacity: 0, depthWrite: false })); disc.rotation.x = -Math.PI / 2; disc.position.y = 5; grp.add(disc);
      grp.userData.rot = rot; grp.userData.disc = disc; grp.userData.body = body;
    }
    if (g.p.length) grp.add(g.mesh(k === 'wreck' ? M.metal : M.std, k === 'wreck')); if (gl.p.length) grp.add(gl.mesh(M.glow, false, true));
    return grp;
  }
  function syncProps() {
    const t = G.time, Mi = G.mission;
    for (const p of G.props) {
      let grp = propMesh.get(p); if (grp && (p.kind === 'crate' || p.kind === 'drop') && grp.userData.st !== (p.uses > 0)) { dispose(grp); grp = null; }
      if (!grp) { grp = mkProp(p); world.add(grp); propMesh.set(p, grp); if (p.kind === 'wreck') { FX.fire(p.x - 30, p.y - 6, 20, 1e9, 1.5); FX.fire(p.x + 22, p.y + 8, 15, 1e9, 1.2); FX.fire(p.x - 78, p.y + 26, 10, 1e9, .8); scorch(p.x, p.y, 120, .9); } }
      const ud = grp.userData; ud.seen = frame; grp.position.set(p.x, W3h(p.x, p.y) + (p.kind === 'drop' ? p.z : 0), p.y);
      if (p.kind === 'drop') { ud.chute.visible = p.z > 0; grp.rotation.z = p.z > 0 ? Math.sin(t * 2.2) * .08 : 0; }
      else if (p.kind === 'beacon') ud.lamp.visible = !!((t * 2 | 0) & 1);
      else if (p.kind === 'core') { const gq = .5 + .5 * Math.sin(t * 2.2), s = Mi.coreDead ? .35 : Mi.erupt ? 1.7 : 1; grp.scale.set(s, Mi.coreDead ? .12 : s * (1 + gq * .04), s); ud.glowM.visible = !Mi.coreDead; ud.glowM.scale.setScalar(.9 + gq * .16); }
      else if (p.kind === 'heli2') { const air = G.clamp(p.z / 40, 0, 1), blur = G.clamp((p.rotor - .25) / .5, 0, 1); grp.position.y = p.z + 26; grp.position.x += Math.sin(p.t * 1.3) * 2 * air; grp.rotation.y = -p.heading; ud.rot.rotation.z = -p.blade * Math.PI / 180; ud.rot.material.opacity = 1 - .82 * blur; ud.disc.material.opacity = blur * .28; }
    }
    for (const [p, grp] of propMesh) if (grp.userData.seen !== frame) { dispose(grp); propMesh.delete(p); }
  }

  /* ================= افکت‌ها: ذره‌ها، تکه‌ها، آتش، ردّ روی زمین ================= */
  const lights = [], decals = new Map(), tracers = [], rings = [];
  const PVS = `attribute vec4 aCol; attribute vec3 aDat; varying vec4 vCol; varying vec2 vDat; uniform float uScale;
    void main(){ vCol = aCol; vDat = aDat.yz; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aDat.x * uScale / max(1.0, -mv.z); }`;
  const PFS = `uniform sampler2D tAtlas; varying vec4 vCol; varying vec2 vDat;
    void main(){ vec2 p = gl_PointCoord - 0.5; float c = cos(vDat.x), s = sin(vDat.x); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) * 1.25 + 0.5;
      if (p.x < 0.0 || p.y < 0.0 || p.x > 1.0 || p.y > 1.0) discard; float f = floor(vDat.y + 0.5);
      vec2 uv = (vec2(mod(f, 4.0), floor(f / 4.0)) + p) / 4.0; float a = texture2D(tAtlas, vec2(uv.x, 1.0 - uv.y)).a * vCol.a; if (a < 0.004) discard; gl_FragColor = vec4(vCol.rgb, a); }`;
  function PSys(max, add) {
    this.max = max; this.list = []; const g = this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.dat = new Float32Array(max * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(this.col, 4)); g.setAttribute('aDat', new THREE.BufferAttribute(this.dat, 3));
    this.mat = new THREE.ShaderMaterial({ uniforms: { tAtlas: { value: atlas }, uScale: { value: 600 } }, vertexShader: PVS, fragmentShader: PFS, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = add ? 5 : 6; scene.add(this.pts);
  }
  PSys.prototype.flush = function () {
    const L = this.list, n = Math.min(L.length, this.max), P = this.pos, C = this.col, D = this.dat;
    for (let i = 0; i < n; i++) { const p = L[i], t = 1 - p.life / p.max, a = p.a * Math.min(1, t * (p.fin || 8)) * Math.pow(1 - t, p.pw || 1);
      P[i * 3] = p.x; P[i * 3 + 1] = p.h; P[i * 3 + 2] = p.z; C[i * 4] = p.r + (p.r1 - p.r) * t; C[i * 4 + 1] = p.g + (p.g1 - p.g) * t; C[i * 4 + 2] = p.b + (p.b1 - p.b) * t; C[i * 4 + 3] = a; D[i * 3] = p.s + (p.s1 - p.s) * t; D[i * 3 + 1] = p.rot; D[i * 3 + 2] = p.f; }
    this.geo.setDrawRange(0, n); this.geo.attributes.position.needsUpdate = this.geo.attributes.aCol.needsUpdate = this.geo.attributes.aDat.needsUpdate = true;
    this.mat.uniforms.uScale.value = R.domElement.height / (2 * Math.tan(cam.fov * Math.PI / 360));
  };
  PSys.prototype.step = function (dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) { const p = L[i]; p.life -= dt; if (p.life <= 0) { L[i] = L[L.length - 1]; L.pop(); continue; }
      const dr = Math.exp(-(p.drag || 0) * dt); p.vx *= dr; p.vz *= dr; p.vh = p.vh * dr - (p.grav || 0) * dt; p.x += (p.vx + (p.wind || 0) * 16) * dt; p.z += (p.vz + (p.wind || 0) * 7) * dt; p.h += p.vh * dt; p.rot += (p.vr || 0) * dt;
      if (p.grav && p.h < (p.gh || 0) + .5) { p.h = (p.gh || 0) + .5; p.vh = -p.vh * .3; p.vx *= .5; p.vz *= .5; p.vr = 0; } }
  };
  let PS = null, PA = null, MK = null, deb = null; const debLive = []; let debN = 0; const dummy = new THREE.Object3D();
  const C3 = hex => { const c = lin(hex); return [c.r, c.g, c.b]; };
  function emit(sys, o, c0, c1) { if (sys.list.length >= sys.max) return null; c1 = c1 || c0; o.r = c0[0]; o.g = c0[1]; o.b = c0[2]; o.r1 = c1[0]; o.g1 = c1[1]; o.b1 = c1[2]; o.max = o.life; if (o.rot == null) o.rot = Math.random() * TAU; sys.list.push(o); return o; }
  const GRAY = [[.06, .055, .05], [.16, .15, .14], [.34, .33, .32], [.5, .49, .47]];
  const FX = G.fx = {
    hurt: 0, black: 0, tracers, rings,
    init() { PA = new PSys(1500, true); PS = new PSys(2600, false);
      MK = { n: 0, max: 1200, own: new Array(1200).fill(null), sys: new PSys(1200, false) }; MK.sys.pts.renderOrder = 4; MK.sys.geo.setDrawRange(0, 1200); for (let i = 0; i < 1200; i++) { MK.sys.pos[i * 3 + 1] = -999; MK.sys.dat[i * 3] = 2.6; MK.sys.dat[i * 3 + 2] = 12; }
      deb = new THREE.InstancedMesh(UB, new THREE.MeshStandardMaterial({ roughness: .85 }), 420); deb.castShadow = deb.receiveShadow = true; deb.frustumCulled = false; deb.instanceMatrix.setUsage(THREE.DynamicDrawUsage); for (let i = 0; i < 420; i++) deb.setColorAt(i, tc.set(0x555555)); scene.add(deb); },
    reset() {
      this.black = 0; this.hurt = 0; view.shake = 0; tracers.length = rings.length = 0; fires.length = 0; debLive.length = 0; debN = 0;
      if (!ok3d) return;
      PS.list.length = PA.list.length = 0; MK.n = 0; MK.own.fill(null); for (let i = 0; i < MK.max; i++) MK.sys.pos[i * 3 + 1] = -999; MK.sys.geo.attributes.position.needsUpdate = MK.sys.geo.attributes.aDat.needsUpdate = MK.sys.geo.attributes.aCol.needsUpdate = true; MK.sys.mat.uniforms.uScale.value = 600;
      dummy.position.set(0, -999, 0); dummy.scale.setScalar(.001); dummy.updateMatrix(); for (let i = 0; i < 420; i++) deb.setMatrixAt(i, dummy.matrix); deb.instanceMatrix.needsUpdate = true;
      for (const L of lights) { L.t = 0; L.l.intensity = 0; }
      buildWorld();
    },
    tracer() { },
    bullet(x, y, a, len) { if (tracers.length < 400) tracers.push({ x, y, a, left: len, go: 0 }); },
    casing(x, y, a) { const ea = a + Math.PI / 2 + .25 + G.rand(-.25, .25), sp = G.rand(55, 95); piece(x, y, 18, Math.cos(ea) * sp, Math.sin(ea) * sp, G.rand(60, 120), 2.6, .9, 1, '#d9a93a'); },
    dust(x, y, vx, vy) { emit(PS, { x, h: 3, z: y, vx, vh: G.rand(4, 14), vz: vy, life: G.rand(.8, 1.3), s: 14, s1: 46, f: (Math.random() * 4) | 0, a: .28, drag: 1.6, vr: G.rand(-.6, .6), pw: 1.4 }, C3('#8a8070')); },
    muzzle(x, y, ang) { emit(PA, { x: x + Math.cos(ang) * 5, h: 19, z: y + Math.sin(ang) * 5, vx: Math.cos(ang) * 60, vh: 0, vz: Math.sin(ang) * 60, life: .06, s: 20, s1: 9, f: 4 + ((Math.random() * 4) | 0), a: 1, fin: 99 }, [1, .85, .5], [1, .5, .15]); flash(x, y, 20, .9, .06); if (Math.random() < .5) emit(PS, { x, h: 19, z: y, vx: Math.cos(ang) * 30, vh: 8, vz: Math.sin(ang) * 30, life: .5, s: 5, s1: 16, f: (Math.random() * 4) | 0, a: .18, drag: 3, wind: .3 }, GRAY[3]); },
    burst(x, y, color, n, sp, life, size) { const c = C3(color); for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = sp * (.3 + Math.random() * .7); emit(PS, { x, h: 12, z: y, vx: Math.cos(a) * s, vh: G.rand(10, 80), vz: Math.sin(a) * s, life: life * (.6 + Math.random() * .6), s: size * 1.5, s1: size, f: 9, a: 1, drag: 2.5, grav: 260, vr: G.rand(-8, 8), fin: 99, pw: .5 }, c); } },
    smoke(x, y, h) { emit(PS, { x: x + G.rand(-3, 3), h: h || 10, z: y + G.rand(-3, 3), vx: G.rand(-8, 8), vh: G.rand(14, 30), vz: G.rand(-8, 8), life: G.rand(.9, 1.6), s: 9, s1: 34, f: (Math.random() * 4) | 0, a: .3, drag: .8, wind: .6, vr: G.rand(-.7, .7), pw: 1.3 }, GRAY[2], GRAY[3]); },
    ring(x, y, r, color) { rings.push({ x, y, r, t: .5, max: .5, color }); },
    sparks(x, y, a, n, col) { const c = col ? C3(col) : [1, .9, .55]; for (let i = 0; i < n; i++) { const d = a + G.rand(-.9, .9), s = G.rand(90, 340); emit(PA, { x, h: G.rand(10, 20), z: y, vx: Math.cos(d) * s, vh: G.rand(20, 160), vz: Math.sin(d) * s, life: G.rand(.15, .45), s: 3.2, s1: 1.2, f: 8, a: 1, drag: 2, grav: 420, fin: 99, pw: .6 }, c, [1, .4, .1]); } flash(x, y, 16, .7, .07); },
    chips(x, y, a, color, n) { const c = C3(color); for (let i = 0; i < n; i++) { const d = a + G.rand(-.8, .8), s = G.rand(40, 150); emit(PS, { x, h: G.rand(8, 18), z: y, vx: Math.cos(d) * s, vh: G.rand(20, 90), vz: Math.sin(d) * s, life: G.rand(.35, .7), s: G.rand(1.6, 3.4), s1: 1.5, f: Math.random() < .5 ? 9 : 11, a: 1, drag: 2, grav: 300, vr: G.rand(-10, 10), fin: 99, pw: .4 }, c); } },
    puff(x, y, color, n) { const c = C3(color); for (let i = 0; i < n; i++) emit(PS, { x: x + G.rand(-7, 7), h: G.rand(4, 16), z: y + G.rand(-7, 7), vx: G.rand(-26, 26), vh: G.rand(6, 26), vz: G.rand(-26, 26), life: G.rand(.7, 1.3), s: 10, s1: G.rand(26, 44), f: (Math.random() * 4) | 0, a: .36, drag: 2, wind: .4, vr: G.rand(-.8, .8), pw: 1.3 }, c); },
    flame(x, y, k, h) { k = k || 1; emit(PA, { x: x + G.rand(-3, 3) * k, h: (h || 8) + G.rand(0, 8), z: y + G.rand(-3, 3) * k, vx: G.rand(-8, 8), vh: G.rand(30, 70) * k, vz: G.rand(-8, 8), life: G.rand(.3, .6), s: G.rand(12, 20) * k, s1: 4 * k, f: 4 + ((Math.random() * 4) | 0), a: .85, drag: .6, wind: .5, vr: G.rand(-2, 2), fin: 12 }, [1, .78, .32], [.9, .16, .03]); },
    glass(x, y, a) { const c = C3('#cfeaf7'); for (let i = 0; i < 14; i++) { const d = a + G.rand(-1.1, 1.1), s = G.rand(60, 240); emit(PS, { x: x + G.rand(-10, 10), h: G.rand(16, 36), z: y + G.rand(-10, 10), vx: Math.cos(d) * s, vh: G.rand(0, 60), vz: Math.sin(d) * s, life: G.rand(.5, .9), s: G.rand(2, 4), s1: 2, f: 11, a: .9, drag: 1.5, grav: 320, vr: G.rand(-12, 12), fin: 99, pw: .3 }, c); } this.remain('glass', x + Math.cos(a) * 14, y + Math.sin(a) * 14, a, 1); },
    leaves(x, y, r, color, n) { const c = C3(color); for (let i = 0; i < n; i++) { const d = Math.random() * TAU, q = Math.random() * r; emit(PS, { x: x + Math.cos(d) * q, h: G.rand(20, 60), z: y + Math.sin(d) * q, vx: Math.cos(d) * G.rand(20, 80), vh: G.rand(-10, 30), vz: Math.sin(d) * G.rand(20, 80), life: G.rand(1, 2), s: G.rand(4, 7), s1: 4, f: 10, a: 1, drag: 1.8, grav: 60, wind: .5, vr: G.rand(-5, 5), fin: 99, pw: .3 }, c); } },
    debris(x, y, kind, n, ang, color) {
      const D = { plank: ['#b5834a', 13, 1.6, 3.6], metal: [color || '#666', 8, 1, 6], plastic: ['#33678e', 7, 1, 5], concrete: [color || '#8b857b', 7, 5, 6], stone: ['#9c9a90', 7, 6, 6], sack: ['#b3a172', 12, 4, 7], tire: ['#1e1e1e', 9, 4, 9], crystal: ['#3a1d5c', 7, 5, 3] }[kind];
      for (let i = 0; i < n; i++) { const d = ang != null ? ang + G.rand(-1.3, 1.3) : Math.random() * TAU, sp = G.rand(50, 230), k = G.rand(.6, 1.25); piece(x + G.rand(-8, 8), y + G.rand(-8, 8), G.rand(6, 26), Math.cos(d) * sp, Math.sin(d) * sp, G.rand(90, 300), D[1] * k, D[2] * k, D[3] * G.rand(.7, 1.2), D[0]); }
    },
    fire(x, y, r, dur, big) { fires.push({ x, y, r, t: dur, big: big || (r > 14 ? 1 : .6), ph: Math.random() * 9 }); },
    remain(type, x, y, r, s, col) {
      const m = G.map, rm = { t: type, x, y, r: r || 0, s: s || 1, c: col }; m.remains.push(rm); const Rr = 70 * rm.s;
      for (let cy = Math.floor((y - Rr) / CPX); cy <= Math.floor((y + Rr) / CPX); cy++) for (let cx = Math.floor((x - Rr) / CPX); cx <= Math.floor((x + Rr) / CPX); cx++) { const ch = decalCh(cx, cy); if (ch) { drawRemain(ch.ctx, rm, x - ch.x, y - ch.y); ch.tex.needsUpdate = true; } }
    },
    // انفجار: گلولهٔ آتش، دود سیاه غلیظ، جرقه، موج و (برای راکت) گودال واقعی
    boom(x, y, r, heavy) {
      const k = heavy ? 1.7 : 1, n = heavy ? 26 : 12;
      for (let i = 0; i < n; i++) { const a = Math.random() * TAU, d = Math.random() * r * .35, sp = G.rand(20, 150) * k; emit(PA, { x: x + Math.cos(a) * d, h: G.rand(8, 40), z: y + Math.sin(a) * d, vx: Math.cos(a) * sp, vh: G.rand(30, 150) * k, vz: Math.sin(a) * sp, life: G.rand(.3, .65) * (heavy ? 1.4 : 1), s: r * G.rand(.45, .8), s1: r * G.rand(.9, 1.4), f: 4 + ((Math.random() * 4) | 0), a: 1, drag: 3, vr: G.rand(-2, 2), fin: 30, pw: 1.2 }, [1, .86, .5], [.85, .2, .04]); }
      emit(PA, { x, h: 20, z: y, vx: 0, vh: 0, vz: 0, life: .14, s: r * 3.2, s1: r * 4.4, f: 8, a: .9, fin: 99 }, [1, .95, .8], [1, .6, .2]);
      for (let i = 0; i < n * 1.4; i++) { const a = Math.random() * TAU, d = Math.random() * r * .5, sp = G.rand(10, 90) * k; emit(PS, { x: x + Math.cos(a) * d, h: G.rand(10, 50), z: y + Math.sin(a) * d, vx: Math.cos(a) * sp, vh: G.rand(30, 110) * k, vz: Math.sin(a) * sp, life: G.rand(1.6, 3.4) * (heavy ? 1.5 : 1), s: r * .4, s1: r * G.rand(1.1, 1.9), f: (Math.random() * 4) | 0, a: G.rand(.55, .8), drag: 1.3, wind: 1, vr: G.rand(-.6, .6), fin: 5, pw: 1.5 }, GRAY[0], GRAY[2]); }
      for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = G.rand(60, 260) * k; emit(PS, { x, h: 4, z: y, vx: Math.cos(a) * sp, vh: G.rand(2, 20), vz: Math.sin(a) * sp, life: G.rand(.8, 1.5), s: r * .25, s1: r * .8, f: (Math.random() * 4) | 0, a: .4, drag: 2.6, vr: G.rand(-1, 1), pw: 1.4 }, C3('#6f6557')); }
      this.sparks(x, y, 0, 0); for (let i = 0; i < n * 1.5; i++) { const a = Math.random() * TAU, sp = G.rand(100, 420) * k; emit(PA, { x, h: 14, z: y, vx: Math.cos(a) * sp, vh: G.rand(60, 320) * k, vz: Math.sin(a) * sp, life: G.rand(.5, 1.3), s: 4, s1: 1.5, f: 8, a: 1, drag: 1.2, grav: 380, fin: 99, pw: .5 }, [1, .85, .45], [1, .3, .05]); }
      for (let i = 0; i < (heavy ? 22 : 8); i++) { const a = Math.random() * TAU, sp = G.rand(60, 300) * k; piece(x, y, G.rand(6, 20), Math.cos(a) * sp, Math.sin(a) * sp, G.rand(120, 420), G.rand(3, 8), G.rand(2, 5), G.rand(3, 7), Math.random() < .5 ? '#3a342c' : '#5a5247'); }
      flash(x, y, 60, heavy ? 6 : 3.4, heavy ? .5 : .32); rings.push({ x, y, r: r * (heavy ? 1.5 : 1.1), t: .35, max: .35, color: '#fff3d6' });
      if (heavy) { crater(x, y, r * .46, 30); this.fire(x + G.rand(-20, 20), y + G.rand(-20, 20), 9, G.rand(5, 9), .7); this.fire(x + G.rand(-40, 40), y + G.rand(-40, 40), 6, G.rand(3, 6), .5); } else if (r >= 80) crater(x, y, r * .3, 9); else scorch(x, y, r * .5, .75);
    },
    shake(a) { view.shake = Math.max(view.shake, a); },
    decal(x, y, type, color, size) {
      if (type === 'scorch') { scorch(x, y, size, .7); return; }
      const ch = decalCh(Math.floor(x / CPX), Math.floor(y / CPX)); if (!ch) return; const g = ch.ctx, lx = x - ch.x, ly = y - ch.y;
      if (type === 'blood') { for (let i = 0; i < 9; i++) { g.globalAlpha = .55; g.fillStyle = i < 6 ? '#0b080d' : color; const a = Math.random() * TAU, d = Math.random() * size * .7; g.beginPath(); g.ellipse(lx + Math.cos(a) * d, ly + Math.sin(a) * d, size * G.rand(.12, .42), size * G.rand(.08, .28), a, 0, TAU); g.fill(); } }
      else { for (let i = 0; i < 6; i++) { g.globalAlpha = .28; g.fillStyle = color; const a = Math.random() * TAU, d = Math.random() * size * .5; g.beginPath(); g.ellipse(lx + Math.cos(a) * d, ly + Math.sin(a) * d, size * G.rand(.3, .6), size * G.rand(.25, .5), a, 0, TAU); g.fill(); } }
      g.globalAlpha = 1; ch.tex.needsUpdate = true;
    },
    update(dt) {
      if (!ok3d) return; PS.step(dt); PA.step(dt);
      for (let i = tracers.length - 1; i >= 0; i--) { const b = tracers[i]; b.go += 2100 * dt; if (b.go >= b.left + 60) { tracers[i] = tracers[tracers.length - 1]; tracers.pop(); } }
      for (let i = rings.length - 1; i >= 0; i--) if ((rings[i].t -= dt) <= 0) rings.splice(i, 1);
      for (let i = debLive.length - 1; i >= 0; i--) { const k = debLive[i]; k.x += k.vx * dt; k.z += k.vz * dt; k.vh -= 620 * dt; k.h += k.vh * dt; k.rx += k.vr * dt; k.rz += k.vr * .7 * dt;
        const ti = G.tileAt(k.x, k.z); if (ti >= 0 && G.SOLID[G.map.block[ti]] && k.h < G.WALL_H[G.map.block[ti]]) { k.x -= k.vx * dt; k.z -= k.vz * dt; k.vx *= -.4; k.vz *= -.4; }
        const gh = W3h(k.x, k.z) + k.sy / 2; let done = false;
        if (k.h <= gh) { k.h = gh; if (Math.abs(k.vh) > 70) { k.vh = -k.vh * .32; k.vx *= .55; k.vz *= .55; k.vr *= .5; } else { k.vh = 0; const f = Math.exp(-7 * dt); k.vx *= f; k.vz *= f; k.vr *= f; if (Math.hypot(k.vx, k.vz) < 4) { k.rx = 0; k.rz = 0; done = true; } } }
        dummy.position.set(k.x, k.h, k.z); dummy.rotation.set(k.rx, k.ry, k.rz); dummy.scale.set(k.sx, k.sy, k.sz); dummy.updateMatrix(); deb.setMatrixAt(k.i, dummy.matrix); deb.instanceMatrix.needsUpdate = true;
        if (done) { debLive[i] = debLive[debLive.length - 1]; debLive.pop(); } }
      for (let i = fires.length - 1; i >= 0; i--) { // آتش‌های ماندگار: شعله، اخگر و ستون دود سیاه
        const f = fires[i]; f.t -= dt; if (f.t <= 0) { fires.splice(i, 1); continue; }
        if (Math.abs(f.x - view.x) > view.w * .9 || Math.abs(f.y - view.y) > view.h * .9) continue;
        const k = f.big * Math.min(1, f.t / 2), gh = W3h(f.x, f.y);
        for (let q = 0; q < 3; q++) if (Math.random() < dt * 30) this.flame(f.x + G.rand(-f.r, f.r) * .8, f.y + G.rand(-f.r, f.r) * .8, f.r / 6 * (.7 + k * .5), gh + 6);
        if (f.r > 8 && Math.random() < dt * 14) flash(f.x, f.y, 46, 1.5 + Math.random() * 1.2, .16); // نور لرزان آتش
        if (Math.random() < dt * 9 * k) emit(PA, { x: f.x + G.rand(-f.r, f.r), h: gh + 12, z: f.y + G.rand(-f.r, f.r), vx: G.rand(-20, 20), vh: G.rand(60, 150), vz: G.rand(-20, 20), life: G.rand(.6, 1.4), s: 3, s1: 1, f: 8, a: 1, drag: .6, wind: 1.2, fin: 99 }, [1, .7, .3], [1, .25, .05]);
        if (Math.random() < dt * (10 + 12 * k)) emit(PS, { x: f.x + G.rand(-f.r, f.r) * .6, h: gh + 26, z: f.y + G.rand(-f.r, f.r) * .6, vx: G.rand(-6, 6), vh: G.rand(34, 60), vz: G.rand(-6, 6), life: G.rand(2.6, 4.6) * (.6 + k * .5), s: f.r * 1.6, s1: f.r * G.rand(4.5, 7.5) * (.7 + k * .4), f: (Math.random() * 4) | 0, a: G.rand(.5, .75), drag: .25, wind: 1.6, vr: G.rand(-.5, .5), fin: 3, pw: 1.4 }, GRAY[1], GRAY[3]);
      }
      for (const L of lights) if (L.t > 0) { L.t -= dt; L.l.intensity = L.t > 0 ? L.pow * Math.pow(L.t / L.max, 1.5) : 0; }
      if (this.hurt > 0) this.hurt = Math.max(0, this.hurt - dt * .8);
      if (this.black > 0) this.black = Math.max(0, this.black - dt * .45);
      if (view.shake > 0) view.shake = Math.max(0, view.shake - dt * 30);
    },
  };
  const fires = [];
  function flash(x, y, h, pow, dur) { let b = lights[0]; for (const L of lights) if (L.t < b.t) b = L; if (b.t > 0 && b.pow * (b.t / b.max) > pow) return; b.t = b.max = dur; b.pow = pow; b.l.position.set(x, h + W3h(x, y), y); b.l.intensity = pow; }
  function piece(x, y, h, vx, vy, vh, sx, sy, sz, col) {
    if (!ok3d) return; const i = debN++ % 420; for (let q = debLive.length - 1; q >= 0; q--) if (debLive[q].i === i) debLive.splice(q, 1);
    deb.setColorAt(i, lin(col)); deb.instanceColor.needsUpdate = true;
    debLive.push({ i, x, z: y, h, vx, vz: vy, vh, sx, sy, sz, rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6, vr: G.rand(-12, 12) });
  }
  // ردّ گلوله: فقط یک نقطهٔ ریز تیره (یا براق روی فلز)
  const MKC = { wood: [.05, .03, .015], metal: [.82, .8, .74], plastic: [.02, .03, .05], concrete: [.1, .09, .085], stone: [.2, .2, .19], sand: [.22, .19, .12], rubber: [0, 0, 0] };
  function mark(own, x, y, h, kind) {
    if (!ok3d) return; const i = MK.n++ % MK.max, c = MKC[kind] || MKC.rubber, S = MK.sys; MK.own[i] = own; (own.mk || (own.mk = [])).push(i);
    S.pos[i * 3] = x; S.pos[i * 3 + 1] = h + W3h(x, y); S.pos[i * 3 + 2] = y; S.col[i * 4] = c[0]; S.col[i * 4 + 1] = c[1]; S.col[i * 4 + 2] = c[2]; S.col[i * 4 + 3] = .92; S.dat[i * 3] = kind === 'metal' ? 2 : 2.5;
    S.geo.attributes.position.needsUpdate = S.geo.attributes.aCol.needsUpdate = S.geo.attributes.aDat.needsUpdate = true;
  }
  function unmark(own) { if (!own || !own.mk || !ok3d) return; for (const i of own.mk) if (MK.own[i] === own) { MK.own[i] = null; MK.sys.pos[i * 3 + 1] = -999; } own.mk = null; MK.sys.geo.attributes.position.needsUpdate = true; }

  /* ---------- ردّ ماندگار روی زمین ---------- */
  function decalCh(cx, cy) {
    const m = G.map; if (!ok3d || cx < 0 || cy < 0 || cx * CPX >= m.pw || cy * CPX >= m.ph) return null; const key = cy * 64 + cx; let ch = decals.get(key); if (ch) return ch;
    const cn = document.createElement('canvas'); cn.width = cn.height = CPX; const tex = new THREE.CanvasTexture(cn); tex.encoding = THREE.sRGBEncoding; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    const g = new THREE.PlaneGeometry(CPX, CPX); g.rotateX(-Math.PI / 2); const ms = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    ms.position.set(cx * CPX + CPX / 2, .6, cy * CPX + CPX / 2); ms.receiveShadow = true; ms.renderOrder = 1; world.add(ms);
    ch = { cn, ctx: cn.getContext('2d'), tex, mesh: ms, x: cx * CPX, y: cy * CPX }; decals.set(key, ch); return ch;
  }
  function drawRemain(g, rm, x, y) {
    const Rn = srand(Math.floor(rm.x) * 31 + Math.floor(rm.y) * 7), s = rm.s, t = rm.t, scat = (n, rad, fn) => { for (let i = 0; i < n; i++) { const a = Rn() * TAU, d = Math.sqrt(Rn()) * rad; fn(x + Math.cos(a) * d, y + Math.sin(a) * d, Rn(), i); } };
    g.save();
    if (t === 'rubble' || t === 'gravel') { const cs = t === 'rubble' ? ['#8b857b', '#6f6a62', '#a39c8e'] : ['#8a887f', '#9c9a90', '#6c6a63']; g.globalAlpha = .3; g.fillStyle = cs[2]; scat(6, 10 * s, (px, py, q) => { g.beginPath(); g.ellipse(px, py, 9 * s * (.6 + q), 7 * s * (.6 + q), q * 3, 0, TAU); g.fill(); }); g.globalAlpha = 1; scat(14, 16 * s, (px, py, q, i) => { const w = (2 + q * 5) * s; g.fillStyle = cs[i % 3]; g.save(); g.translate(px, py); g.rotate(q * 6); g.fillRect(-w / 2, -w / 2, w, w * .8); g.restore(); }); }
    else if (t === 'splinters') scat(9, 15, (px, py, q, i) => { g.save(); g.translate(px, py); g.rotate(q * 6.3); g.fillStyle = i & 1 ? '#9a6b38' : '#7d5529'; g.fillRect(-5 - q * 4, -1.2, 10 + q * 8, 2.4); g.restore(); });
    else if (t === 'sand') { g.fillStyle = '#b9a673'; g.globalAlpha = .55; scat(7, 10, (px, py, q) => { g.beginPath(); g.ellipse(px, py, 8 + q * 7, 6 + q * 5, q * 3, 0, TAU); g.fill(); }); }
    else if (t === 'stump') { const r = 6.5 * s; g.fillStyle = '#4a3422'; g.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, d = r * (.85 + Rn() * .3); i ? g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d) : g.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d); } g.fill(); g.fillStyle = '#b08a58'; g.beginPath(); g.arc(x, y, r * .68, 0, TAU); g.fill(); g.strokeStyle = '#8a6236'; g.lineWidth = .8; g.beginPath(); g.arc(x, y, r * .4, 0, TAU); g.stroke(); g.fillStyle = '#6b4a2a'; scat(4, r * .7, (px, py) => g.fillRect(px, py, 2.5, 1.2)); }
    else if (t === 'log') { const len = 60 * s, cx = Math.cos(rm.r), cy = Math.sin(rm.r); g.lineCap = 'round'; g.strokeStyle = rm.c || '#4a3422'; g.lineWidth = 7; g.beginPath(); g.moveTo(x + cx * 6, y + cy * 6); g.lineTo(x + cx * len, y + cy * len); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + cx * 8 + cy * 2, y + cy * 8 - cx * 2); g.lineTo(x + cx * len + cy * 2, y + cy * len - cx * 2); g.stroke(); }
    else if (t === 'leaves') { g.fillStyle = rm.c || '#3a5c29'; g.globalAlpha = .85; scat(22, 28 * s, (px, py, q) => { g.beginPath(); g.ellipse(px, py, (3 + q * 7) * s, (2 + q * 5) * s, q * 6, 0, TAU); g.fill(); }); g.fillStyle = 'rgba(0,0,0,.2)'; scat(10, 26 * s, (px, py, q) => { g.beginPath(); g.ellipse(px, py, (2 + q * 3) * s, (1 + q * 2) * s, q * 5, 0, TAU); g.fill(); }); }
    else if (t === 'puddle') { g.fillStyle = '#3f6f95'; g.globalAlpha = .3; scat(5, 7 * s, (px, py, q) => { g.beginPath(); g.ellipse(px, py, (8 + q * 6) * s, (5 + q * 4) * s, q * 3, 0, TAU); g.fill(); }); }
    else if (t === 'barrel') { g.translate(x, y); g.rotate(rm.r); g.fillStyle = rm.c; g.beginPath(); g.roundRect(-16, -12, 32, 24, 3); g.fill(); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-6, -12, 2, 24); g.fillRect(5, -12, 2, 24); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(-16, -8, 32, 3); g.fillStyle = '#17120f'; g.beginPath(); g.moveTo(-2, -4); g.lineTo(4, -1); g.lineTo(1, 5); g.lineTo(-5, 2); g.fill(); }
    else if (t === 'carwreck') { g.translate(x, y); g.rotate(rm.r); g.fillStyle = '#211e1c'; g.beginPath(); g.roundRect(-28, -12, 56, 24, 5); g.fill(); g.fillStyle = '#0d0c0b'; g.fillRect(-13, -9, 26, 18); g.fillStyle = '#3a342f'; g.fillRect(-28, -3, 9, 2); g.fillRect(17, 1, 11, 2); g.strokeStyle = '#4a433c'; g.lineWidth = 1; g.strokeRect(-13, -9, 26, 18); }
    else if (t === 'glass') scat(14, 14, (px, py, q, i) => { g.fillStyle = i & 1 ? 'rgba(223,244,255,.85)' : 'rgba(159,211,234,.7)'; g.save(); g.translate(px, py); g.rotate(q * 6); g.fillRect(0, 0, 1.5 + q * 2.5, 1 + q); g.restore(); });
    g.restore();
  }

  /* ================= ساخت دنیا ================= */
  function buildWorld() {
    const m = G.map; if (!m) return;
    if (world) { world.traverse(c => { if (c.geometry && !c.geometry.userData.cached) c.geometry.dispose(); if (c.material && c.material.map && c.material.map.isCanvasTexture) { c.material.map.dispose(); c.material.dispose(); } }); scene.remove(world); }
    world = new THREE.Group(); scene.add(world); wallCh.clear(); wallDirty.clear(); objMesh.clear(); unitMesh.clear(); propMesh.clear(); decals.clear(); falling.length = 0;
    buildGround(m);
    for (const k of m.craters) crater((k.x + .5) * T, (k.y + .5) * T, k.r * T * .9, 14 + k.r * 9, true); craterDone();
    for (let cy = 0; cy * CH < m.h; cy++) for (let cx = 0; cx * CH < m.w; cx++) buildWalls(cx, cy);
    for (const o of m.objs) buildObj(o);
    for (const d of m.decor) { // درب‌های باز (نیمه‌باز روی لولا)
      const W = m.w, i0 = d.tiles[0], len = d.tiles.length * T, g = new GB(), grp = new THREE.Group(), tx = i0 % W, ty = (i0 / W) | 0;
      g.box(len - 2, 42, 4, len / 2, 21, 0, '#7a5632', 0, .1); g.box(len - 12, 30, 4.8, len / 2, 22, 0, '#69492a'); grp.add(g.mesh());
      grp.position.set(d.hor ? tx * T : tx * T + 16, 0, d.hor ? ty * T + 16 : ty * T); grp.rotation.y = d.hor ? 1.35 : -Math.PI / 2 + 1.35; world.add(grp);
    }
    // جنگل بیرون نقشه
    const fg = new GB(); fg.cyl(3.5, 5.5, 34, 6, 0, 17, 0, '#3f2c1d'); [[42, 24], [34, 46], [25, 68], [16, 88], [7, 104]].forEach((q, i) => { starCone(fg, q[0], q[1] - 6, 26, PINES[0][i], i * .3); });
    const NF2 = 1500, im = new THREE.InstancedMesh(fg.geo(true), M.std, NF2), Rr = srand(m.seed); im.castShadow = im.receiveShadow = true;
    for (let i = 0; i < NF2; i++) { let x, y; for (;;) { x = -1100 + Rr() * (m.pw + 2200); y = -1100 + Rr() * (m.ph + 2200); if (x < -30 || y < -30 || x > m.pw + 30 || y > m.ph + 30) break; }
      dummy.position.set(x, 0, y); dummy.rotation.set(0, Rr() * 6, 0); const s = .7 + Rr() * .5; dummy.scale.set(s, s * (.9 + Rr() * .3), s); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }
    im.frustumCulled = false; world.add(im);
  }

  /* ================= رندر ================= */
  G.W3 = {
    ok: () => ok3d, mark, unmark, crater, groundH: W3h,
    tileGone(i) { const own = G.map.marks.get(i); if (own) unmark(own); dirtyTileLater.push(i); },
    tileDirty(i) { dirtyTileLater.push(i); },
    render() {
      if (!ok3d || !world) return; frame++;
      const m = G.map, shx = view.shake ? G.rand(-1, 1) * view.shake : 0, shy = view.shake ? G.rand(-1, 1) * view.shake : 0, cx = view.x + shx, cy = view.y + shy;
      G.P3.setCam(cx, cy);
      cam.position.set(cx, HC, cy); cam.lookAt(cx, 0, cy);
      const sx = Math.round(view.x / 32) * 32, sy = Math.round(view.y / 32) * 32; sun.position.set(sx - 480, 1100, sy - 640); sun.target.position.set(sx, 0, sy); sun.target.updateMatrixWorld();
      while (dirtyTileLater.length) dirtyTile(dirtyTileLater.pop());
      if (wallDirty.size) { for (const k of wallDirty) buildWalls(k % 64, (k / 64) | 0); wallDirty.clear(); }
      for (const o of m.objs) if (o.dirty) buildObj(o);
      for (const [o, grp] of objMesh) if (o.dead && !o.fall) { dispose(grp); objMesh.delete(o); } else if (o.fall && !grp.userData.falling) { grp.userData.falling = true; falling.push(o); }
      for (let i = falling.length - 1; i >= 0; i--) { // افتادن درخت
        const o = falling[i], grp = objMesh.get(o), f = o.fall; if (!grp || f.k >= 1) { if (grp) { dispose(grp); objMesh.delete(o); } falling.splice(i, 1); continue; }
        grp.quaternion.setFromAxisAngle(v3a.set(f.dy, 0, -f.dx), f.e * Math.PI / 2 * .97);
      }
      for (const o of G.objAct) { const grp = objMesh.get(o); if (!grp || o.fall) continue; const k = o.wob * .014 * Math.sin(G.time * 42); grp.rotation.z = -Math.cos(o.wa) * k; grp.rotation.x = Math.sin(o.wa) * k; }
      for (const [o, grp] of objMesh) { // شاخ‌وبرگِ بالای سر نیروها نیمه‌شفاف می‌شود + تکان باد
        const cn = grp.userData.canopy; if (!cn || o.fall || Math.abs(o.x - view.x) > view.w * .75 || Math.abs(o.y - view.y) > view.h * .8) continue;
        let under = false; const Rr = o.cr * .8; for (const s of G.soldiers) if (!s.dead && Math.abs(s.x - o.x) < Rr && Math.abs(s.y - o.y) < Rr) { under = true; break; }
        if (!under) for (const z of G.zActive) if (!z.dead && Math.abs(z.x - o.x) < Rr && Math.abs(z.y - o.y) < Rr) { under = true; break; }
        cn.material = under ? M.fade : M.std; cn.castShadow = !under; const ph = o.x * .013 + o.y * .007, w = G.PROPS_CFG.wind; cn.rotation.z = Math.sin(G.time * 1.1 + ph) * .022 * w; cn.rotation.x = Math.cos(G.time * .8 + ph) * .018 * w;
      }
      syncUnits(); syncProps(); PS.flush(); PA.flush();
      R.render(scene, cam);
    },
  };
  const dirtyTileLater = [];
})();
