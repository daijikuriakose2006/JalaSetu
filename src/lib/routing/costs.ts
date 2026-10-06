import type { VehicleType, Rate } from '@/lib/types/database';

export type RateMap = Record<string, number>;

export const DEFAULT_RATES: RateMap = {
  taxi_base_fare_auto: 30,
  taxi_per_km_auto: 12,
  taxi_base_fare_pickup: 50,
  taxi_per_km_pickup: 18,
  taxi_base_fare_mini_truck: 80,
  taxi_per_km_mini_truck: 25,
  taxi_base_fare_truck: 150,
  taxi_per_km_truck: 35,
  taxi_base_fare_trailer: 250,
  taxi_per_km_trailer: 45,
  water_cost_per_tonne_km: 3.5,
  water_loading_charge_per_tonne: 150,
  road_cost_per_tonne_km: 6.0,
  co2_road_per_tonne_km: 0.062,
  co2_water_per_tonne_km: 0.016,
  co2_taxi_per_km: 0.12,
};

export function ratesArrayToMap(rates?: Rate[] | null): RateMap {
  const map: RateMap = { ...DEFAULT_RATES };
  if (rates && Array.isArray(rates)) {
    for (const r of rates) {
      if (r.key && !isNaN(Number(r.value))) {
        map[r.key] = Number(r.value);
      }
    }
  }
  return map;
}

/**
 * Recommend vehicle type based on cargo weight in tonnes
 */
export function recommendVehicleType(weightTonnes: number): VehicleType {
  if (weightTonnes <= 0.8) return 'auto';
  if (weightTonnes <= 2.5) return 'pickup';
  if (weightTonnes <= 5.0) return 'mini_truck';
  if (weightTonnes <= 12.0) return 'truck';
  return 'trailer';
}

/**
 * Recommend boat type based on cargo weight and type
 */
export function recommendBoatType(weightTonnes: number, cargoType?: string): string {
  const cType = (cargoType || '').toLowerCase();
  if (weightTonnes <= 5) {
    return 'Small Inland Country Craft (5t capacity)';
  } else if (weightTonnes <= 15) {
    if (cType.includes('sand') || cType.includes('building') || cType.includes('aggregate')) {
      return 'Medium Bulk Cargo Barge (15t capacity)';
    }
    return 'Standard Inland Cargo Boat (15t capacity)';
  } else if (weightTonnes <= 50) {
    return 'Heavy Inland Deck Barge (50t capacity)';
  }
  return 'Tug-Assisted River Barge (>50t capacity)';
}

/**
 * Calculate road leg cost using taxi base fare + per km by vehicle type
 */
export function calculateRoadLegCost(
  distanceKm: number,
  vehicleType: VehicleType,
  rates: RateMap = DEFAULT_RATES
): number {
  if (distanceKm <= 0) return 0;
  const baseFare = rates[`taxi_base_fare_${vehicleType}`] ?? DEFAULT_RATES[`taxi_base_fare_${vehicleType}`] ?? 80;
  const perKm = rates[`taxi_per_km_${vehicleType}`] ?? DEFAULT_RATES[`taxi_per_km_${vehicleType}`] ?? 25;
  return Math.round(baseFare + perKm * distanceKm);
}

/**
 * Calculate direct road transport cost for comparison
 * (Direct freight truck: road_cost_per_tonne_km * distance * weight)
 */
export function calculateDirectRoadCost(
  distanceKm: number,
  weightTonnes: number,
  rates: RateMap = DEFAULT_RATES
): number {
  if (distanceKm <= 0) return 0;
  const ratePerTonneKm = rates['road_cost_per_tonne_km'] ?? DEFAULT_RATES['road_cost_per_tonne_km'];
  // Minimum base logistics fee of 400
  return Math.round(Math.max(400, ratePerTonneKm * distanceKm * weightTonnes));
}

/**
 * Calculate water leg freight cost
 */
export function calculateWaterCost(
  distanceKm: number,
  weightTonnes: number,
  rates: RateMap = DEFAULT_RATES
): number {
  if (distanceKm <= 0) return 0;
  const ratePerTonneKm = rates['water_cost_per_tonne_km'] ?? DEFAULT_RATES['water_cost_per_tonne_km'];
  return Math.round(ratePerTonneKm * distanceKm * weightTonnes);
}

/**
 * Calculate loading / unloading charge
 */
export function calculateLoadingCharge(
  weightTonnes: number,
  rates: RateMap = DEFAULT_RATES
): number {
  const chargePerTonne = rates['water_loading_charge_per_tonne'] ?? DEFAULT_RATES['water_loading_charge_per_tonne'];
  return Math.round(chargePerTonne * weightTonnes);
}

/**
 * Calculate CO2 emissions in kg
 */
export function calculateCO2(
  distanceKm: number,
  weightTonnes: number,
  mode: 'road_direct' | 'road_taxi' | 'water',
  rates: RateMap = DEFAULT_RATES
): number {
  if (distanceKm <= 0) return 0;

  if (mode === 'road_direct') {
    const factor = rates['co2_road_per_tonne_km'] ?? DEFAULT_RATES['co2_road_per_tonne_km'];
    return Number((factor * distanceKm * weightTonnes).toFixed(1));
  }

  if (mode === 'water') {
    const factor = rates['co2_water_per_tonne_km'] ?? DEFAULT_RATES['co2_water_per_tonne_km'];
    return Number((factor * distanceKm * weightTonnes).toFixed(1));
  }

  // Taxi leg
  const factor = rates['co2_taxi_per_km'] ?? DEFAULT_RATES['co2_taxi_per_km'];
  return Number((factor * distanceKm).toFixed(1));
}
