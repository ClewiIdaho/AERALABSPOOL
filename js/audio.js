/**
 * AERA LABS POOL - Audio System
 * Music player with all 17 tracks + synthesized sound effects
 */

const AudioSystem = (() => {
  const MUSIC_BASE_URL = 'https://raw.githubusercontent.com/ClewiIdaho/Newgamemusic/main/';

  const TRACKS = [
    '3AM Izakaya.mp3',
    '808 Sakura.mp3',
    'After Curfew.mp3',
    'Black Umbrella.mp3',
    'Concrete Koi.mp3',
    'Ghost Signal.mp3',
    'Last Train Home.mp3',
    'Level Up.mp3',
    'Midnight Vending Machines.mp3',
    'Neon Crosswalk.mp3',
    'Neon Silence.mp3',
    'Rain on Kanji.mp3',
    'Ramen Noodles.mp3',
    'Rooftop District.mp3',
    'Shibuya Lights.mp3',
    'Siracha.mp3',
    'Tokyo Static.mp3'
  ];

  class MusicPlayer {
    constructor() {
      this.audioCtx = null;
      this.currentTrack = null;
      this.currentAudio = null;
      this.trackIndex = 0;
      this.isPlaying = false;
      this.volume = 0.4;
      this.shuffle = false;
      this.playlist = [...Array(TRACKS.length).keys()];
      this.playlistIndex = 0;
      this.initialized = false;
      this.trackName = '';
      this.onTrackChange = null;
    }

    init() {
      if (this.initialized) return;
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
      this.shufflePlaylist();
    }

    shufflePlaylist() {
      this.playlist = [...Array(TRACKS.length).keys()];
      // Fisher-Yates shuffle
      for (let i = this.playlist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.playlist[i], this.playlist[j]] = [this.playlist[j], this.playlist[i]];
      }
      this.playlistIndex = 0;
    }

    getTrackURL(index) {
      return MUSIC_BASE_URL + encodeURIComponent(TRACKS[index]);
    }

    getTrackName(index) {
      return TRACKS[index].replace('.mp3', '');
    }

    async play() {
      this.init();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      const idx = this.playlist[this.playlistIndex];
      this.trackIndex = idx;
      this.trackName = this.getTrackName(idx);

      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.src = '';
      }

      try {
        this.currentAudio = new Audio();
        this.currentAudio.crossOrigin = 'anonymous';
        this.currentAudio.volume = this.volume;
        this.currentAudio.src = this.getTrackURL(idx);

        this.currentAudio.onended = () => {
          this.next();
        };

        this.currentAudio.onerror = () => {
          // Skip to next track on error
          console.warn('Failed to load track:', TRACKS[idx]);
          setTimeout(() => this.next(), 1000);
        };

        await this.currentAudio.play();
        this.isPlaying = true;

        if (this.onTrackChange) {
          this.onTrackChange(this.trackName);
        }
      } catch (e) {
        console.warn('Audio playback error:', e);
      }
    }

    pause() {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.isPlaying = false;
      }
    }

    togglePlay() {
      if (this.isPlaying) {
        this.pause();
      } else {
        if (this.currentAudio && this.currentAudio.src) {
          this.currentAudio.play();
          this.isPlaying = true;
        } else {
          this.play();
        }
      }
    }

    next() {
      this.playlistIndex = (this.playlistIndex + 1) % this.playlist.length;
      if (this.playlistIndex === 0) {
        this.shufflePlaylist();
      }
      this.play();
    }

    prev() {
      this.playlistIndex = (this.playlistIndex - 1 + this.playlist.length) % this.playlist.length;
      this.play();
    }

    setVolume(vol) {
      this.volume = Math.max(0, Math.min(1, vol));
      if (this.currentAudio) {
        this.currentAudio.volume = this.volume;
      }
    }

    getProgress() {
      if (!this.currentAudio || !this.currentAudio.duration) return 0;
      return this.currentAudio.currentTime / this.currentAudio.duration;
    }

    getDuration() {
      if (!this.currentAudio || !this.currentAudio.duration) return 0;
      return this.currentAudio.duration;
    }

    getCurrentTime() {
      if (!this.currentAudio) return 0;
      return this.currentAudio.currentTime;
    }
  }

  // Synthesized sound effects using Web Audio API
  class SFX {
    constructor() {
      this.audioCtx = null;
      this.masterGain = null;
      this.volume = 0.5;
      this.initialized = false;
    }

    init() {
      if (this.initialized) return;
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioCtx.destination);
      this.initialized = true;
    }

    setVolume(vol) {
      this.volume = vol;
      if (this.masterGain) {
        this.masterGain.gain.value = vol;
      }
    }

    // Ball-ball collision sound
    ballHit(speed) {
      this.init();
      if (this.audioCtx.state === 'suspended') return;

      const now = this.audioCtx.currentTime;
      const vol = Math.min(1, speed * 0.5) * 0.6;

      // Impact click
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800 + speed * 200, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      filter.Q.value = 2;

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.1);

      // White noise click component
      this.noiseClick(now, vol * 0.3, 0.03);
    }

    // Cushion hit sound
    cushionHit(speed) {
      this.init();
      if (this.audioCtx.state === 'suspended') return;

      const now = this.audioCtx.currentTime;
      const vol = Math.min(1, speed * 0.4) * 0.4;

      // Thud
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.12);

      this.noiseClick(now, vol * 0.4, 0.04);
    }

    // Ball pocketed sound
    pocket() {
      this.init();
      if (this.audioCtx.state === 'suspended') return;

      const now = this.audioCtx.currentTime;

      // Satisfying descending tone
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.45);

      // Futuristic swoosh
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(1200, now);
      osc2.frequency.exponentialRampToValueAtTime(100, now + 0.25);

      gain2.gain.setValueAtTime(0.08, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc2.connect(gain2);
      gain2.connect(this.masterGain);

      osc2.start(now);
      osc2.stop(now + 0.35);
    }

    // Cue strike sound
    strike(power) {
      this.init();
      if (this.audioCtx.state === 'suspended') return;

      const now = this.audioCtx.currentTime;
      const vol = 0.3 + power * 0.4;

      // Sharp impact
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200 + power * 400, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.08);

      this.noiseClick(now, vol * 0.5, 0.02);
    }

    // Foul buzzer
    foul() {
      this.init();
      if (this.audioCtx.state === 'suspended') return;

      const now = this.audioCtx.currentTime;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.setValueAtTime(150, now + 0.15);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.setValueAtTime(0.15, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.45);
    }

    // Victory fanfare
    victory() {
      this.init();
      if (this.audioCtx.state === 'suspended') return;

      const now = this.audioCtx.currentTime;
      const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

      notes.forEach((freq, i) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        const start = now + i * 0.15;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.05);
        gain.gain.setValueAtTime(0.2, start + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(start);
        osc.stop(start + 0.55);
      });
    }

    // Helper: noise click
    noiseClick(time, vol, duration) {
      const bufferSize = this.audioCtx.sampleRate * duration;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize * 5);
      }

      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      source.start(time);
      source.stop(time + duration);
    }

    // UI click sound
    uiClick() {
      this.init();
      if (this.audioCtx.state === 'suspended') return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.value = 1800;

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.04);
    }
  }

  return {
    MusicPlayer,
    SFX,
    TRACKS
  };
})();

window.AudioSystem = AudioSystem;
