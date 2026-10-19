/* GROKBUTT stage 7: THE CROP TOOL (final boss). Loaded after stages.js.
   Attacks: shrinking crop rectangle (stay inside), corner-handle slams, scissor dashes, minion summons.
   3 phases. Weak point: the "aspect lock" padlock on its back (hits from behind x2, butt bumps x1.5).
   Defeat: the frame shatters and GrokButt lands back on the HOME SCREEN (win screen). */
'use strict';

const CT = { crop: null, slams: [], sc: { x: W / 2, y: 200, a: 0, st: 'idle', t: 0, n: 0, dx: 0, dy: 0, snip: 0 }, outro: null, anim: 0, boss: null };
const ARENA = { x: 16, y: 64, w: W - 32, h: H - 72 };
function bossReset() { CT.crop = null; CT.slams.length = 0; CT.sc.st = 'idle'; CT.sc.n = 0; CT.outro = null; CT.boss = null; }

// ---------- arena art: an image editor canvas ----------
function bgEditor(c, R) {
  for (let y = 64; y < H; y += 20) for (let x = 0; x < W; x += 20) { c.fillStyle = ((x + y) / 20 & 1) ? '#2b2e35' : '#24272d'; c.fillRect(x, y, 20, 20); } // matte transparency checkerboard
  const v = c.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 460); v.addColorStop(0, 'rgba(60,70,110,0.18)'); v.addColorStop(1, 'rgba(0,0,0,0.35)'); c.fillStyle = v; c.fillRect(0, 64, W, H);
  c.strokeStyle = 'rgba(0,220,255,0.22)'; c.lineWidth = 1; c.setLineDash([6, 6]); // guides
  for (const x of [213, 427]) { c.beginPath(); c.moveTo(x, 64); c.lineTo(x, H); c.stroke(); }
  for (const y of [253, 443]) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  c.setLineDash([]);
  c.fillStyle = 'rgba(255,255,255,0.05)'; c.font = `bold 13px ${FONT}`; c.textAlign = 'left'; c.fillText('Layer 1 (about to be cropped)', 30, 96);
  for (let i = 0; i < 10; i++) { // leftover cropped-off scraps of other pictures
    c.save(); c.translate(40 + R() * (W - 80), 120 + R() * (H - 170)); c.rotate((R() - 0.5) * 0.8); c.globalAlpha = 0.35;
    c.fillStyle = pick(['#5b6fd6', '#c45a4a', '#5f9c66', '#d07b2c', '#8c5fb0']); c.fillRect(-14, -10, 28, 20);
    c.strokeStyle = 'rgba(255,255,255,0.4)'; c.setLineDash([3, 3]); c.strokeRect(-14, -10, 28, 20); c.setLineDash([]);
    c.restore();
  }
  // rulers
  c.fillStyle = '#1a1c21'; c.fillRect(0, 64, W, 12); c.fillRect(0, 64, 14, H);
  c.strokeStyle = '#6a7080'; c.fillStyle = '#6a7080'; c.font = `bold 6px ${FONT}`; c.textAlign = 'left'; c.lineWidth = 1;
  for (let x = 0; x < W; x += 10) { c.beginPath(); c.moveTo(x + 0.5, 76); c.lineTo(x + 0.5, x % 50 ? 72 : 66); c.stroke(); if (x % 100 === 0 && x) c.fillText(String(x), x + 2, 71); }
  for (let y = 80; y < H; y += 10) { c.beginPath(); c.moveTo(14, y + 0.5); c.lineTo(y % 50 ? 10 : 4, y + 0.5); c.stroke(); }
  // top bar: menus + document tab
  c.fillStyle = '#15171b'; c.fillRect(0, 0, W, 64);
  c.fillStyle = '#9aa3b5'; c.font = `bold 9px ${FONT}`; c.textAlign = 'left'; c.fillText('File   Edit   Image   Layer   Select   Filter   View', 14, 16);
  c.fillStyle = '#23262d'; rr(c, 14, 26, 230, 26, 5); c.fill(); c.fillStyle = '#e1e7f2'; c.font = `bold 9px ${FONT}`; c.fillText('GROKBUTT.png @ 100% (RGB/8) ×', 24, 43);
  c.fillStyle = '#23262d'; rr(c, 396, 26, 230, 26, 5); c.fill();
  const tools = ['✥', '⬚', '✎', '⌫', '◐'];
  tools.forEach((t, i) => { c.fillStyle = '#9aa3b5'; c.font = `bold 12px ${FONT}`; c.textAlign = 'center'; c.fillText(t, 414 + i * 26, 44); });
  c.fillStyle = '#ff4f6d'; rr(c, 544, 30, 74, 18, 4); c.fill(); c.fillStyle = '#fff0f2'; c.font = `bold 9px ${FONT}`; c.fillText('CROP ▾', 581, 43);
  c.fillStyle = '#1a1c21'; c.fillRect(W - 14, 64, 14, H);
}

// ---------- boss definition ----------
const CROP_HP = 2400;
EDEF.crop = { r: 46, hp: CROP_HP, speed: 70, dmg: 12, score: 5000, kk: 0.06, heavy: true, fixed: { x: W / 2, y: 236 }, spawnLabel: 'LOADING CROP TOOL…', cols: ['#ffd34d', '#2f6fdb', '#ff4f6d'],
  init: e => { e.bs = 'intro'; e.bt = 1.3; e.phase = 1; e.last = ''; e.tx = W / 2; e.ty = 236; e.retarget = 0; e.bface = Math.PI / 2; e.rage = 0; CT.boss = e; } };
const PHASE_NAMES = ['', 'PHASE 1 · STANDARD CROP', 'PHASE 2 · FREEFORM CROP', 'PHASE 3 · CROP TO 1:1'];

function startCrop(e) {
  const p = e.phase, w = [340, 290, 250][p - 1], h = [300, 260, 220][p - 1];
  const cx = rnd(ARENA.x + w / 2 + 12, ARENA.x + ARENA.w - w / 2 - 12), cy = rnd(ARENA.y + h / 2 + 20, ARENA.y + ARENA.h - h / 2 - 12);
  CT.crop = { st: 'warn', t: 2.3, tx: cx - w / 2, ty: cy - h / 2, tw: w, th: h, k: 0, x: ARENA.x, y: ARENA.y, w: ARENA.w, h: ARENA.h, on: 3.4 };
  pop(W / 2, 110, 'CROPPING…', '#ffd34d', 20, 1.0); SFX.swish();
}
function startSlams(e) {
  const n = e.phase + 1;
  for (let i = 0; i < n; i++) {
    let x = player.x, y = player.y;
    if (i) { const a = rnd(0, TAU), r = rnd(60, 150); x = clamp(player.x + Math.cos(a) * r, B.l + 40, B.r - 40); y = clamp(player.y + Math.sin(a) * r, 110, B.b - 30); }
    CT.slams.push({ x, y, t: 0.95 + i * 0.24, tot: 0.95 + i * 0.24, corner: i % 4, hit: 0 });
  }
  pop(e.x, e.y - 80, 'HANDLES!', '#ffd34d', 16, 0.8);
}
function startScissors(e) { const s = CT.sc; s.n = e.phase === 1 ? 1 : e.phase; s.st = 'aim'; s.t = 0.8; SFX.swish(); pop(e.x, e.y - 80, 'SNIP SNIP', '#ff9a3d', 16, 0.8); }
function summon(e) {
  const kinds = e.phase === 3 ? ['popup', 'badge', 'crdl'] : ['zombie', 'badge', 'spam'];
  kinds.forEach((type, i) => { let x, y, n = 0; do { x = rnd(B.l + 50, B.r - 50); y = rnd(120, B.b - 50); n++; } while (Math.hypot(x - player.x, y - player.y) < 170 && n < 30); spawns.push({ type, x, y, t: 0.9 + i * 0.2 }); });
  pop(e.x, e.y - 80, 'PASTE ×3', '#7fe3a1', 16, 0.8);
}
EAI.crop = (e, dt, dx, dy, d) => {
  CT.boss = e;
  const hpk = e.hp / e.maxhp, ph = hpk > 0.66 ? 1 : hpk > 0.33 ? 2 : 3;
  if (ph > e.phase) { // phase change: shake, flash, cancel the current move
    e.phase = ph; e.rage = 1.2; e.bs = 'idle'; e.bt = 1.0; addShake(14); SFX.over();
    pop(W / 2, 170, PHASE_NAMES[ph], '#ff4f6d', 22, 2.0);
    if (ph === 3) summon(e);
  }
  if (e.rage > 0) e.rage -= dt;
  const fast = 1 + (e.phase - 1) * 0.25;
  e.bt -= dt;
  const busy = e.bs === 'atk';
  e.bface += angDiff(e.bface, Math.atan2(dy, dx)) * Math.min(1, dt * (busy ? 0.6 : 1.5)); // slow turn: get behind it!
  // where to hover: keep ~150 px from GrokButt; sit inside its own crop while it is active
  e.retarget -= dt;
  if (CT.crop && CT.crop.st === 'on') { e.tx = CT.crop.x + CT.crop.w / 2; e.ty = CT.crop.y + CT.crop.h / 2; }
  else if (e.retarget <= 0) { e.retarget = rnd(1.0, 1.6); const a = rnd(0, TAU); e.tx = clamp(player.x + Math.cos(a) * 150, B.l + 70, B.r - 70); e.ty = clamp(player.y + Math.sin(a) * 150, 140, B.b - 70); }
  const mx = e.tx - e.x, my = e.ty - e.y, md = Math.hypot(mx, my) || 1, sp = (busy ? 28 : 70) * fast;
  if (e.bs !== 'intro' && md > 8) { e.mvx = mx / md * sp; e.mvy = my / md * sp; }
  if (e.bs === 'intro') { if (e.bt <= 0) { e.bs = 'idle'; e.bt = 0.6; pop(W / 2, 150, 'TIP: BUTT THE PINK LOCK ON ITS BACK', '#ff9fd0', 15, 2.4); } return; }
  if (e.bs === 'atk') { if (e.bt <= 0) { e.bs = 'idle'; e.bt = rnd(0.8, 1.3) / fast; } return; }
  if (e.bt > 0) return;
  const opts = e.phase === 1 ? ['crop', 'slam', 'slam'] : ['crop', 'slam', 'scissors', 'summon', 'scissors'];
  let pickA, n = 0;
  do { pickA = pick(opts); n++; } while (n < 12 && (pickA === e.last || (pickA === 'crop' && CT.crop) || (pickA === 'summon' && enemies.length > 5) || (pickA === 'scissors' && CT.sc.st !== 'idle')));
  e.last = pickA; e.bs = 'atk';
  if (pickA === 'crop') { startCrop(e); e.bt = e.phase === 1 ? 5.9 : 2.6; if (e.phase === 3) startScissors(e); }
  else if (pickA === 'slam') { startSlams(e); e.bt = 1.0 + 0.24 * (e.phase + 1) + 0.3; }
  else if (pickA === 'scissors') { startScissors(e); e.bt = CT.sc.n * 1.25 + 0.5; }
  else { summon(e); e.bt = 1.1; }
};
EDMG.crop = (e, dmg, kx, ky, src) => {
  if (e.bs === 'intro') return 0.3;
  const toP = Math.atan2(player.y - e.y, player.x - e.x), behind = Math.abs(angDiff(e.bface, toP)) > 1.9;
  let m = 1;
  if (src === 'bump') m *= 1.5;
  if (behind) m *= 2;
  const melee = src === 'bump' || src === 'sword' || src === 'lance';
  if (m > 1 && (melee || Math.random() < 0.2)) pop(e.x + rnd(-12, 12), e.y - 70, behind ? (src === 'bump' ? 'WEAK POINT! x3' : 'WEAK POINT! x2') : 'BUTT CRIT!', behind ? '#ff7ac0' : '#ffd34d', behind ? 20 : 17, 0.6);
  return m;
};
EKILL.crop = e => { // the frame shatters
  CT.outro = { t: 0, x: e.x, y: e.y }; CT.crop = null; CT.slams.length = 0; CT.sc.st = 'gone';
  outroT = 3.4;
  for (const o of enemies) if (o !== e && !o.dead) { o.dead = true; burst(o.x, o.y, 4, ['#ffd34d', '#ff4f6d'], 160); }
  spawns.length = 0; ebullets.length = 0; parts.length = 0; loot.length = 0;
  SFX.shatter(); addShake(18); hitstop = 0.12;
  for (let i = 0; i < 70; i++) { const a = rnd(0, TAU), s = rnd(80, 420); parts.push({ x: e.x + rnd(-40, 40), y: e.y + rnd(-50, 40), vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.9, 1.8), t: 0, col: pick(['#ffd34d', '#2f6fdb', '#9fd0ff', '#e1e7f2', '#ff7ac0']), sz: rnd(4, 10), kind: 'shard', rot: rnd(0, TAU) }); }
  pop(W / 2, H / 2 - 90, 'CROPPED… NOT!', '#ffd34d', 36, 2.4);
  pop(W / 2, H / 2 - 50, 'GROKBUTT stays in the picture', '#e1e7f2', 16, 2.4);
  return true;
};

// ---------- hazards update ----------
function bossUpdate(dt) {
  CT.anim += dt;
  if (CT.outro) { CT.outro.t += dt; return; }
  const p = player, e = CT.boss && !CT.boss.dead ? CT.boss : null;
  const cr = CT.crop;
  if (cr) {
    cr.t -= dt;
    if (cr.st === 'warn') { cr.k = 1 - cr.t / 2.3; if (cr.t <= 0) { cr.st = 'on'; cr.t = cr.on; cr.k = 1; addShake(6); SFX.bonk(); } }
    else if (cr.st === 'on') { if (cr.t <= 0) { cr.st = 'off'; cr.t = 0.5; } }
    else { cr.k = cr.t / 0.5; if (cr.t <= 0) CT.crop = null; }
    const k = cr.k * cr.k * (3 - 2 * cr.k);
    cr.x = lerp(ARENA.x, cr.tx, k); cr.y = lerp(ARENA.y, cr.ty, k); cr.w = lerp(ARENA.w, cr.tw, k); cr.h = lerp(ARENA.h, cr.th, k);
    if (cr.st === 'on' && CT.crop) {
      const m = p.r * 0.5, inside = p.x > cr.x + m && p.x < cr.x + cr.w - m && p.y > cr.y + m && p.y < cr.y + cr.h - m;
      if (!inside) { const was = p.inv, cx = cr.x + cr.w / 2, cy = cr.y + cr.h / 2; hurtPlayer(9, p.x + (p.x - cx), p.y + (p.y - cy)); if (was <= 0 && p.inv > 0) pop(p.x, p.y - 60, 'OUT OF FRAME!', '#ff4f6d', 15, 0.8); }
    }
  }
  for (const s of CT.slams) {
    s.t -= dt;
    if (s.t <= 0 && !s.hit) {
      s.hit = 0.35; SFX.boom(); addShake(9); burst(s.x, s.y, 10, ['#ffd34d', '#2a2d36'], 220);
      if (Math.hypot(p.x - s.x, p.y - s.y) < 54 + p.r * 0.4) hurtPlayer(14, s.x, s.y);
    }
    if (s.hit) { s.hit -= dt; if (s.hit <= 0) s.dead = true; }
  }
  prune(CT.slams, notDead);
  const sc = CT.sc;
  if (sc.st === 'gone') return;
  if (sc.st === 'idle' || sc.st === 'ret') { // orbit the boss
    const bx = e ? e.x + Math.cos(CT.anim * 1.5) * 78 : W / 2, by = e ? e.y + Math.sin(CT.anim * 1.5) * 40 - 20 : 160;
    if (sc.st === 'ret') { const dx = bx - sc.x, dy = by - sc.y, d = Math.hypot(dx, dy) || 1; sc.x += dx / d * Math.min(d, 420 * dt); sc.y += dy / d * Math.min(d, 420 * dt); if (d < 10) sc.st = 'idle'; }
    else { sc.x = lerp(sc.x, bx, Math.min(1, dt * 6)); sc.y = lerp(sc.y, by, Math.min(1, dt * 6)); }
    sc.a += angDiff(sc.a, Math.atan2(p.y - sc.y, p.x - sc.x)) * Math.min(1, dt * 4); sc.snip = Math.abs(Math.sin(CT.anim * 3)) * 0.3;
  } else if (sc.st === 'aim') {
    sc.t -= dt; sc.snip = Math.abs(Math.sin(CT.anim * 18)) * 0.6;
    if (sc.t > 0.25) { sc.a = Math.atan2(p.y - sc.y, p.x - sc.x); }
    if (sc.t <= 0) { sc.st = 'dash'; sc.dx = Math.cos(sc.a); sc.dy = Math.sin(sc.a); sc.t = 1.6; SFX.swish(); }
  } else if (sc.st === 'dash') {
    sc.t -= dt; sc.x += sc.dx * 720 * dt; sc.y += sc.dy * 720 * dt; sc.snip = Math.abs(Math.sin(CT.anim * 30)) * 0.7;
    if (Math.random() < 0.5 && parts.length < 120) parts.push({ x: sc.x, y: sc.y, vx: rnd(-30, 30), vy: rnd(-30, 30), life: 0.3, t: 0, col: '#c9ccd1', sz: 3, kind: 'sq', rot: 0 });
    if (Math.hypot(p.x - sc.x, p.y - sc.y) < 22 + p.r - 4) { const was = p.inv; hurtPlayer(14, sc.x - sc.dx * 30, sc.y - sc.dy * 30); if (was <= 0 && p.inv > 0) pop(p.x, p.y - 60, 'SNIPPED!', '#ff9a3d', 15, 0.7); }
    const out = sc.x < B.l + 10 || sc.x > B.r - 10 || sc.y < B.t + 10 || sc.y > B.b - 10;
    if (out || sc.t <= 0) { sc.x = clamp(sc.x, B.l + 12, B.r - 12); sc.y = clamp(sc.y, B.t + 12, B.b - 12); sc.n--; if (sc.n > 0) { sc.st = 'aim'; sc.t = 0.6; } else sc.st = 'ret'; }
  }
}

// ---------- drawing ----------
function drawCornerL(c, x, y, rot, s, col = '#ffd34d') { // a crop-frame corner handle
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.fillStyle = '#0a0a12'; c.fillRect(-4, -4, 36, 14); c.fillRect(-4, -4, 14, 36);
  c.fillStyle = col; c.fillRect(-1, -1, 30, 8); c.fillRect(-1, -1, 8, 30);
  c.restore();
}
function bossDrawFloor(c) {
  const cr = CT.crop;
  if (cr) { // darken everything outside the crop
    const a = cr.st === 'on' ? 0.55 + 0.08 * Math.sin(CT.anim * 10) : 0.38 * cr.k;
    c.fillStyle = cr.st === 'on' ? `rgba(70,0,20,${a})` : `rgba(0,0,0,${a})`;
    c.fillRect(0, 64, W, cr.y - 64); c.fillRect(0, cr.y + cr.h, W, H - cr.y - cr.h); c.fillRect(0, cr.y, cr.x, cr.h); c.fillRect(cr.x + cr.w, cr.y, W - cr.x - cr.w, cr.h);
  }
  for (const s of CT.slams) { // landing marks
    if (s.hit) { const k = 1 - s.hit / 0.35; c.strokeStyle = `rgba(255,211,77,${1 - k})`; c.lineWidth = 6; c.beginPath(); c.ellipse(s.x, s.y, 54 + k * 40, (54 + k * 40) * 0.6, 0, 0, TAU); c.stroke(); continue; }
    const k = 1 - clamp(s.t / s.tot, 0, 1);
    c.fillStyle = `rgba(255,60,60,${0.12 + k * 0.2})`; c.beginPath(); c.ellipse(s.x, s.y, 54, 34, 0, 0, TAU); c.fill();
    c.strokeStyle = '#ff4f6d'; c.lineWidth = 2; c.setLineDash([6, 4]); c.beginPath(); c.ellipse(s.x, s.y, 54, 34, 0, 0, TAU); c.stroke(); c.setLineDash([]);
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(s.x, s.y, 20 + k * 22, (20 + k * 22) * 0.5, 0, 0, TAU); c.fill();
  }
  const sc = CT.sc;
  if (sc.st === 'aim') { // dash line telegraph
    const L = 900; c.strokeStyle = `rgba(255,79,109,${0.5 + 0.4 * Math.sin(CT.anim * 30)})`; c.lineWidth = 3; c.setLineDash([12, 8]);
    c.beginPath(); c.moveTo(sc.x, sc.y); c.lineTo(sc.x + Math.cos(sc.a) * L, sc.y + Math.sin(sc.a) * L); c.stroke(); c.setLineDash([]);
  }
}
function drawScissors(c, x, y, a, open) {
  c.save(); c.translate(x, y); c.rotate(a);
  for (const s of [-1, 1]) {
    c.save(); c.rotate(s * open * 0.5);
    c.fillStyle = '#b8bec8'; c.beginPath(); c.moveTo(0, 0); c.lineTo(34, -s * 3); c.lineTo(36, 0); c.lineTo(4, s * 5); c.closePath(); c.fill(); c.strokeStyle = '#1a1d24'; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = '#e8572f'; c.lineWidth = 5; c.beginPath(); c.ellipse(-14, s * 7, 9, 6, 0, 0, TAU); c.stroke();
    c.restore();
  }
  c.fillStyle = '#2a2d36'; c.beginPath(); c.arc(0, 0, 3, 0, TAU); c.fill();
  c.restore();
}
EDRAW.crop = (c, e, fl) => {
  const hover = 12 + Math.sin(e.t * 2) * 4, shake = e.phase === 3 ? Math.sin(e.t * 50) * 1.2 : 0;
  c.translate(shake, -hover);
  const back = e.bface + Math.PI, lx = Math.cos(back) * 64, ly = Math.sin(back) * 58 - 4;
  const drawLock = () => { // weak point: aspect-ratio padlock on its back
    const pul = 0.5 + 0.5 * Math.sin(e.t * 6);
    const g = c.createRadialGradient(lx, ly, 2, lx, ly, 30); g.addColorStop(0, `rgba(255,95,170,${0.55 + pul * 0.3})`); g.addColorStop(1, 'rgba(255,95,170,0)');
    c.fillStyle = g; c.beginPath(); c.arc(lx, ly, 30, 0, TAU); c.fill();
    c.strokeStyle = '#3a0a22'; c.lineWidth = 5; c.beginPath(); c.arc(lx, ly - 6, 7, Math.PI, 0); c.stroke();
    c.strokeStyle = '#ff9fd0'; c.lineWidth = 2.5; c.beginPath(); c.arc(lx, ly - 6, 7, Math.PI, 0); c.stroke();
    c.fillStyle = '#ff5fa2'; rr(c, lx - 11, ly - 6, 22, 17, 4); c.fill(); c.strokeStyle = '#3a0a22'; c.lineWidth = 1.6; rr(c, lx - 11, ly - 6, 22, 17, 4); c.stroke();
    c.fillStyle = '#3a0a22'; c.fillRect(lx - 1.5, ly, 3, 6);
    c.textAlign = 'center'; otext(c, 'WEAK SPOT', lx, ly + 24, '#ff9fd0', 8, 3);
  };
  const tint = fl ? '#ffffff' : null, rage = e.rage > 0 && Math.sin(e.t * 30) > 0;
  // dark canvas panel with the angry face
  c.fillStyle = '#141a2a'; rr(c, -26, -32, 54, 58, 6); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-8, -32); c.lineTo(-8, 26); c.moveTo(10, -32); c.lineTo(10, 26); c.moveTo(-26, -13); c.lineTo(28, -13); c.moveTo(-26, 7); c.lineTo(28, 7); c.stroke();
  // L bracket A (yellow, corner bottom-left) and B (blue, corner top-right)
  const LA = tint || (rage ? '#ff4f6d' : '#ffd34d'), LB = tint || (rage ? '#ff4f6d' : '#2f6fdb');
  c.fillStyle = '#0a0a12'; c.fillRect(-42, -60, 20, 104); c.fillRect(-42, 24, 92, 20);
  c.fillStyle = LA; c.fillRect(-39, -57, 14, 98); c.fillRect(-39, 27, 86, 14);
  c.fillStyle = '#0a0a12'; c.fillRect(24, -50, 20, 106); c.fillRect(-52, -50, 96, 20);
  c.fillStyle = LB; c.fillRect(27, -47, 14, 100); c.fillRect(-49, -47, 90, 14);
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(-39, 34, 86, 7); c.fillRect(-49, -40, 90, 7);
  // eyes + snippy mouth
  c.fillStyle = '#ff4f6d';
  c.beginPath(); c.moveTo(-20, -24); c.lineTo(-3, -16); c.lineTo(-5, -11); c.lineTo(-20, -17); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(22, -24); c.lineTo(5, -16); c.lineTo(7, -11); c.lineTo(22, -17); c.closePath(); c.fill();
  const mo = Math.abs(Math.sin(e.t * (e.bs === 'atk' ? 14 : 4))) * 4;
  c.fillStyle = '#05070d'; c.fillRect(-16, 1, 34, 10 + mo);
  c.fillStyle = '#c9ccd1'; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-16 + i * 7, 1); c.lineTo(-12.5 + i * 7, 6); c.lineTo(-9 + i * 7, 1); c.fill(); c.beginPath(); c.moveTo(-16 + i * 7, 11 + mo); c.lineTo(-12.5 + i * 7, 6 + mo); c.lineTo(-9 + i * 7, 11 + mo); c.fill(); }
  drawLock(); // always drawn on top so the weak spot stays readable from the top-down camera
};
function bossDrawTop(c) {
  const cr = CT.crop;
  if (cr) { // frame, thirds grid, corner handles, size label
    c.save();
    c.strokeStyle = cr.st === 'on' ? '#ff4f6d' : '#e1e7f2'; c.lineWidth = 2; c.setLineDash([8, 6]); c.lineDashOffset = -CT.anim * 30; c.strokeRect(cr.x, cr.y, cr.w, cr.h); c.setLineDash([]);
    c.strokeStyle = 'rgba(225,231,242,0.25)'; c.lineWidth = 1; c.beginPath();
    for (const f of [1 / 3, 2 / 3]) { c.moveTo(cr.x + cr.w * f, cr.y); c.lineTo(cr.x + cr.w * f, cr.y + cr.h); c.moveTo(cr.x, cr.y + cr.h * f); c.lineTo(cr.x + cr.w, cr.y + cr.h * f); }
    c.stroke();
    const s = 1.1;
    drawCornerL(c, cr.x, cr.y, 0, s); drawCornerL(c, cr.x + cr.w, cr.y, Math.PI / 2, s); drawCornerL(c, cr.x + cr.w, cr.y + cr.h, Math.PI, s); drawCornerL(c, cr.x, cr.y + cr.h, -Math.PI / 2, s);
    c.textAlign = 'left'; otext(c, `${Math.round(cr.w)} × ${Math.round(cr.h)}`, cr.x + 8, cr.y + 52, '#e1e7f2', 10, 3);
    c.textAlign = 'center';
    if (cr.st === 'warn') otext(c, `STAY INSIDE THE CROP! ${Math.ceil(cr.t)}`, cr.x + cr.w / 2, cr.y + 30, '#ffd34d', 15, 5);
    else if (cr.st === 'on') otext(c, 'OUTSIDE = CROPPED', cr.x + cr.w / 2, cr.y - 10 < 80 ? cr.y + cr.h + 20 : cr.y - 10, '#ff8a8a', 12, 4);
    c.restore();
  }
  for (const s of CT.slams) { // handles dropping from above
    if (s.hit) continue;
    if (s.t > 0.45) { c.textAlign = 'center'; otext(c, '▼', s.x, s.y - 30 - Math.abs(Math.sin(CT.anim * 8)) * 6, '#ff4f6d', 18, 4); continue; }
    drawCornerL(c, s.x - 22, s.y - 22 - (s.t / 0.45) * 260, 0, 1.5, '#ffd34d'); // handle drops in the last moment
  }
  const sc = CT.sc;
  if (sc.st !== 'gone' && CT.boss) drawScissors(c, sc.x, sc.y, sc.a, sc.snip); // scissors appear with the boss
  if (CT.outro) { // the frame flies apart
    const t = CT.outro.t, o = CT.outro;
    c.save(); c.globalAlpha = clamp(1 - t / 1.6, 0, 1);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, d = t * 260; drawCornerL(c, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d - t * 40, i * Math.PI / 2 + t * 4, 2.2, i % 2 ? '#2f6fdb' : '#ffd34d'); }
    c.restore();
    if (t < 0.25) { c.fillStyle = `rgba(255,255,255,${0.7 * (1 - t / 0.25)})`; c.fillRect(0, 0, W, H); }
    if (outroT < 0.9) { c.fillStyle = `rgba(20,40,90,${clamp(1 - outroT / 0.9, 0, 1)})`; c.fillRect(0, 0, W, H); }
  }
}
function bossHUD(c) {
  const e = CT.boss; if (!e || e.dead || CT.outro) return;
  const x = 238, y = 8, w = 238; // top centre, between the HP and score panels (no door in this room)
  panel(c, x, y, w, 44);
  c.textAlign = 'left'; c.fillStyle = '#ff4f6d'; c.font = `13px ${FONT}`; c.fillText('THE CROP TOOL', x + 12, y + 18);
  c.textAlign = 'right'; c.fillStyle = '#cfd6e2'; c.font = `bold 10px ${FONT}`; c.fillText(`PHASE ${e.phase}/3`, x + w - 12, y + 18);
  c.fillStyle = '#2a0f16'; rr(c, x + 12, y + 26, w - 24, 11, 5); c.fill();
  const k = clamp(e.hp / e.maxhp, 0, 1); c.fillStyle = e.phase === 3 ? '#ff4f6d' : e.phase === 2 ? '#ff9a3d' : '#ffd34d'; if (k > 0) { rr(c, x + 12, y + 26, Math.max(10, (w - 24) * k), 11, 5); c.fill(); }
  c.fillStyle = '#0a0a12'; for (const f of [1 / 3, 2 / 3]) c.fillRect(x + 12 + (w - 24) * f - 1, y + 25, 2, 13);
}

ROOMS.push({
  key: 'boss', name: 'THE CROP TOOL', sub: 'It wants you out of the picture. Literally.', seed: 77, boss: true, clearCol: true,
  door: '', doorCol: '#ff4f6d', clear: '', tombs: [], waves: [{ crop: 1 }],
  bg: bgEditor, enter: bossReset, reset: bossReset, update: bossUpdate, drawFloor: bossDrawFloor, drawTop: bossDrawTop, drawHUD: bossHUD,
});
