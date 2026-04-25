import { useState, useCallback, useRef, useEffect } from 'react';
import type { LatLng, RiderState } from '../types';
import { computeHeading } from '../services/geometry';
import { RIDE_INTERVAL_MS } from '../constants';

interface UseStreetViewRiderReturn {
  riderState: RiderState;
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  jumpTo: (index: number) => void;
  reset: (points: LatLng[], autoPlay?: boolean) => void;
  setSpeed: (ms: number) => void;
}

export function useStreetViewRider(): UseStreetViewRiderReturn {
  const [riderState, setRiderState] = useState<RiderState>({
    isPlaying: false,
    currentIndex: 0,
    heading: 0,
    points: [],
  });

  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const speedRef = useRef(RIDE_INTERVAL_MS);
  const stateRef = useRef(riderState);
  stateRef.current = riderState;

  const clearTimer = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  const advanceIndex = useCallback((state: RiderState, delta: number): RiderState => {
    const pts = state.points;
    if (pts.length < 2) return state;

    const newIndex = Math.max(0, Math.min(state.currentIndex + delta, pts.length - 1));
    const nextIdx = Math.min(newIndex + 1, pts.length - 1);
    const heading = newIndex !== nextIdx
      ? computeHeading(pts[newIndex], pts[nextIdx])
      : state.heading;

    const isPlaying = newIndex < pts.length - 1 ? state.isPlaying : false;

    return { ...state, currentIndex: newIndex, heading, isPlaying };
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    intervalRef.current = setInterval(() => {
      setRiderState(prev => {
        const next = advanceIndex(prev, 1);
        if (!next.isPlaying) {
          clearTimer();
        }
        return next;
      });
    }, speedRef.current);
  }, [clearTimer, advanceIndex]);

  const play = useCallback(() => {
    const state = stateRef.current;
    if (state.points.length < 2) return;

    // If at end, restart
    const idx = state.currentIndex >= state.points.length - 1 ? 0 : state.currentIndex;
    setRiderState(prev => ({ ...prev, isPlaying: true, currentIndex: idx }));
    startTimer();
  }, [startTimer]);

  const pause = useCallback(() => {
    clearTimer();
    setRiderState(prev => ({ ...prev, isPlaying: false }));
  }, [clearTimer]);

  const next = useCallback(() => {
    setRiderState(prev => advanceIndex(prev, 1));
  }, [advanceIndex]);

  const prev = useCallback(() => {
    setRiderState(prev => advanceIndex(prev, -1));
  }, [advanceIndex]);

  const jumpTo = useCallback((index: number) => {
    setRiderState(prev => {
      const pts = prev.points;
      const i = Math.max(0, Math.min(index, pts.length - 1));
      const nextIdx = Math.min(i + 1, pts.length - 1);
      const heading = i !== nextIdx ? computeHeading(pts[i], pts[nextIdx]) : prev.heading;
      return { ...prev, currentIndex: i, heading };
    });
  }, []);

  const reset = useCallback((points: LatLng[], autoPlay = false) => {
    clearTimer();
    const heading = points.length >= 2 ? computeHeading(points[0], points[1]) : 0;
    setRiderState({
      isPlaying: autoPlay && points.length >= 2,
      currentIndex: 0,
      heading,
      points,
    });
    if (autoPlay && points.length >= 2) {
      // Need to update stateRef manually since setState is async
      stateRef.current = { isPlaying: true, currentIndex: 0, heading, points };
      startTimer();
    }
  }, [clearTimer, startTimer]);

  const setSpeed = useCallback((ms: number) => {
    speedRef.current = ms;
    if (stateRef.current.isPlaying) {
      startTimer(); // restart with new speed
    }
  }, [startTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return { riderState, play, pause, next, prev, jumpTo, reset, setSpeed };
}
