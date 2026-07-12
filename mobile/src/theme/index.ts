export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_KEY = 'app_theme_mode';

export const palette = {
  primary: '#3b82f6',
  primaryLight: '#60a5fa',
  primaryDark: '#2563eb',
  income: '#10b981',
  expense: '#ef4444',
  transfer: '#8b5cf6',
  warning: '#f59e0b',
  light: {
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceMuted: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    inputBg: '#ffffff',
    modal: '#ffffff',
    chartBg: '#f1f5f9',
    chartLabel: '#64748b',
    switchOff: '#cbd5e1',
    icon: '#64748b',
    tabBar: { bg: '#ffffff', border: '#e2e8f0', active: '#2563eb', inactive: '#94a3b8' },
    toast: { success: '#ecfdf5', error: '#fef2f2', info: '#eff6ff' },
  },
  dark: {
    background: '#0f172a',
    surface: '#1e293b',
    surfaceMuted: '#102a43',
    border: '#334155',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#627d98',
    inputBg: '#1e293b',
    modal: '#102a43',
    chartBg: '#1e293b',
    chartLabel: '#94a3b8',
    switchOff: '#334e68',
    icon: '#94a3b8',
    tabBar: { bg: '#102a43', border: '#243b53', active: '#60a5fa', inactive: '#627d98' },
    toast: { success: '#064e3b', error: '#7f1d1d', info: '#1e3a5f' },
  },
} as const;

export const theme = {
  screen: 'bg-slate-50 dark:bg-navy-950',
  card: 'bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700',
  cardMuted: 'bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-navy-800',
  surface: 'bg-white dark:bg-navy-800',
  modal: 'bg-white dark:bg-navy-900',
  title: 'text-slate-900 dark:text-white',
  subtitle: 'text-slate-500 dark:text-navy-400',
  label: 'text-slate-600 dark:text-navy-300',
  input:
    'bg-white dark:bg-navy-800 border border-slate-300 dark:border-navy-600 text-slate-900 dark:text-white',
  chip: 'bg-slate-100 dark:bg-navy-800 border border-slate-300 dark:border-navy-600',
  chipActive: 'bg-accent border-accent',
  chipText: 'text-slate-600 dark:text-navy-300',
  chipTextActive: 'text-white',
  divider: 'bg-slate-200 dark:bg-navy-700',
  tabBar: palette.light.tabBar,
} as const;

export const typography = {
  display: 'text-3xl font-bold',
  heading: 'text-2xl font-bold',
  subheading: 'text-lg font-semibold',
  body: 'text-base',
  caption: 'text-xs',
  mono: 'text-base font-semibold tabular-nums',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const ACCOUNT_ICONS = [
  'wallet',
  'cash',
  'business',
  'card',
  'logo-bitcoin',
  'trending-up',
  'home',
  'phone-portrait',
] as const;

export const ACCOUNT_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#64748b',
] as const;

export const CURRENCIES = ['ETB', 'USD', 'USDT', 'EUR', 'GBP'] as const;

export const FX_GROUPS = [
  {
    id: 'local' as const,
    label: 'ETB (local)',
    hint: 'No conversion — already in Birr',
  },
  {
    id: 'crypto' as const,
    label: 'Crypto / Grey',
    hint: 'Uses Binance/Grey USDT→ETB rate',
  },
  {
    id: 'bank' as const,
    label: 'Bank / other USD',
    hint: 'Uses bank USD→ETB rate',
  },
] as const;
