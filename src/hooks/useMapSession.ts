import { useCallback, useState } from 'react';
import type { PathSegment, LatLng } from '@types';
import { computeHeading } from '@services/geometry';

type CheckCoverage = (segment: PathSegment) => Promise<{ segment: PathSegment }>;

export function useMapSession(rawSegments: PathSegment[], checkSegmentCoverage: CheckCoverage) {
  const [selectedSegment, setSelectedSegment] = useState<PathSegment | null>(null);
  const [streetViewPosition, setStreetViewPosition] = useState<LatLng | null>(null);
  const [streetViewHeading, setStreetViewHeading] = useState(0);
  const [checkedSegments, setCheckedSegments] = useState<Map<number, PathSegment>>(new Map());

  const segments = rawSegments.map(s => checkedSegments.get(s.id) ?? s);

  const handleSegmentClick = useCallback(
    async (segment: PathSegment, latLng: google.maps.LatLng) => {
      const position = { lat: latLng.lat(), lng: latLng.lng() };
      setStreetViewPosition(position);
      setSelectedSegment(segment);

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
          setStreetViewHeading(computeHeading(pts[idx], pts[nextIdx]));
        }
      }

      if (!segment.coverageChecked) {
        const result = await checkSegmentCoverage(segment);
        setCheckedSegments(prev => {
          const updated = new Map(prev);
          updated.set(segment.id, result.segment);
          return updated;
        });
        setSelectedSegment(result.segment);
      }
    },
    [checkSegmentCoverage]
  );

  const reset = useCallback(() => {
    setSelectedSegment(null);
    setStreetViewPosition(null);
    setStreetViewHeading(0);
    setCheckedSegments(new Map());
  }, []);

  return {
    segments,
    selectedSegment,
    streetViewPosition,
    streetViewHeading,
    handleSegmentClick,
    reset,
  };
}
