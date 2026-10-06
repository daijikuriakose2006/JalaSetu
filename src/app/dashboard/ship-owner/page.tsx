'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import ProviderMapTab from '@/components/provider/ProviderMapTab';
import MyJobsTab from '@/components/provider/MyJobsTab';
import RequestsTab from '@/components/provider/RequestsTab';
import JobOfferBanner, { type OfferBannerData } from '@/components/provider/JobOfferBanner';
import type { Job } from '@/lib/types/database';

interface ShipOwnerDashboardProps {
  initialTab?: 'map' | 'jobs' | 'requests';
}

export default function ShipOwnerDashboard({ initialTab = 'map' }: ShipOwnerDashboardProps) {
  const { profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'map' | 'jobs' | 'requests'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [isOnline, setIsOnline] = useState<boolean>(profile?.is_online ?? true);
  const [activeJob, setActiveJob] = useState<Job | null>(null);

  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [requests, setRequests] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [incomingOffer, setIncomingOffer] = useState<OfferBannerData | null>(null);
  const [seedingDemo, setSeedingDemo] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // 1. Load accepted jobs
      const myRes = await fetch('/api/jobs?mine_only=true');
      if (myRes.ok) {
        const data = await myRes.json();
        setMyJobs(data.jobs || []);
        setActiveJob((prev) => prev || (data.jobs?.length > 0 ? data.jobs[0] : null));
      }

      // 2. Load open requests
      const reqRes = await fetch('/api/jobs?type=ship');
      if (reqRes.ok) {
        const data = await reqRes.json();
        const available = data.jobs || [];
        setRequests(available);

        // Check if there is an unhandled immediate offer
        if (available.length > 0) {
          const first = available[0];
          setIncomingOffer((prev) => {
            if (prev) return prev;
            return {
              jobId: first.id,
              orderId: first.order_id,
              type: first.type,
              from: first.orders?.origin_address || 'Kochi Jetty',
              destination: first.orders?.destination_address || 'Alappuzha Jetty',
              item: first.orders?.cargo_name || 'Goods',
              quantity: `${first.orders?.weight_tonnes || 0} tonnes`,
              estimatedPayout: first.estimated_payout || 1500,
            };
          });
        }
      }
    } catch (err) {
      console.warn('Ship owner load data error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 8000);
    return () => clearInterval(timer);
  }, [loadData]);

  const handleToggleOnline = async (online: boolean) => {
    setIsOnline(online);
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_online: online }),
      });
      await refreshProfile();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClaimJob = async (jobId: string) => {
    const res = await fetch(`/api/jobs/${jobId}/claim`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || 'Failed to claim job');
      return;
    }
    setIncomingOffer(null);
    await loadData();
    setActiveTab('jobs');
  };

  const handleUpdateStatus = async (jobId: string, nextStatus: string) => {
    const res = await fetch(`/api/jobs/${jobId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      await loadData();
    }
  };

  const handleSeedDemoOrder = async () => {
    setSeedingDemo(true);
    try {
      const res = await fetch('/api/orders/seed-demo', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        await loadData();
        setActiveTab('requests');
      } else {
        alert(data.error || 'Failed to seed demo order');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSeedingDemo(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Real-time incoming offer banner */}
      <JobOfferBanner
        offer={incomingOffer}
        onAccept={handleClaimJob}
        onDismiss={() => setIncomingOffer(null)}
        loading={false}
      />

      {/* Header bar */}
      <div className="card p-5 bg-surface border border-default flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🚢</span>
            <h2 className="text-lg font-bold text-primary">Boat Operator Console</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-light text-accent">
              Vessel Owner
            </span>
          </div>
          <p className="text-xs text-secondary">
            Manage backwater cargo voyages, accept barge jobs, and stream GPS to shippers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Quick Demo Seed helper button */}
          <button
            type="button"
            onClick={handleSeedDemoOrder}
            disabled={seedingDemo}
            className="btn btn-secondary text-xs px-3 py-1.5 font-medium border-dashed border-accent text-accent hover:bg-accent hover:text-white transition-colors"
            title="Create a sample 8t Kochi→Alappuzha order with Vessel freight jobs to test"
          >
            {seedingDemo ? 'Creating Demo...' : '⚡ Generate Demo Jobs'}
          </button>

          {/* Console Tab switcher */}
          <div className="flex p-1 bg-main border border-default rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'map' ? 'bg-accent text-white shadow-xs' : 'text-secondary hover:text-primary'
              }`}
            >
              🗺️ Live Map
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('jobs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'jobs' ? 'bg-accent text-white shadow-xs' : 'text-secondary hover:text-primary'
              }`}
            >
              ⚓ My Jobs ({myJobs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                activeTab === 'requests' ? 'bg-accent text-white shadow-xs' : 'text-secondary hover:text-primary'
              }`}
            >
              📨 Requests
              {requests.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px]">
                  {requests.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Panels: keep mounted to avoid destroying Leaflet map & preserve GPS watch */}
      <div className={activeTab === 'map' ? 'block' : 'hidden'}>
        <ProviderMapTab
          role="ship_owner"
          activeJob={activeJob}
          isOnline={isOnline}
          onToggleOnline={handleToggleOnline}
        />
      </div>

      <div className={activeTab === 'jobs' ? 'block' : 'hidden'}>
        <MyJobsTab
          jobs={myJobs}
          role="ship_owner"
          activeJobId={activeJob?.id || null}
          onSelectActive={(j) => setActiveJob(j)}
          onUpdateStatus={handleUpdateStatus}
          loading={loading}
        />
      </div>

      <div className={activeTab === 'requests' ? 'block' : 'hidden'}>
        <RequestsTab
          requests={requests}
          onAccept={handleClaimJob}
          loading={loading}
        />
      </div>
    </div>
  );
}
