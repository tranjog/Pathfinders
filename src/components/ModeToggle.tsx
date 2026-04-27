import type { AppMode } from '@types';
import { APP_MODE } from '@constants';
import styles from './ModeToggle.module.css';

interface ModeToggleProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className={styles.modeToggle}>
      <button
        className={mode === APP_MODE.ROUTE ? styles.active : ''}
        onClick={() => onChange(APP_MODE.ROUTE)}
      >
        Route
      </button>
      <button
        className={mode === APP_MODE.BROWSE ? styles.active : ''}
        onClick={() => onChange(APP_MODE.BROWSE)}
      >
        Browse
      </button>
    </div>
  );
}
