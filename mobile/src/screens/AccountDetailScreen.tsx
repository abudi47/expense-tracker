import { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl, Text } from 'react-native';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { ScreenHeader, Card } from '../components/ui';
import { AmountText, EmptyState, ErrorState } from '../components/design';
import { GradientCard, SoftGlow } from '../components/GradientCard';
import { AnimatedBalance } from '../components/AnimatedBalance';
import { SkeletonList } from '../components/Skeleton';
import { api, Account, Transaction } from '../services/api';
import { formatDate } from '../utils/format';
import { theme, fonts, palette } from '../theme';
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

  const accent = account?.color || palette.primary;

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
          <Animated.View entering={FadeInDown.duration(400)} className="px-5 mb-4">
            <GradientCard colors={[accent, accent + 'CC', palette.primaryDark]}>
              <SoftGlow color={accent} />
              <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                Balance
              </Text>
              <AnimatedBalance
                value={account.balance}
                currency={account.currency}
                style={{ fontSize: 32, lineHeight: 40, color: '#fff', marginTop: 6 }}
              />
              {account.balance < 0 && (
                <Text
                  style={{
                    fontFamily: fonts.medium,
                    fontSize: 12,
                    color: '#FCD34D',
                    marginTop: 8,
                  }}
                >
                  Overdrawn account
                </Text>
              )}
            </GradientCard>
          </Animated.View>

          <Text
            className={`${theme.title} px-5 mb-2`}
            style={{ fontFamily: fonts.semibold, fontSize: 17 }}
          >
            Recent Activity
          </Text>
          <FlatList
            data={account.recentTransactions}
            keyExtractor={(item) => item._id}
            contentContainerClassName="px-5 pb-8"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
            }
            ListEmptyComponent={
              <EmptyState icon="receipt-outline" title="No transactions yet" subtitle="Activity for this account will show here" />
            }
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInRight.delay(Math.min(index, 8) * 45).duration(280)}>
                <Card className="mb-2 flex-row items-center">
                  <View
                    className="w-10 h-10 rounded-2xl items-center justify-center"
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
                    <Text className={theme.title} style={{ fontFamily: fonts.medium }}>
                      {item.type === 'transfer' ? 'Transfer' : item.category || item.source}
                    </Text>
                    <Text className={`${theme.subtitle} text-xs`} style={{ fontFamily: fonts.regular }}>
                      {formatDate(item.date)}
                    </Text>
                  </View>
                  <AmountText
                    amount={item.amount}
                    type={
                      item.type === 'income'
                        ? 'income'
                        : item.type === 'transfer'
                          ? 'transfer'
                          : 'expense'
                    }
                    showSign={item.type !== 'transfer'}
                  />
                </Card>
              </Animated.View>
            )}
          />
        </>
      ) : null}
    </View>
  );
}
