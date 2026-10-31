// GROKBUTT SLAP - four lightweight procedural places (no textures, low-poly, muted colours).
// Throw bounds (x +-2.4, z -2.5..1.2) are kept clear of props in every place; floor contact is y=0.
import * as THREE from 'three';

const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.95, metalness: 0, flatShading: true, envMapIntensity: 0.15 }, o));
function mesh(g, m, x = 0, y = 0, z = 0, parent) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); if (parent) parent.add(o); return o; }
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function jitter(g, amt, r) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + (r() - .5) * amt, p.getY(i) + (r() - .5) * amt, p.getZ(i) + (r() - .5) * amt); g.computeVertexNormals(); return g; }
function sky(top, mid, hor) {
  return new THREE.Mesh(new THREE.SphereGeometry(70, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { a: { value: new THREE.Color(top) }, b: { value: new THREE.Color(mid) }, c: { value: new THREE.Color(hor) } },
    vertexShader: 'varying vec3 vp; void main(){ vp = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 a,b,c; varying vec3 vp; void main(){ float h = normalize(vp).y; vec3 col = h > 0.12 ? mix(b, a, smoothstep(0.12, 0.6, h)) : mix(c, b, smoothstep(-0.05, 0.12, h)); gl_FragColor = vec4(col,1.0);\n#include <colorspace_fragment>\n}' }));
}
let dotTex;
function dots(n, spread, color, size, r, opacity = 0.9) {
  if (!dotTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); dotTex = new THREE.CanvasTexture(c); }
  const p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const s = spread(r); p[i*3] = s[0]; p[i*3+1] = s[1]; p[i*3+2] = s[2]; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color, size, map: dotTex, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
}

// ---------- 1. Pond garden at dusk ----------
function pond() {
  const G = new THREE.Group(), r = rnd(7);
  G.add(sky(0x16263a, 0x3c5566, 0xa77a4e));
  const ground = new THREE.CircleGeometry(40, 48); ground.rotateX(-Math.PI / 2); mesh(ground, M(0x2c4430), 0, -0.05, 0, G);
  // mossy flat rock pedestal he sits on
  mesh(jitter(new THREE.CylinderGeometry(1.35, 1.55, 0.1, 14, 1), 0.035, r), M(0x58604f), 0, -0.05, 0, G);
  // pond (matte-ish water, not a mirror)
  const water = new THREE.CircleGeometry(1, 32); water.rotateX(-Math.PI / 2);
  const w = mesh(water, M(0x1d4650, { roughness: 0.4, flatShading: false, envMapIntensity: 0.35 }), -4.8, -0.03, -3.2, G); w.scale.set(2.6, 1, 1.7);
  const rim = new THREE.RingGeometry(1, 1.12, 32); rim.rotateX(-Math.PI / 2); mesh(rim, M(0x4a4f44), -4.8, -0.025, -3.2, G).scale.set(2.6, 1, 1.7);
  const pad = new THREE.CircleGeometry(0.32, 10, 0.3, Math.PI * 1.8); pad.rotateX(-Math.PI / 2);
  for (const [x, z] of [[-5.6, -2.7], [-4.1, -3.6], [-3.6, -2.6], [-5.2, -4.0]]) mesh(pad, M(0x3f6a3a), x, -0.02, z, G).rotation.y = r() * 6;
  // reeds & plants
  const reed = new THREE.ConeGeometry(0.035, 1, 4); reed.translate(0, 0.5, 0);
  for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 1.2 + 1.6, x = -4.8 + Math.cos(a) * 2.8, z = -3.2 - Math.abs(Math.sin(a)) * 1.9;
    const o = mesh(reed, M(i % 3 ? 0x4f6b3a : 0x6b6a3c), x, 0, z, G); o.scale.y = 0.8 + r() * 1.1; o.rotation.z = (r() - .5) * 0.25; }
  const bush = new THREE.IcosahedronGeometry(0.6, 0);
  for (const [x, z, s, c] of [[4.2, -2.2, 1.0, 0x355a3a], [5.4, -3.6, 1.4, 0x2e4f36], [3.4, -4.8, 0.8, 0x3d5f37], [-7.2, -1.2, 1.2, 0x304d34]]) mesh(bush, M(c), x, 0.3 * s, z, G).scale.set(s, s * 0.75, s);
  // rocks
  const rock = new THREE.DodecahedronGeometry(0.4, 0);
  for (const [x, z, s] of [[3.3, -1.4, 0.8], [4.0, -0.6, 0.5], [-2.9, -4.4, 0.7], [-3.4, -1.6, 0.55], [6.5, -6, 1.3], [-6.4, -5.2, 0.9]]) { const o = mesh(rock, M(0x5c615a), x, 0.15 * s, z, G); o.scale.set(s, s * 0.65, s); o.rotation.y = r() * 6; }
  // trees & hills
  const crown = new THREE.ConeGeometry(1.1, 2.6, 7), trunk = new THREE.CylinderGeometry(0.12, 0.16, 0.9, 6);
  for (let i = 0; i < 9; i++) { const x = -15 + i * 3.8 + (r() - .5) * 1.4, z = -15 - r() * 6, s = 0.7 + r() * 0.6;
    mesh(trunk, M(0x3b2f26), x, 0.45 * s, z, G).scale.setScalar(s); mesh(crown, M(i % 2 ? 0x24402f : 0x2b4a33), x, (0.9 + 1.3) * s, z, G).scale.setScalar(s); }
  const hill = new THREE.SphereGeometry(1, 14, 8);
  for (const [x, z, sx, sy, c] of [[-14, -24, 14, 4.5, 0x263b33], [8, -26, 16, 5.5, 0x22362f], [22, -20, 10, 3.5, 0x2a4034]]) mesh(hill, M(c), x, -0.5, z, G).scale.set(sx, sy, 6);
  // fireflies (slow drift, gentle - no blinking)
  const ff = dots(34, r => [(r() - .5) * 14, 0.3 + r() * 2.4, -1.5 - r() * 7], 0xd9e07a, 0.12, r, 0.85); G.add(ff);
  const base = ff.geometry.attributes.position.array.slice();
  return { G, fog: [0x3a4a4c, 14, 42], hemi: [0x6f8aa0, 0x2a3a28, 0.55], key: [0xffd9a8, 0.95], rim: [0x9fd0d8, 0.45], spot: 22, exposure: 0.85,
    update(t) { const a = ff.geometry.attributes.position; for (let i = 0; i < a.count; i++) { a.array[i*3] = base[i*3] + Math.sin(t * 0.4 + i) * 0.35; a.array[i*3+1] = base[i*3+1] + Math.sin(t * 0.55 + i * 1.7) * 0.2; } a.needsUpdate = true; } };
}

// ---------- 2. Cozy bedroom ----------
function bedroom() {
  const G = new THREE.Group(), r = rnd(3);
  const floor = new THREE.PlaneGeometry(30, 30); floor.rotateX(-Math.PI / 2); mesh(floor, M(0x4e3a2c), 0, 0, 0, G);
  for (let i = -7; i <= 7; i++) mesh(new THREE.BoxGeometry(0.02, 0.004, 30), M(0x3f2f24), i * 0.9, 0.002, 0, G); // floorboard lines
  mesh(new THREE.PlaneGeometry(30, 12), M(0x3a4a50), 0, 6, -6.5, G);
  const lw = mesh(new THREE.PlaneGeometry(30, 12), M(0x34434a), -8, 6, 0, G); lw.rotation.y = Math.PI / 2;
  const rw = mesh(new THREE.PlaneGeometry(30, 12), M(0x34434a), 8, 6, 0, G); rw.rotation.y = -Math.PI / 2;
  mesh(new THREE.BoxGeometry(30, 0.25, 0.1), M(0x2c3639), 0, 0.12, -6.45, G); // skirting
  // rug + square cushion he sits on
  mesh(new THREE.BoxGeometry(5.6, 0.02, 4.2), M(0x2f5654), 0, -0.012, -0.4, G);
  mesh(new THREE.BoxGeometry(4.6, 0.025, 3.3), M(0x6a5a3a), 0, -0.01, -0.4, G);
  const cush = new THREE.BoxGeometry(2.5, 0.12, 2.5, 3, 1, 3); mesh(cush, M(0x9a7438, { flatShading: false }), 0, -0.058, 0, G);
  // bed (back left)
  mesh(new THREE.BoxGeometry(3.2, 0.55, 4.6), M(0x4a3426), -5.4, 0.28, -3.6, G);
  mesh(new THREE.BoxGeometry(3.0, 0.35, 4.4), M(0x5a6878), -5.4, 0.72, -3.6, G);
  mesh(new THREE.BoxGeometry(3.05, 0.1, 2.6), M(0x3e6a66), -5.4, 0.92, -2.7, G);
  mesh(new THREE.BoxGeometry(1.4, 0.3, 0.8), M(0x7a7f5c), -5.4, 1.05, -5.3, G);
  mesh(new THREE.BoxGeometry(3.2, 1.6, 0.15), M(0x4a3426), -5.4, 0.8, -5.95, G);
  // desk + lamp (back right)
  const wood = M(0x5c4330);
  mesh(new THREE.BoxGeometry(3.2, 0.1, 1.4), wood, 4.8, 1.5, -5.3, G);
  for (const [dx, dz] of [[-1.5, -0.6], [1.5, -0.6], [-1.5, 0.6], [1.5, 0.6]]) mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), wood, 4.8 + dx, 0.75, -5.3 + dz, G);
  mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.06, 10), M(0x2f3436), 5.6, 1.58, -5.4, G);
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), M(0x2f3436), 5.6, 1.98, -5.4, G);
  mesh(new THREE.ConeGeometry(0.4, 0.45, 10, 1, true), M(0xc89a55, { emissive: 0x8a5a24, emissiveIntensity: 0.6, side: THREE.DoubleSide }), 5.6, 2.45, -5.4, G);
  const lamp = new THREE.PointLight(0xffc27a, 9, 9, 1.6); lamp.position.set(5.6, 2.3, -5.2); G.add(lamp);
  mesh(new THREE.BoxGeometry(0.9, 0.6, 0.05), M(0x22282c), 4.2, 1.85, -5.8, G); // monitor
  mesh(new THREE.BoxGeometry(0.8, 0.5, 0.01), M(0x2c5a5c, { emissive: 0x1c4a4c, emissiveIntensity: 0.6 }), 4.2, 1.85, -5.77, G);
  // night window above the bed (weather: snow falls behind the glass)
  mesh(new THREE.PlaneGeometry(1.7, 1.4), new THREE.MeshBasicMaterial({ color: 0x18263a }), -3.75, 3.3, -6.48, G);
  for (const [w, h, x, y] of [[1.9, 0.08, -3.75, 4.04], [1.9, 0.08, -3.75, 2.56], [0.08, 1.56, -4.64, 3.3], [0.08, 1.56, -2.86, 3.3], [0.05, 1.4, -3.75, 3.3], [1.7, 0.05, -3.75, 3.3]])
    mesh(new THREE.BoxGeometry(w, h, 0.06), M(0x4a3c2c), x, y, -6.4, G);
  // posters: plain shapes
  const posters = [[-1.8, 3.4, 1.6, 2.1, 0x2c4c5a, 0xc0904a], [0.6, 3.7, 1.3, 1.7, 0x5a5a34, 0x3e6a66], [2.6, 3.2, 1.1, 1.4, 0x6a4a2e, 0x2c4c5a]];
  for (const [x, y, w, h, bg, fg] of posters) { mesh(new THREE.BoxGeometry(w, h, 0.03), M(bg), x, y, -6.47, G); mesh(new THREE.BoxGeometry(w * 0.5, w * 0.5, 0.03), M(fg), x, y + h * 0.1, -6.44, G).rotation.z = 0.785; }
  // shelf + books, plant
  mesh(new THREE.BoxGeometry(2, 0.08, 0.4), wood, -1.8, 1.4, -6.3, G);
  for (let i = 0; i < 7; i++) mesh(new THREE.BoxGeometry(0.16, 0.4 + r() * 0.2, 0.3), M([0x3e6a66, 0x8a6a3a, 0x5a4a6a, 0x4a5a34][i % 4]), -2.6 + i * 0.22, 1.65, -6.3, G);
  mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.5, 8), M(0x6a4a34), 3.4, 0.25, -2.6, G);
  for (let i = 0; i < 6; i++) { const l = mesh(new THREE.ConeGeometry(0.12, 0.9, 4), M(0x3f6a3a), 3.4, 0.8, -2.6, G); l.rotation.set((r() - .5) * 0.9, r() * 6, (r() - .5) * 0.9); }
  return { G, fog: [0x2a3236, 16, 40], hemi: [0x8a9aa8, 0x3a2c22, 0.55], key: [0xffe2bd, 0.85], rim: [0xaed0d8, 0.35], spot: 20, exposure: 0.85, background: 0x2a3236, update() {} };
}

// ---------- 3. Space station ----------
function station() {
  const G = new THREE.Group(), r = rnd(11);
  const metal = M(0x2f363c, { roughness: 0.75, envMapIntensity: 0.25 }), dark = M(0x1f2428, { roughness: 0.8 });
  const floor = new THREE.PlaneGeometry(30, 30); floor.rotateX(-Math.PI / 2); mesh(floor, M(0x2a3035, { roughness: 0.85 }), 0, 0, 0, G);
  for (let i = -8; i <= 8; i++) { mesh(new THREE.BoxGeometry(0.03, 0.006, 30), dark, i * 1.2, 0.003, 0, G); mesh(new THREE.BoxGeometry(30, 0.006, 0.03), dark, 0, 0.003, i * 1.2, G); }
  // back wall with a big window (wall built from panels around the opening)
  const z = -6.5;
  mesh(new THREE.BoxGeometry(30, 1.2, 0.3), metal, 0, 0.6, z, G);
  mesh(new THREE.BoxGeometry(30, 4, 0.3), metal, 0, 7.0, z, G);
  mesh(new THREE.BoxGeometry(11, 3.8, 0.3), metal, -9.5, 3.1, z, G); mesh(new THREE.BoxGeometry(11, 3.8, 0.3), metal, 9.5, 3.1, z, G);
  for (const x of [-1.35, 1.35]) mesh(new THREE.BoxGeometry(0.18, 3.8, 0.35), dark, x, 3.1, z, G);
  const lw = mesh(new THREE.BoxGeometry(0.3, 12, 30), metal, -8, 6, 0, G), rw = mesh(new THREE.BoxGeometry(0.3, 12, 30), metal, 8, 6, 0, G);
  for (let i = 0; i < 5; i++) { mesh(new THREE.BoxGeometry(0.05, 10, 0.05), dark, -7.83, 5, -5 + i * 2.5, G); mesh(new THREE.BoxGeometry(0.05, 10, 0.05), dark, 7.83, 5, -5 + i * 2.5, G); }
  // soft teal light strips
  const glow = M(0x3aa8a0, { emissive: 0x2a8a84, emissiveIntensity: 0.7, flatShading: false });
  mesh(new THREE.BoxGeometry(8.4, 0.06, 0.06), glow, 0, 1.22, z + 0.2, G); mesh(new THREE.BoxGeometry(8.4, 0.06, 0.06), glow, 0, 5.0, z + 0.2, G);
  for (const x of [-7.8, 7.8]) mesh(new THREE.BoxGeometry(0.06, 0.06, 12), glow, x, 0.4, -1, G);
  const tl = new THREE.PointLight(0x5ad0c8, 5, 10, 1.6); tl.position.set(0, 1.6, -5.5); G.add(tl);
  // hex pedestal with a teal ring
  mesh(new THREE.CylinderGeometry(1.4, 1.55, 0.1, 6), M(0x3a434c, { roughness: 0.6 }), 0, -0.05, 0, G);
  const ring = new THREE.TorusGeometry(1.48, 0.025, 6, 6); ring.rotateX(Math.PI / 2); mesh(ring, glow, 0, 0.0, 0, G);
  // consoles + crates
  mesh(new THREE.BoxGeometry(2.2, 1.0, 1.0), metal, 5.4, 0.5, -4.8, G); mesh(new THREE.BoxGeometry(1.6, 0.05, 0.6), M(0x2a6a6a, { emissive: 0x1a4a4a, emissiveIntensity: 0.5 }), 5.4, 1.03, -4.8, G);
  for (const [x, zz, s] of [[-5, -4.5, 1], [-5.9, -3.4, 0.7], [-4.3, -5.3, 0.6]]) mesh(new THREE.BoxGeometry(s, s, s), M(0x4a4a3e), x, s / 2, zz, G);
  // outside: stars + planet
  G.add(dots(260, r => [(r() - .5) * 90, -6 + r() * 40, -30 - r() * 12], 0xcfd8e0, 0.35, r, 0.7));
  const pl = mesh(new THREE.SphereGeometry(5, 32, 20), new THREE.MeshStandardMaterial({ color: 0x2c5562, roughness: 1, fog: false }), 7, 4.5, -42, G);
  const band = new THREE.TorusGeometry(10.5, 0.35, 4, 48); band.scale(0.72,0.72,0.72); band.rotateX(1.35); mesh(band, new THREE.MeshStandardMaterial({ color: 0x5e5848, roughness: 1, fog: false }), 7, 4.5, -42, G).rotation.z = 0.3;
  const sun = new THREE.DirectionalLight(0xcfe0ff, 0.0); // planet light handled by hemi
  return { G, fog: [0x0b1016, 18, 60], hemi: [0x6a8a9a, 0x1a2024, 0.55], key: [0xe6f0ff, 0.85], rim: [0x5ad0c8, 0.6], spot: 22, exposure: 0.85, background: 0x05070b,
    update(t) { pl.rotation.y = t * 0.02; } };
}

// ---------- 4. Beach at sunset ----------
function beach() {
  const G = new THREE.Group(), r = rnd(5);
  G.add(sky(0x243250, 0x6a6a72, 0xcf8a4c));
  const sand = new THREE.PlaneGeometry(60, 30, 30, 15); sand.rotateX(-Math.PI / 2); const sp = sand.attributes.position;
  for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), z = sp.getZ(i); if (Math.abs(x) > 4 || z < -3) sp.setY(i, Math.sin(x * 0.7) * Math.cos(z * 0.5) * 0.08); }
  sand.computeVertexNormals(); mesh(sand, M(0xa88a62), 0, -0.02, 6, G);
  // sea with gentle waves
  const seaG = new THREE.PlaneGeometry(90, 50, 45, 20); seaG.rotateX(-Math.PI / 2);
  const sea = mesh(seaG, M(0x2c5c66, { roughness: 0.45, envMapIntensity: 0.3 }), 0, -0.06, -34, G);
  const sb = seaG.attributes.position.array.slice();
  const foam = new THREE.PlaneGeometry(90, 0.5); foam.rotateX(-Math.PI / 2);
  const fm = mesh(foam, new THREE.MeshStandardMaterial({ color: 0xbdb39a, roughness: 1, transparent: true, opacity: 0.55 }), 0, -0.03, -9, G);
  // sun (warm, low, soft) + its light
  mesh(new THREE.CircleGeometry(3.2, 32), new THREE.MeshBasicMaterial({ color: 0xe0a060, fog: false }), -6, 3.2, -66, G);
  // towel he sits on (stripes)
  for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(2.6, 0.02, 0.6), M(i % 2 ? 0xc09050 : 0x2f6a6a), 0, -0.008, -1.2 + i * 0.6, G);
  // palm (left) - leaning trunk + fronds
  const palm = new THREE.Group(); palm.position.set(-4.2, 0, -5); G.add(palm);
  let p = new THREE.Vector3(), tip;
  for (let i = 0; i < 7; i++) { const seg = mesh(new THREE.CylinderGeometry(0.16 - i * 0.012, 0.2 - i * 0.012, 0.8, 6), M(i % 2 ? 0x6a5236 : 0x5a4530), p.x, p.y + 0.4, p.z, palm); seg.rotation.z = -0.08 * i; p.x += Math.sin(0.08 * i) * 0.8; p.y += Math.cos(0.08 * i) * 0.78; }
  tip = p.clone();
  const frond = new THREE.ConeGeometry(0.35, 2.4, 4); frond.translate(0, 1.2, 0); frond.scale(1, 1, 0.25);
  for (let i = 0; i < 7; i++) { const f = mesh(frond, M(i % 2 ? 0x4a6a34 : 0x3e5e30), tip.x, tip.y, tip.z, palm); f.rotation.set(0, i / 7 * Math.PI * 2, 1.9); f.rotation.order = 'YXZ'; f.rotation.x = 0; f.rotation.z = 1.75 + r() * 0.3; }
  // rocks, shells as flat cones, driftwood
  const rock = new THREE.DodecahedronGeometry(0.5, 0);
  for (const [x, z, s] of [[4.6, -3.2, 1.1], [5.6, -2.4, 0.6], [-3.4, -5.5, 0.7], [7.5, -6, 1.6]]) { const o = mesh(rock, M(0x5a554c), x, 0.18 * s, z, G); o.scale.set(s, s * 0.6, s); o.rotation.y = r() * 6; }
  mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 6), M(0x6e5a44), 3.6, 0.08, -1.0, G).rotation.set(0, 0.6, Math.PI / 2);
  return { G, fog: [0x7a6a62, 20, 75], hemi: [0x8a9ab8, 0x5a4632, 0.6], key: [0xffc890, 1.0], rim: [0xe0a070, 0.55], spot: 18, exposure: 0.85,
    update(t) { const a = seaG.attributes.position; for (let i = 0; i < a.count; i++) { const x = sb[i*3], z = sb[i*3+2]; a.array[i*3+1] = Math.sin(x * 0.25 + t * 0.8) * 0.06 + Math.sin(z * 0.6 + t * 1.1) * 0.05; } a.needsUpdate = true; seaG.computeVertexNormals();
      fm.position.z = -9 + Math.sin(t * 0.5) * 0.6; fm.material.opacity = 0.4 + Math.sin(t * 0.5 + 1) * 0.15; } };
}

export const PLACES = [['pond', 'POND', pond], ['bedroom', 'BEDROOM', bedroom], ['station', 'STATION', station], ['beach', 'BEACH', beach]];
const cache = {};
export function getPlace(id) { const e = PLACES.find(p => p[0] === id) || PLACES[0]; return cache[e[0]] || (cache[e[0]] = Object.assign(e[2](), { id: e[0], label: e[1] })); }
