import type { LatLng, RouteData } from '../types';
import { decodePath, samplePointsAlongPath } from './geometry';
import { SV_SAMPLE_INTERVAL_METERS } from '../constants';

let directionsService: google.maps.DirectionsService | null = null;

function getService(): google.maps.DirectionsService {
  if (!directionsService) {
    directionsService = new google.maps.DirectionsService();
  }
  return directionsService;
}

export async function getRoutes(
  origin: LatLng,
  destination: LatLng,
  travelMode: google.maps.TravelMode = google.maps.TravelMode.BICYCLING,
): Promise<RouteData[]> {
  const service = getService();

  const result = await service.route({
    origin: { lat: origin.lat, lng: origin.lng },
    destination: { lat: destination.lat, lng: destination.lng },
    travelMode,
    provideRouteAlternatives: true,
  });

  if (!result.routes.length) throw new Error('No route found');

  return result.routes.slice(0, 5).map(route => {
    const leg = route.legs[0];

    // overview_path is the most reliable source — always an array of LatLng
    let polyline: LatLng[];
    if (route.overview_path && route.overview_path.length > 0) {
      polyline = route.overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }));
    } else {
      // overview_polyline can be a string or { points: string }
      const raw = route.overview_polyline as unknown;
      const encoded = typeof raw === 'string' ? raw : (raw as { points?: string })?.points ?? '';
      polyline = encoded ? decodePath(encoded) : [];
    }

    const sampledPoints = samplePointsAlongPath(polyline, SV_SAMPLE_INTERVAL_METERS);

    return {
      polyline,
      sampledPoints,
      coverageMap: new Map(),
      distance: leg?.distance?.text ?? 'Unknown',
      duration: leg?.duration?.text ?? 'Unknown',
    };
  });
}
