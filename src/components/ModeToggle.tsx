import type { AppMode } from '../types';

interface ModeToggleProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="mode-toggle">
      <button
        className={mode === 'browse' ? 'active' : ''}
        onClick={() => onChange('browse')}
      >
        Browse
      </button>
      <button
        className={mode === 'route' ? 'active' : ''}
        onClick={() => onChange('route')}
      >
        Route
      </button>
    </div>
  );
}
