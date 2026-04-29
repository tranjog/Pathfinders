import type { LatLng, SavedRouteData, Stop } from '@types';
import { distanceBetween, samplePointsAlongPath } from '@services/geometry';
import { SV_SAMPLE_INTERVAL_METERS } from '@constants/tuning';

/**
 * Result of a successful import: preview-ready data shaped to be saved
 * straight into `savedRoutesStore` and rendered via `directionsStore.setSavedRoute`.
 */
export interface ImportedRoute {
  /** Suggested name (from file metadata, falling back to the filename). */
  name: string;
  /** Route stops — derived from waypoints when present, else start+end of polyline. */
  stops: Stop[];
  /** Directly assignable to `SavedRoute.route`. */
  route: SavedRouteData;
  /** Non-blocking notes shown in the preview dialog. */
  warnings: string[];
}

export type ImportResult =
  | { ok: true; preview: ImportedRoute }
  | { ok: false; error: string };

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_POINTS = 50_000;
const MIN_POINTS = 2;
const MAX_BBOX_DIAGONAL_KM = 5_000;

const SUPPORTED_EXTS = new Set(['gpx', 'kml', 'geojson', 'json']);

export async function parseRouteFile(file: File): Promise<ImportResult> {
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `File is too large (${formatBytes(file.size)}). Maximum is ${formatBytes(MAX_BYTES)}.`,
    };
  }

  const ext = (file.name.match(/\.([^.]+)$/)?.[1] ?? '').toLowerCase();
  if (!SUPPORTED_EXTS.has(ext)) {
    return {
      ok: false,
      error: `Unsupported format ".${ext || '?'}". Supported: .gpx, .kml, .geojson.`,
    };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: 'Could not read file.' };
  }

  let parsed: ParsedRoute | { error: string };
  switch (ext) {
    case 'gpx':
      parsed = parseGpx(text);
      break;
    case 'kml':
      parsed = parseKml(text);
      break;
    case 'geojson':
    case 'json':
      parsed = parseGeoJson(text);
      break;
    default:
      // Unreachable — guarded above.
      return { ok: false, error: 'Unsupported format.' };
  }

  if ('error' in parsed) return { ok: false, error: parsed.error };
  return finalizeImport(parsed, file.name);
}

interface ParsedWaypoint {
  latLng: LatLng;
  label: string;
}

interface ParsedRoute {
  name: string | null;
  /** Multiple track segments; concatenated in document order. */
  segments: LatLng[][];
  waypoints: ParsedWaypoint[];
  /** First and last timestamps across all trkpts (ms epoch), if present. */
  firstTime: number | null;
  lastTime: number | null;
}

function finalizeImport(parsed: ParsedRoute, filename: string): ImportResult {
  const warnings: string[] = [];

  // 1. Sanitise points: drop NaN / out-of-range, segment by segment.
  const cleanedSegments = parsed.segments
    .map((seg) => seg.filter(isValidLatLng))
    .filter((seg) => seg.length > 0);

  if (cleanedSegments.length > 1) {
    warnings.push(`Joined ${cleanedSegments.length} track segments in document order.`);
  }

  // 2. Concatenate.
  const polyline: LatLng[] = cleanedSegments.flat();
  if (polyline.length < MIN_POINTS) {
    return { ok: false, error: 'No valid track points found.' };
  }

  // 3. Cap point count by uniform downsampling.
  let finalLine = polyline;
  if (finalLine.length > MAX_POINTS) {
    const stride = Math.ceil(finalLine.length / MAX_POINTS);
    const reduced: LatLng[] = [];
    for (let i = 0; i < finalLine.length; i += stride) reduced.push(finalLine[i]);
    if (reduced[reduced.length - 1] !== finalLine[finalLine.length - 1]) {
      reduced.push(finalLine[finalLine.length - 1]);
    }
    warnings.push(
      `Downsampled from ${polyline.length.toLocaleString()} to ${reduced.length.toLocaleString()} points.`,
    );
    finalLine = reduced;
  }

  // 4. Bounding-box sanity check.
  const bboxKm = bboxDiagonalKm(finalLine);
  if (bboxKm > MAX_BBOX_DIAGONAL_KM) {
    warnings.push(`Track spans ${Math.round(bboxKm).toLocaleString()} km — looks larger than expected.`);
  }

  // 5. Stops: prefer file waypoints, otherwise synthesise from start+end.
  const validWaypoints = parsed.waypoints.filter((w) => isValidLatLng(w.latLng));
  let stops: Stop[];
  if (validWaypoints.length >= 2) {
    stops = validWaypoints.map((w) => ({ latLng: w.latLng, label: w.label }));
  } else {
    stops = [
      { latLng: finalLine[0], label: 'Start' },
      { latLng: finalLine[finalLine.length - 1], label: 'End' },
    ];
    if (validWaypoints.length === 0) {
      warnings.push('No waypoints in file — using start & end as stops.');
    } else {
      warnings.push('Single waypoint in file — using start & end as stops.');
    }
  }

  // 6. Distance.
  let distanceMeters = 0;
  for (let i = 1; i < finalLine.length; i++) {
    distanceMeters += distanceBetween(finalLine[i - 1], finalLine[i]);
  }
  const distance = formatDistance(distanceMeters);

  // 7. Duration from timestamps when present.
  let duration = '—';
  if (
    parsed.firstTime != null &&
    parsed.lastTime != null &&
    parsed.lastTime > parsed.firstTime
  ) {
    duration = formatDuration((parsed.lastTime - parsed.firstTime) / 1000);
  }

  // 8. Sampled points for Street View playback (re-uses existing service).
  const sampledPoints = samplePointsAlongPath(finalLine, SV_SAMPLE_INTERVAL_METERS);

  const name =
    (parsed.name?.trim() || stripExtension(filename))?.trim() || 'Imported route';

  return {
    ok: true,
    preview: {
      name,
      stops,
      route: { polyline: finalLine, sampledPoints, distance, duration },
      warnings,
    },
  };
}

/* --------------------------------- Parsers --------------------------------- */

function parseGpx(text: string): ParsedRoute | { error: string } {
  const doc = parseXml(text);
  if ('error' in doc) return doc;

  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== 'gpx') {
    return { error: 'Not a GPX document — missing <gpx> root.' };
  }

  const segments: LatLng[][] = [];
  const trkpts: { latLng: LatLng; t: number | null }[] = [];

  for (const trk of Array.from(root.getElementsByTagName('trk'))) {
    for (const trkseg of Array.from(trk.getElementsByTagName('trkseg'))) {
      const seg: LatLng[] = [];
      for (const pt of Array.from(trkseg.getElementsByTagName('trkpt'))) {
        const ll = readLatLngAttr(pt, 'lat', 'lon');
        if (!ll) continue;
        seg.push(ll);
        trkpts.push({ latLng: ll, t: readTime(pt) });
      }
      if (seg.length > 0) segments.push(seg);
    }
  }

  // Routes are only used when there are no tracks.
  if (segments.length === 0) {
    for (const rte of Array.from(root.getElementsByTagName('rte'))) {
      const seg: LatLng[] = [];
      for (const pt of Array.from(rte.getElementsByTagName('rtept'))) {
        const ll = readLatLngAttr(pt, 'lat', 'lon');
        if (ll) seg.push(ll);
      }
      if (seg.length > 0) segments.push(seg);
    }
  }

  const waypoints: ParsedWaypoint[] = [];
  for (const wpt of Array.from(root.getElementsByTagName('wpt'))) {
    const ll = readLatLngAttr(wpt, 'lat', 'lon');
    if (!ll) continue;
    waypoints.push({ latLng: ll, label: textOf(wpt, 'name') ?? '' });
  }

  // First/last timestamp across all trkpts (using only those that have one).
  const timed = trkpts
    .filter((p): p is { latLng: LatLng; t: number } => p.t != null)
    .map((p) => p.t);
  const firstTime = timed.length > 0 ? timed[0] : null;
  const lastTime = timed.length > 0 ? timed[timed.length - 1] : null;

  return {
    name: readMetadataName(root),
    segments,
    waypoints,
    firstTime,
    lastTime,
  };
}

function parseKml(text: string): ParsedRoute | { error: string } {
  const doc = parseXml(text);
  if ('error' in doc) return doc;

  const segments: LatLng[][] = [];
  for (const ls of Array.from(doc.getElementsByTagName('LineString'))) {
    const coordsEl = ls.getElementsByTagName('coordinates')[0];
    if (!coordsEl) continue;
    const seg = parseKmlCoordinates(coordsEl.textContent ?? '');
    if (seg.length > 0) segments.push(seg);
  }

  const waypoints: ParsedWaypoint[] = [];
  for (const placemark of Array.from(doc.getElementsByTagName('Placemark'))) {
    const point = placemark.getElementsByTagName('Point')[0];
    if (!point) continue;
    const coordsEl = point.getElementsByTagName('coordinates')[0];
    if (!coordsEl) continue;
    const pts = parseKmlCoordinates(coordsEl.textContent ?? '');
    if (pts.length === 0) continue;
    waypoints.push({ latLng: pts[0], label: textOf(placemark, 'name') ?? '' });
  }

  const docName =
    (doc.documentElement ? textOf(doc.documentElement, 'name') : null) ?? null;

  return { name: docName, segments, waypoints, firstTime: null, lastTime: null };
}

function parseKmlCoordinates(s: string): LatLng[] {
  const out: LatLng[] = [];
  for (const tok of s.trim().split(/\s+/)) {
    if (!tok) continue;
    const parts = tok.split(',');
    if (parts.length < 2) continue;
    const lng = Number(parts[0]);
    const lat = Number(parts[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng });
  }
  return out;
}

function parseGeoJson(text: string): ParsedRoute | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'Invalid JSON.' };
  }
  if (!isObject(data)) return { error: 'GeoJSON must be an object.' };

  const segments: LatLng[][] = [];
  const waypoints: ParsedWaypoint[] = [];

  const visit = (feature: unknown) => {
    if (!isObject(feature)) return;
    const geom = feature.geometry;
    const props = isObject(feature.properties) ? feature.properties : {};
    const label = typeof props.name === 'string' ? props.name : '';
    walkGeometry(geom, label, segments, waypoints);
  };

  const type = data.type;
  if (type === 'FeatureCollection') {
    if (Array.isArray(data.features)) data.features.forEach(visit);
  } else if (type === 'Feature') {
    visit(data);
  } else if (typeof type === 'string') {
    walkGeometry(data, '', segments, waypoints);
  } else {
    return { error: 'GeoJSON missing "type" field.' };
  }

  const props = isObject(data.properties) ? data.properties : null;
  const docName = props && typeof props.name === 'string' ? props.name : null;

  return {
    name: docName,
    segments: segments.filter((s) => s.length > 0),
    waypoints,
    firstTime: null,
    lastTime: null,
  };
}

function walkGeometry(
  geom: unknown,
  label: string,
  segments: LatLng[][],
  waypoints: ParsedWaypoint[],
): void {
  if (!isObject(geom)) return;
  switch (geom.type) {
    case 'LineString':
      segments.push(coordsToLatLngs(geom.coordinates));
      break;
    case 'MultiLineString':
      if (Array.isArray(geom.coordinates)) {
        for (const line of geom.coordinates) segments.push(coordsToLatLngs(line));
      }
      break;
    case 'Point': {
      const ll = coordToLatLng(geom.coordinates);
      if (ll) waypoints.push({ latLng: ll, label });
      break;
    }
    case 'GeometryCollection':
      if (Array.isArray(geom.geometries)) {
        for (const g of geom.geometries) walkGeometry(g, label, segments, waypoints);
      }
      break;
    default:
      // Polygon / MultiPolygon / etc. — not meaningful for a route.
      break;
  }
}

function coordsToLatLngs(coords: unknown): LatLng[] {
  if (!Array.isArray(coords)) return [];
  const out: LatLng[] = [];
  for (const c of coords) {
    const ll = coordToLatLng(c);
    if (ll) out.push(ll);
  }
  return out;
}

function coordToLatLng(coord: unknown): LatLng | null {
  if (!Array.isArray(coord) || coord.length < 2) return null;
  const lng = Number(coord[0]);
  const lat = Number(coord[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/* --------------------------------- Helpers --------------------------------- */

function parseXml(text: string): Document | { error: string } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
      return { error: 'Could not parse XML.' };
    }
    return doc;
  } catch {
    return { error: 'Could not parse XML.' };
  }
}

function readLatLngAttr(el: Element, latAttr: string, lngAttr: string): LatLng | null {
  const lat = Number(el.getAttribute(latAttr));
  const lng = Number(el.getAttribute(lngAttr));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function readTime(el: Element): number | null {
  const tEl = el.getElementsByTagName('time')[0];
  const raw = tEl?.textContent?.trim();
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

function readMetadataName(root: Element): string | null {
  const meta = root.getElementsByTagName('metadata')[0];
  if (!meta) return null;
  return textOf(meta, 'name');
}

function textOf(el: Element, tag: string): string | null {
  const sub = el.getElementsByTagName(tag)[0];
  const text = sub?.textContent?.trim();
  return text ? text : null;
}

function isValidLatLng(p: LatLng | null | undefined): p is LatLng {
  return (
    !!p &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180
  );
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function formatDistance(meters: number): string {
  if (meters < 1_000) return `${Math.round(meters)} m`;
  const km = meters / 1_000;
  return `${km < 10 ? km.toFixed(2) : km.toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.round(seconds)}s`;
}

function formatBytes(b: number): string {
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  if (b >= 1024) return `${Math.round(b / 1024)} KB`;
  return `${b} B`;
}

function bboxDiagonalKm(points: LatLng[]): number {
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
  return (
    distanceBetween({ lat: minLat, lng: minLng }, { lat: maxLat, lng: maxLng }) / 1_000
  );
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}
