import type { LatLng, RouteData } from '@types';
import { decodePath, samplePointsAlongPath } from './geometry';
import { SV_SAMPLE_INTERVAL_METERS } from '@constants';

let directionsService: google.maps.DirectionsService | null = null;

function getService(): google.maps.DirectionsService {
  if (!directionsService) {
    directionsService = new google.maps.DirectionsService();
  }
  return directionsService;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
  return `${m} min`;
}

export async function getRoutes(
  stops: LatLng[],
  travelMode: google.maps.TravelMode = google.maps.TravelMode.BICYCLING,
): Promise<RouteData[]> {
  if (stops.length < 2) throw new Error('At least two stops required');

  const service = getService();
  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const hasWaypoints = stops.length > 2;

  const waypoints: google.maps.DirectionsWaypoint[] = hasWaypoints
    ? stops.slice(1, -1).map((s) => ({ location: { lat: s.lat, lng: s.lng }, stopover: true }))
    : [];

  const result = await service.route({
    origin: { lat: origin.lat, lng: origin.lng },
    destination: { lat: destination.lat, lng: destination.lng },
    waypoints,
    travelMode,
    // alternatives not supported when waypoints are present
    provideRouteAlternatives: !hasWaypoints,
  });

  if (!result.routes.length) throw new Error('No route found');

  const candidates = hasWaypoints ? result.routes.slice(0, 1) : result.routes.slice(0, 5);

  return candidates.map((route) => {
    let polyline: LatLng[];
    if (route.overview_path && route.overview_path.length > 0) {
      polyline = route.overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() }));
    } else {
      const raw = route.overview_polyline as unknown;
      const encoded = typeof raw === 'string' ? raw : (raw as { points?: string })?.points ?? '';
      polyline = encoded ? decodePath(encoded) : [];
    }

    const sampledPoints = samplePointsAlongPath(polyline, SV_SAMPLE_INTERVAL_METERS);

    const totalDistanceM = route.legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0);
    const totalDurationS = route.legs.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0);

    return {
      polyline,
      sampledPoints,
      coverageMap: new Map(),
      distance: totalDistanceM > 0 ? formatDistance(totalDistanceM) : 'Unknown',
      duration: totalDurationS > 0 ? formatDuration(totalDurationS) : 'Unknown',
    };
  });
}
