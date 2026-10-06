'use client';

import { useState, useEffect } from 'react';
import type { Rate } from '@/lib/types/database';

export default function AdminRatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  async function loadRates() {
    try {
      const res = await fetch('/api/admin/rates');
      if (res.ok) {
        const data = await res.json();
        setRates(data.rates || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRates();
  }, []);

  const handleValueChange = (key: string, val: number) => {
    setRates((prev) =>
      prev.map((r) => (r.key === key ? { ...r, value: val } : r))
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      const res = await fetch('/api/admin/rates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rates: rates.map((r) => ({ key: r.key, value: r.value })),
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Live simulation for Kochi -> Alappuzha (8 tonnes, 65km road, 80km water)
  const getRateVal = (k: string, def: number) => {
    const found = rates.find((r) => r.key === k);
    return found ? Number(found.value) : def;
  };

  const simRoadCost = Math.round(getRateVal('road_cost_per_tonne_km', 6) * 65 * 8);
  const simWaterFreight = Math.round(getRateVal('water_cost_per_tonne_km', 3.5) * 80 * 8);
  const simLoading = Math.round(getRateVal('water_loading_charge_per_tonne', 150) * 8 * 2);
  const simTotalWater = simWaterFreight + simLoading;
  const simRoadCo2 = Number((getRateVal('co2_road_per_tonne_km', 0.062) * 65 * 8).toFixed(1));
  const simWaterCo2 = Number((getRateVal('co2_water_per_tonne_km', 0.016) * 80 * 8).toFixed(1));

  const categories = ['water', 'taxi', 'road', 'co2'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-primary">Tariff & Environmental Factor Administration</h2>
          <p className="text-xs text-secondary">
            Configure baseline per-tonne-km freight costs, taxi base charges, and carbon emission multipliers
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving || loading}
          className="btn btn-primary text-xs py-2 px-4 shadow-sm"
        >
          {saving ? 'Saving Changes...' : 'Save All Rate Changes ✓'}
        </button>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold">
          ✓ All platform rates updated and applied across active routing calculations!
        </div>
      )}

      {/* Live Impact Preview Card */}
      <div className="card p-5 bg-accent-light/30 border border-accent rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs text-accent uppercase tracking-wider">
            Live Scenario Simulator: Kochi ➔ Alappuzha (8 Tonnes Building Material)
          </h3>
          <span className="text-[10px] text-secondary">Dynamically updates as you adjust values below</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
          <div className="p-2.5 bg-surface rounded-lg border border-default">
            <p className="text-secondary text-[11px]">Direct Road Cost</p>
            <p className="text-base font-bold text-primary">₹{simRoadCost.toLocaleString()}</p>
          </div>
          <div className="p-2.5 bg-surface rounded-lg border border-default">
            <p className="text-secondary text-[11px]">Waterway Multi-Modal</p>
            <p className="text-base font-bold text-accent">₹{simTotalWater.toLocaleString()}</p>
          </div>
          <div className="p-2.5 bg-surface rounded-lg border border-default">
            <p className="text-secondary text-[11px]">Net Savings</p>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              ₹{(simRoadCost - simTotalWater).toLocaleString()} ({Math.round(((simRoadCost - simTotalWater) / simRoadCost) * 100)}%)
            </p>
          </div>
          <div className="p-2.5 bg-surface rounded-lg border border-default">
            <p className="text-secondary text-[11px]">CO₂ Abated</p>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {(simRoadCo2 - simWaterCo2).toFixed(1)} kg CO₂
            </p>
          </div>
        </div>
      </div>

      {/* Rates Table / Groups */}
      {loading ? (
        <div className="py-16 text-center text-xs text-secondary">
          <div className="spinner mx-auto mb-2" style={{ width: 24, height: 24 }} />
          Loading tariff tables...
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => {
            const catRates = rates.filter((r) => r.category === cat);
            if (catRates.length === 0) return null;

            return (
              <div key={cat} className="card p-5 bg-surface border border-default rounded-xl space-y-3">
                <h3 className="font-bold text-sm text-primary uppercase tracking-wide border-b border-default pb-2">
                  {cat === 'co2' ? 'CO₂ Emission Multipliers' : `${cat} Transport Factors`}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catRates.map((r) => (
                    <div key={r.key} className="p-3 bg-main rounded-lg border border-default space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-primary">{r.key}</span>
                        <span className="text-[11px] text-secondary font-mono">{r.unit}</span>
                      </div>
                      <p className="text-[11px] text-secondary">{r.description}</p>
                      <div className="pt-1">
                        <input
                          type="number"
                          step={cat === 'co2' ? '0.001' : '0.5'}
                          value={r.value}
                          onChange={(e) => handleValueChange(r.key, parseFloat(e.target.value) || 0)}
                          className="input text-xs font-mono py-1 w-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
