import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { palette } from './index';

export function useThemeColors() {
  const { isDark } = useTheme();
  return useMemo(() => (isDark ? palette.dark : palette.light), [isDark]);
}

export function useChartConfig() {
  const colors = useThemeColors();
  return useMemo(
    () => ({
      backgroundColor: colors.chartBg,
      backgroundGradientFrom: colors.chartBg,
      backgroundGradientTo: colors.surface,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(91, 33, 182, ${opacity})`,
      labelColor: () => colors.chartLabel,
      propsForDots: { r: '4', strokeWidth: '2', stroke: palette.primaryLight },
    }),
    [colors]
  );
}

export const PIE_COLORS = [
  '#5B21B6',
  '#059669',
  '#D97706',
  '#DC2626',
  '#2563EB',
  '#DB2777',
  '#0891B2',
];
