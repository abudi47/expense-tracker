import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { theme } from '../theme';

function Shimmer({ className }: { className?: string }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={style}
      className={`bg-slate-200 dark:bg-navy-700 rounded-lg ${className || ''}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <View className={`${theme.card} rounded-2xl p-4 mb-3`}>
      <Shimmer className="h-4 w-24 mb-3" />
      <Shimmer className="h-8 w-40 mb-4" />
      <Shimmer className="h-3 w-full" />
    </View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className={`${theme.card} rounded-xl p-4 mb-3 flex-row items-center`}>
          <Shimmer className="w-10 h-10 rounded-full" />
          <View className="flex-1 ml-3">
            <Shimmer className="h-4 w-32 mb-2" />
            <Shimmer className="h-3 w-20" />
          </View>
          <Shimmer className="h-5 w-16" />
        </View>
      ))}
    </View>
  );
}

export function SkeletonAccountCards() {
  return (
    <View className="flex-row flex-wrap gap-3">
      {[1, 2].map((i) => (
        <View key={i} className={`${theme.card} rounded-2xl p-4 flex-1 min-w-[45%]`}>
          <Shimmer className="h-8 w-8 rounded-full mb-3" />
          <Shimmer className="h-4 w-20 mb-2" />
          <Shimmer className="h-6 w-28" />
        </View>
      ))}
    </View>
  );
}
