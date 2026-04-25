import type { ActivityConfig, ActivityType } from '@types';
import { cyclingOverpassQuery, runningOverpassQuery } from '@utils/overpassQuery';

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
