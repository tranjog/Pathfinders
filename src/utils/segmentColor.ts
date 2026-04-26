import type { PathSegment } from '@types';

const COLOR_UNKNOWN = '#888888';
const COLOR_GOOD = '#4caf50';
const COLOR_PARTIAL = '#ff9800';
const COLOR_NONE = '#f44336';

export function getSegmentColor(segment: PathSegment): string {
  if (!segment.coverageChecked) return COLOR_UNKNOWN;
  if (segment.coverageRatio == null) return COLOR_UNKNOWN;
  if (segment.coverageRatio > 0.5) return COLOR_GOOD;
  if (segment.coverageRatio > 0) return COLOR_PARTIAL;
  return COLOR_NONE;
}
