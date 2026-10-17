// Web Audio engine: generative pentatonic marimba/kalimba ambience, a minor-key
// dragon battle theme, and all sound effects. Everything is synthesized, no files.

const PENTA = [0, 2, 4, 7, 9];           // major pentatonic (C D E G A)
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.mode = 'calm';
    this.volume = 0.7;
  }

  // Must be called from a user gesture (browser autoplay policy).
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.8);
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    this.reverb.connect(wet).connect(this.master);

    this.sfx = this.bus(1.0);
    this.calmBus = this.bus(0.9);
    this.battleBus = this.bus(0.0);
    this.noise = this.noiseBuffer();
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.1;
    this.melodyIdx = 7;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  bus(gain) {
    const g = this.ctx.createGain();
    g.gain.value = gain;
    g.connect(this.master);
    const send = this.ctx.createGain(); send.gain.value = 0.6;
    g.connect(send).connect(this.reverb);
    return g;
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }

  impulse(sec) {
    const len = this.ctx.sampleRate * sec, buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }

  noiseBuffer() {
    const len = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---------------------------------------------------------- music modes
  setMode(mode) {
    if (!this.ctx || mode === this.mode) { this.mode = mode; return; }
    this.mode = mode;
    const t = this.ctx.currentTime;
    const [calm, battle] = mode === 'battle' ? [0.0, 0.9] : [0.9, 0.0];
    for (const [bus, v] of [[this.calmBus, calm], [this.battleBus, battle]]) {
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(bus.gain.value, t);
      bus.gain.linearRampToValueAtTime(v, t + 2.0);   // 2 s crossfade
    }
    this.step = 0;
  }

  schedule() {
    const ctx = this.ctx;
    while (this.nextTime < ctx.currentTime + 0.12) {
      const battle = this.mode === 'battle';
      const stepDur = 60 / (battle ? 132 : 88) / 2; // 8th notes
      if (battle) this.battleStep(this.step, this.nextTime, stepDur);
      else this.calmStep(this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  calmStep(step, t, dur) {
    const bar = Math.floor(step / 8) % 4, beat = step % 8;
    const roots = [48, 45, 41, 43];            // C  Am  F  G
    if (beat === 0) {
      this.marimba(midi(roots[bar] - 12), t, 0.35, this.calmBus, 2.0);
      this.pad([roots[bar], roots[bar] + 7, roots[bar] + 16], t, dur * 8, this.calmBus);
    }
    if (beat === 4) this.marimba(midi(roots[bar]), t, 0.18, this.calmBus, 1.2);
    // random-walk melody over the pentatonic scale
    if (Math.random() < (beat % 2 === 0 ? 0.75 : 0.35)) {
      this.melodyIdx = Math.max(0, Math.min(14, this.melodyIdx + Math.floor(Math.random() * 5) - 2));
      const n = 60 + 12 * Math.floor(this.melodyIdx / 5) + PENTA[this.melodyIdx % 5];
      this.marimba(midi(n), t, 0.22, this.calmBus);
    }
    if (Math.random() < 0.08) { // kalimba sparkle
      const n = 84 + PENTA[Math.floor(Math.random() * 5)];
      this.kalimba(midi(n), t, 0.12, this.calmBus);
    }
  }

  battleStep(step, t, dur) {
    const bar = Math.floor(step / 8) % 4, beat = step % 8;
    const chords = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]]; // Am F G E
    const ch = chords[bar];
    if (beat === 0) this.brass(ch, t, dur * 7.5, this.battleBus);
    // piano arpeggio
    const arp = [0, 1, 2, 1, 0, 2, 1, 2][beat];
    this.piano(midi(ch[arp] + 12), t, 0.16, this.battleBus);
    if (beat % 4 === 0) this.drum(t, 0.7, this.battleBus);
    if (beat % 4 === 2) this.snare(t, 0.25, this.battleBus);
    if (beat === 0) this.piano(midi(ch[0] - 24), t, 0.3, this.battleBus, 1.6);
  }

  // ------------------------------------------------------------ voices
  env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  tone(type, freq, t, peak, attack, decay, dest) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    this.env(g, t, peak, attack, decay);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + attack + decay + 0.05);
    return o;
  }

  marimba(f, t, v = 0.25, dest = this.sfx, decay = 0.9) {
    this.tone('sine', f, t, v, 0.004, decay, dest);
    this.tone('sine', f * 4, t, v * 0.25, 0.002, 0.12, dest);   // wooden bar overtone
    this.tone('triangle', f * 10, t, v * 0.05, 0.001, 0.03, dest); // mallet click
  }

  kalimba(f, t, v = 0.15, dest = this.sfx) {
    this.tone('sine', f, t, v, 0.003, 1.6, dest);
    this.tone('sine', f * 5.4, t, v * 0.3, 0.002, 0.25, dest);
  }

  piano(f, t, v = 0.2, dest = this.sfx, decay = 0.7) {
    this.tone('triangle', f, t, v, 0.005, decay, dest);
    this.tone('sine', f * 2, t, v * 0.4, 0.005, decay * 0.6, dest);
  }

  pad(notes, t, dur, dest) {
    for (const n of notes) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lp = this.ctx.createBiquadFilter();
      o.type = 'triangle'; o.frequency.value = midi(n); o.detune.value = (Math.random() - 0.5) * 12;
      lp.type = 'lowpass'; lp.frequency.value = 900;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.035, t + dur * 0.3);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(lp).connect(g).connect(dest);
      o.start(t); o.stop(t + dur + 0.1);
    }
  }

  brass(notes, t, dur, dest) {
    for (const n of notes) for (const det of [-8, 8]) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lp = this.ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = midi(n - 12); o.detune.value = det;
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(1800, t + 0.15);
      lp.frequency.exponentialRampToValueAtTime(500, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.05);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(lp).connect(g).connect(dest);
      o.start(t); o.stop(t + dur + 0.1);
    }
  }

  drum(t, v, dest = this.sfx) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    this.env(g, t, v, 0.003, 0.4);
    o.connect(g).connect(dest); o.start(t); o.stop(t + 0.5);
  }

  noiseHit(t, v, dur, freq, type = 'bandpass', dest = this.sfx, q = 1) {
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    this.env(g, t, v, 0.005, dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, Math.random()); s.stop(t + dur + 0.1);
    return f;
  }

  snare(t, v, dest) { this.noiseHit(t, v, 0.18, 1800, 'bandpass', dest, 0.7); }

  // --------------------------------------------------------------- sfx
  now() { return this.ctx ? this.ctx.currentTime : 0; }

  note(i = Math.floor(Math.random() * 10)) {
    if (!this.ctx) return;
    const n = 67 + 12 * Math.floor(i / 5) + PENTA[i % 5];
    this.marimba(midi(n), this.now(), 0.35);
  }

  horn() {
    if (!this.ctx) return;
    const t = this.now();
    for (const [dt, f] of [[0, 392], [0.18, 392]]) {
      this.tone('square', f, t + dt, 0.07, 0.01, 0.14, this.sfx);
      this.tone('square', f * 1.26, t + dt, 0.05, 0.01, 0.14, this.sfx);
    }
  }

  chime() {
    if (!this.ctx) return;
    const t = this.now();
    [72, 76, 79, 84, 88, 91].forEach((n, i) => this.kalimba(midi(n), t + i * 0.08, 0.2));
    this.marimba(midi(96), t + 0.5, 0.12);
  }

  scanHum(dur = 1.7) {
    if (!this.ctx) return;
    const t = this.now();
    const f = this.noiseHit(t, 0.12, dur, 600, 'bandpass', this.sfx, 3);
    f.frequency.linearRampToValueAtTime(2400, t + dur);
    this.tone('sine', 110, t, 0.05, 0.1, dur, this.sfx);
  }

  ufo(dur = 2.5) {
    if (!this.ctx) return;
    const t = this.now();
    const o = this.ctx.createOscillator(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = 620;
    lfo.frequency.value = 7; lg.gain.value = 90;
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfx);
    o.start(t); lfo.start(t); o.stop(t + dur); lfo.stop(t + dur);
  }

  beam() {
    if (!this.ctx) return;
    const t = this.now();
    const o = this.tone('sawtooth', 1800, t, 0.08, 0.005, 0.3, this.sfx);
    o.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    this.tone('sine', 880, t, 0.06, 0.005, 0.2, this.sfx);
  }

  fire(dur = 1.2) {
    if (!this.ctx) return;
    this.noiseHit(this.now(), 0.25, dur, 500, 'lowpass', this.sfx, 0.5);
  }

  roar() {
    if (!this.ctx) return;
    const t = this.now();
    const o = this.tone('sawtooth', 110, t, 0.18, 0.15, 1.4, this.sfx);
    o.frequency.linearRampToValueAtTime(70, t + 1.4);
    this.noiseHit(t, 0.2, 1.4, 350, 'bandpass', this.sfx, 1.5);
  }

  hit() {
    if (!this.ctx) return;
    this.drum(this.now(), 0.5);
    this.noiseHit(this.now(), 0.2, 0.25, 3000, 'highpass');
  }

  fanfare() {
    if (!this.ctx) return;
    const t = this.now();
    [[72, 0], [76, 0.15], [79, 0.3], [84, 0.45], [79, 0.75], [84, 0.9]].forEach(([n, dt]) => {
      this.tone('square', midi(n), t + dt, 0.06, 0.01, 0.35, this.sfx);
      this.marimba(midi(n + 12), t + dt, 0.15);
    });
    this.pad([60, 64, 67, 72], t + 0.9, 2.5, this.sfx);
  }
}
