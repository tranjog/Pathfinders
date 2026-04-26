import { create } from 'zustand';
import type { LatLng } from '@types';
import { resolveLocation, type LocationSource } from '@services/location';

interface UserLocationState {
  userLocation: LatLng | null;
  source: LocationSource | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => Promise<LatLng | null>;
}

export const useUserLocationStore = create<UserLocationState>((set) => ({
  userLocation: null,
  source: null,
  loading: false,
  error: null,

  async requestLocation() {
    set({ loading: true, error: null });
    try {
      const { loc, source } = await resolveLocation();
      set({ userLocation: loc, source, loading: false });
      return loc;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Location unavailable';
      console.warn('[userLocationStore]', msg);
      set({ error: msg, loading: false });
      return null;
    }
  },
}));

// Request location on startup
useUserLocationStore.getState().requestLocation();
