'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile) {
      const paths: Record<string, string> = {
        user: '/dashboard/user',
        ship_owner: '/dashboard/ship-owner',
        worker: '/dashboard/worker',
        taxi: '/dashboard/taxi',
        admin: '/dashboard/admin',
      };
      router.push(paths[profile.role] || '/dashboard/user');
    }
  }, [loading, profile, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="spinner" />
    </div>
  );
}
