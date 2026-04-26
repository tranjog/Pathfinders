import type { LatLng } from '@types';

export async function reverseGeocode(latLng: LatLng): Promise<string> {
  return new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        resolve(results[0].formatted_address);
      } else {
        resolve(`${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`);
      }
    });
  });
}
