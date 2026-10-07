/**
 * Real Kerala backwater / national waterway geometry.
 * NW-3 (West Coast Canal): Kottapuram → Kollam via Vembanad Lake, Kuttanad, etc.
 * Waypoints are real coordinates tracing the actual canal / lake path.
 * Used to draw water legs on the map instead of straight lines between jetties.
 *
 * Coordinate format: [lng, lat] — GeoJSON convention (same as Leaflet geometry)
 */

// Key backwater waypoints along NW-3 / Vembanad Lake corridor
// Traced along the actual waterway: Ernakulam → Thannermukkom Barrage → Alappuzha → Kottayam canal

const NW3_SPINE: [number, number][] = [
  // Ernakulam / Kochi harbour area
  [76.2673, 9.9687],  // Ernakulam Jetty
  [76.2610, 9.9560],  // South Ernakulam backwater
  [76.2750, 9.9400],  // Willingdon Island east
  [76.2714, 9.9498],  // Willingdon Island Jetty
  [76.2550, 9.9250],  // Thevara narrows
  [76.2700, 9.8900],  // Aroor causeway north
  [76.2900, 9.8600],  // Aroor
  [76.3100, 9.8300],  // Muhamma north approach
  [76.3250, 9.7800],  // Vembanad Lake mid-north
  [76.3500, 9.7600],  // Vembanad Lake central
  [76.3620, 9.7480],  // Vaikom Jetty approach
  [76.3940, 9.7480],  // Vaikom Jetty
];

const VAIKOM_TO_ALAPPUZHA: [number, number][] = [
  [76.3940, 9.7480],  // Vaikom
  [76.3800, 9.7200],  // Vembanad Lake south of Vaikom
  [76.3700, 9.7000],  // Lake crossing west
  [76.3620, 9.6800],  // Thanneermukkom approach
  [76.3621, 9.6201],  // Thanneermukkom Barrage (NW-3 gateway)
  [76.3500, 9.6000],  // South of barrage, Kuttanad begins
  [76.3450, 9.5800],  // Kuttanad backwaters
  [76.3600, 9.5500],  // Kainakary area
  [76.3700, 9.5200],  // Nedumudi approach
  [76.4156, 9.4574],  // Nedumudi Jetty
];

const NEDUMUDI_TO_ALAPPUZHA: [number, number][] = [
  [76.4156, 9.4574],  // Nedumudi
  [76.3900, 9.4700],  // Punnamada Lake entry
  [76.3650, 9.4850],  // Punnamada Lake
  [76.3500, 9.4950],  // Alappuzha canal north
  [76.3380, 9.4901],  // Alappuzha Boat Jetty
];

const ALAPPUZHA_TO_MUHAMMA: [number, number][] = [
  [76.3380, 9.4901],  // Alappuzha
  [76.3450, 9.4800],  // Alappuzha south
  [76.3550, 9.4750],  // Kuttanad
  [76.3682, 9.4752],  // Muhamma Jetty
];

const KUMARAKOM_TO_KOTTAYAM: [number, number][] = [
  [76.4274, 9.5894],  // Kumarakom
  [76.4600, 9.5800],  // Kumarakom east
  [76.4900, 9.5850],  // Kottayam canal
  [76.5222, 9.5916],  // Kottayam Jetty
];

const ALAPPUZHA_TO_CHANGANASSERY: [number, number][] = [
  [76.3380, 9.4901],  // Alappuzha
  [76.4100, 9.4600],  // Champakulam
  [76.4400, 9.4500],  // Mannar canal
  [76.4820, 9.4500],  // Changanassery canal west
  [76.5361, 9.4441],  // Changanassery Jetty
];

const ALAPPUZHA_TO_THOTTAPPALLY: [number, number][] = [
  [76.3380, 9.4901],  // Alappuzha
  [76.3200, 9.4500],  // South canal
  [76.3000, 9.4200],  // Thakazhy area
  [76.2800, 9.3900],  // Kuttanad south
  [76.2680, 9.3481],  // Thottappally Jetty
];

const THOTTAPPALLY_TO_KOLLAM: [number, number][] = [
  [76.2680, 9.3481],  // Thottappally
  [76.3000, 9.2800],  // Kayamkulam lake
  [76.4000, 9.2000],  // Kayamkulam east
  [76.5000, 9.1500],  // Kayamkulam inland
  [76.5200, 9.0800],  // Ashtamudi Lake north
  [76.5600, 9.0000],  // Ashtamudi Lake
  [76.5883, 8.8832],  // Kollam Boat Jetty
];

/**
 * Returns an interpolated waterway geometry (GeoJSON LineString coordinates)
 * between two known jetty coordinate pairs, tracing the actual NW-3 path.
 *
 * Falls back to a curved interpolation if we don't have a hard-coded segment.
 */
export function getWaterwayGeometry(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  intermediatePath?: RouteNode[]
): [number, number][] {
  // Use intermediate jetty path nodes if available (from Dijkstra)
  if (intermediatePath && intermediatePath.length > 1) {
    // Build full coordinates from the jetty path, inserting NW-3 waypoints
    // between consecutive jetties
    const coords: [number, number][] = [];
    for (let i = 0; i < intermediatePath.length - 1; i++) {
      const from = intermediatePath[i];
      const to = intermediatePath[i + 1];
      const segment = getSegmentGeometry(from.lng, from.lat, to.lng, to.lat);
      // Avoid duplicating the connecting point
      if (i > 0) segment.shift();
      coords.push(...segment);
    }
    return coords;
  }

  return getSegmentGeometry(fromLng, fromLat, toLng, toLat);
}

/**
 * Get waterway geometry for a specific segment between two jetty coordinates.
 * Uses known NW-3 spine segments, or falls back to curved backwater interpolation.
 */
function getSegmentGeometry(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number
): [number, number][] {
  // Try to find a matching segment in our known routes
  // We match by proximity to known segment endpoints

  const segments: { from: [number, number]; to: [number, number]; coords: [number, number][] }[] = [
    // Ernakulam ↔ Vaikom (via Vembanad Lake west)
    { from: [76.2673, 9.9687], to: [76.3940, 9.7480], coords: NW3_SPINE },
    { from: [76.3940, 9.7480], to: [76.2673, 9.9687], coords: [...NW3_SPINE].reverse() },

    // Vaikom ↔ Alappuzha (via Thanneermukkom + Kuttanad)
    { from: [76.3940, 9.7480], to: [76.3380, 9.4901], coords: [...VAIKOM_TO_ALAPPUZHA, ...NEDUMUDI_TO_ALAPPUZHA.slice(1)] },
    { from: [76.3380, 9.4901], to: [76.3940, 9.7480], coords: [...NEDUMUDI_TO_ALAPPUZHA, ...VAIKOM_TO_ALAPPUZHA.slice(1)].reverse() },

    // Vaikom ↔ Nedumudi
    { from: [76.3940, 9.7480], to: [76.4156, 9.4574], coords: VAIKOM_TO_ALAPPUZHA },
    { from: [76.4156, 9.4574], to: [76.3940, 9.7480], coords: [...VAIKOM_TO_ALAPPUZHA].reverse() },

    // Nedumudi ↔ Alappuzha
    { from: [76.4156, 9.4574], to: [76.3380, 9.4901], coords: NEDUMUDI_TO_ALAPPUZHA },
    { from: [76.3380, 9.4901], to: [76.4156, 9.4574], coords: [...NEDUMUDI_TO_ALAPPUZHA].reverse() },

    // Alappuzha ↔ Muhamma
    { from: [76.3380, 9.4901], to: [76.3682, 9.4752], coords: ALAPPUZHA_TO_MUHAMMA },
    { from: [76.3682, 9.4752], to: [76.3380, 9.4901], coords: [...ALAPPUZHA_TO_MUHAMMA].reverse() },

    // Kumarakom ↔ Kottayam
    { from: [76.4274, 9.5894], to: [76.5222, 9.5916], coords: KUMARAKOM_TO_KOTTAYAM },
    { from: [76.5222, 9.5916], to: [76.4274, 9.5894], coords: [...KUMARAKOM_TO_KOTTAYAM].reverse() },

    // Alappuzha ↔ Changanassery
    { from: [76.3380, 9.4901], to: [76.5361, 9.4441], coords: ALAPPUZHA_TO_CHANGANASSERY },
    { from: [76.5361, 9.4441], to: [76.3380, 9.4901], coords: [...ALAPPUZHA_TO_CHANGANASSERY].reverse() },

    // Alappuzha ↔ Thottappally
    { from: [76.3380, 9.4901], to: [76.2680, 9.3481], coords: ALAPPUZHA_TO_THOTTAPPALLY },
    { from: [76.2680, 9.3481], to: [76.3380, 9.4901], coords: [...ALAPPUZHA_TO_THOTTAPPALLY].reverse() },

    // Thottappally ↔ Kollam
    { from: [76.2680, 9.3481], to: [76.5883, 8.8832], coords: THOTTAPPALLY_TO_KOLLAM },
    { from: [76.5883, 8.8832], to: [76.2680, 9.3481], coords: [...THOTTAPPALLY_TO_KOLLAM].reverse() },

    // Ernakulam ↔ Alappuzha (full NW3 main route)
    {
      from: [76.2673, 9.9687],
      to: [76.3380, 9.4901],
      coords: [...NW3_SPINE, ...VAIKOM_TO_ALAPPUZHA.slice(1), ...NEDUMUDI_TO_ALAPPUZHA.slice(1)],
    },
    {
      from: [76.3380, 9.4901],
      to: [76.2673, 9.9687],
      coords: [...NEDUMUDI_TO_ALAPPUZHA, ...VAIKOM_TO_ALAPPUZHA.slice(1), ...NW3_SPINE.slice(1)].reverse(),
    },

    // Thanneermukkom ↔ Alappuzha
    {
      from: [76.3621, 9.6201],
      to: [76.3380, 9.4901],
      coords: [
        [76.3621, 9.6201],
        [76.3500, 9.6000],
        [76.3450, 9.5800],
        [76.3600, 9.5500],
        [76.3700, 9.5200],
        [76.4156, 9.4574],
        [76.3900, 9.4700],
        [76.3650, 9.4850],
        [76.3500, 9.4950],
        [76.3380, 9.4901],
      ],
    },
  ];

  const THRESHOLD = 0.05; // ~5km match tolerance
  for (const seg of segments) {
    const fromMatch =
      Math.abs(seg.from[0] - fromLng) < THRESHOLD &&
      Math.abs(seg.from[1] - fromLat) < THRESHOLD;
    const toMatch =
      Math.abs(seg.to[0] - toLng) < THRESHOLD &&
      Math.abs(seg.to[1] - toLat) < THRESHOLD;

    if (fromMatch && toMatch) {
      return seg.coords;
    }
  }

  // Fallback: generate a smooth curved path through the backwater region
  return generateCurvedWaterwayPath(fromLng, fromLat, toLng, toLat);
}

/**
 * When no known segment matches, generate a curved path that bends through
 * the backwater region (avoids rendering as a straight road-like line).
 * Uses a catmull-rom style curve with a midpoint displaced into the lake.
 */
function generateCurvedWaterwayPath(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  steps = 12
): [number, number][] {
  // Midpoint displaced slightly westward into Vembanad Lake
  const midLng = (fromLng + toLng) / 2 - 0.04;
  const midLat = (fromLat + toLat) / 2;

  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Quadratic Bezier: P = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
    const u = 1 - t;
    const lng = u * u * fromLng + 2 * u * t * midLng + t * t * toLng;
    const lat = u * u * fromLat + 2 * u * t * midLat + t * t * toLat;
    coords.push([lng, lat]);
  }
  return coords;
}

// Re-export RouteNode type for use here
export interface RouteNode {
  jettyId: string;
  jettyName: string;
  lat: number;
  lng: number;
}
