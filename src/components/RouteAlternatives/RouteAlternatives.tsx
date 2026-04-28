import type { LatLng, Stop } from '@types';
import type { ActivityConfig } from '@types';
import type { ActivityType } from '@constants/activity';
import { useDirectionsStore } from '@store/directionsStore';
import SaveRouteAction from '@components/SaveRouteAction';
import ExportRouteAction from '@components/ExportRouteAction';
import styles from './RouteAlternatives.module.css';

interface RouteAlternativesProps {
  stops: Stop[];
  activity: ActivityType;
  config: ActivityConfig;
  onStart: (points: LatLng[]) => void;
}

export default function RouteAlternatives({ stops, activity, config, onStart }: RouteAlternativesProps) {
  const { routes, selectedIndex, selectRoute } = useDirectionsStore();
  const route = routes[selectedIndex] ?? null;

  if (routes.length === 0) return null;

  return (
    <div className="panel-section">
      <h3>Routes ({routes.length})</h3>
      <div className={styles.routeList}>
        {routes.map((r, i) => (
          <div
            key={i}
            className={`${styles.routeOption}${i === selectedIndex ? ` ${styles.routeOptionSelected}` : ''}`}
            onClick={() => selectRoute(i)}
          >
            <div className={styles.routeOptionLabel}>Route {i + 1}</div>
            <div className={styles.routeOptionInfo}>
              {r.distance} · {r.duration}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.actionRow}>
        <button
          className="btn-go"
          onClick={() => { if (route) onStart(route.polyline); }}
        >
          {config.actionVerb}
        </button>
        {route && (
          <>
            <SaveRouteAction route={route} stops={stops} activity={activity} />
            <ExportRouteAction route={route} stops={stops} />
          </>
        )}
      </div>
    </div>
  );
}
