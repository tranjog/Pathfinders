import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import type { RouteData } from '../types';

interface RouteOverlayProps {
  routes: RouteData[];
  selectedIndex: number;
  onSelectRoute?: (index: number) => void;
}

export default function RouteOverlay({ routes, selectedIndex, onSelectRoute }: RouteOverlayProps) {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  useEffect(() => {
    if (!map) return;

    // Clean up previous polylines
    for (const p of polylinesRef.current) p.setMap(null);
    for (const l of listenersRef.current) google.maps.event.removeListener(l);
    polylinesRef.current = [];
    listenersRef.current = [];

    if (routes.length === 0) return;

    // Draw unselected routes first (below), then selected on top
    const order = routes.map((_, i) => i).sort((a, b) => {
      if (a === selectedIndex) return 1;
      if (b === selectedIndex) return -1;
      return 0;
    });

    for (const i of order) {
      const route = routes[i];
      const isSelected = i === selectedIndex;
      const path = route.polyline.map(p => ({ lat: p.lat, lng: p.lng }));

      const polyline = new google.maps.Polyline({
        path,
        strokeColor: isSelected ? '#2196f3' : '#90a4ae',
        strokeOpacity: isSelected ? 0.8 : 0.5,
        strokeWeight: isSelected ? 5 : 4,
        map,
        clickable: true,
        zIndex: isSelected ? 20 : 15,
      });

      polylinesRef.current.push(polyline);

      if (onSelectRoute) {
        const listener = polyline.addListener('click', () => onSelectRoute(i));
        listenersRef.current.push(listener);
      }
    }

    // Fit map to selected route
    const selected = routes[selectedIndex];
    if (selected) {
      const bounds = new google.maps.LatLngBounds();
      for (const p of selected.polyline) {
        bounds.extend({ lat: p.lat, lng: p.lng });
      }
      map.fitBounds(bounds, 50);
    }

    return () => {
      for (const p of polylinesRef.current) p.setMap(null);
      for (const l of listenersRef.current) google.maps.event.removeListener(l);
      polylinesRef.current = [];
      listenersRef.current = [];
    };
  }, [map, routes, selectedIndex, onSelectRoute]);

  return null;
}
