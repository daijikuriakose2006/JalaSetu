'use client';

import { useState } from 'react';
import type { VehicleType } from '@/lib/types/database';
import { recommendVehicleType } from '@/lib/routing/costs';

export interface BookingDetails {
  cargo_name: string;
  cargo_description?: string;
  weight_tonnes: number;
  needs_loading_unloading: boolean;
  pickup_time_preset: 'now' | 'today' | 'custom';
  custom_datetime?: string;
  origin_address: string;
  destination_address: string;
  selected_vehicle: VehicleType;
  selected_ship_type: string;
}

interface ConfirmationCardProps {
  initialData: Partial<BookingDetails>;
  onPlanRoute: (details: BookingDetails) => Promise<void>;
  loading: boolean;
}

const SHIP_OPTIONS = [
  { id: 'country_craft', name: 'Traditional Country Craft', capacityT: 5, maxKg: 5000, desc: 'Ideal for light cargo, small canals' },
  { id: 'bulk_cargo_barge', name: 'Bulk Cargo Barge', capacityT: 15, maxKg: 15000, desc: 'Standard for building materials & sand' },
  { id: 'deck_barge', name: 'Heavy Deck Cargo Barge', capacityT: 50, maxKg: 50000, desc: 'Large scale containers and steel' },
  { id: 'river_tug_barge', name: 'Tug-Assisted River Barge', capacityT: 100, maxKg: 100000, desc: 'Industrial bulk shipment' },
];

const VEHICLE_OPTIONS: { id: VehicleType; name: string; capacityT: number; maxKg: number }[] = [
  { id: 'auto', name: 'Auto-Rickshaw Goods', capacityT: 0.8, maxKg: 800 },
  { id: 'pickup', name: 'Pickup Truck', capacityT: 2.5, maxKg: 2500 },
  { id: 'mini_truck', name: 'Mini Truck', capacityT: 5.0, maxKg: 5000 },
  { id: 'truck', name: 'Heavy Freight Truck', capacityT: 12.0, maxKg: 12000 },
  { id: 'trailer', name: 'Multi-Axle Trailer', capacityT: 25.0, maxKg: 25000 },
];

export default function ConfirmationCard({
  initialData,
  onPlanRoute,
  loading,
}: ConfirmationCardProps) {
  const [formData, setFormData] = useState<BookingDetails>({
    cargo_name: initialData.cargo_name || 'Building Material',
    cargo_description: initialData.cargo_description || '',
    weight_tonnes: Number(initialData.weight_tonnes) || 8,
    needs_loading_unloading: initialData.needs_loading_unloading ?? true,
    pickup_time_preset: (initialData.pickup_time_preset as any) || 'now',
    custom_datetime: initialData.custom_datetime || '',
    origin_address: initialData.origin_address || 'Kochi, Kerala',
    destination_address: initialData.destination_address || 'Alappuzha, Kerala',
    selected_vehicle: initialData.selected_vehicle || recommendVehicleType(Number(initialData.weight_tonnes) || 8),
    selected_ship_type: initialData.selected_ship_type || (Number(initialData.weight_tonnes || 8) <= 5 ? 'country_craft' : 'bulk_cargo_barge'),
  });

  const weight = Number(formData.weight_tonnes) || 1;
  const recommendedVehicle = recommendVehicleType(weight);
  const recommendedShip = weight <= 5 ? 'country_craft' : weight <= 15 ? 'bulk_cargo_barge' : 'deck_barge';

  const handleWeightChange = (newWeight: number) => {
    setFormData((prev) => ({
      ...prev,
      weight_tonnes: newWeight,
      selected_vehicle: recommendVehicleType(newWeight),
      selected_ship_type: newWeight <= 5 ? 'country_craft' : newWeight <= 15 ? 'bulk_cargo_barge' : 'deck_barge',
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPlanRoute(formData);
  };

  return (
    <div className="card p-5 bg-surface border border-default rounded-xl shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-default">
        <div>
          <h3 className="font-semibold text-primary text-base">Shipment Confirmation</h3>
          <p className="text-xs text-secondary">
            Review and adjust extracted cargo specifications before route planning
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-accent-light text-accent">
          Editable
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cargo Name & Weight */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="label text-xs">Cargo / Commodity Name</label>
            <input
              type="text"
              value={formData.cargo_name}
              onChange={(e) => setFormData({ ...formData, cargo_name: e.target.value })}
              className="input text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="label text-xs flex justify-between">
              <span>Total Weight (Tonnes)</span>
              <span className="text-accent font-semibold">{weight * 1000} kg</span>
            </label>
            <input
              type="number"
              value={formData.weight_tonnes}
              onChange={(e) => handleWeightChange(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              step="0.5"
              min="0.1"
              className="input text-sm"
              required
            />
          </div>
        </div>

        {/* Origin & Destination */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="label text-xs">Pickup Location (Origin)</label>
            <input
              type="text"
              value={formData.origin_address}
              onChange={(e) => setFormData({ ...formData, origin_address: e.target.value })}
              className="input text-sm"
              placeholder="e.g. Kochi, Kerala"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="label text-xs">Drop Location (Destination)</label>
            <input
              type="text"
              value={formData.destination_address}
              onChange={(e) => setFormData({ ...formData, destination_address: e.target.value })}
              className="input text-sm"
              placeholder="e.g. Alappuzha, Kerala"
              required
            />
          </div>
        </div>

        {/* Pickup Time & Helpers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-main rounded-lg border border-default">
          <div className="space-y-1">
            <label className="label text-xs">Pickup Date / Time</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, pickup_time_preset: 'now' })}
                className={`flex-1 py-1 px-2 text-xs rounded-md border ${
                  formData.pickup_time_preset === 'now'
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface text-secondary border-default'
                }`}
              >
                Immediate (Now)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, pickup_time_preset: 'today' })}
                className={`flex-1 py-1 px-2 text-xs rounded-md border ${
                  formData.pickup_time_preset === 'today'
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface text-secondary border-default'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, pickup_time_preset: 'custom' })}
                className={`flex-1 py-1 px-2 text-xs rounded-md border ${
                  formData.pickup_time_preset === 'custom'
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface text-secondary border-default'
                }`}
              >
                Pick Date
              </button>
            </div>
            {formData.pickup_time_preset === 'custom' && (
              <input
                type="datetime-local"
                value={formData.custom_datetime}
                onChange={(e) => setFormData({ ...formData, custom_datetime: e.target.value })}
                className="input text-xs mt-1"
                required
              />
            )}
          </div>

          <div className="flex items-center pt-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-primary">
              <input
                type="checkbox"
                checked={formData.needs_loading_unloading}
                onChange={(e) =>
                  setFormData({ ...formData, needs_loading_unloading: e.target.checked })
                }
                className="w-4 h-4 rounded text-accent focus:ring-accent"
              />
              <span>Include Loading & Unloading Crew (+₹150/tonne)</span>
            </label>
          </div>
        </div>

        {/* SHIP / BOAT SELECTION & RECOMMENDATION (User can select & inspect capacity) */}
        <div className="space-y-1.5 p-3 rounded-lg border border-default bg-surface">
          <div className="flex items-center justify-between">
            <label className="label text-xs font-semibold text-accent">
              🚢 Inland Water Vessel Selection & Capacity Analysis
            </label>
            <span className="text-[11px] text-secondary">
              Recommended: <strong className="text-primary">{SHIP_OPTIONS.find((s) => s.id === recommendedShip)?.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SHIP_OPTIONS.map((ship) => {
              const isRecommended = ship.id === recommendedShip;
              const isSelected = formData.selected_ship_type === ship.id;
              const canFit = ship.capacityT >= weight;

              return (
                <div
                  key={ship.id}
                  onClick={() => canFit && setFormData({ ...formData, selected_ship_type: ship.id })}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    !canFit
                      ? 'opacity-40 cursor-not-allowed border-default bg-main'
                      : isSelected
                      ? 'border-accent bg-accent-light/40 shadow-xs'
                      : 'border-default hover:border-accent/60 bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-primary">{ship.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-default text-accent">
                      Max {ship.capacityT}t ({ship.maxKg.toLocaleString()} kg)
                    </span>
                  </div>
                  <p className="text-[11px] text-secondary">{ship.desc}</p>
                  {isRecommended && (
                    <span className="inline-block mt-1 text-[10px] text-accent font-semibold">
                      ✓ AI Recommended for {weight} tonnes
                    </span>
                  )}
                  {!canFit && (
                    <span className="inline-block mt-1 text-[10px] text-red-500">
                      ✗ Insufficient capacity (requires {weight}t)
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ROAD TAXI / TRUCK SELECTION & RECOMMENDATION */}
        <div className="space-y-1.5 p-3 rounded-lg border border-default bg-surface">
          <div className="flex items-center justify-between">
            <label className="label text-xs font-semibold text-primary">
              🚛 Road Taxi / Truck Recommendation (First & Last Mile)
            </label>
            <span className="text-[11px] text-secondary">
              Recommended: <strong className="text-primary">{VEHICLE_OPTIONS.find((v) => v.id === recommendedVehicle)?.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {VEHICLE_OPTIONS.map((veh) => {
              const isRecommended = veh.id === recommendedVehicle;
              const isSelected = formData.selected_vehicle === veh.id;
              const canFit = veh.capacityT >= weight;

              return (
                <button
                  key={veh.id}
                  type="button"
                  disabled={!canFit}
                  onClick={() => setFormData({ ...formData, selected_vehicle: veh.id })}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    !canFit
                      ? 'opacity-30 cursor-not-allowed border-default'
                      : isSelected
                      ? 'border-accent bg-accent text-white'
                      : 'border-default hover:border-accent text-primary bg-surface'
                  }`}
                >
                  <div className="font-medium text-[11px] truncate">{veh.name}</div>
                  <div className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-secondary'}`}>
                    Up to {veh.capacityT}t
                  </div>
                  {isRecommended && canFit && (
                    <div className={`text-[9px] font-bold ${isSelected ? 'text-white' : 'text-accent'}`}>
                      ★ Best Fit
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full py-2.5 text-sm font-semibold mt-2"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="spinner" style={{ width: 16, height: 16 }} />
              Calculating Multi-Modal Routes & Savings...
            </span>
          ) : (
            'Calculate Multi-Modal Route & Compare →'
          )}
        </button>
      </form>
    </div>
  );
}
