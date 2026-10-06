'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ThemeMode } from '@/lib/types/database';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'light',
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children, initialTheme }: { children: React.ReactNode; initialTheme?: ThemeMode }) {
  // Always initialize identically on server and client to prevent hydration mismatch
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme || 'system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const applyTheme = useCallback((t: ThemeMode) => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    if (t === 'system') {
      root.removeAttribute('data-theme');
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setResolvedTheme(isDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', t);
      setResolvedTheme(t);
    }
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jalasetu-theme', t);
    }
    applyTheme(t);
  }, [applyTheme]);

  // Read localStorage and apply theme only after mounting on client
  useEffect(() => {
    const saved = localStorage.getItem('jalasetu-theme') as ThemeMode;
    const activeTheme = saved && ['light', 'dark', 'system'].includes(saved) ? saved : theme;
    if (saved) {
      setThemeState(saved);
    }
    applyTheme(activeTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (activeTheme === 'system') {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
