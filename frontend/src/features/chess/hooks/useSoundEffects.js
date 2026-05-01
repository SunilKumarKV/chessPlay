import { useRef, useCallback, useEffect, useMemo } from "react";

export function useSoundEffects({ enabled = true }) {
  const ctxRef = useRef(null);

  // Lazily create AudioContext on first use (browser requires user gesture)
  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      try {
        ctxRef.current = new (
          window.AudioContext || window.webkitAudioContext
        )();
      } catch (err) {
        console.warn("AudioContext not supported or blocked:", err);
        return null;
      }
    }
    // Resume if suspended (Chrome autoplay policy)
    if (ctxRef.current && ctxRef.current.state === "suspended")
      ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  useEffect(() => () => ctxRef.current?.close(), []);

  // ── Low-level: play a tone burst
  const tone = useCallback(
    (freq, duration, type = "sine", gain = 0.3, startTime = 0) => {
      if (!enabled) return;
      const ctx = getCtx();
      if (!ctx) return;
      const t = ctx.currentTime + startTime;

      const osc = ctx.createOscillator();
      const env = ctx.createGain();

      osc.connect(env);
      env.connect(ctx.destination);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);

      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(gain, t + 0.005);
      env.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.start(t);
      osc.stop(t + duration + 0.01);
    },
    [enabled, getCtx],
  );

  // ── Low-level: noise burst (for percussive "thud")
  const noise = useCallback(
    (duration, gain = 0.15, startTime = 0) => {
      if (!enabled) return;
      const ctx = getCtx();
      if (!ctx) return;
      const t = ctx.currentTime + startTime;
      const buffer = ctx.createBuffer(
        1,
        ctx.sampleRate * duration,
        ctx.sampleRate,
      );
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const env = ctx.createGain();

      src.buffer = buffer;
      filter.type = "lowpass";
      filter.frequency.value = 400;

      src.connect(filter);
      filter.connect(env);
      env.connect(ctx.destination);

      env.gain.setValueAtTime(gain, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + duration);

      src.start(t);
      src.stop(t + duration + 0.01);
    },
    [enabled, getCtx],
  );

  // ── Public sound functions
  const play = useMemo(
    () => ({
      move: () => {
        noise(0.12, 0.25);
        tone(180, 0.08, "triangle", 0.15);
      },

      capture: () => {
        noise(0.18, 0.4);
        tone(120, 0.12, "sawtooth", 0.12);
        tone(90, 0.2, "triangle", 0.08, 0.05);
      },

      check: () => {
        tone(440, 0.15, "sine", 0.25);
        tone(554, 0.15, "sine", 0.2, 0.12);
        tone(659, 0.25, "sine", 0.2, 0.24);
      },

      castle: () => {
        noise(0.1, 0.2);
        noise(0.1, 0.2, 0.15);
        tone(220, 0.15, "triangle", 0.12);
        tone(330, 0.15, "triangle", 0.1, 0.15);
      },

      promote: () => {
        const notes = [523, 659, 784, 1047];
        notes.forEach((f, i) => tone(f, 0.2, "sine", 0.22, i * 0.1));
      },

      gameEnd: (win = true) => {
        if (win) {
          [261, 329, 392, 523, 659].forEach((f, i) =>
            tone(f, 0.4, "sine", 0.2, i * 0.08),
          );
        } else {
          [440, 392, 349, 311, 261].forEach((f, i) =>
            tone(f, 0.35, "sine", 0.18, i * 0.1),
          );
        }
      },

      stalemate: () => {
        tone(330, 0.3, "sine", 0.15);
        tone(330, 0.3, "sine", 0.15, 0.35);
      },
    }),
    [noise, tone],
  );

  return play;
}
