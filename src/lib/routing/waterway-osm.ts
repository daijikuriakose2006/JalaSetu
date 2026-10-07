/**
 * Real-time waterway geometry from OpenStreetMap Overpass API.
 *
 * Queries actual canal/river ways between two jetty coordinates.
 * Falls back to null so the caller can use the hardcoded geometry.
 *
 * OSM tags queried:
 *   waterway=canal  – managed canals (West Coast Canal / NW-3)
 *   waterway=river  – natural rivers (Pamba, Meenachil, etc.)
 *   waterway=stream – smaller connecting streams
 *
 * Vembanad Lake itself has no linear waterway tag (it is natural=water).
 * For open-lake crossings we insert a straight connector between the nearest
 * canal endpoints on either shore.
 */

import { haversineDistanceKm } from './dijkstra';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const TIMEOUT_MS   = 6000;   // 6 s — fail fast
const CORRIDOR_KM  = 20;     // ignore OSM ways more than 20 km off direct line

// ── Types ──────────────────────────────────────────────────────────────────

interface OsmWay {
  id: number;
  geometry: { lat: number; lon: number }[];
  tags?: Record<string, string>;
}

/** GeoJSON [lng, lat] */
type Coord = [number, number];

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Fetch OSM waterway geometry between two jetty coordinates.
 * Returns an ordered array of [lng, lat] coordinates tracing the actual
 * waterway (canal / river) path, or null if Overpass is unreachable / returns
 * no useful data.
 */
export async function getOSMWaterwayRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<Coord[] | null> {
  try {
    const ways = await fetchOverpassWays(fromLat, fromLng, toLat, toLng);
    if (!ways || ways.length === 0) return null;

    const coords = stitchWays(ways, fromLng, fromLat, toLng, toLat);
    if (coords.length < 3) return null;

    // Prepend/append the exact jetty coordinates
    return [[fromLng, fromLat], ...coords, [toLng, toLat]];
  } catch (err) {
    console.warn('[waterway-osm] Overpass query failed:', err);
    return null;
  }
}

// ── Overpass fetch ─────────────────────────────────────────────────────────

async function fetchOverpassWays(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<OsmWay[]> {
  const pad    = 0.12;   // ~12 km buffer around the bbox
  const minLat = Math.min(fromLat, toLat) - pad;
  const maxLat = Math.max(fromLat, toLat) + pad;
  const minLng = Math.min(fromLng, toLng) - pad;
  const maxLng = Math.max(fromLng, toLng) + pad;

  // Query canals, rivers and streams with their full node geometry
  const query = `[out:json][timeout:5];
(
  way["waterway"="canal"](${minLat},${minLng},${maxLat},${maxLng});
  way["waterway"="river"](${minLat},${minLng},${maxLat},${maxLng});
  way["waterway"="stream"](${minLat},${minLng},${maxLat},${maxLng});
);
out geom;`;

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const res = await fetch(OVERPASS_URL, {
    method : 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body   : `data=${encodeURIComponent(query)}`,
    signal : controller.signal,
  });
  clearTimeout(timer);

  if (!res.ok) return [];
  const data = await res.json();
  return (data.elements || []).filter(
    (el: any) => el.type === 'way' && el.geometry && el.geometry.length >= 2
  ) as OsmWay[];
}

// ── Path stitching ─────────────────────────────────────────────────────────

/**
 * Stitch OSM way segments into an ordered route from (fromLng,fromLat) to
 * (toLng,toLat).
 *
 * Algorithm:
 * 1. Filter ways that fall within CORRIDOR_KM of the direct line.
 * 2. Project each way's midpoint onto the direct vector to get a t-value ∈ [0,1].
 * 3. Sort ways by t-value so they progress from origin to destination.
 * 4. Output each way's coordinates in the direction that moves toward destination.
 * 5. Insert gap-bridges (straight connector) where consecutive ways are not adjacent.
 */
function stitchWays(
  ways: OsmWay[],
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number
): Coord[] {
  // Direction vector (origin → destination)
  const dx  = toLng - fromLng;
  const dy  = toLat - fromLat;
  const len2 = dx * dx + dy * dy || 1e-10;

  /** Scalar projection of a point onto the O→D axis */
  function project(lng: number, lat: number): number {
    return ((lng - fromLng) * dx + (lat - fromLat) * dy) / len2;
  }

  /** Distance from a point to the O→D line */
  function distToLine(lng: number, lat: number): number {
    const t       = Math.max(0, Math.min(1, project(lng, lat)));
    const projLng = fromLng + t * dx;
    const projLat = fromLat + t * dy;
    return haversineDistanceKm(lat, lng, projLat, projLng);
  }

  // Filter + annotate
  const annotated = ways
    .map((way) => {
      const pts = way.geometry;
      const midIdx = Math.floor(pts.length / 2);
      const mid    = pts[midIdx];
      const t      = project(mid.lon, mid.lat);
      const d      = distToLine(mid.lon, mid.lat);

      // Build forward coords [lng, lat]
      const fwd: Coord[] = pts.map((p) => [p.lon, p.lat]);
      // t-values at first and last node to determine direction
      const tFirst = project(pts[0].lon, pts[0].lat);
      const tLast  = project(pts[pts.length - 1].lon, pts[pts.length - 1].lat);
      // Reverse if the way runs backward relative to O→D
      const coords: Coord[] = tLast >= tFirst ? fwd : [...fwd].reverse();
      const tStart          = Math.min(tFirst, tLast);
      const tEnd            = Math.max(tFirst, tLast);

      return { t, tStart, tEnd, d, coords };
    })
    .filter(({ t, d }) => t > -0.1 && t < 1.1 && d < CORRIDOR_KM);

  if (annotated.length === 0) return [];

  // Sort by t-start
  annotated.sort((a, b) => a.tStart - b.tStart);

  // Flatten, bridging any gaps
  const result: Coord[] = [];
  let prev: Coord | null = null;

  for (const seg of annotated) {
    const first = seg.coords[0];
    // Bridge gap from previous segment end to this segment start
    if (prev) {
      const gapKm = haversineDistanceKm(prev[1], prev[0], first[1], first[0]);
      if (gapKm > 0.05 && gapKm < 25) {
        // Insert a straight connector (open-water crossing or canal gap)
        result.push(first);
      }
    }
    // Add this segment's coordinates (skip first if it's a duplicate)
    for (let i = prev ? 1 : 0; i < seg.coords.length; i++) {
      result.push(seg.coords[i]);
    }
    prev = seg.coords[seg.coords.length - 1];
  }

  return result;
}
