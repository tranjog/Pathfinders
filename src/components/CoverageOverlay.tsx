import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import type { PathSegment } from '@types';
import { useActivityStore } from '@store/activityStore';
import { useMapSessionStore } from '@store/mapSessionStore';
import { ACTIVITY } from '@constants';

interface CoverageOverlayProps {
  segments: PathSegment[];
  onSegmentClick?: (segment: PathSegment, latLng: google.maps.LatLng) => void;
}

// Theme-aware accent so map paths align with the active activity.
const ACTIVITY_ACCENT: Record<string, string> = {
  [ACTIVITY.CYCLING]: '#e94560',
  [ACTIVITY.RUNNING]: '#28a55a',
};

export default function CoverageOverlay({
  segments,
  onSegmentClick,
}: CoverageOverlayProps) {
  const map = useMap();
  const activity = useActivityStore((s) => s.activity);
  const selectedSegmentId = useMapSessionStore((s) => s.selectedSegment?.id ?? null);
  const accent = ACTIVITY_ACCENT[activity] ?? '#e94560';
  const polylinesRef = useRef<Map<number, google.maps.Polyline>>(new Map());
  const halosRef = useRef<Map<number, google.maps.Polyline>>(new Map());
  const listenersRef = useRef<Map<number, google.maps.MapsEventListener>>(new Map());

  // Hold the latest click handler so the polyline listeners (created once
  // per segment) always invoke the current callback closure.
  const onSegmentClickRef = useRef(onSegmentClick);
  useEffect(() => {
    onSegmentClickRef.current = onSegmentClick;
  }, [onSegmentClick]);

  useEffect(() => {
    if (!map) return;

    const currentIds = new Set(segments.map(s => s.id));
    const existingIds = polylinesRef.current;

    // Remove polylines for segments no longer present
    for (const [id, polyline] of existingIds) {
      if (!currentIds.has(id)) {
        polyline.setMap(null);
        existingIds.delete(id);
        const halo = halosRef.current.get(id);
        if (halo) {
          halo.setMap(null);
          halosRef.current.delete(id);
        }
        const listener = listenersRef.current.get(id);
        if (listener) {
          google.maps.event.removeListener(listener);
          listenersRef.current.delete(id);
        }
      }
    }

    // Add or update polylines
    for (const segment of segments) {
      const path = segment.points.map(p => ({ lat: p.lat, lng: p.lng }));
      // Always use the activity theme accent so map paths read as cycling/running
      // regardless of coverage state. Coverage info is conveyed in the sidebar.
      const color = accent;
      const isSelected = segment.id === selectedSegmentId;
      const polyOpacity = segment.coverageChecked ? 0.95 : 0.75;
      const polyWeight = isSelected ? 6 : 4;
      const haloOpacity = isSelected ? 0.85 : 0.5;
      const haloWeight = isSelected ? 11 : 7;
      const existing = existingIds.get(segment.id);
      const existingHalo = halosRef.current.get(segment.id);

      if (existing) {
        existing.setOptions({
          strokeColor: color,
          strokeOpacity: polyOpacity,
          strokeWeight: polyWeight,
          zIndex: isSelected ? 12 : 10,
        });
        existingHalo?.setOptions({
          strokeOpacity: haloOpacity,
          strokeWeight: haloWeight,
          zIndex: isSelected ? 11 : 9,
        });
      } else {
        // Dark outline halo gives definition on both map and satellite tiles.
        const halo = new google.maps.Polyline({
          path,
          strokeColor: '#000000',
          strokeOpacity: haloOpacity,
          strokeWeight: haloWeight,
          map,
          clickable: false,
          zIndex: isSelected ? 11 : 9,
        });
        halosRef.current.set(segment.id, halo);

        const polyline = new google.maps.Polyline({
          path,
          strokeColor: color,
          strokeOpacity: polyOpacity,
          strokeWeight: polyWeight,
          map,
          clickable: true,
          zIndex: isSelected ? 12 : 10,
        });

        const listener = polyline.addListener('click', (e: google.maps.PolyMouseEvent) => {
          if (e.latLng) {
            onSegmentClickRef.current?.(segment, e.latLng);
          }
        });

        existingIds.set(segment.id, polyline);
        listenersRef.current.set(segment.id, listener);
      }
    }
  }, [map, segments, accent, selectedSegmentId]);

  // Cleanup on unmount
  useEffect(() => {
    const polylines = polylinesRef.current;
    const halos = halosRef.current;
    const listeners = listenersRef.current;
    return () => {
      for (const polyline of polylines.values()) {
        polyline.setMap(null);
      }
      for (const halo of halos.values()) {
        halo.setMap(null);
      }
      for (const listener of listeners.values()) {
        google.maps.event.removeListener(listener);
      }
      polylines.clear();
      halos.clear();
      listeners.clear();
    };
  }, []);

  return null;
}
