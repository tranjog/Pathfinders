# constants/

- **No `index.ts` barrel.** Each callsite imports the specific file it needs.
- Enum constants colocated with their derived TypeScript type:

  ```ts
  export const ACTIVITY = { CYCLING: 'cycling', RUNNING: 'running' } as const;
  export type ActivityType = typeof ACTIVITY[keyof typeof ACTIVITY];
  ```

- Numeric tuning constants (intervals, debounce, defaults) live in `tuning.ts`.
- Per-activity config (Overpass query, travel mode, copy) lives in `activityConfig.ts`.
