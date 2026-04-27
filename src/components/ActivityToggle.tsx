import type { ActivityType } from '@types';
import { useActivityStore } from '@store/activityStore';
import { ACTIVITY } from '@constants';
import { CyclistIcon, RunnerIcon } from '@assets';
import styles from './ActivityToggle.module.css';

interface ActivityToggleProps {
  onChange: (activity: ActivityType) => void;
}

export default function ActivityToggle({ onChange }: ActivityToggleProps) {
  const { activity } = useActivityStore();

  return (
    <div className={styles.activityToggle}>
      <button
        className={activity === ACTIVITY.CYCLING ? styles.active : ''}
        onClick={() => onChange(ACTIVITY.CYCLING)}
      >
        <CyclistIcon /> Cycling
      </button>
      <button
        className={activity === ACTIVITY.RUNNING ? styles.active : ''}
        onClick={() => onChange(ACTIVITY.RUNNING)}
      >
        <RunnerIcon /> Running
      </button>
    </div>
  );
}
