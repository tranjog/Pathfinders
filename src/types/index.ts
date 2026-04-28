import type { ActivityType } from '@constants/activity';
import type { TravelModeKey } from '@constants/travelMode';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Stop {
  latLng: LatLng | null;
  label: string;
}

export interface PathSegment {
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

export interface MoverState {
  isPlaying: boolean;
  currentIndex: number;
  heading: number;
  points: LatLng[];
}

export interface SavedRouteData {
  polyline: LatLng[];
  sampledPoints: LatLng[];
  distance: string;
  duration: string;
}

export interface SavedRoute {
  id: string;
  name: string;
  activity: ActivityType;
  stops: Stop[];
  route: SavedRouteData;
  createdAt: number;
}

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
