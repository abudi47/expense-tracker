import { memo } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';
import { theme } from '../theme';
import { palette } from '../theme';
import { LegacyBadge } from './design';

interface Props {
  item: Transaction;
  accountName?: string;
  onPress: () => void;
  onDelete: () => void;
}

function TransactionRow({ item, accountName, onPress, onDelete }: Props) {
  const isLegacy = !item.accountId;

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
        className={`${theme.card} rounded-xl p-4 mb-3 flex-row items-center`}
      >
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{
            backgroundColor:
              item.type === 'income'
                ? palette.income + '22'
                : item.type === 'transfer'
                  ? palette.transfer + '22'
                  : palette.expense + '22',
          }}
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
            color={
              item.type === 'income'
                ? palette.income
                : item.type === 'transfer'
                  ? palette.transfer
                  : palette.expense
            }
          />
        </View>
        <View className="flex-1 ml-3">
          <View className="flex-row items-center gap-2">
            <Text className={`${theme.title} font-medium`}>
              {item.type === 'income' ? item.source || item.category : item.category || 'Transfer'}
            </Text>
            {isLegacy && <LegacyBadge />}
          </View>
          <Text className={`${theme.subtitle} text-xs mt-0.5`}>
            {formatDate(item.date)}
            {accountName ? ` · ${accountName}` : ''}
            {item.isRecurring ? ' · Recurring' : ''}
          </Text>
        </View>
        <Text
          className={`font-bold ${item.type === 'income' ? 'text-green-500' : item.type === 'transfer' ? 'text-purple-500' : 'text-red-500'}`}
        >
          {item.type === 'income' ? '+' : item.type === 'expense' ? '-' : ''}
          {formatCurrency(item.amount)}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );
}

export default memo(TransactionRow);
