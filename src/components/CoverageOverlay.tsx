import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import type { CyclewaySegment } from '../types';

interface CoverageOverlayProps {
  segments: CyclewaySegment[];
  onSegmentClick?: (segment: CyclewaySegment, latLng: google.maps.LatLng) => void;
}

function getSegmentColor(segment: CyclewaySegment): string {
  if (!segment.coverageChecked) return '#888888';
  if (segment.coverageRatio == null) return '#888888';
  if (segment.coverageRatio > 0.5) return '#4caf50';
  if (segment.coverageRatio > 0) return '#ff9800';
  return '#f44336';
}

export default function CoverageOverlay({ segments, onSegmentClick }: CoverageOverlayProps) {
  const map = useMap();
  const polylinesRef = useRef<Map<number, google.maps.Polyline>>(new Map());
  const halosRef = useRef<Map<number, google.maps.Polyline>>(new Map());
  const listenersRef = useRef<Map<number, google.maps.MapsEventListener>>(new Map());

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
      const color = getSegmentColor(segment);
      const existing = existingIds.get(segment.id);

      if (existing) {
        existing.setOptions({
          strokeColor: color,
          strokeOpacity: segment.coverageChecked ? 0.9 : 0.7,
        });
      } else {
        // Wide translucent blue halo for visibility
        const halo = new google.maps.Polyline({
          path,
          strokeColor: '#42a5f5',
          strokeOpacity: 0.45,
          strokeWeight: 10,
          map,
          clickable: false,
          zIndex: 9,
        });
        halosRef.current.set(segment.id, halo);

        const polyline = new google.maps.Polyline({
          path,
          strokeColor: color,
          strokeOpacity: segment.coverageChecked ? 0.9 : 0.7,
          strokeWeight: 5,
          map,
          clickable: true,
          zIndex: 10,
        });

        const listener = polyline.addListener('click', (e: google.maps.PolyMouseEvent) => {
          if (e.latLng && onSegmentClick) {
            onSegmentClick(segment, e.latLng);
          }
        });

        existingIds.set(segment.id, polyline);
        listenersRef.current.set(segment.id, listener);
      }
    }
  }, [map, segments, onSegmentClick]);

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
