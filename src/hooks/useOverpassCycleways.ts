import { useState, useEffect, useRef, useCallback } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import type { CyclewaySegment, ActivityType } from '../types';
import { fetchPaths, getBoundsAreaKm2 } from '../services/overpass';
import { OVERPASS_DEBOUNCE_MS, MAX_OVERPASS_AREA_KM2, MIN_BROWSE_ZOOM } from '../constants';
import { ACTIVITY_CONFIGS } from '../config/activityConfig';

interface UseOverpassCyclewaysResult {
  segments: CyclewaySegment[];
  loading: boolean;
  error: string | null;
  tooZoomedOut: boolean;
}

export function useOverpassCycleways(active: boolean, activity: ActivityType = 'cycling'): UseOverpassCyclewaysResult {
  const map = useMap();
  const [segments, setSegments] = useState<CyclewaySegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooZoomedOut, setTooZoomedOut] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const config = ACTIVITY_CONFIGS[activity];

  // Clear segments when activity changes
  useEffect(() => {
    setSegments([]);
  }, [activity]);

  const loadPaths = useCallback(async () => {
    if (!map || !active) return;

    const bounds = map.getBounds();
    const zoom = map.getZoom();
    if (!bounds || zoom == null) return;

    if (zoom < MIN_BROWSE_ZOOM || getBoundsAreaKm2(bounds) > MAX_OVERPASS_AREA_KM2) {
      setTooZoomedOut(true);
      setSegments([]);
      return;
    }

    setTooZoomedOut(false);
    setLoading(true);
    setError(null);

    try {
      const result = await fetchPaths(bounds, config.overpassQuery, activity);
      setSegments(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${config.pathNounPlural.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [map, active, activity, config]);

  useEffect(() => {
    if (!map || !active) return;

    const listener = map.addListener('idle', () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(loadPaths, OVERPASS_DEBOUNCE_MS);
    });

    // Initial load
    loadPaths();

    return () => {
      google.maps.event.removeListener(listener);
      clearTimeout(debounceRef.current);
    };
  }, [map, active, loadPaths]);

  return { segments, loading, error, tooZoomedOut };
}
