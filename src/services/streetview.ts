import type { LatLng } from '@types';
import { SV_SEARCH_RADIUS } from '@constants/tuning';

// Cache coverage results keyed by rounded lat/lng
const coverageCache = new Map<string, boolean>();

function cacheKey(p: LatLng): string {
  return `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
}

let svService: google.maps.StreetViewService | null = null;

function getService(): google.maps.StreetViewService {
  if (!svService) {
    svService = new google.maps.StreetViewService();
  }
  return svService;
}

export async function checkCoverageAtPoint(point: LatLng): Promise<boolean> {
  const key = cacheKey(point);
  const cached = coverageCache.get(key);
  if (cached !== undefined) return cached;

  const service = getService();

  try {
    const result = await service.getPanorama({
      location: { lat: point.lat, lng: point.lng },
      radius: SV_SEARCH_RADIUS,
      source: google.maps.StreetViewSource.OUTDOOR,
    });
    const hasCoverage = result.data?.location?.latLng != null;
    coverageCache.set(key, hasCoverage);
    return hasCoverage;
  } catch {
    coverageCache.set(key, false);
    return false;
  }
}

export async function checkCoverageAtPoints(
  points: LatLng[],
  onProgress?: (checked: number, total: number) => void,
): Promise<boolean[]> {
  const results: boolean[] = new Array(points.length).fill(false);
  const BATCH_SIZE = 10;
  const BATCH_DELAY = 100;

  for (let i = 0; i < points.length; i += BATCH_SIZE) {
    const batch = points.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(checkCoverageAtPoint));

    for (let j = 0; j < batchResults.length; j++) {
      results[i + j] = batchResults[j];
    }

    onProgress?.(Math.min(i + BATCH_SIZE, points.length), points.length);

    if (i + BATCH_SIZE < points.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }

  return results;
}

export async function getNearestPanorama(
  point: LatLng,
  radius = SV_SEARCH_RADIUS,
): Promise<{ lat: number; lng: number; panoId: string } | null> {
  const service = getService();

  try {
    const result = await service.getPanorama({
      location: { lat: point.lat, lng: point.lng },
      radius,
      source: google.maps.StreetViewSource.OUTDOOR,
    });

    const loc = result.data?.location;
    if (loc?.latLng) {
      return {
        lat: loc.latLng.lat(),
        lng: loc.latLng.lng(),
        panoId: loc.pano ?? '',
      };
    }
  } catch {
    // No panorama found
  }

  return null;
}
