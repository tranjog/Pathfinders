import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { LatLng } from '@types';
import { SearchIcon, LocateIcon } from '@assets';
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
    if (inputRef.current) inputRef.current.value = 'My Location';
    inputRef.current?.blur();
  };
  const placesLib = useMapsLibrary('places');
  const inputRef = useRef<HTMLInputElement>(null);
  const autoRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!placesLib || !inputRef.current || autoRef.current) return;
    autoRef.current = new placesLib.Autocomplete(inputRef.current, {
      fields: ['geometry', 'name', 'formatted_address'],
    });
    autoRef.current.addListener('place_changed', () => {
      const place = autoRef.current?.getPlace();
      const loc = place?.geometry?.location;
      if (!loc) return;
      const center = { lat: loc.lat(), lng: loc.lng() };
      const viewport = place?.geometry?.viewport;
      onSelect({
        center,
        bounds: viewport ? viewport.toJSON() : undefined,
      });
      if (inputRef.current) inputRef.current.value = place?.name ?? place?.formatted_address ?? '';
      inputRef.current?.blur();
    });
  }, [placesLib, onSelect]);

  return (
    <div className={styles.locationSearch}>
      <SearchIcon className={styles.locationSearchIcon} />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search location"
        spellCheck={false}
      />
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
