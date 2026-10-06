'use client';

import { useState, useEffect } from 'react';
import type { Order } from '@/lib/types/database';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  async function loadOrders() {
    setLoading(true);
    try {
      const url = statusFilter === 'all' ? '/api/admin/orders' : `/api/admin/orders?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const handleForceCancel = async (orderId: string) => {
    if (!confirm('Force-cancel this order and all associated provider jobs?')) return;
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'force_cancel' }),
      });
      if (res.ok) {
        loadOrders();
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-primary">Global Orders & Dispatch Control</h2>
          <p className="text-xs text-secondary">
            Supervise all multi-modal shipments, reassign providers, and exercise override controls
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input select text-xs w-full sm:w-48"
        >
          <option value="all">All Statuses</option>
          <option value="posted">Posted</option>
          <option value="matched">Matched</option>
          <option value="picked_up">Picked Up</option>
          <option value="in_transit">In Transit</option>
          <option value="delivered">Delivered</option>
          <option value="queued">Queued</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-secondary">
          <div className="spinner mx-auto mb-2" style={{ width: 24, height: 24 }} />
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-8 text-center bg-surface border border-default text-xs text-secondary">
          No orders found matching filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Orders List */}
          <div className="lg:col-span-7 space-y-3">
            {orders.map((o) => (
              <div
                key={o.id}
                onClick={() => setSelectedOrder(o)}
                className={`card p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedOrder?.id === o.id
                    ? 'border-accent bg-accent-light/10 ring-2 ring-accent/30 shadow-sm'
                    : 'border-default bg-surface hover:border-accent/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-primary">{o.cargo_name} ({o.weight_tonnes}t)</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-main border border-default text-secondary">
                    {o.status}
                  </span>
                </div>

                <div className="text-xs text-secondary space-y-0.5 truncate">
                  <p>Shipper: {o.profiles?.name || 'User'} ({o.profiles?.email || 'N/A'})</p>
                  <p className="truncate">From: {o.origin_address} → To: {o.destination_address}</p>
                </div>

                <div className="flex justify-between items-center pt-2 mt-2 border-t border-default text-[11px]">
                  <span className="font-mono text-secondary">₹{o.water_cost || o.road_cost || 0}</span>
                  <span className="text-secondary">{new Date(o.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Selected Order Detail Sidebar */}
          <div className="lg:col-span-5">
            {selectedOrder ? (
              <div className="card p-5 bg-surface border border-default rounded-xl space-y-4 sticky top-4">
                <div className="flex items-center justify-between border-b border-default pb-3">
                  <h3 className="font-bold text-sm text-primary">Order #{selectedOrder.id.slice(0, 8)}</h3>
                  <button
                    onClick={() => handleForceCancel(selectedOrder.id)}
                    className="btn btn-danger text-[11px] py-1 px-2.5"
                  >
                    Force Cancel ✕
                  </button>
                </div>

                <div className="space-y-2 text-xs text-secondary">
                  <p><strong>Cargo:</strong> {selectedOrder.cargo_name}</p>
                  <p><strong>Weight:</strong> {selectedOrder.weight_tonnes} Tonnes</p>
                  <p><strong>Status:</strong> <span className="uppercase font-semibold text-primary">{selectedOrder.status}</span></p>
                  <p><strong>Origin:</strong> {selectedOrder.origin_address}</p>
                  <p><strong>Destination:</strong> {selectedOrder.destination_address}</p>
                </div>

                {/* Subordinate Dispatch Jobs */}
                <div className="border-t border-default pt-3">
                  <h4 className="font-semibold text-xs text-primary mb-2">Dispatch Jobs:</h4>
                  {(selectedOrder.jobs || []).length === 0 ? (
                    <p className="text-[11px] text-secondary">No jobs generated.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedOrder.jobs.map((j: any) => (
                        <div key={j.id} className="p-2.5 bg-main rounded-lg border border-default text-xs space-y-1">
                          <div className="flex justify-between font-medium">
                            <span className="uppercase font-bold text-primary">{j.type} Job</span>
                            <span className="text-secondary capitalize">{j.status}</span>
                          </div>
                          <p className="text-[11px] text-secondary">
                            Assigned To: {j.assigned_to ? j.assigned_to.slice(0, 8) : 'Unassigned (Open)'}
                          </p>
                          <p className="text-[11px] text-accent font-mono">Payout: ₹{j.estimated_payout || 0}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card p-8 bg-surface border border-default rounded-xl text-center text-xs text-secondary">
                Select an order from the list to view its jobs and execute administrative actions.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
