import { useState, useCallback } from 'react';
import type { LatLng, RouteData, TravelModeKey } from '@types';
import { getRoutes as getDirectionRoutes } from '@services/directions';

interface UseCyclingDirectionsReturn {
  routes: RouteData[];
  selectedIndex: number;
  route: RouteData | null;
  loading: boolean;
  error: string | null;
  getRoute: (stops: LatLng[]) => Promise<void>;
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

  const getRoute = useCallback(async (stops: LatLng[]) => {
    setLoading(true);
    setError(null);

    try {
      const travelMode = google.maps.TravelMode[travelModeKey];
      const results = await getDirectionRoutes(stops, travelMode);
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
