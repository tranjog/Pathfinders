import type { AppMode } from '@types';
import { APP_MODE } from '@constants';

interface ModeToggleProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="mode-toggle">
      <button
        className={mode === APP_MODE.ROUTE ? 'active' : ''}
        onClick={() => onChange(APP_MODE.ROUTE)}
      >
        Route
      </button>
      <button
        className={mode === APP_MODE.BROWSE ? 'active' : ''}
        onClick={() => onChange(APP_MODE.BROWSE)}
      >
        Browse
      </button>
    </div>
  );
}
