import { useState, useCallback } from 'react';
import type { LatLng, RouteData } from '../types';
import { getRoutes as getDirectionRoutes } from '../services/directions';
import type { TravelModeKey } from '../config/activityConfig';

interface UseCyclingDirectionsReturn {
  routes: RouteData[];
  selectedIndex: number;
  route: RouteData | null;
  loading: boolean;
  error: string | null;
  getRoute: (origin: LatLng, destination: LatLng) => Promise<void>;
  selectRoute: (index: number) => void;
  clearRoute: () => void;
}

export function useCyclingDirections(
  travelModeKey: TravelModeKey = 'BICYCLING',
): UseCyclingDirectionsReturn {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRoute = useCallback(async (origin: LatLng, destination: LatLng) => {
    setLoading(true);
    setError(null);

    try {
      const travelMode = google.maps.TravelMode[travelModeKey];
      const results = await getDirectionRoutes(origin, destination, travelMode);
      setRoutes(results);
      setSelectedIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get route');
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [travelModeKey]);

  const selectRoute = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const clearRoute = useCallback(() => {
    setRoutes([]);
    setSelectedIndex(0);
    setError(null);
  }, []);

  const route = routes[selectedIndex] ?? null;

  return { routes, selectedIndex, route, loading, error, getRoute, selectRoute, clearRoute };
}
