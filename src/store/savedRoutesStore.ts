import { create } from 'zustand';
import type { SavedRoute, SavedRouteData, Stop } from '@types';
import type { ActivityType } from '@constants/activity';
import { loadAll, saveAll } from '@services/savedRoutes';

interface SavedRoutesState {
  routes: SavedRoute[];
  save: (name: string, activity: ActivityType, stops: Stop[], route: SavedRouteData) => void;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
}

function persist(routes: SavedRoute[]): SavedRoute[] {
  saveAll(routes);
  return routes;
}

export const useSavedRoutesStore = create<SavedRoutesState>((set) => ({
  routes: loadAll(),

  save: (name, activity, stops, route) =>
    set((state) => ({
      routes: persist([
        {
          id:
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: name.trim(),
          activity,
          stops: stops.map((s) => ({ latLng: s.latLng, label: s.label })),
          route: {
            polyline: route.polyline.map((p) => ({ lat: p.lat, lng: p.lng })),
            sampledPoints: route.sampledPoints.map((p) => ({ lat: p.lat, lng: p.lng })),
            distance: route.distance,
            duration: route.duration,
          },
          createdAt: Date.now(),
        },
        ...state.routes,
      ]),
    })),

  remove: (id) =>
    set((state) => ({ routes: persist(state.routes.filter((r) => r.id !== id)) })),

  rename: (id, name) =>
    set((state) => ({
      routes: persist(
        state.routes.map((r) => (r.id === id ? { ...r, name: name.trim() } : r))
      ),
    })),
}));
