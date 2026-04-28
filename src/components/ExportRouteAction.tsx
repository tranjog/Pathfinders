import { useState } from 'react';
import type { RouteData, Stop } from '@types';
import ExportRouteDialog from './ExportRouteDialog';
import styles from './SavedRoutes.module.css';

interface Props {
  route: RouteData;
  stops: Stop[];
}

export default function ExportRouteAction({ route, stops }: Props) {
  const [open, setOpen] = useState(false);

  const filledStops = stops.filter((s) => s.latLng !== null);
  const canExport = filledStops.length >= 2 && route.polyline.length > 0;

  const defaultName = (() => {
    const first = filledStops[0]?.label?.trim() || 'Start';
    const last = filledStops[filledStops.length - 1]?.label?.trim() || 'End';
    return `${first} → ${last}`;
  })();

  return (
    <>
      <button
        className={styles.btnSave}
        onClick={() => setOpen(true)}
        disabled={!canExport}
        title={canExport ? 'Export this route' : 'Plan a route first'}
      >
        Export
      </button>
      {open && (
        <ExportRouteDialog
          route={{
            name: defaultName,
            polyline: route.polyline,
            stops,
            distance: route.distance,
            duration: route.duration,
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
