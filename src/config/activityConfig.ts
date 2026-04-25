import type { ActivityType } from '../types';

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

export function getTravelMode(key: TravelModeKey): google.maps.TravelMode {
  return google.maps.TravelMode[key];
}

function cyclingOverpassQuery(bbox: string): string {
  return `
    [out:json][timeout:15];
    (
      way["highway"="cycleway"](${bbox});
      way["cycleway"="track"](${bbox});
      way["cycleway"="lane"](${bbox});
      way["bicycle"="designated"](${bbox});
    );
    out body;
    >;
    out skel qt;
  `;
}

function runningOverpassQuery(bbox: string): string {
  return `
    [out:json][timeout:15];
    (
      way["highway"="path"](${bbox});
      way["highway"="footway"](${bbox});
      way["highway"="track"](${bbox});
    );
    out body;
    >;
    out skel qt;
  `;
}

export const ACTIVITY_CONFIGS: Record<ActivityType, ActivityConfig> = {
  cycling: {
    appTitle: 'Cyclable Paths',
    pathNounPlural: 'Cycleways',
    pathNounSingular: 'cycleway',
    actionVerb: 'Ride',
    loadingMessage: 'Loading cycleways...',
    zoomMessage: 'Zoom in to see cyclable paths.',
    emptyMessage: 'No cycleways found in this area.',
    travelModeKey: 'BICYCLING',
    overpassQuery: cyclingOverpassQuery,
  },
  running: {
    appTitle: 'Runnable Paths',
    pathNounPlural: 'Trails',
    pathNounSingular: 'trail',
    actionVerb: 'Run',
    loadingMessage: 'Loading trails...',
    zoomMessage: 'Zoom in to see running trails.',
    emptyMessage: 'No trails found in this area.',
    travelModeKey: 'WALKING',
    overpassQuery: runningOverpassQuery,
  },
};
