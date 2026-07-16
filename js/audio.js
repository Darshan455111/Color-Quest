class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = localStorage.getItem('color_quest_muted') === 'true';
    
    const savedVol = localStorage.getItem('color_quest_volume');
    this.volume = savedVol !== null ? parseFloat(savedVol) : 0.5;

    this.setupToggleUI();
  }

  initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.updateMasterVolume();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  updateMasterVolume() {
    if (!this.masterGain) return;
    const targetGain = this.muted ? 0 : this.volume;
    this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('color_quest_muted', this.muted);
    this.updateMasterVolume();
    return this.muted;
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    localStorage.setItem('color_quest_volume', this.volume);
    
    if (this.volume > 0 && this.muted) {
      this.muted = false;
      localStorage.setItem('color_quest_muted', 'false');
    } else if (this.volume === 0 && !this.muted) {
      this.muted = true;
      localStorage.setItem('color_quest_muted', 'true');
    }
    
    this.updateMasterVolume();
    return this.muted;
  }

  setupToggleUI() {
    const btns = document.querySelectorAll('.sound-toggle-btn');
    const sliders = document.querySelectorAll('.volume-slider');
    
    const updateUIState = () => {
      const activeBtns = document.querySelectorAll('.sound-toggle-btn');
      const activeSliders = document.querySelectorAll('.volume-slider');

      activeBtns.forEach(btn => {
        btn.innerHTML = this.muted ? '🔇' : '🔊';
      });
      
      activeSliders.forEach(slider => {
        slider.value = this.muted ? 0 : Math.round(this.volume * 100);
      });
    };

    updateUIState();

    btns.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      if (btn.parentNode) {
        btn.parentNode.replaceChild(newBtn, btn);
      }
      
      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.initContext();
        this.toggleMute();
        updateUIState();
      });
    });

    sliders.forEach(slider => {
      const newSlider = slider.cloneNode(true);
      if (slider.parentNode) {
        slider.parentNode.replaceChild(newSlider, slider);
      }

      newSlider.addEventListener('input', (e) => {
        e.stopPropagation();
        this.initContext();
        const value = parseInt(e.target.value) / 100;
        this.setVolume(value);
        updateUIState();
      });
    });
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
    gain.connect(this.masterGain);

    return { osc, gain };
  }

  playRoll() {
    if (this.muted) return;
    this.initContext();

    const bounces = 10;
    const duration = 1.2;

    for (let i = 0; i < bounces; i++) {
      const delay = Math.pow(i / (bounces - 1), 1.5) * (duration - 0.15);
      
      setTimeout(() => {
        if (this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 5;
        
        osc.type = 'triangle';
        const startFreq = 180 + Math.random() * 80;
        osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.08);

        filter.frequency.setValueAtTime(startFreq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
      }, delay * 1000);
    }
  }

  playLift() {
    const sound = this.createOscillator('sine', 200, 0.35, 0.12);
    if (!sound) return;

    const { osc } = sound;
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.3);

    osc.start();
    osc.stop(now + 0.35);
  }

  playMatch() {
    if (this.muted) return;
    this.initContext();

    const notes = [261.63, 329.63, 392.00, 523.25];
    const now = this.ctx.currentTime;

    notes.forEach((freq, index) => {
      const delay = index * 0.08;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.45);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(now + delay);
      osc.stop(now + delay + 0.5);
    });
  }

  playMismatch() {
    if (this.muted) return;
    this.initContext();

    const now = this.ctx.currentTime;
    
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
    gain.connect(this.masterGain);

    osc1.start();
    osc2.start();
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  playScore() {
    if (this.muted) return;
    this.initContext();

    const now = this.ctx.currentTime;
    
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
      gain.connect(this.masterGain);

      osc.start(now + delay);
      osc.stop(now + delay + 0.35);
    };

    triggerChime(880, 0, 0.12);
    triggerChime(1318.51, 0.06, 0.12);
  }

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

  playVictory() {
    if (this.muted) return;
    this.initContext();

    const melody = [
      { note: 261.63, duration: 0.12 },
      { note: 329.63, duration: 0.12 },
      { note: 392.00, duration: 0.12 },
      { note: 523.25, duration: 0.24 },
      { note: 392.00, duration: 0.12 },
      { note: 523.25, duration: 0.48 }
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
      gain.connect(this.masterGain);

      osc.start(playTime);
      osc.stop(playTime + item.duration);

      accumulatedTime += item.duration;
    });
  }
}

window.AudioEngine = new SoundEngine();
