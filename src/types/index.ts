export interface LatLng {
  lat: number;
  lng: number;
}

export interface CyclewaySegment {
  id: number;
  name?: string;
  points: LatLng[];
  coverageRatio?: number;
  coverageChecked: boolean;
}

export interface RouteData {
  polyline: LatLng[];
  sampledPoints: LatLng[];
  coverageMap: Map<number, boolean>;
  distance: string;
  duration: string;
}

export type AppMode = 'browse' | 'route';

export type ActivityType = 'cycling' | 'running';

export interface MoverState {
  isPlaying: boolean;
  currentIndex: number;
  heading: number;
  points: LatLng[];
}

export type TravelModeKey = 'BICYCLING' | 'WALKING';

export interface ActivityConfig {
  appTitle: string;
  pathNounPlural: string;
  pathNounSingular: string;
  actionVerb: string;
  loadingMessage: string;
  zoomMessage: string;
  emptyMessage: string;
  travelModeKey: TravelModeKey;
  overpassQuery: (bbox: string) => string;
}
