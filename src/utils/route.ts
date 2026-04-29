import type { LatLng } from '@types';

// ~1.1 m at the equator — tight enough to avoid false positives between
// distinct routes, loose enough to absorb float drift between runs.
const EPS = 1e-5;

function nearlyEqual(a: LatLng, b: LatLng): boolean {
  return Math.abs(a.lat - b.lat) < EPS && Math.abs(a.lng - b.lng) < EPS;
}

/**
 * Heuristic equality for two route polylines. Compares length plus the first,
 * middle, and last points — fast and good enough for duplicate detection
 * (Directions API is deterministic for the same stops + travel mode).
 */
export function isSamePolyline(a: readonly LatLng[], b: readonly LatLng[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  const last = a.length - 1;
  const mid = last >> 1;
  return (
    nearlyEqual(a[0], b[0]) &&
    nearlyEqual(a[last], b[last]) &&
    nearlyEqual(a[mid], b[mid])
  );
}
