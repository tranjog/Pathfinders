import type { MoverState } from '@types';
import { PlayIcon, PauseIcon, SkipBackIcon, SkipForwardIcon } from '@assets';

interface MovementControlsProps {
  moverState: MoverState;
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

export default function MovementControls({
  moverState,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onSpeedChange,
}: MovementControlsProps) {
  const { isPlaying, currentIndex, points } = moverState;
  const total = points.length;
  const progress = total > 1 ? currentIndex / (total - 1) : 0;

  if (total === 0) return null;

  return (
    <div className="movement-controls">
      <button onClick={onPrev} disabled={currentIndex === 0} aria-label="Previous">
        <SkipBackIcon />
      </button>
      <button onClick={isPlaying ? onPause : onPlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button onClick={onNext} disabled={currentIndex >= total - 1} aria-label="Next">
        <SkipForwardIcon />
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
