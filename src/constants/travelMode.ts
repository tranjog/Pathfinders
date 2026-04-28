export const TRAVEL_MODE = {
  BICYCLING: 'BICYCLING',
  WALKING: 'WALKING',
} as const;

export type TravelModeKey = typeof TRAVEL_MODE[keyof typeof TRAVEL_MODE];
