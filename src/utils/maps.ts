// Inject a <style> into gmp-place-autocomplete's shadow root to suppress
// Google's built-in container chrome (background, border, focus ring).
// CSS custom properties like --accent cascade in from the document, so
// our external themed styles remain in control of focus indicators.
export function suppressAutocompleteShadowChrome(
  element: google.maps.places.PlaceAutocompleteElement,
): void {
  requestAnimationFrame(() => {
    const root = element.shadowRoot;
    if (!root || root.querySelector('[data-pf-style]')) return;
    const style = document.createElement('style');
    style.setAttribute('data-pf-style', '');
    style.textContent = `
      :host {
        background: transparent !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
      }
      :host(:focus-within) {
        outline: none !important;
        box-shadow: none !important;
      }
      :host > :first-child {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
      }
      [part="input"] {
        outline: none !important;
        box-shadow: none !important;
      }
    `;
    root.appendChild(style);
  });
}
