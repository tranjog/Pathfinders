import type { LatLng } from '@types';

export function boundsForPath(points: LatLng[]): google.maps.LatLngBounds {
  const bounds = new google.maps.LatLngBounds();
  for (const p of points) {
    bounds.extend({ lat: p.lat, lng: p.lng });
  }
  return bounds;
}
