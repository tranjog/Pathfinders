import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@utils/platform';
import type { PathSegment, LatLng } from '@types';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// overpass-api.de's tightened rate-limiting rules reject requests from the
// WKWebView (no/empty User-Agent and a `tauri://localhost` Origin) with 406.
// Route through the Rust `fetch_overpass` command whenever we are inside
// Tauri so we can send a proper User-Agent; only fall back to browser fetch
// in a plain web browser. `__TAURI__` is not exposed on `window` in Tauri 2
// by default, so detect via `__TAURI_INTERNALS__` (see @utils/platform).
const USE_RUST_FETCH = isTauri;

async function fetchOverpassRaw(query: string): Promise<string> {
  if (USE_RUST_FETCH) {
    try {
      return await invoke<string>('fetch_overpass', { query });
    } catch (err) {
      const msg = typeof err === 'string' ? err : (err instanceof Error ? err.message : String(err));
      throw new Error(`[rust] ${msg}`);
    }
  }
  const response = await fetch(OVERPASS_API, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!response.ok) throw new Error(`[fetch] ${response.status}`);
  return response.text();
}

interface OverpassNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
}

interface OverpassWay {
  type: 'way';
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
}

type OverpassElement = OverpassNode | OverpassWay;

interface OverpassResponse {
  elements: OverpassElement[];
}

// Cache keyed by activity + quantized bounding box
const cache = new Map<string, PathSegment[]>();

function quantizeBounds(south: number, west: number, north: number, east: number): string {
  const q = (v: number) => (Math.round(v * 100) / 100).toFixed(2);
  return `${q(south)},${q(west)},${q(north)},${q(east)}`;
}

export async function fetchPaths(
  bounds: google.maps.LatLngBounds,
  queryBuilder: (bbox: string) => string,
  activityKey: string,
): Promise<PathSegment[]> {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const south = sw.lat();
  const west = sw.lng();
  const north = ne.lat();
  const east = ne.lng();

  const cacheKey = `${activityKey}:${quantizeBounds(south, west, north, east)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const bbox = `${south},${west},${north},${east}`;
  const query = queryBuilder(bbox);

  const text = await fetchOverpassRaw(query);

  let data: OverpassResponse;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid response from Overpass API');
  }

  // Build node lookup
  const nodes = new Map<number, LatLng>();
  for (const el of data.elements) {
    if (el.type === 'node') {
      nodes.set(el.id, { lat: el.lat, lng: el.lon });
    }
  }

  // Build segments from ways
  const segments: PathSegment[] = [];
  for (const el of data.elements) {
    if (el.type === 'way') {
      const points: LatLng[] = [];
      for (const nodeId of el.nodes) {
        const node = nodes.get(nodeId);
        if (node) points.push(node);
      }
      if (points.length >= 2) {
        segments.push({
          id: el.id,
          name: el.tags?.name,
          points,
          coverageChecked: false,
        });
      }
    }
  }

  cache.set(cacheKey, segments);
  return segments;
}

export function getBoundsAreaKm2(bounds: google.maps.LatLngBounds): number {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const latDiff = Math.abs(ne.lat() - sw.lat());
  const lngDiff = Math.abs(ne.lng() - sw.lng());
  // Rough km approximation at mid-latitude
  const midLat = (ne.lat() + sw.lat()) / 2;
  const latKm = latDiff * 111;
  const lngKm = lngDiff * 111 * Math.cos((midLat * Math.PI) / 180);
  return latKm * lngKm;
}
