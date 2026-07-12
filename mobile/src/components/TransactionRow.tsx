import { memo } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';
import { theme, fonts, palette } from '../theme';
import { LegacyBadge } from './design';

interface Props {
  item: Transaction;
  accountName?: string;
  onPress: () => void;
  onDelete: () => void;
}

function TransactionRow({ item, accountName, onPress, onDelete }: Props) {
  const isLegacy = !item.accountId;
  const accent =
    item.type === 'income'
      ? palette.income
      : item.type === 'transfer'
        ? palette.transfer
        : palette.expense;

  const renderRight = () => (
    <TouchableOpacity
      onPress={() =>
        Alert.alert('Delete', 'Remove this transaction?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: onDelete },
        ])
      }
      className="bg-red-500 justify-center px-5 rounded-xl mb-3 ml-2"
    >
      <Ionicons name="trash-outline" size={22} color="#fff" />
    </TouchableOpacity>
  );

  return (
    <Swipeable renderRightActions={renderRight} overshootRight={false}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        className={`${theme.card} rounded-2xl p-4 mb-3 flex-row items-center`}
        style={{
          shadowColor: '#1E1B4B',
          shadowOpacity: 0.06,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
      >
        <View
          className="w-11 h-11 rounded-2xl items-center justify-center"
          style={{ backgroundColor: accent + '18' }}
        >
          <Ionicons
            name={
              item.type === 'income'
                ? 'arrow-down'
                : item.type === 'transfer'
                  ? 'swap-horizontal'
                  : 'arrow-up'
            }
            size={20}
            color={accent}
          />
        </View>
        <View className="flex-1 ml-3">
          <View className="flex-row items-center gap-2">
            <Text className={theme.title} style={{ fontFamily: fonts.medium, fontSize: 15 }}>
              {item.type === 'income' ? item.source || item.category : item.category || 'Transfer'}
            </Text>
            {isLegacy && <LegacyBadge />}
          </View>
          <Text
            className={`${theme.subtitle} text-xs mt-0.5`}
            style={{ fontFamily: fonts.regular }}
          >
            {formatDate(item.date)}
            {accountName ? ` · ${accountName}` : ''}
            {item.isRecurring ? ' · Recurring' : ''}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: fonts.bold,
            fontSize: 15,
            fontVariant: ['tabular-nums'],
            color: accent,
          }}
        >
          {item.type === 'income' ? '+' : item.type === 'expense' ? '-' : ''}
          {formatCurrency(item.amount)}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );
}

export default memo(TransactionRow);
