import { create } from 'zustand';
import type { LatLng, MoverState } from '@types';
import { computeHeading } from '@services/geometry';
import { MOVE_INTERVAL_MS } from '@constants';

// Timer and speed live outside Zustand state — they're imperatives, not reactive data
let intervalId: ReturnType<typeof setInterval> | undefined;
let speedMs = MOVE_INTERVAL_MS;

interface StreetViewPlaybackState extends MoverState {
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  jumpTo: (index: number) => void;
  reset: (points: LatLng[], autoPlay?: boolean) => void;
  setSpeed: (ms: number) => void;
}

function advanceIndex(state: MoverState, delta: number): Partial<MoverState> {
  const { points, currentIndex, heading, isPlaying } = state;
  if (points.length < 2) return {};

  const newIndex = Math.max(0, Math.min(currentIndex + delta, points.length - 1));
  const nextIdx = Math.min(newIndex + 1, points.length - 1);
  const newHeading = newIndex !== nextIdx ? computeHeading(points[newIndex], points[nextIdx]) : heading;
  const newIsPlaying = newIndex < points.length - 1 ? isPlaying : false;

  return { currentIndex: newIndex, heading: newHeading, isPlaying: newIsPlaying };
}

function clearTimer() {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = undefined;
  }
}

function startTimer(_getState: () => StreetViewPlaybackState, setState: (fn: (s: StreetViewPlaybackState) => Partial<StreetViewPlaybackState>) => void) {
  clearTimer();
  intervalId = setInterval(() => {
    setState((prev) => {
      const next = advanceIndex(prev, 1);
      if (next.isPlaying === false) clearTimer();
      return next;
    });
  }, speedMs);
}

export const useStreetViewPlaybackStore = create<StreetViewPlaybackState>((set, get) => ({
  isPlaying: false,
  currentIndex: 0,
  heading: 0,
  points: [],

  play() {
    const { points, currentIndex } = get();
    if (points.length < 2) return;
    const idx = currentIndex >= points.length - 1 ? 0 : currentIndex;
    set({ isPlaying: true, currentIndex: idx });
    startTimer(get, set);
  },

  pause() {
    clearTimer();
    set({ isPlaying: false });
  },

  next() {
    set((prev) => advanceIndex(prev, 1));
  },

  prev() {
    set((prev) => advanceIndex(prev, -1));
  },

  jumpTo(index) {
    set((prev) => {
      const pts = prev.points;
      const i = Math.max(0, Math.min(index, pts.length - 1));
      const nextIdx = Math.min(i + 1, pts.length - 1);
      const heading = i !== nextIdx ? computeHeading(pts[i], pts[nextIdx]) : prev.heading;
      return { currentIndex: i, heading };
    });
  },

  reset(points, autoPlay = false) {
    clearTimer();
    const heading = points.length >= 2 ? computeHeading(points[0], points[1]) : 0;
    const isPlaying = autoPlay && points.length >= 2;
    set({ points, currentIndex: 0, heading, isPlaying });
    if (isPlaying) startTimer(get, set);
  },

  setSpeed(ms) {
    speedMs = ms;
    if (get().isPlaying) startTimer(get, set);
  },
}));
