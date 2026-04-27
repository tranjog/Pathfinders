import { create } from 'zustand';
import type { LatLng, Stop } from '@types';

export const MAX_STOPS = 10;
const emptyStops = (): Stop[] => [
  { latLng: null, label: '' },
  { latLng: null, label: '' },
];

interface RoutePlannerState {
  stops: Stop[];
  mapPickMode: number | null;
  setStop: (index: number, latLng: LatLng | null, label?: string) => void;
  setStops: (stops: Stop[]) => void;
  addStop: () => void;
  removeStop: (index: number) => void;
  setMapPickMode: (index: number | null) => void;
  clear: () => void;
}

export const useRoutePlannerStore = create<RoutePlannerState>((set) => ({
  stops: emptyStops(),
  mapPickMode: null,

  setStop: (index, latLng, label = '') =>
    set((state) => {
      const stops = [...state.stops];
      stops[index] = { latLng, label };
      return { stops };
    }),

  setStops: (stops) =>
    set(() => {
      const clamped = stops.slice(0, MAX_STOPS).map((s) => ({
        latLng: s.latLng,
        label: s.label,
      }));
      // Always keep at least the empty 2-stop baseline so the UI is consistent.
      while (clamped.length < 2) clamped.push({ latLng: null, label: '' });
      return { stops: clamped, mapPickMode: null };
    }),

  addStop: () =>
    set((state) => {
      if (state.stops.length >= MAX_STOPS) return state;
      return { stops: [...state.stops, { latLng: null, label: '' }] };
    }),

  removeStop: (index) =>
    set((state) => {
      if (state.stops.length <= 2) return state;
      const stops = state.stops.filter((_, i) => i !== index);
      const mapPickMode = state.mapPickMode === index ? null : state.mapPickMode;
      return { stops, mapPickMode };
    }),

  setMapPickMode: (index) => set({ mapPickMode: index }),

  clear: () => set({ stops: emptyStops(), mapPickMode: null }),
}));
