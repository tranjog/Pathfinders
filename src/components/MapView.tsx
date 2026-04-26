import { useEffect, useRef, useCallback } from 'react';
import { Map, useMap, useMapsLibrary, AdvancedMarker, type MapMouseEvent } from '@vis.gl/react-google-maps';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@constants';
import type { LatLng } from '@types';
import type { SearchTarget } from './LocationSearch';
import { useRoutePlannerStore } from '@store/routePlannerStore';
import { reverseGeocode } from '@services/geocoder';

interface MapViewProps {
  children?: React.ReactNode;
  userLocation?: LatLng | null;
  searchTarget?: SearchTarget | null;
  isRouteMode?: boolean;
}

export default function MapView({ children, userLocation, searchTarget, isRouteMode = false }: MapViewProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const bicyclingLayerRef = useRef<google.maps.BicyclingLayer | null>(null);
  const hasCenteredRef = useRef(false);

  const { stops, mapPickMode, setStop, setMapPickMode } = useRoutePlannerStore();

  useEffect(() => {
    if (!map || !mapsLib) return;
    if (!bicyclingLayerRef.current) {
      bicyclingLayerRef.current = new mapsLib.BicyclingLayer();
    }
    bicyclingLayerRef.current.setMap(map);
    return () => {
      bicyclingLayerRef.current?.setMap(null);
    };
  }, [map, mapsLib]);

  useEffect(() => {
    if (!map || !userLocation || hasCenteredRef.current) return;
    map.panTo({ lat: userLocation.lat, lng: userLocation.lng });
    map.setZoom(DEFAULT_ZOOM);
    hasCenteredRef.current = true;
  }, [map, userLocation]);

  useEffect(() => {
    if (!map || !searchTarget) return;
    hasCenteredRef.current = true;
    if (searchTarget.bounds) {
      map.fitBounds(searchTarget.bounds);
    } else {
      map.panTo(searchTarget.center);
      map.setZoom(DEFAULT_ZOOM);
    }
  }, [map, searchTarget]);

  const handleMapClick = useCallback(async (e: MapMouseEvent) => {
    if (mapPickMode === null || !e.detail.latLng) return;
    const latLng: LatLng = { lat: e.detail.latLng.lat, lng: e.detail.latLng.lng };
    const label = await reverseGeocode(latLng);
    setStop(mapPickMode, latLng, label);
    setMapPickMode(null);
  }, [mapPickMode, setStop, setMapPickMode]);

  return (
    <>
      <Map
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapId="cyclable-view-map"
        draggableCursor={mapPickMode !== null ? 'crosshair' : undefined}
        onClick={handleMapClick}
      >
        {children}
        {isRouteMode && stops.map((stop, i) =>
          stop.latLng ? (
            <AdvancedMarker key={i} position={stop.latLng}>
              <div className={`route-marker route-marker--${i === 0 ? 'origin' : i === stops.length - 1 ? 'destination' : 'waypoint'}`}>
                <span>{String.fromCharCode(65 + i)}</span>
              </div>
            </AdvancedMarker>
          ) : null
        )}
      </Map>
      <div className="osm-attribution">
        Cycleway data ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>{' '}
        contributors
      </div>
    </>
  );
}
