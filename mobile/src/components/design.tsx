import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, typography } from '../theme';
import { useThemeColors } from '../theme/useThemeColors';
import { formatCurrency } from '../utils/format';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = 'file-tray-outline', title, subtitle }: EmptyStateProps) {
  const colors = useThemeColors();
  return (
    <View className="items-center py-16 px-6">
      <Ionicons name={icon} size={48} color={colors.icon} />
      <Text className={`${theme.title} ${typography.subheading} mt-4 text-center`}>{title}</Text>
      {subtitle ? (
        <Text className={`${theme.subtitle} text-sm mt-2 text-center`}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="items-center py-12 px-6">
      <Ionicons name="cloud-offline-outline" size={40} color="#ef4444" />
      <Text className={`${theme.subtitle} text-sm mt-3 text-center`}>{message}</Text>
      {onRetry ? (
        <Text className="text-accent text-sm mt-2 font-semibold" onPress={onRetry}>
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
}

export function AmountText({ amount, type = 'neutral', showSign, className }: AmountTextProps) {
  const colorClass =
    type === 'income'
      ? 'text-green-500'
      : type === 'expense'
        ? 'text-red-500'
        : type === 'transfer'
          ? 'text-purple-500'
          : theme.title;

  const sign =
    showSign && type === 'income' ? '+' : showSign && type === 'expense' ? '-' : '';

  return (
    <Text className={`${typography.mono} ${colorClass} ${className || ''}`}>
      {sign}
      {formatCurrency(amount)}
    </Text>
  );
}

interface AccountCardProps {
  name: string;
  balance: number;
  currency: string;
  icon: string;
  color: string;
  onPress?: () => void;
}

export function AccountCard({ name, balance, currency, icon, color, onPress }: AccountCardProps) {
  const content = (
    <>
      <View className="flex-row items-center mb-2">
        <View
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: color + '22' }}
        >
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={color} />
        </View>
      </View>
      <Text className={`${theme.subtitle} text-xs`}>{name}</Text>
      <Text className={`${theme.title} ${typography.subheading} mt-0.5`}>
        {formatCurrency(balance)} {currency}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        className={`${theme.card} rounded-2xl p-4 flex-1 min-w-[46%] mb-3`}
        style={{ borderLeftWidth: 4, borderLeftColor: color }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      className={`${theme.card} rounded-2xl p-4 flex-1 min-w-[46%] mb-3`}
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
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
      <Text className={`text-sm ${selected ? theme.chipTextActive : theme.chipText}`}>{label}</Text>
    </TouchableOpacity>
  );
}

export function LegacyBadge() {
  return (
    <View className="bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">
      <Text className="text-amber-700 dark:text-amber-300 text-xs font-medium">Legacy</Text>
    </View>
  );
}
