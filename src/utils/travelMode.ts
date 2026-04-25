import type { TravelModeKey } from '@types';

export function getTravelMode(key: TravelModeKey): google.maps.TravelMode {
  return google.maps.TravelMode[key];
}
