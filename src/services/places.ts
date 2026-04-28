export function createAutocompleteElement(
  placesLib: google.maps.PlacesLibrary,
): google.maps.places.PlaceAutocompleteElement {
  // `PlaceAutocompleteElement` is exposed at runtime by the Places library, but
  // is missing from the `PlacesLibrary` interface in the current
  // `@types/google.maps`. Access it via a typed cast.
  const lib = placesLib as google.maps.PlacesLibrary & {
    PlaceAutocompleteElement: typeof google.maps.places.PlaceAutocompleteElement;
  };
  return new lib.PlaceAutocompleteElement({});
}

/**
 * The shadow root of `gmp-place-autocomplete` is closed, so we can't reach
 * the underlying `<input>` via `.shadowRoot.querySelector`. Google does not
 * expose a public setter for the displayed value either. As a workaround,
 * scan the element's own enumerable properties for an HTMLInputElement
 * reference (Google's minified internal name varies between releases).
 *
 * If found, callers can set `.value` and dispatch an input event to update
 * the visible text after a programmatic stop change (map-pick, "use my
 * location", restoring a saved route, etc.).
 */
export function findGmpInput(
  element: google.maps.places.PlaceAutocompleteElement,
): HTMLInputElement | null {
  const el = element as unknown as Record<string, unknown> & {
    inputElement?: unknown;
  };

  if (el.inputElement instanceof HTMLInputElement) return el.inputElement;

  const seen = new Set<string>();
  for (const prop in el) {
    if (seen.has(prop)) continue;
    seen.add(prop);
    try {
      const value = el[prop];
      if (value instanceof HTMLInputElement) return value;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function setGmpInputValue(
  element: google.maps.places.PlaceAutocompleteElement,
  value: string,
): void {
  const input = findGmpInput(element);
  if (!input) return;
  if (input.value === value) return;
  input.value = value;
}
