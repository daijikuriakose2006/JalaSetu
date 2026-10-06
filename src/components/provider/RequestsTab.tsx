'use client';

import { useState } from 'react';
import type { Job } from '@/lib/types/database';

interface RequestsTabProps {
  requests: (Job & { orders?: any })[];
  onAccept: (jobId: string) => Promise<void>;
  loading: boolean;
}

export default function RequestsTab({
  requests,
  onAccept,
  loading,
}: RequestsTabProps) {
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [declinedIds, setDeclinedIds] = useState<Set<string>>(new Set());

  const handleClaim = async (jobId: string) => {
    setClaimingId(jobId);
    try {
      await onAccept(jobId);
    } finally {
      setClaimingId(null);
    }
  };

  const handleDecline = (jobId: string) => {
    setDeclinedIds((prev) => new Set([...prev, jobId]));
  };

  const visibleRequests = requests.filter((r) => !declinedIds.has(r.id));

  if (loading) {
    return (
      <div className="py-16 text-center text-secondary text-sm">
        <div className="spinner mx-auto mb-3" style={{ width: 28, height: 28 }} />
        Checking available freight dispatches...
      </div>
    );
  }

  if (visibleRequests.length === 0) {
    return (
      <div className="card p-12 text-center bg-surface border border-default">
        <span className="text-4xl mb-3 block">📨</span>
        <h3 className="font-semibold text-primary text-base mb-1">No New Requests in Queue</h3>
        <p className="text-xs text-secondary mb-3 max-w-md mx-auto">
          No open dispatches available at the moment. As cargo owners create shipments, job offers will automatically appear here.
        </p>
        <p className="text-xs text-accent font-medium">
          💡 Tip: Click <strong>&quot;⚡ Generate Demo Jobs&quot;</strong> in the header above to spawn a sample 8t Kochi→Alappuzha order and test claiming!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-default">
        <div>
          <h3 className="font-bold text-sm text-primary">Incoming Job Requests</h3>
          <p className="text-xs text-secondary">
            Offered jobs and open pool requests matching your vessel/vehicle profile
          </p>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent text-white">
          {visibleRequests.length} Available
        </span>
      </div>

      <div className="space-y-3">
        {visibleRequests.map((job) => {
          const order = job.orders;
          const isClaiming = claimingId === job.id;
          const isQueued = order?.status === 'queued';

          return (
            <div
              key={job.id}
              className="card p-4 rounded-xl border border-default bg-surface hover:border-accent transition-all space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {job.type === 'ship' ? '🚢' : job.type === 'taxi' ? '🚛' : '💪'}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-primary capitalize">
                      {job.type} Freight Request
                    </h4>
                    <span className="text-[10px] text-secondary">
                      {isQueued ? 'Open Pool (Radius Expanded)' : `Offered within ${job.radius_km || 15}km`}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-extrabold text-base text-accent">₹{job.estimated_payout || 0}</p>
                  <p className="text-[10px] text-secondary">Guaranteed Payout</p>
                </div>
              </div>

              {/* Cargo specs */}
              <div className="p-3 bg-main rounded-lg border border-default text-xs space-y-1.5 text-secondary">
                <div className="flex justify-between">
                  <span><strong>Commodity:</strong> {order?.cargo_name || 'Goods'}</span>
                  <span><strong>Weight:</strong> {order?.weight_tonnes || 0} tonnes</span>
                </div>
                <div className="truncate">
                  <strong>From:</strong> {order?.origin_address || 'Origin'}
                </div>
                <div className="truncate">
                  <strong>To:</strong> {order?.destination_address || 'Destination'}
                </div>
                <div>
                  <strong>Scheduled:</strong> {new Date(order?.pickup_time || job.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </div>

              {/* Accept / Decline actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={isClaiming}
                  onClick={() => handleClaim(job.id)}
                  className="btn btn-primary flex-1 py-2 text-xs font-bold shadow-xs"
                >
                  {isClaiming ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="spinner" style={{ width: 14, height: 14 }} />
                      Locking Job (Atomic Claim)...
                    </span>
                  ) : (
                    'Accept & Lock Job ✓'
                  )}
                </button>

                <button
                  type="button"
                  disabled={isClaiming}
                  onClick={() => handleDecline(job.id)}
                  className="btn btn-secondary py-2 px-3 text-xs"
                >
                  Decline ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
