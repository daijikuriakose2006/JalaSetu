'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Order } from '@/lib/types/database';

export default function UserOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      try {
        const url = filter === 'all' ? '/api/orders' : `/api/orders?status=${filter}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, [filter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Posted</span>;
      case 'matched':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Matched</span>;
      case 'picked_up':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">Picked Up</span>;
      case 'in_transit':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-light text-accent">In Transit 🚢</span>;
      case 'delivered':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Delivered ✓</span>;
      case 'queued':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">Queued (Pool)</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-primary">My Cargo Orders</h2>
          <p className="text-xs text-secondary">
            Track and monitor all your inland water freight shipments
          </p>
        </div>
        <Link href="/dashboard/user" className="btn btn-primary text-xs">
          + Book New Shipment
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-default pb-3">
        {['all', 'posted', 'matched', 'in_transit', 'delivered', 'cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === tab
                ? 'bg-accent text-white'
                : 'bg-surface hover:bg-main text-secondary border border-default'
            }`}
          >
            {tab.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-secondary text-sm">
          <div className="spinner mx-auto mb-3" style={{ width: 28, height: 28 }} />
          Loading shipments...
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center bg-surface border border-default">
          <span className="text-4xl mb-3 block">📦</span>
          <h3 className="font-semibold text-primary text-base mb-1">No orders found</h3>
          <p className="text-xs text-secondary mb-4">
            {filter === 'all'
              ? 'You have not placed any cargo bookings yet.'
              : `No shipments currently in "${filter}" status.`}
          </p>
          <Link href="/dashboard/user" className="btn btn-primary text-xs inline-flex">
            Book Your First Waterway Shipment
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.map((o) => (
            <div
              key={o.id}
              className="card p-5 bg-surface border border-default rounded-xl space-y-3 hover:border-accent transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-primary">{o.cargo_name}</span>
                {getStatusBadge(o.status)}
              </div>

              <div className="space-y-1 text-xs text-secondary">
                <div className="flex items-center gap-1.5">
                  <span className="text-accent">●</span>
                  <span className="truncate">From: <strong>{o.origin_address}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-red-500">●</span>
                  <span className="truncate">To: <strong>{o.destination_address}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-default text-center text-xs">
                <div>
                  <p className="font-bold text-primary">{o.weight_tonnes}t</p>
                  <p className="text-[10px] text-secondary">Weight</p>
                </div>
                <div>
                  <p className="font-bold text-accent">₹{o.water_cost || 'N/A'}</p>
                  <p className="text-[10px] text-secondary">Est. Cost</p>
                </div>
                <div>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">
                    {o.water_co2_kg ? `${o.water_co2_kg} kg` : 'N/A'}
                  </p>
                  <p className="text-[10px] text-secondary">CO₂</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  href={`/dashboard/user/orders/${o.id}`}
                  className="btn btn-secondary text-xs py-1.5 px-3 w-full text-center"
                >
                  View Details & Live Tracker →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
