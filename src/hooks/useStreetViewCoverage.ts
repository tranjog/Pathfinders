import { useState, useCallback, useRef } from 'react';
import type { PathSegment, LatLng } from '@types';
import { samplePointsAlongPath } from '@services/geometry';
import { checkCoverageAtPoints } from '@services/streetview';
import { SV_SAMPLE_INTERVAL_METERS } from '@constants';

interface CoverageResult {
  segment: PathSegment;
  coverage: boolean[];
  sampledPoints: LatLng[];
  ratio: number;
}

interface UseStreetViewCoverageReturn {
  checkSegmentCoverage: (segment: PathSegment) => Promise<CoverageResult>;
  checking: boolean;
  progress: number;
}

export function useStreetViewCoverage(): UseStreetViewCoverageReturn {
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef(false);

  const checkSegmentCoverage = useCallback(async (segment: PathSegment): Promise<CoverageResult> => {
    abortRef.current = false;
    setChecking(true);
    setProgress(0);

    const sampledPoints = samplePointsAlongPath(segment.points, SV_SAMPLE_INTERVAL_METERS);
    const coverage = await checkCoverageAtPoints(sampledPoints, (checked, total) => {
      setProgress(checked / total);
    });

    const covered = coverage.filter(Boolean).length;
    const ratio = sampledPoints.length > 0 ? covered / sampledPoints.length : 0;

    setChecking(false);
    setProgress(1);

    return {
      segment: { ...segment, coverageRatio: ratio, coverageChecked: true },
      coverage,
      sampledPoints,
      ratio,
    };
  }, []);

  return { checkSegmentCoverage, checking, progress };
}
