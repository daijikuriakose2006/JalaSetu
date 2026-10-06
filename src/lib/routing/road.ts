import { haversineDistanceKm } from './dijkstra';

export interface RoadRouteResult {
  distance_km: number;
  duration_min: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat]
  };
  source: 'osrm' | 'ors' | 'haversine_fallback';
}

/**
 * Fetch road route from public OSRM server
 * Note: OSRM expects coordinates in {lng},{lat} order
 */
export async function getRouteOSRM(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RoadRouteResult | null> {
  const baseUrl = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
  const url = `${baseUrl}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': process.env.NOMINATIM_USER_AGENT || 'JalaSetu/1.0 (contact@jalasetu.in)',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distance_km: Number((route.distance / 1000).toFixed(2)),
        duration_min: Math.round(route.duration / 60),
        geometry: route.geometry,
        source: 'osrm',
      };
    }
    return null;
  } catch (err) {
    console.warn('OSRM route failed or timed out:', err);
    return null;
  }
}

/**
 * Fetch road route from OpenRouteService (fallback)
 */
export async function getRouteORS(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RoadRouteResult | null> {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) return null;

  const baseUrl = process.env.ORS_BASE_URL || 'https://api.openrouteservice.org';
  const url = `${baseUrl}/v2/directions/driving-car/geojson`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [
          [fromLng, fromLat],
          [toLng, toLat],
        ],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (data.features && data.features.length > 0) {
      const feat = data.features[0];
      const summary = feat.properties?.summary;
      return {
        distance_km: Number(((summary?.distance || 0) / 1000).toFixed(2)),
        duration_min: Math.round((summary?.duration || 0) / 60),
        geometry: feat.geometry,
        source: 'ors',
      };
    }
    return null;
  } catch (err) {
    console.warn('ORS route failed:', err);
    return null;
  }
}

/**
 * Get road route with fallback chain:
 * 1. OSRM
 * 2. OpenRouteService
 * 3. Haversine straight line approximation (with 1.35x road circuity factor)
 */
export async function getRoadRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RoadRouteResult> {
  // If points are extremely close (< 50m)
  const directDist = haversineDistanceKm(fromLat, fromLng, toLat, toLng);
  if (directDist < 0.05) {
    return {
      distance_km: 0,
      duration_min: 0,
      geometry: {
        type: 'LineString',
        coordinates: [
          [fromLng, fromLat],
          [toLng, toLat],
        ],
      },
      source: 'haversine_fallback',
    };
  }

  // 1. Try OSRM
  const osrmResult = await getRouteOSRM(fromLat, fromLng, toLat, toLng);
  if (osrmResult) return osrmResult;

  // 2. Try ORS
  const orsResult = await getRouteORS(fromLat, fromLng, toLat, toLng);
  if (orsResult) return orsResult;

  // 3. Robust mathematical fallback
  // Kerala road circuity factor is typically ~1.3-1.4x straight line distance
  const estimatedRoadKm = Number((directDist * 1.35).toFixed(2));
  // Average Kerala road speed ~35 km/h
  const estimatedMin = Math.round((estimatedRoadKm / 35) * 60);

  return {
    distance_km: estimatedRoadKm,
    duration_min: Math.max(5, estimatedMin),
    geometry: {
      type: 'LineString',
      coordinates: [
        [fromLng, fromLat],
        [toLng, toLat],
      ],
    },
    source: 'haversine_fallback',
  };
}
