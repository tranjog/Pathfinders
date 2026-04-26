import { useRef, useEffect, useCallback } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { LatLng } from '@types';
import { LocateIcon, MapPinIcon } from '@assets';
import { useRoutePlannerStore, MAX_STOPS } from '@store/routePlannerStore';

interface RoutePlannerProps {
  onRoute: (stops: LatLng[]) => void;
  onClear: () => void;
  loading: boolean;
  userLocation?: LatLng | null;
}

function stopLabel(index: number, total: number): string {
  if (index === 0) return 'Start';
  if (index === total - 1) return 'End';
  return `Stop ${index + 1}`;
}

function stopPlaceholder(index: number, total: number): string {
  if (index === 0) return 'Start location';
  if (index === total - 1) return 'End location';
  return `Stop ${index + 1}`;
}

export default function RoutePlanner({ onRoute, onClear, loading, userLocation }: RoutePlannerProps) {
  const placesLib = useMapsLibrary('places');
  const { stops, mapPickMode, setStop, addStop, removeStop, setMapPickMode, clear } = useRoutePlannerStore();

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const autoRefs = useRef<(google.maps.places.Autocomplete | null)[]>([]);

  // Grow/shrink ref arrays as stops change
  inputRefs.current = inputRefs.current.slice(0, stops.length);
  autoRefs.current = autoRefs.current.slice(0, stops.length);

  const initAutocomplete = useCallback((index: number) => {
    const input = inputRefs.current[index];
    if (!placesLib || !input || autoRefs.current[index]) return;

    const ac = new placesLib.Autocomplete(input, {
      fields: ['geometry'],
      componentRestrictions: { country: [] },
    });
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      const loc = place?.geometry?.location;
      if (loc) setStop(index, { lat: loc.lat(), lng: loc.lng() }, input.value);
    });
    autoRefs.current[index] = ac;
  }, [placesLib, setStop]);

  // Initialise autocomplete for any stop that doesn't have one yet
  useEffect(() => {
    if (!placesLib) return;
    stops.forEach((_, i) => initAutocomplete(i));
  }, [placesLib, stops, initAutocomplete]);

  // Sync input display values when labels are set externally (e.g. map click)
  useEffect(() => {
    stops.forEach((stop, i) => {
      const input = inputRefs.current[i];
      if (input && input.value !== stop.label) input.value = stop.label;
    });
  }, [stops]);

  const handleUseMyLocation = (index: number) => {
    if (!userLocation) return;
    setStop(index, userLocation, 'My Location');
  };

  const handleAddStop = () => {
    addStop();
    // Autocomplete for the new stop initialises on next render via the useEffect above
  };

  const handleRemoveStop = (index: number) => {
    autoRefs.current.splice(index, 1);
    removeStop(index);
  };

  const handleGo = () => {
    const filled = stops.map((s) => s.latLng).filter((ll): ll is LatLng => ll !== null);
    if (filled.length >= 2) onRoute(filled);
  };

  const handleClear = () => {
    autoRefs.current = [];
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
      <h3>Route Planner</h3>
      <div className="route-planner">
        <div className="stop-list">
          {stops.map((stop, i) => {
            const isFirst = i === 0;
            const isLast = i === stops.length - 1;
            const isPicking = mapPickMode === i;
            const isIntermediate = !isFirst && !isLast;

            return (
              <div key={i} className={`stop-row${isPicking ? ' stop-row--picking' : ''}`}>
                <span className="stop-badge">{isFirst ? 'A' : isLast ? String.fromCharCode(65 + stops.length - 1) : String.fromCharCode(65 + i)}</span>
                <div className="input-with-action">
                  <input
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    placeholder={stopPlaceholder(i, stops.length)}
                    onFocus={() => { if (stop.latLng && inputRefs.current[i]) inputRefs.current[i]!.value = stop.label; }}
                  />
                  <button
                    className={`btn-locate${isPicking ? ' btn-locate--active' : ''}`}
                    title="Pick on map"
                    onClick={() => togglePickMode(i)}
                  >
                    <MapPinIcon />
                  </button>
                  {userLocation && (
                    <button className="btn-locate" title="Use my location" onClick={() => handleUseMyLocation(i)}>
                      <LocateIcon />
                    </button>
                  )}
                </div>
                {isIntermediate && (
                  <button className="btn-remove-stop" title="Remove stop" onClick={() => handleRemoveStop(i)}>
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {stops.length < MAX_STOPS && (
          <button className="btn-add-stop" onClick={handleAddStop}>
            + Add stop
          </button>
        )}

        {pickingLabel && (
          <p className="pick-hint">Click on the map to set {pickingLabel}</p>
        )}

        <div className="route-actions">
          <button className="btn-go" onClick={handleGo} disabled={!allFilled || loading}>
            {loading ? 'Finding routes...' : 'Find Routes'}
          </button>
          <button className="btn-secondary" onClick={handleClear}>Clear</button>
        </div>
      </div>
    </div>
  );
}
