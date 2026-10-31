// GROKBUTT SLAP DEMO - all sounds synthesized with WebAudio (no samples, no voice)
const noiseCache = new WeakMap();
function noise(ctx) {
  let b = noiseCache.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    let s = 12345;
    for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = (s / 0x3fffffff) - 1; }
    noiseCache.set(ctx, b);
  }
  return b;
}
function env(g, t, a, peak, dec) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
}
function nsrc(ctx, t, dur) {
  const s = ctx.createBufferSource(); s.buffer = noise(ctx); s.loop = true;
  s.start(t, Math.random() * 0.5); s.stop(t + dur); return s;
}
export const SYNTH = {
  slap(ctx, out, t, p) { // crisp + meaty
    const str = p.str, pi = p.pitch;
    const n1 = nsrc(ctx, t, 0.25), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500 * pi; bp.Q.value = 0.7;
    const g1 = ctx.createGain(); env(g1, t, 0.0015, 0.9 * str, 0.11); n1.connect(bp).connect(g1).connect(out);
    const n2 = nsrc(ctx, t, 0.08), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3800 * pi;
    const g2 = ctx.createGain(); env(g2, t, 0.001, 0.55 * str, 0.035); n2.connect(hp).connect(g2).connect(out);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(170 * pi, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
    const g3 = ctx.createGain(); env(g3, t, 0.002, 0.85 * str, 0.15); o.connect(g3).connect(out); o.start(t); o.stop(t + 0.3);
  },
  wobble(ctx, out, t, p) { // jelly wobble after slap
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 190 * p.pitch;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 9 + p.pitch * 2; const lg = ctx.createGain(); lg.gain.value = 45;
    lfo.connect(lg).connect(o.frequency);
    const trem = ctx.createGain(); const tl = ctx.createOscillator(); tl.frequency.value = 12; const tg = ctx.createGain(); tg.gain.value = 0.5;
    tl.connect(tg).connect(trem.gain); trem.gain.value = 0.5;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = ctx.createGain(); env(g, t, 0.03, 0.22 * p.str, 0.55);
    o.connect(trem).connect(lp).connect(g).connect(out);
    [o, lfo, tl].forEach(x => { x.start(t); x.stop(t + 0.7); });
  },
  squish(ctx, out, t, p) {
    const n = nsrc(ctx, t, 0.4), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 7;
    lp.frequency.setValueAtTime(2200, t); lp.frequency.exponentialRampToValueAtTime(260, t + 0.3);
    const g = ctx.createGain(); env(g, t, 0.02, 0.35 * (p.str || 1), 0.3); n.connect(lp).connect(g).connect(out);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.25);
    const g2 = ctx.createGain(); env(g2, t, 0.02, 0.12, 0.25); o.connect(g2).connect(out); o.start(t); o.stop(t + 0.35);
  },
  boing(ctx, out, t, p) {
    const hi = p.hi ? 1.8 : 1;
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(380 * hi, t); o.frequency.exponentialRampToValueAtTime(130 * hi, t + 0.5);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 15; const lg = ctx.createGain(); lg.gain.value = 22 * hi; lfo.connect(lg).connect(o.frequency);
    const g = ctx.createGain(); env(g, t, 0.01, 0.32 * (p.str || 1), 0.6); o.connect(g).connect(out);
    [o, lfo].forEach(x => { x.start(t); x.stop(t + 0.7); });
  },
  whoosh(ctx, out, t, p) {
    const n = nsrc(ctx, t, 0.6), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.3;
    bp.frequency.setValueAtTime(350, t); bp.frequency.exponentialRampToValueAtTime(1500, t + 0.22); bp.frequency.exponentialRampToValueAtTime(450, t + 0.5);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * (p.str || 1), t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    n.connect(bp).connect(g).connect(out);
  },
  giggle(ctx, out, t, p) { // bouncy jiggle blips, not a voice
    const base = 560 * (p.pitch || 1);
    for (let i = 0; i < 5; i++) {
      const tt = t + i * 0.065, f = base * (1 + 0.25 * ((i * 7) % 3) / 2);
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f * 1.25, tt); o.frequency.exponentialRampToValueAtTime(f, tt + 0.05);
      const g = ctx.createGain(); env(g, tt, 0.005, 0.1, 0.06); o.connect(g).connect(out); o.start(tt); o.stop(tt + 0.1);
    }
  },
  toot(ctx, out, t, p) { // silly fart
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(105, t); o.frequency.linearRampToValueAtTime(78, t + 0.45); o.frequency.linearRampToValueAtTime(120, t + 0.62);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 24; const lg = ctx.createGain(); lg.gain.value = 16; lfo.connect(lg).connect(o.frequency);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650; lp.Q.value = 5;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.34, t + 0.03);
    g.gain.setValueAtTime(0.3, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.68);
    o.connect(lp).connect(g).connect(out);
    const n = nsrc(ctx, t, 0.7), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 320; bp.Q.value = 2;
    const g2 = ctx.createGain(); env(g2, t, 0.02, 0.12, 0.6); n.connect(bp).connect(g2).connect(out);
    [o, lfo].forEach(x => { x.start(t); x.stop(t + 0.75); });
  },
  thud(ctx, out, t, p) {
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.15);
    const g = ctx.createGain(); env(g, t, 0.003, 0.55 * p.str, 0.18); o.connect(g).connect(out); o.start(t); o.stop(t + 0.25);
    const n = nsrc(ctx, t, 0.2), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    const g2 = ctx.createGain(); env(g2, t, 0.002, 0.3 * p.str, 0.1); n.connect(lp).connect(g2).connect(out);
  },
};
function chain(ctx) {
  const master = ctx.createGain(); master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination); return master;
}
export class Sfx {
  constructor() { this.ctx = null; this.muted = localStorage.getItem('gb_muted') === '1'; this.log = null; this.clock = null; }
  unlock() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.out = chain(this.ctx); this.out.gain.value = this.muted ? 0 : 0.8; } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  setMuted(m) { this.muted = m; localStorage.setItem('gb_muted', m ? '1' : '0'); if (this.out) this.out.gain.value = m ? 0 : 0.8; }
  play(name, p = {}) {
    if (this.log) { this.log.push({ t: this.clock(), name, p }); return; }
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
    SYNTH[name](this.ctx, this.out, this.ctx.currentTime + 0.005, p);
  }
}
// Offline render of a logged timeline (used to make the demo clip audio)
export async function renderLog(log, dur) {
  const sr = 44100, ctx = new OfflineAudioContext(2, Math.ceil(sr * dur), sr), out = chain(ctx);
  for (const e of log) if (e.t < dur) SYNTH[e.name](ctx, out, Math.max(0.001, e.t), e.p);
  const buf = await ctx.startRendering();
  const n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1);
  const ab = new ArrayBuffer(44 + n * 4), v = new DataView(ab);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); v.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
  let s = ''; const u = new Uint8Array(ab); for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
  return btoa(s);
}
