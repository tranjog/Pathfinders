import { useRef, useEffect, useCallback } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { LatLng } from '@types';
import { LocateIcon, MapPinIcon } from '@assets';
import { useRoutePlannerStore, MAX_STOPS } from '@store/routePlannerStore';
import { useUserLocationStore } from '@store/userLocationStore';
import styles from './RoutePlanner.module.css';

interface RoutePlannerProps {
  onRoute: (stops: LatLng[]) => void;
  onClear: () => void;
  loading: boolean;
  open: boolean;
  onToggle: () => void;
}

function stopLabel(index: number, total: number): string {
  if (index === 0) return 'Start';
  if (index === total - 1) return 'End';
  return `Stop ${index + 1}`;
}

export default function RoutePlanner({ onRoute, onClear, loading, open, onToggle }: RoutePlannerProps) {
  const placesLib = useMapsLibrary('places');
  const { stops, mapPickMode, setStop, addStop, removeStop, setMapPickMode, clear } = useRoutePlannerStore();
  const { userLocation } = useUserLocationStore();

  const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const elementRefs = useRef<(google.maps.places.PlaceAutocompleteElement | null)[]>([]);

  // Keep ref arrays in sync with stops length
  containerRefs.current = containerRefs.current.slice(0, stops.length);
  elementRefs.current = elementRefs.current.slice(0, stops.length);

  const initAutocomplete = useCallback((index: number) => {
    const container = containerRefs.current[index];
    if (!placesLib || !container || elementRefs.current[index]) return;

    const element = new placesLib.PlaceAutocompleteElement({});
    container.appendChild(element);
    elementRefs.current[index] = element;

    element.addEventListener('gmp-select', async (event) => {
      const prediction = (event as google.maps.places.PlacePredictionSelectEvent).placePrediction;
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ['location', 'displayName', 'formattedAddress'] });
      const loc = place.location;
      if (!loc) return;
      // Resolve current index dynamically so it stays correct after stops are added/removed
      const currentIndex = elementRefs.current.indexOf(element);
      if (currentIndex === -1) return;
      setStop(currentIndex, { lat: loc.lat(), lng: loc.lng() }, place.displayName ?? place.formattedAddress ?? '');
    });
  }, [placesLib, setStop]);

  useEffect(() => {
    if (!placesLib) return;
    stops.forEach((_, i) => initAutocomplete(i));
  }, [placesLib, stops, initAutocomplete]);

  // Sync display value when a stop is set externally (map click, "My Location")
  useEffect(() => {
    stops.forEach((stop, i) => {
      const shadowInput = elementRefs.current[i]?.shadowRoot?.querySelector('input');
      if (shadowInput && shadowInput.value !== stop.label) shadowInput.value = stop.label;
    });
  }, [stops]);

  const handleUseMyLocation = (index: number) => {
    if (!userLocation) return;
    setStop(index, userLocation, 'My Location');
  };

  const handleRemoveStop = (index: number) => {
    const element = elementRefs.current[index];
    const container = containerRefs.current[index];
    if (element && container && container.contains(element)) container.removeChild(element);
    elementRefs.current.splice(index, 1);
    containerRefs.current.splice(index, 1);
    removeStop(index);
  };

  const handleGo = () => {
    const filled = stops.map((s) => s.latLng).filter((ll): ll is LatLng => ll !== null);
    if (filled.length >= 2) onRoute(filled);
  };

  const handleClear = () => {
    elementRefs.current.forEach((element, i) => {
      const container = containerRefs.current[i];
      if (element && container && container.contains(element)) container.removeChild(element);
    });
    elementRefs.current = [];
    containerRefs.current = [];
    clear();
    onClear();
  };

  const togglePickMode = (index: number) => {
    setMapPickMode(mapPickMode === index ? null : index);
  };

  const allFilled = stops.every((s) => s.latLng !== null);
  const pickingLabel = mapPickMode !== null ? stopLabel(mapPickMode, stops.length) : null;

  return (
    <div className="panel-section">
      <div className={styles.sectionHeader} onClick={onToggle}>
        <h3>Route Planner</h3>
        <svg
          className={`${styles.chevron}${open ? ` ${styles.chevronOpen}` : ''}`}
          width="16" height="8" viewBox="0 0 18 10"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="1,1 9,9 17,1" />
        </svg>
      </div>
      <div className={`${styles.sectionBody}${open ? '' : ` ${styles.sectionBodyCollapsed}`}`}>
        <div className={styles.routePlanner}>
          <div className={styles.stopList}>
            {stops.map((stop, i) => {
              const isFirst = i === 0;
              const isLast = i === stops.length - 1;
              const isPicking = mapPickMode === i;
              const isIntermediate = !isFirst && !isLast;

              return (
                <div key={i} className={`${styles.stopRow}${isPicking ? ` ${styles.stopRowPicking}` : ''}`}>
                  <span className={styles.stopBadge}>{isFirst ? 'A' : isLast ? String.fromCharCode(65 + stops.length - 1) : String.fromCharCode(65 + i)}</span>
                  <div className={styles.inputWithAction}>
                    <div
                      ref={(el) => { containerRefs.current[i] = el; }}
                      className={styles.stopInputContainer}
                    />
                    <button
                      className={`${styles.btnLocate}${isPicking ? ` ${styles.btnLocateActive}` : ''}`}
                      title="Pick on map"
                      onClick={() => togglePickMode(i)}
                    >
                      <MapPinIcon />
                    </button>
                    {userLocation && (
                      <button className={styles.btnLocate} title="Use my location" onClick={() => handleUseMyLocation(i)}>
                        <LocateIcon />
                      </button>
                    )}
                  </div>
                  {isIntermediate && (
                    <button className={styles.btnRemoveStop} title="Remove stop" onClick={() => handleRemoveStop(i)}>
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {stops.length < MAX_STOPS && (
            <button className={styles.btnAddStop} onClick={addStop}>
              + Add stop
            </button>
          )}

          {pickingLabel && (
            <p className={styles.pickHint}>Click on the map to set {pickingLabel}</p>
          )}

          <div className={styles.routeActions}>
            <button className="btn-go" onClick={handleGo} disabled={!allFilled || loading}>
              {loading ? 'Finding routes...' : 'Find Routes'}
            </button>
            <button className={styles.clearBtn} onClick={handleClear}>Clear</button>
          </div>
        </div>
      </div>
    </div>
  );
}
