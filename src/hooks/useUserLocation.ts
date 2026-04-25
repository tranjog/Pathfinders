import { useState, useCallback, useEffect } from 'react';
import type { LatLng } from '../types';

interface UseUserLocationReturn {
  userLocation: LatLng | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => Promise<LatLng | null>;
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function getTauriLocation(): Promise<LatLng> {
  const { getCurrentPosition, checkPermissions, requestPermissions } =
    await import('@tauri-apps/plugin-geolocation');

  let perm = await checkPermissions();
  if (perm.location !== 'granted') {
    perm = await requestPermissions(['location']);
  }
  if (perm.location !== 'granted') {
    throw new Error('Location permission denied');
  }

  const pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

function getBrowserLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

export function useUserLocation(requestOnMount = true): UseUserLocationReturn {
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async (): Promise<LatLng | null> => {
    setLoading(true);
    setError(null);
    try {
      const loc = await (isTauri() ? getTauriLocation() : getBrowserLocation());
      setUserLocation(loc);
      return loc;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Location unavailable';
      setError(msg);
      console.warn('[useUserLocation]', msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (requestOnMount) requestLocation();
  }, [requestOnMount, requestLocation]);

  return { userLocation, loading, error, requestLocation };
}
