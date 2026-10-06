'use client';

import { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import type { ThemeMode } from '@/lib/types/database';

const themeOptions: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-surface border border-default">
      {themeOptions.map(({ value, label, icon }) => {
        const isActive = mounted ? theme === value : value === 'system';
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isActive
                ? 'bg-accent text-white'
                : 'text-secondary hover:text-primary'
            }`}
            title={label}
          >
            <span className="mr-1">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
