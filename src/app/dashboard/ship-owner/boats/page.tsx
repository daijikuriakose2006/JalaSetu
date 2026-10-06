'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import type { Boat, Jetty } from '@/lib/types/database';

export default function BoatsManagementPage() {
  const { user } = useAuth();
  const [boats, setBoats] = useState<Boat[]>([]);
  const [jetties, setJetties] = useState<Jetty[]>([]);
  const [loading, setLoading] = useState(true);

  // New boat modal / form
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [registration, setRegistration] = useState('');
  const [capacityT, setCapacityT] = useState(15);
  const [homeJettyId, setHomeJettyId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  async function loadBoatsAndJetties() {
    if (!user) return;
    try {
      const client = supabase as any;
      const [{ data: bData }, { data: jData }] = await Promise.all([
        client.from('boats').select('*').eq('owner_id', user.id),
        client.from('jetties').select('*').eq('is_active', true),
      ]);
      setBoats((bData as Boat[]) || []);
      setJetties((jData as Jetty[]) || []);
      if (jData && jData.length > 0 && !homeJettyId) {
        setHomeJettyId((jData[0] as any).id);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoatsAndJetties();
  }, [user]);

  const handleAddBoat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      const client = supabase as any;
      const { error } = await client.from('boats').insert({
        owner_id: user.id,
        name,
        capacity_t: Number(capacityT),
        cargo_types: ['building_material', 'sand', 'cement', 'general'],
        home_jetty_id: homeJettyId || null,
        registration_number: registration || `KL-${Math.floor(1000 + Math.random() * 9000)}`,
        is_active: true,
      });

      if (error) throw error;
      setShowForm(false);
      setName('');
      setRegistration('');
      loadBoatsAndJetties();
    } catch (err: any) {
      alert(err.message || 'Failed to add boat');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBoat = async (boatId: string) => {
    if (!confirm('Are you sure you want to remove this vessel from your fleet?')) return;
    try {
      await supabase.from('boats').delete().eq('id', boatId);
      loadBoatsAndJetties();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-primary">Fleet & Vessel Management</h2>
          <p className="text-xs text-secondary">
            Register inland water barges, configure tonnage capacities, and designate home jetties
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary text-xs"
        >
          {showForm ? 'Cancel' : '+ Register New Vessel'}
        </button>
      </div>

      {/* Add Boat Form */}
      {showForm && (
        <form onSubmit={handleAddBoat} className="card p-5 bg-surface border border-default rounded-xl space-y-4">
          <h3 className="font-bold text-sm text-primary">Register New Vessel</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="label text-xs">Vessel Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. MV Vembanad Queen"
                className="input text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="label text-xs">Port Registration Number</label>
              <input
                type="text"
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
                placeholder="e.g. KL-EKM-2026"
                className="input text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="label text-xs flex justify-between">
                <span>Max Payload Capacity (Tonnes)</span>
                <span className="text-accent font-semibold">{capacityT * 1000} kg</span>
              </label>
              <input
                type="number"
                value={capacityT}
                onChange={(e) => setCapacityT(Number(e.target.value))}
                min="0.5"
                step="0.5"
                className="input text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="label text-xs">Home Jetty Base</label>
              <select
                value={homeJettyId}
                onChange={(e) => setHomeJettyId(e.target.value)}
                className="input select text-xs"
              >
                {jetties.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name} ({j.district})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary text-xs py-2 px-4"
          >
            {submitting ? 'Registering...' : 'Save Vessel to Fleet'}
          </button>
        </form>
      )}

      {/* Boat List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-secondary">
          <div className="spinner mx-auto mb-2" style={{ width: 24, height: 24 }} />
          Loading fleet...
        </div>
      ) : boats.length === 0 ? (
        <div className="card p-12 text-center bg-surface border border-default">
          <span className="text-4xl mb-3 block">🚢</span>
          <h3 className="font-semibold text-primary text-base mb-1">No Vessels Registered</h3>
          <p className="text-xs text-secondary mb-4">
            Register your boat to be matched with cargo owners on Kerala waterways.
          </p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary text-xs">
            Register First Vessel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {boats.map((b) => {
            const home = jetties.find((j) => j.id === b.home_jetty_id);
            return (
              <div
                key={b.id}
                className="card p-5 bg-surface border border-default rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🚢</span>
                    <h4 className="font-bold text-sm text-primary">{b.name}</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-light text-accent">
                    {b.capacity_t} Tonnes ({Number(b.capacity_t) * 1000} kg)
                  </span>
                </div>

                <div className="space-y-1 text-xs text-secondary">
                  <p>
                    <strong>Reg:</strong> {b.registration_number || 'Pending'}
                  </p>
                  <p>
                    <strong>Home Base:</strong> {home?.name || 'Ernakulam Boat Jetty'}
                  </p>
                  <p>
                    <strong>Cargo Types:</strong> {b.cargo_types?.join(', ') || 'General'}
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleDeleteBoat(b.id)}
                    className="btn btn-danger text-xs py-1 px-2.5"
                  >
                    Delete Vessel
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
