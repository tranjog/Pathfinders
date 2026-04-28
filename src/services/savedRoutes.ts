import type { SavedRoute, SavedRouteData, Stop } from '@types';
import { ACTIVITY, type ActivityType } from '@constants/activity';

const STORAGE_KEY = 'pathfinders.savedRoutes';

function isLatLng(v: unknown): v is { lat: number; lng: number } {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as { lat?: unknown }).lat === 'number' &&
    typeof (v as { lng?: unknown }).lng === 'number'
  );
}

function isStop(v: unknown): v is Stop {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as { latLng?: unknown; label?: unknown };
  if (typeof s.label !== 'string') return false;
  return s.latLng === null || isLatLng(s.latLng);
}

function isActivity(v: unknown): v is ActivityType {
  return v === ACTIVITY.CYCLING || v === ACTIVITY.RUNNING;
}

function isRouteData(v: unknown): v is SavedRouteData {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Partial<SavedRouteData>;
  return (
    Array.isArray(r.polyline) &&
    r.polyline.every(isLatLng) &&
    Array.isArray(r.sampledPoints) &&
    r.sampledPoints.every(isLatLng) &&
    typeof r.distance === 'string' &&
    typeof r.duration === 'string'
  );
}

function isSavedRoute(v: unknown): v is SavedRoute {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Partial<SavedRoute>;
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    typeof r.createdAt === 'number' &&
    isActivity(r.activity) &&
    Array.isArray(r.stops) &&
    r.stops.every(isStop) &&
    isRouteData(r.route)
  );
}

export function loadAll(): SavedRoute[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedRoute);
  } catch {
    return [];
  }
}

export function saveAll(routes: SavedRoute[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
  } catch {
    /* ignore quota errors */
  }
}
