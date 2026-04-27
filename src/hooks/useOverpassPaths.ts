import { useState, useEffect, useRef, useCallback } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import type { PathSegment } from '@types';
import { fetchPaths, getBoundsAreaKm2 } from '@services/overpass';
import { OVERPASS_DEBOUNCE_MS, MAX_OVERPASS_AREA_KM2, MIN_BROWSE_ZOOM } from '@constants';
import { ACTIVITY_CONFIGS } from '@constants/activityConfig';
import { useActivityStore } from '@store/activityStore';

// Expand the fetch bounds by this fraction of the viewport on each side.
// Allows the user to pan ~50% of the viewport width without triggering a new request.
// Capped by MAX_OVERPASS_AREA_KM2 — at low zoom levels where the viewport is already
// near the area limit the padding is simply dropped and we fetch the raw viewport.
const BOUNDS_BUFFER = 0.5;

interface UseOverpassPathsResult {
  segments: PathSegment[];
  loading: boolean;
  error: string | null;
  tooZoomedOut: boolean;
}

export function useOverpassPaths(active: boolean): UseOverpassPathsResult {
  const map = useMap();
  const { activity } = useActivityStore();
  const [segments, setSegments] = useState<PathSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooZoomedOut, setTooZoomedOut] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fetchedBoundsRef = useRef<google.maps.LatLngBounds | null>(null);

  const config = ACTIVITY_CONFIGS[activity];

  useEffect(() => {
    setSegments([]);
    fetchedBoundsRef.current = null;
  }, [activity]);

  const loadPaths = useCallback(async () => {
    if (!map || !active) return;

    const viewport = map.getBounds();
    const zoom = map.getZoom();
    if (!viewport || zoom == null) return;

    if (zoom < MIN_BROWSE_ZOOM || getBoundsAreaKm2(viewport) > MAX_OVERPASS_AREA_KM2) {
      setTooZoomedOut(true);
      setSegments([]);
      fetchedBoundsRef.current = null;
      return;
    }

    // Skip if the current viewport is already covered by the last successful fetch.
    if (
      fetchedBoundsRef.current &&
      fetchedBoundsRef.current.contains(viewport.getNorthEast()) &&
      fetchedBoundsRef.current.contains(viewport.getSouthWest())
    ) {
      setTooZoomedOut(false);
      return;
    }

    // Expand the query bounds so adjacent pans are already covered.
    const ne = viewport.getNorthEast();
    const sw = viewport.getSouthWest();
    const latPad = (ne.lat() - sw.lat()) * BOUNDS_BUFFER;
    const lngPad = (ne.lng() - sw.lng()) * BOUNDS_BUFFER;
    const paddedBounds = new google.maps.LatLngBounds(
      { lat: sw.lat() - latPad, lng: sw.lng() - lngPad },
      { lat: ne.lat() + latPad, lng: ne.lng() + lngPad },
    );
    const fetchBounds = getBoundsAreaKm2(paddedBounds) <= MAX_OVERPASS_AREA_KM2
      ? paddedBounds
      : viewport;

    setTooZoomedOut(false);
    setLoading(true);
    setError(null);

    try {
      const result = await fetchPaths(fetchBounds, config.overpassQuery, activity);
      setSegments(result);
      fetchedBoundsRef.current = fetchBounds;
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

    loadPaths();

    return () => {
      google.maps.event.removeListener(listener);
      clearTimeout(debounceRef.current);
    };
  }, [map, active, loadPaths]);

  return { segments, loading, error, tooZoomedOut };
}
