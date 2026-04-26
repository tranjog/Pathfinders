import { useEffect, useRef } from 'react';
import type { LatLng } from '@types';

interface StreetViewPanelProps {
  position: LatLng | null;
  heading?: number;
  pitch?: number;
}

export default function StreetViewPanel({ position, heading = 0, pitch = 0 }: StreetViewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const panoramaContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || !position) return;

    const stale = panoramaRef.current && panoramaContainerRef.current !== containerRef.current;
    if (!panoramaRef.current || stale) {
      panoramaContainerRef.current = containerRef.current;
      panoramaRef.current = new google.maps.StreetViewPanorama(containerRef.current, {
        position: { lat: position.lat, lng: position.lng },
        pov: { heading, pitch },
        addressControl: false,
        fullscreenControl: true,
        motionTracking: false,
        linksControl: false,
      });
    } else {
      panoramaRef.current.setPosition({ lat: position.lat, lng: position.lng });
      panoramaRef.current.setPov({ heading, pitch });
    }
  }, [position, heading, pitch]);

  if (!position) {
    return (
      <p className="no-sv-hint">Click a path to view Street View</p>
    );
  }

  return (
    <div className="street-view-container">
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
