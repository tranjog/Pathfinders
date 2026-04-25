import { useState, useCallback, useEffect } from 'react';
import type { LatLng } from '../types';

interface UseUserLocationReturn {
  userLocation: LatLng | null;
  source: LocationSource | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => Promise<LatLng | null>;
}

export type LocationSource = 'native' | 'ip';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
}

async function getMacosNativeLocation(): Promise<LatLng> {
  const { invoke } = await import('@tauri-apps/api/core');
  const res = await invoke<{ latitude: number; longitude: number }>('get_macos_location');
  return { lat: res.latitude, lng: res.longitude };
}

async function getTauriPluginLocation(): Promise<LatLng> {
  const { getCurrentPosition, checkPermissions, requestPermissions } =
    await import('@tauri-apps/plugin-geolocation');
  let perm = await checkPermissions();
  if (perm.location !== 'granted') {
    perm = await requestPermissions(['location']);
  }
  if (perm.location !== 'granted') throw new Error('Location permission denied');
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

async function getIpLocation(): Promise<LatLng> {
  const res = await fetch('https://ipapi.co/json/');
  if (!res.ok) throw new Error(`IP geolocation HTTP ${res.status}`);
  const data = await res.json() as { latitude?: number; longitude?: number; error?: boolean; reason?: string };
  if (data.error || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
    throw new Error(data.reason ?? 'IP geolocation returned no coordinates');
  }
  return { lat: data.latitude, lng: data.longitude };
}

async function resolveLocation(): Promise<{ loc: LatLng; source: LocationSource }> {
  const errors: string[] = [];

  if (isTauri()) {
    if (isMac()) {
      try { return { loc: await getMacosNativeLocation(), source: 'native' }; }
      catch (e) { errors.push(`macOS native: ${(e as Error).message}`); }
    } else {
      try { return { loc: await getTauriPluginLocation(), source: 'native' }; }
      catch (e) { errors.push(`tauri plugin: ${(e as Error).message}`); }
    }
  } else {
    try { return { loc: await getBrowserLocation(), source: 'native' }; }
    catch (e) { errors.push(`browser: ${(e as Error).message}`); }
  }

  try { return { loc: await getIpLocation(), source: 'ip' }; }
  catch (e) { errors.push(`ip: ${(e as Error).message}`); }

  throw new Error(errors.join(' | '));
}

export function useUserLocation(requestOnMount = true): UseUserLocationReturn {
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [source, setSource] = useState<LocationSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async (): Promise<LatLng | null> => {
    setLoading(true);
    setError(null);
    try {
      const { loc, source: src } = await resolveLocation();
      setUserLocation(loc);
      setSource(src);
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

  return { userLocation, source, loading, error, requestLocation };
}
