'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import type { UserRole } from '@/lib/types/database';

const roleLabels: Record<UserRole, string> = {
  user: 'Cargo Owner',
  ship_owner: 'Ship Owner',
  worker: 'Worker',
  taxi: 'Taxi Provider',
  admin: 'Administrator',
};

const rolePaths: Record<UserRole, string> = {
  user: '/dashboard/user',
  ship_owner: '/dashboard/ship-owner',
  worker: '/dashboard/worker',
  taxi: '/dashboard/taxi',
  admin: '/dashboard/admin',
};

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const roleNavItems: Record<UserRole, NavItem[]> = {
  user: [
    { label: 'Book', href: '/dashboard/user', icon: '📦' },
    { label: 'Orders', href: '/dashboard/user/orders', icon: '📋' },
    { label: 'Profile', href: '/dashboard/user/profile', icon: '👤' },
  ],
  ship_owner: [
    { label: 'Map', href: '/dashboard/ship-owner', icon: '🗺️' },
    { label: 'My Jobs', href: '/dashboard/ship-owner/jobs', icon: '⚓' },
    { label: 'Requests', href: '/dashboard/ship-owner/requests', icon: '📨' },
    { label: 'Boats', href: '/dashboard/ship-owner/boats', icon: '🚢' },
    { label: 'Profile', href: '/dashboard/ship-owner/profile', icon: '👤' },
  ],
  worker: [
    { label: 'Map', href: '/dashboard/worker', icon: '🗺️' },
    { label: 'My Jobs', href: '/dashboard/worker/jobs', icon: '💪' },
    { label: 'Requests', href: '/dashboard/worker/requests', icon: '📨' },
    { label: 'Profile', href: '/dashboard/worker/profile', icon: '👤' },
  ],
  taxi: [
    { label: 'Map', href: '/dashboard/taxi', icon: '🗺️' },
    { label: 'My Jobs', href: '/dashboard/taxi/jobs', icon: '🚛' },
    { label: 'Requests', href: '/dashboard/taxi/requests', icon: '📨' },
    { label: 'Profile', href: '/dashboard/taxi/profile', icon: '👤' },
  ],
  admin: [
    { label: 'Overview', href: '/dashboard/admin', icon: '📊' },
    { label: 'Users', href: '/dashboard/admin/users', icon: '👥' },
    { label: 'Orders', href: '/dashboard/admin/orders', icon: '📋' },
    { label: 'Rates', href: '/dashboard/admin/rates', icon: '💰' },
    { label: 'Waterways', href: '/dashboard/admin/waterways', icon: '🌊' },
    { label: 'Messages', href: '/dashboard/admin/messages', icon: '✉️' },
  ],
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (!loading && profile) {
      // Check if user is suspended
      if (profile.suspended) {
        signOut();
        router.push('/login?error=suspended');
        return;
      }

      // Redirect to role-specific dashboard if at /dashboard
      if (pathname === '/dashboard') {
        router.push(rolePaths[profile.role]);
        return;
      }

      // Check if user has access to the current path
      const allowedPath = rolePaths[profile.role];
      if (!pathname.startsWith(allowedPath)) {
        router.push(allowedPath);
      }
    }
  }, [loading, user, profile, pathname, router, signOut]);

  if (loading) {
    return (
      <div className="min-h-screen bg-main flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40 }} />
          <p className="text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  const navItems = roleNavItems[profile.role] || [];
  const activeItem = navItems.find((item) => pathname === item.href) || navItems[0];

  return (
    <div className="min-h-screen bg-main flex flex-col">
      {/* Top navbar (mobile) */}
      <header className="sticky top-0 z-50 bg-surface border-b border-default px-4 py-3 flex items-center justify-between md:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-accent-light"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5h14a1 1 0 110 2H3a1 1 0 010-2zm0 4h14a1 1 0 110 2H3a1 1 0 010-2zm0 4h14a1 1 0 110 2H3a1 1 0 010-2z" />
          </svg>
        </button>
        <span className="text-accent font-bold">JalaSetu</span>
        <ThemeToggle />
      </header>

      <div className="flex flex-1">
        {/* Sidebar (desktop) / Slide-over (mobile) */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 w-64 bg-surface border-r border-default transform transition-transform duration-200 ease-in-out
            md:relative md:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="p-4 border-b border-default hidden md:block">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-accent">JalaSetu</h1>
              <ThemeToggle />
            </div>
          </div>

          <div className="p-4 border-b border-default">
            <p className="font-medium text-primary truncate">{profile.name}</p>
            <p className="text-xs text-secondary">{roleLabels[profile.role]}</p>
          </div>

          <nav className="p-2 flex-1">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => {
                  router.push(item.href);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-1 ${
                  pathname === item.href
                    ? 'bg-accent-light text-accent font-medium'
                    : 'text-secondary hover:text-primary hover:bg-accent-light'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-default">
            <button
              onClick={async () => {
                await signOut();
                router.push('/login');
              }}
              className="w-full btn btn-secondary text-sm"
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {/* Desktop header */}
          <div className="hidden md:block px-6 py-4 border-b border-default bg-surface">
            <h2 className="text-lg font-medium text-primary">
              {activeItem?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-default px-2 py-1 z-50">
        <div className="flex justify-around">
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center py-1.5 px-2 text-xs ${
                pathname === item.href
                  ? 'text-accent'
                  : 'text-secondary'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="mt-0.5">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
