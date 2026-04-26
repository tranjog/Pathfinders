import type { ActivityConfig, ActivityType } from '@types';
import { ACTIVITY, TRAVEL_MODE } from '@constants';
import { cyclingOverpassQuery, runningOverpassQuery } from '@utils/overpassQuery';

export const ACTIVITY_CONFIGS: Record<ActivityType, ActivityConfig> = {
  [ACTIVITY.CYCLING]: {
    appTitle: 'Cyclable Paths',
    pathNounPlural: 'Cycleways',
    pathNounSingular: 'cycleway',
    actionVerb: 'Ride',
    loadingMessage: 'Loading cycleways...',
    zoomMessage: 'Zoom in to see cyclable paths.',
    emptyMessage: 'No cycleways found in this area.',
    travelModeKey: TRAVEL_MODE.BICYCLING,
    overpassQuery: cyclingOverpassQuery,
  },
  [ACTIVITY.RUNNING]: {
    appTitle: 'Runnable Paths',
    pathNounPlural: 'Trails',
    pathNounSingular: 'trail',
    actionVerb: 'Run',
    loadingMessage: 'Loading trails...',
    zoomMessage: 'Zoom in to see running trails.',
    emptyMessage: 'No trails found in this area.',
    travelModeKey: TRAVEL_MODE.WALKING,
    overpassQuery: runningOverpassQuery,
  },
};
