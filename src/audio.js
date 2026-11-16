// Sound, synthesised: noise for blasts and rubble, oscillators for lasers and thunder. No files.
let ac = null, noise = null, master = null;
const last = {};
export function initAudio() {
  if (ac) { if (ac.state === "suspended") ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createDynamicsCompressor(); const g = ac.createGain(); g.gain.value = 0.55; master.connect(g); g.connect(ac.destination);
    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { ac = null; }
}
function burst(dur, f0, f1, vol, type = "lowpass", q = 1) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime;
  s.buffer = noise; s.playbackRate.value = 0.6 + Math.random() * 0.8; f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
function tone(type, f0, f1, dur, vol) {
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
const S = {
  boom: (k = 1) => { burst(0.5 + k * 0.6, 900 + 500 * k, 60, 0.9); tone("sine", 110, 30, 0.4 + k * 0.5, 0.9); },
  bigboom: () => { burst(2.2, 2400, 40, 1); tone("sine", 90, 22, 2, 1); tone("triangle", 50, 20, 2.6, 0.8); },
  nuke: () => { burst(4.5, 3000, 30, 1); tone("sine", 70, 18, 4, 1); tone("sawtooth", 40, 18, 3.5, 0.5); },
  shot: () => { tone("square", 900, 220, 0.09, 0.16); burst(0.05, 4000, 1500, 0.12, "highpass"); },
  rocket: () => { burst(0.5, 500, 1800, 0.35, "bandpass", 2); },
  laser: () => { tone("sawtooth", 1400 + Math.random() * 200, 900, 0.09, 0.08); },
  thunder: () => { burst(1.4, 5000, 80, 0.9); tone("sawtooth", 160, 30, 0.7, 0.5); },
  crash: (k = 1) => { burst(0.9 + k, 700, 50, 0.9); tone("sine", 70, 25, 0.8, 0.6); },
  rumble: () => { burst(1.2, 200, 60, 0.6); },
  glass: () => { burst(0.25, 7000, 3000, 0.22, "highpass"); tone("triangle", 2600 + Math.random() * 1500, 1800, 0.12, 0.08); },
  thud: () => { tone("sine", 160, 40, 0.16, 0.6); burst(0.12, 800, 100, 0.4); },
  jump: () => tone("square", 260, 520, 0.12, 0.1),
  fly: () => { tone("sine", 300, 900, 0.3, 0.2); burst(0.3, 600, 3000, 0.2, "bandpass"); },
  dive: () => tone("sawtooth", 900, 120, 0.4, 0.2),
  punch: () => { burst(0.14, 1800, 200, 0.6); tone("square", 180, 50, 0.15, 0.4); },
  pop: () => tone("square", 500, 120, 0.12, 0.15),
  cannon: () => { burst(0.35, 1200, 80, 0.7); tone("sine", 140, 40, 0.3, 0.6); },
  hurt: () => tone("sawtooth", 300, 80, 0.2, 0.3),
  ice: () => { burst(0.4, 8000, 2000, 0.3, "highpass"); tone("triangle", 1800, 3600, 0.25, 0.12); },
  void: () => { tone("sine", 200, 30, 1.6, 0.6); tone("sawtooth", 60, 240, 1.4, 0.15); },
  wind: () => burst(1.5, 300, 1200, 0.3, "bandpass", 3),
  beam: () => { tone("sawtooth", 200, 1600, 0.5, 0.3); burst(0.8, 6000, 400, 0.5, "bandpass"); },
  ready: () => { tone("square", 440, 440, 0.1, 0.15); setTimeout(() => ac && tone("square", 660, 660, 0.1, 0.15), 110); setTimeout(() => ac && tone("square", 880, 880, 0.25, 0.15), 220); },
  swap: () => tone("square", 700, 900, 0.05, 0.08),
};
const GAP = { shot: 0.05, laser: 0.05, glass: 0.07, boom: 0.05, thud: 0.08, crash: 0.15, rumble: 0.4, pop: 0.05 };
export function sfx(name, k) {
  if (!ac || !S[name]) return;
  const t = ac.currentTime;
  if (t - (last[name] ?? -9) < (GAP[name] ?? 0.03)) return;
  last[name] = t;
  try { S[name](k); } catch (e) { /* audio is never worth a crash */ }
}
