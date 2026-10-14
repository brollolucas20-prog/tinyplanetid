import type { SfxName } from "@/game/sim/types";

/**
 * Áudio 100% procedural (WebAudio): efeitos curtos sintetizados e
 * uma trilha ambiente gerativa e relaxante. Nenhum arquivo externo.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private music!: GainNode;
  private musicTimer = 0;
  private nextChordAt = 0;
  private chordIndex = 0;
  private noiseBuf: AudioBuffer | null = null;
  private lastPlay = new Map<SfxName, number>();
  sfxOn = true;
  musicOn = true;
  private musicStarted = false;

  /** Precisa ser chamado num gesto do usuário (clique/tecla). */
  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = this.sfxOn ? 0.9 : 0;
      this.sfx.connect(this.master);
      this.music = this.ctx.createGain();
      this.music.gain.value = 0;
      // eco suave para a música
      const delay = this.ctx.createDelay(1.5);
      delay.delayTime.value = 0.42;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.38;
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2200;
      this.music.connect(this.master);
      this.music.connect(delay);
      delay.connect(lp);
      lp.connect(fb);
      fb.connect(delay);
      lp.connect(this.master);
      const len = this.ctx.sampleRate * 1;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setSfx(on: boolean): void {
    this.sfxOn = on;
    if (this.ctx) this.sfx.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05);
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    if (!this.ctx) return;
    this.music.gain.setTargetAtTime(on ? 0.16 : 0, this.ctx.currentTime, 0.8);
    if (on) this.startMusic();
  }

  // ───────────────────── efeitos ─────────────────────
  private tone(freq: number, dur: number, type: OscillatorType, gain: number, when = 0, slideTo?: number, dest?: AudioNode) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest ?? this.sfx);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noise(dur: number, gain: number, freq: number, when = 0, sweepTo?: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  play(name: SfxName): void {
    if (!this.ctx || !this.sfxOn) return;
    const now = performance.now();
    const minGap = name === "collect" || name === "click" ? 40 : name === "coin" ? 90 : 60;
    if (now - (this.lastPlay.get(name) ?? 0) < minGap) return;
    this.lastPlay.set(name, now);
    const r = 1 + (Math.random() - 0.5) * 0.08;
    switch (name) {
      case "click":
        this.tone(880 * r, 0.05, "sine", 0.08, 0, 620);
        break;
      case "hover":
        this.tone(1300, 0.025, "sine", 0.025);
        break;
      case "place":
        this.tone(150, 0.16, "sine", 0.32, 0, 55);
        this.noise(0.12, 0.12, 900, 0, 200);
        this.tone(620 * r, 0.07, "triangle", 0.1, 0.04, 880);
        break;
      case "demolish":
        this.noise(0.35, 0.22, 1600, 0, 120);
        this.tone(110, 0.25, "sine", 0.25, 0, 40);
        break;
      case "collect":
        this.tone(520 * r, 0.09, "triangle", 0.12, 0, 780 * r);
        this.noise(0.04, 0.05, 3000);
        break;
      case "coin":
        this.tone(988, 0.08, "triangle", 0.11);
        this.tone(1319, 0.2, "triangle", 0.11, 0.07);
        break;
      case "unlock":
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, "triangle", 0.12, i * 0.08));
        this.tone(2093, 0.6, "sine", 0.04, 0.3);
        break;
      case "quest":
        [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.25, "triangle", 0.12, i * 0.07));
        [1568, 1976].forEach((f, i) => this.tone(f, 0.5, "sine", 0.05, 0.3 + i * 0.06));
        break;
      case "levelup":
        [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, "triangle", 0.11, i * 0.06));
        break;
      case "error":
        this.tone(190, 0.12, "square", 0.05, 0, 150);
        this.tone(140, 0.14, "square", 0.04, 0.07);
        break;
      case "launch":
        this.noise(3.2, 0.32, 300, 0, 2400);
        this.tone(70, 3, "sawtooth", 0.06, 0, 160);
        break;
    }
  }

  // ───────────────────── música ─────────────────────
  private static CHORDS = [
    [261.63, 329.63, 392.0, 493.88], // Cmaj7
    [220.0, 261.63, 329.63, 392.0], // Am7
    [174.61, 220.0, 261.63, 329.63], // Fmaj7
    [196.0, 246.94, 293.66, 392.0], // G
  ];
  private static SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];

  private startMusic(): void {
    if (!this.ctx || this.musicStarted) return;
    this.musicStarted = true;
    this.nextChordAt = this.ctx.currentTime + 0.2;
    const tick = () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (this.musicOn && now + 0.3 >= this.nextChordAt) {
        this.playChord(this.nextChordAt);
        this.nextChordAt += 8;
      }
      if (this.musicOn && Math.random() < 0.18) {
        const f = SoundEngine.SCALE[Math.floor(Math.random() * SoundEngine.SCALE.length)];
        this.tone(f, 1.6, "sine", 0.05, 0.05, undefined, this.music);
        if (Math.random() < 0.3) this.tone(f * 1.5, 1.2, "sine", 0.025, 0.25, undefined, this.music);
      }
      this.musicTimer = window.setTimeout(tick, 400);
    };
    tick();
  }

  private playChord(at: number): void {
    const ctx = this.ctx!;
    const chord = SoundEngine.CHORDS[this.chordIndex++ % SoundEngine.CHORDS.length];
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    lp.connect(this.music);
    for (const f of chord) {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.value = f / 2;
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.06, at + 2.5);
        g.gain.setValueAtTime(0.06, at + 6);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 9.5);
        o.connect(g);
        g.connect(lp);
        o.start(at);
        o.stop(at + 10);
      }
    }
  }

  stopAll(): void {
    window.clearTimeout(this.musicTimer);
    this.musicStarted = false;
  }
}

export const sound = new SoundEngine();
