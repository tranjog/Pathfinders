export const ACTIVITY = {
  CYCLING: 'cycling',
  RUNNING: 'running',
} as const;

export const APP_MODE = {
  BROWSE: 'browse',
  ROUTE: 'route',
} as const;

export const TRAVEL_MODE = {
  BICYCLING: 'BICYCLING',
  WALKING: 'WALKING',
} as const;

export const DEFAULT_CENTER = { lat: 51.5074, lng: -0.1278 }; // London, UK
export const DEFAULT_ZOOM = 14;
export const SV_SAMPLE_INTERVAL_METERS = 50;
export const SV_SEARCH_RADIUS = 50;
export const MOVE_INTERVAL_MS = 2000;
export const OVERPASS_DEBOUNCE_MS = 800;
export const MAX_OVERPASS_AREA_KM2 = 25;
export const MIN_BROWSE_ZOOM = 13;
