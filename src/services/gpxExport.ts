import type { LatLng, Stop } from '@types';
import { isTauri } from '@utils/platform';

export type GpxKind = 'track' | 'route';

export interface GpxRouteInput {
  name: string;
  description?: string;
  polyline: LatLng[];
  stops: Stop[];
}

export interface GpxOptions {
  kind: GpxKind;
  includeWaypoints: boolean;
  syntheticTimestamps: boolean;
  /** Speed used to derive synthetic timestamps. m/s. Defaults to 5 m/s (~18 km/h). */
  speedMps?: number;
}

const CREATOR = 'Pathfinders';
const GPX_NS = 'http://www.topografix.com/GPX/1/1';
const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';
const SCHEMA_LOC =
  'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fmtCoord(n: number): string {
  // Six decimals = ~11 cm precision; plenty for cycling routes and keeps files small.
  return n.toFixed(6);
}

function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function stopLabel(index: number, total: number, fallback: string): string {
  if (fallback.trim()) return fallback;
  if (index === 0) return 'Start';
  if (index === total - 1) return 'End';
  return `Stop ${index + 1}`;
}

export function routeToGpx(input: GpxRouteInput, opts: GpxOptions): string {
  const { name, description, polyline, stops } = input;
  const { kind, includeWaypoints, syntheticTimestamps, speedMps = 5 } = opts;

  const safeName = escapeXml(name || 'Pathfinders route');
  const startedAt = new Date().toISOString();

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<gpx version="1.1" creator="${escapeXml(CREATOR)}" ` +
      `xmlns="${GPX_NS}" xmlns:xsi="${XSI_NS}" ` +
      `xsi:schemaLocation="${SCHEMA_LOC}">`,
  );

  // Metadata
  lines.push('  <metadata>');
  lines.push(`    <name>${safeName}</name>`);
  if (description && description.trim()) {
    lines.push(`    <desc>${escapeXml(description)}</desc>`);
  }
  lines.push(`    <time>${startedAt}</time>`);
  lines.push('  </metadata>');

  // Waypoints (one per stop)
  if (includeWaypoints) {
    const filled = stops.filter((s): s is Stop & { latLng: LatLng } => s.latLng !== null);
    filled.forEach((stop, i) => {
      const ll = stop.latLng;
      lines.push(`  <wpt lat="${fmtCoord(ll.lat)}" lon="${fmtCoord(ll.lng)}">`);
      lines.push(`    <name>${escapeXml(stopLabel(i, filled.length, stop.label))}</name>`);
      lines.push('  </wpt>');
    });
  }

  // Synthetic timestamps: walk the polyline at constant speed from startedAt.
  let cumulativeMeters = 0;
  const startTs = Date.parse(startedAt);
  const tsFor = (i: number): string | null => {
    if (!syntheticTimestamps) return null;
    if (i === 0) return new Date(startTs).toISOString();
    cumulativeMeters += haversineMeters(polyline[i - 1], polyline[i]);
    const seconds = cumulativeMeters / Math.max(speedMps, 0.1);
    return new Date(startTs + seconds * 1000).toISOString();
  };

  if (kind === 'track') {
    lines.push('  <trk>');
    lines.push(`    <name>${safeName}</name>`);
    lines.push('    <trkseg>');
    polyline.forEach((p, i) => {
      const ts = tsFor(i);
      if (ts) {
        lines.push(`      <trkpt lat="${fmtCoord(p.lat)}" lon="${fmtCoord(p.lng)}">`);
        lines.push(`        <time>${ts}</time>`);
        lines.push('      </trkpt>');
      } else {
        lines.push(`      <trkpt lat="${fmtCoord(p.lat)}" lon="${fmtCoord(p.lng)}"/>`);
      }
    });
    lines.push('    </trkseg>');
    lines.push('  </trk>');
  } else {
    // Route variant — same dense polyline, just under <rte>/<rtept>.
    // Some devices (older Garmins) accept routes more reliably than tracks.
    lines.push('  <rte>');
    lines.push(`    <name>${safeName}</name>`);
    polyline.forEach((p) => {
      lines.push(`    <rtept lat="${fmtCoord(p.lat)}" lon="${fmtCoord(p.lng)}"/>`);
    });
    lines.push('  </rte>');
  }

  lines.push('</gpx>');
  return lines.join('\n');
}

/** Slugify a route name for use as a download filename. */
export function gpxFilename(name: string): string {
  const slug = (name || 'pathfinders-route')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'pathfinders-route'}.gpx`;
}

export type DownloadResult =
  | { kind: 'saved'; path: string }
  | { kind: 'downloaded' }
  | { kind: 'cancelled' };

/**
 * Save GPX content to disk.
 *
 * In Tauri (desktop): opens a native save sheet via `@tauri-apps/plugin-dialog`,
 * then writes via `@tauri-apps/plugin-fs`. The user picks the directory + name.
 *
 * In a regular browser (or if the Tauri plugins aren't available): falls back to
 * the standard Blob + anchor download — the file lands in the browser's downloads
 * folder under `filename`.
 */
export async function downloadGpx(filename: string, content: string): Promise<DownloadResult> {
  if (isTauri) {
    try {
      const [{ save }, { writeTextFile }] = await Promise.all([
        import('@tauri-apps/plugin-dialog'),
        import('@tauri-apps/plugin-fs'),
      ]);
      const path = await save({
        defaultPath: filename,
        filters: [{ name: 'GPX', extensions: ['gpx'] }],
      });
      if (!path) return { kind: 'cancelled' };
      await writeTextFile(path, content);
      return { kind: 'saved', path };
    } catch {
      // Plugin not available or permission denied — fall through to web download.
    }
  }
  webDownload(filename, content);
  return { kind: 'downloaded' };
}

function webDownload(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke so the browser has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
