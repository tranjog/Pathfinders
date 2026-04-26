import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { useStreetViewPlaybackStore } from '@store/streetViewPlaybackStore';
import { useActivityStore } from '@store/activityStore';
import { ACTIVITY } from '@constants';
import { RunnerIcon, CyclistIcon } from '@assets';

export default function PlaybackMarker() {
  const { points, currentIndex } = useStreetViewPlaybackStore();
  const { activity } = useActivityStore();

  if (points.length === 0) return null;

  const position = points[currentIndex];
  const Icon = activity === ACTIVITY.RUNNING ? RunnerIcon : CyclistIcon;

  return (
    <AdvancedMarker position={position} zIndex={100}>
      <div className="playback-marker">
        <Icon width={22} height={22} className="playback-marker__icon" />
      </div>
    </AdvancedMarker>
  );
}
