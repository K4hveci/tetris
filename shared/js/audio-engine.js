/**
 * Procedural Web Audio API Arcade Sound Engine
 * Zero external audio files needed; guarantees 100% reliability on GitHub Pages & offline.
 */
class ArcadeAudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('arcade_audio_muted') === 'true';
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('arcade_audio_muted', this.muted);
    return this.muted;
  }

  setMute(mute) {
    this.muted = !!mute;
    localStorage.setItem('arcade_audio_muted', this.muted);
  }

  playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15, pitchDecay = 0) {
    if (this.muted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(freq, now);
      if (pitchDecay !== 0) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, freq + pitchDecay), now + duration);
      }

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // AudioContext could be blocked until user gesture
    }
  }

  playClick() {
    this.playTone(800, 'triangle', 0.04, 0.1, -300);
  }

  playJump() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playDuck() {
    this.playTone(300, 'sawtooth', 0.08, 0.08, -120);
  }

  playCoin() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playScore() {
    this.playTone(587.33, 'sine', 0.08, 0.15);
    setTimeout(() => this.playTone(880, 'sine', 0.15, 0.15), 80);
  }

  playEat() {
    this.playTone(440, 'triangle', 0.06, 0.15, 200);
  }

  playCard() {
    // Card slide / shuffle swoosh
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.07);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  playChip() {
    // Chip clink
    this.playTone(1800, 'triangle', 0.03, 0.15, -600);
  }

  playSpin() {
    // Slot / Roulette spin tick
    this.playTone(900, 'sine', 0.03, 0.08, -300);
  }

  playRotate() {
    this.playTone(320, 'square', 0.05, 0.1, 100);
  }

  playDrop() {
    this.playTone(180, 'triangle', 0.07, 0.18, -60);
  }

  playClear() {
    // Tetris line clear chime
    [400, 500, 600, 800].forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.08, 0.18), idx * 50);
    });
  }

  playLaser() {
    this.playTone(1200, 'sawtooth', 0.1, 0.12, -900);
  }

  playHit() {
    this.playTone(140, 'sawtooth', 0.08, 0.2, -80);
  }

  playGameOver() {
    if (this.muted) return;
    [320, 280, 240, 180].forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.15, 0.15), idx * 100);
    });
  }

  playWin() {
    if (this.muted) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.2, 0.2), idx * 110);
    });
  }

  playJackpot() {
    if (this.muted) return;
    const arpeggio = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    for (let loop = 0; loop < 3; loop++) {
      arpeggio.forEach((freq, idx) => {
        setTimeout(() => this.playTone(freq, 'sine', 0.12, 0.22), (loop * 6 + idx) * 70);
      });
    }
  }
}

// Global singleton instance
window.arcadeAudio = new ArcadeAudioEngine();
