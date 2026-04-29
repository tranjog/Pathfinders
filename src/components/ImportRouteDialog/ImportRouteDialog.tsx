import { useEffect, useMemo, useState } from 'react';
import type { LatLng } from '@types';
import type { ImportedRoute } from '@services/routeImport';
import { ACTIVITY, type ActivityType } from '@constants/activity';
import { CyclistIcon, RunnerIcon } from '@assets';
import styles from './ImportRouteDialog.module.css';

interface Props {
  preview: ImportedRoute;
  activity: ActivityType;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}

const PREVIEW_W = 400;
const PREVIEW_H = 110;
const PREVIEW_PAD = 8;
const SPARK_MAX_POINTS = 240;

export default function ImportRouteDialog({ preview, activity, onCancel, onConfirm }: Props) {
  const [name, setName] = useState(preview.name);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const trimmed = name.trim();
  const canConfirm = trimmed.length > 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(trimmed);
  };

  const sparkPath = useMemo(
    () => buildSparklinePath(preview.route.polyline, PREVIEW_W, PREVIEW_H, PREVIEW_PAD),
    [preview.route.polyline],
  );
  const startEnd = useMemo(() => {
    const pts = preview.route.polyline;
    if (pts.length < 2) return null;
    const project = projector(pts, PREVIEW_W, PREVIEW_H, PREVIEW_PAD);
    return { start: project(pts[0]), end: project(pts[pts.length - 1]) };
  }, [preview.route.polyline]);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className={`modal ${styles.dialog}`} onClick={(e) => e.stopPropagation()}>
        <h2>Import route</h2>
        <p className={styles.summary}>
          Saved under your <strong>currently selected activity</strong> and loaded onto the map.
        </p>

        <div className={styles.previewCanvas} aria-hidden="true">
          <svg viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`} preserveAspectRatio="none">
            {sparkPath && (
              <path
                d={sparkPath}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {startEnd && (
              <>
                <circle cx={startEnd.start.x} cy={startEnd.start.y} r={4} className={styles.sparkStart} />
                <circle cx={startEnd.end.x} cy={startEnd.end.y} r={4} className={styles.sparkEnd} />
              </>
            )}
          </svg>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Name</span>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm();
              else if (e.key === 'Escape') onCancel();
            }}
            placeholder="Route name…"
            className={styles.fieldInput}
          />
        </label>

        <div className={styles.statsGrid}>
          <Stat label="Distance" value={preview.route.distance} />
          <Stat label="Duration" value={preview.route.duration} />
          <Stat label="Points" value={preview.route.polyline.length.toLocaleString()} />
        </div>

        <div className={styles.activityRow}>
          <span className={styles.activityPill}>
            {activity === ACTIVITY.CYCLING ? (
              <CyclistIcon width={12} height={12} />
            ) : (
              <RunnerIcon width={12} height={12} />
            )}
            Saving as {activity === ACTIVITY.CYCLING ? 'Cycling' : 'Running'}
          </span>
        </div>

        {preview.warnings.length > 0 && (
          <div className={styles.warningList}>
            <strong>Note</strong>
            <ul>
              {preview.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="modal-actions">
          <div style={{ flex: 1 }} />
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleConfirm} disabled={!canConfirm}>
            Import &amp; load
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}

function projector(points: LatLng[], width: number, height: number, padding: number) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  const latRange = maxLat - minLat || 1e-6;
  const lngRange = maxLng - minLng || 1e-6;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  return (p: LatLng) => ({
    x: padding + ((p.lng - minLng) / lngRange) * innerW,
    y: padding + (1 - (p.lat - minLat) / latRange) * innerH,
  });
}

function buildSparklinePath(
  points: LatLng[],
  width: number,
  height: number,
  padding: number,
): string {
  if (points.length < 2) return '';
  const project = projector(points, width, height, padding);
  const stride = Math.max(1, Math.ceil(points.length / SPARK_MAX_POINTS));
  const last = points.length - 1;
  const cmds: string[] = [];
  for (let i = 0; i <= last; i += stride) {
    const { x, y } = project(points[i]);
    cmds.push(`${cmds.length === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  if ((last % stride) !== 0) {
    const { x, y } = project(points[last]);
    cmds.push(`L${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return cmds.join(' ');
}
