'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { Job } from '@/lib/types/database';

const RouteMap = dynamic(() => import('@/components/map/RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[460px] bg-main rounded-xl border border-default flex items-center justify-center text-xs text-secondary">
      Loading Provider GPS Map...
    </div>
  ),
});

interface ProviderMapTabProps {
  role: 'ship_owner' | 'taxi' | 'worker';
  activeJob: Job | null;
  isOnline: boolean;
  onToggleOnline: (online: boolean) => Promise<void>;
}

export default function ProviderMapTab({
  role,
  activeJob,
  isOnline,
  onToggleOnline,
}: ProviderMapTabProps) {
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: 9.9687,
    lng: 76.2673, // Default Kochi Jetty
  });
  const [jetties, setJetties] = useState<any[]>([]);
  const [toggling, setToggling] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Fetch jetties
  useEffect(() => {
    async function loadJetties() {
      try {
        const res = await fetch('/api/jetties');
        if (res.ok) {
          const data = await res.json();
          setJetties(data.jetties || []);
        }
      } catch (err) {
        console.warn(err);
      }
    }
    loadJetties();
  }, []);

  // GPS geolocation streaming when online
  useEffect(() => {
    if (!isOnline) {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const heading = pos.coords.heading || undefined;
          const speed = pos.coords.speed ? (pos.coords.speed * 3.6) : undefined; // km/h

          setCurrentCoords({ lat, lng });

          // Stream location to API
          try {
            await fetch('/api/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lat,
                lng,
                job_id: activeJob?.id || null,
                heading,
                speed,
              }),
            });
          } catch (err) {
            console.warn('GPS stream error:', err);
          }
        },
        (err) => {
          console.warn('Geolocation watch error (using default location):', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isOnline, activeJob]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await onToggleOnline(!isOnline);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="card p-4 bg-surface border border-default flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
            }`}
          />
          <div>
            <span className="font-bold text-sm text-primary">
              Status: {isOnline ? 'Online & Ready for Jobs' : 'Offline'}
            </span>
            <p className="text-[11px] text-secondary">
              {isOnline
                ? 'Streaming real-time coordinates to cargo owners'
                : 'Go online to receive high-paying transport dispatches'}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`btn text-xs px-4 py-2 font-bold ${
            isOnline ? 'btn-danger' : 'btn-primary'
          }`}
        >
          {toggling
            ? 'Updating...'
            : isOnline
            ? 'Go Offline 🛑'
            : 'Go Online Now 🟢'}
        </button>
      </div>

      {/* Active Operation Alert */}
      {activeJob ? (
        <div className="p-3 bg-accent-light/40 border border-accent rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-accent uppercase">Active Operation Assigned: </span>
            <span className="font-semibold text-primary">
              {activeJob.type.toUpperCase()} Job #{activeJob.id.slice(0, 8)}
            </span>
            <span className="text-secondary ml-2">(GPS stream attached to this order)</span>
          </div>
          <span className="font-mono font-bold text-accent">₹{activeJob.estimated_payout}</span>
        </div>
      ) : (
        <div className="p-3 bg-main border border-default rounded-xl text-xs text-secondary">
          ℹ️ No active job selected. Select a job in <strong>My Jobs</strong> tab to attach GPS tracking and view route directions.
        </div>
      )}

      {/* Map */}
      <div className="card p-3 bg-surface border border-default">
        <RouteMap
          jetties={jetties}
          providerLocation={currentCoords}
          center={[currentCoords.lat, currentCoords.lng]}
          zoom={12}
          height="460px"
        />
      </div>
    </div>
  );
}
