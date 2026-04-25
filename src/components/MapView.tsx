import { useEffect, useRef } from 'react';
import { Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../constants';
import type { LatLng } from '../types';

interface MapViewProps {
  children?: React.ReactNode;
  userLocation?: LatLng | null;
}

export default function MapView({ children, userLocation }: MapViewProps) {
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

  return (
    <Map
      defaultCenter={DEFAULT_CENTER}
      defaultZoom={DEFAULT_ZOOM}
      gestureHandling="greedy"
      disableDefaultUI={false}
      mapId="cyclable-view-map"
    >
      {children}
    </Map>
  );
}
