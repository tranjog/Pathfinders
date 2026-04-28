import { useCallback, useMemo } from 'react';
import type { PathSegment } from '@types';
import { computeHeading } from '@services/geometry';
import { useMapSessionStore } from '@store/mapSessionStore';

type CheckCoverage = (segment: PathSegment) => Promise<{ segment: PathSegment }>;

/**
 * Orchestrates browse-mode interactions: merges raw Overpass paths with the
 * locally-cached coverage results, exposes a click handler that toggles
 * selection / kicks off coverage checks, and a reset for activity changes.
 *
 * Selection, street-view target, and coverage cache live in `mapSessionStore`,
 * so consumer components (sidebar, overlays, panels) read directly from the
 * store rather than receiving them as props.
 */
export function useMapSession(rawSegments: PathSegment[], checkSegmentCoverage: CheckCoverage) {
  const checkedSegments = useMapSessionStore((s) => s.checkedSegments);
  const setSelectedSegment = useMapSessionStore((s) => s.setSelectedSegment);
  const setStreetView = useMapSessionStore((s) => s.setStreetView);
  const upsertCheckedSegment = useMapSessionStore((s) => s.upsertCheckedSegment);
  const resetStore = useMapSessionStore((s) => s.reset);

  const segments = useMemo(
    () => rawSegments.map((s) => checkedSegments[s.id] ?? s),
    [rawSegments, checkedSegments]
  );

  const handleSegmentClick = useCallback(
    async (segment: PathSegment, latLng: google.maps.LatLng) => {
      const { selectedSegment } = useMapSessionStore.getState();

      // Toggle off if clicking the already-selected segment.
      if (selectedSegment && selectedSegment.id === segment.id) {
        setSelectedSegment(null);
        setStreetView(null, 0);
        return;
      }

      const position = { lat: latLng.lat(), lng: latLng.lng() };
      let heading = 0;
      const pts = segment.points;
      if (pts.length >= 2) {
        let minDist = Infinity;
        let idx = 0;
        for (let i = 0; i < pts.length; i++) {
          const d = Math.abs(pts[i].lat - position.lat) + Math.abs(pts[i].lng - position.lng);
          if (d < minDist) { minDist = d; idx = i; }
        }
        const nextIdx = Math.min(idx + 1, pts.length - 1);
        if (idx !== nextIdx) {
          heading = computeHeading(pts[idx], pts[nextIdx]);
        }
      }

      setSelectedSegment(segment);
      setStreetView(position, heading);

      if (!segment.coverageChecked) {
        const result = await checkSegmentCoverage(segment);
        upsertCheckedSegment(result.segment);
      }
    },
    [checkSegmentCoverage, setSelectedSegment, setStreetView, upsertCheckedSegment]
  );

  return {
    segments,
    handleSegmentClick,
    reset: resetStore,
  };
}
