import { useEffect, useRef } from 'react';
import { useStreetViewPlaybackStore } from '@store/streetViewPlaybackStore';
import { useMapSessionStore } from '@store/mapSessionStore';
import styles from './StreetViewPanel.module.css';

interface StreetViewPanelProps {
  pitch?: number;
}

export default function StreetViewPanel({ pitch = 0 }: StreetViewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const panoramaContainerRef = useRef<HTMLDivElement | null>(null);

  // Compose effective Street View target: playback movement takes precedence
  // over the static segment-click position from the map session.
  const moverPoints = useStreetViewPlaybackStore((s) => s.points);
  const moverIndex = useStreetViewPlaybackStore((s) => s.currentIndex);
  const moverHeading = useStreetViewPlaybackStore((s) => s.heading);
  const sessionPosition = useMapSessionStore((s) => s.streetViewPosition);
  const sessionHeading = useMapSessionStore((s) => s.streetViewHeading);

  const isMoving = moverPoints.length > 0;
  const position = isMoving ? moverPoints[moverIndex] : sessionPosition;
  const heading = isMoving ? moverHeading : sessionHeading;

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
      <p className={styles.noSvHint}>Click a path to view Street View</p>
    );
  }

  return (
    <div className={styles.streetViewContainer}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
