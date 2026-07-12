import { View, Text, Pressable, LayoutChangeEvent, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { fonts, palette } from '../theme';
import { haptics } from '../utils/haptics';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Assets: 'wallet',
  Transactions: 'list-outline',
  Insights: 'bar-chart-outline',
  Settings: 'settings-outline',
};

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const colors = isDark ? palette.dark.tabBar : palette.light.tabBar;
  const tabWidth = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (tabWidth.value > 0) {
      translateX.value = withSpring(state.index * tabWidth.value, {
        damping: 18,
        stiffness: 180,
      });
    }
  }, [state.index]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width / state.routes.length;
    tabWidth.value = w;
    translateX.value = state.index * w;
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    width: Math.max(tabWidth.value - 16, 0),
    transform: [{ translateX: translateX.value + 8 }],
  }));

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.bar,
        {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: palette.primary + (isDark ? '55' : '22') },
          indicatorStyle,
        ]}
      />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title ?? route.name;
        const focused = state.index === index;
        const color = focused ? colors.active : colors.inactive;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                haptics.selection();
                navigation.navigate(route.name, route.params);
              }
            }}
            style={styles.tab}
          >
            <Ionicons name={ICONS[route.name] || 'ellipse'} size={22} color={color} />
            <Text
              style={{
                fontFamily: focused ? fonts.semibold : fonts.medium,
                fontSize: 11,
                color,
                marginTop: 2,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    minHeight: 68,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    height: 56,
    borderRadius: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    paddingVertical: 6,
  },
});
