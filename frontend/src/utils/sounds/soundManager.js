// Sound Manager for Chess Game
import { SOUND_THEMES } from "./soundThemes";

class SoundManager {
  constructor() {
    this.audioContext = null;
    this.sounds = {};
    this.volume = 0.7;
    this.theme = "classic";
    this.enabled = true;
    this.preloaded = false;
    this.initializing = null;
  }

  async init() {
    if (this.preloaded) return;
    if (this.initializing) return this.initializing;
    this.initializing = this.initAudio();
    return this.initializing;
  }

  async initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await this.preloadSounds();
      this.preloaded = true;
    } catch (error) {
      console.warn("Audio context not available:", error);
    } finally {
      this.initializing = null;
    }
  }

  async preloadSounds() {
    const soundNames = ["move", "capture", "check", "castle", "promote", "gameStart", "gameEnd"];
    const appBaseUrl = new URL(import.meta.env.BASE_URL || "/", window.location.origin);

    for (const themeId of Object.keys(SOUND_THEMES)) {
      this.sounds[themeId] = {};
      for (const soundName of soundNames) {
        const extension = themeId === "classic" ? "wav" : themeId === "modern" ? "ogg" : "mp3";
        const soundUrl = new URL(`sounds/${themeId}/${soundName.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}.${extension}`, appBaseUrl).href;
        try {
          const response = await fetch(soundUrl);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const arrayBuffer = await response.arrayBuffer();
          this.sounds[themeId][soundName] = await this.audioContext.decodeAudioData(arrayBuffer);
        } catch {
          this.sounds[themeId][soundName] = this.createFallbackSound(soundName, themeId);
        }
      }
    }
  }

  createFallbackSound(type, themeId = "classic") {
    if (!this.audioContext) return null;
    const themeOffset = {
      classic: 0,
      modern: 80,
      tournament: -80,
      luxury: 140,
      neon: 220,
      cyber: 320,
    }[themeId] || 0;
    const duration = type === "gameEnd" || type === "gameStart" ? 0.22 : 0.1;
    const sampleRate = this.audioContext.sampleRate;
    const numSamples = Math.floor(duration * sampleRate);
    const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
    const channelData = buffer.getChannelData(0);

    const base = {
      move: 523,
      capture: 659,
      check: 784,
      castle: 988,
      promote: 1319,
      gameStart: 440,
      gameEnd: 220,
    }[type] || 440;
    const frequency = Math.max(120, base + themeOffset);

    for (let i = 0; i < numSamples; i += 1) {
      const fade = 1 - i / numSamples;
      channelData[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.28 * fade;
    }

    return buffer;
  }

  async unlock() {
    await this.init();
    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  play(soundName) {
    if (!this.enabled) return;
    this.unlock().then(() => {
      const soundBuffer = this.sounds[this.theme]?.[soundName] || this.sounds.classic?.[soundName];
      if (!soundBuffer || !this.audioContext) return;
      try {
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        source.buffer = soundBuffer;
        gainNode.gain.value = this.volume;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        source.start();
      } catch (error) {
        console.warn("Failed to play sound:", error);
      }
    });
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, Number(volume)));
  }

  setTheme(theme) {
    this.theme = SOUND_THEMES[theme] ? theme : "classic";
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  preview(theme = this.theme) {
    const previous = this.theme;
    this.setTheme(theme);
    this.playMove();
    window.setTimeout(() => this.playCheck(), 140);
    window.setTimeout(() => {
      this.theme = previous;
    }, 300);
  }

  playMove() { this.play("move"); }
  playCapture() { this.play("capture"); }
  playCheck() { this.play("check"); }
  playCastle() { this.play("castle"); }
  playPromote() { this.play("promote"); }
  playGameStart() { this.play("gameStart"); }
  playGameEnd() { this.play("gameEnd"); }
}

export const soundManager = new SoundManager();
