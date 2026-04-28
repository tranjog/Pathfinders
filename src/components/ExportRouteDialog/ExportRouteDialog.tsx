import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LatLng, Stop } from '@types';
import { downloadGpx, gpxFilename, routeToGpx, type GpxKind } from '@services/gpxExport';
import { GpxIcon } from '@assets';
import googleEarthIconUrl from '@assets/icons/brands/googleearth.svg';
import garminIconUrl from '@assets/icons/brands/garmin.svg';
import stravaIconUrl from '@assets/icons/brands/strava.svg';
import styles from './ExportRouteDialog.module.css';

export interface ExportableRoute {
  name: string;
  polyline: LatLng[];
  stops: Stop[];
  distance: string;
  duration: string;
}

interface Props {
  route: ExportableRoute;
  onClose: () => void;
}

type FormatId = 'gpx' | 'kml' | 'garmin' | 'strava';

interface FormatTile {
  id: FormatId;
  title: string;
  icon: ReactNode;
  desc: string;
  enabled: boolean;
  badge?: string;
}

const FORMATS: FormatTile[] = [
  {
    id: 'gpx',
    title: 'GPX',
    icon: <GpxIcon width={14} height={14} />,
    desc: 'Standard XML. Works with Garmin, Komoot, Wahoo, RWGPS.',
    enabled: true,
  },
  {
    id: 'kml',
    title: 'KML',
    icon: <img src={googleEarthIconUrl} alt="" width={14} height={14} />,
    desc: 'For Google Earth and map viewers.',
    enabled: false,
    badge: 'Soon',
  },
  {
    id: 'garmin',
    title: 'Garmin',
    icon: <img src={garminIconUrl} alt="" width={14} height={14} />,
    desc: 'Push to Garmin Connect courses.',
    enabled: false,
    badge: 'Soon',
  },
  {
    id: 'strava',
    title: 'Strava',
    icon: <img src={stravaIconUrl} alt="" width={14} height={14} />,
    desc: 'Upload as a Strava route.',
    enabled: false,
    badge: 'Soon',
  },
];

export default function ExportRouteDialog({ route, onClose }: Props) {
  const [format, setFormat] = useState<FormatId>('gpx');
  const [kind, setKind] = useState<GpxKind>('track');
  const [includeWaypoints, setIncludeWaypoints] = useState(true);
  const [syntheticTimestamps, setSyntheticTimestamps] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filename = useMemo(() => gpxFilename(route.name), [route.name]);
  const trkptCount = route.polyline.length;
  // Rough size estimate: ~80 bytes per trkpt without time, ~140 with.
  const approxBytes = trkptCount * (syntheticTimestamps ? 140 : 80) + 400;
  const sizeLabel =
    approxBytes >= 1024 ? `~${Math.round(approxBytes / 1024)} KB` : `~${approxBytes} B`;

  const filledStops = route.stops.filter((s) => s.latLng !== null).length;

  const [saving, setSaving] = useState(false);

  const handleDownload = async () => {
    if (format !== 'gpx' || saving) return;
    const xml = routeToGpx(
      {
        name: route.name,
        description: `${route.distance} · ${route.duration}`,
        polyline: route.polyline,
        stops: route.stops,
      },
      { kind, includeWaypoints, syntheticTimestamps },
    );
    setSaving(true);
    try {
      const result = await downloadGpx(filename, xml);
      if (result.kind !== 'cancelled') onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (format !== 'gpx') return;
    const xml = routeToGpx(
      {
        name: route.name,
        description: `${route.distance} · ${route.duration}`,
        polyline: route.polyline,
        stops: route.stops,
      },
      { kind, includeWaypoints, syntheticTimestamps },
    );
    try {
      await navigator.clipboard.writeText(xml);
    } catch {
      /* clipboard may be unavailable in some webviews; ignore */
    }
  };

  const canDownload = format === 'gpx' && trkptCount > 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Export route</h2>
        <p className={styles.summary}>
          <strong>{route.name}</strong> · {route.distance} · {route.duration} ·{' '}
          {filledStops} stop{filledStops === 1 ? '' : 's'}
        </p>

        <div className={styles.formatGrid}>
          {FORMATS.map((f) => {
            const selected = f.id === format;
            const cls = [
              styles.formatTile,
              selected ? styles.selected : '',
              f.enabled ? '' : styles.disabled,
            ].filter(Boolean).join(' ');
            return (
              <button
                key={f.id}
                type="button"
                className={cls}
                disabled={!f.enabled}
                onClick={() => f.enabled && setFormat(f.id)}
              >
                <div className={styles.formatTitle}>
                  <span className={styles.formatIco}>{f.icon}</span> {f.title}
                </div>
                <div className={styles.formatDesc}>{f.desc}</div>
                {f.badge && <span className={styles.badge}>{f.badge}</span>}
              </button>
            );
          })}
        </div>

        {format === 'gpx' && (
          <>
            <div className={styles.optGroup}>
              <label className={styles.optLabel}>GPX type</label>
              <div className={styles.segRow}>
                <button
                  type="button"
                  className={`${styles.segBtn}${kind === 'track' ? ` ${styles.active}` : ''}`}
                  onClick={() => setKind('track')}
                >
                  Track (trk)
                </button>
                <button
                  type="button"
                  className={`${styles.segBtn}${kind === 'route' ? ` ${styles.active}` : ''}`}
                  onClick={() => setKind('route')}
                >
                  Route (rte)
                </button>
              </div>
            </div>

            <div className={styles.optGroup}>
              <label className={styles.optLabel}>Include</label>
              <div className={styles.toggleRows}>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={includeWaypoints}
                    onChange={(e) => setIncludeWaypoints(e.target.checked)}
                  />
                  Waypoints for every stop
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={syntheticTimestamps}
                    onChange={(e) => setSyntheticTimestamps(e.target.checked)}
                  />
                  Synthetic timestamps (for devices that need them)
                </label>
              </div>
              <div className={styles.fileSummary}>
                {filename} · {trkptCount} {kind === 'track' ? 'trkpts' : 'rtepts'} · {sizeLabel}
              </div>
            </div>
          </>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={handleCopy} disabled={!canDownload}>
            Copy to clipboard
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleDownload} disabled={!canDownload || saving}>
            {saving ? 'Saving…' : 'Download .gpx'}
          </button>
        </div>
      </div>
    </div>
  );
}
