import { useEffect, useRef } from 'react';
import type { LatLng } from '@types';
import { PlayIcon, PauseIcon } from '@assets';

interface StreetViewPanelProps {
  position: LatLng | null;
  heading?: number;
  pitch?: number;
  isMoving?: boolean;
  isPlaying?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
}

export default function StreetViewPanel({
  position,
  heading = 0,
  pitch = 0,
  isMoving = false,
  isPlaying = false,
  onPlay,
  onPause,
}: StreetViewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);

  useEffect(() => {
    if (!containerRef.current || !position) return;

    if (!panoramaRef.current) {
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
      <div className="street-view-container">
        <div className="no-sv">Click a path to view Street View</div>
      </div>
    );
  }

  return (
    <div className="street-view-container">
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {isMoving && (
        <button
          className="sv-play-pause"
          onClick={isPlaying ? onPause : onPlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
      )}
    </div>
  );
}
