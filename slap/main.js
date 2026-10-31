import * as THREE from 'three';
import { GLTFLoader } from './assets/three/GLTFLoader.js';
import { RoomEnvironment } from './assets/three/RoomEnvironment.js';
import { Sfx, renderLog } from './sfx.js?v=1793434824';
import { PLACES, getPlace } from './scenes.js?v=1793434824';
import { initExtras } from './extras.js?v=1793434824';
let X = null;

const Q = new URLSearchParams(location.search);
const sfx = new Sfx(); window.__sfx = sfx;
const $ = id => document.getElementById(id);

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: Q.has('capture') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.82;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x060709);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
const CAM_T = new THREE.Vector3(0, 0.95, 0);
let camDist = 5.7;
function fitCam() { const a = innerWidth / innerHeight; camDist = a < 1 ? 5.7 / Math.max(a, 0.5) * 0.8 : 5.7; }
fitCam();

// stage: lights shared by every place; the place supplies ground, props, sky, fog and light tints
const spot = new THREE.SpotLight(0xfff4e0, 22, 30, 0.42, 0.8, 1.6); spot.position.set(0, 9, 0.5); spot.target.position.set(0, 0, 0); scene.add(spot, spot.target);
const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(-4, 6, 5); scene.add(key);
const rim = new THREE.DirectionalLight(0xdfe6ff, 0.3); rim.position.set(4, 3, -5); scene.add(rim);
const hemi = new THREE.HemisphereLight(0x404450, 0x080808, 0.15); scene.add(hemi);
scene.fog = new THREE.Fog(0x060709, 9, 22);
let place = null;
function setPlace(id) {
  if (place) scene.remove(place.G);
  place = getPlace(id); scene.add(place.G);
  scene.fog.color.set(place.fog[0]); scene.fog.near = place.fog[1]; scene.fog.far = place.fog[2];
  scene.background = new THREE.Color(place.background ?? place.fog[0]);
  hemi.color.set(place.hemi[0]); hemi.groundColor.set(place.hemi[1]); hemi.intensity = place.hemi[2];
  key.color.set(place.key[0]); key.intensity = place.key[1]; rim.color.set(place.rim[0]); rim.intensity = place.rim[1];
  spot.intensity = place.spot; renderer.toneMappingExposure = place.exposure;
  try { localStorage.setItem('gb_place', place.id); } catch (e) {}
  const b = document.getElementById('place'); if (b) b.textContent = '⛰ PLACE: ' + place.label;
}
let saved = null; try { saved = localStorage.getItem('gb_place'); } catch (e) {}
setPlace(Q.get('place') || saved || 'pond');
function cyclePlace() {
  const i = PLACES.findIndex(p => p[0] === place.id), next = PLACES[(i + 1) % PLACES.length][0];
  const f = document.getElementById('fade');
  if (window.__manual || !f) { setPlace(next); return; }
  f.style.opacity = 1; setTimeout(() => { setPlace(next); f.style.opacity = 0; }, 380);
}
// soft contact shadow
function radialTex(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: radialTex([[0, 'rgba(0,0,0,0.85)'], [0.45, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; scene.add(shadow);

// hierarchy: root (position, throw) > turn (yaw) > pivot (squash/tilt at floor contact) > mesh (y=1)
const root = new THREE.Group(), turn = new THREE.Group(), pivot = new THREE.Group(); scene.add(root); root.add(turn); turn.add(pivot);
let mesh, geo, N = 0, rest, nrm, disp, vel, pos, crease, buttMask, faceIdx, nbStart, nbList, tmpD;

// ---------- material: GROKBUTT glossy white vinyl + his exact procedural eyes ----------
const U = {
  uEyeA: { value: [new THREE.Vector4(0, 0, 1, 1), new THREE.Vector4(0, 0, 1, 1)] },   // offX, offZ, scale, open(squash)
  uEyeB: { value: [new THREE.Vector4(0, 0, 0, 0.4), new THREE.Vector4(0, 0, 0, 0.4)] }, // tilt, chevron, arc, lid
  uEyeC: { value: [new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0)] },    // slant, spin, tear, tearPhase
  uMarks: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, 0)) },
  uRed: { value: 0 },
  uHeart: { value: 0 },
};
const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 0.28, specularIntensity: 1 });
mat.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, U);
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute vec3 aRest; attribute float aCrease; varying vec3 vRest; varying float vCrease;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = aRest; vCrease = aCrease;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
varying vec3 vRest; varying float vCrease;
uniform vec4 uEyeA[2]; uniform vec4 uEyeB[2]; uniform vec4 uEyeC[2]; uniform vec4 uMarks[8]; uniform float uRed; uniform float uHeart;
float sdHeart(vec2 p){ p.x=abs(p.x); if(p.y+p.x>1.0){ vec2 a=p-vec2(0.25,0.75); return sqrt(dot(a,a))-0.35355; } vec2 b=p-vec2(0.0,1.0); vec2 c=p-0.5*max(p.x+p.y,0.0); return sqrt(min(dot(b,b),dot(c,c)))*sign(p.x-p.y); }
float gbEye; float gbCoat; float gbTear;
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
float sdArc(vec2 p, vec2 sc, float ra, float rb){ p.x=abs(p.x); return ((sc.y*p.x>sc.x*p.y)?length(p-sc*ra):abs(length(p)-ra))-rb; }
// GROKBUTT eye (from grokbutt_v2.blend 'Vinyl'): pill at x=+-0.30, z=0.14 on the normalized sphere, tilted 9deg,
// half-length 0.13, radius 0.125, front only (y<-0.3, Blender coords). Expressions only reshape this pill.
float eyeSD(vec3 n, int i, float side){
  vec4 A=uEyeA[i], B=uEyeB[i], C=uEyeC[i];
  vec2 d = vec2(n.x - (0.30*side + A.x), n.z - (0.14 + A.y));
  float ang = -0.15708*side + B.x*side + C.y;   // left eye (side=-1): sin=+0.156 like the blend
  float s=sin(ang), c=cos(ang);
  vec2 q = vec2(d.x*c - d.y*s, d.x*s + d.y*c) / A.z;
  float aa = q.x * -side;                         // +aa points toward the nose
  float op = max(A.w, 0.07);
  vec2 qs = vec2(q.x, q.y / op);
  float cap = (length(vec2(qs.x, max(abs(qs.y)-0.13, 0.))) - 0.125) * min(op, 1.0);
  float chev = min(sdSeg(vec2(aa,q.y), vec2(-0.11,0.14), vec2(0.10,0.0)), sdSeg(vec2(aa,q.y), vec2(0.10,0.0), vec2(-0.11,-0.14))) - 0.055;
  float arc = sdArc(vec2(q.x, q.y + 0.07), vec2(0.866, 0.5), 0.16, 0.05);
  float e = mix(cap, chev, B.y);
  float lid = q.y - (B.w - C.x*aa);              // eyelid cut from the top (sleepy / angry slant)
  e = max(e, lid); e = mix(e, arc, B.z);
  e = mix(e, sdHeart(vec2(q.x, q.y)/0.32 + vec2(0.0, 0.55))*0.32, uHeart);   // secret 69: heart eyes
  return e * A.z;
}
float tearSD(vec3 n, int i, float side){
  vec4 A=uEyeA[i]; vec4 C=uEyeC[i];
  vec2 p = vec2(n.x - (0.30*side + A.x) - 0.06*side, n.z - (0.14 + A.y) + 0.17 + C.w*0.22);
  return length(p*vec2(1.0,0.8)) - 0.045*C.z;
}
`)
    .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec3 nb = normalize(vec3(vRest.x, -vRest.z, vRest.y));   // Blender object coords
  float front = step(nb.y, -0.3);
  float eL = eyeSD(nb, 0, -1.0), eR = eyeSD(nb, 1, 1.0);
  float e = min(eL, eR); float w = fwidth(e)*0.9 + 0.0015;
  gbEye = front * (1.0 - smoothstep(-w, w, e));
  float t = min(tearSD(nb,0,-1.0), tearSD(nb,1,1.0)); float wt = fwidth(t)*0.9+0.0015;
  gbTear = front * (1.0 - smoothstep(-wt, wt, t)) * step(0.02, uEyeC[0].z + uEyeC[1].z) * (1.0 - gbEye);
  float f = 1.0 - 0.85*vCrease;
  vec3 base = vec3(mix(0.02, 0.94, f));
  // warm red blush on the butt (combo) - orange-red, never pink
  float bm = smoothstep(0.15, 0.45, nb.y) * smoothstep(0.25, -0.15, nb.z);
  base = mix(base, vec3(0.80, 0.27, 0.07), clamp(uRed,0.,1.)*0.5*bm);
  // gold slap marks
  for (int k=0;k<8;k++){ vec4 m=uMarks[k]; if(m.w>0.001){ float r=length(vRest-m.xyz); base=mix(base, vec3(0.85,0.58,0.16), m.w*0.8*(1.0-smoothstep(0.10,0.26,r))); } }
  base = mix(base, vec3(0.004), gbEye);
  base = mix(base, vec3(0.45,0.72,0.92), gbTear*0.85);
  diffuseColor.rgb = base;
  gbCoat = f * (1.0 - gbEye);
}`)
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 1.0, gbEye);')
    .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
material.clearcoat *= gbCoat;
material.specularColor = mix(material.specularColor, vec3(0.0), gbEye);
material.specularF90 = mix(material.specularF90, 0.0, gbEye);`);
};

// ---------- load the real GROKBUTT mesh (exported from grokbutt_v2.blend) ----------
new GLTFLoader().load('./assets/grokbutt.glb', (g) => {
  let src; g.scene.traverse(o => { if (o.isMesh && !src) src = o; });
  geo = src.geometry; N = geo.attributes.position.count;
  rest = new Float32Array(geo.attributes.position.array);
  nrm = new Float32Array(geo.attributes.normal.array);
  crease = new Float32Array(N); const ca = geo.attributes.color;
  for (let i = 0; i < N; i++) crease[i] = ca ? ca.getX(i) : 0;
  geo.setAttribute('aRest', new THREE.BufferAttribute(rest, 3));
  geo.setAttribute('aCrease', new THREE.BufferAttribute(crease, 1));
  geo.deleteAttribute('color');
  geo.attributes.position.setUsage(THREE.DynamicDrawUsage);
  pos = geo.attributes.position.array;
  disp = new Float32Array(N * 3); vel = new Float32Array(N * 3); tmpD = new Float32Array(N * 3);
  buttMask = new Float32Array(N);
  for (let i = 0; i < N; i++) { const x = rest[i*3], y = rest[i*3+1], z = rest[i*3+2];
    buttMask[i] = sst(0.05, 0.55, -z) * sst(0.35, -0.2, y); }
  // neighbour lists (CSR) for jelly propagation
  const idx = geo.index.array, cnt = new Uint32Array(N + 1);
  for (let f = 0; f < idx.length; f++) cnt[idx[f] + 1] += 2;
  for (let i = 0; i < N; i++) cnt[i + 1] += cnt[i];
  nbStart = cnt.slice(); nbList = new Uint32Array(cnt[N]); const fill = cnt.slice(0, N);
  for (let f = 0; f < idx.length; f += 3) { const a = idx[f], b = idx[f+1], c = idx[f+2];
    nbList[fill[a]++] = b; nbList[fill[a]++] = c; nbList[fill[b]++] = a; nbList[fill[b]++] = c; nbList[fill[c]++] = a; nbList[fill[c]++] = b; }
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.8); geo.boundingBox = new THREE.Box3(new THREE.Vector3(-1.8, -1.8, -1.8), new THREE.Vector3(1.8, 1.8, 1.8));
  mesh = new THREE.Mesh(geo, mat); mesh.position.y = 1.0; pivot.add(mesh);
  pivot.updateMatrixWorld(true);
  X = initExtras({ scene, mesh, rest, disp, N, sfx, S, U, renderer, exprName: () => exprName, showCombo, placeId: () => place ? place.id : 'pond', render: () => { placeCam(); renderer.render(scene, camera); }, test: Q.has('test') || !!navigator.webdriver });
  window.__ready = true;
});
function sst(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- simulation state ----------
const S = {
  t: 0, slaps: 0, slapTimes: [], lastSlap: -9, combo: 0, bestCombo: +localStorage.getItem('gb_best_combo') || 0, bestSps: +localStorage.getItem('gb_best_sps') || 0,
  squash: 0, squashV: 0, squeeze: 0, squeezeV: 0, tiltX: 0, tiltXV: 0, tiltZ: 0, tiltZV: 0,
  J: new THREE.Vector3(), JV: new THREE.Vector3(), red: 0, redHold: 0,
  yaw: +(Q.get('yaw') || -0.7), yawV: 0, yawTarget: null, pitch: +(Q.get('pitch') || 0.12), lastWhoosh: -9,
  marks: [], markI: 0, ripples: [], puffs: [],
  idle: 0, sleepy: 0, startled: 0, shockT: -9, dizzy: 0, angry: 0, wince: 0, strain: 0, happy: 0, tickle: 0, nervous: 0, massageTime: 0,
  blinkT: 2, blink: 0, lookX: 0, lookY: 0, lookTX: 0, lookTY: 0, lastMove: -9, lookTimer: 0,
  flying: false, bodyV: new THREE.Vector3(), returning: false, settleT: 0,
  poke: null, pull: null, pinch: 0, zT: 0,
};
// eye state per eye: [offX, offZ, scale, open, tilt, chev, arc, lid, slant, spin, tear]
const EYE0 = [0, 0, 1, 1, 0, 0, 0, 0.4, 0, 0, 0];
const eyes = [EYE0.slice(), EYE0.slice()];
let forced = Q.get('expr');

function addMark(p, s) { S.marks[S.markI % 8] = { p: p.clone(), s, t: S.t }; S.markI++; }

// ---------- actions ----------
function isButt(p) { return p.z < -0.15 && p.y < 0.3; }
function impulse(p, n, amt, sig2) {
  for (let i = 0; i < N; i++) { const dx = rest[i*3]-p.x, dy = rest[i*3+1]-p.y, dz = rest[i*3+2]-p.z;
    const g = Math.exp(-(dx*dx+dy*dy+dz*dz) / sig2); if (g < 0.01) continue;
    vel[i*3] += n.x*amt*g; vel[i*3+1] += n.y*amt*g; vel[i*3+2] += n.z*amt*g; }
}
function wake() {
  if (S.sleepy > 0.35) { S.startled = 1.0; S.squashV += 2.5; sfx.play('boing', { hi: 1, str: 0.7 }); }
  S.sleepy = 0; S.idle = 0;
}
function slap(p, nIn) {
  wake();
  const butt = isButt(p), dt = S.t - S.lastSlap;
  const fast = clamp(1.1 - dt, 0, 1);
  const str = clamp(0.55 + fast * 0.45, 0.4, 1) * (0.9 + Math.random() * 0.2);
  S.combo = dt < 0.9 ? S.combo + 1 : 1; S.lastSlap = S.t;
  S.slaps++; S.slapTimes.push(S.t);
  const n = nIn || p.clone().normalize();
  const tmul = X ? X.toolMul() : 1;
  const amt = (butt ? 4.2 : 3.0) * str * tmul;
  impulse(p, n.clone().multiplyScalar(-1), amt, tmul > 1.5 ? 0.3 : 0.16);
  S.JV.addScaledVector(n, -(butt ? 3.6 : 1.4) * str * tmul);
  S.squashV -= (butt ? 2.6 : 1.8) * str * Math.min(tmul, 1.5);
  S.tiltXV += (p.z > 0 ? -1 : 1) * 1.6 * str; S.tiltZV += -p.x * 1.6 * str;
  addMark(p, 1);
  S.red = Math.min(1, S.red + (butt ? 0.07 : 0.035)); S.redHold = 1.5;
  S.shockT = S.t;
  const pitch = 0.85 + Math.random() * 0.35 + fast * 0.1;
  const tm = X ? X.toolMul() : 1;
  if (!X || X.tool() === 'hand' || X.tool() === 'giant') sfx.play('slap', { str: Math.min(1, str * (butt ? 1 : 0.85) * Math.min(1, tm)), pitch });
  sfx.play('wobble', { str: str, pitch: 0.9 + Math.random() * 0.2 });
  // reactions
  const recent = S.slapTimes.filter(t => S.t - t < 1.6).length;
  const many = S.slapTimes.filter(t => S.t - t < 6).length;
  if (many >= 25) S.angry = 2.6; else if (recent >= 8) S.dizzy = Math.max(S.dizzy, 1.6);
  const ms = [10, 25, 50, 100, 200, 500, 1000];
  if (ms.includes(S.combo)) showCombo('COMBO x' + S.combo);
  if (X) X.onSlap(p, n, str * tmul, str > 0.95 || tmul > 1.5);
  if (S.combo > S.bestCombo) { S.bestCombo = S.combo; localStorage.setItem('gb_best_combo', S.bestCombo); }
}
let comboTimer = 0;
function showCombo(txt, d) { const c = $('combo'); c.textContent = txt; c.style.opacity = 1; comboTimer = d || 1.4; }
function fart(p) {
  sfx.play('toot', {}); S.squashV -= 1.2; S.JV.y += 1.5;
  const wp = mesh.localToWorld(new THREE.Vector3(0, -0.45, -1.05));
  for (let k = 0; k < 7; k++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 }));
    sp.position.copy(wp); scene.add(sp);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(turn.quaternion);
    S.puffs.push({ sp, t: S.t + k * 0.05, v: new THREE.Vector3(dir.x * 0.9 + (Math.random() - .5) * .6, 0.25 + Math.random() * 0.35, dir.z * 0.9 + (Math.random() - .5) * .6), s: 0.35 + Math.random() * 0.25 });
  }
  S.wince = 0.8;
}
const puffTex = radialTex([[0, 'rgba(150,165,135,0.75)'], [0.5, 'rgba(130,145,120,0.35)'], [1, 'rgba(120,130,110,0)']]);
function zzz() {
  const p = mesh.localToWorld(new THREE.Vector3(0.5, 1.0, 0)).project(camera);
  const el = document.createElement('div'); el.className = 'z'; el.textContent = 'z';
  el.style.left = ((p.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - p.y) / 2 * innerHeight) + 'px';
  el.style.fontSize = (16 + Math.random() * 12) + 'px';
  $('hud').appendChild(el); setTimeout(() => el.remove(), 2700);
}

// ---------- pointer input ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const ptrs = new Map(); let act = null;
function hit(x, y) {
  if (!mesh) return null; ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const h = ray.intersectObject(mesh, false)[0]; if (!h) return hitNear();
  const f = h.face, lp = mesh.worldToLocal(h.point.clone());
  const a = f.a, b = f.b, c = f.c;
  lp.x -= (disp[a*3] + disp[b*3] + disp[c*3]) / 3; lp.y -= (disp[a*3+1] + disp[b*3+1] + disp[c*3+1]) / 3; lp.z -= (disp[a*3+2] + disp[b*3+2] + disp[c*3+2]) / 3;
  const n = new THREE.Vector3(nrm[a*3] + nrm[b*3] + nrm[c*3], nrm[a*3+1] + nrm[b*3+1] + nrm[c*3+1], nrm[a*3+2] + nrm[b*3+2] + nrm[c*3+2]).normalize();
  return { p: lp, n, world: h.point.clone() };
}
// forgiving fallback: near-miss on a wobbling silhouette -> nearest rest vertex to the ray (within 0.12 units)
function hitNear() {
  const inv = mesh.matrixWorld.clone().invert(), o = ray.ray.origin.clone().applyMatrix4(inv), d = ray.ray.direction.clone().transformDirection(inv);
  let best = -1, bd = 0.0144, bt = 1e9;
  for (let i = 0; i < N; i++) { const px = rest[i*3]+disp[i*3]-o.x, py = rest[i*3+1]+disp[i*3+1]-o.y, pz = rest[i*3+2]+disp[i*3+2]-o.z;
    const t = px*d.x + py*d.y + pz*d.z; const q = px*px + py*py + pz*pz - t*t;
    if (q < bd && t < bt) { bt = t; best = i; } }
  if (best < 0) return null;
  const p = new THREE.Vector3(rest[best*3], rest[best*3+1], rest[best*3+2]);
  const n = new THREE.Vector3(nrm[best*3], nrm[best*3+1], nrm[best*3+2]).normalize();
  return { p, n, world: mesh.localToWorld(p.clone()) };
}
function pxPerUnit() { return innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camDist); }
const cv = renderer.domElement;
function down(x, y, id) {
  sfx.unlock(); wake(); S.idle = 0;
  if (ptrs.size >= 2 && act && act.kind !== 'pinch') {
    const pts = [...ptrs.values()]; act = { kind: 'pinch', d0: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) }; return;
  }
  const h = hit(x, y);
  if (h) act = { kind: 'press', id, t0: S.t, x0: x, y0: y, x, y, h, p: h.p.clone(), path: [{ t: S.t, x, y }], turn: 0, revs: [], lastDir: null, farted: false, poking: false, lastRipple: 0 };
  else act = { kind: 'bg', id, x, y, lt: S.t };
}
function move(x, y, id, buttons) {
  S.lastMove = S.t;
  const ndx = x / innerWidth * 2 - 1, ndy = -(y / innerHeight) * 2 + 1;
  if (mesh) { const c = mesh.localToWorld(new THREE.Vector3(0, 0, 0.5)).project(camera); S.lookTX = clamp((ndx - c.x) * 1.6, -1, 1); S.lookTY = clamp((ndy - c.y) * 1.6, -1, 1); }
  if (!act) { // hover: nervous when the cursor creeps close
    if (mesh) { const c = mesh.localToWorld(new THREE.Vector3()).project(camera);
      const dpx = Math.hypot((ndx - c.x) * innerWidth / 2, (ndy - c.y) * innerHeight / 2);
      if (dpx < pxPerUnit() * 1.6) S.nervous = Math.max(S.nervous, 0.5); }
    S.idle = 0; return;
  }
  S.idle = 0;
  if (act.kind === 'pinch') { const pts = [...ptrs.values()]; if (pts.length >= 2) { const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y); S.pinch = clamp(1 - d / act.d0, -0.4, 0.6); } return; }
  if (act.kind === 'bg') { const dx = x - act.x, dy = y - act.y, dt = Math.max(1 / 240, S.t - act.lt);
    S.yaw += dx * 0.008; S.pitch = clamp(S.pitch + dy * 0.003, -0.05, 0.6); S.yawV = dx * 0.008 / dt; S.yawTarget = null;
    act.x = x; act.y = y; act.lt = S.t;
    if (Math.abs(S.yawV) > 7 && S.t - S.lastWhoosh > 0.45) { S.lastWhoosh = S.t; sfx.play('whoosh', { str: Math.min(1, Math.abs(S.yawV) / 14) }); }
    return; }
  // body interaction
  const last = act.path[act.path.length - 1];
  const mx = x - last.x, my = y - last.y, ml = Math.hypot(mx, my);
  act.path.push({ t: S.t, x, y }); while (act.path.length > 40) act.path.shift();
  act.x = x; act.y = y;
  if (ml > 2) {
    const dir = { x: mx / ml, y: my / ml };
    if (act.lastDir) { const cr = act.lastDir.x * dir.y - act.lastDir.y * dir.x, dt = act.lastDir.x * dir.x + act.lastDir.y * dir.y;
      act.turn += Math.atan2(cr, dt); if (dt < -0.3) act.revs.push(S.t); }
    act.lastDir = dir;
  }
  if (act.kind === 'press' && Math.hypot(x - act.x0, y - act.y0) > 14) act.kind = 'drag';
}
function up(x, y, id) {
  if (!act) return;
  if (act.kind === 'pinch') { if (ptrs.size < 2) { if (Math.abs(S.pinch) > 0.15) sfx.play('boing', { str: 0.8 }); S.squeezeV += S.pinch * -6; S.pinch = 0; act = null; } return; }
  if (act.kind === 'press') { if (S.t - act.t0 < 0.25) slap(act.p, act.h.n); else if (act.poking) { S.squashV += 1.0; } }
  if (act.kind === 'drag' && S.pull) {
    const p = act.path, a = p[Math.max(0, p.length - 5)], b = p[p.length - 1], dt = Math.max(0.016, b.t - a.t);
    const vx = (b.x - a.x) / dt / pxPerUnit(), vy = -(b.y - a.y) / dt / pxPerUnit(), sp = Math.hypot(vx, vy);
    if (sp > 7) throwIt(vx, vy);
    else if (S.pull.len > 0.25) sfx.play('boing', { str: Math.min(1, S.pull.len * 1.3) });
  }
  S.pull = null; S.poke = null; act = null;
}
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); down(e.clientX, e.clientY, e.pointerId); });
cv.addEventListener('pointermove', e => { if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); move(e.clientX, e.clientY, e.pointerId, e.buttons); });
const endP = e => { ptrs.delete(e.pointerId); up(e.clientX, e.clientY, e.pointerId); };
cv.addEventListener('pointerup', endP); cv.addEventListener('pointercancel', endP);
cv.addEventListener('contextmenu', e => e.preventDefault());
$('place').onclick = () => { sfx.unlock(); sfx.play('whoosh', { str: 0.35 }); cyclePlace(); };
$('mute').onclick = () => { sfx.unlock(); sfx.setMuted(!sfx.muted); muteLabel(); };
function muteLabel() { $('mute').textContent = sfx.muted ? '🔇 MUTED' : '🔊 SOUND'; } muteLabel();
$('turn').onclick = () => { sfx.unlock(); wake(); const back = Math.cos(S.yaw) > 0; S.yawTarget = back ? S.yaw + Math.PI - 1.1 : S.yaw - (Math.PI - 1.1); sfx.play('whoosh', { str: 0.6 }); };
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; fitCam(); camera.updateProjectionMatrix(); });
addEventListener('keydown', () => { sfx.unlock(); wake(); });

function throwIt(vx, vy) {
  const r = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion); r.y = 0; r.normalize();
  S.flying = true; S.returning = false; S.settleT = 0;
  S.bodyV.set(r.x * vx * 0.8, Math.max(4, vy * 0.8 + 3), r.z * vx * 0.8 + (Math.random() - 0.5));
  S.yawV += vx * 0.6; S.pull = null; sfx.play('whoosh', { str: 1 }); sfx.play('boing', { str: 0.6, hi: 1 });
}

// ---------- per-frame update ----------
const _v = new THREE.Vector3();
function update(dt) {
  S.t += dt; if (place) place.update(S.t); if (X) X.update(dt);
  S.idle += dt;
  // --- body interaction modes
  if (act && (act.kind === 'press' || act.kind === 'drag') && mesh) {
    const held = S.t - act.t0;
    if (act.kind === 'press' && held > 0.25) {
      if (!act.poking) { act.poking = true; sfx.play('squish', { str: 0.9 }); }
      S.poke = { p: act.p, n: act.h.n, depth: Math.min(0.2, (held - 0.25) * 0.5) }; S.wince = 0.3;
      if (isButt(act.p) && held > 1.5 && !act.farted) { act.farted = true; fart(act.p); }
    }
    if (act.kind === 'drag') {
      act.revs = act.revs.filter(t => S.t - t < 0.8);
      const p = act.path, a = p[Math.max(0, p.length - 6)], b = p[p.length - 1];
      const spd = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(0.016, b.t - a.t) / pxPerUnit();
      act.turn *= Math.exp(-dt * 0.35);
      let pl = 0; for (let k = Math.max(1, p.length - 6); k < p.length; k++) pl += Math.hypot(p[k].x - p[k-1].x, p[k].y - p[k-1].y);
      const rub = pl / Math.max(0.016, b.t - a.t) / pxPerUnit();
      if (act.revs.length >= 3 && rub > 3) act.mode = 'tickle';
      else if (Math.abs(act.turn) > 4.5 && spd < 6) act.mode = 'massage';
      else if (!act.mode) { const far = Math.hypot(act.x - act.x0, act.y - act.y0) / pxPerUnit(); if (far > 0.3) act.mode = 'pull'; }
      if (act.mode === 'tickle') {
        S.tickle = 0.6; S.pull = null;
        S.tiltXV += (Math.random() - 0.5) * 30 * dt * 4; S.tiltZV += (Math.random() - 0.5) * 30 * dt * 4; S.squashV += (Math.random() - 0.5) * 8 * dt * 4;
        if (!act.lastGig || S.t - act.lastGig > 0.38) { act.lastGig = S.t; sfx.play('giggle', { pitch: 0.9 + Math.random() * 0.3 }); }
        if (act.revs.length >= 3 && act.mode === 'tickle' && Math.random() < 0.02) act.mode = undefined;
      } else if (act.mode === 'massage') {
        S.pull = null; S.happy = 0.6; S.massageTime += dt;
        const h = hit(act.x, act.y);
        if (h && S.t - act.lastRipple > 0.22) { act.lastRipple = S.t; S.ripples.push({ p: h.p, t: S.t }); if (S.ripples.length > 4) S.ripples.shift(); }
        if (h) S.poke = { p: h.p, n: h.n, depth: 0.05 };
      } else if (act.mode === 'pull') {
        // drag point on a camera-facing plane through the grab point
        ndc.set(act.x / innerWidth * 2 - 1, -(act.y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
        const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), act.h.world);
        const w = ray.ray.intersectPlane(pl, new THREE.Vector3());
        if (w) { const lw = mesh.worldToLocal(w.clone()), l0 = mesh.worldToLocal(act.h.world.clone()); const D = lw.sub(l0); const len = D.length();
          if (len > 1.1) D.multiplyScalar(1.1 / len); S.pull = { p: act.p, D, len: Math.min(len, 1.1) }; S.strain = 0.4; }
      }
    }
  } else if (S.massageTime > 0) S.massageTime = Math.max(0, S.massageTime - dt * 0.5);

  // --- global springs
  const spring = (x, v, k, c) => v + (-k * x - c * v) * dt;
  S.squashV = spring(S.squash, S.squashV, 170, 7); S.squash = clamp(S.squash + S.squashV * dt, -0.35, 0.35);
  const sqT = S.pinch; S.squeezeV += (-(S.squeeze - sqT) * 160 - S.squeezeV * 8) * dt; S.squeeze += S.squeezeV * dt;
  S.tiltXV = spring(S.tiltX, S.tiltXV, 120, 6); S.tiltX = clamp(S.tiltX + S.tiltXV * dt, -0.4, 0.4);
  S.tiltZV = spring(S.tiltZ, S.tiltZV, 120, 6); S.tiltZ = clamp(S.tiltZ + S.tiltZV * dt, -0.4, 0.4);
  S.JV.addScaledVector(S.J, -95 * dt).addScaledVector(S.JV, -3.2 * dt); S.J.addScaledVector(S.JV, dt); S.J.clampLength(0, 0.22);
  const sy = 1 + S.squash + S.squeeze * 0.25, sxz = 1 / Math.sqrt(Math.max(0.5, sy));
  pivot.scale.set(sxz * (1 - S.squeeze * 0.35), sy, sxz); pivot.rotation.set(S.tiltX, 0, S.tiltZ);
  if (S.pinch > 0.1) S.strain = 0.3;

  // --- yaw
  if (S.yawTarget !== null) { S.yaw = lerp(S.yaw, S.yawTarget, 1 - Math.exp(-dt * 5)); if (Math.abs(S.yaw - S.yawTarget) < 0.01) S.yawTarget = null; }
  else if (!(act && act.kind === 'bg')) { S.yaw += S.yawV * dt; S.yawV *= Math.exp(-dt * (S.flying ? 0.8 : 3)); }
  turn.rotation.y = S.yaw;

  // --- throw physics
  if (S.flying) {
    S.bodyV.y -= 18 * dt; root.position.addScaledVector(S.bodyV, dt);
    const lim = 2.4;
    if (root.position.x > lim || root.position.x < -lim) { root.position.x = clamp(root.position.x, -lim, lim); S.bodyV.x *= -0.7; S.tiltZV += S.bodyV.x * 2; sfx.play('thud', { str: 0.6 }); S.squashV -= 1; }
    if (root.position.z > 1.2 || root.position.z < -2.5) { root.position.z = clamp(root.position.z, -2.5, 1.2); S.bodyV.z *= -0.7; }
    if (root.position.y < 0) { root.position.y = 0;
      if (S.bodyV.y < -2) { const s = Math.min(1, -S.bodyV.y / 10); S.squashV -= 4 * s; S.JV.y += 2 * s; sfx.play('thud', { str: s }); S.dizzy = Math.max(S.dizzy, 1.5); }
      S.bodyV.y *= -0.55; S.bodyV.x *= 0.8; S.bodyV.z *= 0.8;
      if (Math.abs(S.bodyV.y) < 1.2) { S.bodyV.y = 0; S.settleT += dt; if (S.settleT > 0.35) { S.flying = false; S.returning = true; S.dizzy = 2.6; } } }
  } else if (S.returning) {
    root.position.x = lerp(root.position.x, 0, 1 - Math.exp(-dt * 2.5)); root.position.z = lerp(root.position.z, 0, 1 - Math.exp(-dt * 2.5));
    if (root.position.length() < 0.01) { root.position.set(0, 0, 0); S.returning = false; }
  }
  shadow.position.x = root.position.x; shadow.position.z = root.position.z;
  const hs = 1 / (1 + root.position.y * 0.6); shadow.scale.setScalar(hs); shadow.material.opacity = hs;

  // --- red blush & marks
  S.redHold -= dt; if (S.redHold < 0) S.red = Math.max(0, S.red - dt * 0.08);
  U.uRed.value = S.red;
  for (let k = 0; k < 8; k++) { const m = S.marks[k]; const u = U.uMarks.value[k];
    if (m) { const a = S.t - m.t; const s = a < 0.08 ? a / 0.08 : Math.exp(-(a - 0.08) * 0.9); u.set(m.p.x, m.p.y, m.p.z, s * m.s); } else u.set(0, 0, 0, 0); }
  // --- puffs
  S.puffs = S.puffs.filter(f => { const a = S.t - f.t; if (a < 0) return true; f.sp.position.addScaledVector(f.v, dt); f.v.multiplyScalar(Math.exp(-dt * 1.2));
    f.sp.scale.setScalar(f.s * (1 + a * 1.6)); f.sp.material.opacity = Math.min(1, a * 6) * Math.max(0, 1 - a / 1.6) * 0.8;
    if (a > 1.6) { scene.remove(f.sp); f.sp.material.dispose(); return false; } return true; });

  // --- combo HUD
  if (S.t - S.lastSlap > 0.9) S.combo = 0;
  S.slapTimes = S.slapTimes.filter(t => S.t - t < 6);
  const sps = S.slapTimes.filter(t => S.t - t < 1).length;
  if (sps > S.bestSps) { S.bestSps = sps; localStorage.setItem('gb_best_sps', sps); }
  comboTimer -= dt; if (comboTimer < 0) $('combo').style.opacity = 0;
  $('chip').textContent = S.combo >= 3 ? 'x' + S.combo : ''; $('chip').style.opacity = S.combo >= 3 ? 1 : 0;
  $('stat').textContent = 'SLAPS ' + String(S.slaps).padStart(4, '0') + ' · SPS ' + sps.toFixed(1);
  $('best').textContent = 'BEST ' + S.bestSps.toFixed(1) + ' SPS · COMBO x' + S.bestCombo;

  // --- sleep
  if (S.idle > 15 && !act) { S.sleepy = Math.min(1, S.sleepy + dt / 4); if (S.sleepy > 0.6) { S.zT -= dt; if (S.zT < 0) { S.zT = 1.3; zzz(); } } }
  // --- timers
  for (const k of ['startled', 'dizzy', 'angry', 'wince', 'strain', 'happy', 'tickle', 'nervous']) S[k] = Math.max(0, S[k] - dt);

  updateEyes(dt);
  if (mesh) simulate(dt);
}

// ---------- expressions: only reshape GROKBUTT's own pill eyes ----------
function exprTargets() {
  const T = [EYE0.slice(), EYE0.slice()];
  const set = (k, v, v2) => { T[0][k] = v; T[1][k] = v2 === undefined ? v : v2; };
  const t = S.t;
  // look
  S.lookTimer -= 1 / 60;
  if (S.t - S.lastMove > 2 && S.lookTimer <= 0) { S.lookTimer = 1.2 + Math.random() * 1.8; S.lookTX = (Math.random() - 0.5) * 1.6; S.lookTY = (Math.random() - 0.5) * 0.9; }
  const lx = S.lookX * 0.07, ly = S.lookY * 0.05; set(0, lx); set(1, ly);
  let name = forced || pickExpr();
  const since = t - S.shockT;
  switch (name) {
    case 'asleep': set(7, -0.195); break;
    case 'sleepy': set(7, lerp(0.4, -0.215, S.sleepy) ); set(1, -0.02 * S.sleepy); break;
    case 'drowsy': set(7, 0.02); set(6, 0); break;
    case 'startled': case 'shocked': set(2, 1.25); set(3, 1.08); set(0, 0); set(1, 0.02); break;
    case 'squint': set(5, 1); set(0, 0); set(1, 0); break;
    case 'dizzy': { const w = t * 9; set(9, w, -w); T[0][0] = Math.cos(t * 6) * 0.035; T[0][1] = Math.sin(t * 6) * 0.03; T[1][0] = -Math.cos(t * 6) * 0.035; T[1][1] = Math.sin(t * 6) * 0.03; set(2, 0.9); set(3, 0.85); break; }
    case 'angry': set(7, 0.11); set(8, 0.5); set(4, -0.12); set(2, 0.95); set(0, 0); set(1, -0.01); break;
    case 'wince': T[0][5] = 1; T[0][2] = 0.92; T[1][7] = 0.02; T[1][2] = 0.95; break;
    case 'strain': set(5, 0.75); set(3, 0.6); set(2, 0.9); set(0, (Math.random() - .5) * 0.01); break;
    case 'happy': set(6, 1); set(0, 0); set(1, 0.01); break;
    case 'teary': set(6, 1); set(10, 1); set(0, (Math.random() - .5) * 0.008); set(1, 0.01); break;
    case 'nervous': set(2, 0.82); set(7, 0.36); T[0][0] = lx * 1.3 + Math.sin(t * 23) * 0.012; T[1][0] = T[0][0]; set(1, ly + 0.01); set(4, 0.08); break;
    default: break;
  }
  return { T, name };
}
function pickExpr() {
  const since = S.t - S.shockT;
  if (S.startled > 0) return 'startled';
  if (S.angry > 0) return 'angry';
  if (S.dizzy > 0) return 'dizzy';
  if (since < 0.16) return 'shocked';
  if (since < 0.6) return 'squint';
  if (S.tickle > 0) return 'teary';
  if (S.strain > 0) return 'strain';
  if (S.wince > 0) return 'wince';
  if (S.happy > 0) return S.massageTime > 6 ? 'drowsy' : 'happy';
  if (S.sleepy > 0.02) return S.sleepy >= 1 ? 'asleep' : 'sleepy';
  if (S.nervous > 0) return 'nervous';
  return 'idle';
}
let exprName = 'idle';
function updateEyes(dt) {
  S.lookX = lerp(S.lookX, S.lookTX, 1 - Math.exp(-dt * 8)); S.lookY = lerp(S.lookY, S.lookTY, 1 - Math.exp(-dt * 8));
  const { T, name } = exprTargets(); exprName = name;
  // blink (only when eyes are in their normal pill shape)
  S.blinkT -= dt; if (S.blinkT < 0) { S.blinkT = 2.2 + Math.random() * 3; S.blink = 0.16; }
  S.blink = Math.max(0, S.blink - dt);
  const bk = S.blink > 0 ? Math.sin(Math.PI * (1 - S.blink / 0.16)) : 0;
  const canBlink = ['idle', 'nervous'].includes(name) && !forced;
  const fastK = ['shocked', 'startled', 'squint'].includes(name) ? 30 : 14;
  for (let e = 0; e < 2; e++) for (let k = 0; k < 11; k++) {
    if (k === 9) { eyes[e][9] = T[e][9] !== 0 ? T[e][9] : lerp(eyes[e][9] % (2 * Math.PI), 0, 1 - Math.exp(-dt * 10)); continue; }
    eyes[e][k] = lerp(eyes[e][k], T[e][k], 1 - Math.exp(-dt * fastK));
  }
  for (let e = 0; e < 2; e++) {
    const E = eyes[e];
    const open = E[3] * (canBlink ? 1 - bk * 0.92 : 1);
    U.uEyeA.value[e].set(E[0], E[1], E[2], open);
    U.uEyeB.value[e].set(E[4], E[5], E[6], E[7]);
    U.uEyeC.value[e].set(E[8], E[9], E[10], (S.t * 0.5) % 1);
  }
}

// ---------- soft body: per-vertex spring displacement + neighbour diffusion ----------
let quiet = 0;
function simulate(dt) {
  const steps = 2, h = Math.min(dt, 1 / 30) / steps, K = 130, C = 7.5;
  const pk = S.poke, pu = S.pull; let maxE = 0;
  for (let s = 0; s < steps; s++) {
    for (let i = 0; i < N; i++) {
      const i3 = i * 3; let fx = -K * disp[i3] - C * vel[i3], fy = -K * disp[i3+1] - C * vel[i3+1], fz = -K * disp[i3+2] - C * vel[i3+2];
      if (pk) { const dx = rest[i3]-pk.p.x, dy = rest[i3+1]-pk.p.y, dz = rest[i3+2]-pk.p.z, g = Math.exp(-(dx*dx+dy*dy+dz*dz) / 0.05);
        if (g > 0.01) { const kk = 420 * g; fx += kk * (-pk.n.x * pk.depth * g - disp[i3]); fy += kk * (-pk.n.y * pk.depth * g - disp[i3+1]); fz += kk * (-pk.n.z * pk.depth * g - disp[i3+2]); } }
      if (pu) { const dx = rest[i3]-pu.p.x, dy = rest[i3+1]-pu.p.y, dz = rest[i3+2]-pu.p.z, g = Math.exp(-(dx*dx+dy*dy+dz*dz) / 0.3);
        if (g > 0.01) { const kk = 380 * g; fx += kk * (pu.D.x * g - disp[i3]); fy += kk * (pu.D.y * g - disp[i3+1]); fz += kk * (pu.D.z * g - disp[i3+2]); } }
      vel[i3] += fx * h; vel[i3+1] += fy * h; vel[i3+2] += fz * h;
      disp[i3] += vel[i3] * h; disp[i3+1] += vel[i3+1] * h; disp[i3+2] += vel[i3+2] * h;
    }
    // diffusion -> jelly waves travel across the body
    for (let i = 0; i < N; i++) { const a = nbStart[i], b = nbStart[i + 1]; if (b === a) continue; let sx = 0, sy = 0, sz = 0;
      for (let j = a; j < b; j++) { const n3 = nbList[j] * 3; sx += disp[n3]; sy += disp[n3+1]; sz += disp[n3+2]; }
      const inv = 1 / (b - a), i3 = i * 3; tmpD[i3] = sx * inv; tmpD[i3+1] = sy * inv; tmpD[i3+2] = sz * inv; }
    for (let i = 0; i < N * 3; i++) { disp[i] += (tmpD[i] - disp[i]) * 0.35; }
  }
  for (let i = 0; i < N * 3; i++) { const e = Math.abs(disp[i]) + Math.abs(vel[i]) * 0.05; if (e > maxE) maxE = e; }
  const rip = S.ripples.filter(r => S.t - r.t < 1.6); S.ripples = rip;
  const jl = S.J.lengthSq();
  const active = maxE > 2e-4 || rip.length || jl > 1e-7 || pk || pu;
  if (!active) { if (quiet++ > 2) return; } else quiet = 0;
  const Jx = S.J.x, Jy = S.J.y, Jz = S.J.z;
  for (let i = 0; i < N; i++) {
    const i3 = i * 3, bm = buttMask[i];
    let x = rest[i3] + disp[i3] + Jx * bm, y = rest[i3+1] + disp[i3+1] + Jy * bm, z = rest[i3+2] + disp[i3+2] + Jz * bm;
    for (const r of rip) { const a = S.t - r.t, dx = rest[i3]-r.p.x, dy = rest[i3+1]-r.p.y, dz = rest[i3+2]-r.p.z, d = Math.sqrt(dx*dx+dy*dy+dz*dz);
      if (d < 1.2) { const w = 0.028 * Math.sin(20 * d - 10 * a) * Math.exp(-3 * d) * Math.exp(-2.2 * a) * sst(0, 0.15, a * 3 - d * 0); x += nrm[i3] * w; y += nrm[i3+1] * w; z += nrm[i3+2] * w; } }
    pos[i3] = x; pos[i3+1] = y; pos[i3+2] = z;
  }
  geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
}

// ---------- loop ----------
function placeCam() {
  const p = S.pitch;
  camera.position.set(CAM_T.x, CAM_T.y + Math.sin(p) * camDist, CAM_T.z + Math.cos(p) * camDist); camera.lookAt(CAM_T);
}
let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (!window.__manual) { update(dt); placeCam(); renderer.render(scene, camera); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- test / capture hooks ----------
window.__gb = {
  S, step(dt, n = 1) { for (let i = 0; i < n; i++) update(dt); placeCam(); renderer.render(scene, camera); },
  X: () => X, expr: () => exprName, setExpr(n) { forced = n || null; },
  slapAt(x, y) { const h = hit(x, y); if (h) slap(h.p, h.n); return !!h; },
  hit, down, move, up, ptrs, setYaw(y) { S.yaw = y; S.yawV = 0; S.yawTarget = null; }, setPitch(p) { S.pitch = p; },
  projectLocal(x, y, z) { const v = mesh.localToWorld(new THREE.Vector3(x, y, z)).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },
  setPlace, cyclePlace, place: () => place.id,
  startLog() { sfx.log = []; sfx.clock = () => S.t; }, async renderAudio(dur) { return renderLog(sfx.log, dur); },
};
