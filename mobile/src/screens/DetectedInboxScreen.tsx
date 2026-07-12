import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CategoryChip, EmptyState, ErrorState } from '../components/design';
import { api, Account, DetectedItem, ApiError } from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';
import { theme, fonts, palette } from '../theme';
import { useToast } from '../components/Toast';
import { haptics } from '../utils/haptics';

function suggestedId(item: DetectedItem) {
  if (typeof item.suggestedAccountId === 'object' && item.suggestedAccountId) {
    return item.suggestedAccountId._id;
  }
  return item.suggestedAccountId || '';
}

export default function DetectedInboxScreen() {
  const { showToast } = useToast();
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      const [detected, accs] = await Promise.all([
        api.get<{ items: DetectedItem[]; needsReviewCount: number }>('/detected?status=needs_review'),
        api.get<Account[]>('/accounts'),
      ]);
      setItems(detected.items);
      setAccounts(accs);
      const map: Record<string, string> = {};
      detected.items.forEach((i) => {
        map[i._id] = suggestedId(i) || accs[0]?._id || '';
      });
      setSelectedAccounts(map);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const approve = async (item: DetectedItem, force = false, allowOverdraft = false) => {
    try {
      const result = await api.post<{
        balanceMismatch?: {
          appBalance: number;
          reportedBalance: number;
          accountName: string;
        };
      }>(`/detected/${item._id}/approve`, {
        accountId: selectedAccounts[item._id],
        force,
        allowOverdraft,
      });
      showToast('Transaction added', 'success');
      if (result.balanceMismatch) {
        Alert.alert(
          'Balance mismatch',
          `${result.balanceMismatch.accountName}: app shows ${formatCurrency(
            result.balanceMismatch.appBalance
          )} but the message reported ${formatCurrency(
            result.balanceMismatch.reportedBalance
          )}. Review your ledger — nothing was overwritten.`
        );
      }
      load();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DUPLICATE') {
        Alert.alert('Likely duplicate', 'A similar transaction exists. Approve anyway?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Approve', onPress: () => approve(item, true, allowOverdraft) },
        ]);
        return;
      }
      if (err instanceof ApiError && err.code === 'OVERDRAFT') {
        Alert.alert('Overdraft', err.message, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', style: 'destructive', onPress: () => approve(item, force, true) },
        ]);
        return;
      }
      showToast(err instanceof Error ? err.message : 'Approve failed', 'error');
    }
  };

  const dismiss = async (item: DetectedItem) => {
    await api.post(`/detected/${item._id}/dismiss`, {});
    haptics.light();
    load();
  };

  return (
    <View className={`flex-1 ${theme.screen}`}>
      <View className="px-5 pt-2 pb-3">
        <Text className={theme.subtitle} style={{ fontFamily: fonts.regular, fontSize: 13 }}>
          Review before anything hits your real balance
        </Text>
      </View>

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <FlatList
        data={items}
        keyExtractor={(i) => i._id}
        contentContainerClassName="px-5 pb-10"
        ListEmptyComponent={
          <EmptyState
            icon="mail-unread-outline"
            title="Nothing to review"
            subtitle="Detected SMS/email transactions will appear here"
          />
        }
        renderItem={({ item }) => {
          const color = item.direction === 'incoming' ? palette.income : palette.expense;
          return (
            <View className={`${theme.card} rounded-2xl p-4 mb-3`}>
              <View className="flex-row justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <View
                    className="px-2 py-0.5 rounded"
                    style={{ backgroundColor: palette.primary + '18' }}
                  >
                    <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: palette.primary }}>
                      {item.source.toUpperCase()}
                    </Text>
                  </View>
                  {item.status === 'duplicate' ? (
                    <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: palette.warning }}>
                      Likely duplicate
                    </Text>
                  ) : null}
                </View>
                <Text style={{ fontFamily: fonts.bold, color, fontVariant: ['tabular-nums'] }}>
                  {item.direction === 'incoming' ? '+' : '-'}
                  {formatCurrency(item.amount, item.currency)}
                </Text>
              </View>
              <Text className={theme.subtitle} style={{ fontFamily: fonts.regular, fontSize: 12 }}>
                {formatDate(item.date)}
                {item.fee ? ` · Fee ${formatCurrency(item.fee)}` : ''}
                {item.rawReference ? ` · Ref ${item.rawReference.slice(0, 16)}` : ''}
              </Text>
              {item.rawSnippet ? (
                <Text
                  className={`${theme.subtitle} mt-2`}
                  style={{ fontFamily: fonts.regular, fontSize: 11 }}
                  numberOfLines={3}
                >
                  {item.rawSnippet}
                </Text>
              ) : null}

              <Text
                className={`${theme.label} text-xs mt-3 mb-2`}
                style={{ fontFamily: fonts.medium }}
              >
                Account
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                <View className="flex-row gap-2">
                  {accounts.map((a) => (
                    <CategoryChip
                      key={a._id}
                      label={a.name}
                      selected={selectedAccounts[item._id] === a._id}
                      onPress={() =>
                        setSelectedAccounts((prev) => ({ ...prev, [item._id]: a._id }))
                      }
                    />
                  ))}
                </View>
              </ScrollView>

              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => approve(item)}
                  className="flex-1 py-3 rounded-xl items-center"
                  style={{ backgroundColor: palette.primary }}
                >
                  <Text style={{ fontFamily: fonts.semibold, color: '#fff' }}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => dismiss(item)}
                  className="px-5 py-3 rounded-xl items-center border"
                  style={{ borderColor: theme.divider.includes('dark') ? '#2E2850' : '#E9E5F5' }}
                >
                  <Text style={{ fontFamily: fonts.medium, color: palette.expense }}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
