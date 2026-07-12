import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { fonts, typeScale } from '../theme';
import { useThemeColors } from '../theme/useThemeColors';

type Variant = keyof typeof typeScale;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: 'primary' | 'secondary' | 'muted' | 'onPrimary' | 'income' | 'expense' | 'inherit';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}

const weightMap = {
  regular: fonts.regular,
  medium: fonts.medium,
  semibold: fonts.semibold,
  bold: fonts.bold,
} as const;

export function AppText({
  variant = 'body',
  color = 'primary',
  weight,
  style,
  children,
  ...props
}: AppTextProps) {
  const colors = useThemeColors();

  const colorValue =
    color === 'inherit'
      ? undefined
      : color === 'primary'
        ? colors.text
        : color === 'secondary'
          ? colors.textSecondary
          : color === 'muted'
            ? colors.textMuted
            : color === 'onPrimary'
              ? colors.textOnPrimary
              : color === 'income'
                ? '#059669'
                : color === 'expense'
                  ? '#DC2626'
                  : colors.text;

  const base = typeScale[variant];
  const fontFamily = weight ? weightMap[weight] : base.fontFamily;

  return (
    <Text
      {...props}
      style={[
        base as TextStyle,
        { fontFamily, color: colorValue },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export const textStyles = StyleSheet.create({
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
