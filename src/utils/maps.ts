export function createAutocompleteElement(
  placesLib: google.maps.PlacesLibrary,
): google.maps.places.PlaceAutocompleteElement {
  return new placesLib.PlaceAutocompleteElement({});
}
