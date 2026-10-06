'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { Jetty } from '@/lib/types/database';

const RouteMap = dynamic(() => import('@/components/map/RouteMap'), {
  ssr: false,
  loading: () => <div className="h-[360px] bg-main rounded-xl border border-default flex items-center justify-center text-xs text-secondary">Loading water graph...</div>,
});

export default function AdminWaterwaysPage() {
  const [jetties, setJetties] = useState<Jetty[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Jetty state
  const [newJettyName, setNewJettyName] = useState('');
  const [newDistrict, setNewDistrict] = useState('Ernakulam');
  const [newLat, setNewLat] = useState('9.9687');
  const [newLng, setNewLng] = useState('76.2673');
  const [hasLoading, setHasLoading] = useState(true);
  const [creatingJetty, setCreatingJetty] = useState(false);

  async function loadData() {
    try {
      const [{ data: jData }, { data: eData }] = await Promise.all([
        fetch('/api/admin/jetties').then((r) => r.json()),
        fetch('/api/admin/water-edges').then((r) => r.json()),
      ]);
      setJetties(jData.jetties || []);
      setEdges(eData.edges || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateJetty = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingJetty(true);
    try {
      const res = await fetch('/api/admin/jetties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newJettyName,
          district: newDistrict,
          lat: parseFloat(newLat),
          lng: parseFloat(newLng),
          has_loading_facility: hasLoading,
          is_active: true,
        }),
      });
      if (res.ok) {
        setNewJettyName('');
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingJetty(false);
    }
  };

  const handleDeleteJetty = async (id: string) => {
    if (!confirm('Delete this jetty and its connected waterway edges?')) return;
    try {
      await fetch(`/api/admin/jetties?id=${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-primary">Kerala Waterway Graph & Jetties Network</h2>
        <p className="text-xs text-secondary">
          Configure physical jetty terminals and topological waterway links used for Dijkstra routing
        </p>
      </div>

      {/* Map visualizer */}
      <div className="card p-4 bg-surface border border-default rounded-xl space-y-2">
        <h3 className="font-bold text-xs text-primary uppercase">Waterway Network Map</h3>
        <RouteMap
          jetties={jetties as any}
          height="360px"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Jetties List & Add Form */}
        <div className="lg:col-span-7 space-y-4">
          {/* Add form */}
          <form onSubmit={handleCreateJetty} className="card p-4 bg-surface border border-default rounded-xl space-y-3">
            <h4 className="font-bold text-xs text-primary uppercase">Add New Jetty Terminal</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="label text-[11px]">Jetty Name</label>
                <input
                  type="text"
                  value={newJettyName}
                  onChange={(e) => setNewJettyName(e.target.value)}
                  placeholder="e.g. Aroor North Jetty"
                  className="input text-xs"
                  required
                />
              </div>
              <div>
                <label className="label text-[11px]">District</label>
                <input
                  type="text"
                  value={newDistrict}
                  onChange={(e) => setNewDistrict(e.target.value)}
                  className="input text-xs"
                  required
                />
              </div>
              <div>
                <label className="label text-[11px]">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={newLat}
                  onChange={(e) => setNewLat(e.target.value)}
                  className="input text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="label text-[11px]">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={newLng}
                  onChange={(e) => setNewLng(e.target.value)}
                  className="input text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasLoading}
                  onChange={(e) => setHasLoading(e.target.checked)}
                />
                <span>Has Stevedore / Loading Crane Facility</span>
              </label>

              <button
                type="submit"
                disabled={creatingJetty}
                className="btn btn-primary text-xs py-1.5 px-3"
              >
                {creatingJetty ? 'Adding...' : '+ Add Jetty'}
              </button>
            </div>
          </form>

          {/* Jetties List */}
          <div className="card p-4 bg-surface border border-default rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-xs text-primary uppercase">Registered Jetties ({jetties.length})</h4>
              <span className="text-[11px] text-secondary">Flagged as approximate</span>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {jetties.map((j) => (
                <div key={j.id} className="p-3 bg-main rounded-lg border border-default flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-primary">{j.name}</p>
                    <p className="text-[11px] text-secondary">
                      District: {j.district || 'Kerala'} • Coords: {j.lat?.toFixed(3)}, {j.lng?.toFixed(3)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {j.has_loading_facility && (
                      <span className="px-1.5 py-0.5 rounded bg-accent-light text-accent text-[10px]">
                        Crane
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteJetty(j.id)}
                      className="text-red-500 hover:underline text-[11px]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Water Edges */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card p-4 bg-surface border border-default rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-xs text-primary uppercase">
                Waterway Graph Edges ({edges.length})
              </h4>
              <span className="text-[11px] text-secondary">Used in Dijkstra</span>
            </div>

            <div className="space-y-2 max-h-[580px] overflow-y-auto text-xs">
              {edges.slice(0, 30).map((e) => (
                <div key={e.id} className="p-2.5 bg-main rounded-lg border border-default space-y-0.5">
                  <div className="flex justify-between font-semibold text-primary">
                    <span>{e.from_jetty?.name || 'Jetty A'} ➔ {e.to_jetty?.name || 'Jetty B'}</span>
                    <span className="text-accent">{e.distance_km} km</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-secondary">
                    <span>Waterway: {e.waterway_name || 'Kerala Backwater'}</span>
                    <span>Speed: {e.avg_speed_kmph} km/h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
