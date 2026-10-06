'use client';

import { useState } from 'react';
import type { Job } from '@/lib/types/database';

interface MyJobsTabProps {
  jobs: (Job & { orders?: any })[];
  role: 'ship_owner' | 'taxi' | 'worker';
  activeJobId: string | null;
  onSelectActive: (job: Job) => void;
  onUpdateStatus: (jobId: string, nextStatus: string) => Promise<void>;
  loading: boolean;
}

export default function MyJobsTab({
  jobs,
  role,
  activeJobId,
  onSelectActive,
  onUpdateStatus,
  loading,
}: MyJobsTabProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusClick = async (jobId: string, nextStatus: string) => {
    setUpdatingId(jobId);
    try {
      await onUpdateStatus(jobId, nextStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const renderStatusButtons = (job: Job) => {
    const isUpdating = updatingId === job.id;

    if (role === 'taxi') {
      return (
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            disabled={isUpdating || job.status === 'done'}
            onClick={() => handleStatusClick(job.id, 'heading_to_pickup')}
            className="btn btn-secondary text-xs py-1.5 px-3"
          >
            1. Heading to Pickup 🚚
          </button>
          <button
            type="button"
            disabled={isUpdating || job.status === 'done'}
            onClick={() => handleStatusClick(job.id, 'picked_up')}
            className="btn btn-secondary text-xs py-1.5 px-3"
          >
            2. Cargo Picked Up 📦
          </button>
          <button
            type="button"
            disabled={isUpdating || job.status === 'done'}
            onClick={() => handleStatusClick(job.id, 'dropped')}
            className="btn btn-primary text-xs py-1.5 px-3"
          >
            3. Dropped at Jetty / Dest ✓
          </button>
        </div>
      );
    }

    if (role === 'ship_owner') {
      return (
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            disabled={isUpdating || job.status === 'done'}
            onClick={() => handleStatusClick(job.id, 'heading_to_jetty')}
            className="btn btn-secondary text-xs py-1.5 px-3"
          >
            1. Heading to Jetty ⚓
          </button>
          <button
            type="button"
            disabled={isUpdating || job.status === 'done'}
            onClick={() => handleStatusClick(job.id, 'loaded')}
            className="btn btn-secondary text-xs py-1.5 px-3"
          >
            2. Loaded & Departed 🚢
          </button>
          <button
            type="button"
            disabled={isUpdating || job.status === 'done'}
            onClick={() => handleStatusClick(job.id, 'in_transit')}
            className="btn btn-secondary text-xs py-1.5 px-3"
          >
            3. In Transit (Backwaters) 🌊
          </button>
          <button
            type="button"
            disabled={isUpdating || job.status === 'done'}
            onClick={() => handleStatusClick(job.id, 'arrived')}
            className="btn btn-primary text-xs py-1.5 px-3"
          >
            4. Arrived at Destination Jetty ✓
          </button>
        </div>
      );
    }

    // Worker role
    return (
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          disabled={isUpdating || job.status === 'done'}
          onClick={() => handleStatusClick(job.id, 'heading')}
          className="btn btn-secondary text-xs py-1.5 px-3"
        >
          1. Heading to Jetty 🚶
        </button>
        <button
          type="button"
          disabled={isUpdating || job.status === 'done'}
          onClick={() => handleStatusClick(job.id, 'started')}
          className="btn btn-secondary text-xs py-1.5 px-3"
        >
          2. Loading / Unloading Started 💪
        </button>
        <button
          type="button"
          disabled={isUpdating || job.status === 'done'}
          onClick={() => handleStatusClick(job.id, 'done')}
          className="btn btn-primary text-xs py-1.5 px-3"
        >
          3. Completed Work ✓
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-secondary text-sm">
        <div className="spinner mx-auto mb-3" style={{ width: 28, height: 28 }} />
        Loading your accepted jobs...
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="card p-12 text-center bg-surface border border-default">
        <span className="text-4xl mb-3 block">⚓</span>
        <h3 className="font-semibold text-primary text-base mb-1">No Active Jobs</h3>
        <p className="text-xs text-secondary mb-4">
          Check the <strong>Requests</strong> tab to accept incoming orders and start earning.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-default">
        <div>
          <h3 className="font-bold text-sm text-primary">My Assigned Jobs</h3>
          <p className="text-xs text-secondary">
            Select one job as your active operation to link live GPS and advance milestones
          </p>
        </div>
        <span className="text-xs text-accent font-semibold">{jobs.length} Job(s)</span>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => {
          const isActive = activeJobId === job.id;
          const order = job.orders;

          return (
            <div
              key={job.id}
              className={`card p-4 rounded-xl border transition-all ${
                isActive
                  ? 'border-accent bg-accent-light/10 shadow-md ring-2 ring-accent/30'
                  : 'border-default bg-surface hover:border-accent/40'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-primary uppercase">
                    {job.type} Job #{job.id.slice(0, 8)}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-main border border-default text-secondary">
                    {job.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-accent">
                    ₹{job.estimated_payout || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectActive(job)}
                    className={`btn text-xs py-1 px-2.5 rounded-md ${
                      isActive ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    {isActive ? '★ Active Operation' : 'Select as Active'}
                  </button>
                </div>
              </div>

              {/* Order cargo details */}
              <div className="p-3 bg-main rounded-lg border border-default text-xs space-y-1 text-secondary mb-3">
                <p>
                  <strong>Cargo:</strong> {order?.cargo_name || 'General Freight'} ({order?.weight_tonnes || 0} tonnes)
                </p>
                <p className="truncate">
                  <strong>Pickup:</strong> {order?.origin_address || 'Origin'}
                </p>
                <p className="truncate">
                  <strong>Destination:</strong> {order?.destination_address || 'Destination'}
                </p>
              </div>

              {/* Status Milestone Advance Buttons */}
              <div className="border-t border-default pt-2">
                <span className="text-[11px] font-semibold text-secondary block mb-1">
                  Update Milestone Status:
                </span>
                {renderStatusButtons(job)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
