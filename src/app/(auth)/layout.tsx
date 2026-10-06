'use client';

import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-main flex items-center justify-center p-4 relative">
      {/* Theme toggle — top left */}
      <div className="absolute top-4 left-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-accent">🚢 JalaSetu</h1>
          <p className="text-secondary text-sm mt-1">Kerala Inland Water Transport Marketplace</p>
        </div>
        {children}
      </div>
    </div>
  );
}
