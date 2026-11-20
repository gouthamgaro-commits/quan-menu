// Procedural sound: every effect and the music is synthesised with WebAudio, no audio files.

const SCALE = [146.83, 164.81, 174.61, 196.0, 220.0, 246.94, 261.63, 293.66, 329.63, 349.23, 440.0];

export class Sfx {
  constructor() {
    this.ctx = null;
    this.tension = 0;
    this.note = 4;
    this.tick = 0;
  }

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.out = ctx.createGain();
    this.out.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    this.out.connect(comp); comp.connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // Night wind: looped noise through a slowly wandering low-pass.
    const wind = ctx.createBufferSource(); wind.buffer = this.noiseBuf; wind.loop = true;
    const wf = ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 320;
    const wg = ctx.createGain(); wg.gain.value = 0.05;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
    const lg = ctx.createGain(); lg.gain.value = 160;
    lfo.connect(lg); lg.connect(wf.frequency); lfo.start();
    wind.connect(wf); wf.connect(wg); wg.connect(this.out); wind.start();

    // Drone under the music.
    this.drone = ctx.createGain(); this.drone.gain.value = 0.035;
    const df = ctx.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 260;
    for (const f of [73.42, 110.0, 73.9]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      o.connect(df); o.start();
    }
    df.connect(this.drone); this.drone.connect(this.out);

    setInterval(() => this.beat(), 240);
  }

  setTension(v) { this.tension = v; }
  mute(m) { if (this.out) this.out.gain.value = m ? 0 : 0.9; }

  beat() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.tick++;
    if (this.tension > 0.5) {
      // Pursuit: war drum and a low, urgent line.
      this.tone(this.tick % 4 === 0 ? 58 : 82, 0.22, { type: 'sine', gain: 0.32, f2: 38 });
      if (this.tick % 2 === 0) this.noise(0.05, { f: 2400, q: 1, gain: 0.05 });
      if (this.tick % 2 === 1) this.pluck(SCALE[[0, 2, 3, 0, 4, 3][(this.tick >> 1) % 6]] / 2, 0.11);
    } else {
      if (this.tick % 2 === 0 && Math.random() < 0.6) {
        this.note = Math.max(0, Math.min(SCALE.length - 1, this.note + Math.round((Math.random() - 0.5) * 5)));
        this.pluck(SCALE[this.note], 0.07);
        if (Math.random() < 0.25) this.pluck(SCALE[Math.max(0, this.note - 4)], 0.05);
      }
      if (this.tick % 24 === 0) this.cricket();
    }
  }

  env(dur, gain, attack = 0.005) {
    const g = this.ctx.createGain(), t = this.ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.out);
    return g;
  }

  tone(freq, dur, o = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, osc = this.ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    osc.connect(this.env(dur, (o.gain ?? 0.2) * (o.vol ?? 1), o.attack));
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  noise(dur, o = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = o.type || 'bandpass'; f.Q.value = o.q ?? 1;
    f.frequency.setValueAtTime(o.f ?? 1000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    src.connect(f); f.connect(this.env(dur, (o.gain ?? 0.3) * (o.vol ?? 1), o.attack));
    src.start(t, Math.random()); src.stop(t + dur + 0.02);
  }

  pluck(freq, gain = 0.08) {
    this.tone(freq, 0.9, { type: 'triangle', gain });
    this.tone(freq * 2, 0.35, { type: 'sine', gain: gain * 0.4 });
  }

  cricket() {
    for (let i = 0; i < 3; i++) setTimeout(() => this.tone(4200, 0.05, { type: 'square', gain: 0.008 }), i * 90);
  }

  swing(vol = 1) { this.noise(0.22, { f: 500, f2: 2600, q: 2, gain: 0.25, vol, attack: 0.05 }); }
  hit(vol = 1) {
    this.tone(120, 0.16, { type: 'square', gain: 0.25, f2: 50, vol });
    this.noise(0.12, { f: 900, q: 0.7, gain: 0.3, vol });
  }
  clang(vol = 1) {
    for (const f of [1760, 2630, 3520, 4180]) this.tone(f * (0.97 + Math.random() * 0.06), 0.4, { type: 'triangle', gain: 0.09, vol });
    this.noise(0.06, { f: 5000, q: 0.5, gain: 0.25, vol });
  }
  bowDraw() { this.noise(0.5, { f: 300, f2: 700, q: 6, gain: 0.05, attack: 0.2 }); }
  bow(vol = 1) {
    this.tone(260, 0.2, { type: 'sawtooth', gain: 0.16, f2: 90, vol });
    this.noise(0.25, { f: 1800, f2: 500, q: 1.5, gain: 0.14, vol });
  }
  crossbow(vol = 1) {
    this.tone(180, 0.12, { type: 'square', gain: 0.2, f2: 60, vol });
    this.noise(0.08, { f: 3000, q: 0.6, gain: 0.3, vol });
  }
  click() { this.noise(0.04, { f: 2600, q: 3, gain: 0.2 }); }
  thunk(vol = 1) {
    this.tone(210, 0.1, { type: 'triangle', gain: 0.3, f2: 80, vol });
    this.noise(0.05, { f: 1400, q: 1, gain: 0.2, vol });
  }
  stab() {
    this.noise(0.14, { f: 3200, f2: 800, q: 1.2, gain: 0.3 });
    this.tone(90, 0.25, { type: 'sine', gain: 0.3, f2: 45 });
  }
  step(kind = 0, vol = 1) {
    const f = kind === 2 ? 1500 : kind === 1 ? 420 : 240;
    this.noise(kind === 2 ? 0.2 : 0.08, { type: kind === 2 ? 'bandpass' : 'lowpass', f, q: 0.8, gain: 0.16, vol });
  }
  land(vol = 1) { this.tone(70, 0.2, { gain: 0.4, f2: 35, vol }); this.noise(0.12, { type: 'lowpass', f: 300, gain: 0.3, vol }); }
  hay() { this.noise(0.4, { f: 2600, f2: 900, q: 0.6, gain: 0.25, attack: 0.03 }); }
  coin() { this.tone(1975, 0.12, { gain: 0.1 }); setTimeout(() => this.tone(2637, 0.3, { gain: 0.1 }), 70); }
  chest() { this.noise(0.3, { f: 500, f2: 200, q: 4, gain: 0.25, attack: 0.05 }); this.tone(98, 0.3, { type: 'triangle', gain: 0.15 }); }
  hurt() { this.tone(160, 0.25, { type: 'sawtooth', gain: 0.2, f2: 70 }); this.noise(0.15, { f: 700, gain: 0.3 }); }
  bark(pitch = 1, vol = 1) {
    this.tone(150 * pitch, 0.24, { type: 'sawtooth', gain: 0.14, f2: 105 * pitch, vol, attack: 0.02 });
    this.noise(0.2, { f: 900 * pitch, q: 3, gain: 0.1, vol, attack: 0.02 });
  }
  grunt(vol = 1) { this.tone(125, 0.18, { type: 'sawtooth', gain: 0.16, f2: 70, vol }); }
  smoke() { this.noise(1.1, { type: 'lowpass', f: 2600, f2: 300, gain: 0.35, attack: 0.02 }); }
  whistle() { this.tone(1500, 0.28, { gain: 0.1, f2: 2300, attack: 0.04 }); }
  potion() { this.tone(520, 0.3, { gain: 0.12, f2: 880, attack: 0.05 }); }
  bell() {
    for (let i = 0; i < 5; i++) setTimeout(() => {
      for (const [f, g] of [[220, 0.2], [440, 0.12], [554, 0.08], [659, 0.07], [1108, 0.03]]) this.tone(f, 2.4, { gain: g });
    }, i * 900);
  }
  fanfare() { [293.66, 349.23, 440, 587.33].forEach((f, i) => setTimeout(() => this.pluck(f, 0.14), i * 170)); }
}
