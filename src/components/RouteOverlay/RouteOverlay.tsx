import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { boundsForPath } from '@services/mapBounds';
import { useDirectionsStore } from '@store/directionsStore';

export default function RouteOverlay() {
  const map = useMap();
  const { routes, selectedIndex, selectRoute } = useDirectionsStore();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  useEffect(() => {
    if (!map) return;

    for (const p of polylinesRef.current) p.setMap(null);
    for (const l of listenersRef.current) google.maps.event.removeListener(l);
    polylinesRef.current = [];
    listenersRef.current = [];

    if (routes.length === 0) return;

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

      const listener = polyline.addListener('click', () => selectRoute(i));
      listenersRef.current.push(listener);
    }

    const selected = routes[selectedIndex];
    if (selected) {
      map.fitBounds(boundsForPath(selected.polyline), 50);
    }

    return () => {
      for (const p of polylinesRef.current) p.setMap(null);
      for (const l of listenersRef.current) google.maps.event.removeListener(l);
      polylinesRef.current = [];
      listenersRef.current = [];
    };
  }, [map, routes, selectedIndex, selectRoute]);

  return null;
}
