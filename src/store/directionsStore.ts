import { create } from 'zustand';
import type { LatLng, RouteData, TravelModeKey } from '@types';
import { getRoutes as getDirectionRoutes } from '@services/directions';

interface DirectionsState {
  routes: RouteData[];
  selectedIndex: number;
  loading: boolean;
  error: string | null;
  getRoute: (stops: LatLng[], travelModeKey: TravelModeKey) => Promise<void>;
  selectRoute: (index: number) => void;
  clearRoute: () => void;
}

export const useDirectionsStore = create<DirectionsState>((set) => ({
  routes: [],
  selectedIndex: 0,
  loading: false,
  error: null,

  async getRoute(stops, travelModeKey) {
    set({ loading: true, error: null });
    try {
      const travelMode = google.maps.TravelMode[travelModeKey];
      const results = await getDirectionRoutes(stops, travelMode);
      set({ routes: results, selectedIndex: 0, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to get route',
        routes: [],
        loading: false,
      });
    }
  },

  selectRoute(index) {
    set({ selectedIndex: index });
  },

  clearRoute() {
    set({ routes: [], selectedIndex: 0, error: null });
  },
}));
