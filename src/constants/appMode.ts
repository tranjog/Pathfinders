export const APP_MODE = {
  BROWSE: 'browse',
  ROUTE: 'route',
} as const;

export type AppMode = typeof APP_MODE[keyof typeof APP_MODE];
