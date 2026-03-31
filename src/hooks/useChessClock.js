import { useState, useEffect, useRef, useCallback } from "react";

export const TIME_CONTROLS = [
  { label: "1+0  Bullet", initial: 60, increment: 0 },
  { label: "2+1  Bullet", initial: 120, increment: 1 },
  { label: "3+0  Blitz", initial: 180, increment: 0 },
  { label: "5+3  Blitz", initial: 300, increment: 3 },
  { label: "10+0 Rapid", initial: 600, increment: 0 },
  { label: "10+5 Rapid", initial: 600, increment: 5 },
  { label: "30+0 Classical", initial: 1800, increment: 0 },
  { label: "∞    Unlimited", initial: null, increment: 0 },
];
export function useChessClock({
  initialSeconds,
  increment = 0,
  enabled = true,
}) {
  const unlimited = initialSeconds === null;

  const [times, setTimes] = useState({ w: initialSeconds, b: initialSeconds });
  const [active, setActive] = useState(null); // 'w' | 'b' | null
  const [flagged, setFlagged] = useState(null); // 'w' | 'b' | null  (ran out of time)
  const [clockOn, setClockOn] = useState(false); // has the clock been started?
  const intervalRef = useRef(null);
  const lastTickRef = useRef(null);

  // ── Tick every 100ms for smooth display
  useEffect(() => {
    if (!enabled || unlimited || active === null || flagged) {
      clearInterval(intervalRef.current);
      return;
    }

    lastTickRef.current = performance.now();
    intervalRef.current = setInterval(() => {
      const now = performance.now();
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      setTimes((prev) => {
        const next = { ...prev, [active]: Math.max(0, prev[active] - delta) };
        if (next[active] <= 0) {
          clearInterval(intervalRef.current);
          setFlagged(active);
          setActive(null);
        }
        return next;
      });
    }, 100);

    return () => clearInterval(intervalRef.current);
  }, [enabled, unlimited, active, flagged]);

  /** Switch the running clock to the opponent (call after each move) */
  const switchClock = useCallback(
    (justMoved) => {
      if (!enabled || unlimited || flagged) return;
      setClockOn(true);
      // Add increment to the player who just moved
      if (increment > 0 && clockOn) {
        setTimes((prev) => ({
          ...prev,
          [justMoved]: prev[justMoved] + increment,
        }));
      }
      setActive(justMoved === "w" ? "b" : "w");
    },
    [enabled, unlimited, flagged, increment, clockOn],
  );

  /** Pause both clocks (e.g. during promotion dialog) */
  const pause = useCallback(() => setActive(null), []);

  /** Resume for the given player */
  const resume = useCallback(
    (color) => {
      if (!flagged) setActive(color);
    },
    [flagged],
  );

  /** Reset to initial times */
  const reset = useCallback(() => {
    clearInterval(intervalRef.current);
    setTimes({ w: initialSeconds, b: initialSeconds });
    setActive(null);
    setFlagged(null);
    setClockOn(false);
  }, [initialSeconds]);

  return {
    times,
    active,
    flagged,
    clockOn,
    switchClock,
    pause,
    resume,
    reset,
    unlimited,
  };
}

/** Format seconds as mm:ss or h:mm:ss */
export function formatTime(seconds) {
  if (seconds === null) return "∞";
  const s = Math.ceil(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
