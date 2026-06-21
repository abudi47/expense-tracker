export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_KEY = 'app_theme_mode';

export const theme = {
  screen: 'bg-slate-50 dark:bg-navy-950',
  card: 'bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700',
  cardMuted: 'bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-navy-800',
  title: 'text-slate-900 dark:text-white',
  subtitle: 'text-slate-500 dark:text-navy-400',
  label: 'text-slate-600 dark:text-navy-300',
  input:
    'bg-white dark:bg-navy-800 border border-slate-300 dark:border-navy-600 text-slate-900 dark:text-white',
  divider: 'bg-slate-200 dark:bg-navy-700',
  tabBar: {
    light: { bg: '#ffffff', border: '#e2e8f0', active: '#2563eb', inactive: '#94a3b8' },
    dark: { bg: '#102a43', border: '#243b53', active: '#60a5fa', inactive: '#627d98' },
  },
} as const;
