import { useState, useCallback, useEffect } from 'react';
import type { LatLng } from '../types';

interface UseUserLocationReturn {
  userLocation: LatLng | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => void;
}

export function useUserLocation(requestOnMount = true): UseUserLocationReturn {
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (requestOnMount) requestLocation();
  }, [requestOnMount, requestLocation]);

  return { userLocation, loading, error, requestLocation };
}
