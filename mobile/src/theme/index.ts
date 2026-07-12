export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_KEY = 'app_theme_mode';

/** Premium fintech palette — confident blue brand */
export const palette = {
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  primaryMuted: '#DBEAFE',
  secondary: '#F59E0B',
  secondaryLight: '#FBBF24',
  income: '#059669',
  expense: '#DC2626',
  transfer: '#2563EB',
  warning: '#D97706',
  usdt: '#0D9488',
  etb: '#D97706',
  gradient: {
    start: '#2563EB',
    mid: '#3B82F6',
    end: '#1D4ED8',
  },
  light: {
    background: '#F0F7FF',
    surface: '#FFFFFF',
    surfaceMuted: '#DBEAFE',
    surfaceElevated: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    textOnPrimary: '#FFFFFF',
    inputBg: '#FFFFFF',
    modal: '#FFFFFF',
    chartBg: '#DBEAFE',
    chartLabel: '#64748B',
    switchOff: '#D1D5DB',
    icon: '#64748B',
    heroGradient: ['#2563EB', '#3B82F6', '#1D4ED8'] as const,
    tabBar: {
      bg: '#FFFFFF',
      border: '#E2E8F0',
      active: '#2563EB',
      inactive: '#94A3B8',
    },
    toast: {
      success: '#ECFDF5',
      error: '#FEF2F2',
      info: '#EFF6FF',
    },
  },
  dark: {
    background: '#0B1220',
    surface: '#152033',
    surfaceMuted: '#1C2A40',
    surfaceElevated: '#1A2740',
    border: '#2A3A52',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textOnPrimary: '#FFFFFF',
    inputBg: '#152033',
    modal: '#152033',
    chartBg: '#152033',
    chartLabel: '#94A3B8',
    switchOff: '#2A3A52',
    icon: '#94A3B8',
    heroGradient: ['#3B82F6', '#2563EB', '#1E3A8A'] as const,
    tabBar: {
      bg: '#0F172A',
      border: '#2A3A52',
      active: '#60A5FA',
      inactive: '#64748B',
    },
    toast: {
      success: '#064E3B',
      error: '#7F1D1D',
      info: '#1E3A8A',
    },
  },
} as const;

export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export const theme = {
  screen: 'bg-[#F0F7FF] dark:bg-[#0B1220]',
  card: 'bg-white dark:bg-[#152033] border border-[#E2E8F0] dark:border-[#2A3A52]',
  cardMuted: 'bg-[#DBEAFE] dark:bg-[#1C2A40] border border-[#E2E8F0] dark:border-[#2A3A52]',
  surface: 'bg-white dark:bg-[#152033]',
  modal: 'bg-white dark:bg-[#152033]',
  title: 'text-[#0F172A] dark:text-[#F1F5F9]',
  subtitle: 'text-[#64748B] dark:text-[#94A3B8]',
  label: 'text-[#475569] dark:text-[#94A3B8]',
  input:
    'bg-white dark:bg-[#152033] border border-[#D1D5DB] dark:border-[#2A3A52] text-[#0F172A] dark:text-[#F1F5F9]',
  chip: 'bg-[#DBEAFE] dark:bg-[#1C2A40] border border-[#E2E8F0] dark:border-[#2A3A52]',
  chipActive: 'bg-accent border-accent',
  chipText: 'text-[#64748B] dark:text-[#94A3B8]',
  chipTextActive: 'text-white',
  divider: 'bg-[#E2E8F0] dark:bg-[#2A3A52]',
  tabBar: palette.light.tabBar,
} as const;

export const typography = {
  display: 'text-3xl',
  heading: 'text-2xl',
  subheading: 'text-lg',
  body: 'text-base',
  caption: 'text-xs',
  mono: 'text-base tabular-nums',
} as const;

export const typeScale = {
  display: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 40 },
  heading: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 32 },
  subheading: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  amount: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 36,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
  amountSm: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
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
  '#2563EB',
  '#059669',
  '#D97706',
  '#DC2626',
  '#0D9488',
  '#DB2777',
  '#0891B2',
  '#7C3AED',
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
