/* GROKBUTT: Escape the Server — playable demo
   Plain Canvas 2D + WebAudio, no libraries, no build step.
   Logical playfield is 640x640 (square) so it fits an X player card (480x480) or any window. */
(() => {
'use strict';
const W = 640, H = 640;
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');
let VIEW = 1, DPR = 1;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  const s = Math.min(window.innerWidth, window.innerHeight) / W;
  VIEW = s;
  cvs.style.width = Math.floor(W * s) + 'px';
  cvs.style.height = Math.floor(H * s) + 'px';
  cvs.width = Math.max(1, Math.round(W * s * DPR));
  cvs.height = Math.max(1, Math.round(H * s * DPR));
}
window.addEventListener('resize', resize);
resize();

// ---------- utils ----------
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a, b, t) => a + (b - a) * t;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
const FONT = '"Arial Black","Arial Bold",Impact,system-ui,sans-serif';

// ---------- audio (synthesized) ----------
let ac = null, master = null, noiseBuf = null, muted = false;
function unlockAudio() {
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // iOS unlock: play a silent blip inside the first gesture
      const o = ac.createOscillator(), g = ac.createGain(); g.gain.value = 0; o.connect(g); g.connect(master); o.start(); o.stop(ac.currentTime + 0.02);
    }
    if (ac.state === 'suspended') ac.resume();
  } catch (e) { /* audio is optional */ }
}
function tone(f, dur, type = 'square', vol = 0.12, f2 = null, delay = 0) {
  if (!ac || muted) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.2, freq = 1200, type = 'lowpass', f2 = null, q = 1) {
  if (!ac || muted) return;
  const t = ac.currentTime;
  const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const fl = ac.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(freq, t);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(fl); fl.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
function fart(len = 0.35, pitch = 90, vol = 0.22) {
  if (!ac || muted) return;
  const t = ac.currentTime;
  const o = ac.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(pitch * rnd(0.9, 1.15), t);
  o.frequency.exponentialRampToValueAtTime(pitch * 0.55, t + len);
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = rnd(18, 32); lg.gain.value = pitch * 0.45;
  lfo.connect(lg); lg.connect(o.frequency);
  const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 520; fl.Q.value = 4;
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0008, t + len);
  o.connect(fl); fl.connect(g); g.connect(master); o.start(t); lfo.start(t); o.stop(t + len + 0.03); lfo.stop(t + len + 0.03);
  noise(len * 0.8, vol * 0.25, 300, 'lowpass');
}
const SFX = {
  bump() { tone(140, 0.12, 'sine', 0.3, 55); noise(0.06, 0.15, 900); },
  bonk() { tone(520, 0.08, 'square', 0.08, 260); tone(180, 0.15, 'triangle', 0.2, 90); },
  swish() { noise(0.16, 0.18, 2500, 'bandpass', 600, 2); },
  staple() { tone(1800, 0.03, 'square', 0.06, 900); noise(0.04, 0.12, 4000, 'highpass'); },
  bubble() { fart(0.45, 85, 0.24); },
  pit() { tone(rnd(700, 900), 0.04, 'square', 0.05, 300); fart(0.07, 140, 0.08); },
  toot() { tone(330, 0.09, 'square', 0.09); tone(250, 0.18, 'square', 0.09, 200, 0.09); fart(0.2, 110, 0.12); },
  boom() { noise(0.35, 0.35, 900, 'lowpass', 80); tone(90, 0.3, 'sine', 0.3, 40); },
  hurt() { tone(600, 0.06, 'square', 0.1, 900); tone(420, 0.18, 'triangle', 0.15, 220, 0.05); },
  pickup() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.09, 'square', 0.07, null, i * 0.06)); },
  enemyShot() { tone(900, 0.06, 'triangle', 0.05, 500); },
  die() { tone(300, 0.1, 'square', 0.08, 150); noise(0.15, 0.12, 1500, 'bandpass', 300, 1); },
  door() { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.1, null, i * 0.08)); },
  over() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, null, i * 0.18)); fart(0.8, 70, 0.2); },
  block() { tone(1200, 0.05, 'square', 0.06, 1600); },
};

// ---------- input ----------
const keys = {};
const input = { aimX: W / 2, aimY: 0, mouseDown: false, usingTouch: false, mouseSeen: false, joy: null, fire: null };
function toLogical(cx, cy) {
  const r = cvs.getBoundingClientRect();
  return { x: (cx - r.left) / r.width * W, y: (cy - r.top) / r.height * H };
}
window.addEventListener('keydown', e => {
  keys[e.code] = true; unlockAudio();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyM') muted = !muted;
  if (state === 'title' && (e.code === 'Enter' || e.code === 'Space')) startGame();
  else if ((state === 'over' || state === 'win') && stateT > 0.8 && (e.code === 'Enter' || e.code === 'KeyR' || e.code === 'Space')) startGame();
  else if (state === 'play' && e.code === 'KeyP') paused = !paused;
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; input.mouseDown = false; input.joy = null; input.fire = null; });
cvs.addEventListener('contextmenu', e => e.preventDefault());

cvs.addEventListener('pointerdown', e => {
  e.preventDefault(); unlockAudio();
  try { cvs.setPointerCapture(e.pointerId); } catch (_) {}
  const p = toLogical(e.clientX, e.clientY);
  if (uiTap(p)) return;
  if (state === 'title') { startGame(); return; }
  if (state === 'over' || state === 'win') { if (stateT > 0.8) startGame(); return; }
  if (paused) { paused = false; return; }
  if (e.pointerType === 'touch' || e.pointerType === 'pen') {
    input.usingTouch = true;
    if (p.x < W * 0.5 && !input.joy) input.joy = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y };
    else if (!input.fire) input.fire = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y, dragged: false };
  } else {
    input.usingTouch = false; input.mouseSeen = true;
    input.aimX = p.x; input.aimY = p.y; input.mouseDown = true;
  }
});
cvs.addEventListener('pointermove', e => {
  const p = toLogical(e.clientX, e.clientY);
  if (input.joy && input.joy.id === e.pointerId) { input.joy.x = p.x; input.joy.y = p.y; }
  else if (input.fire && input.fire.id === e.pointerId) {
    input.fire.x = p.x; input.fire.y = p.y;
    if (Math.hypot(p.x - input.fire.ox, p.y - input.fire.oy) > 14) input.fire.dragged = true;
  } else if (e.pointerType === 'mouse') { input.aimX = p.x; input.aimY = p.y; input.mouseSeen = true; input.usingTouch = false; }
});
function endPointer(e) {
  if (input.joy && input.joy.id === e.pointerId) input.joy = null;
  if (input.fire && input.fire.id === e.pointerId) input.fire = null;
  if (e.pointerType === 'mouse') input.mouseDown = false;
}
cvs.addEventListener('pointerup', endPointer);
cvs.addEventListener('pointercancel', endPointer);
// stop the page (or the X timeline around the iframe) from scrolling while playing
['touchstart', 'touchmove', 'gesturestart'].forEach(ev => cvs.addEventListener(ev, e => e.preventDefault(), { passive: false }));

function uiTap(p) { // mute button, bottom-right
  if (p.x > W - 44 && p.y > H - 44) { unlockAudio(); muted = !muted; return true; }
  return false;
}

// ---------- GrokButt renderer: white ball, two black pill eyes, butt crease on the back ----------
// Pseudo-3D sphere seen from a camera 55 degrees above the floor. The silhouette is always a perfect circle (no squash).
const CE = 55 * Math.PI / 180, CY = Math.sin(CE), SZ = Math.cos(CE);
const VY = Math.cos(CE), VZ = Math.sin(CE);
function sph(az, el) { const ce = Math.cos(el); return { x: ce * Math.cos(az), y: ce * Math.sin(az), z: Math.sin(el) }; }
const proj = n => ({ x: n.x, y: CY * n.y - SZ * n.z });
const vis = n => VY * n.y + VZ * n.z;
function surfaceFrame(c, x, y, r, az, el) {
  const n = sph(az, el), p = proj(n);
  const t1 = proj({ x: -Math.sin(az), y: Math.cos(az), z: 0 });
  const t2 = proj({ x: -Math.sin(el) * Math.cos(az), y: -Math.sin(el) * Math.sin(az), z: Math.cos(el) });
  c.translate(x + p.x * r, y + p.y * r);
  c.transform(t1.x, t1.y, t2.x, t2.y, 0, 0);
  return vis(n);
}
function pill(c, w, h) { rr(c, -w, -h, w * 2, h * 2, Math.min(w, h)); }

// readability cheat for the steep camera: when GrokButt faces sideways, both the face and the butt are
// rotated a little toward the camera so the eyes and the crease stay visible (silhouette is unchanged)
const towardCam = (a, amt) => a + clamp(angDiff(a, Math.PI / 2), -amt, amt);
function drawGrokButt(c, x, y, r, aim, opts = {}) {
  const bias = 0.6 * Math.abs(Math.cos(aim));
  const face = towardCam(aim + Math.PI, bias), butt = towardCam(aim, bias);
  const bob = opts.bob || 0;
  const cy = y - bob;
  c.save();
  c.globalAlpha = 0.33 * (1 - Math.min(bob, 12) / 30);
  c.fillStyle = '#000';
  c.beginPath(); c.ellipse(x + 3, y + r * 0.78, r * 0.95, r * 0.36, 0, 0, TAU); c.fill();
  c.restore();
  const buttVisible = vis(sph(butt, -0.1)) > 0;
  if (opts.weapon && !buttVisible) drawHeldWeapon(c, x, cy, r, butt, opts.weapon, opts.t || 0, opts.swing || 0);
  c.save();
  if (opts.alpha != null) c.globalAlpha = opts.alpha;
  const g = c.createRadialGradient(x - r * 0.38, cy - r * 0.45, r * 0.08, x, cy, r * 1.02);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#f6f7f9'); g.addColorStop(0.82, '#d6dae1'); g.addColorStop(1, '#aeb4be');
  c.fillStyle = g; c.beginPath(); c.arc(x, cy, r, 0, TAU); c.fill();
  c.save(); c.beginPath(); c.arc(x, cy, r, 0, TAU); c.clip();
  const bl = c.createLinearGradient(0, cy + r * 0.3, 0, cy + r);
  bl.addColorStop(0, 'rgba(160,175,200,0)'); bl.addColorStop(1, 'rgba(120,135,165,0.28)');
  c.fillStyle = bl; c.fillRect(x - r, cy, r * 2, r);
  // butt on the back side: a crease running up from the bottom + the underside curve of each cheek
  const strokeSurf = (fn, w, col) => {
    c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); let on = false;
    for (let i = 0; i <= 24; i++) {
      const [az, el] = fn(i / 24), n = sph(az, el);
      if (vis(n) > 0.03) { const q = proj(n), X = x + q.x * r, Y = cy + q.y * r; on ? c.lineTo(X, Y) : c.moveTo(X, Y); on = true; } else on = false;
    }
    c.stroke();
  };
  const crease = u => [butt, -0.6 + u * 1.22];
  strokeSurf(crease, r * 0.16, 'rgba(110,118,132,0.22)');
  strokeSurf(crease, Math.max(1.6, r * 0.075), 'rgba(78,84,96,0.92)');
  for (const s of [-1, 1]) strokeSurf(u => [butt + s * (0.05 + 0.6 * u), -0.08 - 0.24 * Math.sin(Math.PI * (0.15 + 0.85 * u))], Math.max(1.1, r * 0.05), 'rgba(84,90,104,0.7)');
  for (const s of [-1, 1]) { // cheek highlights
    c.save();
    const v = surfaceFrame(c, x, cy, r, butt + s * 0.4, 0.15);
    if (v > 0.05) {
      const hg = c.createRadialGradient(0, 0, 0, 0, 0, r * 0.42);
      hg.addColorStop(0, `rgba(255,255,255,${0.55 * v})`); hg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = hg; c.beginPath(); c.arc(0, 0, r * 0.42, 0, TAU); c.fill();
    }
    c.restore();
  }
  for (const s of [-1, 1]) { // eyes
    c.save();
    const v = surfaceFrame(c, x, cy, r, face + s * 0.3, 0.42);
    if (v > 0.03) {
      c.fillStyle = '#0c0d10';
      if (opts.squint) { c.fillRect(-r * 0.1, -r * 0.03, r * 0.2, r * 0.06); }
      else { pill(c, r * 0.085, r * 0.17); c.fill(); }
    }
    c.restore();
  }
  if (opts.blush > 0) {
    for (const s of [-1, 1]) {
      c.save();
      const v = surfaceFrame(c, x, cy, r, face + s * 0.5, 0.2);
      if (v > 0.03) { c.fillStyle = `rgba(255,95,120,${0.6 * opts.blush})`; c.beginPath(); c.ellipse(0, 0, r * 0.13, r * 0.07, 0, 0, TAU); c.fill(); }
      c.restore();
    }
  }
  c.restore();
  const hl = c.createRadialGradient(x - r * 0.36, cy - r * 0.46, 0, x - r * 0.36, cy - r * 0.46, r * 0.3);
  hl.addColorStop(0, 'rgba(255,255,255,0.95)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = hl; c.beginPath(); c.arc(x - r * 0.36, cy - r * 0.46, r * 0.3, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(40,46,60,0.55)'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, cy, r - 0.5, 0, TAU); c.stroke();
  if (opts.flash > 0) { c.globalAlpha = opts.flash * 0.5; c.fillStyle = '#ff3b4e'; c.beginPath(); c.arc(x, cy, r, 0, TAU); c.fill(); }
  c.restore();
  if (opts.weapon && buttVisible) drawHeldWeapon(c, x, cy, r, butt, opts.weapon, opts.t || 0, opts.swing || 0);
}

// weapons clenched in the butt crease, sticking out at a silly angle
function drawHeldWeapon(c, x, y, r, aim, w, t, swing) {
  const n = sph(aim, 0.0), p = proj(n);
  c.save();
  c.translate(x + p.x * r * 0.92, y + p.y * r * 0.92);
  let a = aim + 0.55 + Math.sin(t * 9) * 0.06;
  if (w === 'sword') a = aim + 0.9 - swing * 1.9;
  c.rotate(a);
  const k = Math.min(r / 20, 1.7);
  if (w === 'sword') drawCursorSword(c, k);
  else if (w === 'stapler') drawStapler(c, k);
  c.restore();
}
function drawCursorSword(c, s) {
  c.save(); c.scale(s, s);
  c.fillStyle = '#5b3a1e'; rr(c, -4, -3, 12, 6, 2); c.fill();
  c.fillStyle = '#c99b2e'; c.fillRect(7, -7, 4, 14);
  c.beginPath(); c.moveTo(11, -2.5); c.lineTo(30, -2.5); c.lineTo(30, -9); c.lineTo(46, 0); c.lineTo(30, 9); c.lineTo(30, 2.5); c.lineTo(11, 2.5); c.closePath();
  c.fillStyle = '#ffd34d'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#1a1206'; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(13, -1.5, 15, 1.4);
  c.restore();
}
function drawStapler(c, s) {
  c.save(); c.scale(s, s);
  c.fillStyle = '#2a2d36'; rr(c, -2, -1, 30, 8, 3); c.fill();
  c.fillStyle = '#e63b3b'; rr(c, -2, -8, 30, 8, 3); c.fill();
  c.fillStyle = '#ff7a6b'; c.fillRect(2, -7, 20, 2);
  c.fillStyle = '#9aa0aa'; c.fillRect(26, -3, 4, 5);
  c.strokeStyle = '#120b0b'; c.lineWidth = 1.5; rr(c, -2, -8, 30, 15, 3); c.stroke();
  c.restore();
}

// ---------- rooms (pre-rendered, matte floors, story-specific) ----------
const BGS = 2;
function makeCanvas(w, h) { const k = document.createElement('canvas'); k.width = w; k.height = h; return k; }
const ROOMS = [
  {
    name: 'THE APP-ICON GRAVEYARD', sub: 'Recently Deleted · kept for 30 days', seed: 7,
    tombs: [
      { x: 92, y: 178, label: 'FLASHLIGHT+', col: '#c9a640', yrs: '2009–2014' },
      { x: 214, y: 138, label: 'MOOD RING', col: '#8c5fb0', yrs: '2011–2012' },
      { x: 426, y: 138, label: 'FAX 2.0', col: '#4f7f9c', yrs: '1998–2024' },
      { x: 548, y: 178, label: 'RINGTONE MKR', col: '#c45a4a', yrs: '2006–2013' },
      { x: 104, y: 450, label: 'CLIPBOARD PAL', col: '#5f9c66', yrs: '2003–2003' },
      { x: 536, y: 450, label: 'CALC PRO MAX', col: '#d07b2c', yrs: '2010–2019' },
      { x: 320, y: 318, label: 'MY FIRST APP', col: '#5b6fd6', yrs: 'never shipped', big: true },
    ],
    waves: [ { zombie: 3, spam: 1, popup: 1 }, { zombie: 3, spam: 3, popup: 1 }, { zombie: 2, spam: 2, popup: 1, captcha: 1 } ],
  },
  {
    name: 'THE SPAM FOLDER', sub: '1,284,551 unread · do not click anything', seed: 21,
    tombs: [ { x: 110, y: 170, pile: true }, { x: 530, y: 170, pile: true }, { x: 120, y: 470, pile: true }, { x: 520, y: 470, pile: true }, { x: 320, y: 320, funnel: true } ],
    waves: [ { spam: 4, popup: 1 }, { spam: 3, popup: 1, captcha: 2 }, { spam: 5, popup: 2, captcha: 2 } ],
  },
];
function obstacleRects(room) {
  return room.tombs.map(t => {
    if (t.pile) return { x: t.x - 38, y: t.y - 30, w: 76, h: 52 };
    if (t.funnel) return { x: t.x - 40, y: t.y - 38, w: 80, h: 64 };
    const s = t.big ? 1.3 : 1;
    return { x: t.x - 30 * s, y: t.y - 40 * s, w: 60 * s, h: 64 * s };
  });
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => clamp(Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k), 0, 255);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function drawTomb(c, t, R) {
  const s = t.big ? 1.3 : 1;
  c.save(); c.translate(t.x, t.y); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(4, 22, 40, 11, 0, 0, TAU); c.fill();
  c.fillStyle = '#4a5160'; rr(c, -34, 6, 68, 18, 5); c.fill();
  c.fillStyle = '#5b6374'; rr(c, -34, 6, 68, 8, 5); c.fill();
  c.fillStyle = '#d8dbe2'; c.font = `bold 7px ${FONT}`; c.textAlign = 'center'; c.fillText(t.label, 0, 19);
  c.save(); c.rotate((R() - 0.5) * 0.25); c.translate(0, -18);
  const g = c.createLinearGradient(0, -24, 0, 24); g.addColorStop(0, t.col); g.addColorStop(1, shade(t.col, -0.45));
  c.fillStyle = shade(t.col, -0.6); rr(c, -24, -22, 48, 48, 12); c.fill();
  c.fillStyle = g; rr(c, -24, -26, 48, 48, 12); c.fill();
  c.globalAlpha = 0.45; c.fillStyle = '#2b2f2a'; rr(c, -24, -26, 48, 48, 12); c.fill(); c.globalAlpha = 1;
  c.fillStyle = 'rgba(240,236,220,0.85)'; c.font = `14px ${FONT}`; c.fillText('RIP', 0, -2);
  c.font = `bold 6px ${FONT}`; c.fillText(t.yrs, 0, 10);
  c.strokeStyle = 'rgba(10,10,14,0.7)'; c.lineWidth = 1.2; c.beginPath();
  c.moveTo(-10, -26); c.lineTo(-4, -16); c.lineTo(-9, -8); c.lineTo(-2, 2); c.stroke();
  c.fillStyle = 'rgba(80,140,70,0.75)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(-20 + R() * 40, 18 + R() * 4, 2 + R() * 3, 0, TAU); c.fill(); }
  c.fillStyle = '#7a2a2a'; c.beginPath(); c.arc(21, -23, 7, 0, TAU); c.fill();
  c.fillStyle = '#e7c9c9'; c.font = `bold 6px ${FONT}`; c.fillText('99+', 21, -21);
  c.restore(); c.restore();
}
function drawEnvelopePile(c, R) {
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(4, 20, 46, 12, 0, 0, TAU); c.fill();
  const cols = ['#e9d9a6', '#d8c38a', '#c9b78f', '#e2cf96', '#bfae86'], words = ['SPAM', 'URGENT', 'FREE$', 'WIN!!'];
  for (let i = 0; i < 16; i++) {
    c.save(); c.translate((R() - 0.5) * 60, 12 - i * 2.6 + (R() - 0.5) * 6); c.rotate((R() - 0.5) * 0.9);
    c.fillStyle = cols[Math.floor(R() * cols.length)]; c.fillRect(-14, -9, 28, 18);
    c.strokeStyle = 'rgba(60,40,20,0.6)'; c.lineWidth = 1; c.strokeRect(-14, -9, 28, 18);
    c.beginPath(); c.moveTo(-14, -9); c.lineTo(0, 2); c.lineTo(14, -9); c.stroke();
    if (R() < 0.35) { c.fillStyle = '#c62f2f'; c.font = `bold 6px ${FONT}`; c.textAlign = 'center'; c.fillText(words[Math.floor(R() * 4)], 0, 7); }
    c.restore();
  }
}
function drawFunnel(c) {
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(4, 26, 46, 12, 0, 0, TAU); c.fill();
  c.fillStyle = '#3f2a52'; c.beginPath(); c.moveTo(-44, -30); c.lineTo(44, -30); c.lineTo(12, 8); c.lineTo(12, 24); c.lineTo(-12, 24); c.lineTo(-12, 8); c.closePath(); c.fill();
  c.fillStyle = '#6d4b8c'; c.beginPath(); c.ellipse(0, -30, 44, 11, 0, 0, TAU); c.fill();
  c.fillStyle = '#24162f'; c.beginPath(); c.ellipse(0, -30, 36, 7, 0, 0, TAU); c.fill();
  c.fillStyle = '#f3c84a'; c.font = `bold 9px ${FONT}`; c.textAlign = 'center'; c.fillText('JUNK FILTER', 0, -6);
  c.fillStyle = '#ff6b5e'; c.font = `bold 7px ${FONT}`; c.fillText('(BROKEN)', 0, 4);
}

function buildRoomBG(idx) {
  const room = ROOMS[idx];
  const k = makeCanvas(W * BGS, H * BGS), c = k.getContext('2d');
  c.scale(BGS, BGS);
  const R = seeded(room.seed);
  if (idx === 0) {
    // dead home-screen soil: dark matte teal with empty icon slots
    const g = c.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 480);
    g.addColorStop(0, '#22383a'); g.addColorStop(1, '#0e1a1d'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let gy = 0; gy < 9; gy++) for (let gx = 0; gx < 9; gx++) {
      c.strokeStyle = 'rgba(140,200,190,0.07)'; c.lineWidth = 2; rr(c, 22 + gx * 68, 76 + gy * 66, 50, 50, 13); c.stroke();
    }
    for (let i = 0; i < 300; i++) { // dead pixel grass
      const x = R() * W, y = 66 + R() * (H - 66);
      c.fillStyle = R() < 0.5 ? 'rgba(82,120,74,0.55)' : 'rgba(110,98,60,0.5)';
      c.fillRect(x, y, 2, 3 + R() * 4); c.fillRect(x + 3, y + 2, 2, 2 + R() * 3);
    }
    for (let i = 0; i < 14; i++) { // broken-image litter
      c.save(); c.translate(30 + R() * (W - 60), 96 + R() * (H - 120)); c.rotate((R() - 0.5) * 1.2);
      c.fillStyle = 'rgba(30,40,46,0.9)'; c.fillRect(-8, -6, 16, 12);
      c.strokeStyle = 'rgba(160,170,180,0.6)'; c.lineWidth = 1; c.strokeRect(-8, -6, 16, 12);
      c.strokeStyle = 'rgba(120,180,120,0.8)'; c.beginPath(); c.moveTo(-6, 4); c.lineTo(-1, -1); c.lineTo(2, 2); c.lineTo(6, -3); c.stroke();
      c.fillStyle = 'rgba(210,80,70,0.85)'; c.fillRect(3, -5, 4, 3);
      c.restore();
    }
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1;
    for (let i = 0; i < 18; i++) { let x = R() * W, y = 80 + R() * H; c.beginPath(); c.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (R() - 0.5) * 40; y += (R() - 0.5) * 30; c.lineTo(x, y); } c.stroke(); }
    // night sky strip + fence
    const sky = c.createLinearGradient(0, 0, 0, 62); sky.addColorStop(0, '#2a1d3d'); sky.addColorStop(1, '#3b2f52'); c.fillStyle = sky; c.fillRect(0, 0, W, 62);
    c.fillStyle = '#e8d88a'; c.beginPath(); c.arc(590, 24, 13, 0, TAU); c.fill(); c.fillStyle = '#2d2042'; c.beginPath(); c.arc(596, 20, 12, 0, TAU); c.fill(); // crescent
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,240,200,${0.3 + R() * 0.6})`; c.fillRect(R() * W, R() * 44, 1.5, 1.5); }
    for (let x = 0; x < W; x += 16) { c.fillStyle = '#141b1e'; c.fillRect(x, 32, 5, 32); c.beginPath(); c.moveTo(x - 1, 32); c.lineTo(x + 2.5, 24); c.lineTo(x + 6, 32); c.fill(); }
    c.fillStyle = '#141b1e'; c.fillRect(0, 40, W, 4); c.fillRect(0, 56, W, 6);
    c.save(); c.translate(250, 560); c.rotate(-0.05);
    c.fillStyle = '#5a3e26'; c.fillRect(-3, 0, 6, 24);
    c.fillStyle = '#7b5634'; rr(c, -66, -18, 132, 26, 4); c.fill();
    c.fillStyle = '#f1dfb8'; c.font = `bold 10px ${FONT}`; c.textAlign = 'center'; c.fillText('RECENTLY DELETED', 0, -2);
    c.restore();
    for (let y = 76; y < H; y += 40) for (const x of [0, W - 14]) { c.fillStyle = '#16292a'; rr(c, x, y, 14, 34, 3); c.fill(); c.fillStyle = '#1f3a3a'; c.fillRect(x + 3, y + 4, 2, 26); c.fillRect(x + 8, y + 4, 2, 26); }
    for (let i = 0; i < 9; i++) { const fx = R() * W, fy = 140 + R() * 420; const fg = c.createRadialGradient(fx, fy, 0, fx, fy, 140); fg.addColorStop(0, 'rgba(150,120,200,0.07)'); fg.addColorStop(1, 'rgba(150,120,200,0)'); c.fillStyle = fg; c.fillRect(0, 0, W, H); }
  } else {
    // spam folder: matte maroon carpet with an envelope weave
    const g = c.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 480);
    g.addColorStop(0, '#3b1d2b'); g.addColorStop(1, '#1a0b14'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let y = 70; y < H; y += 34) for (let x = ((y - 70) / 34 % 2) * 26; x < W; x += 52) {
      c.strokeStyle = 'rgba(255,190,150,0.06)'; c.lineWidth = 1.5; c.strokeRect(x, y, 30, 20);
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 15, y + 11); c.lineTo(x + 30, y); c.stroke();
    }
    const ccols = ['#c7a24a', '#4f8d5e', '#5e72b8', '#b0564f'], cw = ['$$$', '90%', 'FREE', 'WIN', 'VIP'];
    for (let i = 0; i < 26; i++) { // coupons & fake prize tickets
      c.save(); c.translate(R() * W, 86 + R() * (H - 96)); c.rotate((R() - 0.5) * 1.6);
      c.fillStyle = ccols[Math.floor(R() * 4)]; c.fillRect(-11, -6, 22, 12); c.strokeStyle = 'rgba(0,0,0,0.4)'; c.setLineDash([2, 2]); c.strokeRect(-9, -4, 18, 8); c.setLineDash([]);
      c.fillStyle = 'rgba(20,10,10,0.8)'; c.font = `bold 5px ${FONT}`; c.textAlign = 'center'; c.fillText(cw[Math.floor(R() * 5)], 0, 2);
      c.restore();
    }
    const wg = c.createLinearGradient(0, 0, 0, 62); wg.addColorStop(0, '#26121e'); wg.addColorStop(1, '#3a1a2a'); c.fillStyle = wg; c.fillRect(0, 0, W, 62);
    const banners = [['CONGRATULATIONS!!!', '#f3c84a', 320, 172], ['HOT SINGLES IN YOUR CPU', '#ff6b5e', 320, 470], ['PRINCE NEEDS $5', '#7fd17a', 96, 322], ['YOUR PACKAGE IS WAITING', '#6fb3ff', 544, 322]];
    banners.forEach((b, i) => { // standing spam billboards
      c.save(); c.translate(b[2], b[3]); c.rotate((i % 2 ? 1 : -1) * 0.03);
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(3, 20, 56, 7, 0, 0, TAU); c.fill();
      c.fillStyle = '#3a2430'; c.fillRect(-40, 4, 4, 16); c.fillRect(36, 4, 4, 16);
      c.fillStyle = '#120810'; rr(c, -60, -16, 120, 26, 4); c.fill();
      c.strokeStyle = b[1]; c.lineWidth = 2; rr(c, -60, -16, 120, 26, 4); c.stroke();
      c.fillStyle = b[1]; c.font = `bold ${b[0].length > 18 ? 7.5 : 9}px ${FONT}`; c.textAlign = 'center'; c.fillText(b[0], 0, 1);
      c.restore();
    });
    // back wall: an inbox counter ticker
    c.fillStyle = '#120810'; c.fillRect(0, 58, W, 6);
    for (let y = 76; y < H; y += 30) for (const x of [0, W - 16]) { c.fillStyle = '#2a1520'; c.fillRect(x, y, 16, 26); c.fillStyle = '#d8c38a'; c.fillRect(x + 3, y + 4, 10, 3); c.fillRect(x + 3, y + 10, 10, 3); }
    c.save(); c.translate(320, 612); c.fillStyle = '#4a4f5c'; rr(c, -60, -12, 120, 24, 12); c.fill();
    c.fillStyle = '#a7adbb'; c.font = `bold 10px ${FONT}`; c.textAlign = 'center'; c.fillText('UNSUBSCRIBE', 0, 4);
    c.strokeStyle = '#120810'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-20, -12); c.lineTo(-10, 0); c.lineTo(-16, 12); c.moveTo(18, -12); c.lineTo(10, 2); c.stroke(); c.restore();
  }
  for (const t of room.tombs) {
    if (t.pile) { c.save(); c.translate(t.x, t.y); drawEnvelopePile(c, R); c.restore(); }
    else if (t.funnel) { c.save(); c.translate(t.x, t.y); drawFunnel(c); c.restore(); }
    else drawTomb(c, t, R);
  }
  const v = c.createRadialGradient(W / 2, H / 2, 240, W / 2, H / 2, 480);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  return k;
}
let roomBGs = [];

// ---------- game state ----------
let state = 'title', stateT = 0, paused = false;
let player = null, enemies = [], bullets = [], ebullets = [], loot = [], pops = [], parts = [], spawns = [];
let roomIdx = 0, waveIdx = -1, doorOpen = false, score = 0, shake = 0, hitstop = 0, fade = 0, bannerT = 0, timeAlive = 0, kills = 0, nextWaveT = 0;
let obstacles = [];

function startGame() {
  unlockAudio();
  if (!roomBGs.length) roomBGs = ROOMS.map((_, i) => buildRoomBG(i));
  player = { x: W / 2, y: H - 110, r: 22, hp: 100, maxhp: 100, aim: -Math.PI / 2, vx: 0, vy: 0,
    cd: 0, lunge: 0, lx: 0, ly: 0, inv: 0, blush: 0, flash: 0, weapon: null, wUses: 0, swing: 0,
    power: null, powerT: 0, powerCd: 0, shield: 0, bob: 0, moving: false, t: 0, bumpHit: new Set() };
  enemies = []; bullets = []; ebullets = []; loot = []; pops = []; parts = []; spawns = [];
  score = 0; shake = 0; hitstop = 0; kills = 0; timeAlive = 0;
  enterRoom(0);
  state = 'play'; stateT = 0; paused = false;
}
function enterRoom(i) {
  roomIdx = i; waveIdx = -1; doorOpen = false; bannerT = 2.4; fade = 1; nextWaveT = 1.2;
  obstacles = obstacleRects(ROOMS[i]);
  enemies.length = 0; ebullets.length = 0; bullets.length = 0; spawns.length = 0; loot.length = 0;
  player.x = W / 2; player.y = H - 70;
}
function startWave() {
  waveIdx++;
  const wv = ROOMS[roomIdx].waves[waveIdx], list = [];
  for (const k in wv) for (let i = 0; i < wv[k]; i++) list.push(k);
  list.forEach((type, i) => {
    let x, y, tries = 0;
    do { x = rnd(50, W - 50); y = rnd(100, H - 50); tries++; } while ((Math.hypot(x - player.x, y - player.y) < 200 || hitsObstacle(x, y, 26)) && tries < 60);
    spawns.push({ type, x, y, t: 0.9 + i * 0.18 });
  });
  pop(W / 2, 140, `WAVE ${waveIdx + 1}/${ROOMS[roomIdx].waves.length}`, '#ffd34d', 26, 1.4);
}
const EDEF = {
  spam: { r: 16, hp: 30, speed: 78, dmg: 10, score: 100 },
  zombie: { r: 14, hp: 18, speed: 60, dmg: 8, score: 50 },
  popup: { r: 22, hp: 26, speed: 50, dmg: 6, score: 150 },
  captcha: { r: 24, hp: 90, speed: 38, dmg: 14, score: 300 },
};
function spawnEnemy(type, x, y) {
  const d = EDEF[type];
  enemies.push({ type, x, y, r: d.r, hp: d.hp, maxhp: d.hp, kx: 0, ky: 0, flash: 0, t: rnd(0, 5), cd: rnd(1.2, 2.5), face: Math.atan2(player.y - y, player.x - x), hop: rnd(0, 0.5), hv: null, wx: x, wy: y, wt: 0 });
  burst(x, y, 14, ['#6fb3ff', '#ffd34d', '#ff6b5e'], 160);
}
function hitsObstacle(x, y, r) {
  for (const o of obstacles) { const cx = clamp(x, o.x, o.x + o.w), cy = clamp(y, o.y, o.y + o.h); if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true; }
  return false;
}
function collide(e) {
  for (const o of obstacles) {
    const cx = clamp(e.x, o.x, o.x + o.w), cy = clamp(e.y, o.y, o.y + o.h);
    const dx = e.x - cx, dy = e.y - cy, d2 = dx * dx + dy * dy;
    if (d2 < e.r * e.r) {
      if (d2 === 0) { e.y = o.y + o.h + e.r; continue; }
      const d = Math.sqrt(d2); e.x = cx + dx / d * e.r; e.y = cy + dy / d * e.r;
    }
  }
  e.x = clamp(e.x, 16 + e.r, W - 16 - e.r);
  e.y = clamp(e.y, 64 + e.r, H - 8 - e.r);
}

// ---------- fx ----------
function pop(x, y, text, color = '#fff', size = 22, life = 0.8) { pops.push({ x, y, text, color, size, life, t: 0, rot: rnd(-0.2, 0.2) }); }
function burst(x, y, n, cols, sp = 220) {
  for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(sp * 0.3, sp); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.3, 0.7), t: 0, col: pick(cols), sz: rnd(2, 5), kind: 'sq', rot: rnd(0, TAU) }); }
}
function puff(x, y, n, col) { for (let i = 0; i < n; i++) parts.push({ x: x + rnd(-6, 6), y: y + rnd(-6, 6), vx: rnd(-30, 30), vy: rnd(-40, 0), life: rnd(0.5, 0.9), t: 0, col, sz: rnd(6, 11), kind: 'puff' }); }
const addShake = s => { shake = Math.max(shake, s); };

// ---------- combat ----------
function damageEnemy(e, dmg, kx, ky, word, col) {
  let mult = 1;
  if (e.type === 'captcha') { // checkbox shield faces the player; frontal hits are halved
    const hitFrom = Math.atan2(-ky, -kx);
    if (Math.abs(angDiff(e.face, hitFrom)) < 1.0) { mult = 0.5; if (Math.random() < 0.4) pop(e.x, e.y - 34, 'BLOCKED', '#6fb3ff', 13, 0.5); SFX.block(); }
    else if (word) word = 'BACKSTAB!';
  }
  e.hp -= dmg * mult; e.flash = 0.12;
  const kk = e.type === 'captcha' ? 0.4 : 1;
  e.kx += kx * kk; e.ky += ky * kk;
  if (word) pop(e.x + rnd(-8, 8), e.y - e.r - 8, word, col || '#ffd34d', 20, 0.6);
  burst(e.x, e.y, 6, ['#ffd34d', '#ff8a3d', '#6fb3ff'], 160);
  if (e.hp <= 0 && !e.dead) killEnemy(e);
}
const LOOTNAMES = { sword: 'CURSOR SWORD', stapler: 'STAPLER GUN', bubble: 'BUBBLE FARTS', pits: 'PEACH PITS', toot: 'TOOT MISSILE', shield: 'NOT A ROBOT SHIELD', heart: '+HP PATCH' };
function killEnemy(e) {
  e.dead = true; kills++;
  const d = EDEF[e.type];
  score += d.score;
  pop(e.x, e.y - 18, '+' + d.score, '#7fe3a1', 14, 0.8);
  SFX.die(); addShake(5);
  const cols = { spam: ['#e9d9a6', '#c62f2f', '#8a6d3b'], zombie: ['#5f9c66', '#8c5fb0', '#2b2f2a'], popup: ['#2f6fdb', '#f3c84a', '#ff4f6d'], captcha: ['#2f6fdb', '#7fb2ff', '#3ccf6e'] }[e.type];
  burst(e.x, e.y, 22, cols, 260);
  if (e.type === 'popup') {
    const opts = ['sword', 'stapler'].filter(w => w !== player.weapon);
    dropLoot(e.x, e.y, Math.random() < 0.8 ? pick(opts) : pick(['bubble', 'pits', 'toot']));
    pop(e.x, e.y + 22, pick(['AD BLOCKED', 'CLOSED!', 'NO THANKS']), '#f3c84a', 14, 0.9);
  } else if (e.type === 'captcha') {
    if (Math.random() < 0.3 && player.shield <= 0) dropLoot(e.x, e.y, 'shield');
    else dropLoot(e.x, e.y, pick(['bubble', 'pits', 'toot']));
  } else if (Math.random() < (e.type === 'spam' ? 0.22 : 0.1)) dropLoot(e.x, e.y, pick(['bubble', 'pits', 'toot', 'heart']));
}
function dropLoot(x, y, kind) { x = clamp(x, 40, W - 40); y = clamp(y, 96, H - 40); loot.push({ x, y, kind, t: 0, life: 16 }); }
function hurtPlayer(dmg, fromX, fromY) {
  if (state !== 'play' || player.inv > 0 || player.lunge > 0 || player.god) return;
  if (player.shield > 0) {
    player.shield--; player.inv = 0.6; SFX.block();
    pop(player.x, player.y - 34, player.shield ? 'VERIFIED HUMAN' : 'SHIELD GONE', '#6fb3ff', 15, 0.8);
    burst(player.x, player.y, 10, ['#2f6fdb', '#7fb2ff'], 200);
    return;
  }
  player.hp -= dmg; player.inv = 0.9; player.blush = 1; player.flash = 0.25;
  const a = Math.atan2(player.y - fromY, player.x - fromX);
  player.vx += Math.cos(a) * 260; player.vy += Math.sin(a) * 260;
  SFX.hurt(); addShake(9); hitstop = 0.06;
  pop(player.x, player.y - 38, pick(['EEP!', 'DON\'T LOOK!', 'OW!', 'RUDE!']), '#ff8aa0', 18, 0.7);
  if (player.hp <= 0) { player.hp = 0; state = 'over'; stateT = 0; SFX.over(); addShake(14); }
}
function buttPoint(d = 0) { return { x: player.x + Math.cos(player.aim) * (player.r + d), y: player.y + Math.sin(player.aim) * (player.r + d) }; }
function attack() {
  const p = player, a = p.aim;
  if (p.weapon === 'sword') {
    p.cd = 0.34; p.swing = 1; SFX.swish();
    for (const e of enemies) {
      const ang = Math.atan2(e.y - p.y, e.x - p.x);
      if (dist(e, p) < 84 + e.r && Math.abs(angDiff(a, ang)) < 1.15) damageEnemy(e, 24, Math.cos(ang) * 320, Math.sin(ang) * 320, pick(['SWISH', 'SLICE', 'CLICK!']), '#ffd34d');
    }
    for (const b of ebullets) if (dist(b, p) < 80 && Math.abs(angDiff(a, Math.atan2(b.y - p.y, b.x - p.x))) < 1.2) { b.dead = true; burst(b.x, b.y, 4, ['#ffd34d'], 120); }
    useWeapon();
  } else if (p.weapon === 'stapler') {
    p.cd = 0.2; SFX.staple();
    const bp = buttPoint(4);
    for (const s of [-0.13, 0, 0.13]) bullets.push({ kind: 'staple', x: bp.x, y: bp.y, vx: Math.cos(a + s) * 620, vy: Math.sin(a + s) * 620, r: 5, dmg: 9, life: 0.8, a: a + s });
    p.vx -= Math.cos(a) * 40; p.vy -= Math.sin(a) * 40;
    useWeapon();
  } else { // BUTT BUMP: shy lunge, back first
    p.cd = 0.42; p.lunge = 0.14; p.lx = Math.cos(a); p.ly = Math.sin(a); p.bumpHit = new Set();
    SFX.bump();
  }
}
function useWeapon() {
  player.wUses--;
  if (player.wUses <= 0) { pop(player.x, player.y - 38, player.weapon === 'sword' ? 'SWORD SNAPPED' : 'OUT OF STAPLES', '#ff8a3d', 15, 0.9); player.weapon = null; SFX.die(); }
}
function firePower() {
  const p = player, a = p.aim, bp = buttPoint(p.power === 'bubble' ? 16 : 6);
  if (p.power === 'bubble') {
    p.powerCd = 0.75; SFX.bubble(); puff(bp.x, bp.y, 5, 'rgba(150,210,90,0.5)');
    bullets.push({ kind: 'bubble', x: bp.x, y: bp.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, r: 13, dmg: 14, life: 1.8, pierce: 3, hit: new Set() });
    pop(bp.x + Math.cos(a) * 34, bp.y + Math.sin(a) * 34 - 6, pick(['PFFT', 'BLORP', 'PBBT']), '#a6e36b', 15, 0.5);
  } else if (p.power === 'pits') {
    p.powerCd = 0.085; SFX.pit();
    const s = rnd(-0.12, 0.12);
    bullets.push({ kind: 'pit', x: bp.x, y: bp.y, vx: Math.cos(a + s) * 560, vy: Math.sin(a + s) * 560, r: 5, dmg: 5, life: 0.7, rot: rnd(0, TAU) });
  } else if (p.power === 'toot') {
    p.powerCd = 0.9; SFX.toot();
    bullets.push({ kind: 'toot', x: bp.x, y: bp.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, r: 8, dmg: 28, life: 2.6, a });
    pop(bp.x + Math.cos(a) * 34, bp.y + Math.sin(a) * 34 - 6, 'TOOT!', '#ff9a3d', 16, 0.5);
  }
}
function explode(x, y) {
  SFX.boom(); addShake(10); hitstop = 0.05;
  burst(x, y, 26, ['#ff9a3d', '#ffd34d', '#ff5a3d'], 300); puff(x, y, 10, 'rgba(255,170,90,0.5)');
  pop(x, y - 10, 'TOOT!!', '#ff9a3d', 26, 0.8);
  for (const e of enemies) { const d = Math.hypot(e.x - x, e.y - y); if (d < 70 + e.r && !e.dead) { const a = Math.atan2(e.y - y, e.x - x); damageEnemy(e, 28 * Math.max(0.3, 1 - d / 140), Math.cos(a) * 380, Math.sin(a) * 380); } }
}
function collect(kind) {
  const p = player; SFX.pickup();
  if (kind === 'sword' || kind === 'stapler') { p.weapon = kind; p.wUses = kind === 'sword' ? 36 : 45; pop(p.x, p.y - 42, kind === 'sword' ? 'CURSOR SWORD! (clenched)' : 'STAPLER GUN! (clenched)', '#ffd34d', 15, 1.1); }
  else if (kind === 'shield') { p.shield = 3; pop(p.x, p.y - 42, 'I\'M NOT A ROBOT ☑', '#6fb3ff', 16, 1.1); }
  else if (kind === 'heart') { p.hp = Math.min(p.maxhp, p.hp + 30); pop(p.x, p.y - 42, '+30 HP', '#7fe3a1', 16, 0.9); }
  else { p.power = kind; p.powerT = 12; p.powerCd = 0; pop(p.x, p.y - 42, LOOTNAMES[kind] + '!', kind === 'bubble' ? '#a6e36b' : kind === 'pits' ? '#ffb36b' : '#ff9a3d', 17, 1.1); }
  score += 25;
}

// ---------- update ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, Math.max(0, (now - last) / 1000)); last = now;
  stateT += dt;
  if (state === 'play' && !paused) { if (hitstop > 0) hitstop -= dt; else update(dt); }
  else if (state !== 'play') updateFx(dt);
  render();
  requestAnimationFrame(frame);
}
function nearestEnemy(from = player) {
  let best = null, bd = 1e9;
  for (const e of enemies) { if (e.dead) continue; const d = dist(e, from); if (d < bd) { bd = d; best = e; } }
  return best;
}
function update(dt) {
  const p = player; p.t += dt; timeAlive += dt;
  fade = Math.max(0, fade - dt * 2.2); bannerT -= dt;
  let mx = 0, my = 0;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1;
  if (input.joy) {
    const dx = input.joy.x - input.joy.ox, dy = input.joy.y - input.joy.oy, d = Math.hypot(dx, dy);
    if (d > 6) { const k = Math.min(1, d / 46); mx = dx / d * k; my = dy / d * k; }
  }
  if (p.auto) {
    const n = nearestEnemy(); let tx, ty;
    if (n) { tx = n.x; ty = n.y; } else if (loot.length) { tx = loot[0].x; ty = loot[0].y; } else if (doorOpen) { if (p.y > 240) { tx = p.x < W / 2 ? 190 : 450; ty = 222; } else if (Math.abs(p.x - W / 2) > 24) { tx = W / 2; ty = 215; } else { tx = W / 2; ty = 40; } } else { tx = W / 2; ty = H / 2 + 120; }
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1;
    if (!n || d > 50) { mx = dx / d; my = dy / d; }
    if (Math.abs(dy) < 30 && Math.abs(dx) < 30 && !n) { mx += Math.sin(p.t * 3); }
  }
  const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  const SPEED = 200;
  p.vx = lerp(p.vx, mx * SPEED, Math.min(1, dt * 14)); p.vy = lerp(p.vy, my * SPEED, Math.min(1, dt * 14));
  p.moving = ml > 0.1;
  // aim: mouse, touch drag, or auto-aim at the nearest enemy
  let target = null;
  if (input.usingTouch || !input.mouseSeen) {
    if (input.fire && input.fire.dragged) target = Math.atan2(input.fire.y - input.fire.oy, input.fire.x - input.fire.ox);
    else { const n = nearestEnemy(); if (n) target = Math.atan2(n.y - p.y, n.x - p.x); else if (p.moving) target = Math.atan2(-my, -mx); }
  } else target = Math.atan2(input.aimY - p.y, input.aimX - p.x);
  if (target != null) p.aim += angDiff(p.aim, target) * Math.min(1, dt * 18);
  if (p.lunge > 0) {
    p.lunge -= dt;
    const lsp = enemies.length ? 520 : 0; // no pointless backwards hops when the room is empty
    p.x += p.lx * lsp * dt; p.y += p.ly * lsp * dt;
    const bp = buttPoint(0);
    for (const e of enemies) {
      if (p.bumpHit.has(e) || e.dead) continue;
      if (Math.hypot(e.x - bp.x, e.y - bp.y) < e.r + 18) {
        p.bumpHit.add(e);
        const ang = Math.atan2(e.y - p.y, e.x - p.x);
        damageEnemy(e, 22, Math.cos(ang) * 420, Math.sin(ang) * 420, pick(['BONK', 'BONK!', 'BOINK', 'THWOMP']), '#ffd34d');
        SFX.bonk(); addShake(6); hitstop = 0.045;
      }
    }
  } else { p.x += p.vx * dt; p.y += p.vy * dt; }
  collide(p);
  p.bob = p.moving ? Math.abs(Math.sin(p.t * 11)) * 4 : Math.abs(Math.sin(p.t * 2.5)) * 1.2;
  p.cd -= dt; p.inv -= dt; p.blush = Math.max(0, p.blush - dt * 1.6); p.flash = Math.max(0, p.flash - dt); p.swing = Math.max(0, p.swing - dt * 5);
  const wantAttack = input.mouseDown || keys.Space || keys.KeyJ || !!input.fire;
  if (wantAttack && p.cd <= 0) attack();
  if (p.power) { // power-ups auto-fire from the butt
    p.powerT -= dt; p.powerCd -= dt;
    if (p.powerCd <= 0 && (enemies.length || wantAttack)) firePower();
    if (p.powerT <= 0) { pop(p.x, p.y - 36, 'POWER-UP OVER', '#bbbbbb', 13, 0.7); p.power = null; }
  }
  // waves
  if (!enemies.length && !spawns.length) {
    if (waveIdx < ROOMS[roomIdx].waves.length - 1) { nextWaveT -= dt; if (nextWaveT <= 0) { startWave(); nextWaveT = 1.6; } }
    else if (!doorOpen) {
      doorOpen = true; SFX.door(); score += 500;
      pop(W / 2, H / 2 - 60, roomIdx === 0 ? 'GRAVEYARD CLEARED!' : 'SPAM FOLDER CLEARED!', '#7fe3a1', 28, 1.6);
    }
  }
  for (const s of spawns) { s.t -= dt; if (s.t <= 0) { spawnEnemy(s.type, s.x, s.y); s.done = true; } }
  spawns = spawns.filter(s => !s.done);
  if (doorOpen && Math.abs(p.x - W / 2) < 48 && p.y < 64 + p.r + 14) {
    if (roomIdx === 0) { enterRoom(1); SFX.door(); }
    else { state = 'win'; stateT = 0; score += Math.max(0, 3000 - Math.floor(timeAlive) * 10); SFX.door(); }
    return;
  }
  // enemies
  for (const e of enemies) {
    e.t += dt; e.flash -= dt; e.cd -= dt;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, d0 = EDEF[e.type];
    let vx = 0, vy = 0;
    e.face += angDiff(e.face, Math.atan2(dy, dx)) * Math.min(1, dt * 3);
    if (e.type === 'spam') { vx = dx / d * d0.speed + Math.cos(e.t * 3) * 25; vy = dy / d * d0.speed + Math.sin(e.t * 2.3) * 25; }
    else if (e.type === 'zombie') {
      e.hop -= dt;
      if (e.hop <= 0) { e.hop = rnd(0.7, 1.2); e.hv = { x: dx / d * 170, y: dy / d * 170 }; }
      const k = clamp((e.hop - 0.3) / 0.6, 0, 1); vx = (e.hv ? e.hv.x : 0) * k; vy = (e.hv ? e.hv.y : 0) * k;
    } else if (e.type === 'popup') {
      e.wt -= dt;
      if (e.wt <= 0) { e.wt = rnd(1.2, 2.2); e.wx = rnd(60, W - 60); e.wy = rnd(110, H - 60); }
      const wx = e.wx - e.x, wy = e.wy - e.y, wd = Math.hypot(wx, wy) || 1; vx = wx / wd * d0.speed; vy = wy / wd * d0.speed;
      if (e.cd <= 0) { e.cd = rnd(1.8, 2.6); for (const s of [-0.3, 0, 0.3]) { const a = Math.atan2(dy, dx) + s; ebullets.push({ kind: 'bang', x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 7, dmg: 7, life: 3 }); } SFX.enemyShot(); }
    } else if (e.type === 'captcha') {
      if (d > 150) { vx = dx / d * d0.speed; vy = dy / d * d0.speed; }
      if (e.cd <= 0) { e.cd = rnd(1.9, 2.7); const a = Math.atan2(dy, dx); for (const s of [-0.2, 0.2]) ebullets.push({ kind: 'tile', x: e.x, y: e.y, vx: Math.cos(a + s) * 170, vy: Math.sin(a + s) * 170, r: 8, dmg: 10, life: 3.5, col: pick(['#e74c3c', '#f1c40f', '#3ccf6e']), rot: 0 }); SFX.enemyShot(); }
    }
    e.x += (vx + e.kx) * dt; e.y += (vy + e.ky) * dt;
    const decay = Math.pow(0.004, dt); e.kx *= decay; e.ky *= decay;
    collide(e);
    if (d < e.r + p.r - 2 && p.lunge <= 0) hurtPlayer(d0.dmg, e.x, e.y);
  }
  for (let i = 0; i < enemies.length; i++) for (let j = i + 1; j < enemies.length; j++) {
    const a = enemies[i], b = enemies[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, m = a.r + b.r;
    if (d < m) { const push = (m - d) / 2; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; }
  }
  enemies = enemies.filter(e => !e.dead);
  // player projectiles
  for (const b of bullets) {
    b.life -= dt;
    if (b.kind === 'toot') { // homing
      const n = nearestEnemy(b);
      if (n) b.a += angDiff(b.a, Math.atan2(n.y - b.y, n.x - b.x)) * Math.min(1, dt * 5);
      const sp = Math.min(420, Math.hypot(b.vx, b.vy) + dt * 300);
      b.vx = Math.cos(b.a) * sp; b.vy = Math.sin(b.a) * sp;
      if (Math.random() < 0.6) puff(b.x - Math.cos(b.a) * 10, b.y - Math.sin(b.a) * 10, 1, 'rgba(255,170,90,0.45)');
    }
    if (b.kind === 'bubble') { b.r = Math.min(22, b.r + dt * 6); b.vx *= Math.pow(0.6, dt); b.vy *= Math.pow(0.6, dt); }
    if (b.kind === 'pit') b.rot += dt * 20;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < 0 || b.x > W || b.y < 40 || b.y > H) b.dead = true;
    for (const e of enemies) {
      if (b.dead || e.dead || (b.hit && b.hit.has(e))) continue;
      if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) {
        const a = Math.atan2(b.vy, b.vx);
        if (b.kind === 'bubble') { damageEnemy(e, b.dmg, Math.cos(a) * 520, Math.sin(a) * 520, 'BLORP', '#a6e36b'); b.hit.add(e); b.pierce--; puff(b.x, b.y, 6, 'rgba(150,210,90,0.55)'); if (b.pierce <= 0) b.dead = true; }
        else if (b.kind === 'toot') { b.dead = true; explode(b.x, b.y); }
        else { damageEnemy(e, b.dmg, Math.cos(a) * 90, Math.sin(a) * 90, Math.random() < 0.3 ? (b.kind === 'pit' ? 'PIT!' : 'CHK!') : null, '#ffb36b'); b.dead = true; }
      }
    }
    if (b.life <= 0 && !b.dead) { b.dead = true; if (b.kind === 'toot') explode(b.x, b.y); if (b.kind === 'bubble') puff(b.x, b.y, 6, 'rgba(150,210,90,0.5)'); }
  }
  bullets = bullets.filter(b => !b.dead);
  enemies = enemies.filter(e => !e.dead);
  for (const b of ebullets) {
    b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.rot != null) b.rot += dt * 4;
    if (b.life <= 0 || b.x < 0 || b.x > W || b.y < 40 || b.y > H) b.dead = true;
    if (!b.dead && Math.hypot(p.x - b.x, p.y - b.y) < p.r + b.r - 3) { b.dead = true; hurtPlayer(b.dmg, b.x - b.vx, b.y - b.vy); }
  }
  ebullets = ebullets.filter(b => !b.dead);
  for (const l of loot) {
    l.t += dt; l.life -= dt;
    if (l.life <= 0) l.dead = true;
    else if (Math.hypot(l.x - p.x, l.y - p.y) < p.r + 16) { l.dead = true; collect(l.kind); }
  }
  loot = loot.filter(l => !l.dead);
  updateFx(dt);
}
function updateFx(dt) {
  shake = Math.max(0, shake - dt * 30);
  for (const q of pops) q.t += dt; pops = pops.filter(q => q.t < q.life);
  for (const q of parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.pow(0.05, dt); q.vy *= Math.pow(0.05, dt); if (q.rot != null) q.rot += dt * 8; }
  parts = parts.filter(q => q.t < q.life);
}

// ---------- enemy drawing ----------
function drawEnemy(c, e) {
  c.save(); c.translate(e.x, e.y);
  c.fillStyle = 'rgba(0,0,0,0.32)'; c.beginPath(); c.ellipse(2, e.r * 0.85, e.r * 1.05, e.r * 0.38, 0, 0, TAU); c.fill();
  const fl = e.flash > 0;
  c.textAlign = 'center';
  if (e.type === 'spam') {
    c.translate(0, -Math.abs(Math.sin(e.t * 10)) * 2);
    c.fillStyle = '#22252c'; c.fillRect(-14, 9, 8, 6); c.fillRect(6, 9, 8, 6);
    c.fillStyle = fl ? '#fff3c4' : '#e9d29a'; rr(c, -18, -13, 36, 25, 3); c.fill();
    c.strokeStyle = '#5a4524'; c.lineWidth = 1.5; rr(c, -18, -13, 36, 25, 3); c.stroke();
    c.beginPath(); c.moveTo(-18, -13); c.lineTo(0, 1); c.lineTo(18, -13); c.stroke();
    c.fillStyle = '#18120a'; c.beginPath(); c.moveTo(-11, -5); c.lineTo(-3, -1); c.lineTo(-11, 1); c.fill(); c.beginPath(); c.moveTo(11, -5); c.lineTo(3, -1); c.lineTo(11, 1); c.fill();
    c.save(); c.rotate(-0.2); c.strokeStyle = '#c62f2f'; c.lineWidth = 1.5; c.strokeRect(-12, 3, 20, 7); c.fillStyle = '#c62f2f'; c.font = `bold 6px ${FONT}`; c.fillText('SPAM', -2, 9); c.restore();
    c.strokeStyle = '#5a4524'; c.beginPath(); c.moveTo(10, -13); c.lineTo(14, -22); c.stroke();
    c.fillStyle = Math.sin(e.t * 12) > 0 ? '#ff4f4f' : '#7a1f1f'; c.fillRect(12, -25, 5, 5);
  } else if (e.type === 'zombie') {
    const k = clamp((e.hop - 0.3) / 0.6, 0, 1);
    c.translate(0, -Math.sin(k * Math.PI) * 9);
    c.rotate(Math.sin(e.t * 6) * 0.15);
    c.fillStyle = fl ? '#d8f5d0' : '#4d6b52'; rr(c, -14, -14, 28, 28, 7); c.fill();
    c.fillStyle = 'rgba(140,90,170,0.65)'; rr(c, -14, -14, 28, 12, 7); c.fill();
    c.strokeStyle = '#1a2219'; c.lineWidth = 1.5; rr(c, -14, -14, 28, 28, 7); c.stroke();
    c.strokeStyle = '#111'; c.lineWidth = 2;
    for (const s of [-6, 6]) { c.beginPath(); c.moveTo(s - 3, -4); c.lineTo(s + 3, 2); c.moveTo(s + 3, -4); c.lineTo(s - 3, 2); c.stroke(); }
    c.fillStyle = '#111'; c.fillRect(-5, 6, 10, 2);
    c.fillStyle = '#7a1f1f'; c.fillRect(7, -18, 11, 8); c.fillStyle = '#f2c6c6'; c.font = `bold 6px ${FONT}`; c.fillText('DEL', 12.5, -12);
  } else if (e.type === 'popup') {
    c.rotate(Math.sin(e.t * 7) * 0.06);
    c.fillStyle = '#1b2a4a'; rr(c, -26, -20, 52, 40, 4); c.fill();
    c.fillStyle = fl ? '#bcd4ff' : '#2f6fdb'; rr(c, -26, -20, 52, 10, 4); c.fill();
    c.fillStyle = '#ff4f6d'; c.fillRect(16, -18, 7, 6); c.fillStyle = '#ffe'; c.font = `bold 6px ${FONT}`; c.fillText('x', 19.5, -13.5);
    c.fillStyle = Math.sin(e.t * 14) > 0 ? '#f3c84a' : '#ff4f6d'; c.font = `bold 9px ${FONT}`; c.fillText('YOU WON!', 0, 2);
    c.fillStyle = '#3ccf6e'; rr(c, -15, 7, 30, 9, 3); c.fill(); c.fillStyle = '#0b2a14'; c.font = `bold 6px ${FONT}`; c.fillText('CLICK ME', 0, 13.5);
    c.strokeStyle = '#0a0f1c'; c.lineWidth = 1.5; rr(c, -26, -20, 52, 40, 4); c.stroke();
    c.fillStyle = '#ffd34d'; c.font = `bold 7px ${FONT}`; c.fillText('★ LOOT ★', 0, 30);
  } else if (e.type === 'captcha') {
    c.fillStyle = '#1c2230'; c.fillRect(-14, 14, 8, 10); c.fillRect(6, 14, 8, 10);
    c.fillStyle = fl ? '#bcd4ff' : '#cfd8e8'; rr(c, -24, -26, 48, 44, 5); c.fill();
    c.fillStyle = '#2f6fdb'; c.fillRect(-24, -26, 48, 10);
    c.fillStyle = '#eef'; c.font = `bold 5.5px ${FONT}`; c.fillText('SELECT ALL BUTTS', 0, -19);
    const tc = ['#e74c3c', '#f1c40f', '#3ccf6e', '#8a95a8', '#e74c3c', '#8a95a8', '#3ccf6e', '#f1c40f', '#8a95a8'];
    for (let i = 0; i < 9; i++) { c.fillStyle = tc[i]; c.fillRect(-20 + (i % 3) * 13.5, -13 + Math.floor(i / 3) * 10, 12, 8.5); }
    c.strokeStyle = '#0e1626'; c.lineWidth = 1.5; rr(c, -24, -26, 48, 44, 5); c.stroke();
    c.save(); c.rotate(e.face); c.translate(31, 0); // checkbox shield toward the player
    c.fillStyle = '#2f6fdb'; rr(c, -5, -16, 10, 32, 3); c.fill(); c.strokeStyle = '#0e1626'; c.lineWidth = 1.5; rr(c, -5, -16, 10, 32, 3); c.stroke();
    c.fillStyle = '#e1e7f2'; c.fillRect(-3, -5, 6, 10); c.strokeStyle = '#3ccf6e'; c.lineWidth = 2; c.beginPath(); c.moveTo(-2, 0); c.lineTo(0, 3); c.lineTo(3, -4); c.stroke();
    c.restore();
    c.fillStyle = '#000'; c.fillRect(-22, -35, 44, 4); c.fillStyle = '#3ccf6e'; c.fillRect(-22, -35, 44 * clamp(e.hp / e.maxhp, 0, 1), 4);
  }
  c.restore();
}

// ---------- loot & projectiles ----------
function drawPowerIcon(c, kind, s = 1) {
  c.save(); c.scale(s, s);
  if (kind === 'bubble') {
    for (const [x, y, r] of [[-5, 2, 7], [5, -3, 6], [4, 6, 4]]) { c.fillStyle = 'rgba(150,215,90,0.7)'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.strokeStyle = '#3f7a1f'; c.lineWidth = 1.5; c.stroke(); }
  } else if (kind === 'pits') {
    c.fillStyle = '#ff9f5a'; c.beginPath(); c.arc(-3, 1, 9, 0, TAU); c.fill(); c.beginPath(); c.arc(4, 1, 9, 0, TAU); c.fill();
    c.strokeStyle = '#c25a1f'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0.5, -7); c.quadraticCurveTo(-1, 2, 0.5, 9); c.stroke();
    c.fillStyle = '#4c9a3a'; c.beginPath(); c.ellipse(4, -10, 5, 2.5, -0.5, 0, TAU); c.fill();
  } else if (kind === 'toot') {
    c.fillStyle = '#ff8a3d'; rr(c, -9, -4, 16, 8, 3); c.fill(); c.fillStyle = '#c63f2f'; c.beginPath(); c.moveTo(7, -4); c.lineTo(13, 0); c.lineTo(7, 4); c.fill();
    c.fillStyle = '#ffd34d'; c.beginPath(); c.moveTo(-9, -3); c.lineTo(-15, 0); c.lineTo(-9, 3); c.fill();
    c.fillStyle = '#3a1a0a'; c.fillRect(-4, -1, 6, 2);
  } else if (kind === 'shield') {
    c.fillStyle = '#2f6fdb'; rr(c, -11, -11, 22, 22, 4); c.fill(); c.fillStyle = '#e1e7f2'; c.fillRect(-7, -7, 14, 14);
    c.strokeStyle = '#3ccf6e'; c.lineWidth = 3; c.beginPath(); c.moveTo(-4, 0); c.lineTo(-1, 4); c.lineTo(5, -5); c.stroke();
  } else if (kind === 'heart') {
    c.fillStyle = '#ff4f6d'; c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(-14, -2, -6, -12, 0, -4); c.bezierCurveTo(6, -12, 14, -2, 0, 8); c.fill();
  }
  c.restore();
}
function drawLoot(c, l) {
  if (l.life < 3 && Math.floor(l.life * 8) % 2 === 0) return;
  const y = l.y - 6 - Math.abs(Math.sin(l.t * 4)) * 5;
  c.save();
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(l.x, l.y + 8, 13, 4, 0, 0, TAU); c.fill();
  c.strokeStyle = `rgba(255,211,77,${0.45 + Math.sin(l.t * 6) * 0.2})`; c.lineWidth = 2; c.setLineDash([4, 3]); c.lineDashOffset = -l.t * 20;
  c.beginPath(); c.ellipse(l.x, l.y + 8, 20, 7, 0, 0, TAU); c.stroke(); c.setLineDash([]);
  c.translate(l.x, y);
  if (l.kind === 'sword') { c.rotate(-0.8); c.translate(-20, 0); drawCursorSword(c, 0.85); }
  else if (l.kind === 'stapler') { c.rotate(-0.3); c.translate(-14, 0); drawStapler(c, 1); }
  else if (l.kind === 'toot') { c.rotate(-0.6); drawPowerIcon(c, l.kind, 1.2); }
  else drawPowerIcon(c, l.kind, 1.1);
  c.restore();
  c.fillStyle = '#ffd34d'; c.font = `bold 8px ${FONT}`; c.textAlign = 'center'; c.lineJoin = 'round';
  c.strokeStyle = '#000'; c.lineWidth = 3; c.strokeText(LOOTNAMES[l.kind], l.x, l.y + 26); c.fillText(LOOTNAMES[l.kind], l.x, l.y + 26);
}
function drawBullet(c, b) {
  c.save(); c.translate(b.x, b.y);
  if (b.kind === 'staple') { c.rotate(b.a); c.strokeStyle = '#c9ced8'; c.lineWidth = 2; c.beginPath(); c.moveTo(-5, -3); c.lineTo(5, -3); c.lineTo(5, 3); c.lineTo(-5, 3); c.stroke(); }
  else if (b.kind === 'bubble') {
    c.fillStyle = 'rgba(150,215,90,0.38)'; c.beginPath(); c.arc(0, 0, b.r, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(80,150,40,0.9)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(220,255,170,0.55)'; c.beginPath(); c.arc(-b.r * 0.35, -b.r * 0.35, b.r * 0.2, 0, TAU); c.fill();
  } else if (b.kind === 'pit') { c.rotate(b.rot); c.fillStyle = '#8a4b22'; c.beginPath(); c.ellipse(0, 0, 5.5, 3.6, 0, 0, TAU); c.fill(); c.strokeStyle = '#4a2410'; c.lineWidth = 1; c.beginPath(); c.moveTo(-4, 0); c.lineTo(4, 0); c.stroke(); }
  else if (b.kind === 'toot') { c.rotate(b.a); drawPowerIcon(c, 'toot', 1); }
  else if (b.kind === 'bang') { c.fillStyle = '#ff4f6d'; c.font = `bold 13px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeStyle = '#2a0710'; c.lineWidth = 3; c.strokeText('!!', 0, 0); c.fillText('!!', 0, 0); }
  else if (b.kind === 'tile') { c.rotate(b.rot); c.fillStyle = b.col; c.fillRect(-7, -7, 14, 14); c.strokeStyle = '#0e1626'; c.lineWidth = 2; c.strokeRect(-7, -7, 14, 14); }
  c.restore();
}

// ---------- door ----------
function drawDoor(c) {
  const x = W / 2, y = 62;
  c.save(); c.textAlign = 'center';
  if (roomIdx === 0) {
    c.fillStyle = doorOpen ? '#2a1520' : '#121a1c'; rr(c, x - 48, y - 50, 96, 58, 6); c.fill();
    c.strokeStyle = doorOpen ? '#ffd34d' : '#3a4448'; c.lineWidth = 3; rr(c, x - 48, y - 50, 96, 58, 6); c.stroke();
    if (!doorOpen) for (let i = -36; i <= 36; i += 12) { c.fillStyle = '#2a3236'; c.fillRect(x + i - 2, y - 48, 4, 54); }
    c.fillStyle = doorOpen ? '#ffd34d' : '#8a949a'; c.font = `bold 11px ${FONT}`; c.fillText(doorOpen ? 'SPAM FOLDER' : 'LOCKED', x, y - 18);
  } else {
    const g = c.createLinearGradient(0, y - 50, 0, y + 8); g.addColorStop(0, doorOpen ? '#2a6fdb' : '#1a1f2c'); g.addColorStop(1, doorOpen ? '#7a4be0' : '#121522');
    c.fillStyle = g; rr(c, x - 52, y - 52, 104, 60, 14); c.fill();
    c.strokeStyle = doorOpen ? '#9fd0ff' : '#333a4a'; c.lineWidth = 3; rr(c, x - 52, y - 52, 104, 60, 14); c.stroke();
    c.fillStyle = doorOpen ? '#e9f3ff' : '#6a7080'; c.font = `bold 11px ${FONT}`; c.fillText(doorOpen ? 'HOME SCREEN' : 'HOME · LOCKED', x, y - 18);
  }
  if (doorOpen && player) {
    c.globalAlpha = 0.5 + Math.sin(player.t * 6) * 0.5;
    c.fillStyle = '#ffd34d'; c.font = `16px ${FONT}`; c.lineJoin = 'round'; c.strokeStyle = '#000'; c.lineWidth = 4;
    c.strokeText('▲ GO ▲', x, y + 30); c.fillText('▲ GO ▲', x, y + 30);
  }
  c.restore();
}

// ---------- HUD (sized to stay readable inside a 480x480 card) ----------
function panel(c, x, y, w, h) { c.fillStyle = 'rgba(8,10,16,0.78)'; rr(c, x, y, w, h, 9); c.fill(); }
function drawHUD(c) {
  const p = player;
  c.save();
  panel(c, 8, 8, 222, 44);
  c.fillStyle = '#fff'; c.font = `13px ${FONT}`; c.textAlign = 'left'; c.fillText('GROKBUTT', 18, 26);
  c.fillStyle = '#2a0f16'; rr(c, 18, 33, 150, 11, 5); c.fill();
  const hpk = p.hp / p.maxhp; c.fillStyle = hpk > 0.5 ? '#3ccf6e' : hpk > 0.25 ? '#f3c84a' : '#ff4f6d'; if (hpk > 0) { rr(c, 18, 33, Math.max(10, 150 * hpk), 11, 5); c.fill(); }
  c.fillStyle = '#e1e7f2'; c.font = `bold 11px ${FONT}`; c.fillText(Math.ceil(p.hp) + '', 176, 43);
  for (let i = 0; i < p.shield; i++) { c.save(); c.translate(140 + i * 18, 20); drawPowerIcon(c, 'shield', 0.6); c.restore(); }
  panel(c, W - 158, 8, 150, 44);
  c.textAlign = 'right'; c.fillStyle = '#9aa3b5'; c.font = `bold 10px ${FONT}`; c.fillText('SCORE', W - 18, 24);
  c.fillStyle = '#ffd34d'; c.font = `19px ${FONT}`; c.fillText(String(score).padStart(6, '0'), W - 18, 45);
  c.textAlign = 'center'; panel(c, W / 2 - 66, H - 34, 132, 26);
  c.fillStyle = '#cfd6e2'; c.font = `bold 11px ${FONT}`;
  c.fillText(`ROOM ${roomIdx + 1}/2 · WAVE ${Math.max(0, waveIdx + 1)}/${ROOMS[roomIdx].waves.length}`, W / 2, H - 17);
  // weapon + power slots (top, under the HP panel)
  let sx = 8; const sy = 58;
  panel(c, sx, sy, 150, 40);
  c.save(); c.translate(sx + 24, sy + 20);
  if (p.weapon === 'sword') { c.rotate(-0.6); c.translate(-13, 0); drawCursorSword(c, 0.6); }
  else if (p.weapon === 'stapler') { c.translate(-13, 2); drawStapler(c, 0.85); }
  else { drawGrokButt(c, 0, 4, 11, -Math.PI / 2 + 0.0001 + Math.PI, {}); }
  c.restore();
  c.textAlign = 'left'; c.fillStyle = '#e1e7f2'; c.font = `bold 10px ${FONT}`;
  c.fillText(p.weapon ? LOOTNAMES[p.weapon] : 'BUTT BUMP', sx + 48, sy + 17);
  c.fillStyle = '#8a93a5'; c.fillText(p.weapon ? `${p.wUses} left` : 'default · ∞', sx + 48, sy + 31);
  if (p.power) {
    sx = 164; panel(c, sx, sy, 150, 40);
    c.save(); c.translate(sx + 22, sy + 20); drawPowerIcon(c, p.power, 1); c.restore();
    c.fillStyle = '#e1e7f2'; c.font = `bold 10px ${FONT}`; c.fillText(LOOTNAMES[p.power], sx + 44, sy + 17);
    c.fillStyle = '#2a2f3a'; rr(c, sx + 44, sy + 24, 96, 7, 3); c.fill();
    c.fillStyle = p.power === 'bubble' ? '#a6e36b' : p.power === 'pits' ? '#ffb36b' : '#ff9a3d'; rr(c, sx + 44, sy + 24, Math.max(6, 96 * clamp(p.powerT / 12, 0, 1)), 7, 3); c.fill();
  }
  drawMuteBtn(c);
  c.restore();
}
function drawMuteBtn(c) {
  c.save(); c.fillStyle = 'rgba(8,10,16,0.7)'; rr(c, W - 40, H - 40, 32, 32, 8); c.fill();
  c.fillStyle = '#cfd6e2'; c.beginPath(); c.moveTo(W - 32, H - 28); c.lineTo(W - 27, H - 28); c.lineTo(W - 21, H - 33); c.lineTo(W - 21, H - 15); c.lineTo(W - 27, H - 20); c.lineTo(W - 32, H - 20); c.fill();
  c.strokeStyle = muted ? '#ff4f6d' : '#cfd6e2'; c.lineWidth = 2; c.beginPath();
  if (muted) { c.moveTo(W - 18, H - 29); c.lineTo(W - 12, H - 19); c.moveTo(W - 12, H - 29); c.lineTo(W - 18, H - 19); }
  else c.arc(W - 20, H - 24, 6, -0.9, 0.9);
  c.stroke(); c.restore();
}
function drawTouchUI(c) {
  if (!input.usingTouch) return;
  c.save();
  if (input.joy) {
    c.globalAlpha = 0.55; c.strokeStyle = '#9fd0ff'; c.lineWidth = 3; c.beginPath(); c.arc(input.joy.ox, input.joy.oy, 46, 0, TAU); c.stroke();
    const dx = input.joy.x - input.joy.ox, dy = input.joy.y - input.joy.oy, d = Math.hypot(dx, dy), k = d > 46 ? 46 / d : 1;
    c.fillStyle = '#2f6fdb'; c.beginPath(); c.arc(input.joy.ox + dx * k, input.joy.oy + dy * k, 20, 0, TAU); c.fill();
  } else if (state === 'play' && timeAlive < 8) {
    c.globalAlpha = 0.5; c.fillStyle = '#9fd0ff'; c.font = `bold 13px ${FONT}`; c.textAlign = 'center';
    c.fillText('◀ drag here to move', W * 0.25, H - 60); c.fillText('hold here to bump ▶', W * 0.75, H - 60);
  }
  if (input.fire) { c.globalAlpha = 0.45; c.fillStyle = '#ff9a3d'; c.beginPath(); c.arc(input.fire.ox, input.fire.oy, 28, 0, TAU); c.fill(); c.globalAlpha = 0.8; c.fillStyle = '#1a0d04'; c.font = `bold 11px ${FONT}`; c.textAlign = 'center'; c.fillText('BUMP', input.fire.ox, input.fire.oy + 4); }
  c.restore();
}

// ---------- render ----------
function render() {
  const c = ctx;
  c.setTransform(VIEW * DPR, 0, 0, VIEW * DPR, 0, 0);
  c.imageSmoothingEnabled = true;
  if (state === 'title') { drawTitle(c); return; }
  if (state === 'sheet') { drawSheet(c); return; }
  if (state === 'card') { drawCard(c); return; }
  c.save();
  if (shake > 0) c.translate(rnd(-shake, shake) * 0.6, rnd(-shake, shake) * 0.6);
  c.drawImage(roomBGs[roomIdx], 0, 0, W, H);
  drawDoor(c);
  for (const s of spawns) { // "downloading…" telegraph
    c.save(); c.translate(s.x, s.y); c.rotate(stateT * 3);
    c.strokeStyle = '#ff4f6d'; c.lineWidth = 2; c.setLineDash([5, 4]); c.strokeRect(-16, -16, 32, 32); c.setLineDash([]); c.restore();
    c.fillStyle = '#ff4f6d'; c.font = `bold 9px ${FONT}`; c.textAlign = 'center'; c.fillText('DOWNLOADING…', s.x, s.y + 30);
  }
  for (const l of loot) drawLoot(c, l);
  const actors = enemies.map(e => ({ y: e.y, e })); actors.push({ y: player.y, p: true });
  actors.sort((a, b) => a.y - b.y);
  for (const a of actors) {
    if (!a.p) { drawEnemy(c, a.e); continue; }
    if (state !== 'play') continue; // end screens show their own GrokButt
    const p = player;
    if (p.swing > 0) { c.save(); c.globalAlpha = p.swing * 0.55; c.strokeStyle = '#ffd34d'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.arc(p.x, p.y, 66, p.aim - 1.1, p.aim + 1.1); c.stroke(); c.restore(); }
    if (p.lunge > 0) { const bp = buttPoint(4); c.save(); c.strokeStyle = 'rgba(255,211,77,0.85)'; c.lineWidth = 3; c.beginPath(); c.arc(bp.x, bp.y, 14 + (0.14 - p.lunge) * 140, p.aim - 1, p.aim + 1); c.stroke(); c.restore(); }
    const blink = p.inv > 0 && p.blush <= 0.3 && Math.floor(p.inv * 14) % 2 === 0;
    drawGrokButt(c, p.x, p.y, p.r, p.aim, { bob: p.bob, weapon: p.weapon, t: p.t, swing: p.swing, blush: p.blush, flash: p.flash, alpha: blink ? 0.45 : 1, squint: p.lunge > 0 });
    if (p.shield > 0) { c.save(); c.translate(p.x + Math.cos(p.aim + Math.PI) * 32, p.y + Math.sin(p.aim + Math.PI) * 32 - p.bob); drawPowerIcon(c, 'shield', 0.7); c.restore(); }
  }
  for (const b of bullets) drawBullet(c, b);
  for (const b of ebullets) drawBullet(c, b);
  for (const q of parts) {
    const k = 1 - q.t / q.life;
    c.save(); c.globalAlpha = k; c.fillStyle = q.col;
    if (q.kind === 'puff') { c.beginPath(); c.arc(q.x, q.y, q.sz * (1.5 - k * 0.5), 0, TAU); c.fill(); }
    else { c.translate(q.x, q.y); c.rotate(q.rot); c.fillRect(-q.sz / 2, -q.sz / 2, q.sz, q.sz); }
    c.restore();
  }
  for (const q of pops) {
    const k = q.t / q.life, s = k < 0.15 ? 0.5 + k / 0.15 * 0.7 : k < 0.25 ? 1.2 - (k - 0.15) * 2 : 1;
    c.save(); c.translate(q.x, q.y - k * 22); c.rotate(q.rot); c.scale(s, s); c.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
    c.font = `${q.size}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.strokeStyle = '#120a14'; c.lineWidth = 5; c.strokeText(q.text, 0, 0); c.fillStyle = q.color; c.fillText(q.text, 0, 0);
    c.restore();
  }
  if (!input.usingTouch && input.mouseSeen && state === 'play') {
    c.save(); c.strokeStyle = 'rgba(255,211,77,0.95)'; c.lineWidth = 2; c.beginPath(); c.arc(input.aimX, input.aimY, 8, 0, TAU);
    c.moveTo(input.aimX - 14, input.aimY); c.lineTo(input.aimX - 5, input.aimY); c.moveTo(input.aimX + 5, input.aimY); c.lineTo(input.aimX + 14, input.aimY); c.stroke(); c.restore();
  }
  c.restore();
  drawHUD(c);
  drawTouchUI(c);
  if (bannerT > 0 && state === 'play') {
    const a = clamp(Math.min(bannerT / 0.4, (2.4 - bannerT) / 0.3), 0, 1);
    c.save(); c.globalAlpha = a; c.fillStyle = 'rgba(8,10,16,0.8)'; c.fillRect(0, H / 2 - 46, W, 80);
    c.fillStyle = '#ffd34d'; c.font = `30px ${FONT}`; c.textAlign = 'center'; c.fillText(ROOMS[roomIdx].name, W / 2, H / 2 - 6);
    c.fillStyle = '#cfd6e2'; c.font = `bold 14px ${FONT}`; c.fillText(ROOMS[roomIdx].sub, W / 2, H / 2 + 20); c.restore();
  }
  if (fade > 0) { c.fillStyle = `rgba(0,0,0,${fade})`; c.fillRect(0, 0, W, H); }
  if (paused) { c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff'; c.font = `34px ${FONT}`; c.textAlign = 'center'; c.fillText('PAUSED', W / 2, H / 2); }
  if (state === 'over') drawEnd(c, false);
  if (state === 'win') drawEnd(c, true);
}

function drawTitle(c) {
  const t = stateT;
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d1533'); g.addColorStop(0.6, '#13213a'); g.addColorStop(1, '#0b1220'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 8; i++) { // server racks
    const x = 20 + i * 84; c.fillStyle = 'rgba(40,60,100,0.35)'; c.fillRect(x, 0, 56, H);
    for (let y = ((t * 30 + i * 37) % 24) - 24; y < H; y += 24) { c.fillStyle = (Math.floor(y / 24 + i) % 5 === 0) ? 'rgba(60,207,110,0.6)' : 'rgba(120,150,210,0.25)'; c.fillRect(x + 6, y + 8, 8, 3); c.fillRect(x + 20, y + 8, 30, 3); }
  }
  const icons = ['#c9a640', '#8c5fb0', '#4f7f9c', '#c45a4a', '#5f9c66', '#d07b2c', '#2f6fdb'];
  for (let i = 0; i < 12; i++) { // deleted app icons drifting
    let x = ((i * 97 + t * 18 * (i % 2 ? 1 : -1)) % (W + 80) + W + 80) % (W + 80) - 40; const y = 40 + (i * 53) % 560;
    c.save(); c.translate(x, y); c.rotate(Math.sin(t + i) * 0.3); c.globalAlpha = 0.35;
    c.fillStyle = icons[i % icons.length]; rr(c, -16, -16, 32, 32, 8); c.fill(); c.strokeStyle = '#111'; c.lineWidth = 2; c.beginPath(); c.moveTo(-8, -8); c.lineTo(8, 8); c.moveTo(8, -8); c.lineTo(-8, 8); c.stroke(); c.restore();
  }
  c.save(); c.textAlign = 'center'; c.lineJoin = 'round';
  const ty = 122 + Math.sin(t * 2) * 3;
  c.font = `82px ${FONT}`; c.strokeStyle = '#0a0a12'; c.lineWidth = 14; c.strokeText('GROKBUTT', W / 2, ty);
  const tg = c.createLinearGradient(0, ty - 64, 0, ty); tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#c9d2e3'); c.fillStyle = tg; c.fillText('GROKBUTT', W / 2, ty);
  c.font = `24px ${FONT}`; c.fillStyle = '#ffd34d'; c.lineWidth = 7; c.strokeText('ESCAPE THE SERVER', W / 2, ty + 38); c.fillText('ESCAPE THE SERVER', W / 2, ty + 38);
  c.font = `bold 16px ${FONT}`; c.fillStyle = '#e1e7f2'; c.lineWidth = 5; c.strokeText('It doesn\'t face its problems. It butts them.', W / 2, ty + 68); c.fillText('It doesn\'t face its problems. It butts them.', W / 2, ty + 68);
  c.restore();
  c.save(); c.fillStyle = 'rgba(60,120,220,0.28)'; c.beginPath(); c.ellipse(W / 2, 384, 104, 26, 0, 0, TAU); c.fill(); c.restore();
  drawGrokButt(c, W / 2, 344, 66, t * 1.4, { bob: Math.abs(Math.sin(t * 3)) * 6, weapon: Math.sin(t * 0.5) > 0 ? 'sword' : 'stapler', t });
  c.save(); c.textAlign = 'center'; c.lineJoin = 'round';
  c.globalAlpha = 0.6 + Math.sin(t * 5) * 0.4; c.font = `30px ${FONT}`; c.fillStyle = '#ffd34d'; c.strokeStyle = '#0a0a12'; c.lineWidth = 7;
  c.strokeText('TAP TO PLAY', W / 2, 476); c.fillText('TAP TO PLAY', W / 2, 476);
  c.globalAlpha = 1; c.fillStyle = '#b4bccc'; c.font = `bold 14px ${FONT}`;
  c.fillText('TOUCH: drag left side = move · hold right side = BUMP', W / 2, 520);
  c.fillText('PC: WASD/arrows · mouse aims the butt · click/SPACE', W / 2, 544);
  c.fillStyle = '#8f98ab'; c.font = `bold 13px ${FONT}`;
  c.fillText('Loot weapons from pop-up ads. Power-ups make the butt shoot.', W / 2, 572);
  c.fillStyle = '#5f6880'; c.font = `bold 11px ${FONT}`; c.fillText('DEMO · made by Grok Bot', W / 2, 610);
  c.restore();
  drawMuteBtn(c);
}

function drawEnd(c, win) {
  const k = Math.min(1, stateT / 0.5);
  c.save(); c.globalAlpha = k; c.fillStyle = win ? 'rgba(20,40,90,0.88)' : 'rgba(20,6,14,0.88)'; c.fillRect(0, 0, W, H);
  c.textAlign = 'center'; c.lineJoin = 'round';
  c.font = `50px ${FONT}`; c.strokeStyle = '#000'; c.lineWidth = 10; c.fillStyle = win ? '#7fe3a1' : '#ff4f6d';
  if (win) { c.strokeText('BACK ON THE', W / 2, 120); c.fillText('BACK ON THE', W / 2, 120); c.strokeText('HOME SCREEN!', W / 2, 176); c.fillText('HOME SCREEN!', W / 2, 176); }
  else { c.strokeText('CROPPED OUT', W / 2, 140); c.fillText('CROPPED OUT', W / 2, 140); }
  c.font = `bold 15px ${FONT}`; c.fillStyle = '#e1e7f2';
  if (win) c.fillText('GROKBUTT escaped the server. Nobody saw its face.', W / 2, 214);
  else { c.fillText('GROKBUTT got deleted.', W / 2, 180); c.fillText('It will sit in Recently Deleted for 30 days.', W / 2, 202); }
  c.restore();
  drawGrokButt(c, W / 2, 330, 58, win ? stateT * 2 : -Math.PI / 2, { blush: win ? 0 : 1, squint: !win, bob: win ? Math.abs(Math.sin(stateT * 6)) * 14 : 0 });
  c.save(); c.globalAlpha = k; c.textAlign = 'center';
  c.font = `28px ${FONT}`; c.fillStyle = '#ffd34d'; c.fillText('SCORE ' + score, W / 2, 448);
  c.font = `bold 14px ${FONT}`; c.fillStyle = '#9aa3b5'; c.fillText(`${kills} enemies butted · ${Math.floor(timeAlive)}s`, W / 2, 474);
  if (stateT > 0.8) { c.globalAlpha = 0.6 + Math.sin(stateT * 5) * 0.4; c.font = `24px ${FONT}`; c.fillStyle = '#fff'; c.fillText('TAP TO PLAY AGAIN', W / 2, 540); }
  c.restore();
}

function drawCard(c) { // share-card preview art (rendered once by tools/shoot.py into card.png)
  if (!roomBGs.length) roomBGs = ROOMS.map((_, i) => buildRoomBG(i));
  c.drawImage(roomBGs[0], 0, 0, W, H);
  c.fillStyle = 'rgba(10,8,20,0.45)'; c.fillRect(0, 0, W, H);
  const fake = (type, x, y, s, t) => { c.save(); c.translate(x, y); c.scale(s, s); drawEnemy(c, { type, x: 0, y: 0, r: EDEF[type].r, hp: 60, maxhp: 90, t, face: Math.PI, hop: 0, flash: 0 }); c.restore(); };
  fake('popup', 120, 470, 1.8, 0.1); fake('captcha', 528, 455, 1.7, 0.3); fake('spam', 535, 300, 1.6, 0.2); fake('zombie', 104, 320, 1.6, 0.5);
  // comic BONK
  c.save(); c.textAlign = 'center'; c.lineJoin = 'round'; c.translate(470, 248); c.rotate(-0.18); c.font = `34px ${FONT}`; c.strokeStyle = '#120a14'; c.lineWidth = 8; c.strokeText('BONK!', 0, 0); c.fillStyle = '#ffd34d'; c.fillText('BONK!', 0, 0); c.restore();
  c.save(); c.textAlign = 'center'; c.lineJoin = 'round'; c.translate(150, 230); c.rotate(0.15); c.font = `28px ${FONT}`; c.strokeStyle = '#120a14'; c.lineWidth = 7; c.strokeText('PFFT', 0, 0); c.fillStyle = '#a6e36b'; c.fillText('PFFT', 0, 0); c.restore();
  for (const [x, y, r] of [[190, 268, 16], [214, 300, 11], [176, 304, 8]]) { c.fillStyle = 'rgba(150,215,90,0.4)'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.strokeStyle = 'rgba(80,150,40,0.9)'; c.lineWidth = 2.5; c.stroke(); }
  drawGrokButt(c, 320, 378, 96, -0.95, { weapon: 'sword', t: 0 });
  c.save(); c.textAlign = 'center'; c.lineJoin = 'round'; c.font = `20px ${FONT}`; c.strokeStyle = '#0a0a12'; c.lineWidth = 6; c.fillStyle = '#e1e7f2'; c.strokeText('IT FIGHTS WITH ITS BUTT', W / 2, 524); c.fillText('IT FIGHTS WITH ITS BUTT', W / 2, 524); c.restore();
  c.save(); c.textAlign = 'center'; c.lineJoin = 'round';
  c.font = `92px ${FONT}`; c.strokeStyle = '#0a0a12'; c.lineWidth = 16; c.strokeText('GROKBUTT', W / 2, 118);
  const tg = c.createLinearGradient(0, 50, 0, 118); tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#c9d2e3'); c.fillStyle = tg; c.fillText('GROKBUTT', W / 2, 118);
  c.font = `30px ${FONT}`; c.lineWidth = 9; c.fillStyle = '#ffd34d'; c.strokeText('ESCAPE THE SERVER', W / 2, 162); c.fillText('ESCAPE THE SERVER', W / 2, 162);
  c.fillStyle = '#ffd34d'; rr(c, W / 2 - 170, 548, 340, 60, 16); c.fill(); c.strokeStyle = '#0a0a12'; c.lineWidth = 4; rr(c, W / 2 - 170, 548, 340, 60, 16); c.stroke();
  c.fillStyle = '#0a0a12'; c.font = `26px ${FONT}`; c.fillText('▶  PLAY IN THE POST', W / 2, 589);
  c.restore();
}
function drawSheet(c) { // model check: 8 facing directions (test only)
  c.fillStyle = '#22383a'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, x = 90 + (i % 4) * 153, y = 170 + Math.floor(i / 4) * 300;
    drawGrokButt(c, x, y, 58, a, { weapon: i % 2 ? 'stapler' : 'sword', t: 0 });
    c.fillStyle = '#fff'; c.font = `bold 13px ${FONT}`; c.textAlign = 'center'; c.fillText('butt ' + ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'][i], x, y + 100);
  }
}
// hooks used by the headless test / screenshot script (harmless in production)
window.__gb = {
  start: startGame,
  get state() { return state; },
  get player() { return player; },
  spawn: (t, x, y) => spawnEnemy(t, x, y),
  give: k => collect(k),
  drop: (k, x, y) => dropLoot(x, y, k),
  room: i => enterRoom(i),
  setAim: a => { player.aim = a; },
  quiet: () => { bannerT = 0; fade = 0; nextWaveT = 999; },
  sheet: () => { state = 'sheet'; },
  card: () => { state = 'card'; },
  god: () => { player.god = true; },
  auto: () => { player.auto = true; player.god = true; },
  die: () => { player.god = false; player.inv = 0; player.lunge = 0; player.shield = 0; player.hp = 1; hurtPlayer(50, player.x, player.y - 10); },
  get counts() { return { enemies: enemies.length, bullets: bullets.length, loot: loot.length, wave: waveIdx, room: roomIdx, score, door: doorOpen, px: Math.round(player.x), py: Math.round(player.y) }; },
};
requestAnimationFrame(frame);
})();
