import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { LatLng } from '@types';
import { LocateIcon } from '@assets';
import { isMac, isTauri } from '@utils/platform';
import { useUserLocationStore } from '@store/userLocationStore';
import styles from './LocationSearch.module.css';

export type SearchTarget = {
  center: LatLng;
  bounds?: google.maps.LatLngBoundsLiteral;
};

interface Props {
  onSelect: (target: SearchTarget) => void;
}

export default function LocationSearch({ onSelect }: Props) {
  const { userLocation, requestLocation } = useUserLocationStore();
  const [locating, setLocating] = useState(false);
  const [showError, setShowError] = useState(false);

  const placesLib = useMapsLibrary('places');
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const handleLocate = async () => {
    let loc = userLocation ?? null;
    if (!loc) {
      setLocating(true);
      try { loc = await requestLocation(); } finally { setLocating(false); }
    }
    if (!loc) {
      setShowError(true);
      return;
    }
    onSelect({ center: loc });
    const shadowInput = elementRef.current?.shadowRoot?.querySelector('input');
    if (shadowInput) shadowInput.value = 'My Location';
    elementRef.current?.blur();
  };

  useEffect(() => {
    if (!placesLib || !containerRef.current || elementRef.current) return;

    const element = new placesLib.PlaceAutocompleteElement({});
    containerRef.current.appendChild(element);
    elementRef.current = element;

    element.addEventListener('gmp-select', async (event) => {
      const prediction = (event as google.maps.places.PlacePredictionSelectEvent).placePrediction;
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ['location', 'viewport', 'displayName', 'formattedAddress'] });
      const loc = place.location;
      if (!loc) return;
      const center = { lat: loc.lat(), lng: loc.lng() };
      onSelectRef.current({
        center,
        bounds: place.viewport ? place.viewport.toJSON() : undefined,
      });
    });

    return () => {
      if (containerRef.current && elementRef.current) {
        containerRef.current.removeChild(elementRef.current);
      }
      elementRef.current = null;
    };
  }, [placesLib]);

  return (
    <div className={styles.locationSearch}>
      <div ref={containerRef} className={styles.locationSearchInput} />
      <button
        type="button"
        className={styles.locationSearchLocate}
        title="Use my location"
        aria-label="Use my location"
        onClick={handleLocate}
        disabled={locating}
      >
        <LocateIcon width={14} height={14} />
      </button>
      {showError && (
        <LocationErrorModal onClose={() => setShowError(false)} onRetry={handleLocate} />
      )}
    </div>
  );
}

function LocationErrorModal({ onClose, onRetry }: { onClose: () => void; onRetry: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Location unavailable</h2>
        <p className="modal-body">
          Pathfinders couldn't get your location. The OS or browser may have denied permission.
        </p>
        {isTauri && isMac && (
          <p className="modal-body">
            <strong>macOS:</strong> open <em>System Settings → Privacy & Security → Location Services</em>,
            enable Location Services, then enable <em>Pathfinders</em> in the list.
            Quit and relaunch the app afterwards.
          </p>
        )}
        {!isTauri && (
          <p className="modal-body">
            <strong>Browser:</strong> click the location icon in the address bar and allow access, then retry.
          </p>
        )}
        <div className="modal-actions">
          <div style={{ flex: 1 }} />
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={() => { onClose(); onRetry(); }}>Retry</button>
        </div>
      </div>
    </div>
  );
}
