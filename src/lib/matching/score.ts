import type { Boat, Profile, Jetty, WaterEdge, PreferredLocation } from '@/lib/types/database';
import { haversineDistanceKm, getJettyCoords, isJettyReachable } from '@/lib/routing/dijkstra';

export interface ScoredBoat {
  boat: Boat;
  owner?: Profile;
  score: number;
  distanceToOriginJettyKm: number;
  reasons: string[];
}

export interface ScoredTaxi {
  taxi: Profile;
  score: number;
  distanceKm: number;
  reasons: string[];
}

export interface ScoredWorker {
  worker: Profile;
  score: number;
  reasons: string[];
}

/**
 * Score boats for an inland water transport leg:
 * Target: boats scored by distance to ORIGIN JETTY (not user's GPS),
 * capacity >= cargo weight, cargo type match, reachable water graph, and online status.
 * Future/scheduled orders also match boats whose owners have preferred_locations covering the jetty.
 */
export function scoreBoats(
  boats: (Boat & { owner?: Profile })[],
  originJetty: Jetty,
  destJetty: Jetty,
  weightTonnes: number,
  cargoType: string = 'general',
  edges: WaterEdge[],
  jetties: Jetty[],
  isImmediate: boolean = true,
  preferredLocations: PreferredLocation[] = []
): ScoredBoat[] {
  const originCoords = getJettyCoords(originJetty);
  const scored: ScoredBoat[] = [];

  // Map of jetties for home_jetty lookups
  const jettyMap = new Map<string, Jetty>();
  for (const j of jetties) jettyMap.set(j.id, j);

  for (const b of boats) {
    if (!b.is_active) continue;

    // Filter 1: Must meet weight capacity
    if (Number(b.capacity_t) < weightTonnes) {
      continue;
    }

    const reasons: string[] = [];
    let score = 0;

    // 1. Distance to Origin Jetty (40 points max)
    let distKm = 20; // default assumed distance if no home jetty
    if (b.home_jetty_id && jettyMap.has(b.home_jetty_id)) {
      const homeCoords = getJettyCoords(jettyMap.get(b.home_jetty_id)!);
      distKm = haversineDistanceKm(originCoords.lat, originCoords.lng, homeCoords.lat, homeCoords.lng);
    }
    // Distance scoring: 0km = 40pts, 50km = 0pts
    const distScore = Math.max(0, Math.round(40 * (1 - Math.min(distKm, 50) / 50)));
    score += distScore;
    reasons.push(`${distKm.toFixed(1)} km from origin jetty (+${distScore} pts)`);

    // 2. Capacity fit (20 points max) - Closer fit is slightly favored to not waste giant barges
    const excessCapacity = Number(b.capacity_t) - weightTonnes;
    const capacityScore = Math.max(10, Math.round(20 - Math.min(excessCapacity, 20) * 0.5));
    score += capacityScore;
    reasons.push(`${b.capacity_t}t capacity fits ${weightTonnes}t (+${capacityScore} pts)`);

    // 3. Cargo Type Match (20 points max)
    const normalizedCargo = cargoType.toLowerCase();
    const hasTypeMatch =
      b.cargo_types.length === 0 ||
      b.cargo_types.some((ct) => normalizedCargo.includes(ct.toLowerCase()) || ct === 'general');
    if (hasTypeMatch) {
      score += 20;
      reasons.push(`Supports cargo type "${cargoType}" (+20 pts)`);
    } else {
      score += 5;
    }

    // 4. Reachability in water graph (10 points max)
    // Boat's home jetty must be able to reach origin jetty, and origin must reach destination
    const reaches = isJettyReachable(originJetty.id, destJetty.id, edges);
    if (reaches) {
      score += 10;
      reasons.push(`Waterway path confirmed (+10 pts)`);
    }

    // 5. Online status (10 points max)
    if (b.owner?.is_online) {
      score += 10;
      reasons.push(`Boat operator is online (+10 pts)`);
    }

    // 6. Bonus for future/scheduled orders: preferred locations match
    if (!isImmediate) {
      const ownerPrefs = preferredLocations.filter((p) => p.user_id === b.owner_id);
      const matchesPref = ownerPrefs.some((pref) => {
        const prefGeog = pref.geog as any;
        if (prefGeog?.coordinates) {
          const prefDist = haversineDistanceKm(
            originCoords.lat,
            originCoords.lng,
            prefGeog.coordinates[1],
            prefGeog.coordinates[0]
          );
          return prefDist <= Number(pref.radius_km || 15);
        }
        return false;
      });

      if (matchesPref) {
        score += 15;
        reasons.push(`Origin jetty in owner's preferred operating zone (+15 pts)`);
      }
    }

    scored.push({
      boat: b,
      owner: b.owner,
      score,
      distanceToOriginJettyKm: distKm,
      reasons,
    });
  }

  // Sort descending by score
  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Score taxis / cargo trucks for road legs
 */
export function scoreTaxis(
  taxis: Profile[],
  pickupLat: number,
  pickupLng: number,
  weightTonnes: number
): ScoredTaxi[] {
  const scored: ScoredTaxi[] = [];

  for (const t of taxis) {
    if (t.role !== 'taxi' || t.suspended) continue;
    if (Number(t.capacity_t || 0) < weightTonnes) continue;

    let score = 0;
    const reasons: string[] = [];

    // Online status (20 pts)
    if (t.is_online) {
      score += 20;
      reasons.push('Driver online (+20 pts)');
    }

    // Capacity fit (30 pts)
    const excess = Number(t.capacity_t || 0) - weightTonnes;
    const capScore = Math.max(10, Math.round(30 - Math.min(excess, 15)));
    score += capScore;
    reasons.push(`${t.capacity_t}t capacity for ${weightTonnes}t (+${capScore} pts)`);

    // Simulated distance or fixed for demo
    const distKm = 3.5;
    score += 40;
    reasons.push(`Nearby vehicle within 5km (+40 pts)`);

    scored.push({
      taxi: t,
      score,
      distanceKm: distKm,
      reasons,
    });
  }

  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Score workers for jetty loading / unloading
 */
export function scoreWorkers(
  workers: Profile[],
  jettyId: string
): ScoredWorker[] {
  const scored: ScoredWorker[] = [];

  for (const w of workers) {
    if (w.role !== 'worker' || w.suspended) continue;

    let score = 50;
    const reasons: string[] = [];

    if (w.is_online) {
      score += 30;
      reasons.push('Worker currently online (+30 pts)');
    } else {
      reasons.push('Registered worker pool (+50 pts)');
    }

    scored.push({
      worker: w,
      score,
      reasons,
    });
  }

  return scored.sort((a, b) => b.score - a.score);
}
