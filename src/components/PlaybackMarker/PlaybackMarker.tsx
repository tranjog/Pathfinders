import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { useStreetViewPlaybackStore } from '@store/streetViewPlaybackStore';
import { useActivityStore } from '@store/activityStore';
import { ACTIVITY } from '@constants/activity';
import { RunnerIcon, CyclistIcon } from '@assets';
import styles from './PlaybackMarker.module.css';

export default function PlaybackMarker() {
  const { points, currentIndex } = useStreetViewPlaybackStore();
  const { activity } = useActivityStore();

  if (points.length === 0) return null;

  const position = points[currentIndex];
  const Icon = activity === ACTIVITY.RUNNING ? RunnerIcon : CyclistIcon;

  return (
    <AdvancedMarker position={position} zIndex={100}>
      <div className={styles.playbackMarker}>
        <Icon width={22} height={22} className={styles.playbackMarkerIcon} />
      </div>
    </AdvancedMarker>
  );
}
