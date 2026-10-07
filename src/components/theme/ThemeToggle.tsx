'use client';

import { useEffect, useState } from 'react';
import { useTheme } from './ThemeProvider';

/**
 * Simple dark ↔ light toggle pill — no system mode.
 * On first mount reads localStorage; toggles on click.
 */
export function ThemeToggle() {
  const { setTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read saved preference; default to light
    const saved = localStorage.getItem('jalasetu-theme');
    const dark = saved === 'dark';
    setIsDark(dark);
    setMounted(true);
    // Force correct initial state (override any 'system' leftover)
    if (saved !== 'dark' && saved !== 'light') {
      setTheme('light');
    }
  }, [setTheme]);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    setTheme(next ? 'dark' : 'light');
  };

  // Render a placeholder of identical size before mount to prevent layout shift
  if (!mounted) {
    return (
      <div
        style={{ width: 52, height: 28 }}
        className="rounded-full bg-surface border border-default"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      className="relative flex items-center rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={{
        width: 52,
        height: 28,
        backgroundColor: isDark ? '#3F7F83' : '#e2e8f0',
        border: '2px solid',
        borderColor: isDark ? '#3F7F83' : '#cbd5e1',
      }}
    >
      {/* Track label icons */}
      <span
        className="absolute left-1.5 text-[11px] select-none transition-opacity duration-200"
        style={{ opacity: isDark ? 1 : 0 }}
      >
        🌙
      </span>
      <span
        className="absolute right-1.5 text-[11px] select-none transition-opacity duration-200"
        style={{ opacity: isDark ? 0 : 1 }}
      >
        ☀️
      </span>

      {/* Sliding thumb */}
      <span
        className="absolute rounded-full bg-white shadow-md transition-transform duration-300"
        style={{
          width: 20,
          height: 20,
          top: 2,
          left: 2,
          transform: isDark ? 'translateX(24px)' : 'translateX(0)',
        }}
      />
    </button>
  );
}
