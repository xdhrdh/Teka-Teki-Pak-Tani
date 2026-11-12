import { ConflictType, ItemType } from '../game/rules';

class SoundEngineImpl {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isBgmActive: boolean = false;
  private bgmTimer: number | null = null;
  private riverNoiseNode: AudioBufferSourceNode | null = null;
  private riverLfoNode: OscillatorNode | null = null;
  private riverGainNode: GainNode | null = null;
  private stepIdx: number = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopAmbientNodes();
    } else if (this.isBgmActive) {
      this.startAmbientBgm();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public isSoundscapePlaying(): boolean {
    return this.isBgmActive && !this.isMuted;
  }

  public toggleSoundscape(): boolean {
    if (this.isMuted) {
      this.isMuted = false;
      this.startAmbientBgm();
      return true;
    }
    if (this.isBgmActive) {
      this.isBgmActive = false;
      this.stopAmbientNodes();
      return false;
    } else {
      this.startAmbientBgm();
      return true;
    }
  }

  public startAmbientBgm() {
    this.isBgmActive = true;
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // 1. Gentle Filtered White-Noise River Stream Ambiance with Undulating LFO
    if (!this.riverGainNode) {
      try {
        const bufferSize = ctx.sampleRate * 3;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0,
          b1 = 0,
          b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99765 * b0 + white * 0.099046;
          b1 = 0.963 * b1 + white * 0.2965164;
          b2 = 0.57 * b2 + white * 1.0526913;
          output[i] = (b0 + b1 + b2 + white * 0.1848) * 0.055;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 480;
        filter.Q.value = 0.9;

        // Slow LFO modulating filter frequency to mimic rippling river currents
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.28;
        lfoGain.gain.value = 140;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        const gain = ctx.createGain();
        gain.gain.value = 0.05;

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        whiteNoise.start();
        lfo.start();

        this.riverNoiseNode = whiteNoise;
        this.riverLfoNode = lfo;
        this.riverGainNode = gain;
      } catch {
        // Ignore if blocked before user gesture
      }
    }

    // 2. Cozy Pentatonic Kalimba / Marimba Melody Loop
    if (this.bgmTimer === null) {
      // C major / Sundanese-inspired bright pentatonic notes (Hz)
      const scale = [
        261.63, // C4
        293.66, // D4
        329.63, // E4
        392.0, // G4
        440.0, // A4
        523.25, // C5
        587.33, // D5
        659.25, // E5
      ];
      const bassScale = [130.81, 164.81, 196.0, 220.0]; // C3, E3, G3, A3
      const pattern = [0, 2, 4, 5, 4, 2, 3, 1, 0, 4, 6, 5, 4, 2, 1, 0];

      this.bgmTimer = window.setInterval(() => {
        if (this.isMuted || !this.isBgmActive) return;
        const c = this.ctx;
        if (!c || c.state !== 'running') return;

        const idx = this.stepIdx;
        const freq = scale[pattern[idx % pattern.length]];
        this.stepIdx++;

        // Play primary kalimba/marimba melody note
        this.playKalimbaNote(freq, 0.048, 0.44);

        // Every 4th beat, layer a warm resonant marimba bass note
        if (idx % 4 === 0) {
          const bassFreq = bassScale[(idx / 4) % bassScale.length];
          this.playKalimbaNote(bassFreq, 0.036, 0.78);
        }
      }, 440);
    }
  }

  private stopAmbientNodes() {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.riverNoiseNode) {
      try {
        this.riverNoiseNode.stop();
      } catch {}
      this.riverNoiseNode = null;
    }
    if (this.riverLfoNode) {
      try {
        this.riverLfoNode.stop();
      } catch {}
      this.riverLfoNode = null;
    }
    this.riverGainNode = null;
  }

  public stopAmbientBgm() {
    this.isBgmActive = false;
    this.stopAmbientNodes();
  }

  private playKalimbaNote(freq: number, volume: number, duration: number) {
    const ctx = this.ctx;
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const tineClick = ctx.createOscillator();
    const gain = ctx.createGain();

    // Warm marimba fundamental
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Kalimba metallic/wooden overtone
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2, now);

    // Crisp kalimba thumb-pluck transient
    tineClick.type = 'sine';
    tineClick.frequency.setValueAtTime(freq * 4.2, now);
    tineClick.frequency.exponentialRampToValueAtTime(freq, now + 0.025);

    const overtoneGain = ctx.createGain();
    overtoneGain.gain.setValueAtTime(volume * 0.25, now);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.4);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(volume * 0.18, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    overtone.connect(overtoneGain);
    overtoneGain.connect(gain);
    tineClick.connect(clickGain);
    clickGain.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    overtone.start(now);
    tineClick.start(now);
    osc.stop(now + duration);
    overtone.stop(now + duration);
    tineClick.stop(now + 0.035);
  }

  /**
   * Crisp wooden marimba pop + character-specific sound when an item is clicked/loaded.
   */
  public playItemSound(item: ItemType, isLoading: boolean) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Ensure ambient soundscape is running if enabled
    if (this.isBgmActive && !this.riverGainNode) {
      this.startAmbientBgm();
    }

    // 1. Crisp wooden marimba pop
    const now = ctx.currentTime;
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();
    popOsc.type = 'triangle';
    const startFreq = isLoading ? 320 : 480;
    const endFreq = isLoading ? 640 : 280;
    popOsc.frequency.setValueAtTime(startFreq, now);
    popOsc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.09);

    popGain.gain.setValueAtTime(0.14, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    popOsc.connect(popGain);
    popGain.connect(ctx.destination);
    popOsc.start(now);
    popOsc.stop(now + 0.11);

    // 2. Character-specific synthesized voice
    if (item === 'goat') {
      this.playGoatBleat();
    } else if (item === 'wolf') {
      this.playWolfHowl();
    } else if (item === 'cabbage') {
      this.playCabbageRustle();
    }
  }

  /**
   * Goat Bleat ("Mbek!"): Sawtooth oscillator with vibrato (LFO) and bandpass formant filtering.
   */
  public playGoatBleat() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.42;

    const carrier = ctx.createOscillator();
    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(395, now);
    carrier.frequency.linearRampToValueAtTime(465, now + 0.09);
    carrier.frequency.linearRampToValueAtTime(375, now + duration);

    // Vibrato LFO (tremolo/bleat wobble)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(15, now);
    lfoGain.gain.setValueAtTime(24, now);
    lfo.connect(lfoGain);
    lfoGain.connect(carrier.frequency);

    // Vocal tract formant bandpass filter
    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(1180, now);
    formant.Q.value = 3.0;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.2, now + 0.03);
    env.gain.setValueAtTime(0.17, now + 0.26);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);

    carrier.connect(formant);
    formant.connect(env);
    env.connect(ctx.destination);

    carrier.start(now);
    lfo.start(now);
    carrier.stop(now + duration);
    lfo.stop(now + duration);
  }

  /**
   * Wolf Growl & Howl: Low triangle/sawtooth pitch glide with guttural growl flutter LFO.
   */
  public playWolfHowl() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.48;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(135, now);
    osc1.frequency.exponentialRampToValueAtTime(245, now + 0.2);
    osc1.frequency.exponentialRampToValueAtTime(145, now + duration);

    osc2.frequency.setValueAtTime(138, now);
    osc2.frequency.exponentialRampToValueAtTime(248, now + 0.2);
    osc2.frequency.exponentialRampToValueAtTime(142, now + duration);

    // Growl throat flutter LFO (26 Hz)
    const growlLfo = ctx.createOscillator();
    const growlGain = ctx.createGain();
    growlLfo.type = 'sine';
    growlLfo.frequency.setValueAtTime(26, now);
    growlGain.gain.setValueAtTime(18, now);
    growlLfo.connect(growlGain);
    growlGain.connect(osc2.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(680, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    growlLfo.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
    growlLfo.stop(now + duration);
  }

  /**
   * Cabbage Rustle: Crisp multi-burst filtered leaf rustle.
   */
  public playCabbageRustle() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.28);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Envelope with 4 crisp leafy rustle pulses
      const env =
        Math.sin((i / bufferSize) * Math.PI) *
        (0.55 + 0.45 * Math.sin(i * 0.11));
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2100, now);
    filter.frequency.linearRampToValueAtTime(2800, now + 0.25);
    filter.Q.value = 1.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
  }

  /**
   * Rhythmic water splash noise envelopes synchronized with boat movement.
   */
  public playRowingSplashes() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const splashTimes = [0.04, 0.26, 0.48];
    splashTimes.forEach((offset) => {
      const start = ctx.currentTime + offset;
      const len = Math.floor(ctx.sampleRate * 0.22);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.35));
      }

      const src = ctx.createBufferSource();
      src.buffer = buf;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(420, start);
      filter.frequency.exponentialRampToValueAtTime(980, start + 0.16);
      filter.Q.value = 1.8;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.16, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(start);
    });
  }

  /**
   * Comedic descending brass/trombone synth ("wah-wah-wah-waaah") + cartoon chase/crunch sound.
   */
  public playFailureCutscene(conflict: ConflictType) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 293.66, start: 0.0, dur: 0.26 }, // D4
      { freq: 277.18, start: 0.28, dur: 0.26 }, // C#4
      { freq: 261.63, start: 0.56, dur: 0.26 }, // C4
      { freq: 246.94, start: 0.84, dur: 0.65 }, // B3 -> slide down
    ];

    notes.forEach((n, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      const t0 = now + n.start;
      osc.frequency.setValueAtTime(n.freq, t0);
      if (idx === 3) {
        osc.frequency.linearRampToValueAtTime(195, t0 + n.dur);
      }

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, t0);
      filter.frequency.linearRampToValueAtTime(1250, t0 + 0.08);
      filter.frequency.linearRampToValueAtTime(500, t0 + n.dur);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.15, t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + n.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + n.dur);
    });

    if (conflict === 'wolf_eats_goat') {
      setTimeout(() => this.playWolfHowl(), 180);
      setTimeout(() => this.playGoatBleat(), 480);
    } else if (conflict === 'goat_eats_cabbage') {
      setTimeout(() => this.playCabbageRustle(), 150);
      setTimeout(() => this.playCabbageRustle(), 380);
      setTimeout(() => this.playGoatBleat(), 620);
    }
  }

  /**
   * Joyful major arpeggio synth fanfare + applause burst.
   */
  public playVictoryFanfare() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, start: 0.0, dur: 0.16 },
      { freq: 659.25, start: 0.15, dur: 0.16 },
      { freq: 783.99, start: 0.3, dur: 0.16 },
      { freq: 1046.5, start: 0.45, dur: 0.65 },
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      osc.type = 'triangle';
      sub.type = 'sawtooth';

      const t0 = now + n.start;
      osc.frequency.setValueAtTime(n.freq, t0);
      sub.frequency.setValueAtTime(n.freq * 0.5, t0);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.18, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + n.dur);

      osc.connect(gain);
      sub.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0);
      sub.start(t0);
      osc.stop(t0 + n.dur);
      sub.stop(t0 + n.dur);
    });
  }

  public playClick() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.05);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }
}

export const soundEngine = new SoundEngineImpl();
