import { create } from 'zustand';
import { ACTIVITY, type ActivityType } from '@constants/activity';

interface ActivityState {
  activity: ActivityType;
  setActivity: (activity: ActivityType) => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  activity: ACTIVITY.CYCLING,
  setActivity: (activity) => set({ activity }),
}));
