import type { LatLng } from '@types';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const EARTH_RADIUS = 6371000; // meters

export function distanceBetween(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * DEG2RAD;
  const dLng = (b.lng - a.lng) * DEG2RAD;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(a.lat * DEG2RAD) * Math.cos(b.lat * DEG2RAD) * sinLng * sinLng;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}

export function computeHeading(from: LatLng, to: LatLng): number {
  const dLng = (to.lng - from.lng) * DEG2RAD;
  const fromLat = from.lat * DEG2RAD;
  const toLat = to.lat * DEG2RAD;
  const y = Math.sin(dLng) * Math.cos(toLat);
  const x = Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(dLng);
  return ((Math.atan2(y, x) * RAD2DEG) + 360) % 360;
}

function interpolate(a: LatLng, b: LatLng, fraction: number): LatLng {
  return {
    lat: a.lat + (b.lat - a.lat) * fraction,
    lng: a.lng + (b.lng - a.lng) * fraction,
  };
}

export function samplePointsAlongPath(points: LatLng[], intervalMeters: number): LatLng[] {
  if (points.length < 2) return [...points];

  const sampled: LatLng[] = [points[0]];
  let accumulated = 0;

  for (let i = 1; i < points.length; i++) {
    const segDist = distanceBetween(points[i - 1], points[i]);
    let remaining = segDist;
    let segStart = points[i - 1];

    while (accumulated + remaining >= intervalMeters) {
      const needed = intervalMeters - accumulated;
      const frac = needed / distanceBetween(segStart, points[i]);
      const pt = interpolate(segStart, points[i], frac);
      sampled.push(pt);
      segStart = pt;
      remaining -= needed;
      accumulated = 0;
    }

    accumulated += remaining;
  }

  // Always include the last point
  const last = points[points.length - 1];
  const lastSampled = sampled[sampled.length - 1];
  if (distanceBetween(lastSampled, last) > 1) {
    sampled.push(last);
  }

  return sampled;
}

export function decodePath(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}
