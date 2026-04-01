export type AppTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'app-theme';

export function getSystemTheme(): AppTheme {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function getStoredTheme(): AppTheme | null {
  if (typeof window === 'undefined') return null;

  const theme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return theme === 'dark' || theme === 'light' ? theme : null;
}

export function getPreferredTheme(): AppTheme {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: AppTheme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.setAttribute('data-theme', theme);
}

export function setTheme(theme: AppTheme) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  applyTheme(theme);
}

export function initTheme() {
  const theme = getPreferredTheme();
  applyTheme(theme);
  return theme;
}