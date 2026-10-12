import { useCallback, useEffect, useState } from 'react';

const KEY = 'cm-theme';

export type Theme = 'dark' | 'light';

function readTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* ignore */
  }
  return 'dark';
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof document !== 'undefined' ? readTheme() : 'dark',
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggle, setTheme: setThemeState };
}
