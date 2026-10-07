/**
 * Real Kerala NW-3 backwater canal geometry.
 * All coordinates are [lng, lat] (GeoJSON convention).
 *
 * CRITICAL: Vembanad Lake is EAST of NH66 (lng ~76.30–76.45).
 * The water route goes through the lake, NOT along the coast.
 * NH66 runs at ~lng 76.23–76.27 (western coast road — avoid this!).
 */

// ── Full NW-3 spine: Ernakulam → Vaikom through Vembanad Lake ──────────────
// Goes EAST from harbor into the open lake, then south to Vaikom
const ERNAKULAM_TO_VAIKOM: [number, number][] = [
  [76.2673, 9.9687],  // Ernakulam Boat Jetty (harbor)
  [76.2780, 9.9600],  // South Ernakulam harbor channel
  [76.2900, 9.9450],  // Thevara junction (harbor opens south)
  [76.3000, 9.9200],  // Aroor channel — entering Vembanad Lake
  [76.3200, 9.8900],  // Vembanad Lake north — open water begins
  [76.3500, 9.8600],  // Vembanad Lake, heading south-east
  [76.3750, 9.8200],  // Vembanad Lake central open water
  [76.3900, 9.7800],  // Vembanad Lake, nearing Vaikom
  [76.3940, 9.7480],  // Vaikom Jetty
];

// ── Vaikom → Thanneermukkom Barrage → Kuttanad → Alappuzha ────────────────
const VAIKOM_TO_ALAPPUZHA: [number, number][] = [
  [76.3940, 9.7480],  // Vaikom Jetty
  [76.3850, 9.7200],  // South Vembanad Lake, west of Vaikom
  [76.3750, 9.7000],  // Lake narrowing toward barrage
  [76.3700, 9.6700],  // Approaching Thanneermukkom
  [76.3621, 9.6201],  // Thanneermukkom Barrage (gateway to Kuttanad)
  [76.3650, 9.5900],  // South of barrage — Kuttanad backwaters
  [76.3700, 9.5600],  // Kuttanad, heading south
  [76.3800, 9.5300],  // Kuttanad waterways — curving east
  [76.4000, 9.5000],  // Near Nedumudi
  [76.4156, 9.4574],  // Nedumudi Jetty
  [76.4000, 9.4700],  // From Nedumudi, heading west
  [76.3800, 9.4800],  // Punnamada Lake entry
  [76.3600, 9.4880],  // Punnamada Lake (Alappuzha boat race venue!)
  [76.3450, 9.4920],  // Alappuzha canal
  [76.3380, 9.4901],  // Alappuzha Boat Jetty
];

// ── Ernakulam → Alappuzha (full combined route) ───────────────────────────
const ERNAKULAM_TO_ALAPPUZHA: [number, number][] = [
  ...ERNAKULAM_TO_VAIKOM,
  ...VAIKOM_TO_ALAPPUZHA.slice(1),
];

// ── Ernakulam → Thanneermukkom ────────────────────────────────────────────
const ERNAKULAM_TO_THANNEERMUKKOM: [number, number][] = [
  ...ERNAKULAM_TO_VAIKOM,
  [76.3850, 9.7200],
  [76.3750, 9.7000],
  [76.3700, 9.6700],
  [76.3621, 9.6201],  // Thanneermukkom
];

// ── Thanneermukkom → Alappuzha ────────────────────────────────────────────
const THANNEERMUKKOM_TO_ALAPPUZHA: [number, number][] = [
  [76.3621, 9.6201],  // Thanneermukkom
  [76.3650, 9.5900],
  [76.3700, 9.5600],
  [76.3800, 9.5300],
  [76.4000, 9.5000],
  [76.4156, 9.4574],  // Nedumudi
  [76.4000, 9.4700],
  [76.3800, 9.4800],
  [76.3600, 9.4880],
  [76.3380, 9.4901],  // Alappuzha
];

// ── Alappuzha → Muhamma (south Kuttanad canal) ────────────────────────────
const ALAPPUZHA_TO_MUHAMMA: [number, number][] = [
  [76.3380, 9.4901],  // Alappuzha
  [76.3450, 9.4850],  // East canal
  [76.3500, 9.4800],  // Kuttanad south
  [76.3600, 9.4780],  // Canal continues east
  [76.3682, 9.4752],  // Muhamma Jetty
];

// ── Nedumudi → Alappuzha ──────────────────────────────────────────────────
const NEDUMUDI_TO_ALAPPUZHA: [number, number][] = [
  [76.4156, 9.4574],  // Nedumudi
  [76.4000, 9.4700],
  [76.3800, 9.4800],
  [76.3600, 9.4880],  // Punnamada Lake
  [76.3450, 9.4920],
  [76.3380, 9.4901],  // Alappuzha
];

// ── Kumarakom → Kottayam (eastern canal) ─────────────────────────────────
const KUMARAKOM_TO_KOTTAYAM: [number, number][] = [
  [76.4274, 9.5894],  // Kumarakom
  [76.4500, 9.5900],  // Kottayam canal west
  [76.4750, 9.5910],  // Canal heading east
  [76.5222, 9.5916],  // Kottayam Jetty
];

// ── Vaikom → Kumarakom (south Vembanad Lake east shore) ──────────────────
const VAIKOM_TO_KUMARAKOM: [number, number][] = [
  [76.3940, 9.7480],  // Vaikom
  [76.4100, 9.7000],  // South along east shore of Vembanad
  [76.4200, 9.6500],  // East shore, heading south
  [76.4274, 9.5894],  // Kumarakom
];

// ── Alappuzha → Changanassery (eastern backwater canal) ──────────────────
const ALAPPUZHA_TO_CHANGANASSERY: [number, number][] = [
  [76.3380, 9.4901],  // Alappuzha
  [76.3700, 9.4800],  // Canal heading east
  [76.4000, 9.4700],  // Kuttanad east
  [76.4300, 9.4600],  // Mannar canal area
  [76.4700, 9.4500],  // Changanassery canal west
  [76.5100, 9.4460],  // Approaching town
  [76.5361, 9.4441],  // Changanassery Jetty
];

// ── Alappuzha → Thottappally (south canal) ───────────────────────────────
const ALAPPUZHA_TO_THOTTAPPALLY: [number, number][] = [
  [76.3380, 9.4901],  // Alappuzha
  [76.3300, 9.4600],  // South Alappuzha canal
  [76.3100, 9.4200],  // Thakazhy area
  [76.2900, 9.3900],  // West Kuttanad, heading south
  [76.2680, 9.3481],  // Thottappally Jetty
];

// ── Thottappally → Kollam (via Kayamkulam Lake & Ashtamudi) ──────────────
const THOTTAPPALLY_TO_KOLLAM: [number, number][] = [
  [76.2680, 9.3481],  // Thottappally
  [76.2900, 9.3000],  // Canal heading southeast
  [76.3500, 9.2500],  // Kayamkulam Lake west
  [76.4200, 9.2000],  // Kayamkulam Lake center
  [76.4800, 9.1500],  // Kayamkulam Lake east
  [76.5100, 9.1000],  // Heading south
  [76.5400, 9.0500],  // Ashtamudi Lake north
  [76.5600, 9.0000],  // Ashtamudi Lake center
  [76.5800, 8.9200],  // Ashtamudi Lake south
  [76.5883, 8.8832],  // Kollam Boat Jetty
];

// ─────────────────────────────────────────────────────────────────────────

export interface RouteNode {
  jettyId: string;
  jettyName: string;
  lat: number;
  lng: number;
}

/**
 * Returns real waterway geometry (GeoJSON [lng,lat] coordinates) for a water leg.
 * Stitches real NW-3 canal segments from the Dijkstra path nodes.
 */
export function getWaterwayGeometry(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  intermediatePath?: RouteNode[]
): [number, number][] {
  if (intermediatePath && intermediatePath.length > 1) {
    // Stitch segment geometry between each consecutive pair of path nodes
    const coords: [number, number][] = [];
    for (let i = 0; i < intermediatePath.length - 1; i++) {
      const from = intermediatePath[i];
      const to = intermediatePath[i + 1];
      const seg = getSegmentGeometry(from.lng, from.lat, to.lng, to.lat);
      if (i > 0) seg.shift(); // avoid duplicating junction point
      coords.push(...seg);
    }
    return coords.length > 1 ? coords : getSegmentGeometry(fromLng, fromLat, toLng, toLat);
  }
  return getSegmentGeometry(fromLng, fromLat, toLng, toLat);
}

const THRESHOLD = 0.06; // ~6 km match tolerance

function matches(a: number, b: number) {
  return Math.abs(a - b) < THRESHOLD;
}

function getSegmentGeometry(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number
): [number, number][] {
  const segments: {
    from: [number, number];
    to: [number, number];
    coords: [number, number][];
  }[] = [
    // Ernakulam ↔ Vaikom
    { from: [76.2673, 9.9687], to: [76.3940, 9.7480], coords: ERNAKULAM_TO_VAIKOM },
    { from: [76.3940, 9.7480], to: [76.2673, 9.9687], coords: [...ERNAKULAM_TO_VAIKOM].reverse() },

    // Ernakulam ↔ Alappuzha (full)
    { from: [76.2673, 9.9687], to: [76.3380, 9.4901], coords: ERNAKULAM_TO_ALAPPUZHA },
    { from: [76.3380, 9.4901], to: [76.2673, 9.9687], coords: [...ERNAKULAM_TO_ALAPPUZHA].reverse() },

    // Vaikom ↔ Alappuzha
    { from: [76.3940, 9.7480], to: [76.3380, 9.4901], coords: VAIKOM_TO_ALAPPUZHA },
    { from: [76.3380, 9.4901], to: [76.3940, 9.7480], coords: [...VAIKOM_TO_ALAPPUZHA].reverse() },

    // Vaikom ↔ Kumarakom
    { from: [76.3940, 9.7480], to: [76.4274, 9.5894], coords: VAIKOM_TO_KUMARAKOM },
    { from: [76.4274, 9.5894], to: [76.3940, 9.7480], coords: [...VAIKOM_TO_KUMARAKOM].reverse() },

    // Kumarakom ↔ Kottayam
    { from: [76.4274, 9.5894], to: [76.5222, 9.5916], coords: KUMARAKOM_TO_KOTTAYAM },
    { from: [76.5222, 9.5916], to: [76.4274, 9.5894], coords: [...KUMARAKOM_TO_KOTTAYAM].reverse() },

    // Thanneermukkom ↔ Alappuzha
    { from: [76.3621, 9.6201], to: [76.3380, 9.4901], coords: THANNEERMUKKOM_TO_ALAPPUZHA },
    { from: [76.3380, 9.4901], to: [76.3621, 9.6201], coords: [...THANNEERMUKKOM_TO_ALAPPUZHA].reverse() },

    // Nedumudi ↔ Alappuzha
    { from: [76.4156, 9.4574], to: [76.3380, 9.4901], coords: NEDUMUDI_TO_ALAPPUZHA },
    { from: [76.3380, 9.4901], to: [76.4156, 9.4574], coords: [...NEDUMUDI_TO_ALAPPUZHA].reverse() },

    // Alappuzha ↔ Muhamma
    { from: [76.3380, 9.4901], to: [76.3682, 9.4752], coords: ALAPPUZHA_TO_MUHAMMA },
    { from: [76.3682, 9.4752], to: [76.3380, 9.4901], coords: [...ALAPPUZHA_TO_MUHAMMA].reverse() },

    // Alappuzha ↔ Changanassery
    { from: [76.3380, 9.4901], to: [76.5361, 9.4441], coords: ALAPPUZHA_TO_CHANGANASSERY },
    { from: [76.5361, 9.4441], to: [76.3380, 9.4901], coords: [...ALAPPUZHA_TO_CHANGANASSERY].reverse() },

    // Alappuzha ↔ Thottappally
    { from: [76.3380, 9.4901], to: [76.2680, 9.3481], coords: ALAPPUZHA_TO_THOTTAPPALLY },
    { from: [76.2680, 9.3481], to: [76.3380, 9.4901], coords: [...ALAPPUZHA_TO_THOTTAPPALLY].reverse() },

    // Thottappally ↔ Kollam
    { from: [76.2680, 9.3481], to: [76.5883, 8.8832], coords: THOTTAPPALLY_TO_KOLLAM },
    { from: [76.5883, 8.8832], to: [76.2680, 9.3481], coords: [...THOTTAPPALLY_TO_KOLLAM].reverse() },

    // Ernakulam ↔ Thanneermukkom
    { from: [76.2673, 9.9687], to: [76.3621, 9.6201], coords: ERNAKULAM_TO_THANNEERMUKKOM },
    { from: [76.3621, 9.6201], to: [76.2673, 9.9687], coords: [...ERNAKULAM_TO_THANNEERMUKKOM].reverse() },
  ];

  for (const seg of segments) {
    if (
      matches(seg.from[0], fromLng) && matches(seg.from[1], fromLat) &&
      matches(seg.to[0], toLng) && matches(seg.to[1], toLat)
    ) {
      return seg.coords;
    }
  }

  // Fallback: curve through Vembanad Lake (shift east into the lake, away from coast)
  return generateWaterwayFallback(fromLng, fromLat, toLng, toLat);
}

/**
 * Fallback: generate a Bezier curve that bends EAST into Vembanad Lake,
 * away from the NH66 coast road. Never produces a straight coast-hugging line.
 */
function generateWaterwayFallback(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  steps = 16
): [number, number][] {
  // Control point shifted east into the lake (+0.08 lng) and centered latitude
  const midLng = Math.max(fromLng, toLng) + 0.08;
  const midLat = (fromLat + toLat) / 2;

  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    // Quadratic Bezier: goes east through the lake, not west along the coast
    const lng = u * u * fromLng + 2 * u * t * midLng + t * t * toLng;
    const lat = u * u * fromLat + 2 * u * t * midLat + t * t * toLat;
    coords.push([lng, lat]);
  }
  return coords;
}
