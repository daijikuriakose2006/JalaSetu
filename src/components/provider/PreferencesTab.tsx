'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTheme } from '@/components/theme/ThemeProvider';
import type { ThemeMode } from '@/lib/types/database';

interface SavedLocation {
  id: string;
  name: string;
  radius_km: number;
  created_at: string;
}

interface PreferencesTabProps {
  role: 'ship_owner' | 'taxi' | 'worker';
}

const KERALA_HUBS = [
  { name: 'Ernakulam Boat Jetty', lat: 9.9687, lng: 76.2673, district: 'Ernakulam' },
  { name: 'Fort Kochi Jetty', lat: 9.9639, lng: 76.2432, district: 'Ernakulam' },
  { name: 'Willingdon Island Jetty', lat: 9.9498, lng: 76.2714, district: 'Ernakulam' },
  { name: 'Vaikom Jetty', lat: 9.7480, lng: 76.3940, district: 'Kottayam' },
  { name: 'Alappuzha Boat Jetty', lat: 9.4901, lng: 76.3380, district: 'Alappuzha' },
  { name: 'Kumarakom Jetty', lat: 9.5894, lng: 76.4274, district: 'Kottayam' },
  { name: 'Thanneermukkom Jetty', lat: 9.6201, lng: 76.3621, district: 'Alappuzha' },
  { name: 'Kottayam Jetty', lat: 9.5916, lng: 76.5222, district: 'Kottayam' },
  { name: 'Kollam Boat Jetty', lat: 8.8832, lng: 76.5883, district: 'Kollam' },
];

export default function PreferencesTab({ role }: PreferencesTabProps) {
  const { profile, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHub, setSelectedHub] = useState(KERALA_HUBS[0].name);
  const [customName, setCustomName] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [radiusKm, setRadiusKm] = useState(15);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [themeSaving, setThemeSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Load locations
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/preferences/locations');
        if (res.ok) {
          const data = await res.json();
          setLocations(data.locations || []);
        }
      } catch (err) {
        console.warn('Failed to load preferred locations:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleThemeChange = async (newTheme: ThemeMode) => {
    setTheme(newTheme);
    setThemeSaving(true);
    setStatusMsg(null);
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      });
      await refreshProfile();
      setStatusMsg(`Theme updated to ${newTheme} mode`);
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.warn(err);
    } finally {
      setThemeSaving(false);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setStatusMsg(null);

    let locationName = selectedHub;
    let lat = 9.9687;
    let lng = 76.2673;

    if (useCustom) {
      if (!customName.trim()) {
        setAdding(false);
        return;
      }
      locationName = customName.trim();
    } else {
      const found = KERALA_HUBS.find((h) => h.name === selectedHub);
      if (found) {
        lat = found.lat;
        lng = found.lng;
      }
    }

    try {
      const res = await fetch('/api/preferences/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: locationName,
          lat,
          lng,
          radius_km: radiusKm,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLocations((prev) => [data.location, ...prev]);
        setCustomName('');
        setStatusMsg(`Added ${locationName} to preferred operating locations`);
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add location');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteLocation = async (id: string, name: string) => {
    setDeletingId(id);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/preferences/locations/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setLocations((prev) => prev.filter((loc) => loc.id !== id));
        setStatusMsg(`Removed ${name}`);
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const roleTitle =
    role === 'ship_owner'
      ? 'Vessel Operator Preferences'
      : role === 'taxi'
      ? 'Cargo Taxi Driver Preferences'
      : 'Stevedore Crew Preferences';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="card p-5 bg-surface border border-default rounded-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h3 className="text-base font-bold text-primary">{roleTitle}</h3>
          </div>
          <p className="text-xs text-secondary mt-0.5">
            Manage your operating base locations, notification radius, and display theme
          </p>
        </div>
        {statusMsg && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 animate-fade-in">
            ✓ {statusMsg}
          </span>
        )}
      </div>

      {/* 1. Theme Controller: Dark Mode / White Mode */}
      <div className="card p-5 bg-surface border border-default rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-primary flex items-center gap-2">
              <span>🎨</span> Display Theme Controller
            </h4>
            <p className="text-xs text-secondary">
              Choose your dashboard visual theme (White / Dark mode)
            </p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-main border border-default text-secondary capitalize">
            Current: {theme}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-1">
          <button
            type="button"
            disabled={themeSaving}
            onClick={() => handleThemeChange('light')}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
              theme === 'light'
                ? 'bg-accent-light/30 border-accent text-accent font-bold shadow-xs ring-2 ring-accent/30'
                : 'bg-main border-default text-secondary hover:text-primary'
            }`}
          >
            <span className="text-2xl">☀️</span>
            <span className="text-xs">White / Light Mode</span>
          </button>

          <button
            type="button"
            disabled={themeSaving}
            onClick={() => handleThemeChange('dark')}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
              theme === 'dark'
                ? 'bg-accent-light/30 border-accent text-accent font-bold shadow-xs ring-2 ring-accent/30'
                : 'bg-main border-default text-secondary hover:text-primary'
            }`}
          >
            <span className="text-2xl">🌙</span>
            <span className="text-xs">Dark Mode</span>
          </button>

          <button
            type="button"
            disabled={themeSaving}
            onClick={() => handleThemeChange('system')}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
              theme === 'system'
                ? 'bg-accent-light/30 border-accent text-accent font-bold shadow-xs ring-2 ring-accent/30'
                : 'bg-main border-default text-secondary hover:text-primary'
            }`}
          >
            <span className="text-2xl">💻</span>
            <span className="text-xs">System Match</span>
          </button>
        </div>
      </div>

      {/* 2. Preferred Operating Locations */}
      <div className="card p-5 bg-surface border border-default rounded-xl space-y-5">
        <div>
          <h4 className="text-sm font-bold text-primary flex items-center gap-2">
            <span>📍</span> Preferred Operating Locations
          </h4>
          <p className="text-xs text-secondary mt-0.5">
            The automated matching engine dispatches job alerts to you first when shipments originate within your saved locations
          </p>
        </div>

        {/* Form to add location */}
        <form onSubmit={handleAddLocation} className="p-4 bg-main border border-default rounded-xl space-y-3">
          <span className="text-xs font-bold text-primary block">Add New Preferred Base / Terminal:</span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Hub Selector or Custom */}
            <div className="sm:col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-secondary">
                  {useCustom ? 'Custom Location Name' : 'Kerala Terminal / Jetty Hub'}
                </label>
                <button
                  type="button"
                  onClick={() => setUseCustom(!useCustom)}
                  className="text-[10px] text-accent hover:underline font-medium"
                >
                  {useCustom ? '← Pick from Kerala Jetties' : '+ Type Custom Location'}
                </button>
              </div>

              {useCustom ? (
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Cochin Port Trust Wharf, Kundannoor Junction"
                  className="input w-full text-xs"
                  required
                />
              ) : (
                <select
                  value={selectedHub}
                  onChange={(e) => setSelectedHub(e.target.value)}
                  className="input select w-full text-xs"
                >
                  {KERALA_HUBS.map((hub) => (
                    <option key={hub.name} value={hub.name}>
                      ⚓ {hub.name} ({hub.district})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Radius Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-secondary">Dispatch Radius</label>
              <select
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="input select w-full text-xs"
              >
                <option value={5}>5 km (Immediate local)</option>
                <option value={10}>10 km (Standard port area)</option>
                <option value={15}>15 km (Regional waterway)</option>
                <option value={25}>25 km (District-wide)</option>
                <option value={50}>50 km (Wide coverage)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={adding}
            className="btn btn-primary text-xs font-bold py-2 px-4 shadow-xs"
          >
            {adding ? 'Adding Base...' : '+ Save Preferred Location'}
          </button>
        </form>

        {/* List of existing locations */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-secondary block">
            Saved Preferred Locations ({locations.length}):
          </span>

          {loading ? (
            <div className="p-6 text-center text-secondary text-xs">
              <div className="spinner mx-auto mb-2" style={{ width: 20, height: 20 }} />
              Loading your saved hubs...
            </div>
          ) : locations.length === 0 ? (
            <div className="p-8 text-center bg-main rounded-xl border border-dashed border-default">
              <span className="text-3xl block mb-2">⚓</span>
              <p className="text-xs font-semibold text-primary">No preferred locations saved yet</p>
              <p className="text-[11px] text-secondary mt-1">
                Select your base jetty (e.g. Ernakulam Boat Jetty or Alappuzha) above to receive priority dispatches!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {locations.map((loc) => {
                const isDeleting = deletingId === loc.id;
                return (
                  <div
                    key={loc.id}
                    className="p-3 bg-main border border-default rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg">📍</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-primary truncate">{loc.name}</p>
                        <span className="text-[10px] text-secondary inline-flex items-center gap-1">
                          Coverage: <strong className="text-accent">{loc.radius_km || 15} km</strong>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDeleteLocation(loc.id, loc.name)}
                      className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 transition-colors font-bold"
                      title="Remove this preferred location"
                    >
                      {isDeleting ? '...' : '✕'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
