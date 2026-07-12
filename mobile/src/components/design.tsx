import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { theme, typography, fonts, palette } from '../theme';
import { useThemeColors } from '../theme/useThemeColors';
import { formatCurrency, currencyLabel, currencyChipColor } from '../utils/format';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = 'file-tray-outline', title, subtitle }: EmptyStateProps) {
  const colors = useThemeColors();
  return (
    <View className="items-center py-16 px-6">
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-2"
        style={{ backgroundColor: palette.primary + '18' }}
      >
        <Ionicons name={icon} size={40} color={palette.primaryLight} />
      </View>
      <Text
        className={`${theme.title} text-lg mt-4 text-center`}
        style={{ fontFamily: fonts.semibold }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          className={`${theme.subtitle} text-sm mt-2 text-center`}
          style={{ fontFamily: fonts.regular }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="items-center py-12 px-6">
      <View className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 items-center justify-center">
        <Ionicons name="cloud-offline-outline" size={32} color="#DC2626" />
      </View>
      <Text
        className={`${theme.subtitle} text-sm mt-3 text-center`}
        style={{ fontFamily: fonts.regular }}
      >
        {message}
      </Text>
      {onRetry ? (
        <Text
          className="text-accent text-sm mt-3"
          style={{ fontFamily: fonts.semibold }}
          onPress={onRetry}
        >
          Tap to retry
        </Text>
      ) : null}
    </View>
  );
}

interface AmountTextProps {
  amount: number;
  type?: 'income' | 'expense' | 'transfer' | 'neutral';
  showSign?: boolean;
  className?: string;
  currency?: string;
}

export function AmountText({
  amount,
  type = 'neutral',
  showSign,
  className,
  currency = 'ETB',
}: AmountTextProps) {
  const colorClass =
    type === 'income'
      ? 'text-emerald-600 dark:text-emerald-400'
      : type === 'expense'
        ? 'text-red-600 dark:text-red-400'
        : type === 'transfer'
          ? 'text-blue-600 dark:text-blue-400'
          : theme.title;

  const sign =
    showSign && type === 'income' ? '+' : showSign && type === 'expense' ? '-' : '';

  return (
    <Text
      className={`${typography.mono} ${colorClass} ${className || ''}`}
      style={{ fontFamily: fonts.semibold, fontVariant: ['tabular-nums'] }}
    >
      {sign}
      {formatCurrency(amount, currency)}
    </Text>
  );
}

interface AccountCardProps {
  name: string;
  balance: number;
  currency: string;
  icon: string;
  color: string;
  convertedBalance?: number;
  displayCurrency?: string;
  fxGroup?: string;
  onPress?: () => void;
}

export function AccountCard({
  name,
  balance,
  currency,
  icon,
  color,
  convertedBalance,
  displayCurrency,
  fxGroup,
  onPress,
}: AccountCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const showConverted =
    convertedBalance != null &&
    displayCurrency &&
    displayCurrency !== currency &&
    !(currency === 'USDT' && displayCurrency === 'USD');

  const content = (
    <>
      <View className="flex-row items-center mb-3 justify-between">
        <View
          className="w-10 h-10 rounded-2xl items-center justify-center"
          style={{ backgroundColor: color + '22' }}
        >
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={color} />
        </View>
        <View
          className="px-2 py-0.5 rounded-md"
          style={{ backgroundColor: currencyChipColor(currency) + '22' }}
        >
          <Text
            style={{
              fontFamily: fonts.semibold,
              fontSize: 10,
              color: currencyChipColor(currency),
            }}
          >
            {currencyLabel(currency)}
          </Text>
        </View>
      </View>
      <Text className={`${theme.subtitle} text-xs`} style={{ fontFamily: fonts.medium }}>
        {name}
      </Text>
      <Text
        className={`${theme.title} text-lg mt-1`}
        style={{ fontFamily: fonts.bold, fontVariant: ['tabular-nums'] }}
      >
        {formatCurrency(balance, currency)}
      </Text>
      {showConverted ? (
        <Text className={`${theme.subtitle} text-xs mt-0.5`} style={{ fontFamily: fonts.regular }}>
          ≈ {formatCurrency(convertedBalance!, displayCurrency)}
        </Text>
      ) : null}
    </>
  );

  const cardClass = `${theme.card} rounded-2xl p-4 flex-1 min-w-[46%] mb-3`;
  const cardStyle = {
    borderLeftWidth: 4,
    borderLeftColor: color,
    shadowColor: color,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  };

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.96);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
        style={[animStyle, cardStyle]}
        className={cardClass}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <View className={cardClass} style={cardStyle}>
      {content}
    </View>
  );
}

export function CategoryChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-3 py-2 rounded-full border ${selected ? theme.chipActive : theme.chip}`}
    >
      <Text
        className={`text-sm ${selected ? theme.chipTextActive : theme.chipText}`}
        style={{ fontFamily: fonts.medium }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function LegacyBadge() {
  return (
    <View className="bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">
      <Text
        className="text-amber-700 dark:text-amber-300 text-xs"
        style={{ fontFamily: fonts.medium }}
      >
        Legacy
      </Text>
    </View>
  );
}
