/* GROKBUTT stages 3-6: Downloads Folder, CAPTCHA Maze, Trash Bin, Notification Storm.
   Loaded after game.js (shares its global scope). Every stage: matte floor art pre-rendered once,
   3 waves, its own hazards (telegraphed, never instant death), new enemy types. */
'use strict';

// ---------- shared helpers ----------
function otext(c, t, x, y, col, size, lw = 4, stroke = '#0a0a12') {
  c.font = `bold ${size}px ${FONT}`; c.lineJoin = 'round'; c.lineWidth = lw; c.strokeStyle = stroke; c.strokeText(t, x, y); c.fillStyle = col; c.fillText(t, x, y);
}
function circRect(px, py, r, x, y, w, h) { const cx = clamp(px, x, x + w), cy = clamp(py, y, y + h); return (px - cx) * (px - cx) + (py - cy) * (py - cy) < r * r; }
function docPath(c, x, y, w, h, f) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + w - f, y); c.lineTo(x + w, y + f); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); }
function angryEyes(c, x, y, s = 1, col = '#18120a') { // triangular angry eyes (enemies never get GrokButt's pill eyes)
  c.fillStyle = col;
  c.beginPath(); c.moveTo(x - 9 * s, y - 4 * s); c.lineTo(x - 2 * s, y); c.lineTo(x - 9 * s, y + 2 * s); c.fill();
  c.beginPath(); c.moveTo(x + 9 * s, y - 4 * s); c.lineTo(x + 2 * s, y); c.lineTo(x + 9 * s, y + 2 * s); c.fill();
}
function backWall(c, c1, c2) { const g = c.createLinearGradient(0, 0, 0, 62); g.addColorStop(0, c1); g.addColorStop(1, c2); c.fillStyle = g; c.fillRect(0, 0, W, 62); c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(0, 58, W, 6); }
function wallPattern(c, col, kind) { // repeating back-wall detail (the HUD covers most of the wall, so no long text here)
  c.fillStyle = col;
  for (let x = 10; x < W; x += 30) {
    if (kind === 'folders') { rr(c, x, 26, 22, 16, 2); c.fill(); c.fillRect(x, 22, 9, 5); }
    else if (kind === 'checks') { c.fillRect(x + 2, 24, 16, 16); }
    else if (kind === 'ribs') { c.fillRect(x, 10, 6, 46); }
    else { rr(c, x, 28, 24, 12, 6); c.fill(); }
  }
}
function floorGrad(c, a, b) { const g = c.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 480); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, W, H); }
function progressBar(c, x, y, w, h, k, col = '#3ccf6e') {
  c.fillStyle = '#0a0f1a'; rr(c, x, y, w, h, h / 2); c.fill();
  c.fillStyle = col; rr(c, x + 1.5, y + 1.5, Math.max(h, (w - 3) * k), h - 3, (h - 3) / 2); c.fill();
  c.save(); rr(c, x + 1.5, y + 1.5, (w - 3) * k, h - 3, (h - 3) / 2); c.clip(); c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = h * 0.35;
  for (let i = -h; i < w; i += h * 1.2) { c.beginPath(); c.moveTo(x + i, y + h); c.lineTo(x + i + h, y); c.stroke(); } c.restore();
}
function sideRails(c, col, col2) { for (let y = 76; y < H; y += 34) for (const x of [0, W - 14]) { c.fillStyle = col; rr(c, x, y, 14, 28, 3); c.fill(); c.fillStyle = col2; c.fillRect(x + 4, y + 5, 6, 3); c.fillRect(x + 4, y + 12, 6, 3); } }
function vEnemyHP(c, e, w, y) { if (e.hp < e.maxhp) { c.fillStyle = '#000'; c.fillRect(-w / 2, y, w, 3); c.fillStyle = '#3ccf6e'; c.fillRect(-w / 2, y, w * clamp(e.hp / e.maxhp, 0, 1), 3); } }

// =====================================================================
// STAGE 3: THE DOWNLOADS FOLDER
// =====================================================================
function drawKiosk(c, R, t) { // a monitor on a stand, stuck at 99%
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(4, 26, 50, 11, 0, 0, TAU); c.fill();
  c.fillStyle = '#2a3140'; c.fillRect(-6, 10, 12, 14); rr(c, -24, 20, 48, 7, 3); c.fill();
  c.fillStyle = '#1b2130'; rr(c, -48, -38, 96, 52, 6); c.fill(); c.strokeStyle = '#0a0d14'; c.lineWidth = 2; rr(c, -48, -38, 96, 52, 6); c.stroke();
  c.fillStyle = '#0f2440'; rr(c, -42, -33, 84, 42, 3); c.fill();
  c.textAlign = 'center'; c.fillStyle = '#9fd0ff'; c.font = `bold 8px ${FONT}`; c.fillText(t.label, 0, -21);
  progressBar(c, -36, -15, 72, 9, 0.99, '#3ccf6e');
  c.fillStyle = '#e1e7f2'; c.font = `bold 9px ${FONT}`; c.fillText('99%', -16, 4); c.fillStyle = '#ff8a8a'; c.font = `bold 7px ${FONT}`; c.fillText(t.eta, 18, 3);
}
function drawHalfFiles(c, R, t) { // file icons whose bottom half never arrived (checkerboard = missing data)
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(4, 24, 46, 10, 0, 0, TAU); c.fill();
  const types = [['MP4', '#c45a4a'], ['ZIP', '#5f9c66'], ['PDF', '#d07b2c'], ['ISO', '#5b6fd6']];
  for (let i = 0; i < 4; i++) {
    c.save(); c.translate(-26 + i * 17 + (R() - 0.5) * 6, -6 + (i % 2) * 8); c.rotate((R() - 0.5) * 0.5);
    const [lbl, col] = types[(i + t.k) % 4];
    c.save(); docPath(c, -14, -18, 28, 36, 8); c.clip();
    c.fillStyle = col; c.fillRect(-14, -18, 28, 17);
    for (let yy = -1; yy < 18; yy += 4) for (let xx = -14; xx < 14; xx += 4) { c.fillStyle = ((xx + yy) / 4 & 1) ? '#5d6370' : '#3d424c'; c.fillRect(xx, yy, 4, 4); }
    c.restore();
    c.strokeStyle = '#0d1018'; c.lineWidth = 1.5; docPath(c, -14, -18, 28, 36, 8); c.stroke();
    c.strokeStyle = '#ff6b5e'; c.beginPath(); c.moveTo(-14, -1); for (let xx = -14; xx <= 14; xx += 4) c.lineTo(xx, -1 + ((xx / 4) & 1 ? 2 : -2)); c.stroke();
    c.fillStyle = 'rgba(255,245,230,0.92)'; c.font = `bold 7px ${FONT}`; c.textAlign = 'center'; c.fillText(lbl, 0, -7);
    c.restore();
  }
  c.fillStyle = '#ffd34d'; c.font = `bold 8px ${FONT}`; c.textAlign = 'center'; c.fillText('.part .part .part', 0, 30);
}
function bgDownloads(c, R) {
  floorGrad(c, '#1f2b40', '#0b111c');
  for (let y = 70; y < H; y += 48) for (let x = 0; x < W; x += 48) { // folder-grid carpet with faint download arrows
    c.strokeStyle = 'rgba(120,170,255,0.06)'; c.lineWidth = 1.5; c.strokeRect(x + 3, y + 3, 42, 42);
    if (((x + y) / 48) % 3 === 0) { c.fillStyle = 'rgba(120,170,255,0.07)'; c.beginPath(); c.moveTo(x + 18, y + 12); c.lineTo(x + 30, y + 12); c.lineTo(x + 30, y + 24); c.lineTo(x + 36, y + 24); c.lineTo(x + 24, y + 36); c.lineTo(x + 12, y + 24); c.lineTo(x + 18, y + 24); c.fill(); }
  }
  const cols = ['#5b6fd6', '#c45a4a', '#5f9c66', '#d07b2c', '#8c5fb0'];
  for (let i = 0; i < 18; i++) { // dropped half-files
    c.save(); c.translate(30 + R() * (W - 60), 100 + R() * (H - 130)); c.rotate((R() - 0.5) * 1.4); c.globalAlpha = 0.75;
    c.fillStyle = cols[Math.floor(R() * 5)]; c.fillRect(-7, -9, 14, 9); c.fillStyle = '#4a4f5a'; c.fillRect(-7, 0, 14, 9); c.fillStyle = '#353943'; c.fillRect(-7, 0, 7, 4.5); c.fillRect(0, 4.5, 7, 4.5);
    c.restore();
  }
  for (let i = 0; i < 7; i++) { // stuck progress bars painted on the floor
    c.save(); c.translate(60 + R() * (W - 120), 110 + R() * (H - 160)); c.rotate((R() - 0.5) * 0.6); c.globalAlpha = 0.55;
    progressBar(c, -30, -4, 60, 8, 0.99, '#2f6fdb'); c.fillStyle = '#9fb4d8'; c.font = `bold 7px ${FONT}`; c.textAlign = 'center'; c.fillText('99%', 0, 14);
    c.restore();
  }
  backWall(c, '#14203a', '#1c2c4c'); wallPattern(c, '#2a4270', 'folders');
  sideRails(c, '#16233c', '#6fb3ff');
  c.save(); c.translate(130, 612); c.fillStyle = '#26344f'; rr(c, -58, -12, 116, 24, 6); c.fill(); c.fillStyle = '#9fd0ff'; c.font = `bold 10px ${FONT}`; c.textAlign = 'center'; c.fillText('~/Downloads', 0, 4); c.restore();
  c.save(); c.translate(490, 610); // the download that never ends
  c.fillStyle = '#0c1424'; rr(c, -92, -16, 184, 32, 6); c.fill(); c.strokeStyle = '#2f4a7a'; c.lineWidth = 1.5; rr(c, -92, -16, 184, 32, 6); c.stroke();
  c.fillStyle = '#cfe0ff'; c.font = `bold 8px ${FONT}`; c.textAlign = 'left'; c.fillText('GrokButt_FINAL_final(3).zip', -84, -4);
  progressBar(c, -84, 2, 120, 8, 0.99, '#3ccf6e'); c.fillStyle = '#e1e7f2'; c.font = `bold 8px ${FONT}`; c.fillText('99% · 2h', 42, 10);
  c.restore();
}
const DL = { wx: 320, wy: 330, wk: 0, t: 0, spin: 0 };
function dlReset() { DL.wk = 0; DL.t = 0; }
function dlUpdate(dt) {
  DL.wk = clamp(DL.wk + (hazardsLive() ? dt * 0.8 : -dt * 1.6), 0, 1);
  DL.spin += dt;
  if (DL.wk <= 0) return;
  DL.t += dt * (0.8 + Math.max(0, waveIdx) * 0.18);
  DL.wx = 320 + 150 * Math.sin(DL.t * 0.33); DL.wy = 340 + 125 * Math.sin(DL.t * 0.5 + 1);
  if (DL.wk > 0.85 && Math.hypot(player.x - DL.wx, player.y - DL.wy) < 34 + player.r) { const was = player.inv; hurtPlayer(10, DL.wx, DL.wy); if (was <= 0 && player.inv > 0) pop(player.x, player.y - 60, 'BUFFERING…', '#6fb3ff', 14, 0.8); }
}
function dlDrawTop(c) { // the giant loading wheel: floats, spins, hurts on contact. Dashed red ring = danger.
  if (DL.wk <= 0) return;
  const k = DL.wk, x = DL.wx, y = DL.wy, lift = 16;
  c.save();
  c.globalAlpha = 0.35 * k; c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, y + 10, 40 * k, 13 * k, 0, 0, TAU); c.fill();
  c.globalAlpha = k; c.strokeStyle = 'rgba(255,79,109,0.8)'; c.lineWidth = 2; c.setLineDash([6, 5]); c.lineDashOffset = -DL.spin * 20;
  c.beginPath(); c.ellipse(x, y + 10, 48, 17, 0, 0, TAU); c.stroke(); c.setLineDash([]);
  c.translate(x, y - lift); c.scale(k, k);
  const step = Math.floor(DL.spin * 12);
  c.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU, ca = Math.cos(a), sa = Math.sin(a), al = ((i - step) % 12 + 12) % 12 / 11;
    c.strokeStyle = '#08142a'; c.lineWidth = 12; c.beginPath(); c.moveTo(ca * 17, sa * 17); c.lineTo(ca * 36, sa * 36); c.stroke();
    c.strokeStyle = `rgba(${Math.round(60 + 80 * al)},${Math.round(110 + 90 * al)},255,1)`; c.lineWidth = 8; c.beginPath(); c.moveTo(ca * 17, sa * 17); c.lineTo(ca * 36, sa * 36); c.stroke();
  }
  c.restore();
  c.save(); c.globalAlpha = k; c.textAlign = 'center'; otext(c, 'PLEASE WAIT…', x, y + 40, '#9fd0ff', 10, 4); c.restore();
}

// --- .crdownload file: walks, freezes to "buffer", then lunges
EDEF.crdl = { r: 16, hp: 34, speed: 72, dmg: 10, score: 120, drop: 0.16, cols: ['#c9dbf2', '#2f6fdb', '#3ccf6e'], init: e => { e.mode = 0; e.wt = rnd(1.2, 2.2); e.lx = 0; e.ly = 0; } };
EAI.crdl = (e, dt, dx, dy, d) => {
  e.wt -= dt;
  if (e.mode === 0) { e.mvx = dx / d * 72; e.mvy = dy / d * 72; if (e.wt <= 0) { e.mode = 1; e.wt = 0.85; } }
  else if (e.mode === 1) { if (e.wt <= 0) { e.mode = 2; e.wt = 0.38; e.lx = dx / d; e.ly = dy / d; SFX.enemyShot(); } }
  else { e.mvx = e.lx * 330; e.mvy = e.ly * 330; if (e.wt <= 0) { e.mode = 0; e.wt = rnd(1.6, 2.6); } }
};
EDRAW.crdl = (c, e, fl) => {
  c.translate(0, -Math.abs(Math.sin(e.t * 9)) * (e.mode === 1 ? 0 : 2));
  if (e.mode === 2) { c.strokeStyle = 'rgba(159,208,255,0.6)'; c.lineWidth = 2; for (const o of [-8, 0, 8]) { c.beginPath(); c.moveTo(-e.lx * 18 + o * e.ly, -e.ly * 18 - o * e.lx); c.lineTo(-e.lx * 34 + o * e.ly, -e.ly * 34 - o * e.lx); c.stroke(); } }
  c.fillStyle = fl ? '#ffffff' : '#c9dbf2'; docPath(c, -14, -18, 28, 34, 9); c.fill();
  c.fillStyle = '#93abcc'; c.beginPath(); c.moveTo(5, -18); c.lineTo(5, -9); c.lineTo(14, -9); c.closePath(); c.fill();
  c.strokeStyle = '#1d2b4a'; c.lineWidth = 1.6; docPath(c, -14, -18, 28, 34, 9); c.stroke();
  angryEyes(c, 0, -5, 0.8);
  progressBar(c, -11, 6, 22, 6, 0.99, e.mode === 1 ? '#f3c84a' : '#3ccf6e');
  c.textAlign = 'center'; otext(c, '.crdownload', 0, 27, '#9fd0ff', 7, 3);
  if (e.mode === 1) { c.strokeStyle = '#ffd34d'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.arc(0, -30, 6, e.t * 9, e.t * 9 + 4.2); c.stroke(); c.lineCap = 'butt'; }
  vEnemyHP(c, e, 28, -40);
};

// --- download bomb: walks in, arms ("installing…") with a visible blast radius, then completes. Kill it first to cancel.
EDEF.dbomb = { r: 17, hp: 26, speed: 58, dmg: 8, score: 160, drop: 0.12, cols: ['#3a7a3a', '#ffd34d', '#ff5a3d'], init: e => { e.arm = -1; } };
const BOMB_R = 82;
function bombBlast(e) {
  e.dead = true;
  SFX.boom(); addShake(11); hitstop = 0.04;
  burst(e.x, e.y, 24, ['#ff9a3d', '#ffd34d', '#3a7a3a'], 300); puff(e.x, e.y, 8, 'rgba(255,170,90,0.5)');
  pop(e.x, e.y - 12, 'DOWNLOAD COMPLETE!', '#ff9a3d', 17, 0.9);
  if (Math.hypot(player.x - e.x, player.y - e.y) < BOMB_R + player.r * 0.4) hurtPlayer(16, e.x, e.y);
  for (const o of enemies) if (o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < BOMB_R) { const a = Math.atan2(o.y - e.y, o.x - e.x); damageEnemy(o, 30, Math.cos(a) * 360, Math.sin(a) * 360, null, null, 'blast'); }
}
EAI.dbomb = (e, dt, dx, dy, d) => {
  if (e.arm < 0) { e.mvx = dx / d * 58; e.mvy = dy / d * 58; if (d < 125 || e.life > 7) { e.arm = 2.2; pop(e.x, e.y - 34, 'INSTALLING…', '#ff5a3d', 13, 0.8); } }
  else { const before = e.arm; e.arm -= dt; e.mvx = dx / d * 12; e.mvy = dy / d * 12; if (Math.ceil(before * 3) !== Math.ceil(e.arm * 3)) SFX.tick(); if (e.arm <= 0) bombBlast(e); }
};
EKILL.dbomb = e => { pop(e.x, e.y + 24, e.arm >= 0 ? 'DEFUSED!' : 'DOWNLOAD CANCELLED', '#7fe3a1', 13, 0.9); return false; };
EDRAW.dbomb = (c, e, fl) => {
  if (e.arm >= 0) { // blast radius telegraph on the floor
    const k = 1 - e.arm / 2.2, blink = Math.sin(e.life * (8 + k * 20)) > 0;
    c.fillStyle = `rgba(255,70,50,${0.08 + k * 0.16})`; c.beginPath(); c.ellipse(0, 6, BOMB_R, BOMB_R * 0.8, 0, 0, TAU); c.fill();
    c.strokeStyle = blink ? '#ff5a3d' : '#ffd34d'; c.lineWidth = 2.5; c.setLineDash([7, 5]); c.beginPath(); c.ellipse(0, 6, BOMB_R, BOMB_R * 0.8, 0, 0, TAU); c.stroke(); c.setLineDash([]);
  }
  c.translate(0, -Math.abs(Math.sin(e.t * 7)) * (e.arm >= 0 ? 0.5 : 2));
  if (e.arm >= 0) c.translate(Math.sin(e.life * 60) * 1.5, 0);
  c.fillStyle = fl ? '#bff5bf' : (e.arm >= 0 && Math.sin(e.life * 24) > 0 ? '#7a2a22' : '#2e5a34'); rr(c, -16, -14, 32, 29, 5); c.fill();
  c.strokeStyle = '#0e1a10'; c.lineWidth = 1.6; rr(c, -16, -14, 32, 29, 5); c.stroke();
  c.fillStyle = '#c9b25a'; for (let y = -12; y < 13; y += 4) c.fillRect(-2, y, 4, 2.4);
  c.fillStyle = '#ffd34d'; c.beginPath(); c.moveTo(-12, -3); c.lineTo(-6, -3); c.lineTo(-6, -9); c.lineTo(-10, -9); c.closePath(); c.fill();
  c.fillStyle = '#ffd34d'; c.font = `bold 7px ${FONT}`; c.textAlign = 'center'; c.fillText('ZIP', 9, -3);
  c.fillStyle = '#ffd34d'; c.beginPath(); c.moveTo(4, 2); c.lineTo(14, 2); c.lineTo(9, 10); c.closePath(); c.fill();
  c.strokeStyle = '#6b5a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(8, -14); c.quadraticCurveTo(12, -24, 18, -22); c.stroke();
  if (Math.sin(e.t * 30) > -0.3) { c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(18, -22, 3, 0, TAU); c.fill(); c.fillStyle = '#ff5a3d'; c.beginPath(); c.arc(18, -22, 1.6, 0, TAU); c.fill(); }
  if (e.arm >= 0) {
    progressBar(c, -18, -34, 36, 7, clamp(1 - e.arm / 2.2, 0.05, 1), '#ff5a3d');
    c.textAlign = 'center'; otext(c, String(Math.ceil(e.arm)), 0, -40, '#ffd34d', 18, 5);
  } else vEnemyHP(c, e, 30, -26);
};

ROOMS.push({
  key: 'downloads', name: 'THE DOWNLOADS FOLDER', sub: 'Everything here is 99% done. Forever.', seed: 33,
  door: 'CAPTCHA MAZE', doorCol: '#3ccf6e', clear: 'DOWNLOAD COMPLETE! (finally)', clearCol: true,
  tombs: [
    { x: 100, y: 300, rect: [-48, -38, 96, 58], draw: drawKiosk, label: 'GROKBUTT.zip', eta: '2 hrs left' },
    { x: 540, y: 300, rect: [-48, -38, 96, 58], draw: drawKiosk, label: 'setup(7).exe', eta: '∞ left' },
    { x: 122, y: 500, rect: [-46, -28, 92, 46], draw: drawHalfFiles, k: 0 },
    { x: 518, y: 500, rect: [-46, -28, 92, 46], draw: drawHalfFiles, k: 2 },
  ],
  waves: [{ crdl: 3, zombie: 2, popup: 1 }, { crdl: 3, dbomb: 2, spam: 2 }, { crdl: 3, dbomb: 3, popup: 1, captcha: 1 }],
  bg: bgDownloads, enter: dlReset, reset: dlReset, update: dlUpdate, drawTop: dlDrawTop,
});

// =====================================================================
// STAGE 4: THE CAPTCHA MAZE
// =====================================================================
const CAP = { cols: 6, rows: 5, x0: 20, y0: 124, ts: 100, tiles: [], flipT: 2 };
for (let i = 0; i < 30; i++) CAP.tiles.push({ st: 0, t: 0, ok: true, hurt: false });
const PICTOS = ['light', 'cross', 'bus', 'hydrant', 'bike', 'peach', 'stairs', 'palm', 'store'];
function drawPicto(c, kind, R) { // one grainy "photo" tile (local 0..92)
  const sky = c.createLinearGradient(0, 0, 0, 92); sky.addColorStop(0, '#7f93a8'); sky.addColorStop(1, '#a3adb4'); c.fillStyle = sky; c.fillRect(0, 0, 92, 92);
  c.fillStyle = '#6c7178'; c.fillRect(0, 62, 92, 30);
  if (kind === 'light') {
    c.fillStyle = '#3a3e45'; c.fillRect(44, 40, 5, 52); c.fillStyle = '#23262c'; rr(c, 33, 10, 27, 46, 5); c.fill();
    [['#d9473b', 19], ['#d9b23b', 33], ['#3bb35a', 47]].forEach(([col, y]) => { c.fillStyle = col; c.beginPath(); c.arc(46.5, y, 5.5, 0, TAU); c.fill(); });
  } else if (kind === 'cross') {
    c.fillStyle = '#4a4e55'; c.fillRect(0, 30, 92, 62); c.fillStyle = '#c9ccd1'; for (let x = 4; x < 92; x += 18) { c.beginPath(); c.moveTo(x, 90); c.lineTo(x + 10, 90); c.lineTo(x + 16, 34); c.lineTo(x + 9, 34); c.fill(); }
  } else if (kind === 'bus') {
    c.fillStyle = '#d9a72f'; rr(c, 8, 30, 76, 36, 6); c.fill(); c.fillStyle = '#3e5a72'; for (let x = 13; x < 78; x += 15) c.fillRect(x, 36, 11, 11);
    c.fillStyle = '#1d2026'; c.beginPath(); c.arc(24, 67, 7, 0, TAU); c.arc(68, 67, 7, 0, TAU); c.fill(); c.fillStyle = '#b8482f'; c.fillRect(8, 52, 76, 4);
  } else if (kind === 'hydrant') {
    c.fillStyle = '#c23a2e'; rr(c, 36, 30, 20, 40, 4); c.fill(); rr(c, 30, 40, 32, 8, 3); c.fill(); c.beginPath(); c.arc(46, 30, 10, Math.PI, 0); c.fill(); c.fillStyle = '#8a241c'; c.fillRect(32, 68, 28, 6);
  } else if (kind === 'bike') {
    c.strokeStyle = '#22262c'; c.lineWidth = 4; c.beginPath(); c.arc(26, 62, 14, 0, TAU); c.stroke(); c.beginPath(); c.arc(68, 62, 14, 0, TAU); c.stroke();
    c.strokeStyle = '#2f6fdb'; c.lineWidth = 3; c.beginPath(); c.moveTo(26, 62); c.lineTo(42, 40); c.lineTo(62, 40); c.lineTo(68, 62); c.moveTo(42, 40); c.lineTo(48, 62); c.lineTo(62, 40); c.stroke();
  } else if (kind === 'peach') { // "select all butts"
    c.fillStyle = '#e8875c'; c.beginPath(); c.arc(38, 52, 18, 0, TAU); c.arc(54, 52, 18, 0, TAU); c.fill();
    c.strokeStyle = '#a84b2c'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(46, 36); c.quadraticCurveTo(43, 52, 46, 68); c.stroke();
    c.fillStyle = '#4c8a3a'; c.beginPath(); c.ellipse(56, 30, 9, 4, -0.5, 0, TAU); c.fill();
  } else if (kind === 'stairs') {
    c.fillStyle = '#8a8f96'; for (let i = 0; i < 5; i++) c.fillRect(10 + i * 14, 80 - i * 12, 92, 12); c.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 5; i++) c.fillRect(10 + i * 14, 80 - i * 12, 92, 3);
  } else if (kind === 'palm') {
    c.strokeStyle = '#6b4a2a'; c.lineWidth = 6; c.beginPath(); c.moveTo(50, 90); c.quadraticCurveTo(40, 60, 46, 26); c.stroke();
    c.strokeStyle = '#3f7a3a'; c.lineWidth = 5; for (const a of [-2.6, -2, -1.2, -0.5, 0.1]) { c.beginPath(); c.moveTo(46, 26); c.quadraticCurveTo(46 + Math.cos(a) * 18, 18 + Math.sin(a) * 10, 46 + Math.cos(a) * 30, 30 + Math.sin(a) * 6 + 10); c.stroke(); }
  } else {
    c.fillStyle = '#8a5a4a'; c.fillRect(10, 28, 72, 50); c.fillStyle = '#3e5a72'; c.fillRect(18, 48, 24, 30); c.fillRect(50, 48, 24, 20);
    for (let x = 10; x < 82; x += 12) { c.fillStyle = (x / 12 & 1) ? '#c94a3a' : '#d9d2c0'; c.fillRect(x, 28, 12, 12); }
  }
  for (let i = 0; i < 70; i++) { c.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)'; c.fillRect(R() * 92, R() * 92, 2, 2); }
  c.fillStyle = 'rgba(14,20,34,0.38)'; c.fillRect(0, 0, 92, 92); // keep it matte and darker than the actors
}
function drawCapSign(c, R, t) {
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(4, 22, 58, 9, 0, 0, TAU); c.fill();
  c.fillStyle = '#3a4250'; c.fillRect(-42, 6, 5, 18); c.fillRect(37, 6, 5, 18);
  c.fillStyle = '#e3e6ec'; rr(c, -60, -28, 120, 40, 4); c.fill(); c.strokeStyle = '#0e1626'; c.lineWidth = 2; rr(c, -60, -28, 120, 40, 4); c.stroke();
  c.fillStyle = '#4a90e2'; c.fillRect(-57, -25, 114, 30);
  c.textAlign = 'center'; c.fillStyle = '#e8f0ff'; c.font = `bold 7px ${FONT}`; c.fillText('Select all images with', 0, -15);
  c.font = `bold ${t.label.length > 13 ? 9 : 11}px ${FONT}`; c.fillStyle = '#ffffff'; c.fillText(t.label, 0, -2);
  c.fillStyle = '#56606e'; c.font = `bold 6px ${FONT}`; c.fillText(t.hint, 0, 10);
}
function drawCheckWall(c, R) { // a low hedge of unticked checkboxes
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(-50, 4, 104, 10);
  c.fillStyle = '#2b3550'; rr(c, -52, -12, 104, 22, 4); c.fill(); c.fillStyle = '#3b4870'; rr(c, -52, -12, 104, 9, 4); c.fill();
  for (let i = 0; i < 6; i++) { c.fillStyle = '#d5dbe6'; c.fillRect(-46 + i * 16.5, -7, 11, 11); c.strokeStyle = '#0e1626'; c.lineWidth = 1.4; c.strokeRect(-46 + i * 16.5, -7, 11, 11); }
}
function bgCaptcha(c, R) {
  c.fillStyle = '#0d1220'; c.fillRect(0, 0, W, H);
  const order = [];
  for (let i = 0; i < 30; i++) order.push(PICTOS[Math.floor(R() * PICTOS.length)]);
  for (let i = 0; i < 30; i++) {
    const cx = i % 6, cy = Math.floor(i / 6);
    c.save(); c.translate(CAP.x0 + cx * CAP.ts + 4, CAP.y0 + cy * CAP.ts + 4); drawPicto(c, order[i], R); c.restore();
  }
  c.fillStyle = '#1a2238'; c.fillRect(0, 64, W, 60); // safe strip in front of the door
  c.strokeStyle = 'rgba(120,150,210,0.12)'; c.lineWidth = 1; for (let x = 20; x < W; x += 25) { c.beginPath(); c.moveTo(x, 66); c.lineTo(x, 122); c.stroke(); }
  backWall(c, '#1b2340', '#25305a'); wallPattern(c, '#34406a', 'checks');
  const wx = 440, wy = 72; // reCAPTCHA widget, in the safe strip where the HUD can't hide it
  c.fillStyle = 'rgba(0,0,0,0.35)'; rr(c, wx + 3, wy + 4, 180, 42, 4); c.fill();
  c.fillStyle = '#c9ced8'; rr(c, wx, wy, 180, 42, 4); c.fill(); c.strokeStyle = '#5a6272'; c.lineWidth = 1.5; rr(c, wx, wy, 180, 42, 4); c.stroke();
  c.fillStyle = '#e4e7ec'; c.fillRect(wx + 10, wy + 10, 22, 22); c.strokeStyle = '#5a6272'; c.lineWidth = 2; c.strokeRect(wx + 10, wy + 10, 22, 22);
  c.fillStyle = '#20242c'; c.font = `bold 12px ${FONT}`; c.textAlign = 'left'; c.fillText("I'm not a robot", wx + 40, wy + 26);
  c.fillStyle = '#d9473b'; c.font = `bold 7px ${FONT}`; c.fillText('try again (attempt 4,812)', wx + 40, wy + 37);
  c.strokeStyle = '#4a90e2'; c.lineWidth = 3; c.beginPath(); c.arc(wx + 162, wy + 18, 7, 0.3, 4.6); c.stroke();
  sideRails(c, '#1b2340', '#4a90e2');
}
function capTile(x, y) {
  const cx = Math.floor((x - CAP.x0) / CAP.ts), cy = Math.floor((y - CAP.y0) / CAP.ts);
  if (cx < 0 || cy < 0 || cx >= CAP.cols || cy >= CAP.rows) return -1;
  const lx = x - CAP.x0 - cx * CAP.ts, ly = y - CAP.y0 - cy * CAP.ts;
  return (lx > 14 && lx < CAP.ts - 14 && ly > 14 && ly < CAP.ts - 14) ? cy * CAP.cols + cx : -1;
}
function capReset() {
  CAP.flipT = 2;
  CAP.tiles.forEach((tl, i) => {
    tl.st = 0; tl.t = 0;
    const x = CAP.x0 + (i % 6) * CAP.ts, y = CAP.y0 + Math.floor(i / 6) * CAP.ts;
    tl.ok = !obstacles.some(o => o.x < x + CAP.ts - 10 && o.x + o.w > x + 10 && o.y < y + CAP.ts - 10 && o.y + o.h > y + 10) && !(i >= 26 && i <= 27 && false);
  });
}
function capUpdate(dt) {
  const live = hazardsLive();
  for (const tl of CAP.tiles) {
    if (!tl.st) continue;
    tl.t -= dt;
    if (!live && tl.st === 1) { tl.st = 0; continue; }
    if (!live && tl.st === 2) { tl.st = 3; tl.t = 0.3; continue; }
    if (tl.t <= 0) { if (tl.st === 1) { tl.st = 2; tl.t = 2.4; SFX.block(); } else if (tl.st === 2) { tl.st = 3; tl.t = 0.3; } else tl.st = 0; }
  }
  if (live) {
    CAP.flipT -= dt;
    if (CAP.flipT <= 0) {
      const w = clamp(waveIdx, 0, 2); CAP.flipT = [3.4, 2.9, 2.4][w];
      let n = 2 + w; const under = capTile(player.x, player.y);
      if (under >= 0 && CAP.tiles[under].ok && !CAP.tiles[under].st) { CAP.tiles[under].st = 1; CAP.tiles[under].t = 1.3; n--; }
      for (let tries = 0; n > 0 && tries < 40; tries++) { const i = Math.floor(Math.random() * 30), tl = CAP.tiles[i]; if (tl.ok && !tl.st) { tl.st = 1; tl.t = 1.3; n--; } }
      pop(W / 2, 100, pick(['SELECT ALL HOLES', 'VERIFYING…', 'TRY AGAIN', 'ARE YOU A ROBOT?']), '#9fd0ff', 13, 0.9);
    }
  }
  const ti = capTile(player.x, player.y);
  if (ti >= 0 && CAP.tiles[ti].st === 2 && CAP.tiles[ti].t < 2.25) {
    const was = player.inv, cx = CAP.x0 + (ti % 6) * CAP.ts + CAP.ts / 2, cy = CAP.y0 + Math.floor(ti / 6) * CAP.ts + CAP.ts / 2;
    hurtPlayer(10, cx + (player.x === cx ? 1 : 0), cy);
    if (was <= 0 && player.inv > 0) pop(player.x, player.y - 60, 'IMAGE NOT FOUND', '#ff8a8a', 14, 0.8);
  }
}
function capDrawFloor(c) {
  const bg = getBG(roomIdx), ts = CAP.ts, inner = ts - 8;
  for (let i = 0; i < 30; i++) {
    const tl = CAP.tiles[i]; if (!tl.st) continue;
    const x = CAP.x0 + (i % 6) * ts + 4, y = CAP.y0 + Math.floor(i / 6) * ts + 4;
    if (tl.st === 1) { // selected: blue check badge, orange pulsing border, slight wobble
      const p = 0.5 + 0.5 * Math.sin((1.3 - tl.t) * 18);
      c.save(); c.translate(Math.sin(tl.t * 40) * 1.5, 0);
      c.fillStyle = `rgba(255,150,40,${0.12 + p * 0.18})`; c.fillRect(x, y, inner, inner);
      c.strokeStyle = p > 0.5 ? '#ff9a3d' : '#ffd34d'; c.lineWidth = 4; c.strokeRect(x + 2, y + 2, inner - 4, inner - 4);
      c.fillStyle = '#4a90e2'; c.beginPath(); c.arc(x + 14, y + 14, 10, 0, TAU); c.fill(); c.strokeStyle = '#eaf2ff'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x + 9, y + 14); c.lineTo(x + 13, y + 18); c.lineTo(x + 19, y + 10); c.stroke();
      c.textAlign = 'center'; otext(c, '!', x + inner / 2, y + inner / 2 + 12, '#ffd34d', 34, 6);
      c.restore();
    } else { // hole (flips open, then closes)
      const open = tl.st === 2 ? clamp((2.4 - tl.t) / 0.25, 0, 1) : clamp(tl.t / 0.3, 0, 1);
      c.fillStyle = '#05070d'; c.fillRect(x, y, inner, inner);
      const g = c.createRadialGradient(x + inner / 2, y + inner / 2, 6, x + inner / 2, y + inner / 2, inner * 0.7); g.addColorStop(0, 'rgba(60,20,40,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x, y, inner, inner);
      c.strokeStyle = 'rgba(160,170,190,0.25)'; c.lineWidth = 1; for (let k = 0; k < 6; k++) { const yy = y + Math.random() * inner; c.beginPath(); c.moveTo(x + 2, yy); c.lineTo(x + inner - 2, yy); c.stroke(); }
      c.strokeStyle = '#8a95a8'; c.lineWidth = 1.5; c.strokeRect(x + inner / 2 - 12, y + inner / 2 - 18, 24, 18); c.strokeStyle = '#3ccf6e'; c.beginPath(); c.moveTo(x + inner / 2 - 9, y + inner / 2 - 3); c.lineTo(x + inner / 2 - 2, y + inner / 2 - 10); c.lineTo(x + inner / 2 + 3, y + inner / 2 - 6); c.lineTo(x + inner / 2 + 9, y + inner / 2 - 13); c.stroke();
      c.textAlign = 'center'; c.fillStyle = '#ff8a8a'; c.font = `bold 8px ${FONT}`; c.fillText('IMAGE NOT FOUND', x + inner / 2, y + inner / 2 + 14);
      c.strokeStyle = '#ff4f6d'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, inner - 2, inner - 2);
      const sx = 1 - open; // the flipping tile card
      if (sx > 0.02) { c.save(); c.translate(x + inner / 2, y + inner / 2); c.scale(sx, 1); c.drawImage(bg, x * BGS, y * BGS, inner * BGS, inner * BGS, -inner / 2, -inner / 2, inner, inner); c.restore(); }
    }
  }
}
// --- distorted-letters enemy: keeps its distance, warps (teleports) with a telegraph, throws letters
EDEF.letters = { r: 19, hp: 44, speed: 45, dmg: 10, score: 220, drop: 0.22, cols: ['#d8d2c0', '#1d2b5a', '#c62f2f'],
  init: e => { e.tp = rnd(3, 4.5); e.word = pick(['gRoK', 'bUtT', 'r0Bt', 'HuMn', 'wXq7', 'pE4c']); e.tpx = e.x; e.tpy = e.y; e.tpSet = false; } };
EAI.letters = (e, dt, dx, dy, d) => {
  const k = d > 220 ? 1 : d < 150 ? -1 : 0;
  e.mvx = dx / d * 45 * k + Math.cos(e.t * 1.7) * 30; e.mvy = dy / d * 45 * k + Math.sin(e.t * 1.3) * 30;
  e.tp -= dt;
  if (e.tp < 0.7 && !e.tpSet) {
    let x, y, n = 0; do { x = rnd(B.l + 40, B.r - 40); y = rnd(130, B.b - 40); n++; } while ((Math.hypot(x - player.x, y - player.y) < 170 || hitsObstacle(x, y, 24)) && n < 30);
    e.tpx = x; e.tpy = y; e.tpSet = true;
  }
  if (e.tp <= 0) { puff(e.x, e.y, 4, 'rgba(160,170,220,0.5)'); e.x = e.tpx; e.y = e.tpy; e.tp = rnd(3.2, 4.6); e.tpSet = false; puff(e.x, e.y, 4, 'rgba(160,170,220,0.5)'); }
  if (e.cd <= 0) {
    e.cd = rnd(2.0, 2.8); const a = Math.atan2(dy, dx);
    for (let i = -1; i <= 1; i++) ebullets.push({ kind: 'glyph', ch: e.word[(i + 1 + Math.floor(e.t)) % e.word.length], x: e.x, y: e.y, vx: Math.cos(a + i * 0.26) * 160, vy: Math.sin(a + i * 0.26) * 160, r: 8, dmg: 9, life: 3.5, rot: 0 });
    SFX.enemyShot();
  }
};
EDRAW.letters = (c, e, fl) => {
  if (e.tpSet) { // destination telegraph
    const ox = e.tpx - e.x, oy = e.tpy - e.y;
    c.save(); c.strokeStyle = 'rgba(159,208,255,0.85)'; c.lineWidth = 2; c.setLineDash([4, 4]); c.strokeRect(ox - 24, oy - 14, 48, 28); c.setLineDash([]);
    c.textAlign = 'center'; otext(c, '?', ox, oy + 7, '#9fd0ff', 18, 4); c.restore();
  }
  if (e.tpSet && Math.sin(e.t * 40) > 0) c.globalAlpha = 0.45;
  c.translate(0, Math.sin(e.t * 3) * 2);
  c.fillStyle = fl ? '#ffffff' : '#d8d2c0'; rr(c, -28, -15, 56, 30, 4); c.fill();
  c.fillStyle = 'rgba(60,50,30,0.18)'; for (let i = 0; i < 14; i++) c.fillRect(-26 + (i * 37) % 52, -13 + (i * 23) % 26, 2, 2);
  c.strokeStyle = '#2b2f3a'; c.lineWidth = 1.6; rr(c, -28, -15, 56, 30, 4); c.stroke();
  c.textAlign = 'center'; c.fillStyle = '#1d2b5a';
  for (let i = 0; i < e.word.length; i++) {
    c.save(); c.translate(-18 + i * 12, 5 + Math.sin(e.t * 4 + i) * 2); c.rotate(Math.sin(e.t * 2 + i * 1.7) * 0.4); c.scale(1 + Math.sin(e.t * 3 + i) * 0.15, 1);
    c.font = `${i % 2 ? 'bold ' : ''}15px ${FONT}`; c.fillText(e.word[i], 0, 0); c.restore();
  }
  c.strokeStyle = '#1d2b5a'; c.lineWidth = 1.5; c.beginPath(); for (let x = -26; x <= 26; x += 4) { const y = Math.sin(x * 0.25 + e.t * 5) * 4; x === -26 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke();
  c.fillStyle = '#c62f2f'; c.beginPath(); c.moveTo(-14, -22); c.lineTo(-4, -18); c.lineTo(-14, -16); c.fill(); c.beginPath(); c.moveTo(14, -22); c.lineTo(4, -18); c.lineTo(14, -16); c.fill();
  c.globalAlpha = 1;
  vEnemyHP(c, e, 40, -30);
};
BDRAW.glyph = (c, b) => { c.rotate(Math.sin(b.rot) * 0.6); c.textAlign = 'center'; c.textBaseline = 'middle'; otext(c, b.ch, 0, 0, '#ff6b5e', 18, 4, '#1a0d10'); c.textBaseline = 'alphabetic'; };

ROOMS.push({
  key: 'captcha', name: 'THE CAPTCHA MAZE', sub: "Prove you're not a robot. GrokButt isn't sure either.", seed: 44,
  door: 'TRASH BIN', doorCol: '#9aa3b2', clear: 'VERIFIED HUMAN! (probably)', clearCol: true,
  tombs: [
    { x: 96, y: 236, rect: [-60, -28, 120, 46], draw: drawCapSign, label: 'TRAFFIC LIGHTS', hint: 'click verify once there are none left' },
    { x: 544, y: 236, rect: [-60, -28, 120, 46], draw: drawCapSign, label: 'BUSES', hint: 'if there are none, click skip' },
    { x: 96, y: 486, rect: [-60, -28, 120, 46], draw: drawCapSign, label: 'BUTTS', hint: '(GrokButt counts)' },
    { x: 544, y: 486, rect: [-60, -28, 120, 46], draw: drawCapSign, label: 'CROSSWALKS', hint: 'and the corner of that one' },
    { x: 196, y: 370, rect: [-52, -12, 104, 24], draw: drawCheckWall },
    { x: 444, y: 370, rect: [-52, -12, 104, 24], draw: drawCheckWall },
  ],
  waves: [{ captcha: 2, letters: 1, spam: 2, popup: 1 }, { captcha: 3, letters: 1, crdl: 1, popup: 1 }, { captcha: 3, letters: 2, spam: 1, popup: 1 }],
  bg: bgCaptcha, enter: capReset, reset: capReset, update: capUpdate, drawFloor: capDrawFloor,
});

// =====================================================================
// STAGE 5: THE TRASH BIN
// =====================================================================
const TR = { phase: 0, warnT: 0, moving: false, shred: [{ x: 190, y: 566, st: 0, t: 2.2 }, { x: 450, y: 566, st: 0, t: 3.0 }], dialogs: [], dlgT: 4, anim: 0 };
const TR_STEPS = [16, 56, 92, 124];
function drawPaperWad(c, x, y, s, R) { // crumpled yellow legal-pad paper: angular, never round-and-white
  c.save(); c.translate(x, y); c.rotate(R() * TAU); c.scale(s, s);
  c.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, rr2 = (i % 2 ? 0.72 : 1) * (0.85 + R() * 0.3) * 10; i ? c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : c.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } c.closePath();
  c.fillStyle = R() < 0.5 ? '#e6d36a' : '#d9c45c'; c.fill(); c.strokeStyle = '#6b5a1e'; c.lineWidth = 1.2; c.stroke();
  c.strokeStyle = 'rgba(70,110,180,0.55)'; c.lineWidth = 0.8; for (let k = -6; k <= 6; k += 4) { c.beginPath(); c.moveTo(-8, k); c.lineTo(8, k + 1); c.stroke(); }
  c.strokeStyle = 'rgba(90,70,20,0.6)'; c.beginPath(); c.moveTo(-6, -5); c.lineTo(2, 1); c.lineTo(-1, 7); c.stroke();
  c.restore();
}
function drawTrashPile(c, R) {
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(4, 20, 48, 12, 0, 0, TAU); c.fill();
  for (let i = 0; i < 5; i++) { c.save(); c.translate((R() - 0.5) * 56, 6 - i * 3 + (R() - 0.5) * 8); c.rotate((R() - 0.5) * 1.2); c.fillStyle = pick(['#5b6fd6', '#c45a4a', '#5f9c66']); docPath(c, -11, -14, 22, 28, 6); c.fill(); c.strokeStyle = '#111'; c.lineWidth = 1.2; docPath(c, -11, -14, 22, 28, 6); c.stroke(); c.strokeStyle = '#ff4f6d'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-6, -6); c.lineTo(6, 6); c.moveTo(6, -6); c.lineTo(-6, 6); c.stroke(); c.restore(); }
  for (let i = 0; i < 9; i++) drawPaperWad(c, (R() - 0.5) * 70, (R() - 0.5) * 30 - 4, 1 + R() * 0.5, R);
  c.fillStyle = '#ffd34d'; c.font = `bold 7px ${FONT}`; c.textAlign = 'center'; c.fillText('final_v2_REAL.docx', 0, 32);
}
function drawShredder(c, R) {
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(4, 26, 52, 10, 0, 0, TAU); c.fill();
  c.fillStyle = '#2b2f38'; rr(c, -46, -26, 92, 50, 6); c.fill(); c.fillStyle = '#3a404c'; rr(c, -46, -26, 92, 16, 6); c.fill();
  c.strokeStyle = '#0c0e12'; c.lineWidth = 2; rr(c, -46, -26, 92, 50, 6); c.stroke();
  c.fillStyle = '#0c0e12'; c.fillRect(-38, -22, 76, 6);
  c.fillStyle = '#c9ccd1'; c.font = `bold 9px ${FONT}`; c.textAlign = 'center'; c.fillText('SHRED-O-MATIC', 0, 6);
  c.fillStyle = '#8a8f96'; c.font = `bold 6px ${FONT}`; c.fillText('keep butts away from blades', 0, 16);
}
function bgTrash(c, R) {
  floorGrad(c, '#2b3130', '#111514');
  c.strokeStyle = 'rgba(200,210,200,0.05)'; c.lineWidth = 2; for (let y = 80; y < H; y += 26) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y + 6); c.stroke(); } // ribbed bin floor
  c.save(); c.globalAlpha = 0.4; for (let i = 0; i < 26; i++) drawPaperWad(c, R() * W, 90 + R() * (H - 110), 0.45 + R() * 0.5, R); c.restore();
  c.fillStyle = 'rgba(17,21,20,0.35)'; c.fillRect(0, 64, W, H - 64);
  for (let i = 0; i < 14; i++) { // deleted file icons + shreds
    c.save(); c.translate(R() * W, 100 + R() * (H - 120)); c.rotate((R() - 0.5) * 2); c.globalAlpha = 0.8;
    c.fillStyle = pick(['#5b6fd6', '#c45a4a', '#5f9c66', '#8c5fb0']); docPath(c, -7, -9, 14, 18, 4); c.fill(); c.strokeStyle = '#111'; c.lineWidth = 1; docPath(c, -7, -9, 14, 18, 4); c.stroke();
    c.restore();
  }
  for (let i = 0; i < 60; i++) { c.fillStyle = R() < 0.5 ? 'rgba(220,205,120,0.5)' : 'rgba(150,170,210,0.4)'; c.save(); c.translate(R() * W, 90 + R() * (H - 100)); c.rotate(R() * TAU); c.fillRect(-5, -1, 10, 2); c.restore(); }
  c.save(); c.translate(520, 140); c.rotate(0.3); c.fillStyle = '#d4b23a'; c.beginPath(); c.moveTo(-14, 6); c.quadraticCurveTo(0, -18, 14, 6); c.quadraticCurveTo(0, -6, -14, 6); c.fill(); c.restore(); // a banana peel, obviously
  backWall(c, '#2a302f', '#3a4241'); wallPattern(c, '#232827', 'ribs');
  c.save(); c.translate(500, 612); c.fillStyle = '#1b201f'; rr(c, -84, -14, 168, 28, 6); c.fill(); c.fillStyle = '#c9ccd1'; c.font = `bold 9px ${FONT}`; c.textAlign = 'center'; c.fillText('TRASH · 4,096 items · 88 GB', 0, 4); c.restore();
}
function trReset() { TR.phase = 0; TR.warnT = 0; TR.moving = false; TR.dialogs.length = 0; TR.dlgT = 4; for (const s of TR.shred) { s.st = 0; s.t = rnd(2, 3); } }
function trOnWave(i) { TR.phase = Math.min(3, i + 1); TR.warnT = 2.4; pop(W / 2, 190, 'WALLS COMPACTING!', '#ff9a3d', 22, 1.6); SFX.door(); }
function trUpdate(dt) {
  TR.anim += dt;
  const live = hazardsLive(), tgt = doorOpen || outroT > 0 ? 16 : TR_STEPS[TR.phase];
  if (TR.warnT > 0) TR.warnT -= dt;
  else { const sp = doorOpen ? 160 : 22; if (B.l < tgt) B.l = Math.min(tgt, B.l + sp * dt); else if (B.l > tgt) B.l = Math.max(tgt, B.l - sp * dt); B.r = W - B.l; }
  TR.moving = TR.warnT <= 0 && B.l < tgt - 0.5;
  if (TR.moving && (player.x - player.r <= B.l + 2 || player.x + player.r >= B.r - 2)) { const was = player.inv; hurtPlayer(4, player.x < W / 2 ? B.l - 40 : B.r + 40, player.y); if (was <= 0 && player.inv > 0) pop(player.x, player.y - 60, 'SQUISH!', '#ff9a3d', 15, 0.7); }
  for (const l of loot) l.x = clamp(l.x, B.l + 20, B.r - 20);
  // shredders: idle (green) -> warning (yellow) -> shredding (red)
  for (const s of TR.shred) {
    if (!live) { s.st = 0; s.t = 1.5; continue; }
    s.t -= dt;
    if (s.t <= 0) { s.st = (s.st + 1) % 3; s.t = s.st === 0 ? rnd(2.2, 3.2) : s.st === 1 ? 1.0 : 1.6; if (s.st === 2) SFX.crumple(); }
    if (s.st === 2) {
      if (parts.length < 110 && Math.random() < 0.5) parts.push({ x: s.x + rnd(-40, 40), y: s.y - 30, vx: rnd(-60, 60), vy: rnd(-160, -60), life: 0.6, t: 0, col: Math.random() < 0.5 ? '#e6d36a' : '#9fb4d8', sz: 3, kind: 'sq', rot: rnd(0, TAU) });
      if (circRect(player.x, player.y, player.r - 4, s.x - 46, s.y - 74, 92, 48)) { const was = player.inv; hurtPlayer(12, s.x, s.y + 20); if (was <= 0 && player.inv > 0) pop(player.x, player.y - 60, 'SHREDDED!', '#ff4f6d', 15, 0.7); }
    }
  }
  // "Empty Trash?" dialogs: target your spot, count down, then empty that area
  if (live) {
    TR.dlgT -= dt;
    if (TR.dlgT <= 0 && TR.dialogs.length < 2) {
      TR.dlgT = [6.5, 5.2, 4.2][clamp(waveIdx, 0, 2)];
      TR.dialogs.push({ x: clamp(player.x, B.l + 70, B.r - 70), y: clamp(player.y, 170, B.b - 70), t: 2.1 });
      tone(880, 0.12, 'sine', 0.08); tone(660, 0.16, 'sine', 0.07, null, 0.1);
    }
  } else TR.dialogs.length = 0;
  for (const d of TR.dialogs) {
    d.t -= dt;
    if (d.t <= 0) {
      d.dead = true; SFX.crumple(); SFX.boom(); addShake(7);
      burst(d.x, d.y, 20, ['#e6d36a', '#d9c45c', '#9fb4d8', '#c45a4a'], 260);
      pop(d.x, d.y - 10, 'TRASH EMPTIED!', '#ff9a3d', 18, 0.8);
      if (Math.hypot(player.x - d.x, player.y - d.y) < 78) hurtPlayer(14, d.x, d.y);
    }
  }
  prune(TR.dialogs, notDead);
}
function trDrawWall(c, x0, x1, side) {
  const w = x1 - x0; if (w <= 0) return;
  c.fillStyle = '#3a414c'; c.fillRect(x0, 64, w, H - 64);
  c.fillStyle = '#2a3038'; for (let x = x0 + 4; x < x1 - 10; x += 12) c.fillRect(x, 64, 5, H - 64);
  const edge = side < 0 ? x1 - 10 : x0;
  c.fillStyle = '#56606e'; c.fillRect(edge, 64, 10, H - 64);
  if (TR.warnT > 0 || TR.moving) { // caution stripes on the moving edge
    c.save(); c.beginPath(); c.rect(edge, 64, 10, H - 64); c.clip();
    c.fillStyle = '#ffd34d'; c.fillRect(edge, 64, 10, H - 64); c.fillStyle = '#1a1a1a';
    const off = (TR.anim * 40) % 20; for (let y = 50 - off; y < H; y += 20) { c.beginPath(); c.moveTo(edge, y); c.lineTo(edge + 10, y - 8); c.lineTo(edge + 10, y); c.lineTo(edge, y + 8); c.fill(); }
    c.restore();
    if (Math.sin(TR.anim * 10) > 0) { c.fillStyle = '#ff4f6d'; for (let y = 130; y < H; y += 140) { c.beginPath(); c.arc(side < 0 ? x1 - 18 : x0 + 18, y, 5, 0, TAU); c.fill(); } }
  }
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(side < 0 ? x1 : x0 - 8, 64, 8, H - 64);
}
function trDrawFloor(c) {
  for (const d of TR.dialogs) { // target zone
    const k = 1 - d.t / 2.1;
    c.fillStyle = `rgba(255,79,109,${0.1 + k * 0.15})`; c.beginPath(); c.ellipse(d.x, d.y, 78, 62, 0, 0, TAU); c.fill();
    c.strokeStyle = '#ff4f6d'; c.lineWidth = 2.5; c.setLineDash([7, 5]); c.beginPath(); c.ellipse(d.x, d.y, 78, 62, 0, 0, TAU); c.stroke(); c.setLineDash([]);
    c.strokeStyle = '#ffd34d'; c.lineWidth = 4; c.beginPath(); c.ellipse(d.x, d.y, 78, 62, 0, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.stroke();
  }
  for (const s of TR.shred) { // shredder intake zone
    if (s.st === 0) continue;
    const red = s.st === 2;
    c.fillStyle = red ? `rgba(255,60,60,${0.22 + 0.1 * Math.sin(TR.anim * 30)})` : `rgba(255,211,77,${0.12 + 0.1 * Math.sin(TR.anim * 14)})`;
    c.fillRect(s.x - 46, s.y - 74, 92, 48);
    c.strokeStyle = red ? '#ff4f6d' : '#ffd34d'; c.lineWidth = 2; c.setLineDash([5, 4]); c.strokeRect(s.x - 46, s.y - 74, 92, 48); c.setLineDash([]);
    c.textAlign = 'center'; otext(c, red ? 'SHREDDING!' : 'WARMING UP…', s.x, s.y - 46, red ? '#ff4f6d' : '#ffd34d', 10, 3);
  }
  trDrawWall(c, 0, B.l, -1); trDrawWall(c, B.r, W, 1);
}
function trDrawTop(c) {
  for (const s of TR.shred) { // status light + spinning teeth
    const col = s.st === 2 ? '#ff4f6d' : s.st === 1 ? '#ffd34d' : '#3ccf6e';
    c.fillStyle = col; c.beginPath(); c.arc(s.x + 36, s.y - 18, 4, 0, TAU); c.fill();
    c.fillStyle = '#9aa3b2'; const sp = s.st === 2 ? 30 : s.st === 1 ? 6 : 0;
    for (let i = 0; i < 9; i++) { const xx = s.x - 36 + ((i * 9 + TR.anim * sp * 9) % 76); c.fillRect(xx, s.y - 23, 3, 5); }
  }
  for (const d of TR.dialogs) { // the macOS-style "Empty Trash?" dialog
    const bx = clamp(d.x, 110, W - 110), by = clamp(d.y - 118, 100, H - 180), w = 196, h = 76;
    c.fillStyle = 'rgba(0,0,0,0.35)'; rr(c, bx - w / 2 + 4, by + 4, w, h, 10); c.fill();
    c.fillStyle = '#e4e6ea'; rr(c, bx - w / 2, by, w, h, 10); c.fill(); c.strokeStyle = '#5a606c'; c.lineWidth = 1.5; rr(c, bx - w / 2, by, w, h, 10); c.stroke();
    c.beginPath(); c.moveTo(clamp(d.x, bx - 70, bx + 70) - 8, by + h); c.lineTo(clamp(d.x, bx - 70, bx + 70) + 8, by + h); c.lineTo(clamp(d.x, bx - 70, bx + 70), by + h + 10); c.closePath(); c.fillStyle = '#e4e6ea'; c.fill();
    c.fillStyle = '#5a606c'; c.fillRect(bx - w / 2 + 12, by + 12, 22, 26); c.fillStyle = '#7a808c'; c.fillRect(bx - w / 2 + 9, by + 9, 28, 5); // trash-can icon
    c.textAlign = 'left'; c.fillStyle = '#16181d'; c.font = `bold 12px ${FONT}`; c.fillText('Empty Trash?', bx - w / 2 + 44, by + 22);
    c.fillStyle = '#4a505c'; c.font = `bold 8px ${FONT}`; c.fillText('This cannot be undone. Not even', bx - w / 2 + 44, by + 34); c.fillText('with Ctrl+Z.', bx - w / 2 + 44, by + 44);
    c.fillStyle = '#c9ccd2'; rr(c, bx - 4, by + 50, 42, 18, 5); c.fill(); c.fillStyle = '#16181d'; c.textAlign = 'center'; c.font = `bold 9px ${FONT}`; c.fillText('Cancel', bx + 17, by + 62);
    c.fillStyle = Math.sin(d.t * 18) > 0 ? '#2f6fdb' : '#4a8af0'; rr(c, bx + 42, by + 50, 50, 18, 5); c.fill(); c.fillStyle = '#f4f8ff'; c.fillText(`Empty (${Math.ceil(d.t)})`, bx + 67, by + 62);
  }
}
// --- crumpled paper wad: bounces around the bin, re-aims at you now and then
EDEF.crumple = { r: 15, hp: 22, speed: 150, dmg: 9, score: 90, drop: 0.12, cols: ['#e6d36a', '#7fa6d6', '#c9b25a'],
  init: e => { const a = rnd(0, TAU); e.bvx = Math.cos(a); e.bvy = Math.sin(a); e.rot = 0; e.poly = new Float32Array(14); for (let i = 0; i < 14; i++) e.poly[i] = (i % 2 ? 0.72 : 1) * rnd(0.88, 1.12); e.aimT = rnd(1.4, 2.4); } };
EAI.crumple = (e, dt, dx, dy, d) => {
  e.aimT -= dt;
  if (e.aimT <= 0) { e.aimT = rnd(1.6, 2.6); const a = Math.atan2(dy, dx) + rnd(-0.5, 0.5); e.bvx = Math.cos(a); e.bvy = Math.sin(a); }
  if ((e.x <= B.l + e.r + 1 && e.bvx < 0) || (e.x >= B.r - e.r - 1 && e.bvx > 0)) e.bvx = -e.bvx;
  if ((e.y <= B.t + e.r + 1 && e.bvy < 0) || (e.y >= B.b - e.r - 1 && e.bvy > 0)) e.bvy = -e.bvy;
  if (hitsObstacle(e.x + e.bvx * 8, e.y + e.bvy * 8, e.r)) { e.bvx = -e.bvx; e.bvy = -e.bvy; }
  const sp = 140 + Math.max(0, waveIdx) * 14; e.mvx = e.bvx * sp; e.mvy = e.bvy * sp; e.rot += dt * (e.bvx >= 0 ? 7 : -7);
};
EDRAW.crumple = (c, e, fl) => {
  c.save(); c.rotate(e.rot);
  c.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, r = e.r * e.poly[i]; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath();
  c.fillStyle = fl ? '#fff7c0' : '#ffe14d'; c.fill();
  c.save(); c.clip(); c.strokeStyle = 'rgba(70,110,180,0.7)'; c.lineWidth = 1; for (let k = -12; k <= 12; k += 5) { c.beginPath(); c.moveTo(-16, k); c.lineTo(16, k + 2); c.stroke(); } c.strokeStyle = 'rgba(200,60,60,0.7)'; c.beginPath(); c.moveTo(-7, -16); c.lineTo(-5, 16); c.stroke(); c.restore();
  c.strokeStyle = 'rgba(90,70,20,0.7)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-9, -6); c.lineTo(1, 0); c.lineTo(-3, 9); c.moveTo(4, -10); c.lineTo(8, 2); c.stroke();
  c.strokeStyle = '#2a2008'; c.lineWidth = 2.2; c.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, r = e.r * e.poly[i]; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.stroke();
  c.restore();
  angryEyes(c, 0, -2, 0.8, '#c0261c');
};

ROOMS.push({
  key: 'trash', name: 'THE TRASH BIN', sub: 'Where files go to think about what they did.', seed: 55,
  door: 'NOTIFICATIONS', doorCol: '#ff4f6d', clear: 'TRASH SURVIVED! (it smells)', clearCol: true,
  tombs: [
    { x: 196, y: 300, rect: [-42, -26, 84, 44], draw: drawTrashPile },
    { x: 444, y: 300, rect: [-42, -26, 84, 44], draw: drawTrashPile },
    { x: 190, y: 566, rect: [-46, -26, 92, 50], draw: drawShredder },
    { x: 450, y: 566, rect: [-46, -26, 92, 50], draw: drawShredder },
  ],
  waves: [{ crumple: 4, zombie: 3, popup: 1 }, { crumple: 5, zombie: 2, dbomb: 2, popup: 1 }, { crumple: 5, zombie: 3, letters: 1, dbomb: 1, popup: 1 }],
  bg: bgTrash, enter: trReset, reset: trReset, onWave: trOnWave, update: trUpdate, drawFloor: trDrawFloor, drawTop: trDrawTop,
});

// =====================================================================
// STAGE 6: THE NOTIFICATION STORM
// =====================================================================
const NS = { toasts: [], toastT: 2, pingT: 2.5, anim: 0 };
const TOASTS = [['X', '@grok replied: "lol"', '#111'], ['BATTERY', '1% · plug in NOW', '#3ccf6e'], ['UPDATE', 'iOS 99.1 is here (4.2 GB)', '#8a95a8'], ['MAIL', 'RE: RE: FWD: lunch??', '#2f6fdb'],
  ['CALENDAR', 'Meeting started 5 min ago', '#ff4f6d'], ['PHOTOS', 'You have a new memory', '#f3c84a'], ['BANK', 'New login from: Mars', '#5f9c66'], ['WEATHER', 'Feels like 99°', '#4a90e2'],
  ['FITNESS', 'Time to stand up!', '#ff9a3d'], ['GROKBUTT', 'Someone saw your face', '#8c5fb0']];
function drawBell(c, R) {
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(4, 26, 42, 10, 0, 0, TAU); c.fill();
  c.fillStyle = '#4a3a20'; rr(c, -26, 14, 52, 12, 4); c.fill();
  c.fillStyle = '#d9a72f'; c.beginPath(); c.moveTo(-28, 16); c.quadraticCurveTo(-24, 8, -22, -8); c.quadraticCurveTo(-20, -34, 0, -36); c.quadraticCurveTo(20, -34, 22, -8); c.quadraticCurveTo(24, 8, 28, 16); c.closePath(); c.fill();
  c.strokeStyle = '#5a4210'; c.lineWidth = 2; c.stroke();
  c.fillStyle = 'rgba(255,240,180,0.25)'; c.beginPath(); c.moveTo(-14, 8); c.quadraticCurveTo(-14, -24, -2, -30); c.lineTo(-6, 8); c.fill();
  c.fillStyle = '#8a6a1c'; c.beginPath(); c.arc(0, 20, 6, 0, Math.PI); c.fill();
  c.fillStyle = '#ff3b30'; rr(c, 6, -42, 30, 18, 9); c.fill(); c.strokeStyle = '#5a0b08'; c.lineWidth = 1.5; rr(c, 6, -42, 30, 18, 9); c.stroke();
  c.fillStyle = '#ffeceb'; c.font = `bold 10px ${FONT}`; c.textAlign = 'center'; c.fillText('999', 21, -29);
}
function bgNotifs(c, R) {
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#2a1a4a'); g.addColorStop(0.5, '#4a1f4f'); g.addColorStop(1, '#5a2a2a'); c.fillStyle = g; c.fillRect(0, 0, W, H); // matte lock-screen wallpaper
  for (let i = 0; i < 7; i++) { const x = R() * W, y = 100 + R() * 500, gg = c.createRadialGradient(x, y, 0, x, y, 160); gg.addColorStop(0, 'rgba(255,120,160,0.08)'); gg.addColorStop(1, 'rgba(255,120,160,0)'); c.fillStyle = gg; c.fillRect(0, 0, W, H); }
  c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,0.07)'; c.font = `150px ${FONT}`; c.fillText('9:41', W / 2, 400); c.font = `bold 22px ${FONT}`; c.fillText('Monday · 1,284 notifications', W / 2, 440);
  for (let i = 0; i < 16; i++) { // faded stacked banners on the floor
    c.save(); c.translate(40 + R() * (W - 80), 110 + R() * (H - 150)); c.rotate((R() - 0.5) * 0.3); c.globalAlpha = 0.18;
    c.fillStyle = '#c9b6e8'; rr(c, -46, -10, 92, 20, 7); c.fill(); c.fillStyle = '#2a1a4a'; c.fillRect(-40, -4, 50, 3); c.fillRect(-40, 2, 34, 3);
    c.restore();
  }
  for (let i = 0; i < 14; i++) { c.fillStyle = 'rgba(255,59,48,0.16)'; c.beginPath(); c.arc(R() * W, 90 + R() * (H - 100), 1.5 + R() * 2, 0, TAU); c.fill(); }
  c.save(); c.translate(320, 580); c.globalAlpha = 0.55; c.fillStyle = '#1a1030'; rr(c, -84, -14, 168, 28, 14); c.fill(); c.fillStyle = '#c9b6e8'; c.font = `bold 10px ${FONT}`; c.fillText('☾ DO NOT DISTURB: BROKEN', 0, 4); c.restore();
  backWall(c, '#1c1230', '#2a1a44'); wallPattern(c, '#3a2860', 'pills');
  sideRails(c, '#2a1a44', '#ff3b30');
}
function nsReset() { NS.toasts.length = 0; NS.toastT = 2; NS.pingT = 2.5; }
function nsUpdate(dt) {
  NS.anim += dt;
  const live = hazardsLive(), w = clamp(waveIdx, 0, 2);
  if (live) {
    NS.toastT -= dt;
    if (NS.toastT <= 0 && NS.toasts.length < 3) {
      NS.toastT = [2.6, 2.1, 1.7][w];
      const dir = Math.random() < 0.5 ? 1 : -1, tw = 210, info = pick(TOASTS);
      NS.toasts.push({ y: clamp(player.y + rnd(-50, 50), 130, 590), dir, x: dir > 0 ? -tw / 2 - 10 : W + tw / 2 + 10, st: 0, t: 1.0, w: tw, h: 44, app: info[0], msg: info[1], col: info[2], sp: 380 + w * 50 });
      SFX.ping();
    }
    NS.pingT -= dt;
    if (NS.pingT <= 0) { NS.pingT = rnd(2.5, 4.5); SFX.ping(); pop(rnd(90, 550), rnd(130, 560), pick(['*ping*', '*ding*', 'bzzt bzzt', '1 new message', 'u up?', 'Wi-Fi is weak', 'Storage almost full', '+1 follower']), '#ffb3c1', 13, 1.1); }
  } else if (doorOpen) NS.toasts.length = 0;
  for (const t of NS.toasts) {
    if (t.st === 0) { t.t -= dt; if (t.t <= 0) t.st = 1; continue; }
    t.x += t.dir * t.sp * dt;
    if ((t.dir > 0 && t.x - t.w / 2 > W + 20) || (t.dir < 0 && t.x + t.w / 2 < -20)) t.dead = true;
    if (circRect(player.x, player.y, player.r - 3, t.x - t.w / 2, t.y - t.h / 2, t.w, t.h)) { const was = player.inv; hurtPlayer(10, t.x, t.y + (player.y < t.y ? 30 : -30)); if (was <= 0 && player.inv > 0) pop(player.x, player.y - 60, 'NOTIFIED!', '#ff8aa0', 15, 0.7); }
  }
  prune(NS.toasts, notDead);
}
function nsDrawTop(c) {
  for (const t of NS.toasts) {
    if (t.st === 0) { // lane warning + edge arrow
      const p = 0.5 + 0.5 * Math.sin(t.t * 22);
      c.fillStyle = `rgba(255,79,109,${0.08 + p * 0.08})`; c.fillRect(0, t.y - t.h / 2, W, t.h);
      c.strokeStyle = 'rgba(255,79,109,0.6)'; c.lineWidth = 1.5; c.setLineDash([8, 6]); c.beginPath(); c.moveTo(0, t.y - t.h / 2); c.lineTo(W, t.y - t.h / 2); c.moveTo(0, t.y + t.h / 2); c.lineTo(W, t.y + t.h / 2); c.stroke(); c.setLineDash([]);
      const ex = t.dir > 0 ? 30 : W - 30;
      c.save(); c.translate(ex, t.y); if (t.dir < 0) c.scale(-1, 1);
      c.fillStyle = '#ff4f6d'; c.strokeStyle = '#1a0610'; c.lineWidth = 3; c.beginPath(); c.moveTo(20, 0); c.lineTo(-4, -16); c.lineTo(-4, -7); c.lineTo(-18, -7); c.lineTo(-18, 7); c.lineTo(-4, 7); c.lineTo(-4, 16); c.closePath(); c.stroke(); c.fill();
      c.restore();
      c.textAlign = 'center'; otext(c, 'INCOMING!', t.dir > 0 ? 90 : W - 90, t.y + 4, '#ffb3c1', 11, 3);
      continue;
    }
    const x = t.x - t.w / 2, y = t.y - t.h / 2;
    c.strokeStyle = 'rgba(255,180,200,0.35)'; c.lineWidth = 2; for (const o of [-12, 0, 12]) { c.beginPath(); c.moveTo(t.x - t.dir * (t.w / 2 + 6), t.y + o); c.lineTo(t.x - t.dir * (t.w / 2 + 40), t.y + o); c.stroke(); }
    c.fillStyle = 'rgba(0,0,0,0.35)'; rr(c, x + 3, y + 4, t.w, t.h, 12); c.fill();
    c.fillStyle = '#d9d2e6'; rr(c, x, y, t.w, t.h, 12); c.fill(); c.strokeStyle = '#ff4f6d'; c.lineWidth = 2.5; rr(c, x, y, t.w, t.h, 12); c.stroke();
    c.fillStyle = t.col; rr(c, x + 8, y + 8, 28, 28, 7); c.fill(); c.fillStyle = '#f4f0fa'; c.font = `bold 11px ${FONT}`; c.textAlign = 'center'; c.fillText(t.app[0], x + 22, y + 26);
    c.textAlign = 'left'; c.fillStyle = '#2a1a3a'; c.font = `bold 9px ${FONT}`; c.fillText(t.app, x + 44, y + 18);
    c.fillStyle = '#16101e'; c.font = `bold 10px ${FONT}`; c.fillText(t.msg, x + 44, y + 33);
    c.textAlign = 'right'; c.fillStyle = '#6a5a7a'; c.font = `bold 8px ${FONT}`; c.fillText('now', x + t.w - 10, y + 18);
  }
}
// --- notification badge: swarms, circles you, dives, and splits in two when popped (99+ -> 9+ -> 1)
const BADGE_R = [10, 13, 18], BADGE_HP = [6, 10, 18], BADGE_TXT = ['1', '9+', '99+'];
EDEF.badge = { r: 18, hp: 18, speed: 110, dmg: 7, score: 60, drop: 0.07, cols: ['#ff3b30', '#ffd34d', '#ff8a80'], init: e => { e.lvl = 2; e.side = Math.random() < 0.5 ? 1 : -1; e.dive = rnd(2, 4); e.sinv = 0; } };
function setBadge(e, l) { e.lvl = l; e.r = BADGE_R[l]; e.hp = e.maxhp = BADGE_HP[l]; }
EAI.badge = (e, dt, dx, dy, d) => {
  if (e.sinv > 0) e.sinv -= dt;
  const sp = [150, 130, 110][e.lvl] + Math.max(0, waveIdx) * 8;
  e.dive -= dt;
  let a = Math.atan2(dy, dx);
  if (e.dive > 0.9) a += e.side * (d > 110 ? 0.9 : 1.45);
  if (e.dive <= 0) { e.dive = rnd(2.2, 3.8); e.side = -e.side; }
  e.mvx = Math.cos(a) * sp + Math.sin(e.t * 7) * 20; e.mvy = Math.sin(a) * sp + Math.cos(e.t * 6) * 20;
};
EDMG.badge = e => e.sinv > 0 ? 0 : 1;
EKILL.badge = e => {
  if (e.lvl > 0 && enemies.length < 44) {
    for (const s of [-1, 1]) { const ch = spawnEnemy('badge', e.x + s * 10, e.y); setBadge(ch, e.lvl - 1); ch.sinv = 0.3; ch.kx = s * 220; ch.ky = rnd(-120, 120); ch.dive = rnd(1.2, 2.5); ch.side = s; }
    pop(e.x, e.y - 22, e.lvl === 2 ? '99+ → 9+ 9+' : 'SPLIT!', '#ffb3c1', 13, 0.6);
    SFX.ping();
  }
  return false;
};
EDRAW.badge = (c, e, fl) => {
  c.translate(0, -Math.abs(Math.sin(e.t * 8)) * 3);
  const txt = BADGE_TXT[e.lvl], h = e.r * 1.8, fs = [10, 11, 13][e.lvl];
  c.font = `bold ${fs}px ${FONT}`; const w = Math.max(h, c.measureText(txt).width + 12);
  c.fillStyle = fl ? '#ffc9c4' : '#ff3b30'; rr(c, -w / 2, -h / 2, w, h, h / 2); c.fill();
  c.strokeStyle = '#4a0805'; c.lineWidth = 2; rr(c, -w / 2, -h / 2, w, h, h / 2); c.stroke();
  c.fillStyle = '#fff1ef'; c.textAlign = 'center'; c.fillText(txt, 0, fs * 0.36 + 1);
  if (e.lvl > 0) { c.strokeStyle = '#4a0805'; c.lineWidth = 2; c.beginPath(); c.moveTo(-w / 2 + 3, -h / 2 - 3); c.lineTo(-w / 2 + 10, -h / 2 + 1); c.moveTo(w / 2 - 3, -h / 2 - 3); c.lineTo(w / 2 - 10, -h / 2 + 1); c.stroke(); }
};

ROOMS.push({
  key: 'notifs', name: 'THE NOTIFICATION STORM', sub: 'You have 1,284 unread reasons to panic.', seed: 66,
  door: 'BOSS: CROP TOOL', doorCol: '#ff4f6d', clear: 'ALL MARKED AS READ!', clearCol: true,
  tombs: [
    { x: 104, y: 330, rect: [-34, -30, 68, 52], draw: drawBell },
    { x: 536, y: 330, rect: [-34, -30, 68, 52], draw: drawBell },
  ],
  waves: [{ badge: 3, spam: 2, popup: 1 }, { badge: 4, letters: 1, popup: 1 }, { badge: 5, captcha: 2, popup: 1 }],
  bg: bgNotifs, enter: nsReset, reset: nsReset, update: nsUpdate, drawTop: nsDrawTop,
});
