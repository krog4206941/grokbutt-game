// GROKBUTT SLAP - all sounds synthesized with WebAudio (no samples, no voice)
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
  pak(ctx, out, t, p) { // tsinelas: dry rubbery "pak"
    const n = nsrc(ctx, t, 0.12), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600 * (p.pitch || 1); bp.Q.value = 1.4;
    const g = ctx.createGain(); env(g, t, 0.001, 1.0 * (p.str || 1), 0.05); n.connect(bp).connect(g).connect(out);
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.04);
    const lp = ctx.createBiquadFilter(); lp.frequency.value = 1500; const g2 = ctx.createGain(); env(g2, t, 0.001, 0.25, 0.04); o.connect(lp).connect(g2).connect(out); o.start(t); o.stop(t + 0.08);
  },
  fish(ctx, out, t, p) { // wet floppy fish slap
    const n = nsrc(ctx, t, 0.3), lp = ctx.createBiquadFilter(); lp.type = 'bandpass'; lp.Q.value = 2.5; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(300, t + 0.2);
    const g = ctx.createGain(); env(g, t, 0.002, 0.9 * (p.str || 1), 0.18); n.connect(lp).connect(g).connect(out);
    for (let k = 0; k < 3; k++) { const o = ctx.createOscillator(); o.type = 'sine'; const tk = t + 0.03 + k * 0.045; o.frequency.setValueAtTime(700 - k * 90, tk); o.frequency.exponentialRampToValueAtTime(260, tk + 0.04);
      const g2 = ctx.createGain(); env(g2, tk, 0.002, 0.22 - k * 0.05, 0.04); o.connect(g2).connect(out); o.start(tk); o.stop(tk + 0.07); }
  },
  fwump(ctx, out, t, p) { // soft pillow
    const n = nsrc(ctx, t, 0.35), lp = ctx.createBiquadFilter(); lp.frequency.setValueAtTime(700, t); lp.frequency.exponentialRampToValueAtTime(160, t + 0.25);
    const g = ctx.createGain(); env(g, t, 0.02, 0.7 * (p.str || 1), 0.22); n.connect(lp).connect(g).connect(out);
  },
  giant(ctx, out, t, p) { // deep giant-hand thud + slap crack
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.35);
    const g = ctx.createGain(); env(g, t, 0.003, 1.0, 0.4); o.connect(g).connect(out); o.start(t); o.stop(t + 0.5);
    SYNTH.slap(ctx, out, t, { str: 1, pitch: 0.7 });
  },
  voice(ctx, out, t, p) { // squeaky cartoon yelps via formant filters on a buzzy source (kyaa / itai / squeal)
    const kind = p.kind || 0, dur = [0.3, 0.32, 0.36][kind], f0 = (p.pitch || 1);
    const src = ctx.createOscillator(); src.type = 'sawtooth';
    const F = src.frequency;
    if (kind === 0) { F.setValueAtTime(700 * f0, t); F.linearRampToValueAtTime(1150 * f0, t + 0.06); F.exponentialRampToValueAtTime(760 * f0, t + dur); }
    else if (kind === 1) { F.setValueAtTime(820 * f0, t); F.setValueAtTime(980 * f0, t + 0.11); F.exponentialRampToValueAtTime(720 * f0, t + dur); }
    else { F.setValueAtTime(900 * f0, t); F.exponentialRampToValueAtTime(1900 * f0, t + 0.18); F.exponentialRampToValueAtTime(1100 * f0, t + dur); }
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 11; vg.gain.value = 18 * f0; vib.connect(vg).connect(F); vib.start(t); vib.stop(t + dur);
    // vowel formant tracks (x1.35 for a tiny cartoon voice): a = 800/1300, i = 330/2500
    const A = [1080, 1750], I = [450, 3300];
    const track = kind === 0 ? [[0, I], [0.05, A]] : kind === 1 ? [[0, I], [0.09, A], [0.2, I]] : [[0, I], [0.15, I]];
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.42, t + 0.015);
    if (kind === 1) { g.gain.setValueAtTime(0.42, t + 0.085); g.gain.linearRampToValueAtTime(0.03, t + 0.1); g.gain.linearRampToValueAtTime(0.4, t + 0.12); }
    g.gain.setValueAtTime(0.38, t + dur - 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (let k = 0; k < 2; k++) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = k ? 9 : 6;
      for (const [dt, f] of track) bp.frequency.linearRampToValueAtTime(f[k], t + dt + 0.001);
      bp.frequency.setValueAtTime(track[0][1][k], t); const bg = ctx.createGain(); bg.gain.value = k ? 0.9 : 1.2; src.connect(bp).connect(bg).connect(g); }
    // consonant: k / t click
    const n = nsrc(ctx, t, 0.03), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000; const ng = ctx.createGain(); env(ng, t, 0.001, 0.25, 0.018); n.connect(hp).connect(ng).connect(out);
    if (kind === 1) { const n2 = nsrc(ctx, t + 0.095, 0.03), h2 = ctx.createBiquadFilter(); h2.type = 'highpass'; h2.frequency.value = 3500; const g2 = ctx.createGain(); env(g2, t + 0.095, 0.001, 0.22, 0.015); n2.connect(h2).connect(g2).connect(out); }
    g.connect(out); src.start(t); src.stop(t + dur + 0.02);
  },
  jingle(ctx, out, t) { // soft bell arpeggio for the secret moment
    [784, 988, 1175, 1568].forEach((f, i) => { const tt = t + i * 0.11; for (const m of [1, 2.01]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * m;
      const g = ctx.createGain(); env(g, tt, 0.005, m === 1 ? 0.22 : 0.06, 0.7); o.connect(g).connect(out); o.start(tt); o.stop(tt + 0.8); } });
  },
  tick(ctx, out, t, p) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = p.f || 880; const g = ctx.createGain(); env(g, t, 0.003, 0.15, 0.12); o.connect(g).connect(out); o.start(t); o.stop(t + 0.2); },
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
    if (this.ctx && !this.clips) this.loadClips();
  }
  // Real CC0 voice clips (see assets/voice/CREDITS.txt); synth 'voice' stays as fallback.
  loadClips() {
    this.clips = {}; const ogg = !!document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"');
    const G = { kyaa: 0.75, nya1: 1, nya2: 0.9, nya3: 1.15, ouch: 1.2 };
    for (const n of Object.keys(G)) fetch('./assets/voice/' + n + (ogg ? '.ogg' : '.mp3')).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then(b => this.ctx.decodeAudioData(b)).then(buf => { this.clips[n] = { buf, g: G[n] }; }).catch(() => {});
  }
  playVoice(big) { // cute yelp: random clip, ±8% pitch; hard hits prefer kyaa/ouch
    if (this.log) { this.log.push({ t: this.clock(), name: 'voice', p: { kind: big ? 2 : 0 } }); return; }
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
    const pool = Object.keys(this.clips || {}).filter(n => !big || n === 'kyaa' || n === 'ouch');
    const names = pool.length ? pool : Object.keys(this.clips || {});
    if (!names.length) return this.play('voice', { kind: big ? 2 : (Math.random() < 0.5 ? 0 : 1), pitch: 0.9 + Math.random() * 0.25 });
    const c = this.clips[names[Math.floor(Math.random() * names.length)]];
    const src = this.ctx.createBufferSource(); src.buffer = c.buf; src.playbackRate.value = (big ? 1.04 : 1) * (0.92 + Math.random() * 0.16);
    const g = this.ctx.createGain(); g.gain.value = 0.55 * c.g; src.connect(g).connect(this.out); src.start(this.ctx.currentTime + 0.01);
    this.lastClip = c;
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
// Chill lofi-ish loop (soft pads + gentle beat), scheduled with a small lookahead. Off by default.
export class Music {
  constructor(sfx) { this.sfx = sfx; this.on = false; this.timer = null; }
  start() {
    const ctx = this.sfx.ctx; if (!ctx || this.on) return; this.on = true;
    this.bus = ctx.createGain(); this.bus.gain.value = 0.0001; this.bus.gain.exponentialRampToValueAtTime(0.32, ctx.currentTime + 1.5);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; this.bus.connect(lp).connect(this.sfx.out);
    this.step = 0; this.next = ctx.currentTime + 0.1; const spb = 60 / 72 / 2; // 8th notes at 72 bpm
    const chords = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    this.timer = setInterval(() => {
      while (this.next < ctx.currentTime + 0.15) {
        const t = this.next, s = this.step % 32, bar = Math.floor(this.step / 8) % 4;
        if (s % 8 === 0) for (const m of chords[bar]) { // pad
          for (const det of [-4, 4]) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(m); o.detune.value = det;
            const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + 0.4); g.gain.linearRampToValueAtTime(0.0001, t + spb * 8 + 0.2);
            o.connect(g).connect(this.bus); o.start(t); o.stop(t + spb * 8 + 0.3); } }
        if (s % 8 === 0 || s % 8 === 5) { const o = ctx.createOscillator(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); // kick
          const g = ctx.createGain(); env(g, t, 0.004, 0.5, 0.22); o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.3); }
        if (s % 8 === 4) { const n = nsrc(ctx, t, 0.2), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.8; // soft snare
          const g = ctx.createGain(); env(g, t, 0.004, 0.16, 0.14); n.connect(bp).connect(g).connect(this.bus); }
        { const n = nsrc(ctx, t, 0.05), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000; // hat
          const g = ctx.createGain(); env(g, t + (s % 2 ? 0.04 : 0), 0.002, s % 2 ? 0.035 : 0.05, 0.03); n.connect(hp).connect(g).connect(this.bus); }
        if (s % 4 === 2 && Math.random() < 0.6) { const m = chords[bar][Math.floor(Math.random() * 4)] + 12; const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(m); // keys
          const g = ctx.createGain(); env(g, t, 0.01, 0.05, 0.6); o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.7); }
        this.next += spb; this.step++;
      }
    }, 30);
  }
  stop() { if (!this.on) return; this.on = false; clearInterval(this.timer); const ctx = this.sfx.ctx; const b = this.bus; b.gain.cancelScheduledValues(ctx.currentTime); b.gain.setValueAtTime(b.gain.value, ctx.currentTime); b.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6); setTimeout(() => b.disconnect(), 800); }
}
