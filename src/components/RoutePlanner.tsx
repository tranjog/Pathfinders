import { useState, useRef, useEffect } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { LatLng } from '../types';
import { LocateIcon } from '../assets';

interface RoutePlannerProps {
  onRoute: (origin: LatLng, destination: LatLng) => void;
  onClear: () => void;
  loading: boolean;
  userLocation?: LatLng | null;
}

export default function RoutePlanner({ onRoute, onClear, loading, userLocation }: RoutePlannerProps) {
  const placesLib = useMapsLibrary('places');
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const originInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);
  const originAutoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destAutoRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!placesLib || !originInputRef.current || !destInputRef.current) return;

    if (!originAutoRef.current) {
      originAutoRef.current = new placesLib.Autocomplete(originInputRef.current, {
        fields: ['geometry'],
        componentRestrictions: { country: [] },
      });
      originAutoRef.current.addListener('place_changed', () => {
        const place = originAutoRef.current?.getPlace();
        const loc = place?.geometry?.location;
        if (loc) setOrigin({ lat: loc.lat(), lng: loc.lng() });
      });
    }

    if (!destAutoRef.current) {
      destAutoRef.current = new placesLib.Autocomplete(destInputRef.current, {
        fields: ['geometry'],
        componentRestrictions: { country: [] },
      });
      destAutoRef.current.addListener('place_changed', () => {
        const place = destAutoRef.current?.getPlace();
        const loc = place?.geometry?.location;
        if (loc) setDestination({ lat: loc.lat(), lng: loc.lng() });
      });
    }
  }, [placesLib]);

  const handleUseMyLocation = (target: 'origin' | 'destination') => {
    if (!userLocation) return;
    if (target === 'origin') {
      setOrigin(userLocation);
      if (originInputRef.current) originInputRef.current.value = 'My Location';
    } else {
      setDestination(userLocation);
      if (destInputRef.current) destInputRef.current.value = 'My Location';
    }
  };

  const handleGo = () => {
    if (origin && destination) {
      onRoute(origin, destination);
    }
  };

  const handleClear = () => {
    setOrigin(null);
    setDestination(null);
    if (originInputRef.current) originInputRef.current.value = '';
    if (destInputRef.current) destInputRef.current.value = '';
    onClear();
  };

  return (
    <div className="panel-section">
      <h3>Route Planner</h3>
      <div className="route-planner">
        <div className="input-with-action">
          <input
            ref={originInputRef}
            type="text"
            placeholder="Start location"
          />
          {userLocation && (
            <button
              className="btn-locate"
              title="Use my location"
              onClick={() => handleUseMyLocation('origin')}
            >
              <LocateIcon />
            </button>
          )}
        </div>
        <div className="input-with-action">
          <input
            ref={destInputRef}
            type="text"
            placeholder="End location"
          />
          {userLocation && (
            <button
              className="btn-locate"
              title="Use my location"
              onClick={() => handleUseMyLocation('destination')}
            >
              <LocateIcon />
            </button>
          )}
        </div>
        <div className="route-actions">
          <button
            className="btn-go"
            onClick={handleGo}
            disabled={!origin || !destination || loading}
          >
            {loading ? 'Finding routes...' : 'Find Routes'}
          </button>
          <button className="btn-secondary" onClick={handleClear}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
