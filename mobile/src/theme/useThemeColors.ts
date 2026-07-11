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
      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
      labelColor: () => colors.chartLabel,
      propsForDots: { r: '4', strokeWidth: '2', stroke: palette.primary },
    }),
    [colors]
  );
}

export const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
