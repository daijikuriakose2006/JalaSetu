'use client';

import type { RoutePlanResponse } from '@/lib/routing/planner';

interface ComparisonCardProps {
  plan: RoutePlanResponse;
  explanation: string;
  onConfirmOrder: (mode: 'water' | 'road') => Promise<void>;
  loading: boolean;
}

export default function ComparisonCard({
  plan,
  explanation,
  onConfirmOrder,
  loading,
}: ComparisonCardProps) {
  const { water_totals, road_direct, savings, origin_jetty, dest_jetty } = plan;

  return (
    <div className="card p-5 bg-surface border-2 border-accent/60 rounded-xl shadow-md space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default pb-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-light text-accent text-xs font-semibold mb-1">
            ⚖️ Route & Environmental Impact Analysis
          </div>
          <h3 className="text-base font-bold text-primary">Direct Road vs Inland Waterway Plan</h3>
        </div>
        <span className="text-xs text-secondary italic">All numbers shown are estimates</span>
      </div>

      {/* Side-by-side comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Direct Road */}
        <div className="p-4 rounded-xl border border-default bg-main/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚛</span>
              <h4 className="font-bold text-sm text-primary">Direct Road Freight</h4>
            </div>
            <span className="text-xs text-secondary">NH66 Highway</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-default/60">
              <span className="text-secondary">Estimated Distance</span>
              <span className="font-semibold text-primary">{road_direct.distance_km} km</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-default/60">
              <span className="text-secondary">Transit Duration</span>
              <span className="font-semibold text-primary">
                ~{Math.round(road_direct.duration_min / 60)} hrs {road_direct.duration_min % 60} mins
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-default/60">
              <span className="text-secondary">Direct Road Cost</span>
              <span className="font-bold text-primary text-sm">₹{road_direct.cost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-secondary">CO₂ Emissions</span>
              <span className="font-bold text-red-500">{road_direct.co2_kg} kg CO₂</span>
            </div>
          </div>
        </div>

        {/* Inland Waterway (Recommended) */}
        <div className="p-4 rounded-xl border-2 border-accent bg-accent-light/20 space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
            ✨ RECOMMENDED
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚢</span>
              <h4 className="font-bold text-sm text-accent">Multi-Modal Waterway Plan</h4>
            </div>
          </div>

          <p className="text-[11px] text-secondary">
            Via <strong className="text-primary">{origin_jetty.name}</strong> ➔ <strong className="text-primary">{dest_jetty.name}</strong>
          </p>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-accent/20">
              <span className="text-secondary">Waterway Route Distance</span>
              <span className="font-semibold text-primary">{water_totals.distance_km} km</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-accent/20">
              <span className="text-secondary">Transit Duration (Barge)</span>
              <span className="font-semibold text-primary">
                ~{Math.round(water_totals.duration_min / 60)} hrs {water_totals.duration_min % 60} mins
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-accent/20">
              <span className="text-secondary">Total Multi-modal Cost</span>
              <span className="font-extrabold text-accent text-base">₹{water_totals.cost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-secondary">CO₂ Emissions</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {water_totals.co2_kg} kg CO₂
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Savings Metric Bar */}
      <div className="p-3.5 rounded-lg bg-surface border border-default">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-accent">₹{savings.cost_saved.toLocaleString()}</p>
            <p className="text-[11px] text-secondary">Cost Saved</p>
          </div>
          <div>
            <p className="text-lg font-bold text-accent">{savings.cost_saved_percent}%</p>
            <p className="text-[11px] text-secondary">Cheaper vs Road</p>
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {savings.co2_saved_kg} kg
            </p>
            <p className="text-[11px] text-secondary">CO₂ Cut</p>
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {savings.co2_saved_percent}%
            </p>
            <p className="text-[11px] text-secondary">Cleaner Transport</p>
          </div>
        </div>
      </div>

      {/* Gemini Analysis Summary */}
      {explanation && (
        <div className="p-3 bg-main rounded-lg border border-default text-xs leading-relaxed text-secondary">
          <span className="font-semibold text-primary block mb-0.5">🧠 AI Feasibility Assessment:</span>
          {explanation}
        </div>
      )}

      {/* Confirmation Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => onConfirmOrder('water')}
          className="btn btn-primary flex-1 py-3 text-sm font-bold shadow-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="spinner" style={{ width: 16, height: 16 }} />
              Posting Order & Dispatching Providers...
            </span>
          ) : (
            '✓ Confirm & Book via Waterway (Save Money & CO₂)'
          )}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => onConfirmOrder('road')}
          className="btn btn-secondary py-3 text-xs font-medium"
        >
          Book Direct Road Instead
        </button>
      </div>
    </div>
  );
}
