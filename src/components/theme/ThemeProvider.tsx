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
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme || 'light');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const applyTheme = useCallback((t: ThemeMode) => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const resolved: 'light' | 'dark' = t === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-theme', resolved);
    setResolvedTheme(resolved);
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    const safe: ThemeMode = t === 'dark' ? 'dark' : 'light';
    setThemeState(safe);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jalasetu-theme', safe);
    }
    applyTheme(safe);
  }, [applyTheme]);

  // Read localStorage and apply theme only after mounting on client
  useEffect(() => {
    const saved = localStorage.getItem('jalasetu-theme') as ThemeMode;
    // Only accept 'light' or 'dark' — ignore 'system' (legacy)
    const activeTheme: ThemeMode = saved === 'dark' ? 'dark' : 'light';
    setThemeState(activeTheme);
    applyTheme(activeTheme);
  }, [applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
