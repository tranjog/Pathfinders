import type { ActivityType } from '@types';
import { useActivityStore } from '@store/activityStore';
import { ACTIVITY } from '@constants';
import { CyclistIcon, RunnerIcon } from '@assets';

interface ActivityToggleProps {
  onChange: (activity: ActivityType) => void;
}

export default function ActivityToggle({ onChange }: ActivityToggleProps) {
  const { activity } = useActivityStore();

  return (
    <div className="activity-toggle">
      <button
        className={activity === ACTIVITY.CYCLING ? 'active' : ''}
        onClick={() => onChange(ACTIVITY.CYCLING)}
      >
        <CyclistIcon /> Cycling
      </button>
      <button
        className={activity === ACTIVITY.RUNNING ? 'active' : ''}
        onClick={() => onChange(ACTIVITY.RUNNING)}
      >
        <RunnerIcon /> Running
      </button>
    </div>
  );
}
