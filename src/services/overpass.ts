import type { CyclewaySegment, LatLng } from '../types';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

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
const cache = new Map<string, CyclewaySegment[]>();

function quantizeBounds(south: number, west: number, north: number, east: number): string {
  const q = (v: number) => (Math.round(v * 100) / 100).toFixed(2);
  return `${q(south)},${q(west)},${q(north)},${q(east)}`;
}

export async function fetchPaths(
  bounds: google.maps.LatLngBounds,
  queryBuilder: (bbox: string) => string,
  activityKey: string,
): Promise<CyclewaySegment[]> {
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

  const response = await fetch(OVERPASS_API, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data: OverpassResponse = await response.json();

  // Build node lookup
  const nodes = new Map<number, LatLng>();
  for (const el of data.elements) {
    if (el.type === 'node') {
      nodes.set(el.id, { lat: el.lat, lng: el.lon });
    }
  }

  // Build segments from ways
  const segments: CyclewaySegment[] = [];
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
