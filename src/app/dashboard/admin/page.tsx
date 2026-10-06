'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const RouteMap = dynamic(() => import('@/components/map/RouteMap'), {
  ssr: false,
  loading: () => <div className="h-[360px] bg-main rounded-xl border border-default flex items-center justify-center text-xs text-secondary">Loading online providers map...</div>,
});

export default function AdminOverviewPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadAnalytics() {
    try {
      const res = await fetch('/api/admin/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-secondary">
        <div className="spinner mx-auto mb-3" style={{ width: 28, height: 28 }} />
        Loading administrative telemetry...
      </div>
    );
  }

  const roleCounts = analytics?.roleCounts || {};
  const statusCounts = analytics?.statusCounts || {};
  const onlineProviders = analytics?.onlineProviders || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-primary">JalaSetu Admin Operations Console</h2>
          <p className="text-xs text-secondary">
            Real-time telemetry, marketplace matching status, and water freight analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/admin/orders" className="btn btn-secondary text-xs">
            Manage Orders 📋
          </Link>
          <Link href="/dashboard/admin/rates" className="btn btn-primary text-xs">
            Configure Rates 💰
          </Link>
        </div>
      </div>

      {/* Primary KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 bg-surface border border-default rounded-xl">
          <p className="text-xs font-semibold text-secondary uppercase">Active Users Now</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-accent">{analytics?.onlineUsers || 0}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              / {analytics?.totalUsers || 0} registered
            </span>
          </div>
          <div className="mt-2 text-[11px] text-secondary">
            {roleCounts.ship_owner || 0} boats • {roleCounts.taxi || 0} taxis • {roleCounts.worker || 0} workers
          </div>
        </div>

        <div className="card p-4 bg-surface border border-default rounded-xl">
          <p className="text-xs font-semibold text-secondary uppercase">Waterways Freight Moved</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-primary">{analytics?.totalTonnesWaterMoved || 0}</span>
            <span className="text-xs font-bold text-accent">Tonnes</span>
          </div>
          <div className="mt-2 text-[11px] text-secondary">
            Across Vembanad Lake & coastal canals
          </div>
        </div>

        <div className="card p-4 bg-surface border border-default rounded-xl">
          <p className="text-xs font-semibold text-secondary uppercase">Estimated CO₂ Abated</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {analytics?.totalCo2SavedKg || 0}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">kg CO₂</span>
          </div>
          <div className="mt-2 text-[11px] text-secondary">
            Shifted off NH66 congestion
          </div>
        </div>

        <div className="card p-4 bg-surface border border-default rounded-xl">
          <p className="text-xs font-semibold text-secondary uppercase">Avg. Vessel Matching Time</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-accent">{analytics?.avgAcceptanceMin || '1.2'}</span>
            <span className="text-xs font-bold text-secondary">minutes</span>
          </div>
          <div className="mt-2 text-[11px] text-secondary">
            Atomic job dispatch SLA
          </div>
        </div>
      </div>

      {/* Live Map of Online Providers */}
      <div className="card p-5 bg-surface border border-default rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-primary">Live Provider Presence & Fleet Radar</h3>
            <p className="text-xs text-secondary">
              GPS telemetry of active boat operators, cargo taxis, and jetty loading crews
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent text-white">
            {onlineProviders.length} Active Feeds
          </span>
        </div>

        <RouteMap
          jetties={[]}
          providerLocation={onlineProviders[0] ? { lat: onlineProviders[0].lat, lng: onlineProviders[0].lng } : undefined}
          height="380px"
        />
      </div>

      {/* Order Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5 bg-surface border border-default rounded-xl space-y-3">
          <h3 className="font-bold text-sm text-primary">Order Pipeline by Lifecycle Stage</h3>
          <div className="space-y-2 text-xs">
            {Object.entries(statusCounts).map(([st, cnt]) => (
              <div key={st} className="flex justify-between items-center py-1.5 border-b border-default">
                <span className="capitalize text-secondary">{st.replace('_', ' ')}</span>
                <span className="font-bold text-primary px-2 py-0.5 rounded bg-main border border-default">
                  {cnt as number}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 bg-surface border border-default rounded-xl space-y-3">
          <h3 className="font-bold text-sm text-primary">Quick Navigation</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/dashboard/admin/users"
              className="p-3 rounded-lg border border-default hover:border-accent bg-main text-primary transition-colors flex flex-col items-center justify-center text-center"
            >
              <span className="text-2xl mb-1">👥</span>
              <span className="font-semibold">User Directory</span>
              <span className="text-[10px] text-secondary mt-0.5">Role assignments & status</span>
            </Link>

            <Link
              href="/dashboard/admin/rates"
              className="p-3 rounded-lg border border-default hover:border-accent bg-main text-primary transition-colors flex flex-col items-center justify-center text-center"
            >
              <span className="text-2xl mb-1">💰</span>
              <span className="font-semibold">Tariffs & Rates</span>
              <span className="text-[10px] text-secondary mt-0.5">Edit per-km and boat fees</span>
            </Link>

            <Link
              href="/dashboard/admin/waterways"
              className="p-3 rounded-lg border border-default hover:border-accent bg-main text-primary transition-colors flex flex-col items-center justify-center text-center"
            >
              <span className="text-2xl mb-1">🌊</span>
              <span className="font-semibold">Waterway Graph</span>
              <span className="text-[10px] text-secondary mt-0.5">Jetties & route edges</span>
            </Link>

            <Link
              href="/dashboard/admin/messages"
              className="p-3 rounded-lg border border-default hover:border-accent bg-main text-primary transition-colors flex flex-col items-center justify-center text-center"
            >
              <span className="text-2xl mb-1">✉️</span>
              <span className="font-semibold">Inquiries</span>
              <span className="text-[10px] text-secondary mt-0.5">Contact submissions</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
