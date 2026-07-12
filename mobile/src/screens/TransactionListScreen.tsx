import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeInRight } from 'react-native-reanimated';
import TransactionRow from '../components/TransactionRow';
import { ScreenHeader } from '../components/ui';
import { EmptyState, ErrorState } from '../components/design';
import { SkeletonList } from '../components/Skeleton';
import { api, Transaction, Account } from '../services/api';
import { RootStackParamList } from '../navigation/types';
import { theme, fonts, palette } from '../theme';

type FilterType = 'all' | 'income' | 'expense' | 'legacy';

export default function TransactionListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const accountMap = Object.fromEntries(accounts.map((a) => [a._id, a.name]));

  const loadTransactions = async () => {
    try {
      let path = '/transactions';
      if (filter === 'legacy') path += '?legacyOnly=true';
      else if (filter !== 'all') path += `?type=${filter}`;
      const data = await api.get<{ transactions: Transaction[] }>(path);
      setTransactions(data.transactions);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      api.get<Account[]>('/accounts').then(setAccounts).catch(() => {});
      loadTransactions();
    }, [filter])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'income', label: 'Income' },
    { key: 'expense', label: 'Expenses' },
    { key: 'legacy', label: 'Legacy' },
  ];

  return (
    <GestureHandlerRootView className={`flex-1 ${theme.screen}`}>
      <ScreenHeader
        title="Transactions"
        right={
          <TouchableOpacity
            onPress={() => navigation.navigate('AddTransaction', {})}
            className="rounded-full w-10 h-10 items-center justify-center"
            style={{
              backgroundColor: palette.primary,
              shadowColor: palette.primary,
              shadowOpacity: 0.4,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 4,
            }}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        }
      />

      <View className="flex-row px-5 mb-4 gap-2 flex-wrap">
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              className="px-4 py-2 rounded-full border"
              style={
                active
                  ? {
                      backgroundColor: palette.primary,
                      borderColor: palette.primary,
                    }
                  : {
                      backgroundColor: 'transparent',
                      borderColor: palette.primary + '33',
                    }
              }
            >
              <Text
                style={{
                  fontFamily: fonts.medium,
                  fontSize: 13,
                  color: active ? '#fff' : palette.primary,
                }}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View className="px-5">
          <SkeletonList />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={loadTransactions} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item._id}
          contentContainerClassName="px-5 pb-8"
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No transactions yet"
              subtitle="Tap + to add your first transaction"
            />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInRight.delay(Math.min(index, 8) * 50).duration(280)}>
              <TransactionRow
                item={item}
                accountName={item.accountId ? accountMap[item.accountId] : undefined}
                onPress={() => navigation.navigate('AddTransaction', { transaction: item })}
                onDelete={async () => {
                  await api.delete(`/transactions/${item._id}`);
                  loadTransactions();
                }}
              />
            </Animated.View>
          )}
        />
      )}
    </GestureHandlerRootView>
  );
}
