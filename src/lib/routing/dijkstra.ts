import type { Jetty, WaterEdge } from '@/lib/types/database';

export interface RouteNode {
  jettyId: string;
  jettyName: string;
  lat: number;
  lng: number;
}

export interface WaterPathResult {
  path: RouteNode[];
  jettyIds: string[];
  totalDistanceKm: number;
  totalDurationMin: number;
  edges: {
    fromJettyId: string;
    toJettyId: string;
    fromName: string;
    toName: string;
    distanceKm: number;
    avgSpeedKmph: number;
    waterwayName: string | null;
  }[];
}

// Haversine distance in km
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// Known Kerala jetty coordinates — authoritative fallback when EWKB decoding fails
const KNOWN_JETTY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Ernakulam Boat Jetty':  { lat: 9.9687, lng: 76.2673 },
  'Fort Kochi Jetty':      { lat: 9.9639, lng: 76.2432 },
  'Willingdon Island':     { lat: 9.9498, lng: 76.2714 },
  'Vypin Jetty':           { lat: 10.0014, lng: 76.2331 },
  'Bolgatty Jetty':        { lat: 9.9833, lng: 76.2583 },
  'Vaikom Jetty':          { lat: 9.7480, lng: 76.3940 },
  'Kumarakom Jetty':       { lat: 9.5894, lng: 76.4274 },
  'Muhamma Jetty':         { lat: 9.4752, lng: 76.3682 },
  'Alappuzha Boat Jetty':  { lat: 9.4901, lng: 76.3380 },
  'Thottappally Jetty':    { lat: 9.3481, lng: 76.2680 },
  'Changanassery Jetty':   { lat: 9.4441, lng: 76.5361 },
  'Thanneermukkom Jetty':  { lat: 9.6201, lng: 76.3621 },
  'Kottayam Jetty':        { lat: 9.5916, lng: 76.5222 },
  'Kollam Boat Jetty':     { lat: 8.8832, lng: 76.5883 },
  'Nedumudi Jetty':        { lat: 9.4574, lng: 76.4156 },
};

/**
 * Extract lat/lng from a Jetty row.
 *
 * Supabase returns PostGIS `geography` columns as EWKB hex strings, not
 * parsed GeoJSON. Decoding priority:
 *   1. Explicit lat/lng columns (if they exist)
 *   2. GeoJSON coordinates array (if Supabase sent parsed JSON)
 *   3. EWKB hex decoding (PostGIS little-endian binary with SRID prefix)
 *   4. Name-based lookup from KNOWN_JETTY_COORDS
 *   5. Hardcoded Ernakulam fallback
 */
export function getJettyCoords(jetty: Jetty): { lat: number; lng: number } {
  // 1. Explicit numeric columns
  if (typeof (jetty as any).lat === 'number' && typeof (jetty as any).lng === 'number') {
    return { lat: (jetty as any).lat, lng: (jetty as any).lng };
  }

  // 2. Parsed GeoJSON from Supabase
  const geog = jetty.geog as any;
  if (geog && Array.isArray(geog.coordinates) && geog.coordinates.length >= 2) {
    return { lat: geog.coordinates[1], lng: geog.coordinates[0] };
  }

  // 3. EWKB hex string (PostGIS geography with SRID 4326)
  //    Layout (little-endian): [1B order][4B type][4B SRID][8B lng][8B lat]
  if (typeof geog === 'string' && geog.length >= 50) {
    try {
      const buf = Buffer.from(geog, 'hex');
      const lng = buf.readDoubleLE(9);   // bytes 9-16 = X (longitude)
      const lat = buf.readDoubleLE(17);  // bytes 17-24 = Y (latitude)
      // Sanity-check: must be inside Kerala bounding box
      if (lat > 8 && lat < 12 && lng > 75 && lng < 78) {
        return { lat, lng };
      }
    } catch {
      // malformed EWKB — fall through
    }
  }

  // 4. Name-based lookup
  const name = (jetty as any).name as string | undefined;
  if (name && KNOWN_JETTY_COORDS[name]) {
    return KNOWN_JETTY_COORDS[name];
  }

  // 5. Last resort
  return { lat: 9.9687, lng: 76.2673 };
}

// Find nearest jetty to a given coordinate
export function findNearestJetty(
  lat: number,
  lng: number,
  jetties: Jetty[]
): { jetty: Jetty; distanceKm: number } | null {
  if (!jetties || jetties.length === 0) return null;

  let nearest: Jetty | null = null;
  let minDistance = Infinity;

  for (const j of jetties) {
    const coords = getJettyCoords(j);
    const d = haversineDistanceKm(lat, lng, coords.lat, coords.lng);
    if (d < minDistance) {
      minDistance = d;
      nearest = j;
    }
  }

  if (!nearest) return null;
  return { jetty: nearest, distanceKm: minDistance };
}

// Dijkstra shortest path on Kerala waterway graph
export function findWaterRoute(
  jetties: Jetty[],
  edges: WaterEdge[],
  fromJettyId: string,
  toJettyId: string
): WaterPathResult | null {
  if (fromJettyId === toJettyId) {
    const startJetty = jetties.find((j) => j.id === fromJettyId);
    if (!startJetty) return null;
    const coords = getJettyCoords(startJetty);
    return {
      path: [{ jettyId: startJetty.id, jettyName: startJetty.name, lat: coords.lat, lng: coords.lng }],
      jettyIds: [startJetty.id],
      totalDistanceKm: 0,
      totalDurationMin: 0,
      edges: [],
    };
  }

  const jettyMap = new Map<string, Jetty>();
  for (const j of jetties) jettyMap.set(j.id, j);

  // Adjacency list: from -> array of { to, distance, speed, edge }
  const adj = new Map<
    string,
    { to: string; distance: number; speed: number; edge: WaterEdge }[]
  >();

  for (const e of edges) {
    if (!e.is_active) continue;
    if (!adj.has(e.from_jetty_id)) adj.set(e.from_jetty_id, []);
    adj.get(e.from_jetty_id)!.push({
      to: e.to_jetty_id,
      distance: Number(e.distance_km),
      speed: Number(e.avg_speed_kmph) || 10,
      edge: e,
    });
  }

  // Priority queue / distances
  const dist = new Map<string, number>();
  const prev = new Map<string, { node: string; edge: WaterEdge }>();
  const visited = new Set<string>();

  for (const j of jetties) {
    dist.set(j.id, Infinity);
  }
  dist.set(fromJettyId, 0);

  while (visited.size < jetties.length) {
    let u: string | null = null;
    let minD = Infinity;

    for (const [nodeId, d] of dist.entries()) {
      if (!visited.has(nodeId) && d < minD) {
        minD = d;
        u = nodeId;
      }
    }

    if (!u || minD === Infinity) break;
    if (u === toJettyId) break;

    visited.add(u);

    const neighbors = adj.get(u) || [];
    for (const edgeInfo of neighbors) {
      if (visited.has(edgeInfo.to)) continue;
      const alt = dist.get(u)! + edgeInfo.distance;
      if (alt < (dist.get(edgeInfo.to) ?? Infinity)) {
        dist.set(edgeInfo.to, alt);
        prev.set(edgeInfo.to, { node: u, edge: edgeInfo.edge });
      }
    }
  }

  if (dist.get(toJettyId) === Infinity || !prev.has(toJettyId)) {
    return null; // unreachable
  }

  // Reconstruct path
  const pathJettyIds: string[] = [];
  const traversedEdges: WaterPathResult['edges'] = [];
  let curr = toJettyId;

  while (curr !== fromJettyId) {
    pathJettyIds.unshift(curr);
    const p = prev.get(curr);
    if (!p) break;

    const fromJetty = jettyMap.get(p.node);
    const toJetty = jettyMap.get(curr);

    traversedEdges.unshift({
      fromJettyId: p.node,
      toJettyId: curr,
      fromName: fromJetty?.name || 'Unknown',
      toName: toJetty?.name || 'Unknown',
      distanceKm: Number(p.edge.distance_km),
      avgSpeedKmph: Number(p.edge.avg_speed_kmph) || 10,
      waterwayName: p.edge.waterway_name,
    });

    curr = p.node;
  }
  pathJettyIds.unshift(fromJettyId);

  const fullPathNodes: RouteNode[] = pathJettyIds.map((id) => {
    const jetty = jettyMap.get(id)!;
    const coords = getJettyCoords(jetty);
    return {
      jettyId: id,
      jettyName: jetty.name,
      lat: coords.lat,
      lng: coords.lng,
    };
  });

  const totalDist = traversedEdges.reduce((sum, e) => sum + e.distanceKm, 0);
  const totalDurationHrs = traversedEdges.reduce(
    (sum, e) => sum + e.distanceKm / (e.avgSpeedKmph || 10),
    0
  );

  return {
    path: fullPathNodes,
    jettyIds: pathJettyIds,
    totalDistanceKm: Number(totalDist.toFixed(2)),
    totalDurationMin: Math.round(totalDurationHrs * 60),
    edges: traversedEdges,
  };
}

// Check if destination jetty is reachable in waterway graph
export function isJettyReachable(
  fromId: string,
  toId: string,
  edges: WaterEdge[]
): boolean {
  if (fromId === toId) return true;
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!e.is_active) continue;
    if (!adj.has(e.from_jetty_id)) adj.set(e.from_jetty_id, []);
    adj.get(e.from_jetty_id)!.push(e.to_jetty_id);
  }

  const visited = new Set<string>();
  const queue = [fromId];
  visited.add(fromId);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === toId) return true;
    for (const next of adj.get(curr) || []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}
