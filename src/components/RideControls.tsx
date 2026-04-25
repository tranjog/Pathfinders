import type { RiderState } from '../types';

interface RideControlsProps {
  riderState: RiderState;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSpeedChange: (ms: number) => void;
}

const SPEEDS = [
  { label: '0.5x', ms: 4000 },
  { label: '1x', ms: 2000 },
  { label: '2x', ms: 1000 },
  { label: '4x', ms: 500 },
];

export default function RideControls({
  riderState,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onSpeedChange,
}: RideControlsProps) {
  const { isPlaying, currentIndex, points } = riderState;
  const total = points.length;
  const progress = total > 1 ? currentIndex / (total - 1) : 0;

  if (total === 0) return null;

  return (
    <div className="ride-controls">
      <button onClick={onPrev} disabled={currentIndex === 0}>
        &#9664;&#9664;
      </button>
      <button onClick={isPlaying ? onPause : onPlay}>
        {isPlaying ? '&#10074;&#10074;' : '&#9654;'}
      </button>
      <button onClick={onNext} disabled={currentIndex >= total - 1}>
        &#9654;&#9654;
      </button>
      <div className="progress">
        <div
          className="progress-bar"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span className="progress-text">
        {currentIndex + 1} / {total}
      </span>
      <select
        defaultValue="2000"
        onChange={(e) => onSpeedChange(Number(e.target.value))}
        style={{
          background: 'var(--bg-panel)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '4px 6px',
          fontSize: 12,
        }}
      >
        {SPEEDS.map(s => (
          <option key={s.ms} value={s.ms}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}
