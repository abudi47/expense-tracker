import { LinearGradient } from 'expo-linear-gradient';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { palette } from '../theme';

interface Props {
  children: React.ReactNode;
  colors?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
}

export function GradientCard({ children, colors, style, ...props }: Props) {
  const { isDark } = useTheme();
  const stops = colors ?? (isDark ? palette.dark.heroGradient : palette.light.heroGradient);

  return (
    <LinearGradient
      colors={[...stops]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, style]}
      {...props}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
});

export function SoftGlow({ color = palette.primary }: { color?: string }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -40,
        right: -30,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: color,
        opacity: 0.25,
      }}
    />
  );
}
