import { create } from 'zustand';
import type { LatLng, PathSegment } from '@types';

interface MapSessionState {
  selectedSegment: PathSegment | null;
  streetViewPosition: LatLng | null;
  streetViewHeading: number;
  // Per-segment coverage results, keyed by segment id.
  checkedSegments: Record<number, PathSegment>;

  setSelectedSegment: (segment: PathSegment | null) => void;
  setStreetView: (position: LatLng | null, heading?: number) => void;
  upsertCheckedSegment: (segment: PathSegment) => void;
  reset: () => void;
}

export const useMapSessionStore = create<MapSessionState>((set) => ({
  selectedSegment: null,
  streetViewPosition: null,
  streetViewHeading: 0,
  checkedSegments: {},

  setSelectedSegment(segment) {
    set({ selectedSegment: segment });
  },

  setStreetView(position, heading) {
    set((prev) => ({
      streetViewPosition: position,
      streetViewHeading: heading ?? (position == null ? 0 : prev.streetViewHeading),
    }));
  },

  upsertCheckedSegment(segment) {
    set((prev) => ({
      checkedSegments: { ...prev.checkedSegments, [segment.id]: segment },
      // Keep the displayed selection in sync if it refers to this segment.
      selectedSegment:
        prev.selectedSegment && prev.selectedSegment.id === segment.id
          ? segment
          : prev.selectedSegment,
    }));
  },

  reset() {
    set({
      selectedSegment: null,
      streetViewPosition: null,
      streetViewHeading: 0,
      checkedSegments: {},
    });
  },
}));
