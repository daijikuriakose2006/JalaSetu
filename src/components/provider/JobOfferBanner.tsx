'use client';

import { useEffect } from 'react';

export interface OfferBannerData {
  jobId: string;
  orderId?: string;
  type: string;
  from: string;
  destination: string;
  item: string;
  quantity: string;
  estimatedPayout: number;
}

interface JobOfferBannerProps {
  offer: OfferBannerData | null;
  onAccept: (jobId: string) => Promise<void>;
  onDismiss: () => void;
  loading: boolean;
}

export default function JobOfferBanner({
  offer,
  onAccept,
  onDismiss,
  loading,
}: JobOfferBannerProps) {
  useEffect(() => {
    if (!offer) return;
    // Auto dismiss after 60 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 60000);
    return () => clearTimeout(timer);
  }, [offer, onDismiss]);

  if (!offer) return null;

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-bounce-in">
      <div className="p-4 rounded-xl bg-accent text-white shadow-xl border-2 border-white/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔔</span>
            <span className="font-bold text-sm tracking-wide uppercase">New Job Offer!</span>
          </div>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-mono">
            ₹{offer.estimatedPayout}
          </span>
        </div>

        <div className="space-y-1 text-xs text-white/90">
          <p>
            <strong>Cargo:</strong> {offer.item} ({offer.quantity})
          </p>
          <p className="truncate">
            <strong>From:</strong> {offer.from}
          </p>
          <p className="truncate">
            <strong>To:</strong> {offer.destination}
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={() => onAccept(offer.jobId)}
            className="flex-1 py-2 rounded-lg bg-white text-accent font-bold text-xs hover:bg-white/90 transition-colors shadow-sm"
          >
            {loading ? 'Claiming...' : 'Accept Job ✓'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onDismiss}
            className="px-3 py-2 rounded-lg bg-black/20 hover:bg-black/30 text-white font-medium text-xs transition-colors"
          >
            Decline ✕
          </button>
        </div>
      </div>
    </div>
  );
}
