// GROKBUTT SLAP extras: WEAR, TOOL, SNAP, CHALLENGE, secret 69, WEATHER, MUSIC, VOICE.
import * as THREE from 'three';
import { Music } from './sfx.js';

const $ = id => document.getElementById(id);
const ls = (k, d) => { const v = localStorage.getItem(k); return v === null ? d : v; };
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0, ...o });
const SITE = 'https://krog4206941.github.io/grokbutt-game/slap/';

export const WEARS = ['none', 'cap', 'shades', 'crown', 'party', 'pumpkin'];
const WEAR_LABEL = { none: 'NONE', cap: 'CAP', shades: 'SHADES', crown: 'CROWN', party: 'PARTY HAT', pumpkin: 'PUMPKIN' };
export const TOOLS = ['hand', 'slipper', 'fish', 'pillow', 'giant'];
const TOOL_LABEL = { hand: 'HAND', slipper: 'TSINELAS', fish: 'FISH', pillow: 'PILLOW', giant: 'GIANT HAND' };
const TOOL_MUL = { hand: 1, slipper: 1.1, fish: 1, pillow: 0.5, giant: 1.9 };

export function initExtras(G) {
  const { scene, mesh, rest, disp, N, sfx, S, U } = G;
  const X = {};
  // ---------- WEAR ----------
  const near = (d) => { d = d.clone().normalize(); let bi = 0, bd = -9; for (let i = 0; i < N; i++) { const x = rest[i*3], y = rest[i*3+1], z = rest[i*3+2], l = Math.hypot(x, y, z) || 1, dd = (x*d.x + y*d.y + z*d.z) / l; if (dd > bd) { bd = dd; bi = i; } } return bi; };
  const top = near(new THREE.Vector3(0, 1, 0)), front = near(new THREE.Vector3(0, 0.14, 1));
  const R = Math.hypot(rest[top*3], rest[top*3+1], rest[top*3+2]);
  const ribbed = (g, k, a) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), s = 1 + a * Math.cos(k * Math.atan2(z, x)); p.setXYZ(i, x * s, p.getY(i), z * s); } g.computeVertexNormals(); return g; };
  function build(kind) {
    const g = new THREE.Group(); g.userData.anchor = top; g.userData.center = false;
    if (kind === 'cap') {
      const m = std(0x2f6464), dome = new THREE.Mesh(new THREE.SphereGeometry(0.56, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), m); dome.position.y = -0.16; dome.scale.y = 0.8;
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.035, 24), m); brim.position.set(0, -0.16, 0.42); brim.scale.z = 1.05; brim.rotation.x = 0.22;
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 6), std(0xd8b25a)); btn.position.y = 0.29;
      g.add(dome, brim, btn); g.rotation.x = -0.12;
    } else if (kind === 'crown') {
      const m = std(0xc99a3a, { metalness: 0.75, roughness: 0.3 }), band = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.37, 0.2, 24, 1, true), m); band.material.side = THREE.DoubleSide; band.position.y = 0.0;
      g.add(band);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, c = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.2, 8), m); c.position.set(Math.sin(a) * 0.35, 0.19, Math.cos(a) * 0.35); g.add(c);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), m); tip.position.set(Math.sin(a) * 0.35, 0.3, Math.cos(a) * 0.35); g.add(tip); }
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), std(0x2f7a7a, { metalness: 0.3, roughness: 0.15 })); gem.position.set(0, 0.01, 0.37); g.add(gem);
      g.rotation.z = 0.08;
    } else if (kind === 'party') {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.72, 24), std(0x3c6f86)); cone.position.y = 0.3;
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 24), std(0xd8b25a)); band.rotation.x = Math.PI / 2; band.position.y = 0.17;
      const pom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 1), std(0xd8a84a)); pom.position.y = 0.7;
      g.add(cone, band, pom); g.rotation.z = -0.22;
    } else if (kind === 'shades') {
      g.userData.anchor = front; const glass = std(0x0e1216, { roughness: 0.12, metalness: 0.4 }), frame = std(0x1c1c20, { roughness: 0.4 });
      g.userData.lens = [];
      for (const s of [-1, 1]) { const L = new THREE.Group(); L.position.set(s * 0.3 * R, 0.0, -0.035);
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.035, 28), glass); lens.rotation.x = Math.PI / 2; lens.scale.set(1.05, 1, 1.5);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 6, 28), frame); rim.scale.set(1.05, 1.5, 1);
        L.add(lens, rim); L.rotation.y = s * 0.3; g.add(L); g.userData.lens.push(L); }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.03), frame); bridge.position.set(0, 0.1, 0.0); g.add(bridge);
      for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.5), frame); arm.position.set(s * 0.53 * R, 0.1, -0.3); arm.rotation.y = s * -0.5; g.add(arm); }
      g.position.z = 0.02;
    } else if (kind === 'pumpkin') {
      g.userData.anchor = front; g.userData.center = true;
      const m = std(0xb8642a, { roughness: 0.6 }), r = 1.05;
      const cap = new THREE.Mesh(ribbed(new THREE.SphereGeometry(r, 32, 10, 0, Math.PI * 2, 0, 0.35 * Math.PI), 8, 0.035), m);
      const low = new THREE.Mesh(ribbed(new THREE.SphereGeometry(r, 32, 8, 0, Math.PI, 0.565 * Math.PI, 0.24 * Math.PI), 8, 0.035), m);
      m.side = THREE.DoubleSide;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.22, 8), std(0x4e5a2e)); stem.position.y = r + 0.06; stem.rotation.z = 0.2;
      g.add(cap, low, stem);
      // carved grin: dark wedges on the lower band
      const dark = new THREE.MeshBasicMaterial({ color: 0x1a0d05 });
      for (let k = -2; k <= 2; k++) { const a = k * 0.2, w = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 3), dark); const y = -0.42 - Math.abs(k) * -0.03;
        const zr = Math.sqrt(Math.max(0, r * r - y * y - (Math.sin(a) * 0.9) ** 2)); w.position.set(Math.sin(a) * 0.9, y, zr + 0.01); w.rotation.set(Math.PI / 2, 0, 0); w.rotation.z = Math.PI; g.add(w); }
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  const cache = {}; let wear = WEARS.includes(ls('gb_wear', 'none')) ? ls('gb_wear', 'none') : 'none', worn = null;
  const v = new THREE.Vector3();
  function setWear(k) { if (worn) mesh.remove(worn); wear = k; localStorage.setItem('gb_wear', k); worn = null;
    if (k !== 'none') { worn = cache[k] || (cache[k] = build(k)); worn.scale.setScalar(k === 'pumpkin' ? R : 1); mesh.add(worn); }
    $('wear').textContent = '🎩 WEAR: ' + WEAR_LABEL[k]; }
  X.setWear = setWear; X.wear = () => wear;
  const LENS = { shocked: [0, 0, 0.07], squint: [0.15, -0.15, -0.01], angry: [-0.25, 0.25, -0.02], happy: [0, 0, 0.035], wince: [0.2, 0, 0], sleepy: [0, 0, -0.07], asleep: [0, 0, -0.08], teary: [-0.08, 0.08, 0.02], strain: [0.12, -0.12, 0], nervous: [0, 0, 0] };
  const lensS = [0, 0, 0];
  function updWear(dt) {
    if (!worn) return; const a = worn.userData.anchor;
    if (worn.userData.center) worn.position.set(disp[a*3], disp[a*3+1], disp[a*3+2]);
    else worn.position.set(rest[a*3] + disp[a*3], rest[a*3+1] + disp[a*3+1], rest[a*3+2] + disp[a*3+2]);
    if (worn.userData.lens) { const e = G.exprName(), T = LENS[e] || [0, 0, 0]; let w = 0;
      if (e === 'dizzy') w = Math.sin(S.t * 7) * 0.22; if (e === 'nervous') w = Math.sin(S.t * 40) * 0.03;
      for (let k = 0; k < 3; k++) lensS[k] += (T[k] - lensS[k]) * Math.min(1, dt * 10);
      worn.userData.lens[0].rotation.z = lensS[0] + w; worn.userData.lens[1].rotation.z = lensS[1] - w; worn.position.y += lensS[2]; }
  }
  // ---------- TOOL ----------
  function handGeo(m) { const g = new THREE.Group(); const palm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.46, 0.12), m); palm.position.set(0, 0, 0.06); g.add(palm);
    for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 3, 8), m); f.position.set(-0.15 + k * 0.1, 0.38 - Math.abs(k - 1.5) * 0.03, 0.06); g.add(f); }
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.16, 3, 8), m); th.position.set(0.27, 0.0, 0.07); th.rotation.z = -0.9; g.add(th);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.16, 16), std(0x8a6a30)); cuff.position.set(0, -0.32, 0.06); g.add(cuff); return g; }
  function buildTool(k) {
    let g;
    if (k === 'hand' || k === 'giant') { g = handGeo(std(0xd8b25a, { roughness: 0.45 })); if (k === 'giant') g.scale.setScalar(2.4); }
    else if (k === 'slipper') { g = new THREE.Group(); const sole = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 12), std(0x2f5f7a)); sole.scale.z = 0.22; sole.position.z = 0.04;
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 6, 16, Math.PI), std(0x3e7a5a)); strap.position.set(0, 0.2, 0.06); strap.rotation.set(0, Math.PI / 2, 0); strap.rotation.x = Math.PI / 2; g.add(sole, strap); }
    else if (k === 'fish') { g = new THREE.Group(); const m = std(0x6a8a8c, { roughness: 0.2, metalness: 0.2 }); const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 12), m); body.scale.set(0.42, 1, 0.24); body.position.z = 0.12;
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 4), m); tail.position.set(0, -0.6, 0.12); tail.scale.z = 0.3; tail.rotation.z = Math.PI;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0x101010 })); eye.position.set(0.1, 0.32, 0.22); g.add(body, tail, eye); }
    else { g = new THREE.Group(); const geo = new THREE.BoxGeometry(0.9, 0.6, 0.24, 8, 6, 2); const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 0.45, y = p.getY(i) / 0.3; p.setZ(i, p.getZ(i) * (1 - 0.6 * Math.max(x * x, y * y) ** 2)); } geo.computeVertexNormals();
      const pl = new THREE.Mesh(geo, std(0x56677a, { roughness: 0.9 })); pl.position.z = 0.12; g.add(pl); }
    g.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.castShadow = true; } });
    const root = new THREE.Group(); root.add(g); root.visible = false; scene.add(root); return root;
  }
  let tool = TOOLS.includes(ls('gb_tool', 'hand')) ? ls('gb_tool', 'hand') : 'hand'; const tcache = {}; const swings = [];
  function setTool(k) { tool = k; localStorage.setItem('gb_tool', k); $('tool').textContent = '✋ TOOL: ' + TOOL_LABEL[k]; }
  X.setTool = setTool; X.tool = () => tool; X.toolMul = () => TOOL_MUL[tool];
  const nq = new THREE.Quaternion(), zA = new THREE.Vector3(0, 0, 1);
  function swing(p, n) {
    const t = tcache[tool] || (tcache[tool] = buildTool(tool));
    const w = mesh.localToWorld(p.clone()), nw = n.clone().transformDirection(mesh.matrixWorld);
    t.userData = { w, nw, t0: S.t, q: new THREE.Quaternion().setFromUnitVectors(zA, nw) }; t.visible = true;
    if (!swings.includes(t)) swings.push(t); updSwing(t, 0);
  }
  const SW = 0.4;
  function updSwing(t) { const u = t.userData, a = (S.t - u.t0) / SW; if (a >= 1) { t.visible = false; return false; }
    const hitA = 0.22, s = a < hitA ? 1 - a / hitA : (a - hitA) / (1 - hitA) * 0.6; // in, then back out
    t.position.copy(u.w).addScaledVector(u.nw, 0.02 + s * 0.9);
    t.quaternion.copy(u.q); t.rotateX(-s * 1.1); t.translateY(-0.15);
    const op = a < 0.6 ? 1 : 1 - (a - 0.6) / 0.4; t.traverse(o => { if (o.isMesh) o.material.opacity = op; }); return true; }
  // ---------- VOICE ----------
  let voiceOn = ls('gb_voice', '1') === '1', lastVoice = -9;
  function setVoice(on) { voiceOn = on; localStorage.setItem('gb_voice', on ? '1' : '0'); $('voice').textContent = '🗣 VOICE: ' + (on ? 'ON' : 'OFF'); }
  X.setVoice = setVoice; X.voice = () => voiceOn; X.voiceCount = 0;
  // ---------- secret 69 ----------
  let niceT = 0; const confetti = []; X.niceCount = 0;
  const cMat = new THREE.MeshStandardMaterial({ color: 0xd8b25a, metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
  const cGeo = new THREE.PlaneGeometry(0.05, 0.08);
  function nice() { X.niceCount++; niceT = 3.2; sfx.play('jingle', {}); G.showCombo('NICE.');
    const c = mesh.localToWorld(new THREE.Vector3(0, 1.0, 0));
    for (let i = 0; i < 70; i++) { const m = new THREE.Mesh(cGeo, cMat.clone()); m.position.copy(c); const a = Math.random() * Math.PI * 2, sp = 0.8 + Math.random() * 1.4;
      m.userData = { v: new THREE.Vector3(Math.cos(a) * sp * 0.7, 1.6 + Math.random() * 1.6, Math.sin(a) * sp * 0.5), r: new THREE.Vector3(Math.random() * 6, Math.random() * 6, 0), life: 2.4 + Math.random() };
      m.rotation.set(Math.random() * 6, Math.random() * 6, 0); scene.add(m); confetti.push(m); } }
  X.nice = nice;
  function updNice(dt) { niceT = Math.max(0, niceT - dt); const tgt = niceT > 0.4 ? 1 : 0; U.uHeart.value += (tgt - U.uHeart.value) * Math.min(1, dt * 7);
    for (let i = confetti.length - 1; i >= 0; i--) { const m = confetti[i], d = m.userData; d.life -= dt; d.v.y -= 2.2 * dt; d.v.multiplyScalar(1 - 1.6 * dt);
      m.position.addScaledVector(d.v, dt); m.rotation.x += d.r.x * dt; m.rotation.y += d.r.y * dt; if (m.position.y < 0.02) { m.position.y = 0.02; d.v.set(0, 0, 0); }
      m.material.opacity = Math.min(0.9, d.life); if (d.life <= 0) { scene.remove(m); m.material.dispose(); confetti.splice(i, 1); } } }
  // ---------- CHALLENGE ----------
  const day = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const target = () => { let h = 2166136261; for (const c of day()) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return 80 + (h % 71); };
  let ch = null; X.target = target;
  const bestKey = () => 'gb_ch_' + day();
  function chalIdle() { const b = +ls(bestKey(), 0); $('chal').textContent = 'TODAY: ' + target() + ' slaps in 30s' + (b ? ' · best ' + b : ''); }
  function startChal() { ch = { t0: S.t, s0: S.slaps, last: 30 }; G.showCombo('GO!'); sfx.play('tick', { f: 1320 }); }
  X.startChal = startChal; X.chal = () => ch; X.chalResult = null;
  function updChal() { if (!ch) return; const left = 30 - (S.t - ch.t0), n = S.slaps - ch.s0, T = target();
    $('chal').textContent = '⏱ ' + Math.max(0, left).toFixed(1) + 's · ' + n + ' / ' + T;
    const sec = Math.ceil(left); if (sec < ch.last && sec <= 5 && sec > 0) sfx.play('tick', { f: 880 }); ch.last = sec;
    if (left <= 0) { const ok = n >= T, b = Math.max(+ls(bestKey(), 0), n); localStorage.setItem(bestKey(), b);
      X.chalResult = { ok, n, T, best: b }; G.showCombo(ok ? 'CLEAR! ' + n + '/' + T : 'SO CLOSE ' + n + '/' + T, 3); sfx.play(ok ? 'jingle' : 'boing', {}); ch = null; chalIdle(); } }
  // ---------- WEATHER ----------
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const WX = { // count, box [x0,x1,y0,y1,z0,z1], velocity, color, size, opacity, additive
    pond: [500, [-9, 9, 0, 8, -12, 2], [0.4, -7, 0], 0x9fb6c6, 0.06, 0.5, false],
    bedroom: [70, [-4.58, -2.92, 2.62, 4.0, -6.43, -6.41], [0.05, -0.35, 0], 0xd5dbe2, 0.07, 0.9, false],
    station: [10, [-4, 4, 1, 6, -34, -30], [-1.1, -0.45, 0], 0xd8c08a, 0.35, 0.8, true],
    beach: [260, [-9, 9, 0.03, 1.1, -6, 2], [2.8, 0.05, 0], 0xc8a878, 0.035, 0.55, false],
  };
  const wcache = {}; let wxOn = ls('gb_weather', '0') === '1', wxCur = null;
  function wxBuild(id) { const [n, b] = WX[id]; const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i*3] = b[0] + Math.random() * (b[1] - b[0]); pos[i*3+1] = b[2] + Math.random() * (b[3] - b[2]); pos[i*3+2] = b[4] + Math.random() * (b[5] - b[4]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const w = WX[id]; const m = new THREE.PointsMaterial({ color: w[3], size: w[4], map: dotTex, transparent: true, opacity: w[5], depthWrite: false, fog: false, blending: w[6] ? THREE.AdditiveBlending : THREE.NormalBlending });
    const p = new THREE.Points(g, m); p.frustumCulled = false; p.userData.id = id; return p; }
  function wxSync() { const id = G.placeId(); const want = wxOn && WX[id] ? id : null;
    if (wxCur && wxCur.userData.id !== want) { scene.remove(wxCur); wxCur = null; }
    if (want && !wxCur) { wxCur = wcache[want] || (wcache[want] = wxBuild(want)); scene.add(wxCur); } }
  function setWeather(on) { wxOn = on; localStorage.setItem('gb_weather', on ? '1' : '0'); $('weather').textContent = '☁ WEATHER: ' + (on ? 'ON' : 'OFF'); wxSync(); }
  X.setWeather = setWeather; X.weather = () => wxCur && wxCur.userData.id;
  function updWx(dt) { wxSync(); if (!wxCur) return; const id = wxCur.userData.id, [n, b, v] = WX[id], a = wxCur.geometry.attributes.position.array;
    for (let i = 0; i < n; i++) { let x = a[i*3] + v[0] * dt, y = a[i*3+1] + v[1] * dt;
      if (id === 'bedroom') x += Math.sin(S.t * 1.3 + i) * 0.1 * dt;
      if (id === 'beach') y += Math.sin(S.t * 3 + i * 1.7) * 0.25 * dt;
      if (y < b[2] || x < b[0] || x > b[1]) { if (v[0] > 0.5) { x = b[0]; y = b[2] + Math.random() * (b[3] - b[2]); } else if (v[0] < -0.5) { x = b[1] - Math.random() * 2; y = b[3]; } else { y = b[3]; x = b[0] + Math.random() * (b[1] - b[0]); } }
      a[i*3] = x; a[i*3+1] = y; }
    wxCur.geometry.attributes.position.needsUpdate = true; }
  // ---------- MUSIC ----------
  const music = new Music(sfx); X.music = music;
  function setMusic(on) { if (on) { sfx.unlock(); music.start(); } else music.stop(); $('music').textContent = '♪ MUSIC: ' + (on && music.on ? 'ON' : 'OFF'); }
  X.setMusic = setMusic;
  // ---------- SNAP ----------
  function snap() {
    G.render(); const src = G.renderer.domElement, w = src.width, h = src.height, bar = Math.round(h * 0.12);
    const c = document.createElement('canvas'); c.width = w; c.height = h + bar; const x = c.getContext('2d');
    x.drawImage(src, 0, 0); x.fillStyle = '#0e0f12'; x.fillRect(0, h, w, bar); x.fillStyle = '#d8b25a'; x.fillRect(0, h, w, Math.max(2, bar * 0.03));
    x.font = 'bold ' + Math.round(bar * 0.36) + 'px "Courier New", monospace'; x.textBaseline = 'middle'; x.fillStyle = '#d8b25a';
    x.fillText('I slapped GROKBUTT ' + S.slaps + ' times 🍑', bar * 0.35, h + bar * 0.42);
    x.font = Math.round(bar * 0.2) + 'px "Courier New", monospace'; x.fillStyle = '#9c8a62';
    x.fillText('Made by Krog & Grok Bot · @grokbutt69 · krog4206941.github.io/grokbutt-game/slap', bar * 0.35, h + bar * 0.8);
    const url = c.toDataURL('image/png'); X.lastSnap = url;
    const text = 'I slapped GROKBUTT ' + S.slaps + ' times 🍑 ' + SITE;
    $('snapimg').src = url; const dl = $('snapdl'); dl.href = url; dl.download = 'grokbutt-slap-' + S.slaps + '.png';
    $('snapx').href = 'https://x.com/intent/post?text=' + encodeURIComponent(text); $('share').style.display = 'flex';
    if (!G.test) dl.click(); sfx.play('tick', { f: 1500 }); return url;
  }
  X.snap = snap;
  // ---------- hooks ----------
  X.onSlap = (p, n, str, hard) => {
    swing(p, n);
    if (tool !== 'hand') sfx.play(tool === 'slipper' ? 'pak' : tool === 'fish' ? 'fish' : tool === 'pillow' ? 'fwump' : 'giant', { str: Math.min(1, str), pitch: 0.9 + Math.random() * 0.2 });
    const big = hard || tool === 'giant';
    if (voiceOn && S.t - lastVoice > 0.35 && (big || Math.random() < 1 / 3)) { lastVoice = S.t; X.voiceCount++;
      sfx.play('voice', { kind: big ? 2 : (Math.random() < 0.5 ? 0 : 1), pitch: 0.9 + Math.random() * 0.25 }); }
    if (S.slaps === 69 || S.slaps === 690) nice();
  };
  X.update = (dt) => { updWear(dt); for (let i = swings.length - 1; i >= 0; i--) if (!updSwing(swings[i])) swings.splice(i, 1); updNice(dt); updChal(); updWx(dt); };
  // ---------- buttons ----------
  const cyc = (arr, cur) => arr[(arr.indexOf(cur) + 1) % arr.length];
  $('wear').onclick = () => { sfx.play('boing', { str: 0.5 }); setWear(cyc(WEARS, wear)); };
  $('tool').onclick = () => { sfx.play('whoosh', {}); setTool(cyc(TOOLS, tool)); };
  $('voice').onclick = () => setVoice(!voiceOn);
  $('weather').onclick = () => setWeather(!wxOn);
  $('music').onclick = () => setMusic(!music.on);
  $('snap').onclick = () => snap();
  $('chalb').onclick = () => { if (!ch) startChal(); };
  $('snapclose').onclick = () => { $('share').style.display = 'none'; };
  setWear(wear); setTool(tool); setVoice(voiceOn); setWeather(wxOn); setMusic(false); chalIdle();
  return X;
}
