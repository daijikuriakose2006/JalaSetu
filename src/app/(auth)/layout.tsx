import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-main flex items-center justify-center p-4 relative">
      {/* Top bar — Back to home and Theme toggle */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2.5">
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-default text-secondary hover:text-accent hover:border-accent transition-all shadow-sm"
        >
          <span>←</span>
          <span>Home</span>
        </Link>
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
