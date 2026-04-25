import { useEffect, useRef } from 'react';
import { Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@constants';
import type { LatLng } from '@types';
import type { SearchTarget } from './LocationSearch';

interface MapViewProps {
  children?: React.ReactNode;
  userLocation?: LatLng | null;
  searchTarget?: SearchTarget | null;
}

export default function MapView({ children, userLocation, searchTarget }: MapViewProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const bicyclingLayerRef = useRef<google.maps.BicyclingLayer | null>(null);
  const hasCenteredRef = useRef(false);

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

  // Center on user location once when first available
  useEffect(() => {
    if (!map || !userLocation || hasCenteredRef.current) return;
    map.panTo({ lat: userLocation.lat, lng: userLocation.lng });
    map.setZoom(DEFAULT_ZOOM);
    hasCenteredRef.current = true;
  }, [map, userLocation]);

  // Move map when user picks a search result
  useEffect(() => {
    if (!map || !searchTarget) return;
    hasCenteredRef.current = true; // suppress later user-location auto-center
    if (searchTarget.bounds) {
      map.fitBounds(searchTarget.bounds);
    } else {
      map.panTo(searchTarget.center);
      map.setZoom(DEFAULT_ZOOM);
    }
  }, [map, searchTarget]);

  return (
    <>
      <Map
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapId="cyclable-view-map"
      >
        {children}
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
