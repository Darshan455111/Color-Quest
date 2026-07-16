/**
 * Color Quest - Web Audio Synthesis Sound Engine
 * Synthesizes board game sound effects dynamically in real-time.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('color_quest_muted') === 'true';
    this.setupToggleUI();
  }

  // Lazy-initialization of AudioContext (browser security requirement)
  initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('color_quest_muted', this.muted);
    return this.muted;
  }

  setupToggleUI() {
    const btn = document.getElementById('sound-toggle');
    if (btn) {
      btn.innerHTML = `<span class="icon">${this.muted ? '🔇' : '🔊'}</span>`;
      btn.addEventListener('click', () => {
        this.initContext();
        const isMuted = this.toggleMute();
        btn.innerHTML = `<span class="icon">${isMuted ? '🔇' : '🔊'}</span>`;
      });
    }
  }

  createOscillator(type, freq, duration, startVol = 0.15) {
    if (this.muted) return null;
    this.initContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(startVol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    return { osc, gain };
  }

  /**
   * Play Dice Roll Sound:
   * Simulates a rolling/rattling die by scheduling a series of rapid pitch bursts
   */
  playRoll() {
    if (this.muted) return;
    this.initContext();

    const now = this.ctx.currentTime;
    const bounces = 10;
    const duration = 1.2;

    for (let i = 0; i < bounces; i++) {
      // Schedule individual bounces at increasing intervals (decelerating roll)
      const delay = Math.pow(i / (bounces - 1), 1.5) * (duration - 0.15);
      
      setTimeout(() => {
        if (this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        // Dynamic filters for woody/plastic dice impact
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 5;
        
        osc.type = 'triangle';
        // Random pitch slide down
        const startFreq = 180 + Math.random() * 80;
        osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.08);

        filter.frequency.setValueAtTime(startFreq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
      }, delay * 1000);
    }
  }

  /**
   * Play Pawn Lift Sound:
   * Sweeps the frequency upward to denote vertical lifting
   */
  playLift() {
    const sound = this.createOscillator('sine', 200, 0.35, 0.12);
    if (!sound) return;

    const { osc } = sound;
    const now = this.ctx.currentTime;
    // Sweep frequency upward
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.3);

    osc.start();
    osc.stop(now + 0.35);
  }

  /**
   * Play Correct Match Sound:
   * Ascending arpeggio chime representing success
   */
  playMatch() {
    if (this.muted) return;
    this.initContext();

    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    const now = this.ctx.currentTime;

    notes.forEach((freq, index) => {
      const delay = index * 0.08;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      // Volume envelope with slight overlap
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.45);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + delay);
      osc.stop(now + delay + 0.5);
    });
  }

  /**
   * Play Wrong Match Sound:
   * Low discordant buzz
   */
  playMismatch() {
    if (this.muted) return;
    this.initContext();

    const now = this.ctx.currentTime;
    
    // Detuned oscillators to make a harsh buzz
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(140, now);
    osc1.frequency.linearRampToValueAtTime(100, now + 0.4);
    
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(143, now);
    osc2.frequency.linearRampToValueAtTime(102, now + 0.4);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  /**
   * Play Score Sound:
   * A short high-frequency double chime
   */
  playScore() {
    if (this.muted) return;
    this.initContext();

    const now = this.ctx.currentTime;
    
    // First high note, then second even higher
    const triggerChime = (freq, delay, vol) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'highpass';
      filter.frequency.value = 600;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(vol, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.35);
    };

    triggerChime(880, 0, 0.12);      // A5
    triggerChime(1318.51, 0.06, 0.12); // E6
  }

  /**
   * Play Turn Change Sound:
   * Fast sweeping pop
   */
  playTurnChange() {
    const sound = this.createOscillator('triangle', 350, 0.15, 0.08);
    if (!sound) return;

    const { osc } = sound;
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

    osc.start();
    osc.stop(now + 0.15);
  }

  /**
   * Play Victory Fanfare:
   * Musical tune representing the winner's celebration
   */
  playVictory() {
    if (this.muted) return;
    this.initContext();

    const melody = [
      { note: 261.63, duration: 0.12 }, // C4
      { note: 329.63, duration: 0.12 }, // E4
      { note: 392.00, duration: 0.12 }, // G4
      { note: 523.25, duration: 0.24 }, // C5
      { note: 392.00, duration: 0.12 }, // G4
      { note: 523.25, duration: 0.48 }  // C5 (Hold)
    ];

    const now = this.ctx.currentTime;
    let accumulatedTime = 0;

    melody.forEach((item) => {
      const playTime = now + accumulatedTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.note, playTime);

      gain.gain.setValueAtTime(0, playTime);
      gain.gain.linearRampToValueAtTime(0.18, playTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, playTime + item.duration - 0.02);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(playTime);
      osc.stop(playTime + item.duration);

      accumulatedTime += item.duration;
    });
  }
}

// Instantiate globally
window.AudioEngine = new SoundEngine();
