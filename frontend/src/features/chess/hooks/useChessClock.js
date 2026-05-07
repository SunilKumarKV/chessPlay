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
  const [activeColor, setActiveColor] = useState(null);
  const [flaggedColor, setFlaggedColor] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  const intervalRef = useRef(null);
  const lastTickRef = useRef(null);

  useEffect(() => {
    if (!enabled || unlimited || activeColor === null || flaggedColor) {
      clearInterval(intervalRef.current);
      return;
    }

    lastTickRef.current = performance.now();
    intervalRef.current = setInterval(() => {
      const now = performance.now();
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      setTimes((prev) => {
        const next = {
          ...prev,
          [activeColor]: Math.max(0, prev[activeColor] - delta),
        };
        if (next[activeColor] <= 0) {
          clearInterval(intervalRef.current);
          setFlaggedColor(activeColor);
          setActiveColor(null);
        }
        return next;
      });
    }, 100);

    return () => clearInterval(intervalRef.current);
  }, [enabled, unlimited, activeColor, flaggedColor]);

  const switchClock = useCallback(
    (justMoved) => {
      if (!enabled || unlimited || flaggedColor) return;
      setHasStarted(true);
      if (increment > 0 && hasStarted) {
        setTimes((prev) => ({
          ...prev,
          [justMoved]: prev[justMoved] + increment,
        }));
      }
      setActiveColor(justMoved === "w" ? "b" : "w");
    },
    [enabled, unlimited, flaggedColor, increment, hasStarted],
  );

  const pause = useCallback(() => setActiveColor(null), []);

  const resume = useCallback(
    (color) => {
      if (!flaggedColor) setActiveColor(color);
    },
    [flaggedColor],
  );

  const reset = useCallback(() => {
    clearInterval(intervalRef.current);
    setTimes({ w: initialSeconds, b: initialSeconds });
    setActiveColor(null);
    setFlaggedColor(null);
    setHasStarted(false);
  }, [initialSeconds]);

  return {
    times,
    active: activeColor,
    flagged: flaggedColor,
    clockOn: hasStarted,
    switchClock,
    pause,
    resume,
    reset,
    unlimited,
  };
}

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
