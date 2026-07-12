export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_KEY = 'app_theme_mode';

/** CBE-inspired premium fintech palette — deep violet brand */
export const palette = {
  primary: '#5B21B6',
  primaryLight: '#7C3AED',
  primaryDark: '#4C1D95',
  primaryMuted: '#EDE9FE',
  secondary: '#F59E0B',
  secondaryLight: '#FBBF24',
  income: '#059669',
  expense: '#DC2626',
  transfer: '#7C3AED',
  warning: '#D97706',
  gradient: {
    start: '#5B21B6',
    mid: '#6D28D9',
    end: '#4C1D95',
  },
  light: {
    background: '#F5F3FF',
    surface: '#FFFFFF',
    surfaceMuted: '#EDE9FE',
    surfaceElevated: '#FFFFFF',
    border: '#E9E5F5',
    text: '#1E1B4B',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textOnPrimary: '#FFFFFF',
    inputBg: '#FFFFFF',
    modal: '#FFFFFF',
    chartBg: '#EDE9FE',
    chartLabel: '#6B7280',
    switchOff: '#D1D5DB',
    icon: '#6B7280',
    heroGradient: ['#5B21B6', '#6D28D9', '#4C1D95'] as const,
    tabBar: {
      bg: '#FFFFFF',
      border: '#E9E5F5',
      active: '#5B21B6',
      inactive: '#9CA3AF',
    },
    toast: {
      success: '#ECFDF5',
      error: '#FEF2F2',
      info: '#F5F3FF',
    },
  },
  dark: {
    background: '#0C0A1D',
    surface: '#1A1630',
    surfaceMuted: '#241F3D',
    surfaceElevated: '#221C3A',
    border: '#2E2850',
    text: '#F5F3FF',
    textSecondary: '#A5B4C8',
    textMuted: '#6B7280',
    textOnPrimary: '#FFFFFF',
    inputBg: '#1A1630',
    modal: '#1A1630',
    chartBg: '#1A1630',
    chartLabel: '#A5B4C8',
    switchOff: '#2E2850',
    icon: '#A5B4C8',
    heroGradient: ['#6D28D9', '#5B21B6', '#3B0764'] as const,
    tabBar: {
      bg: '#120F24',
      border: '#2E2850',
      active: '#A78BFA',
      inactive: '#6B7280',
    },
    toast: {
      success: '#064E3B',
      error: '#7F1D1D',
      info: '#2E1065',
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
  screen: 'bg-[#F5F3FF] dark:bg-[#0C0A1D]',
  card: 'bg-white dark:bg-[#1A1630] border border-[#E9E5F5] dark:border-[#2E2850]',
  cardMuted: 'bg-[#EDE9FE] dark:bg-[#241F3D] border border-[#E9E5F5] dark:border-[#2E2850]',
  surface: 'bg-white dark:bg-[#1A1630]',
  modal: 'bg-white dark:bg-[#1A1630]',
  title: 'text-[#1E1B4B] dark:text-[#F5F3FF]',
  subtitle: 'text-[#6B7280] dark:text-[#A5B4C8]',
  label: 'text-[#4B5563] dark:text-[#A5B4C8]',
  input:
    'bg-white dark:bg-[#1A1630] border border-[#D1D5DB] dark:border-[#2E2850] text-[#1E1B4B] dark:text-[#F5F3FF]',
  chip: 'bg-[#EDE9FE] dark:bg-[#241F3D] border border-[#E9E5F5] dark:border-[#2E2850]',
  chipActive: 'bg-accent border-accent',
  chipText: 'text-[#6B7280] dark:text-[#A5B4C8]',
  chipTextActive: 'text-white',
  divider: 'bg-[#E9E5F5] dark:bg-[#2E2850]',
  tabBar: palette.light.tabBar,
} as const;

/** Type scale — use with Text style={{ fontFamily }} or AppText */
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

/** Vibrant account accents — distinct on both light and dark */
export const ACCOUNT_COLORS = [
  '#5B21B6',
  '#059669',
  '#D97706',
  '#DC2626',
  '#2563EB',
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
