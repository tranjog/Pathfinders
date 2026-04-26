import { useStreetViewPlaybackStore } from '@store/streetViewPlaybackStore';
import { PlayIcon, PauseIcon, SkipBackIcon, SkipForwardIcon } from '@assets';

const SPEEDS = [
  { label: '0.5x', ms: 4000 },
  { label: '1x', ms: 2000 },
  { label: '2x', ms: 1000 },
  { label: '4x', ms: 500 },
];

export default function MovementControls() {
  const { isPlaying, currentIndex, points, play, pause, next, prev, setSpeed } =
    useStreetViewPlaybackStore();

  const total = points.length;
  const progress = total > 1 ? currentIndex / (total - 1) : 0;

  if (total === 0) return null;

  return (
    <div className="movement-controls">
      <button onClick={prev} disabled={currentIndex === 0} aria-label="Previous">
        <SkipBackIcon />
      </button>
      <button onClick={isPlaying ? pause : play} aria-label={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button onClick={next} disabled={currentIndex >= total - 1} aria-label="Next">
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
        onChange={(e) => setSpeed(Number(e.target.value))}
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
