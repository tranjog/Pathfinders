import { create } from 'zustand';
import { ACTIVITY } from '@constants';
import type { ActivityType } from '@types';

interface ActivityState {
  activity: ActivityType;
  setActivity: (activity: ActivityType) => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  activity: ACTIVITY.CYCLING,
  setActivity: (activity) => set({ activity }),
}));
