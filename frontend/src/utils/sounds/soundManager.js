// Sound Manager for Chess Game
class SoundManager {
  constructor() {
    this.audioContext = null;
    this.sounds = {};
    this.volume = 0.7;
    this.theme = "default";
    this.enabled = true;
    this.preloaded = false;
  }

  // Initialize audio context (required for Web Audio API)
  async init() {
    try {
      this.audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
      await this.preloadSounds();
      this.preloaded = true;
    } catch (error) {
      console.warn("Audio context not available:", error);
    }
  }

  // Preload all sound effects
  async preloadSounds() {
    const soundFiles = {
      default: {
        move: "/sounds/default/move.mp3",
        capture: "/sounds/default/capture.mp3",
        check: "/sounds/default/check.mp3",
        castle: "/sounds/default/castle.mp3",
        promote: "/sounds/default/promote.mp3",
        gameStart: "/sounds/default/game-start.mp3",
        gameEnd: "/sounds/default/game-end.mp3",
      },
      classic: {
        move: "/sounds/classic/move.wav",
        capture: "/sounds/classic/capture.wav",
        check: "/sounds/classic/check.wav",
        castle: "/sounds/classic/castle.wav",
        promote: "/sounds/classic/promote.wav",
        gameStart: "/sounds/classic/game-start.wav",
        gameEnd: "/sounds/classic/game-end.wav",
      },
      modern: {
        move: "/sounds/modern/move.ogg",
        capture: "/sounds/modern/capture.ogg",
        check: "/sounds/modern/check.ogg",
        castle: "/sounds/modern/castle.ogg",
        promote: "/sounds/modern/promote.ogg",
        gameStart: "/sounds/modern/game-start.ogg",
        gameEnd: "/sounds/modern/game-end.ogg",
      },
    };

    for (const [theme, files] of Object.entries(soundFiles)) {
      this.sounds[theme] = {};
      for (const [soundName, filePath] of Object.entries(files)) {
        try {
          const response = await fetch(filePath);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer =
            await this.audioContext.decodeAudioData(arrayBuffer);
          this.sounds[theme][soundName] = audioBuffer;
        } catch (error) {
          console.warn(`Failed to load sound ${theme}/${soundName}:`, error);
          // Create fallback beep sounds
          this.sounds[theme][soundName] = this.createFallbackSound(soundName);
        }
      }
    }
  }

  // Create fallback beep sounds using Web Audio API
  createFallbackSound(type) {
    if (!this.audioContext) return null;

    const duration = 0.1;
    const sampleRate = this.audioContext.sampleRate;
    const numSamples = duration * sampleRate;
    const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
    const channelData = buffer.getChannelData(0);

    let frequency = 440; // A4 note

    switch (type) {
      case "move":
        frequency = 523; // C5
        break;
      case "capture":
        frequency = 659; // E5
        break;
      case "check":
        frequency = 784; // G5
        break;
      case "castle":
        frequency = 988; // B5
        break;
      case "promote":
        frequency = 1319; // E6
        break;
      case "gameStart":
        frequency = 440; // A4
        break;
      case "gameEnd":
        frequency = 220; // A3
        break;
    }

    for (let i = 0; i < numSamples; i++) {
      channelData[i] =
        Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.3;
    }

    return buffer;
  }

  // Play a sound
  play(soundName) {
    if (!this.enabled || !this.preloaded || !this.audioContext) return;

    const soundBuffer = this.sounds[this.theme]?.[soundName];
    if (!soundBuffer) return;

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
  }

  // Set volume (0.0 to 1.0)
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  // Set sound theme
  setTheme(theme) {
    if (this.sounds[theme]) {
      this.theme = theme;
    }
  }

  // Enable/disable sounds
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  // Specific sound methods
  playMove() {
    this.play("move");
  }
  playCapture() {
    this.play("capture");
  }
  playCheck() {
    this.play("check");
  }
  playCastle() {
    this.play("castle");
  }
  playPromote() {
    this.play("promote");
  }
  playGameStart() {
    this.play("gameStart");
  }
  playGameEnd() {
    this.play("gameEnd");
  }
}

// Create singleton instance
export const soundManager = new SoundManager();
