import { useState } from 'react';
import type { RouteData, Stop, ActivityType } from '@types';
import { useSavedRoutesStore } from '@store/savedRoutesStore';
import styles from './SavedRoutes.module.css';

interface SaveRouteActionProps {
  route: RouteData;
  stops: Stop[];
  activity: ActivityType;
}

export default function SaveRouteAction({ route, stops, activity }: SaveRouteActionProps) {
  const save = useSavedRoutesStore((s) => s.save);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const filledStops = stops.filter((s) => s.latLng !== null);
  const canSave = filledStops.length >= 2;

  const handleOpen = () => {
    if (!canSave) return;
    const first = filledStops[0]?.label?.trim() || 'Start';
    const last = filledStops[filledStops.length - 1]?.label?.trim() || 'End';
    setName(`${first} → ${last}`);
    setOpen(true);
  };

  const handleCancel = () => {
    setOpen(false);
    setName('');
  };

  const handleSave = () => {
    if (!canSave || !name.trim()) return;
    save(name, activity, stops, {
      polyline: route.polyline,
      sampledPoints: route.sampledPoints,
      distance: route.distance,
      duration: route.duration,
    });
    handleCancel();
  };

  if (!open) {
    return (
      <button
        className={styles.btnSave}
        style={{ marginTop: 8, width: '100%' }}
        onClick={handleOpen}
        disabled={!canSave}
        title={canSave ? 'Save this route' : 'Set at least 2 stops to save'}
      >
        Save this route
      </button>
    );
  }

  return (
    <div className={styles.saveBar} style={{ marginTop: 8 }}>
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          else if (e.key === 'Escape') handleCancel();
        }}
        placeholder="Route name…"
      />
      <button className="btn-go" onClick={handleSave} disabled={!name.trim()}>Save</button>
      <button className={styles.btnGhost} onClick={handleCancel}>Cancel</button>
    </div>
  );
}
