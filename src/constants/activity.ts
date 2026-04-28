export const ACTIVITY = {
  CYCLING: 'cycling',
  RUNNING: 'running',
} as const;

export type ActivityType = typeof ACTIVITY[keyof typeof ACTIVITY];
