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

import { ACTIVITY, APP_MODE, TRAVEL_MODE } from '@constants';

export type AppMode = typeof APP_MODE[keyof typeof APP_MODE];

export type ActivityType = typeof ACTIVITY[keyof typeof ACTIVITY];

export interface MoverState {
  isPlaying: boolean;
  currentIndex: number;
  heading: number;
  points: LatLng[];
}

export type TravelModeKey = typeof TRAVEL_MODE[keyof typeof TRAVEL_MODE];

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
