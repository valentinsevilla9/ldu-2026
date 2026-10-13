"use client";

import { useEffect, useState } from "react";
import { MINUTES_PER_DAY, STEP_MIN } from "./engine";

// Reloj del día simulado, compartido entre pantallas (se recuerda en el navegador).
// Avanza `speed` minutos simulados por cada segundo real mientras está en marcha.

const STORAGE_KEY = "sim-minute";
export const DEFAULT_MINUTE = 13 * 60;
export const SPEEDS = [1, 5, 15] as const;

function readStored(): number {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(value) && value > 0 && value < MINUTES_PER_DAY ? value : DEFAULT_MINUTE;
  } catch {
    return DEFAULT_MINUTE;
  }
}

export function useSimClock() {
  const [minute, setMinuteState] = useState(DEFAULT_MINUTE);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(5);

  // Read the stored minute after mounting, so server and client render the same first frame.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off sync from localStorage
    setMinuteState(readStored());
  }, []);

  const setMinute = (value: number) => {
    const next = Math.max(0, Math.min(MINUTES_PER_DAY - 1, Math.round(value)));
    setMinuteState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Without storage the clock still works; it just isn't remembered.
    }
  };

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setMinuteState((current) => {
        const next = current + speed;
        if (next >= MINUTES_PER_DAY) {
          setPlaying(false);
          return MINUTES_PER_DAY - 1;
        }
        try {
          window.localStorage.setItem(STORAGE_KEY, String(next));
        } catch {
          // Ignored: see setMinute.
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing, speed]);

  /** The minute the server evaluates: the engine works in 5-minute steps. */
  const step = Math.floor(minute / STEP_MIN) * STEP_MIN;

  return { minute, step, setMinute, playing, setPlaying, speed, setSpeed };
}
