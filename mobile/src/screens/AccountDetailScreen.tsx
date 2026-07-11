import { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl, Text } from 'react-native';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, Card } from '../components/ui';
import { AmountText, EmptyState, ErrorState } from '../components/design';
import { SkeletonList } from '../components/Skeleton';
import { api, Account, Transaction } from '../services/api';
import { formatDate } from '../utils/format';
import { theme } from '../theme';
import { palette } from '../theme';
import { RootStackParamList } from '../navigation/types';

export default function AccountDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'AccountDetail'>>();
  const { accountId } = route.params;
  const [account, setAccount] = useState<(Account & { recentTransactions: Transaction[] }) | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await api.get<Account & { recentTransactions: Transaction[] }>(
        `/accounts/${accountId}`
      );
      setAccount(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [accountId]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View className={`flex-1 ${theme.screen}`}>
      <ScreenHeader
        title={account?.name || 'Account'}
        subtitle={account ? `${account.currency} account` : undefined}
      />

      {loading ? (
        <View className="px-5"><SkeletonList count={3} /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : account ? (
        <>
          <View className="px-5 mb-4">
            <Card style={{ borderLeftWidth: 4, borderLeftColor: account.color }}>
              <Text className={`${theme.subtitle} text-sm`}>Balance</Text>
              <AmountText
                amount={account.balance}
                type={account.balance < 0 ? 'expense' : 'neutral'}
                className="text-3xl font-bold mt-1"
              />
              {account.balance < 0 && (
                <Text className="text-amber-500 text-xs mt-1">Overdrawn account</Text>
              )}
            </Card>
          </View>

          <Text className={`${theme.title} font-semibold px-5 mb-2`}>Recent Activity</Text>
          <FlatList
            data={account.recentTransactions}
            keyExtractor={(item) => item._id}
            contentContainerClassName="px-5 pb-8"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
            }
            ListEmptyComponent={
              <EmptyState icon="receipt-outline" title="No transactions yet" />
            }
            renderItem={({ item }) => (
              <Card className="mb-2 flex-row items-center">
                <View
                  className="w-9 h-9 rounded-full items-center justify-center"
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
                    size={18}
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
                  <Text className={`${theme.title} font-medium`}>
                    {item.type === 'transfer' ? 'Transfer' : item.category || item.source}
                  </Text>
                  <Text className={`${theme.subtitle} text-xs`}>{formatDate(item.date)}</Text>
                </View>
                <AmountText
                  amount={item.amount}
                  type={item.type === 'income' ? 'income' : item.type === 'transfer' ? 'transfer' : 'expense'}
                  showSign={item.type !== 'transfer'}
                />
              </Card>
            )}
          />
        </>
      ) : null}
    </View>
  );
}
