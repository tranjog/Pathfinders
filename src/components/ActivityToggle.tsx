import type { ActivityType } from '../types';

interface ActivityToggleProps {
  activity: ActivityType;
  onChange: (activity: ActivityType) => void;
}

export default function ActivityToggle({ activity, onChange }: ActivityToggleProps) {
  return (
    <div className="activity-toggle">
      <button
        className={activity === 'cycling' ? 'active' : ''}
        onClick={() => onChange('cycling')}
      >
        🚴 Cycling
      </button>
      <button
        className={activity === 'running' ? 'active' : ''}
        onClick={() => onChange('running')}
      >
        🏃 Running
      </button>
    </div>
  );
}
