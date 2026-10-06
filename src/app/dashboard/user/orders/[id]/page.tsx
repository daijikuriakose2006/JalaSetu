'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { Order, OrderLeg, Job } from '@/lib/types/database';

const RouteMap = dynamic(() => import('@/components/map/RouteMap'), {
  ssr: false,
  loading: () => <div className="h-[360px] bg-main rounded-xl border border-default flex items-center justify-center text-xs text-secondary">Loading live map...</div>,
});

const LIFECYCLE_STEPS = [
  { key: 'posted', label: 'Posted', icon: '📝' },
  { key: 'matched', label: 'Matched', icon: '🤝' },
  { key: 'picked_up', label: 'Picked Up', icon: '🚛' },
  { key: 'in_transit', label: 'In Transit', icon: '🚢' },
  { key: 'delivered', label: 'Delivered', icon: '✓' },
];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [legs, setLegs] = useState<OrderLeg[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [liveLocations, setLiveLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Rating state
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Cancel state
  const [cancelling, setCancelling] = useState(false);

  async function loadOrder() {
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
        setLegs(data.legs || []);
        setJobs(data.jobs || []);
        setProviders(data.providers || []);
        setLiveLocations(data.liveLocations || []);
      }
    } catch (err) {
      console.error('Failed to load order:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
    // Poll for status & live tracking updates every 6 seconds
    const interval = setInterval(loadOrder, 6000);
    return () => clearInterval(interval);
  }, [id]);

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) {
        loadOrder();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCancelling(false);
    }
  };

  const handleRatingSubmit = async (toUserId: string) => {
    setRatingSubmitting(true);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: id,
          to_user_id: toUserId,
          rating: ratingStars,
          comment: ratingComment,
        }),
      });
      if (res.ok) {
        setRatingSubmitted(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRatingSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-secondary">
        <div className="spinner mx-auto mb-3" style={{ width: 32, height: 32 }} />
        Loading order details...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="card p-8 text-center bg-surface border border-default">
        <p className="text-sm text-primary mb-3">Order not found.</p>
        <Link href="/dashboard/user/orders" className="btn btn-secondary text-xs">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const currentStepIndex = LIFECYCLE_STEPS.findIndex((s) => s.key === order.status);
  const activeLocation = liveLocations[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/user/orders" className="text-xs text-accent hover:underline">
              ← Orders
            </Link>
            <span className="text-secondary text-xs">/</span>
            <span className="text-xs text-secondary font-mono">#{order.id.slice(0, 8)}</span>
          </div>
          <h2 className="text-xl font-bold text-primary">{order.cargo_name} ({order.weight_tonnes} tonnes)</h2>
        </div>

        {['posted', 'matched'].includes(order.status) && (
          <button
            onClick={handleCancelOrder}
            disabled={cancelling}
            className="btn btn-danger text-xs self-start sm:self-auto"
          >
            {cancelling ? 'Cancelling...' : 'Cancel Order'}
          </button>
        )}
      </div>

      {/* Progress Timeline Tracker */}
      <div className="card p-5 bg-surface border border-default rounded-xl">
        <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-4">
          Shipment Progress Tracker
        </p>
        <div className="grid grid-cols-5 gap-2 text-center">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isCompleted = currentStepIndex >= idx;
            const isCurrent = order.status === step.key;

            return (
              <div key={step.key} className="space-y-1.5">
                <div
                  className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    isCurrent
                      ? 'bg-accent text-white ring-4 ring-accent-light'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-main text-secondary border border-default'
                  }`}
                >
                  {isCompleted && !isCurrent ? '✓' : step.icon}
                </div>
                <p
                  className={`text-xs font-medium ${
                    isCurrent ? 'text-accent font-bold' : isCompleted ? 'text-primary' : 'text-secondary'
                  }`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Map & Multi-modal Legs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="card p-4 bg-surface border border-default space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-primary">Live Tracking & Waterway Route</h3>
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Realtime Updates
              </span>
            </div>

            <RouteMap
              legs={legs as any}
              originCoords={[9.9312, 76.2673]}
              destCoords={[9.4981, 76.3388]}
              providerLocation={activeLocation ? { lat: activeLocation.lat, lng: activeLocation.lng } : undefined}
              height="380px"
            />
          </div>

          {/* Assigned Providers Card */}
          <div className="card p-4 bg-surface border border-default space-y-3">
            <h3 className="font-semibold text-sm text-primary">Assigned Transport Providers</h3>
            {providers.length === 0 ? (
              <p className="text-xs text-secondary py-2">
                Providers are currently being matched. You will receive an alert once boat operators and taxis claim the legs.
              </p>
            ) : (
              <div className="space-y-2">
                {providers.map((p) => (
                  <div key={p.id} className="p-3 bg-main rounded-lg border border-default flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-primary">{p.name}</p>
                      <p className="text-xs text-secondary capitalize">
                        {p.role.replace('_', ' ')} {p.vehicle_type ? `(${p.vehicle_type}, ${p.capacity_t}t)` : ''}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-accent-light text-accent text-xs font-medium">
                      Assigned
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Route Details & Rating */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card p-5 bg-surface border border-default space-y-4">
            <h3 className="font-bold text-sm text-primary">Route & Cargo Breakdown</h3>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-main rounded-lg border border-default">
                <p className="text-secondary mb-1">Pickup Address</p>
                <p className="font-semibold text-primary">{order.origin_address}</p>
              </div>

              <div className="p-3 bg-main rounded-lg border border-default">
                <p className="text-secondary mb-1">Delivery Destination</p>
                <p className="font-semibold text-primary">{order.destination_address}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center pt-1">
                <div className="p-2.5 bg-accent-light rounded-lg">
                  <p className="text-base font-bold text-accent">₹{order.water_cost || 'N/A'}</p>
                  <p className="text-[10px] text-secondary">Total Fare</p>
                </div>
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{order.water_co2_kg || 'N/A'} kg</p>
                  <p className="text-[10px] text-secondary">CO₂ Impact</p>
                </div>
              </div>
            </div>

            {order.comparison_explanation && (
              <div className="p-3 bg-main rounded-lg border border-default text-xs text-secondary">
                <span className="font-semibold text-primary block mb-0.5">Route Analysis:</span>
                {order.comparison_explanation}
              </div>
            )}
          </div>

          {/* Rating Form (Active after delivery) */}
          {order.status === 'delivered' && (
            <div className="card p-5 bg-surface border-2 border-accent rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌟</span>
                <h4 className="font-bold text-sm text-primary">Rate Your Experience</h4>
              </div>
              <p className="text-xs text-secondary">
                Your feedback helps maintain quality and reliability on Kerala&apos;s waterways.
              </p>

              {ratingSubmitted ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center">
                  ✓ Thank you! Your rating has been submitted.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2 justify-center py-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingStars(star)}
                        className={`text-2xl transition-transform hover:scale-125 ${
                          star <= ratingStars ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={2}
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="Share comments on punctuality, handling, barge safety..."
                    className="input text-xs resize-none"
                  />

                  <button
                    type="button"
                    disabled={ratingSubmitting}
                    onClick={() => providers[0] && handleRatingSubmit(providers[0].id)}
                    className="btn btn-primary w-full text-xs py-2"
                  >
                    {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
