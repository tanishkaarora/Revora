'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';

export type ThemeMode = 'light' | 'dark' | 'system';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = (localStorage.getItem('revora-theme') as ThemeMode) || 'dark';
    setTheme(saved);
    applyTheme(saved);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const current = localStorage.getItem('revora-theme') as ThemeMode;
      if (current === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    const root = document.documentElement;
    if (mode === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', systemDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', mode);
    }
  };

  const handleSelect = (mode: ThemeMode) => {
    setTheme(mode);
    localStorage.setItem('revora-theme', mode);
    applyTheme(mode);
  };

  if (!mounted) {
    return (
      <div className="flex items-center gap-0.5 bg-surface-subtle p-1 rounded-xl border border-border-subtle h-8 w-24 opacity-60" />
    );
  }

  return (
    <div 
      className="flex items-center gap-0.5 bg-surface-subtle p-0.5 rounded-xl border border-border-subtle text-content-secondary"
      role="radiogroup"
      aria-label="Color theme selector"
    >
      <button
        type="button"
        onClick={() => handleSelect('light')}
        role="radio"
        aria-checked={theme === 'light'}
        aria-label="Light theme"
        title="Light theme"
        className={`p-1.5 rounded-lg transition-all text-xs flex items-center justify-center cursor-pointer ${
          theme === 'light'
            ? 'bg-surface text-brand-jade font-semibold shadow-sm border border-border-subtle'
            : 'hover:text-content-primary hover:bg-surface/50 border border-transparent'
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => handleSelect('system')}
        role="radio"
        aria-checked={theme === 'system'}
        aria-label="System theme"
        title="Follow system theme"
        className={`p-1.5 rounded-lg transition-all text-xs flex items-center justify-center cursor-pointer ${
          theme === 'system'
            ? 'bg-surface text-brand-steel font-semibold shadow-sm border border-border-subtle'
            : 'hover:text-content-primary hover:bg-surface/50 border border-transparent'
        }`}
      >
        <Laptop className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => handleSelect('dark')}
        role="radio"
        aria-checked={theme === 'dark'}
        aria-label="Dark theme"
        title="Dark theme"
        className={`p-1.5 rounded-lg transition-all text-xs flex items-center justify-center cursor-pointer ${
          theme === 'dark'
            ? 'bg-surface text-brand-jade-text font-semibold shadow-sm border border-border-subtle'
            : 'hover:text-content-primary hover:bg-surface/50 border border-transparent'
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
