import type { Jetty, WaterEdge, VehicleType } from '@/lib/types/database';
import { findNearestJetty, findWaterRoute, getJettyCoords } from './dijkstra';
import { getRoadRoute, type RoadRouteResult } from './road';
import { getWaterwayGeometry } from './waterway-geometry';
import {
  calculateRoadLegCost,
  calculateDirectRoadCost,
  calculateWaterCost,
  calculateLoadingCharge,
  calculateCO2,
  recommendVehicleType,
  recommendBoatType,
  type RateMap,
  DEFAULT_RATES,
} from './costs';

export interface PlannedLeg {
  leg_type: 'road_origin' | 'water' | 'road_destination';
  sequence_num: number;
  from_name: string;
  to_name: string;
  from_coords: [number, number]; // [lat, lng]
  to_coords: [number, number];
  distance_km: number;
  duration_min: number;
  cost: number;
  co2_kg: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat]
  };
  recommended_vehicle?: VehicleType;
  from_jetty_id?: string;
  to_jetty_id?: string;
}

export interface RoutePlanResponse {
  legs: PlannedLeg[];
  water_totals: {
    distance_km: number;
    duration_min: number;
    cost: number;
    co2_kg: number;
  };
  road_direct: {
    distance_km: number;
    duration_min: number;
    cost: number;
    co2_kg: number;
    geometry: {
      type: 'LineString';
      coordinates: [number, number][];
    };
  };
  savings: {
    cost_saved: number;
    cost_saved_percent: number;
    co2_saved_kg: number;
    co2_saved_percent: number;
  };
  origin_jetty: Jetty;
  dest_jetty: Jetty;
  recommended_origin_vehicle: VehicleType;
  recommended_dest_vehicle: VehicleType;
  recommended_boat_type: string;
}

export async function planMultiLegRoute(
  origin: { lat: number; lng: number; address: string },
  destination: { lat: number; lng: number; address: string },
  weightTonnes: number,
  needsLoadingUnloading: boolean,
  jetties: Jetty[],
  edges: WaterEdge[],
  rates: RateMap = DEFAULT_RATES,
  cargoType?: string
): Promise<RoutePlanResponse | null> {
  if (!jetties || jetties.length === 0) return null;

  // 1. Find nearest jetties
  const nearestOrigin = findNearestJetty(origin.lat, origin.lng, jetties);
  const nearestDest = findNearestJetty(destination.lat, destination.lng, jetties);

  if (!nearestOrigin || !nearestDest) return null;

  const originJetty = nearestOrigin.jetty;
  const destJetty = nearestDest.jetty;
  const originJettyCoords = getJettyCoords(originJetty);
  const destJettyCoords = getJettyCoords(destJetty);

  // 2. Find water route via Dijkstra
  const waterRoute = findWaterRoute(jetties, edges, originJetty.id, destJetty.id);
  if (!waterRoute) {
    // Cannot reach by water
    return null;
  }

  const originVehicle = recommendVehicleType(weightTonnes);
  const destVehicle = recommendVehicleType(weightTonnes);
  const boatRecommendation = recommendBoatType(weightTonnes, cargoType);

  const legs: PlannedLeg[] = [];
  let seq = 1;

  // 3. Road Origin Leg (if origin is > 500m from origin jetty)
  const originJettyDistDirect = nearestOrigin.distanceKm;
  let originRoadResult: RoadRouteResult | null = null;

  if (originJettyDistDirect > 0.5) {
    originRoadResult = await getRoadRoute(
      origin.lat,
      origin.lng,
      originJettyCoords.lat,
      originJettyCoords.lng
    );
    const cost = calculateRoadLegCost(originRoadResult.distance_km, originVehicle, rates);
    const co2 = calculateCO2(originRoadResult.distance_km, weightTonnes, 'road_taxi', rates);

    legs.push({
      leg_type: 'road_origin',
      sequence_num: seq++,
      from_name: origin.address,
      to_name: originJetty.name,
      from_coords: [origin.lat, origin.lng],
      to_coords: [originJettyCoords.lat, originJettyCoords.lng],
      distance_km: originRoadResult.distance_km,
      duration_min: originRoadResult.duration_min,
      cost,
      co2_kg: co2,
      geometry: originRoadResult.geometry,
      recommended_vehicle: originVehicle,
      to_jetty_id: originJetty.id,
    });
  }

  // 4. Water Leg — use real backwater canal geometry instead of straight lines
  const waterCoords = getWaterwayGeometry(
    originJettyCoords.lat,
    originJettyCoords.lng,
    destJettyCoords.lat,
    destJettyCoords.lng,
    waterRoute.path  // Dijkstra path nodes used to stitch multi-hop geometry
  );
  const waterFreightCost = calculateWaterCost(waterRoute.totalDistanceKm, weightTonnes, rates);
  const loadingCost = needsLoadingUnloading ? calculateLoadingCharge(weightTonnes, rates) * 2 : 0; // load + unload
  const totalWaterLegCost = waterFreightCost + loadingCost;
  const waterCO2 = calculateCO2(waterRoute.totalDistanceKm, weightTonnes, 'water', rates);

  legs.push({
    leg_type: 'water',
    sequence_num: seq++,
    from_name: originJetty.name,
    to_name: destJetty.name,
    from_coords: [originJettyCoords.lat, originJettyCoords.lng],
    to_coords: [destJettyCoords.lat, destJettyCoords.lng],
    distance_km: waterRoute.totalDistanceKm,
    duration_min: waterRoute.totalDurationMin,
    cost: totalWaterLegCost,
    co2_kg: waterCO2,
    geometry: {
      type: 'LineString',
      coordinates: waterCoords,
    },
    from_jetty_id: originJetty.id,
    to_jetty_id: destJetty.id,
  });

  // 5. Road Destination Leg (if destination is > 500m from dest jetty)
  const destJettyDistDirect = nearestDest.distanceKm;
  let destRoadResult: RoadRouteResult | null = null;

  if (destJettyDistDirect > 0.5) {
    destRoadResult = await getRoadRoute(
      destJettyCoords.lat,
      destJettyCoords.lng,
      destination.lat,
      destination.lng
    );
    const cost = calculateRoadLegCost(destRoadResult.distance_km, destVehicle, rates);
    const co2 = calculateCO2(destRoadResult.distance_km, weightTonnes, 'road_taxi', rates);

    legs.push({
      leg_type: 'road_destination',
      sequence_num: seq++,
      from_name: destJetty.name,
      to_name: destination.address,
      from_coords: [destJettyCoords.lat, destJettyCoords.lng],
      to_coords: [destination.lat, destination.lng],
      distance_km: destRoadResult.distance_km,
      duration_min: destRoadResult.duration_min,
      cost,
      co2_kg: co2,
      geometry: destRoadResult.geometry,
      recommended_vehicle: destVehicle,
      from_jetty_id: destJetty.id,
    });
  }

  // 6. Direct Road Route for Comparison
  const directRoad = await getRoadRoute(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng
  );
  const directRoadCost = calculateDirectRoadCost(directRoad.distance_km, weightTonnes, rates);
  const directRoadCO2 = calculateCO2(directRoad.distance_km, weightTonnes, 'road_direct', rates);

  // 7. Sum up water multi-modal plan
  const totalWaterDistance = Number(legs.reduce((acc, l) => acc + l.distance_km, 0).toFixed(1));
  const totalWaterDuration = legs.reduce((acc, l) => acc + l.duration_min, 0);
  const totalWaterCost = legs.reduce((acc, l) => acc + l.cost, 0);
  const totalWaterCO2 = Number(legs.reduce((acc, l) => acc + l.co2_kg, 0).toFixed(1));

  const costSaved = Math.max(0, directRoadCost - totalWaterCost);
  const costSavedPercent = directRoadCost > 0 ? Math.round((costSaved / directRoadCost) * 100) : 0;

  const co2Saved = Number(Math.max(0, directRoadCO2 - totalWaterCO2).toFixed(1));
  const co2SavedPercent = directRoadCO2 > 0 ? Math.round((co2Saved / directRoadCO2) * 100) : 0;

  return {
    legs,
    water_totals: {
      distance_km: totalWaterDistance,
      duration_min: totalWaterDuration,
      cost: totalWaterCost,
      co2_kg: totalWaterCO2,
    },
    road_direct: {
      distance_km: directRoad.distance_km,
      duration_min: directRoad.duration_min,
      cost: directRoadCost,
      co2_kg: directRoadCO2,
      geometry: directRoad.geometry,
    },
    savings: {
      cost_saved: costSaved,
      cost_saved_percent: costSavedPercent,
      co2_saved_kg: co2Saved,
      co2_saved_percent: co2SavedPercent,
    },
    origin_jetty: originJetty,
    dest_jetty: destJetty,
    recommended_origin_vehicle: originVehicle,
    recommended_dest_vehicle: destVehicle,
    recommended_boat_type: boatRecommendation,
  };
}
